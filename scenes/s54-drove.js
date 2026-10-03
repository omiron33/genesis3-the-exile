// s54-drove: "He drove Adam out and settled him / across from Delight's garden."
// Wide, across the valley: on the far slope a small campfire burns among stones, a figure seated by
// it in a cloak of skin, hunched toward the warmth. Across the dark valley the long wall of the garden
// stands against the stars, the warm glow of Delight rising behind it and the gate a bright slit.
// The camera pushes slowly past the fire toward the gate.
import { grade, ease, clamp01, drift } from '/song/lib/look.js';
import { exileScene } from '/song/lib/x-exile-scene.js';
import { groundH } from '/song/lib/x-exile.js';
import { exileHuman } from '/song/lib/x-exile-human.js';
export const kind = 'shader';

export default async (P) => {
  // the man seated by his fire in his garment of skin (lib/x-exile-human.js)
  const HU = await exileHuman({ rim: 1.0 });
  const D = P.to - P.from;
  const FIRE = [-6.0, -352.0];
  const cam = (t) => {
    const k = clamp01((t - P.from) / D);
    const e = ease.inOut3(k);
    const d = drift(t, 0.015);
    const x = -9.5 + 3.0 * e, z = -366.0 + 6.0 * e;
    const y = groundH(x, z) + 3.4 - 0.5 * e;
    const fy = groundH(FIRE[0], FIRE[1]);
    return { pos: [x + d[0], y + d[1], z], target: [-1.0 + 0.5 * e, 2.0 - 1.0 * e, 0.0], fov: 46 - 5 * e, focus: 300, aperture: 0.0 };
  };
  return exileScene(P, {
    name: 's54-drove', cam, pre: HU.pre, uniforms: HU.uniforms,
    set: (t) => ({ uGlow: 1.0, uLife: 0.6, uCamp: 1.0, uSitter: 1.0, uCampC: [FIRE[0], 0, FIRE[1]] }),
    post: (t) => grade(t, { exposure: 3.2, bloom: 0.16, threshold: 0.85, contrast: 1.05, saturation: 1.0, vignette: 0.55, lift: [0.004, 0.005, 0.01], grain: 0.018 }),
    finish: (t) => ({ flare: { amount: 0.1, threshold: 1.1, tint: [1.0, 0.7, 0.45], length: 0.25 }, grade: { shadows: [0.0, 0.012, 0.05], highlights: [1.0, 0.93, 0.8], amount: 0.5 } }),
  });
};
