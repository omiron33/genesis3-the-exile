// s44's macro: a single drop of sweat falls in slow motion onto the cracked dust and bursts. The drop
// is a clear spheroid (it wobbles as it falls) that refracts the white sky and the ground upside down;
// it throws a shadow with a bright caustic at its heart. On impact it flattens, a ring of backlit dust
// lifts, a few grains and beads are thrown in slow arcs, and the water soaks away into a dark patch.
// Impact point at the origin on the ground; uImpact is the song time it lands, uFall the fall speed.
export const SWEAT_UNIFORMS = { uImpact: 0, uFall: 0.035 };

export const SWEAT_GLSL = /* glsl */ `
uniform float uImpact, uFall;
const float DR = 0.0024;          // drop radius (m)
const float GRAV = 0.05;          // slow-motion gravity for the thrown grains
const vec3 WIND = vec3(0.006, 0.0, 0.0);
float mOcc(vec3 p) { return 1e3; }

float gY() { return dH0(vec2(0.0)); }
// the drop's centre and radii (horizontal, vertical); radii 0 once it has soaked away
void dropShape(float t, out vec3 c, out vec2 r) {
  float a = t - uImpact, gy = gY();
  if (a < 0.0) {
    float wob = 0.07 * sin(t * 17.0) * (0.6 + 0.4 * sin(t * 5.3));
    r = DR * vec2(1.0 - wob * 0.5, 1.0 + wob);
    c = vec3(0.0, gy + r.y + uFall * (-a), 0.0);
    return;
  }
  float k = 1.0 - exp(-a * 6.0) * cos(a * 16.0);              // flattens with a little ring
  float soak = smoothstep(0.25, 1.25, a);
  r = DR * vec2(1.0 + 1.0 * k, max(1.0 - 0.62 * k, 0.2)) * vec2(1.0 + 0.2 * soak, 1.0 - 0.75 * soak);
  c = vec3(0.0, gy + r.y * (0.45 - 1.1 * soak), 0.0);
  if (soak >= 1.0) r = vec2(0.0);
}
float hitEll(vec3 ro, vec3 rd, vec3 c, vec2 r, bool far, out vec3 n) {
  vec3 sc = vec3(1.0 / r.x, 1.0 / r.y, 1.0 / r.x);
  vec3 o = (ro - c) * sc, d = rd * sc; float dl = length(d); d /= dl;
  float b = dot(o, d), cc = dot(o, o) - 1.0, h = b * b - cc;
  if (h < 0.0) return -1.0;
  float t = (far ? (-b + sqrt(h)) : (-b - sqrt(h))) / dl;
  vec3 p = ro + rd * t;
  n = normalize((p - c) * sc * sc);
  return t;
}

// the wet patch the drop leaves (0..1) at a point on the ground
float wetAt(vec2 xz, float t) {
  float a = t - uImpact;
  if (a < 0.0) return 0.0;
  float ang = atan(xz.y, xz.x);
  float rw = DR * (1.1 + 2.2 * smoothstep(0.0, 1.4, a)) * (1.0 + 0.22 * (vnoise(vec2(ang * 3.0, 1.0)) - 0.5) + 0.1 * (vnoise(vec2(ang * 11.0, 4.0)) - 0.5));
  float d = length(xz) / rw;
  float wet = smoothstep(1.0, 0.82, d);
  return wet * smoothstep(0.0, 0.08, a);
}

// the ring of dust lifted by the impact
float puffDen(vec3 p, float t) {
  float a = t - uImpact;
  if (a <= 0.0) return 0.0;
  vec3 q = p - WIND * a; q.y -= gY();
  if (q.y < -0.001) return 0.0;
  float rr = length(q.xz);
  float R = DR * (1.2 + 3.6 * (1.0 - exp(-a * 1.5)));
  float H = DR * (0.35 + 1.6 * (1.0 - exp(-a * 1.2)));
  float sig = DR * (0.6 + 1.1 * a);
  float ring = exp(-pow((rr - R) / sig, 2.0)) * exp(-max(q.y, 0.0) / H);
  float n = fbm(q * 700.0 + vec3(0.0, -a * 2.0, a), 4);
  float amp = exp(-a * 0.8) * smoothstep(0.0, 0.05, a);
  return ring * smoothstep(0.35, 0.75, n) * amp * smoothstep(DR * 8.5, DR * 6.0, length(q)) * 900.0;
}

// one thrown grain (or bead): centre and radius at time t
vec4 grainAt(int i, float t) {
  float fi = float(i);
  float a = t - uImpact - 0.03 * hash11(fi * 1.7);
  if (a <= 0.0) return vec4(0.0, -1.0, 0.0, 0.0);
  float ph = 6.2831853 * (fi + 0.6 * hash11(fi * 3.1)) / 28.0;
  float el = 0.75 + 0.6 * hash11(fi * 5.9);
  float v = 0.012 + 0.022 * hash11(fi * 8.3);
  vec3 dir = vec3(cos(ph) * cos(el), sin(el), sin(ph) * cos(el));
  float tl = 2.0 * v * dir.y / GRAV;                    // landing time
  float aa = min(a, tl);
  vec3 c = vec3(0.0, gY(), 0.0) + dir * DR * 0.9 + v * dir * aa - vec3(0.0, 0.5 * GRAV * aa * aa, 0.0) + WIND * aa * 0.5;
  float r = 0.00012 + 0.00016 * hash11(fi * 2.2);
  return vec4(c, r);
}

vec3 envAt(vec3 ro, vec3 rd) {
  float t = dMarch(ro, rd, 2000.0);
  return t > 0.0 ? dGround(ro, rd, t, 0.0) : dSky(rd);
}

vec3 sweat(vec2 fc) {
  vec3 ro; vec3 rd = mRay(fc, ro);
  rd = dShimmer(rd);
  float tg = dMarch(ro, rd, 2000.0);
  vec3 col; float depth = 1e5;
  if (tg > 0.0) {
    depth = tg;
    col = dGround(ro, rd, tg, 0.0);
    vec3 p = ro + rd * tg;
    // the wet patch: darker, a little glossy while fresh
    float wet = wetAt(p.xz, uTime);
    float a = uTime - uImpact;
    col *= 1.0 - 0.62 * wet;
    vec3 n = dNormal(p.xz, tg);
    float F = 0.04 + 0.96 * pow(1.0 - sat(dot(n, -rd)), 5.0);
    col += dSky(reflect(rd, n)) * F * wet * (1.0 - smoothstep(0.4, 1.8, a)) * 0.8;
    // a rim of pale thrown dust round the patch
    float rim = wetAt(p.xz * 0.78, uTime) * (1.0 - wet);
    col *= 1.0 + 0.25 * rim * smoothstep(0.2, 0.7, vnoise(p.xz * 3000.0));
    // the drop's shadow, with the caustic it focuses at its heart
    vec3 dc; vec2 dr; dropShape(uTime, dc, dr);
    if (dr.x > 0.0) {
      vec3 oc = dc - p; float b = dot(oc, SUND);
      if (b > 0.0) {
        vec3 cl = oc - SUND * b; vec3 sc = vec3(1.0 / dr.x, 1.0 / dr.y, 1.0 / dr.x);
        float h = length(cl * sc);
        float shadow = smoothstep(1.0, 0.85, h);
        col *= 1.0 - 0.55 * shadow;
        col += uSunCol * uDustCol * 0.12 * exp(-h * h * 30.0) * shadow;
      }
    }
  } else col = dSky(rd);

  // thrown grains and beads
  for (int i = 0; i < 28; i++) {
    vec4 g = grainAt(i, uTime);
    if (g.w <= 0.0) continue;
    vec3 oc = ro - g.xyz; float b = dot(oc, rd), h = b * b - dot(oc, oc) + g.w * g.w;
    if (h < 0.0) continue;
    float t = -b - sqrt(h);
    if (t < 0.0 || t > depth) continue;
    vec3 n = normalize(ro + rd * t - g.xyz);
    bool bead = hash11(float(i) * 4.4) < 0.25;
    vec3 alb = bead ? vec3(0.3, 0.26, 0.2) : uDustCol * (0.8 + 0.4 * hash11(float(i) * 6.6));
    vec3 c = alb * uSunCol * sat(dot(n, SUND)) * 0.32 + alb * uSkyZen * 0.5;
    c += uSunCol * uDustCol * 0.35 * pow(sat(dot(rd, SUND)), 2.0) * smoothstep(0.45, 0.0, dot(n, -rd));   // backlit rim
    if (bead) c += uSunCol * 0.6 * pow(sat(dot(reflect(rd, n), SUND)), 300.0);
    col = c; depth = t;
  }

  // the drop
  vec3 dc; vec2 dr; dropShape(uTime, dc, dr);
  if (dr.x > 0.0) {
    vec3 n;
    float t = hitEll(ro, rd, dc, dr, false, n);
    if (t > 0.0 && t < depth) {
      vec3 p = ro + rd * t;
      float F = 0.02 + 0.98 * pow(1.0 - sat(dot(n, -rd)), 5.0);
      vec3 refl = dSky(reflect(rd, n));
      vec3 r1 = refract(rd, n, 1.0 / 1.333);
      vec3 n2; float t2 = hitEll(p + r1 * 1e-5, r1, dc, dr, true, n2);
      vec3 pe = p + r1 * max(t2, 0.0);
      vec3 r2 = refract(r1, -n2, 1.333);
      if (dot(r2, r2) < 0.5) r2 = reflect(r1, -n2);
      vec3 trans = envAt(pe + r2 * 1e-4, r2) * vec3(0.93, 0.97, 1.0);
      // where it has landed, the lower part sees dark wet dust
      if (uTime > uImpact) trans *= mix(0.45, 1.0, smoothstep(dc.y - dr.y * 0.2, dc.y + dr.y, pe.y));
      col = mix(trans, refl, F);
      col += uSunCol * 2.5 * pow(sat(dot(reflect(rd, n), SUND)), 1500.0);
      depth = t;
    }
  }

  // the backlit dust ring, marched through its bounds
  float a = uTime - uImpact;
  if (a > 0.0) {
    vec3 c0 = vec3(0.0, gY(), 0.0) + WIND * a;
    float Rb = DR * 9.0 + a * 0.004;
    vec3 oc = ro - c0; float b = dot(oc, rd), h = b * b - dot(oc, oc) + Rb * Rb;
    if (h > 0.0) {
      float t0 = max(-b - sqrt(h), 0.0), t1 = min(-b + sqrt(h), depth);
      if (t1 > t0) {
        const int NS = 22;
        float dt = (t1 - t0) / float(NS);
        float T = 1.0; vec3 acc = vec3(0.0);
        float ph = hgPhase(dot(rd, SUND), 0.55) * 4.0 * PI;
        float jit = hash12(fc + fract(uTime * 7.0) * 100.0);
        for (int i = 0; i < NS; i++) {
          vec3 q = ro + rd * (t0 + (float(i) + jit) * dt);
          float d = puffDen(q, uTime);
          if (d < 1e-3) continue;
          float tr = exp(-puffDen(q + SUND * DR * 1.5, uTime) * DR * 1.5);
          vec3 L = uSunCol * uDustCol * 0.22 * ph * tr + uSkyZen * uDustCol * 0.5;
          float st = exp(-d * dt);
          acc += T * (1.0 - st) * L;
          T *= st;
        }
        col = col * T + acc;
      }
    }
  }
  return col;
}
`;
