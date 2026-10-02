// s53-to-work: "from the garden of Delight to work / the earth from which he came."
// Outside, on the barren plain at night. Far behind, the gate of Delight glows in the dark wall and
// lays a soft fan of light across the cracked ground; a lone small silhouette walks out of that light
// toward the dark land, his long shadow reaching toward us. The camera, low on the dust, drifts back
// with him; the gate is a soft warm blur behind, the walker in focus.
import { grade, ease, clamp01, drift } from '/song/lib/look.js';
import { exileScene } from '/song/lib/x-exile-scene.js';
import { groundH, lerp } from '/song/lib/x-exile.js';
export const kind = 'shader';

export default (P) => {
  const D = P.to - P.from;
  // the walker: out of the gate's light, toward the camera's left, a slow tired walk
  const W0 = [1.5, -70.0], dir = (() => { const v = [-0.36, -1.0]; const l = Math.hypot(...v); return [v[0] / l, v[1] / l]; })();
  const speed = 1.05;
  const walkPos = (t) => { const s = speed * (t - P.from); return [W0[0] + dir[0] * s, W0[1] + dir[1] * s]; };
  const cam = (t) => {
    const k = clamp01((t - P.from) / D);
    const d = drift(t, 0.02);
    const w = walkPos(t);
    const x = 8.0 - 5.0 * k, z = -97.0 - 7.5 * k;
    const y = groundH(x, z) + 0.9 + 0.25 * k;
    const wy = groundH(w[0], w[1]);
    const tgt = [lerp(w[0], 0.0, 0.25), wy + 4.0 + 0.6 * k, lerp(w[1], 0.0, 0.25)];
    const focus = Math.hypot(w[0] - x, wy + 1 - y, w[1] - z);
    return { pos: [x + d[0], y + d[1], z], target: tgt, fov: 42, focus, aperture: 0.03 };
  };
  return exileScene(P, {
    name: 's53-to-work', cam,
    set: (t) => {
      const w = walkPos(t);
      return { uGlow: 1.0, uLife: 0.6, uWalker: 1.0, uWalkP: [w[0], 0, w[1]], uWalkD: [dir[0], 0, dir[1]], uWalkPh: (t - P.from) * speed / 0.68 * Math.PI };
    },
    post: (t) => grade(t, { exposure: 3.2, bloom: 0.14, threshold: 0.9, contrast: 1.05, saturation: 1.0, vignette: 0.6, lift: [0.004, 0.005, 0.01], grain: 0.018 }),
    finish: (t) => ({ grade: { shadows: [0.0, 0.012, 0.05], highlights: [1.0, 0.93, 0.8], amount: 0.5 } }),
  });
};
