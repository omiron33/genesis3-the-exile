// The fruit, close: one spray of the tree of knowledge (a woody twig, its dark glossy leaves, a
// short fruiting spur with a rosette of leaves, and one red apple hanging from it by a short stem),
// placed anywhere in the world. The apple itself (shape, skin, light) is shared with the great tree
// (appleSD, appleAlb in x-tree.js). Used for the
// medium and macro shots: the fruit among leaves, the fruit turning on its stem with dew running
// down it, the snap as it is torn away, the broken stem at dusk, and (fallenSD) a bitten fruit
// lying in the grass. Prepend after WORLD_GLSL (uses SUN, sunC(), skyAmb(), treeShadow()).
// Units are metres. The spray's local frame: the twig runs along +x from its base at x = -0.36;
// the spur grows down from it at the origin and ends at NODE, where the stem hangs from it (and where
// it breaks when the fruit is torn away); the apple hangs under it with its centre at FC.
export const FRUIT_UNIFORMS = {
  uSprayO: [0.0, 0.0, 0.0],   // world position of the stem's node
  uSprayYaw: 0.0,             // turn of the whole spray about the vertical
  uSpin: 0.0,                 // the fruit turning on its stem (radians)
  uLift: 0.0,                 // the twig springing up about its base (radians)
  uFruitOn: 1.0,              // 1 hanging; 0 gone
  uPull: [0.0, 0.0, 0.0],     // the fruit's offset as it is torn away (local)
  uBroken: 0.0,               // the stem's broken end and wound
  uDew: 0.0,                  // dew on skin and leaves
  uRun: -1.0,                 // a running drop: 0..1 down the side (negative: none)
  uShiverM: 0.0,              // leaves trembling
  uFallen: [0.0, -100.0, 0.0],// world position of a fallen, bitten fruit
  uBrown: 0.0,                // its flesh browning
  uAmbK: 1.0,                 // scales the soft light from sky and ground on the spray
  uBoughTo: [0.0, -100.0, 0.0], // world point the spray's bough climbs to (a limb); y < -50: none
  uLeafN: 12.0,               // how many leaves the spray carries (max 12)
  uFrontO: [0.0, 0.0, 0.0],   // a second sprig of leaves nearer the lens (local offset)
  uFrontN: 0.0,               // how many leaves it has (max 4)
  uFrontYaw: 0.0,
  uBlush: 0.9,                // which way (fruit-local azimuth) the apple's red cheek faces
};

