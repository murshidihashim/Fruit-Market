# 07 · Economy and Balance

Department: **Economy Designer**, plus **AI difficulty and fairness**, shared with the Lead Game Designer.

**Baseline:** `npm run balance` at commit `539294e`, 400 games per test. Unless stated, every player is the Hard computer. Re-run this before any change, and save the raw output as `docs/studio/balance/baseline-539294e.jsonl` (task B-20).

---

## 1. Current implementation and evidence

**Economy primitives** (`src/engine/data.ts`)

| Item | Value |
|---|---|
| Starting cash | $10 |
| Buy limit per day | 4 (Handcart: 5; Big Basket trait: +1) |
| Shelf size | 8 (Bigger Shelf: 14) |
| Freshness price drop by age, oldest first | blueberry [4,2,0]; watermelon [3,1,1,0,0]; apple [2,1,1,1,0,0,0]; mango [3,1,0,0] + 2 unripe slots |
| Market costs by freshness | blueberry $2/1/1; watermelon $3/2/1; apple $4/3/1; mango $4/2/1, unripe $2 |
| Customer price shift | apple −1, mango +2 |
| Demand target | buy capacity × (0.4 + 0.45 × progress) (`game.ts:202`) |
| Supply | buy capacity × (1 + 0.5 × progress) (`:207`) |
| Upgrades (draft of 3 per evening) | Handcart $6, Signboard $8, Cool Room $7, Bigger Shelf $3, Juice Press $4 (up to 3 spoiling fruit become $2 each per night), Shop Bell $4 |
| Traits (1 of 3) | Haggler, Big Basket, Bargain Hunter, Charmer, Local Favourite, Nest Egg |

**Fairness and closeness** [Measured]

| Players | Win % by seat | Median winning margin | Close games (≤$3) | Blowouts (≥$20) | Day-5 leader wins | Win from last place on day 5 |
|---|---|---|---|---|---|---|
| 2 | 49.5 / 50.5 | $27 | 7.5% | **63%** | 65.5% | 34.5% |
| 3 | 35 / 33 / 32 | $18 | 9% | 46% | 53% | 19% |
| 4 | 23 / 25 / 26 / 26 | $14 | 14% | 38.5% | 47.5% | 9% |

**Market behaviour** [Measured]

| Measure | 2 players | 4 players |
|---|---|---|
| Profit per fruit: mango | $3.96 | $1.79 |
| Profit per fruit: blueberry | $3.39 | $1.51 |
| Profit per fruit: watermelon | $3.01 | $1.29 |
| Profit per fruit: apple | $2.58 | $1.12 |
| Demand served | 69% | 61.5% |
| Sales in price wars (≤$2) | 5.9% | 16.6% |
| Sales near the customer's maximum | **51%** | 20% |
| Fruit spoiled per player per game | **0.1** | 0.7 |

**Upgrades** [Measured] (3-player win %; fair is 33.3)

| Rule | Win % |
|---|---|
| AI's normal choices (control) | 34.5 |
| Never builds any upgrade | 19.5 |
| Never builds the Handcart | 30.8 |
| Never builds the Signboard | 24 |
| Never builds the Cool Room | 32.8 |
| Never builds the Bigger Shelf | 27.3 |
| Never builds the Juice Press | **33.8** (no effect) |
| Never builds the Shop Bell | **34.3** (no effect) |
| Rushes a single upgrade on day 1 | 13–26 |

**Traits** [Measured] (3-player win %; fair is 33.3)

| Trait | Win % |
|---|---|
| Haggler | 30.0 |
| Big Basket | 29.5 |
| Bargain Hunter | **40.8** |
| Charmer | **40.3** |
| Local Favourite | 33.3 |
| Nest Egg | 39.3 |

**Events** [Measured] (2-player income vs an average day at the same point in the game)

| Event | Change |
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

**AI difficulty** [Measured]

| Matchup | Stronger side wins |
|---|---|
| Hard vs Normal, 2 players | 82.8% |
| Hard vs Normal, 3 players | 77.8% |
| Normal vs Easy, 2 players | 72.5% |
| Hard vs 3 Easy | 90% |

- **Human-vs-computer information fairness:** `src/engine/ai.ts` never reads `s.bids` (confirmed by grep). The computer sees only public information: the market, customers and every shelf. Hard's edge comes from `HARD = { threshold 0.3, keep 0.1, eventAware 1, undercut 1 }`.

## 2. Strengths to preserve
- Turn order is fair.
- The upgrade draft has no auto-pick.
- Every trait lands within roughly ±8 points of fair.
- Events are swingy but announced a day ahead.
- The computer opponents cheat on nothing.
- Difficulty levels are clearly separated.
- The balance tooling is reproducible.

