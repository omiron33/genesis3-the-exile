// 06 · "from trees throughout the garden."
// The whole gift. We begin inside an orchard tree's crown, leaves close round the lens and the sun
// breaking through them, and rise straight up through it; the camera crests the canopy and the
// orchard spreads away in rows over the rolling hills, rivers shining between, and far off on its rise
// the one dark tree at the centre, with the pale white-gold tree of life beyond the far river.
import { grade, ease, clamp01, drift, mix, keys } from '/song/lib/look.js';
import { GARDEN_GLSL, GARDEN_UNIFORMS, orchardGround } from '/song/lib/x-garden.js';
import { NEAR_GLSL } from '/song/lib/x-garden-near.js';
import { cameraPlane } from '/engine.js';
import { FINISH } from '/premium/finish.js';

export const kind = 'shader';

const X = 162.4, Z = 256.6;
const G = orchardGround(X, Z);

export function riseCamera(P) {
  return (t) => {
    const u = clamp01((t - P.from) / (P.to - P.from));
    const k = ease.inOut3(u);
    const d = drift(t, 0.02);
    const y = G + 4.4 + 15 * k;
    const z = Z + 10 * k;
    // look up through the leaves at first, then level out toward the tree on its rise
    const look = mix([X - 2, y + 4.5, z + 6], [X - 160 * 0.06, y + 0.2 - 0.3 * k, z + 1240 * 0.06], ease.inOut3(clamp01((u - 0.1) / 0.75)));
    const focus = keys(t, [[P.from, 2.0], [P.from + 0.45 * (P.to - P.from), 3.5], [P.from + 0.75 * (P.to - P.from), 120]]);
    return { pos: [X + d[0], y + d[1], z], target: look, fov: 52 - 8 * k, roll: 0.02 * (1 - k), focus, aperture: 0.015 };
  };
}

export default (P) => {
  const cam = riseCamera(P);
  return {
    name: 's06-orchard', from: P.from, to: P.to,
    frag: GARDEN_GLSL + NEAR_GLSL + /* glsl */ `
vec3 shade(vec2 fc) {
  vec3 ro; vec3 rd = lensRay(fc, ro);
  float jit = hash12(fc + fract(uTime * 7.31) * 57.0);
  float depth;
  vec3 c = gardenWide(ro, rd, jit, depth);
  return c;
}`,
    uniforms: { ...GARDEN_UNIFORMS, uWind: 0.9, uLeafT: 45, uFocus: 2, uAperture: 0.015, uHaze: 1.3 },
    camera: cam,
    textPlane(t, c) { return cameraPlane(c, { width: 1, dist: 1, aspect: 16 / 9 }); },
    update(t, u) { const c = cam(t); u.uFocus.value = c.focus; u.uAperture.value = c.aperture; },
    post(t) { return grade(t, { exposure: keys(t, [[P.from, 1.35], [P.from + 0.5 * (P.to - P.from), 1.1], [P.to, 0.92]]), bloom: 0.15, vignette: 0.45 }); },
    finish(t) { return { grade: FINISH.film.grade }; },
  };
};
