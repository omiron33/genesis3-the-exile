// The woman's answer, close and simple: "She answered him:" small and quiet in the narrator's bone
// upright at the top left over the shade of the leaves, then "We eat the fruit" larger in her warm
// italic beneath the figs, FRUIT in its red, settling as the focus is still on the bough.
import { linesIn, setLine, outFade } from '/song/lib/type.js';
import { cameraPlane } from '/engine.js';

export default (P) => {
  const words = linesIn(P).flatMap((l) => l.words);
  const k = words.findIndex((w) => /^we$/i.test(w.w));
  const A = words.slice(0, k), B = words.slice(k);
  return {
    textSize: [3840, 2160],
    shade: 0.5,
    textPlane(t, cam) { return cameraPlane(cam, { width: 1, dist: 1, aspect: 16 / 9 }); },
    drawText(ctx, t) {
      const a = outFade(t, P.to - 0.35, P.to - 0.02);
      const a1 = Math.min(a, outFade(t, B[0].start - 0.3, B[0].start + 0.2) * 0.5 + 0.5);
      setLine(ctx, A, t, { x: 1920, y: 1880, px: 120, align: 'center', alpha: a1, rise: 18 });
      setLine(ctx, B, t, { x: 1920, y: 2040, px: 150, align: 'center', alpha: a, rise: 18, glow: false });
    },
  };
};
