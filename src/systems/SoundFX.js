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
      // Resume AudioContext on first user interaction (browser autoplay policy)
      if (this.ctx.state === 'suspended') {
        const resume = () => {
          this.ctx.resume();
          document.removeEventListener('pointerdown', resume);
          document.removeEventListener('keydown', resume);
        };
        document.addEventListener('pointerdown', resume, { once: false });
        document.addEventListener('keydown', resume, { once: false });
      }
    } catch {
      this.enabled = false;
    }
  }

  _gain(vol = 1) {
    if (this.ctx.state === 'suspended') this.ctx.resume();
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

  // ─── Lo-fi Background Music ────────────────────────────────

  /**
   * Starts a procedural lo-fi chill beat loop.
   * Call stopMusic() to fade it out.
   */
  startMusic() {
    if (!this.enabled || this._musicPlaying) return;
    this._musicPlaying = true;
    this._musicVolume = 0.18;

    // Ensure AudioContext is running (browser autoplay policy)
    if (this.ctx.state === 'suspended') {
      this.ctx.resume();
    }

    // Master gain for music
    this._musicGain = this.ctx.createGain();
    this._musicGain.gain.value = this._musicVolume;
    this._musicGain.connect(this.ctx.destination);

    // Lo-fi filter — warm, muffled sound
    this._musicFilter = this.ctx.createBiquadFilter();
    this._musicFilter.type = 'lowpass';
    this._musicFilter.frequency.value = 900;
    this._musicFilter.Q.value = 1.5;
    this._musicFilter.connect(this._musicGain);

    // Chord progression (jazzy lo-fi: Cmaj7 → Am7 → Fmaj7 → G7)
    this._chords = [
      [261.63, 329.63, 392.00, 493.88],  // Cmaj7
      [220.00, 261.63, 329.63, 392.00],  // Am7
      [174.61, 220.00, 261.63, 329.63],  // Fmaj7
      [196.00, 246.94, 293.66, 349.23],  // G7
    ];
    this._chordIndex = 0;
    this._beatIndex = 0;

    // Tempo: ~75 BPM, each beat = 800ms
    this._beatInterval = 800;
    this._beatsPerChord = 8; // 2 bars per chord

    // Bass notes for each chord
    this._bassNotes = [130.81, 110.00, 87.31, 98.00]; // C3, A2, F2, G2

    // Pentatonic melody notes (C minor pentatonic for that lo-fi feel)
    this._melodyNotes = [261.63, 293.66, 311.13, 392.00, 466.16, 523.25];

    this._scheduleNextBeat();
  }

  _scheduleNextBeat() {
    if (!this._musicPlaying) return;

    const t = this.ctx.currentTime;
    const beat = this._beatIndex % this._beatsPerChord;

    // Advance chord every _beatsPerChord beats
    if (beat === 0 && this._beatIndex > 0) {
      this._chordIndex = (this._chordIndex + 1) % this._chords.length;
    }

    const chord = this._chords[this._chordIndex];
    const bass = this._bassNotes[this._chordIndex];

    // ── Chord pad (every beat, sustained) ──
    if (beat === 0 || beat === 4) {
      this._playChordPad(t, chord);
    }

    // ── Bass (beats 0 and 4) ──
    if (beat === 0 || beat === 4) {
      this._playBass(t, bass);
    }

    // ── Kick drum (beats 0, 4) ──
    if (beat === 0 || beat === 4) {
      this._playKick(t);
    }

    // ── Snare/clap (beats 2, 6) — lazy lo-fi snare ──
    if (beat === 2 || beat === 6) {
      this._playSnare(t);
    }

    // ── Hi-hat (every beat, with swing) ──
    this._playHiHat(t, beat % 2 === 1);

    // ── Melody (random notes on some beats for that wandering feel) ──
    if (Math.random() < 0.35) {
      const delay = Math.random() * 0.15; // slight humanization
      this._playMelodyNote(t + delay);
    }

    // ── Vinyl crackle texture (continuous subtle noise) ──
    if (beat === 0) {
      this._playVinylCrackle(t);
    }

    this._beatIndex++;

    // Schedule next beat
    this._musicTimer = setTimeout(() => {
      this._scheduleNextBeat();
    }, this._beatInterval);
  }

  _playChordPad(t, chord) {
    const dur = this._beatInterval * 4 / 1000; // sustain for 4 beats
    chord.forEach((freq) => {
      const osc = this.ctx.createOscillator();
      osc.type = 'triangle';
      osc.frequency.value = freq;

      // Slight detune for warmth
      osc.detune.value = (Math.random() - 0.5) * 8;

      const g = this.ctx.createGain();
      g.gain.setValueAtTime(0, t);
      g.gain.linearRampToValueAtTime(0.035, t + 0.1);
      g.gain.setValueAtTime(0.035, t + dur - 0.3);
      g.gain.linearRampToValueAtTime(0, t + dur);

      osc.connect(g);
      g.connect(this._musicFilter);
      osc.start(t);
      osc.stop(t + dur);
    });
  }

  _playBass(t, freq) {
    const dur = this._beatInterval * 2 / 1000;
    const osc = this.ctx.createOscillator();
    osc.type = 'sine';
    osc.frequency.value = freq;

    const g = this.ctx.createGain();
    g.gain.setValueAtTime(0.12, t);
    g.gain.exponentialRampToValueAtTime(0.01, t + dur);

    osc.connect(g);
    g.connect(this._musicFilter);
    osc.start(t);
    osc.stop(t + dur);
  }

  _playKick(t) {
    const osc = this.ctx.createOscillator();
    osc.type = 'sine';
    osc.frequency.setValueAtTime(150, t);
    osc.frequency.exponentialRampToValueAtTime(30, t + 0.12);

    const g = this.ctx.createGain();
    g.gain.setValueAtTime(0.2, t);
    g.gain.exponentialRampToValueAtTime(0.001, t + 0.15);

    osc.connect(g);
    g.connect(this._musicGain);
    osc.start(t);
    osc.stop(t + 0.2);
  }

  _playSnare(t) {
    // Noise burst for snare
    const dur = 0.12;
    const bufLen = Math.floor(this.ctx.sampleRate * dur);
    const buf = this.ctx.createBuffer(1, bufLen, this.ctx.sampleRate);
    const data = buf.getChannelData(0);
    for (let i = 0; i < bufLen; i++) {
      data[i] = (Math.random() * 2 - 1) * (1 - i / bufLen);
    }

    const noise = this.ctx.createBufferSource();
    noise.buffer = buf;

    const filter = this.ctx.createBiquadFilter();
    filter.type = 'bandpass';
    filter.frequency.value = 3000;
    filter.Q.value = 0.8;

    const g = this.ctx.createGain();
    g.gain.setValueAtTime(0.08, t);
    g.gain.exponentialRampToValueAtTime(0.001, t + dur);

    noise.connect(filter);
    filter.connect(g);
    g.connect(this._musicGain);
    noise.start(t);
    noise.stop(t + dur);
  }

  _playHiHat(t, isOffbeat) {
    const dur = isOffbeat ? 0.04 : 0.06;
    const vol = isOffbeat ? 0.025 : 0.04;

    const bufLen = Math.floor(this.ctx.sampleRate * dur);
    const buf = this.ctx.createBuffer(1, bufLen, this.ctx.sampleRate);
    const data = buf.getChannelData(0);
    for (let i = 0; i < bufLen; i++) {
      data[i] = (Math.random() * 2 - 1) * (1 - i / bufLen);
    }

    const noise = this.ctx.createBufferSource();
    noise.buffer = buf;

    const filter = this.ctx.createBiquadFilter();
    filter.type = 'highpass';
    filter.frequency.value = 7000;

    const g = this.ctx.createGain();
    g.gain.setValueAtTime(vol, t);
    g.gain.exponentialRampToValueAtTime(0.001, t + dur);

    noise.connect(filter);
    filter.connect(g);
    g.connect(this._musicGain);
    noise.start(t);
    noise.stop(t + dur);
  }

  _playMelodyNote(t) {
    const freq = this._melodyNotes[Math.floor(Math.random() * this._melodyNotes.length)];
    const dur = 0.4 + Math.random() * 0.4;

    const osc = this.ctx.createOscillator();
    osc.type = 'sine';
    osc.frequency.value = freq;
    osc.detune.value = (Math.random() - 0.5) * 10;

    const g = this.ctx.createGain();
    g.gain.setValueAtTime(0, t);
    g.gain.linearRampToValueAtTime(0.04, t + 0.03);
    g.gain.exponentialRampToValueAtTime(0.001, t + dur);

    osc.connect(g);
    g.connect(this._musicFilter);
    osc.start(t);
    osc.stop(t + dur + 0.05);
  }

  _playVinylCrackle(t) {
    // Subtle noise texture — plays for the full chord duration
    const dur = this._beatInterval * this._beatsPerChord / 1000;
    const bufLen = Math.floor(this.ctx.sampleRate * dur);
    const buf = this.ctx.createBuffer(1, bufLen, this.ctx.sampleRate);
    const data = buf.getChannelData(0);

    for (let i = 0; i < bufLen; i++) {
      // Sparse crackle: mostly silence with random pops
      data[i] = Math.random() < 0.002 ? (Math.random() - 0.5) * 0.8 : 0;
    }

    const noise = this.ctx.createBufferSource();
    noise.buffer = buf;

    const filter = this.ctx.createBiquadFilter();
    filter.type = 'bandpass';
    filter.frequency.value = 4000;
    filter.Q.value = 0.5;

    const g = this.ctx.createGain();
    g.gain.value = 0.04;

    noise.connect(filter);
    filter.connect(g);
    g.connect(this._musicGain);
    noise.start(t);
    noise.stop(t + dur);
  }

  /** Fade out and stop the background music */
  stopMusic(fadeDuration = 2000) {
    if (!this._musicPlaying) return;
    this._musicPlaying = false;

    if (this._musicTimer) {
      clearTimeout(this._musicTimer);
      this._musicTimer = null;
    }

    // Fade out the master gain
    if (this._musicGain) {
      const t = this.ctx.currentTime;
      this._musicGain.gain.setValueAtTime(this._musicGain.gain.value, t);
      this._musicGain.gain.linearRampToValueAtTime(0, t + fadeDuration / 1000);
    }
  }

  /** Clean up when scene is destroyed */
  destroy() {
    this.stopMusic(0);
    this._musicPlaying = false;
  }
}
