import Phaser from "phaser";
import { gsap } from "gsap";
import { T, L, speciesById } from "./content.js";
import { rng, canvas } from "./art.js";
import { installVisuals, materialCanvas, visualEntry } from "./visuals.js";
import { windAt } from "./atmosphere.js";
import { ParallaxStage } from "./parallax.js";
import { applyEffects } from "./model.js";
export const uwSpecies = [
  "dragonflylarva",
  "daphnia",
  "pondsnail",
  "mayflynymph",
  "caddisfly",
  "waterbeetle",
];
export const UW = {
  title: T("Подводный сад", "Суасты бағы", "The submerged garden"),
  quest: T(
    "Там, где начинается полёт",
    "Ұшу басталатын жерде",
    "Where flight begins",
  ),
  dive: T(
    "Нырнуть в подводный мир",
    "Суасты әлеміне сүңгу",
    "Dive into the underwater world",
  ),
  exit: T("Подняться к берегу", "Жағаға көтерілу", "Return to the shore"),
  intro: T(
    "Под зеркальной поверхностью скрывается ещё один мир. Воздушный купол позволяет герою плавать — это условность сна. Освободи проходы, понаблюдай за водными обитателями и восстанови заросли.",
    "Айнадай су астында тағы бір әлем бар. Ауа күмбезі кейіпкерге жүзуге мүмкіндік береді — бұл түс шарттылығы. Өткелді аш, су тұрғындарын бақыла, өсімдіктерді қалпына келтір.",
    "Another world lies beneath the mirror. A dreamlike air dome lets the hero swim. Free the passages, observe aquatic neighbours and restore the plants.",
  ),
  clear: T(
    "Освободите три прохода среди водных растений",
    "Су өсімдіктері арасында үш өткелді ашыңыз",
    "Free three passages among the aquatic plants",
  ),
  observe: T(
    "Наблюдайте трёх разных водных обитателей — Q",
    "Үш түрлі су тұрғынын бақылаңыз — Q",
    "Observe three different aquatic inhabitants — Q",
  ),
  restore: T(
    "Восстановите три участка водных растений",
    "Су өсімдіктерінің үш жерін қалпына келтіріңіз",
    "Restore three patches of aquatic plants",
  ),
  done: T(
    "Подводный сад оживает. Здесь можно продолжить наблюдения или вернуться на берег.",
    "Суасты бағы жанданды. Бақылауды жалғастыруға не жағаға оралуға болады.",
    "The submerged garden is recovering. Continue observing or return to shore.",
  ),
  conclusion: T(
    "Личинка стрекозы живёт здесь задолго до первого полёта. Забота о водоёме — забота и о тех, кто летает над ним. Растения дают укрытия, но не удаляют все загрязняющие вещества.",
    "Инелік дернәсілі алғашқы ұшуына дейін осында өседі. Суға қамқорлық — оның үстінде ұшатындарға да қамқорлық. Өсімдік пана береді, бірақ бүкіл ластаушыны жоймайды.",
    "A dragonfly lives here long before its first flight. Caring for water also cares for those flying above it. Plants provide shelter, but cannot remove every pollutant.",
  ),
};
const POINTS = [
  [
    [580, 410],
    [970, 680],
    [1320, 470],
  ],
  [
    [510, 690],
    [870, 460],
    [1200, 850],
  ],
  [
    [570, 490],
    [1040, 810],
    [1320, 610],
  ],
];
export class UnderwaterScene extends Phaser.Scene {
  constructor(app) {
    super("Underwater");
    this.app = app;
    this.isUnderwater = true;
    this.lastBiome = 3;
    this.observing = false;
    this.scanning = false;
    this.cinematic = false;
    this.humanView = false;
    this.markers = [];
    this.npcs = [];
    this.props = [];
    this.near = null;
  }
  create() {
    installVisuals(this);
    this.ambienceLayers?.destroy();
    this.ambienceLayers=new ParallaxStage(this,{theme:'water',ambient:true});
    this.app.scene = this;
    this.state = this.app.state.underwater;
    this.markers = [];
    this.npcs = [];
    this.props = [];
    this.observing = false;
    this.scanning = false;
    const put = (key, w, h, fn) => {
      if (this.textures.exists(key)) return;
      if (visualEntry(key)) return;
      const [c, g] = canvas(w, h);
      fn(g);
      this.textures.addCanvas(key, c);
    };
    put("uw-floor", 400, 275, (c) => {
      const r = rng(927);
      c.fillStyle = "#255b68";
      c.fillRect(0, 0, 400, 275);
      for (let i = 0; i < 22000; i++) {
        c.fillStyle = ["#2f6871", "#3c7577", "#55837a", "#396e6d", "#1f5261"][
          i % 5
        ];
        c.fillRect(r() * 400, r() * 275, 1 + r() * 3, 1);
      }
      c.globalAlpha=.45;c.fillStyle=c.createPattern(materialCanvas(this,'material-silt'),'repeat');c.fillRect(0,0,400,275);c.globalAlpha=1;
      for (let i = 0; i < 12; i++) {
        const x = r() * 400,
          y = r() * 275;
        c.fillStyle = "#1e515e";
        c.beginPath();
        c.ellipse(x, y, 15 + r() * 25, 7 + r() * 9, 0, 0, 7);
        c.fill();
      }
      c.strokeStyle = "#528d8b";
      c.lineWidth = 2;
      for (let i = 0; i < 10; i++) {
        c.beginPath();
        c.moveTo(0, i * 30);
        c.bezierCurveTo(140, i * 30 - 16, 220, i * 30 + 28, 400, i * 30);
        c.stroke();
      }
    });
    put("waterweed", 100, 220, (c) => {
      for (let j = 0; j < 5; j++) {
        const x = 25 + j * 12,
          h = 100 + (j % 3) * 33;
        c.strokeStyle = j % 2 ? "#50977e" : "#327866";
        c.lineWidth = 3;
        c.beginPath();
        c.moveTo(x, 218);
        c.bezierCurveTo(x - 22, 160, x + 18, 70, x - 4, 220 - h);
        c.stroke();
        for (let i = 0; i < 7; i++) {
          const y = 210 - i * (h / 8);
          c.fillStyle = i % 2 ? "#81b895" : "#4d9b7f";
          c.beginPath();
          c.ellipse(x - 9, y - 5, 14 - i, 4, Math.PI / 5, 0, 7);
          c.fill();
          c.beginPath();
          c.ellipse(x + 8, y - 11, 13 - i, 4, -Math.PI / 5, 0, 7);
          c.fill();
        }
      }
    });
    put("uw-root", 150, 230, (c) => {
      const r = rng(83);
      for (let i = 0; i < 24; i++) {
        c.strokeStyle = i % 2 ? "#4c8375" : "#80a18a";
        c.lineWidth = i % 3 === 0 ? 3 : 1;
        c.beginPath();
        c.moveTo(i * 6, 0);
        c.bezierCurveTo(
          i * 6 - 20,
          70,
          i * 6 + 25,
          130,
          i * 6 + (r() - 0.5) * 70,
          80 + r() * 150,
        );
        c.stroke();
      }
    });
    put("fish", 64, 32, (c) => {
      c.fillStyle = "#668f8d";
      c.beginPath();
      c.ellipse(29, 16, 21, 9, 0, 0, 7);
      c.fill();
      c.beginPath();
      c.moveTo(46, 16);
      c.lineTo(62, 4);
      c.lineTo(60, 29);
      c.fill();
      c.fillStyle = "#b7cbb2";
      c.fillRect(12, 11, 3, 3);
      c.fillStyle = "#253e4a";
      c.fillRect(12, 12, 2, 2);
      c.strokeStyle = "#8ab5a5";
      c.beginPath();
      c.moveTo(16, 22);
      c.lineTo(43, 21);
      c.stroke();
    });
    this.textures.get("uw-floor").setFilter(Phaser.Textures.FilterMode.LINEAR);
    this.add.image(0, 0, "uw-floor").setOrigin(0).setScale(4).setDepth(-100);
    this.obstacles = this.physics.add.staticGroup();
    const r = rng(900);
    for (let i = 0; i < 70; i++) {
      const x = 80 + r() * 1440,
        y = 100 + r() * 920;
      let key =
        i % 6 === 0 ? "rock" : i % 3 === 0 ? "pondweed-hi" : "waterweed-hi";
      if (
        key === "rock" &&
        POINTS.flat()
          .concat([
            [240, 210],
            [240, 260],
          ])
          .some(([a, b]) => Math.hypot(x - a, y - b) < 110)
      )
        key = "waterweed-hi";
      const o = this.add
        .image(x, y, key)
        .setOrigin(0.5, 1)
        .setScale(key === "rock" ? 0.7 + r() : 0.4 + r() * 0.36)
        .setDepth(y);
      o.baseAngle = (r() - 0.5) * 8;
      o.seed = r() * 5;
      this.props.push(o);
      if (key === "rock") {
        const z = this.add.zone(x, y - 10, 40, 18);
        this.obstacles.add(z);
      }
    }
    for (let i = 0; i < 8; i++)
      this.add
        .image(100 + i * 235, 5, "waterroot-hi")
        .setOrigin(0.5, 0)
        .setScale(0.95)
        .setAlpha(0.55)
        .setDepth(1800);
    for (let i = 0; i < 30; i++) {
      const id = uwSpecies[i % uwSpecies.length],
        p = POINTS[1][i % 3],
        x = i < 3 ? p[0] : 180 + r() * 1200,
        y = i < 3 ? p[1] : 200 + r() * 730;
      const o = this.add
        .image(x, y, id + "0")
        .setScale(id === "daphnia" ? 0.55 : 0.9)
        .setDepth(y);
      o.species = id;
      o.home = { x, y };
      o.seed = i * 1.8;
      o.phase = i;
      o.discovered = false;
      this.npcs.push(o);
    }
    this.add
      .image(1070, 890, "waterarch-hi")
      .setOrigin(0.5, 0.95)
      .setScale(1.5)
      .setDepth(890);
    for (let i = 0; i < 3; i++) {
      if (
        this.state.stage > 2 ||
        (this.state.stage === 2 && this.state.progress.includes(i))
      ) {
        const [x, y] = POINTS[2][i],
          o = this.add
            .image(x, y, "waterweed-hi")
            .setOrigin(0.5, 0.95)
            .setScale(0.62)
            .setDepth(y);
        o.baseAngle = 0;
        o.seed = i;
        this.props.push(o);
      }
    }
    this.fishes = [];
    for (let i = 0; i < 9; i++) {
      const o = this.add
        .image(160 + i * 150, 120 + (i % 3) * 210, "fish0")
        .setScale(0.8 + (i % 3) * 0.3)
        .setAlpha(0.68)
        .setDepth(-20);
      o.homeY = o.y;
      o.seed = i;
      this.fishes.push(o);
    }
    this.player = this.physics.add
      .sprite(this.state.x, this.state.y, "hero0-0")
      .setOrigin(0.5, 1)
      .setScale(1.6)
      .setDepth(this.state.y);
    this.player.body.setSize(11, 10).setOffset(7, 23);
    this.player.setCollideWorldBounds(true);
    this.physics.world.setBounds(20, 30, 1560, 1040);
    this.physics.add.collider(this.player, this.obstacles);
    this.dome = this.add
      .image(this.player.x, this.player.y - 38, "light")
      .setScale(0.62)
      .setAlpha(0.22)
      .setBlendMode(Phaser.BlendModes.ADD)
      .setDepth(1500);
    this.fx = this.add.graphics().setDepth(1600);
    this.overlay = this.add.graphics().setScrollFactor(0).setDepth(1800);
    this.bubbles = Array.from({ length: 38 }, (_, i) => ({
      x: r() * 960,
      y: r() * 540,
      r: 1 + (i % 3),
      s: 0.02 + r() * 0.04,
    }));
    this.cameras.main
      .setBounds(0, 0, 1600, 1100)
      .setZoom(1.15)
      .startFollow(this.player, true, 0.07, 0.07);
    this.keys = this.input.keyboard.addKeys(
      "W,A,S,D,UP,DOWN,LEFT,RIGHT,E,Q,C,M,J,V,SPACE,SHIFT,ESC,F",
    );
    for (const [k, fn] of Object.entries({
      E: () => this.interact(),
      Q: () => this.toggleObserve(),
      C: () => this.toggleScan(),
      M: () => this.app.openMap(),
      J: () => this.app.openJournal(),
      ESC: () => this.app.escape(),
      F: () => this.app.fullscreen(),
      SPACE: () => this.jump(),
    }))
      this.keys[k].on("down", (_key, event) => {
        if (this.app.scene !== this) return;
        event?.stopPropagation?.();
        if (this.app.mode === "play" || k === "ESC") fn();
      });
    // Reuse the sleeping scene between dives without accumulating objects.
    this.events.off("wake");
    this.events.on("wake", () => {
      this.app.scene = this;
      this.state = this.app.state.underwater;
      this.observing = false;
      this.scanning = false;
      this.near = null;
      this.reset();
      this.refreshMarkers();
      this.app.refreshHud();
      this.app.audio.enter(3, false, this.app.state.eco);
    });
    this.refreshMarkers();
    this.app.refreshHud();
    this.app.audio.enter(3, false, this.app.state.eco);
    this.events.once("postupdate", () => {
      if (!this.app.state.seen.includes("underwater")) {
        this.app.state.seen.push("underwater");
        this.app.dialog(UW.title, UW.intro);
      }
    });
  }
  currentStage() {
    return this.state.stage < 3
      ? {
          title: [UW.clear, UW.observe, UW.restore][this.state.stage],
          points: POINTS[this.state.stage],
        }
      : { title: UW.done, points: [] };
  }
  refreshMarkers() {
    for (const o of this.markers) o.sprite.destroy();
    this.markers = [];
    if (this.state.stage === 0 || this.state.stage === 2)
      POINTS[this.state.stage].forEach(([x, y], i) => {
        if (this.state.progress.includes(i)) return;
        const sprite = this.add
          .image(x, y, this.state.stage === 0 ? "plastic" : "sprout")
          .setScale(this.state.stage === 0 ? 0.8 : 1.1)
          .setDepth(y);
        this.markers.push({
          kind: "quest",
          sprite,
          x,
          y,
          index: i,
          stage: this.currentStage(),
        });
      });
    const sprite = this.add.image(240, 210, "dew").setScale(1.7).setDepth(210);
    this.markers.push({
      kind: "quest",
      sprite,
      x: 240,
      y: 210,
      exit: true,
      stage: { title: UW.exit },
    });
  }
  update(time, delta) {
    this.ambienceLayers?.update(time);
    if (!this.player || this.app.mode !== "play") {
      this.player?.setVelocity(0);
      return;
    }
    const dt = Math.min(delta, 50) / 1000,
      k = this.keys,
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
    const speed = this.observing ? 95 : this.dashUntil > time ? 310 : 175;
    this.player.setVelocity(x * speed, y * speed);
    if (len > 0.05)
      this.dir = Math.abs(x) > Math.abs(y) ? (x > 0 ? 1 : 2) : y > 0 ? 0 : 3;
    this.player
      .setTexture(
        `hero${this.dir || 0}-${len > 0.05 ? Math.floor(time / 125) % 8 : 0}`,
      )
      .setDepth(this.player.y);
    this.state.x = this.player.x;
    this.state.y = this.player.y;
    this.dome.setPosition(
      this.player.x,
      this.player.y - 33 + Math.sin(time / 700) * 3,
    );
    this.app.state.played += dt;
    this.app.state.time = (this.app.state.time + dt / 90) % 24;
    for (const o of this.props) {
      if (o.texture.key.includes("weed") && !this.app.state.settings.low)
        o.angle = o.baseAngle + windAt(o.x, o.y, time) * 5;
      const hidesHero =
        o.y > this.player.y &&
        Math.abs(o.x - this.player.x) < o.displayWidth * 0.28 &&
        o.y - this.player.y < o.displayHeight * 0.8;
      o.setAlpha(o.alpha + ((hidesHero ? 0.36 : 1) - o.alpha) * (1 - Math.exp(-dt * 15)));
    }
    for (const o of this.fishes) {
      o.x = ((time * 0.024 + o.seed * 195) % 1850) - 100;
      o.y = o.homeY + Math.sin(time / 1300 + o.seed) * 28;
      // Four illustrated tail-beat frames, each fish with its own phase.
      o.setTexture("fish" + (this.app.state.settings.low ? 0 : Math.floor(time / 145 + o.seed) % 4));
      o.setFlipX(false);
    }
    for (const o of this.npcs) {
      const d = Math.hypot(o.x - this.player.x, o.y - this.player.y);
      o.x =
        o.home.x +
        Math.sin(time / 1800 + o.seed) * (o.species === "daphnia" ? 35 : 45);
      o.y =
        o.home.y +
        Math.cos(time / 2600 + o.seed) * (o.species === "pondsnail" ? 10 : 25);
      o.setTexture(o.species + (Math.floor(time / 180) % 4)).setDepth(o.y);
      if (this.observing && d < 170) {
        this.discover(o.species);
        if (
          this.state.stage === 1 &&
          !this.state.observed.includes(o.species)
        ) {
          this.state.observed.push(o.species);
          this.state.progress.push(this.state.observed.length - 1);
          this.app.toast(
            this.app.t("notice") +
              " · " +
              this.app.l(speciesById[o.species].name),
          );
          if (this.state.observed.length >= 3) this.advance();
          else this.app.refreshHud();
        }
      }
    }
    const near = [
      ...this.markers.map((o) => ({
        ...o,
        d: Math.hypot(o.x - this.player.x, o.y - this.player.y),
      })),
      ...this.npcs.map((o) => ({
        kind: "npc",
        data: o,
        x: o.x,
        y: o.y,
        d: Math.hypot(o.x - this.player.x, o.y - this.player.y),
      })),
    ]
      .filter((o) => o.d < 95)
      .sort(
        (a, b) =>
          a.d -
          (a.kind === "quest" ? 20 : 0) -
          b.d +
          (b.kind === "quest" ? 20 : 0),
      );
    this.near = near[0] || null;
    this.app.updatePrompt(this.near);
    this.fx.clear();
    this.fx.lineStyle(1, 0xb5e9db, 0.65);
    this.fx.strokeCircle(
      this.player.x,
      this.player.y - 35,
      24 + Math.sin(time / 800),
    );
    for (const o of this.markers) {
      this.fx.lineStyle(1, o.exit ? 0xa4d4dd : 0xefda8c, 0.7);
      this.fx.strokeEllipse(o.x, o.y + 10, 45 + Math.sin(time / 400) * 4, 16);
    }
    this.overlay.clear();
    this.overlay.fillStyle(0x164f6c, 0.18);
    this.overlay.fillRect(0, 0, 960, 540);
    for (let i = 0; i < 5; i++) {
      this.overlay.fillStyle(0xb5e9d4, 0.035);
      const xx = i * 250 + Math.sin(time / 5000 + i) * 60;
      this.overlay.fillTriangle(xx, -20, xx + 80, -20, xx - 160, 540);
    }
    for (const b of this.bubbles) {
      b.y -= b.s * delta;
      if (b.y < -10) b.y = 550;
      const xx = b.x + Math.sin(time / 1200 + b.x) * 10;
      this.overlay.lineStyle(1, 0xb5e5dd, 0.35);
      this.overlay.strokeCircle(xx, b.y, b.r);
    }
    if (Math.floor(time / 600) !== this.tick) {
      this.tick = Math.floor(time / 600);
      this.app.updateLiveHud();
    }
    if (time - (this.lastSave || 0) > 30000) {
      this.lastSave = time;
      this.app.save(false);
    }
  }
  advance() {
    this.state.stage++;
    this.state.progress = [];
    this.refreshMarkers();
    this.app.refreshHud();
    this.app.audio.play("complete");
    if (this.state.stage >= 3) {
      this.state.done = true;
      applyEffects(this.app.state, { water: 12, soil: 6, safety: 7 });
      this.app.dialog(UW.title, UW.conclusion);
    }
    this.app.save(false);
  }
  interact() {
    const n = this.near;
    if (!n || this.app.mode !== "play") return;
    if (n.exit) return this.app.exitUnderwater();
    if (n.kind === "npc") {
      this.discover(n.data.species);
      return this.app.speciesDialog(n.data.species);
    }
    if (this.state.progress.includes(n.index)) return;
    if (this.state.stage === 2) {
      const o = this.add
        .image(n.x, n.y, "waterweed-hi")
        .setOrigin(0.5, 1)
        .setScale(0.8)
        .setDepth(n.y);
      o.baseAngle = 0;
      o.seed = n.index;
      this.props.push(o);
      this.burst(n.x, n.y);
    }
    this.state.progress.push(n.index);
    this.app.audio.play("water");
    if (this.state.progress.length >= 3) this.advance();
    else {
      this.refreshMarkers();
      this.app.refreshHud();
      this.app.save(false);
    }
  }
  discover(id) {
    if (this.app.state.discovered.includes(id)) return;
    this.app.state.discovered.push(id);
    this.app.discoveryToast(id);
    this.app.audio.play("discovery");
    this.app.save(false);
  }
  toggleObserve() {
    this.observing = !this.observing;
    this.app.refreshHud();
  }
  toggleScan() {
    if (!this.app.state.abilities.includes("scanner"))
      return this.app.toast(this.app.t("locked"));
    this.scanning = !this.scanning;
    this.app.refreshHud();
  }
  jump() {
    if (this.app.mode !== "play" || this.time.now < (this.dashReady || 0))
      return;
    this.dashReady = this.time.now + 950;
    this.dashUntil = this.time.now + 450;
    this.app.audio.play("water");
  }
  perspective() {
    this.app.toast(
      this.app.l(
        T(
          "Два взгляда доступны на берегу озера",
          "Екі көзқарас көл жағасында қолжетімді",
          "The two perspectives are available on the shore",
        ),
      ),
    );
  }
  isNight() {
    return false;
  }
  reset() {
    this.player.body.reset(this.state.x, this.state.y);
  }
  burst(x, y) {
    for (let i = 0; i < 10; i++) {
      const o = this.add.circle(x, y, 2, 0xb2e6ca).setDepth(1700);
      gsap.to(o, {
        x: x + (Math.random() - 0.5) * 60,
        y: y - 100 - Math.random() * 60,
        alpha: 0,
        duration: 2,
        onComplete: () => o.destroy(),
      });
    }
  }
}
