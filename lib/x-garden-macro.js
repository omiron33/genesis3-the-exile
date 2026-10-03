// The garden at macro distance: a fig bough in the low sun (three ripe figs, one splitting open, broad
// lobed leaves lit through, dew), and bees working round it. Units are metres in the bough's own frame
// (origin at the bough, +y up); scenes place it with uBough (world position) and uBoughYaw.
// Include after GARDEN_GLSL (x-garden.js).

export const MACRO_GLSL = /* glsl */ `
uniform vec3 uBough;
uniform float uBoughYaw;
uniform float uSplit;       // 0..1 the ripe fig splitting
uniform float uSway;        // breeze in the leaves

vec3 toBough(vec3 p) {
  vec3 q = p - uBough;
  q.xz = rot(-uBoughYaw) * q.xz;
  // the bough sways a little from where it leaves the tree (off to the right, +x)
  float s = uSway * (0.012 * sin(uTime * 1.3) + 0.006 * sin(uTime * 2.9 + 1.0));
  q.yz = rot(s * (0.45 - q.x)) * q.yz;
  return q;
}
// the twig: a gently bent shoot
float twig(vec3 q) {
  float d = sdRoundCone(q, vec3(0.5, 0.16, 0.06), vec3(0.18, 0.07, 0.02), 0.011, 0.008);
  d = min(d, sdRoundCone(q, vec3(0.18, 0.07, 0.02), vec3(-0.12, 0.03, -0.03), 0.008, 0.006));
  d = min(d, sdRoundCone(q, vec3(-0.12, 0.03, -0.03), vec3(-0.3, 0.06, -0.07), 0.006, 0.004));
  return d;
}
// a point on the twig's axis at bough-x (the same polyline twig() is built on)
vec3 twigAxis(float x) {
  if (x > 0.18) return mix(vec3(0.18, 0.07, 0.02), vec3(0.5, 0.16, 0.06), clamp((x - 0.18) / 0.32, 0.0, 1.0));
  if (x > -0.12) return mix(vec3(-0.12, 0.03, -0.03), vec3(0.18, 0.07, 0.02), (x + 0.12) / 0.3);
  return mix(vec3(-0.3, 0.06, -0.07), vec3(-0.12, 0.03, -0.03), clamp((x + 0.3) / 0.18, 0.0, 1.0));
}
// fig i: base position, size. Each hangs just under the twig at a leaf axil, a little to one side,
// so its short stalk runs up into the bark.
vec4 figAt(int i) {
  if (i == 0) return vec4(0.15, 0.016, 0.044, 0.86);
  if (i == 1) return vec4(0.005, -0.012, 0.017, 1.1);
  return vec4(-0.14, -0.015, 0.0, 0.95);
}
float FIG_PART;  // 0 skin, 1 inside of the split fig, 2 stem
float figSDF(vec3 q, int i) {
  vec4 f = figAt(i);
  vec3 p = (q - f.xyz) / f.w;
  // hanging: stem at the top toward the twig
  float body = sdRoundCone(p, vec3(0.0, -0.014, 0.0), vec3(0.0, 0.026, 0.0), 0.029, 0.008);
  body = smin(body, sdEllipsoid(p - vec3(0.0, -0.012, 0.0), vec3(0.03, 0.026, 0.03)), 0.01);
  body -= 0.0004 * sin(atan(p.x, p.z) * 11.0) * smoothstep(-0.03, 0.02, p.y);   // faint ribs
  float d = body;
  FIG_PART = 0.0;
  if (i == 1 && uSplit > 0.0) {
    // splitting open along a vertical seam facing us: a wedge cut that widens
    float w = uSplit * 0.0065 * smoothstep(0.022, -0.01, p.y) * smoothstep(-0.04, -0.02, p.y);
    float cut = abs(p.x + 0.003 * sin(p.y * 140.0)) - w;
    float dd = max(d, -max(cut, -p.z - 0.004));
    if (dd > d + 1e-5) FIG_PART = 1.0;
    d = dd;
  }
  d *= f.w;
  // the stalk: from the fig's neck up into the twig's bark (ending inside the twig so it joins),
  // thickening a little where it leaves the shoot
  vec3 top = f.xyz + vec3(0.0, 0.03 * f.w, 0.0);
  vec3 att = twigAxis(f.x + 0.004);
  vec3 mid = mix(top, att, 0.5) + vec3(0.0, 0.004, 0.0);
  float st = min(sdRoundCone(q, top - vec3(0.0, 0.004, 0.0), mid, 0.0042 * f.w, 0.0034), sdRoundCone(q, mid, att, 0.0034, 0.0048));
  if (st < d) { d = st; FIG_PART = 2.0; }
  return d;
}
// a broad lobed leaf: base b, along a, normal n (unit), length L; the blade curls with bend
float leafPlate(vec3 q, vec3 b, vec3 a, vec3 n, float L, float bend, out vec2 uv) {
  vec3 s = normalize(cross(n, a));
  vec3 r = q - b;
  float u = dot(r, a), v = dot(r, s);
  float w = dot(r, n) - bend * (u * u + 0.6 * v * v) / L - 0.006 * sin(u / L * 9.0) * sin(v / L * 7.0);
  uv = vec2(u, v) / L;
  // palmate outline: five rounded lobes with deep sinuses, like a fig leaf
  vec2 c = vec2(u, v) / L - vec2(0.12, 0.0);
  float th = atan(c.y, c.x);
  float lob = pow(abs(cos(th * 2.5)), 0.7);
  float rr = (0.28 + 0.6 * lob) * (1.0 - 0.35 * smoothstep(0.9, 1.7, abs(th)));
  rr *= 1.0 + 0.03 * sin(th * 40.0);
  float o = (length(c) - rr) * 0.6;
  o = max(o, abs(th) - 1.75);
  float d2 = o * L;
  return max(abs(w) - 0.0012, d2) * 0.8;
}
vec3 LEAF_UV; int LEAF_I;
float leavesSDF(vec3 q) {
  float d = 1e9;
  for (int i = 0; i < 5; i++) {
    float fi = float(i);
    vec3 h = hash33(vec3(fi, 2.0, 5.0));
    vec3 b = vec3(0.32 - fi * 0.15, 0.08 - fi * 0.01, 0.03 * (h.x - 0.5));
    float turn = uSway * 0.18 * sin(uTime * (1.1 + 0.4 * h.y) + fi * 2.0);
    float ang = (i % 2 == 0 ? 1.0 : -1.0) * (0.9 + 0.4 * h.z) + turn;
    vec3 a = normalize(vec3(-0.25 + 0.3 * h.y, 0.35 + 0.3 * h.x, sin(ang)));
    vec3 n = normalize(cross(a, vec3(cos(ang + turn), 0.0, 0.35)) + vec3(0.0, 0.0, 0.0));
    if (n.y < 0.0) n = -n;
    float L = 0.17 + 0.06 * h.y;
    vec2 uv;
    float dl = leafPlate(q, b, a, n, L, 0.12, uv);
    float pet = sdCapsule(q, twigAxis(b.x), b + a * 0.01, 0.002);   // the leaf stalk runs from the twig
    dl = min(dl, pet);
    if (dl < d) { d = dl; LEAF_UV = vec3(uv, fi); LEAF_I = i; }
  }
  return d;
}
float MPART; int MFIG;  // 0 twig, 1 fig, 2 leaf
float boughSDF(vec3 q) {
  float d = twig(q); MPART = 0.0;
  for (int i = 0; i < 3; i++) {
    float f = figSDF(q, i);
    if (f < d) { d = f; MPART = 1.0; MFIG = i; }
  }
  float l = leavesSDF(q);
  if (l < d) { d = l; MPART = 2.0; }
  return d;
}
vec3 boughNormal(vec3 q) {
  vec2 e = vec2(0.0004, 0.0);
  float m = MPART; int mf = MFIG; vec3 luv = LEAF_UV;
  vec3 n = normalize(vec3(boughSDF(q + e.xyy) - boughSDF(q - e.xyy), boughSDF(q + e.yxy) - boughSDF(q - e.yxy), boughSDF(q + e.yyx) - boughSDF(q - e.yyx)));
  MPART = m; MFIG = mf; LEAF_UV = luv;
  return n;
}
// march the bough; returns world distance or -1
float boughMarch(vec3 ro, vec3 rd, float tmax) {
  vec3 o = toBough(ro);
  vec3 d = rd; d.xz = rot(-uBoughYaw) * d.xz;
  // bounding sphere
  vec3 oc = o - vec3(0.1, 0.03, 0.0);
  float b = dot(oc, d), c = dot(oc, oc) - 0.5 * 0.5;
  float disc = b * b - c;
  if (disc < 0.0) return -1.0;
  float t = max(-b - sqrt(disc), 0.0), t1 = min(-b + sqrt(disc), tmax);
  for (int i = 0; i < 110; i++) {
    float h = boughSDF(toBough(ro + rd * t));
    if (h < 0.00025 + t * 0.0004) return t;
    t += h * 0.9;
    if (t > t1) break;
  }
  return -1.0;
}
vec3 shadeBough(vec3 ro, vec3 rd, float t) {
  vec3 p = ro + rd * t;
  vec3 q = toBough(p);
  boughSDF(q);
  float part = MPART; int fi = MFIG; vec3 luv = LEAF_UV;
  vec3 nq = boughNormal(q);
  // back to world orientation
  vec3 n = nq; n.yz = n.yz; n.xz = rot(uBoughYaw) * n.xz;
  vec3 sunC = sunLight();
  if (part > 1.5) {
    // leaf: veins, translucent against the sun
    vec2 uv = luv.xy;
    float vein = smoothstep(0.03, 0.0, abs(uv.y)) + smoothstep(0.025, 0.0, abs(fract(atan(uv.y, uv.x + 0.05) * 3.0) - 0.5) * length(uv) * 0.3);
    float cell = vnoise(uv * 60.0);
    vec3 alb = mix(vec3(0.05, 0.09, 0.02), vec3(0.09, 0.12, 0.028), cell) * (1.0 + 0.5 * vein);
    if (dot(n, rd) > 0.0) n = -n;
    n = normalize(n + 0.08 * vec3(cell - 0.5, 0.0, vnoise(uv * 40.0 + 3.0) - 0.5));
    float back = sat(-dot(n, SUN)) * (0.4 + 0.6 * sat(dot(rd, SUN)));
    vec3 c = lightW(p, n, rd, alb, 0.85, 0.85, 0.0, 0.25);
    c += alb * vec3(1.1, 1.25, 0.4) * sunC * (0.02 + 0.5 * back) * (1.0 - 0.5 * vein);
    return c;
  }
  if (part > 0.5) {
    vec3 f = figAt(fi).xyz;
    figSDF(q, fi);
    float fp = FIG_PART;
    float hgt = (q.y - f.y) / 0.05 + 0.5;
    // the stalk: green at the fig, browning into the bark of the twig
    if (fp > 1.5) return lightW(p, n, rd, mix(vec3(0.08, 0.09, 0.03), vec3(0.11, 0.09, 0.06), smoothstep(0.03, 0.06, q.y - f.y)), 0.8, 0.7, 0.0, 0.05);
    if (fp > 0.5) {
      // the opened fig: honeyed rose flesh full of seeds
      float sd = vnoise(q.xy * 900.0) * vnoise(q.zy * 700.0 + 3.0);
      vec3 alb = mix(vec3(0.34, 0.14, 0.11), vec3(0.5, 0.32, 0.18), smoothstep(0.2, 0.6, sd));
      alb = mix(alb, vec3(0.62, 0.5, 0.3), smoothstep(0.6, 0.8, sd));
      vec3 c = lightW(p, n, rd, alb, 0.5, 0.45, 0.0, 0.5);
      return c + alb * vec3(0.5, 0.45, 0.3) * 0.5;
    }
    vec3 alb = mix(vec3(0.038, 0.024, 0.048), vec3(0.1, 0.1, 0.045), smoothstep(0.55, 1.1, hgt));
    alb *= 0.8 + 0.35 * vnoise(q * 260.0) * vnoise(q * 90.0 + 2.0);
    // a waxy bloom on the skin, and a few beads of dew
    float bloom = vnoise(q * 160.0);
    vec3 c = lightW(p, n, rd, alb, 0.9, 0.8, 0.05, 0.03 + 0.04 * bloom);
    // the dusty bloom on a fig's skin catches the light at grazing angles
    c += vec3(0.42, 0.42, 0.5) * (skyAmb() * 0.25 + sunC * 0.03 * sat(dot(n, SUN))) * pow(1.0 - sat(dot(n, -rd)), 2.0) * (0.4 + 0.6 * bloom);
    // light thrown back from the sunlit grass and leaves around it
    c += alb * vec3(0.55, 0.5, 0.3) * (0.5 + 0.5 * sat(-n.y + 0.3)) * 0.6;
    c += vec3(0.5, 0.52, 0.6) * skyAmb() * 0.04 * bloom;
    vec3 dq = q * 260.0; vec3 dc = floor(dq);
    float dew = step(0.93, hash13(dc + float(fi) * 7.0)) * smoothstep(0.3, 0.15, length(fract(dq) - 0.5)) * smoothstep(0.3, 0.7, n.y + 0.4);
    vec3 hv = normalize(SUN - rd);
    c += sunC * dew * (0.05 + 3.0 * pow(sat(dot(n, hv)), 30.0));
    // a thin rim of light round the backlit fruit
    c += sunC * vec3(1.0, 0.7, 0.4) * 0.05 * pow(1.0 - sat(dot(n, -rd)), 4.0) * pow(sat(dot(rd, SUN)), 1.5);
    return c;
  }
  vec3 alb = vec3(0.12, 0.1, 0.07) * (0.8 + 0.4 * vnoise(q * 400.0));
  return lightW(p, n, rd, alb, 0.8, 0.7, 0.0, 0.05);
}
// bees working round the figs: striped bodies, wings a blur
vec3 beesOver(vec3 c, vec3 ro, vec3 rd, inout float depth) {
  for (int i = 0; i < 3; i++) {
    float fi = float(i);
    vec3 h = hash33(vec3(fi, 9.0, 1.0));
    float w = uTime * (0.9 + 0.5 * h.x) + fi * 2.1;
    vec3 lp = figAt(i).xyz + vec3(0.06 * sin(w * 1.7) + 0.05 * (h.y - 0.5), 0.05 + 0.03 * sin(w * 2.3), 0.07 * cos(w * 1.3));
    // to world
    vec3 P = lp; P.xz = rot(uBoughYaw) * P.xz; P += uBough;
    vec3 V = normalize(vec3(cos(w * 1.7) * 1.7 * 0.06, cos(w * 2.3) * 0.07, -sin(w * 1.3) * 0.09) + 1e-4);
    V.xz = rot(uBoughYaw) * V.xz;
    // body: an ellipsoid along V
    vec3 oc = ro - P;
    vec3 ax = V, ay = normalize(cross(V, vec3(0, 1, 0))), az = cross(ax, ay);
    vec3 r3 = vec3(0.0075, 0.0045, 0.0045);
    vec3 o2 = vec3(dot(oc, ax), dot(oc, ay), dot(oc, az)) / r3;
    vec3 d2 = vec3(dot(rd, ax), dot(rd, ay), dot(rd, az)) / r3;
    float a = dot(d2, d2), b = dot(o2, d2), cc = dot(o2, o2) - 1.0;
    float disc = b * b - a * cc;
    float tb = disc > 0.0 ? (-b - sqrt(disc)) / a : -1.0;
    if (tb > 0.0 && tb < depth) {
      vec3 pl = o2 + d2 * tb;
      float stripe = step(0.0, sin(pl.x * 9.0));
      vec3 alb = mix(vec3(0.02, 0.015, 0.01), vec3(0.45, 0.28, 0.04), stripe * step(-0.6, pl.x));
      vec3 n = normalize(pl.x * ax / r3.x + pl.y * ay / r3.y + pl.z * az / r3.z);
      vec3 bc = lightW(ro + rd * tb, n, rd, alb, 0.9, 0.8, 0.2, 0.3);
      bc += sunLight() * vec3(1.0, 0.7, 0.35) * 0.05 * pow(1.0 - sat(dot(n, -rd)), 2.0);   // fuzz catching light
      c = bc; depth = tb;
    }
    // wings: a soft disc either side, beating too fast to see
    float tw = dot(P + az * 0.006 - ro, rd);
    if (tw > 0.0 && tw < depth + 0.01) {
      vec3 q = ro + rd * tw - P - az * 0.006;
      float wl = length(vec2(dot(q, ax) * 1.2, length(q - ax * dot(q, ax)))) / 0.011;
      c = mix(c, vec3(0.8, 0.8, 0.75) * (skyAmb() * 0.5 + sunLight() * 0.08), 0.25 * smoothstep(1.0, 0.5, wl));
    }
  }
  return c;
}
`;
export const MACRO_UNIFORMS = { uBough: [0, 0, 0], uBoughYaw: 0, uSplit: 0, uSway: 1 };
