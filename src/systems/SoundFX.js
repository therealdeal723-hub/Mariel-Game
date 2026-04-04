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
      // Prefer Phaser's WebAudio context if available
      const phaserCtx = scene.sound && scene.sound.context;
      this.ctx = phaserCtx || new (window.AudioContext || window.webkitAudioContext)();
    } catch {
      this.enabled = false;
    }
  }

  /**
   * Ensure AudioContext is running. Returns a Promise that resolves
   * once the context is in the 'running' state.
   */
  _ensureContext() {
    if (!this.ctx) return Promise.resolve();
    if (this.ctx.state === 'running') return Promise.resolve();
    return this.ctx.resume();
  }

  _gain(vol = 1) {
    // Resume context synchronously if possible (already running is a no-op)
    if (this.ctx && this.ctx.state === 'suspended') {
      this.ctx.resume();
    }
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

  /** Rap air horn — three stacked blasts */
  airHorn() {
    if (!this.enabled) return;
    const t = this.ctx.currentTime;

    // Three horn blasts with slight overlap
    const blasts = [0, 0.12, 0.28];
    blasts.forEach((offset) => {
      const start = t + offset;
      const dur = 0.18;

      // Main horn tone (sawtooth for that buzzy brass)
      const osc = this.ctx.createOscillator();
      osc.type = 'sawtooth';
      osc.frequency.setValueAtTime(520, start);
      osc.frequency.linearRampToValueAtTime(490, start + dur);

      // Second harmonic for thickness
      const osc2 = this.ctx.createOscillator();
      osc2.type = 'sawtooth';
      osc2.frequency.setValueAtTime(523, start);
      osc2.frequency.linearRampToValueAtTime(495, start + dur);
      osc2.detune.value = 8;

      // Bandpass to shape it like a horn
      const filter = this.ctx.createBiquadFilter();
      filter.type = 'bandpass';
      filter.frequency.value = 800;
      filter.Q.value = 1.5;

      const gain = this._gain(0.35);
      gain.gain.setValueAtTime(0, start);
      gain.gain.linearRampToValueAtTime(0.35 * this.volume, start + 0.01);
      gain.gain.setValueAtTime(0.35 * this.volume, start + dur * 0.7);
      gain.gain.exponentialRampToValueAtTime(0.01, start + dur);

      osc.connect(filter);
      osc2.connect(filter);
      filter.connect(gain);
      osc.start(start);
      osc.stop(start + dur + 0.05);
      osc2.start(start);
      osc2.stop(start + dur + 0.05);
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

  /** Soft typewriter tick for dialogue text reveal */
  typewriterTick() {
    if (!this.enabled) return;
    const t = this.ctx.currentTime;

    const osc = this.ctx.createOscillator();
    osc.type = 'square';
    osc.frequency.value = 800 + Math.random() * 200; // slight pitch variation

    const gain = this._gain(0.06);
    gain.gain.setValueAtTime(0.06 * this.volume, t);
    gain.gain.exponentialRampToValueAtTime(0.001, t + 0.025);

    const filter = this.ctx.createBiquadFilter();
    filter.type = 'highpass';
    filter.frequency.value = 600;

    osc.connect(filter);
    filter.connect(gain);
    osc.start(t);
    osc.stop(t + 0.03);
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

  /**
   * Start a continuous charging tone that tracks the power meter.
   * The pitch rises/falls with the power level.
   */
  startChargeTone() {
    if (!this.enabled || this._chargeOsc) return;
    this._ensureContext();

    // Main oscillator — pitch follows power level
    this._chargeOsc = this.ctx.createOscillator();
    this._chargeOsc.type = 'sine';
    this._chargeOsc.frequency.value = 220;

    // Sub oscillator for body
    this._chargeSubOsc = this.ctx.createOscillator();
    this._chargeSubOsc.type = 'triangle';
    this._chargeSubOsc.frequency.value = 110;

    // Gain nodes
    this._chargeGain = this.ctx.createGain();
    this._chargeGain.gain.value = 0;
    this._chargeSubGain = this.ctx.createGain();
    this._chargeSubGain.gain.value = 0;

    // Low-pass filter to keep it smooth
    this._chargeFilter = this.ctx.createBiquadFilter();
    this._chargeFilter.type = 'lowpass';
    this._chargeFilter.frequency.value = 1200;
    this._chargeFilter.Q.value = 2;

    this._chargeOsc.connect(this._chargeGain);
    this._chargeSubOsc.connect(this._chargeSubGain);
    this._chargeGain.connect(this._chargeFilter);
    this._chargeSubGain.connect(this._chargeFilter);
    this._chargeFilter.connect(this.ctx.destination);

    this._chargeOsc.start();
    this._chargeSubOsc.start();

    // Fade in
    const t = this.ctx.currentTime;
    this._chargeGain.gain.setValueAtTime(0, t);
    this._chargeGain.gain.linearRampToValueAtTime(0.06 * this.volume, t + 0.1);
    this._chargeSubGain.gain.setValueAtTime(0, t);
    this._chargeSubGain.gain.linearRampToValueAtTime(0.04 * this.volume, t + 0.1);
  }

  /**
   * Update the charging tone to match the current power level (0-100).
   */
  updateChargeTone(power) {
    if (!this._chargeOsc) return;
    // Map power 0-100 to frequency 220-880 Hz (2 octaves)
    const freq = 220 + (power / 100) * 660;
    const subFreq = 110 + (power / 100) * 330;
    const t = this.ctx.currentTime;

    this._chargeOsc.frequency.setTargetAtTime(freq, t, 0.02);
    this._chargeSubOsc.frequency.setTargetAtTime(subFreq, t, 0.02);

    // Filter opens up at higher power
    this._chargeFilter.frequency.setTargetAtTime(800 + power * 12, t, 0.02);

    // Volume increases slightly at higher power
    const vol = (0.04 + (power / 100) * 0.05) * this.volume;
    this._chargeGain.gain.setTargetAtTime(vol, t, 0.02);
  }

  /**
   * Stop the charging tone (fade out quickly).
   */
  stopChargeTone() {
    if (!this._chargeOsc) return;
    const t = this.ctx.currentTime;

    this._chargeGain.gain.setTargetAtTime(0, t, 0.03);
    this._chargeSubGain.gain.setTargetAtTime(0, t, 0.03);

    // Clean up after fade
    const osc = this._chargeOsc;
    const subOsc = this._chargeSubOsc;
    const gain = this._chargeGain;
    const subGain = this._chargeSubGain;
    const filter = this._chargeFilter;

    this._chargeOsc = null;
    this._chargeSubOsc = null;
    this._chargeGain = null;
    this._chargeSubGain = null;
    this._chargeFilter = null;

    setTimeout(() => {
      osc.stop();
      subOsc.stop();
      gain.disconnect();
      subGain.disconnect();
      filter.disconnect();
    }, 150);
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

    // Clean up any stale kickoff listeners from a previous instance
    if (this._musicKickoff) {
      document.removeEventListener('pointerdown', this._musicKickoff);
      document.removeEventListener('keydown', this._musicKickoff);
      this._musicKickoff = null;
    }

    // If the AudioContext is suspended (browser autoplay policy),
    // wait for a user gesture to resume it, then start playback.
    if (this.ctx.state !== 'running') {
      this._musicKickoff = () => {
        document.removeEventListener('pointerdown', this._musicKickoff);
        document.removeEventListener('keydown', this._musicKickoff);
        this._musicKickoff = null;
        this.ctx.resume().then(() => {
          if (this._musicPlaying && !this._musicGain) this._initMusicGraph();
        });
      };
      document.addEventListener('pointerdown', this._musicKickoff);
      document.addEventListener('keydown', this._musicKickoff);
      return;
    }

    this._initMusicGraph();
  }

  _initMusicGraph() {
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

  // ─── Cozy Lo-fi Music (for Unpacking stage) ─────────────────────

  /**
   * Starts a warmer, cozier lo-fi music loop distinct from the default.
   * Slower tempo, warmer chords, gentle piano-like melody, rain texture.
   */
  startCozyMusic() {
    if (!this.enabled || this._musicPlaying) return;
    this._musicPlaying = true;
    this._musicVolume = 0.16;

    if (this._musicKickoff) {
      document.removeEventListener('pointerdown', this._musicKickoff);
      document.removeEventListener('keydown', this._musicKickoff);
      this._musicKickoff = null;
    }

    if (this.ctx.state !== 'running') {
      this._musicKickoff = () => {
        document.removeEventListener('pointerdown', this._musicKickoff);
        document.removeEventListener('keydown', this._musicKickoff);
        this._musicKickoff = null;
        this.ctx.resume().then(() => {
          if (this._musicPlaying && !this._musicGain) this._initCozyMusicGraph();
        });
      };
      document.addEventListener('pointerdown', this._musicKickoff);
      document.addEventListener('keydown', this._musicKickoff);
      return;
    }

    this._initCozyMusicGraph();
  }

  _initCozyMusicGraph() {
    this._musicGain = this.ctx.createGain();
    this._musicGain.gain.value = this._musicVolume;
    this._musicGain.connect(this.ctx.destination);

    // Extra warm filter
    this._musicFilter = this.ctx.createBiquadFilter();
    this._musicFilter.type = 'lowpass';
    this._musicFilter.frequency.value = 750;
    this._musicFilter.Q.value = 0.8;
    this._musicFilter.connect(this._musicGain);

    // Dreamy chord progression (Dmaj7 → Bm7 → Gmaj7 → A7sus4)
    this._chords = [
      [293.66, 369.99, 440.00, 554.37],  // Dmaj7
      [246.94, 293.66, 369.99, 440.00],  // Bm7
      [196.00, 246.94, 293.66, 369.99],  // Gmaj7
      [220.00, 293.66, 329.63, 440.00],  // A7sus4
    ];
    this._chordIndex = 0;
    this._beatIndex = 0;

    // Slower tempo: ~60 BPM
    this._beatInterval = 1000;
    this._beatsPerChord = 8;

    this._bassNotes = [146.83, 123.47, 98.00, 110.00]; // D3, B2, G2, A2
    this._melodyNotes = [293.66, 329.63, 369.99, 440.00, 493.88, 587.33]; // D major pentatonic

    this._scheduleNextBeat();
  }

  /** Clean up when scene is destroyed */
  destroy() {
    this.stopChargeTone();
    this.stopMusic(0);
    this._musicPlaying = false;

    // Remove any pending kickoff listener
    if (this._musicKickoff) {
      document.removeEventListener('pointerdown', this._musicKickoff);
      document.removeEventListener('keydown', this._musicKickoff);
      this._musicKickoff = null;
    }
  }
}
