import { gsap } from "gsap";
import { rng } from "./art.js";

// Screen-space transitions drawn on one DOM canvas above the game view.
// Each effect is a pure function of progress (0 → covered → 1) so GSAP owns timing.
const TAU = Math.PI * 2;
const mix = (a, b, t) => a + (b - a) * t;
const ease = (t) => t * t * (3 - 2 * t);

export class TransitionLayer {
  constructor(app) {
    this.app = app;
    this.el = document.createElement("canvas");
    this.el.id = "wipe";
    this.el.setAttribute("aria-hidden", "true");
    this.el.hidden = true;
    document.body.append(this.el);
    this.ctx = this.el.getContext("2d");
    this.seed = rng(901);
    this.flecks = Array.from({ length: 90 }, () => ({
      x: this.seed(),
      y: this.seed(),
      s: this.seed(),
      v: this.seed(),
    }));
    this.busy = false;
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
  // Runs cover → onCover() → reveal. Resolves after the reveal.
  play(kind, onCover, { cover = 0.85, hold = 0.12, reveal = 0.95, origin } = {}) {
    if (!this.ctx) {
      onCover?.();
      return Promise.resolve();
    }
    this.kill();
    this.busy = true;
    this.kind = kind;
    this.origin = origin || { x: 0.5, y: 0.55 };
    this.el.hidden = false;
    const state = { p: 0 };
    const draw = () => this.draw(kind, state.p, performance.now() / 1000);
    return new Promise((resolve) => {
      this.timeline = gsap
        .timeline({
          onComplete: () => {
            this.clear();
            resolve();
          },
        })
        .to(state, { p: 0.5, duration: this.low ? cover * 0.6 : cover, ease: "power2.in", onUpdate: draw })
        .add(() => {
          try {
            onCover?.();
          } catch (error) {
            console.error(error);
          }
        })
        .to(state, { p: 0.5, duration: hold, onUpdate: draw })
        .to(state, { p: 1, duration: this.low ? reveal * 0.6 : reveal, ease: "power2.out", onUpdate: draw });
    });
  }
  kill() {
    this.timeline?.progress(1);
    this.timeline?.kill();
    this.timeline = null;
  }
  clear() {
    this.busy = false;
    this.ctx?.clearRect(0, 0, this.w, this.h);
    this.el.hidden = true;
    this.el.style.opacity = "";
  }
  draw(kind, p, t) {
    const c = this.ctx,
      { w, h } = this;
    c.clearRect(0, 0, w, h);
    if (kind === "surface" && p < 0.5) {
      // Rising through the surface: the water closes in from above.
      c.save();
      c.translate(0, h);
      c.scale(1, -1);
      this.water(c, w, h, p, t, false);
      c.restore();
    } else if (kind === "dive" || kind === "surface") this.water(c, w, h, p, t, kind === "surface");
    else if (kind === "burrow" || kind === "emerge") this.tunnel(c, w, h, p, t, kind === "emerge");
    else if (kind === "blink") this.blink(c, w, h, p);
  }
  // Water climbs from below with a wavy, refracting edge, then drains past the top: we are underneath.
  water(c, w, h, p, t, up) {
    const cover = p < 0.5 ? ease(p * 2) : 1,
      leave = p < 0.5 ? 0 : ease((p - 0.5) * 2);
    // Surfacing reverses the motion: the waterline falls away below the viewer.
    let top = mix(h * 1.08, -h * 0.12, cover),
      bottom = h * 1.2;
    if (p >= 0.5) {
      top = up ? mix(-h * 0.12, h * 1.15, leave) : mix(-h * 0.12, -h * 1.3, leave);
      bottom = up ? h * 1.4 : mix(h * 1.2, -h * 0.1, leave);
    }
    const g = c.createLinearGradient(0, top, 0, Math.max(top + 10, bottom));
    g.addColorStop(0, "rgba(160,226,214,.96)");
    g.addColorStop(0.08, "rgba(42,121,124,.97)");
    g.addColorStop(1, "rgba(9,44,58,.99)");
    c.fillStyle = g;
    c.beginPath();
    c.moveTo(0, bottom);
    for (let x = 0; x <= w + 12; x += 12) {
      const y = top + Math.sin(x / 70 + t * 5) * 9 + Math.sin(x / 23 - t * 7) * 3.5;
      c.lineTo(x, y);
    }
    c.lineTo(w, bottom);
    c.closePath();
    c.fill();
    // Refraction bands and caustic glints inside the water body.
    c.save();
    c.clip();
    c.globalCompositeOperation = "lighter";
    for (let i = 0; i < (this.low ? 4 : 9); i++) {
      const y = top + ((i * 97 + t * 40) % Math.max(60, bottom - top));
      c.fillStyle = `rgba(150,230,220,${0.05 + (i % 3) * 0.02})`;
      c.fillRect(0, y + Math.sin(t * 2 + i) * 8, w, 2 + (i % 2) * 3);
    }
    const n = this.low ? 18 : 60;
    for (let i = 0; i < n; i++) {
      const f = this.flecks[i],
        rise = (f.v * 0.6 + 0.4) * (up ? -1 : 1);
      const bx = f.x * w + Math.sin(t * 3 + i) * 6,
        by = (((f.y - t * 0.35 * rise) % 1) + 1) % 1;
      const y = mix(top, bottom, by);
      const r = 1.5 + f.s * 5;
      c.strokeStyle = `rgba(210,250,245,${0.25 + f.s * 0.35})`;
      c.lineWidth = 1;
      c.beginPath();
      c.arc(bx, y, r, 0, TAU);
      c.stroke();
    }
    c.restore();
    // Bright meniscus along the edge.
    c.strokeStyle = "rgba(225,255,248,.75)";
    c.lineWidth = 2;
    c.beginPath();
    for (let x = 0; x <= w + 12; x += 12) {
      const y = top + Math.sin(x / 70 + t * 5) * 9 + Math.sin(x / 23 - t * 7) * 3.5;
      x ? c.lineTo(x, y) : c.moveTo(x, y);
    }
    c.stroke();
  }
  // An irregular earthen iris closes on the entrance and opens onto lamplight (or daylight).
  tunnel(c, w, h, p, t, out) {
    const o = this.origin,
      cx = o.x * w,
      cy = o.y * h,
      far = Math.hypot(Math.max(cx, w - cx), Math.max(cy, h - cy)) * 1.15;
    const k = p < 0.5 ? 1 - ease(p * 2) : ease((p - 0.5) * 2);
    const r = Math.max(0, far * k);
    const centre = p < 0.5 ? [cx, cy] : [w / 2, h / 2];
    c.fillStyle = out ? "#0e0b08" : "#120d09";
    c.beginPath();
    c.rect(0, 0, w, h);
    const steps = 46;
    for (let i = steps; i >= 0; i--) {
      const a = (i / steps) * TAU,
        jag = 1 + Math.sin(a * 5 + 1.3) * 0.08 + Math.sin(a * 11 + t * 0.6) * 0.035;
      const x = centre[0] + Math.cos(a) * r * jag,
        y = centre[1] + Math.sin(a) * r * jag * 0.86;
      i === steps ? c.moveTo(x, y) : c.lineTo(x, y);
    }
    c.closePath();
    c.fill("evenodd");
    // Warm rim light on the edge of the opening.
    if (r > 2) {
      const glow = c.createRadialGradient(centre[0], centre[1], r * 0.82, centre[0], centre[1], r * 1.08);
      glow.addColorStop(0, "rgba(0,0,0,0)");
      glow.addColorStop(0.75, out ? "rgba(246,226,160,.22)" : "rgba(226,150,70,.28)");
      glow.addColorStop(1, "rgba(0,0,0,0)");
      c.fillStyle = glow;
      c.fillRect(0, 0, w, h);
    }
    // Falling soil (entering) or rising dust motes (leaving).
    const n = this.low ? 14 : 48;
    for (let i = 0; i < n; i++) {
      const f = this.flecks[i],
        dir = out ? -1 : 1;
      const y = ((((f.y + t * (0.25 + f.v * 0.5) * dir) % 1) + 1) % 1) * h;
      const x = f.x * w + Math.sin(t + i) * 4;
      c.fillStyle = out ? `rgba(240,220,170,${0.15 + f.s * 0.3})` : `rgba(120,86,56,${0.5 + f.s * 0.4})`;
      const s = 1 + Math.round(f.s * 3);
      c.fillRect(Math.round(x), Math.round(y), s, s * (out ? 1 : 2));
    }
  }
  // Cinematic shot change: a short dip through the scene's own shadow colour.
  blink(c, w, h, p) {
    const a = p < 0.5 ? ease(p * 2) : 1 - ease((p - 0.5) * 2);
    c.fillStyle = `rgba(6,22,24,${a})`;
    c.fillRect(0, 0, w, h);
  }
}

// Wind streaks and seed fluff in front of the camera during dandelion flights.
export class WindLayer {
  constructor(layer) {
    this.layer = layer;
    this.streaks = Array.from({ length: 70 }, (_, i) => ({
      x: layer.seed(),
      y: layer.seed(),
      d: layer.seed(),
      i,
    }));
    this.power = 0;
    this.vx = 1;
    this.vy = 0;
  }
  start() {
    const l = this.layer;
    l.kill();
    l.el.hidden = false;
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
    cancelAnimationFrame(this.raf);
    this.layer.clear();
  }
  draw(t) {
    const l = this.layer,
      c = l.ctx,
      { w, h } = l;
    if (!c) return;
    c.clearRect(0, 0, w, h);
    const p = this.power;
    if (p <= 0.01) return;
    const len = Math.hypot(this.vx, this.vy) || 1,
      ux = -this.vx / len,
      uy = -this.vy / len;
    const n = l.low ? 18 : this.streaks.length;
    for (let i = 0; i < n; i++) {
      const s = this.streaks[i],
        depth = 0.3 + s.d * 0.7,
        speed = (0.6 + depth * 1.6) * p;
      const x = ((((s.x + ux * t * speed * 0.35) % 1) + 1) % 1) * w,
        y = ((((s.y + uy * t * speed * 0.35 + Math.sin(t * 0.7 + i) * 0.01) % 1) + 1) % 1) * h;
      if (i % 5 === 0) {
        // Out-of-focus seed fluff passing close to the lens.
        const r = 3 + depth * 9;
        const g = c.createRadialGradient(x, y, 0, x, y, r);
        g.addColorStop(0, `rgba(255,252,236,${0.38 * p * depth})`);
        g.addColorStop(1, "rgba(255,252,236,0)");
        c.fillStyle = g;
        c.beginPath();
        c.arc(x, y, r, 0, TAU);
        c.fill();
      } else {
        // Motion-blurred wind line, longer for nearer layers.
        const L = (18 + depth * 70) * p;
        c.strokeStyle = `rgba(240,248,228,${0.1 + depth * 0.22 * p})`;
        c.lineWidth = depth > 0.75 ? 2 : 1;
        c.beginPath();
        c.moveTo(x, y);
        c.lineTo(x - ux * L, y - uy * L);
        c.stroke();
      }
    }
    // Soft speed vignette.
    const v = c.createRadialGradient(w / 2, h / 2, Math.min(w, h) * 0.35, w / 2, h / 2, Math.max(w, h) * 0.75);
    v.addColorStop(0, "rgba(10,30,30,0)");
    v.addColorStop(1, `rgba(10,30,30,${0.35 * p})`);
    c.fillStyle = v;
    c.fillRect(0, 0, w, h);
  }
}

// Kinetic region title: letters arrive with blur and lift, a rule draws, the subtitle follows by words.
export function kineticTitle(el, title, sub, { big = true, mood = "wind", hold = 2.6, low = false } = {}) {
  gsap.killTweensOf(el.querySelectorAll("*"));
  gsap.killTweensOf(el);
  const letters = [...title]
    .map((ch) => `<span class="kt-l">${ch === " " ? "&nbsp;" : escapeHtml(ch)}</span>`)
    .join("");
  const words = sub
    .split(/\s+/)
    .map((wd) => `<span class="kt-w">${escapeHtml(wd)}</span>`)
    .join(" ");
  el.className = "kinetic " + (big ? "big " : "small ") + mood;
  el.innerHTML = `<div class="region-title">${letters}</div><i class="kt-rule"></i><div class="region-sub">${words}</div>`;
  const L = el.querySelectorAll(".kt-l"),
    W = el.querySelectorAll(".kt-w"),
    rule = el.querySelector(".kt-rule");
  const from = {
    wind: { x: 40, y: -6, rotate: 8 },
    water: { x: 0, y: 26, rotate: 0 },
    earth: { x: 0, y: -22, rotate: -4 },
  }[mood] || { x: 0, y: 18, rotate: 0 };
  gsap.set(el, { opacity: 1 });
  if (!title) return;
  if (low) {
    gsap.fromTo(el, { opacity: 0 }, { opacity: 1, duration: 0.5 });
    gsap.to(el, { opacity: 0, duration: 0.6, delay: hold + 0.8 });
    return;
  }
  const tl = gsap.timeline();
  tl.fromTo(
    L,
    { opacity: 0, filter: "blur(10px)", ...from, scale: 1.25 },
    { opacity: 1, filter: "blur(0px)", x: 0, y: 0, rotate: 0, scale: 1, duration: 0.85, ease: "power3.out", stagger: { each: 0.035, from: mood === "water" ? "center" : "start" } },
  )
    .fromTo(rule, { scaleX: 0 }, { scaleX: 1, duration: 0.7, ease: "power2.inOut" }, 0.35)
    .fromTo(W, { opacity: 0, y: 8, filter: "blur(4px)" }, { opacity: 1, y: 0, filter: "blur(0px)", duration: 0.5, stagger: 0.06, ease: "power2.out" }, 0.55)
    .to({}, { duration: hold })
    .to(L, { opacity: 0, y: -14, filter: "blur(6px)", duration: 0.6, stagger: { each: 0.02, from: "end" }, ease: "power2.in" })
    .to([rule, ...W], { opacity: 0, duration: 0.4 }, "<0.1");
}
function escapeHtml(s) {
  return String(s).replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]);
}
