import {BIOMES,T} from './content.js';
const smooth=t=>{t=Math.max(0,Math.min(1,t));return t*t*(3-2*t);};
// Samples on both sides of an edge use the same world coordinates and weights.
// Four habitats can contribute around a corner; no rectangular colour seam.
export function habitatWeights(x,y){
 const axis=(p,size)=>{
  const cell=Math.max(0,Math.min(2,Math.floor(p/size)));
  for(let edge=1;edge<3;edge++)if(Math.abs(p-edge*size)<220){const t=smooth((p-edge*size+220)/440);return[[edge-1,1-t],[edge,t]];}
  return[[cell,1]];
 };
 const out=[];for(const [cx,wx]of axis(x,1600))for(const [cy,wy]of axis(y,1100)){
  const b=BIOMES.find(b=>b.cell[0]===cx&&b.cell[1]===cy);out.push({biome:b,weight:wx*wy});
 }return out;
}
export const PHYSICAL_UI={
 leaf:T('Поднять опавший лист','Түскен жапырақты көтеру','Lift the fallen leaf'),
 twig:T('Поднять сухую веточку','Құрғақ бұтақты көтеру','Lift the dry twig'),
 drop:T('Положить перед собой','Алдыңа қою','Place it in front of you'),
 blocked:T('Здесь нет места. Отойди от воды или прохода.','Мұнда орын жоқ. Судан не өткелден шегін.','No room here. Step away from the water or passage.'),
 cap:T('Перевернуть крышку','Қақпақты аудару','Turn the cap over'),
 pebble:T('Упереться и толкнуть камешек','Тасқа тіреліп итеру','Brace and push the pebble'),
 dew:T('Коснуться капли','Тамшыға тию','Touch the dewdrop'),
 flower:T('Осторожно склонить цветок','Гүлді абайлап ию','Gently bend the flower'),
 log:T('Укрыться и наблюдать','Паналанып бақылау','Take shelter and observe'),
 lifted:T('Неси лист к влажному месту. E — положить; Q рядом — наблюдать под укрытием.','Жапырақты ылғалды жерге апар. E — қою; жанында Q — панада бақылау.','Carry the leaf to a damp spot. E places it; Q nearby observes beneath the shelter.'),
 twigHeld:T('Веточка в руках. E — положить.','Бұтақ қолыңда. E — қою.','You are carrying a twig. E places it.'),
 shelter:T('Влажное укрытие · тихое наблюдение','Ылғалды пана · тыныш бақылау','Damp shelter · quiet observation'),
 nectar:T('Цветок покачивается. Останься рядом и тихо понаблюдай за опылителями.','Гүл тербеледі. Жанында қалып, тозаңдандырушыларды тыныш бақыла.','The flower sways. Stay nearby and quietly watch the pollinators.'),
 heavy:T('Тяжёлый предмет: прижмись и продолжай идти, чтобы сдвинуть его.','Ауыр зат: жылжыту үшін тіреліп жүре бер.','A heavy object: lean against it and keep walking to shift it.'),
};
const positions=[[[900,690,'leaf'],[1020,740,'dew'],[1100,690,'pebble']],[[2350,500,'twig'],[2490,530,'cap'],[2560,500,'dew']],[[4240,830,'leaf'],[4140,830,'cap'],[4400,810,'dew']],[[3500,1290,'leaf'],[3430,1300,'pebble'],[3520,1210,'dew']],[[2320,1650,'leaf'],[2450,1640,'twig'],[2560,1650,'pebble']],[[650,1500,'cap'],[720,1430,'twig'],[800,1480,'leaf']],[[620,2700,'cap'],[720,2700,'pebble'],[800,2680,'twig']],[[2300,2760,'leaf'],[2400,2780,'dew'],[2490,2760,'pebble']],[[4200,2850,'leaf'],[4340,2850,'twig'],[4420,2840,'dew']]];
export const FIELD_PROPS=positions.flatMap((ps,biome)=>ps.map(([x,y,kind],i)=>({id:`field-${biome}-${i}`,x,y,kind,biome})));
export const MATERIALS={leaf:{mass:.4,stiffness:38,damping:8},twig:{mass:1,stiffness:65,damping:10},cap:{mass:3,stiffness:110,damping:12},pebble:{mass:6,stiffness:180,damping:18},dew:{mass:.7,stiffness:46,damping:6}};
export const emptyObjects=()=>({held:null,records:{}});
export function validateObjects(raw){
 if(raw===undefined)return emptyObjects();
 if(!raw||typeof raw!=='object'||Array.isArray(raw)||!raw.records||typeof raw.records!=='object'||Array.isArray(raw.records)||Object.keys(raw.records).length>FIELD_PROPS.length)throw Error('Invalid physical objects');
 const records={};
 for(const [id,r]of Object.entries(raw.records)){
  if(!FIELD_PROPS.some(p=>p.id===id)||!r||![r.x,r.y].every(Number.isFinite)||r.x<24||r.x>4776||r.y<24||r.y>3276||typeof r.turned!=='boolean')throw Error('Invalid object position');
  records[id]={x:r.x,y:r.y,turned:r.turned};
 }
 if(raw.held!==null&&(!FIELD_PROPS.some(p=>p.id===raw.held&&['leaf','twig'].includes(p.kind))||!records[raw.held]))throw Error('Invalid carried object');
 return{held:raw.held,records};
}
export function springStep(s,dt,force=0,stiffness=50,damping=9){
 for(let left=Math.min(.08,dt);left>0;){const h=Math.min(1/120,left);s.v+=(force-stiffness*s.x-damping*s.v)*h;s.x+=s.v*h;left-=h;}
 s.x=Math.max(-22,Math.min(22,s.x));return s;
}
export function canPlace(x,y,water,markers=[]){
 if(x<40||y<40||x>4760||y>3260)return false;
 if(x>3240&&x<3570&&y>1660&&y<1930)return false;
 if(water&&((x-water.x)/water.rx)**2+((y-water.y)/water.ry)**2<1.1)return false;
 return !markers.some(m=>Math.hypot(m.x-x,m.y-y)<64);
}
export const PASSAGES=BIOMES.flatMap(a=>BIOMES.filter(b=>b.id>a.id&&Math.abs(a.cell[0]-b.cell[0])+Math.abs(a.cell[1]-b.cell[1])===1).map(b=>({id:`${a.id}-${b.id}`,a:a.id,b:b.id,vertical:a.cell[0]!==b.cell[0],x:(a.cell[0]+b.cell[0]+1)*800,y:(a.cell[1]+b.cell[1]+1)*550})));
