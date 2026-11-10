# Current state · Fruit Market

Updated 2026-11-10 (Asia/Kuala_Lumpur) by Claude, session checkpoint. Sections from 2026-10-29 below are history; the release records (`records/releases.json`) are the source for what is live.

## Latest (2026-11-10): 1.16.0 approved for live (PLAN-065 to PLAN-068)
- **Owner approval:** "yes publish".
- **In 1.16.0 (no rules change):** card layout C (bigger customer cards on phones); flow A from stall to pricing; one shared, punchy rush line for everyone; event card before the lorry; no queue gap in the rush; no quick-price boxes.
- **Checks:** `npm run verify` PASS (409 tests); browser tests PASS (0 leaks, reconnect 5/5).
- **Next:** Deploy LIVE game, mark 1.16.0 published.

## Earlier (2026-11-10): 1.15.1 live (PLAN-063, PLAN-064)
- **Owner approval:** "and then push everything live".
- **In 1.15.0 (no rules change):** swipe shopkeeper picker (design A) with the tagline under the card; New game without the Rules sections (previous defaults always on); shopkeeper cards show the name alone, without "Fresh fruit · Fair prices".
- **Checks:** `npm run verify` PASS (408 tests); browser tests PASS (0 leaks, reconnect 5/5).
- **Live:** 1.15.0 (commit `a7b7924`, tag `v1.15.0`, Deploy LIVE game run 32, live smoke test PASS).
- **Live:** 1.15.1 (commit `8c30e62`, tag `v1.15.1`, Deploy LIVE game run 33, live smoke test PASS): rivals and customers swap rows while pricing; The Bell no longer pops up; first-game tips fixed.
- **Next:** owner plays 1.15.1.

## Earlier (2026-11-10): 1.14.1 live (PLAN-062)
- **Owner approval:** "push it live".
- **In 1.14.1 (no rules change):** Fill your stall starts empty, shows the whole shelf full scale and says stall; first-game tip moved off the shelf; Calm Day card on Day 1 ("Day 1! Let's make some money!"); shorter event card back; "Play full screen?" after the opening, with Add to Home Screen steps on iPhone.
- **Checks:** `npm run verify` PASS (408 tests); browser tests PASS (solo game to results, 0 leaks, reconnect 5/5).
- **Live:** 1.14.1 (commit `228cf8a`, tag `v1.14.1`, Deploy LIVE game run 31, live smoke test PASS).
- **Next:** owner picks one of 5 swipe shopkeeper-picker mockups (A carousel, B full-width stall, C deck, D market street, E badge dial); the New game screen then loses its Rules sections (current defaults kept).

## Earlier (2026-11-10): 1.14.0 live (rules 13, event cards, new art)
- **Owner approval:** "ok approve all we discussed here and push it to live" (PLAN-061, DEC-078, REP-092, REP-093).
- **In 1.14.0:** events turned over each morning (never forecast); Cold Room removed; full-picture morning card drawn face down from the print kit's event back, waiting for its picture, then turned in 1 s; owner's event wording with taglines; Tomorrow's lorry on two rows; price reveal in the rival row's order; art for the seven newest events, Pak Din, Farah and the two guests (no "Art coming" cards left); print kit regenerated.
- **Checks:** `npm run verify` PASS (408 tests); browser tests PASS (E2E OK, 0 leaks in 100 pricing frames, reconnect 5/5); balance PASS (every shopkeeper within 4.5 points).
- **Live:** 1.14.0 (commit `4310313`, tag `v1.14.0`, Deploy LIVE game run 30, live smoke test PASS on rules version 13).
- **Next:** owner plays 1.14.0; watch whether surprise Inspector and Heatwave days feel fair (DEC-078 review trigger).

## Earlier (2026-11-09): 1.13.0 live, crates of chosen fruit (rules 12) and the new pricing
- **Live:** 1.13.0 (commit `ebc35f7`, tag `v1.13.0`, Deploy LIVE game run 29, live smoke test PASS on the re-run).
- **Built (PLAN-059, PLAN-060; DEC-076, DEC-077; REP-091):** fill your crate from a shelf drawn like the market (only crate fruit sells, rules version 12); pricing from the crates with a demand board and "The Bell" pop-up; crate drop, lid and board animations.
- **Checks:** `npm run verify` PASS (404 tests); balance as rules 11 (shopkeepers within about 6 points). Browser tests PASS (E2E OK, 0 leaks).
- **Next:** owner plays 1.13.0; art for Pak Din, Farah, 7 events and 2 guests still missing.

## Earlier (2026-11-09): 1.12.1 live (compact rules + seat tiles)
- **1.12.1** (commit `4b8f754`, tag `v1.12.1`, Deploy LIVE game run 28, live smoke test PASS): rival stalls on the New game screen are seat tiles (option C, DEC-075, PLAN-058). No rules change.
- **Built on branch `ccr-ff85604f-thv5m2`, not on main:** PLAN-057 / DEC-074, the owner's Compact Rules build spec (rules version 11): 2-6 stalls, halved orders and limits, 20 unique lorries, 20 events, Pak Din and Farah, halved upgrade costs. Report REP-090.
- **Checks:** `npm run verify` PASS; browser tests PASS (solo, performance budget, online 0 leaks, quick match, 6-stall room, reconnect). Balance: cash and pieces sold match the spec; shopkeeper target (within 4 points) FAIL for Big Basket, Nest Egg (both about +6), Haggler (about −5.5) and Shade Cloth at 4 stalls (−5.8). Fruit profit and upgrade-ban tests NOT RUN.
- **Gaps:** no owner art for the 2 new shopkeepers, 7 events and 2 guests; achievement money thresholds unchanged.
- **Owner's choice:** option A (playtest the balance as built), merge and publish live ("a and merge, then publish live"). **Live:** 1.12.0 (commit `6bc9552`, tag `v1.12.0`, Deploy LIVE game run 27, live smoke test PASS). Next: playtest the shopkeeper balance (REP-090 §3); owner art for Pak Din, Farah, 7 events and 2 guests.

