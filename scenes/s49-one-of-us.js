// s49-one-of-us: "Then God said: Adam is now / as one of us in knowing"
// Dusk at the river. From our bank, past dark reeds, across the wide still water: far off on the
// other side, on a low rise before the dark garden, the tree of life, pale and white-gold, its crown
// made of light and its fruit hanging like lamps; its light lies on the water in a long broken path.
// For the first line we hold on it (a slow drift, focus on the tree). Toward the second line the
// focus pulls down to its light on the water near us and the camera drifts along the bank.
import { grade, ease, drift, linesAt, clamp01, mix } from '/song/lib/look.js';
import { MERCY_CORE, MERCY_UNIFORMS } from '/song/lib/x-mercy.js';
import { TREE_GLSL, TREE_SCENE_GLSL, TREE_UNIFORMS } from '/song/lib/x-mercy-tree.js';

export const kind = 'shader';

export default (P) => {
  const [, B] = linesAt(P.from - 0.6, 'Then God said', 'as one of us');
  const pull0 = Math.max(P.from + 4.3, B.start - 1.6), pull1 = B.start + 0.6;
  const k = (t) => ease.inOut3(clamp01((t - pull0) / (pull1 - pull0)));
  const cam = (t) => {
    const p = clamp01((t - P.from) / (P.to - P.from));
    const d = drift(t, 0.01);
    const m = k(t);
    const pos = [9 - 4 * p + d[0], 1.25 + d[1] - 0.15 * m, -93 + 1.5 * p];
    const target = mix([13.0, 8.0, 0.0], [9.0, -6.0, -40.0], m * 0.55);
    return { pos, target, fov: 30 };
  };
  return {
    name: 's49-one-of-us', from: P.from, to: P.to,
    frag: MERCY_CORE + TREE_GLSL + TREE_SCENE_GLSL + 'vec3 shade(vec2 fc) { return lifeScene(fc); }',
    uniforms: { ...MERCY_UNIFORMS, ...TREE_UNIFORMS, uAper: 0.025, uReeds: 1.0, uReedZ: -89.8 },
    camera: cam,
    update(t, u) {
      const c = cam(t);
      // focus: the tree, then its light on the water about 40 m off
      u.uFocus.value = mix(Math.hypot(c.pos[0], c.pos[2]), 42, k(t));
      u.uGlow.value = 1.0 + 0.05 * Math.sin(t * 0.7);
    },
    post(t) { return grade(t, { exposure: 1.15, bloom: 0.22, threshold: 0.8, saturation: 1.0, contrast: 1.05, vignette: 0.55 }); },
    finish(t) { return { flare: { amount: 0.1, threshold: 0.8, tint: [1.0, 0.85, 0.6], length: 0.3 }, grade: { shadows: [0.0, 0.01, 0.04], highlights: [1.0, 0.95, 0.85], amount: 0.35 } }; },
  };
};
