// The words of s44-sweat: one line low on the left, over the shaded foreground dust, so the drop
// falls through the clear middle of the frame. SWEAT (ash capitals) lands with the drop.
import { lyricModule, setLine, outFade } from '/song/lib/type.js';
export default lyricModule((ctx, t, P, lines) => {
  const L = lines[0];
  if (!L || t < L.start - 0.1) return;
  setLine(ctx, L, t, { x: 260, y: 1880, px: 170, align: 'left', alpha: outFade(t, P.to - 0.25, P.to) });
});
