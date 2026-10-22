import { T } from './content.js';

export const EXP_W = 2400, EXP_H = 1600;
export const HORIZON_UI = {
 title:T('Тропы за горизонтом','Көкжиектен асқан соқпақтар','Trails beyond the horizon'),
 subtitle:T('Четыре места. Одна живая экосистема.','Төрт мекен. Бір тірі экожүйе.','Four places. One living ecosystem.'),
 enter:T('Исследовать новое место','Жаңа мекенді зерттеу','Explore this place'),
 exit:T('Вернуться в большой мир','Үлкен әлемге оралу','Return to the great world'),
 board:T('Прочитать полевой дневник','Далалық күнделікті оқу','Read the field notebook'),
 reset:T('Вернуть тяжёлые предметы на место','Ауыр заттарды орнына қайтару','Reset the heavy objects'),
 notes:T('Экспедиции','Экспедициялар','Expeditions'),
 completed:T('Место восстановлено · можно продолжить исследование','Мекен қалпына келді · зерттеуді жалғастыруға болады','Habitat restored · keep exploring'),
 observed:T('Новый обитатель записан в полевой дневник','Жаңа тұрғын далалық күнделікке жазылды','New neighbour added to the field notebook'),
 secret:T('Тайник найден','Құпия табылды','Secret found'),
 route:T('Идите к входу на карте; маршрут доступен с начала игры.','Картадағы кіреберіске барыңыз; бағыт ойын басынан ашық.','Walk to the entrance on the map; the trail is open from the start.'),
 jump:T('Пролёт над ручьём слишком широк. Восстановите мост.','Жылға тым кең. Көпірді қалпына келтіріңіз.','The creek is too wide. Restore the bridge.'),
 wait:T('Спутник ждёт. Вернитесь ближе и проведите его по мосту.','Серігіңіз күтіп тұр. Жақындап, көпірден өткізіңіз.','Your companion is waiting. Come closer and guide it across the bridge.'),
 finale:T('Обсерватория снова видит звёзды. Вода, почва, укрытия и опылители связаны одной сетью жизни. Все четыре маршрута восстановлены!','Обсерватория жұлдыздарды қайта көреді. Су, топырақ, пана мен тозаңдандырушылар бір тіршілік желісімен байланысқан. Төрт бағыт та қалпына келді!','The observatory can see the stars again. Water, soil, shelter and pollinators form one web of life. All four trails are restored!'),
};

