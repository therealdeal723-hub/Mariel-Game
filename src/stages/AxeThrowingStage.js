import Phaser from 'phaser';
import { GAME_WIDTH, GAME_HEIGHT, COLORS } from '../config.js';
import { BaseStage } from './BaseStage.js';
import { DialogueSystem } from '../systems/DialogueSystem.js';
import { SoundFX } from '../systems/SoundFX.js';

const TOTAL_ROUNDS = 5;
const TARGET_X = 800;
const TARGET_Y = 350;
const PLAYER_THROW_X = 180;
const PLAYER_THROW_Y = 450;

// Scoring zones (distance from bullseye center)
const BULLSEYE_RADIUS = 18;
const INNER_RADIUS = 45;
const OUTER_RADIUS = 80;
const BOARD_RADIUS = 110;

// Difficulty presets for Nick's AI
const DIFFICULTY = {
  easy: {
    label: 'Easy',
    description: 'Nick had a few drinks',
    accuracyRange: 50,
    hitChance: 0.60,
    powerMin: 55,
    powerMax: 82,
    missChance: 0.20,
  },
  medium: {
    label: 'Medium',
    description: 'Nick is warmed up',
    accuracyRange: 28,
    hitChance: 0.78,
    powerMin: 75,
    powerMax: 95,
    missChance: 0.08,
  },
  hard: {
    label: 'Hard',
    description: 'Nick is locked in',
    accuracyRange: 5,
    hitChance: 0.97,
    powerMin: 96,
    powerMax: 100,
    missChance: 0.01,
  },
};

// Funny commentary for Nick's ridiculous throws
const NICK_COMMENTARY = [
  '"Behind the back throw!"',
  '"No-look shot!"',
  '"Triple spin!"',
  '"With eyes closed!"',
  '"Bounced off the ceiling!"',
];

const NICK_CELEBRATIONS = [
  '*flexes dramatically*',
  '*moonwalks*',
  '*air guitar solo*',
  '*blows on fingers like a gun*',
  '*victory dance*',
];

const NICK_MISS_REACTIONS = [
  '"That... was a practice throw."',
  '"The wind got it."',
  '"My hand slipped!"',
  '"I meant to do that."',
  '"The axe is broken."',
];

// Nick reacts to Mariel's throws during the game
const NICK_REACT_PLAYER_BULLSEYE = [
  '"WHAT. No. That didn\'t count."',
  '"Okay I\'m not even mad, that was sick."',
  '"...I taught her that."',
];

const NICK_REACT_PLAYER_GOOD = [
  '"Beginner\'s luck."',
  '"Fine. Fine! That was okay."',
  '"She\'s warming up... this is bad."',
];

const NICK_REACT_PLAYER_MISS = [
  '"Ha! Called it."',
  '"That\'s more like it."',
  '"Don\'t worry, the wall needed a hole anyway."',
];

// Game modes
const MODE_PRACTICE = 'practice';
const MODE_GAME = 'game';

export class AxeThrowingStage extends BaseStage {
  constructor() {
    super('AxeThrowingStage');
  }

  /** Detect whether we're on a touch-primary device (phone/tablet) vs desktop */
  get isMobile() {
    // pointer:fine = mouse/trackpad; pointer:coarse = finger/stylus
    if (window.matchMedia && window.matchMedia('(pointer: coarse)').matches) {
      return true;
    }
    // Fallback: no fine pointer and has touch
    return navigator.maxTouchPoints > 0 && !(window.matchMedia && window.matchMedia('(pointer: fine)').matches);
  }

  create() {
    // Game state
    this.playerScore = 0;
    this.nickScore = 0;
    this.currentRound = 0;
    this.isPlayerTurn = true;
    this.isThrowInProgress = false;
    this.powerLevel = 0;
    this.powerDirection = 1;
    this.isPowerCharging = false;
    this.gameMode = MODE_PRACTICE;
    this.practiceThrows = 0;
    this.difficulty = 'medium';

    // Round-by-round scores
    this.roundScores = []; // { player: number, nick: number }

    // Track where the mouse is aiming
    this.aimX = TARGET_X;
    this.aimY = TARGET_Y;

    // Axes that stick in the board
    this.stuckAxes = [];

    // Sound effects & music
    this.sfx = new SoundFX(this);
    this.sfx.startMusic();

    // Stop music when scene shuts down (back button, etc.)
    this.events.on('shutdown', () => this.sfx.destroy());

    this.createBackground();
    this.createTarget();
    this.createScoreboard();
    this.createRoundTracker();
    this.createPlayerUI();

    // Back button to return to stage select
    this.createBackButton();

    // Particle emitter for impacts
    this.createParticleSystem();

    // Start in practice mode
    this.startPracticeMode();
  }

