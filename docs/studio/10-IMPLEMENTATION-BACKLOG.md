# 10 · Implementation Backlog

Each item lists files, tasks, dependencies, risk, effort (S ≤1 day, M 2–4 days, L 1–2 weeks) and testable acceptance criteria. IDs match `09-PRIORITISED-ROADMAP.md`.

Rules for every item:
- Strict TypeScript.
- Deterministic engine.
- No new runtime dependency unless the item says so.
- Online rule changes bump `RULES_VERSION`.
- Economy changes follow the simulator protocol in 07.

---

## M1 · Production safety

### B-01 · Grace period and computer takeover for players who leave (P0, M, risk: medium)
- **Files:**
  - `server/room.ts`: `RoomData`, `SeatData`, `closed()`, `alarm()`, `advance()`, `dispatch` (`continue`)
  - `server/worker.ts`: alarm scheduling through `RoomIO.setAlarm`
  - `src/net/protocol.ts`: `PublicSeat.offlineSince?`, `PublicSeat.bot?`
- **Tasks:**
  1. On `closed()` while `playing`, record `seats[i].offlineSince = now` and schedule an alarm for `now + GRACE_MS` (75 s; constant in `room.ts`).
  2. On the alarm (and in `advance()`), seats offline for at least the grace period become computer-controlled: `d.botSeats.add(i)`. The engine player keeps `kind: 'human'` in the stored game, so views and rules don't change; the room drives it with `aiStep` logic. Add an `aiActFor(state, p)` helper in `src/engine/ai.ts` that ignores `kind`.
  3. Votes (`continue`, `rematch`) count only connected human seats (not computer-controlled ones).
  4. Waits for secret prices skip computer-controlled seats (their prices come from `planBids`).
  5. On `hello` with a valid token: clear `offlineSince` and remove the seat from computer control.
- **Dependencies:** none.
- **Acceptance tests** (`tests/room.test.ts`):
  - a disconnected player's day completes after the grace period, and the match reaches `over`
  - reconnecting mid-match returns control (the next human action is accepted)
  - `continue` resolves with only connected humans voting
  - leak test unchanged: 0 hidden prices in views
- **Extended end-to-end** (`scripts/e2e-online.cjs`): close context B on day 3; A finishes the match within `grace + 60 s`.

### B-02 · Quick-match start guard (P0, S, risk: low)
- **Files:** `server/room.ts` (`hello` quick branch at line 157, `closed` while in the lobby).
- **Tasks:**
  1. Auto-start only if every seat is connected.
  2. When a quick-room lobby seat disconnects, remove it (lobby only) so the next stranger becomes host.
  3. Have `MatchDO` re-offer the room only while its host is connected. The simple version: the room reports "empty", and `quickMatch` creates a new room when the stored one is empty. Requires `quickMatch` to accept an `isAlive(code)` check, fed by a `RoomDO` `/status` fetch.
- **Acceptance tests:**
  - (room) a disconnected host plus a joiner doesn't start a match; the joiner waits as host
  - (meta) `quickMatch` skips a dead room
  - Re-run the reproduced probe scenario as a permanent test.

### B-03 · Rate limiting on write APIs (P0, S, risk: low)
- **Files:** `wrangler.jsonc` (rate-limit binding `RL` per route group), `server/worker.ts` (a `limited(req, env, key)` helper before each POST route).
- **Tasks:**
  - Key = `CF-Connecting-IP + route`.
  - Limits:

    | Route | Limit |
    |---|---|
    | `rooms` | 10/min |
    | `quick` | 10/min |
    | `daily` POST | 5/min |
    | `t` | 30/min |

  - Return 429 JSON.
  - No npm dependency (platform binding).
- **Acceptance:**
  - a local `wrangler dev` curl loop shows 429 after the limit
  - the end-to-end online and quick-match runs never get 429
  - a helper unit test with a fake binding

### B-04 · Leaderboard name ownership (P0, S–M, risk: low)
- **Files:**
  - `src/net/daily.ts`: send `claim` (from `fm.claim`, a 128-bit random value created once)
  - `server/meta.ts`: `DailyEntry.owner` (sha256 hex), `addEntry` rejects a different owner for the same name
  - `server/worker.ts` (`BoardDO`): pass the claim through
