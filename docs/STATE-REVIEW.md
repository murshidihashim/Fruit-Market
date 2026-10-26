# Fruit Market: state-of-the-game review (for an external reviewer)

- **Repo:** github.com/murshidihashim/Fruit-Market, branch `main`, commit `37ef61a` (v1.1.0, 2026-10-26)
- **Live web build:** https://fruit-market.murshidi-hashim.workers.dev. I couldn't reach it from my sandbox, which blocks workers.dev. GitHub Actions deploy and Android build both succeeded for this commit.
- **Author of this report:** the AI agent (Claude Code) that wrote most of the code. Treat the self-assessment with suspicion; all numbers below come from commands I ran on this commit and can be reproduced.
- **What it is:** a 2–4 player fruit-trading game.
  - Each day: buy fruit from a shared farmers market, set secret per-customer prices, and the cheapest offer sells first.
  - Fruit ages every night. Most cash after 8, 10 or 14 days wins.
  - Built with Preact + TypeScript, run in a Capacitor 8 Android wrapper, with a Cloudflare Worker + Durable Objects backend for online play.

---

## 1. Verdict (short)

| Area | Rating | One-line reason |
|---|---|---|
| Rules engine and server | Strong (8/10) | Pure, deterministic, strict TypeScript, 99% line coverage; the server re-runs every game rule itself; daily scores are checked by replaying the game. |
| UI code | Fair (5.5/10) | It works, but `Game.tsx` is 836 lines mixing a state machine, animation and layout. The global CSS file holds dead rules, and some components are dead. |
| Ready to publish (no ads) | Nearly | Blockers are process items, not code: real-device testing, Play closed test, leaderboard name moderation, API rate limiting. |
| Ready for ads | No | No ad SDK, no consent flow; privacy policy and listing say "no ads"; audience and families policy not decided. About 1–2 weeks of work. |
| Art style | Good and consistent, but heavy | Hand-authored pixel sprites drawn as SVG. About 3,400 `<rect>` nodes on the game screen cause slow frames on low-end phones. |
| Balance | Good for 3–4 players, weaker for 2 | Turn order and traits are fair, and Hard AI is clearly stronger. But 2-player games are blowout-heavy, and fruit spoilage barely matters. |
| Replayability | Good | Traits, an upgrade draft, 13 events, a 6-stage league, a daily challenge and online play. |
| Retention potential | Medium | Good loops (daily challenge plus leaderboard, league, achievements), but no push reminders, no cloud save and no live content pipeline yet. |

---

## 2. How to reproduce everything here

```bash
npm ci
npx tsc --noEmit && npx tsc -p server --noEmit        # type checks
npm test                                                 # 37 unit tests
npm run balance                                          # balance report (≈10 min, 400 games per test)
npm run build:single && node scripts/smoke.cjs dist-single/index.html /tmp/shots 3   # browser playthrough
npm run dev:online & node scripts/e2e-online.cjs http://127.0.0.1:8787 /tmp/e2e     # two-browser online match
```

---

## 3. Test and tooling results (this commit)

| Check | Result |
|---|---|
| TypeScript (app, `strict`, `noUnusedLocals`) | Clean. Turning on `--noUnusedParameters` gives 3 warnings (unused params in `game.ts:618`, `story.ts:39`, `room.test.ts:58`). |
| TypeScript (server) | Clean |
| Unit tests (vitest) | 37/37 pass in 6 files, about 13 s |
| Coverage (v8) | See table below |
| Browser playthrough, solo (Playwright, Chromium, 360×740, CPU throttled 4×) | Full 10-day game finishes. 0 page errors. No horizontal overflow on any screen. |
| Browser playthrough, smoke test (3 rivals) | Finishes, 0 errors |
| Online end-to-end (2 independent browser profiles via `wrangler dev`) | See list below |
| Quick match (2 browsers) | Paired into one room, match auto-starts |
| Daily leaderboard (local server) | See list below |
| `npm audit --omit=dev` (shipped dependencies) | **0 vulnerabilities** |
| `npm audit` (including dev tools) | 12 (2 critical, 5 high), all in dev tooling: vitest/tinypool, esbuild dev server, sharp (asset script), undici (wrangler). Nothing shipped is affected; `npm audit fix` or upgrading vitest/vite is recommended. |
| Lint / format | **No ESLint or Prettier configured.** |
| CI | Both workflows run `npm ci && npm test && npm run build` before deploy or APK build. Browser tests are not in CI. |

**Coverage (v8):**

