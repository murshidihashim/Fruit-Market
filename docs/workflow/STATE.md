# Current state · Fruit Market

Updated 2026-11-27 19:13 (Asia/Kuala_Lumpur), session checkpoint. Only what is needed to resume; the story is in `records/decisions.json` (history), `DECISIONS.md`, the reports and Git.

## Where we are
- **Live:** 1.32.1 (main 95e643b, tagged v1.32.1, published 2026-11-27, Deploy LIVE run 55): taps on iPhone (PLAN-131, DEC-138). Its iPhone check is NOT RUN here (no Safari); the owner tries the price buttons on an iPhone. On 1.32.0 (main 8636dbd, tagged v1.32.0, published 2026-11-27, Deploy LIVE run 54): the REP-140 audit fixes (PLAN-130, REP-141). Preview follows main once CI on main finishes. Before it: 1.31.5 (the new How to play, PLAN-129), 1.31.4 (table polish), 1.31.3, 1.31.2, 1.31.1 and 1.31.0 (REP-139). Rules version 20, protocol 5, computer-player version 8.
- **Working branch:** `ccr-d8bcd65d-gblqqb`, level with main 95e643b plus records.
- **Active package:** none. PLAN-131 released in 1.32.1; if the price buttons are still slow on iPhone, the next step is to ask which button and try the owner's phone model (a tap's own work measured about 20 ms at 4x slowdown, so look at Safari's gestures first). PLAN-130 released in 1.32.0. Owner questions open: C-02, the Private Room host-alone start rule (server change), Home or Market as the tab's one name.
- **Open from REP-140:** C-02, Nest Egg wins 47.5% of Sprints; the owner chooses: out of the Sprint offer, a smaller bonus in short games, or leave it. Private Room host alone with computers cannot press Start (a server start-rule change, owner's approval); Home and Market both name one tab. Still cut or faint: names in 6-stall boxes at 320 to 390, the level word in a full 6-stall set-up at 320 to 360, 7 px ticket text, night rows' contrast. Found and left: focus drops to the page on "Leave the match?" (as before); with Reduced motion "LAST 3 DAYS" can stay up; stepped pop-up moves.
- **Left for later (REP-135 section 4):** expert stages easier than their base stages (RA-07); Ah Chen wins 42% of Sprints through the Charmer perk (RA-14); 16 empty stall-level rewards (levels 12 to 30); host lines after shared wins, stage 10 day count, Perk label contrast, Play menu punctuation, the Daily card's League line too frequent, weekly line "7 days" when 5 count, old-version message wording, reaction button below the fold at 320, small text in Wardrobe and Stamp book, How to play without the League or Sprint; game-table labels at 10 to 11 px; the print kit's tie wording.
- **Next chapters:** League chapters of ten, each its own plan (REP-134 section 5).
- **Commits:** author Murshidi Hashim, committer Claude, set per commit; run web checks and commits as separate commands.
- **Waiting on the owner:** play 1.31.0; which later items to plan; the gameplay screen redesign (canvas v3) is not approved; Android Play upload; print pieces and table test; PLAN-003 capacity and backup, PLAN-018 insights (proposed); Cloudflare plan tier unknown.
- Weekly Player numbers report runs Mondays 09:07 (PLAN-101).

## How work is done now
When work runs side by side (DEC-104), helpers build in their own work folders (`.claude/worktrees`) from briefs in the session scratchpad (`brief-common.md` and one brief per job; `helpers.md` lists ids and branches). They commit on their branch and never push. For each report: review, merge with `--no-ff`, `npm run verify` and `npm run test:e2e` on the merged code, look at the screens at 390x844 and 360x640, record the plan's checks, push. For code splits and style merges, also walk both builds side by side with `scripts/walk-compare.cjs` (REP-141): screenshots alone missed screens. Publishing follows the release path in `CLAUDE.md` and needs the owner's word for that build.

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

- PLAN-003: Package C, paid part: capacity and cost evidence (proposed)
- PLAN-018: Data insights: balance, retention and online health from anonymous counters (proposed)
<!-- records:pending:end -->
