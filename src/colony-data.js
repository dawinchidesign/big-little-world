import { T } from "./content.js";

export const TILE = 64,
  COLS = 32,
  ROWS = 24;
export const COLONY_WIDTH = COLS * TILE,
  COLONY_HEIGHT = ROWS * TILE;
export const cellPoint = (x, y) => ({
  x: (x + 0.5) * TILE,
  y: (y + 0.5) * TILE,
});
export const COLONY_ENTRANCE = { x: 1850, y: 620 };
export const COLONY_SPAWN = cellPoint(6, 4);
export const COLONY_UI = {
  title: T("Муравьиная цитадель", "Құмырсқа қамалы", "The ant citadel"),
  enter: T(
    "Спуститься в муравейник",
    "Құмырсқа илеуіне түсу",
    "Enter the ant nest",
  ),
  leave: T(
    "Вернуться на поверхность",
    "Жер бетіне шығу",
    "Return to the surface",
  ),
  chapter: T(
    "Вторая глава проходит под землёй. Ищите вход у муравьиной тропы.",
    "Екінші тарау жер астында өтеді. Құмырсқа соқпағынан кіреберісті іздеңіз.",
    "Chapter two takes place underground. Find the entrance beside the ant trail.",
  ),
  repaired: T(
    "Переход открыт. Рабочие снова переносят расплод по безопасному пути.",
    "Өткел ашылды. Жұмысшылар ұрпақты қауіпсіз жолмен қайта тасиды.",
    "The crossing is open. Workers can carry the brood along the safe route again.",
  ),
  blocked: T(
    "Трещина преграждает путь. Укрепите переход с этой стороны.",
    "Жарық жолды бөгеді. Өткелді осы жақтан бекітіңіз.",
    "The crack blocks the passage. Reinforce the crossing from this side.",
  ),
  observe: T(
    "Наблюдайте рядом с расплодом — Q. Дайте рабочим закончить перенос.",
    "Ұрпақ жанында бақылаңыз — Q. Жұмысшыларға тасуды аяқтауға мүмкіндік беріңіз.",
    "Observe beside the brood — Q. Give the workers time to finish carrying.",
  ),
  needed: T(
    "Сначала соберите сухие веточки. Рабочие ждут у повреждённого прохода.",
    "Алдымен құрғақ бұтақтарды жинаңыз. Жұмысшылар бүлінген өткелде күтеді.",
    "Gather the dry twigs first. Workers are waiting by the damaged passage.",
  ),
  map: T(
    "Схема подземных ходов",
    "Жерасты жолдарының сызбасы",
    "Underground passages",
  ),
  mapHint: T(
    "Золотые метки — текущие цели. Светло-зелёная метка — выход на поверхность.",
    "Алтын белгілер — ағымдағы мақсаттар. Ашық жасыл белгі — жер бетіне шығу.",
    "Gold marks show current objectives. The pale green mark is the surface exit.",
  ),
  notes: T("Жизнь колонии", "Колония тіршілігі", "Life in the colony"),
  noteHint: T(
    "Исследуйте камеры муравейника. Записи появляются после наблюдения у светлых меток.",
    "Илеу бөлмелерін зерттеңіз. Жарық белгілер жанындағы бақылаудан кейін жазбалар пайда болады.",
    "Explore the nest chambers. Observe at the pale markers to record their roles.",
  ),
  fiction: T(
    "Разрез гнезда, тёплое освещение и мостик — художественные приёмы. Устройство гнёзд различается у разных видов.",
    "Илеу қимасы, жылы жарық пен көпір — көркемдік тәсілдер. Әртүрлі түрдің илеуі әрқалай құрылған.",
    "The cutaway, warm lighting and bridge are artistic devices. Nest structure varies between species.",
  ),
  exitGoal: T(
    "Глава завершена. Вернитесь на поверхность к Цветочной долине.",
    "Тарау аяқталды. Гүлдер алқабына бару үшін жер бетіне шығыңыз.",
    "Chapter complete. Return to the surface towards the flower valley.",
  ),
  exploreGoal: T(
    "Исследуйте открытые камеры. Затем вернитесь к заданию разведчика.",
    "Ашық бөлмелерді зерттеңіз. Содан соң барлаушы тапсырмасына оралыңыз.",
    "Explore the open chambers, then return to the scout’s quest.",
  ),
  watch: T(
    "Понаблюдать за работой колонии",
    "Колония жұмысын бақылау",
    "Observe the colony at work",
  ),
};

