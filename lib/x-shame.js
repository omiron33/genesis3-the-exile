// The garden after the eating (scenes 19-30, the "shame" world). The same garden as Paradise, but
// the gold has drained out: a cold, exposed blue-grey afternoon, then dusk. Dark trunks with real
// bark, heavy crowns, a low thicket, fig leaves close to the lens, two people only ever as distant
// silhouettes and long shadows, and the searching warm light of God moving through the trees on the
// far side (a point light with true in-scattering and shafts cut by the trunks).
// Units: metres, y up. Every frame is a pure function of uTime and the uniforms the scene sets.
import { grade, ease, clamp, drift } from '/song/lib/look.js';
import { cameraPlane } from '/engine.js';

export const SHAME_UNIFORMS = {
  uCold: 1.0,        // 0 = the gold of Paradise, 1 = cold exposed blue-grey
  uDusk: 0.0,        // 0 afternoon .. 1 dusk
  uWind: 0.3,        // wind strength
  uWT: 0.0,          // wind time (integrated, so wind can die without anything jumping)
  uAperS: 0.0, uFocusS: 10.0,   // thin lens: aperture radius (m) and focus distance (m)
  uDens: 0.5,        // tree density 0..1
  uClear: [0, 0, 0], // x, z, radius of a clearing with no trees
  uSunD: [-0.6, 0.18, -0.8],
  uGodP: [0, 2, 40], uGodK: 0.0, uGodR: 6.0, uGodScat: 0.0,
  uFigA: [0, 0, 0], uFigB: [0, 0, 0],   // x, z, yaw (radians) of the man and the woman
  uPoseA: [0, 0, 0], uPoseB: [0, 0, 0], // walk phase, stride, head bow
  uFigOn: [0, 0, 0],                    // man visible, woman visible, unused
  uFog: 0.012,
  uLeafC: [0, 1, 2], uLeafS: [2, 1, 0.5], uLeafN: 0, uLeafSize: 0.12, uLeafSeed: 0,
  uLeafCurl: 0.4, uLeafDark: 0.0, uLeafPart: 0.0, uLeafTwig: 0.0,
  uExpo: 1.0,
  uCanopy: 0.0,      // how much the crowns close over the camera (darkens light from the sky below them)
  uMist: 0.0,
  uSunSh: 1.0,
  uSunK: 1.0,
  uSunHard: 0.0,
  uGrassH: 0.0, uGrassFar: 12.0,      // height of the grass, blade by blade near the camera (0 = none)     // 1 = a hard low sun with crisp long shadows        // the sun's strength on top of the arc (a cold low sun breaking under the cloud)       // 0 skips the sun's shadow ray (overcast, under the canopy)        // extra ground mist (density at y = 0, thins upward)
};

