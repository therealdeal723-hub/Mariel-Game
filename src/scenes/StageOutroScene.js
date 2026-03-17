import Phaser from 'phaser';
import { GAME_WIDTH, GAME_HEIGHT, COLORS, STAGES } from '../config.js';
import { DialogueSystem } from '../systems/DialogueSystem.js';
import { SoundFX } from '../systems/SoundFX.js';
import { ProgressManager } from '../systems/ProgressManager.js';
import { TransitionManager } from '../systems/TransitionManager.js';

export class StageOutroScene extends Phaser.Scene {
  constructor() {
    super('StageOutroScene');
  }

  init(data) {
    this.stageIndex = data.stageIndex || 0;
    this.stageData = STAGES[this.stageIndex];
  }

  create() {
    TransitionManager.fadeIn(this);

    // Background
    this.add.rectangle(GAME_WIDTH / 2, GAME_HEIGHT / 2, GAME_WIDTH, GAME_HEIGHT, COLORS.secondary);

    // "Stage Complete" text
    const completeText = this.add.text(GAME_WIDTH / 2, GAME_HEIGHT / 2 - 100, 'Stage Complete!', {
      fontFamily: 'Georgia, serif',
      fontSize: '42px',
      color: '#4ecca3',
      fontStyle: 'italic',
    }).setOrigin(0.5).setAlpha(0);

    this.tweens.add({
      targets: completeText,
      alpha: 1,
      scaleX: { from: 0.5, to: 1 },
      scaleY: { from: 0.5, to: 1 },
      duration: 600,
      ease: 'Back.easeOut',
    });

    // Auto-save progress
    ProgressManager.completeStage(this.stageData.id);

    // Show outro dialogue
    this.sfx = new SoundFX(this);
    this.events.on('shutdown', () => this.sfx.destroy());
    this.dialogue = new DialogueSystem(this, this.sfx);
    this.dialogue.createUI();

    this.time.delayedCall(1200, () => {
      this.dialogue.show(this.stageData.outro, () => {
        // Check if there's a next stage or if we go to proposal
        const nextIndex = this.stageIndex + 1;
        if (nextIndex < STAGES.length) {
          TransitionManager.fadeToScene(this, 'StageSelectScene');
        } else {
          // All stages complete — go to proposal!
          TransitionManager.fadeToScene(this, 'ProposalScene');
        }
      });
    });
  }
}
