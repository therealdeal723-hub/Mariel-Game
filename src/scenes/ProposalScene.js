import Phaser from 'phaser';
import { GAME_WIDTH, GAME_HEIGHT, COLORS } from '../config.js';
import { TransitionManager } from '../systems/TransitionManager.js';

export class ProposalScene extends Phaser.Scene {
  constructor() {
    super('ProposalScene');
  }

  create() {
    TransitionManager.fadeIn(this, 1000);

    // Dark background
    this.add.rectangle(GAME_WIDTH / 2, GAME_HEIGHT / 2, GAME_WIDTH, GAME_HEIGHT, 0x0a0a1a);

    // Create floating hearts
    this.createHeartParticles();

    // Build the proposal sequence with timed animations
    const messages = [
      { text: 'Through every adventure...', delay: 1000, y: 150 },
      { text: 'Every laugh, every challenge...', delay: 3000, y: 220 },
      { text: 'Every moment together...', delay: 5000, y: 290 },
      { text: 'I would choose you again.', delay: 7500, y: 400, size: '36px', color: '#ffd700' },
      { text: 'Will you continue this story with me?', delay: 10000, y: 480, size: '32px', color: '#e94560' },
    ];

    messages.forEach(({ text, delay, y, size, color }) => {
      this.time.delayedCall(delay, () => {
        const msg = this.add.text(GAME_WIDTH / 2, y, text, {
          fontFamily: 'Georgia, serif',
          fontSize: size || '24px',
          color: color || '#ffffff',
          fontStyle: 'italic',
        }).setOrigin(0.5).setAlpha(0);

        this.tweens.add({
          targets: msg,
          alpha: 1,
          duration: 1500,
          ease: 'Power2',
        });
      });
    });

    // Final heart animation after all text
    this.time.delayedCall(13000, () => {
      const bigHeart = this.add.text(GAME_WIDTH / 2, GAME_HEIGHT - 120, '\u2665', {
        fontSize: '80px',
        color: '#e94560',
      }).setOrigin(0.5).setAlpha(0);

      this.tweens.add({
        targets: bigHeart,
        alpha: 1,
        scaleX: { from: 0, to: 1.2 },
        scaleY: { from: 0, to: 1.2 },
        duration: 1000,
        ease: 'Back.easeOut',
        onComplete: () => {
          this.tweens.add({
            targets: bigHeart,
            scaleX: 1.3,
            scaleY: 1.3,
            duration: 800,
            yoyo: true,
            repeat: -1,
            ease: 'Sine.easeInOut',
          });
        },
      });
    });
  }

  createHeartParticles() {
    // Floating hearts rising from the bottom
    this.time.addEvent({
      delay: 400,
      loop: true,
      callback: () => {
        const x = Phaser.Math.Between(50, GAME_WIDTH - 50);
        const size = Phaser.Math.Between(12, 28);
        const heart = this.add.text(x, GAME_HEIGHT + 20, '\u2665', {
          fontSize: `${size}px`,
          color: '#e94560',
        }).setOrigin(0.5).setAlpha(Phaser.Math.FloatBetween(0.1, 0.4));

        this.tweens.add({
          targets: heart,
          y: -30,
          x: x + Phaser.Math.Between(-80, 80),
          alpha: 0,
          duration: Phaser.Math.Between(4000, 8000),
          ease: 'Sine.easeIn',
          onComplete: () => heart.destroy(),
        });
      },
    });
  }
}
