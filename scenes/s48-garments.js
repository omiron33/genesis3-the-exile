// s48-garments: "The Lord God made garments of skin / for Adam and his wife / and clothed them."
// Dusk on a grassy rise; the sun has just gone behind the far hills. On a long lens, soft, the two
// stand close together, hand in hand, seen from behind: pure silhouettes against the afterglow, its
// light wrapping their edges, no faces. A warm light with no source gathers round them. On "clothed"
// a soft garment of skin comes down from above, as if laid by an unseen hand, and settles round his
// shoulders; on "them" a second settles round hers. Mercy, small and tender.
import { grade, ease, drift, linesAt, wordIn, clamp01, spring } from '/song/lib/look.js';
import { MERCY_CORE, MERCY_UNIFORMS } from '/song/lib/x-mercy.js';
import { GARMENT_GLSL, GARMENT_SCENE_GLSL, GARMENT_UNIFORMS } from '/song/lib/x-mercy-garment.js';
import { humanAtlas, humanGLSL, pose } from '/song/lib/x-human.js';

export const kind = 'shader';

export default async (P) => {
  // the man and the woman hand in hand in their fig-leaf girdles (MakeHuman figures, lib/x-human.js)
  const HA = await humanAtlas(['man-leaves-hold']), HB = await humanAtlas(['woman-leaves-hold']);
  const [A, , C] = linesAt(P.from - 0.6, 'The Lord God made garments', 'for Adam and his wife', 'and clothed them');
  const clothed = wordIn(C, 'clothed').start;
  const them = wordIn(C, 'them').start;
  // his garment settles on "clothed", hers on "them"; each comes down over about a second and a half
  const garmAt = (fall0, land) => (t) => {
    if (t <= fall0) return 0;
    const x = clamp01((t - fall0) / (land - fall0));
    // eased descent, then a soft spring as it takes the shoulders' weight
    return t < land ? ease.inOut3(x) * 0.985 : 0.985 + 0.015 * spring(t, land, 0.6, 0.5);
  };
  const land = clothed + 0.1, land2 = Math.max(them + 0.12, land + 0.3);
  const garm = garmAt(land - 1.7, land), garm2 = garmAt(land2 - 1.5, land2);
  const cam = (t) => {
    const p = ease.inOut3(clamp01((t - P.from) / (P.to - P.from)));
    const d = drift(t, 0.004);
    return { pos: [2.6 - 0.5 * p + d[0], 1.0 + 0.05 * p + d[1], -15.0 + 1.6 * p], target: [1.25 - 0.2 * p, 1.05, 0.0], fov: 13 };
  };
  return {
    name: 's48-garments', from: P.from, to: P.to,
    frag: '#define MG_HUMAN\n' + MERCY_CORE + humanGLSL(['uHumA', 'uHumB']) + GARMENT_GLSL + GARMENT_SCENE_GLSL + 'vec3 shade(vec2 fc) { return garments(fc); }',
    uniforms: { ...MERCY_UNIFORMS, ...GARMENT_UNIFORMS, uAper: 0.06, ...HA.uniforms('uHumA'), ...HB.uniforms('uHumB'),
      uManPose: pose(HA, 'man-leaves-hold'), uWomanPose: pose(HB, 'woman-leaves-hold') },
    camera: cam,
    update(t, u) {
      const c = cam(t);
      u.uFocus.value = Math.hypot(c.pos[0] - 0.0, c.pos[2] - 0.0);
      u.uGarm.value = garm(t);
      u.uGarm2.value = garm2(t);
      // the warm light gathers through the lines and deepens as they are clothed
      u.uMercy.value = 0.25 * ease.inOut3(clamp01((t - A.start) / 3.0)) + 0.75 * ease.inOut3(clamp01((t - C.start + 0.5) / (land - C.start + 1.5)));
    },
    post(t) { return grade(t, { exposure: 1.0, bloom: 0.2, threshold: 0.8, saturation: 1.05, contrast: 1.04, vignette: 0.5 }); },
    finish(t) { return { leak: { amount: 0.06, warm: [1.0, 0.55, 0.25], cool: [0.5, 0.3, 0.4], speed: 0.05 }, grade: { shadows: [0.01, 0.01, 0.03], highlights: [1.0, 0.9, 0.78], amount: 0.35 } }; },
  };
};
