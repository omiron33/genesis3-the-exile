// The storm plain (s34): open grass country running to low hills under the storm deck, dark herds
// that bolt when the lightning strikes, birds thrown up off the grass. Builds on x-judgement.js.
import { JUDGE_GLSL, JUDGE_UNIFORMS } from '/song/lib/x-judgement.js';

export const PLAIN_UNIFORMS = {
  ...JUDGE_UNIFORMS,
  uHerdA: [-70, 0, 300], uHerdB: [60, 0, 430], uHerdC: [190, 0, 640],   // herd centres (scenes move them)
  uRunA: [1, 0, 0], uRunB: [1, 0, 0], uRunC: [1, 0, 0],                 // xz direction, y unused; length = speed m/s
  uGait: 0.0,        // gallop phase (cycles), integrated speed
  uBirdT: 0.0,       // seconds since the birds rose (<0: still in the grass)
  uGrassWind: 0.0,   // integrated wind travel (m) for the grass waves
};

export const PLAIN_GLSL = JUDGE_GLSL + /* glsl */ `
uniform vec3 uHerdA, uHerdB, uHerdC, uRunA, uRunB, uRunC;
uniform float uGait, uBirdT, uGrassWind;

float plainH(vec2 p) {
  float h = 7.0 * fbm(p / 260.0, 3) + 0.5 * vnoise(p / 30.0);
  // low hills rising toward the horizon
  if (p.y > 1500.0) h += smoothstep(1500.0, 6000.0, p.y) * 260.0 * fbm(p / 2200.0 + 4.0, 5);
  if (p.y > 4000.0) h += smoothstep(4000.0, 9000.0, p.y) * 420.0 * fbm(p / 3000.0 + 9.0, 4);
  return h;
}
float plainHc(vec2 p) { return 7.0 * fbm(p / 260.0, 3); }

// one running animal (a long-legged grazer, deer- or ox-like), local frame: x forward, y up
float beast(vec3 q, float ph, float sz) {
  q /= sz;
  float run = 1.0;
  float bob = 0.06 * sin(ph * 6.2832 * 2.0);
  vec3 b = q - vec3(0.0, 1.05 + bob, 0.0);
  float d = sdEllipsoid(b, vec3(0.78, 0.36, 0.3));
  // neck and head, stretched forward when running
  d = smin(d, sdCapsule(b, vec3(0.6, 0.1, 0.0), vec3(0.95, 0.45, 0.0), 0.13), 0.12);
  d = smin(d, sdEllipsoid(b - vec3(1.05, 0.42, 0.0), vec3(0.22, 0.11, 0.1)), 0.08);
  // legs: a gallop, front and back pairs out of phase
  for (int i = 0; i < 4; i++) {
    float fi = float(i);
    float front = i < 2 ? 1.0 : -1.0;
    float side = mod(fi, 2.0) < 0.5 ? 0.13 : -0.13;
    float a = sin((ph + (i < 2 ? 0.0 : 0.5) + (mod(fi, 2.0) * 0.12)) * 6.2832) * 0.55;
    vec3 hip = vec3(front * 0.5, -0.15, side);
    vec3 foot = hip + vec3(sin(a) * 0.85, -cos(a) * 0.85 - 0.05, 0.0);
    d = min(d, sdCapsule(b, hip, foot, 0.055));
  }
  return d * sz;
}
// herd centred at c, running along dir (xz, length = speed); returns distance and writes nothing else
float herd(vec3 p, vec3 c, vec3 dir, float seed) {
  vec2 rel = p.xz - c.xz;
  if (dot(rel, rel) > 75.0 * 75.0) return 1e9;
  float sp = length(dir.xz);
  vec2 f = sp > 0.01 ? dir.xz / sp : vec2(1, 0);
  // herd-local coordinates: x along the run
  vec2 l = vec2(dot(rel, f), dot(rel, vec2(-f.y, f.x)));
  vec2 cs = vec2(7.0, 5.5);
  vec2 ci = floor(l / cs);
  float best = 1e9;
  for (int j = 0; j < 2; j++) for (int i = 0; i < 2; i++) {
    vec2 cc = floor(l / cs - 0.5) + vec2(i, j);
    float h = hash12(cc + seed);
    vec2 cen = (cc + 0.5) * cs;
    // herd shape: an elongated blob, thinning at the edges
    float r = length(cen / vec2(65.0, 30.0));
    if (h > 0.75 * smoothstep(1.0, 0.25, r)) continue;
    vec2 jit = (hash22(cc + seed * 3.0) - 0.5) * cs * 0.6;
    jit += vec2(sin(uTime * 0.7 + h * 40.0), cos(uTime * 0.5 + h * 30.0)) * 0.6;
    vec2 lc = cen + jit;
    vec2 wc = c.xz + f * lc.x + vec2(-f.y, f.x) * lc.y;
    float gy = plainHc(wc);
    vec3 q = p - vec3(wc.x, gy, wc.y);
    // turn the animal along the run (with a little scatter)
    float a = (h - 0.5) * 0.5;
    vec2 ff = mat2(cos(a), -sin(a), sin(a), cos(a)) * f;
    vec3 lq = vec3(dot(q.xz, ff), q.y, dot(q.xz, vec2(-ff.y, ff.x)));
    float ph = uGait * (0.9 + 0.2 * h) + h * 7.0;
    best = min(best, beast(lq, ph, 1.25 + 0.35 * hash11(h * 13.0)));
  }
  return best;
}
int PMAT;
float plainMap(vec3 p) {
  float g = (p.y - plainH(p.xz)) * 0.6;
  PMAT = 0;
  if (g < 2.4) {
    float hd = min(herd(p, uHerdA, uRunA, 1.0), min(herd(p, uHerdB, uRunB, 2.0), herd(p, uHerdC, uRunC, 3.0)));
    if (hd < g) { PMAT = 1; return hd; }
  }
  return g;
}
vec2 plainMarch(vec3 ro, vec3 rd, float tmax) {
  float t = 1.0;
  for (int i = 0; i < 220; i++) {
    vec3 p = ro + rd * t;
    float d = plainMap(p);
    float eps = max(0.002, t * 0.0006);
    if (d < eps) return vec2(t, 1.0);
    t += max(d, max(eps, t * 0.0025));
    if (t > tmax) break;
  }
  return vec2(tmax, 0.0);
}
vec3 plainNormal(vec3 p, float t) {
  float e = max(0.01, t * 0.0015);
  vec2 k = vec2(e, 0);
  return normalize(vec3(plainMap(p + k.xyy) - plainMap(p - k.xyy), plainMap(p + k.yxy) - plainMap(p - k.yxy), plainMap(p + k.yyx) - plainMap(p - k.yyx)));
}

// grass under the storm: dark olive, with wind waves running across it (the bent grass shows its
// paler underside), clumps and bare earth
vec3 grassAlb(vec2 xz, float t, out float wave) {
  vec2 w2 = xz + 18.0 * vec2(fbm(xz * 0.01, 3), fbm(xz * 0.01 + 7.0, 3));
  float clump = fbm(w2 * 0.05, 5);
  vec3 c = mix(vec3(0.028, 0.038, 0.022), vec3(0.085, 0.092, 0.05), clump);
  // drier, paler swathes and darker wet hollows
  c = mix(c, vec3(0.14, 0.125, 0.08), smoothstep(0.55, 0.8, fbm(w2 * 0.012 + 5.0, 4)) * 0.75);
  c = mix(c, vec3(0.018, 0.024, 0.018), smoothstep(0.6, 0.75, fbm(w2 * 0.02 + 15.0, 4)) * 0.6);
  // tussocks and fine grain, fading with distance
  float fine = fbm(w2 * 0.9, 4);
  float lod = exp(-t / 180.0);
  c *= mix(1.0, 0.6 + 0.8 * fine, 0.4 + 0.6 * lod);
  // scattered shrubs: small dark round clumps
  vec2 cell = floor(xz / 9.0);
  vec2 bp = (cell + 0.25 + 0.5 * hash22(cell + 9.0)) * 9.0;
  float br = 0.8 + 1.6 * hash12(cell + 4.0);
  float bd = length(xz - bp) / br + 0.35 * (vnoise(xz * 1.7) - 0.5);
  float bush = step(0.8, hash12(cell + 3.0)) * smoothstep(1.0, 0.8, bd);
  c = mix(c, vec3(0.03, 0.036, 0.022), bush * 0.25);
  // a path worn by the herds
  vec2 wd = normalize(uJWind.xz);
  float wv = dot(xz, wd) - uGrassWind;
  wave = smoothstep(0.35, 0.9, fbm(vec2(wv * 0.035, dot(xz, vec2(-wd.y, wd.x)) * 0.012), 4)) * (1.0 - bush);
  return c;
}

// birds: a flock lifting off the grass and scattering across the frame (dark against the sky)
vec4 birds(vec3 ro, vec3 rd, float depth, vec3 origin) {
  if (uBirdT < -0.5) return vec4(0);
  float cover = 0.0;
  for (int i = 0; i < 70; i++) {
    float fi = float(i);
    vec3 h = hash33(vec3(fi, fi * 1.7, 3.3));
    float tt = max(uBirdT - h.x * 0.5, 0.0);
    // rise then scatter: a fanned spray away from the strike, flapping hard
    vec3 dir = normalize(vec3((h.y - 0.5) * 2.2, 0.35 + 0.5 * h.z, (h.x - 0.5) * 1.0 - 0.6));
    float sp = 9.0 + 6.0 * h.z;
    vec3 P = origin + (h - 0.5) * vec3(40.0, 0.0, 30.0) + vec3(0.0, 0.3, 0.0);
    P += dir * sp * tt + vec3(0.0, 2.0 * tt * tt * 0.3, 0.0);
    P.x += sin(tt * 1.5 + fi) * 1.2;
    float tc = dot(P - ro, rd);
    if (tc <= 0.5 || tc > depth) continue;
    vec3 off = ro + rd * tc - P;
    float span = 0.55 + 0.25 * h.y;
    if (dot(off, off) > span * span * 1.6) continue;
    // billboard coordinates
    vec3 r = normalize(cross(rd, vec3(0, 1, 0)));
    vec3 u = cross(r, rd);
    vec2 q = vec2(dot(off, r), dot(off, u)) / span;
    float flap = sin(uTime * (11.0 + 4.0 * h.y) + fi * 2.1);
    float ax = abs(q.x);
    float wingY = flap * 0.45 * ax - 0.1 * ax * ax;
    float wing = smoothstep(0.08 + 0.12 * (1.0 - ax), 0.0, abs(q.y - wingY)) * step(ax, 1.0) * (1.0 - ax * 0.3);
    float body = smoothstep(0.14, 0.05, length(q * vec2(1.0, 1.6)));
    float pw = jPix(tc) / span;
    float a = sat(max(wing, body) + 0.0) * sat(1.0 - pw * 0.6);
    cover = max(cover, a);
  }
  return vec4(vec3(0.015, 0.016, 0.018), cover);
}
`;
