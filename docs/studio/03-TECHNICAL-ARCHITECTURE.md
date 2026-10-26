# 03 · Technical Architecture

Departments: **Technical Director**, **Frontend Engineer** and **Backend Engineer**.

## Codebase snapshot [Measured]

**Lines of code**

| Area | Lines |
|---|---|
| `src/engine` | 1,805 |
| `src/ui` | 3,177 |
| `src/net` | 313 |
| `server` | 727 |
| `tests` | 682 |
| `scripts` | 660 |

**Largest files**

| File | Lines |
|---|---|
| `src/ui/Game.tsx` | 836 |
| `src/engine/game.ts` | 816 |
| `src/ui/styles.css` | 685 |
| `src/ui/pixel.tsx` | 482 |
| `server/room.ts` | 360 |

**Type checking and tests**
- TypeScript runs with `strict` and `noUnusedLocals`, and is clean.
- `--noUnusedParameters` reports 3 warnings.
- Test coverage: engine 99%, server room 97%, server features (`meta.ts`) 100%.
- No coverage: `server/worker.ts` and the client network code.

**Dependencies**
- Runtime: Preact, Capacitor (core, Android, app, haptics), Fontsource fonts.
- Dev: Vite 5, Vitest 2, Wrangler 4, TypeScript 5.6.
- `npm audit` finds 0 issues in shipped dependencies and 12 in dev tools (vitest/tinypool, esbuild, sharp, undici).

**CI and tooling**
- CI runs `npm ci`, the tests and the build before both deploy and the APK build.
- No ESLint or Prettier.
- Browser tests are not in CI.

---

## Technical Director: architecture, dependencies, maintainability

### 1. Current implementation
- **Layers:**
  - pure engine (`src/engine`)
  - presentation-only story text (`story.ts`)
  - UI (`src/ui`)
  - network (`src/net`)
  - server (`server/room.ts` for room logic, `server/meta.ts` for leaderboard, telemetry and quick match, `server/worker.ts` for Cloudflare glue)
- **One action pipeline:** `applyAction` (`src/engine/game.ts`) is used by local play, the room server and daily replay verification.

### 2. Strengths to preserve
- Determinism (seeded RNG) and immutability.
- The client and server share the same rules code.
- Server logic is testable without Cloudflare (`RoomIO` interface).
- The dependency list is small.

### 3. Weaknesses and risks
- **[Measured] Every action deep-clones the whole state** (`game.ts:211`). It's fine in the engine (about 56 ms per full game), but it multiplies UI re-render work and garbage collection on phones.
- **[Defect, latent] No save-schema version** (`src/ui/store.ts:34`). A future rules change can break resumed saves. v1.0→v1.1 worked only because the new fields are optional.
- **[Defect, latent] Daily submissions carry no rules or AI version** (`src/net/daily.ts`). Any later AI or rules change makes old clients' scores fail verification or differ.
- **[Measured] Dead code:**
  - `src/ui/board.tsx`: `MarketBoard`, `ShopPanel`, `RivalStrip`, `CustomerRow`, `PlayerHand`, `FavourChip`, `initials`, `STAGE_LABEL`
  - `tutorialDone` in `src/ui/tutorial.ts`
  - CSS for removed layouts
- **[Measured] No lint or format tools.** The style is consistent, but unenforced.
- **[Measured] Dev dependency vulnerabilities** in tooling.

### 4. Root causes
Rapid iteration across several redesigns, without clean-up passes or lint gates.

### 5. Proposed improvements
| ID | Change | Files | Priority |
|---|---|---|---|
| T1 | Save envelope `{ v: SAVE_VERSION, rules: RULES_VERSION, game }`, with a migration (or "can't resume, start fresh") path | `src/ui/store.ts`, `src/ui/App.tsx` | P1 |
| T2 | `rulesVersion` in daily submissions; the server rejects mismatches with an "update" message; daily rules frozen per release | `src/net/daily.ts`, `server/meta.ts`, `src/net/protocol.ts` | P1 |
| T3 | Remove dead UI and CSS; keep `board.tsx`'s `Track` and `TrackLegend` (used by `panel.tsx`) | `src/ui/board.tsx`, `src/ui/styles.css` | P1 |
| T4 | Add ESLint (typescript-eslint, preact hooks rules) and Prettier as dev-only dependencies; run lint in CI | `package.json`, `eslint.config.js`, `.github/workflows/*.yml` | P1 |
| T5 | Upgrade the dev toolchain (vitest 3, vite 6) or `npm audit fix`; confirm builds | `package.json` | P2 |
| T6 | Structural sharing instead of a full deep clone: clone only changed slices, keeping the same immutable semantics. Only if profiling after B-10 still shows clone cost. | `src/engine/game.ts` | P3 |

