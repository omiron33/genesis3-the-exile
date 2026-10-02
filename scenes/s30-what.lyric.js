// The words of s30: high on the left over the dark crowns, away from her. The narration quietly,
// then God's question beneath it in the tall warm capitals.
import { lyricModule, linesAt, setLine, outFade } from '/song/lib/type.js';
export default lyricModule((ctx, t, P) => {
  const [L1, L2] = linesAt(P.from - 2.5, 'To the woman God said', 'What have you done');
  const a = outFade(t, P.to - 0.3, P.to - 0.03);
  if (t > L1.start - 0.1) setLine(ctx, L1.words, t, { x: 300, y: 400, px: 130, align: 'left', alpha: a, rise: 18 });
  if (t > L2.start - 0.1) setLine(ctx, L2.words, t, { x: 300, y: 680, px: 230, align: 'left', alpha: a, rise: 28 });
}, { shade: 0.55 });
