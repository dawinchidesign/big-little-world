import {BIOMES} from './content.js';
import {PASSAGES,habitatWeights} from './environment-model.js';
import {ParallaxStage} from './parallax.js';
const flora=[['grass-hi','fern-hi'],['nest-root-arch','nest-log'],['flower-hi','pinkflower-hi'],['reed','lily'],['fungal-cluster','mushroom-hi'],['plastic','seedpod'],['grass-hi','seedpod'],['canopy-night','fern-hi'],['blueflower','flower-hi']];
export class Passages{
 constructor(scene){
  this.scene=scene;this.objects=[];this.lastBiome=-1;this.lastPoint=null;this.bannerAge=10;this.lastBanner=-10000;this.mix=[];
  for(const gate of PASSAGES){
   if(gate.a===3&&gate.b===4)continue; // The authored crossing is this passage.
   const ordered=[gate.a,gate.b].sort((a,b)=>BIOMES[a].cell[gate.vertical?0:1]-BIOMES[b].cell[gate.vertical?0:1]);
   for(const [side,id]of[[-1,ordered[0]],[1,ordered[1]]]){
    const biome=BIOMES[id];
    for(let i=0;i<3;i++){
     const across=i===1?-118:118+i*15,along=side*(90+i*50);
     const x=gate.x+(gate.vertical?along:across),y=gate.y+(gate.vertical?across:along);
     if(!scene.safePosition(x,y))continue;
     const key=flora[id][i%2],scale=key==='nest-root-arch'?.8:key==='lily'?.75:.75+i*.17;
     const shadow=scene.add.image(x,y+3,'shadow').setScale(1.5,.5).setAlpha(.21).setDepth(1);
     const image=scene.add.image(x,y,key).setOrigin(.5,.9).setScale(scale).setDepth(y);
     if(['nest-log','plastic','nest-root-arch'].includes(key))scene.obstacles.add(scene.add.zone(x,y-4,46,15));
     this.objects.push({image,shadow,base:0,seed:i+id,id});
    }
   }
  }
  this.title=scene.add.text(480,145,'',{fontFamily:'Field',fontSize:'27px',color:'#fff0ba',stroke:'#15352f',strokeThickness:5}).setOrigin(.5).setScrollFactor(0).setDepth(7201).setAlpha(0);
  this.sub=scene.add.text(480,177,'',{fontFamily:'Field',fontSize:'14px',color:'#dae7cf',stroke:'#15352f',strokeThickness:3}).setOrigin(.5).setScrollFactor(0).setDepth(7201).setAlpha(0);
  this.veil=scene.add.graphics().setScrollFactor(0).setDepth(7199);
 }
 reset(){this.lastBiome=-1;this.lastPoint=null;this.lastBanner=-10000;this.shown=undefined;this.bannerAge=10;this.title.setAlpha(0);this.sub.setAlpha(0);this.veil.clear();this.frame?.destroy();this.frame=null;}
 sample(x,y){
  this.mix=habitatWeights(x,y);this.humidity=this.mix.reduce((v,m)=>v+m.biome.humidity*m.weight,0);this.wet=this.humidity>86;
  return this.mix;
 }
 update(time,dt){
  const scene=this.scene,p=scene.player,app=scene.app;
  const mix=this.sample(p.x,p.y),b=mix.reduce((a,m)=>m.weight>a.weight?m:a).biome;
  const walk=this.lastPoint&&Math.hypot(p.x-this.lastPoint.x,p.y-this.lastPoint.y)<25;
  if(this.lastBiome>=0&&b.id!==this.lastBiome&&walk&&scene.traverse.z<12&&time-this.lastBanner>8000){this.bannerAge=0;this.lastBanner=time;this.shown=b.id;}
  this.lastBiome=b.id;this.lastPoint={x:p.x,y:p.y};
  this.bannerAge+=dt;
  const strength=Math.max(0,Math.min(1,this.bannerAge/.6,(4.4-this.bannerAge)/1.3));
  if(this.shown!==undefined){this.title.setText(app.l(BIOMES[this.shown].name));this.sub.setText(app.l(BIOMES[this.shown].sub));}
  this.title.setAlpha(strength).setY(145+(1-strength)*7);this.sub.setAlpha(strength*.85);
  this.veil.clear();if(strength>0){this.veil.fillStyle(0x0b2725,.36*strength);this.veil.fillRect(135,115,690,84);}
  let gateDistance=500,nearest=null;
  for(const gate of PASSAGES){const d=Math.hypot(p.x-gate.x,p.y-gate.y);if(d<gateDistance){gateDistance=d;nearest=gate;}}
  const framing=nearest&&gateDistance<270&&scene.traverse.z<12&&!app.state.crossing.boat.aboard;
  if(framing){
   const theme=[nearest.a,nearest.b].includes(7)?'night':[nearest.a,nearest.b].includes(3)?'water':[nearest.a,nearest.b].some(id=>[1,4].includes(id))?'roots':[nearest.a,nearest.b].some(id=>[5,6].includes(id))?'damaged':'meadow';
   if(this.frame?.theme!==theme){this.frame?.destroy();this.frame=new ParallaxStage(scene,{theme,ambient:true});}
   this.frame.update(time);const fade=Math.min(1,(270-gateDistance)/100)*.42;
   for(const layer of this.frame.layers)layer.sprite.setAlpha(layer.spec.alpha*fade);
   this.frame.particles.setAlpha(fade);
  }else if(this.frame){this.frame.destroy();this.frame=null;}
  if(!scene.traverse.airborne&&scene.traverse.z<12&&!scene.app.state.crossing.boat.aboard){
   const target=1.2-Math.max(0,1-gateDistance/270)*(app.state.settings.low?0:.09),cam=scene.cameras.main;
   cam.setZoom(cam.zoom+(target-cam.zoom)*Math.min(1,dt*2));
  }
  for(const prop of this.objects){
   const o=prop.image,d=Math.hypot(p.x-o.x,p.y-o.y),near=d<1100;
   o.setVisible(near);prop.shadow.setVisible(near);
   if(!near)continue;
   const contact=scene.traverse.z<12&&Math.abs(o.x-p.x)<o.displayWidth*.3&&Math.abs(o.y-p.y)<40;
   o.setAngle((app.state.settings.low?0:Math.sin(time/1700+prop.seed)*1.5)+(contact?(p.x>o.x?-6:6):0));
   o.setAlpha(o.y>p.y&&Math.abs(o.x-p.x)<o.displayWidth*.25?.5:1);
  }
 }
 hide(){this.title.setAlpha(0);this.sub.setAlpha(0);this.veil.clear();this.frame?.destroy();this.frame=null;}
}
