import Phaser from 'phaser';
import { GAME_WIDTH, GAME_HEIGHT, COLORS } from '../config.js';

export class TitleScene extends Phaser.Scene {
  constructor() {
    super('TitleScene');
  }

  create() {
    // Background gradient effect using rectangles
    this.add.rectangle(GAME_WIDTH / 2, GAME_HEIGHT / 2, GAME_WIDTH, GAME_HEIGHT, COLORS.background);

    // Decorative hearts floating in background
    this.createFloatingHearts();

    // Title text
    const title = this.add.text(GAME_WIDTH / 2, 200, 'Our Story', {
      fontFamily: 'Georgia, serif',
      fontSize: '72px',
      color: '#e94560',
      fontStyle: 'italic',
    }).setOrigin(0.5);

    // Subtle pulsing animation on title
    this.tweens.add({
      targets: title,
      scaleX: 1.05,
      scaleY: 1.05,
      duration: 2000,
      yoyo: true,
      repeat: -1,
      ease: 'Sine.easeInOut',
    });

    // Subtitle
    this.add.text(GAME_WIDTH / 2, 290, 'A journey through us', {
      fontFamily: 'Georgia, serif',
      fontSize: '24px',
      color: '#ffffff',
      alpha: 0.7,
    }).setOrigin(0.5);

    // Play button
    this.createButton(GAME_WIDTH / 2, 450, 'Play', () => {
      this.cameras.main.fadeOut(500, 0, 0, 0);
      this.cameras.main.once('camerafadeoutcomplete', () => {
        this.scene.start('StageSelectScene');
      });
    });

    // Fade in
    this.cameras.main.fadeIn(1000, 0, 0, 0);
  }

  createButton(x, y, label, callback) {
    const buttonWidth = 220;
    const buttonHeight = 60;

    // Button background
    const bg = this.add.rectangle(x, y, buttonWidth, buttonHeight, COLORS.primary, 0.9)
      .setInteractive({ useHandCursor: true });

    // Button border
    const border = this.add.rectangle(x, y, buttonWidth + 4, buttonHeight + 4)
      .setStrokeStyle(2, COLORS.gold);

    // Button text
    const text = this.add.text(x, y, label, {
      fontFamily: 'Georgia, serif',
      fontSize: '28px',
      color: '#ffffff',
    }).setOrigin(0.5);

    // Hover effects
    bg.on('pointerover', () => {
      bg.setFillStyle(COLORS.gold, 1);
      text.setColor('#1a1a2e');
      this.tweens.add({ targets: [bg, border, text], scaleX: 1.05, scaleY: 1.05, duration: 100 });
    });

    bg.on('pointerout', () => {
      bg.setFillStyle(COLORS.primary, 0.9);
      text.setColor('#ffffff');
      this.tweens.add({ targets: [bg, border, text], scaleX: 1, scaleY: 1, duration: 100 });
    });

    bg.on('pointerdown', callback);

    return { bg, border, text };
  }

  createFloatingHearts() {
    // Create simple heart shapes using text emoji as placeholders
    for (let i = 0; i < 12; i++) {
      const x = Phaser.Math.Between(50, GAME_WIDTH - 50);
      const y = Phaser.Math.Between(50, GAME_HEIGHT - 50);
      const size = Phaser.Math.Between(16, 32);
      const alpha = Phaser.Math.FloatBetween(0.05, 0.15);

      const heart = this.add.text(x, y, '\u2665', {
        fontSize: `${size}px`,
        color: '#e94560',
      }).setOrigin(0.5).setAlpha(alpha);

      // Gentle floating animation
      this.tweens.add({
        targets: heart,
        y: y - Phaser.Math.Between(20, 60),
        alpha: alpha * 0.5,
        duration: Phaser.Math.Between(3000, 6000),
        yoyo: true,
        repeat: -1,
        ease: 'Sine.easeInOut',
        delay: Phaser.Math.Between(0, 2000),
      });
    }
  }
}
