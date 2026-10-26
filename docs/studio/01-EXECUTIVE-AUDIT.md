# 01 · Executive Audit: Fruit Market v1.1.0

Commit audited: `main` @ `539294e`, 2026-10-26.
Method: the repository was re-inspected directly rather than taken from the earlier AI review (`docs/STATE-REVIEW.md`). Measurements come from commands run on this commit:
- type checks and 37 unit tests
- v8 test coverage
- 400-game balance simulation (`npm run balance`)
- browser playthroughs on a phone-sized screen with 4× slowed CPU
- a two-browser online end-to-end test
- a quick-match test
- a temporary probe test (not committed) that reproduced the quick-match abandonment defect

**Evidence labels used in every document**

| Label | Meaning |
|---|---|
| **[Defect]** | Confirmed bug, reproduced or certain from code |
| **[Measured]** | A number from a test or simulation |
| **[Hypothesis]** | Plausible, not yet verified |
| **[Enhancement]** | Optional improvement |

**Priorities**

| Priority | Meaning |
|---|---|
| P0 | Fix before public launch |
| P1 | Launch quality |
| P2 | First months after launch |
| P3 | Later |

---

## Studio verdict

Fruit Market has an unusually solid core for an indie mobile game:
- a deterministic rules engine
- server-authoritative multiplayer with secret-price protection
- replay-verified daily scores
- a balance simulator

Its identity (secret sealed-bid pricing on perishable stock) is distinctive and worth protecting.

It is **not yet launch-safe**:
- **Online play has no answer for players who leave.** A quick match can start with a player who has already gone, and then stalls permanently.
- **The public leaderboard has no moderation, ownership or rate limiting.**
- **Analytics cannot measure retention,** the metric the whole roadmap depends on.
- **The main game screen is slow on low-end phones:** about 3,400 SVG elements, with 1-second frame stalls when the CPU is slowed 4×.

None of these needs a rewrite. All are fixable in roughly 3–4 focused weeks before the closed test.

---

## Top 10 highest-impact findings

| # | Finding | Type | Evidence | Priority |
|---|---|---|---|---|
| 1 | **Abandoned online matches stall forever.** Every "continue" waits for all seats, and secret prices wait for every human, with no timeout, forfeit or computer takeover. A quick match even starts with a player who already left. | [Defect] | Probe test: A disconnects, B joins, the match starts, B's continue is stuck at `votes [1]` and still stuck after an hour of simulated time. Code: `server/room.ts:157` (auto-start ignores connection state), `:219` (votes need every seat), `:321` (waits for every human's prices) | P0 |
| 2 | **Leaderboard names can be impersonated, aren't moderated, and nothing is rate-limited.** One entry per *name*, so anyone can post under your name. No profanity filter. Every POST costs about 0.1 s of server CPU to replay. | [Defect] | `server/meta.ts:39` (`cleanName`), `:82` (`addEntry` keyed by name); `server/worker.ts:58–90` has no rate limiting | P0 |
| 3 | **Retention can't be measured.** Telemetry is anonymous counters only, with no install cohort, so day-1/7/30 retention is impossible to compute. Some counters are also inflated: `day_reached` fires again on resume or remount. | [Defect] | `src/net/telemetry.ts`, `src/ui/Game.tsx:405–406` | P0 |
| 4 | **Main-thread cost on the game screen.** 3,722 DOM nodes, of which 3,375 are SVG `<rect>`/`<use>`. With 4× CPU throttling: 460 long tasks, 5 over 200 ms, the longest 1,048 ms. The engine itself is cheap (56 ms per full 4-player game). | [Measured] | `src/ui/pixel.tsx` `Sprite` draws one `<rect>` per pixel run; deep-clone in `src/engine/game.ts:211` | P0/P1 |
| 5 | **`Game.tsx` owns too much:** 836 lines, 25 `useState`, 9 `useRef`, 12 `useEffect`, mixing the local loop, the online queue, animation choreography, every phase panel, results and daily submission. | [Measured] | `src/ui/Game.tsx` | P1 |
| 6 | **2-player games are blowouts:** 63% are won by $20 or more, only 7.5% are close, and the day-5 leader wins 65.5%. Customers pay near their maximum price in 51% of sales, so secret pricing has little bite. | [Measured] | `npm run balance`, `order-2p`, `economy-2p` | P1 |
| 7 | **Spoilage barely matters:** 0.1 fruit spoiled per player per game in 2-player games, 0.7 in 4-player. Juice Press and Shop Bell have no measurable effect on win rate (33.8% and 34.3% when banned, against a 34.5% control). Fruit decay is a price modifier, not a risk. | [Measured] | `economy-*`, `upgrades-3p` | P1 |
| 8 | **No human evidence at all:** no playtests, no device tests, no real retention or conversion data. Every balance figure comes from AI-vs-AI simulation. | [Measured, a gap] | — | P0 (process) |
| 9 | **Daily replay check is sensitive to version differences.** Submissions carry no rules or AI version, so any later change to the engine or AI makes the server compute a different score for older clients. | [Defect, latent] | `src/net/daily.ts`, `server/meta.ts:53` | P1 |
| 10 | **Mobile tap targets and readability:** market cells are 28–38 px wide at 360 px (7 slots per row), top-bar chips 32 px, and the demand row 38 px. | [Measured] | Playwright audit; `src/ui/styles.css:127`, `.mk-cell` | P1 |

## Top 10 proposed improvements

