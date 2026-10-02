// s55-cherubs: "He stationed cherubs there, / and the turning sword of fire"
// One continuous shot at the east gate. Low on the plain, looking up: either side of the gorge the
// cherubim take form out of fire, each a towering body of flame wrapped in six layered wings (two over
// the head, two spread, two over the feet), eyes on the wings, flame streaming off every feather. As
// the words turn to the sword, the camera sinks between them and the turning sword ignites before the
// gate: a wheel of fire with four blades, throwing sparks. Then the camera rises over the flame toward
// the path (the cut to s57 continues the climb).
import { grade, ease, clamp01, drift, linesAt, wordIn, spring } from '/song/lib/look.js';
import { exileScene } from '/song/lib/x-exile-scene.js';
import { groundH, lerp, lerp3 } from '/song/lib/x-exile.js';
export const kind = 'shader';

export const SWORD_C = [0, 4.6, -10.5];
// the wheel's turn: it spins up from the ignition and keeps a steady, heavy turning
export function swordAngle(t, t0) {
  const x = Math.max(0, t - t0);
  const w = 3.4;                                   // rad/s at full speed
  return -(w * (x - 0.55 * (1 - Math.exp(-x / 0.55))));
}

export default (P) => {
  const [L1, L2] = linesAt(P.from - 0.6, 'He stationed cherubs', 'and the turning sword');
  const tTurn = wordIn(L2, 'turning').start;
  const tSword = wordIn(L2, 'sword').start;
  const unfold = (t) => ease.inOut3(clamp01((t - P.from - 0.05) / 2.6));
  const ignite = (t) => clamp01((t - tTurn + 0.15) / 0.45);
  const cam = (t) => {
    const d = drift(t, 0.02);
    // A: low and wide, looking up as they unfold
    const a = ease.inOut3(clamp01((t - P.from) / (tTurn - 0.5 - P.from)));
    const A = { pos: lerp3([1.5, 2.6, -42], [0.6, 2.4, -33], a), target: lerp3([0, 11.5, -6], [0, 10.0, -6], a) };
    // B: sink in toward the wheel as it ignites
    const b = ease.inOut3(clamp01((t - tTurn + 0.5) / 1.9));
    const B = { pos: [0.0, 2.0, -25.0], target: [0.0, 5.6, -10.5] };
    // C: rise over the flame toward the path
    const c = ease.inOut3(clamp01((t - tSword - 0.55) / (P.to - tSword - 0.55)));
    const C = { pos: [0.0, 8.5, -31.0], target: [0.0, 13.0, 300.0] };
    let pos = lerp3(A.pos, B.pos, b), target = lerp3(A.target, B.target, b);
    pos = lerp3(pos, C.pos, c); target = lerp3(target, C.target, c);
    pos[1] = Math.max(pos[1], groundH(pos[0], pos[2]) + 1.2);
    const fov = lerp(lerp(50, 46, b), 40, c);
    return { pos: [pos[0] + d[0], pos[1] + d[1], pos[2]], target, fov, focus: Math.hypot(pos[0], pos[1] - 5, pos[2] + 10.5), aperture: 0.02 };
  };
  return exileScene(P, {
    name: 's55-cherubs', cam,
    set: (t) => {
      const ig = ignite(t);
      return {
        uGlow: 1.0, uLife: 0.6,
        uCherub: clamp01((t - P.from + 0.1) / 0.5), uUnfold: unfold(t),
        uSword: ig > 0 ? ig * (1 + 0.6 * Math.exp(-Math.max(0, t - tTurn - 0.2) / 0.25)) : 0,
        uSwordAng: swordAngle(t, tTurn - 0.15), uSwordC: SWORD_C,
      };
    },
    post: (t) => grade(t, { exposure: 2.7, bloom: 0.22, threshold: 0.8, contrast: 1.06, saturation: 1.04, vignette: 0.5, lift: [0.004, 0.004, 0.01], grain: 0.018 }),
    finish: (t) => ({ flare: { amount: 0.08, threshold: 1.0, tint: [1.0, 0.62, 0.35], length: 0.3 }, grade: { shadows: [0.0, 0.012, 0.05], highlights: [1.0, 0.92, 0.78], amount: 0.5 } }),
  });
};
