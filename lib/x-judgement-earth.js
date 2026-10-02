// The cursed earth, seen close (s37, s42, s43): a heightfield of soil from wet dark mud (uDry 0) to
// pale cracked hardpan (uDry 1), with a network of shrinkage cracks (uNet), one great crack running
// away from the camera (uCrackW, its width in metres), puddles while it is wet, and a turf of grass
// (uGrassK) that can wither (uWither: green .. straw .. gone). Two lights: a key (uKeyDir/uKeyCol:
// the sun, or the warm light) and a second (uFillDir/uFillCol: the cold light, or sky bounce).
// Units: metres, y up; the soil surface is near y = 0. Builds on x-judgement.js.
import { JUDGE_GLSL, JUDGE_UNIFORMS } from '/song/lib/x-judgement.js';

export const EARTH_UNIFORMS = {
  ...JUDGE_UNIFORMS,
  uDry: 0.0, uNet: 0.0, uNetScale: 2.2, uCrackW: 0.0, uCrackDepth: 0.4, uPuddle: 0.0,
  uGrassK: 0.0, uWither: 0.0, uGrassH: 0.12, uBlow: 0.0,
  uKeyDir: [-0.8, 0.18, 0.4], uKeyCol: [3.0, 1.9, 1.0],
  uFillDir: [0.8, 0.22, 0.3], uFillCol: [0.9, 1.2, 1.8],
  uAmbCol: [0.05, 0.055, 0.065], uSkyTop: [0.02, 0.022, 0.03], uSkyHor: [0.1, 0.1, 0.11],
  uHeat: 0.0,     // heat shimmer
};