- **Acceptance tests** (`tests/meta.test.ts`):
  - the same name with a different claim → rejected "name taken today"
  - the same claim with a better score → updated
  - the claim is never returned in `/api/daily` responses

### B-05 · Name policy (P0, S, risk: low)
- **Files:** new `server/names.ts` (normalise with NFKC plus case-fold, a small embedded blocklist, reserved names = `RIVALS` names plus "admin"/"moderator"), used by `server/meta.ts` `cleanName` and `server/room.ts` `clean`.
- **Acceptance tests:**
  - blocklisted words, including look-alike spellings, are rejected or replaced by "Player NNN"
  - reserved names are rejected
  - normal names are unchanged

### B-06 · Cohort-capable telemetry (P0, S, risk: low)
- **Files:** `src/ui/store.ts` (`fm.install` date), `src/net/telemetry.ts` (on install: `install_week:YYYY-Www`; on each daily first open: `active:d{bucket}`), `docs/ANALYTICS.md` (event dictionary and retention formula).
- **Acceptance:**
  - a unit test for the bucket function (days 0–7, 14, 30, 30+)
  - Playwright: a fresh profile sends `active:d0` exactly once per calendar day
  - no identifier in any payload (intercept and assert keys)

### B-07 · Remove duplicate funnel counts (P0, S, risk: low)
- **Files:** `src/ui/Game.tsx:405–406`. Track the last day sent per game seed in a module-level `Map` plus `GameState`-independent storage (`sessionStorage`).
- **Acceptance:** Playwright: start a game, reach day 3, reload (resume) → `day_reached` events = {1,2,3}, with no repeats.

### B-08 · Daily submission rules version (P1, S, risk: low)
- **Files:** `src/net/daily.ts` (send `rv: RULES_VERSION`), `server/meta.ts` (`verifyDaily` rejects `rv !== RULES_VERSION` with a "please update" message), `server/worker.ts` (409 status).
- **Acceptance:** a test where a wrong `rv` → 409 with the update message, and the right `rv` → OK.

**M1 exit:** all of the above green; the end-to-end online run (0 leaks) and abandonment scenario pass; deploy to staging (B-41 can start in parallel).

---

## M2 · Performance and architecture

### B-09 · Remove dead code (P1, S, risk: low)
- **Files:**
  - `src/ui/board.tsx`: delete `MarketBoard`, `ShopPanel`, `RivalStrip`, `CustomerRow`, `PlayerHand`, `FavourChip`, `initials`, `STAGE_LABEL`; keep `Track` and `TrackLegend`
  - `src/ui/tutorial.ts`: delete `tutorialDone`
  - `src/ui/styles.css`: rules for deleted classes
- **Acceptance:** `tsc --noUnusedLocals --noUnusedParameters` clean; screenshot diff within tolerance; bundle size not larger.

### B-10 · Render sprites as cached images (P0/P1, M, risk: medium)
- **Files:** `src/ui/pixel.tsx` (`Sprite`, `PixelFruit`, `Portrait`, `Icon`), `src/ui/styles.css` (`.px { image-rendering: pixelated }`).
- **Tasks:**
  1. Write `spriteUrl(id, rows, pal, outline)`: build an SVG string from the compiled runs, `encodeURIComponent` it, and cache it in a `Map`.
  2. `Sprite` renders `<img class="px" src=… width height alt=…>`. When `x`/`y` are given (inside an SVG), render `<image href=… x y width height>`.
  3. Keep every exported signature.
- **Acceptance:**
  - game-screen DOM ≤800 (currently 3,722)
  - no long task >200 ms in the throttled run (B-14)
  - store screenshots visually equivalent (B-14 diff ≤1% of pixels)
  - animation anchors (`data-a`) still found by the end-to-end runs

### B-11 · Split `Game.tsx` (P1, M–L, risk: medium–high)
- **Depends on:** B-13 (browser tests in CI).
- **Files:**
  - new `src/ui/game/useGameController.ts`: `s`, `sRef`, the online queue, `act`, `proceed`, undo, the AI loop
  - new `src/ui/game/animator.ts`: delivery, move flights, showdown sequence, nightfall
  - new `src/ui/game/panels/{TopBar,MorningCard,TraitPick,Showdown,SalesSummary,Results,DailyResult}.tsx`
  - `src/ui/Game.tsx` becomes layout only
