// The words of s33: God's sentence on the serpent, set low across the dark wet ground in His tall
// capitals (CURSE in ash), never against the lit sky.
import { lyricModule, setLine, outFade } from '/song/lib/type.js';
export default lyricModule((ctx, t, P, lines) => {
  const l = lines[0];
  if (!l || t < l.start - 0.1) return;
  setLine(ctx, l, t, { x: 1920, y: 1900, px: 150, align: 'center', alpha: outFade(t, P.to - 0.3, P.to - 0.03), rise: 18 });
}, { shade: 0.5 });
