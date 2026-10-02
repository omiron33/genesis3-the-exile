// 37 · "I will make enmity stand / between you and the woman, / your seed and hers."
// Low on dark, rain-soaked earth after the storm. A crack runs away from us to the horizon and slowly
// opens. Two lights lie low on the land from either side: a warm one on the left (the woman's side,
// the promise) and a cold one on the right; each crack wall catches only its own light, the gap
// between them black. It widens in steps on "enmity" and "seed"; at the end the warm light grows.
import { grade, ease, drift, linesAt, wordIn, spring } from '/song/lib/look.js';
import { EARTH_GLSL, EARTH_UNIFORMS } from '/song/lib/x-judgement-earth.js';

export const kind = 'shader';

export default (P) => {
  const [L1, L2, L3] = linesAt(P.from - 0.8, 'I will make enmity', 'between you and the woman', 'your seed and hers');
  const en = wordIn(L1, 'enmity') ?? L1.words[3], sd = wordIn(L3, 'seed') ?? L3.words[1];
  const dur = P.to - P.from;
  const k = (t) => Math.min(1, Math.max(0, (t - P.from) / dur));
  // the crack opens: a slow creep, with two settling lurches on the words
  const width = (t) => 0.012 + 0.03 * k(t) + 0.05 * spring(t, en.start, 0.6, 0.2) + 0.07 * spring(t, sd.start, 0.6, 0.2);
  const cam = (t) => {
    const p = ease.inOut3(k(t)), d = drift(t, 0.004);
    return { pos: [0.16 + d[0], 0.36 - 0.06 * p + d[1], -1.4 + 0.9 * p], target: [0.05, 0.12, 7.0], fov: 46 };
  };
  return {
    name: 's37-enmity', from: P.from, to: P.to,
    frag: EARTH_GLSL + /* glsl */ `
// the storm sky over the two lights: a low warm glow on the left horizon, a cold one on the right,
// each lighting the underside of the cloud deck on its own side
vec3 sky2(vec3 ro, vec3 rd, float jit) {
  float y = rd.y;
  float k = pow(max(dot(rd, KEY), 0.0), 1.0), f = pow(max(dot(rd, FILL), 0.0), 1.0);
  vec3 c = mix(vec3(0.05, 0.05, 0.06), vec3(0.012, 0.013, 0.018), sat(y * 3.0));
  c += uKeyCol * (pow(k, 6.0) * 0.08 + pow(k, 40.0) * 0.25) * exp(-max(y, 0.0) * 8.0);
  c += uFillCol * (pow(f, 6.0) * 0.08 + pow(f, 40.0) * 0.25) * exp(-max(y, 0.0) * 8.0);
  // the sources themselves: a molten sliver under the cloud on each side
  c += uKeyCol * 1.4 * smoothstep(0.996, 0.9995, k) * smoothstep(0.03, 0.0, abs(y - 0.012));
  c += uFillCol * 1.2 * smoothstep(0.996, 0.9995, f) * smoothstep(0.03, 0.0, abs(y - 0.015));
  vec4 cl = jClouds(ro + vec3(0.0, 0.0, 0.0), rd, 1e6, jit);
  // colour the deck's underside by which light is nearer
  vec3 tint = uKeyCol * pow(k, 3.0) * 0.06 + uFillCol * pow(f, 3.0) * 0.06;
  return c * cl.a + cl.rgb + tint * (1.0 - cl.a) * 3.0 * exp(-max(y, 0.0) * 4.0);
}
vec3 shade(vec2 fc) {
  vec3 ro; vec3 rd = jLens(fc, ro);
  float jit = jRand(fc, 4.0);
  float t = earthMarch(ro, rd, 80.0);
  vec3 col;
  float depth = 1e5;
  if (t > 0.0) {
    vec3 p = ro + rd * t;
    depth = t;
    vec3 n = earthN(p.xz, t);
    float wet, rough;
    vec3 alb = earthAlb(p, t, wet, rough);
    float below = max(earthBase(p.xz) - p.y, 0.0);
    // crack walls: torn dry earth, crumbs, roots, grit: rough normals and paler, dustier colour
    float wall = smoothstep(0.003, 0.03, below);
    vec3 g3 = p * vec3(140.0, 220.0, 140.0);
    vec3 gn = vec3(vnoise(g3) - 0.5, vnoise(g3 + 7.0) - 0.5, vnoise(g3 + 13.0) - 0.5) + 0.5 * (vec3(vnoise(g3 * 3.1), vnoise(g3 * 3.1 + 5.0), vnoise(g3 * 3.1 + 9.0)) - 0.5);
    n = normalize(n + gn * (0.25 + 1.4 * wall));
    float strata = vnoise(vec2(p.y * 300.0, p.z * 4.0));
    vec3 wallC = mix(vec3(0.12, 0.09, 0.065), vec3(0.24, 0.19, 0.14), strata) * (0.7 + 0.6 * vnoise(g3 * 2.0));
    alb = mix(alb, wallC, wall);
    alb = mix(alb, vec3(dot(alb, vec3(0.3, 0.5, 0.2))), 0.4) * 0.8;
    wet *= 1.0 - wall;
    float ao = exp(-below * 14.0);
    float sK = earthShadow(p + n * 0.002, KEY), sF = earthShadow(p + n * 0.002, FILL);
    col = alb * (uKeyCol * sat(dot(n, KEY)) * sK + uFillCol * sat(dot(n, FILL)) * sF);
    col += alb * uAmbCol * (0.5 + 0.5 * n.y) * ao;
    vec3 hK = normalize(KEY - rd), hF = normalize(FILL - rd);
    float fr = 0.04 + 0.96 * pow(1.0 - sat(dot(-rd, n)), 5.0);
    col += wet * (uKeyCol * pow(sat(dot(n, hK)), 40.0) * sK + uFillCol * pow(sat(dot(n, hF)), 40.0) * sF) * (0.15 + fr) * 0.25 * ao;
    col *= ao * 0.75 + 0.25;
    col = jFog(col, ro, rd, t);
  } else {
    col = sky2(ro, rd, jit);
  }
  // crumbs breaking off the lips and tumbling into the crack
  for (int i = 0; i < 40; i++) {
    float fi = float(i);
    vec3 h = hash33(vec3(fi, 1.7, 4.2));
    float per = 0.9 + 0.8 * h.x;
    float ph = fract((uTime + h.y * per) / per) * per;
    float z = 0.2 + 5.0 * h.z * h.z;
    float side = h.x > 0.5 ? 1.0 : -1.0;
    float x0 = crackPath(z) + side * uCrackW * (0.9 + 0.2 * h.y);
    vec3 c = vec3(x0 - side * ph * 0.05, earthBase(vec2(x0, z)) - 4.9 * ph * ph, z);
    if (c.y < -uCrackDepth) continue;
    float r = 0.002 + 0.004 * h.y;
    vec3 oc = ro - c; float b = dot(oc, rd), cc = dot(oc, oc) - r * r, hh = b * b - cc;
    if (hh > 0.0) { float tt = -b - sqrt(hh); if (tt > 0.0 && tt < depth) { vec3 nn = normalize(ro + rd * tt - c);
      vec3 cr = vec3(0.2, 0.16, 0.12) * (uKeyCol * sat(dot(nn, KEY)) + uFillCol * sat(dot(nn, FILL)) + uAmbCol);
      col = jFog(cr, ro, rd, tt); depth = tt; } }
  }
  // dust hanging in the two lights over the crack, drifting
  vec3 q = ro + rd * min(depth, 6.0);
  float dust = 0.0;
  for (int k = 0; k < 6; k++) {
    float tk = (float(k) + jit) / 6.0 * min(depth, 6.0);
    vec3 pp = ro + rd * tk;
    float dn = vnoise(pp * 3.0 + vec3(uTime * 0.15, -uTime * 0.05, 0.0)) * exp(-max(pp.y, 0.0) * 6.0) * smoothstep(0.6, 0.0, abs(pp.x - crackPath(pp.z)));
    dust += dn;
  }
  dust *= min(depth, 6.0) / 6.0 * 0.06;
  col += dust * (uKeyCol * (0.4 + pow(max(dot(rd, KEY), 0.0), 4.0)) + uFillCol * (0.4 + pow(max(dot(rd, FILL), 0.0), 4.0))) * 0.4;
  return col;
}`,
    uniforms: {
      ...EARTH_UNIFORMS,
      uDry: 0.55, uNet: 0.55, uNetScale: 1.6, uCrackDepth: 0.55, uPuddle: 0.0,
      uKeyDir: [0.8, 0.2, 0.55], uKeyCol: [3.4, 1.8, 0.7],
      uFillDir: [-0.8, 0.24, 0.5], uFillCol: [1.3, 2.0, 3.8],
      uAmbCol: [0.05, 0.05, 0.06],
      uSkyTop: [0.012, 0.013, 0.017], uSkyHor: [0.07, 0.07, 0.08],
      uJSun: [0.8, 0.05, 0.55], uJSunCol: [1.4, 0.7, 0.28], uJSunDisc: 0.0,
      uJZen: [0.03, 0.03, 0.038], uJHor: [0.09, 0.085, 0.09], uJCover: 0.88, uJBase: 900, uJTop: 3200, uJCloudDark: 0.6, uJDeckEnd: 9000.0,
      uJFog: 0.02, uJFogCol: [0.03, 0.03, 0.035], uJAper: 0.006, uJFocus: 1.6,
    },
    camera: cam,
    update(t, u) {
      const p = k(t);
      u.uCrackW.value = width(t);
      u.uJCloudT.value = (t - P.from) * 12 + 500;
      // the warm light grows at the end
      const g = 1 + 0.9 * ease.inOut3((t - (P.to - 1.6)) / 1.6);
      const br = 1 + 0.05 * Math.sin(t * 2.3) * Math.sin(t * 0.9);
      u.uKeyCol.value.set(3.4 * g * br, 1.8 * g * br, 0.7 * g * br);
      u.uFillCol.value.set(...[0.9, 1.4, 2.6].map((v) => v * 1.45 * (1.1 - 0.25 * p)));
      const c = cam(t);
      u.uJFocus.value = 1.4 + 0.6 * p;
    },
    post(t) { return grade(t, { exposure: 1.5, bloom: 0.16, threshold: 0.9, contrast: 1.08, saturation: 1.0, vignette: 0.55 }); },
    finish(t) { return { flare: { amount: 0.12, threshold: 0.9, tint: [1.0, 0.8, 0.6], length: 0.3 } }; },
  };
};
