// The garden of Delight seen close: grass and reeds blade by blade, wildflowers, fruit trees leaf by
// leaf (with fruit, bark and dappled light through the crown), and small living things (birds, bees,
// deer far off, petals and leaves on the wind). Include after GARDEN_GLSL (x-garden.js).

export const NEAR_GLSL = /* glsl */ `
uniform float uGrassH;    // tall grass height (m); 0 = no blades
uniform float uReeds;     // 1 = reeds stand along the water's edge

// ---------------------------------------------------------------- grass and reeds
float reedMask(vec2 xz) {
  float rd = riverDist(xz);
  return uReeds * smoothstep(4.0, 1.0, rd) * smoothstep(-2.6, -0.8, rd) * smoothstep(0.35, 0.6, vnoise(xz * 0.12 + 1.7));
}
float grassTall(vec2 xz) {
  float m = 0.55 + 0.75 * vnoise(xz * 0.13 + 2.0);
  return mix(uGrassH * m, 1.9, reedMask(xz));
}
vec3 GR_INFO;  // x = height fraction on the blade, y = blade id, z = kind (0 grass, 1 flower, 2 reed, 3 seed head)
// closest approach of the ray (o, d) to the segment a..a+v: returns (t on ray, s on segment, distance)
vec3 raySeg(vec3 o, vec3 d, vec3 a, vec3 v) {
  vec3 w0 = o - a;
  float b = dot(d, v), c = dot(v, v), e = dot(v, w0), dd = dot(d, w0);
  float den = max(c - b * b, 1e-6);
  float s = clamp((e - b * dd) / den, 0.0, 1.0);
  float t = dot(a + v * s - o, d);
  return vec3(t, s, length(o + d * t - a - v * s));
}
// one blade (or reed) rooted in cell c: tests the ray against it as two bent segments
// local values shared by neighbouring blades (ground height, grass height scale, wind, reed margin)
vec4 BL_LOCAL; float BL_REED;
void bladeLocal(vec2 xz, float reed) {
  BL_LOCAL = vec4(terrainH(xz, 4), reed > 0.5 ? (0.6 + 0.6 * vnoise(xz * 0.4)) : (0.55 + 0.75 * vnoise(xz * 0.13 + 2.0)), windAt(xz));
  BL_REED = reedMask(xz);
}
float bladeHit(vec3 ro, vec3 rd, vec2 c, float S, float reed, inout float best) {
  vec2 h = hash22(c * 1.0 + reed * 17.0);
  vec2 root = (c + 0.1 + 0.8 * h) * S;
  if (reed > 0.5 && (h.y < 0.25 || BL_REED < 0.5)) return 0.0;
  float g = BL_LOCAL.x;
  float H = reed > 0.5 ? 1.8 * (0.35 + 0.65 * h.y) * BL_LOCAL.y : uGrassH * BL_LOCAL.y * (0.45 + 0.75 * hash12(c * 1.3 + 0.7));
  if (H < 0.04) return 0.0;
  if (reed < 0.5 && (g < 0.15 || BL_REED > 0.6)) return 0.0;
  vec2 lean = (hash22(c + 7.0) - 0.5) * (reed > 0.5 ? 0.25 : 0.5) * H;
  vec2 bend = lean + BL_LOCAL.zw * (reed > 0.5 ? 0.3 : 0.45) * H;
  vec3 A = vec3(root.x, g - 0.02, root.y);
  vec3 M = A + vec3(bend.x * 0.25, H * 0.52, bend.y * 0.25);
  vec3 B = A + vec3(bend.x, H * (1.0 - 0.25 * dot(bend, bend) / (H * H)), bend.y);
  float w0 = reed > 0.5 ? 0.012 : 0.0045 + 0.004 * h.x;
  vec3 r1 = raySeg(ro, rd, A, M - A), r2 = raySeg(ro, rd, M, B - M);
  float u1 = r1.y * 0.5, u2 = 0.5 + r2.y * 0.5;
  float hit = 0.0;
  if (r1.z < w0 * (1.0 - 0.6 * u1) && r1.x > 0.0 && r1.x < best) { best = r1.x; GR_INFO = vec3(u1, h.x, reed > 0.5 ? 2.0 : 0.0); hit = 1.0; }
  if (r2.z < w0 * (1.0 - 0.9 * u2) + 0.0006 && r2.x > 0.0 && r2.x < best) { best = r2.x; GR_INFO = vec3(u2, h.x, reed > 0.5 ? 2.0 : 0.0); hit = 1.0; }
  // a flower (grass) or a seed head (reed) on some stems
  float hf = hash12(c + 3.3 + reed);
  float fm = reed > 0.5 ? 1.0 : smoothstep(0.55, 0.8, vnoise(root * 0.35 + 9.0));
  if (hf > (reed > 0.5 ? 0.9 : 1.0 - 0.05 * fm)) {
    vec3 hp = B + vec3(0.0, reed > 0.5 ? 0.05 : 0.012, 0.0);
    float r = reed > 0.5 ? 0.022 : 0.011 + 0.008 * hash11(hf * 7.0);
    vec3 oc = ro - hp; float bq = dot(oc, rd); float cq = dot(oc, oc) - r * r * (reed > 0.5 ? 6.0 : 1.0);
    float disc = bq * bq - cq;
    if (disc > 0.0) { float tt = -bq - sqrt(disc); if (tt > 0.0 && tt < best) { best = tt; GR_INFO = vec3(1.0, hf, reed > 0.5 ? 3.0 : 1.0); hit = 1.0; } }
  }
  return hit;
}
// walk the cells the ray crosses near the ground and test the blades rooted in and beside them
float massH(vec2 xz) { return uGrassH * (0.55 + 0.75 * vnoise(xz * 0.13 + 2.0)) * 0.62; }
float grassDDA(vec3 ro, vec3 rd, float t0, float t1, float S, float reed, float tFar) {
  float best = t1;
  vec2 d = rd.xz;
  if (dot(d, d) < 1e-6) d = vec2(1e-3);
  vec2 p = ro.xz + rd.xz * t0;
  vec2 cell = floor(p / S);
  vec2 st = sign(d);
  vec2 tD = abs(S / d);
  vec2 tM = ((cell + max(st, 0.0)) * S - p) / d + t0;
  vec2 side = abs(d.x) > abs(d.y) ? vec2(0.0, 1.0) : vec2(1.0, 0.0);
  float t = t0;
  for (int i = 0; i < 64; i++) {
    if (i % 4 == 0) bladeLocal((cell + 0.5) * S, reed);
    bladeHit(ro, rd, cell, S, reed, best);
    // the neighbour on the side the ray passes nearer to
    vec2 pc = ro.xz + rd.xz * t - (cell + 0.5) * S;
    bladeHit(ro, rd, cell + side * sign(dot(pc, side) + 1e-5), S, reed, best);
    if (best < t) break;
    if (tM.x < tM.y) { t = tM.x; tM.x += tD.x; cell.x += st.x; }
    else { t = tM.y; tM.y += tD.y; cell.y += st.y; }
    if (t > t1 || t > best) break;
  }
  if (best < t1) return best;
  // beyond the blades: the grass as a mass whose top is at the grass's height
  if (reed < 0.5) {
    float tt = max(t, t0);
    for (int j = 0; j < 64; j++) {
      vec3 p = ro + rd * tt;
      float g = terrainH(p.xz, 3);
      float y = p.y - g - massH(p.xz);
      if (y < 0.0 && g > 0.1) { GR_INFO = vec3(0.75, hash12(floor(p.xz * 9.0)), 4.0); return tt; }
      tt += max(y * 0.7, 0.03 + tt * 0.015);
      if (tt > tFar) break;
    }
  }
  return -1.0;
}
// the grass and reeds near the camera: find where the ray is low over the land (or over the reed
// margin of the water), then walk the blades there
float grassMarch(vec3 ro, vec3 rd, float tmax, float jit, float range) {
  float tEnd = min(tmax, range);
  float best = tmax;
  if (uGrassH > 0.0) {
    float Hm = uGrassH * 1.4;
    float t = 0.02, tin = -1.0;
    for (int i = 0; i < 48; i++) {
      vec3 p = ro + rd * t;
      float g = terrainH(p.xz, 3);
      float y = p.y - max(g, 0.0);
      if (y < Hm && g > 0.05) { tin = max(t - 0.25, 0.0); break; }
      t += clamp(y - Hm, 0.08, 0.4 + t * 0.08);
      if (t > tEnd) break;
    }
    if (tin >= 0.0) { float tg = grassDDA(ro, rd, tin, tEnd, 0.055, 0.0, tmax); if (tg > 0.0) best = tg; }
  }
  if (uReeds > 0.0) {
    float t = 0.1 + jit * 0.2, tin = -1.0;
    for (int i = 0; i < 40; i++) {
      vec3 p = ro + rd * t;
      if (p.y < 2.0 && reedMask(p.xz) > 0.05) { tin = max(t - 0.4, 0.0); break; }
      t += 0.5 + t * 0.03;
      if (t > best) break;
    }
    if (tin >= 0.0) { float tr = grassDDA(ro, rd, tin, best, 0.17, 1.0, best); if (tr > 0.0) best = tr; }
  }
  return best < tmax ? best : -1.0;
}
vec3 shadeGrass(vec3 ro, vec3 rd, float t) {
  vec3 p = ro + rd * t;
  float u = GR_INFO.x, id = GR_INFO.y, kind = GR_INFO.z;
  float pch = vnoise(p.xz * 0.21 + 5.0);
  vec3 alb = mix(vec3(0.035, 0.065, 0.014), vec3(0.11, 0.12, 0.03), id * 0.7 + pch * 0.3);
  alb = mix(alb, vec3(0.2, 0.14, 0.05), smoothstep(0.7, 1.0, id) * 0.7 * u);    // dry seed-gold tips
  if (kind > 1.5 && kind < 2.5) alb = mix(vec3(0.05, 0.07, 0.022), vec3(0.12, 0.11, 0.045), id);
  if (kind > 2.5 && kind < 3.5) alb = vec3(0.09, 0.055, 0.03);
  if (kind > 0.5 && kind < 1.5) alb = id > 0.985 ? vec3(0.6, 0.58, 0.5) : id > 0.965 ? vec3(0.62, 0.42, 0.05) : vec3(0.3, 0.2, 0.42);
  vec3 n = normalize(vec3(-rd.x, 0.4 + 0.3 * id, -rd.z) + (hash33(vec3(id * 91.0)) - 0.5) * 0.9);
  float ao = mix(0.2, 1.0, smoothstep(0.0, 0.9, u));
  if (kind > 3.5) {
    // the grass as a mass: blades too fine to resolve; light catches the tops in streaks
    // (matched to the open ground's shading further off, so there is no seam where they meet)
    float st = vnoise(vec2(p.x * 40.0, p.z * 40.0)) * 0.5 + vnoise(p.xz * 9.0) * 0.5;
    alb = grassAlb(p, 100.0) * (0.7 + 0.5 * st);
    n = normalize(vec3((st - 0.5) * 0.5, 1.0, (vnoise(p.xz * 31.0) - 0.5) * 0.5) - rd * 0.25);
    ao = 0.7 + 0.25 * st;
  }
  float sh = treeShadow(p);
  vec3 c = lightW(p, n, rd, alb, sh * mix(0.35, 1.0, u), ao, kind < 0.5 || kind > 1.5 ? 1.0 : 0.4, 0.12);
  c *= 1.0 + (0.3 + 0.6 * uSurge) * gust(p.xz) * (1.0 - uCold * 0.5);
  // the blades a gust front lays over show their pale sides
  c += vec3(0.5, 0.55, 0.62) * skyAmb() * 0.07 * uWaveAmt * exp(-pow((p.z - uWaveZ) / 6.0, 2.0)) * u;
  return c;
}
`;

