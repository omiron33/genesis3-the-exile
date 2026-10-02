// The words of s09-lest: "lest we" small and low, and DIE in ash capitals beneath them, on the dark
// slope under the sun, as the cloud's shadow arrives.
import { linesAt, inscribe, outFade } from '/song/lib/type.js';
import { cameraPlane } from '/engine.js';

export default (P) => {
  const [L] = linesAt(P.from - 0.6, 'lest we die');
  return {
    textSize: [3840, 2160],
    shade: 0.55,
    textPlane(t, cam) { return cameraPlane(cam, { width: 1, dist: 1, aspect: 16 / 9 }); },
    drawText(ctx, t) {
      const a = outFade(t, P.to - 0.2, P.to - 0.02);
      if (a > 0 && t > L.start - 0.15) inscribe(ctx, L.words, t, { x: 1920, y: 1880, small: 190, big: 300, alpha: a });
    },
  };
};
