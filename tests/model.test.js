import { test } from "node:test";
import assert from "node:assert/strict";
import {
  initialState,
  migrateSave,
  markObjective,
  activeStage,
  applyEffects,
  npcBehavior,
  biomeAt,
  WW,
  WH,
} from "../src/model.js";
import { BIOMES, SPECIES, UI } from "../src/content.js";
import { QUESTS, SECRETS } from "../src/quests.js";
import { CINEMATICS } from "../src/cinematics.js";
import { VIEWS } from "../src/perspectives.js";
import { COLONY_UI, CHAMBERS } from "../src/colony-data.js";
import { TRAIL_UI, TRAILS } from "../src/traversal.js";
import { indexedDB } from "fake-indexeddb";
import { readSave, writeSave } from "../src/storage.js";
globalThis.indexedDB = indexedDB;
test("all nine chapters can be completed, with rewards and ecological effects", () => {
  const s = initialState();
  let completed = 0;
  while (s.quest < QUESTS.length) {
    const stage = activeStage(s);
    if (stage.action === "choice") applyEffects(s, stage.choices[0].effect);
    const result = markObjective(s, stage.points.length - 1);
    if (result === "quest") completed++;
    if (result === "point") {
      assert.equal(
        markObjective(s, stage.points.length - 1),
        false,
        "repeat interactions cannot double-count",
      );
      for (let i = 0; i < stage.points.length - 1; i++) {
        if (markObjective(s, i) === "quest") completed++;
      }
    }
    assert(Object.values(s.eco).every((v) => v >= 0 && v <= 100));
  }
  assert.equal(completed, 9);
  assert.equal(new Set(s.completed).size, 9);
  assert.deepEqual(s.abilities, ["compass", "glider", "scanner"]);
  assert(s.eco.water > 60);
  assert(s.eco.darkness > 40);
  assert.equal(activeStage(s), undefined);
});
test("choice paths produce different outcomes and progress survives every checkpoint", () => {
  for (let branch = 0; branch < 2; branch++) {
    let s = initialState();
    while (s.quest < QUESTS.length) {
      const st = activeStage(s);
      if (st.action === "choice") applyEffects(s, st.choices[branch].effect);
      markObjective(
        s,
        st.points.findIndex((_, i) => !s.progress.includes(i)),
      );
      s = migrateSave(JSON.parse(JSON.stringify(s)));
    }
    assert.equal(s.completed.length, 9);
    if (branch === 0) assert(s.eco.flowers >= 70);
  }
});
test("migration retains older saves; malformed or future saves are rejected", () => {
  const old = initialState();
  old.version = 1;
  delete old.underwater;
  delete old.changes;
  assert.equal(migrateSave(old).version, 7);
  assert.equal(migrateSave(old).underwater.active, false);
  for (const change of [
    { version: 99 },
    { x: NaN },
    { quest: 40 },
    { stage: 90 },
    { eco: { water: "bad" } },
    { underwater: { stage: -1 } },
    { changes: [{ x: 0, y: 0, action: "execute" }] },
    { choices: null },
    { choices: { unknown: "bad" } },
    { observations: [] },
    { played: -5 },
    { inventory: { twigs: -1 } },
    { progress: [-1] },
    { progress: [0, 0] },
  ])
    assert.throws(() => migrateSave({ ...initialState(), ...change }));
});
test("IndexedDB round-trip and separate pre-finale checkpoint", async () => {
  const s = initialState();
  s.started = true;
  s.quest = 4;
  s.stage = 1;
  s.progress = [0];
  s.discovered = ["ladybird", "ant"];
  s.underwater = {
    active: true,
    x: 805,
    y: 330,
    stage: 1,
    progress: [0],
    observed: ["daphnia"],
    done: false,
  };
  s.changes = [
    { x: 3510, y: 610, action: "restore", sprite: "sprout", quest: 2 },
  ];
  await writeSave(s, "before-ending");
  s.ended = true;
  s.quest = 8;
  s.stage = 2;
  await writeSave(s);
  const a = await readSave(),
    b = await readSave("before-ending");
  assert.equal(a.ended, true);
  assert.equal(b.ended, false);
  assert.equal(b.quest, 4);
  assert.deepEqual(b.discovered, ["ladybird", "ant"]);
  assert.equal(b.underwater.x, 805);
  assert.equal(b.changes.length, 1);
});
test("map partitions and objectives stay inside the continuous world", () => {
  assert.equal(new Set(BIOMES.map((b) => b.cell.join(","))).size, 9);
  for (const b of BIOMES)
    assert.equal(
      biomeAt(b.cell[0] * 1600 + 800, b.cell[1] * 1100 + 550).id,
      b.id,
    );
  for (const p of QUESTS.flatMap((q) =>
    q.stages.flatMap((st) => st.points),
  ).concat(SECRETS.map((s) => s.pos)))
    assert(p[0] > 0 && p[0] < WW && p[1] > 0 && p[1] < WH);
});
test("all prose is available in Russian, Kazakh and English", () => {
  const walk = (x, path = "root") => {
    if (Array.isArray(x) && x.every((t) => typeof t === "string")) {
      if (x.length === 3) x.forEach((t) => assert(t.length > 0, path));
      return;
    }
    if (x && typeof x === "object")
      for (const [k, v] of Object.entries(x)) walk(v, path + "." + k);
  };
  walk({
    UI,
    QUESTS,
    SPECIES,
    BIOMES,
    CINEMATICS,
    VIEWS,
    COLONY_UI,
    CHAMBERS,
    TRAIL_UI,
    TRAILS,
  });
  for (const v of Object.values(UI)) assert.equal(v.length, 3);
  for (const s of SPECIES)
    for (const k of ["name", "desc", "diet", "habitat", "role", "fact"])
      assert.equal(s[k].length, 3);
  assert.equal(new Set(SPECIES.map((s) => s.id)).size, SPECIES.length);
  assert.equal(SPECIES.find((s) => s.id === "spider").group, "arachnid");
  assert.equal(SPECIES.find((s) => s.id === "daphnia").group, "crustacean");
});
test("life simulation reacts to light, moisture, heat, food, pollution and observation", () => {
  const p = {
    species: "bee",
    night: false,
    humidity: 60,
    temp: 22,
    pollution: 10,
    food: true,
    distance: 200,
    observing: false,
    phase: 3,
  };
  assert.equal(npcBehavior(p), "feed");
  assert.equal(npcBehavior({ ...p, night: true, phase: 2 }), "rest");
  assert.equal(
    npcBehavior({ ...p, species: "woodlouse", humidity: 20 }),
    "shelter",
  );
  assert.equal(npcBehavior({ ...p, temp: 40 }), "rest");
  assert.equal(npcBehavior({ ...p, pollution: 90, phase: 5 }), "shelter");
  assert.equal(npcBehavior({ ...p, distance: 20 }), "defend");
  assert.equal(npcBehavior({ ...p, distance: 20, observing: true }), "feed");
  assert.equal(npcBehavior({ ...p, species: "ladybird", phase: 1 }), "hunt");
});
