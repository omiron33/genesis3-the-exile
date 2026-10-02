// The serpent's question, in its oily green-gold italic, set low on the left in the long shadow the
// row throws toward us, well away from the sun burning through the crowns: "Did God close" and then,
// beneath and further in, "every garden tree to you?" as the trees keep passing.
import { linesIn, setLine, outFade } from '/song/lib/type.js';
import { cameraPlane } from '/engine.js';

export default (P) => {
  const words = linesIn(P).flatMap((l) => l.words);
  const k = words.findIndex((w) => /^every/i.test(w.w));
  const A = words.slice(0, k), B = words.slice(k);
  return {
    textSize: [3840, 2160],
    shade: 0.5,
    textPlane(t, cam) { return cameraPlane(cam, { width: 1, dist: 1, aspect: 16 / 9 }); },
    drawText(ctx, t) {
      const a = outFade(t, P.to - 0.35, P.to - 0.02);
      setLine(ctx, A, t, { x: 300, y: 1690, px: 172, align: 'left', alpha: a, rise: 22 });
      setLine(ctx, B, t, { x: 420, y: 1915, px: 172, align: 'left', alpha: a, rise: 22 });
    },
  };
};
