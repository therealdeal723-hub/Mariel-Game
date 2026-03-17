import Phaser from 'phaser';
import { GAME_WIDTH, GAME_HEIGHT, COLORS } from '../config.js';
import { BaseStage } from './BaseStage.js';
import { DialogueSystem } from '../systems/DialogueSystem.js';
import { SoundFX } from '../systems/SoundFX.js';

// Grid dimensions for the room
const GRID_COLS = 10;
const GRID_ROWS = 8;
const CELL_SIZE = 56;
const GRID_X = 320; // left edge of grid
const GRID_Y = 140; // top edge of grid

// Items to unpack — each has a shape (array of [col, row] offsets), color, and label
const ITEMS = [
  { id: 'couch', label: 'Couch', shape: [[0,0],[1,0],[2,0]], color: 0x8b6914, icon: '🛋️' },
  { id: 'bed', label: 'Bed', shape: [[0,0],[1,0],[0,1],[1,1]], color: 0x4a6fa5, icon: '🛏️' },
  { id: 'table', label: 'Table', shape: [[0,0],[1,0]], color: 0x6b4226, icon: '🪑' },
  { id: 'bookshelf', label: 'Bookshelf', shape: [[0,0],[0,1],[0,2]], color: 0x8b4513, icon: '📚' },
  { id: 'tv', label: 'TV', shape: [[0,0],[1,0]], color: 0x333333, icon: '📺' },
  { id: 'plant', label: 'Plant', shape: [[0,0]], color: 0x2d8b46, icon: '🪴' },
  { id: 'lamp', label: 'Lamp', shape: [[0,0]], color: 0xffd700, icon: '💡' },
  { id: 'rug', label: 'Rug', shape: [[0,0],[1,0],[2,0],[0,1],[1,1],[2,1]], color: 0xcc5533, icon: '🟫' },
  { id: 'boxes', label: "Nick's Boxes", shape: [[0,0],[1,0],[0,1]], color: 0xe94560, icon: '📦' },
  { id: 'guitar', label: "Nick's Guitar", shape: [[0,0],[0,1]], color: 0xd4a017, icon: '🎸' },
  { id: 'photos', label: 'Photo Frame', shape: [[0,0]], color: 0xeecbad, icon: '🖼️' },
  { id: 'kitchenbox', label: 'Kitchen Box', shape: [[0,0],[1,0]], color: 0x4ecca3, icon: '🍳' },
];

// Nick's commentary as items are placed
const NICK_COMMENTS = [
  { speaker: 'nick', text: '"The couch goes RIGHT there. Trust me."' },
  { speaker: 'nick', text: '"I measured the bedroom... mostly."' },
  { speaker: 'nick', text: '"That table is load-bearing, I think."' },
  { speaker: 'nick', text: '"My bookshelf stays. Non-negotiable."' },
  { speaker: 'nick', text: '"Big TV energy."' },
  { speaker: 'nick', text: '"Every home needs a plant to... not water."' },
  { speaker: 'nick', text: '"Mood lighting is ESSENTIAL."' },
  { speaker: 'nick', text: '"The rug really ties the room together."' },
  { speaker: 'nick', text: '"These boxes? Mostly sentimental stuff. And snacks."' },
  { speaker: 'nick', text: '"The guitar stays out. What if I get inspired?"' },
  { speaker: 'nick', text: '"Our first photo together! ...okay YOUR photo, for now."' },
  { speaker: 'nick', text: '"Kitchen stuff! I cook sometimes. Cereal counts."' },
];

export class UnpackingStage extends BaseStage {
  constructor() {
    super('UnpackingStage');
  }

