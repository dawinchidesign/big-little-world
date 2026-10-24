// Reproducible mechanical slicing, registration and packing of ImageGen sheets.
// No repainting or background replacement: genuine source alpha is preserved.
import { createCanvas, loadImage } from '@napi-rs/canvas';
import { MaxRectsPacker } from 'maxrects-packer';
import { mkdirSync, writeFileSync, readdirSync, unlinkSync } from 'node:fs';
import { createHash } from 'node:crypto';

const frames = [];
// Plants with detached leaves or petals: the largest island per grid cell is
// the subject; smaller islands join the subject whose box they sit next to.
async function groupedProps(name,cols,rows,reach=60) {
  const image=await loadImage(`art-source/${name}.png`),w=image.width,h=image.height;
  const source=createCanvas(w,h),g=source.getContext('2d');g.drawImage(image,0,0);
  const px=g.getImageData(0,0,w,h).data,labels=new Int32Array(w*h),parts=[],queue=new Int32Array(w*h);let label=0;
  for(let s=0;s<w*h;s++){
    if(labels[s]||px[s*4+3]<16)continue;
    label++;let head=0,tail=1,x0=w,y0=h,x1=0,y1=0;queue[0]=s;labels[s]=label;
    while(head<tail){const p=queue[head++],x=p%w,y=(p/w)|0;x0=Math.min(x0,x);x1=Math.max(x1,x);y0=Math.min(y0,y);y1=Math.max(y1,y);
      for(const n of [x>0?p-1:-1,x<w-1?p+1:-1,y>0?p-w:-1,y<h-1?p+w:-1])if(n>=0&&!labels[n]&&px[n*4+3]>=16){labels[n]=label;queue[tail++]=n;}}
    parts.push({label,area:tail,x0,y0,x1,y1});
  }
  parts.sort((a,b)=>b.area-a.area);
  const anchors=parts.slice(0,cols*rows),grid=Array.from({length:rows},()=>Array(cols));
  for(const a of anchors){
    const c=Math.min(cols-1,Math.floor((a.x0+a.x1)/2/w*cols)),r=Math.min(rows-1,Math.floor((a.y0+a.y1)/2/h*rows));
    if(grid[r][c])throw Error(`Ambiguous ${name} ${r}:${c}`);
    grid[r][c]=a;a.members=new Set([a.label]);a.box=[a.x0,a.y0,a.x1,a.y1];
  }
  const gap=(p,b)=>Math.max(0,b[0]-p.x1,p.x0-b[2])+Math.max(0,b[1]-p.y1,p.y0-b[3]);
  for(const p of parts.slice(cols*rows)){
    if(p.area<30)continue;
    const best=anchors.map(a=>[gap(p,[a.x0,a.y0,a.x1,a.y1]),a]).sort((u,v)=>u[0]-v[0])[0];
    if(best[0]>reach)continue;
    const a=best[1];a.members.add(p.label);a.box=[Math.min(a.box[0],p.x0),Math.min(a.box[1],p.y0),Math.max(a.box[2],p.x1),Math.max(a.box[3],p.y1)];
  }
  return grid.map(row=>row.map(a=>{
    const [x0,y0,x1,y1]=a.box,c=createCanvas(x1-x0+1,y1-y0+1),cg=c.getContext('2d'),d=cg.createImageData(c.width,c.height);
    for(let y=y0;y<=y1;y++)for(let x=x0;x<=x1;x++){const p=y*w+x;if(!a.members.has(labels[p]))continue;const k=((y-y0)*c.width+x-x0)*4;for(let i=0;i<4;i++)d.data[k+i]=px[p*4+i];}
    cg.putImageData(d,0,0);return c;
  }));
}
// Some prop sheets have natural overhangs across nominal grid gutters. Split
// connected alpha islands before packing so a twig tip cannot enter a leaf frame.
async function isolatedProps(name,cols,rows) {
  const image=await loadImage(`art-source/${name}.png`),w=image.width,h=image.height;
  const source=createCanvas(w,h),g=source.getContext('2d');g.drawImage(image,0,0);
  const pixels=g.getImageData(0,0,w,h).data,labels=new Int32Array(w*h),parts=[];
  const queue=new Int32Array(w*h);let label=0;
  for(let start=0;start<w*h;start++) {
    if(labels[start]||pixels[start*4+3]<16)continue;
    label++;let head=0,tail=1,x0=w,y0=h,x1=0,y1=0;queue[0]=start;labels[start]=label;
    while(head<tail){const p=queue[head++],x=p%w,y=Math.floor(p/w);x0=Math.min(x0,x);x1=Math.max(x1,x);y0=Math.min(y0,y);y1=Math.max(y1,y);
      for(const n of [x>0?p-1:-1,x<w-1?p+1:-1,y>0?p-w:-1,y<h-1?p+w:-1])if(n>=0&&!labels[n]&&pixels[n*4+3]>=16){labels[n]=label;queue[tail++]=n;}}
    if(tail>2000)parts.push({label,area:tail,x0,y0,x1,y1});
  }
  parts.sort((a,b)=>b.area-a.area);const subjects=parts.slice(0,cols*rows);
  if(subjects.length!==cols*rows)throw Error('Incomplete isolated prop sheet');
  const result=Array.from({length:rows},()=>Array(cols));
  for(const part of subjects){
    const col=Math.min(cols-1,Math.floor((part.x0+part.x1)/2/w*cols)),row=Math.min(rows-1,Math.floor((part.y0+part.y1)/2/h*rows));
    if(result[row][col])throw Error(`Ambiguous prop registration ${row}:${col}`);
    const crop=createCanvas(part.x1-part.x0+1,part.y1-part.y0+1),cg=crop.getContext('2d'),data=cg.createImageData(crop.width,crop.height);
    for(let y=part.y0;y<=part.y1;y++)for(let x=part.x0;x<=part.x1;x++){const p=y*w+x;if(labels[p]!==part.label)continue;const k=((y-part.y0)*crop.width+x-part.x0)*4;for(let i=0;i<4;i++)data.data[k+i]=pixels[p*4+i];}
    cg.putImageData(data,0,0);result[row][col]=crop;
  }
  if(result.some(row=>row.some(c=>!c)))throw Error('Missing prop cell');
  return result;
}
// Grid sheet where legs, antennae and fluff may cross into a neighbour's cell:
// every alpha island belongs to the cell holding its bounding-box centre, and a
// cell's frame is cropped from its own islands only.
async function cellSheet(name, cols, rows, rowCuts) {
  const image=await loadImage(`art-source/${name}.png`),w=image.width,h=image.height;
  const source=createCanvas(w,h),g=source.getContext('2d');g.drawImage(image,0,0);
  const px=g.getImageData(0,0,w,h).data,labels=new Int32Array(w*h),queue=new Int32Array(w*h),cellOf=[0];let label=0;
  const cuts=rowCuts||Array.from({length:rows+1},(_,i)=>Math.round(i*h/rows));
  const cells=Array.from({length:rows},()=>Array.from({length:cols},()=>({set:new Set(),box:null,area:0})));
  const thr=name.startsWith('hero')?128:64;
  for(let s=0;s<w*h;s++){
    if(labels[s]||px[s*4+3]<16)continue;
    label++;let head=0,tail=1,x0=w,y0=h,x1=0,y1=0,solid=0;queue[0]=s;labels[s]=label;
    while(head<tail){const p=queue[head++],x=p%w,y=(p/w)|0;if(px[p*4+3]>thr)solid++;x0=Math.min(x0,x);x1=Math.max(x1,x);y0=Math.min(y0,y);y1=Math.max(y1,y);
      for(const n of [x>0?p-1:-1,x<w-1?p+1:-1,y>0?p-w:-1,y<h-1?p+w:-1])if(n>=0&&!labels[n]&&px[n*4+3]>=16){labels[n]=label;queue[tail++]=n;}}
    if(tail<8||!solid)continue;
    const cx=(x0+x1)/2,cy=(y0+y1)/2,c=Math.min(cols-1,Math.floor(cx/w*cols));let r=0;while(r<rows-1&&cy>=cuts[r+1])r++;
    const cell=cells[r][c];cell.set.add(label);cell.area+=tail;
    cell.box=cell.box?[Math.min(cell.box[0],x0),Math.min(cell.box[1],y0),Math.max(cell.box[2],x1),Math.max(cell.box[3],y1)]:[x0,y0,x1,y1];
  }
  return cells.map((row,r)=>row.map((cell,c)=>{
    if(!cell.box)throw Error(`Empty source cell ${name}:${r}:${c}`);
    const [x0,y0,x1,y1]=cell.box,cv=createCanvas(x1-x0+1,y1-y0+1),cg=cv.getContext('2d'),d=cg.createImageData(cv.width,cv.height);
    for(let y=y0;y<=y1;y++)for(let x=x0;x<=x1;x++){const p=y*w+x;if(!cell.set.has(labels[p]))continue;const k=((y-y0)*cv.width+x-x0)*4;for(let i=0;i<4;i++)d.data[k+i]=px[p*4+i];}
    cg.putImageData(d,0,0);return cv;
  }));
}
async function sheet(name, cols, rows, rowCuts) {
  const image = await loadImage(`art-source/${name}.png`);
  const source = createCanvas(image.width, image.height);
  source.getContext('2d').drawImage(image, 0, 0);
  const pixels = source.getContext('2d').getImageData(0, 0, image.width, image.height).data;
  return Array.from({length: rows}, (_, row) => Array.from({length: cols}, (_, col) => {
    const left = Math.round(col * image.width / cols), right = Math.round((col + 1) * image.width / cols);
    const top = rowCuts?.[row] ?? Math.round(row * image.height / rows);
    const bottom = rowCuts?.[row + 1] ?? Math.round((row + 1) * image.height / rows);
    let x0 = right, x1 = left, y0 = bottom, y1 = top;
    for (let y = top; y < bottom; y++) for (let x = left; x < right; x++) {
      if (pixels[(y * image.width + x) * 4 + 3] > (name.startsWith('hero') ? 128 : 64)) {
        x0 = Math.min(x0, x); x1 = Math.max(x1, x); y0 = Math.min(y0, y); y1 = Math.max(y1, y);
      }
    }
    if (x1 <= x0 || y1 <= y0) throw Error(`Empty source cell ${name}:${row}:${col}`);
    const crop = createCanvas(x1 - x0 + 1, y1 - y0 + 1);
    crop.getContext('2d').drawImage(source, x0, y0, crop.width, crop.height, 0, 0, crop.width, crop.height);
    return crop;
  }));
}
function add(key, source, width, height, density, {rotate = 0, foot = false, fit = .9, scale, stretch = false} = {}) {
  let crop = source;
  if (rotate) {
    const w = Math.ceil(Math.abs(source.width * Math.cos(rotate)) + Math.abs(source.height * Math.sin(rotate)));
    const h = Math.ceil(Math.abs(source.height * Math.cos(rotate)) + Math.abs(source.width * Math.sin(rotate)));
    crop = createCanvas(w, h);
    const g = crop.getContext('2d'); g.imageSmoothingEnabled = false;
    g.translate(w / 2, h / 2); g.rotate(rotate); g.drawImage(source, -source.width / 2, -source.height / 2);
  }
  const target = createCanvas(width, height), g = target.getContext('2d');
  g.imageSmoothingEnabled = false;
  const ratio = scale ?? Math.min(width * fit / crop.width, height * fit / crop.height);
  const w = stretch ? Math.round(width * fit) : Math.round(crop.width * ratio), h = stretch ? Math.round(height * fit) : Math.round(crop.height * ratio);
  if (w > width || h > height) throw Error(`Clipped sprite ${key}`);
  g.drawImage(crop, Math.round((width - w) / 2), foot ? height - 8 - h : Math.round((height - h) / 2), w, h);
  frames.push({key, canvas: target, width, height, density});
}

