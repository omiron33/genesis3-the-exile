// The tree of the knowledge of good and evil: immense, alone on its rise, a dark crown over a short
// massive trunk, with a few red apples hanging under the edge of the leaves, each from its own twig or
// spur with a short stem and a few leaves of its own. Reusable: any scene may prepend TREE_GLSL and call
//   float treeTrace(vec3 ro, vec3 rd, float tmax, float jit, out int id)   // id 1 wood, 2 leaves, 3 fruit,
//                                                     4 a sprig's own leaves, 5 its twig, 6 a stem; -1 if missed
//   vec3  treeShade(vec3 p, vec3 rd, int id, vec3 L, vec3 sunC, vec3 skyC, vec3 gndC)
//   float treeShadow(vec3 p, vec3 L)          // sun transmittance through the crown (for the ground)
// with its uniforms (spread TREE_UNIFORMS into the scene's uniforms). uTreeWind bends the crown and
// tosses the leaves (0 a still afternoon .. 1 a storm); uTreeShiver adds a quick leaf tremble;
// uFruitK hides (0) or shows (1) the fruit. The tree stands at uTreePos (its root collar).
// Everything is a pure function of uTime and the uniforms.
export const TREE_UNIFORMS = {
  uTreePos: [0.0, 6.85, 0.0],
  uTreeWind: 0.08,
  uTreeShiver: 0.0,
  uFruitK: 1.0,
};

