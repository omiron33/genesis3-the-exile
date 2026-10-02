// s48's world: dusk on a grassy rise, the sun just gone behind far hills. Two people stand close
// together, seen from behind, dark against the afterglow and rimmed in its warm light: no faces, only
// shapes. A warm light with no source gathers round them. On "and clothed them" a soft garment of
// skin (supple leather, a fur edge) comes down from above as if laid by an unseen hand and settles
// round the shoulders of the man. Figures stand at the origin facing +z (toward the afterglow);
// units metres. uGarm: 0 high above .. 1 settled; uMercy: the sourceless warm light, 0..1.
export const GARMENT_UNIFORMS = { uGarm: 0.0, uGarm2: 0.0, uMercy: 0.0 };

export const GARMENT_GLSL = /* glsl */ `
uniform float uGarm, uGarm2, uMercy;
const vec3 AFTER = vec3(1.0, 0.52, 0.24);     // the afterglow
const vec3 LBACK = normalize(vec3(-0.15, 0.12, 1.0));   // where the glow comes from (behind them)
const vec3 MAN = vec3(0.0, 0.0, 0.0), WOMAN = vec3(-0.46, 0.0, 0.1);

float groundH(vec2 xz) {
  return -0.02 * xz.y - 0.004 * xz.y * xz.y * step(0.0, xz.y) + 0.06 * (fbm(xz * 0.5, 3) - 0.5);
}

// a standing person, seen as a shape only. s scales, bow tilts the head forward, tilt leans it
// sideways, hair adds long hair; side (+1/-1) picks the arm that reaches for the other's hand, whose
// hand ends at reach (local, unscaled).
float person(vec3 p, float s, float bow, float tilt, float hair, float side, vec3 reach) {
  p /= s;
  // the head, bowed and leaning
  vec3 hp = p - vec3(0.0, 1.5, 0.0);
  hp.yz = rot(-0.18 * bow) * hp.yz; hp.xy = rot(tilt) * hp.xy;
  float d = sdEllipsoid(hp - vec3(0.0, 0.115, 0.0), vec3(0.083, 0.108, 0.098));
  // hair: a soft, uneven outline over the crown of the head, never a bare scalp
  float hc = sdEllipsoid(hp - vec3(0.0, 0.135, -0.012), vec3(0.096, 0.11, 0.108));
  hc += 0.01 * (vnoise(hp.xy * 45.0 + hp.z * 30.0 + uTime * 0.2) - 0.5);
  d = smin(d, max(hc, 0.06 - hp.y), 0.02);
  d = smin(d, sdCapsule(hp, vec3(0.0, -0.06, -0.01), vec3(0.0, 0.05, 0.0), 0.046), 0.035);       // neck
  // torso: broad at the chest, narrowing to the waist
  // breathing: the chest rises and falls a little
  float br = 1.0 + 0.012 * sin(uTime * 1.6 + s * 9.0);
  vec3 tq = (p - vec3(0.0, 1.2, 0.0)) * vec3(1.0 / br, 1.0, 1.55 / br) + vec3(0.0, 1.2, 0.0);
  d = smin(d, sdRoundCone(tq, vec3(0.0, 1.06, 0.0), vec3(0.0, 1.3, -0.01), 0.125, 0.165), 0.05);
  d = smin(d, sdCapsule(p, vec3(-0.15, 1.405, -0.01), vec3(0.15, 1.405, -0.01), 0.052), 0.06);     // shoulders
  d = smin(d, sdEllipsoid(p - vec3(0.0, 0.94, -0.005), vec3(0.155, 0.12, 0.1)), 0.06);             // hips
  // arms: the outer one hangs, the inner one reaches for the other's hand
  for (int k = 0; k < 2; k++) {
    float sg = k == 0 ? 1.0 : -1.0;
    vec3 sh = vec3(0.185 * sg, 1.39, -0.01);
    vec3 el = vec3(0.225 * sg, 1.12, -0.035);
    vec3 wr = vec3(0.235 * sg, 0.87, 0.03);
    if (sg == side) { el = mix(el, vec3(0.24 * sg, 1.12, 0.0), 0.5); wr = reach; }
    d = smin(d, sdRoundCone(p, sh, el, 0.047, 0.037), 0.03);
    d = smin(d, sdRoundCone(p, el, wr, 0.037, 0.027), 0.015);
    vec3 hd = wr + normalize(wr - el) * 0.06;
    d = smin(d, sdCapsule(p, wr, hd, 0.026), 0.015);
  }
  // legs with knees, calves and feet, a little apart
  vec3 q = vec3(abs(p.x), p.y, p.z);
  d = smin(d, sdRoundCone(q, vec3(0.088, 0.9, 0.0), vec3(0.105, 0.5, 0.01), 0.074, 0.048), 0.04);
  d = smin(d, sdRoundCone(q, vec3(0.105, 0.5, 0.01), vec3(0.11, 0.08, -0.01), 0.046, 0.03), 0.02);
  if (hair > 0.0) {
    vec3 hq = hp - vec3(0.0, 0.07, -0.05);
    float hr = sdEllipsoid(hq, vec3(0.1, 0.13, 0.1));
    hr = smin(hr, sdRoundCone(p, vec3(0.0, 1.55, -0.07), vec3(0.0, 1.12, -0.09), 0.1, 0.07), 0.05);  // down the back
    hr += 0.006 * (vnoise(vec2(p.x * 60.0, p.y * 12.0 + uTime * 0.6)) - 0.5);
    d = smin(d, hr, 0.03);
  }
  return d * s;
}
float manSD(vec3 p) { return person(p - MAN, 1.0, 1.0, 0.06, 0.0, -1.0, vec3(-0.25, 0.86, 0.07)); }
float womanSD(vec3 p) {
  vec3 q = p - WOMAN;
  // she leans a little toward him, her head toward his shoulder
  q.xy = rot(0.03) * q.xy;
  return person(q, 0.93, 0.8, -0.2, 1.0, 1.0, vec3(0.2, 0.9, 0.075));
}
// the garment: a mantle conforming to the man's shoulders and back, its hem uneven, coming down from
// above while it rocks a little, settling with a soft give
float garmentSD(vec3 p0, vec3 at, float sc, float lean, float k, out float fur) {
  float drop = 2.6 * (1.0 - k) * (1.0 - k);
  vec3 p = p0 - at; p.xy = rot(lean) * p.xy; p /= sc;
  vec3 q = p - vec3(0.0, drop, 0.0);
  // a gentle sway while it descends, a sigh of give as it lands
  float sway = (1.0 - k) * 0.12;
  q.y -= 1.15;
  q.xy = rot(sway * sin(uTime * 1.3)) * q.xy;
  q.yz = rot(0.08 * (1.0 - k) * sin(uTime * 1.1 + 1.0)) * q.yz;
  q.y += 1.15;
  // before landing it is a little wider and flatter (held open)
  vec3 qs = q * vec3(1.0 - 0.12 * (1.0 - k), 1.0 + 0.1 * (1.0 - k), 1.0);
  // the cloak: an elliptical drape round the body, narrow over the shoulders and flaring to the
  // hem, hanging in soft vertical folds
  float y = qs.y;
  float ty = sat((1.42 - y) / 1.2);
  vec2 r = mix(vec2(0.275, 0.16), vec2(0.36, 0.25), ty * ty);
  float shy = sat((y - 1.3) / 0.22);
  r.x *= mix(1.0, 0.42, pow(shy, 1.8));
  r.y *= mix(1.0, 0.6, pow(shy, 2.0));
  float ang = atan(qs.x, -(qs.z + 0.01));
  float fold = 1.0 + (0.03 + 0.1 * ty) * sin(ang * 7.0 + 1.6 * sin(ang * 3.0 + 1.0) + ty * 2.5) + 0.04 * ty * sin(ang * 13.0 + 2.0);
  vec2 e = vec2(qs.x, qs.z + 0.01) / (r * fold);
  float shell = abs((length(e) - 1.0) * min(r.x, r.y)) - 0.007;
  shell *= 0.8;
  float hem = 0.5 - 0.3 * smoothstep(-0.05, 0.12, -qs.z) + 0.06 * (vnoise(vec2(ang * 3.0, 1.0)) - 0.5);
  float top = q.y - 1.49;      // open at the neck
  float cut = max(hem - q.y, top);
  float d = max(shell, cut);
  fur = smoothstep(0.06, 0.0, abs(q.y - hem)) + smoothstep(0.05, 0.0, abs(q.y - 1.5));
  return d * sc;
}
float sceneSD(vec3 p, out int id, out float fur) {
  fur = 0.0;
  float bb = sdBox(p - vec3(-0.2, 2.0, 0.0), vec3(0.85, 2.2, 0.6));
  if (bb > 0.2) { id = 0; return bb; }
  float m = manSD(p), w = womanSD(p);
  float f1, f2;
  float g = garmentSD(p, MAN, 1.0, 0.0, uGarm, f1);
  float g2 = garmentSD(p, WOMAN, 0.93, 0.03, uGarm2, f2);
  float d = min(m, w); id = m < w ? 1 : 2;
  if (g < d) { d = g; id = 3; fur = f1; }
  if (g2 < d) { d = g2; id = 3; fur = f2; }
  return d;
}
vec3 sceneN(vec3 p) {
  vec2 e = vec2(0.0015, 0.0); int i; float f;
  return normalize(vec3(sceneSD(p + e.xyy, i, f) - sceneSD(p - e.xyy, i, f), sceneSD(p + e.yxy, i, f) - sceneSD(p - e.yxy, i, f), sceneSD(p + e.yyx, i, f) - sceneSD(p - e.yyx, i, f)));
}

vec3 duskSky(vec3 rd) {
  float y = rd.y;
  float az = atan(rd.x, rd.z);
  float g = exp(-az * az * 1.2);            // the glow is strongest where the sun went down
  vec3 zen = vec3(0.04, 0.06, 0.14), mid = vec3(0.2, 0.15, 0.22), hor = vec3(1.1, 0.5, 0.2);
  vec3 c = mix(mid, zen, smoothstep(0.05, 0.5, y));
  c = mix(hor * (0.35 + 0.9 * g), c, smoothstep(-0.02, 0.22, y));
  // long thin clouds lit from below
  vec2 uv = rd.xz / (rd.y + 0.08);
  float cl = smoothstep(0.52, 0.8, fbm(uv * vec2(0.25, 1.2) + vec2(uTime * 0.01, 0.0), 5)) * smoothstep(0.02, 0.15, y) * smoothstep(0.6, 0.2, y);
  c = mix(c, mix(vec3(0.25, 0.12, 0.14), vec3(1.2, 0.5, 0.3), g * smoothstep(0.35, 0.05, y)), cl * 0.7);
  return c;
}
// far hills: three ranges fading into the haze
vec3 hills(vec3 rd, vec3 c, out float hit) {
  hit = 0.0;
  float az = atan(rd.x, rd.z);
  for (int i = 0; i < 3; i++) {
    float fi = float(i);
    float ridge = 0.012 + 0.03 * fi * 0.5 + 0.03 * fbm(vec2(az * (2.0 + fi * 1.5) + fi * 7.0, fi), 4) - 0.015 * fi;
    if (rd.y < ridge) {
      float haze = 0.85 - 0.3 * fi;
      vec3 hc = mix(vec3(0.03, 0.03, 0.05), duskSky(vec3(rd.x, 0.01, rd.z)) * 0.8, haze);
      c = hc; hit = 1.0;
    }
  }
  return c;
}
`;