const walk = await cellSheet('hero-walk', 8, 4, [0,258,503,759,1024]);
// A common registration height per row avoids source-sheet scale drift.
for (let dir = 0; dir < 4; dir++) {
  const row = walk[[0, 1, 3, 2][dir]];
  for (let f = 0; f < 8; f++) add(`hero${dir}-${f}`, row[f], 96, 136, 4, {foot: true, scale: 116 / row[f].height});
  for (let f = 0; f < 4; f++) add(`hero-idle${dir}-${f}`, row[0], 96, 136, 4, {foot: true, scale: (116 + [0,1,1,0][f]) / row[0].height});
}
// Art-directed source bands; the taller climbing poses are not a uniform grid.
const actions = await cellSheet('hero-actions', 4, 3, [0, 455, 858, 1254]);
for (let f = 0; f < 4; f++) {
  add('hero-climb' + f, actions[0][f], 96, 136, 4, {foot: true, scale: Math.min(116 / actions[0][f].height, 88 / actions[0][f].width)});
  add('hero-glide' + f, actions[1][f], 96, 136, 4, {foot: true, scale: Math.min(116 / actions[1][f].height, 90 / actions[1][f].width)});
}
const sets = [
  ['insects-garden', ['ladybird','ant','bee','bumblebee','butterfly','caterpillar']],
  ['insects-meadow', ['aphid','grasshopper','mantis','wasp','strider','dragonfly']],
  ['insects-soil', ['mosquito-draft','waterbeetle','beetle','springtail-draft','woodlouse','spider']],
  ['insects-night-water', ['firefly','moth','cricket','dragonflylarva','daphnia','pondsnail']],
  ['insects-aquatic', ['mayflynymph','caddisfly','colony-larva','colony-pupa']],
  ['corrections', ['mosquito','springtail','ant-queen','colony-eggs','nymph-draft']],
];
for (const [name, ids] of sets) {
  const rows = await cellSheet(name, 4, ids.length);
  for (let row = 0; row < ids.length; row++) {
    const id = ids[row]; if (id.endsWith('-draft')) continue;
    const sizes = {'colony-larva':[60,32], 'colony-pupa':[58,28], 'colony-eggs':[68,44]};
    const [w,h] = sizes[id] || [128,96];
    for (let f = 0; f < 4; f++) {
      const rotate = sizes[id] ? 0 : id === 'ant-queen' ? -Math.PI * .75 : id === 'caddisfly' ? Math.PI * .75 : ['mosquito','springtail'].includes(id) ? -Math.PI / 2 : -Math.PI / 4;
      add(id + f, rows[row][f], w, h, 2, {rotate});
    }
    if(id==='colony-eggs')add('brood',rows[row][0],240,170,2,{foot:true});
  }
}
// One sheet: four canopy leaves; dandelion bud, seed head, flying seed and the
// curled glider leaf; four tail-beat frames of the pond fish.
const lds = await cellSheet('leaves-dandelions-fish', 4, 3, [0, 426, 916, 1254]);
['canopy-leaf','canopy-flower','canopy-fern','canopy-night'].forEach((key, i) => add(key, lds[0][i], 328,144,2,{fit:.98,stretch:true}));
add('leaf-glider', lds[1][3], 200,112,2,{fit:.96});
const nest = await cellSheet('colony-decoration', 2, 2);
add('nest-root-arch', nest[0][0], 384,256,2);
add('nest-litter', nest[1][0], 256,160,2);
add('nest-arch', nest[1][1], 320,224,2);
const props=await isolatedProps('environment-props',4,3);
const propSpecs=[['rock',100,62],['leaf',110,64],['twig',96,30],['dew',36,45],['bottle',180,220],['plastic',140,90],['cap',120,60],['sprout',60,70],['pupa',40,68],['bridge',180,70],['colony-food',36,30],['nest-log',180,110]];
propSpecs.forEach(([key,w,h],i)=>add(key,props[Math.floor(i/4)][i%4],w*2,h*2,2,{foot:true,fit:.96,stretch:['twig','bridge'].includes(key)}));
add('gate',props[2][3],320,240,2,{foot:true,fit:.96});
const materials=await sheet('ground-materials',2,2);
['material-moss','material-clay','material-silt','material-humus'].forEach((key,i)=>add(key,materials[Math.floor(i/2)][i%2],256,256,1,{fit:1,stretch:true}));

