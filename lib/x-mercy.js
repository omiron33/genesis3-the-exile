// The mercy world's shared core (s44 to s51): a thin lens, colour helpers and a hazy sky that can be
// set anywhere from the cursed earth's hard white heat to warm dawn and dusk. Every mercy scene
// prefixes its own GLSL with MERCY_CORE.
export const MERCY_UNIFORMS = {
  uFocus: 1.0, uAper: 0.0,
  uSun: [0.3, 0.7, 0.6], uSunCol: [9.0, 8.4, 7.4],
  uSkyZen: [0.32, 0.46, 0.72], uSkyHor: [1.25, 1.2, 1.1],
};

export const MERCY_CORE = /* glsl */ `
uniform float uFocus, uAper;
uniform vec3 uSun, uSunCol, uSkyZen, uSkyHor;
#define SUND normalize(uSun)

// thin lens: every sub-frame samples a point on the aperture and aims at the focus plane
vec3 mRay(vec2 fc, out vec3 ro) {
  vec3 rd0 = camRay(fc, ro);
  if (uAper <= 0.0) return rd0;
  vec3 ww = normalize(uCamTarget - uCamPos);
  vec3 up = vec3(sin(uCamRoll), cos(uCamRoll), 0.0);
  vec3 uu = normalize(cross(ww, up)), vv = cross(uu, ww);
  vec3 fp = ro + rd0 * (uFocus / dot(rd0, ww));
  vec2 j = vec2(hash12(uJitter * 917.0 + 3.1), hash12(uJitter * 613.0 + 7.7));
  float r = sqrt(j.x), th = 6.2831853 * j.y;
  ro += (uu * cos(th) + vv * sin(th)) * r * uAper;
  return normalize(fp - ro);
}
float mLum(vec3 c) { return dot(c, vec3(0.2126, 0.7152, 0.0722)); }
float hgPhase(float c, float g) { float g2 = g * g; return (1.0 - g2) / (4.0 * PI * pow(1.0 + g2 - 2.0 * g * c, 1.5)); }

// a hazy sky: zenith to a bright horizon, the sun's disc and its glow in the haze
vec3 mSky(vec3 rd) {
  float y = max(rd.y, 0.0);
  float s = max(dot(rd, SUND), 0.0);
  vec3 c = mix(uSkyHor, uSkyZen, pow(sat(y * 1.6), 0.55));
  c += uSunCol * (pow(s, 6.0) * 0.035 + pow(s, 48.0) * 0.12 + smoothstep(0.99955, 0.9997, s) * 6.0);
  // below the horizon: the haze continues down (scenes draw ground over it)
  if (rd.y < 0.0) c = mix(uSkyHor, uSkyHor * 0.8, sat(-rd.y * 4.0));
  return c;
}
`;