export const SHAME_GLSL = /* glsl */ `
uniform float uCold, uDusk, uWind, uWT, uAperS, uFocusS, uDens, uGodK, uGodR, uGodScat, uFog, uExpo, uCanopy, uMist, uSunSh, uSunK, uSunHard, uGrassH, uGrassFar;
uniform vec3 uClear, uSunD, uGodP, uFigA, uFigB, uPoseA, uPoseB, uFigOn;
uniform vec3 uLeafC, uLeafS; uniform float uLeafTwig; uniform float uLeafN, uLeafSize, uLeafSeed, uLeafCurl, uLeafDark, uLeafPart;

#ifndef SH_STEPS
#define SH_STEPS 100
#endif
#ifndef SH_SHAFT_N
#define SH_SHAFT_N 1
#endif
vec3 SUND, SUNC, AMB, GODC;
void shSetup() {
  SUND = normalize(uSunD);
  SUNC = mix(vec3(3.6, 2.35, 1.2), vec3(1.0, 1.1, 1.28) * 0.42, uCold) * (1.0 - 0.96 * uDusk) * uSunK;
  AMB = mix(vec3(0.34, 0.40, 0.52), vec3(0.50, 0.57, 0.68), uCold) * (1.0 - 0.86 * uDusk);
  GODC = vec3(2.6, 1.55, 0.68) * uGodK;
}

// ---------------- sky ----------------
vec3 shSky(vec3 rd) {
  float y = rd.y;
  float sd = max(dot(rd, SUND), 0.0);
  vec3 g = mix(vec3(1.35, 0.92, 0.52), vec3(0.42, 0.56, 0.80), smoothstep(-0.02, 0.55, y));
  g += vec3(1.7, 1.05, 0.5) * pow(sd, 7.0) * 0.9 + vec3(30.0, 20.0, 11.0) * smoothstep(0.99955, 0.9998, sd);
  vec3 c = mix(vec3(0.66, 0.71, 0.80), vec3(0.33, 0.40, 0.52), smoothstep(-0.02, 0.6, y));
  c += vec3(0.20, 0.22, 0.25) * pow(sd, 3.0);
  vec3 s = mix(g, c, uCold);
  vec3 d = mix(vec3(0.20, 0.21, 0.29), vec3(0.025, 0.04, 0.085), smoothstep(-0.02, 0.45, y));
  // the warm afterglow low in the west stays only as a thin band at dusk
  d += vec3(0.30, 0.16, 0.08) * pow(sd, 3.0) * smoothstep(0.25, 0.0, y);
  s = mix(s, d, uDusk);
  // cloud: broken in the gold, a lid of soft overcast in the cold
  vec2 uv = rd.xz / (max(y, 0.0) + 0.09);
  float cl = fbm(uv * 0.32 + vec2(uTime * 0.012, 0.0), 5);
  float cov = mix(0.5, 0.34, uCold);
  float dens = smoothstep(cov, cov + 0.32, cl) * smoothstep(0.0, 0.1, y);
  vec3 lit = mix(vec3(1.5, 1.05, 0.72) + vec3(1.2, 0.7, 0.3) * pow(sd, 4.0), vec3(0.60, 0.64, 0.72) + 0.2 * pow(sd, 3.0), uCold);
  vec3 cc = mix(lit, vec3(0.08, 0.095, 0.13), uDusk);
  s = mix(s, cc * (0.85 + 0.25 * fbm(uv * 1.3, 3)), dens * 0.8);
  // first stars at dusk
  if (uDusk > 0.3 && y > 0.12) {
    vec3 q = rd * 300.0; vec3 id = floor(q);
    float st = smoothstep(0.9975, 1.0, hash13(id)) * smoothstep(0.45, 0.0, length(fract(q) - 0.5));
    s += vec3(0.8, 0.86, 1.0) * st * (uDusk - 0.3) * 1.6 * (1.0 - dens);
  }
  return s;
}
vec3 shFogCol(vec3 rd) {
  vec3 h = shSky(normalize(vec3(rd.x, 0.03, rd.z)));
  return mix(h, AMB * 0.9, 0.35);
}

// ---------------- ground ----------------
float gH(vec2 p) { return 0.55 * fbm(p * 0.045 + vec2(3.0, 7.0), 2) + 0.05 * vnoise(p * 0.8) - 0.3; }

// ---------------- trees ----------------
#define CELL 5.2
// Trees sit near their cell centres (jitter <= 0.62 m) and reach at most ~4.5 m from them, so the
// 2x2 block of cells nearest a point holds every tree that can touch it.
float LODD;   // distance from the camera of the point being evaluated (level of detail)
bool treeCell(vec2 c, out vec2 xz, out float r0, out float hb, out float R, out float seed) {
  vec3 h = hash33(vec3(c, 17.3));
  if (h.x > uDens * (0.55 + 0.9 * hash12(floor(c * 0.25) + 3.7))) return false;
  vec3 g = hash33(vec3(c * 1.31, 4.7));
  seed = h.y;
  xz = (c + 0.5 + (g.xy - 0.5) * 0.24) * CELL;
  r0 = 0.13 + 0.26 * g.z;
  hb = 2.6 + 3.0 * h.z;
  R = 2.0 + 1.0 * fract(h.y * 7.31 + g.z * 3.7);
  if (length(xz - uClear.xy) < uClear.z) return false;
  return true;
}
vec2 trunkOff(float y, float seed) {
  return vec2(sin(y * 0.45 + seed * 6.3), cos(y * 0.37 + seed * 4.1)) * 0.22 * smoothstep(0.0, 4.0, y)
       + vec2(seed - 0.5, hash11(seed * 7.0) - 0.5) * 0.1 * max(y, 0.0);
}
float sdTree(vec3 q, float r0, float hb, float R, float seed, float dcur, out float isCrown) {
  float y = q.y;
  float d = 1e3;
  isCrown = 0.0;
  // trunk and limbs, only when the point is near them
  float tb = max(length(q.xz) - (r0 * 2.3 + 0.75 + 0.06 * max(y, 0.0) + R * 0.75 * smoothstep(hb * 0.6, hb + 1.5, y)), y - (hb + R * 1.1));
  if (tb < dcur) {
    vec2 off = trunkOff(y, seed);
    float r = r0 * (1.0 + 1.0 * exp(-max(y + 0.3, 0.0) * 2.4)) * (1.0 - 0.03 * max(y, 0.0));
    vec2 tq = q.xz - off;
    if (y < 1.0 && LODD < 25.0) { float ang = atan(tq.y, tq.x); r *= 1.0 + 0.35 * exp(-max(y + 0.2, 0.0) * 3.0) * pow(abs(sin(ang * 2.5 + seed * 9.0)), 3.0); }
    d = max(length(tq) - r, y - (hb + R * 0.75)) * 0.8;
    if (y > hb * 0.6 && LODD < 60.0) {
      float fy = hb * (0.55 + 0.3 * hash11(seed * 5.3));
      vec2 o7 = trunkOff(fy, seed);
      vec3 a = vec3(o7.x, fy, o7.y);
      float an = seed * 12.0;
      float sp = 0.6 + 0.9 * hash11(seed * 3.1);
      vec3 b1 = a + vec3(cos(an) * sp, 1.2, sin(an) * sp) * R * 0.62;
      d = min(d, sdRoundCone(q, a, b1, r0 * 0.62, r0 * 0.22));
      if (hash11(seed * 8.9) > 0.3) {
        float an2 = an + 1.8 + 1.6 * hash11(seed * 4.4);
        vec3 b2 = a + vec3(0.0, hb * 0.12, 0.0) + vec3(cos(an2) * sp, 0.9, sin(an2) * sp) * R * 0.55;
        d = min(d, sdRoundCone(q, a + vec3(0.0, hb * 0.12, 0.0), b2, r0 * 0.5, r0 * 0.18));
      }
    }
  }
  // the crown, swaying a little in the wind
  vec3 cq = q - vec3(0.0, hb + R * 0.62, 0.0);
  cq.xz -= vec2(sin(uWT * 0.7 + seed * 6.0), cos(uWT * 0.55 + seed * 3.0)) * 0.06 * uWind * (1.0 + cq.y * 0.3);
  float dc = sdEllipsoid(cq, vec3(R, R * 0.6, R * 0.92));
  if (dc - R * 0.95 < min(d, dcur)) {
    // the crown is three rounded masses, not one
    vec3 h1 = hash33(vec3(seed * 11.0, 1.0, 2.0)) - 0.5, h2 = hash33(vec3(seed * 7.0, 5.0, 1.0)) - 0.5;
    dc = smin(dc, sdEllipsoid(cq - vec3(h1.x * R * 0.9, R * (0.2 + 0.35 * h1.y), h1.z * R * 0.9), vec3(R * 0.6, R * 0.55, R * 0.6)), R * 0.35);
    dc = smin(dc, sdEllipsoid(cq - vec3(h2.x * R, R * (-0.05 + 0.3 * h2.y), h2.z * R), vec3(R * 0.55, R * 0.5, R * 0.55)), R * 0.35);
    if (dc < 1.4 && LODD < 60.0) {
      float w = smoothstep(1.4, 0.9, dc) * smoothstep(60.0, 45.0, LODD);
      dc += w * (fbm(cq * 0.7 + seed * 13.0, 2) - 0.5) * 1.2;
      // clusters of leaves: small rounded clumps with gaps between them where the sky and the dark
      // inside of the crown show; a solid core keeps the crown from being hollow
      vec3 lq = cq * 2.2 + seed * 17.0;
      lq.xz = rot(seed * 6.0) * lq.xz;
      lq += 0.4 * sin(lq.yzx * 1.3 + seed * 5.0);
      vec3 id = floor(lq), fq = fract(lq) - 0.5;
      vec3 j = hash33(id + seed) - 0.5;
      float cl = (length(fq - j * 0.45) - 0.31 - 0.14 * j.x + 0.08 * sin(fq.x * 9.0 + j.y * 6.0) * sin(fq.z * 8.0)) / 2.2;
      float lw = smoothstep(40.0, 25.0, LODD);
      float leafy = min(max(dc - 0.22, cl), dc + 0.2);
      dc = mix(dc, leafy, lw * smoothstep(0.9, 0.5, dc));
    }
    dc *= 0.7;
    if (dc < d) { d = dc; isCrown = 1.0; }
  }
  return d;
}

// ---------------- people (silhouettes only; there is no face to draw) ----------------
float sdFig(vec3 p, float ph, float stride, float bow, float fem) {
  float sc = mix(1.0, 0.93, fem);
  p /= sc;
  float s = sin(ph) * stride, s2 = sin(ph + PI) * stride;
  float lift1 = max(0.0, cos(ph)) * stride * 0.22, lift2 = max(0.0, -cos(ph)) * stride * 0.22;
  float hw = mix(0.085, 0.1, fem);
  vec3 hl = vec3(-hw, 0.9, 0.0), hr = vec3(hw, 0.9, 0.0);
  vec3 kl = vec3(-0.085, 0.49 + lift1 * 0.4 - 0.015 * (1.0 - stride), s * 0.2 + lift1 * 0.35 + 0.02 + 0.05 * (1.0 - stride)), kr = vec3(0.095, 0.49 + lift2 * 0.4, s2 * 0.2 + lift2 * 0.35 + 0.02);
  vec3 fl = vec3(-0.12, 0.06 + lift1, s * 0.4 + 0.03 * (1.0 - stride)), fr = vec3(0.1, 0.06 + lift2, s2 * 0.4);
  // thighs taper to the knee, calves to the ankle, a foot forward
  float d = sdRoundCone(p, hl, kl, 0.085, 0.052);
  d = min(d, sdRoundCone(p, kl, fl, 0.05, 0.034));
  d = smin(d, sdEllipsoid(p - mix(kl, fl, 0.3) + vec3(0.0, 0.0, 0.012), vec3(0.052, 0.12, 0.058)), 0.03);
  d = min(d, sdRoundCone(p, hr, kr, 0.085, 0.052));
  d = min(d, sdRoundCone(p, kr, fr, 0.05, 0.034));
  d = smin(d, sdEllipsoid(p - mix(kr, fr, 0.3) + vec3(0.0, 0.0, 0.012), vec3(0.052, 0.12, 0.058)), 0.03);
  d = min(d, sdCapsule(p, fl, fl + vec3(0.0, -0.03, 0.13), 0.035));
  d = min(d, sdCapsule(p, fr, fr + vec3(0.0, -0.03, 0.13), 0.035));
  // the upper body bends forward at the hips with the bow
  vec3 q = p - vec3(0.0, 0.95, 0.0);
  q.yz = rot(-bow * 0.3) * q.yz;
  q += vec3(0.0, 0.95, 0.0);
  // pelvis, waist, ribcage, shoulders: a soft column wider at the chest (his) or hips (hers)
  float br = 1.0 + 0.012 * sin(uTime * 1.7 + fem * 2.0);   // breathing
  float tor = sdEllipsoid(q - vec3(0.0, 0.95, 0.0), vec3(mix(0.16, 0.15, fem), 0.13, 0.11));
  tor = smin(tor, sdEllipsoid(q - vec3(0.0, 1.13, 0.0), vec3(mix(0.14, 0.12, fem), 0.14, 0.095)), 0.08);
  tor = smin(tor, sdEllipsoid(q - vec3(0.0, 1.3, 0.0), vec3(mix(0.18, 0.15, fem), 0.14, 0.11) * br), 0.08);
  tor = smin(tor, sdCapsule(q, vec3(-mix(0.16, 0.13, fem), 1.4, 0.0), vec3(mix(0.16, 0.13, fem), 1.4, 0.0), 0.06), 0.06);
  // the body's own curves: seat, shoulder blades, and her breast
  tor = smin(tor, sdEllipsoid(q - vec3(0.0, 0.9, -0.04), vec3(mix(0.15, 0.14, fem), 0.12, 0.095)), 0.06);
  tor = smin(tor, sdEllipsoid(q - vec3(0.0, 1.32, -0.03), vec3(mix(0.17, 0.14, fem), 0.1, 0.1)), 0.05);
  d = smin(d, tor, 0.07);
  // the girdle of fig leaves they sewed: a short ragged skirt of leaves round the hips
  {
    vec3 gq = p - vec3(0.0, 0.86, 0.0);
    float ang = atan(gq.x, gq.z);
    float rr = length(gq.xz);
    // overlapping leaves: each hangs as a rounded lobe, so the hem is scalloped
    float lobe = pow(abs(cos(ang * 3.5 + 0.4)), 0.6);
    float hem = -0.05 - 0.06 * lobe - 0.02 * vnoise(vec2(ang * 7.0, 2.0));
    float flare = 0.15 + max(-gq.y, 0.0) * 0.15 + 0.008 * lobe;
    float gd = max(max(rr - flare, gq.y - 0.07), hem - gq.y);
    d = smin(d, gd * 0.8, 0.025);
  }
  // arms hang and swing a little; when ashamed they fold in front of the body
  float as = -s * 0.5;
  float sx = mix(0.19, 0.16, fem);
  vec3 shl = vec3(-sx, 1.39, 0.0), shr = vec3(sx, 1.39, 0.0);
  vec3 el = vec3(-sx - 0.03 + bow * 0.07, 1.11, as * 0.1 + bow * 0.1), er = vec3(sx + 0.03 - bow * 0.07, 1.11, -as * 0.1 + bow * 0.1);
  vec3 wl = vec3(-sx + bow * 0.14, 0.86 + bow * 0.14, as * 0.25 + bow * 0.2), wr = vec3(sx - bow * 0.14, 0.86 + bow * 0.14, -as * 0.25 + bow * 0.2);
  d = smin(d, sdRoundCone(q, shl, el, 0.05, 0.038), 0.04);
  d = min(d, sdRoundCone(q, el, wl, 0.036, 0.028));
  d = smin(d, sdRoundCone(q, shr, er, 0.05, 0.038), 0.04);
  d = min(d, sdRoundCone(q, er, wr, 0.036, 0.028));
  d = min(d, sdEllipsoid(q - wl - vec3(0.0, -0.07, 0.0), vec3(0.03, 0.07, 0.04)));
  d = min(d, sdEllipsoid(q - wr - vec3(0.0, -0.07, 0.0), vec3(0.03, 0.07, 0.04)));
  // neck and head, the head bowing further than the body
  vec3 nq = q - vec3(0.0, 1.45, 0.0);
  nq.yz = rot(-bow * 0.7) * nq.yz;
  d = smin(d, sdCapsule(nq, vec3(0.0), vec3(0.0, 0.1, 0.01), 0.045), 0.04);
  d = smin(d, sdEllipsoid(nq - vec3(0.0, 0.2, 0.015), vec3(0.085, 0.11, 0.1)), 0.035);
  // the woman's long hair falls over her shoulders and down her back
  if (fem > 0.5) {
    // hair to below the shoulder blades, falling in locks (a few strands loose at the edge)
    vec3 hq = nq - vec3(0.0, -0.02, -0.07);
    float hd = sdEllipsoid(hq, vec3(0.135, 0.3, 0.075));
    hd = smin(hd, sdEllipsoid(nq - vec3(0.0, 0.2, -0.015), vec3(0.1, 0.125, 0.115)), 0.04);
    if (hd < 0.05) hd += 0.012 * (vnoise(vec3(hq.x * 38.0, hq.y * 5.0, hq.z * 38.0)) - 0.5) + 0.006 * (vnoise(hq * vec3(90.0, 9.0, 90.0)) - 0.5);
    d = smin(d, hd, 0.03);
  }
  return d * sc;
}
float figDist(vec3 p, vec3 F, vec3 pose, float fem) {
  vec3 q = p - vec3(F.x, gH(F.xz) - 0.02, F.y);
#ifdef SH_HUMAN
#ifndef HUM_RIM
#define HUM_RIM 1.0
#endif
#ifndef HUM_NEPS
#define HUM_NEPS 0.02
#endif
  // the MakeHuman people baked by tools/make-humans.py (lib/x-human.js): A the man, B the woman
  float hb = length(vec2(length(q.xz), max(abs(q.y - 0.95) - 0.95, 0.0))) - 0.75;
  if (hb > 0.3) return hb;
  q.xz = rot(F.z) * q.xz;
  float hm;
#ifdef SH_HUM_A
  if (fem < 0.5) return uHumAFig(q, pose, hm);
#endif
#ifdef SH_HUM_B
  if (fem > 0.5) return uHumBFig(q, pose, hm);
#endif
  return hb + 1.0;
#endif
  float bound = length(vec2(length(q.xz), max(abs(q.y - 0.9) - 0.9, 0.0))) - 0.5;
  if (bound > 0.3) return bound;
  q.xz = rot(F.z) * q.xz;
  return sdFig(q, pose.x, pose.y, pose.z, fem);
}

// ---------------- the map ----------------
// material: 1 ground, 2 bark, 3 crown, 4 person, 5 undergrowth
float shMap(vec3 p, out float mat) {
  float dg = (p.y - gH(p.xz)) * 0.8;
  mat = 1.0;
  float d = dg;
  if (p.y > 13.0) return min(d, p.y - 12.5);
  LODD = length(p - uCamPos);
  vec2 c0 = floor(p.xz / CELL - 0.5);
  for (int j = 0; j <= 1; j++) for (int i = 0; i <= 1; i++) {
    vec2 c = c0 + vec2(i, j);
    vec2 xz; float r0, hb, R, seed;
    if (!treeCell(c, xz, r0, hb, R, seed)) continue;
    vec3 q = p - vec3(xz.x, -0.3, xz.y);
    // cheap bound: a cylinder round the whole tree
    float bnd = max(length(q.xz) - (R + 1.6), max(-q.y - 1.0, q.y - (hb + 2.0 * R)));
    if (bnd > d) continue;
    float ic;
    float dt = sdTree(q, r0, hb, R, seed, d, ic);
    if (dt < d) { d = dt; mat = 2.0 + ic; }
#ifdef SH_BUSH
    // undergrowth: a low shrub beside some trees
    vec2 bo = (hash22(c * 5.1 + 2.0) - 0.5) * 3.0;
    float bs = 0.5 + 0.8 * hash12(c * 3.7 + 1.0);
    vec3 bq = q - vec3(bo.x, 0.15 + bs * 0.3, bo.y);
    float db = sdEllipsoid(bq, vec3(bs * 1.3, bs * 0.62, bs * 1.05));
    vec2 bo2 = (hash22(c * 7.3 + 5.0) - 0.5) * 1.8;
    float bs2 = bs * (0.45 + 0.4 * hash12(c * 1.9));
    db = smin(db, sdEllipsoid(bq - vec3(bo2.x, bs2 * 0.5 - 0.1, bo2.y), vec3(bs2 * 1.1, bs2 * 0.9, bs2)), 0.4);
    if (db < 0.8) db += (fbm(bq * 2.2 + seed * 7.0, LODD < 20.0 ? 3 : 2) - 0.5) * 0.7;
    if (db < 0.35 && LODD < 20.0) db += (vnoise(bq * 9.0) - 0.5) * 0.3 + (vnoise(bq * 23.0 + 3.0) - 0.5) * 0.12;
    db *= 0.6;
    if (db < d) { d = db; mat = 5.0; }
#endif
  }
#ifdef SH_FIGS
  if (uFigOn.x > 0.5) { float df = figDist(p, uFigA, uPoseA, 0.0); if (df < d) { d = df; mat = 4.0; } }
  if (uFigOn.y > 0.5) { float df = figDist(p, uFigB, uPoseB, 1.0); if (df < d) { d = df; mat = 4.0; } }
#endif
  return d;
}
float shMapD(vec3 p) { float m; return shMap(p, m); }
// what casts shadows and cuts the shafts: trunks, crowns as plain volumes, people (no ground, no detail)
float shMapLite(vec3 p) {
  float d = 1e3;
  if (p.y > 13.0) return p.y - 12.5;
  vec2 c0 = floor(p.xz / CELL - 0.5);
  for (int j = 0; j <= 1; j++) for (int i = 0; i <= 1; i++) {
    vec2 c = c0 + vec2(i, j);
    vec2 xz; float r0, hb, R, seed;
    if (!treeCell(c, xz, r0, hb, R, seed)) continue;
    vec3 q = p - vec3(xz.x, -0.3, xz.y);
    float dt = (length(q.xz - trunkOff(q.y, seed)) - r0 * 1.15) * 0.8;
    dt = max(dt, q.y - (hb + R * 0.7));
    float dc = sdEllipsoid(q - vec3(0.0, hb + R * 0.62, 0.0), vec3(R, R * 0.6, R * 0.92) * 0.85) * 0.8;
    d = min(d, min(dt, dc));
#ifdef SH_BUSH
    vec2 bo = (hash22(c * 5.1 + 2.0) - 0.5) * 3.0;
    float bs = 0.5 + 0.9 * hash12(c * 3.7 + 1.0);
    d = min(d, sdEllipsoid(q - vec3(bo.x, 0.3 + bs * 0.35, bo.y), vec3(bs * 1.1, bs * 0.65, bs * 0.9)) * 0.8);
#endif
  }
#ifdef SH_FIGS
  if (uFigOn.x > 0.5) d = min(d, figDist(p, uFigA, uPoseA, 0.0));
  if (uFigOn.y > 0.5) d = min(d, figDist(p, uFigB, uPoseB, 1.0));
#endif
  return d;
}

float shMarch(vec3 ro, vec3 rd, float tmax, out float mat) {
  float t = 0.02;
  mat = 0.0;
  float m = 0.0, d = 1.0;
  for (int i = 0; i < SH_STEPS; i++) {
    vec3 p = ro + rd * t;
    d = shMap(p, m);
    if (d < 0.0012 * t + 0.0005) { mat = m; return t; }
    t += max(d, 0.0025 * t);
    if (t > tmax) return -1.0;
  }
  // out of steps while still close to something (grazing the ground): call it a hit
  if (m < 1.5 && d < 0.05 * t && rd.y < 0.0) { mat = m; return t + min(d / max(-rd.y, 0.02), 4.0 * d); }
  return -1.0;
}
float shShadowN(vec3 ro, vec3 rd, float tmax, float k, int n) {
  float res = 1.0, t = 0.04 + 0.1 * hash12(gl_FragCoord.xy + uJitter * 71.0);
  for (int i = 0; i < 22; i++) {
    if (i >= n) break;
    float h = shMapLite(ro + rd * t);
    res = min(res, k * h / t);
    t += clamp(h, 0.08, 2.2) * (n < 12 ? 1.6 : 1.0);
    if (res < 0.01 || t > tmax) break;
  }
  return sat(res);
}
float shShadow(vec3 ro, vec3 rd, float tmax, float k) { return shShadowN(ro, rd, tmax, k, 16); }
vec3 shNormal(vec3 p, float e) {
  vec2 k = vec2(1, -1);
  return normalize(k.xyy * shMapD(p + k.xyy * e) + k.yyx * shMapD(p + k.yyx * e) + k.yxy * shMapD(p + k.yxy * e) + k.xxx * shMapD(p + k.xxx * e));
}
float shAO(vec3 p, vec3 n) {
  float o = 0.0, w = 1.0;
  for (int i = 1; i <= 3; i++) { float h = 0.15 * float(i) * float(i); vec3 q = p + n * h; o += w * (h - min(shMapLite(q), (q.y - gH(q.xz)) * 0.8)); w *= 0.6; }
  return sat(1.0 - o * 0.7);
}

// light from the sun/overcast sky and from the searching light of God
vec3 shLight(vec3 p, vec3 n, vec3 rd, vec3 alb, float occ, float trans, float spec) {
  float k = mix(mix(18.0, 3.0, uCold), 28.0, uSunHard);
  float dl = max(dot(n, SUND), 0.0);
  float sh = (uSunSh > 0.0 && (dl > 0.0 || trans > 0.0)) ? mix(1.0, shShadowN(p + n * 0.03, SUND, 40.0, k, 12), uSunSh) : 1.0;
  vec3 c = alb * SUNC * dl * sh;
  c += alb * SUNC * trans * max(dot(rd, SUND), 0.0) * sh;       // light through leaves
  float cov = 1.0 - uCanopy * 0.8 * smoothstep(8.0, 2.0, p.y);
  c += alb * AMB * (0.55 + 0.45 * n.y) * occ * cov;
  c += alb * AMB * vec3(0.55, 0.62, 0.45) * 0.25 * (0.5 - 0.5 * n.y) * occ * cov;
  c += spec * AMB * pow(1.0 - max(dot(n, -rd), 0.0), 4.0) * 0.6 * occ;
  if (uGodK > 0.0) {
    vec3 L = uGodP - p; float dd = length(L); L /= dd;
    float att = 1.0 / (1.0 + dd * dd / (uGodR * uGodR));
    float gl = max(dot(n, L), 0.0);
    float gt = trans * max(dot(rd, L), 0.0);
    if ((gl + gt) * att > 0.002) {
      float gs = shShadowN(p + n * 0.03, L, dd - 0.6, 10.0, 10);
      c += alb * GODC * (gl + gt) * att * gs;
      c += spec * GODC * pow(max(dot(reflect(rd, n), L), 0.0), 24.0) * att * gs * 0.4;
    }
  }
  return c;
}

// bark: deep vertical furrows, lichen, moss on the shaded side
vec3 barkAlb(vec3 p, out float bump) {
  float a = atan(p.z, p.x);
  vec2 bp = vec2(a * 2.2 + 0.4 * fbm(p.xz * 3.0 + p.y * 0.2, 2), p.y * 0.55);
  float f = fbm(bp * vec2(5.0, 1.0) + vec2(0.0, fbm(bp * 4.0, 2)), 4);
  bump = f;
  vec3 c = mix(vec3(0.05, 0.045, 0.04), vec3(0.17, 0.15, 0.13), smoothstep(0.3, 0.75, f));
  float lich = smoothstep(0.62, 0.8, fbm(p.xz * 2.4 + p.y * 1.7 + 4.0, 3));
  c = mix(c, vec3(0.28, 0.3, 0.26), lich * 0.5);
  float moss = smoothstep(0.3, 0.9, fbm(p * 1.4 + 9.0, 3)) * smoothstep(1.8, 0.0, p.y) ;
  c = mix(c, vec3(0.07, 0.1, 0.035), moss * 0.7);
  return c;
}
vec3 crownAlb(vec3 p, out float holes) {
  float l = fbm(p * 2.7, 3);
  holes = l;
  vec3 c = mix(vec3(0.025, 0.05, 0.02), vec3(0.09, 0.15, 0.05), smoothstep(0.3, 0.75, l));
  c = mix(c, vec3(0.08, 0.1, 0.07), uCold * 0.45);  // the cold takes the green out
  return c;
}
vec3 grassAlb(vec3 p) {
  float n = fbm(p.xz * 0.35, 4);
  vec3 c = mix(vec3(0.07, 0.11, 0.035), vec3(0.17, 0.2, 0.07), n);
  // tufts and their dark hearts, and fine blades
  float tuft = fbm(p.xz * 3.1, 3);
  c *= 0.65 + 0.6 * smoothstep(0.25, 0.75, tuft);
  c *= 0.85 + 0.3 * vnoise(p.xz * vec2(38.0, 41.0));
  c = mix(c, vec3(0.22, 0.2, 0.12), smoothstep(0.7, 0.85, vnoise(p.xz * 9.0 + 3.0)) * 0.35);
  c = mix(c, vec3(0.2, 0.18, 0.1), smoothstep(0.55, 0.8, fbm(p.xz * 0.12 + 5.0, 3)) * 0.5);
  // the wind's long stripes in the grass (sheen)
  float stripes = 0.5 + 0.5 * sin(p.x * 0.35 + p.z * 0.22 - uWT * 1.4 + 2.0 * fbm(p.xz * 0.08, 2));
  c *= 1.0 + 0.35 * uWind * stripes;
  c = mix(c, vec3(0.1, 0.12, 0.1), uCold * 0.35);
  return c;
}

vec3 shSurface(vec3 p, vec3 rd, float mat, float t) {
  vec3 n = shNormal(p, 0.0015 * t + 0.002);
  float occ = shAO(p, n);
  vec3 alb; float trans = 0.0, spec = 0.0;
  if (mat < 1.5) {
    alb = grassAlb(p);
    // fine grass normal noise
    vec2 e = vec2(0.02, 0.0);
    float g0 = vnoise(p.xz * 18.0);
    n = normalize(n + 0.25 * vec3(g0 - vnoise(p.xz * 18.0 + e.xy * 18.0), 0.0, g0 - vnoise(p.xz * 18.0 + e.yx * 18.0)));
    trans = 0.15; spec = 0.4;
  } else if (mat < 2.5) {
    float b; alb = barkAlb(p, b);
    // bump the normal with the furrows
    vec3 tng = normalize(cross(n, vec3(0.0, 1.0, 0.0)) + 1e-4);
    float b2; barkAlb(p + tng * 0.02, b2);
    n = normalize(n - tng * (b2 - b) * 6.0);
    occ *= 0.5 + 0.5 * smoothstep(0.25, 0.7, b);
    spec = 0.15;
  } else if (mat < 3.5 || mat > 4.5) {
    float h; alb = crownAlb(p, h);
    if (mat > 4.5) alb *= vec3(0.8, 1.0, 0.75);
    float o2 = 0.0;
    { float hh = 0.3; o2 = 2.0 * (hh - shMapD(p + n * hh)) / hh; }
    occ *= sat(1.0 - o2 * 0.3);
    n = normalize(n + 0.7 * (vec3(vnoise(p * 6.0), vnoise(p * 6.0 + 3.0), vnoise(p * 6.0 + 7.0)) - 0.5));
    occ *= 0.35 + 0.65 * smoothstep(0.25, 0.75, h);
    trans = 0.5; spec = 0.5;
  } else {
#ifdef SH_HUMAN
    // a person: dark, only the light behind wrapping the edges of the body and through the hair.
    // The normal is taken over a voxel or more, so the volume's trilinear facets never show as bands.
    n = shNormal(p, max(0.0015 * t + 0.002, HUM_NEPS));
    float hm = 0.0, fa = 1e3, fb = 1e3;
    if (uFigOn.x > 0.5) fa = figDist(p, uFigA, uPoseA, 0.0);
    if (uFigOn.y > 0.5) fb = figDist(p, uFigB, uPoseB, 1.0);
    {
      vec3 F = fa < fb ? uFigA : uFigB; vec3 ps = fa < fb ? uPoseA : uPoseB;
      vec3 q = p - vec3(F.x, gH(F.xz) - 0.02, F.y); q.xz = rot(F.z) * q.xz;
#ifdef SH_HUM_A
      if (fa < fb) uHumAFig(q, ps, hm);
#endif
#ifdef SH_HUM_B
      if (fb <= fa) uHumBFig(q, ps, hm);
#endif
    }
    // the sun's reach is judged from a little way toward it, so the body never shades its own rim
    vec3 hc = humShade(n, rd, hm, SUND, SUNC * (uSunSh > 0.0 ? mix(1.0, shShadowN(p + SUND * 0.7, SUND, 40.0, 12.0, 10), uSunSh) : 1.0), AMB * occ, HUM_RIM);
    if (uGodK > 0.0) {
      vec3 L = uGodP - p; float dd = length(L); L /= dd;
      float att = 1.0 / (1.0 + dd * dd / (uGodR * uGodR));
      hc += humShade(n, rd, hm, L, GODC * att * shShadowN(p + L * 0.7, L, dd - 1.2, 10.0, 10), vec3(0.0), HUM_RIM * 1.6);
    }
    return hc;
#else
    // a person is only a dark shape: no modelling, just the faintest sky fill so it sits in the air
    return AMB * 0.006 + SUNC * 0.002;
#endif
  }
  return shLight(p, n, rd, alb, occ, trans, spec);
}

// ---------------- the searching light: in-scattering with shafts ----------------
float shVis(vec3 p, vec3 L, float dd) {
  float t = 0.1, res = 1.0;
  t += 0.3 * hash12(gl_FragCoord.yx + uJitter * 37.0);
  for (int i = 0; i < 11; i++) {
    float h = shMapLite(p + L * t);
    res = min(res, 6.0 * h / t);
    t += clamp(h, 0.3, 4.0);
    if (res < 0.02 || t > dd) break;
  }
  return sat(res);
}
vec3 godAir(vec3 ro, vec3 rd, float tmax, float shafts) {
  if (uGodK <= 0.0 || uGodScat <= 0.0) return vec3(0.0);
  vec3 L = uGodP - ro;
  float tc = dot(L, rd);
  float h = sqrt(max(dot(L, L) - tc * tc, 1e-4));
  float ta = atan(-tc / h), tb = atan((tmax - tc) / h);
  float I = (tb - ta) / h;                       // the integral of 1/r^2 along the ray
  vec3 air = GODC * I * uGodScat * uGodR * uGodR * 0.02;
  if (shafts > 0.0) {
    // equi-angular samples (pdf matches the falloff), re-seeded per sub-frame: the shafts converge
    float v = 0.0;
    for (int k = 0; k < SH_SHAFT_N; k++) {
      float xi = (float(k) + hash12(gl_FragCoord.xy * 0.73 + uJitter * 97.0 + float(k) * 17.1)) / float(SH_SHAFT_N);
      float ts = tc + h * tan(mix(ta, tb, xi));
      vec3 sp = ro + rd * ts;
      vec3 Ld = uGodP - sp; float dd = length(Ld);
      v += shVis(sp, Ld / dd, dd - uGodR * 0.3);
    }
    air *= mix(1.0, v / float(SH_SHAFT_N), shafts);
  }
  return air;
}
vec3 godGlow(vec3 ro, vec3 rd, float tmax) {
  // the bright core of the light itself, seen directly
  vec3 L = uGodP - ro; float tc = dot(L, rd);
  if (tc <= 0.0 || tc > tmax + uGodR) return vec3(0.0);
  float h = length(L - rd * tc);
  return GODC * exp(-h * h / (uGodR * uGodR * 0.08)) * 0.25;
}

// ---------------- fig leaves near the lens ----------------
// A leaf is a curved card z = curl·x² + droop·y² in its own frame; its outline is a fig leaf.
float sdEl2(vec2 p, vec2 c, float ang, vec2 r) { p -= c; p = rot(ang) * p; return (length(p / r) - 1.0) * min(r.x, r.y); }
// the outline: a palm with five rounded lobes and deep round sinuses (signed, > 0 inside)
float figOutline(vec2 uv) {
  vec2 b = vec2(0.0, 0.28);
  float d = sdEl2(uv, vec2(0.0, 0.34), 0.0, vec2(0.2, 0.2));
  d = smin(d, sdEl2(uv, vec2(0.0, 0.7), 0.0, vec2(0.17, 0.3)), 0.06);
  for (int s = -1; s <= 1; s += 2) {
    float fs = float(s);
    vec2 dir1 = vec2(sin(1.05 * fs), cos(1.05)), dir2 = vec2(sin(2.05 * fs), cos(2.05));
    d = smin(d, sdEl2(uv, b + dir1 * 0.36, -1.05 * fs, vec2(0.14, 0.24)), 0.06);
    d = smin(d, sdEl2(uv, b + dir2 * 0.23, -2.05 * fs, vec2(0.09, 0.15)), 0.05);
  }
  d += 0.005 * sin(atan(uv.x, uv.y - 0.3) * 40.0) * smoothstep(0.0, 0.2, uv.y);
  float stem = max(abs(uv.x) - 0.012, max(-uv.y - 0.05, uv.y - 0.12));
  return -min(d, stem);
}
float figVeins(vec2 uv) {
  vec2 b = vec2(0.0, 0.28);
  float v = exp(-abs(uv.x) * 300.0) * step(0.0, uv.y);
  for (int s = -1; s <= 1; s += 2) {
    float fs = float(s);
    vec2 dir1 = vec2(sin(1.05 * fs), cos(1.05)), dir2 = vec2(sin(2.05 * fs), cos(2.05));
    vec2 q = uv - b;
    v = max(v, exp(-abs(dot(q, vec2(dir1.y, -dir1.x))) * 300.0) * step(0.0, dot(q, dir1)) * 0.8);
    v = max(v, exp(-abs(dot(q, vec2(dir2.y, -dir2.x))) * 300.0) * step(0.0, dot(q, dir2)) * 0.6);
  }
  // secondary veins run off each main vein toward the margin, and a fine net between them
  float sec = 0.0;
  for (int s = -1; s <= 1; s++) {
    float a0 = float(s) * 1.05;
    vec2 dir = vec2(sin(a0), cos(a0)), q = uv - b;
    float along = dot(q, dir), across = dot(q, vec2(dir.y, -dir.x));
    float ph = along * 9.0 - abs(across) * 7.0;
    sec = max(sec, exp(-abs(fract(ph) - 0.5) * 30.0) * step(0.05, along) * smoothstep(0.35, 0.05, abs(across)));
  }
  vec2 ve = voronoiEdge(uv * 34.0);
  return max(max(v, 0.45 * sec), 0.16 * smoothstep(0.06, 0.0, ve.x));
}
float figShape(vec2 uv, out float vein) { vein = figVeins(uv); return figOutline(uv); }
// intersect the card; returns t (or -1) and the leaf's uv and normal (world)
float leafHit(vec3 ro, vec3 rd, vec3 c, vec3 ax, vec3 ay, float size, float curl, float droop, out vec2 uv, out vec3 nw) {
  vec3 az = cross(ax, ay);
  vec3 o = ro - c; o = vec3(dot(o, ax), dot(o, ay), dot(o, az)) / size;
  vec3 d = vec3(dot(rd, ax), dot(rd, ay), dot(rd, az));
  float y0 = 0.3;
  float A = curl * d.x * d.x + droop * d.y * d.y;
  float B = 2.0 * curl * o.x * d.x + 2.0 * droop * (o.y - y0) * d.y - d.z;
  float C = curl * o.x * o.x + droop * (o.y - y0) * (o.y - y0) - o.z;
  float t0 = -1.0, t1 = -1.0;
  if (abs(A) < 1e-5) { t0 = -C / B; }
  else {
    float disc = B * B - 4.0 * A * C;
    if (disc < 0.0) return -1.0;
    float s = sqrt(disc);
    t0 = (-B - s) / (2.0 * A); t1 = (-B + s) / (2.0 * A);
    if (t0 > t1) { float tmp = t0; t0 = t1; t1 = tmp; }
  }
  for (int k = 0; k < 2; k++) {
    float tt = k == 0 ? t0 : t1;
    if (tt <= 0.0) continue;
    vec3 h = o + d * tt;
    if (figOutline(h.xy) > 0.0) {
      uv = h.xy;
      vec3 nl = normalize(vec3(-2.0 * curl * h.x, -2.0 * droop * (h.y - y0), 1.0));
      nw = normalize(nl.x * ax + nl.y * ay + nl.z * az);
      return tt * size;
    }
  }
  return -1.0;
}
mat3 leafFrame(float i, float seed) {
  vec3 h = hash33(vec3(i, seed, 3.7));
  // leaves hang roughly facing the camera, tips down and outward, each trembling on its stem
  float tw = (h.x - 0.5) * 1.6 + sin(uTime * (1.3 + h.y) + i * 2.1) * 0.05 * (0.3 + uWind) + sin(uWT * 2.3 + i) * 0.06 * uWind;
  float tilt = 0.25 + (h.y - 0.5) * 0.9 + sin(uTime * 0.9 + i * 1.7) * 0.025;
  float yaw = (h.z - 0.5) * 1.2;
  vec3 ay = normalize(vec3(sin(tw), -cos(tw), 0.0));
  vec3 ax = normalize(cross(ay, vec3(0.0, 0.0, 1.0)));
  // tilt about the leaf's own x and yaw about vertical
  vec3 az = cross(ax, ay);
  ay = normalize(ay * cos(tilt) + az * sin(tilt));
  az = cross(ax, ay);
  mat2 ry = rot(yaw);
  ax.xz = ry * ax.xz; ay.xz = ry * ay.xz;
  return mat3(ax, ay, cross(ax, ay));
}
float capIntersect(vec3 ro, vec3 rd, vec3 pa, vec3 pb, float r) {
  vec3 ba = pb - pa, oa = ro - pa;
  float baba = dot(ba, ba), bard = dot(ba, rd), baoa = dot(ba, oa), rdoa = dot(rd, oa), oaoa = dot(oa, oa);
  float a = baba - bard * bard, b = baba * rdoa - baoa * bard, c = baba * oaoa - baoa * baoa - r * r * baba;
  float h = b * b - a * c;
  if (h >= 0.0) {
    float t = (-b - sqrt(h)) / a;
    float y = baoa + t * bard;
    if (y > 0.0 && y < baba) return t;
    vec3 oc = (y <= 0.0) ? oa : ro - pb;
    b = dot(rd, oc); c = dot(oc, oc) - r * r; h = b * b - c;
    if (h > 0.0) return -b - sqrt(h);
  }
  return -1.0;
}
// uLeafN leaves on hanging twigs (six to a twig), the twigs scattered in the box uLeafC ± uLeafS / 2
vec3 leafAnchor(float k, out vec3 tw, out float L) {
  vec3 h = hash33(vec3(k * 1.7, uLeafSeed, 9.1));
  vec3 c = uLeafC + (h - 0.5) * uLeafS;
  // a gap in the middle (uLeafPart = its radius as a fraction of the box): twigs inside are pushed out
  vec2 rel = (c.xy - uLeafC.xy) / (uLeafS.xy * 0.5);
  float rl = length(rel);
#ifdef SH_PART_SMOOTH
  // a gap that opens while we watch: the push must be continuous in uLeafPart, or a twig sitting just
  // outside the gap jumps half-way to the box's edge the instant the gap reaches it (a leaf vanishes
  // and the light behind it pops in). Twigs within B are spread evenly over [uLeafPart, B].
  float pB = mix(uLeafPart, 1.0, 0.5);
  if (uLeafPart > 0.0 && rl < pB) c.xy = uLeafC.xy + rel / max(rl, 1e-3) * mix(uLeafPart, pB, rl / pB) * uLeafS.xy * 0.5;
#else
  if (rl < uLeafPart) c.xy = uLeafC.xy + rel / max(rl, 1e-3) * mix(uLeafPart, 1.0, rl / max(uLeafPart, 1e-3) * 0.5) * uLeafS.xy * 0.5;
#endif
  // the twig sways from where it is held
  c += vec3(sin(uTime * 0.9 + k * 2.0), sin(uTime * 0.7 + k * 1.3) * 0.5, 0.0) * 0.006 + vec3(sin(uWT * 1.6 + k * 0.9), 0.0, cos(uWT * 1.2 + k)) * 0.025 * uWind;
  vec3 h2 = hash33(vec3(k, uLeafSeed + 3.0, 1.3));
  tw = normalize(vec3((h2.x - 0.5) * 1.6 + sign(c.x - uLeafC.x) * 0.5, -0.55 - 0.4 * h2.y, (h2.z - 0.5) * 0.7));
  L = uLeafSize * (2.6 + 1.2 * h2.z);
  return c;
}
float shLeaves(vec3 ro, vec3 rd, float tmax, out vec3 col) {
  float best = tmax; col = vec3(0.0);
  vec2 buv; vec3 bn; float bi = -1.0;
  float twigT = -1.0;
  for (int i = 0; i < 48; i++) {
    if (float(i) >= uLeafN) break;
    float fi = float(i);
    float k = floor(fi / 6.0), j = fi - k * 6.0;
    vec3 tw; float L;
    vec3 an = leafAnchor(k, tw, L);
    if (j < 0.5) {
      // the twig itself, from beyond the anchor to its end
      float tt = capIntersect(ro, rd, an - tw * L * 0.1, an + tw * L * 0.85, uLeafSize * 0.018);
      if (uLeafTwig > 0.5 && tt > 0.0 && tt < best) { best = tt; twigT = tt; bi = -2.0; }
    }
    float s = (j + 0.5) / 6.0;
    vec3 side = normalize(cross(tw, vec3(0.0, 0.0, 1.0)));
    vec3 c = an + tw * s * L + side * (mod(j, 2.0) < 0.5 ? 1.0 : -1.0) * uLeafSize * 0.12;
    c += vec3(sin(uTime * 1.3 + fi), sin(uTime * 1.1 + fi * 2.3), 0.0) * 0.003;
    mat3 F = leafFrame(fi, uLeafSeed);
    float size = uLeafSize * (0.75 + 0.5 * hash11(fi * 3.3 + uLeafSeed)) * (1.2 - 0.35 * s);
    vec3 h = hash33(vec3(fi * 1.7, uLeafSeed, 9.1));
    vec3 oc = c + F[1] * size * 0.42 - ro; float tca = dot(oc, rd);
    if (tca < 0.0 || dot(oc, oc) - tca * tca > size * size * 0.45 || tca - size > best) continue;
    vec2 uv; vec3 nw;
    float t = leafHit(ro, rd, c, F[0], F[1], size, uLeafCurl * (0.6 + 0.8 * h.y), 0.25 + 0.3 * h.z, uv, nw);
    if (t > 0.0 && t < best) { best = t; buv = uv; bn = nw; bi = fi; }
  }
  if (bi == -2.0) { col = vec3(0.03, 0.025, 0.02) * (AMB * 0.6 + GODC * 0.02); return best; }
  if (bi < 0.0) return -1.0;
  float vein; figShape(buv, vein);
  float fr = dot(bn, rd) < 0.0 ? 1.0 : -1.0;      // which face we see
  vec3 n = bn * fr;
  float g = fbm(buv * 9.0 + bi, 3);
  vec3 alb = mix(vec3(0.035, 0.07, 0.02), vec3(0.09, 0.15, 0.04), g);
  alb = mix(alb, vec3(0.07, 0.09, 0.06), uCold * 0.4);
  alb *= 1.0 - uLeafDark;
  // front: overcast sky and the warm light; back: light coming through the leaf, veins showing
  vec3 c = alb * AMB * (0.6 + 0.4 * n.y) * 0.9;
  c += alb * SUNC * max(dot(n, SUND), 0.0) * 0.8;
  vec3 tr = mix(vec3(0.25, 0.42, 0.08), vec3(0.18, 0.3, 0.12), uCold) * (1.0 - 0.6 * vein) * (0.7 + 0.5 * g);
  float back = max(dot(-n, SUND), 0.0);
  c += tr * SUNC * back * 0.35 + tr * AMB * 0.12 * (1.0 - uLeafDark);
  if (uGodK > 0.0) {
    vec3 p = ro + rd * best;
    vec3 L = uGodP - p; float dd = length(L); L /= dd;
    float att = 1.0 / (1.0 + dd * dd / (uGodR * uGodR));
    c += alb * GODC * max(dot(n, L), 0.0) * att;
    c += tr * GODC * max(dot(-n, L), 0.0) * att * 0.9;
  }
  // the waxy sheen of the upper face
  c += AMB * 0.08 * pow(1.0 - abs(dot(n, rd)), 3.0) * (fr > 0.0 ? 1.0 : 0.3);
  col = c;
  return best;
}

// ---------------- grass, blade by blade, near the camera ----------------
// The ray is marched through the slab of grass above the ground (taken as flat, through the ground
// under the ray's end); each step asks whether a blade stands there. Blades are thin, taper to their
// tips and bend with the wind. Far away the stepping is coarse; the sub-frames average it out.
float bladeAt(vec3 p, float g, float scale, float seed, out float hh) {
  float h = (p.y - g) / uGrassH;
  hh = h;
  if (h < 0.0 || h > 1.0) return 0.0;
  vec2 wd = vec2(sin(uWT * 1.3 + p.x * 0.4 + p.z * 0.25), cos(uWT * 0.9 + p.z * 0.3)) * (0.25 + uWind);
  vec2 q = (p.xz + wd * h * h * uGrassH * 0.35) / scale + seed;
  vec2 id = floor(q), fr = fract(q) - 0.5;
  vec3 hs = hash33(vec3(id, seed));
  float top = 0.35 + 0.65 * hs.z;
  if (h > top) return 0.0;
  vec2 c = (hs.xy - 0.5) * 0.6;
  // a lean of its own, growing toward the tip
  c += (hash22(id + 7.0) - 0.5) * h * h * 0.9;
  vec2 dd = fr - c;
  dd = rot(hs.x * 6.28) * dd;
  dd.y *= 3.5;                                   // blades are flat ribbons
  float r = 0.22 * (1.0 - h / top) + 0.02;
  return step(length(dd), r);
}
float shGrass(vec3 ro, vec3 rd, float tEnd, out vec3 col) {
  col = vec3(0.0);
  if (uGrassH <= 0.0 || rd.y > 0.15) return -1.0;
  float tg = min(tEnd, uGrassFar);
  vec3 pe = ro + rd * tg;
  float g = gH(pe.xz);
  if (ro.y - g > uGrassH && rd.y >= 0.0) return -1.0;
  float tTop = rd.y < 0.0 ? (g + uGrassH - ro.y) / rd.y : 0.0;
  float t = max(tTop, 0.02);
  if (t > tg) return -1.0;
  float jit = hash12(gl_FragCoord.xy + uJitter * 113.0);
  t += (0.004 + 0.006 * t) * jit;
  for (int i = 0; i < 32; i++) {
    if (t > tg) break;
    vec3 p = ro + rd * t;
    float h1, h2;
    float b = bladeAt(p, g, 0.045, 0.0, h1);
    if (b < 0.5 && t < 5.0) b = bladeAt(p, g, 0.07, 3.1, h2);
    if (b > 0.5) {
      float h = clamp(h1, 0.0, 1.0);
      vec3 alb = mix(vec3(0.025, 0.04, 0.012), vec3(0.15, 0.19, 0.06), h);
      alb = mix(alb, vec3(0.12, 0.13, 0.09), uCold * 0.35);
      float hv = hash12(floor(p.xz / 0.045));
      alb *= 0.7 + 0.6 * hv;
      alb = mix(alb, vec3(0.2, 0.18, 0.09), step(0.93, hv) * 0.6);   // a dry blade here and there
      float sh = uSunSh > 0.0 ? mix(1.0, shShadowN(p + vec3(0.0, 0.05, 0.0), SUND, 40.0, mix(mix(18.0, 3.0, uCold), 28.0, uSunHard), 8), uSunSh) : 1.0;
      float cov = 1.0 - uCanopy * 0.8;
      vec3 c = alb * AMB * (0.25 + 0.75 * h) * cov;
      c += alb * SUNC * sh * (0.6 * max(SUND.y, 0.0) + 0.12 + 0.45 * pow(max(dot(rd, SUND), 0.0), 4.0) * h * h);   // lit through when backlit
      if (uGodK > 0.0) {
        vec3 L = uGodP - p; float dl = length(L); L /= dl;
        float att = 1.0 / (1.0 + dl * dl / (uGodR * uGodR));
        c += alb * GODC * att * (0.3 + 1.4 * pow(max(dot(rd, L), 0.0), 3.0) * h);
      }
      col = c;
      return t;
    }
    t += 0.008 + 0.018 * t;
  }
  return -1.0;
}

// ---------------- lens and the whole picture ----------------
vec3 shLens(vec2 fc, out vec3 ro) {
  vec3 rd = camRay(fc, ro);
  if (uAperS <= 0.0) return rd;
  vec3 ww = normalize(uCamTarget - uCamPos);
  vec3 up = vec3(sin(uCamRoll), cos(uCamRoll), 0.0);
  vec3 uu = normalize(cross(ww, up)), vv = cross(uu, ww);
  vec3 fp = ro + rd * (uFocusS / dot(rd, ww));
  vec2 j = vec2(hash12(uJitter * 917.0 + 3.1), hash12(uJitter * 613.0 + 7.7));
  float r = sqrt(j.x), th = 6.2831853 * j.y;
  ro += (uu * cos(th) + vv * sin(th)) * r * uAperS;
  return normalize(fp - ro);
}

vec3 shameRender(vec3 ro, vec3 rd, float far, float shafts) {
  shSetup();
  float tl = -1.0; vec3 lc = vec3(0.0);
#ifdef SH_LEAVES
  tl = shLeaves(ro, rd, far, lc);
#endif
  float mat;
  float t = shMarch(ro, rd, tl > 0.0 ? tl : far, mat);
  vec3 gc;
  float tgr = shGrass(ro, rd, t > 0.0 ? t : (tl > 0.0 ? tl : uGrassFar), gc);
  vec3 c; float tt;
  if (tgr > 0.0) { c = gc; tt = tgr; }
  else if (t > 0.0) { c = shSurface(ro + rd * t, rd, mat, t); tt = t; }
  else if (tl > 0.0) { c = lc; tt = tl; }
  else { c = mix(shSky(rd), shFogCol(rd) * (1.0 - uCanopy * 0.7), smoothstep(0.06, -0.01, rd.y)); tt = rd.y < 0.06 ? far : 1e4; }
  float fogT = min(tt, 600.0);
  // uniform haze plus a mist that lies on the ground and thins upward (integrated along the ray)
  float hk = 0.45;
  float ky = hk * rd.y;
  float mist = uMist * exp(-hk * max(ro.y, 0.0)) * (abs(ky * fogT) < 1e-3 ? fogT : (1.0 - exp(-ky * fogT)) / ky);
  float fa = 1.0 - exp(-fogT * uFog - max(mist, 0.0));
  vec3 fc = shFogCol(rd) * (1.0 - uCanopy * 0.7);
  c = mix(c, fc, fa);
  c += godAir(ro, rd, min(tt, 400.0), shafts);
  c += godGlow(ro, rd, tt);
  return c * uExpo;
}
`;

