# 06 · Product, Analytics, Growth and Monetisation

Departments: **Product Manager**, **Data Analyst** and **Growth and Monetisation Lead**.

---

## Product Manager: audience, differentiation, prioritisation

### 1. Current implementation and evidence
- **Positioning** (`store/listing.md`): "Buy fresh, sell fast, undercut your rivals." No ads, no accounts; solo play works offline.
- **Modes:**
  - solo
  - pass-and-play
  - private online rooms
  - quick match
  - the Market League (6 stages)
  - the daily challenge with leaderboard and share card
  - achievements and awning colours
- **Session:** about 10 minutes (10 days), or 8- and 14-day variants.

### 2. Strengths
- **A clear differentiator:** competitive sealed-bid trading with perishable stock. Few mobile games occupy this niche between light strategy (board-game adaptations) and casual tycoon games.
- **Short sessions, offline solo play, no pay-to-win.**

### 3. Weaknesses and risks
- **[Hypothesis] Target audience undefined.** The art reads all-ages; the mechanics suit 13+ light-strategy and board-game fans. This affects Play's Families policy, ads and tone.
- **[Measured] No player evidence:** zero playtests and no store data.
- **[Hypothesis] Feature breadth is ahead of depth.** Six modes ship before the core loop has been validated with humans.

### 4. Root causes
Built for completeness ahead of validation.

### 5. Proposed improvements
| ID | Change | Priority |
|---|---|---|
| PM1 | **Declare the primary audience:** 13+ casual-strategy and board-game players, with pass-and-play families secondary. Record it in `docs/studio/01`. Use it for the content rating, ads and tone. | P0 (decision) |
| PM2 | **Playtest programme** before the closed test: 3 rounds × 5–8 players, with a script and survey (see 08). | P0 |
| PM3 | **Feature freeze** for M1–M5: only fixes, balance and usability. | P0 |
| PM4 | **Success thresholds** for the closed test:<br>• tutorial completion ≥70%<br>• first-game completion ≥60%<br>• day-1 return ≥30%<br>• day-7 return ≥10%<br>• crash-free ≥99.5%<br>• quick-match fill ≥50% at peak<br>Revisit after real data. | P0 |

### 6. Effort and dependencies
- PM1, PM3, PM4: effort S (decisions).
- PM2: effort M.

### 7. Acceptance criteria
- The audience is documented.
- 3 playtest reports are written up in `docs/studio/playtests/`.
- The thresholds are tracked in the dashboard (DA1).

---

## Data Analyst: events, funnels, cohorts, experiments

### 1. Current implementation and evidence (`src/net/telemetry.ts`, `server/worker.ts` `StatsDO`)
- **Events:**

  | Event | Values |
  |---|---|
  | `app_open` | `android` / `web` |
  | `game_start` | `solo` / `pass_and_play` / `daily` / `online` |
  | `players` | n |
  | `day_reached` | N |
  | `game_end` | `win` / `lose` |
  | `final_cash` | bucket |
  | `quit_day` | N |
  | `tutorial` | step |
  | `online` | `create` / `quick` |
  | `daily_share` | — |

  Plus error lines.
- Stored as daily counts in SQLite and kept 90 days. Read via `GET /api/stats` with a key.
- **[Defect] Retention can't be computed.** There's no install date or cohort, so day-1/7/30 return is impossible.
- **[Defect] Double counting:** `day_reached` fires on mount (`src/ui/Game.tsx:405`), so resuming a saved game or remounting during an online reconnect counts the same day again.
- **[Measured] No dashboard;** the stats endpoint returns raw JSON.

### 2. Strengths
- A privacy-first design: no personal data.
- A cheap pipeline with no third-party SDK.

### 3. Weaknesses and risks
- No cohort data.
- No experiment framework.
- Duplicate counts.
- No events for online quality (abandonment, reconnects, quick-match timeouts).
- No session length.

### 4. Root causes
Counters were designed without user IDs, which is right for privacy. But the cohort information was never moved to the device.

