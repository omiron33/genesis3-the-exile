// The words of s17-plucked: one line, struck in on the beat low across the frame as the leaves fall.
import { linesAt, setLine, outFade } from '/song/lib/type.js';
import { cameraPlane } from '/engine.js';

export default (P) => {
  const [A] = linesAt(P.from - 0.6, 'She plucked');
  return {
    textSize: [3840, 2160],
    shade: 0.55,
    textPlane(t, cam) { return cameraPlane(cam, { width: 1, dist: 1, aspect: 16 / 9 }); },
    drawText(ctx, t) {
      const end = outFade(t, P.to - 0.18, P.to - 0.02);
      if (end > 0 && t > A.start - 0.15) setLine(ctx, A, t, { x: 1920, y: 1860, px: 175, align: 'center', alpha: end, rise: 10 });
    },
  };
};
