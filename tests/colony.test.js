import test from "node:test";
import assert from "node:assert/strict";
import {
  COLONY_SPAWN,
  CHAMBERS,
  NOTE_POINTS,
  COLONY_OBJECTIVES,
  makeColonyGrid,
  colonyPath,
  cellPoint,
  walkable,
  bridgeIsOpen,
  colonyFloorAt,
} from "../src/colony-data.js";
import { initialState, migrateSave } from "../src/model.js";

test("the damaged corridor blocks only the brood chamber and opens after repair", () => {
  const closed = makeColonyGrid(false),
    open = makeColonyGrid(true);
  for (const room of CHAMBERS) {
    const p = cellPoint(room.cx, room.cy);
    assert(
      colonyPath(open, COLONY_SPAWN, p).length > 0,
      room.id + " connects to the entrance",
    );
    assert.equal(
      colonyPath(closed, COLONY_SPAWN, p).length > 0,
      room.id !== "brood",
      room.id + " gating",
    );
  }
  for (const point of [...COLONY_OBJECTIVES[0], ...COLONY_OBJECTIVES[1]])
    assert(
      colonyPath(closed, COLONY_SPAWN, point).length > 0,
      "all materials and the repair point are reachable before repair",
    );
  assert(colonyPath(open, COLONY_SPAWN, COLONY_OBJECTIVES[2][0]).length > 0);
});
test("ant routes and chamber observations stay on navigable cells without crossing earth", () => {
  const grid = makeColonyGrid(true);
  for (const from of Object.values(NOTE_POINTS))
    for (const to of Object.values(NOTE_POINTS)) {
      const route = colonyPath(grid, from, to);
      assert(route.length);
      for (const [i, p] of route.entries()) {
        assert(walkable(grid, p.x, p.y));
        assert(colonyFloorAt(p.x, p.y));
        if (i) {
          const prev = route[i - 1];
          for (let f = 0; f <= 1; f += 0.125) {
            const x = prev.x + (p.x - prev.x) * f,
              y = prev.y + (p.y - prev.y) * f;
            for (const [dx, dy] of [
              [-9, 0],
              [9, 0],
              [0, -9],
              [0, 9],
            ])
              assert(
                colonyFloorAt(x + dx, y + dy),
                "continuous clearance on curved route",
              );
          }
        }
        if (i)
          assert.equal(
            Math.abs(p.x - route[i - 1].x) + Math.abs(p.y - route[i - 1].y),
            64,
            "routes advance one adjacent tile",
          );
      }
    }
});
test("v3 saves gain a safe underground state and v4 preserves entry, notes and chapter gate", () => {
  const old = initialState();
  old.version = 3;
  delete old.colony;
  const migrated = migrateSave(old);
  assert.equal(migrated.version, 4);
  assert.equal(migrated.colony.active, false);
  const state = initialState();
  state.quest = 1;
  state.stage = 2;
  state.colony = {
    ...state.colony,
    active: true,
    ...cellPoint(23, 7),
    visited: ["brood"],
    notes: ["queen"],
  };
  const restored = migrateSave(JSON.parse(JSON.stringify(state)));
  assert.deepEqual(restored.colony, state.colony);
  assert(bridgeIsOpen(restored));
  state.stage = 1;
  assert(!bridgeIsOpen(state));
  for (const colony of [
    { ...state.colony, notes: ["fake"] },
    { ...state.colony, x: NaN },
    { ...state.colony, active: "yes" },
  ])
    assert.throws(() => migrateSave({ ...state, colony }));
  assert.throws(() =>
    migrateSave({
      ...state,
      underwater: { ...state.underwater, active: true },
    }),
  );
});