export const TREE_GLSL = /* glsl */ `
uniform vec3 uTreePos;
uniform float uTreeWind, uTreeShiver, uFruitK;
float gTreeLeaves = 1.0;   // 0: trace only wood and fruit (a scene drawing its own leaves)
float gLeafStep = 1.0;     // >1: coarser steps through the leaves (reflections)

// the crown: a broad lumpy dome of leaves, a shell some 3.5 m thick over an open, shaded hall of limbs
const vec3 CROWN_C = vec3(1.2, 14.6, 0.8);
const vec3 CROWN_R = vec3(15.0, 7.8, 14.5);

// wind: the whole crown leans and breathes; the higher, the more
vec3 treeBend(vec3 q) {
  float h = sat((q.y - 3.0) / 16.0);
  float w = uTreeWind;
  float gust = 0.6 + 0.4 * sin(uTime * 0.9) * sin(uTime * 0.37 + 1.3);
  vec2 sway = vec2(sin(uTime * 1.3 + q.y * 0.05), cos(uTime * 1.1 + q.y * 0.07)) * (0.25 + 1.6 * w * w) * w;
  vec2 lean = vec2(0.9, 0.3) * w * w * 2.2 * gust;
  q.xz -= (sway + lean) * h * h;
  return q;
}

// ---- wood: trunk, buttress roots, six great limbs, each forked ----
float tcap(vec3 p, vec3 a, vec3 b, float ra, float rb) {
  vec3 pa = p - a, ba = b - a; float h = sat(dot(pa, ba) / dot(ba, ba));
  return length(pa - ba * h) - mix(ra, rb, h);
}
void limbPts(int i, out vec3 a, out vec3 m, out vec3 b, out vec3 c) {
  float fi = float(i);
  float ang = fi * 1.0472 + 0.35 * (hash11(fi * 7.1) - 0.5) + 0.3;
  vec2 d = vec2(cos(ang), sin(ang));
  float lift = hash11(fi * 3.3);
  a = vec3(d.x * 0.5, 4.3 + 0.9 * lift, d.y * 0.5);
  m = vec3(d.x * (4.2 + 1.2 * lift), 7.4 + 1.4 * hash11(fi + 4.0), d.y * (4.2 + 1.2 * lift));
  float R = 9.5 + 3.0 * hash11(fi * 1.9);
  b = vec3(d.x * R, 9.8 + 4.6 * hash11(fi * 5.7), d.y * R);
  vec2 d2 = rot(0.7 * (hash11(fi * 2.3) - 0.5) + 0.5) * d;
  c = m + vec3(d2.x * 5.5, 3.8 + 1.2 * lift, d2.y * 5.5);
}
// limbs wander a little: woodSD bends the space it measures them in by this
vec3 limbWander(vec3 q) { return vec3(sin(q.y * 0.9 + q.z * 0.3), 0.0, cos(q.y * 0.8 + q.x * 0.35)) * 0.22 * smoothstep(4.0, 8.0, q.y); }

// ---- the apple: shared by the great tree and the close spray (x-tree-fruit.js) ----
// p is fruit-local in units of the apple's radius, y up the stem; distances in the same units.
// Broad shoulders over the middle tapering to a narrower base, a deep rounded stem cavity, a small
// calyx basin with five faint crowns round it, one cheek a little fuller, the skin not quite true.
float appleSD(vec3 p) {
  float y = p.y, r = length(p.xz);
  vec2 cs = p.xz / max(r, 1e-4);
  float c5 = cs.x * (16.0 * cs.x * cs.x * cs.x * cs.x - 20.0 * cs.x * cs.x + 5.0);   // cos(5a)
  float w = 1.0 + 0.05 * smoothstep(-0.7, 0.45, y) - 0.12 * smoothstep(0.05, -0.95, y);
  w *= 1.0 + 0.03 * c5 * smoothstep(0.1, -0.85, y) + 0.012 * c5 * smoothstep(0.35, 0.8, y);
  w *= 1.0 + 0.03 * dot(cs, vec2(0.7, 0.71)) + 0.025 * (vnoise(p * 1.6 + 3.0) - 0.5);
  float d = (length(vec2(r / w, y / 0.96)) - 1.0) * min(w, 0.96);
  d = smax(d, 0.42 - length(p - vec3(0.0, 1.13, 0.0)), 0.28);    // the stem cavity
  d = smax(d, 0.2 - length(p - vec3(0.0, -1.02, 0.0)), 0.14);    // the calyx basin
  return d;
}
vec3 appleNormal(vec3 p) {
  const vec2 k = vec2(1.0, -1.0); const float e = 0.004;
  return normalize(k.xyy * appleSD(p + k.xyy * e) + k.yyx * appleSD(p + k.yyx * e) + k.yxy * appleSD(p + k.yxy * e) + k.xxx * appleSD(p + k.xxx * e));
}
// the skin: red washed and striped over a gold-yellow ground, deepest on the cheek that faced the sun
// as it grew (toward azimuth seed), the ground showing green-gold round the calyx; fine pale lenticels;
// a little russet in the stem cavity; the dry brown calyx. red: how much red skin is there (0..1).
vec3 appleAlb(vec3 p, float seed, out float red) {
  float r = length(p.xz);
  vec2 cs = p.xz / max(r, 1e-4);
  float y = clamp(p.y / 0.9, -1.0, 1.0);
  float cheek = dot(cs, vec2(cos(seed), sin(seed)));
  // seamless round the fruit: noise on a cylinder (stretched along the meridians for the stripes)
  // the blush: a soft wash of red over the cheek and shoulders, thinning toward the far side and the calyx
  float cov = 0.62 * cheek + 0.25 * y - 0.18 * smoothstep(-0.3, -0.95, y) + 0.5 * (vnoise(p * 1.4 + seed) - 0.5) + 0.78;
  float blush = smoothstep(-0.4, 1.15, cov);
  // the stripes: fine broken streaks of deeper red running pole to pole, reaching out over the yellow
  float sn = 0.55 * vnoise(vec3(cs * 22.0, y * 2.0) + seed) + 0.45 * vnoise(vec3(cs * 55.0, y * 4.0) + 5.0);
  float stripe = smoothstep(0.44, 0.66, sn) * smoothstep(0.25, 0.75, vnoise(vec3(cs * 5.0, y * 5.0) + 2.0));
  float reach = smoothstep(-0.9, -0.1, cov);
  red = sat(blush + stripe * reach * 0.9 * (1.0 - blush));
  vec3 ground = mix(vec3(0.52, 0.38, 0.07), vec3(0.36, 0.35, 0.09), smoothstep(-0.3, -0.9, y) * 0.6 + 0.25 * vnoise(p * 3.0));
  // within the red, the striping goes on: orange-red between, deep crimson in the stripes
  float s2 = smoothstep(0.38, 0.66, sn);
  vec3 rc = mix(vec3(0.5, 0.1, 0.03), vec3(0.3, 0.02, 0.017), sat(0.45 * smoothstep(0.3, 0.95, blush) + 0.6 * s2));
  rc = mix(rc, vec3(0.19, 0.011, 0.013), stripe * 0.3 * blush);
  rc *= 0.88 + 0.24 * vnoise(p * 6.0 + seed * 3.0);   // the colour is mottled, not even
  vec3 c = mix(ground, rc, red);
  // tiny pale flecks in the red
  c = mix(c, c * vec3(1.35, 1.6, 1.3), smoothstep(0.78, 0.9, vnoise(p * 40.0 + 9.0)) * 0.35 * red);
  // lenticels: tiny pale dots, larger and more of them toward the calyx
  vec3 lq = p * 26.0;
  vec3 lc = floor(lq), lf = fract(lq) - 0.5 - (hash33(lc) - 0.5) * 0.6;
  float lden = mix(0.72, 0.5, smoothstep(0.3, -0.8, y));
  float len = smoothstep(0.15, 0.07, length(lf)) * step(lden, hash13(lc));
  c = mix(c, mix(vec3(0.42, 0.36, 0.2), vec3(0.6, 0.48, 0.24), red), len * (0.35 + 0.4 * red));
  // russet in the stem cavity, reaching out a little in a ragged star
  float ru = smoothstep(0.45, 0.2, r) * smoothstep(0.45, 0.7, y) * (0.6 + 0.4 * vnoise(p * 9.0));
  c = mix(c, vec3(0.16, 0.11, 0.045), ru * 0.85);
  // the calyx: five dry sepals, dark brown, in the basin
  float cal = smoothstep(0.24, 0.1, r) * smoothstep(-0.7, -0.85, y);
  float c5 = cs.x * (16.0 * cs.x * cs.x * cs.x * cs.x - 20.0 * cs.x * cs.x + 5.0);
  c = mix(c, mix(vec3(0.05, 0.035, 0.018), vec3(0.12, 0.09, 0.04), 0.5 + 0.5 * c5), cal);
  return c;
}
// the light on it: wrapped sun, light through the flesh at the terminator, sky and ground, the
// pale bloom toward the rim, the soft sheen and crisp highlight of the wax, the world in the wax
vec3 appleLight(vec3 alb, float red, vec3 n, vec3 rd, vec3 L, vec3 sunC, vec3 skyC, vec3 gndC, float sh, vec3 env) {
  float ndl = dot(n, L);
  vec3 c = alb * sunC * sat((ndl + 0.2) / 1.2) * sh;
  vec3 sss = mix(vec3(0.5, 0.36, 0.08), vec3(0.6, 0.05, 0.025), red);
  c += sss * sunC * pow(sat(1.0 - abs(ndl)), 3.0) * (0.05 + 0.35 * pow(sat(dot(rd, L)), 4.0)) * max(sh, 0.15);
  c += alb * (skyC * (0.55 + 0.45 * n.y) * 1.15 + gndC * sat(0.35 - 0.65 * n.y) * 1.3);
  float ndv = sat(dot(-rd, n));
  c += vec3(0.55, 0.58, 0.64) * pow(1.0 - ndv, 2.5) * 0.08 * (skyC + sunC * 0.08 * sh) * (0.3 + 0.7 * red);
  vec3 h = normalize(L - rd);
  float nh = sat(dot(n, h));
  c += sunC * sh * (pow(nh, 22.0) * 0.045 + pow(nh, 320.0) * 0.55);
  float F = 0.04 + 0.96 * pow(1.0 - ndv, 5.0);
  c += env * F * 0.45;
  return c;
}

// cached once per pixel: limbs, billows, the apples and their sprigs
vec3 gLA[6], gLM[6], gLB[6], gLC[6];
vec4 gBill[12];
#define NFRUIT 12
const float AR = 0.11;        // an apple on the great tree (it is immense; its leaves are some 0.25 m)
const float ASTEM = 0.075;    // its stem, from the spur's end to the floor of the cavity
vec3 gFruit[NFRUIT], gNode[NFRUIT], gTwA[NFRUIT], gTwK[NFRUIT], gTwT[NFRUIT], gStem[NFRUIT];
mat3 gFrM[NFRUIT];            // world offset -> fruit-local (columns: the fruit's x, its up, its z)
vec4 gSprB[NFRUIT];           // a bounding sphere round each sprig (twig, leaves, apple)
bool gBillOk = false;
// where sprig i grows: A on the limb's axis, K the bend, N the spur's end the stem hangs from
void sprigPts(int i, out vec3 A, out vec3 K, out vec3 N);
void treeInit() {
  for (int i = 0; i < 6; i++) {
    vec3 a, m, b, c; limbPts(i, a, m, b, c);
    gLA[i] = a; gLM[i] = m; gLB[i] = b; gLC[i] = c;
    gBill[i * 2] = vec4(b + vec3(0.0, 0.6 + 2.2 * hash11(float(i) * 5.3), 0.0), 3.6 + 1.6 * hash11(float(i) * 9.1));
    gBill[i * 2 + 1] = vec4(c + vec3(0.0, 1.2 + 2.6 * hash11(float(i) * 6.1), 0.0), 3.4 + 1.4 * hash11(float(i) * 3.7));
  }
  for (int i = 0; i < NFRUIT; i++) {
    float fi = float(i);
    vec3 A, K, N; sprigPts(i, A, K, N);
    // the apple hangs straight down from its spur and swings a little on its stem in the wind
    float sw = 0.04 + 0.28 * uTreeWind + 0.08 * uTreeShiver;
    vec2 ang = sw * vec2(sin(uTime * (1.3 + 0.3 * hash11(fi)) + fi * 2.0), sin(uTime * (1.1 + 0.3 * hash11(fi * 3.1)) + fi * 1.3));
    vec3 up = normalize(vec3(ang.x, 1.0, ang.y));
    vec3 e1 = normalize(cross(up, vec3(0.0, 0.0, 1.0))), e2 = cross(e1, up);
    float sp = hash11(fi * 9.7) * 6.283;
    vec3 x1 = e1 * cos(sp) + e2 * sin(sp);
    gFrM[i] = mat3(x1, up, cross(x1, up));
    gNode[i] = N; gTwA[i] = A; gTwK[i] = K;
    // an outer shoot runs on past the apple to a leafy tip; an inner spur ends at it
    vec3 ho = vec3(N.x - A.x, 0.0, N.z - A.z);
    gTwT[i] = i < 6 ? N + normalize(ho + vec3(1e-4, 0.0, 0.0)) * 0.42 + vec3(0.0, 0.1, 0.0) : N;
    gFruit[i] = N - up * (ASTEM + 0.6 * AR);
    gStem[i] = gFruit[i] + up * 0.5 * AR;
    vec3 bc = (A + gFruit[i] + gTwT[i]) / 3.0;
    gSprB[i] = vec4(bc, max(max(length(A - bc), length(gFruit[i] - bc)), length(gTwT[i] - bc)) + 0.36);
  }
  gBillOk = true;
}
float woodSD(vec3 q) {
  if (!gBillOk) treeInit();
  // trunk: short, massive, a little leaning, flaring into the ground
  float y = q.y;
  float r = 1.35 + 0.55 * exp(-max(y, 0.0) * 1.3) - 0.04 * y;
  vec2 tw = q.xz - vec2(0.12, -0.05) * y;
  float d = max(length(tw) - r, abs(y - 2.6) - 3.2);
  if (d < 0.3) d -= 0.1 * (vnoise(vec2(atan(tw.y, tw.x) * 3.0, y * 0.6)) - 0.5);
  // buttress roots
  for (int i = 0; i < 5; i++) {
    float a = float(i) * 1.2566 + 0.5;
    vec3 e = vec3(cos(a) * 3.8, -0.45, sin(a) * 3.8);
    d = smin(d, tcap(q, vec3(0.0, 1.2, 0.0), e, 0.75, 0.12), 0.7);
  }
  // limbs
  if (q.y > 3.0) {
    // limbs wander a little: bend the space they are measured in
    q += limbWander(q);
    for (int i = 0; i < 6; i++) {
      vec3 a = gLA[i], m = gLM[i], b = gLB[i], c = gLC[i];
      float l = min(tcap(q, a, m, 0.78, 0.5), tcap(q, m, b, 0.5, 0.18));
      l = min(l, tcap(q, m, c, 0.36, 0.12));
      d = smin(d, l, 0.45);
    }
  }
  if (d < 0.3) d += 0.05 * (vnoise(q * 1.7) - 0.5);
  return d;
}

// ---- leaves: a shell of foliage; occupancy is a 3D noise thresholded by depth ----
float crownSD(vec3 q) {
  if (!gBillOk) treeInit();
  vec3 o = q - CROWN_C;
  // flatter underside, rounder top
  o.y *= o.y < 0.0 ? 1.35 : 1.0;
  float d = sdEllipsoid(o, CROWN_R * vec3(0.5, 0.8, 0.52));
  if (d > 12.0) return d - 3.0;
  for (int i = 0; i < 12; i++) {
    vec3 e = q - gBill[i].xyz; e.y *= 1.4;
    d = smin(d, length(e) - gBill[i].w, 1.6);
  }
  d += 3.0 * (vnoise(q * 0.13 + vec3(3.1, 0.0, 1.7)) - 0.5) + 2.2 * (vnoise(q * 0.34 + 5.0) - 0.5) + 0.9 * (vnoise(q * 0.9 + 2.0) - 0.5);
  return d;
}
// a cheaper crown for shadows: the same billows, one octave of lumps
float crownSDLo(vec3 q) {
  if (!gBillOk) treeInit();
  vec3 o = q - CROWN_C;
  o.y *= o.y < 0.0 ? 1.35 : 1.0;
  float d = sdEllipsoid(o, CROWN_R * vec3(0.5, 0.8, 0.52));
  if (d > 12.0) return d - 3.0;
  for (int i = 0; i < 12; i++) {
    vec3 e = q - gBill[i].xyz; e.y *= 1.4;
    d = smin(d, length(e) - gBill[i].w, 1.6);
  }
  return d + 3.0 * (vnoise(q * 0.13 + vec3(3.1, 0.0, 1.7)) - 0.5) + 2.2 * (vnoise(q * 0.34 + 5.0) - 0.5);
}
float leafField(vec3 q) {
  vec3 w = q;
  float sh = uTreeShiver * 0.08 + uTreeWind * 0.12;
  w += sh * vec3(sin(uTime * 13.0 + q.y * 3.0), sin(uTime * 11.0 + q.x * 2.0), sin(uTime * 12.0 + q.z * 3.0));
  return 0.56 * vnoise(w * 1.25) + 0.32 * vnoise(w * 3.4 + 11.0) + 0.12 * vnoise(w * 9.0 + 4.0);
}
// how full the foliage is at depth -cd under the crown's skin (0 at the skin, deeper leaves thinner)
float leafThr(float cd) { return 0.55 + 0.035 * smoothstep(-0.2, -3.0, cd) + 0.2 * smoothstep(-3.0, -5.0, cd); }

// ---- the apples: a few, each on its own sprig. The inner ones hang on short spurs straight off the
// underside of the great limbs just past their forks; the outer ones on leafy shoots off the limbs
// toward their ends, bowed down under the crown's edge by the weight of the fruit.
void sprigPts(int i, out vec3 A, out vec3 K, out vec3 N) {
  float fi = float(i);
  vec3 a, m, b, c; limbPts(i - 6 * (i / 6), a, m, b, c);
  vec3 dir = normalize(b - m);
  vec3 sd = normalize(cross(dir, vec3(0.0, 1.0, 0.0)));
  float sg = hash11(fi * 4.7 + 1.0) > 0.5 ? 1.0 : -1.0;
  if (i >= 6) {
    float u = 0.08 + 0.06 * hash11(fi * 2.9);
    vec3 P = mix(m, b, u);
    float rl = mix(0.5, 0.18, u);
    A = P - limbWander(P);
    N = A + sd * sg * (0.06 + 0.08 * hash11(fi * 6.1)) + vec3(0.0, -(rl + 0.09 + 0.04 * hash11(fi * 8.3)), 0.0);
    K = mix(A, N, 0.5) + sd * sg * 0.03;
  } else {
    float u = 0.5 + 0.3 * hash11(fi * 2.9);
    vec3 P = mix(m, b, u);
    A = P - limbWander(P);
    N = A + sd * sg * (0.5 + 0.3 * hash11(fi * 6.1)) + dir * 0.35 + vec3(0.0, -(1.35 + 0.5 * hash11(fi * 8.3)), 0.0);
    K = vec3(mix(A.x, N.x, 0.65), mix(A.y, N.y, 0.2) + 0.05, mix(A.z, N.z, 0.65));
  }
}
vec3 fruitPos(int i) { if (!gBillOk) treeInit(); return gFruit[i]; }
// a sprig's own leaf k (ovate, pointed, drooping a little). On an inner spur: 4 in a rosette round its
// end, spreading out and down round the apple's shoulders. On an outer shoot: 3 at its tip and 6 more all along it.
float sprigLeaf(vec3 q, int i, int k, float dcur) {
  float fi = float(i), fk = float(k), h = hash11(fi * 7.3 + fk * 3.1);
  vec3 at;
  if (i >= 6) at = gNode[i] + vec3(0.0, 0.015, 0.0);
  else at = k < 3 ? gTwT[i] : (k < 7 ? mix(gTwK[i], gNode[i], 0.12 + 0.25 * (fk - 3.0)) : mix(gTwA[i], gTwK[i], 0.45 + 0.4 * (fk - 7.0)));
  float far_ = length(q - at) - 0.36;
  if (far_ > dcur) return far_;      // nowhere near this leaf: skip the frame
  float an = fk * (i >= 6 ? 1.75 : 2.2) + fi * 1.9 + 0.9 * h + sin(uTime * (2.0 + h) + fi + fk) * (0.04 + 0.25 * uTreeWind + 0.1 * uTreeShiver);
  vec3 U = normalize(vec3(cos(an), (i >= 6 ? -0.32 : (k < 3 ? 0.25 : -0.08)) + 0.25 * h, sin(an)));
  vec3 V = normalize(cross(U, vec3(0.0, 1.0, 0.0))), Nl = cross(V, U);
  Nl = normalize(Nl + V * (hash11(fi * 2.1 + fk) - 0.5) * 0.9);
  V = cross(U, Nl);
  float L = 0.17 + 0.11 * h, W = L * (0.46 + 0.1 * hash11(fi * 5.9 + fk));
  vec3 r = q - at;
  float pet = 0.04;
  float lu = dot(r, U) - pet, s = lu / L;
  if (s < -0.2 || s > 1.2) return length(r - U * (pet + L * 0.5)) - L * 0.6;
  float lv = dot(r, V), lw = dot(r, Nl) + 0.3 * L * s * s;
  float hw = W * 0.5 * pow(max(sin(clamp(pow(max(s, 0.0), 0.8), 0.0, 1.0) * 3.14159), 0.0), 0.85);
  float d2 = max(abs(lv) - hw, max(-lu, lu - L));
  float d = max(d2 * 0.7, abs(lw) - 0.0022);
  return min(d, tcap(r, vec3(0.0), U * pet, 0.0045, 0.0035));
}
// everything that hangs from the limbs: id 3 an apple (fi which), 4 a leaf, 5 a twig, 6 a stem
float sprigSD(vec3 q, out int id, out int fi) {
  id = -1; fi = -1;
  if (uFruitK < 0.5) return 1e5;
  if (!gBillOk) treeInit();
  float rr = length(q.xz);
  float bnd = max(max(1.0 - rr, rr - 16.0), max(3.5 - q.y, q.y - 15.0));
  if (bnd > 0.5) return bnd;
  float d = 1e5;
  for (int i = 0; i < NFRUIT; i++) {
    float bs = length(q - gSprB[i].xyz) - gSprB[i].w;
    if (bs > 0.02) { d = min(d, bs); continue; }
    vec3 f = (q - gFruit[i]) * gFrM[i];
    float da = appleSD(f / AR) * AR * 0.9;
    if (da < d) { d = da; id = 3; fi = i; }
    bool outer = i < 6;
    float r0 = outer ? 0.022 : 0.034, r1 = outer ? 0.016 : 0.027, r2 = outer ? 0.011 : 0.02;
    float dt = min(tcap(q, gTwA[i], gTwK[i], r0, r1), tcap(q, gTwK[i], gNode[i], r1, r2));
    if (outer) dt = min(dt, tcap(q, gNode[i], gTwT[i], r2, 0.007));
    dt = smin(dt, length(q - gNode[i] - vec3(0.0, 0.006, 0.0)) - r2 * 1.35, 0.012);
    if (dt < d) { d = dt; id = 5; fi = i; }
    vec3 up = gFrM[i][1];
    vec3 mid = mix(gNode[i], gStem[i], 0.5) + gFrM[i][0] * 0.008;
    float ds = min(tcap(q, gNode[i], mid, 0.0075, 0.0058), tcap(q, mid, gStem[i], 0.0058, 0.0068));
    if (ds < d) { d = ds; id = 6; fi = i; }
    for (int k = 0; k < 9; k++) {
      if (!outer && k >= 4) break;
      float dl = sprigLeaf(q, i, k, d);
      if (dl < d) { d = dl; id = 4; fi = i; }
    }
  }
  return d;
}
float fruitSD(vec3 q, out int fi) {
  float d = 1e5; fi = -1;
  if (uFruitK < 0.5) return d;
  if (!gBillOk) treeInit();
  for (int i = 0; i < NFRUIT; i++) {
    float bs = length(q - gFruit[i]) - AR * 1.2;
    if (bs > 0.02) { if (bs < d) { d = bs; fi = i; } continue; }
    float da = appleSD((q - gFruit[i]) * gFrM[i] / AR) * AR * 0.9;
    if (da < d) { d = da; fi = i; }
  }
  return d;
}
// the twigs and stems the apples hang by
float stalkSD(vec3 q) {
  int id, fi; float d = sprigSD(q, id, fi);
  return (id == 5 || id == 6 || id < 0) ? d : d + 0.01;
}

// the trunk and the first reach of each limb only: what casts the big shadows
float woodShadowSD(vec3 q) {
  if (!gBillOk) treeInit();
  float y = q.y;
  float r = 1.35 + 0.55 * exp(-max(y, 0.0) * 1.3) - 0.04 * y;
  float d = max(length(q.xz - vec2(0.12, -0.05) * y) - r, abs(y - 2.6) - 3.2);
  if (q.y > 3.0) for (int i = 0; i < 6; i++) d = min(d, min(tcap(q, gLA[i], gLM[i], 0.78, 0.5), tcap(q, gLM[i], gLB[i], 0.5, 0.18)));
  return d;
}
// trace the tree; id 1 wood, 2 leaves, 3 fruit
float treeTrace(vec3 ro, vec3 rd, float tmax, float jit, out int id) {
  id = -1;
  vec3 o = ro - uTreePos;
  // bounding sphere of the whole tree
  vec3 bc = vec3(0.0, 10.0, 0.0);
  vec3 oc = o - bc; float bb = dot(oc, rd), cc = dot(oc, oc) - 22.5 * 22.5, hh = bb * bb - cc;
  if (hh < 0.0) return -1.0;
  hh = sqrt(hh);
  float t0 = max(-bb - hh, 0.0), t1 = min(-bb + hh, tmax);
  if (t0 > t1) return -1.0;
  float best = 1e9;
  // wood and fruit by sphere tracing
  float t = t0;
  for (int i = 0; i < 110; i++) {
    vec3 q = treeBend(o + rd * t);
    int sid, sfi; float ds = sprigSD(q, sid, sfi);
    float dw = woodSD(q);
    if (dw < 0.0015 * t) { best = t; id = 1; break; }
    // the sprigs are fine: hit them only within about a pixel (apples a little more, to read far off)
    if (sid > 0 && ds < (sid == 3 ? 0.0007 : 0.0002) * t + 0.0004) { best = t; id = sid; break; }
    t += min(dw, ds) * 0.85;
    if (t > t1) break;
  }
  // leaves by stepping through the shell
  float t1l = gTreeLeaves > 0.5 ? min(t1, best) : -1.0;
  t = t0;
  for (int i = 0; i < 160; i++) {
    if (t > t1l) break;
    vec3 q = treeBend(o + rd * t);
    float cd = crownSD(q);
    if (cd > 0.3) { t += max(cd * 0.6, 0.12); continue; }
    if (cd < -5.0) { t += max(-(cd + 5.0) * 0.5, 0.2); continue; }
    if (leafField(q) > leafThr(cd)) { if (t < best) { best = t; id = 2; } break; }
    t += (0.09 + 0.0025 * t) * (0.6 + 0.8 * jit) * gLeafStep;
  }
  return id < 0 ? -1.0 : best;
}

// transmittance of sunlight through the crown, from p toward L
float treeShadow(vec3 p, vec3 L) {
  vec3 o = p - uTreePos;
  vec3 oc = o - vec3(0.0, 10.0, 0.0); float bb = dot(oc, L), cc = dot(oc, oc) - 22.5 * 22.5, hh = bb * bb - cc;
  if (hh < 0.0) return 1.0;
  hh = sqrt(hh);
  float t0 = max(-bb - hh, 0.0), t1 = -bb + hh;
  if (t1 < 0.0) return 1.0;
  float T = 1.0, t = t0 + 0.05;
  for (int i = 0; i < 18; i++) {
    if (t > t1 || T < 0.03) break;
    vec3 q = treeBend(o + L * t);
    float cd = crownSDLo(q);
    if (cd > 0.3) { t += max(cd * 0.6, 0.3); continue; }
    if (cd < -5.0) { t += max(-(cd + 5.0) * 0.5, 0.4); continue; }
    // two octaves of the leaf field are enough for a shadow
    vec3 w = q;
    float lf = 0.62 * vnoise(w * 1.25) + 0.38 * vnoise(w * 3.4 + 11.0);
    float occ = smoothstep(leafThr(cd) - 0.05, leafThr(cd) + 0.05, lf);
    T *= exp(-(occ * 0.85 + 0.15) * 0.7 * 3.0 * smoothstep(0.3, -0.8, cd));
    t += 0.7;
  }
  // the trunk and limbs
  float t2 = 0.05;
  for (int i = 0; i < 18; i++) {
    vec3 q = treeBend(o + L * t2);
    float w = woodShadowSD(q);
    if (w < 0.01) { T = 0.0; break; }
    t2 += max(w, 0.12);
    if (t2 > t1 || q.y > 16.0) break;
  }
  return T;
}

vec3 woodNormal(vec3 q) {
  vec2 e = vec2(0.01, 0.0);
  return normalize(vec3(woodSD(q + e.xyy) - woodSD(q - e.xyy), woodSD(q + e.yxy) - woodSD(q - e.yxy), woodSD(q + e.yyx) - woodSD(q - e.yyx)));
}
float gCheapShade = 0.0;   // 1: reflections; leaves are shaded more simply
vec3 leafNormal(vec3 q) {
  // tetrahedral differences: four samples each
  const vec2 k = vec2(1.0, -1.0);
  float e = 0.06, E = 0.5;
  vec3 g = k.xyy * leafField(q + k.xyy * e) + k.yyx * leafField(q + k.yyx * e) + k.yxy * leafField(q + k.yxy * e) + k.xxx * leafField(q + k.xxx * e);
  vec3 cg = k.xyy * crownSD(q + k.xyy * E) + k.yyx * crownSD(q + k.yyx * E) + k.yxy * crownSD(q + k.yxy * E) + k.xxx * crownSD(q + k.xxx * E);
  return normalize(-normalize(g + 1e-5) * 0.6 + normalize(cg + 1e-5) * 0.8);
}

// the apple's skin lit (kept for older callers: lp is a fruit-local point, n the normal)
vec3 fruitSkin(vec3 n, vec3 rd, vec3 L, vec3 sunC, vec3 skyC, float sh, vec3 lp) {
  float red; vec3 alb = appleAlb(normalize(lp), 0.6, red);
  return appleLight(alb, red, n, rd, L, sunC, skyC, skyC * vec3(0.6, 0.45, 0.25), sh, skyC * 0.6 * smoothstep(-0.2, 0.9, reflect(rd, n).y));
}

vec3 treeShade(vec3 p, vec3 rd, int id, vec3 L, vec3 sunC, vec3 skyC, vec3 gndC) {
  vec3 q = treeBend(p - uTreePos);
  if (id == 3) {
    int fi; fruitSD(q, fi);
    vec3 f = (q - gFruit[fi]) * gFrM[fi] / AR;
    vec3 n = gFrM[fi] * appleNormal(f);
    float sh = treeShadow(p + n * 0.05, L);
    float red; vec3 alb = appleAlb(f, hash11(float(fi) * 5.3) * 6.283, red);
    vec3 r = reflect(rd, n);
    vec3 env = mix(gndC * 0.5, skyC * 0.7, smoothstep(-0.2, 0.6, r.y)) * mix(1.0, 0.35, smoothstep(-6.0, 0.0, -crownSDLo(q)) * step(0.0, r.y));
    return appleLight(alb, red, n, rd, L, sunC, skyC, gndC, sh, env);
  }
  if (id >= 4) {
    // a sprig: its leaves, its twig, the stem
    int sid, fi;
    const vec2 k = vec2(1.0, -1.0); const float e = 0.0015;
    vec3 n = normalize(k.xyy * sprigSD(q + k.xyy * e, sid, fi) + k.yyx * sprigSD(q + k.yyx * e, sid, fi) + k.yxy * sprigSD(q + k.yxy * e, sid, fi) + k.xxx * sprigSD(q + k.xxx * e, sid, fi));
    sprigSD(q, sid, fi);
    float sh = treeShadow(p + n * 0.03, L);
    vec3 h = normalize(L - rd);
    if (id == 4) {
      bool back = dot(n, rd) > 0.0;
      if (back) n = -n;
      float tone = vnoise(q * 30.0 + float(fi));
      vec3 alb = mix(vec3(0.016, 0.03, 0.014), vec3(0.032, 0.052, 0.022), tone);
      float ndl = dot(n, L);
      vec3 c = alb * sunC * sat(ndl) * sh;
      // light through the blade: the sun (where it reaches) and the bright sky and crown above
      c += mix(vec3(0.09, 0.16, 0.02), vec3(0.18, 0.2, 0.03), tone) * sunC * sat(-ndl) * max(sh, 0.15) * (0.08 + 0.7 * pow(sat(dot(rd, L)), 3.0));
      c += vec3(0.04, 0.06, 0.015) * skyC * sat(-n.y) * 0.8;
      c += alb * (skyC * (0.6 + 0.4 * n.y) + gndC * 0.8) * 1.2;
      c += sunC * sh * pow(sat(dot(n, h)), 90.0) * 0.5 * (0.04 + 0.96 * pow(1.0 - sat(dot(-rd, n)), 5.0)) * 4.0;
      return c;
    }
    float g = vnoise(vec3(q.x, q.y * 0.3, q.z) * 60.0);
    vec3 alb = id == 6 ? mix(vec3(0.07, 0.06, 0.025), vec3(0.13, 0.1, 0.04), g) : mix(vec3(0.06, 0.05, 0.04), vec3(0.12, 0.1, 0.08), g);
    vec3 c = alb * sunC * sat(dot(n, L)) * sh + alb * (skyC * (0.6 + 0.4 * n.y) + gndC * sat(0.4 - 0.6 * n.y)) * 1.2;
    c += alb * sunC * pow(1.0 - sat(dot(-rd, n)), 3.0) * pow(sat(dot(rd, L)), 2.0) * 1.2 * sh;
    c += sunC * sh * pow(sat(dot(n, h)), 40.0) * 0.06;
    return c;
  }
  if (id == 1) {
    vec3 n = woodNormal(q);
    // furrowed bark: deep cracks running along the wood (along the axis the normal is not), grey ridges,
    // grey-green lichen in patches
    vec3 ax = abs(n.y) < 0.8 ? vec3(0.0, 1.0, 0.0) : vec3(1.0, 0.0, 0.0);
    vec3 along = normalize(ax - n * dot(ax, n));
    vec3 across = cross(n, along);
    vec3 bq = q * 6.0;
    float u = dot(bq, across), v = dot(bq, along);
    // blocky plates between long cracks
    vec2 cv = voronoiEdge(vec2(u * 2.6, v * 0.55));
    float fur = vnoise(vec2(u * 3.0, v * 0.5)) * 0.5 + vnoise(vec2(u * 9.0, v * 2.0)) * 0.5;
    float crack = 1.0 - smoothstep(0.02, 0.09, cv.x);
    float plate = smoothstep(0.0, 0.25, cv.x);
    n = normalize(n + across * (vnoise(vec2(u * 3.0 + 0.3, v * 0.5)) - vnoise(vec2(u * 3.0 - 0.3, v * 0.5))) * 0.8 + along * (cv.y - 0.5) * 0.15);
    vec3 alb = mix(vec3(0.075, 0.072, 0.068), vec3(0.17, 0.16, 0.145), fur * (0.6 + 0.4 * cv.y)) * (0.75 + 0.25 * plate);
    alb = mix(alb, vec3(0.025, 0.022, 0.02), crack);
    alb = mix(alb, vec3(0.15, 0.16, 0.12), smoothstep(0.6, 0.78, vnoise(q * 1.3 + 4.0)) * 0.6 * (1.0 - crack));
    alb *= 0.85 + 0.3 * vnoise(q * 0.5);
    float sh = treeShadow(p + n * 0.05, L);
    float occ = mix(0.3, 1.0, smoothstep(-6.0, 1.0, crownSD(q)));
    occ *= 0.5 + 0.5 * smoothstep(0.0, 2.5, q.y);
    vec3 c = alb * sunC * sat(dot(n, L)) * sh;
    c += alb * (skyC * (0.5 + 0.5 * n.y) * 0.8 + gndC * (0.5 - 0.5 * n.y) * 1.2) * occ * (1.0 - 0.6 * crack);
    return c;
  }
  // leaves
  if (gCheapShade > 0.5) {
    float cd0 = crownSD(q);
    vec3 nn = normalize(q - CROWN_C + vec3(0.0, 4.0, 0.0));
    float var0 = vnoise(q * 0.9 + 3.0);
    vec3 a0 = mix(vec3(0.014, 0.03, 0.017), vec3(0.03, 0.052, 0.026), var0);
    float lit = sat(dot(nn, L) * 0.7 + 0.3) * smoothstep(-2.5, 0.0, cd0);
    return a0 * sunC * lit * 0.8 + a0 * (skyC * (0.9 + 0.6 * nn.y) + gndC * 0.8) * mix(1.0, 0.35, sat(-cd0 / 4.0)) * 1.3;
  }
  vec3 n = leafNormal(q);
  // each leaf tilts its own way: a speckle of sun and shade at the scale of single leaves
  vec3 qq = q * 9.0;
  vec3 ln = vec3(vnoise(qq), vnoise(qq + 3.7), vnoise(qq + 8.1)) * 2.0 - 1.0;
  n = normalize(n + ln * 1.1);
  vec3 cell = floor(q * 4.0);
  float cd = crownSD(q);
  float depthK = sat(-cd / 4.0);
  float var = vnoise(q * 0.9 + 3.0);
  vec3 alb = mix(vec3(0.014, 0.03, 0.017), vec3(0.03, 0.052, 0.026), var) * (0.8 + 0.4 * vnoise(q * 5.0 + 7.0));
  alb = mix(alb, vec3(0.11, 0.1, 0.035), smoothstep(0.75, 0.9, vnoise(q * 2.3)) * 0.5);
  float sh = treeShadow(p + n * 0.08, L);
  float ndl = dot(n, L);
  vec3 c = alb * sunC * sat(ndl) * sh;
  // light through the leaves (seen from the shade side)
  float back = pow(sat(dot(rd, L)), 3.0) * (0.35 + 0.65 * sat(-ndl)) + 0.06 * sat(-ndl);
  c += vec3(0.16, 0.2, 0.035) * sunC * back * sh * 0.6;
  // waxy sheen
  vec3 h = normalize(L - rd);
  c += sunC * pow(sat(dot(n, h)), 30.0) * 0.08 * sh * (0.04 + 0.96 * pow(1.0 - sat(dot(-rd, n)), 5.0));
  float ao = mix(1.0, 0.35, depthK);
  c += alb * (skyC * (0.9 + 0.6 * n.y) + gndC * 0.8) * ao * 1.3;
  return c;
}
`;

