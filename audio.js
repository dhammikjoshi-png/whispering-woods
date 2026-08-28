// ============================================================
// AUDIO.JS — Procedural ambient sound + SFX
// No audio files needed — everything is generated with the
// Web Audio API. Kept minimal and toggleable.
// ============================================================

const AudioSys = {
  ctx: null,
  enabled: true,
  ambientNodes: [],
  currentAmbient: null,

  init() {
    if (this.ctx) return;
    try {
      this.ctx = new (window.AudioContext || window.webkitAudioContext)();
    } catch (e) {
      this.ctx = null;
    }
  },

  resume() {
    if (this.ctx && this.ctx.state === "suspended") this.ctx.resume();
  },

  // Short blip for dialogue advance / UI taps
  blip(freq = 440, dur = 0.05) {
    if (!this.enabled || !this.ctx) return;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    osc.type = "square";
    osc.frequency.value = freq;
    gain.gain.setValueAtTime(0.05, this.ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, this.ctx.currentTime + dur);
    osc.connect(gain).connect(this.ctx.destination);
    osc.start();
    osc.stop(this.ctx.currentTime + dur);
  },

  // Combat hit sound
  hit() {
    if (!this.enabled || !this.ctx) return;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    osc.type = "sawtooth";
    osc.frequency.setValueAtTime(180, this.ctx.currentTime);
    osc.frequency.exponentialRampToValueAtTime(60, this.ctx.currentTime + 0.12);
    gain.gain.setValueAtTime(0.12, this.ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, this.ctx.currentTime + 0.15);
    osc.connect(gain).connect(this.ctx.destination);
    osc.start();
    osc.stop(this.ctx.currentTime + 0.15);
  },

  // Chime for pickups/story beats
  chime() {
    if (!this.enabled || !this.ctx) return;
    [523, 659, 784].forEach((f, i) => {
      setTimeout(() => this.blip(f, 0.18), i * 90);
    });
  },

  // Soft ambient pad loop for a given "mood" (village / forest / mystery)
  setAmbient(mood) {
    if (!this.enabled || !this.ctx) return;
    if (this.currentAmbient === mood) return;
    this.stopAmbient();
    this.currentAmbient = mood;

    const moods = {
      village: { freqs: [130.8, 164.8], vol: 0.02 },
      forest: { freqs: [110, 146.8], vol: 0.018 },
      mystery: { freqs: [98, 116.5, 155.6], vol: 0.022 },
    };
    const m = moods[mood];
    if (!m) return;

    m.freqs.forEach((f) => {
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();
      osc.type = "sine";
      osc.frequency.value = f;
      gain.gain.value = 0;
      osc.connect(gain).connect(this.ctx.destination);
      osc.start();
      gain.gain.linearRampToValueAtTime(m.vol, this.ctx.currentTime + 1.5);
      this.ambientNodes.push({ osc, gain });
    });
  },

  stopAmbient() {
    this.ambientNodes.forEach(({ osc, gain }) => {
      try {
        if (this.ctx) {
          gain.gain.linearRampToValueAtTime(0, this.ctx.currentTime + 0.6);
          osc.stop(this.ctx.currentTime + 0.7);
        }
      } catch (e) {}
    });
    this.ambientNodes = [];
    this.currentAmbient = null;
  },

  toggle() {
    this.enabled = !this.enabled;
    if (!this.enabled) this.stopAmbient();
    return this.enabled;
  },
};
