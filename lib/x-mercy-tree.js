// s49 to s51: the tree of life, across the river at dusk. Pale, white-gold and luminous, unlike the
// dark tree of knowledge: a silver-white trunk and great spreading boughs, a crown of leaves made of
// light, and fruit hanging in it like lamps. It stands on a low rise on the far bank of a wide, still
// river; the garden behind it is dark under a deep blue dusk. Its light lies on the water in a long
// glittering path. Units metres; the tree stands at the origin; the river runs along x between
// z = -85 (our bank) and z = -25 (its bank).
//
// The tree's shape is grown here in JS (deterministic) and handed to the shader as segments (round
// cones), leaf clusters and fruit.

function rng(seed) { let s = seed >>> 0; return () => { s = (s * 1664525 + 1013904223) >>> 0; return s / 4294967296; }; }
const sub = (a, b) => a.map((v, i) => v - b[i]);
const add = (a, b) => a.map((v, i) => v + b[i]);
const mul = (a, k) => a.map((v) => v * k);
const norm = (a) => { const l = Math.hypot(...a); return a.map((v) => v / l); };

export function growTree() {
  const R = rng(11);
  const segs = [], clus = [], fruit = [], bounds = [], lobes = [];
  const base = [0, 1.8, 0];
  // the trunk in two parts, curving a little, flaring at the root
  const mid = [0.35, 5.5, 0.15], top = [0.2, 8.8, 0.45];
  segs.push([...add(base, [0, -1.2, 0]), 1.45, ...mid, 1.0]);
  segs.push([...mid, 1.0, ...top, 0.8]);
  // boughs spreading wide and upward like an old olive or oak; each forks into branches, each
  // branch carries a twig; leaves of light gather at the tips
  const nB = 6;
  for (let i = 0; i < nB; i++) {
    const s0 = segs.length;
    const az = (i / nB) * Math.PI * 2 + R() * 0.6;
    const st = add(top, [0, -0.6 - R() * 2.2, 0]);
    const up = 0.3 + R() * 0.35;
    const dir = norm([Math.cos(az), up, Math.sin(az)]);
    const len = 5.5 + R() * 2.5;
    // a bough bends: two segments
    const bend = add(st, mul(dir, len * 0.55));
    const dir1 = norm(add(dir, [0, 0.25, 0]));
    const end = add(bend, mul(dir1, len * 0.5));
    segs.push([...st, 0.58, ...bend, 0.42]);
    segs.push([...bend, 0.42, ...end, 0.24]);
    for (let j = 0; j < 3; j++) {
      const from = j === 2 ? end : (j === 0 ? bend : add(bend, mul(dir1, len * 0.25)));
      const az2 = az + (j === 0 ? -0.75 : j === 1 ? 0.75 : 0.0) + (R() - 0.5) * 0.5;
      const dir2 = norm([Math.cos(az2), 0.5 + R() * 0.6, Math.sin(az2)]);
      const e2 = add(from, mul(dir2, 2.8 + R() * 2.2));
      segs.push([...from, 0.2, ...e2, 0.08]);
      // twigs reaching up into the leaves; the leaves gather round the branch end and its twigs
      let cc = [...e2];
      for (let q = 0; q < 2; q++) {
        const tw = norm([dir2[0] + (R() - 0.5) * 1.2, dir2[1] + 0.4, dir2[2] + (R() - 0.5) * 1.2]);
        const s3 = add(from, mul(sub(e2, from), 0.6 + 0.3 * R()));
        const e3 = add(s3, mul(tw, 1.6 + R() * 1.4));
        segs.push([...s3, 0.07, ...e3, 0.025]);
        cc = add(cc, e3);
      }
      clus.push([...add(mul(cc, 1 / 3), [0, 0.3, 0]), 2.7 + R() * 0.8]);
      if (fruit.length < 16 && R() < 0.85) fruit.push([...add(e2, [(R() - 0.5) * 2.5, -1.0 - R() * 1.4, (R() - 0.5) * 2.5]), 0.2 + R() * 0.07]);
    }
    clus.push([...add(end, [0, 0.7, 0]), 2.8 + R() * 0.8]);
    // the bough's lobe of the crown: round its branch clusters
    {
      const cl = clus.slice(-4);
      const c = mul(cl.reduce((a, q) => add(a, q.slice(0, 3)), [0, 0, 0]), 1 / cl.length);
      const r = Math.max(...cl.map((q) => Math.hypot(...sub(q.slice(0, 3), c)) + q[3] * 0.8));
      lobes.push([...add(c, [0, 0.3, 0]), r]);
    }
    // a bounding sphere for this bough's segments
    const pts = segs.slice(s0).flatMap((g) => [[g[0], g[1], g[2], g[3]], [g[4], g[5], g[6], g[7]]]);
    const c = mul(pts.reduce((a, q) => add(a, q.slice(0, 3)), [0, 0, 0]), 1 / pts.length);
    const r = Math.max(...pts.map((q) => Math.hypot(...sub(q.slice(0, 3), c)) + q[3])) + 0.3;
    bounds.push([...c, r, s0, segs.length - s0]);
  }
  lobes.push([...add(top, [0.3, 5.0, 0.2]), 6.2]);
  lobes.push([...add(top, [0.0, 2.2, 0.0]), 5.0]);
  clus.push([...add(top, [0, 3.5, 0]), 4.6]);
  clus.push([...add(top, [1.8, 5.5, -1.2]), 3.8]);
  clus.push([...add(top, [-2.5, 5.0, 1.5]), 3.8]);
  clus.push([...add(top, [0.5, 6.8, 0.5]), 3.2]);
  while (clus.length < 32) clus.push([0, -100, 0, 0.01]);
  while (fruit.length < 16) fruit.push([0, -100, 0, 0.01]);
  return { segs, clus, fruit, bounds, lobes };
}

