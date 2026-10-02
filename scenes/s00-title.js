// 00 · title: GENESIS 3 / THE EXILE over the instrumental.
// One continuous flight: from the first frame we are gliding fast and low over a river at golden
// hour, mist on the water, reeds and bank trees rushing past; the camera rises and the garden of
// Delight opens ahead: hills of orchards, rivers shining, the dark tree on its rise in the far centre
// and, beyond a far river, the pale white-gold tree of life.
import { grade, ease, clamp01, drift } from '/song/lib/look.js';
import { GARDEN_GLSL, GARDEN_UNIFORMS, riverX } from '/song/lib/x-garden.js';
import { NEAR_GLSL } from '/song/lib/x-garden-near.js';
import { cameraPlane } from '/engine.js';
import { FINISH } from '/premium/finish.js';

export const kind = 'shader';

export function titleCamera(P) {
  const D = P.to - P.from;
  return (t) => {
    const u = clamp01((t - P.from) / D);
    // distance travelled: fast at first, easing as we rise
    const z = -760 + 230 * (1 - Math.pow(1 - u, 1.7)) + 20 * u;
    const rise = ease.inOut3(clamp01((u - 0.12) / 0.88));
    const y = 1.5 + 70 * rise + 0.12 * Math.sin(t * 2.3);
    const x = (riverX(z) + 4.5) * (1 - 0.35 * rise);
    const ahead = riverX(z + 60);
    const d = drift(t, 0.04);
    const tx = ahead * (1 - rise) + 0 * rise, ty = 0.6 + 20 * rise, tz = z + 60 + 1400 * rise;
    return { pos: [x + d[0], y + d[1], z], target: [tx, ty, tz], fov: 54 - 8 * rise, roll: 0.03 * Math.sin(t * 0.7) * (1 - rise) - 0.02 * (1 - u) };
  };
}

export default (P) => {
  const cam = titleCamera(P);
  return {
    name: 's00-title', from: P.from, to: P.to,
    frag: GARDEN_GLSL + NEAR_GLSL + /* glsl */ `
vec3 shade(vec2 fc) {
  vec3 ro; vec3 rd = lensRay(fc, ro);
  float jit = hash12(fc + fract(uTime * 7.31) * 57.0);
  float depth;
  vec3 c = gardenWide(ro, rd, jit, depth);
  float tg = grassMarch(ro, rd, depth, jit, 45.0);
  if (tg > 0.0) { c = fogW(shadeGrass(ro, rd, tg), ro, rd, tg); depth = tg; }
  c = mistW(c, ro, rd, depth, jit);
  return c;
}`,
    uniforms: { ...GARDEN_UNIFORMS, uMist: 1.0, uGrassH: 0.55, uReeds: 1 },
    camera: cam,
    textPlane(t, c) { return cameraPlane(c, { width: 1, dist: 1, aspect: 16 / 9 }); },
    update(t, u) {
      const k = clamp01((t - P.from) / (P.to - P.from));
      u.uMist.value = 1.4 - 0.8 * k;
      u.uWind.value = 1.0;
    },
    post(t) { return grade(t, { exposure: 1.0, bloom: 0.14, vignette: 0.48 }); },
    finish(t) {
      const fade = 1 - ease.out3(clamp01((t - P.from) / 1.0));
      return { ...FINISH.film, leak: { amount: 0.12, warm: [1.0, 0.6, 0.3], cool: [0.9, 0.5, 0.4], speed: 0.06 }, fade: 0.82 * fade };
    },
  };
};
