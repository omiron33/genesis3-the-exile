// The film's two people, built with MakeHuman (MPFB 2, CC0) and posed with its rig in Blender by
// tools/make-humans.py, then baked to signed distance volumes in assets/humans/. A scene loads the
// poses it needs into one 3D texture per person (an "atlas", poses stacked along z) and marches them
// like any other surface of its world, so the people take the world's light, fog, shadows and lens.
// Motion is a choice of pose per frame: two baked poses and a blend (a 16-frame walk cycle, a head
// slowly bowing), a pure function of song time set from JS.
//
// They are drawn only as dark, rim-lit silhouettes (humShade): no face, no lit skin, never nudity.
//
// The figure frame: feet on y = 0, facing +z, x to the figure's left; metres.
import * as THREE from 'three';
import HUM from '/song/assets/humans/index.js';

const SLOTS = 24;    // poses per atlas (2048 / slab depth)

// Load poses (keys of assets/humans/index.js, all of one grid) into one atlas.
export async function humanAtlas(keys) {
  const poses = keys.map((k) => { const e = HUM.poses[k]; if (!e) throw Error('no baked pose ' + k + ' (run tools/make-humans.py)'); return { key: k, ...e }; });
  const grid = HUM.grids[poses[0].grid];
  if (poses.some((p) => p.grid !== poses[0].grid)) throw Error('an atlas holds one grid');
  if (poses.length > SLOTS || (grid.n[2] + 2) * poses.length > 2048) throw Error('too many poses for one atlas');
  const [nx, ny, nz] = grid.n;
  const sz = nz + 2, zt = sz * poses.length;
  const data = new Uint8Array(nx * ny * zt * 2);
  // padding between slabs reads as "far outside"
  for (let i = 0; i < data.length; i += 2) data[i] = 255;
  const slab = nx * ny * nz * 2;
  await Promise.all(poses.map(async (p, i) => {
    const r = await fetch('/song/assets/humans/' + p.file + '?' + p.sha);
    if (!r.ok) throw Error('missing ' + p.file + ' (run tools/make-humans.py)');
    const b = new Uint8Array(await r.arrayBuffer());
    if (b.length !== slab) throw Error('bad size ' + p.file);
    data.set(b, (i * sz + 1) * nx * ny * 2);
  }));
  const tex = new THREE.Data3DTexture(data, nx, ny, zt);
  tex.format = THREE.RGFormat; tex.type = THREE.UnsignedByteType;
  tex.minFilter = tex.magFilter = THREE.LinearFilter;
  tex.wrapS = tex.wrapT = tex.wrapR = THREE.ClampToEdgeWrapping;
  tex.unpackAlignment = 1; tex.generateMipmaps = false;
  tex.needsUpdate = true;
  const lo = poses.map((p) => new THREE.Vector3(...p.lo));
  while (lo.length < SLOTS) lo.push(new THREE.Vector3(...poses[0].lo));
  const index = Object.fromEntries(poses.map((p, i) => [p.key, i]));
  return {
    tex, index, poses: Object.fromEntries(poses.map((p) => [p.key, p])), grid,
    // uniforms for an atlas named `name` (see humanGLSL)
    uniforms(name) {
      return { [name]: tex, [name + 'N']: [nx, ny, nz], [name + 'Lo']: lo, [name + 'K']: new THREE.Vector4(grid.vox, grid.clamp, zt, grid.vox < 0.008 ? 1 : 0) };
    },
    slot(key) { const i = index[key]; if (i === undefined) throw Error('pose not in atlas: ' + key); return i; },
  };
}

// The pose value for the shader: [slab A, slab B, blend]. pose(a) holds one pose; pose(a, b, f) blends.
export function pose(atlas, a, b = a, f = 0) { return [atlas.slot(a), atlas.slot(b), Math.min(1, Math.max(0, f))]; }

// A walk: `set` is e.g. 'man-leaves'; phase in cycles (any real number, 1 = one stride pair).
export function walkPose(atlas, set, phase, n = 16) {
  const x = ((phase % 1) + 1) % 1 * n, i = Math.floor(x), f = x - i;
  const k = (j) => `${set}-walk${String(j % n).padStart(2, '0')}`;
  return [atlas.slot(k(i)), atlas.slot(k(i + 1)), f];
}

