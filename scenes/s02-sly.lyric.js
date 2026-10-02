// The words of s02: one line set in the dark green air above the branch, upper right, over the dark leaves, where the
// serpent's head will lift into: "none was as sly as" quiet, SLY and SERPENT in his oily italic.
import { lyricModule, setLine, outFade } from '/song/lib/type.js';
export default lyricModule((ctx, t, P, lines) => {
  const l = lines[0];
  if (!l || t < l.start - 0.1) return;
  setLine(ctx, l, t, { x: 3600, y: 640, px: 175, align: 'right', alpha: outFade(t, P.to - 0.35, P.to - 0.05), rise: 24 });
}, { shade: 0.35 });
