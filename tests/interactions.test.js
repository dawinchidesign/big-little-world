import test from "node:test";
import assert from "node:assert/strict";
import { initialState, migrateSave } from "../src/model.js";
import { PROP_ACTIONS, WORLD_UI, VERBS } from "../src/interactions.js";

test("every touchable prop has a three-language label, fact and counter", () => {
  for (const a of Object.values(PROP_ACTIONS)) {
    assert.equal(a.label.length, 3);
    assert(VERBS.includes(a.verb));
    if (a.reveal) assert(a.reveal.length > 0);
  }
  for (const v of VERBS) {
    assert.equal(WORLD_UI.facts[v].length, 3);
    assert.equal(WORLD_UI.counts[v].length, 3);
  }
});

test("saves gain an empty living-world record; malformed entries are dropped", () => {
  const old = initialState();
  delete old.world;
  const s = migrateSave(old);
  assert.deepEqual(s.world.cleaned, []);
  assert.equal(s.world.counts.clean, 0);
  const dup = { ...initialState(), world: { cleaned: [5001, 5001], facts: ["dew", "dew", "nope"], counts: { dew: 2 } } };
  const m = migrateSave(dup);
  assert.deepEqual(m.world.cleaned, [5001]);
  assert.deepEqual(m.world.facts, ["dew"]);
  assert.equal(m.world.counts.dew, 2);
  assert.equal(m.world.counts.bounce, 0);
  const bad = migrateSave({ ...initialState(), world: { cleaned: ["x", -1], facts: "all", counts: { dew: -1 } } });
  assert.deepEqual(bad.world.cleaned, []);
  assert.deepEqual(bad.world.facts, []);
  assert.equal(bad.world.counts.dew, 0);
});