// The same geometry in JavaScript, for aiming cameras (tree-local coordinates; add uTreePos).
const fract = (x) => x - Math.floor(x);
const hash11 = (p) => { p = fract(p * 0.1031); p *= p + 33.33; p *= p + p; return fract(p); };
export function limbPts(i) {
  const ang = i * 1.0472 + 0.35 * (hash11(i * 7.1) - 0.5) + 0.3;
  const d = [Math.cos(ang), Math.sin(ang)];
  const lift = hash11(i * 3.3);
  const m = [d[0] * (4.2 + 1.2 * lift), 7.4 + 1.4 * hash11(i + 4.0), d[1] * (4.2 + 1.2 * lift)];
  const R = 9.5 + 3.0 * hash11(i * 1.9);
  const b = [d[0] * R, 9.8 + 4.6 * hash11(i * 5.7), d[1] * R];
  const r = 0.7 * (hash11(i * 2.3) - 0.5) + 0.5, cs = Math.cos(r), sn = Math.sin(r);
  const d2 = [cs * d[0] + sn * d[1], -sn * d[0] + cs * d[1]];
  const c = [m[0] + d2[0] * 5.5, m[1] + 3.8 + 1.2 * lift, m[2] + d2[1] * 5.5];
  return { m, b, c };
}
const limbWanderJS = (q) => {
  const k = 0.22 * (q[1] <= 4 ? 0 : q[1] >= 8 ? 1 : ((t) => t * t * (3 - 2 * t))((q[1] - 4) / 4));
  return [Math.sin(q[1] * 0.9 + q[2] * 0.3) * k, 0, Math.cos(q[1] * 0.8 + q[0] * 0.35) * k];
};
// where apple i hangs at rest (the GLSL sprigPts and treeInit, without the swing)
export function fruitPosJS(i, treePos = TREE_UNIFORMS.uTreePos) {
  const { m, b } = limbPts(i % 6);
  const AR = 0.11, ASTEM = 0.075;
  const dl = Math.hypot(b[0] - m[0], b[1] - m[1], b[2] - m[2]);
  const dir = [(b[0] - m[0]) / dl, (b[1] - m[1]) / dl, (b[2] - m[2]) / dl];
  const sl = Math.hypot(dir[2], dir[0]), sd = [-dir[2] / sl, 0, dir[0] / sl];
  const sg = hash11(i * 4.7 + 1.0) > 0.5 ? 1 : -1;
  let N;
  if (i >= 6) {
    const u = 0.08 + 0.06 * hash11(i * 2.9);
    const P = m.map((v, k) => v + (b[k] - v) * u), rl = 0.5 + (0.18 - 0.5) * u;
    const w = limbWanderJS(P), A = P.map((v, k) => v - w[k]);
    const s = sg * (0.06 + 0.08 * hash11(i * 6.1));
    N = [A[0] + sd[0] * s, A[1] - (rl + 0.09 + 0.04 * hash11(i * 8.3)), A[2] + sd[2] * s];
  } else {
    const u = 0.5 + 0.3 * hash11(i * 2.9);
    const P = m.map((v, k) => v + (b[k] - v) * u);
    const w = limbWanderJS(P), A = P.map((v, k) => v - w[k]);
    const s = sg * (0.5 + 0.3 * hash11(i * 6.1));
    N = [A[0] + sd[0] * s + dir[0] * 0.35, A[1] + dir[1] * 0.35 - (1.35 + 0.5 * hash11(i * 8.3)), A[2] + sd[2] * s + dir[2] * 0.35];
  }
  const p = [N[0], N[1] - (ASTEM + 0.6 * AR), N[2]];
  return [p[0] + treePos[0], p[1] + treePos[1], p[2] + treePos[2]];
}
