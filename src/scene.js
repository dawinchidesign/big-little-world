import Phaser from "phaser";
import { gsap } from "gsap";
import { createTextures, rng } from "./art.js";
import { preloadVisuals, installVisuals, visualEntry } from "./visuals.js";
import { windAt } from "./atmosphere.js";
import { ParallaxStage } from "./parallax.js";
import { BIOMES, L, T, speciesById } from "./content.js";
import { QUESTS, SECRETS } from "./quests.js";
import { BW, BH, WW, WH, biomeAt, activeStage, npcBehavior } from "./model.js";
import { VIEWS } from "./perspectives.js";
import { Grade } from "./grade.js";
import { STATIONS, TRAVEL_UI, makeTravelTextures } from "./travel.js";
import { PROP_ACTIONS, WORLD_UI } from "./interactions.js";
import { UW } from "./underwater.js";
import { COLONY_UI, COLONY_ENTRANCE } from "./colony-data.js";
import {
  Traversal,
  TRAILS,
  PLATFORMS,
  TRAIL_UI,
  byTrail,
} from "./traversal.js";
const dist = (a, b) => Math.hypot(a.x - b.x, a.y - b.y);
const flying = [
  "bee",
  "bumblebee",
  "wasp",
  "butterfly",
  "moth",
  "dragonfly",
  "mosquito",
  "firefly",
];
export class WorldScene extends Phaser.Scene {
  constructor(app) {
    super("World");
    this.app = app;
    this.props = [];
    this.npcs = [];
    this.chunks = new Map();
    this.markers = [];
    this.animTime = 0;
    this.lastBiome = -1;
    this.observing = false;
    this.scanning = false;
    this.jumping = 0;
    this.dir = 0;
    this.cinematic = false;
    this.humanView = false;
    this.near = null;
    this.escort = [];
    this.roomObjects = [];
    this.pollination = 0;
    this.lastPollination = 0;
    this.cineCleanup = null;
    this.changeSprites = [];
    this.traverse = new Traversal();
    this.canopyLeaves = [];
  }
  preload() {
    this.load.on("loaderror", (file) => this.app.assetErrors.add(file.key));
    preloadVisuals(this);
    for (const key of [
      "grass",
      "flower",
      "pinkflower",
      "mushroom",
      "log",
      "fern",
      "waterweed",
      "pondweed",
      "waterarch",
      "waterroot",
    ])
      this.load.image(
        key + "-hi",
        globalThis.LITTLE_WORLD_ASSETS?.[key + "-hi.png"] ||
          "./assets/" + key + "-hi.png",
      );
  }
  create() {
    if (this.app.assetErrors.size) {
      this.app.readyReject(Error("Required art could not load"));
      return;
    }
    createTextures(this);
    installVisuals(this);
    makeTravelTextures(this, visualEntry);
    this.physics.world.setBounds(24, 24, WW - 48, WH - 48);
    this.obstacles = this.physics.add.staticGroup();
    for (const b of BIOMES)
      this.add
        .image(b.cell[0] * BW, b.cell[1] * BH, "ground" + b.id)
        .setOrigin(0)
        .setScale(2)
        .setDepth(-100);
    this.player = this.physics.add
      .sprite(540, 620, "hero0-0")
      .setOrigin(0.5, 1)
      .setScale(1.6)
      .setDepth(620);
    this.player.body.setSize(10, 7).setOffset(7, 26);
    this.player.setCollideWorldBounds(true);
    this.playerShadow = this.add
      .image(540, 620, "shadow")
      .setAlpha(0.28)
      .setScale(0.5)
      .setDepth(3);
    this.playerGlider = this.add
      .image(540, 580, "leaf-glider")
      .setScale(0.6)
      .setVisible(false);
    this.cameraAnchor = this.add.zone(540, 620, 1, 1);
    this.createCanopy();
    this.physics.add.collider(
      this.player,
      this.obstacles,
      () => {
        this.collidedAt = this.time.now;
      },
      () => !this.jumping && this.traverse.z < 12 && !this.traverse.climb,
    );
    this.guide = this.add
      .image(540, 550, "light")
      .setScale(0.18)
      .setDepth(6000)
      .setBlendMode(Phaser.BlendModes.ADD);
    this.questRing = this.add.graphics().setDepth(6001);
    this.worldFx = this.add.graphics().setDepth(5900);
    this.overlay = this.add.graphics().setScrollFactor(0).setDepth(7000);
    this.weather = this.add.graphics().setScrollFactor(0).setDepth(7100);
    this.lightGlow = this.add
      .image(0, 0, "light")
      .setScale(2.5)
      .setDepth(6000)
      .setBlendMode(Phaser.BlendModes.ADD)
      .setAlpha(0.25);
    this.cameras.main
      .setBounds(0, 0, WW, WH)
      .setZoom(1.2)
      .startFollow(this.cameraAnchor, true, 0.075, 0.075);
    this.grade = new Grade(this, 0);
    this.light = { dark: 0.2, night: 0 };
    this.keys = this.input.keyboard.addKeys(
      "W,A,S,D,UP,DOWN,LEFT,RIGHT,E,Q,C,M,J,V,SPACE,SHIFT,ESC,F",
    );
    this.input.keyboard.addCapture(["SPACE", "UP", "DOWN", "LEFT", "RIGHT"]);
    const actions = {
      E: () => this.interact(),
      Q: () => this.toggleObserve(),
      C: () => this.toggleScan(),
      M: () => this.app.openMap(),
      J: () => this.app.openJournal(),
      V: () => this.perspective(),
      ESC: () => this.app.escape(),
      F: () => this.app.fullscreen(),
      SPACE: () => this.jump(),
    };
    for (const [k, fn] of Object.entries(actions))
      this.keys[k].on("down", (_key, event) => {
        if (this.app.scene !== this) return;
        event?.stopPropagation?.();
        if (this.app.mode === "play" && !this.cinematic && !this.humanView)
          fn();
        else if (k === "ESC") this.app.escape();
      });
    this.input.on("pointerdown", (p) => {
      if (this.app.mode === "play" && p.event.button === 2)
        this.toggleObserve();
    });
    this.input.mouse?.disableContextMenu();
    this.time.addEvent({
      delay: 30000,
      loop: true,
      callback: () => {
        if (this.app.mode === "play" && !this.cinematic) this.app.save(false);
      },
    });
    this.app.scene = this;
    // Arcade applies final body position in postupdate: follow the visible hero.
    this.events.on("postupdate", () => {
      if (this.app.mode === "play" && !this.cinematic && !this.humanView)
        this.renderHeight();
    });
    this.app.readyResolve();
  }
  reset(s) {
    this.clearCinematic();
    this.observing = false;
    this.scanning = false;
    this.humanView = false;
    this.jumping = 0;
    this.pendingCine = null;
    this.flightTimeline?.kill();
    this.flightTimeline = null;
    this.travelling = false;
    this.player.body.enable = true;
    this.cameras.main.setRotation(0);
    this.cameras.main.useBounds = true;
    gsap.killTweensOf(this.player);
    this.player.setPosition(s.x, s.y).setVisible(true).setAlpha(1).setScale(1.6);
    this.player.body.reset(s.x, s.y);
    this.traverse = new Traversal(s.traversal, s.x, s.y);
    this.renderHeight();
    this.safeFoot = { x: s.x, y: s.y };
    this.cameras.main
      .stopFollow()
      .setZoom(1.2)
      .startFollow(this.cameraAnchor, true, 0.08, 0.08);
    this.lastBiome = -1;
    this.syncBiome(true);
    this.refreshMarkers();
    if (this.waterZone) {
      const w = this.waterZone,
        d =
          ((this.player.x - w.x) / w.rx) ** 2 +
          ((this.player.y - w.y) / w.ry) ** 2;
      if (d < 1 && Math.abs(this.player.x - 3966) > 32) {
        this.player.body.reset(this.player.x, w.y - w.ry - 25);
        s.x = this.player.x;
        s.y = this.player.y;
        this.safeFoot = { x: s.x, y: s.y };
      }
    }
    this.applyChanges(true);
    this.pollinationPrepared = false;
    if (activeStage(s)?.action === "pollinate") this.preparePollination();
    this.app.refreshHud();
  }
  safePosition(x, y) {
    const important = QUESTS.flatMap((q) =>
      q.stages.flatMap((s) => s.points),
    ).concat(
      SECRETS.map((s) => s.pos),
      PLATFORMS.map((p) => [p.x, p.y]),
      STATIONS.map((p) => [p.x, p.y]),
      [[COLONY_ENTRANCE.x, COLONY_ENTRANCE.y]],
    );
    return important.every(([a, b]) => Math.hypot(x - a, y - b) > 125);
  }
  createCanopy() {
    for (const route of TRAILS) {
      for (const [i, p] of route.platforms.entries()) {
        this.add.image(p.x, p.y, 'canopy-stem')
          .setOrigin(.5,.985)
          .setScale(i===0?1:.8,(p.z+10)/180)
          .setDepth(p.y-4);
        const shade = this.add
          .image(p.x, p.y + 3, "shadow")
          .setScale(2.1, 0.9)
          .setAlpha(0.18)
          .setDepth(3);
        const leaf = this.add
          .image(p.x, p.y - p.z, route.biome === 7 ? "canopy-night" : route.biome === 2 ? "canopy-flower" : i % 3 === 2 ? "canopy-fern" : "canopy-leaf")
          .setScale(p.rx / 82, p.ry / 35)
          .setDepth(p.y + 2);
        this.canopyLeaves.push({ sprite: leaf, z: p.z, seed: i + route.biome });
        if (i === route.platforms.length - 1) {
          const dew = this.add
            .image(p.x + 24, p.y - p.z - 9, "dew")
            .setScale(0.6)
            .setDepth(p.y + 3);
          this.canopyLeaves.push({
            sprite: dew,
            z: p.z,
            seed: i + route.biome,
            dew: true,
          });
        }
      }
    }
  }
  renderHeight() {
    const z = this.traverse.z;
    this.jumpHeight = z;
    this.player.setOrigin(0.5, 1 + z / this.player.displayHeight);
    this.player.body.setOffset(7, 26 + z / 1.6);
    this.player.setDepth(this.player.y + 4 + z * 0.1);
    this.playerGlider
      .setVisible(this.traverse.gliding)
      .setPosition(this.player.x, this.player.y - z - 44)
      .setDepth(this.player.y + 6 + z * 0.1);
    this.playerShadow
      .setPosition(this.player.x, this.player.y + 3)
      .setScale(Math.max(0.18, 0.48 - z * 0.001))
      .setAlpha(Math.max(0.1, 0.27 - z * 0.0005));
    this.cameraAnchor.setPosition(this.player.x, this.player.y - z);
  }
  canopyAction(near) {
    const route = byTrail(near.route);
    if (near.routeAction === "observe") {
      if (this.app.state.traversal.completed.includes(route.id)) return;
      this.app.state.traversal.completed.push(route.id);
      this.app.audio.play("discovery");
      this.burst(near.x, near.y - near.z, 0xc6e2a9);
      this.app.dialog(route.title, route.fact, () => {
        this.refreshMarkers();
        this.app.save(false);
        if (route.id === "flower-canopy")
          this.app.playCinematic("metamorphosis");
      });
      return;
    }
    if (this.traverse.attach(route.id, this.player.x, this.player.y)) {
      if (!this.app.state.traversal.visited.includes(route.id)) {
        this.app.state.traversal.visited.push(route.id);
        this.app.toast(
          this.app.l(TRAIL_UI.discovered) + " · " + this.app.l(route.name),
        );
      }
      this.app.toast(this.app.l(TRAIL_UI.controls));
      this.app.state.traversal = this.traverse.snapshot(
        this.app.state.traversal,
      );
      this.player.setVelocity(0);
      this.app.save(false);
    }
  }
  spawnBiome(b) {
    if (this.chunks.has(b.id)) return;
    const r = rng(100 + b.id),
      objects = [],
      props = [],
      npcs = [];
    const bx = b.cell[0] * BW,
      by = b.cell[1] * BH;
    const cleaned = this.app.state.world.cleaned;
    let pidCounter = 0;
    const addProp = (x, y, key, scale, solid = false) => {
      // Stable ids (same seed, same order) let cleared litter stay cleared across visits.
      const pid = b.id * 1000 + pidCounter++;
      if (cleaned.includes(pid)) {
        r();
        r();
        return null;
      }
      const hi = [
        "grass",
        "flower",
        "pinkflower",
        "mushroom",
        "log",
        "fern",
      ].includes(key);
      const tex = hi ? key + "-hi" : key;
      const o = this.add
        .image(x, y, tex)
        .setOrigin(0.5, 0.94)
        .setScale(scale)
        .setDepth(y);
      o.baseX = x;
      o.baseY = y;
      o.baseAngle = (r() - 0.5) * 9;
      o.kind = key;
      o.seed = r() * 7;
      o.pid = pid;
      o.baseScale = scale;
      o.bend = 0;
      objects.push(o);
      props.push(o);
      if (solid) {
        const block = this.add.zone(
          x,
          y - 9,
          Math.min(o.displayWidth * 0.35, 95),
          14,
        );
        this.obstacles.add(block);
        block.body.setSize(block.width, 14);
        objects.push(block);
        o.block = block;
      }
      if (["mushroom", "flower", "pinkflower", "blueflower"].includes(key)) {
        o.food = true;
      }
      if (key === "mushroom" && (b.id === 4 || b.id === 7)) {
        const glow = this.add
          .image(x, y - 40, "light")
          .setScale(1)
          .setAlpha(0.18)
          .setBlendMode(Phaser.BlendModes.ADD)
          .setDepth(y + 1);
        objects.push(glow);
        o.glow = glow;
      }
      return o;
    };
    for (let i = 0; i < 118; i++) {
      const x = bx + 55 + r() * (BW - 110),
        y = by + 70 + r() * (BH - 110);
      if (
        !this.safePosition(x, y) ||
        Math.abs(x - bx - BW / 2) < 65 ||
        Math.abs(y - by - BH / 2) < 70
      )
        continue;
      if (
        b.id === 3 &&
        (x - (bx + 840)) ** 2 / 480 ** 2 + (y - (by + 680)) ** 2 / 265 ** 2 <
          1.1
      )
        continue;
      let key = "grass",
        scale = 0.7 + r() * 0.7;
      if (b.id === 1) {
        key = r() > 0.35 ? "rock" : "mushroom";
        scale = 0.65 + r() * 0.5;
      } else if (b.id === 2) {
        key = ["flower", "pinkflower", "fern", "grass"][i % 4];
        scale = 0.7 + r() * 0.7;
      } else if (b.id === 4) {
        key = ["mushroom", "fern", "leaf", "log"][i % 4];
        scale = 0.7 + r() * 0.7;
      } else if (b.id === 5) {
        key = ["plastic", "rock", "cap", "grass"][i % 4];
        scale = 0.9 + r();
      } else if (b.id === 6) {
        key = ["toxic", "grass", "rock"][i % 3];
        scale = 1 + r() * 0.6;
      } else if (b.id === 7) {
        key = ["grass", "mushroom", "fern", "blueflower"][i % 4];
        scale = 0.6 + r() * 0.8;
      } else if (b.id === 8) {
        key = ["flower", "pinkflower", "fern", "grass"][i % 4];
      } else key = ["grass", "grass", "fern", "rock", "leaf"][i % 5];
      if(b.id===0&&i%11===0)key='moss-fan';
      if(b.id===2&&i%13===0)key='seedpod';
      if(b.id===4&&i%5===0)key='fungal-cluster';
      if([1,3,8].includes(b.id)&&key==='rock'&&i%2===0)key='lichen-stone';
      addProp(x, y, key, scale, ["rock", "log", "lichen-stone"].includes(key));
    }
    // Composed landmarks, separate from procedural undergrowth.
    if (b.id === 0) {
      addProp(bx + 280, by + 465, "grass", 1.9);
      addProp(bx + 960, by + 350, "fern", 1.7);
      addProp(bx + 1330, by + 880, "log", 1.4);
      addProp(bx + 1080, by + 735, "dew", 1.6, true);
      addProp(bx + 1140, by + 735, "dew", 1.6, true);
      addProp(bx + 290, by + 910, "pinkflower", 1.6);
    }
    if (b.id === 1) {
      addProp(bx + 210, by + 530, "gate", 1.2);
      for (let i = 0; i < 4; i++) {
        const x = bx + 450 + i * 225,
          y = by + 300 + (i % 2) * 480;
        addProp(x, y, "brood", 1.2);
        const g = this.add
          .image(x, y - 35, "light")
          .setScale(1.9)
          .setTint(0xf8ba63)
          .setAlpha(0.35)
          .setBlendMode(Phaser.BlendModes.ADD)
          .setDepth(6000);
        objects.push(g);
      }
    }
    if (b.id === 2) {
      addProp(bx + 250, by + 400, "flower", 2);
      addProp(bx + 730, by + 930, "pinkflower", 1.7);
      addProp(bx + 1310, by + 400, "flower", 1.7);
    }
    if (b.id === 3) {
      addProp(bx+470,by+630,'lily',1.2);
      addProp(bx+1190,by+770,'lily',.95);
      addProp(bx + 330, by + 920, "reed", 2);
      addProp(bx + 1320, by + 790, "reed", 2);
      addProp(bx + 1250, by + 360, "pipe", 1.3);
      const water = this.add.zone(bx + 840, by + 690, 880, 400);
      this.obstacles.add(water);
      water.body.setSize(880, 400);
      objects.push(water); // traversable natural bridge across water
      water.body.checkCollision.none = true;
      this.waterZone = { x: bx + 840, y: by + 690, rx: 455, ry: 235 };
    }
    if (b.id === 4) {
      addProp(bx + 680, by + 450, "log", 2.6);
      addProp(bx + 270, by + 950, "mushroom", 1.9);
      addProp(bx + 1330, by + 600, "mushroom", 1.9);
    }
    if (b.id === 5) {
      addProp(bx + 320, by + 790, "bottle", 2);
      addProp(bx + 1120, by + 400, "plastic", 2.8);
      addProp(bx + 1340, by + 960, "cap", 1.7);
    }
    if (b.id === 8) addProp(bx + 1330, by + 850, "tree", 2.4, true);
    const count = b.id === 1 ? 25 : 18;
    for (let i = 0; i < count; i++) {
      const id = b.species[i % b.species.length];
      const x = bx + 170 + r() * (BW - 340),
        y = by + 180 + r() * (BH - 360);
      const o = this.add
        .image(x, y, id + "0")
        .setScale(id === "ant" ? 0.65 : id === "dragonfly" ? 1.2 : 0.9)
        .setDepth(y);
      const sh = this.add
        .image(x, y + 10, "shadow")
        .setScale(0.45)
        .setAlpha(0.19)
        .setDepth(2);
      o.species = id;
      o.home = { x, y };
      o.target = { x, y };
      o.phase = i;
      o.timer = r() * 2000;
      o.state = "move";
      o.shadow = sh;
      o.seed = r() * 100;
      o.carry = null;
      o.biome = b.id;
      objects.push(o, sh);
      npcs.push(o);
    }
    if (b.id === 0) {
      const o = this.add
        .image(650, 580, "ladybird0")
        .setScale(1.1)
        .setDepth(580);
      o.species = "ladybird";
      o.home = { x: 650, y: 580 };
      o.target = { x: 650, y: 580 };
      o.phase = 0;
      o.timer = 1500;
      o.state = "rest";
      o.seed = 17;
      o.biome = 0;
      o.shadow = this.add
        .image(650, 590, "shadow")
        .setScale(0.6)
        .setAlpha(0.2)
        .setDepth(2);
      objects.push(o, o.shadow);
      npcs.push(o);
    }
    this.chunks.set(b.id, { objects, props, npcs });
    this.props.push(...props);
    this.npcs.push(...npcs);
  }
  syncBiome(force = false) {
    const b = biomeAt(this.player.x, this.player.y);
    if (b.id === this.lastBiome && !force) return;
    this.lastBiome = b.id;
    const wanted = BIOMES.filter(
      (q) =>
        Math.abs(q.cell[0] - b.cell[0]) + Math.abs(q.cell[1] - b.cell[1]) <= 1,
    );
    for (const q of wanted) this.spawnBiome(q);
    for (const [id, chunk] of this.chunks) {
      if (!wanted.some((q) => q.id === id)) {
        for (const o of chunk.objects) o.destroy();
        this.props = this.props.filter((o) => !chunk.props.includes(o));
        this.npcs = this.npcs.filter((o) => !chunk.npcs.includes(o));
        this.chunks.delete(id);
      }
    }
    const s = this.app.state;
    if (!s.visited.includes(b.id)) {
      s.visited.push(b.id);
      this.app.regionToast(b);
      const cine = { 2: "valley", 5: "catastrophe", 7: "night" }[b.id];
      if (cine && this.app.mode === "play" && !this.cinematic)
        this.time.delayedCall(600, () => {
          if (!this.app.state.seen.includes(cine)) {
            if (this.app.mode === "play" && !this.cinematic && !this.humanView)
              this.app.playCinematic(cine);
            else this.pendingCine = cine;
          }
        });
    } else if (!force && this.app.mode === "play" && !this.cinematic)
      this.app.regionToast(b, { big: false });
    this.app.refreshHud();
    this.app.audio.enter(b.id, this.isNight(), s.eco);
  }
  isNight() {
    return (
      (this.cineBiome ?? this.lastBiome) === 7 ||
      this.app.state.time >= 19 ||
      this.app.state.time < 6
    );
  }
  applyChanges(reset = false) {
    if (reset) {
      for (const o of this.changeSprites) o.destroy();
      this.changeSprites = [];
      this.appliedChanges = 0;
    }
    for (const ch of this.app.state.changes.slice(this.appliedChanges || 0)) {
      let key =
        ch.action === "restore"
          ? ch.quest === 4
            ? "leaf"
            : "flower-hi"
          : ch.action === "build"
            ? ch.sprite === "reed"
              ? "reed"
              : ch.sprite === "leaf"
                ? "leaf"
                : "bridge"
            : ch.action === "shade"
              ? "lamp"
              : null;
      if (!key) continue;
      const o = this.add
        .image(ch.x, ch.y, key)
        .setOrigin(0.5, 0.94)
        .setScale(ch.action === "restore" ? 0.7 : 1)
        .setDepth(ch.y + 2);
      if (ch.action === "shade") o.setTint(0x3d5b5a);
      if (ch.action === "restore" && ch.quest !== 4) o.food = true;
      this.changeSprites.push(o);
    }
    this.appliedChanges = this.app.state.changes.length;
  }
  preparePollination() {
    if (this.pollinationPrepared) return;
    this.pollinationPrepared = true;
    this.pollination = 0;
    const ch = this.chunks.get(2);
    if (!ch) return;
    for (let i = 0; i < 3; i++) {
      const id = i === 2 ? "bumblebee" : "bee",
        x = 4240 + i * 28,
        y = 610 + i * 12;
      const o = this.add
        .image(x, y, id + "0")
        .setScale(0.9)
        .setDepth(y);
      o.species = id;
      o.home = { x, y };
      o.target = { x: 4260, y: 590 };
      o.seed = 2 + i;
      o.phase = 2;
      o.timer = 100;
      o.state = "feed";
      o.biome = 2;
      o.shadow = this.add
        .image(x, y + 10, "shadow")
        .setScale(0.4)
        .setAlpha(0.2)
        .setDepth(2);
      ch.objects.push(o, o.shadow);
      ch.npcs.push(o);
      this.npcs.push(o);
    }
  }
  refreshMarkers() {
    for (const o of this.markers) o.sprite.destroy();
    this.markers = [];
    const st = activeStage(this.app.state);
    if (st && this.app.state.quest !== 1)
      st.points.forEach(([x, y], i) => {
        if (this.app.state.progress.includes(i)) return;
        const key = speciesById[st.sprite] ? st.sprite + "0" : st.sprite;
        const sprite = this.add
          .image(x, y, key)
          .setOrigin(0.5, 0.85)
          .setScale(
            st.sprite === "tree"
              ? 0.65
              : st.sprite === "gate"
                ? 0.65
                : st.sprite === "bridge"
                  ? 0.75
                  : speciesById[st.sprite]
                    ? 1.1
                    : 1,
          )
          .setDepth(y + 4);
        if (st.action === "shade" && this.app.state.progress.includes(i))
          sprite.setTint(0x6d8984);
        this.markers.push({ sprite, x, y, index: i, kind: "quest", stage: st });
      });
    for (const s of SECRETS) {
      if (this.app.state.secrets.includes(s.id)) continue;
      const sprite = this.add
        .image(...s.pos, s.sprite)
        .setScale(0.8)
        .setDepth(s.pos[1]);
      this.markers.push({
        sprite,
        x: s.pos[0],
        y: s.pos[1],
        kind: "secret",
        data: s,
      });
    }
    const dive = this.add.image(3720, 1440, "dew").setScale(1.7).setDepth(1440);
    const entrance = this.add
      .image(COLONY_ENTRANCE.x, COLONY_ENTRANCE.y, "gate")
      .setScale(0.75)
      .setDepth(COLONY_ENTRANCE.y + 2);
    this.markers.push({
      sprite: entrance,
      ...COLONY_ENTRANCE,
      kind: "quest",
      colony: true,
      stage: { title: COLONY_UI.enter },
    });
    this.markers.push({
      sprite: dive,
      x: 3720,
      y: 1440,
      kind: "quest",
      dive: true,
      stage: { title: UW.dive },
    });
    const awake = this.app.state.travel.stations;
    for (const st of STATIONS) {
      const open = awake.includes(st.biome);
      const sprite = this.add
        .image(st.x, st.y, open ? "dandelion" : "dandelion-bud")
        .setOrigin(0.5, 0.96)
        .setScale(1.7)
        .setDepth(st.y);
      sprite.stationSeed = st.biome * 1.7;
      this.markers.push({
        sprite,
        x: st.x,
        y: st.y,
        kind: "quest",
        station: st.biome,
        stage: { title: open ? TRAVEL_UI.fly : TRAVEL_UI.wake },
      });
    }
    for (const route of TRAILS) {
      const first = route.platforms[0],
        last = route.platforms.at(-1);
      for (const z of [0, first.z]) {
        const sprite = this.add
          .image(first.x, first.y - z, "light")
          .setScale(0.13)
          .setTint(0xa6dfc3)
          .setDepth(first.y + 6);
        this.markers.push({
          sprite,
          x: first.x,
          y: first.y,
          z,
          kind: "quest",
          route: route.id,
          routeAction: "climb",
          stage: { title: z ? TRAIL_UI.descend : TRAIL_UI.climb },
        });
      }
      if (!this.app.state.traversal.completed.includes(route.id)) {
        const sprite = this.add
          .image(last.x, last.y - last.z - 12, "light")
          .setScale(0.17)
          .setDepth(last.y + 6);
        this.markers.push({
          sprite,
          x: last.x,
          y: last.y,
          z: last.z,
          kind: "quest",
          route: route.id,
          routeAction: "observe",
          stage: { title: TRAIL_UI.inspect },
        });
      }
    }
    this.makeEscort();
  }
  makeEscort() {
    if (this.escort.length) {
      this.escort.forEach((o) => o.destroy());
      this.escort = [];
    }
    if (activeStage(this.app.state)?.action === "escort") {
      const count = this.app.state.quest === 0 ? 1 : 7;
      for (let i = 0; i < count; i++) {
        const id = i % 3 === 0 ? "ant" : i % 3 === 1 ? "beetle" : "woodlouse";
        const o = this.add
          .image(
            this.player.x - 35 - i * 14,
            this.player.y + 20 + i * 7,
            id + "0",
          )
          .setScale(0.65);
        o.species = id;
        this.escort.push(o);
      }
    }
  }
  toggleObserve() {
    this.observing = !this.observing;
    this.app.refreshHud();
  }
  toggleScan() {
    if (!this.app.state.abilities.includes("scanner"))
      return this.app.toast(this.app.t("locked"));
    this.scanning = !this.scanning;
    this.app.audio.play("scan");
    this.app.refreshHud();
  }
  jump() {
    if (
      this.traverse.airborne ||
      this.app.mode !== "play" ||
      this.cinematic ||
      this.humanView
    )
      return;
    if (this.traverse.jump()) {
      this.jumping = 1;
      this.app.audio.play("jump");
    }
  }
  interact() {
    if (this.app.mode !== "play" || this.cinematic || this.humanView) return;
    if (this.traverse.climb) {
      this.jump();
      return;
    }
    const near = this.near;
    if (!near) return;
    if (near.routeAction) return this.canopyAction(near);
    if (near.kind === "npc") return this.app.speciesDialog(near.data.species);
    if (near.kind === "secret") {
      const d = near.data;
      this.app.state.secrets.push(d.id);
      this.app.audio.play("discovery");
      this.app.dialog(d.title, d.text, () => {
        this.refreshMarkers();
        this.app.save(false);
      });
      return;
    }
    if (near.kind === "prop") return this.propAction(near.data);
    if (near.station !== undefined) return this.stationAction(near);
    if (near.dive) return this.app.diveIn();
    if (near.colony) return this.app.burrowIn();
    const st = near.stage;
    if (st.action === "scan" && !this.scanning) {
      this.app.toast(
        L(
          T(
            "Включите сканер клавишей C",
            "C пернесімен сканерді қосыңыз",
            "Activate the scanner with C",
          ),
          this.app.lang,
        ),
      );
      return;
    }
    if (st.action === "observe" && !this.observing) {
      this.toggleObserve();
    }
    if (st.action === "pollinate" && this.pollination < 1) {
      this.observing = true;
      this.app.toast(
        L(
          T(
            "Оставайтесь рядом с цветами и наблюдайте за опылителями",
            "Гүлдер жанында қалып, тозаңдандырушыларды бақылаңыз",
            "Stay near the flowers and watch the pollinators",
          ),
          this.app.lang,
        ),
      );
      return;
    }
    if (
      st.action === "escort" &&
      this.escort.some((o) => dist(o, this.player) > 150)
    ) {
      this.app.toast(
        L(
          T(
            "Подождите отстающих жителей",
            "Артта қалған тұрғындарды күтіңіз",
            "Wait for those following behind",
          ),
          this.app.lang,
        ),
      );
      return;
    }
    if (st.action === "choice") return this.app.choose(st, near.index);
    if (st.action === "finale") return this.app.finishStory();
    const act = () => {
      if (st.action === "collect") {
        let k =
          st.sprite === "dew"
            ? "dew"
            : st.sprite === "leaf"
              ? "leaves"
              : "twigs";
        this.app.state.inventory[k]++;
      }
      this.app.advance(near.index);
    };
    this.app.audio.play(st.action === "restore" ? "water" : "click");
    this.burst(near.x, near.y, st.action === "clear" ? 0xc6d7bb : 0xf3d582);
    if (st.text)
      this.app.dialog(QUESTS[this.app.state.quest].intro, st.text, act);
    else act();
  }
  // Touching the world: each verb has its own feedback, sound and (once) a short fact.
  propAction(o) {
    const a = PROP_ACTIONS[o.kind];
    if (!a || !o.active) return;
    const s = this.app.state,
      w = s.world,
      now = this.animTime,
      base = o.baseScale || 1,
      side = Math.sign(o.x - this.player.x) || 1;
    let note = null;
    switch (a.verb) {
      case "dew": {
        this.boostUntil = now + 12000;
        this.app.audio.play("drink");
        this.app.audio.play("sparkle");
        this.squash(o, base * 1.15, base * 0.7, base * 0.3, 500);
        o.readyAt = now + 45000;
        this.time.delayedCall(45000, () => o.active && this.squash(o, base * 0.3, base * 0.3, base, 1200));
        this.burst(o.x, o.y - 20, 0xd8f6f2);
        note = this.app.l(WORLD_UI.fresh);
        break;
      }
      case "bounce": {
        if (this.traverse.airborne || this.traverse.climb) return;
        this.squash(o, base * 1.25, base * 0.72, base, 420);
        this.traverse.jump(520);
        this.jumping = 1;
        this.app.audio.play("boing", 0.9 + Math.random() * 0.2);
        this.dust(this.player.x, this.player.y, 8, 0xd9e6c8);
        o.readyAt = now + 900;
        break;
      }
      case "shake": {
        o.bend = 24 * side;
        this.app.audio.play("rustle");
        this.app.audio.play("sparkle", 1.2);
        for (let i = 0; i < 2; i++) this.burst(o.x, o.y - o.displayHeight * 0.7, 0xf2d66a);
        this.callPollinators(o);
        o.readyAt = now + 5000;
        break;
      }
      case "search": {
        o.spent = true;
        this.app.audio.play("rustle", 0.8);
        this.squash(o, base * 1.08, base * 0.86, base, 320);
        gsap.fromTo(o, { angle: o.baseAngle - 6 * side }, { angle: o.baseAngle, duration: 0.6, ease: "elastic.out(1,0.4)" });
        const pool = a.reveal.filter((id) => !(id === "cricket" && !this.isNight()));
        const found = Math.random() < 0.8 ? pool[Math.floor(Math.random() * pool.length)] : null;
        if (found) this.revealCritter(found, o);
        else note = this.app.l(WORLD_UI.empty);
        break;
      }
      case "clean": {
        o.spent = true;
        o.vanishing = true;
        this.app.audio.play("pop");
        gsap.to(o, { y: o.y - 26, alpha: 0, angle: o.angle + 25 * side, duration: 0.55, ease: "power2.in", onComplete: () => o.destroy() });
        o.glow?.destroy();
        o.block?.destroy();
        w.cleaned.push(o.pid);
        this.burst(o.x, o.y - 10, 0xe9e2c4);
        note = `${this.app.l(WORLD_UI.cleaned)}: ${w.counts.clean + 1}`;
        if ((w.counts.clean + 1) % 5 === 0) {
          s.eco.safety = Math.min(100, s.eco.safety + 2);
          note = this.app.l(WORLD_UI.cleaner);
          this.app.audio.play("chime");
        }
        break;
      }
      case "seeds": {
        o.bend = 20 * side;
        this.app.audio.play("rustle", 1.2);
        for (let i = 0; i < 3; i++) this.burst(o.x + side * 6, o.y - o.displayHeight * 0.6, 0xc9ad74);
        o.readyAt = now + 6000;
        break;
      }
    }
    w.counts[a.verb]++;
    if (!w.facts.includes(a.verb)) {
      w.facts.push(a.verb);
      this.app.dialog(a.label, WORLD_UI.facts[a.verb], () => this.app.save(false));
    } else {
      if (note) this.app.toast(note);
      this.app.save(false);
    }
  }
  // Pollinators nearby come to a shaken flower; if none are around, one flies in.
  callPollinators(flower) {
    const top = { x: flower.x, y: flower.y - flower.displayHeight * 0.6 };
    const near = this.npcs.filter((n) => n.active && ["bee", "bumblebee", "butterfly"].includes(n.species) && dist(n, flower) < 650);
    for (const n of near.slice(0, 3)) {
      n.target = { x: top.x + (Math.random() - 0.5) * 20, y: top.y };
      n.state = "feed";
      n.timer = 7000;
    }
    if (near.length) return;
    const biome = BIOMES[this.lastBiome],
      id = ["bee", "bumblebee", "butterfly"].find((k) => biome?.species.includes(k)) || "butterfly";
    const from = { x: top.x + (Math.random() < 0.5 ? -1 : 1) * 320, y: top.y - 120 };
    const v = this.add.image(from.x, from.y, id + "0").setScale(0.9).setDepth(flower.y + 40);
    const anim = this.time.addEvent({ delay: 80, loop: true, callback: () => v.active && v.setTexture(id + (Math.floor(this.animTime / 85) % 4)) });
    gsap
      .timeline({ onComplete: () => (anim.remove(), v.destroy()) })
      .to(v, { x: top.x, y: top.y, duration: 2.2, ease: "sine.inOut", onUpdate: () => (v.rotation = Math.atan2(top.y - v.y, top.x - v.x) + Math.PI / 2) })
      .add(() => {
        this.burst(top.x, top.y, 0xf2d66a);
        if (this.observing || dist(v, this.player) < 180) this.discover(id);
      })
      .to(v, { x: top.x + 340, y: top.y - 160, duration: 2.6, delay: 1.6, ease: "sine.in" });
  }
  // A hidden creature scurries out from under a leaf, stone or bark.
  revealCritter(id, from) {
    const c = this.add.image(from.x, from.y - 4, id + "0").setScale(id === "ant" ? 0.65 : 0.85).setDepth(from.y + 3);
    const a = Math.random() * Math.PI * 2,
      to = { x: from.x + Math.cos(a) * 130, y: from.y + Math.sin(a) * 70 };
    c.rotation = Math.atan2(to.y - c.y, to.x - c.x) + Math.PI / 2;
    const anim = this.time.addEvent({ delay: 60, loop: true, callback: () => c.active && c.setTexture(id + (Math.floor(this.animTime / 90) % 4)) });
    gsap
      .timeline({ onComplete: () => (anim.remove(), c.destroy()) })
      .from(c, { y: c.y + 8, alpha: 0, duration: 0.25 })
      .to(c, { x: to.x, y: to.y, duration: 1.8, ease: "power1.in" }, 0.35)
      .to(c, { alpha: 0, duration: 0.4 }, "-=0.4");
    this.dust(from.x, from.y, 4, 0x9b8a6a);
    this.discover(id);
  }
  // Squash-and-stretch through setScale, which compensates high-density atlas art.
  // (Tweening scaleX/scaleY directly would bypass that and blow sprites up ×4.)
  squash(obj, fromX, fromY, to, duration) {
    const s = { x: fromX, y: fromY };
    this.tweens.killTweensOf(s);
    obj.setScale(fromX, fromY);
    this.tweens.add({
      targets: s,
      x: to,
      y: to,
      duration,
      ease: "Back.easeOut",
      onUpdate: () => obj.active && obj.setScale(s.x, s.y),
      onComplete: () => obj.active && obj.setScale(to),
    });
  }
  stationAction(near) {
    const s = this.app.state,
      id = near.station;
    if (this.traverse.z > 12 || this.traverse.climb) return;
    if (!s.travel.stations.includes(id)) {
      s.travel.stations.push(id);
      this.app.audio.play("bloom");
      const sprite = near.sprite;
      sprite.setTexture("dandelion");
      this.squash(sprite, 1.3, 2.1, 1.7, 650);
      this.seedPuff(near.x, near.y - 70, 22, 0.8);
      this.grade.pulse(0.25, 0.8);
      const first = s.travel.stations.length === 1;
      const after = () => {
        this.refreshMarkers();
        this.app.save(false);
      };
      if (first) this.app.dialog(TRAVEL_UI.introTitle, TRAVEL_UI.intro, after);
      else {
        this.app.toast(this.app.l(TRAVEL_UI.awakened));
        after();
      }
      return;
    }
    this.app.openTravel(id);
  }
  seedPuff(x, y, count = 14, spread = 1) {
    for (let i = 0; i < count; i++) {
      const o = this.add
        .image(x + (Math.random() - 0.5) * 30, y + (Math.random() - 0.5) * 24, "fluff")
        .setScale(0.6 + Math.random() * 0.8)
        .setDepth(6004);
      const a = -Math.PI / 2 + (Math.random() - 0.5) * 2.4 * spread;
      gsap.to(o, {
        x: o.x + Math.cos(a) * (60 + Math.random() * 120) + 40,
        y: o.y + Math.sin(a) * (50 + Math.random() * 90),
        angle: (Math.random() - 0.5) * 240,
        alpha: 0,
        duration: 1.4 + Math.random() * 1.6,
        ease: "sine.out",
        onComplete: () => o.destroy(),
      });
    }
  }
  dust(x, y, count = 3, color = 0xc9bc92) {
    if (this.app.state.settings.low) return;
    for (let i = 0; i < count; i++) {
      const o = this.add
        .rectangle(x + (Math.random() - 0.5) * 10, y - 1, 2, 2, color)
        .setAlpha(0.7)
        .setDepth(y - 1);
      gsap.to(o, {
        x: o.x + (Math.random() - 0.5) * 22,
        y: o.y - 4 - Math.random() * 7,
        alpha: 0,
        scale: 2,
        duration: 0.45 + Math.random() * 0.3,
        ease: "power1.out",
        onComplete: () => o.destroy(),
      });
    }
  }
  // Dandelion flight: take-off, a banked flight above the real world, landing at the target station.
  flyTo(biome) {
    const target = STATIONS.find((s) => s.biome === biome);
    if (!target || this.travelling) return;
    const app = this.app,
      cam = this.cameras.main,
      low = !!app.state.settings.low;
    this.travelling = true;
    this.cinematic = true;
    this.observing = false;
    this.scanning = false;
    app.mode = "travel";
    app.resetInput(false);
    app.refreshHud();
    this.player.setVelocity(0);
    // The flight path leaves the world bounds near the top edge; the body rejoins physics on landing.
    this.player.body.enable = false;
    for (const b of BIOMES) this.spawnBiome(b);
    const from ={ x: this.player.x, y: this.player.y },
      to = { x: target.x + 44, y: target.y + 26 },
      span = Math.hypot(to.x - from.x, to.y - from.y),
      peak = 170 + span * 0.07,
      dirX = Math.sign(to.x - from.x) || 1;
    const seed = this.add.image(from.x, from.y - 40, "travel-seed").setScale(1.8).setOrigin(0.5, 0.85).setDepth(9001).setAlpha(0);
    const origin = this.markers.find((m) => m.station !== undefined && Math.hypot(m.x - from.x, m.y - from.y) < 160);
    if (origin) this.seedPuff(origin.x, origin.y - 70, 26, 1);
    app.audio.play("bloom");
    app.audio.play("whoosh");
    cam.stopFollow();
    cam.useBounds = false;
    const look = { x: cam.midPoint.x, y: cam.midPoint.y, rot: 0 };
    const zoomAt = (u) => {
      const s = (a, b, v) => Math.max(0, Math.min(1, (v - a) / (b - a)));
      const up = s(0, 0.4, u),
        down = s(0.62, 1, u);
      const out = up * up * (3 - 2 * up) * (1 - down * down * (3 - 2 * down));
      return 1.2 - (1.2 - (span > 1800 ? 0.4 : 0.5)) * out;
    };
    // Keep the framed view inside the painted world, even with bounds off for rotation.
    const frame = (x, y, zoom) => {
      const hw = 480 / zoom,
        hh = 270 / zoom;
      cam.centerOn(
        hw * 2 >= WW ? WW / 2 : Math.max(hw, Math.min(WW - hw, x)),
        hh * 2 >= WH ? WH / 2 : Math.max(hh, Math.min(WH - hh, y)),
      );
    };
    const place = (u, t, zoom = 1.2) => {
      // The hero stays readable as the camera pulls back: sprites counter-scale part of the zoom.
      const grow = Math.pow(1.2 / zoom, 0.8);
      this.player.setScale(1.6 * grow);
      seed.setScale(1.8 * grow);
      const e = u * u * (3 - 2 * u),
        gx = from.x + (to.x - from.x) * e,
        gy = from.y + (to.y - from.y) * e,
        sway = Math.sin(u * Math.PI * 5) * 22 * Math.sin(u * Math.PI),
        z = peak * Math.sin(u * Math.PI) + 34 * Math.min(1, u * 8);
      const hx = gx + sway,
        hy = gy - z;
      this.player.setPosition(hx, hy + 36 * grow).setOrigin(0.5, 1).setDepth(9000);
      this.player.setTexture("hero-glide" + (Math.floor(t / 150) % 4));
      seed.setPosition(hx, hy - 2).setAngle(Math.sin(t / 260) * 7 + (to.x - from.x > 0 ? 6 : -6));
      this.playerShadow
        .setPosition(gx, gy + 3)
        .setScale(Math.max(0.12, 0.45 - z * 0.0012))
        .setAlpha(Math.max(0.06, 0.25 - z * 0.0006));
      return { hx, hy, gx, gy };
    };
    const tl = gsap.timeline();
    this.flightTimeline = tl;
    // Take-off: the hero grasps a seed and rises.
    const lift = { u: 0 };
    tl.to(seed, { alpha: 1, duration: 0.3 })
      .to(lift, {
        u: 1,
        duration: 1.0,
        ease: "power2.in",
        onUpdate: () => {
          const z = 34 * lift.u;
          this.player.setPosition(from.x, from.y - z + 36 * lift.u).setTexture("hero-glide" + (Math.floor(performance.now() / 150) % 4)).setDepth(9000);
          seed.setPosition(from.x, from.y - z - 2 + 36 * lift.u - 36);
          cam.setZoom(1.2 - 0.12 * lift.u);
          frame(look.x, look.y - 20 * lift.u, cam.zoom);
        },
      }, "<");
    // Flight over the world.
    const flight = { u: 0 };
    const duration = Math.min(7, 3.4 + span / 1300);
    let last = null,
      titled = false;
    tl.add(() => {
      app.wind.start();
      app.audio.play("wind", 4.2 / (duration + 0.4));
    }).to(flight, {
      u: 1,
      duration,
      ease: "none",
      onUpdate: () => {
        const t = performance.now(),
          u = flight.u,
          zoom = zoomAt(u),
          p = place(u, t, zoom);
        // Lead the hero along the path and bank into turns.
        const vx = last ? p.hx - last.hx : 0,
          vy = last ? p.hy - last.hy : 0;
        last = p;
        const lead = 7 / zoom;
        look.x += (p.hx + vx * lead - look.x) * 0.12;
        look.y += (p.hy + vy * lead - look.y) * 0.12;
        look.rot += (Math.max(-0.05, Math.min(0.05, vx * 0.004)) - look.rot) * 0.06;
        cam.setZoom(zoom).setRotation(low ? 0 : look.rot);
        frame(look.x, look.y, zoom);
        const power = Math.sin(Math.PI * Math.min(1, u * 1.15));
        app.wind.power = low ? power * 0.4 : power;
        app.wind.vx = vx || dirX;
        app.wind.vy = vy;
        const under = biomeAt(p.gx, p.gy);
        if (under) this.cineBiome = under.id;
        if (!titled && u > 0.4) {
          titled = true;
          app.regionToast(BIOMES[biome], { mood: "wind", big: true });
        }
      },
    });
    // Landing: let go of the seed, which sails on with the wind.
    const land = { u: 0 };
    tl.add(() => {
      app.wind.stop();
      app.audio.play("chime");
      app.audio.play("dust");
      this.dust(to.x, to.y, 9);
      this.seedPuff(to.x, to.y - 30, 6, 0.6);
      gsap.to(seed, { x: seed.x + dirX * 260, y: seed.y - 220, angle: dirX * 30, alpha: 0, duration: 2.4, ease: "sine.in", onComplete: () => seed.destroy() });
      this.grade.pulse(0.2, 0.6);
    }).to(land, {
      u: 1,
      duration: 0.55,
      ease: "power2.out",
      onUpdate: () => {
        cam.setZoom(1.05 + 0.15 * land.u).setRotation(low ? 0 : look.rot * (1 - land.u));
        look.x += (to.x - look.x) * 0.2;
        look.y += (to.y - 20 - look.y) * 0.2;
        frame(look.x, look.y, cam.zoom);
      },
    });
    tl.eventCallback("onComplete", () => this.finishFlight(to, seed));
  }
  skipFlight() {
    if (!this.flightTimeline) return;
    this.app.wind.stop();
    this.flightTimeline.progress(1);
  }
  finishFlight(to, seed) {
    if (!this.travelling) return;
    const app = this.app,
      cam = this.cameras.main;
    this.flightTimeline = null;
    if (seed?.active) gsap.killTweensOf(seed), seed.destroy();
    app.wind.stop();
    this.travelling = false;
    this.cinematic = false;
    this.cineBiome = null;
    this.player.setPosition(to.x, to.y).setTexture("hero-idle0-0").setVisible(true);
    this.player.body.enable = true;
    this.player.body.reset(to.x, to.y);
    this.squash(this.player, 1.75, 1.45, 1.6, 260);
    this.traverse = new Traversal({ ...app.state.traversal, z: 0, platform: null, climb: null }, to.x, to.y);
    this.safeFoot = { x: to.x, y: to.y };
    app.state.x = to.x;
    app.state.y = to.y;
    cam.setRotation(0);
    cam.useBounds = true;
    cam.setZoom(1.2).startFollow(this.cameraAnchor, true, 0.08, 0.08);
    this.renderHeight();
    this.syncBiome(true);
    this.makeEscort();
    app.mode = "play";
    app.resetInput(true);
    app.refreshHud();
    app.save(false);
  }
  burst(x, y, color) {
    for (let i = 0; i < 12; i++) {
      const o = this.add.rectangle(x, y, 2, 2, color).setDepth(6003);
      gsap.to(o, {
        x: x + (Math.random() - 0.5) * 100,
        y: y - 20 - Math.random() * 60,
        alpha: 0,
        duration: 0.8 + Math.random() * 0.4,
        onComplete: () => o.destroy(),
      });
    }
  }
  update(time, delta) {
    if (!this.player) return;
    this.cineLayers?.update(time);
    delta = Math.min(delta, 50);
    const dt = delta / 1000;
    this.animTime = time;
    const s = this.app.state;
    if (this.app.mode !== "play" || this.cinematic || this.humanView) {
      this.player.setVelocity(0, 0);
      if (this.cinematic || this.humanView) {
        this.animateLife(time, dt, true);
        if (this.lifeActor?.active && this.lifeActor.species)
          this.lifeActor.setTexture(
            this.lifeActor.species + (Math.floor(time / 140) % 4),
          );
        if (!this.roomObjects.length) this.updateEffects(time, dt);
      }
      return;
    }
    if (this.pendingCine && !this.app.modalOpen) {
      const id = this.pendingCine;
      this.pendingCine = null;
      if (!this.app.state.seen.includes(id)) {
        this.app.playCinematic(id);
        return;
      }
    }
    const k = this.keys,
      j = this.app.joy;
    let x =
        (k.D.isDown || k.RIGHT.isDown ? 1 : 0) -
        (k.A.isDown || k.LEFT.isDown ? 1 : 0) +
        (j?.x || 0),
      y =
        (k.S.isDown || k.DOWN.isDown ? 1 : 0) -
        (k.W.isDown || k.UP.isDown ? 1 : 0) +
        (j?.y || 0);
    const len = Math.hypot(x, y);
    if (len > 1) {
      x /= len;
      y /= len;
    }
    let speed = this.observing ? 90 : k.SHIFT.isDown ? 250 : 185;
    if (this.jumping && s.abilities.includes("glider")) speed = 270;
    // Dew freshness: a short burst of speed with a glittering trail.
    if (this.boostUntil > time) {
      speed *= 1.35;
      if (len > 0.05 && time - (this.lastSpark || 0) > 110 && !s.settings.low) {
        this.lastSpark = time;
        const p = this.add.rectangle(this.player.x + (Math.random() - 0.5) * 12, this.player.y - 6 - this.traverse.z - Math.random() * 30, 2, 2, 0xdffcff).setDepth(this.player.depth + 1);
        gsap.to(p, { y: p.y - 14, alpha: 0, duration: 0.7, onComplete: () => p.destroy() });
      }
    }
    const height = this.traverse.tick({
      x: this.player.x,
      y: this.player.y,
      vertical: y,
      dt,
      glider: s.abilities.includes("glider"),
    });
    if (
      Math.abs(height.x - this.player.x) > 0.01 ||
      Math.abs(height.y - this.player.y) > 0.01
    )
      this.player.body.reset(height.x, height.y);
    this.jumping = this.traverse.airborne ? 1 : 0;
    this.player.setVelocity(
      this.traverse.climb || height.edge ? 0 : x * speed,
      this.traverse.climb || height.edge ? 0 : y * speed,
    );
    if (this.traverse.climb) {
      this.player.setTexture(
        "hero-climb" + (Math.abs(y) > 0.05 ? Math.floor(time / 130) % 4 : 0),
      );
    } else if (this.traverse.gliding) {
      this.player.setTexture("hero-glide" + (Math.floor(time / 170) % 4));
    } else if (len > 0.05) {
      this.dir = Math.abs(x) > Math.abs(y) ? (x > 0 ? 1 : 2) : y > 0 ? 0 : 3;
      this.player.setTexture(`hero${this.dir}-${Math.floor(time / 100) % 8}`);
      // Footfall dust: denser when running, never while airborne.
      const step = speed > 200 ? 150 : 260;
      if (!this.traverse.airborne && this.traverse.z < 2 && time - (this.lastStep || 0) > step) {
        this.lastStep = time;
        this.dust(this.player.x, this.player.y, speed > 200 ? 3 : 1, BIOMES[this.lastBiome]?.id === 3 ? 0xb9d6c9 : 0xc9bc92);
      }
    } else
      this.player.setTexture(
        `hero-idle${this.dir}-${Math.floor(time / 700) % 4}`,
      );
    this.renderHeight();
    // Landing reads as weight: a squash and a ring of dust.
    if (this.wasAirborne && !this.traverse.airborne && !this.traverse.climb) {
      this.dust(this.player.x, this.player.y, 7);
      this.squash(this.player, 1.78, 1.42, 1.6, 220);
    }
    this.wasAirborne = this.traverse.airborne;
    s.traversal = this.traverse.snapshot(s.traversal);
    if (height.edge && (!this.edgeHint || time - this.edgeHint > 4500)) {
      this.edgeHint = time;
      this.app.toast(this.app.l(TRAIL_UI.edge));
    }
    const wz = this.waterZone;
    if (wz) {
      const dx = (this.player.x - wz.x) / wz.rx,
        dy = (this.player.y - wz.y) / wz.ry,
        inWater = dx * dx + dy * dy < 0.92,
        bridge = Math.abs(this.player.x - (3200 + 766)) < 32;
      if (inWater && !bridge && !this.jumping && this.traverse.z < 12) {
        this.player.body.reset(
          this.safeFoot?.x || 3966,
          this.safeFoot?.y || 1500,
        );
        this.player.setVelocity(0, 0);
        if (!this.waterWarning || time - this.waterWarning > 3000) {
          this.app.toast(
            L(
              T(
                "Глубокая вода. Найдите мост или перепланируйте через узкий участок.",
                "Су терең. Көпір табыңыз не тар жерден қалықтап өтіңіз.",
                "Deep water. Find the bridge or glide across a narrow section.",
              ),
              this.app.lang,
            ),
          );
          this.waterWarning = time;
        }
      }
      if (!inWater || bridge)
        this.safeFoot = { x: this.player.x, y: this.player.y };
    }
    s.x = this.player.x;
    s.y = this.player.y;
    s.time = (s.time + dt / 90) % 24;
    s.played += dt;
    this.syncBiome();
    this.animateLife(time, dt);
    this.updateNear();
    this.updateEffects(time, dt);
    if (Math.floor(time / 500) !== this.hudTick) {
      this.hudTick = Math.floor(time / 500);
      this.app.updateLiveHud();
      if (this.hudTick % 4 === 0)
        this.app.audio.enter(this.lastBiome, this.isNight(), s.eco);
    }
    for (let i = 0; i < this.escort.length; i++) {
      const o = this.escort[i],
        target = i ? this.escort[i - 1] : this.player;
      const d = dist(o, target);
      if (d > 36) {
        const v = Math.min(d - 30, 115) * dt;
        o.x += ((target.x - o.x) / d) * v;
        o.y += ((target.y - o.y) / d) * v;
        o.setTexture(o.species + (Math.floor(time / 170) % 4));
      }
      o.setDepth(o.y);
    }
    const view = VIEWS.find(
      (v) => v.biome === this.lastBiome && !s.seen.includes("view-" + v.id),
    );
    if (
      view &&
      Math.hypot(this.player.x - view.at[0], this.player.y - view.at[1]) <
        230 &&
      !this.app.modalOpen
    ) {
      s.seen.push("view-" + view.id);
      this.app.save(false);
      this.perspective(view);
    }
  }
  animateLife(time, dt, cine = false) {
    const s = this.app.state,
      b = BIOMES[this.cineBiome ?? this.lastBiome] || BIOMES[0],
      night = this.isNight(),
      focus = cine ? {x:this.cameras.main.scrollX+this.cameras.main.width/2,y:this.cameras.main.scrollY+this.cameras.main.height/2} : this.player;
    let active = 0;
    for (const o of this.props) {
      if (!o.active || o.vanishing) continue;
      const d = Math.abs(o.x - focus.x) + Math.abs(o.y - focus.y);
      const visible =
        this.humanView ||
        this.cameras.main.worldView.contains(o.x, o.y - 70) ||
        d < 800;
      o.setVisible(visible);
      if (o.glow) o.glow.setVisible(visible);
      if (!visible) continue;
      if (
        ["grass", "fern", "flower", "pinkflower", "reed", "blueflower", "moss-fan", "seedpod"].includes(o.kind) &&
        !s.settings.low
      ) {
        // Plants part around the hero and spring back, with a rustle when brushed.
        if (!cine && this.traverse.z < 20) {
          const dx = o.x - this.player.x,
            near = Math.abs(dx) < o.displayWidth * 0.32 && Math.abs(o.y - this.player.y) < 26;
          if (near) {
            const push = Math.sign(dx || 1) * 16 * (1 - Math.abs(dx) / (o.displayWidth * 0.32 + 1));
            if (Math.abs(push - o.bend) > 6 && time - (this.lastRustle || 0) > 380 && this.player.body.speed > 40) {
              this.lastRustle = time;
              this.app.audio.play("rustle", 0.8 + Math.random() * 0.5);
            }
            o.bend += (push - o.bend) * Math.min(1, dt * 14);
          }
        }
        o.bend *= Math.pow(0.04, dt);
        o.angle = o.baseAngle + windAt(o.x, o.y, time) * 2.8 + o.bend;
      }
      const heroY = this.player.y - this.traverse.z;
      const hidesHero = o.y > this.player.y &&
        Math.abs(o.x - this.player.x) < o.displayWidth * 0.25 &&
        o.y - heroY < o.displayHeight * 0.6;
      const targetAlpha = hidesHero ? 0.4 : 1;
      o.setAlpha(o.alpha + (targetAlpha - o.alpha) * (1 - Math.exp(-dt * 15)));
    }
    for (const o of this.npcs) {
      if (!o.active) continue;
      let d = dist(o, focus);
      const visible = this.humanView || d < 900;
      o.setVisible(visible);
      o.shadow.setVisible(visible);
      if (!visible || d > 700 || active++ > (s.settings.low ? 28 : 50))
        continue;
      o.timer -= dt * 1000;
      if (o.timer < 0) {
        o.phase++;
        o.timer = 1100 + (o.seed % 4) * 500;
        o.state = npcBehavior({
          species: o.species,
          night,
          humidity: b.humidity,
          temp: b.temp,
          pollution: 100 - s.eco.safety,
          food: s.eco.flowers > 40,
          distance: d,
          observing: this.observing,
          phase: o.phase,
        });
        const a = o.seed + o.phase * 1.7;
        let rad = o.species === "ant" ? 100 : 90;
        o.target = {
          x: o.home.x + Math.cos(a) * rad,
          y: o.home.y + Math.sin(a) * rad,
        };
        if (o.species === "ant") {
          o.target = {
            x: o.home.x + (o.phase % 2 ? 95 : -95),
            y: o.home.y + (o.seed % 3) * 10,
          };
        }
        if (
          ["bee", "bumblebee", "butterfly"].includes(o.species) &&
          s.eco.flowers > 35 &&
          o.state === "feed"
        ) {
          const f = [...this.props, ...this.changeSprites]
            .filter((p) => p.active && p.food && dist(p, o) < 500)
            .sort((a, b) => dist(a, o) - dist(b, o))[0];
          if (f) {
            o.target = { x: f.x, y: f.y - f.displayHeight * 0.6 };
            o.timer = 8000;
          }
        }
        if (o.state === "hunt") {
          const prey = this.npcs.find(
            (n) =>
              n !== o &&
              ["aphid", "mosquito"].includes(n.species) &&
              dist(n, o) < 200,
          );
          if (prey) o.target = { x: prey.x, y: prey.y };
        }
      }
      let vx = o.target.x - o.x,
        vy = o.target.y - o.y,
        dd = Math.hypot(vx, vy);
      let sp = flying.includes(o.species) ? 45 : 20;
      if (o.state === "rest" || o.state === "shelter") sp = 0;
      if (o.state === "defend") {
        vx = o.x - this.player.x;
        vy = o.y - this.player.y;
        dd = Math.hypot(vx, vy);
        sp = 85;
      }
      if (dd > 4 && sp) {
        o.x += (vx / dd) * sp * dt;
        o.y += (vy / dd) * sp * dt;
        o.rotation = Math.atan2(vy, vx) + Math.PI / 2;
      }
      if (o.state === "feed" && dd < 14 && flying.includes(o.species)) {
        if (time - this.lastPollination > 1800) {
          this.pollination++;
          this.lastPollination = time;
          this.burst(o.x, o.y, 0xdfcc75);
          if (
            activeStage(s)?.action === "pollinate" &&
            this.observing &&
            dist(o, this.player) < 350
          )
            this.app.toast(this.app.t("pollinated"));
        }
      }
      o.setTexture(
        o.species +
          (sp
            ? Math.floor(time / (flying.includes(o.species) ? 85 : 180)) % 4
            : 0),
      );
      o.shadow
        .setPosition(o.x, o.y + 12)
        .setScale(flying.includes(o.species) ? 0.34 : 0.45);
      o.setDepth(o.y + (flying.includes(o.species) ? 35 : 0));
      if (o.species === "firefly")
        o.setAlpha(
          night
            ? s.eco.darkness > 40
              ? 0.65 + 0.35 * Math.sin(time / 600 + o.seed)
              : 0.3
            : 0.35,
        );
      if (!cine && this.observing && d < 180) this.discover(o.species);
      if (o.species === "ant") {
        if (!o.carry && o.phase % 3 === 0) {
          o.carry = this.add
            .rectangle(o.x, o.y, 5, 4, 0xc5ad77)
            .setDepth(o.y + 1);
          this.chunks.get(o.biome)?.objects.push(o.carry);
        }
        if (o.carry) {
          o.carry
            .setVisible(visible && o.phase % 3 === 0)
            .setPosition(o.x, o.y - 7)
            .setDepth(o.y + 1);
        }
      }
    }
  }
  discover(id) {
    const s = this.app.state;
    if (s.discovered.includes(id)) return;
    s.discovered.push(id);
    this.app.audio.play("discovery");
    this.app.discoveryToast(id);
    this.app.save(false);
  }
  updateNear() {
    const candidates = [
      ...this.markers.map((o) => ({ ...o, d: dist(o, this.player) })),
      ...this.npcs
        .filter((o) => o.visible)
        .map((o) => ({
          kind: "npc",
          data: o,
          x: o.x,
          y: o.y,
          d: dist(o, this.player),
        })),
      ...this.props
        .filter((o) => o.active && o.visible && !o.spent && PROP_ACTIONS[o.kind] && this.animTime >= (o.readyAt || 0))
        .map((o) => ({
          kind: "prop",
          data: o,
          x: o.x,
          y: o.y,
          reach: PROP_ACTIONS[o.kind].radius * Math.min(1.6, Math.max(0.8, o.baseScale || 1)),
          stage: { title: PROP_ACTIONS[o.kind].label },
          d: dist(o, this.player),
        })),
    ].filter(
      (o) =>
        Math.abs((o.z || 0) - this.traverse.z) < 42 &&
        o.d <
          (o.routeAction
            ? 65
            : o.kind === "quest"
              ? 115
              : o.kind === "npc"
                ? 95
                : o.kind === "prop"
                  ? o.reach
                  : 80),
    );
    const bias = (o) => (o.kind === "quest" ? -25 : o.kind === "prop" ? -8 : 0);
    candidates.sort((a, b) => bias(a) + a.d - (bias(b) + b.d));
    this.near = candidates[0] || null;
    if (this.near?.kind === "npc") this.discover(this.near.data.species);
    this.app.updatePrompt(this.near);
  }
  updateEffects(time, dt) {
    const s = this.app.state,
      b = BIOMES[this.cineBiome ?? this.lastBiome],
      cam = this.cameras.main;
    this.questRing.clear();
    this.worldFx.clear();
    for (const leaf of this.canopyLeaves) {
      if (!s.settings.low && !leaf.dew)
        leaf.sprite.angle = Math.sin(time / 2100 + leaf.seed) * 1.1;
    }
    for (const m of this.markers) {
      if (m.station !== undefined) {
        if (!s.settings.low) m.sprite.angle = Math.sin(time / 1300 + m.sprite.stationSeed) * 2.2 + windAt(m.x, m.y, time) * 1.6;
        if (!this.travelling) {
          const awake = s.travel.stations.includes(m.station);
          this.questRing.lineStyle(1, awake ? 0xf4f1dc : 0xe9c75a, 0.35 + 0.2 * Math.sin(time / 500 + m.station));
          this.questRing.strokeEllipse(m.x, m.y + 4, 46 + Math.sin(time / 600) * 3, 15);
        }
      } else if (m.routeAction) {
        this.questRing.lineStyle(1, 0xa5d6bc, 0.65);
        this.questRing.strokeEllipse(m.x, m.y - m.z + 5, 34, 12);
      }
    }
    const status = document.getElementById("status");
    if (this.traverse.climb) {
      this.app.setStatus(this.app.l(TRAIL_UI.controls));
      this.canopyStatus = true;
    } else if (this.traverse.z > 60) {
      this.app.setStatus(this.app.l(TRAIL_UI.canopy));
      this.canopyStatus = true;
    } else if (this.canopyStatus) {
      this.canopyStatus = false;
      if (status) {
        status.hidden = !this.observing && !this.scanning;
        status.textContent = this.observing
          ? this.app.t("observeOn")
          : this.scanning
            ? this.app.t("scanOn")
            : "";
      }
    }
    const st = activeStage(s);
    let targets =
      s.quest === 1
        ? [[COLONY_ENTRANCE.x, COLONY_ENTRANCE.y]]
        : st?.points.filter((p, i) => !s.progress.includes(i)) || [];
    const target = targets.sort(
      (a, b) =>
        Math.hypot(a[0] - this.player.x, a[1] - this.player.y) -
        Math.hypot(b[0] - this.player.x, b[1] - this.player.y),
    )[0];
    if (target && !this.travelling) {
      const d = Math.hypot(
          target[0] - this.player.x,
          target[1] - this.player.y,
        ),
        v = Math.min(105, d);
      this.guide
        .setPosition(
          this.player.x + ((target[0] - this.player.x) / Math.max(d, 1)) * v,
          this.player.y +
            ((target[1] - this.player.y) / Math.max(d, 1)) * v -
            15 +
            Math.sin(time / 400) * 6,
        )
        .setAlpha(0.65 + 0.2 * Math.sin(time / 400));
      for (const p of targets) {
        if (Math.hypot(p[0] - this.player.x, p[1] - this.player.y) > 900)
          continue;
        this.questRing.lineStyle(1, 0xe4ca82, 0.7);
        this.questRing.strokeEllipse(
          p[0],
          p[1] + 6,
          43 + Math.sin(time / 400) * 5,
          16,
        );
        this.questRing.fillStyle(0xf6df9c, 0.85);
        this.questRing.fillRect(
          p[0] - 1,
          p[1] - 50 + Math.sin(time / 400) * 5,
          3,
          8,
        );
      }
    } else this.guide.setAlpha(0);
    if (this.observing) {
      this.worldFx.lineStyle(1, 0xbcdcbc, 0.25);
      this.worldFx.strokeCircle(
        this.player.x,
        this.player.y - this.traverse.z - 8,
        155,
      );
    }
    if (this.scanning) {
      this.worldFx.lineStyle(1, 0x9cd7c3, 0.6);
      this.worldFx.strokeCircle(
        this.player.x,
        this.player.y,
        80 + ((time / 20) % 120),
      );
      for (const o of this.markers.filter((o) => o.kind === "quest")) {
        this.worldFx.fillStyle(0xb4e2c7, 0.1);
        this.worldFx.fillCircle(o.x, o.y, 40);
      }
    }
    this.overlay.clear();
    // Screen-space layers ignore camera zoom so they always cover the view (flight zooms far out).
    const iz = 1 / cam.zoom;
    for (const layer of [this.overlay, this.weather])
      layer.setScale(iz).setPosition(480 - 480 * iz, 270 - 270 * iz);
    const night = this.isNight();
    let darkness = night
      ? 0.38
      : b.id === 1
        ? 0.19
        : b.id === 4
          ? 0.2
          : Math.max(0, Math.cos(((s.time - 1) * Math.PI) / 12)) * 0.28;
    // Light drifts towards the region's mood instead of snapping at the border.
    const k = 1 - Math.exp(-dt * 1.2),
      L = this.light;
    L.dark += (darkness - L.dark) * k;
    L.night += ((night ? 1 : 0) - L.night) * k;
    const lerp = (a, c, t) => Math.round(a + (c - a) * t),
      tone = (lerp(0x17, 0x07, L.night) << 16) | (lerp(0x3e, 0x1a, L.night) << 8) | lerp(0x40, 0x32, L.night);
    this.overlay.fillStyle(tone, L.dark);
    this.overlay.fillRect(-60, -60, 1080, 660);
    this.grade.set(b.id);
    this.grade.update(dt, L.night);
    const rays = Math.max(0, 1 - L.night * 1.6) * (b.id === 1 ? 0.3 : 1);
    if (!s.settings.low && rays > 0.02) {
      for (let i = 0; i < 4; i++) {
        this.overlay.fillStyle(0xffedaa, 0.027 * rays);
        const x = 70 + i * 270 + Math.sin(time / 10000) * 35;
        this.overlay.fillTriangle(x, -10, x + 90, -10, x - 90, 550);
      }
    }
    this.weather.clear();
    if (!s.settings.low) {
      // Out-of-focus foreground bokeh: pollen or fireflies passing near the lens.
      for (let i = 0; i < 7; i++) {
        const r = 14 + ((i * 37) % 30),
          x = (i * 151 + time * (0.004 + i * 0.0012)) % 1080 - 60,
          y = (i * 89 + Math.sin(time / 3100 + i * 2) * 40 + 600) % 600 - 30;
        const a = (night ? 0.05 : 0.035) * (0.6 + 0.4 * Math.sin(time / 900 + i));
        this.weather.fillStyle(night ? 0xd8f0a0 : 0xfff1c4, a * 0.6);
        this.weather.fillCircle(x, y, r);
        this.weather.fillStyle(night ? 0xe8ffb0 : 0xfff6d8, a);
        this.weather.fillCircle(x, y, r * 0.62);
      }
      for (let i = 0; i < 32; i++) {
        const x = (i * 89 + time * (night ? 0.003 : 0.008)) % 980,
          y = (i * 73 + Math.sin(time / 2000 + i) * 20) % 540;
        this.weather.fillStyle(
          night ? 0xdfe892 : 0xf3e9b2,
          night ? 0.15 + 0.18 * Math.sin(time / 500 + i) : 0.35,
        );
        this.weather.fillRect(x, y, i % 3 === 0 ? 2 : 1, 1);
      }
      if (s.time > 14 && s.time < 14.8) {
        this.weather.lineStyle(1, 0xb3d9d8, 0.4);
        for (let i = 0; i < 70; i++) {
          const x = (i * 71 - time * 0.12) % 1000,
            y = (i * 47 + time * 0.25) % 560;
          this.weather.lineBetween(x, y, x - 3, y + 14);
        }
      }
    }
    this.lightGlow
      .setPosition(this.player.x, this.player.y - 20)
      .setAlpha(night ? 0.26 : 0.1);
    if (
      this.observing &&
      this.props.some((o) => o.kind === "leaf" && dist(o, this.player) < 65)
    )
      this.app.setStatus(this.app.t("shelter"));
  }
  clearCinematic() {
    this.cineLayers?.destroy();
    this.cineLayers=null;
    this.cineBiome=null;
    this.cineCleanup?.();
    this.cineCleanup = null;
    gsap.killTweensOf(this.cameras.main);
    this.cameras.main.setRotation(0);
    for (const o of this.roomObjects) {
      gsap.killTweensOf(o);
      o.destroy();
    }
    this.roomObjects = [];
    this.lifeActor = null;
    this.cinematic = false;
    this.player?.setVisible(true);
  }
  showRoom(final = false, atWindow = false) {
    const cam = this.cameras.main;
    cam.stopFollow().setZoom(1).setScroll(0, 0);
    this.player.setVisible(false);
    this.cineLayers = new ParallaxStage(this,{theme:'room',morning:final});
    const frames=atWindow?Array.from({length:8},(_,i)=>'hero1-'+i):Array.from({length:4},(_,i)=>(final?'hero-wake':'hero-sleep')+i);
    if(atWindow)this.cineLayers.actor(frames[0],{
      x:.43,y:.57,w:.13,h:.37,rate:.12,depth:8001.8,frames,to:{x:.74,y:.44},travel:5000,
    });
    else this.cineLayers.actor(frames[0],{
      x:final?.40:.28,y:final?.61:.51,w:final?.18:.36,h:final?.40:.25,
      rate:.48,frames,once:final,
    });
    if (final) {
      this.cineLayers.actor('leaf',{x:.90,y:.77,w:.035,h:.035,rate:.25,depth:8002.5});
      this.cineLayers.actor('ladybird0',{x:.83,y:.33,w:.045,h:.055,rate:.06,depth:8001,frames:Array.from({length:4},(_,i)=>'ladybird'+i)});
    }
  }
  cinematicShot(id, idx = 0) {
    this.clearCinematic();
    this.cinematic = true;
    this.player.setVelocity(0);
    const cam = this.cameras.main;
    cam.stopFollow();
    // Every memory shot keeps a slow roll so even a held frame breathes.
    if (!this.app.state.settings.low) {
      const roll = idx % 2 ? 1 : -1;
      cam.setRotation(roll * 0.012);
      gsap.to(cam, { rotation: -roll * 0.009, duration: 8.5, ease: "sine.inOut" });
    }
    const roomShot=id==='prologue'&&idx===1||id==='ending'&&idx>=2;
    if(!roomShot)this.cineLayers=new ParallaxStage(this,{theme:id==='night'?'night':['catastrophe','migration'].includes(id)?'damaged':id==='citadel'?'roots':'meadow'});
    if (id === "metamorphosis") {
      this.cineBiome=2;
      this.spawnBiome(BIOMES[2]);
      this.player.setVisible(false);
      this.overlay.clear();
      this.weather.clear();
      this.guide.setAlpha(0);
      const p = byTrail("flower-canopy").platforms.at(-1),
        y = p.y - p.z;
      cam.setZoom(1.7).centerOn(p.x, y - 25);
      gsap.to(cam, { zoom: 2.1, duration: 7, ease: "sine.inOut" });
      const leaf = this.add
        .image(p.x, y + 12, "canopy-leaf")
        .setScale(1.6)
        .setDepth(8000);
      const key = ["egg", "caterpillar0", "pupa", "butterfly0"][idx];
      const actor = this.add
        .image(p.x - 20, y - 18, key)
        .setScale(idx === 2 ? 1.2 : 1.1)
        .setDepth(8001);
      this.roomObjects.push(leaf, actor);
      this.lifeActor = actor;
      if (idx === 0)
        gsap.to(actor, { alpha: 0.65, duration: 1.8, repeat: -1, yoyo: true });
      if (idx === 1) {
        actor.species = "caterpillar";
        actor.setRotation(Math.PI / 2);
        gsap.to(actor, { x: p.x + 50, duration: 7 });
      }
      if (idx === 2)
        gsap.to(actor, {
          angle: 4,
          duration: 1.4,
          repeat: -1,
          yoyo: true,
          ease: "sine.inOut",
        });
      if (idx === 3) {
        actor.species = "butterfly";
        gsap.to(actor, {
          x: p.x + 95,
          y: y - 130,
          duration: 7,
          ease: "sine.inOut",
        });
      }
      return;
    }
    if (id === "prologue" && idx === 0) {
      this.spawnBiome(BIOMES[0]);
      this.cineBiome=0;
      cam.setZoom(1.8).centerOn(610, 585);
      const ant = this.npcs.find((n) => n.species === "ant" && n.biome===0);
      if (ant) {
        ant.setPosition(620, 585);
        ant.home = { x: 620, y: 585 };
      }
      gsap.to(cam, { zoom: 3.4, duration: 5, ease: "power2.inOut" });
      return;
    }
    if (id === "prologue" && idx === 1) {
      this.showRoom(false);
      return;
    }
    if (id === "ending" && idx >= 2) {
      this.showRoom(true,idx===3);
      return;
    }
    const locations = {
      prologue: [540, 620],
      awakening: [650, 570],
      citadel: [2350, 550],
      valley: [3880, 520],
      catastrophe: [850, 1620],
      night: [2450, 2850],
      migration: [1500, 2890],
      restoration: [4100, 2810],
      ending: [4460, 3030],
    };
    const p = locations[id] || [this.player.x, this.player.y];
    const biome=biomeAt(...p);
    this.cineBiome=biome.id;
    this.spawnBiome(biome);
    this.player.setVisible(
      id === "awakening" || id === "ending" || id === "prologue",
    );
    cam.centerOn(...p).setZoom(id === "awakening" ? 1.9 : 1.15);
    gsap.to(cam, {
      zoom: id === "awakening" ? 1.15 : id === "ending" ? 0.65 : 1.45,
      scrollX: cam.scrollX + 100,
      scrollY: cam.scrollY - 70,
      duration: 6,
      ease: "sine.inOut",
    });
    if (id === "migration") {
      this.makeEscort();
      this.escort.forEach((o, i) => {
        o.setPosition(p[0] - 160 - i * 25, p[1] + 30);
        gsap.to(o, { x: p[0] + 130 + i * 10, duration: 5 + i * 0.2 });
      });
    }
    if (id === "restoration")
      for (let i = 0; i < 12; i++)
        this.burst(
          p[0] + (Math.random() - 0.5) * 500,
          p[1] + (Math.random() - 0.5) * 250,
          0xf3da90,
        );
  }
  endCinematic() {
    this.clearCinematic();
    const cam = this.cameras.main;
    cam.setZoom(1.2).startFollow(this.cameraAnchor, true, 0.07, 0.07);
    this.syncBiome(true);
    this.makeEscort();
  }
  perspective(view = null) {
    if (this.cinematic || this.humanView || this.app.mode !== "play") return;
    view = view || VIEWS.find((v) => v.biome === this.lastBiome) || VIEWS[0];
    this.humanView = true;
    this.player.setVelocity(0);
    for (const b of BIOMES) this.spawnBiome(b);
    this.humanContext = this.add.graphics().setDepth(-101);
    this.humanContext.fillStyle(0x8f927f, 1);
    this.humanContext.fillRect(-4500, -4500, 14000, 12000);
    this.humanContext.lineStyle(5, 0x677569, 1);
    for (let i = -4500; i < 9500; i += 650) {
      this.humanContext.lineBetween(i, -4500, i, 7500);
      this.humanContext.lineBetween(-4500, i, 9500, i);
    }
    this.humanContext.fillStyle(0x374941, 1);
    this.humanContext.fillRoundedRect(
      view.at[0] - 1400,
      view.at[1] + 160,
      770,
      330,
      130,
    );
    this.humanContext.fillStyle(0xa2a28a, 1);
    this.humanContext.fillRoundedRect(
      view.at[0] - 1370,
      view.at[1] + 165,
      700,
      290,
      120,
    );
    const cam = this.cameras.main;
    const save = { x: cam.scrollX, y: cam.scrollY, zoom: cam.zoom };
    cam.stopFollow();
    cam.useBounds = false;
    this.app.showPerspective(view, false);
    const near = [view.at[0], view.at[1]];
    cam.centerOn(...near);
    gsap.to(cam, {
      zoom: 1.75,
      duration: 1.2,
      ease: "power2.inOut",
      onComplete: () => {
        this.app.perspectiveTimer = setTimeout(() => {
          this.app.showPerspective(view, true);
          this.app.audio.perspective(true); // preserve the same world-coordinate focus through the zoom
          const obj = { zoom: 1.75 };
          this.viewTween = gsap.to(obj, {
            zoom: 0.19,
            duration: 3.8,
            ease: "power2.inOut",
            onUpdate: () => {
              cam.setZoom(obj.zoom);
              cam.centerOn(...near);
            },
          });
        }, 1800);
      },
    });
    this.returningView = false;
    this.restorePerspective = () => {
      if (this.returningView) return;
      this.returningView = true;
      clearTimeout(this.app.perspectiveTimer);
      this.viewTween?.kill();
      gsap.killTweensOf(cam);
      this.app.audio.perspective(false);
      const obj = { zoom: cam.zoom };
      gsap.to(obj, {
        zoom: save.zoom,
        duration: 1.2,
        ease: "power2.inOut",
        onUpdate: () => {
          cam.setZoom(obj.zoom);
          cam.centerOn(this.cameraAnchor.x, this.cameraAnchor.y);
        },
        onComplete: () => {
          this.humanContext?.destroy();
          cam.useBounds = true;
          cam.startFollow(this.cameraAnchor, true, 0.07, 0.07);
          this.humanView = false;
          this.syncBiome(true);
          this.app.hidePerspective();
        },
      });
    };
  }
}