export const CHAMBERS = [
  {
    id: "entrance",
    cx: 6,
    cy: 4,
    rx: 3.7,
    ry: 2.7,
    name: T("Входной зал", "Кіреберіс бөлме", "The entrance hall"),
    note: T(
      "Рабочие встречаются усиками и обмениваются химическими сигналами. Колония координирует работу без человеческих приказов.",
      "Жұмысшылар мұртшаларын түйістіріп, химиялық сигнал алмасады. Колония адамша бұйрықсыз жұмысын үйлестіреді.",
      "Workers touch antennae and exchange chemical signals. The colony coordinates tasks without human commands.",
    ),
  },
  {
    id: "stores",
    cx: 12,
    cy: 5,
    rx: 3.5,
    ry: 2.5,
    name: T("Камера пищи", "Қорек бөлмесі", "The food chamber"),
    note: T(
      "Пища поддерживает рабочих и растущий расплод. Что собирают муравьи и как делятся кормом, зависит от вида и потребностей колонии.",
      "Қорек жұмысшылар мен өсіп жатқан ұрпақты қамтамасыз етеді. Құмырсқаның не жинап, қалай бөлісетіні түрі мен колония қажетіне байланысты.",
      "Food supports the workers and growing brood. What ants collect and how they share it depends on the species and the colony’s needs.",
    ),
  },
  {
    id: "brood",
    cx: 23,
    cy: 7,
    rx: 3.3,
    ry: 2.4,
    name: T("Камера расплода", "Ұрпақ бөлмесі", "The brood chamber"),
    note: T(
      "Яйца, личинки и куколки нуждаются в уходе. Рабочие кормят личинок и могут переносить расплод в более подходящие условия.",
      "Жұмыртқа, дернәсіл мен қуыршақ күтімді қажет етеді. Жұмысшылар дернәсілді қоректендіріп, ұрпақты қолайлы жағдайға таси алады.",
      "Eggs, larvae and pupae need care. Workers feed larvae and may move brood to more suitable conditions.",
    ),
  },
  {
    id: "junction",
    cx: 14,
    cy: 12,
    rx: 3.4,
    ry: 2.5,
    name: T("Переплетение ходов", "Жолдар тоғысы", "The passage junction"),
    note: T(
      "Сеть ходов связывает камеры. Повреждение одного участка меняет доступные пути: восстановленный проход снова соединяет части колонии.",
      "Жолдар желісі бөлмелерді байланыстырады. Бір бөлік бүлінсе, қолжетімді бағыт өзгереді: жөнделген өткел колонияны қайта байланыстырады.",
      "Passages connect the chambers. A damaged section changes the available routes; restoring it reconnects parts of the colony.",
    ),
  },
  {
    id: "shelter",
    cx: 6,
    cy: 16,
    rx: 3.8,
    ry: 2.5,
    name: T("Сухое убежище", "Құрғақ пана", "The dry refuge"),
    note: T(
      "Влага и температура внутри гнезда неодинаковы. Перемещение расплода — один из способов реагировать на меняющиеся условия.",
      "Илеудің ішіндегі ылғал мен температура бірдей емес. Ұрпақты тасу — жағдай өзгерісіне жауап берудің бір жолы.",
      "Moisture and temperature vary within a nest. Moving brood is one way a colony responds to changing conditions.",
    ),
  },
  {
    id: "queen",
    cx: 24,
    cy: 17,
    rx: 3.5,
    ry: 2.5,
    name: T("Камера матки", "Аналық бөлмесі", "The queen’s chamber"),
    note: T(
      "Матка — репродуктивная самка. Её основная роль — откладывать яйца. Рабочие ухаживают за ней; это не тронный зал человеческого правителя.",
      "Аналық — көбеюге маманданған ұрғашы. Негізгі міндеті — жұмыртқа салу. Жұмысшылар оған күтім жасайды; бұл адам билеушісінің тақ залы емес.",
      "The queen is a reproductive female whose main role is laying eggs. Workers tend her; this is not a human ruler’s throne room.",
    ),
  },
  {
    id: "remains",
    cx: 14,
    cy: 20,
    rx: 3,
    ry: 2,
    name: T("Дальний карман", "Шеткі қуыс", "The far pocket"),
    note: T(
      "Часть рабочих выносит ненужные остатки. Обращение с отходами различается у разных видов; чистота и расположение остатков важны для жизни колонии.",
      "Кей жұмысшылар қажетсіз қалдықты сыртқа шығарады. Қалдықпен жұмыс әр түрге тән; тазалық пен қалдық орны колония тіршілігіне маңызды.",
      "Some workers remove unwanted remains. Waste handling varies between species; cleanliness and where remains accumulate matter to colony life.",
    ),
  },
];