const entity=(id,x,y,art,kind,label,extra={})=>({id,x,y,art,kind,label,...extra});
export const EXPEDITIONS = [
 {
  id:'glass',number:'01',biome:0,portal:[1260,620],portalArt:'greenhouse',
  title:T('Забытая оранжерея','Ұмыт қалған жылыжай','The forgotten glasshouse'),
  sub:T('Верните воду к корням','Тамырға су жеткізіңіз','Bring water back to the roots'),
  intro:T('За стеклом пахнет сухой землёй. Черепок перекрыл исток, а два вентиля направляют воду не туда. Сдвиньте черепок, поверните верхний вентиль на восток (→), нижний — на юг (↓). Наполните цистерну и полейте три ростка. Здесь можно исследовать уголки в любом порядке.','Әйнек артында құрғақ топырақ иісі бар. Сынық су көзін жапқан, екі шүмек суды басқа жаққа бұрған. Сынықты жылжытып, жоғарғы шүмекті шығысқа (→), төменгісін оңтүстікке (↓) бұрыңыз. Ыдыстан су алып, үш өскінді суарыңыз. Бұрыштарды кез келген ретпен зерттеңіз.','Dry earth lies beneath the glass. A shard blocks the spring and two valves point the wrong way. Push the shard aside, turn the upper valve east (→) and the lower one south (↓). Fill up at the cistern and water three sprouts. Explore the corners in any order.'),
  color:'#3c6250',accent:'#a3dfb4',ground:0,night:false,
  reward:T('Роса жизни','Тіршілік шығы','Living dew'),
  stages:[T('Сдвиньте черепок у истока и направьте вентили: → и ↓','Бастаудағы сынықты жылжытыңыз, шүмектер: → және ↓','Move the shard at the spring; align valves: → and ↓'),T('Наберите воду в цистерне; полейте три ростка','Ыдыстан су алып, үш өскінді суарыңыз','Collect water at the cistern; water three sprouts')],
  goal:['plant-a','plant-b','plant-c'],flags:['spring','plant-a','plant-b','plant-c','complete'],
  props:[
   entity('valve-a',1040,450,'valve','valve',T('Повернуть верхний вентиль · цель →','Жоғарғы шүмекті бұру · мақсат →','Turn upper valve · target →'),{target:1}),
   entity('valve-b',1420,930,'valve','valve',T('Повернуть нижний вентиль · цель ↓','Төменгі шүмекті бұру · мақсат ↓','Turn lower valve · target ↓'),{target:2}),
   entity('cistern',660,970,'cistern','water',T('Набрать росу · до трёх порций','Шық жинау · үш үлеске дейін','Collect dew · up to three portions')),
   ...[[1560,440],[1780,730],[1950,1050]].map(([x,y],i)=>entity('plant-'+['a','b','c'][i],x,y,'sprout','plant',T('Полить росток','Өскінді суару','Water the sprout'))),
  ],
  bodies:[{id:'shard',x:680,y:610,art:'shard',radius:43,mass:4}],
  walls:[{x:1170,y:1110,w:110,h:450},{x:420,y:360,w:350,h:70},{x:1800,y:1320,w:510,h:80}],
  creatures:[['lacewing',1700,600],['snail',480,1120],['beetle',2050,1180]],
  secrets:[[320,1280],[2080,340]],
  facts:[T('Златоглазки помогают растениям: личинки многих видов питаются тлями. Взрослые особи могут питаться нектаром и пыльцой.','Алтынкөздер өсімдіктерге көмектеседі: көптеген түрлерінің дернәсілі бітемен қоректенеді. Ересектері шірне мен тозаң жеуі мүмкін.','Many lacewing larvae eat aphids. Adults of some species feed on nectar and pollen.'),T('Под горшком сохранилась влажная земля. Укрытия удерживают влагу и помогают мелким беспозвоночным пережить жару.','Құмыра астында ылғалды топырақ сақталған. Пана ылғалды ұстап, ұсақ омыртқасыздарға ыстықтан қорғануға көмектеседі.','Damp soil survives beneath the pot. Shelter retains moisture and helps small invertebrates withstand the heat.')],
 },
 {
  id:'hollow',number:'02',biome:4,portal:[2740,1920],portalArt:'hollow',
  title:T('Сердце старого дерева','Кәрі ағаштың жүрегі','Heart of the old tree'),
  sub:T('У каждого укрытия есть хранитель','Әр пананың өз қамқоршысы бар','Every shelter has a keeper'),
  intro:T('Жук потерял три кладки в лабиринте корней. Прикатите жёлудь на круглый камень: его вес отодвинет кору. Переносите по одной кладке в безопасное гнездо. За дверью ждёт янтарная линза для обсерватории. E у таблички возвращает жёлудь, если он укатился.','Қоңыз тамырлар арасында үш жұмыртқа тобын жоғалтып алды. Емен жаңғағын дөңгелек тасқа домалатыңыз: салмағы қабықты ашады. Жұмыртқаларды бір-бірден қауіпсіз ұяға жеткізіңіз. Есіктің ар жағында обсерваторияға арналған кәріптас линза бар. Жаңғақ алыс кетсе, тақтайша жанында E басыңыз.','A beetle has lost three egg clusters among the roots. Roll the acorn onto the round stone: its weight slides the bark aside. Carry one cluster at a time to the safe nest. Beyond the gate is an amber lens for the observatory. Use E at the sign to reset a runaway acorn.'),
  color:'#4f3c36',accent:'#e8be74',ground:4,night:true,
  reward:T('Янтарная линза','Кәріптас линза','Amber lens'),
  stages:[T('Прикатите жёлудь на нажимной камень','Жаңғақты басқыш тасқа домалатыңыз','Roll the acorn onto the pressure stone'),T('Верните три кладки в гнездо; найдите янтарную линзу','Үш жұмыртқа тобын ұяға жеткізіп, кәріптас линзаны табыңыз','Return three egg clusters to the nest; find the amber lens')],
  goal:['egg-a','egg-b','egg-c','lens'],flags:['gate','egg-a','egg-b','egg-c','lens','complete'],
  props:[
   entity('plate',1020,740,'plate','plate',T('Камень реагирует на вес жёлудя','Тас жаңғақтың салмағына жауап береді','The stone responds to the acorn’s weight')),
   entity('nest',620,1100,'hollow','nest',T('Положить кладку в гнездо','Жұмыртқаларды ұяға салу','Place egg cluster in the nest')),
   ...[[1630,420],[1870,1120],[2070,700]].map(([x,y],i)=>entity('egg-'+['a','b','c'][i],x,y,'colony-eggs','egg',T('Осторожно поднять кладку','Жұмыртқаларды абайлап көтеру','Gently pick up the egg cluster'))),
   entity('lens',2130,1260,'amber','lens',T('Забрать янтарную линзу','Кәріптас линзаны алу','Collect the amber lens')),
  ],
  bodies:[{id:'acorn',y:740,x:720,art:'acorn',radius:38,mass:3}],
  walls:[{x:1250,y:340,w:115,h:680},{x:1250,y:1230,w:115,h:670}],
  gate:{x:1250,y:770,w:115,h:180},
  creatures:[['beetle',1740,760],['snail',550,410],['springtail',1910,1300]],
  secrets:[[390,350],[2180,360]],
  facts:[T('Мёртвая древесина — живой дом. Грибы, мокрицы и другие обитатели участвуют в разложении органики.','Өлі сүрек — тіршілік мекені. Саңырауқұлақтар, есекқұрттар және басқа ағзалар органикалық заттардың ыдырауына қатысады.','Dead wood is a living habitat. Fungi, woodlice and other organisms help decompose organic matter.'),T('Жужелицы — разнообразная группа жуков. Многие виды охотятся на других беспозвоночных и прячутся под корой и камнями.','Барылдауық қоңыздар алуан түрлі. Көп түрі басқа омыртқасыздарды аулап, қабық пен тас астында тығылады.','Ground beetles are diverse. Many hunt other invertebrates and shelter beneath bark and stones.')],
 },
 {
  id:'creek',number:'03',biome:3,portal:[4420,1510],portalArt:'arch',
  title:T('Ручей тысячи отражений','Мың шағылысты жылға','Creek of a thousand reflections'),
  sub:T('Дорога домой проходит над водой','Үйге жол су үстімен өтеді','The way home crosses the water'),
  intro:T('Весенний поток унёс мост. Соберите три куска коры на западном берегу и уложите их у трёх опор. Затем почините водяное колесо, освободив его от веточки. Позовите ногохвостку на восточном берегу и проводите к влажному мху. Она ищет дорогу сама, но ждёт, если вы ушли далеко.','Көктемгі ағыс көпірді алып кетті. Батыс жағадан үш қабықты жинап, үш тірекке төсеңіз. Су дөңгелегін бұтақтан босатыңыз. Шығыс жағадан құйрықаяқты шақырып, ылғалды мүкке жеткізіңіз. Ол жолды өзі табады, бірақ алыстасаңыз күтеді.','The spring flood carried off the bridge. Collect three pieces of bark on the western bank and lay them at the three supports. Free the water wheel from a twig. Call the springtail on the eastern bank and guide it to the damp moss. It finds its own way but waits if you go too far.'),
  color:'#375e61',accent:'#9bdedc',ground:3,night:false,
  reward:T('Песнь ручья','Жылғаның әні','Song of the creek'),
  stages:[T('Соберите кору и восстановите три секции моста','Қабық жинап, көпірдің үш бөлігін жөндеңіз','Collect bark and restore three bridge sections'),T('Освободите колесо и проводите ногохвостку к мху на западе','Дөңгелекті босатып, құйрықаяқты батыстағы мүкке жеткізіңіз','Free the wheel and escort the springtail to the western moss')],
  goal:['bridge-a','bridge-b','bridge-c','wheel','home'],flags:['bark-a','bark-b','bark-c','bridge-a','bridge-b','bridge-c','wheel','escort','home','complete'],
  props:[
   ...[[470,380],[710,1130],[910,450]].map(([x,y],i)=>entity('bark-'+['a','b','c'][i],x,y,'bridge','bark',T('Поднять кусок коры','Қабықты алу','Pick up bark'))),
   ...[1110,1230,1350].map((x,i)=>entity('bridge-'+['a','b','c'][i],x,780,'bridge','bridge',T('Уложить кору на опору','Қабықты тірекке төсеу','Lay bark on the support'))),
   entity('wheel',1650,1070,'wheel','wheel',T('Вытащить ветку из колеса','Дөңгелектен бұтақты алу','Free the wheel from the twig')),
   entity('friend',1980,420,'new-springtail0','friend',T('Позвать ногохвостку','Құйрықаяқты шақыру','Call the springtail')),
   entity('home',520,1210,'fern','home',T('Влажный мох · дом ногохвостки','Ылғалды мүк · құйрықаяқтың үйі','Damp moss · the springtail’s home')),
  ],
  bodies:[{id:'pebble-a',x:770,y:720,art:'rock',radius:30,mass:6},{id:'pebble-b',x:1880,y:1120,art:'rock',radius:34,mass:7}],
  walls:[{x:1230,y:340,w:250,h:680},{x:1230,y:1240,w:250,h:720}],
  gate:{x:1230,y:780,w:250,h:200},
  creatures:[['lacewing',1810,1150],['snail',650,460],['beetle',2080,950]],
  secrets:[[380,1380],[2160,1260]],
  facts:[T('Ногохвостки — не насекомые, а отдельная группа шестиногих. Многие виды используют прыгательную вилку, чтобы спасаться от опасности.','Құйрықаяқтар жәндіктер емес, алтыаяқтылардың жеке тобы. Көп түрі қауіптен секіргіш айырдың көмегімен құтылады.','Springtails are hexapods but are not insects. Many use a forked appendage called a furcula to jump away from danger.'),T('У прибрежных растений есть важная роль: их корни удерживают грунт, а тень и опавшие листья создают укрытия.','Жағалық өсімдіктердің тамыры топырақты ұстайды, ал көлеңкесі мен түскен жапырақтары пана жасайды.','Bankside roots hold soil in place. Shade and fallen leaves provide shelter for small animals.')],
 },
 {
  id:'canopy',number:'04',biome:8,portal:[4300,2920],portalArt:'pod',
  title:T('Сад над облаками травы','Шөп бұлттарының үстіндегі бақ','Garden above the grass clouds'),
  sub:T('Соберите свет четырёх троп','Төрт соқпақтың жарығын жинаңыз','Gather the light of four trails'),
  intro:T('В кроне спрятана старая обсерватория. Три фонаря откликнутся только в порядке, записанном на камнях: 2 → 1 → 3. Соберите пыльцу у большого цветка и посетите три закрытых бутона. Когда все четыре места будут восстановлены, установите янтарную линзу в телескоп.','Ағаш басында ескі обсерватория бар. Үш шам тастардағы ретпен ғана жанады: 2 → 1 → 3. Үлкен гүлден тозаң жинап, үш жабық бүршікке жеткізіңіз. Төрт мекен қалпына келгенде кәріптас линзаны телескопқа орнатыңыз.','An old observatory hides in the crown. The lanterns respond in the order written on the stones: 2 → 1 → 3. Collect pollen at the great flower and visit three closed buds. Once all four habitats are restored, fit the amber lens into the telescope.'),
  color:'#465b55',accent:'#f5d68b',ground:8,night:true,
  reward:T('Свет кроны','Ағаш басының нұры','Light of the canopy'),
  stages:[T('Зажгите фонари в порядке 2 → 1 → 3','Шамдарды 2 → 1 → 3 ретімен жағыңыз','Light the lanterns in the order 2 → 1 → 3'),T('Возьмите пыльцу; опылите три бутона','Тозаң алып, үш бүршікті тозаңдандырыңыз','Collect pollen; pollinate three buds')],
  goal:['lanterns','bloom-a','bloom-b','bloom-c'],flags:['lanterns','bloom-a','bloom-b','bloom-c','complete'],
  props:[
   ...[[700,500],[1110,1010],[1510,430]].map(([x,y],i)=>entity('lamp-'+(i+1),x,y,'lantern','lamp',T('Коснуться фонаря '+(i+1),(i+1)+'-шамға тию','Touch lantern '+(i+1)),{number:i+1})),
   entity('pollen',530,1190,'bloom','pollen',T('Взять пыльцу большого цветка','Үлкен гүлден тозаң алу','Collect pollen at the great flower')),
   ...[[1580,760],[1850,1100],[2030,560]].map(([x,y],i)=>entity('bloom-'+['a','b','c'][i],x,y,'sprout','pollinate',T('Передать пыльцу бутону','Бүршікке тозаң жеткізу','Pollinate the bud'))),
   entity('telescope',2090,1350,'telescope','telescope',T('Настроить обсерваторию','Обсерваторияны баптау','Align the observatory')),
  ],
  bodies:[{id:'seed',x:1000,y:730,art:'acorn',radius:36,mass:2}],
  walls:[{x:1140,y:450,w:120,h:330},{x:1390,y:1250,w:370,h:75}],
  creatures:[['lacewing',1820,610],['beetle',850,1200],['snail',1730,1260]],
  secrets:[[360,340],[2180,360]],
  facts:[T('Опыление — перенос пыльцы. Цветки привлекают посетителей цветом, запахом и пищей. Не каждый посетитель одинаково хорошо переносит пыльцу.','Тозаңдану — тозаңның тасымалдануы. Гүлдер түсі, иісі және қорегімен тартады. Әр келуші тозаңды бірдей жақсы тасымалдамайды.','Pollination transfers pollen. Flowers attract visitors with colour, scent and food. Visitors differ in how effectively they transfer pollen.'),T('Свет фонарей здесь — сказочная механика. Настоящие светлячки излучают свет благодаря химической реакции в специальных органах.','Мұндағы шам жарығы — ертегілік ойын механикасы. Нағыз жарқырауық қоңыздар арнайы мүшелеріндегі химиялық реакция арқылы жарық шығарады.','These lanterns are a story mechanic. Real fireflies produce light through a chemical reaction in specialised organs.')],
 },
];
export const siteById = Object.fromEntries(EXPEDITIONS.map(s=>[s.id,s]));
export const NEW_CREATURES = {
 snail:{name:T('Садовая улитка','Бақ ұлуы','Garden snail'),fact:T('Моллюск; ищет влажные укрытия. Двигается с помощью мускулистой ноги.','Ылғалды пана іздейтін ұлу. Бұлшықетті аяқпен қозғалады.','A mollusc that seeks damp shelter and moves on a muscular foot.')},
 beetle:{name:T('Жужелица','Барылдауық қоңыз','Ground beetle'),fact:T('Насекомое с шестью ногами и твёрдыми надкрыльями. Многие виды — хищники.','Алты аяқты, қатты үстіңгі қанатты жәндік. Көп түрі — жыртқыш.','An insect with six legs and hard wing cases. Many species are predators.')},
 lacewing:{name:T('Златоглазка','Алтынкөз','Green lacewing'),fact:T('У взрослой особи прозрачные сетчатые крылья. Личинки многих видов охотятся на тлей.','Ересегінің қанаты мөлдір, торлы. Көп түрінің дернәсілі бітені аулайды.','Adults have transparent, net-veined wings. Many larvae prey on aphids.')},
 springtail:{name:T('Ногохвостка','Құйрықаяқ','Springtail'),fact:T('Маленькое почвенное шестиногое. Многие виды питаются грибами и разлагающимся материалом.','Ұсақ топырақ алтыаяқтысы. Көп түрі саңырауқұлақтармен, шіріген заттармен қоректенеді.','A tiny soil hexapod. Many species eat fungi and decomposing material.')},
};
export const emptySite=()=>({visited:false,x:320,y:790,flags:[],water:0,bark:0,pollen:0,carried:null,rotations:{'valve-a':0,'valve-b':0},sequence:[],seen:[],secrets:[],bodies:{},friend:{x:1980,y:420}});
export const emptyHorizon=()=>({active:null,finished:false,sites:Object.fromEntries(EXPEDITIONS.map(s=>[s.id,emptySite()]))});
export function validateHorizon(raw){
 if(raw===undefined)return emptyHorizon();
 const out=emptyHorizon();
 if(!raw||typeof raw!=='object'||(raw.active!==null&&!siteById[raw.active])||typeof raw.finished!=='boolean'||!raw.sites||typeof raw.sites!=='object')throw Error('Invalid expedition save');
 for(const spec of EXPEDITIONS){
  const s=raw.sites[spec.id];if(!s)continue;
  const bounded=(n,max=EXP_W)=>Number.isFinite(n)&&n>=0&&n<=max;
  if(typeof s.visited!=='boolean'||!bounded(s.x)||!bounded(s.y,EXP_H)||![s.water,s.bark,s.pollen].every(n=>Number.isInteger(n)&&n>=0&&n<=3)||!Array.isArray(s.flags)||new Set(s.flags).size!==s.flags.length||s.flags.some(f=>!spec.flags.includes(f)))throw Error('Invalid expedition progress');
  if(!Array.isArray(s.seen)||s.seen.some(k=>!NEW_CREATURES[k])||!Array.isArray(s.secrets)||s.secrets.some(n=>!Number.isInteger(n)||n<0||n>1)||!Array.isArray(s.sequence)||s.sequence.length>3||s.sequence.some(n=>![1,2,3].includes(n)))throw Error('Invalid expedition discoveries');
  if(s.carried!==null&&!(spec.id==='hollow'&&['egg-a','egg-b','egg-c'].includes(s.carried)&&!s.flags.includes(s.carried)))throw Error('Invalid carried egg');
  if(!s.rotations||Object.keys(s.rotations).some(k=>!['valve-a','valve-b'].includes(k))||Object.values(s.rotations).some(n=>!Number.isInteger(n)||n<0||n>3)||!s.bodies||typeof s.bodies!=='object')throw Error('Invalid expedition objects');
  for(const [id,p]of Object.entries(s.bodies))if(!spec.bodies.some(b=>b.id===id)||!p||!bounded(p.x)||!bounded(p.y,EXP_H)||!Number.isFinite(p.angle))throw Error('Invalid expedition body');
  if(!s.friend||!bounded(s.friend.x)||!bounded(s.friend.y,EXP_H))throw Error('Invalid companion');
  out.sites[spec.id]=structuredClone(s);
 }
 out.active=raw.active;out.finished=raw.finished;
 if(out.active&&!out.sites[out.active].visited)throw Error('Unvisited active expedition');
 if(out.finished&&!EXPEDITIONS.every(s=>out.sites[s.id].flags.includes('complete')))throw Error('Incomplete observatory');
 return out;
}
export const has=(s,flag)=>s.flags.includes(flag);
export function addFlag(s,flag){if(!has(s,flag))s.flags.push(flag);}
export const waterFlow=s=>has(s,'spring')&&s.rotations['valve-a']===1&&s.rotations['valve-b']===2;
export const bridgeOpen=s=>['bridge-a','bridge-b','bridge-c'].every(f=>has(s,f));
export const siteComplete=(spec,s)=>spec.goal.every(f=>has(s,f));
export function objective(spec,s){
 if(has(s,'complete'))return HORIZON_UI.completed;
 const second=spec.id==='glass'?waterFlow(s):spec.id==='hollow'?has(s,'gate'):spec.id==='creek'?bridgeOpen(s):has(s,'lanterns');
 return spec.stages[second?1:0];
}

