// s47's world: a hillside meadow at first light. The camera lies low in wet grass looking up the
// slope toward the crest, where the sun rises. Before it clears the crest everything is in blue
// shadow and dew; as it rises the light runs down the hill from the top (each point is lit once the
// sun stands above its own horizon), and the flowers open after it in time-lapse: white anemones with
// gold hearts, lit through from behind, dew glinting gold on petals and blades. Near the lens grass
// blades and flowers are modelled (out to NEAR metres); beyond that the hill is a shaded heightfield
// whose flowers are small white specks that open with the light. Mist lies in the hollows.
// Units metres; the camera looks along +z; the hill rises to a crest about 45 m away.
export const DAWN_UNIFORMS = { uSunEl: 0.06, uOpenK: 1.0, uDay: 0.0, uHeroClear: 0.0, uHero: new Array(12).fill(0), uHeroT: [1e4, 1e4, 1e4, 1e4] };

export const DAWN_GLSL = /* glsl */ `
uniform float uSunEl;    // the sun's elevation (radians)
uniform float uOpenK;    // how long after the light a flower takes to open (s)
uniform float uDay;      // 0 before sunrise .. 1 full first light (sky and fill)
uniform float uHeroClear; // no lattice flowers nearer than this z (the heroes stand there)
#define NEAR 1.9
vec3 sunDir() { return normalize(vec3(sin(-0.25) * cos(uSunEl), sin(uSunEl), cos(-0.25) * cos(uSunEl))); }

// the hill
// a long slope rising ~17 degrees to a crest about 30 m away, the crest rolling along x
float crestZ(float x) { return 30.0 + 4.0 * sin(x * 0.05 + 1.0) + 2.0 * sin(x * 0.13); }
float hillLo(vec2 xz) {
  float z = xz.y, zc = crestZ(xz.x);
  float h = 0.3 * z;
  // round over the crest and fall away beyond it
  float k = smoothstep(zc - 8.0, zc + 6.0, z);
  h = mix(h, 0.3 * zc + 0.3 * 3.0 - 0.15 * (z - zc), k * k * (3.0 - 2.0 * k) * 0.0 + k);
  h += 0.04 * (vnoise(xz * 0.8) - 0.5) + 0.25 * sin(xz.x * 0.3) * smoothstep(0.0, 6.0, z);
  return h;
}
float hillH(vec2 xz) {
  float h = hillLo(xz);
  float k = smoothstep(2.0, 12.0, xz.y);
  if (k > 0.0) h += 0.9 * (fbm(xz * 0.06, 3) - 0.5) * k;
  return h;
}
// first light: is the sun above this point's horizon (soft)? 1 lit, 0 in shadow
float lightTime(vec3 p);
float sunVis(vec3 p) { return smoothstep(0.0, 0.6, uTime - lightTime(p)); }
// when a place on the hill first saw the sun: estimated from the elevation it needs (song time)
uniform float uSunT0, uSunRate;   // first light on the crest (song time), and how fast it runs down (m/s)
float lightTime(vec3 p) {
  // first light touches the crest at uSunT0 and runs down the slope toward us at uSunRate m/s
  return uSunT0 + max(crestZ(p.x) - p.z, 0.0) / uSunRate + 0.4 * (vnoise(p.xz * 0.4) - 0.5);
}
float openAt(float tl, float seed) {
  float x = (uTime - tl - 0.25 - 0.6 * seed) / uOpenK;
  return smoothstep(0.0, 1.0, x);
}

vec3 dawnSky(vec3 rd) {
  vec3 L = sunDir();
  float y = rd.y;
  float s = max(dot(rd, L), 0.0);
  vec3 zen = mix(vec3(0.07, 0.1, 0.26), vec3(0.2, 0.3, 0.58), uDay);
  vec3 hor = mix(vec3(0.55, 0.36, 0.3), vec3(1.0, 0.72, 0.45), uDay);
  vec3 c = mix(hor, zen, pow(sat(y * 2.2 + 0.02), 0.5));
  // the glow round the rising sun
  vec3 sc = vec3(1.0, 0.62, 0.3);
  c += sc * (pow(s, 4.0) * (0.1 + 0.15 * uDay) + pow(s, 30.0) * (0.2 + 0.35 * uDay) + pow(s, 400.0) * (0.5 + 1.0 * uDay));
  c += vec3(5.0, 3.6, 2.2) * smoothstep(0.99962, 0.99975, s);
  // high thin cloud catching the light
  vec2 uv = rd.xz / (rd.y + 0.12);
  float cl = smoothstep(0.5, 0.85, fbm(uv * 0.6 + vec2(3.0, uTime * 0.02), 5)) * smoothstep(0.02, 0.2, rd.y);
  c = mix(c, mix(vec3(0.6, 0.38, 0.4), vec3(1.6, 1.0, 0.7), uDay) * (0.6 + 0.8 * pow(s, 3.0)), cl * 0.5);
  return c;
}
vec3 sunCol() { return mix(vec3(6.0, 3.2, 1.4), vec3(8.0, 5.6, 3.2), uDay); }
vec3 skyFill() { return mix(vec3(0.3, 0.34, 0.6), vec3(0.4, 0.42, 0.55), uDay); }

// ---- near: grass blades and flowers, modelled ----
// one flower head: two rings of broad petals in polar repetition round the head's axis (7 + 7,
// offset), raised by the opening angle, round a gold heart of stamens. sc scales it.
// Returns the distance; id 3 petal, 4 heart; pv = (along, across) on the petal for its veins.
vec2 gPV;
float flowerHead(vec3 p, vec3 head, vec3 ax, float sc, float op, float seed, out int id) {
  vec3 q = (p - head) / sc;
  vec3 ux = normalize(cross(ax, vec3(0.0, 0.0, 1.0))), uz = cross(ux, ax);
  vec3 l = vec3(dot(q, ux), dot(q, ax), dot(q, uz));
  float heart = length(l - vec3(0.0, 0.002, 0.0)) - 0.0042;
  float ring = length(vec2(length(l.xz) - 0.0032, l.y - 0.0055 - 0.001 * vnoise(vec2(atan(l.z, l.x) * 12.0, 0.0)))) - 0.0014;
  heart = min(heart, ring);
  float r = length(l.xz);
  float best = 1e3; vec2 bpv = vec2(0.0);
  for (int ringI = 0; ringI < 2; ringI++) {
    float off = float(ringI) * 0.5;
    float a = atan(l.z, l.x) + seed * 6.0;
    float sec = 6.2831853 / 7.0;
    float k = floor(a / sec + 0.5 - off) + off;
    float aa = a - k * sec;
    vec2 rp = vec2(cos(aa), sin(aa)) * r;
    float ang = mix(1.5, 0.42 + 0.2 * float(ringI), op) + 0.16 * (hash11(k * 3.1 + seed * 31.0) - 0.5) - 0.06 * float(ringI);
    vec2 xy = vec2(rp.x - 0.0035, l.y - 0.0015 * float(ringI));
    vec2 pr = vec2(cos(ang) * xy.x + sin(ang) * xy.y, -sin(ang) * xy.x + cos(ang) * xy.y);
    float len = mix(0.016, 0.023, op) * (0.92 + 0.16 * hash11(k * 7.3 + seed));
    float wid = 0.0115 * mix(0.7, 1.0, op);
    // cupped across and curled a little at the tip
    pr.y -= 0.005 * (rp.y / wid) * (rp.y / wid) - 0.002 * smoothstep(0.6, 1.0, pr.x / (2.0 * len));
    float d = sdEllipsoid(vec3(pr.x - len, pr.y, rp.y), vec3(len, 0.0009, wid));
    if (d < best) { best = d; bpv = vec2(pr.x / (2.0 * len), rp.y / wid); }
  }
  gPV = bpv;
  id = heart < best ? 4 : 3;
  return min(heart, best) * sc;
}
// a flower cell: centre in xz, head height, seed; present when .w >= 0
vec4 flowerCell(vec2 c) {
  float h = hash12(c * 1.37 + 3.1);
  if (h > 0.45) return vec4(0.0, 0.0, 0.0, -1.0);
  vec2 o = (hash22(c + 7.7) - 0.5) * 0.12;
  return vec4((c + 0.5) * 0.3 + o * 1.4, 0.12 + 0.16 * hash12(c + 2.2), hash12(c + 9.9));
}
// the three flowers nearest the lens (set by the scene): xyz head offset from the ground, w scale
uniform vec4 uHero[3];
uniform float uHeroT[4];       // when each opens (song time)
float heroSD(vec3 p, out int id, out float seedOut, out float openOut) {
  float best = 1e3; id = 0; seedOut = 0.0; openOut = 0.0;
  for (int i = 0; i < 3; i++) {
    vec3 hp = uHero[i].xyz;
    float g = 0.3 * hp.z - 0.03;
    float seed = 0.17 + 0.31 * float(i);
    float op = smoothstep(0.0, 1.0, (uTime - uHeroT[i]) / uOpenK);
    vec3 base = vec3(hp.x, g, hp.z);
    vec3 head = base + vec3(0.006 * sin(uTime * 1.2 + seed * 20.0), hp.y, 0.012 * (1.0 - op) + 0.004 * sin(uTime * 0.9 + seed * 9.0));
    // stem with a gentle curve
    vec3 mid = mix(base, head, 0.55) + vec3(0.008 * (seed - 0.5), 0.0, -0.006);
    float stem = min(sdCapsule(p, base, mid, 0.0019), sdCapsule(p, mid, head - vec3(0.0, 0.004, 0.0), 0.0017));
    float d = stem; int hid = 5;
    float hb = length(p - head) - 0.034 * uHero[i].w;
    if (hb < 0.01) {
      vec3 ax = normalize(vec3(0.12 * (seed - 0.5), 1.0, 0.15 + 0.45 * op));
      int fid; float fd = flowerHead(p, head, ax, uHero[i].w, op, seed, fid);
      if (fd < d) { d = fd; hid = fid; }
    } else d = min(d, hb);
    if (d < best) { best = d; id = hid; seedOut = seed; openOut = op; }
  }
  return best;
}
float flowerSD(vec3 p, out int id, out float seedOut, out float openOut) {
  vec2 c = floor(p.xz / 0.3);
  vec4 f = flowerCell(c);
  id = 0; seedOut = 0.0; openOut = 0.0;
  if (f.w < 0.0 || f.y < uHeroClear) return 0.12;
  float g = hillLo(f.xy);
  float seed = f.w;
  vec3 base = vec3(f.x, g, f.y);
  float hb0 = length(p - (base + vec3(0.0, f.z, 0.0))) - 0.07;
  if (hb0 > 0.01) { float st0 = sdCapsule(p, base, base + vec3(0.0, f.z, 0.0), 0.03); id = 5; return max(min(st0, hb0), 0.01); }
  float tl = lightTime(base + vec3(0.0, 0.2, 0.0));
  float op = openAt(tl, seed);
  seedOut = seed; openOut = op;
  vec3 head = base + vec3(0.02 * sin(uTime * 1.3 + seed * 20.0) + 0.03 * (seed - 0.5), f.z, 0.03 * (1.0 - op) - 0.015 + 0.01 * sin(uTime * 1.1 + seed * 9.0));
  float stem = sdCapsule(p, base, head - vec3(0.0, 0.004, 0.0), 0.0016);
  float hb = length(p - head) - 0.036;
  if (hb > 0.01) { id = 5; return min(stem, hb); }
  vec3 ax = normalize(vec3(0.15 * (seed - 0.5), 1.0, 0.25 + 0.35 * op));
  int fid; float fd = flowerHead(p, head, ax, 0.85 + 0.3 * seed, op, seed, fid);
  id = fd < stem ? fid : 5;
  return min(fd, stem);
}
// grass blades: one per 4 cm cell, two layers offset
float bladeSD(vec3 p, float off, out float hgt) {
  vec2 c = floor(p.xz / 0.035 + off);
  vec2 r = hash22(c + off * 13.0);
  vec2 b = (c + 0.2 + 0.6 * r - off) * 0.035;
  float hr = hash12(c * 1.9 + off);
  float h = 0.08 + 0.26 * hr * hr;
  float g = hillLo(b);
  float az = 6.2831853 * hash12(c + 4.4);
  vec2 dir = vec2(cos(az), sin(az));
  float bend = 0.15 + 0.55 * hash12(c + 8.1);
  float sway = 0.03 * sin(uTime * 1.4 + b.x * 5.0 + b.y * 3.0) + 0.015 * sin(uTime * 3.1 + hr * 20.0);
  vec3 a = vec3(b.x, g - 0.01, b.y);
  vec3 m = a + vec3(dir.x * h * bend * 0.25 + sway * 0.4, h * 0.55, dir.y * h * bend * 0.25);
  vec3 tip = a + vec3(dir.x * h * bend + sway, h * (1.0 - 0.45 * bend * bend), dir.y * h * bend);
  hgt = sat((p.y - g) / h);
  float d1 = sdRoundCone(p, a, m, 0.0015, 0.0011);
  float d2 = sdRoundCone(p, m, tip, 0.0011, 0.0002);
  return min(d1, d2);
}
float nearSD(vec3 p, out int id, out float aux, out float op) {
  float g = hillLo(p.xz);
  float dg = p.y - g;
  id = 1; aux = 0.0; op = 0.0;
  float d = dg;
  float h1, h2;
  float b1 = bladeSD(p, 0.0, h1);
  float b2 = bladeSD(p, 0.5, h2);
  if (min(b1, b2) < d) { d = min(b1, b2); id = 2; aux = b1 < b2 ? h1 : h2; }
  int fid; float seed, opn;
  float fl = flowerSD(p, fid, seed, opn);
  if (fl < d) { d = fl; id = fid; aux = seed; op = opn; }
  fl = heroSD(p, fid, seed, opn);
  if (fl < d) { d = fl; id = fid; aux = seed; op = opn; }
  return d;
}
`;

