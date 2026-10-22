import { JSDOM, VirtualConsole } from "jsdom";
import { createRequire } from "node:module";
import { readFileSync, writeFileSync, existsSync, mkdirSync } from "node:fs";
import { resolve } from "node:path";
import { indexedDB, IDBKeyRange } from "fake-indexeddb";
import {checkCrossings} from './runtime-crossing.mjs';
import {checkEnvironment} from './runtime-environment.mjs';
import {checkExpeditions} from './runtime-expedition.mjs';
import assert from "node:assert/strict";
import { migrateSave } from "../src/model.js";
import { BIOMES as BIOMES_ALL } from "../src/content.js";
const require = createRequire(import.meta.url);
const { createCanvas, Image: NativeImage, loadImage } = require("@napi-rs/canvas");
const errors = [];
const vc = new VirtualConsole();
vc.on("jsdomError", (e) => {
  if (!e.message.includes("HTMLMediaElement")) {
    errors.push(e);
    console.error("DOM", e.message);
  }
});
vc.on("error", (...args) => {
  errors.push(args);
  console.error(...args);
});
vc.on("warn", (...args) => console.log("WARN", ...args));
const offline = process.argv.includes("--offline");
const missingAsset = process.argv.includes("--missing-asset");
const noStorage = process.argv.includes("--no-storage");
mkdirSync("tmp", { recursive: true });
const html = readFileSync(
  offline ? "release/PLAY_OFFLINE.html" : "index.html",
  "utf8",
).replace(/<script[^>]+src="\.\/src\/main.js"><\/script>/, "");
const dom = new JSDOM(
  offline ? html.replace(/<script>[\s\S]*<\/script>/, "") : html,
  {
    url: "http://localhost/",
    pretendToBeVisual: true,
    runScripts: "outside-only",
    virtualConsole: vc,
  },
);
const w = dom.window;
const native = new WeakMap();
function getCanvas(el) {
  let c = native.get(el);
  if (!c) {
    c = createCanvas(el.width || 300, el.height || 150);
    native.set(el, c);
  }
  if (c.width !== el.width) c.width = el.width || 1;
  if (c.height !== el.height) c.height = el.height || 1;
  return c;
}
w.HTMLCanvasElement.prototype.getContext = function (type) {
  if (type !== "2d") return null;
  const c = getCanvas(this),
    ctx = c.getContext("2d");
  if (!ctx._patched) {
    const draw = ctx.drawImage.bind(ctx);
    ctx.drawImage = (im, ...a) =>
      draw(im instanceof w.HTMLCanvasElement ? getCanvas(im) : im, ...a);
    const pattern = ctx.createPattern.bind(ctx);
    ctx.createPattern = (im, repetition) =>
      pattern(im instanceof w.HTMLCanvasElement ? getCanvas(im) : im, repetition);
    ctx._patched = true;
  }
  return ctx;
};
w.HTMLCanvasElement.prototype.toDataURL = function () {
  return getCanvas(this).toDataURL("image/png");
};
class Image extends NativeImage {
  set src(v) {
    if (missingAsset && typeof v === "string" && v.includes("grass-hi.png")) {
      queueMicrotask(() =>
        this.onerror?.(new Error("Injected unavailable image")),
      );
      return;
    }
    if (typeof v === "string" && v.startsWith("data:")) super.src = v;
    else {
      const pathname = new URL(v, "http://localhost/").pathname;
      super.src = readFileSync(resolve("public", "." + pathname));
    }
  }
  get src() {
    return super.src;
  }
}
w.CanvasRenderingContext2D = function () {};
w.focus = () => {};
w.Image = Image;
w.indexedDB = noStorage ? undefined : indexedDB;
w.IDBKeyRange = IDBKeyRange;
w.structuredClone = structuredClone;
w.matchMedia = () => ({
  matches: false,
  addEventListener() {},
  removeEventListener() {},
  addListener() {},
  removeListener() {},
});
w.URL.createObjectURL = () => "";
w.URL.revokeObjectURL = () => {};
w.screen.orientation = {
  type: "landscape-primary",
  addEventListener() {},
  removeEventListener() {},
};
Object.defineProperty(w.document, "hidden", {
  value: false,
  configurable: true,
});
// Native-canvas DOM emulator: this is a Node integration check, not browser QA.
let bundle = offline
  ? html.match(/<script>([\s\S]*)<\/script>/)[1]
  : readFileSync(
      "dist/" +
        readFileSync("dist/index.html", "utf8").match(
          /src="\.\/(assets\/[^\"]+\.js)"/,
        )[1],
      "utf8",
    );
