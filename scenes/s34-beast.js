// 34 · "above the herd and every beast of earth."
// A wide plain under the storm. Dark herds graze far off, tiny against the land; on "herd" the first
// bolt comes down behind them and they bolt, streaming away across the grass; birds burst up out of
// the grass in front of us and scatter; a second strike on "beast" lights the whole plain.
import { grade, ease, keys, linesAt, wordIn, drift, clamp } from '/song/lib/look.js';
import { PLAIN_GLSL, PLAIN_UNIFORMS } from '/song/lib/x-judgement-plain.js';
import { setLightning, clearOfWords } from '/song/lib/x-judgement.js';
import lyrics from '/timing.js';

export const kind = 'shader';

export default (P) => {
  const [L] = linesAt(P.from - 0.8, 'above the herd');
  const herdW = wordIn(L, 'herd'), beastW = wordIn(L, 'beast');
  const strikes = clearOfWords([
    { t: herdW.start + 0.06, pos: [260, 0, 2600], seed: 3.7, k: 1, flash: 0.55 },
    { t: beastW.start + 0.06, pos: [-900, 0, 3400], seed: 11.2, k: 0.8, flash: 0.7 },
    { t: P.from + 0.05, pos: [1800, 0, 5200], seed: 5.1, k: 0, flash: 0.25, sheet: true },
  ], []);   // these are flashes, not white-outs: they may land on the words
  const bolt0 = strikes[0].t;
  // herd speed: grazing drift, then a gallop after the first strike
  const speed = (t) => 0.6 + 9.0 * ease.out3((t - bolt0 - 0.15) / 0.9);
  const travel = (t) => {
    // integral of speed (numeric, cheap): grazing until the strike, then accelerating
    const a = Math.max(0, Math.min(t, bolt0 + 0.15) - P.from) * 0.6;
    const n = 24; let b = 0;
    const t1 = bolt0 + 0.15;
    if (t > t1) { const h = (t - t1) / n; for (let i = 0; i < n; i++) b += speed(t1 + (i + 0.5) * h) * h; }
    return a + b;
  };
  const cam = (t) => {
    const p = (t - P.from) / (P.to - P.from);
    const d = drift(t, 0.12);
    return { pos: [-40 + 34 * p + d[0], 34 + 2 * p + d[1], -40 + 22 * p], target: [10 + 30 * p, -14, 520], fov: 40 };
  };
  return {
    name: 's34-beast', from: P.from, to: P.to,
    frag: PLAIN_GLSL + /* glsl */ `
vec3 shade(vec2 fc) {
  vec3 ro; vec3 rd = jLens(fc, ro);
  float jit = jRand(fc, 1.0);
  vec2 h = plainMarch(ro, rd, 14000.0);
  bool hit = h.y > 0.5 || rd.y < -0.002;
  float depth = hit ? h.x : 1e6;
  vec3 col;
  // light: a dull storm ambient from above, the pale break on the far horizon, the flash
  vec3 ambC = mix(uJZen, uJHor, 0.6) * 2.4;
  if (h.y > 0.5) {
    vec3 p = ro + rd * h.x;
    vec3 n = plainNormal(p, h.x);
    float wave;
    vec3 alb;
    if (PMAT == 1) { alb = vec3(0.02, 0.017, 0.015); wave = 0.0; }
    else alb = grassAlb(p.xz, h.x, wave);
    float sky = 0.5 + 0.5 * n.y;
    // moving cloud shadow: the deck is thinner in places
    float gap = smoothstep(0.35, 0.75, fbm((p.xz - uJWind.xz * uJCloudT * 0.6) / 700.0, 4));
    col = alb * ambC * sky * (0.8 + 0.9 * gap) * (1.0 + 1.6 * wave);
    col += alb * uJSunCol * sat(dot(n, JSUN)) * 0.6 * (1.0 + 0.8 * wave);
    vec3 L = uJFlashPos - p; float ld = length(L); L /= ld;
    col += alb * vec3(0.7, 0.8, 1.0) * uJFlash * (0.5 + 0.5 * sat(dot(n, L))) * 2.6 * (1.0 + 1.4 * wave);
    col += alb * vec3(0.8, 0.85, 1.0) * uJBoltK * 40.0 * exp(-length(p.xz - uJBolt.xz) / 260.0);
    col = jFog(col, ro, rd, h.x);
  } else if (hit) {
    col = jFog(vec3(0.02, 0.025, 0.02), ro, rd, min(ro.y / max(-rd.y, 1e-4), 14000.0));
  } else {
    col = jSkyBase(rd);
  }
  col += jBolt(ro, rd, depth);
  vec4 cl = jClouds(ro, rd, depth, jit);
  col = col * cl.a + cl.rgb;
  // rain curtains hanging from the deck far off
  float az = atan(rd.x, rd.z);
  float curtain = smoothstep(0.3, 0.75, fbm(vec2(az * 7.0 + uJCloudT * 0.0015, 0.0), 4)) * smoothstep(0.1, 0.0, rd.y) * smoothstep(-0.03, 0.0, rd.y);
  col = mix(col, uJFogCol * 0.8 + BOLTC * uJFlash * 0.12, curtain * 0.5 * smoothstep(1500.0, 5000.0, depth));
  vec4 b = birds(ro, rd, depth, vec3(4.0, plainHc(vec2(4.0, 22.0)), 22.0));
  col = mix(col, b.rgb, b.a);
  col = jRain(ro, rd, col, depth, vec3(0.3, 0.33, 0.38) + BOLTC * uJFlash * 0.6);
  return col;
}`,
    uniforms: {
      ...PLAIN_UNIFORMS,
      uJSun: [0.55, 0.03, 1.0], uJSunCol: [0.55, 0.5, 0.48],
      uJZen: [0.04, 0.045, 0.055], uJHor: [0.36, 0.36, 0.37],
      uJCover: 0.92, uJBase: 650.0, uJTop: 3000.0, uJCloudDark: 0.7,
      uJWind: [9.0, 0.0, -4.0],
      uJFog: 0.00016, uJFogCol: [0.3, 0.31, 0.33], uJSunDisc: 0.0, uJDeckEnd: 16000.0,
      uJRain: 0.4, uJRainSlant: [0.25, 0, 0],
    },
    camera: cam,
    update(t, u) {
      setLightning(u, t, strikes);
      u.uJCloudT.value = (t - P.from) * 14 + 300;
      u.uJRainT.value = (t - P.from) * 9;
      u.uGrassWind.value = (t - P.from) * 7;
      const tr = travel(t);
      // herds run away from the first strike (toward the left and toward us, across the plain)
      const dA = [-0.8, 0, -0.6], dB = [-0.95, 0, -0.3], dC = [-0.6, 0, -0.8];
      const s = speed(Math.max(t, P.from));
      const set = (U, R, c0, d) => {
        U.value.set(c0[0] + d[0] * tr, 0, c0[2] + d[2] * tr);
        R.value.set(d[0] * s, 0, d[2] * s);
      };
      set(u.uHerdA, u.uRunA, [-60, 0, 150], dA);
      set(u.uHerdB, u.uRunB, [60, 0, 230], dB);
      set(u.uHerdC, u.uRunC, [210, 0, 380], dC);
      // gait phase: about 2.2 strides/s at a gallop, a slow walk before
      u.uGait.value = tr * 0.24;
      u.uBirdT.value = t - (bolt0 + 0.1);
      const c = cam(t);
      u.uJFocus.value = 300; u.uJAper.value = 0.0;
    },
    post(t) { return grade(t, { exposure: 2.1, bloom: 0.18, threshold: 0.9, contrast: 1.06, saturation: 0.85, vignette: 0.5, lift: [0.008, 0.009, 0.012], gain: [0.96, 0.99, 1.04] }); },
    finish(t) { return { grade: { shadows: [0.0, 0.015, 0.04], highlights: [0.92, 0.96, 1.0], amount: 0.5 } }; },
  };
};
