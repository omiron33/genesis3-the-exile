// The words of s26, Adam's answer from inside the leaves: the first two lines low on the left in his
// warm italic (NAKED and AFRAID in the cold one), then "and hid." alone, small, in the gap the
// leaves leave in the middle.
import { lyricModule, linesAt, setLine, outFade } from '/song/lib/type.js';
export default lyricModule((ctx, t, P) => {
  const [L1, L2, L3] = linesAt(P.from - 2.5, 'I heard You walking', 'naked, I was afraid', 'and hid');
  const a12 = outFade(t, L3.start - 0.35, L3.start + 0.02);
  if (t > L1.start - 0.1) setLine(ctx, L1.words, t, { x: 300, y: 1640, px: 150, align: 'left', alpha: a12, rise: 20 });
  if (t > L2.start - 0.1) setLine(ctx, L2.words, t, { x: 300, y: 1880, px: 180, align: 'left', alpha: a12, rise: 22 });
  if (t > L3.start - 0.1) setLine(ctx, L3.words, t, { x: 1920, y: 1880, px: 170, align: 'center', alpha: outFade(t, P.to - 0.3, P.to - 0.03), rise: 20 });
}, { shade: 0.55 });
