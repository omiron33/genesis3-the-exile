// Print a scene's film parameters (from film.json) for render.mjs --params, and a few useful times.
//   node tools/params.mjs s01-chain          -> {"id":"01","scene":"s01-chain","from":..,"to":..}
//   node tools/params.mjs s01-chain --times  -> the scene window and each of its lines' start/end
import fs from 'node:fs';
const film = JSON.parse(fs.readFileSync(new URL('../film.json', import.meta.url)));
const s = film.scenes.find((x) => x.scene === process.argv[2]);
if (!s) { console.error('no scene ' + process.argv[2]); process.exit(1); }
if (process.argv.includes('--times')) {
  const L = JSON.parse(fs.readFileSync(new URL('../data/lyrics.json', import.meta.url)));
  console.log(`scene ${s.scene}: ${s.from} to ${s.to}`);
  for (const l of L.lines.filter((l) => l.start < s.to && l.end > s.from)) console.log(`  ${l.start.toFixed(2)}-${l.end.toFixed(2)}  ${l.text}`);
} else console.log(JSON.stringify(s));
