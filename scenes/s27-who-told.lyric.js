// The words of s27: God's question, one line low over the dark water below the star, in the warm
// capitals; NAKED keeps the cold italic.
import { lyricModule, linesAt, setLine, outFade } from '/song/lib/type.js';
export default lyricModule((ctx, t, P) => {
  const [L] = linesAt(P.from - 2.5, 'Who told you');
  if (t > L.start - 0.1) setLine(ctx, L.words, t, { x: 1920, y: 1700, px: 170, align: 'center', alpha: outFade(t, P.to - 0.25, P.to - 0.03), rise: 20 });
}, { shade: 0.3 });
