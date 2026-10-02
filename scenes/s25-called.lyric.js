// The words of s25: the narration small and high, then God's call over the dusk sky above the light:
// ADAM, huge in the warm capitals, and "where are you now?" beneath it.
import { lyricModule, linesAt, setLine, outFade, wordIn } from '/song/lib/type.js';
export default lyricModule((ctx, t, P) => {
  const [L1, L2] = linesAt(P.from - 2.5, 'He called out', 'Adam, where are you');
  if (t > L1.start - 0.1) setLine(ctx, L1.words, t, { x: 1920, y: 330, px: 120, align: 'center', alpha: outFade(t, L2.start - 0.3, L2.start + 0.05), rise: 16 });
  if (t > L2.start - 0.1) {
    const a = outFade(t, P.to - 0.3, P.to - 0.03);
    setLine(ctx, [L2.words[0]], t, { x: 1920, y: 560, px: 360, align: 'center', alpha: a, rise: 40 });
    setLine(ctx, L2.words.slice(1), t, { x: 1920, y: 790, px: 150, align: 'center', alpha: a, rise: 18 });
  }
}, { shade: 0.25 });
