// Wind streaks and out-of-focus seed fluff in front of the camera during
// dandelion flights. A screen-space canvas above the game, below the HUD.
import { rng } from "./art.js";

const TAU = Math.PI * 2;

export class WindLayer {
  constructor(app) {
    this.app = app;
    this.el = document.createElement("canvas");
    this.el.id = "wind-fx";
    this.el.setAttribute("aria-hidden", "true");
    this.el.hidden = true;
    document.body.append(this.el);
    this.ctx = this.el.getContext("2d");
    const r = rng(902);
    this.streaks = Array.from({ length: 70 }, (_, i) => ({ x: r(), y: r(), d: r(), i }));
    this.power = 0;
    this.vx = 1;
    this.vy = 0;
    window.addEventListener("resize", () => this.size());
    this.size();
  }
  get low() {
    return !!this.app.state.settings.low;
  }
  size() {
    const r = Math.min(2, window.devicePixelRatio || 1);
    this.w = window.innerWidth;
    this.h = window.innerHeight;
    this.el.width = Math.round(this.w * r);
    this.el.height = Math.round(this.h * r);
    this.ctx?.setTransform(r, 0, 0, r, 0, 0);
  }
  start() {
    if (!this.ctx) return;
    this.el.hidden = false;
    this.running = true;
    const loop = () => {
      if (!this.running) return;
      this.draw(performance.now() / 1000);
      this.raf = requestAnimationFrame(loop);
    };
    loop();
  }
  stop() {
    this.running = false;
    this.power = 0;
    cancelAnimationFrame(this.raf);
    this.ctx?.clearRect(0, 0, this.w, this.h);
    this.el.hidden = true;
  }
  draw(t) {
    const c = this.ctx,
      { w, h } = this;
    c.clearRect(0, 0, w, h);
    const p = this.power;
    if (p <= 0.01) return;
    const len = Math.hypot(this.vx, this.vy) || 1,
      ux = -this.vx / len,
      uy = -this.vy / len;
    const n = this.low ? 18 : this.streaks.length;
    for (let i = 0; i < n; i++) {
      const s = this.streaks[i],
        depth = 0.3 + s.d * 0.7,
        speed = (0.6 + depth * 1.6) * p;
      const x = ((((s.x + ux * t * speed * 0.35) % 1) + 1) % 1) * w,
        y = ((((s.y + uy * t * speed * 0.35 + Math.sin(t * 0.7 + i) * 0.01) % 1) + 1) % 1) * h;
      if (i % 5 === 0) {
        const r = 3 + depth * 9;
        const g = c.createRadialGradient(x, y, 0, x, y, r);
        g.addColorStop(0, `rgba(255,252,236,${0.38 * p * depth})`);
        g.addColorStop(1, "rgba(255,252,236,0)");
        c.fillStyle = g;
        c.beginPath();
        c.arc(x, y, r, 0, TAU);
        c.fill();
      } else {
        const L = (18 + depth * 70) * p;
        c.strokeStyle = `rgba(240,248,228,${0.1 + depth * 0.22 * p})`;
        c.lineWidth = depth > 0.75 ? 2 : 1;
        c.beginPath();
        c.moveTo(x, y);
        c.lineTo(x - ux * L, y - uy * L);
        c.stroke();
      }
    }
    const v = c.createRadialGradient(w / 2, h / 2, Math.min(w, h) * 0.35, w / 2, h / 2, Math.max(w, h) * 0.75);
    v.addColorStop(0, "rgba(10,30,30,0)");
    v.addColorStop(1, `rgba(10,30,30,${0.35 * p})`);
    c.fillStyle = v;
    c.fillRect(0, 0, w, h);
  }
}
