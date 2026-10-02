// The words of s03: one line over the dark band of far trees on the left, leaving the woman
// alone on the right in her light; "woman" in the warm human italic.
import { lyricModule, setLine, outFade } from '/song/lib/type.js';
export default lyricModule((ctx, t, P, lines) => {
  const l = lines[0];
  if (!l || t < l.start - 0.1) return;
  setLine(ctx, l, t, { x: 300, y: 720, px: 150, align: 'left', alpha: outFade(t, P.to - 0.3, P.to - 0.05), rise: 20 });
}, { shade: 0.35 });
