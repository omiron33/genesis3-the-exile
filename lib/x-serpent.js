// The serpent (scenes s02, s03, s10, s11, s31, s33, s35, s36, s38).
// A photoreal snake drawn by raymarching: its body is a spline sampled at NB points (computed in JS
// each sub-frame, so motion blur is real), swept as a tube with a flattened belly, scaled with
// overlapping keeled dorsal scales and wide ventral scutes in body coordinates (the scales travel
// with the body as it slides). The head is modelled in its own frame: broad cranium, tapering snout,
// brow ridges, labial line, nostrils, a glassy eye with a vertical slit pupil behind a refracting
// cornea, and a forked tongue that flicks. Colour: emerald back, gold flanks, pale belly, a thin-film
// sheen that turns green-gold-teal with the angle. `uDull` (0..1) dulls him for the curse: no sheen,
// dust in every crevice. Every pose is a pure function of song time.
//
// A scene supplies the hooks below the library (envSDF, envMat, sky, atmos, sunVis, extraLight) and
// calls render(ro, rd). Units are metres.

export const NB = 73;          // body points (72 segments, 9 chunks of 8)
export const NC = 9;

// ---------------------------------------------------------------- JS: paths and poses
const sub = (a, b) => [a[0] - b[0], a[1] - b[1], a[2] - b[2]];
const add = (a, b) => [a[0] + b[0], a[1] + b[1], a[2] + b[2]];
const mul = (a, s) => [a[0] * s, a[1] * s, a[2] * s];
const dot = (a, b) => a[0] * b[0] + a[1] * b[1] + a[2] * b[2];
const len = (a) => Math.hypot(a[0], a[1], a[2]);
const nrm = (a) => { const l = len(a) || 1; return [a[0] / l, a[1] / l, a[2] / l]; };
const cross = (a, b) => [a[1] * b[2] - a[2] * b[1], a[2] * b[0] - a[0] * b[2], a[0] * b[1] - a[1] * b[0]];
const lerp = (a, b, k) => [a[0] + (b[0] - a[0]) * k, a[1] + (b[1] - a[1]) * k, a[2] + (b[2] - a[2]) * k];
export const V = { sub, add, mul, dot, len, nrm, cross, lerp };
const sstep = (a, b, x) => { const t = Math.min(1, Math.max(0, (x - a) / (b - a))); return t * t * (3 - 2 * t); };

// A path by arc length from a function f(u), u in [u0, u1] (sampled densely once). Beyond the ends
// it continues straight along the end tangents.
export function pathFn(f, u0 = 0, u1 = 1, n = 1600) {
  const P = [], S = [0];
  for (let i = 0; i <= n; i++) P.push(f(u0 + (u1 - u0) * i / n));
  for (let i = 1; i <= n; i++) S.push(S[i - 1] + len(sub(P[i], P[i - 1])));
  const L = S[n];
  const at = (s) => {
    if (s <= 0) return add(P[0], mul(nrm(sub(P[1], P[0])), s));
    if (s >= L) return add(P[n], mul(nrm(sub(P[n], P[n - 1])), s - L));
    let lo = 0, hi = n;
    while (hi - lo > 1) { const m = (lo + hi) >> 1; if (S[m] <= s) lo = m; else hi = m; }
    return lerp(P[lo], P[hi], (s - S[lo]) / (S[hi] - S[lo] || 1));
  };
  const uAt = (s) => {   // the curve parameter at arc length s (clamped)
    if (s <= 0) return u0; if (s >= L) return u1;
    let lo = 0, hi = n;
    while (hi - lo > 1) { const m = (lo + hi) >> 1; if (S[m] <= s) lo = m; else hi = m; }
    return u0 + (u1 - u0) * (lo + (s - S[lo]) / (S[hi] - S[lo] || 1)) / n;
  };
  const tan = (s) => nrm(sub(at(s + 0.004), at(s - 0.004)));
  return { at, tan, uAt, length: L };
}
// Catmull-Rom through control points
export function pathPts(ctrl, n = 1600) {
  const m = ctrl.length - 1;
  const cr = (u) => {
    const x = Math.min(m - 1e-6, Math.max(0, u * m)), i = Math.floor(x), f = x - i;
    const p0 = ctrl[Math.max(0, i - 1)], p1 = ctrl[i], p2 = ctrl[i + 1], p3 = ctrl[Math.min(m, i + 2)];
    const f2 = f * f, f3 = f2 * f;
    return [0, 1, 2].map((k) => 0.5 * (2 * p1[k] + (-p0[k] + p2[k]) * f + (2 * p0[k] - 5 * p1[k] + 4 * p2[k] - p3[k]) * f2 + (-p0[k] + 3 * p1[k] - 3 * p2[k] + p3[k]) * f3));
  };
  return pathFn(cr, 0, 1, n);
}

// The body's girth along its length x (0 head .. 1 tail), as a fraction of rMax.
export function girth(x) {
  const neck = 0.6 + 0.4 * sstep(0.0, 0.2, x);
  const tail = 1 - 0.9 * Math.pow(sstep(0.55, 1.0, x), 1.25);
  return neck * tail;
}

