// The centre of the garden: the tree (lib/x-tree.js) alone on its rise in a wide clearing; a river
// coming down from the far hills parts around the hill and joins again below it; orchards and woods
// stand back at the clearing's edge; a still pool lies in the grass under the tree's eastern limbs.
// Low gold afternoon sun (uDusk 0) or cold dusk after the eating (uDusk 1). Near the camera the grass
// is real blades (uGrass > 0 turns them on, out to uGrassFar metres).
// gardenScene(ro, rd, jit, depth) draws everything; scenes add their own close objects and lens.
import { TREE_GLSL, TREE_UNIFORMS } from './x-tree.js';

export const WORLD_UNIFORMS = {
  ...TREE_UNIFORMS,
  uSunDir: [-0.12, 0.15, 0.98],
  uSunCol: [7.2, 5.3, 3.3],
  uDusk: 0.0,
  uHaze: 1.0,
  uGrass: 0.0,
  uGrassFar: 14.0,
  uGrassH: 1.0,        // grass height scale
  uCloudSh: 0.0,       // a cloud's shadow over the hill (0 none .. 1 full)
  uCloudX: 0.0,        // where its edge is (world x along the sweep)
  uDrop: [0.0, 0.0, -100.0],   // pool ripple: impact x, z, time
  uSunCover: 0.0,     // a cloud over the sun itself: the disc and its glow dim
  uReflQ: 1.0,         // 1: the pool reflects the tree and land; 0: sky only
};

