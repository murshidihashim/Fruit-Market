# Current state · Fruit Market

Updated 2026-11-12 12:32 (Asia/Kuala_Lumpur), session checkpoint. This file holds only what is needed to resume. The story of how we got here is in `records/decisions.json` (history), `DECISIONS.md`, the reports and Git.

## Where we are
- **Live:** 1.19.1, rules version 16 (`35bda0a`, published 2026-11-11). The preview copy is `main` (`f78c023`), also rules 16.
- **Working branch:** `ccr-d8bcd65d-gblqqb`, 44 commits ahead of `main`. It holds rules version 18, never merged, never on the preview, not published.
- **The plan (REP-106, DEC-098 to DEC-100):** three releases. A: the rebuilt game (rules 18, new cards and screens, smooth motion, text, trophies and the stamp book's first version, the print kit). B: the Market Month single-player mode and a five-day Daily. C: weekly goal and table looks.

## Release A, package by package
| Package | Plan | Delivery |
|---|---|---|
| Rules 18 | PLAN-079 | Implemented (REP-105) |
| 1. Flow repairs and two defects | PLAN-081 | Implemented, merge `f50c9d5` (REP-107) |
| Balance choices (DEC-101) | PLAN-082 | Implemented, `9c0d11b` (REP-107) |
| 2. New pictures and card faces; shared motion blocks | PLAN-083 | Verified, merges `10ef387` and `fd95996` (REP-108); the owner keeps the cards as built (DEC-102) |
| **3, part 1. The rush; the morning, the standing-order bid and the evening** | **PLAN-084** | **Active, in progress** |
| 3, later parts. Pricing, the bell and Favoured Trade; buying and the lanes; the lorry, stocking, the night, the results | not opened | |
| 4. The text (DEC-087) | not opened | |
| 5. Trophies, stamp book, Trophies, Wardrobe, Results, Home (DEC-097, DEC-099) | not opened | |
| 6. Print kit and release preparation | not opened | |

PLAN-084 is built by two helpers in separate work folders: one on the rush, one on the morning, the bid and the evening. Briefs: the session scratchpad (`brief-084-rush.md`, `brief-084-panels.md`). When they report: review, merge (shared files: `Game.tsx`, `table.tsx`, `useGameController.ts`, `motion.ts`, `cards.css`), run `npm run verify` and `npm run test:e2e`, look at each screen beside its mock-up at 390x844 and 360x640 with 4 and 6 stalls, record T1 to T5, show the owner (T6).

## Checks (latest, on `fd95996`)
- `npm run verify`: PASS (63 files, 605 tests, 1 skipped).
- `npm run test:e2e`: PASS (solo game, performance budget, online match 0 leaks, reconnect 5 of 5).
- Performance before and after package 2 (3 runs each): no clear change; about 30 more page elements; more pieces of work over 50 ms; all far inside the limits. Not run on the CI machines.
- Pass-and-play hand-over: PASS (nothing of the first person's prices on the page).
- Balance target (every shopkeeper within 4 points): PASS at 2, 3 and 4 stalls; FAIL narrowly at 6 stalls (Nest Egg +4.3) and against Hard computers (Bargain Hunter +5.6, +4.8).
- Played by people: NOT RUN. Seen by the owner on the preview: NOT RUN.

## Decided, and waiting on the owner
- **DEC-102 (2026-11-12):** the cards stay as built; the preview copy is not updated at milestones, release A is finished first and then goes live; the balance is accepted for release A, Raj and Saleh watched in playtests.
- **DEC-103 (2026-11-12):** stocking and the takings (package 3) and the results, stamp book, trophy cards and Wardrobe (package 5) are built as drawn in REP-109; rank names kept; looks show as an awning strip over the shelf and on a rival's view of the box. Boards: `docs/studio/review-18/mockups`.
- Publishing release A still needs his own word for that build, after the merge to `main`, the full checks and the preview copy.
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
