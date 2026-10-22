import { rng } from "./art.js";

// Quiet title atmosphere: slow light from the painted sun, a few out-of-focus pollen motes,
// and a painting that leans a little towards the cursor. Nothing competes with the type.
const TAU = Math.PI * 2;
// Headless test DOMs have no compositor; decorative motion would only slow them down.
export const HEADLESS = typeof navigator !== "undefined" && /jsdom/i.test(navigator.userAgent);

export class MenuFX {
  constructor(app) {
    this.app = app;
    this.r = rng(4242);
    this.motes = [];
    this.mouse = { x: 0.5, y: 0.5, tx: 0.5, ty: 0.5 };
    this.running = false;
  }
  get low() {
    return !!this.app.state.settings.low || matchMedia("(prefers-reduced-motion:reduce)").matches;
  }
  mount(root) {
    if (HEADLESS) return;
    this.root = root;
    this.canvas = root.querySelector(".menu-fx");
    this.ctx = this.canvas?.getContext("2d") || null;
    if (!this.ctx) return;
    this.size();
    if (!this.motes.length)
      for (let i = 0; i < 22; i++)
        this.motes.push({ x: this.r(), y: this.r(), d: this.r(), p: this.r() * TAU, v: 0.4 + this.r() });
    if (!this.bound) {
      this.bound = true;
      window.addEventListener("resize", () => this.running && this.size());
      window.addEventListener("pointermove", (e) => {
        this.mouse.tx = e.clientX / innerWidth;
        this.mouse.ty = e.clientY / innerHeight;
      });
    }
    this.start();
  }
  size() {
    const dpr = Math.min(2, window.devicePixelRatio || 1);
    this.w = innerWidth;
    this.h = innerHeight;
    this.canvas.width = Math.round(this.w * dpr);
    this.canvas.height = Math.round(this.h * dpr);
    this.ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  }
  start() {
    if (this.running || !this.ctx) return;
    this.running = true;
    this.last = performance.now();
    const loop = (now) => {
      if (!this.running) return;
      if (this.root.hidden || !this.root.isConnected) return this.stop();
      const dt = Math.min(0.05, (now - this.last) / 1000);
      this.last = now;
      this.frame(dt, now / 1000);
      this.raf = requestAnimationFrame(loop);
    };
    this.raf = requestAnimationFrame(loop);
  }
  stop() {
    this.running = false;
    cancelAnimationFrame(this.raf);
  }
  frame(dt, t) {
    const c = this.ctx,
      { w, h } = this,
      m = this.mouse,
      low = this.low;
    m.x += (m.tx - m.x) * Math.min(1, dt * 2);
    m.y += (m.ty - m.y) * Math.min(1, dt * 2);
    if (!low) {
      this.root.style.setProperty("--mx", (m.x - 0.5).toFixed(4));
      this.root.style.setProperty("--my", (m.y - 0.5).toFixed(4));
    }
    c.clearRect(0, 0, w, h);
    if (low) return;
    // Two broad, slow light shafts from the sun at the top right of the painting.
    c.save();
    c.globalCompositeOperation = "screen";
    for (let i = 0; i < 2; i++) {
      const x = w * (0.8 + i * 0.07) - (m.x - 0.5) * 30;
      const a = 0.05 + 0.03 * Math.sin(t * 0.25 + i * 2.1);
      const g = c.createLinearGradient(x, 0, x - w * 0.35, h);
      g.addColorStop(0, `rgba(255,205,130,${a})`);
      g.addColorStop(0.7, "rgba(255,205,130,0)");
      c.fillStyle = g;
      c.beginPath();
      c.moveTo(x - 40, 0);
      c.lineTo(x + 60, 0);
      c.lineTo(x - w * 0.35 + 160, h);
      c.lineTo(x - w * 0.35 - 120, h);
      c.closePath();
      c.fill();
    }
    c.restore();
    // Pollen motes, mostly in the lit right half, drifting up and with the breeze.
    for (const p of this.motes) {
      const x = ((0.35 + 0.65 * ((p.x + t * 0.006 * p.v) % 1)) * w) - (m.x - 0.5) * 50 * p.d,
        y = ((((p.y - t * 0.01 * p.v) % 1) + 1) % 1) * h + Math.sin(t * 0.5 + p.p) * 12 - (m.y - 0.5) * 30 * p.d;
      const r = 1.2 + p.d * p.d * 7,
        a = (0.25 + 0.25 * Math.sin(t * 0.8 + p.p)) * (1 - p.d * 0.5);
      const g = c.createRadialGradient(x, y, 0, x, y, r);
      g.addColorStop(0, `rgba(255,240,200,${a})`);
      g.addColorStop(1, "rgba(255,240,200,0)");
      c.fillStyle = g;
      c.beginPath();
      c.arc(x, y, r, 0, TAU);
      c.fill();
    }
  }
}