  createBackground() {
    // Dark base
    this.add.rectangle(GAME_WIDTH / 2, GAME_HEIGHT / 2, GAME_WIDTH, GAME_HEIGHT, 0x1a0e06);

    // Wooden wall planks — alternating shades for a real wood look
    const wallG = this.add.graphics();
    const plankColors = [0x5c3a1e, 0x6b4226, 0x4a2e14, 0x5a3820, 0x6d4830, 0x4e3018];
    const plankH = 32;
    for (let y = 0; y < GAME_HEIGHT - 100; y += plankH) {
      const color = plankColors[(y / plankH) % plankColors.length | 0];
      wallG.fillStyle(color, 1);
      wallG.fillRect(0, y, GAME_WIDTH, plankH - 1);
      // Grain lines within each plank
      wallG.lineStyle(1, 0x000000, 0.08);
      wallG.lineBetween(0, y + plankH * 0.3, GAME_WIDTH, y + plankH * 0.3);
      wallG.lineBetween(0, y + plankH * 0.7, GAME_WIDTH, y + plankH * 0.7);
      // Plank seam (dark line between planks)
      wallG.lineStyle(1, 0x1a0e06, 0.5);
      wallG.lineBetween(0, y + plankH - 1, GAME_WIDTH, y + plankH - 1);
    }

    // Vertical plank seams (staggered like real wood paneling)
    wallG.lineStyle(1, 0x1a0e06, 0.25);
    for (let y = 0; y < GAME_HEIGHT - 100; y += plankH) {
      const offset = ((y / plankH) % 2) * 120 + 60;
      for (let x = offset; x < GAME_WIDTH; x += 240) {
        wallG.lineBetween(x, y, x, y + plankH);
      }
    }

    // Knotholes for texture
    const knotG = this.add.graphics();
    knotG.fillStyle(0x3a2010, 0.4);
    knotG.fillCircle(150, 180, 6);
    knotG.fillCircle(520, 300, 5);
    knotG.fillCircle(880, 150, 7);
    knotG.fillCircle(350, 420, 4);
    knotG.fillStyle(0x2a1508, 0.3);
    knotG.fillCircle(150, 180, 3);
    knotG.fillCircle(520, 300, 2.5);
    knotG.fillCircle(880, 150, 3.5);

    // Wooden floor (darker, wider planks)
    const floorG = this.add.graphics();
    const floorY = GAME_HEIGHT - 100;
    const floorColors = [0x3a2210, 0x4a2e18, 0x3e2614];
    for (let y = floorY; y < GAME_HEIGHT; y += 25) {
      const fc = floorColors[((y - floorY) / 25) % floorColors.length | 0];
      floorG.fillStyle(fc, 1);
      floorG.fillRect(0, y, GAME_WIDTH, 24);
      floorG.lineStyle(1, 0x1a0e06, 0.4);
      floorG.lineBetween(0, y + 24, GAME_WIDTH, y + 24);
    }
    // Floor-wall seam (baseboard)
    floorG.fillStyle(0x2a1808, 1);
    floorG.fillRect(0, floorY - 4, GAME_WIDTH, 8);

    // Warm ambient lighting overlay (subtle gradient from top)
    const ambientG = this.add.graphics();
    ambientG.fillStyle(0xffa040, 0.04);
    ambientG.fillRect(0, 0, GAME_WIDTH, GAME_HEIGHT / 3);

    // Hanging string lights across the top
    const lightG = this.add.graphics();
    lightG.lineStyle(1.5, 0x333333, 0.6);
    // Draped wire
    for (let x = 50; x < GAME_WIDTH - 50; x += 3) {
      const sag = Math.sin((x - 50) / (GAME_WIDTH - 100) * Math.PI) * 15;
      const sag2 = Math.sin(x * 0.05) * 4;
      lightG.fillStyle(0x333333, 0.6);
      lightG.fillRect(x, 42 + sag + sag2, 2, 1);
    }
    // Bulbs
    const bulbColors = [0xffd700, 0xff8c40, 0xffaa30, 0xffe060];
    for (let x = 80; x < GAME_WIDTH - 50; x += 85) {
      const sag = Math.sin((x - 50) / (GAME_WIDTH - 100) * Math.PI) * 15;
      const sag2 = Math.sin(x * 0.05) * 4;
      const by = 42 + sag + sag2;
      // Wire to bulb
      lightG.lineStyle(1, 0x333333, 0.5);
      lightG.lineBetween(x, by, x, by + 8);
      // Bulb glow
      const bc = bulbColors[((x / 85) | 0) % bulbColors.length];
      lightG.fillStyle(bc, 0.15);
      lightG.fillCircle(x, by + 12, 12);
      // Bulb
      lightG.fillStyle(bc, 0.9);
      lightG.fillCircle(x, by + 12, 4);
    }

    // Venue name banner (wood sign style)
    const signG = this.add.graphics();
    signG.fillStyle(0x2a1808, 0.8);
    signG.fillRoundedRect(GAME_WIDTH / 2 - 120, 8, 240, 30, 4);
    signG.lineStyle(1, 0x6b4226, 0.6);
    signG.strokeRoundedRect(GAME_WIDTH / 2 - 120, 8, 240, 30, 4);
    this.add.text(GAME_WIDTH / 2, 23, '\uD83E\uDE93 AXE HOUSE \uD83E\uDE93', {
      fontFamily: 'Georgia, serif',
      fontSize: '18px',
      color: '#ffd700',
      fontStyle: 'bold',
    }).setOrigin(0.5);
  }

  createTarget() {
    const g = this.add.graphics();

    // Target board (wooden backing)
    g.fillStyle(0x6b4226, 1);
    g.fillCircle(TARGET_X, TARGET_Y, BOARD_RADIUS + 15);

    // Outer ring
    g.fillStyle(0xffffff, 1);
    g.fillCircle(TARGET_X, TARGET_Y, BOARD_RADIUS);

    // Middle ring
    g.fillStyle(0x3366cc, 1);
    g.fillCircle(TARGET_X, TARGET_Y, OUTER_RADIUS);

    // Inner ring
    g.fillStyle(0xcc3333, 1);
    g.fillCircle(TARGET_X, TARGET_Y, INNER_RADIUS);

    // Bullseye
    g.fillStyle(0xffd700, 1);
    g.fillCircle(TARGET_X, TARGET_Y, BULLSEYE_RADIUS);

    // Crosshair lines
    g.lineStyle(1, 0x000000, 0.3);
    g.lineBetween(TARGET_X - BOARD_RADIUS, TARGET_Y, TARGET_X + BOARD_RADIUS, TARGET_Y);
    g.lineBetween(TARGET_X, TARGET_Y - BOARD_RADIUS, TARGET_X, TARGET_Y + BOARD_RADIUS);
  }

  createParticleSystem() {
    // Create a small wood chip texture
    const chipGfx = this.make.graphics({ x: 0, y: 0, add: false });
    chipGfx.fillStyle(0xc4943a, 1);
    chipGfx.fillRect(0, 0, 6, 4);
    chipGfx.generateTexture('woodchip', 6, 4);
    chipGfx.destroy();

    // Create a spark texture
    const sparkGfx = this.make.graphics({ x: 0, y: 0, add: false });
    sparkGfx.fillStyle(0xffd700, 1);
    sparkGfx.fillCircle(3, 3, 3);
    sparkGfx.generateTexture('spark', 6, 6);
    sparkGfx.destroy();
  }

  emitWoodChips(x, y, count = 8) {
    for (let i = 0; i < count; i++) {
      const chip = this.add.rectangle(
        x, y,
        Phaser.Math.Between(3, 7), Phaser.Math.Between(2, 4),
        Phaser.Math.RND.pick([0xc4943a, 0x8b6914, 0x6b4226, 0xdaa520])
      );
      this.tweens.add({
        targets: chip,
        x: x + Phaser.Math.Between(-40, 40),
        y: y + Phaser.Math.Between(-40, 20),
        angle: Phaser.Math.Between(-180, 180),
        alpha: 0,
        duration: Phaser.Math.Between(300, 600),
        ease: 'Power2',
        onComplete: () => chip.destroy(),
      });
    }
  }

  emitSparks(x, y, count = 12) {
    for (let i = 0; i < count; i++) {
      const spark = this.add.circle(x, y, Phaser.Math.Between(1, 3), 0xffd700);
      const angle = (Math.PI * 2 / count) * i + Math.random() * 0.5;
      const dist = Phaser.Math.Between(20, 60);
      this.tweens.add({
        targets: spark,
        x: x + Math.cos(angle) * dist,
        y: y + Math.sin(angle) * dist,
        alpha: 0,
        scaleX: 0,
        scaleY: 0,
        duration: Phaser.Math.Between(200, 500),
        ease: 'Power2',
        onComplete: () => spark.destroy(),
      });
    }
  }