// GLSL for atlases named by `names` (e.g. ['uHumA', 'uHumB']): for each, `float <name>Fig(vec3 q,
// vec3 pose, out float mat)` returns the distance to the posed figure at q (figure frame) and its
// material (0 skin, 0.5 hair, 0.85 fig leaves, 1 garment of skin). A name given as null gets a stub (no figure).
export function humanGLSL(names) {
  let s = /* glsl */ `
// a dark figure's light: almost nothing on the body, the light behind it wrapping its edges.
// L, Lc: the light (direction toward it, colour); amb: the sky's fill. mat as above.
vec3 humShade(vec3 n, vec3 rd, float mat, vec3 L, vec3 Lc, vec3 amb, float rimK) {
  float hair = smoothstep(0.25, 0.5, mat) * smoothstep(0.75, 0.5, mat), cloth = smoothstep(0.6, 0.8, mat);
  vec3 alb = mix(mix(vec3(0.016, 0.012, 0.010), vec3(0.012, 0.010, 0.009), hair), vec3(0.03, 0.033, 0.018), cloth);
  float ndv = sat(dot(n, -rd));
  float edge = pow(1.0 - ndv, 4.5);
  // a light behind the figure wraps round the outline; one in front of it leaves the outline dark
  float toward = pow(sat(dot(n, L) + 0.3), 1.5) * (0.25 + 0.75 * sat(dot(rd, L) * 1.5));
  vec3 c = alb * (amb * (0.4 + 0.3 * n.y) + Lc * sat(dot(n, L)) * 0.6);
  // the rim: only the outline that turns toward a light behind the figure; hair glows through it
  // the fig leaves (material 0.85) barely catch it, so they never glow; a garment of skin (1) a little
  c += Lc * edge * toward * mix(mix(0.5, 0.7, hair), mix(0.15, 0.04, smoothstep(0.97, 0.9, mat)), cloth) * rimK;
  return c;
}
`;
  for (const nm of names) {
    if (!nm) continue;
    s += /* glsl */ `
uniform highp sampler3D ${nm};
uniform vec3 ${nm}N;
uniform vec3 ${nm}Lo[${SLOTS}];
uniform vec4 ${nm}K;   // voxel, clamp, atlas depth, fine (strand detail)
vec2 ${nm}Tap(vec3 q, float sl, out float ob) {
  int si = int(sl + 0.5);
  vec3 g = (q - ${nm}Lo[si]) / ${nm}K.x;
  vec3 gc = clamp(g, vec3(0.5), ${nm}N - 0.5);
  ob = length(g - gc) * ${nm}K.x;
  vec2 v = texture(${nm}, vec3(gc.xy / ${nm}N.xy, (float(si) * (${nm}N.z + 2.0) + 1.0 + gc.z) / ${nm}K.z)).rg;
  return vec2((v.r * 2.0 - 1.0) * ${nm}K.y, v.g);
}
float ${nm}Fig(vec3 q, vec3 pose, out float mat) {
  float oa, ob;
  vec2 a = ${nm}Tap(q, pose.x, oa);
  mat = a.y;
  if (oa > ${nm}K.y) return oa + a.x;                 // well outside the box
  if (pose.z > 0.001) { vec2 b = ${nm}Tap(q, pose.y, ob); a = mix(a, b, pose.z); mat = a.y; }
  float d = a.x;
  // hair: fine strands at its edge for the close volumes, loose locks for the far ones
  if (mat > 0.2 && mat < 0.8 && d < 0.02) {
    float hf = smoothstep(0.2, 0.45, mat) * smoothstep(0.8, 0.55, mat);
    if (${nm}K.w > 0.5) d += hf * (0.003 * (vnoise(vec3(q.x * 140.0, q.y * 12.0, q.z * 140.0)) - 0.5) + 0.0012 * (vnoise(q * vec3(320.0, 24.0, 320.0)) - 0.5));
    else d += hf * 0.004 * (vnoise(vec3(q.x * 90.0, q.y * 9.0, q.z * 90.0)) - 0.5);
  }
  // outside the box the path to the figure crosses a face, where the volume already holds the rest
  return oa > 0.0 ? oa + max(d, 0.0) : d;
}
`;
  }
  return s;
}

// Part way along a baked ramp (tools/make-humans.py ramp()): keys <prefix>0 .. <prefix><n>, f in 0..1.
export function rampPose(atlas, prefix, n, f) {
  const x = Math.min(1, Math.max(0, f)) * n, i = Math.min(n - 1, Math.floor(x));
  return [atlas.slot(prefix + i), atlas.slot(prefix + (i + 1)), x - i];
}
export const rampKeys = (prefix, n) => Array.from({ length: n + 1 }, (_, i) => prefix + i);