// Use direct image loading and Canvas rendering in this test environment only.
bundle = bundle.replace("type:", "type:");
// transform bundle before eval: the game config's Phaser.AUTO value becomes CANVAS through feature detection.
w.eval(bundle);
for (
  let i = 0;
  i < 80 &&
  !w.document.querySelector("#new") &&
  !w.document.querySelector("#retry");
  i++
)
  await new Promise((r) => setTimeout(r, 100));
const app = w.littleWorld?.app;
assert(app, "application created");
console.log(
  "STATUS",
  app.mode,
  w.document.querySelector("#menu").textContent.slice(0, 100),
  app.scene?.sys?.isActive(),
);
if (missingAsset) {
  assert.equal(app.mode, "error");
  assert(w.document.querySelector("#retry"));
  assert(errors.some((e) => String(e).includes("Required art could not load")));
  dom.window.close();
  console.log("MISSING ASSET RECOVERY UI PASSED");
  process.exit(0);
}
if (!w.document.querySelector("#new")) {
  console.log("errors", errors);
  process.exit(1);
}
app.audio = {
  unlock() {},
  set() {},
  enter() {},
  play() {},
  perspective() {},
  mute() {},
};
// This simulated DOM has no audio decoder; real MP3 playback is covered in
// browser-speech.mjs instead of emitting synthetic audio load errors here.
app.state.settings.narration=false;
app.game.loop.stop();
assert.equal(app.mode, "menu");
await app.startFresh();
if (noStorage) {
  assert.equal(app.mode, "cinematic");
  assert.equal(app.reportedStorage, true);
  assert(
    w.document
      .querySelector("#toast")
      .textContent.includes("Не удалось сохранить"),
  );
  clearTimeout(app.cineTimer);
  app.game.destroy(true);
  dom.window.close();
  assert.equal(errors.length, 0);
  console.log("STORAGE-DENIED PLAY AND WARNING PASSED");
  process.exit(0);
}
assert.equal(app.mode, "cinematic");
const openingStage=app.scene.cineLayers;
assert.equal(openingStage.layers.length,3,'opening has three real camera planes');
const cineShutdownListeners=app.scene.events.listenerCount('shutdown');
app.nextShot();
assert(openingStage.destroyed,'changing shot disposes previous parallax');
assert.equal(app.scene.cineLayers.theme,'room');
assert(app.scene.cineLayers.actors.some(a=>a.sprite.visualKey==='hero-sleep0'));
const sleepingStage=app.scene.cineLayers;
sleepingStage.started-=3200;
app.game.step(app.scene.time.now+16,16);
writeFileSync('tmp/cine-bedroom-night.png',getCanvas(app.game.canvas).toBuffer('image/png'));
assert.equal(app.scene.events.listenerCount('shutdown'),cineShutdownListeners,'shots do not accumulate shutdown handlers');
app.finishCinematic();
assert(sleepingStage.destroyed);
assert.equal(app.scene.cineLayers,null,'skip removes camera layers');
assert.equal(app.mode, "dialog");
w.document.querySelector("#dialog-next").click();
assert.equal(app.mode, "play");
// Keep the scale moment out of movement checks, then exercise it separately.
app.state.seen.push("view-grass", "view-puddle", "view-wrapper", "view-lamp");
const step = (n = 1) => {
  for (let i = 0; i < n; i++) {
    const t = app.scene.time.now + 16.666;
    app.game.headlessStep(t, 16.666);
  }
};
const x = app.scene.player.x;
app.scene.keys.D.isDown = true;
step(30);
app.scene.keys.D.isDown = false;
assert(app.scene.player.x > x + 40, "physical movement updates the world");
console.log("MOVE", x, app.scene.player.x);
assert(app.scene.player.texture.key.startsWith('visual-'),'playable hero uses generated atlas');
assert.equal(app.scene.player.visualDensity,4);
assert(Math.abs(app.scene.player.body.width-16)<.1,'visual upgrade preserves physical width');
assert(Math.abs(app.scene.player.body.height-11.2)<.1,'visual upgrade preserves physical foot height');
assert(app.scene.npcs.every(n=>n.texture.key.startsWith('visual-')),'all outdoor inhabitants use generated art');
const portraitImage = await loadImage(app.portrait('ladybird'));
assert.equal(portraitImage.width,128,'journal crops a single generated portrait, not an entire atlas');
const pressEsc = () => {
  w.dispatchEvent(
    new w.KeyboardEvent("keydown", {
      code: "Escape",
      key: "Escape",
      keyCode: 27,
      which: 27,
      bubbles: true,
    }),
  );
  step(2);
  w.dispatchEvent(
    new w.KeyboardEvent("keyup", {
      code: "Escape",
      key: "Escape",
      keyCode: 27,
      which: 27,
      bubbles: true,
    }),
  );
  step(2);
};
pressEsc();
assert.equal(app.mode, "pause", "Escape opens pause");
pressEsc();
assert.equal(app.mode, "play", "Escape closes pause");
const stick = w.document.querySelector("#stick");
stick.onpointerdown({
  pointerId: 1,
  clientX: 30,
  clientY: 0,
  preventDefault() {},
});
assert(app.joy.x > 0, "touch handler produces movement");
stick.onpointerdown({
  pointerId: 2,
  clientX: -30,
  clientY: 0,
  preventDefault() {},
});
assert(app.joy.x > 0, "second pointer cannot steal the joystick");
stick.onlostpointercapture();
assert.equal(app.joy.x, 0);
app.joy = { x: 1, y: 0 };
app.scene.keys.W.isDown = true;
app.openJournal();
assert.equal(app.mode, "journal");
assert.deepEqual({ ...app.joy }, { x: 0, y: 0 });
assert(!app.scene.keys.W.isDown);
assert.equal(
  app.game.input.keyboard.preventDefault,
  false,
  "dialogue buttons retain native Space/arrow handling",
);
app.closePanel();
assert.equal(app.mode, "play");
assert.equal(app.game.input.keyboard.preventDefault, true);
app.openMap();
assert.equal(app.mode, "map");
app.closePanel();
app.pause();
assert.equal(app.mode, "pause");
app.closePanel();
for (const lang of ["kk", "en", "ru"]) {
  app.changeLanguage(lang);
  assert(!w.document.querySelector("#hud").textContent.includes("undefined"));
}
app.scene.player.body.reset(740, 570);
app.scene.updateNear();
app.scene.interact();
assert.equal(app.mode, "dialog");
w.document.querySelector("#dialog-next").click();
assert.equal(app.state.stage, 1);
console.log("QUEST STAGE", app.state.stage);
await app.save(false);
console.log("SAVE OK");
// Render actual Canvas game objects for art inspection.
app.game.step(app.scene.time.now + 16, 16);
writeFileSync(
  "tmp/meadow-frame.png",
  getCanvas(app.game.canvas).toBuffer("image/png"),
);
// Enter and leave the optional aquatic layer without changing the overland quest.
const questBefore = app.state.quest,
  stageBefore = app.state.stage;