const scenery=await isolatedProps('scenery-expansion',3,3);
const scenerySpecs=[['tree',250,320],['reed',80,140],['blueflower',112,176],['web',130,130],['fungal-cluster',138,150],['lily',148,92],['moss-fan',110,142],['lichen-stone',108,78],['seedpod',82,142]];
scenerySpecs.forEach(([key,w,h],i)=>add(key,scenery[Math.floor(i/3)][i%3],w*2,h*2,2,{foot:true,fit:.94}));

const crossing=await isolatedProps('crossing-structures',3,2);
const crossingSpecs=[['crossing-raft',130,80],['crossing-root',140,48],['crossing-fork',140,100],['crossing-bridge',68,340],['crossing-shelter',116,94],['crossing-dock',132,92]];
crossingSpecs.forEach(([key,w,h],i)=>add(key,crossing[Math.floor(i/3)][i%3],w*2,h*2,2,{fit:.98,stretch:true}));
const stream=await sheet('crossing-water',2,2);
[['crossing-water',330,270],['crossing-ripple',85,55],['crossing-bank',160,90],['crossing-stone',70,60]].forEach(([key,w,h],i)=>add(key,stream[Math.floor(i/2)][i%2],w*2,h*2,2,{fit:.98,stretch:true}));

// Camera planes keep their transparent composition canvas. Trimming them like
// isolated props would move the empty centre and spoil parallax registration.
async function panels(name,keys,cuts){
  const source=await loadImage(`art-source/${name}.png`);
  for(let i=0;i<keys.length;i++){
    const top=cuts?.[i]??i*source.height/keys.length,bottom=cuts?.[i+1]??(i+1)*source.height/keys.length;
    const panel=createCanvas(source.width,bottom-top);
    panel.getContext('2d').drawImage(source,0,top,source.width,panel.height,0,0,panel.width,panel.height);
    add(keys[i],panel,960,480,1,{fit:1,stretch:true});
  }
}
await panels('parallax-meadow',['cine-distant','cine-bank','cine-leaves'],[0,415,828,1254]);
await panels('parallax-habitats',['cine-night','cine-water','cine-roots'],[0,416,835,1254]);
await panels('bedroom-walls',['room-wall','room-wall-morning'],[0,627,1254]);
// Isolated furniture is placed on transparent camera planes where the room
// composition expects it: the desk to the right, the bed low on the left.
const furniture=await cellSheet('bedroom-furniture',1,2,[0,660,1254]);
function plane(key,crop,[x0,y0,x1,y1],align){
  const W=960,H=480,c=createCanvas(W,H),g=c.getContext('2d');
  const bw=(x1-x0)*W,bh=(y1-y0)*H,k=Math.min(bw/crop.width,bh/crop.height),w=Math.round(crop.width*k),h=Math.round(crop.height*k);
  const x=align==='right'?Math.round(x1*W-w):Math.round(x0*W);
  g.imageSmoothingEnabled=true;g.imageSmoothingQuality='high';
  g.drawImage(crop,x,Math.round(y1*H-h),w,h);
  frames.push({key,canvas:c,width:W,height:H,density:1});
}
plane('room-desk',furniture[0][0],[.30,.14,.98,.995],'right');
plane('room-bed',furniture[1][0],[.01,.13,.84,.998],'left');
const story=await cellSheet('hero-story-poses',4,2,[0,400,1024]);
for(let f=0;f<4;f++){
  add('hero-sleep'+f,story[0][f],320,160,1,{fit:.92});
  add('hero-wake'+f,story[1][f],160,224,1,{fit:.92,foot:true});
}