export const EARTH_GLSL = JUDGE_GLSL + /* glsl */ `
uniform float uDry, uNet, uNetScale, uCrackW, uCrackDepth, uPuddle, uGrassK, uWither, uGrassH, uBlow, uHeat;
uniform vec3 uKeyDir, uKeyCol, uFillDir, uFillCol, uAmbCol, uSkyTop, uSkyHor;
#define KEY normalize(uKeyDir)
#define FILL normalize(uFillDir)

float crackPath(float z) { return 0.32 * sin(z * 0.19 + 0.4) + 0.14 * sin(z * 0.61 + 1.0) + 0.04 * sin(z * 2.3); }
// distance (m) to the main crack's centre line, with a ragged edge
float mainCrackD(vec2 xz) {
  float d = abs(xz.x - crackPath(xz.y));
  return d + 0.35 * uCrackW * (vnoise(xz * vec2(9.0, 4.0)) - 0.5) + 0.006 * (vnoise(xz * 60.0) - 0.5);
}
// the shrinkage network: distance (m) to the nearest polygon edge
vec2 netCell(vec2 xz) {
  vec2 w = xz + 0.08 * (vec2(vnoise(xz * 3.0), vnoise(xz * 3.0 + 7.0)) - 0.5);
  vec2 v = voronoiEdge(w * uNetScale);
  return vec2(v.x / uNetScale, v.y);
}
float earthBase(vec2 xz) {
  float h = 0.03 * (fbm(xz * 0.35, 4) - 0.5) + 0.008 * (fbm(xz * 4.0, 3) - 0.5);
  return h;
}
// cheap height: everything but the shrinkage network (which only ever cuts down)
float earthHc(vec2 xz) {
  float h = earthBase(xz);
  h += mix(0.005, 0.0025, uDry) * (vnoise(xz * 18.0) * 0.65 + vnoise(xz * 41.0) * 0.35 - 0.5);
  if (uNet > 0.0) {
    // plates curl up a little at their edges as they dry (approximated without the cells)
    h += uDry * uNet * 0.003;
  }
  if (uCrackW > 0.0) {
    float d = mainCrackD(xz);
    h -= uCrackDepth * smoothstep(uCrackW, uCrackW * 0.15, d);
    h += 0.012 * smoothstep(uCrackW * 2.5, uCrackW, d) * smoothstep(uCrackW * 0.8, uCrackW * 1.1, d);
  }
  return h;
}
float earthH(vec2 xz) {
  float h = earthHc(xz);
  if (uNet > 0.0) {
    vec2 c = netCell(xz);
    float w = 0.012 * uNet * (0.6 + 0.8 * hash11(c.y * 17.0));
    h += uDry * uNet * (0.008 * smoothstep(0.12, 0.0, c.x) - 0.003);
    h -= 0.05 * uNet * smoothstep(w, w * 0.2, c.x);
  }
  return h;
}
vec3 earthN(vec2 xz, float t) {
  float e = 0.0015 + t * 0.0012;
  float h = earthH(xz);
  return normalize(vec3(h - earthH(xz + vec2(e, 0)), e, h - earthH(xz + vec2(0, e))));
}
float earthMarch(vec3 ro, vec3 rd, float tmax) {
  float t = 0.01;
  for (int i = 0; i < 240; i++) {
    vec3 p = ro + rd * t;
    float d = p.y - earthHc(p.xz);
    if (d < 0.0004 + 0.0008 * t) return t;
    t += max(d * 0.6, 0.0015 + 0.004 * t);
    if (t > tmax || (p.y > 2.0 && rd.y > 0.0)) break;
  }
  return -1.0;
}
float earthShadow(vec3 p, vec3 L) {
  float s = 1.0, t = 0.005;
  for (int i = 0; i < 14; i++) {
    vec3 q = p + L * t;
    float h = q.y - earthHc(q.xz);
    s = min(s, sat(14.0 * h / t));
    if (s < 0.01 || q.y > 0.5) break;
    t += max(h * 0.8, 0.006 + t * 0.25);
  }
  return s;
}
// a little sky for these scenes (overwritten per scene by uniforms)
vec3 earthSky(vec3 rd) {
  float y = rd.y;
  vec3 c = mix(uSkyHor, uSkyTop, pow(sat(y * 2.0 + 0.02), 0.5));
  c += uKeyCol * 0.06 * pow(max(dot(rd, KEY), 0.0), 6.0) + uKeyCol * 0.25 * pow(max(dot(rd, KEY), 0.0), 60.0);
  c += uFillCol * 0.05 * pow(max(dot(rd, FILL), 0.0), 6.0) + uFillCol * 0.2 * pow(max(dot(rd, FILL), 0.0), 60.0);
  return c;
}
vec3 earthAlb(vec3 p, float t, out float wet, out float rough) {
  vec2 xz = p.xz;
  float g = fbm(xz * 3.0, 4);
  vec3 mud = mix(vec3(0.06, 0.048, 0.036), vec3(0.12, 0.095, 0.07), g);
  vec3 pan = mix(vec3(0.28, 0.23, 0.17), vec3(0.42, 0.36, 0.27), g);
  pan = mix(pan, vec3(0.5, 0.45, 0.36), smoothstep(0.6, 0.8, fbm(xz * 1.2 + 4.0, 3)) * 0.4);
  // dry first on the high ground, last in the hollows
  float local = uDry * 1.4 - 0.4 + (earthBase(xz) * 6.0) + 0.25 * (fbm(xz * 0.8 + 9.0, 3) - 0.5);
  float dry = sat(local);
  vec3 c = mix(mud, pan, dry);
  wet = 1.0 - dry;
  rough = mix(0.3, 0.9, dry);
  if (uNet > 0.0) {
    vec2 nc = netCell(xz);
    float w = 0.012 * uNet * (0.6 + 0.8 * hash11(nc.y * 17.0));
    // each plate dried a little differently; their curled rims bleach paler
    c *= mix(1.0, 0.82 + 0.3 * hash11(nc.y * 31.0), uNet * dry);
    c = mix(c, c * 1.25 + 0.03, smoothstep(0.05, 0.012, nc.x) * uNet * dry * 0.6);
    c *= mix(1.0, 0.12, smoothstep(w, w * 0.3, nc.x));
  }
  // drifts of loose dust and grit
  c = mix(c, vec3(0.52, 0.47, 0.38), smoothstep(0.62, 0.8, fbm(xz * 0.9 + 21.0, 4)) * dry * 0.5);
  // fine grit speckle
  c *= 0.85 + 0.3 * hash12(floor(xz * 300.0)) * exp(-t * 0.5);
  return c;
}
`;