// ---------------- JS side ----------------
export const prog = (P, t, e = ease.inOut3) => e(clamp((t - P.from) / (P.to - P.from), 0, 1));
// copy a plain object of values into the shader uniforms (3-arrays to vectors)
export function setU(u, o) {
  for (const [k, v] of Object.entries(o)) {
    if (!u[k]) continue;
    if (Array.isArray(v)) u[k].value.set(...v); else u[k].value = v;
  }
}
// the shot boilerplate every scene of this world shares
export function shameShot(P, o) {
  const cam = (t) => { const c = o.cam(t); const d = drift(t, o.drift ?? 0.01); return { ...c, pos: c.pos.map((v, i) => v + (d[i] ?? 0)) }; };
  return {
    name: o.name, from: P.from, to: P.to,
    frag: (o.defines ?? '') + (o.glsl ?? SHAME_GLSL) + (o.extra ?? '') + /* glsl */ `
vec3 shade(vec2 fc) { vec3 ro; vec3 rd = shLens(fc, ro); ${o.body ?? `return shameRender(ro, rd, ${(o.far ?? 300).toFixed(1)}, ${(o.shafts ?? 0).toFixed(2)});`} }`,
    uniforms: { ...SHAME_UNIFORMS, ...(o.uniforms ?? {}) },
    camera: cam,
    textPlane(t, c) { return cameraPlane(c, { width: 1, dist: 1, aspect: 16 / 9 }); },
    update(t, u) { const c = cam(t); if (c.focus) u.uFocusS.value = c.focus; if (c.aperture !== undefined) u.uAperS.value = c.aperture; o.update?.(t, u, c); },
    post(t) { return grade(t, { exposure: 1.0, bloom: 0.1, threshold: 1.0, saturation: 0.92, contrast: 1.06, vignette: 0.5, lift: [0.008, 0.011, 0.016], gain: [0.97, 1.0, 1.03], ...(o.post?.(t) ?? {}) }); },
    finish(t) { return { grade: { shadows: [0.0, 0.012, 0.035], highlights: [0.96, 0.98, 1.0], amount: 0.45 }, ...(o.finish?.(t) ?? {}) }; },
  };
}
