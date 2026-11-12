# Fruit Market · achievements, cosmetics and progression (rules version 18)

Study date 2026-11-12 03:05 (Asia/Kuala_Lumpur). Read-only: no code, rule, test or record was changed. This file is the only thing added.

| | |
|---|---|
| Owner's request | "go through all the achievements and help to build a coherent system with unlockable cosmetics, create an exciting progression-ish systems to be hooked, think of maybe potentially monetising later down the road" |
| What was read | Branch `ccr-d8bcd65d-gblqqb` (rules version 18): `src/ui/achievements.ts`, `progress.ts`, `looks.ts`, `Wardrobe.tsx`, `store.ts`, `account.ts`, `App.tsx`, `Home.tsx`, `Online.tsx`, `art.tsx`, `ticket.tsx`, `fx.ts`, `game/panels/Results.tsx` and `DailyResult.tsx`; `src/net/looks.ts`, `profile.ts`, `daily.ts`, `protocol.ts`; `src/engine/data.ts`, `game.ts`, `daily.ts`; `server/accounts.ts`, `meta.ts`, `names.ts`, `limits.ts`, `room.ts`, `worker.ts`; `docs/ANALYTICS.md`, `docs/privacy.html`, `store/listing.md`, `PUBLISHING.md`, the game brief and creative bible, REP-101, the text audit and glossary, UX-FINDINGS, DEC-069 and DEC-086 to DEC-096, the art drafts in `docs/studio/art-drafts/cards-18` |
| How | By reading the code, and by playing 4,700 computer games through the real engine with the real achievement check (section "How the numbers were made"). Nothing was played by a person. The measuring scripts were kept outside the repo |
| Status | A study and a proposal. Nothing here is approved or built. Building any of it needs an approved plan (it changes what the phone and the account store) |

## In short

- **Today:** 43 achievements in 10 groups, 31 looks (17 worn by the shopkeeper, 14 on the stall), 8 free stall colours, a 6-stage Market League, a Daily market streak, and an optional account (an ID and a password, no email) that carries all of it to another phone.
- **Seven achievements are dead or nearly dead** under rules 18, not three: Worth the Wait and Fully Fitted cannot be earned; Jam Session, Full House and Fruit Tycoon were earned in under 1% of 10-day computer games; Sole Supplier in 0.3% of default games; Juice Bar Regular in 0 to 1%. Six looks sit behind them.
- **Most rewards show nowhere.** The 14 stall looks and the 8 stall colours are drawn only inside the Wardrobe. The screens say "Your awning uses it in every game" and "Everyone in the room sees what you pick". Neither is true today.
- **Nothing goes up.** There is no level, 12 achievements give nothing, and a new player earns about six achievements in the first game and then waits a long time.
- **Proposal:** one number, your **stall level** (1 to 30), shown as a **stamp book**. Every finished game, every Daily market, a weekly goal and every achievement tier pays stamps. Six ranks, from Roadside Table to Towkay. About level 10 after two hours, 17 after ten, 30 after fifty.
- **Achievements become 55 cards with Bronze, Silver and Gold tiers** (125 tiers), in eight groups. All 43 old ones are kept, so nobody loses anything.
- **Cosmetics** get a place on the table and a reason: awnings, shopkeeper looks, signboard frames, titles, price tags, card backs, table themes, bell and coin sounds. Most of the new ones need no new pictures.
- **Money later:** a one-time supporter pack first, then the printed game. No ads. Nothing bought ever changes a rule, a price, the odds or what anyone can see. Three small things built now keep that door open without a shop.

---

## A. What exists

### A1. The 43 achievements

A percentage in the last column is how often a Normal computer in your seat earned it in one Standard game (4 stalls, 10 days, three Normal rivals, 300 games). It is a stand-in for an average player, not a measurement of people.

