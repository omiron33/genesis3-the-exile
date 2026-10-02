// The words of s28-forbade: God's question in tall warm capitals in the cold sky, low over the dark
// land, left of the broken stem: the two lines stack and the second, the one that names the tree,
// is larger.
import { linesAt, setLine, outFade } from '/song/lib/type.js';
import { cameraPlane } from '/engine.js';

export default (P) => {
  const [A, B] = linesAt(P.from - 0.6, 'Did you take', 'from the tree');
  return {
    textSize: [3840, 2160],
    shade: 0.6,
    textPlane(t, cam) { return cameraPlane(cam, { width: 1, dist: 1, aspect: 16 / 9 }); },
    drawText(ctx, t) {
      const end = outFade(t, P.to - 0.25, P.to - 0.02);
      if (end <= 0) return;
      if (t > A.start - 0.15) setLine(ctx, A, t, { x: 280, y: 1600, px: 140, align: 'left', alpha: end, rise: 16 });
      if (t > B.start - 0.15) setLine(ctx, B, t, { x: 280, y: 1880, px: 165, align: 'left', alpha: end, rise: 18 });
    },
  };
};