export const WORLD_GLSL = TREE_GLSL + /* glsl */ `
uniform vec3 uSunDir, uSunCol, uDrop;
uniform float uSunCover;
uniform float uGrassH;
uniform float uDusk, uHaze, uGrass, uGrassFar, uCloudSh, uCloudX, uReflQ;
#define SUN normalize(uSunDir)
const vec2 POOL = vec2(6.2, -11.5);
const float POOL_R = 4.3;
const float WP = 6.42;     // pool surface
const float WR = -1.0;     // river surface

// ---------------- sky ----------------
vec3 skyBase(vec3 rd) {
  float y = max(rd.y, 0.0);
  float s = max(dot(rd, SUN), 0.0);
  vec3 hor = mix(vec3(1.25, 0.86, 0.52), vec3(0.36, 0.37, 0.41), uDusk);
  vec3 mid = mix(vec3(0.44, 0.57, 0.76), vec3(0.15, 0.17, 0.22), uDusk);
  vec3 zen = mix(vec3(0.17, 0.33, 0.68), vec3(0.05, 0.06, 0.085), uDusk);
  vec3 c = mix(hor, mid, smoothstep(0.0, 0.16, y));
  c = mix(c, zen, smoothstep(0.1, 0.65, y));
  c += mix(vec3(1.0, 0.6, 0.28), vec3(0.55, 0.4, 0.42), uDusk) * (pow(s, 14.0) * 0.32 + pow(s, 90.0) * 0.7 + pow(s, 3000.0) * 1.6) * (1.0 - 0.6 * uDusk) * (1.0 - 0.75 * uSunCover);
  return c;
}
vec3 sky(vec3 rd) {
  vec3 c = skyBase(rd);
  float s = max(dot(rd, SUN), 0.0);
  // clouds: a high scatter of cumulus lit gold from below and the side
  if (rd.y > 0.0) {
    vec2 uv = rd.xz / (rd.y + 0.09);
    vec2 wv = vec2(uTime * 0.006, uTime * 0.002);
    float cl = fbm(uv * 0.32 + wv, 6);
    float den = smoothstep(0.64, 0.8, cl) * smoothstep(0.0, 0.12, rd.y);
    float lit = fbm(uv * 0.32 + wv + SUN.xz * 0.05, 5);
    vec3 cc = mix(vec3(1.05, 0.86, 0.66), vec3(0.1, 0.105, 0.13), uDusk) * (0.7 + 0.9 * sat((cl - lit) * 6.0));
    cc += mix(vec3(1.4, 0.8, 0.35), vec3(0.4, 0.3, 0.32), uDusk) * pow(s, 8.0) * 0.8;
    c = mix(c, cc, den * mix(0.55, 0.85, uDusk));
  }
  // the sun
  float disc = smoothstep(0.99997, 0.999985, s);
  c += uSunCol * disc * 40.0 * (1.0 - uDusk) * (1.0 - 0.97 * uSunCover);
  // far hills and woods on the horizon, blue in the haze
  float az = atan(rd.x, rd.z);
  float ridge = 0.012 + 0.03 * fbm(vec2(az * 2.6, 1.0), 5) + 0.01 * fbm(vec2(az * 14.0, 3.0), 3);
  float hill = smoothstep(ridge + 0.001, ridge - 0.001, rd.y);
  vec3 hc = mix(mix(vec3(0.62, 0.55, 0.48), vec3(0.24, 0.27, 0.34), uDusk), skyBase(vec3(rd.x, 0.0, rd.z)), 0.55);
  c = mix(c, hc, hill);
  return c;
}

// ---------------- land ----------------
float riverD(vec2 xz) {
  float z = xz.y;
  float sp = sqrt(sat(1.0 - (z / 108.0) * (z / 108.0)));
  float w = 6.0 * sin(z * 0.023 + 1.0) + 2.5 * sin(z * 0.061);
  float a = abs(xz.x - (60.0 * sp + w)), b = abs(xz.x - (-58.0 * sp + w));
  return min(a, b);
}
float poolD(vec2 xz) {
  vec2 d = (xz - POOL) * vec2(1.0, 1.3);
  return length(d) + 0.7 * (vnoise(xz * 0.7) - 0.5) - POOL_R;
}
float forestMask(vec2 xz) {
  float r = length(xz * vec2(1.0, 0.85));
  return smoothstep(88.0, 104.0, r + 14.0 * (vnoise(xz * 0.02) - 0.5)) * smoothstep(9.0, 34.0, riverD(xz)) * smoothstep(-40.0, 10.0, xz.y + 0.25 * abs(xz.x));
}
// tree crowns of the woods and orchards: domes on a jittered grid
float crowns(vec2 xz) {
  vec2 g = xz / 7.0, i = floor(g), f = fract(g);
  float h = 0.0;
  for (int y = -1; y <= 1; y++) for (int x = -1; x <= 1; x++) {
    vec2 o = vec2(x, y), c = o + 0.1 + 0.8 * hash22(i + o);
    float r = 0.55 + 0.35 * hash12(i + o + 3.0);
    float d = length(f - c) / r;
    float top = 4.5 + 4.5 * hash12(i + o + 7.0);
    h = max(h, top * pow(max(1.0 - d * d, 0.0), 0.45));
  }
  // leafy, broken outline
  return h > 0.3 ? h + 1.3 * (vnoise(xz * 0.7) - 0.5) + 0.7 * (vnoise(xz * 2.1) - 0.5) : h;
}
float terrBase(vec2 xz) {
  float r = length(xz);
  float h = 7.0 * exp(-r * r / (2.0 * 36.0 * 36.0));
  h += (fbm(xz * 0.011, 3) - 0.5) * 6.0 * smoothstep(14.0, 50.0, r);
  h += (vnoise(xz * 0.09) - 0.5) * 0.45 * smoothstep(9.0, 22.0, r);
  float rv = riverD(xz);
  h = mix(WR - 0.9, h, smoothstep(4.5, 17.0, rv));
  h = mix(h, max(h, WR + 0.25), smoothstep(5.5, 7.5, rv) * smoothstep(9.0, 7.5, rv) * 0.0);
  // the pool: a still bowl with a soft lip
  if (dot(xz - POOL, xz - POOL) > 100.0) return h;
  float pd = poolD(xz);
  h = mix(h, max(h, WP + 0.12), smoothstep(3.5, 1.0, pd));
  h = mix(WP - 0.7 - 0.3 * smoothstep(0.0, -3.0, pd), h, smoothstep(-0.3, 0.8, pd));
  return h;
}
float terrH(vec2 xz) {
  float h = terrBase(xz);
  float m = forestMask(xz);
  if (m > 0.0) h += m * crowns(xz);
  return h;
}
vec3 terrN(vec2 xz, float t) {
  float e = 0.02 + t * 0.002, h = terrH(xz);
  return normalize(vec3(h - terrH(xz + vec2(e, 0)), e, h - terrH(xz + vec2(0, e))));
}
float gCoarse = 0.0;   // 1: a quick, rough march (reflections)
float terrMarch(vec3 ro, vec3 rd, float tmax) {
  float t = 0.02;
  tmax = min(tmax, 900.0);
  int n = gCoarse > 0.5 ? 56 : 200;
  for (int i = 0; i < 200; i++) {
    if (i >= n) break;
    vec3 p = ro + rd * t;
    if (p.y > 22.0 && rd.y >= 0.0) return -1.0;
    float fm = forestMask(p.xz);
    float h = p.y - terrBase(p.xz) - (fm > 0.0 ? fm * crowns(p.xz) : 0.0);
    if (h < 0.0012 * t) return t;
    t += max(h * (fm > 0.0 ? 0.45 : 0.8), gCoarse > 0.5 ? 0.3 + 0.02 * t : 0.004 + 0.0015 * t);
    if (t > tmax) break;
  }
  return -1.0;
}
float terrShadow(vec3 p, vec3 L) {
  float s = 1.0, t = 0.5;
  for (int i = 0; i < 14; i++) {
    vec3 q = p + L * t;
    if (q.y > 16.0) break;
    float h = q.y - terrBase(q.xz);
    s = min(s, sat(8.0 * h / t));
    if (s < 0.01) break;
    t += max(h * 0.7, 0.8 + t * 0.15);
  }
  return s;
}

// the passing cloud (s09): a soft edge sweeping across the hill
float cloudShadow(vec3 p) {
  float edge = p.x * 0.8 + p.z * 0.6 - uCloudX + 6.0 * (vnoise(p.xz * 0.04 + uTime * 0.05) - 0.5);
  return 1.0 - uCloudSh * smoothstep(-6.0, 6.0, edge);
}

// light colours
// after sunset a dim cold light still comes from the west (the sun's direction)
vec3 sunC() { return uSunCol * (1.0 - uDusk) + vec3(0.5, 0.6, 0.85) * uDusk; }
vec3 skyAmb() { return mix(vec3(0.42, 0.47, 0.6), vec3(0.11, 0.14, 0.21), uDusk); }
vec3 gndAmb() { return mix(vec3(0.22, 0.18, 0.08), vec3(0.04, 0.045, 0.05), uDusk); }

vec3 atmos(vec3 c, vec3 rd, float t) {
  float k = 1.0 - exp(-t * 0.0008 * uHaze);
  float s = pow(max(dot(rd, SUN), 0.0), 5.0);
  vec3 hz = mix(mix(vec3(0.95, 0.72, 0.46), vec3(0.28, 0.31, 0.38), uDusk), mix(vec3(1.3, 0.85, 0.45), vec3(0.42, 0.36, 0.4), uDusk), s);
  return mix(c, hz, k);
}

// the meadow: gold-green grass, wildflowers, bare earth near water
vec3 groundAlb(vec3 p, out float flower) {
  vec2 xz = p.xz;
  float cl = fbm(xz * 0.35, 4);
  float big = fbm(xz * 0.045 + 2.0, 4);
  float dry = smoothstep(0.48, 0.8, fbm(xz * 0.07 + 4.0, 3));
  vec3 g = mix(vec3(0.04, 0.062, 0.016), vec3(0.14, 0.15, 0.045), cl);
  g *= 0.7 + 0.6 * big;
  g = mix(g, vec3(0.30, 0.25, 0.10), dry * 0.6);
  g = mix(g, vec3(0.03, 0.055, 0.02), smoothstep(0.6, 0.75, fbm(xz * 0.5 + 13.0, 3)) * 0.5);
  vec2 fc7 = floor(xz * 6.0), ff = fract(xz * 6.0) - 0.5;
  vec2 fo = (hash22(fc7) - 0.5) * 0.6;
  float fl = step(0.84, hash12(fc7)) * smoothstep(0.17, 0.08, length(ff - fo)) * smoothstep(0.5, 0.72, fbm(xz * 0.2 + 9.0, 3));
  flower = fl;
  vec3 fc = mix(vec3(0.85, 0.82, 0.7), vec3(0.85, 0.6, 0.08), hash12(fc7 + 2.0));
  g = mix(g, fc * 0.6, fl * 0.7);
  // fine grain of the sward, running with the slope
  g *= 0.82 + 0.36 * vnoise(xz * vec2(9.0, 3.0) + vnoise(xz * 1.3) * 2.0);
  // mud and stones at the water's edge
  float wet = max(smoothstep(8.0, 5.0, riverD(xz)), smoothstep(1.2, 0.0, poolD(xz)));
  g = mix(g, vec3(0.07, 0.06, 0.045), wet);
  return g;
}
vec3 shadeGround(vec3 p, vec3 rd, float t) {
  vec3 n = terrN(p.xz, t);
  float fm = forestMask(p.xz);
  float isWood = fm * smoothstep(0.5, 2.0, p.y - terrBase(p.xz));
  float flower;
  vec3 alb = groundAlb(p, flower);
  // detail normal: grass tufts
  vec2 dn = vec2(fbm(p.xz * 2.0, 3), fbm(p.xz * 2.0 + 7.0, 3)) - 0.5;
  n = normalize(n + vec3(dn.x, 0.0, dn.y) * 0.18 * exp(-t * 0.02));
  // wind running through the meadow: a moving sheen
  float gust = fbm(p.xz * vec2(0.05, 0.08) - vec2(uTime * 0.35, uTime * 0.2) * (1.0 + 3.0 * uTreeWind), 3);
  alb *= mix(1.0, 0.8 + 0.5 * smoothstep(0.4, 0.7, gust), 1.0 - isWood);
  // reeds and rushes along the banks
  float reed = smoothstep(9.5, 6.5, riverD(p.xz)) * smoothstep(5.0, 6.2, riverD(p.xz));
  alb = mix(alb, vec3(0.06, 0.07, 0.025) * (0.6 + 0.8 * vnoise(p.xz * 3.0)), reed * 0.8);
  vec3 woodC = mix(vec3(0.02, 0.035, 0.014), vec3(0.06, 0.08, 0.026), vnoise(p * 1.3)) * (0.6 + 0.6 * vnoise(p.xz * 0.15));
  alb = mix(alb, woodC, isWood);
  vec3 L = SUN;
  float sh = 1.0;
  sh = treeShadow(p + n * 0.05, L) * terrShadow(p + n * 0.1, L) * cloudShadow(p);
  float ndl = sat(dot(n, L));
  vec3 c = alb * sunC() * ndl * sh;
  // grass glows a little where the light comes through it
  c += alb * vec3(0.6, 0.8, 0.2) * sunC() * pow(sat(dot(rd, L)), 3.0) * 0.25 * sh * (1.0 - isWood);
  float ao = 1.0;
  // the crown's shade under the tree is deep but not black
  vec2 tq = p.xz - uTreePos.xz;
  ao *= mix(0.45, 1.0, smoothstep(6.0, 17.0, length(tq)));
  ao *= mix(1.0, 0.6, isWood * (1.0 - sat((p.y - terrBase(p.xz)) / 7.0)));
  c += alb * (skyAmb() * (0.6 + 0.4 * n.y) + gndAmb() * 0.25) * ao;
  return c;
}

// grass blades near the camera: a slab above the ground, stepped
#define GH (0.42 * uGrassH)
float gGround = 0.0;   // ground height under the current grass sample (set by grassTrace)
float bladeAt(vec3 p, out float hk, out float side) {
  const float S = 0.045;
  vec2 c0 = floor(p.xz / S - 0.5);
  float best = 1e3; hk = 0.0; side = 0.0;
  for (int j = 0; j <= 1; j++) for (int i = 0; i <= 1; i++) {
    vec2 c = c0 + vec2(i, j);
    vec2 base = (c + hash22(c)) * S;
    float clump = vnoise(c * 0.09);
    float hgt = GH * (0.25 + 0.75 * hash12(c + 5.0)) * (0.45 + 0.8 * clump);
    float y = (p.y - gGround) / hgt;
    if (y < 0.0 || y > 1.0) continue;
    float ang = hash12(c + 9.0) * 6.283;
    vec2 lean = vec2(cos(ang), sin(ang)) * (0.04 + 0.1 * hash12(c + 4.0)) * hgt / GH;
    float w = sin(uTime * 2.1 + base.x * 1.5 + base.y * 0.9) * 0.025 + sin(uTime * 3.7 + base.x * 3.0) * 0.008;
    lean += vec2(0.8, 0.6) * w * (1.0 + 4.0 * uTreeWind);
    vec2 bp = base + lean * y * y;
    float wd = (0.0025 + 0.003 * hash12(c + 6.0)) * pow(1.0 - y, 0.7);
    float d = length(p.xz - bp) - wd;
    if (d < best) { best = d; hk = y; side = hash12(c + 2.0); }
  }
  return best;
}
// returns t of the first blade (or -1), with its height fraction
float grassTrace(vec3 ro, vec3 rd, float tEnd, float jit, out float hk, out float side) {
  hk = 0.0; side = 0.0;
  float tFar = min(tEnd, uGrassFar);
  float t = 0.45;
  // the ground under the ray, sampled every metre and interpolated
  float ta = t, tb = t + 1.0;
  float ha = terrBase((ro + rd * ta).xz), hb = terrBase((ro + rd * tb).xz);
  for (int i = 0; i < 260; i++) {
    if (t > tFar) return -1.0;
    vec3 p = ro + rd * t;
    if (t > tb) { ta = tb; ha = hb; tb = ta + 1.0; hb = terrBase((ro + rd * tb).xz); }
    gGround = mix(ha, hb, (t - ta) / (tb - ta));
    float above = p.y - gGround - GH;
    if (above > 0.02) { t += max(above * 0.8 / max(-rd.y, 0.05), 0.01) ; if (rd.y >= 0.0 && above > 0.02) return -1.0; continue; }
    float d = bladeAt(p, hk, side);
    if (d < 0.0) return t;
    t += clamp(d * 0.9, 0.0015, 0.008 + 0.008 * t) * (0.8 + 0.4 * jit);
  }
  return -1.0;
}
vec3 shadeBlade(vec3 p, vec3 rd, float hk, float side) {
  vec3 L = SUN;
  float fl_; vec3 galb = groundAlb(vec3(p.x, 0.0, p.z), fl_);
  vec3 alb = mix(galb * 1.1, mix(vec3(0.16, 0.2, 0.05), vec3(0.3, 0.27, 0.11), fract(side * 7.0)), smoothstep(0.0, 0.6, hk));
  alb = mix(alb, vec3(0.32, 0.27, 0.12), step(0.8, side) * hk);
  alb *= mix(1.0, 0.7 + 0.6 * fract(side * 13.0), smoothstep(0.0, 0.5, hk));
  float sh = 1.0;
  vec3 gp = vec3(p.x, terrBase(p.xz), p.z);
  vec3 gn = terrN(p.xz, 1.0);
  sh = treeShadow(p, L) * cloudShadow(p) * terrShadow(gp + gn * 0.1, L);
  float face = mix(1.0, 0.35 + 0.65 * abs(sin(side * 40.0)), smoothstep(0.0, 0.5, hk));
  // a blade is lit like the slope it grows on, a little more at its tip
  float ndl = sat(dot(gn, L) + 0.25 * hk);
  vec3 c = alb * sunC() * face * ndl * sh;
  c += vec3(0.25, 0.35, 0.06) * sunC() * pow(sat(dot(rd, L)), 2.5) * 0.25 * hk * sh;     // backlit blades glow
  c += alb * (skyAmb() * (0.6 + 0.4 * hk) + gndAmb() * 0.25);
  return c;
}
// water: the river and the pool
vec2 ripples(vec2 xz) {
  vec2 g = vec2(0.0);
  float age = uTime - uDrop.z;
  if (age > 0.0 && age < 6.0) {
    vec2 d = xz - uDrop.xy; float r = length(d) + 1e-4;
    for (int k = 0; k < 3; k++) {
      float c = 0.55 + 0.25 * float(k);
      float ph = (r - age * c) * (26.0 - 6.0 * float(k));
      float env = exp(-pow((r - age * c) * 4.0, 2.0)) * exp(-age * 0.45) / (1.0 + r * 1.5);
      g += d / r * cos(ph) * env * (0.5 - 0.12 * float(k));
    }
  }
  return g;
}
vec3 waterN(vec3 p, bool pool) {
  vec2 xz = p.xz;
  vec2 g;
  if (pool) {
    g = vec2(vnoise(xz * 2.0 + uTime * 0.05), vnoise(xz * 2.0 - uTime * 0.04 + 5.0)) - 0.5;
    g *= 0.008;
    g += ripples(xz);
  } else {
    vec2 fl = vec2(0.0, -uTime * 0.6);
    g = vec2(0.0);
    for (int k = 0; k < 4; k++) {
      float fk = float(k);
      vec2 dir = vec2(sin(fk * 2.4 + 0.3), cos(fk * 2.4 + 0.3));
      float fq = 1.3 * pow(1.9, fk);
      g += dir * cos(dot(xz, dir) * fq * 2.0 - uTime * (1.6 + fk * 0.9) + fk * 1.7) * 0.0045 / (1.0 + fk * 0.4);
    }
  }
  return normalize(vec3(-g.x, 1.0, -g.y));
}

// the whole scene without water (for reflections and as the base)
float gTMax = 1e4;   // landSky stops looking beyond this (e.g. a water surface in front)
vec3 landSky(vec3 ro, vec3 rd, float jit, bool cheap, out float depth) {
  int id;
  gCoarse = cheap ? 1.0 : 0.0;
  gLeafStep = cheap ? 2.4 : 1.35;
  gCheapShade = cheap ? 1.0 : 0.0;
  float tm = gTMax; gTMax = 1e4;
  float tt = treeTrace(ro, rd, min(600.0, tm), jit, id);
  float tg = terrMarch(ro, rd, tt > 0.0 ? tt : min(3000.0, tm));
  if (tm < 1e4 && tt < 0.0 && tg < 0.0) { depth = tm; return vec3(0.0); }
  vec3 L = SUN;
  vec3 col;
  if (tg > 0.0 && (tt < 0.0 || tg < tt)) {
    vec3 p = ro + rd * tg;
    if (cheap) {
      // reflections: the land's colour and light without its shadows
      float fl; vec3 alb = groundAlb(p, fl);
      float fm = forestMask(p.xz);
      alb = mix(alb, vec3(0.03, 0.05, 0.02), fm * smoothstep(0.5, 2.0, p.y - terrBase(p.xz)));
      vec3 n = terrN(p.xz, tg * 4.0);
      col = alb * (sunC() * sat(dot(n, L)) * 0.8 + skyAmb());
    } else
    col = shadeGround(p, rd, tg);
    depth = tg;
  } else if (tt > 0.0) {
    vec3 p = ro + rd * tt;
    col = treeShade(p, rd, id, L, sunC() * (uDusk < 0.99 ? cloudShadow(p) : 1.0), skyAmb(), gndAmb());
    gCheapShade = 0.0;
    depth = tt;
  } else {
    depth = 1e4;
    return sky(rd);
  }
  return atmos(col, rd, depth);
}

vec3 gardenScene(vec3 ro, vec3 rd, float jit, out float depth) {
  // water planes
  float tw = -1.0; bool pool = false;
  float tpl = (WP - ro.y) / rd.y;
  if (tpl > 0.0) { vec3 q = ro + rd * tpl; if (poolD(q.xz) < 0.4 && terrBase(q.xz) < WP) { tw = tpl; pool = true; } }
  float trv = (WR - ro.y) / rd.y;
  if (trv > 0.0 && (tw < 0.0 || trv < tw)) { vec3 q = ro + rd * trv; if (riverD(q.xz) < 12.0 && terrBase(q.xz) < WR) { tw = trv; pool = false; } }

  float d0;
  if (tw > 0.0) gTMax = tw + 0.05;
  vec3 col = landSky(ro, rd, jit, false, d0);
  depth = d0;
  // grass blades in front of whatever we hit
  if (uGrass > 0.5) {
    float hk, side;
    float tb = grassTrace(ro, rd, min(depth, tw > 0.0 ? tw : 1e4), jit, hk, side);
    if (tb > 0.0) {
      vec3 p = ro + rd * tb;
      vec3 bc = shadeBlade(p, rd, hk, side);
      float fz = smoothstep(uGrassFar * 0.55, uGrassFar, tb);
      if (fz > 0.0) bc = mix(bc, shadeGround(vec3(p.x, terrBase(p.xz), p.z), rd, tb), fz);
      col = atmos(bc, rd, tb); depth = tb; return col;
    }
  }
  if (tw > 0.0 && tw < depth) {
    vec3 p = ro + rd * tw;
    vec3 n = waterN(p, pool);
    n = normalize(mix(vec3(0.0, 1.0, 0.0), n, exp(-tw * (pool ? 0.0 : 0.012))));
    vec3 rr = reflect(rd, n); rr.y = abs(rr.y);
    float fr = 0.02 + 0.98 * pow(1.0 - sat(dot(-rd, n)), 5.0);
    vec3 rc;
    if (uReflQ > 0.5 && pool) { float dd; rc = landSky(p + n * 0.02, rr, jit, true, dd); }
    else if (!pool) { rc = sky(rr); float dd; if (uReflQ > 0.5) rc = landSky(p + n * 0.02, rr, jit, true, dd); }
    else rc = sky(rr);
    float wdepth = max(0.0, (pool ? WP : WR) - terrBase(p.xz));
    vec3 body = mix(vec3(0.05, 0.05, 0.03), vec3(0.012, 0.02, 0.018), sat(wdepth * 1.5)) * (skyAmb() + sunC() * 0.05);
    col = mix(body, rc, pool ? max(fr, 0.55) : fr);
    // sun glitter on the river
    if (!pool) col += sunC() * pow(sat(dot(rr, SUN)), 400.0) * 2.0;
    col = atmos(col, rd, tw);
    depth = tw;
  }
  return col;
}

// thin lens: every sub-frame takes a point on the aperture and aims at the focus plane
vec3 lensRay(vec2 fc, float focus, float aper, out vec3 ro) {
  vec3 rd0 = camRay(fc, ro);
  vec3 ww = normalize(uCamTarget - uCamPos);
  vec3 up = vec3(sin(uCamRoll), cos(uCamRoll), 0.0);
  vec3 uu = normalize(cross(ww, up)), vv = cross(uu, ww);
  vec3 fp = ro + rd0 * (focus / dot(rd0, ww));
  vec2 j = vec2(hash12(uJitter * 917.0 + 3.1), hash12(uJitter * 613.0 + 7.7));
  float r = sqrt(j.x), th = 6.2831853 * j.y;
  ro += (uu * cos(th) + vv * sin(th)) * r * aper;
  return normalize(fp - ro);
}
`;

