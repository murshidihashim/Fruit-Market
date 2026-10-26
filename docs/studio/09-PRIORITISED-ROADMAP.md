# 09 · Prioritised Roadmap

**Ranking method:**
- **Player impact** (1–5)
- **Severity** (1–5)
- **Cost** (S=1, M=2, L=3)
- **Confidence in evidence** (Defect/Measured = 1.0, Hypothesis = 0.6)
- **Score** = (impact + severity) × confidence ÷ cost

Each milestone is independently testable and ends with a release candidate.

| Rank | Item (backlog ID) | Impact | Severity | Cost | Confidence | Score |
|---|---|---|---|---|---|---|
| 1 | Rate limits (B-03) | 3 | 5 | 1 | 1.0 | 8.0 |
| 2 | Quick-match start guard (B-02) | 4 | 4 | 1 | 1.0 | 8.0 |
| 3 | Telemetry cohorts and duplicates (B-06, B-07) | 3 | 4 | 1 | 1.0 | 7.0 |
| 4 | Leaderboard claim token and name policy (B-04, B-05) | 3 | 4 | 1 | 1.0 | 7.0 |
| 5 | Daily `rulesVersion` and save envelope (B-08, B-12) | 3 | 3 | 1 | 1.0 | 6.0 |
| 6 | Grace period and computer takeover (B-01) | 5 | 5 | 2 | 1.0 | 5.0 |
| 7 | Tap targets (B-30, B-31) | 4 | 3 | 1.5 | 1.0 | 4.7 |
| 8 | Sprite images (B-10) | 4 | 4 | 2 | 1.0 | 4.0 |
| 9 | 2-player and spoilage balance (B-23, B-24) | 4 | 3 | 2 | 1.0 | 3.5 |
| 10 | Browser tests and budget in CI (B-13, B-14) | 3 | 3 | 2 | 1.0 | 3.0 |
| 11 | `Game.tsx` split (B-11) | 2 | 3 | 2.5 | 1.0 | 2.0 |
| 12 | Daily reminder notifications (B-50) | 4 | 2 | 2 | 0.6 | 1.8 |

---

## M1 · Production safety: ✅ done

**Goal:** no stuck matches, no leaderboard abuse, telemetry that can answer "do players come back?".

**Items:** B-01 to B-08.

**Exit criteria**
- All new room and server tests pass.
- The end-to-end abandonment scenario completes.
- Requests over the limit get 429.
- The cohort events are visible in `/api/stats`.
- `RULES_VERSION` decision made: MP1 is designed to be view-compatible, so no bump is needed. If a bump is needed, bump it.

## M2 · Performance and architecture (~2 weeks)

**Goal:** smooth on low-end phones; a safe base for iteration.

**Items:**
- B-09 (dead code)
- B-10 (sprite images)
- B-13 (browser tests in CI)
- B-14 (performance budget)
- B-15 (lint)
- B-11 (`Game.tsx` split, after B-13)
- B-12 (save envelope)

**Exit criteria**
- Game screen DOM ≤800; no long tasks >200 ms (4× throttle).
- `Game.tsx` ≤250 lines; CI runs lint, unit, end-to-end and budget suites.
- Store-screenshot visual diff within tolerance.

## M3 · Balance validation and first playtest (~2 weeks, playtest-gated)

**Goal:** fix the measured economy problems with evidence, and get the first human data.

**Items:**
- B-20 (baseline), B-21 (diff tool), B-22 (AI fairness test)
- B-23 (2-player scaling), B-24 (freshness stakes)
- B-25 (daily roster decision)
- B-26 (playtest round 1)
- Optional: B-27 (inert upgrades), B-28 (mango, traits)

**Exit criteria**
- Targets in 07 met in simulation.
- Playtest round 1 report: comprehension and fun ratings.
- Rules version bumped and documented.

## M4 · Mobile usability and game feel (~1.5 weeks)

**Items:**
- B-30, B-31 (targets)
- B-32 (coach placement)
- B-33 (emoji to pixel icons)
- B-34 (showdown audio cues)
- B-35 (abandonment countdown UI)
- B-36 (quick-match computer fallback)
- B-37 (consent prompt)
- Playtest round 2

**Exit criteria**
- The tap-target audit is clean.
- Playtest: ≥70% understand why a sale was lost and can hear sale outcomes.
- Consent behaviour verified by network interception.

## M5 · Closed test (2–3 weeks)

**Items:**
- B-40 (device matrix)
- B-41 (branch protection, staging, tags)
- B-42 (launch checklist)
- B-43 (dashboard)
- B-44 (captioned screenshots)
- Playtest round 3 / the closed test: 12+ testers × 14 days

**Exit criteria:** the thresholds in 06 (PM4):

| Metric | Threshold |
|---|---|
| Tutorial completion | ≥70% |
| First game finished | ≥60% |
| Return on day 1 | ≥30% |
| Return on day 7 | ≥10% |
| Crash-free | ≥99.5% |

## M6 · Public launch v1.2 (1 week)
- Staged rollout 5% → 100% with halt rules.
- Monitor the abandonment, crash and retention dashboards daily.

## M7 · Retention and live content (post-launch, data-driven)
- **B-50:** daily reminder notifications, if day-7 is below target.
- **B-51:** server-driven event decks and seasonal content, with the rules version per season.
- **B-52:** rules compatibility window (PR2).
- **B-53:** cloud save or export code, if reinstall churn shows up in feedback.
- **B-54:** strategy tips (UX4).

## M8 · Ethical monetisation (post-launch, after the retention baseline)
- **B-60:** decision memo (rewarded-only vs supporter pack). Only after M7 data.
- Requires a consent SDK, a privacy rewrite and data-safety updates.

---

## Features explicitly deferred (and why)
| Feature | Reason |
|---|---|
| Accounts / cloud save | Needs an identity provider; wait for evidence of reinstall churn |
| Async turn-based online | A large redesign; validate real-time online first |
| iOS | Mac and Apple account needed; Android first |
| Cosmetic shop, payments, ads | Protect the launch ratings; need a retention baseline |
| Friends lists, chat | Moderation burden; low evidence of need |
| New fruits, maps, seasons, battle pass | Fix the core economy first; content multiplies balance work |
| Skill-rating matchmaking | Concurrency too low to matter at launch |
| Animated environment, character animation sets | After the sprite performance fix, and only if playtests ask for it |
| Translations | After store data shows non-English demand |
| Canvas or WebGL renderer | Only if sprite images miss the performance budget |
