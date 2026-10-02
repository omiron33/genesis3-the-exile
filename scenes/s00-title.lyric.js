// The title, the only words in the film that are not sung: GENESIS 3 / THE EXILE in the tall warm
// capitals that carry God's words, set letter by letter from the centre out as the flight begins, then
// breathing apart and dissolving into the haze as the garden opens.
import { lyricModule, ease, clamp01 } from '/song/lib/type.js';

const INK = '255, 244, 224', GLOW = '255, 186, 100';

function title(ctx, text, cx, y, px, track, t, t0, stagger, out) {
  ctx.font = `400 ${px}px "Bebas Neue"`;
  ctx.fontVariantCaps = 'normal';
  ctx.letterSpacing = '0px';
  const chars = [...text];
  const ws = chars.map((c) => ctx.measureText(c).width);
  const gap = px * track * (1 + 0.5 * out);
  const total = ws.reduce((a, b) => a + b, 0) + gap * (chars.length - 1);
  let x = cx - total / 2;
  const mid = (chars.length - 1) / 2;
  chars.forEach((c, i) => {
    const k = ease.out3(clamp01((t - (t0 + Math.abs(i - mid) * stagger)) / 0.9));
    const a = k * (1 - out);
    if (a > 0.003 && c !== ' ') {
      const rise = (1 - k) * px * 0.12 - out * px * 0.05;
      ctx.save();
      if (out > 0.01) ctx.filter = `blur(${(out * px * 0.06).toFixed(1)}px)`;
      ctx.shadowColor = `rgba(${GLOW}, ${(0.6 * a).toFixed(3)})`;
      ctx.shadowBlur = px * 0.3;
      ctx.fillStyle = `rgba(${INK}, ${a.toFixed(3)})`;
      ctx.fillText(c, x, y + rise);
      ctx.restore();
    }
    x += ws[i] + gap;
  });
}

export default lyricModule((ctx, t, P) => {
  const D = P.to - P.from;
  const t0 = P.from + 0.12 * D;                       // the flight is under way; the name arrives
  const out = ease.inOut3(clamp01((t - (P.from + 0.62 * D)) / (0.3 * D)));
  title(ctx, 'GENESIS 3', 1920, 800, 400, 0.08, t, t0, 0.07, out);
  title(ctx, 'THE EXILE', 1920, 1080, 200, 0.34, t, t0 + 0.75, 0.06, out);
}, { shade: 0.16 });
