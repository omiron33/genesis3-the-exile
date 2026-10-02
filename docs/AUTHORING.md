# Scene architecture

The film is deterministic: each frame is a pure function of the scene parameters and song time, and any randomness is seeded by position. `film.json` defines 57 contiguous intervals cut on measured beats. Each scene has a picture module and a separate lyric module, so typography can change without re-rendering its world.

## Picture modules

Every picture module exports `kind = 'shader'` and a default factory receiving the scene parameters (`id`, `from`, `to`). The result provides `from`, `to`, a GLSL fragment shader, uniforms, a camera function (position, target, field of view, focus distance and aperture for the thin lens) and optional update and finishing functions. These scenes render through `renderer/web/premium/`.

`lib/look.js` is the shared look: palette, the grade along the film's arc of light, timing, easing and camera helpers. The worlds live in `lib/x-*.js`:

- `x-garden*.js` — the garden of Delight: meadows, orchards over the hills, the four rivers; near and macro detail.
- `x-tree*.js` — the tree of the knowledge of good and evil on its rise, its crown from beneath and its fruit.
- `x-serpent*.js` — the raymarched serpent and its surroundings.
- `x-shame*.js` — the same garden after the eating, in cold blue-grey: the canopy, fig leaves, the still pool.
- `x-judgement*.js` — the storm over Paradise, the plain, the cursed earth, the vine, the seed and the thorns.
- `x-mercy*.js` — the hard white heat of the dust, the shadow returning to earth, dawn, the garments of skin and the tree of life.
- `x-exile*.js` — night outside the garden: the ridge, the east gate, the cherubim and the turning sword of fire.

## Lyric modules

Each `scenes/<name>.lyric.js` exports a factory for a transparent text layer. `lib/type.js` holds the typography: each word's voice comes from who is speaking (`data/speakers.json`), the narrator in upright Garamond, the serpent in an oily green-gold italic, God in tall warm Bebas Neue capitals, the man and the woman in a warm italic. Words of meaning override the speaker (the fruit red, death and dust in ash capitals, "Life" lit gold, fire and sword in flame). `data/lyrics.json` gives the measured sung-word and line intervals; words appear on their measured onsets, not on estimated beats.

The lyric canvas is 3840 × 2160 and is composited into the 1920 × 1080 output. Every word stays inside a 200 px margin of that canvas. The film-wide lyric backing (halo and shade) is set in `film.json`. Lyric modules may import only what the picture does not, so a typography change never re-renders a picture.

## Working on a scene

```sh
node tools/params.mjs s16-beauty --times
npm run still -- --scene s16-beauty --time 94 --samples 4
node tools/render.mjs scene --scene s16-beauty --from 93 --to 95 --draft
```

`docs/BRIEF.md` is the visual bible (no faces, God as light and wind, the Orthodox notes) and `docs/STORYBOARD.md` gives each scene's intent. Keep scene times as they are in `film.json`; the cuts sit on beats.

## Optional planning and timing tools

The released timing data is sufficient for rendering; none of these run during installation or rendering, and running them overwrites authored files, so use a separate branch.

- `tools/plan.py` — rebuilds `film.json` from lyric lines and measured beats.
- `tools/timing.py` — rebuilds `data/lyrics.json` from a forced alignment of `intake/sung-lyrics.txt` (the alignment file and recording are not included).
- `tools/vocals.py` — separates a vocal stem with a locally supplied Hybrid Demucs checkpoint (`python tools/vocals.py <checkpoint> <song.wav> <vocals.wav>`), so forced alignment hears the voice alone. Requires PyTorch and torchaudio.
- `tools/storyboard.py` — fills `docs/STORYBOARD.md` with the director's rows.
