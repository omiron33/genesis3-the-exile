// The words of s42-cursed: set low on the left over the ground as it dies, one line at a time, the
// second and third stepping in a little further each time, the way the dry ground takes the field.
// A stronger shade behind them: by the end the hardpan is pale under a white sun.
import { lyricModule, setLine } from '/song/lib/type.js';
import { lineAlpha } from '/song/lib/x-judgement-type.js';
const PLACES = [
  { x: 260, y: 1850, px: 160, align: 'left' },
  { x: 380, y: 1850, px: 160, align: 'left' },
  { x: 500, y: 1850, px: 175, align: 'left' },
];
export default lyricModule((ctx, t, P, lines) => {
  lines.forEach((l, i) => {
    const a = lineAlpha(t, P, lines, i, { before: 0.35, after: 0.08 });
    if (a > 0) setLine(ctx, l, t, { ...PLACES[Math.min(i, 2)], alpha: a, rise: 22 });
  });
}, { shade: 0.75 });
