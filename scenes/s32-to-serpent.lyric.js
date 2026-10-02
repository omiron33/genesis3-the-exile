// The words of s32-to-serpent: one line, centred low over the dark meadow under the tree, as the
// storm piles up above; SERPENT arrives in its oily green-gold.
import { lyricModule, setLine } from '/song/lib/type.js';
import { lineAlpha } from '/song/lib/x-judgement-type.js';
export default lyricModule((ctx, t, P, lines) => {
  lines.forEach((l, i) => {
    const a = lineAlpha(t, P, lines, i, { before: 0.3, after: 0.05 });
    if (a > 0) setLine(ctx, l, t, { x: 1920, y: 1900, px: 176, align: 'center', alpha: a, rise: 24 });
  });
}, { shade: 0.55 });
