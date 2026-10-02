// 09 · "lest we die."
// Low on the hillside under the tree's rim, looking out toward the low sun: a bough of the tree hangs
// down into the frame and one fruit hangs from it right across the sun, a dark round silhouette with
// a thin red ring of light. A cloud crosses the sun: its shadow runs up the slope toward us, the sun
// goes dull and the light goes out of everything. The leaves barely stir; the shadow keeps moving.
import { grade, ease, keys, linesAt, wordIn } from '/song/lib/look.js';
import { WORLD_GLSL, WORLD_UNIFORMS } from '/song/lib/x-tree-world.js';
import { FRUIT_GLSL, FRUIT_UNIFORMS } from '/song/lib/x-tree-fruit.js';
import { cameraPlane } from '/engine.js';

export const kind = 'shader';
const nrm = (v) => { const l = Math.hypot(...v); return v.map((x) => x / l); };

export default (P) => {
  const [L] = linesAt(P.from - 0.6, 'lest we die');
  const die = wordIn(L, 'die').start;
  const prog = (t) => Math.min(1, Math.max(0, (t - P.from) / (P.to - P.from)));
  const S = nrm(WORLD_UNIFORMS.uSunDir);
  const C0 = [-2.5, 8.5, 10.0];
  const d = 1.25;
  const FC = [C0[0] + S[0] * d - 0.0, C0[1] + S[1] * d - 0.12, C0[2] + S[2] * d];
  const H = [FC[0], FC[1] + 0.081, FC[2]];
  const cam = (t) => {
    const p = prog(t);
    // a slow drift that carries the fruit a little across the sun
    const pos = [C0[0] + 0.035 - 0.07 * p, C0[1] + 0.004 * Math.sin(t * 0.8), C0[2] - 0.05 * p];
    const tgt = [C0[0] + S[0] * 4 + 0.35, C0[1] + S[1] * 4 - 0.6, C0[2] + S[2] * 4];
    return { pos, target: tgt, fov: 36, roll: -0.01 };
  };
  return {
    name: 's09-lest', from: P.from, to: P.to,
    frag: WORLD_GLSL + FRUIT_GLSL + /* glsl */ `
uniform float uFocus, uAper;
vec3 shade(vec2 fc) {
  vec3 ro; vec3 rd = lensRay(fc, uFocus, uAper, ro);
  float jit = hash12(fc + fract(uTime * 7.31) * 57.0);
  int id, li;
  float ts = sprayTrace(ro, rd, 20.0, id, li);
  if (ts > 0.0) {
    vec3 p = ro + rd * ts;
    float ws = cloudShadow(p) * (1.0 - uSunCover);
    return shadeSpray(p, rd, id, li, sky(reflect(rd, sprayNormal(p))) * 0.25, ws);
  }
  float depth;
  return gardenScene(ro, rd, jit, depth);
}`,
    uniforms: { ...WORLD_UNIFORMS, ...FRUIT_UNIFORMS, uTreeWind: 0.03, uGrass: 1, uGrassFar: 8, uCloudSh: 0.0, uCloudX: -40, uSunCover: 0,
      uSprayO: H, uSprayYaw: 2.6, uLift: -0.35, uBoughTo: [H[0] + 0.6, H[1] + 1.4, H[2] - 1.6], uLeafN: 12, uAmbK: 0.3, uFocus: 1.25, uAper: 0.006 },
    camera: cam,
    textPlane(t, c) { return cameraPlane(c, { width: 1, dist: 1, aspect: 16 / 9 }); },
    update(t, u) {
      // the cloud's edge sweeps up the slope toward the tree through "lest we", reaching us on "die"
      u.uCloudSh.value = 0.85;
      u.uCloudX.value = keys(t, [[P.from, 40], [die + 0.1, 0], [P.to, -8]], (x) => x);
      u.uSunCover.value = keys(t, [[P.from, 0], [die - 0.5, 0.1], [die + 0.3, 0.85, ease.inOut3], [P.to, 0.9]]);
      u.uShiverM.value = 0.03;
      u.uSpin.value = 0.05 * Math.sin(t * 0.7);
    },
    post(t) { return grade(t, { exposure: 0.9, bloom: 0.1, threshold: 1.2, contrast: 1.06 }); },
    finish(t) { return { flare: { amount: 0.05, threshold: 0.95, tint: [1.0, 0.75, 0.5], length: 0.35 }, grade: { shadows: [0.01, 0.01, 0.02], highlights: [1.0, 0.95, 0.88], amount: 0.25 } }; },
  };
};
