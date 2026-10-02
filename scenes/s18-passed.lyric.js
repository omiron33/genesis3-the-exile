// The words of s18-passed: the long line across the dark hill under the two figures (never over
// them); "he ate as well." alone afterwards, smaller, lower, beside the fallen fruit.
import { linesAt, setLine, outFade } from '/song/lib/type.js';
import { cameraPlane } from '/engine.js';

export default (P) => {
  const [A, B] = linesAt(P.from - 0.6, 'passed it to', 'he ate as well');
  return {
    textSize: [3840, 2160],
    shade: 0.5,
    textPlane(t, cam) { return cameraPlane(cam, { width: 1, dist: 1, aspect: 16 / 9 }); },
    drawText(ctx, t) {
      const end = outFade(t, P.to - 0.25, P.to - 0.02);
      const a1 = outFade(t, B.start - 0.3, B.start - 0.02);
      if (t > A.start - 0.15 && a1 > 0) setLine(ctx, A, t, { x: 1920, y: 1000, px: 120, align: 'center', alpha: a1, rise: 14 });
      if (t > B.start - 0.15 && end > 0) setLine(ctx, B, t, { x: 1920, y: 1000, px: 150, align: 'center', alpha: end, rise: 16 });
    },
  };
};
