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

// Funny commentary for the computer's ridiculous throws
const COMPUTER_COMMENTARY = [
  '"Behind the back throw!"',
  '"No-look shot!"',
  '"Triple spin!"',
  '"With eyes closed!"',
  '"Bounced off the ceiling!"',
];

const COMPUTER_CELEBRATIONS = [
  '*flexes dramatically*',
  '*moonwalks*',
  '*air guitar solo*',
  '*blows on fingers like a gun*',
  '*victory dance*',
];

export class AxeThrowingStage extends BaseStage {
  constructor() {
    super('AxeThrowingStage');
  }

  create() {
    // Game state
    this.playerScore = 0;
    this.computerScore = 0;
    this.currentRound = 0;
    this.isPlayerTurn = true;
    this.isThrowInProgress = false;
    this.powerLevel = 0;
    this.isPowerCharging = false;

    this.createBackground();
    this.createTarget();
    this.createScoreboard();
    this.createPlayerUI();

    // Start first round
    this.time.delayedCall(500, () => this.startRound());
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
    this.add.rectangle(GAME_WIDTH / 2, 75, 500, 55, 0x000000, 0.6);

    // Player score
    this.add.text(GAME_WIDTH / 2 - 140, 63, 'Mariel', {
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
    this.add.text(GAME_WIDTH / 2, 75, 'VS', {
      fontFamily: 'Georgia, serif',
      fontSize: '18px',
      color: '#ffd700',
      fontStyle: 'bold',
    }).setOrigin(0.5);

    // Computer score
    this.add.text(GAME_WIDTH / 2 + 140, 63, 'Computer', {
      fontFamily: 'Georgia, serif',
      fontSize: '16px',
      color: '#e94560',
      fontStyle: 'bold',
    }).setOrigin(0.5);

    this.computerScoreText = this.add.text(GAME_WIDTH / 2 + 140, 85, '0', {
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

    // Commentary text (for computer's ridiculous moves)
    this.commentaryText = this.add.text(GAME_WIDTH / 2, GAME_HEIGHT - 30, '', {
      fontFamily: 'Georgia, serif',
      fontSize: '16px',
      color: '#ffd700',
      fontStyle: 'italic',
    }).setOrigin(0.5);
  }

  createPlayerUI() {
    // Power bar background
    this.add.rectangle(80, GAME_HEIGHT / 2, 30, 300, 0x333333)
      .setStrokeStyle(2, 0x666666);

    // Power bar fill (grows as player holds)
    this.powerBar = this.add.rectangle(80, GAME_HEIGHT / 2 + 150, 26, 0, 0x4ecca3);
    this.powerBar.setOrigin(0.5, 1);

    // Power label
    this.add.text(80, GAME_HEIGHT / 2 + 170, 'POWER', {
      fontFamily: 'Arial',
      fontSize: '11px',
      color: '#aaaaaa',
    }).setOrigin(0.5);

    // Aim crosshair (follows mouse)
    this.aimCrosshair = this.add.graphics();
    this.aimCrosshair.lineStyle(2, 0x4ecca3, 0.8);
    this.aimCrosshair.strokeCircle(0, 0, 12);
    this.aimCrosshair.lineBetween(-18, 0, 18, 0);
    this.aimCrosshair.lineBetween(0, -18, 0, 18);
    this.aimCrosshair.setVisible(false);

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

    // Computer character placeholder
    this.computerSprite = this.add.rectangle(PLAYER_THROW_X, PLAYER_THROW_Y + 100, 40, 70, 0xe94560)
      .setStrokeStyle(2, 0xffffff);
    this.computerSprite.setVisible(false);
    this.computerLabel = this.add.text(PLAYER_THROW_X, PLAYER_THROW_Y + 40, 'Computer', {
      fontFamily: 'Georgia, serif',
      fontSize: '12px',
      color: '#e94560',
    }).setOrigin(0.5).setVisible(false);

    // Input handling
    this.input.on('pointermove', (pointer) => {
      if (this.isPlayerTurn && !this.isThrowInProgress) {
        this.aimCrosshair.setPosition(
          Phaser.Math.Clamp(pointer.x, TARGET_X - BOARD_RADIUS, TARGET_X + BOARD_RADIUS),
          Phaser.Math.Clamp(pointer.y, TARGET_Y - BOARD_RADIUS, TARGET_Y + BOARD_RADIUS)
        );
      }
    });

    this.input.on('pointerdown', () => {
      if (this.isPlayerTurn && !this.isThrowInProgress) {
        this.isPowerCharging = true;
        this.powerLevel = 0;
      }
    });

    this.input.on('pointerup', (pointer) => {
      if (this.isPowerCharging && this.isPlayerTurn) {
        this.isPowerCharging = false;
        this.throwAxe(pointer.x, pointer.y, this.powerLevel);
      }
    });
  }

  update() {
    // Charge power bar while holding
    if (this.isPowerCharging) {
      this.powerLevel = Math.min(this.powerLevel + 1.5, 100);
      this.powerBar.height = (this.powerLevel / 100) * 296;

      // Color changes with power
      if (this.powerLevel < 40) {
        this.powerBar.setFillStyle(0x4ecca3);
      } else if (this.powerLevel < 75) {
        this.powerBar.setFillStyle(0xffd700);
      } else {
        this.powerBar.setFillStyle(0xe94560);
      }
    }
  }

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
      this.startComputerTurn();
    }
  }

  startPlayerTurn() {
    this.isPlayerTurn = true;
    this.isThrowInProgress = false;
    this.aimCrosshair.setVisible(true);
    this.instructionText.setText('Hold to charge power, release to throw!');
    this.commentaryText.setText('');

    // Show player sprite
    this.playerSprite.setVisible(true);
    this.computerSprite.setVisible(false);
    this.computerLabel.setVisible(false);
  }

  startComputerTurn() {
    this.isPlayerTurn = false;
    this.isThrowInProgress = true;
    this.aimCrosshair.setVisible(false);
    this.instructionText.setText("Computer's turn...");

    // Show computer sprite
    this.playerSprite.setVisible(false);
    this.computerSprite.setVisible(true);
    this.computerLabel.setVisible(true);

    // Dramatic pause, then ridiculous throw
    const commentary = COMPUTER_COMMENTARY[this.currentRound - 1] ||
      COMPUTER_COMMENTARY[Phaser.Math.Between(0, COMPUTER_COMMENTARY.length - 1)];
    this.commentaryText.setText(commentary);

    this.time.delayedCall(1500, () => {
      // Computer always hits near bullseye (comically precise)
      const offsetX = Phaser.Math.Between(-10, 10);
      const offsetY = Phaser.Math.Between(-10, 10);
      this.throwAxe(TARGET_X + offsetX, TARGET_Y + offsetY, 100, true);
    });
  }

  throwAxe(targetX, targetY, power, isComputer = false) {
    this.isThrowInProgress = true;
    this.aimCrosshair.setVisible(false);
    this.isPowerCharging = false;
    this.powerBar.height = 0;

    // Create axe projectile
    const startX = PLAYER_THROW_X + 50;
    const startY = isComputer ? PLAYER_THROW_Y + 100 : PLAYER_THROW_Y;
    const axeColor = isComputer ? 0xe94560 : 0x4ecca3;

    const axe = this.add.rectangle(startX, startY, 16, 30, axeColor)
      .setStrokeStyle(2, 0xffffff);

    // Calculate landing position based on aim and power
    const accuracy = isComputer ? 1.0 : Math.min(power / 100, 1.0);
    let landX, landY;

    if (isComputer) {
      // Computer: comically accurate, sometimes with absurd trajectory
      landX = targetX;
      landY = targetY;
    } else {
      // Player: accuracy affected by power level
      const spreadFactor = (1 - accuracy) * 80;
      landX = targetX + Phaser.Math.Between(-spreadFactor, spreadFactor);
      landY = targetY + Phaser.Math.Between(-spreadFactor, spreadFactor);
    }

    // Animate the throw
    const midX = (startX + landX) / 2;
    const midY = Math.min(startY, landY) - 100 - (power * 1.5); // Arc height

    if (isComputer) {
      // Computer gets ridiculous trajectory — curves, loops, etc.
      this.tweens.add({
        targets: axe,
        x: landX,
        y: landY,
        angle: 1080, // Triple spin!
        duration: 800,
        ease: 'Power2',
        onComplete: () => this.onAxeLanded(axe, landX, landY, isComputer),
      });
    } else {
      // Player gets normal physics arc
      this.tweens.timeline({
        targets: axe,
        tweens: [
          { x: midX, y: midY, angle: 180, duration: 300, ease: 'Sine.easeOut' },
          { x: landX, y: landY, angle: 360, duration: 300, ease: 'Sine.easeIn' },
        ],
        onComplete: () => this.onAxeLanded(axe, landX, landY, isComputer),
      });
    }
  }

  onAxeLanded(axe, x, y, isComputer) {
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

    // Update scores
    if (isComputer) {
      this.computerScore += points;
      this.computerScoreText.setText(this.computerScore.toString());

      // Show celebration
      if (points >= 30) {
        const celebration = COMPUTER_CELEBRATIONS[this.currentRound - 1] ||
          COMPUTER_CELEBRATIONS[Phaser.Math.Between(0, COMPUTER_CELEBRATIONS.length - 1)];
        this.commentaryText.setText(celebration);
      }
    } else {
      this.playerScore += points;
      this.playerScoreText.setText(this.playerScore.toString());
    }

    // Score popup
    const color = isComputer ? '#e94560' : '#4ecca3';
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

    // Keep axe stuck in target briefly then remove
    this.time.delayedCall(800, () => {
      axe.destroy();
    });

    // Next turn
    this.time.delayedCall(1500, () => {
      if (this.isPlayerTurn) {
        // Switch to computer turn
        this.isPlayerTurn = false;
        this.startComputerTurn();
      } else {
        // Switch to player turn, advance round
        this.isPlayerTurn = true;
        this.startRound();
      }
    });
  }

  endGame() {
    this.aimCrosshair.setVisible(false);
    this.instructionText.setText('');

    // Rig the final result — computer always wins
    // If player is ahead, give computer bonus points
    if (this.playerScore >= this.computerScore) {
      this.computerScore = this.playerScore + Phaser.Math.Between(5, 15);
      this.computerScoreText.setText(this.computerScore.toString());
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
        `Computer: ${this.computerScore}\n\n` +
        'Computer wins... again! \uD83D\uDE0F');
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
        { speaker: 'computer', text: 'Was there ever any doubt? \uD83D\uDE0E' },
        { speaker: 'narrator', text: "Some things never change..." },
        { speaker: 'narrator', text: 'But the real win was the date itself.' },
      ], () => {
        this.completeStage();
      });
    });
  }
}
