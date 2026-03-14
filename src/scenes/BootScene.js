import Phaser from 'phaser';
import { GAME_WIDTH, GAME_HEIGHT, COLORS } from '../config.js';

export class BootScene extends Phaser.Scene {
  constructor() {
    super('BootScene');
  }

  preload() {
    // Show a loading bar
    const barWidth = 400;
    const barHeight = 30;
    const barX = (GAME_WIDTH - barWidth) / 2;
    const barY = GAME_HEIGHT / 2;

    // Loading text
    const loadingText = this.add.text(GAME_WIDTH / 2, barY - 50, 'Loading Our Story...', {
      fontFamily: 'Georgia, serif',
      fontSize: '28px',
      color: '#e94560',
    }).setOrigin(0.5);

    // Progress bar background
    const barBg = this.add.rectangle(GAME_WIDTH / 2, barY, barWidth, barHeight, 0x16213e);

    // Progress bar fill
    const barFill = this.add.rectangle(barX + 2, barY, 0, barHeight - 4, COLORS.primary);
    barFill.setOrigin(0, 0.5);

    // Update progress bar as assets load
    this.load.on('progress', (value) => {
      barFill.width = (barWidth - 4) * value;
    });

    this.load.on('complete', () => {
      loadingText.setText('Ready!');
    });

    // Preload any global assets here (fonts, UI elements, etc.)
    // For now we use placeholder graphics so nothing to preload
  }

  create() {
    // Small delay so the player can see "Ready!" then transition to title
    this.time.delayedCall(500, () => {
      this.scene.start('TitleScene');
    });
  }
}
