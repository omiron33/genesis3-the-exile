// The words of s24, the held breath: "and hid" low on the left among the leaves, HID large in the
// cold italic; "within the trees." comes small and late, low on the right, as if from further in.
import { lyricModule, linesAt, setLine, outFade } from '/song/lib/type.js';
export default lyricModule((ctx, t, P) => {
  const [L] = linesAt(P.from - 2.5, 'and hid within');
  const cut = L.words.findIndex((w) => /^within/i.test(w.w));
  const A = L.words.slice(0, cut), B = L.words.slice(cut);
  const a = outFade(t, P.to - 0.45, P.to - 0.03);
  if (t > A[0].start - 0.1) setLine(ctx, A, t, { x: 330, y: 1700, px: 230, align: 'left', alpha: a, rise: 28 });
  if (t > B[0].start - 0.1) setLine(ctx, B, t, { x: 3500, y: 1930, px: 150, align: 'right', alpha: a * 0.95, rise: 18 });
}, { shade: 0.5 });
