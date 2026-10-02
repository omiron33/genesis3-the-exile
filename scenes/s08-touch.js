// 08 · "God told us not to eat its fruit, / not even to touch it,"
// The command, gently. At a respectful middle distance one fruit hangs among the tree's dark leaves,
// half hidden, in a cooler side light. The camera drifts slowly sideways and a little closer and never
// stops; on "touch" the leaves shiver and the focus slides off the fruit onto the leaves in front of it;
// at the end a cloud takes the sun and the light drops a stop.
import { grade, ease, keys, linesAt, wordIn } from '/song/lib/look.js';
import { WORLD_GLSL, WORLD_UNIFORMS } from '/song/lib/x-tree-world.js';
import { FRUIT_GLSL, FRUIT_UNIFORMS } from '/song/lib/x-tree-fruit.js';
import { cameraPlane } from '/engine.js';

export const kind = 'shader';
const O = [0.0, 1.2, 0.0];
const F = [O[0], O[1] - 0.081, O[2]];

export default (P) => {
  const [, B] = linesAt(P.from - 0.6, 'God told us', 'not even to touch');
  const touch = wordIn(B, 'touch').start;
  const prog = (t) => Math.min(1, Math.max(0, (t - P.from) / (P.to - P.from)));
  const cam = (t) => {
    const p = prog(t);
    // sideways along z, creeping in along x; the sun comes from the side (+z)
    const x = -1.45 + 0.28 * p;
    const z = 0.2 - 0.42 * p;
    const pos = [F[0] + x, F[1] + 0.03 + 0.01 * Math.sin(t * 0.6), F[2] + z];
    return { pos, target: [F[0] + 0.0, F[1] + 0.01, F[2] + z * 0.3], fov: 28, roll: 0.01 * Math.sin(t * 0.37) };
  };
  return {
    name: 's08-touch', from: P.from, to: P.to,
    frag: WORLD_GLSL + FRUIT_GLSL + /* glsl */ `
uniform float uFocus, uAper, uWarm, uSunK;
vec3 shade(vec2 fc) {
  vec3 ro; vec3 rd = lensRay(fc, uFocus, uAper, ro);
  vec3 bg = bokehBG(rd, uWarm, 0.55) * mix(0.75, 1.0, uSunK);
  int id, li;
  float t = sprayTrace(ro, rd, 3.0, id, li);
  if (t < 0.0) return bg;
  vec3 p = ro + rd * t;
  return shadeSpray(p, rd, id, li, bokehBG(reflect(rd, sprayNormal(p)), uWarm, 0.4), uSunK);
}`,
    uniforms: { ...WORLD_UNIFORMS, ...FRUIT_UNIFORMS, uSprayO: O, uSprayYaw: -1.2, uDew: 0.0, uLeafN: 12, uFrontO: [-0.2, 0.03, -0.42], uFrontN: 4, uFrontYaw: 0.9, uSunDir: [0.15, 0.3, -0.94], uSunCol: [4.6, 4.5, 4.2],
      uFocus: 1.4, uAper: 0.016, uWarm: 0.25, uSunK: 1.0 },
    camera: cam,
    textPlane(t, c) { return cameraPlane(c, { width: 1, dist: 1, aspect: 16 / 9 }); },
    update(t, u) {
      const c = cam(t);
      const dF = Math.hypot(c.pos[0] - F[0], c.pos[1] - F[1], c.pos[2] - F[2]);
      // focus on the fruit, then on "touch" it slides off onto the near leaves, and drifts back a little
      const off = keys(t, [[P.from, 0], [touch - 0.1, 0], [touch + 0.9, 1, ease.inOut3], [P.to, 0.8]]);
      u.uFocus.value = dF * (1 - 0.42 * off);
      u.uShiverM.value = keys(t, [[P.from, 0.02], [touch - 0.05, 0.02], [touch + 0.15, 1.0, ease.out3], [touch + 1.6, 0.12], [P.to, 0.05]]);
      u.uSunK.value = keys(t, [[P.from, 1], [P.to - 1.6, 1], [P.to, 0.5, ease.inOut3]]);
      u.uSpin.value = 0.3 + 0.05 * Math.sin(t * 0.5);
    },
    post(t) { return grade(t, { exposure: 1.05, bloom: 0.12, threshold: 1.0, saturation: 0.95, gain: [0.97, 1.0, 1.04], vignette: 0.5 }); },
    finish(t) { return { grade: { shadows: [0.0, 0.01, 0.03], highlights: [0.96, 0.98, 1.0], amount: 0.35 } }; },
  };
};
