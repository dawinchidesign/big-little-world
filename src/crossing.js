import { FLOOD,DOCKS,ROOT_PATH,BRIDGE_PATH,WOOD,LEAVES,COVERS,CROSS_UI,routeTitle,routeEnding,selectRoute,boardFerry,dockFerry,tickResidents,pathPoint,delivered,crossingTask } from './crossing-data.js';
const distance=(a,b)=>Math.hypot(a.x-b.x,a.y-b.y);
export class Crossing {
 constructor(scene){
  this.scene=scene;this.objects=[];this.materials=[];this.people=[];this.covers=[];this.lastTick=-1;
  const add=(x,y,key,scale=1,depth=y)=>{const image=scene.add.image(x,y,key).setScale(scale).setDepth(depth);this.objects.push(image);return image;};
  this.water=add(3405,1795,'crossing-water',1,-85);
  this.ripples=[0,1,2].map(i=>add(3310+i*79,1740+i*48,'crossing-ripple',.55,-84));
  this.roots=[];
  for(let i=1;i<ROOT_PATH.length;i++){
   const a=ROOT_PATH[i-1],b=ROOT_PATH[i],length=distance(a,b),count=Math.ceil(length/100);
   for(let j=0;j<count;j++)this.roots.push(add(a.x+(b.x-a.x)*(j+.5)/count,a.y+(b.y-a.y)*(j+.5)/count,'crossing-root',1,4).setScale(length/count/140,1).setRotation(Math.atan2(b.y-a.y,b.x-a.x)));
  }
  add(3213,1790,'crossing-bank',.8,3).setAngle(85);
  add(3260,1620,'crossing-fork',.48,3).setAngle(15);
  add(3570,1790,'crossing-stone',.7,5);
  for(const dock of Object.values(DOCKS))add(dock.x,dock.y,'crossing-dock',.74,6);
  for(const [i,p]of WOOD.entries())this.materials.push({kind:'wood',i,sprite:add(p.x,p.y,'twig',.47),...p});
  for(const [i,p]of LEAVES.entries())this.materials.push({kind:'leaves',i,sprite:add(p.x,p.y,'leaf',.44),...p});
  for(const [i,p]of COVERS.entries())this.covers.push(add(p.x-23,p.y,'crossing-shelter',.67,p.y+20).setVisible(false));
  this.bridge=add(3520,1795,'crossing-bridge',1,8).setVisible(false);
  this.scout=add(3405,1590,'ant0',.9,1590);
  this.boat=add(DOCKS.north.x,DOCKS.north.y,'crossing-raft',1,1641);
  this.camp=add(3420,2027,'nest-litter',.76,2010);
  add(3460,2010,'crossing-shelter',.9,2011);
  this.signs=[{x:3300,y:1610,route:'roots'},{x:3520,y:1630,route:'bridge'}];
  for(const sign of this.signs)add(sign.x,sign.y,'twig',.45,sign.y).setAngle(-90);
  for(let i=0;i<6;i++){
   const sprite=add(3340+(i%3)*26,1590-Math.floor(i/3)*26,i<4?'ant0':'woodlouse0',i<4?.63:.65);
   const cargo=add(sprite.x,sprite.y,'colony-food',.20,sprite.y+1);
   this.people.push({sprite,cargo});
  }
  this.builders=[0,1].map(i=>add(3500+i*35,1660,'ant0',.72));
  this.rings=scene.add.graphics().setDepth(6050);this.objects.push(this.rings);
  this.label=scene.add.text(3375,1499,'',{fontFamily:'Field',fontSize:'15px',color:'#f0dba1',stroke:'#163d3a',strokeThickness:4}).setOrigin(.5).setDepth(6100);this.objects.push(this.label);
  this.waterBlocks=scene.physics.add.staticGroup();this.bridgeBlocks=scene.physics.add.staticGroup();
  for(let y=FLOOD.top;y<FLOOD.bottom;y+=16){
   for(const [x,w]of[[3377,234],[3548,4]])this.waterBlocks.add(scene.add.zone(x,y+8,w,16));
   this.bridgeBlocks.add(scene.add.zone(3520,y+8,52,16));
  }
  const collide=()=>!this.state.boat.aboard&&!scene.jumping&&scene.traverse.z<12;
  scene.physics.add.collider(scene.player,this.waterBlocks,null,collide);
  scene.physics.add.collider(scene.player,this.bridgeBlocks,null,collide);
  this.reset();
 }
 get state(){return this.scene.app.state.crossing;}
 get inRange(){return distance(this.scene.player,{x:3360,y:1770})<490;}
 reset(){this.lastSafe={x:3370,y:1600};this.lastTick=-1;this.sync();const s=this.state;if(s.boat.aboard)this.scene.player.body.reset(s.boat.x,s.boat.y-8);}
 sync(){const s=this.state;for(const b of this.bridgeBlocks.getChildren())b.body.enable=!s.bridgeBuilt;this.bridge.setVisible(s.bridgeBuilt);for(const m of this.materials)m.sprite.setVisible(!s[m.kind].includes(m.i));this.covers.forEach((c,i)=>c.setVisible(s.covers.includes(i)));this.label.setText(this.scene.app.l(CROSS_UI.title));}
 markers(){
  const s=this.state;if(!this.inRange||s.boat.aboard)return [];
  const marker=(x,y,action,title,index)=>({x,y,kind:'crossing',crossingAction:action,index,stage:{title}});
  const list=[marker(3405,1590,'inspect',CROSS_UI.inspect),marker(this.boat.x,this.boat.y,'boat',this.boat.y>1900?CROSS_UI.return:CROSS_UI.board),...this.signs.map(p=>marker(p.x,p.y,p.route,routeTitle(p.route)))];
  if(!s.done)for(const m of this.materials)if(!s[m.kind].includes(m.i))list.push(marker(m.x,m.y,m.kind,m.kind==='wood'?CROSS_UI.wood:CROSS_UI.fallen,m.i));
  if(s.route==='roots'&&!s.done)for(let i=0;i<COVERS.length;i++)if(!s.covers.includes(i))list.push(marker(COVERS[i].x,COVERS[i].y,'cover',CROSS_UI.cover,i));
  return list;
 }
 choose(route){
  const s=this.state,app=this.scene.app,changed=s.route!==route;
  if(s.done){app.dialog(CROSS_UI.title,routeEnding(s.route));return false;}
  if(!selectRoute(s,route)){app.toast(app.l(CROSS_UI.locked));return false;}
  if(changed){app.dialog(routeTitle(route),CROSS_UI[route+'Help'],()=>app.save(false));app.refreshHud();return false;}
  return true;
 }
 interact(m){
  const s=this.state,app=this.scene.app;
  s.visited=true;
  if(m.crossingAction==='inspect'){app.dialog(CROSS_UI.scout,s.done?routeEnding(s.route):CROSS_UI.intro,()=>app.save(false));return;}
  if(m.crossingAction==='wood'||m.crossingAction==='leaves'){
   const key=m.crossingAction;if(!s[key].includes(m.index))s[key].push(m.index);
   app.audio.play('click');this.sync();app.save(false);app.refreshHud();return;
  }
  if(m.crossingAction==='cover'){
   if(s.leaves.length<=s.covers.length)return app.toast(app.l(CROSS_UI.needLeaf));
   if(!s.covers.includes(m.index))s.covers.push(m.index);this.sync();app.save(false);app.refreshHud();return;
  }
  if(m.crossingAction==='roots'){this.choose('roots');return;}
  if(m.crossingAction==='bridge'){
   if(!this.choose('bridge'))return;
   if(s.wood.length<3)return app.toast(app.l(CROSS_UI.needWood));
   if(!s.bridgeBuilt){s.building=true;app.toast(app.l(CROSS_UI.ready));app.save(false);}return;
  }
  if(m.crossingAction==='boat'){
   if(this.scene.traverse.z>12||this.scene.traverse.airborne)return;
   if(!this.choose('leaf'))return;
   if(boardFerry(s)){this.scene.player.setVelocity(0);this.scene.player.body.reset(s.boat.x,s.boat.y-8);app.save(false);}
  }
 }
 moveRaft(x,y,dt,time){
  const s=this.state,b=s.boat,scene=this.scene;if(!b.aboard)return;
  b.x=Math.max(3280,Math.min(3450,b.x+x*105*dt+Math.sin(time/1300)*3*dt));
  b.y=Math.max(1640,Math.min(1945,b.y+y*105*dt));
  scene.player.body.reset(b.x,b.y-8);scene.player.setVelocity(0);
  scene.player.setTexture(`hero-idle${y<0?3:0}-${Math.floor(time/650)%4}`);
  const dock=dockFerry(s);
  if(dock){scene.player.body.reset(b.x,b.y+(dock==='south'?28:-28));this.lastSafe={x:scene.player.x,y:scene.player.y};scene.app.toast(scene.app.l(CROSS_UI.docked));scene.app.save(false);scene.app.refreshHud();}
  else scene.app.setStatus(scene.app.l(CROSS_UI.steer));
 }
 update(time,dt){
  const s=this.state,scene=this.scene,app=scene.app,near=this.inRange;
  for(const o of this.objects)o.setVisible(near);
  this.water.setVisible(near);this.camp.setVisible(near);
  if(!near)return;
  this.sync();
  if(!s.visited){s.visited=true;app.toast(app.l(CROSS_UI.title));app.refreshHud();app.save(false);}
  const p=scene.player;
  if(!s.boat.aboard&&scene.traverse.z<12&&!scene.traverse.airborne){
   const wet=p.x>FLOOD.left-7&&p.x<FLOOD.right+7&&p.y>FLOOD.top-8&&p.y<FLOOD.bottom+8;
   const onBridge=s.bridgeBuilt&&Math.abs(p.x-3520)<23;
   if(wet&&!onBridge){p.body.reset(this.lastSafe.x,this.lastSafe.y);p.setVelocity(0);if(time>(this.warnAt||0)){app.toast(app.l(CROSS_UI.water));this.warnAt=time+3500;}}
   else this.lastSafe={x:p.x,y:p.y};
  }
  if(s.building&&!s.bridgeBuilt){s.build=Math.min(1,s.build+dt/2.7);if(s.build===1){s.bridgeBuilt=true;s.building=false;this.sync();app.toast(app.l(CROSS_UI.built));app.save(false);app.refreshHud();}}
  if(s.route==='roots'&&s.rootStep<ROOT_PATH.length&&!s.boat.aboard&&scene.traverse.z<12&&distance(p,ROOT_PATH[s.rootStep])<34){s.rootStep++;if(s.rootStep===ROOT_PATH.length)s.heroCrossed=true;app.save(false);app.refreshHud();}
  if(s.route==='bridge'&&s.bridgeBuilt){if(Math.abs(p.x-3520)<26&&p.y<1680&&p.y>1590)s.bridgeEntered=true;if(s.bridgeEntered&&Math.abs(p.x-3520)<34&&p.y>1940)s.heroCrossed=true;}
  tickResidents(s,dt);
  if(!s.done&&s.heroCrossed&&delivered(s)===6){s.done=true;app.state.eco.safety=Math.min(100,app.state.eco.safety+5);app.audio.play('complete');app.dialog(CROSS_UI.complete,routeEnding(s.route),()=>app.save(false));app.save(false);app.refreshHud();}
  const b=s.boat;
  this.ripples.forEach((o,i)=>o.setAlpha(.25+.15*Math.sin(time/800+i)).setPosition(3310+i*79,1720+i*48+(time/80)%28));
  let bx=b.x,by=b.y;
  if(s.done&&s.route==='leaf'){bx=3370;by=1640+(Math.sin(time/3500)+1)/2*305;}
  this.boat.setPosition(bx,by).setDepth(by-1).setAngle(Math.sin(time/1700)*3);
  this.builders.forEach((o,i)=>o.setVisible(near).setPosition(3500+i*35+(s.building?Math.sin(time/350+i)*13:0),1660+(s.building?s.build*70:0)).setTexture('ant'+Math.floor(time/(s.building?110:600))%4));
  this.people.forEach(({sprite,cargo},i)=>{
   let pos={x:3328+i%3*28,y:1570-Math.floor(i/3)*26,angle:Math.PI},carrying=false;
   if(s.boat.cargo.includes(i))pos={x:bx+(s.boat.cargo.indexOf(i)?24:-24),y:by+3,angle:0};
   else if(s.done&&s.route==='leaf'&&i<2){pos={x:bx+(i?24:-24),y:by+3,angle:Math.PI};carrying=true;}
   else if(s.done&&s.route!=='leaf'&&i<4){const path=s.route==='bridge'?BRIDGE_PATH:ROOT_PATH;pos=pathPoint(path,(Math.sin(time/(s.route==='bridge'?3700:6200)+i*1.7)+1)/2);carrying=true;}
   else if(s.people[i]>0&&s.people[i]<1)pos=pathPoint(s.route==='roots'?ROOT_PATH:BRIDGE_PATH,s.people[i]);
   else if(s.people[i]===1)pos={x:3350+i%3*28,y:2002+Math.floor(i/3)*29,angle:0};
   sprite.setVisible(true).setPosition(pos.x,pos.y).setRotation(pos.angle).setDepth(pos.y+2).setTexture((i<4?'ant':'woodlouse')+Math.floor(time/190+i)%4);
   cargo.setVisible(carrying).setPosition(pos.x,pos.y-7).setDepth(pos.y+3);
  });
  this.rings.clear();this.rings.lineStyle(1,0xe6d397,.7);
  for(const m of this.markers())this.rings.strokeEllipse(m.x,m.y+10,26,10);
  if(s.route==='roots'&&s.rootStep<ROOT_PATH.length){const t=ROOT_PATH[s.rootStep];this.rings.lineStyle(2,0xa9d5b6,.9);this.rings.strokeEllipse(t.x,t.y,35,16);}
  if(Math.floor(time/700)!==this.lastTick){this.lastTick=Math.floor(time/700);app.refreshHud();}
 }
 stage(){return{title:crossingTask(this.state).map(t=>t+' · '+delivered(this.state)+'/6'),points:[]};}
}
