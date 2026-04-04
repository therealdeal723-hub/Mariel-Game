import Phaser from 'phaser';
import { GAME_WIDTH, GAME_HEIGHT, COLORS } from '../config.js';
import { BaseStage } from './BaseStage.js';
import { DialogueSystem } from '../systems/DialogueSystem.js';
import { SoundFX } from '../systems/SoundFX.js';

// Room grid — house floorplan layout
const GRID_COLS = 8;
const GRID_ROWS = 6;
const CELL_SIZE = 64;
const GRID_X = 340;
const GRID_Y = 130;

// Room zones define areas of the floorplan
// Each zone has a name, grid bounds, color tint, and matching item categories
const ROOM_ZONES = [
  { name: 'Kitchen',     col: 0, row: 0, w: 4, h: 3, color: 0x8B6914, items: ['baking'] },
  { name: 'Living Room', col: 4, row: 0, w: 4, h: 3, color: 0x3d5a3d, items: ['plants'] },
  { name: 'Closet',      col: 0, row: 3, w: 3, h: 3, color: 0x5a3d5a, items: ['bags', 'jackets', 'scarves'] },
  { name: 'Bedroom',     col: 3, row: 3, w: 5, h: 3, color: 0x3d4a6a, items: ['plants'] },
];

// Map item IDs to their category for zone matching
function getItemCategory(id) {
  if (id.startsWith('monstera') || id === 'mini-monstera') return 'plants';
  if (['birkin','chanel-flap','lv-neverfull','dior-saddle','ysl-envelope'].includes(id)) return 'bags';
  if (['leather-jacket','denim-jacket','blazer'].includes(id)) return 'jackets';
  if (['silk-scarf','cashmere-wrap','knit-scarf'].includes(id)) return 'scarves';
  return 'baking';
}

// Open box area (left side)
const BOX_X = 40;
const BOX_Y = 160;
const BOX_W = 240;
const BOX_H = 400;
const BOX_CENTER_X = BOX_X + BOX_W / 2;
const BOX_CENTER_Y = BOX_Y + BOX_H / 2;

// Items — each has a multi-cell shape, color, label, and texture key
const ITEMS = [
  // Monsteras
  { id: 'monstera-deliciosa', label: 'Monstera Deliciosa', shape: [[0,0],[0,1]], color: 0x1a8a3e, texture: 'item-monstera-deliciosa' },
  { id: 'monstera-adansonii', label: 'Swiss Cheese Plant', shape: [[0,0],[0,1]], color: 0x22a848, texture: 'item-monstera-adansonii' },
  { id: 'monstera-thai', label: 'Thai Constellation', shape: [[0,0],[0,1]], color: 0x1a8a3e, texture: 'item-monstera-thai' },
  { id: 'monstera-albo', label: 'Monstera Albo', shape: [[0,0],[0,1]], color: 0x1a8a3e, texture: 'item-monstera-albo' },
  { id: 'monstera-peru', label: 'Monstera Peru', shape: [[0,0]], color: 0x1a7535, texture: 'item-monstera-peru' },
  { id: 'mini-monstera', label: 'Mini Monstera', shape: [[0,0]], color: 0x2aad50, texture: 'item-mini-monstera' },

  // Designer Bags
  { id: 'birkin', label: 'Birkin Bag', shape: [[0,0],[1,0]], color: 0xc4874a, texture: 'item-birkin' },
  { id: 'chanel-flap', label: 'Chanel Classic Flap', shape: [[0,0]], color: 0x1a1a1a, texture: 'item-chanel-flap' },
  { id: 'lv-neverfull', label: 'LV Neverfull', shape: [[0,0],[1,0]], color: 0xc4943a, texture: 'item-lv-neverfull' },
  { id: 'dior-saddle', label: 'Dior Saddle', shape: [[0,0],[1,0]], color: 0xc4a882, texture: 'item-dior-saddle' },
  { id: 'ysl-envelope', label: 'YSL Envelope', shape: [[0,0]], color: 0x2a2a2a, texture: 'item-ysl-envelope' },

  // Jackets
  { id: 'leather-jacket', label: 'Leather Jacket', shape: [[0,0],[1,0],[0,1],[1,1]], color: 0x1a1a1a, texture: 'item-leather-jacket' },
  { id: 'denim-jacket', label: 'Denim Jacket', shape: [[0,0],[1,0],[0,1],[1,1]], color: 0x4a6a8a, texture: 'item-denim-jacket' },
  { id: 'blazer', label: 'Blazer', shape: [[0,0],[1,0],[0,1],[1,1]], color: 0x2a2848, texture: 'item-blazer' },

  // Scarves
  { id: 'silk-scarf', label: 'Silk Scarf', shape: [[0,0]], color: 0xc93545, texture: 'item-silk-scarf' },
  { id: 'cashmere-wrap', label: 'Cashmere Wrap', shape: [[0,0],[1,0]], color: 0xe8d5c0, texture: 'item-cashmere-wrap' },
  { id: 'knit-scarf', label: 'Knit Scarf', shape: [[0,0],[0,1]], color: 0xc44040, texture: 'item-knit-scarf' },

  // Baking Equipment
  { id: 'stand-mixer', label: 'Stand Mixer', shape: [[0,0],[0,1]], color: 0xe04868, texture: 'item-stand-mixer' },
  { id: 'rolling-pin', label: 'Rolling Pin', shape: [[0,0],[1,0]], color: 0xdcc4a0, texture: 'item-rolling-pin' },
  { id: 'whisk', label: 'Whisk', shape: [[0,0]], color: 0xc0c0c0, texture: 'item-whisk' },
  { id: 'mixing-bowls', label: 'Mixing Bowls', shape: [[0,0],[1,0]], color: 0x4a90c8, texture: 'item-mixing-bowls' },
  { id: 'measuring-cups', label: 'Measuring Cups', shape: [[0,0]], color: 0xe0e0e0, texture: 'item-measuring-cups' },
  { id: 'piping-bag', label: 'Piping Bag', shape: [[0,0]], color: 0xf0ebe0, texture: 'item-piping-bag' },
  { id: 'cake-stand', label: 'Cake Stand', shape: [[0,0],[0,1]], color: 0xf0ebe5, texture: 'item-cake-stand' },
  { id: 'oven-mitts', label: 'Oven Mitts', shape: [[0,0]], color: 0xe06888, texture: 'item-oven-mitts' },
];

