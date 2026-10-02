// The broken order (s40), seen close: on the edge of a ridge in storm light, a young sapling (a thin
// stem, a few fresh leaves) and a dark twining vine that climbs it. The vine coils up the sapling
// (uVineTop: how high it has got), its coils tighten (uCoil: coil radius) and its weight bends the
// young plant over (uBend); the sapling's leaves droop (uDroop). Behind: the storm over the valley,
// the sun going down in a slot of clear sky under the cloud deck. Units: metres, ground at y = 0.
import { JUDGE_GLSL, JUDGE_UNIFORMS } from '/song/lib/x-judgement.js';

export const VINE_UNIFORMS = {
  ...JUDGE_UNIFORMS,
  uVineTop: 0.15, uCoil: 0.013, uBend: 0.0, uDroop: 0.0, uSway: 0.0,
};

export const VINE_GLSL = JUDGE_GLSL + /* glsl */ `
uniform float uVineTop, uCoil, uBend, uDroop, uSway;
const float SH = 0.42;       // sapling height

// the sapling's centre line at height y (bends over under the vine, sways in the wind)
vec3 stemP(float y) {
  float k = y / SH;
  float x = 0.008 * sin(y * 9.0 + 0.5) + uBend * 0.16 * k * k * k;
  float z = 0.004 * sin(y * 7.0);
  float w = uSway * k * k;
  return vec3(x + w * 0.02, y - uBend * 0.05 * k * k * k * k, z + w * 0.006);
}
float stemR(float y) { return mix(0.006, 0.0022, sat(y / SH)); }

// leaf: flat, pointed, with a midrib fold; local frame (along, across, normal)
float leafSD(vec3 q, vec2 size) {
  float u = q.x / size.x;                     // 0 at the stalk .. 1 at the tip
  float w = size.y * sin(sat(u) * 3.1416) * (1.0 - 0.25 * u);
  // a toothed margin, and the odd bite out of it
  w *= 1.0 - 0.07 * abs(sin(u * 46.0)) - 0.35 * smoothstep(0.72, 0.9, vnoise(vec2(u * 9.0, sign(q.y) * 3.0 + size.x * 300.0)));
  float fold = abs(q.y) * 0.25;
  float d = max(abs(q.y) - w, max(-q.x, q.x - size.x));
  // a couple of small holes eaten through
  float hole = vnoise(q.xy / size.x * 7.0 + size.x * 500.0);
  d = max(d, (hole - 0.8) * size.y * 0.25);
  return max(d, abs(q.z - fold) - 0.0006);
}

vec2 LUV;   // leaf coordinates of the last leaf hit (along 0..1, across -1..1)
float saplingSD(vec3 p, out int part) {
  part = 0;
  if (p.y > SH + 0.08 || p.y < -0.01) return 1e5;
  float y = clamp(p.y, 0.0, SH);
  // nearest point on the (gently curved) stem: refine once
  vec3 c = stemP(y);
  float yy = clamp(y + (p.y - c.y), 0.0, SH);
  c = stemP(yy);
  float d = length(p - c) - stemR(yy);
  // a tip bud
  d = min(d, length(p - stemP(SH)) - 0.004);
  // fresh leaves, alternate
  for (int i = 0; i < 5; i++) {
    float fi = float(i);
    float hy = 0.16 + 0.055 * fi;
    vec3 b = stemP(hy);
    float sd = mod(fi, 2.0) < 0.5 ? 1.0 : -1.0;
    vec3 out_ = normalize(vec3(sd, 0.0, 0.35 * sin(fi * 2.1)));
    float droop = -0.35 + uDroop * (1.3 + 0.3 * hash11(fi)) + 0.08 * sin(uTime * 2.0 + fi);
    vec3 along = normalize(out_ * cos(droop) - vec3(0.0, sin(droop), 0.0));
    vec3 face = vec3(0.0, 0.3, -1.0);
    vec3 nrm = normalize(face - along * dot(face, along));
    vec3 across = cross(nrm, along);
    vec3 q = p - b;
    vec3 lq = vec3(dot(q, along), dot(q, across), dot(q, nrm));
    vec2 sz2 = vec2(0.06 - 0.005 * fi, 0.02);
    // cupped a little, edges lifting
    lq.z -= 0.25 * lq.y * lq.y / sz2.y;
    float l = leafSD(lq, sz2);
    if (l < d) { d = l; part = 1; LUV = vec2(lq.x / sz2.x, lq.y / sz2.y); }
  }
  return d;
}

// the vine: a helix round the sapling, from the ground up to uVineTop, coils of radius uCoil
const float PITCH = 0.075;
vec3 vineP(float y) {
  vec3 c = stemP(y);
  float a = y / PITCH * 6.2832 + 1.0;
  float r = uCoil + stemR(y);
  return c + vec3(cos(a) * r, 0.0, sin(a) * r);
}
float vineSD(vec3 p, out int part) {
  part = 2;
  if (p.y > uVineTop + 0.06 || p.y < -0.01) return 1e5;
  vec3 c = stemP(clamp(p.y, 0.0, SH));
  float a = atan(p.z - c.z, p.x - c.x);
  float a0 = p.y / PITCH * 6.2832 + 1.0;
  float da = mod(a - a0 + 3.1416, 6.2832) - 3.1416;
  float yc = p.y + da / 6.2832 * PITCH;
  float d = 1e5;
  for (int k = -1; k <= 1; k++) {
    float yk = clamp(yc + float(k) * PITCH, 0.0, uVineTop);
    float r = mix(0.0042, 0.0026, sat(yk / 0.45));
    d = min(d, length(p - vineP(yk)) - r);
  }
  // the vine's broad dark leaves along it (heart-ish), on short stalks
  for (int i = 0; i < 7; i++) {
    float fi = float(i);
    float ly = 0.05 + 0.062 * fi;
    if (ly > uVineTop - 0.01) break;
    vec3 b = vineP(ly);
    vec3 c2 = stemP(ly);
    vec3 out_ = normalize(vec3(b.x - c2.x, 0.0, b.z - c2.z));
    float droop = 0.5 + 0.1 * sin(uTime * 1.7 + fi * 2.0);
    vec3 along = normalize(out_ * cos(droop) - vec3(0.0, sin(droop), 0.0) * 0.5 + vec3(0.0, 0.25, 0.0));
    vec3 face = vec3(0.2 * out_.x, 0.4, -1.0);
    vec3 nrm = normalize(face - along * dot(face, along));
    vec3 across = cross(nrm, along);
    vec3 q = p - b - along * 0.008;
    vec3 lq = vec3(dot(q, along), dot(q, across), dot(q, nrm));
    float sz = 0.05 * smoothstep(uVineTop - 0.01, uVineTop - 0.08, ly);
    if (sz < 0.004) continue;
    // heart: two lobes at the base
    float u = lq.x / sz;
    float w = sz * 0.62 * (sin(sat(u) * 3.1416) * 0.8 + 0.3 * (1.0 - sat(u * 2.0))) ;
    float ld = max(max(abs(lq.y) - w, max(-lq.x, lq.x - sz)), abs(lq.z) - 0.0007);
    if (ld < d) { d = ld; part = 3; LUV = vec2(u, lq.y / (sz * 0.62)); }
  }
  // the growing tip: a tendril curling in a tight spiral
  vec3 tip = vineP(uVineTop);
  vec3 q = p - tip;
  float tr = length(q.xz) ;
  float ta = atan(q.z, q.x);
  float sp = 0.006 * exp(-0.18 * mod(ta + uTime * 0.6, 6.2832));
  float td = length(vec2(tr - sp - 0.003, q.y - 0.004)) - 0.0009;
  if (td < d) { d = td; part = 2; }
  return d;
}

// rocks of the ridge: weathered boulders, one each side of the sapling, one close in front
float rock(vec3 p, vec3 c, vec3 r, float seed) {
  vec3 q = p - c;
  float b = length(q / r) - 1.0;
  if (b > 0.4) return b * min(r.x, min(r.y, r.z));
  float d = sdEllipsoid(q, r);
  d += 0.18 * min(r.x, r.y) * (fbm(q / r.y * 1.6 + seed, 4) - 0.5);
  // flat fractured faces
  d = max(d, dot(q, normalize(vec3(sin(seed), 0.6, cos(seed)))) - r.y * 0.55);
  return d;
}
float rocksSD(vec3 p) {
  float d = rock(p, vec3(0.16, 0.0, 0.12), vec3(0.11, 0.07, 0.09), 1.0);
  d = min(d, rock(p, vec3(-0.26, -0.01, 0.34), vec3(0.16, 0.11, 0.13), 2.7));
  d = min(d, rock(p, vec3(-0.17, -0.01, -0.2), vec3(0.08, 0.05, 0.07), 4.1));
  d = min(d, rock(p, vec3(0.35, -0.02, 0.62), vec3(0.2, 0.1, 0.12), 5.3));
  return d;
}
int VPART;
float vineMap(vec3 p) {
  int a, b;
  float s = saplingSD(p, a);
  float v = vineSD(p, b);
  // the ridge top, ending in a ragged edge beyond which the land falls away to the valley
  float g = p.y - 0.004 * (vnoise(p.xz * 40.0) - 0.5) - 0.006 * fbm(p.xz * 9.0, 3) + 0.004;
  g = max(g, p.z - 0.75 - 0.08 * (vnoise(vec2(p.x * 6.0, 1.0)) - 0.5) + p.y * 0.4);
  float d = g; VPART = 4;
  float rk = rocksSD(p);
  if (rk < d) { d = rk; VPART = 5; }
  vec2 luvS = LUV;
  if (s < d) { d = s; VPART = a; }
  if (v < d) { d = v; VPART = b; }
  if (VPART == 1) LUV = luvS;
  return d;
}
float vineMarch(vec3 ro, vec3 rd, float tmax) {
  float t = 0.0;
  for (int i = 0; i < 160; i++) {
    vec3 p = ro + rd * t;
    float d = vineMap(p);
    if (d < 0.00012 + t * 0.0004) return t;
    t += d * 0.8;
    if (t > tmax) break;
  }
  return -1.0;
}
vec3 vineN(vec3 p) {
  vec2 e = vec2(0.0002, 0.0);
  return normalize(vec3(vineMap(p + e.xyy) - vineMap(p - e.xyy), vineMap(p + e.yxy) - vineMap(p - e.yxy), vineMap(p + e.yyx) - vineMap(p - e.yyx)));
}
`;
