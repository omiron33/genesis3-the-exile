// The words of s37-enmity: in the black sky above the two lights, centred over the crack. "I will make
// enmity stand" alone; then "between you and the woman, / your seed and hers." as a pair, the second
// row under the first, the way the crack divides the ground beneath them.
import { lyricModule, setLine } from '/song/lib/type.js';
import { lineAlpha } from '/song/lib/x-judgement-type.js';
const GROUPS = [[0], [1, 2]];
export default lyricModule((ctx, t, P, lines) => {
  GROUPS.forEach((g) => {
    const ls = g.map((i) => lines[i]).filter(Boolean);
    if (!ls.length) return;
    const lastI = g[g.length - 1];
    // the group appears with its first line and clears as the line after it begins
    const a = t < ls[0].start - 0.1 ? 0 : lineAlpha(t, P, lines, Math.min(lastI, lines.length - 1), { before: 0.3, after: 0.06 }) || (t < (lines[lastI]?.start ?? 0) ? 1 : 0);
    if (a <= 0) return;
    ls.forEach((l, k) => setLine(ctx, l, t, { x: 1920, y: 470 + k * 170 * 1.32, px: 170, align: 'center', alpha: a, rise: 22 }));
  });
}, { shade: 0.5 });
