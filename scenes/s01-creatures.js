// 01 · "Among the creatures the Lord God formed,"
// The good creation before the fall. Low in a wide golden meadow by the river, tall grass and
// wildflowers moving in the breeze, the light coming toward us through it; a flock of small birds
// wheels low across the frame and drops into the grass; deer graze far off in the haze. The camera
// drifts toward the great tree at the meadow's edge until a bough of it fills the right of frame.
import { grade, ease, clamp01, drift, mix } from '/song/lib/look.js';
import { GARDEN_GLSL, GARDEN_UNIFORMS } from '/song/lib/x-garden.js';
import { NEAR_GLSL, CREATURES_GLSL } from '/song/lib/x-garden-near.js';
import { cameraPlane } from '/engine.js';
import { FINISH } from '/premium/finish.js';

export const kind = 'shader';

export function meadowCamera(P) {
  return (t) => {
    const u = clamp01((t - P.from) / (P.to - P.from));
    const k = ease.inOut3(u);
    const d = drift(t, 0.03);
    // from the open meadow toward the tree (HEROM = -210, -102), finishing beside its crown
    const pos = mix([-188, 3.25, -146], [-200.5, 3.4, -116], k);
    const target = mix([-192, 4.2, -40], [-199, 6.4, -50], k);
    return { pos: [pos[0] + d[0], pos[1] + d[1], pos[2]], target, fov: 44 - 4 * k, roll: 0.006 * Math.sin(t * 0.5), focus: mix(60, 30, k), aperture: 0.012 };
  };
}

export default (P) => {
  const cam = meadowCamera(P);
  return {
    name: 's01-creatures', from: P.from, to: P.to,
    frag: GARDEN_GLSL + NEAR_GLSL + CREATURES_GLSL + /* glsl */ `
vec3 shade(vec2 fc) {
  vec3 ro; vec3 rd = lensRay(fc, ro);
  float jit = hash12(fc + fract(uTime * 7.31) * 57.0);
  float depth;
  vec3 c = gardenWide(ro, rd, jit, depth);
  float tg = grassMarch(ro, rd, depth, jit, 30.0);
  if (tg > 0.0) { c = fogW(shadeGrass(ro, rd, tg), ro, rd, tg); depth = tg; }
  c = deerOver(c, ro, rd, depth, vec4(-150.0, 0.0, -30.0, 1.0), 1.0);
  c = deerOver(c, ro, rd, depth, vec4(-143.0, 0.0, -24.0, -1.0), 2.0);
  c = deerOver(c, ro, rd, depth, vec4(-160.0, 0.0, -18.0, 1.0), 3.0);
  c = deerOver(c, ro, rd, depth, vec4(-226.0, 0.0, -40.0, -1.0), 4.0);
  c = birdsOver(c, ro, rd, depth);
  return c;
}`,
    uniforms: { ...GARDEN_UNIFORMS, uGrassH: 0.75, uReeds: 0, uWind: 1.1, uLeafT: 60, uFocus: 60, uAperture: 0.012,
      uB0: [-176, 6.5, -112], uB1: [-192, 4.2, -116], uB2: [-207, 2.4, -104], uFlockT: 0, uFlockN: 22 },
    camera: cam,
    textPlane(t, c) { return cameraPlane(c, { width: 1, dist: 1, aspect: 16 / 9 }); },
    update(t, u) {
      const c = cam(t);
      u.uFocus.value = c.focus; u.uAperture.value = c.aperture;
      u.uFlockT.value = clamp01((t - P.from - 0.4) / ((P.to - P.from) * 0.85));
    },
    post(t) { return grade(t, { exposure: 1.0, bloom: 0.14, vignette: 0.45, saturation: 1.06 }); },
    finish(t) { return { ...FINISH.film, leak: { amount: 0.1, warm: [1.0, 0.6, 0.3], cool: [0.9, 0.5, 0.4], speed: 0.05 } }; },
  };
};
