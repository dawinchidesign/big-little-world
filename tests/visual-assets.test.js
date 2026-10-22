import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { createCanvas,loadImage } from '@napi-rs/canvas';
import { SPECIES } from '../src/content.js';
import { PARALLAX_PROFILES } from '../src/parallax-model.js';
const atlas=JSON.parse(readFileSync(new URL('../public/assets/visual-index.json',import.meta.url)));
test('all inhabitants and playable poses use nonempty transparent packed art without overlap', async()=>{
  const required=SPECIES.flatMap(s=>Array.from({length:4},(_,i)=>s.id+i));
  for(let d=0;d<4;d++)for(let f=0;f<8;f++)required.push(`hero${d}-${f}`);
  required.push('hero-climb0','hero-glide0','canopy-leaf','canopy-flower','canopy-night','ant-queen0','room-wall-morning','hero-sleep0','hero-wake3');
  required.push(...Object.values(PARALLAX_PROFILES).flatMap(p=>p.map(s=>s.key)),...['tree','reed','blueflower','web','lily','moss-fan','lichen-stone','seedpod','fungal-cluster']);
  required.push('lamp','pipe','sample','toxic','sign','egg','shell','mycelium','canopy-stem','dandelion-bud','dandelion','travel-seed','fish0','fish1','fish2','fish3');
  for(const key of required)assert(atlas.entries[key],`Missing generated art ${key}`);
  for(const page of atlas.pages){
    const im=await loadImage(new URL('../public/assets/'+page.file,import.meta.url).pathname);
    assert(im.width<=1024&&im.height<=1024,'bounded GPU pages');
    const canvas=createCanvas(im.width,im.height),g=canvas.getContext('2d');g.drawImage(im,0,0);
    const entries=Object.entries(page.data.frames);
    for(let i=0;i<entries.length;i++){
      const [key, {frame:f}]=entries[i];
      assert(f.x>=0&&f.y>=0&&f.x+f.w<=im.width&&f.y+f.h<=im.height,`Bounds ${key}`);
      const data=g.getImageData(f.x,f.y,f.w,f.h).data;
      let visible=0,transparent=0;
      for(let p=3;p<data.length;p+=4){if(data[p]>128)visible++;if(data[p]===0)transparent++;}
      assert(visible>40,`Empty illustration ${key}`);if(!key.startsWith('material-')&&!key.startsWith('room-wall'))assert(transparent>f.w*f.h*.1,`Opaque matte ${key}`);
      for(let j=i+1;j<entries.length;j++){const b=entries[j][1].frame;assert(f.x+f.w<=b.x||b.x+b.w<=f.x||f.y+f.h<=b.y||b.y+b.h<=f.y,`Overlapping atlas frames ${key}`);}
    }
  }
});
test('camera overlays leave the centre transparent and keep their registered composition canvas',async()=>{
  for(const key of ['cine-distant','cine-bank','cine-leaves','cine-night','cine-water','cine-roots']){
    const entry=atlas.entries[key],page=atlas.pages.find(p=>p.key===entry.atlas),r=page.data.frames[key].frame;
    const image=await loadImage(new URL('../public/assets/'+page.file,import.meta.url).pathname);
    const canvas=createCanvas(r.w,r.h),g=canvas.getContext('2d');g.drawImage(image,r.x,r.y,r.w,r.h,0,0,r.w,r.h);
    assert.equal(r.w,960);assert.equal(r.h,480);
    const data=g.getImageData(Math.round(r.w*.4),0,Math.round(r.w*.2),r.h).data;
    let alpha=0;for(let p=3;p<data.length;p+=4)alpha+=data[p];
    assert(alpha/(data.length/4)<75,`The playable centre remains visible in ${key}`);
  }
});
test('generated art preserves hero and platform world dimensions and registered feet',async()=>{
  for(let d=0;d<4;d++)for(let f=0;f<8;f++){
    const entry=atlas.entries[`hero${d}-${f}`];
    assert.equal(entry.width/entry.density,24);assert.equal(entry.height/entry.density,34);
    const page=atlas.pages.find(p=>p.key===entry.atlas),frame=page.data.frames[entry.frame].frame;
    const im=await loadImage(new URL('../public/assets/'+page.file,import.meta.url).pathname);
    const canvas=createCanvas(frame.w,frame.h),g=canvas.getContext('2d');g.drawImage(im,frame.x,frame.y,frame.w,frame.h,0,0,frame.w,frame.h);
    const pixels=g.getImageData(0,0,frame.w,frame.h).data;
    let bottom=-1;for(let y=0;y<frame.h;y++)for(let x=0;x<frame.w;x++)if(pixels[(y*frame.w+x)*4+3]>128)bottom=y;
    assert(Math.abs(bottom-127)<=2,'stable foot registration');
  }
  for(const key of ['canopy-leaf','canopy-flower','canopy-fern','canopy-night']){assert.equal(atlas.entries[key].width/atlas.entries[key].density,164);assert.equal(atlas.entries[key].height/atlas.entries[key].density,72);}
});