export const FRUIT_GLSL = /* glsl */ `
uniform vec3 uSprayO, uPull, uFallen, uFrontO;
uniform float uFrontN, uFrontYaw, uAmbK, uBlush;
uniform vec3 uBoughTo;
float gNoFruit = 0.0;
bool gSprayOk = false;
float gNear = 0.0;   // the spray trace ignores anything nearer the lens than this
vec3 gFallen = vec3(0.0, -100.0, 0.0);   // set by the scene (e.g. from uFallen and the ground)
float gFallenYaw = 0.6, gFallenTilt = 1.25;   // its turn, and how far it lies over (the bite faces local +x)
uniform float uSprayYaw, uSpin, uLift, uFruitOn, uBroken, uDew, uRun, uShiverM, uBrown, uLeafN;
vec3 bokehBG(vec3 rd, float warm, float discs);
const float FR = 0.043;            // the apple's radius (8.6 cm across)
const vec3 NODE = vec3(0.005, -0.019, 0.002);   // the spur's end: the stem hangs from here
const vec3 FC = vec3(0.005, -0.067, 0.002);     // the apple's centre, hanging straight under it

vec3 toSpray(vec3 p) {
  vec3 q = p - uSprayO;
  q.xz = rot(uSprayYaw) * q.xz;
  // the twig springs about its base
  vec3 b = vec3(-0.36, 0.0, 0.0);
  vec3 r = q - b;
  float k = smoothstep(0.0, 0.5, r.x);
  r.xy = rot(-uLift * (0.4 + 0.6 * k)) * r.xy;
  return r + b;
}

// spray-local to world (the inverse of toSpray, near enough for small lifts)
vec3 fromSpray(vec3 q) {
  vec3 b = vec3(-0.36, 0.0, 0.0);
  vec3 r = q - b;
  float k = smoothstep(0.0, 0.5, r.x);
  r.xy = rot(uLift * (0.4 + 0.6 * k)) * r.xy;
  vec3 p = r + b;
  p.xz = rot(-uSprayYaw) * p.xz;
  return p + uSprayO;
}
// ---- wood: the twig, the leaf stalks, the stem ----
float tcapM(vec3 p, vec3 a, vec3 b, float ra, float rb) {
  vec3 pa = p - a, ba = b - a; float h = sat(dot(pa, ba) / dot(ba, ba));
  return length(pa - ba * h) - mix(ra, rb, h);
}
vec3 twigAt(float x) { return vec3(x, 0.018 * sin(x * 6.0 + 0.4) + 0.05 * x - 0.03 * x * x, 0.02 * sin(x * 4.0 + 1.0)); }
float twigSD(vec3 q) {
  float d = 1e5;
  for (int i = 0; i < 5; i++) {
    float x0 = -0.42 + float(i) * 0.15, x1 = x0 + 0.15;
    d = min(d, tcapM(q, twigAt(x0), twigAt(x1), 0.0135 - 0.0016 * float(i), 0.0119 - 0.0016 * float(i)));
  }
  // a side shoot forking up and away
  vec3 a = twigAt(0.12), b = a + vec3(0.13, 0.09, 0.07);
  d = smin(d, tcapM(q, a, b, 0.0062, 0.0035), 0.004);
  // bark: small knots and ridges (only worth computing close to the surface)
  if (d < 0.004) d += 0.0006 * (vnoise(q * vec3(60.0, 300.0, 300.0)) - 0.5);
  // the bough it grows from, arching up to a limb of the tree
  if (uBoughTo.y > -50.0) {
    // a bough that carries on from the twig and curves up to the limb
    vec3 a0 = twigAt(-0.42), b0 = toSpray(uBoughTo);
    float L = length(b0 - a0);
    vec3 p1 = a0 + normalize(vec3(-1.0, 0.1, 0.0)) * 0.45 * L, p2 = b0 + vec3(0.0, -0.3 * L, 0.0);
    vec3 prev = a0;
    for (int k = 1; k <= 8; k++) {
      float u = float(k) / 8.0, v = 1.0 - u, u0 = u - 0.125;
      vec3 cur = v * v * v * a0 + 3.0 * v * v * u * p1 + 3.0 * v * u * u * p2 + u * u * u * b0;
      d = min(d, tcapM(q, prev, cur, mix(0.0135, 0.11, sqrt(max(u0, 0.0)) * u0), mix(0.0135, 0.11, sqrt(u) * u)));
      prev = cur;
    }
  }
  return d;
}
// the apple swings a little on its stem; the stem runs from the spur's end down into the cavity
vec2 gSwing = vec2(0.0);
vec3 gStemTop, gStemBot;
void sprayInit();
// fruit-local (in metres) axis point -> spray-local
vec3 fruitAxisToSpray(float y) {
  vec3 v = FC - NODE + vec3(0.0, y, 0.0);
  v.zy = rot(-gSwing.y) * v.zy;
  v.xy = rot(-gSwing.x) * v.xy;
  return NODE + uPull + v;
}
float stemSD(vec3 q) {
  if (!gSprayOk) sprayInit();
  // the spur: a short woody knob under the twig, ringed with old bud scars, swelling at its end
  vec3 sa = twigAt(0.0) + vec3(0.0, -0.004, 0.0), sb = NODE + vec3(0.0, 0.0025, 0.0);
  float d = tcapM(q, sa, sb, 0.0048, 0.0037);
  if (d < 0.002) { vec3 ba = sb - sa; float h = sat(dot(q - sa, ba) / dot(ba, ba)); d += 0.00025 * sin(h * 40.0) * step(0.45, h); }
  d = smin(d, length(q - NODE - vec3(0.0, 0.002, 0.0)) - 0.0036, 0.002);
  if (uBroken > 0.5) {
    // torn: a ragged stub of stem left on the spur, fibres pulled out of it
    vec3 e = NODE + vec3(0.0005, -0.0028, 0.0003);
    float st = tcapM(q, NODE, e, 0.0019, 0.0016);
    float k = smoothstep(0.003, 0.0, length(q - e));
    st += k * 0.0006 * (vnoise(q * 2500.0) - 0.3);
    st = min(st, tcapM(q, e, e + vec3(0.0006, -0.0022, 0.0003), 0.0005, 0.00015));
    st = min(st, tcapM(q, e, e + vec3(-0.0007, -0.0018, -0.0004), 0.00045, 0.00015));
    d = min(d, st);
  }
  // the stem (it goes with the apple when it is torn away)
  if (uFruitOn > 0.5 && gNoFruit < 0.5) {
    vec3 a = gStemTop, b = gStemBot;
    vec3 m = mix(a, b, 0.5) + vec3(0.0018, 0.0, 0.0009);
    float sd = min(tcapM(q, a, m, 0.0019, 0.0015), tcapM(q, m, b, 0.0015, 0.0018));
    sd = smin(sd, length(q - a) - 0.0022, 0.0015);   // the joint where it meets the spur
    d = min(d, sd);
  }
  return d;
}

// ---- leaves ----
// leaf i: attachment, frame (u along the blade, n its face normal), length, width
void leafFrame(int i, out vec3 A, out vec3 U, out vec3 N, out float L, out float W) {
  float fi = float(i);
  // leaves grow in loose whorls of three or four along the twig and its shoot
  float cl = floor(fi / 3.0), k = fi - cl * 3.0;
  A = cl < 1.5 ? twigAt(-0.32 + cl * 0.15) : twigAt(0.12) + vec3(0.13, 0.09, 0.07) * (0.55 + 0.45 * k / 2.0);
  if (cl > 1.5 && cl < 2.5) A = twigAt(0.0) + vec3(0.003, -0.01, 0.0015);   // the rosette round the spur
  if (i >= 12) { float j = fi - 12.0; A = uFrontO + vec3(cos(uFrontYaw), 0.0, sin(uFrontYaw)) * (j * 0.045 - 0.09) + vec3(0.0, 0.012 * sin(j * 2.0), 0.0); cl = 7.0; k = j; }
  float sh = uShiverM * (0.6 * sin(uTime * 23.0 + fi * 2.3) + 0.4 * sin(uTime * 31.0 + fi * 5.1));
  float phi = k * 2.1 + cl * 1.3 + 0.8 * (hash11(fi * 1.7) - 0.5);
  float fw = 0.35 + 0.5 * hash11(fi * 4.4);
  U = normalize(vec3(fw, 0.55 * sin(phi) + 0.25 + sh * 0.12 + 0.03 * sin(uTime * 1.3 + fi), cos(phi)));
  if (cl > 1.5 && cl < 2.5) {
    // the rosette fans out round the spur, above the apple's shoulders
    float an = k * 2.3 + 0.9 + 0.4 * (hash11(fi * 1.7) - 0.5);
    U = normalize(vec3(cos(an), 0.2 + 0.2 * hash11(fi * 4.4) + sh * 0.12 + 0.03 * sin(uTime * 1.3 + fi), sin(an)));
  }
  vec3 side3 = normalize(cross(U, vec3(0.0, 1.0, 0.0)));
  float roll = 0.6 * (hash11(fi * 6.6) - 0.5) + sh * 0.35;
  N = normalize(cross(side3, U));
  N = normalize(N * cos(roll) + side3 * sin(roll));
  // apple leaves: ovate, pointed, about as long as the apple is wide
  L = 0.08 + 0.035 * hash11(fi * 2.2);
  W = L * (0.5 + 0.08 * hash11(fi * 7.3));
}
// leaf frames, computed once per pixel
vec3 gLfA[16], gLfU[16], gLfN[16];
vec2 gLfLW[16];
float gLfOff[16];
void sprayInit() {
  for (int i = 0; i < 16; i++) {
    vec3 A, U, N; float L, W; leafFrame(i, A, U, N, L, W);
    gLfA[i] = A; gLfU[i] = U; gLfN[i] = N; gLfLW[i] = vec2(L, W);
    gLfOff[i] = 0.0;
  }
  gSwing = (0.02 + 0.06 * uShiverM) * vec2(sin(uTime * 1.2 + 0.4), sin(uTime * 0.93 + 1.7));
  gStemBot = fruitAxisToSpray(0.5 * FR);
  gStemTop = uBroken > 0.5 ? fruitAxisToSpray(0.5 * FR + 0.026) : NODE;
  gSprayOk = true;
}
// distance to leaf i; uv: (u 0..1 along, v -1..1 across)
float leafSD(vec3 q, int i, out vec2 uv) {
  if (!gSprayOk) sprayInit();
  if (gLfOff[i] > 0.5) { uv = vec2(0.0); return 1e3; }
  vec3 A = gLfA[i], U = gLfU[i], N = gLfN[i]; float L = gLfLW[i].x, W = gLfLW[i].y;
  vec3 r = q - A;
  uv = vec2(0.0);
  float pet = 0.02;
  float bd = length(r - U * (L * 0.5 + pet)) - L * 0.75;
  if (bd > 0.01) return bd;
  vec3 V = cross(N, U);
  float u = dot(r, U) - pet, v = dot(r, V), w = dot(r, N);
  float s = u / L;
  // ovate, broadest below the middle, drawn out to a point; finely serrate
  float hw = W * 0.5 * pow(max(sin(pow(clamp(s, 0.0, 1.0), 0.85) * 3.14159), 0.0), 0.75) * (1.0 - 0.12 * s);
  hw -= W * 0.012 * fract(s * 26.0) * step(0.06, s) * step(s, 0.95);
  // the blade droops along its length and cups a little across
  float sur = -0.3 * L * s * s + 0.6 * v * v / max(W, 1e-3);
  float dw = w - sur;
  float d2 = max(abs(v) - hw, max(-u, u - L));
  float dd = max(d2, abs(dw) - 0.0005);
  uv = vec2(s, v / max(hw, 1e-4));
  // the leaf stalk
  float ps = tcapM(r, vec3(0.0), U * pet, 0.0011, 0.0009);
  return min(dd * 0.6, ps);
}

// ---- the fruit: an apple (x-tree.js) ----
float fruitShape(vec3 f) { return appleSD(f / FR) * FR * 0.9; }
// spray-local to fruit-local: it hangs from NODE, swings on its stem, turns, and is pulled away
vec3 fruitLocal(vec3 q) {
  if (!gSprayOk) sprayInit();
  vec3 v = q - NODE - uPull;
  v.xy = rot(gSwing.x) * v.xy;
  v.zy = rot(gSwing.y) * v.zy;
  vec3 f = v - (FC - NODE);
  f.xz = rot(uSpin) * f.xz;
  return f;
}

// the spray's map; id 1 wood, 2 leaf, 3 fruit; li leaf index
float sprayMap(vec3 p, out int id, out int li) {
  vec3 q = toSpray(p);
  id = 1; li = -1;
  float d = min(twigSD(q), stemSD(q));
  if (uFruitOn > 0.5 && gNoFruit < 0.5) { float df = fruitShape(fruitLocal(q)); if (df < d) { d = df; id = 3; } }
  for (int i = 0; i < 16; i++) {
    if (i < 12 && float(i) >= uLeafN) continue;
    if (i >= 12 && float(i - 12) >= uFrontN) break;
    vec2 uv; float dl = leafSD(q, i, uv);
    if (dl < d) { d = dl; id = 2; li = i; }
  }
  return d;
}
float sprayTrace(vec3 ro, vec3 rd, float tmax, out int id, out int li) {
  // bounding sphere
  vec3 oc = ro - (uSprayO + vec3(0.0, -0.02, 0.0));
  float br = 0.7 + length(uFrontO) * step(0.5, uFrontN);
  if (uBoughTo.y > -50.0) br = max(br, length(uBoughTo - uSprayO) + 0.2);
  float b = dot(oc, rd), c = dot(oc, oc) - br * br, h = b * b - c;
  id = -1; li = -1;
  if (h < 0.0) return -1.0;
  h = sqrt(h);
  float t = max(-b - h, 0.0), t1 = min(-b + h, tmax);
  // leaves that come too near the lens are left out whole
  if (gNear > 0.0) {
    if (!gSprayOk) sprayInit();
    for (int i = 0; i < 16; i++) {
      vec3 c = fromSpray(gLfA[i] + gLfU[i] * gLfLW[i].x * 0.5);
      gLfOff[i] = length(c - uCamPos) < gNear + gLfLW[i].x * 0.6 ? 1.0 : 0.0;
    }
  }
  for (int i = 0; i < 140; i++) {
    float d = sprayMap(ro + rd * t, id, li);
    if (d < 0.00015 + 0.0004 * t) return t;
    t += d;
    if (t > t1) break;
  }
  id = -1;
  return -1.0;
}
vec3 sprayNormal(vec3 p) {
  int a, b; vec2 e = vec2(0.0002, 0.0);
  return normalize(vec3(sprayMap(p + e.xyy, a, b) - sprayMap(p - e.xyy, a, b), sprayMap(p + e.yxy, a, b) - sprayMap(p - e.yxy, a, b), sprayMap(p + e.yyx, a, b) - sprayMap(p - e.yyx, a, b)));
}

// dew: drops on a sphere-ish surface, from cells in (azimuth, height) coordinates
// returns (drop strength 0..1, offset of the drop's dome normal xy) via out
float dewDrop(vec3 f, float scale, out vec3 dn) {
  float a = atan(f.z, f.x), y = f.y / FR;
  vec2 pp = vec2(a * 6.0 * scale, y * 6.5 * scale);
  vec2 ci = floor(pp), fc = fract(pp) - 0.5;
  vec2 o = (hash22(ci) - 0.5) * 0.5;
  float r = 0.16 + 0.24 * hash12(ci + 4.0);
  float has = step(1.0 - uDew * 0.22, hash12(ci + 9.0));
  vec2 dv = (fc - o) / r;
  float k = 1.0 - dot(dv, dv);
  dn = vec3(dv, 0.0);
  return has * step(0.0, k) * sqrt(max(k, 0.0));
}

float gRed = 1.0;
vec3 skinColour(vec3 f, vec3 fn) { return appleAlb(f / FR, uBlush, gRed); }

// the fruit's skin, lit; f local fruit coords, n world normal
vec3 shadeFruitSkin(vec3 p, vec3 f, vec3 n, vec3 rd, vec3 bg, float sh) {
  vec3 L = SUN;
  vec3 sc = sunC();
  vec3 alb = skinColour(f, n);
  float red = gRed;
  // the skin is not quite smooth: a faint unevenness that breaks up the highlight
  vec3 fq = f * 260.0;
  n = normalize(n + (vec3(vnoise(fq), vnoise(fq + 7.1), vnoise(fq + 3.3)) - 0.5) * 0.035);
  // dew drops and the running drop
  vec3 dn; float drop = 0.0;
  if (uDew > 0.0) {
    vec3 dn1, dn2; float d1 = dewDrop(f, 1.0, dn1), d2 = dewDrop(f + 0.013, 1.9, dn2) * 0.8;
    if (d1 >= d2) { drop = d1; dn = dn1; } else { drop = d2; dn = dn2; }
  }
  float wet = 0.0;
  if (uRun >= 0.0) {
    float a = atan(f.z, f.x), y = f.y / FR;
    float ra = 0.4;   // the meridian the drop runs down (fruit space)
    float yd = mix(0.75, -0.75, uRun);
    float da = (a - ra) * length(f.xz) / FR;
    vec2 dv = vec2(da, (y - yd) * 0.75) / 0.13;
    float k = 1.0 - dot(dv, dv);
    if (k > 0.0) { drop = max(drop, sqrt(k)); dn = vec3(dv, 0.0) * 0.9; }
    wet = smoothstep(0.06, 0.0, abs(da)) * step(yd, y) * smoothstep(0.85, 0.6, y);
  }
  float ndl = dot(n, L);
  vec3 c = alb * sc * sat((ndl + 0.2) / 1.2) * sh;
  // light scattered in the flesh glows through the skin at the terminator: red under the red, gold under the yellow
  vec3 sss = mix(vec3(0.5, 0.36, 0.08), vec3(0.6, 0.05, 0.025), red);
  c += sss * sc * pow(sat(1.0 - abs(ndl)), 3.0) * (0.05 + 0.35 * pow(sat(dot(rd, L)), 4.0)) * max(sh, 0.2);
  c += alb * (skyAmb() * (0.55 + 0.45 * n.y) * 1.2 + bg * 0.75 + mix(vec3(0.5, 0.42, 0.12), vec3(0.05, 0.06, 0.07), uDusk) * sat(0.35 - 0.65 * n.y)) * uAmbK;
  float ndv = sat(dot(-rd, n));
  // the bloom: a faint pale powdery haze toward the rim (wiped away where the drop has run)
  c += vec3(0.55, 0.58, 0.64) * pow(1.0 - ndv, 2.5) * 0.1 * (1.0 - wet) * (0.3 + 0.7 * red) * (skyAmb() + sc * 0.08 * sh) * uAmbK;
  // the wax: a soft broad sheen and a crisp highlight; the clear wet trail is glassier
  vec3 h = normalize(L - rd);
  float nh = sat(dot(n, h));
  c += sc * sh * (pow(nh, 22.0) * 0.045 + pow(nh, 320.0) * 0.55 + pow(nh, 900.0) * 10.0 * wet);
  float fw = 0.04 + 0.96 * pow(1.0 - ndv, 5.0);
  c += bg * fw * (0.45 + 0.5 * wet) * uAmbK;
  // a dew drop is a little lens: it mirrors the light round it, focuses a crescent of sun on the
  // skin on its far side, and has a dark meniscus at its edge
  if (drop > 0.0) {
    vec3 t1 = normalize(cross(n, vec3(0.0, 1.0, 0.0)) + 1e-4), t2 = cross(n, t1);
    vec3 dN = normalize(n + (t1 * dn.x + t2 * dn.y) * 1.8);
    vec3 env = bokehBG(reflect(rd, dN), 1.0, 1.0);
    float F = 0.03 + 0.97 * pow(1.0 - sat(dot(-rd, dN)), 5.0);
    vec2 Lt = vec2(dot(L, t1), dot(L, t2));
    float caus = smoothstep(0.55, 0.0, length(dn.xy + normalize(Lt + 1e-4) * 0.45)) * sat(0.4 + dot(n, L));
    vec3 under = c * 0.75 + mix(vec3(0.6, 0.45, 0.1), vec3(0.6, 0.06, 0.03), red) * sc * sh * caus * 0.35;
    vec3 dc = under + env * F * 1.1 + sc * sh * pow(sat(dot(dN, h)), 800.0) * 14.0;
    dc *= mix(1.0, 0.3, smoothstep(0.5, 0.08, drop));
    c = mix(c, dc, smoothstep(0.0, 0.08, drop));
  }
  return c;
}

// leaves: deep glossy green above, paler beneath, veins, light through them
vec3 shadeLeaf(vec3 p, vec3 n0, vec3 rd, int li, vec3 bg, float sh) {
  vec3 q = toSpray(p);
  vec2 uv; leafSD(q, li, uv);
  vec3 N = gLfN[li];
  vec3 n = n0;
  bool top = dot(n, N) > 0.0;  // the blade's upper face
  if (dot(n, rd) > 0.0) n = -n;
  vec3 L = SUN, sc = sunC();
  float s = uv.x, v = uv.y;
  float mid = exp(-abs(v) * 34.0);
  float lat = 0.0;
  for (int k = 1; k < 9; k++) { float u0 = float(k) * 0.105; lat = max(lat, exp(-abs(s - u0 - abs(v) * 0.22) * 90.0) * step(u0, s)); }
  float tone = vnoise(uv * vec2(14.0, 6.0) + float(li) * 7.0);
  vec3 alb = top ? mix(vec3(0.012, 0.03, 0.012), vec3(0.03, 0.055, 0.02), tone) : mix(vec3(0.05, 0.075, 0.035), vec3(0.08, 0.1, 0.05), tone);
  alb = mix(alb, top ? vec3(0.05, 0.07, 0.025) : vec3(0.11, 0.13, 0.07), mid * 0.7 + lat * 0.35);
  // the edge browns a touch
  alb = mix(alb, vec3(0.06, 0.05, 0.02), smoothstep(0.85, 1.0, abs(v)) * 0.4);
  float ndl = dot(n, L);
  vec3 c = alb * sc * sat(ndl) * sh;
  // light through the blade: veins show darker against the glow
  float through = sat(-ndl) * sh;
  vec3 tc = vec3(0.07, 0.135, 0.03) * (1.0 - 0.6 * (mid + lat * 0.6));
  c += tc * sc * through * (0.25 + 0.75 * pow(sat(dot(rd, L)), 2.0));
  c += alb * (skyAmb() * (0.6 + 0.4 * n.y) + bg * 0.3) * uAmbK;
  // gloss on the upper face
  vec3 h = normalize(L - rd);
  float fr = 0.04 + 0.96 * pow(1.0 - sat(dot(-rd, n)), 5.0);
  if (top) {
    c += sc * pow(sat(dot(n, h)), 120.0) * 1.2 * sh * (1.0 - lat * 0.5);
    c += bg * fr * 0.12;
  }
  c += bg * pow(1.0 - sat(dot(-rd, n)), 4.0) * 0.3 * uDusk;
  // dew beads on the leaf
  if (uDew > 0.0) {
    vec2 dp = uv * vec2(18.0, 5.0);
    vec2 ci = floor(dp), f = fract(dp) - 0.5 - (hash22(ci + float(li)) - 0.5) * 0.5;
    float dd = smoothstep(0.22, 0.12, length(f * vec2(1.0, 2.0))) * step(1.0 - uDew * 0.35, hash12(ci + float(li) * 3.0));
    c = mix(c, c * 1.4 + sc * sh * 0.4 * smoothstep(0.1, 0.0, length(f - vec2(-0.05, 0.05))), dd);
  }
  return c;
}

vec3 shadeWood(vec3 p, vec3 n, vec3 rd, vec3 bg, float sh) {
  vec3 q = toSpray(p);
  vec3 L = SUN, sc = sunC();
  float g = vnoise(vec2(q.x * 120.0, atan(q.z, q.y) * 2.0)) * 0.6 + vnoise(vec2(q.x * 400.0, atan(q.z, q.y) * 5.0)) * 0.4;
  vec3 alb = mix(vec3(0.06, 0.045, 0.03), vec3(0.11, 0.085, 0.06), g);
  // the spur: grey-brown, ringed; the stem below its end: smoother, olive-brown, a little green
  float st = stemSD(q), tw = twigSD(q);
  if (st < tw) {
    float sv = vnoise(vec2(q.y * 2500.0, atan(q.z, q.x) * 3.0));
    alb = mix(vec3(0.075, 0.06, 0.045), vec3(0.12, 0.1, 0.075), g);
    if (q.y < NODE.y - 0.0015) alb = mix(vec3(0.09, 0.075, 0.03), vec3(0.16, 0.12, 0.05), 0.5 * g + 0.5 * sv);
  }
  // the broken end: pale torn fibre, wet and dark at its heart
  if (uBroken > 0.5) {
    float e = length(q - NODE - vec3(0.0005, -0.0028, 0.0003));
    alb = mix(alb, mix(vec3(0.018, 0.008, 0.005), vec3(0.14, 0.11, 0.05), smoothstep(0.0008, 0.0018, e)), smoothstep(0.0032, 0.0018, e));
  }
  vec3 c = alb * sc * sat(dot(n, L)) * sh + alb * (skyAmb() * (0.6 + 0.4 * n.y) + bg * 0.2) * uAmbK;
  // the sun catching the bark's edge from behind
  c += alb * sc * pow(1.0 - sat(dot(-rd, n)), 3.0) * pow(sat(dot(rd, L)), 2.0) * 1.5 * sh;
  c += bg * pow(1.0 - sat(dot(-rd, n)), 4.0) * 0.35 * uDusk;
  // the cold edge of light round a silhouette against the evening sky
  c += sc * 0.06 * pow(1.0 - sat(dot(-rd, n)), 4.0) * pow(sat(dot(rd, L) * 0.5 + 0.5), 3.0) * uDusk;
  c *= 1.0 + 0.3 * (g - 0.5);
  vec3 h = normalize(L - rd);
  c += sc * pow(sat(dot(n, h)), 40.0) * 0.08 * sh;
  return c;
}

// a sun-shadow ray against the spray itself (leaves over the fruit)
float sprayShadow(vec3 p, vec3 L) {
  float t = 0.002, s = 1.0;
  for (int i = 0; i < 40; i++) {
    int id, li;
    float d = sprayMap(p + L * t, id, li);
    s = min(s, sat(40.0 * d / t));
    if (s < 0.01) break;
    t += clamp(d, 0.0008, 0.03);
    if (t > 0.5) break;
  }
  return s;
}

// shade whatever sprayTrace hit
vec3 shadeSpray(vec3 p, vec3 rd, int id, int li, vec3 bg, float worldSh) {
  vec3 n = sprayNormal(p);
  gNoFruit = id == 3 ? 1.0 : 0.0;
  // start the sun's ray on the lit side of the surface (a leaf is lit through from that side)
  vec3 nl = dot(n, SUN) >= 0.0 ? n : -n;
  float sh = worldSh * sprayShadow(p + nl * 0.0008, SUN);
  gNoFruit = 0.0;
  if (id == 3) {
    vec3 q = toSpray(p);
    vec3 f = fruitLocal(q);
    return shadeFruitSkin(p, f, n, rd, bg, sh);
  }
  if (id == 2) return shadeLeaf(p, n, rd, li, bg, sh);
  return shadeWood(p, n, rd, bg, sh);
}

// ---- a fallen fruit, bitten, lying in the grass (world space at uFallen) ----
float fallenSD(vec3 p, out int part) {
  vec3 f = p - gFallen;
  f.xz = rot(gFallenYaw) * f.xz;
  f.xy = rot(gFallenTilt) * f.xy;              // lying on its side
  float d = fruitShape(f);
  // the bite: three overlapping scoops of the teeth in an arc, scalloped at the edge, the flesh
  // scored by the teeth
  vec3 b = f - vec3(FR * 0.97, 0.003, 0.0);
  vec3 bs = b * vec3(1.0, 1.2, 0.95);
  float bite = min(min(length(bs) - FR * 0.5, length(bs - vec3(0.004, 0.0, 0.014)) - FR * 0.42), length(bs - vec3(0.004, 0.0, -0.013)) - FR * 0.4);
  bite += 0.0002 * sin(b.y * 1300.0 + 2.0 * sin(b.z * 300.0));
  float dd = max(d, -bite);
  part = (-bite > d) ? 2 : 1;
  // its stem, still in the cavity
  float st = tcapM(f, vec3(0.0, 0.5 * FR, 0.0), vec3(0.0018, 0.5 * FR + 0.024, 0.0009), 0.0018, 0.0015);
  if (st < dd) { dd = st; part = 3; }
  return dd;
}
float fallenTrace(vec3 ro, vec3 rd, float tmax, out int part) {
  vec3 oc = ro - gFallen; float b = dot(oc, rd), c = dot(oc, oc) - 0.06 * 0.06, h = b * b - c;
  part = 0;
  if (h < 0.0) return -1.0;
  h = sqrt(h);
  float t = max(-b - h, 0.0), t1 = min(-b + h, tmax);
  for (int i = 0; i < 80; i++) {
    float d = fallenSD(ro + rd * t, part);
    if (d < 0.0001 + 0.0003 * t) return t;
    t += d;
    if (t > t1) break;
  }
  part = 0; return -1.0;
}
vec3 shadeFallen(vec3 p, vec3 rd, int part, vec3 bg, float sh) {
  int pp; vec2 e = vec2(0.0002, 0.0);
  vec3 n = normalize(vec3(fallenSD(p + e.xyy, pp) - fallenSD(p - e.xyy, pp), fallenSD(p + e.yxy, pp) - fallenSD(p - e.yxy, pp), fallenSD(p + e.yyx, pp) - fallenSD(p - e.yyx, pp)));
  vec3 f = p - gFallen; f.xz = rot(gFallenYaw) * f.xz; f.xy = rot(gFallenTilt) * f.xy;
  if (part == 2) {
    // flesh: pale cream going brown at the edges, wet, with tooth marks
    vec3 L = SUN, sc = sunC();
    float g = vnoise(f.yz * 900.0) * 0.6 + vnoise(f * 300.0) * 0.4;   // the grain of the flesh
    vec3 alb = mix(vec3(0.46, 0.37, 0.17), vec3(0.56, 0.46, 0.22), g);
    // browning from the bitten edge inward, in blotches
    float edge = smoothstep(0.012, 0.0, -fruitShape(f));
    float br = uBrown * (0.35 + 0.65 * vnoise(f.yz * 160.0 + 3.0)) * (0.4 + 0.6 * edge);
    alb = mix(alb, vec3(0.26, 0.13, 0.04), sat(br * 1.4));
    alb *= 0.88 + 0.12 * sin(f.z * 1400.0 + g * 3.0);
    vec3 c = alb * sc * sat(dot(n, L) * 0.6 + 0.4) * sh + alb * (skyAmb() * 1.2 + gndAmb() * 0.6);
    vec3 h = normalize(L - rd);
    c += sc * pow(sat(dot(n, h)), 200.0) * 1.5 * sh * (1.0 - uBrown * 0.7);
    return c;
  }
  if (part == 3) {
    vec3 alb = vec3(0.1, 0.075, 0.035);
    return alb * sunC() * sat(dot(n, SUN)) * sh + alb * (skyAmb() + gndAmb() * 0.5);
  }
  return shadeFruitSkin(p, f, n, rd, bg, sh);
}

// ---- the bokeh beyond a macro: the garden far out of focus, sun through leaves in gold discs ----
vec3 bokehBG(vec3 rd, float warm, float discs) {
  float az = atan(rd.x, rd.z), el = asin(clamp(rd.y, -1.0, 1.0));
  vec2 a = vec2(az, el);
  float s = max(dot(rd, SUN), 0.0);
  vec3 lo = mix(vec3(0.02, 0.035, 0.012), vec3(0.008, 0.012, 0.016), uDusk);
  vec3 hi = mix(vec3(0.55, 0.42, 0.16), vec3(0.08, 0.1, 0.14), uDusk);
  float g = smoothstep(-0.25, 0.45, el + 0.25 * (vnoise(a * 2.2) - 0.5));
  vec3 c = mix(lo, hi * (0.45 + 0.55 * warm), g);
  // the rest of the tree far out of focus: soft masses of dark leaves with light between them
  float m1 = smoothstep(0.38, 0.62, fbm(a * 3.2 + vec2(0.0, uTime * 0.01), 4));
  float m2 = smoothstep(0.42, 0.58, fbm(a * 6.5 + 7.0 + vec2(uTime * 0.012, 0.0), 3));
  vec3 leafM = mix(vec3(0.012, 0.022, 0.01), vec3(0.03, 0.045, 0.018), m2) * (1.0 - 0.6 * uDusk);
  c = mix(c, leafM, m1 * 0.85);
  c = mix(c, c * vec3(0.6, 0.85, 0.4) * 1.5, 0.35 * (1.0 - m1) * smoothstep(0.35, 0.7, vnoise(a * 3.0 + 4.0)));
  c += sunC() * 0.04 * pow(s, 6.0) * warm;
  float gaps = 1.0 - m1;
  // discs: two layers of soft circles with a brighter rim, gold where the sun gets through
  for (int l = 0; l < 2; l++) {
    float sc = l == 0 ? 7.0 : 12.0;
    vec2 p = a * sc + float(l) * 17.3;
    vec2 ci = floor(p), f = fract(p) - 0.5;
    for (int j = -1; j <= 1; j++) for (int i = -1; i <= 1; i++) {
      vec2 cc = ci + vec2(i, j);
      vec2 o = (hash22(cc) - 0.5) * 0.9 + vec2(i, j);
      float r = (0.18 + 0.2 * hash12(cc + 3.0)) * (l == 0 ? 1.0 : 0.8);
      float d = length(f - o);
      float on = step(0.5, hash12(cc + 11.0)) * smoothstep(0.25, 0.65, vnoise(cc * 0.35 + 2.0));
      float disc = smoothstep(r, r - 0.025, d) * (0.75 + 0.25 * smoothstep(r - 0.06, r - 0.01, d));
      vec3 dc = mix(vec3(1.0, 0.72, 0.32), vec3(0.75, 0.95, 0.45), hash12(cc + 5.0) * 0.5);
      c += dc * disc * on * discs * (0.15 + 0.85 * g) * (0.25 + 0.75 * gaps) * (0.5 + 0.8 * hash12(cc + 7.0)) * (l == 0 ? 1.4 : 0.9);
    }
  }
  return c;
}
`;