// 1.3: illustrated replacements for the remaining visible procedural objects.
// Sheets were defringed (coloured matte haze removed) before slicing. Isolate
// connected alpha islands: natural outlines can overhang nominal rows. Scene
// dimensions stay unchanged through the density wrapper.
const upgradeProps=await isolatedProps('upgrade-quest-props',3,3);
const upgradeSpecs=[
  ['lamp',80,190],['pipe',160,100],['sample',50,60],
  ['toxic',70,80],['sign',60,80],['egg',64,55],
  ['shell',70,60],['mycelium',130,80],['canopy-stem',48,180],
];
upgradeSpecs.forEach(([key,w,h],i)=>add(key,upgradeProps[Math.floor(i/3)][i%3],w*3,h*3,3,{fit:.92,foot:true,stretch:key==='canopy-stem'}));
const dandelions=[lds[1]];
// Dandelion wind stations and the flight seed. Shared full-height registration
// keeps the rosette planted while the bud opens into a seed head.
for(const [i,key] of ['dandelion-bud','dandelion','travel-seed'].entries()){
  const [w,h]=i===2?[32,44]:[64,112];
  add(key,dandelions[0][i],w*4,h*4,4,{fit:.92,foot:i!==2});
}
const fish=[lds[2]];
// One shared frame box and fixed body length avoid pumping between tail poses.
const fishScale=232/Math.max(...fish[0].map(f=>f.width));
for(let f=0;f<4;f++)add('fish'+f,fish[0][f],256,128,4,{scale:fishScale});

