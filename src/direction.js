// Cinematic direction: one continuous camera move per shot, lens behaviour and
// transition cues. The storyboard behind these numbers is docs/CINEMATICS.md.
// Keys are [t (0..1), dx, dy, zoom, roll°] relative to the shot centre; the
// path is a time-parameterised Hermite spline, so the camera never stops dead
// on a key and keeps its exit velocity into the transition push.
import Phaser from 'phaser';

const K = (...keys) => keys;
export const DIRECTION = {
 prologue:[
  {keys:K([0,-30,-70,1.55,-1.4],[.45,-5,-20,2.3,-.5],[1,15,5,3.2,.4]),near:5,far:2.5,exit:[0,60,.5],veil:'dark',mood:'hope'},
  {keys:K([0,70,-35,1,.9],[.55,10,-5,1.05,.2],[1,-50,12,1.12,-.5]),near:0,far:1.2,exit:[-30,10,.08],veil:'blur'},
  {keys:K([0,10,30,3.6,2.2],[.35,0,10,2.2,.8],[1,-25,-40,1.2,-.3]),near:6,far:2,exit:[50,-10,.1],veil:'bloom',cue:'bloom'},
  {keys:K([0,-60,10,1.55,-.9],[.5,0,-8,1.7,0],[1,60,-14,1.85,.8]),near:4,far:2.5,exit:[60,-20,.25],veil:'blur',accent:true},
 ],
 awakening:[{keys:K([0,0,10,2.25,-.6],[.5,40,-20,1.6,.2],[1,90,-60,1.2,.6]),near:5,far:2,exit:[60,-40,-.1],veil:'dark',accent:true,mood:'hope'}],
 citadel:[
  {keys:K([0,-40,-90,.62,-1],[.5,-10,-30,.72,-.3],[1,40,-5,.84,.3]),near:4,far:1,exit:[40,30,.15],veil:'dark',mood:'earth'},
  {keys:K([0,-90,10,1.05,.5],[.5,-10,0,1.18,0],[1,70,-15,1.3,-.4]),near:4,far:1,exit:[60,0,.1],veil:'blur'},
  {keys:K([0,30,25,1,.9],[.5,5,0,1.2,.1],[1,-25,-15,1.45,-.6]),near:5,far:1.5,exit:[-20,-10,.3],veil:'blur',accent:true},
 ],
 valley:[{keys:K([0,130,20,1.22,.4],[.6,20,-5,1.45,-.2],[1,-35,-10,1.72,-.5]),near:4,far:2.5,exit:[-60,0,.2],veil:'dark',accent:true,mood:'hope'}],
 catastrophe:[{keys:K([0,0,90,1.6,0],[.5,10,10,1.3,-.9],[1,20,-70,1.05,-2.2]),near:3,far:3,exit:[10,-50,-.1],veil:'dark',cue:'low',accent:true,mood:'tense',grade:'ashen'}],
 night:[{keys:K([0,-70,10,1.3,-.5],[.33,-20,-25,1.38,.4],[.66,30,5,1.46,-.3],[1,90,-20,1.56,.5]),near:5,far:3,exit:[60,-20,.1],veil:'dark',accent:true,mood:'nocturne',grade:'night'}],
 migration:[{keys:K([0,-130,10,1.36,-.3],[.5,10,0,1.28,0],[1,150,-10,1.2,.3]),near:4,far:2,exit:[90,0,0],veil:'dark',accent:true,mood:'earth'}],
 restoration:[{keys:K([0,0,70,1.6,-.6],[.5,0,0,1.3,0],[1,10,-90,1.08,.4]),near:4,far:1.5,exit:[0,-60,-.05],veil:'dark',cue:'bloom',accent:true,mood:'hope'}],
 ending:[
  {keys:K([0,-40,20,1.3,-.5],[.5,-5,0,1.5,0],[1,25,-10,1.72,.5]),near:4,far:2,exit:[20,-30,.1],veil:'dark',accent:true,mood:'hope'},
  {keys:K([0,0,30,1.25,0],[.5,10,-60,.9,-.6],[1,20,-150,.62,-1.2]),near:3,far:1,exit:[0,-80,-.08],veil:'blur'},
  {keys:K([0,-60,10,1,-.4],[.5,0,0,1.06,0],[1,50,-10,1.13,.3]),near:0,far:1.2,exit:[40,0,.04],veil:'bloom',cue:'bloom'},
  {keys:K([0,-40,10,1.02,0],[.5,20,-10,1.06,.3],[1,70,-25,1.1,.6]),near:0,far:1.2,exit:[30,-10,.05],veil:'blur',accent:true},
 ],
 metamorphosis:[
  {keys:K([0,-20,-10,1.7,-.6],[.5,-12,-6,1.95,0],[1,-8,-4,2.2,.5]),near:5,far:3,exit:[30,0,.1],veil:'dark',mood:'hope'},
  {keys:K([0,-25,0,2,0],[.5,10,-4,2.1,.3],[1,45,-6,2.15,.1]),near:5,far:3,exit:[30,0,.08],veil:'blur'},
  {keys:K([0,25,10,2.3,1],[.5,0,0,2.4,0],[1,-25,-5,2.5,-1]),near:5,far:3,exit:[20,-30,-.1],veil:'blur'},
  {keys:K([0,-10,0,2.1,-.4],[.5,40,-50,1.85,.3],[1,85,-95,1.6,.9]),near:5,far:3,exit:[50,-60,-.1],veil:'bloom',cue:'bloom',accent:true},
 ],
};
export const shotPlan = (id, idx) => DIRECTION[id]?.[idx] ?? DIRECTION[id]?.at(-1) ?? null;

