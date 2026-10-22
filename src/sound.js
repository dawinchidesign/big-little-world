import {Howl,Howler} from 'howler';
import {rng} from './art.js';
const SR=16000;
function wav(seconds,fn){const n=Math.floor(seconds*SR),buf=new ArrayBuffer(44+n*2),v=new DataView(buf);const str=(off,s)=>{for(let i=0;i<s.length;i++)v.setUint8(off+i,s.charCodeAt(i));};str(0,'RIFF');v.setUint32(4,36+n*2,true);str(8,'WAVE');str(12,'fmt ');v.setUint32(16,16,true);v.setUint16(20,1,true);v.setUint16(22,1,true);v.setUint32(24,SR,true);v.setUint32(28,SR*2,true);v.setUint16(32,2,true);v.setUint16(34,16,true);str(36,'data');v.setUint32(40,n*2,true);for(let i=0;i<n;i++)v.setInt16(44+i*2,Math.max(-1,Math.min(1,fn(i/SR,i)))*32760,true);const bytes=new Uint8Array(buf);let binary='';for(let i=0;i<bytes.length;i+=16384)binary+=String.fromCharCode(...bytes.subarray(i,i+16384));return 'data:audio/wav;base64,'+btoa(binary);}
function melody(b){const modes=[[0,4,7,11,14],[0,3,7,10,12],[0,4,7,9,14],[0,2,7,9,12],[0,3,5,10,12],[0,2,5,7,10],[0,1,5,7,12],[0,3,7,10,14],[0,4,7,12,16]],notes=modes[b],base=[146.83,110,164.81,130.81,98,110,103.83,123.47,146.83][b];return wav(16,t=>{const beat=Math.floor(t*2),n=notes[(beat*3+Math.floor(beat/8))%notes.length],f=base*2**(n/12),a=t%.5;const pluck=Math.sin(t*f*Math.PI*2)*Math.exp(-a*7)*(1-Math.exp(-a*80))*.11;const pad=[0,7,12].reduce((v,n)=>v+Math.sin(t*base*2**(n/12)*Math.PI*2),0)*.025;const fade=Math.min(1,t*3,(16-t)*3);return (pluck+pad)*fade;});}
function environment(kind){const r=rng(561+kind);let filtered=0;return wav(8,t=>{filtered=filtered*.985+(r()-.5)*.015;let wind=filtered*(.7+.3*Math.sin(t*.8));let chirp=0;if(kind===2){const p=t%.6;chirp=Math.sin(t*4100*6.283)*Math.max(0,1-p*15)*.045;}if(kind===1){const p=t%.7;chirp=Math.sin(t*(680+p*1400)*6.283)*Math.exp(-p*12)*.07;}if(kind===3)chirp=Math.sin(t*118*6.283)*(.015+.01*Math.sin(t*12));return wind+chirp;});}
// Cinematic score: a 24 s phrase of four chords (6 s each) — warm pad, sub root
// and a sparse celesta line that answers on the second half of each chord.
// Moods: hope (D major I–vi–IV–V), earth (dorian), tense (minor with a slow
// pulse), nocturne (lydian, high and quiet).
const SCORES={
 hope:{root:146.83,chords:[[0,4,7,11],[-3,0,4,7],[-7,-3,0,4],[-5,-1,2,7]],line:[12,11,7,9,14,12,11,7]},
 earth:{root:130.81,chords:[[0,3,7,10],[5,9,12,15],[0,3,7,10],[-2,2,5,9]],line:[7,10,12,10,15,12,10,7]},
 tense:{root:110,chords:[[0,3,7,12],[-4,0,3,8],[-7,-4,0,5],[-5,-1,2,7]],line:[12,11,8,7,15,14,12,11],pulse:true},
 nocturne:{root:123.47,chords:[[0,4,7,11],[2,6,9,14],[0,4,7,11],[-1,4,7,11]],line:[18,16,11,14,19,18,14,11]},
};
function score(mood){const s=SCORES[mood]||SCORES.hope,r=rng(mood.length*977);let n1=0;return wav(24,t=>{
 const ci=Math.floor(t/6)%4,ct=t%6,chord=s.chords[ci],prev=s.chords[(ci+3)%4];
 // Crossfade chords over 1.2 s so the pad never clicks at a change.
 const x=Math.min(1,ct/1.2),hz=(n)=>s.root*2**(n/12);
 let pad=0;for(let k=0;k<4;k++){pad+=Math.sin(t*hz(chord[k])*6.283+Math.sin(t*.7+k)*.6)*x+Math.sin(t*hz(prev[k])*6.283+Math.sin(t*.7+k)*.6)*(1-x);}
 pad*=.018*(.8+.2*Math.sin(t*.4));
 const sub=Math.sin(t*hz(chord[0]-12)*6.283)*.03*(s.pulse?(.55+.45*Math.cos(t*Math.PI*1.4)):1);
 const step=Math.floor(t/1.5),nt=t%1.5,note=s.line[step%8]+(ci===3&&step%2?-12:0);
 const bell=step%4===1?0:(Math.sin(t*hz(note)*6.283)+.35*Math.sin(t*hz(note)*2.76*6.283)*Math.exp(-nt*6))*Math.exp(-nt*3.2)*(1-Math.exp(-nt*120))*.05;
 n1=n1*.996+(r()-.5)*.004;
 const fade=Math.min(1,t/2,(24-t)/2);
 return (pad+sub+bell+n1*.4)*fade;});}
