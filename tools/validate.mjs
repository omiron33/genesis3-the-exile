// Checks film.json, the scene modules and the timing data without rendering anything.
//   node tools/validate.mjs
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

export function validateFilm(film, root) {
  const errors = [];
  if (!Array.isArray(film.scenes) || !film.scenes.length) return ['film.scenes must be a nonempty array'];
  const names = new Set(), ids = new Set();
  for (let i = 0; i < film.scenes.length; i++) {
    const scene = film.scenes[i];
    if (!/^[a-z0-9-]+$/i.test(scene.scene)) errors.push(`Invalid scene name at index ${i}`);
    if (ids.has(scene.id)) errors.push(`Duplicate scene ID: ${scene.id}`);
    if (names.has(scene.scene)) errors.push(`Duplicate scene module: ${scene.scene}`);
    ids.add(scene.id); names.add(scene.scene);
    if (!Number.isFinite(scene.from) || !Number.isFinite(scene.to) || scene.to <= scene.from) errors.push(`Invalid scene interval: ${scene.id}`);
    const start = i ? film.scenes[i - 1].to : 0;
    if (Math.abs(scene.from - start) > 1e-6) errors.push(`Gap or overlap before scene ${scene.id}`);
    if (scene.transition) errors.push(`This film runner supports hard cuts only: ${scene.id}`);
    if (root) {
      const file = path.join(root, 'scenes', `${scene.scene}.js`);
      if (!fs.existsSync(file)) errors.push(`Missing picture module: ${scene.scene}`);
      else if (!/export\s+const\s+kind\s*=\s*['"]shader['"]/.test(fs.readFileSync(file, 'utf8'))) errors.push(`Picture module is not a shader scene: ${scene.scene}`);
    }
  }
  return errors;
}

export function validateData(film, root) {
  const errors = [];
  const end = film.scenes.at(-1).to;
  const lyrics = JSON.parse(fs.readFileSync(path.join(root, 'data/lyrics.json'), 'utf8'));
  if (lyrics.words.some((word) => !Number.isFinite(word.start) || !Number.isFinite(word.end) || word.end < word.start || word.start < 0 || word.end > end + 0.1)) errors.push('Invalid lyric word timing');
  if (lyrics.lines.some((line) => !(line.end >= line.start) || line.end > end + 0.1)) errors.push('Invalid lyric line timing');
  const speakers = JSON.parse(fs.readFileSync(path.join(root, 'data/speakers.json'), 'utf8')).segments;
  for (const [line, word] of speakers) if (!lyrics.lines[line] || word < 0) errors.push(`Speaker segment points past the lyrics: ${line},${word}`);
  for (const font of ['fonts/BebasNeue-Regular.ttf', 'renderer/web/fonts/eb-garamond-latin-400-normal.woff2', 'renderer/web/fonts/inter-tight-latin-wght-normal.woff2']) if (!fs.existsSync(path.join(root, font))) errors.push(`Missing font: ${font}`);
  return { errors, words: lyrics.words.length, lines: lyrics.lines.length, end };
}

const isMain = process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url);
if (isMain) {
  const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
  const film = JSON.parse(fs.readFileSync(path.join(root, 'film.json'), 'utf8'));
  const errors = validateFilm(film, root);
  const data = validateData(film, root);
  errors.push(...data.errors);
  const lyricModules = film.scenes.filter((s) => fs.existsSync(path.join(root, 'scenes', `${s.scene}.lyric.js`))).length;
  if (errors.length) { console.error(errors.join('\n')); process.exitCode = 1; }
  else console.log(`Valid film: ${film.scenes.length} scenes (${lyricModules} with lyric layers), ${data.end}s, ${data.lines} lines, ${data.words} timed words.`);
}
