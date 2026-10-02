// 16 · "beauty before her eyes, / something fair to ponder."
// The most beautiful image in the film: macro, very shallow focus. The fruit turns slowly on its
// stem in the low gold light; dew beads its skin and one drop runs down the side; beyond it the
// garden is nothing but gold discs of sun through leaves. The camera breathes round it.
import { grade, ease, keys } from '/song/lib/look.js';
import { WORLD_GLSL, WORLD_UNIFORMS } from '/song/lib/x-tree-world.js';
import { FRUIT_GLSL, FRUIT_UNIFORMS } from '/song/lib/x-tree-fruit.js';
import { cameraPlane } from '/engine.js';
import { FINISH } from '/premium/finish.js';

export const kind = 'shader';
const O = [0.0, 1.2, 0.0];
const F = [O[0], O[1] - 0.081, O[2]];

export default (P) => {
  const prog = (t) => Math.min(1, Math.max(0, (t - P.from) / (P.to - P.from)));
  const cam = (t) => {
    const p = prog(t), e = 0.5 * p + 0.5 * ease.inOut3(p);
    const th = -0.55 + 0.36 * e;
    const r = 0.36 - 0.05 * e;
    const pos = [F[0] + Math.sin(th) * r, F[1] + 0.002 - 0.012 * e + 0.003 * Math.sin(t * 0.7), F[2] - Math.cos(th) * r];
    // the fruit sits left of centre: aim a little to its right (screen right is cross(view, up))
    const v = [F[0] - pos[0], 0, F[2] - pos[2]], l = Math.hypot(v[0], v[2]);
    const right = [-v[2] / l, 0, v[0] / l];
    const off = 0.045;
    return { pos, target: [F[0] + right[0] * off, F[1] - 0.006, F[2] + right[2] * off], fov: 24, roll: -0.03 + 0.04 * e, focus: r - FR_NEAR, aperture: 0.004 };
  };
  const FR_NEAR = 0.036;
  return {
    name: 's16-beauty', from: P.from, to: P.to,
    frag: WORLD_GLSL + FRUIT_GLSL + /* glsl */ `
uniform float uFocus, uAper;
vec3 shade(vec2 fc) {
  vec3 ro; vec3 rd = lensRay(fc, uFocus, uAper, ro);
  vec3 bg = bokehBG(rd, 1.0, 1.5);
  int id, li;
  gNear = 0.15;
  float t = sprayTrace(ro, rd, 2.0, id, li);
  gNear = 0.0;
  if (t < 0.0) return bg;
  vec3 p = ro + rd * t;
  return shadeSpray(p, rd, id, li, bokehBG(reflect(rd, sprayNormal(p)), 1.0, 0.6), 1.0);
}`,
    uniforms: { ...WORLD_UNIFORMS, ...FRUIT_UNIFORMS, uSprayO: O, uSprayYaw: 0.7, uDew: 1.0, uLeafN: 7, uFocus: 0.2, uAper: 0.0035 },
    camera: cam,
    textPlane(t, c) { return cameraPlane(c, { width: 1, dist: 1, aspect: 16 / 9 }); },
    update(t, u) {
      const c = cam(t), p = prog(t);
      u.uFocus.value = c.focus; u.uAper.value = c.aperture;
      u.uSpin.value = 0.9 * p + 0.2;
      u.uRun.value = Math.min(1, Math.max(0, (p - 0.15) / 0.8));
      u.uShiverM.value = 0.05;
    },
    post(t) { return grade(t, { exposure: 1.0, bloom: 0.2, threshold: 0.9, contrast: 1.08, saturation: 1.08, vignette: 0.5 }); },
    finish(t) { return { leak: { ...FINISH.film.leak, amount: 0.12 }, grade: { shadows: [0.03, 0.015, 0.0], highlights: [1.0, 0.93, 0.8], amount: 0.3 } }; },
  };
};
