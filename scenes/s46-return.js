// s46-return: "to earth you will return."
// The same long shadow on the cracked earth, and the wind rising. On "earth" the shadow begins to
// break up, from the head back toward the feet: its pieces lift as dark dust and blow away to the
// right across the plain, until by "return" only bare ground is left, dust still streaming low over
// it. Then the hard white heat softens into a warmer, lower light: mercy is coming.
import { grade, ease, drift, linesAt, wordIn, clamp01, mix } from '/song/lib/look.js';
import { MERCY_CORE, MERCY_UNIFORMS } from '/song/lib/x-mercy.js';
import { DUST_GLSL, DUST_UNIFORMS } from '/song/lib/x-mercy-dust.js';
import { EARTH_GLSL, EARTH_SCENE_GLSL, EARTH_UNIFORMS } from '/song/lib/x-mercy-earth.js';

export const kind = 'shader';

export default (P) => {
  const [L] = linesAt(P.from - 0.6, 'to earth you will return');
  const earth = wordIn(L, 'earth').start;
  const ret = wordIn(L, 'return').start;
  const brk = (t) => clamp01((t - earth + 0.1) / Math.max(1.2, ret + 0.4 - earth));
  const warm = (t) => ease.inOut3(clamp01((t - ret + 0.6) / (P.to - ret + 0.6)));
  const SUN0 = [0.22, 0.27, -1.0], SUN1 = [0.3, 0.17, -1.0];
  const cam = (t) => {
    const p = ease.inOut3(clamp01((t - P.from) / (P.to - P.from)));
    const d = drift(t, 0.006);
    // the eye drifts with the dust, to the right
    return { pos: [0.45 - 0.6 * p + d[0], 1.6 + 0.1 * p + d[1], -0.4 + 0.3 * p], target: [-0.7 - 2.6 * p, 0.0, 7.5], fov: 44 };
  };
  return {
    name: 's46-return', from: P.from, to: P.to,
    frag: MERCY_CORE + DUST_GLSL + EARTH_GLSL + EARTH_SCENE_GLSL + 'vec3 shade(vec2 fc) { return earthScene(fc); }',
    uniforms: {
      ...MERCY_UNIFORMS, ...DUST_UNIFORMS, ...EARTH_UNIFORMS,
      uSun: SUN0, uSunCol: [9.5, 8.9, 7.8], uSkyZen: [0.46, 0.58, 0.8], uSkyHor: [1.45, 1.4, 1.32],
      uHaze: 0.0035, uAper: 0.004, uWindV: -2.0, uStream: 1.2,
    },
    camera: cam,
    update(t, u) {
      const c = cam(t);
      u.uFocus.value = Math.hypot(c.pos[0] + 0.5, c.pos[1], c.pos[2] - 4.0);
      u.uBreak.value = brk(t);
      const w = warm(t);
      u.uStream.value = 1.2 - 0.5 * w;
      u.uSun.value.set(...mix(SUN0, SUN1, w));
      u.uSunCol.value.set(...mix([9.5, 8.9, 7.8], [9.6, 7.0, 4.4], w));
      u.uSkyZen.value.set(...mix([0.46, 0.58, 0.8], [0.42, 0.48, 0.66], w));
      u.uSkyHor.value.set(...mix([1.45, 1.4, 1.32], [1.5, 1.22, 0.92], w));
    },
    post(t) { return grade(t, { exposure: 0.8 + 0.1 * warm(t), bloom: 0.1, threshold: 1.1, saturation: 0.92 + 0.14 * warm(t), contrast: 1.12, vignette: 0.45 }); },
    finish(t) { const w = warm(t); return { grade: { shadows: [0.015, 0.01, 0.0], highlights: [1.0, 0.97 - 0.05 * w, 0.9 - 0.12 * w], amount: 0.3 + 0.1 * w } }; },
  };
};
