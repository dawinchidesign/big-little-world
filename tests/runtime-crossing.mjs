import assert from 'node:assert/strict';
import {writeFileSync} from 'node:fs';
import {emptyCrossing,ROOT_PATH,WOOD,LEAVES,COVERS,delivered} from '../src/crossing-data.js';
import {readSave} from '../src/storage.js';
export async function checkCrossings({app,w,step,tapE,dismiss,getCanvas}){
 const baseline=structuredClone(app.state),scene=app.worldScene;
 const walk=(p)=>{
  let frames=0;
  while(Math.hypot(scene.player.x-p.x,scene.player.y-p.y)>8&&frames++<350){
   const dx=p.x-scene.player.x,dy=p.y-scene.player.y,n=Math.hypot(dx,dy);
   app.joy={x:dx/n,y:dy/n};step();
   if(app.mode!=='play'){dismiss();app.joy={x:0,y:0};}
   assert.equal(app.mode,'play','route walking keeps control');
  }
  app.joy={x:0,y:0};step(2);
  assert(frames<350,`physical route blocked near ${p.x},${p.y}: ${scene.player.x},${scene.player.y}`);
 };
 const act=(action)=>{scene.updateNear();assert.equal(scene.near?.crossingAction,action,'physical action marker');tapE();dismiss();};
 const ride=(direction)=>{app.joy={x:0,y:direction};let frames=0;while(app.state.crossing.boat.aboard&&frames++<210)step();app.joy={x:0,y:0};dismiss();assert(frames<210,'ferry reaches opposite dock');};
 for(const route of ['leaf','roots','bridge']){
  app.state=structuredClone(baseline);app.state.crossing=emptyCrossing();app.state.x=3370;app.state.y=1600;app.state.eco.safety=25;
  scene.reset(app.state);step(3);const s=app.state.crossing;
  // The stream really blocks an ordinary walk before a route is prepared.
  walk({x:3470,y:1640});app.joy={x:0,y:1};step(50);app.joy={x:0,y:0};
  assert(scene.player.y<1680,'unprepared crossing has physical water collision');
  walk({x:3370,y:1600});
  if(route==='leaf'){
   walk({x:3370,y:1640});act('boat');assert.equal(s.route,'leaf');act('boat');assert(s.boat.aboard);
   app.joy={x:0,y:1};step(70);app.joy={x:0,y:0};assert(s.boat.y>1740&&s.boat.y<1900);
   await app.save(false);
   // Continue uses the real IndexedDB slot and restores the boat and passengers.
   const before=JSON.stringify(s.boat);globalThis.indexedDB=w.indexedDB;app.state=await readSave();await app.continueGame();dismiss();
   assert.equal(JSON.stringify(app.state.crossing.boat),before);assert(Math.abs(scene.player.y-app.state.crossing.boat.y+8)<1);
   ride(1);assert.equal(delivered(app.state.crossing),2);
   for(let pair=1;pair<3;pair++){walk({x:scene.crossing.boat.x,y:1940});act('boat');ride(-1);walk({x:scene.crossing.boat.x,y:1640});act('boat');ride(1);assert.equal(delivered(app.state.crossing),(pair+1)*2);}
  }else if(route==='roots'){
   for(const p of LEAVES){walk(p);act('leaves');}
   walk({x:3300,y:1610});act('roots');
   for(let i=0;i<ROOT_PATH.length;i++){
    walk(ROOT_PATH[i]);
    for(const [j,c]of COVERS.entries())if(Math.hypot(c.x-ROOT_PATH[i].x,c.y-ROOT_PATH[i].y)<45){walk(c);act('cover');assert(s.covers.includes(j));}
   }
   assert(s.heroCrossed);assert.equal(s.rootStep,ROOT_PATH.length);step(1000);dismiss();
  }else{
   for(const p of WOOD){walk(p);act('wood');}
   walk({x:3520,y:1630});act('bridge');act('bridge');assert(s.building);step(180);assert(s.bridgeBuilt);
   walk({x:3520,y:1970});assert(s.heroCrossed);step(900);dismiss();
  }
  const complete=app.state.crossing;assert(complete.done,route+' completes all six resident journeys');assert.equal(delivered(complete),6);assert.equal(app.state.eco.safety,30);
  const positions=scene.crossing.people.map(p=>({x:p.sprite.x,y:p.sprite.y}));let moving=false;
  // A sinusoidal ferry can return close to the sampled position at the end of
  // a window. Check its intermediate motion rather than a single end point.
  for(let sample=0;sample<5;sample++){step(50);dismiss();moving ||= scene.crossing.people.some((p,i)=>Math.hypot(p.sprite.x-positions[i].x,p.sprite.y-positions[i].y)>10);}
  assert(moving,'chosen route keeps living traffic');
  assert.equal(app.state.eco.safety,30,'reward cannot repeat');
  for(const lang of ['kk','en','ru']){app.changeLanguage(lang);app.openJournal('quests');assert(!w.document.querySelector('#overlay').textContent.includes('undefined'));app.closePanel();}
  scene.cameras.main.stopFollow().setZoom(1).centerOn(3380,1770);
  app.game.step(scene.time.now+16,16);writeFileSync(`tmp/crossing-${route}.png`,getCanvas(app.game.canvas).toBuffer('image/png'));
  await app.save(false);globalThis.indexedDB=w.indexedDB;app.state=await readSave();await app.continueGame();dismiss();assert(app.state.crossing.done);assert.equal(app.state.crossing.route,route);
  console.log('CROSSING PHYSICAL ROUTE, TRAFFIC AND SAVE OK',route);
 }
 app.state=baseline;scene.reset(app.state);await app.save(false);dismiss();
}