const T = growTree();
export const N_SEG = T.segs.length, N_CLU = 32, N_FRUIT = 16;
export const TREE_UNIFORMS = {
  uSeg: T.segs.flatMap((s) => s),            // vec4 pairs: a.xyz ra, b.xyz rb
  uBough: T.bounds.flatMap((b) => b.slice(0, 4)),
  uBoughIx: T.bounds.flatMap((b) => [b[4], b[5]]),
  uClu: T.clus.flatMap((s) => s),
  uLobe: T.lobes.flatMap((s) => s),           // 8 lobes of the crown (centre, radius)
  uTolPos: [0, 0, 0], uTolScale: 1.0,       // where the tree stands and how big (for treeOfLife())
  uFruit: T.fruit.flatMap((s) => s),
  uGlow: 1.0,           // the tree's light
  uReach: 0.0,          // a brightening as we reach for it (s50)
  uReeds: 0.0, uReedZ: -90.0, uReflCrown: 0.0,
};
export const TREE_FRUIT = T.fruit;
export const TREE_CLU = T.clus;

export const TREE_GLSL = /* glsl */ `
// ---------------------------------------------------------------------------------------------
// THE TREE OF LIFE, reusable. Include TREE_GLSL (after the engine's COMMON) and spread
// TREE_UNIFORMS into the scene's uniforms. Then, for any ray (world space):
//
//   float tHit;  vec4 tl = treeOfLife(ro, rd, tmax, jit, tHit);
//   col = col * tl.a + tl.rgb;           // tl.rgb: light from the tree, tl.a: what shows through
//   if (tHit > 0.0) depth = tHit;        // the nearest solid part (bark), for fog / depth
//
// tmax is the distance to whatever is already in front (ground, water...), jit a per-pixel
// 0..1 jitter (e.g. hash12(fragCoord + fract(uTime * 3.7) * 61.0)). Place it with uTolPos (the
// ground point at its foot, world) and uTolScale (1.0 = about 22 m tall, the crown about 30 m
// across). uGlow is its light (1 normal); uReach a brightening. It works from a few metres to
// many kilometres: far away it is drawn as its glowing crown and pale trunk only.
// tolGlowAt(p) gives the light it throws on a world point (add alb * tolGlowAt(p) * lambert).
// tolGlowCheap(ro, rd) is a cheap soft halo for reflections and haze.
// The older entry points (treeMarch, crownMarch, fruitLight, treeGlowCheap) still work in the
// tree's own space (tree at the origin, scale 1).
// ---------------------------------------------------------------------------------------------
#define NSEG ${N_SEG}
uniform vec4 uSeg[${N_SEG * 2}];
uniform vec4 uBough[6];
uniform vec2 uBoughIx[6];
uniform vec4 uClu[32];
uniform vec4 uLobe[8];
uniform vec4 uFruit[16];
uniform vec3 uTolPos;
uniform float uTolScale;
uniform float uGlow, uReach;
const vec3 LIFEC = vec3(1.0, 0.86, 0.6);          // white-gold
const vec3 LEAFC = vec3(1.0, 0.93, 0.74);
const vec3 FRUITC = vec3(1.0, 0.7, 0.32);
vec3 tolGlowCheapW(vec3 ro, vec3 rd);
float tolPow() { return uGlow * (1.0 + 0.45 * uReach); }

// ground: our bank, the river, the far bank rising to the tree's low rise and the garden beyond
float landH(vec2 xz) {
  float z = xz.y;
  float far = smoothstep(-16.0, -4.0, z) * (1.2 + 1.2 * exp(-dot(xz, xz) / 900.0)) + smoothstep(-17.0, -15.0, z) * 0.3;
  float near = smoothstep(-84.0, -90.0, z) * 0.6;
  float h = -0.4 + far + near;
  h += (fbm(xz * 0.05, 3) - 0.5) * 1.2 * smoothstep(-20.0, 20.0, z);
  h += (vnoise(xz * 0.4) - 0.5) * 0.15;
  return h;
}


// trunk and boughs: round cones, the bark gnarled and twisted
float treeSD(vec3 p) {
  float bb = sdBox(p - vec3(0.0, 9.5, 0.0), vec3(16.0, 11.0, 16.0));
  if (bb > 1.0) return bb;
  float d = 1e3;
  // the trunk, twisting as it rises, with great knotted ridges
  {
    vec3 q = p; float tw = q.y * 0.18;
    q.xz = rot(tw) * q.xz;
    for (int i = 0; i < 2; i++) {
      vec4 a = uSeg[2 * i], b = uSeg[2 * i + 1];
      d = smin(d, sdRoundCone(q, a.xyz, b.xyz, a.w, b.w), 0.25);
    }
    float ang = atan(q.x, q.z);
    float ridge = sin(ang * 5.0 + q.y * 0.9) * 0.5 + 0.5;
    d -= 0.16 * ridge * smoothstep(9.0, 2.0, q.y) + 0.1 * (fbm(q * 0.7, 3) - 0.5);
  }
  for (int k = 0; k < 6; k++) {
    vec4 bs = uBough[k];
    float db = length(p - bs.xyz) - bs.w;
    if (db > d) continue;
    int i0 = int(uBoughIx[k].x), n = int(uBoughIx[k].y);
    for (int j = 0; j < 16; j++) {
      if (j >= n) break;
      int i = i0 + j;
      vec4 a = uSeg[2 * i], b = uSeg[2 * i + 1];
      d = smin(d, sdRoundCone(p, a.xyz, b.xyz, a.w, b.w), 0.25);
    }
    d = min(d, max(db, d));
  }
  // roots flaring into the rise
  vec3 rq = p - vec3(0.0, 1.9, 0.0);
  float ra = atan(rq.x, rq.z);
  float roots = sdEllipsoid(rq, vec3(2.9, 1.1, 2.9)) - 0.35 * pow(0.5 + 0.5 * sin(ra * 6.0), 3.0) * smoothstep(1.2, -0.6, rq.y);
  d = smin(d, roots, 0.9);
  // bark: deep fissures and knots
  d += 0.035 * (vnoise(vec2(atan(p.x, p.z) * 9.0 + p.y * 0.5, p.y * 1.6)) - 0.5);
  return d;
}
vec3 treeN(vec3 p) {
  vec2 e = vec2(0.02, 0.0);
  return normalize(vec3(treeSD(p + e.xyy) - treeSD(p - e.xyy), treeSD(p + e.yxy) - treeSD(p - e.yxy), treeSD(p + e.yyx) - treeSD(p - e.yyx)));
}
float treeMarch(vec3 ro, vec3 rd, float tmax) {
  // bounds first
  vec3 c0 = vec3(0.5, 9.5, 0.0); vec3 oc = ro - c0; float b = dot(oc, rd), h = b * b - dot(oc, oc) + 22.0 * 22.0;
  if (h < 0.0) return -1.0;
  float t = max(-b - sqrt(h), 0.0), t1 = min(-b + sqrt(h), tmax);
  for (int i = 0; i < 90; i++) {
    float d = treeSD(ro + rd * t);
    if (d < 0.002 * t) return t;
    t += d * 0.9;
    if (t > t1) break;
  }
  return -1.0;
}
// bark colour and light: pale silver-grey, dark in the fissures, lit warm from the crown above
vec3 tolBark(vec3 p, vec3 n) {
  float fis = vnoise(vec2(atan(p.x, p.z) * 9.0 + p.y * 0.5, p.y * 1.6));
  float lich = smoothstep(0.55, 0.8, fbm(p * 1.3, 3));
  vec3 alb = mix(vec3(0.34, 0.32, 0.29), vec3(0.72, 0.69, 0.62), smoothstep(0.25, 0.7, fis));
  alb = mix(alb, vec3(0.62, 0.66, 0.55), lich * 0.4);
  vec3 up = normalize(vec3(0.5, 14.0, 0.0) - p);
  float lit = sat(dot(n, up) * 0.6 + 0.4);
  float inside = smoothstep(7.0, 11.0, p.y);       // high boughs sit inside the light
  vec3 c = alb * LIFEC * tolPow() * (lit * (0.35 + 0.5 * inside) + 0.18);
  c += alb * vec3(0.05, 0.06, 0.12) * (0.5 + 0.5 * n.y);
  return c * (0.55 + 0.45 * smoothstep(0.15, 0.45, fis));
}

// the crown's shape: eight lobes, flattened and broad like an ancient olive or cedar
float crownSD(vec3 p) {
  float d = 1e3;
  for (int i = 0; i < 8; i++) {
    vec4 l = uLobe[i];
    d = smin(d, sdEllipsoid(p - l.xyz, vec3(l.w, l.w * 0.58, l.w)), 2.0);
  }
  // a ragged outline: clumps bulge out and bays cut in
  return d + 3.2 * (vnoise(p * 0.22 + 1.7) - 0.5) + 1.2 * (vnoise(p * 0.6) - 0.5);
}
// leaves: in each cell of a grid through the crown, two leaves (ellipses, pointed at the tip),
// lit from within: pale white-gold, green-gold at the outer edge of the crown, brighter deep inside
vec4 leafCell(vec3 ro, vec3 rd, vec3 cell, float cs, float ta, float tb, float inner, out float th) {
  vec4 best = vec4(0.0); th = 1e9;
  for (int k = 0; k < 2; k++) {
    vec3 hh = hash33(cell * 1.31 + float(k) * 17.7);
    vec3 c = (cell + 0.2 + 0.6 * hh) * cs;
    // leaves hang outward and a little down, turning gently in the air
    vec3 nrm = normalize(hash33(cell + float(k) * 5.3 + 2.1) - 0.5 + vec3(0.0, 0.4, 0.0));
    nrm.xz = rot(0.15 * sin(uTime * (0.6 + hh.x) + hh.y * 20.0)) * nrm.xz;
    float dn = dot(rd, nrm);
    if (abs(dn) < 1e-4) continue;
    float t = dot(c - ro, nrm) / dn;
    if (t < ta || t > tb || t > th) continue;
    vec3 q = ro + rd * t - c;
    vec3 ax = normalize(cross(nrm, vec3(hh.z - 0.5, 0.3, 0.7)));
    vec3 ay = cross(nrm, ax);
    float L = cs * (0.42 + 0.25 * hh.x), W = L * 0.36;
    float u = dot(q, ax) / L, v = dot(q, ay) / W;
    float w = (1.0 - u * u) * (1.0 - 0.35 * u);       // pointed toward the tip
    if (abs(u) > 1.0 || v * v > w * w) continue;
    th = t;
    float edge = 1.0 - smoothstep(0.55, 1.0, abs(v) / max(w, 1e-3));
    float rib = exp(-abs(v) * 14.0) * 0.6;
    vec3 c0 = mix(vec3(0.62, 0.72, 0.4), LEAFC, smoothstep(0.0, 0.7, inner));
    c0 = mix(c0, vec3(1.0, 0.97, 0.88), smoothstep(0.5, 1.0, inner) * 0.6);
    float lum = (0.55 + 1.6 * inner) * (0.7 + 0.6 * hh.y) * (0.7 + 0.3 * edge + rib);
    // leaves facing us glow through; leaves seen on edge are darker
    lum *= 0.55 + 0.45 * abs(dn);
    best = vec4(c0 * lum, 0.92);
  }
  return best;
}
vec4 crownMarch(vec3 ro, vec3 rd, float tmax, float jit, float detail) {
  vec3 c0 = vec3(0.5, 13.0, 0.0);
  vec3 oc = ro - c0; float b = dot(oc, rd), h = b * b - dot(oc, oc) + 15.5 * 15.5;
  if (h < 0.0) return vec4(0.0, 0.0, 0.0, 1.0);
  float t0 = max(-b - sqrt(h), 0.0), t1 = min(-b + sqrt(h), tmax);
  if (t1 <= t0) return vec4(0.0, 0.0, 0.0, 1.0);
  // leaf size grows with distance so a leaf is never much smaller than a pixel
  float cs = max(0.6, t0 * 0.006);
  vec3 acc = vec3(0.0); float T = 1.0;
  float P = tolPow();
  // DDA through the grid
  vec3 p = ro + rd * (t0 + 1e-3);
  vec3 cell = floor(p / cs);
  vec3 st = sign(rd);
  vec3 inv = 1.0 / max(abs(rd), vec3(1e-5));
  vec3 tmx = (((cell + max(st, 0.0)) * cs) - ro) / rd;
  vec3 tdl = cs * inv;
  float tc = t0;
  for (int i = 0; i < 96; i++) {
    float tn = min(tmx.x, min(tmx.y, tmx.z));
    vec3 cc = (cell + 0.5) * cs;
    float sd = crownSD(cc);
    if (sd < cs * 0.6) {
      float inner = sat(-sd / 4.0);
      // the crown breaks into clumps with gaps of sky between
      float clump = vnoise(cc * 0.33 + 3.0) * 0.65 + vnoise(cc * 0.9) * 0.35;
      float occ = step(0.5 - 0.4 * inner, clump) * step(sd, 0.0);
      if (occ > 0.0) {
        float th; vec4 lf = leafCell(ro, rd, cell, cs, tc, tn, inner, th);
        if (lf.a > 0.0) {
          float tw = 0.75 + 0.25 * sin(uTime * 1.3 + dot(cell, vec3(1.7, 2.3, 3.1)));
          acc += T * lf.rgb * P * tw;
          T *= 1.0 - lf.a;
        }
      }
      // the light inside the crown, seen through the gaps
      acc += T * LIFEC * P * 0.09 * smoothstep(0.0, -3.0, sd) * (tn - tc);
    }
    if (T < 0.05 || tn > t1) break;
    tc = tn;
    if (tmx.x <= tmx.y && tmx.x <= tmx.z) { cell.x += st.x; tmx.x += tdl.x; }
    else if (tmx.y <= tmx.z) { cell.y += st.y; tmx.y += tdl.y; }
    else { cell.z += st.z; tmx.z += tdl.z; }
  }
  return vec4(acc, T);
}
// cheap glow of the whole tree (for reflections and far haze)
vec3 treeGlowCheap(vec3 ro, vec3 rd) {
  vec3 g = vec3(0.0);
  for (int i = 0; i < 8; i++) {
    vec4 c = uLobe[i];
    vec3 oc = c.xyz - ro; float tc = max(dot(oc, rd), 0.0);
    float h2 = dot(oc, oc) - tc * tc;
    float s = c.w * 0.75;
    g += LEAFC * exp(-h2 / (s * s)) * 0.28;
  }
  return g * tolPow();
}
// fruit like small lamps hanging among the leaves
vec3 fruitLight(vec3 ro, vec3 rd, float tmax, out float hitT) {
  vec3 col = vec3(0.0); hitT = -1.0;
  for (int i = 0; i < 16; i++) {
    vec4 f = uFruit[i];
    if (f.y < -50.0) continue;
    vec3 c = f.xyz + vec3(0.0, 0.05 * sin(uTime * 0.9 + float(i)), 0.0);
    vec3 oc = c - ro; float tc = dot(oc, rd);
    if (tc < 0.0 || tc > tmax + f.w) continue;
    float h2 = dot(oc, oc) - tc * tc;
    float r2 = f.w * f.w;
    if (h2 < r2) {
      float k = sqrt(1.0 - h2 / r2);
      col += FRUITC * (2.5 + 5.0 * k * k) * uGlow;
      hitT = tc - f.w * k;
    }
    col += FRUITC * 0.5 * uGlow * (r2 / (h2 + r2 * 0.6)) * 0.35;
  }
  return col;
}

// ---- the world-space entry points ----
vec4 treeOfLife(vec3 ro, vec3 rd, float tmax, float jit, out float tHit) {
  float S = uTolScale;
  vec3 o = (ro - uTolPos) / S;
  float tm = tmax / S;
  tHit = -1.0;
  vec3 c0 = vec3(0.5, 11.0, 0.0);
  vec3 oc = o - c0; float b = dot(oc, rd), h = b * b - dot(oc, oc) + 22.0 * 22.0;
  if (h < 0.0) return vec4(tolGlowCheapW(ro, rd), 1.0);
  float dist = length(oc);
  vec3 col = vec3(0.0); float T = 1.0;
  if (dist > 900.0) {
    // far: a pale glowing crown over a faint trunk
    vec3 g = treeGlowCheap(o, rd);
    return vec4(g * 1.6, 1.0);
  }
  float tt = treeMarch(o, rd, tm);
  float depth = tm;
  vec3 bark = vec3(0.0);
  if (tt > 0.0) { vec3 p = o + rd * tt; bark = tolBark(p, treeN(p)); depth = tt; tHit = tt * S; }
  vec4 cm = crownMarch(o, rd, depth, jit, 1.0);
  float fh; vec3 fl = fruitLight(o, rd, depth, fh);
  col = cm.rgb + fl;
  T = cm.a;
  if (tt > 0.0) { col += T * bark; T = 0.0; }
  col += tolGlowCheapW(ro, rd) * T;
  return vec4(col, T);
}
// the tree's light on a world point (before the surface's albedo and facing)
vec3 tolGlowAt(vec3 p, vec3 n) {
  vec3 tc = uTolPos + vec3(0.5, 13.0, 0.0) * uTolScale;
  vec3 l = tc - p; float d2 = dot(l, l) / (uTolScale * uTolScale);
  float k = sat(dot(n, normalize(l)));
  return LIFEC * tolPow() * (0.35 + 0.65 * k) * 450.0 / (d2 + 150.0);
}
vec3 tolGlowCheapW(vec3 ro, vec3 rd) { return treeGlowCheap((ro - uTolPos) / uTolScale, rd) * 0.14; }

// dusk sky, deep blue, with the garden's dark treeline on the far horizon
vec3 duskSkyT(vec3 rd) {
  float y = rd.y;
  vec3 zen = vec3(0.012, 0.022, 0.06), hor = vec3(0.12, 0.13, 0.22);
  vec3 c = mix(hor, zen, pow(sat(y * 2.0), 0.6));
  // a last band of afterglow low in the west (to the left)
  float az = atan(rd.x, rd.z);
  c += vec3(0.25, 0.12, 0.06) * exp(-pow((az - 1.3) * 1.2, 2.0)) * exp(-max(y, 0.0) * 14.0);
  // a few early stars, faint
  vec3 sd = floor(rd * 900.0);
  c += vec3(0.8, 0.85, 1.0) * step(0.9985, hash13(sd)) * smoothstep(0.1, 0.4, y) * 0.5;
  return c;
}
`;

