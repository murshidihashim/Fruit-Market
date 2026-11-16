# Current state · Fruit Market

Updated 2026-11-16 14:35 (Asia/Kuala_Lumpur), session checkpoint. Only what is needed to resume; the story is in `records/decisions.json` (history), `DECISIONS.md`, the reports and Git.

## Where we are
- **Live:** 1.24.0, rules version 19, protocol 4 (`3aed6c7`, tagged `v1.24.0`, published 2026-11-16 07:54; DEC-119, REP-121): shopkeepers chosen after everyone joins a room (PLAN-102), first-time How to play popup online (PLAN-103), seat numbers and the FIRST token (PLAN-104), iPhone price-tag fix (PLAN-105), new card look in app and print (PLAN-106), print pack at rules 19 (PLAN-100). The preview is the same build.
- **Working branch:** `ccr-d8bcd65d-gblqqb`: main plus PLAN-107 (merge 68864cd) and the 1.24.1 release candidate (REP-124). Pull request to main sends it to the preview.
- **In progress (DEC-120, REP-123 approved "okay approve"):**
  - PLAN-107 (Major fixes): implemented; release 1.24.1 candidate (rules 19 kept). Waits for the owner on the preview, then his word to publish.
  - PLAN-108 (rules 20: no Closing Day or jam maker; one perk each in the Daily and League): built and checked on local branch `worktree-agent-ac6f9ec6d7f5817e9` (tip 2060cf9, worktree `.claude/worktrees/agent-ac6f9ec6d7f5817e9`), NOT on the working branch. Merge it into the working branch with `--no-ff` once the 1.24.1 pull request is merged into main, then record its checks; open no other pull request to main until 1.24.1 is published (the live deploy builds main). Balance: no shopkeeper moved more than 0.7 points over 9,600 games a side at 3 Hard stalls; every stall about $4 poorer. Evidence in the session scratchpad `p108/`.
  - PLAN-109 (print and words) and PLAN-110 (smaller bugs and polish): approved, not started; briefs to write (`brief-common.md` now says helpers keep the default committer).
  - Weekly Player numbers report runs Mondays 09:07 (PLAN-101).
- **Commits:** author Murshidi Hashim, committer Claude <noreply@anthropic.com> (so GitHub shows the signature as verified); set per commit with GIT_AUTHOR_NAME/GIT_AUTHOR_EMAIL, no local git user override.
- **Waiting on the owner:** (0) try 1.24.1 on the preview and say whether to publish it (REP-124); the trophy's name ("Sold out" clashes with the level-10 "Sold out" stamp; recommended "Clean shelf"); (1) the iPhone price-tag fix seen on a real iPhone; (2) a proof print (Bangsar shops suggested; after the PLAN-109 print fixes) and tracker 1 or 2, and whether he still has the board, shutters and pieces; (3) the back arrow while choosing a shopkeeper (leave or disconnect), the +3/+4 computer buttons and HOST tag fixes, in-game tips online for first-timers; (4) the 8 name choices (REP-118); (5) REP-112 section 3 choices.

## How work is done now
When work runs side by side (DEC-104), helpers build in their own work folders (`.claude/worktrees`) from briefs in the session scratchpad (`brief-common.md` and one brief per job; `helpers.md` lists ids and branches). They commit on their branch and never push. For each report: review, merge with `--no-ff`, `npm run verify` and `npm run test:e2e` on the merged code, look at the screens at 390x844 and 360x640, record the plan's checks, push. Publishing follows the release path in `CLAUDE.md` and needs the owner's word for that build.

## Checks (1.24.1 candidate)
- Local on the merge 68864cd: `npm run verify` PASS (965 tests, 1 skipped as before); `npm run test:e2e` PASS (0 leaks in 58 frames; speed test OK first time, 189 ms); screens at 390 and 360 PASS; a 1.24.0 phone against the new room server PASS. Real Android (invite links) NOT RUN; owner on the preview NOT RUN.

## Checks (1.24.0, live)
- Local on the merge 7ed9e3b: `npm run verify` PASS (942 tests); e2e PASS on each part (0 leaks).
- CI: pull request #19 PASS; main PASS, preview updated. Deploy run 43 PASS (live smoke test, tag `v1.24.0`); live `/api/version` answers rules 19, live code carries 1.24.0.
- Review REP-122 (on b0f7108): 9 whole solo games, online on a local room server (0 leaks in 624 messages), print and rules read against the data. Not run: real iPhone, real Android, `test:e2e` (nothing changed).
- Print: kit, update pack and tracker tests regenerated for 1.24.0; REP-122 found errors on the player aid, guidebook and event cards. Proof print: NOT RUN. Played by people on 1.24.0: NOT RUN. iPhone fix on a real iPhone: NOT RUN.

## Sources
Designs `docs/studio/review-18/mockups` (Rush-D chosen and built, DEC-109); design page https://claude.ai/artifact/TM2aRxtEpQsqxAo1cAK8Cx; pictures `docs/studio/art-drafts/cards-18`; studies `docs/studio/review-18`; balance scripts `docs/studio/review-17/balance/scripts18` (patch `orderPlus2` = the owner's standing-order proposal).

## Known issues
- The performance budget's longest task is near its limit on this machine (125 to 344 ms seen by load; 238 to 315 ms on 2026-11-14 for both 1.22.0 and the PLAN-096 build); 63 ms on CI.
- After PLAN-096: rare hand-made mornings with several two-line notices still scroll at 360x640; market boxes on short screens, Home's middle dot (three pages), Trophies tabs, ladder rows and some buying buttons are under 40 px; Home's Wants chip and lorry tiles, set-up labels and Trophies' unearned pips are faint. `scripts/smoke.cjs` waits for a highlight no screen draws.
- Older: live telemetry and leaderboard data have no backup (PLAN-003, proposed); branch protection not confirmed.

## Resume instruction
"Read the project instructions and current state. Inspect the current Git state. Tell me where we
stopped and recommend the next small task. Wait for my approval before implementation."

<!-- records:pending:start (generated by npm run records) -->
## Pending approvals (generated)

- PLAN-003: Package C, paid part: capacity and cost evidence (proposed)
- PLAN-018: Data insights: balance, retention and online health from anonymous counters (proposed)
<!-- records:pending:end -->
