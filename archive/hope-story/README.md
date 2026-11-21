# Hope Story game (archived)

The original "Daily Star" story-guessing game: read the start of a real feel-good
news story (16 stories, each linked to its source), type how you think it ended,
and earn 10–100 coins depending on how close you got. One story per day.

It was replaced by Ava's Daily Star (`daily-star.js`, skill rounds + Vision Board)
and is **not loaded by the site**. The files here are exact copies from commit
`1b997a0` (git tag `hope-story-game`), the last version where it was live.

| File | What it is |
|---|---|
| `dailystar.js` | Stories, scoring, and screen logic (`window.startDailyStar`) |
| `star-card.html` | The `<section id="starCard">` markup; it lived inside `.intro-stage` in `index.html` |
| `dailystar.css` | Its styles (`.star-card`, `.pstar`, `.star-*`, `.star-mode`) |

## Bringing it back

1. Copy `dailystar.js` to the project root and add `<script src="dailystar.js"></script>`
   after the other scripts in `index.html`.
2. Paste `star-card.html` inside `<div class="intro-stage">`, after `#introNote`.
3. Append `dailystar.css` to `style.css`.
4. Watch for clashes with Ava's Daily Star: both define `window.startDailyStar`
   and both save under `S.dailyStar`. Give the story game its own button and
   function name, and its own save key (e.g. `S.hopeStory`).

Or see the whole thing as it was: `git checkout hope-story-game`.