// A pose. path: from pathFn/pathPts; sHead: arc length of the neck joint along it (the body trails
// behind, toward smaller s). up(s, p): the dorsal direction wanted at s (default world up).
// neck: { len, pos, dir, k } lifts the front of the body off the path on a smooth curve so the head
// sits at pos looking along dir (k 0..1 blends it in). roll tilts the head.
export function pose({ path, sHead, L = 1.5, rMax = 0.024, up, neck, roll = 0, headDir }) {
  const ds = L / (NB - 1);
  const pts = [], ups = [];
  for (let i = 0; i < NB; i++) pts.push(path.at(sHead - i * ds));
  if (neck && neck.k > 0) {
    // cubic from the head (pos, dir) back to the path at sHead - len, joining with its tangent
    const nl = neck.len, j = Math.min(NB - 2, Math.round(nl / ds));
    const P3 = path.at(sHead - j * ds), T3 = path.tan(sHead - j * ds);
    const H = neck.pos, F = nrm(neck.dir);
    const b0 = H, b1 = sub(H, mul(F, nl * 0.42)), b2 = add(P3, mul(T3, nl * 0.42)), b3 = P3;
    const bz = (u) => { const v = 1 - u; return add(add(mul(b0, v * v * v), mul(b1, 3 * v * v * u)), add(mul(b2, 3 * v * u * u), mul(b3, u * u * u))); };
    // arc-length table of the curve
    const M = 64, BP = [], BS = [0];
    for (let i = 0; i <= M; i++) BP.push(bz(i / M));
    for (let i = 1; i <= M; i++) BS.push(BS[i - 1] + len(sub(BP[i], BP[i - 1])));
    const BL = BS[M];
    for (let i = 0; i < j; i++) {
      const target = BL * i / j;
      let q = 0; while (q < M - 1 && BS[q + 1] < target) q++;
      const p = lerp(BP[q], BP[q + 1], (target - BS[q]) / (BS[q + 1] - BS[q] || 1));
      pts[i] = lerp(pts[i], p, neck.k);
    }
    // the body behind slides back so the length stays right (spacing restored along the path)
  }
  // dorsal frame
  for (let i = 0; i < NB; i++) {
    const T = nrm(sub(pts[Math.max(0, i - 1)], pts[Math.min(NB - 1, i + 1)]));
    let u = up ? up(sHead - i * ds, pts[i]) : [0, 1, 0];
    if (neck && neck.k > 0 && i * ds < neck.len) u = nrm(lerp(u, [0, 1, 0], neck.k * (1 - sstep(0.5, 1, i * ds / neck.len))));
    u = sub(u, mul(T, dot(u, T)));
    if (len(u) < 1e-4) u = ups[i - 1] ?? [0, 1, 0];
    ups.push(nrm(u));
  }
  const radii = pts.map((_, i) => rMax * girth(i / (NB - 1)));
  let F = headDir ? nrm(headDir) : (neck && neck.k > 0 ? nrm(lerp(nrm(sub(pts[0], pts[1])), nrm(neck.dir), neck.k)) : nrm(sub(pts[0], pts[1])));
  let U = sub(ups[0], mul(F, dot(ups[0], F)));
  U = nrm(U);
  if (roll) { const R = cross(U, F); U = nrm(add(mul(U, Math.cos(roll)), mul(R, Math.sin(roll)))); }
  return { pts, ups, radii, head: { pos: pts[0], F, U }, rMax, ds };
}

// A sinuous ground path for lateral undulation: the body follows it exactly (as a real snake does).
export function wavePath(origin, dir, { amp = 0.08, wave = 0.55, length = 6, y = 0, ground } = {}) {
  const d = nrm([dir[0], 0, dir[2]]), side = [-d[2], 0, d[0]];
  return pathFn((u) => {
    const a = amp * Math.sin(2 * Math.PI * u / wave) * sstep(-0.2, 0.6, u);
    const p = add(add(origin, mul(d, u)), mul(side, a));
    p[1] = (ground ? ground(p[0], p[2]) : 0) + y;
    return p;
  }, -length * 0.5, length * 0.5, 2400);
}

// The tongue: a flick schedule. starts: song times when a flick begins. Returns [extension 0..1,
// flick phase, fork spread, droop].
export function tongue(t, starts, dur = 0.55) {
  for (const t0 of starts) {
    const x = (t - t0) / dur;
    if (x >= 0 && x <= 1) {
      const ext = Math.sin(Math.PI * Math.min(1, x * 1.15)) ** 0.6 * (x < 0.87 ? 1 : 1 - (x - 0.87) / 0.13);
      return [Math.max(0, ext), (t - t0) * 2 * Math.PI * 7.5, 0.35 + 0.25 * Math.sin(x * Math.PI), 0.15];
    }
  }
  return [0, 0, 0.3, 0];
}

