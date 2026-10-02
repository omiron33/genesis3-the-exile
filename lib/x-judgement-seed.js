// Life through pain (s39), at macro scale: soaked dark earth at dusk with rain falling on it, drops
// striking the mud and the little pools between the clods (crowns of spray, rings); a seed lying
// half sunk in the mud splits along its seam (uSplit), and a pale shoot (a hooked stem, its two seed
// leaves still folded) pushes up out of the ground beside it, lifting and cracking the crust.
// Units: metres (the seed is ~13 mm long), y up, ground near y = 0. Builds on x-judgement.js.
import { JUDGE_GLSL, JUDGE_UNIFORMS } from '/song/lib/x-judgement.js';

export const NSHOOT = 18;
export const SEED_UNIFORMS = {
  ...JUDGE_UNIFORMS,
  uSplit: 0.0,                 // the seed coat splitting open 0..1
  uShoot: new Array(NSHOOT * 3).fill(0),   // the stem's centre line, base to tip
  uShootR: 0.0011,             // stem radius
  uShootK: 0.0,                // 0 no shoot .. 1 grown
  uCoty: 0.0,                  // the seed leaves opening 0..1
  uLift: 0.0,                  // the crust lifting where the shoot breaks through
  uRoot: 0.0,                  // the first root out of the tip of the nut 0..1
  uRainK: 1.0,                 // rain strength
  uKeyL: [-0.25, 0.32, 1.0], uKeyC: [1.7, 1.3, 0.95],
  uSkyZ: [0.035, 0.045, 0.07], uSkyH: [0.2, 0.16, 0.15],
};

