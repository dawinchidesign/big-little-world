import test from 'node:test';
import assert from 'node:assert/strict';
import {FIELD_PROPS,PASSAGES,PHYSICAL_UI,habitatWeights,emptyObjects,validateObjects,springStep,canPlace} from '../src/environment-model.js';
import {initialState,migrateSave} from '../src/model.js';
import {BIOMES} from '../src/content.js';
test('habitat mixtures are continuous across all twelve boundaries and four-way corners',()=>{
 assert.equal(PASSAGES.length,12);
 const sample=(x,y)=>habitatWeights(x,y).reduce((n,m)=>n+m.biome.humidity*m.weight,0);
 for(const p of PASSAGES){
  for(let d=-240;d<=240;d+=4){const x=p.x+(p.vertical?d:0),y=p.y+(p.vertical?0:d),mix=habitatWeights(x,y);assert(Math.abs(mix.reduce((v,m)=>v+m.weight,0)-1)<1e-9);assert(mix.every(m=>m.weight>=0));}
  assert(Math.abs(sample(p.x-.01,p.y-.01)-sample(p.x+.01,p.y+.01))<.05);
 }
 assert.equal(habitatWeights(1600,1100).length,4);
 for(const b of BIOMES)assert.equal(habitatWeights(b.cell[0]*1600+800,b.cell[1]*1100+550)[0].biome.id,b.id);
});
test('material spring settles after an impulse and stays stable at a slow frame rate',()=>{
 for(const dt of [1/60,1/20,.07]){const s={x:0,v:80};springStep(s,dt);assert(s.x>0);for(let i=0;i<400;i++)springStep(s,dt);assert(Math.abs(s.x)<.01);assert(Math.abs(s.v)<.1);}
});
test('carried leaves, flipped caps and moved stones persist; bad object data is rejected',()=>{
 const s=initialState(),leaf=FIELD_PROPS.find(p=>p.kind==='leaf'),cap=FIELD_PROPS.find(p=>p.kind==='cap');
 s.objects.records[leaf.id]={x:930,y:710,turned:false};s.objects.held=leaf.id;s.objects.records[cap.id]={x:cap.x+40,y:cap.y,turned:true};
 assert.deepEqual(migrateSave(JSON.parse(JSON.stringify(s))).objects,s.objects);
 for(let version=1;version<=5;version++){const old=initialState();old.version=version;delete old.objects;assert.deepEqual(migrateSave(old).objects,emptyObjects());}
 for(const bad of [{held:'unknown',records:{}},{held:cap.id,records:{[cap.id]:{x:20,y:20,turned:false}}},{held:null,records:{bogus:{x:500,y:600,turned:false}}},{held:null,records:{[leaf.id]:{x:Infinity,y:600,turned:false}}}])assert.throws(()=>validateObjects(bad));
 assert.equal(new Set(FIELD_PROPS.map(p=>p.id)).size,27);
});
test('placement protects water, quest actions and world bounds and action labels cover three languages',()=>{
 assert(canPlace(900,700));assert(!canPlace(3370,1800));assert(!canPlace(0,200));assert(!canPlace(900,700,null,[{x:920,y:700}]));assert(!canPlace(3900,1800,{x:3900,y:1800,rx:400,ry:200}));
 for(const texts of Object.values(PHYSICAL_UI)){assert.equal(texts.length,3);assert(texts.every(t=>t.length));}
});