mkdirSync('public/assets', {recursive:true});
// Large painted plants are separate smooth 192 px images (key-hi.png), not
// atlas frames: planted on the bottom edge, as tall as the old art allowed.
const plants=await groupedProps('plants-hi',5,2);
['grass','flower','pinkflower','mushroom','log','fern','waterweed','pondweed','waterarch','waterroot'].forEach((key,i)=>{
  const crop=plants[Math.floor(i/5)][i%5],c=createCanvas(192,192),g=c.getContext('2d');
  const k=Math.min(184/crop.height,186/crop.width),w=Math.round(crop.width*k),h=Math.round(crop.height*k);
  g.imageSmoothingEnabled=true;g.imageSmoothingQuality='high';
  g.drawImage(crop,Math.round((192-w)/2),190-h,w,h);
  writeFileSync(`public/assets/${key}-hi.png`,c.toBuffer('image/png'));
});
for (const f of readdirSync('public/assets')) if (/^visual-\d+(-[0-9a-f]{10})?\.png$/.test(f)) unlinkSync('public/assets/' + f);
const packer = new MaxRectsPacker(1024,1024,4,{smart:true,pot:true,square:false,allowRotation:false,border:2});
packer.addArray(frames.map(f => ({width:f.width,height:f.height,data:f})));
const index = {version:1,pages:[],entries:{}};
for (const [i, bin] of packer.bins.entries()) {
  const page = createCanvas(bin.width,bin.height), g = page.getContext('2d');
  const key = 'visual-' + i, data = {frames:{},meta:{size:{w:bin.width,h:bin.height},scale:'1'}};
  for (const rect of bin.rects) {
    const f = rect.data; g.drawImage(f.canvas, rect.x,rect.y);
    data.frames[f.key] = {frame:{x:rect.x,y:rect.y,w:f.width,h:f.height},rotated:false,trimmed:false,spriteSourceSize:{x:0,y:0,w:f.width,h:f.height},sourceSize:{w:f.width,h:f.height}};
    index.entries[f.key] = {atlas:key,frame:f.key,density:f.density,width:f.width,height:f.height};
  }
  // Content-hashed file name: a browser or service worker that cached an older
  // atlas under the same index can never pair it with new frame coordinates.
  const png = page.toBuffer('image/png');
  const file = key + '-' + createHash('sha256').update(png).digest('hex').slice(0,10) + '.png';
  writeFileSync('public/assets/' + file,png);
  index.pages.push({key,file,data});
}
for (const key of ['colony-larva','colony-pupa','colony-eggs']) index.entries[key] = index.entries[key + '0'];
index.entries.fish=index.entries.fish0;
writeFileSync('public/assets/visual-index.json',JSON.stringify(index));
console.log(`Packed ${frames.length} generated frames into ${index.pages.length} atlases (maximum 1024 px).`);

// Internal art QA only: contact sheet on a neutral background.
mkdirSync('tmp',{recursive:true});
const selected = frames.filter(f => /^(hero[0-3]-0|hero-climb0|hero-glide0|canopy-|.*0$|nest-|material-|cine-|room-)/.test(f.key) || [...propSpecs,...scenerySpecs].some(p=>p[0]===f.key));
const contact = createCanvas(960,Math.ceil(selected.length/6)*180), cg = contact.getContext('2d');
cg.fillStyle='#27423e';cg.fillRect(0,0,contact.width,contact.height);cg.font='12px sans-serif';
for (let i=0;i<selected.length;i++) {const f=selected[i],x=i%6*160,y=Math.floor(i/6)*180;cg.imageSmoothingEnabled=false;const r=Math.min(144/f.width,140/f.height);cg.drawImage(f.canvas,x+80-f.width*r/2,y+76-f.height*r/2,f.width*r,f.height*r);cg.fillStyle='#e5d9b6';cg.fillText(f.key,x+6,y+165);}
writeFileSync('tmp/visual-contact.png',contact.toBuffer('image/png'));
