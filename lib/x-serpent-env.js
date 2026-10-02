// Shared surroundings for the serpent's scenes: bark, the out-of-focus garden behind a macro shot,
// dappled sun through leaves, grass blades, dry cracked earth. GLSL only; each scene picks pieces.
export const ENV_GLSL = /* glsl */ `
// ---- bark: grey-brown, fissured, with lichen; h is a small displacement in metres
float barkH(vec3 p, vec3 axis) {
  // fissures run along the branch
  vec3 a = normalize(axis);
  float along = dot(p, a);
  vec3 r = p - a * along;
  float ang = atan(r.y, length(r.xz) * sign(r.z + 1e-5) + r.x * 0.0);
  vec2 uv = vec2(along * 9.0, ang * 2.2);
  float f = fbm(uv * vec2(1.0, 3.0), 4);
  float fiss = 1.0 - smoothstep(0.0, 0.18, abs(fbm(uv * vec2(0.6, 4.5) + 3.0, 3) - 0.5));
  return 0.0022 * f - 0.0026 * fiss;
}
vec3 barkCol(vec3 p, float h) {
  float n1 = fbm(p.xz * 60.0 + p.y * 30.0, 3);
  vec3 c = mix(vec3(0.09, 0.07, 0.05), vec3(0.2, 0.17, 0.13), n1);
  // lichen and moss in patches
  float li = smoothstep(0.55, 0.7, fbm(p * 18.0, 4));
  c = mix(c, vec3(0.32, 0.36, 0.22), li * 0.6);
  float mo = smoothstep(0.6, 0.75, fbm(p * 9.0 + 7.0, 3));
  c = mix(c, vec3(0.06, 0.11, 0.03), mo * 0.7);
  c *= 0.55 + 0.45 * smoothstep(-0.0026, 0.0015, h);
  return c;
}

// ---- smooth grey fig bark in surface coordinates (metres along the limb, metres around it):
// mottled grey and beige, soft green algae, faint ring wrinkles, a few lenticels, a little moss.
// barkD is the cheap SDF displacement.
float barkD(vec2 uv) { return 0.0008 * (vnoise(uv * vec2(30.0, 60.0)) - 0.5); }
float barkH2(vec2 uv) {
  float wr = vnoise(vec2(uv.x * 220.0 + 8.0 * vnoise(uv * 30.0), uv.y * 14.0));
  float f = fbm(uv * vec2(120.0, 140.0), 4);
  float li = smoothstep(0.56, 0.6, fbm(uv * vec2(50.0, 60.0) + 9.0, 4) + 0.12 * fbm(uv * 300.0, 3));
  return 0.0002 * wr + 0.0005 * f + 0.0003 * li * fbm(uv * 400.0, 2);
}
vec3 barkCol2(vec2 uv, float h) {
  float n1 = fbm(uv * vec2(8.0, 11.0), 5);
  float n2 = fbm(uv * vec2(55.0, 70.0) + 5.0, 4);
  float n3 = fbm(uv * vec2(260.0, 260.0), 3);
  vec3 c = mix(vec3(0.2, 0.19, 0.17), vec3(0.36, 0.34, 0.3), smoothstep(0.3, 0.7, n1));
  c *= 0.8 + 0.3 * n2 + 0.2 * n3;
  // ring lines and lenticels: short dark dashes across the limb
  float rl = smoothstep(0.72, 0.8, vnoise(vec2(uv.x * 140.0, uv.y * 9.0)));
  c *= 1.0 - 0.3 * rl;
  float al = smoothstep(0.45, 0.75, fbm(uv * vec2(9.0, 12.0) + 3.0, 5));
  c = mix(c, vec3(0.16, 0.19, 0.1) * (0.8 + 0.4 * n2), al * 0.5);
  float li = smoothstep(0.56, 0.6, fbm(uv * vec2(50.0, 60.0) + 9.0, 4) + 0.12 * fbm(uv * 300.0, 3));
  c = mix(c, vec3(0.44, 0.46, 0.38) * (0.75 + 0.5 * n3), li * 0.45);
  float li2 = smoothstep(0.64, 0.67, fbm(uv * vec2(90.0, 100.0) + 2.0, 4) + 0.1 * fbm(uv * 500.0, 2));
  c = mix(c, vec3(0.5, 0.44, 0.26) * (0.8 + 0.4 * n3), li2 * 0.35);
  float mo = smoothstep(0.58, 0.72, fbm(uv * vec2(9.0, 12.0) + 11.0, 4) + 0.12 * n3);
  c = mix(c, vec3(0.05, 0.1, 0.02) * (0.6 + 0.8 * n3), mo * 0.8);
  return c;
}

// ---- the garden far out of focus: soft greens and gold, the sun behind leaves, round bokeh
// sunD: sun direction; warm: 0 cold .. 1 golden; dens: bokeh density
vec3 gardenBokeh(vec3 rd, vec3 sunD, float warm, float t) {
  float y = rd.y;
  vec3 Zf = normalize(vec3(sunD.x, 0.0, sunD.z)), Xf = vec3(Zf.z, 0.0, -Zf.x);
  float sd = max(dot(rd, sunD), 0.0);
  vec3 lo = mix(vec3(0.015, 0.025, 0.025), vec3(0.012, 0.03, 0.008), warm);
  vec3 mid = mix(vec3(0.04, 0.06, 0.07), vec3(0.04, 0.09, 0.02), warm);
  vec3 hi = mix(vec3(0.15, 0.18, 0.22), vec3(0.3, 0.3, 0.1), warm);
  vec3 c = mix(lo, mid, smoothstep(-0.4, 0.15, y));
  c = mix(c, hi, smoothstep(0.1, 0.7, y) * 0.35);
  // big soft masses of foliage, lit or shaded
  float az = atan(dot(rd, Xf), dot(rd, Zf));
  vec2 q = vec2(az * 1.6, y * 2.0);
  float m = fbm(q * 1.4 + vec2(t * 0.01, 0.0), 4);
  c *= 0.55 + 0.9 * smoothstep(0.3, 0.75, m);
  // the sun glowing through the leaves
  c += mix(vec3(0.5, 0.6, 0.7), vec3(1.6, 1.05, 0.45), warm) * (pow(sd, 10.0) * 0.45 + pow(sd, 60.0) * 1.6) * (0.6 + 0.4 * m);
  // round bokeh from sunlight on leaves and water
  for (int l = 0; l < 2; l++) {
    float sc = l == 0 ? 7.0 : 12.0;
    vec2 g = q * sc + float(l) * 13.1;
    vec2 id = floor(g), f = fract(g);
    for (int j = -1; j <= 1; j++) for (int i = -1; i <= 1; i++) {
      vec2 cid = id + vec2(i, j);
      vec2 h = hash22(cid + float(l) * 7.0);
      if (h.x > (l == 0 ? 0.3 : 0.4)) continue;
      vec2 o = vec2(i, j) + 0.2 + 0.6 * hash22(cid * 1.7 + 3.0) + 0.05 * vec2(sin(t * 0.6 + h.y * 30.0), cos(t * 0.5 + h.x * 20.0)) - f;
      float r = 0.18 + 0.3 * h.y * h.y;
      float d = length(o);
      float disc = smoothstep(r, r - 0.04, d) * (0.75 + 0.25 * smoothstep(r * 0.6, r, d));
      float bright = smoothstep(0.4, 0.8, m + 0.35 * h.y) * (0.3 + 0.7 * pow(sd, 1.5)) * (0.75 + 0.25 * sin(t * 1.3 + h.x * 40.0)) * (0.3 + 1.4 * hash11(h.y * 91.0));
      vec3 bc = mix(vec3(0.45, 0.6, 0.7), mix(vec3(0.9, 0.75, 0.3), vec3(0.5, 0.75, 0.25), h.x * 1.8), warm);
      c += bc * disc * bright * (l == 0 ? 0.32 : 0.2);
    }
  }
  return c;
}

// ---- leaves overhead casting moving shadow: 1 in sun, ~0.2 in leaf shadow
float dapple(vec3 p, vec3 sunD, float scale, float t) {
  vec3 a = normalize(cross(sunD, vec3(0.0, 0.0, 1.0)));
  vec3 b = cross(sunD, a);
  vec2 q = vec2(dot(p, a), dot(p, b)) * scale;
  q += vec2(sin(t * 0.7) * 0.15 + sin(t * 1.9) * 0.05, cos(t * 0.6) * 0.1);
  float f = fbm(q, 4);
  return mix(0.45, 1.0, smoothstep(0.36, 0.5, f));
}

// ---- the meadow at golden hour, seen from a branch, with everything beyond a few metres drawn as
// layers blurred analytically by the lens (so a far figure goes soft or sharp without noise).
// cocA: angular blur radius of the lens at distance z (radians), from the scene's focus/aperture.
float cocA(float z) { return uAper * abs(1.0 / max(z, 0.01) - 1.0 / uFocus) + 0.0004; }

// the woman: a backlit silhouette in 2D (metres, feet at 0), standing in the grass. Never a face:
// at this distance and against the sun she is a shape of light and shadow.
float womanSD(vec2 p, float t) {
  float sway = 0.012 * sin(t * 0.9);
  p.x -= sway * p.y;
  float d = sdEllipsoid(vec3(p - vec2(0.0, 1.53), 0.0), vec3(0.092, 0.115, 1.0));
  // hair: long, lifted a little by the wind
  vec2 hp = p - vec2(0.03 + 0.02 * sin(t * 1.3 + p.y * 3.0) * (1.55 - p.y), 0.0);
  d = min(d, sdCapsule(vec3(hp, 0.0), vec3(0.025, 1.55, 0.0), vec3(0.07, 1.12, 0.0), 0.085));
  d = smin(d, sdCapsule(vec3(p, 0.0), vec3(0.0, 1.38, 0.0), vec3(0.0, 1.48, 0.0), 0.045), 0.03);
  d = smin(d, sdEllipsoid(vec3(p - vec2(0.0, 1.22), 0.0), vec3(0.17, 0.155, 1.0)), 0.05);
  d = smin(d, sdEllipsoid(vec3(p - vec2(0.0, 1.0), 0.0), vec3(0.125, 0.13, 1.0)), 0.06);
  d = smin(d, sdEllipsoid(vec3(p - vec2(0.0, 0.83), 0.0), vec3(0.18, 0.14, 1.0)), 0.06);
  d = min(d, sdCapsule(vec3(p, 0.0), vec3(-0.15, 1.31, 0.0), vec3(-0.2, 1.05, 0.0), 0.04));
  d = min(d, sdCapsule(vec3(p, 0.0), vec3(-0.2, 1.05, 0.0), vec3(-0.16, 0.84, 0.0), 0.035));
  d = min(d, sdCapsule(vec3(p, 0.0), vec3(0.15, 1.31, 0.0), vec3(0.21, 1.06, 0.0), 0.04));
  d = min(d, sdCapsule(vec3(p, 0.0), vec3(0.21, 1.06, 0.0), vec3(0.2, 0.85, 0.0), 0.035));
  d = min(d, sdCapsule(vec3(p, 0.0), vec3(-0.08, 0.8, 0.0), vec3(-0.08, 0.0, 0.0), 0.065));
  d = min(d, sdCapsule(vec3(p, 0.0), vec3(0.08, 0.8, 0.0), vec3(0.08, 0.0, 0.0), 0.065));
  return d;
}

vec3 meadowSky(vec3 rd, vec3 sunD) {
  float y = rd.y;
  float sd = max(dot(rd, sunD), 0.0);
  vec3 c = mix(vec3(0.62, 0.4, 0.2), vec3(0.22, 0.27, 0.36), smoothstep(0.0, 0.3, y));
  c = mix(c, vec3(0.08, 0.13, 0.24), smoothstep(0.25, 0.8, y));
  c += vec3(0.5, 0.3, 0.12) * pow(sd, 30.0) * 0.5 + vec3(1.0, 0.65, 0.3) * pow(sd, 600.0) * 0.8;
  c += vec3(6.0, 4.4, 2.4) * smoothstep(0.99985, 0.99993, sd);   // the sun's disc
  return c;
}

// far trees: a band of orchard and forest beyond the meadow, round crowns with gold rims; a = coverage
vec4 farTrees(vec3 ro, vec3 rd, vec3 sunD, float zt, float t) {
  if (rd.z <= 0.01) return vec4(0.0);
  float s = (zt - ro.z) / rd.z;
  vec3 p = ro + rd * s;
  float top = 3.4 + 3.2 * fbm(vec2(p.x * 0.11, 1.3), 5) + 0.8 * fbm(vec2(p.x * 0.6, 4.0), 3);
  float blurW = cocA(s) * s + 0.05;
  float a = smoothstep(blurW, -blurW, p.y - top) * step(-0.5, p.y);
  float inner = smoothstep(0.0, 1.8, top - p.y);
  float leaf = fbm(vec2(p.x, p.y) * 0.9, 4);
  vec3 c = mix(vec3(0.04, 0.06, 0.02), vec3(0.012, 0.026, 0.01), inner) * (0.7 + 0.6 * leaf);
  float sd = pow(max(dot(rd, sunD), 0.0), 8.0);
  c += vec3(0.75, 0.45, 0.16) * (1.0 - inner) * (0.25 + 1.5 * sd);
  // haze at the trees' feet
  c = mix(c, vec3(0.42, 0.28, 0.13) * (0.6 + sd), smoothstep(3.0, 0.0, p.y) * 0.7);
  return vec4(c, a);
}

// the meadow as layers of tall grass across the view, front to back (planes of constant z), each
// a dark mass with backlit gold tips and loose stalks with seed heads above it. Returns colour and
// writes the distance to the first opaque layer. A figure at zw is drawn between the layers.
vec3 grassLayer(vec3 p, float bw, vec3 sunD, float sd, float t, float L, out float a) {
  float sway = 0.03 * sin(t * 1.7 + p.x * 0.8 + L);
  float top = 0.5 + 0.22 * fbm(vec2(p.x * 0.9, L * 3.1), 3) + 0.12 * pow(vnoise(vec2((p.x + sway) * 38.0, L)), 3.0) + 0.06 * vnoise(vec2((p.x + sway) * 90.0, L + 4.0));
  float body = smoothstep(bw + 0.006, -bw, p.y - top);
  // loose stalks and seed heads rising above the mass
  float cx = p.x / 0.06; float cid = floor(cx);
  float fx = (fract(cx) - 0.5 - 0.6 * (hash11(cid * 5.1 + L) - 0.5)) * 0.06;
  float hh = top + 0.1 + 0.35 * hash11(cid * 1.7 + L * 9.0);
  float lean = 0.06 * sin(t * 1.5 + cid * 0.7 + L) * sat((p.y - top) / (hh - top));
  float stalk = smoothstep(0.0012 + bw, -bw, abs(fx - lean) - 0.0012) * step(p.y, hh) * step(top - 0.05, p.y);
  float head = smoothstep(bw + 0.004, -bw, length(vec2((fx - lean) * 2.6, p.y - hh)) - 0.028);
  float m = max(stalk, head * 0.9) * step(0.6, hash11(cid * 3.3 + L));
  a = max(body, m);
  float tip = exp(-max(top - p.y, 0.0) / 0.04);
  float blades = fbm(vec2((p.x + sway) * 70.0, p.y * 3.0 + L), 3);
  vec3 dark = vec3(0.022, 0.04, 0.012) * (0.5 + 1.0 * blades);
  vec3 glow = vec3(0.85, 0.55, 0.2) * (0.25 + 1.5 * sd);
  vec3 c = mix(dark, glow * 0.35 * (0.6 + 0.8 * blades), tip * body);
  c = mix(c, glow * 0.55, m * (1.0 - body));
  return c;
}

// the meadow ground: tall grass backlit gold; a = 1 where the ray meets it
vec4 meadowGround(vec3 ro, vec3 rd, vec3 sunD, float t, out float dist) {
  dist = 1e5;
  if (rd.y >= -0.0005) return vec4(0.0);
  float s = -(ro.y - 0.7) / rd.y;          // the grass tops
  vec3 p = ro + rd * s;
  dist = s;
  float blurW = cocA(s) * s;
  float k = exp(-blurW * 6.0);
  vec2 w = vec2(t * 0.6, 0.0);
  float g1 = fbm(vec2(p.x * 0.9, p.z * 0.25) + w * 0.3, 5);
  float g2 = fbm(vec2(p.x * 3.0 + 1.5 * sin(t * 1.4 + p.z * 0.2), p.z * 0.6), 4);
  float sd = pow(max(dot(normalize(vec3(rd.x, 0.0, rd.z)), normalize(vec3(sunD.x, 0.0, sunD.z))), 0.0), 3.0);
  vec3 c = mix(vec3(0.03, 0.04, 0.012), vec3(0.2, 0.17, 0.06), smoothstep(0.2, 0.8, g1));
  c += vec3(0.25, 0.17, 0.07) * smoothstep(0.35, 0.8, g2) * (0.3 + sd);
  c *= 0.55 + 0.8 * sd;
  return vec4(c, 1.0);
}

// ---- the old trunk of the tree at the centre: deep vertical furrows, ridges, moss in the cracks.
// Coordinates: angle round the trunk times radius (metres) and height (metres).
float trunkRidges(vec2 uv) {
  // soft vertical fissures in old grey bark
  float w = fbm(uv * vec2(2.0, 0.7), 3);
  float f = abs(fbm(vec2(uv.x * 7.0 + 1.5 * w, uv.y * 0.9), 4) - 0.5) * 2.0;
  return smoothstep(0.0, 0.25, f);
}
float trunkH(vec2 uv) {
  return 0.006 * trunkRidges(uv) + 0.0015 * fbm(uv * vec2(50.0, 30.0), 3);
}
vec3 trunkCol(vec2 uv, float h) {
  vec3 c = barkCol2(uv * 0.5, h) * 0.85;
  c *= mix(0.4, 1.0, trunkRidges(uv));
  return c;
}

// ---- under the canopy looking up: dark leaves against gold light, a few red fruit glowing
vec3 canopyBokeh(vec3 rd, vec3 sunD, float t, float red) {
  float y = rd.y;
  vec3 Zf = normalize(vec3(sunD.x, 0.0, sunD.z)), Xf = vec3(Zf.z, 0.0, -Zf.x);
  float az = atan(dot(rd, Xf), dot(rd, Zf));
  vec2 q = vec2(az * 1.8, y * 2.4);
  float m = fbm(q * 1.6 + vec2(t * 0.012, 0.0), 5);
  // horizon: gold haze of the garden; overhead: leaves with light between
  vec3 hz = vec3(0.55, 0.38, 0.16);
  vec3 leaf = vec3(0.02, 0.035, 0.012);
  float gaps = smoothstep(0.52, 0.72, m);
  vec3 over = mix(leaf, vec3(1.3, 0.9, 0.42), gaps * 0.8);
  vec3 c = mix(hz * (0.7 + 0.6 * m), over, smoothstep(0.05, 0.35, y));
  float sd = max(dot(rd, sunD), 0.0);
  c += vec3(1.0, 0.65, 0.3) * pow(sd, 12.0) * 0.8;
  // round bokeh of light, and a few of red fruit
  for (int l = 0; l < 2; l++) {
    float sc = l == 0 ? 6.0 : 10.0;
    vec2 g = q * sc + float(l) * 17.3;
    vec2 id = floor(g), f = fract(g);
    for (int j = -1; j <= 1; j++) for (int i = -1; i <= 1; i++) {
      vec2 cid = id + vec2(i, j);
      vec2 h = hash22(cid + float(l) * 5.0);
      if (h.x > 0.4) continue;
      vec2 o = vec2(i, j) + 0.2 + 0.6 * hash22(cid * 1.3 + 2.0) - f;
      float r = 0.2 + 0.25 * h.y;
      float disc = smoothstep(r, r - 0.05, length(o));
      bool isRed = hash12(cid * 2.7 + float(l)) < 0.18 * red && y > 0.15;
      vec3 bc = isRed ? vec3(1.1, 0.08, 0.04) : vec3(1.2, 0.85, 0.4);
      float b = isRed ? 0.9 : smoothstep(0.45, 0.75, m + 0.3 * h.y) * 0.5;
      c += bc * disc * b * smoothstep(-0.1, 0.2, y) * (l == 0 ? 0.5 : 0.3);
    }
  }
  return c;
}

// ---- the cursed ground: dry cracked earth under hard white heat (s35, s36)
// cheap cellular noise: x = F2 - F1 (distance to a crack), y = cell id
vec2 cells(vec2 p) {
  vec2 n = floor(p), f = fract(p);
  float d1 = 8.0, d2 = 8.0; float id = 0.0;
  for (int j = -1; j <= 1; j++) for (int i = -1; i <= 1; i++) {
    vec2 g = vec2(i, j), o = hash22(n + g) * 0.85 + 0.075;
    vec2 r = g + o - f; float d = dot(r, r);
    if (d < d1) { d2 = d1; d1 = d; id = hash12(n + g); } else if (d < d2) d2 = d;
  }
  return vec2(sqrt(d2) - sqrt(d1), id);
}
// height of the cracked crust (metres): plates 8-20 cm across, cracks ~1 cm deep, edges curling up,
// each plate tilted a little; in places windblown dust has half-filled the cracks
float crackDetail(vec2 xz) {
  float h = 0.0018 * (fbm(xz * 60.0, 3) - 0.5) + 0.0007 * (vnoise(xz * 300.0) - 0.5);
  vec2 g = xz * 160.0; vec2 gi = floor(g); vec2 gf = fract(g) - 0.5 - 0.6 * (hash22(gi + 3.0) - 0.5);
  return h + 0.0008 * step(0.93, hash12(gi)) * smoothstep(0.3, 0.05, length(gf));
}
vec3 crackBump(vec2 xz, vec3 n) {
  float e = 0.0004;
  float h0 = crackDetail(xz), hx = crackDetail(xz + vec2(e, 0.0)), hz = crackDetail(xz + vec2(0.0, e));
  return normalize(n - vec3((hx - h0) / e, 0.0, (hz - h0) / e) * 0.8);
}
vec2 crackQ(vec2 xz) { return xz * (6.0 + 4.0 * vnoise(xz * 0.35)) + 0.3 * vec2(vnoise(xz * 3.0), vnoise(xz * 3.0 + 5.0)); }
float sandK(vec2 xz) { return smoothstep(0.5, 0.75, fbm(xz * 0.5 + 3.0, 3)); }
float crackH(vec2 xz, float detail) {
  vec2 c = cells(crackQ(xz));
  float cw = (0.035 + 0.05 * vnoise(xz * 9.0)) * (1.0 - 0.6 * sandK(xz));
  float crack = 1.0 - smoothstep(0.0, cw, c.x);
  float curl = 0.0015 * (1.0 - smoothstep(0.0, 0.35, c.x));
  float h = (-0.012 * crack) * (1.0 - 0.7 * sandK(xz)) + curl * (1.0 - crack) + 0.002 * c.y;
  if (detail > 0.5) h += crackDetail(xz) * (1.0 - crack);
  return h;
}
// the crust's fine relief (used as a bump, not in the distance field)
vec3 crackCol(vec2 xz, float h) {
  vec2 c = cells(crackQ(xz));
  vec3 col = mix(vec3(0.4, 0.32, 0.23), vec3(0.56, 0.47, 0.37), c.y);
  col *= 0.75 + 0.45 * fbm(xz * 40.0, 3);
  col *= 0.85 + 0.25 * vnoise(xz * 250.0);
  col = mix(col, vec3(0.3, 0.24, 0.18), smoothstep(0.6, 0.8, fbm(xz * 15.0 + 7.0, 3)) * 0.4);   // darker stains
  col = mix(col, vec3(0.64, 0.57, 0.47), sandK(xz) * 0.6);                                     // drifted dust
  col = mix(col, col * vec3(0.85, 0.82, 0.8), smoothstep(0.4, 0.7, fbm(xz * 1.2, 4)));          // large-scale patches
  col *= mix(0.3, 1.0, smoothstep(-0.009, -0.002, h));                                         // the cracks
  return col;
}
vec3 heatSky(vec3 rd, vec3 sunD) {
  float y = rd.y;
  float sd = max(dot(rd, sunD), 0.0);
  vec3 c = mix(vec3(0.95, 0.9, 0.82), vec3(0.62, 0.66, 0.7), smoothstep(0.0, 0.6, y));
  c = mix(vec3(0.85, 0.78, 0.66), c, smoothstep(-0.02, 0.06, y));
  c += vec3(1.6, 1.5, 1.3) * pow(sd, 12.0) + vec3(6.0, 5.6, 5.0) * pow(sd, 400.0);
  return c;
}
// far dust devils: twisting columns of dust standing on the horizon
vec4 dustDevils(vec3 rd, float t) {
  float az = atan(rd.x, rd.z), el = rd.y;
  vec4 acc = vec4(0.0);
  for (int i = 0; i < 3; i++) {
    float fi = float(i);
    float x0 = (hash11(fi * 3.7) - 0.5) * 0.9 + 0.03 * sin(t * 0.3 + fi);
    float hgt = 0.05 + 0.05 * hash11(fi * 1.3);
    float y = (el + 0.004) / hgt;
    if (y < -0.05 || y > 1.0) continue;
    float w = (0.01 + 0.045 * y * y) * (0.7 + 0.6 * hash11(fi));
    float xc = x0 + 0.01 * sin(y * 6.0 + t * 2.0 + fi);
    float dx = (az - xc) / w;
    float body = exp(-dx * dx) * smoothstep(1.0, 0.6, y) * smoothstep(-0.05, 0.05, y);
    float swirl = fbm(vec2(dx * 0.8 + t * 3.0 + y * 5.0, y * 6.0 - t * 1.5), 3);
    float a = body * (0.35 + 0.65 * swirl) * 0.6 * smoothstep(1.0, 0.3, y);
    acc.rgb += (1.0 - acc.a) * a * mix(vec3(0.52, 0.42, 0.3), vec3(0.75, 0.65, 0.5), y);
    acc.a += (1.0 - acc.a) * a;
  }
  return acc;
}
`;
