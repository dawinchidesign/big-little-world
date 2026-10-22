import Phaser from "phaser";
import { gsap } from "gsap";
import { canvas, rng } from "./art.js";
import { installVisuals, visualEntry, materialCanvas } from "./visuals.js";
import { ParallaxStage } from "./parallax.js";
import { ShotDirector } from "./direction.js";
import { T } from "./content.js";
import { QUESTS } from "./quests.js";
import { activeStage } from "./model.js";
import {
  TILE,
  COLS,
  ROWS,
  COLONY_WIDTH,
  COLONY_HEIGHT,
  COLONY_SPAWN,
  COLONY_UI,
  CHAMBERS,
  COLONY_OBJECTIVES,
  NOTE_POINTS,
  GATE_POINT,
  GATE_CELLS,
  cellPoint,
  makeColonyGrid,
  bridgeIsOpen,
  colonyPath,
  nearestFloor,
  colonyFloorAt,
} from "./colony-data.js";

const distance = (a, b) => Math.hypot(a.x - b.x, a.y - b.y);
export class ColonyScene extends Phaser.Scene {
  constructor(app) {
    super("Colony");
    this.app = app;
    this.isCitadel = true;
    this.lastBiome = 1;
    this.observing = false;
    this.scanning = false;
    this.cinematic = false;
    this.humanView = false;
    this.npcs = [];
    this.markers = [];
    this.roomLabels = [];
    this.escort = [];
    this.director = new ShotDirector(this);
  }
  create() {
    installVisuals(this);
    this.app.scene = this;
    this.state = this.app.state.colony;
    this.npcs = [];
    this.markers = [];
    this.roomLabels = [];
    this.observing = false;
    this.scanning = false;
    this.cinematic = false;
    this.observationTime = 0;
    this.observationPending = false;
    this.open = bridgeIsOpen(this.app.state);
    this.grid = makeColonyGrid(this.open);
    this.buildTextures();
    this.buildNest();
    this.physics.world.setBounds(0, 0, COLONY_WIDTH, COLONY_HEIGHT);
    const spawn = nearestFloor(this.grid, this.state.x, this.state.y);
    this.player = this.physics.add
      .sprite(spawn.x, spawn.y, "hero0-0")
      .setScale(1.75)
      .setOrigin(0.5, 1)
      .setCollideWorldBounds(true)
      .setDepth(spawn.y + 10);
    this.player.body.setSize(10, 7).setOffset(7, 26);
    this.shadow = this.add
      .image(spawn.x, spawn.y + 3, "shadow")
      .setScale(0.55)
      .setAlpha(0.38)
      .setDepth(2);
    this.physics.add.collider(this.player, this.walls);
    this.physics.add.collider(this.player, this.gateWalls, () => {
      if (this.time.now > (this.gateWarning || 0)) {
        this.gateWarning = this.time.now + 5000;
        this.app.toast(this.app.l(COLONY_UI.blocked));
      }
    });
    this.createLife();
    this.guide = this.add
      .image(spawn.x, spawn.y, "light")
      .setScale(0.13)
      .setTint(0xffd491)
      .setDepth(4000)
      .setBlendMode(Phaser.BlendModes.ADD);
    this.rings = this.add.graphics().setDepth(4001);
    this.overlay = this.add.graphics().setScrollFactor(0).setDepth(4100);
    this.dust = this.add.graphics().setScrollFactor(0).setDepth(4101);
    this.cameras.main
      .setBounds(0, 0, COLONY_WIDTH, COLONY_HEIGHT)
      .setZoom(1.05)
      .startFollow(this.player, true, 0.08, 0.08);
    this.keys = this.input.keyboard.addKeys(
      "W,A,S,D,UP,DOWN,LEFT,RIGHT,E,Q,C,M,J,V,SPACE,SHIFT,ESC,F",
    );
    const actions = {
      E: () => this.interact(),
      Q: () => this.toggleObserve(),
      C: () => this.toggleScan(),
      M: () => this.app.openMap(),
      J: () => this.app.openJournal(),
      V: () => this.perspective(),
      SPACE: () => this.jump(),
      ESC: () => this.app.escape(),
      F: () => this.app.fullscreen(),
    };
    for (const [key, action] of Object.entries(actions))
      this.keys[key].on("down", (_key, event) => {
        if (this.app.scene !== this) return;
        event?.stopPropagation?.();
        if (this.app.mode === "play" || key === "ESC") action();
      });
    this.events.off("wake");
    this.events.on("wake", () => {
      this.app.scene = this;
      this.state = this.app.state.colony;
      this.observing = false;
      this.scanning = false;
      this.observationTime = 0;
      this.observationPending = false;
      this.clearCinematic();
      this.applyChanges();
      this.reset();
      this.refreshMarkers();
      this.app.refreshHud();
      this.app.audio.enter(1, false, this.app.state.eco);
    });
    this.time.addEvent({
      delay: 30000,
      loop: true,
      callback: () => {
        if (this.app.mode === "play") this.app.save(false);
      },
    });
    this.refreshMarkers();
    this.app.refreshHud();
    this.app.audio.enter(1, false, this.app.state.eco);
    this.events.once("postupdate", () => {
      // A journal replay may start this scene underneath its own cinematic.
      if (this.app.cineData || this.app.mode === "cinematic") return;
      if (!this.app.state.seen.includes("citadel"))
        this.app.playCinematic("citadel");
      else if (!this.app.state.seen.includes("colony-instructions"))
        this.showWelcome();
    });
  }
  buildTextures() {
    const put = (key, w, h, draw) => {
      if (visualEntry(key)) return;
      if (this.textures.exists(key)) return;
      const [c, g] = canvas(w, h);
      g.imageSmoothingEnabled = false;
      draw(g);
      this.textures.addCanvas(key, c);
    };
    put("colony-larva", 30, 16, (c) => {
      c.fillStyle = "#846844";
      c.fillRect(3, 6, 24, 9);
      c.fillStyle = "#e3d6a4";
      c.fillRect(3, 4, 24, 9);
      c.fillRect(6, 1, 18, 14);
      c.fillStyle = "#b6a67c";
      for (let x = 8; x < 25; x += 4) c.fillRect(x, 4, 1, 8);
      c.fillStyle = "#fff0be";
      c.fillRect(7, 2, 12, 2);
    });
    put("colony-pupa", 29, 14, (c) => {
      c.fillStyle = "#aa9562";
      c.fillRect(2, 3, 25, 9);
      c.fillStyle = "#d8c58b";
      c.fillRect(5, 1, 19, 11);
      c.fillStyle = "#e8d8a4";
      c.fillRect(6, 2, 14, 2);
      c.fillStyle = "#99845e";
      for (let i = 0; i < 5; i++) c.fillRect(6 + i * 4, 6, 1, 5);
    });
    put("colony-eggs", 34, 22, (c) => {
      for (let i = 0; i < 7; i++) {
        const x = 2 + ((i * 9) % 25),
          y = 3 + ((i * 5) % 13);
        c.fillStyle = "#a48e64";
        c.fillRect(x, y + 1, 6, 5);
        c.fillStyle = "#f1e4b7";
        c.fillRect(x + 1, y, 4, 5);
        c.fillStyle = "#fff6d6";
        c.fillRect(x + 1, y, 2, 2);
      }
    });
    put("colony-food", 36, 30, (c) => {
      const r = rng(63);
      for (let i = 0; i < 26; i++) {
        const x = 4 + r() * 27,
          y = 5 + r() * 21;
        c.fillStyle = ["#cb9d59", "#e1b86b", "#7c5030", "#b1844d"][i % 4];
        c.fillRect(Math.floor(x), Math.floor(y), 3 + (i % 3), 2 + (i % 2));
      }
    });
  }
  buildNest() {
    this.walls = this.physics.add.staticGroup();
    this.gateWalls = this.physics.add.staticGroup();
    const clay=materialCanvas(this,'material-clay'),humus=materialCanvas(this,'material-humus');
    // Forty-eight small terrain chunks, with pixel-sized curved excavation rims.
    // Only collision rows are merged; NPC navigation remains independent.
    for (let row = 0; row < COLONY_HEIGHT / 256; row++)
      for (let col = 0; col < COLONY_WIDTH / 256; col++) {
        const key = `colony-terrain-${col}-${row}`;
        if (!this.textures.exists(key)) {
          const [c, g] = canvas(256, 256),
            r = rng(613 + col * 93 + row * 17);
          g.imageSmoothingEnabled = false;
          // Rasterize each material once per chunk, then mask excavation cells.
          // Copying a source canvas for every 8px square causes expensive native
          // snapshots (and is unnecessary in both Canvas and WebGL browsers).
          g.fillStyle='#271f1f';g.fillRect(0,0,256,256);
          g.globalAlpha=.22;g.drawImage(humus,0,0);g.globalAlpha=1;
          const [floor,fg]=canvas(256,256);fg.drawImage(clay,0,0);
          for(let my=0;my<256;my+=8)for(let mx=0;mx<256;mx+=8)
            if(!colonyFloorAt(col*256+mx+4,row*256+my+4))fg.clearRect(mx,my,8,8);
          g.globalAlpha=.78;g.drawImage(floor,0,0);g.globalAlpha=1;
          for (let y = 0; y < 256; y += 8)
            for (let x = 0; x < 256; x += 8) {
              const wx = col * 256 + x + 4,
                wy = row * 256 + y + 4,
                open = colonyFloorAt(wx, wy),
                depth = wy / COLONY_HEIGHT;
              g.fillStyle = open
                ? depth > 0.62
                  ? "#795333"
                  : "#875632"
                : "#271f1f";
              g.globalAlpha=.15;
              g.fillRect(x, y, 8, 8);
              g.globalAlpha=1;
              if (open) {
                if (!colonyFloorAt(wx, wy - 10)) {
                  g.fillStyle = "#3e2a23";
                  g.fillRect(x, y, 8, 8);
                  g.fillStyle = "#58402b";
                  g.fillRect(x, y + 6, 8, 2);
                } else if (!colonyFloorAt(wx, wy + 10)) {
                  g.fillStyle = "#ba8750";
                  g.fillRect(x, y + 4, 8, 4);
                  g.fillStyle = "#dfb273";
                  g.fillRect(x, y + 6, 8, 2);
                } else if (
                  !colonyFloorAt(wx - 10, wy) ||
                  !colonyFloorAt(wx + 10, wy)
                ) {
                  g.fillStyle = "#553923";
                  g.fillRect(x, y, 8, 8);
                }
              }
              for (let i = 0; i < 1; i++) {
                g.fillStyle = open
                  ? ["#ad7840", "#9d6b3b", "#63432b"][i]
                  : ["#342720", "#402d24", "#221d20"][i];
                g.fillRect(
                  x + Math.floor(r() * 4) * 2,
                  y + Math.floor(r() * 4) * 2,
                  2,
                  2,
                );
              }
            }
          this.textures.addCanvas(key, c);
        }
        this.add
          .image(col * 256, row * 256, key)
          .setOrigin(0)
          .setDepth(-100);
      }
    for (let y = 0; y < COLONY_HEIGHT; y += 16) {
      let run = null;
      for (let x = 0; x <= COLONY_WIDTH; x += 16) {
        const wall = x < COLONY_WIDTH && !colonyFloorAt(x + 8, y + 8);
        if (wall && run === null) run = x;
        if (!wall && run !== null) {
          this.walls.add(this.add.zone((run + x) / 2, y + 8, x - run, 16));
          run = null;
        }
      }
    }
    const r = rng(834),
      roots = this.add.graphics().setDepth(3);
    for (const room of CHAMBERS) {
      const p = cellPoint(room.cx, room.cy),
        roof = p.y - room.ry * TILE + 12;
      roots.lineStyle(8, 0x3c2a24, 1);
      roots.lineBetween(p.x - 85, roof - 35, p.x - 60, roof + 20);
      roots.lineStyle(3, 0x90633a, 0.75);
      roots.lineBetween(p.x - 84, roof - 34, p.x - 60, roof + 18);
      roots.lineStyle(2, 0xb58b50, 0.65);
      roots.lineBetween(p.x - 62, roof + 8, p.x - 80, roof + 42);
      roots.lineBetween(p.x - 61, roof + 10, p.x - 45, roof + 45);
      const glow = this.add
        .image(p.x, p.y - 40, "light")
        .setScale(room.id === "entrance" ? 3 : 2.4)
        .setAlpha(room.id === "brood" ? 0.22 : 0.15)
        .setTint(0xffb35b)
        .setBlendMode(Phaser.BlendModes.ADD)
        .setDepth(2500);
      this.roomLabels.push({
        room,
        text: this.add
          .text(p.x, p.y - room.ry * TILE + 46, this.app.l(room.name), {
            fontFamily: "Story,serif",
            fontSize: "17px",
            color: "#edd0a0",
            stroke: "#34251f",
            strokeThickness: 3,
          })
          .setOrigin(0.5)
          .setAlpha(0.82)
          .setDepth(2400),
        glow,
      });
      for (let i = 0; i < 7; i++) {
        const x = p.x + (r() - 0.5) * room.rx * 70,
          y = p.y + (r() - 0.5) * room.ry * 60;
        if (room.id === "brood" || room.id === "shelter" || room.id === "queen")
          this.add
            .image(x, y, ["colony-eggs", "colony-larva", "colony-pupa"][i % 3])
            .setScale(0.8 + r() * 0.4)
            .setDepth(y - 20);
        else if (room.id === "stores")
          this.add
            .image(x, y, "colony-food")
            .setScale(0.9 + r())
            .setDepth(y - 10);
        else if (room.id === "remains")
          this.add
            .image(x, y, i % 2 ? "twig" : "leaf")
            .setScale(0.15 + r() * 0.12)
            .setTint(0x9c7e56)
            .setDepth(y - 10);
      }
    }
    for (const room of CHAMBERS) {
      const p = cellPoint(room.cx,room.cy);
      // Dress the roof and room edges without adding implied path obstacles.
      this.add.image(p.x - room.rx * 18, p.y - room.ry * TILE + 75, 'nest-root-arch')
        .setScale(room.id === 'entrance' ? 1.5 : 1.15)
        .setOrigin(.5,1).setDepth(p.y - room.ry * TILE + 76).setAlpha(.95);
      if (['remains','stores','shelter'].includes(room.id))
        this.add.image(p.x + room.rx * 24,p.y + room.ry * 23,'nest-litter')
          .setScale(.75).setDepth(p.y + room.ry * 23 - 3);
    }
    const q = cellPoint(24, 17);
    this.queen = this.add
      .image(q.x + 35, q.y - 34, "ant-queen0")
      .setScale(1.9, 1.4)
      .setRotation(-0.3)
      .setDepth(q.y - 15);
    this.add.image(q.x + 47, q.y - 16, "colony-eggs").setDepth(q.y - 14);
    const crack = this.add.graphics().setDepth(5);
    crack.fillStyle(0x211d20, 1);
    crack.fillRect(GATE_POINT.x - 98, GATE_POINT.y - 23, 196, 46);
    crack.lineStyle(2, 0xbf9050, 0.7);
    crack.lineBetween(
      GATE_POINT.x - 99,
      GATE_POINT.y - 25,
      GATE_POINT.x + 100,
      GATE_POINT.y - 25,
    );
    this.bridgeArt = this.add.image(GATE_POINT.x,GATE_POINT.y,'bridge')
      .setScale(1.12,1.18).setDepth(8).setVisible(false);
    for (const [col, row] of GATE_CELLS) {
      const p = cellPoint(col, row);
      const wall = this.add.zone(p.x, p.y, TILE, TILE);
      this.gateWalls.add(wall);
    }
    const portal = cellPoint(6, 3);
    this.add
      .image(portal.x, portal.y, "gate")
      .setScale(0.9)
      .setDepth(portal.y - 20);
    this.add
      .image(portal.x, portal.y - 90, "light")
      .setScale(2)
      .setTint(0xe7d8a6)
      .setAlpha(0.3)
      .setBlendMode(Phaser.BlendModes.ADD)
      .setDepth(2500);
    this.applyChanges();
  }
  createLife() {
    for (let i = 0; i < 24; i++) {
      const nurse = i % 4 === 0,
        role = nurse ? "nurse" : i % 4 === 1 ? "cleaner" : "forager";
      const home = cellPoint(
        nurse ? 23 : i % 4 === 1 ? 14 : 12,
        nurse ? 7 : i % 4 === 1 ? 20 : 5,
      );
      const ant = this.add
        .image(home.x + (i % 3) * 8, home.y + (i % 2) * 9, "ant0")
        .setScale(0.78 + (i % 3) * 0.1)
        .setDepth(home.y);
      ant.species = "ant";
      ant.role = role;
      ant.local = nurse && i % 8 === 0;
      ant.phase = 0;
      ant.path = [];
      ant.pause = i * 0.19;
      ant.state = "rest";
      ant.home = home;
      ant.cargo = this.add
        .image(
          ant.x,
          ant.y,
          nurse ? "colony-larva" : role === "cleaner" ? "twig" : "colony-food",
        )
        .setScale(nurse ? 0.5 : role === "cleaner" ? 0.17 : 0.32)
        .setVisible(false);
      ant.shadow = this.add
        .image(ant.x, ant.y + 8, "shadow")
        .setScale(0.36)
        .setAlpha(0.2)
        .setDepth(2);
      this.npcs.push(ant);
    }
  }
  currentStage() {
    if (this.app.state.quest !== 1)
      return {
        title:
          this.app.state.quest < 1 ? COLONY_UI.exploreGoal : COLONY_UI.exitGoal,
        points: [[COLONY_SPAWN.x, COLONY_SPAWN.y - 64]],
      };
    const stage = activeStage(this.app.state);
    return {
      ...stage,
      points: COLONY_OBJECTIVES[this.app.state.stage].map((p) => [p.x, p.y]),
    };
  }
  refreshMarkers() {
    this.near = null;
    this.app.updatePrompt(null);
    for (const marker of this.markers) marker.sprite.destroy();
    this.markers = [];
    const stage = this.currentStage(),
      s = this.app.state;
    if (s.quest === 1)
      stage.points.forEach(([x, y], index) => {
        if (s.progress.includes(index)) return;
        const sprite = this.add
          .image(
            x,
            y,
            stage.action === "collect"
              ? "twig"
              : stage.action === "build"
                ? "bridge"
                : "colony-eggs",
          )
          .setScale(stage.action === "build" ? 0.75 : 1)
          .setDepth(y + 3);
        this.markers.push({ sprite, x, y, index, stage, kind: "quest" });
      });
    for (const room of CHAMBERS) {
      const p = NOTE_POINTS[room.id],
        sprite = this.add
          .image(p.x, p.y, "light")
          .setScale(0.08)
          .setTint(this.state.notes.includes(room.id) ? 0x917955 : 0xb8d2b7)
          .setDepth(p.y);
      this.markers.push({
        sprite,
        ...p,
        kind: "quest",
        note: room.id,
        stage: { title: room.name },
      });
    }
    const exit = cellPoint(6, 3),
      sprite = this.add
        .image(exit.x, exit.y, "light")
        .setScale(0.16)
        .setTint(0xd6e5b5)
        .setDepth(exit.y + 1);
    this.markers.push({
      sprite,
      ...exit,
      kind: "quest",
      exit: true,
      stage: { title: COLONY_UI.leave },
    });
    this.applyChanges();
  }
  applyChanges() {
    const open = bridgeIsOpen(this.app.state),
      changed = this.open !== open;
    this.open = open;
    this.grid = makeColonyGrid(open);
    for (const wall of this.gateWalls?.getChildren() || [])
      wall.body.enable = !open;
    this.bridgeArt?.setVisible(open);
    if (changed)
      for (const ant of this.npcs) {
        ant.path = [];
        ant.pause = 0.1;
      }
  }
  refreshLabels() {
    for (const entry of this.roomLabels)
      entry.text.setText(this.app.l(entry.room.name));
  }
  reset() {
    this.state = this.app.state.colony;
    this.applyChanges();
    const p = nearestFloor(this.grid, this.state.x, this.state.y);
    this.player.body.reset(p.x, p.y);
    this.state.x = p.x;
    this.state.y = p.y;
    this.observationPending = false;
    this.observationTime = 0;
    this.near = null;
    this.cameras.main
      .stopFollow()
      .setZoom(1.05)
      .startFollow(this.player, true, 0.08, 0.08);
    this.refreshLabels();
  }
  showWelcome() {
    this.app.state.seen.push("colony-instructions");
    this.app.dialog(COLONY_UI.title, COLONY_UI.fiction, () =>
      this.app.save(false),
    );
  }
  update(time, delta) {
    if (!this.player) return;
    this.director.update(time);
    this.cineLayers?.update(time);
    const dt = Math.min(delta, 50) / 1000;
    if (this.app.mode !== "play") {
      this.player.setVelocity(0);
      if (this.cinematic) this.animateLife(time, dt);
      return;
    }
    const k = this.keys,
      j = this.app.joy;
    let x =
        (k.D.isDown || k.RIGHT.isDown ? 1 : 0) -
        (k.A.isDown || k.LEFT.isDown ? 1 : 0) +
        j.x,
      y =
        (k.S.isDown || k.DOWN.isDown ? 1 : 0) -
        (k.W.isDown || k.UP.isDown ? 1 : 0) +
        j.y;
    const len = Math.hypot(x, y);
    if (len > 1) {
      x /= len;
      y /= len;
    }
    const speed = this.observing ? 90 : k.SHIFT.isDown ? 230 : 170;
    this.player.setVelocity(x * speed, y * speed);
    if (len > 0.05)
      this.dir = Math.abs(x) > Math.abs(y) ? (x > 0 ? 1 : 2) : y > 0 ? 0 : 3;
    // Same rule as on the surface: the cycle follows distance, not the clock.
    const last = this.lastWalk || { x: this.player.x, y: this.player.y },
      covered = Math.hypot(this.player.x - last.x, this.player.y - last.y);
    this.lastWalk = { x: this.player.x, y: this.player.y };
    if (covered < 40) this.walkPhase = ((this.walkPhase || 0) + covered / 8) % 8;
    this.player.setTexture(
      len > 0.05
        ? `hero${this.dir || 0}-${Math.floor(this.walkPhase || 0)}`
        : `hero-idle${this.dir || 0}-${Math.floor(time / 700) % 4}`,
    );
    const jump = Math.max(0, (this.jumpUntil || 0) - time) / 540,
      height = jump ? Math.sin(jump * Math.PI) * 16 : 0;
    this.player.setOrigin(0.5, 1 + height / this.player.displayHeight);
    this.player.body.setOffset(7, 26 + height / 1.75);
    this.player.setDepth(this.player.y + 10);
    this.shadow.setPosition(this.player.x, this.player.y + 3);
    this.state.x = this.player.x;
    this.state.y = this.player.y;
    this.app.state.played += dt;
    this.app.state.time = (this.app.state.time + dt / 100) % 24;
    this.animateLife(time, dt);
    this.updateNear();
    this.updateEffects(time);
    const room = CHAMBERS.find(
      (r) =>
        ((this.player.x - (r.cx + 0.5) * TILE) / (r.rx * TILE)) ** 2 +
          ((this.player.y - (r.cy + 0.5) * TILE) / (r.ry * TILE)) ** 2 <
        0.75,
    );
    if (room && !this.state.visited.includes(room.id)) {
      this.state.visited.push(room.id);
      this.app.regionToast({ name: room.name, sub: COLONY_UI.title });
      this.app.save(false);
    }
    if (
      this.app.state.quest === 1 &&
      this.app.state.stage === 2 &&
      this.observing &&
      distance(this.player, COLONY_OBJECTIVES[2][0]) < 180
    ) {
      const nursing = this.npcs.some(
        (ant) =>
          ant.role === "nurse" &&
          distance(ant, this.player) < 220 &&
          ["carry", "tend"].includes(ant.state),
      );
      if (nursing) this.observationTime += dt;
      this.app.setStatus(
        `${this.app.l(COLONY_UI.watch)} · ${Math.min(4, Math.floor(this.observationTime))}/4`,
      );
      if (this.observationTime >= 4 && !this.observationPending) {
        this.observationPending = true;
        const stage = activeStage(this.app.state);
        this.app.dialog(QUESTS[1].intro, stage.text, () => this.app.advance(0));
      }
    } else this.observationTime = 0;
    if (time > (this.hudAt || 0)) {
      this.hudAt = time + 400;
      this.app.updateLiveHud();
    }
  }
  animateLife(time, dt) {
    const count = this.app.state.settings.low ? 16 : 24;
    for (let i = 0; i < this.npcs.length; i++) {
      const ant = this.npcs[i];
      ant.setVisible(i < count);
      ant.cargo.setVisible(i < count && ant.phase % 2 === 1);
      ant.shadow.setVisible(i < count);
      if (i >= count) continue;
      ant.pause -= dt;
      if (ant.pause <= 0 && !ant.path.length) {
        const to =
          ant.role === "nurse"
            ? this.open && !ant.local
              ? ant.phase % 2
                ? cellPoint(6, 16)
                : cellPoint(23, 7)
              : ant.phase % 2
                ? cellPoint(24, 8)
                : cellPoint(22, 7)
            : ant.role === "cleaner"
              ? ant.phase % 2
                ? cellPoint(14, 20)
                : cellPoint(14, 12)
              : ant.phase % 2
                ? cellPoint(6, 4)
                : cellPoint(12, 5);
        const grid =
          ant.role === "nurse" && !this.open ? makeColonyGrid(true) : this.grid;
        ant.path = colonyPath(grid, ant, to);
        ant.state = ant.phase % 2 ? "carry" : "move";
        if (ant.path.length && distance(ant, ant.path[0]) < 10)
          ant.path.shift();
        if (!ant.path.length) {
          ant.phase++;
          ant.pause = 1.2 + (i % 3) * 0.3;
          ant.state = ant.role === "nurse" ? "tend" : "feed";
        }
      }
      if (ant.path.length && ant.pause <= 0) {
        if (time > (ant.meetReady || 0)) {
          const other = this.npcs.find(
            (o) =>
              o !== ant &&
              o.path.length &&
              distance(o, ant) < 22 &&
              time > (o.meetReady || 0),
          );
          if (other) {
            ant.meetReady = other.meetReady = time + 6500;
            ant.pause = other.pause = 0.5;
            ant.state = other.state = "interact";
          }
        }
        const p = ant.path[0],
          d = distance(ant, p),
          speed = ant.role === "nurse" ? 46 : 35 + (i % 4) * 4;
        if (d < speed * dt + 1) {
          ant.setPosition(p.x, p.y);
          ant.path.shift();
          if (!ant.path.length) {
            ant.phase++;
            ant.pause = 1.4 + (i % 3) * 0.3;
            ant.state = ant.role === "nurse" ? "tend" : "feed";
          }
        } else {
          ant.x += ((p.x - ant.x) / d) * speed * dt;
          ant.y += ((p.y - ant.y) / d) * speed * dt;
          ant.rotation = Math.atan2(p.y - ant.y, p.x - ant.x) + Math.PI / 2;
        }
      }
      if (ant.path.length && ant.pause <= 0)
        ant.state = ant.phase % 2 ? "carry" : "move";
      ant
        .setTexture(
          "ant" +
            (ant.path.length && ant.pause <= 0
              ? Math.floor(time / 150 + i) % 4
              : Math.floor(time / 650 + i) % 2),
        )
        .setDepth(ant.y + 2);
      ant.cargo
        .setPosition(
          ant.x + Math.sin(ant.rotation) * -12,
          ant.y - Math.cos(ant.rotation) * 13,
        )
        .setRotation(ant.rotation)
        .setDepth(ant.y + 3);
      ant.shadow.setPosition(ant.x, ant.y + 8);
      if (this.observing && distance(ant, this.player) < 190)
        this.discover("ant");
    }
    this.queen?.setScale(
      1.9 + Math.sin(time / 1800) * 0.018,
      1.4 + Math.sin(time / 1800) * 0.015,
    );
  }
  updateNear() {
    const candidates = this.markers
      .map((m) => ({ ...m, d: distance(m, this.player) }))
      .filter((m) => m.d < (m.exit ? 95 : m.note ? 65 : 110));
    candidates.sort(
      (a, b) => (a.note ? 30 : 0) + a.d - (b.note ? 30 : 0) - b.d,
    );
    this.near = candidates[0] || null;
    this.app.updatePrompt(this.near);
  }
  updateEffects(time) {
    this.rings.clear();
    const stage = this.currentStage(),
      points =
        this.app.state.quest === 1
          ? stage.points.filter((_, i) => !this.app.state.progress.includes(i))
          : stage.points;
    const targets = points
      .map(([x, y]) => ({ x, y }))
      .sort((a, b) => distance(a, this.player) - distance(b, this.player));
    if (targets.length) {
      const route = colonyPath(this.grid, this.player, targets[0]);
      const goal =
          route.find((p) => distance(p, this.player) > 75) || targets[0],
        d = Math.max(1, distance(goal, this.player)),
        v = Math.min(75, d);
      this.guide
        .setVisible(true)
        .setPosition(
          this.player.x + ((goal.x - this.player.x) / d) * v,
          this.player.y +
            ((goal.y - this.player.y) / d) * v -
            28 +
            Math.sin(time / 440) * 4,
        );
      for (const p of targets) {
        this.rings.lineStyle(1, 0xf0d599, 0.65);
        this.rings.strokeEllipse(p.x, p.y + 6, 48, 20);
      }
    } else this.guide.setVisible(false);
    if (this.observing) {
      this.rings.lineStyle(1, 0xc7d1a0, 0.25);
      this.rings.strokeCircle(this.player.x, this.player.y - 15, 180);
    }
    this.overlay
      .clear()
      .fillStyle(0x100e19, this.scanning ? 0.07 : 0.19)
      .fillRect(0, 0, 960, 540);
    this.dust.clear();
    if (!this.app.state.settings.low)
      for (let i = 0; i < 32; i++) {
        this.dust.fillStyle(0xe4bb83, 0.14 + (i % 4) * 0.03);
        this.dust.fillRect(
          (i * 109 + time * 0.003) % 960,
          (i * 71 + Math.sin(time / 2800 + i) * 14) % 540,
          1,
          1,
        );
      }
  }
  interact() {
    if (this.app.mode !== "play" || !this.near) return;
    const near = this.near;
    if (near.exit) return this.app.exitColony();
    if (near.note) {
      const room = CHAMBERS.find((r) => r.id === near.note);
      if (!this.state.notes.includes(room.id)) {
        this.state.notes.push(room.id);
        this.app.audio.play("discovery");
      }
      this.app.dialog(room.name, room.note, () => {
        this.refreshMarkers();
        this.app.save(false);
      });
      return;
    }
    if (this.app.state.quest !== 1) return;
    const stage = activeStage(this.app.state);
    if (stage.action === "collect") {
      this.app.state.inventory.twigs++;
      this.app.audio.play("click");
      this.burst(near.x, near.y);
      this.app.advance(near.index);
    } else if (stage.action === "build") {
      this.app.dialog(QUESTS[1].intro, stage.text, () => {
        this.app.advance(near.index);
        this.app.toast(this.app.l(COLONY_UI.repaired));
      });
    } else if (stage.action === "observe") {
      if (!this.observing) this.toggleObserve();
      this.app.toast(this.app.l(COLONY_UI.observe));
    }
  }
  discover(id) {
    if (this.app.state.discovered.includes(id)) return;
    this.app.state.discovered.push(id);
    this.app.audio.play("discovery");
    this.app.discoveryToast(id);
    this.app.save(false);
  }
  toggleObserve() {
    if (this.app.mode !== "play") return;
    this.observing = !this.observing;
    this.app.refreshHud();
  }
  toggleScan() {
    if (this.app.mode !== "play") return;
    if (!this.app.state.abilities.includes("scanner"))
      return this.app.toast(this.app.t("locked"));
    this.scanning = !this.scanning;
    this.app.refreshHud();
  }
  jump() {
    if (this.app.mode !== "play" || this.time.now < (this.jumpUntil || 0))
      return;
    this.jumpUntil = this.time.now + 540;
    this.app.audio.play("jump");
  }
  perspective() {
    this.app.toast(
      this.app.l(
        T(
          "Два взгляда доступны на поверхности",
          "Екі көзқарас жер бетінде қолжетімді",
          "The two perspectives are available on the surface",
        ),
      ),
    );
  }
  isNight() {
    return false;
  }
  burst(x, y) {
    for (let i = 0; i < 9; i++) {
      const p = this.add.rectangle(x, y, 2, 2, 0xe2c889).setDepth(4002);
      gsap.to(p, {
        x: x + (i - 4) * 7,
        y: y - 20 - i * 3,
        alpha: 0,
        duration: 0.7,
        onComplete: () => p.destroy(),
      });
    }
  }
  cinematicShot(id, index) {
    this.clearCinematic();
    this.cinematic = true;
    this.cineLayers=new ParallaxStage(this,{theme:'roots'});
    this.player.setVelocity(0);
    const targets = [cellPoint(14, 11), cellPoint(23, 7), cellPoint(24, 17)],
      target = targets[index % targets.length],
      cam = this.cameras.main;
    cam.stopFollow();
    this.director.run(id, index, [target.x, target.y], this.cineLayers);
    this.guide?.setVisible(false);
    this.rings?.clear();
  }
  clearCinematic() {
    this.director?.stop();
    this.cineLayers?.destroy();this.cineLayers=null;
    gsap.killTweensOf(this.cameras?.main);
    this.cinematic = false;
  }
  endCinematic() {
    this.clearCinematic();
    this.cameras.main.setZoom(1.05).startFollow(this.player, true, 0.08, 0.08);
  }
  drawMap(c, w, h, big) {
    c.fillStyle = "#201d20";
    c.fillRect(0, 0, w, h);
    const sx = w / COLS,
      sy = h / ROWS,
      grid = makeColonyGrid(true);
    for (let y = 0; y < ROWS; y++)
      for (let x = 0; x < COLS; x++)
        if (grid[y][x]) {
          c.fillStyle = "#876138";
          c.fillRect(x * sx, y * sy, sx + 0.5, sy + 0.5);
        }
    if (!this.open) {
      c.fillStyle = "#251c20";
      for (const [x, y] of GATE_CELLS)
        c.fillRect(x * sx, y * sy, sx + 1, sy + 1);
    }
    if (big) {
      c.font = "12px Field";
      c.textAlign = "center";
      for (const room of CHAMBERS) {
        const seen = this.state.visited.includes(room.id);
        c.fillStyle = seen ? "#efd8ab" : "#ab9472";
        c.fillText(
          seen ? this.app.l(room.name) : "?",
          (room.cx + 0.5) * sx,
          (room.cy + 0.5) * sy,
        );
      }
    }
    c.fillStyle = "#f0cc7e";
    if (this.app.state.quest === 1)
      for (const [i, [x, y]] of this.currentStage().points.entries()) {
        if (this.app.state.progress.includes(i)) continue;
        c.fillRect(
          (x / COLONY_WIDTH) * w - 2,
          (y / COLONY_HEIGHT) * h - 2,
          4,
          4,
        );
      }
    c.fillStyle = "#d6e9b8";
    const exit = cellPoint(6, 3);
    c.fillRect(
      (exit.x / COLONY_WIDTH) * w - 3,
      (exit.y / COLONY_HEIGHT) * h - 3,
      6,
      6,
    );
    c.fillStyle = "#fff0cd";
    c.beginPath();
    c.arc(
      (this.player.x / COLONY_WIDTH) * w,
      (this.player.y / COLONY_HEIGHT) * h,
      big ? 5 : 2.5,
      0,
      7,
    );
    c.fill();
  }
}
