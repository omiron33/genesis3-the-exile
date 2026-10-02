// "from trees throughout the garden." One line, set as the camera crests the canopy, laid along the dark
// orchard rows on the right where the land runs away toward the far tree, clear of the sun on the left.
import { linesIn, setLine, outFade } from '/song/lib/type.js';
import { cameraPlane } from '/engine.js';

export default (P) => {
  const words = linesIn(P).flatMap((l) => l.words);
  const k = words.findIndex((w) => /^throughout/i.test(w.w));
  const A = words.slice(0, k), B = words.slice(k);
  return {
    textSize: [3840, 2160],
    shade: 0.5,
    textPlane(t, cam) { return cameraPlane(cam, { width: 1, dist: 1, aspect: 16 / 9 }); },
    drawText(ctx, t) {
      const a = outFade(t, P.to - 0.35, P.to - 0.02);
      setLine(ctx, A, t, { x: 3560, y: 1520, px: 168, align: 'right', alpha: a, rise: 20 });
      setLine(ctx, B, t, { x: 3560, y: 1750, px: 168, align: 'right', alpha: a, rise: 20 });
    },
  };
};