  create() {
    this.sfx = new SoundFX(this);
    this.sfx.startMusic();
    this.events.on('shutdown', () => this.sfx.destroy());

    // Game state
    this.grid = Array.from({ length: GRID_ROWS }, () => Array(GRID_COLS).fill(null));
    this.placedItems = [];
    this.itemQueue = Phaser.Utils.Array.Shuffle([...ITEMS]);
    this.currentItemIndex = 0;
    this.currentItem = null;
    this.currentItemCells = []; // graphics objects for current dragging item
    this.ghostCells = []; // preview on grid
    this.gridCol = 0;
    this.gridRow = 0;
    this.rotation = 0; // 0, 1, 2, 3 (90° increments)
    this.isComplete = false;
    this.score = 0;

    this.createBackground();
    this.createGrid();
    this.createSidebar();
    this.createBackButton();
    this.createControls();

    // Intro commentary
    this.commentaryText = this.add.text(GAME_WIDTH / 2, GRID_Y + GRID_ROWS * CELL_SIZE + 40, '', {
      fontFamily: 'Georgia, serif',
      fontSize: '16px',
      color: '#ffd700',
      fontStyle: 'italic',
    }).setOrigin(0.5);

    this.instructionText = this.add.text(GAME_WIDTH / 2, 30, 'Arrange furniture in your new home!', {
      fontFamily: 'Georgia, serif',
      fontSize: '20px',
      color: '#ffffff',
      fontStyle: 'bold',
    }).setOrigin(0.5);

    this.progressText = this.add.text(GAME_WIDTH / 2, 58, '', {
      fontFamily: 'Georgia, serif',
      fontSize: '14px',
      color: '#aaaaaa',
    }).setOrigin(0.5);

    this.spawnNextItem();
  }

  createBackground() {
    // Room background
    this.add.rectangle(GAME_WIDTH / 2, GAME_HEIGHT / 2, GAME_WIDTH, GAME_HEIGHT, 0x2a1f3d);

    // Floor area under grid
    const floorX = GRID_X + (GRID_COLS * CELL_SIZE) / 2;
    const floorY = GRID_Y + (GRID_ROWS * CELL_SIZE) / 2;
    this.add.rectangle(floorX, floorY, GRID_COLS * CELL_SIZE + 20, GRID_ROWS * CELL_SIZE + 20, 0x5c4033, 0.3);

    // Room label
    this.add.text(GRID_X + (GRID_COLS * CELL_SIZE) / 2, GRID_Y - 20, '🏠 Your New Home', {
      fontFamily: 'Georgia, serif',
      fontSize: '16px',
      color: '#ffd700',
    }).setOrigin(0.5);
  }

  createGrid() {
    this.gridGraphics = this.add.graphics();
    this.drawGrid();
  }

  drawGrid() {
    this.gridGraphics.clear();

    // Grid cells
    for (let r = 0; r < GRID_ROWS; r++) {
      for (let c = 0; c < GRID_COLS; c++) {
        const x = GRID_X + c * CELL_SIZE;
        const y = GRID_Y + r * CELL_SIZE;

        if (this.grid[r][c]) {
          // Occupied cell
          const item = this.grid[r][c];
          this.gridGraphics.fillStyle(item.color, 0.8);
          this.gridGraphics.fillRect(x + 1, y + 1, CELL_SIZE - 2, CELL_SIZE - 2);
          this.gridGraphics.lineStyle(1, 0xffffff, 0.2);
          this.gridGraphics.strokeRect(x + 1, y + 1, CELL_SIZE - 2, CELL_SIZE - 2);
        } else {
          // Empty cell
          this.gridGraphics.fillStyle(0x3d2b1f, 0.4);
          this.gridGraphics.fillRect(x + 1, y + 1, CELL_SIZE - 2, CELL_SIZE - 2);
          this.gridGraphics.lineStyle(1, 0x665544, 0.3);
          this.gridGraphics.strokeRect(x + 1, y + 1, CELL_SIZE - 2, CELL_SIZE - 2);
        }
      }
    }
  }

