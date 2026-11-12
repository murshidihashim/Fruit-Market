# Fruit Market · a single-player mode that holds a player (rules version 18)

Study date 2026-11-12 03:06 (Asia/Kuala_Lumpur). Read-only: no code, rule, test or record was changed. This file is the only thing added.

| | |
|---|---|
| Owner's request | "go through the other 2 game modes and help to think of having a killer single player mode to keep players hooked, i feel the other 2 modes doesnt provide anything" |
| What was read | Branch `ccr-d8bcd65d-gblqqb`, game code as last changed by commit `aa5f087` (rules version 18, computer players 6): `src/ui/Home.tsx`, `App.tsx`, `progress.ts`, `store.ts`, `achievements.ts`, `account.ts`, `game/panels/Results.tsx`, `DailyResult.tsx`, `TraitPick.tsx`; `src/engine/daily.ts`, `game.ts`, `data.ts`, `ai.ts`; `src/net/daily.ts`, `looks.ts`, `profile.ts`, `protocol.ts`; `server/meta.ts`, `room.ts`; `RULES.md`, REP-101, REP-105, `docs/studio/review-17/screens/UX-FINDINGS.md`, `docs/ANALYTICS.md`, `docs/privacy.html` |
| How | By reading the code, and by letting computers play about 32,000 games through the real engine (section "How the numbers were made"). Nothing was played by a person. The measuring scripts were kept outside the repo |
| Read with | `PROGRESSION.md` in this folder (stamps, trophy cards, the forgiving streak), `FLOW-AND-MOTION.md` (how long a day takes), DEC-097 (the home screen shows today's market) |
| Status | A study and a proposal. Nothing here is approved or built. Building it needs an approved plan |

## In short

- **The owner is right.** The Daily market and the Market League are both an ordinary game with a label on it. Neither changes what you do, neither gives you anything to keep, and neither gives you a choice.
- **The Daily market** is a full 10-day game (8 or 14 on two days of the week) that you can replay all day on the same shuffle, with the best try counting. Its seven twists take things away or change the length; none adds anything. The only goal is a place on a board that is empty until other people play.
- **The Market League** is six ordinary games in a row. What it stores is one number from 0 to 6. A Normal computer in your seat wins the last stage 17 times in 100, so the League ends in a wall, and after it there is nothing.
- **Recommendation: the Market Month** (a working title). You take a stall through four five-day market weeks on four streets. Each street has a host shopkeeper and a house rule. Rent is due every Friday. What is left goes in a savings tin; when the tin cannot pay, the month is over. Your upgrades and unplayed favour cards stay with the stall.
- **It needs no new rule.** Rent, the tin, the streets and the prizes sit outside the rules engine. The engine needs one small addition to set-up (start a stall with upgrades and cards; build an event deck from chosen cards). A normal game is dealt and played exactly as before.
- **First version:** six streets (the League's six names), four weeks, a choice of street before weeks 2 and 3, a rent table made by computer play, one new screen and small additions to four that exist. With the starting rent table a Normal computer in your seat pays all four rents in 90 months of 100 and a Hard one in 99.
- **The League** is retired into the Month: its streets, its place on Home and its trophy move across. **The Daily market** stays, and is rebuilt on the same five-day format: your first try counts, a par score to beat, a streak that forgives a missed day.

---

## A. The modes today

Home offers: Continue or New game; Play a friend (Create a room, Join with a code, Quick match); the Daily market ticket; the Market League ticket; and Dress up, the account, Trophies, How to play and Settings, which are not ways to play.

Lengths: in the screen audit a scripted player took 41 to 61 seconds a day and 7 to 8.5 minutes for a 10-day game at 4 stalls. A person who reads and thinks takes longer; the audit guessed about twice. Nobody has timed real players.

| Mode | What it is | What is different from a normal game | What you get at the end | What carries over | A session |
|---|---|---|---|---|---|
| **New game** (Home, the black button) | You against 1 to 5 computer stalls, each Easy, Normal or Hard, or friends passing the phone. You choose a name, one of eight shopkeepers (each has a fixed perk) and a length: Quick 8, Standard 10 or Long 14 days. It opens on three rivals (one Easy, two Normal) and Standard | This is the normal game. The switches still exist in the engine (event cards, upgrades, green mangoes, Market Days; Basic game, Fixed prices, Price drift) but the screen stopped showing them in 1.15.0 | Winner, places, a cash chart, "your best moments", new achievements and looks, and "Rematch!" (same table, new shuffle) | Games, wins, best cash, fruit sold; achievements and what they count; looks. One saved game | About 6 to 14 minutes scripted, by length |
| **Play a friend: a room** | 2 to 6 seats of people and computers, joined by a link or a six-letter code. The server runs the game | The host sets the length and how many computer stalls join. Secret prices never leave the server. A computer takes over a seat that stays away | The same results, and "Rematch" | Two achievements (an online win; 10 online matches). The progression study found online games are not added to your games count | A normal game, plus waiting for people |
| **Play a friend: Quick match** | One tap to wait for a stranger. Two stalls, 10 days | No upgrades. It starts when a second person arrives; no computer steps in, so with few people online it may never start (the server keeps a waiting room for up to 10 minutes) | The same results | As a room | A 2-stall game, if it starts |
| **Daily market** (Home, a ticket) | One tap. You against Rosa (Normal), Uncle Benny (Hard) and Ah Chen (Normal), 10 days, on a shuffle fixed by the date, the same for everyone | One of seven twists by the day of the week (below). You are not your shopkeeper: you are dealt three of the eight perks and keep one | The normal results, then "You're #N today", the top five and "Share your result" (a row of coloured squares). The button says "Back to menu" | Your best cash for each date, kept on the phone. Home shows "Today's best: $X" and a streak count. Four achievements (3, 7 and 30 days in a row; a top-ten place) and two looks (Bunting at 3 days, Brass Laurel at 7) | A whole game: about 7 to 8.5 minutes scripted, more for a person; longer on the 14-day day |
| **Market League** (Home, a ticket) | One tap. Six stages, each one game against fixed rivals (below). Win to move on | Nothing but the number and level of the rivals, and 8 days for the first two stages. Every stage is the full game on a random shuffle. You pick a perk from three, as in the Daily | The normal results, one line ("Old Town cleared! Next: Spice Lane" or "win to clear Old Town") and "Next stage" or "Try again" | One number, the stage you are on (0 to 6). After stage 6: one achievement and one hat. Then the ticket reads "Champion! Replay the Royal Market" for good | A whole game for each try |

**The seven Daily twists** (`src/engine/daily.ts`), one for each day of the week: The usual (no change) · Quick day (8 days) · No upgrades · Fixed prices · Calm market (no event cards) · Long haul (14 days) · Basic game (no perks, favour cards, upgrades or standing orders). Four take something away, two change the length, one changes nothing.

**How a Daily score is posted** (`src/net/daily.ts`, `server/meta.ts`): the phone sends the date, your name, your moves and a random key made on the phone. The server plays the game again with its own computer players, so a score cannot be made up. Each device has one line on the day's board, **its best score**. The board keeps the top 100, and there is a new board for each date, each rules version and each version of the computer players.

**The six League stages** (`src/ui/progress.ts`), with how often a computer wins them when it sits in your seat (400 games a stage, this study):

| Stage | Rivals | Days | Normal computer in your seat wins | Hard computer in your seat wins |
|---|---|---|---|---|
| 1 Village Square | Rosa (Easy) | 8 | 77% | 89% |
| 2 Harbour Steps | Ah Chen (Easy) | 8 | 70% | 81% |
| 3 Old Town | Saleh (Normal) | 10 | 52% | 77% |
| 4 Spice Lane | Uncle Benny (Easy), Raj (Easy) | 10 | 62% | 81% |
| 5 Grand Bazaar | Uncle Benny (Normal), Rosa (Normal) | 10 | 36% | 71% |
| 6 Royal Market | Ah Chen (Hard), Saleh (Normal), Raj (Normal) | 10 | 17% | 48% |

At those rates a Normal computer needs about 15 games to clear the League, 6 of them at the last stage. A Hard one needs about 8.

---

## B. Why the two modes do not hold a player

### The Daily market

1. **It is the normal game, and a long one.** Ten days, three rivals, every system. The twists subtract; none shows the player anything a New game does not. Once a week the twist is "The usual".
2. **You can replay the same market all day.** Nothing stops a second tap, the shuffle is the same, and the server keeps your best. From the second try you know every lorry, event and customer. "Same market for everyone" is true only for the first try, and the board rewards whoever replays most.
3. **The goal needs other people.** Home shows "Today's top stalls" only when the board has entries; when nobody has played, the Daily is a ticket with a twist's name on it. There is no par, no medal and no target of your own.
4. **The number means nothing from day to day.** In 56 Daily markets a Hard computer in your seat finished with anything from $29 to $208 (about $92 on a Quick day, $153 on a Long haul day). "Today's best: $96" cannot be good or bad without a board.
5. **You usually lose it.** With Uncle Benny on Hard, a Normal computer in your seat won 6 of 56 Daily markets and a Hard one 26. By that measure most days end with a rival's name in the headline.
6. **You are not yourself.** Home shows your shopkeeper, but the Daily seats a plain one and asks you to "Choose your trait" from three dealt out of all eight, so you can end up with the same perk as a rival (the rules say no two stalls are the same shopkeeper). The progression study found your looks never show there.
7. **What carries over is a count that snaps.** The streak falls to zero on one missed day. The last look comes at 7 days; between day 7 and day 30 nothing happens.
8. **It wipes your game.** One tap replaces a saved game without asking (UX finding 2; `App.tsx` `start()` writes over the one save), and an unfinished Daily then sits in that one slot.
9. **The board keeps starting again.** A new board for every rules version (18 so far) and computer version (6 so far), and an unfinished Daily from before an update is dropped.

### The Market League

1. **Six ordinary games.** `leagueConfig` sets the full game for every stage. The studio's design review proposed "one system per stage"; it was never built. Stages 1 to 3 are two-stall games, the thinnest table the game has.
2. **One number of progress.** No stars, no best score, no going back to a stage, nothing shown for stages 1 to 5. The whole League is worth one achievement and one hat.
3. **A wall at the end.** The code's own note gives win rates measured under rules version 3 (64, 64, 52, 41, 33, 20%). Under rules 18 they are 77, 70, 52, 62, 36 and 17%. Losing costs a whole game and gives nothing: "Try again" deals a new shuffle and teaches nothing about the last one.
4. **Nothing to choose.** No route, no reward to pick, no way to make the next stage easier or harder.
5. **Nothing after.** A champion is offered the Royal Market again, for ever.
6. **The rivals are faces, not characters.** `src/engine/data.ts`: "their buying and pricing come from the difficulty level, not from these personalities". Saleh in Old Town plays like Raj in Spice Lane.
7. **Nobody can tell whether it is played.** A League game is counted as `game_start:solo`. The same silent replacing of a saved game applies.

### What they share

Both give the player nothing to **decide** outside the game (no route, no stake, no reward to pick), nothing to **keep** from one sitting to the next except a count, and nothing **new to see**. A New game does all they do, with your own shopkeeper and without the wait for a board.

---

## C. Four concepts

### C0. What the engine makes cheap, and what is expensive

| | What | Cost |
|---|---|---|
| Free today | **The same market again from a seed.** A whole Daily market is played by computers in about 0.1 to 0.15 seconds on the study machine, so a par score or a rent table can be made by playing | A set-up |
| Free today | **The table:** 2 to 6 stalls; each rival is one of eight shopkeepers with its perk; Easy (remembers nothing its rivals bought, buys loosely), Normal (remembers today's purchases) or Hard (remembers everything, guesses rivals' prices) | A set-up |
| Free today | **Any length.** Five days gives one Market Day (day 3: a standing order due on day 5, an upgrade that evening) and a Closing Day | A set-up |
| Free today | **Seven switches:** event cards, upgrades, green mangoes, Market Days, Basic game, Fixed prices, Price drift | A set-up |
| Free today | **The content:** 20 events, 5 guests, 20 lorries, 36 customers, 6 favour cards, 5 upgrades, 8 standing orders, 8 perks | None |
| Free today | **Reading a finished game.** Every sale of every day is kept (`history`), which is how achievements work. Goals, stars and rent can be checked without touching a rule | Code outside the engine |
| Small | **Set-up additions:** start a stall with upgrades built or favour cards in hand; build the event deck (or the lorry deck) from chosen cards; say who buys first on Day 1. Optional fields that a normal game never sets | A test that a normal game from the same seed is dealt and played exactly as before. Then no rules version bump |
| Expensive | **Anything that changes what happens inside a day:** new perks, favour cards, upgrades or event effects; a second perk; a third upgrade space; rent inside the engine | A rules version bump, a balance study, every phone updates, saved games set aside, the Daily board starts again |
| Expensive | **Rivals that play in character** | A computer-player change: the same costs, plus a new balance check of every shopkeeper |
| Expensive | **Hand-made markets that rely on a shuffle** | They change whenever the rules or the computers change (18 and 6 times so far) and must be made again |

### C1. The Market Month: a run with rent

| | |
|---|---|
| Pitch | You take a stall through a month: four five-day markets on four streets, each with a host shopkeeper and a house rule. Rent is due every Friday; what is left goes in your savings tin, and the month ends when the tin cannot pay |
| A session | One market week, Monday to Friday |
| A run | Four weeks. Before weeks 2 and 3 you choose between two streets shown as posters: host, house rule, rent, prize. Your upgrades and unplayed favour cards stay with the stall. Finish ahead of the host and you take the host's card and a ribbon |
| The long game | A ribbon from every host. A finished month with each of the eight shopkeepers. A bigger tin (bronze, silver, gold). Later, a second grade with higher rents |
| Reused | The whole engine, the eight shopkeepers, the computers, the League's street names, the results screen, trophies, looks, saves |
| New | The month's bookkeeping (plain code outside the engine), the small set-up addition, six street definitions, a rent table made by a script, one new screen (the month board) and additions to four that exist |
| New rules? | No. Set-ups and goals only |
| On a phone | A five-day week is about 3.5 to 5 minutes of play for a scripted player, so perhaps 6 to 10 for a person. A month is four such sittings. Not timed with people. A market week is five game days and has nothing to do with the calendar: no clock runs, nothing expires, and a month can be left for weeks and picked up again |
| Why replay | A new shuffle every week; a different pair of streets; eight shopkeepers; what you carry changes the next week; a lost month costs minutes, not an evening; a tin to beat |
| Trophies and looks | In the progression study's terms: a "Market Month" card in place of the "Market League" card (pay two rents; finish a month; finish with $100 in the tin), a "Street hosts" card (2, 4, 6 ribbons) and an "Every shopkeeper" card (1, 4, 8 finished months). A rent paid counts as a win for stamps. Looks: the Chairman's Top Hat for a finished month (it is the League's today); each ribbon worn as a badge; a title for gold, which is words only |
| Effort | Medium for the first version; large for the whole idea |
| Risks | The rents come from computers, not people. A five-day market has never been played by people. Under today's rules a stall is "finished" after two upgrades, so the stall stops growing in week 3. The rent table must be made again after every rules change |

### C2. Shopkeepers' Streets: the League rebuilt as a ladder of hosts

| | |
|---|---|
| Pitch | Eight streets, each the home of one shopkeeper who sets a house rule. Beat the host on their own street for up to three stars |
| A session | One short market (5 or 8 days) against the host and one other stall |
| A run | None: each street stands alone |
| The long game | 8 streets × 3 stars. One star for finishing ahead of the host, two for winning the street, three for winning it the hard way (nothing spoiled, or by $15) |
| Reused | Everything. House rules come from the switches and the set-up addition |
| New | A street list, star checks read from the finished game, stars stored for each street |
| New rules? | No |
| On a phone | About 3.5 to 8 minutes scripted, by length; more for a person |
| Why replay | Until the 24 stars are won. Little after that |
| Trophies and looks | A look for each host beaten; a title for 24 stars |
| Effort | Small |
| Risks | It is the League with stars. Without rivals that play in character (expensive), eight streets are the same game eight times |

### C3. Market Lessons: hand-made scenarios with stars

| | |
|---|---|
| Pitch | Twelve to twenty short hand-made markets, each built round one trick of the game, with one-, two- and three-star goals. It teaches what the tutorial does not: how to win |
| Examples | "The shut crate": Uncle Benny bought three mangoes on Monday; price your watermelons. "Green Monday": buy for Wednesday's Influencer. "A dollar under": win three sales by exactly $1. "Friday": end the week with an empty shelf. "The order": win the bid and deliver it in full |
| A session | One lesson of 2 to 4 days |
| A run | Chapters: Timing, Nerve, Reading the crates, Cards |
| The long game | Three stars on every lesson. Then nothing, until more lessons are made |
| Reused | The engine, the computers, the results |
| New | The largest set-up addition (a fixed order of lorries, customers and events; a starting shelf), a goal checker, a lesson list, and the lessons themselves, each written, tuned and checked |
| New rules? | No. But every lesson rests on exactly what a shuffle deals and how the computers answer it |
| On a phone | About 1.5 to 4 minutes scripted; more for a person. The shortest sitting of the four |
| Why replay | To three stars. It is used up once |
| Trophies and looks | Stars unlock looks at 10, 20, 30 |
| Effort | Large, most of it writing and tuning |
| Risks | Fragile: every rules or computer-player change can break a lesson. The game has changed rules 18 times |

### C4. The Daily Week: a better Daily

| | |
|---|---|
| Pitch | One five-day market a day, the same for everyone, played as the shopkeeper of the day. Your first try counts, the target is par (what a Hard computer made in your seat on that market), and the streak forgives a missed day |
| A session | One a day |
| A run | The week: a mark for each day played |
| The long game | Total days, medals, the forgiving streak, the board |
| Reused | The date seed, the server's replay check, the board, the share squares |
| New | Five days; a real shopkeeper, so no perk pick; a street of the day in place of the seven twists; par worked out on the phone by letting a Hard computer play your seat; the server keeps a device's first score, not its best; the streak rule from the progression study |
| New rules? | No. Phone and server must update together, as for any rules change |
| On a phone | As a Market Month week: perhaps 6 to 10 minutes. Working out par on a real phone is NOT RUN |
| Why replay | Once a day by design |
| Trophies and looks | The progression study's Habits cards as they stand |
| Effort | Small |
| Risks | It is a habit, not a mode: one market, then nothing to do. Par swings with the deal. A board still needs players |

### Side by side

| | Something at stake | Something kept | Something chosen | Replay | New rules | Effort |
|---|---|---|---|---|---|---|
| C1 Market Month | Rent, every week | The stall, the tin, ribbons | The street | High | None | Medium, then large |
| C2 Shopkeepers' Streets | A star | Stars | Which street | Low | None | Small |
| C3 Market Lessons | A star | Stars, and skill | Which lesson | Used up once | None, but fragile | Large |
| C4 Daily Week | Par, once a day | Days, streak | Nothing | Daily | None | Small |

---

## D. Recommendation: the Market Month

Build C1. Put C2 inside it (every street has a host and a house rule). Build C4 beside it on the same five-day format (section E). Keep C3 for later: once the Month exists, a lesson is a one-week Month with a fixed shuffle.

### D1. Why it fits this game

- **Bluffing prices.** Against computers, coming second by $5 costs nothing. With rent, the bell has a number on it: "$9 short, two days left". Hold the watermelon at $7 or drop to $5 and be sure? That is the question the rules call the heart of the game, and now a wrong answer has a price.
- **Spoilage.** A week ends every fifth day. Fruit unsold on Friday is jam at $1. An apple's six days outlast the week; a green mango bought after Wednesday never ripens in time. The crunch a Standard game has once, a month has four times. Spice Lane is the street where fruit rots: computers lost 0.3 to 0.4 pieces a week there, against under 0.1 on every other street.
- **Reading rivals.** A street has the same host every time, with a perk and a house rule that suit each other: Pak Din's shade cloth in a hot spell, Saleh's $15 where every price is fixed. What you learn about a street stays learnt. Rules 18 keeps today's purchases on show until the bell, so two rivals over five days is a table a person can read on a phone.
- **The owner's words.** Something at stake (the rent), something kept (the stall and the tin), something chosen (the street), and a reason to start again (ribbons, eight shopkeepers, a medal).
- **The project.** No new rule and no balance study of the base game. The engine's seeds make the rent table a script, not a guess.
- **The progression study's "what to avoid".** No lives, energy or timers: a lost month can be started again at once, and nothing is taken away for staying away.

### D2. The first version: exact content

**The month in eight lines**

1. Pick your shopkeeper. The perk is yours all month.
2. A month is four market weeks. A week is a five-day game, Monday to Friday. Wednesday is the Market Day (a standing order; an upgrade that evening). Friday is Closing Day (customers pay $1 more; the jam maker buys what is left).
3. Week 1 is Village Square. Before weeks 2 and 3 you choose one of two streets, drawn from the four middle streets; no street comes twice. Week 4 is the Royal Market.
4. Every stall opens every week with the usual $10 and an empty shelf (Saleh's Nest Egg still makes his $15).
5. On Friday night your takings (your cash above $10) go into the savings tin and the rent comes out of it. The tin starts the month with $10 in it.
6. If the tin cannot pay, the month ends. There is no second try at a week; a new month is a new shuffle.
7. Your stall keeps its upgrades (room for two, as always) and the favour cards you did not play (up to three; four for Ah Chen).
8. Finish the week ahead of the host: take the host's card into next week if your hand has room, and that street's ribbon.

The tin after the fourth rent is your score: bronze for finishing, silver at $60, gold at $100.

**The six streets.** If you are playing the host's own shopkeeper, Raj hosts instead. Other rivals are drawn from the shopkeepers not in use.

| Street | Week | Host and perk | Rivals | House rule, and how it is made | Rent | Host's card |
|---|---|---|---|---|---|---|
| Village Square | 1 | Kiki, Tip Jar | Host and one other, both Easy | **Calm week:** no event cards (the existing switch) | $15 | Gossip |
| Harbour Steps | 2 or 3 | Uncle Benny, Big Basket | Host Normal and one Easy (week 2) or one Normal (week 3) | **Festival week:** the event deck is Festival, Tourist Bus, Kenduri, Hotel Order, Bake-Off, Superfood Trend, Pasar Malam | $40 / $46 | Free Fruit |
| Old Town | 2 or 3 | Saleh, Nest Egg | As Harbour Steps | **Fixed prices:** every customer pays the street price (the existing switch) | $32 / $38 | Priority |
| Spice Lane | 2 or 3 | Pak Din, Shade Cloth | As Harbour Steps | **Hot spell:** the event deck is two Heatwaves, Health Inspector, Bad Harvest, Lorry Breakdown, Price Hike, Apple Blight | $24 / $30 | Fridge |
| Grand Bazaar | 2 or 3 | Rosa, Haggler | As Harbour Steps, plus a third rival (Easy): four stalls | **Crowded street:** four stalls, the full event deck | $32 / $38 | Favoured Trade |
| Royal Market | 4 | Ah Chen, Charmer | Host Hard and two Normal: four stalls | **The big one:** the full event deck | $42 | (the month ends) |

Most hosts' cards echo their perk: Rosa wins ties, Pak Din keeps fruit fresh, Saleh buys first, Uncle Benny takes an extra piece. Every card, event and switch in this table exists today.

### D3. What computers make of it

Takings in one week (cash above $10), nothing carried, 240 games a row. "Ahead of host" is how often the stand-in finished the week above the host.

| Street and week | Normal in your seat: low (1 in 10) · middle · high (1 in 10) | Hard in your seat: middle | Ahead of host: Normal · Hard |
|---|---|---|---|
| Village Square, 1 | $19 · $41 · $60 | $48 | 75% · 89% |
| Harbour Steps, 2 | $30 · $52 · $72 | $61 | 63% · 77% |
| Harbour Steps, 3 | $28 · $47 · $68 | $59 | 54% · 75% |
| Old Town, 2 | $22 · $42 · $63 | $53 | 47% · 64% |
| Old Town, 3 | $21 · $39 · $60 | $49 | 35% · 61% |
| Spice Lane, 2 | $14 · $34 · $57 | $44 | 59% · 72% |
| Spice Lane, 3 | $15 · $32 · $52 | $39 | 50% · 74% |
| Grand Bazaar, 2 | $18 · $42 · $64 | $51 | 61% · 77% |
| Grand Bazaar, 3 | $15 · $41 · $66 | $50 | 61% · 79% |
| Royal Market, 4 | $14 · $33 · $54 | $44 | 21% · 47% |

Whole months with the rents above, 400 months each:

| | Normal computer in your seat | Hard computer in your seat |
|---|---|---|
| Pays all four rents | 90% | 99% |
| Out in week 1 · 2 · 3 · 4 | 1% · 2% · 2% · 5% | 1% · 1% · 0% · 0% |
| Tin of those who finish: lower quarter · middle · upper quarter · top tenth | $31 · $55 · $83 · $110 | $66 · $88 · $113 · $131 |
| Hosts beaten in a month | 2.2 of 4 | 2.9 of 4 |

So silver ($60) falls to fewer than half of a Normal computer's finished months and gold ($100) to between one in ten and one in four; a Hard computer takes gold in between a quarter and a half.

Two other settings were measured, for the owner's choice of how hard the first month should be:

| Setting | Normal pays all four | Hard pays all four |
|---|---|---|
| The rents above, with an empty tin at the start | 79% (7% out in week 1) | 97% |
| Rents about a tenth higher ($22; $42/$47, $34/$39, $26/$32, $32/$40; $42), empty tin | 66% (13% out in week 1) | 91% |

What carrying things is worth in one week, to a Normal computer (200 games a row): a Premium Display about $7, an Order Book $4, a Juice Bar $4, a Ripening Room $3, a Handcart $2; a Free Fruit card $8, Favoured Trade $2, Fridge $2, the others nothing a computer can use (a dollar or two either way is within chance). Opening with more than $15 adds nothing ($39 a week at $10, $42 at $15, $42 at $30), which is one reason cash goes to the tin and not into next week's cash box. The other: the poorest stall buys first, and a stall that carried its cash would rarely be the poorest.

**How to read these.** A Normal computer is not a beginner. `RULES.md` gives about $90 as the average finish of a 10-day computer game; the screen audit's simple scripted player finished its two (under rules 16 and 17) with $68 and $70. My estimate, not a measurement: a newcomer reaches week 4 most months and the Royal Market decides it; a practised player finishes nearly every month and plays for the medal and the ribbons. If a playtest finds it too gentle, the tighter table is ready.

### D4. Screens

One new screen (item 2, which is also item 5). The rest are additions to screens that exist.

1. **Home.** The Market League ticket becomes the Market Month ticket: "Week 2 of 4 · Spice Lane · rent $24", or "Four streets. Rent every Friday." when no month is running. DEC-097's swipe row can take a "your month" page later; its review trigger names this proposal.
2. **The month board (new).** The four weeks as a strip of tickets (paid, this week, to come), the tin, what your stall carries, your ribbons. When a choice is due: two street posters (host's picture, house rule in one line, rent, prize) and one black button, "Open on Monday". A new month starts here with the shopkeeper picker that New game already has.
3. **In the game (the table as it is).** A rent chip in the top bar ("Rent $24 · takings $13"). One line on the morning card and in the day's takings ("$11 to go, 2 days left"). The house rule in today's news. No new panel.
4. **Friday (inside the results screen, where the League line and the Daily board sit today).** Rent paid or short; what went into or came out of the tin; host beaten: the ribbon and the card; then "Next week" or "See your month".
5. **The end of a month (the board, finished).** The four weeks, the tin, the medal, ribbons, new trophies, "Start a new month".
6. **Trophies.** A Market Month panel in place of the League list: best tin, months finished, ribbons, shopkeepers.

### D5. What is stored

- **`fm.month` (new, on the phone):** one small record with its own version number: the month's seed, your shopkeeper, the week, the tin, carried upgrades and cards, the streets played, the two on offer, this month's ribbons.
- **`fm.save.month` (new):** the week being played, in the same envelope as today's saved game (save version, rules version, computer version, game). The ordinary slot `fm.save` is not touched: old saves load as they do now, and a New game, a Daily or an online game can never replace a month's week, nor the other way round. After a rules change the unfinished week is set aside, as any game is, and the month offers that week again on a new shuffle.
- **In a game's set-up (optional, absent from every normal game and every old save):** a month tag (street and week, as `league` is today), a list of event cards for the deck, and what a stall starts with.
- **Long-term, in what an account already carries:** two new sets beside the eight in `fm.prog` (hosts beaten; shopkeepers who finished a month) and "month" among the modes finished. Two new numbers (best tin, months finished) join the profile; a profile without them reads as zero.
- **Sent anywhere:** nothing, except three anonymous counters if the player shares stats: a month's week started, a week reached, how a month ended. No name, no ID, no board in the first version.

Constraints kept. **Anonymous play:** nothing about a person leaves the phone; the counters fit the format `docs/ANALYTICS.md` already allows, and that file and the privacy page gain a line each. **Saves:** the envelope and the ordinary slot are unchanged, so old saves keep loading. **Online fairness:** rooms and the Daily never set the new fields, so the server's games and its replay check are untouched; the Month has no board, so there is nothing to cheat. **No new dependency.**

### D6. What is tested

1. **A normal game is unchanged.** For 50 seeds at 2, 3, 4 and 6 stalls, the finished game is identical before and after the set-up addition. The 518 existing tests pass, the Daily replay test among them.
2. **The set-up addition.** Carried upgrades and cards are on the stall on Day 1; the favour deck holds 12 less the carried cards; a chosen event deck turns only its own cards, also after a reshuffle; the Health Inspector still never comes on the last day and Mango Craze never on day 2.
3. **The month's bookkeeping** (plain functions, no screen): rent arithmetic; the tin pays a shortfall; the month ends when it cannot; ahead of the host gives the card and the ribbon; the hand limit holds; no street comes twice; Raj hosts when you are the host; a week's shuffle is fixed when the week starts.
4. **Storage.** The month record survives a save and a load; an unreadable one is dropped with a notice, never a crash; every existing test in `tests/store.test.ts` still passes; the two save slots never touch each other.
5. **The rent table.** A script in `scripts/` (run like `npm run balance`) plays whole months with computers and prints the table in D3. It is run again after every rules or computer-player change, and its result goes in the report.
6. **In a browser.** A scripted player starts a month, plays week 1 to Friday, sees the rent paid, picks a street, quits and resumes. Screenshots at 360x640 and 390x844.
7. **Trophies and the account.** The new checks are tested like the present ones; a profile with and without the new fields merges; names kept in sets have no spaces (see "Found in passing").
8. **With people.** Whether rent feels fair and whether five days is the right week cannot be tested by a machine. A playtest is required before any readiness claim.

### D7. Left out of the first version

A harder grade (higher rents). More than two posters. A third upgrade space as a prize, and any other new card (rule changes). Hosts that play in character (a computer-player change). A board for the month. Market Lessons. New pictures: the first version needs none, apart from six small ribbons that can be drawn in the stylesheet.

---

## E. The Daily market and the Market League

| Mode | Verdict | Why | How |
|---|---|---|---|
| **Market League** | **Retire it into the Market Month** | It stores one number, plays six ordinary games and ends in a wall. Everything it stands for (streets, named rivals, a champion) the Month does with a stake and a choice. Two solo ladders would split the home screen and the players | The six street names become the Month's streets and the League ticket becomes the Month's. The "League Champion" achievement and the Chairman's Top Hat are earned by finishing a month; players who already have them keep them, under the same code name. The stored stage number is left in place and no longer shown, so old accounts and old versions of the app still read it. A League game in progress still loads and can be finished as an ordinary game. "Market Explorer" counts a Month week where it counted a League game |
| **Daily market** | **Keep it, and rebuild it as the Daily Week (C4)** | It is the one mode that is the same for everyone, the checked board and the share squares already work, and DEC-097 has just put today's market at the top of the home screen. As it stands that top spot leads to the weaker mode | **Now, with rules 18:** ask before replacing a saved game (defect 2 in REP-101). **With the Month, or straight after:** five days; the shopkeeper of the day; the street of the day in place of the seven twists; the first try counts and later tries are marked practice; par and three medals; the forgiving streak. **Then:** read the counters (`game_start:daily` against `solo`) and retire it only if it stays unused |

Nothing a player has is lost by either change: the best cash for each date, the streak dates and every achievement stay where they are.

---

## F. Open decisions for the owner

| # | Decision | Recommendation |
|---|---|---|
| 1 | **Which mode.** The Market Month, Shopkeepers' Streets, Market Lessons, or only a better Daily | The Market Month, with the hosts and house rules of Shopkeepers' Streets inside it. The name is a working title and yours to change |
| 2 | **How hard the first month is.** Gentle (a Normal computer finishes 90 in 100), middle (79) or tight (66) | Gentle. A first month should usually reach the Royal Market. Add the tight table as a second grade once people finish the first |
| 3 | **What stays with the stall, and the engine addition it needs.** Upgrades and unplayed favour cards stay; cash goes to the tin | Approve the small set-up addition, with the test that a normal game is unchanged and so no rules version bump. Carried cash was measured and adds nothing; it would also mean you are rarely the poorest stall, and the poorest stall buys first |
| 4 | **The League and the Daily.** Keep them as they are, merge them into the new mode, or retire them | Retire the League into the Month. Keep the Daily and rebuild it as the Daily Week, in the same release if there is room, otherwise the next |
| 5 | **When.** Inside the rules 18 release, or as the release after it | The release after. The rent table must be made on final rules 18 numbers (REP-105's three balance choices change takings), the new screens should be drawn in the card and screen design now being approved, and rules 18 has not yet been played by people |

---

## Found in passing

- **Account sync drops trophy progress that has a space in its name.** For a signed-in player, "Uncle Benny", "Ah Chen" and every customer and guest whose saved name has a space are removed from the saved sets at every sync, so Rival Roll Call, The Whole Town and Red Carpet cannot be completed on an account. Checked by running the profile clean-up on such a set. Not part of this study; raised as a separate task.
- In the Daily and the League a player can be dealt, and keep, a perk that a rival already holds.
- The comment above `LEAGUE` in `src/ui/progress.ts` still gives win rates from rules version 3.

---

## How the numbers were made

Throwaway scripts, run with `vite-node` on the branch above, importing the real engine. They are not in the repo: this study adds one file, and scripts under `docs/` would be picked up by the lint check. A proper script belongs in the build (D6, item 5).

- **The League:** each stage's own set-up, with a computer in the player's seat; 400 games a stage at Normal and at Hard. The stand-in takes the first of its three perks, where a person chooses.
- **The Daily:** the 56 Daily markets from 1 November 2026, with a computer in the player's seat. The time for a game is from the same run.
- **Market weeks:** five-day games at the tables in D2; 240 games a row (200 a row for what carrying things is worth, on a three-stall week against two Normal rivals with the full event deck); the stand-in plays each of the eight shopkeepers in turn. A chosen event deck was made by replacing the shuffled deck after set-up; carried upgrades and cards were put on the stall after set-up.
- **Months:** 400 months at each level for the starting table, with and without $10 in the tin; 300 for the tighter table. The stand-in takes the first of the two streets on offer, keeps its upgrades and unplayed cards, and gets the host's card when it finishes ahead.

Limits. Computers are not people: they do not bluff, never play Scout and barely use Gossip (REP-105). A computer buys an upgrade as if the week were the whole game, so it values a carried stall less than a person would. Each figure is one run: with 240 to 400 games a percentage is good to about 4 to 6 points either way. The lengths of a sitting are worked out from the audit's scripted player and were not timed.

## Checks

| Check | Result |
|---|---|
| Every way to play read in the code | PASS (files listed at the top) |
| League, Daily, market-week and month runs with computer stand-ins | PASS (ran to the end, no engine error; figures in A and D3) |
| The account's profile clean-up run on a set with spaces | PASS (ran; it drops them, see "Found in passing") |
| Anything played by a person | NOT RUN |
| Anything looked at in a browser | NOT RUN |
| The live counters read (how many play the Daily) | NOT RUN (no access; the League has no counter of its own) |
| Par worked out on a real phone | NOT RUN |
| `npm run verify` | NOT RUN (no code, test or record was changed) |
