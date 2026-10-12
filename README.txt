CLAY SHOOTING GAME v19 - Refined Aim and Premium Results
========================================================

What's new in v19
- Aim accuracy: hit area now fits the clay's elliptical silhouette.
  At full size the hit region is approximately +/-31px horizontally
  and +/-18px vertically (v18 was +/-31px and +/-16px).
  Still more precise than v16's 36px circular hit region.
  The hit zone shrinks as the clay moves farther away.
- Performance: 9 short-lived shatter pieces rather than 16.
- Removed the expensive gun-layer drop shadow and blur-backed HUD passes.
- No more network requests for reload or clay-break audio.
  Both sound effects are now included as local WAV files.
- End-of-round animation handling simplified; round scheduling is unchanged.
- User-provided gunshot MP3 and 2-shell HUD remain unchanged.
- Same 60-second round, deterministic targets and gold waves at 15/30/45s.
- AI shooting coach remains local and uses rules/stats, not a paid AI API.

How to play on Windows
1. Extract ZIP to a folder.
2. Run run-local.bat (Python 3 must be installed).
3. If needed open http://localhost:8000/ in your browser.

Controls
- Move mouse to aim.
- Left mouse button: shoot.
- Right mouse button or R: reload.

Publishing
- This is a static website. Keep index.html, style.css, script.js,
  img/, ui/ and sounds/ together at the site root.
- Cartridge-specific score submission and verified leaderboards are NOT
  implemented here; these must be handled before a competition launch.
- Please test performance for a whole 60-second round in Edge on your PC.

Additional changes in v19:
- Wider side-to-side aim: ±50px translation, ±14 degree roll, ±18 degree yaw.
- Shotgun reduced to 380px max width (was 430px) and moved lower to avoid clipping.
- Redesigned genuine in-game end screen: dark metallic/gold trophy styling, giant score,
  final stats, and the existing local statistical shooting coach.
- No online leaderboard or score submission is implemented.

- preview/ending_screen_sample.png is an actual captured v19 result screen with DEMO values, not a generated concept image.
