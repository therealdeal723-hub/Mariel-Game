import Phaser from 'phaser';
import { GAME_WIDTH, GAME_HEIGHT, COLORS } from '../config.js';

export class DialogueSystem {
  constructor(scene) {
    this.scene = scene;
    this.dialogueQueue = [];
    this.isActive = false;
    this.currentIndex = 0;
    this.typewriterTimer = null;
    this.onComplete = null;

    // UI elements
    this.container = null;
    this.nameText = null;
    this.dialogueText = null;
    this.continuePrompt = null;
  }

  createUI() {
    const boxHeight = 160;
    const boxY = GAME_HEIGHT - boxHeight - 20;
    const padding = 30;

    this.container = this.scene.add.container(0, 0).setDepth(100);

    // Semi-transparent dialogue box background
    const bg = this.scene.add.rectangle(
      GAME_WIDTH / 2, boxY + boxHeight / 2,
      GAME_WIDTH - 40, boxHeight,
      0x000000, 0.8
    );
    const border = this.scene.add.rectangle(
      GAME_WIDTH / 2, boxY + boxHeight / 2,
      GAME_WIDTH - 36, boxHeight - 4
    ).setStrokeStyle(2, COLORS.primary);

    // Speaker name
    this.nameText = this.scene.add.text(40, boxY + 15, '', {
      fontFamily: 'Georgia, serif',
      fontSize: '20px',
      color: '#ffd700',
      fontStyle: 'bold',
    });

    // Dialogue text
    this.dialogueText = this.scene.add.text(40, boxY + 45, '', {
      fontFamily: 'Georgia, serif',
      fontSize: '18px',
      color: '#ffffff',
      wordWrap: { width: GAME_WIDTH - 100 },
      lineSpacing: 6,
    });

    // "Click to continue" prompt
    this.continuePrompt = this.scene.add.text(
      GAME_WIDTH - 60, boxY + boxHeight - 25,
      '\u25BC', {
        fontSize: '16px',
        color: '#e94560',
      }
    ).setOrigin(0.5).setAlpha(0);

    // Blinking animation for continue prompt
    this.scene.tweens.add({
      targets: this.continuePrompt,
      alpha: { from: 0, to: 1 },
      duration: 600,
      yoyo: true,
      repeat: -1,
    });

    this.container.add([bg, border, this.nameText, this.dialogueText, this.continuePrompt]);
    this.container.setVisible(false);

    // Click anywhere to advance dialogue
    this.scene.input.on('pointerdown', () => {
      if (!this.isActive) return;

      if (this.typewriterTimer && this.typewriterTimer.getProgress() < 1) {
        // Skip typewriter effect — show full text immediately
        this.typewriterTimer.remove();
        this.typewriterTimer = null;
        this.dialogueText.setText(this.dialogueQueue[this.currentIndex].text);
        this.continuePrompt.setAlpha(1);
      } else {
        // Advance to next dialogue
        this.currentIndex++;
        if (this.currentIndex < this.dialogueQueue.length) {
          this.showLine(this.currentIndex);
        } else {
          this.hide();
        }
      }
    });
  }

  show(dialogueLines, onComplete) {
    this.dialogueQueue = dialogueLines;
    this.currentIndex = 0;
    this.onComplete = onComplete;
    this.isActive = true;
    this.container.setVisible(true);
    this.showLine(0);
  }

  showLine(index) {
    const line = this.dialogueQueue[index];
    const speakerName = this.getSpeakerName(line.speaker);

    this.nameText.setText(speakerName);
    this.dialogueText.setText('');
    this.continuePrompt.setAlpha(0);

    // Typewriter effect
    const fullText = line.text;
    let charIndex = 0;

    this.typewriterTimer = this.scene.time.addEvent({
      delay: 30,
      repeat: fullText.length - 1,
      callback: () => {
        charIndex++;
        this.dialogueText.setText(fullText.substring(0, charIndex));
        if (charIndex >= fullText.length) {
          this.continuePrompt.setAlpha(1);
        }
      },
    });
  }

  getSpeakerName(speaker) {
    const names = {
      narrator: '',
      you: 'You',
      mariel: 'Mariel',
      computer: 'Computer',
    };
    return names[speaker] || speaker;
  }

  hide() {
    this.isActive = false;
    this.container.setVisible(false);
    if (this.typewriterTimer) {
      this.typewriterTimer.remove();
      this.typewriterTimer = null;
    }
    if (this.onComplete) {
      this.onComplete();
    }
  }

  destroy() {
    if (this.container) {
      this.container.destroy();
    }
    if (this.typewriterTimer) {
      this.typewriterTimer.remove();
    }
  }
}
