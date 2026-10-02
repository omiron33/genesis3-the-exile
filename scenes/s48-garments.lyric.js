// The words of s48-garments, high on the left in the deeper sky above the afterglow, clear of the
// two figures and of the glow: the first line alone, then "for Adam and his wife" with
// "and clothed them." beneath it.
import { lyricModule, verse } from '/song/lib/type.js';
export default lyricModule((ctx, t, P, lines) => {
  verse(ctx, t, P, lines, { x: 260, y: 360, px: 145, align: 'left', groups: [1, 2], gap: 1.32 });
});
