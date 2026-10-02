// 30 · "To the woman God said: / What have you done?"
// Close on the woman, only ever a silhouette: she stands among dark leaves against the cold dusk
// sky, head bowed, a thin cold rim of light along her hair and shoulder. When the question comes she
// bows lower and turns away, toward the grass.
import { ease, linesAt, wordIn, clamp } from '/song/lib/look.js';
import { shameShot, prog } from '/song/lib/x-shame.js';
export const kind = 'shader';

export default (P) => {
  const [L1, L2] = linesAt(P.from - 2.5, 'To the woman God said', 'What have you done');
  const tWhat = L2.words[0].start, tDone = wordIn(L2, 'done').start;
  const turn = (t) => ease.inOut3(clamp((t - tDone + 0.2) / 1.6, 0, 1));
  const cam = (t) => {
    const k = prog(P, t);
    return { pos: [0.7 - 0.35 * k, 1.35, -3.2 + 0.5 * k], target: [0.05, 1.2 - 0.05 * k, 4.0], fov: 24, focus: 7.2 - 0.5 * k, aperture: 0.05 };
  };
  return shameShot(P, {
    name: 's30-what', cam, drift: 0.004, far: 90,
    defines: '#define SH_FIGS\n#define SH_LEAVES\n#define SH_BUSH\n',
    uniforms: { uGrassH: 0.28, uCold: 1.0, uDusk: 0.45, uDens: 0.75, uClear: [0.0, 12.0, 11.0], uFog: 0.01, uMist: 0.02, uCanopy: 0.2, uSunK: 4.0, uSunSh: 1.0, uSunHard: 0.6,
      uSunD: [-0.25, 0.12, 1.0], uFigOn: [0, 1, 0],
      uLeafN: 36, uLeafC: [0.5, 1.05, -1.75], uLeafS: [0.6, 0.6, 0.4], uLeafSize: 0.2, uLeafSeed: 13, uLeafCurl: 0.5, uLeafDark: 0.65, uLeafPart: 0.0 },
    update(t, u) {
      const k = turn(t);
      // she breathes; her head is bowed and goes lower; she turns away toward the grass
      const br = 0.015 * Math.sin((t - P.from) * 1.4);
      u.uFigB.value.set(0.0, 4.0, 2.35 + 0.6 * k);
      u.uPoseB.value.set(0.0, 0.0, 0.75 + 0.35 * ease.inOut3(clamp((t - tWhat) / 2.0, 0, 1)) + br);
      u.uWind.value = 0.18; u.uWT.value = (t - P.from) * 0.3;
    },
  });
};
