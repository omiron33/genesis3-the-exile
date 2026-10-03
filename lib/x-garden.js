// The garden of Delight (units: metres, y up). Golden afternoon: rolling meadows, orchards in rows
// over the hills, four rivers flowing out from the rise where the barred tree stands, the tree of life
// pale and white-gold far beyond a river, distant blue ranges, a warm sky. One sun, soft shadows
// (long tree shadows across the grass), sky and bounce light, height haze with a sun-facing glow.
// The same world turns cold (uCold) after the eating, with only God's presence (a walking warm light,
// uPres) carrying warmth. Scenes include GARDEN_GLSL and compose a shade() from its pieces; the
// orchard trees seen close (leaf by leaf) and grass are in x-garden-near.js.
//
// Lens: lensRay() is a real thin lens. The engine's sub-frame jitter (a low-discrepancy sequence)
// doubles as the aperture sample, rotated per pixel, so depth of field averages out with the
// motion blur. Set uFocus (metres) and uAperture (lens radius, metres) from the camera.

export const GARDEN_GLSL = /* glsl */ `
uniform vec3 uSunDir;
uniform vec3 uSunCol;
uniform float uCold;      // 0 golden afternoon .. 1 cold exposed blue-grey
uniform float uWind;      // breeze strength
uniform float uSurge;     // 0..1 the gale (s14)
uniform float uFocus, uAperture;
uniform vec3 uPres;       // God's presence: the walking light (ground position)
uniform float uPresAmt;
uniform float uPresR;      // size of the presence's light (1 = a column a little taller than a man)
uniform float uPresTall;   // its height relative to its width (1 = a column)
uniform float uWaveZ, uWaveAmt;   // a gust front travelling along -z (s21)
uniform float uMist;      // mist lying on the water
uniform float uHaze;      // overall aerial haze multiplier
#define SUN normalize(uSunDir)
const vec3 TREEP = vec3(0.0, 0.0, 1500.0);     // the barred tree on its rise (y from the terrain)
const vec3 LIFEP = vec3(-620.0, 0.0, 2750.0);  // the tree of life, beyond the far river
const float CELL = 12.0;
const vec2 PADM = vec2(-190.0, -150.0);        // the meadow by the river (s01, s14, s21)
const vec2 HEROM = vec2(-210.0, -102.0);       // the big tree at the meadow's edge (a cell centre)
const vec2 PADO = vec2(150.0, 250.0);          // the orchard (s04, s05, s06, s22)
const vec2 WDIR = vec2(0.24253, -0.97014);     // the breeze blows toward -z (toward our cameras)

// ---------------------------------------------------------------- lens
vec3 lensRay(vec2 fc, out vec3 ro) {
  vec2 p = (2.0 * (fc + uJitter) - uRes) / uRes.y;
  ro = uCamPos;
  vec3 ww = normalize(uCamTarget - uCamPos);
  vec3 up = vec3(sin(uCamRoll), cos(uCamRoll), 0.0);
  vec3 uu = normalize(cross(ww, up)), vv = cross(uu, ww);
  float f = 1.0 / tan(radians(uFov) * 0.5);
  vec3 rd = normalize(p.x * uu + p.y * vv + f * ww);
  if (uAperture > 0.0) {
    vec3 fp = ro + rd * (uFocus / dot(rd, ww));
    vec2 j = uJitter + 0.5;
    float r = sqrt(fract(j.x + 0.37 * hash12(fc * 0.71)));
    float a = 6.2831853 * fract(j.y + hash12(fc + 13.1));
    vec2 d = r * vec2(cos(a), sin(a)) * uAperture;
    ro += uu * d.x + vv * d.y;
    rd = normalize(fp - ro);
  }
  return rd;
}

// ---------------------------------------------------------------- wind
float gust(vec2 xz) {
  vec2 q = xz - WDIR * uTime * (5.0 + 14.0 * uSurge);
  float g = vnoise(q * 0.03) * 0.6 + vnoise(q * 0.09 + 3.0) * 0.4;
  g = smoothstep(0.32, 0.86, g);
  float wave = uWaveAmt * exp(-pow((xz.y - uWaveZ) / 7.0, 2.0)) * (0.7 + 0.3 * vnoise(xz * 0.05));
  return g * (0.45 + 1.3 * uSurge) + wave;
}
// horizontal push on grass and leaves (metres of bend at the tip, roughly)
vec2 windAt(vec2 xz) {
  vec2 w = WDIR * uWind * (0.2 + gust(xz));
  if (uPresAmt > 0.0) { vec2 d = xz - uPres.xz; float l = length(d) + 0.3; w += d / l * uPresAmt * 0.9 * exp(-l * l / 18.0); }
  return w;
}

// ---------------------------------------------------------------- sky
vec3 sunLight() { return uSunCol * (1.0 - 0.88 * uCold); }
vec3 skyAmb() { return mix(vec3(0.34, 0.42, 0.58), vec3(0.36, 0.42, 0.52), uCold); }
vec3 skyCol(vec3 rd) {
  float y = max(rd.y, 0.0);
  float mu = dot(rd, SUN);
  float m = max(mu, 0.0);
  vec3 zen = mix(vec3(0.10, 0.24, 0.62), vec3(0.20, 0.25, 0.33), uCold);
  vec3 mid = mix(vec3(0.42, 0.52, 0.72), vec3(0.42, 0.46, 0.53), uCold);
  vec3 hor = mix(vec3(1.15, 0.78, 0.48), vec3(0.62, 0.66, 0.72), uCold);
  vec3 c = mix(hor, mid, smoothstep(0.0, 0.18, y));
  c = mix(c, zen, smoothstep(0.12, 0.7, y));
  // the warm side of the sky: toward the sun the horizon burns gold
  float g = 1.0 - 0.88 * uCold;
  c += vec3(1.0, 0.55, 0.22) * pow(m, 8.0) * 0.45 * g * (1.0 - 0.6 * smoothstep(0.0, 0.5, y));
  c += vec3(1.0, 0.7, 0.4) * pow(m, 90.0) * 0.7 * g;
  c += vec3(1.0, 0.85, 0.6) * pow(m, 400.0) * 4.0 * g;
  c += uSunCol * smoothstep(0.99968, 0.9998, mu) * 30.0 * g * (1.0 - uCold);
  if (rd.y > 0.0) {
    vec2 uv = rd.xz / (rd.y + 0.1) * 0.8 + vec2(uTime * 0.006, uTime * 0.002);
    float n = fbm(uv * 0.6, 5);
    float n2 = fbm(uv * 0.6 + SUN.xz * 0.1, 3);
    float cov = mix(0.66, 0.47, uCold);
    float cl = smoothstep(cov, cov + 0.2, n) * smoothstep(0.0, 0.1, rd.y);
    float lit = sat(0.5 + (n - n2) * 6.0);
    vec3 cw = vec3(1.3, 0.92, 0.66) * (0.35 + 0.75 * lit) + vec3(1.6, 0.9, 0.45) * pow(m, 12.0) * 0.7;
    vec3 cc = mix(cw, vec3(0.5, 0.54, 0.6) * (0.75 + 0.35 * lit), uCold);
    c = mix(c, cc, cl * 0.85);
    // thin high cirrus streaks catching the light
    float ci = smoothstep(0.55, 0.85, fbm(vec2(uv.x * 0.25, uv.y * 1.6) + 9.0, 4)) * smoothstep(0.02, 0.3, rd.y);
    c += vec3(1.0, 0.7, 0.45) * ci * 0.18 * g * (0.4 + pow(m, 3.0));
  }
  return c;
}

// ---------------------------------------------------------------- terrain and rivers
float riverAngle(int i, float r) {
  float fi = float(i);
  float th = i == 0 ? PI : i == 1 ? PI - 1.2 : i == 2 ? PI + 1.25 : 0.25;
  return th + 0.16 * sin(r / 210.0 + fi * 1.7) + 0.05 * sin(r / 61.0 + fi * 3.1);
}
// distance to the nearest river's water edge (negative in the water)
float riverDist(vec2 xz) {
  #ifdef PROF_NORIV
  return 100.0;
  #endif
  vec2 d = xz - TREEP.xz; float r = length(d); float a = atan(d.x, d.y);
  float best = 1e9;
  for (int i = 0; i < 4; i++) {
    float da = mod(a - riverAngle(i, r) + PI, 2.0 * PI) - PI;
    if (abs(da) < 1.4) best = min(best, r * abs(da) * (1.0 - da * da * 0.1667));
  }
  float w = (5.0 + clamp(r * 0.0035, 0.0, 8.0)) * smoothstep(170.0, 320.0, r);
  return best - w + max(0.0, 200.0 - r) * 0.5;
}
float hillsH(vec2 xz, int oct) {
  vec2 q = xz / 420.0 + vec2(3.7, 1.3);
  float h = 0.0, a = 1.0; vec2 ds = vec2(0);
  for (int i = 0; i < 8; i++) {
    if (i >= oct) break;
    vec3 n = vnoised(q);
    ds += n.yz;
    h += a * n.x / (1.0 + dot(ds, ds) * 0.6);
    a *= 0.5; q = M2 * q * 2.0;
  }
  return h;
}
float terrainH(vec2 xz, int oct) {
  #ifdef PROF_OCT
  oct = min(oct, PROF_OCT);
  #endif
  float r = length(xz - TREEP.xz);
  float rc = length((xz - vec2(0.0, -250.0)) * vec2(0.8, 1.0));
  float hills = hillsH(xz, oct) * 46.0 * (0.12 + 0.88 * smoothstep(150.0, 1100.0, rc));
  float far = smoothstep(2500.0, 5200.0, r);
  hills += far * 300.0 * (vnoise(xz / 1400.0 + 7.0) * 0.8 + 0.25);
  hills += 30.0 * exp(-r * r / (2.0 * 150.0 * 150.0));                  // the rise
  float rl = length(xz - LIFEP.xz);
  hills += 38.0 * exp(-rl * rl / (2.0 * 150.0 * 150.0));
  float rd = riverDist(xz);
  float valley = smoothstep(0.0, 190.0, rd);
  float land = 0.75 + hills * mix(0.15, 1.0, valley);
  land = mix(land, 2.0, 1.0 - smoothstep(70.0, 240.0, length(xz - PADM)));
  land = mix(land, 3.0 + 1.5 * sin(xz.x * 0.012) * sin(xz.y * 0.009), 1.0 - smoothstep(110.0, 300.0, length(xz - PADO)));
  if (oct > 5) land += 0.1 * vnoise(xz * 0.3) + 0.025 * vnoise(xz * 2.1);
  return mix(-1.7, land, smoothstep(-3.5, 5.0, rd));
}

// ---------------------------------------------------------------- trees of the wide world
// tree in a cell: xy = centre (xz), z = canopy radius (0 = none), w = kind (0 orchard, 1 bank, 2 meadow, 3 hill wood)
vec4 treeIn(vec2 c) {
  vec2 ctr = (c + 0.5) * CELL;
  float r = length(ctr - TREEP.xz);
  if (r < 230.0) return vec4(0);
  if (length(ctr - LIFEP.xz) < 150.0) return vec4(0);
  float rd = riverDist(ctr);
  if (rd < 7.0) return vec4(0);
  float h = hash12(c);
  vec2 jit = hash22(c + 17.0) - 0.5;
  if (length(ctr - HEROM) < 1.0) return vec4(HEROM, 4.2, 2.0);
  float dm = length(ctr - PADM);
  if (dm < 60.0) return vec4(0);
  float orch = smoothstep(0.6, 0.63, vnoise(ctr / 430.0 + 3.1)) * step(26.0, rd) * step(80.0, length(ctr - vec2(0.0, -200.0)) - 0.0);
  if (dm < 120.0) orch = 0.0;
  if (length(ctr - PADO) < 360.0) { orch = 1.0; h *= 0.9; }
  if (orch > 0.5 && h < 0.94) return vec4(ctr + jit * 0.6, 3.0 + 0.5 * hash11(h * 31.0), 0.0);
  float bank = smoothstep(50.0, 14.0, rd);
  float wood = smoothstep(2300.0, 3300.0, r);
  float p = bank * 0.7 + wood * 0.75 + 0.03;
  if (dm < 120.0) p *= 0.3;
  if (h < p) return vec4(ctr + jit * 1.2, 3.2 + 0.8 * hash11(h * 91.0), bank > 0.3 || wood > 0.5 ? 1.0 : 2.0);
  return vec4(0);
}
// canopy centre height above ground and radii for a tree
void treeShape(vec4 tr, out float trunkH, out vec3 rad) {
  float R = tr.z;
  if (tr.w < 0.5) { trunkH = 1.4; rad = vec3(R, R * 0.78, R); }
  else if (tr.w < 1.5) { trunkH = 2.6; rad = vec3(R * 0.85, R * 1.35, R * 0.85); }
  else { trunkH = 1.9; rad = vec3(R * 1.25, R * 0.72, R * 1.25); }
}
// lobes: a core and five clumps, so the crown has hollows and sky between its masses
float crownLobes(vec3 q, vec4 tr, vec3 rad) {
  float dl = sdEllipsoid(q + vec3(0.0, rad.y * 0.25, 0.0), rad * 0.48);
  for (int k = 0; k < 7; k++) {
    vec3 h3 = hash33(vec3(tr.xy, float(k)) * 0.37);
    vec3 cpos = (h3 - 0.5) * vec3(1.45, 0.95, 1.45) * rad;
    cpos.y += rad.y * 0.15;
    float rr = tr.z * (0.26 + 0.26 * h3.y);
    dl = smin(dl, sdEllipsoid(q - cpos, vec3(rr, rr * (0.75 + 0.3 * h3.z), rr)), tr.z * 0.26);
  }
  return dl;
}
float TREE_BASE, STEPCAP, CANOPY_OCC;
vec2 CCELL = vec2(1e9); vec4 CTREE; float CBASE;
float treeSDF(vec3 p, float t, out float part, out vec4 tree) {
  vec2 c = floor(p.xz / CELL);
  vec2 f = p.xz - (c + 0.5) * CELL;
  STEPCAP = CELL * 0.5 - max(abs(f.x), abs(f.y)) + 0.6;
  if (c != CCELL) { CCELL = c; CTREE = treeIn(c); CBASE = CTREE.z > 0.0 ? terrainH(CTREE.xy, 4) : 0.0; }
  vec4 tr = CTREE;
  tree = tr; part = 0.0;
  if (tr.z <= 0.0) return 1e9;
  float trunkH; vec3 rad; treeShape(tr, trunkH, rad);
  float g = CBASE;
  TREE_BASE = g;
  vec3 ctr = vec3(tr.x, g + trunkH + rad.y, tr.y);
  vec3 q = p - ctr;
  // sway
  vec2 w = (t < 90.0 ? windAt(tr.xy) : WDIR * uWind * 0.5) * 0.08 * (q.y + rad.y) / rad.y;
  q.xz -= w;
  float d = sdEllipsoid(q, rad);
  CANOPY_OCC = 1.0;
  if (d < 1.5 && t < 700.0) {
    if (t < 160.0) d = max(crownLobes(q, tr, rad), d - 0.2);
    float k = tr.z / 3.5;
    vec3 qq = q / k;
    // clumps of leaves: big lobes, then smaller clusters, then the ragged leafy edge when close
    float n = fbm(qq * 0.5 + tr.x * 0.13, t < 200.0 ? 3 : 2);
    float dd = (n - 0.5) * 2.6 * k + 0.3 * k;
    if (t < 90.0) { float m = vnoise(qq * 2.6 + 5.0); dd += (m - 0.5) * 0.9 * k; n = n * 0.7 + m * 0.3; }
    if (t < 30.0) dd += (vnoise(qq * 9.0) - 0.5) * 0.3 * k;
    d = (d + dd) * 0.6;
    CANOPY_OCC = sat(n * 1.5 - 0.1);
  }
  vec3 tb = vec3(tr.x, g - 1.0, tr.y), tt = vec3(tr.x + w.x * 0.2, g + trunkH + rad.y * 0.9, tr.y + w.y * 0.2);
  float trunk = sdRoundCone(p, tb, tt, 0.075 * tr.z, 0.05 * tr.z);
  if (t < 160.0) {
    // the trunk forks into limbs that run up into the crown's masses
    for (int k = 0; k < 3; k++) {
      vec3 h3 = hash33(vec3(tr.xy, float(k)) * 0.37);
      vec3 cpos = (h3 - 0.5) * vec3(1.25, 0.85, 1.25) * rad; cpos.y += rad.y * 0.12;
      vec3 lt = ctr + cpos * 0.8; lt.xz += w;
      trunk = min(trunk, sdRoundCone(p, tt, lt, 0.042 * tr.z, 0.018 * tr.z));
    }
  }
  if (trunk < d) { d = trunk; part = 1.0; }
  return d;
}

// the barred tree, seen far off on its rise: immense, dark, a few red fruit catching the sun
float bigTree(vec3 p, out float part) {
  float g = terrainH(TREEP.xz, 4);
  vec3 b = vec3(TREEP.x, g, TREEP.z);
  vec3 q = p - b;
  part = 1.0;
  float d = sdCapsule(q, vec3(0, -3, 0), vec3(0, 16, 0), 2.6);
  d = smin(d, sdCapsule(q, vec3(0, 12, 0), vec3(-14, 26, 4), 1.4), 2.0);
  d = smin(d, sdCapsule(q, vec3(0, 12, 0), vec3(15, 27, -3), 1.4), 2.0);
  d = smin(d, sdCapsule(q, vec3(0, 14, 0), vec3(2, 33, 8), 1.4), 2.0);
  vec3 cq = q - vec3(0, 33, 0);
  float can = sdEllipsoid(cq, vec3(36, 17, 32));
  can = smin(can, sdEllipsoid(cq - vec3(-16, -4, 6), vec3(20, 13, 18)), 6.0);
  can = smin(can, sdEllipsoid(cq - vec3(17, -3, -6), vec3(20, 12, 18)), 6.0);
  if (can < 6.0) can += (fbm(cq * 0.09, 4) - 0.5) * 9.0;
  can *= 0.7;
  if (can < d) { d = can; part = 0.0; }
  return d;
}
// the tree of life far off: pale trunk and a crown of white-gold light
float lifeTree(vec3 p, out float part) {
  vec3 b = vec3(LIFEP.x, terrainH(LIFEP.xz, 4), LIFEP.z);
  vec3 q = (p - b) / 1.6;
  part = 1.0;
  float d = sdCapsule(q, vec3(0, -3, 0), vec3(0, 20, 0), 1.8);
  d = smin(d, sdCapsule(q, vec3(0, 14, 0), vec3(-10, 26, 2), 1.0), 1.5);
  d = smin(d, sdCapsule(q, vec3(0, 14, 0), vec3(11, 27, -2), 1.0), 1.5);
  vec3 cq = q - vec3(0, 30, 0);
  float can = sdEllipsoid(cq, vec3(14, 9, 13));
  can = smin(can, sdEllipsoid(cq - vec3(-12, -3, 2), vec3(10, 7, 9)), 4.0);
  can = smin(can, sdEllipsoid(cq - vec3(12, -2, -2), vec3(10, 7, 9)), 4.0);
  if (can < 5.0) can += (fbm(cq * 0.14 + 4.0, 3) - 0.5) * 6.0;
  can *= 0.7;
  if (can < d) { d = can; part = 2.0; }
  return d * 1.6;
}

// ---------------------------------------------------------------- leaves (trees seen close)
// Inside the crown's lobes the space is cut into small cells; most cells hold one leaf (a thin disc,
// tilted toward the light, fluttering), some a fruit, and deep inside is the dark mass of the crown.
uniform float uLeafT;     // trees nearer than this are drawn leaf by leaf
vec4 LEAF;                // xyz normal, w kind (0 leaf, 1 inner mass, 2 fruit)
float LEAF_DEPTH; vec3 LEAF_ID;
vec3 LCELL = vec3(1e9); bool LOCC;
// one leaf: a thin elongated blade centred at c (relative to the query point's frame), seeded by h
float leafDisc(vec3 f, vec3 h, float flt, float cs) {
  float fl = sin(uTime * (5.0 + 4.0 * h.y + 6.0 * uSurge) + h.z * 40.0) * flt;
  vec3 n0 = normalize(h * 2.0 - 1.0 + vec3(0.0, 0.45, 0.0) + vec3(fl * (h.z - 0.5), 0.0, fl * (h.x - 0.5)));
  float dn = dot(f, n0);
  vec3 pr = f - n0 * dn;
  vec3 ax = normalize(cross(n0, vec3(h.z, 0.3, h.y) - 0.5));
  float along = dot(pr, ax);
  float r = 0.45 * cs * (0.8 + 0.25 * h.y);
  float e = length(vec2(along * 0.7, length(pr - ax * along) * 1.35));
  float d = max(abs(dn) - 0.002, e - r);
  if (d < 0.002) { LEAF = vec4(n0, 0.0); LEAF_ID = h; }
  return d;
}
// limbs inside a crown (crown-centred coordinates): the trunk rising into it and four boughs
float woodSDF(vec3 q, vec4 tr, vec3 rad) {
  float R = tr.z;
  vec3 a = vec3(0.0, -rad.y * 0.12, 0.0);
  float d = sdRoundCone(q, vec3(0.0, -rad.y * 2.2, 0.0), a, 0.06 * R, 0.042 * R);
  for (int k = 0; k < 4; k++) {
    vec3 h = hash33(vec3(tr.xy * 0.71, float(k) + 3.0));
    float ang = float(k) * 1.5708 + h.x * 1.2;
    vec3 b = vec3(cos(ang) * rad.x * (0.3 + 0.2 * h.y), rad.y * (0.0 + 0.25 * h.z), sin(ang) * rad.z * (0.3 + 0.2 * h.y));
    vec3 m = mix(a, b, 0.5) + vec3(0.0, 0.18 * R, 0.0) * (h.y - 0.3);
    d = min(d, sdCapsule(q, a, m, 0.026 * R));
    d = min(d, sdCapsule(q, m, b, 0.013 * R));
  }
  return d;
}
float leafSDF(vec3 q, vec4 tr, vec3 rad, float cs, out float cap) {
  float cd = crownLobes(q, tr, rad);
  cap = 1e9;
  if (cd > -0.75) {
    float wd = woodSDF(q, tr, rad);
    if (wd < 0.002) { LEAF = vec4(0.0, 0.0, 0.0, 3.0); LEAF_DEPTH = -cd; return 0.0; }
    cap = wd;
  }
  if (cd > 0.25) return min(cd * 0.8 + 0.02, cap);
  if (cd < -1.1) { LEAF = vec4(normalize(q / rad), 1.0); LEAF_DEPTH = -cd; LEAF_ID = hash33(floor(q / cs)); return 0.0; }
  // leaves scattered at random: one per cell of a turned, warped lattice, each anywhere in its cell;
  // the eight cells nearest the point are tested so leaves overlap freely across cell walls
  float ra = fract(tr.x * 0.137 + tr.y * 0.071) * 6.283;
  vec3 ql = q; ql.xz = rot(ra) * ql.xz; ql.yz = rot(0.62) * ql.yz; ql.xy = rot(0.41) * ql.xy;
  ql += (vec3(vnoise(q * 1.3), vnoise(q * 1.3 + 11.0), vnoise(q * 1.3 + 23.0)) - 0.5) * cs * 1.2;
  vec3 g = ql / cs - 0.5;
  vec3 c0 = floor(g), fg = g - c0;
  vec3 fr = fract(ql / cs);
  cap = min(cap, max((min(min(max(fr.x, 1.0 - fr.x), max(fr.y, 1.0 - fr.y)), max(fr.z, 1.0 - fr.z)) - 0.47) * cs, 0.12 * cs));
  float dens = smoothstep(0.12, -0.25, cd) * (0.55 + 0.45 * smoothstep(0.25, 0.55, vnoise(q * 1.1 + tr.x)));
  float d = 1e9;
  float flt = min(0.25 + 0.6 * length(windAt(tr.xy)), 1.3);
  vec3 seed = vec3(tr.x * 0.173 + tr.y * 0.311);
  for (int k = 0; k < 8; k++) {
    vec3 cid = c0 + vec3(float(k & 1), float((k >> 1) & 1), float(k >> 2));
    vec3 h = hash33(cid + seed);
    if (h.x > dens) continue;
    vec3 lc = (cid + 0.5 + (hash33(cid * 1.31 + seed + 5.0) - 0.5) * 0.9) * cs;
    float dl = leafDisc(ql - lc, h, flt, cs);
    d = min(d, dl);
  }
  if (d < 0.002) LEAF_DEPTH = -cd;
  // fruit in the outer, lower crown of orchard trees
  if (tr.w < 0.5 && cd > -0.5 && q.y < rad.y * 0.3) {
    float fs = cs * 3.0;
    vec3 fid = floor(q / fs);
    vec3 hf = hash33(fid + 4.1 + tr.x);
    vec3 fc = (fid + 0.5) * fs + (hf - 0.5) * fs * 0.4;
    // only where the fruit hangs in among the leaves (never out past the crown's edge), on a short stalk
    if (hf.x > 0.55 && crownLobes(fc, tr, rad) < -0.03) {
      float fd = length(q - fc) - fs * 0.16;
      float sd = sdCapsule(q, fc, fc + vec3(0.02, 0.32, 0.01) * fs, fs * 0.018);
      if (sd < d && sd < fd) { d = sd; if (sd < 0.002) { LEAF = vec4(0.0, 0.0, 0.0, 3.0); LEAF_DEPTH = -cd; } }
      if (fd < d) { d = fd; if (fd < 0.002) { LEAF = vec4(normalize(q - fc), 2.0); LEAF_DEPTH = -cd; LEAF_ID = hf; } }
      cap = min(cap, fs * 0.5 - max(abs(q.x - (fid.x + 0.5) * fs), max(abs(q.y - (fid.y + 0.5) * fs), abs(q.z - (fid.z + 0.5) * fs))) + 0.003);
    }
  }
  return d;
}
// march the leaves of one crown from t0 to t1; -1 when the ray passes through a gap
float leafMarch(vec3 ro, vec3 rd, float t0, float t1, vec3 C, vec4 tr, vec3 rad, float cs) {
  float t = t0;
  for (int i = 0; i < 120; i++) {
    vec3 q = ro + rd * t - C;
    q.xz -= windAt(tr.xy) * 0.08 * (q.y + rad.y) / rad.y;
    float cap;
    float d = leafSDF(q, tr, rad, cs, cap);
    if (d < 0.002) return t;
    t += max(min(d, cap) * 0.8, 0.002);
    if (t > t1) break;
  }
  return -1.0;
}
// light reaching a point inside a crown: how much crown lies toward the sun, broken into dapples
float crownSun(vec3 q, vec4 tr, vec3 rad) {
  float od = 0.0;
  for (int k = 1; k <= 4; k++) {
    float s = float(k * k) * 0.25;
    od += sat(-crownLobes(q + SUN * s, tr, rad) * 2.0 + 0.3) * s;
  }
  float dap = vnoise(q * 3.1 + vec3(uTime * 0.7, 0.0, uTime * 0.4));
  return exp(-od * 0.9) * (0.55 + 0.9 * dap);
}
// ---------------------------------------------------------------- the march
// material: 0 ground, 1 canopy, 2 trunk, 3 big tree canopy, 4 big tree wood, 5 life crown, 6 life wood
float MAT; vec4 MTREE; float MSTEP;
float mapW(vec3 p, float t) {
  float g = terrainH(p.xz, t < 40.0 ? 6 : t < 250.0 ? 5 : t < 1200.0 ? 4 : 3);
  float d = (p.y - g) * 0.55;
  MAT = 0.0; MSTEP = 1e9;
  if (p.y - g < 22.0 && t < 2600.0) {
    float part; vec4 tr;
    float dt = treeSDF(p, t, part, tr);
    MSTEP = STEPCAP;
    if (dt < d) { d = dt; MAT = 1.0 + part; MTREE = tr; }
  }
  if (abs(p.z - TREEP.z) < 80.0 && abs(p.x - TREEP.x) < 80.0) {
    float part; float db = bigTree(p, part);
    if (db < d) { d = db; MAT = 3.0 + part; }
  } else d = min(d, max(length(p.xz - TREEP.xz) - 60.0, 2.0));
  if (abs(p.z - LIFEP.z) < 90.0 && abs(p.x - LIFEP.x) < 90.0) {
    float part; float dl = lifeTree(p, part);
    if (dl < d) { d = dl; MAT = part > 1.5 ? 5.0 : 6.0; }
  } else d = min(d, max(length(p.xz - LIFEP.xz) - 75.0, 2.0));
  return d;
}
// returns t (or -1 for sky); MAT and MTREE hold the hit
#ifdef PROF_MAXI
float LODK = 1.0; int MAXI = PROF_MAXI;
#else
float LODK = 1.0; int MAXI = 240;
#endif
float marchW(vec3 ro, vec3 rd, float tmax, float jit) {
  float t = 0.05 + jit * 0.3;
  CCELL = vec2(1e9);
  for (int i = 0; i < 240; i++) {
    if (i > MAXI) break;
    vec3 p = ro + rd * t;
    float d = mapW(p, t * LODK);
    if (d < 0.0016 * t) return t;
    #ifdef PROF_FAST
    t += max(t > 900.0 ? d : min(d, MSTEP), t < 60.0 ? 0.004 * t : 0.014 * t);
    #else
    t += max(min(d, MSTEP), t < 80.0 ? 0.004 * t : 0.009 * t);
    #endif
    if (t > tmax) break;
    if (p.y > 420.0 && rd.y > 0.0) break;
  }
  return -1.0;
}
vec3 normalW(vec3 p, float t) {
  float e = max(0.004, 0.0012 * t);
  vec2 k = vec2(1, -1);
  CCELL = vec2(1e9);
  float m = MAT; vec4 tr = MTREE;
  vec3 n = normalize(k.xyy * mapW(p + k.xyy * e, t) + k.yyx * mapW(p + k.yyx * e, t) + k.yxy * mapW(p + k.yxy * e, t) + k.xxx * mapW(p + k.xxx * e, t));
  MAT = m; MTREE = tr;
  return n;
}
vec3 terrainNormal(vec2 xz, float t) {
  float e = max(0.02, 0.0015 * t);
  int oct = t < 300.0 ? 6 : 5;
  float h = terrainH(xz, oct);
  return normalize(vec3(h - terrainH(xz + vec2(e, 0), oct), e, h - terrainH(xz + vec2(0, e), oct)));
}

// ---------------------------------------------------------------- shadows
// canopy shadow from the wide world's trees: the long golden-hour shadows across the grass
float treeShadow(vec3 p) {
  float s = 1.0;
  for (int k = 0; k < 3; k++) {
    float hgt = 3.4 + 2.4 * float(k);                   // through the canopy band
    vec3 q = p + SUN * ((hgt - 0.5) / max(SUN.y, 0.05));
    vec2 c = floor(q.xz / CELL);
    vec4 tr = treeIn(c);
    if (tr.z <= 0.0) continue;
    float trunkH; vec3 rad; treeShape(tr, trunkH, rad);
    float g = terrainH(tr.xy, 2);
    vec3 ctr = vec3(tr.x, g + trunkH + rad.y, tr.y);
    vec3 v = ctr - p; float along = dot(v, SUN);
    if (along <= 0.0) continue;
    vec3 cl = v - SUN * along;
    float e = length(cl / rad);
    float dap = vnoise(cl.xz * 1.1 + tr.x) * 0.6 + vnoise(cl.xy * 2.9 + tr.y) * 0.4;
    s = min(s, mix(0.12, 1.0, smoothstep(0.55, 1.0, e + (dap - 0.5) * 0.45)));
  }
  return s;
}
float terrainShadow(vec3 p) {
  float res = 1.0, t = 1.0;
  for (int i = 0; i < 14; i++) {
    vec3 q = p + SUN * t;
    float h = q.y - terrainH(q.xz, 3);
    res = min(res, 5.0 * h / t);
    t += clamp(h * 0.9, 4.0, 160.0);
    if (res < 0.0 || q.y > 340.0) break;
  }
  return 0.25 + 0.75 * smoothstep(0.0, 1.0, res);
}

// ---------------------------------------------------------------- materials
vec3 grassAlb(vec3 p, float t) {
  float n1 = fbm(p.xz * 0.045, 3), n2 = vnoise(p.xz * 0.5);
  vec3 a = mix(vec3(0.075, 0.11, 0.025), vec3(0.16, 0.16, 0.04), n1);
  a = mix(a, vec3(0.2, 0.15, 0.05), smoothstep(0.55, 0.85, n2) * 0.5);   // dry gold patches
  // wildflowers: specks of white, yellow and violet near the camera
  if (t < 80.0) {
    vec2 c = floor(p.xz * 3.0); vec2 f = fract(p.xz * 3.0) - hash22(c);
    float h = hash12(c + 3.0);
    float fl = smoothstep(0.09, 0.05, length(f)) * step(0.83, h) * smoothstep(0.3, 0.6, fbm(p.xz * 0.08, 2));
    vec3 fc = h > 0.95 ? vec3(0.8, 0.78, 0.7) : h > 0.89 ? vec3(0.8, 0.55, 0.08) : vec3(0.35, 0.22, 0.5);
    a = mix(a, fc, fl * smoothstep(80.0, 20.0, t));
  }
  return a;
}
vec3 hillWoodAlb(float r) { return vec3(0.05, 0.07, 0.03); }

// Light a surface. alb linear albedo; sh shadow; ao occlusion; tr translucency (leaves, grass)
vec3 lightW(vec3 p, vec3 n, vec3 rd, vec3 alb, float sh, float ao, float tr, float spec) {
  vec3 sunC = sunLight();
  sh = mix(sh, 0.75, uCold * 0.8);          // under the cold overcast the shadows go soft
  float dif = sat(dot(n, SUN));
  vec3 c = alb * sunC * dif * sh;
  c += alb * skyAmb() * (0.55 + 0.45 * n.y) * ao * 0.9;
  c += alb * vec3(0.32, 0.24, 0.12) * (0.5 - 0.5 * n.y) * ao * 0.35 * (1.0 - 0.6 * uCold);
  // light through leaves and grass seen against the sun
  // light through a thin leaf or blade: lit from its far side, strongest looking into the sun
  float back = 0.55 * sat(-dot(n, SUN)) * (0.35 + 0.65 * sat(dot(rd, SUN))) + 0.45 * pow(sat(dot(rd, SUN)), 2.5);
  c += alb * vec3(1.3, 1.3, 0.5) * sunC * tr * back * sh * 0.7;
  vec3 h = normalize(SUN - rd);
  c += sunC * spec * pow(sat(dot(n, h)), 40.0) * sh;
  if (uPresAmt > 0.0) {
    vec3 L = uPres + vec3(0.0, 1.6, 0.0) - p;
    float l2 = dot(L, L);
    vec3 Ld = L * inversesqrt(l2);
    float w = sat(dot(n, Ld) * 0.6 + 0.4);
    c += alb * vec3(2.4, 1.6, 0.8) * uPresAmt * w * 11.0 / (l2 + 8.0);
    c += alb * vec3(2.0, 1.5, 0.6) * uPresAmt * tr * pow(sat(dot(rd, Ld)), 3.0) * 18.0 / (l2 + 8.0);
  }
  return c;
}

vec3 shadeLeaf(vec3 ro, vec3 rd, float t, vec3 C, vec4 tr, vec3 rad) {
  vec3 p = ro + rd * t;
  vec3 q = p - C;
  vec3 h = LEAF_ID;
  float depth = LEAF_DEPTH;
  float sv = crownSun(q, tr, rad);
  float ao = exp(-depth * 1.2) * 0.65 + 0.35;
  if (LEAF.w > 2.5) {
    vec2 e = vec2(0.003, 0.0);
    vec3 n = normalize(vec3(woodSDF(q + e.xyy, tr, rad) - woodSDF(q - e.xyy, tr, rad), woodSDF(q + e.yxy, tr, rad) - woodSDF(q - e.yxy, tr, rad), woodSDF(q + e.yyx, tr, rad) - woodSDF(q - e.yyx, tr, rad)));
    float bk = vnoise(vec2(atan(q.x, q.z) * 6.0, q.y * 9.0)) * 0.6 + vnoise(q * 30.0) * 0.4;
    vec3 alb = mix(vec3(0.05, 0.04, 0.03), vec3(0.14, 0.12, 0.1), bk);
    return lightW(p, n, rd, alb, sv, ao, 0.0, 0.05);
  }
  if (LEAF.w > 1.5) {
    vec3 n = LEAF.xyz;
    float sort = fract(sin(dot(tr.xy, vec2(0.71, 1.37))) * 43.7);
    vec3 alb = mix(vec3(0.55, 0.36, 0.06), vec3(0.48, 0.42, 0.1), h.y);     // golden apples
    if (sort > 0.66) alb = mix(vec3(0.16, 0.06, 0.1), vec3(0.25, 0.14, 0.12), h.y);   // figs
    else if (sort > 0.33) alb = mix(vec3(0.3, 0.14, 0.08), vec3(0.36, 0.22, 0.12), h.y);   // pomegranates (muted; the only true red is the barred tree's)
    return lightW(p, n, rd, alb, sv, ao, 0.25, 0.5);
  }
  if (LEAF.w > 0.5) {
    // deeper in: more leaves, in shade
    float ln = vnoise(q * 9.0 / (0.12 + length(C - ro) * 0.004));
    vec3 alb = mix(vec3(0.025, 0.045, 0.014), vec3(0.07, 0.1, 0.025), ln);
    vec3 c = lightW(p, normalize(normalize(q / rad) - rd * 0.5), rd, alb, sv * 0.5 * ln, 0.5, 0.8, 0.0);
    return c + alb * skyAmb() * 0.25 * ln;
  }
  vec3 n = LEAF.xyz;
  if (dot(n, rd) > 0.0) n = -n;
  float under = step(0.0, -dot(LEAF.xyz, -rd));
  vec3 alb = mix(vec3(0.045, 0.085, 0.018), vec3(0.11, 0.14, 0.03), h.z);
  alb = mix(alb, vec3(0.16, 0.13, 0.03), step(0.93, h.y));                  // a yellowing leaf
  alb = mix(alb, vec3(0.16, 0.19, 0.13), under * 0.6);                      // the pale underside
  // a gust (or the presence passing) turns the leaves over: their pale undersides flash silver
  float flip = sat(uWaveAmt * exp(-pow((p.z - uWaveZ) / 9.0, 2.0)) * 1.2) * step(0.35, h.x);
  if (uPresAmt > 0.0) flip = max(flip, sat(uPresAmt * exp(-dot(p - uPres - vec3(0, 2, 0), p - uPres - vec3(0, 2, 0)) / 14.0) * 1.2) * step(0.45, h.y));
  flip *= 0.7;
  alb = mix(alb, vec3(0.12, 0.14, 0.12), flip);
  vec3 c = lightW(p, n, rd, alb, sv, ao, 0.9, 0.35 * (1.0 - under) + 0.5 * flip);
  c += skyAmb() * vec3(0.5, 0.55, 0.6) * flip * 0.08;
  return c;
}

// ---------------------------------------------------------------- atmosphere
vec3 hazeCol(vec3 rd) {
  float m = max(dot(rd, SUN), 0.0);
  vec3 base = mix(vec3(0.55, 0.62, 0.75), vec3(0.5, 0.55, 0.62), uCold);
  vec3 c = mix(base, vec3(1.15, 0.82, 0.52), (1.0 - uCold) * (0.3 + 0.6 * pow(m, 6.0)));
  c += vec3(1.0, 0.65, 0.3) * pow(m, 40.0) * 0.5 * (1.0 - uCold);
  return c;
}
vec3 fogW(vec3 c, vec3 ro, vec3 rd, float t) {
  // height haze: dense near the ground, thinning with height
  float a = 0.00014 * uHaze, b = 0.005;
  float y0 = ro.y, dy = rd.y * t;
  float od = a * t * exp(-b * max(y0, 0.0)) * (abs(dy) > 0.01 ? (1.0 - exp(-b * dy)) / (b * dy) : 1.0);
  od += 0.00002 * t * uHaze;
  float f = 1.0 - exp(-od);
  return mix(c, hazeCol(rd), f);
}
// mist on the water: drifting, lit gold toward the sun
vec3 mistW(vec3 c, vec3 ro, vec3 rd, float t, float jit) {
  if (uMist <= 0.0) return c;
  float tm = min(t, 260.0);
  float T = 1.0; vec3 L = vec3(0);
  const int N = 10;
  float dt = tm / float(N);
  vec3 mc = hazeCol(rd) * (0.55 + 0.6 * pow(max(dot(rd, SUN), 0.0), 3.0));
  for (int i = 0; i < N; i++) {
    float s = (float(i) + jit) * dt;
    vec3 q = ro + rd * s;
    float den = exp(-max(q.y, 0.0) / 1.6) * smoothstep(12.0, -2.0, riverDist(q.xz));
    den *= 0.45 + 0.9 * vnoise(q.xz * 0.06 + vec2(uTime * 0.35, uTime * 0.12)) * vnoise(q * 0.21 + uTime * 0.05);
    float a = 1.0 - exp(-den * uMist * 0.035 * dt);
    L += T * a * mc; T *= 1.0 - a;
  }
  return c * T + L;
}

// ---------------------------------------------------------------- water
vec3 waterN(vec2 xz, float t) {
  vec2 fl = vec2(0.0, -1.0) * uTime * 0.9;
  float e = 0.05 + t * 0.002;
  float s = 1.0 / (1.0 + t * 0.02);
  float h0 = fbm(xz * 0.35 + fl, 3), hx = fbm((xz + vec2(e, 0)) * 0.35 + fl, 3), hz = fbm((xz + vec2(0, e)) * 0.35 + fl, 3);
  float g0 = vnoise(xz * 2.2 + fl * 3.0), gx = vnoise((xz + vec2(e, 0)) * 2.2 + fl * 3.0), gz = vnoise((xz + vec2(0, e)) * 2.2 + fl * 3.0);
  vec2 g = vec2(hx - h0, hz - h0) / e * 0.10 + vec2(gx - g0, gz - g0) / e * 0.012;
  return normalize(vec3(-g.x * s, 1.0, -g.y * s));
}

// ---------------------------------------------------------------- shading the wide world
vec3 shadeHit(vec3 ro, vec3 rd, float t) {
  vec3 p = ro + rd * t;
  float m = MAT; vec4 tr = MTREE; float occ = CANOPY_OCC;
  vec3 c;
  if (m < 0.5) {
    vec3 n = terrainNormal(p.xz, t);
    #ifdef PROF_NOSH
    float sh = 1.0;
    #else
    float sh = treeShadow(p) * (t < 1500.0 ? terrainShadow(p + n * 0.5) : 1.0);
    #endif
    float r = length(p.xz - TREEP.xz);
    vec3 alb = grassAlb(p, t);
    alb = mix(alb, vec3(0.04, 0.055, 0.025), smoothstep(2400.0, 3400.0, r) * 0.8);     // wooded far hills
    alb = mix(alb, vec3(0.09, 0.075, 0.05), smoothstep(1.2, 0.3, p.y) * 0.7);            // the banks
    float ao = 0.7 + 0.3 * sat(n.y);
    c = lightW(p, n, rd, alb, sh, ao, 0.35, 0.02);
    // wind sheen on grass: gusts flatten it and it catches the light
    float gs = gust(p.xz);
    c += vec3(0.5, 0.55, 0.62) * skyAmb() * 0.05 * uWaveAmt * exp(-pow((p.z - uWaveZ) / 7.0, 2.0));
    c *= 1.0 + (0.35 + 0.5 * uSurge) * gs * (1.0 - uCold * 0.4) * smoothstep(0.0, 1.0, p.y);
  } else if (m < 1.5 || m > 2.5 && m < 3.5) {
    // canopy
    vec3 n = normalW(p, t);
    float kind = m > 2.5 ? 9.0 : tr.w;
    float sh = m > 2.5 ? 1.0 : (t < 1500.0 ? terrainShadow(p + n) : 1.0);
    vec3 alb = kind < 0.5 ? vec3(0.07, 0.10, 0.03) : kind < 1.5 ? vec3(0.05, 0.085, 0.03) : vec3(0.08, 0.10, 0.035);
    if (kind > 8.0) alb = vec3(0.022, 0.04, 0.02);
    float ln = vnoise(p * 2.3);
    alb *= 0.7 + 0.6 * ln;
    if (m > 2.5) occ = 1.0;
    // a gust front turns the leaves over as it passes: the crown goes pale and silvery
    float flip = sat(uWaveAmt * exp(-pow((p.z - uWaveZ) / 10.0, 2.0)) * 0.8) * smoothstep(0.35, 0.6, vnoise(p * 1.7 + uTime));
    alb = mix(alb, vec3(0.17, 0.2, 0.17), flip);
    // leaf glints and gaps when close
    if (t < 60.0) { float lf = vnoise(p * 14.0); n = normalize(n + (vec3(vnoise(p * 9.0), lf, vnoise(p * 9.0 + 4.0)) - 0.5) * 1.2); alb *= 0.7 + 0.6 * lf; }
    // self-shadow within the crown: the sun side is lit, the far side and the hollows dim
    float ao = (0.35 + 0.65 * occ) * (0.6 + 0.4 * sat(n.y * 0.5 + 0.6));
    c = lightW(p, n, rd, alb, sh * occ * (0.35 + 0.65 * smoothstep(-0.3, 0.6, dot(n, SUN))), ao, 0.9 * (0.4 + 0.6 * (1.0 - occ * 0.5)), 0.08);
    if (kind < 0.5 && t < 260.0) {
      // orchard fruit: golden specks in the leaves
      vec3 fq = p * 4.0; vec3 fc = floor(fq);
      float fr = step(0.9, hash13(fc)) * smoothstep(0.3, 0.12, length(fract(fq) - 0.5)) * (1.0 - occ * 0.5);
      c = mix(c, lightW(p, n, rd, vec3(0.5, 0.3, 0.05), sh, ao, 0.2, 0.3), fr * 0.7 * smoothstep(260.0, 60.0, t));
    }
    if (kind > 8.0) {
      // a few red fruit catching the sun
      float fr = step(0.995, hash13(floor(p * 1.3))) * sat(dot(n, SUN) + 0.2) * smoothstep(-0.2, 0.3, n.y);
      c += vec3(2.2, 0.12, 0.05) * fr * sunLight() * 0.08;
    }
  } else if (m > 4.5 && m < 5.5) {
    // the crown of the tree of life: pale, white-gold light from within
    vec3 n = normalW(p, t);
    float ln = vnoise(p * 0.6 + uTime * 0.2);
    c = vec3(1.0, 0.8, 0.48) * (0.6 + 0.6 * ln) * (0.7 + 0.3 * n.y) * 0.85;
  } else {
    // wood
    vec3 n = normalW(p, t);
    // bark: deep vertical furrows broken by cross-checks, and lichen
    vec3 tc = vec3(tr.x, 0.0, tr.y);
    float ang = atan(p.x - tc.x, p.z - tc.z);
    float fur = vnoise(vec2(ang * 9.0, p.y * 1.6)) * 0.7 + vnoise(vec2(ang * 22.0, p.y * 5.0)) * 0.3;
    float bk = smoothstep(0.25, 0.75, fur);
    n = normalize(n + vec3(cos(ang), 0.0, -sin(ang)) * (fur - 0.5) * 0.9);
    vec3 alb = m > 5.5 ? vec3(0.5, 0.45, 0.35) : mix(vec3(0.012, 0.01, 0.008), vec3(0.075, 0.068, 0.055), bk);
    alb = mix(alb, vec3(0.07, 0.08, 0.05), smoothstep(0.62, 0.8, vnoise(p.xy * 6.0 + p.z)) * 0.6);
    c = lightW(p, n, rd, alb, treeShadow(p) * 0.8, 0.55, 0.0, 0.02);
    if (m > 5.5) c += vec3(1.0, 0.8, 0.4) * 0.8;
  }
  return c;
}

// God's presence: a soft column of warm light standing on the ground at uPres. Seen through the air
// (a core and a broad halo), hidden by whatever stands in front of it.
vec3 presenceGlow(vec3 c, vec3 ro, vec3 rd, float depth) {
  if (uPresAmt <= 0.0) return c;
  float R = max(uPresR, 0.2);
  vec3 A = uPres + vec3(0.0, -0.5, 0.0), V = vec3(0.0, 4.6 * R * uPresTall, 0.0);
  vec3 w0 = ro - A;
  float b = dot(rd, V), cc = dot(V, V), e = dot(V, w0), dd = dot(rd, w0);
  float den = max(cc - b * b, 1e-6);
  float s = clamp((e - b * dd) / den, 0.0, 1.0);
  float tc = max(dot(A + V * s - ro, rd), 0.0);
  float dist = length(ro + rd * tc - A - V * s);
  float occ = tc > depth ? exp(-(tc - depth) * 1.2 / R) : 1.0;
  float hs = 1.0 - 0.55 * s;                    // brightest low, fading upward
  float dr = dist / R;
  // a soft body of light that breathes and drifts a little within itself, brightest low
  float wob = 0.85 + 0.3 * vnoise(vec2(s * 5.0 - uTime * 0.8, uTime * 0.3));
  float core = exp(-dr * dr / 0.9) * 0.9 * wob + exp(-dr / 1.3) * 0.45;
  float halo = exp(-dr / 5.0) * 0.2;
  hs *= smoothstep(1.0, 0.2, s) * smoothstep(0.0, 0.08, s);
  vec3 col = vec3(1.0, 0.72, 0.4);
  float flick = 0.92 + 0.08 * sin(uTime * 2.3) * sin(uTime * 3.7 + 1.0);
  return c + col * uPresAmt * flick * (core * hs * occ + halo * mix(occ, 1.0, 0.5));
}

float DBGM = 0.0;
// the whole wide view: ground, trees, rivers, sky, haze. depth out (1e5 = sky)
vec3 gardenWide(vec3 ro, vec3 rd, float jit, out float depth) {
  float t = marchW(ro, rd, 9000.0, jit);
  float tw = rd.y < 0.0 ? -ro.y / rd.y : 1e9;
  vec3 c;
  // trees close by: resolve the crown into leaves; through a gap, carry on beyond the crown
  bool leaf = false; vec3 lC; vec4 lT; vec3 lR;
  for (int k = 0; k < 3; k++) {
    if (!(t > 0.0 && t < uLeafT && t < tw && MAT > 0.5 && MAT < 1.5)) break;
    vec4 tr = MTREE; float trunkH; vec3 rad; treeShape(tr, trunkH, rad);
    vec3 C = vec3(tr.x, terrainH(tr.xy, 4) + trunkH + rad.y, tr.y);
    float cs = 0.12 * max(1.0, length(C - ro) / 22.0);
    float rmax = max(rad.x, rad.y) * 1.3;
    float tc = dot(C - ro, rd);
    float t1 = tc + rmax;
    float tl = leafMarch(ro, rd, max(t - 1.2, 0.0), t1, C, tr, rad, cs);
    if (tl > 0.0) { t = tl; leaf = true; lC = C; lT = tr; lR = rad; break; }
    #ifdef DBG_MISS
    DBGM = 1.0;
    #endif
    float t2 = marchW(ro + rd * t1, rd, 9000.0, jit);
    t = t2 > 0.0 ? t1 + t2 : -1.0;
  }
  if (t < 0.0) t = 1e5;
  if (tw < t) {
    vec3 p = ro + rd * tw;
    vec3 n = waterN(p.xz, tw);
    float fr = 0.03 + 0.97 * pow(1.0 - sat(dot(n, -rd)), 5.0);
    vec3 rr = reflect(rd, n);
    if (rr.y < 0.02) rr.y = 0.02;
    vec3 rc;
    #ifdef PROF_NOREFL
    float tr2 = -1.0;
    #else
    LODK = 4.0; MAXI = 110;
    float tr2 = marchW(p + vec3(0, 0.05, 0), normalize(rr), 2500.0, jit);
    #endif
    if (tr2 > 0.0) { rc = shadeHit(p, normalize(rr), tr2); rc = fogW(rc, p, normalize(rr), tr2); }
    else rc = min(skyCol(normalize(rr)), vec3(6.0));
    LODK = 1.0; MAXI = 240;
    vec3 deep = mix(vec3(0.02, 0.035, 0.03), vec3(0.025, 0.03, 0.035), uCold);
    float sh = treeShadow(p);
    c = mix(deep * (0.4 + 0.6 * sh) * skyAmb() * 2.0, rc, fr);
    c += sunLight() * pow(sat(dot(reflect(rd, n), SUN)), 300.0) * 1.5 * sh;
    t = tw;
  } else if (leaf) {
    c = shadeLeaf(ro, rd, t, lC, lT, lR);
  } else if (t < 1e4) {
    c = shadeHit(ro, rd, t);
  } else {
    c = skyCol(rd);
  }
  #ifdef DBG_MISS
  if (DBGM > 0.5 && t > 1e4) c = vec3(5.0, 0.0, 0.0);
  #endif
  if (t < 1e4) c = fogW(c, ro, rd, t);
  else c = mix(c, hazeCol(rd), 0.3 * exp(-max(rd.y, 0.0) * 22.0) * uHaze);
  // the tree of life carries a soft white-gold light about it, even from far away
  vec3 lc = LIFEP + vec3(0.0, terrainH(LIFEP.xz, 3) + 46.0, 0.0);
  float al = dot(lc - ro, rd);
  if (al > 0.0 && t > al - 60.0) {
    float pr = length(ro + rd * al - lc);
    c += vec3(1.0, 0.84, 0.55) * (exp(-pr / 22.0) * 0.22 + exp(-pr / 120.0) * 0.07) * (1.0 - 0.5 * uCold);
  }
  depth = t;
  return c;
}
`;

