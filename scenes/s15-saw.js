// 15 · "She saw food in its branches,"
// Her point of view: standing under the tree, looking up into the branches on a long lens. The crown
// overhead, the great limbs, red fruit hanging among the leaves; the frame drifts closer and the
// focus, loose on the leaves at first, finds one fruit hanging from a limb.
import { grade, ease, keys } from '/song/lib/look.js';
import { WORLD_GLSL, WORLD_UNIFORMS } from '/song/lib/x-tree-world.js';
import { CANOPY_GLSL } from '/song/lib/x-tree-canopy.js';
import { fruitPosJS } from '/song/lib/x-tree.js';
import { cameraPlane } from '/engine.js';
import { FINISH } from '/premium/finish.js';

export const kind = 'shader';

export default (P) => {
  const prog = (t) => Math.min(1, Math.max(0, (t - P.from) / (P.to - P.from)));
  const F = fruitPosJS(6);
  const cam = (t) => {
    const p = prog(t), e = 0.6 * p + 0.4 * ease.inOut3(p);
    const pos = [F[0] + 0.9 - 0.25 * e, 8.5 + 0.25 * e + 0.01 * Math.sin(t * 0.9), F[2] - 4.4 + 0.8 * e];
    const look = [F[0] + 0.5 * (1 - e), F[1] + 0.7 * (1 - e) + 0.02, F[2] + 0.4 * (1 - e)];
    return { pos, target: look, fov: 34 - 14 * e, roll: 0.03 - 0.03 * e };
  };
  return {
    name: 's15-saw', from: P.from, to: P.to,
    frag: WORLD_GLSL + CANOPY_GLSL + /* glsl */ `
uniform float uFocus, uAper;
vec3 shade(vec2 fc) {
  vec3 ro; vec3 rd = lensRay(fc, uFocus, uAper, ro);
  float jit = hash12(fc + fract(uTime * 7.31) * 57.0);
  float depth;
  vec3 c = underTree(ro, rd, jit, depth);
  c += canopyShafts(ro, rd, depth, jit);
  return c;
}`,
    uniforms: { ...WORLD_UNIFORMS, uTreeWind: 0.1, uSunDir: [-0.15, 0.62, 0.77], uFocus: 8.0, uAper: 0.03 },
    camera: cam,
    textPlane(t, c) { return cameraPlane(c, { width: 1, dist: 1, aspect: 16 / 9 }); },
    update(t, u) {
      const c = cam(t);
      const dF = Math.hypot(c.pos[0] - F[0], c.pos[1] - F[1], c.pos[2] - F[2]);
      const k = keys(t, [[P.from, 0], [P.from + 0.4, 0], [P.from + 1.9, 1, ease.inOut3], [P.to, 1]]);
      u.uFocus.value = 9.5 + (dF - 9.5) * k;
    },
    post(t) { return grade(t, { exposure: 1.55, bloom: 0.2, threshold: 0.9, contrast: 1.06, saturation: 1.05 }); },
    finish(t) { return { leak: { ...FINISH.film.leak, amount: 0.15 }, grade: { shadows: [0.03, 0.015, 0.0], highlights: [1.0, 0.93, 0.8], amount: 0.3 } }; },
  };
};
