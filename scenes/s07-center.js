// 07 · "Only the tree at its center is barred."
// The tree at the centre: alone on its rise in the clearing, immense, its crown darker than every
// other green, a few red fruit catching the low sun. The river comes toward us down the frame and
// parts around the hill. The camera holds at a respectful distance, low over the water, and creeps in.
import { grade, ease, drift, keys } from '/song/lib/look.js';
import { WORLD_GLSL, WORLD_UNIFORMS } from '/song/lib/x-tree-world.js';
import { cameraPlane } from '/engine.js';
import { FINISH } from '/premium/finish.js';

export const kind = 'shader';

export default (P) => {
  const prog = (t) => Math.min(1, Math.max(0, (t - P.from) / (P.to - P.from)));
  const cam = (t) => {
    const p = 0.6 * prog(t) + 0.4 * ease.inOut3(prog(t)), d = drift(t, 0.05);
    return { pos: [-3.0 + d[0], 0.6 + 0.5 * p + d[1], -150 + 10 * p], target: [0.0, 10.5 + 0.3 * p, 0.0], fov: 19 - 0.8 * p, roll: 0.003 * Math.sin(t * 0.4) };
  };
  return {
    name: 's07-center', from: P.from, to: P.to,
    frag: WORLD_GLSL + /* glsl */ `
vec3 shade(vec2 fc) {
  vec3 ro; vec3 rd = camRay(fc, ro);
  float jit = hash12(fc + fract(uTime * 7.31) * 57.0);
  float depth;
  return gardenScene(ro, rd, jit, depth);
}`,
    uniforms: { ...WORLD_UNIFORMS, uTreeWind: 0.1, uGrass: 0 },
    camera: cam,
    textPlane(t, c) { return cameraPlane(c, { width: 1, dist: 1, aspect: 16 / 9 }); },
    post(t) { return grade(t, { exposure: 0.85, bloom: 0.14, threshold: 1.0, contrast: 1.1, saturation: 1.1 }); },
    finish(t) { return { leak: { ...FINISH.film.leak, amount: 0.1 }, grade: { shadows: [0.03, 0.02, 0.0], highlights: [1.0, 0.95, 0.86], amount: 0.25 } }; },
  };
};