// Nick's commentary keyed to item id
const NICK_COMMENTS = {
  'monstera-deliciosa': '"That one\'s bigger than our apartment."',
  'monstera-adansonii': '"Why does it have holes? Is it broken?"',
  'monstera-thai': '"This one costs HOW much?!"',
  'monstera-albo': '"Half green, half white... half the price? No? Okay."',
  'monstera-peru': '"At least this one doesn\'t have holes."',
  'mini-monstera': '"A baby plant! ...it\'ll be 6 feet tall by Tuesday."',
  'birkin': '"Do I want to know how much that costs?"',
  'chanel-flap': '"That bag has its own insurance policy."',
  'lv-neverfull': '"Neverfull? Challenge accepted."',
  'dior-saddle': '"It looks like a tiny horse saddle. I love it."',
  'ysl-envelope': '"Very sleek. Very \'I have my life together.\'"',
  'leather-jacket': '"Okay that jacket is actually fire."',
  'denim-jacket': '"Classic. Goes with everything."',
  'blazer': '"For when we pretend to be fancy."',
  'silk-scarf': '"Very Audrey Hepburn."',
  'cashmere-wrap': '"I will absolutely steal this when it\'s cold."',
  'knit-scarf': '"Cozy season essential."',
  'stand-mixer': '"She\'s about to make SO many cakes."',
  'rolling-pin': '"This doubles as home defense."',
  'whisk': '"Whisk me away! ...I\'m sorry."',
  'mixing-bowls': '"One bowl for mixing, two for snacking."',
  'measuring-cups': '"Baking is just science with sugar."',
  'piping-bag': '"Professional frosting deployment system."',
  'cake-stand': '"Every cake deserves a pedestal."',
  'oven-mitts': '"Cute AND functional."',
};

export class UnpackingStage extends BaseStage {
  constructor() {
    super('UnpackingStage');
  }

