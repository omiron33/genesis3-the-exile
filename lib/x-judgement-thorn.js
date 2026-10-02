// Thorn and thistle (s43): out of the cracked hardpan (x-judgement-earth.js), in hard white light,
// thorn shoots force up and twist (uThornG: growth 0..1), studded with long hooked thorns; thistles
// shoot up beside them (uThistleG) and their spiny heads open (uOpen) into silver down.
// Units: metres, ground near y = 0.
import { EARTH_GLSL, EARTH_UNIFORMS } from '/song/lib/x-judgement-earth.js';

export const THORN_UNIFORMS = { ...EARTH_UNIFORMS, uThornG: 0.0, uThistleG: 0.0, uOpen: 0.0 };

export const THORN_GLSL = EARTH_GLSL + /* glsl */ `
uniform float uThornG, uThistleG, uOpen;
#define NTHORN 6
#define NTHISTLE 3

// thorn shoot i: base, height, lean, twist phase
vec4 thornInfo(int i, out vec3 base) {
  float fi = float(i);
  vec2 h = hash22(vec2(fi * 3.7, 1.3));
  // a thicket: the canes come up close together out of one crack
  base = vec3(-0.1 + 0.035 * fi + 0.05 * (h.x - 0.5), 0.0, 0.3 + 0.12 * (h.y - 0.5) + 0.02 * fi);
  float H = (0.2 + 0.18 * hash11(fi * 5.1)) * sat(uThornG * (1.2 - 0.06 * fi));
  return vec4(H, (h.x - 0.5) * 1.3, h.y * 6.28, 0.0);
}
vec3 thornC(vec3 base, vec4 inf, float s) {
  float k = s / max(inf.x, 1e-3);
  // canes arch over as they climb, and kink at each node
  return base + vec3(inf.y * s * s + 0.012 * sin(s * 26.0 + inf.z) * k, s, 0.01 * cos(s * 19.0 + inf.z) * k - 0.4 * s * s);
}
int TPART;   // 1 thorn wood, 2 thorn spike, 3 thistle stalk, 4 thistle bracts, 5 thistle down
float TS;      // where along the cane the last hit was (0..1)
// one bramble cane (a main stem or a branch): a thick arching stem studded with hooked prickles
float caneSD(vec3 p, vec3 base, vec4 inf, float r0, float d) {
  vec3 q = p - base;
  float s = clamp(q.y, 0.0, inf.x);
  vec3 c;
  for (int it = 0; it < 2; it++) {
    c = thornC(base, inf, s);
    vec3 tg = normalize(thornC(base, inf, s + 0.002) - c);
    s = clamp(s + dot(p - c, tg), 0.0, inf.x);
  }
  c = thornC(base, inf, s);
  float r = mix(r0, r0 * 0.3, s / inf.x);
  float w = length(p - c) - r;
  if (w > 0.03) return min(d, w - 0.015);
  if (w < d) { d = w; TPART = 1; TS = s / inf.x; }
  // prickles every 9 mm, spiralling round the stem: broad based, raked back and hooked down
  float k0 = floor(s / 0.009);
  for (int j = 0; j <= 1; j++) {
    float kk = k0 + float(j);
    float sk = kk * 0.009 + 0.004;
    if (sk > inf.x - 0.006) continue;
    vec3 a = thornC(base, inf, sk);
    float ang = kk * 2.4 + inf.z;
    vec3 o = normalize(vec3(cos(ang), -0.35, sin(ang)));
    float rr = mix(r0, r0 * 0.3, sk / inf.x);
    float len = (rr + 0.006) * smoothstep(0.0, 0.02, inf.x - sk);
    vec3 mid = a + o * len * 0.55;
    vec3 tip = a + o * len + vec3(0.0, -0.0025, 0.0);
    float sp = min(sdRoundCone(p, a, mid, rr * 0.75, rr * 0.25), sdRoundCone(p, mid, tip, rr * 0.25, 0.0001));
    if (sp < d) { d = sp; TPART = 2; TS = length(p - a) / (len + 1e-4); }
  }
  return d;
}
float thornsSD(vec3 p) {
  float bb = length(max(abs(p - vec3(0.0, 0.22, 0.4)) - vec3(0.42, 0.24, 0.28), 0.0));
  if (bb > 0.01) return bb;
  float d = 1e5;
  for (int i = 0; i < NTHORN; i++) {
    vec3 base; vec4 inf = thornInfo(i, base);
    if (inf.x < 0.002) continue;
    vec3 q = p - base;
    if (abs(q.x) > 0.14 || abs(q.z + 0.02) > 0.12 || q.y > inf.x + 0.03 || q.y < -0.01) { d = min(d, length(max(abs(q - vec3(0.0, inf.x * 0.5, -0.02)) - vec3(0.13, inf.x * 0.5 + 0.02, 0.11), 0.0)) + 0.005); continue; }
    d = caneSD(p, base, inf, 0.0085, d);
    // a side branch from partway up, arching the other way
    if (inf.x > 0.08) {
      vec3 bb2 = thornC(base, inf, inf.x * 0.42);
      vec4 ib = vec4(inf.x * 0.5, -inf.y * 1.6 + (inf.y > 0.0 ? -0.8 : 0.8), inf.z + 2.1, 0.0);
      d = caneSD(p, bb2, ib, 0.005, d);
    }
  }
  // thistles
  for (int i = 0; i < NTHISTLE; i++) {
    float fi = float(i);
    vec3 base = vec3(-0.24 + 0.24 * fi + 0.05 * hash11(fi * 2.3), 0.0, 0.3 + 0.16 * hash11(fi * 7.9));
    float H = (0.3 + 0.1 * hash11(fi * 4.4)) * sat(uThistleG * 1.2 - fi * 0.1);
    if (H < 0.01) continue;
    vec3 q = p - base;
    if (abs(q.x) > 0.08 || abs(q.z) > 0.08 || q.y > H + 0.06) { d = min(d, length(max(abs(q - vec3(0.0, H * 0.5, 0.0)) - vec3(0.07, H * 0.5 + 0.05, 0.07), 0.0)) + 0.005); continue; }
    vec3 top = vec3(0.01 * sin(fi * 3.0), H, 0.006);
    float st = sdCapsule(q, vec3(0.0), top, 0.0045);
    // two spiny leaves clasping the stalk
    for (int k = 0; k < 2; k++) {
      float ly = H * (0.35 + 0.25 * float(k));
      float sd = k == 0 ? 1.0 : -1.0;
      vec3 lq = q - vec3(0.0, ly, 0.0);
      lq.xy = mat2(0.8, -0.6 * sd, 0.6 * sd, 0.8) * lq.xy;
      float u = lq.x * sd / 0.06;
      float w = 0.012 * sin(sat(u) * 3.14) * (0.6 + 0.4 * abs(sin(u * 18.0)));
      float lf = max(max(abs(lq.z) - w, max(-u * 0.06, u * 0.06 - 0.06)), abs(lq.y) - 0.0008);
      st = min(st, lf);
    }
    if (st < d) { d = st; TPART = 3; }
    // the head: an egg of overlapping bracts, each drawn out into a stiff spine, the lower ones
    // spreading and bending back
    float hr = 0.02 * smoothstep(0.08, 0.25, H);
    vec3 hq = q - top - vec3(0.0, hr * 0.85, 0.0);
    float ball = sdEllipsoid(hq, vec3(hr, hr * 1.1, hr));
    float bdist = length(hq);
    if (bdist < hr * 2.2) {
      vec3 dir = hq / max(bdist, 1e-5);
      float el = asin(clamp(dir.y, -1.0, 1.0)), az = atan(dir.z, dir.x);
      // a lattice of spines (rows in elevation, staggered in azimuth)
      float row = floor(el / 0.32 + 0.5);
      float n = max(3.0, floor(14.0 * cos(row * 0.32)));
      float azc = (floor(az / 6.2832 * n + 0.5 * mod(row, 2.0)) + 0.5 - 0.5 * mod(row, 2.0)) / n * 6.2832;
      float elc = row * 0.32 - 0.15 * smoothstep(0.0, -1.2, row * 0.32);
      vec3 sd = vec3(cos(elc) * cos(azc), sin(elc), cos(elc) * sin(azc));
      sd = normalize(sd + vec3(0.0, -0.25 * smoothstep(0.2, -0.6, elc), 0.0));
      float slen = hr * (1.6 - 0.5 * smoothstep(-0.4, 0.9, elc));
      float spine = sdRoundCone(hq, sd * hr * 0.75, sd * slen, hr * 0.13, 0.00012);
      ball = min(ball, spine);
    }
    if (ball < d) { d = ball; TPART = 4; }
    // the flower: a dense tuft of purple florets bursting from the top, opening with uOpen
    if (uOpen > 0.0) {
      float o = uOpen * sat(uThistleG * 1.2 - fi * 0.1);
      vec3 dq = hq - vec3(0.0, hr * 0.75, 0.0);
      float rad = length(dq.xz), hh = dq.y;
      float th = hr * 1.3 * o;
      float tuft = max(rad - hr * (0.55 + 0.45 * sat(hh / max(th, 1e-4))) , max(-hh, hh - th));
      // ragged top of separate florets
      tuft += hr * 0.18 * (vnoise(dq.xz / hr * 9.0) - 0.5);
      if (tuft < d) { d = tuft; TPART = 5; }
    }
  }
  return d;
}
float thornMap(vec3 p) {
  int tp = 0;
  float g = (p.y - earthHc(p.xz)) * 0.8;
  float t = thornsSD(p);
  if (t < g) return t;
  TPART = 0;
  return g;
}
float thornMarch(vec3 ro, vec3 rd, float tmax) {
  float t = 0.0;
  for (int i = 0; i < 200; i++) {
    vec3 p = ro + rd * t;
    float d = thornMap(p);
    if (d < 0.00008 + t * 0.0008) return t;
    t += d * 0.9;
    if (t > tmax) break;
  }
  return -1.0;
}
vec3 thornN(vec3 p, float t) {
  vec2 e = vec2(0.00015 + t * 0.0004, 0.0);
  return normalize(vec3(thornMap(p + e.xyy) - thornMap(p - e.xyy), thornMap(p + e.yxy) - thornMap(p - e.yxy), thornMap(p + e.yyx) - thornMap(p - e.yyx)));
}
float thornShadow(vec3 p, vec3 L) {
  float s = 1.0, t = 0.001;
  for (int i = 0; i < 26; i++) {
    vec3 q = p + L * t;
    float d = thornsSD(q);
    s = min(s, sat(28.0 * d / t));
    if (s < 0.01) break;
    t += max(d, 0.003);
    if (t > 0.6 || q.y > 0.45) break;
  }
  return s;
}
`;