### 5. Proposed improvements
| ID | Change | Files | Priority |
|---|---|---|---|
| DA1 | **Cohorts on the device:**<br>• store `fm.install` (date) locally<br>• on each app open, send `active:d{N}` where N = days since install (bucket 0–7, 14, 30, 30+) and `install_week:{YYYY-Www}` once<br>• retention for day N ≈ count(active:dN) ÷ count(active:d0) for the matching installs<br>No identifiers leave the device. | `src/net/telemetry.ts`, `src/ui/store.ts` | P0 |
| DA2 | **Fix duplicates:** send `day_reached` only on a day *transition* in a live session (track the last-sent day per game seed in memory and in the save) | `src/ui/Game.tsx` (B-07) | P0 |
| DA3 | **Funnel events:**<br>• `tutorial_done`<br>• `first_game_complete`<br>• `online_abandon`, `online_takeover`, `quick_timeout`, `quick_fallback_ai`<br>• `league_stage_cleared:N`<br>• `daily_submit:ok/err`<br>• `session_minutes:bucket` | `telemetry.ts`, `Game.tsx`, `Online.tsx`, `server` | P1 |
| DA4 | **Dashboard:** a small static HTML page (or a script) that calls `/api/stats` and draws the funnel, retention and errors. Document the queries in `docs/ANALYTICS.md`. | `scripts/stats-report.mjs`, `docs/ANALYTICS.md` | P1 |
| DA5 | **Experiments:** deterministic A/B bucket from the install date hash (no ID), e.g. tutorial variants, sent as `exp:tutorial_b`. Only once traffic is above about 500 daily active users. | `telemetry.ts` | P3 |

### 6. Effort
- DA1: S.
- DA2: S.
- DA3: S–M.
- DA4: M.
- DA5: M.

### 7. Acceptance criteria
- A unit test of the cohort bucket function.
- A Playwright test: one session sends `active:d0` once, and resuming a saved game sends no duplicate `day_reached`.
- The dashboard shows a retention curve from synthetic data.

---

## Growth and Monetisation Lead: distribution, store conversion, retention, ethical revenue

### 1. Current implementation and evidence
- **Store kit:** listing text, a data-safety draft, 512 icon, feature graphic and 7 screenshots at 1080×1920 (`store/`, `scripts/store-shots.cjs`).
- **Viral and retention hooks:** the daily share card (spoiler-free grid), invite links for private rooms, streaks, the league, achievements.
- **Monetisation:** none.
  - No ad SDK, no billing.
  - The privacy policy and listing state "no ads".

### 2. Strengths
- A clean, trust-building launch posture.
- A share card for organic spread.
- Room invite links.

### 3. Weaknesses and risks
- **[Hypothesis] No daily reminder.** For a daily-challenge game, local notifications are usually the main return driver.
- **[Measured] Progress is device-only:** reinstalling loses the league, achievements and colours.
- **[Hypothesis] Store conversion is unknown.** The screenshots are raw gameplay with no captions.
- **[Measured] No revenue path.**

### 4. Root causes
A deliberate ad-free MVP.

### 5. Proposed improvements (order matters; monetisation only after a retention baseline)
| ID | Change | Files | Priority |
|---|---|---|---|
| G1 | Captioned store screenshots ("Price in secret", "Beat the rot", "Daily leaderboard"); A/B test them through Play's store listing experiments | `scripts/store-shots.cjs` (overlay captions), `store/` | P1 |
| G2 | Daily reminder with Capacitor Local Notifications: opt-in, one a day at a player-chosen time, links to the daily | `package.json` (+`@capacitor/local-notifications`, an official plugin), `src/ui/App.tsx`, settings | P2 (after closed-test data) |
| G3 | Cloud save via Google Play Games Services, or an export/import code (lightweight, no account) | — | P3 (decision after retention data) |
| G4 | **Ethical monetisation, after M5:**<br>• rewarded ads only, opt-in: "retry this league stage", "a second daily attempt (unranked)"<br>• or a one-time "Supporter pack" (cosmetic awnings)<br>• never interstitials mid-game; never pay-to-win<br>Needs: the consent SDK (UMP), a policy rewrite, a data-safety update, and an audience decision (PM1) | — | P3 |

### 6. Effort
- G1: S.
- G2: M (new plugin; justified by retention, review the cost).
- G3: L.
- G4: L.

### 7. Acceptance criteria
- The store listing experiment shows its install conversion.
- G2 passes only if the closed test shows day-7 below target, and an A/B check shows reminders improve day-7 without raising uninstalls.
- G4 starts only after the retention thresholds (PM4) are met.