- **Acceptance:**
  - no behaviour change: all unit and end-to-end tests pass, and screenshots match
  - `Game.tsx` ≤250 lines; every new file ≤300 lines
  - `useGameController` has unit tests for undo and the daily move log, using a fake clock

### B-12 · Save envelope and migration (P1, S, risk: low)
- **Files:** `src/ui/store.ts` (`saveGame` writes `{ v: 2, rules: RULES_VERSION, game }`; `loadGame` accepts old saves without an envelope, rejects mismatched rules → returns `null` and sets a "your saved game was from an older version" flag), `src/ui/App.tsx` (toast).
- **Acceptance:** unit tests with fixtures (an old raw save, an envelope with the right rules, the wrong rules, corrupted JSON).

### B-13 · Browser tests in CI (P1, M, risk: low)
- **Files:** `package.json` (`test:e2e`), `scripts/smoke.cjs`, `scripts/e2e-online.cjs`, new `scripts/e2e-quick.cjs` (from the ad-hoc script), `.github/workflows/ci.yml` (Playwright Chromium, `wrangler dev`, then run).
- **Acceptance:** CI green on a pull request in under 10 minutes; a deliberately broken selector makes CI fail.

### B-14 · Performance, UX and visual budget (P1, S, risk: low)
- **Files:** new `scripts/perf-budget.cjs` (DOM count, long tasks with 4× throttle, tap targets <40 px on buy, price and evening, store-shot pixel diff).
- **Acceptance:** fails on the current commit's DOM (3,722) and passes after B-10.

### B-15 · Lint and format (P1, S–M, risk: low)
- **Files:** `eslint.config.js` (typescript-eslint, preact hooks rules), `.prettierrc`, `package.json` (dev dependencies only), CI step.
- **Acceptance:** `npm run lint` is clean; CI blocks on lint errors.

---

## M3 · Balance validation

### B-20 · Balance baseline artefact (P1, S)
- **Files:** `scripts/balance.ts` (add `--out file.jsonl`), `docs/studio/balance/baseline-<sha>.jsonl`.
- **Acceptance:** re-running on the same commit reproduces identical numbers (determinism).

### B-21 · Balance diff tool (P1, S)
- **Files:** new `scripts/balance-diff.mjs` (prints a table of baseline, candidate and delta for the key metrics; non-zero exit if a guard metric regresses beyond tolerance).
- **Acceptance:** exits non-zero on a synthetic regression.

### B-22 · AI information-fairness test (P1, S)
- **Files:** `tests/engine.test.ts`.
- **Test:** `planBids(s, p)` gives the same output whether or not rival `s.bids` are filled.
- **Acceptance:** the test passes, and fails if `ai.ts` starts reading `s.bids`.

### B-23 · 2-player market scaling (P1, S code + M validation, risk: medium)
- **Files:** `src/engine/game.ts` (`demandScale`, `supplyScale`, n = 2 factor), `src/net/protocol.ts` (`RULES_VERSION` bump), `src/ui/store.ts` (save version).
- **Acceptance:**
  - simulation: 2-player blowouts ≤50% (from 63%), sales near max ≤40% (from 51%)
  - 3- and 4-player metrics within ±2 points
  - diff artefact committed
  - playtest round 2 confirms

### B-24 · Freshness stakes (P1, M, risk: medium)
- **Files:** `src/engine/data.ts` (`drop` arrays or a fresh bonus), `src/engine/game.ts` (`capAt`), and the `RULES.md` freshness table.
- **Acceptance:** spoiled 1–3 per player per game (3-player Hard), dead days ≤0.05, fruit profit spread ≤25%, the tests for capped pricing updated.

### B-25 · Daily roster decision (P1, S)
- **Files:** `src/engine/daily.ts`.
- **Acceptance:** decision recorded with playtest evidence; if changed, a test for the new roster, and daily seeds unchanged (only rosters).

### B-26 · Playtest round 1 (P0 process, M)
- **Files:** `docs/studio/playtests/round-1.md`. Script: a first game unaided, then 2 games; a survey of comprehension, fun, and "did pricing matter?".
- **Acceptance:** 5–8 players; findings triaged into the backlog.

