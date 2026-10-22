// Generative score. Each region has its own key, tempo, harmony and small ensemble;
// phrases are composed on the fly (motif → answer → variation) so the music never loops audibly.
// Everything runs on the shared Web Audio context that Howler already unlocked.
// Same LCG as art.js, kept local so the score has no dependency on the art pipeline.
const rng = (seed) => {
  let n = seed >>> 0;
  return () => ((n = (Math.imul(n, 1664525) + 1013904223) >>> 0), n / 4294967296);
};

const NOTE = (midi) => 440 * 2 ** ((midi - 69) / 12);
const MODES = {
  major: [0, 2, 4, 5, 7, 9, 11],
  dorian: [0, 2, 3, 5, 7, 9, 10],
  minor: [0, 2, 3, 5, 7, 8, 10],
  lydian: [0, 2, 4, 6, 7, 9, 11],
  phrygian: [0, 1, 3, 5, 7, 8, 10],
  mixolydian: [0, 2, 4, 5, 7, 9, 10],
};
// prog: scale degrees (0-based) per bar; voices: which instruments play.
export const THEMES = {
  0: { root: 50, mode: "dorian", bpm: 82, prog: [0, 3, 6, 4], voices: { pad: 0.5, arp: "kalimba", lead: "flute", bass: 0.55, shaker: 0.25 }, density: 0.7, bright: 1400 },
  1: { root: 45, mode: "minor", bpm: 76, prog: [0, 5, 3, 4], voices: { pad: 0.45, arp: "marimba", lead: null, bass: 0.6, wood: 0.35 }, density: 0.8, bright: 1100 },
  2: { root: 52, mode: "major", bpm: 96, prog: [0, 4, 5, 3], voices: { pad: 0.4, arp: "kalimba", lead: "bell", bass: 0.5, shaker: 0.3 }, density: 0.85, bright: 2200 },
  3: { root: 48, mode: "lydian", bpm: 66, prog: [0, 1, 0, 4], voices: { pad: 0.6, arp: "harp", lead: "flute", bass: 0.4 }, density: 0.55, bright: 1700 },
  4: { root: 43, mode: "phrygian", bpm: 60, prog: [0, 1, 0, 6], voices: { pad: 0.6, arp: null, lead: "bell", bass: 0.5, drip: 0.5 }, density: 0.35, bright: 800 },
  5: { root: 45, mode: "minor", bpm: 70, prog: [0, 6, 5, 4], voices: { pad: 0.45, arp: "harp", lead: "bell", bass: 0.4 }, density: 0.4, bright: 1000 },
  6: { root: 44, mode: "phrygian", bpm: 64, prog: [0, 1, 6, 1], voices: { pad: 0.55, arp: null, lead: "flute", bass: 0.35 }, density: 0.3, bright: 700 },
  7: { root: 47, mode: "minor", bpm: 58, prog: [0, 5, 2, 6], voices: { pad: 0.55, arp: "celesta", lead: "flute", bass: 0.4, twinkle: 0.5 }, density: 0.45, bright: 1200 },
  8: { root: 50, mode: "major", bpm: 88, prog: [0, 5, 3, 4], voices: { pad: 0.45, arp: "kalimba", lead: "flute", bass: 0.55, shaker: 0.22 }, density: 0.8, bright: 1900 },
  water: { root: 48, mode: "lydian", bpm: 56, prog: [0, 4, 1, 4], voices: { pad: 0.65, arp: "harp", lead: "bell", bass: 0.35, drip: 0.35 }, density: 0.45, bright: 1100 },
  colony: { root: 45, mode: "dorian", bpm: 72, prog: [0, 3, 0, 4], voices: { pad: 0.5, arp: "marimba", lead: null, bass: 0.6, wood: 0.4 }, density: 0.75, bright: 1000 },
};