## 3. Weaknesses and risks
| # | Issue | Type |
|---|---|---|
| E1 | 2-player games: scarce, uncontested supply gives cap pricing and early snowballing (63% blowouts) | [Measured] |
| E2 | Spoilage risk is near zero, so freshness only adjusts price, and "race the rot" is weak | [Measured] |
| E3 | Juice Press and Shop Bell are inert. Hypothesis: the Juice Press is weak because nothing spoils; the Shop Bell is weak because favours are worth little | [Measured, cause hypothesised] |
| E4 | Mango is the most profitable fruit (+17% over blueberry, +53% over apple). Apple is clearly the worst "safe" pick | [Measured] |
| E5 | Bargain Hunter, Charmer and Nest Egg are slightly strong; Big Basket and Haggler slightly weak | [Measured] |
| E6 | With Hard in the mirror, comebacks from last place fell from about 28% (earlier AI) to 19% in 3-player | [Measured] |
| E7 | The daily challenge includes one Hard rival: likely too hard for casual players | [Hypothesis] |
| E8 | Humans may play very differently, e.g. the Juice Press loop (buy $1 old fruit, juice it for $2), or pricing always $1 under the cap | [Hypothesis] |

## 4. Root causes
- **E1, E2:** demand and supply scale with buy capacity. With 2 players, fruit sells in 1–2 days, so the oldest positions on the track are rarely reached.
- **E4:** the mango customer price shift (+2) is larger than the cost of the unripe wait.
- **E6:** the Hard tuning rewards aggressive buying and undercutting, which accelerates the leader.

## 5. Proposed changes

Each change is a hypothesis. Every one needs the simulator protocol below and a `RULES_VERSION` bump if it ships online.

| ID | Change | Files | Target metric | Priority |
|---|---|---|---|---|
| EC1 | 2-player scaling: supply × 1.15 or demand × 0.9 when n = 2; test both | `game.ts` (`demandScale`, `supplyScale`) | 2-player blowouts ≤50%, sales near max ≤40%, 3-/4-player unchanged ±2 | P1 |
| EC2 | Freshness stakes: one option is steeper oldest-position price drops (e.g. blueberry [5,2,0], watermelon [4,1,1,0,0]); another is a "fresh bonus" of +$1 on the freshest position | `data.ts` (`drop`), `game.ts` (`capAt`) | Spoiled 1–3 per player per game (3-player), dead days ≤0.05, fruit profit spread ≤25% | P1 |
| EC3 | Redesign the inert upgrades:<br>• Juice Press → "sell up to 3 not-so-fresh fruit at full price each day"<br>• Shop Bell → "+1 favour draw when you serve a waiting customer"<br>Then re-measure | `data.ts`, `game.ts` (`ageShop`, `resolve`) | Banning either changes win rate by ≥3 points, while no upgrade's ban is worse than −10 | P2 |
| EC4 | Mango: customer price shift +2 → +1 (or unripe cost $2 → $3) | `data.ts` (`PRICE_SHIFT`) | Profit-per-fruit spread ≤25% between best and worst | P2 |
| EC5 | Trait trims: Bargain Hunter (first fruit $1 off → only on fruit costing $3+), Charmer 3 → 2 starting cards, Nest Egg $16 → $15; Big Basket also +1 shelf | `data.ts`, `game.ts` | All traits within 30–37% | P2 |
| EC6 | Daily roster: replace the Hard rival with Normal, or keep it with a "Hard daily" variant on weekends (an A/B decision) | `src/engine/daily.ts` | Daily completion and return in telemetry | P1 (decision after the first playtest) |
| EC7 | Catch-up (only if EC1 isn't enough): the last-place shop gets the Priority effect, or a $2 stipend, on days 5–8 | `game.ts` (`startDay`) | 3-player comebacks ≥25% without raising ties above 3% | P3 |

## 6. Simulator protocol (mandatory for every economy change)
1. Run `npm run balance` on the current commit and save the JSON-lines output (B-20).
2. Apply the change behind a local constant. The script already supports in-process tweaks, e.g. `tweak(...)` in `scripts/balance.ts`.
3. Re-run with the same seeds (1..400).
4. Diff the key metrics with `scripts/balance-diff.mjs` (B-21). It outputs a table of baseline, candidate and delta.
5. Accept only if the targets are met and no guard metric regresses beyond tolerance:
   - seat fairness ±3
   - dead days ≤0.05
   - trait range ≤10 points
6. Unit tests updated. Determinism test green.
7. Bump `RULES_VERSION` and the save version. Freeze the new rules for future daily seeds.
8. Validate with humans in the next playtest round before release.

## 7. Acceptance criteria and verification
- `docs/studio/balance/` holds the baseline, each candidate's output and the diff tables.
- No economy change merges without them.
- AI fairness test: assert `ai.ts` reads no hidden state. A unit test runs `planBids` on a state with rival bids filled vs `null` and expects identical output (B-22).