const tapE = () => {
  for (const type of ["keydown", "keyup"]) {
    w.dispatchEvent(
      new w.KeyboardEvent(type, {
        code: "KeyE",
        key: "e",
        keyCode: 69,
        which: 69,
        bubbles: true,
      }),
    );
    step(2);
  }
};
if(process.argv.includes('--expeditions')){
 await checkExpeditions({app,w,step,tapE,dismiss,getCanvas});
 app.game.destroy(true);dom.window.close();
 if(errors.length)throw Error(errors.map(e=>e.message).join('\n'));
 console.log('EXPEDITION INTEGRATION PASSED');process.exit(0);
}
app.scene.player.body.reset(3720, 1440);
app.scene.updateNear();
assert(app.scene.near.dive);
tapE();
step(2);
assert(app.scene.isUnderwater, "underwater scene starts");
assert.equal(app.state.quest, questBefore);
assert.equal(app.state.stage, stageBefore);
if (app.mode === "dialog") w.document.querySelector("#dialog-next").click();
console.log("UNDERWATER", app.scene.npcs.length, app.scene.markers.length);
app.game.step(app.scene.time.now + 16, 16);
writeFileSync(
  "tmp/underwater-frame.png",
  getCanvas(app.game.canvas).toBuffer("image/png"),
);
const u = app.scene;
for (let stage = 0; stage < 3; stage++) {
  if (stage === 1) {
    u.toggleObserve();
    for (let i = 0; i < 3; i++) {
      const n = u.npcs[i];
      u.player.body.reset(n.x, n.y);
      step(3);
    }
    assert.equal(
      u.state.stage,
      2,
      "underwater observation advances after three distinct creatures",
    );
  } else
    for (let i = 0; i < 3; i++) {
      const n = u.markers.find((n) => !n.exit);
      u.player.body.reset(n.x, n.y);
      step(2);
      u.interact();
    }
  dismissUnder();
}
function dismissUnder() {
  if (app.mode === "dialog") w.document.querySelector("#dialog-next").click();
}
assert.equal(u.state.done, true);
console.log("UNDERWATER QUEST OK");
app.exitUnderwater();
assert(!app.scene.isUnderwater);
assert.equal(app.state.stage, stageBefore);
for (let round = 0; round < 3; round++) {
  app.enterUnderwater();
  step(2);
  assert(app.scene.isUnderwater);
  assert.equal(
    app.scene.npcs.length,
    30,
    "repeated dives do not accumulate NPCs",
  );
  app.scene.player.body.reset(620 + round * 10, 440);
  step(2);
  await app.save(false);
  const swimX = app.state.underwater.x;
  app.menu();
  app.continueGame();
  step(2);
  assert(app.scene.isUnderwater, "continue reopens the saved aquatic layer");
  assert(
    Math.abs(app.scene.player.x - swimX) < 2,
    "continue restores underwater position",
  );
  pressEsc();
  assert.equal(app.mode, "pause", "one press pauses after repeat dives");
  pressEsc();
  assert.equal(app.mode, "play");
  app.exitUnderwater();
  step(2);
}
console.log("REPEATED DIVE, MENU AND CONTINUE OK");

