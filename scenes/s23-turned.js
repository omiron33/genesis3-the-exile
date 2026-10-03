// 23 · "Adam and his wife turned from His face"
// Among dark trunks in the cold afternoon. Far off, low between the trees, the warm searching light;
// against it two figures stand, facing it. On "turned" they turn from it and slip away to the left
// into the dark trunks, and their shadows run long toward us over the grass.
import { ease, linesAt, wordIn, clamp } from '/song/lib/look.js';
import { shameShot, prog } from '/song/lib/x-shame.js';
import { humanAtlas, humanGLSL, walkKeys, walking } from '/song/lib/x-human.js';
export const kind = 'shader';

export default async (P) => {
  // the man and the woman, MakeHuman figures in fig-leaf girdles, walking with the rig's cycle
  const HA = await humanAtlas(walkKeys('man-leaves')), HB = await humanAtlas(walkKeys('woman-leaves'));
  const [L] = linesAt(P.from - 2.5, 'Adam and his wife turned');
  const tTurn = wordIn(L, 'turned').start;
  // distance walked: nothing until they turn, then an uneasy walk that quickens
  const walked = (t, t0) => { const x = Math.max(0, t - t0); return x * x * 0.5 / (1 + x * 0.45) + x * 0.45; };
  const cam = (t) => {
    const k = prog(P, t);
    return { pos: [1.2 - 1.0 * k, 1.45, -4.5 + 0.6 * k], target: [-0.4 - 0.9 * k, 1.6, 14], fov: 27, focus: 15.5, aperture: 0.05 };
  };
  return shameShot(P, {
    name: 's23-turned', cam, drift: 0.006, far: 70, shafts: 1.0,
    defines: '#define SH_FIGS\n#define SH_BUSH\n#define SH_HUMAN\n#define SH_HUM_A\n#define SH_HUM_B\n#define HUM_RIM 1.5\n' + humanGLSL(['uHumA', 'uHumB']),
    uniforms: { uGrassH: 0.25, uCold: 1.0, uDusk: 0.2, uDens: 0.9, uClear: [0.0, 8.0, 7.0], uFog: 0.009, uMist: 0.025, uCanopy: 0.6, uSunSh: 0.0,
      uGodK: 1.3, uGodR: 15.0, uGodScat: 0.35, uSunD: [0.5, 0.15, -0.8], uFigOn: [1, 1, 0], ...HA.uniforms('uHumA'), ...HB.uniforms('uHumB') },
    update(t, u) {
      // the light stands low among the far trunks, drifting a little as if looking
      u.uGodP.value.set(0.6 + 1.5 * Math.sin((t - P.from) * 0.22), 1.6, 30.0);
      u.uWind.value = 0.1; u.uWT.value = t * 0.1;
      const tA = tTurn - 0.15, tB = tTurn + 0.2;
      const turnA = ease.inOut3(clamp((t - (tA - 0.5)) / 1.1, 0, 1)), turnB = ease.inOut3(clamp((t - (tB - 0.5)) / 1.2, 0, 1));
      const sA = walked(t, tA + 0.3), sB = walked(t, tB + 0.3);
      // facing the light (yaw 0) they turn left to face -x and walk out of the light, angling a little toward us
      const yawA = 1.75 * turnA, yawB = 1.85 * turnB;
      const dA = [-Math.sin(1.75), Math.cos(1.75)], dB = [-Math.sin(1.85), Math.cos(1.85)];
      u.uFigA.value.set(0.55 + dA[0] * sA, 11.2 + dA[1] * sA, yawA);
      u.uFigB.value.set(-0.35 + dB[0] * sB, 10.6 + dB[1] * sB, yawB);
      u.uPoseA.value.set(...walking(HA, 'man-leaves', sA, 1.45));
      u.uPoseB.value.set(...walking(HB, 'woman-leaves', sB, 1.3, 0.2));
    },
  });
};