// All inventory-consuming actions are transactional. Refused actions leave the
// state untouched; every successful action can safely be repeated after reload.
export function act(spec,s,e,horizon){
 const ok=(text,changed=true)=>({text,changed});
 const no=(ru,kk,en)=>ok(T(ru,kk,en),false);
 if(e.kind==='valve'){s.rotations[e.id]=(s.rotations[e.id]+1)%4;return ok(T('Направление: ','Бағыт: ','Direction: ').map(t=>t+['↑','→','↓','←'][s.rotations[e.id]]));}
 if(e.kind==='water'){
  if(!waterFlow(s))return no('Вода ещё не дошла. Исток должен быть свободен, вентили — → и ↓.','Су әлі жеткен жоқ. Бастауды ашып, шүмектерді → және ↓ бұрыңыз.','The water has not arrived. Clear the spring and align valves → and ↓.');
  s.water=3;return ok(T('Три порции росы в запасе. Теперь к росткам.','Үш үлес шық алынды. Енді өскіндерге барыңыз.','Three portions of dew collected. Head to the sprouts.'));
 }
 if(e.kind==='plant'||e.kind==='pollinate'){
  if(has(s,e.id))return no('Этот цветок уже ожил.','Бұл гүл жанданды.','This flower has already bloomed.');
  const resource=e.kind==='plant'?'water':'pollen';
  if(!s[resource])return e.kind==='plant'?no('Сначала наберите росу в цистерне.','Алдымен ыдыстан шық алыңыз.','Collect dew at the cistern first.'):no('Возьмите пыльцу у большого цветка.','Үлкен гүлден тозаң алыңыз.','Collect pollen at the great flower first.');
  if(e.kind==='pollinate'&&!has(s,'lanterns'))return no('Сначала разбудите сад: фонари 2 → 1 → 3.','Алдымен бақты оятыңыз: шамдар 2 → 1 → 3.','Wake the garden first: lanterns 2 → 1 → 3.');
  s[resource]--;addFlag(s,e.id);return ok(T('Цветок раскрылся. К нему возвращаются опылители.','Гүл ашылды. Тозаңдандырушылар оралады.','The flower opens. Pollinators are returning.'));
 }
 if(e.kind==='egg'){
  if(has(s,e.id))return no('Кладка уже в гнезде.','Жұмыртқалар ұяда.','This cluster is safe in the nest.');
  if(s.carried)return no('В руках уже есть кладка. Сначала отнесите её в гнездо.','Қолыңызда жұмыртқа бар. Алдымен ұяға апарыңыз.','You are already carrying a cluster. Take it to the nest first.');
  s.carried=e.id;return ok(T('Несите осторожно. Гнездо — на западной стороне.','Абайлап апарыңыз. Ұя батыс жақта.','Carry it carefully. The nest is on the western side.'));
 }
 if(e.kind==='nest'){
  if(!s.carried)return no('Найдите кладки за корневой дверью.','Тамыр есігінің ар жағынан жұмыртқаларды табыңыз.','Find the egg clusters beyond the root gate.');
  addFlag(s,s.carried);s.carried=null;return ok(T('Ещё одна кладка в безопасности.','Тағы бір жұмыртқа тобы қауіпсіз жерде.','Another egg cluster is safe.'));
 }
 if(e.kind==='lens'){addFlag(s,'lens');return ok(T('Янтарная линза сохранена для телескопа в кроне.','Кәріптас линза ағаш басындағы телескоп үшін сақталды.','The amber lens is ready for the canopy telescope.'));}
 if(e.kind==='bark'){
  if(has(s,e.id))return no('Кора уже собрана.','Қабық жиналған.','This bark has been collected.');
  addFlag(s,e.id);s.bark++;return ok(T('Кора в рюкзаке. Уложите её у опор моста.','Қабық сөмкеде. Көпір тіректеріне төсеңіз.','Bark packed. Lay it at a bridge support.'));
 }
 if(e.kind==='bridge'){
  if(has(s,e.id))return no('Эта секция уже готова.','Бұл бөлік дайын.','This section is already complete.');
  if(!s.bark)return no('Найдите кору на западном берегу.','Батыс жағадан қабық табыңыз.','Find bark on the western bank.');
  s.bark--;addFlag(s,e.id);return ok(T('Секция закреплена.','Бөлік бекітілді.','Bridge section secured.'));
 }
 if(e.kind==='wheel'){addFlag(s,'wheel');return ok(T('Колесо снова вращается. Мох у дома получает воду.','Дөңгелек қайта айналады. Үй жанындағы мүкке су жетті.','The wheel turns again. Water reaches the moss at home.'));}
 if(e.kind==='friend'){
  if(!bridgeOpen(s))return no('Сначала нужен целый мост.','Алдымен тұтас көпір керек.','A complete bridge is needed first.');
  if(!has(s,'wheel'))return no('Сначала освободите водяное колесо.','Алдымен су дөңгелегін босатыңыз.','Free the water wheel first.');
  addFlag(s,'escort');return ok(T('Спутник идёт к влажному мху. Держитесь рядом.','Серігіңіз ылғалды мүкке барады. Жанында жүріңіз.','Your companion is heading to the damp moss. Stay close.'));
 }
 if(e.kind==='lamp'){
  if(has(s,'lanterns'))return no('Все фонари уже горят.','Барлық шам жанып тұр.','All the lanterns are already lit.');
  const target=[2,1,3];
  if(e.number!==target[s.sequence.length]){s.sequence=[];return ok(T('Свет погас. Порядок на камнях: 2 → 1 → 3.','Жарық сөнді. Тастардағы рет: 2 → 1 → 3.','The lights went out. The stones say: 2 → 1 → 3.'));}
  s.sequence.push(e.number);if(s.sequence.length===3)addFlag(s,'lanterns');return ok(T('Фонарь откликнулся.','Шам жауап берді.','The lantern responds.'));
 }
 if(e.kind==='pollen'){s.pollen=3;return ok(T('Пыльца собрана. Посетите три бутона.','Тозаң жиналды. Үш бүршікке барыңыз.','Pollen collected. Visit the three buds.'));}
 if(e.kind==='telescope'){
  const missing=EXPEDITIONS.filter(p=>!has(horizon.sites[p.id],'complete'));
  if(missing.length)return {text:T('В телескопе не хватает света троп: ','Телескопқа соқпақтар жарығы жетіспейді: ','The telescope needs the light of: '),missing,changed:false};
  if(!has(horizon.sites.hollow,'lens'))return no('Нужна янтарная линза из дупла.','Ағаш қуысынан кәріптас линза керек.','The amber lens from the hollow is needed.');
  horizon.finished=true;return ok(HORIZON_UI.finale);
 }
 return ok(e.label,false);
}
