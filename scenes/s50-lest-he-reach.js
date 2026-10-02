// s50-lest-he-reach: "good from evil. Lest he reach"
// The camera reaches for the tree of life: it leaves the reeds and races low over the dark water
// toward the far bank, faster and faster, the tree's light growing ahead and its path on the water
// streaming under us; on "reach" it is held back, as if by a hand: it slows hard, gives a little, and
// drifts back while the light ahead brightens. Out of reach.
import { grade, ease, drift, linesAt, wordIn, clamp01, mix } from '/song/lib/look.js';
import { MERCY_CORE, MERCY_UNIFORMS } from '/song/lib/x-mercy.js';
import { TREE_GLSL, TREE_SCENE_GLSL, TREE_UNIFORMS } from '/song/lib/x-mercy-tree.js';

export const kind = 'shader';

export default (P) => {
  const [L] = linesAt(P.from - 0.6, 'good from evil');
  const tR = wordIn(L, 'reach').start + 0.05;
  const t0 = P.from, z0 = -88, D = 40;
  const vR = 2 * D / (tR - t0);
  const zAt = (t) => {
    if (t <= tR) return z0 + D * ((t - t0) / (tR - t0)) ** 2;
    const dt = t - tR, a = vR / 2.2;                  // overshoot ~2.2 m, then pulled back ~4.5 m
    return z0 + D + 2.2 * (1 - Math.exp(-a * dt)) - 4.5 * (1 - Math.exp(-1.6 * dt)) * (1 - Math.exp(-6 * dt));
  };
  const cam = (t) => {
    const z = zAt(t);
    const d = drift(t, 0.008);
    const p = clamp01((t - t0) / (tR - t0));
    return { pos: [6 - 3 * p + d[0], 1.1 - 0.35 * p + d[1], z], target: [12.0 - 2.5 * p, 9.0 - 1.5 * p, 0.0], fov: 32 + 4 * p };
  };
  return {
    name: 's50-lest-he-reach', from: P.from, to: P.to,
    frag: MERCY_CORE + TREE_GLSL + TREE_SCENE_GLSL + 'vec3 shade(vec2 fc) { return lifeScene(fc); }',
    uniforms: { ...MERCY_UNIFORMS, ...TREE_UNIFORMS, uAper: 0.02, uReeds: 1.0, uReedZ: -86.0 },
    camera: cam,
    update(t, u) {
      const c = cam(t);
      u.uFocus.value = Math.hypot(c.pos[0] - 0.5, c.pos[1] - 10, c.pos[2]);
      // the light brightens as we are held back
      u.uReach.value = ease.inOut3(clamp01((t - tR + 0.3) / 1.2));
    },
    post(t) { const r = ease.inOut3(clamp01((t - tR + 0.3) / 1.2)); return grade(t, { exposure: 1.15 - 0.25 * r, bloom: 0.24, threshold: 0.8, saturation: 1.0, contrast: 1.05, vignette: 0.55 }); },
    finish(t) { return { flare: { amount: 0.12, threshold: 0.8, tint: [1.0, 0.85, 0.6], length: 0.3 }, grade: { shadows: [0.0, 0.01, 0.04], highlights: [1.0, 0.95, 0.85], amount: 0.35 } }; },
  };
};
