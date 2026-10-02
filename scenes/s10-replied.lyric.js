// The words of s10: one line low on the left, over the shadowed bark, clear of his body; a long breath
// between "The" and "serpent" (the singer holds it), so the line builds slowly.
import { lyricModule, setLine, outFade } from '/song/lib/type.js';
export default lyricModule((ctx, t, P, lines) => {
  const l = lines[0];
  if (!l || t < l.start - 0.1) return;
  setLine(ctx, l, t, { x: 280, y: 1860, px: 175, align: 'left', alpha: outFade(t, P.to - 0.3, P.to - 0.05), rise: 24 });
}, { shade: 0.35 });