// The ground's height in JavaScript (the same functions as terrBase), for placing cameras near it.
const fr = (x) => x - Math.floor(x);
const sat1 = (x) => Math.min(1, Math.max(0, x));
const sstep = (a, b, x) => { const t = sat1((x - a) / (b - a)); return t * t * (3 - 2 * t); };
const f32 = Math.fround;
function hash12(x, y) {
  let a = fr(f32(x * 0.1031)), b = fr(f32(y * 0.1031)), c = fr(f32(x * 0.1031));
  const d = a * (b + 33.33) + b * (c + 33.33) + c * (a + 33.33);
  a += d; b += d; c += d;
  return fr((a + b) * c);
}
function vnoise(x, y) {
  const ix = Math.floor(x), iy = Math.floor(y), fx = x - ix, fy = y - iy;
  const ux = fx * fx * fx * (fx * (fx * 6 - 15) + 10), uy = fy * fy * fy * (fy * (fy * 6 - 15) + 10);
  const a = hash12(ix, iy), b = hash12(ix + 1, iy), c = hash12(ix, iy + 1), d = hash12(ix + 1, iy + 1);
  return (a + (b - a) * ux) + ((c + (d - c) * ux) - (a + (b - a) * ux)) * uy;
}
function fbm(x, y, oct) {
  let s = 0, a = 0.5;
  for (let i = 0; i < oct; i++) { s += a * vnoise(x, y); const nx = 0.8 * x + 0.6 * y, ny = -0.6 * x + 0.8 * y; x = nx * 2.03; y = ny * 2.03; a *= 0.5; }
  return s;
}
function riverDJS(x, z) {
  const sp = Math.sqrt(sat1(1 - (z / 108) * (z / 108)));
  const w = 6 * Math.sin(z * 0.023 + 1) + 2.5 * Math.sin(z * 0.061);
  return Math.min(Math.abs(x - (60 * sp + w)), Math.abs(x - (-58 * sp + w)));
}
export function terrBaseJS(x, z) {
  const r = Math.hypot(x, z);
  let h = 7 * Math.exp(-r * r / (2 * 36 * 36));
  h += (fbm(x * 0.011, z * 0.011, 4) - 0.5) * 6 * sstep(14, 50, r);
  h += (vnoise(x * 0.09, z * 0.09) - 0.5) * 0.45 * sstep(9, 22, r);
  const rv = riverDJS(x, z);
  h = -1.9 + (h + 1.9) * sstep(4.5, 17, rv);
  return h;   // (the pool's bowl is left out)
}
