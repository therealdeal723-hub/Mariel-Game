import Phaser from 'phaser';
import { GAME_WIDTH, GAME_HEIGHT, COLORS } from '../config.js';
import { BaseStage } from './BaseStage.js';
import { DialogueSystem } from '../systems/DialogueSystem.js';

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
    this.powerDirection = 1; // 1 = going up, -1 = going down
    this.isPowerCharging = false;
    this.gameMode = MODE_PRACTICE;
    this.practiceThrows = 0;

    // Track where the mouse is aiming
    this.aimX = TARGET_X;
    this.aimY = TARGET_Y;

    this.createBackground();
    this.createTarget();
    this.createScoreboard();
    this.createPlayerUI();

    // Back button to return to stage select
    this.createBackButton();

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

  setScoreboardVisible(visible) {
    this.scoreboardBg.setVisible(visible);
    this.playerLabel.setVisible(visible);
    this.playerScoreText.setVisible(visible);
    this.vsText.setVisible(visible);
    this.nickLabel.setVisible(visible);
    this.nickScoreText.setVisible(visible);
    this.roundText.setVisible(visible);
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
      // Stop event from also triggering aimLine pointermove
      pointer.event.stopPropagation();
      if (!this.canPlayerAct()) return;
      if (!this.isPowerCharging) {
        this.isPowerCharging = true;
        this.powerLevel = 0;
        this.powerDirection = 1;
        this.throwBtnText.setText('STOP');
        this.throwBtn.setFillStyle(0xe94560);
      } else {
        this.isPowerCharging = false;
        this.throwBtnText.setText('THROW');
        this.throwBtn.setFillStyle(0x4ecca3);
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
    this.startGameBtn.on('pointerdown', () => this.startActualGame());
    this.startGameBtn.setVisible(false);
    this.startGameBtnText.setVisible(false);

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
        // Start charging
        this.isPowerCharging = true;
        this.powerLevel = 0;
        this.powerDirection = 1;
        this.throwBtnText.setText('STOP');
        this.throwBtn.setFillStyle(0xe94560);
      } else {
        // Stop charging and throw
        this.isPowerCharging = false;
        this.throwBtnText.setText('THROW');
        this.throwBtn.setFillStyle(0x4ecca3);
        this.throwAxe(this.aimX, this.aimY, this.powerLevel);
      }
    });
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

    // When charging, show where the axe will actually land at current power
    const powerFraction = this.isPowerCharging
      ? Math.max(this.powerLevel / 100, 0.1)
      : 1.0;

    const endX = startX + (this.aimX - startX) * powerFraction;
    const endY = startY + (this.aimY - startY) * powerFraction;

    // Choose color based on power state
    let dotColor, dotAlpha;
    if (!this.isPowerCharging) {
      // Not charging yet: show full-power preview in teal
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

    // Draw dots along a parabolic arc to the landing point
    const arcHeight = this.isPowerCharging ? (80 + this.powerLevel * 1.2) : 150;
    const steps = 14;

    this.aimLine.fillStyle(dotColor, dotAlpha);
    for (let i = 0; i <= steps; i++) {
      const t = i / steps;
      const x = startX + (endX - startX) * t;
      const y = startY + (endY - startY) * t - arcHeight * 4 * t * (1 - t);
      const dotSize = (i === steps) ? 5 : 2; // Bigger dot at landing point
      this.aimLine.fillCircle(x, y, dotSize);
    }

    // Draw a small X at the landing point during charging
    if (this.isPowerCharging) {
      this.aimLine.lineStyle(2, dotColor, 0.9);
      this.aimLine.lineBetween(endX - 6, endY - 6, endX + 6, endY + 6);
      this.aimLine.lineBetween(endX - 6, endY + 6, endX + 6, endY - 6);
    }
  }

  update() {
    // Charge power bar while charging — bounces up and down
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

      // Color changes with power
      if (this.powerLevel < 40) {
        this.powerBar.setFillStyle(0x4ecca3);
      } else if (this.powerLevel < 75) {
        this.powerBar.setFillStyle(0xffd700);
      } else {
        this.powerBar.setFillStyle(0xe94560);
      }

      // Redraw arc to show where axe will land at current power
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

    // Show start game button after a brief moment
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

    // Hide practice UI
    this.startGameBtn.setVisible(false);
    this.startGameBtnText.setVisible(false);

    // Show scoreboard
    this.setScoreboardVisible(true);
    this.roundText.setY(108);
    this.playerScoreText.setText('0');
    this.nickScoreText.setText('0');

    // Start first round
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

    // Show player sprite
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

    // Show Nick sprite
    this.playerSprite.setVisible(false);
    this.nickSprite.setVisible(true);
    this.nickSpriteLabel.setVisible(true);

    // Dramatic pause, then ridiculous throw
    const commentary = NICK_COMMENTARY[this.currentRound - 1] ||
      NICK_COMMENTARY[Phaser.Math.Between(0, NICK_COMMENTARY.length - 1)];
    this.commentaryText.setText(commentary);

    this.time.delayedCall(1500, () => {
      // Nick always hits near bullseye (comically precise)
      const offsetX = Phaser.Math.Between(-10, 10);
      const offsetY = Phaser.Math.Between(-10, 10);
      this.throwAxe(TARGET_X + offsetX, TARGET_Y + offsetY, 100, true);
    });
  }

  throwAxe(targetX, targetY, power, isNick = false) {
    this.isThrowInProgress = true;
    this.aimCrosshair.setVisible(false);
    this.aimLine.setVisible(false);
    this.isPowerCharging = false;
    this.powerBar.height = 0;
    this.powerBar.y = this.powerBarBottom;

    // Create axe projectile
    const startX = PLAYER_THROW_X + 50;
    const startY = isNick ? PLAYER_THROW_Y + 100 : PLAYER_THROW_Y;
    const axeColor = isNick ? 0xe94560 : 0x4ecca3;

    const axe = this.add.rectangle(startX, startY, 16, 30, axeColor)
      .setStrokeStyle(2, 0xffffff);

    // Power determines how far along the trajectory the axe goes.
    // At 100% power, it lands exactly at the aim point.
    // Less power = falls short (interpolates between start and aim).
    const powerFraction = Math.max(power / 100, 0.1);

    let landX, landY;

    if (isNick) {
      // Nick: comically accurate
      landX = targetX;
      landY = targetY;
    } else {
      // Player: power determines how far the axe reaches toward the aim point.
      // Low power = falls short, 100% power = lands on aim point.
      landX = startX + (targetX - startX) * powerFraction;
      landY = startY + (targetY - startY) * powerFraction;

      // Add slight random spread that increases at extreme power levels
      const spread = power > 90 ? 8 : (power < 20 ? 12 : 4);
      landX += Phaser.Math.Between(-spread, spread);
      landY += Phaser.Math.Between(-spread, spread);
    }

    // Animate the throw as an arc
    // Arc height scales with power
    const arcHeight = 80 + power * 1.2;
    const duration = isNick ? 800 : 350 + (1 - powerFraction) * 200;

    if (isNick) {
      // Nick gets ridiculous trajectory — curves, loops, etc.
      this.tweens.add({
        targets: axe,
        x: landX,
        y: landY,
        angle: 1080, // Triple spin!
        duration: duration,
        ease: 'Power2',
        onComplete: () => this.onAxeLanded(axe, landX, landY, isNick),
      });
    } else {
      // Player: two-part arc using midpoint
      const midX = (startX + landX) / 2;
      const midY = Math.min(startY, landY) - arcHeight;

      this.tweens.add({
        targets: axe,
        x: midX,
        y: midY,
        angle: 180,
        duration: duration * 0.5,
        ease: 'Sine.easeOut',
        onComplete: () => {
          this.tweens.add({
            targets: axe,
            x: landX,
            y: landY,
            angle: 360,
            duration: duration * 0.5,
            ease: 'Sine.easeIn',
            onComplete: () => this.onAxeLanded(axe, landX, landY, isNick),
          });
        },
      });
    }
  }

  onAxeLanded(axe, x, y, isNick) {
    // Calculate distance from bullseye
    const dx = x - TARGET_X;
    const dy = y - TARGET_Y;
    const distance = Math.sqrt(dx * dx + dy * dy);

    // Determine score
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

      // Show celebration
      if (points >= 30) {
        const celebration = NICK_CELEBRATIONS[this.currentRound - 1] ||
          NICK_CELEBRATIONS[Phaser.Math.Between(0, NICK_CELEBRATIONS.length - 1)];
        this.commentaryText.setText(celebration);
      }
    } else {
      this.playerScore += points;
      this.playerScoreText.setText(this.playerScore.toString());
    }

    this.showScorePopup(x, y, scoreLabel, points, isNick);

    // Keep axe stuck in target briefly then remove
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

    // Rig the final result — Nick always wins
    // If player is ahead, give Nick bonus points
    if (this.playerScore >= this.nickScore) {
      this.nickScore = this.playerScore + Phaser.Math.Between(5, 15);
      this.nickScoreText.setText(this.nickScore.toString());
    }

    // Dramatic reveal
    this.commentaryText.setText('');

    const resultText = this.add.text(GAME_WIDTH / 2, GAME_HEIGHT / 2, '', {
      fontFamily: 'Georgia, serif',
      fontSize: '36px',
      color: '#ffd700',
      fontStyle: 'bold',
      align: 'center',
    }).setOrigin(0.5).setAlpha(0);

    this.time.delayedCall(500, () => {
      resultText.setText('FINAL SCORE\n\n' +
        `Mariel: ${this.playerScore}\n` +
        `Nick: ${this.nickScore}\n\n` +
        'Nick wins... again! \uD83D\uDE0F');
      this.tweens.add({
        targets: resultText,
        alpha: 1,
        duration: 800,
      });
    });

    // Show funny post-game dialogue then complete stage
    this.time.delayedCall(4000, () => {
      resultText.destroy();

      this.dialogue = new DialogueSystem(this);
      this.dialogue.createUI();
      this.dialogue.show([
        { speaker: 'nick', text: 'Was there ever any doubt? \uD83D\uDE0E' },
        { speaker: 'narrator', text: "Some things never change..." },
        { speaker: 'narrator', text: 'But the real win was the date itself.' },
      ], () => {
        this.completeStage();
      });
    });
  }
}
