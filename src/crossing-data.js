import { T } from './content.js';
export const FLOOD={left:3260,right:3550,top:1680,bottom:1910};
export const DOCKS={north:{x:3370,y:1640},south:{x:3370,y:1945}};
export const ROOT_PATH=[{x:3370,y:1620},{x:3260,y:1620},{x:3208,y:1720},{x:3215,y:1830},{x:3250,y:1940},{x:3370,y:1970}];
export const BRIDGE_PATH=[{x:3520,y:1620},{x:3520,y:1970},{x:3400,y:1990}];
export const WOOD=[{x:3300,y:1530},{x:3420,y:1540},{x:3530,y:1570}];
export const LEAVES=[{x:3250,y:1550},{x:3310,y:1570}];
export const COVERS=[{x:3210,y:1730},{x:3225,y:1860}];
export const CROSS_UI={
 title:T('Переправа после дождя','Жаңбырдан кейінгі өткел','After the rain'),
 intro:T('Ливень отрезал шестерых жителей от влажного убежища. Посмотри на три пути: лист у воды, корни слева и разрушенный мост справа. Помоги всем добраться до другого берега.','Нөсер алты мекендеушіні ылғалды панадан бөліп тастады. Үш жол бар: судағы жапырақ, сол жақтағы тамырлар және оң жақтағы бұзылған көпір. Бәрін арғы жағаға жеткіз.','The rain cut six neighbours off from a damp refuge. There are three ways: the leaf on the water, the roots to the left and the broken bridge to the right. Help everyone reach the far bank.'),
 scout:T('Разведчик у ручья','Жылғадағы барлаушы','The stream scout'),
 inspect:T('Обсудить переправу','Өткелді талқылау','Discuss the crossing'),
 leaf:T('Листовой паром','Жапырақ паромы','The leaf ferry'),
 roots:T('Обход по корням','Тамырлармен айналып өту','The root detour'),
 bridge:T('Мост с муравьями','Құмырсқалармен көпір салу','A bridge with the ants'),
 leafHelp:T('Лист выдержит героя и двух попутчиков. Управляй WASD или джойстиком и пристань у другого берега. Вернись за следующей парой. Паром останется регулярной переправой.','Жапырақ кейіпкер мен екі жолаушыны көтереді. WASD не джойстикпен басқар да, арғы жағаға тоқта. Келесі жұпқа қайтып кел. Паром тұрақты өткел болады.','The leaf carries you and two neighbours. Steer with WASD or the joystick and dock at the opposite bank. Return for the next pair. The ferry will remain a regular crossing.'),
 rootsHelp:T('Корни огибают воду слева. Пройди по их изгибам, собери два опавших листа и накрой отмеченные места: мокрицам нужна влажная тень. После подготовки жители пойдут этим длинным путём.','Тамырлар суды сол жақтан айналып өтеді. Иірімдерімен жүріп, екі түскен жапырақ жина да, белгіленген орындарды жап: есекқұртқа ылғалды көлеңке керек. Дайын болғанда мекендеушілер ұзақ жолмен жүреді.','The roots skirt the water on the left. Follow their bends, collect two fallen leaves and cover the marked spots: woodlice need damp shade. Once it is ready, neighbours will use this longer route.'),
 bridgeHelp:T('Собери три сухие веточки на этом берегу. У опоры нажми E: рабочие укрепят настил. Перейди мост первым — затем по нему пойдут жители и начнут носить пищу в убежище.','Осы жағадан үш құрғақ бұтақ жина. Тірек жанында E бас: жұмысшылар төсемді бекітеді. Көпірден бірінші өт — кейін мекендеушілер жүріп, панаға қорек тасиды.','Gather three dry twigs on this bank. Press E at the support: workers will secure the deck. Cross first, then neighbours will follow and carry food to the refuge.'),
 locked:T('Жители уже начали путь. Доведём эту переправу до конца.','Мекендеушілер жолға шықты. Осы өткелді аяқтайық.','The neighbours have started moving. Let us finish this crossing.'),
 wood:T('Подобрать сухую веточку','Құрғақ бұтақ алу','Pick up a dry twig'),
 fallen:T('Подобрать опавший лист','Түскен жапырақты алу','Pick up a fallen leaf'),
 cover:T('Устроить влажное укрытие','Ылғалды пана жасау','Make a damp shelter'),
 needLeaf:T('Сначала подбери ещё один опавший лист у начала корней.','Алдымен тамырлар басынан тағы бір түскен жапырақ ал.','First collect another fallen leaf near the root entrance.'),
 needWood:T('Для настила нужны три сухие веточки с этого берега.','Төсемге осы жағадан үш құрғақ бұтақ керек.','The deck needs three dry twigs from this bank.'),
 ready:T('Муравьи укрепляют настил…','Құмырсқалар төсемді бекітуде…','The ants are securing the deck…'),
 built:T('Мост готов. Перейди по нему к убежищу.','Көпір дайын. Онымен панаға өт.','The bridge is ready. Cross it to the refuge.'),
 board:T('На лист — взять двух попутчиков','Жапыраққа — екі жолаушы алу','Board with two neighbours'),
 return:T('Вернуться на листе за остальными','Қалғандарына жапырақпен қайту','Sail back for the others'),
 steer:T('Паром · WASD / джойстик — плыть к причалу','Паром · WASD / джойстик — айлаққа жүзу','Ferry · WASD / joystick — steer toward the dock'),
 docked:T('Пристали. Жители сходят на берег. Вернись за оставшимися.','Айлаққа жеттік. Жолаушылар жағаға түседі. Қалғандарына қайт.','Docked. The passengers are stepping ashore. Return for the others.'),
 arrived:T('Путь пройден. Дождись остальных жителей.','Жолдан өттің. Қалған мекендеушілерді күт.','You crossed. Wait for the remaining neighbours.'),
 water:T('Поток слишком глубок. Нужен лист, корни или готовый мост.','Ағын тым терең. Жапырақ, тамыр не дайын көпір керек.','The stream is too deep. Use the leaf, the roots or a repaired bridge.'),
 choose:T('Найди способ переправить шестерых жителей','Алты мекендеушіні өткізудің жолын тап','Find a way across for six neighbours'),
 rootsTask:T('Пройди корни и поставь два влажных укрытия','Тамырлармен өтіп, екі ылғалды пана жаса','Follow the roots and make two damp shelters'),
 bridgeTask:T('Собери три веточки, укрепи мост и перейди первым','Үш бұтақ жинап, көпірді бекіт те, бірінші өт','Gather three twigs, repair the bridge and cross first'),
 leafTask:T('Перевези три пары жителей на листе','Жапырақпен үш жұп мекендеушіні өткіз','Ferry three pairs of neighbours across'),
 waiting:T('Жители идут к убежищу','Мекендеушілер панаға бара жатыр','The neighbours are heading for the refuge'),
 complete:T('Все шестеро в безопасности','Алтауы да қауіпсіз жерде','All six are safe'),
 leafEnd:T('Лист стал паромом. Пары жителей продолжают переправляться с пищей: этот путь требует регулярных рейсов.','Жапырақ паромға айналды. Жұптар қорекпен қатынайды: бұл жолға тұрақты рейстер қажет.','The leaf became a ferry. Pairs keep crossing with food: this route depends on regular trips.'),
 rootsEnd:T('Под укрытиями сохранилась влажная тень. Жители обходят воду по корням. Путь длиннее, зато поток остаётся свободным.','Паналар астында ылғалды көлеңке сақталды. Мекендеушілер суды тамырлармен айналып өтеді. Жол ұзақ, бірақ ағын ашық қалады.','The shelters keep a damp shade. Neighbours follow the roots around the water. It is longer, while the stream remains open.'),
 bridgeEnd:T('Муравьи пользуются постоянным мостом и носят пищу в убежище. Настил потребует ухода после следующего сильного дождя.','Құмырсқалар тұрақты көпірмен панаға қорек тасиды. Келесі нөсерден кейін төсемге күтім қажет болады.','The ants use the permanent bridge to carry food to the refuge. The deck will need maintenance after another heavy rain.'),
 progress:T('На другом берегу','Арғы жағада','On the far bank'),
 note:T('Три пути у Зеркального озера','Айна көлінің үш жолы','Three routes by Mirror Lake'),
 artistic:T('Листовой паром с героем — условность сна. Реальные переправы и переселение животных требуют подходящих условий.','Кейіпкері бар жапырақ паромы — түс шарттылығы. Шынайы өткел мен жануарлардың қоныс аударуына қолайлы жағдай керек.','The hero’s leaf ferry is a dream device. Real crossings and animal movements depend on suitable conditions.'),
};
export const routeTitle=r=>CROSS_UI[r];
export const routeEnding=r=>CROSS_UI[r+'End'];
export function emptyCrossing(){return {visited:false,route:null,heroCrossed:false,wood:[],leaves:[],covers:[],rootStep:0,bridgeEntered:false,building:false,build:0,bridgeBuilt:false,boat:{x:3370,y:1640,aboard:false,cargo:[],from:'north'},people:[0,0,0,0,0,0],done:false};}
export function validateCrossing(raw){
 if(raw!==undefined&&(!raw||typeof raw!=='object'||Array.isArray(raw)))throw Error('Invalid crossing record');
 const base=emptyCrossing(),s={...base,...raw,boat:{...base.boat,...raw?.boat}};
 const bool=['visited','heroCrossed','bridgeEntered','building','bridgeBuilt','done'];
 if(bool.some(k=>typeof s[k]!=='boolean')||![null,'leaf','roots','bridge'].includes(s.route)||!Number.isInteger(s.rootStep)||s.rootStep<0||s.rootStep>ROOT_PATH.length||!Number.isFinite(s.build)||s.build<0||s.build>1)throw Error('Invalid crossing state');
 for(const [key,max]of[['wood',3],['leaves',2],['covers',2]])if(!Array.isArray(s[key])||new Set(s[key]).size!==s[key].length||s[key].some(i=>!Number.isInteger(i)||i<0||i>=max))throw Error('Invalid crossing materials');
 if(s.covers.length>s.leaves.length||!Array.isArray(s.people)||s.people.length!==6||s.people.some(p=>!Number.isFinite(p)||p<0||p>1))throw Error('Invalid crossing residents');
 const b=s.boat;
 if(!Number.isFinite(b.x)||!Number.isFinite(b.y)||b.x<3280||b.x>3450||b.y<1640||b.y>1945||!['north','south'].includes(b.from)||typeof b.aboard!=='boolean'||!Array.isArray(b.cargo)||b.cargo.length>2||new Set(b.cargo).size!==b.cargo.length||b.cargo.some(i=>!Number.isInteger(i)||i<0||i>=6||s.people[i]!==0)||b.aboard&&s.route!=='leaf'||b.cargo.length&&!b.aboard)throw Error('Invalid ferry state');
 if(s.done&&(!s.heroCrossed||s.people.some(p=>p<1))||s.bridgeBuilt&&s.wood.length<3||s.building&&s.wood.length<3||!s.route&&(s.heroCrossed||s.people.some(p=>p>0)))throw Error('Inconsistent crossing state');
 return s;
}
export const delivered=s=>s.people.filter(p=>p===1).length;
export const committed=s=>s.done||s.boat.aboard||s.people.some(p=>p>0);
export function selectRoute(s,route){if(!['leaf','roots','bridge'].includes(route)||s.route!==route&&committed(s))return false;if(s.route!==route){s.heroCrossed=false;s.rootStep=0;s.bridgeEntered=false;}s.visited=true;s.route=route;return true;}
export const pathLength=path=>path.slice(1).reduce((n,p,i)=>n+Math.hypot(p.x-path[i].x,p.y-path[i].y),0);
export function pathPoint(path,fraction){let left=pathLength(path)*Math.max(0,Math.min(1,fraction));for(let i=1;i<path.length;i++){const a=path[i-1],b=path[i],d=Math.hypot(b.x-a.x,b.y-a.y);if(left<=d)return{x:a.x+(b.x-a.x)*left/d,y:a.y+(b.y-a.y)*left/d,angle:Math.atan2(b.y-a.y,b.x-a.x)+Math.PI/2};left-=d;}return{...path.at(-1),angle:Math.PI};}
export function readyForResidents(s){return s.heroCrossed&&(s.route==='bridge'&&s.bridgeBuilt||s.route==='roots'&&s.covers.length===2&&s.rootStep===ROOT_PATH.length);}
export function tickResidents(s,dt){if(!readyForResidents(s)||s.done)return;const length=pathLength(s.route==='roots'?ROOT_PATH:BRIDGE_PATH);for(let i=0;i<6;i++)if(i===0||s.people[i-1]>.10)s.people[i]=Math.min(1,s.people[i]+dt*(i<4?90:70)/length);}
export function boardFerry(s){if(!selectRoute(s,'leaf')||s.done||s.boat.aboard)return false;const north=s.boat.y<1660;s.boat.from=north?'north':'south';s.boat.aboard=true;s.boat.cargo=north?s.people.flatMap((p,i)=>p===0?[i]:[]).slice(0,2):[];return true;}
export function dockFerry(s){const b=s.boat;if(!b.aboard||Math.abs(b.x-3370)>62)return false;if(b.from==='north'&&b.y>=1944){s.heroCrossed=true;for(const i of b.cargo)s.people[i]=1;b.cargo=[];b.aboard=false;return 'south';}if(b.from==='south'&&b.y<=1641&&b.cargo.length===0){b.aboard=false;return 'north';}return false;}
export function crossingTask(s){return s.done?CROSS_UI.complete:readyForResidents(s)?CROSS_UI.waiting:s.route?CROSS_UI[s.route+'Task']:CROSS_UI.choose;}
// Reserve the projected foliage footprint too: tall foreground plants rooted
// below the camp must not cover the hero, shelter actions or landing point.
export function reservedCrossing(x,y){return x>3050&&x<3650&&y>1490&&y<2350;}