| # | Name (code name) | Exact condition in the code | Look it unlocks | Under rules 18 |
|---|---|---|---|---|
| 1 | Open for Business (`first_win`) | Finish a game as a winner (a shared win counts) | Trader's Bowler, hat | Fine. Computers 28% |
| 2 | First Sale (`first_sale`) | Sell at least one piece in a finished game | Striped Roof | Fine. Every game |
| 3 | Market Explorer (`explorer`) | Finish a game in all four: New game, Daily market, Market League, online | none | Fine |
| 4 | Nothing Wasted (`no_waste`) | Win with no piece spoiled | Ticker-Tape Scarf, neck | Fine. 18% |
| 5 | Jam Session (`jam_session`) | The jam maker pays you $10 or more on the last day | Chalk Board, prop | **Out of reach.** $1 a ripe piece and a shelf of 8 (10 with a Handcart): it needs a Handcart and ten ripe pieces left unsold. 0 in 2,100 games; most seen $8 |
| 6 | Juice Bar Regular (`juice_regular`) | $20 or more from a Juice Bar in one game ($1 for each Okay or Soft piece a customer buys, $2 for each piece juiced at night) | none | **Barely.** 0 to 1%. A person could do it on purpose |
| 7 | Name Your Price (`full_price`) | Sell 5 pieces at the customer's top price in one game | Trader's Visor, hat | Too easy: 85%. A standing order's pieces count as "top price" by mistake |
| 8 | Penny Under (`penny_under`) | Sell as the cheapest stall while the next stall is exactly $1 dearer | Brass Scales, prop | Too easy: 96% |
| 9 | Sky High (`sky_high`) | Sell a piece for $12 or more | Brass Loupe, face | Fine: 63%. A mango standing order counts too |
| 10 | Tie Breaker (`tie_breaker`) | Win a sale when the next stall set the same price and had pieces to sell | Ticker-Tape Garland, neck | Too easy: 95% |
| 11 | Sole Supplier (`sole_five`) | In one game, serve 5 customers alone | Pencil and Order Slip, face | **Nearly out of reach** in a Standard game: 0.3% (a Hard computer against Easy rivals: 2%, and 27% in a Long game). A stall serves about one customer alone a game |
| 12 | Red Carpet (`red_carpet`) | Sell to the Influencer, the Gym Club and the Hotel Chef, over any number of games | Banknote Bow Tie, neck | Works. There are five guests now |
| 13 | Familiar Faces (`town_12`) | Sell to 12 different customers | Scalloped Roof | Earned in the first game (about 15 different customers a game) |
| 14 | The Whole Town (`town_36`) | Sell to 36 different customers | Tassels, trim | **Miscounts.** The Wedding Caterer, the Bakery and the eight standing-order clients count as customers, so 46 names can fill 36 places |
| 15 | Worth the Wait (`worth_wait`) | Sell to a customer who was also in the row the day before | Paper Lanterns, trim | **Cannot be earned.** Nobody waits overnight since rules 14 |
| 16 | Full House (`full_house`) | Sell to 6 different customers in one day | Brass Hand Bell, in hand | **Almost never.** The row holds 5; a sixth comes only when a guest joins a full row at 5 or 6 stalls. 0% at 4 stalls, 0.7% at 6 |
| 17 | Bare Stall (`bare_stall`) | Win with no upgrade built (upgrades switched on) | Plant Pot, prop | Fine: a choice |
| 18 | Fully Fitted (`fully_fitted`) | Build 3 upgrades in one game | Trader's Waistcoat, neck | **Cannot be earned.** A stall has room for two |
| 19 | Mango Mogul (`mango_mogul`) | Sell 10 mangoes in one game | Porter's Cap, hat | Fine: 12% |
| 20 | Giant Slayer (`beat_hard`) | Win a game that has at least one Hard computer | Member's Badge, badge | Fine |
| 21 | Hard Sweep (`hard_sweep`) | Win a 4-stall game against three Hard computers | none | Fine |
| 22 | Quick Change (`shop_3`) | Win with 3 different perks | none | Fine |
| 23 | Shopkeeper Master (`shop_6`) | Win with 6 different perks | none | The text says "all 6"; there are 8 |
| 24 | Rival Roll Call (`rivals_all`) | Win games that included each of the first six computer shopkeepers | Certificate Sash, neck | Leaves out Pak Din and Farah |
| 25 | Market Day (`big_day`) | Earn $40 or more in one day | Starry Roof | Easy: 55%. The name clashes with Market Days |
| 26 | Festival Rush (`festival_rush`) | Earn $40 or more on a Festival day | Gazette Paper Hat, hat | Fine: 7% |
| 27 | Event Collector (`event_all`) | See every event card. The check needs 20 | none | **Wrong number.** The text says 13 and the counter stops at "13 / 13" while it stays locked |
| 28 | Card Sharp (`card_sharp`) | Play all 6 kinds of favour card | none | Fine, slow (a stall earns about one favour card a game) |
| 29 | Comeback Kid (`comeback`) | Win after having the least cash at the end of Day 5 | Pocket Watch, badge | Fine: 6% |
| 30 to 32 | Regular, Week Runner, Month of Markets (`streak3`, `streak7`, `streak30`) | Finish a Daily market with 3, 7 or 30 days played in a row | Bunting, trim · Brass Laurel, hat · none | Work. One missed day sends the count to zero |
| 33 | Top Ten (`daily_top10`) | The leaderboard puts you in the day's top 10 | none | Works. Easy while few people play |
| 34 | Town Favourite (`online_win`) | Win an online game | none | Fine |
| 35 | Pen Pal (`online_10`) | Finish 10 online games | none | Fine |
| 36 | League Champion (`league`) | Clear all six Market League stages | Chairman's Top Hat, hat | Fine |
| 37 | Fruit Tycoon (`rich`) | Finish a game with $200 or more | Golden Apple, prop | **Out of reach in a Standard game.** Average $90, best seen $164. A Hard computer against Easy rivals reached $200 once in 300 games; 16% in a Long game |
| 38 to 40 | Stall Starter, Market Regular, Fruit Baron (`sold_100`, `sold_500`, `sold_2000`) | Pieces sold in total | Crate Stack, prop · Fruit-Print Roof · none | Fine (about 25 a game). Online games are not counted |
| 41 to 43 | Getting Started, Seasoned, Veteran (`played_10`, `played_50`, `played_200`) | Games finished | Checked Roof · Stall Cat, prop · Exchange Medal, badge | Fine. Online games are not counted |

