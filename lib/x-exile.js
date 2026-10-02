// The exile's world: night outside the garden of Delight.
// The garden is walled by a long ridge of weathered rock running east-west along z = 0; the east
// gate is a gap in it at x = 0, framed by two giant trees whose crowns lean over the opening. Inside
// (z > 0) the garden glows: a warm, self-luminous mist lies among dark trees, and far up the path, on
// a rise, the tree of life burns white-gold (TL). Outside (z < 0) is a barren plain of cracked dust
// that falls away into a broad valley and rises again far off. The only lights out here are the
// garden's glow (through the gate as a soft fan of light, and over the wall onto the clouds), the
// starlight, a small campfire on the far slope, and, once they are stationed, the cherubim (towering
// layered wings of flame with eyes on the wings) and the turning sword: a wheel of fire before the gate.
// Every value is a pure function of uTime and the uniforms the scene sets from song time.

import { TREE_GLSL, TREE_UNIFORMS } from '/song/lib/x-mercy-tree.js';

// the tree of life is the mercy builder's tree (lib/x-mercy-tree.js), so it matches across the film;
// its own light uniform is mapped onto uLife, and its names are kept apart from ours
const { uGlow: _tg, uReeds: _r1, uReedZ: _r2, uReflCrown: _r3, ...TREE_U } = TREE_UNIFORMS;
const LIFE_TREE_GLSL = TREE_GLSL.replace(/uniform float uGlow, uReach;/, 'uniform float uReach, uLife;').replace(/\buGlow\b/g, 'uLife').replace(/\bLIFEC\b/g, 'LIFEC_T');

export const EXILE_UNIFORMS = {
  ...TREE_U,
  uGlow: 1.0,            // the garden's light
  uLife: 1.0,            // the tree of life's light
  uSword: 0.0,           // the wheel of fire (0 none .. 1 full)
  uSwordAng: 0.0,        // its turn (radians)
  uSwordC: [0, 4.4, -10.5],
  uCherub: 0.0,          // the cherubim present (0..1)
  uUnfold: 1.0,          // their wings unfolded (0 folded .. 1 spread)
  uCamp: 0.0,            // the campfire
  uCampC: [-14, 0, -330],
  uWalker: 0.0,          // a walking silhouette
  uWalkP: [0, 0, -30],
  uWalkD: [0, 0, -1],
  uWalkPh: 0.0,
  uSitter: 0.0,          // a figure seated by the fire
  uStar: 0.0,            // the star of promise (brightness)
  uStarY: -40.0,         // its height (world, 3000 m away)
  uFocus: 20.0, uAper: 0.0,
  uExpo: 1.0,
  uDim: 1.0,             // the world (everything but the star of promise)
};

