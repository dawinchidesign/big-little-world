import test from 'node:test';
import assert from 'node:assert/strict';
import {SpeechPlayer,voiceTextKey} from '../src/speech-player.js';
import {initialState,migrateSave} from '../src/model.js';
class AudioDouble{
 static instances=[];
 constructor(opts){this.opts=opts;this.events=[];this.loaded=false;this.plays=0;this.stops=0;this.pauses=0;this.position=0;AudioDouble.instances.push(this);}
 once(event,fn,id){this.events.push({event,fn,id});return this;}
 emit(event,id){const handlers=this.events.filter(e=>e.event===event&&(e.id==null||e.id===id));this.events=this.events.filter(e=>!handlers.includes(e));for(const e of handlers)e.fn();}
 state(){return this.failed?'unloaded':this.loaded?'loaded':'loading';}
 load(){this.failed=false;this.loaded=true;this.emit('load');}
 play(id){this.plays++;this.id=id??this.plays;return this.id;}
 stop(){this.stops++;}
 pause(){this.pauses++;}
 seek(){return this.position;}
 volume(value){this.level=value;}
 unload(){this.unloaded=true;}
}
const text=['Привет, мир.','Сәлем, әлем.','Hello, world.'];
const catalog={entries:[{id:'intro',role:'hero',text,files:{ru:{file:'ru/intro.mp3',duration:4},kk:{file:'kk/intro.mp3',duration:5},en:{file:'en/intro.mp3',duration:3}}}]};
function setup(){AudioDouble.instances=[];const duck=[];const app={state:initialState(),lang:'ru',mode:'dialog',audio:{speech:active=>duck.push(active)},l:t=>t[['ru','kk','en'].indexOf(app.lang)],save(){}};return{app,duck,player:new SpeechPlayer(app,catalog,AudioDouble)};}
test('skipped speech and stale loads never play after another dialogue or language takes ownership',()=>{
 const {app,player}=setup();assert(player.speak(text));const russian=AudioDouble.instances[0];app.lang='kk';player.speak(text);const kazakh=AudioDouble.instances[1];russian.load();assert.equal(russian.plays,0);kazakh.load();assert.equal(kazakh.plays,1);assert.equal(player.current.clip.lang,'kk');
 player.stop();kazakh.emit('play',1);assert.equal(player.current,null);assert.equal(kazakh.stops,1);
});
test('speech pauses while hidden by a panel, resumes from its position, and restores music at end',()=>{
 const {app,duck,player}=setup();player.speak(text);const sound=AudioDouble.instances[0];sound.load();sound.emit('play',1);assert.equal(duck.at(-1),true);sound.position=1.2;assert(Math.abs(player.remaining-2.8)<.001);
 player.pause();app.mode='settings';assert.equal(sound.pauses,1);player.resume();assert.equal(sound.plays,1);app.mode='dialog';player.resume();assert.equal(sound.plays,2);assert.equal(duck.at(-1),true);sound.emit('end',1);assert.equal(duck.at(-1),false);assert.equal(player.current,null);
});
test('pausing a loading clip waits for the owner screen; replay uses the cached recording',()=>{
 const {player}=setup();player.speak(text);const sound=AudioDouble.instances[0];player.pause();sound.load();assert.equal(sound.plays,0);player.resume();assert.equal(sound.plays,1);player.replay();assert.equal(AudioDouble.instances.length,1);assert.equal(sound.plays,2);
});
test('speech preferences migrate from older saves and muting immediately cancels an active line',()=>{
 const old=initialState();delete old.settings.voice;delete old.settings.narration;const s=migrateSave(old);assert.equal(s.settings.voice,.88);assert.equal(s.settings.narration,true);
 const {app,duck,player}=setup();player.speak(text);AudioDouble.instances[0].load();app.state.settings.voice=0;player.applySettings();assert.equal(player.current,null);assert.equal(duck.at(-1),false);assert.equal(player.duration(text),0);assert(!player.speak(text));
 app.state.settings.voice=.5;app.state.settings.narration=false;assert(!player.speak(text));assert.equal(voiceTextKey('  Hello,\nworld. '),'Hello, world.');
});
test('a failed recording leaves the dialogue usable and replay reloads it without stale playback',()=>{
 const {player,duck}=setup();player.speak(text);const sound=AudioDouble.instances[0];sound.failed=true;sound.emit('loaderror');assert.equal(player.current,null);assert.equal(duck.at(-1),false);
 player.replay();assert.equal(AudioDouble.instances.length,1);assert.equal(sound.plays,1);assert(player.current);sound.emit('play',1);assert.equal(duck.at(-1),true);
});
