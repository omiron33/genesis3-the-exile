// The words of s46-return: one inscription low across the plain, under the blowing dust, the small
// words in bone and EARTH large in dust capitals: "to EARTH you will return."
import { lyricModule, inscribe, outFade } from '/song/lib/type.js';
export default lyricModule((ctx, t, P, lines) => {
  const L = lines[0];
  if (!L || t < L.start - 0.1) return;
  inscribe(ctx, L.words, t, { x: 1700, y: 1780, small: 200, big: 300, alpha: outFade(t, P.to - 0.3, P.to) });
});
