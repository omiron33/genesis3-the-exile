// 05 · "She answered him: We eat the fruit"
// Close and generous: a fig bough hanging in the low sun at the edge of an orchard tree, three ripe
// figs with dew on their bloom, one splitting open as we watch, broad leaves lit through and turning in
// the breeze, bees working round the fruit. At the end the focus racks past the bough deep into the
// orchard's layers of trees in haze.
import { grade, ease, clamp01, drift, mix, keys } from '/song/lib/look.js';
import { GARDEN_GLSL, GARDEN_UNIFORMS, orchardGround } from '/song/lib/x-garden.js';
import { NEAR_GLSL } from '/song/lib/x-garden-near.js';
import { MACRO_GLSL, MACRO_UNIFORMS } from '/song/lib/x-garden-macro.js';
import { cameraPlane } from '/engine.js';
import { FINISH } from '/premium/finish.js';

export const kind = 'shader';

// in the aisle between two rows, looking along it (+x): the sun comes from the right, a little behind
const X = 156.0, Z = 241.2;
const G = orchardGround(X, Z);
const BOUGH = [X + 0.6, G + 2.75, Z + 0.05];

export function figCamera(P) {
  return (t) => {
    const u = clamp01((t - P.from) / (P.to - P.from));
    const k = ease.inOut3(u);
    const d = drift(t, 0.004);
    const pos = [X + 0.06 * k + d[0], G + 2.79 + 0.015 * k + d[1], Z + 0.03 - 0.06 * k];
    const target = [X + 2, G + 2.7, Z + 0.06];
    // hold on the figs, then rack deep into the orchard as the line ends
    const focus = keys(t, [[P.from, 0.55], [P.to - 1.1, 0.5], [P.to - 0.15, 14]]);
    return { pos, target, fov: 36, roll: 0.02, focus, aperture: 0.009 };
  };
}

export default (P) => {
  const cam = figCamera(P);
  return {
    name: 's05-we-eat', from: P.from, to: P.to,
    frag: GARDEN_GLSL + NEAR_GLSL + MACRO_GLSL + /* glsl */ `
vec3 shade(vec2 fc) {
  vec3 ro; vec3 rd = lensRay(fc, ro);
  float jit = hash12(fc + fract(uTime * 7.31) * 57.0);
  float depth = 1e5;
  float tb = boughMarch(ro, rd, 2.0);
  vec3 c;
  if (tb > 0.0) { c = shadeBough(ro, rd, tb); depth = tb; }
  else {
    c = gardenWide(ro, rd, jit, depth);
    float tg = grassMarch(ro, rd, depth, jit, 12.0);
    if (tg > 0.0) { c = fogW(shadeGrass(ro, rd, tg), ro, rd, tg); depth = tg; }
  }
  c = beesOver(c, ro, rd, depth);
  return c;
}`,
    uniforms: { ...GARDEN_UNIFORMS, ...MACRO_UNIFORMS, uBough: BOUGH, uBoughYaw: -Math.PI / 2, uGrassH: 0.3, uWind: 0.7, uLeafT: 40, uFocus: 0.55, uAperture: 0.009, uHaze: 1.6 },
    camera: cam,
    textPlane(t, c) { return cameraPlane(c, { width: 1, dist: 1, aspect: 16 / 9 }); },
    update(t, u) {
      const c = cam(t);
      u.uFocus.value = c.focus; u.uAperture.value = c.aperture;
      u.uSplit.value = ease.inOut3(clamp01((t - P.from - 0.6) / ((P.to - P.from) * 0.7)));
    },
    post(t) { return grade(t, { exposure: 0.95, bloom: 0.18, threshold: 0.95, vignette: 0.5 }); },
    finish(t) { return { grade: FINISH.film.grade }; },
  };
};
