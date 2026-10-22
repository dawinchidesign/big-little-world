import { soilNoise } from './atmosphere.js';
const rgb = hex => hex.replace('#','').match(/../g).map(n=>parseInt(n,16));
export function drawTerrain(c,b,material) {
  const w=800,h=550, base=rgb(b.color), dark=rgb(b.dark), light=rgb(b.light);
  const image=c.createImageData(w,h);
  let seed=b.id+81;
  const random=()=>{seed=(Math.imul(seed,1664525)+1013904223)>>>0;return seed/4294967296;};
  for(let y=0;y<h;y+=2) for(let x=0;x<w;x+=2) {
    const n=soilNoise(x+b.cell[0]*w,y+b.cell[1]*h);
    const shade=n<0?dark:light, blend=Math.abs(n)*.48;
    const grain=(random()-.5)*9;
    const values=base.map((v,i)=>Math.max(0,Math.min(255,Math.round(v*(1-blend)+shade[i]*blend+grain))));
    for(let yy=0;yy<2;yy++)for(let xx=0;xx<2;xx++) {const k=((y+yy)*w+x+xx)*4;for(let i=0;i<3;i++)image.data[k+i]=values[i];image.data[k+3]=255;}
  }
  c.putImageData(image,0,0);
  if(material){c.globalAlpha=b.id===7?.18:.34;c.fillStyle=c.createPattern(material,'repeat');c.fillRect(0,0,w,h);c.globalAlpha=1;}
  // Organic trails cross at exactly the same edge anchors in every biome.
  c.lineCap='round';c.lineJoin='round';
  const trail=()=>{c.beginPath();c.moveTo(0,275);c.bezierCurveTo(220,260,300,330,420,290);c.bezierCurveTo(540,250,630,264,800,275);c.moveTo(400,0);c.bezierCurveTo(390,160,420,420,400,550);};
  trail();c.strokeStyle=b.id===1?'#514535':b.id===7?'#233f42':'#344b36';c.lineWidth=38;c.globalAlpha=.38;c.stroke();
  trail();c.strokeStyle=b.id===1?'#897051':b.id===7?'#405c59':b.id===5?'#697063':'#6b7957';c.lineWidth=26;c.globalAlpha=.52;c.stroke();c.globalAlpha=1;
  // Scattered stones, fallen petals and fine moss instead of repeated ellipses.
  for(let i=0;i<1800;i++) {
    const x=Math.floor(random()*w), y=Math.floor(random()*h), t=soilNoise(x+b.id*59,y);
    c.globalAlpha=.12+random()*.22;c.fillStyle=t>.12?b.light:b.dark;
    const s=1+Math.floor(random()*3);c.fillRect(x,y,s*2,s);
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
