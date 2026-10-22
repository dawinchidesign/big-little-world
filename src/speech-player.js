import {Howl} from 'howler';

export const voiceTextKey=text=>String(text??'').normalize('NFKC').replace(/\s+/g,' ').trim();

// Speech is pre-rendered ElevenLabs audio. Playback never calls a voice API.
// A monotonically increasing ticket prevents an old network load or unlock
// callback from speaking after the player skipped, switched language or left.
export class SpeechPlayer {
 constructor(app,catalog,HowlClass=Howl){
  this.app=app;this.Howl=HowlClass;this.clips=new Map();this.cache=new Map();this.ticket=0;this.current=null;this.last=null;
  for(const entry of catalog.entries||[])for(const[i,lang]of ['ru','kk','en'].entries()){
   const clip=entry.files?.[lang];if(clip)this.clips.set(lang+'|'+voiceTextKey(entry.text[i]),{...clip,id:entry.id,lang,role:entry.role});
  }
 }
 get enabled(){return this.app.state.settings.narration!==false&&this.app.state.settings.voice>0;}
 lookup(text,lang=this.app.lang){return this.clips.get(lang+'|'+voiceTextKey(Array.isArray(text)?this.app.l(text):text));}
 duration(text){return this.enabled?(this.lookup(text)?.duration||0):0;}
 get remaining(){const c=this.current;if(!c)return 0;const seek=c.sound.seek(c.playId);return Math.max(0,c.clip.duration-(typeof seek==='number'?seek:0));}
 allowed(context){return this.app.mode===context&&!globalThis.document?.hidden;}
 speak(text,{context=this.app.mode,onStart=null,onEnd=null}={}){
  this.stop();this.last={text,context,onStart,onEnd};
  const clip=this.lookup(text);if(!clip||!this.enabled||!this.allowed(context))return false;
  const ticket=this.ticket,url=globalThis.LITTLE_WORLD_VOICES?.[clip.file]||'./voice/'+clip.file;
  let sound=this.cache.get(url);
  if(!sound){
   sound=new this.Howl({src:[url],format:['mp3'],volume:this.app.state.settings.voice,preload:true,html5:false});
   this.cache.set(url,sound);
  }else{this.cache.delete(url);this.cache.set(url,sound);}
  this.current={sound,clip,ticket,playId:null,context,paused:false};
  const c=this.current;
  const finish=()=>{if(ticket!==this.ticket||this.current!==c)return;this.current=null;this.duck(false);this.refreshButtons();onEnd?.();};
  const play=()=>{
   if(ticket!==this.ticket||this.current!==c||c.paused||!this.enabled||!this.allowed(context))return;
   sound.volume(this.app.state.settings.voice);c.playId=sound.play();
   sound.once('play',()=>{if(ticket!==this.ticket||this.current!==c)return;this.duck(true);this.refreshButtons();onStart?.(clip);},c.playId);
   sound.once('end',finish,c.playId);
   sound.once('playerror',()=>{if(ticket!==this.ticket)return;sound.once('unlock',()=>{if(ticket===this.ticket&&this.allowed(context))this.replay();});finish();},c.playId);
  };
  sound.once('loaderror',finish);
  if(sound.state()==='loaded')play();else{sound.once('load',play);if(sound.state()==='unloaded')sound.load();}
  this.trimCache(sound);this.refreshButtons();return true;
 }
 trimCache(keep){
  while(this.cache.size>6){const [key,sound]=this.cache.entries().next().value;if(sound===keep)break;sound.unload();this.cache.delete(key);}
 }
 duck(active){this.app.audio.speech?.(active);}
 stop(){
  this.ticket++;const c=this.current;this.current=null;if(c)c.sound.stop(c.playId??undefined);this.duck(false);this.refreshButtons();
 }
 pause(){const c=this.current;if(c&&!c.paused){if(c.playId!=null)c.sound.pause(c.playId);c.paused=true;this.duck(false);this.refreshButtons();}}
 resume(){
  const c=this.current;if(!c||!c.paused||!this.enabled||!this.allowed(c.context))return;
  if(c.playId==null){this.replay();return;}
  c.sound.play(c.playId);c.paused=false;this.duck(true);this.refreshButtons();
 }
 replay(){if(!this.last)return false;return this.speak(this.last.text,this.last);}
 toggle(){
  this.app.state.settings.narration=!this.app.state.settings.narration;
  if(!this.enabled)this.stop();else if(this.last&&this.allowed(this.last.context))this.replay();
  this.refreshButtons();this.app.save(false);
 }
 applySettings(){
  if(!this.enabled)this.stop();else this.current?.sound.volume(this.app.state.settings.voice);
  this.refreshButtons();
 }
 refreshButtons(){
  if(!globalThis.document)return;
  for(const e of document.querySelectorAll('[data-voice-toggle]')){e.setAttribute('aria-pressed',String(this.app.state.settings.narration!==false));e.classList.toggle('voice-off',!this.enabled);}
  for(const e of document.querySelectorAll('[data-voice-replay]')){e.hidden=!this.last||!this.lookup(this.last.text);e.disabled=!this.enabled||!this.last;e.classList.toggle('voice-speaking',!!this.current&&!this.current.paused);}
 }
 destroy(){this.stop();for(const sound of this.cache.values())sound.unload();this.cache.clear();}
}