export const GARDEN_UNIFORMS = {
  uSunDir: [0.2, 0.16, 0.97], uSunCol: [7.5, 5.2, 3.0], uCold: 0, uWind: 1, uSurge: 0,
  uFocus: 10, uAperture: 0, uPres: [0, 0, 0], uPresAmt: 0, uWaveZ: -1e4, uWaveAmt: 0, uPresR: 1, uPresTall: 1, uMist: 0, uHaze: 1, uLeafT: 70,
};

// The main river's centre (river 0, flowing from the rise toward -z) at world z, for cameras that
// follow it. Mirrors riverAngle() above.
export function riverX(z) {
  const TZ = 1500;
  let r = Math.abs(z - TZ);
  for (let i = 0; i < 6; i++) {
    const th = Math.PI + 0.16 * Math.sin(r / 210) + 0.05 * Math.sin(r / 61);
    r = (z - TZ) / Math.cos(th);
  }
  const th = Math.PI + 0.16 * Math.sin(r / 210) + 0.05 * Math.sin(r / 61);
  return r * Math.sin(th);
}
export const TREEP = [0, 30, 1500];
export const LIFEP = [-620, 16, 2750];
// ground height inside the orchard pad (PADO) and the meadow pad (PADM), for cameras (within ~0.2 m)
export const orchardGround = (x, z) => 3.15 + 1.5 * Math.sin(x * 0.012) * Math.sin(z * 0.009);
export const meadowGround = () => 2.15;
export const PADO = [150, 250];
export const PADM = [-190, -150];
