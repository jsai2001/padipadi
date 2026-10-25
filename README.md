# PadiPadi (படி படி)

Learn **spoken Tamil** by playing. English ↔ Tamil sentences grouped by mood and topic, with flashcards, quizzes, a "build the sentence" game, matching pairs, and a sentence builder that conjugates verbs live.

It's a static site with no server. Open `index.html` in a browser, or deploy the folder to any static host. Progress is saved in your browser (`localStorage`).

## What's inside

- **1,652 sentences in 19 categories**:
  - Moods: Happy, Sad, Regret, Surprise, Love, Revenge, Lust (18+), Sex (18+)
  - Topics: General Communication, Questions, Numbers/Time/Money, Family, Food & Restaurant, Work & Office, Travel & Directions, Phone Calls, Slang & Expressions, Politics, Everyday Things

  The two 18+ categories are hidden until you turn them on in **Me → Settings**. They cover attraction, flirting, intimacy, boundaries and consent, and are not explicit.
- **Telugu reference**: every sentence also shows its spoken-Telugu meaning under the English, so Telugu speakers can compare (Tamil is still what you learn; answers are always Tamil). Turn it off in **Me → Settings**. Stored in `data/telugu/<category>.tsv` as `English | Telugu`, matched to the Tamil sentence by its English text.
- **Tap-a-word meanings** for about 1,240 words (about 84% of all word taps), with the Telugu equivalent and ≈ / ⚠ notes. About 200 of them are worked out by `build.py` from a known word plus a common ending (எக்ஸாம்ல = exam + in).
- **Every sentence** shows English, Tamil script and Tanglish (romanized), with tap-a-word meanings and 🔊 audio (uses your device's Tamil voice when it has one).
- **Games**: Flashcards (tap to flip, swipe right/left), Quiz (both directions, combo bonus), Build it (put the Tamil words in order), Match (pairs against the clock).
- **Sentence builder**: who × what × past/present/future × positive/negative × optional time word, **10,926 combinations**. The part of the verb that changes with the person is highlighted, with a one-line rule.
- **Install & offline**: from its web address (https, e.g. GitHub Pages) PadiPadi can be installed as an app (**Me → Install the app**; on iPhone, Safari → Share → Add to Home Screen) and then works fully offline. Opened as a local file it still works, it just can't be installed.
- **Progress**: XP, daily goal, streak, and spaced repetition (missed phrases come back sooner; a phrase counts as mastered after three correct reviews in a row).

## Layout

```
data/
  categories.json        category names, emoji, colors, 18+ flag
  sentences/<id>.tsv     one sentence per line: English | Tamil | Tanglish
  words.tsv              Tamil word | meaning [| Telugu [| ≈ or ⚠ note]] (for tap-a-word)
build.py                 validates data/, writes data.js, stamps the sw.js cache version
data.js                  GENERATED. Don't edit by hand.
js/lexicon.js            builder vocabulary: people, verb stems, phrases
js/builder.js            conjugation engine
js/app.js                views, games, progress
styles.css
index.html
sw.js                    service worker: caches the app for offline use
manifest.webmanifest     app name, colors and icons for installing
icons/                   app icons (192/512, maskable, Apple touch, favicon)
tests/builder.test.js    conjugation tests (node tests/builder.test.js)
```

## Adding sentences

Add lines to `data/sentences/<category>.tsv`:

```
I'm very happy today. | இன்னைக்கு நான் ரொம்ப சந்தோஷமா இருக்கேன். | Innaikku naan romba santhoshamaa irukken.
```

Then run `python3 build.py`. It stops with a clear message if a line is malformed, the Tamil field contains Latin letters, the Tanglish isn't plain ASCII, the Tamil and Tanglish word counts differ, or an English sentence is duplicated. `python3 build.py --check` tells you if `data.js` or the `sw.js` cache version is out of date.

Always run `python3 build.py` after changing any app file (not just data): it updates the cache version in `sw.js`, which is how installed copies know to download the new version.

## Adding builder phrases

Add an entry to `actions`, `states` or `feelings` in `js/lexicon.js`, then run `node tests/builder.test.js`. The test checks known conjugations and validates every generated combination.

## A note on accuracy

The sentences are written in everyday spoken Tamil (Chennai-style colloquial), not formal written Tamil. They haven't been reviewed by a native speaker yet, so some may sound unnatural. Corrections are just edits to the `.tsv` files.
