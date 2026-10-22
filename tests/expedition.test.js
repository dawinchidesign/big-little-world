import test from 'node:test';
import assert from 'node:assert/strict';
import {EXPEDITIONS,emptyHorizon,emptySite,validateHorizon,act,waterFlow,bridgeOpen,siteComplete,addFlag,has,HORIZON_UI,NEW_CREATURES} from '../src/expedition-data.js';
import {initialState,migrateSave} from '../src/model.js';
const setup=id=>{const h=emptyHorizon(),p=EXPEDITIONS.find(p=>p.id===id),s=h.sites[id];return{h,p,s,do:id=>act(p,s,p.props.find(e=>e.id===id),h)};};
test('glasshouse requires a clear spring and correctly aligned valves; dew cannot be spent twice',()=>{
 const {p,s,do:action}=setup('glass');
 assert(!action('cistern').changed);assert(!action('plant-a').changed);
 addFlag(s,'spring');action('valve-a');action('valve-b');action('valve-b');assert(waterFlow(s));
 action('cistern');assert.equal(s.water,3);
 for(const id of p.goal){assert(action(id).changed);assert(!action(id).changed);}
 assert.equal(s.water,0);assert(siteComplete(p,s));
 action('valve-b');assert(!waterFlow(s));assert(!action('cistern').changed);
});
test('eggs are carried individually and delivered to the nest; lantern errors reset the sequence',()=>{
 const {p,s,do:action}=setup('hollow');
 action('egg-a');assert.equal(s.carried,'egg-a');assert(!action('egg-b').changed);
 action('nest');assert(has(s,'egg-a'));assert.equal(s.carried,null);assert(!action('egg-a').changed);
 for(const id of ['egg-b','egg-c']){action(id);action('nest');}action('lens');assert(siteComplete(p,s));
 const c=setup('canopy');c.do('lamp-1');assert.deepEqual(c.s.sequence,[]);c.do('lamp-2');c.do('lamp-3');assert.deepEqual(c.s.sequence,[]);
 for(const id of ['lamp-2','lamp-1','lamp-3'])c.do(id);assert(has(c.s,'lanterns'));
 c.do('pollen');for(const id of ['bloom-a','bloom-b','bloom-c'])c.do(id);assert(siteComplete(c.p,c.s));
 assert(!c.do('telescope').changed,'finale waits for all habitats');
});
test('bridge sections consume collected bark, and companion waits for both bridge and water wheel',()=>{
 const {p,s,do:action}=setup('creek');assert(!action('friend').changed);assert(!action('bridge-a').changed);
 for(const letter of ['a','b','c']){action('bark-'+letter);assert(!action('bark-'+letter).changed);action('bridge-'+letter);}
 assert.equal(s.bark,0);assert(bridgeOpen(s));assert(!action('friend').changed);action('wheel');action('friend');assert(has(s,'escort'));assert(!siteComplete(p,s));
 addFlag(s,'home');assert(siteComplete(p,s));
});
test('v1–v6 saves gain independent expedition state; carried items, physics and discoveries survive a round trip',()=>{
 for(let version=1;version<=6;version++){const old=initialState();old.version=version;delete old.horizon;assert.deepEqual(migrateSave(old).horizon,emptyHorizon());}
 const state=initialState(),s=state.horizon.sites.hollow;s.visited=true;state.horizon.active='hollow';s.carried='egg-b';s.flags=['gate','egg-a'];s.bodies.acorn={x:1005,y:750,angle:.2};s.seen=['beetle'];s.secrets=[0];
 assert.deepEqual(migrateSave(JSON.parse(JSON.stringify(state))).horizon,state.horizon);
 for(const mutate of [h=>h.active='unknown',h=>h.sites.hollow.carried='bark-a',h=>h.sites.hollow.bodies.acorn.x=Infinity,h=>h.sites.hollow.flags.push('invented'),h=>h.sites.hollow.water=-1,h=>h.finished=true]){const h=structuredClone(state.horizon);mutate(h);assert.throws(()=>validateHorizon(h));}
 const invalid=structuredClone(state);invalid.colony.active=true;assert.throws(()=>migrateSave(invalid));
});
test('the observatory completes only after four restored habitats and every expedition text has three languages',()=>{
 const {h,p,s,do:action}=setup('canopy');
 for(const spec of EXPEDITIONS)h.sites[spec.id].flags=[...spec.goal,'complete'];
 assert(action('telescope').changed);assert(h.finished);assert.deepEqual(validateHorizon(h),h);
 const texts=[...Object.values(HORIZON_UI),...Object.values(NEW_CREATURES).flatMap(c=>[c.name,c.fact]),...EXPEDITIONS.flatMap(p=>[p.title,p.sub,p.intro,p.reward,...p.stages,...p.facts,...p.props.map(e=>e.label)])];
 for(const text of texts){assert.equal(text.length,3);assert(text.every(s=>typeof s==='string'&&s.length>0));}
});