const CUES={
 // Filtered noise swept up and back: air displaced by the camera push.
 whoosh:[.75,(t,r,st)=>{const e=Math.sin(Math.PI*Math.min(1,t/.75))**2,a=.04+.5*e;st.l=st.l*(1-a)+(r()-.5)*a;st.b=st.b*.6+st.l*.4;return(st.l-st.b)*e*2.2;}],
 // Struck glass/bell for the line that carries the shot's meaning.
 chime:[2.2,t=>[1,2.76,5.4,8.9].reduce((v,p,i)=>v+Math.sin(t*1174.66*p*6.283)*Math.exp(-t*(1.6+i*2.2))/(1+i*1.4),0)*(1-Math.exp(-t*300))*.32],
 // Rising shimmer under white blooms (waking, emergence).
 bloom:[2.4,t=>{const e=Math.min(1,t/1.6)*Math.exp(-Math.max(0,t-1.6)*4);return[0,4,7,12,16].reduce((v,n,i)=>v+Math.sin(t*587.33*2**(n/12)*(1+t*.02)*6.283+i)*.2,0)*e*.4;}],
 // Dandelion flight: a long gust with a faint whistle, and a puff of dust on landing.
 wind:[4.2,(t,r,st)=>{const env=Math.min(1,t*1.5,(4.2-t)*1.2),k=.03+.02*Math.sin(t*2.1);st.l+=((r()-.5)-st.l)*k;st.b+=(st.l-st.b)*k;return st.b*9*env+Math.sin(t*(760+120*Math.sin(t*1.7))*6.283)*.012*env;}],
 dust:[.9,(t,r,st)=>{st.l+=((r()-.5)-st.l)*.3;st.b+=(st.l-st.b)*.3;return st.b*Math.exp(-t*5)*1.6;}],
 // Living world: a dew sip, a mushroom bounce, a glint, and litter popping free.
 drink:[.6,t=>Math.sin(t*(420+260*((t*9)%1))*6.283)*Math.exp(-t*4)*.1],
 boing:[.7,t=>Math.sin(t*(180+90*Math.sin(t*28)*Math.exp(-t*4)+t*120)*6.283)*Math.exp(-t*4.5)*.2*Math.min(1,t*300)],
 sparkle:[1.1,t=>[1174.66,1479.98,1760,2349.32].reduce((v,f,i)=>{const d=t-i*.06;return d<0?v:v+Math.sin(d*f*6.283)*Math.exp(-d*4)*.06;},0)],
 pop:[.25,t=>Math.sin(t*(900-t*1600)*6.283)*Math.exp(-t*22)*.18],
 // Weight under the catastrophe title.
 low:[3,t=>(Math.sin(t*49*6.283)+.4*Math.sin(t*73.4*6.283))*Math.exp(-t*1.1)*(1-Math.exp(-t*25))*.55],
};
export class Soundscape{
 constructor(){this.enabled=false;this.s={music:.3,ambience:.42,effects:.45};this.biome=-1;this.ambientKind=-1;this.current=null;this.ambient=null;this.muted=false;this.sfx={};this.retiring=new Set();}
 unlock(){this.enabled=true;Howler.ctx?.resume();}
 set(s){this.s=s;const gain=this.speaking?.27:1;this.current?.volume(this.muted?0:s.music*(this.scoreSound?.18:1)*gain);this.scoreSound?.volume(this.muted?0:Math.min(1,s.music*1.5)*gain);this.ambient?.volume(this.muted?0:s.ambience*(this.ambienceFactor||1)*(this.speaking?.6:1));}
 speech(active){this.speaking=active;this.set(this.s);}
 retire(sound){if(!sound)return;sound.fade(sound.volume(),0,850);this.retiring.add(sound);setTimeout(()=>{sound.unload();this.retiring.delete(sound);},950);}
 enter(id,night,eco){
  if(!this.enabled)return;
  if(this.biome!==id){this.retire(this.current);this.biome=id;this.current=new Howl({src:[melody(id)],format:['wav'],loop:true,volume:0});this.current.play();this.current.fade(0,this.muted?0:this.s.music*(this.scoreSound?.18:1)*(this.speaking?.27:1),1200);}
  const kind=night||id===7?2:id===3?1:id===1?0:3;
  this.ambienceFactor=(id===6?.3:1)*(.5+eco.flowers/200);
  if(this.ambientKind!==kind){this.retire(this.ambient);this.ambientKind=kind;this.ambient=new Howl({src:[environment(kind)],format:['wav'],loop:true,volume:0});this.ambient.play();this.ambient.fade(0,this.muted?0:this.s.ambience*this.ambienceFactor*(this.speaking?.6:1),1100);}
  else this.ambient?.volume(this.muted?0:this.s.ambience*this.ambienceFactor*(this.speaking?.6:1));
 }
 play(key){
  if(!this.enabled||this.muted)return;
  if(!this.sfx[key]){
   const tones={click:[440,.08],jump:[280,.2],discovery:[660,.7],complete:[523,1.2],step:[85,.09],water:[900,.3],scan:[500,.4],rustle:[1800,.22],wood:[160,.17],stone:[95,.16],metal:[1250,.27],land:[68,.19],wetstep:[350,.15]};
   const[f,d]=tones[key]||tones.click,r=rng(key.length*119+key.charCodeAt(0));let low=0;
   const data=wav(d,t=>{
    const env=Math.exp(-t*(key==='complete'?3:['metal','rustle'].includes(key)?16:28));
    let freq=f;if(key==='jump')freq=f+t*700;
    if(key==='complete'||key==='discovery')freq=f*[1,1.25,1.5,2][Math.min(3,Math.floor(t/d*4))];
    low=low*.68+(r()-.5)*.32;
    const noise=['rustle','step','wood','stone','land','wetstep'].includes(key);
    const wave=noise?low*(key==='rustle'?1.4:.8)+Math.sin(t*f*6.283)*(['wood','stone','land'].includes(key)?.22:.035):Math.sin(t*freq*6.283)*.5;
    return wave*env*.38;
   });
   this.sfx[key]=new Howl({src:[data],format:['wav'],volume:this.s.effects});
  }
  this.sfx[key].volume(this.s.effects);this.sfx[key].play();
 }
 // Cinematics duck the biome bed and bring in a mood score; stop restores it.
 cineStart(mood='hope'){
  if(!this.enabled)return;
  this.current?.fade(this.current.volume(),this.muted?0:this.s.music*.18,900);
  if(this.scoreMood===mood&&this.scoreSound)return;
  this.retire(this.scoreSound);this.scoreMood=mood;
  this.scores??={};this.scores[mood]??=score(mood);
  this.scoreSound=new Howl({src:[this.scores[mood]],format:['wav'],loop:true,volume:0});
  this.scoreSound.play();this.scoreSound.fade(0,this.muted?0:Math.min(1,this.s.music*1.5)*(this.speaking?.27:1),1600);
 }
 cineStop(){
  this.retire(this.scoreSound);this.scoreSound=null;this.scoreMood=null;
  this.current?.fade(this.current.volume(),this.muted?0:this.s.music*(this.speaking?.27:1),1400);
 }
 cue(key){
  if(!this.enabled||this.muted||!CUES[key])return;
  if(!this.sfx['cue-'+key]){
   const[d,fn]=CUES[key],r=rng(key.length*331),st={l:0,b:0};
   this.sfx['cue-'+key]=new Howl({src:[wav(d,t=>fn(t,r,st))],format:['wav']});
  }
  const h=this.sfx['cue-'+key];h.volume(this.s.effects);h.play();
 }
 perspective(human){this.current?.rate(human?.8:1);this.ambient?.rate(human?.65:1);}
 mute(v){this.muted=v;this.set(this.s);if(v)for(const h of this.retiring)h.volume(0);}
 destroy(){this.current?.unload();this.scoreSound?.unload();this.ambient?.unload();for(const h of [...Object.values(this.sfx),...this.retiring])h.unload();this.retiring.clear();}
}
