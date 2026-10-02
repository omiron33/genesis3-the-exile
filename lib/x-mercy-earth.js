// s45 and s46: "you are earth; to earth you will return", told by a shadow. The sun is low behind us
// over the cracked plain, and a man's long shadow lies on the earth in front of us (he stands just out
// of frame, where we stand; we never see him). The hot wind drives grains of dust across the ground,
// through the shadow and out of it. In s46 the shadow itself breaks up, from the head back toward the
// feet: its pieces lift and blow away across the plain as dark dust, and the bare earth is left in a
// warming light. Nothing human is modelled: the shadow is a soft 2D silhouette laid on the ground.
//
// Ground coordinates: the feet are at the origin; the shadow runs along SH (the sun's direction,
// flattened and reversed), lateral axis SV. uBreak: 0 whole .. 1 gone (s46). uBreakT0/uBreakDur give
// the song time each part went (for the drifting dust). uWindV is the crosswind (m/s, toward +x).
export const EARTH_UNIFORMS = { uWindV: -1.4, uStream: 1.0, uBreak: 0.0, uBreakT0: 1e4, uBreakDur: 3.0, uSway: 1.0 };

export const EARTH_GLSL = /* glsl */ `
uniform float uWindV, uStream, uBreak, uBreakT0, uBreakDur, uSway;
float mOcc(vec3 p) { return 1e3; }

vec2 shAxes(out vec2 sv) {
  vec2 sh = normalize(-SUND.xz);
  sv = vec2(-sh.y, sh.x);
  return sh;
}
// the silhouette of a standing man in (lateral v, height h), metres: negative inside
float silhouette(vec2 q) {
  float x = abs(q.x);
  float d = length((q - vec2(0.0, 1.66)) / vec2(0.085, 0.11)) - 1.0; d *= 0.085;          // head
  // hair: a soft uneven outline round the crown of the head
  d -= 0.012 * (vnoise(vec2(atan(q.x, q.y - 1.66) * 5.0, 0.0)) - 0.3) * step(1.66, q.y);
  d = smin(d, max(x - 0.05, abs(q.y - 1.52) - 0.07), 0.03);                                  // neck
  // shoulders sloping into the arms, torso narrowing to the waist
  float sh = max(x - (0.205 - 0.25 * max(q.y - 1.42, 0.0)), max(q.y - 1.49, 0.95 - q.y));
  float waist = mix(0.15, 0.2, smoothstep(1.0, 1.4, q.y));
  float torso = max(x - waist, max(q.y - 1.45, 0.82 - q.y));
  d = smin(d, min(sh, torso), 0.05);
  // arms hanging a little away from the body, the hands just below the hips
  float arm = length(vec2(x - mix(0.215, 0.25, smoothstep(1.4, 0.8, q.y)), 0.0)) - mix(0.045, 0.03, smoothstep(1.4, 0.8, q.y));
  arm = max(arm, max(q.y - 1.44, 0.72 - q.y));
  d = min(d, arm);
  // legs, slightly apart
  float leg = x - mix(0.1, 0.085, smoothstep(0.85, 0.1, q.y));
  leg = abs(leg) - mix(0.075, 0.045, smoothstep(0.85, 0.08, q.y));
  leg = max(leg, max(q.y - 0.9, -q.y));
  d = smin(d, leg, 0.02);
  return d;
}
// how much of the shadow is still there at ground point xz (s46): it goes from the head back
float shIntact(vec2 uv, float h) {
  if (uBreak <= 0.0) return 1.0;
  float f = sat(h / 1.8 * 0.55 + 0.75 * (fbm(uv * vec2(1.5, 5.0) + vec2(0.0, uTime * 0.3), 4) - 0.2));
  float th = 0.97 - 0.94 * uBreak;
  return smoothstep(-0.03, 0.03, th - f);
}
// the shadow at ground point xz: 1 full shadow .. 0 none (soft, wider penumbra away from the feet)
float manShadow(vec2 xz) {
  vec2 sv; vec2 sh = shAxes(sv);
  float tanEl = SUND.y / length(SUND.xz);
  float u = dot(xz, sh), v = dot(xz, sv);
  if (u < -0.3) return 0.0;
  float h = u * tanEl;                         // the height on him that casts this point
  // he breathes and sways a little
  v -= uSway * (0.012 * sin(uTime * 0.8) + 0.006 * sin(uTime * 2.1)) * h / 1.7;
  float d = silhouette(vec2(v, h));
  float pen = 0.012 + 0.05 * h;               // the sun is a disc: soft edges far from the feet
  float s = 1.0 - smoothstep(-pen, pen, d);
  return s * shIntact(vec2(u, v), h);
}
// the dark dust the broken shadow becomes, carried away downwind (s46)
float shadowDust(vec3 p) {
  if (uBreak <= 0.0) return 0.0;
  vec2 sv; vec2 sh = shAxes(sv);
  float tanEl = SUND.y / length(SUND.xz);
  float acc = 0.0;
  // look back upwind for shadow that broke away and has been carried here
  float jit = hash12(p.xz * 37.0 + fract(uTime * 7.3));
  for (int k = 0; k < 6; k++) {
    float age = (float(k) + jit) * 0.32 + 0.05;
    vec2 src = p.xz - vec2(uWindV * age, 0.0);
    float u = dot(src, sh), v = dot(src, sv);
    float h = u * tanEl;
    float inS = 1.0 - smoothstep(-0.12, 0.12, silhouette(vec2(v, h)));
    float gone = 1.0 - shIntact(vec2(u, v), h);
    float lift = exp(-max(p.y - 0.08 * age, 0.0) * 5.0);
    acc += inS * gone * lift * exp(-age * 1.1) * 0.45;
  }
  return acc * smoothstep(0.35, 0.75, fbm(vec3(p.x * 2.0 - uTime * uWindV * 2.0, p.y * 12.0, p.z * 5.0), 3));
}
`;

