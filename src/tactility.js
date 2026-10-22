import {FIELD_PROPS,PHYSICAL_UI,MATERIALS,springStep,canPlace} from './environment-model.js';
import {windAt} from './atmosphere.js';
const plants=['grass','fern','flower','pinkflower','blueflower','reed','moss-fan','seedpod','mushroom','fungal-cluster'];
const flowers=['flower','pinkflower','blueflower'];
const distance=(a,b)=>Math.hypot(a.x-b.x,a.y-b.y);
export class Tactility{
 constructor(scene){
  this.scene=scene;this.items=[];this.reactions=new WeakMap();this.lastFoot={x:0,y:0};this.lastAir=false;this.cooldown=0;
  this.group=scene.physics.add.group();
  for(const spec of FIELD_PROPS){
   const key=spec.kind==='pebble'?'rock':spec.kind;
   const scale={leaf:.64,twig:.70,cap:.46,pebble:.48,dew:1.15}[spec.kind];
   const sprite=scene.add.image(spec.x,spec.y,key).setOrigin(.5,.80).setScale(scale).setDepth(spec.y);
   const shadow=scene.add.image(spec.x,spec.y+3,'shadow').setScale(spec.kind==='leaf'?.75:.42,.35).setAlpha(.24).setDepth(2);
   const item={...spec,sprite,shadow,spring:{x:0,v:0},angle:0};
   if(['cap','pebble'].includes(spec.kind)){
    const zone=scene.add.zone(spec.x,spec.y,30,18);this.group.add(zone);
    zone.body.setAllowGravity(false).setDrag(220).setMaxVelocity(65).setBounce(.12).setMass(MATERIALS[spec.kind].mass).setCollideWorldBounds(true);
    zone.fieldItem=item;item.zone=zone;
   }
   this.items.push(item);
  }
  scene.physics.add.collider(scene.player,this.group,(_p,z)=>{
   const item=z.fieldItem;if(!item)return;
   item.spring.v+=Math.sign(scene.player.x-item.sprite.x||1)*28;
   if(scene.time.now>this.cooldown){scene.app.audio.play(item.kind==='cap'?'metal':'stone');this.cooldown=scene.time.now+350;}
  },()=>!scene.jumping&&scene.traverse.z<12&&!scene.app.state.crossing.boat.aboard);
  scene.physics.add.collider(this.group,scene.obstacles);scene.physics.add.collider(this.group,this.group);
  this.fx=scene.add.graphics().setDepth(6002);this.particles=[];
  this.refugeBugs=[0,1].map(i=>scene.add.image(0,0,'woodlouse0').setScale(.46).setVisible(false));
  this.reset();
 }
 get state(){return this.scene.app.state.objects;}
 reset(){
  const s=this.state;this.sheltered=false;this.lastAir=false;this.landingUntil=0;this.particles=[];this.fx.clear();this.refugeBugs.forEach(b=>b.setVisible(false));
  for(const item of this.items){const r=s.records[item.id]||{x:item.x,y:item.y,turned:false};item.sprite.setPosition(r.x,r.y);item.turned=r.turned===true;item.angle=item.turned?145:0;item.spring={x:0,v:0};item.zone?.body.reset(r.x,r.y);item.zone?.body.setVelocity(0);item.safe={x:r.x,y:r.y};item.moving=false;}
  this.lastFoot={x:this.scene.player.x,y:this.scene.player.y};
 }
 remember(item){const p=this.state.held===item.id?this.scene.player:item.sprite;this.state.records[item.id]={x:Math.max(24,Math.min(4776,p.x)),y:Math.max(24,Math.min(3276,p.y)),turned:item.kind==='cap'&&item.turned===true};}
 markers(){
  const scene=this.scene,p=scene.player;
  if(scene.traverse.z>12||scene.traverse.airborne||scene.app.state.crossing.boat.aboard)return[];
  if(this.state.held)return[{x:p.x,y:p.y,kind:'object',objectAction:'drop',stage:{title:PHYSICAL_UI.drop}}];
  const list=this.items.filter(i=>distance(i.sprite,p)<62).map(item=>({x:item.sprite.x,y:item.sprite.y,kind:'object',objectAction:item.kind,item,stage:{title:PHYSICAL_UI[item.kind]}}));
  for(const o of scene.props){
   if(!o.active||!o.visible||distance(o,p)>65)continue;
   if(flowers.includes(o.kind)||['log','nest-log'].includes(o.kind))list.push({x:o.x,y:o.y,kind:'object',objectAction:flowers.includes(o.kind)?'flower':'log',prop:o,stage:{title:PHYSICAL_UI[flowers.includes(o.kind)?'flower':'log']}});
   else if(o.kind==='dew')list.push({x:o.x,y:o.y,kind:'object',objectAction:'dew',prop:o,stage:{title:PHYSICAL_UI.dew}});
  }
  return list;
 }
 emit(x,y,type,count=8){
  const colors={leaf:0xaacb54,dew:0xb9f1ed,dust:0xd5b48b,pollen:0xffd36b};
  for(let i=0;i<count&&this.particles.length<90;i++)this.particles.push({x,y,vx:Math.sin(i*2.4)*25,vy:-14-i*2,life:.7+i*.03,color:colors[type]||colors.dust});
 }
 interact(m){
  const scene=this.scene,app=scene.app,s=this.state,item=m.item,o=item?.sprite||m.prop;
  if(m.objectAction==='drop')return this.drop();
  if(['leaf','twig'].includes(m.objectAction)){
   s.held=item.id;this.remember(item);app.audio.play(item.kind==='leaf'?'rustle':'wood');app.toast(app.l(PHYSICAL_UI[item.kind==='leaf'?'lifted':'twigHeld']));app.save(false);return;
  }
  if(m.objectAction==='cap'){
   item.turned=!item.turned;item.angle=item.turned?145:0;item.spring.v=70;this.remember(item);this.emit(o.x,o.y-5,'dust');app.audio.play('metal');app.save(false);return;
  }
  if(m.objectAction==='pebble'){
   const dx=o.x-scene.player.x,dy=o.y-scene.player.y,d=Math.max(1,Math.hypot(dx,dy));
   item.zone.body.setVelocity(dx/d*48,dy/d*48);item.spring.v=16;app.audio.play('stone');app.toast(app.l(PHYSICAL_UI.heavy));return;
  }
  if(m.objectAction==='dew'){
   if(item)item.spring.v+=75;else{const r=this.reaction(o);r.v+=75;}
   this.emit(o.x,o.y-25,'dew');app.audio.play('water');return;
  }
  if(m.objectAction==='flower'){
   const r=this.reaction(o);r.v+=95;this.emit(o.x,o.y-o.displayHeight*.6,'pollen',14);app.audio.play('rustle');
   if(scene.time.now>(this.flowerAt||0)){
    this.flowerAt=scene.time.now+3500;
    const visitors=scene.isNight()?['moth']:['bee','bumblebee','butterfly'];
    const pollinator=app.state.eco.safety>30&&scene.npcs.filter(n=>visitors.includes(n.species)&&distance(n,o)<450).sort((a,b)=>distance(a,o)-distance(b,o))[0];
    if(pollinator){pollinator.state='feed';pollinator.target={x:o.x,y:o.y-o.displayHeight*.6};pollinator.timer=5500;}
    app.toast(app.l(PHYSICAL_UI.nectar));
   }return;
  }
  if(m.objectAction==='log'){scene.observing=true;app.refreshHud();this.sheltered=true;this.emit(scene.player.x,scene.player.y,'dust',3);app.audio.play('wood');}
 }
 drop(force=false){
  const scene=this.scene,s=this.state,item=this.items.find(i=>i.id===s.held);if(!item)return true;
  const direction=[{x:0,y:1},{x:1,y:0},{x:-1,y:0},{x:0,y:-1}][scene.dir]||{x:0,y:1};
  const x=Math.round(scene.player.x+direction.x*42),y=Math.round(scene.player.y+direction.y*42);
  const guards=[...scene.markers,...FIELD_PROPS.filter(i=>i.kind!=='leaf'&&i.kind!=='twig')];
  if(!force&&(!canPlace(x,y,scene.waterZone,guards)||scene.obstacles.getChildren().some(z=>z.body?.enable&&Math.abs(z.x-x)<z.width/2+24&&Math.abs(z.y-y)<z.height/2+16))){scene.app.toast(scene.app.l(PHYSICAL_UI.blocked));return false;}
  item.sprite.setPosition(force?scene.player.x:x,force?scene.player.y:y);s.held=null;item.spring.v=50;this.remember(item);this.emit(item.sprite.x,item.sprite.y,'leaf');scene.app.audio.play('rustle');scene.app.save(false);return true;
 }
 reaction(o){if(!this.reactions.has(o))this.reactions.set(o,{x:0,v:0,contact:false});return this.reactions.get(o);}
 update(time,dt){
  const scene=this.scene,p=scene.player,s=this.state,ground=scene.traverse.z<12&&!scene.traverse.airborne&&!scene.app.state.crossing.boat.aboard;
  const moved=distance(p,this.lastFoot);
  // Footfalls come from the walk cycle's contact frames when the scene has
  // one; the distance fallback keeps other drivers (scripted moves) audible.
  const pulse=scene.stepPulse;if(pulse!==undefined)scene.stepPulse=false;
  if(ground&&(pulse!==undefined?pulse:moved>25&&moved<100)){this.lastFoot={x:p.x,y:p.y};this.emit(p.x,p.y+2,'dust',2);scene.app.audio.play(scene.passages?.wet?'wetstep':'step');}
  else if(moved>=100)this.lastFoot={x:p.x,y:p.y};
  if(this.lastAir&&ground){this.emit(p.x,p.y,'dust',10);scene.app.audio.play('land');this.landingUntil=time+180;}
  this.lastAir=scene.traverse.airborne;
  for(const o of scene.props){
   if(!o.active||distance(o,p)>750)continue;
   const r=this.reaction(o),flexible=plants.includes(o.kind)||o.kind==='dew';
   const close=ground&&Math.abs(o.x-p.x)<Math.min(55,o.displayWidth*.3)&&Math.abs(o.y-p.y)<36;
   if(close&&!r.contact){r.v+=(p.x>o.x?-1:1)*(flexible?65:12);if(time>this.cooldown){scene.app.audio.play(flexible?'rustle':o.kind==='cap'?'metal':'wood');this.cooldown=time+280;}}
   r.contact=close;springStep(r,dt,close&&flexible?(p.x>o.x?-95:95):0,flexible?42:140,flexible?7:16);
   o.angle=(o.baseAngle||0)+(flexible&&!scene.app.state.settings.low?windAt(o.x,o.y,time)*2.8:0)+r.x;
  }
  let shelter=null;
  for(const item of this.items){
   const o=item.sprite,held=s.held===item.id;
   if(held){o.setPosition(p.x+(scene.dir===2?-22:22),p.y-scene.traverse.z-25).setDepth(p.y+12);this.remember(item);}
   else if(item.zone){
    const z=item.zone;
    if(canPlace(z.x,z.y,scene.waterZone))item.safe={x:z.x,y:z.y};else{z.body.reset(item.safe.x,item.safe.y);z.body.setVelocity(0);}
    if(distance(o,z)>.3){o.setPosition(z.x,z.y);this.remember(item);item.angle+=z.body.velocity.x*dt*.16;}
    const moving=Math.hypot(z.body.velocity.x,z.body.velocity.y)>1;
    if(item.moving&&!moving){this.remember(item);scene.app.save(false);}item.moving=moving;
   }
   const d=distance(o,p),visible=held||d<950;o.setVisible(visible);item.shadow.setVisible(visible&&!held);
   if(item.zone){item.zone.body.enable=d<800; if(d>=800)item.zone.body.setVelocity(0);}
   if(!visible)continue;
   const contact=ground&&!held&&d<30;
   if(contact&&!item.touch){item.spring.v+=50;if(time>this.cooldown){scene.app.audio.play(item.kind==='dew'?'water':'rustle');this.cooldown=time+300;}}
   item.touch=contact;springStep(item.spring,dt,contact?35:0,MATERIALS[item.kind].stiffness,MATERIALS[item.kind].damping);
   o.setAngle(item.angle+item.spring.x+(held?Math.sin(time/200)*3:0));if(!held)o.setDepth(o.y+2);
   item.shadow.setPosition(o.x,o.y+3);
   if(item.kind==='leaf'&&!held&&s.records[item.id]&&d<130)shelter=item;
  }
  this.sheltered=ground&&scene.observing&&(!!shelter||scene.props.some(o=>o.active&&['log','leaf'].includes(o.kind)&&distance(o,p)<65));
  this.refugeBugs.forEach((bug,i)=>{
   const damp=shelter&&scene.passages?.humidity>65;
   bug.setVisible(!!damp);if(!damp)return;
   bug.setPosition(shelter.sprite.x+Math.sin(time/1900+i*2)*22,shelter.sprite.y+8+i*8).setDepth(shelter.sprite.y-1).setTexture('woodlouse'+Math.floor(time/300+i)%4);
   shelter.sprite.setAlpha(this.sheltered ? .5 : 1);if(this.sheltered)scene.discover('woodlouse');
  });
  for(const item of this.items)if(item!==shelter)item.sprite.setAlpha(1);
  if(this.sheltered)scene.app.setStatus(scene.app.l(PHYSICAL_UI.shelter));
  this.fx.clear();for(const f of this.particles){f.life-=dt;f.x+=f.vx*dt;f.y+=f.vy*dt;f.vy+=28*dt;this.fx.fillStyle(f.color,Math.min(.7,f.life));this.fx.fillRect(Math.round(f.x),Math.round(f.y),2,2);}
  this.particles=this.particles.filter(f=>f.life>0);
 }
}
