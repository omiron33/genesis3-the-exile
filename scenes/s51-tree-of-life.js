// s51-tree-of-life: "for the tree of life, eat, / and live forever."
// The tree of life close, from just across the water at its foot: the pale trunk rising, the great
// boughs spreading overhead, the crown made of leaves of light, the fruit hanging in it like lamps,
// all of it breathing softly. The camera circles slowly, looking up into it, and never comes nearer:
// the water stays between us. Out of reach.
import { grade, ease, drift, linesAt, clamp01, mix } from '/song/lib/look.js';
import { MERCY_CORE, MERCY_UNIFORMS } from '/song/lib/x-mercy.js';
import { TREE_GLSL, TREE_SCENE_GLSL, TREE_UNIFORMS } from '/song/lib/x-mercy-tree.js';

export const kind = 'shader';

export default (P) => {
  const cam = (t) => {
    const p = ease.inOut3(clamp01((t - P.from) / (P.to - P.from)));
    const a = -0.32 + 0.28 * p;            // a slow orbit round the tree, low over the water
    const r = 31 - 0.8 * p;
    const d = drift(t, 0.01);
    const pos = [Math.sin(a) * r + d[0], 0.8 + 0.25 * p + d[1], -Math.cos(a) * r];
    return { pos, target: [Math.sin(a) * 3.0 - 3.0, pos[1] + 0.27 * r, 0.0], fov: 62 };
  };
  return {
    name: 's51-tree-of-life', from: P.from, to: P.to,
    frag: MERCY_CORE + TREE_GLSL + TREE_SCENE_GLSL + 'vec3 shade(vec2 fc) { return lifeScene(fc); }',
    uniforms: { ...MERCY_UNIFORMS, ...TREE_UNIFORMS, uAper: 0.05, uReach: 0.3, uReflCrown: 1.0 },
    camera: cam,
    update(t, u) {
      const c = cam(t);
      // focus on the near edge of the crown and its fruit
      u.uFocus.value = Math.hypot(c.pos[0], c.pos[2]) - 8.0;
      u.uGlow.value = 1.0 + 0.06 * Math.sin(t * 0.8);
    },
    post(t) { return grade(t, { exposure: 0.9, bloom: 0.18, threshold: 1.0, saturation: 1.0, contrast: 1.05, vignette: 0.55 }); },
    finish(t) { return { flare: { amount: 0.08, threshold: 0.85, tint: [1.0, 0.85, 0.6], length: 0.3 }, grade: { shadows: [0.0, 0.01, 0.04], highlights: [1.0, 0.95, 0.85], amount: 0.35 } }; },
  };
};
