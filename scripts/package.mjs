import { readFileSync, writeFileSync, readdirSync, mkdirSync } from "node:fs";
import { join, extname } from "node:path";
import { createHash } from "node:crypto";
const root = process.cwd(),
  dist = join(root, "dist");
const html = readFileSync(join(dist, "index.html"), "utf8");
const jsPath = html.match(/src="\.\/(assets\/[^\"]+\.js)"/)[1];
const cssPath = html.match(/href="\.\/(assets\/[^\"]+\.css)"/)[1];
let js = readFileSync(join(dist, jsPath), "utf8"),
  css = readFileSync(join(dist, cssPath), "utf8");
const mime = {
  ".png": "image/png",
  ".woff": "font/woff",
  ".svg": "image/svg+xml",
};
const data = (p) =>
  "data:" +
  (mime[extname(p)] || "application/octet-stream") +
  ";base64," +
  readFileSync(p).toString("base64");
const assets = Object.fromEntries(
  readdirSync(join(dist, "assets"))
    .filter((n) => n.endsWith("-hi.png") || /^visual-\d+\.png$/.test(n))
    .map((n) => [n, data(join(dist, "assets", n))]),
);
css = css.replace(/url\(([^)]+)\)/g, (m, p) => {
  // Inline data URIs (e.g. the cinema grain SVG) are already self-contained.
  if (/^["']?data:/.test(p)) return m;
  const name = p.replace(/["']/g, "").split("/").pop(),
    file = join(dist, "assets", name);
  return 'url("' + data(file) + '")';
});
let portable = html
  .replace(/<link[^>]+rel="manifest"[^>]*>/g, "")
  .replace(/<link[^>]+rel="icon"[^>]*>/g, "");
portable = portable
  .replace(/<script type="module"[^>]+><\/script>/, "")
  .replace(/<link rel="stylesheet"[^>]+>/, () => "<style>" + css + "</style>");
const code =
  "globalThis.LITTLE_WORLD_ASSETS=" + JSON.stringify(assets) + ";\n" + js;
portable = portable.replace(
  "</body>",
  () =>
    "<script>" + code.replace(/<\/script/gi, "<\\/script") + "</script></body>",
);
mkdirSync("release", { recursive: true });
writeFileSync("release/PLAY_OFFLINE.html", portable);
const files = [
  "./",
  "./index.html",
  "./leaf.svg",
  "./manifest.webmanifest",
  ...readdirSync(join(dist, "assets")).map((n) => "./assets/" + n),
];
const id = createHash("sha256")
  .update(js)
  .update(css)
  .update(JSON.stringify(assets))
  .digest("hex")
  .slice(0, 12);
writeFileSync(
  join(dist, "sw.js"),
  `const CACHE='little-world-${id}';const FILES=${JSON.stringify(files)};self.addEventListener('install',e=>e.waitUntil(caches.open(CACHE).then(c=>c.addAll(FILES)).then(()=>self.skipWaiting())));self.addEventListener('activate',e=>e.waitUntil(caches.keys().then(keys=>Promise.all(keys.filter(k=>k.startsWith('little-world-')&&k!==CACHE).map(k=>caches.delete(k)))).then(()=>self.clients.claim())));self.addEventListener('fetch',e=>{if(e.request.method!=='GET'||new URL(e.request.url).origin!==location.origin)return;e.respondWith(caches.match(e.request).then(hit=>hit||fetch(e.request).catch(()=>e.request.mode==='navigate'?caches.match('./index.html'):Response.error()))));});`,
);
console.log("Packaged offline HTML and versioned service worker.");