const corridors = [
  [
    [6, 6],
    [6, 9],
    [13, 9],
    [13, 12],
  ],
  [
    [12, 7],
    [12, 9],
  ],
  [
    [14, 12],
    [18, 12],
    [18, 7],
    [21, 7],
  ],
  [
    [14, 13],
    [14, 16],
    [8, 16],
  ],
  [
    [16, 13],
    [24, 13],
    [24, 17],
  ],
  [
    [14, 16],
    [14, 20],
  ],
];
// A finer, curved surface for artwork and collision, keeping coarse path cells
// for cheap route searches. This is geometry, not a single background picture.
let surfaceGrid;
export function colonyFloorAt(x, y) {
  const grid = surfaceGrid || (surfaceGrid = makeColonyGrid(true));
  const col = Math.floor(x / TILE),
    row = Math.floor(y / TILE),
    center = cellPoint(col, row),
    dx = x - center.x,
    dy = y - center.y;
  if (grid[row]?.[col]) {
    // Keep a clearance corridor between every pair of connected route cells.
    if (
      Math.abs(dx) < 22 &&
      (Math.abs(dy) < 22 ||
        (dy < 0 ? grid[row - 1]?.[col] : grid[row + 1]?.[col]))
    )
      return true;
    if (
      Math.abs(dy) < 22 &&
      (Math.abs(dx) < 22 ||
        (dx < 0 ? grid[row]?.[col - 1] : grid[row]?.[col + 1]))
    )
      return true;
  }
  for (const room of CHAMBERS) {
    const center = cellPoint(room.cx, room.cy);
    if (
      ((x - center.x) / (room.rx * TILE + 12)) ** 2 +
        ((y - center.y) / (room.ry * TILE + 12)) ** 2 <=
      1
    )
      return true;
  }
  for (const points of corridors)
    for (let i = 1; i < points.length; i++) {
      const a = cellPoint(...points[i - 1]),
        b = cellPoint(...points[i]);
      if (
        x >= Math.min(a.x, b.x) - 94 &&
        x <= Math.max(a.x, b.x) + 94 &&
        y >= Math.min(a.y, b.y) - 94 &&
        y <= Math.max(a.y, b.y) + 94
      )
        return true;
    }
  return false;
}
export const GATE_CELLS = [
  [17, 9],
  [18, 9],
  [19, 9],
];
export const GATE_POINT = cellPoint(18, 9);
export const COLONY_OBJECTIVES = [
  [cellPoint(6, 6), cellPoint(12, 5), cellPoint(6, 16)],
  [cellPoint(18, 10)],
  [cellPoint(23, 7)],
];
export const NOTE_POINTS = Object.fromEntries(
  CHAMBERS.map((room) => [room.id, cellPoint(room.cx, room.cy + 1)]),
);
export const emptyColony = () => ({
  active: false,
  ...COLONY_SPAWN,
  visited: [],
  notes: [],
});
export function bridgeIsOpen(state) {
  return (
    state.quest > 1 ||
    (state.quest === 1 && state.stage >= 2) ||
    state.completed.includes("citadel")
  );
}
export function makeColonyGrid(open = true) {
  const grid = Array.from({ length: ROWS }, () => Array(COLS).fill(false));
  const carve = (x, y) => {
    if (x > 0 && y > 0 && x < COLS - 1 && y < ROWS - 1) grid[y][x] = true;
  };
  for (const room of CHAMBERS)
    for (let y = 1; y < ROWS - 1; y++)
      for (let x = 1; x < COLS - 1; x++)
        if (
          ((x - room.cx) / room.rx) ** 2 + ((y - room.cy) / room.ry) ** 2 <=
          1
        )
          carve(x, y);
  for (const points of corridors)
    for (let i = 1; i < points.length; i++) {
      let [x, y] = points[i - 1];
      const [tx, ty] = points[i];
      for (;;) {
        for (let oy = -1; oy <= 1; oy++)
          for (let ox = -1; ox <= 1; ox++) carve(x + ox, y + oy);
        if (x === tx && y === ty) break;
        x += Math.sign(tx - x);
        y += Math.sign(ty - y);
      }
    }
  if (!open) for (const [x, y] of GATE_CELLS) grid[y][x] = false;
  return grid;
}
export function walkable(grid, x, y) {
  return Boolean(grid[Math.floor(y / TILE)]?.[Math.floor(x / TILE)]);
}
export function nearestFloor(grid, x, y) {
  if (walkable(grid, x, y)) return { x, y };
  let best = COLONY_SPAWN,
    dist = Infinity;
  for (let row = 0; row < ROWS; row++)
    for (let col = 0; col < COLS; col++)
      if (grid[row][col]) {
        const p = cellPoint(col, row),
          d = (p.x - x) ** 2 + (p.y - y) ** 2;
        if (d < dist) {
          dist = d;
          best = p;
        }
      }
  return { ...best };
}
export function colonyPath(grid, from, to) {
  const sx = Math.floor(from.x / TILE),
    sy = Math.floor(from.y / TILE),
    tx = Math.floor(to.x / TILE),
    ty = Math.floor(to.y / TILE);
  if (!grid[sy]?.[sx] || !grid[ty]?.[tx]) return [];
  const start = sy * COLS + sx,
    goal = ty * COLS + tx,
    queue = [start],
    parents = new Map([[start, null]]);
  for (let i = 0; i < queue.length && !parents.has(goal); i++) {
    const id = queue[i],
      x = id % COLS,
      y = Math.floor(id / COLS);
    for (const [dx, dy] of [
      [1, 0],
      [-1, 0],
      [0, 1],
      [0, -1],
    ]) {
      const nx = x + dx,
        ny = y + dy,
        key = ny * COLS + nx;
      if (!grid[ny]?.[nx] || parents.has(key)) continue;
      parents.set(key, id);
      queue.push(key);
    }
  }
  if (!parents.has(goal)) return [];
  const route = [];
  for (let id = goal; id !== null; id = parents.get(id))
    route.push(cellPoint(id % COLS, Math.floor(id / COLS)));
  return route.reverse();
}