// Fill the uniforms of a pose (call from a scene's update(t, u)).
export function applyPose(u, P, tg = [0, 0, 0.3, 0]) {
  const B = u.uB.value, Uu = u.uU.value, C = u.uCk.value;
  for (let i = 0; i < NB; i++) {
    B[4 * i] = P.pts[i][0]; B[4 * i + 1] = P.pts[i][1]; B[4 * i + 2] = P.pts[i][2]; B[4 * i + 3] = P.radii[i];
    Uu[3 * i] = P.ups[i][0]; Uu[3 * i + 1] = P.ups[i][1]; Uu[3 * i + 2] = P.ups[i][2];
  }
  let lo = [1e9, 1e9, 1e9], hi = [-1e9, -1e9, -1e9];
  for (let c = 0; c < NC; c++) {
    let a = [1e9, 1e9, 1e9], b = [-1e9, -1e9, -1e9], rm = 0;
    for (let i = c * 8; i <= c * 8 + 8; i++) { for (let k = 0; k < 3; k++) { a[k] = Math.min(a[k], P.pts[i][k]); b[k] = Math.max(b[k], P.pts[i][k]); } rm = Math.max(rm, P.radii[i]); }
    const cen = mul(add(a, b), 0.5), r = len(sub(b, a)) * 0.5 + rm * 1.3 + 0.002;
    C[4 * c] = cen[0]; C[4 * c + 1] = cen[1]; C[4 * c + 2] = cen[2]; C[4 * c + 3] = r;
    for (let k = 0; k < 3; k++) { lo[k] = Math.min(lo[k], cen[k] - r); hi[k] = Math.max(hi[k], cen[k] + r); }
  }
  const h = P.head;
  for (let k = 0; k < 3; k++) { lo[k] = Math.min(lo[k], h.pos[k] - 0.16); hi[k] = Math.max(hi[k], h.pos[k] + 0.16); }
  const bc = mul(add(lo, hi), 0.5);
  u.uBS.value = [bc[0], bc[1], bc[2], len(sub(hi, lo)) * 0.5];
  u.uHP.value.set(...h.pos); u.uHF.value.set(...h.F); u.uHU.value.set(...h.U);
  u.uTg.value = tg;
  u.uRM.value = P.rMax;
  u.uSL.value = P.ds;
}

export const SERPENT_UNIFORMS = () => ({
  uB: new Float32Array(NB * 4), uU: new Float32Array(NB * 3), uCk: new Float32Array(NC * 4),
  uBS: [0, 0, 0, 0.01], uHP: [0, 0, 0], uHF: [0, 0, 1], uHU: [0, 1, 0], uTg: [0, 0, 0.3, 0],
  uRM: 0.024, uSL: 0.027, uHS: 1.0,
  uSunDir: [0, 1, 0], uSunCol: [1, 1, 1], uSkyCol: [0.3, 0.4, 0.6], uGndCol: [0.1, 0.1, 0.05],
  uDull: 0.0, uWet: 0.0, uSheen: 1.0, uFocus: 1.0, uAper: 0.0, uExp: 1.0, uDbg: 0.0, uEyeRefl: 1.0,
});

