import { T } from "./content.js";

export const TRAIL_UI = {
  title: T(
    "Тропы над землёй",
    "Жер үстіндегі соқпақтар",
    "Trails above the ground",
  ),
  climb: T("Взобраться по стеблю", "Сабақпен өрмелеу", "Climb the stem"),
  descend: T(
    "Спуститься по стеблю",
    "Сабақпен төмен түсу",
    "Climb down the stem",
  ),
  controls: T(
    "W / ↑ — вверх · S / ↓ — вниз · Пробел — отпустить",
    "W / ↑ — жоғары · S / ↓ — төмен · Бос орын — босату",
    "W / ↑ — climb up · S / ↓ — climb down · Space — release",
  ),
  edge: T(
    "Край листа. Прыгните на соседний или вернитесь к стеблю.",
    "Жапырақ шеті. Көршісіне секіріңіз не сабаққа оралыңыз.",
    "Leaf edge. Jump across or return to the stem.",
  ),
  canopy: T(
    "Вы над землёй · Пробел — прыжок",
    "Сіз жерден жоғарысыз · Бос орын — секіру",
    "Above the ground · Space — jump",
  ),
  discovered: T(
    "Открыта высотная тропа",
    "Биік соқпақ ашылды",
    "Canopy trail discovered",
  ),
  inspect: T(
    "Записать редкое наблюдение",
    "Сирек бақылауды жазу",
    "Record a rare observation",
  ),
  ready: T(
    "Наблюдение уже в дневнике",
    "Бақылау күнделікте бар",
    "Observation already in your journal",
  ),
  hint: T(
    "Ищите стебли с бирюзовыми насечками. На сенсорном экране двигайте джойстик вверх или вниз.",
    "Көгілдір белгісі бар сабақтарды іздеңіз. Сенсорлық экранда джойстикті жоғары не төмен жылжытыңыз.",
    "Look for stems with turquoise marks. On touchscreens, move the joystick up or down.",
  ),
};

const platform = (id, x, y, z, rx = 69, ry = 37) => ({ id, x, y, z, rx, ry });
export const TRAILS = [
  {
    id: "dew-canopy",
    biome: 0,
    name: T("Росная тропа", "Шықты соқпақ", "The dewdrop trail"),
    platforms: [
      platform("dew-1", 950, 870, 112),
      platform("dew-2", 1095, 880, 136),
      platform("dew-3", 1240, 850, 154),
    ],
    title: T(
      "Вода держится за лист",
      "Су жапыраққа жабысады",
      "Water on a leaf",
    ),
    fact: T(
      "Форма капли зависит от поверхностного натяжения и свойств листа. Восковой покров многих растений помогает воде собираться в капли.",
      "Тамшы пішіні беттік керілу мен жапырақ қасиетіне байланысты. Көп өсімдіктің балауыз қабаты судың тамшы болып жиналуына көмектеседі.",
      "A drop’s shape depends on surface tension and the leaf surface. Waxy coatings on many plants help water bead into droplets.",
    ),
  },
  {
    id: "flower-canopy",
    biome: 2,
    name: T(
      "Над цветочной долиной",
      "Гүлдер алқабының үстінде",
      "Above the flower valley",
    ),
    platforms: [
      platform("flower-1", 3680, 930, 140),
      platform("flower-2", 3790, 930, 140),
      platform("flower-3", 3920, 935, 170),
      platform("flower-4", 4050, 920, 180),
    ],
    title: T(
      "До первого полёта",
      "Алғашқы ұшуға дейін",
      "Before the first flight",
    ),
    fact: T(
      "Бабочке нужны условия не только для полёта: яйца и гусеницы связаны с подходящими кормовыми растениями. Здесь можно просмотреть превращение с ускоренным ходом времени.",
      "Көбелекке ұшу жағдайы ғана жеткіліксіз: жұмыртқасы мен жұлдызқұрты сәйкес қоректік өсімдіктерге тәуелді. Мұнда түрленуді уақытын жылдамдатып көруге болады.",
      "A butterfly needs more than flying space: eggs and caterpillars depend on suitable host plants. Here you can watch metamorphosis with time condensed.",
    ),
  },
  {
    id: "night-canopy",
    biome: 7,
    name: T(
      "Между ночными огнями",
      "Түнгі жарықтар арасында",
      "Between the night lights",
    ),
    platforms: [
      platform("night-1", 2270, 3000, 120),
      platform("night-2", 2400, 3020, 145),
      platform("night-3", 2530, 2970, 165),
    ],
    title: T("Свет как сообщение", "Жарық — хабар", "Light as a message"),
    fact: T(
      "У многих светлячков свечение служит для поиска партнёра. Видовые рисунки сигналов различаются; яркое внешнее освещение может мешать общению.",
      "Көп жарқырауық жарықты жұбын іздеуге қолданады. Түрлердің сигнал ырғағы әртүрлі; сыртқы күшті жарық байланысқа кедергі болуы мүмкін.",
      "Many fireflies use light to find a mate. Signal patterns differ between species; bright artificial lighting can interfere with communication.",
    ),
  },
];
export const PLATFORMS = TRAILS.flatMap((t) => t.platforms);
export const byPlatform = (id) => PLATFORMS.find((p) => p.id === id);
export const byTrail = (id) => TRAILS.find((t) => t.id === id);
export const contains = (p, x, y, padding = 0) =>
  ((x - p.x) / (p.rx + padding)) ** 2 + ((y - p.y) / (p.ry + padding)) ** 2 <=
  1;