| File | Lines covered |
|---|---|
| `game.ts` | 99.7% |
| `ai.ts` | 99.2% |
| `meta.ts` | 100% |
| `room.ts` | 97% |
| `story.ts` | 78% |

Not covered: `worker.ts` (the Cloudflare glue), and the client net modules `client.ts`, `telemetry.ts` and `net/daily.ts`. Those were exercised by the browser tests instead.

**Online end-to-end details:**
- the full match finishes
- 40 network frames checked during secret pricing: **0 price leaks**
- final cash identical on both clients
- a mid-game refresh restores the seat
- rematch works

**Daily leaderboard details:**
- the server replays a 60-move submission in about 0.1 s, and its score matches the client's ($59)
- a truncated move list is rejected
- a closed date is rejected

**Performance:**

| Measure | Value |
|---|---|
| Engine: one 4-player Hard game played start to finish (Node) | 56 ms |
| Engine: worst single step | 3.4 ms |
| Engine: game state size (JSON) | ≤19 KB |
| Web bundle | 168 KB JS (58 KB gzip), 46 KB CSS, about 130 KB fonts |
| Single-file preview build | 380 KB |
| Load to home screen (4× CPU throttle) | 1.2 s |
| Long tasks during a full game (4× throttle) | 460 over 50 ms, 5 over 200 ms, longest 1,048 ms |
| JS heap | 19 MB |
| DOM on the game screen | **3,722 elements, including 3,375 SVG `<rect>`/`<use>` across 59 SVGs** |

The engine is cheap. The long tasks come from the UI: re-rendering pixel-art SVGs plus JSON deep clones of the state. Recommendation: pre-render sprites once to cached images or a canvas atlas.

**Tap targets** (controls under 40px on the 360px-wide layout):
- top-bar event and rival chips: 32px tall
- the demand/supply row: 38px
- market cells for watermelon and apple: **28–38px wide** (7 slots per row)

Everything else is 44px or more. No unlabelled controls were found.

**Not tested** (be sceptical here):
- no real Android device or WebView
- no iOS
- no screen-reader pass
- no network-loss testing on a phone
- no load testing of the Durable Objects

---

## 4. Code quality

### Strengths
- **One rules engine shared by client and server.**
  - `src/engine/game.ts`: pure functions; the input state is never mutated (it is deep-cloned).
  - One entry point, `applyAction(state, player, action)`, is used for solo play, pass-and-play, the online server (`server/room.ts`) and leaderboard verification (`server/meta.ts`).
  - Seeded RNG (mulberry32), so games are reproducible.
- **Secrecy and anti-cheat are built into the server design.**
  - Each client receives a redacted view: no pending bids, no rival favour cards, no deck order, and `rng = 0`.
  - Seat tokens are needed to reconnect; action IDs prevent duplicate actions; version numbers reject stale ones.
  - A rules version check stops older clients joining.
  - Daily leaderboard scores are recomputed by replay.
- **Small dependency surface:** Preact, Capacitor, fonts. Shipped dependencies have no audit findings.
- **Balance tooling:** `scripts/balance.ts` (the simulation harness) is checked in and documented, and was used to tune the rules.
- **Documentation:**
  - `RULES.md`
  - `ONLINE.md` (architecture, endpoints, ops)
  - `PUBLISHING.md`
  - `store/listing.md` (listing text plus data-safety answers)
  - `docs/privacy.html`

### Weaknesses / tech debt (prioritised)
1. **`src/ui/Game.tsx` (836 lines) is a god component.** It mixes the local game loop, the online sync queue, the animation choreography, every phase panel and the results screen. Split it into a game-controller hook, an animation module and separate panels.
2. **Dead code.**
   - In `src/ui/board.tsx`: `MarketBoard`, `ShopPanel`, `RivalStrip`, `CustomerRow`, `PlayerHand`, `FavourChip`, `initials`, `STAGE_LABEL` are unused leftovers from earlier layouts.
   - Also unused: `tutorialDone` in `tutorial.ts`.
   - `styles.css` (685 lines, global) still carries rules for removed layouts.
3. **No lint or format tooling.** Add ESLint (typescript-eslint plus preact rules) and Prettier, and run them in CI.
4. **Rendering cost.** Every pixel is a `<rect>`. Cache sprites as images, or render the board to a canvas.
5. **No browser tests in CI.** Playwright scripts exist (`scripts/smoke.cjs`, `scripts/e2e-online.cjs`) but run manually.
6. **Untested modules.** `worker.ts` and the client network code have no unit tests (they rely on the end-to-end runs).
7. **Engine knobs live in code.** Balance values sit in `data.ts`, and the AI exports a mutable `HARD` object for tuning. There is no remote config, so balance changes need an app release. A rules version gate exists to keep online play consistent.
8. **Minor:** a handful of `as any` casts for CSS custom properties, and 3 unused parameters.

