// 30 · "To the woman God said: / What have you done?"
// Over her shoulder. The woman stands in the foreground, only ever a dark shape seen from behind:
// her bowed head, her long hair, her right shoulder, soft and close at the left of frame. Beyond
// her, low among the dark trunks of the dusk garden, the warm light that is His presence stands
// facing her. The focus rests on the light; on "What have you done?" it comes back to her, the warm
// light rimming her hair, and she bows lower and turns a little away.
import { ease, linesAt, wordIn, clamp } from '/song/lib/look.js';
import { shameShot, prog } from '/song/lib/x-shame.js';
import { humanAtlas, humanGLSL, rampPose, rampKeys } from '/song/lib/x-human.js';
export const kind = 'shader';

const HER = [0.0, 4.0];          // where she stands (x, z); she faces +z, toward the light
const GOD = [1.3, 1.55, 15.5];   // the light, low among the trunks

export default async (P) => {
  // her head and shoulders at 4 mm (lib/x-human.js), bowing from "bow" to "bowlow"
  const HB = await humanAtlas(rampKeys('woman-leaves-bust-low', 3));
  const [L1, L2] = linesAt(P.from - 2.5, 'To the woman God said', 'What have you done');
  const tWhat = L2.words[0].start, tDone = wordIn(L2, 'done').start;
  const bow = (t) => 0.15 * ease.inOut3(clamp((t - P.from) / 2.0, 0, 1)) + 0.6 * ease.inOut3(clamp((t - tWhat + 0.2) / 2.4, 0, 1));
  const turn = (t) => ease.inOut3(clamp((t - tDone + 0.1) / 1.8, 0, 1));
  const rack = (t) => ease.inOut3(clamp((t - (tWhat - 0.35)) / 0.9, 0, 1));
  const cam = (t) => {
    const k = prog(P, t);
    // behind her right shoulder, easing in a little closer as the question comes
    const pos = [HER[0] - 0.52 + 0.05 * k, 1.3 - 0.03 * k, HER[1] - 1.15 + 0.1 * k];
    const tgt = [1.1 - 0.2 * k, 1.75, 16.0];
    const fNear = 1.02 - 0.08 * k, fFar = 11.5;
    return { pos, target: tgt, fov: 38, focus: fFar + (fNear - fFar) * rack(t), aperture: 0.024 - 0.012 * rack(t) };
  };
  return shameShot(P, {
    name: 's30-what', cam, drift: 0.003, far: 90, shafts: 0.8,
    defines: '#define SH_FIGS\n#define SH_BUSH\n#define SH_HUMAN\n#define HUM_NEPS 0.006\n#define SH_HUM_B\n#define HUM_RIM 2.4\n' + humanGLSL(['uHumB']),
    uniforms: { uGrassH: 0.28, uCold: 1.0, uDusk: 0.5, uDens: 0.85, uClear: [0.4, 9.0, 5.0], uFog: 0.01, uMist: 0.02, uCanopy: 0.35, uSunK: 2.0, uSunSh: 0.0, uSunHard: 0.0,
      uSunD: [-0.25, 0.12, 1.0], uGodK: 0.7, uGodR: 5.0, uGodScat: 0.16, uGodP: GOD, uFigOn: [0, 1, 0], ...HB.uniforms('uHumB') },
    update(t, u) {
      const br = 0.03 * Math.sin((t - P.from) * 1.5);
      u.uFigB.value.set(HER[0], HER[1], -0.12 - 0.4 * turn(t));
      u.uPoseB.value.set(...rampPose(HB, 'woman-leaves-bust-low', 3, bow(t) + br * (1 - bow(t))));
      u.uGodP.value.set(GOD[0] + 0.25 * Math.sin((t - P.from) * 0.35), GOD[1], GOD[2]);
      u.uWind.value = 0.16; u.uWT.value = (t - P.from) * 0.25;
    },
  });
};
