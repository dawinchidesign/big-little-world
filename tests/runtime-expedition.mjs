import assert from 'node:assert/strict';
import {writeFileSync} from 'node:fs';
import {EXPEDITIONS,has} from '../src/expedition-data.js';
import {readSave} from '../src/storage.js';
export async function checkExpeditions({app,w,step,tapE,dismiss,getCanvas}){
 const base=structuredClone(app.state);
 const shot=name=>{step(70);app.game.step(app.scene.time.now+16,16);writeFileSync('tmp/horizon-'+name+'.png',getCanvas(app.game.canvas).toBuffer('image/png'));};
 const enter=id=>{app.enterExpedition(id);step(3);dismiss();assert(app.scene.isExpedition);assert.equal(app.scene.site.id,id);assert(app.scene.player.texture.key.startsWith('visual-'),'generated hero survives a scene restart');return app.scene;};
 // Repositioning only sets up a local interaction. Actions go through the same
 // nearest-object selection, keyboard input and runtime physics as free play.
 const at=(x,y)=>{const sc=app.scene;sc.state.x=x;sc.state.y=y;sc.reset();app.joy={x:0,y:0};step(2);dismiss();sc.updateNear();};
 const action=id=>{const sc=app.scene,e=sc.entities.find(e=>e.id===id);assert(e,'authored entity '+id);at(e.x,e.y+48);assert.equal(sc.near?.entity?.id,id,'normal E targets '+id);tapE();dismiss();};
 let sc=enter('glass');assert(sc.engine&&sc.finder&&sc.index,'three libraries support real systems');
 const x=sc.state.x;sc.keys.D.isDown=true;step(30);sc.keys.D.isDown=false;assert(sc.state.x>x+65,'Matter-driven movement works');
 shot('glass');
 // Walk into the heavy shard; the spring must remain blocked until the body
 // actually leaves its source position.
 const shard=sc.dynamic[0];at(shard.spec.x-70,shard.spec.y);app.joy={x:1,y:0};step(100);app.joy={x:0,y:0};step(25);assert(has(sc.state,'spring'),'pushing the rigid body really frees the spring');
 action('valve-a');action('valve-b');action('valve-b');action('cistern');for(const id of ['plant-a','plant-b','plant-c'])action(id);assert(has(sc.state,'complete'));
 const before={quest:app.state.quest,stage:app.state.stage};
 // Observe a moving generated creature, not a static codex button.
 const creature=sc.creatures[0];at(creature.x,creature.y+25);sc.toggleObserve();step(160);assert(sc.state.seen.includes(creature.species),'quiet observation records a new inhabitant');sc.toggleObserve();
 action('secret-0');assert.deepEqual(Array.from(sc.state.secrets),[0]);
 await app.save(false);globalThis.indexedDB=w.indexedDB;const saved=await readSave();assert.equal(saved.horizon.active,'glass');assert(has(saved.horizon.sites.glass,'complete'));
 app.state=saved;app.continueGame();dismiss();step(2);assert(app.scene.isExpedition&&has(app.scene.state,'complete'),'menu continue retains the local world');
 app.openMap();assert(w.document.querySelector('#world-map'));app.closePanel();app.openJournal('expeditions');assert.equal(w.document.querySelectorAll('.exp-card').length,4);app.closePanel();
 for(const lang of ['kk','en','ru']){app.changeLanguage(lang);assert(!w.document.querySelector('#hud').textContent.includes('undefined'));}
 app.exitInterior(false);step(2);assert.equal(app.state.horizon.active,null);assert.equal(app.state.quest,before.quest);assert.equal(app.state.stage,before.stage);
 sc=enter('hollow');shot('hollow');
 // Roll the acorn onto the pressure plate with real E impulses and collision.
 const acorn=sc.dynamic[0];at(650,740);sc.updateNear();assert.equal(sc.near.entity.kind,'heavy');tapE();step(80);
 at(acorn.body.position.x-65,acorn.body.position.y);app.joy={x:1,y:0};let frames=0;while(!has(sc.state,'gate')&&frames++<170)step();app.joy={x:0,y:0};assert(has(sc.state,'gate'),'pressure opens the real gate');
 for(const id of ['egg-a','egg-b','egg-c']){action(id);assert.equal(sc.state.carried,id);action('nest');}action('lens');assert(has(sc.state,'complete'));app.exitInterior(false);step(2);
 sc=enter('creek');shot('creek');
 for(const l of ['a','b','c']){action('bark-'+l);action('bridge-'+l);}
 assert(sc.bridgeBodies.every(b=>!sc.engine.world.bodies.includes(b.body)),'each bridge section removes its physical blocker');action('wheel');action('friend');
 // Follow the moving companion through its A* route; the path must cross the
 // rebuilt gap and reach home without cutting through either river bank.
 frames=0;while(!has(sc.state,'home')&&frames++<2200){const p=sc.state.friend;at(p.x+30,p.y+35);step(3);}
 assert(has(sc.state,'home'),'pathfinding companion reaches the real moss destination');assert(has(sc.state,'complete'));app.exitInterior(false);step(2);
 sc=enter('canopy');shot('canopy');action('lamp-1');assert.equal(sc.state.sequence.length,0);for(const id of ['lamp-2','lamp-1','lamp-3'])action(id);action('pollen');for(const id of ['bloom-a','bloom-b','bloom-c'])action(id);assert(has(sc.state,'complete'));action('telescope');assert(app.state.horizon.finished);shot('observatory');
 await app.save(false);const loaded=await readSave();assert(loaded.horizon.finished);assert(EXPEDITIONS.every(p=>has(loaded.horizon.sites[p.id],'complete')));
 app.exitInterior(false);step(2);app.state=base;app.worldScene.reset(base);dismiss();await app.save(false);
 console.log('FOUR EXPEDITIONS, RIGID BODIES, WATER, EGG CARRY, BRIDGE, A* ESCORT, OBSERVATIONS, SECRETS, THREE LANGUAGES, SAVES AND OBSERVATORY OK');
}