---

## 5. Is it ready for ads?

**Not yet. Nothing ad-related exists in the code.**

| Requirement | Status |
|---|---|
| Ad SDK (e.g. `@capacitor-community/admob`) | Missing |
| Consent: Google UMP / IAB TCF for EEA, UK and Switzerland | Missing |
| Play Families policy decision | Missing. The cartoon art could attract children. If the declared target audience includes under-13s, only Families-certified ad networks and non-personalised ads are allowed. Recommend a 13+ target audience if ads are wanted. |
| Privacy policy, store listing and in-app "About" | All currently state **"No ads"**; must be rewritten. |
| Data-safety form | Must add an advertising ID and ad-network data sharing. |
| Placement points in the flow | **Available.** Natural slots: the Results screen (between games), a rewarded "second daily attempt", "retry league stage", or "double the coins on a cosmetic unlock". Never show ads mid-day; the game is short and turn-based. |
| Measuring ad impact | Partial. Anonymous telemetry has a game funnel (`game_start`, `day_reached:N`, `game_end`, `quit_day:N`, `tutorial:*`) but no ad events. Ad revenue reporting would come from AdMob. |
| Web version ads | Not started. It would need a separate ad provider (e.g. AdSense for games / H5 ads). |

Recommendation: launch ad-free first to protect early ratings and retention. Measure with the existing telemetry, then add **rewarded-only** ads with a consent flow.

---

## 6. Art style

- **Direction:** a "Mediterranean market" palette:
  - terracotta `#c8553d`, harbour teal `#3e8f8c`, olive, saffron gold, cream
  - midnight-blue information surfaces
  - pixel heading font (Pixelify Sans) with a rounded readable body font (Fredoka)
- **Assets:** all genuine pixel art, hand-authored as text grids in `src/ui/pixel.tsx` and rendered as crisp SVG with automatic outlines:
  - 4 fruits × 4 freshness stages
  - procedural human customer portraits plus hand-drawn animal rival portraits
  - icons: coin, crate, cart, star, moon, sun, heart, lantern
  - 6 upgrade icons, 6 trait icons, 13 event icons, 6 favour icons
  - a striped-awning stall motif
- **Layout:** a tabletop. The market's freshness grid sits in the middle, with rival stalls left, top and right, customers with price bubbles above, a demand/supply row, and your full stall at the bottom. Pricing and upgrades slide up as a tray.
- **Strengths:**
  - a cohesive palette
  - fruit readable at small sizes
  - freshness shown by colour, with optional stripe/dot patterns for colour-blind players
- **Weaknesses:**
  - Characters are static (no idle or walk animation).
  - Few environmental details.
  - Some emoji remain in story text and small badges (e.g. reaction lines, a 💭 thinking marker, a 🃏 card count).
  - The audio is synthesised blips plus a simple procedural loop. It's functional, not premium.
  - Market cells get narrow at 360px.
- **Store assets:** a 512 icon, a 1024×500 feature graphic and 7 phone screenshots at 1080×1920, regenerated by `scripts/store-shots.cjs`.

---

## 7. Balance (numbers from `npm run balance`, 400 games per test)

The test players are computer opponents (all "Hard" unless stated). Treat these as indications of structure, not of human play.

**Fairness and closeness**

| Players | Win % by seat | Median winning margin | Close games (≤$3) | Blowouts (≥$20) | Day-5 leader wins | Wins from last place on day 5 |
|---|---|---|---|---|---|---|
| 2 | 49.5 / 50.5 | $27 | 7.5% | 63% | 65.5% | 34.5% |
| 3 | 35 / 33 / 32 | $18 | 9% | 46% | 53% | 19% |
| 4 | 23 / 25 / 26 / 26 | $14 | 14% | 38.5% | 47.5% | 9% |

- **Turn order** (the poorest shop buys first) beats the old rotating order in 3-player games: median margin $29 → $18, blowouts 63% → 46%, comebacks 12.5% → 19%.
- **Skill shows:**
  - Hard beats Normal 83% of the time (2-player) and 78% (3-player).
  - Normal beats Easy 72.5% of the time.
  - Hard beats three Easy rivals 90% of the time.
- **Traits** (win % in 3-player games; fair is 33):
  - Haggler 30
  - Big Basket 29.5
  - Bargain Hunter 40.8
  - Charmer 40.3
  - Local Favourite 33.3
  - Nest Egg 39.3
