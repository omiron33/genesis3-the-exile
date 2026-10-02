// The words of s07-center: the line is split where the voice leans, "Only the tree at its center"
// low on the left over the shadowed bank, then "is barred." set larger beneath it, alone, as the
// sentence closes like a gate.
import { linesAt, setLine, outFade } from '/song/lib/type.js';
import { cameraPlane } from '/engine.js';

export default (P) => {
  const [L] = linesAt(P.from - 0.6, 'Only the tree');
  const cut = L.words.findIndex((w) => /^is$/i.test(w.w));
  const A = { words: L.words.slice(0, cut) }, B = { words: L.words.slice(cut) };
  return {
    textSize: [3840, 2160],
    shade: 0.5,
    textPlane(t, cam) { return cameraPlane(cam, { width: 1, dist: 1, aspect: 16 / 9 }); },
    drawText(ctx, t) {
      const a = outFade(t, P.to - 0.22, P.to - 0.02);
      if (a <= 0) return;
      setLine(ctx, A, t, { x: 280, y: 1640, px: 150, align: 'left', alpha: a, rise: 18 });
      setLine(ctx, B, t, { x: 280, y: 1880, px: 210, align: 'left', alpha: a, rise: 22 });
    },
  };
};
