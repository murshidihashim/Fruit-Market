# Fruit Market · working rules for Claude

Owner: Murshidi (product owner, no coding experience). Workflow: "Personal workflow for Murshidi" 1.2.
Read `docs/workflow/STATE.md` first, then only the records the task needs.

## How we work
- One active work package (PLAN-###). Implement only what the owner explicitly approved.
  Routine edits, tests and docs inside an approved package need no further approval.
- Replan before changing rules, balance, architecture, spending, data handling or scope.
- Separate, explicit approval for: publishing the live game, paid services, destructive production changes.
- Planning reports and PDF exports are allowed documentation work; they don't approve game changes.
- Ask at most three high-impact questions at a time; state other assumptions.
- Never claim a test passed, a change shipped or a capacity figure without evidence.
- Results use PASS / FAIL / NOT RUN / NOT APPLICABLE. A required NOT RUN blocks a readiness claim.

## Replies to the owner
Substantive replies use, in order: STATUS, SUMMARY, PLAN OR WORK COMPLETED, VALIDATION, CHANGELOG,
RISKS AND COSTS, NEXT ACTION OR APPROVAL, DOCUMENT RECORD. About 200–300 words; detail goes in the report.
Short progress notes use STATUS, FINDING, NEXT. Plain English; the owner reads on a phone.

## Commands (all real; run from the repo root)
| Command | What it does |
|---|---|
| `npm run verify` | Lint, types, unit tests, build. Stops at the first failure (~1 min). |
| `npm run verify:full` | `verify` plus browser tests: solo game, performance budget, online match with a leaver, quick match (~15 min). |
| `npm run dev` | Local game at http://localhost:5173 (offline modes) |
| `npm run dev:online` | Local game plus room server (wrangler dev) at http://127.0.0.1:8787 |
| `npm run simulate` / `npm run balance` | Balance reports (AI games) |
| `npm run records` | Rebuild DECISIONS.md, CHANGELOG.md, the STATE pending block and all PDFs from `docs/workflow/records/` |
| `npm run records:check` | Check records (part of `verify`): IDs, evidence, append-only history, views up to date |

Never run `npm run deploy:web` or `wrangler deploy` (without `--env staging`) without publication approval.

## Release path
- Push or merge to `main` → CI runs `verify:full` → if green, the **preview** copy is updated:
  https://fruit-market-staging.murshidi-hashim.workers.dev (own Worker and data).
- The **live** game (https://fruit-market.murshidi-hashim.workers.dev) changes only through
  GitHub Actions → *Deploy LIVE game* → type `PUBLISH`. It runs `verify` and a smoke test.
- The Android workflow builds an APK/AAB artifact on each push; it does not publish to Play.
- PREPARE RELEASE: bump `version` in package.json, add a `candidate` entry with player notes to
  `records/releases.json`, run `npm run records`. Deploy refuses without it and tags `v<version>` after.
  After the owner deploys, mark the release `published` (date, commit, tagged) in a new commit.

## Preserve (change only with an approved plan)
- Game rules and balance: `src/engine/*` (data in `src/engine/data.ts`), `RULES.md`. Deterministic and seeded.
  Changing rules means bumping `RULES_VERSION` in `src/net/protocol.ts`.
- Saves: versioned envelope in `src/ui/store.ts`; old saves must keep loading.
- Online: server-authoritative rooms in `server/room.ts`. Secret prices must never reach other
  clients; the e2e leak check must stay at 0. Reconnect, grace period and takeover are covered by tests.
- Leaderboard and anti-abuse: `server/meta.ts`, `server/names.ts`, `server/limits.ts`.
- Privacy: anonymous counters only (`docs/ANALYTICS.md`, `docs/privacy.html`).
- Strict TypeScript; no new type escapes, disabled tests or swallowed errors without explanation.
- No new dependency unless its benefit outweighs the maintenance cost (say why in the plan).

## Code map
- `src/engine/`: pure rules, AI, story text, daily config. No UI.
- `src/ui/`: Preact screens. `Game.tsx` is layout; `game/useGameController.ts` holds state and turns;
  `game/animator.tsx` handles animations; `game/panels/*` are the panels; `pixel.tsx` has the sprites.
- `src/net/`: online client, protocol, telemetry, daily leaderboard client.
- `server/`: Cloudflare Worker plus Durable Objects (rooms, stats, leaderboard, quick match).
- `tests/`: vitest. `scripts/`: e2e, performance budget, screenshots, visual diff, balance.
- `docs/studio/`: audit and backlog (`10-IMPLEMENTATION-BACKLOG.md`). `docs/workflow/`: state, brief, reports.

## Records
- `docs/workflow/STATE.md`: active package, build, blockers, next action (about 500 words; keep it current).
- `docs/workflow/GAME-BRIEF.md`: audience, core loop, exclusions.
- `docs/workflow/OWNER-BRIEF.md`: owner's preview, playtest and publish guide.
- Source of truth: `docs/workflow/records/` (`decisions.json` with append-only `history`,
  `PLAN-###.json`, `releases.json`). Edit these, then `npm run records`. Never hand-edit
  `DECISIONS.md`, `CHANGELOG.md` or the generated STATE block. Corrections are new history lines.
- `docs/workflow/reports/REP-###.md`: narrative snapshot per decision-bearing output; never rewritten.
  Timestamps in Asia/Kuala_Lumpur (use real times from `TZ=Asia/Kuala_Lumpur date`). Approval status (proposed, awaiting approval, approved, rejected,
  superseded) is separate from delivery (not started, in progress, implemented, verified, released).
- Commits are authored "Murshidi Hashim" <murshidi.hashim@gmail.com>. No model names in the repo.

## Efficiency
Search before opening big files. Skip `node_modules`, `dist*`, `android/`, `coverage/`, images.
After two failed fixes: reproduce, isolate, change the hypothesis. Save a checkpoint in STATE.md before
stopping: branch, commit, uncommitted files, active approval, checks, blocker, next step.
