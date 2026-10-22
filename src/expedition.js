import Phaser from 'phaser';
import EasyStar from 'easystarjs';
import RBush from 'rbush';
import {installVisuals} from './visuals.js';
import {horizonImage,setHorizonArt} from './expedition-art.js';
import {rng} from './art.js';
import {T} from './content.js';
import {EXPEDITIONS,EXP_W,EXP_H,HORIZON_UI,NEW_CREATURES,siteById,has,addFlag,act,waterFlow,bridgeOpen,siteComplete,objective} from './expedition-data.js';

const M=Phaser.Physics.Matter.Matter;
const distance=(a,b)=>Math.hypot(a.x-b.x,a.y-b.y);
const box=(x,y,r)=>({minX:x-r,minY:y-r,maxX:x+r,maxY:y+r});
const clamp=(v,a,b)=>Math.max(a,Math.min(b,v));

// Entrance props belong to the overworld. The expedition itself has its own
// physics, camera and save coordinates so returning never moves the main quest.
export class HorizonPortals {
 constructor(scene){
  this.scene=scene;
  this.items=EXPEDITIONS.map(spec=>{
   const [x,y]=spec.portal;
   const sprite=horizonImage(scene,x,y,spec.portalArt,spec.id==='glass'?220:190);
   const glow=scene.add.image(x,y-12,'light').setScale(.65).setAlpha(.13).setTint(0xd2e8a5).setDepth(y-2).setBlendMode(Phaser.BlendModes.ADD);
   const sign=scene.add.text(x,y+16,spec.number+' · '+scene.app.l(spec.title),{fontFamily:'Field, serif',fontSize:'13px',color:'#efe4c2',backgroundColor:'#163c34dd',padding:{x:10,y:6}}).setOrigin(.5,0).setDepth(y+18);
   return{spec,x,y,sprite,glow,sign};
  });
 }
 markers(){return this.items.map(o=>({x:o.x,y:o.y+40,kind:'horizon',expedition:o.spec.id,stage:{title:T('Войти: '+o.spec.title[0],'Кіру: '+o.spec.title[1],'Enter: '+o.spec.title[2])}}));}
 update(time){
  const p=this.scene.player;
  for(const o of this.items){
   const near=distance(p,o)<1050;
   o.sprite.setVisible(near);o.sign.setVisible(near);o.glow.setVisible(near);
   if(near){const done=has(this.scene.app.state.horizon.sites[o.spec.id],'complete');o.glow.setAlpha((done?.22:.12)+Math.sin(time/850)*.04);o.sign.setText((done?'✓ ':o.spec.number+' · ')+this.scene.app.l(o.spec.title));}
  }
 }
}

