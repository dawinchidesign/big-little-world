import { test } from "node:test";
import assert from "node:assert/strict";
import {
  Traversal,
  TRAILS,
  emptyTraversal,
  contains,
} from "../src/traversal.js";
import { initialState, migrateSave } from "../src/model.js";

const dt = 1 / 60;
function climb(route) {
  const p = route.platforms[0],
    t = new Traversal(emptyTraversal(), p.x, p.y);
  assert(t.attach(route.id, p.x, p.y));
  for (let i = 0; i < 180 && t.climb; i++)
    t.tick({ x: p.x, y: p.y, vertical: -1, dt });
  assert.equal(t.platform, p.id);
  assert.equal(t.z, p.z);
  return t;
}
test("stems require proximity and support controlled climbing and descending", () => {
  const r = TRAILS[0],
    p = r.platforms[0],
    t = new Traversal();
  assert.equal(t.attach(r.id, p.x + 200, p.y), false);
  assert(t.attach(r.id, p.x, p.y));
  t.tick({ x: p.x, y: p.y, vertical: -1, dt: 0.4 });
  assert.equal(t.z, 40);
  t.tick({ x: p.x, y: p.y, vertical: 0, dt: 0.5 });
  assert.equal(t.z, 40);
  t.tick({ x: p.x, y: p.y, vertical: 1, dt: 0.4 });
  assert.equal(t.z, 0);
  assert.equal(t.climb, null);
  const top = climb(r);
  assert(top.attach(r.id, p.x, p.y));
  for (let i = 0; i < 120; i++) top.tick({ x: p.x, y: p.y, vertical: 1, dt });
  assert.equal(top.z, 0);
  assert.equal(top.climb, null);
});
test("every authored canopy route can be crossed by walking or jumping", () => {
  for (const route of TRAILS) {
    const t = climb(route);
    let x = t.lastX,
      y = t.lastY;
    for (const p of route.platforms.slice(1)) {
      const from = route.platforms.find((a) => a.id === t.platform);
      for (let i = 0; i < 160 && Math.hypot(from.x - x, from.y - y) > 3; i++) {
        const d = Math.hypot(from.x - x, from.y - y);
        x += ((from.x - x) / d) * 2;
        y += ((from.y - y) / d) * 2;
        const v = t.tick({ x, y, dt });
        x = v.x;
        y = v.y;
      }
      if (
        Math.abs(p.z - from.z) <= 6 &&
        Math.hypot(p.x - from.x, p.y - from.y) < p.rx + from.rx
      ) {
        while (Math.hypot(p.x - x, p.y - y) > 3) {
          const d = Math.hypot(p.x - x, p.y - y);
          x += ((p.x - x) / d) * 2;
          y += ((p.y - y) / d) * 2;
          const v = t.tick({ x, y, dt });
          x = v.x;
          y = v.y;
        }
      } else {
        assert(t.jump());
        const dx = p.x - x,
          dy = p.y - y,
          d = Math.hypot(dx, dy);
        for (let i = 0; i < 120 && t.airborne; i++) {
          x += (dx / d) * 185 * dt;
          y += (dy / d) * 185 * dt;
          const v = t.tick({ x, y, dt });
          x = v.x;
          y = v.y;
        }
      }
      assert.equal(t.platform, p.id, route.id + " cannot reach " + p.id);
      assert.equal(t.z, p.z);
    }
  }
});
test("leaf edge retains the last supported point and requires a jump", () => {
  const t = climb(TRAILS[0]),
    p = TRAILS[0].platforms[0];
  const v = t.tick({ x: p.x + p.rx + 50, y: p.y, dt });
  assert.equal(v.edge, true);
  assert.equal(v.x, p.x);
  assert(contains(p, v.x, v.y));
  assert.equal(t.z, p.z);
  assert(t.jump());
});
test("ground jumps cannot bypass climbing, while a glider slows a descent", () => {
  const p = TRAILS[0].platforms[0],
    ground = new Traversal(emptyTraversal(), p.x, p.y);
  ground.jump();
  let peak = 0;
  for (let i = 0; i < 100; i++) {
    ground.tick({ x: p.x, y: p.y, dt });
    peak = Math.max(peak, ground.z);
  }
  assert(peak < 60);
  assert.equal(ground.platform, null);
  const normal = climb(TRAILS[0]),
    glider = climb(TRAILS[0]);
  normal.jump();
  glider.jump();
  for (let i = 0; i < 110; i++) {
    normal.tick({ x: 1800, y: 900, dt });
    glider.tick({ x: 1800, y: 900, dt, glider: true });
  }
  assert.equal(normal.z, 0);
  assert(glider.z > 20);
  assert(glider.gliding);
});
test("v2 saves migrate without losing progress; leaf and stem positions restore", () => {
  const s = initialState();
  s.version = 2;
  delete s.traversal;
  s.completed = ["scout"];
  const migrated = migrateSave(s);
  assert.deepEqual(migrated.completed, ["scout"]);
  assert.equal(migrated.version, 7);
  const p = TRAILS[0].platforms[0],
    top = climb(TRAILS[0]);
  const restored = new Traversal(top.snapshot(), p.x, p.y);
  assert.equal(restored.platform, p.id);
  assert.equal(restored.z, p.z);
  const mid = new Traversal();
  mid.attach(TRAILS[0].id, p.x, p.y);
  mid.tick({ x: p.x, y: p.y, vertical: -1, dt: 0.6 });
  const resumed = new Traversal(mid.snapshot(), p.x, p.y);
  assert.equal(resumed.climb, TRAILS[0].id);
  assert.equal(resumed.z, 60);
  const stale = new Traversal(top.snapshot(), 100, 100);
  assert.equal(stale.z, 0);
  assert.equal(stale.platform, null);
});
