// The garden canopy at dusk (scene 25), seen from above as the camera rises: a sea of crowns to
// the far haze, cold blue in the dusk. When He calls, a warm light comes up low on the horizon and
// floods across the treetops toward us, lighting the crowns' tops and leaving their hollows dark.
// Units: metres, the crowns about 9 m up. Include after SHAME_GLSL (it uses its lens and sky).
export const CANOPY_UNIFORMS = {
  uFlood: 0.0,          // 0 .. 1: how far the light has come across the canopy
  uFloodK: 0.0,         // the light's strength
  uLDir: [0.0, 0.08, 1.0], // direction toward the light (low on the horizon)
};

export const CANOPY_GLSL = /* glsl */ `
uniform float uFlood, uFloodK; uniform vec3 uLDir;

#define CC 7.0
float crownsH(vec2 p, float lod) {
  vec2 c0 = floor(p / CC);
  float h = 4.0;
  for (int j = -1; j <= 1; j++) for (int i = -1; i <= 1; i++) {
    vec2 c = c0 + vec2(i, j);
    vec2 cp = (c + 0.5 + (hash22(c * 1.7) - 0.5) * 0.7) * CC;
    float R = 3.4 + 2.4 * hash12(c * 3.1);
    float top = 7.5 + 4.0 * hash12(c * 5.3);
    float d = length(p - cp);
    float cap = top - R * 0.55 + sqrt(max(R * R - d * d, 0.0)) * 0.55;
    h = max(h, d < R ? cap : 4.0);
  }
  // clumps of leaves on the crowns; the finest only near the camera
  h += 1.6 * (fbm(p * 0.3, 3) - 0.5);
  h += 1.1 * (1.0 - abs(2.0 * fbm(p * 0.8 + 3.0, 3) - 1.0)) - 0.55;
  if (lod < 1.0) h += (1.0 - lod) * 0.6 * (fbm(p * 2.2, 3) - 0.5);
  if (lod < 0.4) h += (0.4 - lod) / 0.4 * 0.3 * (vnoise(p * 7.0) - 0.5);
  // a slow swell of wind over the treetops
  h += 0.08 * sin(p.x * 0.15 + uWT * 1.2) * sin(p.y * 0.12 - uWT);
  return h;
}
float canopyMarch(vec3 ro, vec3 rd, float far) {
  float t = 0.5;
  for (int i = 0; i < 180; i++) {
    vec3 p = ro + rd * t;
    float lod = clamp(t / 60.0, 0.0, 1.0);
    float d = p.y - crownsH(p.xz, lod);
    if (d < 0.004 * t) return t;
    t += max(d * 0.45, 0.02 + t * 0.002);
    if (t > far || p.y > 40.0 && rd.y > 0.0) break;
  }
  return -1.0;
}
vec3 canopyNormal(vec2 p, float lod) {
  float e = 0.05 + lod * 0.3;
  float h = crownsH(p, lod);
  return normalize(vec3(h - crownsH(p + vec2(e, 0.0), lod), e, h - crownsH(p + vec2(0.0, e), lod)));
}
float canopyShadow(vec3 p, vec3 L) {
  float res = 1.0, t = 0.3;
  for (int i = 0; i < 20; i++) {
    vec3 q = p + L * t;
    float d = q.y - crownsH(q.xz, 0.6);
    res = min(res, 8.0 * d / t);
    t += clamp(d, 0.3, 4.0);
    if (res < 0.01 || q.y > 16.0) break;
  }
  return sat(res);
}
vec3 canopySky(vec3 rd) {
  // dusk: deep blue overhead to a dim violet-grey at the horizon, a thin last warmth low down,
  // and, when He calls, the warm light low on the horizon with its glow in the air
  float y = rd.y;
  vec3 L = normalize(uLDir);
  float g = max(dot(rd, L), 0.0);
  vec3 s = mix(vec3(0.15, 0.14, 0.19), vec3(0.018, 0.032, 0.085), pow(smoothstep(-0.02, 0.5, y), 0.7));
  s += vec3(0.16, 0.08, 0.04) * exp(-max(y, 0.0) * 18.0) * (0.4 + 0.6 * pow(g, 2.0));
  s += vec3(1.5, 0.75, 0.3) * uFloodK * (pow(g, 10.0) * 0.12 + pow(g, 120.0) * 0.5 + pow(g, 3000.0) * 3.0) * smoothstep(-0.04, 0.04, y + 0.02);
  // long thin dusk clouds catching it
  vec2 uv = rd.xz / (max(y, 0.0) + 0.06);
  float cl = fbm(uv * vec2(0.06, 0.25) + vec2(uTime * 0.004, 0.0), 5);
  float dens = smoothstep(0.5, 0.75, cl) * smoothstep(0.01, 0.06, y) * smoothstep(0.45, 0.1, y);
  vec3 cc = mix(vec3(0.05, 0.05, 0.08), vec3(0.9, 0.45, 0.2) * uFloodK + vec3(0.12, 0.08, 0.09), pow(g, 3.0));
  s = mix(s, cc, dens * 0.8);
  vec3 q = rd * 300.0; vec3 id = floor(q);
  s += vec3(0.8, 0.86, 1.0) * smoothstep(0.998, 1.0, hash13(id)) * smoothstep(0.45, 0.0, length(fract(q) - 0.5)) * smoothstep(0.15, 0.4, y) * 0.6;
  return s;
}
vec3 canopyScene(vec3 ro, vec3 rd) {
  shSetup();
  vec3 L = normalize(uLDir);
  float t = canopyMarch(ro, rd, 700.0);
  vec3 c;
  float tt = t > 0.0 ? t : 1e4;
  if (t > 0.0) {
    vec3 p = ro + rd * t;
    float lod = clamp(t / 60.0, 0.0, 1.0);
    vec3 n = canopyNormal(p.xz, lod);
    float h = fbm(p.xz * 2.2, 3);
    vec3 alb = mix(vec3(0.03, 0.05, 0.025), vec3(0.09, 0.13, 0.05), h);
    // each crown its own green, and leaf-scale speckle
    vec2 cid = floor(p.xz / CC);
    alb *= 0.75 + 0.5 * hash12(cid * 2.3);
    alb *= 0.7 + 0.6 * vnoise(p.xz * 9.0);
    n = normalize(n + 0.35 * (vec3(vnoise(p.xz * 5.0), 0.5, vnoise(p.xz * 5.0 + 7.0)) - 0.5) * (1.0 - lod));
    alb = mix(alb, vec3(0.07, 0.085, 0.07), uCold * 0.35);
    // hollows between crowns hold the dark
    float hol = smoothstep(5.0, 10.0, p.y);
    vec3 col = alb * vec3(0.32, 0.4, 0.62) * (0.5 + 0.5 * n.y) * (0.3 + 0.7 * hol);
    // the flood: lit from the light's side, reaching us as uFlood goes to 1 (it starts far off)
    float reach = sat((dot(p.xz - ro.xz, normalize(L.xz)) + 40.0 - (1.0 - uFlood) * 420.0) / 60.0);
    if (uFloodK > 0.0 && reach > 0.0) {
      float dl = max(dot(n, L), 0.0);
      float sh = dl > 0.0 ? canopyShadow(p + n * 0.05, L) : 0.0;
      vec3 warm = vec3(2.2, 1.15, 0.45) * uFloodK * 4.0;
      col += alb * warm * dl * sh * reach;
      // light through the leaves at the crowns' tops
      col += vec3(0.25, 0.32, 0.08) * warm * 0.12 * pow(max(dot(rd, L), 0.0), 3.0) * sh * reach * hol;
    }
    c = col;
  } else c = canopySky(rd);
  // dusk haze over the forest, warmed toward the light
  float fa = t > 0.0 ? 1.0 - exp(-tt * uFog) : 0.0;
  float gL = max(dot(rd, L), 0.0);
  vec3 fc = vec3(0.12, 0.115, 0.16) + vec3(0.14, 0.07, 0.035) * (0.4 + 0.6 * gL * gL) + vec3(1.2, 0.6, 0.25) * uFloodK * pow(gL, 12.0) * 0.35;
  c = mix(c, fc, fa);
  return c;
}
`;
