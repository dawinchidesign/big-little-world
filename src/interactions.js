import { T } from "./content.js";

// Things in the world you can touch. Each verb teaches one small fact the first time.
export const VERBS = ["dew", "bounce", "shake", "search", "clean", "seeds"];
export const emptyWorld = () => ({
  cleaned: [],
  facts: [],
  counts: { dew: 0, bounce: 0, shake: 0, search: 0, clean: 0, seeds: 0 },
});

const FACT = {
  dew: T(
    "Роса выпадает, когда ночью листья остывают сильнее воздуха и водяной пар оседает на них каплями. Для многих насекомых утренняя роса — главный источник воды.",
    "Түнде жапырақ ауадан қаттырақ салқындағанда, су буы оған тамшы болып қонады. Көп жәндік үшін таңғы шық — судың басты көзі.",
    "Dew forms when leaves cool below the air at night and water vapour condenses on them. For many insects, morning dew is the main source of water.",
  ),
  bounce: T(
    "Шляпка гриба — только плодовое тело. Сам гриб — это мицелий, сеть тончайших нитей в почве, которая связывает корни растений и делит с ними воду и питание.",
    "Саңырауқұлақтың қалпағы — тек жеміс денесі. Саңырауқұлақтың өзі — топырақтағы жіңішке жіптер торы, мицелий. Ол өсімдік тамырларымен су мен қоректі бөліседі.",
    "A mushroom cap is only the fruiting body. The fungus itself is mycelium, a web of fine threads in the soil that links plant roots and trades water and nutrients with them.",
  ),
  shake: T(
    "Пыльца прилипает к волоскам пчёл и шмелей. Перелетая с цветка на цветок, они переносят её — так растения опыляются и завязывают семена.",
    "Тозаң аралар мен түкті аралардың түктеріне жабысады. Гүлден гүлге ұшып, олар тозаңды тасиды — өсімдік осылай тозаңданып, тұқым береді.",
    "Pollen sticks to the hairs of bees and bumblebees. Flying from flower to flower they carry it along, which is how plants are pollinated and set seed.",
  ),
  search: T(
    "Под листьями, камнями и корой держатся влага и ровная температура. Здесь прячутся мокрицы, ногохвостки и жуки — они перерабатывают опад в почву.",
    "Жапырақ, тас пен қабық астында ылғал мен тұрақты температура сақталады. Мұнда ылғалқұрт, секіргіш пен қоңыздар тығылады — олар қураған жапырақты топыраққа айналдырады.",
    "Under leaves, stones and bark it stays damp and evenly cool. Woodlice, springtails and beetles hide there and turn fallen litter back into soil.",
  ),
  clean: T(
    "Пластик не разлагается, а крошится на микрочастицы. Крышки и плёнки перегораживают тропы и задерживают воду. Каждая убранная вещь — это освобождённый путь.",
    "Пластик шірімейді, ұсақ бөлшектерге бөлінеді. Қақпақ пен үлдір соқпақты бөгеп, суды тоқтатады. Әр жиналған зат — ашылған жол.",
    "Plastic does not rot; it crumbles into microscopic pieces. Caps and films block paths and trap water. Every piece removed is a path set free.",
  ),
  seeds: T(
    "Коробочки многих растений на ветру работают как солонка: семена высыпаются понемногу и разлетаются дальше от родительского растения.",
    "Көп өсімдіктің қауашағы желде тұздық сияқты жұмыс істейді: тұқым біртіндеп шашылып, аналық өсімдіктен алысқа ұшады.",
    "Many seed capsules work like a salt shaker in the wind: seeds spill a few at a time and spread farther from the parent plant.",
  ),
};

// kind → verb. `reveal` lists creatures that may be hiding there.
export const PROP_ACTIONS = {
  mushroom: { verb: "bounce", label: T("Прыгнуть на шляпку", "Қалпаққа секіру", "Bounce on the cap"), radius: 60 },
  "fungal-cluster": { verb: "bounce", label: T("Прыгнуть на шляпку", "Қалпаққа секіру", "Bounce on the cap"), radius: 60 },
  leaf: { verb: "search", label: T("Перевернуть лист", "Жапырақты аудару", "Turn the leaf over"), radius: 55, reveal: ["springtail", "aphid", "caterpillar", "spider"] },
  rock: { verb: "search", label: T("Заглянуть под камень", "Тас астына қарау", "Look under the stone"), radius: 60, reveal: ["woodlouse", "beetle", "springtail", "ant", "spider"] },
  "lichen-stone": { verb: "search", label: T("Заглянуть под камень", "Тас астына қарау", "Look under the stone"), radius: 60, reveal: ["woodlouse", "springtail", "beetle"] },
  plastic: { verb: "clean", label: T("Убрать мусор", "Қоқысты жинау", "Clear the litter"), radius: 70 },
  cap: { verb: "clean", label: T("Убрать крышку", "Қақпақты жинау", "Clear the bottle cap"), radius: 60 },
  bottle: { verb: "clean", label: T("Откатить бутылку", "Бөтелкені домалату", "Roll the bottle away"), radius: 95 },
  seedpod: { verb: "seeds", label: T("Встряхнуть коробочку", "Қауашақты сілку", "Shake the seed pod"), radius: 55 },
};

export const WORLD_UI = {
  tab: T("Находки", "Олжалар", "Finds"),
  fresh: T("Свежесть росы: вы бежите быстрее", "Шық сергектігі: тезірек жүгіресіз", "Dew-fresh: you run faster"),
  empty: T("Здесь пусто — но место отмечено", "Мұнда бос — бірақ орын белгіленді", "Nothing here this time"),
  cleaned: T("Убрано мусора", "Жиналған қоқыс", "Litter cleared"),
  cleaner: T("Пустошь становится чище: безопасность среды растёт", "Шөл тазаруда: орта қауіпсіздігі өсуде", "The wasteland is cleaner: habitat safety rises"),
  counts: {
    dew: T("Выпито росинок", "Ішілген шық", "Dewdrops drunk"),
    bounce: T("Прыжков с грибов", "Саңырауқұлақтан секіру", "Mushroom bounces"),
    shake: T("Встряхнуто цветов", "Сілкінген гүл", "Flowers shaken"),
    search: T("Укрытий осмотрено", "Қаралған пана", "Hiding places searched"),
    clean: T("Убрано мусора", "Жиналған қоқыс", "Litter cleared"),
    seeds: T("Рассеяно семян", "Себілген тұқым", "Seed pods shaken"),
  },
  hint: T(
    "Подходите к росинкам, грибам, цветам, листьям, камням и мусору — у многих предметов есть действие E.",
    "Шыққа, саңырауқұлаққа, гүлге, жапыраққа, тасқа және қоқысқа жақындаңыз — көп затта E әрекеті бар.",
    "Walk up to dewdrops, mushrooms, flowers, leaves, stones and litter — many things respond to E.",
  ),
  facts: FACT,
};

// Saves from before the living world gain an empty record; bad entries are dropped.
export function validateWorld(input) {
  const base = emptyWorld();
  if (!input || typeof input !== "object") return base;
  const ints = (a) => [...new Set(Array.isArray(a) ? a : [])].filter((v) => Number.isInteger(v) && v >= 0);
  const counts = { ...base.counts };
  for (const k of VERBS) {
    const v = input.counts?.[k];
    if (Number.isInteger(v) && v >= 0) counts[k] = v;
  }
  return {
    cleaned: ints(input.cleaned),
    facts: [...new Set(Array.isArray(input.facts) ? input.facts : [])].filter((v) => VERBS.includes(v)),
    counts,
  };
}
