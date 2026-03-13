import Phaser from 'phaser';
import { GAME_WIDTH, GAME_HEIGHT, COLORS, STAGES } from '../config.js';
import { TransitionManager } from '../systems/TransitionManager.js';

export class BaseStage extends Phaser.Scene {
  init(data) {
    this.stageIndex = data.stageIndex || 0;
    this.stageData = STAGES[this.stageIndex];
  }

  createBackButton() {
    const btn = this.add.text(60, GAME_HEIGHT - 30, '\u2190 Back', {
      fontFamily: 'Georgia, serif',
      fontSize: '18px',
      color: '#ffffff',
      backgroundColor: '#00000088',
      padding: { x: 10, y: 5 },
    }).setOrigin(0.5).setInteractive({ useHandCursor: true }).setDepth(100);

    btn.on('pointerover', () => btn.setColor('#ffd700'));
    btn.on('pointerout', () => btn.setColor('#ffffff'));
    btn.on('pointerdown', () => {
      TransitionManager.fadeToScene(this, 'StageSelectScene');
    });

    return btn;
  }

  completeStage() {
    // Transition to the outro scene which handles auto-save
    TransitionManager.fadeToScene(this, 'StageOutroScene', {
      stageIndex: this.stageIndex,
    });
  }
}
