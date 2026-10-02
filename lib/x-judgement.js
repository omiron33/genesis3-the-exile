// The judgement (Genesis 3:14-19): the storm over Paradise and the cursed earth. Shared pieces for
// scenes s32 .. s43: a storm sky with a volumetric cloud deck, lightning (bolt + flash lighting),
// rain, a thin-lens camera, haze, and the JS strike schedule. Units: metres. Every frame is a pure
// function of uTime and the uniforms the scenes set from song time.
import { clamp } from '/song/lib/look.js';

export const JUDGE_UNIFORMS = {
  uJSun: [0.3, 0.12, 1.0], uJSunCol: [3.0, 2.2, 1.5],
  uJZen: [0.05, 0.06, 0.08], uJHor: [0.25, 0.24, 0.24],
  uJCover: 0.8, uJCloudT: 0.0, uJWind: [6.0, 2.0, 0.0], uJBase: 900.0, uJTop: 3200.0,
  uJCloudDark: 0.6,
  uJBolt: [0.0, 0.0, 3000.0], uJBoltK: 0.0, uJBoltSeed: 0.0,
  uJFlash: 0.0, uJFlashPos: [0.0, 1200.0, 3000.0],
  uJAper: 0.0, uJFocus: 10.0,
  uJRain: 0.0, uJRainT: 0.0, uJRainSlant: [0.15, 0.0, 0.0],
  uJFog: 0.0004, uJFogCol: [0.2, 0.21, 0.23], uJSunDisc: 1.0, uJDeckEnd: 1e9,
};

