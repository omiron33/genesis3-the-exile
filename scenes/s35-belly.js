// 35 · "Your breast and belly shall bear you;"
// Low macro at the level of the ground under hard white heat: the cursed serpent, his gleam gone,
// scales dulled and dusty, drags his belly across the cracked dry earth from right to left; dust
// lifts and hangs in the light behind him.
import { grade, ease, clamp } from '/song/lib/look.js';
import { SERPENT_GLSL, SERPENT_UNIFORMS, pathFn, pose, applyPose, tongue, V } from '/song/lib/x-serpent.js';
import { ENV_GLSL } from '/song/lib/x-serpent-env.js';

export const kind = 'shader';

const RS = 0.022;
const SUN = V.nrm([-0.35, 0.85, 0.4]);
const ZC = 0.0, A = 0.06, LAM = 0.62, X0 = 0.9, VEL = 0.11;

export default (P) => {
  const D = P.to - P.from;
  // he travels toward -x: u = X0 - x
  const path = pathFn((u) => [X0 - u, RS * 0.5, ZC + A * Math.sin(2 * Math.PI * u / LAM)], -2, 4, 4000);
  const uHead0 = X0 - 0.12;     // the head starts just inside the right of frame
  const sOfU = (u) => { let lo = 0, hi = path.length; for (let i = 0; i < 40; i++) { const m = (lo + hi) / 2; if (path.uAt(m) < u) lo = m; else hi = m; } return lo; };
  const poseT = (t) => {
    const uh = uHead0 + VEL * (t - P.from);
    return { ps: pose({ path, sHead: sOfU(uh), L: 1.4, rMax: RS }), uHead: uh };
  };
  const xh0 = X0 - uHead0;
  const cam = (t) => {
    const k = clamp((t - P.from) / D, 0, 1);
    const x = xh0 + 0.035 - 0.85 * VEL * D * k;   // a little slower than he is: his head drifts across the frame
    return { pos: [x + 0.02, 0.1, -0.3], target: [x - 0.01, 0.0, 0.02], fov: 34, roll: 0.0 };
  };
  const flicks = [P.from + 1.0, P.from + 2.6];
  return {
    name: 's35-belly', from: P.from, to: P.to,
    frag: SERPENT_GLSL + ENV_GLSL + /* glsl */ `
uniform float uUHead;
float envSDF(vec3 p, out float id) { id = 10.0; return (p.y - crackH(p.xz, 0.0)) * 0.8; }
void envMat(vec3 p, inout vec3 n, float id, out vec3 alb, out float rough, out float spec) {
  float h = crackH(p.xz, 1.0);
  n = crackBump(p.xz, n);
  alb = crackCol(p.xz, h); rough = 0.9; spec = 0.02;
}
vec3 sky(vec3 rd) {
  vec3 c = heatSky(rd, normalize(uSunDir));
  vec4 dd = dustDevils(rd, uTime);
  return mix(c, dd.rgb / max(dd.a, 1e-3), dd.a);
}
vec3 atmos(vec3 col, vec3 ro, vec3 rd, float t) { return mix(col, vec3(0.85, 0.78, 0.66), 1.0 - exp(-t * 0.05)); }
float sunVis(vec3 p) { return 1.0; }
vec3 extraLight(vec3 p, vec3 n, vec3 rd, vec3 alb, float rough) {
  // the hot ground bounces warm light up into every underside
  return alb * vec3(0.7, 0.55, 0.38) * sat(-n.y * 0.6 + 0.4) * 0.6;
}
// dust raised where his belly has dragged: thickest just behind him, rising and spreading as it ages
float dustD(vec3 p) {
  float u = ${X0.toFixed(3)} - p.x;
  float zc = ${ZC.toFixed(3)} + ${A.toFixed(3)} * sin(6.2831853 * u / ${LAM.toFixed(3)});
  float age = (uUHead - u) / ${VEL.toFixed(3)};
  if (age < 0.0) return 0.0;
  float w = 0.025 + 0.05 * age;
  float hgt = 0.012 + 0.05 * age;
  float d = exp(-pow((p.z - zc) / w, 2.0)) * exp(-max(p.y, 0.0) / hgt) * smoothstep(0.15, 0.6, age) * exp(-age / 2.0);
  if (d < 0.01) return 0.0;
  float n = fbm(p * vec3(40.0, 30.0, 40.0) + vec3(0.0, -uTime * 0.3, 0.0), 3);
  return d * smoothstep(0.35, 0.8, n) * 0.6;
}
vec3 shade(vec2 fc) {
  vec3 ro; vec3 rd = lensRay(fc, ro);
  // heat shimmer on the far ground and air
  rd.y += 0.0012 * (vnoise(vec2(fc.x * 0.02, fc.y * 0.06 - uTime * 6.0)) - 0.5) * smoothstep(0.08, 0.0, abs(rd.y));
  rd = normalize(rd);
  gCeil = 0.070; gShadowMax = 0.5; gFlatFar = 4.0;
  vec3 col = render(ro, rd, 20.0);
  float id = gHitId; vec4 h = vec4(gHitP, gHitT);
  float tEnd = min(gHitT, 3.0);
  // the dust lives below y = 0.12: march only that part of the ray
  float t0 = 0.0;
  if (ro.y > 0.12) { t0 = rd.y < 0.0 ? (ro.y - 0.12) / -rd.y : 1e5; }
  else if (rd.y > 0.0) tEnd = min(tEnd, (0.12 - ro.y) / rd.y);
  // march the dust
  vec3 L = normalize(uSunDir);
  float ph = 0.6 + 0.8 * pow(sat(dot(rd, L) * 0.5 + 0.5), 4.0);
  float T = 1.0; vec3 acc = vec3(0.0);
  float dt = max(tEnd - t0, 0.0) / 16.0;
  for (int i = 0; i < 16; i++) {
    if (dt <= 0.0) break;
    vec3 p = ro + rd * (t0 + dt * (float(i) + hash12(fc + float(i))));
    if (p.y > 0.2) continue;
    float dd = dustD(p) * dt * 30.0;
    if (dd <= 0.0) continue;
    vec3 dc = vec3(0.8, 0.68, 0.52) * (uSunCol * 0.35 * ph + uSkyCol * 0.5);
    acc += T * (1.0 - exp(-dd)) * dc;
    T *= exp(-dd);
  }
  return (col * T + acc) * uExp;
}`,
    uniforms: { ...SERPENT_UNIFORMS(), uSunDir: SUN, uSunCol: [4.2, 3.9, 3.4], uSkyCol: [0.55, 0.55, 0.55], uGndCol: [0.35, 0.28, 0.2], uUHead: 0, uDull: 1.0, uSheen: 0.0 },
    camera: cam,
    update(t, u) {
      const { ps, uHead } = poseT(t);
      applyPose(u, ps, tongue(t, flicks));
      u.uUHead.value = uHead;
      const c = cam(t);
      u.uFocus.value = V.len(V.sub(ps.pts[6], c.pos));
      u.uAper.value = 0.004;
    },
    post(t) { return grade(t, { exposure: 0.95, bloom: 0.1, threshold: 0.95, vignette: 0.45, saturation: 0.75, contrast: 1.06, gain: [1.02, 1.0, 0.96] }); },
    finish(t) { return { grade: { shadows: [0.03, 0.02, 0.0], highlights: [1.0, 0.98, 0.92], amount: 0.35 } }; },
  };
};
