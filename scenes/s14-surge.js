// 14 · instrumental surge (after "...what is good and what is evil.")
// The guitars surge and the moment turns toward the taking. A gale hits the garden: low in the meadow
// below the rise, the great tree on the hill ahead with the low sun behind it. On the first beat the
// wind arrives: the crown thrashes and leans, the sun strobes through the moving limbs, broad waves of
// laid grass run across the meadow toward the tree. The camera
// pushes in hard and low, taking the drums, and ends under the edge of the crown looking up at the red
// fruit swinging on its twigs (where s15 picks up, under the branches). No particles in the air.
import { grade } from '/song/lib/look.js';
import { SURGE_GLSL, SURGE_UNIFORMS, surgeCamera, gale } from '/song/lib/x-garden-surge.js';
import { cameraPlane } from '/engine.js';
import { FINISH } from '/premium/finish.js';

export const kind = 'shader';

export default (P) => {
  const cam = surgeCamera(P);
  return {
    name: 's14-surge', from: P.from, to: P.to,
    frag: SURGE_GLSL,
    uniforms: { ...SURGE_UNIFORMS },
    camera: cam,
    textPlane(t, c) { return cameraPlane(c, { width: 1, dist: 1, aspect: 16 / 9 }); },
    update(t, u) {
      const c = cam(t), g = gale(t, P), s = t - P.from;
      u.uFocus.value = c.focus; u.uAper.value = c.aperture;
      u.uGale.value = g;
      u.uTreeWind.value = 0.12 + 0.88 * g;
      u.uTreeShiver.value = 1.0 * g;
      // the waves run toward the tree at about 9 m/s (phase in band-widths)
      u.uWaveT.value = s * 1.6;
    },
    post(t) { return grade(t, { exposure: 1.0, bloom: 0.17, threshold: 0.95, vignette: 0.5, contrast: 1.06 }); },
    finish(t) { return { grade: FINISH.film.grade, flare: { amount: 0.03 * gale(t, P) + 0.015, threshold: 0.97, tint: [1.0, 0.8, 0.55], length: 0.14 } }; },
  };
};