// ---------------------------------------------------------------- creatures
// A flock along a curve B0 -> B1 -> B2 (progress uFlockT 0..1); near the end they drop into the
// grass and are gone. Drawn as small silhouettes facing the camera, sized and antialiased by distance.
export const CREATURES_GLSL = /* glsl */ `
uniform vec3 uB0, uB1, uB2;
uniform float uFlockT, uFlockN;
vec3 bez(vec3 a, vec3 b, vec3 c, float u) { return mix(mix(a, b, u), mix(b, c, u), u); }
float segD(vec2 p, vec2 a, vec2 b) { vec2 pa = p - a, ba = b - a; float h = sat(dot(pa, ba) / dot(ba, ba)); return length(pa - ba * h); }
float segT(vec2 p, vec2 a, vec2 b, float r0, float r1) { vec2 pa = p - a, ba = b - a; float h = sat(dot(pa, ba) / dot(ba, ba)); return length(pa - ba * h) - mix(r0, r1, h); }
vec3 birdsOver(vec3 c, vec3 ro, vec3 rd, inout float depth) {
  float pix = 2.0 * tan(radians(uFov) * 0.5) / uRes.y;
  vec3 sunC = sunLight();
  for (int i = 0; i < 28; i++) {
    float fi = float(i);
    if (fi >= uFlockN) break;
    vec3 h = hash33(vec3(fi * 1.7, 3.1, 7.7));
    float u = clamp(uFlockT * (1.0 + 0.25 * h.x) - 0.12 * h.y, 0.0, 1.0);
    vec3 P = bez(uB0, uB1, uB2, u);
    vec3 V = normalize(bez(uB0, uB1, uB2, min(u + 0.01, 1.0)) - bez(uB0, uB1, uB2, max(u - 0.01, 0.0)) + vec3(1e-4));
    // each bird weaves around the flock's line
    float sw = uTime * (1.3 + h.z) + fi;
    vec3 off = (h - 0.5) * vec3(7.0, 2.5, 7.0) * (1.0 - 0.75 * smoothstep(0.75, 1.0, u)) + vec3(sin(sw), 0.4 * sin(sw * 1.7), cos(sw * 0.8)) * 0.9;
    P += off;
    float land = smoothstep(0.86, 1.0, u);
    P.y = mix(P.y, terrainH(P.xz, 3) + 0.15, land);
    float tc = dot(P - ro, rd);
    if (tc < 0.3 || tc > depth) continue;
    vec3 q = ro + rd * tc - P;
    vec3 xa = V - rd * dot(V, rd); float xl = length(xa);
    xa = xl > 1e-3 ? xa / xl : normalize(cross(rd, vec3(0, 1, 0)));
    vec3 ya = cross(rd, xa); if (ya.y < 0.0) ya = -ya;
    float span = 0.5 + 0.14 * h.y;
    vec2 l = vec2(dot(q, xa), dot(q, ya)) / span;
    if (dot(l, l) > 4.0) continue;
    float ph = uTime * (13.0 + 4.0 * h.x) + fi * 2.1;
    float flap = sin(ph) * (1.0 - land);
    float d = length(l * vec2(1.0, 3.2)) - 0.25;                      // body
    d = min(d, length(l - vec2(0.25, 0.025)) - 0.06);                  // head
    d = min(d, segT(l, vec2(-0.15, 0.0), vec2(-0.4, 0.0), 0.05, 0.035)); // tail
    vec2 tip = vec2(-0.1, 0.62 * flap + 0.08);
    float wl = 1.0 - 0.6 * land;
    d = min(d, segT(l, vec2(0.02, 0.02), mix(vec2(0.02, 0.02), tip, wl), 0.11, 0.025));
    d = min(d, segT(l, vec2(-0.02, 0.02), mix(vec2(-0.02, 0.02), tip * vec2(1.4, 0.7), wl), 0.08, 0.02));
    float pw = pix * tc / span;
    float a = smoothstep(pw, -pw, d) * (1.0 - smoothstep(0.96, 1.0, u));
    if (a <= 0.0) continue;
    vec3 bc = vec3(0.035, 0.028, 0.022) * (skyAmb() * 0.8 + sunC * 0.05);
    bc += sunC * vec3(1.0, 0.7, 0.4) * 0.02 * pow(sat(dot(rd, SUN)), 3.0);      // light through the wing edges
    bc = mix(bc, fogW(bc, ro, rd, tc), 0.5);
    c = mix(c, bc, a);
    if (a > 0.5) depth = tc;
  }
  return c;
}
// deer far off in the haze: side-on silhouettes, grazing; pos.xz in the world, w = facing (+1/-1)
float deerShape(vec2 l, float face, float graze, float ph) {
  l.x *= face;
  float d = length((l - vec2(0.0, 1.0)) * vec2(1.0, 2.6)) - 0.72;
  vec2 nb = vec2(0.6, 1.15), nt = mix(vec2(0.85, 1.65), vec2(1.0, 0.55), graze);
  d = min(d, segD(l, nb, nt) - 0.11);
  d = min(d, length((l - nt - vec2(0.12, 0.0)) * vec2(1.0, 1.6)) - 0.15);
  d = min(d, segD(l, nt, nt + vec2(-0.05, 0.25)) - 0.025);
  for (int k = 0; k < 4; k++) {
    float fx = k < 2 ? 0.45 : -0.5;
    float sw = (k == 0 || k == 3 ? 1.0 : -1.0) * 0.05 * sin(ph);
    d = min(d, segD(l, vec2(fx + float(k % 2) * 0.08, 0.9), vec2(fx + sw + float(k % 2) * 0.08, 0.0)) - 0.045);
  }
  d = min(d, segD(l, vec2(-0.7, 1.15), vec2(-0.82, 1.0)) - 0.05);
  return d;
}
vec3 deerOver(vec3 c, vec3 ro, vec3 rd, inout float depth, vec4 D, float seed) {
  vec3 P = vec3(D.x, terrainH(D.xz, 4) - 0.05, D.z);
  P.x += sin(uTime * 0.07 + seed) * 0.6;
  float tc = dot(P + vec3(0.0, 1.0, 0.0) - ro, rd);
  if (tc < 1.0 || tc > depth) return c;
  vec3 xa = normalize(cross(vec3(0.0, 1.0, 0.0), rd));
  vec3 q = ro + rd * tc - P;
  vec2 l = vec2(dot(q, xa), dot(q, vec3(0.0, 1.0, 0.0)) / max(length(cross(rd, xa)), 0.2));
  if (abs(l.x) > 2.2 || l.y > 2.4 || l.y < -0.3) return c;
  float graze = smoothstep(-0.3, 0.3, sin(uTime * 0.35 + seed * 3.0));
  float d = deerShape(l, D.w, graze, uTime * 0.5 + seed);
  float pix = 2.0 * tan(radians(uFov) * 0.5) / uRes.y * tc;
  float a = smoothstep(pix, -pix, d);
  if (a <= 0.0) return c;
  vec3 dc = vec3(0.05, 0.035, 0.025) * (skyAmb() * 0.6 + sunLight() * 0.04) + sunLight() * vec3(0.05, 0.03, 0.012) * 0.08 * pow(sat(dot(rd, SUN)), 2.0);
  dc = fogW(dc, ro, rd, tc);
  if (a > 0.5) depth = tc;
  return mix(c, dc, a);
}
`;