### B-27 · Inert upgrade redesign (P2, M) · B-28 · Mango and trait trims (P2, S–M)
Follow EC3, EC4 and EC5 in 07, with the same protocol and acceptance targets.

---

## M4 · Mobile usability and feel

| ID | Item | Files | Acceptance |
|---|---|---|---|
| B-30 | Market cells ≥40 px (prototype 2 options) | `src/ui/table.tsx` (`Market`), `styles.css` | Tap-target budget clean at 360 px; playtest preference recorded |
| B-31 | Top-bar chips and demand row ≥40 px | `styles.css:127`, `.pulse` | Budget clean |
| B-32 | Coach avoids the open tray | `Game.tsx` (coach), `styles.css` `.coach` | No overlap with enabled buttons (bounding-box test) |
| B-33 | Replace the remaining emoji with pixel icons | `pixel.tsx`, `table.tsx`, `story.ts` consumers | No emoji found in rendered components |
| B-34 | Showdown audio cues (sold / outbid / sold out) | `fx.ts`, `Game.tsx` | Playtest: ≥70% identify the outcome by sound |
| B-35 | Disconnect countdown UI | `protocol.ts`, `Game.tsx` net strip | The end-to-end run shows the countdown text, then the takeover |
| B-36 | Quick-match computer fallback after 45 s | `Online.tsx`, `server/room.ts` | Test: the fallback converts the room and the match starts |
| B-37 | Consent prompt (opt-in or out per legal decision) | `App.tsx`, `store.ts`, `telemetry.ts` | Intercept: no `/api/t` requests until consent |

## M5 · Closed test and release management

| ID | Item | Files | Acceptance |
|---|---|---|---|
| B-40 | Device matrix and QA checklist | `docs/studio/QA-CHECKLIST.md` | Signed off on 4 devices |
| B-41 | Branch protection, staging worker, tag deploys | `.github/workflows/*.yml`, `wrangler.jsonc` (`env.staging`) | Push to `main` deploys staging only |
| B-42 | Launch checklist and rollback runbook | `docs/studio/LAUNCH-CHECKLIST.md` | Completed and linked in the release pull request |
| B-43 | Stats dashboard | `scripts/stats-report.mjs`, `docs/ANALYTICS.md` | Retention curve rendered from the closed-test data |
| B-44 | Captioned store screenshots | `scripts/store-shots.cjs` | 7 captioned images at 1080×1920 |

## M7–M8 (post-launch, evidence-gated)
- B-50: daily reminders
- B-51: server-driven content
- B-52: rules compatibility window
- B-53: save export
- B-54: strategy tips
- B-60: monetisation memo

See 09 for the gating conditions.

---

## First implementation milestone: M1 work order

1. **B-02, then B-01** (`server/room.ts`, `server/worker.ts`, `src/engine/ai.ts` `aiActFor`, `src/net/protocol.ts`). Tests in `tests/room.test.ts`:
   - `quick room never starts with an offline seat`
   - `offline player is replaced after grace and the match finishes`
   - `reconnect returns control`
   - `votes ignore offline seats`
2. **B-03** (`wrangler.jsonc`, `server/worker.ts`). Test: limiter helper unit test, plus a manual curl loop.
3. **B-04, B-05** (`server/meta.ts`, new `server/names.ts`, `src/net/daily.ts`). Tests in `tests/meta.test.ts`:
   - `name taken by another claim`
   - `blocklist and look-alikes`
   - `reserved names`
4. **B-06, B-07** (`src/net/telemetry.ts`, `src/ui/store.ts`, `src/ui/Game.tsx`). Tests: bucket unit test; Playwright request interception for exactly-once events.
5. **B-08** (`src/net/daily.ts`, `server/meta.ts`). Test: `rejects mismatched rules version`.
6. Run everything:
   - `npm test`
   - `scripts/e2e-online.cjs`, extended with the disconnect scenario
   - the quick-match script
   - the 0-leak check
   - deploy to staging and confirm `/api/stats` cohort events

**Risk notes**
- B-01 is the only medium-risk M1 item. It touches the room state machine, so it is covered by the existing 11 room tests plus 4 new ones.
- No engine rules change in M1, so `RULES_VERSION` stays at 2 unless the view shape changes incompatibly. The new `PublicSeat` fields are optional, so older clients ignore them.