### 6. Priority, effort, dependencies
- T1, T2: effort S each.
- T3: effort S.
- T4: effort S–M.
- T5: effort S.
- T6: effort M, gated by profiling.

### 7. Acceptance criteria
- `npm run lint` is clean in CI.
- `tsc --noUnusedParameters` is clean.
- An old-version save shows a "start a new game" prompt instead of crashing (unit test with a fixture).
- A daily submission with the wrong `rulesVersion` gets an HTTP 409 and a clear message (test in `tests/meta.test.ts`).

---

## Frontend Engineer: components, rendering, mobile performance

### 1. Current implementation and evidence
- **`Game.tsx`:**
  - 836 lines
  - 25 `useState`, 9 `useRef`, 12 `useEffect`
  - In one component: the local AI driver, the online server-view queue, the busy/animation lock, the showdown sequencer, the nightfall and delivery animations, the hand-off screen, the event and tip popovers, the phase overlays and tray, and the action bar.
  - Sub-components in the same file: `TopBar`, `MorningCard`, `TraitPick`, `Showdown`, `SalesSummary`, `DailyResult`, `Results`.
- **Sprites:**
  - `Sprite` in `src/ui/pixel.tsx` compiles the text grid into horizontal runs (cached), but renders **one `<rect>` per run** inside its own `<svg>`.
  - Game screen: 59 SVGs and 3,375 rect/use nodes (3,722 DOM nodes in total).
- **Phone simulation** (360×740, 4× CPU throttle, full game):
  - load to home screen: 1.2 s
  - long tasks: 460, of which 5 over 200 ms; the longest was 1,048 ms
  - JS heap: 19 MB
  - no console errors and no horizontal overflow
- **Animation:** the Web Animations API with `data-a` anchors (`src/ui/anim.ts`). Reduced motion is respected through CSS.

### 2. Strengths to preserve
- The animation anchor system, with fallback anchor lists.
- `prefers-reduced-motion` support.
- No layout overflow at 360 px.
- A single-file build for previews.

### 3. Weaknesses and risks
- **[Measured]** DOM weight and long tasks, described above.
- **[Measured]** `Game.tsx` complexity. State ownership is implicit: `s`, `sRef`, `turnStart`, `busyRef` and the online `sending` lock are coordinated by convention. Regression risk is high.
- **[Hypothesis] Online re-renders** may rebuild the whole tree for every server view; `useMemo` and `memo` are barely used.

### 4. Root causes
Sprites were designed for correctness (crisp pixels everywhere), not DOM economy. The game screen grew feature by feature.

### 5. Proposed improvements
| ID | Change | Files | Priority |
|---|---|---|---|
| F1 | **Sprite images:** serialise each compiled sprite to a `data:image/svg+xml` URL once, cached by sprite id and stage, and render `<img>` with `image-rendering: pixelated`. Nested SVG cases (`x`/`y` inside an SVG) become `<image href>`. Keep the API (`Sprite`, `PixelFruit`, `Portrait`, `Icon`) unchanged. | `src/ui/pixel.tsx`, `src/ui/art.tsx` | P0/P1 |
| F2 | **Split `Game.tsx`:**<br>• `src/ui/game/useGameController.ts`: state, the local AI loop, online queue, `act`/`proceed`, undo<br>• `src/ui/game/animator.ts`: delivery, moves, showdown, nightfall sequences<br>• `src/ui/game/panels/*.tsx`: `TopBar`, `MorningCard`, `TraitPick`, `Showdown`, `SalesSummary`, `Results`, `DailyResult`<br>• `Game.tsx` becomes layout only (target under 250 lines)<br>No behaviour change. | `src/ui/Game.tsx` and new files | P1 |
| F3 | **Memoise stable subtrees:** `memo` for `RivalStall`, `MyStall`, `Market`, `Street`, keyed on the relevant slices | `src/ui/table.tsx` | P2 |
| F4 | **Performance budget in CI:** a Playwright script fails if the game screen has more than 800 DOM nodes, or has any long task over 200 ms with a 4× throttle (Chromium) | `scripts/perf-budget.cjs`, CI | P1 |

