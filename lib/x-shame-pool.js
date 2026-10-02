// The still pool at dusk (scene 27): a dark, cold pool under the trees. Its surface holds only the
// last of the sky, the black lace of the leaves overhead and one star. A drop falls; the rings run
// out through the star's reflection and break it into trembling light.
// Units: metres, the water at y = 0. Everything a pure function of uTime.
// Include after SHAME_GLSL (it uses the lens and the fig leaves of lib/x-shame.js).
export const POOL_UNIFORMS = {
  uLeafFloat: [0.4, 0.0, 0.5, 0.6],   // the floating leaf: x, (y), z, its turn on the water
  uDrop: [0.0, 0.0, 1.0],   // impact point x, z, and the impact time (song seconds)
  uStar: [0.05, 0.42, 1.0], // direction of the star
  uCalm: 1.0,               // 1 = mirror; a breath of air adds a faint shiver
};

export const POOL_GLSL = /* glsl */ `
uniform vec3 uDrop, uStar; uniform float uCalm; uniform vec4 uLeafFloat;

// the far bank: a low dark edge of grass and reeds across the pool at z = BANKZ
#define BANKZ 40.0
float bankH(float x) { return 0.08 + 0.1 * fbm(vec2(x * 0.35, 1.0), 4); }
// is the point (x, y) on the plane of the far bank inside the bank or one of its reeds?
float bankInside(float x, float y) {
  float h = bankH(x);
  if (y < h) return 1.0;
  float cx = floor(x * 9.0);
  for (int i = -2; i <= 2; i++) {
    float c = cx + float(i);
    float hh = hash11(c * 1.37);
    // reeds grow in clumps
    float clump = smoothstep(0.45, 0.7, vnoise(vec2(c * 0.18, 3.0)));
    for (int j = 0; j < 2; j++) {
      float cj = c * 2.0 + float(j);
      if (hash11(cj * 4.1) > clump * 0.9) continue;
      float bx = (c + hash11(cj * 3.1)) / 9.0;
      float tall = 0.12 + 0.5 * hash11(cj * 7.7) * (0.4 + 0.6 * clump);
      float lean = (hash11(cj * 5.3) - 0.5) * 0.5 + 0.02 * sin(uTime * 0.7 + cj);
      float y0 = bankH(bx) - 0.01;
      float v = (y - y0) / tall;
      if (v < 0.0 || v > 1.0) continue;
      float cxv = bx + lean * v * v * tall;
      float w = 0.0045 * (1.0 + hash11(cj)) * (1.0 - v * 0.85);
      if (abs(x - cxv) < w) return 1.0;
    }
  }
  return 0.0;
}
// the dusk sky as the pool sees it, with the black lace of a branch over it and one star
vec3 poolSky(vec3 rd) {
  float y = max(rd.y, 0.0);
  vec3 c = mix(vec3(0.2, 0.21, 0.29), vec3(0.045, 0.06, 0.11), smoothstep(0.0, 0.7, y));
  c += vec3(0.16, 0.09, 0.06) * pow(1.0 - y, 8.0) * 0.6;
  // a branch overhead: leaves as dark lace with gaps of sky, swaying a little
  vec2 uv = rd.xy / (rd.z + 0.6);
  uv += vec2(sin(uTime * 0.3), cos(uTime * 0.23)) * 0.004;
  float lf = fbm(uv * 4.0 + 4.0, 5);
  float lace = smoothstep(0.46, 0.52, lf + 0.1 * (vnoise(uv * 30.0) - 0.5));
  vec3 sd0 = normalize(uStar);
  float mask = smoothstep(0.1, 0.32, acos(clamp(dot(rd, sd0), -1.0, 1.0)) + 0.12 * (fbm(uv * 2.0, 3) - 0.5)) * smoothstep(0.02, 0.12, y);
  // the star (and a scatter of others, very faint)
  vec3 sd = normalize(uStar);
  float s = max(dot(rd, sd), 0.0);
  c += vec3(0.95, 0.97, 1.0) * (pow(s, 150000.0) * 60.0 + pow(s, 8000.0) * 0.18 + pow(s, 300.0) * 0.02);
  vec3 q = rd * 380.0; vec3 id = floor(q);
  c += vec3(0.7, 0.75, 0.9) * smoothstep(0.9993, 1.0, hash13(id)) * smoothstep(0.45, 0.0, length(fract(q) - 0.5)) * 0.25;
  return c;
}
// what a ray sees above the water: the bank if it crosses it low enough, else the sky
vec3 poolAbove(vec3 o, vec3 rd) {
  if (rd.z > 0.0) {
    float tb = (BANKZ - o.z) / rd.z;
    vec3 q = o + rd * tb;
    if (q.y < 0.8 && bankInside(q.x, q.y) > 0.5) return vec3(0.006, 0.008, 0.007);
  }
  return poolSky(rd);
}

// rings from the drop: height and gradient at a point
vec3 ripple(vec2 p) {
  float tt = uTime - uDrop.z;
  vec2 d = p - uDrop.xy;
  float r = length(d);
  vec3 h = vec3(0.0);
  if (tt > 0.0) {
    // a packet of rings travelling outward, the leading ring strongest, decaying with distance and time
    for (int i = 0; i < 4; i++) {
      float fi = float(i);
      float c = 0.2 - 0.025 * fi;                 // ring speed m/s
      float k = 70.0 + 30.0 * fi;
      float front = c * tt;
      float x = r - front + fi * 0.02;
      float env = exp(-x * x * 900.0 / (1.0 + tt * 3.0)) * exp(-tt * 0.55) / (1.0 + r * 9.0);
      float a = 0.0026 * env * (1.0 - 0.18 * fi);
      h.x += a * cos(k * x);
      float dh = a * (-k * sin(k * x) - cos(k * x) * x * 1800.0 / (1.0 + tt * 3.0));
      h.yz += dh * d / max(r, 1e-4);
    }
  }
  // the faintest shiver of air on the water
  float s = (1.0 - uCalm) * 0.0006;
  h.yz += s * vec2(sin(p.x * 23.0 + uTime * 1.7) + sin(p.y * 31.0 - uTime * 2.1), cos(p.x * 19.0 - uTime * 1.3) + cos(p.y * 27.0 + uTime * 1.9));
  return h;
}

vec3 poolScene(vec3 ro, vec3 rd) {
  vec3 c = vec3(0.0);
  float tw = -ro.y / rd.y;
  if (rd.y >= 0.0 || tw < 0.0) return poolAbove(ro, rd);
  shSetup();
  vec3 p = ro + rd * tw;
  if (p.z > BANKZ) return poolAbove(ro, rd);
  vec3 h = ripple(p.xz);
  // a fallen fig leaf floating on the water, riding the rings
  {
    vec3 lc0 = uLeafFloat.xyz; float la = uLeafFloat.w;
    lc0.y = ripple(lc0.xz).x;
    vec3 ax = vec3(cos(la), 0.0, sin(la)), ay = vec3(-sin(la), 0.0, cos(la));
    vec2 luv; vec3 lnw;
    float tlf = leafHit(ro, rd, lc0, ax, ay, 0.16, 0.6, 0.15, luv, lnw);
    if (tlf > 0.0 && tlf < tw + 0.02) {
      shSetup();
      float vein = figVeins(luv);
      vec3 n = lnw * (dot(lnw, rd) < 0.0 ? 1.0 : -1.0);
      vec3 alb = mix(vec3(0.03, 0.05, 0.025), vec3(0.06, 0.08, 0.04), fbm(luv * 8.0, 3)) * (1.0 - 0.3 * vein);
      vec3 lcol = alb * vec3(0.08, 0.09, 0.13) * 1.2;
      // its wet surface mirrors the sky and the star
      vec3 rr0 = reflect(rd, n);
      float fr0 = 0.04 + 0.96 * pow(1.0 - max(dot(n, -rd), 0.0), 5.0);
      lcol += poolSky(rr0) * fr0 * 0.8;
      return lcol;
    }
  }
  vec3 n = normalize(vec3(-h.y, 1.0, -h.z));
  vec3 rr = reflect(rd, n);
  float fres = 0.02 + 0.98 * pow(1.0 - max(dot(n, -rd), 0.0), 5.0);
  // the water is deep and dark; a little cold light lives just under the surface
  vec3 under = vec3(0.006, 0.01, 0.013) * (0.6 + 0.5 * fbm(p.xz * 2.0, 3));
  vec3 refl = poolAbove(p, rr);
  // the fig leaves hanging over the pool, black against the sky in the water
  vec3 lc; float tl = shLeaves(p, rr, 60.0, lc);
  if (tl > 0.0) refl = lc * 0.25 + vec3(0.002, 0.003, 0.004);
  c = mix(under, refl, fres);
  // pollen and specks resting on the surface, drifting very slowly
  vec2 sp = p.xz * 60.0 + vec2(uTime * 0.05, uTime * 0.02);
  float spk = smoothstep(0.985, 1.0, hash12(floor(sp))) * smoothstep(0.5, 0.1, length(fract(sp) - 0.5));
  c += vec3(0.05, 0.05, 0.045) * spk * 0.4;
  // the falling drop: a bead of water catching the star and the sky
  float tt = uTime - uDrop.z;
  if (tt > -0.6 && tt < 0.0) {
    vec3 dp = vec3(uDrop.x, -tt * (4.9 * -tt) + 0.0, uDrop.y);
    dp.y = 4.9 * tt * tt;
    vec3 oc = ro - dp; float b = dot(oc, rd), cc = dot(oc, oc) - 0.0025 * 0.0025 * 1.0;
    float rad = 0.003;
    cc = dot(oc, oc) - rad * rad;
    float hh = b * b - cc;
    if (hh > 0.0) {
      float td = -b - sqrt(hh);
      if (td > 0.0 && td < tw) {
        vec3 dn = normalize(ro + rd * td - dp);
        c = poolSky(reflect(rd, dn)) * 0.9 + vec3(0.02, 0.025, 0.035);
      }
    }
  }
  // the little column that jumps back up after the drop
  if (tt > 0.04 && tt < 0.32) {
    float k = (tt - 0.04) / 0.28;
    float hgt = 0.022 * sin(k * PI);
    vec3 a = vec3(uDrop.x, 0.0, uDrop.y), b = a + vec3(0.0, hgt, 0.0);
    // ray against a thin capsule
    vec3 ba = b - a, oa = ro - a;
    float baba = dot(ba, ba) + 1e-6, bard = dot(ba, rd), baoa = dot(ba, oa), rdoa = dot(rd, oa), oaoa = dot(oa, oa);
    float rad = 0.0022 * (1.0 - 0.4 * k);
    float A = baba - bard * bard, B = baba * rdoa - baoa * bard, C = baba * oaoa - baoa * baoa - rad * rad * baba;
    float hh = B * B - A * C;
    if (hh > 0.0) {
      float td = (-B - sqrt(hh)) / A;
      float y = baoa + td * bard;
      if (td > 0.0 && y > 0.0 && y < baba) {
        vec3 q = ro + rd * td; vec3 pa = q - a;
        vec3 dn = normalize(pa - ba * (dot(pa, ba) / baba));
        c = poolSky(reflect(rd, dn)) * 0.9 + vec3(0.015, 0.02, 0.03);
      }
    }
  }
  return c;
}
`;
