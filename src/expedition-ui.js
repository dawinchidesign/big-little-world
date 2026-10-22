import {EXPEDITIONS,HORIZON_UI,NEW_CREATURES,has,objective} from './expedition-data.js';
import {BIOMES,T} from './content.js';
const esc=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
export function expeditionCards(app,compact=false){
 return `<div class="exp-heading"><span>${esc(app.l(HORIZON_UI.title))}</span><small>${EXPEDITIONS.filter(s=>has(app.state.horizon.sites[s.id],'complete')).length} / 4</small></div><div class="exp-cards ${compact?'compact':''}">${EXPEDITIONS.map((spec,i)=>{
  const s=app.state.horizon.sites[spec.id],done=has(s,'complete'),img=globalThis.LITTLE_WORLD_ASSETS?.['horizon-floor'+i+'.png']||'./assets/horizon-floor'+i+'.png';
  return `<article class="exp-card ${done?'restored':''}"><img src="${img}" alt="${esc(app.l(spec.title))}" loading="lazy"><div class="exp-card-body"><span class="exp-number">${done?'✓':spec.number} · ${esc(app.l(BIOMES[spec.biome].name))}</span><h3>${esc(app.l(spec.title))}</h3><p>${esc(app.l(spec.sub))}</p><div class="exp-stats"><span>${spec.goal.filter(f=>has(s,f)).length}/${spec.goal.length} ${esc(app.l(T('задач','міндет','tasks')))}</span><span>${s.secrets.length}/2 ${esc(app.l(T('тайников','құпия','secrets')))}</span></div><div class="exp-progress"><i style="width:${spec.goal.filter(f=>has(s,f)).length/spec.goal.length*100}%"></i></div>${compact?`<button data-exp-locate="${spec.id}">${esc(app.l(T('Показать вход','Кіреберісті көрсету','Locate entrance')))} ↗</button>`:`<p class="exp-objective">${esc(app.l(objective(spec,s)))}</p><details><summary>${esc(app.l(T('Полевые подсказки','Далалық кеңестер','Field hints')))}</summary><p>${esc(app.l(spec.intro))}</p></details>${s.secrets.map(n=>`<blockquote>${esc(app.l(spec.facts[n]))}</blockquote>`).join('')}`}</div></article>`;
 }).join('')}</div>`;
}
export function expeditionJournal(app){
 const seen=[...new Set(Object.values(app.state.horizon.sites).flatMap(s=>s.seen))];
 return `<p class="note">${esc(app.l(HORIZON_UI.subtitle))} ${esc(app.l(HORIZON_UI.route))}</p>${expeditionCards(app)}<h3>${esc(app.l(T('Полевые наблюдения','Далалық бақылаулар','Field observations')))} · ${seen.length}/4</h3><div class="exp-fieldguide">${Object.entries(NEW_CREATURES).map(([id,data])=>`<article class="record"><strong>${seen.includes(id)?esc(app.l(data.name)):'?'}</strong><p>${seen.includes(id)?esc(app.l(data.fact)):esc(app.l(T('Встаньте рядом с обитателем и спокойно наблюдайте: Q, 2 секунды.','Тұрғынның жанында тұрып, тыныш бақылаңыз: Q, 2 секунд.','Stand close and quietly observe: Q for 2 seconds.')))}</p></article>`).join('')}</div>${app.state.horizon.finished?`<div class="fact">${esc(app.l(HORIZON_UI.finale))}</div>`:''}`;
}
export function expeditionResources(app){
 if(!app.scene.isExpedition)return '';
 const s=app.scene.state;
 const parts=[['water',T('Роса','Шық','Dew')],['bark',T('Кора','Қабық','Bark')],['pollen',T('Пыльца','Тозаң','Pollen')]].filter(([k])=>s[k]>0).map(([k,label])=>`<span>${esc(app.l(label))} <b>${s[k]}</b></span>`);
 if(s.carried)parts.push(`<span>${esc(app.l(T('Кладка в руках','Жұмыртқалар қолда','Carrying eggs')))}</span>`);
 parts.push(`<span>${esc(app.l(T('Тайники','Құпиялар','Secrets')))} <b>${s.secrets.length}/2</b></span>`);
 return `<div class="exp-resources">${parts.join('')}</div>`;
}
