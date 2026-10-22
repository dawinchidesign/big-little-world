import index from '../public/assets/visual-index.json';

// Public scene coordinates and collision footprints stay in the original world
// units. Only raster density changes; atlases are shared across all three scenes.
export const visualEntry = (key) => index.entries[key];
export function preloadVisuals(scene) {
  for (const page of index.pages) scene.load.atlas(page.key,
    globalThis.LITTLE_WORLD_ASSETS?.[page.file] || './assets/' + page.file, page.data);
}
function decorate(object, logicalKey, physical) {
  let density = visualEntry(logicalKey)?.density || 1;
  let sx = 1, sy = 1;
  const nativeScale = object.setScale.bind(object);
  const nativeTexture = object.setTexture.bind(object);
  object.visualKey = logicalKey;
  object.visualDensity = density;
  object.setScale = function(x = 1, y = x) {
    sx = x; sy = y;
    return nativeScale(x / density, y / density);
  };
  object.setTexture = function(key, frame) {
    if (this.visualKey === key && frame === undefined) return this;
    const entry = visualEntry(key);
    density = entry?.density || 1;
    this.visualKey = key; this.visualDensity = density;
    nativeTexture(entry?.atlas || key, entry?.frame || frame);
    nativeScale(sx / density, sy / density);
    return this;
  };
  nativeScale(1 / density, 1 / density);
  if (physical && object.body) {
    const size = object.body.setSize.bind(object.body), offset = object.body.setOffset.bind(object.body);
    object.body.setSize = function(w, h, center) { return size(w === undefined ? w : w * density, h === undefined ? h : h * density, center); };
    object.body.setOffset = function(x, y = x) { return offset(x * density, y * density); };
  }
  return object;
}
export function installVisuals(scene) {
  if (scene.visualsInstalled) return;
  scene.visualsInstalled = true;
  for (const [factory, method, physical] of [[scene.add,'image',false],[scene.add,'sprite',false],[scene.physics.add,'sprite',true]]) {
    const original = factory[method].bind(factory);
    factory[method] = (x,y,key,frame) => {
      const entry = visualEntry(key);
      const object = original(x,y,entry?.atlas || key,entry?.frame || frame);
      // All images may change texture later (e.g. the butterfly life cycle).
      return decorate(object,key,physical);
    };
  }
}
const portraits = new Map();
const materials = new Map();
export function materialCanvas(scene,key) {
  if(materials.has(key)) return materials.get(key);
  const entry=visualEntry(key);if(!entry)return null;
  const texture=scene.textures.get(entry.atlas),frame=texture.get(entry.frame);
  const canvas=document.createElement('canvas');canvas.width=frame.cutWidth;canvas.height=frame.cutHeight;
  const g=canvas.getContext('2d');g.imageSmoothingEnabled=false;
  g.drawImage(texture.getSourceImage(),frame.cutX,frame.cutY,frame.cutWidth,frame.cutHeight,0,0,canvas.width,canvas.height);
  materials.set(key,canvas);return canvas;
}
export function visualPortrait(scene,key) {
  if (portraits.has(key)) return portraits.get(key);
  const entry = visualEntry(key);
  const texture = scene?.textures.get(entry?.atlas || key);
  if (!texture || texture.key === '__MISSING') return '';
  const frame = texture.get(entry?.frame);
  const canvas = document.createElement('canvas');
  canvas.width = frame.cutWidth; canvas.height = frame.cutHeight;
  canvas.getContext('2d').drawImage(texture.getSourceImage(),frame.cutX,frame.cutY,frame.cutWidth,frame.cutHeight,0,0,canvas.width,canvas.height);
  const result = canvas.toDataURL('image/png'); portraits.set(key,result);
  return result;
}
