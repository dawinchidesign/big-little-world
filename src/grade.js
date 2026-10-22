import Phaser from "phaser";

// Per-region colour grade. Values blend continuously, so crossing a border never snaps.
export const GRADES = {
  0: { r: 1.0, g: 1.04, b: 0.95, sat: 0.16, con: 0.06, light: 1.03 },
  1: { r: 1.07, g: 0.98, b: 0.9, sat: 0.02, con: 0.1, light: 0.98 },
  2: { r: 1.06, g: 1.03, b: 0.92, sat: 0.24, con: 0.05, light: 1.06 },
  3: { r: 0.94, g: 1.02, b: 1.07, sat: 0.12, con: 0.05, light: 1.02 },
  4: { r: 0.95, g: 1.02, b: 1.0, sat: 0.02, con: 0.12, light: 0.95 },
  5: { r: 1.05, g: 1.0, b: 0.92, sat: -0.18, con: 0.08, light: 1.0 },
  6: { r: 1.03, g: 1.04, b: 0.86, sat: -0.1, con: 0.04, light: 1.03 },
  7: { r: 0.9, g: 0.98, b: 1.12, sat: 0.06, con: 0.12, light: 0.96 },
  8: { r: 1.04, g: 1.03, b: 0.95, sat: 0.18, con: 0.06, light: 1.04 },
  water: { r: 0.88, g: 1.02, b: 1.12, sat: 0.1, con: 0.06, light: 1.0 },
  colony: { r: 1.1, g: 0.98, b: 0.86, sat: 0.0, con: 0.12, light: 1.0 },
};
const KEYS = ["r", "g", "b", "sat", "con", "light"];

export class Grade {
  constructor(scene, key = 0) {
    this.scene = scene;
    this.current = { ...GRADES[key] };
    this.target = GRADES[key];
    this.ok = scene.renderer.type === Phaser.WEBGL && !!scene.cameras.main.postFX;
    this.applied = null;
    this.install();
  }
  install() {
    if (!this.ok) return;
    const cam = this.scene.cameras.main,
      low = !!this.scene.app.state.settings.low;
    cam.postFX.clear();
    this.matrix = cam.postFX.addColorMatrix();
    this.vignette = cam.postFX.addVignette(0.5, 0.5, 0.92, low ? 0.18 : 0.3);
    // A gentle bloom lifts dew, glow mushrooms and fireflies; skipped in low-effects mode.
    this.bloom = low ? null : cam.postFX.addBloom(0xffffff, 0.6, 0.6, 1, 0.42, 2);
    this.low = low;
    this.write();
  }
  set(key) {
    this.target = GRADES[key] || GRADES[0];
  }
  update(dt, night = 0) {
    if (!this.ok) return;
    if (this.low !== !!this.scene.app.state.settings.low) this.install();
    const k = 1 - Math.exp(-dt * 1.4);
    let moved = false;
    for (const key of KEYS) {
      const t = this.target[key],
        v = this.current[key];
      if (Math.abs(t - v) > 0.0005) {
        this.current[key] = v + (t - v) * k;
        moved = true;
      }
    }
    if (Math.abs((this.night ?? 0) - night) > 0.001) {
      this.night = (this.night ?? 0) + (night - (this.night ?? 0)) * k;
      moved = true;
    }
    if (moved || !this.applied) this.write();
  }
  write() {
    if (!this.matrix) return;
    const c = this.current,
      n = this.night || 0;
    // Night pulls colour towards moonlit blue without crushing the image.
    const r = c.r * (1 - n * 0.16),
      g = c.g * (1 - n * 0.06),
      b = c.b * (1 + n * 0.1);
    const m = this.matrix;
    m.reset();
    m.multiply([r, 0, 0, 0, 0, 0, g, 0, 0, 0, 0, 0, b, 0, 0, 0, 0, 0, 1, 0], true);
    m.saturate(c.sat - n * 0.12, true);
    m.contrast(c.con, true);
    m.brightness(c.light, true);
    this.applied = true;
  }
  pulse(strength = 0.6, duration = 0.5) {
    if (!this.vignette) return;
    const v = this.vignette,
      base = this.low ? 0.18 : 0.3;
    v.strength = base + strength;
    this.scene.tweens.add({ targets: v, strength: base, duration: duration * 1000, ease: "Sine.easeOut" });
  }
}
