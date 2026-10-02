// The words of s41-to-adam: one line per beat, each placed where that beat's picture is dark.
//   1. "To Adam: You heard your wife" high on the left, in the black of the crown overhead;
//   2. "and ate from the tree I marked" low on the left, on the dark slope under the strike;
//   3. "as the one you must not eat." low and to the right, over the dark water as we pull away.
import { lyricModule, setLine } from '/song/lib/type.js';
import { lineAlpha } from '/song/lib/x-judgement-type.js';
const PLACES = [
  { x: 280, y: 560, px: 170, align: 'left' },
  { x: 280, y: 1880, px: 170, align: 'left' },
  { x: 3560, y: 1900, px: 170, align: 'right' },
];
export default lyricModule((ctx, t, P, lines) => {
  lines.forEach((l, i) => {
    const a = lineAlpha(t, P, lines, i, { before: 0.32, after: 0.06 });
    if (a > 0) setLine(ctx, l, t, { ...PLACES[Math.min(i, 2)], alpha: a, rise: 22 });
  });
}, { shade: 0.55 });
