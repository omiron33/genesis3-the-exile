// The words of s11: the lie, set small in his oily italic in the dark below the jaw, at the lower
// right, well away from the fruit in the eye; "death" in ash capitals.
import { lyricModule, setLine, outFade } from '/song/lib/type.js';
export default lyricModule((ctx, t, P, lines) => {
  const l = lines[0];
  if (!l || t < l.start - 0.1) return;
  setLine(ctx, l, t, { x: 3600, y: 1930, px: 110, align: 'right', alpha: outFade(t, l.end + 0.5, l.end + 1.0), rise: 14 });
}, { shade: 0.45 });