export class ExpeditionScene extends Phaser.Scene {
 constructor(app){super('Expedition');this.app=app;this.isExpedition=true;}
 init({id,first=false}={}){this.firstVisit=first;this.site=siteById[id||this.app.state.horizon.active||'glass'];this.lastBiome=this.site.biome;}
 create(){
  installVisuals(this);
  this.app.scene=this;this.state=this.app.state.horizon.sites[this.site.id];
  const first=this.firstVisit;
  this.state.visited=true;this.app.state.horizon.active=this.site.id;
  this.observing=false;this.scanning=false;this.humanView=false;this.cinematic=false;
  this.near=null;this.dir=0;this.jumpAt=-1000;this.lastStep=0;this.age=0;this.observeTime=0;this.focusedCreature=null;this.accumulator=0;this.checkTimer=0;
  this.engine=M.Engine.create({gravity:{x:0,y:0,scale:0}});
  this.engine.gravity.x=0;this.engine.gravity.y=0;
  this.walls=[];this.entities=[];this.dynamic=[];this.decor=[];this.creatures=[];this.particles=[];this.index=new RBush();
  this.textures.get('horizon-floor'+EXPEDITIONS.indexOf(this.site)).setFilter(Phaser.Textures.FilterMode.LINEAR);
  this.add.image(0,0,'horizon-floor'+EXPEDITIONS.indexOf(this.site)).setOrigin(0).setDisplaySize(EXP_W,EXP_H).setDepth(-100);
  this.paintPaths();
  this.fx=this.add.graphics().setDepth(7000);
  this.waterFx=this.add.graphics().setDepth(-25);
  this.markerFx=this.add.graphics().setDepth(6000);
  this.canopyFx=this.add.graphics().setScrollFactor(0).setDepth(8000);
  this.makeWalls();
  this.pBody=M.Bodies.circle(this.state.x,this.state.y,17,{frictionAir:.16,restitution:0,friction:0});
  M.Body.setMass(this.pBody,7);M.Body.setInertia(this.pBody,Infinity);M.Composite.add(this.engine.world,this.pBody);
  this.player=this.physics.add.sprite(this.state.x,this.state.y,'hero0-0').setOrigin(.5,1).setScale(2);
  this.player.body.moves=false;
  this.shadow=this.add.image(this.player.x,this.player.y,'shadow').setScale(.75,.40).setAlpha(.38).setDepth(5);
  this.heldSprite=this.add.image(0,0,'colony-eggs').setScale(.5).setVisible(false);
  this.makeEntities();this.makeDynamic();this.makeDecor();this.makeCreatures();this.buildNavigation();
  this.cameras.main.setBounds(0,0,EXP_W,EXP_H).setZoom(1.05).startFollow(this.player,true,.075,.075).fadeIn(this.app.state.settings.low?250:850,11,28,28);
  this.keys=this.input.keyboard.addKeys('W,A,S,D,UP,DOWN,LEFT,RIGHT,E,Q,C,M,J,V,SPACE,SHIFT,ESC,F');
  const actions={E:()=>this.interact(),Q:()=>this.toggleObserve(),C:()=>this.toggleScan(),M:()=>this.app.openMap(),J:()=>this.app.openJournal('expeditions'),V:()=>this.perspective(),SPACE:()=>this.jump(),ESC:()=>this.app.escape(),F:()=>this.app.fullscreen()};
  for(const[k,fn]of Object.entries(actions))this.keys[k].on('down',(_key,event)=>{if(this.app.scene!==this)return;event?.stopPropagation?.();if(this.app.mode==='play'||k==='ESC')fn();});
  this.input.mouse?.disableContextMenu();
  this.input.on('pointerdown',p=>{if(p.event.button===2&&this.app.mode==='play')this.toggleObserve();});
  this.events.once('shutdown',()=>{M.Composite.clear(this.engine.world,false);M.Engine.clear(this.engine);this.index.clear();});
  this.syncVisuals();this.reset();this.app.mode='play';this.app.refreshHud();
  this.app.audio.enter(this.lastBiome,this.site.night,this.app.state.eco);
  this.time.addEvent({delay:15000,loop:true,callback:()=>{if(this.app.mode==='play'){this.rememberBodies();this.app.save(false);}}});
  if(first)this.events.once('postupdate',()=>this.app.dialog(this.site.title,this.site.intro));
 }
 paintPaths(){
  const g=this.add.graphics().setDepth(-50),id=this.site.id;
  // These ribbons are traversable paths, drawn in world units over the painted
  // plates; their edges vary so moving between areas never reveals a tile grid.
  const path=(points,color,width,alpha)=>{g.lineStyle(width,color,alpha);g.beginPath();points.forEach((p,i)=>i?g.lineTo(...p):g.moveTo(...p));g.strokePath();};
  const lines=[[[250,790],[650,790],[1030,740],[1510,780],[1940,1050],[2110,1330]],[[650,790],[650,1080],[850,1250]],[[1030,740],[1040,450],[1670,430],[2040,550]]];
  for(const p of lines){path(p,id==='hollow'?0x241e20:0x153c34,95,.15);path(p,id==='hollow'?0x927352:0xc6b880,65,.09);}
  if(id==='glass'){
   path([[680,610],[1040,610],[1040,450],[1420,450],[1420,930],[660,930],[660,970]],0x152e2c,30,.72);
   path([[680,610],[1040,610],[1040,450],[1420,450],[1420,930],[660,930],[660,970]],0x598777,15,.4);
  }
  if(id==='canopy')for(let x=320;x<2300;x+=300){g.lineStyle(3,0xe0cb80,.13);g.lineBetween(x,1600,x+320,300);}
 }
 makeWalls(){
  const rect=(r,art)=>{
   const body=M.Bodies.rectangle(r.x,r.y,r.w,r.h,{isStatic:true,friction:.1});M.Composite.add(this.engine.world,body);this.walls.push({body,...r});
   if(art)for(let k=0;k<Math.max(r.w,r.h)/110;k++){
    const x=r.x+(r.w>r.h?(k+.5)*110-r.w/2:0),y=r.y+(r.h>=r.w?(k+.5)*110-r.h/2:0);
    horizonImage(this,x,y,art,r.w>r.h?140:180).setTint(this.site.id==='hollow'?0xbda07d:0xc6d5b2);
   }
   return body;
  };
  for(const r of [{x:EXP_W/2,y:8,w:EXP_W,h:45},{x:EXP_W/2,y:EXP_H-8,w:EXP_W,h:45},{x:8,y:EXP_H/2,w:45,h:EXP_H},{x:EXP_W-8,y:EXP_H/2,w:45,h:EXP_H}])rect(r);
  for(const r of this.site.walls)rect(r,this.site.id==='creek'?null:this.site.id==='hollow'?'root':'fern');
  if(this.site.id==='creek'){
   this.bridgeBodies=this.site.props.filter(e=>e.kind==='bridge').map(e=>({id:e.id,body:rect({x:e.x,y:e.y,w:120,h:200})}));
  }else if(this.site.gate){this.gateBody=rect(this.site.gate);this.gateSprite=horizonImage(this,this.site.gate.x,this.site.gate.y+70,'hollow',220);}
 }
 makeEntities(){
  const specials=[
   {id:'exit',x:210,y:810,kind:'exit',art:this.site.portalArt,label:HORIZON_UI.exit},
   {id:'board',x:410,y:650,kind:'board',art:'telescope',label:HORIZON_UI.board},
   {id:'reset',x:410,y:930,kind:'reset',art:'plate',label:HORIZON_UI.reset},
   ...this.site.secrets.map(([x,y],i)=>({id:'secret-'+i,secret:i,x,y,kind:'secret',art:'amber',label:HORIZON_UI.secret})),
  ];
  this.entities=[...this.site.props,...specials].map(e=>{
   const sizes={exit:205,board:85,reset:75,secret:45,egg:52,lens:75,valve:115,water:145,plant:125,pollinate:125,nest:180,bridge:145,bark:90,wheel:175,friend:67,home:185,lamp:150,pollen:170,telescope:200,plate:130};
   const sprite=horizonImage(this,e.x,e.y,e.art,sizes[e.kind]||100);
   const o={...e,sprite,baseY:e.y,scale:sprite.scaleX};
   this.index.insert({...box(e.x,e.y,12),entity:o});return o;
  });
  for(const e of this.entities.filter(e=>e.kind==='lamp')){
   e.numberLabel=this.add.text(e.x,e.y+12,String(e.number),{fontFamily:'Field',fontSize:'20px',color:'#ebd59a'}).setOrigin(.5).setDepth(e.y+1);
  }
  this.exitLabel=this.add.text(210,845,'← '+this.app.l(HORIZON_UI.exit),{fontFamily:'Field',fontSize:'13px',color:'#eedcaf',backgroundColor:'#112f2ce6',padding:{x:8,y:5}}).setOrigin(.5).setDepth(9000);
 }
 makeDynamic(){
  for(const spec of this.site.bodies){
   const saved=this.state.bodies[spec.id]||spec;
   const body=M.Bodies.circle(saved.x,saved.y,spec.radius,{restitution:.22,frictionAir:spec.art==='acorn'?.035:.075,friction:.05});
   M.Body.setMass(body,spec.mass);M.Body.setAngle(body,saved.angle||0);M.Composite.add(this.engine.world,body);
   const sprite=horizonImage(this,body.position.x,body.position.y+spec.radius*.5,spec.art,spec.radius*3.5);
   const shadow=this.add.image(body.position.x,body.position.y+6,'shadow').setScale(spec.radius/55,.4).setDepth(4).setAlpha(.4);
   this.dynamic.push({spec,body,sprite,shadow});
  }
 }
 makeDecor(){
  const r=rng(1180+EXPEDITIONS.indexOf(this.site)*913),id=this.site.id;
  const choices=id==='glass'?['fern','flower','grass','pinkflower','shard']:id==='hollow'?['mushroom','log','moss-fan','amber']:id==='creek'?['fern','reed','grass','rock']:['fern','blueflower','seedpod','bloom'];
  for(let i=0;i<140;i++){
   const x=100+r()*2200,y=180+r()*1300;
   if(this.entities.some(e=>Math.hypot(e.x-x,e.y-y)<145)||this.dynamic.some(d=>Math.hypot(d.spec.x-x,d.spec.y-y)<140))continue;
   if(id==='creek'&&x>1050&&x<1430)continue;
   if(this.site.walls.some(w=>Math.abs(w.x-x)<w.w/2+50&&Math.abs(w.y-y)<w.h/2+30))continue;
   const art=choices[i%choices.length],width=art==='amber'?45:art==='shard'?65:65+r()*120;
   const o=horizonImage(this,x,y,art,width).setAlpha(.72+r()*.28);o.baseAngle=(r()-.5)*9;
   const d={x,y,sprite:o,art,baseAngle:o.baseAngle,impulse:0,contact:false,phase:r()*6.28};
   this.decor.push(d);this.index.insert({...box(x,y,60),decor:d});
  }
  // A foreground canopy moves more slowly than the ground with the camera.
  this.foreground=[];
  for(let i=0;i<9;i++){
   const x=i*310,y=i%2?1540:120;
   const leaf=horizonImage(this,x,y,id==='hollow'?'root':'fern',320).setAlpha(.84).setDepth(8500);
   this.foreground.push(leaf);
  }
 }
 makeCreatures(){
  this.creatures=this.site.creatures.map(([species,x,y],i)=>({species,x,y,home:{x,y},sprite:horizonImage(this,x,y,'new-'+species+'0',species==='lacewing'?85:species==='snail'?90:72),phase:i*2.6,frame:-1}));
  if(this.site.id==='creek'){
   const e=this.entities.find(e=>e.id==='friend');
   e.sprite.setPosition(this.state.friend.x,this.state.friend.y);this.friendSprite=e.sprite;this.friendPath=[];this.friendPathAsked=false;
  }
 }
 buildNavigation(){
  const size=50,cols=EXP_W/size,rows=EXP_H/size;
  const open=this.site.id==='creek'?bridgeOpen(this.state):this.site.id==='hollow'?has(this.state,'gate'):true;
  this.grid=Array.from({length:rows},(_,y)=>Array.from({length:cols},(_,x)=>{
   const px=x*size+25,py=y*size+25;
   if(x===0||y===0||x===cols-1||y===rows-1)return 1;
   return this.walls.some(w=>this.engine.world.bodies.includes(w.body)&&!(w.body===this.gateBody&&open)&&Math.abs(px-w.x)<w.w/2+14&&Math.abs(py-w.y)<w.h/2+14)?1:0;
  }));
  this.finder=new EasyStar.js();this.finder.setGrid(this.grid);this.finder.setAcceptableTiles([0]);this.finder.enableDiagonals();this.finder.disableCornerCutting();this.finder.enableSync();this.finder.setIterationsPerCalculation(800);
  this.friendPathAsked=false;this.friendPath=[];
 }
 currentStage(){return{title:objective(this.site,this.state),points:this.site.goal.map(f=>{const e=this.entities.find(e=>e.id===f);return[e?.x||2090,e?.y||1350];})};}
 progress(){return this.site.goal.map((f,i)=>has(this.state,f)?i:-1).filter(i=>i>=0);}
 isNight(){return this.site.night;}
 reset(){
  this.state=this.app.state.horizon.sites[this.site.id];
  M.Body.setPosition(this.pBody,{x:clamp(this.state.x,65,EXP_W-65),y:clamp(this.state.y,65,EXP_H-65)});M.Body.setVelocity(this.pBody,{x:0,y:0});
  this.player.body.reset(this.pBody.position.x,this.pBody.position.y);this.syncVisuals();this.near=null;
 }
 refreshLabels(){this.exitLabel?.setText('← '+this.app.l(HORIZON_UI.exit));}
 rememberBodies(){
  for(const d of this.dynamic)this.state.bodies[d.spec.id]={x:clamp(d.body.position.x,50,EXP_W-50),y:clamp(d.body.position.y,50,EXP_H-50),angle:d.body.angle};
 }
 syncVisuals(){
  for(const e of this.entities){
   const done=has(this.state,e.id);
   const removed=(e.kind==='egg'&&(done||this.state.carried===e.id))||(e.kind==='bark'&&done)||(e.kind==='lens'&&done)||(e.kind==='friend'&&has(this.state,'home'));
   e.sprite.setVisible(!removed);e.sprite.setAlpha(1);
   if(e.kind==='plant'||e.kind==='pollinate')setHorizonArt(e.sprite,done?'bloom':'sprout');
   if(e.kind==='secret'){e.sprite.setVisible(!this.state.secrets.includes(e.secret));e.sprite.setAlpha(this.scanning?.9:.35);}
   if(e.kind==='bridge')e.sprite.setAlpha(done?1:.22);
   if(e.kind==='valve')e.sprite.angle=this.state.rotations[e.id]*90;
   if(e.kind==='lamp')e.sprite.setTint(has(this.state,'lanterns')||this.state.sequence.includes(e.number)?0xffffff:0x657d78);
  }
  if(this.gateBody){
   const open=this.site.id==='hollow'?has(this.state,'gate'):bridgeOpen(this.state);
   const present=this.engine.world.bodies.includes(this.gateBody);
   if(open&&present){M.Composite.remove(this.engine.world,this.gateBody);this.buildNavigation();}
   else if(!open&&!present){M.Composite.add(this.engine.world,this.gateBody);this.buildNavigation();}
   this.gateSprite?.setVisible(!open);
  }
  let changed=false;
  for(const b of this.bridgeBodies||[]){const present=this.engine.world.bodies.includes(b.body),open=has(this.state,b.id);if(open&&present){M.Composite.remove(this.engine.world,b.body);changed=true;}else if(!open&&!present){M.Composite.add(this.engine.world,b.body);changed=true;}}
  if(changed)this.buildNavigation();
 }
 toggleObserve(){this.observing=!this.observing;if(this.observing)this.scanning=false;this.observeTime=0;this.app.audio.play('click');this.app.refreshHud();}
 toggleScan(){this.scanning=!this.scanning;if(this.scanning)this.observing=false;this.syncVisuals();this.app.audio.play('scan');this.app.refreshHud();}
 perspective(){this.app.dialog(this.site.title,this.site.intro);}
 jump(){if(this.app.mode==='play'&&this.time.now-this.jumpAt>650){this.jumpAt=this.time.now;this.app.audio.play('jump');this.emit(this.player.x,this.player.y,0xcdbd93,9);}}
 interact(){
  if(this.app.mode!=='play'||!this.near)return;
  const e=this.near.entity;
  if(!e)return;
  if(e.kind==='exit'){
   this.rememberBodies();this.app.mode='transition';this.player.setVelocity(0);
   this.cameras.main.fadeOut(this.app.state.settings.low?100:400,10,27,25);
   this.cameras.main.once('camerafadeoutcomplete',()=>{this.app.exitInterior();this.app.scene.cameras.main.fadeIn(650,10,27,25);});return;
  }
  if(e.kind==='board'){this.app.dialog(this.site.title,this.site.intro);return;}
  if(e.kind==='reset'){
   for(const d of this.dynamic){M.Body.setPosition(d.body,{x:d.spec.x,y:d.spec.y});M.Body.setVelocity(d.body,{x:0,y:0});M.Body.setAngularVelocity(d.body,0);M.Body.setAngle(d.body,0);}
   this.rememberBodies();this.app.audio.play('wood');this.app.toast(this.app.l(HORIZON_UI.reset));this.app.save(false);return;
  }
  if(e.kind==='heavy'){
   const d=e.dynamic,dx=d.body.position.x-this.player.x,dy=d.body.position.y-this.player.y,l=Math.max(1,Math.hypot(dx,dy));
   M.Body.setVelocity(d.body,{x:dx/l*3.5/d.spec.mass*3,y:dy/l*3.5/d.spec.mass*3});this.app.audio.play(d.spec.art==='acorn'?'wood':'stone');this.emit(e.x,e.y,0xccb68f,6);return;
  }
  if(e.kind==='secret'){
   if(this.state.secrets.includes(e.secret))return;
   this.state.secrets.push(e.secret);this.app.audio.play('discovery');this.emit(e.x,e.y,0xffd77c,22);this.app.dialog(HORIZON_UI.secret,this.site.facts[e.secret]);this.syncVisuals();this.app.save(false);return;
  }
  if(e.kind==='creature'){
   const data=NEW_CREATURES[e.species];this.app.dialog(data.name,data.fact);return;
  }
  const before=this.state.flags.length,result=act(this.site,this.state,e,this.app.state.horizon);
  if(result.missing){const text=result.text.map((v,i)=>v+result.missing.map(s=>s.title[i]).join(', '));this.app.dialog(this.site.title,text);return;}
  this.app.toast(this.app.l(result.text));
  if(result.changed){
   this.app.audio.play(['water','plant'].includes(e.kind)?'water':['valve','wheel'].includes(e.kind)?'metal':'rustle');
   this.emit(e.x,e.y,['plant','pollinate'].includes(e.kind)?0xffdf86:0xbadfbc,18);
   if(e.kind==='plant'||e.kind==='pollinate'){this.tweens.add({targets:e.sprite,scaleX:e.scale*1.12,scaleY:e.scale*1.12,yoyo:true,duration:380,ease:'Sine.easeInOut'});}
   this.syncVisuals();this.checkComplete();this.rememberBodies();this.app.refreshHud();this.app.save(false);
   if(e.kind==='telescope'&&this.app.state.horizon.finished){this.cameras.main.flash(1000,241,217,160);this.app.audio.cue?.('bloom');this.app.dialog(this.site.title,HORIZON_UI.finale);}
  }
  if(this.state.flags.length>before)this.app.audio.play('discovery');
 }
 checkComplete(){
  if(!has(this.state,'complete')&&siteComplete(this.site,this.state)){
   addFlag(this.state,'complete');
   const eco=this.app.state.eco;for(const k of ['water','soil','flowers','safety'])eco[k]=Math.min(100,eco[k]+4);
   this.app.audio.play('complete');this.cameras.main.flash(400,190,212,150);
   this.app.toast(this.app.l(this.site.reward)+' · '+this.app.l(HORIZON_UI.completed));this.emit(this.player.x,this.player.y,0xf0d28b,38);this.app.refreshHud();this.app.save(false);
  }
 }
 updateNear(){
  const p=this.player;
  const list=this.index.search(box(p.x,p.y,160)).filter(v=>v.entity).map(v=>v.entity).filter(e=>e.sprite.visible&&!((e.kind==='plant'||e.kind==='pollinate')&&has(this.state,e.id))&&!(e.kind==='secret'&&this.state.secrets.includes(e.secret)));
  for(const d of this.dynamic)if(distance(p,d.body.position)<110)list.push({id:d.spec.id,x:d.body.position.x,y:d.body.position.y,kind:'heavy',dynamic:d,label:T('Толкнуть · '+(d.spec.art==='acorn'?'жёлудь':'тяжёлый предмет'),'Итеру · ауыр зат','Push · '+(d.spec.art==='acorn'?'acorn':'heavy object'))});
  for(const c of this.creatures)if(distance(p,c)<95)list.push({...c,kind:'creature',label:NEW_CREATURES[c.species].name});
  if(this.site.id==='creek'&&this.friendSprite?.visible){const friend=this.entities.find(e=>e.id==='friend');if(has(this.state,'escort')){const i=list.indexOf(friend);if(i>=0)list.splice(i,1);}else if(distance(p,this.friendSprite)<100&&!list.includes(friend))list.push(friend);}
  list.sort((a,b)=>distance(a,p)-distance(b,p));
  const e=list.find(e=>distance(e.kind==='friend'?this.friendSprite:e,p)<(e.kind==='bridge'?150:115));
  this.near=e?{kind:'expedition',entity:e,x:e.x,y:e.y,stage:{title:e.label}}:null;
  this.app.updatePrompt(this.near);
 }
 emit(x,y,color,count=8){
  if(this.app.state.settings.low)count=Math.min(6,count);
  for(let i=0;i<count&&this.particles.length<130;i++){
   const a=i*2.399;this.particles.push({x,y:y-15,vx:Math.cos(a)*(22+i*1.3),vy:Math.sin(a)*25-28,life:.7+i%5*.1,color});
  }
 }
 update(time,delta){
  if(!this.player)return;
  if(this.app.mode!=='play'){M.Body.setVelocity(this.pBody,{x:0,y:0});return;}
  const dt=Math.min(50,delta)/1000;this.age+=dt;this.checkTimer+=dt;
  this.app.state.played+=dt;
  const p=this.pBody.position,k=this.keys;
  let dx=(k.D.isDown||k.RIGHT.isDown?1:0)-(k.A.isDown||k.LEFT.isDown?1:0)+this.app.joy.x,dy=(k.S.isDown||k.DOWN.isDown?1:0)-(k.W.isDown||k.UP.isDown?1:0)+this.app.joy.y;
  const length=Math.hypot(dx,dy),speed=this.state.carried?2.6:k.SHIFT.isDown?4.9:this.observing?1.5:3.6;
  if(length>.05){dx/=Math.max(1,length);dy/=Math.max(1,length);M.Body.setVelocity(this.pBody,{x:dx*speed,y:dy*speed});this.dir=Math.abs(dx)>Math.abs(dy)?dx<0?2:1:dy<0?3:0;}else M.Body.setVelocity(this.pBody,{x:this.pBody.velocity.x*.55,y:this.pBody.velocity.y*.55});
  this.accumulator+=dt;let steps=0;while(this.accumulator>=1/60&&steps++<4){M.Engine.update(this.engine,1000/60);this.accumulator-=1/60;}
  this.state.x=clamp(p.x,45,EXP_W-45);this.state.y=clamp(p.y,45,EXP_H-45);
  const t=(time-this.jumpAt)/600,z=t>=0&&t<1?Math.sin(t*Math.PI)*55:0;
  this.player.setPosition(this.state.x,this.state.y-z).setDepth(this.state.y+5).setTexture('hero'+this.dir+'-'+(length>.05?Math.floor(time/(k.SHIFT.isDown?65:100))%8:0));
  this.shadow.setPosition(this.state.x,this.state.y+2).setScale(.75-z*.004,.4-z*.002);
  this.heldSprite.setVisible(!!this.state.carried).setPosition(this.player.x+17,this.player.y-30).setDepth(this.state.y+10);
  if(length>.05&&time-this.lastStep>240&&!z){this.lastStep=time;this.app.audio.play(this.site.id==='creek'?'wetstep':'step');this.emit(this.state.x,this.state.y,0xbcb293,2);}
  for(const d of this.dynamic){d.sprite.setPosition(d.body.position.x,d.body.position.y+d.spec.radius*.5).setDepth(d.body.position.y).setRotation(d.body.angle*.45);d.shadow.setPosition(d.body.position.x,d.body.position.y+6);}
  this.updatePuzzles(dt,time);this.updateLife(dt,time,length);this.updateDecor(dt,time);this.drawEffects(dt,time);
  if(this.checkTimer>.16){this.checkTimer=0;this.updateNear();this.app.updateLiveHud();this.rememberBodies();}
 }
 updatePuzzles(dt,time){
  const s=this.state;
  if(this.site.id==='glass'&&!has(s,'spring')){
   const shard=this.dynamic[0];if(distance(shard.body.position,shard.spec)>115){addFlag(s,'spring');this.app.toast(this.app.l(T('Исток свободен. Направьте вентили → и ↓.','Бастау ашылды. Шүмектерді → және ↓ бұрыңыз.','The spring is clear. Align the valves → and ↓.')));this.emit(680,610,0xb6e5e7,25);this.app.audio.play('water');this.app.refreshHud();this.app.save(false);}
  }
  if(this.site.id==='hollow'&&!has(s,'gate')){
   const d=this.dynamic[0],plate=this.entities.find(e=>e.id==='plate');
   this.plateWeight=distance(d.body.position,plate)<60?(this.plateWeight||0)+dt:0;
   if(this.plateWeight>.16){
    addFlag(s,'gate');M.Body.setVelocity(d.body,{x:0,y:0});this.syncVisuals();this.app.audio.play('stone');this.cameras.main.shake(280,.002);this.app.toast(this.app.l(T('Кора отодвинулась. Путь к кладкам открыт.','Қабық ашылды. Жұмыртқаларға жол ашық.','The bark slides aside. The way to the eggs is open.')));this.app.refreshHud();this.app.save(false);
   }
  }
  if(this.site.id==='creek'&&has(s,'escort')&&!has(s,'home'))this.updateCompanion(dt,time);
 }
 updateCompanion(dt,time){
  const s=this.state,home={x:520,y:1210};
  if(!this.friendPathAsked){
   this.friendPathAsked=true;
   this.finder.findPath(Math.floor(s.friend.x/50),Math.floor(s.friend.y/50),Math.floor(home.x/50),Math.floor(home.y/50),path=>{this.friendPath=(path||[]).slice(1).map(p=>({x:p.x*50+25,y:p.y*50+25}));});
  }
  this.finder.calculate();
  const close=distance(s.friend,{x:s.x,y:s.y})<310;
  if(close&&this.friendPath.length){
   const target=this.friendPath[0],d=distance(s.friend,target),step=Math.min(d,dt*100);
   if(d<4)this.friendPath.shift();else{s.friend.x+=(target.x-s.friend.x)/d*step;s.friend.y+=(target.y-s.friend.y)/d*step;}
  }else if(!close&&time>(this.friendWaitAt||0)){this.friendWaitAt=time+9000;this.app.toast(this.app.l(HORIZON_UI.wait));}
  this.friendSprite.setPosition(s.friend.x,s.friend.y).setDepth(s.friend.y+2).setFlipX(this.friendPath[0]?.x<s.friend.x);setHorizonArt(this.friendSprite,'new-springtail'+(close?Math.floor(time/120)%4:0));
  if(distance(s.friend,home)<55){addFlag(s,'home');this.friendSprite.setVisible(false);this.emit(home.x,home.y,0xc0e6ba,30);this.app.audio.play('complete');this.checkComplete();this.app.refreshHud();this.app.save(false);}
 }
 updateLife(dt,time,moving){
  let nearest=null;
  for(const c of this.creatures){
   const fly=c.species==='lacewing',pace=this.observing?.4:1;
   c.phase+=dt*(fly?.35:.13)*pace;
   const d=distance(c,this.player),flee=moving>.2&&d<95?1.8:1;
   c.x=c.home.x+Math.sin(c.phase)*120*flee;c.y=c.home.y+Math.cos(c.phase*.8)*65;
   c.sprite.setPosition(c.x,c.y+(fly?Math.sin(time/500+c.phase)*10:0)).setDepth(c.y+5).setFlipX(Math.cos(c.phase)<0);
   const frame=Math.floor(time/(fly?120:180))%4;if(frame!==c.frame){setHorizonArt(c.sprite,'new-'+c.species+frame);c.frame=frame;}
   if(d<170&&(!nearest||d<distance(nearest,this.player)))nearest=c;
  }
  if(this.observing&&nearest&&!this.state.seen.includes(nearest.species)){
   if(this.focusedCreature!==nearest.species){this.focusedCreature=nearest.species;this.observeTime=0;}
   this.observeTime+=dt;
   this.app.setStatus(this.app.l(NEW_CREATURES[nearest.species].name)+' · '+Math.min(100,Math.floor(this.observeTime/2.2*100))+'%');
   if(this.observeTime>=2.2){this.state.seen.push(nearest.species);this.app.audio.play('discovery');this.app.toast(this.app.l(HORIZON_UI.observed)+' · '+this.app.l(NEW_CREATURES[nearest.species].name));this.emit(nearest.x,nearest.y,0xf6d58c,18);this.app.save(false);}
  }else{this.observeTime=0;this.focusedCreature=null;}
 }
 updateDecor(dt,time){
  const close=this.index.search(box(this.state.x,this.state.y,130)).filter(v=>v.decor).map(v=>v.decor);
  for(const d of this.decor){
   const active=distance(d,this.player)<900;d.sprite.setVisible(active);if(!active)continue;
   const contact=close.includes(d)&&Math.abs(d.x-this.state.x)<45&&Math.abs(d.y-this.state.y)<30;
   if(contact&&!d.contact){d.impulse=(this.state.x<d.x?1:-1)*14;this.emit(d.x,d.y,0xb5d489,4);if(time>(this.rustleAt||0)){this.rustleAt=time+350;this.app.audio.play('rustle');}}
   d.contact=contact;d.impulse*=Math.max(0,1-dt*5);
   d.sprite.setAngle(d.baseAngle+(this.app.state.settings.low?0:Math.sin(time/1300+d.phase)*2)+d.impulse*Math.cos(time/75));
  }
 }
 drawEffects(dt,time){
  const s=this.state,g=this.fx;g.clear();
  for(const f of this.particles){f.life-=dt;f.x+=f.vx*dt;f.y+=f.vy*dt;f.vy+=35*dt;g.fillStyle(f.color,Math.min(.85,f.life));g.fillCircle(f.x,f.y,2);}
  this.particles=this.particles.filter(f=>f.life>0);
  this.waterFx.clear();
  if(this.site.id==='creek'||(this.site.id==='glass'&&waterFlow(s))){
   const w=this.waterFx;w.lineStyle(2,0xa8e7de,.36);
   for(let i=0;i<36;i++){
    const x=this.site.id==='creek'?1140+(i%5)*40:660+(i%12)*65,y=this.site.id==='creek'?(i*49+time*.08)%1550:930+Math.sin(i)*3;
    w.lineBetween(x,y,x+15,y+2);
   }
  }
  this.markerFx.clear();
  if(this.near){const m=this.markerFx;m.lineStyle(1.5,0xf4db9a,.6);m.strokeEllipse(this.near.entity.kind==='friend'?this.friendSprite.x:this.near.x,this.near.entity.kind==='friend'?this.friendSprite.y:this.near.y+3,56+Math.sin(time/300)*4,20);}
  if(this.scanning){for(const e of this.entities){if(!e.sprite.visible||has(s,e.id))continue;this.markerFx.lineStyle(1,0xa2e4d1,.6);this.markerFx.strokeCircle(e.x,e.y-20,30);}}
  const c=this.canopyFx;c.clear();
  if(this.site.night){c.fillStyle(0x102d39,this.app.state.horizon.finished&&this.site.id==='canopy'?.04:.12);c.fillRect(0,0,960,540);}
  if(!this.app.state.settings.low){
   for(let i=0;i<28;i++){const x=(i*127+Math.sin(time/6000+i)*35)%960,y=(i*79-time*.009+5400)%540;c.fillStyle(this.site.night?0xe6ce84:0xf1e8b0,.22+Math.sin(time/900+i)*.14);c.fillCircle(x,y,i%3===0?2:1);}
   c.fillStyle(0xffe9a5,.025);for(let i=0;i<3;i++)c.fillTriangle(80+i*320,0,260+i*320,0,140+i*320,540);
  }
  if(this.site.id==='creek'){
   const wheel=this.entities.find(e=>e.id==='wheel');if(has(s,'wheel'))wheel.sprite.setAngle(Math.sin(time/2300)*7);
  }
 }
 drawMap(c,w,h,big){
  const bg=this.textures.get('horizon-floor'+EXPEDITIONS.indexOf(this.site)).getSourceImage();c.drawImage(bg,0,0,w,h);
  const sx=w/EXP_W,sy=h/EXP_H;
  for(const e of this.entities){if(e.kind==='secret'&&!this.state.secrets.includes(e.secret))continue;c.fillStyle=has(this.state,e.id)?'#b4dda9':e.kind==='exit'?'#ffffff':e.kind==='secret'?'#ffc972':'#e9ca80';c.beginPath();c.arc(e.x*sx,e.y*sy,big?4:1.6,0,Math.PI*2);c.fill();}
  if(this.site.id==='creek'&&has(this.state,'escort')&&!has(this.state,'home')){c.fillStyle='#9be8ec';c.fillRect(this.state.friend.x*sx-3,this.state.friend.y*sy-3,6,6);}
  c.fillStyle='#ffffff';c.strokeStyle='#153e39';c.lineWidth=2;c.beginPath();c.arc(this.state.x*sx,this.state.y*sy,big?6:3,0,Math.PI*2);c.fill();c.stroke();
  if(big){c.font='16px Field';c.textAlign='left';c.fillStyle='#f6e6b5';c.fillText(this.app.l(this.site.title),20,28);}
 }
}