export const EXILE_GLSL = LIFE_TREE_GLSL + /* glsl */ `
uniform float uDim, uGlow, uSword, uSwordAng, uCherub, uUnfold, uCamp, uWalker, uWalkPh, uSitter, uStar, uStarY, uFocus, uAper, uExpo;
uniform vec3 uSwordC, uCampC, uWalkP, uWalkD;

float gWalkY = 0.0, gCampY = 0.0;
const vec3 TL = vec3(0.0, 0.0, 300.0);          // the tree of life (ground point)
const float SWR = 3.3;                         // the wheel's radius
const vec3 GLOWC = vec3(1.0, 0.66, 0.34);       // the garden's light
const vec3 LIFEC = vec3(1.0, 0.84, 0.55);        // the tree of life
const float CHX = 7.2, CHZ = -6.0;              // the cherubim stand at x = +-CHX, z = CHZ

vec3 fireCol(float x) {
  x = max(x, 0.0);
  return vec3(1.0, 0.26, 0.04) * x + vec3(1.0, 0.52, 0.12) * x * x * 0.55 + vec3(0.9, 0.85, 0.75) * x * x * x * x * 0.06;
}

// ---------------- the land ----------------
float pathX(float z) { return 2.6 * sin(z * 0.023 + 0.4) * smoothstep(8.0, 60.0, z) * (1.0 - smoothstep(230.0, 285.0, z)); }
float pathMask(vec2 p) {
  if (p.y < -70.0 || p.y > 290.0) return 0.0;
  float w = 1.5 + 0.3 * smoothstep(0.0, -40.0, p.y);
  return smoothstep(w, w * 0.4, abs(p.x - pathX(p.y)) + 0.5 * (vnoise(p * 0.8) - 0.5));
}
float innH(vec2 p) {
  vec2 d = p - TL.xz;
  return 1.2 + 9.0 * exp(-dot(d, d) / 4900.0) + 34.0 * smoothstep(520.0, 1100.0, p.y) * (0.55 + 0.7 * vnoise(vec2(p.x * 0.004, 1.3)));
}
float outH(vec2 p) {
  return -13.0 * smoothstep(-25.0, -160.0, p.y) + 22.0 * smoothstep(-200.0, -380.0, p.y) + 2.5 * (vnoise(p * 0.025 + 3.0) - 0.5) * smoothstep(-40.0, -120.0, p.y);
}
float terrH(vec2 p) {
  float k = smoothstep(-4.0, 9.0, p.y);
  float h = mix(outH(p), innH(p), k);
  if (p.y < -10.0) h += 3.0 * (fbm(p * 0.012, 3) - 0.5) * smoothstep(-10.0, -60.0, p.y);
  if (k > 0.0) h += 1.4 * (vnoise(p * 0.016 + 7.0) - 0.5) * k;
  h += 0.32 * vnoise(p * 0.33);
  float cd = length(p - uCamPos.xz);
  if (cd < 70.0) h += (0.07 * vnoise(p * 1.7) - 0.12 * pathMask(p)) * smoothstep(70.0, 50.0, cd);
  return h;
}
// cheap ground estimate for the air
float terrApprox(vec2 p) { return mix(outH(p), innH(p), smoothstep(-4.0, 9.0, p.y)); }

// the garden wall: a long ridge of weathered rock with steep flanks, broken by the gorge of the gate
float ridgeTop(float x) {
  float ax = abs(x);
  return 12.0 + 22.0 * fbm(vec2(x * 0.011, 3.7), 4) + 8.0 * pow(vnoise(vec2(x * 0.035, 1.1)), 3.0) + 14.0 * smoothstep(8.0, 70.0, ax) - 10.0 * smoothstep(220.0, 800.0, ax);
}
float ridgeZ(float x) { return 4.0 * sin(x * 0.009 + 1.0) * smoothstep(12.0, 60.0, abs(x)); }
float ridgeSD(vec3 p) {
  float zc = ridgeZ(p.x);
  float dz = abs(p.z - zc);
  float b = max(dz - 40.0, p.y - 62.0);
  if (b > 3.0) return b;
  float top = ridgeTop(p.x);
  float prof = top - 1.5 * dz - 0.015 * dz * dz;
  float d = (p.y - prof) * 0.5;
  // the gorge of the gate: walls that are nearly sheer, a little wider at the top
  float gw = 4.8 + 1.0 * vnoise(vec2(p.y * 0.2, p.z * 0.22 + 3.0)) + 0.13 * max(p.y - 6.0, 0.0);
  d = max(d, (gw - abs(p.x)) * 0.9);
  // the forecourt before the gate: the cliffs stand back in a half circle where the cherubim stand
  float court = 15.5 + 1.5 * vnoise(vec2(atan(p.x, p.z + 15.0) * 3.0, p.y * 0.15)) + 0.12 * max(p.y - 4.0, 0.0);
  d = smax(d, (court - length(vec2(p.x, (p.z + 15.0) * 1.1))) * 0.8, 2.0);
  // the rock: big fractured masses, then smaller breaks
  if (d > 8.0) return (d - 2.6) * 0.6;
  d += 3.0 * (fbm(p * vec3(0.06, 0.09, 0.06), 3) - 0.5);
  if (d < 2.5) {
    float r = 1.0 - abs(vnoise(p * 0.22) * 2.0 - 1.0);
    d += 1.1 * (r - 0.5) + 0.5 * (vnoise(p * 0.5) - 0.5);
    if (d < 0.8) d += 0.2 * (0.5 - abs(vnoise(p * 1.3) - 0.5) * 2.0) + 0.07 * (vnoise(p * 4.3) - 0.5);
  }
  return d * 0.6;
}

// trees: the garden's groves, the two great trees at the gate, the tree of life
float canopyN(vec3 p) {
  // leaf clumps: billowing lobes with ragged, open edges
  float a = fbm(p * 0.38, 3) - 0.5;
  float b = 1.0 - abs(vnoise(p * 1.25) * 2.0 - 1.0);
  return 1.3 * a + 0.55 * (0.5 - b) + 0.22 * (vnoise(p * 3.7) - 0.5);
}
float gardenTrees(vec3 p, out float isLeaf) {
  isLeaf = 0.0;
  if (p.z < 4.0 || p.y > 48.0) return 1e9;
  const float TC = 12.0;
  vec2 g = p.xz / TC;
  vec2 c0 = floor(g), f = fract(g) - 0.5;
  vec2 o = vec2(f.x > 0.0 ? 1.0 : -1.0, f.y > 0.0 ? 1.0 : -1.0);
  float d = 1e9;
  for (int j = 0; j < 4; j++) {
    vec2 cid = c0 + vec2(j == 1 || j == 3 ? o.x : 0.0, j >= 2 ? o.y : 0.0);
    vec2 h = hash22(cid * 1.31 + 4.7);
    vec2 c = (cid + 0.5 + 0.7 * (h - 0.5)) * TC;
    if (c.y < 12.0) continue;
    if (abs(c.x - pathX(c.y)) < 6.0 + 2.0 * h.x || abs(c.x) < 7.0 + 0.02 * c.y) continue;   // the path, and the view up it, are clear
    vec2 dt = c - TL.xz; if (dot(dt, dt) < 48.0 * 48.0) continue;       // and the clearing of the tree of life
    if (h.y < 0.12) continue;
    float h3 = hash12(cid * 7.7 + 1.9);
    float H = 6.0 + 9.0 * h.y;
    float R = 3.4 + 3.4 * h.x;
    // cheap bound for the whole cell: skip it if it cannot beat what we have
    float cb = max(length(p.xz - c) - (R * 1.25 + 4.5), p.y - (15.0 + H + R));
    if (cb > d) continue;
    float gy = innH(c);
    vec3 base = vec3(c.x, gy, c.y);
    float bb = length(p - (base + vec3(0.0, H * 0.6, 0.0))) - (H * 0.6 + R + 2.0);
    // an undergrowth bush beside every tree
    vec3 sb = base + vec3(3.5 * (h3 - 0.5) + 2.0, 0.0, 3.0 * (h.x - 0.5));
    if (p.z < 160.0) {
      float bush = sdEllipsoid(p - sb, vec3(1.6 + 1.4 * h3, 1.0 + 0.8 * h3, 1.6 + 1.2 * h.y));
      if (bush < 1.5) bush += 0.9 * canopyN(p * 1.6 + 5.0);
      bush *= 0.7;
      if (bush < d) { d = bush; isLeaf = 1.0; }
    }
    if (bb > d) { continue; }
    // a short trunk that forks low into spreading limbs; a broad, flat-topped crown
    vec3 fork = base + vec3(0.6 * (h.x - 0.5), H * (0.35 + 0.15 * h3), 0.5 * (h.y - 0.5));
    float tr = sdRoundCone(p, base - vec3(0, 0.5, 0), fork, 0.35 + 0.045 * H, 0.26 + 0.02 * H);
    float ang = h3 * 6.28;
    vec3 l1 = fork + vec3(cos(ang) * R * 0.6, H * 0.4, sin(ang) * R * 0.6);
    vec3 l2 = fork + vec3(cos(ang + 2.3) * R * 0.6, H * 0.45, sin(ang + 2.3) * R * 0.6);
    vec3 l3 = fork + vec3(cos(ang + 4.2) * R * 0.5, H * 0.5, sin(ang + 4.2) * R * 0.5);
    tr = smin(tr, sdRoundCone(p, fork, l1, 0.25 + 0.02 * H, 0.08), 0.3);
    tr = smin(tr, sdRoundCone(p, fork, l2, 0.22 + 0.02 * H, 0.08), 0.3);
    tr = smin(tr, sdRoundCone(p, fork, l3, 0.2 + 0.02 * H, 0.07), 0.3);
    vec3 cc = fork + vec3(0.0, H * 0.48 + R * 0.12, 0.0);
    float ca = sdEllipsoid(p - cc, vec3(R, R * 0.42, R * 0.9));
    ca = smin(ca, sdEllipsoid(p - (l1 + vec3(0.0, R * 0.12, 0.0)), vec3(R * 0.62, R * 0.36, R * 0.62)), R * 0.35);
    ca = smin(ca, sdEllipsoid(p - (l2 + vec3(0.0, R * 0.1, 0.0)), vec3(R * 0.58, R * 0.34, R * 0.58)), R * 0.35);
    ca = smin(ca, sdEllipsoid(p - (l3 + vec3(0.0, R * 0.2, 0.0)), vec3(R * 0.5, R * 0.36, R * 0.5)), R * 0.35);
    if (ca < 2.2) ca += 1.6 * canopyN(p + vec3(h * 37.0, 0.0).xzy);
    ca *= 0.72;
    if (ca < tr && ca < d) isLeaf = 1.0; else if (tr < d) isLeaf = 0.0;
    d = min(d, min(tr, ca));
  }
  return d;
}
// a cedar: a massive trunk, limbs, and flat layered plates of foliage
float cedar(vec3 q, float H, float sd, out float isLeaf) {
  float a0 = sd * 6.28;
  float tr = sdRoundCone(q, vec3(0, -2.0, 0), vec3(0.6, H * 0.62, 0.3), 1.7, 0.6);
  float ca = 1e9;
  for (int i = 0; i < 5; i++) {
    float fi = float(i);
    float y = H * (0.36 + 0.13 * fi);
    float a = a0 + fi * 2.4;
    float r = (4.0 - 0.7 * fi);
    vec3 c = vec3(cos(a) * r, y, sin(a) * r);
    vec3 rad = vec3(10.5 - 1.7 * fi, 2.6 + 0.2 * fi, 9.0 - 1.4 * fi);
    tr = smin(tr, sdRoundCone(q, vec3(0.3, y - 3.0, 0.15), c, 0.75 - 0.1 * fi, 0.25), 0.6);
    float pl = sdEllipsoid(q - c - vec3(0.0, 0.8, 0.0), rad);
    ca = smin(ca, pl, 2.2);
  }
  if (ca < 2.5) {
    ca += 3.0 * (fbm(q.xz * 0.3 + sd * 9.0, 3) - 0.5) + 1.2 * (vnoise(q * vec3(0.8, 1.6, 0.8)) - 0.5);
    ca += 0.35 * (vnoise(q * 3.1) - 0.5);
  }
  ca *= 0.7;
  isLeaf = ca < tr ? 1.0 : 0.0;
  return min(tr, ca);
}
float gateTrees(vec3 p, out float isLeaf) {
  isLeaf = 0.0;
  float bl = length(p - vec3(-13.0, 24.0, 9.0)) - 24.0, br = length(p - vec3(13.0, 24.0, 9.0)) - 24.0;
  float b = min(bl, br);
  if (b > 2.0) return b;
  float l1 = 0.0, l2 = 0.0;
  float d1 = bl < 2.0 ? cedar(vec3(-p.x, p.y, p.z) - vec3(13.0, 1.0, 10.0), 40.0, 0.81, l1) : bl;
  float d2 = br < 2.0 ? cedar(p - vec3(13.0, 1.0, 10.0), 40.0, 0.37, l2) : br;
  isLeaf = d1 < d2 ? l1 : l2;
  return min(d1, d2);
}
float lifeTree(vec3 p) {
  vec3 q = p - (TL + vec3(0.0, 10.0, 0.0));
  float b = length(q - vec3(0, 18, 0)) - 30.0;
  if (b > 2.0) return b;
  float tr = sdRoundCone(q, vec3(0, -1, 0), vec3(0, 11, 0), 2.0, 1.1);
  tr = smin(tr, sdRoundCone(q, vec3(0, 10, 0), vec3(12, 17, 2), 1.0, 0.3), 1.0);
  tr = smin(tr, sdRoundCone(q, vec3(0, 10, 0), vec3(-12, 18, -2), 1.0, 0.3), 1.0);
  tr = smin(tr, sdRoundCone(q, vec3(0, 11, 0), vec3(3, 24, -1), 0.8, 0.3), 1.0);
  float ca = sdEllipsoid(q - vec3(0, 21, 0), vec3(13.0, 7.0, 12.0));
  ca = smin(ca, sdEllipsoid(q - vec3(10, 18, 2), vec3(8.0, 5.0, 7.0)), 3.0);
  ca = smin(ca, sdEllipsoid(q - vec3(-10, 19.5, -2), vec3(8.0, 5.5, 7.0)), 3.0);
  ca = smin(ca, sdEllipsoid(q - vec3(4, 26, -1), vec3(7.0, 4.5, 6.0)), 3.0);
  ca = smin(ca, sdEllipsoid(q - vec3(-5, 25, 3), vec3(6.0, 4.0, 6.0)), 3.0);
  ca = smin(ca, sdEllipsoid(q - vec3(15, 15, -1), vec3(4.5, 3.0, 4.5)), 2.0);
  ca = smin(ca, sdEllipsoid(q - vec3(-15, 16, 1), vec3(4.5, 3.0, 4.5)), 2.0);
  if (ca < 3.0) {
    // the crown: billowing clumps of leaves, broken at the edges, with gaps of light between them
    vec3 w = q * 0.32 + 1.6 * vec3(vnoise(q * 0.11), vnoise(q * 0.11 + 4.0), vnoise(q * 0.11 + 9.0));
    float bil = 1.0 - abs(vnoise(w) * 2.0 - 1.0);
    float bil2 = 1.0 - abs(vnoise(w * 2.3 + 3.0) * 2.0 - 1.0);
    ca += 1.6 * (fbm(q * 0.17, 2) - 0.5) + 1.5 * (0.55 - bil) + 0.5 * (0.55 - bil2);
    ca *= 0.7;
  }
  return min(tr, ca);
}

// a human figure as a plain silhouette (no features): walking (sit = 0) or seated by a fire (sit = 1)
float figureSD(vec3 p, vec3 base, vec3 fwd, float ph, float sit) {
  vec3 q = p - base;
  float bb = length(q - vec3(0, 0.9, 0)) - 1.3;
  if (bb > 0.3) return bb;
  vec3 r = normalize(cross(vec3(0, 1, 0), fwd));
  q = vec3(dot(q, r), q.y, dot(q, fwd));
  if (sit > 0.5) {
    // seated on the ground, knees drawn up, arms round them, head bowed toward the fire;
    // a cloak of skin over the shoulders falls to the ground behind
    q.y -= 0.01 * sin(uTime * 1.3);                      // breathing
    float hips = sdEllipsoid(q - vec3(0.0, 0.2, -0.08), vec3(0.2, 0.16, 0.18));
    float back = sdRoundCone(q, vec3(0.0, 0.24, -0.1), vec3(0.0, 0.78, 0.06), 0.17, 0.15);
    float shoulders = sdEllipsoid(q - vec3(0.0, 0.76, 0.06), vec3(0.24, 0.1, 0.13));
    float head = length(q - vec3(0.0, 0.93, 0.2)) - 0.105;
    float neck = sdCapsule(q, vec3(0.0, 0.78, 0.08), vec3(0.0, 0.9, 0.17), 0.05);
    vec3 qa = vec3(abs(q.x), q.yz);
    float thigh = sdCapsule(qa, vec3(0.1, 0.18, -0.02), vec3(0.11, 0.48, 0.32), 0.075);
    float shin = sdCapsule(qa, vec3(0.11, 0.48, 0.32), vec3(0.1, 0.05, 0.42), 0.06);
    float arm = sdCapsule(qa, vec3(0.2, 0.74, 0.06), vec3(0.17, 0.5, 0.3), 0.05);
    float fore = sdCapsule(qa, vec3(0.17, 0.5, 0.3), vec3(0.03, 0.46, 0.4), 0.045);
    float cloak = sdRoundCone(q, vec3(0.0, 0.08, -0.18), vec3(0.0, 0.76, 0.04), 0.3, 0.17);
    cloak = max(cloak, -(q.z - 0.12));
    float body = smin(smin(hips, back, 0.08), shoulders, 0.08);
    body = smin(body, cloak, 0.05);
    float limbs = min(min(thigh, shin), min(arm, fore));
    return min(smin(body, limbs, 0.04), smin(head, neck, 0.03));
  }
  float s = sin(ph), c = cos(ph);
  q.y -= 0.025 * abs(c);
  float hip = 0.94;
  vec3 hipL = vec3(-0.1, hip, 0.0), hipR = vec3(0.1, hip, 0.0);
  vec3 footL = vec3(-0.11, 0.07 + 0.12 * max(0.0, -c), 0.34 * s);
  vec3 footR = vec3(0.11, 0.07 + 0.12 * max(0.0, c), -0.34 * s);
  vec3 kneeL = mix(hipL, footL, 0.5) + vec3(0, 0.0, 0.08 + 0.06 * max(0.0, -c));
  vec3 kneeR = mix(hipR, footR, 0.5) + vec3(0, 0.0, 0.08 + 0.06 * max(0.0, c));
  float legs = min(min(sdCapsule(q, hipL, kneeL, 0.075), sdCapsule(q, kneeL, footL, 0.06)),
                   min(sdCapsule(q, hipR, kneeR, 0.075), sdCapsule(q, kneeR, footR, 0.06)));
  float torso = sdRoundCone(q, vec3(0, hip + 0.02, 0), vec3(0, 1.4, 0.04), 0.15, 0.18);
  float garment = sdRoundCone(q, vec3(0, 0.62, 0.0), vec3(0, 1.36, 0.03), 0.25, 0.19);
  vec3 shL = vec3(-0.21, 1.4, 0.03), shR = vec3(0.21, 1.4, 0.03);
  vec3 hdL = vec3(-0.25, 0.86, -0.22 * s), hdR = vec3(0.25, 0.86, 0.22 * s);
  float arms = min(sdCapsule(q, shL, hdL, 0.055), sdCapsule(q, shR, hdR, 0.055));
  float head = length(q - vec3(0, 1.6, 0.03)) - 0.105;
  float neck = sdCapsule(q, vec3(0, 1.42, 0.03), vec3(0, 1.55, 0.03), 0.05);
  // head bowed a little
  return smin(smin(min(legs, arms), min(torso, garment), 0.06), min(head, neck), 0.04);
}

float boulders(vec3 p) {
  if (p.z > -9.0 || p.y > 30.0) return 1e9;
  vec2 g = p.xz / 5.0; vec2 id = floor(g);
  vec2 h = hash22(id + 17.0);
  if (h.x < 0.66) return 2.5 * 0.7;
  float r = 0.15 + 0.8 * h.y * h.y;
  vec2 o = (hash22(id * 3.1) - 0.5) * 0.5;
  vec2 cxz = (id + 0.5 + o) * 5.0;
  if (abs(cxz.x - pathX(cxz.y)) < 7.0 && cxz.y > -60.0) return 2.5 * 0.7;   // the path is clear
  float hd = length(p.xz - cxz) - r * 1.4;
  if (hd > 0.4) return max(hd, 0.05) * 0.8 + 0.3;
  float gy = terrApprox(cxz) + 0.32 * vnoise(cxz * 0.33) + 1.5 * (fbm(cxz * 0.012, 3) - 0.5) * smoothstep(-10.0, -60.0, cxz.y) * 2.0 - r * 0.4;
  vec3 c = vec3(cxz.x, gy, cxz.y);
  vec3 q = p - c;
  q.xz = rot(h.y * 6.28) * q.xz;
  float d = sdEllipsoid(q, vec3(r * 1.35, r * 0.75, r));
  d = smax(d, q.y - r * (0.35 + 0.3 * h.x), r * 0.3);                    // a flatter, broken top
  if (d < 0.4) d += 0.16 * r * (vnoise(q * 5.0 / max(r, 0.3)) - 0.5) + 0.05 * r * (vnoise(q * 17.0 / max(r, 0.3)) - 0.5);
  return min(d, 2.0) * 0.8;
}
float campSD(vec3 p) {
  vec3 q = p - vec3(uCampC.x, gCampY, uCampC.z);
  float b = length(q) - 2.5;
  if (b > 0.5) return b;
  // a ring of stones and a few crossed sticks
  float a = atan(q.z, q.x); float k = floor(a / 6.2831 * 9.0 + 0.5);
  float aa = k / 9.0 * 6.2831;
  vec3 sp = vec3(cos(aa) * 0.62, 0.07, sin(aa) * 0.62);
  float st = sdEllipsoid(q - sp, vec3(0.13, 0.09, 0.11));
  float lg = min(sdCapsule(q, vec3(-0.4, 0.05, -0.1), vec3(0.35, 0.16, 0.12), 0.05), sdCapsule(q, vec3(0.1, 0.05, -0.4), vec3(-0.08, 0.17, 0.35), 0.045));
  return min(st, lg);
}

// id: 0 ground, 1 rock, 2 bark, 3 leaves, 4 tree of life, 5 figure, 6 camp stones
float mapE(vec3 p, out int id) {
  float d = (p.y - terrH(p.xz)) * 0.8; id = 0;
  float r = ridgeSD(p); if (r < d) { d = r; id = 1; }
  float lf;
  float gt = gateTrees(p, lf); if (gt < d) { d = gt; id = lf > 0.5 ? 3 : 2; }
  float tr = gardenTrees(p, lf); if (tr < d) { d = tr; id = lf > 0.5 ? 3 : 2; }
  float bo = boulders(p); if (bo < d) { d = bo; id = 1; }
  if (uWalker > 0.0) { float f = figureSD(p, vec3(uWalkP.x, gWalkY, uWalkP.z), uWalkD, uWalkPh, 0.0); if (f < d) { d = f; id = 5; } }
  if (uSitter > 0.0) { float f = figureSD(p, vec3(uCampC.x, gCampY, uCampC.z) + vec3(0.35, 0.0, -1.25), normalize(vec3(-0.2, 0.0, 1.0)), 0.0, 1.0); if (f < d) { d = f; id = 5; } }
  if (uCamp > 0.0) { float f = campSD(p); if (f < d) { d = f; id = 6; } }
  return d;
}
float mapD(vec3 p) { int i; return mapE(p, i); }
vec3 normE(vec3 p, float t) {
  vec2 e = vec2(1.0, -1.0) * (0.003 + 0.0006 * t);
  return normalize(e.xyy * mapD(p + e.xyy) + e.yyx * mapD(p + e.yyx) + e.yxy * mapD(p + e.yxy) + e.xxx * mapD(p + e.xxx));
}
float marchE(vec3 ro, vec3 rd, out int id) {
  float t = 0.05, d = 1e9;
  for (int i = 0; i < 260; i++) {
    vec3 p = ro + rd * t;
    d = mapE(p, id);
    if (abs(d) < 0.0012 * t + 0.002) return t;
    t += d * (t < 40.0 ? 0.85 : 1.0) + t * 0.0012;
    if (t > 1600.0 || (p.y > 120.0 && rd.y > 0.0)) { id = -1; return -1.0; }
  }
  // out of steps: a grazing hit if we were close to something, else open sky
  if (d < 0.004 * t + 0.1) return t;
  id = -1; return -1.0;
}
float shadowE(vec3 ro, vec3 rd, float tmax) {
  float res = 1.0, t = 0.08;
  for (int i = 0; i < 18; i++) {
    float h = mapD(ro + rd * t);
    res = min(res, 8.0 * h / t);
    t += clamp(h, 0.25, 3.0);
    if (res < 0.01 || t > tmax) break;
  }
  return sat(res);
}
float aoE(vec3 p, vec3 n) {
  float o = 0.0, s = 1.0;
  for (int i = 1; i <= 2; i++) { float h = 0.6 * float(i) * float(i); o += (h - mapD(p + n * h)) * s; s *= 0.55; }
  return sat(1.0 - 0.4 * o);
}

// ---------------- lights ----------------
// the glow of the garden seen from outside: through the gate (a soft window in the wall) and over it
const vec3 GSRC = vec3(0.0, 11.0, 28.0);
float gateVis(vec3 q) {
  if (q.z > 1.5) return 1.0;
  vec3 d = GSRC - q;
  float s = -q.z / d.z;
  vec3 a = q + d * s;
  float pen = 0.6 + 9.0 * (-q.z) / (-q.z + 28.0);
  float win = smoothstep(pen, -pen, abs(a.x) - 4.6) * smoothstep(-pen, pen, a.y - 0.5) * smoothstep(pen * 1.5, -pen, a.y - 26.0);
  return win;
}
vec3 swordL() { float fl = 0.85 + 0.15 * sin(uTime * 23.0) * sin(uTime * 7.3 + 1.0); return vec3(1.0, 0.48, 0.16) * uSword * fl; }
vec3 cherubL() { float fl = 0.9 + 0.1 * sin(uTime * 13.0 + 2.0); return vec3(1.0, 0.42, 0.14) * uCherub * fl; }
vec3 campL() { float fl = 0.75 + 0.25 * sin(uTime * 17.0) * sin(uTime * 5.1 + 0.7); return vec3(1.0, 0.52, 0.2) * uCamp * fl; }

// ---------------- the sky ----------------
vec3 promisePos() { return vec3(-90.0, uStarY, 3200.0); }
vec3 skyE(vec3 ro, vec3 rd) {
  float h = rd.y;
  vec3 c = mix(vec3(0.02, 0.03, 0.065), vec3(0.003, 0.005, 0.015), pow(sat(h), 0.45));
  // the milky way, faint, across the sky
  vec3 mw = normalize(vec3(0.6, 0.55, -0.58));
  float band = exp(-pow(dot(rd, mw) / 0.2, 2.0));
  c += vec3(0.018, 0.019, 0.026) * band * (0.3 + 1.2 * fbm(rd.xy * 9.0 + rd.z * 4.0, 4)) * smoothstep(0.0, 0.2, h) * (1.0 - 0.6 * smoothstep(0.55, 0.75, fbm(rd.xy * 14.0 - rd.z * 3.0, 3)));
  // high cloud, lit from below where it lies over the garden
  float tc = (300.0 - ro.y) / max(rd.y, 0.015);
  vec3 X = ro + rd * tc;
  float gm = smoothstep(-40.0, 160.0, X.z) * exp(-max(X.z - 700.0, 0.0) / 600.0) * exp(-abs(X.x) / 600.0);
  float cl = fbm(X.xz * 0.0035 + vec2(uTime * 0.006, 0.0), 5);
  float cov = smoothstep(0.45, 0.78, cl) * smoothstep(0.0, 0.06, h);
  c = mix(c, vec3(0.006, 0.007, 0.011), cov * 0.7);
  c += GLOWC * uGlow * 0.022 * gm * (0.05 + 1.6 * cov) * (0.4 + 0.6 * exp(-max(h, 0.0) * 4.0));
  // a low warm dome over the garden near the horizon
  vec2 toG = vec2(0.0, 60.0) - ro.xz; float az = dot(normalize(rd.xz), normalize(toG));
  c += GLOWC * uGlow * 0.045 * smoothstep(0.75, 1.0, az) * exp(-max(h, 0.0) * 12.0) * smoothstep(40.0, -40.0, ro.z);
  // stars
  for (int L = 0; L < 2; L++) {
    float sc = L == 0 ? 260.0 : 520.0;
    vec3 sd = rd * sc;
    vec3 cell = floor(sd); vec3 f = fract(sd) - 0.5;
    float hs = hash13(cell + float(L) * 71.0);
    float thr = L == 0 ? 0.982 : 0.972;
    if (hs > thr) {
      float tw = 0.75 + 0.25 * sin(uTime * (2.0 + hs * 6.0) + hs * 50.0);
      vec3 off = (hash33(cell) - 0.5) * 0.5;
      float px = 0.0012 * sc;                       // about a pixel, in cell units
      float m = exp(-dot(f - off, f - off) / (px * px));
      vec3 tint = mix(vec3(1.0, 0.82, 0.65), vec3(0.72, 0.84, 1.0), fract(hs * 97.0));
      float br = pow((hs - thr) / (1.0 - thr), 5.0) * (L == 0 ? 5.0 : 0.8) + (L == 0 ? 0.08 : 0.05);
      c += tint * m * br * tw * smoothstep(0.0, 0.1, h) * (1.0 - cov * 0.9) * (1.0 + 1.5 * band);
    }
  }
  return c;
}

vec3 starE(vec3 ro, vec3 rd) {
  vec3 c = vec3(0.0);
  if (uStar > 0.0) {
    vec3 pd = normalize(promisePos() - ro);
    float a = length(cross(rd, pd));
    float core = exp(-a * a / (0.0006 * 0.0006));
    float halo = exp(-a / 0.0018) * 0.05 + exp(-a / 0.008) * 0.004;
    c += vec3(1.0, 0.96, 0.9) * uStar * (core * 45.0 + halo * 9.0) * step(0.0, dot(rd, pd));
  }
  return c;
}

// ---------------- surfaces ----------------
vec3 shadeE(vec3 p, vec3 n, vec3 rd, int id, float t) {
  vec3 alb; float wrap = 0.0, trans = 0.0; vec3 emis = vec3(0.0);
  bool inside = p.z > 3.0;
  if (id == 0) {
    if (inside) {
      float g = vnoise(p.xz * 0.9) * 0.6 + vnoise(p.xz * 5.0) * 0.4;
      alb = mix(vec3(0.05, 0.075, 0.03), vec3(0.11, 0.14, 0.05), g);
      alb *= 0.8 + 0.4 * vnoise(p.xz * 13.0);
    } else {
      // cracked dry earth, dust and stones
      float crack = 0.0;
      if (t < 30.0) {
        vec2 wp = p.xz * 2.4 + 0.8 * vec2(vnoise(p.xz * 1.3), vnoise(p.xz * 1.3 + 5.0));
        vec2 ve = voronoiEdge(wp);
        crack = smoothstep(0.04, 0.0, ve.x) * smoothstep(30.0, 4.0, t) * smoothstep(0.35, 0.65, vnoise(p.xz * 0.4)) * 0.7;
      }
      float g = fbm(p.xz * 0.35, 3);
      alb = mix(vec3(0.16, 0.14, 0.12), vec3(0.27, 0.24, 0.2), g) * (0.45 + 0.9 * fbm(p.xz * 0.018 + 4.0, 3));
      alb *= 1.0 - 0.55 * crack;
      alb *= 0.85 + 0.3 * vnoise(p.xz * 7.0);
    }
    float pm = pathMask(p.xz);
    alb = mix(alb, vec3(0.32, 0.29, 0.24), pm * (inside ? 0.8 : 0.55));
    if (inside) emis += pm * GLOWC * uGlow * 0.05 * (0.5 + 0.8 * smoothstep(40.0, 270.0, p.z)) * (0.7 + 0.3 * vnoise(p.xz * 3.0));
  } else if (id == 1) {
    float strata = 0.5 + 0.5 * sin(p.y * 1.7 + 2.0 * fbm(p * 0.12, 3) * 3.0);
    float g = fbm(p * 0.35, 3);
    alb = mix(vec3(0.15, 0.13, 0.12), vec3(0.3, 0.27, 0.23), g) * (0.8 + 0.25 * strata);
    alb = mix(alb, vec3(0.06, 0.07, 0.04), smoothstep(0.55, 0.75, fbm(p * 0.5 + 9.0, 3)) * sat(n.y + 0.3));
    alb *= 1.0 - 0.25 * smoothstep(0.55, 0.85, fbm(vec2(p.x * 0.5 + p.z * 0.3, p.y * 0.1), 3));   // rain streaks
    alb *= 0.75 + 0.5 * vnoise(p * 2.7);
  } else if (id == 2) {
    alb = vec3(0.07, 0.055, 0.045) * (0.7 + 0.6 * vnoise(p * vec3(4.0, 0.5, 4.0)));
  } else if (id == 3) {
    float lf = vnoise(p * 7.0), cl = vnoise(p * 1.1);
    alb = vec3(0.04, 0.05, 0.03) * (0.45 + 0.7 * lf) * (0.6 + 0.8 * cl); wrap = 0.5; trans = 1.0;
  } else if (id == 4) {
    // the tree of life: leaves of light
    // leaves of light: white-gold, brightest where the clumps face us, darker in the hollows between
    vec3 q = p - (TL + vec3(0.0, 10.0, 0.0));
    float facing = sat(dot(n, -rd));
    float rimL = pow(1.0 - facing, 2.0);
    float leaf = smoothstep(0.3, 0.8, vnoise(p * 2.6 + vec3(0.0, uTime * 0.5, 0.0))) * (0.5 + 0.5 * vnoise(p * 6.5 - uTime * 0.4));
    float hollow = smoothstep(-0.6, 0.6, fbm(q * 0.3, 2) - 0.5 + 0.5 * n.y);
    vec3 cl = floor(p / 1.4); vec3 fq = fract(p / 1.4) - 0.5; float hh = hash13(cl);
    float lamp = step(0.86, hh) * smoothstep(0.3, 0.05, length(fq - (hash33(cl) - 0.5) * 0.4)) * (0.75 + 0.25 * sin(uTime * 1.5 + hh * 30.0));
    vec3 e = vec3(1.0, 0.88, 0.62) * uLife * (0.4 + 0.55 * facing + 0.6 * rimL + 1.3 * leaf) * (0.4 + 0.6 * hollow);
    e += vec3(1.0, 0.95, 0.82) * uLife * 1.6 * lamp;
    if (length(q.xz) < 3.2 && q.y < 13.0) e = vec3(0.5, 0.38, 0.25) * uLife * 0.02 * (1.0 + facing);   // the trunk, dark against its own light
    return e;
  } else if (id == 5) {
    alb = vec3(0.03, 0.025, 0.02);
  } else {
    alb = vec3(0.12, 0.1, 0.09);
  }
  float ao = t < 60.0 ? aoE(p, n) : 1.0;
  vec3 col = vec3(0.0);
  // starlight from the whole sky
  col += alb * vec3(0.03, 0.042, 0.08) * (0.45 + 0.55 * n.y) * ao;
  // a cold, soft light from the high sky behind us (no moon in frame): it gives the land its relief
  if (!inside || id == 0) col += alb * vec3(0.055, 0.075, 0.14) * pow(sat(dot(n, normalize(vec3(-0.3, 0.92, -0.18))) * 0.9 + 0.1), 1.5) * ao;
  // the garden's light
  if (inside) {
    // the luminous mist lies low: it lights the ground and the undersides, little reaches the crowns
    float low = exp(-max(p.y - terrApprox(p.xz), 0.0) / 7.0);
    vec3 g = GLOWC * uGlow * (0.05 + 0.3 * low) * (0.7 + 0.3 * n.y) + GLOWC * uGlow * 0.12 * low * sat(-n.y + 0.2);
    col += alb * g * ao * (1.0 + wrap);
    // rim: the crowns' edges catch the light of the mist behind them
    float rim = pow(1.0 - sat(dot(n, -rd)), 3.0);
    col += trans * vec3(0.5, 0.4, 0.15) * uGlow * 0.06 * rim * (0.3 + low) ;
  } else {
    vec3 L = GSRC - p; float d2 = dot(L, L); L *= inversesqrt(d2);
    float vis = gateVis(p + n * 0.05);
    float wsh = 1.0;
    if (uWalker > 0.0) {
      // the walker's long shadow, cast away from the gate
      vec3 wb = vec3(uWalkP.x, gWalkY, uWalkP.z);
      if (length(p.xz - wb.xz) < 14.0) {
        float tt = 0.05;
        for (int i = 0; i < 24; i++) { float h = figureSD(p + L * tt, wb, uWalkD, uWalkPh, 0.0); wsh = min(wsh, 6.0 * h / tt); tt += clamp(h, 0.03, 0.8); if (wsh < 0.01 || tt > 16.0) break; }
        wsh = sat(wsh);
      }
    }
    col += alb * GLOWC * uGlow * 2.6 * vis * wsh * (sat(dot(n, L)) + wrap * 0.5) / (1.0 + d2 / 3500.0) * ao;
    // over the wall: the cloud deck lit by the garden
    col += alb * GLOWC * uGlow * 0.03 * sat(0.5 + 0.3 * n.z + 0.5 * n.y) * exp(-max(-p.z, 0.0) / 400.0) * ao;
    // rock crests and faces turned toward the garden catch its glow off the low cloud
    if (id == 1) col += alb * GLOWC * uGlow * 0.12 * sat(n.z * 0.7 + n.y * 0.5) * smoothstep(-60.0, 0.0, p.z) * ao;
    // the inner faces of the gate catch the garden's light directly
    if (p.z > -12.0 && abs(p.x) < 14.0) col += alb * GLOWC * uGlow * 0.35 * sat(n.z * 0.6 + 0.4) * smoothstep(-12.0, 2.0, p.z) * ao * smoothstep(220.0, 90.0, t);
  }
  // the sword
  if (uSword > 0.0) {
    vec3 L = uSwordC - p; float d2 = dot(L, L); float dl = sqrt(d2); L /= dl;
    float nl = sat(dot(n, L)) + wrap * 0.3;
    if (nl > 0.0 && dl < 80.0) {
      float sh = dl < 30.0 ? shadowE(p + n * 0.05, L, dl - SWR * 0.6) : 1.0;
      col += alb * swordL() * 14.0 * nl * sh / (d2 + 4.0);
    }
  }
  // the cherubim's fire
  if (uCherub > 0.0) {
    for (int k = 0; k < 2; k++) {
      vec3 C = vec3(k == 0 ? -CHX : CHX, 9.0, CHZ);
      vec3 L = C - p; float d2 = dot(L, L); L *= inversesqrt(d2);
      col += alb * cherubL() * 5.0 * (sat(dot(n, L)) + wrap * 0.3) / (d2 + 30.0) * ao;
    }
  }
  col += emis;
  // the campfire
  if (uCamp > 0.0) {
    vec3 L = vec3(uCampC.x, gCampY + 0.45, uCampC.z) - p; float d2 = dot(L, L); float dl = sqrt(d2); L /= dl;
    if (dl < 45.0) {
      float sh = dl < 6.0 ? shadowE(p + n * 0.03, L, dl - 0.3) : 1.0;
      col += alb * campL() * 3.2 * (sat(dot(n, L)) + 0.2 * wrap) * sh / (d2 + 0.15);
    }
  }
  return col;
}

// ---------------- fire: the wheel, the cherubim, the campfire ----------------
// the turning sword: a ring of flame with four blades of fire, turning in the plane z = uSwordC.z
vec4 wheelVol(vec3 ro, vec3 rd, float tmax) {
  if (uSword <= 0.0) return vec4(0.0);
  vec3 oc = ro - uSwordC;
  float R = SWR * 1.5;
  float b = dot(oc, rd), c = dot(oc, oc) - R * R, h = b * b - c;
  if (h < 0.0) return vec4(0.0);
  h = sqrt(h);
  float t0 = max(-b - h, 0.0), t1 = min(-b + h, tmax);
  if (t1 <= t0) return vec4(0.0);
  const int NS = 36;
  float dt = (t1 - t0) / float(NS);
  float jj = hash12(gl_FragCoord.xy + uJitter * 91.0 + uFrame * 1.7);
  vec3 acc = vec3(0.0); float tr = 1.0;
  float Lb = SWR * 1.3;                          // the blade's length from the hilt
  vec2 ax = vec2(cos(uSwordAng), sin(uSwordAng)), pe = vec2(-ax.y, ax.x);
  for (int i = 0; i < NS; i++) {
    vec3 q = oc + rd * (t0 + (float(i) + jj) * dt);
    float r = length(q.xy);
    float z = q.z;
    if (abs(z) > 1.2 || r > Lb + 1.6) continue;
    float th = atan(q.y, q.x);
    float lag = mod(th - uSwordAng, 6.2831853);  // how long ago the blade passed here (it turns toward smaller angles)
    float along = dot(q.xy, ax), across = dot(q.xy, pe);
    float n1 = fbm(vec2(along * 1.4 - uTime * 5.0, across * 2.5 + lag * 2.0), 3);
    float n2 = vnoise(vec3(q.xy * 2.6, uTime * 3.0));
    // the blade: a long tapering tongue of white fire with flame licking off its edges
    float wv = mix(0.3, 0.05, sat(along / Lb)) * (0.75 + 0.6 * n2);
    float prof = smoothstep(0.25, 0.7, along) * smoothstep(Lb + 0.3 * n1, Lb * 0.75, along);
    float blade = exp(-pow(across / wv, 2.0)) * prof * exp(-z * z / 0.02);
    float lick = exp(-abs(across) / (0.12 + 0.5 * n1)) * prof * smoothstep(0.4, 0.75, n1) * exp(-z * z / 0.08);
    // its trail: the turning leaves the shape of a wheel behind it, fading as it goes round
    float rprof = smoothstep(0.4, 1.0, r) * smoothstep(Lb + 0.5, Lb * 0.7, r);
    float trail = (0.3 + 0.7 * exp(-lag / 1.5)) * rprof * (0.25 + 0.9 * smoothstep(0.3, 0.8, n1 + 0.3 * n2)) * exp(-z * z / (0.05 + 0.3 * lag));
    trail *= 0.55 + 0.45 * smoothstep(Lb * 0.5, Lb, r);
    // the hilt: a small hot knot at the centre
    float hilt = exp(-r * r / 0.05) * exp(-z * z / 0.05);
    float dens = blade * 2.4 + lick * 0.6 + trail * 1.6 + hilt * 1.5;
    float heat = blade * 2.2 + hilt * 1.8 + lick * 0.8 + trail * 1.5 * (1.0 - 0.5 * sat(lag / 3.0));
    acc += fireCol(min(heat, 2.2)) * dens * tr * dt;
    tr *= exp(-dens * dt * 0.15);
  }
  return vec4(acc * uSword * 1.1, 1.0 - tr);
}
// sparks thrown off the wheel and embers rising off the cherubim
vec3 sparks(vec3 ro, vec3 rd, float tmax) {
  vec3 acc = vec3(0.0);
  if (uSword > 0.0) {
    for (int i = 0; i < 56; i++) {
      float fi = float(i);
      float h1 = hash11(fi * 1.37 + 0.11), h2 = hash11(fi * 2.71 + 3.1), h3 = hash11(fi * 5.13 + 7.7);
      float life = 1.1 + 1.2 * h2;
      float cyc = (uTime + h1 * 9.0) / life;
      float age = fract(cyc) * life;
      float id = floor(cyc);
      float a0 = uSwordAng + 3.4 * age;           // where the blade was when this spark left it
      vec3 rim = vec3(cos(a0), sin(a0), 0.0) * SWR * (0.6 + 0.7 * h3);
      vec3 tang = vec3(-sin(a0), cos(a0), 0.0);
      vec3 v = tang * (6.0 + 5.0 * h3) + normalize(rim) * (1.5 + 2.0 * h1) + vec3(0.0, 1.0, (h2 - 0.5) * 3.0);
      vec3 P = uSwordC + rim + v * age + vec3(0.0, -4.9, 0.0) * age * age * 0.6;
      vec3 w = P - ro; float tp = dot(w, rd);
      if (tp < 0.0 || tp > tmax) continue;
      float d2 = dot(w, w) - tp * tp;
      float sz = 0.0009 * tp + 0.012;
      float fade = (1.0 - age / life); fade *= fade;
      acc += fireCol(1.6 * fade + 0.3) * exp(-d2 / (sz * sz)) * fade * 1.4;
    }
  }
  if (uCherub > 0.0) {
    for (int i = 0; i < 40; i++) {
      float fi = float(i);
      float h1 = hash11(fi * 1.91 + 0.5), h2 = hash11(fi * 3.17 + 1.3), h3 = hash11(fi * 7.07 + 2.9);
      float life = 2.5 + 2.0 * h2;
      float cyc = (uTime * 0.8 + h1 * 7.0) / life; float age = fract(cyc) * life; float id = floor(cyc);
      float side = h3 > 0.5 ? 1.0 : -1.0;
      vec3 P0 = vec3(side * CHX + (hash11(id + fi * 9.1) - 0.5) * 14.0, 4.0 + 14.0 * hash11(id * 1.7 + fi), CHZ + (hash11(id * 2.3 + fi) - 0.5) * 2.0);
      vec3 P = P0 + vec3(0.6 * sin(age * 2.0 + fi), 1.8 * age, 0.3 * cos(age * 1.7 + fi));
      vec3 w = P - ro; float tp = dot(w, rd);
      if (tp < 0.0 || tp > tmax) continue;
      float d2 = dot(w, w) - tp * tp;
      float sz = 0.0008 * tp + 0.01;
      float fade = sin(3.14159 * age / life);
      acc += fireCol(1.2 * fade) * exp(-d2 / (sz * sz)) * fade * uCherub * 0.9;
    }
  }
  return acc;
}
// the campfire's flame: a few tongues of fire over the embers, sparks going up
vec3 campFlame(vec3 ro, vec3 rd, float tmax) {
  if (uCamp <= 0.0) return vec3(0.0);
  vec3 C = vec3(uCampC.x, gCampY + 0.1, uCampC.z);
  vec3 oc = ro - (C + vec3(0.0, 0.55, 0.0));
  float R = 0.9;
  float b = dot(oc, rd), c = dot(oc, oc) - R * R, h = b * b - c;
  vec3 acc = vec3(0.0);
  if (h > 0.0) {
    h = sqrt(h);
    float t0 = max(-b - h, 0.0), t1 = min(-b + h, tmax);
    if (t1 > t0) {
      float dt = (t1 - t0) / 18.0;
      for (int i = 0; i < 18; i++) {
        vec3 q = ro + rd * (t0 + (float(i) + 0.5) * dt) - C;
        float y = q.y;
        float n = fbm(vec3(q.xz * 4.0, q.y * 2.5 - uTime * 5.5), 3);
        float n2 = vnoise(vec3(q.xz * 9.0 + 3.0, q.y * 5.0 - uTime * 9.0));
        // tongues: the flame's width wavers and splits as it rises
        vec2 sway = vec2(0.1 * sin(uTime * 3.1 + y * 4.0), 0.07 * cos(uTime * 2.3 + y * 3.0)) * y;
        float ang = atan(q.z, q.x);
        float lobes = 0.75 + 0.25 * sin(ang * 3.0 + uTime * 1.7 + y * 2.0);
        float w = 0.5 * pow(1.0 - sat(y / (0.7 + 0.5 * n)), 0.7) * (0.6 + 0.9 * n) * lobes;
        float d = smoothstep(w, w * 0.05, length(q.xz - sway)) * smoothstep(-0.02, 0.05, y) * smoothstep(0.3, 0.6, n + 0.4 * n2 + 0.4 * (1.0 - y * 1.3));
        float heat = d * (1.6 - 1.1 * sat(y / 1.0));
        acc += fireCol(heat * 1.6) * d * dt;
      }
    }
  }
  acc *= uCamp * 8.0;
  // embers drifting up
  for (int i = 0; i < 16; i++) {
    float fi = float(i);
    float h1 = hash11(fi * 1.7 + 0.3), h2 = hash11(fi * 2.9 + 1.1);
    float life = 1.4 + 1.4 * h2;
    float cyc = (uTime + h1 * 5.0) / life; float age = fract(cyc) * life; float id = floor(cyc);
    vec3 P = C + vec3((hash11(id + fi * 3.1) - 0.5) * 0.4 + 0.25 * sin(age * 3.0 + fi), 0.3 + 1.1 * age + 0.1 * age * age, (hash11(id * 1.3 + fi) - 0.5) * 0.4 + 0.2 * cos(age * 2.4 + fi));
    vec3 w = P - ro; float tp = dot(w, rd);
    if (tp < 0.0 || tp > tmax) continue;
    float d2 = dot(w, w) - tp * tp;
    float sz = 0.0007 * tp + 0.006;
    float fade = (1.0 - age / life);
    acc += fireCol(1.4 * fade) * exp(-d2 / (sz * sz)) * fade * fade * uCamp * 1.5;
  }
  return acc;
}

// ---------------- the cherubim: layered wings of flame, eyes on the wings ----------------
// Each cherub is six wings in three pairs (covering the head, spread wide, covering the feet) and a
// body of fire behind them. Every wing is a flat layer in the world, a fan of long feathers with a
// row of coverts over them; on the coverts, almond eyes. Flame licks off every edge.
// Returns premultiplied colour and alpha for the wing w of cherub k, hit at world point x.
float featherSD(vec2 q, float L, float W) {
  // q.x along the feather from its root, q.y across. pointed tip, broad middle.
  float x = q.x / L;
  float w = W * pow(sat(x), 0.35) * pow(sat(1.0 - x), 0.55) * 1.6;
  return max(abs(q.y) - w, max(-q.x, q.x - L));
}
// a fan of n feathers from the root, spanning angles a0..a1 (relative to the wing's axis)
vec2 fan(vec2 uv, float a0, float a1, float n, float L, float W, float seed, out float rachis, out vec2 fq, out float fl) {
  float a = atan(uv.y, uv.x), r = length(uv);
  float da = (a1 - a0) / (n - 1.0);
  float k0 = clamp(floor((a - a0) / da + 0.5), 0.0, n - 1.0);
  float best = 1e9; float bk = 0.0; rachis = 1e9; fq = vec2(0.0); fl = L;
  for (int j = -1; j <= 1; j++) {
    float k = clamp(k0 + float(j), 0.0, n - 1.0);
    float ak = a0 + k * da;
    float x = (k / (n - 1.0));
    float Lk = L * (0.72 + 0.28 * sin(3.14159 * (0.25 + 0.75 * x))) * (0.92 + 0.12 * hash11(k + seed));
    vec2 ax = vec2(cos(ak), sin(ak));
    vec2 q = vec2(dot(uv, ax), dot(uv, vec2(-ax.y, ax.x)));
    // feathers overlap: later ones lie over earlier ones, so take the topmost that covers
    float d = featherSD(q, Lk, W * (0.7 + 0.3 * x));
    if (d < 0.0 && k >= bk) { bk = k; fq = q; fl = Lk; rachis = abs(q.y); }
    best = min(best, d);
  }
  return vec2(best, bk);
}
vec4 wingLayer(vec3 x, int k, int w, out float sdOut) {
  float cx = k == 0 ? -CHX : CHX;
  float sig = (w % 2 == 0) ? -1.0 : 1.0;
  int pr = w / 2;
  float u = uUnfold;
  float br = 0.035 * sin(uTime * 0.9 + float(k) * 1.7 + float(pr) * 2.1);
  vec2 root; float aF, aS, L, W, nP, bend;
  if (pr == 0) { root = vec2(0.35, 14.2); aF = -1.4; aS = 1.78 + br; L = 8.0; W = 0.62; nP = 10.0; bend = -0.035; }
  else if (pr == 1) { root = vec2(0.6, 12.6); aF = -1.5; aS = (sig * (k == 0 ? 1.0 : -1.0) > 0.0 ? 1.12 : 0.62) + br * 1.5; L = 12.0; W = 0.78; nP = 14.0; bend = -0.025; }
  else { root = vec2(0.4, 9.6); aF = -1.6; aS = -1.85 - br; L = 8.5; W = 0.62; nP = 10.0; bend = 0.035; }
  if (pr == 1 && sig * (k == 0 ? 1.0 : -1.0) > 0.0) L *= 0.8;
  float uu = smoothstep(0.0, 1.0, sat(u * 1.35 - (pr == 1 ? 0.0 : (pr == 0 ? 0.18 : 0.32))));
  float ang = mix(aF, aS, uu);
  vec2 d = vec2(x.x - cx, x.y) - vec2(sig * root.x, root.y);
  d.x *= sig;
  vec2 ax = vec2(cos(ang), sin(ang));
  vec2 uv = vec2(dot(d, ax), dot(d, vec2(-ax.y, ax.x)));
  sdOut = 1e9;
  if (length(uv) > L + 3.0) return vec4(0.0);
  uv.y -= bend * uv.x * uv.x;
  // heat shimmer: the air over the fire bends the shape
  uv += 0.12 * (vec2(vnoise(vec2(x.x * 1.3, x.y * 1.3 - uTime * 3.2)), vnoise(vec2(x.x * 1.3 + 5.0, x.y * 1.3 - uTime * 3.2))) - 0.5);
  float rch, fl; vec2 fq;
  vec2 pf = fan(uv, -0.5, 0.1, nP, L, W, float(k * 13 + w), rch, fq, fl);
  float rch2, fl2; vec2 fq2;
  vec2 cf = fan(uv, -0.42, 0.18, nP + 2.0, L * 0.55, W * 1.2, float(k * 7 + w + 40), rch2, fq2, fl2);
  float sd = min(pf.x, cf.x);
  sdOut = sd;
  float rr0 = length(uv) / L;
  float fn = fbm(vec2(x.x * 0.7, x.y * 0.45 - uTime * 2.2) + float(k * 7 + w), 3);
  float fn2 = vnoise(vec2(x.x * 2.3, x.y * 1.6 - uTime * 4.0) + float(w) * 3.0);
  // the body of the wing: a soft sheet of fire, its outline eaten by flame toward the tips
  float soft = 0.18 + 0.55 * rr0;
  float body = smoothstep(soft, -soft * 0.7, sd + 1.1 * (fn - 0.5) * rr0);
  // the feathers only suggested: long flowing streaks of brighter flame along each one
  float inP = rch < 1e8 ? 1.0 : 0.0;
  vec2 fqq = cf.x < 0.0 ? fq2 : fq;
  float flow = vnoise(vec2(fqq.x * 0.9 - uTime * 2.4, fqq.y * 7.0 + float(w) * 5.0));
  float shaft = exp(-min(rch, rch2) * min(rch, rch2) / 0.004) * inP;
  float structure = 0.45 + 0.4 * flow + 0.35 * shaft + 0.25 * (cf.x < 0.0 ? 1.0 : 0.0);
  // tongues licking off the edges, streaming up
  float lick = sd > 0.0 ? exp(-sd / (0.15 + 1.1 * smoothstep(0.35, 0.8, fn))) * smoothstep(0.4, 0.8, fn + 0.25 * fn2) : 0.0;
  float dens = body * structure + lick * 0.55;
  float heat = (1.25 - 0.85 * rr0) + 0.45 * (fn2 - 0.5) + 0.3 * shaft;
  vec3 em = fireCol(sat(heat) * 1.1 * (0.4 + 0.6 * dens)) * dens * 0.36;
  em += vec3(1.0, 0.86, 0.62) * exp(-rr0 * 6.0) * body * 0.16;   // white light where the wings meet the body
  // eyes: small glints scattered over the wings, appearing and closing slowly
  vec2 eg = uv / 0.9; vec2 eid = floor(eg); vec2 ef = fract(eg) - 0.5;
  float eh = hash12(eid + float(k * 17 + w * 5));
  if (eh > 0.9 && body > 0.4) {
    vec2 eo = (hash22(eid * 1.7 + float(w)) - 0.5) * 0.5;
    float open = smoothstep(0.2, 0.7, sin(uTime * (0.4 + eh) + eh * 40.0) * 0.5 + 0.5);
    float g = exp(-dot(ef - eo, ef - eo) / 0.0035);
    em += vec3(1.0, 0.95, 0.85) * 1.6 * g * open * body;
  }
  float flare = (1.0 - smoothstep(0.0, 0.5, u)) * smoothstep(0.0, 0.08, u);
  em += fireCol(1.2) * flare * 0.2 * body;
  float ign = sat(u * 3.0);
  return vec4(em, 0.22 * body) * uCherub * ign;
}
// the body of fire behind the wings
vec4 pillarLayer(vec3 x, int k) {
  float cx = k == 0 ? -CHX : CHX;
  float dx = x.x - cx;
  float y = x.y;
  float n = fbm(vec2(dx * 1.1, y * 0.35 - uTime * 2.2) + float(k) * 3.0, 4);
  float w = (1.0 + 0.8 * n) * smoothstep(1.0, 5.0, y) * smoothstep(17.0, 11.0, y + 3.0 * (n - 0.5));
  float d = smoothstep(w, w * 0.15, abs(dx + 0.5 * (n - 0.5)));
  float heat = d * (1.0 + 0.8 * n);
  return vec4(fireCol(heat * 1.0) * d * 0.38, d * 0.25) * uCherub * sat(uUnfold * 2.0);
}

// gather the cherubim layers along the ray, sorted, composited over col (behind tmax) with the wheel
vec3 cherubim(vec3 ro, vec3 rd, float tmax, vec3 col, vec4 wheel, float tw) {
  if (uCherub <= 0.0) return col + wheel.rgb;
  float ts[16]; vec4 cs[16]; int n = 0;
  for (int k = 0; k < 2; k++) {
    for (int w = 0; w < 7; w++) {
      // planes: each pair a little in front of or behind the body; turned a touch toward the path
      float side = k == 0 ? -1.0 : 1.0;
      float zo = w == 6 ? 0.3 : (w / 2 == 1 ? 0.65 : (w / 2 == 0 ? -0.55 : -0.35)) + (w % 2 == 0 ? 0.08 : -0.08);
      float yaw = side * 0.45;
      vec3 nn = normalize(vec3(sin(yaw), 0.0, cos(yaw)));
      vec3 P0 = vec3(side * CHX, 0.0, CHZ + zo);
      float dn = dot(rd, nn);
      if (abs(dn) < 1e-4) continue;
      float t = dot(P0 - ro, nn) / dn;
      if (t <= 0.0 || t > tmax) continue;
      vec3 x = ro + rd * t;
      // the plane's own coordinates: x along the (turned) plane, y up
      vec3 ex = normalize(cross(vec3(0.0, 1.0, 0.0), nn));
      vec3 xl = vec3(side * CHX + dot(x - P0, ex) * sign(ex.x), x.y, CHZ);
      vec4 c; float sdw;
      if (w == 6) c = pillarLayer(xl, k); else c = wingLayer(xl, k, w, sdw);
      if (c.a <= 0.001 && dot(c.rgb, vec3(1.0)) <= 0.001) continue;
      ts[n] = t; cs[n] = c; n++;
    }
  }
  // back to front over the scene
  vec3 res = col;
  bool wheelDone = wheel.a <= 0.0 && dot(wheel.rgb, vec3(1.0)) <= 0.0;
  for (int i = 0; i < 16; i++) {
    if (i >= n) break;
    // pick the farthest remaining
    int bi = -1; float bt = -1.0;
    for (int j = 0; j < 16; j++) { if (j >= n) break; if (ts[j] > bt) { bt = ts[j]; bi = j; } }
    if (!wheelDone && tw > bt) { res = res * (1.0 - wheel.a * 0.3) + wheel.rgb; wheelDone = true; }
    vec4 c = cs[bi];
    res = res * (1.0 - c.a) + c.rgb;
    ts[bi] = -2.0;
  }
  if (!wheelDone) res = res * (1.0 - wheel.a * 0.3) + wheel.rgb;
  return res;
}

// ---------------- the air ----------------
vec3 airE(vec3 ro, vec3 rd, float depth, vec3 col) {
  float tm = min(depth, 1500.0);
  const int NS = 14;
  float jj = hash12(gl_FragCoord.xy + uFrame * 3.1 + uJitter * 50.0);
  vec3 acc = vec3(0.0); float tr = 1.0;
  float tprev = 0.0;
  for (int i = 0; i < NS; i++) {
    float s = (float(i) + jj) / float(NS);
    float t = tm * s * s;                         // denser near the camera
    float dt = t - tprev; tprev = t;
    vec3 q = ro + rd * t;
    float gy = terrApprox(q.xz);
    float above = q.y - gy;
    bool inside = q.z > 2.0;
    float fogN = 0.3 + 1.4 * vnoise(q.xz * 0.04 + vec2(uTime * 0.05, 0.0));
    float mist = (inside ? 0.0004 : 0.0005) + (inside ? 0.0007 : 0.0006) * exp(-max(above, 0.0) / 60.0) + (inside ? 0.02 * exp(-max(above, 0.0) / 4.0) : 0.014 * exp(-max(above, 0.0) / 2.5)) * fogN;
    vec3 L = vec3(0.0);
    if (inside) {
      // the garden's mist is itself alight
      L += GLOWC * uGlow * (0.02 + 0.8 * exp(-max(above, 0.0) / 5.0)) * 0.3;
      L += GLOWC * uGlow * 0.3 * exp(-max(above, 0.0) / 30.0) * smoothstep(2.0, 40.0, q.z);
      vec3 dl = TL + vec3(0.0, 30.0, 0.0) - q; float d2 = dot(dl, dl);
      L += LIFEC * uLife * 350.0 / (d2 + 600.0);
    } else {
      float v = gateVis(q);
      vec3 dl = GSRC - q; float d2 = dot(dl, dl);
      float ph = 0.5 + 1.5 * pow(sat(dot(rd, dl * inversesqrt(d2))), 8.0);
      L += GLOWC * uGlow * v * ph * 1500.0 / (d2 + 900.0) * 0.4;
      L += GLOWC * uGlow * 0.004;
    }
    if (uSword > 0.0) { vec3 dl = uSwordC - q; float d2 = dot(dl, dl); L += swordL() * 6.0 / (d2 + 3.0); }
    if (uCherub > 0.0) for (int k = 0; k < 2; k++) { vec3 dl = vec3(k == 0 ? -CHX : CHX, 9.0, CHZ) - q; float d2 = dot(dl, dl); L += cherubL() * 5.0 / (d2 + 20.0); }
    if (uCamp > 0.0) { vec3 dl = vec3(uCampC.x, gCampY + 0.6, uCampC.z) - q; float d2 = dot(dl, dl); L += campL() * 1.5 / (d2 + 0.5); }
    L += vec3(0.01, 0.013, 0.022) * 0.7;           // starlight in the air
    acc += L * mist * tr * dt;
    tr *= exp(-mist * dt * 0.6);
  }
  return col * tr + acc;
}

// ---------------- the frame ----------------
vec3 exile(vec2 fc) {
  gWalkY = uWalker > 0.0 ? terrH(uWalkP.xz) : 0.0;
  gCampY = (uCamp > 0.0 || uSitter > 0.0) ? terrH(uCampC.xz) : 0.0;
  vec3 ro; vec3 rd0 = camRay(fc, ro);
  vec3 ww = normalize(uCamTarget - uCamPos);
  vec3 up = vec3(sin(uCamRoll), cos(uCamRoll), 0.0);
  vec3 uu = normalize(cross(ww, up)), vv = cross(uu, ww);
  vec3 rd = rd0;
  if (uAper > 0.0) {
    vec3 fp = ro + rd0 * (uFocus / dot(rd0, ww));
    vec2 j = vec2(hash12(uJitter * 917.0 + 3.1), hash12(uJitter * 613.0 + 7.7));
    float r = sqrt(j.x), th = 6.2831853 * j.y;
    ro += (uu * cos(th) + vv * sin(th)) * r * uAper;
    rd = normalize(fp - ro);
  }
  int id;
  float t = marchE(ro, rd, id);
  vec3 col; float depth;
  if (t > 0.0) {
    vec3 p = ro + rd * t, n = normE(p, t);
    if (id == 0 || id == 1) {
      vec3 b = vec3(vnoise(p.zyx * 3.1 + 1.0), vnoise(p.xzy * 3.1 + 7.1), vnoise(p.yzx * 3.1 + 3.7)) - 0.5;
      vec3 b2 = vec3(vnoise(p * 11.0), vnoise(p * 11.0 + 7.1), vnoise(p * 11.0 + 3.7)) - 0.5;
      n = normalize(n + (b * (id == 1 ? 0.45 : 0.25) + b2 * 0.15) * smoothstep(50.0, 4.0, t));
    }
    if (id == 3 && t < 80.0) {
      vec3 b = vec3(vnoise(p * 4.1), vnoise(p * 4.1 + 7.1), vnoise(p * 4.1 + 3.7)) - 0.5;
      n = normalize(n + b * 1.1 * smoothstep(80.0, 10.0, t));
    }
    col = shadeE(p, n, rd, id, t);
    depth = t;
  } else { col = skyE(ro, rd); depth = 1e5; }
  vec3 promise = (t <= 0.0 && uStar > 0.0) ? starE(ro, rd) : vec3(0.0);
  // the tree of life (mercy's tree, scaled up to stand over the garden)
  {
    const float S = 2.2;
    vec3 Tb = vec3(TL.x, terrH(TL.xz) - 0.9 * S, TL.z);
    vec3 rol = (ro - Tb) / S;
    vec3 oc = rol - vec3(0.5, 11.0, 0.0);
    float bb = dot(oc, rd), hh = bb * bb - dot(oc, oc) + 20.0 * 20.0;
    if (hh > 0.0 && -bb + sqrt(hh) > 0.0) {
      float tmaxl = depth / S;
      float tt = treeMarch(rol, rd, tmaxl);
      if (tt > 0.0) {
        vec3 pl = rol + rd * tt, nl = treeN(pl);
        // silver-white bark, lit by its own leaves above and the garden's mist below
        float up = sat(nl.y * 0.5 + 0.5);
        col = vec3(0.55, 0.52, 0.47) * (LIFEC_T * uLife * (0.05 + 0.25 * up) + GLOWC * uGlow * 0.04);
        depth = tt * S; tmaxl = tt;
      }
      float jit = hash12(gl_FragCoord.xy + uJitter * 37.0 + uFrame * 0.7);
      vec4 cr = crownMarch(rol, rd, tmaxl, jit, 1.0);
      float ft; vec3 fr = fruitLight(rol, rd, tmaxl, ft);
      col = col * cr.a + cr.rgb * 4.5 + fr * 0.6;
      if (cr.a < 0.5) depth = min(depth, length(vec3(0.5, 12.0, 0.0) * S + Tb - ro));
    }
  }
  col = airE(ro, rd, depth, col);
  vec4 wheel = vec4(0.0); float tw = 1e9;
  if (uSword > 0.0) {
    wheel = wheelVol(ro, rd, depth);
    tw = dot(uSwordC - ro, rd);
  }
  col = cherubim(ro, rd, depth, col, wheel, tw);
  col += campFlame(ro, rd, depth);
  col += sparks(ro, rd, depth);
  return (col * uDim + promise) * uExpo;
}
`;

