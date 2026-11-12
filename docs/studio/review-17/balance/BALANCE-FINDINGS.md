# Fruit Market balance study (rules version 17)

Lab run of 11 November 2026 on commit `b5df35d`. About 85,000 all-computer games, plus about 20,000 single days replayed for the event test. Nothing here is approved or shipped: it is evidence for a proposal.

Files: this report; `lab/scripts/` (every script); `lab/recommended.diff` (the recommended set as engine and data changes, checked to play the same 60 seeded games as the lab switches); `lab/lab-engine.diff` (the lab switches); `lab/out/` (raw tables and game logs).

## Summary

**Top findings**

| # | Finding | Numbers |
|---|---|---|
| 1 | Two shopkeepers are off at every table size and both AI levels: **Tip Jar is weak, Nest Egg is strong.** | Tip Jar -4.9 to -9.3 points from fair; Nest Egg +4.1 to +8.6. Against holding no perk at all, Tip Jar is worth -$1.8 +/- 1.6 and Nest Egg +$7.9. |
| 2 | **The Haggler is only weak against Normal computers**, and that is the computer's pricing, not the card. | -5.9 to -10.4 under Normal, -1.1 and -0.5 under Hard. Switching the tie-break off in the computer's planning moves it from -10.4 to -3.0. Note that `scripts/balance.ts` plays Hard in every test. |
| 3 | **Mango is the default buy, not a gamble; apple plays like watermelon.** | Mango: $4.10 profit a piece against $2.39 to $2.92, 34 to 40% of all profit, 85% of every lorry's mangoes bought, even with 17% lost. Apples sit 0.27 nights on a shelf and 95% sell fresh. |
| 4 | **Upgrades are not a fair choice.** | Against never building (3 stalls, 10 days): Juice Bar $4 **+$6.12**, Premium Display +$4.65, Handcart +$0.02, Ripening Room **-$3.82**, Order Book **-$4.05**. The computer builds the two losers most often and does worse than never building (-$1.19). |
| 5 | **Favours: two good cards, four that do nothing for a computer; the deck never runs out.** | Fridge +$4.55, Free Fruit +$3.18, Gossip / Scout / Favoured Trade / Priority within $1 of zero. A stall earns about one favour a game (0.37 at 6 stalls). 12 cards are enough at every size. |
| 6 | **Three event problems.** Tourist Bus does nothing at 5 and 6 stalls; the five guest events cost money at 6 stalls; Mango Windfall delivers green mangoes although the card says ripe. | Tourist Bus at 6 stalls: 0.00. Guests at 6 stalls: -$0.7 to -$1.4 a stall. Mango Windfall: 0.00 extra mangoes sold, -$2.33 a stall. No event swings a game: the largest is Festival at +$5.53 a stall. |
| 7 | **A stall that reaches $0 with an empty shelf is out of the game** (the owner's playtest report). | It happens in 2.1 / 3.6 / 7.4 / 13.2% of computer games at 2 / 3 / 4 / 6 stalls; 80 to 88% of those stalls never earn again. Causes: fruit that did not pay back 64% (typically all-in on green mangoes on day 1), standing-order fines 31%. |
| 8 | **A $3 market float fixes it; the seconds box does not.** | After a wipe-out on day 2: dead days 8.0 (no net), 0.16 (float $3), 0.18 (on credit), 4.94 (seconds box). The floated stall still finishes last 61% of the time. |
| 9 | **Standing orders are sound; mango orders are harsh at big tables.** | Bidding is worth $1.37 +/- 0.67 a game over passing. Bidding $1 costs the bidder $33. Rules 17 cut a rival's pay from $14.45 to $9.31 a piece and changed nothing else. Mango orders are delivered in full 64 / 53 / 38% of the time at 3 / 4 / 6 stalls. |
| 10 | **Buying order and memory are the two biggest levers in the game.** | Always buying first: 58% wins, +$15.73. Always last: 9.6%, -$21.36. A stall that does not remember what rivals bought: 22.8% wins instead of 31.8%, -$9.91. Games are decided by wide margins: 45 to 55% are won by $20 or more. |

**Recommended set** (section 10; A/B results in the table there)

| # | Change | Headline effect |
|---|---|---|
| 1 | Tip Jar: $1 from any customer who got their whole order and bought from you, $2 if you served them alone | -5.8 to -1.7 at 3 stalls; -9.3 to 0.0 under Hard |
| 2 | Nest Egg: start with $15 (was $18) | +6.5 to +3.1 at 3 stalls; +8.6 to +4.1 at 4 |
| 3 | Upgrade costs: Juice Bar $6, Premium Display $5, Ripening Room $4, Order Book $3 (Handcart stays $6) | Best-to-worst gap $10.2 to $6.3 |
| 4 | Market float: from day 2 no stall starts a day with less than $3 | Stuck stalls 3.6% of games to 0%; dead days 5.5% to 3.3% |
| 5 | Mango Windfall: the extra mangoes arrive ripe, as the card says | Day goes from -$2.33 to -$0.65 a stall |
| 6 | Mango: green for $4 (was $3). Optional; the rest works without it | Mango's share of profit 36% to 31%; blowouts 48.5% to 42.7% with the set |
| 7 | Not a rule: Normal computer prices without counting on the Haggler tie-break | Haggler -10.4 to -3.0 |

With the whole set the largest distance from a fair share falls from 10.4 to 4.4 points at 3 stalls, 8.6 to 5.8 at 2, 8.6 to 4.1 at 4, 6.9 to 5.3 at 6 and 9.3 to 6.5 under Hard (SE about 2 each). It is closer to the owner's "within 4 points" than today, not proof of it.

**Bigger ideas, tested, for a playtest:** Ripening Room also makes green mangoes $1 cheaper (-$2.05 to +$0.80); Order Book also pays $2 a piece (-$2.22 to +$1.04); guests join a full row at 5 and 6 stalls; Blueberry Glut makes blueberries $1 cheaper to buy; a stricter float; one 12-card favour deck; Soft fruit for Everyday customers; Sharp Ears $2 from 3 stalls.

**Read with care:** computers do not plan for tomorrow's crowd, never play Scout and barely use Gossip, so the Ripening Room, the information cards and the apple's long life are under-valued here. A playtest is the only check for those.

---

## 1. How this was measured

- Engine: commit `b5df35d` (rules version 17), in a private worktree. All-computer games, events on, upgrades on, 10 days unless stated, seeded (seed 1 upward), so every table can be reproduced exactly.
- Shopkeepers: each game deals **random distinct perks** to the seats (seeded), so win rates are zero-sum across the eight perks. "Fair" is 1 / stalls.
- "SE" is one standard error. For a win rate it is sqrt(p(1-p)/n) in percentage points; a difference of less than about 2 SE is noise.
- Focal-seat tests: one seat (rotating with the seed) follows a rule, the other seats play as shipped. Every row replays the same seeds, so "cash change vs first row" is a paired difference.
- Paired event test: a game is played to the evening before a random day (2 to 10); that one day and its night are then replayed once for each of the 20 events and once with no event ("calm"), from the same position.
- Rule experiments are switches in a `LAB` object added to `src/engine/data.ts` (all off by default; the patched engine reproduces the unpatched games byte for byte, checked on 40 games) or run-time patches to the data tables (`scripts/lab/patches.ts`).

**Three things to keep in mind when reading the numbers**

1. **`scripts/balance.ts` plays Hard computers, not Normal** (`Array(n).fill('hard')` in every test). The "known" figures in the brief (Haggler 36.5 and so on) and `balance2.log` are therefore Hard-AI figures. Normal and Hard disagree on two things that matter: the Haggler (see 2) and the Premium Display / Handcart (see 4). Both levels are reported where it matters.
2. The computer does not use tomorrow's crowd when buying (rules 16), never plays Scout, and gets little from Gossip. Anything whose value is *information* or *planning ahead* (Ripening Room, Gossip, Scout, Sharp Ears' peek, the apple's long life) is under-valued by these runs. Marked "AI limit" below.
3. Computer stalls remember every purchase a rival made (their shelves are known to them). A person does not. Measured in 10.3: it is worth about $10 a game.

Sample sizes of the baseline batches: 2 stalls 3,600 games; 3 stalls 2,800; 4 stalls 2,000; 6 stalls 1,300 (Normal); 3 stalls 1,600 and 4 stalls 1,200 (Hard).

---

## 2. Shopkeepers

**Win rate when a seat holds the perk, and distance from a fair share** (bold = more than 4 points from fair)

| Perk (shopkeeper) | 2 stalls (fair 50) | 3 stalls (33.3) | 4 stalls (25) | 6 stalls (16.7) | 3 stalls Hard | 4 stalls Hard |
|---|---|---|---|---|---|---|
| Haggler (Rosa) | **41.4 (-8.6)** | **23.0 (-10.4)** | **18.5 (-6.5)** | **10.8 (-5.9)** | 32.2 (-1.1) | 24.5 (-0.5) |
| Big Basket (Uncle Benny) | 51.8 (+1.8) | 31.8 (-1.5) | 23.0 (-2.0) | 14.4 (-2.3) | 31.2 (-2.1) | 25.0 (0.0) |
| Bargain Hunter (Raj) | 54.0 (+4.0) | **38.1 (+4.7)** | 25.5 (+0.5) | 20.6 (+3.9) | 33.2 (-0.1) | 26.4 (+1.4) |
| Charmer (Ah Chen) | 47.8 (-2.2) | 35.2 (+1.9) | **29.1 (+4.1)** | 17.2 (+0.5) | 37.3 (+3.9) | 24.5 (-0.5) |
| Tip Jar (Kiki) | **45.1 (-4.9)** | **27.5 (-5.8)** | **17.8 (-7.2)** | **10.3 (-6.3)** | **24.1 (-9.3)** | **16.7 (-8.3)** |
| Nest Egg (Saleh) | **57.1 (+7.1)** | **39.8 (+6.5)** | **33.6 (+8.6)** | **23.6 (+6.9)** | **37.7 (+4.4)** | **29.1 (+4.1)** |
| Shade Cloth (Pak Din) | 53.2 (+3.2) | **39.9 (+6.6)** | 26.4 (+1.4) | 17.6 (+0.9) | **37.8 (+4.4)** | 28.1 (+3.1) |
| Sharp Ears (Farah) | 49.0 (-1.0) | 31.5 (-1.8) | 26.3 (+1.3) | 18.8 (+2.1) | 33.2 (-0.2) | 25.8 (+0.8) |
| Seats per perk / SE | ~900 / 1.7 | ~1,050 / 1.4 | ~1,000 / 1.3 | ~975 / 1.1 | ~600 / 1.9 | ~600 / 1.8 |

**Final cash of the perk's seat, less the table average** (SE 0.7 to 1.1)

| Perk | 2 stalls | 3 stalls | 4 stalls | 6 stalls | 3 Hard | 4 Hard |
|---|---|---|---|---|---|---|
| Haggler | -5.4 | -6.3 | -6.5 | -8.0 | -0.7 | -1.3 |
| Big Basket | -0.2 | -1.7 | -2.1 | -4.3 | -2.5 | -0.8 |
| Bargain Hunter | +2.2 | +4.3 | +3.1 | +4.3 | +0.7 | +2.1 |
| Charmer | +0.5 | +0.8 | +2.7 | +0.9 | +2.6 | -0.6 |
| Tip Jar | -3.0 | -3.8 | -6.2 | -8.4 | -4.6 | -5.7 |
| Nest Egg | +4.4 | +4.0 | +5.5 | +7.2 | +3.6 | +3.0 |
| Shade Cloth | +1.6 | +3.9 | +3.7 | +7.0 | +2.9 | +4.1 |
| Sharp Ears | -0.4 | -1.1 | -0.1 | +1.2 | -2.0 | -0.6 |

Average final cash per stall: $92.4 / $86.1 / $82.9 / $79.8 at 2 / 3 / 4 / 6 stalls (Normal), $90.7 / $85.9 at 3 / 4 (Hard).

**What each perk is worth against holding no perk at all** (3 stalls, Normal, 400 games per row, same seeds; rivals hold random other perks)

| Focal seat holds | Win % (SE 2.3) | Cash vs no perk (paired) | SE |
|---|---|---|---|
| no perk | 27.8 | 0 | |
| Haggler | 25.8 | -2.0 | 1.6 |
| Tip Jar | 26.8 | -1.8 | 1.6 |
| Big Basket | 31.8 | +1.4 | 1.7 |
| Sharp Ears | 33.3 | +4.1 | 1.6 |
| Charmer | 36.0 | +5.2 | 1.6 |
| Shade Cloth | 33.5 | +6.7 | 1.7 |
| Nest Egg | 37.5 | +7.9 | 1.5 |
| Bargain Hunter | 37.5 | +8.5 | 1.6 |

**Why (mechanism)**

| Perk | Mechanism, with the measured numbers |
|---|---|
| Tip Jar | Pays $2 only when a stall serves a customer's whole order alone. That happens 1.22 / 0.94 / 0.81 / 0.32 times a game at 2 / 3 / 4 / 6 stalls, so the perk pays $2.40 / $1.90 / $1.60 / $0.60 a game: a blank card at 6 stalls. Weak under both AI levels. |
| Nest Egg | $8 on day 1 is worth about $8 by the end (it buys 2 or 3 more pieces on the days when cash, not the 4-piece limit, is what holds a stall back), plus first pick on day 3. Strong at every size and both levels. |
| Bargain Hunter | $1 off every day is $9 to $10 a game, and it also helps most on days 1 to 3 when cash is short. |
| Shade Cloth | Spoils 0.03 pieces a game against 1.5 to 1.9 for everyone else, and keeps fruit a step fresher for the next sale. |
| Haggler | **AI limit, not a rules problem.** Under Hard it is fair (-1.1, -0.5). Under Normal it is worth no more than having no perk (-$2.0 +/- 1.6). Ties are common (the lowest price is shared on 21% of customer lines, 8.6 a game at 3 stalls), but demand is larger than supply on about half of all fruit-days, so the stall that loses a tie usually still sells. The Normal computer also prices as if it will win ties and is undercut. See 10 for the check. |
| Big Basket | A fifth piece a day only helps when four pieces is the limit; for the first days cash is the limit. Worth about $1.40. |
| Charmer | Four cards at the start, worth about $1.20 each on average in computer hands (see 5). |
| Sharp Ears | Tips $4.20 / $4.90 / $7.20 / $6.50 a game at 3 / 2 / 4 / 6 stalls; the peek itself is not used by the computer (AI limit). |

Outside +/-4 points at one size or more: **Tip Jar and Nest Egg everywhere; Haggler under Normal only; Shade Cloth and Bargain Hunter at 3 stalls; Charmer at 4 stalls.**

---

## 3. Fruit roles

**Per game, whole table, 3 stalls, Normal (2,800 games)**

| Fruit | Delivered | Bought | % of the lorry bought | Sold to the row | To a standing order | Hawker | Spoiled | Juiced | Jam maker (ripe left) | Green left | Avg cost | Avg sale price | Profit per piece bought | Share of all profit |
|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|
| Blueberry | 28.0 | 19.3 | 69% | 16.3 | 1.18 | 0.20 | 0.86 | 0.20 | 0.72 | 0 | $1.72 | $4.28 | $2.39 | 18% |
| Watermelon | 27.1 | 22.8 | 84% | 20.2 | 1.51 | 0.19 | 0.32 | 0.08 | 0.72 | 0 | $2.86 | $5.84 | $2.92 | 26% |
| Apple | 22.7 | 20.1 | 88% | 18.1 | 1.31 | 0.17 | 0.08 | 0.02 | 0.53 | 0 | $2.91 | $5.47 | $2.58 | 20% |
| Mango | 26.1 | 22.6 | 87% | 13.3 | 1.17 | 0.49 | 3.19 | 0.74 | 3.42 | 0.44 | $2.96 | $10.30 | $4.10 | 36% |

| Fruit | Sold Fresh | Sold Okay | Sold Soft | Nights on a shelf per piece | Lost (spoiled or juiced) | Wanted per game | Row demand served | Days more was wanted than put out | Days some demand went unserved |
|---|---|---|---|---|---|---|---|---|---|
| Blueberry | 68% | 30% | 1.6% | 0.28 | 5.5% | 26.2 | 62% | 48% | 55% |
| Watermelon | 86% | 14% | 0.6% | 0.28 | 1.7% | 28.4 | 71% | 42% | 44% |
| Apple | 95% | 5% | 0.3% | 0.27 | 0.5% | 29.5 | 61% | 52% | 54% |
| Mango | 78% | 20% | 2.0% | 2.43 (2 of them green) | 17.3% | 25.3 | 53% | 45% | 56% |

"Nights on a shelf per piece" is the piece-nights all stalls held, divided by pieces obtained (it includes pieces that later spoiled). Profit counts row sales, juice tips, order sales, the hawker, juice and jam, less what was paid.

**Profit per piece bought and share of profit at other sizes**

| | 2 stalls | 3 stalls | 4 stalls | 6 stalls | 3 Hard | 4 Hard |
|---|---|---|---|---|---|---|
| Blueberry | $2.64 (18%) | $2.39 (18%) | $2.19 (18%) | $2.11 (17%) | $2.57 (19%) | $2.31 (19%) |
| Watermelon | $3.21 (26%) | $2.92 (26%) | $2.69 (25%) | $2.58 (24%) | $3.12 (27%) | $2.83 (26%) |
| Apple | $2.80 (22%) | $2.58 (20%) | $2.40 (19%) | $2.34 (20%) | $2.79 (21%) | $2.56 (20%) |
| Mango | $3.64 (34%) | $4.10 (36%) | $4.07 (37%) | $3.76 (40%) | $4.06 (34%) | $3.94 (35%) |
| Mango lost / left for jam per game | 3.6 / 3.0 | 3.9 / 3.4 | 5.0 / 4.6 | 8.8 / 8.0 | 4.0 / 3.4 | 5.1 / 4.7 |

**Reading**

- **Blueberry = cheap and fast: yes.** Lowest cost, a third sold Okay, 5 to 8% lost, the worst use of a buying slot ($2.1 to $2.6) but the best return per dollar (139%). It is the fruit for days 1 to 3, when cash is the limit. A third of the lorry's blueberries are never bought.
- **Mango = green gamble with a premium: a premium, hardly a gamble.** One piece in six is lost and three or more go to the jam maker, and it is still the best buy by $1.20 a piece. It earns 34 to 40% of all profit and 85% of every lorry's mangoes are taken. It is what you buy whenever you can, not a choice.
- **Watermelon = steady: yes.** Most pieces sold, demand best served, almost no loss.
- **Apple = the keeper: not in computer play.** Apples sit on a shelf 0.27 nights, the same as blueberries, and 95% sell fresh. Because more is wanted than delivered on about half of all days, nothing needs keeping. In practice the apple is a watermelon that earns 35 cents less. Its long life would matter to a person who buys today for tomorrow's visible crowd (AI limit), and on Apple Blight and standing-order days.
- **Soft fruit hardly exists.** 0.3 to 2% of sales. Only the six Bargain customers take it.
- No fruit is pointless: every fruit has 59 to 88% of its deliveries bought.

---

## 4. Upgrades

**What the computer builds** (Normal; % of stalls that own it at the end)

| Upgrade | Cost | 2 stalls | 3 stalls | 4 stalls | 6 stalls | Average day built |
|---|---|---|---|---|---|---|
| Handcart | $6 | 65% | 66% | 63% | 59% | 5.3 |
| Ripening Room | $6 | 63% | 62% | 55% | 44% | 4.2 |
| Order Book | $5 | 21% | 22% | 22% | 21% | 3.0 |
| Juice Bar | $4 | 18% | 17% | 23% | 32% | 4.9 |
| Premium Display | $6 | 6% | 7% | 6% | 6% | 6.0 |

About three stalls in four end with two upgrades. The computer's favourites (Ripening Room, Order Book) are the two that lose money; the two best (Juice Bar, Premium Display) are the ones it rarely builds. Its choice follows a fixed lean, not value.

**Forced first buy against never building** (3 stalls, Normal; the focal seat builds only this one, as soon as it can afford it, which is the evening of day 3 in 99% of games)

| Focal seat | 10 days: win % | Cash vs never (paired) | SE | 8 days: cash vs never | SE | 14 days: cash vs never | SE |
|---|---|---|---|---|---|---|---|
| never builds | 27.4 | 0 | | 0 (win 31.0) | | 0 (win 21.8) | |
| Juice Bar $4 | 36.3 | **+6.12** | 0.56 | +2.35 | 0.56 | +11.17 | 0.97 |
| Premium Display $6 | 36.0 | **+4.65** | 0.70 | +0.69 | 0.70 | +6.81 | 1.35 |
| Handcart $6 | 34.0 | +0.02 | 0.70 | -2.20 | 0.77 | +0.47 | 1.49 |
| Ripening Room $6 | 26.0 | **-3.82** | 0.88 | -3.09 | 1.07 | -4.99 | 1.57 |
| Order Book $5 | 26.3 | **-4.05** | 0.62 | -4.62 | 0.64 | -4.35 | 1.15 |
| computer chooses (1.73 upgrades) | 32.6 | -1.19 | 0.76 | | | | |
| Games per row / SE of a win rate | 700 / 1.8 | | | 400 / 2.3 | | 400 / 2.2 | |

**Payback** (income added per day after it is built = (cash change + cost) / days left)

| Upgrade | 10 days: added per day | Days to pay back | 8 days | 14 days |
|---|---|---|---|---|
| Juice Bar $4 | $1.50 | 2.7 | $1.33 / 3.0 days | $1.41 / 2.8 days |
| Premium Display $6 | $1.59 | 3.8 | $1.42 / 4.2 days | $1.20 / 5.0 days |
| Handcart $6 | $0.90 | 6.7 | $0.81 / 7.4 days | $0.61 / 9.9 days |
| Ripening Room $6 | $0.33 | 18 (never) | $0.62 / 9.7 days | $0.09 / never |
| Order Book $5 | $0.14 | 35 (never) | $0.08 / never | $0.06 / never |

**The same test under Hard** (from `balance2.log`, 400 games, cash against the average rival): never -1.5, Juice Bar +5.8, Handcart +4.6, Ripening Room +0.9, Premium Display -2.0, Order Book -4.5.

**Reading**

- **Juice Bar is the best upgrade at every length and both levels** and the cheapest. A person can do better still: the card itself says $1 soft fruit makes $2 of juice.
- **Order Book loses money at every length** (-$4 to -$4.6). It can only ever touch one or two orders: the first order is bid for on the morning of day 3, before any upgrade can be built, and a 10-day game has two orders. The fines it halves average $1.29 a game.
- **Ripening Room loses money in computer hands** (-$3 to -$5 Normal, +$2.40 against never under Hard). Part of that is an AI limit: with it, a person can buy mangoes for *tomorrow's visible crowd*, which the computer does not look at.
- **Handcart pays for itself and nothing more** under Normal; it is good under Hard. It raises the owner's win rate more than its cash (34%) because the fifth piece comes out of rivals' supply.
- **Premium Display is good under Normal, break-even under Hard**, where prices sit lower.
- Building upgrades as the computer does is slightly worse than never building (-$1.19 +/- 0.76). With upgrades switched off the average stall ends $6.70 richer (`balance2.log`: $98.3 against $91.6).

---

## 5. Favours

**Per game, whole table** (Normal; "played" is by the shipped computer, which never plays Scout)

| | 2 stalls | 3 stalls | 4 stalls | 6 stalls |
|---|---|---|---|---|
| Favours earned per stall | 1.26 | 0.98 | 0.91 | 0.37 |
| Whole orders served alone, per table | 2.62 | 3.02 | 3.74 | 2.24 |
| Dealt to the Charmer at the start, per table | 1.0 | 1.5 | 2.0 | 3.0 |
| Games in which the deck ran out | 0% | 0% | 0.3% | 0% (18 cards) |
| Share of cards gained that were played | 69% | 70% | 72% | 74% |

**By card, 3 stalls** (per game, whole table)

| Card | Dealt at start | Earned | Played | Unplayed at the end | Played % |
|---|---|---|---|---|---|
| Gossip | 0.26 | 0.48 | 0.65 | 0.09 | 88% |
| Free Fruit | 0.24 | 0.47 | 0.63 | 0.08 | 89% |
| Priority | 0.25 | 0.48 | 0.64 | 0.09 | 88% |
| Scout | 0.25 | 0.51 | 0 | 0.76 | 0% (AI limit) |
| Favoured Trade | 0.23 | 0.50 | 0.65 | 0.08 | 89% |
| Fridge | 0.26 | 0.49 | 0.52 | 0.23 | 70% |

**Value of one free copy at the start** (3 stalls, Normal, 700 games per row, same seeds; in this test every seat plays Scout on its buying turn when it holds one)

| Free card | Win % (SE 1.8) | Cash change (paired) | SE |
|---|---|---|---|
| none | 32.9 | 0 | |
| Fridge | 38.1 | **+4.55** | 0.56 |
| Free Fruit | 36.6 | **+3.18** | 0.79 |
| Favoured Trade | 33.0 | +0.39 | 0.41 |
| Gossip | 34.3 | +0.28 | 0.53 |
| Scout | 31.3 | -0.19 | 0.42 |
| Priority | 32.6 | -0.91 | 0.83 |

**Reading**

- **The deck never runs out, at any size.** A 3-stall game draws about 4.4 of 12 cards, a 6-stall game about 5.2 of 18. The extra six cards at 5 and 6 stalls are not needed.
- **Favours are rare:** about one a game per stall, one every three games at 6 stalls. The trigger (serving a whole order alone) gets harder as the table grows.
- **Two cards are worth real money (Fridge $4.55, Free Fruit $3.18); four are worth nothing measurable in computer hands.** Gossip and Scout are information the computer barely uses (AI limit: a person who sees a walk-in wants 3 mangoes at $13 can act on it). Favoured Trade and Priority are small for the same reason the Haggler is: when more is wanted than is on sale, queue position matters little.
- Nothing is "never worth playing", but a draw is a coin-flip between about $4 and about $0.

---

## 6. Events

**Paired against a calm day, 3 stalls, Normal, 300 positions per event.** Differences per day for the whole table (pieces) or per stall (dollars). B / W / A / M = blueberry / watermelon / apple / mango. On a calm day the lorry brings 2.8 / 2.8 / 2.6 / 2.6 pieces, 2.1 / 2.6 / 3.1 / 2.4 are wanted, 1.5 / 1.9 / 2.0 / 1.5 are sold at $4.12 / $5.59 / $5.38 / $10.32.

| Event | Delivered B/W/A/M | Wanted B/W/A/M | Sold B/W/A/M | Price B/W/A/M | Income per stall | Net per stall (income - fruit bought - fines) | SE | Lost that night per stall | Best minus worst stall |
|---|---|---|---|---|---|---|---|---|---|
| Festival | 0 | +0.7/+0.8/+1.0/+0.9 | +0.4/+0.5/+0.5/+0.4 | +0.9/+0.9/+1.0/+1.2 | +6.54 | **+5.53** | 0.22 | 0 | 13.9 |
| Tourist Bus | 0 | +1.5/+1.5/+1.6/+1.5 | +0.5/+0.8/+0.5/+0.6 | +0.2/+0.2/+0.2/+0.3 | +5.75 | **+4.40** | 0.25 | 0 | 12.2 |
| Mango Craze | 0 | 0/0/0/+1 | 0/0/0/+0.5 | 0/0/0/+2.5 | +3.34 | +3.30 | 0.17 | 0 | 9.1 |
| Kenduri | 0 | 0/+3/0/0 | -0.2/+1.6/-0.2/0 | +0.1/+1.3/0/0 | +4.01 | +3.10 | 0.14 | 0 | 10.8 |
| Hotel Order | 0 | +1/+1/+1/0 | +0.4/+0.6/+0.4/0 | +1.0/+0.6/+0.6/0 | +4.02 | +2.87 | 0.13 | 0 | 9.4 |
| Superfood Trend | 0 | +2/0/0/0 | +1.3/-0.1/-0.2/0 | +2.0/0/+0.1/0 | +3.13 | +2.78 | 0.11 | 0 | 11.6 |
| Bad Harvest | -1.2/-1.2/-1.0/-1.0 | 0 | -0.1/-0.2/-0.1/0 | +0.9/+0.9/+0.9/+1.0 | +1.33 | +2.59 | 0.13 | 0 | 9.8 |
| Pasar Malam | 0 | 0 | 0 (hawker extra) | 0 | +2.44 | +2.44 | 0.08 | -0.15 | 3.4 |
| Bake-Off | 0 | 0/0/+2/0 | -0.1/-0.2/+1.2/0 | +0.1/0/+1.0/0 | +2.79 | +2.05 | 0.12 | 0 | 9.2 |
| Heatwave | 0 | 0 | 0/+0.1/0/0 | 0/+1.5/0/0 | +1.22 | +0.96 | 0.10 | **+0.31** | 7.1 |
| Lorry Breakdown | -2.8/-2.8/-2.6/-2.6 | 0 | -0.7/-0.8/-0.9/0 | -0.5/0/+0.1/0 | -4.52 | +0.69 | 0.20 | 0 | **11.9** |
| Durian Season | 0 | 0 | -0.1/0/0/0 | -0.6/-1.0/-1.0/-1.0 | -2.21 | +0.38 | 0.08 | 0 | 6.2 |
| Apple Blight | 0/0/-2.6/0 | 0 | 0/0/-0.9/0 | 0/-0.1/+1.8/0 | -0.96 | -0.01 | 0.12 | 0 | 7.1 |
| Health Inspector | 0 | 0 | -0.04/-0.01/-0.06/-0.07 | 0 | 0.00 | **-0.42** | 0.05 | 0 | 1.3 |
| Blueberry Glut | +2/0/0/0 | 0 | -0.1/0/0/0 | -0.7/0/0/0 | -0.42 | **-0.46** | 0.06 | 0 | 3.1 |
| Price Controls | 0 | 0 | 0 | -0.3/0/-0.3/-1.2 | -0.83 | -0.83 | 0.08 | 0 | 3.3 |
| Price Hike | 0 | 0 | -0.2/-0.1/-0.1/0 | +0.2/+0.2/+0.1/0 | -0.31 | -2.11 | 0.08 | 0 | 5.8 |
| Mango Windfall | 0/0/0/+2 | 0 | 0/0/0/**0** | 0/0/0/-2.0 | -1.32 | **-2.33** | 0.09 | 0 | 7.9 |
| Good Harvest | +1/+1/+1/+1 | 0 | -0.2/0/0/0 | -0.6/-0.8/-0.9/-1.0 | -2.16 | -2.75 | 0.10 | 0 | 8.3 |
| Monsoon Downpour | 0 | -0.6/-0.8/-1.1/-0.9 | -0.3/-0.5/-0.6/-0.5 | -0.1/-0.2/-0.1/-0.4 | -4.24 | **-3.05** | 0.18 | -0.23 | 10.1 |

**Net per stall at the other sizes** (2 stalls 150 positions, 4 stalls 200, 6 stalls 80; SE about 0.1 to 0.4)

| Event | 2 stalls | 3 stalls | 4 stalls | 6 stalls |
|---|---|---|---|---|
| Festival | +6.98 | +5.53 | +4.59 | +2.54 |
| Tourist Bus | +6.54 | +4.40 | +1.84 | **0.00** |
| Mango Craze | +4.55 | +3.30 | +2.35 | **-0.02** |
| Kenduri | +4.38 | +3.10 | +1.95 | **-1.11** |
| Hotel Order | +4.77 | +2.87 | +1.49 | **-0.97** |
| Superfood Trend | +4.48 | +2.78 | +2.05 | **-0.71** |
| Bake-Off | +3.09 | +2.05 | +0.99 | **-1.35** |
| Bad Harvest | +2.51 | +2.59 | +2.89 | +3.52 |
| Pasar Malam | +2.69 | +2.44 | +2.36 | +2.14 |
| Heatwave | +0.79 | +0.96 | +1.00 | +1.21 |
| Lorry Breakdown | +0.91 | +0.69 | +1.39 | +2.03 |
| Durian Season | +0.38 | +0.38 | +0.26 | +0.32 |
| Apple Blight | +0.68 | -0.01 | +0.11 | +0.48 |
| Health Inspector | -0.71 | -0.42 | -0.53 | -0.66 |
| Blueberry Glut | -0.68 | -0.46 | -0.58 | -0.54 |
| Price Controls | -0.88 | -0.83 | -0.67 | -0.57 |
| Price Hike | -2.23 | -2.11 | -2.03 | -2.22 |
| Mango Windfall | -1.77 | -2.33 | -1.93 | -2.08 |
| Good Harvest | -3.06 | -2.75 | -2.52 | -2.87 |
| Monsoon Downpour | -4.21 | -3.05 | -4.33 | -3.70 |

Health Inspector: 15 to 21% of stalls are fined, $3.00 to $3.80 when fined, largest $8 to $10; the average over all stalls is $0.46 to $0.74.

**Flags**

| Flag | Events | Evidence |
|---|---|---|
| **Does nothing** | Tourist Bus at 5 and 6 stalls | Row already full: 0.00 change in every measure at 6 stalls. |
| **Works against the card** | The five guest events at 5 and 6 stalls | A guest takes the place of the last walk-in when the row is full, and a 6-stall walk-in wants more pieces than the guest: -$0.7 to -$1.4 a stall on what reads as a bonus day. |
| **Card and engine disagree** | Mango Windfall | The card says "1 extra **ripe** mango". The engine delivers the extra mangoes green (mangoes sold that day: +0.00). So today's sellers lose $2 a mango and nobody gains today: -$2.33 a stall. |
| **Negligible** | Blueberry Glut, Health Inspector, Price Controls | Glut: +2 blueberries arrive, 0.13 fewer are bought (a third of blueberries already go unbought), net -$0.46. Inspector: 85% of stalls pay nothing. Price Controls: the limits are the usual prices; only mangoes feel it (-$1.16). |
| **Reads as good news, is bad (and the reverse)** | Good Harvest -$2.75, Bad Harvest +$2.59 | The price change outweighs the supply change. Fine as design, but players will be surprised. |
| **Uneven** | Lorry Breakdown, Festival, Tourist Bus, Monsoon | Best-minus-worst stall of $10 to $14 on the day at 3 stalls ($16 to $21 at 6). Lorry Breakdown favours whoever buys first that morning (the poorest): the richest stall does $3.42 worse than the poorest. |
| **Swings a game too hard?** | none | No event moves the average stall by more than $5.50 in a day, against a median winning margin of $17 to $22. With events off the median margin is $20, against $18 with them on (`balance2.log`). Health Inspector, Heatwave and Price Controls are mild in computer play because computers hold almost no old fruit; a person sitting on soft fruit can be fined up to $10 and left with nothing (1 to 9% of the stuck stalls in 7). Monsoon at 4 to 6 stalls removes two of the walk-ins: -$4.33 a stall at 4 stalls, the worst day in the deck. |

---

## 7. Running out of cash

**How often** (stall-days from day 2; Normal unless stated)

| | 2 stalls | 3 stalls | 4 stalls | 6 stalls | 3 Hard | 3 stalls, Easy seats | 
|---|---|---|---|---|---|---|
| Dawn with under $3 and nothing ripe (includes stalls waiting on green mangoes) | 0.92% | 1.70% | 2.48% | 3.19% | 1.58% | 2.42% |
| **Stuck: under $3 and no fruit at all** | 0.39% | 0.44% | 0.67% | 0.87% | 0.36% | 0.71% |
| Cannot pay for any piece at the market, nothing ripe | 0.65% | 1.27% | 1.59% | 1.64% | 1.21% | 1.61% |
| Dead days (no purchase and $0 income) | 3.87% | 5.54% | 5.83% | 6.62% | 5.40% | 6.53% |
| ... of which started the day under $3 | 41% | 42% | 54% | 62% | 38% | 56% |
| Dead on the last day | 5.1% | 6.7% | 6.1% | 6.9% | 6.2% | 6.3% |
| **Games with a stuck stall** | 2.1% | 3.6% | 7.4% | 13.2% | 2.7% | 3.9% (mixed table) |
| Games with at least one dead day | 44% | 72% | 81% | 92% | 71% | 71% |

**What happens to a stuck stall** (first stuck on day 7.2 to 7.4 on average)

| | 2 stalls | 3 stalls | 4 stalls | 6 stalls |
|---|---|---|---|---|
| Stalls that got stuck (in the batch) | 77 | 102 | 151 | 188 |
| Finishes last | 100% | 100% | 97% | 91% |
| Final cash (table average) | $2.30 ($92) | $2.30 ($86) | $3.20 ($83) | $2.60 ($80) |
| **Never earns another dollar** | 88% | 83% | 80% | 82% |

**What caused it** (3 stalls, 102 stuck stalls: the largest drain since the stall last had $8)

| Cause | Share |
|---|---|
| Fruit that did not pay back (typically: $9 of the first $10 on three green mangoes that then found no buyer) | 64% |
| Standing-order fine (for example $26 of a stall's $27) | 31% |
| Upgrade | 4% |
| Health Inspector | 1% |

So the owner's report is right: **there is no way back from $0**. It is rare in computer games (2 to 13% of games) because computers keep $6 back when they build and rarely overspend. A person who spends everything on fruit that does not sell gets there far more easily.

**The safety nets, tested.** After the rush of the day shown, one seat is left with $0 and an empty shelf (3 stalls, Normal, 160 games per row; the same seat without the wipe-out ends on $86, wins 28%).

| Wiped after day 2 | Dead days in the 8 left | Days to first income | Final cash (SE about 1.8) | Last place | Wins |
|---|---|---|---|---|---|
| no net (today's rules) | **8.00** | never | **$0** | 99% | 0% |
| (a) market float $3 | 0.16 | 2.15 | $63.1 | 61% | 4.4% |
| float $4 | 0.13 | 1.83 | $69.1 | 58% | 11.9% |
| float $5 | 0.14 | 1.65 | $73.0 | 49% | 14.4% |
| float $3 as a loan (pay back $1 extra) | 0.21 | 2.16 | $40.6 | 83% | 2.5% |
| float $5, only when the shelf is empty | 0.65 | 1.69 | $57.6 | 67% | 5.6% |
| float $3, only when the shelf is empty | 1.52 | 2.44 | $39.7 | 81% | 1.3% |
| (b) on credit (2 pieces, cost + $1 after the rush, debt carried) | 0.18 | 2.04 | $53.2 | 69% | 7.5% |
| odd jobs (buy nothing, take $3) | 2.22 | 3.32 | $37.9 | 87% | 1.9% |
| (c) seconds box, from the market if there is a Soft piece | 4.94 | 4.96 | $12.4 | 99% | 0.6% |
| (c) seconds box, always a Soft piece | 2.56 | 2.55 | $26.1 | 96% | 0.6% |

| Wiped after day 5 (5 days left) / day 8 (2 days left) | Dead days | Final cash | Last place |
|---|---|---|---|
| no net | 4.96 / 1.98 | $0.20 / $0.10 | 98% / 97% |
| (a) float $3 | 0.16 / 0.11 | $38.9 / $12.4 | 91% / 100% |
| float $5 | 0.08 / 0.08 | $47.8 / $17.7 | 88% / 99% |
| (b) on credit | 0.11 / 0.13 | $30.5 / $9.1 | 94% / 99% |
| (c) seconds box, from the market | 3.29 / 1.67 | $6.7 / $1.5 | 98% / 99% |
| (c) seconds box, always a Soft piece | 1.94 / 1.16 | $13.1 / $4.0 | 98% / 99% |
| odd jobs $3 | 1.66 / 1.13 | $20.3 / $6.2 | 96% / 99% |

At 4 stalls (wiped after day 5, 100 games): no net $0 and 5.0 dead days; float $3 $34.7 and 0.10; on credit $30.1 and 0.11; odd jobs $18.6 and 1.70.

**Reading**

- **(a) the market float is the best of the three and the simplest to say.** It ends the dead days (8.0 to 0.16) and the stall still loses (last 61 to 100% of the time), so it rescues the evening without changing who wins.
- **(b) on credit works almost as well** but needs a debt marker and a second rule (what if it cannot pay?).
- **(c) the seconds box does not work.** Soft fruit sells only to the six Bargain customers, and the market often has no Soft piece: the stall stays dead 3 to 5 days in 8.
- Can a stall use the float on purpose? See the exploit check in 10.

---

## 8. Standing orders (rules 17)

**Per order, Normal** (two orders are turned over in a 10-day game: days 3 and 6)

| | 2 stalls | 3 stalls | 4 stalls | 6 stalls | 3 Hard |
|---|---|---|---|---|---|
| Nobody bids | 14.9% | 9.1% | 8.0% | 4.2% | 13.1% |
| Bidders per order | 1.62 | 2.54 | 3.40 | 5.36 | 2.42 |
| Winning bid, as a share of the ceiling | 71% | 70% | 69% | 68% | 61% |
| Holder delivers every piece | 83% | 80% | 72% | 62% | 82% |
| Pieces short (of 3 / 3 / 4 / 5) | 0.27 | 0.36 | 0.62 | 0.97 | 0.31 |
| Fine paid per held order | $1.68 | $2.30 | $3.53 | $5.15 | $2.02 |
| Pieces rivals supply per held order | 0.10 | 0.20 | 0.38 | 0.68 | 0.18 |
| What a rival is paid per piece (bid - $1) | $9.71 | $9.31 | $8.96 | $8.89 | $8.34 |
| Holder: (bid - cost) x own pieces, less the fine | $14.64 | $12.99 | $15.30 | $16.98 | $10.68 |

**By fruit, 3 stalls (4 stalls / 6 stalls in brackets where it changes the picture)**

| Order fruit | Nobody bids | Winning bid (ceiling) | Delivered in full | Fine per held order | Row price that day for comparison |
|---|---|---|---|---|---|
| Blueberry | 14.9% | $6.26 ($9) | 79% | $1.51 | $4.28 |
| Watermelon | 0.8% | $7.92 ($12) | 89% | $0.91 | $5.84 |
| Apple | 3.1% | $7.56 ($11) | 85% | $1.12 | $5.47 |
| **Mango** | 17.6% (24.7% / 15.4%) | $13.40 ($18) | **64% (53% / 38%)** | **$6.08 ($8.95 / $12.55)** | $10.30 |

**Is bidding worth it?** Focal seat, 3 stalls, Normal, 700 games per row, same seeds:

| Focal seat's bidding | Win % (SE 1.8) | Cash change (paired) | SE | Orders held | Fines per game |
|---|---|---|---|---|---|
| as the computer (about 70% of the ceiling when it likes its chances) | 32.6 | 0 | | 0.60 | $1.29 |
| always passes | 30.3 | -1.37 | 0.67 | 0 | 0 |
| always bids the ceiling | 30.7 | -1.17 | 0.74 | 0.23 | $1.91 |
| always bids 60% of the ceiling | 31.7 | -5.75 | 0.88 | 1.88 | $7.18 |
| always bids half the ceiling | 26.4 | -9.70 | 0.91 | 2.00 | $7.16 |
| always bids $1 | 10.9 | **-33.12** | 1.01 | 2.00 | $5.26 |

**Reading**

- **Bidding is worth a little: about $1.40 a game** (+/- 0.7) over never bidding. A won order pays $2 to $3 a piece over the row, less a fine one time in five.
- **Winning is only good at the right price.** Taking every order at 60% of the ceiling (about the row price) costs $5.75 a game; the fines ($7.18) eat it.
- **No degenerate low bid.** Bidding $1 to grab rivals' fruit costs the bidder $33 a game. It does cost each rival about $4 a game too (their pieces are taken at $1), so it is a way to throw a game at someone, not to win one. Rivals can avoid it by keeping that fruit out of the crate on the due day; the computer does not.
- **"Bid minus $1" is still a good price for a rival**: $9.31 a piece on average against a row price of $4.28 to $10.30, so a rival who is called on earns $1 to $2 a piece more than the row would pay. Comparison with the old rule (ceiling) is in 10.
- **The fine is about right for three fruits and too harsh for mangoes at big tables.** Every mango must be bought green on the very day of the bid (it ripens exactly on the due day), after poorer stalls have had first pick. At 6 stalls the holder delivers all five 38% of the time and pays $12.55 in fines per order. Fines are also the second cause of stuck stalls (31%).

---

## 9. Game shape

| Measure (Normal) | 2 stalls | 3 stalls | 4 stalls | 6 stalls | 3 Hard | 4 Hard |
|---|---|---|---|---|---|---|
| Leader after day 5 wins (SE about 1) | 63.4% | 49.3% | 44.5% | 38.2% | 49.3% | 43.5% |
| Last after day 5 wins (comeback) | 36.4% | 23.7% | 13.2% | 5.6% | 25.4% | 14.1% |
| Lead changes per game | 1.74 | 2.78 | 3.51 | 4.37 | 2.69 | 3.32 |
| Average final cash | $92.4 | $86.1 | $82.9 | $79.8 | $90.7 | $85.9 |
| Winner / last place | $108 / $77 | $110 / $63 | $114 / $51 | $123 / $36 | $114 / $68 | $117 / $56 |
| Median margin, first over second | $22 | $19 | $18 | $17 | $18 | $19 |
| Close games (margin $3 or less) | 9.8% | 10.5% | 11.8% | 13.5% | 10.1% | 10.8% |
| Blowouts (margin $20 or more) | 54.7% | 48.5% | 45.3% | 44.8% | 46.0% | 47.8% |
| Spread of final cash within a game (sd) | $21.8 | $24.6 | $28.3 | $32.4 | $23.7 | |
| Win % by seat | 51.3 / 48.7 | 34.1 / 33.7 / 32.1 | 25.3 / 24.3 / 25.4 / 25.1 | 15.9 to 17.5 | 35.3 / 31.5 / 33.2 | |
| Days bought first: winners vs everyone | 3.87 vs 5.00 | 2.53 vs 3.33 | 1.72 vs 2.50 | 0.94 vs 1.67 | 2.63 vs 3.33 | |

**Reading**

- **Seats are fair** (within 1 to 2 points).
- **The game is decided by wide margins.** Nearly half of all games are won by $20 or more; one in ten is close. The leader at half-time wins 38 to 63% of the time, which is a healthy amount of doubt, and the lead changes 2 to 4 times.
- **Coming back from last gets hard as the table grows** (36% at 2 stalls, 6% at 6).
- Winners buy first on fewer days because the poorest buys first; the first-buyer effect itself is tested in 10.


---

## 10. Recommendations

### 10.1 Safe number tweaks (the recommended set; this is what `recommended.diff` contains)

| # | Change (new card text in italics) | Measured on its own | Risk |
|---|---|---|---|
| 1 | **Tip Jar.** *"A customer who leaves with their whole order tips you $1 if you sold them any of it, $2 if you served them alone."* (Today: $2, only when served alone.) | 3 stalls: 27.5% (-5.8) to 31.0% (-2.3) (2,000 games, run together with Nest Egg $16 and a Haggler test change). The simpler "always $2" was tried at every size and is too strong: +4.4 / +4.1 / +7.4 / +4.1 at 3 / 2 / 4 / 6 stalls, +3.1 under Hard. | Low. One more number on the card. People who chase whole orders will earn more than the computer does; that is the point of the perk. |
| 2 | **Nest Egg.** *"Start with $15 instead of $10, and buy first on day 3."* (Today $18.) | With change 1 (always-$2 variant): 3 stalls +6.5 to -1.5; Hard +4.4 to -2.1; 2 stalls +7.1 to +3.1; 4 stalls +8.6 to +1.7; 6 stalls +6.9 to +1.1. | Low. If playtests still find it strong, $14 is the next step (see the set below: it is still +3 to +6 under Normal). |
| 3 | **Upgrade costs.** Juice Bar **$6** (was $4), Premium Display **$5** (was $6), Ripening Room **$4** (was $6), Order Book **$3** (was $5), Handcart $6 (no change). | Cash against never building (3 stalls, 10 days, 500 games, SE 0.6 to 1.0): Juice Bar +6.12 to **+2.64**; Premium Display +4.65 to +4.09; Handcart +0.02 to -0.37; Ripening Room -3.82 to **-2.05**; Order Book -4.05 to **-2.22**. Gap between best and worst: $10.2 to $6.3. | Low. Costs alone do not make the Ripening Room or Order Book good; see 10.2 for the effect changes that do. |
| 4 | **Market float.** *"From day 2, no stall starts a day with less than $3: the market tops it up."* | Games with a stuck stall: 3.6% to **0%** (3 stalls, 1,500 games). Dead days 5.54% to 3.41% of stall-days. A stall wiped out after day 2 ends on $63 instead of $0 and still finishes last 61% of the time. Hands out $0.95 a stall a game; the winner gets $0.59 of it, the last-placed stall $1.30. | Medium-low. 85% of float dollars go out on days 2 to 5, all to stalls that spent nearly everything on fruit (not to wiped-out stalls), so a person can lean on it: spending down to $0 on days 1 and 2 is worth at most about $5. Spending every dollar on upgrades to trigger it gains nothing (-$0.49 +/- 0.88 with the float, -$0.99 +/- 0.96 without). A stricter version is in 10.2. |
| 5 | **Mango Windfall: deliver the extra mangoes ripe**, as the card already says. (An engine fix; no card changes.) | Mangoes sold that day +0.00 to **+0.49**; net per stall -$2.33 to -$0.65 (3 stalls, 200 positions). | Very low. |
| 6 | **Mango: green for $4** (was $3). | 3 stalls, 1,500 games: profit per mango $4.10 to **$3.30** (watermelon $2.90); mango's share of all profit 36% to **31%**; mangoes bought 22.6 to 22.0 a game; blowouts 48.5% to 44.6%; average final cash $86 to $80. | Medium. It touches the printed market mat and every player's opening (two mangoes on day 1, not three). It is the one change that makes the mango a gamble rather than the default buy. The set works without it (table below). |
| 7 | *(Not a rule.)* **Normal computer: plan prices without counting on the Haggler's tie-break.** | Haggler under Normal, current rules: 23.0% (-10.4) to **30.3% (-3.0)** (1,500 games). Under Hard the Haggler was already fair. | Low; it changes only how Normal computers price. It needs its own small plan. Without it, Rosa stays a weak rival and a weak pick against Normal computers. |

**The whole set together** (changes 1 to 6; Normal runs also use 7). Win rate minus fair share, before and after:

| Perk | 2 stalls: before, after | 3 stalls: before, after | 4 stalls: before, after | 6 stalls: before, after | 3 Hard: before, after |
|---|---|---|---|---|---|
| Haggler | -8.6, **-1.3** | -10.4, **-3.5** | -6.5, **-3.4** | -5.9, **+1.2** | -1.1, -3.2 |
| Big Basket | +1.8, -1.7 | -1.5, -2.9 | -2.0, -2.5 | -2.3, **-5.3** | -2.1, -2.6 |
| Bargain Hunter | +4.0, +1.4 | +4.7, +1.8 | +0.5, +3.8 | +3.9, +2.6 | -0.1, **+6.1** |
| Charmer | -2.2, -0.4 | +1.9, +4.3 | +4.1, -0.9 | +0.5, +1.3 | +3.9, +3.0 |
| Tip Jar | -4.9, **-0.4** | -5.8, **-1.7** | -7.2, **-1.5** | -6.3, **-1.5** | -9.3, **0.0** |
| Nest Egg | +7.1, +5.8 | +6.5, **+3.1** | +8.6, **+4.1** | +6.9, **+0.7** | +4.4, **-0.6** |
| Shade Cloth | +3.2, -1.9 | +6.6, +3.6 | +1.4, +1.0 | +0.9, -3.3 | +4.4, +3.4 |
| Sharp Ears | -1.0, -1.9 | -1.8, -4.4 | +1.3, -0.9 | +2.1, +4.3 | -0.2, **-6.5** |
| **Largest distance from fair** | 8.6, **5.8** | 10.4, **4.4** | 8.6, **4.1** | 6.9, **5.3** | 9.3, **6.5** |
| Perks more than 4 points out | 3, **1** | 5, **2** | 4, **1** | 3, **2** | 3, **2** |
| Games after / seats per perk / SE | 1,600 / ~400 / 2.5 | 1,600 / ~600 / 1.9 | 1,200 / ~600 / 1.8 | 500 / ~375 / 1.9 | 900 / ~335 / 2.5 |

| Whole set, other measures | 3 stalls before | 3 stalls after | 4 stalls before | 4 stalls after | 3 Hard before | 3 Hard after |
|---|---|---|---|---|---|---|
| Games with a stuck stall (0% by construction once the float is in) | 3.6% | **0%** | 7.4% | **0%** | 2.7% | 0% |
| Dead days (share of stall-days) | 5.54% | 3.31% | 5.83% | 2.73% | 5.40% | |
| Leader after day 5 wins | 49.3% | 45.9% | 44.5% | 42.4% | 49.3% | 48.3% |
| Last after day 5 wins | 23.7% | 27.4% | 13.2% | 15.5% | 25.4% | 23.8% |
| Lead changes per game | 2.78 | 3.08 | 3.51 | 3.80 | 2.69 | |
| Median margin, first over second | $19 | $17 | $18 | $16 | $18 | $15 |
| Blowouts (margin $20 or more) | 48.5% | 42.7% | 45.3% | 42.5% | 46.0% | 38.8% |
| Close games (margin $3 or less) | 10.5% | 12.7% | 11.8% | 11.2% | 10.1% | |
| Average final cash | $86.1 | $82.4 | $82.9 | $79.1 | $90.7 | $86.8 |
| Last place's final cash | $62.6 | $63.4 | $51.0 | $53.5 | $68.3 | |
| Mango's share of profit / profit per mango | 36% / $4.10 | 31% / $3.33 | 37% / $4.07 | 31% / $3.21 | 34% / $4.06 | |
| Float handed out per stall per game | | $0.64 | | $0.86 | | |

At 6 stalls (500 games after): stuck stalls 13.2% of games to 0%, dead days 6.62% to 2.94%, last after day 5 wins 5.6% to 8.2%, median margin $17 to $14, blowouts 44.8% to 38.4%, average cash $79.8 to $76.1, float $1.19 a stall a game (41% of stalls get something). At 2 stalls (1,600 games): leader after day 5 wins 63.4% to 58.9%, median margin $22 to $20, blowouts 54.7% to 50.8%, average cash $92.4 to $88.5.

**The set without change 6 (mango stays $3)**, 3 stalls, Normal, 1,600 games: Haggler -3.7, Big Basket -3.2, Bargain Hunter -1.9, Charmer +2.1, Tip Jar +1.4, Nest Egg +2.3, Shade Cloth +7.4, Sharp Ears -3.8; blowouts 46.6%, median margin $18, average cash $88.8, mango 36% of profit at $4.09 a piece. So the mango change is what moves the fruit balance and about half of the drop in blowouts; the shopkeeper result does not depend on it.

**What the set does not fix**

- **Shade Cloth runs high at 3 stalls** in every run: +6.6, +5.0, +3.6, +7.4 Normal; +4.4, +3.4 Hard. It is fair at 2, 4 and 6. There is no number on the card to trim.
- **Sharp Ears ends low at 3 stalls** (-4.4 Normal, -6.5 Hard, SE 1.9 and 2.5) once the weak perks are lifted. Tested fix: a flat $2 tip at every table size instead of "$1, or $2 at 4 to 6 stalls": 3 stalls -4.4 to **+2.3** (1,600 games), but 2 stalls -1.9 to +4.6. So the option that fits is "$1 at 2 stalls, $2 at 3 to 6" (move today's threshold from 4 stalls to 3). It pushes the Haggler and Big Basket to -4.7 and -4.8 at 3 stalls, so it is left out of the set.
- **Nest Egg at $15 is still +3 to +6 under Normal** (-0.6 under Hard).
- Each "after" figure has an SE of about 2 points, so a perk at +/-4 to 6 may be inside the target or just outside it. Confirming "all eight within 4 points at every size" needs about 6,000 games per table size.
- Upgrades: Ripening Room and Order Book still lose money in computer hands (10.2).

### 10.2 Bigger ideas worth a playtest (each tested, none in the diff)

| # | Idea | Measured | Why it is not in the safe list |
|---|---|---|---|
| A | **Ripening Room:** *"Your green mangoes cost $1 less and ripen in one night instead of two."* ($4) | -2.05 to **+0.80** +/- 1.1 against never building (3 stalls, 500 games). | A second effect on a card. It gives the upgrade a clear owner: the mango stall. |
| B | **Order Book:** *"You win tied bids, your fines are halved, and a standing order pays you $2 more for each piece."* ($3) | -2.22 to **+1.04** +/- 0.6. With A and B and the new costs every upgrade is between -$0.5 and +$3.8, and the computer's own picks turn from -$1.14 to +$1.10. | The Order Book's real problem is timing: the first order is bid for before any upgrade can be built. A bonus is a patch; letting stalls build on the evening of day 2 would be the cleaner fix and was not tested. |
| C | **Guests and the Tourist Bus at 5 and 6 stalls.** Let a guest join the row even when it is full (six that day). | 6 stalls, 50 positions, net per stall on the day: Superfood Trend -$0.71 to **+$1.75**, Mango Craze -$0.02 to +$2.37, Hotel Order -$0.97 to +$1.64, Kenduri -$1.11 to +$1.67, Bake-Off -$1.35 to +$1.57. Tourist Bus stays at $0.00. | Changes the "never more than five" rule. Tourist Bus still needs its own line for a full row (for example "every walk-in wants 1 more"), not tested. |
| D | **Blueberry Glut:** *"...blueberries cost $1 less at the market today"* (keep the extra delivery and the $1 lower customer price). | Blueberries bought -0.13 to **+0.40**, net per stall -$0.46 to +$0.17 (3 stalls, 200 positions). | Card text change. Small either way. |
| E | **Stricter float:** *"A stall with an empty shelf and less than $5 is topped up to $5."* | After a wipe-out on day 2: $57.6 (float $3: $63.1), 0.65 dead days in 8 (0.16). By construction it pays only a stall with nothing on its shelf (0.4 to 0.9% of stall-days today), so it cannot be reached by buying fruit. | Use it instead of change 4 if playtesters lean on the float. A loan version ($3, pay back $4 after the rush) was weaker: $40.6. |
| F | **One favour deck of 12 at every table size.** | The 12-card deck was reshuffled in 0.3% of 4-stall games and never at 2 or 3 stalls (8,400 games); the 18-card deck at 6 stalls is drawn 5.2 cards deep. | Saves six cards; needs the owner's call on components. |
| G | **Favour mix.** Fold Scout into Gossip (*"look at any face-down walk-ins, today's or tomorrow's"*), and use the two freed slots for a third Priority and a third Favoured Trade; or drop to one Fridge. | Per-card value: Fridge $4.55, Free Fruit $3.18, the other four $0 +/- 0.8. Not A/B tested (see 12). | The four "$0" cards are the social ones and are probably worth more to people than to computers. Playtest before cutting anything. |
| H | **Soft fruit sells to Everyday customers too** (Premium: Fresh only; everyone else: anything, at $2 less). Two customer types to learn, not three. | 3 stalls, 1,000 games: less fruit is lost (blueberry 5.5% to 2.3%, mango 17.3% to 13.8%), Soft sales rise from 0.3-2% to 1-11% of each fruit, games with a stuck stall 3.6% to 2.4%, dead days 5.5% to 4.9%, average cash $86 to $88. Margins and fruit shares do not move (blowouts 47.6%). | Changes pricing for every stall; a real rules change. |
| I | **Mango standing orders.** Fine $9 instead of $12, or collect three days later instead of two. | Not tested. The problem is measured in 8: 38 to 64% delivered in full, $6 to $12.55 in fines per order. | Needs its own run. |
| J | **Haggler for people.** If Rosa still feels weak after change 7: *"...and your first sale each day pays $1 more"* (the rules 8 text). | Under Normal, without change 7: -10.4 to -0.8. It would overshoot under Hard, where she is already fair. | Only if playtests ask for it. |

### 10.3 Other checks

| Question | Result |
|---|---|
| Does remembering rivals' purchases decide games? (item 1 in 11) | **Yes, a lot.** A stall whose computer plans with rivals' shelves blank (it remembers nothing it saw them buy) wins **22.8% instead of 31.8%** and ends **$9.91** poorer (+/- 1.21; 3 stalls, 500 games, same seeds). This is an upper bound for a person, who remembers some of it, but it is larger than any perk, and the shipped computer has this memory for free. Cheapest help without changing a rule: the app keeps a "what you saw them buy" note for each rival; on a table, allow pencil notes. |
| Is buying first an advantage in itself? | **Yes, strongly, and the rules already use it well.** A seat that always buys first wins **58.4%** and ends $15.73 richer (+/- 1.9); a seat that always buys last wins **9.6%** and ends $21.36 poorer (+/- 1.5) (3 stalls, 500 games, same seeds). Because the poorest stall buys first, this is the game's main catch-up rule, and it is why winners buy first on fewer days. It also explains the 6-stall picture (last after day 5 wins 5.6%): with six in line the leaders see little of the lorry. One free Priority card, by contrast, measured -$0.91 +/- 0.83: the computer plays it on the first evening whether or not the next lorry matters. |
| Does "bid minus $1" (rules 17) change standing orders? | Against the old rule (rival paid the ceiling), 3 stalls, 1,200 games: rival pieces per held order 0.18 to 0.20, rival pay per piece **$14.45 to $9.31**, fines per held order $2.19 to $2.30, delivered in full 80.5% to 79.9%. Rivals are paid a third less; nothing else moves. |
| Is any seat favoured? | No: within 2 points at every size. |
| Do events decide games? | No: the median margin is $20 with events off and $18 with them on. |
| Is there a degenerate low bid? | No: -$33 a game for the bidder. |

### 10.4 Wording to change if the set is approved

| Where | Now | New |
|---|---|---|
| Tip Jar card, `RULES.md` shopkeeper table | Customers you serve completely by yourself tip you $2. | A customer who leaves with their whole order tips you $1 if you sold them any of it, $2 if you served them alone. |
| Nest Egg | Start with $18 instead of $10... | Start with $15 instead of $10... |
| Upgrade cards and table | $4 / $6 / $6 / $6 / $5 | Juice Bar $6, Handcart $6, Premium Display $5, Ripening Room $4, Order Book $3 |
| Players and length; a day in five beats (Morning) | (nothing) | Market float: from day 2, a stall with less than $3 at dawn is topped up to $3 by the market, after any inspection and before anyone buys. |
| The fruit table, market mat | Mango unripe $3 | Mango unripe $4 |
| Mango Windfall | (card unchanged) | Rules note: the extra mangoes go into the Fresh space. |
| Money on a table | "a stall finishes a 10-day game with about $95 to $130" | about $80 to $105 (average $82, winner $102 at 3 stalls) |


---

## 11. What the rules make players memorise

"Memorise" here means information that was shown to everyone and is later hidden, or that a player can only use by knowing the decks by heart.

| # | What must be remembered | Where in the rules | Does it change who wins? | Cheapest fix |
|---|---|---|---|---|
| 1 | **What every rival bought and sold, and how old it is now.** Buying is in the open; shelves are then secret for the rest of the game. | Secret stalls (rules 15): "Everyone can watch what you take ... and remember it if they can." | **Yes. Measured in 10.3:** a stall that remembers none of it wins 22.8% instead of 31.8% and ends $9.91 poorer. The shipped computer remembers everything; a person cannot. | In the app, a "what you saw them buy" note for each rival; on a table, allow pencil notes. (A rules fix would be to leave each day's purchases face up beside the stall until the bell.) |
| 2 | The winning bid of a standing order, for two days. It sets what a rival is paid on the due day (bid - $1). | Standing orders, steps 1 and 3 | Yes for the rival deciding whether to put that fruit out on the due day (worth $1 to $2 a piece over the row, or a loss if the bid was low). | Put a price marker on the order card when it is won (the app already shows it). |
| 3 | A walk-in you peeked at (Gossip: up to four cards for a whole day; Scout; Sharp Ears every evening). | Favour cards, Sharp Ears | Only for the peeker. | Let the peeker look again at any time; mark the card with the peeker's colour (already done for Sharp Ears). |
| 4 | **Which customer cards exist.** A face-down walk-in shows only its fruits, but a player who knows the 36 cards can read much more: a back with only watermelon is always "3 watermelons at $7, Everyday" (4 cards, all identical); only mango is always "3 mangoes at $12 or $13, **Premium, Fresh only**" (3 cards); only blueberry is 3 at $3 (Bargain) or 3 at $5; only apple is "3 apples at $5, Bargain". | Customer cards; "The type stays secret while a walk-in is face down" | Yes: it is free Scout for whoever has learnt the deck. | Print a "what a card back can mean" strip on the player aid, so it is public knowledge rather than a memory edge. |
| 5 | Which events, lorries and customers have already come out. Events: 20 cards, 9 used in a 10-day game, so each seen card rules itself out. Lorries: at most 15 of 20. Customers: the deck is gone through once at 3 or 4 stalls and about twice at 6. | Decks running out | A little: knowing no Mango Craze is left changes a mango bet. Not measured (the computer does not count cards). | Keep every discard pile face up and allow anyone to look through it. |
| 6 | Which favour cards have been played (the pile is public) and how many each rival holds (public). | Favour cards | Small: favours are rare (one a game per stall). | Face-up discard pile. |
| 7 | The six Premium and six Bargain customers by name. | The bell | No: the type is printed on the card front. Only the walk-in backs hide it (see 4). | Already on the card. |
| 8 | Rivals' usual prices on earlier days. | The bell | Soft knowledge; this is the bluffing game, not bookkeeping. | Leave it. |

Nothing else that is public is later hidden: cash, perks, upgrades, favour-card counts, bidding status (rules 17), tomorrow's lorry, tomorrow's regular and the backs of tomorrow's walk-ins (rules 16) all stay on the table.

---

## 12. Not measured, and why

| Not measured | Why |
|---|---|
| Anything a person does differently from the computer: buying for tomorrow's visible crowd, holding apples, bluffing with the crate count, chasing sole serves for the Tip Jar, using Gossip or Scout properly, farming $1 soft fruit for a Juice Bar. | The computers do not do these. Marked "AI limit" wherever it changes a conclusion. The honest check is a playtest. |
| 5 stalls. | Not asked for; it sits between 4 and 6 and shares the 6-stall row rules (row full, guests replace a walk-in, Tourist Bus does nothing). |
| Hard computers at 2 and 6 stalls; the upgrade, favour, order and safety-net tests under Hard and at sizes other than 3 (4 for the safety net). | Time. `balance2.log` covers the upgrade test under Hard at 3 stalls. |
| The value of each favour card when a *person* plays it, and any A/B of the favour deck's make-up. | Effects are under $1 a game per stall with computers; it would need about 10,000 games per variant. The recommendation in 10 is from the per-card values. |
| Card counting (item 5 above). | The computer does not count cards. |
| The deliberate "spend to under $3 every dawn" use of the float by a clever person. | Only bounded (about $5 over days 2 and 3) and measured as it happens to computers ($0.95 per stall per game). |
| 8-day and 14-day games for everything except upgrades. | Time; `balance2.log` has game shape by length. |
| `npm run verify` on the recommended set. | Out of scope for a lab run. The unit tests were run on a clean copy with `recommended.diff` applied: 441 pass, 10 fail, all listed at the end of the appendix. Eight pin the old numbers or the rules version. Two need a look: `juice-night` assumes the only overnight cash change is juice or an inspection (the float is a new one), and `story-after-sale` finds one wrong "what-if" line in the new seeded games (seed 61, day 8). |

---

## 13. How to reproduce

Everything was run in a private worktree at commit `b5df35d`; nothing was committed or pushed. To rebuild it:

```bash
# 1. In a worktree at b5df35d, with the scripts from lab/scripts/ copied to scripts/lab/
npm ci
git apply /path/to/lab/lab-engine.diff     # the LAB switches (all off: the engine plays exactly as before)
OUT=/path/to/out

# 2. Baselines (each prints games per second; about 15 / 8 / 4 games a second at 3 / 4 / 6 stalls)
npx vite-node scripts/lab/sim.ts -- --n 3 --games 2800 --level normal --out $OUT/base-n3-normal.jsonl
npx vite-node scripts/lab/sim.ts -- --n 2 --games 3600 --out $OUT/base-n2-normal.jsonl
npx vite-node scripts/lab/sim.ts -- --n 4 --games 2000 --out $OUT/base-n4-normal.jsonl
npx vite-node scripts/lab/sim.ts -- --n 6 --games 1300 --out $OUT/base-n6-normal.jsonl
npx vite-node scripts/lab/sim.ts -- --n 3 --games 1600 --level hard --out $OUT/base-n3-hard.jsonl
npx vite-node scripts/lab/sim.ts -- --n 4 --games 1200 --level hard --out $OUT/base-n4-hard.jsonl
npx vite-node scripts/lab/sim.ts -- --n 3 --games 1200 --mix easy,normal,normal --out $OUT/base-n3-mix.jsonl
npx vite-node scripts/lab/analyze.ts -- --in $OUT/base-n3-normal.jsonl          # all tables; --sections 1,2,6 for some
npx vite-node scripts/lab/stuck.ts -- --in $OUT/base-n3-normal.jsonl --show 5   # ledgers of stuck stalls

# 3. Tests
npx vite-node scripts/lab/focal.ts -- --test perks --n 3 --games 400            # each perk against no perk
npx vite-node scripts/lab/focal.ts -- --test upgrades --n 3 --games 700 --days 10   # also --days 8 / 14 with --games 400
npx vite-node scripts/lab/focal.ts -- --test favours --n 3 --games 700
npx vite-node scripts/lab/focal.ts -- --test orders --n 3 --games 700
npx vite-node scripts/lab/focal.ts -- --test memory --n 3 --games 500
npx vite-node scripts/lab/focal.ts -- --test firstbuyer --n 3 --games 500
npx vite-node scripts/lab/focal.ts -- --test drain --n 3 --games 500 [--patch float3]
npx vite-node scripts/lab/events.ts -- --n 3 --games 300     # --n 2 --games 150, --n 4 --games 200, --n 6 --games 80
npx vite-node scripts/lab/cash.ts -- --n 3 --games 160 --shockdays 2,5,8
npx vite-node scripts/lab/cash.ts -- --n 3 --games 160 --shockdays 2,5 --nets float3,float3loan,float5empty,float4
npx vite-node scripts/lab/cash.ts -- --n 4 --games 100 --shockdays 5 --nets none,float3,credit2,oddJobs3
npx vite-node scripts/lab/ties.ts -- --n 3 --games 250       # and --level hard --games 150

# 4. Variants: any sim / focal / events run takes --patch name,name (names in scripts/lab/patches.ts)
npx vite-node scripts/lab/sim.ts -- --n 3 --games 2000 --patch tipShared2,nest15,aiPlainHaggler --out $OUT/v2-n3.jsonl
npx vite-node scripts/lab/focal.ts -- --test upgrades --n 3 --games 500 --patch juice6,premium5,ripening4,book3
npx vite-node scripts/lab/events.ts -- --n 3 --games 200 --patch windfallRipe,glutCheap
npx vite-node scripts/lab/sim.ts -- --n 3 --games 1500 --patch float3 --out $OUT/float3-n3.jsonl
npx vite-node scripts/lab/floatdays.ts -- --in $OUT/float3-n3.jsonl

# 5. The recommended set
SET=tipShared1,nest15,juice6,premium5,ripening4,book3,float3,windfallRipe,mangoCost4
npx vite-node scripts/lab/sim.ts -- --n 3 --games 1600 --patch $SET,aiPlainHaggler --out $OUT/final-n3.jsonl
npx vite-node scripts/lab/sim.ts -- --n 3 --games 900 --level hard --patch $SET --out $OUT/final-n3-hard.jsonl

# 6. The diff, checked against the switches (60 seeded games must match), and the unit tests on a clean copy
python3 scripts/lab/make_recommended_diff.py /path/to/lab
bash scripts/lab/check_diff.sh /path/to/lab $SET
bash scripts/lab/test_diff.sh /path/to/lab
```

The lane scripts (`laneA.sh` to `laneI.sh`, `chain.sh`) are the exact batches that produced `lab/out/`. `lab/lab-engine.diff` is the complete lab engine against `b5df35d`. (`patch_engine.py`, `patch_lab2.py` and `patch_lab3.py` are how the switches were first added; a few more were added by hand during the session, so use the diff, not those three files.)

`recommended.diff` applies to `b5df35d` with `git apply`; `recommended-no-mango.diff` is the same set without change 6. It contains no lab switches. It changes `src/engine/data.ts`, `src/engine/game.ts` and `RULES_VERSION` (17 to 18) only; `RULES.md`, the card texts in the print scripts, the morning card (to show a float) and the ten tests listed in the appendix still need doing.

---

## Appendix: raw tables as the scripts printed them

Every file below is also in `lab/out/`. Baselines first, then the tests, then the recommended set. In tables for patched runs, the cost column of "Upgrades the computer built" and the "Perk cash/game" column still show today's labels ($4 Juice Bar, $8 Nest Egg; Tip Jar counts only its $2 tips): the analysis script does not load the patch.


#### `an-n2-normal.md`

### base-n2-normal.jsonl: 2 stalls, normal/normal AI, 10 days, 3600 games

**Shopkeepers** (fair = 50%)

| Perk | Seats | Win % | SE | vs fair | Avg cash | Cash vs table | SE | Sole serves/game | Favours earned | Pieces bought | Spoiled | Perk cash/game |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| Haggler | 881 | 41.4 | 1.7 | -8.6 | 84.8 | -5.4 | 0.7 | 1.14 | 1.1 | 28.9 | 2.16 |  |
| Big Basket | 962 | 51.8 | 1.6 | +1.8 | 90.6 | -0.2 | 0.7 | 1.4 | 1.34 | 30.6 | 2.23 |  |
| Bargain Hunter | 895 | 54 | 1.7 | +4 | 96 | +2.2 | 0.7 | 1.35 | 1.3 | 30.3 | 2.19 |  |
| Charmer | 882 | 47.8 | 1.7 | -2.2 | 93.1 | +0.5 | 0.7 | 1.33 | 1.32 | 28.9 | 1.9 |  |
| Tip Jar | 882 | 45.1 | 1.7 | -4.9 | 87.6 | -3 | 0.8 | 1.22 | 1.17 | 28.9 | 2.12 | 2.4 |
| Nest Egg | 919 | 57.1 | 1.6 | +7.1 | 97.8 | +4.4 | 0.7 | 1.31 | 1.26 | 30.8 | 2.17 | 8 |
| Shade Cloth | 879 | 53.2 | 1.7 | +3.2 | 96 | +1.6 | 0.7 | 1.37 | 1.31 | 28.2 | 0.06 |  |
| Sharp Ears | 900 | 49 | 1.7 | -1 | 93 | -0.4 | 0.7 | 1.35 | 1.29 | 29.1 | 2.02 | 4.9 |

**Fruit roles** (per game, whole table)

| Fruit | Delivered | Bought | % of lorry bought | Free (favour) | Sold to row | Sold to order | Hawker | Spoiled | Juiced | Jam (ripe left) | Green left | Avg cost | Avg row price | Profit / piece bought | Share of profit % |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| Blueberry | 21.6 | 12.8 | 59.6 | 0.05 | 10.6 | 1.02 | 0.12 | 0.54 | 0.12 | 0.46 | 0 | 1.68 | 4.45 | 2.64 | 18.5 |
| Watermelon | 19.7 | 14.9 | 75.5 | 0.13 | 12.8 | 1.42 | 0.1 | 0.24 | 0.06 | 0.43 | 0 | 2.83 | 6.05 | 3.21 | 26.1 |
| Apple | 17.9 | 14.1 | 79.1 | 0.13 | 12.3 | 1.32 | 0.11 | 0.06 | 0.01 | 0.43 | 0 | 2.91 | 5.65 | 2.8 | 21.6 |
| Mango | 20.5 | 17.1 | 83.2 | 0.19 | 8.8 | 1.07 | 0.44 | 2.89 | 0.67 | 3 | 0.38 | 2.97 | 10.5 | 3.64 | 33.9 |

| Fruit | Sold Fresh % | Okay % | Soft % | Nights on shelf / piece | Loss rate % (spoiled+juiced / got) | Wanted / game | Row demand served % | Days wanted > put out % | Days some demand unserved % |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| Blueberry | 65.5 | 33.3 | 1.2 | 0.25 | 5.1 | 18.2 | 58.6 | 50.7 | 55.7 |
| Watermelon | 82.8 | 16.3 | 0.8 | 0.27 | 2 | 19.8 | 64.6 | 46.8 | 48.7 |
| Apple | 94.4 | 5.2 | 0.4 | 0.3 | 0.5 | 20.5 | 60.1 | 50.5 | 51.3 |
| Mango | 74.4 | 23.1 | 2.5 | 2.56 | 20.6 | 17.3 | 51.1 | 43.4 | 56.6 |

**Upgrades the computer built**

| Upgrade | Cost | % of stalls that built it | Avg day built | Win % of stalls with it | Win % without | Cash vs table with it |
| --- | --- | --- | --- | --- | --- | --- |
| Juice Bar | $4 | 17.7 | 5.1 | 52.6 | 49.4 | 2.6 |
| Handcart | $6 | 65.2 | 5.3 | 55.7 | 39.4 | 3.2 |
| Premium Display | $6 | 6.1 | 6 | 67.6 | 48.8 | 8 |
| Ripening Room | $6 | 63.1 | 4.2 | 51.7 | 47 | 1.7 |
| Order Book | $5 | 20.5 | 3 | 48.5 | 50.4 | 0.1 |

Stalls ending with 0 / 1 / 2 upgrades: 3.5% / 20.3% / 76.2%

**Favours** (per game, whole table unless stated)

| Card | Dealt at start (Charmer) | Earned | Played | Unplayed at end | % of copies gained that were played |
| --- | --- | --- | --- | --- | --- |
| Gossip | 0.17 | 0.42 | 0.47 | 0.12 | 79.5 |
| Free Fruit | 0.15 | 0.42 | 0.5 | 0.08 | 87 |
| Priority | 0.17 | 0.41 | 0.51 | 0.07 | 87.7 |
| Scout | 0.17 | 0.42 | 0 | 0.58 | 0 |
| Favoured Trade | 0.15 | 0.43 | 0.5 | 0.08 | 85.9 |
| Fridge | 0.17 | 0.42 | 0.45 | 0.15 | 74.6 |

Favours earned per stall per game: 1.26 (sd 1.1); sole serves per game (table): 2.62; of those that drew a card: 96.5%.
Deck reshuffles per game: 0; games with at least one reshuffle: 0%; days ending with an empty deck: 0%.

**Events in the batch** (difference from the average of the same day number; see events.ts for the paired test)

| Event | Days | Income / stall vs same day | SE | Pieces lost that night / stall vs same day | Income spread (best - worst stall) |
| --- | --- | --- | --- | --- | --- |
| Festival | 1598 | 6.54 | 0.2 | 0 | 17.1 |
| Superfood Trend | 1599 | 2.89 | 0.17 | -0.01 | 15.5 |
| Mango Craze | 1627 | 3.04 | 0.19 | 0.01 | 18.1 |
| Hotel Order | 1616 | 3.96 | 0.17 | -0.01 | 15.2 |
| Heatwave | 1651 | 0.13 | 0.15 | 0.36 | 15 |
| Apple Blight | 1667 | -1.27 | 0.16 | 0 | 14.1 |
| Blueberry Glut | 1595 | -1.96 | 0.15 | -0.01 | 14.6 |
| Good Harvest | 1658 | -3.9 | 0.14 | 0 | 13 |
| Bad Harvest | 1603 | 0.61 | 0.17 | -0.01 | 15.9 |
| Price Hike | 1629 | -1.69 | 0.16 | -0.01 | 14.1 |
| Price Controls | 1647 | -2.3 | 0.14 | 0 | 13.4 |
| Health Inspector | 1447 | -1.3 | 0.16 | 0.01 | 13.9 |
| Lorry Breakdown | 1654 | -4.46 | 0.17 | 0.06 | 13.5 |
| Tourist Bus | 1614 | 6.78 | 0.21 | 0.02 | 16.5 |
| Monsoon Downpour | 1680 | -7.67 | 0.12 | -0.29 | 11.3 |
| Durian Season | 1633 | -3.67 | 0.14 | 0.02 | 12.5 |
| Kenduri | 1685 | 4.01 | 0.18 | 0.01 | 16 |
| Mango Windfall | 1591 | -2.98 | 0.14 | 0 | 13.4 |
| Pasar Malam | 1582 | 1.05 | 0.15 | -0.17 | 14.2 |
| Bake-Off | 1624 | 2.57 | 0.17 | 0.03 | 14.9 |

**Running out of cash** (stall-days from day 2)

| AI level | Stall-days | Dawn cash < $3, nothing ripe % | Cash < $3 and no fruit at all (stuck) % | Cash $0, nothing ripe % | Cannot pay for any piece, nothing ripe % | Dead days % (no purchase, $0 income) | of which dawn cash < $3 % | of which had ripe fruit % | Dead on the last day % |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| normal | 64800 | 0.92 | 0.39 | 0.4 | 0.65 | 3.87 | 41.2 | 58.3 | 5.14 |

Games with at least one stuck dawn (cash < $3 and no fruit at all): 2.1%; with at least one dead day: 43.7%.

Stalls with a stuck dawn: 77 (0.02 per game). First broke on day 7.4 on average. Afterwards: average final rank 2 of 2 (last place 100%), final cash $2.3 (table average $92.4), income per remaining day $0.9, never earned again 88.3%.
Largest outflow in the two days before: other 57.1%, standing-order fine 39%, fruit that did not sell 2.6%, Health Inspector 1.3%.

**Standing orders**

| Order fruit | Orders turned over | Nobody bid % | Bidders / order | Winning bid | Bid / ceiling % | Holder delivered all % | Pieces short | Fine paid / held order | Rival pieces / held order | Rival pay / piece | Holder margin (bid - cost, less fine) |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| Blueberry | 0.49 | 25.5 | 1.49 | 6.41 | 71.2 | 80 | 0.31 | 1.38 | 0.07 | 5.4 | 10.51 |
| Watermelon | 0.51 | 3 | 1.94 | 8.07 | 67.3 | 85.5 | 0.23 | 1.12 | 0.07 | 7.01 | 12.96 |
| Apple | 0.48 | 3.4 | 1.92 | 7.77 | 70.6 | 89.8 | 0.16 | 0.74 | 0.04 | 6.81 | 12.8 |
| Mango | 0.52 | 27 | 1.16 | 13.47 | 74.8 | 73.5 | 0.42 | 3.88 | 0.25 | 12.47 | 23.09 |
| All | 2 | 14.9 | 1.62 | 8.83 | 70.7 | 82.8 | 0.27 | 1.68 | 0.1 | 9.71 | 14.64 |

Holder's cash gain over the three days of the order, less the average rival's: $7.25 (SE 0.35, 6130 orders). Holders are self-selected (they bid lowest), so read this with the forced-bid test in orders.ts.

**Game shape**

| Measure | Value |
| --- | --- |
| Leader after day 5 wins | 63.4% (SE 0.8) |
| Last after day 5 wins (comeback) | 36.4% (SE 0.8) |
| Lead changes per game | 1.74 |
| Average final cash | $92.4 |
| Winner / last place cash | $107.8 / $77 |
| Median margin 1st - 2nd | $22 |
| Close games (margin <= $3) | 9.8% |
| Blowouts (margin >= $20) | 54.7% |
| Spread of final cash in a game (sd) | $21.8 |
| Win % by seat (seat 0 first) | 51.3 / 48.7 |
| Days bought first: winners vs everyone | 3.87 vs 5 |
| Win % by days bought first | 0d: 85.1% (276), 1d: 85.4% (556), 2d: 71.5% (667), 3d: 67.3% (792), 4d: 57.4% (841), 5d: 50% (936), 6d: 42.6% (841), 7d: 32.7% (792), 8d: 28.5% (667), 9d: 14.6% (556), 10d: 14.9% (276) |


#### `an-n3-normal.md`

### base-n3-normal.jsonl: 3 stalls, normal/normal/normal AI, 10 days, 2800 games

**Shopkeepers** (fair = 33.3%)

| Perk | Seats | Win % | SE | vs fair | Avg cash | Cash vs table | SE | Sole serves/game | Favours earned | Pieces bought | Spoiled | Perk cash/game |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| Haggler | 1058 | 23 | 1.3 | -10.4 | 79.1 | -6.3 | 0.7 | 0.96 | 0.93 | 27.6 | 1.67 |  |
| Big Basket | 1059 | 31.8 | 1.4 | -1.5 | 83.3 | -1.7 | 0.8 | 1.09 | 1.06 | 29.3 | 1.72 |  |
| Bargain Hunter | 1053 | 38.1 | 1.5 | +4.7 | 91.1 | +4.3 | 0.7 | 1.01 | 0.99 | 29.1 | 1.67 |  |
| Charmer | 1044 | 35.2 | 1.5 | +1.9 | 86.6 | +0.8 | 0.7 | 1.02 | 1.01 | 27.6 | 1.5 |  |
| Tip Jar | 1043 | 27.5 | 1.4 | -5.8 | 81.5 | -3.8 | 0.8 | 0.94 | 0.91 | 27.4 | 1.64 | 1.9 |
| Nest Egg | 1065 | 39.8 | 1.5 | +6.5 | 91.2 | +4 | 0.7 | 0.95 | 0.93 | 29.3 | 1.91 | 8 |
| Shade Cloth | 1014 | 39.9 | 1.5 | +6.6 | 90.8 | +3.9 | 0.7 | 1.08 | 1.04 | 27.8 | 0.03 |  |
| Sharp Ears | 1064 | 31.5 | 1.4 | -1.8 | 85.2 | -1.1 | 0.8 | 1 | 0.97 | 27.8 | 1.69 | 4.2 |

**Fruit roles** (per game, whole table)

| Fruit | Delivered | Bought | % of lorry bought | Free (favour) | Sold to row | Sold to order | Hawker | Spoiled | Juiced | Jam (ripe left) | Green left | Avg cost | Avg row price | Profit / piece bought | Share of profit % |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| Blueberry | 28 | 19.3 | 69.1 | 0.07 | 16.3 | 1.18 | 0.2 | 0.86 | 0.2 | 0.72 | 0 | 1.72 | 4.28 | 2.39 | 18 |
| Watermelon | 27.1 | 22.8 | 84.1 | 0.22 | 20.2 | 1.51 | 0.19 | 0.32 | 0.08 | 0.72 | 0 | 2.86 | 5.84 | 2.92 | 25.9 |
| Apple | 22.7 | 20.1 | 88.4 | 0.15 | 18.1 | 1.31 | 0.17 | 0.08 | 0.02 | 0.53 | 0 | 2.91 | 5.47 | 2.58 | 20.1 |
| Mango | 26.1 | 22.6 | 86.5 | 0.2 | 13.3 | 1.17 | 0.49 | 3.19 | 0.74 | 3.42 | 0.44 | 2.96 | 10.3 | 4.1 | 36 |

| Fruit | Sold Fresh % | Okay % | Soft % | Nights on shelf / piece | Loss rate % (spoiled+juiced / got) | Wanted / game | Row demand served % | Days wanted > put out % | Days some demand unserved % |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| Blueberry | 68.4 | 30 | 1.6 | 0.28 | 5.5 | 26.2 | 62.1 | 47.5 | 55.1 |
| Watermelon | 85.6 | 13.8 | 0.6 | 0.28 | 1.7 | 28.4 | 71.2 | 41.5 | 44.1 |
| Apple | 95.1 | 4.6 | 0.3 | 0.27 | 0.5 | 29.5 | 61.3 | 52 | 53.5 |
| Mango | 77.8 | 20.2 | 2 | 2.43 | 17.3 | 25.3 | 52.8 | 44.8 | 56.1 |

**Upgrades the computer built**

| Upgrade | Cost | % of stalls that built it | Avg day built | Win % of stalls with it | Win % without | Cash vs table with it |
| --- | --- | --- | --- | --- | --- | --- |
| Juice Bar | $4 | 17 | 4.9 | 39.3 | 32.1 | 4.6 |
| Handcart | $6 | 66.4 | 5.3 | 36.4 | 27.3 | 3.1 |
| Premium Display | $6 | 6.7 | 6 | 42.2 | 32.7 | 7 |
| Ripening Room | $6 | 61.6 | 4.2 | 35.5 | 29.9 | 2.3 |
| Order Book | $5 | 22.1 | 3 | 28.8 | 34.6 | -1.8 |

Stalls ending with 0 / 1 / 2 upgrades: 3.4% / 19.5% / 77.1%

**Favours** (per game, whole table unless stated)

| Card | Dealt at start (Charmer) | Earned | Played | Unplayed at end | % of copies gained that were played |
| --- | --- | --- | --- | --- | --- |
| Gossip | 0.26 | 0.48 | 0.65 | 0.09 | 88.1 |
| Free Fruit | 0.24 | 0.47 | 0.63 | 0.08 | 88.8 |
| Priority | 0.25 | 0.48 | 0.64 | 0.09 | 88 |
| Scout | 0.25 | 0.51 | 0 | 0.76 | 0 |
| Favoured Trade | 0.23 | 0.5 | 0.65 | 0.08 | 88.5 |
| Fridge | 0.26 | 0.49 | 0.52 | 0.23 | 69.7 |

Favours earned per stall per game: 0.98 (sd 0.95); sole serves per game (table): 3.02; of those that drew a card: 97%.
Deck reshuffles per game: 0; games with at least one reshuffle: 0%; days ending with an empty deck: 0%.

**Events in the batch** (difference from the average of the same day number; see events.ts for the paired test)

| Event | Days | Income / stall vs same day | SE | Pieces lost that night / stall vs same day | Income spread (best - worst stall) |
| --- | --- | --- | --- | --- | --- |
| Festival | 1236 | 5.6 | 0.18 | 0 | 26.3 |
| Superfood Trend | 1249 | 1.94 | 0.15 | 0 | 23.2 |
| Mango Craze | 1275 | 2.07 | 0.17 | 0.01 | 26.2 |
| Hotel Order | 1259 | 3.05 | 0.16 | 0.02 | 23.3 |
| Heatwave | 1263 | 0.56 | 0.15 | 0.28 | 22.6 |
| Apple Blight | 1275 | -1.53 | 0.15 | 0.01 | 21.8 |
| Blueberry Glut | 1255 | -1.46 | 0.14 | 0.01 | 20.9 |
| Good Harvest | 1276 | -3.12 | 0.12 | 0 | 19.4 |
| Bad Harvest | 1248 | 0.41 | 0.15 | -0.01 | 24.4 |
| Price Hike | 1278 | -1.32 | 0.14 | 0 | 21.4 |
| Price Controls | 1274 | -1.53 | 0.13 | 0.02 | 20.5 |
| Health Inspector | 1133 | -0.45 | 0.15 | 0 | 21.8 |
| Lorry Breakdown | 1295 | -4.48 | 0.15 | 0.04 | 20.5 |
| Tourist Bus | 1257 | 4.79 | 0.18 | 0 | 25.3 |
| Monsoon Downpour | 1308 | -5.17 | 0.11 | -0.23 | 18.5 |
| Durian Season | 1271 | -3.24 | 0.13 | 0.02 | 19.1 |
| Kenduri | 1306 | 3.04 | 0.15 | 0 | 23.9 |
| Mango Windfall | 1231 | -2.07 | 0.13 | -0.01 | 20.3 |
| Pasar Malam | 1235 | 1.52 | 0.14 | -0.14 | 21.3 |
| Bake-Off | 1276 | 1.75 | 0.15 | 0 | 23.1 |

**Running out of cash** (stall-days from day 2)

| AI level | Stall-days | Dawn cash < $3, nothing ripe % | Cash < $3 and no fruit at all (stuck) % | Cash $0, nothing ripe % | Cannot pay for any piece, nothing ripe % | Dead days % (no purchase, $0 income) | of which dawn cash < $3 % | of which had ripe fruit % | Dead on the last day % |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| normal | 75600 | 1.7 | 0.44 | 0.42 | 1.27 | 5.54 | 41.7 | 45.7 | 6.74 |

Games with at least one stuck dawn (cash < $3 and no fruit at all): 3.6%; with at least one dead day: 71.7%.

Stalls with a stuck dawn: 102 (0.04 per game). First broke on day 7.3 on average. Afterwards: average final rank 3 of 3 (last place 100%), final cash $2.3 (table average $86.1), income per remaining day $0.9, never earned again 83.3%.
Largest outflow in the two days before: other 52%, standing-order fine 38.2%, Health Inspector 8.8%, fruit that did not sell 1%.

**Standing orders**

| Order fruit | Orders turned over | Nobody bid % | Bidders / order | Winning bid | Bid / ceiling % | Holder delivered all % | Pieces short | Fine paid / held order | Rival pieces / held order | Rival pay / piece | Holder margin (bid - cost, less fine) |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| Blueberry | 0.49 | 14.9 | 2.55 | 6.26 | 69.5 | 79.3 | 0.35 | 1.51 | 0.15 | 5.28 | 9.78 |
| Watermelon | 0.52 | 0.8 | 2.98 | 7.92 | 66 | 88.7 | 0.21 | 0.91 | 0.12 | 6.87 | 12.83 |
| Apple | 0.47 | 3.1 | 2.9 | 7.56 | 68.8 | 85.2 | 0.27 | 1.12 | 0.12 | 6.68 | 11.32 |
| Mango | 0.51 | 17.6 | 1.75 | 13.4 | 74.4 | 64 | 0.67 | 6.08 | 0.43 | 12.33 | 18.2 |
| All | 2 | 9.1 | 2.54 | 8.72 | 69.5 | 79.9 | 0.36 | 2.3 | 0.2 | 9.31 | 12.99 |

Holder's cash gain over the three days of the order, less the average rival's: $7.97 (SE 0.35, 5089 orders). Holders are self-selected (they bid lowest), so read this with the forced-bid test in orders.ts.

**Game shape**

| Measure | Value |
| --- | --- |
| Leader after day 5 wins | 49.3% (SE 0.9) |
| Last after day 5 wins (comeback) | 23.7% (SE 0.8) |
| Lead changes per game | 2.78 |
| Average final cash | $86.1 |
| Winner / last place cash | $109.5 / $62.6 |
| Median margin 1st - 2nd | $19 |
| Close games (margin <= $3) | 10.5% |
| Blowouts (margin >= $20) | 48.5% |
| Spread of final cash in a game (sd) | $24.6 |
| Win % by seat (seat 0 first) | 34.1 / 33.7 / 32.1 |
| Days bought first: winners vs everyone | 2.53 vs 3.33 |
| Win % by days bought first | 0d: 43.9% (1030), 1d: 44.5% (1317), 2d: 38.2% (1354), 3d: 37.4% (1191), 4d: 32% (1014), 5d: 28.6% (796), 6d: 19.6% (616), 7d: 16.7% (438), 8d: 11.4% (308), 9d: 7.3% (220), 10d: 2.6% (116) |


#### `an-n4-normal.md`

### base-n4-normal.jsonl: 4 stalls, normal/normal/normal/normal AI, 10 days, 2000 games

**Shopkeepers** (fair = 25%)

| Perk | Seats | Win % | SE | vs fair | Avg cash | Cash vs table | SE | Sole serves/game | Favours earned | Pieces bought | Spoiled | Perk cash/game |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| Haggler | 998 | 18.5 | 1.2 | -6.5 | 75.9 | -6.5 | 0.9 | 0.87 | 0.84 | 28 | 1.66 |  |
| Big Basket | 1000 | 23 | 1.3 | -2 | 80.2 | -2.1 | 0.9 | 1.01 | 0.99 | 30.3 | 1.72 |  |
| Bargain Hunter | 1017 | 25.5 | 1.4 | +0.5 | 86.3 | +3.1 | 0.8 | 0.93 | 0.9 | 29.5 | 1.69 |  |
| Charmer | 976 | 29.1 | 1.5 | +4.1 | 85.8 | +2.7 | 0.9 | 1.02 | 1.02 | 28.1 | 1.34 |  |
| Tip Jar | 1026 | 17.8 | 1.2 | -7.2 | 76.2 | -6.2 | 0.9 | 0.81 | 0.78 | 27.7 | 1.65 | 1.6 |
| Nest Egg | 1009 | 33.6 | 1.5 | +8.6 | 88.8 | +5.5 | 0.8 | 0.91 | 0.89 | 29.6 | 1.81 | 8 |
| Shade Cloth | 974 | 26.4 | 1.4 | +1.4 | 87.3 | +3.7 | 0.8 | 0.97 | 0.93 | 27.8 | 0.02 |  |
| Sharp Ears | 1000 | 26.3 | 1.4 | +1.3 | 83 | -0.1 | 0.9 | 0.96 | 0.94 | 27.5 | 1.51 | 7.2 |

**Fruit roles** (per game, whole table)

| Fruit | Delivered | Bought | % of lorry bought | Free (favour) | Sold to row | Sold to order | Hawker | Spoiled | Juiced | Jam (ripe left) | Green left | Avg cost | Avg row price | Profit / piece bought | Share of profit % |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| Blueberry | 40.2 | 26.9 | 67 | 0.08 | 22.1 | 1.72 | 0.3 | 1.29 | 0.4 | 1.21 | 0 | 1.7 | 4.05 | 2.19 | 18 |
| Watermelon | 37.5 | 30.7 | 81.9 | 0.27 | 26.9 | 2.02 | 0.24 | 0.5 | 0.15 | 1.18 | 0 | 2.84 | 5.62 | 2.69 | 25.2 |
| Apple | 30.6 | 26.6 | 86.7 | 0.22 | 23.9 | 1.68 | 0.22 | 0.1 | 0.03 | 0.82 | 0 | 2.91 | 5.3 | 2.4 | 19.4 |
| Mango | 34.9 | 30.1 | 86.1 | 0.25 | 18.1 | 1.47 | 0.61 | 3.83 | 1.18 | 4.58 | 0.56 | 2.96 | 10.1 | 4.07 | 37.4 |

| Fruit | Sold Fresh % | Okay % | Soft % | Nights on shelf / piece | Loss rate % (spoiled+juiced / got) | Wanted / game | Row demand served % | Days wanted > put out % | Days some demand unserved % |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| Blueberry | 64.9 | 33 | 2.1 | 0.32 | 6.3 | 33 | 66.9 | 41 | 52.7 |
| Watermelon | 84 | 15.1 | 0.9 | 0.3 | 2.1 | 35.7 | 75.2 | 37.3 | 41.4 |
| Apple | 94.9 | 4.8 | 0.3 | 0.3 | 0.5 | 37.4 | 63.9 | 48.9 | 51.4 |
| Mango | 77.9 | 20.2 | 1.9 | 2.45 | 16.5 | 32.2 | 56.4 | 41.9 | 52.8 |

**Upgrades the computer built**

| Upgrade | Cost | % of stalls that built it | Avg day built | Win % of stalls with it | Win % without | Cash vs table with it |
| --- | --- | --- | --- | --- | --- | --- |
| Juice Bar | $4 | 22.8 | 4.8 | 29.3 | 23.7 | 6 |
| Handcart | $6 | 63.1 | 5.3 | 28.4 | 19.1 | 3.9 |
| Premium Display | $6 | 6.3 | 6 | 32.5 | 24.5 | 8 |
| Ripening Room | $6 | 54.7 | 4.2 | 27.2 | 22.4 | 3.3 |
| Order Book | $5 | 22.4 | 3 | 21.4 | 26 | -1.4 |

Stalls ending with 0 / 1 / 2 upgrades: 4.6% / 21.7% / 73.7%

**Favours** (per game, whole table unless stated)

| Card | Dealt at start (Charmer) | Earned | Played | Unplayed at end | % of copies gained that were played |
| --- | --- | --- | --- | --- | --- |
| Gossip | 0.34 | 0.62 | 0.85 | 0.1 | 89.3 |
| Free Fruit | 0.31 | 0.61 | 0.82 | 0.1 | 89.3 |
| Priority | 0.32 | 0.6 | 0.83 | 0.09 | 90.4 |
| Scout | 0.33 | 0.6 | 0 | 0.94 | 0 |
| Favoured Trade | 0.31 | 0.63 | 0.84 | 0.1 | 89.5 |
| Fridge | 0.34 | 0.59 | 0.67 | 0.26 | 72.5 |

Favours earned per stall per game: 0.91 (sd 0.93); sole serves per game (table): 3.74; of those that drew a card: 97.4%.
Deck reshuffles per game: 0; games with at least one reshuffle: 0.3%; days ending with an empty deck: 0.1%.

**Events in the batch** (difference from the average of the same day number; see events.ts for the paired test)

| Event | Days | Income / stall vs same day | SE | Pieces lost that night / stall vs same day | Income spread (best - worst stall) |
| --- | --- | --- | --- | --- | --- |
| Festival | 887 | 4.83 | 0.18 | -0.01 | 32.9 |
| Superfood Trend | 907 | 1.6 | 0.16 | -0.03 | 29.9 |
| Mango Craze | 891 | 1.86 | 0.18 | 0.03 | 33 |
| Hotel Order | 899 | 2 | 0.16 | -0.01 | 28.7 |
| Heatwave | 899 | 1.05 | 0.15 | 0.28 | 28.6 |
| Apple Blight | 911 | -0.48 | 0.16 | 0.01 | 28 |
| Blueberry Glut | 897 | -0.77 | 0.15 | 0.03 | 27.3 |
| Good Harvest | 905 | -2.61 | 0.14 | 0.02 | 24.5 |
| Bad Harvest | 891 | 1.63 | 0.17 | -0.01 | 29.9 |
| Price Hike | 920 | -0.53 | 0.16 | -0.01 | 27.2 |
| Price Controls | 925 | -0.98 | 0.14 | -0.02 | 25.9 |
| Health Inspector | 805 | -0.29 | 0.16 | -0.01 | 27.1 |
| Lorry Breakdown | 918 | -3.39 | 0.17 | 0.04 | 25.6 |
| Tourist Bus | 906 | 2.05 | 0.17 | 0 | 29.4 |
| Monsoon Downpour | 938 | -7.08 | 0.11 | -0.24 | 20.7 |
| Durian Season | 930 | -2.7 | 0.14 | 0.03 | 24.2 |
| Kenduri | 934 | 2.44 | 0.15 | 0.02 | 29.9 |
| Mango Windfall | 860 | -1.59 | 0.14 | 0.01 | 25.5 |
| Pasar Malam | 873 | 1.83 | 0.15 | -0.13 | 27.1 |
| Bake-Off | 904 | 1.6 | 0.16 | 0 | 28.6 |

**Running out of cash** (stall-days from day 2)

| AI level | Stall-days | Dawn cash < $3, nothing ripe % | Cash < $3 and no fruit at all (stuck) % | Cash $0, nothing ripe % | Cannot pay for any piece, nothing ripe % | Dead days % (no purchase, $0 income) | of which dawn cash < $3 % | of which had ripe fruit % | Dead on the last day % |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| normal | 72000 | 2.48 | 0.67 | 0.68 | 1.59 | 5.83 | 53.9 | 44 | 6.05 |

Games with at least one stuck dawn (cash < $3 and no fruit at all): 7.4%; with at least one dead day: 81.3%.

Stalls with a stuck dawn: 151 (0.08 per game). First broke on day 7.2 on average. Afterwards: average final rank 3.97 of 4 (last place 97.4%), final cash $3.2 (table average $82.9), income per remaining day $1.1, never earned again 80.1%.
Largest outflow in the two days before: other 54.3%, standing-order fine 37.1%, Health Inspector 7.3%, fruit that did not sell 1.3%.

**Standing orders**

| Order fruit | Orders turned over | Nobody bid % | Bidders / order | Winning bid | Bid / ceiling % | Holder delivered all % | Pieces short | Fine paid / held order | Rival pieces / held order | Rival pay / piece | Holder margin (bid - cost, less fine) |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| Blueberry | 0.49 | 4.6 | 3.82 | 6.18 | 68.6 | 73.7 | 0.57 | 1.96 | 0.27 | 5.22 | 12.35 |
| Watermelon | 0.53 | 0.2 | 3.99 | 7.82 | 65.2 | 81.1 | 0.4 | 1.74 | 0.25 | 6.84 | 15.61 |
| Apple | 0.47 | 1.7 | 3.89 | 7.43 | 67.6 | 74.9 | 0.59 | 2.56 | 0.26 | 6.53 | 12.53 |
| Mango | 0.52 | 24.7 | 1.96 | 13.31 | 74 | 53.3 | 1.04 | 8.95 | 0.81 | 12.26 | 21.65 |
| All | 2 | 8 | 3.4 | 8.48 | 68.5 | 71.8 | 0.62 | 3.53 | 0.38 | 8.96 | 15.3 |

Holder's cash gain over the three days of the order, less the average rival's: $10.43 (SE 0.42, 3680 orders). Holders are self-selected (they bid lowest), so read this with the forced-bid test in orders.ts.

**Game shape**

| Measure | Value |
| --- | --- |
| Leader after day 5 wins | 44.5% (SE 1.1) |
| Last after day 5 wins (comeback) | 13.2% (SE 0.8) |
| Lead changes per game | 3.51 |
| Average final cash | $82.9 |
| Winner / last place cash | $114.4 / $51 |
| Median margin 1st - 2nd | $18 |
| Close games (margin <= $3) | 11.8% |
| Blowouts (margin >= $20) | 45.3% |
| Spread of final cash in a game (sd) | $28.3 |
| Win % by seat (seat 0 first) | 25.3 / 24.3 / 25.4 / 25.1 |
| Days bought first: winners vs everyone | 1.72 vs 2.5 |
| Win % by days bought first | 0d: 30.8% (1625), 1d: 32.7% (1700), 2d: 28.5% (1437), 3d: 26.3% (1051), 4d: 19.8% (696), 5d: 12.9% (519), 6d: 9.3% (387), 7d: 3.4% (261), 8d: 4% (200), 9d: 1.1% (95) |


#### `an-n6-normal.md`

### base-n6-normal.jsonl: 6 stalls, normal/normal/normal/normal/normal/normal AI, 10 days, 1300 games

**Shopkeepers** (fair = 16.7%)

| Perk | Seats | Win % | SE | vs fair | Avg cash | Cash vs table | SE | Sole serves/game | Favours earned | Pieces bought | Spoiled | Perk cash/game |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| Haggler | 965 | 10.8 | 1 | -5.9 | 71.7 | -8 | 1 | 0.34 | 0.33 | 27.5 | 1.75 |  |
| Big Basket | 987 | 14.4 | 1.1 | -2.3 | 75.4 | -4.3 | 1 | 0.37 | 0.37 | 29.7 | 1.9 |  |
| Bargain Hunter | 990 | 20.6 | 1.3 | +3.9 | 84.7 | +4.3 | 1 | 0.35 | 0.35 | 29.9 | 1.81 |  |
| Charmer | 976 | 17.2 | 1.2 | +0.5 | 80.4 | +0.9 | 1 | 0.41 | 0.41 | 27.2 | 1.51 |  |
| Tip Jar | 959 | 10.3 | 1 | -6.3 | 71.3 | -8.4 | 1 | 0.32 | 0.31 | 27.3 | 1.72 | 0.6 |
| Nest Egg | 955 | 23.6 | 1.4 | +6.9 | 86.9 | +7.2 | 1 | 0.39 | 0.38 | 29.3 | 1.98 | 8 |
| Shade Cloth | 984 | 17.6 | 1.2 | +0.9 | 87.1 | +7 | 0.9 | 0.38 | 0.38 | 27.8 | 0.02 |  |
| Sharp Ears | 984 | 18.8 | 1.2 | +2.1 | 80.9 | +1.2 | 1 | 0.42 | 0.41 | 28.6 | 1.61 | 6.5 |

**Fruit roles** (per game, whole table)

| Fruit | Delivered | Bought | % of lorry bought | Free (favour) | Sold to row | Sold to order | Hawker | Spoiled | Juiced | Jam (ripe left) | Green left | Avg cost | Avg row price | Profit / piece bought | Share of profit % |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| Blueberry | 63.4 | 37.5 | 59.1 | 0.07 | 30.2 | 2.18 | 0.38 | 2.02 | 0.86 | 1.94 | 0 | 1.63 | 3.89 | 2.11 | 16.7 |
| Watermelon | 60.1 | 43.3 | 72 | 0.27 | 37.9 | 2.41 | 0.31 | 0.83 | 0.35 | 1.75 | 0 | 2.81 | 5.5 | 2.58 | 23.6 |
| Apple | 48.5 | 39.3 | 80.9 | 0.23 | 35.4 | 2.34 | 0.25 | 0.16 | 0.07 | 1.27 | 0 | 2.89 | 5.24 | 2.34 | 19.5 |
| Mango | 59.1 | 50.4 | 85.3 | 0.24 | 29.9 | 2.11 | 0.84 | 6.2 | 2.63 | 7.98 | 0.98 | 2.96 | 9.84 | 3.76 | 40.1 |

| Fruit | Sold Fresh % | Okay % | Soft % | Nights on shelf / piece | Loss rate % (spoiled+juiced / got) | Wanted / game | Row demand served % | Days wanted > put out % | Days some demand unserved % |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| Blueberry | 59.4 | 37.5 | 3.1 | 0.35 | 7.7 | 46.4 | 65 | 47.2 | 60.5 |
| Watermelon | 80.9 | 17.9 | 1.2 | 0.29 | 2.7 | 50.5 | 75.1 | 42.2 | 46.9 |
| Apple | 93.8 | 5.7 | 0.5 | 0.28 | 0.6 | 55 | 64.4 | 54 | 57.2 |
| Mango | 79.1 | 19.4 | 1.6 | 2.51 | 17.5 | 50.5 | 59.2 | 39.1 | 50 |

**Upgrades the computer built**

| Upgrade | Cost | % of stalls that built it | Avg day built | Win % of stalls with it | Win % without | Cash vs table with it |
| --- | --- | --- | --- | --- | --- | --- |
| Juice Bar | $4 | 32.2 | 4.7 | 19.6 | 15.3 | 6.9 |
| Handcart | $6 | 59 | 5.3 | 19.5 | 12.7 | 5.1 |
| Premium Display | $6 | 5.6 | 6 | 23.3 | 16.3 | 8.7 |
| Ripening Room | $6 | 44.2 | 4.3 | 19.9 | 14.1 | 5.3 |
| Order Book | $5 | 21.1 | 3 | 12.4 | 17.8 | -2.6 |

Stalls ending with 0 / 1 / 2 upgrades: 6.1% / 25.8% / 68.1%

**Favours** (per game, whole table unless stated)

| Card | Dealt at start (Charmer) | Earned | Played | Unplayed at end | % of copies gained that were played |
| --- | --- | --- | --- | --- | --- |
| Gossip | 0.51 | 0.35 | 0.8 | 0.05 | 93.9 |
| Free Fruit | 0.5 | 0.36 | 0.8 | 0.06 | 93.5 |
| Priority | 0.5 | 0.38 | 0.81 | 0.07 | 91.6 |
| Scout | 0.5 | 0.38 | 0 | 0.88 | 0 |
| Favoured Trade | 0.5 | 0.38 | 0.82 | 0.06 | 93.1 |
| Fridge | 0.5 | 0.36 | 0.65 | 0.21 | 75.2 |

Favours earned per stall per game: 0.37 (sd 0.6); sole serves per game (table): 2.24; of those that drew a card: 99.2%.
Deck reshuffles per game: 0; games with at least one reshuffle: 0%; days ending with an empty deck: 0%.

**Events in the batch** (difference from the average of the same day number; see events.ts for the paired test)

| Event | Days | Income / stall vs same day | SE | Pieces lost that night / stall vs same day | Income spread (best - worst stall) |
| --- | --- | --- | --- | --- | --- |
| Festival | 570 | 2.93 | 0.2 | 0.01 | 39.1 |
| Superfood Trend | 583 | -0.11 | 0.17 | -0.01 | 35.6 |
| Mango Craze | 573 | 0.19 | 0.2 | -0.03 | 38.4 |
| Hotel Order | 594 | 0.04 | 0.16 | 0 | 33.2 |
| Heatwave | 600 | 2 | 0.18 | 0.33 | 37.5 |
| Apple Blight | 584 | 0.62 | 0.19 | 0.05 | 36.8 |
| Blueberry Glut | 597 | -0.08 | 0.19 | 0.04 | 34.8 |
| Good Harvest | 575 | -2.31 | 0.17 | 0.01 | 32 |
| Bad Harvest | 574 | 2.88 | 0.21 | 0.02 | 39.5 |
| Price Hike | 606 | 0.11 | 0.17 | 0 | 35.5 |
| Price Controls | 597 | -0.28 | 0.17 | -0.01 | 33.5 |
| Health Inspector | 529 | 0.53 | 0.2 | -0.02 | 35.1 |
| Lorry Breakdown | 583 | -1.34 | 0.21 | 0.06 | 34.7 |
| Tourist Bus | 568 | 0.37 | 0.17 | 0 | 35.4 |
| Monsoon Downpour | 609 | -4.57 | 0.15 | -0.28 | 30.1 |
| Durian Season | 620 | -1.67 | 0.16 | 0.02 | 32.7 |
| Kenduri | 624 | 0.07 | 0.16 | 0 | 35.2 |
| Mango Windfall | 543 | -0.83 | 0.16 | -0.02 | 33.1 |
| Pasar Malam | 576 | 2.4 | 0.19 | -0.14 | 35.4 |
| Bake-Off | 595 | -0.57 | 0.15 | -0.01 | 33.2 |

**Running out of cash** (stall-days from day 2)

| AI level | Stall-days | Dawn cash < $3, nothing ripe % | Cash < $3 and no fruit at all (stuck) % | Cash $0, nothing ripe % | Cannot pay for any piece, nothing ripe % | Dead days % (no purchase, $0 income) | of which dawn cash < $3 % | of which had ripe fruit % | Dead on the last day % |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| normal | 70200 | 3.19 | 0.87 | 0.89 | 1.64 | 6.62 | 62.4 | 47.6 | 6.91 |

Games with at least one stuck dawn (cash < $3 and no fruit at all): 13.2%; with at least one dead day: 92%.

Stalls with a stuck dawn: 188 (0.14 per game). First broke on day 7.2 on average. Afterwards: average final rank 5.89 of 6 (last place 91%), final cash $2.6 (table average $79.8), income per remaining day $0.9, never earned again 82.4%.
Largest outflow in the two days before: other 61.2%, standing-order fine 31.4%, Health Inspector 5.9%, fruit that did not sell 1.6%.

**Standing orders**

| Order fruit | Orders turned over | Nobody bid % | Bidders / order | Winning bid | Bid / ceiling % | Holder delivered all % | Pieces short | Fine paid / held order | Rival pieces / held order | Rival pay / piece | Holder margin (bid - cost, less fine) |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| Blueberry | 0.48 | 0 | 6 | 6.07 | 67.4 | 59.1 | 0.99 | 3.43 | 0.5 | 5.07 | 12.88 |
| Watermelon | 0.5 | 0 | 6 | 7.67 | 63.9 | 73.8 | 0.67 | 2.71 | 0.49 | 6.69 | 17.53 |
| Apple | 0.5 | 0.6 | 5.95 | 7.3 | 66.3 | 73 | 0.7 | 2.74 | 0.41 | 6.34 | 15.72 |
| Mango | 0.52 | 15.4 | 3.57 | 13.19 | 73.3 | 38 | 1.59 | 12.55 | 1.39 | 12.13 | 22.27 |
| All | 2 | 4.2 | 5.36 | 8.43 | 67.6 | 61.7 | 0.97 | 5.15 | 0.68 | 8.89 | 16.98 |

Holder's cash gain over the three days of the order, less the average rival's: $13.41 (SE 0.55, 2492 orders). Holders are self-selected (they bid lowest), so read this with the forced-bid test in orders.ts.

**Game shape**

| Measure | Value |
| --- | --- |
| Leader after day 5 wins | 38.2% (SE 1.3) |
| Last after day 5 wins (comeback) | 5.6% (SE 0.6) |
| Lead changes per game | 4.37 |
| Average final cash | $79.8 |
| Winner / last place cash | $122.7 / $35.9 |
| Median margin 1st - 2nd | $17 |
| Close games (margin <= $3) | 13.5% |
| Blowouts (margin >= $20) | 44.8% |
| Spread of final cash in a game (sd) | $32.4 |
| Win % by seat (seat 0 first) | 17.1 / 15.9 / 17.5 / 15.9 / 16.2 / 17.4 |
| Days bought first: winners vs everyone | 0.94 vs 1.67 |
| Win % by days bought first | 0d: 20.9% (2574), 1d: 21.1% (2067), 2d: 17.1% (1337), 3d: 10.7% (683), 4d: 4.1% (389), 5d: 2.6% (265), 6d: 1.4% (216), 7d: 0% (155), 8d: 0% (83) |


#### `an-n3-hard.md`

### base-n3-hard.jsonl: 3 stalls, hard/hard/hard AI, 10 days, 1600 games

**Shopkeepers** (fair = 33.3%)

| Perk | Seats | Win % | SE | vs fair | Avg cash | Cash vs table | SE | Sole serves/game | Favours earned | Pieces bought | Spoiled | Perk cash/game |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| Haggler | 593 | 32.2 | 1.9 | -1.1 | 88.1 | -0.7 | 1 | 1.03 | 0.99 | 28.3 | 1.64 |  |
| Big Basket | 628 | 31.2 | 1.8 | -2.1 | 87.9 | -2.5 | 1 | 1.12 | 1.09 | 29.9 | 1.86 |  |
| Bargain Hunter | 614 | 33.2 | 1.9 | -0.1 | 92.7 | +0.7 | 0.9 | 0.95 | 0.93 | 28.9 | 1.93 |  |
| Charmer | 593 | 37.3 | 2 | +3.9 | 93.1 | +2.6 | 0.9 | 1.01 | 1 | 28 | 1.47 |  |
| Tip Jar | 582 | 24.1 | 1.8 | -9.3 | 85.2 | -4.6 | 1 | 0.89 | 0.87 | 28.1 | 1.75 | 1.8 |
| Nest Egg | 604 | 37.7 | 2 | +4.4 | 95.7 | +3.6 | 0.9 | 0.92 | 0.9 | 29.7 | 2.07 | 8 |
| Shade Cloth | 577 | 37.8 | 2 | +4.4 | 94.6 | +2.9 | 0.9 | 1.08 | 1.04 | 27.8 | 0.03 |  |
| Sharp Ears | 609 | 33.2 | 1.9 | -0.2 | 88.6 | -2 | 1 | 1 | 0.97 | 27.8 | 1.76 | 4.2 |

**Fruit roles** (per game, whole table)

| Fruit | Delivered | Bought | % of lorry bought | Free (favour) | Sold to row | Sold to order | Hawker | Spoiled | Juiced | Jam (ripe left) | Green left | Avg cost | Avg row price | Profit / piece bought | Share of profit % |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| Blueberry | 28 | 19.8 | 70.7 | 0.07 | 16.4 | 1.21 | 0.23 | 0.99 | 0.24 | 0.77 | 0 | 1.73 | 4.62 | 2.57 | 18.7 |
| Watermelon | 27.2 | 23.1 | 84.8 | 0.19 | 20.3 | 1.5 | 0.21 | 0.39 | 0.1 | 0.8 | 0 | 2.86 | 6.19 | 3.12 | 26.5 |
| Apple | 22.8 | 20.2 | 88.7 | 0.17 | 18.2 | 1.23 | 0.17 | 0.1 | 0.02 | 0.64 | 0 | 2.91 | 5.81 | 2.79 | 20.8 |
| Mango | 26.1 | 22.7 | 87 | 0.21 | 13.5 | 1.06 | 0.49 | 3.24 | 0.79 | 3.39 | 0.47 | 2.96 | 10.36 | 4.06 | 33.9 |

| Fruit | Sold Fresh % | Okay % | Soft % | Nights on shelf / piece | Loss rate % (spoiled+juiced / got) | Wanted / game | Row demand served % | Days wanted > put out % | Days some demand unserved % |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| Blueberry | 68.7 | 29.7 | 1.6 | 0.31 | 6.2 | 26.2 | 62.7 | 45.8 | 54.2 |
| Watermelon | 85.3 | 13.9 | 0.8 | 0.3 | 2.1 | 28.4 | 71.4 | 40.2 | 43.9 |
| Apple | 95.1 | 4.6 | 0.3 | 0.28 | 0.6 | 29.5 | 61.7 | 50.6 | 52.9 |
| Mango | 77.3 | 20.6 | 2.1 | 2.44 | 17.6 | 25.3 | 53.3 | 44.2 | 55.7 |

**Upgrades the computer built**

| Upgrade | Cost | % of stalls that built it | Avg day built | Win % of stalls with it | Win % without | Cash vs table with it |
| --- | --- | --- | --- | --- | --- | --- |
| Juice Bar | $4 | 16.6 | 4.9 | 35.3 | 32.9 | 3.2 |
| Handcart | $6 | 68.1 | 5.3 | 37.3 | 25 | 2.8 |
| Premium Display | $6 | 6.8 | 6 | 39.9 | 32.9 | 4.8 |
| Ripening Room | $6 | 64.1 | 4.2 | 35.1 | 30.3 | 1.9 |
| Order Book | $5 | 22.2 | 3 | 30 | 34.3 | -1 |

Stalls ending with 0 / 1 / 2 upgrades: 2.7% / 16.8% / 80.5%

**Favours** (per game, whole table unless stated)

| Card | Dealt at start (Charmer) | Earned | Played | Unplayed at end | % of copies gained that were played |
| --- | --- | --- | --- | --- | --- |
| Gossip | 0.26 | 0.48 | 0.66 | 0.09 | 87.7 |
| Free Fruit | 0.24 | 0.47 | 0.64 | 0.08 | 89.2 |
| Priority | 0.24 | 0.49 | 0.64 | 0.09 | 87.4 |
| Scout | 0.25 | 0.5 | 0 | 0.75 | 0 |
| Favoured Trade | 0.22 | 0.5 | 0.65 | 0.08 | 89.6 |
| Fridge | 0.26 | 0.47 | 0.52 | 0.21 | 70.9 |

Favours earned per stall per game: 0.97 (sd 0.95); sole serves per game (table): 3; of those that drew a card: 97.3%.
Deck reshuffles per game: 0; games with at least one reshuffle: 0%; days ending with an empty deck: 0%.

**Events in the batch** (difference from the average of the same day number; see events.ts for the paired test)

| Event | Days | Income / stall vs same day | SE | Pieces lost that night / stall vs same day | Income spread (best - worst stall) |
| --- | --- | --- | --- | --- | --- |
| Festival | 696 | 5.94 | 0.24 | 0 | 26.7 |
| Superfood Trend | 717 | 2.02 | 0.19 | -0.01 | 23.3 |
| Mango Craze | 712 | 2.19 | 0.23 | 0.01 | 25 |
| Hotel Order | 717 | 3.05 | 0.21 | 0 | 22.8 |
| Heatwave | 738 | 0.19 | 0.19 | 0.34 | 21.9 |
| Apple Blight | 717 | -1.97 | 0.21 | 0 | 21.2 |
| Blueberry Glut | 732 | -1.24 | 0.18 | 0.02 | 20.7 |
| Good Harvest | 719 | -2.84 | 0.17 | 0.03 | 19.7 |
| Bad Harvest | 713 | 0.33 | 0.2 | -0.01 | 24.1 |
| Price Hike | 747 | -1.21 | 0.18 | -0.01 | 20.7 |
| Price Controls | 733 | -1.76 | 0.17 | 0.01 | 19.7 |
| Health Inspector | 654 | -0.36 | 0.2 | -0.01 | 21.3 |
| Lorry Breakdown | 731 | -4.91 | 0.22 | 0.02 | 20.4 |
| Tourist Bus | 703 | 5.32 | 0.25 | -0.01 | 25.6 |
| Monsoon Downpour | 738 | -5.48 | 0.15 | -0.25 | 17.8 |
| Durian Season | 759 | -3.25 | 0.17 | 0.02 | 19 |
| Kenduri | 764 | 3.2 | 0.21 | -0.01 | 23.4 |
| Mango Windfall | 673 | -1.85 | 0.17 | 0 | 19.9 |
| Pasar Malam | 708 | 1.52 | 0.2 | -0.15 | 21 |
| Bake-Off | 729 | 1.61 | 0.2 | 0.02 | 22.5 |

**Running out of cash** (stall-days from day 2)

| AI level | Stall-days | Dawn cash < $3, nothing ripe % | Cash < $3 and no fruit at all (stuck) % | Cash $0, nothing ripe % | Cannot pay for any piece, nothing ripe % | Dead days % (no purchase, $0 income) | of which dawn cash < $3 % | of which had ripe fruit % | Dead on the last day % |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| hard | 43200 | 1.58 | 0.36 | 0.37 | 1.21 | 5.4 | 38.3 | 45.3 | 6.21 |

Games with at least one stuck dawn (cash < $3 and no fruit at all): 2.7%; with at least one dead day: 70.9%.

Stalls with a stuck dawn: 45 (0.03 per game). First broke on day 7.2 on average. Afterwards: average final rank 2.96 of 3 (last place 95.6%), final cash $2.9 (table average $90.7), income per remaining day $1.1, never earned again 86.7%.
Largest outflow in the two days before: other 62.2%, standing-order fine 22.2%, Health Inspector 8.9%, fruit that did not sell 6.7%.

**Standing orders**

| Order fruit | Orders turned over | Nobody bid % | Bidders / order | Winning bid | Bid / ceiling % | Holder delivered all % | Pieces short | Fine paid / held order | Rival pieces / held order | Rival pay / piece | Holder margin (bid - cost, less fine) |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| Blueberry | 0.5 | 15.1 | 2.55 | 5.25 | 58.3 | 82.5 | 0.3 | 1.29 | 0.13 | 4.22 | 7.48 |
| Watermelon | 0.52 | 0.7 | 2.98 | 6.91 | 57.6 | 88.6 | 0.19 | 0.97 | 0.12 | 5.93 | 10.01 |
| Apple | 0.47 | 7.9 | 2.71 | 6.57 | 59.7 | 87.4 | 0.23 | 1.04 | 0.09 | 5.8 | 8.81 |
| Mango | 0.52 | 28.4 | 1.47 | 12.42 | 69 | 67.5 | 0.56 | 5.45 | 0.43 | 11.36 | 17.51 |
| All | 2 | 13.1 | 2.42 | 7.59 | 60.7 | 82.3 | 0.31 | 2.02 | 0.18 | 8.34 | 10.68 |

Holder's cash gain over the three days of the order, less the average rival's: $6.08 (SE 0.46, 2780 orders). Holders are self-selected (they bid lowest), so read this with the forced-bid test in orders.ts.

**Game shape**

| Measure | Value |
| --- | --- |
| Leader after day 5 wins | 49.3% (SE 1.2) |
| Last after day 5 wins (comeback) | 25.4% (SE 1.1) |
| Lead changes per game | 2.69 |
| Average final cash | $90.7 |
| Winner / last place cash | $113.6 / $68.3 |
| Median margin 1st - 2nd | $18 |
| Close games (margin <= $3) | 10.1% |
| Blowouts (margin >= $20) | 46% |
| Spread of final cash in a game (sd) | $23.7 |
| Win % by seat (seat 0 first) | 35.3 / 31.5 / 33.2 |
| Days bought first: winners vs everyone | 2.63 vs 3.33 |
| Win % by days bought first | 0d: 42.4% (589), 1d: 43.2% (798), 2d: 36.9% (739), 3d: 35.7% (670), 4d: 34.8% (546), 5d: 27.6% (482), 6d: 22.4% (326), 7d: 20.1% (274), 8d: 14% (193), 9d: 8.6% (128), 10d: 7.3% (55) |


#### `an-n4-hard.md`

### base-n4-hard.jsonl: 4 stalls, hard/hard/hard/hard AI, 10 days, 1200 games

**Shopkeepers** (fair = 25%)

| Perk | Seats | Win % | SE | vs fair | Avg cash | Cash vs table | SE | Sole serves/game | Favours earned | Pieces bought | Spoiled | Perk cash/game |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| Haggler | 593 | 24.5 | 1.8 | -0.5 | 84 | -1.3 | 1.1 | 1.09 | 1.05 | 28.8 | 1.51 |  |
| Big Basket | 599 | 25 | 1.8 | +0 | 85.1 | -0.8 | 1.1 | 1.05 | 1.02 | 30.8 | 1.76 |  |
| Bargain Hunter | 624 | 26.4 | 1.8 | +1.4 | 88.8 | +2.1 | 1 | 0.93 | 0.9 | 29.8 | 1.75 |  |
| Charmer | 593 | 24.5 | 1.8 | -0.5 | 85 | -0.6 | 1.1 | 0.97 | 0.96 | 28.2 | 1.49 |  |
| Tip Jar | 599 | 16.7 | 1.5 | -8.3 | 79.2 | -5.7 | 1 | 0.78 | 0.77 | 28.2 | 1.76 | 1.6 |
| Nest Egg | 591 | 29.1 | 1.9 | +4.1 | 89.4 | +3 | 1.1 | 0.9 | 0.87 | 29.8 | 1.95 | 8 |
| Shade Cloth | 584 | 28.1 | 1.9 | +3.1 | 90.2 | +4.1 | 1 | 0.99 | 0.97 | 28 | 0.03 |  |
| Sharp Ears | 617 | 25.8 | 1.8 | +0.8 | 85.7 | -0.6 | 1.1 | 0.93 | 0.9 | 28.1 | 1.66 | 7.2 |

**Fruit roles** (per game, whole table)

| Fruit | Delivered | Bought | % of lorry bought | Free (favour) | Sold to row | Sold to order | Hawker | Spoiled | Juiced | Jam (ripe left) | Green left | Avg cost | Avg row price | Profit / piece bought | Share of profit % |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| Blueberry | 40.2 | 27.4 | 68.3 | 0.09 | 22.3 | 1.61 | 0.32 | 1.44 | 0.44 | 1.39 | 0 | 1.7 | 4.32 | 2.31 | 18.6 |
| Watermelon | 37.6 | 31 | 82.6 | 0.24 | 27 | 1.98 | 0.28 | 0.56 | 0.17 | 1.27 | 0 | 2.85 | 5.9 | 2.83 | 25.9 |
| Apple | 30.7 | 27.1 | 88.1 | 0.2 | 24.3 | 1.64 | 0.2 | 0.11 | 0.03 | 1.03 | 0 | 2.91 | 5.59 | 2.56 | 20.4 |
| Mango | 34.9 | 30.2 | 86.5 | 0.27 | 18.2 | 1.32 | 0.58 | 3.87 | 1.18 | 4.72 | 0.6 | 2.96 | 10.03 | 3.94 | 35.1 |

| Fruit | Sold Fresh % | Okay % | Soft % | Nights on shelf / piece | Loss rate % (spoiled+juiced / got) | Wanted / game | Row demand served % | Days wanted > put out % | Days some demand unserved % |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| Blueberry | 65.4 | 32.2 | 2.3 | 0.35 | 6.8 | 33 | 67.6 | 38.9 | 51 |
| Watermelon | 83.9 | 15.1 | 1 | 0.33 | 2.3 | 35.8 | 75.5 | 35.4 | 41.2 |
| Apple | 94.7 | 4.9 | 0.4 | 0.32 | 0.5 | 37.6 | 64.7 | 47.6 | 50.7 |
| Mango | 77 | 21 | 2 | 2.46 | 16.6 | 32.1 | 56.8 | 41 | 52.6 |

**Upgrades the computer built**

| Upgrade | Cost | % of stalls that built it | Avg day built | Win % of stalls with it | Win % without | Cash vs table with it |
| --- | --- | --- | --- | --- | --- | --- |
| Juice Bar | $4 | 22 | 4.8 | 28.2 | 24.1 | 4 |
| Handcart | $6 | 65 | 5.3 | 28 | 19.5 | 3.7 |
| Premium Display | $6 | 6.2 | 6 | 31.1 | 24.6 | 6.7 |
| Ripening Room | $6 | 56.7 | 4.2 | 27.3 | 22 | 3 |
| Order Book | $5 | 23.1 | 3 | 23.7 | 25.4 | -0.7 |

Stalls ending with 0 / 1 / 2 upgrades: 3.6% / 19.8% / 76.6%

**Favours** (per game, whole table unless stated)

| Card | Dealt at start (Charmer) | Earned | Played | Unplayed at end | % of copies gained that were played |
| --- | --- | --- | --- | --- | --- |
| Gossip | 0.35 | 0.64 | 0.88 | 0.11 | 88.9 |
| Free Fruit | 0.31 | 0.6 | 0.8 | 0.1 | 88.5 |
| Priority | 0.32 | 0.6 | 0.83 | 0.09 | 90.3 |
| Scout | 0.33 | 0.65 | 0 | 0.98 | 0 |
| Favoured Trade | 0.31 | 0.65 | 0.85 | 0.1 | 89.4 |
| Fridge | 0.37 | 0.6 | 0.71 | 0.25 | 73.8 |

Favours earned per stall per game: 0.93 (sd 0.94); sole serves per game (table): 3.82; of those that drew a card: 97.4%.
Deck reshuffles per game: 0; games with at least one reshuffle: 0.3%; days ending with an empty deck: 0.1%.

**Events in the batch** (difference from the average of the same day number; see events.ts for the paired test)

| Event | Days | Income / stall vs same day | SE | Pieces lost that night / stall vs same day | Income spread (best - worst stall) |
| --- | --- | --- | --- | --- | --- |
| Festival | 533 | 4.71 | 0.23 | 0.02 | 32.6 |
| Superfood Trend | 530 | 1.29 | 0.2 | -0.03 | 28.8 |
| Mango Craze | 530 | 2.12 | 0.25 | 0 | 31.8 |
| Hotel Order | 556 | 2.04 | 0.2 | -0.02 | 28.3 |
| Heatwave | 548 | 1.22 | 0.2 | 0.28 | 28.3 |
| Apple Blight | 533 | -0.59 | 0.22 | 0.03 | 27.9 |
| Blueberry Glut | 549 | -0.57 | 0.19 | 0.03 | 27.1 |
| Good Harvest | 533 | -2.5 | 0.19 | 0 | 24.5 |
| Bad Harvest | 531 | 1.57 | 0.21 | 0.02 | 29.2 |
| Price Hike | 561 | -0.45 | 0.19 | -0.01 | 26.2 |
| Price Controls | 549 | -1.15 | 0.17 | -0.02 | 24.5 |
| Health Inspector | 483 | -0.24 | 0.21 | -0.01 | 26.4 |
| Lorry Breakdown | 542 | -3.72 | 0.22 | 0.06 | 25.4 |
| Tourist Bus | 529 | 2.11 | 0.22 | -0.02 | 29.2 |
| Monsoon Downpour | 562 | -7.28 | 0.14 | -0.25 | 19.9 |
| Durian Season | 578 | -2.76 | 0.19 | 0.01 | 23.1 |
| Kenduri | 577 | 2.43 | 0.2 | 0.02 | 29.9 |
| Mango Windfall | 494 | -1.54 | 0.18 | 0.01 | 25.4 |
| Pasar Malam | 530 | 2.12 | 0.21 | -0.14 | 27.5 |
| Bake-Off | 552 | 1.5 | 0.2 | 0 | 27.9 |

**Running out of cash** (stall-days from day 2)

| AI level | Stall-days | Dawn cash < $3, nothing ripe % | Cash < $3 and no fruit at all (stuck) % | Cash $0, nothing ripe % | Cannot pay for any piece, nothing ripe % | Dead days % (no purchase, $0 income) | of which dawn cash < $3 % | of which had ripe fruit % | Dead on the last day % |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| hard | 43200 | 2.35 | 0.55 | 0.56 | 1.44 | 5.49 | 50.8 | 44.6 | 6.17 |

Games with at least one stuck dawn (cash < $3 and no fruit at all): 6%; with at least one dead day: 80.9%.

Stalls with a stuck dawn: 72 (0.06 per game). First broke on day 7.3 on average. Afterwards: average final rank 3.99 of 4 (last place 98.6%), final cash $2.8 (table average $85.9), income per remaining day $0.9, never earned again 86.1%.
Largest outflow in the two days before: other 62.5%, standing-order fine 29.2%, Health Inspector 6.9%, fruit that did not sell 1.4%.

**Standing orders**

| Order fruit | Orders turned over | Nobody bid % | Bidders / order | Winning bid | Bid / ceiling % | Holder delivered all % | Pieces short | Fine paid / held order | Rival pieces / held order | Rival pay / piece | Holder margin (bid - cost, less fine) |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| Blueberry | 0.51 | 14.7 | 3.41 | 5.17 | 57.4 | 77 | 0.49 | 1.77 | 0.23 | 4.19 | 9.35 |
| Watermelon | 0.52 | 1.4 | 3.94 | 6.82 | 56.9 | 82.2 | 0.38 | 1.59 | 0.24 | 5.85 | 12.24 |
| Apple | 0.46 | 5.9 | 3.71 | 6.44 | 58.5 | 82.4 | 0.41 | 1.76 | 0.16 | 5.45 | 10.59 |
| Mango | 0.51 | 32.2 | 1.46 | 12.4 | 68.9 | 59.7 | 0.8 | 7.57 | 0.62 | 11.41 | 22.51 |
| All | 2 | 13.7 | 3.12 | 7.43 | 59.8 | 76.4 | 0.5 | 2.87 | 0.29 | 7.83 | 13.15 |

Holder's cash gain over the three days of the order, less the average rival's: $8.94 (SE 0.55, 2072 orders). Holders are self-selected (they bid lowest), so read this with the forced-bid test in orders.ts.

**Game shape**

| Measure | Value |
| --- | --- |
| Leader after day 5 wins | 43.5% (SE 1.4) |
| Last after day 5 wins (comeback) | 14.1% (SE 1) |
| Lead changes per game | 3.32 |
| Average final cash | $85.9 |
| Winner / last place cash | $116.9 / $55.6 |
| Median margin 1st - 2nd | $19 |
| Close games (margin <= $3) | 10.8% |
| Blowouts (margin >= $20) | 47.8% |
| Spread of final cash in a game (sd) | $27.3 |
| Win % by seat (seat 0 first) | 27.8 / 24 / 23.4 / 24.8 |
| Days bought first: winners vs everyone | 1.65 vs 2.5 |
| Win % by days bought first | 0d: 32% (982), 1d: 33.9% (1060), 2d: 26.7% (804), 3d: 26.3% (612), 4d: 18% (439), 5d: 15.6% (320), 6d: 6.6% (227), 7d: 3.5% (173), 8d: 1% (100), 9d: 0% (63) |


#### `an-n3-mix.md`

### base-n3-mix.jsonl: 3 stalls, normal/normal/easy AI, 10 days, 1200 games

**Running out of cash** (stall-days from day 2)

| AI level | Stall-days | Dawn cash < $3, nothing ripe % | Cash < $3 and no fruit at all (stuck) % | Cash $0, nothing ripe % | Cannot pay for any piece, nothing ripe % | Dead days % (no purchase, $0 income) | of which dawn cash < $3 % | of which had ripe fruit % | Dead on the last day % |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| normal | 21600 | 1.73 | 0.4 | 0.41 | 1.21 | 5.14 | 40.7 | 42.8 | 7.17 |
| easy | 10800 | 2.42 | 0.71 | 0.86 | 1.61 | 6.53 | 56 | 55 | 6.25 |

Games with at least one stuck dawn (cash < $3 and no fruit at all): 3.9%; with at least one dead day: 71.3%.

Stalls with a stuck dawn: 47 (0.04 per game). First broke on day 7.1 on average. Afterwards: average final rank 3 of 3 (last place 100%), final cash $1.1 (table average $83.7), income per remaining day $0.5, never earned again 87.2%.
Largest outflow in the two days before: other 63.8%, standing-order fine 25.5%, fruit that did not sell 6.4%, Health Inspector 4.3%.


#### `perks-n3.md`

### perks: 3 stalls, normal AI, 10 days, 400 games per row, focal seat rotates [current rules]

| Focal seat rule | Win % | SE | Cash | Cash vs average rival | Cash change vs first row (paired) | SE | Notes |
| --- | --- | --- | --- | --- | --- | --- | --- |
| no perk | 27.8 | 2.2 | 83.5 | -3.5 | 0 | 0 |  |
| Haggler | 25.8 | 2.2 | 81.5 | -7.1 | -1.98 | 1.64 |  |
| Big Basket | 31.8 | 2.3 | 84.8 | -2.1 | 1.38 | 1.69 |  |
| Bargain Hunter | 37.5 | 2.4 | 91.9 | 5.7 | 8.45 | 1.58 |  |
| Charmer | 36 | 2.4 | 88.6 | 2.9 | 5.19 | 1.56 |  |
| Tip Jar | 26.8 | 2.2 | 81.7 | -6.9 | -1.79 | 1.64 |  |
| Nest Egg | 37.5 | 2.4 | 91.4 | 5.9 | 7.89 | 1.5 |  |
| Shade Cloth | 33.5 | 2.4 | 90.1 | 3.6 | 6.67 | 1.65 |  |
| Sharp Ears | 33.3 | 2.4 | 87.6 | 0.7 | 4.09 | 1.61 |  |


#### `ties-n3.md`

### Price ties: 3 stalls, normal AI, 250 games

Customer lines with a seller: 10043 (40.2 per game). Two or more stalls offered: 49.7%. Lowest price tied: 21.3% of all lines (43% of contested lines), 8.6 per game. Ties involving the Haggler: 2.1 per game (it is at the table in 37.5% of seats).
Pieces sold at the customer's top price: 38.6%; within $1 of it: 70.1%.


#### `ties-n3-hard.md`

### Price ties: 3 stalls, hard AI, 150 games

Customer lines with a seller: 6012 (40.1 per game). Two or more stalls offered: 48.3%. Lowest price tied: 28.6% of all lines (59.3% of contested lines), 11.5 per game. Ties involving the Haggler: 2.9 per game (it is at the table in 37.5% of seats).
Pieces sold at the customer's top price: 59.2%; within $1 of it: 78.8%.


#### `an-plainhaggler-n3.md`

### plainhaggler-n3.jsonl: 3 stalls, normal/normal/normal AI, 10 days, 1500 games

**Shopkeepers** (fair = 33.3%)

| Perk | Seats | Win % | SE | vs fair | Avg cash | Cash vs table | SE | Sole serves/game | Favours earned | Pieces bought | Spoiled | Perk cash/game |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| Haggler | 557 | 30.3 | 1.9 | -3 | 81.4 | -3 | 1.1 | 1.01 | 0.98 | 27.9 | 1.53 |  |
| Big Basket | 591 | 31.8 | 1.9 | -1.5 | 83.9 | -1.9 | 1 | 1.09 | 1.05 | 29.6 | 1.68 |  |
| Bargain Hunter | 573 | 33.9 | 2 | +0.5 | 90 | +3 | 1 | 1 | 0.97 | 29 | 1.71 |  |
| Charmer | 562 | 34.9 | 2 | +1.5 | 86.5 | +0.9 | 1 | 1.02 | 1.01 | 27.6 | 1.51 |  |
| Tip Jar | 550 | 25.1 | 1.8 | -8.2 | 81.6 | -4.2 | 1.1 | 0.93 | 0.9 | 27.4 | 1.64 | 1.9 |
| Nest Egg | 563 | 39.8 | 2.1 | +6.5 | 91 | +3.5 | 1 | 0.96 | 0.94 | 29.3 | 1.94 | 8 |
| Shade Cloth | 536 | 42.2 | 2.1 | +8.8 | 92.1 | +4.6 | 1 | 1.12 | 1.08 | 27.9 | 0.01 |  |
| Sharp Ears | 568 | 29 | 1.9 | -4.3 | 83.7 | -2.9 | 1 | 0.97 | 0.94 | 27.5 | 1.73 | 4.2 |


#### `upgrades-n3-d10.md`

### upgrades: 3 stalls, normal AI, 10 days, 700 games per row, focal seat rotates [current rules]

| Focal seat rule | Win % | SE | Cash | Cash vs average rival | Cash change vs first row (paired) | SE | Notes |
| --- | --- | --- | --- | --- | --- | --- | --- |
| never builds | 27.4 | 1.7 | 87.7 | -2.3 | 0 | 0 |  |
| Juice Bar only ($4) | 36.3 | 1.8 | 93.8 | 4.4 | 6.12 | 0.56 | built 1, day 3.24 |
| Handcart only ($6) | 34 | 1.8 | 87.7 | 0.8 | 0.02 | 0.7 | built 0.99, day 3.34 |
| Premium Display only ($6) | 36 | 1.8 | 92.3 | 1.7 | 4.65 | 0.7 | built 0.99, day 3.34 |
| Ripening Room only ($6) | 26 | 1.7 | 83.8 | -4.6 | -3.82 | 0.88 | built 0.99, day 3.34 |
| Order Book only ($5) | 26.3 | 1.7 | 83.6 | -5.8 | -4.05 | 0.62 | built 0.99, day 3.28 |
| computer chooses | 32.6 | 1.8 | 86.5 | 0.2 | -1.19 | 0.76 | built 1.73 |


#### `upgrades-n3-d8.md`

### upgrades: 3 stalls, normal AI, 8 days, 400 games per row, focal seat rotates [current rules]

| Focal seat rule | Win % | SE | Cash | Cash vs average rival | Cash change vs first row (paired) | SE | Notes |
| --- | --- | --- | --- | --- | --- | --- | --- |
| never builds | 31 | 2.3 | 75 | -1.4 | 0 | 0 |  |
| Juice Bar only ($4) | 36 | 2.4 | 77.3 | 1.3 | 2.35 | 0.56 | built 1, day 3.22 |
| Handcart only ($6) | 34 | 2.4 | 72.8 | -1.6 | -2.2 | 0.77 | built 0.99, day 3.27 |
| Premium Display only ($6) | 31.5 | 2.3 | 75.7 | -1.4 | 0.69 | 0.7 | built 0.99, day 3.27 |
| Ripening Room only ($6) | 32.8 | 2.3 | 71.9 | -2.9 | -3.09 | 1.07 | built 0.99, day 3.27 |
| Order Book only ($5) | 28.5 | 2.3 | 70.4 | -5.8 | -4.62 | 0.64 | built 0.99, day 3.26 |
| computer chooses | 33.5 | 2.4 | 74.5 | 0 | -0.49 | 0.73 | built 1.13 |


#### `upgrades-n3-d14.md`

### upgrades: 3 stalls, normal AI, 14 days, 400 games per row, focal seat rotates [current rules]

| Focal seat rule | Win % | SE | Cash | Cash vs average rival | Cash change vs first row (paired) | SE | Notes |
| --- | --- | --- | --- | --- | --- | --- | --- |
| never builds | 21.8 | 2.1 | 123.7 | -7.4 | 0 | 0 |  |
| Juice Bar only ($4) | 31.8 | 2.3 | 134.8 | 3.9 | 11.17 | 0.97 | built 1, day 3.22 |
| Handcart only ($6) | 31 | 2.3 | 124.1 | -2.7 | 0.47 | 1.49 | built 0.99, day 3.32 |
| Premium Display only ($6) | 28.3 | 2.3 | 130.5 | -3.8 | 6.81 | 1.35 | built 0.99, day 3.32 |
| Ripening Room only ($6) | 21.8 | 2.1 | 118.7 | -10.7 | -4.99 | 1.57 | built 0.99, day 3.32 |
| Order Book only ($5) | 19 | 2 | 119.3 | -11.3 | -4.35 | 1.15 | built 0.99, day 3.26 |
| computer chooses | 26.5 | 2.2 | 125 | -1.4 | 1.35 | 1.37 | built 1.95 |


#### `upgrades-U1-n3.md`

### upgrades: 3 stalls, normal AI, 10 days, 500 games per row, focal seat rotates [juice6,premium5,ripening4,book3]

| Focal seat rule | Win % | SE | Cash | Cash vs average rival | Cash change vs first row (paired) | SE | Notes |
| --- | --- | --- | --- | --- | --- | --- | --- |
| never builds | 26.4 | 2 | 88 | -3.7 | 0 | 0 |  |
| Juice Bar only ($6) | 27.8 | 2 | 90.6 | -0.6 | 2.64 | 0.72 | built 0.99, day 3.34 |
| Handcart only ($6) | 32.8 | 2.1 | 87.6 | -0.7 | -0.37 | 0.83 | built 0.99, day 3.34 |
| Premium Display only ($5) | 32.8 | 2.1 | 92 | -0.6 | 4.09 | 0.82 | built 0.99, day 3.28 |
| Ripening Room only ($4) | 24.6 | 1.9 | 85.9 | -4.5 | -2.05 | 1.03 | built 1, day 3.24 |
| Order Book only ($3) | 26.2 | 2 | 85.7 | -5.5 | -2.22 | 0.57 | built 1, day 3.23 |
| computer chooses | 30.4 | 2.1 | 86.8 | -1.5 | -1.14 | 0.88 | built 1.76 |


#### `upgrades-U2-n3.md`

### upgrades: 3 stalls, normal AI, 10 days, 500 games per row, focal seat rotates [juice6,premium5,ripening4,book3,ripeningOff1,bookBonus2]

| Focal seat rule | Win % | SE | Cash | Cash vs average rival | Cash change vs first row (paired) | SE | Notes |
| --- | --- | --- | --- | --- | --- | --- | --- |
| never builds | 23.2 | 1.9 | 88.7 | -6.6 | 0 | 0 |  |
| Juice Bar only ($6) | 26.2 | 2 | 91.3 | -3.3 | 2.6 | 0.76 | built 0.99, day 3.34 |
| Handcart only ($6) | 29.6 | 2 | 88.2 | -4.1 | -0.54 | 0.85 | built 0.99, day 3.34 |
| Premium Display only ($5) | 26 | 2 | 92.5 | -4.1 | 3.77 | 0.84 | built 0.99, day 3.28 |
| Ripening Room only ($4) | 26.4 | 2 | 89.5 | -4.7 | 0.8 | 1.12 | built 1, day 3.24 |
| Order Book only ($3) | 24.6 | 1.9 | 89.7 | -5.1 | 1.04 | 0.63 | built 1, day 3.23 |
| computer chooses | 30.4 | 2.1 | 89.8 | -2.3 | 1.1 | 0.89 | built 1.77 |


#### `favours-n3.md`

### favours: 3 stalls, normal AI, 10 days, 700 games per row, focal seat rotates [current rules]

| Focal seat rule | Win % | SE | Cash | Cash vs average rival | Cash change vs first row (paired) | SE | Notes |
| --- | --- | --- | --- | --- | --- | --- | --- |
| no free card | 32.9 | 1.8 | 86.9 | 0.8 | 0 | 0 |  |
| free Gossip | 34.3 | 1.8 | 87.2 | 1.1 | 0.28 | 0.53 |  |
| free Free Fruit | 36.6 | 1.8 | 90.1 | 4.5 | 3.18 | 0.79 |  |
| free Priority | 32.6 | 1.8 | 86 | -0.7 | -0.91 | 0.83 |  |
| free Scout | 31.3 | 1.8 | 86.7 | 0.4 | -0.19 | 0.42 |  |
| free Favoured Trade | 33 | 1.8 | 87.3 | 1.1 | 0.39 | 0.41 |  |
| free Fridge | 38.1 | 1.8 | 91.4 | 5.9 | 4.55 | 0.56 |  |


#### `events-n2.md`

### Events, paired against a calm day: 2 stalls, normal AI, 150 positions per event (random day 2 to 10) [current rules]

Calm day: delivered 2.3 / 2.1 / 2.1 / 2.1, wanted 1.9 / 1.4 / 1.9 / 1.7, bought 1.5 / 1.2 / 1.4 / 1.8, sold 1.3 / 1 / 1.1 / 1, average price 4.41 / 5.84 / 5.32 / 10.22 (B/W/A/M).

| Event | Delivered B/W/A/M | Wanted B/W/A/M | Bought B/W/A/M | Sold B/W/A/M | Price B/W/A/M | Income / stall | Fruit spend / stall | Net / stall | SE | Lost that night / stall | Uneven hit (avg abs) | Best vs worst stall | Rich minus poor |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| Festival | +0 / +0 / +0 / +0 | +0.89 / +0.93 / +0.97 / +0.65 | +0.31 / +0.5 / +0.57 / -0.33 | +0.27 / +0.55 / +0.55 / +0.31 | +0.79 / +1 / +0.98 / +1.2 | +8.31 | +1.33 | +6.98 | 0.39 | -0.01 | 4.14 | 8.3 | -1.07 |
| Superfood Trend | +0 / +0 / +0 / +0 | +2 / +0 / +0 / +0 | +1.49 / -0.17 / -0.25 / -0.26 | +1.2 / -0.13 / -0.2 / +0 | +2.17 / +0.15 / +0.2 / +0.03 | +4.69 | +0.17 | +4.48 | 0.21 | 0 | 4.64 | 9.3 | -2.99 |
| Mango Craze | +0 / +0 / +0 / +0 | +0 / +0 / +0 / +1 | -0.01 / +0 / -0.01 / +0.02 | -0.01 / +0 / -0.01 / +0.47 | +0.01 / +0 / +0 / +2.89 | +4.59 | +0.04 | +4.55 | 0.33 | 0 | 4.11 | 8.2 | -1.87 |
| Hotel Order | +0 / +0 / +0 / +0 | +1 / +1 / +1 / +0 | +0.43 / +0.56 / +0.49 / -0.32 | +0.36 / +0.61 / +0.43 / +0.01 | +0.98 / +0.79 / +1.05 / +0.09 | +6.11 | +1.34 | +4.77 | 0.27 | -0.01 | 3.33 | 6.7 | +1.55 |
| Heatwave | +0 / +0 / +0 / +0 | +0 / +0 / +0 / +0 | -0.07 / +0.37 / -0.04 / -0.05 | -0.03 / +0.09 / -0.03 / +0.01 | +0.02 / +1.59 / +0.04 / +0.01 | +1.12 | +0.32 | +0.79 | 0.16 | +0.4 | 1.79 | 3.6 | -0.57 |
| Apple Blight | +0 / +0 / -2.09 / +0 | +0 / +0 / +0 / +0 | +0.05 / -0.02 / -0.33 / -0.05 | +0.03 / -0.03 / -0.25 / +0 | +0.02 / +0.01 / +1.96 / -0.01 | +0.15 | -0.57 | +0.68 | 0.2 | +0 | 2.21 | 4.4 | -0.68 |
| Blueberry Glut | +1 / +0 / +0 / +0 | +0 / +0 / +0 / +0 | -0.12 / +0.01 / +0.03 / +0.07 | -0.17 / +0.01 / +0.03 / +0 | -0.64 / +0.01 / +0.02 / +0.01 | -0.57 | +0.11 | -0.68 | 0.11 | +0 | 1.04 | 2.1 | +0.07 |
| Good Harvest | +1 / +1 / +1 / +1 | +0 / +0 / +0 / +0 | -0.14 / -0.11 / -0.2 / +0.82 | -0.16 / -0.01 / -0.13 / -0.01 | -0.72 / -0.76 / -0.7 / -0.89 | -2.37 | +0.7 | -3.06 | 0.17 | 0 | 2.8 | 5.6 | +0.1 |
| Bad Harvest | -0.85 / -0.71 / -0.73 / -0.77 | +0 / +0 / +0 / +0 | -0.12 / +0.11 / +0.11 / -0.51 | -0.05 / -0.02 / +0.07 / +0 | +0.75 / +0.9 / +0.79 / +0.99 | +1.88 | -0.66 | +2.51 | 0.2 | 0 | 2.83 | 5.7 | -0.95 |
| Price Hike | +0 / +0 / +0 / +0 | +0 / +0 / +0 / +0 | -0.19 / -0.16 / -0.2 / -0.07 | -0.09 / -0.06 / -0.05 / +0 | +0.09 / +0.19 / +0.13 / +0.05 | -0.32 | +1.86 | -2.23 | 0.14 | -0.01 | 1.75 | 3.5 | +0.22 |
| Price Controls | +0 / +0 / +0 / +0 | +0 / +0 / +0 / +0 | +0 / +0 / +0 / +0 | +0.01 / +0 / +0.03 / +0 | -0.22 / -0.09 / -0.36 / -1.13 | -0.88 | +0 | -0.88 | 0.13 | +0 | 0.9 | 1.8 | -0.36 |
| Health Inspector | +0 / +0.06 / 0 / 0 | +0.01 / -0.06 / -0.01 / +0.05 | -0.03 / 0 / -0.07 / +0.21 | -0.02 / -0.02 / -0.1 / -0.01 | +0 / -0.04 / 0 / -0.13 | -0.12 | -0.07 | -0.71 | 0.12 | +0 | 0.65 | 1.3 | +0.07 |
| Lorry Breakdown | -2.27 / -2.06 / -2.09 / -2.09 | +0 / +0 / +0 / +0 | -0.83 / -0.53 / -0.43 / -1.47 | -0.59 / -0.37 / -0.29 / +0.01 | -0.57 / +0 / +0.13 / -0.01 | -3.49 | -4.58 | +0.91 | 0.33 | +0.03 | 3.52 | 7 | -3.67 |
| Tourist Bus | +0 / +0 / +0 / +0 | +1.58 / +1.77 / +1.99 / +1.48 | +0.24 / +0.59 / +0.61 / -0.2 | +0.25 / +0.69 / +0.65 / +0.61 | +0.11 / +0.24 / +0.26 / +0.19 | +8.15 | +1.61 | +6.54 | 0.44 | -0.03 | 4.57 | 9.1 | -0.29 |
| Monsoon Downpour | +0 / +0 / +0 / +0 | -0.87 / -0.85 / -0.94 / -0.74 | -0.39 / -0.52 / -0.55 / +0.11 | -0.41 / -0.51 / -0.48 / -0.41 | -0.21 / -0.15 / +0.04 / -0.41 | -6.08 | -1.86 | -4.21 | 0.35 | -0.31 | 3.77 | 7.5 | +1.47 |
| Durian Season | +0 / +0 / +0 / +0 | +0 / +0 / +0 / +0 | -0.08 / +0.04 / +0.05 / +0.2 | -0.1 / -0.01 / +0 / +0.01 | -0.71 / -1 / -0.94 / -0.91 | -2.13 | -2.51 | +0.38 | 0.13 | -0.01 | 2.01 | 4 | +0.01 |
| Kenduri | +0 / +0 / +0 / +0 | +0 / +3 / +0 / +0 | -0.35 / +1.73 / -0.38 / -0.29 | -0.27 / +1.69 / -0.3 / +0 | +0.12 / +1.26 / +0.29 / +0.05 | +5.52 | +1.11 | +4.38 | 0.25 | +0 | 4.38 | 8.8 | -1.55 |
| Mango Windfall | +0 / +0 / +0 / +1 | +0 / +0 / +0 / +0 | -0.04 / -0.03 / -0.07 / +0.55 | -0.03 / -0.01 / -0.03 / -0.02 | +0.01 / +0.03 / +0.08 / -1.86 | -1.16 | +0.62 | -1.77 | 0.14 | +0 | 1.85 | 3.7 | +0.54 |
| Pasar Malam | +0 / +0 / +0 / +0 | +0 / +0 / +0 / +0 | +0 / +0 / +0 / +0 | +0 / +0 / +0 / +0 | +0 / +0 / +0 / +0 | +2.69 | +0 | +2.69 | 0.14 | -0.2 | 1.05 | 2.1 | +0.02 |
| Bake-Off | +0 / +0 / +0 / +0 | +0 / +0 / +2 / +0 | -0.25 / -0.19 / +1.38 / -0.25 | -0.23 / -0.13 / +1.35 / +0 | +0.07 / +0.1 / +1.09 / +0.12 | +4.22 | +1.12 | +3.09 | 0.23 | -0.01 | 3.05 | 6.1 | -0.88 |

Health Inspector: average fine $0.64 per stall, 20.9% of stalls fined, average fine when fined $3.05, largest $8.


#### `events-n3.md`

### Events, paired against a calm day: 3 stalls, normal AI, 300 positions per event (random day 2 to 10) [current rules]

Calm day: delivered 2.8 / 2.8 / 2.6 / 2.6, wanted 2.1 / 2.6 / 3.1 / 2.4, bought 1.8 / 2.3 / 2.2 / 2.4, sold 1.5 / 1.9 / 2 / 1.5, average price 4.12 / 5.59 / 5.38 / 10.32 (B/W/A/M).

| Event | Delivered B/W/A/M | Wanted B/W/A/M | Bought B/W/A/M | Sold B/W/A/M | Price B/W/A/M | Income / stall | Fruit spend / stall | Net / stall | SE | Lost that night / stall | Uneven hit (avg abs) | Best vs worst stall | Rich minus poor |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| Festival | +0 / +0 / +0 / +0 | +0.73 / +0.82 / +0.96 / +0.86 | +0.39 / +0.51 / +0.52 / -0.23 | +0.36 / +0.47 / +0.46 / +0.41 | +0.92 / +0.94 / +0.99 / +1.22 | +6.54 | +1.02 | +5.53 | 0.22 | -0.01 | 5.38 | 13.9 | -2.86 |
| Superfood Trend | +0 / +0 / +0 / +0 | +2 / +0 / +0 / +0 | +1.63 / -0.18 / -0.23 / -0.16 | +1.31 / -0.13 / -0.2 / 0 | +2 / +0.02 / +0.07 / -0.01 | +3.13 | +0.34 | +2.78 | 0.11 | 0 | 4.49 | 11.6 | -2.44 |
| Mango Craze | +0 / +0 / +0 / +0 | +0 / +0 / +0 / +1 | +0 / 0 / +0 / +0.02 | +0 / +0 / +0 / +0.47 | +0 / +0 / +0 / +2.54 | +3.34 | +0.03 | +3.3 | 0.17 | +0 | 3.77 | 9.1 | -2.11 |
| Hotel Order | +0 / +0 / +0 / +0 | +1 / +1 / +1 / +0 | +0.55 / +0.58 / +0.5 / -0.18 | +0.36 / +0.6 / +0.44 / 0 | +1.01 / +0.57 / +0.6 / +0.02 | +4.02 | +1.15 | +2.87 | 0.13 | -0.01 | 3.64 | 9.4 | +0.83 |
| Heatwave | +0 / +0 / +0 / +0 | +0 / +0 / +0 / +0 | -0.07 / +0.42 / -0.05 / -0.05 | -0.03 / +0.13 / -0.04 / +0 | +0.03 / +1.54 / +0.02 / +0 | +1.22 | +0.27 | +0.96 | 0.1 | +0.31 | 2.71 | 7.1 | -2.08 |
| Apple Blight | +0 / +0 / -2.56 / +0 | +0 / +0 / +0 / +0 | +0.05 / +0.01 / -1.04 / +0.01 | +0 / -0.01 / -0.85 / +0 | +0.03 / -0.1 / +1.8 / -0.02 | -0.96 | -0.98 | -0.01 | 0.12 | +0 | 2.76 | 7.1 | -1.12 |
| Blueberry Glut | +2 / +0 / +0 / +0 | +0 / +0 / +0 / +0 | -0.13 / +0.02 / +0.05 / +0.03 | -0.13 / +0.01 / +0.03 / +0 | -0.7 / -0.02 / 0 / 0 | -0.42 | +0.05 | -0.46 | 0.06 | +0.01 | 1.19 | 3.1 | -0.06 |
| Good Harvest | +1 / +1 / +1 / +1 | +0 / +0 / +0 / +0 | -0.26 / -0.1 / -0.01 / +0.85 | -0.21 / +0.01 / 0 / 0 | -0.6 / -0.83 / -0.91 / -0.98 | -2.16 | +0.6 | -2.75 | 0.1 | +0.01 | 3.2 | 8.3 | -0.34 |
| Bad Harvest | -1.17 / -1.18 / -1.02 / -1 | +0 / +0 / +0 / +0 | -0.11 / -0.23 / -0.13 / -0.79 | -0.07 / -0.17 / -0.14 / +0.01 | +0.94 / +0.88 / +0.85 / +0.97 | +1.33 | -1.27 | +2.59 | 0.13 | +0.01 | 3.84 | 9.8 | -2.13 |
| Price Hike | +0 / +0 / +0 / +0 | +0 / +0 / +0 / +0 | -0.37 / -0.29 / -0.22 / -0.06 | -0.16 / -0.08 / -0.09 / 0 | +0.16 / +0.16 / +0.09 / 0 | -0.31 | +1.81 | -2.11 | 0.08 | -0.01 | 2.27 | 5.8 | -0.73 |
| Price Controls | +0 / +0 / +0 / +0 | +0 / +0 / +0 / +0 | +0 / +0 / +0 / +0 | +0.01 / +0.01 / +0.05 / +0.01 | -0.27 / -0.04 / -0.34 / -1.16 | -0.83 | +0 | -0.83 | 0.08 | +0 | 1.3 | 3.3 | -0.2 |
| Health Inspector | +0.01 / +0.03 / -0.01 / 0 | -0.03 / +0.04 / +0 / -0.01 | -0.03 / -0.02 / -0.05 / +0.29 | -0.04 / -0.01 / -0.06 / -0.07 | -0.06 / -0.02 / -0.04 / -0.08 | 0 | -0.03 | -0.42 | 0.05 | +0 | 0.52 | 1.3 | +0.15 |
| Lorry Breakdown | -2.83 / -2.84 / -2.56 / -2.63 | +0 / +0 / +0 / +0 | -1.01 / -1.27 / -1.17 / -2.17 | -0.73 / -0.84 / -0.92 / +0 | -0.47 / -0.02 / +0.1 / -0.02 | -4.52 | -5.33 | +0.69 | 0.2 | +0.02 | 4.63 | 11.9 | -3.42 |
| Tourist Bus | +0 / +0 / +0 / +0 | +1.5 / +1.48 / +1.6 / +1.47 | +0.43 / +0.71 / +0.56 / -0.1 | +0.48 / +0.77 / +0.51 / +0.6 | +0.17 / +0.15 / +0.19 / +0.3 | +5.75 | +1.36 | +4.4 | 0.25 | -0.01 | 4.81 | 12.2 | -1.49 |
| Monsoon Downpour | +0 / +0 / +0 / +0 | -0.59 / -0.83 / -1.08 / -0.86 | -0.36 / -0.47 / -0.56 / +0.05 | -0.31 / -0.51 / -0.55 / -0.45 | -0.1 / -0.22 / -0.11 / -0.37 | -4.24 | -1.18 | -3.05 | 0.18 | -0.23 | 4.01 | 10.1 | +1.58 |
| Durian Season | +0 / +0 / +0 / +0 | +0 / +0 / +0 / +0 | -0.02 / +0.06 / +0.08 / +0.1 | -0.09 / -0.01 / -0.01 / 0 | -0.63 / -0.96 / -0.99 / -0.98 | -2.21 | -2.58 | +0.38 | 0.08 | +0.01 | 2.39 | 6.2 | -0.48 |
| Kenduri | +0 / +0 / +0 / +0 | +0 / +3 / +0 / +0 | -0.33 / +1.63 / -0.28 / -0.16 | -0.2 / +1.64 / -0.23 / +0 | +0.1 / +1.25 / +0.05 / +0.05 | +4.01 | +0.92 | +3.1 | 0.14 | -0.01 | 4.14 | 10.8 | -1.29 |
| Mango Windfall | +0 / +0 / +0 / +2 | +0 / +0 / +0 / +0 | -0.18 / -0.12 / -0.17 / +1.39 | -0.1 / -0.06 / -0.11 / -0.01 | +0.08 / +0.05 / +0.09 / -1.97 | -1.32 | +1 | -2.33 | 0.09 | 0 | 3.09 | 7.9 | +0.11 |
| Pasar Malam | +0 / +0 / +0 / +0 | +0 / +0 / +0 / +0 | +0 / +0 / +0 / +0 | +0 / +0 / +0 / +0 | +0 / +0 / +0 / +0 | +2.44 | +0 | +2.44 | 0.08 | -0.15 | 1.38 | 3.4 | +0.08 |
| Bake-Off | +0 / +0 / +0 / +0 | +0 / +0 / +2 / +0 | -0.18 / -0.21 / +1.18 / -0.11 | -0.11 / -0.16 / +1.16 / +0 | +0.07 / +0.02 / +1.02 / +0 | +2.79 | +0.74 | +2.05 | 0.12 | 0 | 3.54 | 9.2 | -1.22 |

Health Inspector: average fine $0.46 per stall, 15.1% of stalls fined, average fine when fined $3.02, largest $8.


#### `events-n4.md`

### Events, paired against a calm day: 4 stalls, normal AI, 200 positions per event (random day 2 to 10) [current rules]

Calm day: delivered 4.2 / 4 / 3.6 / 3.7, wanted 3.3 / 3.6 / 3.5 / 3.2, bought 2.8 / 3.2 / 2.7 / 3.1, sold 2.3 / 2.8 / 2.3 / 2.1, average price 3.88 / 5.33 / 5.15 / 10 (B/W/A/M).

| Event | Delivered B/W/A/M | Wanted B/W/A/M | Bought B/W/A/M | Sold B/W/A/M | Price B/W/A/M | Income / stall | Fruit spend / stall | Net / stall | SE | Lost that night / stall | Uneven hit (avg abs) | Best vs worst stall | Rich minus poor |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| Festival | +0 / +0 / +0 / +0 | +0.68 / +0.64 / +0.67 / +0.71 | +0.47 / +0.53 / +0.66 / -0.32 | +0.48 / +0.44 / +0.51 / +0.42 | +0.78 / +0.92 / +0.85 / +1.25 | +5.45 | +0.85 | +4.59 | 0.25 | -0.01 | 5.31 | 15.7 | -1.88 |
| Superfood Trend | +0 / +0 / +0 / +0 | +1.78 / -0.2 / -0.12 / -0.17 | +2.01 / -0.28 / -0.33 / -0.15 | +1.47 / -0.24 / -0.23 / -0.09 | +1.72 / -0.01 / +0.09 / -0.04 | +2.29 | +0.26 | +2.05 | 0.18 | +0.01 | 4.94 | 14.9 | -0.01 |
| Mango Craze | +0 / +0 / +0 / +0 | -0.22 / -0.2 / -0.12 / +0.82 | +0 / +0 / +0 / +0 | -0.11 / -0.1 / -0.04 / +0.43 | -0.06 / -0.05 / -0.05 / +2.55 | +2.36 | +0 | +2.35 | 0.2 | +0 | 4.07 | 11.7 | -3.33 |
| Hotel Order | +0 / +0 / +0 / +0 | +0.78 / +0.8 / +0.88 / -0.17 | +0.54 / +0.54 / +0.61 / -0.19 | +0.24 / +0.48 / +0.49 / -0.09 | +0.77 / +0.49 / +0.46 / -0.04 | +2.4 | +0.9 | +1.49 | 0.19 | 0 | 3.95 | 12.1 | +0.69 |
| Heatwave | +0 / +0 / +0 / +0 | +0 / +0 / +0 / +0 | -0.17 / +0.61 / -0.1 / -0.07 | -0.1 / +0.17 / -0.06 / +0 | -0.01 / +1.59 / +0.04 / +0 | +1.22 | +0.23 | +1 | 0.11 | +0.27 | 3.14 | 9.6 | -0.35 |
| Apple Blight | +0 / +0 / -3.6 / +0 | +0 / +0 / +0 / +0 | +0.12 / +0.05 / -1.23 / +0.02 | +0.07 / 0 / -0.89 / +0 | -0.1 / 0 / +1.8 / +0.01 | -0.62 | -0.8 | +0.11 | 0.16 | +0 | 2.83 | 8.5 | -0.7 |
| Blueberry Glut | +2 / +0 / +0 / +0 | +0 / +0 / +0 / +0 | -0.39 / +0.07 / +0.08 / +0.06 | -0.38 / +0.03 / +0.06 / +0 | -0.6 / -0.01 / -0.07 / +0.02 | -0.6 | -0.02 | -0.58 | 0.08 | +0.02 | 1.37 | 4.1 | -0.2 |
| Good Harvest | +1 / +1 / +1 / +1 | +0 / +0 / +0 / +0 | -0.45 / -0.19 / -0.12 / +0.96 | -0.37 / -0.02 / -0.07 / -0.01 | -0.55 / -0.78 / -0.76 / -0.94 | -2.25 | +0.3 | -2.52 | 0.11 | +0.02 | 3.39 | 10.2 | +0.13 |
| Bad Harvest | -1.85 / -1.8 / -1.54 / -1.56 | +0 / +0 / +0 / +0 | -0.03 / -0.25 / -0.06 / -1.15 | +0.04 / -0.18 / -0.04 / -0.01 | +0.71 / +0.93 / +0.93 / +0.99 | +1.74 | -1.2 | +2.89 | 0.15 | +0.01 | 4.32 | 13 | -1.06 |
| Price Hike | +0 / +0 / +0 / +0 | +0 / +0 / +0 / +0 | -0.52 / -0.38 / -0.32 / -0.07 | -0.19 / -0.11 / -0.11 / +0 | +0.19 / +0.18 / +0.16 / +0.01 | -0.19 | +1.85 | -2.03 | 0.1 | -0.01 | 2.6 | 7.7 | -0.88 |
| Price Controls | +0 / +0 / +0 / +0 | +0 / +0 / +0 / +0 | +0 / +0 / +0 / +0 | +0.03 / +0 / +0.05 / +0.02 | -0.19 / -0.05 / -0.28 / -0.93 | -0.67 | +0 | -0.67 | 0.07 | +0 | 1.61 | 4.9 | +0.43 |
| Health Inspector | +0.01 / +0.05 / -0.04 / -0.03 | +0.1 / -0.02 / -0.05 / -0.03 | +0.01 / -0.03 / -0.11 / +0.38 | +0.01 / -0.07 / -0.11 / -0.12 | +0.04 / -0.02 / -0.08 / -0.07 | -0.05 | -0.04 | -0.53 | 0.06 | +0 | 0.72 | 2 | +0.17 |
| Lorry Breakdown | -4.2 / -4.01 / -3.6 / -3.65 | +0 / +0 / +0 / +0 | -1.32 / -1.53 / -1.35 / -2.89 | -0.85 / -0.94 / -0.92 / 0 | -0.35 / +0.18 / +0.05 / -0.03 | -3.57 | -5.12 | +1.39 | 0.25 | +0.02 | 5.37 | 16 | -2.31 |
| Tourist Bus | +0 / +0 / +0 / +0 | +0.68 / +0.64 / +0.67 / +0.71 | +0.22 / +0.37 / +0.47 / -0.06 | +0.29 / +0.34 / +0.37 / +0.42 | +0.06 / +0.08 / -0.01 / +0.27 | +2.5 | +0.66 | +1.84 | 0.21 | -0.01 | 3.73 | 11 | -0.82 |
| Monsoon Downpour | +0 / +0 / +0 / +0 | -1.78 / -1.85 / -1.58 / -1.61 | -0.98 / -1.37 / -1.05 / +0.19 | -1.03 / -1.27 / -0.91 / -0.93 | -0.03 / -0.1 / -0.15 / -0.24 | -6.45 | -2.1 | -4.33 | 0.25 | -0.24 | 5.59 | 16.8 | +2.28 |
| Durian Season | +0 / +0 / +0 / +0 | +0 / +0 / +0 / +0 | +0 / +0.1 / +0.05 / +0.23 | -0.14 / 0 / -0.07 / -0.01 | -0.61 / -0.92 / -0.93 / -0.95 | -2.3 | -2.57 | +0.26 | 0.11 | +0.01 | 2.81 | 8.6 | +0.68 |
| Kenduri | +0 / +0 / +0 / +0 | -0.22 / +2.8 / -0.12 / -0.17 | -0.43 / +2.01 / -0.33 / -0.21 | -0.33 / +1.8 / -0.24 / -0.09 | -0.03 / +1.07 / +0.08 / -0.04 | +2.77 | +0.84 | +1.95 | 0.19 | 0 | 4.29 | 13 | +1.05 |
| Mango Windfall | +0 / +0 / +0 / +2 | +0 / +0 / +0 / +0 | -0.21 / -0.17 / -0.17 / +1.38 | -0.1 / -0.06 / -0.06 / -0.03 | +0.03 / +0.09 / +0.1 / -1.91 | -1.24 | +0.7 | -1.93 | 0.1 | 0 | 3.16 | 9.2 | +1.15 |
| Pasar Malam | +0 / +0 / +0 / +0 | +0 / +0 / +0 / +0 | +0 / +0 / +0 / +0 | +0 / +0 / +0 / +0 | +0 / +0 / +0 / +0 | +2.36 | +0 | +2.36 | 0.08 | -0.16 | 1.52 | 4.2 | +0.24 |
| Bake-Off | +0 / +0 / +0 / +0 | -0.22 / -0.2 / +1.88 / -0.17 | -0.33 / -0.23 / +1.53 / -0.09 | -0.32 / -0.24 / +1.37 / -0.09 | -0.09 / +0.03 / +1.02 / -0.04 | +1.78 | +0.76 | +0.99 | 0.18 | 0 | 3.7 | 11.3 | +0.77 |

Health Inspector: average fine $0.53 per stall, 17.4% of stalls fined, average fine when fined $3.02, largest $10.


#### `events-n6.md`

### Events, paired against a calm day: 6 stalls, normal AI, 80 positions per event (random day 2 to 10) [current rules]

Calm day: delivered 6.7 / 6.2 / 5.8 / 6.6, wanted 5.3 / 5.6 / 5.2 / 4.9, bought 4.2 / 4.3 / 3.7 / 5.6, sold 3.6 / 3.9 / 3.4 / 3.6, average price 3.83 / 5.35 / 4.95 / 9.76 (B/W/A/M).

| Event | Delivered B/W/A/M | Wanted B/W/A/M | Bought B/W/A/M | Sold B/W/A/M | Price B/W/A/M | Income / stall | Fruit spend / stall | Net / stall | SE | Lost that night / stall | Uneven hit (avg abs) | Best vs worst stall | Rich minus poor |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| Festival | +0 / +0 / +0 / +0 | +0 / +0 / +0 / +0 | +0.51 / +0.38 / +0.4 / -0.4 | +0.46 / +0.22 / +0.23 / +0 | +0.76 / +0.85 / +0.9 / +0.93 | +2.9 | +0.36 | +2.54 | 0.15 | -0.01 | 3.86 | 14.6 | +0.78 |
| Superfood Trend | +0 / +0 / +0 / +0 | +0.84 / -1.43 / -0.78 / -1.04 | +3.18 / -0.35 / -0.6 / -0.42 | +1.51 / -0.84 / -0.74 / -0.65 | +1.36 / -0.13 / -0.09 / -0.16 | -0.51 | +0.19 | -0.71 | 0.33 | +0 | 6.25 | 24.4 | +0.19 |
| Mango Craze | +0 / +0 / +0 / +0 | -1.16 / -1.43 / -0.78 / -0.04 | +0.01 / -0.01 / -0.02 / +0.04 | -0.51 / -0.67 / -0.29 / +0.02 | -0.17 / -0.28 / -0.12 / +2.42 | +0.02 | +0.04 | -0.02 | 0.32 | +0 | 5.02 | 19.5 | -0.4 |
| Hotel Order | +0 / +0 / +0 / +0 | -0.16 / -0.43 / +0.22 / -1.04 | +0.64 / +0.8 / +0.76 / -0.35 | -0.16 / +0.04 / +0.3 / -0.65 | +0.61 / +0.27 / +0.43 / -0.15 | -0.21 | +0.76 | -0.97 | 0.31 | -0.01 | 5.03 | 19.3 | +0.95 |
| Heatwave | +0 / +0 / +0 / +0 | +0 / +0 / +0 / +0 | -0.3 / +1.29 / -0.27 / -0.16 | -0.2 / +0.63 / -0.21 / +0 | +0.02 / +1.64 / +0.01 / +0.01 | +1.53 | +0.32 | +1.21 | 0.16 | +0.33 | 3.5 | 13.6 | +0.31 |
| Apple Blight | +0 / +0 / -5.84 / +0 | +0 / +0 / +0 / +0 | -0.01 / +0.17 / -1.47 / -0.06 | +0.01 / +0.09 / -1.23 / +0.01 | -0.03 / +0.02 / +1.89 / +0.02 | -0.18 | -0.68 | +0.48 | 0.2 | 0 | 2.9 | 10.9 | +1.21 |
| Blueberry Glut | +3 / +0 / +0 / +0 | +0 / +0 / +0 / +0 | -0.89 / +0.21 / +0.13 / +0.13 | -0.81 / +0.11 / +0.09 / +0 | -0.48 / -0.02 / -0.02 / -0.01 | -0.58 | -0.04 | -0.54 | 0.1 | +0.02 | 1.68 | 6.5 | -0.21 |
| Good Harvest | +2 / +2 / +2 / +2 | +0 / +0 / +0 / +0 | -0.79 / -0.45 / -0.52 / +1.81 | -0.75 / -0.21 / -0.37 / -0.01 | -0.47 / -0.86 / -0.63 / -0.98 | -2.69 | +0.18 | -2.87 | 0.16 | +0.02 | 3.72 | 13.8 | -0.87 |
| Bad Harvest | -3.09 / -2.82 / -2.71 / -3.04 | +0 / +0 / +0 / +0 | +0.35 / +0.17 / +0.17 / -2.29 | +0.34 / +0.08 / +0.01 / +0.02 | +0.76 / +0.83 / +0.95 / +0.91 | +2.58 | -0.95 | +3.52 | 0.21 | +0.01 | 5.02 | 17.7 | +2.16 |
| Price Hike | +0 / +0 / +0 / +0 | +0 / +0 / +0 / +0 | -0.83 / -0.59 / -0.52 / -0.2 | -0.36 / -0.29 / -0.26 / +0 | +0.24 / +0.16 / +0.14 / +0.01 | -0.44 | +1.8 | -2.22 | 0.16 | -0.02 | 2.88 | 10.1 | -1.49 |
| Price Controls | +0 / +0 / +0 / +0 | +0 / +0 / +0 / +0 | +0 / +0 / +0 / +0 | +0.05 / +0.02 / +0.04 / +0.04 | -0.2 / -0.04 / -0.2 / -0.73 | -0.57 | +0 | -0.57 | 0.12 | +0 | 2.31 | 10 | -0.01 |
| Health Inspector | +0.05 / +0.2 / -0.16 / -0.04 | -0.05 / +0.07 / -0.07 / -0.03 | -0.12 / +0.02 / -0.29 / +0.68 | -0.24 / +0.03 / -0.17 / -0.15 | -0.16 / -0.03 / -0.04 / -0.13 | -0.02 | -0.06 | -0.66 | 0.12 | +0 | 1.15 | 3.9 | +0.97 |
| Lorry Breakdown | -6.65 / -6.15 / -5.84 / -6.55 | +0 / +0 / +0 / +0 | -1.6 / -1.23 / -1.72 / -5.29 | -1.01 / -1 / -1.29 / +0.04 | -0.37 / -0.17 / +0.13 / -0.04 | -2.75 | -4.84 | +2.03 | 0.37 | +0.03 | 5.87 | 20.8 | +1.68 |
| Tourist Bus | +0 / +0 / +0 / +0 | +0 / +0 / +0 / +0 | +0 / +0 / +0 / +0 | +0 / +0 / +0 / +0 | +0 / +0 / +0 / +0 | +0 | +0 | +0 | 0 | +0 | 0 | 0 | +0 |
| Monsoon Downpour | +0 / +0 / +0 / +0 | -1.95 / -2.14 / -1.76 / -1.9 | -1.18 / -1.39 / -1.06 / +0.2 | -1.1 / -1.46 / -0.96 / -1.29 | -0.04 / -0.32 / -0.01 / -0.23 | -5.17 | -1.47 | -3.7 | 0.39 | -0.36 | 5.72 | 20.7 | +1.25 |
| Durian Season | +0 / +0 / +0 / +0 | +0 / +0 / +0 / +0 | -0.11 / +0.31 / +0.05 / +0.36 | -0.31 / +0.13 / -0.08 / +0 | -0.53 / -0.97 / -0.95 / -0.98 | -2.23 | -2.53 | +0.32 | 0.15 | +0.01 | 3.17 | 11.6 | +1.64 |
| Kenduri | +0 / +0 / +0 / +0 | -1.16 / +1.57 / -0.78 / -1.04 | -0.74 / +3.13 / -0.49 / -0.35 | -0.82 / +1.83 / -0.56 / -0.65 | -0.1 / +0.39 / -0.07 / -0.19 | -0.27 | +0.84 | -1.11 | 0.3 | -0.02 | 5.54 | 21.7 | +2.66 |
| Mango Windfall | +0 / +0 / +0 / +3 | +0 / +0 / +0 / +0 | -0.35 / -0.18 / -0.24 / +1.83 | -0.19 / -0.12 / -0.14 / -0.02 | +0.04 / +0.1 / +0.01 / -1.92 | -1.45 | +0.63 | -2.08 | 0.16 | -0.01 | 3.53 | 13.3 | +0.81 |
| Pasar Malam | +0 / +0 / +0 / +0 | +0 / +0 / +0 / +0 | +0 / +0 / +0 / +0 | +0 / +0 / +0 / +0 | +0 / +0 / +0 / +0 | +2.14 | +0 | +2.14 | 0.14 | -0.18 | 1.48 | 4.5 | +0.34 |
| Bake-Off | +0 / +0 / +0 / +0 | -1.16 / -1.43 / +1.22 / -1.04 | -0.54 / -0.39 / +2.44 / -0.33 | -0.74 / -0.85 / +1.46 / -0.65 | -0.17 / -0.17 / +0.89 / -0.19 | -0.63 | +0.72 | -1.35 | 0.32 | -0.02 | 5.55 | 21.2 | +1.33 |

Health Inspector: average fine $0.74 per stall, 19.5% of stalls fined, average fine when fined $3.78, largest $10.


#### `events-EV1-n3.md`

### Events, paired against a calm day: 3 stalls, normal AI, 200 positions per event (random day 2 to 10) [windfallRipe,glutCheap]

Calm day: delivered 2.9 / 2.9 / 2.6 / 2.7, wanted 2.2 / 2.5 / 3 / 2.6, bought 1.9 / 2.3 / 2.1 / 2.4, sold 1.5 / 1.9 / 1.9 / 1.5, average price 4.19 / 5.51 / 5.41 / 10.29 (B/W/A/M).

| Event | Delivered B/W/A/M | Wanted B/W/A/M | Bought B/W/A/M | Sold B/W/A/M | Price B/W/A/M | Income / stall | Fruit spend / stall | Net / stall | SE | Lost that night / stall | Uneven hit (avg abs) | Best vs worst stall | Rich minus poor |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| Festival | +0 / +0 / +0 / +0 | +0.67 / +0.75 / +1.07 / +0.89 | +0.36 / +0.52 / +0.56 / -0.22 | +0.31 / +0.46 / +0.48 / +0.37 | +0.92 / +0.95 / +1.01 / +1.15 | +6.25 | +1.07 | +5.17 | 0.26 | -0.01 | 5.44 | 14.1 | -3.01 |
| Superfood Trend | +0 / +0 / +0 / +0 | +2 / +0 / +0 / +0 | +1.62 / -0.18 / -0.2 / -0.15 | +1.3 / -0.12 / -0.18 / 0 | +1.91 / +0.02 / +0.12 / +0 | +3.19 | +0.38 | +2.78 | 0.15 | 0 | 4.69 | 12 | -3.45 |
| Mango Craze | +0 / +0 / +0 / +0 | +0 / +0 / +0 / +1 | +0 / -0.02 / +0 / +0.03 | +0 / -0.01 / +0 / +0.42 | +0.01 / +0 / +0 / +2.51 | +3.07 | +0.03 | +3.04 | 0.21 | +0 | 3.58 | 8.7 | -2.14 |
| Hotel Order | +0 / +0 / +0 / +0 | +1 / +1 / +1 / +0 | +0.5 / +0.63 / +0.52 / -0.19 | +0.29 / +0.63 / +0.46 / 0 | +1 / +0.56 / +0.66 / +0.02 | +4 | +1.2 | +2.77 | 0.17 | -0.01 | 3.83 | 10 | +0.63 |
| Heatwave | +0 / +0 / +0 / +0 | +0 / +0 / +0 / +0 | -0.09 / +0.48 / -0.03 / -0.06 | -0.04 / +0.11 / -0.03 / +0 | +0.04 / +1.56 / +0.02 / +0.01 | +1.18 | +0.32 | +0.86 | 0.12 | +0.3 | 2.73 | 7.1 | -1.92 |
| Apple Blight | +0 / +0 / -2.58 / +0 | +0 / +0 / +0 / +0 | +0.03 / +0.03 / -1.08 / +0.01 | +0.02 / -0.02 / -0.88 / +0 | 0 / -0.11 / +1.77 / +0 | -1.14 | -1 | -0.17 | 0.14 | +0 | 2.84 | 7.3 | -1.39 |
| Blueberry Glut | +2 / +0 / +0 / +0 | +0 / +0 / +0 / +0 | +0.4 / -0.01 / 0 / +0.01 | +0.14 / +0 / +0 / +0 | -0.72 / +0 / +0.02 / +0 | -0.19 | -0.35 | +0.17 | 0.07 | +0.01 | 1.13 | 2.9 | -0.69 |
| Good Harvest | +1 / +1 / +1 / +1 | +0 / +0 / +0 / +0 | -0.27 / -0.16 / +0.02 / +0.87 | -0.22 / -0.03 / +0.01 / 0 | -0.65 / -0.79 / -0.86 / -0.93 | -2.15 | +0.59 | -2.72 | 0.13 | +0.01 | 3.11 | 8 | -0.41 |
| Bad Harvest | -1.21 / -1.23 / -1.04 / -1.05 | +0 / +0 / +0 / +0 | -0.13 / -0.19 / -0.12 / -0.79 | -0.04 / -0.15 / -0.13 / +0.01 | +0.83 / +0.87 / +0.8 / +0.99 | +1.35 | -1.26 | +2.61 | 0.16 | +0.01 | 3.91 | 9.9 | -2.29 |
| Price Hike | +0 / +0 / +0 / +0 | +0 / +0 / +0 / +0 | -0.39 / -0.28 / -0.2 / -0.04 | -0.17 / -0.07 / -0.08 / +0 | +0.16 / +0.16 / +0.13 / +0 | -0.27 | +1.85 | -2.1 | 0.11 | -0.01 | 2.32 | 6 | -1.09 |
| Price Controls | +0 / +0 / +0 / +0 | +0 / +0 / +0 / +0 | +0 / +0 / +0 / +0 | +0.01 / +0 / +0.06 / +0.02 | -0.31 / -0.05 / -0.41 / -1.11 | -0.81 | +0 | -0.81 | 0.09 | +0 | 1.39 | 3.5 | -0.35 |
| Health Inspector | +0.02 / +0.03 / -0.02 / -0.03 | -0.04 / 0 / +0.06 / -0.01 | -0.02 / -0.05 / -0.01 / +0.3 | -0.03 / -0.03 / -0.02 / -0.05 | -0.06 / -0.05 / -0.04 / -0.06 | +0 | -0.04 | -0.45 | 0.06 | +0 | 0.49 | 1.2 | +0.08 |
| Lorry Breakdown | -2.89 / -2.9 / -2.58 / -2.72 | +0 / +0 / +0 / +0 | -1.02 / -1.28 / -1.19 / -2.21 | -0.71 / -0.85 / -0.92 / +0 | -0.66 / +0.04 / +0.07 / +0.01 | -4.61 | -5.45 | +0.68 | 0.25 | +0.01 | 4.83 | 12.5 | -4.28 |
| Tourist Bus | +0 / +0 / +0 / +0 | +1.44 / +1.41 / +1.69 / +1.51 | +0.34 / +0.68 / +0.59 / -0.08 | +0.38 / +0.73 / +0.56 / +0.62 | +0.13 / +0.2 / +0.25 / +0.11 | +5.58 | +1.37 | +4.22 | 0.29 | -0.01 | 4.65 | 11.9 | -1.96 |
| Monsoon Downpour | +0 / +0 / +0 / +0 | -0.66 / -0.78 / -0.97 / -0.95 | -0.37 / -0.43 / -0.51 / +0.06 | -0.33 / -0.52 / -0.47 / -0.47 | -0.16 / -0.29 / -0.13 / -0.39 | -4.28 | -1.1 | -3.17 | 0.23 | -0.23 | 4.1 | 10.4 | +0.91 |
| Durian Season | +0 / +0 / +0 / +0 | +0 / +0 / +0 / +0 | -0.01 / +0.04 / +0.07 / +0.11 | -0.12 / -0.03 / -0.02 / +0 | -0.59 / -0.96 / -0.97 / -0.97 | -2.23 | -2.59 | +0.36 | 0.09 | +0.02 | 2.24 | 5.9 | -0.28 |
| Kenduri | +0 / +0 / +0 / +0 | +0 / +3 / +0 / +0 | -0.36 / +1.61 / -0.2 / -0.16 | -0.22 / +1.65 / -0.18 / +0 | +0.05 / +1.29 / +0.04 / +0.05 | +4.07 | +0.97 | +3.1 | 0.16 | -0.01 | 4.42 | 11.4 | -2.14 |
| Mango Windfall | +0 / +0 / +0 / +2 | +0 / +0 / +0 / +0 | -0.08 / -0.03 / -0.02 / +0.61 | -0.05 / -0.02 / -0.01 / +0.49 | +0.01 / -0.01 / +0 / -1.74 | +0.44 | +1.17 | -0.65 | 0.18 | +0 | 2.24 | 5.7 | +1.39 |
| Pasar Malam | +0 / +0 / +0 / +0 | +0 / +0 / +0 / +0 | +0 / +0 / +0 / +0 | +0 / +0 / +0 / +0 | +0 / +0 / +0 / +0 | +2.39 | +0 | +2.39 | 0.1 | -0.16 | 1.43 | 3.5 | +0.06 |
| Bake-Off | +0 / +0 / +0 / +0 | +0 / +0 / +2 / +0 | -0.19 / -0.19 / +1.14 / -0.1 | -0.11 / -0.16 / +1.14 / +0 | +0.01 / -0.01 / +1.02 / +0.01 | +2.67 | +0.74 | +1.95 | 0.14 | -0.01 | 3.57 | 9.3 | -1.17 |

Health Inspector: average fine $0.49 per stall, 16.5% of stalls fined, average fine when fined $2.97, largest $6.


#### `events-guest-n6.md`

### Events, paired against a calm day: 6 stalls, normal AI, 50 positions per event (random day 2 to 10) [guestOverCap]

Calm day: delivered 7 / 6.3 / 5.7 / 6.5, wanted 4.3 / 5.5 / 5.8 / 5.1, bought 3.5 / 4.6 / 3.9 / 5.9, sold 2.9 / 3.9 / 3.6 / 3.6, average price 3.68 / 5.19 / 5.06 / 9.93 (B/W/A/M).

| Event | Delivered B/W/A/M | Wanted B/W/A/M | Bought B/W/A/M | Sold B/W/A/M | Price B/W/A/M | Income / stall | Fruit spend / stall | Net / stall | SE | Lost that night / stall | Uneven hit (avg abs) | Best vs worst stall | Rich minus poor |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| Festival | +0 / +0 / +0 / +0 | +0 / +0 / +0 / +0 | +0.56 / +0.4 / +0.34 / -0.48 | +0.44 / +0.2 / +0.22 / +0 | +0.64 / +0.88 / +0.91 / +1 | +2.79 | +0.31 | +2.48 | 0.17 | 0 | 3.43 | 12.4 | -0.22 |
| Superfood Trend | +0 / +0 / +0 / +0 | +2 / +0 / +0 / +0 | +3.46 / -0.5 / -0.6 / -0.46 | +2.36 / -0.44 / -0.5 / +0 | +1.53 / +0.09 / 0 / +0.01 | +2.03 | +0.27 | +1.75 | 0.18 | 0 | 4.13 | 15.8 | +1.5 |
| Mango Craze | +0 / +0 / +0 / +0 | +0 / +0 / +0 / +1 | +0 / -0.04 / +0 / +0.04 | +0 / -0.04 / +0 / +0.56 | +0.03 / +0 / +0 / +2.16 | +2.43 | +0.05 | +2.37 | 0.27 | +0 | 4.02 | 15.4 | -1.58 |
| Hotel Order | +0 / +0 / +0 / +0 | +1 / +1 / +1 / +0 | +0.8 / +0.7 / +0.56 / -0.42 | +0.24 / +0.68 / +0.52 / +0 | +0.9 / +0.48 / +0.44 / +0.01 | +2.31 | +0.66 | +1.64 | 0.21 | +0.01 | 3.38 | 12.5 | +1.4 |
| Heatwave | +0 / +0 / +0 / +0 | +0 / +0 / +0 / +0 | -0.26 / +1.22 / -0.24 / -0.24 | -0.08 / +0.6 / -0.18 / +0 | -0.06 / +1.68 / -0.03 / +0 | +1.54 | +0.3 | +1.24 | 0.2 | +0.33 | 3.49 | 13.4 | -0.48 |
| Apple Blight | +0 / +0 / -5.74 / +0 | +0 / +0 / +0 / +0 | +0.18 / +0.04 / -2.22 / +0 | +0.14 / -0.08 / -1.7 / +0.02 | -0.07 / +0.05 / +1.95 / -0.04 | -0.85 | -1.03 | +0.13 | 0.25 | +0.01 | 3.07 | 11.6 | -0.56 |
| Blueberry Glut | +3 / +0 / +0 / +0 | +0 / +0 / +0 / +0 | -0.84 / +0.2 / +0.12 / +0.06 | -0.82 / +0.06 / +0.1 / +0 | -0.57 / -0.04 / -0.03 / +0 | -0.62 | -0.09 | -0.53 | 0.09 | +0.03 | 1.31 | 5.2 | -0.16 |
| Good Harvest | +2 / +2 / +2 / +2 | +0 / +0 / +0 / +0 | -0.72 / -0.46 / -0.3 / +1.82 | -0.8 / -0.2 / -0.2 / -0.04 | -0.58 / -0.82 / -0.8 / -0.95 | -2.66 | +0.3 | -2.96 | 0.19 | +0.02 | 3.82 | 14.1 | -0.46 |
| Bad Harvest | -3.24 / -2.88 / -2.66 / -3 | +0 / +0 / +0 / +0 | +0.66 / +0.1 / -0.36 / -2.44 | +0.44 / +0 / -0.26 / +0.02 | +0.61 / +0.8 / +1.12 / +0.89 | +2.14 | -1.2 | +3.33 | 0.27 | +0.01 | 4.83 | 17.3 | +2.68 |
| Price Hike | +0 / +0 / +0 / +0 | +0 / +0 / +0 / +0 | -0.72 / -0.56 / -0.48 / -0.24 | -0.4 / -0.22 / -0.2 / +0 | +0.03 / +0.25 / +0.13 / +0.02 | -0.37 | +1.83 | -2.2 | 0.21 | -0.02 | 2.73 | 9.5 | -1.9 |
| Price Controls | +0 / +0 / +0 / +0 | +0 / +0 / +0 / +0 | +0 / +0 / +0 / +0 | +0.04 / +0.04 / +0 / +0.06 | -0.19 / -0.07 / -0.17 / -0.83 | -0.57 | +0 | -0.57 | 0.14 | +0 | 2.65 | 11.7 | +0.06 |
| Health Inspector | +0.2 / +0.16 / -0.32 / +0.12 | +0.28 / -0.07 / -0.2 / -0.03 | +0.26 / -0.09 / -0.19 / +0.63 | +0.19 / -0.08 / -0.24 / -0.08 | -0.04 / -0.08 / -0.07 / -0.09 | -0.03 | -0.02 | -0.59 | 0.14 | +0 | 0.76 | 2.6 | +0.07 |
| Lorry Breakdown | -7 / -6.26 / -5.74 / -6.46 | +0 / +0 / +0 / +0 | -1.32 / -1.54 / -2.32 / -5.52 | -0.86 / -1.06 / -1.7 / +0.04 | -0.62 / -0.27 / +0.05 / -0.16 | -3.37 | -5.27 | +1.76 | 0.4 | +0.01 | 6.11 | 21.5 | +0.28 |
| Tourist Bus | +0 / +0 / +0 / +0 | +0 / +0 / +0 / +0 | +0 / +0 / +0 / +0 | +0 / +0 / +0 / +0 | +0 / +0 / +0 / +0 | +0 | +0 | +0 | 0 | +0 | 0 | 0 | +0 |
| Monsoon Downpour | +0 / +0 / +0 / +0 | -1.44 / -2 / -2.04 / -2.14 | -0.88 / -1.44 / -1.18 / +0.16 | -0.8 / -1.46 / -1 / -1.28 | -0.25 / -0.44 / -0.15 / -0.47 | -5.25 | -1.48 | -3.77 | 0.48 | -0.26 | 5.48 | 20.2 | +0.56 |
| Durian Season | +0 / +0 / +0 / +0 | +0 / +0 / +0 / +0 | +0.08 / +0.28 / +0.06 / +0.32 | -0.22 / +0.02 / -0.02 / -0.04 | -0.53 / -0.95 / -0.94 / -0.95 | -2.09 | -2.61 | +0.55 | 0.2 | +0.02 | 3.33 | 12.1 | +1.44 |
| Kenduri | +0 / +0 / +0 / +0 | +0 / +3 / +0 / +0 | -0.6 / +3.08 / -0.56 / -0.48 | -0.36 / +2.54 / -0.42 / +0 | -0.04 / +0.73 / +0.03 / +0 | +2.5 | +0.77 | +1.67 | 0.22 | -0.01 | 4.27 | 16.3 | +2.5 |
| Mango Windfall | +0 / +0 / +0 / +3 | +0 / +0 / +0 / +0 | -0.26 / -0.22 / -0.26 / +1.8 | -0.12 / -0.06 / -0.18 / -0.06 | +0 / +0.12 / -0.01 / -1.89 | -1.45 | +0.62 | -2.07 | 0.19 | -0.01 | 3.44 | 12.7 | +1.24 |
| Pasar Malam | +0 / +0 / +0 / +0 | +0 / +0 / +0 / +0 | +0 / +0 / +0 / +0 | +0 / +0 / +0 / +0 | +0 / +0 / +0 / +0 | +1.99 | +0 | +1.99 | 0.16 | -0.13 | 1.4 | 4.4 | +0.3 |
| Bake-Off | +0 / +0 / +0 / +0 | +0 / +0 / +2 / +0 | -0.5 / -0.34 / +1.92 / -0.32 | -0.24 / -0.26 / +1.66 / +0 | -0.07 / +0.11 / +1.12 / +0 | +2.07 | +0.5 | +1.57 | 0.19 | -0.01 | 3.16 | 12.6 | +0.2 |

Health Inspector: average fine $0.61 per stall, 16.7% of stalls fined, average fine when fined $3.64, largest $12.


#### `cash-n3.md`

### Safety nets after a wipe-out: 3 stalls, normal AI, 10 days, 160 games per cell. The seat has $0 and no fruit after the rush of the day shown.

| Wiped after day | Net | Dead days after (of days left) | Days to first income | Final cash | SE | Final rank (1 = winner) | Last place % | Wins % | Net handed over ($ or pieces) |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| (no wipe-out) | none | | | 85.6 | 2.2 | 2.06 | 34.4 | 28.1 | |
| 2 | none | 8 of 8 | 9 | 0 | 0 | 2.99 | 99.4 | 0 (SE 0) | |
| 2 | float3 | 0.16 of 8 | 2.15 | 63.1 | 1.8 | 2.57 | 61.3 | 4.4 (SE 1.6) | |
| 2 | float5 | 0.14 of 8 | 1.65 | 73 | 1.7 | 2.35 | 49.4 | 14.4 (SE 2.8) | |
| 2 | float3empty | 1.52 of 8 | 2.44 | 39.7 | 2 | 2.8 | 81.3 | 1.3 (SE 0.9) | |
| 2 | credit2 | 0.18 of 8 | 2.04 | 53.2 | 1.8 | 2.61 | 68.8 | 7.5 (SE 2.1) | |
| 2 | secondsMarket | 4.94 of 8 | 4.96 | 12.4 | 1.2 | 2.98 | 98.8 | 0.6 (SE 0.6) | |
| 2 | secondsSupply | 2.56 of 8 | 2.55 | 26.1 | 1.5 | 2.95 | 95.6 | 0.6 (SE 0.6) | |
| 2 | oddJobs3 | 2.22 of 8 | 3.32 | 37.9 | 1.8 | 2.85 | 86.9 | 1.9 (SE 1.1) | |
| (no wipe-out) | none | | | 86 | 1.9 | 2.06 | 35 | 28.8 | |
| 5 | none | 4.96 of 5 | 5.94 | 0.2 | 0.1 | 2.98 | 97.5 | 0 (SE 0) | |
| 5 | float3 | 0.16 of 5 | 2.42 | 38.9 | 1.1 | 2.91 | 91.3 | 0 (SE 0) | |
| 5 | float5 | 0.08 of 5 | 1.59 | 47.8 | 1.3 | 2.86 | 88.1 | 2.5 (SE 1.2) | |
| 5 | float3empty | 1.16 of 5 | 2.69 | 22.8 | 1.4 | 2.91 | 90.6 | 0 (SE 0) | |
| 5 | credit2 | 0.11 of 5 | 1.95 | 30.5 | 1.3 | 2.93 | 93.8 | 0.6 (SE 0.6) | |
| 5 | secondsMarket | 3.29 of 5 | 3.91 | 6.7 | 0.8 | 2.98 | 97.5 | 0 (SE 0) | |
| 5 | secondsSupply | 1.94 of 5 | 2.53 | 13.1 | 1 | 2.98 | 97.5 | 0 (SE 0) | |
| 5 | oddJobs3 | 1.66 of 5 | 3.16 | 20.3 | 1.1 | 2.96 | 96.3 | 0 (SE 0) | |
| (no wipe-out) | none | | | 86 | 1.9 | 2.06 | 35 | 28.8 | |
| 8 | none | 1.98 of 2 | 2.98 | 0.1 | 0.1 | 2.97 | 96.9 | 0 (SE 0) | |
| 8 | float3 | 0.11 of 2 | 1.54 | 12.4 | 0.5 | 3 | 100 | 0 (SE 0) | |
| 8 | float5 | 0.08 of 2 | 1.34 | 17.7 | 0.6 | 2.99 | 99.4 | 0 (SE 0) | |
| 8 | float3empty | 0.31 of 2 | 1.68 | 10.3 | 0.6 | 2.96 | 96.3 | 0 (SE 0) | |
| 8 | credit2 | 0.13 of 2 | 1.48 | 9.1 | 0.6 | 2.99 | 99.4 | 0 (SE 0) | |
| 8 | secondsMarket | 1.67 of 2 | 2.66 | 1.5 | 0.2 | 2.99 | 98.8 | 0 (SE 0) | |
| 8 | secondsSupply | 1.16 of 2 | 2.11 | 4 | 0.3 | 2.99 | 99.4 | 0 (SE 0) | |
| 8 | oddJobs3 | 1.13 of 2 | 2.22 | 6.2 | 0.3 | 2.99 | 99.4 | 0 (SE 0) | |


#### `cash2-n3.md`

### Safety nets after a wipe-out: 3 stalls, normal AI, 10 days, 160 games per cell. The seat has $0 and no fruit after the rush of the day shown.

| Wiped after day | Net | Dead days after (of days left) | Days to first income | Final cash | SE | Final rank (1 = winner) | Last place % | Wins % | Net handed over ($ or pieces) |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| (no wipe-out) | none | | | 85.6 | 2.2 | 2.06 | 34.4 | 28.1 | |
| 2 | float3 | 0.16 of 8 | 2.15 | 63.1 | 1.8 | 2.57 | 61.3 | 4.4 (SE 1.6) | |
| 2 | float3loan | 0.21 of 8 | 2.16 | 40.6 | 1.8 | 2.8 | 82.5 | 2.5 (SE 1.2) | |
| 2 | float5empty | 0.65 of 8 | 1.69 | 57.6 | 1.9 | 2.61 | 66.9 | 5.6 (SE 1.8) | |
| 2 | float4 | 0.13 of 8 | 1.83 | 69.1 | 1.8 | 2.46 | 57.5 | 11.9 (SE 2.6) | |
| (no wipe-out) | none | | | 86.3 | 1.7 | 2.06 | 33.1 | 27.5 | |
| 5 | float3 | 0.16 of 5 | 2.42 | 38.9 | 1.1 | 2.91 | 91.3 | 0 (SE 0) | |
| 5 | float3loan | 0.19 of 5 | 2.41 | 22 | 1 | 2.97 | 96.9 | 0 (SE 0) | |
| 5 | float5empty | 0.41 of 5 | 1.63 | 35.4 | 1.4 | 2.88 | 88.8 | 1.3 (SE 0.9) | |
| 5 | float4 | 0.08 of 5 | 1.88 | 43.3 | 1.2 | 2.84 | 85.6 | 1.3 (SE 0.9) | |


#### `cash-n4.md`

### Safety nets after a wipe-out: 4 stalls, normal AI, 10 days, 100 games per cell. The seat has $0 and no fruit after the rush of the day shown.

| Wiped after day | Net | Dead days after (of days left) | Days to first income | Final cash | SE | Final rank (1 = winner) | Last place % | Wins % | Net handed over ($ or pieces) |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| (no wipe-out) | none | | | 82.7 | 2.8 | 2.6 | 27 | 24 | |
| 5 | none | 5 of 5 | 6 | 0 | 0 | 3.97 | 97 | 0 (SE 0) | |
| 5 | float3 | 0.1 of 5 | 2.42 | 34.7 | 1.4 | 3.86 | 88 | 0 (SE 0) | |
| 5 | credit2 | 0.11 of 5 | 2.12 | 30.1 | 1.6 | 3.79 | 82 | 0 (SE 0) | |
| 5 | oddJobs3 | 1.7 of 5 | 3.06 | 18.6 | 1.2 | 3.94 | 95 | 0 (SE 0) | |


#### `an-float3-n3.md`

### float3-n3.jsonl: 3 stalls, normal/normal/normal AI, 10 days, 1500 games

**Running out of cash** (stall-days from day 2)

| AI level | Stall-days | Dawn cash < $3, nothing ripe % | Cash < $3 and no fruit at all (stuck) % | Cash $0, nothing ripe % | Cannot pay for any piece, nothing ripe % | Dead days % (no purchase, $0 income) | of which dawn cash < $3 % | of which had ripe fruit % | Dead on the last day % |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| normal | 40500 | 0 | 0 | 0 | 0.32 | 3.41 | 0 | 48.2 | 5.33 |

Games with at least one stuck dawn (cash < $3 and no fruit at all): 0%; with at least one dead day: 55.1%.
Stall-days that start with under $3 in cash (whatever is on the shelf): 0%; a $3 float would hand out about $0 per stall per game.

Safety net handed out: 0.94 per stall per game (dollars, or pieces for credit and the seconds box); 24.8% of stalls got something; most to one stall 20.

**Game shape**

| Measure | Value |
| --- | --- |
| Leader after day 5 wins | 45.8% (SE 1.3) |
| Last after day 5 wins (comeback) | 26.5% (SE 1.1) |
| Lead changes per game | 2.83 |
| Average final cash | $87.3 |
| Winner / last place cash | $108.2 / $67.3 |
| Median margin 1st - 2nd | $17 |
| Close games (margin <= $3) | 11.2% |
| Blowouts (margin >= $20) | 46.1% |
| Spread of final cash in a game (sd) | $21.5 |
| Win % by seat (seat 0 first) | 32.9 / 34.7 / 32.4 |
| Days bought first: winners vs everyone | 2.66 vs 3.33 |
| Win % by days bought first | 0d: 44% (466), 1d: 44.4% (675), 2d: 36.7% (741), 3d: 34.5% (695), 4d: 34.2% (606), 5d: 29.6% (496), 6d: 22.9% (328), 7d: 12.8% (227), 8d: 14% (136), 9d: 5.5% (91), 10d: 2.6% (39) |


#### `floatdays-n3.md`

### Market float $3 in ordinary games: 3 stalls, 1500 games

Paid out: $2.84 per game, $0.95 per stall. The winner received $0.59 on average, the last-placed stall $1.3. Stalls that received $6 or more: 3.9%.

| Day | Share of all float dollars | of which to a stall with fruit on its shelf |
| --- | --- | --- |
| 2 | 19.7% | 100% |
| 3 | 30% | 100% |
| 4 | 16.2% | 100% |
| 5 | 18.7% | 100% |
| 6 | 5% | 98.6% |
| 7 | 4.2% | 100% |
| 8 | 4.6% | 100% |
| 9 | 1.4% | 100% |
| 10 | 0.3% | 100% |


#### `drain-none-n3.md`

### drain: 3 stalls, normal AI, 10 days, 500 games per row, focal seat rotates [current rules]

| Focal seat rule | Win % | SE | Cash | Cash vs average rival | Cash change vs first row (paired) | SE | Notes |
| --- | --- | --- | --- | --- | --- | --- | --- |
| computer chooses upgrades | 31.8 | 2.1 | 86.3 | -0.7 | 0 | 0 |  |
| spends every dollar on upgrades as early as it can | 34.4 | 2.1 | 85.3 | -0.7 | -0.99 | 0.96 |  |


#### `drain-float3-n3.md`

### drain: 3 stalls, normal AI, 10 days, 500 games per row, focal seat rotates [float3]

| Focal seat rule | Win % | SE | Cash | Cash vs average rival | Cash change vs first row (paired) | SE | Notes |
| --- | --- | --- | --- | --- | --- | --- | --- |
| computer chooses upgrades | 32.4 | 2.1 | 87.1 | -0.5 | 0 | 0 |  |
| spends every dollar on upgrades as early as it can | 33.4 | 2.1 | 86.6 | 0.6 | -0.49 | 0.88 |  |


#### `orders-n3.md`

### orders: 3 stalls, normal AI, 10 days, 700 games per row, focal seat rotates [current rules]

| Focal seat rule | Win % | SE | Cash | Cash vs average rival | Cash change vs first row (paired) | SE | Notes |
| --- | --- | --- | --- | --- | --- | --- | --- |
| computer bids | 32.6 | 1.8 | 86.5 | 0.2 | 0 | 0 | held 0.6, fines 1.29, short 0.18 |
| always passes | 30.3 | 1.7 | 85.1 | -2.1 | -1.37 | 0.67 | held 0, fines 0, short 0 |
| always bids the ceiling | 30.7 | 1.7 | 85.3 | -2.9 | -1.17 | 0.74 | held 0.23, fines 1.91, short 0.28 |
| always bids 60% of the ceiling | 31.7 | 1.8 | 80.7 | -3.7 | -5.75 | 0.88 | held 1.88, fines 7.18, short 1.01 |
| always bids half the ceiling | 26.4 | 1.7 | 76.8 | -6.7 | -9.7 | 0.91 | held 2, fines 7.16, short 1.02 |
| always bids $1 | 10.9 | 1.2 | 53.3 | -29 | -33.12 | 1.01 | held 2, fines 5.26, short 1.02 |


#### `an-rivalceiling-n3.md`

### rivalceiling-n3.jsonl: 3 stalls, normal/normal/normal AI, 10 days, 1200 games

**Standing orders**

| Order fruit | Orders turned over | Nobody bid % | Bidders / order | Winning bid | Bid / ceiling % | Holder delivered all % | Pieces short | Fine paid / held order | Rival pieces / held order | Rival pay / piece | Holder margin (bid - cost, less fine) |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| Blueberry | 0.51 | 14.7 | 2.56 | 6.25 | 69.4 | 80.9 | 0.33 | 1.38 | 0.14 | 9 | 9.95 |
| Watermelon | 0.52 | 0.3 | 2.99 | 7.92 | 66 | 88.8 | 0.21 | 0.92 | 0.11 | 12 | 12.82 |
| Apple | 0.46 | 3.1 | 2.9 | 7.56 | 68.7 | 86.1 | 0.25 | 1.1 | 0.1 | 11 | 11.46 |
| Mango | 0.51 | 18.5 | 1.73 | 13.4 | 74.5 | 63.9 | 0.62 | 5.81 | 0.42 | 18 | 18.95 |
| All | 2 | 9.2 | 2.54 | 8.69 | 69.4 | 80.5 | 0.34 | 2.19 | 0.18 | 14.45 | 13.2 |

Holder's cash gain over the three days of the order, less the average rival's: $8.01 (SE 0.53, 2179 orders). Holders are self-selected (they bid lowest), so read this with the forced-bid test in orders.ts.


#### `memory-n3.md`

### memory: 3 stalls, normal AI, 10 days, 500 games per row, focal seat rotates [current rules]

| Focal seat rule | Win % | SE | Cash | Cash vs average rival | Cash change vs first row (paired) | SE | Notes |
| --- | --- | --- | --- | --- | --- | --- | --- |
| remembers every purchase (the computer as shipped) | 31.8 | 2.1 | 86.3 | -0.7 | 0 | 0 |  |
| remembers nothing: rivals' shelves are blank to it | 22.8 | 1.9 | 76.3 | -11.2 | -9.91 | 1.21 |  |


#### `firstbuyer-n3.md`

### firstbuyer: 3 stalls, normal AI, 10 days, 500 games per row, focal seat rotates [current rules]

| Focal seat rule | Win % | SE | Cash | Cash vs average rival | Cash change vs first row (paired) | SE | Notes |
| --- | --- | --- | --- | --- | --- | --- | --- |
| usual rule (poorest buys first) | 31.8 | 2.1 | 86.3 | -0.7 | 0 | 0 |  |
| always buys first | 58.4 | 2.2 | 102 | 22.7 | 15.73 | 1.91 |  |
| always buys last | 9.6 | 1.3 | 64.9 | -32.7 | -21.36 | 1.45 |  |


#### `an-v1-n3.md`

### v1-n3.jsonl: 3 stalls, normal/normal/normal AI, 10 days, 2000 games

**Shopkeepers** (fair = 33.3%)

| Perk | Seats | Win % | SE | vs fair | Avg cash | Cash vs table | SE | Sole serves/game | Favours earned | Pieces bought | Spoiled | Perk cash/game |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| Haggler | 756 | 32.5 | 1.7 | -0.8 | 87.3 | -0.4 | 0.8 | 1 | 0.96 | 28.1 | 1.7 |  |
| Big Basket | 760 | 31.8 | 1.7 | -1.5 | 83.8 | -2.6 | 0.9 | 1.1 | 1.06 | 29.4 | 1.71 |  |
| Bargain Hunter | 757 | 35.3 | 1.7 | +1.9 | 90.4 | +2.4 | 0.9 | 0.98 | 0.95 | 28.9 | 1.72 |  |
| Charmer | 746 | 32.6 | 1.7 | -0.8 | 86.8 | +0 | 0.9 | 1.07 | 1.06 | 27.7 | 1.51 |  |
| Tip Jar | 742 | 31 | 1.7 | -2.3 | 87.2 | -1 | 0.9 | 0.91 | 0.88 | 27.6 | 1.65 | 1.8 |
| Nest Egg | 760 | 36.6 | 1.7 | +3.2 | 89.2 | +1.3 | 0.8 | 0.94 | 0.91 | 29.1 | 1.9 | 8 |
| Shade Cloth | 727 | 36 | 1.8 | +2.7 | 90.5 | +2.3 | 0.8 | 1.09 | 1.05 | 27.9 | 0.02 |  |
| Sharp Ears | 752 | 30.9 | 1.7 | -2.5 | 85.4 | -2 | 0.9 | 0.97 | 0.94 | 27.7 | 1.68 | 4.2 |


#### `an-v2-n2.md`

### v2-n2.jsonl: 2 stalls, normal/normal AI, 10 days, 2400 games

**Shopkeepers** (fair = 50%)

| Perk | Seats | Win % | SE | vs fair | Avg cash | Cash vs table | SE | Sole serves/game | Favours earned | Pieces bought | Spoiled | Perk cash/game |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| Haggler | 591 | 46.4 | 2.1 | -3.6 | 88 | -2.3 | 0.9 | 1.24 | 1.19 | 29.2 | 2.02 |  |
| Big Basket | 621 | 49.9 | 2 | -0.1 | 89.4 | -1.6 | 0.9 | 1.39 | 1.33 | 30.3 | 2.27 |  |
| Bargain Hunter | 616 | 53.1 | 2 | +3.1 | 95.8 | +1.1 | 0.9 | 1.36 | 1.31 | 30.3 | 2.24 |  |
| Charmer | 595 | 47.6 | 2 | -2.4 | 94.6 | +0.7 | 0.9 | 1.35 | 1.33 | 29.3 | 1.86 |  |
| Tip Jar | 562 | 54.1 | 2.1 | +4.1 | 95.5 | +0.3 | 0.9 | 1.2 | 1.17 | 28.8 | 2.13 | 2.4 |
| Nest Egg | 622 | 53.1 | 2 | +3.1 | 95.5 | +2.3 | 0.8 | 1.26 | 1.22 | 30.5 | 2.15 | 8 |
| Shade Cloth | 584 | 47.9 | 2.1 | -2.1 | 95.7 | +0.5 | 0.8 | 1.42 | 1.38 | 28.4 | 0.06 |  |
| Sharp Ears | 609 | 47.9 | 2 | -2.1 | 92.8 | -1 | 0.9 | 1.34 | 1.3 | 29 | 2.02 | 4.8 |


#### `an-v2-n3.md`

### v2-n3.jsonl: 3 stalls, normal/normal/normal AI, 10 days, 2000 games

**Shopkeepers** (fair = 33.3%)

| Perk | Seats | Win % | SE | vs fair | Avg cash | Cash vs table | SE | Sole serves/game | Favours earned | Pieces bought | Spoiled | Perk cash/game |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| Haggler | 756 | 29.4 | 1.7 | -4 | 82.9 | -2.4 | 0.9 | 1.02 | 0.99 | 28 | 1.46 |  |
| Big Basket | 760 | 31.3 | 1.7 | -2 | 83.6 | -2.7 | 0.9 | 1.1 | 1.06 | 29.4 | 1.7 |  |
| Bargain Hunter | 757 | 33.8 | 1.7 | +0.5 | 90.1 | +2.4 | 0.9 | 0.98 | 0.94 | 28.9 | 1.76 |  |
| Charmer | 746 | 33.8 | 1.7 | +0.4 | 86.3 | 0 | 0.9 | 1.04 | 1.03 | 27.7 | 1.52 |  |
| Tip Jar | 742 | 37.7 | 1.8 | +4.4 | 92.3 | +2.9 | 0.9 | 0.91 | 0.87 | 27.6 | 1.63 | 1.8 |
| Nest Egg | 760 | 31.8 | 1.7 | -1.5 | 87 | -0.4 | 0.9 | 0.91 | 0.88 | 28.8 | 1.92 | 8 |
| Shade Cloth | 727 | 38.4 | 1.8 | +5 | 90.7 | +2.7 | 0.8 | 1.08 | 1.04 | 27.8 | 0.03 |  |
| Sharp Ears | 752 | 30.7 | 1.7 | -2.6 | 84.8 | -2.3 | 0.9 | 0.95 | 0.93 | 27.7 | 1.75 | 4.2 |


#### `an-v2-n3-hard.md`

### v2-n3-hard.jsonl: 3 stalls, hard/hard/hard AI, 10 days, 1200 games

**Shopkeepers** (fair = 33.3%)

| Perk | Seats | Win % | SE | vs fair | Avg cash | Cash vs table | SE | Sole serves/game | Favours earned | Pieces bought | Spoiled | Perk cash/game |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| Haggler | 441 | 31.7 | 2.2 | -1.6 | 87.8 | -2.2 | 1.2 | 1.03 | 1 | 28.2 | 1.62 |  |
| Big Basket | 460 | 29.1 | 2.1 | -4.2 | 89.8 | -2.5 | 1.2 | 1.13 | 1.09 | 30.2 | 1.78 |  |
| Bargain Hunter | 471 | 31.6 | 2.1 | -1.7 | 93.3 | -0.1 | 1.1 | 0.95 | 0.92 | 29.1 | 1.93 |  |
| Charmer | 452 | 38.7 | 2.3 | +5.4 | 94.8 | +2.9 | 1 | 1.04 | 1.04 | 28.3 | 1.37 |  |
| Tip Jar | 442 | 36.4 | 2.3 | +3.1 | 97.4 | +2.7 | 1.2 | 0.87 | 0.85 | 28.2 | 1.82 | 1.7 |
| Nest Egg | 436 | 31.2 | 2.2 | -2.1 | 92.5 | -0.2 | 1.1 | 0.87 | 0.84 | 29.1 | 1.98 | 8 |
| Shade Cloth | 436 | 36.7 | 2.3 | +3.4 | 95.6 | +2.4 | 1.1 | 1.12 | 1.07 | 27.9 | 0.03 |  |
| Sharp Ears | 462 | 31.4 | 2.2 | -1.9 | 89.5 | -2.7 | 1.1 | 0.95 | 0.92 | 28 | 1.74 | 4.2 |


#### `an-v2-n4.md`

### v2-n4.jsonl: 4 stalls, normal/normal/normal/normal AI, 10 days, 1600 games

**Shopkeepers** (fair = 25%)

| Perk | Seats | Win % | SE | vs fair | Avg cash | Cash vs table | SE | Sole serves/game | Favours earned | Pieces bought | Spoiled | Perk cash/game |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| Haggler | 791 | 23.3 | 1.5 | -1.7 | 81 | -2.6 | 1.1 | 0.99 | 0.95 | 28.6 | 1.47 |  |
| Big Basket | 818 | 21.9 | 1.4 | -3.1 | 79.6 | -4.1 | 1 | 0.98 | 0.95 | 30.2 | 1.8 |  |
| Bargain Hunter | 821 | 24.5 | 1.5 | -0.5 | 86.8 | +2.2 | 0.9 | 0.96 | 0.92 | 29.7 | 1.76 |  |
| Charmer | 780 | 24.1 | 1.5 | -0.9 | 84.6 | +0.1 | 1 | 1.01 | 1.01 | 28 | 1.38 |  |
| Tip Jar | 803 | 32.4 | 1.7 | +7.4 | 90.9 | +5.3 | 1 | 0.83 | 0.81 | 28.1 | 1.65 | 1.7 |
| Nest Egg | 803 | 26.7 | 1.6 | +1.7 | 84.7 | +0.1 | 1 | 0.87 | 0.85 | 28.7 | 1.74 | 8 |
| Shade Cloth | 777 | 23.9 | 1.5 | -1.1 | 86.3 | +1.2 | 0.9 | 0.99 | 0.95 | 27.7 | 0.02 |  |
| Sharp Ears | 807 | 23.3 | 1.5 | -1.7 | 82.3 | -2.1 | 1 | 0.95 | 0.92 | 27.6 | 1.56 | 7.2 |


#### `an-v2-n6.md`

### v2-n6.jsonl: 6 stalls, normal/normal/normal/normal/normal/normal AI, 10 days, 800 games

**Shopkeepers** (fair = 16.7%)

| Perk | Seats | Win % | SE | vs fair | Avg cash | Cash vs table | SE | Sole serves/game | Favours earned | Pieces bought | Spoiled | Perk cash/game |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| Haggler | 603 | 16.9 | 1.5 | +0.2 | 82.4 | +0.9 | 1.3 | 0.4 | 0.4 | 28.6 | 1.35 |  |
| Big Basket | 603 | 12.9 | 1.4 | -3.7 | 74.3 | -7 | 1.4 | 0.33 | 0.33 | 29.3 | 1.96 |  |
| Bargain Hunter | 616 | 18.7 | 1.6 | +2 | 83.3 | +1.3 | 1.3 | 0.31 | 0.31 | 29.4 | 1.87 |  |
| Charmer | 599 | 14 | 1.4 | -2.6 | 79.2 | -2.1 | 1.3 | 0.43 | 0.43 | 26.9 | 1.5 |  |
| Tip Jar | 598 | 20.7 | 1.7 | +4.1 | 86.2 | +4.2 | 1.4 | 0.31 | 0.31 | 28.1 | 1.88 | 0.6 |
| Nest Egg | 587 | 17.7 | 1.6 | +1.1 | 79.3 | -1.7 | 1.4 | 0.35 | 0.35 | 28.3 | 2.09 | 8 |
| Shade Cloth | 592 | 17.4 | 1.6 | +0.7 | 87.6 | +5.9 | 1.1 | 0.38 | 0.38 | 27.7 | 0.02 |  |
| Sharp Ears | 602 | 15 | 1.5 | -1.7 | 79.9 | -1.3 | 1.3 | 0.39 | 0.38 | 28.6 | 1.76 | 6.5 |


#### `an-mango4-n3.md`

### mango4-n3.jsonl: 3 stalls, normal/normal/normal AI, 10 days, 1500 games

**Shopkeepers** (fair = 33.3%)

| Perk | Seats | Win % | SE | vs fair | Avg cash | Cash vs table | SE | Sole serves/game | Favours earned | Pieces bought | Spoiled | Perk cash/game |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| Haggler | 557 | 23.3 | 1.8 | -10 | 73.1 | -5.4 | 1 | 0.89 | 0.86 | 27.8 | 1.58 |  |
| Big Basket | 591 | 33.3 | 1.9 | +0 | 78.8 | -1 | 1 | 1.11 | 1.06 | 29.7 | 1.48 |  |
| Bargain Hunter | 573 | 34.9 | 2 | +1.6 | 83.5 | +2.5 | 0.9 | 0.97 | 0.94 | 28.8 | 1.63 |  |
| Charmer | 562 | 40.7 | 2.1 | +7.4 | 82.7 | +3.5 | 0.9 | 1.03 | 1.03 | 28 | 1.26 |  |
| Tip Jar | 550 | 26.7 | 1.9 | -6.6 | 73.8 | -5.5 | 1 | 0.9 | 0.88 | 27.1 | 1.49 | 1.8 |
| Nest Egg | 563 | 41.4 | 2.1 | +8.1 | 85.2 | +4 | 0.9 | 0.91 | 0.89 | 29.4 | 1.9 | 8 |
| Shade Cloth | 536 | 36.8 | 2.1 | +3.4 | 84 | +3.1 | 0.9 | 1.02 | 0.98 | 27.8 | 0.03 |  |
| Sharp Ears | 568 | 29.4 | 1.9 | -3.9 | 79 | -1.2 | 0.9 | 0.89 | 0.88 | 27.4 | 1.43 | 4.4 |

**Fruit roles** (per game, whole table)

| Fruit | Delivered | Bought | % of lorry bought | Free (favour) | Sold to row | Sold to order | Hawker | Spoiled | Juiced | Jam (ripe left) | Green left | Avg cost | Avg row price | Profit / piece bought | Share of profit % |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| Blueberry | 28 | 19.6 | 70.1 | 0.05 | 16.5 | 1.22 | 0.21 | 0.86 | 0.22 | 0.7 | 0 | 1.73 | 4.28 | 2.38 | 19.7 |
| Watermelon | 27.2 | 22.9 | 84.2 | 0.17 | 20.3 | 1.5 | 0.2 | 0.33 | 0.08 | 0.74 | 0 | 2.85 | 5.82 | 2.9 | 28 |
| Apple | 22.8 | 20.2 | 88.6 | 0.13 | 18.2 | 1.28 | 0.15 | 0.07 | 0.02 | 0.53 | 0 | 2.91 | 5.46 | 2.57 | 21.8 |
| Mango | 26.1 | 22 | 84.4 | 0.27 | 13.4 | 1.18 | 0.51 | 2.82 | 0.72 | 3.18 | 0.48 | 3.96 | 10.29 | 3.3 | 30.6 |

| Fruit | Sold Fresh % | Okay % | Soft % | Nights on shelf / piece | Loss rate % (spoiled+juiced / got) | Wanted / game | Row demand served % | Days wanted > put out % | Days some demand unserved % |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| Blueberry | 69.3 | 29 | 1.7 | 0.28 | 5.5 | 26.2 | 62.9 | 47.2 | 54.7 |
| Watermelon | 85 | 14.2 | 0.8 | 0.28 | 1.8 | 28.4 | 71.4 | 41.5 | 44.3 |
| Apple | 95.1 | 4.6 | 0.3 | 0.27 | 0.4 | 29.5 | 61.9 | 51.5 | 53.1 |
| Mango | 78 | 20 | 2 | 2.3 | 15.9 | 25.2 | 53.1 | 45.1 | 56.1 |

**Running out of cash** (stall-days from day 2)

| AI level | Stall-days | Dawn cash < $3, nothing ripe % | Cash < $3 and no fruit at all (stuck) % | Cash $0, nothing ripe % | Cannot pay for any piece, nothing ripe % | Dead days % (no purchase, $0 income) | of which dawn cash < $3 % | of which had ripe fruit % | Dead on the last day % |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| normal | 40500 | 1.55 | 0.43 | 0.45 | 0.8 | 4.85 | 39.5 | 47.3 | 6.84 |

Games with at least one stuck dawn (cash < $3 and no fruit at all): 3.4%; with at least one dead day: 67.1%.
Stall-days that start with under $3 in cash (whatever is on the shelf): 5.32%; a $3 float would hand out about $0.94 per stall per game.

Stalls with a stuck dawn: 53 (0.04 per game). First broke on day 7.5 on average. Afterwards: average final rank 2.96 of 3 (last place 96.2%), final cash $1.4 (table average $80), income per remaining day $0.4, never earned again 94.3%.
Largest outflow in the two days before: other 58.5%, standing-order fine 35.8%, fruit that did not sell 3.8%, Health Inspector 1.9%.

**Game shape**

| Measure | Value |
| --- | --- |
| Leader after day 5 wins | 48.6% (SE 1.3) |
| Last after day 5 wins (comeback) | 22% (SE 1.1) |
| Lead changes per game | 2.97 |
| Average final cash | $80 |
| Winner / last place cash | $102 / $57.7 |
| Median margin 1st - 2nd | $17 |
| Close games (margin <= $3) | 11.3% |
| Blowouts (margin >= $20) | 44.6% |
| Spread of final cash in a game (sd) | $23.3 |
| Win % by seat (seat 0 first) | 35.2 / 32.9 / 31.9 |
| Days bought first: winners vs everyone | 2.43 vs 3.33 |
| Win % by days bought first | 0d: 46% (511), 1d: 46.6% (756), 2d: 39.6% (760), 3d: 36.2% (614), 4d: 29.6% (490), 5d: 25.6% (426), 6d: 21.7% (337), 7d: 16% (256), 8d: 8% (212), 9d: 4.1% (98), 10d: 2.5% (40) |


#### `an-softeveryday-n3.md`

### softeveryday-n3.jsonl: 3 stalls, normal/normal/normal AI, 10 days, 1000 games

**Fruit roles** (per game, whole table)

| Fruit | Delivered | Bought | % of lorry bought | Free (favour) | Sold to row | Sold to order | Hawker | Spoiled | Juiced | Jam (ripe left) | Green left | Avg cost | Avg row price | Profit / piece bought | Share of profit % |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| Blueberry | 28 | 19.7 | 70.2 | 0.06 | 17.2 | 1.21 | 0.19 | 0.39 | 0.08 | 0.7 | 0 | 1.72 | 4.15 | 2.41 | 18 |
| Watermelon | 27.2 | 23.1 | 84.9 | 0.21 | 20.7 | 1.53 | 0.19 | 0.13 | 0.03 | 0.73 | 0 | 2.83 | 5.75 | 2.94 | 25.8 |
| Apple | 22.9 | 20.3 | 88.6 | 0.15 | 18.4 | 1.3 | 0.16 | 0.03 | 0.01 | 0.56 | 0 | 2.9 | 5.45 | 2.58 | 19.9 |
| Mango | 26 | 22.6 | 86.9 | 0.21 | 14.1 | 1.13 | 0.48 | 2.63 | 0.52 | 3.61 | 0.36 | 2.95 | 9.96 | 4.21 | 36.3 |

| Fruit | Sold Fresh % | Okay % | Soft % | Nights on shelf / piece | Loss rate % (spoiled+juiced / got) | Wanted / game | Row demand served % | Days wanted > put out % | Days some demand unserved % |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| Blueberry | 65 | 27.9 | 7.1 | 0.26 | 2.3 | 26.3 | 65.3 | 46.5 | 51.3 |
| Watermelon | 83.1 | 13.6 | 3.3 | 0.27 | 0.7 | 28.6 | 72.6 | 41.2 | 42.6 |
| Apple | 94.4 | 4.6 | 1 | 0.26 | 0.2 | 29.6 | 62.2 | 51.4 | 52.5 |
| Mango | 72.5 | 16.9 | 10.6 | 2.42 | 13.8 | 25.1 | 56.1 | 43.5 | 52.5 |

**Running out of cash** (stall-days from day 2)

| AI level | Stall-days | Dawn cash < $3, nothing ripe % | Cash < $3 and no fruit at all (stuck) % | Cash $0, nothing ripe % | Cannot pay for any piece, nothing ripe % | Dead days % (no purchase, $0 income) | of which dawn cash < $3 % | of which had ripe fruit % | Dead on the last day % |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| normal | 27000 | 1.61 | 0.33 | 0.32 | 1.14 | 4.9 | 42.6 | 44.5 | 5.67 |

Games with at least one stuck dawn (cash < $3 and no fruit at all): 2.4%; with at least one dead day: 69.3%.
Stall-days that start with under $3 in cash (whatever is on the shelf): 5.39%; a $3 float would hand out about $1.04 per stall per game.

Stalls with a stuck dawn: 25 (0.03 per game). First broke on day 7.2 on average. Afterwards: average final rank 2.96 of 3 (last place 96%), final cash $1.4 (table average $88), income per remaining day $0.6, never earned again 88%.
Largest outflow in the two days before: standing-order fine 56%, other 32%, Health Inspector 12%.

**Game shape**

| Measure | Value |
| --- | --- |
| Leader after day 5 wins | 48.6% (SE 1.6) |
| Last after day 5 wins (comeback) | 25.5% (SE 1.4) |
| Lead changes per game | 2.79 |
| Average final cash | $88 |
| Winner / last place cash | $111.4 / $64.8 |
| Median margin 1st - 2nd | $19 |
| Close games (margin <= $3) | 9.8% |
| Blowouts (margin >= $20) | 47.6% |
| Spread of final cash in a game (sd) | $24.3 |
| Win % by seat (seat 0 first) | 36.5 / 32.6 / 30.9 |
| Days bought first: winners vs everyone | 2.61 vs 3.33 |
| Win % by days bought first | 0d: 41.4% (379), 1d: 41.2% (461), 2d: 42.9% (459), 3d: 36.5% (441), 4d: 30.7% (368), 5d: 27.6% (283), 6d: 24.5% (229), 7d: 17.2% (151), 8d: 11.9% (118), 9d: 6.8% (74), 10d: 8.1% (37) |


#### `an-final-n2.md`

### final-n2.jsonl: 2 stalls, normal/normal AI, 10 days, 1600 games

**Shopkeepers** (fair = 50%)

| Perk | Seats | Win % | SE | vs fair | Avg cash | Cash vs table | SE | Sole serves/game | Favours earned | Pieces bought | Spoiled | Perk cash/game |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| Haggler | 378 | 48.7 | 2.6 | -1.3 | 84.9 | -1.2 | 0.8 | 1.19 | 1.14 | 29.3 | 1.81 |  |
| Big Basket | 433 | 48.3 | 2.4 | -1.7 | 84.5 | -1.6 | 0.8 | 1.33 | 1.26 | 30.8 | 2.19 |  |
| Bargain Hunter | 436 | 51.4 | 2.4 | +1.4 | 91.4 | +1.4 | 0.8 | 1.31 | 1.27 | 30.3 | 2.16 |  |
| Charmer | 387 | 49.6 | 2.5 | -0.4 | 88.6 | -0.3 | 0.9 | 1.28 | 1.27 | 29.7 | 1.9 |  |
| Tip Jar | 353 | 49.6 | 2.7 | -0.4 | 89.5 | -0.3 | 0.9 | 1.26 | 1.23 | 29.5 | 1.84 | 2.5 |
| Nest Egg | 421 | 55.8 | 2.4 | +5.8 | 90.1 | +2.7 | 0.9 | 1.18 | 1.15 | 30.5 | 2.14 | 8 |
| Shade Cloth | 387 | 48.1 | 2.5 | -1.9 | 89.6 | -0.2 | 0.8 | 1.45 | 1.4 | 28.9 | 0.04 |  |
| Sharp Ears | 405 | 48.1 | 2.5 | -1.9 | 89.2 | -0.7 | 0.8 | 1.29 | 1.25 | 29.5 | 1.92 | 5.2 |

**Game shape**

| Measure | Value |
| --- | --- |
| Leader after day 5 wins | 58.9% (SE 1.2) |
| Last after day 5 wins (comeback) | 40.9% (SE 1.2) |
| Lead changes per game | 2.09 |
| Average final cash | $88.5 |
| Winner / last place cash | $101.3 / $75.7 |
| Median margin 1st - 2nd | $20 |
| Close games (margin <= $3) | 9.4% |
| Blowouts (margin >= $20) | 50.8% |
| Spread of final cash in a game (sd) | $18.1 |
| Win % by seat (seat 0 first) | 52.8 / 47.3 |
| Days bought first: winners vs everyone | 4.12 vs 5 |
| Win % by days bought first | 0d: 86% (57), 1d: 78.7% (221), 2d: 74.9% (295), 3d: 62.3% (385), 4d: 57.9% (432), 5d: 50% (420), 6d: 42.1% (432), 7d: 37.7% (385), 8d: 25.1% (295), 9d: 21.3% (221), 10d: 14% (57) |


#### `an-final-n3.md`

### final-n3.jsonl: 3 stalls, normal/normal/normal AI, 10 days, 1600 games

**Shopkeepers** (fair = 33.3%)

| Perk | Seats | Win % | SE | vs fair | Avg cash | Cash vs table | SE | Sole serves/game | Favours earned | Pieces bought | Spoiled | Perk cash/game |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| Haggler | 593 | 29.8 | 1.9 | -3.5 | 78.9 | -1.5 | 0.7 | 0.97 | 0.95 | 28.4 | 1.37 |  |
| Big Basket | 628 | 30.4 | 1.8 | -2.9 | 79.9 | -2 | 0.8 | 1.05 | 1.01 | 29.8 | 1.68 |  |
| Bargain Hunter | 614 | 35.2 | 1.9 | +1.8 | 84 | +0.7 | 0.8 | 0.88 | 0.85 | 28.6 | 1.67 |  |
| Charmer | 593 | 37.6 | 2 | +4.3 | 83.7 | +1.9 | 0.8 | 0.96 | 0.96 | 28 | 1.37 |  |
| Tip Jar | 582 | 31.6 | 1.9 | -1.7 | 83 | -0.1 | 0.8 | 0.9 | 0.88 | 28 | 1.63 | 1.8 |
| Nest Egg | 604 | 36.4 | 2 | +3.1 | 84.3 | +1.6 | 0.8 | 0.84 | 0.82 | 28.9 | 1.8 | 8 |
| Shade Cloth | 577 | 36.9 | 2 | +3.6 | 84.9 | +1.4 | 0.8 | 1.01 | 0.98 | 27.7 | 0.04 |  |
| Sharp Ears | 609 | 28.9 | 1.8 | -4.4 | 80.3 | -2.1 | 0.7 | 0.94 | 0.92 | 27.9 | 1.59 | 4.4 |

**Fruit roles** (per game, whole table)

| Fruit | Delivered | Bought | % of lorry bought | Free (favour) | Sold to row | Sold to order | Hawker | Spoiled | Juiced | Jam (ripe left) | Green left | Avg cost | Avg row price | Profit / piece bought | Share of profit % |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| Blueberry | 28 | 19.9 | 71 | 0.05 | 16.7 | 1.21 | 0.22 | 0.88 | 0.21 | 0.71 | 0 | 1.73 | 4.25 | 2.35 | 19.6 |
| Watermelon | 27.2 | 23.1 | 85 | 0.17 | 20.4 | 1.51 | 0.21 | 0.36 | 0.08 | 0.74 | 0 | 2.85 | 5.8 | 2.87 | 27.9 |
| Apple | 22.8 | 20.3 | 89.3 | 0.13 | 18.3 | 1.32 | 0.16 | 0.07 | 0.02 | 0.53 | 0 | 2.9 | 5.44 | 2.56 | 21.8 |
| Mango | 26.1 | 22 | 84.2 | 0.26 | 13.5 | 1.14 | 0.5 | 2.89 | 0.68 | 3.03 | 0.45 | 3.98 | 10.29 | 3.33 | 30.7 |

| Fruit | Sold Fresh % | Okay % | Soft % | Nights on shelf / piece | Loss rate % (spoiled+juiced / got) | Wanted / game | Row demand served % | Days wanted > put out % | Days some demand unserved % |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| Blueberry | 69.3 | 29 | 1.7 | 0.28 | 5.5 | 26.2 | 63.7 | 45.9 | 53.6 |
| Watermelon | 85.2 | 14 | 0.8 | 0.29 | 1.9 | 28.4 | 71.8 | 40.8 | 43.4 |
| Apple | 95.1 | 4.7 | 0.2 | 0.27 | 0.5 | 29.5 | 62.2 | 51.2 | 53 |
| Mango | 77.9 | 20.1 | 2 | 2.28 | 16.1 | 25.3 | 53.6 | 44.6 | 55.7 |

**Upgrades the computer built**

| Upgrade | Cost | % of stalls that built it | Avg day built | Win % of stalls with it | Win % without | Cash vs table with it |
| --- | --- | --- | --- | --- | --- | --- |
| Juice Bar | $4 | 16 | 4.8 | 37.5 | 32.5 | 2.7 |
| Handcart | $6 | 67.7 | 5.4 | 35.7 | 28.4 | 1.5 |
| Premium Display | $6 | 6.7 | 5.7 | 37.8 | 33 | 2.7 |
| Ripening Room | $6 | 64.1 | 4.2 | 35.5 | 29.5 | 0.9 |
| Order Book | $5 | 22.5 | 3 | 31 | 34 | -1.1 |

Stalls ending with 0 / 1 / 2 upgrades: 1.6% / 19.9% / 78.5%

**Favours** (per game, whole table unless stated)

| Card | Dealt at start (Charmer) | Earned | Played | Unplayed at end | % of copies gained that were played |
| --- | --- | --- | --- | --- | --- |
| Gossip | 0.26 | 0.45 | 0.63 | 0.08 | 89.1 |
| Free Fruit | 0.24 | 0.45 | 0.61 | 0.08 | 87.8 |
| Priority | 0.24 | 0.45 | 0.61 | 0.08 | 88.2 |
| Scout | 0.25 | 0.48 | 0 | 0.73 | 0 |
| Favoured Trade | 0.22 | 0.48 | 0.62 | 0.08 | 89.3 |
| Fridge | 0.26 | 0.46 | 0.48 | 0.24 | 66.4 |

Favours earned per stall per game: 0.92 (sd 0.91); sole serves per game (table): 2.84; of those that drew a card: 97.2%.
Deck reshuffles per game: 0; games with at least one reshuffle: 0%; days ending with an empty deck: 0%.

**Events in the batch** (difference from the average of the same day number; see events.ts for the paired test)

| Event | Days | Income / stall vs same day | SE | Pieces lost that night / stall vs same day | Income spread (best - worst stall) |
| --- | --- | --- | --- | --- | --- |
| Festival | 696 | 5.65 | 0.24 | 0.01 | 25.6 |
| Superfood Trend | 717 | 2.26 | 0.2 | 0 | 22.8 |
| Mango Craze | 712 | 2.12 | 0.23 | -0.01 | 24.8 |
| Hotel Order | 717 | 3.06 | 0.2 | -0.01 | 21.7 |
| Heatwave | 738 | 0.25 | 0.19 | 0.27 | 21.4 |
| Apple Blight | 717 | -1.81 | 0.2 | 0.01 | 20.7 |
| Blueberry Glut | 732 | -1.48 | 0.17 | 0.01 | 19.6 |
| Good Harvest | 719 | -2.93 | 0.17 | 0.04 | 18.3 |
| Bad Harvest | 713 | 0.32 | 0.21 | 0 | 22.9 |
| Price Hike | 747 | -1.47 | 0.18 | 0.01 | 19.8 |
| Price Controls | 733 | -1.96 | 0.17 | 0.02 | 19.4 |
| Health Inspector | 654 | -0.7 | 0.19 | -0.02 | 19.9 |
| Lorry Breakdown | 731 | -4.87 | 0.22 | 0.02 | 20.1 |
| Tourist Bus | 703 | 5 | 0.25 | 0 | 23.9 |
| Monsoon Downpour | 738 | -5.28 | 0.15 | -0.22 | 17.8 |
| Durian Season | 759 | -3.2 | 0.16 | 0.02 | 18.3 |
| Kenduri | 764 | 3.14 | 0.19 | 0 | 23.8 |
| Mango Windfall | 673 | -0.46 | 0.17 | 0 | 19.9 |
| Pasar Malam | 708 | 1.26 | 0.19 | -0.14 | 20.1 |
| Bake-Off | 729 | 1.64 | 0.19 | 0 | 22 |

**Running out of cash** (stall-days from day 2)

| AI level | Stall-days | Dawn cash < $3, nothing ripe % | Cash < $3 and no fruit at all (stuck) % | Cash $0, nothing ripe % | Cannot pay for any piece, nothing ripe % | Dead days % (no purchase, $0 income) | of which dawn cash < $3 % | of which had ripe fruit % | Dead on the last day % |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| normal | 43200 | 0 | 0 | 0 | 0.31 | 3.31 | 0 | 44.9 | 5.4 |

Games with at least one stuck dawn (cash < $3 and no fruit at all): 0%; with at least one dead day: 55%.
Stall-days that start with under $3 in cash (whatever is on the shelf): 0%; a $3 float would hand out about $0 per stall per game.

Safety net handed out: 0.64 per stall per game (dollars, or pieces for credit and the seconds box); 25.6% of stalls got something; most to one stall 10.

**Standing orders**

| Order fruit | Orders turned over | Nobody bid % | Bidders / order | Winning bid | Bid / ceiling % | Holder delivered all % | Pieces short | Fine paid / held order | Rival pieces / held order | Rival pay / piece | Holder margin (bid - cost, less fine) |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| Blueberry | 0.5 | 15.1 | 2.55 | 6.25 | 69.4 | 81.2 | 0.3 | 1.44 | 0.13 | 5.3 | 10.03 |
| Watermelon | 0.52 | 0.7 | 2.98 | 7.91 | 65.9 | 92.3 | 0.12 | 0.77 | 0.08 | 6.8 | 13.39 |
| Apple | 0.47 | 2.9 | 2.9 | 7.56 | 68.7 | 91.6 | 0.14 | 0.82 | 0.04 | 6.41 | 12.21 |
| Mango | 0.52 | 21.6 | 1.75 | 13.37 | 74.3 | 63.5 | 0.61 | 5.84 | 0.43 | 12.28 | 18.98 |
| All | 2 | 10.2 | 2.53 | 8.66 | 69.3 | 83 | 0.28 | 2.08 | 0.16 | 9.76 | 13.55 |

Holder's cash gain over the three days of the order, less the average rival's: $8.48 (SE 0.42, 2873 orders). Holders are self-selected (they bid lowest), so read this with the forced-bid test in orders.ts.

**Game shape**

| Measure | Value |
| --- | --- |
| Leader after day 5 wins | 45.9% (SE 1.2) |
| Last after day 5 wins (comeback) | 27.4% (SE 1.1) |
| Lead changes per game | 3.08 |
| Average final cash | $82.4 |
| Winner / last place cash | $102.1 / $63.4 |
| Median margin 1st - 2nd | $17 |
| Close games (margin <= $3) | 12.7% |
| Blowouts (margin >= $20) | 42.7% |
| Spread of final cash in a game (sd) | $20.3 |
| Win % by seat (seat 0 first) | 35 / 33.4 / 31.6 |
| Days bought first: winners vs everyone | 2.58 vs 3.33 |
| Win % by days bought first | 0d: 46% (487), 1d: 46.4% (746), 2d: 37.2% (827), 3d: 35.2% (707), 4d: 32.4% (592), 5d: 26.5% (499), 6d: 22.5% (395), 7d: 14.1% (262), 8d: 8.4% (178), 9d: 6.1% (82) |


#### `an-final-n3-hard.md`

### final-n3-hard.jsonl: 3 stalls, hard/hard/hard AI, 10 days, 900 games

**Shopkeepers** (fair = 33.3%)

| Perk | Seats | Win % | SE | vs fair | Avg cash | Cash vs table | SE | Sole serves/game | Favours earned | Pieces bought | Spoiled | Perk cash/game |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| Haggler | 325 | 30.2 | 2.5 | -3.2 | 82.2 | -2.7 | 0.9 | 1 | 0.98 | 28.7 | 1.6 |  |
| Big Basket | 338 | 30.8 | 2.5 | -2.6 | 83.5 | -2.8 | 1 | 1.11 | 1.07 | 30.5 | 1.83 |  |
| Bargain Hunter | 360 | 39.4 | 2.6 | +6.1 | 90.4 | +2.5 | 1 | 0.98 | 0.95 | 29.2 | 1.79 |  |
| Charmer | 350 | 36.3 | 2.6 | +3 | 87.5 | +1.8 | 0.9 | 0.99 | 0.98 | 28.5 | 1.41 |  |
| Tip Jar | 324 | 33.3 | 2.6 | +0 | 89.2 | +1.2 | 1 | 0.87 | 0.85 | 28.1 | 1.71 | 1.7 |
| Nest Egg | 336 | 32.7 | 2.6 | -0.6 | 87.3 | +0.1 | 1 | 0.88 | 0.87 | 29.2 | 1.85 | 8 |
| Shade Cloth | 324 | 36.7 | 2.7 | +3.4 | 90.3 | +2.1 | 1.1 | 0.94 | 0.91 | 27.8 | 0.05 |  |
| Sharp Ears | 343 | 26.8 | 2.4 | -6.5 | 84.2 | -2.3 | 1 | 0.9 | 0.87 | 28.3 | 1.81 | 4.6 |

**Game shape**

| Measure | Value |
| --- | --- |
| Leader after day 5 wins | 48.3% (SE 1.7) |
| Last after day 5 wins (comeback) | 23.8% (SE 1.4) |
| Lead changes per game | 3.04 |
| Average final cash | $86.8 |
| Winner / last place cash | $105.3 / $69.3 |
| Median margin 1st - 2nd | $15 |
| Close games (margin <= $3) | 13.9% |
| Blowouts (margin >= $20) | 38.8% |
| Spread of final cash in a game (sd) | $19 |
| Win % by seat (seat 0 first) | 34.1 / 34.8 / 31.1 |
| Days bought first: winners vs everyone | 2.56 vs 3.33 |
| Win % by days bought first | 0d: 46.5% (284), 1d: 43.4% (412), 2d: 42.3% (456), 3d: 34.4% (419), 4d: 30.1% (332), 5d: 26.6% (267), 6d: 19.9% (201), 7d: 16.3% (160), 8d: 8.5% (106), 9d: 6.3% (48) |


#### `an-final-n4.md`

### final-n4.jsonl: 4 stalls, normal/normal/normal/normal AI, 10 days, 1200 games

**Shopkeepers** (fair = 25%)

| Perk | Seats | Win % | SE | vs fair | Avg cash | Cash vs table | SE | Sole serves/game | Favours earned | Pieces bought | Spoiled | Perk cash/game |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| Haggler | 593 | 21.6 | 1.7 | -3.4 | 76.5 | -1.9 | 0.9 | 0.89 | 0.86 | 29 | 1.3 |  |
| Big Basket | 599 | 22.5 | 1.7 | -2.5 | 77.5 | -1.3 | 0.9 | 1 | 0.96 | 30.5 | 1.52 |  |
| Bargain Hunter | 624 | 28.8 | 1.8 | +3.8 | 82.2 | +2.3 | 0.9 | 0.9 | 0.87 | 29.6 | 1.67 |  |
| Charmer | 593 | 24.1 | 1.8 | -0.9 | 78.9 | +0.2 | 0.9 | 0.88 | 0.88 | 28.4 | 1.34 |  |
| Tip Jar | 599 | 23.5 | 1.7 | -1.5 | 79.8 | +0.5 | 0.9 | 0.75 | 0.73 | 28.3 | 1.6 | 1.5 |
| Nest Egg | 591 | 29.1 | 1.9 | +4.1 | 81.2 | +2.3 | 0.9 | 0.84 | 0.82 | 29.3 | 1.62 | 8 |
| Shade Cloth | 584 | 26 | 1.8 | +1 | 78.4 | -0.7 | 0.9 | 0.79 | 0.76 | 27.6 | 0.05 |  |
| Sharp Ears | 617 | 24.1 | 1.7 | -0.9 | 77.9 | -1.5 | 0.9 | 0.78 | 0.75 | 28.1 | 1.58 | 7.5 |

**Fruit roles** (per game, whole table)

| Fruit | Delivered | Bought | % of lorry bought | Free (favour) | Sold to row | Sold to order | Hawker | Spoiled | Juiced | Jam (ripe left) | Green left | Avg cost | Avg row price | Profit / piece bought | Share of profit % |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| Blueberry | 40.2 | 27.6 | 68.7 | 0.07 | 22.6 | 1.83 | 0.31 | 1.3 | 0.4 | 1.24 | 0 | 1.71 | 4.03 | 2.17 | 19.8 |
| Watermelon | 37.6 | 31.2 | 83.1 | 0.2 | 27.2 | 2.04 | 0.27 | 0.51 | 0.16 | 1.2 | 0 | 2.84 | 5.58 | 2.65 | 27.4 |
| Apple | 30.7 | 27.2 | 88.4 | 0.17 | 24.4 | 1.71 | 0.22 | 0.1 | 0.03 | 0.88 | 0 | 2.91 | 5.29 | 2.37 | 21.4 |
| Mango | 34.9 | 29.5 | 84.3 | 0.31 | 18.3 | 1.38 | 0.61 | 3.45 | 1.05 | 4.32 | 0.64 | 3.97 | 10.08 | 3.21 | 31.4 |

| Fruit | Sold Fresh % | Okay % | Soft % | Nights on shelf / piece | Loss rate % (spoiled+juiced / got) | Wanted / game | Row demand served % | Days wanted > put out % | Days some demand unserved % |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| Blueberry | 66 | 31.8 | 2.2 | 0.33 | 6.2 | 33 | 68.4 | 39.1 | 51.4 |
| Watermelon | 83.9 | 15.1 | 1 | 0.31 | 2.1 | 35.7 | 76.1 | 36.3 | 40.2 |
| Apple | 95.1 | 4.5 | 0.3 | 0.3 | 0.5 | 37.5 | 65.1 | 48.3 | 50.8 |
| Mango | 77.8 | 20.2 | 2 | 2.31 | 15.1 | 32.1 | 57 | 41.4 | 52.3 |

**Running out of cash** (stall-days from day 2)

| AI level | Stall-days | Dawn cash < $3, nothing ripe % | Cash < $3 and no fruit at all (stuck) % | Cash $0, nothing ripe % | Cannot pay for any piece, nothing ripe % | Dead days % (no purchase, $0 income) | of which dawn cash < $3 % | of which had ripe fruit % | Dead on the last day % |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| normal | 43200 | 0 | 0 | 0 | 0.25 | 2.73 | 0 | 47.5 | 4.79 |

Games with at least one stuck dawn (cash < $3 and no fruit at all): 0%; with at least one dead day: 56.8%.
Stall-days that start with under $3 in cash (whatever is on the shelf): 0%; a $3 float would hand out about $0 per stall per game.

Safety net handed out: 0.86 per stall per game (dollars, or pieces for credit and the seconds box); 30.7% of stalls got something; most to one stall 13.

**Game shape**

| Measure | Value |
| --- | --- |
| Leader after day 5 wins | 42.4% (SE 1.4) |
| Last after day 5 wins (comeback) | 15.5% (SE 1) |
| Lead changes per game | 3.8 |
| Average final cash | $79.1 |
| Winner / last place cash | $106.2 / $53.5 |
| Median margin 1st - 2nd | $16 |
| Close games (margin <= $3) | 11.2% |
| Blowouts (margin >= $20) | 42.5% |
| Spread of final cash in a game (sd) | $23.6 |
| Win % by seat (seat 0 first) | 24.3 / 25.7 / 24.5 / 25.5 |
| Days bought first: winners vs everyone | 1.82 vs 2.5 |
| Win % by days bought first | 0d: 31% (849), 1d: 33.7% (1019), 2d: 27.9% (901), 3d: 24.4% (717), 4d: 18.3% (491), 5d: 12.9% (317), 6d: 9.6% (218), 7d: 6.5% (169), 8d: 3.5% (86), 9d: 3.3% (30) |


#### `an-final-n6.md`

### final-n6.jsonl: 6 stalls, normal/normal/normal/normal/normal/normal AI, 10 days, 500 games

**Shopkeepers** (fair = 16.7%)

| Perk | Seats | Win % | SE | vs fair | Avg cash | Cash vs table | SE | Sole serves/game | Favours earned | Pieces bought | Spoiled | Perk cash/game |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| Haggler | 369 | 17.9 | 2 | +1.2 | 77.1 | +1 | 1.4 | 0.36 | 0.35 | 28.8 | 1.15 |  |
| Big Basket | 379 | 11.3 | 1.6 | -5.3 | 70.1 | -6 | 1.3 | 0.32 | 0.32 | 30 | 1.78 |  |
| Bargain Hunter | 395 | 19.2 | 2 | +2.6 | 79.2 | +2.8 | 1.3 | 0.35 | 0.35 | 29.5 | 1.83 |  |
| Charmer | 368 | 17.9 | 2 | +1.3 | 74.2 | -1.5 | 1.4 | 0.38 | 0.38 | 28 | 1.43 |  |
| Tip Jar | 377 | 15.1 | 1.8 | -1.5 | 75.8 | -0.7 | 1.3 | 0.25 | 0.25 | 28 | 1.67 | 0.5 |
| Nest Egg | 368 | 17.4 | 2 | +0.7 | 74 | -1.8 | 1.4 | 0.23 | 0.23 | 28.4 | 2.04 | 8 |
| Shade Cloth | 367 | 13.4 | 1.8 | -3.3 | 78.9 | +2.6 | 1.2 | 0.31 | 0.31 | 27.8 | 0.05 |  |
| Sharp Ears | 377 | 21 | 2.1 | +4.3 | 79.3 | +3.4 | 1.4 | 0.38 | 0.38 | 29.5 | 1.57 | 7.1 |

**Running out of cash** (stall-days from day 2)

| AI level | Stall-days | Dawn cash < $3, nothing ripe % | Cash < $3 and no fruit at all (stuck) % | Cash $0, nothing ripe % | Cannot pay for any piece, nothing ripe % | Dead days % (no purchase, $0 income) | of which dawn cash < $3 % | of which had ripe fruit % | Dead on the last day % |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| normal | 27000 | 0 | 0 | 0 | 0.16 | 2.94 | 0 | 48.2 | 4.97 |

Games with at least one stuck dawn (cash < $3 and no fruit at all): 0%; with at least one dead day: 71.4%.
Stall-days that start with under $3 in cash (whatever is on the shelf): 0%; a $3 float would hand out about $0 per stall per game.

Safety net handed out: 1.19 per stall per game (dollars, or pieces for credit and the seconds box); 41.3% of stalls got something; most to one stall 13.

**Game shape**

| Measure | Value |
| --- | --- |
| Leader after day 5 wins | 33.6% (SE 2.1) |
| Last after day 5 wins (comeback) | 8.2% (SE 1.2) |
| Lead changes per game | 4.72 |
| Average final cash | $76.1 |
| Winner / last place cash | $112.7 / $39.5 |
| Median margin 1st - 2nd | $14 |
| Close games (margin <= $3) | 13.6% |
| Blowouts (margin >= $20) | 38.4% |
| Spread of final cash in a game (sd) | $27.3 |
| Win % by seat (seat 0 first) | 14.2 / 18.2 / 17.8 / 12.8 / 17.8 / 19.2 |
| Days bought first: winners vs everyone | 1.07 vs 1.67 |
| Win % by days bought first | 0d: 21.4% (882), 1d: 18.3% (845), 2d: 19.4% (551), 3d: 11.7% (291), 4d: 5.1% (195), 5d: 4.8% (105), 6d: 0% (71), 7d: 0% (37) |


#### `an-final-nomango-n3.md`

### final-nomango-n3.jsonl: 3 stalls, normal/normal/normal AI, 10 days, 1600 games

**Shopkeepers** (fair = 33.3%)

| Perk | Seats | Win % | SE | vs fair | Avg cash | Cash vs table | SE | Sole serves/game | Favours earned | Pieces bought | Spoiled | Perk cash/game |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| Haggler | 593 | 29.7 | 1.9 | -3.7 | 84.7 | -2.3 | 0.8 | 0.99 | 0.96 | 28.5 | 1.58 |  |
| Big Basket | 628 | 30.1 | 1.8 | -3.2 | 85.8 | -2.4 | 0.8 | 1.12 | 1.08 | 30.1 | 1.78 |  |
| Bargain Hunter | 614 | 31.4 | 1.9 | -1.9 | 91.1 | +1.3 | 0.8 | 1 | 0.97 | 29.1 | 1.75 |  |
| Charmer | 593 | 35.4 | 2 | +2.1 | 89.2 | +0.7 | 0.8 | 1.03 | 1.02 | 27.8 | 1.53 |  |
| Tip Jar | 582 | 34.7 | 2 | +1.4 | 90 | +0.4 | 0.9 | 0.92 | 0.9 | 27.8 | 1.65 | 1.8 |
| Nest Egg | 604 | 35.6 | 1.9 | +2.3 | 91 | +1.7 | 0.8 | 0.95 | 0.92 | 29.1 | 1.81 | 8 |
| Shade Cloth | 577 | 40.7 | 2 | +7.4 | 91.9 | +1.8 | 0.9 | 1.05 | 1.02 | 27.6 | 0.03 |  |
| Sharp Ears | 609 | 29.6 | 1.8 | -3.8 | 87.1 | -1.1 | 0.8 | 0.96 | 0.93 | 28 | 1.77 | 4.3 |

**Fruit roles** (per game, whole table)

| Fruit | Delivered | Bought | % of lorry bought | Free (favour) | Sold to row | Sold to order | Hawker | Spoiled | Juiced | Jam (ripe left) | Green left | Avg cost | Avg row price | Profit / piece bought | Share of profit % |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| Blueberry | 28 | 19.7 | 70.5 | 0.06 | 16.6 | 1.22 | 0.22 | 0.88 | 0.2 | 0.71 | 0 | 1.73 | 4.27 | 2.36 | 18.1 |
| Watermelon | 27.2 | 23.1 | 84.8 | 0.23 | 20.4 | 1.51 | 0.2 | 0.35 | 0.08 | 0.73 | 0 | 2.85 | 5.8 | 2.89 | 25.9 |
| Apple | 22.8 | 20.2 | 89 | 0.17 | 18.3 | 1.31 | 0.17 | 0.08 | 0.02 | 0.54 | 0 | 2.91 | 5.45 | 2.56 | 20.2 |
| Mango | 26.1 | 22.5 | 86.3 | 0.19 | 13.5 | 1.12 | 0.48 | 3.18 | 0.73 | 3.26 | 0.48 | 2.99 | 10.27 | 4.09 | 35.8 |

| Fruit | Sold Fresh % | Okay % | Soft % | Nights on shelf / piece | Loss rate % (spoiled+juiced / got) | Wanted / game | Row demand served % | Days wanted > put out % | Days some demand unserved % |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| Blueberry | 69.3 | 29.1 | 1.6 | 0.28 | 5.5 | 26.2 | 63.2 | 45.9 | 53.8 |
| Watermelon | 85.4 | 13.9 | 0.7 | 0.29 | 1.9 | 28.4 | 71.9 | 40.7 | 43.6 |
| Apple | 95.2 | 4.5 | 0.3 | 0.28 | 0.5 | 29.5 | 62.1 | 51.2 | 52.9 |
| Mango | 77.5 | 20.5 | 2.1 | 2.39 | 17.2 | 25.3 | 53.3 | 44.2 | 55.5 |

**Game shape**

| Measure | Value |
| --- | --- |
| Leader after day 5 wins | 47.2% (SE 1.2) |
| Last after day 5 wins (comeback) | 26.3% (SE 1.1) |
| Lead changes per game | 2.85 |
| Average final cash | $88.8 |
| Winner / last place cash | $109.9 / $68.7 |
| Median margin 1st - 2nd | $18 |
| Close games (margin <= $3) | 10.6% |
| Blowouts (margin >= $20) | 46.6% |
| Spread of final cash in a game (sd) | $21.6 |
| Win % by seat (seat 0 first) | 31.1 / 34.8 / 34.1 |
| Days bought first: winners vs everyone | 2.7 vs 3.33 |
| Win % by days bought first | 0d: 42.3% (560), 1d: 41.3% (702), 2d: 38.4% (750), 3d: 35.5% (740), 4d: 34.1% (649), 5d: 30.7% (489), 6d: 21.3% (357), 7d: 17.9% (240), 8d: 13.6% (154), 9d: 8.4% (107), 10d: 3.8% (52) |


#### `an-final-ear2-n3.md`

### final-ear2-n3.jsonl: 3 stalls, normal/normal/normal AI, 10 days, 1600 games

**Shopkeepers** (fair = 33.3%)

| Perk | Seats | Win % | SE | vs fair | Avg cash | Cash vs table | SE | Sole serves/game | Favours earned | Pieces bought | Spoiled | Perk cash/game |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| Haggler | 593 | 28.7 | 1.9 | -4.7 | 78.8 | -2 | 0.7 | 0.98 | 0.95 | 28.4 | 1.38 |  |
| Big Basket | 628 | 28.5 | 1.8 | -4.8 | 79.9 | -2.4 | 0.8 | 1.05 | 1.01 | 29.8 | 1.68 |  |
| Bargain Hunter | 614 | 35 | 1.9 | +1.7 | 84.3 | +0.8 | 0.8 | 0.88 | 0.85 | 28.6 | 1.68 |  |
| Charmer | 593 | 36.1 | 2 | +2.8 | 83.6 | +1.5 | 0.8 | 0.96 | 0.95 | 28 | 1.34 |  |
| Tip Jar | 582 | 30.9 | 1.9 | -2.4 | 83 | -0.6 | 0.8 | 0.91 | 0.88 | 27.9 | 1.61 | 1.8 |
| Nest Egg | 604 | 35.3 | 1.9 | +1.9 | 84.5 | +1.3 | 0.8 | 0.85 | 0.83 | 28.8 | 1.8 | 8 |
| Shade Cloth | 577 | 36.7 | 2 | +3.4 | 85.4 | +1.3 | 0.8 | 1.03 | 0.99 | 27.7 | 0.03 |  |
| Sharp Ears | 609 | 35.6 | 1.9 | +2.3 | 84.1 | +0.2 | 0.8 | 0.93 | 0.91 | 28 | 1.56 | 8.8 |


#### `an-final-ear2-n2.md`

### final-ear2-n2.jsonl: 2 stalls, normal/normal AI, 10 days, 1600 games

**Shopkeepers** (fair = 50%)

| Perk | Seats | Win % | SE | vs fair | Avg cash | Cash vs table | SE | Sole serves/game | Favours earned | Pieces bought | Spoiled | Perk cash/game |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| Haggler | 378 | 47.6 | 2.6 | -2.4 | 85 | -1.6 | 0.8 | 1.18 | 1.13 | 29.4 | 1.82 |  |
| Big Basket | 433 | 47.6 | 2.4 | -2.4 | 84.6 | -1.7 | 0.8 | 1.33 | 1.26 | 30.8 | 2.18 |  |
| Bargain Hunter | 436 | 51.6 | 2.4 | +1.6 | 91.6 | +1.3 | 0.8 | 1.31 | 1.27 | 30.4 | 2.15 |  |
| Charmer | 387 | 47.8 | 2.5 | -2.2 | 88.7 | -0.8 | 0.9 | 1.27 | 1.26 | 29.8 | 1.91 |  |
| Tip Jar | 353 | 47.3 | 2.7 | -2.7 | 89.1 | -1.1 | 0.9 | 1.25 | 1.22 | 29.4 | 1.84 | 2.5 |
| Nest Egg | 421 | 54.6 | 2.4 | +4.6 | 90.1 | +2.4 | 0.9 | 1.18 | 1.16 | 30.5 | 2.14 | 8 |
| Shade Cloth | 387 | 48.1 | 2.5 | -1.9 | 89.8 | -0.3 | 0.8 | 1.47 | 1.41 | 29 | 0.05 |  |
| Sharp Ears | 405 | 54.6 | 2.5 | +4.6 | 93.6 | +1.4 | 0.8 | 1.28 | 1.23 | 29.4 | 1.93 | 10.3 |


#### `tests-summary.txt`

```
BEFORE
      Tests  451 passed | 1 skipped (452)
 Test Files  58 passed (58)
AFTER
      Tests  10 failed | 441 passed | 1 skipped (452)
 Test Files  9 failed | 49 passed (58)
⎯⎯⎯⎯⎯⎯ Failed Tests 10 ⎯⎯⎯⎯⎯⎯⎯
FAILING ONLY AFTER THE DIFF
 FAIL  tests/juice-night.test.ts > nightOutlook: tonight by the night's own rules > agrees with every night of many seeded computer games (Heatwave, Juice Bar and its cap)
 FAIL  tests/mechanics.test.ts > merchant traits > Nest Egg starts with $18 (everyone else $10) and Bargain Hunter gets $1 off the first fruit each day
 FAIL  tests/rules-text.test.ts > green fruit > RULES.md gives an Unripe price only for fruit a lorry delivers green, and the right one
 FAIL  tests/rules11.test.ts > rules 11: shopkeepers (spec section 6) > eight characters with eight perks; every sixth player still picks from at least 3
 FAIL  tests/rules11.test.ts > rules 11: upgrades and favours (spec section 7) > rules 14: five upgrades at real prices: Juice Bar $4 (juices up to 2), Handcart $6, Premium Display $6, Ripening Room $6, Order Book $5
 FAIL  tests/rules14.test.ts > rules 14: fruit lives > fruits last 3, 4, 5 and 6 days: the last two are Okay then Soft, every day before is Fresh
 FAIL  tests/rules17.test.ts > rules version 17 > is the version the app and the server speak, with new computer players
 FAIL  tests/rules4.test.ts > rules version 9 > keeps daily boards for each rules and computer-player version apart
 FAIL  tests/rules7.test.ts > rules version 7 > prices a mango at $6 fresh and $3 green (rules 14)
 FAIL  tests/story-after-sale.test.ts > what-if advice follows the tie order and your crate > every claim holds when the bell is re-run at the suggested price (seeded computer games)
TESTS-DONE
```