## Earlier: 2026-11-08
- **Live:** 1.11.0 (commit `f60fe78`, tag `v1.11.0`, published 2026-11-09, Deploy LIVE game run 26, smoke test PASS). Rules version 10 (poorest first, then clockwise; no balance run, owner's choice); computer-player version 2. Print kit still shows the rules 9 buying-order wording.
- **Built and verified on branch `ccr-d9f10c6d-75280w` (commit 598de1e), not on main:** PLAN-050 owner tweaks (uniform cards, smooth opening, no 'Great Fruit Exchange' wording, Phone A in-game layout with no scrolling) and PLAN-051 playtest fixes (DEC-067, REP-089: honest Closing Day, price read, no-sale reasons, tie advice, Juice Bar forecast and tip, Scout label, green-fruit text; computer players count the jam maker and the real tie order). Checks: `npm run verify` PASS (341 tests), browser tests PASS (0 leaks), layout check PASS at 360x740, 390x844, 1280x800.
- **Package B note:** daily scores now carry a computer-player version (AI_VERSION 2); RULES_VERSION stays 9. On release day an unfinished daily can't be resumed and the daily board starts fresh. Balance target (3 points) still missed: Local Favourite +4.4 at Normal, Haggler +10 at Hard (pre-existing).
- **Known small gaps:** a very full pricing screen and the day-9 morning card scroll inside the panel at 360x740; final review round skipped at the owner's request.
- **Next:** owner checks 1.9.0 on a phone; open items: shopkeeper balance (Favourite, Haggler), small in-panel scroll on the smallest phone.

## Earlier: 2026-11-07
- **Live:** 1.8.0, The Great Fruit Exchange (commit `df61983`, tag `v1.8.0`, published 2026-11-07 by Deploy LIVE game run 23; live smoke test PASS). Rules version 9, unchanged.
- **Built and verified (PLAN-049, DEC-066):** the owner's deck art (events Art 1, shopkeepers Art 2, customers Art 3) across the app and a new print kit (`print/kit/`); approved names (DEC-064, DEC-065); fonts and colours from the art. Checks: `npm run verify` PASS (233 tests), `npm run test:e2e` PASS (solo, performance budget, online with 0 leaks, quick match, four players, rejoin), 45 names checked.
- **Art gaps (no owner art yet):** special guests use their event scene; favour, delivery and upgrade cards are type-only; worn looks show as pixel pins; the lorry, coin, favour and perk icons stay pixel art. The customer card back is a new design the owner has not seen on its own.
- **Follow-ups:** print kit: the Gym Club and Hotel Chef guest flags still cover part of their borrowed pictures; RULES.md worked example uses $6 for Professor Pebble but his card says $5; online names "Uncle Benny", "Ah Chen" and "Kiki" are not reserved (anti-abuse change needs a plan); desktop chips are 32-36 px tall with a mouse.
- **Found earlier, not fixed (REP-087 §11):** card-order backs make 9 customers unique; online leak check does not test name, type or generous flag on face-down walk-ins; likely bug: a rival's favour is announced as "Priority!" online.
- **Checkpoint:** branch `ccr-d9f10c6d-75280w` merged to `main`; PLAN-049 released; print-kit layout fixes done (print only). Next: the owner checks 1.8.0 on a phone; follow-ups above need the owner's choices.

## Earlier: 2026-10-29 (history, superseded by the section above)
- **1.2.0 was live then** (main `f5f9390`, tag v1.2.0, smoke test passed). The live game and the preview are the same build until the next change. Rules version 6.
- **On the preview (main `9424f21`, CI and preview green):** look D on every screen (PLAN-033, DEC-045), market opening on launch, about 2.5 seconds (DEC-047, DEC-048), readability fixes from the QA sweep (136 contrast findings down to 3), concept slides in How to play and a "big idea" section and worked example in RULES.md (DEC-049, REP-079). 1500-game soak clean. No rule or balance change.
- **Waiting for the owner:** phone check of the preview; read the new How to play wording; Card_Backs.pdf (draft, in the Drive Print_Kit folder); Good Riddance fate; shopkeeper perk balance (Big Basket strong, Haggler weak, REP-076); printed board size and token settings after a print test; taller tap targets (chips and market cells are 32 to 36 px); PLAN-003 spend cap and Cloudflare plan; releasing 1.2.0 (owner runs Deploy LIVE game, types PUBLISH).
- **Tooling:** `scripts/qa-sweep.cjs` and `scripts/soak.ts` run on GitHub through the QA sweep workflow (push a branch named `qa/...`, or run it by hand). The owner's laptop was out of memory this session, so local type checks and browsers were unreliable; CI is the evidence.

## Where we were (2026-10-28)
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
| Live | https://fruit-market.murshidi-hashim.workers.dev | 1.7.0, `0d653b2` (published 2026-11-07, tag `v1.7.0`, per `releases.json`) |
| Preview | https://fruit-market-staging.murshidi-hashim.workers.dev | `main`; updated by CI after each green push |

The live game changes only through GitHub Actions → *Deploy LIVE game* → `PUBLISH` (DEC-003).

## Checks
- `npm run verify`: records check, lint, types, unit tests (196 at PLAN-047, 2026-11-07), build (about 20 s locally; the records check needs a patched copy on Windows).
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

- PLAN-003: Package C, paid part: capacity and cost evidence (proposed)
- PLAN-018: Data insights: balance, retention and online health from anonymous counters (proposed)
<!-- records:pending:end -->
