// s52-sent: "So the Lord God sent him". The camera pulls back out of the garden of Delight along the
// path, low, through the great gate of rock and trees, and out onto the dark plain: the garden glows
// behind the gate, and the gate closes the frame round it as we leave.
import { grade, ease, clamp01, drift } from '/song/lib/look.js';
import { exileScene } from '/song/lib/x-exile-scene.js';
export const kind = 'shader';

export default (P) => {
  const D = P.to - P.from;
  const cam = (t) => {
    const k = clamp01((t - P.from) / D);
    const p = 1 - Math.pow(1 - k, 1.8);           // fast at first (it carries the pull-back in), slowing
    const d = drift(t, 0.03);
    const z = 30 - 92 * p;
    const y = 2.2 + 5.0 * ease.inOut3(k);
    return { pos: [0.4 * Math.sin(k * 2.2) + d[0], y + d[1], z], target: [0.0, 5.0 + 9.0 * k, z + 60], fov: 50 - 4 * k, focus: 40, aperture: 0.0 };
  };
  return exileScene(P, {
    name: 's52-sent', cam,
    set: (t) => ({ uGlow: 1.0, uLife: 0.6, uExpo: 1.0 }),
    post: (t) => grade(t, { exposure: 2.4, bloom: 0.14, threshold: 0.9, contrast: 1.04, saturation: 1.02, vignette: 0.55, lift: [0.004, 0.005, 0.009], grain: 0.03 }),
    finish: (t) => ({ grade: { shadows: [0.0, 0.01, 0.04], highlights: [1.0, 0.93, 0.8], amount: 0.45 } }),
  });
};