// Reading time drives shot length: a calm pace for the subtitle plus room for
// the camera to finish its move before the transition.
export const shotSeconds = (text) => Math.max(6.5, Math.min(11.5, 2.6 + String(text || '').length / 17));
export const EXIT_SECONDS = 0.62;

const hermite = (keys, t, c) => {
 if (t <= keys[0][0]) return keys[0][c] + slope(keys, 0, c) * (t - keys[0][0]);
 const last = keys.length - 1;
 if (t >= keys[last][0]) return keys[last][c] + slope(keys, last, c) * (t - keys[last][0]);
 let i = 0;
 while (keys[i + 1][0] < t) i++;
 const [a, b] = [keys[i], keys[i + 1]], h = b[0] - a[0], s = (t - a[0]) / h;
 const h00 = 2 * s ** 3 - 3 * s * s + 1, h10 = s ** 3 - 2 * s * s + s, h01 = -2 * s ** 3 + 3 * s * s, h11 = s ** 3 - s * s;
 return h00 * a[c] + h10 * h * slope(keys, i, c) + h01 * b[c] + h11 * h * slope(keys, i + 1, c);
};
function slope(keys, i, c) {
 const a = keys[Math.max(0, i - 1)], b = keys[Math.min(keys.length - 1, i + 1)];
 return b[0] === a[0] ? 0 : (b[c] - a[c]) / (b[0] - a[0]);
}