export const GARMENT_SCENE_GLSL = /* glsl */ `
vec3 garments(vec2 fc) {
  vec3 ro; vec3 rd = mRay(fc, ro);
  vec3 col = duskSky(rd);
  float hh; col = hills(rd, col, hh);
  float depth = 1e4;
  // ground: a grassy rise falling away in front of them
  if (rd.y < 0.02) {
    float t = 0.0, a = 0.0;
    for (int i = 0; i < 140; i++) {
      vec3 p = ro + rd * t;
      float d = p.y - groundH(p.xz);
      if (d < 0.002 * t) { a = 1.0; break; }
      t += max(d * 0.8, 0.02 + 0.006 * t);
      if (t > 200.0) break;
    }
    if (a > 0.0) {
      vec3 p = ro + rd * t;
      depth = t;
      float e = 0.02;
      vec3 n = normalize(vec3(groundH(p.xz) - groundH(p.xz + vec2(e, 0.0)), e, groundH(p.xz) - groundH(p.xz + vec2(0.0, e))));
      float blades = vnoise(vec2(p.x * 90.0, p.z * 9.0)) * vnoise(vec2(p.x * 40.0 + 3.0, p.z * 30.0));
      vec3 alb = mix(vec3(0.05, 0.06, 0.03), vec3(0.12, 0.11, 0.05), blades);
      vec3 gc = alb * vec3(0.12, 0.13, 0.22) * (0.6 + 0.4 * n.y);
      // grass tops catch the afterglow
      gc += AFTER * 0.4 * alb * pow(sat(dot(rd, LBACK)), 2.0) * blades * blades;
      // warm light gathering round their feet
      float r = length(p.xz - vec2(-0.2, 0.0));
      gc += vec3(1.0, 0.62, 0.32) * alb * uMercy * 1.6 * exp(-r * r * 0.8);
      col = mix(gc, col, 1.0 - exp(-t * 0.012));
    }
  }
  // the two of them and the garment
  float fh = 0.0;
  {
    float t = 0.0; int id = 0; float fur = 0.0; bool hit = false; float md = 1e3;
    for (int i = 0; i < 120; i++) {
      vec3 p = ro + rd * t;
      float d = sceneSD(p, id, fur);
      md = min(md, d);
      if (d < 0.0006) { hit = true; break; }
      t += d * 0.9;
      if (t > min(depth, 30.0)) break;
    }
    // the afterglow wrapping round their edges, softly
    if (!hit) col += AFTER * (0.5 + 0.5 * uMercy) * 0.18 * exp(-md / 0.03);
    if (hit && t < depth) {
      fh = 1.0;
      vec3 p = ro + rd * t, n = sceneN(p), v = -rd;
      float ndv = sat(dot(n, v));
      float lowk = smoothstep(0.02, 0.25, p.y);       // feet sit in the grass, not in the light
      // rim: the afterglow wraps round their outlines
      float rim = pow(1.0 - ndv, 3.5) * (0.35 + 0.65 * sat(dot(n, LBACK) + 0.4)) * lowk;
      vec3 skin = vec3(0.09, 0.055, 0.04);
      vec3 c;
      if (id == 3) {
        // supple hide, warm brown; fur along the edges, soft and bright where the light grazes
        float grain = fbm(p * 40.0, 3);
        vec3 alb = mix(vec3(0.16, 0.085, 0.04), vec3(0.36, 0.21, 0.1), smoothstep(0.3, 0.7, grain));
        alb = mix(alb, vec3(0.62, 0.5, 0.36), sat(fur));
        c = alb * vec3(0.06, 0.07, 0.12) * (0.6 + 0.4 * n.y);
        c += alb * AFTER * 2.4 * rim * (1.0 + 1.5 * fur);
        c += alb * vec3(1.0, 0.66, 0.36) * uMercy * (0.4 + 0.6 * sat(n.y + 0.2)) * 0.12;
        c += AFTER * 0.25 * fur * pow(1.0 - ndv, 1.5) * (0.6 + 0.4 * vnoise(p.xy * 400.0));
      } else {
        c = skin * vec3(0.05, 0.055, 0.09);
        c += skin * AFTER * 7.0 * rim;
        c += skin * vec3(1.0, 0.62, 0.35) * uMercy * 0.06 * (0.4 + 0.6 * sat(n.y + 0.3));
        c += skin * AFTER * 6.0 * rim * uMercy * 0.8;
      }
      col = c;
    }
  }
  // a soft warm haze of the same light round them (in the air between us and them)
  {
    vec3 c0 = vec3(-0.2, 1.2, 0.05);
    vec3 oc = c0 - ro; float tc = dot(oc, rd); float h2 = dot(oc, oc) - tc * tc;
    col += vec3(1.0, 0.62, 0.32) * uMercy * (0.06 * exp(-h2 * 0.5) + 0.03 * exp(-h2 * 0.08)) * (1.0 - 0.75 * fh);
  }
  return col;
}
`;
