// The words of s35: God's sentence in His tall capitals, set across the top of the frame over the
// pale hot haze above the crust, quiet and level as the dragging body below.
import { lyricModule, setLine, outFade } from '/song/lib/type.js';
export default lyricModule((ctx, t, P, lines) => {
  const l = lines[0];
  if (!l || t < l.start - 0.1) return;
  setLine(ctx, l, t, { x: 1920, y: 1880, px: 140, align: 'center', alpha: outFade(t, P.to - 0.3, P.to - 0.03), rise: 16 });
}, { shade: 0.55 });
