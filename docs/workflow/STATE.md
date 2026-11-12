# Current state · Fruit Market

Updated 2026-11-12 22:07 (Asia/Kuala_Lumpur), session checkpoint. This file holds only what is needed to resume. The story of how we got here is in `records/decisions.json` (history), `DECISIONS.md`, the reports and Git.

## Where we are
- **Live:** 1.20.0, rules version 18 (`c17a053`, published 2026-11-12 19:43, tagged `v1.20.0`). The preview copy is `main`, the same build.
- **Working branch:** `ccr-d8bcd65d-gblqqb`, level with `main` apart from the records of the publish.
- **What 1.20.0 holds (REP-110, REP-111):** rules 18, the new cards, the whole day rebuilt on the table with its motion, the text of cards, story, tutorial and How to play.
- **Next release, 1.21.0: a candidate, awaiting the owner's word to publish** (REP-112, `050fb22` plus the release commit): the stamp book with Results, Trophies, Wardrobe and Home (PLAN-086), the screen labels with the approved boards' words kept (PLAN-089), the fixes from 1.20.0 and the owner's ruling that purchases show only while buying (PLAN-090, DEC-107), the privacy page. On his word: pull request to `main`, CI, then Deploy LIVE game, then mark it published. Eight choices are put to him in REP-112 section 3. The print kit (PLAN-087) is in the repo, not in the live game. Then releases B (Market Month, five-day Daily) and C.
- **Deadline:** the owner wants the rest ready inside the usage allowance before it resets on 2026-11-13 19:00.
- **Helpers:** agent ids, branches and briefs are in the scratchpad file `helpers.md`; each merges `ccr-d8bcd65d-gblqqb` into its branch before new work.

## Release A, package by package
| Package | Plan | Delivery |
|---|---|---|
| Rules 18 | PLAN-079 | Implemented (REP-105) |
| 1. Flow repairs and two defects | PLAN-081 | Implemented, merge `f50c9d5` (REP-107) |
| Balance choices (DEC-101) | PLAN-082 | Implemented, `9c0d11b` (REP-107) |
| 2. New pictures and card faces; shared motion blocks | PLAN-083 | Verified, merges `10ef387` and `fd95996` (REP-108); the owner keeps the cards as built (DEC-102) |
| **3, part 1. The rush; the morning, the standing-order bid and the evening** | PLAN-084 | Implemented and checked on the merged code (`04d12ed`, REP-110); in release 1.20.0; the owner has not seen it yet |
| 3, part 2. One sheet from stocking to the takings; the market lanes, the stalls, buying, the lorry, the night | PLAN-085 | Implemented and checked on the merged code (`ca39c60`, REP-111); in release 1.20.0 |
| 4, part 1. The text outside the screens (DEC-087) | PLAN-088 | Implemented, merged and checked (REP-111); in release 1.20.0. Left for part 2: 203 audit entries in screen files, the helper's full list and the owner's read of the samples |
| 4, part 2. The screen labels | PLAN-089 | Implemented, merged and checked; in candidate 1.21.0 |
| 5. Trophy fixes, stamp book, Results, Trophies, Wardrobe, Home (DEC-097, DEC-099, DEC-103) | PLAN-086 | Implemented, merged and checked; in candidate 1.21.0 |
| 6, part 1. The print kit on rules 18 | PLAN-087 | Implemented and merged (`d1f5f01`): `print/kit`, `print/update-18`, `print/tracker-test`. Not done: a proof print; the owner's choice of tracker 1 or 2 |
| Fixes for the known gaps of 1.20.0, and DEC-107 | PLAN-090 | Implemented, merged and checked; in candidate 1.21.0 |
| 6, part 2. Release preparation (version, release entry, player notes) | not opened | Last |

**Side by side (DEC-104):** the owner asked for speed, so the packages left are built at the same time by helpers in separate work folders (`.claude/worktrees`), each from a brief in the session scratchpad (`brief-common.md` plus `brief-084-panels.md`, `brief-085-sheets.md`, `brief-085-table.md`, `brief-086-stamps.md`, `brief-087-print.md`, `brief-088-text.md`). Helpers commit on their own branch and do not push. For each one that reports: review the report and the diff, merge with `--no-ff` (shared files: `Game.tsx`, `useGameController.ts`, `animator.tsx`, `table.tsx`, `motion.ts`, `cards.tsx`, `cards.css`), run `npm run verify` and `npm run test:e2e` on the merged code, look at each screen beside its board at 390x844 and 360x640 with 4 and 6 stalls, record the plan's checks, write the report, show the owner. An hourly scheduled check-in ("Release A: keep the work moving") restarts stopped helpers; delete it when release A is ready.

