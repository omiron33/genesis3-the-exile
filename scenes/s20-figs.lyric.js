// The words of s20: high on the left in the out-of-focus garden above the leaves. "They joined" (the
// end of the last line) and "the leaves of figs by hand" make the first pair; "and wrapped
// themselves." comes alone, a little lower and to the right, as the leaves close.
import { lyricModule, linesAt, setLine, outFade } from '/song/lib/type.js';
export default lyricModule((ctx, t, P) => {
  const [L0, L1, L2] = linesAt(P.from - 6, 'their nakedness', 'the leaves of figs', 'and wrapped themselves');
  const cut = L0.words.findIndex((w) => /^they/i.test(w.w));
  const A = cut >= 0 ? L0.words.slice(cut) : [];
  const a1 = outFade(t, L2.start - 0.3, L2.start + 0.02);
  if (A.length) setLine(ctx, A, t, { x: 300, y: 430, px: 130, align: 'left', alpha: a1, rise: 18, voice: 'quiet' });
  if (t > L1.start - 0.1) setLine(ctx, L1.words, t, { x: 300, y: 660, px: 170, align: 'left', alpha: a1, rise: 22 });
  if (t > L2.start - 0.1) setLine(ctx, L2.words, t, { x: 520, y: 600, px: 190, align: 'left', alpha: outFade(t, P.to - 0.3, P.to - 0.03), rise: 24 });
}, { shade: 0.5 });
