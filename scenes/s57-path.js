// s57-path: "to keep the path / to the tree of life."
// The ending. From above the turning sword the camera keeps creeping forward up the path, between the
// two cherubim, toward the gorge of the gate; through it the path runs on into the glowing garden to
// the tree of life, far off on its rise, hung with light. On the last sung note a single small star
// rises above the far horizon beyond the gate. Then the world goes dark around it: the cherubim, the
// fire, the garden fade to black and the star is the last light, gone with the last sound.
import { grade, ease, clamp01, drift, linesAt, wordIn } from '/song/lib/look.js';
import { exileScene } from '/song/lib/x-exile-scene.js';
import { lerp, lerp3 } from '/song/lib/x-exile.js';
import { SWORD_C, swordAngle } from '/song/scenes/s55-cherubs.js';
export const kind = 'shader';

export default (P) => {
  const [A, B] = linesAt(P.from - 0.6, 'to keep the path', 'to the tree of life');
  const tLife = wordIn(B, 'life').start;
  // the sword ignited on "turning" in the shot before; keep its turn continuous across the cut
  const [S] = linesAt(P.from - 12, 'and the turning sword');
  const tTurn = wordIn(S, 'turning').start;
  const D = P.to - P.from;
  const dim = (t) => 1 - 0.78 * ease.inOut3(clamp01((t - (P.to - 3.6)) / 2.4));
  const cam = (t) => {
    const k = clamp01((t - P.from) / D);
    const e = 1 - Math.pow(1 - k, 1.4);          // never stops: a slow creep that eases but keeps going
    const d = drift(t, 0.02);
    const pos = lerp3([0.0, 10.0, -13.0], [0.0, 6.5, -3.5], e);
    const target = lerp3([0.0, 16.0, 300.0], [-2.0, 22.0, 300.0], ease.inOut3(k));
    return { pos: [pos[0] + d[0], pos[1] + d[1], pos[2]], target, fov: lerp(40, 31, e), focus: 300, aperture: 0.0 };
  };
  return exileScene(P, {
    name: 's57-path', cam,
    set: (t) => {
      const r = ease.out3(clamp01((t - tLife + 0.1) / 2.6));
      return {
        uGlow: 1.0, uLife: 1.0 + 0.3 * ease.inOut3(clamp01((t - tLife) / 2.0)),
        uCherub: 1.0, uUnfold: 1.0,
        uSword: 1.0, uSwordAng: swordAngle(t, tTurn - 0.15), uSwordC: SWORD_C,
        uStar: clamp01((t - tLife + 0.1) / 0.9) * (1 + 0.04 * Math.sin(t * 7.3) * Math.sin(t * 3.1)),
        uStarY: lerp(-60, 560, r),
        uDim: dim(t),
      };
    },
    post: (t) => grade(t, { exposure: 3.0, bloom: 0.15, threshold: 0.9, contrast: 1.06, saturation: 1.03, vignette: 0.55, lift: [0.003, 0.003, 0.008].map((v) => v * dim(t)), grain: 0.018 }),
    finish: (t) => ({
      flare: { amount: 0.04, threshold: 1.2, tint: [1.0, 0.85, 0.7], length: 0.2 },
      grade: { shadows: [0.0, 0.012, 0.05], highlights: [1.0, 0.93, 0.8], amount: 0.5 },
      fade: ease.inOut3(clamp01((t - (P.to - 1.9)) / 1.85)),
    }),
  });
};
