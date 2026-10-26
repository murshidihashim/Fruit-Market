# 02 · Game Design Review

Departments: **Game Director** and **Lead Game Designer**. Economy and balance numbers are covered in detail in `07-ECONOMY-BALANCE.md`.

---

## Game Director: vision, identity, pillars

### 1. Current implementation and evidence
- **Fantasy:** run a market stall, read the crowd, and outfox rivals in sealed-bid price battles before your stock rots.
- **Day loop** (`src/engine/game.ts`):
  - morning event
  - buying in turn order (the poorest shop buys first)
  - secret per-customer prices
  - showdown: cheapest offer sells first, ties go to the fresher fruit
  - evening upgrade draft
  - night: all fruit ages one step
- **Characters:**
  - 24 customers with titles and quirks (`src/engine/data.ts`: `CUSTOMER_LOOKS`)
  - 7 rivals with lines for reacting to undercuts, full-price sales, stings and losses (`RIVALS`)
- **Visual identity:** Mediterranean pixel tabletop, with the market in the middle and stalls around it (`src/ui/table.tsx`).

### 2. Strengths to preserve
- **The sealed-bid showdown.** It's a genuinely uncommon mobile mechanic, and the reveal is dramatised (`Showdown` in `src/ui/Game.tsx:672`; explanations from `src/engine/story.ts`).
- **Perishable inventory as a clock.** It creates urgency without real-time pressure.
- **Short sessions:** about 10 minutes per 10-day game.
- **Characterful rivals and customers.**

### 3. Weaknesses and risks
- **[Measured] The "rot" fantasy isn't felt.** Almost nothing spoils (0.1–0.7 per player per game), so the core tension promised in the tagline ("before it all goes bad") is mostly flavour.
- **[Hypothesis] Too many systems for new players.** Traits, the upgrade draft, favours, events, unripe fruit and poorest-first order may overload them. The tutorial explains steps but not *strategy*.
- **[Measured] 2-player matches feel decided early:** the day-5 leader wins 65.5% of the time.

### 4. Root causes
- Spoilage risk is low because buy limits and high demand mean stock sells within 1–2 days (demand served is only 61–69%, so supply is scarce).
- Feature growth came in iterations without a written set of design pillars.

### 5. Proposed improvements
- **[Enhancement, P1] Write down 4 design pillars** in `RULES.md` and use them to accept or reject features:
  1. Read the market.
  2. Price in secret.
  3. Race the rot.
  4. Ten-minute duels.
- **[P1] Restore "race the rot"** through the economy pass (07: spoilage proposals). It must be simulator-gated.
- **[P2] Progressive disclosure of systems:**
  - The first game uses classic rules: no traits, no draft, unripe fruit off.
  - The Market League introduces one system per stage.
  - Files: `src/ui/progress.ts` (`LEAGUE`, `leagueConfig`), `src/ui/App.tsx` (setup defaults).

### 6. Priority, effort, dependencies
- Pillars: P1, effort S, no dependencies.
- Rot restoration: P1, effort M, depends on the economy simulations (B-20).
- Progressive disclosure: P2, effort M, depends on the M2 panel split.

### 7. Acceptance criteria and verification
- `RULES.md` contains the pillars, and every roadmap item cites one.
- Spoilage reaches 1–3 fruit per player per game in 3-player Hard simulations, with no rise in dead days (`npm run balance`).
- In playtests, at least 70% of first-time players can explain why they lost a sale.

---

## Lead Game Designer: loop, pacing, decisions, comebacks, replayability

### 1. Current implementation and evidence
- **Pacing:** income per player rises from about $6 on day 1 to about $29 on day 10 (2-player). Dead days are about 0.03 per game.
- **Comeback mechanisms:** poorest buys first; Haggler trait (wins ties against richer shops); Priority favour.
  - Poorest-first cuts 3-player blowouts from 63% to 46% and raises comebacks from 12.5% to 19% (`exp-current` vs `exp-old order`).
- **Decision points per day:**
  - what to buy, and how fresh (up to 4–5 fruit)
  - price and quantity per customer
  - which upgrade from 3 offered, or none
  - when to play favour cards
- **Replayability:**
  - 3 of 6 traits offered at the start
  - 3 of 6 upgrades offered each evening
  - 13 events, 20 farmer cards, 24 customers
  - game lengths of 8, 10 or 14 days
  - modes: solo, pass-and-play, online, quick match, a 6-stage league, the daily challenge

### 2. Strengths to preserve
- **Poorest-first order:** measured fair and effective.
- **Events announced a day ahead:** they create planning decisions rather than pure luck.
- **The upgrade draft:** no single upgrade is mandatory any more ("never cart" still wins 30.8%).
- **Short, readable days.**

### 3. Weaknesses and risks
- **[Measured] 2-player games:**
  - 63% blowouts
  - customers pay near their maximum in 51% of sales
  - only 5.9% of sales happen in price wars
  - The price decision is often trivial: price at the cap.
- **[Measured] Single-upgrade rushes on day 1 are traps** (13–26% win rate), because starting cash is $10. This is a hidden-information pitfall for new players.
- **[Measured] Two upgrades are inert.** Juice Press and Shop Bell are bought often but don't change win rates.
- **[Hypothesis] Late-game decisions narrow:** income plateaus from day 7 to 10 (28.3 → 29.3 in 2-player). The last days may feel repetitive except on the final-day "sell everything" turn.
- **[Hypothesis] Pass-and-play hand-offs between every player** may drag in 4-player games.

### 4. Root causes
- Demand and supply scaling (`src/engine/game.ts:202`, `demandScale`; `:207`, `supplyScale`) is calibrated per *buy capacity*. In 2-player games total capacity is small, so few overlapping offers happen.
- The cheapest-wins rule plus scarce supply means undercutting rarely pays.

### 5. Proposed improvements (all simulator-gated; see 07)
- **[P1] 2-player market tuning:** raise supply relative to demand, or add an "overlap" mechanic in which some walk-in customers want the same fruit at once, so prices are contested more often.
  - Files: `src/engine/game.ts` (`demandScale`, `supplyScale`, `customersArrive`).
  - Target: 2-player blowouts at or below 50%; sales near the customer's maximum at or below 40%.
- **[P1] A late-game spice:** the final 3 days already have "finale" UI. Consider a last-day "closing sale" event, or a rising customer price cap to keep decisions live.
  - Files: `src/engine/data.ts` (events), `src/engine/game.ts` (`startDay`). Simulate before adopting.
- **[P2] Strategy hints instead of rule hints:** e.g. "No rival has apples: price at the cap" (already partly in `PricePanel`), and "Rushing an upgrade on day 1 leaves you no cash to buy".
  - Files: `src/ui/tutorial.ts`, `src/ui/panel.tsx`.
- **[P2] Fewer pass-and-play hand-offs:** batch all human secret prices behind one hand-off per player. This is already the case for prices; also allow "auto-continue" for the evening.

### 6. Priority, effort, dependencies
- 2-player tuning: P1, effort S (code) and M (simulation plus playtest). Needs the B-20 baseline.
- Late-game spice: P2, effort M. Needs playtest evidence that late days drag.
- Strategy hints: P2, effort S.

### 7. Acceptance criteria and verification
- A balance report comparison (`scripts/balance.ts`, saved as JSON before and after) meets the targets above.
- The 3- and 4-player metrics don't regress by more than 2 points.
- Determinism tests still pass (`tests/engine.test.ts`).
- `RULES_VERSION` is bumped if online rules change.
- Playtest survey: "did your pricing decision matter today?" gets at least 60% "often" or "always".
