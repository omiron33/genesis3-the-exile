// 21 · "That afternoon they heard His voice,"
// After the eating: the same meadow, now cold and exposed under a blue-grey late afternoon. A breeze
// comes through the garden toward us: the grass parts in one long wave that runs at the lens, the
// leaves of the trees it passes turn their silver undersides; behind the trees a warm light rises,
// the only warmth in the picture.
import { grade, ease, clamp01, drift, mix, keys } from '/song/lib/look.js';
import { GARDEN_GLSL, GARDEN_UNIFORMS } from '/song/lib/x-garden.js';
import { NEAR_GLSL } from '/song/lib/x-garden-near.js';
import { cameraPlane } from '/engine.js';
import { FINISH } from '/premium/finish.js';

export const kind = 'shader';

export function voiceCamera(P) {
  return (t) => {
    const u = clamp01((t - P.from) / (P.to - P.from));
    const k = ease.inOut3(u);
    const d = drift(t, 0.02);
    const pos = [-182 + d[0], 2.95 + 0.1 * k + d[1], -176 + 3 * k];
    return { pos, target: [-190, 4.6 + 0.6 * k, -60], fov: 40, roll: -0.004, focus: 40, aperture: 0.01 };
  };
}

export default (P) => {
  const cam = voiceCamera(P);
  const D = P.to - P.from;
  return {
    name: 's21-voice', from: P.from, to: P.to,
    frag: GARDEN_GLSL + NEAR_GLSL + /* glsl */ `
vec3 shade(vec2 fc) {
  vec3 ro; vec3 rd = lensRay(fc, ro);
  float jit = hash12(fc + fract(uTime * 7.31) * 57.0);
  float depth;
  vec3 c = gardenWide(ro, rd, jit, depth);
  float tg = grassMarch(ro, rd, depth, jit, 30.0);
  if (tg > 0.0) { c = fogW(shadeGrass(ro, rd, tg), ro, rd, tg); depth = tg; }
  c = presenceGlow(c, ro, rd, depth);
  return c;
}`,
    uniforms: { ...GARDEN_UNIFORMS, uCold: 1, uSunDir: [-0.5, 0.35, 0.8], uGrassH: 0.8, uWind: 0.7, uLeafT: 70, uFocus: 40, uAperture: 0.01, uHaze: 1.4,
      uWaveZ: 40, uWaveAmt: 0, uPres: [-196, 0, -8], uPresAmt: 0 },
    camera: cam,
    textPlane(t, c) { return cameraPlane(c, { width: 1, dist: 1, aspect: 16 / 9 }); },
    update(t, u) {
      const c = cam(t), x = clamp01((t - P.from) / D);
      u.uFocus.value = c.focus; u.uAperture.value = c.aperture;
      // the wave runs from beyond the trees to the lens over the shot
      u.uWaveZ.value = mix(-20, -178, ease.inOut3(clamp01(x / 0.95)));
      u.uWaveAmt.value = 2.2 * clamp01(x * 4);
      // the warm light rises behind the trees
      const r = ease.out3(clamp01((x - 0.15) / 0.8));
      u.uPres.value.set(-200, -4 + 9 * r, 10);
      u.uPresR.value = 9; u.uPresTall.value = 0.25;
      u.uPresAmt.value = 0.2 + 1.1 * r;
    },
    post(t) { return grade(t, { exposure: 1.45, bloom: 0.16, saturation: 0.9, contrast: 1.04, gain: [0.96, 0.99, 1.04] }); },
    finish(t) { return { grade: { shadows: [0.0, 0.02, 0.05], highlights: [1.0, 0.95, 0.9], amount: 0.45 } }; },
  };
};
