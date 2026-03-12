import Phaser from 'phaser';
import { GAME_WIDTH, GAME_HEIGHT, COLORS, STAGES } from '../config.js';
import { ProgressManager } from '../systems/ProgressManager.js';
import { TransitionManager } from '../systems/TransitionManager.js';

export class StageSelectScene extends Phaser.Scene {
  constructor() {
    super('StageSelectScene');
  }

  create() {
    TransitionManager.fadeIn(this);

    // Background
    this.add.rectangle(GAME_WIDTH / 2, GAME_HEIGHT / 2, GAME_WIDTH, GAME_HEIGHT, COLORS.background);

    // Title
    this.add.text(GAME_WIDTH / 2, 50, 'Our Journey', {
      fontFamily: 'Georgia, serif',
      fontSize: '42px',
      color: '#e94560',
      fontStyle: 'italic',
    }).setOrigin(0.5);

    // Draw a timeline line
    const timelineY = GAME_HEIGHT / 2;
    const startX = 100;
    const endX = GAME_WIDTH - 100;
    const lineGraphics = this.add.graphics();
    lineGraphics.lineStyle(3, COLORS.primary, 0.4);
    lineGraphics.lineBetween(startX, timelineY, endX, timelineY);

    // Place stage nodes along the timeline
    const stageCount = STAGES.length;
    const spacing = (endX - startX) / Math.max(stageCount - 1, 1);

    STAGES.forEach((stage, index) => {
      const x = stageCount === 1 ? GAME_WIDTH / 2 : startX + spacing * index;
      const isUnlocked = ProgressManager.isStageUnlocked(index);
      const isCompleted = ProgressManager.isStageCompleted(stage.id);

      this.createStageNode(x, timelineY, stage, index, isUnlocked, isCompleted);
    });

    // Add a final node for the proposal
    const proposalX = endX + 50;
    const allCompleted = STAGES.every(s => ProgressManager.isStageCompleted(s.id));
    this.createProposalNode(proposalX, timelineY, allCompleted);

    // Back button
    const backBtn = this.add.text(60, GAME_HEIGHT - 50, '\u2190 Back', {
      fontFamily: 'Georgia, serif',
      fontSize: '20px',
      color: '#ffffff',
    }).setOrigin(0.5).setInteractive({ useHandCursor: true });

    backBtn.on('pointerover', () => backBtn.setColor('#ffd700'));
    backBtn.on('pointerout', () => backBtn.setColor('#ffffff'));
    backBtn.on('pointerdown', () => {
      TransitionManager.fadeToScene(this, 'TitleScene');
    });
  }

  createStageNode(x, y, stage, index, isUnlocked, isCompleted) {
    const nodeSize = 40;
    let color = COLORS.accent; // locked
    let alpha = 0.4;

    if (isCompleted) {
      color = COLORS.success;
      alpha = 1;
    } else if (isUnlocked) {
      color = COLORS.primary;
      alpha = 1;
    }

    // Node circle
    const node = this.add.circle(x, y, nodeSize / 2, color, alpha)
      .setStrokeStyle(2, isUnlocked ? COLORS.gold : 0x555555);

    // Stage number or checkmark
    const label = isCompleted ? '\u2713' : `${index + 1}`;
    const labelText = this.add.text(x, y, label, {
      fontFamily: 'Georgia, serif',
      fontSize: '18px',
      color: '#ffffff',
      fontStyle: 'bold',
    }).setOrigin(0.5);

    // Stage title below
    this.add.text(x, y + 40, stage.title, {
      fontFamily: 'Georgia, serif',
      fontSize: '14px',
      color: isUnlocked ? '#ffffff' : '#666666',
    }).setOrigin(0.5);

    // Subtitle
    this.add.text(x, y + 58, stage.subtitle, {
      fontFamily: 'Georgia, serif',
      fontSize: '11px',
      color: isUnlocked ? '#aaaaaa' : '#444444',
    }).setOrigin(0.5);

    if (isUnlocked) {
      node.setInteractive({ useHandCursor: true });

      node.on('pointerover', () => {
        node.setStrokeStyle(3, COLORS.gold);
        this.tweens.add({ targets: [node, labelText], scaleX: 1.2, scaleY: 1.2, duration: 100 });
      });

      node.on('pointerout', () => {
        node.setStrokeStyle(2, COLORS.gold);
        this.tweens.add({ targets: [node, labelText], scaleX: 1, scaleY: 1, duration: 100 });
      });

      node.on('pointerdown', () => {
        TransitionManager.fadeToScene(this, 'StageIntroScene', { stageIndex: index });
      });
    }
  }

  createProposalNode(x, y, isUnlocked) {
    const heart = this.add.text(x, y, '\u2665', {
      fontSize: '32px',
      color: isUnlocked ? '#e94560' : '#444444',
    }).setOrigin(0.5);

    this.add.text(x, y + 40, '???', {
      fontFamily: 'Georgia, serif',
      fontSize: '14px',
      color: isUnlocked ? '#e94560' : '#666666',
    }).setOrigin(0.5);

    if (isUnlocked) {
      // Pulsing heart
      this.tweens.add({
        targets: heart,
        scaleX: 1.3,
        scaleY: 1.3,
        duration: 800,
        yoyo: true,
        repeat: -1,
        ease: 'Sine.easeInOut',
      });

      heart.setInteractive({ useHandCursor: true });
      heart.on('pointerdown', () => {
        TransitionManager.fadeToScene(this, 'ProposalScene');
      });
    }
  }
}
