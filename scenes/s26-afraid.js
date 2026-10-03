// 26 · "I heard You walking in the garden; / naked, I was afraid, / and hid."
// Inside the leaves, looking out. Fig leaves all round the lens, close and trembling, dark against
// the dusk; through the gaps, far off among the trunks, the warm light waits. The leaves move like
// breath: slow, in and out. On "and hid" they part a little, as if the light has seen through them.
import { ease, linesAt, wordIn, clamp } from '/song/lib/look.js';
import { shameShot, prog } from '/song/lib/x-shame.js';
import { humanAtlas, humanGLSL } from '/song/lib/x-human.js';
export const kind = 'shader';

export default async (P) => {
  // the man himself, hiding: his dark head and shoulder among the leaves at the right of frame, looking
  // out at the light with us (a MakeHuman figure, lib/x-human.js)
  const HA = await humanAtlas(['man-leaves-bust-peer']);
  const [, L2, L3] = linesAt(P.from - 2.5, 'I heard You walking', 'naked, I was afraid', 'and hid');
  const tAfraid = wordIn(L2, 'afraid').start, tHid = wordIn(L3, 'hid').start;
  // breath: about one slow cycle every four seconds, deeper as fear rises on "afraid"
  const breath = (t) => Math.sin((t - P.from) * 2 * Math.PI / 4.2) * (0.6 + 0.4 * ease.inOut3(clamp((t - tAfraid + 1) / 2, 0, 1)));
  const part = (t) => 0.3 + 0.22 * ease.inOut3(clamp((t - tHid + 0.3) / 1.4, 0, 1));
  const cam = (t) => {
    const k = prog(P, t);
    const b = breath(t);
    return { pos: [0.05 * Math.sin(k * 2.0), 1.52 + 0.012 * b, -0.02 * b + 0.15 * k], target: [0.6 - 0.3 * k, 2.3, 20], fov: 40, focus: 0.95 - 0.1 * ease.inOut3(clamp((t - tHid) / 1.2, 0, 1)), aperture: 0.016 };
  };
  return shameShot(P, {
    name: 's26-afraid', cam, drift: 0.004, far: 70, shafts: 0.0,
    defines: '#define SH_LEAVES\n#define SH_BUSH\n#define SH_FIGS\n#define SH_HUMAN\n#define HUM_NEPS 0.006\n#define SH_HUM_A\n#define HUM_RIM 1.8\n' + humanGLSL(['uHumA']),
    uniforms: { uGrassH: 0.2, uCold: 1.0, uDusk: 0.55, uDens: 0.9, uClear: [0.0, 4.0, 5.5], uFog: 0.012, uMist: 0.02, uCanopy: 0.6, uSunSh: 0.0,
      uGodK: 1.0, uGodR: 8.0, uGodScat: 0.3, uSunD: [0.5, 0.1, -0.8],
      uFigOn: [1, 0, 0], ...HA.uniforms('uHumA'),
      uLeafN: 66, uLeafC: [0.0, 1.65, 0.95], uLeafS: [1.8, 1.15, 0.8], uLeafSize: 0.19, uLeafSeed: 7, uLeafCurl: 0.45, uLeafDark: 0.2, uLeafPart: 0.22 },
    update(t, u) {
      const b = breath(t);
      u.uGodP.value.set(1.0 + 1.2 * Math.sin((t - P.from) * 0.3), 1.7, 19.0);
      u.uLeafPart.value = part(t);
      // the leaves sway with the breath and tremble a little more when he is afraid
      u.uLeafC.value.set(0.02 * b, 1.65 + 0.01 * b, 0.95 - 0.03 * b);
      // he breathes with the leaves; his head is a little ahead of the lens and to the right
      const c = cam(t);
      let f = [c.target[0] - c.pos[0], c.target[2] - c.pos[2]]; const l = Math.hypot(...f); f = [f[0] / l, f[1] / l];
      const r = [-f[1], f[0]], ah = 0.78 + 0.008 * b;
      u.uFigA.value.set(c.pos[0] + f[0] * ah + r[0] * 0.46, c.pos[2] + f[1] * ah + r[1] * 0.46, -Math.atan2(f[0], f[1]) + 0.1);
      u.uWind.value = 0.15 + 0.25 * ease.inOut3(clamp((t - tAfraid + 0.5) / 1.5, 0, 1)) * (1 - 0.6 * ease.inOut3(clamp((t - tHid) / 1.5, 0, 1)));
      u.uWT.value = (t - P.from) * 0.6;
    },
  });
};
