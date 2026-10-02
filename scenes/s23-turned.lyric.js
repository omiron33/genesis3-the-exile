// The words of s23: one line broken in two over the dark crowns, upper left, away from the light:
// "Adam and his wife" waits; "turned from His face" lands beneath it as they turn.
import { lyricModule, linesAt, setLine, outFade } from '/song/lib/type.js';
export default lyricModule((ctx, t, P) => {
  const [L] = linesAt(P.from - 2.5, 'Adam and his wife');
  const cut = L.words.findIndex((w) => /^turned/i.test(w.w));
  const A = L.words.slice(0, cut), B = L.words.slice(cut);
  const a = outFade(t, P.to - 0.3, P.to - 0.03);
  if (t > A[0].start - 0.1) setLine(ctx, A, t, { x: 300, y: 430, px: 160, align: 'left', alpha: a, rise: 20 });
  if (t > B[0].start - 0.1) setLine(ctx, B, t, { x: 300, y: 650, px: 160, align: 'left', alpha: a, rise: 20 });
}, { shade: 0.5 });