export const JUDGE_GLSL = /* glsl */ `
uniform vec3 uJSun, uJSunCol, uJZen, uJHor;
uniform float uJCover, uJCloudT, uJBase, uJTop, uJCloudDark;
uniform vec3 uJWind;
uniform vec3 uJBolt; uniform float uJBoltK, uJBoltSeed;
uniform float uJFlash; uniform vec3 uJFlashPos;
uniform float uJAper, uJFocus;
uniform float uJRain, uJRainT; uniform vec3 uJRainSlant;
uniform float uJFog, uJSunDisc, uJDeckEnd; uniform vec3 uJFogCol;
#define JSUN normalize(uJSun)
const vec3 BOLTC = vec3(0.78, 0.86, 1.0);

// a per-pixel, per-sub-frame random number (the sub-frames average it away)
float jRand(vec2 fc, float k) { return hash12(fc * 0.731 + uJitter * 97.3 + vec2(uFrame * 0.618 + k, k * 3.7)); }

// thin lens: depth of field from the sub-frames
vec3 jLens(vec2 fc, out vec3 ro) {
  vec3 rd = camRay(fc, ro);
  if (uJAper <= 0.0) return rd;
  vec3 ww = normalize(uCamTarget - uCamPos);
  vec3 up = vec3(sin(uCamRoll), cos(uCamRoll), 0.0);
  vec3 uu = normalize(cross(ww, up)), vv = cross(uu, ww);
  vec3 fp = ro + rd * (uJFocus / dot(rd, ww));
  vec2 j = vec2(hash12(uJitter * 917.0 + 3.1 + uFrame * 0.013), hash12(uJitter * 613.0 + 7.7 + uFrame * 0.029));
  float r = sqrt(j.x), th = 6.2831853 * j.y;
  ro += (uu * cos(th) + vv * sin(th)) * r * uJAper;
  return normalize(fp - ro);
}

// metres per pixel at distance t
float jPix(float t) { return t * 2.0 * tan(radians(uFov) * 0.5) / uRes.y; }

// ---------------- sky ----------------
vec3 jSkyBase(vec3 rd) {
  float y = rd.y;
  float s = max(dot(rd, JSUN), 0.0);
  vec3 c = mix(uJHor, uJZen, pow(sat(y * 1.7 + 0.02), 0.55));
  c += uJSunCol * (pow(s, 5.0) * 0.10 + pow(s, 48.0) * 0.35);
  c += uJSunCol * smoothstep(0.99955, 0.99975, s) * 14.0 * uJSunDisc;
  c += BOLTC * uJFlash * 0.25 * exp(-2.0 * max(y, 0.0));
  return c;
}

// the cloud deck: density at p (metres)
float jCloudD(vec3 p, int oct) {
  float h = (p.y - uJBase) / (uJTop - uJBase);
  if (h < -0.25 || h > 1.0) return 0.0;
  vec3 q = (p - vec3(uJWind.x, 0.0, uJWind.z) * uJCloudT) / 1500.0;
  // the underside rolls: the base itself is lumpy (heavy pouches hang below it)
  float bump = fbm(q.xz * 1.6 + 3.0, 3) - 0.5;
  float hb = h + bump * 0.3;
  float shape = smoothstep(-0.06, 0.1, hb) * smoothstep(1.0, 0.55, h);
  q.y += uJCloudT * 0.0005;   // boiling
  float n = fbm(q * vec3(1.0, 2.0, 1.0), 4);
  // erode the edges with fine detail so they read sharp and torn
  if (oct > 4) n -= 0.12 * (fbm(q * 7.0 + vec3(0.0, uJCloudT * 0.002, 0.0), 3) - 0.5) * 2.0 * (1.0 - n);
  float cov = mix(0.72, 0.22, uJCover) - 0.18 * (1.0 - smoothstep(0.0, 0.5, h));
  float d = smoothstep(cov, cov + 0.1, n);
  d -= smoothstep(uJDeckEnd * 0.55, uJDeckEnd, length(p.xz - uCamPos.xz) + 2500.0 * (fbm(q.xz * 0.4 + 7.0, 2) - 0.5));
  return sat(d) * shape;
}

// march the deck: rgb added light, a transmittance
vec4 jClouds(vec3 ro, vec3 rd, float tmax, float jit) {
  if (rd.y <= 0.0005 && ro.y < uJBase) return vec4(0, 0, 0, 1);
  float t0 = (uJBase - 380.0 - ro.y) / rd.y, t1 = (uJTop - ro.y) / rd.y;
  t0 = max(t0, 0.0); t1 = min(min(t1, tmax), 32000.0);
  if (t1 <= t0) return vec4(0, 0, 0, 1);
  const int N = 16;
  float dt = (t1 - t0) / float(N);
  vec3 L = vec3(0); float T = 1.0;
  float mu = dot(rd, JSUN);
  float ph = 0.3 + 1.2 * pow(max(mu, 0.0), 10.0);
  vec3 amb = mix(uJZen, uJHor, 0.45) * 1.15;
  for (int i = 0; i < N; i++) {
    float t = t0 + (float(i) + jit) * dt;
    vec3 p = ro + rd * t;
    float d = jCloudD(p, 6);
    if (d > 0.005) {
      float ds = jCloudD(p + JSUN * 300.0, 4);
      float h = sat((p.y - uJBase) / (uJTop - uJBase));
      // dense cores are dark underneath, thin edges let the sky light through
      float thin = 1.0 - d;
      vec3 c = uJSunCol * exp(-ds * 3.5) * ph * 0.5 * (0.3 + 0.7 * h);
      c += amb * mix(1.0 - uJCloudDark, 1.0, h) * (0.55 + 0.9 * thin);
      // lightning lights the cloud from inside
      float fd = length(p - uJFlashPos);
      c += BOLTC * uJFlash * 5.0 * exp(-fd / 1100.0) * (0.3 + 0.7 * (1.0 - h));
      float a = 1.0 - exp(-d * dt * 0.006);
      L += T * a * c;
      T *= 1.0 - a;
      if (T < 0.02) break;
    }
  }
  return vec4(L, T);
}

// ---------------- lightning ----------------
float jJag(float v, float s) { float i = floor(v), f = fract(v); return mix(hash11(i * 1.37 + s), hash11(i * 1.37 + 1.37 + s), f) - 0.5; }
float jBoltPath(float vv, float s) { return 0.16 * jJag(vv * 4.0, s) + 0.07 * jJag(vv * 13.0, s + 3.1) + 0.025 * jJag(vv * 41.0, s + 7.3); }
// the bolt: drawn in the vertical plane through the strike point facing the camera
vec3 jBolt(vec3 ro, vec3 rd, float tmax) {
  if (uJBoltK <= 0.0) return vec3(0);
  vec3 B = uJBolt;
  vec3 n = vec3(B.x - ro.x, 0.0, B.z - ro.z); n = normalize(n);
  float dn = dot(rd, n); if (dn <= 0.0) return vec3(0);
  float t = dot(B - ro, n) / dn;
  if (t > tmax) return vec3(0);
  vec3 p = ro + rd * t;
  vec3 side = vec3(n.z, 0.0, -n.x);
  float H = uJBase - B.y;
  float u = dot(p - B, side) / H, vv = (p.y - B.y) / H;
  if (vv < -0.02 || vv > 1.15) return vec3(0);
  float s = uJBoltSeed;
  float pw = max(jPix(t) / H, 0.0006);
  float d = abs(u - (jBoltPath(vv, s) - jBoltPath(0.0, s)));
  float core = exp(-pow(d / (pw * 1.1), 2.0)) + 0.35 * exp(-d / (pw * 4.0));
  float glow = exp(-d / 0.02) * 0.12 + exp(-d / 0.12) * 0.03;
  // branches
  for (int i = 0; i < 4; i++) {
    float fi = float(i);
    float vb = 0.35 + 0.17 * fi + 0.08 * hash11(s + fi);
    float len = 0.18 + 0.2 * hash11(s + fi * 3.0);
    if (vv < vb && vv > vb - len) {
      float k = (vb - vv) / len;
      float dir = hash11(s + fi * 7.0) > 0.5 ? 1.0 : -1.0;
      float bu = jBoltPath(vb, s) - jBoltPath(0.0, s) + dir * (vb - vv) * (0.5 + 0.4 * hash11(s + fi * 5.0)) + 0.6 * (jBoltPath(vv * 1.7, s + 11.0 + fi) - jBoltPath(vb * 1.7, s + 11.0 + fi));
      float bd = abs(u - bu);
      float fade = (1.0 - k) * 0.6;
      core += fade * exp(-pow(bd / (pw * 0.8), 2.0));
      glow += fade * exp(-bd / 0.015) * 0.06;
    }
  }
  float top = smoothstep(1.12, 0.95, vv);
  return BOLTC * uJBoltK * top * (core * 30.0 + glow * 6.0);
}

// ---------------- rain ----------------
// streaks on planes facing the camera from 0.6 m out to 'far'; col is what is behind
vec3 jRain(vec3 ro, vec3 rd, vec3 col, float depth, vec3 lightC) {
  if (uJRain <= 0.0) return col;
  vec3 ww = normalize(uCamTarget - uCamPos);
  vec3 uu = normalize(cross(ww, vec3(0, 1, 0))), vv = cross(uu, ww);
  float cosA = dot(rd, ww);
  for (int k = 0; k < 14; k++) {
    float fk = float(k);
    float z = 0.7 * pow(1.32, fk);           // plane distance along the view axis
    float t = z / cosA;
    if (t > depth) break;
    vec3 p = ro + rd * t;
    // plane coordinates (world-anchored so rain doesn't swim with the camera)
    vec2 q = vec2(dot(p, uu), p.y);
    float sc = 0.03 * z + 0.02;             // drop spacing grows with distance
    q.x -= q.y * uJRainSlant.x;
    q.y += uJRainT * (0.9 + 0.1 * hash11(fk)) + fk * 13.7;
    vec2 cell = vec2(sc, sc * 9.0);
    vec2 cc = floor(q / cell);
    float h = hash12(cc + fk * 17.0);
    if (h > uJRain * 0.85) continue;
    vec2 f = q - (cc + 0.5) * cell - (hash22(cc + fk * 3.0) - 0.5) * cell * vec2(0.7, 0.4);
    float pw = jPix(t);
    float w = max(0.0007, pw * 0.6);
    float len = cell.y * 0.16;
    float d = length(vec2(f.x, max(abs(f.y) - len, 0.0)));
    float a = sat(1.0 - d / (w + pw)) * (w / (w + pw)) * 2.2;
    float tail = 1.0 - sat(abs(f.y) / (len + 1e-4)) * 0.5;
    col += lightC * a * tail * 0.16 * exp(-z * 0.02);
  }
  return col;
}

// height fog / in-scattering
vec3 jFog(vec3 col, vec3 ro, vec3 rd, float t) {
  float fogA = 1.0 - exp(-t * uJFog * (1.0 + 2.0 * uJRain));
  float s = pow(max(dot(rd, JSUN), 0.0), 6.0);
  vec3 fc = uJFogCol + uJSunCol * s * 0.08 + BOLTC * uJFlash * 0.08;
  return mix(col, fc, fogA);
}
`;