  createScoreboard() {
    // Scoreboard background
    this.scoreboardBg = this.add.rectangle(GAME_WIDTH / 2, 75, 500, 55, 0x000000, 0.6);

    // Player score
    this.playerLabel = this.add.text(GAME_WIDTH / 2 - 140, 63, 'Mariel', {
      fontFamily: 'Georgia, serif',
      fontSize: '16px',
      color: '#4ecca3',
      fontStyle: 'bold',
    }).setOrigin(0.5);

    this.playerScoreText = this.add.text(GAME_WIDTH / 2 - 140, 85, '0', {
      fontFamily: 'Georgia, serif',
      fontSize: '22px',
      color: '#ffffff',
      fontStyle: 'bold',
    }).setOrigin(0.5);

    // VS
    this.vsText = this.add.text(GAME_WIDTH / 2, 75, 'VS', {
      fontFamily: 'Georgia, serif',
      fontSize: '18px',
      color: '#ffd700',
      fontStyle: 'bold',
    }).setOrigin(0.5);

    // Nick score
    this.nickLabel = this.add.text(GAME_WIDTH / 2 + 140, 63, 'Nick', {
      fontFamily: 'Georgia, serif',
      fontSize: '16px',
      color: '#e94560',
      fontStyle: 'bold',
    }).setOrigin(0.5);

    this.nickScoreText = this.add.text(GAME_WIDTH / 2 + 140, 85, '0', {
      fontFamily: 'Georgia, serif',
      fontSize: '22px',
      color: '#ffffff',
      fontStyle: 'bold',
    }).setOrigin(0.5);

    // Round indicator
    this.roundText = this.add.text(GAME_WIDTH / 2, 108, '', {
      fontFamily: 'Georgia, serif',
      fontSize: '14px',
      color: '#aaaaaa',
    }).setOrigin(0.5);

    // Commentary text (for Nick's moves — positioned near Nick's sprite)
    this.commentaryText = this.add.text(PLAYER_THROW_X, PLAYER_THROW_Y + 175, '', {
      fontFamily: 'Georgia, serif',
      fontSize: '14px',
      color: '#ffd700',
      fontStyle: 'italic',
      wordWrap: { width: 250 },
      align: 'center',
    }).setOrigin(0.5, 0);

    // Hide scoreboard during practice
    this.setScoreboardVisible(false);
  }

  createRoundTracker() {
    // Round-by-round score tracker shown below scoreboard
    this.roundTrackerGroup = this.add.group();
    this.roundTrackerObjects = [];
    this.roundTrackerVisible = false;
  }

  updateRoundTracker() {
    // Clear previous tracker objects
    this.roundTrackerObjects.forEach(obj => obj.destroy());
    this.roundTrackerObjects = [];

    if (!this.roundTrackerVisible) return;

    const startX = GAME_WIDTH / 2 - (TOTAL_ROUNDS * 80) / 2 + 40;
    const y = 140;

    for (let i = 0; i < TOTAL_ROUNDS; i++) {
      const x = startX + i * 80;
      const hasScore = i < this.roundScores.length;
      const roundData = hasScore ? this.roundScores[i] : null;

      // Round number label
      const label = this.add.text(x, y - 22, `R${i + 1}`, {
        fontFamily: 'Arial',
        fontSize: '10px',
        color: '#888888',
        fontStyle: 'bold',
      }).setOrigin(0.5);
      this.roundTrackerObjects.push(label);

      // Background box
      const bg = this.add.rectangle(x, y + 8, 70, 36, 0x000000, 0.4)
        .setStrokeStyle(1, hasScore ? 0x444444 : 0x333333);
      this.roundTrackerObjects.push(bg);

      if (hasScore) {
        const pScore = roundData.player;
        const nScore = roundData.nick;
        const playerWon = pScore > nScore;
        const nickWon = nScore > pScore;

        // Player score for this round
        const pText = this.add.text(x - 18, y + 8, pScore.toString(), {
          fontFamily: 'Georgia, serif',
          fontSize: '14px',
          color: '#4ecca3',
          fontStyle: 'bold',
        }).setOrigin(0.5);
        this.roundTrackerObjects.push(pText);

        // Dash
        const dash = this.add.text(x, y + 8, '-', {
          fontFamily: 'Georgia, serif',
          fontSize: '12px',
          color: '#666666',
        }).setOrigin(0.5);
        this.roundTrackerObjects.push(dash);

        // Nick score for this round
        const nText = this.add.text(x + 18, y + 8, nScore.toString(), {
          fontFamily: 'Georgia, serif',
          fontSize: '14px',
          color: '#e94560',
          fontStyle: 'bold',
        }).setOrigin(0.5);
        this.roundTrackerObjects.push(nText);

        // Winner circle
        if (playerWon) {
          const circle = this.add.graphics();
          circle.lineStyle(2, 0x4ecca3, 0.9);
          circle.strokeCircle(x - 18, y + 8, 14);
          this.roundTrackerObjects.push(circle);
        } else if (nickWon) {
          const circle = this.add.graphics();
          circle.lineStyle(2, 0xe94560, 0.9);
          circle.strokeCircle(x + 18, y + 8, 14);
          this.roundTrackerObjects.push(circle);
        } else {
          // Tie - circle both
          const circle = this.add.graphics();
          circle.lineStyle(2, 0xffd700, 0.6);
          circle.strokeCircle(x, y + 8, 30);
          this.roundTrackerObjects.push(circle);
        }
      } else {
        // Pending round
        const pending = this.add.text(x, y + 8, '--', {
          fontFamily: 'Georgia, serif',
          fontSize: '12px',
          color: '#444444',
        }).setOrigin(0.5);
        this.roundTrackerObjects.push(pending);
      }
    }
  }

  setScoreboardVisible(visible) {
    this.scoreboardBg.setVisible(visible);
    this.playerLabel.setVisible(visible);
    this.playerScoreText.setVisible(visible);
    this.vsText.setVisible(visible);
    this.nickLabel.setVisible(visible);
    this.nickScoreText.setVisible(visible);
    this.roundText.setVisible(visible);
  }

