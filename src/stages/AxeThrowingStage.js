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
    accuracyRange: 42,
    hitChance: 0.68,
    powerMin: 60,
    powerMax: 90,
    missChance: 0.15,
  },
  medium: {
    label: 'Medium',
    description: 'Nick is warmed up',
    accuracyRange: 30,
    hitChance: 0.75,
    powerMin: 70,
    powerMax: 95,
    missChance: 0.12,
  },
  hard: {
    label: 'Hard',
    description: 'Nick is locked in',
    accuracyRange: 12,
    hitChance: 0.92,
    powerMin: 90,
    powerMax: 100,
    missChance: 0.03,
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

// Game modes
const MODE_PRACTICE = 'practice';
const MODE_GAME = 'game';

export class AxeThrowingStage extends BaseStage {
  constructor() {
    super('AxeThrowingStage');
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
    // Venue background
    this.add.rectangle(GAME_WIDTH / 2, GAME_HEIGHT / 2, GAME_WIDTH, GAME_HEIGHT, 0x2d1b0e);

    // Wooden floor
    this.add.rectangle(GAME_WIDTH / 2, GAME_HEIGHT - 60, GAME_WIDTH, 120, 0x5c3a1e);

    // Venue name banner
    this.add.text(GAME_WIDTH / 2, 25, '\uD83E\uDE93 AXE HOUSE \uD83E\uDE93', {
      fontFamily: 'Georgia, serif',
      fontSize: '20px',
      color: '#ffd700',
      fontStyle: 'bold',
    }).setOrigin(0.5);

    // Wooden wall planks (decorative lines)
    const wallGraphics = this.add.graphics();
    wallGraphics.lineStyle(1, 0x3d2510, 0.3);
    for (let y = 60; y < GAME_HEIGHT - 120; y += 40) {
      wallGraphics.lineBetween(0, y, GAME_WIDTH, y);
    }
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

    // Commentary text (for Nick's ridiculous moves)
    this.commentaryText = this.add.text(GAME_WIDTH / 2, GAME_HEIGHT - 30, '', {
      fontFamily: 'Georgia, serif',
      fontSize: '16px',
      color: '#ffd700',
      fontStyle: 'italic',
    }).setOrigin(0.5);

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

    // Spacebar hint
    this.spaceHint = this.add.text(80, GAME_HEIGHT / 2 - 170, 'SPACE', {
      fontFamily: 'Arial',
      fontSize: '11px',
      color: '#4ecca3',
    }).setOrigin(0.5);

    // Mobile throw button (below power bar)
    this.throwBtn = this.add.rectangle(80, GAME_HEIGHT / 2 + 210, 70, 36, 0x4ecca3, 0.9)
      .setStrokeStyle(2, 0xffffff)
      .setInteractive({ useHandCursor: true });
    this.throwBtnText = this.add.text(80, GAME_HEIGHT / 2 + 210, 'THROW', {
      fontFamily: 'Arial',
      fontSize: '13px',
      color: '#1a1a2e',
      fontStyle: 'bold',
    }).setOrigin(0.5);

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

    // Player character placeholder
    this.playerSprite = this.add.rectangle(PLAYER_THROW_X, PLAYER_THROW_Y, 40, 70, 0x4ecca3)
      .setStrokeStyle(2, 0xffffff);
    this.add.text(PLAYER_THROW_X, PLAYER_THROW_Y - 50, 'Mariel', {
      fontFamily: 'Georgia, serif',
      fontSize: '12px',
      color: '#4ecca3',
    }).setOrigin(0.5);

    // Nick character placeholder
    this.nickSprite = this.add.rectangle(PLAYER_THROW_X, PLAYER_THROW_Y + 100, 40, 70, 0xe94560)
      .setStrokeStyle(2, 0xffffff);
    this.nickSprite.setVisible(false);
    this.nickSpriteLabel = this.add.text(PLAYER_THROW_X, PLAYER_THROW_Y + 40, 'Nick', {
      fontFamily: 'Georgia, serif',
      fontSize: '12px',
      color: '#e94560',
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

    // Input handling - mouse moves the crosshair/aim
    this.input.on('pointermove', (pointer) => {
      if (this.canPlayerAct()) {
        this.aimX = Phaser.Math.Clamp(pointer.x, TARGET_X - BOARD_RADIUS * 1.5, TARGET_X + BOARD_RADIUS * 1.5);
        this.aimY = Phaser.Math.Clamp(pointer.y, TARGET_Y - BOARD_RADIUS * 1.5, TARGET_Y + BOARD_RADIUS * 1.5);
        this.aimCrosshair.setPosition(this.aimX, this.aimY);
        this.drawAimLine();
      }
    });

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

    this.setScoreboardVisible(false);
    this.roundText.setVisible(true);
    this.roundText.setText('PRACTICE MODE');
    this.roundText.setY(75);

    this.instructionText.setText('Aim \u2022 SPACE or THROW button to charge & release \u2022 Practice first!');
    this.aimCrosshair.setVisible(true);
    this.commentaryText.setText('');

    this.time.delayedCall(500, () => {
      this.startGameBtn.setVisible(true);
      this.startGameBtnText.setVisible(true);
    });
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

  startRound() {
    this.currentRound++;
    this.roundText.setText(`Round ${this.currentRound} of ${TOTAL_ROUNDS}`);

    if (this.currentRound > TOTAL_ROUNDS) {
      this.endGame();
      return;
    }

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
    this.instructionText.setText('Aim \u2022 SPACE or THROW button to charge & release!');
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
        // Bullseye gets sparks and fanfare
        this.time.delayedCall(100, () => {
          this.sfx.bullseye();
          this.emitSparks(x, y, 16);
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
    }

    // In practice mode, just show the score popup
    if (this.gameMode === MODE_PRACTICE) {
      this.practiceThrows++;
      this.showScorePopup(x, y, scoreLabel, points, false);
      this.time.delayedCall(800, () => axe.destroy());
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
    }

    this.showScorePopup(x, y, scoreLabel, points, isNick);

    this.time.delayedCall(800, () => {
      axe.destroy();
    });

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