export const EARTH_SCENE_GLSL = /* glsl */ `
// grains skimming over the ground in the crosswind: a few thin layers just above the earth, lit by
// the sun except where they cross the shadow
vec4 skimLayers(vec3 ro, vec3 rd, float depth) {
  vec3 acc = vec3(0.0); float T = 1.0;
  for (int i = 0; i < 3; i++) {
    float y = 0.04 + 0.11 * float(i) * float(i);
    if (rd.y >= 0.0 && ro.y > y) continue;
    float t = (y - ro.y) / rd.y;
    if (t <= 0.0 || t > min(depth, 45.0)) continue;
    vec3 p = ro + rd * t;
    float n = fbm(vec2((p.x - uTime * uWindV * (1.0 + 0.4 * float(i))) * 1.6, p.z * 9.0 + float(i) * 7.0), 4);
    float streak = smoothstep(0.5, 0.82, n) * (0.6 - 0.15 * float(i)) * uStream * exp(-t * 0.04);
    float grains = step(0.993, hash12(floor(vec2((p.x - uTime * uWindV * 1.3) * 45.0, p.z * 45.0)))) * smoothstep(0.35, 0.65, n);
    float shd = 1.0 - 0.85 * manShadow(p.xz);
    vec3 c = (uSunCol * uDustCol * 0.2 * shd + uSkyZen * uDustCol * 0.4) + uSunCol * 0.25 * grains * shd;
    float a = sat(streak + grains * 0.6);
    acc += T * a * c; T *= 1.0 - a;
  }
  return vec4(acc, T);
}
vec3 earthScene(vec2 fc) {
  vec3 ro; vec3 rd = mRay(fc, ro);
  rd = dShimmer(rd);
  float tg = dMarch(ro, rd, 3000.0);
  vec3 col; float depth;
  if (tg > 0.0) {
    depth = tg;
    vec3 p = ro + rd * tg;
    col = dGround(ro, rd, tg, 0.0);
    // the man's shadow: only the sky's light reaches there
    float s = manShadow(p.xz);
    if (s > 0.0) {
      vec3 n = dNormal(p.xz, tg);
      float fog = exp(-tg * uHaze);
      vec3 sunPart = uDustCol * uSunCol * sat(dot(n, SUND)) * 0.32 * fog;
      col -= sunPart * s * 0.92;
    }
    // the broken shadow blowing away as dark dust over the ground
    float sd = shadowDust(p + vec3(0.0, 0.02, 0.0));
    col *= 1.0 - 0.8 * sat(sd * 6.0);
  } else { col = dSky(rd); depth = 1e4; }
  // dust in the air above the ground, carried across the frame; darker where it came from the shadow
  vec4 sk = skimLayers(ro, rd, depth);
  col = col * sk.w + sk.rgb;
  if (uBreak > 0.0 && rd.y < 0.05) {
    float acc = 0.0;
    for (int i = 0; i < 3; i++) {
      float y = 0.12 + 0.25 * float(i);
      float t = (y - ro.y) / rd.y;
      if (t <= 0.0 || t > depth) continue;
      acc += shadowDust(ro + rd * t) * 1.4;
    }
    col = mix(col, uDustCol * (uSkyZen * 0.35 + uSunCol * 0.02), sat(acc) * 0.6);
  }
  return col;
}
`;
