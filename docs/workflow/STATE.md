# Current state · Fruit Market

Updated 2026-10-26 (Asia/Kuala_Lumpur) by Claude.

## Where we are
- **Stage:** between MVP / private alpha and browser beta. Complete game; no unfamiliar-player playtests yet.
- **Active package:** none. PLAN-001 (Package A) is implemented; see REP-002 for verification.
- **Next planned packages:** PLAN-002 (Package B, records and PDF automation) and PLAN-003 (Package C:
  real devices, backups, crash recovery, capacity, costs). Neither is approved.

## Builds
| Copy | Address | Build |
|---|---|---|
| Live | https://fruit-market.murshidi-hashim.workers.dev | `c915e49` (deployed 2026-10-26 by the old auto-deploy) |
| Preview | https://fruit-market-staging.murshidi-hashim.workers.dev | `2e4b240` (version adf6c304); updated by CI after each green push to `main` |

The live game changes only through GitHub Actions → *Deploy LIVE game* → `PUBLISH` (DEC-003).

## Checks
- `npm run verify`: lint, types, 63 unit tests, build (about 7 s locally).
- `npm run verify:full`: plus browser tests (about 15 min). CI runs this on every push and pull request.
- Readiness: build-ready PASS; play-ready needs the owner's preview playtest; online-ready mostly
  PASS (crash recovery NOT RUN); release-ready not claimed (real devices, backups NOT RUN).

## Open items and known issues
- Owner to-dos: playtest the preview (OWNER-BRIEF §2, acceptance A4); confirm DEC-006 (staging Worker).
- Branch protection: instructions in `OWNER-BRIEF.md` §5. Not yet confirmed active.
- Owner questions not yet answered: which real phones are available; Cloudflare plan (Free or Paid)
  and any other paid accounts. DEC-005 stays an assumption until then.
- Pre-existing: game-screen open time is noisy (217–489 ms locally; CI limit 600 ms with one retry).
  Quick match failed once in CI on 2026-10-26 and passed on the rerun; the test now saves both
  players' screens if it fails again.
- Telemetry and leaderboard data on the live server have no backup (Package C).

## Approvals
- PLAN-001: approved by the owner on 2026-10-26 ("Approve PLAN-001 only, including its listed tests
  and documentation"). Publication of the live game: **not approved**, not performed.

## Resume instruction
"Read the project instructions and current state. Inspect the current Git state. Tell me where we
stopped and recommend the next small task. Wait for my approval before implementation."
