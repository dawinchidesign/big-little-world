import {Howl,Howler} from 'howler';
import {rng} from './art.js';
import {MusicEngine} from './music.js';
const SR=16000;
function wav(seconds,fn){const n=Math.floor(seconds*SR),buf=new ArrayBuffer(44+n*2),v=new DataView(buf);const str=(off,s)=>{for(let i=0;i<s.length;i++)v.setUint8(off+i,s.charCodeAt(i));};str(0,'RIFF');v.setUint32(4,36+n*2,true);str(8,'WAVE');str(12,'fmt ');v.setUint32(16,16,true);v.setUint16(20,1,true);v.setUint16(22,1,true);v.setUint32(24,SR,true);v.setUint32(28,SR*2,true);v.setUint16(32,2,true);v.setUint16(34,16,true);str(36,'data');v.setUint32(40,n*2,true);for(let i=0;i<n;i++)v.setInt16(44+i*2,Math.max(-1,Math.min(1,fn(i/SR,i)))*32760,true);const bytes=new Uint8Array(buf);let binary='';for(let i=0;i<bytes.length;i+=16384)binary+=String.fromCharCode(...bytes.subarray(i,i+16384));return 'data:audio/wav;base64,'+btoa(binary);}
function melody(b){const modes=[[0,4,7,11,14],[0,3,7,10,12],[0,4,7,9,14],[0,2,7,9,12],[0,3,5,10,12],[0,2,5,7,10],[0,1,5,7,12],[0,3,7,10,14],[0,4,7,12,16]],notes=modes[b],base=[146.83,110,164.81,130.81,98,110,103.83,123.47,146.83][b];return wav(16,t=>{const beat=Math.floor(t*2),n=notes[(beat*3+Math.floor(beat/8))%notes.length],f=base*2**(n/12),a=t%.5;const pluck=Math.sin(t*f*Math.PI*2)*Math.exp(-a*7)*(1-Math.exp(-a*80))*.11;const pad=[0,7,12].reduce((v,n)=>v+Math.sin(t*base*2**(n/12)*Math.PI*2),0)*.025;const fade=Math.min(1,t*3,(16-t)*3);return (pluck+pad)*fade;});}
function environment(kind){const r=rng(561+kind);let filtered=0;return wav(8,t=>{filtered=filtered*.985+(r()-.5)*.015;let wind=filtered*(.7+.3*Math.sin(t*.8));let chirp=0;if(kind===2){const p=t%.6;chirp=Math.sin(t*4100*6.283)*Math.max(0,1-p*15)*.045;}if(kind===1){const p=t%.7;chirp=Math.sin(t*(680+p*1400)*6.283)*Math.exp(-p*12)*.07;}if(kind===3)chirp=Math.sin(t*118*6.283)*(.015+.01*Math.sin(t*12));return wind+chirp;});}
// Transition sound design: filtered noise and tuned partials, synthesised like the rest of the score.
function noiseSource(seed){const r=rng(seed);let a=0,b=0;return k=>{const w=r()-.5;a+=(w-a)*k;b+=(a-b)*k;return b;};}
export const TRANSITION_SFX={
 whoosh:[1.6,()=>{const n=noiseSource(71);return t=>{const env=Math.sin(Math.min(1,t/1.6)*Math.PI)**1.6;return n(.04+.5*env)*env*1.15;};}],
 wind:[4.2,()=>{const n=noiseSource(72),m=noiseSource(73);return t=>{const env=Math.min(1,t*1.5,(4.2-t)*1.2);const whistle=Math.sin(t*(760+120*Math.sin(t*1.7))*6.283)*.012*env;return (n(.03+.02*Math.sin(t*2.1))*3+m(.25)*.25)*env+whistle;};}],
 chime:[1.8,()=>t=>[1,1.5,2,2.997].reduce((v,h,i)=>v+Math.sin(t*587.33*h*6.283)*Math.exp(-t*(2.4+i*1.3))*(.18/(i+1))*Math.min(1,t*200),0)],
 bloom:[1.1,()=>t=>[0,4,7,12].reduce((v,s,i)=>{const at=t-i*.07;return at<0?v:v+Math.sin(at*392*2**(s/12)*6.283)*Math.exp(-at*4)*.12;},0)],
 splash:[1.3,()=>{const n=noiseSource(74);return t=>n(.6*Math.exp(-t*3)+.05)*Math.exp(-t*4.5)*1.3+Math.sin(t*(300-180*t)*6.283)*Math.exp(-t*7)*.08;}],
 bubbles:[1.6,()=>{const r=rng(75),pops=Array.from({length:14},()=>[r()*1.4,500+r()*900]);return t=>pops.reduce((v,[at,f])=>{const d=t-at;return d<0||d>.12?v:v+Math.sin(d*(f+d*6000)*6.283)*Math.exp(-d*38)*.17;},0);}],
 rumble:[1.7,()=>{const n=noiseSource(76);return t=>{const env=Math.min(1,t*3)*Math.exp(-Math.max(0,t-.8)*2.5);return (n(.012)*5+Math.sin(t*46*6.283)*.07)*env;};}],
 dust:[.9,()=>{const n=noiseSource(77);return t=>n(.3)*Math.exp(-t*5)*1.4;}]
};
// Musical one-shots: soft bells and plucks in tune with the score (D major-ish centre).
const BELL=(notes,step,decay,level)=>t=>notes.reduce((v,f,i)=>{const at=t-i*step;if(at<0)return v;const m=Math.sin(at*f*3.5*6.283)*f*1.6*Math.exp(-at*6);return v+Math.sin(at*f*6.283+m/f)*Math.exp(-at*decay)*level*Math.min(1,at*300);},0);
const TONES={
 click:[.12,()=>t=>Math.sin(t*1320*6.283)*Math.exp(-t*60)*.12+Math.sin(t*660*6.283)*Math.exp(-t*30)*.08],
 jump:[.32,()=>t=>Math.sin(t*(330+t*900)*6.283)*Math.exp(-t*9)*.16*Math.min(1,t*200)],
 discovery:[1.6,()=>BELL([587.33,739.99,880,1174.66],.09,2.6,.11)],
 complete:[2.6,()=>t=>[293.66,369.99,440,587.33,739.99].reduce((v,f,i)=>{const at=t-i*.07;return at<0?v:v+(Math.sin(at*f*6.283)+.3*Math.sin(at*f*2*6.283))*Math.min(1,at*8)*Math.exp(-at*1.4)*.06;},0)],
 step:[.06,()=>t=>Math.sin(t*100*6.283)*Math.exp(-t*40)*.15],
 water:[.45,()=>t=>Math.sin(t*(700+500*Math.exp(-t*14))*6.283)*Math.exp(-t*9)*.14],
 scan:[.5,()=>t=>Math.sin(t*(500+t*600)*6.283)*Math.exp(-t*5)*.08+Math.sin(t*1000*6.283)*Math.exp(-t*12)*.04],
 pop:[.25,()=>t=>Math.sin(t*(900-t*1600)*6.283)*Math.exp(-t*22)*.18],
 boing:[.7,()=>t=>Math.sin(t*(180+90*Math.sin(t*28)*Math.exp(-t*4)+t*120)*6.283)*Math.exp(-t*4.5)*.2*Math.min(1,t*300)],
 rustle:[.5,()=>{const n=noiseSource(78);return t=>n(.35)*Math.exp(-t*7)*1.6*Math.min(1,t*40);}],
 sparkle:[1.1,()=>BELL([1174.66,1479.98,1760,2349.32],.06,4,.06)],
 drink:[.6,()=>t=>Math.sin(t*(420+260*((t*9)%1))*6.283)*Math.exp(-t*4)*.1]
};
export class Soundscape{
 constructor(){this.enabled=false;this.s={music:.3,ambience:.42,effects:.45};this.biome=-1;this.theme=null;this.ambientKind=-1;this.current=null;this.ambient=null;this.muted=false;this.sfx={};this.music=new MusicEngine();this.ambienceFactor=1;}
 unlock(){this.enabled=true;Howler.ctx?.resume();}
 engine(){if(this.music.ready)return true;try{Howler.volume();}catch{}return !!(Howler.usingWebAudio&&Howler.ctx&&this.music.attach(Howler.ctx));}
 set(s){this.s=s;this.music.setVolume(s.music);this.current?.volume(this.muted?0:s.music);this.ambient?.volume(this.muted?0:s.ambience*this.ambienceFactor);}
 enter(id,night,eco,theme=id){if(!this.enabled)return;
  if(this.engine()){this.biome=id;this.music.setVolume(this.s.music);this.music.play(theme,!!night);}
  else if(this.biome!==id){this.current?.fade(this.current.volume(),0,600);const old=this.current;setTimeout(()=>old?.unload(),700);this.biome=id;this.current=new Howl({src:[melody(id)],format:['wav'],loop:true,volume:0});this.current.play();this.current.fade(0,this.muted?0:this.s.music,1000);}
  const kind=night||id===7?2:id===3?1:id===1?0:3;this.ambienceFactor=(id===6?.3:1)*(.5+eco.flowers/200);
  if(this.ambientKind!==kind){this.ambient?.unload();this.ambientKind=kind;this.ambient=new Howl({src:[environment(kind)],format:['wav'],loop:true,volume:this.muted?0:this.s.ambience*this.ambienceFactor});this.ambient.play();}
  else this.ambient?.volume(this.muted?0:this.s.ambience*this.ambienceFactor);}
 play(key,rate=1){if(!this.enabled||this.muted)return;const spec=TRANSITION_SFX[key]||TONES[key]||TONES.click;
  if(!this.sfx[key]){const[d,fn]=spec;this.sfx[key]=new Howl({src:[wav(d,fn())],format:['wav'],volume:this.s.effects});}
  this.sfx[key].volume(this.s.effects);const id=this.sfx[key].play();if(rate!==1)this.sfx[key].rate(rate,id);}
 perspective(human){this.music.perspective(human);this.current?.rate(human?.8:1);this.ambient?.rate(human?.65:1);}
 mute(v){this.muted=v;this.music.mute(v);this.set(this.s);}
 destroy(){this.music.stop();this.current?.unload();this.ambient?.unload();for(const h of Object.values(this.sfx))h.unload();}
}