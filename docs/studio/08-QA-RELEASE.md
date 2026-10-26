# 08 · QA and Release

Departments: **QA Lead** and **Producer** (release management; scope and milestones are in 09).

---

## QA Lead: automated tests, regression, devices, failure scenarios

### 1. Current implementation and evidence
**Unit tests (vitest): 37 in 6 files, about 13 s** [Measured]

| File | Tests |
|---|---|
| `engine` | 7 |
| `mechanics` | 6 |
| `story` | 8 |
| `room` | 11 |
| `meta` | 5 |
| `progress` | 2 |

**Coverage** [Measured]

| Area | Lines covered |
|---|---|
| `game.ts` | 99.7% |
| `ai.ts` | 99.2% |
| `meta.ts` | 100% |
| `room.ts` | 97% |
| `story.ts` | 78% |
| `worker.ts`, `client.ts`, `telemetry.ts`, `net/daily.ts` | 0% |
| UI | Not unit-tested |

**Browser automation** (manual, not in CI)

| Script | What it does |
|---|---|
| `scripts/smoke.cjs` | Full solo game |
| `scripts/e2e-online.cjs` | Two browsers, leak check, refresh, rematch |
| `scripts/store-shots.cjs` | Store screenshots |
| Ad-hoc in `/tmp` | Quick-match and tap-target audit scripts |

**CI:** `npm ci && npm test && npm run build` in `android.yml` and `deploy-web.yml`. The APK is built on every push.

**Not covered**
- real Android devices or WebView versions
- low-memory devices
- network loss on mobile
- background/foreground resume mid-animation
- screen readers
- leaving a match (the defect reproduced in 05)
- load on the Durable Objects

### 2. Strengths
- Very strong engine and server coverage.
- A determinism test.
- A secrecy leak check in the end-to-end test.
- CI gates deploys on tests.

### 3. Weaknesses and risks
- Browser tests aren't in CI, so UI regressions are invisible until manual runs.
- No device matrix.
- No visual regression check.
- The abandonment scenario is untested, and is in fact broken.
- No performance budget.

### 4. Root causes
Playwright scripts grew as one-off tools rather than a test suite.

### 5. Proposed improvements
| ID | Change | Files | Priority |
|---|---|---|---|
| Q1 | Promote the browser scripts to a `test:e2e` npm script (solo smoke, online end-to-end, quick match, abandonment) running against `wrangler dev` in CI (Chromium preinstalled on runners via the Playwright action) | `scripts/*.cjs`, `package.json`, `.github/workflows/ci.yml` | P1 |
| Q2 | Performance and UX budget script in CI: DOM ≤800 on the game screen, no long task >200 ms with a 4× throttle, zero tap targets <40 px on core screens | `scripts/perf-budget.cjs` | P1 |
| Q3 | Visual regression: compare `store-shots` images with a tolerance (pixelmatch-style diff written in a few lines; no dependency, or a dev-only one) | `scripts/visual-diff.cjs` | P2 |
| Q4 | Device matrix for the closed test:<br>• 1 low-end (2–3 GB RAM, Android 8–10)<br>• 1 mid (Android 12–13)<br>• 1 flagship (Android 14+)<br>• 1 tablet<br>Plus Chrome, Safari and Firefox for the web build. Checklist in `docs/studio/QA-CHECKLIST.md`. | docs | P0 (before closed test) |
| Q5 | Failure-scenario tests:<br>• kill the app mid-showdown, then resume<br>• airplane mode mid-online-day<br>• two tabs on one seat<br>• server version bump mid-session<br>• corrupted save JSON<br>• an old save version | `tests/*.test.ts`, e2e | P1 |
| Q6 | A unit-test seam for `worker.ts` routes | `tests/worker.test.ts` | P2 |

### 6. Effort and dependencies
- Q1: M.
- Q2: S.
- Q3: S–M.
- Q4: M (people and devices).
- Q5: M.
- Q6: M.
- Q1 should land before the `Game.tsx` refactor (F2).

### 7. Acceptance criteria
- CI runs unit, end-to-end and budget suites on every pull request in under 10 minutes.
- A failing end-to-end test blocks deploy.
- The closed-test checklist is signed off on 4 devices.
- Crash-free rate ≥99.5% in Play Console vitals during the closed test.

---

## Producer: dependencies, scope, release management

### 1. Current state
- **Releases:**
  - every push to `main` deploys the web build and server and builds an APK
  - version 1.1.0 (`package.json`, `android/app/build.gradle` `versionName`); CI-derived `versionCode`
  - no tags or changelog
- **Branching:** direct pushes to `main`; no pull requests or review.
- **Secrets and variables:**
  - `CLOUDFLARE_API_TOKEN` and `CLOUDFLARE_ACCOUNT_ID`: set
  - `FM_SERVER_URL`: unverified, but needed for online play inside the APK
  - `STATS_KEY`: not yet set
  - keystore secrets: per `PUBLISHING.md`
- **Play Console:**
  - closed test not started
  - new personal accounts must run a closed test with 12 testers for 14 days before production

### 2. Strengths
- Fully automated build and deploy.
- Good docs (`PUBLISHING.md`, `ONLINE.md`).

### 3. Weaknesses and risks
- **[Measured] Every push to `main` goes live** on the web, and rule changes reach the server immediately. Combined with the rules version gate, a push can lock out the installed app versions until players update.
- **[Measured] No staging environment, no tags, no changelog.**
- **[Hypothesis] The scope is wide for one developer:** many modes to maintain.

### 4. Root causes
Prototype-speed workflow.

### 5. Proposed improvements
| ID | Change | Files | Priority |
|---|---|---|---|
| PR1 | **Branch protection:** pull requests into `main`, CI required; deploy on tags (`v*`) instead of every push. Add a `staging` worker (`wrangler.jsonc` env) deployed from `main`. | `.github/workflows/*.yml`, `wrangler.jsonc` | P0 |
| PR2 | **Rules compatibility policy:** the server supports the current and previous `RULES_VERSION` for at least 2 weeks after an app update ships. Rooms pin the version of their creator. | `server/room.ts`, `src/net/protocol.ts` | P1 (design), P2 (implementation) |
| PR3 | **`CHANGELOG.md` plus semantic versioning,** with release notes for Play | root | P1 |
| PR4 | **Launch checklist:**<br>• secrets set (`STATS_KEY`, `FM_SERVER_URL`)<br>• privacy URL live<br>• data safety, IARC rating and audience done<br>• the closed test passed against the thresholds (06, PM4)<br>• staged rollout 5% → 20% → 50% → 100% with crash-rate halts | `docs/studio/LAUNCH-CHECKLIST.md` | P0 |

### 6. Effort
- PR1: S–M.
- PR2: M.
- PR3: S.
- PR4: S.

### 7. Acceptance criteria
- Pushing to `main` deploys only to staging; production deploys require a tag.
- The checklist is completed and linked in the release pull request.
- A rollback runbook is documented: `wrangler rollback` plus Play halting the rollout.
