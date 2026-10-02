// s52-sent words: "So the Lord God sent him", set in two tiers against the dark rock on the left as
// the gate passes: the sending lands on its own line, lower.
import { lyricModule, setLine, outFade } from '/song/lib/type.js';
export default lyricModule((ctx, t, P, lines) => {
  const L = lines[0]; if (!L) return;
  const a = outFade(t, P.to - 0.35, P.to - 0.05);
  const i = L.words.findIndex((w) => /^sent/i.test(w.w));
  setLine(ctx, L.words.slice(0, i), t, { x: 300, y: 1560, px: 190, align: 'left', alpha: a });
  setLine(ctx, L.words.slice(i), t, { x: 420, y: 1820, px: 230, align: 'left', alpha: a });
});
