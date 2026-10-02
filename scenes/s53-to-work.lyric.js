// s53-to-work words: the first line high in the dark sky at the left; the second answers it low on
// the dark ground at the right, EARTH in dust capitals, as he walks out onto it.
import { lyricModule, setLine, outFade } from '/song/lib/type.js';
export default lyricModule((ctx, t, P, lines) => {
  const [A, B] = lines;
  if (A) setLine(ctx, A, t, { x: 300, y: 400, px: 165, align: 'left', alpha: (t >= A.start - 0.1 ? 1 : 0) * outFade(t, P.to - 0.3, P.to - 0.02) });
  if (B) setLine(ctx, B, t, { x: 3540, y: 1900, px: 190, align: 'right', alpha: (t >= B.start - 0.1 ? 1 : 0) * outFade(t, P.to - 0.3, P.to - 0.02) });
});
