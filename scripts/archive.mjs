import {
  cpSync,
  copyFileSync,
  mkdirSync,
  mkdtempSync,
  readdirSync,
  readFileSync,
  writeFileSync,
  statSync,
} from "node:fs";
import { tmpdir } from "node:os";
import { join, resolve, relative } from "node:path";
import { createHash } from "node:crypto";
import { spawnSync } from "node:child_process";

const root = process.cwd();
const stage = mkdtempSync(join(tmpdir(), "little-world-release-"));
const source = join(stage, "Source");
mkdirSync(source);
const entries = [
  "src",
  "public",
  "art-source",
  "voice-source",
  "scripts",
  "tests",
  "LICENSES",
  "docs",
  "package.json",
  "package-lock.json",
  "index.html",
  "vite.config.js",
  "netlify.toml",
  "README.md",
];
for (const name of entries)
  cpSync(join(root, name), join(source, name), { recursive: true });
cpSync(join(root, "dist"), join(stage, "Netlify"), { recursive: true });
copyFileSync(
  join(root, "release/PLAY_OFFLINE.html"),
  join(stage, "PLAY_OFFLINE.html"),
);
copyFileSync(join(root, "docs/START_HERE.md"), join(stage, "START_HERE.md"));
cpSync(join(root, "docs/screenshots"), join(stage, "Screenshots"), { recursive: true });
copyFileSync(
  join(root, "docs/RELEASE_NOTES.md"),
  join(stage, "RELEASE_NOTES.md"),
);
const files = [];
function walk(dir) {
  for (const name of readdirSync(dir).sort()) {
    const path = join(dir, name);
    if (statSync(path).isDirectory()) walk(path);
    else files.push(path);
  }
}
walk(stage);
writeFileSync(
  join(stage, "CHECKSUMS.sha256"),
  files
    .map(
      (path) =>
        `${createHash("sha256").update(readFileSync(path)).digest("hex")}  ${relative(stage, path)}`,
    )
    .join("\n") + "\n",
);
const zipPath = join(stage, "release.zip");
const result = spawnSync(
  "zip",
  ["-q", "-r", zipPath, ".", "-x", "release.zip"],
  { cwd: stage, encoding: "utf8" },
);
if (result.status !== 0) throw Error(result.stderr || "Archive failed");
const check = spawnSync("unzip", ["-t", zipPath], { encoding: "utf8" });
if (check.status !== 0) throw Error("Archive integrity failed");
const version = JSON.parse(readFileSync(join(root, "package.json"), "utf8")).version;
const output = resolve(
  root,
  "..",
  `BIG_LITTLE_WORLD_${version.toUpperCase().replace(/[.-]/g, "_")}.zip`,
);
copyFileSync(zipPath, output);
console.log(
  JSON.stringify({
    archive: output,
    files: files.length + 1,
    bytes: statSync(output).size,
    integrity: "passed",
  }),
);