export const TREE_SCENE_GLSL = /* glsl */ `
float landMarch(vec3 ro, vec3 rd, float far) {
  float t = 0.05;
  for (int i = 0; i < 110; i++) {
    vec3 p = ro + rd * t;
    float d = p.y - landH(p.xz);
    if (d < 0.003 * t) return t;
    t += max(d * 0.55, 0.02 + 0.006 * t);
    if (t > far) break;
  }
  return -1.0;
}
// the treeline of the dark garden behind the tree, as shapes against the sky
float treeline(vec3 rd, vec3 ro) {
  float az = atan(rd.x - ro.x * 0.0, rd.z);
  float h = 0.025 + 0.02 * fbm(vec2(az * 9.0, 2.0), 4) + 0.012 * fbm(vec2(az * 40.0, 7.0), 3);
  return h;
}
vec3 lightOnLand(vec3 p, vec3 n) {
  // the tree lights the ground round it
  return tolGlowAt(p, n);
}
// reeds at the water's edge on our bank: a few layers of stems and seed heads, as shapes against
// the water, edged with the tree's light. Layer at world z = zp; returns colour and coverage.
uniform float uReeds, uReedZ, uReflCrown;
vec4 reedLayer(vec3 ro, vec3 rd, float zp, float seed) {
  if (rd.z <= 0.0) return vec4(0.0);
  float t = (zp - ro.z) / rd.z;
  if (t <= 0.0) return vec4(0.0);
  vec3 p = ro + rd * t;
  float y = p.y - (-0.2);
  if (y < -0.5 || y > 2.2) return vec4(0.0);
  float cw = 0.07;
  float cov = 0.0, edge = 0.0;
  for (int k = -1; k <= 1; k++) {
    float cx = floor(p.x / cw) + float(k);
    float h1 = hash11(cx * 1.7 + seed);
    if (h1 < 0.62) continue;
    float hgt = 0.5 + 1.2 * pow(hash11(cx * 3.1 + seed), 1.5);
    float lean = (hash11(cx * 5.3 + seed) - 0.5) * 0.35 + 0.04 * sin(uTime * 0.9 + cx * 0.7);
    float x0 = (cx + 0.5) * cw + (h1 - 0.5) * cw * 0.6;
    float yy = clamp(y, 0.0, hgt);
    float sx = x0 + lean * yy * yy / hgt;
    float w = mix(0.008, 0.002, yy / hgt) + 0.004;
    float dx = abs(p.x - sx);
    float stem = (1.0 - smoothstep(w * 0.7, w, dx)) * step(y, hgt);
    // a seed head on some
    float head = 0.0;
    if (hash11(cx * 7.7 + seed) > 0.6) {
      vec2 hq = vec2(p.x - (x0 + lean * hgt), y - hgt + 0.12);
      head = 1.0 - smoothstep(0.8, 1.0, length(hq / vec2(0.018, 0.11)));
    }
    float c = max(stem, head);
    cov = max(cov, c);
    edge = max(edge, c * smoothstep(w * 0.2, w, dx) * smoothstep(0.0, 0.5, y));
  }
  vec3 col = vec3(0.004, 0.006, 0.01) + LIFEC * uGlow * 0.05 * edge;
  return vec4(col, cov * uReeds);
}
vec3 lifeScene(vec2 fc) {
  vec3 ro; vec3 rd = mRay(fc, ro);
  float jit = hash12(fc + fract(uTime * 3.7) * 61.0);
  vec3 col = duskSkyT(rd);
  // the garden's dark treeline far behind
  if (rd.y < treeline(rd, ro) && rd.z > 0.0) col = mix(vec3(0.015, 0.02, 0.035), col, 0.35);
  float depth = 1e4;
  // water
  float tw = rd.y < 0.0 ? (ro.y - 0.0) / -rd.y : -1.0;
  float tl = landMarch(ro, rd, 900.0);
  bool water = tw > 0.0 && (tl < 0.0 || tw < tl);
  if (water) {
    vec3 p = ro + rd * tw;
    depth = tw;
    float sc = 1.0 / (1.0 + tw * 0.02);
    vec2 q = p.xz * 0.6 + vec2(uTime * 0.12, 0.0);
    float e = 0.05;
    float h0 = fbm(q, 4), hx = fbm(q + vec2(e, 0.0), 4), hz = fbm(q + vec2(0.0, e), 4);
    vec3 n = normalize(vec3(-(hx - h0) / e * 0.08 * sc, 1.0, -(hz - h0) / e * 0.08 * sc));
    vec3 rr = reflect(rd, n);
    float F = 0.02 + 0.98 * pow(1.0 - sat(dot(n, -rd)), 5.0);
    vec3 refl = duskSkyT(rr);
    if (rr.y < treeline(rr, p) && rr.z > 0.0) refl = mix(vec3(0.015, 0.02, 0.035), refl, 0.35);
    // the tree in the water: its glow and the fruit, broken by the ripples
    refl += treeGlowCheap(p, rr) * 0.9;
    if (uReflCrown > 0.0) {
      vec4 cr = crownMarch(p, rr, 1e4, jit, 0.0);
      refl = refl * cr.w + cr.rgb;
    }
    float fh; refl += fruitLight(p, rr, 1e4, fh) * 0.6;
    col = vec3(0.004, 0.007, 0.01) + refl * mix(F, 1.0, 0.35) * 0.9;
  } else if (tl > 0.0) {
    vec3 p = ro + rd * tl;
    depth = tl;
    float e = 0.05;
    vec3 n = normalize(vec3(landH(p.xz) - landH(p.xz + vec2(e, 0.0)), e, landH(p.xz) - landH(p.xz + vec2(0.0, e))));
    float g = vnoise(p.xz * 3.0) * vnoise(vec2(p.x * 30.0, p.z * 3.0));
    vec3 alb = mix(vec3(0.03, 0.045, 0.025), vec3(0.1, 0.12, 0.05), g);

    col = alb * vec3(0.06, 0.08, 0.16) * (0.5 + 0.5 * n.y);
    col += alb * lightOnLand(p, n);
    col = mix(col, vec3(0.03, 0.035, 0.06), 1.0 - exp(-tl * 0.004));
  }
  // the tree of life
  float tHit; vec4 tol = treeOfLife(ro, rd, depth, jit, tHit);
  col = col * tol.a + tol.rgb;
  if (tHit > 0.0) depth = tHit;
  col += treeGlowCheap(ro, rd) * 0.05 * (depth > 300.0 ? 1.0 : 0.6);
  // reeds in front of us
  if (uReeds > 0.0) {
    for (int i = 0; i < 3; i++) {
      float zp = uReedZ + float(2 - i) * 1.7;
      vec4 r = reedLayer(ro, rd, zp, float(i) * 13.1);
      col = mix(col, r.rgb, r.a);
    }
  }
  return col;
}
`;
