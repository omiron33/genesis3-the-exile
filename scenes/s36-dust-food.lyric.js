// The words of s36: two lines, one at a time. "earth will be your food" sits low in the dusty
// foreground while he tastes it (EARTH in dust capitals); "through all your days." is set small and
// high in the white haze above the endless field as he goes.
import { lyricModule, setLine, outFade } from '/song/lib/type.js';
export default lyricModule((ctx, t, P, lines) => {
  const [a, b] = lines;
  if (a && t >= a.start - 0.1) setLine(ctx, a, t, { x: 300, y: 1880, px: 150, align: 'left', alpha: b ? outFade(t, b.start - 0.3, b.start - 0.02) : outFade(t, P.to - 0.3, P.to), rise: 16 });
  if (b && t >= b.start - 0.1) setLine(ctx, b, t, { x: 1920, y: 520, px: 130, align: 'center', alpha: outFade(t, P.to - 0.35, P.to - 0.03), rise: 14 });
}, { shade: 0.55 });
