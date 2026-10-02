// The words of s12-awake: the serpent's promise in its oily italic, laid low on the left under the
// dark crown, the second line stepping in from further right as if the eye were opening.
import { linesAt, setLine, outFade } from '/song/lib/type.js';
import { cameraPlane } from '/engine.js';

export default (P) => {
  const [A, B] = linesAt(P.from - 0.6, 'God knows the day', 'your eyes will');
  return {
    textSize: [3840, 2160],
    shade: 0.55,
    textPlane(t, cam) { return cameraPlane(cam, { width: 1, dist: 1, aspect: 16 / 9 }); },
    drawText(ctx, t) {
      const end = outFade(t, P.to - 0.25, P.to - 0.02);
      if (end <= 0) return;
      if (t > A.start - 0.15) setLine(ctx, A, t, { x: 260, y: 1560, px: 150, align: 'left', alpha: end, rise: 18 });
      if (t > B.start - 0.15) setLine(ctx, B, t, { x: 700, y: 1820, px: 175, align: 'left', alpha: end, rise: 20 });
    },
  };
};
