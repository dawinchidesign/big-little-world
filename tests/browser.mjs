// Real-browser acceptance run (Chromium + WebGL) for the production build.
// Usage: npm run build && npm run test:browser
// Optional: CHROMIUM_PATH=/path/to/chrome when Playwright's own browser is not installed.
import { createServer } from "node:http";
import { readFileSync, existsSync, statSync, mkdtempSync, rmSync } from "node:fs";
import { join, extname, resolve } from "node:path";
import { tmpdir } from "node:os";
import { pathToFileURL } from "node:url";
import assert from "node:assert/strict";
import { chromium, devices } from "playwright";

const root = resolve("dist");
const offline = resolve("release/PLAY_OFFLINE.html");
assert(existsSync(join(root, "index.html")) && existsSync(offline), "run `npm run build` first");
const types = { ".html": "text/html; charset=utf-8", ".js": "text/javascript", ".css": "text/css", ".png": "image/png", ".svg": "image/svg+xml", ".woff": "font/woff", ".json": "application/json", ".webmanifest": "application/manifest+json" };
const server = createServer((req, res) => {
  let path = decodeURIComponent(new URL(req.url, "http://x").pathname);
  if (path.endsWith("/")) path += "index.html";
  const file = join(root, path);
  if (!file.startsWith(root) || !existsSync(file) || statSync(file).isDirectory()) {
    res.writeHead(404).end("not found");
    return;
  }
  res.writeHead(200, { "content-type": types[extname(file)] || "application/octet-stream" });
  res.end(readFileSync(file));
});
await new Promise((r) => server.listen(0, "127.0.0.1", r));
const URL_ROOT = `http://127.0.0.1:${server.address().port}/`;
const launch = {
  executablePath: process.env.CHROMIUM_PATH || (existsSync("/opt/pw-browsers/chromium") ? "/opt/pw-browsers/chromium" : undefined),
  args: ["--use-gl=angle", "--use-angle=swiftshader", "--enable-unsafe-swiftshader", "--autoplay-policy=no-user-gesture-required"],
};
const profiles = [];
const ignored = /willReadFrequently/;
function watch(page) {
  const problems = [];
  page.on("console", (m) => {
    if ((m.type() === "error" || m.type() === "warning") && !ignored.test(m.text())) problems.push(m.type() + ": " + m.text());
  });
  page.on("pageerror", (e) => problems.push("pageerror: " + e.message));
  return problems;
}
async function context(options = {}) {
  const dir = mkdtempSync(join(tmpdir(), "little-world-browser-"));
  profiles.push(dir);
  const ctx = await chromium.launchPersistentContext(dir, { ...launch, viewport: { width: 1366, height: 768 }, ...options });
  return ctx;
}
const app = (page, fn, arg) => page.evaluate(fn, arg);
const info = (page) =>
  app(page, () => {
    const a = window.littleWorld.app;
    const shown = (s) => !document.querySelector(s).hidden;
    return { mode: a.mode, scene: a.scene.sys.settings.key, cinema: shown("#cinema"), perspective: shown("#perspective"), dialog: shown("#dialog"), x: a.state.x, y: a.state.y, renderer: a.game.renderer.type };
  });
async function ready(page) {
  await page.waitForSelector("#new, #continue, #retry", { timeout: 120000 });
  assert(!(await page.$("#retry")), "boot reached the recovery screen");
}
async function settle(page, tap = false) {
  for (let i = 0; i < 12; i++) {
    const s = await info(page);
    if (s.mode === "dialog") await (tap ? page.tap("#dialog-next") : page.click("#dialog-next"));
    else if (s.mode === "cinematic") await (tap ? page.tap("#cine-skip") : page.click("#cine-skip"));
    else if (s.mode === "perspective") {
      await page.waitForSelector("#view-return");
      await page.waitForTimeout(5600);
      await (tap ? page.tap("#view-return") : page.click("#view-return"));
      await page.waitForTimeout(1600);
    } else if (s.mode === "play") {
      await page.waitForTimeout(700);
      if ((await info(page)).mode === "play") return;
    }
    await page.waitForTimeout(600);
  }
  assert.equal((await info(page)).mode, "play", "returned to free play");
}
const checks = [];
const pass = (name) => {
  checks.push(name);
  console.log("OK", name);
};

