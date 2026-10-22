import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync, existsSync } from "node:fs";

test("release metadata is consistent", async () => {
  const pkg = JSON.parse(readFileSync("package.json", "utf8"));
  const release = readFileSync("src/release.js", "utf8");
  assert.match(release, new RegExp(`VERSION = "${pkg.version.replace(/\./g, "\\.")}"`));
  const manifest = JSON.parse(readFileSync("public/manifest.webmanifest", "utf8"));
  for (const icon of manifest.icons) assert(existsSync("public/" + icon.src.replace("./", "")), icon.src);
  assert(manifest.icons.some((i) => i.sizes === "512x512" && i.purpose === "maskable"));
  assert(existsSync("public/icon-180.png"));
});

test("service worker generator emits parseable code", () => {
  const script = readFileSync("scripts/package.mjs", "utf8");
  assert.match(script, /new Function\(sw\)/);
  if (existsSync("dist/sw.js")) new Function(readFileSync("dist/sw.js", "utf8"));
});
