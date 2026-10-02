// Fig leaves, macro (scene 20): five big fig leaves held together in cold light, overlapping, the
// front one stitched to the next with a pale green fibre. Through the shot they curl closed around
// what they cover; at the end a breeze arrives and they tremble. Behind them the cold garden is far
// out of focus. Include after SHAME_GLSL (it uses leafHit, figOutline and figVeins from it).
// Units: metres, the leaves near the origin, the camera on -z looking +z.
export const MACRO_UNIFORMS = {
  uCurl: 0.3,     // how far the leaves have curled closed
  uTremble: 0.0,  // the breeze at the end
};

export const MACRO_GLSL = /* glsl */ `
uniform float uCurl, uTremble;

// leaf i: stem base (x, y), angle in the picture plane, depth; the front leaf (0) is the biggest
vec4 mLeaf(int i) {
  if (i == 0) return vec4(0.0, -0.24, 0.1, 0.0);
  if (i == 1) return vec4(0.03, -0.25, -0.75, 0.025);
  if (i == 2) return vec4(-0.03, -0.25, 0.8, 0.03);
  if (i == 3) return vec4(0.05, -0.24, -1.45, 0.05);
  return vec4(-0.05, -0.24, 1.5, 0.055);
}
float mSize(int i) { return i == 0 ? 0.27 : i == 1 ? 0.27 : i == 2 ? 0.27 : i == 3 ? 0.24 : 0.24; }
void mFrame(int i, out vec3 c, out vec3 ax, out vec3 ay, out float s, out float curl, out float droop) {
  vec4 L = mLeaf(i);
  s = mSize(i);
  // a tremble on the stem when the breeze comes, and a slow breath always
  float tr = uTremble * (sin(uTime * 17.0 + float(i) * 2.3) * 0.03 + sin(uTime * 11.0 + float(i)) * 0.02) + sin(uTime * 0.9 + float(i)) * 0.006;
  float a = L.z + tr;
  ay = vec3(-sin(a), cos(a), 0.0);
  // lean each leaf back a little so the light runs across it
  float lean = 0.3 + 0.08 * float(i);
  ay = normalize(ay * cos(lean) + vec3(0.0, 0.0, 1.0) * sin(lean));
  ax = normalize(cross(ay, vec3(0.0, 0.0, 1.0)));
  c = vec3(L.xy, L.w);
  curl = uCurl * (0.8 + 0.15 * float(i));
  droop = 0.2 + 0.25 * uCurl;
}
// a point on leaf i's curved surface at uv
vec3 mPoint(int i, vec2 uv) {
  vec3 c, ax, ay; float s, curl, droop;
  mFrame(i, c, ax, ay, s, curl, droop);
  vec3 az = cross(ax, ay);
  float z = curl * uv.x * uv.x + droop * (uv.y - 0.3) * (uv.y - 0.3);
  return c + (ax * uv.x + ay * uv.y + az * z) * s;
}
// the running stitch: from inside the front leaf's edge out over the leaf behind it
void mStitch(int k, out vec3 a, out vec3 b, out vec3 e) {
  float y = 0.12 + float(k) * 0.075;
  // find the front leaf's edge at this height
  float xe = -0.05;
  for (int j = 0; j < 30; j++) { if (figOutline(vec2(xe, y)) < 0.0) break; xe -= 0.015; }
  a = mPoint(0, vec2(xe + 0.055 + 0.01 * sin(float(k) * 2.3), y));
  // the other end goes down onto the leaf behind (leaf 2), just past the front leaf's edge
  vec3 q = mPoint(0, vec2(xe - 0.06, y + 0.04));
  e = mPoint(0, vec2(xe + 0.004, y + 0.02)); e.z -= 0.0025;
  vec3 c, ax, ay; float s, curl, droop;
  mFrame(2, c, ax, ay, s, curl, droop);
  b = mPoint(2, vec2(dot(q - c, ax), dot(q - c, ay)) / s);
}
vec3 macroBg(vec3 rd) {
  // the cold garden far out of focus: dark foliage masses, the pale overcast between them,
  // and soft unequal discs where the sky shows through the leaves
  vec2 sp = rd.xy / rd.z;
  float m = fbm(sp * 1.6 + vec2(3.0, 1.0), 4);
  vec3 c = mix(vec3(0.03, 0.045, 0.04), vec3(0.19, 0.22, 0.26), smoothstep(0.35, 0.75, m + 0.35 * sp.y));
  float b = 0.0;
  for (int i = 0; i < 22; i++) {
    float fi = float(i);
    vec2 cc = vec2(hash11(fi * 3.1) - 0.5, hash11(fi * 7.7) - 0.35) * vec2(1.5, 1.0);
    cc += vec2(sin(uTime * 0.2 + fi), cos(uTime * 0.17 + fi * 1.3)) * 0.008 * (1.0 + 5.0 * uTremble);
    float r = 0.02 + 0.05 * hash11(fi + 1.3);
    float d = length(sp - cc);
    float disc = smoothstep(r, r * 0.8, d) * (0.9 + 0.1 * smoothstep(r * 0.5, r, d));
    b += disc * (0.25 + 0.75 * hash11(fi + 9.0)) * smoothstep(0.3, 0.6, m + 0.3);
  }
  c += vec3(0.35, 0.42, 0.5) * b * 0.22;
  return c;
}

vec3 macroScene(vec3 ro, vec3 rd) {
  shSetup();
  float best = 1e9; int bi = -1; vec2 buv; vec3 bn; vec3 bax, bay;
  for (int i = 0; i < 5; i++) {
    vec3 c, ax, ay; float s, curl, droop;
    mFrame(i, c, ax, ay, s, curl, droop);
    vec2 uv; vec3 nw;
    float t = leafHit(ro, rd, c, ax, ay, s, curl, droop, uv, nw);
    if (t > 0.0 && t < best) { best = t; bi = i; buv = uv; bn = nw; bax = ax; bay = ay; }
  }
  // the fibre over the edge
  float tf = 1e9; vec3 fa, fb;
  for (int k = 0; k < 5; k++) {
    vec3 a, b, e; mStitch(k, a, b, e);
    a.z -= 0.0012; b.z -= 0.0012;
    float t = capIntersect(ro, rd, a, e, 0.0013);
    if (t > 0.0 && t < tf) { tf = t; fa = a; fb = e; }
    t = capIntersect(ro, rd, e, b, 0.0013);
    if (t > 0.0 && t < tf) { tf = t; fa = e; fb = b; }
  }
  if (tf < best) {
    vec3 p = ro + rd * tf;
    vec3 ba = fb - fa; float h = clamp(dot(p - fa, ba) / dot(ba, ba), 0.0, 1.0);
    vec3 n = normalize(p - (fa + ba * h));
    vec3 fc = vec3(0.24, 0.3, 0.12) * (0.85 + 0.3 * vnoise(vec2(h * 80.0, 1.0)));
    float twist = 0.8 + 0.2 * sin(h * 120.0 + dot(n, vec3(3.0)));
    return fc * (AMB * (0.6 + 0.6 * n.y) + SUNC * 0.7 * max(dot(n, normalize(vec3(0.6, 0.5, -0.2))), 0.0)) * twist
         + vec3(0.4) * pow(max(dot(reflect(rd, n), normalize(vec3(0.6, 0.5, -0.2))), 0.0), 20.0) * 0.05;
  }
  if (bi < 0) return macroBg(rd);
  float vein = figVeins(buv);
  float fr = dot(bn, rd) < 0.0 ? 1.0 : -1.0;
  vec3 n = bn * fr;
  // the leaf: its colour, its fine surface, the hairs along the veins
  float g = fbm(buv * 14.0 + float(bi) * 3.0, 4);
  vec3 alb = mix(vec3(0.05, 0.085, 0.03), vec3(0.11, 0.16, 0.06), g);
  alb = mix(alb, vec3(0.1, 0.12, 0.09), uCold * 0.3);
  alb *= 1.0 + 0.5 * vein;
  // bump: veins are raised on the back, sunk on the front; a pebbled skin between them
  vec2 e = vec2(0.004, 0.0);
  float b0 = figVeins(buv) * 0.6 + fbm(buv * 40.0, 2) * 0.4;
  float bx = figVeins(buv + e.xy) * 0.6 + fbm((buv + e.xy) * 40.0, 2) * 0.4;
  float by = figVeins(buv + e.yx) * 0.6 + fbm((buv + e.yx) * 40.0, 2) * 0.4;
  n = normalize(n - (bax * (bx - b0) + bay * (by - b0)) * 3.0 * fr);
  // light: the overcast from above, a cold sun low on the left, light through the leaf from behind
  vec3 up = vec3(0.0, 1.0, 0.0);
  vec3 c = alb * AMB * (0.55 + 0.45 * dot(n, up)) * 1.4;
  vec3 L1 = normalize(vec3(0.6, 0.5, 0.2));
  c += alb * SUNC * max(dot(n, L1), 0.0) * 0.9;
  vec3 tr = vec3(0.22, 0.34, 0.1) * (1.0 - 0.55 * vein) * (0.7 + 0.5 * g);
  float thin = 1.0 - smoothstep(0.0, 0.12, figOutline(buv));
  c += tr * AMB * (0.45 + 0.9 * thin) * max(dot(-n, normalize(vec3(0.0, 0.5, 1.0))), 0.0) + tr * AMB * 0.25 * thin;
  // the waxy sheen on the upper face
  vec3 h = normalize(L1 - rd);
  c += vec3(0.6, 0.65, 0.7) * pow(max(dot(n, h), 0.0), 40.0) * 0.08 * fr;
  c += AMB * 0.1 * pow(1.0 - abs(dot(n, rd)), 4.0);
  // the overlap darkens: the leaf behind gets the shadow of the one in front (a soft occlusion)
  c *= 0.75 + 0.25 * smoothstep(0.0, 0.08, figOutline(buv));
  // where the fibre goes through, and its soft shadow on the leaves
  {
    vec3 p = ro + rd * best;
    float hole = 1.0, shd = 1.0;
    for (int k = 0; k < 5; k++) {
      vec3 a, b, e; mStitch(k, a, b, e);
      hole = min(hole, smoothstep(0.0012, 0.0026, min(length(p - a), length(p - b))));
      vec3 ba = b - a; float h = clamp(dot(p - a, ba) / dot(ba, ba), 0.0, 1.0);
      shd = min(shd, smoothstep(0.0012, 0.004, length((p - a - ba * h).xy - vec2(0.0015, 0.0015))));
    }
    c *= (0.35 + 0.65 * hole) * (0.6 + 0.4 * shd);
  }
  // depth haze toward the back leaves
  return c;
}
`;
