import test from "node:test";
import assert from "node:assert/strict";
import { initialState, migrateSave } from "../src/model.js";
import { PROP_ACTIONS, WORLD_UI } from "../src/interactions.js";
import { THEMES } from "../src/music.js";
import { SPECIES } from "../src/content.js";

test("every prop verb has a label, a fact and a journal counter in three languages", () => {
  for (const a of Object.values(PROP_ACTIONS)) {
    assert.equal(a.label.length, 3);
    assert.equal(WORLD_UI.facts[a.verb].length, 3);
    assert.equal(WORLD_UI.counts[a.verb].length, 3);
    for (const id of a.reveal || []) assert(SPECIES.some((s) => s.id === id), `unknown creature ${id}`);
  }
});

test("older saves gain an empty world record; damaged ones are rejected", () => {
  const old = initialState();
  delete old.world;
  const s = migrateSave(old);
  assert.deepEqual(s.world.cleaned, []);
  assert.equal(s.world.counts.clean, 0);
  const dup = { ...initialState(), world: { cleaned: [5001, 5001], facts: ["dew"], counts: { dew: 2 } } };
  const m = migrateSave(dup);
  assert.deepEqual(m.world.cleaned, [5001]);
  assert.equal(m.world.counts.dew, 2);
  assert.equal(m.world.counts.bounce, 0);
  assert.throws(() => migrateSave({ ...initialState(), world: { cleaned: ["x"], facts: [], counts: {} } }));
  assert.throws(() => migrateSave({ ...initialState(), world: { cleaned: [], facts: [], counts: { dew: -1 } } }));
});

test("each region and interior has a music theme", () => {
  for (const key of [0, 1, 2, 3, 4, 5, 6, 7, 8, "water", "colony"]) {
    const t = THEMES[key];
    assert(t && t.bpm > 40 && t.bpm < 140 && t.prog.length >= 4, `theme ${key}`);
  }
});
