// The words of s45-earth, high on the left over the plain beside the figure. The first line alone in
// one row; when the second begins it takes its place in two rows, "from which you came." over
// "For you are EARTH", so the dust capitals close the thought.
import { lyricModule, setLine, outFade } from '/song/lib/type.js';
export default lyricModule((ctx, t, P, lines) => {
  const [A, B] = lines;
  if (A && t >= A.start - 0.1) {
    const a = B ? outFade(t, B.start - 0.25, B.start + 0.02) : outFade(t, P.to - 0.25, P.to);
    if (a > 0) setLine(ctx, A, t, { x: 260, y: 600, px: 150, align: 'left', alpha: a });
  }
  if (B && t >= B.start - 0.1) {
    const a = outFade(t, P.to - 0.06, P.to);
    const k = B.words.findIndex((w) => /^for$/i.test(w.w));
    setLine(ctx, B.words.slice(0, k), t, { x: 260, y: 600, px: 150, align: 'left', alpha: a });
    setLine(ctx, B.words.slice(k), t, { x: 260, y: 820, px: 150, align: 'left', alpha: a });
  }
});
