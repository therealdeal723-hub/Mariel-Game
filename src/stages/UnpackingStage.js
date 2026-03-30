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
const BOX_CENTER_X = BOX_X + BOX_W / 2;
const BOX_CENTER_Y = BOX_Y + BOX_H / 2;

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
    this.dragIcon = null;
    this.dragRotation = 0;
    this.dragSource = null; // 'box' or 'room'
    this.dragRoomData = null; // when rearranging: { col, row, shape, spriteRecord }
    this.placedItemSprites = []; // { sprite, item, col, row, shape, fillScale }

    // Shuffled item queue — items pop out one at a time
    this.itemQueue = Phaser.Utils.Array.Shuffle([...ITEMS]);
    this.currentBoxItem = null; // the item currently sitting on top of the box

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
    this.hintText = this.add.text(GAME_WIDTH / 2, 80, 'Click the box to unpack \u2022 Drag items to place \u2022 R to rotate', {
      fontFamily: 'Arial',
      fontSize: '12px',
      color: '#666666',
    }).setOrigin(0.5);

    // Items remaining counter on the box
    this.boxCountText = this.add.text(BOX_CENTER_X, BOX_Y + BOX_H - 20, '', {
      fontFamily: 'Arial',
      fontSize: '11px',
      color: '#5c3a1e',
      fontStyle: 'bold',
    }).setOrigin(0.5).setDepth(3);
    this.updateBoxCount();

    // Drop preview graphics
    this.dropPreviewGraphics = this.add.graphics().setDepth(5);
    this.gridGraphics = this.add.graphics();
    this.drawGrid();

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
    this.add.text(BOX_CENTER_X, BOX_Y + 20, '\uD83D\uDCE6 STUFF', {
      fontFamily: 'Arial',
      fontSize: '12px',
      color: '#5c3a1e',
      fontStyle: 'bold',
    }).setOrigin(0.5);

    // Clickable "open" prompt in the center of the box
    this.boxPrompt = this.add.text(BOX_CENTER_X, BOX_CENTER_Y - 10, '?', {
      fontSize: '64px',
    }).setOrigin(0.5).setDepth(3);

    this.boxPromptLabel = this.add.text(BOX_CENTER_X, BOX_CENTER_Y + 45, 'Click to unpack!', {
      fontFamily: 'Georgia, serif',
      fontSize: '14px',
      color: '#ddd',
      fontStyle: 'bold',
    }).setOrigin(0.5).setDepth(3);

    // Pulsing animation on the prompt
    this.tweens.add({
      targets: this.boxPrompt,
      scale: 1.15,
      duration: 600,
      yoyo: true,
      repeat: -1,
      ease: 'Sine.easeInOut',
    });

    // Make the box area clickable
    this.boxHitArea = this.add.rectangle(BOX_CENTER_X, BOX_CENTER_Y, BOX_W, BOX_H, 0x000000, 0)
      .setInteractive({ useHandCursor: true })
      .setDepth(2);

    this.boxHitArea.on('pointerdown', () => this.popNextItem());
  }

  updateBoxCount() {
    const remaining = this.itemQueue.length;
    if (remaining > 0) {
      this.boxCountText.setText(`${remaining} item${remaining !== 1 ? 's' : ''} left`);
    } else {
      this.boxCountText.setText('Empty!');
    }
  }

  popNextItem() {
    // Don't pop if currently dragging or an item is already out waiting
    if (this.isDragging || this.currentBoxItem) return;
    if (this.itemQueue.length === 0) return;

    const item = this.itemQueue.shift();
    this.currentBoxItem = item;
    this.updateBoxCount();

    // Hide the prompt if queue is now empty
    if (this.itemQueue.length === 0) {
      this.boxPrompt.setText('\uD83D\uDCE6');
      this.boxPromptLabel.setText('');
    }

    this.sfx.click();

    // Create the item icon popping out of the box
    const icon = this.add.text(BOX_CENTER_X, BOX_CENTER_Y, item.icon, {
      fontSize: '48px',
    }).setOrigin(0.5).setDepth(6);

    const label = this.add.text(BOX_CENTER_X, BOX_CENTER_Y + 40, item.label, {
      fontFamily: 'Georgia, serif',
      fontSize: '13px',
      color: '#fff',
      fontStyle: 'bold',
    }).setOrigin(0.5).setDepth(6);

    // Pop-out animation
    icon.setScale(0);
    label.setAlpha(0);
    this.tweens.add({
      targets: icon,
      scale: 1,
      duration: 350,
      ease: 'Back.easeOut',
    });
    this.tweens.add({
      targets: label,
      alpha: 1,
      duration: 300,
      delay: 150,
    });

    // Make it draggable
    icon.setInteractive({ useHandCursor: true, draggable: true });

    icon.on('dragstart', () => {
      this.dragSource = 'box';
      this.startDrag(item, icon, label);
    });

    icon.on('drag', (_pointer, dragX, dragY) => {
      icon.setPosition(dragX, dragY);
      this.updateDropPreview(this.input.activePointer);
    });

    icon.on('dragend', () => {
      this.endDragFromBox(item, icon, label);
    });

    // Nick's comment
    const comment = NICK_COMMENTS[item.id];
    if (comment) {
      this.commentaryText.setText(comment);
      this.time.delayedCall(3500, () => {
        if (this.commentaryText && this.commentaryText.text === comment) {
          this.commentaryText.setText('');
        }
      });
    }
  }

  // ─── Drag from box ──────────────────────────────────────

  startDrag(item, icon, label) {
    this.isDragging = true;
    this.dragItem = item;
    this.dragIcon = icon;
    this.dragRotation = 0;

    icon.setDepth(20);
    icon.setScale(1.3);
    icon.setAlpha(0.9);
    if (label) label.setVisible(false);

    this.rebuildDragSprite();
  }

  rebuildDragSprite() {
    if (this.dragShapeCells) {
      this.dragShapeCells.forEach(c => c.destroy());
    }
    this.dragShapeCells = [];

    if (!this.dragItem) return;

    const shape = this.getRotatedShape(this.dragItem.shape, this.dragRotation);

    shape.forEach(() => {
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

  endDragFromBox(item, icon, label) {
    this.dropPreviewGraphics.clear();
    if (this.dragShapeCells) {
      this.dragShapeCells.forEach(c => c.destroy());
      this.dragShapeCells = [];
    }

    const pointer = this.input.activePointer;
    const shape = this.getRotatedShape(item.shape, this.dragRotation);
    const col = Math.floor((pointer.x - GRID_X) / CELL_SIZE);
    const row = Math.floor((pointer.y - GRID_Y) / CELL_SIZE);

    if (col >= 0 && col < GRID_COLS && row >= 0 && row < GRID_ROWS &&
        this.canPlaceAt(col, row, shape)) {
      // Successfully placed
      icon.destroy();
      if (label) label.destroy();
      this.placeItem(item, col, row, shape);
      this.currentBoxItem = null;
    } else {
      // Snap back to box center
      this.tweens.add({
        targets: icon,
        x: BOX_CENTER_X,
        y: BOX_CENTER_Y,
        scale: 1,
        duration: 200,
        ease: 'Back.easeOut',
      });
      icon.setAlpha(1);
      icon.setDepth(6);
      if (label) label.setVisible(true);

      if (col >= 0 && col < GRID_COLS && row >= 0 && row < GRID_ROWS) {
        this.cameras.main.shake(80, 0.004);
      }
    }

    this.isDragging = false;
    this.dragItem = null;
    this.dragIcon = null;
    this.dragSource = null;
  }

  // ─── Drag from room (rearrange) ─────────────────────────

  startRoomDrag(spriteRecord) {
    const { item, col, row, shape, sprite } = spriteRecord;

    // Clear this item from the grid so the space is free
    shape.forEach(([c, r]) => {
      this.grid[row + r][col + c] = null;
    });
    this.drawGrid();

    // Hide the placed icon — we'll use the drag icon instead
    sprite.setVisible(false);

    this.dragSource = 'room';
    this.dragRoomData = spriteRecord;
    this.dragItem = item;
    this.dragRotation = 0;
    this.isDragging = true;

    // Create a temporary drag icon
    const dragIcon = this.add.text(sprite.x, sprite.y, item.icon, {
      fontSize: '48px',
    }).setOrigin(0.5).setDepth(20).setScale(1.3).setAlpha(0.9);

    dragIcon.setInteractive({ useHandCursor: true, draggable: true });
    this.dragIcon = dragIcon;

    // Immediately start Phaser drag
    this.input.setDraggable(dragIcon);

    dragIcon.on('drag', (_pointer, dragX, dragY) => {
      dragIcon.setPosition(dragX, dragY);
      this.updateDropPreview(this.input.activePointer);
    });

    dragIcon.on('dragend', () => {
      this.endDragFromRoom(dragIcon);
    });

    this.rebuildDragSprite();

    // Kick off the drag by simulating it on the pointer
    this.input.emit('dragstart', this.input.activePointer, dragIcon);
  }

  endDragFromRoom(dragIcon) {
    this.dropPreviewGraphics.clear();
    if (this.dragShapeCells) {
      this.dragShapeCells.forEach(c => c.destroy());
      this.dragShapeCells = [];
    }

    const spriteRecord = this.dragRoomData;
    const item = spriteRecord.item;

    const pointer = this.input.activePointer;
    const shape = this.getRotatedShape(item.shape, this.dragRotation);
    const col = Math.floor((pointer.x - GRID_X) / CELL_SIZE);
    const row = Math.floor((pointer.y - GRID_Y) / CELL_SIZE);

    if (col >= 0 && col < GRID_COLS && row >= 0 && row < GRID_ROWS &&
        this.canPlaceAt(col, row, shape)) {
      // Place at new location
      dragIcon.destroy();
      spriteRecord.sprite.destroy();
      this.placedItemSprites = this.placedItemSprites.filter(p => p !== spriteRecord);
      // Don't increment placedCount — it's a move, not a new placement
      this.placeItemSilent(item, col, row, shape);
    } else {
      // Return to original position
      const origShape = spriteRecord.shape;
      origShape.forEach(([c, r]) => {
        this.grid[spriteRecord.row + r][spriteRecord.col + c] = {
          id: item.id,
          color: item.color,
        };
      });
      this.drawGrid();
      spriteRecord.sprite.setVisible(true);
      dragIcon.destroy();
    }

    this.isDragging = false;
    this.dragItem = null;
    this.dragIcon = null;
    this.dragSource = null;
    this.dragRoomData = null;
  }

  // ─── Placement ──────────────────────────────────────────

  placeItem(item, col, row, shape) {
    this.writeToGrid(item, col, row, shape);
    this.sfx.thud();

    const placedIcon = this.createPlacedIcon(item, col, row, shape, true);

    // Dust particles
    this.emitDust(placedIcon.x, placedIcon.y, item.color);

    this.drawGrid();

    // Update progress
    this.placedCount++;
    this.progressText.setText(`${this.placedCount} / ${this.totalItems} items placed`);

    if (shape.length >= 4) {
      this.time.delayedCall(150, () => this.sfx.cheer());
    }

    // Update hint after first item placed
    if (this.placedCount === 1) {
      this.hintText.setText('Drag placed items to rearrange \u2022 Click box for next item \u2022 R to rotate');
    }

    if (this.placedCount >= this.totalItems) {
      this.time.delayedCall(1000, () => this.finishGame());
    }
  }

  /** Place without sound/particles/count — used for rearranging */
  placeItemSilent(item, col, row, shape) {
    this.writeToGrid(item, col, row, shape);
    this.sfx.thud();
    this.createPlacedIcon(item, col, row, shape, true);
    this.drawGrid();
  }

  writeToGrid(item, col, row, shape) {
    shape.forEach(([c, r]) => {
      this.grid[row + r][col + c] = {
        id: item.id,
        color: item.color,
      };
    });
  }

  createPlacedIcon(item, col, row, shape, animate) {
    const minC = Math.min(...shape.map(([c]) => c));
    const maxC = Math.max(...shape.map(([c]) => c));
    const minR = Math.min(...shape.map(([, r]) => r));
    const maxR = Math.max(...shape.map(([, r]) => r));
    const spanW = maxC - minC + 1;
    const spanH = maxR - minR + 1;
    const centerX = GRID_X + (col + (minC + maxC + 1) / 2) * CELL_SIZE;
    const centerY = GRID_Y + (row + (minR + maxR + 1) / 2) * CELL_SIZE;

    const baseFontSize = 28;
    const spanMax = Math.max(spanW, spanH);
    const fillScale = (spanMax * CELL_SIZE * 0.75) / baseFontSize;

    const placedIcon = this.add.text(centerX, centerY, item.icon, {
      fontSize: `${baseFontSize}px`,
    }).setOrigin(0.5).setDepth(4);

    const record = { sprite: placedIcon, item, col, row, shape, fillScale };
    this.placedItemSprites.push(record);

    // Make it draggable for rearranging
    placedIcon.setInteractive({ useHandCursor: true });
    placedIcon.on('pointerdown', () => {
      if (this.isDragging || this.isComplete) return;
      this.startRoomDrag(record);
    });

    if (animate) {
      placedIcon.setScale(0.3);
      this.tweens.add({
        targets: placedIcon,
        scale: fillScale,
        duration: 300,
        ease: 'Back.easeOut',
      });
    } else {
      placedIcon.setScale(fillScale);
    }

    return placedIcon;
  }

  emitDust(centerX, centerY, itemColor) {
    for (let i = 0; i < 8; i++) {
      const dust = this.add.circle(centerX, centerY, Phaser.Math.Between(2, 5),
        Phaser.Math.RND.pick([0xc4943a, 0x8b6914, 0xdaa520, itemColor]));
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
  }

  // ─── Helpers ────────────────────────────────────────────

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

  // ─── End game ───────────────────────────────────────────

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

      this.dialogue = new DialogueSystem(this, this.sfx);
      this.dialogue.createUI();
      this.dialogue.show(dialogueLines, () => {
        this.sfx.stopMusic();
        this.completeStage();
      });
    });
  }
}