- **Upgrades** (win % in 3-player games; fair is 33):

  | Rule | Win % |
  |---|---|
  | AI's normal choices (control) | 34.5 |
  | Never builds any upgrade | 19.5 |
  | Never builds the Handcart | 30.8 |
  | Never builds the Signboard | 24 |
  | Never builds the Cool Room | 32.8 |
  | Never builds the Bigger Shelf | 27.3 |
  | Never builds the Juice Press | 33.8 (no effect) |
  | Never builds the Shop Bell | 34.3 (no effect) |

  Rushing a single upgrade on day 1 is always a trap (13–26%), because starting cash is tight ($10).
- **Fruit economics.** Profit per fruit bought, 2-player:

  | Fruit | Profit |
  |---|---|
  | Mango | $3.96 |
  | Blueberry | $3.39 |
  | Watermelon | $3.01 |
  | Apple | $2.58 |

  4-player games are much tighter: $1.12–1.79 per fruit, with 16.6% of sales in price wars.
- **Pacing:**
  - Income per player rises from about $6 on day 1 to about $29 by day 10 (2-player).
  - Dead days (nobody sells anything): about 0.03 per game.
- **Events** vs an average day at the same point in the game (2-player):

  | Event | Income change |
  |---|---|
  | Festival | +$11 |
  | Superfood | +$10 |
  | Mango Craze | +$10 |
  | Hotel Order | +$7 |
  | Bad Harvest | +$2 |
  | Minimum Price | −$2 |
  | Inspector | −$4 |
  | Strike | −$6 |
  | Rainy | −$8 |
  | Slow Season | −$12 |

  All events are announced a day early.

**Balance risks to review**
1. **2-player games are blowout-heavy:** 63% are decided by $20 or more, and only 7.5% are close. In 2-player, customers often pay near their maximum (51% of sales), because supply is scarce and secret pricing has less bite.
2. **Spoilage barely matters to the AI:** 0.1–0.7 fruit spoiled per player per game. Decay works mostly as a price modifier rather than a risk. This also explains why the Juice Press doesn't matter.
3. **Retuning Hard eroded some comeback gains.** Comebacks from last place were about 28% in 3-player games under the earlier Hard AI, and are about 19% with the current Hard AI. The Hard mirror is more cut-throat.
4. **Mango stays the most profitable fruit,** about 17% ahead of blueberry.
5. **The daily challenge is now harder,** because it includes one Hard rival.
6. **Untested with humans.** The AI is a heuristic best-response pricer, so human metagames may differ.

---

## 8. Replayability

Sources of variety per game:
- 3 of 6 merchant traits offered on day 1
- an evening upgrade draft (3 of 6 offered each night)
- 13 event cards
- 20 farmer cards
- 24 customer cards with distinct characters and quirks
- unripe-fruit timing
- a favour deck of 12 cards
- poorest-first turn order, which shifts every day
- 8, 10 or 14-day lengths
- 1–3 opponents at 3 AI levels

Modes:
- solo
- pass-and-play (secret pricing handled with a pass-the-phone screen)
- private online rooms (invite link) with optional computer rivals
- quick match with strangers
- the Market League (6 escalating stages)
- the daily challenge: a fixed seed for everyone, with a replay-verified leaderboard

**Gaps:**
- one map or theme
- 4 fruits only
- no seasonal or event decks
- no alternative win conditions or scenarios
- online has no matchmaking skill rating

---

## 9. User-retention potential

**Present:**
- daily challenge plus streak counter plus global daily leaderboard plus a spoiler-free share card
- Market League progression
- 12 achievements
- 8 unlockable awning colours
- a guided first game (tutorial tips)
- an end-of-game recap ("best moments / watch out for")
- anonymous funnel telemetry, so retention can be measured

**Missing, in rough priority:**
1. **Daily reminder notifications** (Capacitor Local Notifications). Probably the single biggest retention lever for a daily-challenge game.
2. **Cloud save / account linking** (e.g. Google Play Games Services). All progress is device-local and lost on reinstall.
3. **A live content pipeline:** remote config for balance and seasonal event decks without an app update.
4. **Meta-progression with choices:** e.g. a stall upgrade tree, or new fruits unlocked through the league.
5. **Social:** friends list, a friends leaderboard, rematch invites, async turn-based online play.
6. **Leaderboard name moderation and identity.** Names are free text, deduplicated by name, with no profanity filter.

Expected retention is unknown. There is no human playtest data yet.

