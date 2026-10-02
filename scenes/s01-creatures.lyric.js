// The words of s01: the good creation, set low on the left over the dark of the near grass, two short
// lines (the creatures / the Lord God who formed them), leaving the sky to the birds and the right of
// frame to the tree the camera is drifting toward.
import { linesIn, setLine, outFade } from '/song/lib/type.js';
import { cameraPlane } from '/engine.js';

export default (P) => {
  const lines = linesIn(P);
  const words = lines.flatMap((l) => l.words);
  const split = words.findIndex((w, i) => i > 0 && /^the$/i.test(w.w) && i > 2);
  const A = split > 0 ? words.slice(0, split) : words, B = split > 0 ? words.slice(split) : [];
  return {
    textSize: [3840, 2160],
    shade: 0.55,
    textPlane(t, cam) { return cameraPlane(cam, { width: 1, dist: 1, aspect: 16 / 9 }); },
    drawText(ctx, t) {
      const a = outFade(t, P.to - 0.35, P.to - 0.02);
      setLine(ctx, A, t, { x: 300, y: 1640, px: 176, align: 'left', alpha: a, rise: 24 });
      if (B.length) setLine(ctx, B, t, { x: 300, y: 1880, px: 176, align: 'left', alpha: a, rise: 24 });
    },
  };
};