export const SEED_GLSL = JUDGE_GLSL + /* glsl */ `
#define NSHOOT ${NSHOOT}
uniform float uSplit, uShootR, uShootK, uCoty, uLift, uRainK, uRoot;
uniform float uShoot[${NSHOOT * 3}];
uniform vec3 uKeyL, uKeyC, uSkyZ, uSkyH;
#define KEYL normalize(uKeyL)
vec3 shootP(int i) { return vec3(uShoot[i * 3], uShoot[i * 3 + 1], uShoot[i * 3 + 2]); }
const vec3 SEEDC = vec3(0.0, -0.0008, 0.0);
const float WL = -0.0026;     // the pools' surface

// ---------- the mud ----------
// crumb soil: rounded clods of a few millimetres, slumped by the rain, over a gently rolling bed
float clods(vec2 xz) {
  vec2 g = xz / 0.0045, i = floor(g), f = fract(g);
  float h = 0.0;
  for (int y = -1; y <= 1; y++) for (int x = -1; x <= 1; x++) {
    vec2 o = vec2(x, y), c = o + 0.2 + 0.6 * hash22(i + o);
    float r = 0.55 + 0.4 * hash12(i + o + 3.0);
    float d = length(f - c) / r;
    h = max(h, (0.4 + 0.6 * hash12(i + o + 7.0)) * sqrt(max(1.0 - d * d, 0.0)));
  }
  return h;
}
float mudBase(vec2 xz) {
  float hol = exp(-dot(xz, xz) / (0.011 * 0.011));
  if (dot(xz, xz) > 0.0016) return 0.003 * (fbm(xz * 30.0, 3) - 0.5) + 0.0013 * clods(xz);   // far: no fine grit
  float h = 0.003 * (fbm(xz * 30.0, 3) - 0.5) + 0.0013 * clods(xz) * (1.0 - 0.7 * hol) + 0.00035 * (vnoise(xz * 900.0) - 0.5) + 0.00015 * (vnoise(xz * 2600.0) - 0.5);
  // the seed lies in a little hollow it has pressed into the soft mud
  h -= 0.0012 * hol;
  return h;
}
float mudH(vec2 xz) {
  float h = mudBase(xz);
  // the crust lifting and breaking where the shoot comes up (a ring of plates around it)
  if (uLift > 0.0) {
    vec2 c = xz - vec2(shootP(0).x, shootP(0).z);
    float r = length(c);
    float dome = uLift * 0.0035 * exp(-r * r / (0.0045 * 0.0045));
    float a = atan(c.y, c.x);
    float plates = abs(sin(a * 2.5 + 0.7) * sin(a * 1.5 + 2.0));
    float split = smoothstep(0.15, 0.0, plates) * smoothstep(0.009, 0.002, r) * uLift;
    h += dome - split * 0.0025 - smoothstep(0.0028, 0.0012, r) * uLift * 0.003;
  }
  return h;
}

// ---------- the seed: a nut (acorn-like), half sunk, its shell cracking open along its length ----------
// local frame: x along the nut (tip at +x), the crack along the top (the z = 0 plane)
vec3 seedLocal(vec3 p) {
  vec3 q = p - SEEDC;
  q.xz = mat2(0.94, -0.34, 0.34, 0.94) * q.xz;
  q.xy = mat2(0.985, 0.17, -0.17, 0.985) * q.xy;      // tip tilted a little up out of the mud
  return q;
}
float nutShape(vec3 q, float shrink) {
  // a long egg: blunt at the cup scar (-x), drawn to a point at the tip (+x)
  float u = clamp(q.x / 0.0098, -1.0, 1.0);
  float r = 0.0049 * sqrt(max(1.0 - u * u, 0.0)) * (1.0 - 0.3 * max(u, 0.0)) * (1.0 + 0.1 * max(-u, 0.0)) - shrink;
  float d = length(q.yz) - r;
  d = max(d, abs(q.x) - 0.0098 + shrink);
  return d * 0.8;
}
float seedSD(vec3 p, out float inner) {
  vec3 q = seedLocal(p);
  if (length(q) > 0.014) { inner = 0.0; return length(q) - 0.012; }
  // the crack: a torn, fibrous gap along the top, widest mid-length
  float rag = 0.55 + 0.6 * vnoise(vec2(q.x * 1400.0, 3.0)) + 0.35 * vnoise(vec2(q.x * 5200.0, 7.0));
  // the shell splits at the tip, where the root will come: a torn gap running back along one side
  float along = smoothstep(0.0098 - 0.012 * uSplit, 0.0098, q.x);
  float cz = q.z - 0.0012 * sin(q.x * 700.0) - 0.0004 * (vnoise(vec2(q.x * 3000.0, 1.0)) - 0.5);
  float gap = uSplit * 0.0016 * along * rag * smoothstep(-0.002, 0.002, q.y);
  float side = cz >= 0.0 ? 1.0 : -1.0;
  vec3 hq = q - vec3(0.0, 0.0, side * gap);
  hq.z = cz - side * gap;
  // fine lengthwise fibres in the shell
  float fib = 0.000025 * (vnoise(vec2(atan(hq.z, hq.y) * 60.0, hq.x * 300.0)) - 0.5);
  float shell = max(nutShape(q - vec3(0.0, 0.0, side * gap), 0.0) + fib, -side * hq.z);
  // the kernel inside: cream, slightly smaller, filling the crack
  float kern = nutShape(q, 0.00045);
  inner = kern < shell ? 1.0 : 0.0;
  return min(shell, kern);
}

// ---------- the shoot ----------
float shootSD(vec3 p, out float hk) {
  hk = 0.0;
  if (uShootK <= 0.0) return 1e5;
  // bounding sphere round the whole shoot
  vec3 sc = 0.5 * (shootP(0) + shootP(NSHOOT - 1));
  float br = 0.5 * length(shootP(NSHOOT - 1) - shootP(0)) + 0.012;
  float bd = length(p - sc) - br;
  if (bd > 0.002) return bd;
  float d = 1e5;
  for (int i = 0; i < NSHOOT - 1; i++) {
    vec3 a = shootP(i), b = shootP(i + 1);
    vec3 pa = p - a, ba = b - a; float h = sat(dot(pa, ba) / max(dot(ba, ba), 1e-9));
    float u = (float(i) + h) / float(NSHOOT - 1);
    float r = uShootR * (1.0 - 0.2 * u);
    float k = length(pa - ba * h) - r;
    if (k < d) { d = k; hk = u; }
  }
  // the two seed leaves at the tip, folded together, opening with uCoty
  vec3 tip = shootP(NSHOOT - 1), pre = shootP(NSHOOT - 2);
  vec3 ax = normalize(tip - pre);
  vec3 sd = normalize(cross(ax, vec3(0.0, 0.0, 1.0)) + vec3(1e-4));
  for (int j = 0; j < 2; j++) {
    float s = j == 0 ? 1.0 : -1.0;
    float op = uCoty * 1.1;
    vec3 dir = normalize(ax * cos(op) + sd * s * sin(op));
    vec3 c = tip + dir * 0.0032 + sd * s * 0.0006;
    vec3 q = p - c;
    // leaf frame: long along dir, thin across the fold
    vec3 n = normalize(cross(dir, vec3(0.0, 0.0, 1.0)) + vec3(1e-4));
    vec3 lq = vec3(dot(q, dir), dot(q, n), q.z);
    float leaf = sdEllipsoid(lq, vec3(0.0036, 0.0009, 0.0024));
    if (leaf < d) { d = leaf; hk = 1.05; }
  }
  return d;
}

// the radicle: a pale root out of the nut's tip, bending down into the mud
float rootSD(vec3 p) {
  if (uRoot <= 0.0) return 1e5;
  vec3 q = seedLocal(p);           // in the nut's own frame (a rotation, so distances hold)
  if (length(q - vec3(0.012, -0.002, 0.0)) > 0.012) return length(q - vec3(0.012, -0.002, 0.0)) - 0.01;
  // a smooth arc out of the tip, curving over and down into the mud, growing from its tip
  float L = uRoot;
  float d = 1e5;
  vec3 prev = vec3(0.0084, 0.0008, 0.0);
  for (int i = 1; i <= 6; i++) {
    float u = float(i) / 6.0 * L;
    vec3 cur = vec3(0.0084 + 0.011 * u, 0.0008 + 0.005 * u - 0.0095 * u * u, 0.0015 * u * u);
    float r0 = 0.00062 * (1.0 - 0.45 * (float(i) - 1.0) / 6.0), r1 = 0.00062 * (1.0 - 0.45 * float(i) / 6.0);
    d = min(d, sdRoundCone(q, prev, cur, r0, i == 6 ? r1 * 0.6 : r1));
    prev = cur;
  }
  return d;
}
int MID;   // 0 mud, 1 seed, 2 shoot
float INNER, HK;
float seedMap(vec3 p) {
  float g = (p.y - mudH(p.xz)) * 0.7;
  float inner, hk;
  float s = seedSD(p, inner);
  float sh = shootSD(p, hk);
  float rt = rootSD(p);
  if (rt < sh) { sh = rt; hk = 0.0; }
  MID = 0; float d = g;
  if (s < d) { d = s; MID = 1; INNER = inner; }
  if (sh < d) { d = sh; MID = 2; HK = hk; }
  return d;
}
float seedMarch(vec3 ro, vec3 rd, float tmax) {
  float t = 0.0;
  for (int i = 0; i < 160; i++) {
    vec3 p = ro + rd * t;
    float d = seedMap(p);
    if (d < 0.000015 + t * 0.0006) return t;
    t += d;
    if (t > tmax) break;
  }
  return -1.0;
}
vec3 seedN(vec3 p, float t) {
  float e = 0.00003 + t * 0.0004;
  vec2 k = vec2(e, 0.0);
  return normalize(vec3(seedMap(p + k.xyy) - seedMap(p - k.xyy), seedMap(p + k.yxy) - seedMap(p - k.yxy), seedMap(p + k.yyx) - seedMap(p - k.yyx)));
}
// shadows: only the seed and the shoot cast them (the mud's own relief is in its shading)
float objMap(vec3 p) { float a, b; return min(min(seedSD(p, a), shootSD(p, b)), rootSD(p)); }
float seedShadow(vec3 p, vec3 L) {
  float s = 1.0, t = 0.0004;
  for (int i = 0; i < 20; i++) {
    float d = objMap(p + L * t);
    s = min(s, sat(10.0 * d / t));
    if (s < 0.01) break;
    t += max(d, 0.0003);
    if (t > 0.05) break;
  }
  return s;
}
vec3 duskSky(vec3 rd) {
  vec3 c = mix(uSkyH, uSkyZ, pow(sat(rd.y * 1.6 + 0.05), 0.6));
  c += uKeyC * 0.12 * pow(max(dot(rd, KEYL), 0.0), 8.0);
  return c;
}

// ---------- rain: drops falling and striking ----------
// impact i: where and when (slots of 'per' seconds, offset per drop)
const int NDROP = 22;
const vec2 AREA = vec2(0.11, 0.13);
vec4 impact(int i, float t) {
  float fi = float(i);
  float per = 0.35 + 0.35 * hash11(fi * 3.1);
  float off = hash11(fi * 7.7) * per;
  float slot = floor((t + off) / per);
  float t0 = slot * per - off;
  vec2 h = hash22(vec2(fi * 1.3, slot * 0.71));
  vec2 xz = (h - 0.5) * AREA + vec2(0.0, 0.025);
  return vec4(xz.x, xz.y, t0, slot);
}
// ripples in the pools: a normal tilt
vec2 rippleG(vec2 xz) {
  vec2 g = vec2(0.0);
  for (int i = 0; i < NDROP; i++) {
    vec4 im = impact(i, uTime);
    float age = uTime - im.z;
    vec2 d = xz - im.xy; float r = length(d) + 1e-5;
    float c = 0.09;   // ring speed m/s
    float x = (r - age * c) / 0.0012;
    float env = exp(-x * x) * exp(-age * 3.0) * uRainK;
    g += d / r * sin(x * 3.0) * env * 0.35;
  }
  return g;
}
// drops in the air and the spray: analytic spheres; returns (t, kind) kind 1 drop
vec2 dropsTrace(vec3 ro, vec3 rd, float tmax, out vec3 nOut) {
  float best = tmax; float kind = 0.0; nOut = vec3(0, 1, 0);
  for (int i = 0; i < NDROP; i++) {
    vec4 im = impact(i, uTime);
    float age = uTime - im.z;
    vec3 base = vec3(im.x, mudBase(im.xy), im.y);
    // the falling drop before the impact (the next one in this slot)
    vec4 nx = impact(i, uTime + 0.12);
    float tf = nx.z - uTime;
    if (tf > 0.0 && tf < 0.12) {
      vec3 c = vec3(nx.x, mudBase(nx.xy) + 7.5 * tf, nx.y);
      float r = 0.0016 * uRainK;
      vec3 oc = ro - c; float b = dot(oc, rd), cc = dot(oc, oc) - r * r, h = b * b - cc;
      if (h > 0.0) { float tt = -b - sqrt(h); if (tt > 0.0 && tt < best) { best = tt; kind = 1.0; nOut = normalize(ro + rd * tt - c); } }
    }
    // the crown of spray
    if (age > 0.0 && age < 0.22) {
      for (int j = 0; j < 4; j++) {
        float fj = float(j);
        float a = fj * 0.8976 + hash11(im.w + fj + float(i)) * 0.6;
        float sp = 0.3 + 0.25 * hash11(fj * 3.0 + im.w);
        vec3 v = vec3(cos(a) * sp, 0.55 + 0.4 * hash11(fj + im.w * 2.0), sin(a) * sp);
        vec3 c = base + v * age + vec3(0.0, -4.9 * age * age, 0.0);
        if (c.y < base.y - 0.001) continue;
        float r = 0.00035 * (1.0 - age / 0.22) * uRainK;
        vec3 oc = ro - c; float b = dot(oc, rd), cc = dot(oc, oc) - r * r, h = b * b - cc;
        if (h > 0.0) { float tt = -b - sqrt(h); if (tt > 0.0 && tt < best) { best = tt; kind = 1.0; nOut = normalize(ro + rd * tt - c); } }
      }
    }
  }
  return vec2(best, kind);
}
// a fresh impact darkens and gouges the mud a little (shading only)
float impactMark(vec2 xz) {
  float m = 0.0;
  for (int i = 0; i < NDROP; i++) {
    vec4 im = impact(i, uTime);
    float age = uTime - im.z;
    float r = length(xz - im.xy);
    m += smoothstep(0.003, 0.0, r) * exp(-age * 2.0) * uRainK;
  }
  return sat(m);
}
`;
