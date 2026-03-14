import Phaser from 'phaser';
import { GAME_WIDTH, GAME_HEIGHT, COLORS, STAGES } from '../config.js';
import { DialogueSystem } from '../systems/DialogueSystem.js';
import { TransitionManager } from '../systems/TransitionManager.js';

export class StageIntroScene extends Phaser.Scene {
  constructor() {
    super('StageIntroScene');
  }

  init(data) {
    this.stageIndex = data.stageIndex || 0;
    this.stageData = STAGES[this.stageIndex];
  }

  create() {
    TransitionManager.fadeIn(this);

    // Background
    this.add.rectangle(GAME_WIDTH / 2, GAME_HEIGHT / 2, GAME_WIDTH, GAME_HEIGHT, COLORS.secondary);

    // Chapter heading
    const chapterText = this.add.text(GAME_WIDTH / 2, 100, `Chapter ${this.stageIndex + 1}`, {
      fontFamily: 'Georgia, serif',
      fontSize: '24px',
      color: '#ffd700',
    }).setOrigin(0.5).setAlpha(0);

    const titleText = this.add.text(GAME_WIDTH / 2, 150, this.stageData.title, {
      fontFamily: 'Georgia, serif',
      fontSize: '48px',
      color: '#e94560',
      fontStyle: 'italic',
    }).setOrigin(0.5).setAlpha(0);

    const subtitleText = this.add.text(GAME_WIDTH / 2, 210, this.stageData.subtitle, {
      fontFamily: 'Georgia, serif',
      fontSize: '20px',
      color: '#ffffff',
    }).setOrigin(0.5).setAlpha(0);

    // Animate heading in
    this.tweens.add({
      targets: chapterText,
      alpha: 1,
      y: 80,
      duration: 800,
      ease: 'Power2',
    });

    this.tweens.add({
      targets: titleText,
      alpha: 1,
      duration: 800,
      delay: 300,
      ease: 'Power2',
    });

    this.tweens.add({
      targets: subtitleText,
      alpha: 0.7,
      duration: 800,
      delay: 600,
      ease: 'Power2',
    });

    // Create dialogue system and show intro dialogue after heading animation
    this.dialogue = new DialogueSystem(this);
    this.dialogue.createUI();

    this.time.delayedCall(1500, () => {
      this.dialogue.show(this.stageData.intro, () => {
        // After intro dialogue, transition to the mini game
        TransitionManager.fadeToScene(this, this.stageData.scene, {
          stageIndex: this.stageIndex,
        });
      });
    });
  }
}
