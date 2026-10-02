// 14 · instrumental surge (after "...what is good and what is evil.")
// The guitars surge and the moment turns: a gale slams across the meadow. Low in the grass beside the
// great tree, looking into the sun through its crown: the crown thrashes, the grass flattens in waves
// that run toward us, petals and leaves stream past the lens, the sun strobes through the moving
// leaves, the camera taking the hits on the drums. Then the wind drops and we are under the branches.
import { grade, ease, clamp01, mix, keys, beats } from '/song/lib/look.js';
import { GARDEN_GLSL, GARDEN_UNIFORMS } from '/song/lib/x-garden.js';
import { NEAR_GLSL, FLAKES_GLSL } from '/song/lib/x-garden-near.js';
import { cameraPlane } from '/engine.js';
import { FINISH } from '/premium/finish.js';

export const kind = 'shader';

// the gale: slams in on the first beat, holds, falls away over the last beat or two
function gale(t, P) {
  const D = P.to - P.from;
  return clamp01((t - P.from + 0.05) / 0.25) * (1 - ease.inOut3(clamp01((t - (P.to - 0.3 * D)) / (0.28 * D))));
}
// a hit on each beat that settles fast (handheld taking the drums)
function hits(t, P) {
  let x = 0, y = 0;
  for (const b of beats) {
    if (b < P.from - 0.01 || b > t) continue;
    const k = t - b, e = Math.exp(-k * 7) * Math.sin(k * 26);
    const s = Math.sin(b * 13.1), c = Math.cos(b * 7.7);
    x += e * s; y += e * c;
  }
  return [x, y];
}

export function surgeCamera(P) {
  return (t) => {
    const u = clamp01((t - P.from) / (P.to - P.from));
    const k = ease.inOut3(u);
    const g = gale(t, P);
    const [hx, hy] = hits(t, P);
    const amp = 0.06 * g;
    const pos = mix([-205.5, 2.8, -121.5], [-208.6, 3.05, -106.5], k);
    const tgt = mix([-209.5, 7.2, -100.0], [-210.5, 9.5, -96.0], k);
    return {
      pos: [pos[0] + hx * amp * 0.5, pos[1] + hy * amp * 0.4, pos[2]],
      target: [tgt[0] + hx * amp * 6, tgt[1] + hy * amp * 5, tgt[2]],
      fov: 48 - 4 * k, roll: 0.015 * hx * g, focus: mix(14, 5, k), aperture: 0.014,
    };
  };
}

export default (P) => {
  const cam = surgeCamera(P);
  return {
    name: 's14-surge', from: P.from, to: P.to,
    frag: GARDEN_GLSL + NEAR_GLSL + FLAKES_GLSL + /* glsl */ `
vec3 shade(vec2 fc) {
  vec3 ro; vec3 rd = lensRay(fc, ro);
  float jit = hash12(fc + fract(uTime * 7.31) * 57.0);
  float depth;
  vec3 c = gardenWide(ro, rd, jit, depth);
  float tg = grassMarch(ro, rd, depth, jit, 22.0);
  if (tg > 0.0) { c = fogW(shadeGrass(ro, rd, tg), ro, rd, tg); depth = tg; }
  c = flakesOver(c, ro, rd, depth);
  return c;
}`,
    uniforms: { ...GARDEN_UNIFORMS, uGrassH: 0.85, uWind: 1, uSurge: 0, uLeafT: 50, uFocus: 14, uAperture: 0.014, uFlakes: 0, uFlakeV: [-1.5, 0.4, -9] },
    camera: cam,
    textPlane(t, c) { return cameraPlane(c, { width: 1, dist: 1, aspect: 16 / 9 }); },
    update(t, u) {
      const c = cam(t), g = gale(t, P);
      u.uFocus.value = c.focus; u.uAperture.value = c.aperture;
      u.uSurge.value = g;
      u.uWind.value = 1 + 2.4 * g;
      u.uFlakes.value = Math.round(60 * clamp01(g * 1.4));
      u.uFlakeV.value.set(-2.2 * g, 0.5 * g, -12 * g - 1);
    },
    post(t) { return grade(t, { exposure: 1.0, bloom: 0.17, threshold: 0.95, vignette: 0.48 }); },
    finish(t) { return { grade: FINISH.film.grade, flare: { amount: 0.03 * gale(t, P) + 0.015, threshold: 0.97, tint: [1.0, 0.8, 0.55], length: 0.14 } }; },
  };
};