export const emptyTraversal = () => ({
  z: 0,
  platform: null,
  climb: null,
  visited: [],
  completed: [],
});

// Height and horizontal feet are separate: the physics body remains on the ground plane.
export class Traversal {
  constructor(saved = emptyTraversal(), x = 0, y = 0) {
    this.z = 0;
    this.vz = 0;
    this.platform = null;
    this.climb = null;
    this.airborne = false;
    this.gliding = false;
    this.lastX = x;
    this.lastY = y;
    const p = byPlatform(saved.platform),
      t = byTrail(saved.climb);
    if (p && contains(p, x, y, 2)) {
      this.platform = p.id;
      this.z = p.z;
    } else if (
      t &&
      Math.hypot(x - t.platforms[0].x, y - t.platforms[0].y) < 80
    ) {
      this.climb = t.id;
      this.z = Math.max(0, Math.min(t.platforms[0].z, Number(saved.z) || 0));
    }
  }
  snapshot(previous = emptyTraversal()) {
    return {
      ...previous,
      z: this.z,
      platform: this.platform,
      climb: this.climb,
    };
  }
  attach(id, x, y) {
    const t = byTrail(id),
      p = t?.platforms[0];
    if (
      !p ||
      this.airborne ||
      Math.hypot(x - p.x, y - p.y) > 80 ||
      this.z > p.z + 5
    )
      return false;
    this.climb = id;
    this.platform = null;
    this.vz = 0;
    this.lastX = p.x;
    this.lastY = p.y;
    return true;
  }
  jump() {
    if (this.airborne) return false;
    this.climb = null;
    this.platform = null;
    this.airborne = true;
    this.vz = 245;
    this.gliding = false;
    return true;
  }
  tick({ x, y, vertical = 0, dt, glider = false }) {
    let landed = false,
      edge = false;
    if (this.climb) {
      const p = byTrail(this.climb).platforms[0];
      x = p.x;
      y = p.y;
      this.z = Math.max(0, Math.min(p.z, this.z - vertical * 100 * dt));
      if (this.z >= p.z && vertical < 0) {
        this.platform = p.id;
        this.climb = null;
        landed = true;
      } else if (this.z <= 0 && vertical > 0) {
        this.climb = null;
      }
    } else if (this.airborne) {
      const prev = this.z;
      this.gliding = glider && this.vz < 0;
      this.vz -= (this.gliding ? 155 : 690) * dt;
      if (this.gliding) this.vz = Math.max(this.vz, -78);
      this.z += this.vz * dt;
      if (this.vz < 0) {
        const p = PLATFORMS.filter(
          (p) => prev >= p.z - 1 && this.z <= p.z && contains(p, x, y),
        ).sort((a, b) => b.z - a.z)[0];
        if (p) {
          this.z = p.z;
          this.platform = p.id;
          this.airborne = false;
          this.vz = 0;
          landed = true;
        }
      }
      if (this.z <= 0) {
        this.z = 0;
        this.vz = 0;
        this.airborne = false;
        this.platform = null;
        landed = true;
      }
      if (!this.airborne) this.gliding = false;
    } else if (this.platform) {
      const p = byPlatform(this.platform);
      if (!contains(p, x, y, 2)) {
        const next = PLATFORMS.find(
          (q) => Math.abs(q.z - p.z) <= 6 && contains(q, x, y),
        );
        if (next) {
          this.platform = next.id;
          this.z = next.z;
        } else {
          x = this.lastX;
          y = this.lastY;
          edge = true;
        }
      }
    }
    this.lastX = x;
    this.lastY = y;
    return { x, y, z: this.z, landed, edge };
  }
}
