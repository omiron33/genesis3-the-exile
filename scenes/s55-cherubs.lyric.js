// s55-cherubs words: inscriptions low on the ground beneath the fire; CHERUBS, SWORD and FIRE in
// flame capitals, the small words in tracked bone. Never over the wheel's core. (The flame words are
// set without the canvas glow: at this size its blur clips into hard dashes in the layer's halo.)
import { lyricModule, measure, paint, arrive, voiceOf, PLAIN, outFade } from '/song/lib/type.js';
function inscribeFlat(ctx, words, t, { x = 1920, y = 1080, small = 120, big = 280, alpha = 1 } = {}) {
  const isBig = (w) => voiceOf(w.w) !== PLAIN;
  const sz = (w) => (isBig(w) ? big : small);
  const o = (w) => (isBig(w) ? {} : { voice: 'quiet' });
  const adv = words.map((w) => measure(ctx, w.w, sz(w), o(w)) + (isBig(w) ? 0 : small * 0.25));
  const total = adv.reduce((s, v) => s + v, 0) - small * 0.5;
  let xx = x - total / 2;
  words.forEach((w, i) => {
    const st = arrive(w, t);
    paint(ctx, w.w, xx, y + (1 - st.k) * sz(w) * 0.08, sz(w), { ...o(w), alpha: st.a * alpha, glow: false });
    xx += adv[i];
  });
}
export default lyricModule((ctx, t, P, lines) => {
  const [A, B] = lines;
  if (A && t >= A.start - 0.1) inscribeFlat(ctx, A.words, t, { x: 1920, y: 1890, small: 150, big: 250, alpha: B ? outFade(t, B.start - 0.3, B.start - 0.02) : 1 });
  if (B && t >= B.start - 0.1) inscribeFlat(ctx, B.words, t, { x: 1920, y: 1890, small: 150, big: 250, alpha: outFade(t, P.to - 0.3, P.to - 0.02) });
});
