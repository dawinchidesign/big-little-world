import { PARALLAX_PROFILES, parallaxLayout } from './parallax-model.js';
import { visualEntry } from './visuals.js';

export class ParallaxStage {
  constructor(scene,{theme='meadow',ambient=false,morning=false}={}) {
    this.scene=scene;this.theme=theme;this.ambient=ambient;this.morning=morning;
    this.started=scene.time.now;this.anchor=null;this.destroyed=false;this.actors=[];
    this.layers=PARALLAX_PROFILES[theme].map(original=>{
      const spec=morning&&original.key==='room-wall'?{...original,key:'room-wall-morning'}:original;
      const sprite=scene.add.image(0,0,spec.key).setDepth(spec.depth).setAlpha(spec.alpha);
      if(spec.tint)sprite.setTint(spec.tint);
      return {spec,sprite};
    });
    this.particles=scene.add.graphics().setDepth(theme==='room'?8001:9100);
    this.onShutdown=()=>this.destroy();scene.events.once('shutdown',this.onShutdown);
  }
  actor(key,{x,y,w,h,rate=.36,depth=8004,frames=null,once=false,angle=0,to=null,travel=5000}={}) {
    const sprite=this.scene.add.image(0,0,key).setDepth(depth).setAngle(angle);
    this.actors.push({sprite,spec:{x,y,w,h,rate},frames,once,to,travel});
    return sprite;
  }
  update(time) {
    if(this.destroyed)return;
    const cam=this.scene.cameras.main;
    this.anchor??={scrollX:cam.scrollX,scrollY:cam.scrollY};
    const elapsed=Math.max(0,time-this.started),reduced=!!this.scene.app.state.settings.low;
    const place=({spec,sprite})=>{
      const p=parallaxLayout(spec,cam,this.anchor,elapsed,reduced,this.ambient);
      const entry=visualEntry(sprite.visualKey);
      sprite.setPosition(p.x,p.y).setScale(p.width/(entry.width/entry.density),p.height/(entry.height/entry.density));
      return p;
    };
    for(const layer of this.layers)place(layer);
    for(const actor of this.actors){
      const progress=Math.min(1,elapsed/actor.travel),ease=progress*progress*(3-2*progress);
      if(actor.frames){
        const index=actor.to?(progress===1?0:Math.floor(elapsed/120)%actor.frames.length):actor.once?Math.min(actor.frames.length-1,Math.floor(elapsed/380)):Math.floor(elapsed/650)%actor.frames.length;
        actor.sprite.setTexture(actor.frames[index]);
      }
      const spec=actor.to?{...actor.spec,x:actor.spec.x+(actor.to.x-actor.spec.x)*ease,y:actor.spec.y+(actor.to.y-actor.spec.y)*ease}:actor.spec;
      place({...actor,spec});
    }
    const g=this.particles;g.clear();
    if(this.theme==='room'&&!this.morning){
      // Rain belongs to the window plane, between the wall and furniture.
      g.lineStyle(1/cam.zoom,0xa9d7e7,.26);
      for(let i=0;i<(reduced?6:22);i++){
        const sx=cam.width*(.70+(i*37%220)/1000),sy=cam.height*(.10+((i*47+(reduced?0:elapsed*.035))%200)/1000);
        const p=parallaxLayout({x:sx/cam.width,y:sy/cam.height,w:0,h:0,rate:.06},cam,this.anchor,elapsed,reduced);
        g.lineBetween(p.x,p.y,p.x-2/cam.zoom,p.y+9/cam.zoom);
      }
    }else if(this.theme!=='room'){
      const color=this.theme==='night'?0xdce9a5:this.theme==='water'?0x9ad3ce:0xf3d492;
      for(let i=0;i<(reduced?5:17);i++){
        const motion=reduced?0:elapsed*.009;
        const p=parallaxLayout({x:((i*173+motion)%1100)/1100,y:((i*61-motion*.27+1100)%610)/610,w:0,h:0,rate:.18+(i%3)*.12},cam,this.anchor,elapsed,reduced,this.ambient);
        g.fillStyle(color,this.theme==='night'?.32:.13);
        g.fillRect(p.x,p.y,(i%3===0?2:1)/cam.zoom,(i%3===0?2:1)/cam.zoom);
      }
    }
  }
  destroy() {
    if(this.destroyed)return;
    this.destroyed=true;
    this.scene.events.off('shutdown',this.onShutdown);
    for(const item of [...this.layers,...this.actors])item.sprite.destroy();
    this.particles.destroy();this.layers=[];this.actors=[];
  }
}
