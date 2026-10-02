# Genesis 3 — The Exile: visual brief

Song: "Genesis 3 — The Exile" (Suno). Contemporary alternative rock, a wounded baritone, 98 BPM, 5:50.
Genesis 3 in the Septuagint wording (the "garden of Delight" is Paradise; Eve is named "Life").
Film: Ultra Real (premium tier), 1920 × 1080, 60 fps, every frame drawn in code on the GPU.

## The idea

Paradise is real, and we are standing in it. The film is shot like a nature documentary that slowly
turns into a tragedy: long lenses, macro lenses, real light, shallow focus, wind in leaves, water,
dust. We never see a human face. People are only ever backlit silhouettes at a distance, shadows on
the ground, or bodies so out of focus they are shapes. God is never a figure: He is light moving
through the garden in the cool of the afternoon, wind that bends the grass toward the camera, a
voice that sets the words in tall warm capitals.

## The arc of the light (the film's spine)

1. **Paradise (0:00–1:20).** Low gold afternoon sun, warm haze, deep green, rivers, fruit everywhere.
   Everything is lush and generous. The only saturated red in the film is the fruit of the tree at
   the centre.
2. **The taking (1:20–1:47).** The guitars surge: wind hits the garden, the canopy thrashes, the
   light flickers. Macro: the fruit, the stem, the snap.
3. **Exposure (1:47–2:57).** The gold drains out in one long dissolve of the grade to a cold,
   exposed blue-grey afternoon. Shadows, trunks, the thicket, fig leaves. Light searches the garden.
4. **Judgement (2:57–4:30).** A storm breaks over Paradise. The serpent goes down into the dust.
   The earth cracks, dries, grows thorns. Hard white heat, dust in the air. "To earth you will
   return": a form of earth blows away to nothing.
5. **Mercy (4:31–5:10).** Warm again, but a different warmth: firelight and dawn, small and close.
   Flowers opening for "Life". Garments of skin. The tree of life seen far off, white-gold.
6. **The exile (5:10–5:50).** Night outside the garden. The east gate of Delight: the cherubim as
   towering shapes of wings and flame, the turning sword of fire, the path behind them to the tree of
   life. The film ends low and unresolved, but on the last held note a single small star of light
   rises on the far horizon beyond the gate: the promise (the seed of the woman, Christ, who opens
   Paradise again). Keep it small and quiet; no cross graphics, no text that is not sung.

## Orthodox notes (keep everything consistent with them)

- God is not shown as a man; the "voice walking in the garden" is light and wind.
- "He will keep watch against your head, and you against his heel" is the first promise of the
  Saviour (the Protoevangelium). Show it as light standing over the serpent's head, the serpent
  striking only at its foot. Hopeful, not gory.
- "Garments of skin" is mercy: God clothing them, warm and tender, not punishment.
- The cherubim follow iconography: many wings, fire, eyes on the wings suggested, never cute
  angels with baby faces.
- Eve's name "Life" is honoured: the word glows.

## Typography (the words are the star)

Lyric modules use `lib/type.js`. Each word's voice is set by who is speaking (`data/speakers.json`):
the narrator in upright bone Garamond, the serpent in an oily green-gold italic, God in tall warm
Bebas capitals that carry a little light, the man and the woman in a warm, human italic. Words of
meaning override the speaker: FRUIT red, death/curse/dust ash capitals, naked/afraid/hid a cold
italic, EARTH dust capitals, LIFE/live/forever/Delight lit gold, FIRE/SWORD flame.
Lyric layers are on a 3840 × 2160 canvas. Keep every word inside a 200 px margin; never let a word
leave the frame; one or two lines on screen at a time; previous lines are gone before the next scene.

## Rules for every scene

- Every frame is a pure function of song time (no randomness that is not seeded by position).
- Something visibly moves at all times (wind, water, light, camera). No dead stops.
- Cuts are already on beats (film.json); don't change scene times.
- Premium tier: 60 fps, wide-aperture lens where it helps (focus pulls), the finishing kit.
- Faces: never. Humans only as distant backlit silhouettes, shadows, or defocused shapes.
- No text in the picture other than the lyric layer.
- Contrast: every lyric word must read (4.5:1) against what is behind it.
