# Clay Shooting — 60 Second Challenge (v27)

A standalone browser-based clay shooting arcade game built with vanilla HTML, CSS and JavaScript.

## Gameplay
- 60-second score challenge.
- Move the mouse to aim; left click to shoot; right click or **R** to reload.
- Two-shot magazine, with on-screen shell ammo indicators.
- Mobile controls: left-thumb trackpad with LOW/MID/HIGH sensitivity and right-side SHOOT/RELOAD buttons. Desktop is recommended.
- Deterministic clay trajectories so every round follows the same schedule.
- Gold clays appear at 15, 30 and 45 seconds of elapsed play; each earns 3x points.
- Fast reactions and hit streaks increase points.
- End-of-round premium black-and-gold results screen with an offline, rules-based **AI Shooting Coach**; no remote AI API is used.

## Run locally
Serve the repository root as static files (do not open index.html directly with file://).
For example run `python -m http.server 8000` and browse to http://localhost:8000/ .
On Windows, `run-local.bat` starts the local web server.

## Structure
- `index.html` — entry point / score screen
- `style.css` — UI and animations
- `script.js` — game logic, score, audio and fixed wave schedule
- `img/` — range and gun visuals
- `ui/` — shotgun shell HUD artwork
- `sounds/` — all in-game sounds locally bundled
- `preview/` — screenshot captured from the running game

## Cartridge integration notes
This source project is playable as a **local static website**. It is **not yet integrated with Cartridge's official verified score reporting**. The Cartridge AI builder or integration workflow must adapt score submission, sign-in / leaderboard and fair run validation before paid competition.

Do not claim that pushing this GitHub repository automatically updates an existing Cartridge game. Verify the update method on the relevant Cartridge game page.

### Build guidance for a Cartridge AI builder
See `CARTRIDGE_BUILD_NOTES.md`. Preserve visuals and core gameplay; only change code required by the platform after it passes browser tests.

## Licensing and asset permissions
Before reusing this project on a public platform, the publisher must decide which open-source license (if any) to apply to code and verify rights for all embedded artwork and sounds. No license grant is asserted by this README.
