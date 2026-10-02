// s57-path words: "to keep the path" on the dark rock at the upper left; "to the tree of life."
// answering on the dark rock at the right, LIFE lit gold. They leave before the world goes dark, so
// the star is alone at the end.
import { lyricModule, setLine, outFade, wordIn } from '/song/lib/type.js';
export default lyricModule((ctx, t, P, lines) => {
  const [A, B] = lines;
  const end = B ? B.end : P.to - 4;
  const a = outFade(t, end + 0.6, end + 1.8);
  if (A) setLine(ctx, A, t, { x: 300, y: 620, px: 170, align: 'left', alpha: (t >= A.start - 0.1 ? 1 : 0) * a });
  if (B) setLine(ctx, B, t, { x: 3540, y: 1640, px: 200, align: 'right', alpha: (t >= B.start - 0.1 ? 1 : 0) * a });
});