// The keys of a walk set with its standing pose, and the pose for having walked s metres: standing
// at first, blending into the cycle over the first metre, then the cycle (cycle = metres per stride pair).
export const walkKeys = (set) => [set + '-stand', ...Array.from({ length: 16 }, (_, i) => `${set}-walk${String(i).padStart(2, '0')}`)];
export function walking(H, set, s, cycle, off = 0) {
  const st = Math.min(1, Math.max(0, s) / 0.9);
  const w = walkPose(H, set, s / cycle + off);
  if (st >= 1) return w;
  return [H.slot(set + '-stand'), w[2] < 0.5 ? w[0] : w[1], st * st * (3 - 2 * st)];
}

// A figure as a flat silhouette seen from behind (for scenes that draw far figures as layers): the
// baked volume projected along its z axis, with a 2D signed distance (metres) out to `reach`.
// Returns { tex, lo: [x, y], size: [w, h] } in the figure frame seen from behind (x to the right of
// the picture, y up, feet at 0).
export async function silhouette(key, reach = 0.6) {
  const e = HUM.poses[key], g = HUM.grids[e.grid];
  const [nx, ny, nz] = g.n;
  const b = new Uint8Array(await (await fetch('/song/assets/humans/' + e.file + '?' + e.sha)).arrayBuffer());
  const pad = Math.ceil(reach / g.vox), W = nx + 2 * pad, H = ny + 2 * pad;
  const inside = new Uint8Array(W * H);
  for (let z = 0; z < nz; z++) for (let y = 0; y < ny; y++) for (let x = 0; x < nx; x++) {
    if (b[((z * ny + y) * nx + x) * 2] < 128) inside[(y + pad) * W + (nx - 1 - x + pad)] = 1;   // mirrored: seen from behind
  }
  // exact squared distance transform (Felzenszwalb and Huttenlocher), rows then columns
  const INF = 1e12;
  const edt = (f0) => {
    const f = Float64Array.from(f0), out = new Float64Array(W * H);
    const pass = (get, set, n) => {
      const v = new Int32Array(n), zz = new Float64Array(n + 1), d = new Float64Array(n), fv = new Float64Array(n);
      for (let i = 0; i < n; i++) fv[i] = get(i);
      let k = 0; v[0] = 0; zz[0] = -INF; zz[1] = INF;
      for (let q = 1; q < n; q++) {
        let s;
        while (true) { s = ((fv[q] + q * q) - (fv[v[k]] + v[k] * v[k])) / (2 * q - 2 * v[k]); if (s <= zz[k] && k > 0) k--; else break; }
        if (s <= zz[k]) { v[0] = q; zz[0] = -INF; zz[1] = INF; k = 0; continue; }
        k++; v[k] = q; zz[k] = s; zz[k + 1] = INF;
      }
      k = 0;
      for (let q = 0; q < n; q++) { while (zz[k + 1] < q) k++; d[q] = (q - v[k]) * (q - v[k]) + fv[v[k]]; }
      for (let i = 0; i < n; i++) set(i, d[i]);
    };
    for (let y = 0; y < H; y++) pass((i) => f[y * W + i], (i, v) => { f[y * W + i] = v; }, W);
    for (let x = 0; x < W; x++) pass((i) => f[i * W + x], (i, v) => { out[i * W + x] = v; }, H);
    return out;
  };
  const dOut = edt(Array.from(inside, (m) => (m ? 0 : INF))), dIn = edt(Array.from(inside, (m) => (m ? INF : 0)));
  const data = new Uint16Array(W * H);
  for (let i = 0; i < W * H; i++) {
    const d = (Math.sqrt(dOut[i]) - Math.sqrt(dIn[i]) + (inside[i] ? 0.5 : -0.5)) * g.vox;
    data[i] = THREE.DataUtils.toHalfFloat(Math.max(-reach, Math.min(reach, d)));
  }
  const tex = new THREE.DataTexture(data, W, H, THREE.RedFormat, THREE.HalfFloatType);
  tex.minFilter = tex.magFilter = THREE.LinearFilter; tex.wrapS = tex.wrapT = THREE.ClampToEdgeWrapping;
  tex.needsUpdate = true;
  // the picture's x runs opposite the figure's own x (seen from behind)
  const x0 = -(e.lo[0] + nx * g.vox) - pad * g.vox, y0 = e.lo[1] - pad * g.vox;
  return { tex, lo: [x0, y0], size: [W * g.vox, H * g.vox] };
}
