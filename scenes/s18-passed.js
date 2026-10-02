// 18 · "passed it to her husband there beside her; / he ate as well."
// Low in the grass, far down the slope from the tree. Far off and small under the crown, two figures
// stand close together against the low sun, black, one turning to the other. A bitten fruit drops
// into the grass right in front of the lens and lies there; the focus leaves the two and settles on it,
// its white flesh already browning in the gold light.
import { grade, ease, keys, linesAt, wordIn } from '/song/lib/look.js';
import { WORLD_GLSL, WORLD_UNIFORMS, terrBaseJS } from '/song/lib/x-tree-world.js';
import { FRUIT_GLSL, FRUIT_UNIFORMS } from '/song/lib/x-tree-fruit.js';
import { cameraPlane } from '/engine.js';

export const kind = 'shader';

export default (P) => {
  const [A, B] = linesAt(P.from - 0.6, 'passed it to', 'he ate as well');
  const husband = wordIn(A, 'husband').start;
  const tLand = wordIn(A, 'passed').start + 0.2;
  const prog = (t) => Math.min(1, Math.max(0, (t - P.from) / (P.to - P.from)));
  const CX = 26.6, CZ = -70.7;
  const g0 = terrBaseJS(CX, CZ);
  const FX = CX - 0.3, FZ = CZ + 1.75;
  const FIG = [12.0, -12.5];
  const cam = (t) => {
    const p = prog(t), e = 0.6 * p + 0.4 * ease.inOut3(p);
    const pos = [CX + 0.03 * e, g0 + 0.45 + 0.01 * e, CZ - 0.04 * e];
    const dist = Math.hypot(FIG[0] - pos[0], FIG[1] - pos[2]);
    const pitch = (1.0 - 6.5 * e) * Math.PI / 180;
    const tgt = [FIG[0] - 1.5 - 0.6 * e, pos[1] + Math.tan(pitch) * dist, FIG[1]];
    return { pos, target: tgt, fov: 40, roll: 0.0 };
  };
  return {
    name: 's18-passed', from: P.from, to: P.to,
    frag: WORLD_GLSL + FRUIT_GLSL + /* glsl */ `
uniform float uFocus, uAper, uTurn, uReach;
// two people, far off, in silhouette: capsules and spheres, no detail
float person(vec3 p, float h, float lean, float turn, float reach, float hair) {
  p.xz = rot(turn) * p.xz;
  float s = h / 1.75;
  p /= s;
  p.x -= lean * p.y * 0.04;
  float d = sdCapsule(p, vec3(-0.1, 0.05, 0.0), vec3(-0.09, 0.85, 0.0), 0.075);
  d = min(d, sdCapsule(p, vec3(0.1, 0.05, 0.0), vec3(0.09, 0.85, 0.0), 0.075));
  d = smin(d, sdRoundCone(p, vec3(0.0, 0.92, 0.0), vec3(0.0, 1.38, 0.0), 0.17, 0.2), 0.08);
  d = smin(d, sdCapsule(p, vec3(0.0, 1.42, 0.0), vec3(0.0, 1.52, 0.0), 0.055), 0.04);
  d = min(d, length(p - vec3(0.0, 1.63, 0.0)) - 0.11);
  d = min(d, sdCapsule(p, vec3(-0.22, 1.38, 0.0), vec3(-0.26, 0.9, 0.02), 0.045));
  // the right arm reaches across to the other (the passing)
  vec3 hand = mix(vec3(0.25, 0.92, 0.02), vec3(0.42, 1.16, 0.2), reach);
  d = min(d, sdCapsule(p, vec3(0.22, 1.38, 0.0), mix(vec3(0.27, 1.1, 0.05), vec3(0.36, 1.2, 0.12), reach), 0.045));
  d = min(d, sdCapsule(p, mix(vec3(0.27, 1.1, 0.05), vec3(0.36, 1.2, 0.12), reach), hand, 0.04));
  if (hair > 0.5) d = smin(d, sdEllipsoid(p - vec3(0.0, 1.5, -0.05), vec3(0.13, 0.24, 0.1)), 0.05);
  return d * s;
}
vec3 figPos(int i) { vec2 xz = vec2(${FIG[0]}, ${FIG[1]}) + (i == 0 ? vec2(0.0) : vec2(0.62, -0.12)); return vec3(xz.x, terrBase(xz) - 0.02, xz.y); }
float figures(vec3 p) {
  float a = person(p - figPos(0), 1.64, 0.0, 0.5 + 0.4 * uTurn, uReach, 1.0);
  float b = person(p - figPos(1), 1.78, 0.0, 3.14159 - 0.4 - 0.3 * uTurn, 0.0, 0.0);
  return min(a, b);
}
float figTrace(vec3 ro, vec3 rd, float tmax) {
  vec3 c = figPos(0) + vec3(0.3, 0.9, 0.0);
  vec3 oc = ro - c; float b = dot(oc, rd), cc = dot(oc, oc) - 1.6 * 1.6, h = b * b - cc;
  if (h < 0.0) return -1.0;
  float t = -b - sqrt(h);
  for (int i = 0; i < 64; i++) {
    float d = figures(ro + rd * t);
    if (d < 0.002 * t * 0.02) return t;
    t += d;
    if (t > tmax) break;
  }
  return -1.0;
}
vec3 shade(vec2 fc) {
  gFallen = vec3(uFallen.x, terrBase(uFallen.xz) + uFallen.y, uFallen.z);
  gFallenYaw = -1.05; gFallenTilt = 0.35;
  vec3 ro; vec3 rd = lensRay(fc, uFocus, uAper, ro);
  float jit = hash12(fc + fract(uTime * 7.31) * 57.0);
  int part;
  float tf = fallenTrace(ro, rd, 3.0, part);
  float depth;
  vec3 c;
  float hk, side;
  float tb = tf > 0.0 ? grassTrace(ro, rd, tf, jit, hk, side) : -1.0;
  if (tb > 0.0) return shadeBlade(ro + rd * tb, rd, hk, side);
  if (tf > 0.0) {
    vec3 p = ro + rd * tf;
    float sh = treeShadow(p, SUN);
    return shadeFallen(p, rd, part, skyAmb() * 0.6, sh);
  }
  c = gardenScene(ro, rd, jit, depth);
  float tg = figTrace(ro, rd, depth);
  if (tg > 0.0) {
    vec3 p = ro + rd * tg;
    vec2 e = vec2(0.003, 0.0);
    vec3 n = normalize(vec3(figures(p + e.xyy) - figures(p - e.xyy), figures(p + e.yxy) - figures(p - e.yxy), figures(p + e.yyx) - figures(p - e.yyx)));
    float rim = pow(1.0 - sat(dot(-rd, n)), 3.0) * sat(dot(n, SUN) + 0.3);
    vec3 fcol = vec3(0.012, 0.01, 0.009) * skyAmb() + sunC() * vec3(1.0, 0.7, 0.4) * rim * 0.08;
    c = atmos(fcol, rd, tg);
  }
  return c;
}`,
    uniforms: { ...WORLD_UNIFORMS, ...FRUIT_UNIFORMS, uTreeWind: 0.06, uGrass: 1, uGrassFar: 6, uGrassH: 0.45, uFocus: 58, uAper: 0.006, uTurn: 0, uReach: 0, uFallen: [FX, 0.6, FZ], uBrown: 0 },
    camera: cam,
    textPlane(t, c) { return cameraPlane(c, { width: 1, dist: 1, aspect: 16 / 9 }); },
    update(t, u) {
      const c = cam(t);
      const dFig = Math.hypot(c.pos[0] - FIG[0], c.pos[2] - FIG[1]);
      const dFr = Math.hypot(c.pos[0] - FX, c.pos[2] - FZ) + 0.02;
      const k = keys(t, [[P.from, 0], [tLand + 0.25, 0], [husband + 0.2, 1, ease.inOut3], [P.to, 1]]);
      u.uFocus.value = 1 / (1 / dFig + (1 / dFr - 1 / dFig) * k);
      // the fruit falls in, bounces once, settles
      const tf = t - tLand;
      let h = 0.040;
      if (tf < 0) h = 0.040 + 4.9 * tf * tf;
      else if (tf < 0.2) h = 0.040 + 0.05 * Math.sin(tf / 0.2 * Math.PI);
      u.uFallen.value.set(FX + (tf > 0 ? 0.015 * Math.min(1, tf * 2) : 0), Math.min(h, 2.0), FZ);
      u.uBrown.value = 0.15 + Math.min(1, Math.max(0, (t - tLand) / 6.0)) * 0.55;
      u.uTurn.value = keys(t, [[P.from, 0], [husband, 1, ease.inOut3], [P.to, 0.6]]);
      u.uReach.value = keys(t, [[P.from, 0.1], [wordIn(A, 'passed').start, 0.2], [husband + 0.4, 1, ease.inOut3], [B.start, 0.3], [P.to, 0.1]]);
      u.uDusk.value = keys(t, [[P.from, 0], [P.to - 1.8, 0], [P.to, 0.12, ease.inOut3]]);
    },
    post(t) { return grade(t, { exposure: 0.92, bloom: 0.18, threshold: 0.95, contrast: 1.08 }); },
    finish(t) { return { flare: { amount: 0.03, threshold: 0.95, tint: [1.0, 0.75, 0.5], length: 0.35 }, grade: { shadows: [0.02, 0.012, 0.0], highlights: [1.0, 0.93, 0.82], amount: 0.3 } }; },
  };
};
