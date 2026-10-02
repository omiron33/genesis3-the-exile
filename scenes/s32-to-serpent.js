// 32 · "God said to the serpent:"
// The tree on its rise, far off across the river, in the cold light after the eating. Over it the
// sky fills: the storm deck rolls in fast from behind the tree and piles up overhead, the last pale
// sun goes out, the first wind hits the crown and runs through the meadow toward us; on the last
// words lightning stirs inside the clouds.
import { grade, ease, drift, keys, linesAt, wordIn } from '/song/lib/look.js';
import { STORMGARDEN_GLSL, STORMGARDEN_UNIFORMS } from '/song/lib/x-judgement-garden.js';
import { setLightning } from '/song/lib/x-judgement.js';

export const kind = 'shader';

export default (P) => {
  const [L] = linesAt(P.from - 0.8, 'God said to the serpent');
  const dur = P.to - P.from;
  const k = (t) => Math.min(1, Math.max(0, (t - P.from) / dur));
  const serp = wordIn(L, 'serpent') ?? L.words[L.words.length - 1];
  const strikes = [
    { t: serp.start + 0.05, pos: [-260, 0, 1400], seed: 2.0, k: 0, flash: 0.45, sheet: true, cloud: 1300 },
    { t: P.to - 0.22, pos: [300, 0, 1700], seed: 4.0, k: 0, flash: 0.3, sheet: true, cloud: 1300 },
  ];
  const cam = (t) => {
    const p = ease.inOut3(k(t)), d = drift(t, 0.04);
    return { pos: [-14 + 3 * p + d[0], 2.4 + 0.5 * p + d[1], -150 + 6 * p], target: [0, 14 + 22 * p, 0], fov: 42 - 2 * p, roll: 0.004 * Math.sin(t * 0.5) };
  };
  return {
    name: 's32-to-serpent', from: P.from, to: P.to,
    frag: STORMGARDEN_GLSL + /* glsl */ `
vec3 shade(vec2 fc) {
  vec3 ro; vec3 rd = jLens(fc, ro);
  float jit = jRand(fc, 2.0);
  float depth;
  vec3 col = stormGarden(ro, rd, jit, depth);
  vec4 cl = jClouds(ro, rd, depth, jit);
  return col * cl.a + cl.rgb;
}`,
    uniforms: {
      ...STORMGARDEN_UNIFORMS,
      uJSun: [-0.55, 0.22, 0.8], uJSunCol: [2.6, 2.6, 2.7], uJSunDisc: 0.0,
      uJZen: [0.12, 0.15, 0.2], uJHor: [0.42, 0.45, 0.5],
      uJBase: 800.0, uJTop: 3400.0, uJCloudDark: 0.65,
      uJWind: [-6, 0, -26],
      uJFog: 0.0011, uJFogCol: [0.3, 0.33, 0.37], uJDeckEnd: 20000.0,
      uHaze: 1.0, uTreeWind: 0.12,
    },
    camera: cam,
    update(t, u) {
      const p = k(t);
      setLightning(u, t, strikes);
      // the deck comes on fast (a time-lapse feel), from behind the tree toward us
      u.uJCloudT.value = (t - P.from) * 36 + 1200;
      u.uJCover.value = 0.5 + 0.47 * ease.inOut3(p);
      u.uJCloudDark.value = 0.5 + 0.35 * p;
      u.uAmbK.value = 1.15 - 0.4 * ease.inOut3(p);
      u.uSunK.value = 0.6 * (1 - ease.inOut3(Math.min(1, p * 1.5)));
      u.uJZen.value.set(...[0.12, 0.15, 0.2].map((v) => v * (1 - 0.3 * p)));
      u.uJHor.value.set(...[0.42, 0.45, 0.5].map((v) => v * (1 - 0.3 * p)));
      u.uJFogCol.value.set(...[0.3, 0.33, 0.37].map((v) => v * (1 - 0.3 * p)));
      // the first wind: the crown begins to toss
      u.uTreeWind.value = 0.12 + 0.5 * ease.in2(p);
      u.uTreeShiver.value = p;
    },
    post(t) { return grade(t, { exposure: 1.25, bloom: 0.12, threshold: 1.0, contrast: 1.07, saturation: 0.82, vignette: 0.5, lift: [0.008, 0.01, 0.013], gain: [0.95, 0.99, 1.04] }); },
    finish(t) { return { grade: { shadows: [0.0, 0.015, 0.04], highlights: [0.92, 0.96, 1.0], amount: 0.45 } }; },
  };
};
