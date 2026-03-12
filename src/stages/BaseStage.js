import Phaser from 'phaser';
import { GAME_WIDTH, GAME_HEIGHT, COLORS, STAGES } from '../config.js';
import { TransitionManager } from '../systems/TransitionManager.js';

export class BaseStage extends Phaser.Scene {
  init(data) {
    this.stageIndex = data.stageIndex || 0;
    this.stageData = STAGES[this.stageIndex];
  }

  completeStage() {
    // Transition to the outro scene which handles auto-save
    TransitionManager.fadeToScene(this, 'StageOutroScene', {
      stageIndex: this.stageIndex,
    });
  }
}
