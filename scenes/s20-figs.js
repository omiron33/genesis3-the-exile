// 20 · "the leaves of figs by hand / and wrapped themselves."
// Macro, in the cold light: big fig leaves overlapping, the front one stitched to the next with a
// pale green fibre. Focus finds the stitches; through the line the leaves curl closed, most on
// "wrapped"; at the end a breeze arrives and they tremble.
import { ease, linesAt, wordIn, clamp, grade, drift } from '/song/lib/look.js';
import { SHAME_GLSL, SHAME_UNIFORMS } from '/song/lib/x-shame.js';
import { MACRO_GLSL, MACRO_UNIFORMS } from '/song/lib/x-shame-macro.js';
import { cameraPlane } from '/engine.js';
export const kind = 'shader';

export default (P) => {
  const [, L2] = linesAt(P.from - 2.5, 'the leaves of figs', 'and wrapped themselves');
  const tWrap = wordIn(L2, 'wrapped').start;
  const curl = (t) => 0.25 + 0.35 * clamp((t - P.from) / (tWrap - P.from), 0, 1) + 1.0 * ease.inOut3(clamp((t - tWrap + 0.1) / 1.2, 0, 1));
  const cam = (t) => {
    const k = ease.inOut3(clamp((t - P.from) / (P.to - P.from), 0, 1));
    const d = drift(t, 0.0015);
    return { pos: [-0.01 - 0.02 * k + d[0], -0.06 + 0.01 * k + d[1], -0.36 + 0.05 * k], target: [-0.02 - 0.01 * k, -0.08, 0.03], fov: 40, roll: 0.03 - 0.03 * k };
  };
  return {
    name: 's20-figs', from: P.from, to: P.to,
    frag: SHAME_GLSL + MACRO_GLSL + /* glsl */ `
vec3 shade(vec2 fc) { vec3 ro; vec3 rd = shLens(fc, ro); return macroScene(ro, rd); }`,
    uniforms: { ...SHAME_UNIFORMS, ...MACRO_UNIFORMS, uCold: 1, uDusk: 0.1, uAperS: 0.006, uFocusS: 0.4 },
    camera: cam,
    textPlane(t, c) { return cameraPlane(c, { width: 1, dist: 1, aspect: 16 / 9 }); },
    update(t, u) {
      u.uCurl.value = curl(t);
      u.uTremble.value = ease.inOut3(clamp((t - (P.to - 0.9)) / 0.6, 0, 1));
      // focus breathes from the stitches into the leaf behind as they close
      u.uFocusS.value = 0.37 - 0.03 * ease.inOut3(clamp((t - tWrap) / 1.5, 0, 1));
    },
    post(t) { return grade(t, { exposure: 1.2, bloom: 0.08, saturation: 0.9, contrast: 1.07, vignette: 0.55, lift: [0.008, 0.011, 0.016], gain: [0.96, 1.0, 1.04] }); },
    finish(t) { return { grade: { shadows: [0.0, 0.012, 0.035], highlights: [0.96, 0.98, 1.0], amount: 0.45 } }; },
  };
};