---

## 10. Important before publishing (checklist)

**Blockers**
- [ ] **Test on real phones:** at least one low-end Android device (2 GB RAM, Android 7–9 WebView) and one modern device. Check frame rate on the game screen (3.4k SVG nodes), back-button behaviour, safe areas and haptics.
- [ ] **Google Play closed test:** new personal developer accounts need 12 opted-in testers for 14 days before production access.
- [ ] **Leaderboard name filter** (profanity/abuse) and a report/remove path. Display names are public.
- [ ] **Rate limits** on `POST /api/rooms`, `/api/quick`, `/api/daily` and `/api/t`. Daily verification costs about 0.1 s of server CPU per submission, so it is a cheap abuse target. Cloudflare rate-limiting rules or a per-IP token bucket would do.
- [ ] **Set the `FM_SERVER_URL` GitHub variable** so the Android build can reach the online server (the web build doesn't need it). Confirm online play works inside the APK.
- [ ] **Set the `STATS_KEY` secret** (`npx wrangler secret put STATS_KEY`) so telemetry can be read.

**Store / compliance**
- [ ] Privacy policy URL hosted (`docs/privacy.html`; GitHub Pages step in PUBLISHING.md).
- [ ] Data-safety form filled from `store/listing.md`: anonymous diagnostics; player name and moves for the leaderboard and online play; no device or advertising IDs.
- [ ] Content rating questionnaire (IARC) and target audience declaration. Note the Families implications above if under-13s are included.
- [ ] Target SDK 36, min SDK 24: OK for current Play requirements. App signing via an upload key (CI supports it).
- [ ] Telemetry is **on by default** (anonymous, aggregate, opt-out in Settings). Have a reviewer confirm this is acceptable for EU users, or switch to opt-in with a first-run prompt.

**Quality (strongly recommended)**
- [ ] Pre-render sprites to cut DOM and long tasks.
- [ ] Widen market cells or allow horizontal scroll at 360px.
- [ ] Raise top-bar chips to 40px or more.
- [ ] Remove dead UI code and CSS. Add ESLint and Prettier. Put Playwright smoke and online tests in CI.
- [ ] Decide on 2-player balance (e.g. reduce demand or supply scaling for 2 players) and on spoilage risk.
- [ ] Screen-reader pass: buttons are labelled, but the market grid and stalls are visual-first.

---

## 11. Questions for the reviewer

1. Is opt-out anonymous telemetry acceptable here, or should it be opt-in?
2. Should the core loop add a stronger reason to hold fruit overnight (more decay risk, more reward for freshness), given how little spoils?
3. Are the 2-player blowout rates acceptable for a casual game, or should 2-player use different scaling?
4. Is Hard (about 80% vs Normal) too punishing as one of the daily challenge's rivals?
5. Is it worth refactoring `Game.tsx` and moving rendering to cached sprites before launch, or after first telemetry?

---

## 12. Map of the code

| Path | What it holds |
|---|---|
| `src/engine/game.ts` | Rules, state, actions, turn order, traits, upgrade draft |
| `src/engine/ai.ts` | Computer players (Easy, Normal, Hard), with `HARD` tuning knobs |
| `src/engine/data.ts` | Fruits, cards, events, upgrades, traits, characters |
| `src/engine/story.ts` | Showdown explanations and recaps (presentation only) |
| `src/engine/daily.ts` | Daily challenge config, shared with the server |
| `server/room.ts` | Online room logic: lobby, secrecy, reconnect, quick-match auto-start |
| `server/meta.ts` | Telemetry cleaning, leaderboard replay verification, quick-match queue |
| `server/worker.ts` | Cloudflare routes and Durable Objects (rooms, stats, board, match) |
| `src/net/` | Protocol, WebSocket client, telemetry client, daily leaderboard client |
| `src/ui/Game.tsx` | Main game screen, animations, results |
| `src/ui/table.tsx` | Tabletop: market, stalls, customers, demand row |
| `src/ui/panel.tsx` | Price cards, upgrade draft, stall sheet |
| `src/ui/pixel.tsx` | All pixel art |
| `src/ui/App.tsx` | Home, setup, settings, trophies |
| `src/ui/progress.ts` | Achievements, league, colours |
| `src/ui/tutorial.ts` | First-game tips |
| `tests/` | engine, mechanics, story, room, meta (server features), progress |
| `scripts/balance.ts` | Balance report |
| `scripts/smoke.cjs`, `scripts/e2e-online.cjs`, `scripts/store-shots.cjs` | Browser automation |