  createSidebar() {
    // Sidebar for current item preview
    const sideX = 160;
    const sideY = 200;

    this.add.rectangle(sideX, sideY + 100, 240, 350, 0x000000, 0.5)
      .setStrokeStyle(2, 0x666666);

    this.add.text(sideX, sideY - 50, 'NEXT ITEM', {
      fontFamily: 'Arial',
      fontSize: '12px',
      color: '#aaaaaa',
      fontStyle: 'bold',
    }).setOrigin(0.5);

    this.itemNameText = this.add.text(sideX, sideY - 25, '', {
      fontFamily: 'Georgia, serif',
      fontSize: '18px',
      color: '#ffffff',
      fontStyle: 'bold',
    }).setOrigin(0.5);

    this.itemIconText = this.add.text(sideX, sideY + 30, '', {
      fontSize: '48px',
    }).setOrigin(0.5);

    // Item shape preview
    this.previewGraphics = this.add.graphics();
    this.previewX = sideX;
    this.previewY = sideY + 110;

    // Controls hint
    this.add.text(sideX, sideY + 180, 'Arrow keys: Move\nR: Rotate\nSPACE: Place', {
      fontFamily: 'Arial',
      fontSize: '12px',
      color: '#888888',
      align: 'center',
      lineSpacing: 4,
    }).setOrigin(0.5);

    // Place button (mobile-friendly)
    this.placeBtn = this.add.rectangle(sideX, sideY + 240, 120, 40, 0x4ecca3, 0.9)
      .setStrokeStyle(2, 0xffffff)
      .setInteractive({ useHandCursor: true });
    this.placeBtnText = this.add.text(sideX, sideY + 240, 'PLACE', {
      fontFamily: 'Arial',
      fontSize: '14px',
      color: '#1a1a2e',
      fontStyle: 'bold',
    }).setOrigin(0.5);

    this.placeBtn.on('pointerover', () => this.placeBtn.setFillStyle(0x6eeec3));
    this.placeBtn.on('pointerout', () => this.placeBtn.setFillStyle(0x4ecca3));
    this.placeBtn.on('pointerdown', () => this.placeCurrentItem());

    // Rotate button
    this.rotateBtn = this.add.rectangle(sideX, sideY + 290, 120, 40, 0xffd700, 0.9)
      .setStrokeStyle(2, 0xffffff)
      .setInteractive({ useHandCursor: true });
    this.add.text(sideX, sideY + 290, 'ROTATE', {
      fontFamily: 'Arial',
      fontSize: '14px',
      color: '#1a1a2e',
      fontStyle: 'bold',
    }).setOrigin(0.5);

    this.rotateBtn.on('pointerover', () => this.rotateBtn.setFillStyle(0xffe44d));
    this.rotateBtn.on('pointerout', () => this.rotateBtn.setFillStyle(0xffd700));
    this.rotateBtn.on('pointerdown', () => this.rotateItem());
  }

