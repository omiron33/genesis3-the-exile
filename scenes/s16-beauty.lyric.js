// The words of s16-beauty: set small and close to the fruit, on the right in the soft gold, the first
// line lingering as the music does; "something fair to ponder." beneath it, quieter.
import { linesAt, setLine, outFade } from '/song/lib/type.js';
import { cameraPlane } from '/engine.js';

export default (P) => {
  const [A, B] = linesAt(P.from - 0.6, 'beauty before', 'something fair');
  return {
    textSize: [3840, 2160],
    shade: 0.5,
    textPlane(t, cam) { return cameraPlane(cam, { width: 1, dist: 1, aspect: 16 / 9 }); },
    drawText(ctx, t) {
      const end = outFade(t, P.to - 0.22, P.to - 0.02);
      if (end <= 0) return;
      if (t > A.start - 0.15) setLine(ctx, A, t, { x: 1960, y: 1780, px: 160, align: 'left', alpha: end, rise: 16 });
      if (t > B.start - 0.15) setLine(ctx, B, t, { x: 2060, y: 1980, px: 125, align: 'left', alpha: end, rise: 14 });
    },
  };
};
