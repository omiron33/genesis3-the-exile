// The tree's crown seen from beneath (s12, s15): the volume of x-tree.js is too coarse that close, so
// from under the tree the leaves are drawn as stacked layers of real leaf shapes through the crown's
// shell, each layer a scatter of pointed leaves at its own height, with gaps where the crown thins.
// Leaves glow green-gold where the sun gets through the layers above them; the sky and the sun show
// in the gaps; shafts of sun stand in the air beneath. Limbs, trunk and the red fruit come from
// x-tree.js (woodSD, fruitSD). Prepend after WORLD_GLSL.
export const CANOPY_GLSL = /* glsl */ `
#define NLAYER 14
const float LY0 = 8.6, LDY = 0.95;
// how full layer k is at xz (0..1): the crown's shell, thinned by noise
float layerDens(vec2 xz, int k) {
  float y = uTreePos.y + LY0 + float(k) * LDY;
  vec3 q = vec3(xz.x, y, xz.y) - uTreePos;
  float cd = crownSDLo(q);
  float shell = smoothstep(0.8, -0.3, cd) * smoothstep(-5.0, -2.5, cd);
  float n = fbm(xz * 0.35 + float(k) * 3.7 + vec2(uTime * 0.03 * uTreeWind), 3);
  float up = float(k) / float(NLAYER - 1);
  return shell * smoothstep(0.22 + 0.12 * up, 0.5 + 0.1 * up, n);
}
// a layer of leaves: alpha, and a tone per leaf; S is the leaf spacing
vec2 leafLayer(vec2 xz, int k, float dens, out vec2 lnrm) {
  const float S = 0.15;
  float fk = float(k);
  vec2 sw = vec2(sin(uTime * 1.7 + fk + xz.y * 0.4), cos(uTime * 1.3 + fk * 2.0 + xz.x * 0.4)) * (0.012 + 0.05 * uTreeWind + 0.04 * uTreeShiver);
  vec2 g = (xz + sw) / S + fk * 7.31;
  vec2 ci = floor(g), f = g - ci;
  float a = 0.0, tone = 0.0; lnrm = vec2(0.0);
  for (int j = -1; j <= 1; j++) for (int i = -1; i <= 1; i++) {
    vec2 c = ci + vec2(i, j);
    vec2 h = hash22(c);
    if (hash12(c + 3.3) > dens) continue;
    vec2 o = vec2(i, j) + h - f;
    float an = hash12(c + 7.7) * 6.283;
    vec2 l = rot(an) * o;
    // a pointed oval leaf, about 1.6 cells long
    float u = l.x / 1.0;
    float w = 0.42 * sqrt(max(1.0 - u * u, 0.0)) * (1.0 - 0.25 * u);
    float d = abs(l.y) - w;
    float aa = 1.0 - smoothstep(-0.02, 0.02, max(d, abs(u) - 1.0));
    if (aa > a) { a = aa; tone = hash12(c + 1.1) + 0.3 * (l.y / max(w, 1e-3)) ; lnrm = rot(-an) * vec2(0.0, l.y); }
  }
  return vec2(a, tone);
}
// fraction of sunlight that reaches layer k at xz through the layers above (density only)
float sunThrough(vec3 p, int k) {
  float T = 1.0;
  for (int j = 1; j <= 4; j += 2) {
    int kk = k + j;
    if (kk >= NLAYER) break;
    float dy = float(j) * LDY;
    vec3 s = p + SUN * (dy / max(SUN.y, 0.05));
    T *= 1.0 - 0.9 * layerDens(s.xz, kk);
    if (T < 0.03) break;
  }
  return T;
}
// trace the wood and fruit only
float woodFruitTrace(vec3 ro, vec3 rd, float tmax, out int id) {
  id = -1;
  vec3 o = ro - uTreePos;
  float t = 0.05;
  for (int i = 0; i < 120; i++) {
    vec3 q = treeBend(o + rd * t);
    int fi; float df = fruitSD(q, fi);
    float d = min(min(woodSD(q), stalkSD(q)), df);
    if (d < 0.001 * t) { id = df <= d + 1e-4 ? 3 : 1; return t; }
    t += d * 0.9;
    if (t > tmax) break;
  }
  return -1.0;
}
// the crown from below: returns colour, and alpha through the leaves (1 = fully covered)
vec4 canopyBelow(vec3 ro, vec3 rd, float tmax, float jit) {
  vec3 col = vec3(0.0); float A = 0.0;
  if (rd.y <= 0.0) return vec4(0.0);
  for (int k = 0; k < NLAYER; k++) {
    float y = uTreePos.y + LY0 + float(k) * LDY;
    float t = (y - ro.y) / rd.y;
    if (t < 0.0) continue;
    if (t > tmax) break;
    vec3 p = ro + rd * t;
    float dens = layerDens(p.xz, k);
    if (dens < 0.02) continue;
    vec2 ln; vec2 lf = leafLayer(p.xz, k, 0.15 + 0.95 * dens, ln);
    float a = lf.x;
    if (a < 0.003) continue;
    float tone = fract(lf.y);
    // the leaf: dark from beneath, lit through where the sun reaches it
    float Ts = sunThrough(p, k) * cloudShadow(p);
    float up = float(k) / float(NLAYER - 1);
    vec3 under = mix(vec3(0.010, 0.016, 0.008), vec3(0.03, 0.04, 0.018), tone) * (gndAmb() * 3.5 + skyAmb() * 1.0);
    vec3 trans = mix(vec3(0.09, 0.16, 0.02), vec3(0.2, 0.22, 0.03), tone) * sunC() * Ts * (0.03 + 0.7 * pow(sat(dot(rd, SUN)), 14.0));
    trans += mix(vec3(0.02, 0.035, 0.01), vec3(0.04, 0.05, 0.015), tone) * skyAmb() * (0.3 + 0.6 * up) * (1.0 - 0.7 * dens);
    // veins: a darker midrib down the leaf
    float mid = exp(-abs(ln.y) * 120.0);
    vec3 lc = (under + trans) * (1.0 - 0.35 * mid);
    // a glint off the waxy underside, rarely
    col += (1.0 - A) * a * lc;
    A += (1.0 - A) * a;
    if (A > 0.995) break;
  }
  return vec4(col, A);
}
// sunbeams in the air under the crown
vec3 canopyShafts(vec3 ro, vec3 rd, float depth, float jit) {
  float tm = min(depth, 24.0);
  vec3 acc = vec3(0.0);
  for (int i = 0; i < 6; i++) {
    float t = tm * (float(i) + jit) / 6.0;
    vec3 p = ro + rd * t;
    if (p.y > uTreePos.y + LY0 + 2.0) break;
    // the sun ray from p up through the crown
    float T = 1.0;
    for (int j = 1; j < 8; j += 3) {
      float dy = uTreePos.y + LY0 + float(j) * LDY - p.y;
      if (dy < 0.0) continue;
      vec3 s = p + SUN * (dy / max(SUN.y, 0.05));
      T *= 1.0 - 0.92 * layerDens(s.xz, j);
    }
    acc += T * tm / 6.0;
  }
  float ph = 0.2 + 2.2 * pow(sat(dot(rd, SUN)), 8.0);
  return acc * sunC() * ph * 0.0016;
}
// the whole view from under the tree
vec3 underTree(vec3 ro, vec3 rd, float jit, out float depth) {
  gTreeLeaves = 0.0;
  vec3 bgc = gardenScene(ro, rd, jit, depth);
  gTreeLeaves = 1.0;
  vec4 cl = canopyBelow(ro, rd, depth, jit);
  return bgc * (1.0 - cl.a) + cl.rgb;
}
`;
