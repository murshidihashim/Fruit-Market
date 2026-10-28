# Current state · Fruit Market

Updated 2026-10-28 (Asia/Kuala_Lumpur) by Claude, session checkpoint.

## Where we are
- **Stage:** complete game. Rules version 5, the tabletop procedures and character cards are on `main` and on the preview (CI and preview smoke test green, 2026-10-28). The live game is unchanged (1.1.1). No unfamiliar-player playtest has happened (PLAN-019 ended early, REP-046), so the first-playtest gate is still CONCERNS.
- **Direction:** one game, two editions with identical mechanics; the tabletop rules (`RULES.md`) are the master (DEC-027). The rules freeze is lifted (DEC-028).
- **Built since 1.1.1, unreleased:** UI and table (PLAN-009 to 013), rules 3 (PLAN-012), rules 4 (PLAN-014/015), rules 5 = lorry every day and no second-half walk-in (PLAN-020, DEC-029; computer-player simulation: empty-market turns 0.0% to 1.0%, REP-049/050), tie-break by buying order and a "Playing on a table" section in the rules (PLAN-024, DEC-030, REP-051), character cards: six characters with fixed perks picked on entering a room or on set-up (PLAN-025, DEC-031, REP-052). On local branch `workflow/plan-026` only (not pushed): 36 customer cards (PLAN-026, DEC-032, REP-053).
- **Approved, not built:** PLAN-021 session length (needs the owner's time target), PLAN-023 online undo and rename (design note awaiting the owner's choice).
- **Art direction decided (DEC-033, REP-054):** Look C, calm flat scenery with pixel fruit, people and icons; one Farmers Market board shared by the screen and the printed table mat. Nothing built. Proposed for approval: PLAN-027 style guide and one palette, PLAN-028 shared board (Village Square skin), PLAN-029 animated market opening. Still open: the lorry style and the printed board size (A3 assumed, needs a print).
- **Not approved:** PLAN-022 (icons and blank name; icons are now covered by characters, the blank name is not), PLAN-018 data counters, PLAN-003 online and capacity evidence, DEC-020 UI polish.
- **Ideas discussed, no decision yet:** a Market Day tension mechanic (Rush Hour was simulated: it moves the slack to the day after and cuts cash about 9%; Blight Day, last-fruit-costs-more and Glut Day were not simulated), a Scout favour card replacing the dead Good Riddance, animation polish (audit done, the owner has not chosen the motion feel or a time target).
- **Not done or not verified:** new character screens not seen on a phone; no hand-played tabletop test (day chips are the least proven part); hand-played ageing untested; PDF export blocked (pandoc missing); `scripts/records.mjs` fails on Windows paths (run a patched copy).
- **Reports:** REP-038 to REP-052 record the decisions since the lifecycle trial. Analysis files (turn flow, tabletop fixes, characters, favour cards, animation audit, simulation scripts and results) are in the owner's Google Drive folder `GameDev/Guides_v2`, outside this repo.

## Builds
| Copy | Address | Build |
|---|---|---|
| Live | https://fruit-market.murshidi-hashim.workers.dev | 1.1.1, `83de99b` (deployed 2026-10-27, tag `v1.1.1`) |
| Preview | https://fruit-market-staging.murshidi-hashim.workers.dev | `main`, rules version 5 with character cards and the tabletop fixes; updated by CI after each green push |

The live game changes only through GitHub Actions → *Deploy LIVE game* → `PUBLISH` (DEC-003).

## Checks
- `npm run verify`: records check, lint, types, 100 unit tests, build (about 20 s locally; the records check needs a patched copy on Windows).
- `npm run records`: regenerate the register, changelog, this file's pending block and the PDFs.
- `npm run verify:full`: plus browser tests (about 15 min). CI runs this on every push and pull request.
- Readiness: build-ready PASS; play-ready needs the owner's preview playtest; online-ready mostly
  PASS (crash recovery NOT RUN); release-ready not claimed (real devices, backups NOT RUN).

## Open items and known issues
- Owner to-dos: look at the preview on a phone (character pick, set-up screen, a 4-player room); decide the pending items in the generated block below; say whether to run the live deploy of the next release (Deploy LIVE game, type PUBLISH).
- Branch protection: instructions in `OWNER-BRIEF.md` §5. Not yet confirmed active.
- Owner questions not yet answered: which real phones are available; Cloudflare plan (Free or Paid) and any other paid accounts. DEC-005 stays an assumption until then.
- The Tally feedback form (https://tally.so/r/rDDdWX) is still published with no submissions; delete or unpublish it when no longer needed.
- Pre-existing: game-screen open time is noisy (217 to 489 ms locally; CI limit 600 ms with one retry).
- Store screenshot of the home screen is outdated; retake before the next Play listing update.
- Telemetry and leaderboard data on the live server have no backup (Package C).

## Approvals
- PLAN-001, 002, 004, 005 and 006 approved by the owner on 2026-10-26 (exact words in `records/`).
  Publication of 1.1.1: approved (DEC-013) and performed 2026-10-27. PLAN-009 to 013 approved and verified. Publishing the next release needs a new approval.

## Resume instruction
"Read the project instructions and current state. Inspect the current Git state. Tell me where we
stopped and recommend the next small task. Wait for my approval before implementation."

<!-- records:pending:start (generated by npm run records) -->
## Pending approvals (generated)

- DEC-020: UI and UX polish in three phases (awaiting approval)
- PLAN-003: Package C: online, capacity and release evidence (outline only) (proposed)
- PLAN-018: Data insights: balance, retention and online health from anonymous counters (proposed)
- PLAN-022: Client-only UI requests: different default icons, blank name that opens the keyboard (proposed)
- PLAN-027: Look C style guide and one palette (proposed)
- PLAN-028: One Farmers Market board for the screen and the table (proposed)
- PLAN-029: Animated market opening on the home screen (proposed)
<!-- records:pending:end -->
