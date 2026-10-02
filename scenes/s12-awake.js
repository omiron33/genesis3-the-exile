// 12 · "God knows the day you taste it, / your eyes will come awake."
// Under the tree, looking up: the dark crown overhead, sun breaking through it in shafts, the red fruit
// glowing among the leaves. A slow orbit round the trunk; the sun flares through a gap. Seductive.
import { grade, ease, keys } from '/song/lib/look.js';
import { WORLD_GLSL, WORLD_UNIFORMS } from '/song/lib/x-tree-world.js';
import { CANOPY_GLSL } from '/song/lib/x-tree-canopy.js';
import { cameraPlane } from '/engine.js';
import { FINISH } from '/premium/finish.js';

export const kind = 'shader';

export default (P) => {
  const prog = (t) => Math.min(1, Math.max(0, (t - P.from) / (P.to - P.from)));
  const cam = (t) => {
    const p = prog(t), e = 0.5 * p + 0.5 * ease.inOut3(p);
    // beneath the crown beside the trunk, looking up and out toward the low sun; a slow orbit
    const a = 0.3 - 0.5 * e;
    const pos = [-2.6 + 1.8 * e, 8.2 + 0.15 * e, -8.6 + 0.8 * e];
    const el = 0.72 - 0.1 * e;
    const dir = [Math.sin(a) * Math.cos(el), Math.sin(el), Math.cos(a) * Math.cos(el)];
    return { pos, target: [pos[0] + dir[0], pos[1] + dir[1], pos[2] + dir[2]], fov: 60, roll: 0.05 * Math.sin(t * 0.21) };
  };
  return {
    name: 's12-awake', from: P.from, to: P.to,
    frag: WORLD_GLSL + CANOPY_GLSL + /* glsl */ `
vec3 shade(vec2 fc) {
  vec3 ro; vec3 rd = camRay(fc, ro);
  float jit = hash12(fc + fract(uTime * 7.31) * 57.0);
  float depth;
  vec3 c = underTree(ro, rd, jit, depth);
  c += canopyShafts(ro, rd, depth, jit);
  return c;
}`,
    uniforms: { ...WORLD_UNIFORMS, uTreeWind: 0.12, uSunDir: [-0.15, 0.62, 0.77] },
    camera: cam,
    textPlane(t, c) { return cameraPlane(c, { width: 1, dist: 1, aspect: 16 / 9 }); },
    post(t) { return grade(t, { exposure: 1.35, bloom: 0.22, threshold: 0.9, contrast: 1.08, saturation: 1.05 }); },
    finish(t) { return { flare: { amount: 0.1, threshold: 0.85, tint: [1.0, 0.75, 0.45], length: 0.4 }, leak: { ...FINISH.film.leak, amount: 0.15 }, grade: { shadows: [0.03, 0.015, 0.0], highlights: [1.0, 0.93, 0.8], amount: 0.3 } }; },
  };
};
