// The tree of the knowledge of good and evil: immense, alone on its rise, a dark crown over a short
// massive trunk, with a few deep red fruit hanging under the edge of the leaves. Reusable: any scene
// may prepend TREE_GLSL and call
//   float treeTrace(vec3 ro, vec3 rd, float tmax, float jit, out int id)   // id 1 wood, 2 leaves, 3 fruit; -1 if missed
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
// cached once per pixel: limbs, billows, fruit
vec3 gLA[6], gLM[6], gLB[6], gLC[6];
vec4 gBill[12];
vec3 gFruit[12], gStalk[12];
bool gBillOk = false;
vec3 fruitPos0(int i);
void treeInit() {
  for (int i = 0; i < 6; i++) {
    vec3 a, m, b, c; limbPts(i, a, m, b, c);
    gLA[i] = a; gLM[i] = m; gLB[i] = b; gLC[i] = c;
    gBill[i * 2] = vec4(b + vec3(0.0, 0.6 + 2.2 * hash11(float(i) * 5.3), 0.0), 3.6 + 1.6 * hash11(float(i) * 9.1));
    gBill[i * 2 + 1] = vec4(c + vec3(0.0, 1.2 + 2.6 * hash11(float(i) * 6.1), 0.0), 3.4 + 1.4 * hash11(float(i) * 3.7));
  }
  for (int i = 0; i < 12; i++) {
    gFruit[i] = fruitPos0(i);
    // the outer fruit hang by short stalks from the leaves; the inner ones from the limbs themselves
    gStalk[i] = i < 6 ? gFruit[i] + vec3(0.04 * sin(float(i) * 3.0), 0.32, 0.04 * cos(float(i) * 2.0)) : gLM[i - 6] + vec3(0.0, -0.4, 0.0);
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
    q += vec3(sin(q.y * 0.9 + q.z * 0.3), 0.0, cos(q.y * 0.8 + q.x * 0.35)) * 0.22 * smoothstep(4.0, 8.0, q.y);
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

// ---- the fruit: a few, under the crown's edge, on the side toward the light ----
#define NFRUIT 12
vec3 fruitPos(int i) { if (!gBillOk) treeInit(); return gFruit[i]; }
vec3 fruitPos0(int i) {
  float fi = float(i);
  vec3 a, m, b, c; limbPts(int(mod(fi, 6.0)), a, m, b, c);
  // the outer fruit dangle just below the crown's rim; the inner ones hang from the great limbs
  if (i >= 6) {
    vec2 sd = normalize(vec2(-m.z, m.x)) * (0.35 * (hash11(fi * 4.7) - 0.5));
    return m + vec3(sd.x, -0.95 - 0.25 * hash11(fi * 8.3), sd.y);
  }
  vec3 base = b;
  float ang = atan(base.z, base.x) + 0.9 * (hash11(fi * 4.7 + 1.0) - 0.5);
  float r = 1.8 + 1.6 * hash11(fi * 2.9);
  return base + vec3(cos(ang) * r, -2.6 - 0.6 * hash11(fi * 8.3), sin(ang) * r);
}
float fruitSD(vec3 q, out int fi) {
  float d = 1e5; fi = -1;
  if (uFruitK < 0.5) return d;
  // all fruit hang in a ring 5..17 m out and 4..12 m up
  float rr = length(q.xz);
  float bnd = max(max(2.5 - rr, rr - 17.0), max(4.0 - q.y, q.y - 12.0));
  if (bnd > 0.5) return bnd;
  for (int i = 0; i < NFRUIT; i++) {
    vec3 f = fruitPos(i);
    float k = length(q - f) - 0.12;
    if (k < d) { d = k; fi = i; }
  }
  return d;
}
// the stalks the fruit hang by, up into the leaves
float stalkSD(vec3 q) {
  float d = 1e5;
  if (uFruitK < 0.5) return d;
  float rr = length(q.xz);
  float bnd = max(max(2.5 - rr, rr - 17.0), max(4.0 - q.y, q.y - 12.0));
  if (bnd > 0.5) return bnd;
  for (int i = 0; i < NFRUIT; i++) {
    vec3 f = fruitPos(i);
    d = min(d, tcap(q, f + vec3(0.0, 0.1, 0.0), gStalk[i], 0.007, 0.012));
  }
  return d;
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
    int fi; float df = fruitSD(q, fi);
    float d = min(min(woodSD(q), stalkSD(q)), df);
    if (d < 0.0015 * t) { best = t; id = df <= d + 1e-4 ? 3 : 1; break; }
    t += d * 0.85;
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

// the fruit's skin: deep red, darker streaks, fine gold bloom at the rim
vec3 fruitSkin(vec3 n, vec3 rd, vec3 L, vec3 sunC, vec3 skyC, float sh, vec3 lp) {
  // deep crimson with darker streaks running pole to pole, a gold blush at the shoulder
  vec3 d = normalize(lp);
  float a = atan(d.z, d.x);
  float st = fbm(vec2(a * 4.0, d.y * 1.5) + 3.0, 3) * 0.7 + vnoise(vec2(a * 18.0, d.y * 3.0)) * 0.3;
  vec3 alb = mix(vec3(0.22, 0.008, 0.012), vec3(0.42, 0.024, 0.016), smoothstep(0.25, 0.8, st));
  alb = mix(alb, vec3(0.09, 0.004, 0.012), smoothstep(-0.2, -1.0, d.y) * 0.5);
  alb = mix(alb, vec3(0.5, 0.2, 0.03), smoothstep(0.55, 0.95, d.y) * 0.45);
  float ndl = dot(n, L);
  float wrap = sat((ndl + 0.35) / 1.35);
  vec3 c = alb * sunC * wrap * sh;
  c += vec3(0.9, 0.06, 0.03) * sunC * pow(sat(1.0 - abs(ndl)), 2.0) * (0.15 + 0.6 * pow(sat(dot(rd, L)), 4.0)) * max(sh, 0.15);     // light through the rim
  // soft light from the sky above and warm light bounced from the ground below model its roundness
  c += alb * skyC * (pow(0.5 + 0.5 * n.y, 1.5) * 2.2 + vec3(0.6, 0.45, 0.25) * sat(0.4 - 0.6 * n.y));
  float fr = pow(1.0 - sat(dot(-rd, n)), 3.0);
  c += vec3(0.9, 0.62, 0.22) * fr * 0.3 * (skyC + sunC * 0.2 * sh);                  // the gold bloom
  vec3 h = normalize(L - rd);
  c += sunC * pow(sat(dot(n, h)), 90.0) * 0.6 * sh;
  // a soft window of sky caught in the waxy skin
  vec3 r = reflect(rd, n);
  c += skyC * 0.5 * smoothstep(0.6, 0.95, r.y) * (0.06 + 0.5 * fr);
  return c;
}

vec3 treeShade(vec3 p, vec3 rd, int id, vec3 L, vec3 sunC, vec3 skyC, vec3 gndC) {
  vec3 q = treeBend(p - uTreePos);
  if (id == 3) {
    int fi; fruitSD(q, fi);
    vec3 n = normalize(q - fruitPos(fi));
    float sh = treeShadow(p + n * 0.05, L);
    return fruitSkin(n, rd, L, sunC, skyC, sh, q - fruitPos(fi));
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
export function fruitPosJS(i, treePos = TREE_UNIFORMS.uTreePos) {
  const { m, b } = limbPts(i % 6);
  let p;
  if (i >= 6) {
    const l = Math.hypot(m[0], m[2]), k = 0.35 * (hash11(i * 4.7) - 0.5);
    p = [m[0] - m[2] / l * k, m[1] - 0.95 - 0.25 * hash11(i * 8.3), m[2] + m[0] / l * k];
  } else {
    const ang = Math.atan2(b[2], b[0]) + 0.9 * (hash11(i * 4.7 + 1.0) - 0.5);
    const r = 1.8 + 1.6 * hash11(i * 2.9);
    p = [b[0] + Math.cos(ang) * r, b[1] - 2.6 - 0.6 * hash11(i * 8.3), b[2] + Math.sin(ang) * r];
  }
  return [p[0] + treePos[0], p[1] + treePos[1], p[2] + treePos[2]];
}
