# Rules version 18: what the computer games show (PLAN-079)

Run of 12 November 2026 (Asia/Kuala_Lumpur).

- **Before** is rules version 17, the engine at commit `e2400a2`.
- **After** is rules version 18 as built, the engine at commit `aa5f087` (the build commit of PLAN-079).

Both were played by the same scripts, on the same seeds, for the same number of games, so the tables can be read side by side.

Size of the run: about 56,000 whole games in batches, about 25,000 focal-seat games on the final build, and the event tests (100 to 300 positions for each of the 20 events, each replayed with the event and with a calm day).

**These are computer games only. No person played.** Nothing here is a readiness claim. Section 13 lists what computers cannot show.

## Summary

| Question | Answer | Numbers |
|---|---|---|
| Is every shopkeeper within 4 points of a fair share? | **Nearly.** 44 of the 48 results are (28 of 48 before). The 4 that are not are each within one standard error of the line. | Largest distance from fair: 2 stalls 8.6 to **4.5**; 3 stalls 10.4 to **3.3**; 4 stalls 8.6 to **4.0**; 6 stalls 6.9 to **4.6**; 3 Hard 9.3 to **3.9**; 4 Hard 8.3 to **4.2** |
| Which miss? | The Charmer at 2 and 6 stalls. At Hard with 4 stalls, the Bargain Hunter and Nest Egg. | Charmer +4.5 and +4.6; Bargain Hunter +4.2; Nest Egg -4.0 |
| What one number would fix it? | **Charmer starts with 3 favour cards** (now 4). Tested, not built. Nest Egg at $16 was also tested and gains only about 1 point: leave it. | Section 11 |
| Standing orders: should the stake change size? | **No.** Bidding carefully is worth a little, bidding wildly costs a lot, at every stake tried. One thing to know: about half of mango orders now find no bidder. | Section 4 |
| +1 apple on five lorries | **Not kept.** It moves supply towards demand but does not reach it, and it did not help the shopkeepers. | Section 3 |
| A guest joins a full row | **Kept.** | 6 stalls: guest events go from -$0.6 to -$2.0 a stall to +$1.5 to +$2.8 |
| Blueberry Glut also makes blueberries $1 cheaper | **Kept.** | The day goes from -$0.50 to +$0.05 a stall at 3 stalls |
| Favoured Trade after the flip | The step comes up on 1 to 2.4 days a game. Asked stalls play the card about 1 time in 5. A copy is now worth about $3 (was $0.39). It is one of the three good favours, not the strongest. | Section 10 |
| Can a stall still be stuck with no cash and no fruit? | **No.** | 2.1 to 13.2% of games before, 0% now. A top-up is paid in 1.1 to 5.4% of games |
| Are games closer? | **A little.** | Games won by $20 or more: 45 to 55% before, 39 to 53% now |

Things to decide or watch, in section 12: the Ripening Room is the strongest upgrade and most computers build it; mango is still the best earner; Free Fruit is the strongest favour; Mango Windfall still costs money on the day; a Hard computer now beats Normal computers more often than before.

## 1. How this was measured

- **Batches.** All-computer games of 10 days. Each game gives every stall a different shopkeeper at random. "Normal" means every stall is a Normal computer; "Hard" means every stall is a Hard computer.
- **Win rate.** The share of the games a shopkeeper sat in that it won. A shared win counts as a share of a win. **Fair** is 100 divided by the number of stalls.
- **SE** is the standard error: results within about two SEs of each other are not clearly different.
- **Focal-seat test.** One seat follows a fixed rule (for example "never builds"); the others play as built. Every row replays the same seeds, so rows are compared game by game ("paired").
- **Event test.** The same position is played once with the event and once with a calm day.
- **Variants.** A "what if" changes one number at run time (`scripts18/patches.ts`), or runs a copy of the source with one constant edited. None of the variants is in the built game.

| Batch | Stalls | Level | Games before | Games after |
|---|---|---|---|---|
| 2 stalls | 2 | Normal | 3,600 | 3,600 |
| 3 stalls | 3 | Normal | 2,800 | 2,800 |
| 4 stalls | 4 | Normal | 2,000 | 2,000 |
| 6 stalls | 6 | Normal | 1,300 | 1,300 |
| 3 Hard | 3 | Hard | 1,600 | 1,600 |
| 4 Hard | 4 | Hard | 1,200 | 1,200 |

## 2. Shopkeepers, before and after

Win % and, in brackets, the distance from a fair share. Bold is more than 4 points out.

