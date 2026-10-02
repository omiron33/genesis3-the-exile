# Genesis 3 — The Exile

A song and code-rendered lyric film of Genesis 3 in the Septuagint wording: the serpent, the eating, the hiding, the judgement, the garments of skin and the exile from the garden of Delight, told through light.

<!-- Poster: add docs/poster.jpg and uncomment
![Genesis 3 — The Exile](docs/poster.jpg)
-->

[Watch the film](VIDEO_URL) · [Listen](SONG_URL) · [Download the song and video](RELEASE_URL)

The film runs **5:50** at **1920 × 1080 / 60 fps**. Every frame of its 57 scenes is drawn in code on the GPU: raymarched gardens, rivers, trees, a serpent, a storm and the cherubim at the east gate, with typography set to the sung onset of each word. Nothing in the picture is a photograph, a downloaded model or a generated image.

The arc of the film is the arc of its light. Paradise opens in low gold afternoon sun. After the eating the gold drains to a cold, exposed blue-grey, and the voice of the Lord God walking in the garden is light and wind, never a figure. The judgement comes as a storm, then the hard white heat of the cursed earth and its thorns. Mercy returns as a different warmth, firelight and dawn, with the garments of skin and Eve's name, "Life". The film ends at night outside the garden, by the turning sword of fire, with one small star rising beyond the gate.

## Quick start

Install Node.js 22 or later, Google Chrome and FFmpeg (`ffmpeg` and `ffprobe` on your PATH), then:

```sh
npm ci
npm run validate
npm run still -- --scene s00-title --time 6 --samples 2
```

The still appears in `out/portable/stills/` (the picture, and the picture with its words as `-full.png`). No recording is needed for stills or scene clips. Set the `CHROME` environment variable if Chrome is installed outside the platform's usual location.

For the complete film, place the original 48 kHz stereo recording at `media/song.wav` and run:

```sh
npm run render -- --draft
npm run render
```

Full rendering is GPU intensive and takes many hours. The draft uses 30 fps and two samples; the final uses 60 fps, 32 picture samples and 16 lyric samples. Scenes are rendered one at a time and completed outputs are cached. See [rendering](docs/RENDERING.md) for scene clips, requirements and limitations.

## Source layout

- `film.json` — scene order and timings (57 scenes, cut on measured beats).
- `scenes/` — one picture module and one lyric module per scene.
- `lib/` — the film's worlds (garden, tree, serpent, shame, judgement, mercy, exile), the shared look and the typography.
- `data/` — aligned sung words and lines, measured musical timing and who is speaking.
- `fonts/` — Bebas Neue, the voice of God in the lyric layer.
- `renderer/` — deterministic browser rendering and local FFmpeg encoding.
- `tools/` — rendering, validation and the optional planning and timing utilities.
- `intake/sung-lyrics.txt` — the sung lyric text.

[Visual brief](docs/BRIEF.md) · [Storyboard](docs/STORYBOARD.md) · [Scene architecture](docs/AUTHORING.md) · [Credits and licenses](docs/CREDITS.md)

## License

Source code is released under the [MIT License](LICENSE). Fonts retain their SIL Open Font License notices. The song recording and the finished film are separate media releases; the source-code license does not grant any rights to the recording, its lyrics as a recorded work, or the rendered film.
