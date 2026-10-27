# Current state · Fruit Market

Updated 2026-10-27 16:56 (Asia/Kuala_Lumpur) by Claude.

## Where we are
- **Stage:** between MVP / private alpha and browser beta. Complete game; no unfamiliar-player playtests yet.
- **Active package:** PLAN-017 (more fruit, smarter computers; REP-035) implemented; PLAN-016 verified; PLAN-015 (with PLAN-014) implemented; waiting for the owner's playtest. PLAN-001 (Package A, REP-002) and PLAN-002 (Package B, REP-004) are verified.
- **Done:** PLAN-004, the reconnect fix (REP-006), on the preview, not live.
- **Done:** PLAN-005, 4-player clarity (REP-008), on the preview, not live.
- **Release 1.1.1 published** 2026-10-27 (Deploy LIVE game run 15, live smoke test passed, tagged `v1.1.1` on `83de99b`). Triggered by Claude on the owner's instruction "deploy".
- **Creative:** theme review (REP-010); setting C and the panda rename approved (REP-011, `CREATIVE-BIBLE.md`). Pillars (DEC-015) and first playtest (DEC-016) approved; playtest kit in REP-013. PLAN-006 (Patches rename) verified (REP-012); now on `main`, shipping with the next release.
- **UI polish proposed** (REP-014, REP-015): owner wants a new art style and more feel (reference: It Takes Two). Direction B approved (DEC-021); mockups published (REP-016) and revised (cunning edition DEC-022, REP-017), then the cosy pixel edition (DEC-023, REP-018), then one shared market table so it plays like a board game (DEC-024, REP-019; both awaiting confirmation, https://claude.ai/artifact/YQUpnHeNNWkAUqFhKRz9VB). Awaiting: owner's review; DEC-020; PLAN-007 (suggested: 3 fixes only).
- **PLAN-009 and PLAN-011 verified** (REP-023, REP-024) now on `main` (merged after the 1.1.1 deploy): seated rivals, column board, freshness chips, price boards on the seats, night on the table. PLAN-007 superseded. PLAN-010 (lorry, Gemini art) verified (REP-026). All three are on `main`, ready to become 1.2.0 when the owner asks.
- **Balance:** PLAN-012 approved and verified (REP-027 proposal, REP-028 build): rules version 3, tomorrow's lorry, retuned traits, Juice Press and league, cosy home screen. On `main` for the preview; **live game unchanged**. Open: owner playtest (T5 NOT RUN); skill gap 60% vs 65% aim (green mango $3 is the main cause); Long games still favour patient plans.
- **UI:** PLAN-013 verified (REP-029): full-screen pricing and event sheets, clearer rival status. On `main` for the preview.
- **Tabletop rules (rules version 4):** PLAN-014 and PLAN-015 approved and **built** (REP-033): open stalls, the bell, Market Days, Last Call, four specialities, Market Gossip, day ledger, playtest options. verify and verify:full PASS (leak check 0). On `main` for the preview; **live game unchanged** (still rules version 3). Open: owner playtest (NOT RUN); Cold Room and Juice Bar weak for computers (price cut in PLAN-016 and smarter computers in PLAN-017 did not help: skipping them costs nothing); farmer cards +1 per listed fruit (PLAN-017) made Big Basket too strong (45%); little undercutting among computers; 2-player blowouts 34%.
- **Readiness review (REP-036):** digital 5.5/10, tabletop 3/10; recommended path: freeze rules, playtests (digital and paper with date-stamped crates), balance, art and launch prep.
- **Direction (REP-038, 2026-10-27):** rules version 4 is **frozen** until the first human playtest (DEC-026). One game, two editions: tabletop and digital with identical mechanics, tabletop rules are the master, digital adds single-player (DEC-027). DEC-001, 004, 005 and 014 approved. PLAN-019 (first human playtest, no game code) **approved** 2026-10-27 19:59 and in progress (REP-039). Scope amended 20:06 (REP-041): testers play the preview from a browser link on their own devices; no table round, no paper kit; hand-played ageing is not tested by this plan.
- **PLAN-019 criteria locked** 2026-10-27 20:09 (REP-042, T1 PASS). Reading for 3 or 5 testers confirmed (REP-043).
- **Test design changed 21:18 (REP-044):** testers play one Quick game against three computer shops and answer seven simpler questions (Tally form). Locked criteria unchanged.
- **Informal feedback logged 22:18 (REP-045):** one 4-player game: supply short from mid-game, same icon for everyone, 10 rounds about 30 minutes, no undo before confirming a buy, game name not editable and defaults to "You". Not a PLAN-019 session. Supply and length frozen; three UI items on the backlog until after the playtest.
- **PLAN-019 ended early 22:20 (REP-046):** owner: "the ones i entered here is the feedback, just end the testing". No formal session; goal not met; no continue/revise/stop reading. Open: owner decides whether the rules freeze (DEC-026) stays or is lifted.
- **Freeze lifted 22:24 (DEC-028, REP-047):** DEC-026 superseded. Plans proposed, awaiting approval: PLAN-020 supply (measure first), PLAN-021 session length, PLAN-022 client-only UI (icons, blank name), PLAN-023 undo a buy and rename in the room. Nothing built.
- **Approved 23:10 (REP-049):** PLAN-020 (supply and demand), PLAN-021 (session length), PLAN-023 (online undo and rename). PLAN-022 not approved. PLAN-020 step 1 done in simulation: Market Days with no lorry starve the market, and late-game customers nearly double. Awaiting the owner: option and target (A recommended), PLAN-021 time target, PLAN-023 design choice. Repo dependencies installed locally; no game change.
- **PLAN-020 built 23:29 (DEC-029, REP-050; the report header says 23:35, a slip corrected in the history):** option A + C = rules version 5 (lorry every day, no second-half walk-in) on local branch `workflow/plan-020`; not pushed, not on the preview. Lint, types, 92 unit tests and build pass; browser tests NOT RUN; computer-player simulation: empty-market turns 0.0% to 1.0%. Open: owner decides whether to push or merge; PLAN-021 time target; PLAN-023 design choice; PLAN-022 not approved.
- **PLAN-024 built (DEC-030, REP-051):** tie-break by buying order and a "Playing on a table" section in `RULES.md`, on local branch `workflow/plan-024` (on top of `workflow/plan-020`); price ladder not built. Lint, types, 92 unit tests and build pass; browser tests and a hand-played test NOT RUN. Not pushed.
- **Then (superseded by the lines above):** owner sends the preview link and the form link to 3 to 5 unfamiliar players; then run 3 to 5 digital sessions and one paper round; PREPARE RELEASE 1.2.0 only when asked; plan PLAN-003 (Package C).

## Builds
| Copy | Address | Build |
|---|---|---|
| Live | https://fruit-market.murshidi-hashim.workers.dev | 1.1.1, `83de99b` (deployed 2026-10-27, tag `v1.1.1`) |
| Preview | https://fruit-market-staging.murshidi-hashim.workers.dev | `main` after CI passes: 1.1.1 plus Patches rename, cosy table (PLAN-009/010/011), new home screen (PLAN-012) and rules version 4 (PLAN-014/015); updated by CI after each green push |

The live game changes only through GitHub Actions → *Deploy LIVE game* → `PUBLISH` (DEC-003).

## Checks
- `npm run verify`: records check, lint, types, 92 unit tests, build (about 20 s locally).
- `npm run records`: regenerate the register, changelog, this file's pending block and the PDFs.
- `npm run verify:full`: plus browser tests (about 15 min). CI runs this on every push and pull request.
- Readiness: build-ready PASS; play-ready needs the owner's preview playtest; online-ready mostly
  PASS (crash recovery NOT RUN); release-ready not claimed (real devices, backups NOT RUN).

## Open items and known issues
- Owner to-dos: playtest the preview (OWNER-BRIEF §2, plus the reconnect steps in REP-006); decide the pending items in the generated block below.
- Branch protection: instructions in `OWNER-BRIEF.md` §5. Not yet confirmed active.
- Owner questions not yet answered: which real phones are available; Cloudflare plan (Free or Paid)
  and any other paid accounts. DEC-005 stays an assumption until then.
- Pre-existing: game-screen open time is noisy (217–489 ms locally; CI limit 600 ms with one retry).
- Fixed on the preview (PLAN-004): rejoining could stay on "Connecting to room…". Not live yet.
- Store screenshot of the home screen is outdated (new button line); retake before the next Play listing update.
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
<!-- records:pending:end -->