| # | Improvement | Fixes | Priority | Effort |
|---|---|---|---|---|
| 1 | **Handle players who leave:** a 60–90 s grace period, after which a computer takes over the seat. Never auto-start a quick match with a disconnected seat. Votes count only connected humans. | F1 | P0 | M |
| 2 | **Leaderboard ownership and moderation:** a per-device secret claim token so a name belongs to one device, a word blocklist plus normalisation, reserved names, and a remove path. | F2 | P0 | S–M |
| 3 | **Rate limiting** on all `/api/*` writes with the built-in Cloudflare Workers rate-limiting binding (no new npm dependency). | F2 | P0 | S |
| 4 | **Cohort-capable telemetry** without personal IDs: the client sends days since install, e.g. `active:d1`. Fix the double counting. Add a schema doc and dashboard query. | F3 | P0 | S |
| 5 | **Sprite rendering:** turn each compiled sprite into one cached image instead of hundreds of `<rect>` nodes. Target: under 600 DOM nodes and no 200 ms+ long tasks on the game screen. | F4 | P0/P1 | M |
| 6 | **Split `Game.tsx`** into a `useGameController` hook (state, local and online drivers), an animation director module and phase panels, with no behaviour change. | F5 | P1 | M–L |
| 7 | **2-player balance pass,** run in the simulator first: 2-player demand and supply scaling, plus a catch-up tweak. Accept only with reproducible before/after numbers. | F6 | P1 | S (code) + M (testing) |
| 8 | **Make freshness matter:** steeper aging price drops, or a freshness bonus, plus redesigned Juice Press and Shop Bell. Simulator-gated, with a rules version bump. | F7 | P1 | M |
| 9 | **Human playtest programme:** 3 rounds of 5–8 players before the closed test, plus the 12-tester × 14-day closed test with the telemetry above. | F8 | P0 | M (process) |
| 10 | **Send `rulesVersion` with daily submissions** and keep each day's rules frozen (the server rejects or labels mismatches). Widen market cells and raise chips to 40 px or more. | F9, F10 | P1 | S |

## Realistic milestone roadmap (details in 09)

| Milestone | Goal | Length |
|---|---|---|
| **M1 Production safety** | Players who leave, leaderboard abuse, rate limits, telemetry fixes | ~1.5 weeks |
| **M2 Performance and architecture** | Sprite images, `Game.tsx` split, lint and browser tests in CI | ~2 weeks |
| **M3 Balance validation** | 2-player and spoilage passes, AI fairness, first human playtest | ~2 weeks, playtest-gated |
| **M4 Mobile usability and feel** | Tap targets, readability, haptics and audio polish, screen-reader basics | ~1.5 weeks |
| **M5 Closed test** | 12 testers × 14 days, crash and retention dashboards, fixes | 2–3 weeks |
| **M6 Public launch v1.2** | Staged rollout | 1 week |
| **M7 Retention and live content** | Daily reminders, cloud save decision, server-driven content | Post-launch |
| **M8 Ethical monetisation** | Rewarded ads or cosmetics after the retention baseline | Post-launch |

## Critical architectural decisions

1. **Keep the engine pure and deterministic.** Every new mechanic goes through `applyAction`. No randomness from outside the seeded RNG.
2. **Version the rules, and freeze daily rules per date.** `RULES_VERSION` gates online play and also tags daily submissions.
3. **Handle leavers on the server with computer takeover,** rather than client-side timeouts or forfeits. This preserves match completion and fairness.
4. **Render sprites as cached images,** not per-pixel DOM. Canvas only if images prove insufficient.
5. **Analytics stays anonymous and aggregate,** but becomes cohort-aware (days since install computed on the device). No user IDs before an account system exists.
6. **No new runtime dependencies** for M1–M4. Rate limiting uses a platform binding; lint and format tools are development-only.
7. **Balance changes need a simulator baseline, a reproducible comparison, and a rules version bump when online rules change.**

## Features to explicitly defer

Accounts and cloud save (until retention data justifies it), async turn-based online, iOS, a cosmetic shop and payments, ads (until after the M5 baseline), friends lists and chat, new fruits, seasons and a battle pass, a skill-rating matchmaker, an animated environment, and translations (until store data shows demand).

## First implementation milestone (M1: Production Safety)

Exact files and tests are in **10-IMPLEMENTATION-BACKLOG.md**, items **B-01 to B-08**:
- `server/room.ts`: grace period and computer takeover, connected-only votes, quick-match start guard
- `server/meta.ts` and `server/worker.ts`: leaderboard claim tokens, name policy, rate limits, `rulesVersion` on submissions
- `src/net/telemetry.ts` and `src/ui/Game.tsx`: cohort events, no duplicate counts
- Tests: new cases in `tests/room.test.ts` and `tests/meta.test.ts`, plus an extended `scripts/e2e-online.cjs` disconnect scenario

## Uncertainties requiring real player evidence

1. Do humans find the secret-price showdown exciting or opaque? The tutorial covers it, but this is untested.
2. Is a 10-day game (about 10 minutes) the right session length? Is the 8-day mode preferred?
3. Do humans exploit something the AI doesn't, e.g. buying cheap old fruit for the Juice Press, or always bidding $1 under the customer's cap?
4. Is Hard too punishing as a daily-challenge rival (it beats Normal about 80% of the time)?
5. Is 2-player the dominant mode? That decides how urgent the 2-player balance work is.
6. Real day-1/day-7 retention, tutorial completion and quick-match fill rates. Not knowable without M1 telemetry and the M5 closed test.
7. Real device performance on 2 GB Android phones.
