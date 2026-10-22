import test from "node:test";
import assert from "node:assert/strict";
import { initialState, migrateSave, biomeAt } from "../src/model.js";
import { STATIONS } from "../src/travel.js";
import { QUESTS, SECRETS } from "../src/quests.js";

test("every region has exactly one dandelion station inside it", () => {
  assert.equal(STATIONS.length, 9);
  for (const s of STATIONS) assert.equal(biomeAt(s.x, s.y).id, s.biome);
  assert.equal(new Set(STATIONS.map((s) => s.biome)).size, 9);
});

test("stations keep clear of quest objectives and secrets", () => {
  const points = [
    ...QUESTS.flatMap((q) => q.stages.flatMap((st) => st.points)),
    ...SECRETS.map((s) => s.pos),
  ];
  for (const s of STATIONS)
    for (const [x, y] of points)
      assert(Math.hypot(s.x - x, s.y - y) > 110, `station ${s.biome} too close to ${x},${y}`);
});

test("older saves gain an empty wind network; invalid stations are rejected", () => {
  const old = initialState();
  delete old.travel;
  old.started = true;
  assert.deepEqual(migrateSave(old).travel, { stations: [] });
  const dup = { ...initialState(), travel: { stations: [2, 2, 5] } };
  assert.deepEqual(migrateSave(dup).travel.stations, [2, 5]);
  assert.throws(() => migrateSave({ ...initialState(), travel: { stations: [12] } }));
  assert.throws(() => migrateSave({ ...initialState(), travel: { stations: "all" } }));
});