  createControls() {
    // Keyboard controls
    this.cursors = this.input.keyboard.createCursorKeys();
    this.rKey = this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.R);
    this.spaceKey = this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.SPACE);

    // Debounce movement
    this._moveDelay = 0;

    this.cursors.left.on('down', () => this.moveItem(-1, 0));
    this.cursors.right.on('down', () => this.moveItem(1, 0));
    this.cursors.up.on('down', () => this.moveItem(0, -1));
    this.cursors.down.on('down', () => this.moveItem(0, 1));
    this.rKey.on('down', () => this.rotateItem());
    this.spaceKey.on('down', () => this.placeCurrentItem());

    // Click on grid to position item
    this.input.on('pointerdown', (pointer) => {
      if (this.isComplete || !this.currentItem) return;
      const col = Math.floor((pointer.x - GRID_X) / CELL_SIZE);
      const row = Math.floor((pointer.y - GRID_Y) / CELL_SIZE);
      if (col >= 0 && col < GRID_COLS && row >= 0 && row < GRID_ROWS) {
        this.gridCol = col;
        this.gridRow = row;
        this.sfx.click();
        this.updateGhost();
      }
    });
  }

  getRotatedShape(shape, rotation) {
    // Rotate shape by 90° increments
    let rotated = shape.map(([c, r]) => [c, r]);
    for (let i = 0; i < rotation % 4; i++) {
      rotated = rotated.map(([c, r]) => [-r, c]);
    }
    // Normalize to start at 0,0
    const minC = Math.min(...rotated.map(([c]) => c));
    const minR = Math.min(...rotated.map(([, r]) => r));
    return rotated.map(([c, r]) => [c - minC, r - minR]);
  }

  spawnNextItem() {
    if (this.currentItemIndex >= this.itemQueue.length) {
      this.finishGame();
      return;
    }

    const itemDef = this.itemQueue[this.currentItemIndex];
    this.currentItem = itemDef;
    this.rotation = 0;
    this.gridCol = Math.floor(GRID_COLS / 2) - 1;
    this.gridRow = 0;

    // Update sidebar
    this.itemNameText.setText(itemDef.label);
    this.itemIconText.setText(itemDef.icon);

    this.progressText.setText(`Item ${this.currentItemIndex + 1} of ${this.itemQueue.length}`);

    this.drawItemPreview();
    this.updateGhost();
  }

  drawItemPreview() {
    this.previewGraphics.clear();
    if (!this.currentItem) return;

    const shape = this.getRotatedShape(this.currentItem.shape, this.rotation);
    const previewCellSize = 28;

    // Center the preview
    const maxC = Math.max(...shape.map(([c]) => c)) + 1;
    const maxR = Math.max(...shape.map(([, r]) => r)) + 1;
    const offsetX = this.previewX - (maxC * previewCellSize) / 2;
    const offsetY = this.previewY - (maxR * previewCellSize) / 2;

    shape.forEach(([c, r]) => {
      const x = offsetX + c * previewCellSize;
      const y = offsetY + r * previewCellSize;
      this.previewGraphics.fillStyle(this.currentItem.color, 0.9);
      this.previewGraphics.fillRect(x + 1, y + 1, previewCellSize - 2, previewCellSize - 2);
      this.previewGraphics.lineStyle(1, 0xffffff, 0.4);
      this.previewGraphics.strokeRect(x + 1, y + 1, previewCellSize - 2, previewCellSize - 2);
    });
  }

  updateGhost() {
    // Clear previous ghost
    this.ghostGraphics?.clear();
    if (!this.ghostGraphics) {
      this.ghostGraphics = this.add.graphics();
    }

    if (!this.currentItem) return;

    const shape = this.getRotatedShape(this.currentItem.shape, this.rotation);
    const canPlace = this.canPlaceAt(this.gridCol, this.gridRow, shape);

    shape.forEach(([c, r]) => {
      const col = this.gridCol + c;
      const row = this.gridRow + r;
      if (col < 0 || col >= GRID_COLS || row < 0 || row >= GRID_ROWS) return;

      const x = GRID_X + col * CELL_SIZE;
      const y = GRID_Y + row * CELL_SIZE;

      if (canPlace) {
        this.ghostGraphics.fillStyle(this.currentItem.color, 0.4);
        this.ghostGraphics.fillRect(x + 2, y + 2, CELL_SIZE - 4, CELL_SIZE - 4);
        this.ghostGraphics.lineStyle(2, 0x4ecca3, 0.8);
        this.ghostGraphics.strokeRect(x + 2, y + 2, CELL_SIZE - 4, CELL_SIZE - 4);
      } else {
        this.ghostGraphics.fillStyle(0xe94560, 0.3);
        this.ghostGraphics.fillRect(x + 2, y + 2, CELL_SIZE - 4, CELL_SIZE - 4);
        this.ghostGraphics.lineStyle(2, 0xe94560, 0.8);
        this.ghostGraphics.strokeRect(x + 2, y + 2, CELL_SIZE - 4, CELL_SIZE - 4);
      }
    });
  }

  canPlaceAt(col, row, shape) {
    for (const [c, r] of shape) {
      const gc = col + c;
      const gr = row + r;
      if (gc < 0 || gc >= GRID_COLS || gr < 0 || gr >= GRID_ROWS) return false;
      if (this.grid[gr][gc] !== null) return false;
    }
    return true;
  }

  moveItem(dc, dr) {
    if (!this.currentItem || this.isComplete) return;

    const newCol = Phaser.Math.Clamp(this.gridCol + dc, 0, GRID_COLS - 1);
    const newRow = Phaser.Math.Clamp(this.gridRow + dr, 0, GRID_ROWS - 1);

    if (newCol !== this.gridCol || newRow !== this.gridRow) {
      this.gridCol = newCol;
      this.gridRow = newRow;
      this.sfx.click();
      this.updateGhost();
    }
  }

  rotateItem() {
    if (!this.currentItem || this.isComplete) return;
    this.rotation = (this.rotation + 1) % 4;
    this.sfx.click();
    this.drawItemPreview();
    this.updateGhost();
  }

  placeCurrentItem() {
    if (!this.currentItem || this.isComplete) return;

    const shape = this.getRotatedShape(this.currentItem.shape, this.rotation);

    if (!this.canPlaceAt(this.gridCol, this.gridRow, shape)) {
      // Can't place here — flash red
      this.sfx.sadTrombone();
      this.cameras.main.shake(100, 0.005);
      return;
    }

    // Place item on grid
    shape.forEach(([c, r]) => {
      this.grid[this.gridRow + r][this.gridCol + c] = {
        id: this.currentItem.id,
        color: this.currentItem.color,
      };
    });

    this.placedItems.push(this.currentItem.id);
    this.sfx.thud();
    this.score += shape.length * 10;

    // Show Nick's commentary
    const comment = NICK_COMMENTS[this.currentItemIndex];
    if (comment) {
      this.commentaryText.setText(comment.text);
      this.time.delayedCall(3000, () => {
        if (this.commentaryText) this.commentaryText.setText('');
      });
    }

    // Emit wood chips at placement center
    const centerCol = this.gridCol + (Math.max(...shape.map(([c]) => c)) + 1) / 2;
    const centerRow = this.gridRow + (Math.max(...shape.map(([, r]) => r)) + 1) / 2;
    const cx = GRID_X + centerCol * CELL_SIZE;
    const cy = GRID_Y + centerRow * CELL_SIZE;

    // Place celebration particles
    for (let i = 0; i < 6; i++) {
      const spark = this.add.circle(cx, cy, Phaser.Math.Between(2, 4), this.currentItem.color);
      const angle = (Math.PI * 2 / 6) * i;
      const dist = Phaser.Math.Between(15, 40);
      this.tweens.add({
        targets: spark,
        x: cx + Math.cos(angle) * dist,
        y: cy + Math.sin(angle) * dist,
        alpha: 0,
        duration: 400,
        onComplete: () => spark.destroy(),
      });
    }

    // Redraw grid and move to next item
    this.drawGrid();
    this.ghostGraphics?.clear();
    this.currentItemIndex++;

    if (this.currentItemIndex >= this.itemQueue.length) {
      this.time.delayedCall(800, () => this.finishGame());
    } else {
      this.time.delayedCall(500, () => this.spawnNextItem());
    }
  }

  finishGame() {
    this.isComplete = true;
    this.currentItem = null;
    this.previewGraphics.clear();
    this.ghostGraphics?.clear();
    this.itemNameText.setText('');
    this.itemIconText.setText('');
    this.commentaryText.setText('');
    this.progressText.setText('');
    this.instructionText.setText('');
    this.placeBtn.setVisible(false);
    this.placeBtnText.setVisible(false);
    this.rotateBtn.setVisible(false);

    // Calculate coverage score
    let filledCells = 0;
    for (let r = 0; r < GRID_ROWS; r++) {
      for (let c = 0; c < GRID_COLS; c++) {
        if (this.grid[r][c]) filledCells++;
      }
    }
    const coverage = Math.round((filledCells / (GRID_ROWS * GRID_COLS)) * 100);

    this.sfx.victory();

    const resultText = this.add.text(GAME_WIDTH / 2, GAME_HEIGHT / 2 - 40,
      `HOME SWEET HOME!\n\n` +
      `All ${ITEMS.length} items placed!\n` +
      `Room coverage: ${coverage}%\n\n` +
      (coverage > 60 ? '"Cozy!"' : coverage > 40 ? '"Plenty of room to dance!"' : '"Minimalist vibes!"'),
      {
        fontFamily: 'Georgia, serif',
        fontSize: '28px',
        color: '#ffd700',
        fontStyle: 'bold',
        align: 'center',
      }
    ).setOrigin(0.5).setAlpha(0);

    this.tweens.add({
      targets: resultText,
      alpha: 1,
      duration: 800,
    });

    // Post-game dialogue
    this.time.delayedCall(4000, () => {
      resultText.destroy();

      const dialogueLines = [
        { speaker: 'nick', text: "Okay, I know it looks chaotic, but there's a SYSTEM." },
        { speaker: 'narrator', text: "There was no system." },
        { speaker: 'nick', text: "...but it felt like home anyway." },
        { speaker: 'narrator', text: 'Two lives, one space. The adventure was just beginning.' },
      ];

      this.dialogue = new DialogueSystem(this);
      this.dialogue.createUI();
      this.dialogue.show(dialogueLines, () => {
        this.sfx.stopMusic();
        this.completeStage();
      });
    });
  }
}
