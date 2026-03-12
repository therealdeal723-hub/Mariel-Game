class AudioManagerClass {
  constructor() {
    this.currentMusic = null;
    this.musicVolume = 0.5;
    this.sfxVolume = 0.7;
    this.scene = null;
  }

  setScene(scene) {
    this.scene = scene;
  }

  playMusic(key, config = {}) {
    if (!this.scene) return;

    // Stop current music if playing
    this.stopMusic();

    // Check if the audio key exists before playing
    if (!this.scene.cache.audio.exists(key)) {
      console.warn(`Audio key "${key}" not found — skipping music`);
      return;
    }

    this.currentMusic = this.scene.sound.add(key, {
      loop: true,
      volume: this.musicVolume,
      ...config,
    });
    this.currentMusic.play();
  }

  stopMusic(fadeOut = 500) {
    if (this.currentMusic && this.currentMusic.isPlaying) {
      if (fadeOut > 0 && this.scene) {
        this.scene.tweens.add({
          targets: this.currentMusic,
          volume: 0,
          duration: fadeOut,
          onComplete: () => {
            this.currentMusic.stop();
            this.currentMusic.destroy();
            this.currentMusic = null;
          },
        });
      } else {
        this.currentMusic.stop();
        this.currentMusic.destroy();
        this.currentMusic = null;
      }
    }
  }

  playSfx(scene, key, config = {}) {
    if (!scene.cache.audio.exists(key)) {
      console.warn(`SFX key "${key}" not found — skipping`);
      return;
    }
    scene.sound.play(key, { volume: this.sfxVolume, ...config });
  }

  setMusicVolume(volume) {
    this.musicVolume = volume;
    if (this.currentMusic) {
      this.currentMusic.setVolume(volume);
    }
  }

  setSfxVolume(volume) {
    this.sfxVolume = volume;
  }
}

export const AudioManager = new AudioManagerClass();
