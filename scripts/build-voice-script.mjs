import {readFileSync,writeFileSync,mkdirSync} from 'node:fs';
import {CINEMATICS} from '../src/cinematics.js';
import {QUESTS,SECRETS} from '../src/quests.js';
import {CHAMBERS,COLONY_UI} from '../src/colony-data.js';
import {CROSS_UI} from '../src/crossing-data.js';
import {EXPEDITIONS,NEW_CREATURES,HORIZON_UI} from '../src/expedition-data.js';
import {VIEWS} from '../src/perspectives.js';
import {TRAILS} from '../src/traversal.js';
import {T} from '../src/content.js';
const entries=[],known=new Map();
function add(id,text,role='narrator',tag='warmly'){
 if(!Array.isArray(text)||text.length!==3)return;
 const signature=JSON.stringify(text);
 if(known.has(signature)){known.get(signature).aliases.push(id);return;}
 const entry={id,aliases:[],role,tag,text};entries.push(entry);known.set(signature,entry);
}
function speakerRole(name){return name.includes('Школьник')?'hero':name.includes('Лада')||name.includes('бабочка')||name==='Стрекоза'?'lada':'narrator';}
for(const [id,c]of Object.entries(CINEMATICS))for(const[i,s]of c.shots.entries())add('cine-'+id+'-'+i,s.text,speakerRole(s.speaker[0]),s.speaker[0].includes('Школьник')?'curious':id==='catastrophe'?'seriously':'warmly');
for(const q of QUESTS){
 add('quest-'+q.id+'-opening',q.opening,speakerRole(q.intro[0]));add('quest-'+q.id+'-conclusion',q.conclusion);
 for(const[i,s]of q.stages.entries())if(s.text)add('quest-'+q.id+'-stage-'+i,s.text,q.id==='night'?'lada':'narrator');
}
for(const s of SECRETS)add('secret-'+s.id,s.text);
for(const s of CHAMBERS)add('colony-'+s.id,s.note);
add('colony-intro',COLONY_UI.fiction);
for(const k of ['intro','leafHelp','rootsHelp','bridgeHelp','leafEnd','rootsEnd','bridgeEnd'])add('crossing-'+k,CROSS_UI[k]);
for(const s of EXPEDITIONS){add('expedition-'+s.id+'-intro',s.intro);for(const[i,f]of s.facts.entries())add('expedition-'+s.id+'-secret-'+i,f);}
for(const[id,s]of Object.entries(NEW_CREATURES))add('creature-'+id,s.fact);
add('expedition-finale',HORIZON_UI.finale);
for(const v of VIEWS)add('perspective-'+v.id,v.text);
const uw=readFileSync('src/underwater.js','utf8').split('export const UW = ')[1].split('\nconst POINTS')[0].replace(/;\s*$/,'');
const UW=Function('T','return ('+uw+');')(T);add('underwater-intro',UW.intro);add('underwater-conclusion',UW.conclusion);
const languageNames=['ru','kk','en'];
const clean=(text,lang)=>{
 const sequence={ru:'два, затем один, затем три',kk:'екі, одан кейін бір, одан кейін үш',en:'two, then one, then three'};
 const arrows={ru:{'→':'на восток','↓':'на юг'},kk:{'→':'шығысқа','↓':'оңтүстікке'},en:{'→':'east','↓':'south'}};
 return text.replace(/2\s*→\s*1\s*→\s*3/g,sequence[lang]).replace(/([→↓])/g,(_,s)=>arrows[lang][s]).replace(/\s+/g,' ').trim();
};
const packs=[];
for(let li=0;li<3;li++)for(const role of ['narrator','lada','hero']){
 const list=entries.filter(e=>e.role===role);let batch=[];let chars=0,part=0;
 const flush=()=>{if(!batch.length)return;const id=languageNames[li]+'-'+role+'-'+part++;packs.push({id,lang:languageNames[li],role,entries:batch,prompt:batch.map(e=>'['+e.tag+'] '+e.spoken).join('\n\n[long pause]\n\n')});batch=[];chars=0;};
 for(const e of list){const spoken=clean(e.text[li],languageNames[li]);if(chars+spoken.length>3500)flush();batch.push({id:e.id,spoken,tag:e.tag});chars+=spoken.length+40;}flush();
}
// Keep the original production packs stable when adding the three optional
// canopy discoveries: their recordings are a separate small supplement.
const primaryCount=entries.length;
for(const route of TRAILS)add('trail-'+route.id,route.fact);
for(let li=0;li<3;li++){
 const lang=languageNames[li],batch=entries.slice(primaryCount).map(e=>({id:e.id,spoken:clean(e.text[li],lang),tag:e.tag}));
 packs.push({id:lang+'-narrator-trails',lang,role:'narrator',entries:batch,prompt:batch.map(e=>'['+e.tag+'] '+e.spoken).join('\n\n[long pause]\n\n')});
}
mkdirSync('voice-source',{recursive:true});
writeFileSync('voice-source/script.json',JSON.stringify({languages:languageNames,entries,packs},null,2));
console.log(JSON.stringify({entries:entries.length,packs:packs.length,characters:packs.reduce((n,p)=>n+p.prompt.length,0),perLanguage:languageNames.map(lang=>({lang,characters:packs.filter(p=>p.lang===lang).reduce((n,p)=>n+p.prompt.length,0)}))}));
