// The words of s08-touch: the command, quietly. "God told us not to eat its fruit," high on the left
// over the dark of the leaves; "not even to touch it," low on the right, nearer, as the leaves shiver.
import { linesAt, setLine, outFade } from '/song/lib/type.js';
import { cameraPlane } from '/engine.js';

export default (P) => {
  const [A, B] = linesAt(P.from - 0.6, 'God told us', 'not even to touch');
  return {
    textSize: [3840, 2160],
    shade: 0.5,
    textPlane(t, cam) { return cameraPlane(cam, { width: 1, dist: 1, aspect: 16 / 9 }); },
    drawText(ctx, t) {
      const end = outFade(t, P.to - 0.25, P.to - 0.02);
      const a1 = Math.min(end, outFade(t, B.start + 1.6, B.start + 2.2));
      if (t > A.start - 0.15 && a1 > 0) setLine(ctx, A, t, { x: 260, y: 470, px: 150, align: 'left', alpha: a1, rise: 18 });
      if (t > B.start - 0.15 && end > 0) setLine(ctx, B, t, { x: 3580, y: 1880, px: 175, align: 'right', alpha: end, rise: 20 });
    },
  };
};
