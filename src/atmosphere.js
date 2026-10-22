import { createNoise2D } from 'simplex-noise';
let seed = 19071989;
const noise = createNoise2D(() => { seed = (Math.imul(seed,1664525)+1013904223)>>>0; return seed/4294967296; });
export const soilNoise = (x,y) => noise(x*.018,y*.018)*.65 + noise(x*.065,y*.065)*.25 + noise(x*.2,y*.2)*.1;
export const windAt = (x,y,time) => noise(x*.002+time*.00012,y*.002+time*.000035);