| Shopkeeper | 2 stalls: before | after | 3 stalls: before | after | 4 stalls: before | after | 6 stalls: before | after | 3 Hard: before | after | 4 Hard: before | after |
|---|---|---|---|---|---|---|---|---|---|---|---|---|
| Haggler | 41.4 (**-8.6**) | 47.8 (-2.2) | 23.0 (**-10.4**) | 31.4 (-1.9) | 18.5 (**-6.5**) | 24.5 (-0.5) | 10.8 (**-5.9**) | 17.0 (+0.4) | 32.2 (-1.1) | 32.0 (-1.4) | 24.5 (-0.5) | 25.1 (+0.1) |
| Big Basket | 51.8 (+1.8) | 50.2 (+0.2) | 31.8 (-1.5) | 33.5 (+0.1) | 23.0 (-2.0) | 24.7 (-0.3) | 14.4 (-2.3) | 13.0 (-3.7) | 31.2 (-2.1) | 32.6 (-0.8) | 25.0 (0.0) | 23.9 (-1.1) |
| Bargain Hunter | 54.0 (+4.0) | 50.0 (0.0) | 38.1 (**+4.7**) | 34.4 (+1.1) | 25.5 (+0.5) | 24.0 (-1.0) | 20.6 (+3.9) | 19.2 (+2.5) | 33.2 (-0.1) | 35.0 (+1.7) | 26.4 (+1.4) | 29.2 (**+4.2**) |
| Charmer | 47.8 (-2.2) | 54.5 (**+4.5**) | 35.2 (+1.9) | 35.9 (+2.6) | 29.1 (**+4.1**) | 29.0 (+4.0) | 17.2 (+0.5) | 21.3 (**+4.6**) | 37.3 (+3.9) | 36.8 (+3.4) | 24.5 (-0.5) | 27.0 (+2.0) |
| Tip Jar | 45.1 (**-4.9**) | 50.6 (+0.6) | 27.5 (**-5.8**) | 32.4 (-0.9) | 17.8 (**-7.2**) | 24.1 (-0.9) | 10.3 (**-6.3**) | 14.4 (-2.3) | 24.1 (**-9.3**) | 33.4 (+0.1) | 16.7 (**-8.3**) | 25.2 (+0.2) |
| Nest Egg | 57.1 (**+7.1**) | 48.7 (-1.3) | 39.8 (**+6.5**) | 30.0 (-3.3) | 33.6 (**+8.6**) | 23.8 (-1.2) | 23.6 (**+6.9**) | 18.1 (+1.4) | 37.7 (**+4.4**) | 29.4 (-3.9) | 29.1 (**+4.1**) | 21.0 (**-4.0**) |
| Shade Cloth | 53.2 (+3.2) | 49.3 (-0.7) | 39.9 (**+6.6**) | 35.0 (+1.7) | 26.4 (+1.4) | 26.4 (+1.4) | 17.6 (+0.9) | 14.2 (-2.4) | 37.8 (**+4.4**) | 31.0 (-2.3) | 28.1 (+3.1) | 25.7 (+0.7) |
| Sharp Ears | 49.0 (-1.0) | 48.9 (-1.1) | 31.5 (-1.8) | 34.1 (+0.8) | 26.3 (+1.3) | 23.7 (-1.4) | 18.8 (+2.1) | 16.2 (-0.5) | 33.2 (-0.2) | 36.5 (+3.1) | 25.8 (+0.8) | 22.9 (-2.1) |
| **Largest distance from fair** | 8.6 | **4.5** | 10.4 | **3.3** | 8.6 | **4.0** | 6.9 | **4.6** | 9.3 | **3.9** | 8.3 | **4.2** |
| Shopkeepers more than 4 points out | 3 | 1 | 5 | 0 | 4 | 0 | 3 | 1 | 3 | 0 | 2 | 2 |
| Fair share | 50.0 | 50.0 | 33.3 | 33.3 | 25.0 | 25.0 | 16.7 | 16.7 | 33.3 | 33.3 | 25.0 | 25.0 |
| Games | 3,600 | 3,600 | 2,800 | 2,800 | 2,000 | 2,000 | 1,300 | 1,300 | 1,600 | 1,600 | 1,200 | 1,200 |
| Seats for each shopkeeper (about) | 900 | 900 | 1,050 | 1,050 | 1,000 | 1,000 | 975 | 975 | 600 | 600 | 600 | 600 |
| SE of one win rate (about) | 1.7 | 1.7 | 1.4 | 1.5 | 1.4 | 1.4 | 1.2 | 1.2 | 1.9 | 1.9 | 1.8 | 1.8 |

Final cash of the shopkeeper's seat less the table's average, after (rules 18):

| Shopkeeper | 2 stalls | 3 stalls | 4 stalls | 6 stalls | 3 Hard | 4 Hard |
|---|---|---|---|---|---|---|
| Haggler | -1.4 | -1.6 | -0.5 | +0.9 | -1.4 | -1.9 |
| Big Basket | -0.9 | -1.9 | -1.6 | -6.1 | -1.4 | -2.1 |
| Bargain Hunter | +1.1 | +1.0 | +1.0 | +2.6 | +1.6 | +3.3 |
| Charmer | +2.0 | +2.2 | +3.2 | +4.8 | +2.5 | +3.3 |
| Tip Jar | -0.5 | -0.5 | -1.1 | -1.9 | +0.2 | +0.7 |
| Nest Egg | +0.2 | -0.1 | -0.6 | +1.3 | -1.5 | -3.3 |
| Shade Cloth | +0.5 | +0.8 | +0.8 | -0.4 | -0.2 | +1.0 |
| Sharp Ears | -0.9 | +0.2 | -1.2 | -1.1 | +0.1 | -1.1 |

What moved, and why:

- **Haggler** (-5.9 to -10.4 before, at Normal): fixed by the computer, not the card. A Normal computer no longer prices as if it held the tie-break.
- **Tip Jar** (-4.9 to -9.3): fixed by the new tip. It now earns $7 to $10 a game (before $0.60 to $2.40).
- **Nest Egg** (+4.1 to +8.6): $15 took it from strong to slightly weak (-4.0 to +1.4).
- **Charmer** went up at 2 and 6 stalls. The likely reason is that its cards are worth more under rules 18: a Favoured Trade is worth about $3 (before $0.39) and a Free Fruit $4.92 (before $3.18). See section 10.
- **Sharp Ears** earns about $9 a game at 3 stalls (before $4.20) and is within 3.1 points everywhere.

