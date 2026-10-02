// The words of s40-rule: low on the left, over the dark valley beside the bound sapling, one line at
// a time; the second line steps a little lower, as the young plant is bent down.
import { lyricModule, setLine } from '/song/lib/type.js';
import { lineAlpha } from '/song/lib/x-judgement-type.js';
export default lyricModule((ctx, t, P, lines) => {
  lines.forEach((l, i) => {
    const a = lineAlpha(t, P, lines, i, { before: 0.35, after: 0.08 });
    if (a > 0) setLine(ctx, l, t, { x: 260, y: i ? 1880 : 1720, px: 150, align: 'left', alpha: a, rise: 22 });
  });
}, { shade: 0.5 });