  create() {
    this.sfx = new SoundFX(this);
    this.sfx.startCozyMusic();
    this.events.on('shutdown', () => this.sfx.destroy());

    // Scoring
    this.cozyScore = 0;

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
    // Dark base
    this.add.rectangle(GAME_WIDTH / 2, GAME_HEIGHT / 2, GAME_WIDTH, GAME_HEIGHT, 0x1a1520);

    // House outline
    const houseG = this.add.graphics();
    const hx = GRID_X - 8;
    const hy = GRID_Y - 8;
    const hw = GRID_COLS * CELL_SIZE + 16;
    const hh = GRID_ROWS * CELL_SIZE + 16;

    // Outer walls (thick border)
    houseG.lineStyle(4, 0x8a7a6a, 1);
    houseG.strokeRect(hx, hy, hw, hh);

    // Room zone fills and dividing walls
    ROOM_ZONES.forEach(zone => {
      const zx = GRID_X + zone.col * CELL_SIZE;
      const zy = GRID_Y + zone.row * CELL_SIZE;
      const zw = zone.w * CELL_SIZE;
      const zh = zone.h * CELL_SIZE;

      // Zone floor tint
      houseG.fillStyle(zone.color, 0.15);
      houseG.fillRect(zx, zy, zw, zh);

      // Zone border (interior walls)
      houseG.lineStyle(2, 0x8a7a6a, 0.6);
      houseG.strokeRect(zx, zy, zw, zh);
    });

    // Room zone labels
    this.zoneLabels = [];
    ROOM_ZONES.forEach(zone => {
      const cx = GRID_X + (zone.col + zone.w / 2) * CELL_SIZE;
      const cy = GRID_Y + (zone.row + zone.h / 2) * CELL_SIZE;
      const label = this.add.text(cx, cy, zone.name, {
        fontFamily: 'Georgia, serif',
        fontSize: '13px',
        color: '#888888',
        fontStyle: 'italic',
      }).setOrigin(0.5).setAlpha(0.5).setDepth(1);
      this.zoneLabels.push(label);
    });

    // Ambient details container (for "room comes alive" effects)
    this.ambientGroup = [];
  }

  createRoom() {
    // House title
    this.add.text(GRID_X + (GRID_COLS * CELL_SIZE) / 2, GRID_Y - 22, '\uD83C\uDFE0 Your New Home — Floorplan', {
      fontFamily: 'Georgia, serif',
      fontSize: '15px',
      color: '#ffd700',
    }).setOrigin(0.5);

    // Cozy score display
    this.cozyScoreText = this.add.text(GRID_X + GRID_COLS * CELL_SIZE + 10, GRID_Y, 'Cozy: 0', {
      fontFamily: 'Georgia, serif',
      fontSize: '14px',
      color: '#ffd700',
      fontStyle: 'bold',
    }).setDepth(10);

    this.cozyMeter = this.add.graphics().setDepth(10);
    this.drawCozyMeter();
  }

  drawCozyMeter() {
    this.cozyMeter.clear();
    const mx = GRID_X + GRID_COLS * CELL_SIZE + 12;
    const my = GRID_Y + 25;
    const mw = 16;
    const mh = 150;

    // Background
    this.cozyMeter.fillStyle(0x333333, 0.6);
    this.cozyMeter.fillRect(mx, my, mw, mh);

    // Fill based on cozy score (max ~100)
    const maxScore = this.totalItems * 4; // ~100 max
    const fill = Math.min(this.cozyScore / maxScore, 1);
    const fillH = fill * mh;

    // Gradient color from cold (blue) to cozy (warm orange)
    const color = fill > 0.6 ? 0xffa040 : fill > 0.3 ? 0xffd700 : 0x4ecca3;
    this.cozyMeter.fillStyle(color, 0.9);
    this.cozyMeter.fillRect(mx, my + mh - fillH, mw, fillH);

    // Border
    this.cozyMeter.lineStyle(1, 0x666666, 0.8);
    this.cozyMeter.strokeRect(mx, my, mw, mh);

    this.cozyScoreText.setText(`Cozy: ${this.cozyScore}`);
  }

  /** Check if an item placed at (col,row) is in its preferred room zone */
  getZoneBonus(itemId, col, row, shape) {
    const category = getItemCategory(itemId);

    for (const zone of ROOM_ZONES) {
      // Check if ALL cells of the item are within this zone
      const allInZone = shape.every(([c, r]) => {
        const gc = col + c;
        const gr = row + r;
        return gc >= zone.col && gc < zone.col + zone.w &&
               gr >= zone.row && gr < zone.row + zone.h;
      });

      if (allInZone && zone.items.includes(category)) {
        return { bonus: true, zoneName: zone.name };
      }
    }
    return { bonus: false, zoneName: null };
  }

