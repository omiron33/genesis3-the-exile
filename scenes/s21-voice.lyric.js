// "That afternoon they heard His voice," set low on the right over the dark of the near grass, the
// way the wave is coming: a short first line, then the hearing, leaving the warm light above the
// trees clear.
import { linesIn, setLine, outFade } from '/song/lib/type.js';
import { cameraPlane } from '/engine.js';

export default (P) => {
  const words = linesIn(P).flatMap((l) => l.words);
  const k = words.findIndex((w) => /^they$/i.test(w.w));
  const A = words.slice(0, k), B = words.slice(k);
  return {
    textSize: [3840, 2160],
    shade: 0.55,
    textPlane(t, cam) { return cameraPlane(cam, { width: 1, dist: 1, aspect: 16 / 9 }); },
    drawText(ctx, t) {
      const a = outFade(t, P.to - 0.3, P.to - 0.02);
      setLine(ctx, A, t, { x: 3560, y: 1620, px: 160, align: 'right', alpha: a, rise: 20 });
      setLine(ctx, B, t, { x: 3560, y: 1850, px: 178, align: 'right', alpha: a, rise: 20 });
    },
  };
};
