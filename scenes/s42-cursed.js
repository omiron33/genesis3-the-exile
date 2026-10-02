// 42 · "The earth is cursed under your work; / with pain you will live from it / all your days."
// A time-lapse, low over the ground. It begins as lush dark loam under a thick green turf in soft
// morning light; the sun climbs fast and goes white, the clouds race and burn off; the grass yellows,
// flattens and is torn away by the hot wind, chaff streaming past the lens; the soil pales and dries
// and splits into the polygons of hardpan; by the end the air shimmers with heat over cracked ground.
import { grade, ease, drift, linesAt, clamp } from '/song/lib/look.js';
import { EARTH_GLSL, EARTH_UNIFORMS, GRASS_GLSL } from '/song/lib/x-judgement-earth.js';

export const kind = 'shader';

export default (P) => {
  const [L1, L2, L3] = linesAt(P.from - 0.8, 'The earth is cursed', 'with pain you will live', 'all your days');
  const dur = P.to - P.from;
  const k = (t) => clamp((t - P.from) / dur, 0, 1);
  const cam = (t) => {
    const p = ease.inOut3(k(t)), d = drift(t, 0.004);
    return { pos: [0.02 + d[0], 0.24 - 0.03 * p + d[1], -0.7 + 0.35 * p], target: [0.06, 0.06, 1.6], fov: 48 };
  };
  return {
    name: 's42-cursed', from: P.from, to: P.to,
    frag: EARTH_GLSL + GRASS_GLSL + /* glsl */ `
vec3 sky(vec3 rd) {
  vec3 c = earthSky(rd);
  // a disc of sun, white-hot by the end
  float s = dot(rd, KEY);
  c += uKeyCol * smoothstep(0.99955, 0.9998, s) * 6.0;
  c += uKeyCol * pow(max(s, 0.0), 300.0) * 0.6;
  return c;
}
vec3 shadeSoil(vec3 p, vec3 rd, float t) {
  vec3 n = earthN(p.xz, t);
  float wet, rough;
  vec3 alb = earthAlb(p, t, wet, rough);
  // the turf, seen as a whole where its blades are too small to draw
  float turf = uGrassK * (1.0 - uBlow) * (0.75 + 0.25 * fbm(p.xz * 3.0, 3));
  vec3 tc = bladeAlb(0.55 + 0.4 * vnoise(p.xz * 40.0), hash12(floor(p.xz * 60.0)));
  alb = mix(alb, tc, turf);
  wet *= 1.0 - turf;
  float below = max(earthBase(p.xz) - p.y, 0.0);
  float ao = exp(-below * 25.0);
  float sh = earthShadow(p + n * 0.002, KEY);
  vec3 c = alb * uKeyCol * sat(dot(n, KEY)) * sh + alb * uAmbCol * (0.5 + 0.5 * n.y) * ao;
  c += alb * uFillCol * sat(dot(n, FILL)) * 0.5;
  vec3 h = normalize(KEY - rd);
  c += wet * uKeyCol * pow(sat(dot(n, h)), 60.0) * 0.3 * sh;
  c *= 0.35 + 0.65 * ao;
  // the far turf, lit the way the near blades are
  float hk0 = 0.7;
  vec3 gc = tc * uKeyCol * 0.33 + tc * vec3(0.9, 1.0, 0.5) * uKeyCol * pow(sat(dot(rd, KEY)), 3.0) * 0.6 * hk0 * (1.0 - 0.6 * uWither) + tc * uAmbCol * 0.82;
  return mix(c, gc, turf);
}
vec3 shade(vec2 fc) {
  vec3 ro; vec3 rd = jLens(fc, ro);
  // heat shimmer over the hot ground
  rd.y += uHeat * 0.0016 * (vnoise(vec2(fc.x * 0.01, fc.y * 0.05 - uTime * 9.0)) - 0.5) * smoothstep(0.08, -0.02, rd.y);
  rd = normalize(rd);
  float jit = jRand(fc, 6.0);
  float t = earthMarch(ro, rd, 80.0);
  float tEnd = t > 0.0 ? t : 80.0;
  float hk, side;
  float tb = grassTrace(ro, rd, min(tEnd, 1.5), jit, hk, side);
  vec3 col;
  if (tb > 0.0) {
    vec3 p = ro + rd * tb;
    vec3 alb = bladeAlb(hk, side);
    float face = 0.4 + 0.6 * abs(sin(side * 40.0));
    float sh = mix(1.0, 0.4 + 0.6 * hk, 0.8);      // the turf shades its own lower blades
    col = alb * uKeyCol * face * 0.55 * sh;
    col += alb * vec3(0.9, 1.0, 0.5) * uKeyCol * pow(sat(dot(rd, KEY)), 3.0) * 0.6 * hk * (1.0 - 0.6 * uWither);
    col += alb * uAmbCol * (0.4 + 0.6 * hk);
    col = jFog(col, ro, rd, tb);
  } else if (t > 0.0) {
    col = jFog(shadeSoil(ro + rd * t, rd, t), ro, rd, t);
  } else {
    col = sky(rd);
    vec4 cl = jClouds(ro + vec3(0.0, 0.0, 0.0), rd, 1e6, jit);
    col = col * cl.a + cl.rgb;
  }
  // chaff: torn blades streaming past on the hot wind
  for (int i = 0; i < 36; i++) {
    float fi = float(i);
    vec3 h = hash33(vec3(fi, 3.1, 7.7));
    float life = fract(uTime * (0.35 + 0.3 * h.x) + h.y);
    float on = uBlow * smoothstep(0.0, 0.1, life) * smoothstep(1.0, 0.85, life) * step(h.z, uBlow * 1.4);
    if (on <= 0.0) continue;
    vec3 c = vec3(-1.6 + 3.2 * life, 0.03 + 0.25 * h.z + 0.06 * sin(life * 9.0 + fi), 0.2 + 2.5 * h.y);
    c.x += 0.4 * (h.x - 0.5);
    float tc = dot(c - ro, rd);
    if (tc < 0.05 || tc > tEnd) continue;
    vec3 off = ro + rd * tc - c;
    float ang = uTime * (8.0 + 6.0 * h.x) + fi;
    vec2 q = vec2(dot(off.xy, vec2(cos(ang), sin(ang))), dot(off.xy, vec2(-sin(ang), cos(ang))));
    float len = 0.012 + 0.012 * h.y;
    float a = smoothstep(0.0012, 0.0004, abs(q.y)) * smoothstep(len, len * 0.7, abs(q.x));
    vec3 cc = mix(vec3(0.3, 0.24, 0.14), vec3(0.55, 0.47, 0.3), h.x) * (uKeyCol * 0.4 + uAmbCol);
    col = mix(col, cc, a * on);
  }
  return col;
}`,
    uniforms: {
      ...EARTH_UNIFORMS,
      uNetScale: 3.2, uCrackW: 0.0, uGrassH: 0.12,
      uJCover: 0.45, uJBase: 1500, uJTop: 3500, uJCloudDark: 0.2, uJWind: [-40, 0, -10],
      uJSun: [-0.3, 0.4, 1.0], uJSunCol: [1.5, 1.4, 1.3], uJSunDisc: 0.0,
      uJZen: [0.25, 0.32, 0.45], uJHor: [0.7, 0.72, 0.75],
      uJFog: 0.03, uJFogCol: [0.5, 0.5, 0.5], uJAper: 0.004, uJFocus: 1.0,
    },
    camera: cam,
    update(t, u) {
      const p = k(t);
      const e = ease.inOut3(p);
      // the turf withers, then is torn away; the soil dries and splits
      u.uGrassK.value = 0.9;
      u.uWither.value = clamp(p * 1.6, 0, 1);
      u.uBlow.value = clamp((p - 0.38) / 0.5, 0, 1);
      u.uDry.value = clamp((p - 0.15) / 0.65, 0, 1);
      u.uNet.value = clamp((p - 0.35) / 0.5, 0, 1);
      u.uHeat.value = clamp((p - 0.6) / 0.3, 0, 1);
      // the sun climbs fast and goes white; the sky bleaches
      const el = 0.18 + 0.75 * e;
      u.uKeyDir.value.set(-0.35, el, 1.0);
      u.uJSun.value.set(-0.35, el, 1.0);
      const warm = [2.6, 1.9, 1.2], white = [4.6, 4.5, 4.3];
      u.uKeyCol.value.set(...warm.map((v, i) => v + (white[i] - v) * e));
      u.uFillDir.value.set(0.5, 0.8, -0.5);
      u.uFillCol.value.set(...[0.25, 0.32, 0.45].map((v) => v * (1 - 0.4 * e)));
      u.uAmbCol.value.set(...[0.4, 0.46, 0.56].map((v, i) => v + ([0.45, 0.44, 0.42][i] - v) * e));
      u.uSkyTop.value.set(...[0.12, 0.2, 0.42].map((v, i) => v + ([0.55, 0.57, 0.6][i] - v) * e));
      u.uSkyHor.value.set(...[0.45, 0.45, 0.45].map((v, i) => v + ([0.95, 0.93, 0.9][i] - v) * e));
      u.uJZen.value.set(...[0.25, 0.32, 0.45].map((v, i) => v + ([0.6, 0.6, 0.62][i] - v) * e));
      u.uJHor.value.set(...[0.6, 0.6, 0.62].map((v, i) => v + ([1.0, 0.98, 0.95][i] - v) * e));
      u.uJSunCol.value.set(...u.uKeyCol.value.toArray().map((v) => v * 0.4));
      u.uJCover.value = 0.12 - 0.12 * e;
      u.uJCloudT.value = (t - P.from) * 260;      // the time-lapse: clouds race
      u.uJFogCol.value.set(...[0.4, 0.42, 0.45].map((v, i) => v + ([0.85, 0.83, 0.8][i] - v) * e));
      u.uJFocus.value = 1.0 + 0.8 * p;
    },
    post(t) { return grade(t, { exposure: 0.95, bloom: 0.14, threshold: 1.0, contrast: 1.1, saturation: 0.9, vignette: 0.45 }); },
    finish(t) { return { flare: { amount: 0.15, threshold: 0.9, tint: [1.0, 0.95, 0.85], length: 0.35 } }; },
  };
};