export const DAWN_SCENE_GLSL = /* glsl */ `
float farMarch(vec3 ro, vec3 rd, float t0, float far) {
  float a = t0, fa = ro.y + rd.y * a - hillH((ro + rd * a).xz);
  if (fa < 0.0) return a;
  float b = a;
  for (int i = 1; i <= 48; i++) {
    float dt = 0.02 + 0.03 * b;
    b = a + dt;
    float fb = ro.y + rd.y * b - hillH((ro + rd * b).xz);
    if (fb < 0.0) {
      for (int k = 0; k < 6; k++) { float m = 0.5 * (a + b); if (ro.y + rd.y * m - hillH((ro + rd * m).xz) < 0.0) b = m; else a = m; }
      return 0.5 * (a + b);
    }
    a = b;
    if (a > far) break;
  }
  return -1.0;
}
vec3 hillNormal(vec2 xz, float e) {
  float h = hillH(xz);
  return normalize(vec3(h - hillH(xz + vec2(e, 0.0)), e, h - hillH(xz + vec2(0.0, e))));
}
vec3 mistOver(vec3 col, vec3 ro, vec3 rd, float t) {
  vec3 L = sunDir();
  float fog = 1.0 - exp(-t * 0.012);
  // mist lies low in the hollows (thicker toward the far side of the slope)
  float low = exp(-max(ro.y + rd.y * min(t, 60.0) * 0.6 - 0.4, 0.0) * 0.6);
  vec3 mc = mix(vec3(0.1, 0.12, 0.2), vec3(1.0, 0.75, 0.5), uDay) * (0.5 + 1.6 * pow(max(dot(rd, L), 0.0), 6.0));
  return mix(col, mc, sat(fog * (0.5 + 0.8 * low)));
}
// far hillside: wet grass with flowers as specks that open with the light
vec3 farShade(vec3 ro, vec3 rd, float t) {
  vec3 p = ro + rd * t;
  vec3 n = hillNormal(p.xz, max(0.02, t * 0.004));
  vec3 L = sunDir();
  float vis = sunVis(p + n * 0.05);
  float tone = fbm(p.xz * 0.35, 3);
  vec3 alb = mix(vec3(0.05, 0.09, 0.025), vec3(0.12, 0.17, 0.05), tone);
  alb = mix(alb, vec3(0.16, 0.15, 0.07), smoothstep(0.6, 0.8, fbm(p.xz * 0.15 + 4.0, 3)) * 0.5);
  // flowers in the far grass: white specks once open
  vec2 fc = floor(p.xz / 0.3);
  float speck = 0.0;
  {
    vec4 f = flowerCell(fc);
    if (f.w >= 0.0) {
      float tl = lightTime(vec3(f.x, hillH(f.xy) + 0.2, f.y));
      float op = openAt(tl, f.w);
      float r = mix(0.012, 0.03, op);
      float foot = t * 0.0012;
      float dd = length(p.xz - f.xy);
      speck = (r * r) / (r * r + dd * dd * 2.0 + foot * foot * 4.0) * (0.25 + 0.75 * op);
      speck *= 0.5;
    }
  }
  // fine-scale density of flowers where the cells are below pixel size
  float avgOpen = openAt(lightTime(p + vec3(0.0, 0.2, 0.0)), 0.5);
  speck = mix(speck, 0.06 * (0.3 + 0.7 * avgOpen) * (0.7 + 0.6 * fbm(p.xz * 0.5, 2)), smoothstep(6.0, 25.0, t));
  vec3 petal = vec3(0.92, 0.88, 0.78);
  alb = mix(alb, petal, sat(speck));
  float dif = sat(dot(n, L)) * vis;
  vec3 col = alb * sunCol() * dif * 0.35;
  // backlit wet grass: a gold sheen toward the sun
  col += sunCol() * vec3(0.5, 0.45, 0.2) * 0.05 * pow(max(dot(rd, L), 0.0), 4.0) * vis * (1.0 - speck);
  col += alb * skyFill() * (0.6 + 0.4 * n.y);
  return mistOver(col, ro, rd, t);
}
vec3 nearShade(vec3 ro, vec3 rd, float t, int id, float aux, float op) {
  vec3 p = ro + rd * t;
  vec3 L = sunDir();
  vec2 e = vec2(0.0004, 0.0);
  int i0; float a0, o0;
  vec3 n = normalize(vec3(nearSD(p + e.xyy, i0, a0, o0) - nearSD(p - e.xyy, i0, a0, o0),
                          nearSD(p + e.yxy, i0, a0, o0) - nearSD(p - e.yxy, i0, a0, o0),
                          nearSD(p + e.yyx, i0, a0, o0) - nearSD(p - e.yyx, i0, a0, o0)));
  nearSD(p, i0, a0, o0);            // sets gPV for the petal hit
  vec2 pv = gPV;
  float g = hillLo(p.xz);
  float vis = sunVis(vec3(p.x, g + 0.25, p.z));
  // the lower grass is shaded by the grass around it
  float occ = mix(0.35, 1.0, sat((p.y - g) / 0.22));
  vec3 alb; float trans = 0.0; float spec = 0.2;
  if (id == 1) { alb = vec3(0.04, 0.05, 0.02); occ *= 0.6; }
  else if (id == 2) {
    alb = mix(vec3(0.07, 0.13, 0.03), vec3(0.24, 0.31, 0.1), aux) * (0.8 + 0.4 * hash12(floor(p.xz / 0.035)));
    alb = mix(alb, vec3(0.3, 0.28, 0.12), step(0.85, hash12(floor(p.xz / 0.035) + 5.0)) * aux);   // a few dry blades
    trans = 1.1; spec = 0.5;
  } else if (id == 3) {
    // white petal: fine veins running out from the base, a gold flush where it joins the heart,
    // a faint violet blush underneath
    float vein = 0.5 + 0.5 * sin(atan(pv.y, pv.x + 0.15) * 70.0 + 3.0 * vnoise(pv * 8.0));
    alb = vec3(0.9, 0.89, 0.86) * (0.9 + 0.1 * vein);
    alb = mix(alb, vec3(0.95, 0.78, 0.35), smoothstep(0.25, 0.0, pv.x) * 0.6);
    alb = mix(alb, vec3(0.78, 0.74, 0.86), sat(-dot(n, rd)) * 0.0 + 0.1 * (1.0 - pv.x));
    trans = 0.9 * (0.75 + 0.25 * vein) * (1.0 - 0.4 * smoothstep(0.7, 1.0, abs(pv.y)));
    spec = 0.25;
    occ = max(occ, 0.8);
  } else if (id == 4) {
    alb = vec3(0.9, 0.62, 0.12) * (0.7 + 0.5 * vnoise(p.xz * 3000.0));
    trans = 0.3;
  } else { alb = vec3(0.1, 0.16, 0.04); trans = 0.5; }
  float dif = sat(dot(n, L)) * vis * occ;
  vec3 col = alb * sunCol() * dif * 0.35;
  // light through thin blades and petals (the sun is ahead of us)
  float back = pow(max(dot(rd, L), 0.0), 3.0) * vis * occ;
  col += alb * sunCol() * trans * back * 0.3 * (0.4 + 0.6 * abs(dot(n, L)));
  // the rim of every blade and petal catches the low sun
  col += sunCol() * alb * 0.25 * pow(1.0 - abs(dot(n, rd)), 3.0) * back;
  col += alb * skyFill() * (0.55 + 0.45 * n.y) * occ * (id == 2 ? 1.6 : 1.0);
  // dew: tiny beads that throw the sun back as gold glints
  vec3 cid = floor(p * 400.0);
  vec3 bc = (cid + 0.25 + 0.5 * hash33(cid + 1.7)) / 400.0;
  float bead = step(0.96, hash13(cid)) * step(length(p - bc), 0.0009) * (id == 2 || id == 3 ? 1.0 : 0.0);
  if (bead > 0.0) {
    vec3 bn = normalize(n + (hash33(cid) - 0.5) * 1.6);
    float gl = pow(sat(dot(reflect(rd, bn), L)), 60.0);
    col += vec3(1.0, 0.8, 0.45) * sunCol() * gl * 3.0 * vis * occ;
    col += vec3(0.6, 0.7, 1.0) * skyFill() * 0.08;
  }
  col += sunCol() * spec * 0.02 * pow(sat(dot(reflect(rd, n), L)), 30.0) * vis * occ;
  return mistOver(col, ro, rd, t);
}
vec3 dawn(vec2 fc) {
  vec3 ro; vec3 rd = mRay(fc, ro);
  // near: march the modelled grass and flowers
  float t = 0.0; int id = 0; float aux = 0.0, op = 0.0;
  bool hit = false;
  float tn = 0.0;
  for (int i = 0; i < 100; i++) {
    vec3 p = ro + rd * t;
    if (t > NEAR) break;
    float d = nearSD(p, id, aux, op);
    if (d < 0.00025 + 0.0004 * t) { hit = true; break; }
    // above the grass: skip down to it quickly
    float above = p.y - hillLo(p.xz) - 0.4;
    t += above > 0.0 ? max(d, above * 0.7) : min(max(d * 0.9, 0.0006 + 0.001 * t), 0.02 + 0.014 * t);
  }
  if (hit) return nearShade(ro, rd, t, id, aux, op);
  float tf = farMarch(ro, rd, max(t, NEAR * 0.95), 400.0);
  if (tf > 0.0) return farShade(ro, rd, tf);
  return mistOver(dawnSky(rd), ro, rd, 400.0) ;
}
`;
