import props from '../public/assets/horizon-props.json';
import creatures from '../public/assets/horizon-creatures.json';
import index from '../public/assets/horizon-index.json';
const path=n=>globalThis.LITTLE_WORLD_ASSETS?.[n]||'./assets/'+n;
export function preloadHorizon(scene){
 for(const [name,data]of [['horizon-props',props],['horizon-creatures',creatures]])scene.load.atlas(name,path(name+'.png'),data);
 for(let i=0;i<4;i++)scene.load.image('horizon-floor'+i,path('horizon-floor'+i+'.png'));
}
export function horizonImage(scene,x,y,art,width=100){
 const entry=index[art];
 const hi=art==='root'?'waterroot-hi':scene.textures.exists(art+'-hi')?art+'-hi':art;
 const o=entry?scene.add.image(x,y,entry.atlas,entry.frame):scene.add.image(x,y,hi);
 o.setOrigin(.5,1);
 if(entry)o.setScale(width/256);else o.setScale(width/(o.width/(o.visualDensity||1)));
 o.setDepth(y);return o;
}
export function setHorizonArt(o,art){
 const entry=index[art];if(entry)o.setTexture(entry.atlas,entry.frame);return o;
}
