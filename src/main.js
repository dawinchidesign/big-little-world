import Phaser from "phaser";
import i18next from "i18next";
import { gsap } from "gsap";
import { WorldScene } from "./scene.js";
import { visualPortrait } from "./visuals.js";
import { UnderwaterScene, UW, uwSpecies } from "./underwater.js";
import {ExpeditionScene} from "./expedition.js";
import {EXPEDITIONS,HORIZON_UI,siteById,has} from "./expedition-data.js";
import {expeditionCards,expeditionJournal,expeditionResources} from "./expedition-ui.js";
import { ColonyScene } from "./colony.js";
import { COLONY_UI, CHAMBERS, COLONY_ENTRANCE } from "./colony-data.js";
import { BIOMES, SPECIES, UI, GROUPS, L, T, speciesById } from "./content.js";
import { QUESTS, SECRETS } from "./quests.js";
import { VIEWS, VIEW_UI } from "./perspectives.js";
import { TRAILS, TRAIL_UI } from "./traversal.js";
import { STATIONS, TRAVEL_UI } from "./travel.js";
import { WindLayer } from "./wind.js";
import { CINEMATICS } from "./cinematics.js";
import { shotPlan, shotSeconds, EXIT_SECONDS } from "./direction.js";
import { CROSS_UI, routeTitle, routeEnding, delivered, ROOT_PATH, BRIDGE_PATH } from './crossing-data.js';
import {
  initialState,
  activeStage,
  markObjective,
  applyEffects,
  migrateSave,
  BW,
  BH,
  WW,
  WH,
  biomeAt,
} from "./model.js";
import { writeSave, readSave } from "./storage.js";
import { Soundscape } from "./sound.js";
import {SpeechPlayer} from "./speech-player.js";
import {VOICE_UI,replayButton} from "./speech-ui.js";
import voiceCatalog from "../public/voice/index.json";
import { VERSION, RELEASE_UI } from "./release.js";
import "./style.css";
const $ = (s) => document.querySelector(s),
  esc = (s) =>
    String(s ?? "").replace(
      /[&<>"']/g,
      (c) =>
        ({
          "&": "&amp;",
          "<": "&lt;",
          ">": "&gt;",
          '"': "&quot;",
          "'": "&#39;",
        })[c],
    );
const ICON = {
  voice:'<path d="M3 9v6h4l5 4V5L7 9zM16 8c3 2 3 6 0 8M19 5c5 4 5 10 0 14"/>',
  journal:
    '<path d="M3 3h6c2 0 3 1 3 3v15c0-2-1-3-3-3H3zM21 3h-6c-2 0-3 1-3 3v15c0-2 1-3 3-3h6z"/>',
  map: '<path d="m3 6 6-3 6 3 6-3v15l-6 3-6-3-6 3zM9 3v15M15 6v15"/>',
  settings: '<path d="M4 6h16M4 12h16M4 18h16M8 3v6M16 9v6M11 15v6"/>',
  pause: '<path d="M8 4v16M16 4v16"/>',
  eye: '<path d="M2 12s4-7 10-7 10 7 10 7-4 7-10 7S2 12 2 12Z"/><circle cx="12" cy="12" r="3"/>',
  scan: '<path d="M3 8V3h5M16 3h5v5M21 16v5h-5M8 21H3v-5M7 12h10M12 7v10"/>',
  view: '<circle cx="8" cy="12" r="5"/><circle cx="17" cy="12" r="3"/>',
};
const icon = (k) =>
  '<svg viewBox="0 0 24 24" aria-hidden="true">' + ICON[k] + "</svg>";
class App {
  constructor() {
    this.state = initialState();
    this.lang = "ru";
    this.mode = "menu";
    this.audio = new Soundscape();
    this.voice = new SpeechPlayer(this,voiceCatalog);
    this.wind = new WindLayer(this);
    this.joy = { x: 0, y: 0 };
    this.modalOpen = false;
    this.assetErrors = new Set();
    this.ready = new Promise((resolve, reject) => {
      this.readyResolve = resolve;
      this.readyReject = reject;
    });
    this.menuEl = $("#menu");
    this.readyForSave = false;
    this.init().catch((error) => this.bootFailure(error));
  }
  t(k) {
    return i18next.t(k);
  }
  l(a) {
    return L(a, this.lang);
  }
  bootFailure(error) {
    console.error("World startup failed", error);
    clearTimeout(this.bootTimer);
    this.mode = "error";
    this.game?.destroy(true);
    this.menuEl.hidden = false;
    this.menuEl.innerHTML = `<div class="menu-content"><span class="eyebrow">THE GREAT LITTLE WORLD</span><h1>${esc(this.l(UI.title)).replace("\n", "<br>")}</h1><p class="menu-sub">${esc(this.l(RELEASE_UI.bootFail))}</p><button class="primary" id="retry">${esc(this.l(RELEASE_UI.retry))}</button></div>`;
    $("#retry").onclick = () => location.reload();
  }
  resetInput(play = false) {
    if(play)this.voice?.resume();else this.voice?.pause();
    if (!play) $("#rotate")?.setAttribute("hidden", "");
    this.stopTouch?.();
    this.joy = { x: 0, y: 0 };
    for (const scene of new Set([this.worldScene, this.scene])) {
      if (!scene) continue;
      Object.values(scene.keys || {}).forEach((key) => key.reset());
      scene.player?.setVelocity(0);
    }
    const keyboard = this.game?.input?.keyboard;
    if (keyboard) keyboard.preventDefault = play;
  }
  async init() {
    this.menuEl.innerHTML =
      '<div class="menu-content"><span class="eyebrow">THE GREAT LITTLE WORLD</span><h1>Большой<br><span>маленький мир</span></h1><p class="menu-sub">Подготовка мира…</p></div>';
    try {
      const s = await readSave();
      if (s) {
        this.state = s;
        this.hasSave = true;
      }
    } catch (e) {
      this.storageError = true;
    }
    if (!this.hasSave && matchMedia("(prefers-reduced-motion:reduce)").matches)
      this.state.settings.low = true;
    this.lang = this.state.settings.lang;
    const resources = Object.fromEntries(
      ["ru", "kk", "en"].map((lang, i) => [
        lang,
        {
          translation: Object.fromEntries(
            Object.entries(UI).map(([k, a]) => [k, a[i]]),
          ),
        },
      ]),
    );
    await i18next.init({
      lng: this.lang,
      fallbackLng: "ru",
      resources,
      interpolation: { escapeValue: false },
    });
    document.documentElement.lang = this.lang;
    document.title = this.t("title").replace("\n", " ");
    this.audio.set(this.state.settings);
    this.bootTimer = setTimeout(
      () => this.readyReject(Error("World loading timed out")),
      20000,
    );
    this.game = new Phaser.Game({
      type: Phaser.AUTO,
      parent: "game",
      width: 960,
      height: 540,
      backgroundColor: "#193e35",
      loader: { imageLoadType: "HTMLImageElement" },
      pixelArt: true,
      roundPixels: true,
      antialias: false,
      powerPreference: "low-power",
      banner: false,
      fps: { target: 60, forceSetTimeOut: false },
      scale: { mode: Phaser.Scale.FIT, autoCenter: Phaser.Scale.CENTER_BOTH },
      physics: {
        default: "arcade",
        arcade: { gravity: { y: 0 }, debug: false },
      },
      scene: [
        new WorldScene(this),
        new UnderwaterScene(this),
        new ColonyScene(this),
        new ExpeditionScene(this),
      ],
      render: { pixelArt: true, antialias: false },
    });
    await this.ready;
    clearTimeout(this.bootTimer);
    this.readyForSave = true;
    this.worldScene = this.scene;
    this.scene.reset(this.state);
    this.menu();
    this.initTouch();
    document.addEventListener("keydown",event=>{
      if(event.ctrlKey||event.metaKey||event.altKey||event.key.toLowerCase()!=="r"||!["dialog","cinematic","perspective"].includes(this.mode)||event.target?.matches?.("input,textarea"))return;
      event.preventDefault();if(this.mode==="cinematic")this.speakCinematic();else this.voice.replay();
    });
    window.addEventListener("blur", () => {
      this.resetInput(false);
      if(this.mode === "cinematic")clearTimeout(this.cineTimer);
      if (this.mode === "play") this.pause();
    });
    window.addEventListener("focus",()=>{
      if(document.hidden)return;
      this.voice.resume();
      if(this.mode === "cinematic"&&this.cineData){
        if(this.cineLeaving)this.nextShot();
        else this.scheduleShot((this.voice.current?this.voice.remaining+.9:this.cineData.duration)*1000);
      }
    });
    document.addEventListener("keydown", (event) => {
      if (event.key !== "Tab" || this.mode === "play") return;
      const root =
        this.mode === "dialog"
          ? $("#dialog")
          : this.mode === "cinematic"
            ? $("#cinema")
            : this.mode === "perspective"
              ? $("#perspective")
              : this.mode === "menu"
                ? this.menuEl
                : $("#overlay");
      const nodes = [
        ...root.querySelectorAll('button,input,a[href],[tabindex="0"]'),
      ].filter((n) => !n.disabled && !n.hidden);
      if (!nodes.length) return;
      const first = nodes[0],
        last = nodes.at(-1),
        active = document.activeElement;
      if (event.shiftKey && (active === first || !root.contains(active))) {
        event.preventDefault();
        last.focus();
      } else if (
        !event.shiftKey &&
        (active === last || !root.contains(active))
      ) {
        event.preventDefault();
        first.focus();
      }
    });
    document.addEventListener("visibilitychange", () => {
      if (document.hidden) {
        this.resetInput(false);
        if (this.mode === "cinematic") clearTimeout(this.cineTimer);
        this.voice.pause();
        this.audio.mute(true);
        if (this.state.started) this.save(false);
        if (
          this.mode === "play" &&
          !this.scene.cinematic &&
          !this.scene.humanView
        )
          this.pause();
      } else {
        this.audio.mute(false);
        this.voice.resume();
        if (this.mode === "cinematic" && this.cineData) {
          if (this.cineLeaving) this.nextShot();
          else this.scheduleShot((this.voice.current?this.voice.remaining+.9:this.cineData.duration)*1000);
        }
      }
    });
    window.addEventListener("pagehide", () => {
      if (this.state.started) this.save(false);
    });
    if ("serviceWorker" in navigator && location.protocol !== "file:")
      navigator.serviceWorker.register("./sw.js").catch(() => {});
  }
  languageButtons() {
    return (
      '<div class="languages">' +
      [
        ["kk", "ҚАЗ"],
        ["ru", "РУС"],
        ["en", "ENG"],
      ]
        .map(
          ([l, n]) =>
            `<button data-lang="${l}" class="${l === this.lang ? "selected" : ""}" lang="${l}" aria-label="${n}">${n}</button>`,
        )
        .join("") +
      "</div>"
    );
  }
  bindLang(root = document) {
    root
      .querySelectorAll("[data-lang]")
      .forEach((b) => (b.onclick = () => this.changeLanguage(b.dataset.lang)));
  }
  changeLanguage(lang) {
    this.voice.stop();
    this.lang = lang;
    this.state.settings.lang = lang;
    i18next.changeLanguage(lang);
    document.documentElement.lang = lang;
    document.title = this.t("title").replace("\n", " ");
    this.refreshHud();
    if (this.mode === "menu") this.menu();
    else if (this.mode === "settings") this.settings(this.backMode);
    else if (this.mode === "journal")
      this.openJournal(this.journalTab || "species", true);
    else if (this.mode === "map") this.openMap(true);
    else if (this.mode === "travel-menu") this.openTravel(this.travelFrom, true);
    else if (this.mode === "pause") this.pause(true);
    else if (this.mode === "dialog") {
      if (this.dialogData?.choice) this.renderChoice();
      else this.renderDialog();
    } else if (this.mode === "cinematic" && !this.cineLeaving) this.renderCinematic();
    else if (this.mode === "perspective")
      this.showPerspective(this.currentView, this.currentViewHuman);
    else if (this.mode === "end") this.endingScreen();
    if (this.state.started) this.save(false);
  }
  menu() {
    this.voice.stop();
    this.resetInput(false);
    this.mode = "menu";
    this.toastQueue = [];
    $("#toast").replaceChildren();
    this.modalOpen = false;
    this.menuEl.hidden = false;
    $("#overlay").hidden = true;
    $("#hud").hidden = true;
    $("#touch").hidden = true;
    const resume = this.hasSave && this.state.started,
      chapter = Math.min(this.state.quest + 1, 9),
      letters = (s) =>
        [...s].map((c) => `<span class="ch">${c === " " ? "&nbsp;" : esc(c)}</span>`).join(""),
      [line1, line2 = ""] = this.t("title").split("\n");
    let n = 0;
    const item = (id, label) =>
      `<button class="menu-item" id="${id}"><span class="mi-n">${String(++n).padStart(2, "0")}</span><span class="mi-label">${esc(label)}</span><span class="mi-arrow" aria-hidden="true">→</span></button>`;
    const primary = resume
      ? `<button class="menu-primary" id="continue"><span class="mp-label">${esc(this.t("continue"))}</span><span class="mp-meta">${esc(this.t("chapter"))} ${chapter} / 9 · ${esc(this.l(BIOMES[chapter - 1].name))}</span><span class="mp-arrow" aria-hidden="true">→</span><i class="mp-bar" style="--p:${(chapter - 1) / 9}"></i></button>`
      : `<button class="menu-primary" id="new"><span class="mp-label">${esc(this.t("new"))}</span><span class="mp-meta">${esc(this.l(T("Пролог · Один обычный день", "Пролог · Бір кәдімгі күн", "Prologue · One ordinary day")))}</span><span class="mp-arrow" aria-hidden="true">→</span></button>`;
    this.menuEl.innerHTML = `<div class="menu-bg" aria-hidden="true"><div class="menu-art"></div><div class="menu-rays"></div><canvas class="menu-motes"></canvas><div class="menu-shade"></div></div><div class="menu-top">${this.languageButtons()}</div><div class="menu-content"><div class="eyebrow"><span class="pixel-leaf"></span>${esc(this.t("tag"))}</div><h1 class="menu-title" aria-label="${esc(this.t("title").replace("\n", " "))}"><span class="t1" aria-hidden="true">${letters(line1)}</span><span class="t2" aria-hidden="true">${letters(line2)}</span></h1><p class="menu-sub">${esc(this.l(T("Уменьшитесь до размера муравья. Откройте мир, который всегда был рядом.", "Құмырсқадай кішірейіңіз. Үнемі жаныңызда болған әлемді ашыңыз.", "Become as small as an ant. Discover a world that was beside you all along.")))}</p><nav class="menu-actions">${primary}${resume ? item("new", this.t("new")) : ""}${item("expeditions-open",this.l(HORIZON_UI.notes))}${item("journal-open", this.t("journal"))}${item("settings-open", this.t("settings"))}</nav></div><div class="menu-foot"><span>THE GREAT LITTLE WORLD · ҮЛКЕН КІШКЕНТАЙ ӘЛЕМ</span><span>${VERSION} · ${this.l(T("СЮЖЕТНОЕ ПРИКЛЮЧЕНИЕ", "ОҚИҒАЛЫ САЯХАТ", "A STORY ADVENTURE"))}</span></div>`;
    this.bindLang(this.menuEl);
    this.animateMenu();
    $(".menu-foot span:last-child").textContent =
      `${VERSION} · ${this.l(T("СЮЖЕТНОЕ ПРИКЛЮЧЕНИЕ", "ОҚИҒАЛЫ САЯХАТ", "A STORY ADVENTURE"))}`;
    $("#new").onclick = () => this.newGame();
    $("#continue")?.addEventListener("click", () => this.continueGame());
    $("#expeditions-open").onclick=()=>this.openJournal("expeditions");
    $("#journal-open").onclick = () => this.openJournal();
    $("#settings-open").onclick = () => this.settings();
  }
  // The menu is a living frame: the key art drifts like a slow camera, the
  // pointer adds parallax between art, light and text, pollen hangs in the
  // backlight, and the first arrival assembles the title letter by letter.
  animateMenu() {
    const root = this.menuEl,
      low = this.state.settings.low || matchMedia("(prefers-reduced-motion:reduce)").matches;
    root.classList.toggle("menu-still", !!low);
    root.classList.remove("menu-arrive");
    const first = !this.menuArrived;
    this.menuArrived = true;
    if (!low) {
      const q = (s) => root.querySelectorAll(s);
      if (first) {
        // The art's transform belongs to the pointer parallax; the arrival
        // is a focus pull out of darkness instead.
        gsap.from(root.querySelector(".menu-art"), { opacity: 0, filter: "blur(12px) brightness(.5)", duration: 2.6, ease: "expo.out" });
        gsap.from(q(".menu-rays"), { opacity: 0, duration: 3, delay: 0.6 });
        gsap.from(q(".eyebrow"), { opacity: 0, x: -20, letterSpacing: "0.6em", duration: 1.4, ease: "expo.out", delay: 0.3 });
        gsap.from(q(".menu-title .ch"), {
          opacity: 0,
          yPercent: 70,
          rotateX: -70,
          filter: "blur(10px)",
          duration: 1.2,
          stagger: 0.04,
          ease: "power4.out",
          delay: 0.45,
        });
        gsap.from(q(".menu-sub"), { opacity: 0, y: 14, duration: 1.1, ease: "power3.out", delay: 1.3 });
        // CSS, not GSAP: the buttons own their transform for hover states.
        q(".menu-actions > *").forEach((b, i) => b.style.setProperty("--i", i));
        root.classList.add("menu-arrive");
        gsap.from(q(".menu-top, .menu-foot"), { opacity: 0, duration: 1.4, delay: 1.8 });
      } else gsap.from(q(".menu-content"), { opacity: 0, duration: 0.4 });
      root.onpointermove = (e) => {
        root.style.setProperty("--mx", (e.clientX / innerWidth - 0.5).toFixed(3));
        root.style.setProperty("--my", (e.clientY / innerHeight - 0.5).toFixed(3));
      };
    } else root.onpointermove = null;
    this.menuMotes(low);
  }
  menuMotes(low) {
    cancelAnimationFrame(this.motesFrame);
    const c = this.menuEl.querySelector(".menu-motes");
    if (!c || low || typeof requestAnimationFrame !== "function") return;
    let g = null;
    try {
      g = c.getContext("2d");
    } catch {}
    if (!g) return;
    // Sun sits near 76% / 18% of the key art: motes glow as they cross it.
    const sun = { x: 0.76, y: 0.2 };
    const motes = Array.from({ length: 70 }, (_, i) => ({
      x: Math.random(),
      y: Math.random(),
      r: 0.6 + Math.random() * 1.8,
      z: 0.3 + Math.random() * 0.7,
      s: Math.random() * 6.28,
      k: i % 9 === 0,
    }));
    let last = performance.now();
    const tick = (now) => {
      if (this.mode !== "menu" || this.menuEl.hidden || !c.isConnected) return;
      const dt = Math.min(0.05, (now - last) / 1000);
      last = now;
      const w = Math.round(c.clientWidth * Math.min(2, devicePixelRatio)),
        h = Math.round(c.clientHeight * Math.min(2, devicePixelRatio));
      if (c.width !== w || c.height !== h) {
        c.width = w;
        c.height = h;
      }
      g.clearRect(0, 0, w, h);
      g.globalCompositeOperation = "lighter";
      for (const m of motes) {
        m.s += dt * (0.4 + m.z);
        m.x += (Math.sin(m.s * 0.7) * 0.004 + 0.003) * m.z * dt * 6;
        m.y += (Math.cos(m.s) * 0.003 - 0.004) * m.z * dt * 6;
        if (m.x > 1.05) m.x = -0.05;
        if (m.y < -0.05) m.y = 1.05;
        const near = Math.max(0, 1 - Math.hypot(m.x - sun.x, (m.y - sun.y) * 0.6) * 2.4);
        const a = (0.12 + near * 0.7) * (0.6 + 0.4 * Math.sin(m.s * 2.3)) * m.z;
        const x = m.x * w, y = m.y * h, r = m.r * m.z * (1 + near) * Math.min(2, devicePixelRatio);
        const grad = g.createRadialGradient(x, y, 0, x, y, r * 3);
        grad.addColorStop(0, `rgba(255,236,170,${a})`);
        grad.addColorStop(1, "rgba(255,200,110,0)");
        g.fillStyle = grad;
        g.fillRect(x - r * 3, y - r * 3, r * 6, r * 6);
        if (m.k && near > 0.2) {
          // A few motes catch the sun as a tiny four-point glint.
          g.fillStyle = `rgba(255,248,215,${a * 0.8})`;
          g.fillRect(x - r * 4, y - 0.5, r * 8, 1);
          g.fillRect(x - 0.5, y - r * 4, 1, r * 8);
        }
      }
      this.motesFrame = requestAnimationFrame(tick);
    };
    this.motesFrame = requestAnimationFrame(tick);
  }
  async newGame() {
    if (this.hasSave && this.state.started) {
      return this.dialog(
        T("Новое путешествие", "Жаңа саяхат", "New journey"),
        UI.restart,
        () => this.startFresh(),
        [{ label: UI.cancel, action: () => this.menu() }],
        UI.yes,
      );
    }
    this.startFresh();
  }
  async startFresh() {
    if (this.starting) return;
    this.starting = true;
    this.resetInput(false);
    if (this.scene !== this.worldScene) this.exitInterior(false);
    const settings = { ...this.state.settings };
    this.state = initialState();
    this.state.settings = settings;
    this.state.started = true;
    this.hasSave = true;
    this.audio.unlock();
    this.menuEl.hidden = true;
    this.scene.reset(this.state);
    // Stay in a non-play mode until the prologue owns the screen: the save is
    // asynchronous and world triggers (e.g. the first perspective point next to
    // the start) must not fire underneath the opening cinematic.
    this.mode = "transition";
    this.refreshHud();
    await this.save(false);
    this.playCinematic("prologue", () => {
      this.questOpening();
      this.toast(this.t("help"));
      this.toast(this.l(TRAIL_UI.hint));
    });
    this.starting = false;
  }
  continueGame() {
    this.resetInput(true);
    this.audio.unlock();
    this.menuEl.hidden = true;
    if(this.state.horizon.active){
      const id=this.state.horizon.active;
      this.mode="play";
      this.enterExpedition(id,true);
      return;
    }
    if (
      ((this.scene.isUnderwater && this.state.underwater.active) ||
        (this.scene.isCitadel && this.state.colony.active)) &&
      !this.state.ended
    ) {
      this.mode = "play";
      this.scene.state = this.scene.isCitadel
        ? this.state.colony
        : this.state.underwater;
      this.scene.reset();
      this.refreshHud();
      this.audio.enter(this.scene.lastBiome, false, this.state.eco);
      return;
    }
    if (this.scene !== this.worldScene) {
      if (this.scene.scene.isActive())
        this.game.scene.sleep(this.scene.sys.settings.key);
      this.scene = this.worldScene;
      this.game.scene.wake("World");
    }
    this.scene.reset(this.state);
    this.mode = "play";
    this.refreshHud();
    this.audio.enter(
      this.scene.lastBiome,
      this.scene.isNight(),
      this.state.eco,
    );
    if (this.state.ended) this.endingScreen();
    else if (this.state.underwater.active) this.enterUnderwater();
    else if (this.state.colony.active) this.enterColony();
  }
  refreshHud() {
    if (!this.scene) return;
    this.flushToasts();
    const play = ["play", "dialog", "perspective", "cinematic"].includes(
      this.mode,
    );
    $("#hud").hidden =
      !play || this.mode === "cinematic" || this.mode === "perspective";
    $("#touch").hidden =
      this.mode !== "play" || !matchMedia("(pointer:coarse)").matches;
    const localCrossing=this.scene===this.worldScene&&this.scene.crossing?.inRange&&this.state.crossing.route&&!this.state.crossing.done;
    const b = biomeAt(this.state.x, this.state.y),
      q = this.scene.isExpedition?{title:this.scene.site.sub}:localCrossing?{title:CROSS_UI.title}:this.scene.isUnderwater
        ? { title: UW.quest }
        : QUESTS[this.state.quest],
      st =
        this.scene.isExpedition?this.scene.currentStage():localCrossing?this.scene.crossing.stage():this.scene.isUnderwater || this.scene.isCitadel
          ? this.scene.currentStage()
          : this.state.quest === 1
            ? { title: COLONY_UI.enter, points: [] }
            : activeStage(this.state);
    $("#hud").innerHTML =
      `<div class="hud-top"><div class="location"><small>${this.scene.isExpedition?this.l(HORIZON_UI.notes)+" "+this.scene.site.number+" / 4":this.t("chapter")+" "+Math.min(this.state.quest + 1, 9)+" / 9"}</small><strong>${esc(this.l(this.scene.isExpedition?this.scene.site.title:this.scene.isUnderwater ? UW.title : this.scene.isCitadel ? COLONY_UI.title : b.name))}</strong><small id="live-weather"></small></div><div class="hud-buttons">${this.languageButtons()}<button class="icon-button" id="observe" title="${this.t("observe")} · Q" aria-label="${this.t("observe")}">${icon("eye")}</button><button class="icon-button" id="scan" title="${this.t("scanner")} · C" aria-label="${this.t("scanner")}">${icon("scan")}</button><button class="icon-button" id="view" title="${this.l(VIEW_UI.title)} · V" aria-label="${this.l(VIEW_UI.title)}">${icon("view")}</button><button class="icon-button" id="map-open" title="${this.t("map")} · M" aria-label="${this.t("map")}">${icon("map")}</button><button class="icon-button" id="diary-open" title="${this.t("journal")} · J" aria-label="${this.t("journal")}">${icon("journal")}</button><button class="icon-button" id="voice-toggle" data-voice-toggle title="${this.l(VOICE_UI.toggle)}" aria-label="${this.l(VOICE_UI.toggle)}">${icon("voice")}</button><button class="icon-button" id="pause-open" title="${this.t("paused")}" aria-label="${this.t("paused")}">${icon("pause")}</button></div></div><div class="hud-bottom"><div class="quest-box"><div class="eyebrow">${this.t("quest")}</div><div class="quest-title">${esc(this.l(q?.title || UI.title)).replace("\n", " ")}</div><div class="quest-objective">${esc(st ? this.l(st.title) : this.t("after"))}</div>${st ? '<div class="progress-dots">' + st.points.map((_, i) => `<i class="${(this.scene.isExpedition?this.scene.progress():this.scene.isUnderwater ? this.state.underwater.progress : this.state.progress).includes(i) ? "done" : ""}"></i>`).join("") + "</div>" : ""}${
        this.scene.scanning
          ? '<div class="eco-inline">' +
            Object.entries(this.state.eco)
              .map(([k, v]) => `<span>${esc(this.t(k))} ${v}%</span>`)
              .join("") +
            "</div>"
          : ""
      }${expeditionResources(this)}</div><div class="ability-row">${this.state.abilities.map((k) => `<span class="ability">${this.t(k)}</span>`).join("")}</div><div class="hud-hint">${esc(this.l(T("WASD — идти · E — действие · Пробел — прыжок", "WASD — жүру · E — әрекет · Бос орын — секіру", "WASD — move · E — interact · Space — jump")))}</div></div><div class="mini-wrap"><canvas id="mini" width="192" height="132"></canvas><div class="mini-caption">M · ${this.t("map")} <span id="time"></span></div></div><button id="prompt" class="prompt" hidden></button><div class="status" id="status" ${this.scene.observing || this.scene.scanning ? "" : "hidden"}>${this.scene.observing ? this.t("observeOn") : this.scene.scanning ? this.t("scanOn") : ""}</div>${this.scene.scanning ? '<div class="scan-grid"></div>' : ""}`;
    this.bindLang($("#hud"));
    $("#observe").onclick = () => this.scene.toggleObserve();
    $("#scan").onclick = () => this.scene.toggleScan();
    $("#view").onclick = () => this.scene.perspective();
    $("#map-open").onclick = () => this.openMap();
    $("#diary-open").onclick = () => this.openJournal();
    $("#pause-open").onclick = () => this.pause();
    $("#voice-toggle").onclick=()=>this.voice.toggle();
    this.voice.refreshButtons();
    $("#prompt").onclick = () => this.scene.interact();
    $("#touch-q").setAttribute("aria-label", this.t("observe"));
    $("#touch-jump").setAttribute("aria-label", this.t("jump"));
    $("#touch-e").setAttribute("aria-label", this.t("interact"));
    $("#stick").setAttribute("aria-label", this.t("controls"));
    $("#rotate").textContent = this.l(RELEASE_UI.rotate);
    $("#rotate").hidden = this.mode !== "play";
    $("#mini").onclick = () => this.openMap();
    this.updateLiveHud();
    this.scene.refreshLabels?.();
  }
  updateLiveHud() {
    if (!this.scene) return;
    const b = biomeAt(this.state.x, this.state.y);
    const e = $("#live-weather");
    if (e)
      e.textContent = this.scene.isExpedition
        ? this.l(this.scene.site.sub)
        : this.scene.isCitadel
        ? this.l(COLONY_UI.map)
        : `${b.temp}°C · ${this.t("humidity")} ${b.humidity}%`;
    const h = String(Math.floor(this.state.time)).padStart(2, "0"),
      m = String(Math.floor((this.state.time % 1) * 60)).padStart(2, "0");
    if ($("#time")) $("#time").textContent = ` · ${h}:${m}`;
    this.drawMap($("#mini"), false);
  }
  updatePrompt(near) {
    const e = $("#prompt");
    if (!e) return;
    e.hidden = !near;
    if (!near) return;
    const text =
      near.crossingAction||near.objectAction?this.l(near.stage.title):near.kind === "npc"
        ? this.l(speciesById[near.data.species].name)
        : near.kind === "secret"
          ? this.l(near.data.title)
          : this.l(near.stage.title);
    e.innerHTML = '<span class="key">E</span>' + esc(text);
  }
  setStatus(s) {
    if ($("#status") && this.mode === "play") {
      $("#status").textContent = s;
      $("#status").hidden = false;
    }
  }
  // Hints and discoveries wait while a cinematic, the two-views sequence or a
  // scene transition owns the screen, and at most three cards stay stacked.
  holdToast(show) {
    if (["cinematic", "perspective", "transition", "travel"].includes(this.mode)) {
      (this.toastQueue ||= []).push(show);
      return true;
    }
    return false;
  }
  flushToasts() {
    if (this.mode !== "play" || !this.toastQueue?.length) return;
    const queue = this.toastQueue.splice(0);
    queue.forEach((show, i) => setTimeout(() => show(), 350 + i * 450));
  }
  stackToast(e) {
    const box = $("#toast");
    box.append(e);
    while (box.children.length > 3) box.firstElementChild.remove();
  }
  toast(text, urgent = false) {
    // Save failures are shown immediately, even over a cinematic.
    if (urgent) $("#toast").hidden = false;
    else if (this.holdToast(() => this.toast(text))) return;
    const e = document.createElement("div");
    e.className = "toast-card";
    e.textContent = text;
    this.stackToast(e);
    setTimeout(() => {
      gsap.to(e, { opacity: 0, duration: 0.5, onComplete: () => e.remove() });
    }, 4500);
  }
  portrait(id) {
    return visualPortrait(this.scene, id + "0");
  }
  discoveryToast(id) {
    if (this.holdToast(() => this.discoveryToast(id))) return;
    const s = speciesById[id],
      e = document.createElement("div");
    e.className = "toast-card";
    e.innerHTML = `<img src="${this.portrait(id)}" alt=""><span class="eyebrow">${this.t("discover")}</span><strong>${esc(this.l(s.name))}</strong><button>${this.t("read")} →</button>`;
    e.querySelector("button").onclick = () => {
      e.remove();
      this.speciesDialog(id);
    };
    this.stackToast(e);
    setTimeout(() => e.remove(), 6500);
  }
  regionToast(b) {
    const e = $("#region");
    e.innerHTML = `<div class="region-title">${esc(this.l(b.name))}</div><div class="region-sub">${esc(this.l(b.sub))}</div>`;
    gsap.fromTo(e, { opacity: 0 }, { opacity: 1, duration: 1 });
    setTimeout(() => gsap.to(e, { opacity: 0, duration: 1 }), 3200);
  }
  openTravel(from, refresh = false) {
    if (this.mode !== "play" && !(refresh && this.mode === "travel-menu")) return;
    this.travelFrom = from;
    if (activeStage(this.state)?.action === "escort")
      return this.toast(this.l(TRAVEL_UI.escort));
    const awake = this.state.travel.stations;
    const cells = BIOMES.map((b) => {
      const seen = this.state.visited.includes(b.id),
        open = awake.includes(b.id),
        here = b.id === from;
      const label = !seen ? "?" : esc(this.l(b.name));
      const sub = here
        ? this.l(TRAVEL_UI.here)
        : open
          ? this.l(b.sub)
          : seen
            ? this.l(TRAVEL_UI.asleep)
            : this.l(TRAVEL_UI.unknown);
      return `<button class="travel-cell ${here ? "here" : open ? "open" : "closed"}" data-fly="${b.id}" ${!open || here ? "disabled" : ""} style="--ground:${b.color};--light:${b.light}"><span class="travel-seed" aria-hidden="true"></span><strong>${label}</strong><small>${esc(sub)}</small></button>`;
    }).join("");
    this.panel(
      this.l(TRAVEL_UI.fly),
      `<p class="travel-lead">${esc(this.l(TRAVEL_UI.choose))}</p><div class="travel-grid">${cells}</div><p class="note">${esc(this.l(TRAVEL_UI.hint))} · ${awake.length} / ${STATIONS.length}</p>`,
    );
    this.mode = "travel-menu";
    document.querySelectorAll("[data-fly]").forEach(
      (e) =>
        (e.onclick = () => {
          const id = +e.dataset.fly;
          $("#overlay").hidden = true;
          this.modalOpen = false;
          this.mode = "play";
          this.scene.flyTo(id);
        }),
    );
    $("#overlay .travel-cell.open")?.focus();
  }
  panel(title, body, small = false) {
    this.resetInput(false);
    if (!this.modalOpen) this.backMode = this.mode;
    this.modalOpen = true;
    $("#overlay").hidden = false;
    $("#overlay").innerHTML =
      `<section class="panel ${small ? "small" : ""}" role="dialog" aria-modal="true" aria-label="${esc(title)}"><header class="panel-header"><h2>${esc(title)}</h2><button class="close" id="close">${this.t("close")} ×</button></header>${body}</section>`;
    $("#close").onclick = () => this.closePanel();
    $("#close").focus();
    $("#touch").hidden = true;
    this.scene?.player.setVelocity(0);
  }
  closePanel() {
    if (this.mode === "dialog") return;
    $("#overlay").hidden = true;
    this.modalOpen = false;
    this.mode = this.backMode === "menu" ? "menu" : "play";
    this.resetInput(this.mode === "play");
    if (this.mode === "menu") this.menu();
    else this.refreshHud();
  }
  pause(refresh = false) {
    if (!refresh && this.mode !== "play") return;
    if (!refresh) this.backMode = "play";
    this.panel(
      this.t("paused"),
      `<div class="pause-actions"><button class="primary" id="resume">${this.t("return")}</button><button class="close" id="manual-save">${this.t("save")}</button><button class="close" id="pause-settings">${this.t("settings")}</button><button class="close" id="rest">${this.l(T("Отдохнуть до утра", "Таңға дейін демалу", "Rest until morning"))}</button><button class="close" id="to-menu">${this.t("menu")}</button></div>`,
      true,
    );
    this.mode = "pause";
    $("#resume").onclick = () => this.closePanel();
    $("#manual-save").onclick = () => this.save();
    $("#pause-settings").onclick = () => this.settings("play");
    $("#rest").onclick = () => {
      this.state.time = 8;
      this.closePanel();
      this.audio.enter(this.scene.lastBiome ?? 3, false, this.state.eco);
    };
    $("#to-menu").onclick = async () => {
      await this.save(false);
      this.menu();
    };
  }
  escape() {
    if (this.mode === "travel") return this.scene.skipFlight?.();
    if (this.mode === "perspective") return this.scene.restorePerspective?.();
    if (this.mode === "cinematic") return;
    if (this.mode === "dialog") return;
    if (this.modalOpen) return this.closePanel();
    if (this.mode === "play") this.pause();
  }
  settings(back = null) {
    this.panel(
      this.t("settings"),
      `${["music", "ambience", "effects", "voice"].map((k) => `<label class="settings-row"><span>${k==="voice"?this.l(VOICE_UI.voice):this.t(k)}</span><input type="range" min="0" max="1" step="0.01" data-volume="${k}" value="${this.state.settings[k]}" aria-label="${k==="voice"?this.l(VOICE_UI.voice):this.t(k)}"></label>`).join("")}<label class="settings-row"><span>${this.l(VOICE_UI.narration)}</span><input type="checkbox" id="narration-enabled" ${this.state.settings.narration?"checked":""}></label><div class="settings-row"><span>${this.t("language")}</span>${this.languageButtons()}</div><label class="settings-row"><span>${this.t("low")}</span><input type="checkbox" id="low" ${this.state.settings.low ? "checked" : ""}></label><h3>${this.t("controls")}</h3><p class="entry">${esc(this.t("controlText"))} · V — ${esc(this.l(VIEW_UI.title))}</p><div class="settings-buttons"><button id="full">${this.t("full")}</button><button id="export">${this.t("export")}</button><button id="import">${this.t("import")}</button><input type="file" accept="application/json,.json" id="save-file" hidden></div><p class="note">${this.t("art")}</p>`,
      true,
    );
    if (back) this.backMode = back;
    this.mode = "settings";
    this.bindLang($("#overlay"));
    document.querySelectorAll("[data-volume]").forEach(
      (e) =>
        (e.oninput = () => {
          this.state.settings[e.dataset.volume] = +e.value;
          this.audio.set(this.state.settings);
          this.voice.applySettings();
        }),
    );
    $("#narration-enabled").onchange=e=>{this.state.settings.narration=e.target.checked;this.voice.applySettings();this.save(false);};
    $("#low").onchange = (e) => (this.state.settings.low = e.target.checked);
    $("#full").onclick = () => this.fullscreen();
    $("#export").onclick = () => {
      const a = document.createElement("a");
      a.href = URL.createObjectURL(
        new Blob([JSON.stringify(this.state, null, 2)], {
          type: "application/json",
        }),
      );
      a.download = "Great_Little_World_Save.json";
      a.click();
      setTimeout(() => URL.revokeObjectURL(a.href), 1000);
    };
    $("#import").onclick = () => $("#save-file").click();
    $("#save-file").onchange = async (e) => {
      if (!e.target.files?.length) return;
      try {
        if (e.target.files[0].size > 2_000_000)
          throw Error("Save file too large");
        const s = migrateSave(JSON.parse(await e.target.files[0].text()));
        if (this.scene !== this.worldScene) {
          this.game.scene.sleep(this.scene.sys.settings.key);
          this.scene = this.worldScene;
          this.game.scene.wake("World");
        }
        this.state = s;
        this.hasSave = s.started;
        this.scene.reset(s);
        await this.save(false);
        this.modalOpen = false;
        this.changeLanguage(s.settings.lang);
        this.menu();
      } catch {
        this.toast(this.t("invalidSave"));
      }
    };
  }
  fullscreen() {
    if (document.fullscreenElement) document.exitFullscreen?.().catch(() => {});
    else document.documentElement.requestFullscreen?.().catch(() => {});
  }
  async save(show = true, slot = "main") {
    if (!this.readyForSave || !this.state.started) return false;
    try {
      await writeSave(this.state, slot);
      this.hasSave = true;
      if (show) this.toast(this.t("saved"));
      return true;
    } catch {
      if (show || !this.reportedStorage) {
        this.toast(this.t("saveFail"), true);
        this.reportedStorage = true;
      }
      return false;
    }
  }
  dialog(name, text, done = null, other = [], button = UI.next) {
    this.resetInput(false);
    this.dialogBack = this.mode;
    this.dialogData = { name, text, done, other, button };
    this.mode = "dialog";
    this.modalOpen = true;
    this.scene.player.setVelocity(0);
    this.refreshHud();
    $("#touch").hidden = true;
    this.renderDialog();
  }
  renderDialog() {
    const d = this.dialogData;
    if (!d) return;
    $("#dialog").hidden = false;
    $("#dialog").innerHTML =
      `<div class="dialog-name">${esc(this.l(d.name))}</div><div class="dialog-text">${esc(this.l(d.text))}</div><div class="dialog-actions">${replayButton(this,"dialog-replay")}${d.other.map((o, i) => `<button class="close" data-other="${i}">${esc(this.l(o.label))}</button>`).join("")}<button id="dialog-next" class="primary">${esc(this.l(d.button))}</button></div>`;
    gsap.fromTo(
      $("#dialog .dialog-text"),
      { opacity: 0 },
      { opacity: 1, duration: 0.4 },
    );
    $("#dialog-next").onclick = () => {
      this.closeDialog();
      d.done?.();
    };
    document.querySelectorAll("[data-other]").forEach(
      (b) =>
        (b.onclick = () => {
          this.closeDialog();
          d.other[+b.dataset.other].action();
        }),
    );
    $("#dialog-next").focus();
    $("#dialog-replay").onclick=()=>this.voice.replay();
    this.voice.speak(d.text,{context:"dialog"});
  }
  closeDialog() {
    this.voice.stop();
    this.mode = this.dialogBack === "menu" ? "menu" : "play";
    this.modalOpen = false;
    this.resetInput(this.mode === "play");
    $("#dialog").hidden = true;
    this.dialogData = null;
    if (this.mode === "menu") this.menu();
    else this.refreshHud();
  }
  questOpening() {
    const q = QUESTS[this.state.quest];
    if (!q) return;
    const key = "intro-" + q.id;
    if (this.state.seen.includes(key)) return;
    this.state.seen.push(key);
    this.dialog(q.intro, q.opening, () => this.save(false));
  }
  advance(index) {
    const before = activeStage(this.state);
    if (
      before &&
      !this.scene.isCitadel &&
      ["restore", "build", "shade", "clear"].includes(before.action)
    ) {
      const [x, y] = before.points[index];
      this.state.changes.push({
        x,
        y,
        action: before.action,
        sprite: before.sprite,
        quest: this.state.quest,
      });
    }
    const q = QUESTS[this.state.quest],
      st = activeStage(this.state);
    const result = markObjective(this.state, index);
    this.scene.refreshMarkers();
    this.scene.applyChanges();
    if (activeStage(this.state)?.action === "pollinate")
      this.scene.preparePollination();
    this.refreshHud();
    this.save(false);
    if (result === "quest") {
      this.audio.play("complete");
      const finish = () =>
        this.dialog(q.title, q.conclusion, () => {
          if (q.reward)
            this.toast(this.t("newAbility") + " · " + this.t(q.reward));
          this.questOpening();
        });
      if (q.id === "pesticide") this.playCinematic("migration", finish);
      else if (q.id === "garden") this.playCinematic("restoration", finish);
      else finish();
    } else if (result === "stage" && st.action === "choice")
      this.toast(this.t("notice"));
  }
  choose(st, index) {
    this.voice.stop();
    this.resetInput(false);
    const intro = QUESTS[this.state.quest].intro;
    this.dialogBack = "play";
    this.dialogData = {
      choice: true,
      name: intro,
      text: UI.choice,
      done: null,
      other: [],
      button: UI.next,
    };
    this.mode = "dialog";
    this.modalOpen = true;
    $("#dialog").hidden = false;
    $("#touch").hidden = true;
    const render = () => {
      $("#dialog").innerHTML =
        `<div class="dialog-name">${this.t("choice")}</div><div class="dialog-text">${esc(this.l(st.title))}</div><div class="choices">${st.choices.map((c, i) => `<button data-choice="${i}">${esc(this.l(c.label))}</button>`).join("")}</div>`;
      document.querySelectorAll("[data-choice]").forEach(
        (e) =>
          (e.onclick = () => {
            const c = st.choices[+e.dataset.choice];
            applyEffects(this.state, c.effect);
            this.state.choices[QUESTS[this.state.quest].id] = c.key;
            this.closeDialog();
            this.advance(index);
          }),
      );
      this.voice.speak(st.title,{context:"dialog"});
    };
    this.renderChoice = render;
    render();
    $("#dialog [data-choice]")?.focus();
  }
  speciesDialog(id) {
    if (!this.state.discovered.includes(id)) this.scene.discover(id);
    this.openJournal("species");
    this.showSpecies(id);
  }
  journalTabs(tab) {
    const tabs = {
      species: this.t("species"),
      quests: this.t("quests"),
      secrets: this.t("secrets"),
      cinema: this.t("cinema"),
      views: this.l(VIEW_UI.memory),
      trails: this.l(TRAIL_UI.title),
      colony: this.l(COLONY_UI.notes),
      expeditions:this.l(HORIZON_UI.notes),
      source: this.t("source"),
    };
    return (
      '<nav class="tabs">' +
      Object.entries(tabs)
        .map(
          ([k, v]) =>
            `<button data-tab="${k}" class="${tab === k ? "active" : ""}">${esc(v)}</button>`,
        )
        .join("") +
      "</nav>"
    );
  }
  openJournal(tab = "species", refresh = false) {
    if (
      ["cinematic", "perspective", "dialog", "end", "travel"].includes(this.mode) &&
      !refresh
    )
      return;
    this.journalTab = tab;
    let body = this.journalTabs(tab);
    if (tab === "species") {
      body +=
        `<div class="eyebrow">${this.state.discovered.length} / ${SPECIES.length}</div><div class="journal-grid">` +
        SPECIES.map((s) =>
          this.state.discovered.includes(s.id)
            ? `<button class="species-card" data-species="${s.id}"><img src="${this.portrait(s.id)}" alt=""><strong>${esc(this.l(s.name))}</strong><small>${esc(this.l(GROUPS[s.group]))}</small></button>`
            : `<div class="species-card locked" title="${this.t("unseen")}">?</div>`,
        ).join("") +
        "</div>";
      if (!this.state.discovered.length)
        body += '<p class="note">' + this.t("empty") + "</p>";
    } else if (tab === "quests") {
      if(this.state.crossing.visited){
        const s=this.state.crossing;
        body+=`<article class="record"><strong>${esc(this.l(CROSS_UI.title))}</strong><span>${s.route?esc(this.l(routeTitle(s.route))):esc(this.l(CROSS_UI.choose))} · ${delivered(s)}/6</span><p>${esc(this.l(s.done?routeEnding(s.route):CROSS_UI.intro))}</p><small>${esc(this.l(CROSS_UI.artistic))}</small></article>`;
      }
      body += QUESTS.filter((q, i) => i <= this.state.quest)
        .map(
          (q, i) =>
            `<article class="record"><strong>${i + 1}. ${esc(this.l(q.title))}</strong><span>${this.state.completed.includes(q.id) ? this.t("done") : esc(this.l(activeStage(this.state)?.title || q.title))}</span>${this.state.completed.includes(q.id) ? `<p>${esc(this.l(q.conclusion))}</p>` : ""}</article>`,
        )
        .join("");
    } else if (tab === "secrets") {
      body +=
        `<div class="eyebrow">${this.state.secrets.length} / ${SECRETS.length}</div>` +
        SECRETS.filter((s) => this.state.secrets.includes(s.id))
          .map(
            (s) =>
              `<article class="record"><strong>${esc(this.l(s.title))}</strong><p>${esc(this.l(s.text))}</p></article>`,
          )
          .join("");
    } else if (tab === "cinema") {
      body += Object.entries(CINEMATICS)
        .filter(([id]) => this.state.seen.includes(id))
        .map(
          ([id, c]) =>
            `<article class="record"><strong>${esc(this.l(c.title))}</strong><button data-cine="${id}">▶ ${this.t("cinema")}</button></article>`,
        )
        .join("");
    } else if (tab === "trails") {
      body += `<p class="note">${esc(this.l(TRAIL_UI.hint))}</p>`;
      body += TRAILS.map(
        (t) =>
          `<article class="record"><strong>${esc(this.l(t.name))}</strong><span>${this.state.traversal.completed.includes(t.id) ? this.t("done") : this.state.traversal.visited.includes(t.id) ? this.t("found") : this.t("unseen")}</span>${this.state.traversal.completed.includes(t.id) ? `<h3>${esc(this.l(t.title))}</h3><p>${esc(this.l(t.fact))}</p>` : ""}</article>`,
      ).join("");
    } else if(tab === "expeditions"){
      body += expeditionJournal(this);
    } else if (tab === "colony") {
      body += `<p class="note">${esc(this.l(COLONY_UI.noteHint))}</p>`;
      body += CHAMBERS.filter((room) =>
        this.state.colony.notes.includes(room.id),
      )
        .map(
          (room) =>
            `<article class="record"><strong>${esc(this.l(room.name))}</strong><p>${esc(this.l(room.note))}</p></article>`,
        )
        .join("");
      body += `<p class="note">${this.state.colony.notes.length}/${CHAMBERS.length} · ${esc(this.l(COLONY_UI.fiction))}</p>`;
    } else if (tab === "views") {
      body += VIEWS.filter((v) => this.state.seen.includes("view-" + v.id))
        .map(
          (v) =>
            `<article class="record"><strong>${esc(this.l(v.insect))} / ${esc(this.l(v.human))}</strong><p>${esc(this.l(v.text))}</p><button data-view="${v.id}">${esc(this.l(VIEW_UI.toggle))}</button></article>`,
        )
        .join("");
    } else {
      body += `<div class="entry"><p>${this.t("art")}</p><p>${esc(this.l(T("Обитатели, указанные только до группы или семейства, не изображают конкретный вид. Показатели экосистемы — игровые индексы, а не реальные измерения. Светящиеся грибы и масштаб героя — художественная условность.", "Топ не тұқымдас деңгейінде аталған мекендеушілер нақты бір түрді көрсетпейді. Экожүйе көрсеткіштері — нақты өлшем емес, ойын индекстері. Жарқыраған саңырауқұлақ пен кейіпкер ауқымы — көркемдік шарттылық.", "Creatures identified only to family or group do not represent an exact species. Ecosystem values are game indices, not real measurements. Glowing mushrooms and the hero’s scale are artistic devices.")))}</p><ul><li><a href="https://xerces.org/endangered-species/fireflies/threats-and-conservation-efforts" target="_blank" rel="noopener">Xerces Society · Fireflies</a></li><li><a href="https://www.amentsoc.org/insects/fact-files/" target="_blank" rel="noopener">Amateur Entomologists’ Society · Insect facts</a></li><li><a href="https://www.amnh.org/exhibitions/butterflies/metamorphosis" target="_blank" rel="noopener">American Museum of Natural History · Metamorphosis</a></li><li><a href="https://australian.museum/learn/animals/insects/ant-colonies/" target="_blank" rel="noopener">Australian Museum · Ant colonies</a></li></ul></div>`;
    }
    this.panel(this.t("journal"), body);
    this.mode = "journal";
    document
      .querySelectorAll("[data-tab]")
      .forEach(
        (e) => (e.onclick = () => this.openJournal(e.dataset.tab, true)),
      );
    document
      .querySelectorAll("[data-species]")
      .forEach((e) => (e.onclick = () => this.showSpecies(e.dataset.species)));
    document.querySelectorAll("[data-cine]").forEach(
      (e) =>
        (e.onclick = () => {
          this.modalOpen = false;
          $("#overlay").hidden = true;
          this.playCinematic(e.dataset.cine, null, true);
        }),
    );
    document.querySelectorAll("[data-view]").forEach(
      (e) =>
        (e.onclick = () => {
          this.closePanel();
          this.mode = "play";
          this.menuEl.hidden = true;
          if (this.scene !== this.worldScene) this.exitInterior();
          this.scene.perspective(VIEWS.find((v) => v.id === e.dataset.view));
        }),
    );
  }
  showSpecies(id) {
    const s = speciesById[id];
    const body = `<button class="close" id="entry-back">← ${this.t("species")}</button><article class="entry"><img class="portrait" src="${this.portrait(id)}" alt="${esc(this.l(s.name))}"><h3>${esc(this.l(s.name))}</h3><div class="latin">${esc(s.latin)}</div><div class="tag">${esc(this.l(GROUPS[s.group]))}</div><p>${esc(this.l(s.desc))}</p><dl>${["diet", "habitat", "role"].map((k) => `<dt>${this.t(k)}</dt><dd>${esc(this.l(s[k]))}</dd>`).join("")}</dl><div class="fact"><strong>${this.t("fact")}</strong><p>${esc(this.l(s.fact))}</p></div></article>`;
    this.panel(this.t("journal"), body);
    this.mode = "journal";
    this.currentSpecies = id;
    $("#entry-back").onclick = () => {
      this.currentSpecies = null;
      this.openJournal();
    };
  }
  drawMap(canvas, big) {
    if (!canvas) return;
    const c = canvas.getContext("2d");
    const w = canvas.width,
      h = canvas.height;
    c.imageSmoothingEnabled = false;
    c.clearRect(0, 0, w, h);
    if (this.scene.isCitadel||this.scene.isExpedition) {
      this.scene.drawMap(c, w, h, big);
      return;
    }
    for (const b of BIOMES) {
      const seen = this.state.visited.includes(b.id),
        x = (b.cell[0] * w) / 3,
        y = (b.cell[1] * h) / 3;
      const im = this.scene.textures.get("ground" + b.id).getSourceImage();
      c.globalAlpha = seen ? 1 : 0.25;
      c.drawImage(im, x, y, w / 3, h / 3);
      c.globalAlpha = 1;
      c.strokeStyle = "#bdd09533";
      c.strokeRect(x, y, w / 3, h / 3);
      if (big) {
        c.fillStyle = seen ? "#f6e5ba" : "#9ab19a";
        c.font = "12px Field";
        c.textAlign = "center";
        c.fillText(seen ? this.l(b.name) : "?", x + w / 6, y + h / 6 + 3);
      }
    }
    if (big)
      for (const route of TRAILS) {
        if (!this.state.visited.includes(route.biome)) continue;
        const p = route.platforms[0],
          x = (p.x / WW) * w,
          y = (p.y / WH) * h;
        c.strokeStyle = "#a5ddbf";
        c.lineWidth = 2;
        c.beginPath();
        c.arc(x, y, 6, 0, Math.PI * 2);
        c.stroke();
      }
    // Awakened dandelion wind stations: a small radiating seed head.
    for (const s of STATIONS) {
      if (!this.state.travel.stations.includes(s.biome)) continue;
      const x = (s.x / WW) * w,
        y = (s.y / WH) * h,
        r = big ? 6 : 3;
      c.strokeStyle = "#fffbe9";
      c.lineWidth = 1;
      for (let i = 0; i < 8; i++) {
        const a = (i / 8) * Math.PI * 2;
        c.beginPath();
        c.moveTo(x, y);
        c.lineTo(x + Math.cos(a) * r, y + Math.sin(a) * r);
        c.stroke();
      }
    }
    const st =
      this.state.quest === 1
        ? { points: [[COLONY_ENTRANCE.x, COLONY_ENTRANCE.y]] }
        : activeStage(this.state);
    if (st)
      for (const [p, i] of st.points.map((p, i) => [p, i])) {
        if (this.state.quest !== 1 && this.state.progress.includes(i)) continue;
        c.fillStyle = "#f0d185";
        const x = (p[0] / WW) * w,
          y = (p[1] / WH) * h;
        c.fillRect(x - 2, y - 2, 4, 4);
      }
    if(this.state.crossing.visited){
      const s=this.state.crossing,path=s.route==='roots'?ROOT_PATH:s.route==='bridge'?BRIDGE_PATH:[{x:3370,y:1640},{x:3370,y:1945}];
      c.strokeStyle=s.done?'#b9d7a5':'#86c9cd';c.lineWidth=big?3:1;
      c.beginPath();path.forEach((p,i)=>i?c.lineTo(p.x/WW*w,p.y/WH*h):c.moveTo(p.x/WW*w,p.y/WH*h));c.stroke();
      if(big){c.textAlign='center';c.font='12px Field';c.fillStyle='#d4eac8';c.fillText(this.l(CROSS_UI.note),3370/WW*w,1600/WH*h);}
    }
    for(const spec of EXPEDITIONS){
      const [px,py]=spec.portal,x=px/WW*w,y=py/WH*h;
      c.fillStyle=has(this.state.horizon.sites[spec.id],"complete")?"#b9e7ad":"#e8ca82";
      c.beginPath();c.moveTo(x,y-5);c.lineTo(x+5,y);c.lineTo(x,y+5);c.lineTo(x-5,y);c.closePath();c.fill();
      if(big){c.font="12px Field";c.textAlign="left";c.fillText(spec.number+" · "+this.l(spec.title),x+9,y-6);}
      if(this.expeditionTarget===spec.id){c.strokeStyle="#ffffff";c.lineWidth=2;c.beginPath();c.arc(x,y,13,0,Math.PI*2);c.stroke();}
    }
    const x = (this.state.x / WW) * w,
      y = (this.state.y / WH) * h;
    c.fillStyle = "#f9efd2";
    c.beginPath();
    c.arc(x, y, big ? 4 : 2.5, 0, Math.PI * 2);
    c.fill();
    c.strokeStyle = "#132d2b";
    c.stroke();
  }
  openMap(refresh = false) {
    if (["cinematic", "perspective", "dialog", "end", "travel"].includes(this.mode))
      return;
    this.panel(
      this.scene.isExpedition?this.l(this.scene.site.title):this.scene.isCitadel ? this.l(COLONY_UI.map) : this.t("map"),
      `<canvas class="world-map" id="world-map" width="960" height="660"></canvas><div class="map-legend"><span>● ${this.l(T("Вы здесь", "Сіз осындасыз", "You are here"))}</span><span>■ ${this.t("quest")}</span><span>✳ ${esc(this.l(TRAVEL_UI.legend))} ${this.state.travel.stations.length}/${STATIONS.length}</span><span>${this.state.visited.length} / 9</span></div><div class="map-cells">${BIOMES.map((b) => `<button data-region="${b.id}" class="${b.id === this.scene.lastBiome ? "active" : ""}">${this.state.visited.includes(b.id) ? esc(this.l(b.name)) : "?"}</button>`).join("")}</div><p class="note">${this.t("help")}</p>`,
    );
    this.mode = "map";
    this.drawMap($("#world-map"), true);
    if (this.scene.isCitadel) {
      $("#overlay .map-cells").hidden = true;
      $("#overlay .map-legend span:last-child").textContent =
        `${this.state.colony.visited.length} / ${CHAMBERS.length}`;
      $("#overlay .note").textContent = this.l(COLONY_UI.mapHint);
    }
    if(this.scene.isExpedition){
      $("#overlay .map-cells").hidden=true;
      $("#overlay .map-legend span:last-child").textContent=this.scene.progress().length+" / "+this.scene.site.goal.length;
      $("#overlay .note").textContent=this.l(this.scene.site.intro);
    }else if(!this.scene.isCitadel){
      const holder=document.createElement("div");holder.innerHTML=expeditionCards(this,true);
      $("#world-map").parentElement.append(holder);
      holder.querySelectorAll("[data-exp-locate]").forEach(e=>e.onclick=()=>{this.expeditionTarget=e.dataset.expLocate;this.drawMap($("#world-map"),true);this.toast(this.l(HORIZON_UI.route));});
    }
    document.querySelectorAll("[data-region]").forEach(
      (e) =>
        (e.onclick = () => {
          const b = BIOMES[+e.dataset.region];
          this.toast(
            this.state.visited.includes(b.id)
              ? this.l(b.sub)
              : this.t("unseen"),
          );
        }),
    );
  }
  playCinematic(id, done = null, replay = false) {
    this.resetInput(false);
    // A replay from the journal must not relocate the player: remember where the
    // replay started so the original level can be restored afterwards.
    this.replayOrigin = replay ? this.scene?.sys?.settings?.key : null;
    this.replayExpedition=replay&&this.scene.isExpedition?this.scene.site.id:null;
    if (
      this.scene !== this.worldScene &&
      !(this.scene.isCitadel && id === "citadel")
    )
      this.exitInterior();
    if (id === "citadel" && !this.scene.isCitadel) this.enterColony();
    const data = CINEMATICS[id];
    if (!data) return;
    this.scene.abortPerspective?.();
    this.replayBack = replay
      ? this.backMode === "menu"
        ? "menu"
        : "play"
      : "play";
    this.cineData = { id, index: 0, done, replay, data };
    this.mode = "cinematic";
    this.menuEl.hidden = true;
    this.modalOpen = false;
    $("#overlay").hidden = true;
    $("#hud").hidden = true;
    $("#touch").hidden = true;
    $("#cinema").hidden = false;
    $("#toast").hidden = true;
    this.nextShot(true);
  }
  nextShot(first = false) {
    clearTimeout(this.cineTimer);
    clearTimeout(this.cineAccentTimer);
    this.cineLeaving = false;
    const d = this.cineData;
    if (!d) return;
    if (!first) d.index++;
    if (d.index >= d.data.shots.length) return this.finishCinematic();
    const shot = d.data.shots[d.index],
      plan = shotPlan(d.id, d.index) || {};
    this.voice.stop();
    d.duration = Math.max(shotSeconds(this.l(shot.text)),this.voice.duration(shot.text)+.9);
    d.shotStarted = performance.now();
    this.scene.cinematicShot(d.id, d.index);
    if (first) this.audio.cineStart?.(plan.mood || "hope");
    if (plan.cue) this.audio.cue?.(plan.cue);
    this.renderCinematic(true);
    this.veil(plan.veil || "blur", first);
    this.scheduleShot(d.duration * 1000);
  }
  // Auto-advance leaves EXIT_SECONDS for the camera push and the text exit, so
  // the cut lands mid-motion and the next shot inherits that energy.
  scheduleShot(ms) {
    clearTimeout(this.cineTimer);
    this.cineTimer = setTimeout(
      () => this.leaveShot(),
      Math.max(400, ms - EXIT_SECONDS * 1000),
    );
  }
  leaveShot(seconds = EXIT_SECONDS) {
    const d = this.cineData;
    if (!d || this.cineLeaving) return;
    this.cineLeaving = true;
    this.voice.stop();
    clearTimeout(this.cineTimer);
    clearTimeout(this.cineAccentTimer);
    this.scene.director?.exit(seconds);
    this.audio.cue?.("whoosh");
    const low = this.state.settings.low;
    const words = document.querySelectorAll("#cinema .cine-sub .wi");
    gsap.killTweensOf(words);
    gsap.to(words, {
      yPercent: low ? 0 : -70,
      opacity: 0,
      filter: low ? "none" : "blur(5px)",
      duration: seconds * 0.8,
      stagger: Math.min(0.012, (seconds * 0.4) / Math.max(1, words.length)),
      ease: "power2.in",
    });
    gsap.to("#cinema .dialog-name", { opacity: 0, x: -14, duration: seconds * 0.6 });
    const last = d.index >= d.data.shots.length - 1;
    // Darken a little into the cut; the next shot's own veil clears it.
    if (!last) gsap.to(this.veilEl(), { opacity: low ? 0.5 : 0.35, duration: seconds, ease: "power2.in" });
    this.cineTimer = setTimeout(() => this.nextShot(), seconds * 1000);
  }
  veilEl() {
    let el = $("#cine-veil");
    if (!el) {
      el = document.createElement("div");
      el.id = "cine-veil";
      el.setAttribute("aria-hidden", "true");
      document.body.append(el);
    }
    return el;
  }
  // Shot entries: 'dark' rises out of black, 'bloom' out of white light
  // (waking, emergence), 'blur' resolves from soft focus to sharp.
  veil(kind, first) {
    const el = this.veilEl(),
      low = this.state.settings.low;
    gsap.killTweensOf(el);
    el.className = "veil-" + kind;
    el.hidden = false;
    const from = kind === "blur" && !first ? 0.85 : 1;
    gsap.fromTo(
      el,
      { opacity: from },
      {
        opacity: 0,
        duration: low ? 0.5 : kind === "bloom" ? 1.6 : kind === "dark" ? 1.2 : 0.75,
        ease: kind === "bloom" ? "power2.out" : "sine.out",
        onComplete: () => (el.hidden = true),
      },
    );
    if (first && !low)
      gsap.fromTo(
        "#cinema .cinema-bar",
        { scaleY: 0 },
        { scaleY: 1, duration: 1.1, ease: "expo.out" },
      );
  }
  // Kinetic subtitles: the title assembles letter by letter once per
  // cinematic; each line arrives word by word at reading pace, and the final
  // sentence — the one that carries the meaning — lands after a breath, in
  // the accent colour and with the chime.
  speakCinematic(){
    const d=this.cineData;if(!d||this.cineLeaving)return;
    const index=d.index,text=d.data.shots[index].text;
    const duration=this.voice.duration(text);
    if(duration>0){
      d.duration=Math.max(shotSeconds(this.l(text)),duration+.9);
      this.voice.speak(text,{context:"cinematic",onStart:()=>{
        if(this.cineData!==d||d.index!==index||this.mode!=="cinematic"||this.cineLeaving)return;
        d.shotStarted=performance.now();this.scheduleShot(d.duration*1000);
      }});
    }
  }
  renderCinematic(entering = false) {
    const d = this.cineData;
    if (!d) return;
    const shot = d.data.shots[d.index],
      plan = shotPlan(d.id, d.index) || {},
      low = this.state.settings.low;
    const text = this.l(shot.text),
      sentences = text.match(/[^.!?…]+[.!?…]*\s*/g) || [text],
      accentFrom = plan.accent && sentences.length > 1 ? sentences.length - 1 : sentences.length;
    const words = sentences
      .map((s, i) =>
        s
          .trim()
          .split(/\s+/)
          .map((w) => `<span class="w${i >= accentFrom ? " accent" : ""}"><span class="wi">${esc(w)}</span></span>`)
          .join(" "),
      )
      .join(" ");
    const title = [...this.l(d.data.title)]
      .map((c) => `<span class="ch">${c === " " ? "&nbsp;" : esc(c)}</span>`)
      .join("");
    const count = d.data.shots.length;
    $("#cinema").innerHTML =
      `<div class="cinema-bar top"></div><div class="cinema-bar bottom"></div><div class="cine-title"><span class="cine-count">${String(d.index + 1).padStart(2, "0")} / ${String(count).padStart(2, "0")}</span><span class="cine-title-text" aria-label="${esc(this.l(d.data.title))}">${title}</span><i class="cine-rule"></i></div><div class="cine-sub"><div class="dialog-name">${esc(this.l(shot.speaker))}</div><div class="dialog-text" aria-label="${esc(text)}">${words}</div></div><div class="cine-actions">${this.languageButtons()}${replayButton(this,"cine-replay")}<button id="cine-skip">${this.t("skip")}</button><button id="cine-next">${this.t("next")} ›</button></div><div class="cine-progress"><span></span></div>`;
    this.bindLang($("#cinema"));
    $("#cine-skip").onclick = () => this.finishCinematic();
    $("#cine-next").onclick = () => this.leaveShot(0.4);
    $("#cine-replay").onclick=()=>this.speakCinematic();
    this.speakCinematic();
    this.voice.refreshButtons();
    const chars = document.querySelectorAll("#cinema .ch"),
      plain = [...document.querySelectorAll("#cinema .w:not(.accent) .wi")],
      accent = [...document.querySelectorAll("#cinema .w.accent .wi")];
    const elapsed = entering ? 0 : (performance.now() - (d.shotStarted || 0)) / 1000;
    const remaining = Math.max(0.5, d.duration - elapsed);
    gsap.fromTo(".cine-progress span", { width: `${(elapsed / d.duration) * 100}%` }, { width: "100%", duration: remaining, ease: "none" });
    if (low || !entering) {
      gsap.fromTo([".cine-sub", ".cine-title"], { opacity: 0 }, { opacity: 1, duration: 0.5 });
      return;
    }
    if (d.index === 0) {
      gsap.from(chars, {
        opacity: 0,
        yPercent: 60,
        filter: "blur(8px)",
        duration: 0.9,
        stagger: Math.min(0.05, 1.1 / chars.length),
        ease: "power3.out",
        delay: 0.35,
      });
      gsap.from(".cine-title-text", { letterSpacing: "0.32em", duration: 2.2, ease: "expo.out", delay: 0.35 });
      gsap.from(".cine-rule", { scaleX: 0, duration: 1.6, ease: "expo.out", delay: 0.9 });
    } else gsap.from(".cine-count", { opacity: 0, y: -8, duration: 0.6 });
    gsap.from(".cine-sub .dialog-name", { opacity: 0, x: -18, letterSpacing: "0.4em", duration: 0.9, ease: "power3.out", delay: 0.25 });
    // Reading pace: words land a little faster than they are read, so the line
    // is complete well before the shot ends.
    const start = d.index === 0 ? 0.9 : 0.45,
      per = Math.min(0.11, 2.4 / Math.max(1, plain.length + accent.length));
    if (plain.length) gsap.from(plain, {
      yPercent: 105,
      opacity: 0,
      filter: "blur(6px)",
      duration: 0.7,
      stagger: per,
      ease: "power3.out",
      delay: start,
    });
    if (accent.length) {
      const at = start + plain.length * per + 0.45;
      gsap.from(accent, {
        yPercent: 105,
        opacity: 0,
        filter: "blur(6px)",
        letterSpacing: "0.12em",
        duration: 0.9,
        stagger: per * 1.25,
        ease: "power3.out",
        delay: at,
      });
      clearTimeout(this.cineAccentTimer);
      this.cineAccentTimer = setTimeout(() => this.audio.cue?.("chime"), at * 1000);
    }
  }
  finishCinematic() {
    this.voice.stop();
    clearTimeout(this.cineTimer);
    clearTimeout(this.cineAccentTimer);
    this.cineLeaving = false;
    const d = this.cineData;
    if (!d) return;
    this.audio.cineStop?.();
    const veil = $("#cine-veil");
    if (veil) {
      gsap.killTweensOf(veil);
      gsap.to(veil, { opacity: 0, duration: 0.4, onComplete: () => (veil.hidden = true) });
    }
    if (!this.state.seen.includes(d.id)) this.state.seen.push(d.id);
    this.cineData = null;
    $("#cinema").hidden = true;
    $("#toast").hidden = false;
    this.scene.endCinematic();
    if (d.replay && this.replayOrigin && this.replayOrigin !== this.scene.sys.settings.key) {
      if (this.replayOrigin === "World") this.exitInterior(false);
      else if (this.replayOrigin === "Colony") this.enterColony();
      else if (this.replayOrigin === "Underwater") this.enterUnderwater();
      else if(this.replayOrigin === "Expedition")this.enterExpedition(this.replayExpedition);
    }
    this.replayOrigin = null;
    this.mode = d.replay ? this.replayBack : "play";
    this.resetInput(this.mode === "play");
    if (this.mode === "menu") this.menu();
    else this.refreshHud();
    if (d.replay) {
      this.save(false);
      return;
    }
    if (d.id === "ending") return this.endingScreen();
    this.save(false);
    d.done?.();
    if (
      d.id === "citadel" &&
      this.scene.isCitadel &&
      !this.state.seen.includes("colony-instructions")
    )
      this.scene.showWelcome();
  }
  showPerspective(view, human) {
    this.resetInput(false);
    this.currentView = view;
    this.currentViewHuman = human;
    this.mode = "perspective";
    $("#perspective").hidden = false;
    $("#toast").hidden = true;
    $("#hud").hidden = true;
    $("#touch").hidden = true;
    $("#perspective").innerHTML =
      `<div class="perspective-panel"><div class="perspective-top"><div class="eyebrow">${esc(this.l(VIEW_UI.title))}</div><h2>${esc(this.l(human ? VIEW_UI.human : VIEW_UI.insect))}</h2><div class="scale-ruler">${human ? "× 0.11" : "× 1"}</div></div><div class="perspective-bottom"><div><div class="eyebrow">${esc(this.l(human ? view.human : view.insect))}</div><p>${esc(this.l(view.text))}</p></div><button class="primary" id="view-return">${esc(this.l(VIEW_UI.back))}</button></div></div>`;
    $("#view-return").onclick = () => this.scene.restorePerspective?.();
    this.voice.speak(view.text,{context:"perspective"});
  }
  hidePerspective() {
    this.voice.stop();
    $("#perspective").hidden = true;
    $("#toast").hidden = false;
    this.mode = "play";
    this.resetInput(true);
    this.refreshHud();
  }
  async finishStory() {
    if (this.finishing) return;
    this.finishing = true;
    this.resetInput(false);
    this.mode = "transition";
    const ok = await this.save(false, "before-ending");
    if (ok) this.toast(this.t("checkpoint"));
    this.playCinematic("restoration", () =>
      this.playCinematic("ending", () => {}),
    );
    this.state.ended = true;
    this.state.completed = this.state.completed.includes("garden")
      ? this.state.completed
      : [...this.state.completed, "garden"];
    this.save(false);
    this.finishing = false;
  }
  endingScreen() {
    this.resetInput(false);
    this.mode = "end";
    this.modalOpen = false;
    this.menuEl.hidden = true;
    $("#hud").hidden = true;
    $("#touch").hidden = true;
    $("#overlay").hidden = false;
    $("#overlay").innerHTML =
      `<div class="ending"><div><span class="pixel-leaf"></span><h1>${this.t("end")}</h1><p>${esc(this.l(T("Маленький листочек остался на столе. А где-то за окном снова шелестит трава.", "Кішкентай жапырақ үстелде қалды. Ал терезе сыртында шөп қайта сыбдырлайды.", "A little leaf remains on the desk. Somewhere beyond the window, the grass rustles again.")))}</p><div class="eyebrow">${esc(this.t("title")).replace("\n", " ")} · ${this.state.discovered.length}/${SPECIES.length}</div><button class="primary" id="before-ending">${this.t("after")}</button><button class="close" id="end-menu">${this.t("menu")}</button><p class="note">${this.t("art")}</p></div></div>`;
    $("#end-menu").onclick = () => this.menu();
    $("#before-ending").onclick = async () => {
      try {
        const s = await readSave("before-ending");
        if (s) this.state = s;
        else this.state.ended = false;
      } catch {
        this.state.ended = false;
      }
      this.state.ended = false;
      this.modalOpen = false;
      $("#overlay").hidden = true;
      this.continueGame();
    };
  }
  enterExpedition(id,resume=false){
    if(!siteById[id])return;
    if(this.scene?.isExpedition&&this.scene.site.id===id){
      this.game.scene.wake("Expedition");
      this.scene.reset();this.mode="play";this.refreshHud();return;
    }
    this.worldScene?.tactility?.drop(true);
    if(this.scene!==this.worldScene)this.exitInterior(false);
    this.resetInput(true);this.worldScene.player.setVelocity(0);
    this.game.scene.sleep("World");
    this.state.underwater.active=false;this.state.colony.active=false;
    const first=!this.state.horizon.sites[id].visited;
    this.state.horizon.active=id;this.state.horizon.sites[id].visited=true;
    this.mode="play";$("#overlay").hidden=true;this.modalOpen=false;
    const interior=this.game.scene.getScene("Expedition");
    if(interior.scene.isActive()||interior.scene.isSleeping())this.game.scene.stop("Expedition");
    this.game.scene.start("Expedition",{id,first});
    this.save(false);
  }
  enterUnderwater() {
    this.enterInterior("Underwater", "underwater");
  }
  enterColony() {
    this.enterInterior("Colony", "colony");
  }
  exitColony(show = true) {
    this.exitInterior(show);
  }
  enterInterior(key, field) {
    if (this.scene.sys.settings.key === key) return;
    this.worldScene?.tactility?.drop(true);
    if (this.scene !== this.worldScene) this.exitInterior(false);
    this.resetInput(true);
    this.worldScene = this.worldScene || this.scene;
    this.worldScene.player.setVelocity(0);
    this.game.scene.sleep("World");
    this.state.horizon.active=null;
    this.state.underwater.active = field === "underwater";
    this.state.colony.active = field === "colony";
    this.mode = "play";
    $("#overlay").hidden = true;
    this.modalOpen = false;
    const interior = this.game.scene.getScene(key);
    if (interior.scene.isSleeping()) this.game.scene.wake(key);
    else this.game.scene.start(key);
    this.save(false);
  }
  exitUnderwater(show = true) {
    this.exitInterior(show);
  }
  exitInterior(show = true) {
    if (this.scene === this.worldScene) return;
    this.resetInput(true);
    if (this.scene.scene.isActive())
      this.game.scene.sleep(this.scene.sys.settings.key);
    this.scene = this.worldScene;
    this.game.scene.wake("World");
    this.state.horizon.active=null;
    this.state.underwater.active = false;
    this.state.colony.active = false;
    this.mode = "play";
    this.scene.reset(this.state);
    this.refreshHud();
    this.audio.enter(
      this.scene.lastBiome,
      this.scene.isNight(),
      this.state.eco,
    );
    if (show) this.save(false);
  }
  initTouch() {
    const stick = $("#stick"),
      thumb = $("#thumb");
    let pointer = null;
    const move = (e) => {
      if (e.pointerId !== pointer) return;
      const r = stick.getBoundingClientRect();
      let x = e.clientX - (r.left + r.width / 2),
        y = e.clientY - (r.top + r.height / 2);
      const d = Math.hypot(x, y);
      if (d > 40) {
        x = (x / d) * 40;
        y = (y / d) * 40;
      }
      this.joy = { x: x / 40, y: y / 40 };
      thumb.style.transform = `translate(${x}px,${y}px)`;
    };
    stick.onpointerdown = (e) => {
      if (pointer !== null || this.mode !== "play") return;
      e.preventDefault();
      pointer = e.pointerId;
      stick.setPointerCapture?.(pointer);
      move(e);
    };
    stick.onpointermove = move;
    const stop = () => {
      const previous = pointer;
      pointer = null;
      this.joy = { x: 0, y: 0 };
      thumb.style.transform = "";
      if (previous !== null && stick.hasPointerCapture?.(previous))
        stick.releasePointerCapture(previous);
    };
    this.stopTouch = stop;
    stick.onpointerup = stop;
    stick.onpointercancel = stop;
    stick.onlostpointercapture = stop;
    // Orientation events may arrive before layout: refresh parent bounds
    // before fitting, otherwise Phaser can keep the previous display size.
    const resize = () => {
      this.resetInput(this.mode === "play");
      cancelAnimationFrame(this.resizeFrame);
      this.resizeFrame = requestAnimationFrame(() => {
        const scale = this.game.scale;
        scale.getParentBounds();
        if (scale.parentSize.width > 0 && scale.parentSize.height > 0)
          scale.refresh();
      });
    };
    window.addEventListener("resize", resize);
    window.addEventListener("orientationchange", resize);
    this.game.events.once("destroy", () => {
      cancelAnimationFrame(this.resizeFrame);
      window.removeEventListener("resize", resize);
      window.removeEventListener("orientationchange", resize);
    });
    $("#touch-e").onpointerdown = (e) => {
      e.preventDefault();
      if (this.mode !== "play") return;
      this.scene.interact();
    };
    $("#touch-jump").onpointerdown = (e) => {
      e.preventDefault();
      if (this.mode !== "play") return;
      this.scene.jump();
    };
    $("#touch-q").onpointerdown = (e) => {
      e.preventDefault();
      if (this.mode !== "play") return;
      this.scene.toggleObserve();
    };
  }
}
const app = new App();
// A small inspectable public surface for diagnostics and accessible integrations.
window.littleWorld = {
  get state() {
    return JSON.parse(JSON.stringify(app.state));
  },
  get mode() {
    return app.mode;
  },
  get scene() {
    return app.scene;
  },
  save: () => app.save(),
  app,
};