export class ShotDirector {
 constructor(scene) {
  this.scene = scene;
  this.plan = null;
  this.layerFx = [];
  this.camFx = [];
 }
 get webgl() {
  return this.scene.game.renderer?.type === Phaser.WEBGL && !this.scene.app.state.settings.low;
 }
 // centre: world point the keys are relative to. stage: the ParallaxStage.
 run(id, idx, centre, stage = null) {
  this.stop();
  const plan = shotPlan(id, idx);
  if (!plan) return null;
  const low = !!this.scene.app.state.settings.low;
  const amp = low ? .35 : 1;
  const z0 = plan.keys[0][3];
  // In reduced mode keep the composition but flatten amplitude and roll.
  this.keys = plan.keys.map(([t, dx, dy, z, r]) => [t, dx * amp, dy * amp, z0 + (z - z0) * (low ? .5 : 1), r * amp]);
  this.plan = plan;
  this.centre = centre;
  this.stage = stage;
  this.duration = (this.scene.app.cineData?.duration ?? 8.5) * 1000;
  this.started = this.scene.time.now;
  this.exitAt = null;
  this.prev = null;
  this.velocity = {x: 0, y: 0, speed: 0};
  const zooms = this.keys.map(k => k[3]);
  if (stage) stage.dolly = {base: Math.min(...zooms), k: low ? 0 : .6};
  this.apply(0, 0);
  if (this.webgl) this.mountLens();
  return plan;
 }
 // The transition push: keep the spline's exit velocity and accelerate along
 // the plan's exit vector so the cut happens mid-motion, not on a dead stop.
 exit(seconds = EXIT_SECONDS) {
  if (!this.plan || this.exitAt != null) return;
  this.exitAt = this.scene.time.now;
  this.exitSpan = seconds * 1000;
 }
 position(elapsed) {
  const t = Math.min(1.08, elapsed / this.duration);
  const k = this.keys, out = [1, 2, 3, 4].map(c => hermite(k, t, c));
  if (this.exitAt != null) {
   const s = Math.min(1, (this.scene.time.now - this.exitAt) / this.exitSpan), push = s * s * s;
   const [ex, ey, ez] = this.plan.exit, low = this.scene.app.state.settings.low ? .3 : 1;
   out[0] += ex * push * low; out[1] += ey * push * low; out[2] *= 1 + ez * push * low;
  }
  return out;
 }
 apply(elapsed, time) {
  const cam = this.scene.cameras.main, [dx, dy, zoom, roll] = this.position(elapsed);
  const low = this.scene.app.state.settings.low, sec = time / 1000;
  // A breathing operator, not a shaking one: two slow incommensurate sines.
  const hx = low ? 0 : (Math.sin(sec * .71) * 1.6 + Math.sin(sec * 1.93) * .5) / zoom;
  const hy = low ? 0 : (Math.sin(sec * .53 + 1) * 1.2 + Math.sin(sec * 2.31) * .4) / zoom;
  const x = this.centre[0] + dx + hx, y = this.centre[1] + dy + hy;
  cam.setZoom(Math.max(.3, zoom));
  cam.centerOn(x, y);
  cam.setRotation(Phaser.Math.DegToRad(roll + (low ? 0 : Math.sin(sec * .37) * .12)));
  if (this.prev && time > this.prev.time) {
   const dt = (time - this.prev.time) / 1000;
   // Screen-space velocity: what the eye actually sees smearing.
   const vx = (x - this.prev.x) * cam.zoom / dt, vy = (y - this.prev.y) * cam.zoom / dt;
   const vz = (cam.zoom - this.prev.zoom) / cam.zoom / dt * 300;
   const blend = .2;
   this.velocity.x += (vx - this.velocity.x) * blend;
   this.velocity.y += (vy - this.velocity.y) * blend;
   this.velocity.z = (this.velocity.z ?? 0) + (vz - (this.velocity.z ?? 0)) * blend;
   this.velocity.speed = Math.hypot(this.velocity.x, this.velocity.y);
  }
  this.prev = {x, y, zoom: cam.zoom, time};
 }
 update(time) {
  if (!this.plan) return;
  this.apply(time - this.started, time);
  if (this.webgl) this.updateLens();
 }
 mountLens() {
  const cam = this.scene.cameras.main, plan = this.plan;
  if (cam.postFX) {
   this.vignette = cam.postFX.addVignette(.5, .5, .9, .32);
   this.whip = cam.postFX.addBlur(0, 0, 0, 0, 0xffffff, 1);
   this.camFx.push(this.vignette, this.whip);
   if (plan.grade) {
    const grade = cam.postFX.addColorMatrix();
    if (plan.grade === 'ashen') grade.saturate(-.38).brightness(.94, true);
    if (plan.grade === 'night') grade.hue(-8).saturate(-.12, true);
    this.camFx.push(grade);
   }
  }
  for (const item of [...(this.stage?.layers || []), ...(this.stage?.actors || [])]) {
   const sprite = item.sprite, rate = item.spec.rate;
   // postFX, not preFX: the planes are larger than the renderer and preFX
   // would clip them to its own target before scaling.
   if (!sprite.postFX) continue;
   // Depth of field: the subject plane (mid rates) stays sharp; the frame of
   // near leaves and the distant haze soften by their distance from focus.
   const role = rate >= .45 ? 'near' : rate <= .1 ? 'far' : null;
   if (!role || item.frames) continue;
   const fx = sprite.postFX.addBlur(1, 0, 0, 1, 0xffffff, 4);
   this.layerFx.push({sprite, fx, rate, role});
  }
 }
 updateLens() {
  const v = this.velocity, plan = this.plan;
  const leaving = this.exitAt != null;
  for (const l of this.layerFx) {
   const focus = l.role === 'near' ? plan.near : plan.far;
   // Motion blur grows with the plane's own relative speed (rate × camera).
   const mx = Math.abs(v.x) * l.rate * .012, my = Math.abs(v.y) * l.rate * .012;
   const radial = Math.abs(v.z ?? 0) * l.rate * .01;
   const d = focus * .32;
   l.fx.x = Math.min(9, d + mx + radial);
   l.fx.y = Math.min(9, d + my + radial);
   l.fx.strength = focus || mx + my + radial > .15 ? 1 : 0;
  }
  if (this.whip) {
   // Whole-frame smear only during the transition push, never while reading.
   const s = leaving ? Math.min(1, v.speed / 260) : 0;
   this.whip.x = Math.min(6, Math.abs(v.x) * .012) * s;
   this.whip.y = Math.min(6, Math.abs(v.y) * .012) * s;
   this.whip.strength = s;
  }
 }
 stop() {
  const cam = this.scene.cameras?.main;
  for (const fx of this.camFx) cam?.postFX?.remove(fx);
  for (const l of this.layerFx) if (l.sprite.active) l.sprite.postFX?.remove(l.fx);
  this.camFx = [];
  this.layerFx = [];
  this.vignette = this.whip = null;
  if (this.stage) this.stage.dolly = null;
  this.stage = null;
  this.plan = null;
  cam?.setRotation(0);
 }
}