// ---------------------------------------------------------------- GLSL
export const SERPENT_GLSL = /* glsl */ `
#define NB ${NB}
#define NC ${NC}
uniform vec4 uB[NB];
uniform vec3 uU[NB];
uniform vec4 uCk[NC];
uniform vec4 uBS;
uniform vec3 uHP, uHF, uHU;
uniform vec4 uTg;
uniform float uRM, uSL, uHS;
uniform vec3 uSunDir, uSunCol, uSkyCol, uGndCol;
uniform float uDull, uWet, uSheen, uFocus, uAper, uExp, uDbg, uEyeRefl;

// ---- scene hooks (each scene defines these after the library)
float envSDF(vec3 p, out float id);
void envMat(vec3 p, inout vec3 n, float id, out vec3 alb, out float rough, out float spec);
vec3 sky(vec3 rd);
vec3 atmos(vec3 col, vec3 ro, vec3 rd, float t);
float sunVis(vec3 p);
vec3 extraLight(vec3 p, vec3 n, vec3 rd, vec3 alb, float rough);

// ---- the lens: thin lens with a stratified, per-pixel rotated aperture sample
vec3 lensRay(vec2 fc, out vec3 ro) {
  vec3 rd = camRay(fc, ro);
  if (uAper <= 0.0) return rd;
  vec3 ww = normalize(uCamTarget - uCamPos);
  vec3 up = vec3(sin(uCamRoll), cos(uCamRoll), 0.0);
  vec3 uu = normalize(cross(ww, up)), vv = cross(uu, ww);
  vec3 fp = ro + rd * (uFocus / dot(rd, ww));
  vec2 j = fract(uJitter + 0.5 + hash22(fc * 0.731 + 17.0));
  float r = sqrt(j.x), th = 6.2831853 * j.y;
  ro += (uu * cos(th) + vv * sin(th)) * r * uAper;
  return normalize(fp - ro);
}

// ---- body
float girthAt(float si) { int i = int(si); return mix(uB[i].w, uB[min(i + 1, NB - 1)].w, fract(si)); }
float bodySDF(vec3 p, out float si) {
  float best = 1e5; si = 0.0;
  for (int c = 0; c < NC; c++) {
    vec4 ck = uCk[c];
    if (length(p - ck.xyz) - ck.w > best) continue;
    for (int j = 0; j < 8; j++) {
      int i = c * 8 + j;
      vec4 a = uB[i], b = uB[i + 1];
      vec3 pa = p - a.xyz, ba = b.xyz - a.xyz;
      float h = sat(dot(pa, ba) / dot(ba, ba));
      float d = length(pa - ba * h) - mix(a.w, b.w, h);
      if (d < best) { best = d; si = float(i) + h; }
    }
  }
  // the belly is flat: cut the underside with the dorsal frame of the nearest segment
  {
    int i = min(int(si), NB - 2); float h = si - float(i);
    vec3 c = mix(uB[i].xyz, uB[i + 1].xyz, h);
    float r = mix(uB[i].w, uB[i + 1].w, h);
    vec3 U = normalize(mix(uU[i], uU[i + 1], h));
    float y = dot(p - c, U);
    best = smax(best, -y - 0.62 * r, 0.35 * r);
    // a faint spine ridge
    best -= 0.03 * r * exp(-pow(length((p - c) - U * dot(p - c, U)) / (0.25 * r), 2.0)) * step(0.0, y);
  }
  return best;
}

// ---- head (local: x right, y up, z forward; origin at the neck joint)
mat3 headFrame() { vec3 F = normalize(uHF), U = normalize(uHU - F * dot(uHU, F)); vec3 R = cross(U, F); return mat3(R, U, F); }
const vec3 EYE_C = vec3(0.0148, 0.0048, 0.047);
const float EYE_R = 0.0058;
float mouthY(float z) { return -0.0032 - 0.0012 * smoothstep(0.075, 0.03, z) + 0.0006 * smoothstep(0.03, 0.0, z); }
float headSDF(vec3 q, out float part) {
  q /= uHS;
  vec3 s = vec3(abs(q.x), q.y, q.z);
  float d = sdEllipsoid(q - vec3(0.0, 0.0028, 0.03), vec3(0.0185, 0.0125, 0.032));
  d = smin(d, sdEllipsoid(q - vec3(0.0, 0.0006, 0.058), vec3(0.0128, 0.0088, 0.024)), 0.012);
  d = smin(d, sdEllipsoid(q - vec3(0.0, -0.0058, 0.042), vec3(0.0168, 0.0074, 0.035)), 0.007);
  // the flat crown, and the jaw's flat underside
  d = smax(d, q.y - 0.0118 + 0.004 * smoothstep(0.05, 0.085, q.z), 0.006);
  d = smax(d, -q.y - 0.0118, 0.004);
  // the neck
  d = smin(d, sdCapsule(q, vec3(0.0, -0.001, -0.03), vec3(0.0, 0.0, 0.012), uRM * 0.62 / uHS), 0.014);
  // brow ridges (the supraocular scales) give him his stern look
  d = smin(d, sdEllipsoid(s - vec3(0.0122, 0.0088, 0.046), vec3(0.006, 0.0026, 0.011)), 0.004);
  // eye sockets
  d = smax(d, -(length(s - EYE_C) - EYE_R - 0.0007), 0.0016);
  // the lip line
  d += 0.0007 * exp(-pow((q.y - mouthY(q.z)) / 0.0008, 2.0)) * smoothstep(0.003, 0.008, s.x) * smoothstep(0.004, 0.012, q.z);
  // nostrils
  d += 0.0012 * exp(-dot(s - vec3(0.0072, 0.0046, 0.0765), s - vec3(0.0072, 0.0046, 0.0765)) / (0.0012 * 0.0012));
  float e = length(s - EYE_C) - EYE_R;
  part = 2.0;
  if (e < d) { part = 3.0; d = e; }
  return d * uHS;
}
// the tongue: out of the notch at the snout tip, flicking up and down, forked
float tongueSDF(vec3 q) {
  float ext = uTg.x;
  if (ext < 0.01) return 1e5;
  q /= uHS;
  vec3 o = vec3(0.0, -0.0026, 0.074);
  float Lt = 0.058 * ext;
  float a1 = -0.12 - uTg.w + 0.22 * sin(uTg.y);
  float a2 = a1 + 0.5 * sin(uTg.y - 1.1);
  vec3 d1 = vec3(0.0, sin(a1), cos(a1));
  vec3 m = o + d1 * Lt * 0.62;
  vec3 d2 = vec3(0.0, sin(a2), cos(a2));
  float t = sdRoundCone(q, o, m, 0.0013, 0.0009);
  float sp = uTg.z;
  vec3 e1 = m + normalize(d2 + vec3(sp * 0.5, 0.0, 0.0)) * Lt * 0.38;
  vec3 e2 = m + normalize(d2 - vec3(sp * 0.5, 0.0, 0.0)) * Lt * 0.38;
  t = min(t, sdRoundCone(q, m, e1, 0.0009, 0.00035));
  t = min(t, sdRoundCone(q, m, e2, 0.0009, 0.00035));
  return t * uHS;
}

// the serpent: distance, part (1 body, 2 head, 3 eye, 4 tongue), si (body coordinate)
float gBM = 0.01;   // bounding margin: small for the march, large for soft shadows (no false penumbra)
float serpentSDF(vec3 p, out float part, out float si) {
  si = 0.0; part = 1.0;
  float bb = length(p - uBS.xyz) - uBS.w;
  if (bb > gBM) return bb;
  float d = bodySDF(p, si);
  vec3 hp = p - uHP;
  float hb = length(hp - uHF * 0.035 * uHS) - 0.075 * uHS;
  if (hb < d) {
    mat3 HF = headFrame();
    vec3 q = hp * HF;
    float hpart;
    float h = headSDF(q, hpart);
    float k = 0.01 * uHS * sat(-hb / 0.03) + 1e-5;   // no blend at the bound's edge (no seam)
    float hh = smin(h, d, k);
    if (h < d + k * 0.5) part = hpart;
    if (part > 1.5 && part < 2.5 && q.z < (0.022 + 0.01 * sat(1.0 - abs(q.x) / 0.016) * sat(q.y / 0.008 + 0.5)) * uHS) { part = 1.0; }
    d = hpart > 2.5 && h < d ? h : hh;
    float tg = tongueSDF(q);
    if (tg < d) { d = tg; part = 4.0; }
  }
  return d;
}

float mapAll(vec3 p, out float id, out float si) {
  float ds = serpentSDF(p, id, si);
  float eid; float de = envSDF(p, eid);
  if (de < ds) { id = eid; return de; }
  return ds;
}
float mapD(vec3 p) { float a, b; return mapAll(p, a, b); }

vec3 calcNormal(vec3 p, float e) {
  const vec2 k = vec2(1, -1);
  return normalize(k.xyy * mapD(p + k.xyy * e) + k.yyx * mapD(p + k.yyx * e) + k.yxy * mapD(p + k.yxy * e) + k.xxx * mapD(p + k.xxx * e));
}
float softShadow(vec3 ro, vec3 rd, float tmin, float tmax, float k) {
  float res = 1.0, t = tmin;
  gBM = 0.4;
  for (int i = 0; i < 32; i++) {
    float h = mapD(ro + rd * t);
    res = min(res, k * h / t);
    t += clamp(h, 0.003 + 0.02 * t, 0.25);
    if (res < 0.002 || t > tmax) break;
  }
  gBM = 0.01;
  return sat(res);
}
float calcAO(vec3 p, vec3 n, float sc) {
  float o = 0.0, w = 1.0;
  for (int i = 1; i <= 5; i++) { float h = sc * float(i) / 5.0; o += w * (h - mapD(p + n * h)); w *= 0.7; }
  return sat(1.0 - 2.2 * o / sc);
}

// ---- scales
// dorsal scales: overlapping shingles on a rhombic lattice in (u along, v around), in scale units.
// Each scale is a rounded rhombus that reaches back over the one behind it; where two overlap, the
// one nearer the head lies on top. Its surface rises toward its free back edge and is domed across.
// Returns height; id = the visible scale; e = how close to an overlying edge (for the crease shadow).
float scaleH(vec2 uv, out vec2 id) {
  vec2 g = vec2(uv.x + uv.y, uv.x - uv.y) * 0.70710678;
  vec2 c0 = floor(g);
  float bestU = 1e5, h = 0.0; id = c0;
  for (int j = -1; j <= 1; j++) for (int i = -1; i <= 1; i++) {
    vec2 c = c0 + vec2(i, j);
    vec2 cc = (c + 0.5);
    vec2 ctr = vec2(cc.x + cc.y, cc.x - cc.y) * 0.70710678;     // centre back in (u, v)
    vec2 d = uv - ctr;
    // the scale reaches 0.35 back past its cell and is a little wider than its cell
    float du = d.x - 0.18;
    float shape = abs(du) / 0.95 + abs(d.y) / 0.78;
    shape = mix(shape, length(vec2(du / 0.95, d.y / 0.78)), 0.45);   // round the corners
    if (shape < 1.0 && ctr.x < bestU) {
      bestU = ctr.x; id = c;
      float rise = sat((du + 0.95) / 1.9);
      h = 0.25 + 0.75 * rise - 0.35 * pow(d.y / 0.78, 2.0) + 0.1 * (1.0 - shape);
    }
  }
  return h;
}
// wide belly plates (one per scale length)
float scuteH(float u, out float id) {
  float f = fract(u * 0.55); id = floor(u * 0.55);
  return smoothstep(0.0, 0.06, f) * (0.6 + 0.4 * (1.0 - f));
}

// thin-film sheen: the colour scales flash with the angle (green, gold, a little teal)
vec3 sheenCol(float c, float jit) {
  float ph = 2.2 * c + jit;
  vec3 a = 0.5 + 0.5 * cos(6.2831853 * (vec3(0.0, 0.1, 0.27) + ph * 0.55 + 0.32));
  return mix(vec3(0.55, 0.85, 0.25), a * vec3(0.9, 1.1, 0.6), 0.55);
}

float D_GGX(float nh, float a) { float a2 = a * a; float d = nh * nh * (a2 - 1.0) + 1.0; return a2 / (PI * d * d); }
float V_SmithJ(float nl, float nv, float a) { float k = a * 0.5; return 1.0 / ((nl * (1.0 - k) + k) * (nv * (1.0 - k) + k)) * 0.25; }

// one lit surface: sun (with shadow and the scene's sunVis), sky, ground bounce, environment
vec3 lightSurf(vec3 p, vec3 n, vec3 rd, vec3 alb, float rough, vec3 F0, float sh, float ao, float sss) {
  vec3 v = -rd, L = normalize(uSunDir), h = normalize(L + v);
  float nl = sat(dot(n, L)), nv = max(dot(n, v), 1e-3), nh = sat(dot(n, h)), vh = sat(dot(v, h));
  float a = max(rough * rough, 0.002);
  vec3 F = F0 + (1.0 - F0) * pow(1.0 - vh, 5.0);
  vec3 spec = D_GGX(nh, a) * V_SmithJ(nl, nv, a) * F;
  vec3 col = (alb / PI * (1.0 - F) + spec) * uSunCol * nl * sh;
  // a little light through thin edges and wrap for skin
  col += alb * uSunCol * sss * pow(sat(dot(rd, L)), 3.0) * sh * 0.4;
  float hemi = 0.5 + 0.5 * n.y;
  col += alb * (uSkyCol * hemi + uGndCol * (1.0 - hemi)) * ao;
  vec3 r = reflect(rd, n);
  vec3 Fe = F0 + (1.0 - F0) * pow(1.0 - nv, 5.0) / (1.0 + 4.0 * rough);
  col += sky(r) * Fe * ao * (1.0 - rough * 0.85) * mix(0.35, 1.0, sat(r.y * 2.0 + 0.6));
  col += extraLight(p, n, rd, alb, rough);
  return col;
}

// the serpent's skin at p (part 1 body, 2 head, 4 tongue). Eye is shaded separately.
vec3 shadeSerpent(vec3 p, vec3 n, vec3 rd, float part, float si, float sh, float ao) {
  vec3 alb; float rough; vec3 F0; float sheenAmt = 0.0; float crev = 0.0;
  float dorsal = 0.0;
  if (part < 1.5) {
    int i = min(int(si), NB - 2); float h = si - float(i);
    vec3 c = mix(uB[i].xyz, uB[i + 1].xyz, h);
    vec3 T = normalize(uB[i].xyz - uB[i + 1].xyz);
    vec3 U = normalize(mix(uU[i], uU[i + 1], h)); U = normalize(U - T * dot(U, T));
    vec3 S = cross(T, U);
    float r = mix(uB[i].w, uB[i + 1].w, h);
    vec3 q = p - c;
    float th = atan(dot(q, S), dot(q, U));          // 0 on the back, ±PI on the belly
    float s = si * uSL - dot(q, T);                  // metres from the neck
    float sl = 0.0047 * (0.55 + 0.45 * r / uRM);     // scale size follows girth a little
    dorsal = cos(th);
    float belly = smoothstep(2.15, 2.45, abs(th));
    vec2 uv = vec2(s / sl, th * r / sl * 1.05);
    vec2 cid; float sid;
    float hs = scaleH(uv, cid);
    float hb = scuteH(s / sl, sid);
    float hh = mix(hs, hb, belly);
    // bump normal from the height field
    float e = 0.06; vec2 tmp; float tmp2;
    float hu = mix(scaleH(uv + vec2(e, 0.0), tmp), scuteH((s / sl) + e, tmp2), belly);
    float hv = mix(scaleH(uv + vec2(0.0, e), tmp), hb, belly);
    vec3 B = normalize(cross(n, T));
    float bump = 0.28 * (1.0 + 0.8 * uDull);
    n = normalize(n - bump * clamp((hu - hh) / e, -3.0, 3.0) * T * 0.35 - bump * clamp((hv - hh) / e, -3.0, 3.0) * B * 0.35);
    crev = (1.0 - smoothstep(0.22, 0.5, hs)) * (1.0 - belly) + belly * (1.0 - smoothstep(0.0, 0.25, hb));
    // colour: emerald back, gold flanks, pale belly; a broken chain of darker diamonds and a dotted
    // row of pale scales down the spine (like a green tree python)
    float jit = hash12(cid);
    float flank = smoothstep(0.65, -0.45, dorsal);
    vec3 back = vec3(0.06, 0.19, 0.045) * (0.92 + 0.16 * jit);
    vec3 side = vec3(0.3, 0.32, 0.07) * (0.92 + 0.16 * jit);
    vec3 bel = vec3(0.42, 0.40, 0.14);
    alb = mix(back, side, flank);
    float blot = smoothstep(0.55, 0.75, vnoise(vec2(s * 11.0, th * 2.2)) + 0.25 * cos(th * 2.0)) * smoothstep(-0.2, 0.5, dorsal);
    alb = mix(alb, vec3(0.008, 0.05, 0.02), blot * 0.7);
    float spot = step(0.95, hash12(cid + 7.0)) * smoothstep(0.88, 0.98, dorsal) * smoothstep(0.3, 0.8, hs);
    alb = mix(alb, vec3(0.22, 0.32, 0.12), spot * 0.4);
    alb = mix(alb, bel * (0.9 + 0.2 * hash11(sid)), belly);
    alb *= mix(1.0, 0.35, crev);
    alb *= 0.85 + 0.3 * smoothstep(0.3, 1.0, hs) * (1.0 - belly);
    // the tail end goes a little darker
    alb *= 1.0 - 0.3 * smoothstep(0.7, 1.0, si / float(NB - 1));
    rough = mix(0.3, 0.36, belly) + 0.1 * jit;
    F0 = vec3(0.045);
    sheenAmt = (1.0 - belly * 0.7) * (1.0 - crev);
    sheenAmt *= 0.7 + 0.6 * jit;
  } else if (part < 2.5) {
    // the head: large plates on the crown, small scales on the sides, pale lips
    mat3 HF = headFrame();
    vec3 q = ((p - uHP) * HF) / uHS;
    vec3 nl = n * HF;
    float wTop = smoothstep(0.45, 0.8, nl.y) * smoothstep(0.004, 0.012, q.z);
    // crown: large plates (domed)
    // the crown's plates are mirrored left and right, as a real snake's are
    float ax = abs(q.x) + 0.0015;
    vec2 top = voronoiEdge(vec2(ax * 170.0, q.z * 105.0));
    float e = 0.00025;
    float tx = voronoiEdge(vec2((ax + e) * 170.0, q.z * 105.0)).x, tz = voronoiEdge(vec2(ax * 170.0, (q.z + e) * 105.0)).x;
    float d0 = smoothstep(0.0, 0.25, top.x);
    vec3 gTop = vec3(smoothstep(0.0, 0.25, tx) - d0, 0.0, smoothstep(0.0, 0.25, tz) - d0) / e;
    // sides: the same overlapping scales as the body, a little smaller
    float hsl = 0.0034;
    float ang = atan(q.x, q.y + 0.004);
    vec2 huv = vec2(-q.z / hsl, ang * 0.016 / hsl);
    vec2 hid; float hh0 = scaleH(huv, hid);
    vec2 tmp; float hhu = scaleH(huv + vec2(0.06, 0.0), tmp), hhv = scaleH(huv + vec2(0.0, 0.06), tmp);
    vec3 gSide = (vec3(0.0, 0.0, -(hhu - hh0)) + vec3(cos(ang), -sin(ang), 0.0) * (hhv - hh0)) / 0.06;
    n = normalize(n + HF * mix(gSide * 0.1, gTop * 0.0002, wTop));
    float edge = mix(hh0, top.x * 4.0, wTop);
    float cid = mix(hash12(hid), top.y, wTop);
    crev = mix(1.0 - smoothstep(0.22, 0.5, hh0), (1.0 - smoothstep(0.0, 0.035, top.x)) * 0.6, wTop);
    float side = smoothstep(0.65, -0.45, nl.y);
    alb = mix(vec3(0.06, 0.19, 0.045), vec3(0.3, 0.32, 0.07), side) * (0.92 + 0.16 * cid);
    float lip = smoothstep(0.0014, 0.0, q.y - mouthY(q.z)) * smoothstep(-0.2, 0.3, -nl.y + 0.6);
    alb = mix(alb, vec3(0.5, 0.48, 0.2), lip * 0.85);
    alb = mix(alb, vec3(0.42, 0.40, 0.14), smoothstep(-0.4, -0.8, nl.y));
    // the dark stripe through the eye that snakes wear
    float stripe = exp(-pow((q.y - 0.006 - (q.z - 0.047) * 0.12) / 0.0018, 2.0)) * smoothstep(0.02, 0.04, q.z) * smoothstep(0.075, 0.06, q.z) * side;
    alb = mix(alb, vec3(0.01, 0.05, 0.02), stripe * 0.5);
    float lipLine = exp(-pow((q.y - mouthY(q.z)) / 0.0005, 2.0)) * step(0.004, abs(q.x));
    alb *= 1.0 - 0.85 * lipLine;
    alb *= mix(1.0, 0.45, crev);
    rough = 0.3 + 0.1 * cid;
    F0 = vec3(0.045);
    sheenAmt = (1.0 - crev) * 0.8;
    dorsal = nl.y;
  } else {
    // tongue: dark, wet
    alb = vec3(0.025, 0.02, 0.03); rough = 0.18; F0 = vec3(0.04);
  }
  // the curse: dust in every crevice, the sheen gone, the skin dry
  vec3 dustC = vec3(0.42, 0.35, 0.26);
  float dustK = uDull * (0.3 + 0.7 * crev) * (0.55 + 0.45 * smoothstep(0.3, -0.6, dorsal)) * (0.7 + 0.6 * vnoise(p.xz * 300.0 + p.y * 200.0));
  alb = mix(alb * mix(1.0, 0.6, uDull), dustC, sat(dustK) * 0.75);
  alb = mix(alb, vec3(dot(alb, vec3(0.3, 0.59, 0.11))) * vec3(1.05, 1.0, 0.9), uDull * 0.5);
  rough = mix(rough, 0.62, uDull);
  rough = mix(rough, 0.08, uWet);
  alb *= 1.0 - 0.35 * uWet;
  vec3 col = lightSurf(p, n, rd, alb, rough, F0, sh, ao, 0.15);
  // iridescent sheen: a coloured specular layer that shifts with the angle
  if (sheenAmt > 0.0) {
    vec3 L = normalize(uSunDir), v = -rd, hh = normalize(L + v);
    float nh = sat(dot(n, hh)), nv = sat(dot(n, v));
    float sp = D_GGX(nh, 0.09) * 0.03 * sat(dot(n, L));
    vec3 sc = sheenCol(nv, hash12(floor(vec2(si * 3.7, dorsal * 9.0))) * 0.6);
    float amt = sheenAmt * uSheen * (1.0 - uDull);
    col += sc * sp * uSunCol * sh * amt;
    col += sc * sky(reflect(rd, n)) * 0.10 * pow(1.0 - nv, 2.0) * amt * ao;
  }
  return col;
}

// the eye: a refracting cornea over a gold iris with a vertical slit pupil
vec3 shadeEye(vec3 p, vec3 n, vec3 rd, float sh) {
  mat3 HF = headFrame();
  vec3 q = ((p - uHP) * HF) / uHS;
  float sx = sign(q.x);
  vec3 ec = vec3(EYE_C.x * sx, EYE_C.y, EYE_C.z);
  vec3 axis = normalize(vec3(sx, 0.18, 0.42));
  vec3 rl = (rd * HF);
  vec3 nl = normalize(q - ec);
  // refract into the eye and find the iris plane a little below the cornea
  vec3 rr = refract(rl, nl, 1.0 / 1.376);
  float depth = EYE_R * 0.42;
  vec3 pc = ec + axis * (EYE_R - depth);
  float tt = dot(pc - q, axis) / min(dot(rr, axis), -0.05);
  vec3 ip = q + rr * max(tt, 0.0);
  vec3 e1 = normalize(cross(vec3(0.0, 1.0, 0.0), axis));   // horizontal on the iris
  vec3 e2 = cross(axis, e1);                                 // vertical on the iris
  vec2 iu = vec2(dot(ip - pc, e1), dot(ip - pc, e2)) / EYE_R;
  float rad = length(iu);
  float ang = atan(iu.y, iu.x);
  // iris: gold to amber, radial fibres, darker ring at the edge, green flecks
  float fib = fbm(vec2(ang * 9.0, rad * 3.0), 3);
  float fine = fbm(vec2(ang * 48.0, rad * 6.0), 3);
  vec3 iris = mix(vec3(0.55, 0.36, 0.05), vec3(0.9, 0.68, 0.14), fib * 0.6 + fine * 0.5);
  iris = mix(iris, vec3(0.2, 0.3, 0.05), smoothstep(0.6, 0.9, vnoise(vec2(ang * 14.0, rad * 9.0))) * 0.5);
  iris *= 0.75 + 0.5 * smoothstep(0.35, 0.7, fine);
  // dark flecks and the dark ring at the iris's edge
  iris *= 1.0 - 0.6 * smoothstep(0.7, 0.85, vnoise(vec2(ang * 22.0, rad * 14.0)));
  iris *= mix(1.0, 0.2, smoothstep(0.66, 0.9, rad));
  iris *= 0.7 + 0.3 * smoothstep(0.0, 0.25, abs(iu.x) - 0.08);
  // the slit
  float slitW = 0.085 * sqrt(max(1.0 - pow(iu.y / 0.72, 2.0), 0.0));
  float pupil = smoothstep(slitW + 0.02, slitW - 0.005, abs(iu.x));
  iris = mix(iris, vec3(0.004), pupil);
  // sun through the cornea onto the iris (caustic glow on the far side from the light)
  vec3 Ll = normalize(uSunDir * HF);
  float lit = 0.55 + 0.45 * sat(dot(nl, Ll) * 0.5 + 0.5);
  vec3 col = iris * (uSunCol * 0.32 * lit * (0.35 + 0.65 * sh) + uSkyCol * 0.55) * (1.0 - uDull * 0.5);
  // the cornea: a clear coat that mirrors the world
  float nv = sat(dot(n, -rd));
  float Fr = 0.035 + 0.965 * pow(1.0 - nv, 5.0);
  vec3 r = reflect(rd, n);
  col = col * (1.0 - Fr) + sky(r) * mix(Fr, 0.09, 0.6) * mix(1.0, 0.5, uDull) * uEyeRefl;
  vec3 L = normalize(uSunDir), hh = normalize(L - rd);
  col += uSunCol * pow(sat(dot(n, hh)), 900.0) * 6.0 * sh;
  return col;
}

// ---- the march
// optional speed-ups a scene may set before render(): nothing above y = gCeil but sky (rays start
// where they come down through it, and rays going up skip the march), and beyond gFlatFar the
// ground is taken as the flat plane y = 0 (id 10)
float gCeil = 1e9, gFlatFar = 1e9, gShadowMax = 6.0;
vec4 marchScene(vec3 ro, vec3 rd, float tmax, out float id, out float si) {
  float t = 0.0; id = -1.0; si = 0.0; float d = 1e5;
  if (ro.y > gCeil) {
    if (rd.y >= 0.0) return vec4(ro + rd * tmax, tmax);
    t = (ro.y - gCeil) / -rd.y;
  }
  if (rd.y < 0.0 && ro.y / -rd.y > gFlatFar) {
    float tp = ro.y / -rd.y;
    if (tp < tmax) { id = 10.0; return vec4(ro + rd * tp, tp); }
    return vec4(ro + rd * tmax, tmax);
  }
  for (int i = 0; i < 180; i++) {
    vec3 p = ro + rd * t;
    d = mapAll(p, id, si);
    if (abs(d) < 0.00025 * (1.0 + t * 0.8)) return vec4(p, t);
    t += d * 0.9;
    if (t > tmax) break;
  }
  if (t < tmax && d < 0.004 * (1.0 + t)) return vec4(ro + rd * t, t);   // grazing rays that ran out of steps
  id = -1.0; return vec4(ro + rd * tmax, tmax);
}

float gHitT, gHitId; vec3 gHitP;    // what the last render() hit (for layers drawn over it)
vec3 render(vec3 ro, vec3 rd, float tmax) {
  float id, si;
  vec4 h = marchScene(ro, rd, tmax, id, si);
  gHitT = id < 0.0 ? 1e5 : h.w; gHitId = id; gHitP = h.xyz;
  vec3 col;
  if (id < 0.0) {
    col = sky(rd);
  } else {
    vec3 p = h.xyz;
    vec3 n = calcNormal(p, 0.00012 * (1.0 + h.w));
    vec3 L = normalize(uSunDir);
    float sh = softShadow(p + n * 0.0015, L, 0.002, gShadowMax, 14.0) * sunVis(p);
    float ao = calcAO(p, n, 0.03);
    if (uDbg > 0.5) return uDbg < 1.5 ? n * 0.5 + 0.5 : uDbg < 2.5 ? vec3(ao) : vec3(sh);
    if (id < 4.5) {
      if (id > 2.5 && id < 3.5) col = shadeEye(p, n, rd, sh);
      else col = shadeSerpent(p, n, rd, id, si, sh, ao);
    } else {
      vec3 alb; float rough, spec;
      envMat(p, n, id, alb, rough, spec);
      col = lightSurf(p, n, rd, alb, rough, vec3(spec), sh, ao, 0.3);
    }
  }
  return atmos(col, ro, rd, h.w) * uExp;
}
`;
