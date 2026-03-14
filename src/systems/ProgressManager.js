const SAVE_KEY = 'mariel-game-progress';

class ProgressManagerClass {
  constructor() {
    this.data = this.load();
  }

  load() {
    try {
      const saved = localStorage.getItem(SAVE_KEY);
      if (saved) {
        return JSON.parse(saved);
      }
    } catch (e) {
      console.warn('Could not load save data:', e);
    }
    return { completedStages: [], currentStage: 0 };
  }

  save() {
    try {
      localStorage.setItem(SAVE_KEY, JSON.stringify(this.data));
    } catch (e) {
      console.warn('Could not save progress:', e);
    }
  }

  completeStage(stageId) {
    if (!this.data.completedStages.includes(stageId)) {
      this.data.completedStages.push(stageId);
    }
    this.data.currentStage = Math.max(
      this.data.currentStage,
      this.data.completedStages.length
    );
    this.save(); // Auto-save on completion
  }

  isStageCompleted(stageId) {
    return this.data.completedStages.includes(stageId);
  }

  isStageUnlocked(stageIndex) {
    // First stage is always unlocked; others unlock when previous is completed
    return stageIndex <= this.data.completedStages.length;
  }

  getCurrentStageIndex() {
    return this.data.currentStage;
  }

  resetProgress() {
    this.data = { completedStages: [], currentStage: 0 };
    this.save();
  }
}

// Singleton instance
export const ProgressManager = new ProgressManagerClass();
