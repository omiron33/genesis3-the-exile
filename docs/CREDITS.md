# Credits and licenses

**Genesis 3 — The Exile** — TechnoChristianity / omiron33.

The lyrics follow Genesis 3 in the Septuagint wording. The recording was created with Suno. The film's scenes, procedural worlds, typography and deterministic rendering code are released under this repository's MIT license. The song recording and finished film are distributed separately; they are not relicensed as software.

## Rendering dependencies

- [Three.js](https://github.com/mrdoob/three), MIT License.
- [Playwright](https://github.com/microsoft/playwright), Apache License 2.0.
- FFmpeg and Google Chrome are installed separately and retain their respective licenses.

Every image in the film is computed by the scene shaders in this repository. No photographs, textures or generated images are used. The one exception to "drawn in code" is the people's shape (below).

## The people

The man and the woman are [MakeHuman](http://www.makehumancommunity.org) figures, made and posed in
Blender by `tools/make-humans.py` and baked into signed distance volumes that the scene shaders march
like the rest of each world (they are drawn only as dark, rim-lit silhouettes; no skin or face is
ever shown). Nothing is downloaded at render time; the baked files in `assets/humans/` are git-ignored
and rebuilt with:

```sh
/Applications/Blender.app/Contents/MacOS/Blender -b -P tools/make-humans.py
```

- [MPFB 2](https://extensions.blender.org/add-ons/mpfb/) (MakeHuman Plugin For Blender, version 2.0.17,
  from extensions.blender.org; source at [github.com/makehumancommunity/mpfb2](https://github.com/makehumancommunity/mpfb2)).
  The add-on is GPL-3.0-or-later; the base mesh, targets, rig and weights it ships, and so every human it
  generates, are CC0 (MakeHuman's licence for its assets and output).
- MakeHuman system assets, CC0: the hair `long01` (hers) and `short02` (his), from
  `makehuman_system_assets_cc0.zip` ([files.makehumancommunity.org/asset_packs/makehuman_system_assets/](http://files.makehumancommunity.org/asset_packs/makehuman_system_assets/)),
  unpacked under `assets/humans/src/` with the pack's own licence list (`packs/makehuman_system_assets.json`).
- The fig-leaf girdles and the garment of skin are modelled by `tools/make-humans.py` itself, and the
  poses (standing, the bowed head, the turn, a walk cycle, seated by the fire, hand in hand) are set
  on MPFB's `game_engine` rig by that script.
- Blender 5.0 (GPL) runs the script; it is not part of the film.


## Fonts

- EB Garamond — SIL Open Font License, notice in `renderer/web/fonts/EBGaramond-OFL.txt`.
- Inter Tight — SIL Open Font License, notice in `renderer/web/fonts/InterTight-OFL.txt`.
- Bebas Neue — SIL Open Font License, notice in `fonts/OFL-bebasneue.txt`.

## Timing data

The word timings in `data/lyrics.json` were made by forced alignment of the sung lyrics against a separated vocal stem on a local machine (torchaudio CTC alignment and Hybrid Demucs separation). They are machine estimates. The optional tools that produced them are described in [scene architecture](AUTHORING.md); they are not needed to render.