// Exercise elevation through the actual Phaser scene and input paths.
const beforeTrail = { x: app.state.x, y: app.state.y };
const { TRAILS, emptyTraversal } = await import("../src/traversal.js");
const trail = TRAILS[0],
  root = trail.platforms[0];
app.state.x = root.x;
app.state.y = root.y;
app.state.traversal = emptyTraversal();
app.scene.reset(app.state);
app.scene.updateNear();
assert.equal(app.scene.near.routeAction, "climb");
app.scene.interact();
app.scene.keys.W.isDown = true;
step(78);
app.scene.keys.W.isDown = false;
assert.equal(app.scene.traverse.platform, root.id, "W climbs the real stem");
assert.equal(app.scene.traverse.z, root.z);
assert(
  Math.abs(app.scene.player.y - app.scene.cameraAnchor.y - root.z) < 0.1,
  "camera follows visible height",
);
await app.save(false);
app.scene.reset(app.state);
assert.equal(
  app.scene.traverse.platform,
  root.id,
  "save restores the occupied leaf",
);
app.game.step(app.scene.time.now + 16, 16);
writeFileSync(
  "tmp/canopy-frame.png",
  getCanvas(app.game.canvas).toBuffer("image/png"),
);
for (const target of trail.platforms.slice(1)) {
  const current = trail.platforms.find(
    (p) => p.id === app.scene.traverse.platform,
  );
  for (
    let i = 0;
    i < 100 &&
    Math.hypot(current.x - app.scene.player.x, current.y - app.scene.player.y) >
      4;
    i++
  ) {
    const dx = current.x - app.scene.player.x,
      dy = current.y - app.scene.player.y,
      d = Math.hypot(dx, dy);
    app.joy = { x: dx / d, y: dy / d };
    step();
  }
  const dx = target.x - app.scene.player.x,
    dy = target.y - app.scene.player.y,
    d = Math.hypot(dx, dy);
  app.joy = { x: dx / d, y: dy / d };
  app.scene.jump();
  for (let i = 0; i < 120 && app.scene.traverse.airborne; i++) step();
  app.joy = { x: 0, y: 0 };
  assert.equal(
    app.scene.traverse.platform,
    target.id,
    "jump lands on " + target.id,
  );
}
app.scene.updateNear();
assert.equal(app.scene.near.routeAction, "observe");
app.scene.interact();
assert.equal(app.mode, "dialog");
w.document.querySelector("#dialog-next").click();
assert(app.state.traversal.completed.includes(trail.id));
app.openJournal("trails");
assert(
  w.document.querySelector("#overlay").textContent.includes("Росная тропа"),
);
app.closePanel();
app.state.x = beforeTrail.x;
app.state.y = beforeTrail.y;
app.state.traversal = {
  ...app.state.traversal,
  z: 0,
  platform: null,
  climb: null,
};
app.scene.reset(app.state);
console.log("CANOPY CLIMB, JUMPS, JOURNAL AND SAVE OK");
app.playCinematic("metamorphosis");
for (let i = 0; i < 4; i++) {
  assert.equal(app.mode, "cinematic");
  assert(app.scene.lifeActor?.active);
  step(2);
  app.nextShot();
}
assert.equal(app.mode, "play");
assert(app.state.seen.includes("metamorphosis"));
console.log("METAMORPHOSIS SCENE OK");

