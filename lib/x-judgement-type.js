// Lyric helpers for the judgement scenes (imported only by their lyric modules).
import { outFade } from '/song/lib/type.js';
// Alpha of line i of a scene's lines: on from just before it is sung, gone just before the next line
// begins; the last line holds until its last word has landed and clears by P.to (cut at P.to if a
// word lands at the very end of the scene).
export function lineAlpha(t, P, lines, i, { before = 0.35, after = 0.08 } = {}) {
  const l = lines[i], next = lines[i + 1];
  if (t < l.start - 0.1) return 0;
  if (next) return outFade(t, next.start - before, next.start - after);
  const last = l.words[l.words.length - 1];
  const f0 = Math.max(P.to - 0.3, (last ? last.start : l.start) + 0.2);
  return t >= P.to ? 0 : f0 >= P.to - 0.02 ? 1 : outFade(t, f0, P.to - 0.02);
}
