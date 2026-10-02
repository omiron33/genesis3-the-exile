// The words of s43-thorn: low on the left, over the long black shadows the thicket throws across the
// pale ground (the darkest part of a frame in hard white light); one line at a time; the last line
// sits a little higher and larger as the camera closes in on the thorns.
import { lyricModule, setLine } from '/song/lib/type.js';
import { lineAlpha } from '/song/lib/x-judgement-type.js';
const PLACES = [
  { x: 260, y: 1880, px: 150, align: 'left' },
  { x: 260, y: 1880, px: 150, align: 'left' },
  { x: 260, y: 1800, px: 170, align: 'left' },
];
export default lyricModule((ctx, t, P, lines) => {
  lines.forEach((l, i) => {
    const a = lineAlpha(t, P, lines, i, { before: 0.32, after: 0.06 });
    if (a > 0) setLine(ctx, l, t, { ...PLACES[Math.min(i, 2)], alpha: a, rise: 22 });
  });
}, { shade: 0.85 });
