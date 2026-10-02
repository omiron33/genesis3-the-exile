// The words of s51-tree-of-life, low on the left over the dark water at the tree's foot, under the
// crown's light: "for the tree of LIFE, eat," and then "and LIVE FOREVER." beneath it, the gold words
// lit like the tree.
import { lyricModule, verse } from '/song/lib/type.js';
export default lyricModule((ctx, t, P, lines) => {
  verse(ctx, t, P, lines, { x: 260, y: 1660, px: 160, align: 'left', group: 2, gap: 1.3 });
});
