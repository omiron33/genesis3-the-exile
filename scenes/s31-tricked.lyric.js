// The words of s31: her answer, two lines in her warm human italic, set high on the left in the dusk
// sky above the treeline while he races away below; "serpent" in his own oily voice.
import { lyricModule, verse } from '/song/lib/type.js';
export default lyricModule((ctx, t, P, lines) => {
  verse(ctx, t, P, lines, { x: 300, y: 420, px: 150, align: 'left', group: 2, gap: 1.25, rise: 20 });
}, { shade: 0.45 });
