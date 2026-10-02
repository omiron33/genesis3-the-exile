// The words of s47-life: Adam names his wife. The small words of the first line run quietly across
// the top of the sky; LIFE is set large on its own in the sky below them, in lit gold that carries a
// slow glow, and stays while the second line ("for she was mother of all who live") takes the top
// row. LIFE and live share the tree of life's gold.
import { lyricModule as LM, setLine, paint, measure, arrive, outFade, wordIn, speakerOf } from '/song/lib/type.js';
const lyricModule = (f) => { const m = LM(f); return (P) => ({ ...m(P), haloSpread: 7 }); };
export default lyricModule((ctx, t, P, lines) => {
  const [A, B] = lines;
  if (!A || t < A.start - 0.1) return;
  const end = outFade(t, P.to - 0.3, P.to);
  const lifeW = wordIn(A, 'life');
  const small = A.words.filter((w) => w !== lifeW);
  // the first line's small words, until the second line begins
  const aSmall = (B ? outFade(t, B.start - 0.25, B.start + 0.02) : 1) * end;
  if (aSmall > 0) setLine(ctx, small, t, { x: 260, y: 360, px: 140, align: 'left', alpha: aSmall });
  // LIFE: large, glowing, breathing slowly once it has landed
  const st = arrive(lifeW, t, 0.08, 0.5);
  if (st.a > 0) {
    const px = 360, x = 270, y = 860 + (1 - st.k) * 30;
    const breath = 0.75 + 0.25 * Math.sin((t - lifeW.start) * 2.2);
    // its own close glow (tighter than the voice's default at this size), breathing
    ctx.save();
    ctx.shadowColor = `rgba(255, 176, 70, ${(0.9 * st.a * end * breath).toFixed(3)})`;
    ctx.shadowBlur = 46;
    paint(ctx, lifeW.w, x, y, px, { alpha: st.a * end, glow: false, speaker: speakerOf(lifeW) });
    ctx.restore();
  }
  if (B && t >= B.start - 0.1) setLine(ctx, B, t, { x: 260, y: 360, px: 140, align: 'left', alpha: end });
});
