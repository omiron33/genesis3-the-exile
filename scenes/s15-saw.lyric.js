// The words of s15-saw: one line, high on the left against the dark of the crown above her.
import { linesAt, setLine, outFade } from '/song/lib/type.js';
import { cameraPlane } from '/engine.js';

export default (P) => {
  const [A] = linesAt(P.from - 0.6, 'She saw food');
  return {
    textSize: [3840, 2160],
    shade: 0.5,
    textPlane(t, cam) { return cameraPlane(cam, { width: 1, dist: 1, aspect: 16 / 9 }); },
    drawText(ctx, t) {
      const end = outFade(t, P.to - 0.22, P.to - 0.02);
      if (end > 0 && t > A.start - 0.15) setLine(ctx, A, t, { x: 280, y: 440, px: 165, align: 'left', alpha: end, rise: 18 });
    },
  };
};
