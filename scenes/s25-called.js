// 25 · "He called out to Adam: / Adam, where are you now?"
// Dusk over the garden canopy, the camera rising slowly out of the treetops. As He calls, a warm
// light comes up low on the far horizon and floods across the crowns toward us, lighting their tops
// and leaving the hollows between them dark: the call going out over the whole garden.
import { ease, linesAt, wordIn, clamp, grade, drift } from '/song/lib/look.js';
import { SHAME_GLSL, SHAME_UNIFORMS } from '/song/lib/x-shame.js';
import { CANOPY_GLSL, CANOPY_UNIFORMS } from '/song/lib/x-shame-canopy.js';
import { cameraPlane } from '/engine.js';
export const kind = 'shader';

export default (P) => {
  const [L1, L2] = linesAt(P.from - 2.5, 'He called out', 'Adam, where are you');
  const tCalled = wordIn(L1, 'called').start, tAdam = L2.words[0].start;
  // the light rises with the first call and floods across with the second ("Adam,")
  const k1 = (t) => ease.inOut3(clamp((t - tCalled + 0.2) / 2.2, 0, 1));
  const flood = (t) => 0.25 * k1(t) + 0.75 * ease.out3(clamp((t - tAdam + 0.15) / 2.6, 0, 1));
  const cam = (t) => {
    const k = ease.inOut3(clamp((t - P.from) / (P.to - P.from), 0, 1));
    const d = drift(t, 0.02);
    return { pos: [0.0 + d[0], 12.5 + 7.5 * k + d[1], -4.0 + 6.0 * k], target: [3.0, 9.0 + 3.0 * k, 120.0], fov: 46, roll: -0.01 };
  };
  return {
    name: 's25-called', from: P.from, to: P.to,
    frag: SHAME_GLSL + CANOPY_GLSL + /* glsl */ `
vec3 shade(vec2 fc) { vec3 ro; vec3 rd = shLens(fc, ro); return canopyScene(ro, rd); }`,
    uniforms: { ...SHAME_UNIFORMS, ...CANOPY_UNIFORMS, uCold: 1, uDusk: 0.85, uFog: 0.0028, uSunD: [0.1, 0.03, 1.0], uLDir: [0.04, 0.035, 1.0] },
    camera: cam,
    textPlane(t, c) { return cameraPlane(c, { width: 1, dist: 1, aspect: 16 / 9 }); },
    update(t, u) {
      u.uFlood.value = flood(t);
      u.uFloodK.value = 0.1 + 0.6 * k1(t) + 0.5 * ease.inOut3(clamp((t - tAdam) / 1.5, 0, 1));
      u.uWT.value = t * 0.3;
    },
    post(t) { return grade(t, { exposure: 1.15, bloom: 0.14, threshold: 0.9, saturation: 0.95, contrast: 1.06, vignette: 0.5, lift: [0.006, 0.009, 0.016], gain: [1.0, 0.99, 1.0] }); },
    finish(t) { return { flare: { amount: 0.1 * k1(t), threshold: 1.1, tint: [1.0, 0.75, 0.45], length: 0.35 }, grade: { shadows: [0.0, 0.012, 0.04], highlights: [1.0, 0.95, 0.88], amount: 0.45 } }; },
  };
};