## 3. The "simulate first" items

### A guest joins a full row: kept

Net income per stall on the day, against a calm day (100 positions each, SE 0.13 to 0.28):

| Event | 6 stalls: guest left out | 6 stalls: guest joins | 5 stalls: guest left out | 5 stalls: guest joins |
|---|---|---|---|---|
| Superfood Trend | -1.01 | **+2.36** | -0.74 | **+2.52** |
| Mango Craze | -0.59 | **+2.78** | -0.52 | **+2.98** |
| Hotel Order | -1.10 | **+2.16** | -0.65 | **+2.28** |
| Kenduri | -1.39 | **+1.92** | -1.04 | **+2.22** |
| Bake-Off | -2.01 | **+1.54** | -1.67 | **+1.74** |

Under the old rule a guest pushed a regular customer out of a full row, so a "good" event cost every stall money at 5 and 6 stalls. With the guest added on top, the five events are worth $1.50 to $3 a stall, as they are at smaller tables.

Tourist Bus still does nothing at 5 and 6 stalls ($0.00): its extra walk-ins are not guests, and the row is already full. Not in the brief, so not changed.

### Blueberry Glut makes blueberries $1 cheaper at the market: kept

| Table | Card as in rules 17 | With the cheaper market price |
|---|---|---|
| 3 stalls (300 positions) | net -$0.50 a stall (SE 0.07); blueberries bought -0.06 | net **+$0.05** (SE 0.06); blueberries bought +0.27 |
| 4 stalls (200 positions) | net -$0.41 (SE 0.06); bought -0.13 | net **+$0.03** (SE 0.06); bought +0.41 |

The old card only cut what customers paid, so the day was a small loss for everyone. Now the day is even, and stalls buy the extra blueberries.

### +1 apple on five lorries (3 to 6 stalls): not kept

Tested on Blueberry Bonanza, Mango Rush, Tropical Pair, Short Load and Summer Run. Same seeds with and without.

| Measure | 3 stalls: without | with | 4 stalls: without | with | 6 stalls: without | with |
|---|---|---|---|---|---|---|
| Games | 2,800 | 2,800 | 2,000 | 2,000 | 1,300 | 1,300 |
| Apples delivered a game | 22.7 | 24.9 | 30.7 | 32.8 | 49.0 | 51.2 |
| Apples customers wanted a game | 30.7 | 30.7 | 38.1 | 38.1 | 59.1 | 59.1 |
| Supply divided by demand | 0.74 | **0.81** | 0.81 | **0.86** | 0.83 | **0.87** |
| Apple demand in the row that was served | 58.5% | 63.2% | 62.1% | 65.9% | 61.4% | 63.5% |
| Largest shopkeeper distance from fair | 3.3 | 3.1 | 4.0 | **6.2** | 4.6 | **5.1** |
| Games won by $20 or more | 43.9% | 44.0% | 41.1% | 39.9% | 39.4% | 39.5% |

The test in the brief was: keep it only if apple supply reaches about 1.0 of demand without making the shopkeeper spread or the blowouts worse.

- Supply moves towards demand but stops at 0.81 to 0.87 in play. (Counting cards only, the earlier study put it at about 1.0. In play, events and guests add apple customers.)
- Blowouts do not change.
- The shopkeeper spread is not better and is worse at 4 and 6 stalls (the Charmer rises to +6.2 and +5.1). The differences are inside the noise, but an earlier run on this branch pointed the same way (largest distance 6.5 to 8.9 at 3 stalls, 4.5 to 4.5 at 4, 4.2 to 5.3 at 6).

So the condition is not met and the apples are **not in the build**. The change is small either way. To switch it on later, the rows are listed in `scripts18/patches.ts` under `apples`.

### The stake

See section 4. Verdict: **keep the size as approved.**

## 4. Standing orders under the stake

### What happens to orders now

All stalls Normal unless marked. "Before" is rules 17 at 3 stalls.

