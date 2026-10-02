// 28 · "Did you take and eat / from the tree I alone forbade?"
// The tree at cold dusk, the gold all gone: from low under its rim we rise slowly toward one spray of
// leaves at the crown's edge, and arrive at what the question names: the empty stem where the fruit
// was torn away, a dark wound in the branch, a bead of sap at its end. Wind barely stirs the leaves.
import { grade, ease, keys, linesAt, wordIn } from '/song/lib/look.js';
import { WORLD_GLSL, WORLD_UNIFORMS } from '/song/lib/x-tree-world.js';
import { CANOPY_GLSL } from '/song/lib/x-tree-canopy.js';
import { FRUIT_GLSL, FRUIT_UNIFORMS } from '/song/lib/x-tree-fruit.js';
import { cameraPlane } from '/engine.js';

export const kind = 'shader';

export default (P) => {
  const [A, B] = linesAt(P.from - 0.6, 'Did you take', 'from the tree');
  const forbade = wordIn(B, 'forbade').start;
  const prog = (t) => Math.min(1, Math.max(0, (t - P.from) / (P.to - P.from)));
  const H = [1.9, 12.7, 9.2];                    // a spray hanging at the crown's western rim
  const E = [H[0] + 0.005, H[1] - 0.019, H[2] + 0.002];  // the broken end
  const cam = (t) => {
    const p = prog(t), e = 0.45 * p + 0.55 * ease.inOut3(p);
    const start = [E[0] - 0.22, E[1] - 0.75, E[2] - 0.85], end = [E[0] - 0.035, E[1] - 0.01, E[2] - 0.15];
    const pos = start.map((v, i) => v + (end[i] - v) * e + (i === 1 ? 0.004 * Math.sin(t * 0.8) : 0.005 * Math.sin(t * 0.5 + i)));
    const look = [E[0] + 0.05 * (1 - e), E[1] + 0.12 * (1 - e) - 0.012 * e, E[2]];
    return { pos, target: look, fov: 40 - 12 * e, roll: 0.02 - 0.02 * e };
  };
  return {
    name: 's28-forbade', from: P.from, to: P.to,
    frag: WORLD_GLSL + CANOPY_GLSL + FRUIT_GLSL + /* glsl */ `
uniform float uFocus, uAper, uSap;
vec3 shade(vec2 fc) {
  vec3 ro; vec3 rd = lensRay(fc, uFocus, uAper, ro);
  float jit = hash12(fc + fract(uTime * 7.31) * 57.0);
  int id, li;
  float ts = sprayTrace(ro, rd, 20.0, id, li);
  // the bead of sap at the broken end
  vec3 e = fromSpray(vec3(0.0055, -0.0228, 0.0022));
  float r = 0.0017 * uSap;
  vec3 oc = ro - e; float b = dot(oc, rd), cc = dot(oc, oc) - r * r, h = b * b - cc;
  float tsap = (h > 0.0 && uSap > 0.01) ? -b - sqrt(h) : -1.0;
  if (tsap > 0.0 && (ts < 0.0 || tsap < ts)) {
    vec3 p = ro + rd * tsap, n = normalize(p - e);
    vec3 rr = reflect(rd, n);
    return vec3(0.02, 0.012, 0.006) + sky(rr) * (0.04 + 0.6 * pow(1.0 - sat(dot(-rd, n)), 4.0)) + skyAmb() * pow(sat(rr.y), 30.0) * 2.0;
  }
  if (ts > 0.0) {
    vec3 p = ro + rd * ts;
    vec3 bgr = sky(reflect(rd, sprayNormal(p)));
    return shadeSpray(p, rd, id, li, bgr, 1.0);
  }
  float depth;
  return underTree(ro, rd, jit, depth);
}`,
    uniforms: { ...WORLD_UNIFORMS, ...FRUIT_UNIFORMS, uDusk: 1.0, uTreeWind: 0.05, uSunDir: [-0.1, 0.07, 0.99], uHaze: 1.6,
      uSprayO: H, uSprayYaw: 0.1, uBoughTo: [H[0] - 1.9, H[1] + 1.7, H[2] - 0.5], uLeafN: 6, uFruitOn: 0, uBroken: 1, uFruitK: 0, uFocus: 3.0, uAper: 0.01, uSap: 1, uAmbK: 1.6 },
    camera: cam,
    textPlane(t, c) { return cameraPlane(c, { width: 1, dist: 1, aspect: 16 / 9 }); },
    update(t, u) {
      const c = cam(t);
      const d = Math.hypot(c.pos[0] - E[0], c.pos[1] - E[1], c.pos[2] - E[2]);
      u.uFocus.value = d;
      u.uAper.value = 0.0025;
      u.uShiverM.value = 0.04;
      u.uSap.value = 0.7 + 0.3 * Math.min(1, Math.max(0, (t - forbade) / 1.2));
    },
    post(t) { return grade(t, { exposure: 1.5, bloom: 0.1, threshold: 1.0, contrast: 1.06, saturation: 0.8, lift: [0.006, 0.008, 0.014], gain: [0.94, 0.98, 1.06] }); },
    finish(t) { return { grade: { shadows: [0.0, 0.01, 0.035], highlights: [0.9, 0.96, 1.04], amount: 0.5 } }; },
  };
};