try {
  // 1. Desktop: WebGL boot, opening sequence, HUD panels, replays, interiors, persistence.
  {
    const ctx = await context();
    const page = ctx.pages()[0];
    const problems = watch(page);
    await page.goto(URL_ROOT);
    await ready(page);
    assert.equal((await info(page)).renderer, 2, "WebGL renderer");
    pass("desktop boot with WebGL");
    await page.click("#new");
    await page.waitForTimeout(1800);
    let s = await info(page);
    assert.equal(s.mode, "cinematic");
    assert.equal(s.perspective, false, "two-views overlay must not open under the prologue");
    pass("prologue owns the screen");
    await settle(page);
    for (const [key, mode] of [["m", "map"], ["j", "journal"], ["Escape", "pause"]]) {
      await page.keyboard.press(key);
      await page.waitForTimeout(600);
      assert.equal((await info(page)).mode, mode);
      await page.keyboard.press("Escape");
      await page.waitForTimeout(500);
      assert.equal((await info(page)).mode, "play");
    }
    pass("map, journal and pause open and close");
    await page.keyboard.down("d");
    await page.waitForTimeout(1200);
    await page.keyboard.up("d");
    await settle(page);
    const moved = await info(page);
    assert(moved.x > 560, "hero walks with the keyboard");
    pass("keyboard movement");
    await app(page, () => {
      const a = window.littleWorld.app;
      for (const id of ["citadel", "night"]) if (!a.state.seen.includes(id)) a.state.seen.push(id);
    });
    for (const id of ["citadel", "night"]) {
      await page.keyboard.press("j");
      await page.waitForTimeout(500);
      await page.click('#overlay [data-tab="cinema"]');
      await page.waitForTimeout(400);
      await page.click(`#overlay [data-cine="${id}"]`);
      await page.waitForTimeout(1800);
      await page.click("#cine-skip");
      await page.waitForTimeout(1500);
      s = await info(page);
      assert.equal(s.scene, "World", `replay of ${id} returns to the original level`);
      assert.equal(s.mode, "play");
    }
    pass("journal replays keep the player where they were");
    await app(page, () => window.littleWorld.app.enterUnderwater());
    await page.waitForTimeout(2500);
    await settle(page);
    assert.equal((await info(page)).scene, "Underwater");
    await app(page, () => window.littleWorld.app.exitInterior());
    await page.waitForTimeout(1200);
    await app(page, () => window.littleWorld.app.enterColony());
    await page.waitForTimeout(2500);
    await settle(page);
    assert.equal((await info(page)).scene, "Colony");
    await app(page, () => window.littleWorld.app.exitInterior());
    await page.waitForTimeout(1200);
    assert.equal((await info(page)).scene, "World");
    pass("underwater garden and ant citadel render and return");
    await app(page, () => window.littleWorld.app.save(true));
    await page.waitForTimeout(800);
    await page.reload();
    await ready(page);
    assert(await page.$("#continue"), "continue offered after reload");
    await page.click("#continue");
    await page.waitForTimeout(1500);
    assert.equal((await info(page)).mode, "play");
    pass("IndexedDB save survives reload");
    // Service worker: installs, caches the build, and serves the game offline.
    const sw = await app(page, async () => {
      const reg = await Promise.race([navigator.serviceWorker.ready, new Promise((r) => setTimeout(() => r(null), 20000))]);
      const keys = await caches.keys();
      return { active: !!reg?.active, caches: keys.length };
    });
    assert(sw.active && sw.caches === 1, "service worker active with one versioned cache");
    await page.waitForTimeout(1500);
    await ctx.setOffline(true);
    await page.reload();
    await ready(page);
    await ctx.setOffline(false);
    pass("service worker serves the game offline");
    assert.deepEqual(problems, [], "no console errors or warnings");
    pass("clean desktop console");
    await ctx.close();
  }
  // 2. Portable single file over file://.
  {
    const ctx = await context();
    const page = ctx.pages()[0];
    const problems = watch(page);
    await page.goto(pathToFileURL(offline).href);
    await ready(page);
    await page.click("#new");
    await page.waitForTimeout(1500);
    await settle(page);
    assert.deepEqual(problems, []);
    pass("PLAY_OFFLINE.html boots and plays from file://");
    await ctx.close();
  }
  // 3. Phone in landscape: touch controls and joystick.
  {
    const { defaultBrowserType, ...phone } = devices["iPhone 13 landscape"];
    const ctx = await context(phone);
    const page = ctx.pages()[0];
    const problems = watch(page);
    await page.goto(URL_ROOT);
    await ready(page);
    await page.tap("#new");
    await page.waitForTimeout(1500);
    await settle(page, true);
    assert(await app(page, () => !document.querySelector("#touch").hidden), "touch controls shown");
    const box = await (await page.$("#stick")).boundingBox();
    const cx = box.x + box.width / 2,
      cy = box.y + box.height / 2;
    const before = (await info(page)).x;
    const cdp = await ctx.newCDPSession(page);
    await cdp.send("Input.dispatchTouchEvent", { type: "touchStart", touchPoints: [{ x: cx, y: cy }] });
    for (let i = 1; i <= 10; i++) {
      await cdp.send("Input.dispatchTouchEvent", { type: "touchMove", touchPoints: [{ x: cx + i * 4, y: cy }] });
      await page.waitForTimeout(30);
    }
    await page.waitForTimeout(1200);
    await cdp.send("Input.dispatchTouchEvent", { type: "touchEnd", touchPoints: [] });
    assert((await info(page)).x > before + 60, "joystick moves the hero");
    await page.tap("#map-open");
    await page.waitForTimeout(600);
    assert.equal((await info(page)).mode, "map");
    assert.deepEqual(problems, []);
    pass("phone landscape: joystick and HUD buttons");
    await ctx.close();
  }
  console.log(`BROWSER ACCEPTANCE PASSED (${checks.length} checks, Chromium WebGL)`);
} finally {
  server.close();
  for (const dir of profiles) rmSync(dir, { recursive: true, force: true });
}
