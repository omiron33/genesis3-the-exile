// 27 · "Who told you you were naked?"
// Close on a cold, still pool at dusk. The surface holds only darkness, the black lace of the leaves
// overhead and one star. A single drop falls into it on "told"; the rings run out through the star's
// reflection and break it into trembling light.
import { ease, linesAt, wordIn, grade, drift } from '/song/lib/look.js';
import { POOL_GLSL, POOL_UNIFORMS } from '/song/lib/x-shame-pool.js';
import { SHAME_GLSL, SHAME_UNIFORMS } from '/song/lib/x-shame.js';
import { cameraPlane } from '/engine.js';
export const kind = 'shader';

export default (P) => {
  const [L] = linesAt(P.from - 2.5, 'Who told you');
  const tDrop = wordIn(L, 'told').start + 0.05;
  const cam = (t) => {
    const k = ease.inOut3((t - P.from) / (P.to - P.from));
    const d = drift(t, 0.002);
    return { pos: [0.0 + d[0], 0.3 - 0.02 * k + d[1], -0.2 + 0.05 * k], target: [0.04, 0.0, 0.68 + 0.04 * k], fov: 36, roll: 0.008 };
  };
  return {
    name: 's27-who-told', from: P.from, to: P.to,
    frag: SHAME_GLSL + POOL_GLSL + /* glsl */ `
vec3 shade(vec2 fc) { vec3 ro; vec3 rd = shLens(fc, ro); return poolScene(ro, rd); }`,
    uniforms: { ...SHAME_UNIFORMS, ...POOL_UNIFORMS, uDrop: [0.07, 0.6, tDrop], uStar: [0.04, 0.42, 1.0], uAperS: 0.0018, uFocusS: 0.85, uCalm: 0.85,
      uCold: 1, uDusk: 1, uLeafN: 30, uLeafC: [0.1, 1.5, 4.6], uLeafS: [4.4, 1.0, 2.0], uLeafSize: 0.34, uLeafSeed: 11, uLeafCurl: 0.4, uLeafPart: 0.4, uWind: 0.05 },
    camera: cam,
    update(t, u) { u.uWT.value = t * 0.05; u.uLeafFloat.value = [0.24 - 0.004 * (t - P.from), 0, 0.3 + 0.005 * (t - P.from), 2.2 + 0.012 * (t - P.from)]; },
    textPlane(t, c) { return cameraPlane(c, { width: 1, dist: 1, aspect: 16 / 9 }); },
    post(t) { return grade(t, { exposure: 1.25, bloom: 0.16, threshold: 0.8, saturation: 0.9, contrast: 1.06, vignette: 0.55, lift: [0.006, 0.008, 0.014], gain: [0.95, 1.0, 1.05] }); },
    finish(t) { return { grade: { shadows: [0.0, 0.01, 0.03], highlights: [0.95, 0.98, 1.0], amount: 0.4 } }; },
  };
};
