// The words of s34-beast: one line, set low and wide across the dark grass at the bottom of the
// frame, under the running herds; EARTH lands last in dust capitals, at the line's end.
import { lyricModule, setLine } from '/song/lib/type.js';
import { lineAlpha } from '/song/lib/x-judgement-type.js';
export default lyricModule((ctx, t, P, lines) => {
  lines.forEach((l, i) => {
    const a = lineAlpha(t, P, lines, i, { before: 0.3, after: 0.05 });
    if (a > 0) setLine(ctx, l, t, { x: 300, y: 1880, px: 168, align: 'left', alpha: a, rise: 22 });
  });
}, { shade: 0.55 });
