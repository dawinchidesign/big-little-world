import {createCanvas,loadImage} from '@napi-rs/canvas';
import {readFileSync,writeFileSync} from 'node:fs';
const names=['greenhouse','hollow','arch','pod','valve','cistern','sprout','bloom','shard','acorn','plate','amber','wheel','bridge','lantern','telescope'];
const specs=[['horizon-props',names],['horizon-creatures',['snail','beetle','lacewing','springtail'].flatMap(k=>[0,1,2,3].map(i=>'new-'+k+i))]];
const index={};
for(const [name,keys]of specs){
 const im=await loadImage('art-source/'+name+'.png');
 const out=createCanvas(1024,1024),g=out.getContext('2d'),src=createCanvas(im.width,im.height),sg=src.getContext('2d');sg.drawImage(im,0,0);
 const pixels=sg.getImageData(0,0,im.width,im.height).data;
 for(let i=0;i<16;i++){
  const col=i%4,row=Math.floor(i/4),sx=Math.round(col*im.width/4),sy=Math.round(row*im.height/4),ex=Math.round((col+1)*im.width/4),ey=Math.round((row+1)*im.height/4);
  let l=ex,r=sx,t=ey,b=sy;
  for(let y=sy;y<ey;y++)for(let x=sx;x<ex;x++)if(pixels[(y*im.width+x)*4+3]>25){l=Math.min(l,x);r=Math.max(r,x);t=Math.min(t,y);b=Math.max(b,y);}
  const w=r-l+1,h=b-t+1,scale=Math.min(238/w,238/h),dw=Math.round(w*scale),dh=Math.round(h*scale);
  // The registered contact point stays fixed across the animation cycle.
  g.drawImage(im,l,t,w,h,col*256+(256-dw)/2,row*256+248-dh,dw,dh);
  index[keys[i]]={atlas:name,frame:keys[i],width:dw,height:dh};
 }
 const frames=Object.fromEntries(keys.map((key,i)=>[key,{frame:{x:i%4*256,y:Math.floor(i/4)*256,w:256,h:256},rotated:false,trimmed:false,spriteSourceSize:{x:0,y:0,w:256,h:256},sourceSize:{w:256,h:256}}]));
 writeFileSync('public/assets/'+name+'.png',out.toBuffer('image/png'));
 writeFileSync('public/assets/'+name+'.json',JSON.stringify({frames,meta:{image:name+'.png',size:{w:1024,h:1024},scale:1}}));
}
const floors=await loadImage('art-source/horizon-floors.png');
for(let i=0;i<4;i++){
 const w=Math.floor(floors.width/2),h=Math.floor(floors.height/2),c=createCanvas(w,h);
 c.getContext('2d').drawImage(floors,i%2*w,Math.floor(i/2)*h,w,h,0,0,w,h);
 writeFileSync('public/assets/horizon-floor'+i+'.png',c.toBuffer('image/png'));
}
writeFileSync('public/assets/horizon-index.json',JSON.stringify(index,null,2));
console.log('Built 16 props, 16 animation frames, four terrain plates.');
