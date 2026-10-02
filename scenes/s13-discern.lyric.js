// The words of s13-discern: "Like gods you will discern" across the dark crown at the top; then the
// division is set on the water itself: "what is good" low on the left over the lit tree, "and what is
// evil." low on the right over the black one.
import { linesAt, setLine, outFade } from '/song/lib/type.js';
import { cameraPlane } from '/engine.js';

export default (P) => {
  const [A, B] = linesAt(P.from - 0.6, 'Like gods', 'what is good');
  const cut = B.words.findIndex((w) => /^and$/i.test(w.w));
  const G = { words: B.words.slice(0, cut) }, Ev = { words: B.words.slice(cut) };
  return {
    textSize: [3840, 2160],
    shade: 0.55,
    textPlane(t, cam) { return cameraPlane(cam, { width: 1, dist: 1, aspect: 16 / 9 }); },
    drawText(ctx, t) {
      const end = outFade(t, P.to - 0.25, P.to - 0.02);
      if (end <= 0) return;
      const a1 = Math.min(end, outFade(t, B.start + 1.2, B.start + 1.8));
      if (t > A.start - 0.15 && a1 > 0) setLine(ctx, A, t, { x: 1920, y: 330, px: 160, align: 'center', alpha: a1, rise: 18 });
      if (t > B.start - 0.15) {
        setLine(ctx, G, t, { x: 300, y: 1900, px: 170, align: 'left', alpha: end, rise: 20 });
        setLine(ctx, Ev, t, { x: 3540, y: 1900, px: 170, align: 'right', alpha: end, rise: 20 });
      }
    },
  };
};
