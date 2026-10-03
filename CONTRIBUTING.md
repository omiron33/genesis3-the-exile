# Contributing to Genesis 3, The Exile

Pull requests are welcome: bug fixes, documentation, tests, new scene ideas and tooling.

Every pull request needs an approving review from Shane Fisher (@omiron33), the code owner, before it can be merged. `main` is protected, so please work on a branch or a fork and open a pull request against `main`.

## Run it

You need Node.js 22 or newer, Google Chrome with WebGL2, and FFmpeg (`ffmpeg` and `ffprobe` on your PATH). Set `CHROME` if Chrome is installed somewhere unusual.

```sh
npm ci
npm run validate
npm test
npm run still -- --scene s00-title --time 6 --samples 2    # writes to out/portable/stills/
```

A full render needs the original recording at `media/song.wav`, which is not in this repository:

```sh
npm run render -- --draft
npm run render
```

Scene architecture is in [docs/AUTHORING.md](docs/AUTHORING.md) and rendering details are in [docs/RENDERING.md](docs/RENDERING.md).

## Before you open a pull request

- Keep pull requests small and focused, and explain what you changed and how you checked it.
- For visual changes, render a still or a short clip and attach it to the pull request.
- Do not commit secrets, `.env` files, cookies, song recordings, full renders, or model weights. Large media stays out of git.
- Issues: use the bug report or feature request template.

## License

By contributing, you agree that your contributions are licensed under the repository's [MIT License](LICENSE). Fonts and third-party files keep their own notices.