export class MusicEngine {
  constructor() {
    this.ctx = null;
    this.theme = null;
    this.volume = 0.3;
    this.muted = false;
    this.rate = 1;
    this.r = rng(8128);
  }
  get ready() {
    return !!this.ctx;
  }
  attach(ctx) {
    if (this.ctx || !ctx) return !!this.ctx;
    this.ctx = ctx;
    this.out = ctx.createGain();
    this.out.gain.value = this.muted ? 0 : this.volume;
    // Gentle bus: low shelf warmth into a soft compressor, plus a generated hall reverb send.
    this.comp = ctx.createDynamicsCompressor();
    this.comp.threshold.value = -20;
    this.comp.ratio.value = 3;
    this.comp.attack.value = 0.02;
    this.comp.release.value = 0.3;
    this.reverb = ctx.createConvolver();
    this.reverb.buffer = this.impulse(3.2);
    this.wet = ctx.createGain();
    this.wet.gain.value = 0.45;
    this.reverb.connect(this.wet).connect(this.comp);
    this.comp.connect(this.out).connect(ctx.destination);
    return true;
  }
  impulse(seconds) {
    const ctx = this.ctx,
      len = Math.floor(ctx.sampleRate * seconds),
      buf = ctx.createBuffer(2, len, ctx.sampleRate),
      r = rng(31);
    for (let ch = 0; ch < 2; ch++) {
      const d = buf.getChannelData(ch);
      let lp = 0;
      for (let i = 0; i < len; i++) {
        lp += ((r() * 2 - 1) - lp) * (0.55 - 0.4 * (i / len));
        d[i] = lp * Math.pow(1 - i / len, 2.6);
      }
    }
    return buf;
  }
  setVolume(v) {
    this.volume = v;
    if (this.out) this.out.gain.setTargetAtTime(this.muted ? 0 : v, this.ctx.currentTime, 0.2);
  }
  mute(m) {
    this.muted = m;
    this.setVolume(this.volume);
  }
  perspective(human) {
    this.rate = human ? 0.8 : 1;
  }
  // Switch to a region theme with a slow crossfade; old notes ring out under the new bus.
  play(key, night = false) {
    if (!this.ctx) return;
    const T = THEMES[key] || THEMES[0];
    if (this.theme && this.theme.key === key && this.theme.night === night) return;
    const now = this.ctx.currentTime;
    if (this.theme) {
      this.theme.bus.gain.setTargetAtTime(0, now, 0.9);
      const old = this.theme.bus;
      setTimeout(() => old.disconnect(), 6000);
    }
    const bus = this.ctx.createGain();
    bus.gain.value = 0;
    bus.gain.setTargetAtTime(1, now + 0.3, 1.2);
    const filter = this.ctx.createBiquadFilter();
    filter.type = "lowpass";
    filter.frequency.value = T.bright * (night ? 0.6 : 1);
    filter.Q.value = 0.4;
    bus.connect(filter);
    filter.connect(this.comp);
    filter.connect(this.reverb);
    const scale = MODES[T.mode];
    this.theme = { key, night, T, bus, scale, bar: 0, next: Math.max(now + 0.4, this.theme?.next || 0), motif: null };
    if (!this.timer) this.timer = setInterval(() => this.schedule(), 120);
  }
  stop() {
    clearInterval(this.timer);
    this.timer = null;
    if (this.theme) this.theme.bus.gain.setTargetAtTime(0, this.ctx.currentTime, 0.5);
    this.theme = null;
  }
  degree(d, octave = 0) {
    const s = this.theme.scale,
      n = s.length,
      o = Math.floor(d / n);
    return this.theme.T.root + s[((d % n) + n) % n] + 12 * (o + octave);
  }
  // Look ahead ~0.6s and lay down whole bars as they come due.
  schedule() {
    const th = this.theme;
    if (!th || !this.ctx) return;
    if (this.ctx.state !== "running") return;
    // After a suspended context (hidden tab), skip missed bars instead of firing them at once.
    if (th.next < this.ctx.currentTime - 0.1) th.next = this.ctx.currentTime + 0.1;
    const ahead = this.ctx.currentTime + 0.6;
    while (th.next < ahead) {
      this.bar(th, th.next);
      th.next += (60 / th.T.bpm) * 4;
      th.bar++;
    }
  }
  bar(th, t0) {
    const { T, night } = th,
      V = T.voices,
      beat = 60 / T.bpm,
      chord = T.prog[th.bar % T.prog.length],
      dens = T.density * (night ? 0.65 : 1),
      r = this.r;
    const tones = [chord, chord + 2, chord + 4];
    // Pad: sustained voicing, renewed every two bars.
    if (V.pad && th.bar % 2 === 0)
      for (const d of [...tones, chord + 7]) this.pad(this.degree(d, 0), t0, beat * 8.4, V.pad * 0.05);
    // Bass: root on 1, fifth or root on 3.
    if (V.bass) {
      this.bass(this.degree(chord, -1), t0, beat * 1.8, V.bass * 0.16);
      if (r() < 0.8) this.bass(this.degree(chord + (r() < 0.5 ? 4 : 0), -1), t0 + beat * 2, beat * 1.6, V.bass * 0.12);
    }
    // Arpeggio: chord tones in eighths, thinned by density.
    if (V.arp) {
      const pattern = [0, 1, 2, 3, 2, 1, 0, 2];
      for (let i = 0; i < 8; i++) {
        if (r() > dens && i % 2) continue;
        const d = tones[pattern[i] % 3] + (pattern[i] === 3 ? 7 : 0);
        const swing = i % 2 ? beat * 0.06 : 0;
        this.tone(V.arp, this.degree(d, 1), t0 + i * beat * 0.5 + swing, beat * 1.4, 0.07 * (i % 4 === 0 ? 1 : 0.7));
      }
    }
    // Melody: a two-bar motif, answered, varied and returned (A A' B A).
    if (V.lead) {
      const section = th.bar % 8;
      if (section === 0 || !th.motif) th.motif = this.compose(r);
      const answer = section === 2 || section === 3,
        vary = section >= 4 && section < 6,
        rest = section === 7 && r() < 0.6;
      if (!rest) {
        const half = (section % 2) * 4;
        for (const n of th.motif.slice(half, half + 4)) {
          if (!n || r() > dens + 0.25) continue;
          const d = n.d + (answer ? 2 : 0) + (vary && r() < 0.4 ? (r() < 0.5 ? 1 : -1) : 0);
          this.tone(V.lead, this.degree(d, V.lead === "bell" ? 2 : 1), t0 + n.at * beat, n.len * beat, V.lead === "bell" ? 0.05 : 0.06);
        }
      }
    }
    // Small percussion and textures.
    if (V.shaker && !night)
      for (let i = 0; i < 8; i++) if (r() < 0.75) this.noise(t0 + i * beat * 0.5 + (i % 2 ? beat * 0.06 : 0), 0.05, 6000, V.shaker * (i % 2 ? 0.035 : 0.055));
    if (V.wood) for (const i of [0, 3, 6]) if (r() < 0.8) this.tone("wood", this.degree(chord + (i === 6 ? 4 : 0), 1), t0 + i * beat * 0.5, 0.2, V.wood * 0.08);
    if (V.drip && r() < 0.7) this.tone("drop", this.degree(chord + 7 + Math.floor(r() * 5), 2), t0 + r() * beat * 4, 0.3, V.drip * 0.06);
    if ((V.twinkle || night) && r() < 0.6)
      for (let i = 0; i < 3; i++) this.tone("celesta", this.degree(tones[i] + 7, 2), t0 + beat * (1 + i * 0.75 + r()), beat, 0.025);
  }
  compose(r) {
    // Eight half-bar cells; steps lean towards small intervals, ending on a chord tone.
    const out = [];
    let d = [0, 2, 4][Math.floor(r() * 3)];
    for (let cell = 0; cell < 8; cell++) {
      if (r() < 0.25) {
        out.push(null);
        continue;
      }
      const step = [-2, -1, -1, 0, 1, 1, 2, 3][Math.floor(r() * 8)];
      d = Math.max(-2, Math.min(9, d + step));
      const at = (cell % 4) * 1 + (r() < 0.3 ? 0.5 : 0);
      out.push({ d: cell === 7 ? Math.round(d / 2) * 2 : d, at, len: r() < 0.35 ? 1.6 : 0.9 });
    }
    return out;
  }
  env(g, t, a, peak, dur, release) {
    g.gain.setValueAtTime(0.0001, t);
    g.gain.linearRampToValueAtTime(peak, t + a);
    g.gain.setTargetAtTime(0.0001, t + Math.max(a, dur), release);
  }
  pad(midi, t, dur, level) {
    const c = this.ctx,
      g = c.createGain(),
      f = c.createBiquadFilter();
    f.type = "lowpass";
    f.frequency.setValueAtTime(500, t);
    f.frequency.linearRampToValueAtTime(1100, t + dur * 0.5);
    f.frequency.linearRampToValueAtTime(600, t + dur);
    this.env(g, t, 2.2, level, dur - 2.5, 1.4);
    g.connect(this.theme.bus);
    f.connect(g);
    for (const det of [-7, 6]) {
      const o = c.createOscillator();
      o.type = "sawtooth";
      o.frequency.value = NOTE(midi) * this.rate;
      o.detune.value = det;
      o.connect(f);
      o.start(t);
      o.stop(t + dur + 6);
    }
  }
  bass(midi, t, dur, level) {
    const c = this.ctx,
      o = c.createOscillator(),
      g = c.createGain();
    o.type = "triangle";
    o.frequency.value = NOTE(midi) * this.rate;
    this.env(g, t, 0.04, level, dur * 0.6, 0.25);
    o.connect(g).connect(this.theme.bus);
    o.start(t);
    o.stop(t + dur + 2);
  }
  tone(kind, midi, t, dur, level) {
    const c = this.ctx,
      g = c.createGain(),
      f = NOTE(midi) * this.rate;
    g.connect(this.theme.bus);
    const osc = (type, freq, gain = 1) => {
      const o = c.createOscillator(),
        og = c.createGain();
      o.type = type;
      o.frequency.value = freq;
      og.gain.value = gain;
      o.connect(og).connect(g);
      o.start(t);
      o.stop(t + dur + 3);
      return o;
    };
    if (kind === "kalimba" || kind === "harp") {
      osc("sine", f);
      osc("sine", f * 2.01, kind === "kalimba" ? 0.25 : 0.12);
      osc("triangle", f, 0.3);
      this.env(g, t, 0.005, level, 0.02, kind === "harp" ? 0.6 : 0.35);
    } else if (kind === "marimba" || kind === "wood") {
      osc("sine", f);
      osc("sine", f * 4, 0.15);
      this.env(g, t, 0.003, level, 0.01, kind === "wood" ? 0.05 : 0.18);
    } else if (kind === "bell" || kind === "celesta" || kind === "drop") {
      // Two-operator FM bell.
      const mod = c.createOscillator(),
        mg = c.createGain();
      mod.frequency.value = f * (kind === "drop" ? 1.5 : 3.5);
      mg.gain.setValueAtTime(f * (kind === "celesta" ? 1.2 : 2.2), t);
      mg.gain.setTargetAtTime(0, t, kind === "drop" ? 0.05 : 0.4);
      const car = osc("sine", f);
      mod.connect(mg).connect(car.frequency);
      mod.start(t);
      mod.stop(t + dur + 3);
      if (kind === "drop") car.frequency.setTargetAtTime(f * 1.6, t, 0.08);
      this.env(g, t, 0.004, level, 0.02, kind === "drop" ? 0.12 : 0.9);
    } else if (kind === "flute") {
      const o = osc("triangle", f),
        vib = c.createOscillator(),
        vg = c.createGain();
      osc("sine", f * 2, 0.08);
      vib.frequency.value = 5.2;
      vg.gain.setValueAtTime(0, t);
      vg.gain.linearRampToValueAtTime(f * 0.006, t + 0.4);
      vib.connect(vg).connect(o.frequency);
      vib.start(t);
      vib.stop(t + dur + 3);
      this.env(g, t, 0.12, level, dur * 0.85, 0.25);
    }
  }
  noise(t, dur, cutoff, level) {
    const c = this.ctx;
    if (!this.noiseBuf) {
      const b = c.createBuffer(1, c.sampleRate * 0.5, c.sampleRate),
        d = b.getChannelData(0),
        r = rng(5);
      for (let i = 0; i < d.length; i++) d[i] = r() * 2 - 1;
      this.noiseBuf = b;
    }
    const s = c.createBufferSource(),
      f = c.createBiquadFilter(),
      g = c.createGain();
    s.buffer = this.noiseBuf;
    f.type = "highpass";
    f.frequency.value = cutoff;
    this.env(g, t, 0.003, level, dur * 0.3, dur * 0.4);
    s.connect(f).connect(g).connect(this.theme.bus);
    s.start(t, this.r() * 0.4);
    s.stop(t + dur + 0.5);
  }
}
