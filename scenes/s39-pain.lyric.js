// The words of s39-pain: one line per beat, moving with the picture. The first sits high on the left
// over the dark wet earth while the rain falls; the second high on the right, above the seed as it
// splits; the third centred above the shoot as it forces its way up.
import { lyricModule, setLine } from '/song/lib/type.js';
import { lineAlpha } from '/song/lib/x-judgement-type.js';
const PLACES = [
  { x: 300, y: 420, px: 160, align: 'left' },
  { x: 3540, y: 420, px: 170, align: 'right' },
  { x: 1920, y: 470, px: 165, align: 'center' },
];
export default lyricModule((ctx, t, P, lines) => {
  lines.forEach((l, i) => {
    const a = lineAlpha(t, P, lines, i, { before: 0.35, after: 0.08 });
    if (a > 0) setLine(ctx, l, t, { ...PLACES[Math.min(i, 2)], alpha: a, rise: 22 });
  });
}, { shade: 0.5 });
