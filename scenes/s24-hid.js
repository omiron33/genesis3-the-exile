// 24 · "and hid within the trees."
// The held breath. Deep in the thicket the camera slides between dark trunks and hanging fig leaves;
// on the far side, through the trees, the searching warm light passes slowly from left to right,
// cutting shafts between the trunks, and at the end it finds the gap we are looking through.
import { ease, keys, linesAt } from '/song/lib/look.js';
import { shameShot, prog } from '/song/lib/x-shame.js';
export const kind = 'shader';

export default (P) => {
  const p = (t) => prog(P, t, (x) => x);
  const cam = (t) => {
    const k = p(t);
    const x = -0.1 + 1.5 * ease.inOut3(k);
    return { pos: [x, 1.35 + 0.05 * Math.sin(k * 3.0), 0.0], target: [x + 0.6 - 0.5 * k, 1.55, 12.0], fov: 38, focus: 9.0, aperture: 0.025 };
  };
  return shameShot(P, {
    name: 's24-hid', cam, drift: 0.006, far: 80, shafts: 1.0,
    defines: '#define SH_LEAVES\n#define SH_BUSH\n',
    uniforms: { uGrassH: 0.2, uCold: 1.0, uDusk: 0.25, uDens: 0.95, uWind: 0.08, uFog: 0.012, uMist: 0.05, uCanopy: 0.7, uClear: [0, -2, 2.5],
      uSunSh: 0.0, uGodK: 1.0, uGodR: 7.0, uGodScat: 1.2, uSunD: [0.5, 0.12, -0.8],
      uLeafN: 36, uLeafC: [0, 1.5, 1.3], uLeafS: [2.6, 1.6, 0.9], uLeafSize: 0.17, uLeafSeed: 3, uLeafCurl: 0.5, uLeafDark: 0.0, uLeafPart: 0.55 },
    update(t, u, c) {
      const k = p(t);
      u.uGodP.value.set(-20 + 22 * ease.inOut3(k), 2.6, 26.0);
      u.uLeafC.value.set(0.6, 1.5, 1.3);
      u.uWT.value = t * 0.4;
    },
  });
};