// ---------------- the turf (s42): blades in a slab over the soil ----------------
// uGrassK: how many blades stand (0 .. 1); uWither: 0 green .. 0.5 straw .. 1 brown, flattened;
// uBlow: how far the dead blades have been torn off and blown away (0 .. 1).
export const GRASS_GLSL = /* glsl */ `
float GDIST;
float bladeAt(vec3 p, float g, out float hk, out float side) {
  const float S = 0.011;
  vec2 c0 = floor(p.xz / S - 0.5);
  float best = 1e3; hk = 0.0; side = 0.0;
  for (int j = 0; j <= 1; j++) for (int i = 0; i <= 1; i++) {
    vec2 c = c0 + vec2(i, j);
    float hc = hash12(c + 11.0);
    // a blade stands here while the turf is alive; the dead ones are torn away one by one
    if (hc > uGrassK || hash12(c + 31.0) < uBlow || hash12(c + 51.0) > smoothstep(1.8, 1.1, GDIST)) continue;
    vec2 base = (c + hash22(c)) * S;
    float hgt = uGrassH * (0.45 + 0.55 * hash12(c + 5.0)) * (0.6 + 0.6 * vnoise(c * 0.11)) * (1.0 - 0.45 * uWither);
    float y = (p.y - g) / hgt;
    if (y < 0.0 || y > 1.0) continue;
    float ang = hash12(c + 9.0) * 6.283;
    vec2 lean = vec2(cos(ang), sin(ang)) * (0.12 + 0.5 * uWither * uWither) * hgt;
    float w = sin(uTime * 2.6 + base.x * 9.0 + base.y * 6.0) * 0.06 + sin(uTime * 4.1 + base.x * 17.0) * 0.02;
    lean += normalize(uJWind.xz + vec2(1e-4)) * w * hgt * (1.0 + uWither);
    vec2 bp = base + lean * y * y;
    float wd = 0.0026 * (1.0 - y * 0.8) * (1.0 - 0.3 * uWither) + 0.0003;
    float d = length(p.xz - bp) - wd;
    if (d < best) { best = d; hk = y; side = hash12(c + 2.0); }
  }
  return best;
}
float grassTrace(vec3 ro, vec3 rd, float tEnd, float jit, out float hk, out float side) {
  hk = 0.0; side = 0.0;
  if (uGrassK <= 0.0 || uBlow >= 1.0) return -1.0;
  float t = 0.0;
  for (int i = 0; i < 120; i++) {
    if (t > tEnd) return -1.0;
    vec3 p = ro + rd * t;
    float g = earthBase(p.xz);
    GDIST = t;
    float above = p.y - g - uGrassH;
    if (above > 0.003) { if (rd.y >= 0.0) return -1.0; t += max(above / max(-rd.y, 0.04), 0.004); continue; }
    float d = bladeAt(p, g, hk, side);
    if (d < 0.0) return t;
    t += clamp(d * 0.75, 0.0012 + 0.003 * t, 0.008) * (0.75 + 0.5 * jit);
  }
  return -1.0;
}
vec3 bladeAlb(float hk, float side) {
  vec3 green = mix(vec3(0.04, 0.08, 0.02), vec3(0.16, 0.24, 0.06), hk);
  vec3 straw = mix(vec3(0.2, 0.15, 0.07), vec3(0.5, 0.42, 0.24), hk);
  vec3 dead = mix(vec3(0.12, 0.09, 0.06), vec3(0.3, 0.24, 0.17), hk);
  float w = sat(uWither * 2.0 + (side - 0.5) * 0.4);
  vec3 c = mix(green, straw, w);
  return mix(c, dead, sat(uWither * 2.0 - 1.0 + (side - 0.5) * 0.3));
}
`;
