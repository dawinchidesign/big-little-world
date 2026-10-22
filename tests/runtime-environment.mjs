import assert from 'node:assert/strict';
import {writeFileSync} from 'node:fs';
import {FIELD_PROPS,PASSAGES,emptyObjects} from '../src/environment-model.js';
import {readSave} from '../src/storage.js';
export async function checkEnvironment({app,w,step,tapE,dismiss,getCanvas}){
 const scene=app.worldScene,base=structuredClone(app.state);
 app.state.objects=emptyObjects();app.state.time=10;scene.tactility.reset();
 const at=(x,y)=>{app.joy={x:0,y:0};scene.player.body.reset(x,y);app.state.x=x;app.state.y=y;scene.traverse.z=0;scene.syncBiome(true);scene.passages.reset();step(2);dismiss();};
 const action=(key)=>{scene.updateNear();assert.equal(scene.near?.objectAction,key,'object is reachable through normal E input');tapE();dismiss();};
 const leaf=scene.tactility.items.find(i=>i.id==='field-0-0');
 at(leaf.x,leaf.y);action('leaf');assert.equal(app.state.objects.held,leaf.id);
 app.joy={x:0,y:1};step(35);app.joy={x:0,y:0};assert(leaf.sprite.y>leaf.y+40,'carried leaf travels with the hero');
 await app.save(false);globalThis.indexedDB=w.indexedDB;app.state=await readSave();app.continueGame();dismiss();step(2);assert.equal(app.state.objects.held,leaf.id);
 // A legal floor position is found by walking; no placement may hide an objective.
 for(let i=0;i<6&&app.state.objects.held;i++){scene.dir=0;action('drop');if(app.state.objects.held){app.joy={x:-1,y:0};step(18);app.joy={x:0,y:0};}}
 assert.equal(app.state.objects.held,null);const placed={...app.state.objects.records[leaf.id]};
 scene.observing=true;step(10);assert(scene.tactility.sheltered,'the placed leaf provides a usable observation shelter');assert(scene.tactility.refugeBugs.some(b=>b.visible),'damp refuge draws visible woodlice');
 assert(app.state.discovered.includes('woodlouse'));
 await app.save(false);app.state=await readSave();app.continueGame();dismiss();assert.equal(leaf.sprite.x,placed.x);assert.equal(leaf.sprite.y,placed.y);
 const cap=scene.tactility.items.find(i=>i.kind==='cap');
 at(cap.x-58,cap.y);const old=cap.zone.x;app.joy={x:1,y:0};step(65);app.joy={x:0,y:0};step(30);assert(cap.zone.x>old+5,'Arcade collision really moves the heavy cap');
 let approach=0;while(Math.hypot(cap.sprite.x-scene.player.x,cap.sprite.y-scene.player.y)>28&&approach++<100){const dx=cap.sprite.x-scene.player.x,dy=cap.sprite.y-scene.player.y,d=Math.hypot(dx,dy);app.joy={x:dx/d,y:dy/d};step();}app.joy={x:0,y:0};
 action('cap');assert(app.state.objects.records[cap.id].turned,'turning is a persistent physical change');
 const capPos={x:cap.sprite.x,y:cap.sprite.y};await app.save(false);app.state=await readSave();app.continueGame();dismiss();assert(Math.abs(cap.sprite.x-capPos.x)<1);assert.equal(cap.angle,145);
 const dew=scene.tactility.items.find(i=>i.kind==='dew');at(dew.x,dew.y);const inventory=JSON.stringify(app.state.inventory);action('dew');assert(Math.abs(dew.spring.x)>0,'dew visibly oscillates after contact');assert.equal(JSON.stringify(app.state.inventory),inventory,'sandbox dew cannot bypass quest collection');
 at(4200,700);const flower=scene.props.find(p=>p.active&&['flower','pinkflower','blueflower'].includes(p.kind)&&Math.hypot(p.x-4200,p.y-700)<500);
 assert(flower);at(flower.x,flower.y);action('flower');assert(Math.abs(scene.tactility.reaction(flower).x)>0);assert(scene.tactility.particles.some(p=>p.color===0xffd36b),'flower action produces pollen');
 const grass=scene.props.find(p=>p.active&&p.kind==='grass');assert(grass);at(grass.x-35,grass.y);app.joy={x:1,y:0};step(18);app.joy={x:0,y:0};assert(Math.abs(scene.tactility.reaction(grass).x)>1,'walking physically bends a soft plant');
 // Every authored border corridor is crossed with Arcade movement. Spawning at
 // the start of a corridor keeps this a local route check, not a full map run.
 for(const gate of PASSAGES){
  at(gate.x-(gate.vertical?155:0),gate.y-(gate.vertical?0:155));
  const start={x:scene.player.x,y:scene.player.y};let frames=0;
  while((gate.vertical?scene.player.x<gate.x+110:scene.player.y<gate.y+110)&&frames++<150){app.joy={x:gate.vertical?1:0,y:gate.vertical?0:1};step();dismiss();}
  app.joy={x:0,y:0};assert(frames<150,`physical border passage ${gate.id} stays open from ${start.x},${start.y}`);
  assert(scene.passages.bannerAge<4.4,`walking into ${gate.id} produces an in-engine arrival`);
  assert.equal(app.mode,'play','arrival keeps movement control');
  if(gate.id==='0-1'){
   scene.cameras.main.stopFollow().setZoom(1).centerOn(gate.x,gate.y);
   app.game.step(scene.time.now+16,16);writeFileSync('tmp/passage-root.png',getCanvas(app.game.canvas).toBuffer('image/png'));
  }
 }
 for(const lang of ['kk','en','ru']){app.changeLanguage(lang);scene.updateNear();assert(!w.document.querySelector('#hud').textContent.includes('undefined'));}
 assert.equal(scene.tactility.items.length,FIELD_PROPS.length,'walking borders never duplicates physical props');
 app.state=base;scene.reset(app.state);dismiss();await app.save(false);
 console.log('TACTILE CONTACT, CARRY, REFUGE, HEAVY BODY, THREE LANGUAGES, SAVE AND 12 WALKED PASSAGES OK');
}
