// 29 · "Adam said: The woman You gave / to live beside me handed me / its fruit; I ate."
// Cold open grass at the end of the afternoon. A low, white, cold sun has broken under the cloud
// behind them, and two figures stand apart on the grass with their long shadows running toward us.
// As he speaks, the gap between the shadows widens; on "the woman" he turns toward her, and his
// shadow swings across the grass toward hers.
import { ease, linesAt, wordIn, clamp } from '/song/lib/look.js';
import { shameShot, prog } from '/song/lib/x-shame.js';
import { humanAtlas, humanGLSL, rampPose, rampKeys } from '/song/lib/x-human.js';
export const kind = 'shader';

export default async (P) => {
  // the man and the woman, MakeHuman figures in their fig-leaf girdles (lib/x-human.js)
  const HA = await humanAtlas(rampKeys('man-leaves-blame', 3));
  const HB = await humanAtlas(rampKeys('woman-leaves-bow', 3));
  const [L1, L2, L3] = linesAt(P.from - 2.5, 'Adam said', 'to live beside me', 'its fruit');
  const tWoman = wordIn(L1, 'woman').start, tHanded = wordIn(L2, 'handed').start;
  const cam = (t) => {
    const k = prog(P, t);
    return { pos: [0.3 - 0.5 * k, 0.78 + 0.05 * k, 0.0 - 0.6 * k], target: [0.1, 0.95, 26], fov: 17, focus: 24.5, aperture: 0.075 };
  };
  return shameShot(P, {
    name: 's29-blame', cam, drift: 0.008, far: 140,
    defines: '#define SH_FIGS\n#define SH_BUSH\n#define SH_STEPS 170\n#define SH_HUMAN\n#define SH_HUM_A\n#define SH_HUM_B\n#define HUM_RIM 0.8\n' + humanGLSL(['uHumA', 'uHumB']),
    uniforms: { uCold: 1.0, uDusk: 0.3, uDens: 0.7, uClear: [0.0, 30.0, 36.0], uFog: 0.007, uMist: 0.0, uSunK: 5.0, uSunSh: 1.0, uSunHard: 1.0, uGrassH: 0.6, uGrassFar: 40.0,
      uSunD: [-0.3, 0.085, 1.0], uFigOn: [1, 1, 0], ...HA.uniforms('uHumA'), ...HB.uniforms('uHumB') },
    update(t, u) {
      u.uWind.value = 0.22; u.uWT.value = t * 0.22;
      // they drift apart: her small steps away, his weight shifting the other way
      const apart = ease.inOut3(clamp((t - P.from) / (P.to - P.from), 0, 1));
      const xB = 0.9 + 1.0 * apart, xA = -0.9 - 0.3 * apart;
      // he turns from the light toward her on "the woman", and stays turned on her
      const tn = ease.inOut3(clamp((t - (tWoman - 0.3)) / 1.0, 0, 1));
      const hand = ease.inOut3(clamp((t - (tHanded - 0.2)) / 0.8, 0, 1));
      u.uFigA.value.set(xA, 24.0, Math.PI + 1.25 * tn);
      // she has turned from him, toward the cold light, and turns further away as he speaks
      u.uFigB.value.set(xB, 25.0 + 0.8 * apart, 0.55 - 0.5 * apart);
      // his open hand comes up toward her on "handed"; her head goes down as they part
      u.uPoseA.value.set(...rampPose(HA, 'man-leaves-blame', 3, hand));
      u.uPoseB.value.set(...rampPose(HB, 'woman-leaves-bow', 3, 0.35 + 0.65 * apart));
    },
  });
};
