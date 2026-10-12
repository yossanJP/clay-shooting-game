# Cartridge AI Builder — v19 Handoff

**Project:** CLAY SHOOTING / 60 SECOND CHALLENGE
**Entry point:** `index.html` (static HTML5 game)
**Source version:** v19; do not fall back to earlier versions.

## Preserve exactly
1. Realistic shooting range background and first-person double-barrel shotgun + hands with smooth pointer tracking (gun angle reacts to mouse movement, including reload).
2. Left-click shooting, **R** or right-click reload, two shells with spent shells shown semi-transparent.
3. Sixty-second run. Same deterministic clay flight schedule each run (the generated target trajectory is not player-dependent).
4. Gold clays at 15/30/45s elapsed, 3x bonus. Reaction-time and combo bonuses must remain.
5. Narrow ellipse-shaped hit detection, rather than a generous circular hitbox.
6. Premium black/gold ending results with final score, max combo, targets hit, accuracy, gold hits, and offline rules-based coach.
7. All audio, graphics, and UI assets included locally; do not substitute assets or auto-generate a different design without permission.

## Cartridge platform adaptation
- Implement official wallet/session flow and server-verified score submission **only through the documented supported Cartridge interface**; do not invent client API endpoints.
- Ensure one score submission per run at end-of-round; confirm 60-second time integrity and add server-side validation against impossible scores.
- Run gameplay checks on desktop browsers, including Edge, with repeated 60s runs and multiple restarts.
- Avoid adding heavy frameworks, AI endpoints, or paid APIs. The shooting coach is local statistics, not a generative model.
- Do not introduce auto-aim, bots, macros, wallet requests, or pay-to-win adjustments.

## Japanese context
このリポジトリはゲームv19の完成ソースです。銃画像・背景・効果音・残弾UI・ゴールドクレー・黒金の結果画面を変更しないでください。Cartridgeへのスコア提出連携だけは公式仕様に従って追加し、公平なランキングが動くように確認してください。旧版への巻き戻しは禁止です。