  /** Draw an axe shape using graphics primitives */
  createAxeSprite(x, y, color) {
    const container = this.add.container(x, y);

    // Handle (wooden)
    const handle = this.add.rectangle(0, 8, 6, 24, 0x8b6914)
      .setStrokeStyle(1, 0x6b4226);
    container.add(handle);

    // Blade (metal)
    const blade = this.add.graphics();
    blade.fillStyle(color, 1);
    // Left blade curve
    blade.beginPath();
    blade.moveTo(-2, -6);
    blade.lineTo(-14, -14);
    blade.lineTo(-14, 2);
    blade.lineTo(-2, 2);
    blade.closePath();
    blade.fillPath();
    // Right blade curve (mirror)
    blade.beginPath();
    blade.moveTo(2, -6);
    blade.lineTo(14, -14);
    blade.lineTo(14, 2);
    blade.lineTo(2, 2);
    blade.closePath();
    blade.fillPath();

    // Blade outline
    blade.lineStyle(1, 0xffffff, 0.5);
    blade.strokePath();

    container.add(blade);

    // Blade edge highlight
    const edge = this.add.graphics();
    edge.lineStyle(1, 0xffffff, 0.4);
    edge.lineBetween(-14, -14, -14, 2);
    edge.lineBetween(14, -14, 14, 2);
    container.add(edge);

    return container;
  }

  createPlayerUI() {
    // Power bar background
    this.add.rectangle(80, GAME_HEIGHT / 2, 30, 300, 0x333333)
      .setStrokeStyle(2, 0x666666);

    // Power bar fill (grows upward from bottom)
    this.powerBarMaxHeight = 296;
    this.powerBarBottom = GAME_HEIGHT / 2 + 148;
    this.powerBar = this.add.rectangle(80, this.powerBarBottom, 26, 0, 0x4ecca3);
    this.powerBar.setOrigin(0.5, 0);

    // Power label
    this.add.text(80, GAME_HEIGHT / 2 + 170, 'POWER', {
      fontFamily: 'Arial',
      fontSize: '11px',
      color: '#aaaaaa',
    }).setOrigin(0.5);

    // Spacebar hint (desktop only)
    this.spaceHint = this.add.text(80, GAME_HEIGHT / 2 - 170, 'SPACE', {
      fontFamily: 'Arial',
      fontSize: '11px',
      color: '#4ecca3',
    }).setOrigin(0.5);
    if (this.isMobile) this.spaceHint.setVisible(false);

    // Throw button (mobile only — desktop uses spacebar)
    this.throwBtn = this.add.rectangle(80, GAME_HEIGHT / 2 + 210, 70, 36, 0x4ecca3, 0.9)
      .setStrokeStyle(2, 0xffffff)
      .setInteractive({ useHandCursor: true });
    this.throwBtnText = this.add.text(80, GAME_HEIGHT / 2 + 210, 'THROW', {
      fontFamily: 'Arial',
      fontSize: '13px',
      color: '#1a1a2e',
      fontStyle: 'bold',
    }).setOrigin(0.5);

    // Hide throw button on desktop (spacebar is the primary control)
    if (!this.isMobile) {
      this.throwBtn.setVisible(false);
      this.throwBtnText.setVisible(false);
    }

    this.throwBtn.on('pointerover', () => this.throwBtn.setFillStyle(0x6eeec3));
    this.throwBtn.on('pointerout', () => this.throwBtn.setFillStyle(0x4ecca3));
    this.throwBtn.on('pointerdown', (pointer) => {
      pointer.event.stopPropagation();
      if (!this.canPlayerAct()) return;
      this.sfx.click();
      if (!this.isPowerCharging) {
        this.isPowerCharging = true;
        this.powerLevel = 0;
        this.powerDirection = 1;
        this.throwBtnText.setText('STOP');
        this.throwBtn.setFillStyle(0xe94560);
        this.sfx.startChargeTone();
      } else {
        this.isPowerCharging = false;
        this.throwBtnText.setText('THROW');
        this.throwBtn.setFillStyle(0x4ecca3);
        this.sfx.stopChargeTone();
        this.throwAxe(this.aimX, this.aimY, this.powerLevel);
      }
    });

    // Aim crosshair (follows mouse)
    this.aimCrosshair = this.add.graphics();
    this.aimCrosshair.lineStyle(2, 0x4ecca3, 0.8);
    this.aimCrosshair.strokeCircle(0, 0, 12);
    this.aimCrosshair.lineBetween(-18, 0, 18, 0);
    this.aimCrosshair.lineBetween(0, -18, 0, 18);
    this.aimCrosshair.setVisible(false);

    // Aim line (shows trajectory preview)
    this.aimLine = this.add.graphics();
    this.aimLine.setVisible(false);

    // Instruction text
    this.instructionText = this.add.text(GAME_WIDTH / 2, GAME_HEIGHT - 80, '', {
      fontFamily: 'Georgia, serif',
      fontSize: '18px',
      color: '#ffffff',
    }).setOrigin(0.5);

    // Player character — Mariel
    this.playerSprite = this.add.image(PLAYER_THROW_X, PLAYER_THROW_Y, 'char-mariel')
      .setDisplaySize(80, 120);
    this.add.text(PLAYER_THROW_X, PLAYER_THROW_Y - 72, 'Mariel', {
      fontFamily: 'Georgia, serif',
      fontSize: '14px',
      color: '#4ecca3',
      fontStyle: 'bold',
    }).setOrigin(0.5);

    // Nick character
    this.nickSprite = this.add.image(PLAYER_THROW_X, PLAYER_THROW_Y + 100, 'char-nick')
      .setDisplaySize(80, 120);
    this.nickSprite.setVisible(false);
    this.nickSpriteLabel = this.add.text(PLAYER_THROW_X, PLAYER_THROW_Y + 28, 'Nick', {
      fontFamily: 'Georgia, serif',
      fontSize: '14px',
      color: '#e94560',
      fontStyle: 'bold',
    }).setOrigin(0.5).setVisible(false);

    // "Start Game" button (shown during practice)
    this.startGameBtn = this.add.rectangle(GAME_WIDTH / 2, 140, 200, 45, 0x4ecca3, 0.9)
      .setStrokeStyle(2, 0xffffff)
      .setInteractive({ useHandCursor: true });
    this.startGameBtnText = this.add.text(GAME_WIDTH / 2, 140, 'Start Game!', {
      fontFamily: 'Georgia, serif',
      fontSize: '18px',
      color: '#1a1a2e',
      fontStyle: 'bold',
    }).setOrigin(0.5);
    this.startGameBtn.on('pointerover', () => this.startGameBtn.setFillStyle(0x6eeec3));
    this.startGameBtn.on('pointerout', () => this.startGameBtn.setFillStyle(0x4ecca3));
    this.startGameBtn.on('pointerdown', () => {
      this.sfx.click();
      this.showDifficultySelect();
    });
    this.startGameBtn.setVisible(false);
    this.startGameBtnText.setVisible(false);

    // Difficulty selection UI (created hidden)
    this.difficultyUI = [];
    this.createDifficultyUI();

    // Input handling — different schemes for desktop vs mobile
    if (this.isMobile) {
      // MOBILE: tap on the target area to place the crosshair
      this.input.on('pointerdown', (pointer) => {
        if (!this.canPlayerAct()) return;
        // Only register taps in the target region (not on the power bar / buttons)
        if (pointer.x > 200) {
          this.aimX = Phaser.Math.Clamp(pointer.x, TARGET_X - BOARD_RADIUS * 1.5, TARGET_X + BOARD_RADIUS * 1.5);
          this.aimY = Phaser.Math.Clamp(pointer.y, TARGET_Y - BOARD_RADIUS * 1.5, TARGET_Y + BOARD_RADIUS * 1.5);
          this.aimCrosshair.setPosition(this.aimX, this.aimY);
          this.drawAimLine();
        }
      });
    } else {
      // DESKTOP: mouse continuously moves the crosshair
      this.input.on('pointermove', (pointer) => {
        if (this.canPlayerAct()) {
          this.aimX = Phaser.Math.Clamp(pointer.x, TARGET_X - BOARD_RADIUS * 1.5, TARGET_X + BOARD_RADIUS * 1.5);
          this.aimY = Phaser.Math.Clamp(pointer.y, TARGET_Y - BOARD_RADIUS * 1.5, TARGET_Y + BOARD_RADIUS * 1.5);
          this.aimCrosshair.setPosition(this.aimX, this.aimY);
          this.drawAimLine();
        }
      });
    }

    // Spacebar for power
    this.spaceKey = this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.SPACE);