function dismiss() {
  for (let i = 0; i < 12; i++) {
    if (app.mode === "dialog" && w.document.querySelector("#dialog-next"))
      w.document.querySelector("#dialog-next").click();
    else if (app.mode === "cinematic") app.finishCinematic();
    else break;
  }
}
const { QUESTS } = await import("../src/quests.js");
const colonyData = await import("../src/colony-data.js");
function walkColonyTo(target) {
  const scene = app.scene,
    route = colonyData.colonyPath(scene.grid, scene.player, target);
  assert(route.length, "a physical path exists to the colony target");
  for (const waypoint of route.slice(1).concat([target])) {
    let frames = 0;
    while (
      Math.hypot(scene.player.x - waypoint.x, scene.player.y - waypoint.y) >
        4 &&
      frames++ < 100
    ) {
      const dx = waypoint.x - scene.player.x,
        dy = waypoint.y - scene.player.y,
        d = Math.hypot(dx, dy);
      app.joy = { x: dx / d, y: dy / d };
      step();
    }
    assert(
      frames < 100,
      `collision-free walking to ${waypoint.x},${waypoint.y}`,
    );
  }
  app.joy = { x: 0, y: 0 };
  step(2);
}
async function playColonyChapter() {
  const entrance = colonyData.COLONY_ENTRANCE;
  app.state.x = entrance.x;
  app.state.y = entrance.y;
  app.scene.reset(app.state);
  app.scene.updateNear();
  assert(app.scene.near.colony, "the story leads to a real nest entrance");
  tapE();
  assert(app.scene.isCitadel);
  assert.equal(app.mode, "cinematic");
  const scene = app.scene;
  assert.equal(scene.queen.visualKey,'ant-queen0','queen has her own generated morphology');
  assert(scene.children.list.some(o=>o.visualKey==='nest-root-arch'),'nest uses generated environmental detail');
  for (let shot = 0; shot < 3; shot++) {
    assert.equal(app.mode, "cinematic");
    step(2);
    app.nextShot();
  }
  dismiss();
  assert.equal(app.mode, "play");
  assert.equal(scene.npcs.length, 24);
  assert(!scene.open, "the passage begins blocked");
  for (const target of colonyData.COLONY_OBJECTIVES[0]) {
    walkColonyTo(target);
    scene.updateNear();
    assert.equal(scene.near.stage.action, "collect");
    scene.interact();
  }
  assert.equal(app.state.stage, 1);
  walkColonyTo(colonyData.COLONY_OBJECTIVES[1][0]);
  app.joy = { x: 0, y: -1 };
  step(65);
  app.joy = { x: 0, y: 0 };
  step(2);
  assert(
    scene.player.y > colonyData.GATE_POINT.y + 30,
    "Arcade collision prevents crossing the damaged passage",
  );
  scene.updateNear();
  assert.equal(scene.near.stage.action, "build");
  scene.interact();
  dismiss();
  assert(scene.open);
  assert.equal(app.state.stage, 2);
  await app.save(false);
  const saved = { x: scene.state.x, y: scene.state.y };
  app.menu();
  app.continueGame();
  step(2);
  assert(app.scene.isCitadel);
  assert(
    Math.hypot(scene.player.x - saved.x, scene.player.y - saved.y) < 3,
    "continue restores the occupied underground layer",
  );
  pressEsc();
  assert.equal(app.mode, "pause");
  pressEsc();
  assert.equal(app.mode, "play");
  walkColonyTo(colonyData.COLONY_OBJECTIVES[2][0]);
  const oldPositions = scene.npcs.map((n) => ({ x: n.x, y: n.y }));
  scene.toggleObserve();
  for (let frames = 0; frames < 750 && app.mode === "play"; frames++) step();
  assert.equal(
    app.mode,
    "dialog",
    "watching working ants advances the brood observation",
  );
  assert(
    scene.npcs.some(
      (n, i) =>
        Math.hypot(n.x - oldPositions[i].x, n.y - oldPositions[i].y) > 20,
    ),
    "workers move through the nest",
  );
  dismiss();
  assert.equal(app.state.quest, 2);
  assert(app.state.abilities.includes("glider"));
  for (const id of colonyData.CHAMBERS.map((room) => room.id)) {
    walkColonyTo(colonyData.NOTE_POINTS[id]);
    scene.updateNear();
    assert.equal(scene.near.note, id);
    scene.interact();
    dismiss();
  }
  assert(scene.state.notes.includes("queen"));
  assert(scene.state.notes.includes("brood"));
  assert.equal(
    scene.state.notes.length,
    7,
    "all seven chambers can be reached and studied through physical movement",
  );
  for (const lang of ["kk", "en", "ru"]) {
    app.changeLanguage(lang);
    app.openMap();
    assert.equal(app.mode, "map");
    app.closePanel();
    app.openJournal("colony");
    assert(
      !w.document.querySelector("#overlay").textContent.includes("undefined"),
    );
    app.closePanel();
  }
  scene.cameras.main.stopFollow().centerOn(scene.player.x, scene.player.y);
  app.game.step(scene.time.now + 16, 16);
  writeFileSync(
    "tmp/colony-closeup-frame.png",
    getCanvas(app.game.canvas).toBuffer("image/png"),
  );
  const cam = scene.cameras.main;
  cam.stopFollow().setZoom(0.5).centerOn(1050, 770);
  app.game.step(scene.time.now + 16, 16);
  writeFileSync(
    "tmp/colony-frame.png",
    getCanvas(app.game.canvas).toBuffer("image/png"),
  );
  walkColonyTo(colonyData.cellPoint(6, 3));
  scene.updateNear();
  assert(scene.near.exit);
  tapE();
  assert.equal(app.scene.isCitadel, undefined);
  assert.equal(app.state.colony.active, false);
  for (let round = 0; round < 2; round++) {
    app.enterColony();
    step(2);
    assert.equal(app.scene.npcs.length, 24);
    assert(app.scene.open);
    assert(app.scene.state.notes.includes("queen"));
    app.exitColony();
    step(2);
  }
  console.log(
    "CITADEL PHYSICAL ROUTES, GATE, BROOD, NOTES, THREE LANGUAGES AND SAVE OK",
  );
}
let turns = 0;
while (app.state.quest < 8 || app.state.stage < 2) {
  if (turns++ > 130) throw Error("Quest flow did not converge");
  dismiss();
  if (app.state.quest === 1) {
    await playColonyChapter();
    turns += 4;
    continue;
  }
  const st = QUESTS[app.state.quest].stages[app.state.stage],
    i = st.points.findIndex((p, j) => !app.state.progress.includes(j)),
    p = st.points[i];
  app.state.x = p[0];
  app.state.y = p[1];
  app.scene.player.body.reset(...p);
  app.scene.syncBiome();
  app.scene.updateNear();
  if (st.action === "scan") app.scene.scanning = true;
  if (st.action === "pollinate") {
    app.scene.observing = true;
    step(900);
    dismiss();
    assert(app.scene.pollination > 0, "pollinator simulation reaches a flower");
  }
  for (const o of app.scene.escort) o.setPosition(p[0] - 35, p[1] + 10);
  app.scene.updateNear();
  assert(app.scene.near?.kind === "quest", "quest object is reachable");
  assert.equal(app.scene.near.index, i);
  app.scene.interact();
  if (st.action === "choice") {
    assert(w.document.querySelector("[data-choice]"));
    app.changeLanguage("en");
    assert(
      w.document.querySelector("[data-choice]"),
      "switching language keeps choice actions",
    );
    w.document.querySelector("[data-choice]").click();
    app.changeLanguage("ru");
  }
  dismiss();
}
console.log(
  "ALL CHAPTER INTERACTIONS OK",
  turns,
  app.state.completed.length,
  app.state.changes.length,
);
// Dandelion wind: both illustrated station stages, the real travel menu in
// three languages, the density-compensated seed in flight, and a clean landing.
{
const beforeWind={x:app.scene.player.x,y:app.scene.player.y};
for(const id of [0,1]){
  const marker=app.scene.markers.find(m=>m.station===id);
  assert(marker,'station '+id+' exists');
  assert(marker.sprite.texture.key.startsWith('visual-'),'wind stations use illustrated atlas frames');
  app.state.x=marker.x;app.state.y=marker.y;
  app.scene.reset(app.state);app.scene.updateNear();
  assert.equal(app.scene.near.station,id);
  app.scene.interact();dismiss();
  assert(app.state.travel.stations.includes(id));
  const opened=app.scene.markers.find(m=>m.station===id).sprite;
  assert.equal(opened.visualKey,'dandelion');
  assert(Math.abs(opened.displayWidth-64*1.7)<.1,'awakened plant retains station size');
}
app.scene.updateNear();app.scene.interact();
assert.equal(app.mode,'travel-menu');
app.changeLanguage('kk');
const travelKazakh=w.document.querySelector('.travel-lead').textContent;
app.changeLanguage('en');
assert.notEqual(w.document.querySelector('.travel-lead').textContent,travelKazakh,'travel menu updates its language');
app.changeLanguage('ru');
w.document.querySelector('[data-fly="0"]').click();
assert.equal(app.mode,'travel');
app.scene.flightTimeline.progress(.5);
const windSeed=app.scene.children.list.find(o=>o.visualKey==='travel-seed');
assert(windSeed&&windSeed.texture.key.startsWith('visual-'));
assert(windSeed.displayWidth<160,'flying seed stays in world units at flight zoom');
app.scene.skipFlight();
assert.equal(app.mode,'play');
assert(!windSeed.active,'landing releases the seed');
assert(app.scene.player.body.enable,'landing restores collisions');
const station0=app.scene.markers.find(m=>m.station===0);
assert(Math.hypot(app.state.x-station0.x,app.state.y-station0.y)<80,'landed beside the target station');
const saved=migrateSave(JSON.parse(JSON.stringify(app.state)));
assert.deepEqual(saved.travel.stations.slice().sort(),[0,1],'awakened stations survive a save round trip');
app.state.x=beforeWind.x;app.state.y=beforeWind.y;app.scene.reset(app.state);
console.log('DANDELION WIND: STATIONS, AWAKENING, WIND MAP, FLIGHT AND LANDING OK');
}
// Living world: mushroom bounce, look under a stone, clear litter, shake a pod,
// drink dew; counters, first-time facts and the journal Finds tab.
{
const before={x:app.state.x,y:app.state.y};
const visit=(kind)=>{
  for(const b of [0,1,2,3,4,5,6,7,8])app.scene.spawnBiome(BIOMES_ALL[b]);
  const o=app.scene.props.find(p=>p.active&&p.visible&&p.kind===kind&&!p.spent&&app.scene.animTime>=(p.readyAt||0));
  assert(o,'a '+kind+' prop exists');
  app.state.x=o.x;app.state.y=o.y+16;app.scene.reset(app.state);
  for(const b of [0,1,2,3,4,5,6,7,8])app.scene.spawnBiome(BIOMES_ALL[b]);
  const again=app.scene.props.find(p=>p.active&&p.pid===o.pid);
  app.scene.updateNear();
  assert.equal(app.scene.near?.kind,'prop','near a '+kind);
  assert.equal(app.scene.near.data.pid,again.pid);
  return again;
};
const w0=JSON.parse(JSON.stringify(app.state.world));
const mush=visit('mushroom');app.scene.interact();dismiss();
assert(app.scene.traverse.airborne&&app.scene.traverse.vz>400,'mushroom cap launches a high jump');
assert.equal(app.state.world.counts.bounce,w0.counts.bounce+1);
app.scene.traverse.airborne=false;app.scene.traverse.z=0;app.scene.traverse.vz=0;
const stone=visit('rock');const seen=app.state.discovered.length;app.scene.interact();dismiss();
assert(stone.spent,'a searched stone is spent');
assert(app.state.world.facts.includes('search'));
const litter=visit('plastic');app.scene.interact();dismiss();
assert(app.state.world.cleaned.includes(litter.pid),'cleared litter is remembered');
assert(migrateSave(JSON.parse(JSON.stringify(app.state))).world.cleaned.includes(litter.pid),'cleared litter survives a save');
const pod=visit('seedpod');app.scene.interact();dismiss();
assert.equal(app.state.world.counts.seeds,w0.counts.seeds+1);
const dew=app.scene.props.find(p=>p.active&&p.kind==='dew')||null;
if(dew){app.state.x=dew.x;app.state.y=dew.y+10;app.scene.reset(app.state);app.scene.updateNear();
  if(app.scene.near?.objectAction==='dew'){app.scene.interact();dismiss();assert(app.scene.boostUntil>app.scene.animTime,'dew gives a burst of speed');}}
app.openJournal('finds');
assert(w.document.querySelector('.finds-grid'),'journal shows the Finds tab');
assert(w.document.querySelectorAll('.find').length===6);
app.closePanel();
app.state.x=before.x;app.state.y=before.y;app.scene.reset(app.state);
console.log('LIVING WORLD: BOUNCE, SEARCH, LITTER, SEEDS, DEW AND FINDS OK',JSON.stringify(app.state.world.counts));
}
await checkCrossings({app,w,step,tapE,dismiss,getCanvas});
await checkEnvironment({app,w,step,tapE,dismiss,getCanvas});
await checkExpeditions({app,w,step,tapE,dismiss,getCanvas});
const replayProgress=JSON.stringify({quest:app.state.quest,stage:app.state.stage,eco:app.state.eco,discovered:app.state.discovered});
for(const id of ['prologue','night','catastrophe','restoration']){
  app.playCinematic(id,null,true);
  const stage=app.scene.cineLayers;
  stage.started-=4200;
  app.game.step(app.scene.time.now+16,16);
  assert(stage.layers.every(l=>l.sprite.active&&l.sprite.texture.key.startsWith('visual-')));
  writeFileSync(`tmp/cine-${id}.png`,getCanvas(app.game.canvas).toBuffer('image/png'));
  app.finishCinematic();
  assert(stage.destroyed&&stage.layers.length===0,'replay releases every plane');
}
assert.equal(JSON.stringify({quest:app.state.quest,stage:app.state.stage,eco:app.state.eco,discovered:app.state.discovered}),replayProgress,'parallax replays do not grant progress or discoveries');
console.log('PARALLAX SHOTS, BEDROOM, REPLAYS AND CLEANUP OK');
const view = app.state.seen;
app.scene.perspective();
assert.equal(app.mode, "perspective");
app.scene.restorePerspective();
await new Promise((r) => setTimeout(r, 1500));
assert.equal(app.mode, "play");
app.openJournal("cinema");
assert.equal(app.mode, "journal");
app.closePanel();
await app.finishStory();
assert.equal(app.mode, "cinematic");
app.finishCinematic();
assert.equal(app.mode, "cinematic");
app.nextShot();
app.nextShot();
assert.equal(app.scene.cineLayers.theme,'room');
assert.equal(app.scene.cineLayers.morning,true);
app.scene.cineLayers.started-=3100;
step(70);
app.game.step(app.scene.time.now+16,16);
writeFileSync('tmp/cine-bedroom-morning.png',getCanvas(app.game.canvas).toBuffer('image/png'));
app.nextShot();
assert(app.scene.cineLayers.actors.some(a=>a.to?.x>.7),'the final shot retains the walk toward the window');
app.scene.cineLayers.started-=5300;
app.game.step(app.scene.time.now+16,16);
writeFileSync('tmp/cine-window.png',getCanvas(app.game.canvas).toBuffer('image/png'));
app.finishCinematic();
assert.equal(app.mode, "end");
assert(w.document.querySelector("#before-ending"));
await w.document.querySelector("#before-ending").onclick();
assert.equal(app.mode, "play");
assert.equal(app.state.ended, false);
console.log("FINALE AND RETURN OK");
clearTimeout(app.cineTimer);
app.game.destroy(true);
dom.window.close();
if (errors.length) throw Error(errors.map((e) => e.message).join("\n"));
console.log("NODE INTEGRATION PASSED" + (offline ? " · OFFLINE HTML" : ""));
process.exit(0);
