# Current state · Fruit Market

Updated 2026-10-27 16:20 (Asia/Kuala_Lumpur) by Claude.

## Where we are
- **Stage:** between MVP / private alpha and browser beta. Complete game; no unfamiliar-player playtests yet.
- **Active package:** PLAN-016 (speciality price cut) and PLAN-015 (with PLAN-014), implemented; waiting for the owner's playtest. PLAN-001 (Package A, REP-002) and PLAN-002 (Package B, REP-004) are verified.
- **Done:** PLAN-004, the reconnect fix (REP-006), on the preview, not live.
- **Done:** PLAN-005, 4-player clarity (REP-008), on the preview, not live.
- **Release 1.1.1 published** 2026-10-27 (Deploy LIVE game run 15, live smoke test passed, tagged `v1.1.1` on `83de99b`). Triggered by Claude on the owner's instruction "deploy".
- **Creative:** theme review (REP-010); setting C and the panda rename approved (REP-011, `CREATIVE-BIBLE.md`). Pillars (DEC-015) and first playtest (DEC-016) approved; playtest kit in REP-013. PLAN-006 (Patches rename) verified (REP-012); now on `main`, shipping with the next release.
- **UI polish proposed** (REP-014, REP-015): owner wants a new art style and more feel (reference: It Takes Two). Direction B approved (DEC-021); mockups published (REP-016) and revised (cunning edition DEC-022, REP-017), then the cosy pixel edition (DEC-023, REP-018), then one shared market table so it plays like a board game (DEC-024, REP-019; both awaiting confirmation, https://claude.ai/artifact/YQUpnHeNNWkAUqFhKRz9VB). Awaiting: owner's review; DEC-020; PLAN-007 (suggested: 3 fixes only).
- **PLAN-009 and PLAN-011 verified** (REP-023, REP-024) now on `main` (merged after the 1.1.1 deploy): seated rivals, column board, freshness chips, price boards on the seats, night on the table. PLAN-007 superseded. PLAN-010 (lorry, Gemini art) verified (REP-026). All three are on `main`, ready to become 1.2.0 when the owner asks.
- **Balance:** PLAN-012 approved and verified (REP-027 proposal, REP-028 build): rules version 3, tomorrow's lorry, retuned traits, Juice Press and league, cosy home screen. On `main` for the preview; **live game unchanged**. Open: owner playtest (T5 NOT RUN); skill gap 60% vs 65% aim (green mango $3 is the main cause); Long games still favour patient plans.
- **UI:** PLAN-013 verified (REP-029): full-screen pricing and event sheets, clearer rival status. On `main` for the preview.
- **Tabletop rules (rules version 4):** PLAN-014 and PLAN-015 approved and **built** (REP-033): open stalls, the bell, Market Days, Last Call, four specialities, Market Gossip, day ledger, playtest options. verify and verify:full PASS (leak check 0). On `main` for the preview; **live game unchanged** (still rules version 3). Open: owner playtest (NOT RUN); Cold Room and Juice Bar weak for computers (price cut to $4 / $3 approved and built in PLAN-016, REP-034, but no measurable gain); little undercutting among computers; 2-player blowouts 34%.
- **Then:** owner playtest of the preview (REP-032 section 8 order); PREPARE RELEASE 1.2.0 when asked; plan PLAN-003 (Package C).

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

- DEC-001: Adopt the personal workflow guide 1.2 for Fruit Market (proposed)
- DEC-004: PDF exports with pandoc and the existing Playwright browser (proposed)
- DEC-005: Budget interpretation: RM500 per month across all games (proposed)
- DEC-014: Use the Concept and Theme Companion for creative work (proposed)
- DEC-020: UI and UX polish in three phases (awaiting approval)
- PLAN-003: Package C: online, capacity and release evidence (outline only) (proposed)
<!-- records:pending:end -->
