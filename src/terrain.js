import { soilNoise } from './atmosphere.js';
import {habitatWeights} from './environment-model.js';
import {BIOMES} from './content.js';
const rgb = hex => hex.replace('#','').match(/../g).map(n=>parseInt(n,16));
const BIOME_PALETTES=BIOMES.map(b=>({base:rgb(b.color),dark:rgb(b.dark),light:rgb(b.light)}));
export function drawTerrain(c,b,materials) {
  const w=800,h=550, base=rgb(b.color), dark=rgb(b.dark), light=rgb(b.light);
  const image=c.createImageData(w,h);
  let seed=b.id+81;
  const random=()=>{seed=(Math.imul(seed,1664525)+1013904223)>>>0;return seed/4294967296;};
  const palettes=BIOME_PALETTES;
  const maps=Object.fromEntries(Object.entries(materials).map(([key,im])=>[key,{w:im.width,h:im.height,data:im.getContext('2d').getImageData(0,0,im.width,im.height).data}]));
  // Sample the blended habitat colour on a coarse lattice (the expensive part),
  // then interpolate it per pixel and add fine grain. The result reads as a
  // continuous painted soil instead of 2 × 2 mosaic blocks when the camera zooms.
  const step=2,gw=w/step+1,gh=h/step+1,field=new Float32Array(gw*gh*3);
  for(let j=0;j<gh;j++) for(let i=0;i<gw;i++) {
    const x=Math.min(w-1,i*step),y=Math.min(h-1,j*step);
    const gx=x+b.cell[0]*w,gy=y+b.cell[1]*h,n=soilNoise(gx,gy);
    const mix=habitatWeights(gx*2+soilNoise(gx*.5,gy*.5)*36,gy*2+soilNoise(gx*.5+71,gy*.5)*36);
    const values=[0,0,0];
    for(const {biome:q,weight}of mix){
     const palette=palettes[q.id],shade=n<0?palette.dark:palette.light,blend=Math.abs(n)*.62;
     const key=q.id===3?'material-silt':[1,5,6].includes(q.id)?'material-clay':q.id===4?'material-humus':'material-moss';
     const map=maps[key],k=((gy%map.h)*map.w+gx%map.w)*4;
     for(let c3=0;c3<3;c3++)values[c3]+=(palette.base[c3]*(1-blend)+shade[c3]*blend)*.77*weight+map.data[k+c3]*.23*weight;
    }
    const o=(j*gw+i)*3;for(let c3=0;c3<3;c3++)field[o+c3]=values[c3];
  }
  const values=[0,0,0];
  for(let y=0;y<h;y++) {
    const fy=y/step,j=Math.min(gh-2,Math.floor(fy)),ty=fy-j;
    for(let x=0;x<w;x++) {
      const fx=x/step,i=Math.min(gw-2,Math.floor(fx)),tx=fx-i;
      const a=(j*gw+i)*3,bb=a+3,cc=a+gw*3,d=cc+3;
      for(let c3=0;c3<3;c3++){
        const top=field[a+c3]+(field[bb+c3]-field[a+c3])*tx,bottom=field[cc+c3]+(field[d+c3]-field[cc+c3])*tx;
        values[c3]=top+(bottom-top)*ty;
      }
      const gray=(values[0]+values[1]+values[2])/3,grain=(random()-.5)*8;
      const k=(y*w+x)*4;
      for(let c3=0;c3<3;c3++)image.data[k+c3]=Math.max(0,Math.min(255,Math.round((gray+(values[c3]-gray)*1.18)*1.05+grain)));
      image.data[k+3]=255;
    }
  }
  c.putImageData(image,0,0);
  // Organic trails cross at exactly the same edge anchors in every biome.
  c.lineCap='round';c.lineJoin='round';
  const trail=()=>{c.beginPath();c.moveTo(0,275);c.bezierCurveTo(220,260,300,330,420,290);c.bezierCurveTo(540,250,630,264,800,275);c.moveTo(400,0);c.bezierCurveTo(390,160,420,420,400,550);};
  trail();c.strokeStyle='#304c38';c.lineWidth=38;c.globalAlpha=.30;c.stroke();
  trail();c.strokeStyle='#9b9d6c';c.lineWidth=26;c.globalAlpha=.26;c.stroke();c.globalAlpha=1;
  // Scattered stones, fallen petals and fine moss instead of repeated ellipses.
  for(let i=0;i<1800;i++) {
    const x=Math.floor(random()*w), y=Math.floor(random()*h), t=soilNoise(x+b.id*59,y);
    c.globalAlpha=.12+random()*.22;c.fillStyle=t>.12?b.light:b.dark;
    const s=1+Math.floor(random()*2);c.fillRect(x,y,s*2,s);
    if(i%13===0){c.fillStyle=[0,2,8].includes(b.id)?'#b7b28b':'#9b8c71';c.fillRect(x,y,3,2);c.fillStyle=b.dark;c.fillRect(x,y+2,4,1);}
    if([0,2,8].includes(b.id)&&i%31===0){c.fillStyle=b.id===2?'#d9b3a0':'#a7ab71';c.fillRect(x,y,3,2);}
  }
  c.globalAlpha=1;
  if(b.id===3||b.id===8) {
    const cx=b.id===3?420:600,cy=b.id===3?340:170,rx=b.id===3?232:98,ry=b.id===3?124:49;
    for(let inset=0;inset<12;inset++) {c.fillStyle=['#324c46','#3b635b','#306969','#34757a'][Math.min(3,Math.floor(inset/3))];c.beginPath();c.ellipse(cx,cy,rx-inset*2,ry-inset*2,0,0,Math.PI*2);c.fill();}
    c.globalAlpha=.26;
    for(let i=0;i<65;i++){const a=random()*Math.PI*2,r=Math.sqrt(random())*.87;const x=cx+Math.cos(a)*rx*r,y=cy+Math.sin(a)*ry*r;c.fillStyle='#92c6b6';c.fillRect(x,y,8+random()*24,1);}
    c.globalAlpha=1;
    if(b.id===3){c.fillStyle='#a99c70';c.fillRect(368,254,30,220);for(let i=0;i<44;i++){c.fillStyle=i%2?'#807d5b':'#b8a97b';c.fillRect(368,254+i*5,30,2);}}
  }
  if(b.id===4){c.globalAlpha=.18;c.strokeStyle='#9da69a';c.lineWidth=1;for(let i=0;i<70;i++){const x=random()*w,y=random()*h;c.beginPath();c.moveTo(x,y);c.bezierCurveTo(x+30,y-10,x+40,y+20,x+80,y+6);c.stroke();}c.globalAlpha=1;}
}
