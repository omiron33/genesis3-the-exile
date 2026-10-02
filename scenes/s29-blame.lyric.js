// The words of s29: the blame in two parts. "Adam said: The woman You gave / to live beside me handed
// me" high on the right over the dark tree line; then "its fruit; I ate." alone, low on the right
// over the grass where his shadow lies (FRUIT in the one red, LIVE lit gold).
import { lyricModule, linesAt, setLine, outFade } from '/song/lib/type.js';
export default lyricModule((ctx, t, P) => {
  const [L1, L2, L3] = linesAt(P.from - 2.5, 'Adam said', 'to live beside me', 'its fruit');
  const a = outFade(t, L3.start - 0.3, L3.start + 0.02);
  if (t > L1.start - 0.1) setLine(ctx, L1.words, t, { x: 3560, y: 420, px: 140, align: 'right', alpha: a, rise: 18 });
  if (t > L2.start - 0.1) setLine(ctx, L2.words, t, { x: 3560, y: 640, px: 140, align: 'right', alpha: a, rise: 18 });
  if (t > L3.start - 0.1) setLine(ctx, L3.words, t, { x: 3560, y: 1840, px: 190, align: 'right', alpha: outFade(t, P.to - 0.3, P.to - 0.03), rise: 24 });
}, { shade: 0.35 });
