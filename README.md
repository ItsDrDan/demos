# Chemistry Demo Library (ItsDrDan)

One page with every interactive lab and simulation from Dr. Dan’s study games, his lecture videos, and the demo videos he shows in class. Filter by course (CHEM 3A, 1A, 1B, 3B), chapter and type, or search a topic.

Live (after the first push): https://itsdrdan.github.io/demos/

## Linking and Canvas

- The address keeps the filters, so you can post a filtered view: `?course=3A&ch=8`, `?course=3B&type=lab`, `?q=osmosis`, `?type=demo`.
  - `type` is `lab` (interactives), `demo` (class demo videos) or `lecture`.
  - `ch` uses the Study Hub chapter ids (3A `1`–`14`, 1A `1`–`11` and `20`, 1B `ready`, `12`–`21`, 3B units `1`–`17`).
- In Canvas, iframe the page like any game. `embed.js` resizes the frame so it scrolls with the Canvas page.
- When a course is picked, game links add `?course=` so students land in their own course’s version of the game.

## Files

- `index.html`: the page (one file, no build step).
- `data/interactives.js`: the interactives, edited by hand. Each has a direct link that opens the lab.
- `data/demo-videos.js`: YouTube demo videos found in the lecture slides, with the deck and slide each came from.
- `data/lectures.js`: generated from the Study Hub catalog by `tools/build_lectures.js`.
- `projector/equilibrium/`: teacher projector mode, the Equilibrium Park 🎢 ride line and particle labs with no questions (`?sys=ride|no2|hi|fescn|hb|blood`), speeds ¼× to 2×. Built by `node tools/build_projector.js` from `tools/projector/equilibrium-src.html` and the game's engine in `../equilibrium/tools/`; rebuild after the game's engine changes.
- `labs/effusion/`: Graham’s Law effusion demo, copied from ItsDrDan/demonstrations (that repo has no GitHub Pages site).
- `SOURCES.md`: where every item came from (generated).

## Tools

```
node tools/build_lectures.js        # refresh lecture videos from ../games/data/hub.js
node tools/build_sources.js         # rewrite SOURCES.md
bash tools/check_videos.sh          # oEmbed check: every YouTube ID still plays
NODE_PATH=<folder with playwright and axe-core> node tools/check.js   # data + page tests + axe (WCAG 2.2 AA)
python3 -I tools/scan_slides.py <folders…> > scan.json                # find YouTube links in .pptx files
```

© 2026 Daniel Kwasniewski (ItsDrDan). All rights reserved; see LICENSE. Demo videos belong to their creators and play from YouTube. PhET simulations © University of Colorado, CC BY 4.0.
