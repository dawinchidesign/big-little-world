import test from 'node:test';
import assert from 'node:assert/strict';
import { emptyCrossing,selectRoute,boardFerry,dockFerry,delivered,tickResidents,readyForResidents,ROOT_PATH,BRIDGE_PATH,pathLength,pathPoint,CROSS_UI,validateCrossing } from '../src/crossing-data.js';
import { initialState,migrateSave } from '../src/model.js';
test('ferry makes three real round trips and cannot deliver twice at its departure bank',()=>{
 const s=emptyCrossing();
 for(let trip=0;trip<3;trip++){
  assert(boardFerry(s));assert.equal(s.boat.cargo.length,2);assert.equal(dockFerry(s),false);
  assert.equal(selectRoute(s,'bridge'),false);
  s.boat.y=1800;assert.equal(dockFerry(s),false);assert.equal(delivered(s),trip*2);
  s.boat.y=1945;assert.equal(dockFerry(s),'south');assert.equal(delivered(s),(trip+1)*2);
  assert.equal(dockFerry(s),false);
  if(trip<2){assert(boardFerry(s));assert.equal(s.boat.cargo.length,0);assert.equal(dockFerry(s),false);s.boat.y=1640;assert.equal(dockFerry(s),'north');}
 }
 assert(s.heroCrossed);assert.equal(delivered(s),6);
});
test('residents need both shaded root shelters or a repaired bridge after the hero crosses',()=>{
 for(const route of ['roots','bridge']){
  const s=emptyCrossing();selectRoute(s,route);tickResidents(s,30);assert(s.people.every(p=>p===0));
  s.heroCrossed=true;assert.equal(readyForResidents(s),false);
  if(route==='roots'){s.rootStep=ROOT_PATH.length;s.leaves=[0,1];s.covers=[0];assert.equal(readyForResidents(s),false);s.covers.push(1);}
  else{s.wood=[0,1,2];s.bridgeBuilt=true;s.build=1;}
  assert(readyForResidents(s));tickResidents(s,.25);assert(s.people[0]>0);assert.equal(selectRoute(s,'leaf'),false);
  for(let i=0;i<1500;i++)tickResidents(s,.016);
  assert.equal(delivered(s),6);assert.deepEqual(validateCrossing(s),s);
 }
 assert(pathLength(ROOT_PATH)>pathLength(BRIDGE_PATH));
 assert.deepEqual({...pathPoint(ROOT_PATH,1),angle:0},{...ROOT_PATH.at(-1),angle:0});
});
test('in-flight passengers and material progress survive version 5 saves; older saves start with an empty crossing',()=>{
 const s=initialState();s.crossing.wood=[0,2];boardFerry(s.crossing);s.crossing.boat.y=1785;
 const loaded=migrateSave(JSON.parse(JSON.stringify(s)));
 assert.deepEqual(loaded.crossing,s.crossing);assert.equal(loaded.y,1777);assert.equal(loaded.version,7);
 for(let version=1;version<=4;version++){const old=initialState();old.version=version;delete old.crossing;assert.deepEqual(migrateSave(old).crossing,emptyCrossing());}
 for(const bad of [{wood:[0,0]},{leaves:[],covers:[0]},{route:'teleport'},{people:[1]},{boat:{cargo:[0]}},{done:true},{building:true}])assert.throws(()=>validateCrossing(bad));
});
test('route selection is flexible until travel begins and every crossing message is trilingual',()=>{
 const s=emptyCrossing();assert(selectRoute(s,'roots'));s.heroCrossed=true;s.rootStep=ROOT_PATH.length;assert(selectRoute(s,'bridge'));assert.equal(s.heroCrossed,false);assert.equal(s.rootStep,0);assert(selectRoute(s,'leaf'));
 for(const [key,value]of Object.entries(CROSS_UI)){assert.equal(value.length,3,key);assert(value.every(t=>typeof t==='string'&&t.length>0),key);}
});