| Measure | 3 stalls before | 2 stalls | 3 stalls | 4 stalls | 6 stalls | 3 Hard | 4 Hard |
|---|---|---|---|---|---|---|---|
| Orders with no bidder | 9.1% | 24.3% | 15.8% | 16.5% | 12.7% | 18.0% | 20.2% |
| Mango orders with no bidder | 17.6% | 54.0% | 41.5% | 53.4% | 46.0% | 46.1% | 57.1% |
| Bidders for each order | 2.54 | 1.28 | 2.00 | 2.50 | 3.37 | 1.98 | 2.42 |
| Winning bid | $8.72 | $8.51 | $8.50 | $8.13 | $8.12 | $7.39 | $7.07 |
| Winning bid as a share of the ceiling | 69.5% | 71.2% | 70.3% | 68.9% | 68.2% | 60.9% | 59.6% |
| Delivered in full | 79.9% | 83.9% | 83.4% | 75.6% | 69.5% | 85.4% | 80.9% |
| Mango orders delivered in full | 64.0% | 74.1% | 67.1% | 49.6% | 38.4% | 72.1% | 56.1% |
| Delivered nothing | 4.9% | 1.5% | 2.6% | 3.7% | 3.6% | 2.7% | 3.4% |
| Stake lost: orders held and not delivered in full | (fines) | 16.1% | 16.6% | 24.4% | 30.5% | 14.6% | 19.1% |
| Stake lost for each order held (before: fine paid) | $2.30 | $1.29 | $1.40 | $1.94 | $2.40 | $1.17 | $1.51 |
| Stake lost for each mango order held | $6.08 | $3.03 | $3.80 | $5.63 | $6.75 | $3.14 | $4.81 |
| Paid for each piece delivered (with the Order Book's $2) | $8.72 | $9.55 | $9.47 | $9.35 | $9.39 | $8.55 | $8.43 |
| Share of stalls that bid on an order | 84.7% | 64.1% | 66.5% | 62.4% | 56.2% | 66.1% | 60.6% |
| Holder's cash gain over the order's three days, less the average rival's | $7.97 | $5.95 | $6.35 | $9.70 | $14.79 | $5.28 | $7.75 |

The last row flatters orders: holders choose themselves (they bid lowest because they are best placed). The forced test below is the fair measure.

- Fewer stalls bid, because a bidder must hold the stake in cash.
- Holders deliver in full a little more often than before (83.4% against 79.9% at 3 stalls) and lose less ($1.40 an order against $2.30 in fines).
- **Mango orders are the weak spot.** About half find no bidder (17.6% before). A mango order has to be paid for twice on the same day: the $12 stake and the green mangoes, which must be bought that day to be ripe in time. That is about $24 in hand at 3 stalls, $28 at 4 and $32 at 5 or 6. At 6 stalls only 38% are delivered in full, the same as before.

### Is bidding worth it? (the holder's gain against always passing)

One seat follows the rule in the row; the others play as built. Change in that seat's final cash against the first row, paired.

| Focal seat | 3 stalls | 4 stalls | 3 Hard | 4 Hard |
|---|---|---|---|---|
| Games in each row | 600 | 400 | 400 | 300 |
| Bids as the computer does | 0 | 0 | 0 | 0 |
| Always passes | -$0.74 (SE 0.65) | -$0.64 (0.73) | -$0.43 (0.85) | -$1.03 (0.79) |
| Always bids the ceiling | +$0.88 (0.73) | -$1.07 (0.94) | +$2.56 (1.01) | -$1.57 (1.28) |
| Always bids 60% of the ceiling | -$6.55 (0.92) | -$4.06 (1.27) | -$2.49 (1.02) | -$5.49 (1.25) |
| Always bids half the ceiling | -$10.41 (0.95) | -$8.43 (1.29) | -$5.83 (1.19) | -$7.76 (1.44) |
| Always bids $1 | -$29.84 (1.02) | -$31.27 (1.40) | -$26.32 (1.38) | -$32.47 (1.72) |
| Orders held a game when bidding as the computer does | 0.59 | 0.45 | 0.56 | 0.44 |

- Bidding as the computer does is worth about **$0.40 to $1.00 a game** over never bidding (rules 17: $1.37, SE 0.67). The gain is inside the noise at each table, but it points the same way at all of them: an order is a small plus for a careful bidder, not a trap and not a must.
- **Wild low bids are punished hard**: always bidding $1 costs about $30 a game. The stake does the job the fine used to do.
- Hard computers bid orders down to about 60% of the ceiling (Normal: 70%), where winning is hardly worth it. At 3 stalls a seat that only ever bids the ceiling does better than the Hard computer's own bid (+$2.56, SE 1.01); at 4 stalls it does not. That is the computer's bidding, not the rule.

### Would a different stake be better?

3 stalls, Normal. The built stake is blueberry 6, watermelon 8, apple 7, mango 12.

| Stake | Orders with no bidder | Mango orders with no bidder | Delivered in full | Stake lost for each order held | Always passing against bidding (600 games a row) | Largest shopkeeper distance (1,200 games) | Games won by $20 or more |
|---|---|---|---|---|---|---|---|
| Lower: 4 / 6 / 5 / 9 | 13.2% | 34.2% | 84.2% | $0.99 | -$1.40 (SE 0.64) | 4.4 | 42.4% |
| **Built: 6 / 8 / 7 / 12** | 15.8% | 41.5% | 83.4% | $1.40 | -$0.74 (SE 0.65) | 3.3 (2,800 games) | 43.9% |
| Higher: 9 / 12 / 10 / 18 | 21.1% | 54.5% | 81.9% | $2.20 | -$1.52 (SE 0.61) | 4.2 | 43.8% |

Only the mango stake lowered to $9:

| Table | Mango orders with no bidder | Mango orders delivered in full | Stake lost for each mango order held |
|---|---|---|---|
| 4 stalls: built ($12), 2,000 games | 53.4% | 49.6% | $5.63 |
| 4 stalls: mango stake $9, 1,000 games | 46.0% | 52.6% | $4.00 |
| 6 stalls: built ($12), 1,300 games | 46.0% | 38.4% | $6.75 |
| 6 stalls: mango stake $9, 600 games | 39.9% | 40.9% | $4.86 |

**Verdict: the stake does not need to change size.** A lower or a higher stake changes how many orders find a bidder, and by how much a failed order hurts. It does not change whether bidding is worth it (all three are inside the noise of each other), the shopkeepers or the blowouts.

If the owner wants mango orders taken more often, **mango stake $9** is the one-number change. Its effect is small (53% to 46% unbid at 4 stalls). The bigger reason mango orders go unbid is the cost of the mangoes on the same day, not the stake.

## 5. Upgrades against never building

3 stalls, 10 days. The focal seat builds only the named upgrade, on the first night it can. Change in its final cash against never building, paired.

| Focal seat | Before (rules 17), Normal | After, Normal (500 games a row) | After, Hard (400 games a row) |
|---|---|---|---|
| Juice Bar | $4: +$6.12 (SE 0.56) | $6: **+$2.81** (0.68) | **+$4.11** (0.93) |
| Handcart | $6: +$0.02 (0.70) | $6: **-$2.02** (0.77) | **+$1.46** (0.93) |
| Premium Display | $6: +$4.65 (0.70) | $5: **+$2.33** (0.72) | **+$2.35** (0.83) |
| Ripening Room | $6: -$3.82 (0.88) | $4: **+$4.13** (0.95) | **+$3.29** (1.08) |
| Order Book | $5: -$4.05 (0.62) | $3: **+$2.00** (0.67) | **+$1.40** (0.70) |
| The computer chooses | -$1.19 (0.76) | **+$4.82** (0.81) | **+$4.49** (0.99) |
| Best less worst | $10.17 | $6.15 | $2.71 |

At 6 stalls (Normal, 300 games a row): Ripening Room +$4.93 (SE 1.57), Order Book +$3.37 (SE 1.10). A stall that never builds wins 9.7% of 6-stall games against a fair 16.7%.

- **Four of the five upgrades now pay for themselves** at Normal and all five at Hard. The computer's own choice is now better than never building (+$4.82; it was -$1.19).
- **The Handcart loses money for a Normal computer** (-$2.02) and Normal computers no longer build it at all. A Hard computer gains a little from it (+$1.46). The card was not in the brief except to stay at $6.
- **The Ripening Room is the strongest upgrade.** What it is worth depends on the rivals: in earlier runs on this branch it was worth +$7.67 (SE 1.06) when rivals rarely had one and +$2.67 (SE 1.03) when they did. The computer's choice takes this into account (it values an upgrade less for each rival that already has it). Even so, most computers build it.

What the computers built (share of stalls):

| Upgrade | 3 stalls before | 2 stalls | 3 stalls | 4 stalls | 6 stalls | 3 Hard | 4 Hard |
|---|---|---|---|---|---|---|---|
| Ripening Room | 61.6% | 90.4% | 75.1% | 64.4% | 50.4% | 71.4% | 60.1% |
| Order Book | 22.1% | 36.0% | 26.6% | 22.6% | 16.2% | 28.2% | 23.0% |
| Premium Display | 6.7% | 14.3% | 21.5% | 20.1% | 16.5% | 0.7% | 2.4% |
| Juice Bar | 17.0% | 11.6% | 13.7% | 17.0% | 17.4% | 18.6% | 21.1% |
| Handcart | 66.4% | 0% | 0% | 0% | 0% | 0% | 0.3% |
| Stalls ending with 0 / 1 / 2 upgrades | 3 / 20 / 77% | 3 / 42 / 55% | 6 / 52 / 42% | 8 / 59 / 32% | 15 / 69 / 16% | 7 / 66 / 26% | 11 / 71 / 18% |

Computers build fewer upgrades than before: they now build only what is worth more than it costs and keep $6 back for fruit.

In the batches, stalls with an Order Book win far more often than stalls without (44.9% against 29.1% at 3 stalls, 37.8% against 12.6% at 6). Most of that is who builds it: a computer builds the Order Book when it already holds an order. The focal test above is the fair measure (+$2.00 at 3 stalls, +$3.37 at 6).

## 6. Fruit

Share of all profit, before to after:

| Fruit | 2 stalls | 3 stalls | 4 stalls | 6 stalls | 3 Hard | 4 Hard |
|---|---|---|---|---|---|---|
| Blueberry | 18.5 to 20.2% | 18.0 to 19.5% | 18.0 to 19.4% | 16.7 to 18.3% | 18.7 to 21.2% | 18.6 to 20.7% |
| Watermelon | 26.1 to 27.4% | 25.9 to 26.2% | 25.2 to 23.7% | 23.6 to 22.9% | 26.5 to 27.3% | 25.9 to 24.6% |
| Apple | 21.6 to 21.5% | 20.1 to 19.5% | 19.4 to 18.3% | 19.5 to 18.4% | 20.8 to 20.3% | 20.4 to 19.6% |
| Mango | 33.9 to **30.8%** | 36.0 to **34.8%** | 37.4 to **38.6%** | 40.1 to **40.4%** | 33.9 to **31.3%** | 35.1 to **35.2%** |

Profit for each piece bought, 3 stalls Normal, before to after: blueberry $2.39 to $2.54; watermelon $2.92 to $2.91; apple $2.58 to $2.51; **mango $4.10 to $3.98**.

- **The $4 green mango did less than hoped.** Mango is still the best earner by a wide margin. Its share of profit fell by 1 to 3 points at 2 and 3 stalls and did not move at 4 and 6.
- The main reason is the Ripening Room's new $1 discount. Most stalls build it, so the average price paid for a mango is $3.39 to $3.56, not $4 (it was $2.96).
- Mango customers are also served more often (52.8% to 67.3% of mango demand at 3 stalls), because nobody asks for a mango on days 1 and 2, when none is ripe.
- Blueberry is up a little everywhere (the three Bargain customers at $4).

## 7. Stuck stalls, top-ups and dead days

"Stuck" is a dawn with under $3 and no fruit at all. A "dead day" is a day with no purchase and no income.

| Measure | 2 stalls | 3 stalls | 4 stalls | 6 stalls | 3 Hard | 4 Hard |
|---|---|---|---|---|---|---|
| Games with a stuck stall, before | 2.1% | 3.6% | 7.4% | 13.2% | 2.7% | 6.0% |
| Games with a stuck stall, after | **0%** | **0%** | **0%** | **0%** | **0%** | **0%** |
| Dead days (share of stall-days), before | 3.87% | 5.54% | 5.83% | 6.62% | 5.40% | 5.49% |
| Dead days, after | 2.61% | 3.72% | 3.71% | 4.05% | 3.49% | 3.72% |
| Games with at least one dead day, before | 43.7% | 71.7% | 81.3% | 92.0% | 70.9% | 80.9% |
| Games with at least one dead day, after | 35.1% | 59.0% | 67.1% | 81.4% | 57.1% | 67.8% |
| Games in which a top-up was paid | 1.3% | 1.4% | 2.2% | 5.4% | 1.1% | 2.4% |
| Average top-up | $4.49 | $4.47 | $4.23 | $4.38 | $4.00 | $4.38 |
| Topped-up stalls that still finish last | 100% | 100% | 91% | 90% | 100% | 100% |
| Final cash of a topped-up stall (table average) | $29 ($95) | $25 ($92) | $19 ($90) | $17 ($90) | $23 ($100) | $19 ($98) |

- The top-up is rare, small, and never arrives before day 5 in these games. It costs the market about 2 to 4 cents a stall a game.
- It keeps a broken stall trading ($6 to $12 of income on each day left). It does not rescue it: the stall still finishes last 9 times in 10.
- Dead days fell by about a third. Half of the dead days left are stalls that had ripe fruit and sold none.

## 8. Events

Net income per stall on the day against a calm day, 3 stalls, 300 positions for each event, rules 18 as built:

| Event | Net a stall | SE | | Event | Net a stall | SE |
|---|---|---|---|---|---|---|
| Festival | +6.68 | 0.21 | | Heatwave | +0.87 | 0.09 |
| Tourist Bus | +5.18 | 0.29 | | Apple Blight | +0.30 | 0.12 |
| Mango Craze | +3.79 | 0.15 | | Durian Season | +0.28 | 0.08 |
| Hotel Order | +3.54 | 0.13 | | Blueberry Glut | +0.05 | 0.06 |
| Superfood Trend | +3.09 | 0.11 | | Health Inspector | -0.51 | 0.06 |
| Kenduri | +3.08 | 0.13 | | Price Controls | -0.88 | 0.08 |
| Bad Harvest | +2.75 | 0.13 | | Mango Windfall | -1.57 | 0.15 |
| Bake-Off | +2.49 | 0.12 | | Price Hike | -2.42 | 0.08 |
| Pasar Malam | +2.39 | 0.07 | | Good Harvest | -3.05 | 0.09 |
| Lorry Breakdown | +1.12 | 0.18 | | Monsoon Downpour | -3.88 | 0.18 |

- No event swings a game: the largest is Festival at +$6.68 a stall.
- The two event tests (guests in a full row, Blueberry Glut) are in section 3.
- **Mango Windfall still loses money on the day**: -$1.57 a stall at 3 stalls and -$1.43 at 4 (rules 17: -$2.33). The extra mangoes now arrive ripe and some are sold (+0.35 a stall), but the card also cuts $2 from every mango customer.
- The Health Inspector fines 16% of stalls, $2.98 on average when it does.

## 9. Game shape

| Measure | 2 stalls | 3 stalls | 4 stalls | 6 stalls | 3 Hard | 4 Hard |
|---|---|---|---|---|---|---|
| Won by $20 or more, before | 54.7% | 48.5% | 45.3% | 44.8% | 46.0% | 47.8% |
| Won by $20 or more, after | 52.7% | **43.9%** | **41.1%** | **39.4%** | **42.9%** | **39.8%** |
| SE of those | 0.8 | 0.9 | 1.1 | 1.4 | 1.2 | 1.4 |
| Leader after day 5 wins, before | 63.4% | 49.3% | 44.5% | 38.2% | 49.3% | 43.5% |
| Leader after day 5 wins, after | 64.9% | 50.4% | 44.3% | 36.8% | 49.3% | 41.0% |
| Last after day 5 wins, before | 36.4% | 23.7% | 13.2% | 5.6% | 25.4% | 14.1% |
| Last after day 5 wins, after | 35.0% | 23.4% | 14.5% | **8.7%** | 23.1% | 14.8% |
| Won by $3 or less, before | 9.8% | 10.5% | 11.8% | 13.5% | 10.1% | 10.8% |
| Won by $3 or less, after | 9.7% | 12.1% | 12.3% | 15.5% | 12.4% | 13.6% |
| Median winning margin, before to after | $22 to $21 | $19 to $17 | $18 to $16 | $17 to $15 | $18 to $16 | $19 to $15 |
| Lead changes a game, before to after | 1.74 to 2.15 | 2.78 to 3.19 | 3.51 to 3.87 | 4.37 to 4.60 | 2.69 to 2.92 | 3.32 to 3.70 |
| Average final cash, before to after | $92 to $95 | $86 to $92 | $83 to $90 | $80 to $90 | $91 to $100 | $86 to $98 |
| Winner's cash, after | $109 | $112 | $117 | $128 | $121 | $125 |
| Last stall's cash, before to after | $77 to $81 | $63 to $72 | $51 to $63 | $36 to $52 | $68 to $80 | $56 to $70 |
| Shared wins, after | 0.11% | 0.18% | 0.25% | 0.69% | 0.19% | 0% |

- Blowouts are down 2 to 8 points. Most of that is the last stall doing better (at 6 stalls it ends with $52, not $36).
- Who leads after day 5 wins as often as before. The game is a little closer, not more open.
- A comeback from last place at 6 stalls goes from 5.6% to 8.7%.
- A shared win is rare (under 1 game in 100).

## 10. Favoured Trade after the flip (item K)

How often the step happens:

| Measure | 2 stalls | 3 stalls | 4 stalls | 6 stalls | 3 Hard | 4 Hard |
|---|---|---|---|---|---|---|
| Days with the step, a game | 0.95 | 1.48 | 1.95 | 2.36 | 1.66 | 2.05 |
| Games with the step at least once | 36.9% | 47.9% | 59.7% | 60.6% | 49.8% | 60.8% |
| Stalls asked, a game | 0.98 | 1.53 | 2.03 | 2.41 | 1.73 | 2.12 |
| Card played when asked | 17.0% | 20.7% | 25.0% | 21.8% | 23.2% | 26.9% |
| Cards played a game | 0.17 | 0.32 | 0.51 | 0.52 | 0.40 | 0.57 |
| Favoured Trade cards still in hand at the end, a game | 0.40 | 0.39 | 0.37 | 0.29 | 0.33 | 0.32 |

- The step comes up on about 1 day in 10 at 2 stalls and 1 day in 4 at 6. On the other days it does not exist, so it adds no waiting.
- An asked computer plays the card about **1 time in 5** (1 in 4 at Hard). It plays when the card adds $2 or more to its income in today's rush ($1 or more on the last day); an Easy computer always plays. Most of the time a tie is on a price where winning it changes little, so the computer keeps the card for a better day.

What one free copy of each favour is worth (3 stalls, Normal, 700 games a row, change in final cash, paired):

| Free card | Before (rules 17) | After (rules 18) |
|---|---|---|
| Free Fruit | +$3.18 (SE 0.79) | **+$4.92** (0.88) |
| Fridge | +$4.55 (0.56) | **+$3.09** (0.51) |
| **Favoured Trade** | +$0.39 (0.41) | **+$2.98** (0.56) |
| Priority | -$0.91 (0.83) | +$0.99 (0.79) |
| Scout | -$0.19 (0.42) | +$0.24 (0.50) |
| Gossip | +$0.28 (0.53) | -$0.39 (0.45) |

- **Favoured Trade went from a card worth nothing to a card worth about $3.** Played blind, it was often wasted on a day with no tie. Now it is only spent when there is a tie to win.
- **It is not clearly the strongest favour.** Free Fruit is higher (+$4.92) and Fridge is level with it (+$3.09). The three are now the good cards; Priority, Scout and Gossip are worth about nothing to a computer (computers never play Scout and barely use Gossip, see section 13).

## 11. Where the 4-point target is missed

Four results of 48 are past the line. Each is within one standard error of it, so none is a clear miss on its own. One pattern is real, though, because it repeats at every table: the Charmer.

### The Charmer is a little strong

+4.5, +2.6, +4.0, +4.6 at 2, 3, 4 and 6 stalls; +3.4 and +2.0 at Hard. Above fair at every table.

**One-number change: the Charmer starts with 3 favour cards (now 4).** Tested on a copy of the build, same seeds:

| Table | Charmer now (4 cards) | Charmer with 3 cards | Largest distance, now | Largest distance, with 3 cards |
|---|---|---|---|---|
| 2 stalls (3,600 games) | +4.5 | **+2.6** | 4.5 | **2.6** |
| 3 stalls (2,800) | +2.6 | **+2.7** | 3.3 | **3.1** |
| 4 stalls (2,000) | +4.0 | **+1.0** | 4.0 | **1.8** |
| 6 stalls (1,300) | +4.6 | **-1.4** | 4.6 | **3.7** |

- With 3 cards **every shopkeeper is within 4 points at all four Normal tables.**
- The change is uneven: none at 3 stalls, 6 points at 6 stalls. Part of that is chance (each figure is known to about 1.5 points). Part is real: at 6 stalls a favour is rarely earned (0.32 a stall a game), so the starting hand is most of what the Charmer gets.
- Hard was not run with 3 cards.
- **For the owner to decide; not built.** The card would read "Start with 3 favour cards, hold up to 4, and earn up to 2 favour cards a day."

### Nest Egg is a little weak at Hard

-3.9 at 3 Hard and -4.0 at 4 Hard; -3.3 at 3 stalls Normal; within 1.4 of fair elsewhere.

**The one-number change tried: Nest Egg starts with $16 (now $15).** Tested on a copy of the build, same seeds:

| Table | Nest Egg now ($15) | Nest Egg with $16 | Largest distance, now | Largest distance, with $16 |
|---|---|---|---|---|
| 3 stalls (2,800 games) | -3.3 | -1.8 | 3.3 | 3.6 (Charmer) |
| 3 Hard (1,600) | -3.9 | -3.2 | 3.9 | 4.4 (Sharp Ears) |
| 4 Hard (1,200) | -4.0 | -3.2 | 4.2 | 3.5 (Bargain Hunter) |

A dollar lifts Nest Egg by about 1 point. That is inside the noise, and it does not bring the largest distance down in any steady way. **Suggested: leave Nest Egg at $15** and watch it in a playtest. ($18 was 4 to 9 points too strong under rules 17; $17 was not tested.)

### The Bargain Hunter at Hard with 4 stalls

+4.2 (SE 1.8). It is +1.7 at 3 Hard and between -1.0 and +2.5 at Normal. One result of six, about one standard error past the line: most likely chance. No change suggested.

### Big Basket at 6 stalls

-3.7 (inside the line), with the lowest cash of any shopkeeper there (-$6.10 against the table). Its extra piece is worth less where the lorry is shared six ways. Worth watching in a 6-stall playtest; no change suggested.

## 12. Things for the owner to decide or watch

| # | Finding | Numbers | A one-number change, if wanted |
|---|---|---|---|
| 1 | The Charmer is a little strong at every table. | +2.0 to +4.6 | Start with 3 favour cards (section 11) |
| 2 | Nest Egg is a little weak at Hard. | -3.9, -4.0 | $16 was tried and gains only about 1 point (section 11). Suggested: leave it |
| 3 | The Ripening Room is the strongest upgrade and 50 to 90% of computers build it. | +$4.13 at 3 stalls, +$4.93 at 6 | Cost $5 (not tested) |
| 4 | Mango is still the best earner; the $4 price is mostly cancelled by the Ripening Room's discount. | Mango 31 to 40% of profit; average price paid $3.39 to $3.56 | Drop the Ripening Room's discount (not tested on the final build) |
| 5 | About half of mango orders find no bidder. | 41.5 to 57.1% (17.6% before) | Mango stake $9 (section 4; small effect) |
| 6 | Free Fruit is the strongest favour. | +$4.92 a copy | None suggested |
| 7 | The Handcart loses money for a Normal computer, and computers no longer build it. | -$2.02 (Hard +$1.46) | Cost $5 (not tested) |
| 8 | Mango Windfall still costs money on the day. | -$1.57 a stall | Cut $1 from mango customers, not $2 (not tested) |
| 9 | Tourist Bus does nothing at 5 and 6 stalls. | $0.00 | Not a number: its walk-ins would have to join a full row like guests |
| 10 | A Hard computer beats Normal computers more often than before. | One Hard stall among Normal stalls wins 73 / 67 / 60% at 2 / 3 / 4 stalls (before 69 / 57 / 50%; `npm run simulate`) | Not a rule. It follows from the approved memory levels: a Normal computer now uses only today's purchases, a Hard computer everything it saw |

None of these was changed. The brief said to stop at the approved list.

## 13. What computer games cannot show

- **Computers do not bluff, bargain or hold grudges.** Today's purchases being public, open bidding and the open Favoured Trade step all change what people can read from each other. Only a playtest shows that.
- **Computers never play Scout and barely use Gossip**, so those two cards, Sharp Ears' peek and Priority are under-valued here.
- **Computers do not plan for tomorrow's crowd.** The apple's long life and the Handcart's extra room are under-valued.
- **A Normal computer is the yardstick** for the shopkeeper table. A shopkeeper can be fair among computers and still feel strong or weak in a person's hands.
- **The four results past the line are within one standard error.** With 1,200 to 3,600 games a table, a shopkeeper's win rate is known to about 1.2 to 1.9 points. "Within 4 points" is met in 44 of 48 results and cannot be told apart from met in the other 4.
- The browser tests (`npm run test:e2e`) were not run for this report, by instruction.

## 14. Files, and how to run it again

Scripts: `docs/studio/review-17/balance/scripts18/` (adapted from the rules 17 study in `../scripts/`). They read the engine as built. Run from the repository root.

| Script | What it does | Example |
|---|---|---|
| `sim.ts` | Plays a batch and writes one line a game | `npx vite-node docs/studio/review-17/balance/scripts18/sim.ts -- --n 3 --games 2800 --out n3.jsonl` (add `--level hard`, `--patch apples`) |
| `analyze.ts` | Tables from a batch: shopkeepers, fruit, upgrades, favours, events, cash trouble, orders, game shape, the tie step | `... analyze.ts -- --in n3.jsonl` (add `--old` for a rules 17 batch) |
| `compare.ts` | The before and after shopkeeper table | `... compare.ts -- --dir out --pairs "3 stalls:base-n3:f1-n3"` |
| `focal.ts` | Focal-seat tests | `... focal.ts -- --test upgrades --n 3 --games 500` (also `favours`, `orders`; `--rows 0,1`; `--level hard`) |
| `events.ts` | Every event against a calm day | `... events.ts -- --n 3 --games 300` (add `--patch glutPlain`) |
| `patches.ts` | The named variants: `stakeLow`, `stakeHigh`, `stakeHalf`, `mangoStake9`, `mangoStake8`, `apples`, `glutPlain`, `juice5`, `barrow5` | |
| `stuck.ts`, `carried.ts` | Ledger of stuck stalls; what an average stall carries into a day | |
| `harness.ts` | Shared game runner and log format | |

Variants that change a constant in the code (a guest left out of a full row, the Charmer's 3 cards, Nest Egg's $16) were run on a copy of the source with that one constant edited. The rules 17 batches were played by the rules 17 study's own scripts (`../scripts/`, every lab switch off) on the rules 17 engine, and read with `analyze.ts --old`. They give the same numbers as that study's report (`BALANCE-FINDINGS.md`).

The game logs (about 1 GB) are not in the repository. Every table here can be rebuilt with the commands above; seeds start at 1.
