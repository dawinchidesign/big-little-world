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
  ".mp3": "audio/mpeg",
};
const data = (p) =>
  "data:" +
  (mime[extname(p)] || "application/octet-stream") +
  ";base64," +
  readFileSync(p).toString("base64");
const recursiveFiles=(dir,prefix="")=>readdirSync(dir,{withFileTypes:true}).flatMap(e=>e.isDirectory()?recursiveFiles(join(dir,e.name),prefix+e.name+"/"):[prefix+e.name]);
const voiceFiles=recursiveFiles(join(dist,"voice"));
const voices=Object.fromEntries(voiceFiles.filter(n=>n.endsWith(".mp3")).map(n=>[n,data(join(dist,"voice",n))]));
const assets = Object.fromEntries(
  readdirSync(join(dist, "assets"))
    .filter((n) => n.endsWith("-hi.png") || /^visual-\d+(-[0-9a-f]{10})?\.png$/.test(n) || /^horizon-.*\.png$/.test(n))
    .map((n) => [n, data(join(dist, "assets", n))]),
);
css = css.replace(/url\(([^)]+)\)/g, (m, p) => {
  const name = p.replace(/["']/g, "").split("/").pop(),
    file = join(dist, "assets", name);
  return 'url("' + data(file) + '")';
});
// The portable file keeps its favicon inline; manifest and touch icon need a host.
let portable = html
  .replace(/<link[^>]+rel="manifest"[^>]*>/g, "")
  .replace(/<link[^>]+rel="apple-touch-icon"[^>]*>/g, "")
  .replace(/<link[^>]+rel="icon"[^>]*>/g, () => '<link rel="icon" type="image/svg+xml" href="' + data(join(dist, "leaf.svg")) + '" />');
portable = portable
  .replace(/<script type="module"[^>]+><\/script>/, "")
  .replace(/<link rel="stylesheet"[^>]+>/, () => "<style>" + css + "</style>");
const code =
  "globalThis.LITTLE_WORLD_ASSETS=" + JSON.stringify(assets) + ";\nglobalThis.LITTLE_WORLD_VOICES="+JSON.stringify(voices)+";\n" + js;
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
  "./icon-180.png",
  "./icon-192.png",
  "./icon-512.png",
  ...readdirSync(join(dist, "assets")).map((n) => "./assets/" + n),
  ...voiceFiles.map(n=>"./voice/"+n),
];
const id = createHash("sha256")
  .update(js)
  .update(css)
  .update(JSON.stringify(assets))
  .update(JSON.stringify(voices))
  .digest("hex")
  .slice(0, 12);
// Hashed assets are served cache-first; the page itself is network-first so a
// new deployment is picked up as soon as the device is online again.
const sw = `const CACHE = 'little-world-${id}';
const FILES = ${JSON.stringify(files)};
self.addEventListener('install', (event) => {
  event.waitUntil(caches.open(CACHE).then((cache) => cache.addAll(FILES.map((f) => new Request(f, { cache: 'reload' })))).then(() => self.skipWaiting()));
});
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys()
      .then((keys) => Promise.all(keys.filter((key) => key.startsWith('little-world-') && key !== CACHE).map((key) => caches.delete(key))))
      .then(() => self.clients.claim()),
  );
});
self.addEventListener('fetch', (event) => {
  const request = event.request;
  if (request.method !== 'GET' || new URL(request.url).origin !== location.origin) return;
  if (request.mode === 'navigate') {
    event.respondWith(
      fetch(request)
        .then((response) => {
          if (response.ok) {
            const copy = response.clone();
            caches.open(CACHE).then((cache) => cache.put('./index.html', copy));
          }
          return response;
        })
        .catch(() => caches.match('./index.html')),
    );
    return;
  }
  event.respondWith(caches.open(CACHE).then((cache) => cache.match(request)).then((hit) => hit || fetch(request)));
});
`;
// Fail the build instead of shipping a worker that cannot be parsed.
new Function(sw);
writeFileSync(join(dist, "sw.js"), sw);
console.log("Packaged offline HTML and versioned service worker.");
