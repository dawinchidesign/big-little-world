import { T } from "./content.js";

// Dandelion wind network: one station per region; awakened stations can be flown between.
export const STATIONS = [
  { biome: 0, x: 800, y: 250 },
  { biome: 1, x: 2400, y: 250 },
  { biome: 2, x: 4000, y: 700 },
  { biome: 3, x: 4000, y: 1350 },
  { biome: 4, x: 2400, y: 1500 },
  { biome: 5, x: 800, y: 1500 },
  { biome: 6, x: 950, y: 2750 },
  { biome: 7, x: 2250, y: 2750 },
  { biome: 8, x: 4000, y: 2600 },
];
export const stationOf = (biome) => STATIONS.find((s) => s.biome === biome);
export const emptyTravel = () => ({ stations: [] });
// Older saves have no wind network; malformed entries are dropped, not fatal.
export const validateTravel = (input) => ({
  stations: [...new Set(Array.isArray(input?.stations) ? input.stations : [])].filter(
    (id) => Number.isInteger(id) && id >= 0 && id < STATIONS.length,
  ),
});

export const TRAVEL_UI = {
  wake: T("Разбудить одуванчик", "Бақбақты ояту", "Wake the dandelion"),
  fly: T("Ветер одуванчиков", "Бақбақ желі", "Dandelion wind"),
  awakened: T(
    "Одуванчик раскрылся. Станция ветра отмечена на карте.",
    "Бақбақ ашылды. Жел бекеті картаға белгіленді.",
    "The dandelion opens. This wind station is now on your map.",
  ),
  introTitle: T("Ветер одуванчиков", "Бақбақ желі", "Dandelion wind"),
  intro: T(
    "Одно семя одуванчика весит меньше миллиграмма, а его пушистый хохолок держит воздух так, что ветер уносит семя на километры. Для человека это пушинка. Для тебя — воздушный шар.\n\nБуди одуванчики в каждой области. У любого проснувшегося можно взяться за семя и перелететь к другому.",
    "Бақбақ тұқымы бір миллиграмнан да жеңіл, ал оның түкті айдары ауаны ұстап тұрады, сондықтан жел оны шақырымдарға алып кетеді. Адам үшін бұл мамық. Сен үшін — әуе шары.\n\nӘр аймақтағы бақбақты оят. Оянған кез келген бақбақтан тұқымды ұстап, басқасына ұшып бара аласың.",
    "A dandelion seed weighs less than a milligram, yet its feathery pappus holds the air so well that wind can carry it for kilometres. To a person it is fluff. To you it is a balloon.\n\nWake the dandelions in every region. At any awakened one you can hold a seed and fly to another.",
  ),
  choose: T("Куда полетим?", "Қайда ұшамыз?", "Where shall we fly?"),
  here: T("Вы здесь", "Сіз осындасыз", "You are here"),
  asleep: T("Одуванчик ещё спит", "Бақбақ әлі ұйықтап тұр", "Dandelion still asleep"),
  unknown: T("Неизвестная область", "Белгісіз аймақ", "Unknown region"),
  escort: T(
    "Спутники не умеют держаться за семена. Сначала доведите отряд.",
    "Серіктер тұқымға жабыса алмайды. Алдымен топты жеткізіңіз.",
    "Your companions cannot hold on to seeds. Bring the group through first.",
  ),
  hint: T(
    "Esc — пропустить полёт",
    "Esc — ұшуды өткізу",
    "Esc — skip the flight",
  ),
  legend: T("Станция ветра", "Жел бекеті", "Wind station"),
};

// Illustrated stations live in the shared atlas; retain procedural fallbacks.
export function makeTravelTextures(scene, resolveVisual = () => null) {
  const put = (key, w, h, draw) => {
    if (resolveVisual(key)) return;
    if (scene.textures.exists(key)) return;
    const c = document.createElement("canvas");
    c.width = w;
    c.height = h;
    const g = c.getContext("2d");
    if (!g) return;
    g.imageSmoothingEnabled = false;
    draw((x, y, ww, hh, col) => {
      g.fillStyle = col;
      g.fillRect(Math.round(x), Math.round(y), ww, hh);
    }, g);
    scene.textures.addCanvas(key, c);
  };
  const stem = (px) => {
    for (let y = 30; y < 108; y++) {
      const x = 31 + Math.round(Math.sin(y / 17) * 1.5);
      px(x - 1, y, 1, 1, "#b7dc84");
      px(x, y, 2, 1, "#79a94f");
      px(x + 2, y, 1, 1, "#2f5131");
    }
    // Toothed rosette leaves at the base.
    for (const [dir, len] of [[-1, 26], [1, 24], [-1, 16], [1, 18]]) {
      for (let i = 0; i < len; i++) {
        const x = 32 + dir * i,
          y = 106 - Math.round(Math.sin((i / len) * Math.PI) * (len / 5)) - Math.floor(i / 6);
        const thick = Math.max(1, 3 - Math.floor(i / 9)) + (i % 5 === 2 ? 1 : 0);
        px(x, y - thick, 1, thick, i % 2 ? "#7fae55" : "#93c264");
        px(x, y - thick - 1, 1, 1, "#c4e08f");
        px(x, y, 1, 1, "#2c4a2e");
      }
    }
  };
  put("dandelion-bud", 64, 112, (px) => {
    stem(px);
    for (let a = 0; a < 24; a++) {
      const ang = (a / 24) * Math.PI * 2,
        r = 9 + (a % 2) * 2;
      for (let s = 0; s < r; s++)
        px(32 + Math.cos(ang) * s, 26 + Math.sin(ang) * s * 0.9, 2, 2, s > r - 3 ? "#f2c23c" : "#f7d659");
    }
    px(28, 22, 8, 8, "#e9a923");
    px(30, 24, 4, 3, "#ffe68a");
    px(26, 33, 12, 3, "#3f6b35");
  });
  put("dandelion", 64, 112, (px) => {
    stem(px);
    // Seed head: radiating pappus filaments with bright tips.
    for (let a = 0; a < 46; a++) {
      const ang = (a / 46) * Math.PI * 2 + (a % 3) * 0.05,
        r = 17 + (a % 4);
      for (let s = 4; s < r; s += 1.5)
        px(32 + Math.cos(ang) * s, 24 + Math.sin(ang) * s, 1, 1, s > r - 4 ? "#ffffff" : "#d9ddc9");
      px(32 + Math.cos(ang) * r - 1, 24 + Math.sin(ang) * r - 1, 2, 2, "#fbfbf1");
    }
    px(29, 21, 6, 6, "#8f7a4a");
    px(30, 22, 3, 2, "#b59c5e");
  });
  put("travel-seed", 32, 44, (px) => {
    for (let a = 0; a < 15; a++) {
      const ang = Math.PI + (a / 14) * Math.PI;
      for (let s = 2; s < 13; s++) px(16 + Math.cos(ang) * s, 12 + Math.sin(ang) * s * 0.7, 1, 1, s > 10 ? "#ffffff" : "#e6e7da");
    }
    for (let y = 12; y < 34; y++) px(16, y, 1, 1, "#d8d2b8");
    px(15, 34, 3, 7, "#8a6b3f");
    px(16, 35, 1, 4, "#b08850");
  });
  put("fluff", 6, 6, (px) => {
    px(2, 0, 2, 6, "#ffffff");
    px(0, 2, 6, 2, "#ffffff");
    px(1, 1, 4, 4, "#f4f2e4");
  });
}
