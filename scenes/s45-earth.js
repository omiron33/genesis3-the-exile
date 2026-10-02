// s45-earth: "till you go back to the earth / from which you came. For you are earth;"
// A man's long shadow on the cracked earth. The sun is low behind us in a hard white sky; he stands
// where we stand, out of frame, and his shadow runs away from our feet across the hardpan toward the
// shimmering horizon, breathing a little. The hot wind drives grains of dust across the ground from
// left to right, through the shadow and out of it, dark in the shade and glinting in the sun. The
// camera drifts slowly forward along the shadow as the wind rises toward the cut.
import { grade, ease, drift, linesAt, clamp01 } from '/song/lib/look.js';
import { MERCY_CORE, MERCY_UNIFORMS } from '/song/lib/x-mercy.js';
import { DUST_GLSL, DUST_UNIFORMS } from '/song/lib/x-mercy-dust.js';
import { EARTH_GLSL, EARTH_SCENE_GLSL, EARTH_UNIFORMS } from '/song/lib/x-mercy-earth.js';

export const kind = 'shader';

export const SUN45 = [0.22, 0.27, -1.0];
export default (P) => {
  const [, B] = linesAt(P.from - 0.6, 'till you go back', 'from which you came');
  const cam = (t) => {
    const p = ease.inOut3(clamp01((t - P.from) / (P.to - P.from)));
    const d = drift(t, 0.006);
    return { pos: [0.55 - 0.1 * p + d[0], 1.6 + d[1], -0.9 + 0.5 * p], target: [-0.9 + 0.2 * p, 0.0, 7.5], fov: 44 };
  };
  return {
    name: 's45-earth', from: P.from, to: P.to,
    frag: MERCY_CORE + DUST_GLSL + EARTH_GLSL + EARTH_SCENE_GLSL + 'vec3 shade(vec2 fc) { return earthScene(fc); }',
    uniforms: {
      ...MERCY_UNIFORMS, ...DUST_UNIFORMS, ...EARTH_UNIFORMS,
      uSun: SUN45, uSunCol: [9.5, 8.9, 7.8], uSkyZen: [0.46, 0.58, 0.8], uSkyHor: [1.45, 1.4, 1.32],
      uHaze: 0.0035, uAper: 0.004,
    },
    camera: cam,
    update(t, u) {
      const c = cam(t);
      u.uFocus.value = Math.hypot(c.pos[0] + 0.5, c.pos[1], c.pos[2] - 4.0);
      // the wind rises toward the second line and the cut
      u.uWindV.value = -1.2 - 0.9 * ease.inOut3(clamp01((t - B.start + 1.0) / (P.to - B.start + 1.0)));
      u.uStream.value = 0.75 + 0.45 * clamp01((t - P.from) / (P.to - P.from));
    },
    post(t) { return grade(t, { exposure: 0.8, bloom: 0.1, threshold: 1.1, saturation: 0.92, contrast: 1.12, vignette: 0.45 }); },
    finish(t) { return { grade: { shadows: [0.015, 0.01, 0.0], highlights: [1.0, 0.97, 0.9], amount: 0.3 } }; },
  };
};
