// The words of s49-one-of-us: God's words, set on the dark, away from the tree and its path of light
// (both on the right): the first line high on the left in the night sky, the second low on the left
// over the dark water, as the eye comes down to the water with the focus.
import { lyricModule, setLine, outFade } from '/song/lib/type.js';
export default lyricModule((ctx, t, P, lines) => {
  const [A, B] = lines;
  if (A && t >= A.start - 0.1) {
    const a = B ? outFade(t, B.start - 0.3, B.start + 0.02) : outFade(t, P.to - 0.25, P.to);
    if (a > 0) setLine(ctx, A, t, { x: 260, y: 470, px: 150, align: 'left', alpha: a });
  }
  if (B && t >= B.start - 0.1) setLine(ctx, B, t, { x: 260, y: 1800, px: 150, align: 'left', alpha: outFade(t, P.to - 0.25, P.to) });
});
