/**
 * Procedural sound effects using the Web Audio API.
 * No audio files needed — all sounds are synthesized at runtime.
 */
export class SoundFX {
  constructor(scene) {
    this.scene = scene;
    this.enabled = true;
    this.volume = 0.4;

    // Get or create Web Audio context
    try {
      this.ctx = scene.sound.context || new (window.AudioContext || window.webkitAudioContext)();
    } catch {
      this.enabled = false;
    }
  }

  _gain(vol = 1) {
    const g = this.ctx.createGain();
    g.gain.value = this.volume * vol;
    g.connect(this.ctx.destination);
    return g;
  }

  /** Whoosh sound for axe throw */
  whoosh() {
    if (!this.enabled) return;
    const t = this.ctx.currentTime;
    const dur = 0.25;

    // Filtered noise burst
    const bufferSize = this.ctx.sampleRate * dur;
    const buffer = this.ctx.createBuffer(1, bufferSize, this.ctx.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < bufferSize; i++) {
      data[i] = (Math.random() * 2 - 1) * (1 - i / bufferSize);
    }

    const noise = this.ctx.createBufferSource();
    noise.buffer = buffer;

    const filter = this.ctx.createBiquadFilter();
    filter.type = 'bandpass';
    filter.frequency.setValueAtTime(2000, t);
    filter.frequency.exponentialRampToValueAtTime(500, t + dur);
    filter.Q.value = 2;

    const gain = this._gain(0.3);
    gain.gain.setValueAtTime(0.3 * this.volume, t);
    gain.gain.exponentialRampToValueAtTime(0.01, t + dur);

    noise.connect(filter);
    filter.connect(gain);
    noise.start(t);
    noise.stop(t + dur);
  }

  /** Solid thud when axe hits the board */
  thud() {
    if (!this.enabled) return;
    const t = this.ctx.currentTime;

    const osc = this.ctx.createOscillator();
    osc.type = 'sine';
    osc.frequency.setValueAtTime(120, t);
    osc.frequency.exponentialRampToValueAtTime(40, t + 0.15);

    const gain = this._gain(0.5);
    gain.gain.setValueAtTime(0.5 * this.volume, t);
    gain.gain.exponentialRampToValueAtTime(0.01, t + 0.15);

    osc.connect(gain);
    osc.start(t);
    osc.stop(t + 0.2);
  }

  /** Bright ding for bullseye */
  bullseye() {
    if (!this.enabled) return;
    const t = this.ctx.currentTime;

    [880, 1108, 1320].forEach((freq, i) => {
      const osc = this.ctx.createOscillator();
      osc.type = 'sine';
      osc.frequency.value = freq;

      const gain = this._gain(0.25);
      gain.gain.setValueAtTime(0, t + i * 0.08);
      gain.gain.linearRampToValueAtTime(0.25 * this.volume, t + i * 0.08 + 0.02);
      gain.gain.exponentialRampToValueAtTime(0.01, t + i * 0.08 + 0.4);

      osc.connect(gain);
      osc.start(t + i * 0.08);
      osc.stop(t + i * 0.08 + 0.5);
    });
  }

  /** Short cheer for good throws */
  cheer() {
    if (!this.enabled) return;
    const t = this.ctx.currentTime;

    // Rising tone
    const osc = this.ctx.createOscillator();
    osc.type = 'sawtooth';
    osc.frequency.setValueAtTime(300, t);
    osc.frequency.linearRampToValueAtTime(600, t + 0.15);

    const filter = this.ctx.createBiquadFilter();
    filter.type = 'lowpass';
    filter.frequency.value = 1500;

    const gain = this._gain(0.15);
    gain.gain.setValueAtTime(0.15 * this.volume, t);
    gain.gain.exponentialRampToValueAtTime(0.01, t + 0.3);

    osc.connect(filter);
    filter.connect(gain);
    osc.start(t);
    osc.stop(t + 0.35);
  }

  /** Sad trombone for a miss */
  sadTrombone() {
    if (!this.enabled) return;
    const t = this.ctx.currentTime;

    const notes = [293.66, 277.18, 261.63, 246.94]; // D4 descending
    notes.forEach((freq, i) => {
      const osc = this.ctx.createOscillator();
      osc.type = 'sawtooth';
      osc.frequency.value = freq;

      const filter = this.ctx.createBiquadFilter();
      filter.type = 'lowpass';
      filter.frequency.value = 800;

      const gain = this._gain(0.15);
      const start = t + i * 0.25;
      gain.gain.setValueAtTime(0.15 * this.volume, start);
      gain.gain.exponentialRampToValueAtTime(0.01, start + 0.22);

      osc.connect(filter);
      filter.connect(gain);
      osc.start(start);
      osc.stop(start + 0.25);
    });
  }

  /** Click sound for UI buttons */
  click() {
    if (!this.enabled) return;
    const t = this.ctx.currentTime;

    const osc = this.ctx.createOscillator();
    osc.type = 'sine';
    osc.frequency.value = 600;

    const gain = this._gain(0.2);
    gain.gain.setValueAtTime(0.2 * this.volume, t);
    gain.gain.exponentialRampToValueAtTime(0.01, t + 0.05);

    osc.connect(gain);
    osc.start(t);
    osc.stop(t + 0.06);
  }

  /** Power charging tick sound */
  chargeTick() {
    if (!this.enabled) return;
    const t = this.ctx.currentTime;

    const osc = this.ctx.createOscillator();
    osc.type = 'square';
    osc.frequency.value = 440 + this._lastPower * 4;

    const gain = this._gain(0.05);
    gain.gain.setValueAtTime(0.05 * this.volume, t);
    gain.gain.exponentialRampToValueAtTime(0.001, t + 0.03);

    osc.connect(gain);
    osc.start(t);
    osc.stop(t + 0.04);
  }

  /** Victory fanfare */
  victory() {
    if (!this.enabled) return;
    const t = this.ctx.currentTime;

    const notes = [523.25, 659.25, 783.99, 1046.5]; // C5 E5 G5 C6
    notes.forEach((freq, i) => {
      const osc = this.ctx.createOscillator();
      osc.type = 'sine';
      osc.frequency.value = freq;

      const gain = this._gain(0.2);
      const start = t + i * 0.15;
      gain.gain.setValueAtTime(0, start);
      gain.gain.linearRampToValueAtTime(0.2 * this.volume, start + 0.03);
      gain.gain.exponentialRampToValueAtTime(0.01, start + 0.4);

      osc.connect(gain);
      osc.start(start);
      osc.stop(start + 0.45);
    });
  }

  _lastPower = 50;
  setPowerLevel(power) {
    this._lastPower = power;
  }
}
