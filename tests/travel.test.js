import test from "node:test";
import assert from "node:assert/strict";
import { initialState, migrateSave, biomeAt } from "../src/model.js";
import { STATIONS } from "../src/travel.js";
import { QUESTS, SECRETS } from "../src/quests.js";
import { EXPEDITIONS } from "../src/expedition-data.js";
import { reservedCrossing } from "../src/crossing-data.js";
import { COLONY_ENTRANCE } from "../src/colony-data.js";

test("every region has exactly one dandelion station inside it", () => {
  assert.equal(STATIONS.length, 9);
  for (const s of STATIONS) assert.equal(biomeAt(s.x, s.y).id, s.biome);
  assert.equal(new Set(STATIONS.map((s) => s.biome)).size, 9);
});

test("stations keep clear of quests, secrets, expedition portals, the citadel and the crossing", () => {
  const points = [
    ...QUESTS.flatMap((q) => q.stages.flatMap((st) => st.points)),
    ...SECRETS.map((s) => s.pos),
    ...EXPEDITIONS.map((e) => e.portal),
    [COLONY_ENTRANCE.x, COLONY_ENTRANCE.y],
    [3720, 1440], // underwater dive marker
  ];
  for (const s of STATIONS) {
    assert(!reservedCrossing(s.x, s.y), `station ${s.biome} inside the crossing area`);
    for (const [x, y] of points)
      assert(Math.hypot(s.x - x, s.y - y) > 110, `station ${s.biome} too close to ${x},${y}`);
  }
});

test("older saves gain an empty wind network; malformed stations are dropped", () => {
  const old = initialState();
  delete old.travel;
  old.started = true;
  assert.deepEqual(migrateSave(old).travel, { stations: [] });
  const dup = { ...initialState(), travel: { stations: [2, 2, 5] } };
  assert.deepEqual(migrateSave(dup).travel.stations, [2, 5]);
  assert.deepEqual(migrateSave({ ...initialState(), travel: { stations: [12, 1.5, "3"] } }).travel.stations, []);
  assert.deepEqual(migrateSave({ ...initialState(), travel: { stations: "all" } }).travel.stations, []);
});
