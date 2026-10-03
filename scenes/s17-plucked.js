// 17 · "She plucked and ate the fruit,"
// A hit, under two seconds. The spray, close, the fruit hanging still in the gold; on "plucked" it
// is torn away down and out of the frame (no hand, only the pull), the stem snaps, the twig springs
// up and shakes, leaves tear loose and shower past the lens, and the empty stem drips.
import { grade, ease, keys, linesAt, wordIn, spring } from '/song/lib/look.js';
import { WORLD_GLSL, WORLD_UNIFORMS } from '/song/lib/x-tree-world.js';
import { FRUIT_GLSL, FRUIT_UNIFORMS } from '/song/lib/x-tree-fruit.js';
import { cameraPlane } from '/engine.js';

export const kind = 'shader';
const O = [0.0, 1.2, 0.0];

export default (P) => {
  const [L] = linesAt(P.from - 0.6, 'She plucked');
  const tSnap = wordIn(L, 'plucked').start + 0.02;
  const prog = (t) => Math.min(1, Math.max(0, (t - P.from) / (P.to - P.from)));
  const kick = (t) => (t < tSnap ? 0 : Math.exp(-(t - tSnap) * 5.0) * Math.sin((t - tSnap) * 38.0));
  const cam = (t) => {
    const p = prog(t);
    const k = kick(t);
    const pos = [0.05 + 0.03 * p, O[1] - 0.02 + 0.004 * k, -0.42 + 0.02 * p];
    return { pos, target: [-0.02, O[1] - 0.05 + 0.003 * k, 0.0], fov: 34, roll: 0.02 + 0.004 * k };
  };
  return {
    name: 's17-plucked', from: P.from, to: P.to,
    frag: WORLD_GLSL + FRUIT_GLSL + /* glsl */ `
uniform float uFocus, uAper, uFall, uDrip;
// leaves torn loose: thin discs falling and turning
vec4 looseLeaves(vec3 ro, vec3 rd, out vec3 ln) {
  float best = 1e9; vec4 hit = vec4(0.0); ln = vec3(0.0, 1.0, 0.0);
  if (uFall <= 0.0) return hit;
  for (int i = 0; i < 7; i++) {
    float fi = float(i);
    float age = uFall - 0.04 * fi;
    if (age <= 0.0) continue;
    vec3 c0 = uSprayO + vec3(-0.25 + 0.08 * fi, 0.03 + 0.05 * hash11(fi), -0.04 + 0.1 * (hash11(fi * 3.0) - 0.5));
    vec3 c = c0 + vec3(0.12 * sin(age * 3.0 + fi) * age, -0.9 * age * age - 0.25 * age + 0.25 * age * exp(-age * 2.0), -0.35 * age * (0.5 + hash11(fi * 5.0)));
    float a1 = age * (5.0 + 3.0 * hash11(fi)) + fi, a2 = age * 4.0 + fi * 2.0;
    vec3 n = normalize(vec3(sin(a1) * cos(a2), cos(a1), sin(a1) * sin(a2)));
    vec3 u = normalize(cross(n, vec3(0.3, 0.1, 1.0)));
    vec3 v = cross(n, u);
    float dn = dot(rd, n);
    if (abs(dn) < 1e-4) continue;
    float t = dot(c - ro, n) / dn;
    if (t <= 0.0 || t > best) continue;
    vec3 q = ro + rd * t - c;
    float x = dot(q, u) / 0.04, y = dot(q, v) / 0.015;
    float w = sqrt(max(1.0 - x * x, 0.0)) * (1.0 - 0.25 * x);
    if (abs(y) < w && abs(x) < 1.0) { best = t; hit = vec4(t, x, y / max(w, 1e-3), fi); ln = n; }
  }
  return hit;
}
vec3 shade(vec2 fc) {
  vec3 ro; vec3 rd = lensRay(fc, uFocus, uAper, ro);
  vec3 bg = bokehBG(rd, 1.0, 0.85);
  int id, li;
  float t = sprayTrace(ro, rd, 2.0, id, li);
  vec3 ln; vec4 lh = looseLeaves(ro, rd, ln);
  // the drip: a bead swelling at the broken end, then falling
  float tdrip = -1.0;
  if (uDrip > 0.0) {
    // the broken end in world space (inverse of toSpray is approximated: the end moves little)
    vec3 e = fromSpray(vec3(0.0055, -0.0215, 0.0022));   // the torn stub's end on the spur
    float fallY = max(uDrip - 0.55, 0.0);
    vec3 dp = e + vec3(0.0, -0.0025 - 1.2 * fallY * fallY - 0.1 * fallY, 0.0);
    float r = 0.0018 + 0.0017 * sat(uDrip / 0.55);
    vec3 oc = ro - dp; float b = dot(oc, rd), cc = dot(oc, oc) - r * r, h = b * b - cc;
    if (h > 0.0) tdrip = -b - sqrt(h);
  }
  float tb = 1e9; int what = 0;
  if (t > 0.0) { tb = t; what = 1; }
  if (lh.x > 0.0 && lh.x < tb) { tb = lh.x; what = 2; }
  if (tdrip > 0.0 && tdrip < tb) { tb = tdrip; what = 3; }
  if (what == 0) return bg;
  vec3 p = ro + rd * tb;
  if (what == 1) return shadeSpray(p, rd, id, li, bokehBG(reflect(rd, sprayNormal(p)), 1.0, 0.5), 1.0);
  if (what == 3) {
    vec3 n = normalize(p - (ro + rd * (tb + 0.002)));
    vec3 env = bokehBG(reflect(rd, n), 1.0, 1.0);
    return env * 0.6 + vec3(0.25, 0.18, 0.06) + sunC() * pow(sat(dot(reflect(rd, n), SUN)), 400.0) * 3.0;
  }
  // a loose leaf
  vec3 n = dot(ln, rd) > 0.0 ? -ln : ln;
  float mid = exp(-abs(lh.z) * 30.0);
  vec3 alb = mix(vec3(0.02, 0.045, 0.015), vec3(0.05, 0.075, 0.025), hash11(lh.w));
  float lat = 0.0;
  for (int k = 1; k < 6; k++) lat = max(lat, exp(-abs(lh.y * 0.5 + 0.5 - float(k) * 0.16 - abs(lh.z) * 0.12) * 60.0));
  vec3 c = alb * sunC() * sat(dot(n, SUN)) + vec3(0.075, 0.16, 0.025) * sunC() * sat(-dot(n, SUN)) * 0.35 * (1.0 - 0.5 * mid - 0.3 * lat) + alb * skyAmb();
  return c;
}`,
    uniforms: { ...WORLD_UNIFORMS, ...FRUIT_UNIFORMS, uBlush: -1.3, uSprayO: O, uSprayYaw: 0.25, uLeafN: 12, uAmbK: 1.9, uDew: 0.5, uFocus: 0.42, uAper: 0.003, uFall: 0, uDrip: 0 },
    camera: cam,
    textPlane(t, c) { return cameraPlane(c, { width: 1, dist: 1, aspect: 16 / 9 }); },
    update(t, u) {
      const c = cam(t);
      u.uFocus.value = Math.hypot(c.pos[0], c.pos[1] - O[1] + 0.04, c.pos[2]);
      const dt = t - tSnap;
      // before the snap: the stem stretches as the fruit is drawn down; then it is gone
      if (dt < 0) {
        const pre = Math.max(0, 1 + dt / 0.25);
        u.uPull.value.set(0, -0.006 * pre * pre, 0);
        u.uFruitOn.value = 1; u.uBroken.value = 0;
      } else {
        // torn away down and toward the lens, gone within a few frames
        const d = dt * 6.0;
        u.uPull.value.set(-0.05 * d, -0.006 - 0.9 * d * d - 0.3 * d, -0.15 * d);
        u.uFruitOn.value = dt < 0.12 ? 1 : 0;
        u.uBroken.value = 1;
      }
      // the twig springs up, overshoots and settles
      const sp = dt > 0 ? (1 - spring(t, tSnap, 0.35, 0.55)) : 0;
      u.uLift.value = dt > 0 ? 0.16 * Math.exp(-dt * 2.2) * Math.cos(dt * 14.0) + 0.02 : -0.03 * Math.max(0, 1 + dt / 0.25);
      u.uShiverM.value = dt > 0 ? 1.4 * Math.exp(-dt * 2.0) + 0.05 : 0.03;
      u.uFall.value = Math.max(0, dt);
      u.uDrip.value = Math.max(0, dt - 0.35);
      u.uLeafN.value = dt > 0.05 ? 9 : 12;
    },
    post(t) { return grade(t, { exposure: 1.0, bloom: 0.18, threshold: 0.9, contrast: 1.08, saturation: 1.06, vignette: 0.5 }); },
    finish(t) { return { grade: { shadows: [0.03, 0.015, 0.0], highlights: [1.0, 0.93, 0.8], amount: 0.3 } }; },
  };
};