## Checks (on `050fb22`, the code of candidate 1.21.0)
- `npm run verify`: PASS (76 files, 819 tests, 1 skipped).
- `npm run test:e2e`: PASS (solo game, performance budget, online match 0 leaks with rematch and takeover, quick match, four players, reconnect 5 of 5).
- On the CI machines: NOT RUN until the merge to `main`. Release 1.20.0 passed there (run 136) and on Deploy LIVE game run 39.
- Balance target: PASS at 2, 3 and 4 stalls; narrow FAIL at 6 stalls and against Hard computers, accepted by the owner (DEC-102).
- Played by people: the owner has played 1.20.0 (his ruling DEC-107 came from it).

## Decided, and waiting on the owner
- **DEC-102 (2026-11-12):** the cards stay as built; the preview copy is not updated at milestones, release A is finished first and then goes live; the balance is accepted for release A, Raj and Saleh watched in playtests.
- **DEC-103 (2026-11-12):** stocking and the takings (package 3) and the results, stamp book, trophy cards and Wardrobe (package 5) are built as drawn in REP-109; rank names kept; looks show as an awning strip over the shelf and on a rival's view of the box. Boards: `docs/studio/review-18/mockups`.
- **DEC-107 (2026-11-12):** what a stall bought is drawn only while buying, hidden from stocking on (the owner's ruling after playing 1.20.0); screens, RULES.md and How to play; rules version stays 18; in 1.21.0.
- **DEC-106 (2026-11-12), done:** 1.20.0 was held and published when the rest of the day's screens were ready; the small-phone scroll in the evening and the bid, and the "You wins" sentences, are fixed in it.
- **DEC-105 (2026-11-12):** the core game goes live first; the stamp book, the screen labels and the print kit follow in later releases.
- **DEC-104 (2026-11-12):** "speed it up please": the remaining packages are built side by side; no check is dropped.
- Each later release needs his own word for that build.
- Not blocking: tracker 1 (ruler) or 2 (tray) for the print kit; Pasar Malam's night sky; whether a waiting game's table page comes first on Home (assumed yes).

## Sources
- Designs: `docs/studio/review-18/mockups` (chosen boards, DEC-090 to DEC-097); design page https://claude.ai/artifact/TM2aRxtEpQsqxAo1cAK8Cx.
- Pictures: `docs/studio/art-drafts/cards-18`.
- Studies: `docs/studio/review-18` (`FLOW-AND-MOTION.md`, `PROGRESSION.md`, `SINGLE-PLAYER.md`).
- Balance scripts: `docs/studio/review-17/balance/scripts18`.

## Known issues kept for later packages
- Package 3: at 360x640 the rush hides the stalls' offers; the morning needs a scroll; the bid panel needs a scroll on phones 640 to 699 px tall and part of the order card sits behind the controls; the rush card's way back is cut short; the row grows 17 px when walk-ins turn face up; the middle panel is redrawn at every rival step; pop-ups appear in three steps; first-game tips squeeze Stocking and Pricing; old card styles left in four stylesheets; "No sales today" is drawn over the day strip; a Skip button shows at night; online bid marks and "Change bid" (read from code only).
- Package 5: "Serve all 36 customers" counts guests and order clients.
- Package 6: `scripts/print-deck.ts` cannot run on the rules 18 deck (expects 18 favour cards, finds 12; old card markup). Package 4: new fixed labels on the cards are listed in REP-108 section 2.
- `scripts/qa-sweep.cjs` lacks the Favoured Trade step. The tracker test PDFs still say rules version 17. The game brief still says "no accounts, no purchases".
- Older: live telemetry and leaderboard data have no backup (PLAN-003, proposed); branch protection not confirmed; the Play store home screenshot is outdated.

## Resume instruction
"Read the project instructions and current state. Inspect the current Git state. Tell me where we
stopped and recommend the next small task. Wait for my approval before implementation."

<!-- records:pending:start (generated by npm run records) -->
## Pending approvals (generated)

- PLAN-003: Package C, paid part: capacity and cost evidence (proposed)
- PLAN-018: Data insights: balance, retention and online health from anonymous counters (proposed)
<!-- records:pending:end -->
