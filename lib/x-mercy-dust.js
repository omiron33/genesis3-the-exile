// The cursed earth (s44 to s46): a dry hardpan plain to the horizon under hard white heat. Plates of
// sun-cracked clay, drifts of loose dust in the cracks, fine grains when the camera is close, heat
// shimmer and a mirage on the horizon, low hazy hills far off. The ground is a heightfield round y = 0
// (metres). A scene supplies `float mOcc(vec3 p)`, the distance to anything standing on the plain
// (for the sun's shadow), and `float mOccAmb(vec3 p)` for contact darkening.
export const DUST_UNIFORMS = { uCrackScale: 1.0, uGrain: 0.0, uHaze: 0.004, uShimmer: 1.0, uDustCol: [0.66, 0.55, 0.42] };

export const DUST_GLSL = /* glsl */ `
uniform float uGrain, uHaze, uShimmer, uCrackScale;
uniform vec3 uDustCol;
float mOcc(vec3 p);

// the coarse ground the ray finds (gentle undulation, plate relief, grains when close)
float dH0(vec2 xz) {
  float h = 0.03 * fbm(xz * 0.3, 3) + 0.004 * vnoise(xz * 4.0);
  if (uGrain > 0.0) h += uGrain * (0.0007 * fbm(xz * 120.0, 3) + 0.00018 * vnoise(xz * 1100.0) + 0.0007 * smoothstep(0.8, 0.97, vnoise(xz * 300.0)));
  return h;
}
// distance (metres) to the nearest crack, and the plate it lies in
vec2 dCrack(vec2 xz0, bool fine) {
  vec2 xz = xz0 * uCrackScale;
  vec2 w = xz + (vec2(vnoise(xz * 2.1), vnoise(xz * 2.1 + 5.3)) - 0.5) * 0.18;
  vec2 v = voronoiEdge(w * 2.4);
  if (!fine) return vec2(v.x / 2.4 / uCrackScale, v.y);
  vec2 v2 = voronoiEdge(w * 9.0 + 3.7);
  return vec2(min(v.x / 2.4, v2.x / 9.0 + 0.004 * step(0.45, hash12(floor(w * 9.0)))) / uCrackScale, v.y);
}
// full detail: cracks cut into the plates, plate edges curl up a little
float dH(vec2 xz, float t) {
  float h = dH0(xz);
  vec2 c = dCrack(xz, false);
  float cs = 1.0 / uCrackScale;
  float w = (0.003 + 0.004 * vnoise(xz * 7.0 * uCrackScale)) * cs;
  float fill = smoothstep(0.5, 0.8, fbm(xz * 0.9 * uCrackScale + 3.1, 3));     // drifts of loose dust fill some cracks
  h += (smoothstep(0.05 * cs, 0.0, c.x) * 0.0025 - (1.0 - smoothstep(0.0, w, c.x)) * 0.01) * cs * (1.0 - fill) * exp(-t * 0.04);
  return h;
}

// find the ground: linear search between the slab's top and bottom, then bisection
float dMarch(vec3 ro, vec3 rd, float far) {
  if (rd.y >= -1e-4) return -1.0;
  float top = 0.045, bot = -0.03;
  float t0 = max((ro.y - top) / -rd.y, 0.0), t1 = min((ro.y - bot) / -rd.y, far);
  if (t0 > far) return -1.0;
  float a = t0, fa = ro.y + rd.y * a - dH0((ro + rd * a).xz);
  if (fa < 0.0) return a;
  const int N = 20;
  float dt = (t1 - t0) / float(N);
  // more care close to the camera: steps grow geometrically
  float b = a;
  for (int i = 1; i <= N; i++) {
    float x = float(i) / float(N);
    b = t0 + (t1 - t0) * x * x;
    float fb = ro.y + rd.y * b - dH0((ro + rd * b).xz);
    if (fb < 0.0) {
      for (int k = 0; k < 7; k++) {
        float m = 0.5 * (a + b);
        float fm = ro.y + rd.y * m - dH0((ro + rd * m).xz);
        if (fm < 0.0) b = m; else a = m;
      }
      return 0.5 * (a + b);
    }
    a = b;
  }
  return t1 < far ? t1 : -1.0;
}
vec3 dNormal(vec2 xz, float t) {
  float e = max(0.00025, t * 0.0012);
  float h = dH(xz, t);
  return normalize(vec3(h - dH(xz + vec2(e, 0.0), t), e, h - dH(xz + vec2(0.0, e), t)));
}

float mSoftShadow(vec3 p, vec3 l, float k) {
  float res = 1.0, t = 0.02;
  for (int i = 0; i < 28; i++) {
    float h = mOcc(p + l * t);
    res = min(res, k * h / t);
    t += clamp(h, 0.02, 0.25);
    if (res < 0.01 || t > 6.0) break;
  }
  return sat(res);
}

// far hills on the horizon, faint in the heat haze
vec3 dSky(vec3 rd) {
  vec3 c = mSky(rd);
  float az = atan(rd.x, rd.z);
  float ridge = 0.006 + 0.012 * fbm(vec2(az * 2.6, 1.3), 5) + 0.004 * fbm(vec2(az * 13.0, 4.0), 3);
  float hill = smoothstep(ridge + 0.0008, ridge - 0.0008, rd.y) * step(-0.002, rd.y);
  c = mix(c, mix(uSkyHor * vec3(0.78, 0.8, 0.86), c, 0.45), hill);
  return c;
}
vec3 dHaze(vec3 rd) {
  vec3 h = mSky(normalize(vec3(rd.x, 0.015, rd.z)));
  return h + uSunCol * 0.01 * pow(max(dot(rd, SUND), 0.0), 5.0);
}

// shade the ground hit at distance t. Returns linear radiance.
vec3 dGround(vec3 ro, vec3 rd, float t, float shadowOn) {
  vec3 p = ro + rd * t;
  vec2 xz = p.xz;
  vec3 n = dNormal(xz, t);
  vec2 c = dCrack(xz, true);
  float w = (0.003 + 0.004 * vnoise(xz * 7.0 * uCrackScale)) / uCrackScale;
  float fill = smoothstep(0.5, 0.8, fbm(xz * 0.9 * uCrackScale + 3.1, 3));
  float foot = t * 0.0009;                                       // a pixel's footprint
  float crack = (1.0 - smoothstep(0.0, w + foot, c.x)) * (1.0 - fill);
  crack *= sat(w / max(foot, 1e-5));                               // far cracks average out
  float tone = fbm(xz * 0.7 + c.y * 3.0, 3);
  vec3 alb = uDustCol * (0.82 + 0.3 * tone) * (0.92 + 0.16 * c.y);
  alb = mix(alb, uDustCol * vec3(1.12, 1.1, 1.08), fill * 0.6);  // pale loose dust
  if (uGrain > 0.0) {
    float g = hash12(floor(xz * 2500.0));
    alb *= 1.0 + uGrain * (g - 0.5) * 0.5 * exp(-t * 4.0);
  }
  alb = mix(alb, alb * vec3(0.3, 0.27, 0.25), crack);
  float ao = 1.0 - 0.75 * crack;
  float dif = sat(dot(n, SUND));
  float sh = shadowOn > 0.0 ? mSoftShadow(p + n * 0.003, SUND, 10.0) : 1.0;
  // the ground's own relief shadows itself (close up only)
  if (uGrain > 0.0 && t < 0.6) {
    float s2 = 1.0;
    for (int i = 1; i <= 6; i++) {
      float d = 0.0006 * float(i * i);
      vec3 q = p + SUND * d;
      s2 = min(s2, sat(1.0 + (q.y - dH0(q.xz)) * 2500.0 / float(i)));
    }
    sh *= mix(1.0, s2, smoothstep(0.6, 0.2, t));
  }
  vec3 col = alb * uSunCol * dif * sh * 0.32;
  col += alb * (uSkyZen * 0.55 * (0.5 + 0.5 * n.y) + uSkyHor * 0.12) * ao;
  // grains catch the light at grazing angles (backlit sheen)
  float bl = pow(sat(dot(rd, SUND)), 3.0);
  col += uSunCol * alb * 0.06 * bl * sh * (0.5 + 0.5 * vnoise(xz * 400.0)) * (1.0 - crack);
  // heat haze and dust in the air
  float fog = 1.0 - exp(-t * uHaze);
  col = mix(col, dHaze(rd), fog);
  // the mirage: far ground turns into a shimmering reflection of the sky
  float mir = smoothstep(-0.012, -0.0015, rd.y) * smoothstep(60.0, 400.0, t) * uShimmer;
  col = mix(col, dSky(vec3(rd.x, -rd.y * 0.6, rd.z)) * 0.92, mir * 0.75);
  return col;
}

// heat shimmer: bend rays that graze the far ground
vec3 dShimmer(vec3 rd) {
  float g = smoothstep(0.012, 0.0, abs(rd.y)) * uShimmer;
  if (g <= 0.0) return rd;
  float az = atan(rd.x, rd.z);
  float s = vnoise(vec2(az * 900.0, rd.y * 2500.0 - uTime * 9.0)) - 0.5;
  s += 0.5 * (vnoise(vec2(az * 2400.0 + 3.0, rd.y * 6000.0 - uTime * 17.0)) - 0.5);
  return normalize(rd + vec3(0.0, s * 0.0011 * g, 0.0));
}
`;
