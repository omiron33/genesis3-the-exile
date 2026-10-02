// s47-life: "Adam gave his wife the name Life, / for she was mother of all who live."
// First light on a hillside meadow, in time-lapse. We lie low in the wet grass looking up the slope;
// before sunrise all is blue shadow and dew, mist lying in the hollows. Just before "Life" the sun
// clears the crest: the light runs down the hill, and the flowers open after it, white anemones with
// gold hearts lit through from behind, dew glinting gold on every petal and blade. The near flowers in
// focus open last, as the second line sings of all who live. The camera creeps in through the grass.
import { grade, ease, drift, linesAt, wordIn, clamp01 } from '/song/lib/look.js';
import { MERCY_CORE, MERCY_UNIFORMS } from '/song/lib/x-mercy.js';
import { DAWN_GLSL, DAWN_SCENE_GLSL, DAWN_UNIFORMS } from '/song/lib/x-mercy-dawn.js';

export const kind = 'shader';

export default (P) => {
  const [A] = linesAt(P.from - 0.6, 'Adam gave his wife');
  const life = wordIn(A, 'life').start;
  // the sun clears the crest (17.5 degrees up, seen from here) just before "Life"; the first light
  // then runs down the slope to the near flowers by "live"
  const live = wordIn(linesAt(P.from - 0.6, 'Adam gave', 'for she was')[1], 'live').start;
  const tCrest = life - 0.3;
  const el = (t) => 0.2 + 0.02 * (t - tCrest);
  const rate = 33 / Math.max(1.2, live - 1.2 - tCrest);
  const cam = (t) => {
    const p = ease.inOut3(clamp01((t - P.from) / (P.to - P.from)));
    const d = drift(t, 0.002);
    return { pos: [0.02 + d[0], 0.2 + 0.015 * p + d[1], -0.42 + 0.14 * p], target: [-0.03, 1.2 + 0.05 * p, 8.0], fov: 32 };
  };
  return {
    name: 's47-life', from: P.from, to: P.to,
    frag: MERCY_CORE + DAWN_GLSL + DAWN_SCENE_GLSL + 'vec3 shade(vec2 fc) { return dawn(fc); }',
    uniforms: { ...MERCY_UNIFORMS, ...DAWN_UNIFORMS, uSunT0: tCrest, uSunRate: rate, uHeroClear: 0.75,
      // the three flowers nearest the lens: head offset (x, height, z) and scale
      uHero: [-0.075, 0.2, 0.06, 1.3,  0.1, 0.165, 0.24, 1.15,  -0.2, 0.235, 0.46, 1.05],
      uHeroT: [live - 0.95, live - 0.55, live - 1.3, 0], uAper: 0.005, uOpenK: 1.6 },
    camera: cam,
    update(t, u) {
      u.uSunEl.value = el(t);
      u.uDay.value = ease.inOut3(clamp01((t - P.from + 1.0) / (life + 1.5 - P.from + 1.0)));
      // focus: the near flowers, about a metre up the slope
      u.uFocus.value = 0.46 - 0.12 * ease.inOut3(clamp01((t - P.from) / (P.to - P.from)));
    },
    post(t) { const day = ease.inOut3(clamp01((t - tCrest + 0.5) / 3.0)); return grade(t, { exposure: 1.25 - 0.4 * day, bloom: 0.08, threshold: 1.4, saturation: 1.06, contrast: 1.04, vignette: 0.5, gain: [1.03, 1.0, 0.95] }); },
    finish(t) { return { flare: { amount: 0.06, threshold: 0.92, tint: [1.0, 0.75, 0.45], length: 0.3 }, grade: { shadows: [0.0, 0.01, 0.03], highlights: [1.0, 0.92, 0.78], amount: 0.35 } }; },
  };
};
