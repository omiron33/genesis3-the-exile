// The words of s38: the promise, one line at a time in God's tall warm capitals, high on the right
// in the dark air away from the pillar, so the light itself stays clean.
import { lyricModule, single } from '/song/lib/type.js';
export default lyricModule((ctx, t, P, lines) => {
  single(ctx, t, P, lines, { x: 3600, y: 560, px: 150, align: 'right', rise: 16 });
}, { shade: 0.4 });
