import { BIOMES } from "./content.js";
import { QUESTS } from "./quests.js";
import { emptyTraversal, byPlatform, byTrail, TRAILS } from "./traversal.js";
import { emptyCrossing, validateCrossing } from './crossing-data.js';
import {emptyObjects,validateObjects} from './environment-model.js';
import {emptyHorizon,validateHorizon} from './expedition-data.js';
import {
  emptyColony,
  CHAMBERS,
  COLONY_WIDTH,
  COLONY_HEIGHT,
  makeColonyGrid,
  bridgeIsOpen,
  nearestFloor,
} from "./colony-data.js";
export const BW = 1600,
  BH = 1100,
  WW = BW * 3,
  WH = BH * 3,
  SAVE_VERSION = 7;
export const clamp = (v, a = 0, b = 100) => Math.max(a, Math.min(b, v));
export function biomeAt(x, y) {
  const cx = clamp(Math.floor(x / BW), 0, 2),
    cy = clamp(Math.floor(y / BH), 0, 2);
  return BIOMES.find((b) => b.cell[0] === cx && b.cell[1] === cy);
}
export function initialState() {
  return {
    version: SAVE_VERSION,
    x: 540,
    y: 620,
    quest: 0,
    stage: 0,
    progress: [],
    completed: [],
    discovered: [],
    secrets: [],
    visited: [0],
    abilities: [],
    choices: {},
    eco: { water: 32, flowers: 22, soil: 28, darkness: 18, safety: 25 },
    time: 8.1,
    seen: [],
    started: false,
    ended: false,
    played: 0,
    settings: {
      lang: "ru",
      music: 0.3,
      ambience: 0.42,
      effects: 0.45,
      voice: 0.88,
      narration: true,
      low: false,
    },
    observations: {},
    inventory: { twigs: 0, dew: 0, leaves: 0 },
    changes: [],
    traversal: emptyTraversal(),
    colony: emptyColony(),
    crossing: emptyCrossing(),
    objects: emptyObjects(),
    horizon: emptyHorizon(),
    underwater: {
      active: false,
      x: 240,
      y: 260,
      stage: 0,
      progress: [],
      observed: [],
      done: false,
    },
  };
}
export function migrateSave(input) {
  if (
    !input ||
    typeof input !== "object" ||
    !Number.isInteger(input.version) ||
    input.version < 1 ||
    input.version > SAVE_VERSION
  )
    throw Error("Incompatible save");
  const base = initialState();
  const s = {
    ...base,
    ...input,
    eco: { ...base.eco, ...input.eco },
    settings: { ...base.settings, ...input.settings },
    inventory: { ...base.inventory, ...input.inventory },
    underwater: { ...base.underwater, ...input.underwater },
    changes: Array.isArray(input.changes) ? input.changes : [],
    traversal: { ...base.traversal, ...input.traversal },
    colony: { ...base.colony, ...input.colony },
    crossing: validateCrossing(input.crossing),
    objects: validateObjects(input.objects),
    horizon: validateHorizon(input.horizon),
    version: SAVE_VERSION,
  };
  for (const k of [
    "progress",
    "completed",
    "discovered",
    "secrets",
    "visited",
    "abilities",
    "seen",
  ])
    if (
      !Array.isArray(s[k]) ||
      s[k].some((v) => !["string", "number"].includes(typeof v))
    )
      throw Error("Invalid save");
  if (
    !Number.isFinite(s.x) ||
    !Number.isFinite(s.y) ||
    !Number.isFinite(s.time) ||
    !Number.isInteger(s.quest) ||
    s.quest < 0 ||
    s.quest > QUESTS.length ||
    !Number.isInteger(s.stage) ||
    s.stage < 0 ||
    (s.quest < QUESTS.length && s.stage >= QUESTS[s.quest].stages.length)
  )
    throw Error("Invalid progress");
  s.x = clamp(s.x, 40, WW - 40);
  s.y = clamp(s.y, 40, WH - 40);
  if(s.horizon.active&&(s.colony.active||s.underwater.active||s.crossing.boat.aboard))throw Error('Two active worlds');
  s.time = ((s.time % 24) + 24) % 24;
  const record = (value) =>
    value && typeof value === "object" && !Array.isArray(value);
  if (
    !record(s.choices) ||
    !record(s.observations) ||
    typeof s.started !== "boolean" ||
    typeof s.ended !== "boolean" ||
    !Number.isFinite(s.played) ||
    s.played < 0
  )
    throw Error("Invalid player state");
  if (
    Object.entries(s.choices).some(
      ([key, value]) =>
        !QUESTS.some(
          (q) =>
            q.id === key &&
            q.stages.some((st) => st.choices?.some((c) => c.key === value)),
        ),
    )
  )
    throw Error("Invalid choice");
  for (const key in base.inventory)
    if (!Number.isFinite(s.inventory[key]) || s.inventory[key] < 0)
      throw Error("Invalid inventory");
  s.settings.low = Boolean(s.settings.low);
  if (
    s.progress.some(
      (i) =>
        !Number.isInteger(i) ||
        i < 0 ||
        i >= (QUESTS[s.quest]?.stages[s.stage]?.points.length || 1),
    ) ||
    new Set(s.progress).size !== s.progress.length
  )
    throw Error("Invalid objective progress");
  for (const k in base.eco) {
    if (!Number.isFinite(s.eco[k])) throw Error("Invalid ecology");
    s.eco[k] = clamp(s.eco[k]);
  }
  if (!["ru", "kk", "en"].includes(s.settings.lang)) s.settings.lang = "ru";
  s.settings.narration = s.settings.narration !== false;
  for (const k of ["music", "ambience", "effects", "voice"])
    s.settings[k] = clamp(Number(s.settings[k]) || 0, 0, 1);
  if (
    !Array.isArray(s.underwater.progress) ||
    !Array.isArray(s.underwater.observed) ||
    !Number.isInteger(s.underwater.stage) ||
    s.underwater.stage < 0 ||
    s.underwater.stage > 3 ||
    ![s.underwater.x, s.underwater.y].every(Number.isFinite)
  )
    throw Error("Invalid underwater state");
  s.underwater.x = clamp(s.underwater.x, 45, 1555);
  s.underwater.y = clamp(s.underwater.y, 50, 1050);
  const colony = s.colony;
  if (
    ![colony.x, colony.y].every(Number.isFinite) ||
    typeof colony.active !== "boolean" ||
    !Array.isArray(colony.visited) ||
    !Array.isArray(colony.notes) ||
    [...colony.visited, ...colony.notes].some(
      (id) => !CHAMBERS.some((r) => r.id === id),
    ) ||
    (colony.active && s.underwater.active)
  )
    throw Error("Invalid colony state");
  colony.x = clamp(colony.x, 40, COLONY_WIDTH - 40);
  colony.y = clamp(colony.y, 40, COLONY_HEIGHT - 40);
  Object.assign(
    colony,
    nearestFloor(makeColonyGrid(bridgeIsOpen(s)), colony.x, colony.y),
  );
  const t = s.traversal;
  if(s.crossing.boat.aboard){
    if(s.colony.active||s.underwater.active)throw Error('Ferry in inactive world');
    s.x=s.crossing.boat.x;s.y=s.crossing.boat.y-8;
  }
  if (
    !Number.isFinite(t.z) ||
    t.z < 0 ||
    t.z > 500 ||
    (t.platform !== null && !byPlatform(t.platform)) ||
    (t.climb !== null && !byTrail(t.climb)) ||
    (t.climb !== null && t.platform !== null) ||
    !Array.isArray(t.visited) ||
    !Array.isArray(t.completed) ||
    [...t.visited, ...t.completed].some(
      (id) => !TRAILS.some((route) => route.id === id),
    )
  )
    throw Error("Invalid canopy state");
  for (const ch of s.changes)
    if (
      !Number.isFinite(ch.x) ||
      !Number.isFinite(ch.y) ||
      !["restore", "build", "shade", "clear"].includes(ch.action)
    )
      throw Error("Invalid world changes");
  return s;
}
export function applyEffects(s, e = {}) {
  for (const [k, v] of Object.entries(e)) s.eco[k] = clamp(s.eco[k] + v);
}
export function activeStage(s) {
  return QUESTS[s.quest]?.stages[s.stage];
}
export function markObjective(s, index) {
  const stage = activeStage(s);
  if (
    !stage ||
    index < 0 ||
    index >= stage.points.length ||
    s.progress.includes(index)
  )
    return false;
  s.progress.push(index);
  if (s.progress.length === stage.points.length) {
    applyEffects(s, stage.effect);
    s.progress = [];
    s.stage++;
    if (s.stage >= QUESTS[s.quest].stages.length) {
      const q = QUESTS[s.quest];
      s.completed.push(q.id);
      if (q.reward && !s.abilities.includes(q.reward))
        s.abilities.push(q.reward);
      s.quest++;
      s.stage = 0;
      return "quest";
    }
    return "stage";
  }
  return "point";
}
export function npcBehavior({
  species,
  night,
  humidity,
  temp,
  pollution,
  food,
  distance,
  observing,
  phase,
}) {
  if (
    distance < 55 &&
    !observing &&
    ["butterfly", "bee", "moth"].includes(species)
  )
    return "defend";
  if (pollution > 65 && phase % 5 === 0) return "shelter";
  if (
    ["firefly", "moth", "cricket"].includes(species) !== night &&
    phase % 3 !== 0
  )
    return "rest";
  if (humidity < 40 && ["woodlouse", "springtail"].includes(species))
    return "shelter";
  if (temp < 12 || temp > 36) return "rest";
  if (food && phase % 3 === 0) return "feed";
  if (
    ["ladybird", "mantis", "dragonfly", "spider"].includes(species) &&
    phase % 3 === 1
  )
    return "hunt";
  return phase % 4 === 0 ? "interact" : "move";
}
