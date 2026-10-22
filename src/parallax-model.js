// Screen-space composition, expressed as fractions of the logical viewport.
// The camera still renders a live world; these sparse alpha planes frame it.
const meadow = [
  {key:'cine-distant',x:.5,y:.15,w:1.18,h:.55,depth:-80,rate:.07,alpha:.38},
  {key:'cine-bank',x:.5,y:.59,w:1.13,h:.95,depth:7900,rate:.22,alpha:.76},
  {key:'cine-leaves',x:.5,y:.5,w:1.18,h:1.14,depth:9000,rate:.62,alpha:.91},
];
export const PARALLAX_PROFILES = {
  meadow,
  night:[
    {...meadow[0],tint:0x49697b,alpha:.24},
    {key:'cine-night',x:.5,y:.5,w:1.17,h:1.13,depth:9000,rate:.62,alpha:.92},
  ],
  roots:[{key:'cine-roots',x:.5,y:.44,w:1.14,h:1.1,depth:9000,rate:.55,alpha:.85}],
  water:[{key:'cine-water',x:.5,y:.5,w:1.17,h:1.12,depth:1900,rate:.26,alpha:.58}],
  damaged:meadow.map(p=>({...p,tint:0x9d9c78,alpha:p.alpha*.65})),
  room:[
    {key:'room-wall',x:.5,y:.5,w:1.14,h:1.14,depth:8000,rate:.06,alpha:1},
    {key:'room-desk',x:.53,y:.53,w:1.11,h:1.11,depth:8002,rate:.25,alpha:1},
    {key:'room-bed',x:.47,y:.59,w:1.08,h:.92,depth:8003,rate:.55,alpha:1},
  ],
};
const clamp=(n,a,b)=>Math.max(a,Math.min(b,n));
// scale: dolly factor for cinematics — when the camera pushes in, nearer planes
// grow faster than distant ones, so the frame itself gains depth.
export function parallaxLayout(plane,camera,anchor,elapsed,reduced=false,ambient=false,scale=1) {
  const z=camera.zoom, width=camera.width,height=camera.height;
  const progress=clamp(elapsed/8500,0,1),ease=progress*progress*(3-2*progress);
  const pan=reduced?0:(ambient?Math.sin(elapsed/9000)*9:ease*30);
  const dx=reduced?0:clamp((camera.scrollX-anchor.scrollX)*z,-100,100)+pan;
  const dy=reduced?0:clamp((camera.scrollY-anchor.scrollY)*z,-70,70)-pan*.28;
  const sway=reduced?0:Math.sin(elapsed/3200)*plane.rate*3;
  const screenX=width/2+(plane.x*width-dx*plane.rate+sway-width/2)*scale;
  const screenY=height/2+(plane.y*height-dy*plane.rate-height/2)*scale;
  return {
    x:camera.scrollX+width/2+(screenX-width/2)/z,
    y:camera.scrollY+height/2+(screenY-height/2)/z,
    width:plane.w*width*scale/z,height:plane.h*height*scale/z,screenX,screenY,
  };
}