// ---------------- JS: the lightning schedule ----------------
// strikes: [{ t, pos:[x,y,z], seed, k, flash }] ; returns { bolt, boltK, seed, flash, flashPos }
// Each strike: a faint stepped leader, the main stroke, then two or three return strokes, fading.
const pulses = [[0, 1.0], [0.07, 0.55], [0.16, 0.8], [0.31, 0.35]];
export function lightning(t, strikes) {
  let best = null, bk = 0, flash = 0, fpos = [0, 1200, 3000];
  for (const s of strikes) {
    const dt = t - s.t;
    if (dt < -0.06 || dt > 1.4) continue;
    let k = 0;
    if (dt < 0) k = 0.08 * (1 + dt / 0.06);
    else for (const [o, a] of pulses.slice(0, s.n ?? 4)) { const x = dt - o; if (x >= 0) k += a * Math.exp(-x / 0.035); }
    const f = k * (s.flash ?? 1);
    if (k * (s.k ?? 1) > bk) { bk = k * (s.k ?? 1); best = s; }
    if (f > flash) { flash = f; fpos = [s.pos[0], s.cloud ?? 1100, s.pos[2]]; }
  }
  return { bolt: best ? best.pos : [0, 0, 3000], boltK: best && !best.sheet ? bk : 0, seed: best ? best.seed : 0, flash, flashPos: fpos };
}
// set the lightning uniforms
export function setLightning(u, t, strikes) {
  const L = lightning(t, strikes);
  u.uJBolt.value.set(...L.bolt); u.uJBoltK.value = L.boltK; u.uJBoltSeed.value = L.seed;
  u.uJFlash.value = L.flash; u.uJFlashPos.value.set(...L.flashPos);
  return L;
}
// The director's rule: no strike may white the frame out within 0.4 s before a word's onset.
// Flashes are kept below white-out; a strike's main stroke is moved out of [onset - 0.4, onset).
export function clearOfWords(strikes, words) {
  return strikes.map((s) => {
    let t = s.t;
    for (let i = 0; i < 6; i++) {
      const hit = words.find((w) => t >= w.start - 0.4 && t < w.start);
      if (!hit) break;
      t = hit.start + 0.05;
    }
    return { ...s, t };
  });
}
export const smooth01 = (x) => { x = clamp(x, 0, 1); return x * x * (3 - 2 * x); };
