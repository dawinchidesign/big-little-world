import test from 'node:test';
import assert from 'node:assert/strict';
import { PARALLAX_PROFILES,parallaxLayout } from '../src/parallax-model.js';
const camera={scrollX:100,scrollY:50,zoom:1,width:960,height:540};
const anchor={scrollX:100,scrollY:50};
test('near and distant camera planes move by different amounts while the centre remains readable',()=>{
  const [far,,near]=PARALLAX_PROFILES.meadow;
  const shifted={...camera,scrollX:160,scrollY:30};
  const f=parallaxLayout(far,shifted,anchor,4000),n=parallaxLayout(near,shifted,anchor,4000);
  assert(Math.abs(n.screenX-near.x*camera.width)>Math.abs(f.screenX-far.x*camera.width)*4);
  assert(n.width>=camera.width,'near layer has enough margin for the pan');
  assert(n.screenX>camera.width*.4&&n.screenX<camera.width*.6,'pan stays bounded');
});
test('parallax registration survives zoom and viewport changes; reduced motion freezes relative drift',()=>{
  for(const zoom of [.65,1,2.1])for(const [width,height]of[[960,540],[540,960],[1280,720]]){
    const cam={...camera,width,height,zoom},spec=PARALLAX_PROFILES.room[0];
    const p=parallaxLayout(spec,cam,anchor,5000,true);
    const projectX=(p.x-cam.scrollX-width/2)*zoom+width/2;
    assert(Math.abs(projectX-spec.x*width)<1e-8);
    assert(Math.abs(p.width*zoom-spec.w*width)<1e-8);
    const later=parallaxLayout(spec,cam,anchor,9000,true);
    assert.deepEqual(p,later,'low effects removes automatic pan and sway');
  }
});
