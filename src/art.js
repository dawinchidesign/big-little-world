// Runtime environment primitives supplement the generated, packed visual atlas.
// Character/insect/platform aliases are resolved by visuals.js; never duplicate
// their GPU textures with the original procedural fallback sprites.
import { SPECIES, BIOMES } from "./content.js";
import { visualEntry, materialCanvas } from "./visuals.js";
import { drawTerrain } from "./terrain.js";
export function rng(seed) {
  let n = seed >>> 0;
  return () => {
    n = (Math.imul(n, 1664525) + 1013904223) >>> 0;
    return n / 4294967296;
  };
}
export function canvas(w, h) {
  const c = document.createElement("canvas");
  c.width = w;
  c.height = h;
  return [c, c.getContext("2d")];
}
const poly = (c, pts, col) => {
  c.fillStyle = col;
  c.beginPath();
  pts.forEach(([x, y], i) => (i ? c.lineTo(x, y) : c.moveTo(x, y)));
  c.closePath();
  c.fill();
};
const rect = (c, x, y, w, h, col) => {
  c.fillStyle = col;
  c.fillRect(Math.round(x), Math.round(y), w, h);
};
const ellipse = (c, x, y, rx, ry, col) => {
  c.fillStyle = col;
  c.beginPath();
  c.ellipse(x, y, rx, ry, 0, 0, Math.PI * 2);
  c.fill();
};
function pixelEllipse(c, x, y, rx, ry, col) {
  for (let j = -ry; j <= ry; j++) {
    const half = Math.round(
      rx * Math.sqrt(Math.max(0, 1 - (j * j) / (ry * ry))),
    );
    rect(c, x - half, y + j, half * 2 + 1, 1, col);
  }
}
function line(c, x, y, xx, yy, col, w = 1) {
  c.strokeStyle = col;
  c.lineWidth = w;
  c.beginPath();
  c.moveTo(x, y);
  c.lineTo(xx, yy);
  c.stroke();
}
function leaf(c, x, y, s = 1, col = "#53875a", flip = 1) {
  c.save();
  c.translate(x, y);
  c.scale(s * flip, s);
  poly(
    c,
    [
      [0, 0],
      [-18, -9],
      [-31, -29],
      [-26, -36],
      [-12, -30],
      [5, -16],
      [0, 0],
    ],
    "#193f37",
  );
  poly(
    c,
    [
      [0, -2],
      [-17, -12],
      [-28, -29],
      [-23, -33],
      [-10, -27],
      [2, -15],
    ],
    col,
  );
  line(c, -1, -3, -25, -30, "#9eb76b");
  for (let j = 1; j < 4; j++) {
    line(c, -j * 6, -j * 7, -j * 6 - 6, -j * 7 + 1, "#385f46");
  }
  c.restore();
}
export function drawHero(c, frame = 0, dir = 0, pose = "walk") {
  const step =
    pose === "idle" ? 0 : Math.round(Math.sin((frame * Math.PI) / 4) * 2);
  const back = dir === 3,
    side = dir === 1 || dir === 2;
  c.save();
  if (pose === "idle" && (frame === 1 || frame === 2)) c.translate(0, -1);
  if (dir === 2) {
    c.translate(24, 0);
    c.scale(-1, 1);
  }
  rect(c, 7, 24 + step, 4, 6, "#283c43");
  rect(c, 14, 24 - step, 4, 6, "#314650");
  rect(c, 5, 29 + step, 7, 3, "#172a30");
  rect(c, 14, 29 - step, 7, 3, "#172a30");
  poly(
    c,
    [
      [7, 11],
      [17, 11],
      [21, 26],
      [4, 26],
    ],
    "#6b512d",
  );
  poly(
    c,
    [
      [8, 11],
      [17, 12],
      [19, 25],
      [6, 25],
    ],
    "#e7e3c8",
  );
  rect(c, 7, 14, 11, 2, "#f3efd9");
  if (pose === "climb") {
    rect(c, 4, 8 - step, 3, 9, "#c5cebe");
    rect(c, 18, 8 + step, 3, 9, "#dce3cf");
    rect(c, 5, 5 - step, 3, 4, "#d3a276");
    rect(c, 17, 5 + step, 3, 4, "#edbe8a");
  } else if (pose === "glide") {
    rect(c, 0, 15 - step, 8, 3, "#c5cebe");
    rect(c, 17, 15 + step, 7, 3, "#dce3cf");
    rect(c, 0, 12 - step, 3, 4, "#d3a276");
    rect(c, 21, 12 + step, 3, 4, "#edbe8a");
  } else {
    rect(c, 4, 15 - step, 3, 9, "#c5cebe");
    rect(c, 18, 15 + step, 3, 9, "#dce3cf");
    rect(c, 4, 23 - step, 3, 3, "#d3a276");
    rect(c, 18, 23 + step, 3, 3, "#edbe8a");
  }
  if (back) {
    rect(c, 7, 13, 11, 12, "#263d68");
    rect(c, 8, 14, 9, 9, "#3d6089");
    rect(c, 11, 16, 3, 2, "#c4ac60");
    rect(c, 8, 23, 9, 3, "#334a72");
  } else if (side) {
    rect(c, 5, 13, 5, 12, "#29446d");
    rect(c, 5, 15, 3, 7, "#48658b");
  } else {
    rect(c, 7, 12, 1, 12, "#465d46");
    rect(c, 16, 12, 1, 12, "#465d46");
    rect(c, 12, 18, 2, 4, "#fbdd84");
  }
  rect(c, 8, 4, 10, 8, "#ad7e59");
  rect(c, 9, 4, 8, 7, "#e6b67c");
  rect(c, 7, 2, 11, 4, "#493c31");
  rect(c, 6, 4, 4, 4, "#554131");
  rect(c, 14, 1, 4, 4, "#493c31");
  rect(c, 9, 2, 4, 1, "#79604a");
  if (!back) {
    rect(c, side ? 16 : 10, 7, 1, 2, "#2a3236");
    if (!side) rect(c, 15, 7, 1, 2, "#2a3236");
  } else rect(c, 8, 4, 10, 6, "#554131");
  c.restore();
}
export function drawInsect(c, id, frame = 0) {
  let step = frame % 2;
  const legs = (n = 3, wide = 12) => {
    for (let i = 0; i < n; i++) {
      let y = 16 + i * 7;
      const lift = [-1, 1, 2, 0][(frame + i) % 4];
      line(c, 29, y, 24 - wide, y - 3 + lift, "#182e31", 2);
      line(c, 24 - wide, y - 3 + lift, 21 - wide, y + 4 - lift, "#182e31", 1);
      line(c, 35, y, 40 + wide, y - 3 - lift, "#182e31", 2);
      line(c, 40 + wide, y - 3 - lift, 42 + wide, y + 4 + lift, "#182e31", 1);
    }
  };
  const wings = (col = "#c6e4d4", wide = 18) => {
    const spread = [1, 0.72, 0.26, 0.72][frame % 4];
    pixelEllipse(
      c,
      32 - wide / 2,
      21,
      Math.max(2, Math.round((wide / 2 + 4) * spread)),
      [9, 6, 3, 6][frame % 4],
      col,
    );
    pixelEllipse(
      c,
      32 + wide / 2,
      21,
      Math.max(2, Math.round((wide / 2 + 4) * spread)),
      [9, 6, 3, 6][frame % 4],
      col,
    );
  };
  if (id === "daphnia") {
    pixelEllipse(c, 33, 28, 13, 16, "#9dd4c0");
    pixelEllipse(c, 33, 28, 10, 13, "#709d99");
    pixelEllipse(c, 35, 25, 5, 9, "#b5ce9f");
    rect(c, 34, 13, 3, 3, "#243b40");
    line(c, 29, 15, 14, 3, "#b7dbba", 2);
    line(c, 37, 14, 52, 3, "#b7dbba", 2);
    for (let i = 0; i < 5; i++)
      line(c, 26, 23 + i * 3, 20 - step * 2, 26 + i * 3, "#cfdfba");
  } else if (id === "pondsnail") {
    pixelEllipse(c, 31, 37, 22, 5, "#9caa7d");
    pixelEllipse(c, 31, 25, 14, 14, "#b8a56e");
    pixelEllipse(c, 31, 25, 10, 10, "#786d47");
    pixelEllipse(c, 31, 25, 6, 6, "#c7b882");
    pixelEllipse(c, 31, 25, 2, 2, "#6f7049");
    line(c, 48, 35, 50, 24, "#aab88f", 2);
    line(c, 53, 36, 58, 26, "#aab88f", 2);
  } else if (["dragonflylarva", "mayflynymph", "caddisfly"].includes(id)) {
    legs(3, 9);
    pixelEllipse(c, 32, 30, 8, 13, id === "caddisfly" ? "#93876b" : "#678a6a");
    pixelEllipse(c, 32, 13, 7, 6, "#7ca884");
    rect(c, 27, 11, 2, 2, "#1c3a3e");
    rect(c, 36, 11, 2, 2, "#1c3a3e");
    for (let i = 0; i < 4; i++)
      line(c, 26, 23 + i * 4, 38, 23 + i * 4, "#a1b88b");
    if (id === "mayflynymph") {
      for (let i = -1; i < 2; i++)
        line(c, 32 + i * 3, 40, 32 + i * 9, 48, "#b0c49e");
    }
    if (id === "caddisfly")
      for (let i = 0; i < 12; i++)
        rect(
          c,
          26 + ((i * 3) % 10),
          22 + ((i * 7) % 20),
          3,
          3,
          i % 2 ? "#bdb08a" : "#63755f",
        );
  } else if (
    ["ladybird", "beetle", "waterbeetle", "firefly", "woodlouse"].includes(id)
  ) {
    legs(id === "woodlouse" ? 4 : 3, 8);
    let col = {
      ladybird: "#bd4338",
      beetle: "#405a55",
      waterbeetle: "#304952",
      firefly: "#46473a",
      woodlouse: "#778179",
    }[id];
    pixelEllipse(c, 32, 26, 13, 15, "#172c2c");
    pixelEllipse(c, 32, 25, 11, 13, col);
    pixelEllipse(c, 32, 11, 8, 6, "#1c3032");
    rect(c, 26, 10, 2, 2, "#d6e3bf");
    rect(c, 36, 10, 2, 2, "#d6e3bf");
    line(c, 32, 14, 32, 38, "#253033");
    rect(c, 24, 19, 2, 10, id === "ladybird" ? "#e16945" : "#698278");
    if (id === "ladybird")
      [
        [27, 19],
        [37, 19],
        [24, 26],
        [40, 26],
        [27, 33],
        [37, 33],
        [32, 16],
      ].forEach(([x, y]) => pixelEllipse(c, x, y, 2, 2, "#263236"));
    if (id === "firefly")
      pixelEllipse(c, 32, 35, 7, 4, frame % 3 ? "#e1e884" : "#8b9e65");
    if (id === "woodlouse")
      for (let i = 0; i < 5; i++)
        line(c, 23, 19 + i * 4, 41, 19 + i * 4, "#495957");
  } else if (id === "ant") {
    legs(3, 5);
    pixelEllipse(c, 32, 32, 7, 9, "#342f28");
    pixelEllipse(c, 32, 21, 4, 5, "#634331");
    pixelEllipse(c, 32, 11, 6, 6, "#3a3028");
    rect(c, 29, 9, 1, 2, "#d4bc8b");
    line(c, 28, 8, 24, 3, "#332e28");
    line(c, 36, 8, 40, 3, "#332e28");
    rect(c, 28, 28, 3, 3, "#7f5e42");
  } else if (["butterfly", "moth"].includes(id)) {
    let w = [20, 14, 6, 14][frame % 4];
    poly(
      c,
      [
        [30, 20],
        [32 - w, 7],
        [26 - w, 12],
        [30 - w, 29],
        [30, 27],
      ],
      id === "butterfly" ? "#d9a35e" : "#c0bb9e",
    );
    poly(
      c,
      [
        [34, 20],
        [32 + w, 7],
        [38 + w, 12],
        [34 + w, 29],
        [34, 27],
      ],
      id === "butterfly" ? "#e5b675" : "#b1b49f",
    );
    poly(
      c,
      [
        [30, 24],
        [32 - w, 28],
        [29 - w, 38],
        [30, 33],
      ],
      id === "butterfly" ? "#bd7056" : "#8e9b93",
    );
    poly(
      c,
      [
        [34, 24],
        [32 + w, 28],
        [35 + w, 38],
        [34, 33],
      ],
      id === "butterfly" ? "#c8885d" : "#92a39b",
    );
    for (let i = 0; i < 3; i++) {
      rect(c, 32 - w + 4 + i * 3, 14 + i * 5, 2, 2, "#403d39");
      rect(c, 32 + w - 5 - i * 3, 14 + i * 5, 2, 2, "#403d39");
    }
    rect(c, 31, 14, 3, 20, "#283b38");
    line(c, 31, 15, 28, 10, "#273b38");
    line(c, 34, 15, 37, 10, "#273b38");
  } else if (["bee", "bumblebee", "wasp"].includes(id)) {
    legs(3, 4);
    wings("#afcfc1", 16);
    pixelEllipse(c, 32, 27, id === "bumblebee" ? 10 : 7, 12, "#ddb85b");
    for (let y = 19; y < 37; y += 6) rect(c, 25, y, 14, 3, "#3f4031");
    pixelEllipse(c, 32, 13, 6, 6, "#35423b");
    rect(c, 29, 11, 2, 2, "#b6d9b9");
    if (id === "bumblebee") {
      rect(c, 22, 20, 3, 11, "#e1bd70");
      rect(c, 39, 20, 3, 10, "#9f853e");
    }
  } else if (["dragonfly", "mosquito", "strider"].includes(id)) {
    if (id !== "strider") {
      wings("#b4d9d1", id === "dragonfly" ? 28 : 13);
      c.save();
      c.translate(0, 8);
      wings("#9cbeb9", id === "dragonfly" ? 22 : 9);
      c.restore();
    }
    legs(3, id === "strider" ? 20 : 8);
    rect(c, 30, 16, 4, 26, id === "dragonfly" ? "#588e98" : "#5e6c5c");
    pixelEllipse(c, 32, 13, 6, 5, "#4d7273");
    rect(c, 27, 11, 3, 3, "#c1ddbc");
    rect(c, 34, 11, 3, 3, "#99c5ac");
  } else if (["grasshopper", "cricket", "mantis"].includes(id)) {
    legs(3, 8);
    let col = id === "cricket" ? "#797153" : "#7c9a55";
    pixelEllipse(c, 32, 29, 6, 12, col);
    pixelEllipse(c, 32, 14, 7, 5, col);
    rect(c, 27, 12, 2, 2, "#172e2f");
    rect(c, 35, 12, 2, 2, "#172e2f");
    line(c, 28, 11, 20, 1, "#343f32");
    line(c, 35, 11, 43, 1, "#343f32");
    line(c, 28, 27, 16, 19, col, 3);
    line(c, 16, 19, 21, 40, col, 2);
    line(c, 36, 27, 47, 20, col, 3);
    line(c, 47, 20, 42, 40, col, 2);
    if (id === "mantis") {
      line(c, 29, 18, 17, 10, col, 3);
      line(c, 35, 18, 47, 10, col, 3);
    }
  } else if (id === "spider") {
    legs(4, 13);
    pixelEllipse(c, 32, 30, 9, 10, "#886e51");
    pixelEllipse(c, 32, 19, 6, 7, "#4f5040");
    rect(c, 31, 25, 2, 11, "#d4c294");
    rect(c, 28, 29, 8, 2, "#d4c294");
  } else if (id === "caterpillar") {
    for (let i = 0; i < 7; i++) {
      pixelEllipse(
        c,
        32 + Math.sin(i + frame) * 2,
        10 + i * 4,
        7,
        5,
        i % 2 ? "#77914e" : "#9daf62",
      );
      rect(c, 23, 10 + i * 4, 3, 1, "#354834");
      rect(c, 39, 10 + i * 4, 3, 1, "#354834");
    }
    rect(c, 29, 8, 2, 2, "#223c35");
    rect(c, 35, 8, 2, 2, "#223c35");
  } else {
    legs(3, 3);
    pixelEllipse(c, 32, 26, 5, 10, "#b9ad8b");
    pixelEllipse(c, 32, 14, 5, 5, "#83785f");
  }
}
export function createTextures(scene) {
  const put = (key, w, h, fn) => {
    if (visualEntry(key)) return;
    const [c, g] = canvas(w, h);
    g.imageSmoothingEnabled = false;
    fn(g);
    scene.textures.addCanvas(key, c);
  };
  for (let d = 0; d < 4; d++)
    for (let f = 0; f < 8; f++)
      put(`hero${d}-${f}`, 24, 34, (c) => drawHero(c, f, d));
  for (let d = 0; d < 4; d++)
    for (let f = 0; f < 4; f++)
      put(`hero-idle${d}-${f}`, 24, 34, (c) => drawHero(c, f, d, "idle"));
  for (let f = 0; f < 4; f++) {
    put("hero-climb" + f, 24, 34, (c) => drawHero(c, f * 2, 3, "climb"));
    put("hero-glide" + f, 24, 34, (c) => drawHero(c, f * 2, 0, "glide"));
  }
  put("canopy-leaf", 164, 72, (c) => {
    poly(
      c,
      [
        [2, 40],
        [24, 11],
        [92, 0],
        [162, 28],
        [146, 57],
        [80, 69],
        [20, 61],
      ],
      "#254c3b",
    );
    poly(
      c,
      [
        [7, 38],
        [26, 15],
        [92, 5],
        [155, 28],
        [141, 53],
        [80, 63],
        [23, 56],
      ],
      "#739b57",
    );
    poly(
      c,
      [
        [10, 36],
        [28, 17],
        [92, 8],
        [150, 28],
        [80, 31],
      ],
      "#96b96a",
    );
    line(c, 9, 39, 151, 28, "#c5d68b", 2);
    for (let i = 0; i < 7; i++) {
      const x = 29 + i * 17,
        y = 38 - i * 1.4;
      line(c, x, y, x + 6, 15 - Math.sin(i) * 6, "#507a48");
      line(c, x, y, x + 3, 55 - Math.sin(i) * 5, "#426f44");
    }
    for (let i = 0; i < 26; i++)
      rect(
        c,
        25 + ((i * 23) % 110),
        19 + ((i * 17) % 31),
        2,
        1,
        i % 2 ? "#b4c67d" : "#5f8a4e",
      );
  });
  put("pupa", 40, 68, (c) => {
    line(c, 20, 0, 20, 11, "#b2bc80", 2);
    poly(
      c,
      [
        [20, 8],
        [30, 18],
        [31, 39],
        [26, 55],
        [20, 64],
        [12, 55],
        [8, 35],
        [11, 19],
      ],
      "#507c50",
    );
    poly(
      c,
      [
        [20, 12],
        [27, 21],
        [26, 45],
        [20, 59],
        [15, 48],
        [12, 29],
      ],
      "#92ad68",
    );
    line(c, 19, 19, 19, 52, "#c8ce8c");
    for (let i = 0; i < 4; i++)
      rect(c, 12 + i * 4, 24 + (i % 2), 2, 2, "#e3ca7b");
  });
  for (const s of SPECIES)
    for (let f = 0; f < 4; f++)
      put(`${s.id}${f}`, 64, 48, (c) => drawInsect(c, s.id, f));
  put("shadow", 64, 20, (c) => {
    pixelEllipse(c, 32, 10, 28, 7, "#132f2b");
  });
  put("grass", 80, 180, (c) => {
    const r = rng(61);
    for (let i = 0; i < 12; i++) {
      let x = 12 + r() * 60,
        h = 65 + r() * 100;
      poly(
        c,
        [
          [x, 179],
          [x - 3, 179 - h * 0.5],
          [x + (r() - 0.5) * 45, 179 - h],
          [x + 7, 179 - h * 0.4],
          [x + 5, 179],
        ],
        i % 2 ? "#346746" : "#2a573f",
      );
      line(c, x + 2, 178, x + 1, 179 - h * 0.72, "#537f4b");
    }
    leaf(c, 48, 155, 1.4, "#4c7f50");
  });
  put("fern", 128, 150, (c) => {
    line(c, 64, 148, 51, 12, "#76985a", 3);
    for (let i = 0; i < 8; i++) {
      let y = 140 - i * 15,
        s = (8 - i) / 9;
      leaf(c, 62 - i * 1.3, y, s, "#4e8259");
      leaf(c, 64 - i * 1.3, y - 4, s, "#3e714e", -1);
    }
  });
  put("leaf", 110, 64, (c) => {
    poly(
      c,
      [
        [2, 44],
        [20, 15],
        [61, 2],
        [105, 15],
        [92, 43],
        [46, 59],
      ],
      "#1e493e",
    );
    poly(
      c,
      [
        [7, 42],
        [23, 19],
        [62, 6],
        [99, 17],
        [88, 39],
        [46, 54],
      ],
      "#6b995a",
    );
    line(c, 5, 44, 98, 17, "#c1c576", 2);
    for (let i = 0; i < 5; i++) {
      line(c, 24 + i * 13, 38 - i * 4, 29 + i * 13, 19 - i * 2, "#3d734c");
      line(c, 24 + i * 13, 38 - i * 4, 41 + i * 10, 48 - i * 5, "#3d734c");
    }
  });
  for (const [key, petal] of [
    ["flower", "#e6e4ba"],
    ["pinkflower", "#d4a0a0"],
    ["blueflower", "#9cb5ca"],
  ])
    put(key, 112, 176, (c) => {
      line(c, 55, 174, 55, 54, "#365e3a", 6);
      line(c, 53, 174, 53, 55, "#7a9e5a", 2);
      leaf(c, 55, 145, 1.2, "#598751");
      leaf(c, 56, 123, 0.9, "#6b995a", -1);
      for (let i = 0; i < 10; i++) {
        const a = (i * Math.PI) / 5;
        let x = 55 + Math.cos(a) * 23,
          y = 40 + Math.sin(a) * 19;
        pixelEllipse(c, x, y, 16, 10, "#626e4d");
        pixelEllipse(c, x, y - 3, 14, 9, petal);
      }
      pixelEllipse(c, 55, 39, 16, 13, "#b28e42");
      pixelEllipse(c, 53, 35, 13, 8, "#e1c866");
      for (let i = 0; i < 20; i++)
        rect(c, 44 + ((i * 7) % 22), 30 + ((i * 3) % 11), 2, 2, "#f3df8a");
    });
  put("mushroom", 112, 128, (c) => {
    rect(c, 49, 55, 16, 66, "#929b7c");
    rect(c, 52, 57, 5, 61, "#bbc9a3");
    poly(
      c,
      [
        [6, 57],
        [14, 35],
        [35, 15],
        [59, 9],
        [82, 23],
        [103, 49],
        [105, 59],
        [84, 70],
        [31, 72],
      ],
      "#345c5b",
    );
    poly(
      c,
      [
        [9, 51],
        [22, 31],
        [48, 14],
        [65, 14],
        [88, 32],
        [101, 52],
        [83, 61],
        [34, 63],
      ],
      "#78a7a0",
    );
    for (let i = 0; i < 12; i++)
      rect(c, 23 + ((i * 17) % 64), 27 + ((i * 9) % 26), 5, 3, "#a2c8b0");
    line(c, 18, 61, 95, 61, "#b9cfac", 2);
  });
  put("rock", 100, 62, (c) => {
    poly(
      c,
      [
        [2, 48],
        [13, 20],
        [32, 7],
        [68, 6],
        [91, 29],
        [96, 50],
        [69, 60],
        [20, 58],
      ],
      "#2a4941",
    );
    poly(
      c,
      [
        [5, 45],
        [17, 23],
        [34, 10],
        [66, 9],
        [84, 29],
        [72, 47],
        [26, 52],
      ],
      "#647b64",
    );
    poly(
      c,
      [
        [17, 24],
        [34, 10],
        [66, 9],
        [58, 24],
        [29, 32],
      ],
      "#91a080",
    );
    rect(c, 36, 15, 10, 2, "#b1b394");
    for (let i = 0; i < 12; i++)
      rect(c, 16 + ((i * 17) % 60), 39 + ((i * 7) % 12), 4, 2, "#3e5c45");
  });
  put("log", 240, 130, (c) => {
    poly(
      c,
      [
        [10, 70],
        [20, 26],
        [210, 10],
        [234, 42],
        [223, 95],
        [35, 119],
      ],
      "#303a2d",
    );
    poly(
      c,
      [
        [15, 64],
        [23, 30],
        [207, 15],
        [218, 38],
        [209, 82],
        [38, 108],
      ],
      "#61583d",
    );
    for (let i = 0; i < 12; i++)
      line(
        c,
        29,
        35 + i * 6,
        210,
        21 + i * 5,
        i % 2 ? "#817147" : "#414b35",
        2,
      );
    pixelEllipse(c, 31, 76, 22, 43, "#302f27");
    pixelEllipse(c, 31, 76, 16, 35, "#8b7850");
    pixelEllipse(c, 31, 76, 10, 28, "#514b33");
    pixelEllipse(c, 31, 76, 5, 19, "#b39961");
    leaf(c, 131, 34, 0.7, "#4e8358");
  });
  put("tree", 250, 320, (c) => {
    poly(
      c,
      [
        [70, 320],
        [85, 272],
        [101, 68],
        [169, 51],
        [170, 262],
        [205, 311],
        [143, 303],
        [120, 320],
      ],
      "#303e31",
    );
    poly(
      c,
      [
        [89, 302],
        [110, 100],
        [144, 73],
        [156, 268],
        [180, 299],
        [132, 288],
      ],
      "#665d40",
    );
    for (let i = 0; i < 8; i++)
      line(
        c,
        113 + i * 5,
        105,
        106 + i * 6,
        285,
        i % 2 ? "#8c7e4e" : "#3e4733",
        2,
      );
    for (let i = 0; i < 20; i++) {
      const a = i * 2.4,
        r = 35 + 30 * (i % 3);
      pixelEllipse(
        c,
        125 + Math.cos(a) * r,
        57 + Math.sin(a) * r * 0.5,
        45,
        25,
        i % 3 ? "#3c6749" : "#577d4c",
      );
    }
    leaf(c, 100, 274, 2, "#52754b");
  });
  put("plastic", 140, 90, (c) => {
    poly(
      c,
      [
        [7, 24],
        [104, 5],
        [133, 31],
        [121, 73],
        [42, 83],
        [11, 61],
      ],
      "#637e7a",
    );
    poly(
      c,
      [
        [12, 26],
        [103, 10],
        [126, 32],
        [116, 66],
        [43, 76],
        [16, 58],
      ],
      "#9eb6a8",
    );
    poly(
      c,
      [
        [18, 31],
        [107, 18],
        [116, 42],
        [45, 63],
      ],
      "#b6c9b4",
    );
    line(c, 24, 37, 107, 23, "#e3e7c8", 3);
    poly(
      c,
      [
        [47, 38],
        [82, 29],
        [95, 50],
        [58, 63],
      ],
      "#b76e60",
    );
    line(c, 5, 24, 132, 31, "#6c8981");
  });
  put("bottle", 180, 220, (c) => {
    rect(c, 71, 3, 43, 25, "#536e74");
    rect(c, 76, 8, 33, 14, "#8eaab1");
    poly(
      c,
      [
        [73, 25],
        [117, 25],
        [122, 59],
        [151, 84],
        [157, 188],
        [135, 211],
        [50, 211],
        [27, 188],
        [35, 84],
        [66, 58],
      ],
      "#8ba5a0",
    );
    poly(
      c,
      [
        [77, 30],
        [111, 30],
        [113, 66],
        [139, 89],
        [143, 186],
        [131, 199],
        [58, 199],
        [42, 183],
        [48, 91],
        [76, 67],
      ],
      "#b0c8b5",
    );
    rect(c, 46, 110, 95, 51, "#729c9b");
    rect(c, 53, 116, 79, 38, "#d0d3b3");
    for (let i = 0; i < 6; i++)
      line(c, 53, 95 + i * 17, 132, 95 + i * 17, "#90b1a2", 2);
    rect(c, 51, 83, 5, 99, "#d2dfc3");
  });
  put("cap", 120, 60, (c) => {
    pixelEllipse(c, 60, 35, 55, 22, "#2b585a");
    rect(c, 6, 23, 107, 14, "#527f7b");
    pixelEllipse(c, 60, 23, 54, 18, "#80b0a3");
    pixelEllipse(c, 60, 22, 43, 12, "#4b7a73");
    for (let i = 0; i < 12; i++) rect(c, 9 + i * 9, 34, 3, 13, "#355f5b");
  });
  put("dew", 36, 45, (c) => {
    poly(
      c,
      [
        [18, 0],
        [29, 19],
        [32, 31],
        [25, 41],
        [11, 43],
        [3, 33],
        [5, 21],
      ],
      "#508b96",
    );
    poly(
      c,
      [
        [18, 5],
        [26, 22],
        [26, 31],
        [19, 36],
        [9, 31],
        [11, 21],
      ],
      "#9acbc5",
    );
    rect(c, 10, 23, 3, 9, "#e4f5d6");
    rect(c, 14, 18, 2, 4, "#c2ead5");
  });
  put("twig", 96, 30, (c) => {
    poly(
      c,
      [
        [3, 20],
        [90, 4],
        [94, 12],
        [8, 28],
      ],
      "#594c33",
    );
    line(c, 9, 20, 91, 7, "#b29b64", 3);
    line(c, 51, 13, 41, 1, "#806e43", 3);
  });
  put("sprout", 60, 70, (c) => {
    line(c, 30, 69, 31, 21, "#6f9451", 3);
    leaf(c, 31, 48, 0.8, "#99b76d");
    leaf(c, 31, 30, 0.7, "#8db164", -1);
  });
  put("bridge", 180, 70, (c) => {
    for (let i = 0; i < 8; i++) {
      poly(
        c,
        [
          [4 + i * 21, 21],
          [22 + i * 21, 17],
          [25 + i * 21, 57],
          [8 + i * 21, 62],
        ],
        "#8c7a4d",
      );
      line(c, 10 + i * 21, 25, 14 + i * 21, 54, "#c3aa6b", 2);
    }
    line(c, 0, 25, 180, 17, "#4e5435", 3);
    line(c, 0, 55, 180, 50, "#4e5435", 3);
  });
  put("brood", 120, 85, (c) => {
    pixelEllipse(c, 60, 45, 55, 33, "#3e342c");
    for (let i = 0; i < 12; i++) {
      let x = 24 + ((i * 7) % 80),
        y = 24 + ((i * 11) % 40);
      pixelEllipse(c, x, y, 5, 8, "#c4b58b");
      rect(c, x - 2, y - 3, 2, 5, "#e9dbac");
    }
  });
  put("gate", 160, 120, (c) => {
    pixelEllipse(c, 80, 70, 74, 45, "#6b6946");
    pixelEllipse(c, 80, 77, 49, 35, "#2b302b");
    pixelEllipse(c, 80, 83, 38, 26, "#152725");
    for (let i = 0; i < 18; i++)
      rect(c, 22 + ((i * 17) % 112), 30 + ((i * 7) % 30), 5, 3, "#91905c");
  });
  put("mycelium", 130, 80, (c) => {
    const r = rng(33);
    for (let i = 0; i < 40; i++) {
      let x = 65,
        y = 40;
      for (let j = 0; j < 4; j++) {
        let xx = x + (r() - 0.5) * 50,
          yy = y + (r() - 0.5) * 25;
        line(c, x, y, xx, yy, i % 3 ? "#8bbab0" : "#c7d4b9");
        x = xx;
        y = yy;
      }
    }
  });
  put("lamp", 80, 190, (c) => {
    rect(c, 36, 22, 10, 163, "#445b59");
    rect(c, 37, 24, 3, 159, "#839b82");
    poly(
      c,
      [
        [18, 27],
        [22, 3],
        [59, 3],
        [65, 27],
      ],
      "#404f4c",
    );
    rect(c, 25, 8, 33, 17, "#e8d9a2");
    rect(c, 27, 11, 27, 11, "#fff2bb");
  });
  put("reed", 80, 140, (c) => {
    for (let i = 0; i < 5; i++) {
      let x = 16 + i * 11;
      line(c, x, 138, x - 3, 20 + i * 8, "#84955e", 3);
      rect(c, x - 6, 7 + i * 8, 6, 25, "#aa8c57");
      leaf(c, x, 112, 0.6, "#6f965d", i % 2 ? 1 : -1);
    }
  });
  put("pipe", 160, 100, (c) => {
    rect(c, 0, 12, 110, 69, "#6b7c72");
    rect(c, 0, 16, 110, 7, "#a4b3a0");
    pixelEllipse(c, 110, 47, 38, 39, "#afbc9e");
    pixelEllipse(c, 110, 47, 28, 30, "#405d52");
    pixelEllipse(c, 110, 47, 20, 23, "#253f37");
  });
  put("sample", 50, 60, (c) => {
    rect(c, 17, 7, 17, 4, "#e1d1a0");
    rect(c, 18, 12, 15, 37, "#8db8a9");
    rect(c, 21, 27, 9, 19, "#7b9f70");
    rect(c, 20, 14, 2, 27, "#d2e7c7");
  });
  put("toxic", 70, 80, (c) => {
    line(c, 35, 79, 35, 35, "#627444", 4);
    for (let i = 0; i < 6; i++) {
      let a = (i * Math.PI) / 3;
      pixelEllipse(
        c,
        35 + Math.cos(a) * 16,
        27 + Math.sin(a) * 11,
        9,
        9,
        "#a8a969",
      );
    }
    pixelEllipse(c, 35, 27, 9, 8, "#6e6948");
    for (let i = 0; i < 5; i++)
      rect(c, 19 + i * 7, 30 - (i % 2) * 10, 2, 4, "#9fd5a1");
  });
  put("sign", 60, 80, (c) => {
    rect(c, 28, 26, 6, 53, "#665f42");
    poly(
      c,
      [
        [0, 9],
        [44, 9],
        [59, 22],
        [44, 35],
        [0, 35],
      ],
      "#bba573",
    );
    rect(c, 8, 17, 31, 3, "#6a7250");
  });
  put("egg", 64, 55, (c) => {
    leaf(c, 54, 51, 1.5, "#71955c");
    for (let i = 0; i < 9; i++)
      pixelEllipse(
        c,
        23 + (i % 3) * 6,
        26 + Math.floor(i / 3) * 7,
        2,
        3,
        "#dfd5a3",
      );
  });
  put("web", 130, 130, (c) => {
    for (let i = 0; i < 12; i++) {
      const a = (i * Math.PI) / 6;
      line(c, 65, 65, 65 + Math.cos(a) * 63, 65 + Math.sin(a) * 63, "#a1c2b0");
    }
    for (let r = 13; r < 65; r += 13) {
      c.strokeStyle = "#90b3a5";
      c.beginPath();
      for (let i = 0; i <= 12; i++) {
        const a = (i * Math.PI) / 6;
        const x = 65 + Math.cos(a) * r,
          y = 65 + Math.sin(a) * r;
        i ? c.lineTo(x, y) : c.moveTo(x, y);
      }
      c.stroke();
    }
  });
  put("shell", 70, 60, (c) => {
    pixelEllipse(c, 35, 32, 30, 23, "#b5a17c");
    for (let i = 0; i < 3; i++) {
      c.strokeStyle = ["#695e47", "#897557", "#e0c99b"][i];
      c.lineWidth = 3;
      c.beginPath();
      c.arc(33, 30, 20 - i * 6, 0, Math.PI * 1.8);
      c.stroke();
    }
    pixelEllipse(c, 53, 44, 12, 10, "#343e32");
  });
  put("light", 128, 128, (c) => {
    const g = c.createRadialGradient(64, 64, 0, 64, 64, 64);
    g.addColorStop(0, "#ffffbdcc");
    g.addColorStop(0.25, "#f5e9a955");
    g.addColorStop(1, "#d4e8ae00");
    c.fillStyle = g;
    c.fillRect(0, 0, 128, 128);
  });
  for (const b of BIOMES)
    put("ground" + b.id, 800, 550, (c) => drawTerrain(c, b, materialCanvas(scene, b.id === 3 ? 'material-silt' : [1,5,6].includes(b.id) ? 'material-clay' : b.id === 4 ? 'material-humus' : 'material-moss')));
  put("room", 480, 270, (c) => drawRoom(c));
}
export function drawGround(c, b) {
  const r = rng(b.id + 81);
  rect(c, 0, 0, 400, 275, b.color);
  for (let i = 0; i < 12000; i++) {
    let x = r() * 400,
      y = r() * 275;
    rect(c, x, y, 1 + Math.floor(r() * 3), 1, r() > 0.45 ? b.dark : b.light);
  }
  c.globalAlpha = 0.2;
  for (let i = 0; i < 150; i++)
    pixelEllipse(
      c,
      r() * 400,
      r() * 275,
      10 + r() * 24,
      4 + r() * 13,
      i % 2 ? b.dark : b.light,
    );
  c.globalAlpha = 1;
  // cross-linked paths remain traversable at biome boundaries.
  c.lineCap = "round";
  c.lineJoin = "round";
  c.strokeStyle = b.id === 1 ? "#85704d" : b.id === 7 ? "#3f5554" : "#62734e";
  c.lineWidth = 16;
  c.beginPath();
  c.moveTo(0, 137);
  c.bezierCurveTo(110, 130, 150, 165, 210, 145);
  c.bezierCurveTo(270, 125, 315, 132, 400, 137);
  c.stroke();
  c.lineWidth = 12;
  c.beginPath();
  c.moveTo(200, 0);
  c.bezierCurveTo(195, 80, 210, 210, 200, 275);
  c.stroke();
  for (let i = 0; i < 1000; i++) {
    let x = r() * 400,
      y = 137 + Math.sin(x / 50) * 8 + (r() - 0.5) * 12;
    rect(c, x, y, r() * 3 + 1, 1, r() > 0.5 ? "#849062" : "#586c48");
  }
  if ([0, 2, 7, 8].includes(b.id)) {
    for (let i = 0; i < 500; i++) {
      const x = r() * 400,
        y = r() * 275;
      c.globalAlpha = 0.35;
      leaf(
        c,
        x,
        y,
        0.09 + r() * 0.07,
        i % 3 ? "#7d9e59" : "#b1b66b",
        i % 2 ? 1 : -1,
      );
    }
    c.globalAlpha = 1;
  }
  if (b.id === 1) {
    for (let i = 0; i < 15; i++) {
      let x = r() * 400,
        y = r() * 275;
      if (Math.abs(y - 140) < 37 || Math.abs(x - 200) < 30) continue;
      pixelEllipse(c, x, y, 26 + r() * 18, 17 + r() * 11, "#39362b");
      pixelEllipse(c, x, y - 3, 23 + r() * 11, 13 + r() * 10, "#594c35");
    }
    for (let i = 0; i < 60; i++) rect(c, r() * 400, r() * 275, 2, 2, "#a9905b");
  }
  if (b.id === 3) {
    pixelEllipse(c, 210, 174, 120, 66, "#244c50");
    pixelEllipse(c, 210, 170, 115, 61, "#38737a");
    pixelEllipse(c, 195, 159, 87, 42, "#497f7d");
    for (let i = 0; i < 100; i++) {
      let x = 100 + r() * 215,
        y = 125 + r() * 84;
      rect(c, x, y, 3 + r() * 8, 1, "#75aaa0");
    }
    rect(c, 184, 127, 15, 110, "#ad9d68");
    for (let i = 0; i < 22; i++) rect(c, 184, 129 + i * 4, 15, 1, "#7c7755");
  }
  if (b.id === 4) {
    for (let i = 0; i < 150; i++) {
      let x = r() * 400,
        y = r() * 275;
      line(c, 200, 137, x, y, i % 2 ? "#53695d" : "#729080");
    }
  }
  if (b.id === 6) {
    for (let y = 25; y < 275; y += 35)
      for (let x = 20; x < 400; x += 22) {
        poly(
          c,
          [
            [x, y],
            [x - 3, y - 8],
            [x + 2, y - 5],
            [x + 4, y - 14],
            [x + 6, y],
            [x, y],
          ],
          "#626c3e",
        );
      }
  }
  if (b.id === 8) {
    pixelEllipse(c, 300, 85, 52, 27, "#3c7778");
    pixelEllipse(c, 293, 81, 42, 20, "#6b9e90");
  }
}
export function drawRoom(c) {
  rect(c, 0, 0, 480, 270, "#283c49");
  rect(c, 0, 181, 480, 89, "#776044");
  for (let i = 0; i < 9; i++)
    line(c, 0, 185 + i * 10, 480, 185 + i * 10, "#65543e");
  rect(c, 305, 19, 137, 120, "#142b41");
  rect(c, 313, 26, 120, 103, "#425970");
  rect(c, 371, 26, 5, 103, "#a0a18b");
  rect(c, 313, 76, 120, 5, "#a0a18b");
  rect(c, 304, 133, 139, 8, "#b8ad83");
  for (let i = 0; i < 45; i++)
    line(
      c,
      317 + ((i * 37) % 110),
      29 + ((i * 19) % 97),
      315 + ((i * 37) % 110),
      34 + ((i * 19) % 97),
      "#7d96a1",
    );
  rect(c, 37, 150, 165, 62, "#4b5149");
  rect(c, 41, 151, 159, 21, "#a1b5a0");
  rect(c, 47, 155, 44, 18, "#d1d3b0");
  rect(c, 95, 157, 97, 36, "#657f7b");
  rect(c, 36, 201, 170, 11, "#423c31");
  rect(c, 260, 167, 183, 10, "#a78c58");
  rect(c, 271, 177, 8, 66, "#65553c");
  rect(c, 424, 177, 8, 66, "#65553c");
  poly(
    c,
    [
      [317, 154],
      [348, 153],
      [354, 166],
      [316, 167],
    ],
    "#c1c5a5",
  );
  poly(
    c,
    [
      [349, 153],
      [378, 150],
      [382, 164],
      [354, 166],
    ],
    "#ded9b4",
  );
  for (let i = 0; i < 4; i++)
    line(c, 321, 157 + i * 2, 344, 156 + i * 2, "#7b8d78");
  rect(c, 397, 148, 17, 18, "#ceb566");
  rect(c, 401, 143, 8, 5, "#737b64");
  rect(c, 64, 63, 81, 60, "#998456");
  rect(c, 69, 68, 71, 50, "#405c53");
  leaf(c, 110, 111, 1.2, "#88a36b");
}
