import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync,existsSync,readdirSync} from 'node:fs';
const read=p=>JSON.parse(readFileSync(new URL(p,import.meta.url),'utf8'));
test('every scripted story line has a packaged ElevenLabs recording in each language',()=>{
 const script=read('../voice-source/script.json'),catalog=read('../public/voice/index.json'),alignment=read('../voice-source/alignment.json');
 const quality=read('../voice-source/quality.json');assert.equal(quality.decoded_files,script.entries.length*script.languages.length);assert.equal(quality.silent_files,0);assert.equal(quality.clipped_files,0);
 assert.equal(catalog.provider,'ElevenLabs');assert.equal(catalog.entries.length,script.entries.length);assert.deepEqual(alignment.rejected,[]);assert.deepEqual(alignment.missing_packs,[]);
 const ids=new Set(),files=new Set();
 for(const entry of script.entries){
  const recorded=catalog.entries.find(e=>e.id===entry.id);assert(recorded,entry.id);assert(!ids.has(entry.id));ids.add(entry.id);assert.deepEqual(recorded.text,entry.text);
  for(const lang of script.languages){
   const clip=recorded.files[lang];assert(clip,lang+'/'+entry.id);assert(clip.duration>.2);assert.match(clip.file,new RegExp('^'+lang+'/[a-zA-Z0-9-]+\\.mp3$'));assert(!files.has(clip.file));files.add(clip.file);const p=new URL('../public/voice/'+clip.file,import.meta.url);assert(existsSync(p));assert(readFileSync(p).length>1000);
  }
 }
 for(const lang of script.languages){assert.equal(catalog.coverage[lang],script.entries.length);assert.equal(readdirSync(new URL('../public/voice/'+lang,import.meta.url)).filter(n=>n.endsWith('.mp3')).length,script.entries.length);}
 const production=readFileSync(new URL('../voice-source/production.json',import.meta.url),'utf8');assert(!/oobCode|X-Goog-Signature|api_key/i.test(production));
});
