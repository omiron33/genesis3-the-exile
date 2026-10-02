# Credits and licenses

**Genesis 3 — The Exile** — TechnoChristianity / omiron33.

The lyrics follow Genesis 3 in the Septuagint wording. The recording was created with Suno. The film's scenes, procedural worlds, typography and deterministic rendering code are released under this repository's MIT license. The song recording and finished film are distributed separately; they are not relicensed as software.

## Rendering dependencies

- [Three.js](https://github.com/mrdoob/three), MIT License.
- [Playwright](https://github.com/microsoft/playwright), Apache License 2.0.
- FFmpeg and Google Chrome are installed separately and retain their respective licenses.

Every image in the film is computed by the scene shaders in this repository. No downloaded models, photographs, textures or generated images are used.

## Fonts

- EB Garamond — SIL Open Font License, notice in `renderer/web/fonts/EBGaramond-OFL.txt`.
- Inter Tight — SIL Open Font License, notice in `renderer/web/fonts/InterTight-OFL.txt`.
- Bebas Neue — SIL Open Font License, notice in `fonts/OFL-bebasneue.txt`.

## Timing data

The word timings in `data/lyrics.json` were made by forced alignment of the sung lyrics against a separated vocal stem on a local machine (torchaudio CTC alignment and Hybrid Demucs separation). They are machine estimates. The optional tools that produced them are described in [scene architecture](AUTHORING.md); they are not needed to render.
