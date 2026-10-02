// 41 · "To Adam: You heard your wife / and ate from the tree I marked / as the one you must not eat."
// The tree on its rise under a black sky, in rain. Three beats, one per line:
//   1. under the crown, close by the trunk, looking up and out: the limbs thrash; sheet lightning
//      behind the leaves throws them into black lace;
//   2. the camera swings out to the slope: the whole tree, and on "tree" a bolt comes down right
//      behind it, the crown a black shape against the lit sky;
//   3. it pulls back fast and low across the wet clearing, the tree small on its rise, lightning
//      walking the horizon; at the end the soaked ground in front comes up into frame.
import { grade, ease, drift, keys, linesAt, wordIn } from '/song/lib/look.js';
import { STORMGARDEN_GLSL, STORMGARDEN_UNIFORMS } from '/song/lib/x-judgement-garden.js';
import { setLightning } from '/song/lib/x-judgement.js';

export const kind = 'shader';

export default (P) => {
  const [L1, L2, L3] = linesAt(P.from - 0.8, 'To Adam', 'and ate from the tree', 'as the one you must not');
  const w = (L, s) => wordIn(L, s) ?? L.words[0];
  const tA = L2.start - 0.35, tB = L3.start - 0.25;
  const strikes = [
    { t: w(L1, 'Adam').start + 0.04, pos: [30, 0, 260], seed: 1.3, k: 0, flash: 0.75, sheet: true, cloud: 900 },
    { t: w(L1, 'heard').start + 0.04, pos: [-60, 0, 340], seed: 2.7, k: 0, flash: 0.5, sheet: true, cloud: 900 },
    { t: w(L2, 'tree').start + 0.03, pos: [230, 0, 260], seed: 7.9, k: 1.6, flash: 0.75, cloud: 900, n: 2 },
    { t: w(L3, 'one').start + 0.04, pos: [-420, 0, 900], seed: 13.4, k: 0.9, flash: 0.5, cloud: 1000 },
    { t: w(L3, 'not').start + 0.03, pos: [380, 0, 1100], seed: 21.1, k: 0.8, flash: 0.45, cloud: 1000 },
  ];
  // and all the while, lightning flickering somewhere in the deck (never a white-out)
  for (let i = 0, t = P.from + 0.2; t < P.to; i++) {
    const h = (x) => { const s = Math.sin(x * 127.1 + i * 311.7) * 43758.5453; return s - Math.floor(s); };
    strikes.push({ t, pos: [(h(1) - 0.5) * 1600, 0, 500 + 900 * h(2)], seed: i, k: 0, flash: 0.12 + 0.18 * h(3), sheet: true, cloud: 1000, n: 2 + Math.floor(h(4) * 2) });
    t += 0.35 + 0.6 * h(5);
  }
  // camera keys: [time, pos, target, fov]
  const K = [
    [P.from, [9.0, 8.4, -17.0], [-3.0, 15.5, 1.0], 56],
    [tA, [6.5, 8.8, -18.5], [-4.0, 15.0, 0.0], 54],
    [tA + 0.9, [-22, 5.2, -52], [0, 13.0, 0], 40],
    [tB, [-27, 4.6, -62], [0, 13.5, 0], 38],
    [tB + 1.4, [-12, 3.0, -128], [0, 10.0, 0], 34],
    [P.to - 0.7, [-8, 2.7, -150], [0, 8.0, 0], 34],
    [P.to, [-7, 2.3, -155], [-2, 0.2, -110], 36],
  ];
  const seg = (t) => {
    let i = 0; while (i < K.length - 2 && t > K[i + 1][0]) i++;
    const [t0, p0, g0, f0] = K[i], [t1, p1, g1, f1] = K[i + 1];
    const e = ease.inOut3(Math.min(1, Math.max(0, (t - t0) / (t1 - t0))));
    const m = (a, b) => a.map((v, j) => v + (b[j] - v) * e);
    return { pos: m(p0, p1), target: m(g0, g1), fov: f0 + (f1 - f0) * e };
  };
  const cam = (t) => {
    const c = seg(t), d = drift(t, 0.05);
    return { pos: [c.pos[0] + d[0], c.pos[1] + d[1], c.pos[2]], target: c.target, fov: c.fov, roll: 0.006 * Math.sin(t * 0.7) };
  };
  return {
    name: 's41-to-adam', from: P.from, to: P.to,
    frag: STORMGARDEN_GLSL + /* glsl */ `
vec3 shade(vec2 fc) {
  vec3 ro; vec3 rd = jLens(fc, ro);
  float jit = jRand(fc, 3.0);
  float depth;
  vec3 col = stormGarden(ro, rd, jit, depth);
  vec4 cl = jClouds(ro, rd, depth, jit);
  col = col * cl.a + cl.rgb;
  col = jRain(ro, rd, col, depth, vec3(0.22, 0.24, 0.28) + BOLTC * uJFlash * 0.9);
  return col;
}`,
    uniforms: {
      ...STORMGARDEN_UNIFORMS,
      uJSun: [0.3, 0.1, 1.0], uJSunCol: [0, 0, 0], uJSunDisc: 0.0,
      uJZen: [0.06, 0.066, 0.08], uJHor: [0.34, 0.35, 0.4],
      uJCover: 0.9, uJBase: 600.0, uJTop: 3200.0, uJCloudDark: 0.6,
      uJWind: [10, 0, -14],
      uJFog: 0.0016, uJFogCol: [0.12, 0.13, 0.15], uJDeckEnd: 5200.0,
      uJRain: 0.75, uJRainSlant: [0.3, 0, 0],
      uAmbK: 0.8, uSunK: 0.0, uWet: 1.0, uTreeWind: 0.85, uTreeShiver: 1.0, uFruitK: 0.0,
    },
    camera: cam,
    update(t, u) {
      setLightning(u, t, strikes);
      u.uJCloudT.value = (t - P.from) * 20 + 2400;
      u.uJRainT.value = (t - P.from) * 10;
    },
    post(t) { return grade(t, { exposure: 1.7, bloom: 0.2, threshold: 0.85, contrast: 1.08, saturation: 0.8, vignette: 0.55, lift: [0.006, 0.008, 0.012], gain: [0.94, 0.98, 1.05] }); },
    finish(t) { return { flare: { amount: 0.15, threshold: 0.9, tint: [0.6, 0.72, 1.0], length: 0.35 }, grade: { shadows: [0.0, 0.015, 0.045], highlights: [0.9, 0.95, 1.0], amount: 0.5 } }; },
  };
};
