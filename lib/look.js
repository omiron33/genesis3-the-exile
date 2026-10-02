// The film's shared look: palette, the grade, timing helpers and camera helpers.
// Scene (picture) modules import this; anything here is part of every picture.
// The arc of the light: Paradise in low gold afternoon sun; after the eating the gold drains to a
// cold, exposed blue-grey; the judgement under storm; the cursed earth in hard white heat and dust;
// mercy (the naming, the garments of skin) in warm firelight; the exile at night, lit only by the
// turning sword of fire at the east gate of Delight.
import { keys, ease, wordState, smartQuotes, clamp01 } from '/engine.js';
import lyrics from '/timing.js';

// sRGB 0..255 strings for Canvas, and linear triples for shaders
export const BONE = '244, 236, 220';      // narration
export const GOLD = '246, 196, 104';      // Paradise light
export const FRUIT = '214, 52, 40';       // the fruit: the one saturated red in the garden
export const VENOM = '196, 222, 116';     // the serpent: oily green-gold
export const COLD = '160, 182, 210';      // after the eating
export const DUST = '196, 170, 140';      // earth, dust
export const FLAME = '255, 150, 60';      // the sword of fire
export const LIFE = '255, 228, 160';      // the tree of life

const lin = (c) => Math.pow(c / 255, 2.2);
export const rgb = (s, k = 1) => s.split(',').map((v) => lin(+v) * k);

// The grade. Rich, filmic, never crushed to black.
export function grade(t, extra = {}) {
  return {
    saturation: 1.04, contrast: 1.05,
    lift: [0.012, 0.011, 0.010], gain: [1.02, 1.0, 0.97],
    grain: 0.028, vignette: 0.42, ca: 0.22,
    bloom: 0.1, threshold: 1.05,
    ...extra,
  };
}

export const clamp = (x, a, b) => Math.min(b, Math.max(a, x));
export const mix = (a, b, k) => (Array.isArray(a) ? a.map((v, i) => v + (b[i] - v) * k) : a + (b - a) * k);

// An underdamped spring from 0 to 1 over `dur` seconds after t0 (a hit that settles, no dead stop).
export function spring(t, t0, dur = 0.5, bounce = 0.35) {
  const x = (t - t0) / dur;
  if (x <= 0) return 0;
  if (x >= 3) return 1;
  const w = 9.0, z = 1 - bounce;
  return 1 - Math.exp(-z * w * x * 0.9) * Math.cos(w * x * (1 - z * 0.3));
}

const norm = (s) => s.toLowerCase().replace(/[’']/g, "'").replace(/[^a-z0-9' ]/g, '').replace(/\s+/g, ' ').trim();
// Lines (by their opening words, in order) at or after song time `after`. Repeated lines are found in
// order, so pass a time just before the scene.
export function linesAt(after, ...prefixes) {
  let from = after;
  return prefixes.map((p) => {
    const l = lyrics.lines.find((l) => l.start >= from && norm(l.text).startsWith(norm(p)));
    if (!l) throw Error('no line after ' + after + ': ' + p);
    from = l.start + 0.01;
    return { ...l, words: lyrics.words.filter((w) => w.start >= l.start - 0.05 && w.end <= l.end + 0.05) };
  });
}
export const linesFrom = (...p) => linesAt(0, ...p);
// The first word (in a line found with linesAt) whose text starts with `w`.
export const wordIn = (line, w) => line.words.find((x) => norm(x.w).startsWith(norm(w)));

export const beats = (lyrics.beats ?? []);
export function nextBeat(t) { return beats.find((b) => b >= t) ?? t; }

export const clean = (s) => smartQuotes(s).replace(/[“”"]/g, '');

export { keys, ease, clamp01, wordState, smartQuotes, lyrics };

// Project a world point through a camera to text-canvas pixels (canvas W×H spanning the frame).
export function project(cam, p, W = 3840, H = 2160) {
  const sub = (a, b) => a.map((v, i) => v - b[i]);
  const nrm = (a) => { const l = Math.hypot(...a); return a.map((v) => v / l); };
  const cross = (a, b) => [a[1] * b[2] - a[2] * b[1], a[2] * b[0] - a[0] * b[2], a[0] * b[1] - a[1] * b[0]];
  const dot = (a, b) => a[0] * b[0] + a[1] * b[1] + a[2] * b[2];
  const ww = nrm(sub(cam.target, cam.pos));
  const roll = cam.roll ?? 0;
  const uu = nrm(cross(ww, [Math.sin(roll), Math.cos(roll), 0])), vv = cross(uu, ww);
  const d = sub(p, cam.pos);
  const z = dot(d, ww);
  const f = 1 / Math.tan(((cam.fov ?? 40) * Math.PI) / 360);
  const x = (dot(d, uu) / z) * f, y = (dot(d, vv) / z) * f;
  return { x: W / 2 + x * (H / 2), y: H / 2 - y * (H / 2), z };
}

// A slow handheld drift, a pure function of t (metres / radians).
export function drift(t, amt = 0.01) {
  return [amt * (Math.sin(t * 0.61) + 0.5 * Math.sin(t * 1.73 + 1.1)), amt * 0.6 * (Math.sin(t * 0.47 + 2.0) + 0.5 * Math.sin(t * 1.31)), 0];
}
