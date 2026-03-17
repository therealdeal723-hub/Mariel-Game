import Phaser from 'phaser';
import { GAME_WIDTH, GAME_HEIGHT, COLORS } from '../config.js';
import { BaseStage } from './BaseStage.js';
import { DialogueSystem } from '../systems/DialogueSystem.js';
import { SoundFX } from '../systems/SoundFX.js';

// Room grid
const GRID_COLS = 8;
const GRID_ROWS = 6;
const CELL_SIZE = 64;
const GRID_X = 340;
const GRID_Y = 130;

// Open box area (left side)
const BOX_X = 40;
const BOX_Y = 160;
const BOX_W = 240;
const BOX_H = 400;

// Items — each has a multi-cell shape, color, label, and emoji icon
const ITEMS = [
  { id: 'couch', label: 'Couch', shape: [[0,0],[1,0],[2,0]], color: 0x8b6914, icon: '\uD83D\uDECB\uFE0F' },
  { id: 'bed', label: 'Bed', shape: [[0,0],[1,0],[0,1],[1,1]], color: 0x4a6fa5, icon: '\uD83D\uDECF\uFE0F' },
  { id: 'table', label: 'Table', shape: [[0,0],[1,0]], color: 0x6b4226, icon: '\uD83E\uDE91' },
  { id: 'bookshelf', label: 'Bookshelf', shape: [[0,0],[0,1],[0,2]], color: 0x8b4513, icon: '\uD83D\uDCDA' },
  { id: 'tv', label: 'TV', shape: [[0,0],[1,0]], color: 0x333333, icon: '\uD83D\uDCFA' },
  { id: 'plant', label: 'Plant', shape: [[0,0]], color: 0x2d8b46, icon: '\uD83E\uDEB4' },
  { id: 'lamp', label: 'Lamp', shape: [[0,0]], color: 0xffd700, icon: '\uD83D\uDCA1' },
  { id: 'rug', label: 'Rug', shape: [[0,0],[1,0],[2,0],[0,1],[1,1],[2,1]], color: 0xcc5533, icon: '\uD83D\uDFEB' },
  { id: 'boxes', label: "Nick's Boxes", shape: [[0,0],[1,0],[0,1]], color: 0xe94560, icon: '\uD83D\uDCE6' },
  { id: 'guitar', label: "Nick's Guitar", shape: [[0,0],[0,1]], color: 0xd4a017, icon: '\uD83C\uDFB8' },
  { id: 'photos', label: 'Photo Frame', shape: [[0,0]], color: 0xeecbad, icon: '\uD83D\uDDBC\uFE0F' },
  { id: 'kitchenbox', label: 'Kitchen Box', shape: [[0,0],[1,0]], color: 0x4ecca3, icon: '\uD83C\uDF73' },
];

// Nick's commentary keyed to item id
const NICK_COMMENTS = {
  couch: '"The couch goes RIGHT there. Trust me."',
  bed: '"I measured the bedroom... mostly."',
  table: '"That table is load-bearing, I think."',
  bookshelf: '"My bookshelf stays. Non-negotiable."',
  tv: '"Big TV energy."',
  plant: '"Every home needs a plant to... not water."',
  lamp: '"Mood lighting is ESSENTIAL."',
  rug: '"The rug really ties the room together."',
  boxes: '"These boxes? Mostly sentimental stuff. And snacks."',
  guitar: '"The guitar stays out. What if I get inspired?"',
  photos: '"Our first photo together! ...okay YOUR photo, for now."',
  kitchenbox: '"Kitchen stuff! I cook sometimes. Cereal counts."',
};

export class UnpackingStage extends BaseStage {
  constructor() {
    super('UnpackingStage');
  }