    this.spaceKey.on('down', () => {
      if (!this.canPlayerAct()) return;
      if (!this.isPowerCharging) {
        this.isPowerCharging = true;
        this.powerLevel = 0;
        this.powerDirection = 1;
        this.throwBtnText.setText('STOP');
        this.throwBtn.setFillStyle(0xe94560);
        this.sfx.startChargeTone();
      } else {
        this.isPowerCharging = false;
        this.throwBtnText.setText('THROW');
        this.throwBtn.setFillStyle(0x4ecca3);
        this.sfx.stopChargeTone();
        this.throwAxe(this.aimX, this.aimY, this.powerLevel);
      }
    });
  }

  createDifficultyUI() {
    const centerX = GAME_WIDTH / 2;
    const startY = 130;

    const title = this.add.text(centerX, startY, 'Choose Difficulty', {
      fontFamily: 'Georgia, serif',
      fontSize: '22px',
      color: '#ffd700',
      fontStyle: 'bold',
    }).setOrigin(0.5).setVisible(false);
    this.difficultyUI.push(title);

    const difficulties = ['easy', 'medium', 'hard'];
    const btnColors = [0x4ecca3, 0xffd700, 0xe94560];
    const textColors = ['#1a1a2e', '#1a1a2e', '#ffffff'];

    difficulties.forEach((key, i) => {
      const btnY = startY + 45 + i * 55;
      const diff = DIFFICULTY[key];

      const btn = this.add.rectangle(centerX, btnY, 240, 42, btnColors[i], 0.9)
        .setStrokeStyle(2, 0xffffff)
        .setInteractive({ useHandCursor: true })
        .setVisible(false);

      const label = this.add.text(centerX, btnY - 3, diff.label, {
        fontFamily: 'Georgia, serif',
        fontSize: '16px',
        color: textColors[i],
        fontStyle: 'bold',
      }).setOrigin(0.5).setVisible(false);

      const desc = this.add.text(centerX, btnY + 14, diff.description, {
        fontFamily: 'Georgia, serif',
        fontSize: '10px',
        color: textColors[i],
        fontStyle: 'italic',
      }).setOrigin(0.5).setVisible(false);

      btn.on('pointerover', () => btn.setAlpha(0.8));
      btn.on('pointerout', () => btn.setAlpha(1));
      btn.on('pointerdown', () => {
        this.sfx.click();
        this.difficulty = key;
        this.hideDifficultySelect();
        this.startActualGame();
      });

      this.difficultyUI.push(btn, label, desc);
    });
  }

  showDifficultySelect() {
    this.startGameBtn.setVisible(false);
    this.startGameBtnText.setVisible(false);
    this.difficultyUI.forEach(obj => obj.setVisible(true));
  }

  hideDifficultySelect() {
    this.difficultyUI.forEach(obj => obj.setVisible(false));
  }

  canPlayerAct() {
    return (this.isPlayerTurn || this.gameMode === MODE_PRACTICE) && !this.isThrowInProgress;
  }

  drawAimLine() {
    if (!this.canPlayerAct() && !this.isPowerCharging) return;

    this.aimLine.clear();
    this.aimLine.setVisible(true);

    const startX = PLAYER_THROW_X + 50;
    const startY = PLAYER_THROW_Y;

    const powerFraction = this.isPowerCharging
      ? Math.max(this.powerLevel / 100, 0.1)
      : 1.0;

    const endX = startX + (this.aimX - startX) * powerFraction;
    const endY = startY + (this.aimY - startY) * powerFraction;

    let dotColor, dotAlpha;
    if (!this.isPowerCharging) {
      dotColor = 0x4ecca3;
      dotAlpha = 0.3;
    } else if (this.powerLevel < 40) {
      dotColor = 0x4ecca3;
      dotAlpha = 0.7;
    } else if (this.powerLevel < 75) {
      dotColor = 0xffd700;
      dotAlpha = 0.7;
    } else {
      dotColor = 0xe94560;
      dotAlpha = 0.7;
    }

    const arcHeight = this.isPowerCharging ? (80 + this.powerLevel * 1.2) : 150;
    const steps = 14;

    this.aimLine.fillStyle(dotColor, dotAlpha);
    for (let i = 0; i <= steps; i++) {
      const t = i / steps;
      const x = startX + (endX - startX) * t;
      const y = startY + (endY - startY) * t - arcHeight * 4 * t * (1 - t);
      const dotSize = (i === steps) ? 5 : 2;
      this.aimLine.fillCircle(x, y, dotSize);
    }

    if (this.isPowerCharging) {
      this.aimLine.lineStyle(2, dotColor, 0.9);
      this.aimLine.lineBetween(endX - 6, endY - 6, endX + 6, endY + 6);
      this.aimLine.lineBetween(endX - 6, endY + 6, endX + 6, endY - 6);
    }
  }

  update() {
    if (this.isPowerCharging) {
      this.powerLevel += 1.5 * this.powerDirection;
      if (this.powerLevel >= 100) {
        this.powerLevel = 100;
        this.powerDirection = -1;
      } else if (this.powerLevel <= 0) {
        this.powerLevel = 0;
        this.powerDirection = 1;
      }
      const barHeight = (this.powerLevel / 100) * this.powerBarMaxHeight;
      this.powerBar.height = barHeight;
      this.powerBar.y = this.powerBarBottom - barHeight;

      if (this.powerLevel < 40) {
        this.powerBar.setFillStyle(0x4ecca3);
      } else if (this.powerLevel < 75) {
        this.powerBar.setFillStyle(0xffd700);
      } else {
        this.powerBar.setFillStyle(0xe94560);
      }

      this.sfx.updateChargeTone(this.powerLevel);
      this.drawAimLine();
    }
  }

  // ─── Practice Mode ────────────────────────────────────────

  startPracticeMode() {
    this.gameMode = MODE_PRACTICE;
    this.isPlayerTurn = true;
    this.isThrowInProgress = false;
    this.practiceThrows = 0;
    this.minPracticeThrows = 2;

    this.setScoreboardVisible(false);
    this.roundText.setVisible(true);
    this.roundText.setText('PRACTICE MODE');
    this.roundText.setY(75);

    this.instructionText.setText(
      this.isMobile
        ? 'Tap target to aim \u2022 THROW button to charge & release \u2022 Practice first!'
        : 'Aim with mouse \u2022 SPACE to charge & release \u2022 Practice first!'
    );
    this.aimCrosshair.setVisible(true);
    this.commentaryText.setText('');

    // Don't show Start Game until minimum practice throws
    this.startGameBtn.setVisible(false);
    this.startGameBtnText.setVisible(false);
  }

  startActualGame() {
    this.gameMode = MODE_GAME;
    this.playerScore = 0;
    this.nickScore = 0;
    this.currentRound = 0;
    this.isPlayerTurn = true;
    this.roundScores = [];
    this.currentRoundPlayerScore = 0;
    this.currentRoundNickScore = 0;

    // Clear practice axes from the board
    this.clearStuckAxes();

    // Hide practice UI
    this.startGameBtn.setVisible(false);
    this.startGameBtnText.setVisible(false);
    this.hideDifficultySelect();

    // Show scoreboard and round tracker
    this.setScoreboardVisible(true);
    this.roundText.setY(108);
    this.playerScoreText.setText('0');
    this.nickScoreText.setText('0');

    this.roundTrackerVisible = true;
    this.updateRoundTracker();

    this.time.delayedCall(300, () => this.startRound());
  }

  // ─── Game Mode ────────────────────────────────────────────

  clearStuckAxes() {
    this.stuckAxes.forEach(axe => {
      if (axe && axe.active) {
        this.tweens.add({
          targets: axe,
          alpha: 0,
          duration: 300,
          onComplete: () => axe.destroy(),
        });
      }
    });
    this.stuckAxes = [];
  }

  startRound() {
    this.currentRound++;
    this.roundText.setText(`Round ${this.currentRound} of ${TOTAL_ROUNDS}`);

    if (this.currentRound > TOTAL_ROUNDS) {
      this.endGame();
      return;
    }

    // Clear axes from the previous round
    this.clearStuckAxes();

    // Reset per-round scores
    this.currentRoundPlayerScore = 0;
    this.currentRoundNickScore = 0;

    if (this.isPlayerTurn) {
      this.startPlayerTurn();
    } else {
      this.startNickTurn();
    }
  }

  startPlayerTurn() {
    this.isPlayerTurn = true;
    this.isThrowInProgress = false;
    this.aimCrosshair.setVisible(true);
    this.instructionText.setText(
      this.isMobile
        ? 'Tap target to aim \u2022 THROW button to charge & release!'
        : 'Aim with mouse \u2022 SPACE to charge & release!'
    );
    this.commentaryText.setText('');

    this.playerSprite.setVisible(true);
    this.nickSprite.setVisible(false);
    this.nickSpriteLabel.setVisible(false);

    this.drawAimLine();
  }

  startNickTurn() {
    this.isPlayerTurn = false;
    this.isThrowInProgress = true;
    this.aimCrosshair.setVisible(false);
    this.aimLine.setVisible(false);
    this.instructionText.setText("Nick's turn...");

    this.playerSprite.setVisible(false);
    this.nickSprite.setVisible(true);
    this.nickSpriteLabel.setVisible(true);

    const commentary = NICK_COMMENTARY[this.currentRound - 1] ||
      NICK_COMMENTARY[Phaser.Math.Between(0, NICK_COMMENTARY.length - 1)];
    this.commentaryText.setText(commentary);

    // Nick windup animation
    this.tweens.add({
      targets: this.nickSprite,
      scaleX: 1.2,
      scaleY: 0.9,
      duration: 300,
      yoyo: true,
      ease: 'Sine.easeInOut',
      onComplete: () => {
        // Arm swing
        this.tweens.add({
          targets: this.nickSprite,
          angle: -15,
          duration: 200,
          yoyo: true,
          ease: 'Power2',
          onComplete: () => {
            this.nickSprite.setAngle(0);
          },
        });
      },
    });

    this.time.delayedCall(1500, () => {
      const diff = DIFFICULTY[this.difficulty];

      // Check for total whiff
      if (Math.random() < diff.missChance) {
        const missX = TARGET_X + Phaser.Math.Between(-200, 200);
        const missY = TARGET_Y + Phaser.Math.Between(-200, 200);
        const missTargetX = missX + (Math.abs(missX - TARGET_X) < BOARD_RADIUS ? 150 * Math.sign(missX - TARGET_X || 1) : 0);
        const missTargetY = missY + (Math.abs(missY - TARGET_Y) < BOARD_RADIUS ? 150 * Math.sign(missY - TARGET_Y || 1) : 0);
        this.throwAxe(missTargetX, missTargetY, Phaser.Math.Between(40, 70), true);
        return;
      }

      // Check if this throw hits the board at all
      if (Math.random() > diff.hitChance) {
        const angle = Math.random() * Math.PI * 2;
        const dist = BOARD_RADIUS + Phaser.Math.Between(-20, 30);
        const offsetX = Math.cos(angle) * dist;
        const offsetY = Math.sin(angle) * dist;
        this.throwAxe(TARGET_X + offsetX, TARGET_Y + offsetY, Phaser.Math.Between(diff.powerMin, diff.powerMax), true);
        return;
      }

      // Normal throw with accuracy based on difficulty
      const offsetX = Phaser.Math.Between(-diff.accuracyRange, diff.accuracyRange);
      const offsetY = Phaser.Math.Between(-diff.accuracyRange, diff.accuracyRange);
      const power = Phaser.Math.Between(diff.powerMin, diff.powerMax);
      this.throwAxe(TARGET_X + offsetX, TARGET_Y + offsetY, power, true);
    });
  }

  throwAxe(targetX, targetY, power, isNick = false) {
    this.isThrowInProgress = true;
    this.aimCrosshair.setVisible(false);
    this.aimLine.setVisible(false);
    this.isPowerCharging = false;
    this.sfx.stopChargeTone();
    this.powerBar.height = 0;
    this.powerBar.y = this.powerBarBottom;

    const startX = PLAYER_THROW_X + 50;
    const startY = isNick ? PLAYER_THROW_Y + 100 : PLAYER_THROW_Y;
    const axeColor = isNick ? 0xe94560 : 0x4ecca3;

    // Create axe sprite instead of plain rectangle
    const axe = this.createAxeSprite(startX, startY, axeColor);

    // Play whoosh sound
    this.sfx.whoosh();

    const powerFraction = Math.max(power / 100, 0.1);

    let landX, landY;

    if (isNick) {
      landX = startX + (targetX - startX) * powerFraction;
      landY = startY + (targetY - startY) * powerFraction;
      const diff = DIFFICULTY[this.difficulty];
      const spread = Math.floor(diff.accuracyRange * 0.3);
      landX += Phaser.Math.Between(-spread, spread);
      landY += Phaser.Math.Between(-spread, spread);
    } else {
      landX = startX + (targetX - startX) * powerFraction;
      landY = startY + (targetY - startY) * powerFraction;
      const spread = power > 90 ? 8 : (power < 20 ? 12 : 4);
      landX += Phaser.Math.Between(-spread, spread);
      landY += Phaser.Math.Between(-spread, spread);
    }

    // Arc trajectory for both players
    const arcHeight = 80 + power * 1.2;
    const duration = isNick ? 800 : 350 + (1 - powerFraction) * 200;

    const midX = (startX + landX) / 2;
    const midY = Math.min(startY, landY) - arcHeight;

    if (isNick) {
      // Nick: arc with triple spin
      this.tweens.add({
        targets: axe,
        x: midX,
        y: midY,
        duration: duration * 0.5,
        ease: 'Sine.easeOut',
        onUpdate: () => {
          // Continuous rotation on the container
          axe.angle += 15;
        },
        onComplete: () => {
          this.tweens.add({
            targets: axe,
            x: landX,
            y: landY,
            duration: duration * 0.5,
            ease: 'Sine.easeIn',
            onUpdate: () => {
              axe.angle += 15;
            },
            onComplete: () => this.onAxeLanded(axe, landX, landY, isNick),
          });
        },
      });
    } else {
      // Player: two-part arc
      this.tweens.add({
        targets: axe,
        x: midX,
        y: midY,
        duration: duration * 0.5,
        ease: 'Sine.easeOut',
        onUpdate: () => {
          axe.angle += 10;
        },
        onComplete: () => {
          this.tweens.add({
            targets: axe,
            x: landX,
            y: landY,
            duration: duration * 0.5,
            ease: 'Sine.easeIn',
            onUpdate: () => {
              axe.angle += 10;
            },
            onComplete: () => this.onAxeLanded(axe, landX, landY, isNick),
          });
        },
      });
    }
  }

  onAxeLanded(axe, x, y, isNick) {
    const dx = x - TARGET_X;
    const dy = y - TARGET_Y;
    const distance = Math.sqrt(dx * dx + dy * dy);

    let points = 0;
    let scoreLabel = '';

    if (distance <= BULLSEYE_RADIUS) {
      points = 50;
      scoreLabel = 'BULLSEYE!';
    } else if (distance <= INNER_RADIUS) {
      points = 30;
      scoreLabel = 'Great!';
    } else if (distance <= OUTER_RADIUS) {
      points = 15;
      scoreLabel = 'Good';
    } else if (distance <= BOARD_RADIUS) {
      points = 5;
      scoreLabel = 'On board';
    } else {
      points = 0;
      scoreLabel = 'Miss!';
    }

    // Sound effects based on result
    if (distance <= BOARD_RADIUS) {
      this.sfx.thud();
      this.emitWoodChips(x, y, points >= 30 ? 12 : 6);

      if (points === 50) {
        // BULLSEYE — full juice: air horn, sparks, screen shake
        this.time.delayedCall(100, () => {
          this.sfx.airHorn();
          this.emitSparks(x, y, 30);
          this.cameras.main.shake(300, 0.012);
        });
        // Second wave of sparks for extra impact
        this.time.delayedCall(250, () => {
          this.emitSparks(x, y, 20);
        });
      } else if (points >= 30) {
        this.time.delayedCall(100, () => this.sfx.cheer());
      }
    } else {
      // Miss
      this.sfx.sadTrombone();
    }

    // Wobble animation on impact (axe vibrates when it sticks)
    if (distance <= BOARD_RADIUS) {
      this.tweens.add({
        targets: axe,
        angle: axe.angle + Phaser.Math.Between(-8, 8),
        duration: 50,
        yoyo: true,
        repeat: 3,
        ease: 'Sine.easeInOut',
      });

      // Axe stays stuck in the board
      this.stuckAxes.push(axe);
    } else {
      // Missed the board — axe falls off screen
      this.tweens.add({
        targets: axe,
        y: y + 200,
        alpha: 0,
        angle: axe.angle + Phaser.Math.Between(-90, 90),
        duration: 600,
        ease: 'Power2',
        onComplete: () => axe.destroy(),
      });
    }

    // In practice mode, just show the score popup
    if (this.gameMode === MODE_PRACTICE) {
      this.practiceThrows++;
      this.showScorePopup(x, y, scoreLabel, points, false);

      // Show "Start Game" once minimum practice throws are done
      if (this.practiceThrows >= this.minPracticeThrows && !this.startGameBtn.visible) {
        this.startGameBtn.setVisible(true);
        this.startGameBtnText.setVisible(true);
        this.startGameBtn.setAlpha(0);
        this.startGameBtnText.setAlpha(0);
        this.tweens.add({
          targets: [this.startGameBtn, this.startGameBtnText],
          alpha: 1,
          duration: 400,
        });
      }

      this.time.delayedCall(1000, () => {
        this.isThrowInProgress = false;
        this.aimCrosshair.setVisible(true);
        this.drawAimLine();
      });
      return;
    }

    // Update scores
    if (isNick) {
      this.nickScore += points;
      this.nickScoreText.setText(this.nickScore.toString());
      this.currentRoundNickScore = points;

      if (points >= 30) {
        const celebration = NICK_CELEBRATIONS[this.currentRound - 1] ||
          NICK_CELEBRATIONS[Phaser.Math.Between(0, NICK_CELEBRATIONS.length - 1)];
        this.commentaryText.setText(celebration);
      } else if (points === 0) {
        const reaction = NICK_MISS_REACTIONS[Phaser.Math.Between(0, NICK_MISS_REACTIONS.length - 1)];
        this.commentaryText.setText(reaction);
      }
    } else {
      this.playerScore += points;
      this.playerScoreText.setText(this.playerScore.toString());
      this.currentRoundPlayerScore = points;

      // Nick reacts to Mariel's throw
      let reaction;
      if (points === 50) {
        reaction = NICK_REACT_PLAYER_BULLSEYE[Phaser.Math.Between(0, NICK_REACT_PLAYER_BULLSEYE.length - 1)];
      } else if (points >= 30) {
        reaction = NICK_REACT_PLAYER_GOOD[Phaser.Math.Between(0, NICK_REACT_PLAYER_GOOD.length - 1)];
      } else if (points === 0) {
        reaction = NICK_REACT_PLAYER_MISS[Phaser.Math.Between(0, NICK_REACT_PLAYER_MISS.length - 1)];
      }
      if (reaction) {
        this.commentaryText.setText(reaction);
      }
    }

    this.showScorePopup(x, y, scoreLabel, points, isNick);

    // Next turn
    this.time.delayedCall(1500, () => {
      if (this.isPlayerTurn) {
        // Switch to Nick's turn
        this.isPlayerTurn = false;
        this.startNickTurn();
      } else {
        // Round complete — record scores and update tracker
        this.roundScores.push({
          player: this.currentRoundPlayerScore,
          nick: this.currentRoundNickScore,
        });
        this.updateRoundTracker();

        // Switch to player turn, advance round
        this.isPlayerTurn = true;
        this.startRound();
      }
    });
  }

  showScorePopup(x, y, scoreLabel, points, isNick) {
    const color = isNick ? '#e94560' : '#4ecca3';
    const popup = this.add.text(x, y - 30, `${scoreLabel}\n+${points}`, {
      fontFamily: 'Georgia, serif',
      fontSize: points >= 30 ? '22px' : '16px',
      color: color,
      fontStyle: 'bold',
      align: 'center',
    }).setOrigin(0.5);

    this.tweens.add({
      targets: popup,
      y: y - 80,
      alpha: 0,
      duration: 1500,
      onComplete: () => popup.destroy(),
    });
  }

  endGame() {
    this.aimCrosshair.setVisible(false);
    this.aimLine.setVisible(false);
    this.instructionText.setText('');
    this.commentaryText.setText('');

    const nickWins = this.nickScore > this.playerScore;
    const isTie = this.nickScore === this.playerScore;

    // Play victory or sad sound
    this.time.delayedCall(300, () => {
      if (!nickWins && !isTie) {
        this.sfx.victory();
      } else if (nickWins) {
        this.sfx.sadTrombone();
      }
    });

    const resultText = this.add.text(GAME_WIDTH / 2, GAME_HEIGHT / 2 - 20, '', {
      fontFamily: 'Georgia, serif',
      fontSize: '32px',
      color: '#ffd700',
      fontStyle: 'bold',
      align: 'center',
    }).setOrigin(0.5).setAlpha(0);

    this.time.delayedCall(500, () => {
      let resultMessage;
      if (isTie) {
        resultMessage = 'FINAL SCORE\n\n' +
          `Mariel: ${this.playerScore}\n` +
          `Nick: ${this.nickScore}\n\n` +
          "It's a tie! A rift in the timeline!";
      } else if (nickWins) {
        resultMessage = 'FINAL SCORE\n\n' +
          `Mariel: ${this.playerScore}\n` +
          `Nick: ${this.nickScore}\n\n` +
          'Nick wins, just like how\nit actually happened!';
      } else {
        resultMessage = 'FINAL SCORE\n\n' +
          `Mariel: ${this.playerScore}\n` +
          `Nick: ${this.nickScore}\n\n` +
          'Mariel wins!\nA break in the timeline...';
      }

      resultText.setText(resultMessage);
      this.tweens.add({
        targets: resultText,
        alpha: 1,
        duration: 800,
      });

      // Show replay button
      this.showReplayButton();
    });

    // Show post-game dialogue after delay
    this.time.delayedCall(4000, () => {
      resultText.destroy();
      this.hideReplayButton();

      let dialogueLines;
      if (isTie) {
        dialogueLines = [
          { speaker: 'nick', text: "A tie?! That's not how I remember it..." },
          { speaker: 'narrator', text: 'The timeline holds... for now.' },
          { speaker: 'narrator', text: 'But the real win was the date itself.' },
        ];
      } else if (nickWins) {
        dialogueLines = [
          { speaker: 'nick', text: 'Was there ever any doubt? \uD83D\uDE0E' },
          { speaker: 'narrator', text: "Some things never change..." },
          { speaker: 'narrator', text: 'But the real win was the date itself.' },
        ];
      } else {
        dialogueLines = [
          { speaker: 'nick', text: 'Wait... that\'s not how this goes!' },
          { speaker: 'narrator', text: 'The timeline fractures. Mariel has rewritten history.' },
          { speaker: 'narrator', text: 'But some things remain the same... like the date itself.' },
        ];
      }

      this.dialogue = new DialogueSystem(this, this.sfx);
      this.dialogue.createUI();
      this.dialogue.show(dialogueLines, () => {
        this.sfx.stopMusic();
        this.completeStage();
      });
    });
  }

  showReplayButton() {
    this.replayBtn = this.add.rectangle(GAME_WIDTH / 2, GAME_HEIGHT / 2 + 160, 180, 44, 0x4ecca3, 0.9)
      .setStrokeStyle(2, 0xffffff)
      .setInteractive({ useHandCursor: true })
      .setAlpha(0);

    this.replayBtnText = this.add.text(GAME_WIDTH / 2, GAME_HEIGHT / 2 + 160, 'Play Again', {
      fontFamily: 'Georgia, serif',
      fontSize: '18px',
      color: '#1a1a2e',
      fontStyle: 'bold',
    }).setOrigin(0.5).setAlpha(0);

    this.replayBtn.on('pointerover', () => this.replayBtn.setFillStyle(0x6eeec3));
    this.replayBtn.on('pointerout', () => this.replayBtn.setFillStyle(0x4ecca3));
    this.replayBtn.on('pointerdown', () => {
      this.sfx.click();
      this.restartGame();
    });

    // Fade in
    this.tweens.add({
      targets: [this.replayBtn, this.replayBtnText],
      alpha: 1,
      duration: 500,
      delay: 300,
    });
  }

  hideReplayButton() {
    if (this.replayBtn) {
      this.replayBtn.destroy();
      this.replayBtn = null;
    }
    if (this.replayBtnText) {
      this.replayBtnText.destroy();
      this.replayBtnText = null;
    }
  }

  restartGame() {
    // Clean up and restart the entire scene
    this.sfx.stopMusic(0);
    this.hideReplayButton();
    this.roundTrackerVisible = false;
    this.roundTrackerObjects.forEach(obj => obj.destroy());
    this.roundTrackerObjects = [];
    this.scene.restart();
  }
}
