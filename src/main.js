import Phaser from "phaser";
import i18next from "i18next";
import { gsap } from "gsap";
import { WorldScene } from "./scene.js";
import { visualPortrait } from "./visuals.js";
import { UnderwaterScene, UW, uwSpecies } from "./underwater.js";
import { ColonyScene } from "./colony.js";
import { COLONY_UI, CHAMBERS, COLONY_ENTRANCE } from "./colony-data.js";
import { BIOMES, SPECIES, UI, GROUPS, L, T, speciesById } from "./content.js";
import { QUESTS, SECRETS } from "./quests.js";
import { VIEWS, VIEW_UI } from "./perspectives.js";
import { TRAILS, TRAIL_UI } from "./traversal.js";
import { CINEMATICS } from "./cinematics.js";
import { TransitionLayer, WindLayer, kineticTitle } from "./transitions.js";
import { STATIONS, TRAVEL_UI } from "./travel.js";
import { MenuFX, HEADLESS } from "./menu-fx.js";
import { WORLD_UI } from "./interactions.js";
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
    this.joy = { x: 0, y: 0 };
    this.modalOpen = false;
    this.assetErrors = new Set();
    this.ready = new Promise((resolve, reject) => {
      this.readyResolve = resolve;
      this.readyReject = reject;
    });
    this.menuEl = $("#menu");
    this.transition = new TransitionLayer(this);
    this.wind = new WindLayer(this.transition);
    this.menuFX = new MenuFX(this);
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
    $("#toast").hidden = true;
    this.menuEl.innerHTML = `<div class="menu-content"><span class="eyebrow">THE GREAT LITTLE WORLD</span><h1>${esc(this.l(UI.title)).replace("\n", "<br>")}</h1><p class="menu-sub">${esc(this.l(RELEASE_UI.bootFail))}</p><button class="primary" id="retry">${esc(this.l(RELEASE_UI.retry))}</button></div>`;
    $("#retry").onclick = () => location.reload();
  }
  resetInput(play = false) {
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
    window.addEventListener("blur", () => {
      this.resetInput(false);
      if (this.mode === "play") this.pause();
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
        if (this.mode === "cinematic") {
          clearTimeout(this.cineTimer);
          this.cineTimer = setTimeout(() => this.nextShot(), 8500);
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
    } else if (this.mode === "cinematic") this.renderCinematic();
    else if (this.mode === "perspective")
      this.showPerspective(this.currentView, this.currentViewHuman);
    else if (this.mode === "end") this.endingScreen();
    if (this.state.started) this.save(false);
  }
  menu() {
    this.resetInput(false);
    this.mode = "menu";
    this.modalOpen = false;
    this.menuEl.hidden = false;
    $("#toast").hidden = true;
    $("#overlay").hidden = true;
    $("#hud").hidden = true;
    $("#touch").hidden = true;
    const saved = this.hasSave && this.state.started,
      s = this.state,
      chapter = Math.min(s.quest + 1, 9);
    const [line1, line2 = ""] = this.t("title").split("\n");
    const questTitle = this.l(QUESTS[Math.min(s.quest, QUESTS.length - 1)].title).replace("\n", " ");
    const item = (id, label, note = "", main = false) =>
      `<button class="mi${main ? " main" : ""}" id="${id}"><span class="mi-label">${label}</span>${note ? `<span class="mi-note">${note}</span>` : ""}</button>`;
    const pips = `<span class="mi-pips">${Array.from({ length: 9 }, (_, i) => `<i class="${i < s.quest ? "done" : i === s.quest ? "now" : ""}"></i>`).join("")}</span>`;
    this.menuEl.innerHTML = `<div class="menu-bg" aria-hidden="true"></div><canvas class="menu-fx" aria-hidden="true"></canvas><div class="menu-shade" aria-hidden="true"></div><div class="menu-content"><div class="eyebrow"><i class="eb-rule"></i>${esc(this.t("tag"))}</div><h1><span class="tline">${esc(line1)}</span><span class="tline gold">${esc(line2)}</span></h1><p class="menu-sub">${esc(this.l(T("Уменьшитесь до размера муравья. Откройте мир, который всегда был рядом.", "Құмырсқадай кішірейіңіз. Үнемі жаныңызда болған әлемді ашыңыз.", "Become as small as an ant. Discover a world that was beside you all along.")))}</p><nav class="menu-list">${saved ? item("continue", esc(this.t("continue")), `${esc(this.t("chapter"))} ${chapter} / 9 · ${esc(questTitle)}${pips}`, true) : ""}${item("new", esc(this.t("new")), saved ? "" : esc(this.l(T("Пролог · около 2 минут", "Пролог · шамамен 2 минут", "Prologue · about 2 minutes"))), !saved)}${item("journal-open", esc(this.t("journal")), saved ? `${s.discovered.length} / ${SPECIES.length} ${esc(this.l(T("видов", "түр", "species")))}` : "")}${item("settings-open", esc(this.t("settings")))}</nav></div><div class="menu-foot"><span>${this.languageButtons()}</span><span>${VERSION} · ${this.l(T("СЮЖЕТНОЕ ПРИКЛЮЧЕНИЕ", "ОҚИҒАЛЫ САЯХАТ", "A STORY ADVENTURE"))}</span></div>`;
    this.menuFX.mount(this.menuEl);
    if (!this.state.settings.low && !HEADLESS) {
      const first = !this.menuShown;
      this.menuShown = true;
      gsap.fromTo(
        this.menuEl.querySelectorAll(".eyebrow, h1 .tline, .menu-sub, .menu-list .mi"),
        { opacity: 0, y: 18 },
        { opacity: 1, y: 0, duration: first ? 1 : 0.5, ease: "power3.out", stagger: first ? 0.09 : 0.03, delay: first ? 0.2 : 0 },
      );
    }
    this.bindLang(this.menuEl);
    $(".menu-foot span:last-child").textContent =
      `${VERSION} · ${this.l(T("СЮЖЕТНОЕ ПРИКЛЮЧЕНИЕ", "ОҚИҒАЛЫ САЯХАТ", "A STORY ADVENTURE"))}`;
    $("#new").onclick = () => this.newGame();
    $("#continue")?.addEventListener("click", () => this.continueGame());
    $("#journal-open").onclick = () => this.openJournal();
    $("#settings-open").onclick = () => this.settings();
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
    this.mode = "play";
    this.resetInput(true);
    this.refreshHud();
    // Start the prologue before awaiting storage so no gameplay frame (e.g. an auto "two views") runs first.
    this.playCinematic("prologue", () => {
      this.questOpening();
      this.toast(this.t("help"));
      this.toast(this.l(TRAIL_UI.hint));
    });
    await this.save(false);
    this.starting = false;
  }
  continueGame() {
    this.resetInput(true);
    this.audio.unlock();
    this.menuEl.hidden = true;
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
    document.body.classList.toggle("low-fx", !!this.state.settings.low);
    $("#toast").hidden = this.mode !== "play";
    const play = ["play", "dialog", "perspective", "cinematic"].includes(
      this.mode,
    );
    $("#hud").hidden =
      !play || this.mode === "cinematic" || this.mode === "perspective";
    $("#touch").hidden =
      this.mode !== "play" || !matchMedia("(pointer:coarse)").matches;
    const b = biomeAt(this.state.x, this.state.y),
      q = this.scene.isUnderwater
        ? { title: UW.quest }
        : QUESTS[this.state.quest],
      st =
        this.scene.isUnderwater || this.scene.isCitadel
          ? this.scene.currentStage()
          : this.state.quest === 1
            ? { title: COLONY_UI.enter, points: [] }
            : activeStage(this.state);
    $("#hud").innerHTML =
      `<div class="hud-top"><div class="location"><small>${this.t("chapter")} ${Math.min(this.state.quest + 1, 9)} / 9</small><strong>${esc(this.l(this.scene.isUnderwater ? UW.title : this.scene.isCitadel ? COLONY_UI.title : b.name))}</strong><small id="live-weather"></small></div><div class="hud-buttons">${this.languageButtons()}<button class="icon-button" id="observe" aria-pressed="${!!this.scene.observing}" title="${this.t("observe")} · Q" aria-label="${this.t("observe")}">${icon("eye")}</button><button class="icon-button" id="scan" aria-pressed="${!!this.scene.scanning}" data-locked="${!this.state.abilities.includes("scanner")}" title="${this.t("scanner")} · C" aria-label="${this.t("scanner")}">${icon("scan")}</button><button class="icon-button" id="view" title="${this.l(VIEW_UI.title)} · V" aria-label="${this.l(VIEW_UI.title)}">${icon("view")}</button><button class="icon-button" id="map-open" title="${this.t("map")} · M" aria-label="${this.t("map")}">${icon("map")}</button><button class="icon-button" id="diary-open" title="${this.t("journal")} · J" aria-label="${this.t("journal")}">${icon("journal")}</button><button class="icon-button" id="pause-open" title="${this.t("paused")}" aria-label="${this.t("paused")}">${icon("pause")}</button></div></div><div class="hud-bottom"><div class="quest-box"><div class="eyebrow">${this.t("quest")}</div><div class="quest-title">${esc(this.l(q?.title || UI.title)).replace("\n", " ")}</div><div class="quest-objective">${esc(st ? this.l(st.title) : this.t("after"))}</div>${st ? '<div class="progress-dots">' + st.points.map((_, i) => `<i class="${(this.scene.isUnderwater ? this.state.underwater.progress : this.state.progress).includes(i) ? "done" : ""}"></i>`).join("") + "</div>" : ""}${
        this.scene.scanning
          ? '<div class="eco-inline">' +
            Object.entries(this.state.eco)
              .map(([k, v]) => `<span>${esc(this.t(k))} ${v}%</span>`)
              .join("") +
            "</div>"
          : ""
      }</div><div class="ability-row">${this.state.abilities.map((k) => `<span class="ability">${this.t(k)}</span>`).join("")}</div><div class="hud-hint">${esc(this.l(T("WASD — идти · E — действие · Пробел — прыжок", "WASD — жүру · E — әрекет · Бос орын — секіру", "WASD — move · E — interact · Space — jump")))}</div></div><div class="mini-wrap"><canvas id="mini" width="192" height="132" role="button" tabindex="0" aria-label="${this.t("map")}"></canvas><div class="mini-caption">M · ${this.t("map")} <span id="time"></span></div></div><button id="prompt" class="prompt" hidden></button><div class="status" id="status" ${this.scene.observing || this.scene.scanning ? "" : "hidden"}>${this.scene.observing ? this.t("observeOn") : this.scene.scanning ? this.t("scanOn") : ""}</div>${this.scene.scanning ? '<div class="scan-grid"></div>' : ""}`;
    this.bindLang($("#hud"));
    $("#observe").onclick = () => this.scene.toggleObserve();
    $("#scan").onclick = () => this.scene.toggleScan();
    $("#view").onclick = () => this.scene.perspective();
    $("#map-open").onclick = () => this.openMap();
    $("#diary-open").onclick = () => this.openJournal();
    $("#pause-open").onclick = () => this.pause();
    $("#prompt").onclick = () => this.scene.interact();
    $("#touch-q").setAttribute("aria-label", this.t("observe"));
    $("#touch-jump").setAttribute("aria-label", this.t("jump"));
    $("#touch-e").setAttribute("aria-label", this.t("interact"));
    $("#stick").setAttribute("aria-label", this.t("controls"));
    $("#rotate").textContent = this.l(RELEASE_UI.rotate);
    $("#rotate").hidden = this.mode !== "play";
    $("#mini").onclick = () => this.openMap();
    $("#mini").onkeydown = (e) => {
      if (e.key === "Enter" || e.key === " ") {
        e.preventDefault();
        this.openMap();
      }
    };
    this.updateLiveHud();
    this.scene.refreshLabels?.();
  }
  updateLiveHud() {
    if (!this.scene) return;
    const b = biomeAt(this.state.x, this.state.y);
    const e = $("#live-weather");
    if (e)
      e.textContent = this.scene.isCitadel
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
    e.hidden = !near || this.mode !== "play";
    if (e.hidden) return;
    const text =
      near.kind === "npc"
        ? this.l(speciesById[near.data.species].name)
        : near.kind === "secret"
          ? this.l(near.data.title)
          : this.l(near.stage.title);
    const key = matchMedia("(pointer:coarse)").matches ? this.l(T("Действие", "Әрекет", "Interact")) : "E";
    const content = key + "\n" + text;
    if (e.dataset.content === content) return;
    e.dataset.content = content;
    e.innerHTML = '<span class="key">' + esc(key) + '</span>' + esc(text);
  }
  setStatus(s) {
    if ($("#status") && this.mode === "play") {
      if ($("#status").textContent !== s) $("#status").textContent = s;
      $("#status").hidden = false;
    }
  }
  showNotice(e, key, duration) {
    const root = $("#toast");
    const remove = (node) => {
      clearTimeout(node.dismissTimer);
      gsap.killTweensOf(node);
      node.remove();
    };
    for (const old of [...root.children])
      if (old.dataset.notice === key) remove(old);
    const limit = matchMedia("(pointer:coarse)").matches ? (innerHeight <= 500 ? 1 : 2) : 3;
    while (root.children.length >= limit) remove(root.firstElementChild);
    e.dataset.notice = key;
    root.append(e);
    e.dismissTimer = setTimeout(() => {
      gsap.to(e, { opacity: 0, duration: this.state.settings.low ? 0 : 0.3,
        onComplete: () => remove(e) });
    }, duration);
  }
  toast(text, critical = false) {
    if (critical) {
      const root = $("#toast");
      for (const old of [...root.children]) {
        clearTimeout(old.dismissTimer);
        gsap.killTweensOf(old);
        old.remove();
      }
      root.hidden = false;
    }
    const e = document.createElement("div");
    e.className = "toast-card";
    e.textContent = text;
    this.showNotice(e, "text:" + text, 4500);
  }
  portrait(id) {
    return visualPortrait(this.scene, id + "0");
  }
  discoveryToast(id) {
    const s = speciesById[id],
      e = document.createElement("div");
    e.className = "toast-card";
    e.innerHTML = `<img src="${this.portrait(id)}" alt=""><span class="eyebrow">${this.t("discover")}</span><strong>${esc(this.l(s.name))}</strong><button>${this.t("read")} →</button>`;
    e.querySelector("button").onclick = () => {
      if (this.mode !== "play") return;
      clearTimeout(e.dismissTimer);
      e.remove();
      this.speciesDialog(id);
    };
    this.showNotice(e, "species:" + id, 6500);
  }
  regionToast(b, { big = true, mood } = {}) {
    const mood2 = mood || (b.id === 3 ? "water" : [1, 4].includes(b.id) ? "earth" : "wind");
    kineticTitle($("#region"), this.l(b.name), this.l(b.sub), {
      big,
      mood: mood2,
      hold: big ? 2.4 : 1.1,
      low: this.state.settings.low,
    });
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
  // Screen-space position of a world point, as fractions of the window (for transition origins).
  screenPoint(x, y) {
    const cam = this.scene.cameras.main,
      v = cam.worldView,
      r = this.game.canvas.getBoundingClientRect();
    const nx = (x - v.x) / v.width,
      ny = (y - v.y) / v.height;
    return {
      x: (r.left + nx * r.width) / innerWidth,
      y: (r.top + ny * r.height) / innerHeight,
    };
  }
  beginTransition() {
    if (this.transition.busy || this.mode !== "play") return false;
    this.mode = "transition";
    this.resetInput(false);
    this.refreshHud();
    this.scene.player?.setVelocity(0);
    return true;
  }
  afterTransition() {
    if (this.mode !== "transition") return;
    this.mode = "play";
    this.resetInput(true);
    this.refreshHud();
  }
  diveIn() {
    if (!this.beginTransition()) return;
    const w = this.scene;
    w.player.body.enable = false;
    const k = { s: 1.6 };
    gsap.to(w.player, { x: 3720, y: 1440, alpha: 0, duration: 0.55, ease: "back.in(1.6)" });
    gsap.to(k, { s: 0.8, duration: 0.55, ease: "back.in(1.6)", onUpdate: () => w.player.setScale(k.s) });
    w.burst(3720, 1440, 0xbfeee4);
    this.audio.play("splash");
    this.transition
      .play("dive", () => {
        this.enterUnderwater();
        this.mode = "transition";
        this.audio.play("bubbles");
      }, { cover: 0.85, hold: 0.15, reveal: 1.1 })
      .then(() => this.afterTransition());
  }
  burrowIn() {
    if (!this.beginTransition()) return;
    const w = this.scene,
      origin = this.screenPoint(COLONY_ENTRANCE.x, COLONY_ENTRANCE.y - 20);
    w.player.body.enable = false;
    gsap.to(w.player, { x: COLONY_ENTRANCE.x, y: COLONY_ENTRANCE.y - 6, alpha: 0, duration: 0.7, ease: "power2.in" });
    this.audio.play("rumble");
    this.transition
      .play("burrow", () => {
        this.enterColony();
        this.mode = "transition";
        this.audio.play("dust");
      }, { origin, cover: 0.9, hold: 0.2, reveal: 1.0 })
      .then(() => this.afterTransition());
  }
  panel(title, body, small = false) {
    this.resetInput(false);
    if (!this.modalOpen) this.backMode = this.mode;
    this.modalOpen = true;
    $("#toast").hidden = true;
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
    const wasSettings = this.mode === "settings";
    const returnToPause = wasSettings && this.backMode === "pause";
    if (wasSettings && this.state.started) this.save(false);
    $("#overlay").hidden = true;
    this.modalOpen = false;
    this.mode = this.backMode === "menu" ? "menu" : "play";
    if (returnToPause) return this.pause();
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
    $("#pause-settings").onclick = () => this.settings("pause");
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
      `${["music", "ambience", "effects"].map((k) => `<label class="settings-row"><span>${this.t(k)}</span><input type="range" min="0" max="1" step="0.01" data-volume="${k}" value="${this.state.settings[k]}" aria-label="${this.t(k)}"></label>`).join("")}<div class="settings-row"><span>${this.t("language")}</span>${this.languageButtons()}</div><label class="settings-row"><span>${this.t("low")}</span><input type="checkbox" id="low" ${this.state.settings.low ? "checked" : ""}></label><h3>${this.t("controls")}</h3><p class="entry">${esc(this.t("controlText"))} · V — ${esc(this.l(VIEW_UI.title))}</p><div class="settings-buttons"><button id="full">${this.t("full")}</button><button id="export">${this.t("export")}</button><button id="import">${this.t("import")}</button><input type="file" accept="application/json,.json" id="save-file" hidden></div><p class="note">${this.t("art")}</p>`,
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
        }),
    );
    $("#low").onchange = (e) => {
      this.state.settings.low = e.target.checked;
      document.body.classList.toggle("low-fx", e.target.checked);
    };
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
        this.toast(this.t("invalidSave"), true);
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
      this.reportedStorage = false;
      const indicator = $("#save-state");
      if (indicator) {
        clearTimeout(this.saveIndicatorTimer);
        indicator.textContent = "✓ " + this.t("saved");
        indicator.hidden = false;
        this.saveIndicatorTimer = setTimeout(() => { indicator.hidden = true; }, 2400);
      }
      if (show) this.toast(this.t("saved"));
      return true;
    } catch {
      if ($("#save-state")) $("#save-state").hidden = true;
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
      `<div class="dialog-name">${esc(this.l(d.name))}</div><div class="dialog-text">${esc(this.l(d.text))}</div><div class="dialog-actions">${d.other.map((o, i) => `<button class="close" data-other="${i}">${esc(this.l(o.label))}</button>`).join("")}<button id="dialog-next" class="primary">${esc(this.l(d.button))}</button></div>`;
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
  }
  closeDialog() {
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
      finds: this.l(WORLD_UI.tab),
      colony: this.l(COLONY_UI.notes),
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
      ["cinematic", "perspective", "dialog", "end"].includes(this.mode) &&
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
    } else if (tab === "finds") {
      const w = this.state.world;
      body += `<p class="note">${esc(this.l(WORLD_UI.hint))}</p><div class="finds-grid">${Object.entries(WORLD_UI.counts)
        .map(([k, label]) => `<div class="find"><b>${w.counts[k] || 0}</b><span>${esc(this.l(label))}</span></div>`)
        .join("")}</div>`;
      body += w.facts
        .map((k) => `<article class="record"><strong>${esc(this.l(WORLD_UI.counts[k]))}</strong><p>${esc(this.l(WORLD_UI.facts[k]))}</p></article>`)
        .join("");
    } else if (tab === "trails") {
      body += `<p class="note">${esc(this.l(TRAIL_UI.hint))}</p>`;
      body += TRAILS.map(
        (t) =>
          `<article class="record"><strong>${esc(this.l(t.name))}</strong><span>${this.state.traversal.completed.includes(t.id) ? this.t("done") : this.state.traversal.visited.includes(t.id) ? this.t("found") : this.t("unseen")}</span>${this.state.traversal.completed.includes(t.id) ? `<h3>${esc(this.l(t.title))}</h3><p>${esc(this.l(t.fact))}</p>` : ""}</article>`,
      ).join("");
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
    if (this.scene.isCitadel) {
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
    if (["cinematic", "perspective", "dialog", "end"].includes(this.mode))
      return;
    this.panel(
      this.scene.isCitadel ? this.l(COLONY_UI.map) : this.t("map"),
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
    if (
      this.scene !== this.worldScene &&
      !(this.scene.isCitadel && id === "citadel")
    )
      this.exitInterior();
    if (id === "citadel" && !this.scene.isCitadel) this.enterColony();
    const data = CINEMATICS[id];
    if (!data) return;
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
    gsap.killTweensOf($("#region").querySelectorAll("*"));
    gsap.set($("#region"), { opacity: 0 });
    this.cineOpened = false;
    this.nextShot(true);
  }
  nextShot(first = false) {
    clearTimeout(this.cineTimer);
    const d = this.cineData;
    if (!d) return;
    if (!first) d.index++;
    if (d.index >= d.data.shots.length) return this.finishCinematic();
    const index = d.index;
    const apply = () => {
      if (this.cineData !== d || d.index !== index) return;
      this.scene.cinematicShot(d.id, d.index);
      if (d.id === "ending" && d.index === 2) {
        this.scene.cameras.main.flash(1000, 255, 250, 226);
        this.audio.play("discovery");
      }
      this.renderCinematic();
    };
    // Shots cut inside a short dip in the scene's shadow colour instead of a hard splice:
    // the new shot is already in place and rises out of the shade.
    apply();
    if (!first && !this.state.settings.low)
      this.transition.play("blink", null, { cover: 0, hold: 0.08, reveal: 0.65 });
    this.cineTimer = setTimeout(() => this.nextShot(), 8500);
  }
  renderCinematic() {
    const d = this.cineData;
    if (!d) return;
    const shot = d.data.shots[d.index];
    const words = (s) =>
      esc(s)
        .split(/(\s+)/)
        .map((w) => (/^\s+$/.test(w) ? w : `<span class="cw">${w}</span>`))
        .join("");
    const letters = [...this.l(d.data.title)]
      .map((c) => `<span class="cl">${c === " " ? "&nbsp;" : esc(c)}</span>`)
      .join("");
    const opening = d.index === 0 && !this.cineOpened;
    this.cineOpened = true;
    $("#cinema").innerHTML =
      `<div class="cine-grain" aria-hidden="true"></div><div class="cinema-bar top ${opening ? "enter" : ""}"></div><div class="cinema-bar bottom ${opening ? "enter" : ""}"></div><div class="cine-title"><span class="cine-count">${String(d.index + 1).padStart(2, "0")} / ${String(d.data.shots.length).padStart(2, "0")}</span>${letters}</div><div class="cine-sub"><div class="dialog-name">${esc(this.l(shot.speaker))}</div><div class="dialog-text">${words(this.l(shot.text))}</div></div><div class="cine-actions">${this.languageButtons()}<button id="cine-skip">${this.t("skip")}</button><button id="cine-next">${this.t("next")} ›</button></div><div class="cine-progress"><span></span></div>`;
    this.bindLang($("#cinema"));
    $("#cine-skip").onclick = () => this.finishCinematic();
    $("#cine-next").onclick = () => this.nextShot();
    if (this.state.settings.low)
      gsap.fromTo($(".cine-sub"), { opacity: 0 }, { opacity: 1, duration: 0.5 });
    else {
      gsap.fromTo(
        "#cinema .cl",
        { opacity: 0, y: 10, filter: "blur(6px)" },
        { opacity: 1, y: 0, filter: "blur(0px)", duration: 0.7, stagger: 0.025, ease: "power3.out", delay: opening ? 0.5 : 0.1 },
      );
      gsap.fromTo(
        "#cinema .dialog-name",
        { opacity: 0, letterSpacing: "0.5em" },
        { opacity: 1, letterSpacing: "0.1em", duration: 1, ease: "power2.out", delay: 0.2 },
      );
      // Subtitle words surface one by one, paced to a calm reading speed.
      const W = document.querySelectorAll("#cinema .cw");
      gsap.fromTo(
        W,
        { opacity: 0, y: 6, filter: "blur(5px)" },
        { opacity: 1, y: 0, filter: "blur(0px)", duration: 0.55, ease: "power2.out", stagger: Math.min(0.09, 3.2 / Math.max(1, W.length)), delay: 0.35 },
      );
    }
    gsap.to($(".cine-progress span"), {
      width: "100%",
      duration: 8.5,
      ease: "none",
    });
  }
  finishCinematic() {
    clearTimeout(this.cineTimer);
    const d = this.cineData;
    if (!d) return;
    if (!this.state.seen.includes(d.id)) this.state.seen.push(d.id);
    this.cineData = null;
    if (this.transition.kind === "blink" && this.transition.busy) this.transition.kill();
    $("#cinema").hidden = true;
    this.scene.endCinematic();
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
    $("#hud").hidden = true;
    $("#touch").hidden = true;
    $("#perspective").innerHTML =
      `<div class="perspective-panel"><div class="perspective-top"><div class="eyebrow">${esc(this.l(VIEW_UI.title))}</div><h2>${esc(this.l(human ? VIEW_UI.human : VIEW_UI.insect))}</h2><div class="scale-ruler">${human ? "× 0.11" : "× 1"}</div></div><div class="perspective-bottom"><div><div class="eyebrow">${esc(this.l(human ? view.human : view.insect))}</div><p>${esc(this.l(view.text))}</p></div><button class="primary" id="view-return">${esc(this.l(VIEW_UI.back))}</button></div></div>`;
    $("#view-return").onclick = () => this.scene.restorePerspective?.();
  }
  hidePerspective() {
    $("#perspective").hidden = true;
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
  enterUnderwater() {
    this.enterInterior("Underwater", "underwater");
  }
  enterColony() {
    this.enterInterior("Colony", "colony");
  }
  exitColony(show = true) {
    if (!show || !this.beginTransition()) return this.exitInterior(show);
    this.audio.play("rumble", 1.25);
    this.transition
      .play("emerge", () => {
        this.exitInterior(show);
        this.mode = "transition";
        this.audio.play("chime");
      }, { cover: 0.7, hold: 0.15, reveal: 1.1 })
      .then(() => this.afterTransition());
  }
  enterInterior(key, field) {
    if (this.scene.sys.settings.key === key) return;
    if (this.scene !== this.worldScene) this.exitInterior(false);
    this.resetInput(true);
    this.worldScene = this.worldScene || this.scene;
    this.worldScene.player.setVelocity(0);
    this.game.scene.sleep("World");
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
    if (!show || !this.beginTransition()) return this.exitInterior(show);
    this.audio.play("bubbles", 1.3);
    this.transition
      .play("surface", () => {
        this.exitInterior(show);
        this.mode = "transition";
        this.audio.play("splash", 1.2);
      }, { cover: 0.75, hold: 0.1, reveal: 1.0 })
      .then(() => this.afterTransition());
  }
  exitInterior(show = true) {
    if (this.scene === this.worldScene) return;
    this.resetInput(true);
    if (this.scene.scene.isActive())
      this.game.scene.sleep(this.scene.sys.settings.key);
    this.scene = this.worldScene;
    this.game.scene.wake("World");
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
      const radius = Math.min(1, d / 40);
      const strength = radius <= 0.14 ? 0 : (radius - 0.14) / 0.86;
      this.joy = d ? { x: (x / Math.min(d, 40)) * strength,
        y: (y / Math.min(d, 40)) * strength } : { x: 0, y: 0 };
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
    const stop = (e) => {
      if (e && e.pointerId !== pointer) return;
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