### 6. Priority, effort, dependencies
- F1: effort M, no dependencies. Do it first; it's isolated.
- F2: effort M–L. Needs browser tests in CI first (Q-02), so regressions are caught.
- F3: effort S, after F2.
- F4: effort S.

### 7. Acceptance criteria
- Game-screen DOM under 800 nodes.
- Zero long tasks over 200 ms in the throttled full-game run, and p95 long task under 100 ms.
- Visual screenshots match within a small pixel difference (`scripts/store-shots.cjs` before and after).
- All browser end-to-end tests pass.
- After F2, `Game.tsx` is under 250 lines and no single file in `src/ui/game/` is over 300.

---

## Backend Engineer: APIs, persistence, networking, scalability

### 1. Current implementation (`server/worker.ts`)
**Routes**

| Route | Purpose |
|---|---|
| `POST /api/rooms` | Create a private room |
| `POST /api/quick` | Quick match |
| `GET /ws/:code` | Join a room (WebSocket) |
| `POST /api/t` | Telemetry |
| `GET /api/stats` | Telemetry report (needs `x-stats-key`) |
| `GET/POST /api/daily` | Daily leaderboard |
| `GET /api/version` | Rules version |

**Durable Objects**

| Object | What it holds |
|---|---|
| `RoomDO` | One per room. Room JSON in storage, hibernatable WebSockets, 24 h expiry alarm. |
| `StatsDO` | A single global object. SQLite tables `counts` and `errors`, pruned after 90 days. |
| `BoardDO` | One per date. Top 100 entries in storage. |
| `MatchDO` | A single global object. A quick-match slot. |

Room storage is written once per message.

### 2. Strengths to preserve
- One small object per room, with natural horizontal scale.
- Hibernation, so idle rooms cost nearly nothing.
- Pure logic modules (`room.ts`, `meta.ts`) can be unit-tested.

### 3. Weaknesses and risks
- **[Defect] No rate limiting** on any write route. Room creation, quick match, telemetry and daily replay can all be spammed. Daily replay costs about 0.1 s of CPU per call.
- **[Hypothesis] Single objects for telemetry and quick match** will throttle beyond roughly a few hundred requests per second. That's fine for launch; shard later.
- **[Measured] `worker.ts` has no tests.** Route errors are only caught by the end-to-end runs.
- **[Defect, minor] The share link is hard-coded** to the workers.dev domain (`src/ui/Game.tsx:756`).
- **[Hypothesis] No backups or export** of leaderboard data. That's acceptable, since it's ephemeral.

### 4. Root causes
MVP scope.

### 5. Proposed improvements
| ID | Change | Files | Priority |
|---|---|---|---|
| BE1 | Workers rate-limiting binding (per IP plus route) on `rooms`, `quick`, `t` and `daily`; HTTP 429 with a JSON error | `wrangler.jsonc`, `server/worker.ts` | P0 |
| BE2 | Route tests with Miniflare via `@cloudflare/vitest-pool-workers` (dev-only), or a thin `handle(req, env)` export tested with fake bindings | `server/worker.ts`, `tests/worker.test.ts` | P2 |
| BE3 | Public URL from config (`VITE_PUBLIC_URL`), falling back to `location.origin` | `src/ui/Game.tsx`, `vite.config.ts` | P2 |
| BE4 | Shard `StatsDO` by `hash % 8` and aggregate on read, once traffic is over 100 req/s (revisit using telemetry) | `server/worker.ts` | P3 |

### 6. Priority, effort, dependencies
- BE1: effort S.
- BE2: effort M.
- BE3: effort S.
- BE4: effort S, deferred.

### 7. Acceptance criteria
- Repeated POSTs above the configured limit return 429, verified against local `wrangler dev` with a curl loop.
- Normal play (the end-to-end test) never hits a limit.
- Route tests cover 200, 400, 403, 404 and 429 paths.
