"""Build data/lyrics.json from the CTC forced alignment (large wav2vec2 on the Demucs vocal stem) of the sung lyrics (intake/words-ctc-large-vocals.json).
Words keep the official spelling; each line takes the start of its first word and the end of its
last. Beats come from data/audio.json."""
import json
C = json.load(open('intake/words-ctc-large-vocals.json'))['words']
A = json.load(open('data/audio.json'))
lines = [l.strip() for l in open('intake/sung-lyrics.txt') if l.strip()]
toks = [(i, t) for i, l in enumerate(lines) for t in l.split()]
assert len(toks) == len(C), (len(toks), len(C))
words = [{'w': t, 'start': c['start'], 'end': c['end'], 'line': i} for (i, t), c in zip(toks, C)]
words[-1]['end'] = min(words[-1]['end'], words[-1]['start'] + 4.0)
for a, b in zip(words, words[1:]):
    a['end'] = min(a['end'], b['start'])
    if a['end'] - a['start'] < 0.06: a['end'] = min(b['start'], a['start'] + 0.06)
out_lines = []
for i, l in enumerate(lines):
    ws = [w for w in words if w['line'] == i]
    out_lines.append({'text': l, 'start': round(ws[0]['start'], 3), 'end': round(ws[-1]['end'], 3)})
beats = [b['time'] for b in A['beats']]
json.dump({'source': 'force-aligned to the recording (local torchaudio CTC, large model, vocal stem); machine estimates',
           'duration': A['duration'], 'bpm': A['bpm'], 'beats': beats,
           'lines': out_lines, 'words': [{'w': w['w'], 'start': round(w['start'], 3), 'end': round(w['end'], 3)} for w in words]},
          open('data/lyrics.json', 'w'), indent=0)
for l in out_lines: print(f"{l['start']:7.2f} {l['end']:7.2f}  {l['text']}")
