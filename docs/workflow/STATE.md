# Current state · Fruit Market

Updated 2026-11-16 20:46 (Asia/Kuala_Lumpur), session checkpoint. Only what is needed to resume; the story is in `records/decisions.json` (history), `DECISIONS.md`, the reports and Git.

## Where we are
- **Live:** 1.24.0, rules version 19, protocol 4 (`3aed6c7`, tagged `v1.24.0`, published 2026-11-16 07:54; DEC-119, REP-121): shopkeepers chosen after everyone joins a room (PLAN-102), first-time How to play popup online (PLAN-103), seat numbers and the FIRST token (PLAN-104), iPhone price-tag fix (PLAN-105), new card look in app and print (PLAN-106), print pack at rules 19 (PLAN-100). The preview is the same build.
- **Preview:** 1.24.1 (main e1cccbd, pull request #20, CI PASS, updated 15:09). Live is still 1.24.0. Main must stay 1.24.1 until it is published: open no other pull request to main before then (the live deploy builds main).
- **Working branch:** `ccr-d8bcd65d-gblqqb`: main plus PLAN-108 (merge 0ff8d2c, rules 20) PLAN-109 (merge 4bb18df) and PLAN-110 (merge b61d386). This is the 1.25.0 content.
- **In progress (DEC-120, REP-123 approved "okay approve"):**
  - PLAN-107 (Major fixes): implemented; 1.24.1 on the preview. Waits for the owner on the preview, then his word to publish (then mark the release published and tag via the deploy).
  - PLAN-108 (rules 20): implemented and merged into the working branch (0ff8d2c); goes out in 1.25.0. Trophy name to settle with the owner.
  - PLAN-109 (print and words): implemented and merged (4bb18df); kit, update-20 and tracker packs rebuilt; goes out in 1.25.0. The owner's check of the kit waits for the proof print.
  - PLAN-110 (smaller bugs and polish): implemented and merged (b61d386); verify PASS (1009 tests), e2e every part OK with the speed check noisy on this machine (see Known issues), screens PASS. Goes out in 1.25.0.
  - Next: prepare 1.25.0 (PLAN-108, PLAN-109, PLAN-110: version, releases candidate, REP, pull request to main) only after 1.24.1 is published; then the owner tries the preview and gives his word to publish.
  - Weekly Player numbers report runs Mondays 09:07 (PLAN-101).
- **Commits:** author Murshidi Hashim, committer Claude <noreply@anthropic.com> (so GitHub shows the signature as verified); set per commit with GIT_AUTHOR_NAME/GIT_AUTHOR_EMAIL, no local git user override.
- **Waiting on the owner:** (0) try 1.24.1 on the preview and say whether to publish it (REP-124); the trophy's name ("Sold out" clashes with the level-10 "Sold out" stamp; recommended "Clean shelf"); (1) the iPhone price-tag fix seen on a real iPhone; (2) DEC-121 / PLAN-111 (REP-125): he no longer has the board, shutters and pieces; the proposal is a new table set with the freshness ruler (tracker 1) and bought 10 mm wooden cubes; three questions (freshness way, cubes or printed tiles, A3 panels or foam board). He has the print-shop package (cards safe to print now; stall sheets, counters, guidebook and board patches on hold); (3) the back arrow while choosing a shopkeeper (leave or disconnect), the +3/+4 computer buttons and HOST tag fixes, in-game tips online for first-timers; (4) the 8 name choices (REP-118); (5) REP-112 section 3 choices.

## How work is done now
When work runs side by side (DEC-104), helpers build in their own work folders (`.claude/worktrees`) from briefs in the session scratchpad (`brief-common.md` and one brief per job; `helpers.md` lists ids and branches). They commit on their branch and never push. For each report: review, merge with `--no-ff`, `npm run verify` and `npm run test:e2e` on the merged code, look at the screens at 390x844 and 360x640, record the plan's checks, push. Publishing follows the release path in `CLAUDE.md` and needs the owner's word for that build.

## Checks (1.24.1 candidate)
- Preview: main CI PASS, preview updated and smoke-tested (15:09), answers rules 19, code 1.24.1.
- Local on the merge 68864cd: `npm run verify` PASS (965 tests, 1 skipped as before); `npm run test:e2e` PASS (0 leaks in 58 frames; speed test OK first time, 189 ms); screens at 390 and 360 PASS; a 1.24.0 phone against the new room server PASS. Real Android (invite links) NOT RUN; owner on the preview NOT RUN.

## Checks (1.24.0, live)
- Local on the merge 7ed9e3b: `npm run verify` PASS (942 tests); e2e PASS on each part (0 leaks).
- CI: pull request #19 PASS; main PASS, preview updated. Deploy run 43 PASS (live smoke test, tag `v1.24.0`); live `/api/version` answers rules 19, live code carries 1.24.0.
- Review REP-122 (on b0f7108): 9 whole solo games, online on a local room server (0 leaks in 624 messages), print and rules read against the data. Not run: real iPhone, real Android, `test:e2e` (nothing changed).
- Print: kit, update pack and tracker tests regenerated for 1.24.0; REP-122 found errors on the player aid, guidebook and event cards. Proof print: NOT RUN. Played by people on 1.24.0: NOT RUN. iPhone fix on a real iPhone: NOT RUN.

## Sources
Designs `docs/studio/review-18/mockups` (Rush-D chosen and built, DEC-109); design page https://claude.ai/artifact/TM2aRxtEpQsqxAo1cAK8Cx; pictures `docs/studio/art-drafts/cards-18`; studies `docs/studio/review-18`; balance scripts `docs/studio/review-17/balance/scripts18` (patch `orderPlus2` = the owner's standing-order proposal).

## Known issues
- The performance budget's longest task is near its limit on this machine (125 to 344 ms seen by load; 238 to 315 ms on 2026-11-14 for both 1.22.0 and the PLAN-096 build; on 2026-11-16 the start commit 0ff8d2c failed 3 of 3 and the PLAN-110 merge 1 of 2 alone, 186 to 266 ms); 63 ms on CI.
- Left from PLAN-110: names cut in 5 to 6 stall boxes, the rush's tie reasons at 6 stalls and the lorry's name in the Tomorrow strip at 390 with 6 stalls; unsent crate, prices or bid are warned about rather than kept; on shared pass-and-play steps the top bar shows the last person's rank and cash; the evening warning lacks a full stop between its two sentences ("3 fruit spoil tonight Heatwave: …").
- After PLAN-096: rare hand-made mornings with several two-line notices still scroll at 360x640; market boxes on short screens, Home's middle dot (three pages), Trophies tabs, ladder rows and some buying buttons are under 40 px; Home's Wants chip and lorry tiles, set-up labels and Trophies' unearned pips are faint. `scripts/smoke.cjs` waits for a highlight no screen draws.
- Older: live telemetry and leaderboard data have no backup (PLAN-003, proposed); branch protection not confirmed.

## Resume instruction
"Read the project instructions and current state. Inspect the current Git state. Tell me where we
stopped and recommend the next small task. Wait for my approval before implementation."

<!-- records:pending:start (generated by npm run records) -->
## Pending approvals (generated)

- DEC-121: A new table set (board, shutters, pieces) with an easier freshness tracker (awaiting approval)
- PLAN-003: Package C, paid part: capacity and cost evidence (proposed)
- PLAN-018: Data insights: balance, retention and online health from anonymous counters (proposed)
- PLAN-111: New table set: board, shutters, pieces and the freshness ruler (print and play) (awaiting approval)
<!-- records:pending:end -->
