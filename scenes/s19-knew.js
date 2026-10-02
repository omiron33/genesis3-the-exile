// 19 · "Then both could see, and knew / their nakedness. They joined"
// The same garden, suddenly exposed. A wide, low, empty meadow at the edge of the trees, two small
// figures standing apart far off. It opens in the last gold of Paradise; as their eyes open, cloud
// closes over the sun and the whole grade drains, across the shot, to a cold blue-grey. The wind
// dies with it (the grass slows but never stops). The camera creeps in, low, uneasy.
import { ease, linesAt, wordIn, clamp } from '/song/lib/look.js';
import { shameShot, prog } from '/song/lib/x-shame.js';
export const kind = 'shader';

export default (P) => {
  const [L1, L2] = linesAt(P.from - 2.5, 'Then both could see', 'their nakedness');
  const tSee = wordIn(L1, 'see').start, tNaked = wordIn(L2, 'naked').start;
  // the drain: begins as they see, complete just after "nakedness"
  const cold = (t) => ease.inOut3(clamp((t - (tSee - 0.2)) / (tNaked + 0.6 - (tSee - 0.2)), 0, 1));
  const wind = (t) => 0.08 + 0.55 * (1 - ease.inOut3(clamp((t - tSee) / 2.6, 0, 1)));
  // wind time: the integral of wind strength, so the grass slows without jumping
  const wt = (t) => { let s = 0; const n = 64, h = (t - P.from) / n; for (let i = 0; i < n; i++) s += wind(P.from + (i + 0.5) * h) * h; return s * 2.0; };
  const cam = (t) => {
    const k = prog(P, t, (x) => x);
    const e = ease.inOut3(k);
    return { pos: [0.4 * e, 1.45 - 0.08 * e, 2.6 * e], target: [1.2 + 0.6 * e, 3.6 - 0.3 * e, 40], fov: 34, focus: 21, aperture: 0.045, roll: -0.004 };
  };
  return shameShot(P, {
    name: 's19-knew', cam, drift: 0.006, far: 140,
    defines: '#define SH_FIGS\n#define SH_BUSH\n',
    uniforms: { uGrassH: 0.38, uCold: 0, uDusk: 0.0, uDens: 0.55, uClear: [1.5, 12, 19], uFog: 0.004, uMist: 0.0, uSunD: [-0.55, 0.1, 1.0],
      uFigA: [-1.2, 21.0, 0.25], uFigB: [3.2, 23.5, -0.3], uFigOn: [1, 1, 0], uPoseA: [0, 0, 0], uPoseB: [0, 0, 0] },
    update(t, u) {
      const c = cold(t);
      u.uCold.value = c;
      u.uWind.value = wind(t);
      u.uWT.value = wt(t);
      // the sun goes behind the cloud: its direction stays, its light drains into the overcast
      u.uFog.value = 0.006 + 0.012 * c;
      // they stand still, the man's head lowering first, then hers
      const bA = 0.6 * ease.inOut3(clamp((t - tNaked + 0.3) / 1.6, 0, 1));
      const bB = 0.75 * ease.inOut3(clamp((t - tNaked - 0.1) / 1.6, 0, 1));
      u.uPoseA.value.set(0, 0, bA + 0.02 * Math.sin(t * 1.3));
      u.uPoseB.value.set(0, 0, bB + 0.02 * Math.sin(t * 1.1 + 1));
    },
    post(t) { const c = cold(t); return { saturation: 1.08 - 0.22 * c, gain: [1.04 - 0.08 * c, 1.0, 0.95 + 0.09 * c], lift: [0.012 - 0.004 * c, 0.011, 0.01 + 0.008 * c], contrast: 1.05 }; },
    finish(t) { const c = cold(t); return { grade: { shadows: [0.03 * (1 - c), 0.015, 0.035 * c], highlights: [1.0 - 0.05 * c, 0.95, 0.85 + 0.15 * c], amount: 0.45 } }; },
  });
};