  create() {
    this.sfx = new SoundFX(this);
    this.sfx.startMusic();
    this.events.on('shutdown', () => this.sfx.destroy());

    // State
    this.grid = Array.from({ length: GRID_ROWS }, () => Array(GRID_COLS).fill(null));
    this.placedCount = 0;
    this.totalItems = ITEMS.length;
    this.isComplete = false;
    this.isDragging = false;
    this.dragItem = null;
    this.dragSprite = null;
    this.dragRotation = 0;
    this.placedItemSprites = []; // track placed sprites for icon rendering

    this.createBackground();
    this.createRoom();
    this.createBox();
    this.createBackButton();

    // Commentary
    this.commentaryText = this.add.text(GAME_WIDTH / 2, GAME_HEIGHT - 35, '', {
      fontFamily: 'Georgia, serif',
      fontSize: '16px',
      color: '#ffd700',
      fontStyle: 'italic',
    }).setOrigin(0.5).setDepth(10);

    // Header
    this.add.text(GAME_WIDTH / 2, 25, 'Unpack your new home together!', {
      fontFamily: 'Georgia, serif',
      fontSize: '20px',
      color: '#ffffff',
      fontStyle: 'bold',
    }).setOrigin(0.5);

    this.progressText = this.add.text(GAME_WIDTH / 2, 55, `0 / ${this.totalItems} items placed`, {
      fontFamily: 'Georgia, serif',
      fontSize: '14px',
      color: '#aaaaaa',
    }).setOrigin(0.5);

    // Hint text
    this.hintText = this.add.text(GAME_WIDTH / 2, 80, 'Drag items from the box into the room \u2022 R to rotate while dragging', {
      fontFamily: 'Arial',
      fontSize: '12px',
      color: '#666666',
    }).setOrigin(0.5);

    // Fill the box with items
    this.boxItems = [];
    this.populateBox();

    // Rotate key
    this.rKey = this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.R);
    this.rKey.on('down', () => {
      if (this.isDragging && this.dragItem) {
        this.dragRotation = (this.dragRotation + 1) % 4;
        this.sfx.click();
        this.rebuildDragSprite();
        this.updateDropPreview(this.input.activePointer);
      }
    });
  }

  createBackground() {
    // Warm apartment background
    this.add.rectangle(GAME_WIDTH / 2, GAME_HEIGHT / 2, GAME_WIDTH, GAME_HEIGHT, 0x2a1f3d);

    // Wall behind room
    const roomCenterX = GRID_X + (GRID_COLS * CELL_SIZE) / 2;
    const roomCenterY = GRID_Y + (GRID_ROWS * CELL_SIZE) / 2;
    this.add.rectangle(roomCenterX, roomCenterY, GRID_COLS * CELL_SIZE + 30, GRID_ROWS * CELL_SIZE + 30, 0x3d2b1f, 0.5);
  }

  createRoom() {
    // Room label
    this.add.text(GRID_X + (GRID_COLS * CELL_SIZE) / 2, GRID_Y - 18, '\uD83C\uDFE0 Your New Home', {
      fontFamily: 'Georgia, serif',
      fontSize: '16px',
      color: '#ffd700',
    }).setOrigin(0.5);

    // Draw grid
    this.gridGraphics = this.add.graphics();
    this.dropPreviewGraphics = this.add.graphics().setDepth(5);
    this.drawGrid();
  }

  drawGrid() {
    this.gridGraphics.clear();

    for (let r = 0; r < GRID_ROWS; r++) {
      for (let c = 0; c < GRID_COLS; c++) {
        const x = GRID_X + c * CELL_SIZE;
        const y = GRID_Y + r * CELL_SIZE;

        if (this.grid[r][c]) {
          const item = this.grid[r][c];
          this.gridGraphics.fillStyle(item.color, 0.7);
          this.gridGraphics.fillRect(x + 1, y + 1, CELL_SIZE - 2, CELL_SIZE - 2);
          this.gridGraphics.lineStyle(1, 0xffffff, 0.15);
          this.gridGraphics.strokeRect(x + 1, y + 1, CELL_SIZE - 2, CELL_SIZE - 2);
        } else {
          // Empty floor tile
          this.gridGraphics.fillStyle(0x5c4033, 0.25);
          this.gridGraphics.fillRect(x + 1, y + 1, CELL_SIZE - 2, CELL_SIZE - 2);
          this.gridGraphics.lineStyle(1, 0x665544, 0.2);
          this.gridGraphics.strokeRect(x + 1, y + 1, CELL_SIZE - 2, CELL_SIZE - 2);
        }
      }
    }
  }

  createBox() {
    // Draw open moving box
    const boxGraphics = this.add.graphics();

    // Box body (brown cardboard)
    boxGraphics.fillStyle(0x8B6914, 1);
    boxGraphics.fillRoundedRect(BOX_X, BOX_Y, BOX_W, BOX_H, 8);
    boxGraphics.lineStyle(2, 0x6b4226, 1);
    boxGraphics.strokeRoundedRect(BOX_X, BOX_Y, BOX_W, BOX_H, 8);

    // Tape stripe
    boxGraphics.fillStyle(0xdaa520, 0.5);
    boxGraphics.fillRect(BOX_X + BOX_W / 2 - 15, BOX_Y, 30, BOX_H);

    // Box flaps (open) - left flap
    boxGraphics.fillStyle(0x9B7924, 1);
    boxGraphics.beginPath();
    boxGraphics.moveTo(BOX_X, BOX_Y);
    boxGraphics.lineTo(BOX_X - 20, BOX_Y - 30);
    boxGraphics.lineTo(BOX_X + BOX_W * 0.4, BOX_Y - 25);
    boxGraphics.lineTo(BOX_X + BOX_W * 0.4, BOX_Y);
    boxGraphics.closePath();
    boxGraphics.fillPath();
    boxGraphics.lineStyle(2, 0x6b4226, 1);
    boxGraphics.strokePath();

    // Right flap
    boxGraphics.fillStyle(0x9B7924, 1);
    boxGraphics.beginPath();
    boxGraphics.moveTo(BOX_X + BOX_W, BOX_Y);
    boxGraphics.lineTo(BOX_X + BOX_W + 20, BOX_Y - 30);
    boxGraphics.lineTo(BOX_X + BOX_W * 0.6, BOX_Y - 25);
    boxGraphics.lineTo(BOX_X + BOX_W * 0.6, BOX_Y);
    boxGraphics.closePath();
    boxGraphics.fillPath();
    boxGraphics.lineStyle(2, 0x6b4226, 1);
    boxGraphics.strokePath();

    // Box label
    this.add.text(BOX_X + BOX_W / 2, BOX_Y + 20, '\uD83D\uDCE6 STUFF', {
      fontFamily: 'Arial',
      fontSize: '12px',
      color: '#5c3a1e',
      fontStyle: 'bold',
    }).setOrigin(0.5);
  }

  populateBox() {
    // Arrange items inside the box as draggable icons
    const shuffled = Phaser.Utils.Array.Shuffle([...ITEMS]);
    const cols = 3;
    const spacingX = 70;
    const spacingY = 80;
    const startX = BOX_X + 45;
    const startY = BOX_Y + 55;

    shuffled.forEach((item, i) => {
      const col = i % cols;
      const row = Math.floor(i / cols);
      const x = startX + col * spacingX;
      const y = startY + row * spacingY;

      // Item icon (emoji)
      const icon = this.add.text(x, y, item.icon, {
        fontSize: '32px',
      }).setOrigin(0.5).setInteractive({ useHandCursor: true, draggable: true }).setDepth(6);

      // Item label below icon
      const label = this.add.text(x, y + 22, item.label, {
        fontFamily: 'Arial',
        fontSize: '9px',
        color: '#ddd',
        align: 'center',
      }).setOrigin(0.5);

      // Hover effect
      icon.on('pointerover', () => {
        icon.setScale(1.2);
      });
      icon.on('pointerout', () => {
        if (!this.isDragging || this.dragItem !== item) {
          icon.setScale(1.0);
        }
      });

      // Drag start
      icon.on('dragstart', () => {
        this.startDrag(item, icon, label);
      });

      // During drag
      icon.on('drag', (_pointer, dragX, dragY) => {
        icon.setPosition(dragX, dragY);
        this.updateDropPreview(this.input.activePointer);
      });

      // Drag end
      icon.on('dragend', () => {
        this.endDrag(icon, label);
      });

      this.boxItems.push({ item, icon, label });
    });
  }

  startDrag(item, icon, label) {
    this.isDragging = true;
    this.dragItem = item;
    this.dragIcon = icon;
    this.dragLabel = label;
    this.dragRotation = 0;

    icon.setDepth(20);
    icon.setScale(1.3);
    icon.setAlpha(0.9);
    label.setVisible(false);

    // Build ghost shape sprites that follow cursor
    this.rebuildDragSprite();
  }

  rebuildDragSprite() {
    // Clear old drag shape visuals
    if (this.dragShapeCells) {
      this.dragShapeCells.forEach(c => c.destroy());
    }
    this.dragShapeCells = [];

    if (!this.dragItem) return;

    const shape = this.getRotatedShape(this.dragItem.shape, this.dragRotation);

    shape.forEach(([c, r]) => {
      const cell = this.add.rectangle(0, 0, CELL_SIZE - 4, CELL_SIZE - 4, this.dragItem.color, 0.5)
        .setStrokeStyle(2, 0xffffff, 0.5)
        .setDepth(19);
      this.dragShapeCells.push(cell);
    });
  }

  updateDropPreview(pointer) {
    this.dropPreviewGraphics.clear();

    if (!this.isDragging || !this.dragItem) {
      if (this.dragShapeCells) {
        this.dragShapeCells.forEach(c => c.setVisible(false));
      }
      return;
    }

    const shape = this.getRotatedShape(this.dragItem.shape, this.dragRotation);

    // Position shape cells relative to cursor
    shape.forEach(([c, r], i) => {
      if (i < this.dragShapeCells.length) {
        this.dragShapeCells[i].setPosition(
          pointer.x + c * CELL_SIZE,
          pointer.y + r * CELL_SIZE
        );
        this.dragShapeCells[i].setVisible(true);
      }
    });

    // Check if hovering over grid
    const col = Math.floor((pointer.x - GRID_X) / CELL_SIZE);
    const row = Math.floor((pointer.y - GRID_Y) / CELL_SIZE);

    if (col >= 0 && col < GRID_COLS && row >= 0 && row < GRID_ROWS) {
      const canPlace = this.canPlaceAt(col, row, shape);

      shape.forEach(([c, r]) => {
        const gc = col + c;
        const gr = row + r;
        if (gc < 0 || gc >= GRID_COLS || gr < 0 || gr >= GRID_ROWS) return;

        const x = GRID_X + gc * CELL_SIZE;
        const y = GRID_Y + gr * CELL_SIZE;

        if (canPlace) {
          this.dropPreviewGraphics.fillStyle(this.dragItem.color, 0.35);
          this.dropPreviewGraphics.fillRect(x + 2, y + 2, CELL_SIZE - 4, CELL_SIZE - 4);
          this.dropPreviewGraphics.lineStyle(2, 0x4ecca3, 0.9);
          this.dropPreviewGraphics.strokeRect(x + 2, y + 2, CELL_SIZE - 4, CELL_SIZE - 4);
        } else {
          this.dropPreviewGraphics.fillStyle(0xe94560, 0.25);
          this.dropPreviewGraphics.fillRect(x + 2, y + 2, CELL_SIZE - 4, CELL_SIZE - 4);
          this.dropPreviewGraphics.lineStyle(2, 0xe94560, 0.8);
          this.dropPreviewGraphics.strokeRect(x + 2, y + 2, CELL_SIZE - 4, CELL_SIZE - 4);
        }
      });
    }
  }

  endDrag(icon, label) {
    this.dropPreviewGraphics.clear();

    // Clean up drag shape cells
    if (this.dragShapeCells) {
      this.dragShapeCells.forEach(c => c.destroy());
      this.dragShapeCells = [];
    }

    if (!this.dragItem) {
      this.isDragging = false;
      return;
    }

    const pointer = this.input.activePointer;
    const shape = this.getRotatedShape(this.dragItem.shape, this.dragRotation);
    const col = Math.floor((pointer.x - GRID_X) / CELL_SIZE);
    const row = Math.floor((pointer.y - GRID_Y) / CELL_SIZE);

    // Try to place on grid
    if (col >= 0 && col < GRID_COLS && row >= 0 && row < GRID_ROWS &&
        this.canPlaceAt(col, row, shape)) {
      this.placeItem(this.dragItem, col, row, shape);

      // Remove from box
      icon.destroy();
      label.destroy();
      this.boxItems = this.boxItems.filter(bi => bi.item.id !== this.dragItem.id);
    } else {
      // Return to box — find original position
      const boxItem = this.boxItems.find(bi => bi.item.id === this.dragItem.id);
      if (boxItem) {
        const idx = this.boxItems.indexOf(boxItem);
        const cols = 3;
        const origCol = idx % cols;
        const origRow = Math.floor(idx / cols);
        const origX = BOX_X + 45 + origCol * 70;
        const origY = BOX_Y + 55 + origRow * 80;

        this.tweens.add({
          targets: icon,
          x: origX,
          y: origY,
          scale: 1,
          duration: 200,
          ease: 'Back.easeOut',
        });
        label.setVisible(true);
      }

      icon.setAlpha(1);
      icon.setDepth(6);

      if (col >= 0 && col < GRID_COLS && row >= 0 && row < GRID_ROWS) {
        // Was over grid but couldn't place — shake feedback
        this.cameras.main.shake(80, 0.004);
      }
    }

    this.isDragging = false;
    this.dragItem = null;
    this.dragIcon = null;
    this.dragLabel = null;
  }

  placeItem(item, col, row, shape) {
    // Write to grid
    shape.forEach(([c, r]) => {
      this.grid[row + r][col + c] = {
        id: item.id,
        color: item.color,
      };
    });

    // Play satisfying thud
    this.sfx.thud();

    // Place icon on the grid at the center of the shape
    const minC = Math.min(...shape.map(([c]) => c));
    const maxC = Math.max(...shape.map(([c]) => c));
    const minR = Math.min(...shape.map(([, r]) => r));
    const maxR = Math.max(...shape.map(([, r]) => r));
    const centerX = GRID_X + (col + (minC + maxC + 1) / 2) * CELL_SIZE;
    const centerY = GRID_Y + (row + (minR + maxR + 1) / 2) * CELL_SIZE;

    const placedIcon = this.add.text(centerX, centerY, item.icon, {
      fontSize: '28px',
    }).setOrigin(0.5).setDepth(4);
    this.placedItemSprites.push(placedIcon);

    // Drop-in animation: scale bounce
    placedIcon.setScale(0.3);
    this.tweens.add({
      targets: placedIcon,
      scale: 1,
      duration: 300,
      ease: 'Back.easeOut',
    });

    // Dust particles on placement
    for (let i = 0; i < 8; i++) {
      const dust = this.add.circle(centerX, centerY, Phaser.Math.Between(2, 5),
        Phaser.Math.RND.pick([0xc4943a, 0x8b6914, 0xdaa520, item.color]));
      const angle = (Math.PI * 2 / 8) * i + Math.random() * 0.5;
      const dist = Phaser.Math.Between(20, 50);
      this.tweens.add({
        targets: dust,
        x: centerX + Math.cos(angle) * dist,
        y: centerY + Math.sin(angle) * dist,
        alpha: 0,
        scaleX: 0,
        scaleY: 0,
        duration: Phaser.Math.Between(300, 500),
        ease: 'Power2',
        onComplete: () => dust.destroy(),
      });
    }

    // Redraw grid
    this.drawGrid();

    // Nick commentary
    const comment = NICK_COMMENTS[item.id];
    if (comment) {
      this.commentaryText.setText(comment);
      this.time.delayedCall(3500, () => {
        if (this.commentaryText && this.commentaryText.text === comment) {
          this.commentaryText.setText('');
        }
      });
    }

    // Update progress
    this.placedCount++;
    this.progressText.setText(`${this.placedCount} / ${this.totalItems} items placed`);

    // Check for bullseye placement sound
    if (shape.length >= 4) {
      this.time.delayedCall(150, () => this.sfx.cheer());
    }

    // Check completion
    if (this.placedCount >= this.totalItems) {
      this.time.delayedCall(1000, () => this.finishGame());
    }
  }

  getRotatedShape(shape, rotation) {
    let rotated = shape.map(([c, r]) => [c, r]);
    for (let i = 0; i < rotation % 4; i++) {
      rotated = rotated.map(([c, r]) => [-r, c]);
    }
    const minC = Math.min(...rotated.map(([c]) => c));
    const minR = Math.min(...rotated.map(([, r]) => r));
    return rotated.map(([c, r]) => [c - minC, r - minR]);
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

  finishGame() {
    this.isComplete = true;
    this.commentaryText.setText('');
    this.hintText.setVisible(false);

    // Calculate coverage
    let filledCells = 0;
    for (let r = 0; r < GRID_ROWS; r++) {
      for (let c = 0; c < GRID_COLS; c++) {
        if (this.grid[r][c]) filledCells++;
      }
    }
    const coverage = Math.round((filledCells / (GRID_ROWS * GRID_COLS)) * 100);

    this.sfx.victory();

    let coverageComment;
    if (coverage > 70) coverageComment = '"Cozy! ...maybe TOO cozy."';
    else if (coverage > 50) coverageComment = '"Room to breathe AND dance!"';
    else coverageComment = '"Minimalist vibes. Very intentional."';

    const resultBg = this.add.rectangle(GAME_WIDTH / 2, GAME_HEIGHT / 2, 500, 280, 0x000000, 0.85)
      .setStrokeStyle(2, 0xffd700)
      .setDepth(50)
      .setAlpha(0);

    const resultText = this.add.text(GAME_WIDTH / 2, GAME_HEIGHT / 2 - 20,
      `HOME SWEET HOME!\n\n` +
      `All ${this.totalItems} items unpacked!\n` +
      `Room coverage: ${coverage}%\n\n` +
      coverageComment,
      {
        fontFamily: 'Georgia, serif',
        fontSize: '26px',
        color: '#ffd700',
        fontStyle: 'bold',
        align: 'center',
      }
    ).setOrigin(0.5).setDepth(51).setAlpha(0);

    this.tweens.add({
      targets: [resultBg, resultText],
      alpha: 1,
      duration: 800,
    });

    // Post-game dialogue
    this.time.delayedCall(4000, () => {
      resultBg.destroy();
      resultText.destroy();

      const dialogueLines = [
        { speaker: 'nick', text: "Okay, I know it looks chaotic, but there's a SYSTEM." },
        { speaker: 'narrator', text: 'There was no system.' },
        { speaker: 'nick', text: '...but it felt like home anyway.' },
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
