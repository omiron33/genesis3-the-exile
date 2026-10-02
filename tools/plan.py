"""Scene plan: each scene starts at a lyric line (index into data/lyrics.json lines) or a time.
The cut is the last measured beat at or before 0.08 s ahead of that line's first sung word (and
after the previous scene's start). Writes film.json."""
import json
L = json.load(open('data/lyrics.json')); beats = L['beats']; lines = L['lines']
PLAN = [
 ('s00-title', 0.0),
 ('s01-creatures', 0),
 ('s02-sly', 1),
 ('s03-turned', 2),
 ('s04-every-tree', 3),
 ('s05-we-eat', 4),
 ('s06-orchard', 5),
 ('s07-center', 6),
 ('s08-touch', 7),
 ('s09-lest', 9),
 ('s10-replied', 10),
 ('s11-no-death', 11),
 ('s12-awake', 12),
 ('s13-discern', 14),
 ('s14-surge', 80.9),
 ('s15-saw', 16),
 ('s16-beauty', 17),
 ('s17-plucked', 19),
 ('s18-passed', 20),
 ('s19-knew', 22),
 ('s20-figs', 24),
 ('s21-voice', 26),
 ('s22-walking', 27),
 ('s23-turned', 28),
 ('s24-hid', 29),
 ('s25-called', 30),
 ('s26-afraid', 32),
 ('s27-who-told', 35),
 ('s28-forbade', 36),
 ('s29-blame', 38),
 ('s30-what', 41),
 ('s31-tricked', 43),
 ('s32-to-serpent', 45),
 ('s33-curse', 46),
 ('s34-beast', 47),
 ('s35-belly', 48),
 ('s36-dust-food', 49),
 ('s37-enmity', 51),
 ('s38-heel', 54),
 ('s39-pain', 56),
 ('s40-rule', 223.26),
 ('s41-to-adam', 61),
 ('s42-cursed', 64),
 ('s43-thorn', 67),
 ('s44-sweat', 70),
 ('s45-earth', 71),
 ('s46-return', 73),
 ('s47-life', 74),
 ('s48-garments', 76),
 ('s49-one-of-us', 79),
 ('s50-lest-he-reach', 81),
 ('s51-tree-of-life', 82),
 ('s52-sent', 84),
 ('s53-to-work', 85),
 ('s54-drove', 87),
 ('s55-cherubs', 89),
 ('s57-path', 91),
]
HOLD = {
 's00-title': 'the title opening over the instrumental, one continuous flight',
 's01-creatures': 'one long sung line; the meadow breathes with it',
 's08-touch': 'the slow creep toward the fruit is the point of the shot',
 's16-beauty': 'desire: a slow macro the music lingers on',
 's24-hid': 'the near-silent breakdown: a held breath in the thicket',
 's39-pain': 'the seed splitting is slow by nature',
 's40-rule': 'two shadows; stillness carries the weight',
 's41-to-adam': 'the storm pull-back over three lines',
 's42-cursed': 'a time-lapse needs its length',
 's47-life': 'the bridge: flowers opening, mercy',
 's48-garments': 'firelight; tenderness is slow',
 's49-one-of-us': 'the far tree across the river',
 's53-to-work': 'the lone walk away',
 's51-tree-of-life': 'the tree of life: a slow orbit of the one thing out of reach',
 's57-path': 'the ending: a long hold to the last sound',
}
starts = []
for name, a in PLAN:
    t = 0.0 if a == 0.0 and name == 's00-title' else (a if isinstance(a, float) else lines[a]['start'] - 0.08)
    if name != 's00-title':
        cand = [b for b in beats if b <= t and (not starts or b > starts[-1][1] + 1.0)]
        t = cand[-1] if cand else t
    starts.append((name, round(t, 3)))
end = L['duration']
scenes = []
for i, (name, t) in enumerate(starts):
    to = starts[i + 1][1] if i + 1 < len(starts) else end
    sc = {'id': f'{i:02d}', 'scene': name, 'from': t, 'to': round(to, 3)}
    if name in HOLD: sc['hold'] = HOLD[name]
    scenes.append(sc)
film = {'fps': 60, 'samples': 16, 'tier': 'premium', 'lyric': {'haloSpread': 9, 'shade': 0.5}, 'scenes': scenes}
json.dump(film, open('film.json', 'w'), indent=1)
for s in scenes:
    print(s['id'], f"{s['from']:7.2f} {s['to']:7.2f} {s['to']-s['from']:5.2f}", s['scene'])
