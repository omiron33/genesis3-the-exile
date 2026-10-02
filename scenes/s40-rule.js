// 40 · "To your husband you will submit; / he will hold rule over you."
// The broken order, close and physical: on a ridge's edge in storm light, a young sapling with a few
// fresh leaves, and a dark vine coiling up it. Through the first line the vine climbs (a time-lapse,
// the coils catching the low sun); on "hold" its coils draw in tight, on "rule" its weight bends the
// young plant over and its leaves droop; on "over you" the focus racks off the plants to the storm
// over the valley, the sun going down in a slot of clear sky under the deck.
import { grade, ease, drift, linesAt, wordIn, spring, clamp } from '/song/lib/look.js';
import { VINE_GLSL, VINE_UNIFORMS } from '/song/lib/x-judgement-vine.js';

export const kind = 'shader';

export default (P) => {
  const [L1, L2] = linesAt(P.from - 0.8, 'To your husband', 'he will hold rule');
  const hold = wordIn(L2, 'hold') ?? L2.words[2], rule = wordIn(L2, 'rule') ?? L2.words[3], over = wordIn(L2, 'over') ?? L2.words[4];
  const climb = (t) => 0.1 + 0.36 * ease.inOut3((t - P.from) / (hold.start - P.from)) + 0.02 * spring(t, hold.start, 0.6, 0.2);
  const cam = (t) => {
    const p = clamp((t - P.from) / (P.to - P.from), 0, 1), d = drift(t, 0.0025);
    return { pos: [0.07 - 0.03 * p + d[0], 0.2 + 0.015 * p + d[1], -0.46 + 0.08 * p], target: [0.075, 0.24 + 0.005 * p, 0.0], fov: 38 };
  };
  const rack = (t) => ease.inOut3((t - (over.start - 0.25)) / 0.9);
  return {
    name: 's40-rule', from: P.from, to: P.to,
    frag: VINE_GLSL + /* glsl */ `
// the land beyond the ridge's edge: the valley and range after range of hills toward the sunset,
// each further one paler in the haze, the river catching the light
vec3 stormSky(vec3 ro, vec3 rd, float jit) {
  vec3 c = jSkyBase(rd);
  vec4 cl = jClouds(ro, rd, 1e6, jit);
  c = c * cl.a + cl.rgb;
  float az = atan(rd.x, rd.z);
  float sunw = pow(max(dot(normalize(vec3(rd.x, 0.0, rd.z)), normalize(vec3(JSUN.x, 0.0, JSUN.z))), 0.0), 8.0);
  vec3 haze = uJFogCol * 1.5 + uJSunCol * 0.18 * sunw;
  for (int i = 0; i < 4; i++) {
    float fi = float(i);
    float base = -0.004 - 0.016 * fi;
    float h = base + (0.014 - 0.003 * fi) * fbm(vec2(az * (2.5 + 1.5 * fi) + fi * 7.0, fi), 5) + 0.002 * vnoise(vec2(az * 60.0, fi));
    // the nearest range is wooded: a fine ragged tree line on its crest
    if (i == 3) h += 0.003 * smoothstep(0.4, 0.8, vnoise(vec2(az * 400.0, 3.0)));
    if (rd.y < h) {
      float far = 1.0 - fi / 4.0;
      vec3 land = mix(vec3(0.02, 0.022, 0.02), haze, 0.25 + 0.6 * far * far);
      land *= 0.8 + 0.25 * fbm(vec2(az * 40.0, rd.y * 300.0), 3);
      c = land;
    }
  }
  // the valley floor and the river in it, catching the sunset
  if (rd.y < -0.07) {
    vec3 v = mix(vec3(0.03, 0.03, 0.025), haze * 0.5, 0.3);
    float riv = smoothstep(0.004, 0.0, abs(rd.x / max(-rd.y, 0.05) * 0.08 - 0.06 - 0.02 * sin(-rd.y * 60.0))) * smoothstep(-0.2, -0.08, rd.y);
    c = v;
  }
  return c;
}
vec3 shade(vec2 fc) {
  vec3 ro; vec3 rd = jLens(fc, ro);
  float jit = jRand(fc, 5.0);
  float t = vineMarch(ro, rd, 3.0);
  if (t < 0.0) return stormSky(vec3(0.0, 300.0, 0.0) + ro, rd, jit);
  vec3 p = ro + rd * t;
  vineMap(p);
  int part = VPART;
  vec3 n = vineN(p);
  vec3 L = JSUN;
  vec3 sunC = uJSunCol;
  vec3 skyC = mix(uJZen, uJHor, 0.5) * 1.4;
  vec3 alb; float trans = 0.0, spec = 0.1;
  if (part == 0) { alb = vec3(0.16, 0.2, 0.08); trans = 0.3; }                       // the sapling's green stem
  else if (part == 1) {                                                              // its fresh leaves
    float mid = smoothstep(0.06, 0.0, abs(LUV.y));
    float lat = smoothstep(0.08, 0.0, abs(fract(LUV.x * 7.0 - abs(LUV.y) * 1.6) - 0.5) - 0.42);
    float vein = max(mid, lat * 0.7) * sat(1.0 - LUV.x * 0.6);
    // finer vein net between the laterals
    float net = smoothstep(0.08, 0.0, voronoiEdge(LUV * vec2(12.0, 8.0)).x);
    alb = mix(vec3(0.07, 0.15, 0.03), vec3(0.12, 0.2, 0.05), fbm(p * 400.0, 3));
    // imperfections: yellowing patches, a browned margin, a few dark spots
    alb = mix(alb, vec3(0.22, 0.22, 0.05), smoothstep(0.6, 0.8, fbm(p * 150.0 + 3.0, 3)) * 0.6);
    alb = mix(alb, vec3(0.13, 0.08, 0.03), smoothstep(0.75, 0.95, abs(LUV.y)) * 0.7);
    alb = mix(alb, vec3(0.04, 0.03, 0.015), smoothstep(0.8, 0.86, vnoise(LUV * 30.0)) * 0.8);
    alb = mix(alb, vec3(0.16, 0.22, 0.09), max(vein, net * 0.4) * 0.5);
    trans = 0.6 * (1.0 - 0.7 * vein) * (1.0 - 0.35 * net) * (0.8 + 0.3 * fbm(p * 900.0, 2));
    spec = 0.3;
  }
  else if (part == 2) {                                                              // the vine's woody stem: bark
    float br = vnoise(vec2(atan(p.z, p.x) * 30.0, p.y * 900.0)) * 0.6 + vnoise(vec2(p.x * 3000.0, p.y * 3000.0)) * 0.4;
    alb = mix(vec3(0.1, 0.07, 0.05), vec3(0.3, 0.23, 0.16), br);
    n = normalize(n + 0.5 * (vec3(vnoise(p * 4000.0), vnoise(p * 4000.0 + 3.0), vnoise(p * 4000.0 + 6.0)) - 0.5));
    trans = 0.0; spec = 0.08;
  }
  else if (part == 5) {                                                              // the rocks: grey, lichened
    float l = fbm(p * 60.0, 4);
    alb = mix(vec3(0.12, 0.115, 0.1), vec3(0.24, 0.22, 0.2), l);
    alb = mix(alb, vec3(0.3, 0.3, 0.16), smoothstep(0.62, 0.72, fbm(p * 140.0 + 5.0, 3)) * 0.7);
    alb = mix(alb, vec3(0.04, 0.04, 0.035), smoothstep(0.6, 0.75, fbm(p * 30.0 + 9.0, 3)) * 0.5);
    n = normalize(n + 0.6 * (vec3(vnoise(p * 900.0), vnoise(p * 900.0 + 3.0), vnoise(p * 900.0 + 6.0)) - 0.5));
    spec = 0.05;
  }
  else if (part == 3) {                                                              // its dark glossy leaves
    float vein = smoothstep(0.05, 0.0, abs(LUV.y)) + 0.6 * smoothstep(0.06, 0.0, abs(fract(LUV.x * 5.0 - abs(LUV.y) * 1.2) - 0.5) - 0.44);
    alb = vec3(0.022, 0.032, 0.015) * (0.8 + 0.4 * fbm(p * 500.0, 2));
    alb = mix(alb, vec3(0.06, 0.03, 0.02), smoothstep(0.7, 0.85, fbm(p * 200.0 + 2.0, 3)) * 0.6);
    trans = 0.18 * (1.0 - 0.7 * sat(vein)); spec = 0.6;
  }
  else {                                                                             // thin soil, grit, dry moss
    alb = mix(vec3(0.05, 0.045, 0.03), vec3(0.13, 0.11, 0.07), fbm(p.xz * 60.0, 3));
    alb = mix(alb, vec3(0.08, 0.09, 0.03), smoothstep(0.55, 0.75, fbm(p.xz * 25.0 + 4.0, 3)) * 0.6);
    alb *= 0.75 + 0.5 * hash12(floor(p.xz * 900.0));
    n = normalize(n + 0.5 * vec3(vnoise(p.xz * 700.0) - 0.5, 0.0, vnoise(p.xz * 700.0 + 5.0) - 0.5));
  }
  float ndl = dot(n, L);
  vec3 c = alb * sunC * sat(ndl);
  // the low sun through the leaves (they glow from behind)
  float back = pow(sat(dot(rd, L)), 3.0) * 0.7 + sat(-ndl) * 0.3;
  c += mix(vec3(0.16, 0.3, 0.035), alb * 2.2, 0.4) * sunC * back * trans;
  c += alb * skyC * (0.5 + 0.5 * n.y) * (part >= 4 ? 2.2 : 1.0);
  // the low sun grazing over the rock and grit: hot rims on every edge facing it
  if (part >= 4) c += alb * sunC * pow(sat(1.0 - abs(dot(rd, n))), 3.0) * sat(dot(n, L) + 0.3) * 1.2;
  vec3 h = normalize(L - rd);
  float fr = 0.04 + 0.96 * pow(1.0 - sat(abs(dot(rd, n))), 5.0);
  c += sunC * pow(sat(dot(n, h)), 60.0) * spec * (0.3 + fr);
  c += sunC * 0.12 * fr * spec;                                  // rim
  return jFog(c, ro, rd, t);
}`,
    uniforms: {
      ...VINE_UNIFORMS,
      uJSun: [-0.3, 0.03, 1.0], uJSunCol: [1.9, 1.05, 0.5], uJSunDisc: 0.25,
      uJZen: [0.03, 0.034, 0.045], uJHor: [0.3, 0.2, 0.13],
      uJCover: 0.9, uJBase: 1100.0, uJTop: 3600.0, uJCloudDark: 0.75, uJDeckEnd: 9000.0,
      uJWind: [14, 0, -6], uJFog: 0.02, uJFogCol: [0.16, 0.13, 0.11],
      uJAper: 0.006, uJFocus: 0.6,
    },
    camera: cam,
    update(t, u) {
      u.uVineTop.value = climb(t);
      // the coils draw in on "hold"; the weight bends the sapling on "rule"
      u.uCoil.value = 0.014 - 0.007 * spring(t, hold.start, 0.8, 0.15);
      u.uBend.value = 0.4 * spring(t, rule.start, 1.2, 0.12);
      u.uDroop.value = 0.25 * ease.inOut3((t - P.from) / (rule.start - P.from)) + 0.7 * spring(t, rule.start + 0.15, 1.4, 0.1);
      u.uSway.value = 0.5 * Math.sin(t * 1.9) + 0.25 * Math.sin(t * 3.3 + 1.0);
      u.uJCloudT.value = (t - P.from) * 30 + 800;
      const c = cam(t);
      const near = Math.hypot(c.pos[0], 0.26 - c.pos[1], c.pos[2]);
      const r = rack(t);
      u.uJFocus.value = near + (60 - near) * r * r;
    },
    post(t) { return grade(t, { exposure: 1.2, bloom: 0.22, threshold: 0.85, contrast: 1.08, saturation: 0.95, vignette: 0.55 }); },
    finish(t) { return { flare: { amount: 0.2, threshold: 0.85, tint: [1.0, 0.75, 0.5], length: 0.4 }, grade: { shadows: [0.01, 0.02, 0.045], highlights: [1.0, 0.9, 0.78], amount: 0.45 } }; },
  };
};