// JS helpers shared by the exile scenes
export const lerp = (a, b, k) => a + (b - a) * k;
export const lerp3 = (a, b, k) => a.map((v, i) => v + (b[i] - v) * k);
export const dist3 = (a, b) => Math.hypot(a[0] - b[0], a[1] - b[1], a[2] - b[2]);

// The ground height in JS (a port of terrH without the fine detail), for placing cameras and figures.
const fract = (x) => x - Math.floor(x);
const sstep = (a, b, x) => { const t = Math.min(1, Math.max(0, (x - a) / (b - a))); return t * t * (3 - 2 * t); };
function hash12(x, y) {
  let a = fract(x * 0.1031), b = fract(y * 0.1031), c = fract(x * 0.1031);
  const d = a * (b + 33.33) + b * (c + 33.33) + c * (a + 33.33);
  a += d; b += d; c += d;
  return fract((a + b) * c);
}
function vnoise2(x, y) {
  const ix = Math.floor(x), iy = Math.floor(y), fx = x - ix, fy = y - iy;
  const ux = fx * fx * fx * (fx * (fx * 6 - 15) + 10), uy = fy * fy * fy * (fy * (fy * 6 - 15) + 10);
  const a = hash12(ix, iy), b = hash12(ix + 1, iy), c = hash12(ix, iy + 1), d = hash12(ix + 1, iy + 1);
  return (a + (b - a) * ux) + ((c + (d - c) * ux) - (a + (b - a) * ux)) * uy;
}
function fbm2(x, y, oct) {
  let s = 0, a = 0.5;
  for (let i = 0; i < oct; i++) { s += a * vnoise2(x, y); const nx = 0.8 * x + 0.6 * y, ny = -0.6 * x + 0.8 * y; x = nx * 2.03; y = ny * 2.03; a *= 0.5; }
  return s;
}
const TLJ = [0, 300];
export function groundH(x, z) {
  const outH = -13 * sstep(-25, -160, z) + 22 * sstep(-200, -380, z) + 2.5 * (vnoise2(x * 0.025 + 3, z * 0.025 + 3) - 0.5) * sstep(-40, -120, z);
  const dx = x - TLJ[0], dz = z - TLJ[1];
  const innH = 1.2 + 9 * Math.exp(-(dx * dx + dz * dz) / 4900) + 34 * sstep(520, 1100, z) * (0.55 + 0.7 * vnoise2(x * 0.004, 1.3));
  const k = sstep(-4, 9, z);
  let h = outH + (innH - outH) * k;
  if (z < -10) h += 3 * (fbm2(x * 0.012, z * 0.012, 3) - 0.5) * sstep(-10, -60, z);
  if (k > 0) h += 1.4 * (vnoise2(x * 0.016 + 7, z * 0.016 + 7) - 0.5) * k;
  h += 0.32 * vnoise2(x * 0.33, z * 0.33);
  return h;
}
