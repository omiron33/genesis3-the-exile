// 22 · "the Lord God walking through the garden."
// In the cold orchard, low between two rows: a soft column of warm light comes walking down the aisle
// toward us. No figure, only presence: the grass bows away from it, the leaves of each tree turn and
// flash as it passes, its warmth falls on the trunks and the ground. As the line ends it turns aside
// and passes behind the trunks of the near row, its light breaking between them.
import { grade, ease, clamp01, drift, mix, keys } from '/song/lib/look.js';
import { GARDEN_GLSL, GARDEN_UNIFORMS, orchardGround } from '/song/lib/x-garden.js';
import { NEAR_GLSL } from '/song/lib/x-garden-near.js';
import { cameraPlane } from '/engine.js';

export const kind = 'shader';

const Z = 252;                       // the aisle between the rows at z = 246 and z = 258
const X0 = 118;                      // camera

export function walkPath(P) {
  return (t) => {
    const u = clamp01((t - P.from) / (P.to - P.from));
    // down the aisle toward us, then aside, behind the near row's trunks (z = 258)
    const x = mix(176, 136, ease.inOut3(clamp01(u / 0.8)));
    const z = Z + 8.5 * ease.inOut3(clamp01((u - 0.62) / 0.38));
    return [x, orchardGround(x, z), z];
  };
}

export function walkCamera(P) {
  const path = walkPath(P);
  return (t) => {
    const u = clamp01((t - P.from) / (P.to - P.from));
    const d = drift(t, 0.012);
    const L = path(t);
    const g = orchardGround(X0, Z - 1);
    const pos = [X0 + 2.5 * ease.inOut3(u) + d[0], g + 1.05 + d[1], Z - 1.2];
    const target = [L[0], g + 1.5, mix(Z, L[2], 0.6)];
    const focus = Math.hypot(L[0] - pos[0], L[2] - pos[2]);
    return { pos, target, fov: 38, roll: 0.0, focus, aperture: 0.016 };
  };
}

export default (P) => {
  const cam = walkCamera(P), path = walkPath(P);
  return {
    name: 's22-walking', from: P.from, to: P.to,
    frag: GARDEN_GLSL + NEAR_GLSL + /* glsl */ `
vec3 shade(vec2 fc) {
  vec3 ro; vec3 rd = lensRay(fc, ro);
  float jit = hash12(fc + fract(uTime * 7.31) * 57.0);
  float depth;
  vec3 c = gardenWide(ro, rd, jit, depth);
  float tg = grassMarch(ro, rd, depth, jit, 25.0);
  if (tg > 0.0) { c = fogW(shadeGrass(ro, rd, tg), ro, rd, tg); depth = tg; }
  c = presenceGlow(c, ro, rd, depth);
  return c;
}`,
    uniforms: { ...GARDEN_UNIFORMS, uCold: 1, uSunDir: [-0.5, 0.35, 0.8], uGrassH: 0.45, uWind: 0.5, uLeafT: 60, uFocus: 30, uAperture: 0.016, uHaze: 1.6,
      uPres: [170, 3, Z], uPresAmt: 1, uPresR: 1.15, uPresTall: 1.9 },
    camera: cam,
    textPlane(t, c) { return cameraPlane(c, { width: 1, dist: 1, aspect: 16 / 9 }); },
    update(t, u) {
      const c = cam(t), L = path(t);
      u.uFocus.value = c.focus; u.uAperture.value = c.aperture;
      u.uPres.value.set(...L);
      u.uPresAmt.value = 0.9 + 0.15 * Math.sin(t * 1.3);
    },
    post(t) { return grade(t, { exposure: 1.45, bloom: 0.2, threshold: 0.9, saturation: 0.92, gain: [0.97, 0.99, 1.03] }); },
    finish(t) { return { grade: { shadows: [0.0, 0.02, 0.05], highlights: [1.0, 0.95, 0.88], amount: 0.45 } }; },
  };
};
