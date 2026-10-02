// 04 · "Did God close every garden tree to you?"
// The serpent's question twists abundance into restriction. A slow lateral glide along an orchard
// row, low among the trunks, every tree heavy with fruit (golden apples, figs, pomegranates); the sun
// is behind the row and strobes between the crowns as we pass; the row runs on into bright haze.
import { grade, ease, clamp01, drift, mix } from '/song/lib/look.js';
import { GARDEN_GLSL, GARDEN_UNIFORMS, orchardGround } from '/song/lib/x-garden.js';
import { NEAR_GLSL } from '/song/lib/x-garden-near.js';
import { cameraPlane } from '/engine.js';
import { FINISH } from '/premium/finish.js';

export const kind = 'shader';

export function rowCamera(P) {
  return (t) => {
    const u = clamp01((t - P.from) / (P.to - P.from));
    const x = 181 - 24 * u;                  // gliding along the row (row of trees at z = 246)
    const z = 238.5;
    const d = drift(t, 0.012);
    const y = orchardGround(x, z) + 1.05 + 0.04 * Math.sin(t * 0.9);
    return { pos: [x + d[0], y + d[1], z], target: [x - 9, y + 1.6, z + 14], fov: 50, roll: -0.01, focus: 9.5, aperture: 0.02 };
  };
}

export default (P) => {
  const cam = rowCamera(P);
  return {
    name: 's04-every-tree', from: P.from, to: P.to,
    frag: GARDEN_GLSL + NEAR_GLSL + /* glsl */ `
vec3 shade(vec2 fc) {
  vec3 ro; vec3 rd = lensRay(fc, ro);
  float jit = hash12(fc + fract(uTime * 7.31) * 57.0);
  float depth;
  vec3 c = gardenWide(ro, rd, jit, depth);
  float tg = grassMarch(ro, rd, depth, jit, 16.0);
  if (tg > 0.0) { c = fogW(shadeGrass(ro, rd, tg), ro, rd, tg); depth = tg; }
  return c;
}`,
    uniforms: { ...GARDEN_UNIFORMS, uGrassH: 0.32, uReeds: 0, uWind: 0.8, uLeafT: 45, uFocus: 9.5, uAperture: 0.02, uHaze: 1.6 },
    camera: cam,
    textPlane(t, c) { return cameraPlane(c, { width: 1, dist: 1, aspect: 16 / 9 }); },
    update(t, u) { const c = cam(t); u.uFocus.value = c.focus; u.uAperture.value = c.aperture; },
    post(t) { return grade(t, { exposure: 0.95, bloom: 0.16, threshold: 1.0, vignette: 0.5 }); },
    finish(t) { return { grade: FINISH.film.grade, flare: { amount: 0.025, threshold: 0.97, tint: [1.0, 0.8, 0.55], length: 0.12 } }; },
  };
};
