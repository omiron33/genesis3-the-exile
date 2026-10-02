// Portable runner for Genesis 3 — The Exile.
//   node tools/render.mjs still --scene s00-title --time 4 [--samples 2] [--picture]
//   node tools/render.mjs scene --scene s00-title [--from 4 --to 5] [--draft]
//   node tools/render.mjs film [--draft] [--out out/film.mp4]
// A still of a scene with a lyric module is the picture with its words composited on top
// (<scene>-<time>-full.png); --picture keeps only the picture.
import fs from 'node:fs';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { makeKeys } from '../renderer/lib/keys.mjs';
import { validateFilm } from './validate.mjs';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const argv = process.argv.slice(2);
const mode = argv[0];
const option = (name, fallback) => { const i = argv.indexOf(`--${name}`); return i < 0 ? fallback : argv[i + 1]; };
if (!['still', 'scene', 'film'].includes(mode)) {
  console.log('Usage: node tools/render.mjs still --scene s00-title --time 4 [--samples 2] [--picture]\n       node tools/render.mjs scene --scene s00-title [--from 4 --to 5 --draft]\n       node tools/render.mjs film [--draft] [--out out/film.mp4]');
  process.exit(!mode || mode === '--help' ? 0 : 1);
}
const film = JSON.parse(fs.readFileSync(path.join(root, 'film.json'), 'utf8'));
const errors = validateFilm(film, root);
if (errors.length) throw Error(errors.join('\n'));
const audio = path.join(root, 'media/song.wav');
if (mode === 'film' && !fs.existsSync(audio)) throw Error('Place the source recording at media/song.wav before rendering the film.');
const selected = option('scene', 's00-title');
const scenes = mode === 'film' ? film.scenes : film.scenes.filter((scene) => scene.scene === selected || scene.id === selected);
if (scenes.length !== (mode === 'film' ? film.scenes.length : 1)) throw Error(`Unknown scene: ${selected}`);
const draft = argv.includes('--draft');
// Premium tier: 60 fps, 32 picture samples for these lens-heavy shader scenes, 16 lyric samples.
const fps = draft ? 30 : Math.max(60, film.fps ?? 60);
const samples = Number(option('samples', draft ? 2 : Math.max(32, (film.samples ?? 16) * 2)));
if (!Number.isInteger(samples) || samples < 1 || samples > 256) throw Error('--samples must be an integer from 1 to 256');
const layerSamples = draft ? 2 : 16;
const run = (command, args) => {
  const result = spawnSync(command, args.map(String), { cwd: root, stdio: 'inherit' });
  if (result.error) throw result.error;
  if (result.status !== 0) throw Error(`${command} failed (${result.signal ?? result.status})`);
};
const renderer = (kind, args) => run(process.execPath, ['renderer/render.mjs', kind, '--song', root, ...args]);
const outDir = path.join(root, 'out', draft ? 'portable-draft' : 'portable');
fs.mkdirSync(outDir, { recursive: true });
const keys = makeKeys(root);
const outputs = [];

for (const scene of scenes) {
  const params = JSON.stringify({ ...(scene.params ?? {}), id: scene.id, from: scene.from, to: scene.to });
  const common = ['--scene', scene.scene, '--params', params];
  if (mode === 'still') {
    const time = Number(option('time', (scene.from + scene.to) / 2));
    if (!Number.isFinite(time) || time < scene.from || time > scene.to) throw Error('--time must fall inside the selected scene');
    const stills = path.resolve(root, option('out', path.join(outDir, 'stills')));
    renderer('stills', [...common, '--t', time, '--samples', samples, '--out', stills]);
    if (keys.hasLayer(scene.scene) && !argv.includes('--picture')) {
      const tag = `${scene.scene}-${time.toFixed(2)}`;
      const layer = path.join(stills, `${tag}.lyric.mkv`);
      renderer('layer', [...common, '--from', time, '--to', time + 2 / 60, '--fps', 60, '--samples', Math.min(samples, 16), '--out', layer]);
      const full = path.join(stills, `${tag}-full.png`);
      run('ffmpeg', ['-y', '-loglevel', 'error', '-i', path.join(stills, `${tag}.png`), '-i', layer, '-filter_complex', '[1:v]scale=1920:1080,format=rgba[l];[0:v][l]overlay=0:0:format=auto', '-frames:v', 1, full]);
      fs.rmSync(layer, { force: true });
      console.log(`Wrote ${full}`);
    }
    break;
  }
  const from = mode === 'scene' ? Number(option('from', scene.from)) : Math.round(scene.from * fps) / fps;
  const to = mode === 'scene' ? Number(option('to', scene.to)) : Math.round(scene.to * fps) / fps;
  if (!Number.isFinite(from) || !Number.isFinite(to) || to <= from || from < scene.from - 1 / fps || to > scene.to + 1 / fps) throw Error('Invalid --from/--to range');
  const layered = keys.hasLayer(scene.scene);
  const output = path.join(outDir, `${scene.id}.mp4`);
  const plate = layered ? path.join(outDir, `${scene.id}.plate.mp4`) : output;
  const layer = path.join(outDir, `${scene.id}.lyric.mkv`);
  const key = JSON.stringify({ content: keys.content(scene, fps), from, to, fps, samples, draft });
  const cached = fs.existsSync(output) && fs.existsSync(`${output}.key`) && fs.readFileSync(`${output}.key`, 'utf8') === key;
  if (!cached) {
    const quality = ['--fps', fps, '--preset', draft ? 'veryfast' : 'slow', '--crf', draft ? 20 : 16];
    renderer('video', [...common, '--from', from, '--to', to, '--samples', samples, ...quality, '--noaudio', '--out', plate]);
    if (layered) {
      renderer('layer', [...common, '--from', from, '--to', to, '--samples', layerSamples, ...quality, '--out', layer]);
      run('ffmpeg', ['-y', '-loglevel', 'error', '-i', plate, '-i', layer, '-filter_complex', '[0:v]scale=in_color_matrix=bt709:in_range=tv,format=gbrp[p];[1:v]format=gbrap[l];[p][l]overlay=format=gbrp:alpha=straight,scale=out_color_matrix=bt709:out_range=tv,format=yuv420p', '-c:v', 'libx264', '-preset', draft ? 'veryfast' : 'slow', '-crf', draft ? 20 : 16, '-color_primaries', 'bt709', '-color_trc', 'bt709', '-colorspace', 'bt709', '-movflags', '+faststart', output]);
    }
    fs.writeFileSync(`${output}.key`, key);
  } else console.log(`Cached scene ${scene.id}`);
  outputs.push(output);
}
if (mode === 'film') {
  const list = path.join(outDir, 'concat.txt');
  fs.writeFileSync(list, outputs.map((file) => `file '${file.replaceAll("'", "'\\''")}'`).join('\n') + '\n');
  const output = path.resolve(root, option('out', draft ? 'out/film-draft.mp4' : 'out/film.mp4'));
  fs.mkdirSync(path.dirname(output), { recursive: true });
  run('ffmpeg', ['-y', '-loglevel', 'error', '-f', 'concat', '-safe', '0', '-i', list, '-i', audio, '-map', '0:v', '-map', '1:a', '-c:v', 'copy', '-c:a', 'aac', '-b:a', '320k', '-t', film.scenes.at(-1).to, '-movflags', '+faststart', output]);
  console.log(`Wrote ${output}`);
}
