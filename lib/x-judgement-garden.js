// The garden under the storm (s32, s41): the tree agent's clearing, rise and tree (x-tree-world.js,
// x-tree.js) lit by the storm instead of the sun: a dull sky ambient that falls as the deck thickens,
// a last weak sun through a gap, and lightning, which lights the land and throws the tree's crown
// into silhouette. The sky is the judgement's cloud deck (x-judgement.js).
import { WORLD_GLSL, WORLD_UNIFORMS } from '/song/lib/x-tree-world.js';
import { JUDGE_GLSL, JUDGE_UNIFORMS } from '/song/lib/x-judgement.js';

export const STORMGARDEN_UNIFORMS = {
  ...WORLD_UNIFORMS, ...JUDGE_UNIFORMS,
  uDusk: 1.0, uHaze: 1.0,
  uAmbK: 1.0,        // how much daylight is left under the deck
  uSunK: 0.0,        // the last direct sun (through a gap)
  uWet: 0.0,         // rain-dark ground and sheen
};

export const STORMGARDEN_GLSL = WORLD_GLSL + JUDGE_GLSL + /* glsl */ `
uniform float uAmbK, uSunK, uWet;

vec3 sgAmb() { return mix(uJZen, uJHor, 0.55) * 1.6 * uAmbK; }
vec3 sgSunC() { return uJSunCol * uSunK; }
vec3 sgFlashL(vec3 p) { return normalize(uJFlashPos - p); }
vec3 sgFlashC() { return vec3(0.75, 0.84, 1.0) * uJFlash * 1.6; }

vec3 sgGround(vec3 p, vec3 rd, float t) {
  vec3 n = terrN(p.xz, t);
  float fm = forestMask(p.xz);
  float isWood = fm * smoothstep(0.5, 2.0, p.y - terrBase(p.xz));
  float flower;
  vec3 alb = groundAlb(p, flower);
  vec2 dn = vec2(vnoise(p.xz * 4.0), vnoise(p.xz * 4.0 + 7.0)) - 0.5;
  n = normalize(n + vec3(dn.x, 0.0, dn.y) * 0.5 * exp(-t * 0.02));
  vec3 woodC = mix(vec3(0.02, 0.035, 0.014), vec3(0.06, 0.08, 0.026), vnoise(p * 1.3)) * (0.6 + 0.6 * vnoise(p.xz * 0.15));
  alb = mix(alb, woodC, isWood);
  alb *= 1.0 - 0.35 * uWet;
  // wind: the meadow grass shows its pale side in running waves
  vec2 wd = normalize(uJWind.xz + vec2(1e-4));
  float wave = smoothstep(0.4, 0.9, fbm(vec2(dot(p.xz, wd) * 0.12 - uTime * 2.2 * length(uJWind.xz) * 0.1, dot(p.xz, vec2(-wd.y, wd.x)) * 0.04), 3)) * (1.0 - isWood);
  vec2 tq = p.xz - uTreePos.xz;
  float ao = mix(0.45, 1.0, smoothstep(6.0, 17.0, length(tq)));
  vec3 c = alb * sgAmb() * (0.6 + 0.4 * n.y) * ao * (1.0 + 0.9 * wave);
  if (uSunK > 0.0) c += alb * sgSunC() * sat(dot(n, JSUN)) * treeShadow(p + n * 0.05, JSUN);
  if (uJFlash > 0.01) {
    vec3 L = sgFlashL(p);
    c += alb * sgFlashC() * (0.35 + 0.65 * sat(dot(n, L))) * treeShadow(p + n * 0.05, L) * (1.0 + 0.8 * wave);
  }
  // wet sheen: the sky in the soaked grass
  float fr = pow(1.0 - sat(dot(-rd, n)), 4.0);
  c += uWet * fr * 0.25 * (sgAmb() * 1.2 + sgFlashC() * 0.6) * (1.0 - isWood);
  return c;
}

vec3 sgSky(vec3 rd) {
  vec3 c = jSkyBase(rd);
  // far hills and woods on the horizon
  float az = atan(rd.x, rd.z);
  float ridge = 0.012 + 0.03 * fbm(vec2(az * 2.6, 1.0), 5) + 0.01 * fbm(vec2(az * 14.0, 3.0), 3);
  float hill = smoothstep(ridge + 0.001, ridge - 0.001, rd.y);
  c = mix(c, mix(uJFogCol, jSkyBase(vec3(rd.x, 0.0, rd.z)), 0.5) * 0.8, hill);
  return c;
}

// everything: land, tree, water, sky and deck. depth out.
vec3 stormGarden(vec3 ro, vec3 rd, float jit, out float depth) {
  int id;
  float tt = treeTrace(ro, rd, 600.0, jit, id);
  float tg = terrMarch(ro, rd, tt > 0.0 ? tt : 3000.0);
  // the river and the pool, flat and dark, showing the sky
  float tw = -1.0;
  float tpl = (WP - ro.y) / rd.y;
  if (tpl > 0.0) { vec3 q = ro + rd * tpl; if (poolD(q.xz) < 0.4 && terrBase(q.xz) < WP) tw = tpl; }
  float trv = (WR - ro.y) / rd.y;
  if (trv > 0.0 && (tw < 0.0 || trv < tw)) { vec3 q = ro + rd * trv; if (riverD(q.xz) < 12.0 && terrBase(q.xz) < WR) tw = trv; }
  vec3 col;
  bool hitG = tg > 0.0 && (tt < 0.0 || tg < tt);
  depth = hitG ? tg : (tt > 0.0 ? tt : 1e6);
  if (tw > 0.0 && tw < depth) {
    vec3 p = ro + rd * tw;
    vec2 g = (vec2(vnoise(p.xz * 3.0 + uTime * 0.7), vnoise(p.xz * 3.0 - uTime * 0.6 + 5.0)) - 0.5) * (0.02 + 0.05 * uJRain);
    vec3 n = normalize(vec3(g.x, 1.0, g.y));
    vec3 rr = reflect(rd, n); rr.y = abs(rr.y);
    float fr = 0.02 + 0.98 * pow(1.0 - sat(dot(-rd, n)), 5.0);
    col = mix(vec3(0.01, 0.012, 0.012) * uAmbK, sgSky(rr) * 0.8, fr);
    depth = tw;
  } else if (hitG) {
    col = sgGround(ro + rd * tg, rd, tg);
  } else if (tt > 0.0) {
    vec3 p = ro + rd * tt;
    // the crown lit by the flash (silhouette and rim), or by the last sun
    vec3 L = uJFlash > 0.01 ? sgFlashL(p) : JSUN;
    vec3 lc = uJFlash > 0.01 ? sgFlashC() : sgSunC();
    col = treeShade(p, rd, id, L, lc, sgAmb() * 1.1, sgAmb() * 0.2);
  } else {
    col = sgSky(rd);
  }
  if (depth < 1e5) col = jFog(col, ro, rd, depth);
  col += jBolt(ro, rd, depth);
  return col;
}
`;
