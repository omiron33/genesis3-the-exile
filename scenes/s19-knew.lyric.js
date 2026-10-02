// The words of s19: low on the right over the grass, away from the two small figures; the first line
// waits while the gold drains, and "nakedness" lands larger in the cold italic beneath it. "They
// joined" belongs to the next shot, where the leaves are.
import { lyricModule, linesAt, setLine, outFade } from '/song/lib/type.js';
export default lyricModule((ctx, t, P) => {
  const [L1, L2] = linesAt(P.from - 2.5, 'Then both could see', 'their nakedness');
  const cut = L2.words.findIndex((w) => /^they/i.test(w.w));
  const B = cut > 0 ? L2.words.slice(0, cut) : L2.words;
  const a = outFade(t, P.to - 0.3, P.to - 0.03);
  if (t > L1.start - 0.1) setLine(ctx, L1.words, t, { x: 3560, y: 1560, px: 150, align: 'right', alpha: a, rise: 20 });
  if (t > B[0].start - 0.1) setLine(ctx, B, t, { x: 3560, y: 1850, px: 210, align: 'right', alpha: a, rise: 26 });
}, { shade: 0.55 });