How progress is counted: once, when the results screen opens, `evaluate` reads the finished game (each day's sales, cash and event) and the running totals. Sixteen achievements show "x / goal". Top Ten is given by the leaderboard reply and League Champion by the League record, outside that check.

### A2. Cosmetics

| What | How many | How it is unlocked | Where it is drawn today |
|---|---|---|---|
| Worn by the shopkeeper: hat 6, face 2, neck and chest 5, badge 3, in hand 1 | 17 | One achievement each | On the portrait in the Wardrobe, the online lobby, the results and, in play, wherever the face is 22 px or more (your shelf, the larger rival boxes). Never in the Daily market or the Market League, where you have no shopkeeper picture. Not on Home |
| On the stall: roof 5, trim 3, counter prop 6 | 14 | One achievement each | Only in the Wardrobe preview |
| Stall colour (Terracotta, Harbour, Olive, Saffron, Fig, Midnight, Rose, Royal) | 8 | Free | Only in the Wardrobe preview and the picker on Trophies |
| Stall pattern (stripes, dots, checks, zigzag, bars, diamonds) | 6 | Not chosen: one per seat | In play: your shelf, the rival boxes, the bell |
| Shopkeeper | 8 | Free. It fixes the perk, so it is a rule, not a look | Everywhere. Home and the Wardrobe show the one last used online (else Rosa) |
| Sounds | 8 short sounds and a tune, all made by code (no sound files). The bell has no sound of its own | Switches in Settings | |
| Card backs, price tags, table themes, titles | none | | |

### A3. What is stored

Everything is on the phone, in plain lists. Only the unfinished game sits in the versioned save envelope (`fm.save`: save version 2, the rules version, the computer-player version). The rest are small separate entries that fall back to "empty" when missing, which is why old saves keep loading.

| On the phone | Holds | Copied to an account |
|---|---|---|
| `fm.stats` | Games, wins, best cash, pieces sold | Yes, the higher number wins |
| `fm.ach` | The achievements earned | Yes, joined |
| `fm.prog` | Eight sets: modes finished, customers, guests, events, favour cards, online games, perks won with, rivals beaten | Yes, joined |
| `fm.looks`, `fm.worn`, `fm.colour` | Looks owned, looks on, stall colour | Yes (owned: joined; on and colour: the newest) |
| `fm.ladder` | Market League stage, 0 to 6 | Yes, the higher |
| `fm.daily` | Best cash for each Daily market date (the streak is worked out from these dates) | Yes, 400 dates |
| `fm.name`, `fm.avatar` | Name, shopkeeper last used online | Yes |
| `fm.save` | The unfinished game | Never |
| `fm.settings`, `fm.claim`, `fm.tutorial` and a few more | Switches, the secret key that proves a leaderboard name is yours, tips seen | No |

On the server: accounts (ID, scrambled password, the profile above); one Daily board for each date, rules version and computer version (top 100: name, cash, pieces sold; every score is checked by replaying the game); anonymous counters kept 90 days; rooms deleted 24 hours after the last move. There is no player ID in any counter.

Two facts that matter later: the account trusts whatever the phone sends, and the room server checks that a look exists, not that the player owns it. That is fine for free things. It is not enough for anything paid.

### A4. Where it is shown

- **Trophies** (from Home): a Wardrobe button, the Market League list, the 43 achievements in ten groups, the stall colour picker.
- **Wardrobe** (from Home "Dress up", from Trophies, from the online lobby and the pause menu): a preview and the 31 looks by slot.
- **Results:** "Achievements unlocked" and "New looks unlocked", after the winner, the chart and the recap.
- **Home:** the streak inside the Daily market line. **Settings:** games, wins, best cash, fruit sold.

---

## B. What is wrong with it

1. **Dead achievements, and more than the three already named.** Worth the Wait and Fully Fitted are impossible. Full House, Jam Session, Sole Supplier and Fruit Tycoon are out of reach in a normal game. Juice Bar Regular is nearly so. Six looks are locked behind them: Paper Lanterns, Trader's Waistcoat, Brass Hand Bell, Chalk Board, Pencil and Order Slip, Golden Apple.
2. **Wrong counts and words.** Event Collector (13 shown, 20 needed). The Whole Town counts guests and standing-order clients. "All three guests" of five, "all 6 shopkeepers" of eight, six rivals of eight. A standing order's pieces count as top-price sales, as $12 sales and as a customer served alone.
3. **No ladder.** 43 separate boxes. Nothing adds up to anything, there is no number that rises, and 12 achievements give no reward at all.
4. **A flood, then a drought.** Penny Under, Tie Breaker and Name Your Price fall in almost every game, so about six achievements arrive in the first game. Then the gaps grow: Seasoned is 40 games after Getting Started, and Veteran 150 after that.
5. **Rewards that do nothing.** 14 stall looks and 8 colours are never drawn outside the Wardrobe. Worn looks vanish on small faces and never appear in the Daily market or the Market League, the two modes built for coming back. Home shows no looks (noted in STATE). The store listing still sells "new awning colours".
6. **Holes in the counting.** Online games add nothing to games, wins or fruit sold (`Online.tsx` passes an empty `onChange`), so "Finish 10 games" ignores them. Achievements are only checked on the results screen. Nothing is counted for each shopkeeper or each fruit, so there is nothing to build mastery on.
7. **The streak punishes a break.** One missed day is zero, and the only streak rewards are for unbroken runs.
8. **No trust for later.** See A3: looks are not checked for ownership online.
9. **Old screens and two doors.** Trophies and Wardrobe still have the old rounded look (UX finding 18), and the Wardrobe hangs off Trophies as well as Home.
10. **Papers out of date.** The game brief and the store listing say "No accounts"; accounts exist. The privacy page is correct.

---

## C. One progression system

### C1. The one thing that goes up: your stall level, on a stamp book

- You collect **stamps**. They fill a **stamp card**. A full card raises your **stall level** by one. Thirty cards make the book.
- Every five levels is a **rank**, named for where your stall stands. The names are suggestions in the Malaysian market voice; the owner's wording decides: **Roadside Table, Five-Foot Way, Covered Stall, Corner Lot, Shophouse, Towkay**.
- Stamps are never spent, never lost and never sold.
- The level is **worked out from what you have done, not stored**. So two phones can never disagree, nothing has to be converted, and players who already have trophies open the update to find the stamps those trophies are worth.
- It fits the look the game already has: tickets, stubs, perforations. A rubber stamp landing on a card is the same world.

### C2. What earns stamps

| What you do | Stamps |
|---|---|
| Finish a game | 1 for every 3 days played: Quick 2, Standard 3, Long 4 |
| Win it (a shared win counts) | 1 more |
| Finish the Daily market, first time each day | 2 more |
| Finish the weekly goal | 10 |
| An achievement tier, once each | Bronze 2, Silver 5, Gold 10 |

Nothing for opening the app, for time spent, or for watching anything.

### C3. Six ranks, thirty cards

"Reached" is for the average stand-in with the habits assumed in C4.

| Rank | Levels | Stamps a card | Reached after about | Reward at each level |
|---|---|---|---|---|
| 1 Roadside Table | 1 to 5 | 15 | the start | 2 Chalk-slate price tag · 3 Bicycle bell · 4 Coin-jar sound · 5 Star price card |
| 2 Five-Foot Way | 6 to 10 | 25 | 4 games (under an hour) | 6 Title and Painted-board frame · 7 Counter bell · 8 Hand-written price card · 9 Abacus coin sound · 10 "Sold out" results stamp |
| 3 Covered Stall | 11 to 15 | 40 | 12 games (2.5 hours) | 11 Title and Lantern-string frame · 12 Lorry card back · 13 Event card back · 14 Favour card back · 15 Lantern-light table (a dark theme) |
| 4 Corner Lot | 16 to 20 | 60 | 36 games (7 hours) | 16 Title and Brass-plate frame · 17 Upgrade card back · 18 Shopkeeper card back · 19 Standing-order card back · 20 Monsoon table |
| 5 Shophouse | 21 to 25 | 80 | 83 games (17 hours) | 21 Title and Carved-wood frame · 22 School bell · 23 Brass-clip price tag · 24 Luggage-tag price tag · 25 Festival table |
| 6 Towkay | 26 to 30 | 100 | 157 games (31 hours) | 26 Title and Gold-leaf frame · 27 Gong · 28 Gold-foil card backs · 29 Gold-edge stamp card · 30 Gold-thread awning · the book full (about 258 games): a framed licence on your stall |

The whole book is 1,600 stamps. A larger card is drawn in rows of ten, so a row fills every two or three games even at the top. The first ten levels are ordered so that they need no new pictures beyond small shapes: sounds, price tags, a title, a frame and a stamp.

### C4. Pacing

A Standard game is taken as 12 minutes (the store listing says about 10; nobody has timed real players). "Average" is a Normal computer in your seat against three Normal rivals, winning 25%. "Strong" is a Hard computer in your seat, winning 59%. Both rotate through the eight shopkeepers. Habit stamps are an estimate added on top: the Daily market on about two days in three and most weekly goals.

| Time played | Games | Stamps, average · strong | Stall level, average · strong | Typically earned by then |
|---|---|---|---|---|
| First game | 1 | 29 · 58 | 2 · 4 | First Sale, a tie won, a $1-under sale, 5 at top price, 12 customers in the book |
| First hour | 5 | 100 · 155 | 6 to 7 · 9 | 100 pieces sold, 30 of each fruit, Nothing Wasted, nothing left for the jam maker |
| **Two hours** | 10 | 185 · 230 | **10 · 11** | All 36 customers served once, all 20 events seen, 6 customers served alone, best stall under 10 events, a 10-mango game, 10 games |
| Five hours | 25 | 315 · 365 | 13 · 15 | Best stall under all 20 events, the whole row served, 15 at top price, five standing orders, all five guests, 500 sold |
| **Ten hours** | 50 | 510 · 565 | **17 · 18** | Top price from all 36 customers, 18 served alone, 200 of each fruit, 50 games; the strong player has won with all eight shopkeepers |
| Twenty hours | 100 | 800 · 915 | 22 · 23 | All eight standing-order clients, 2,000 sold, a third win with any one shopkeeper (average: about game 115; strong: game 40) |
| **Fifty hours** | 250 | 1,560 · 1,660 | **30 · book full** (about game 235) | 30 customers served alone, 1,000 of each fruit, 200 games, six wins with each shopkeeper (strong: about game 75 for any one; the average player is still finishing these) |

So a level comes about every 12 minutes in the first two hours, every hour or so up to ten hours, and every three hours after that. The gaps at the top are filled by the achievements' own rewards, the weekly goal and the book.

What the stand-ins did not do, and people can: play all six kinds of favour card (never), build all five kinds of upgrade (never), earn the Juice Bar money (once in 2,000 games). Computers do not use Gossip or Scout well and keep to a few upgrades.

### C5. Achievement groups and tiers

55 cards, 125 tiers, 664 stamps. A code name in brackets is an achievement that exists today and keeps its name in the save, so what players earned stays earned. Anything without a code name is new. Text follows the glossary and the text audit's plain names.

**1. First steps** (3 cards)

| Card | Bronze | Silver | Gold |
|---|---|---|---|
| First Sale | Sell a piece (`first_sale`) | | |
| Open for Business | Win a game (`first_win`) | | |
| Every mode | | Finish a New game, a Daily market, a Market League stage and an online game (`explorer`) | |

**2. Shopkeepers** (10 cards)

| Card | Bronze | Silver | Gold |
|---|---|---|---|
| One card for each of the eight: Rosa, Uncle Benny, Ah Chen, Saleh, Raj, Kiki, Pak Din, Farah | Win 1 game with them | Win 3 | Win 6 |
| Different shopkeepers | Win with 3 (`shop_3`) | Win with 6 (`shop_6`) | Win with all 8 |
| Rivals beaten | Beat 3 different computer shopkeepers | Beat the first six (`rivals_all`) | Beat all eight, each at Hard |

In the Daily market and the Market League you pick a perk, not a shopkeeper; a win counts for the shopkeeper who owns that perk.

**3. Fruit and decks** (11 cards)

| Card | Bronze | Silver | Gold |
|---|---|---|---|
| Blueberry, Watermelon, Apple, Mango (one card each) | Sell 30 | Sell 200 | Sell 1,000 |
| Mango Mogul | | 10 mangoes in one game (`mango_mogul`) | |
| Favour cards | Play 3 different kinds | Play all 6 (`card_sharp`) | |
| Upgrades | Build 2 in one game (`fully_fitted`) | Build each of the 5 | Win with each of the 5 built |
| Standing orders | Deliver one in full (`worth_wait`) | Deliver 5 in full | Deliver for all 8 clients |
| Lorries (later: needs the lorry's name kept in the day's record) | See 10 | See all 20 | |
| Juice money | | $20 from a Juice Bar in one game (`juice_regular`); the number needs a check with people | |
| Nothing for the jam maker | Finish the last day with no ripe piece left and 20 or more sold (`jam_session`) | | |

**4. The book** (6 cards; section D shows the pages)

| Card | Bronze | Silver | Gold |
|---|---|---|---|
| Customers served | 12 (`town_12`) | All 36, guests and clients not counted (`town_36`) | |
| Top price | Sell at top price to 12 different customers | To all 36 | |
| Served alone | 6 different customers | 18 | 30 |
| Guests | Three guests (`red_carpet`) | All five | |
| Events seen | 10 | All 20 (`event_all`) | |
| Best stall of the day | | Earn the most on the day of 10 different events | Of all 20 |

**5. Habits** (6 cards)

| Card | Bronze | Silver | Gold |
|---|---|---|---|
| Daily markets finished (total days, not in a row) | 3 | 10 | 30 |
| Streak, with the forgiving rule in section E | 3 days (`streak3`) | 7 (`streak7`) | 30 (`streak30`) |
| Daily wins (beat the three computers) | 1 | 10 | 30 |
| Top Ten | | In the day's top 10 (`daily_top10`) | |
| Seven twists | | Finish a Daily market under each of the 7 twists | |
| Weekly goals finished | 1 | 4 | 12 |

**6. Skill feats** (14 cards, each in one game)

| Card | Bronze | Silver | Gold |
|---|---|---|---|
| Nothing Wasted | | Win with nothing spoiled (`no_waste`) | |
| Top price | 5 pieces at top price (`full_price`), standing orders not counted | 10 | 15 |
| One dollar under | 1 sale won by exactly $1 (`penny_under`) | 5 | 8 |
| Tie Breaker | Win a tied price (`tie_breaker`) | | |
| Big sale | A $12 sale (`sky_high`) | A $15 sale | |
| Sole Supplier | Serve 1 customer alone | 2 | 3 (`sole_five`) |
| The whole row | | Sell to every customer in the row in one day, four or more (`full_house`) | |
| Best day | $40 in a day (`big_day`) | $55 | $70 |
| Festival Rush | | $40 on a Festival day (`festival_rush`) | |
| Final cash, Quick or Standard game | $100 | $130 | $160 (`rich`) |
| Comeback Kid | | Win after being last on Day 5 (`comeback`) | |
| Bare Stall | | Win with no upgrade (`bare_stall`) | |
| Giant Slayer | | Win against a Hard computer (`beat_hard`) | |
| Hard Sweep | | | Win 4 stalls against three Hard computers (`hard_sweep`) |

**7. Market League and online** (3 cards)

| Card | Bronze | Silver | Gold |
|---|---|---|---|
| Market League | Clear stage 2 | Stage 4 | All six (`league`) |
| Online games finished | 1 | 10 (`online_10`) | 50 |
| Online wins | 1 (`online_win`) | 5 | 25 |

**8. Milestones** (2 cards)

| Card | Bronze | Silver | Gold |
|---|---|---|---|
| Games finished, online ones included | 10 (`played_10`) | 50 (`played_50`) | 200 (`played_200`) |
| Pieces sold | 100 (`sold_100`) | 500 (`sold_500`) | 2,000 (`sold_2000`) |

How the tier numbers were set: Bronze happens in most games or the first few; Silver in roughly one game in five for the average stand-in; Gold in one game in twenty or less, or is a long count. They are starting values, to be checked against real players.

### C6. The trophies that DEC-086 said to change

| Old | New task (code name and look kept) | How often, average stand-in |
|---|---|---|
| Worth the Wait: serve a customer who came back | Deliver a standing order in full. The name fits: an order is won two days before it is due | 30% of games |
| Fully Fitted: build three upgrades | Build two upgrades in one game | 34% (11% in a Quick game) |
| Full House: six customers in a day | Sell to every customer in the row in one day, four or more | 9%. "All five customers" as first proposed would be 1.7% at 4 stalls, because the row there is four unless an event adds one |
| Jam Session: $10 from the jam maker | Finish the last day with nothing left for the jam maker (20 or more sold) | Most players within four games |
| Sole Supplier: five alone in a game | Becomes the Gold tier at three | 7% |
| Fruit Tycoon: $200 | Becomes the Gold tier of Final cash at $160 | Under 1% average, 4% strong |
| Event Collector, The Whole Town, the "all" wording | Counts and words corrected | |

### C7. How achievements feed the ladder

- Every tier pays stamps once (2, 5 or 10). For the average stand-in at fifty hours, about half of the stamps came from finishing games, a little over a third from achievements, and the rest from the Daily market and weekly goals.
- Every Gold, and some Silvers, also gives its own thing to show: a title, a ring, a card back (section D). The level rewards come from the book; the themed rewards come from what you did.
- On the Trophies screen each card shows its three tiers and a bar to the next one, and the nearest three are listed at the top.

---

## D. Unlockable cosmetics

### D1. The catalogue

"Rivals see it" means online. In a solo game the computers see nothing, but the table shows it to you.

| Kind | Items | You see it | Rivals see it | Unlocked by | Pictures needed |
|---|---|---|---|---|---|
| Stall pattern | The six printed ones | Your shelf, the bell | Yes: it is your stall's mark | Free. Pick a favourite; a room gives each stall a different one, first come first served, as with shopkeepers | None |
| Awning colour | The 8 that exist | Home, your shelf, lobby, results | Rival box, lobby, results | Free, as now | None (drawn today, only in the Wardrobe) |
| Awning roof and trim | 5 roofs and 3 trims that exist, plus 4 fruit prints and Gold thread | Same | Same | Today's achievements; Gold for each fruit; level 30 | 5 small new ones |
| Counter prop | The 6 that exist, plus a calendar and the framed licence | Home, Wardrobe, lobby, results | Lobby, results | Today's achievements; 30 Daily markets; the book full | 2 small new ones |
| Shopkeeper looks | The 17 pieces of regalia that exist | The portrait: Home, shelf, lobby, results | Wherever the face is 22 px or more | Today's achievements | None |
| Shopkeeper gold ring | 8, one for each shopkeeper | Round the portrait | Yes | Six wins with that shopkeeper | A ring, no picture |
| Signboard frame | Plain, Painted board, Lantern string, Brass plate, Carved wood, Gold leaf | Home, Trophies, lobby, results | Lobby, results, your card when a rival taps you | Rank | Simple line work |
| Title | 6 rank titles and about 14 feat titles (League Champion, Fruit Tycoon, Hard Sweep, Town Favourite, Veteran, By Appointment and so on) | Under your name | Lobby, results, your card; later the Daily board | Rank; Gold tiers | Words only, from a fixed list, so nothing to moderate |
| Price-tag style | Ticket (now), Chalk slate, Star card, Hand-written card, Brass clip, Luggage tag, Gold edge | While pricing; at the bell | At the bell, on your crate | Levels 2, 5, 8, 23, 24; Gold edge for top price from all 36 customers | Small shapes. Same digits, same size, same timing |
| Card backs | For each of six decks: the pattern (chosen for now, DEC-096), a picture, a stub; Gold foil for all | Your screen | No. Each player sees their own | Pictures at levels 12 to 14 and 17 to 19; Gold foil at 28; a deck's stub for finishing that deck's pages in the book | The six pictures are drafted in `cards-18` (lorry, loudhailer, sealed envelope, toolbox, empty stall, stamped order); the stubs are in the mock-ups |
| Table theme | Morning (now), Lantern light (dark), Monsoon, Festival | Your screen | No | Levels 15, 20, 25 | None: colours only. Each must pass the same contrast check as today |
| Bell sound | Brass hand bell (the bell gets its own sound first), Bicycle bell, Counter bell, School bell, Gong | Your phone | No | Levels 3, 7, 22, 27 | None: sounds are made by code |
| Coin sound | Till (now), Coin jar, Abacus | Your phone | No | Levels 4, 9 | None |
| Results stamp | "Sold out" | Results | Results, on your row | Level 10 | One small stamp |
| Stamp card style | Plain, Gold edge | Trophies, results | No | Level 29 | None |

About 45 things exist today (31 looks, 8 colours, 6 patterns). The proposal adds about 70, and all but about 15 need no new picture.

### D2. The book, and the art being drawn

The 36 customer scenes, 21 event pictures, 8 standing-order clients and 8 shopkeepers being drawn in `cards-18` are the reward of the collection book. A page is a silhouette until you meet that card, then shows the full picture, the character's line and three ticks.

| Pages | Ticks on each page |
|---|---|
| 36 customers | Served · Sold at top price · Served alone |
| 5 guests | Served |
| 20 events (and the Calm Day picture, free) | Seen · Best stall that day |
| 8 standing-order clients | Delivered in full |
| 20 lorries (later) | Seen |

Measured with the stand-ins: all 36 "Served" by about game 8, all "Top price" by game 20 to 32, 30 "Served alone" by game 139 to 179. Three ticks, three horizons, from one set of pictures.

### D3. Where the looks go on the table

This is the part that needs the owner's eye, in the screen work already planned (REP-104):

- **Your shelf (the dock):** your awning (roof, trim, colour) as a strip above it, your shopkeeper with their looks.
- **A rival's box:** a thin awning strip and the face. Tap it for their card: frame, title, looks, prop.
- **The bell:** each crate carries its stall's price-tag style.
- **Home:** "Your stall" drawn with your awning, prop, shopkeeper and looks, and a small stamp card beside it.
- **Daily market and Market League:** your chosen shopkeeper's picture is shown (the perk is still picked from three), so looks show there too. This must be a display setting only. The game's own shopkeeper setting fixes the perk, so changing that would change the rules of those modes and break the Daily market's replay check.
- **Lobby and results:** frame, title, looks, prop.

### D4. What keeps it fair

1. No look changes a rule, a price, a draw, the order of anything, or a timing.
2. The customer card back is never restyled: its four fruit squares are information. Freshness letters, fruit colours and lane colours are never themed.
3. Price digits are the same size, weight and contrast in every tag and theme, and flip at the same moment.
4. Stall patterns stay one to a stall in a room: they tell stalls apart.
5. No look makes a sound or a movement that tells anyone anything they could not already see.
6. What rivals see travels in the "look" message that exists today, checked against one list on the server. Card backs, themes and sounds never leave the phone.
7. The secret-price leak check stays at 0. Titles are public on purpose and say nothing about a game in progress.

---

## E. Hooks that respect the player

**A streak that forgives.** The streak counts days with a Daily market finished. One missed day is forgiven if you played on five days since the last forgiven miss; two missed days in a row end it. It is worked out from the dates already stored, so there is nothing new to save. The main daily rewards are for total days (3, 10, 30), which a break cannot take away. Your best streak is kept and shown. No message ever says a streak is about to be lost.

**One weekly goal.** The same for everyone, chosen by the week number, Monday to Sunday on the phone's clock, with no server. Sized for three to five games. Examples: sell 20 watermelons; win with two different shopkeepers; deliver two standing orders in full; finish three Daily markets; serve six customers alone; sell 15 pieces at top price; build three different upgrades. It pays 10 stamps. An unfinished goal is simply replaced on Monday: nothing is lost and nothing piles up.

**"One more game" at the results.** After the winner, in this order, never as a pop-up:

```
YOU WIN!  By $6.
+3 stamps for 10 days · +1 for the win · +5 Silver: Uncle Benny, 3 wins
Card 8   [##################.......]   21 of 25
4 stamps to level 9: Favour card back
Close: Customer book 34 of 36 · Weekly goal: 6 watermelons to go
[ Rematch ]   [ Play as Pak Din ]
```

- The stamps land on the card one by one; a full card turns over.
- One "next" line: the nearest reward.
- At most two "close" lines, picked by what is nearest to done.
- The second button sets up the same table with the shopkeeper the nudge is about. One tap. Nothing starts by itself.
- A first game that earns many tiers shows the best three and "and 8 more".

**Natural places to stop.** "Weekly goal done" and "Daily market done for today" are said plainly. A game that respects a stop is one people come back to.

**What to avoid**

- Anything that punishes a break: streaks that reset to zero, rewards that expire, "last chance" timers, looks that can never be earned again.
- Random paid rewards, loot boxes, spins, anything with odds.
- Energy, lives, waiting timers, paying to skip.
- Daily login rewards that grow and reset.
- Notifications that nag or guilt. None in the first version; later only if the player asks for a reminder.
- A leaderboard for stamps or levels: it rewards grinding. The only board stays the Daily market's cash.
- Hiding how long the ladder is. All thirty cards and every reward are visible from the start.
- A paid look that is plainly better than every earned one.

---

## F. Monetising later

### F1. Options, best fit first

| # | Option | For | Against | What it needs |
|---|---|---|---|---|
| 1 | **One-time supporter pack.** One price, one named set of looks (an awning, a frame, a title, a table theme) | Honest and simple; one thing to sell; fits "no ads"; little to look after | Small ceiling; purchases must be restorable | The three things in F4; one product in Play billing; a web checkout page; a server record; privacy and listing updates |
| 2 | **The printed game, and print-and-play files** | The print kit is already made from this repo; a physical game is outside Play's billing rules; the app is its best advert | Printing, posting and stock (or a print-on-demand service); files are easily copied; the kit must first be redone at rules 18 (planned) | A shop page outside the app; one finished, proof-printed kit; a decision on stock or print on demand |
| 3 | **Cosmetic packs**, themed sets a few times a year | Repeatable; the catalogue in D is built for it | Needs steady new art, a shop screen, prices for each country, refunds and support | Everything in 1, plus a shop screen and new pictures each time |
| 4 | **A paid single-player campaign** (a longer Market League with set markets and a story; first chapter free) | Sells play, not looks; board-game players like paying once; no fairness question | The most design and testing; every rules change breaks set markets; it puts play behind a price, which the brief has avoided | Scenario data, balance runs for each market, text, saves |
| 5 | **A cosmetic-only season track** (a free lane and a paid lane, every two months) | The strongest income on paper; a reason to return | Fear of missing out is the whole mechanism, against section E; needs new art every season, a server clock and many active players; the roadmap set it aside. If ever, past seasons must stay open | Everything in 3, plus season data and a population |
| 6 | **Ads** | No price to pay | The listing and the privacy page promise none; an ad kit brings an advertising ID, a consent screen, a new data-safety form and a heavy outside dependency (against the project rule); limits if children are in the audience; pennies at this size; wrong for a board game | Not recommended |

No income figure is claimed here: there is no evidence yet of how many people play or come back.

### F2. Platform rules to respect

These are from general knowledge of the stores' rules and were not re-read today. Check them again when building; they have been changing.

- **Google Play:** looks, packs and a campaign sold inside the Android app must use Google Play's billing. Google keeps a share (about 15% at this size). In most countries the Android app may not send players to a web checkout for the same things.
- **Physical goods** (the printed game) must not use Play billing and may be linked to.
- **Bought elsewhere, used here:** a pack bought on the web can show in the Android app when the player signs in, as long as the app does not advertise the outside price.
- **Random items** would need their odds published. The plan has none.
- **Children:** the listing aims at "Everyone". If children under 13 are a declared audience, Play's family rules apply to purchases and forbid most ads. Declaring 13 and over before selling anything is simpler.
- **Web:** use a seller-of-record service (it sells on the game's behalf and handles sales tax and receipts in each country). No card details ever touch the game's server; the service tells the server "this account owns that pack".
- **iPhone:** there is no iPhone app. iPhone players use the web game and the web checkout.
- **Tax:** ask an accountant about Malaysian tax on the income before the first sale.
- **Forms:** the Play data-safety form and the privacy page must name purchases. The listing must stop saying "No accounts" in any case.

### F3. Privacy and accounts

- **Nothing changes for players who do not buy.** Guests stay guests; counters stay anonymous. New counters would be plain counts ("a level was reached", "a look was worn"), with no ID.
- **On Android** a purchase belongs to the player's Google account. Play restores it on a new phone, so no game account is needed to own it.
- **On the web** a purchase has to belong to something. That means the game account (ID and password) becomes necessary to buy, though never to play.
- **The weak point:** an account has no email, so a forgotten password cannot be reset, and today that would lose a paid pack. The fix that keeps the "no email" promise: the receipt from the seller service carries an order code, and the code restores the pack to a new account. The game stores only a scrambled copy of the code.
- **To be shown online, a bought look must be checked by the server**, not taken on the phone's word (A3).

### F4. What to build now so the door stays open, without a shop

1. **Cosmetics as data.** One list, shared by the app and the server as `src/net/looks.ts` is today, where every item says its kind, where it shows and **where it comes from**: an achievement, a level, a set, or (later) a pack. Adding a paid item is then one new line.
2. **An entitlement list in the save.** What a player may wear is "earned" plus "granted". "Granted" is a separate list that the phone never writes for itself; it is filled only by the server, and kept in the account record apart from the part the phone can add to. It is empty today.
3. **A server check for online display.** One function in the room server: an item that comes from a pack is dropped unless the seat's grants hold it. Today the grants are always empty, so the function is small and tested, and nothing paid can ever slip through later by accident.
4. **Stable names.** Never reuse or rename a code name. Never sell something that was once earnable, and never put a ladder reward behind a price.
5. **Not now:** no shop screen, no prices, no billing plug-in, no checkout page, no season clock.

---

## G. A first version, and the order after it

### First version: one release

Small enough to ride with the screens package, because Trophies, Wardrobe and Results are being redrawn there anyway.

| In | Notes |
|---|---|
| 1. The trophy fixes in C6 | Already approved in principle (DEC-086) |
| 2. Stamps, the stall level and the six ranks | Worked out from stored counts; players with trophies start with their stamps |
| 3. Tiers for what can be read from a finished game today | Groups 1, 2, 6, 7 and 8; group 3 without lorries; from group 4 the Served, Guests and Seen cards; from group 5 the daily total, the streak and Top Ten. New counters: wins for each shopkeeper, pieces for each fruit, a few small sets |
| 4. Online games count as games | A fix to B6 |
| 5. Results: the stamps, the next line, two "close" lines | Section E |
| 6. Trophies redrawn: the stamp card on top, then the cards with tiers, then the customer and event pages with "Served" and "Seen" | Uses the pictures being drawn |
| 7. Rewards for levels 2 to 10 and for every rank: titles, signboard frames, bell and coin sounds, three price-tag styles, the results stamp | No new pictures. Titles and frames travel in today's "look" message. The other rewards from level 12 up are shown as "coming" and arrive with step 2; because the level is worked out, a player who gets there first receives them the day they ship |
| 8. The looks that exist, made visible: the awning on your shelf, on Home, in the lobby and on the results; your shopkeeper's picture in the Daily market and the Market League | Needs the owner's approval of the mock-up |
| 9. The forgiving streak | Worked out from stored dates |
| 10. The three door-openers in F4 | No shop |

Not touched: the rules, `src/engine` rule code, `RULES.md`, the rules version, the save envelope, the message format, the secret-price check. Rules 18 already makes every phone update, so no player is asked to update twice.

If it must be smaller still: items 1 to 6 and 10 stand on their own. Items 7 to 9 can follow in the next release, but then a level-up has nothing to hand over except a number.

Out of the first version: weekly goal, card backs, table themes, the second and third ticks in the book, lorries, the Daily wins and twists cards, a favourite pattern, any shop.

### After it, in order

1. **Habits:** the weekly goal, Daily wins and twists, the deeper ticks in the book.
2. **Table cosmetics:** card backs from the drafted pictures, table themes, a favourite stall pattern, the remaining level rewards.
3. **Measure:** do players come back on day 7 and day 30 more than before; how many reach levels 5, 10 and 15; which looks are worn. The counters exist for this.
4. **Supporter pack**, only if step 3 shows people returning, together with the privacy, listing and account changes.
5. **The printed game** once the rules 18 kit is proof-printed.
6. Packs or a campaign, by what the numbers and players say.

---

## H. Open decisions for the owner

| # | Decision | Recommendation |
|---|---|---|
| 1 | **The one thing that goes up.** A stall level on a stamp book with six named ranks; or a plain score; or leave trophies flat | The stamp book. The rank names (Roadside Table, Five-Foot Way, Covered Stall, Corner Lot, Shophouse, Towkay) are yours to reword |
| 2 | **How much goes into the rules 18 release.** Only the trophy fixes; or the first version above | The first version, if the Trophies, Wardrobe and Results screens are redrawn in that release anyway; otherwise the fixes now and the rest in the next release |
| 3 | **The promise about money.** What can ever be sold | Write it down now and show it in the app: everything on the ladder is earned by playing; the 8 colours and 6 patterns stay free; anything sold is an extra set of looks; nothing bought changes a rule, a price, the odds or what anyone sees; no ads |
| 4 | **The route to money, and when.** | Nothing now. A supporter pack first, after the counters show players returning; the printed game beside it; no season track. Declare the audience as 13 and over on Play before any sale; accept that buying on the web needs an account |
| 5 | **What counts.** Easy rivals, two-stall Quick games, a phone passed round | Everything counts for stamps and the book: it is the player's own progress. Titles that rivals see for skill (Hard Sweep, Final cash Gold, a shopkeeper's gold ring) need Normal or harder rivals, a Daily market, or a table of people. On a shared phone only the phone's owner counts, as now |

---

## How the numbers were made

- **Method.** Three small scripts, run through `vite-node` against the branch's engine (`src/engine`), computer players (`autoplay`) and the real `evaluate` in `src/ui/achievements.ts`. They read; they change nothing. They are not in the repo.
- **Today's achievements:** 7 tables of 300 games (2, 4 and 6 stalls; 8, 10 and 14 days; Easy, Normal and Hard), 2,100 games.
- **Tier numbers:** 600 Standard games (a Normal and a Hard computer in your seat against three Normal).
- **The ladder:** the proposed tiers that a finished game can show (97 of the 125) and the stamp rules, over 4 runs of 250 games for each stand-in, 2,000 games.
- **Limits.** Computers are not people: they do not chase a goal, do not use Gossip or Scout well and always build the same upgrades. Four runs is few; single figures such as "game 22" move a lot between runs. The 12 minutes a game and the habit stamps are assumptions. No real play time, return rate or audience size was read from the live counters.

## Checks

| Check | Result |
|---|---|
| Code, tests or records changed | NOT APPLICABLE (study only) |
| `npm run verify` | NOT RUN (nothing changed) |
| Computer games for the figures above | Run, 4,700 games, rules version 18 |
| Played by people | NOT RUN |
| Store rules re-read at their source | NOT RUN |