// ---------------------------------------------------------------- petals and leaves on the wind
// Small tumbling flakes (petals pale, leaves green-gold) carried past the lens in a box that travels
// with the camera; each fades at the box's ends so none pops. uFlakes = count (0 = none), uFlakeV =
// their velocity (m/s, world).
export const FLAKES_GLSL = /* glsl */ `
uniform float uFlakes;
uniform vec3 uFlakeV;
vec3 flakesOver(vec3 c, vec3 ro, vec3 rd, inout float depth) {
  if (uFlakes <= 0.0) return c;
  vec3 box = vec3(7.0, 4.0, 7.0);
  for (int i = 0; i < 60; i++) {
    float fi = float(i);
    if (fi >= uFlakes) break;
    vec3 h = hash33(vec3(fi, 4.7, 1.3));
    vec3 base = (h - 0.5) * box * 2.0;
    vec3 v = uFlakeV * (0.7 + 0.6 * h.y) + vec3(0.0, -0.3 + 0.6 * sin(uTime * 2.0 + fi), 0.0);
    vec3 off = base + v * uTime;
    vec3 wr = mod(off + box, box * 2.0) - box;          // wrapped about the camera
    vec3 P = uCamPos + wr + vec3(0.0, 0.0, 0.0);
    float edge = smoothstep(1.0, 0.75, max(abs(wr.x) / box.x, max(abs(wr.y) / box.y, abs(wr.z) / box.z)));
    float tc = dot(P - ro, rd);
    if (tc < 0.15 || tc > depth) continue;
    vec3 q = ro + rd * tc - P;
    float sz = 0.02 + 0.02 * h.z;
    if (dot(q, q) > sz * sz * 4.0) continue;
    // tumbling: the flake's apparent shape narrows as it turns edge-on
    float ang = uTime * (6.0 + 8.0 * h.x) + fi;
    vec3 xa = normalize(cross(rd, vec3(0.0, 1.0, 0.0)) + 1e-4), ya = cross(xa, rd);
    vec2 l = vec2(dot(q, xa), dot(q, ya)) / sz;
    l = rot(ang * 0.7) * l;
    float thin = 0.25 + 0.75 * abs(cos(ang));
    float d = length(l * vec2(1.0, 1.0 / thin)) - 1.0;
    float pix = 2.0 * tan(radians(uFov) * 0.5) / uRes.y * tc / sz;
    float a = smoothstep(pix, -pix, d) * edge;
    if (a <= 0.0) continue;
    bool petal = h.x > 0.55;
    vec3 alb = petal ? mix(vec3(0.75, 0.66, 0.62), vec3(0.8, 0.55, 0.6), h.z) : mix(vec3(0.12, 0.16, 0.03), vec3(0.3, 0.24, 0.05), h.z);
    vec3 n = normalize(-rd + vec3(0.0, 0.3, 0.0) * cos(ang));
    vec3 fc = lightW(P, n, rd, alb, 1.0, 0.8, petal ? 0.6 : 1.0, 0.1);
    c = mix(c, fc, a);
    if (a > 0.5) depth = tc;
  }
  return c;
}
`;