  /** Add ambient details as milestones are reached */
  addAmbientDetail() {
    const milestones = [5, 10, 15, 20, 25];
    if (!milestones.includes(this.placedCount)) return;

    const g = this.add.graphics().setDepth(0).setAlpha(0);
    this.ambientGroup.push(g);

    if (this.placedCount === 5) {
      // Warm glow from kitchen area
      g.fillStyle(0xffa040, 0.06);
      g.fillRect(GRID_X, GRID_Y, 4 * CELL_SIZE, 3 * CELL_SIZE);
    } else if (this.placedCount === 10) {
      // Window light in living room
      const wx = GRID_X + 6 * CELL_SIZE;
      const wy = GRID_Y + 4;
      g.fillStyle(0xaaccff, 0.08);
      g.fillRect(wx, wy, CELL_SIZE * 1.5, CELL_SIZE * 0.8);
      g.lineStyle(2, 0x8a7a6a, 0.4);
      g.strokeRect(wx, wy, CELL_SIZE * 1.5, CELL_SIZE * 0.8);
      g.lineBetween(wx + CELL_SIZE * 0.75, wy, wx + CELL_SIZE * 0.75, wy + CELL_SIZE * 0.8);
    } else if (this.placedCount === 15) {
      // Rug in bedroom
      const rx = GRID_X + (4.5) * CELL_SIZE;
      const ry = GRID_Y + (4) * CELL_SIZE;
      g.fillStyle(0x8b4a6a, 0.12);
      g.fillRoundedRect(rx, ry, CELL_SIZE * 3, CELL_SIZE * 1.5, 6);
    } else if (this.placedCount === 20) {
      // Warm lamp glow in multiple rooms
      [[1.5, 1], [6, 4]].forEach(([c, r]) => {
        const lx = GRID_X + c * CELL_SIZE;
        const ly = GRID_Y + r * CELL_SIZE;
        g.fillStyle(0xffd700, 0.06);
        g.fillCircle(lx, ly, CELL_SIZE * 1.5);
      });
    } else if (this.placedCount === 25) {
      // Final warm overlay - the whole house glows
      g.fillStyle(0xffa040, 0.04);
      g.fillRect(GRID_X, GRID_Y, GRID_COLS * CELL_SIZE, GRID_ROWS * CELL_SIZE);
    }

    // Fade in
    this.tweens.add({ targets: g, alpha: 1, duration: 1500 });
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

    // Disable box click area while an item is out
    this.boxHitArea.disableInteractive();

    // Create the item image popping out of the box
    const icon = this.add.image(BOX_CENTER_X, BOX_CENTER_Y, item.texture)
      .setOrigin(0.5).setDepth(8).setDisplaySize(80, 80);

    // Capture target scale BEFORE setting to 0 for the tween
    const targetScaleX = icon.scaleX;
    const targetScaleY = icon.scaleY;

    const label = this.add.text(BOX_CENTER_X, BOX_CENTER_Y + 50, item.label, {
      fontFamily: 'Georgia, serif',
      fontSize: '13px',
      color: '#fff',
      fontStyle: 'bold',
    }).setOrigin(0.5).setDepth(8);

    // Pop-out animation
    icon.setScale(0);
    label.setAlpha(0);
    this.tweens.add({
      targets: icon,
      scaleX: targetScaleX,
      scaleY: targetScaleY,
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

    // Nick's comment + zone hint
    const comment = NICK_COMMENTS[item.id] || '';
    const category = getItemCategory(item.id);
    const preferredZone = ROOM_ZONES.find(z => z.items.includes(category));
    const hint = preferredZone ? `  \u2192 Try the ${preferredZone.name}!` : '';
    const fullComment = comment + hint;
    if (fullComment) {
      this.commentaryText.setText(fullComment);
      this.time.delayedCall(4000, () => {
        if (this.commentaryText && this.commentaryText.text === fullComment) {
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
      // Re-enable box clicks for next item
      if (this.itemQueue.length > 0) {
        this.boxHitArea.setInteractive({ useHandCursor: true });
      }
    } else {
      // Snap back to box center — item stays as currentBoxItem, box stays disabled
      icon.setDisplaySize(80, 80);
      const snapScaleX = icon.scaleX;
      const snapScaleY = icon.scaleY;
      this.tweens.add({
        targets: icon,
        x: BOX_CENTER_X,
        y: BOX_CENTER_Y,
        scaleX: snapScaleX,
        scaleY: snapScaleY,
        duration: 200,
        ease: 'Back.easeOut',
      });
      icon.setAlpha(1);
      icon.setDepth(8);
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

    // Create a temporary drag image
    const dragIcon = this.add.image(sprite.x, sprite.y, item.texture)
      .setOrigin(0.5).setDepth(20).setDisplaySize(80, 80).setAlpha(0.9);

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

    // Zone scoring
    const { bonus, zoneName } = this.getZoneBonus(item.id, col, row, shape);
    if (bonus) {
      this.cozyScore += 4;
      this.showPlacementFeedback(placedIcon.x, placedIcon.y, `\u2728 ${zoneName}! +4`, '#4ecca3');
      this.sfx.cheer();
    } else {
      this.cozyScore += 2;
      this.showPlacementFeedback(placedIcon.x, placedIcon.y, '+2', '#aaaaaa');
    }
    this.drawCozyMeter();

    if (shape.length >= 4 && !bonus) {
      this.time.delayedCall(150, () => this.sfx.cheer());
    }

    // Room comes alive at milestones
    this.addAmbientDetail();

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

    const displayW = spanW * CELL_SIZE * 0.85;
    const displayH = spanH * CELL_SIZE * 0.85;

    const placedIcon = this.add.image(centerX, centerY, item.texture)
      .setOrigin(0.5).setDepth(4).setDisplaySize(displayW, displayH);

    const record = { sprite: placedIcon, item, col, row, shape };
    this.placedItemSprites.push(record);

    // Make it draggable for rearranging
    placedIcon.setInteractive({ useHandCursor: true });
    placedIcon.on('pointerdown', () => {
      if (this.isDragging || this.isComplete) return;
      this.startRoomDrag(record);
    });

    if (animate) {
      // Store target scale from setDisplaySize, then animate from small
      const targetSX = placedIcon.scaleX;
      const targetSY = placedIcon.scaleY;
      placedIcon.setScale(0.05);
      this.tweens.add({
        targets: placedIcon,
        scaleX: targetSX,
        scaleY: targetSY,
        duration: 300,
        ease: 'Back.easeOut',
      });
    }

    return placedIcon;
  }

  showPlacementFeedback(x, y, text, color) {
    const popup = this.add.text(x, y - 20, text, {
      fontFamily: 'Georgia, serif',
      fontSize: '16px',
      color: color,
      fontStyle: 'bold',
    }).setOrigin(0.5).setDepth(30);

    this.tweens.add({
      targets: popup,
      y: y - 60,
      alpha: 0,
      duration: 1200,
      onComplete: () => popup.destroy(),
    });
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

    const maxScore = this.totalItems * 4;
    const scorePercent = Math.round((this.cozyScore / maxScore) * 100);

    let cozyRating;
    if (scorePercent >= 80) cozyRating = '\u2B50\u2B50\u2B50 Interior Designer!';
    else if (scorePercent >= 60) cozyRating = '\u2B50\u2B50 Cozy & Cute!';
    else if (scorePercent >= 40) cozyRating = '\u2B50 Getting There!';
    else cozyRating = 'Creative Chaos!';

    let coverageComment;
    if (coverage > 70) coverageComment = '"Cozy! ...maybe TOO cozy."';
    else if (coverage > 50) coverageComment = '"Room to breathe AND dance!"';
    else coverageComment = '"Minimalist vibes. Very intentional."';

    const resultBg = this.add.rectangle(GAME_WIDTH / 2, GAME_HEIGHT / 2, 500, 300, 0x000000, 0.85)
      .setStrokeStyle(2, 0xffd700)
      .setDepth(50)
      .setAlpha(0);

    const resultText = this.add.text(GAME_WIDTH / 2, GAME_HEIGHT / 2 - 30,
      `HOME SWEET HOME!\n\n` +
      `All ${this.totalItems} items unpacked!\n` +
      `Room coverage: ${coverage}%\n` +
      `Cozy Score: ${this.cozyScore} — ${cozyRating}\n\n` +
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
