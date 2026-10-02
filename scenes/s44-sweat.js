// s44-sweat: "Your face will sweat for bread"
// Macro, at the height of the dust: hard white heat over a cracked hardpan, the sun ahead of us. A
// single drop of sweat falls through the frame in slow motion, wobbling, the white sky and the ground
// upside down inside it, its shadow running ahead of it with a bright caustic at its heart. It lands
// on "sweat": it flattens, a ring of backlit dust lifts and drifts, grains are thrown in slow arcs, and
// the water soaks away into a dark patch as the dust settles. The lens creeps in a little all along.
import { grade, ease, drift, linesAt, wordIn, clamp01 } from '/song/lib/look.js';
import { MERCY_CORE, MERCY_UNIFORMS } from '/song/lib/x-mercy.js';
import { DUST_GLSL, DUST_UNIFORMS } from '/song/lib/x-mercy-dust.js';
import { SWEAT_GLSL, SWEAT_UNIFORMS } from '/song/lib/x-mercy-sweat.js';

export const kind = 'shader';

export default (P) => {
  const [L] = linesAt(P.from - 0.6, 'Your face will sweat');
  const impact = wordIn(L, 'sweat').start + 0.05;
  // the drop is just inside the top of the frame at the cut and lands on "sweat"
  const fall = 0.026 / Math.max(0.6, impact - P.from);
  const cam = (t) => {
    const p = ease.inOut3(clamp01((t - P.from) / (P.to - P.from)));
    const d = drift(t, 0.0004);
    return { pos: [0.012 - 0.008 * p + d[0], 0.022 + 0.002 * p + d[1], -0.15 + 0.03 * p], target: [0.0, 0.009 + 0.004 * p, 0.0], fov: 20 };
  };
  return {
    name: 's44-sweat', from: P.from, to: P.to,
    frag: MERCY_CORE + DUST_GLSL + SWEAT_GLSL + 'vec3 shade(vec2 fc) { return sweat(fc); }',
    uniforms: {
      ...MERCY_UNIFORMS, ...DUST_UNIFORMS, ...SWEAT_UNIFORMS,
      uImpact: impact, uFall: fall, uGrain: 1.0, uHaze: 0.004, uShimmer: 1.0,
      uSun: [-0.3, 0.42, 0.85], uSunCol: [9.5, 8.9, 7.8], uSkyZen: [0.5, 0.62, 0.82], uSkyHor: [1.5, 1.45, 1.36],
      uAper: 0.0035, uCrackScale: 5.0,
    },
    camera: cam,
    update(t, u) {
      const c = cam(t);
      u.uFocus.value = Math.hypot(c.pos[0], c.pos[1] - 0.006, c.pos[2]);
    },
    post(t) { return grade(t, { exposure: 0.55, bloom: 0.12, threshold: 1.1, saturation: 0.92, contrast: 1.12, vignette: 0.4, gain: [1.02, 1.0, 0.96] }); },
    finish(t) { return { grade: { shadows: [0.02, 0.012, 0.0], highlights: [1.0, 0.97, 0.9], amount: 0.3 } }; },
  };
};
