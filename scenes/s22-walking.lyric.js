// "the Lord God walking through the garden." The Name is given the voice's own tall warm capitals
// (THE LORD GOD, carrying a little light) low on the left over the dark grass and trunks; "walking
// through the garden" follows beneath in the narrator's quiet bone, while the light itself walks
// toward us on the right of frame.
import { linesIn, setLine, outFade } from '/song/lib/type.js';
import { cameraPlane } from '/engine.js';

export default (P) => {
  const words = linesIn(P).flatMap((l) => l.words);
  const k = words.findIndex((w) => /^walking/i.test(w.w));
  const A = words.slice(0, k), B = words.slice(k);
  return {
    textSize: [3840, 2160],
    shade: 0.55,
    textPlane(t, cam) { return cameraPlane(cam, { width: 1, dist: 1, aspect: 16 / 9 }); },
    drawText(ctx, t) {
      const a = outFade(t, P.to - 0.3, P.to - 0.02);
      setLine(ctx, A, t, { x: 280, y: 1640, px: 230, align: 'left', alpha: a, rise: 24, voice: 'god' });
      setLine(ctx, B, t, { x: 290, y: 1860, px: 150, align: 'left', alpha: a, rise: 18 });
    },
  };
};
