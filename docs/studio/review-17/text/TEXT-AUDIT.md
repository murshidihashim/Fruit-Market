# Fruit Market · text audit

Every piece of text a player can read on a card, on a screen or on a printed sheet, with a verdict and a proposed replacement. Read-only audit of branch `ccr-d8bcd65d-gblqqb`; nothing in the repo was changed.

## How to read this

- **One row per string.** `File:line` is where it is in the code; "Where shown" is where the player meets it.
- **Current text** is copied exactly from the code, so it sometimes carries code around the words: `${...}` is a value filled in during play, `<b>...</b>` is bold.
- **Verdicts:** KEEP (leave it), CUT (remove it), REWRITE (replace with the proposed text), CORRECTNESS (the text is wrong or unclear against RULES.md or the game itself; these are also listed together below), UNUSED (in the code, but no screen shows it).
- **Flavour lines** (customer quirks, event headlines, shopkeeper quips and speech, standing-order quirks, lorry names, achievement names, League stage names) carry two options: **A** cut it, **B** one short plain line. The recommended one is in bold.
- The meaning of every rule is unchanged by every REWRITE. Where a card and the game disagree, the row is CORRECTNESS and says which one the proposal follows.
- Companion files: `text-changes.json` (every CUT, REWRITE and CORRECTNESS row, for applying later), `SAMPLES.md` (20 before and after pairs), `GLOSSARY.md` (the words chosen, and every place a second word is used).

## Counts

| Group | Strings | Keep | Cut | Rewrite | Correctness | Words before | Words after |
|---|---|---|---|---|---|---|---|
| Cards (app and print share this text) | 456 | 194 | 99 | 158 | 5 | 2235 | 1690 |
| App screens | 861 | 582 | 34 | 227 | 18 | 5230 | 4938 |
| Print-only sheets and guidebook | 215 | 190 | 1 | 13 | 11 | 4505 | 4520 |
| Spoken labels and tooltips | 104 | 95 | 0 | 9 | 0 | 402 | 401 |
| **All audited text** | **1636** | **1061** | **134** | **407** | **34** | **12372** | **11549** |

Cards and app screens together (what a phone player reads): 1317 strings, 7465 words before, 6628 after. A further 83 strings are in the code but shown on no screen; they are marked UNUSED (most are in the last section) and not counted. Word counts are approximate: they are taken from the code text, with each filled-in value counted as one word.

## Contents

- What makes the text read as machine-written
- Whole elements that could go
- Before any of this is applied
- Correctness issues
- [Cards · fruit and freshness types](#cards--fruit-and-freshness-types) · 21 strings, 5 to change
- [Cards · customers (36)](#cards--customers-36) · 72 strings, 32 to change
- [Cards · guests (5)](#cards--guests-5) · 23 strings, 10 to change
- [Cards · events (20)](#cards--events-20) · 167 strings, 92 to change
- [Cards · lorries (20)](#cards--lorries-20) · 20 strings, 12 to change
- [Cards · favour cards (6)](#cards--favour-cards-6) · 12 strings, 5 to change
- [Cards · upgrades (5)](#cards--upgrades-5) · 10 strings, 5 to change
- [Cards · shopkeepers (8): names, perks, quips and what they say in the rush](#cards--shopkeepers-8-names-perks-quips-and-what-they-say-in-the-rush) · 115 strings, 93 to change
- [Cards · standing orders (8)](#cards--standing-orders-8) · 16 strings, 8 to change
- [Screen · home](#screen--home) · 55 strings, 8 to change
- [Screen · new game (and passing the phone)](#screen--new-game-and-passing-the-phone) · 37 strings, 5 to change
- [Screen · shown all through a day (top bar, rivals, Wholesale Market, your shelf, pause menu)](#screen--shown-all-through-a-day-top-bar-rivals-wholesale-market-your-shelf-pause-menu) · 58 strings, 19 to change
- [Screen · morning](#screen--morning) · 16 strings, 7 to change
- [Screen · bidding for a standing order (Market Day morning)](#screen--bidding-for-a-standing-order-market-day-morning) · 12 strings, 5 to change
- [Screen · buying](#screen--buying) · 6 strings, 5 to change
- [Screen · stocking](#screen--stocking) · 19 strings, 10 to change
- [Screen · the bell (setting secret prices)](#screen--the-bell-setting-secret-prices) · 24 strings, 13 to change
- [Screen · the rush](#screen--the-rush) · 58 strings, 32 to change
- [Screen · sales summary (end of the rush)](#screen--sales-summary-end-of-the-rush) · 32 strings, 18 to change
- [Screen · evening](#screen--evening) · 11 strings, 5 to change
- [Screen · night](#screen--night) · 10 strings, 3 to change
- [Screen · results (end of the game)](#screen--results-end-of-the-game) · 42 strings, 13 to change
- [How to play (7 slides)](#how-to-play-7-slides) · 57 strings, 30 to change
- [Tutorial tips (first game)](#tutorial-tips-first-game) · 20 strings, 13 to change
- [Settings and account](#settings-and-account) · 64 strings, 6 to change
- [Trophies: achievements (44)](#trophies-achievements-44) · 110 strings, 45 to change
- [Daily market](#daily-market) · 22 strings, 5 to change
- [Market League](#market-league) · 9 strings, 1 to change
- [Wardrobe](#wardrobe) · 45 strings, 1 to change
- [Online (play a friend, quick match)](#online-play-a-friend-quick-match) · 74 strings, 20 to change
- [Errors and refusals during a game](#errors-and-refusals-during-a-game) · 79 strings, 14 to change
- [Web page and install name](#web-page-and-install-name) · 8 strings, 1 to change
- [Print only · stall sheet and counter (update pack)](#print-only--stall-sheet-and-counter-update-pack) · 25 strings, 1 to change
- [Print only · change sheet (update pack)](#print-only--change-sheet-update-pack) · 21 strings, 0 to change
- [Print only · standing-order card (update pack)](#print-only--standing-order-card-update-pack) · 11 strings, 1 to change
- [Print only · rules guidebook (update pack)](#print-only--rules-guidebook-update-pack) · 120 strings, 7 to change
- [Print only · card faces and player aid in the older print kit (scripts/print-deck.ts)](#print-only--card-faces-and-player-aid-in-the-older-print-kit-scriptsprint-deckts) · 39 strings, 16 to change
- [Lower priority · spoken labels (aria-label) and tooltips (title)](#lower-priority--spoken-labels-aria-label-and-tooltips-title) · 104 strings, 9 to change
- [Text in the code that no screen shows](#text-in-the-code-that-no-screen-shows) · 75 strings, 0 to change

## What makes the text read as machine-written

The same few habits repeat across cards and screens. Seeing them named makes the proposals easier to judge.

1. **One joke shape, many times.** Eight customers "do X to every fruit" (reads the label on every blueberry, measures every watermelon, photographs every mango, paints every mango, inspects every fruit, sprinkles petals on every watermelon, rings a bell for every watermelon, cheers every mango).
2. **A headline for everything.** All 20 events carry an exclaimed tabloid line ("Melting weather, sizzling sales!") on top of a title, and the printed card adds a subhead and a caption that describes its own picture.
3. **A catchphrase for every character.** Each shopkeeper has a quip and ten lines built on one trait word (Raj says "luck" or "lucky" in 6 of his 10 lines; Kiki says "thank you"; Farah says "heard").
4. **Exclamation marks.** 111 of the audited strings carry a "!". After the proposals 3 do: "The bell!", "YOU WIN!" and the invitation a player sends to a friend.
5. **Paired and three-part rhythm.** "Big crowds, bigger spending", "Four fruits, four personalities", "Never the best price, never a loss", "Coins, cards and cheers", "Flips a mango, catches it, pays for it".
6. **Winks at the player.** "Psst… the rivals are plotting tonight too", "No peeking!", "Do not ask what is in it", "Sorry, not sorry!".
7. **Saying it again.** The rule "rivals see how many pieces, not which fruit" is written out in ten places in the app; "Most cash wins" three times in How to play.
8. **Leftovers from earlier versions.** Lines that fit an earlier cast of animals and creatures ("Squawk!", "You beat the old tortoise", "Little bird told me", "RAWR"), and rules that have since changed (customers who wait overnight, three upgrades, 13 events, 4 players).

## Whole elements that could go

Not rewrites: things that could be removed outright. Each is a row (or a group of rows) in the tables below.

| What | Where | Why it is not needed |
|---|---|---|
| The flavour headline on all 20 events, and "Clear skies, business as usual!" on a Calm Day | Morning news; printed event card | The title says it. The printed card also has a subhead. |
| The caption under the picture on all 20 printed event cards | Printed event card | It describes the picture above it. |
| "Extra!" seal and "Morning edition · One cent" | Printed event card, front and back | Newspaper dressing. |
| The customer's words in quotes ("Yum!", "Lovely!", "Waste of a trip!"), 11 lines | Rush pop-up | The pop-up already has a result line, a detail line and a tag on every stall. Two of the lines are sometimes untrue. |
| 48 of the 80 lines rival shopkeepers say | Speech tag in the rush | One line per shopkeeper per situation is enough; several are animal lines, and many say "you" when someone else won. |
| The 8 shopkeeper quips | Under the picker; printed stall sign | The sign shows name, picture, perk and rule. |
| "Psst… the rivals are plotting tonight too." | Evening panel | Tells the player nothing. |
| The stamp "FINAL DAY!" / "FINAL 3 DAYS" | Across the table for one second | The top bar shows the countdown all day. |
| The 8 emoji in front of sales highlights, and the highlight "N of your fruit will spoil tonight" | Sales summary | No other screen has emoji; the spoil warning is already on the line above. |
| "Rosa is buying" beside "Rosa is shopping…"; "2 more allowed" beside "2 of 4 bought"; "Night falls…" under "Night falls"; "Bought!" | Buying and night screens | The same fact twice at the same moment. |
| The note under the stocking rows; the first sentence of the note under the prices; the second paragraph of the lane pop-up | Stocking, price and help pop-ups | All three restate "rivals see how many, not which fruit", which the heading, the tutorial tip and How to play already say. |
| The tutorial tip "Pick a perk" | First morning | The card under it says the same sentence. |
| The "Tip:" sentence on the Juice Bar card | Upgrade card | Strategy advice on a rules card, and it makes this the longest card text. Owner's call: it was added on purpose (REP-089). |
| Grey "Your name" inside the name box; "Account" heading inside the Account pop-up | New game, online, account | The heading above already says it. |
| The Continue pop-up (Continue, then Resume) | Home | A second tap to do what the first button said. Not a text change; noted for the flow. |
| The three choices on the online screen after choosing one of the same three in the Play a friend pop-up | Home, online | The player chooses twice. Not a text change; noted for the flow. |
| One of the two share buttons and one of the two home buttons | Results after a Daily market game | Two buttons each do the same thing. |
| The tagline under the title | Home | Optional; a plain line is offered. |

## Before any of this is applied

- **Nothing here is approved.** These are proposals for the owner. The engine files (`src/engine/*`) and RULES.md are on the "preserve" list, so wording changes there belong in an approved work package even though no rule changes.
- **RULES.md has its own copy** of 75 of the strings proposed for change (event, favour, upgrade and perk texts, lorry names). It must change in the same step or the two will disagree.
- **Tests quote the text.** 22 test files and 10 browser-test, screenshot or other scripts contain strings proposed for change (for example the buttons the browser tests press: "Ring the bell", "Open my stall"). `text-changes.json` lists them per string under `also_in`. The match is on wording, so a few are the same words used for another purpose; treat the list as where to look.
- **The printed guidebook strips "Play in the evening: " and similar** from favour texts with a pattern (`scripts/print-update.ts:268`). The favour proposals keep that shape, except Favoured Trade ("Play at the bell: "), which needs the pattern updated.
- **Card boxes have limits.** A customer quirk may be 60 characters at most (46 for the normal size); every proposed quirk is 46 or fewer. The print scripts stop if a card text overflows its box, so longer favour texts (Free Fruit, Fridge) need a test print.
- **Cuts are not always a text replacement.** In `text-changes.json` the `how` field says what a cut needs: `remove-item` (a line in a list), `remove-element` (a piece of the screen), `attribute`, `empty-string`, or `decision` (the owner or a code change is needed first). `replace` is a plain swap. `unique_in_file: false` means the same words occur elsewhere in that file, so use the line number.
- **Two identities.** The approved creative bible (DEC-017) sets the game in "a sunny harbour market where the whole world comes to shop". The working guide for this audit asked for Malaysian morning-market detail. The proposals use local words in seven flavour lines only (open house, kopitiam, jamu, family day, pasar malam twice, kenduri), all things the game already has room for. A wider shift is the owner's decision.

## Correctness issues (also in their sections below)

Text that is wrong, out of date or unclear against RULES.md or the game. "Decision" means no wording change settles it.

| File:line | Where shown | What is wrong | Fix |
|---|---|---|---|
| `src/ui/game/panels/Popovers.tsx:69` | Customer pop-up: badge on a guest | A guest is not an order. "Special order" sits one word away from "standing order", which is a different card with different rules. | `Guest` |
| `src/engine/data.ts:303` | Morning news, event pop-up, printed event card, guidebook: rule (mangoWindfall) | THE CARD AND THE GAME DISAGREE. The card (and RULES.md, and the printed effect bullet) say the extra mangoes are ripe. In the app they arrive Green with the rest of the lorry's mangoes (checked by running the engine: seed 2, day 4, 4 stalls: 3 mangoes, all in the Green box). The proposed text drops "ripe" so the card is true today; if the owner wants ripe mangoes, that is an engine fix, not a text fix. | Decision or code fix |
| `src/ui/gazette.ts:22` | Printed event card only: effect bullet (goodHarvest) | Reads as one extra piece in total. The card adds 1 of each of the four fruits for every 4 stalls. | `'+1 of each fruit per 4 stalls'` |
| `src/ui/gazette.ts:33` | Printed event card only: effect bullet (mangoWindfall) | See Mango Windfall above: in the app the extra mangoes arrive Green, not ripe. | `'+1 mango per 2 stalls'` |
| `src/engine/data.ts:442` | Perk text: Sharp Ears (Farah) | TIMING IS WRONG AGAINST THE APP: the card says "each evening" but the app shows Farah the walk-in when buying ends, before stocking (engine: customersArrive). RULES.md says "evening" in the perk table and "when buying ends" in the table-play section. This is the parked "Sharp Ears timing" item in STATE.md; the proposed text follows the app. | Decision or code fix |
| `src/ui/Home.tsx:148` | Play a friend pop-up | A room holds 6 (protocol.ts MAX_SEATS), and the online screen itself says "up to 5 friends". | `<small>Share a link with 1 to 5 friends</small>` |
| `src/ui/game/panels/OrderPanel.tsx:94` | Standing-order strip: fine | WRONG FOR AN ORDER BOOK: the strip shows the fine printed on the card. A stall with an Order Book pays half (the bidding panel shows the halved figure). No wording fix: the number shown needs the same halving. | Decision or code fix |
| `src/ui/panel.tsx:252` | The Bell notice: line 6 | LEAVES OUT "BY YOURSELF". Two stalls that fill an order between them earn nothing (RULES.md: "serve a customer's entire remaining order by yourself"). A customer also has one order, not "orders". | `'Serve a customer’s whole order by yourself to earn a favour card.'` |
| `src/engine/story.ts:524` | Sales summary: your standing when you trail | SHOWS "undefined" WITH 5 OR 6 STALLS: a stall in 5th or 6th place reads "undefined · \$7 behind Saleh" (checked by running the engine with 6 stalls). | `const ord = ['1st', '2nd', '3rd', '4th', '5th', '6th'][rank - 1];` |
| `src/ui/game/panels/Results.tsx:42` | Results: medal on each row of the podium | BLANK WITH 5 OR 6 STALLS: the 5th and 6th medals are empty, and Share result does nothing for a player who finished 5th or 6th (the code reads a rank that is not in the list). | `const ranks = ['1ST', '2ND', '3RD', '4TH', '5TH', '6TH'];` |
| `src/ui/HowTo.tsx:103` | How to play, slide 4: last sentence | WRONG SINCE RULES VERSION 14: nobody waits overnight (RULES.md, "The queue"). Slide 7 of this same guide says the opposite. | `A customer who does not get everything leaves at the end of the day.` |
| `src/ui/tutorial.ts:16` | Tutorial tip "evening": text | MISLEADING: "Play a favour card if you have one, or keep your cash" reads as if playing a favour card costs cash. It does not; only upgrades do. | `text: 'Tonight all fruit ages one step. You may play an evening favour card. After a Market Day you may also build 1 upgrade. An upgrade costs cash, and cash is your score.'` |
| `src/ui/achievements.ts:53` | Trophies: achievement task (red_carpet) | NOT "ALL": there are five guests. The Wedding Caterer and the Bakery do not count for this, and are counted as ordinary customers instead. | `text: 'Sell to these three guests: the Influencer, the Gym Club and the Hotel Chef.'` |
| `src/ui/achievements.ts:55` | Trophies: achievement task (town_36) | CAN BE EARNED EARLY: the counter also counts the Wedding Caterer, the Bakery and the eight standing orders, so it can reach 36 before every customer has been served. No wording fix; the count needs fixing. | Decision or code fix |
| `src/ui/achievements.ts:56` | Trophies: achievement task (worth_wait) | CANNOT BE EARNED: since rules version 14 nobody waits overnight, so no customer comes back. The look it unlocks (Paper Lanterns) cannot be earned either. Retire it or give it a new task. | Decision or code fix |
| `src/ui/achievements.ts:57` | Trophies: achievement task (full_house) | CANNOT BE EARNED: the row never holds more than 5 customers (rules version 14). The look it unlocks (Brass Hand Bell) cannot be earned either. Suggested task: "Sell to 5 different customers in one day." | Decision or code fix |
| `src/ui/achievements.ts:60` | Trophies: achievement task (fully_fitted) | CANNOT BE EARNED: there are five upgrades and a stall has room for 2; the check asks for 3. The look it unlocks (Trader's Waistcoat) cannot be earned either. Suggested task: "Build 2 upgrades in one game." | Decision or code fix |
| `src/ui/achievements.ts:66` | Trophies: achievement task (shop_6) | NOT "ALL": there are 8 shopkeepers. Any 6 earn it. | `text: 'Win with 6 different shopkeepers.'` |
| `src/ui/achievements.ts:71` | Trophies: achievement task (event_all) | WRONG NUMBER: there are 20 event cards and the check needs all 20, but the text says 13 and the progress counter stops at "13 / 13" while the achievement stays locked. The goal number on the same line needs the same change (target: 13). | `text: 'See all 20 event cards.'` |
| `src/ui/achievements.ts:71` | Trophies: progress counter under Event Collector | See Event Collector: the counter shown is "x / 13" but 20 are needed. | `goal: { set: 'events', target: 20 }` |
| `server/meta.ts:43` | Results after a Daily market game: name already on the board | POINTS TO A PLACE THAT DOES NOT EXIST: Settings has no name box (the name is typed in New game or on the online screen). "Try again" is also not possible: the finished game is sent with the name it was played under. The proposed wording is a stopgap; the real fix is a way to rename and resend. | Decision or code fix |
| `src/ui/Online.tsx:139` | Online screen: Quick match | OUT OF DATE: private rooms hold 2 to 6 players (the next panel on this screen says so). | `Play a stranger who is looking for a game now. Always 2 players. For 3 to 6, start a private game below.` |
| `index.html:13` | Description shown by search engines | TWO THINGS OUT OF DATE: the game has 2 to 6 stalls (1 to 6 people), not "1 to 4 players", and the art has not been pixel art since the Market Ticket look (1.17.0). | `Fruit Market: buy fruit, set secret prices and sell before it spoils. A market game for 1 to 6 players.` |
| `scripts/print-update.ts:275` | Guidebook: cover | NO EVIDENCE FOR THE PLAYING TIME: nothing in the repo records a timed tabletop game (GAME-BRIEF.md lists match length as a hypothesis, "not measured with real players"). Keep it only if the owner has timed it. | Decision or code fix |
| `scripts/print-update.ts:359` | Guidebook: A day in five beats | TIMING DISAGREES WITH THE APP AND WITH RULES.md: here Farah peeks in the evening; RULES.md (Playing on a table, Sharp Ears) and the app have her look when buying ends. Parked item "Sharp Ears timing". No change proposed until the owner decides. | Decision or code fix |
| `scripts/print-deck.ts:324` | Favour card front: foot | AMBIGUOUS: reads as "discard down to 3". The rule is that a full hand draws nothing, and a played card goes to the discard pile. | `Hold up to ${FAVOUR_HAND_LIMIT} · discard when played` |
| `scripts/print-deck.ts:341` | Lorry card front: note meant for the Seconds Lorry | NEVER PRINTED: since every lorry brings Green mangoes, the line above always wins, so the printed Seconds Lorry card does not state its own rule. Needs a code change (print both notes on that card). | Decision or code fix |
| `scripts/print-deck.ts:466` | Player aid: heading | OUT OF DATE AND A SLOGAN: "show it" described open crates, which rules version 15 made secret. | `<strong>A day in five steps</strong>` |
| `scripts/print-deck.ts:450` | Player aid: step 1, Morning | OUT OF DATE: tomorrow's customers are drawn in the morning (rules version 16) and standing orders are bid for on Market Day mornings (rules version 14). | `'Turn over today’s <b>event</b> and apply it (walk-in events add or remove walk-ins now). The lorry unloads today’s card at the freshest spot (Green fruit at the Green spot, the Seconds Lorry at Okay). Draw tomorrow’s lorry, tomorrow’s regular (face up) and tomorrow’s walk-ins (face down). On a Market Day, bid for the standing order.'` |
| `scripts/print-deck.ts:452` | Player aid: step 3, Stocking | OUT OF DATE: nobody waits overnight (rules version 14), and crates are not shown before the bell, only counted (rules version 15). | `'Today’s walk-ins turn face up. Secretly move the pieces you will sell into your <b>crate</b>. Then say how many pieces are in it, not which fruit. Only pieces in your crate can sell.'` |
| `scripts/print-deck.ts:453` | Player aid: step 4, The bell | OUT OF DATE: crates open at the bell too (rules version 15). | `'Secretly set <b>one price per fruit</b> in your crate. Then everyone shows prices and crates together. No lower limit.'` |
| `scripts/print-deck.ts:454` | Player aid: step 5, The rush | OUT OF DATE: there are no waiting customers (rules version 14). | `'A standing order collected today goes first, then the row left to right. Each fruit goes to the <b>cheapest stall</b> with fruit fresh enough for its price; what is still wanted goes to the next stall. Serve a customer’s whole remaining order by yourself and <b>draw a favour card</b> (one a day at most).'` |
| `scripts/print-deck.ts:461` | Player aid: price ladder | OLD WORD: "tired" became Soft in rules version 14. | `<b>Any fruit</b> (Fresh, Okay or Soft)` |
| `scripts/print-deck.ts:475` | Player aid: Market rhythm box | OUT OF DATE: a Market Day no longer adds walk-ins (rules version 14). | `a standing order in the morning and an upgrade that evening.` |

## Cards · fruit and freshness types

Fruit names are on every screen and every card. The one-line "theme" under each fruit is shown in How to play (slide 3). The freshness types are printed on customer cards and shown on tickets, the rush pop-up and a customer's own pop-up.

| File:line | Where shown | Current text | Verdict | Proposed | Reason |
|---|---|---|---|---|---|
| `src/engine/data.ts:32` | Fruit name (everywhere) | `name: 'Blueberry'` | KEEP |  |  |
| `src/engine/data.ts:32` | Fruit name (everywhere) | `plural: 'Blueberries'` | KEEP |  |  |
| `src/engine/data.ts:38` | Fruit name (everywhere) | `name: 'Watermelon'` | KEEP |  |  |
| `src/engine/data.ts:38` | Fruit name (everywhere) | `plural: 'Watermelons'` | KEEP |  |  |
| `src/engine/data.ts:44` | Fruit name (everywhere) | `name: 'Apple'` | KEEP |  |  |
| `src/engine/data.ts:44` | Fruit name (everywhere) | `plural: 'Apples'` | KEEP |  |  |
| `src/engine/data.ts:50` | Fruit name (everywhere) | `name: 'Mango'` | KEEP |  |  |
| `src/engine/data.ts:50` | Fruit name (everywhere) | `plural: 'Mangoes'` | KEEP |  |  |
| `src/engine/data.ts:33` | How to play, slide 3: line under the blueberry track | `Cheap and popular, but soft in 3 days. Sell fast!` | REWRITE | `Cheap. Lasts 3 days: Fresh, Okay, Soft.` | Drops the "!" and the advice; "popular" is not a rule. Same facts as the track beside it, in the same pattern as the other three. |
| `src/engine/data.ts:39` | How to play, slide 3: line under the watermelon track | `The steady seller. Two Fresh days, then Okay, then Soft.` | REWRITE | `Lasts 4 days: 2 Fresh, then Okay, then Soft.` | "The steady seller" is a label, not a fact. Digits. |
| `src/engine/data.ts:45` | How to play, slide 3: line under the apple track | `The keeper: four Fresh days. Never the best price, never a loss.` | REWRITE | `Lasts 6 days: 4 Fresh, then Okay, then Soft.` | "Never the best price, never a loss" is a slogan and is not true as a rule (apples can spoil or go unsold). RULES.md repeats it. |
| `src/engine/data.ts:51` | How to play, slide 3: line under the mango track | `Always arrives green for $3. Ripens in 2 nights, then one Fresh day at a premium.` | REWRITE | `Arrives Green for $3. Ripens in 2 nights, then lasts 3 days: Fresh, Okay, Soft.` | Same pattern as the other fruit; "at a premium" is vague next to a customer type called Premium. |
| `src/engine/data.ts:230` | Freshness type name (customer cards, tickets, pop-ups) | `title: 'Premium'` | KEEP |  |  |
| `src/engine/data.ts:231` | Freshness type name (customer cards, tickets, pop-ups) | `title: 'Everyday'` | KEEP |  |  |
| `src/engine/data.ts:232` | Freshness type name (customer cards, tickets, pop-ups) | `title: 'Bargain'` | KEEP |  |  |
| `src/engine/data.ts:230` | Freshness type, short form ("Buys: Fresh only") | `short: 'Fresh only'` | KEEP |  |  |
| `src/engine/data.ts:231` | Freshness type, short form ("Buys: Fresh only") | `short: 'Fresh or Okay'` | KEEP |  |  |
| `src/engine/data.ts:232` | Freshness type, short form ("Buys: Any freshness") | `short: 'Any freshness'` | REWRITE | `short: 'Fresh, Okay or Soft'` | Names the three states like the other two types; "any" could be read to include Green. Note: three screens lower-case this string (ticket.tsx:76, Showdown.tsx:85, boardModel.ts:161), which breaks the capital-letter rule for Fresh, Okay, Soft. |
| `src/engine/data.ts:230` | Freshness type, full sentence (tooltip and print legend) | `text: 'Buys Fresh fruit only.'` | KEEP |  |  |
| `src/engine/data.ts:231` | Freshness type, full sentence (tooltip and print legend) | `text: 'Buys Fresh or Okay fruit.'` | KEEP |  |  |
| `src/engine/data.ts:232` | Freshness type, full sentence (tooltip and print legend) | `text: 'Buys Fresh, Okay or Soft fruit.'` | KEEP |  |  |

## Cards · customers (36)

Each customer has a name (owner-approved, DEC-065: unchanged) and one "quirk" line. The quirk is printed on the full Trading Card and shown in the app only in the pop-up when a customer ticket is tapped. Eight of the 36 use the same "does X to every fruit" joke. Option A for every row is to cut the quirk (the card then shows name, picture, order and freshness type). Option B is the plain line shown. Limit: 60 characters (cards.tsx QUIRK_MAX); 46 or fewer keeps the normal type size. All B lines are 46 or fewer.

| File:line | Where shown | Current text | Verdict | Proposed | Reason |
|---|---|---|---|---|---|
| `src/engine/data.ts:453` | Customer card and ticket: name | `title: 'Cowboy Jack'` | KEEP |  | Owner-approved name (DEC-065). |
| `src/engine/data.ts:453` | Customer card and pop-up: quirk (Cowboy Jack) | `Pays with coins he panned from the river.` | REWRITE | A: cut · **B:** `Pans for gold up the river.` (recommended) | The picture shows a gold nugget and a river; you pan gold, not coins. |
| `src/engine/data.ts:454` | Customer card and ticket: name | `title: 'Bobby Books'` | KEEP |  | Owner-approved name (DEC-065). |
| `src/engine/data.ts:454` | Customer card and pop-up: quirk (Bobby Books) | `Reads the label on every blueberry.` | REWRITE | A: cut · **B:** `Runs the town library.` (recommended) | "Every blueberry" formula. |
| `src/engine/data.ts:455` | Customer card and ticket: name | `title: 'Dr Bubbles'` | KEEP |  | Owner-approved name (DEC-065). |
| `src/engine/data.ts:455` | Customer card and pop-up: quirk (Dr Bubbles) | `Swears apples power his experiments.` | REWRITE | A: cut · **B:** `Teaches science at the school.` (recommended) | "Swears" joke; says nothing about what he does. |
| `src/engine/data.ts:456` | Customer card and ticket: name | `title: 'Rara Jenab'` | KEEP |  | Owner-approved name (DEC-065). |
| `src/engine/data.ts:456` | Customer card and pop-up: quirk (Rara Jenab) | `Cheers every mango she buys. "Ra-ra, Jenab!"` | REWRITE | A: cut · **B:** `Hosting an open house this weekend.` (recommended) | Catchphrase in quotes with "!". Local detail: open house. |
| `src/engine/data.ts:457` | Customer card and ticket: name | `title: 'Zara Zapp'` | KEEP |  | Owner-approved name (DEC-065). |
| `src/engine/data.ts:457` | Customer card and pop-up: quirk (Zara Zapp) | `Needs watermelon for the lab snacks.` | REWRITE | A: cut · **B:** `Buys watermelon for the whole lab.` (recommended) | Near the current line, without "lab snacks". |
| `src/engine/data.ts:458` | Customer card and ticket: name | `title: 'Ravi Rocket'` | KEEP |  | Owner-approved name (DEC-065). |
| `src/engine/data.ts:458` | Customer card and pop-up: quirk (Ravi Rocket) | `Saves the day, one mango at a time.` | REWRITE | A: cut · **B:** `Delivers parcels by motorbike.` (recommended) | Hero slogan ("saves the day"); the picture is a delivery rider. |
| `src/engine/data.ts:459` | Customer card and ticket: name | `title: 'Coral Mei'` | KEEP |  | Owner-approved name (DEC-065). |
| `src/engine/data.ts:459` | Customer card and pop-up: quirk (Coral Mei) | `Splashes anyone selling soggy fruit.` | REWRITE | A: cut · **B:** `Dives for a living. Not fussy about fruit.` (recommended) | CONTRADICTS HER TYPE: she is a Bargain customer and buys Soft fruit, but the line says she punishes "soggy fruit". |
| `src/engine/data.ts:460` | Customer card and ticket: name | `title: 'Postman Pip'` | KEEP |  | Owner-approved name (DEC-065). |
| `src/engine/data.ts:460` | Customer card and pop-up: quirk (Postman Pip) | `You never see him arrive. Or pay.` | REWRITE | A: cut · **B:** `Eats an apple on his round.` (recommended) | Reads as if he never pays. |
| `src/engine/data.ts:461` | Customer card and ticket: name | `title: 'Madam Siti'` | KEEP |  | Owner-approved name (DEC-065). |
| `src/engine/data.ts:461` | Customer card and pop-up: quirk (Madam Siti) | `Measures every watermelon with her tape.` | REWRITE | A: cut · **B:** `Runs the tailor shop by the market.` (recommended) | "Every watermelon" formula. |
| `src/engine/data.ts:462` | Customer card and ticket: name | `title: 'Magic Kumar'` | KEEP |  | Owner-approved name (DEC-065). |
| `src/engine/data.ts:462` | Customer card and pop-up: quirk (Magic Kumar) | `Pulls three wishes out of a hat. All of them are fruit.` | REWRITE | A: cut · **B:** `Does magic shows at the pasar malam.` (recommended) | Two-sentence joke. Local detail: pasar malam. |
| `src/engine/data.ts:463` | Customer card and ticket: name | `title: 'Rockstar Grace'` | KEEP |  | Owner-approved name (DEC-065). |
| `src/engine/data.ts:463` | Customer card and pop-up: quirk (Rockstar Grace) | `Apples keep her voice sharp for the show.` | REWRITE | A: cut · **B:** `Has a show tonight.` (recommended) | Reason-for-buying joke; shorter and plain. |
| `src/engine/data.ts:464` | Customer card and ticket: name | `title: 'Professor Pebble'` | KEEP |  | Owner-approved name (DEC-065). |
| `src/engine/data.ts:464` | Customer card and pop-up: quirk (Professor Pebble) | `Says "RAWR" and means five blueberries.` | REWRITE | A: cut · **B:** `Digs up old bones for the museum.` (recommended) | WRONG NUMBER: says "five blueberries" but his card wants 3. "RAWR" does not fit the picture (a man with a dug-up bone). |
| `src/engine/data.ts:465` | Customer card and ticket: name | `title: 'Inspector Wei'` | KEEP |  | Owner-approved name (DEC-065). |
| `src/engine/data.ts:465` | Customer card and pop-up: quirk (Inspector Wei) | `Inspects every fruit with a magnifying glass.` | REWRITE | A: cut · **B:** `On a case. Buys whatever is cheap.` (recommended) | "Every fruit" formula, and it suggests he is fussy: he is a Bargain customer. |
| `src/engine/data.ts:466` | Customer card and ticket: name | `title: 'Miss Marigold'` | KEEP |  | Owner-approved name (DEC-065). |
| `src/engine/data.ts:466` | Customer card and pop-up: quirk (Miss Marigold) | `Sprinkles petals on every watermelon.` | REWRITE | A: cut · **B:** `Sells flowers two stalls down.` (recommended) | "Every watermelon" formula. |
| `src/engine/data.ts:467` | Customer card and ticket: name | `title: 'Dr Priya'` | KEEP |  | Owner-approved name (DEC-065). |
| `src/engine/data.ts:467` | Customer card and pop-up: quirk (Dr Priya) | `Researching the perfect apple pie.` | REWRITE | A: cut · **B:** `Testing an apple pie recipe.` (recommended) | Praise word ("perfect"). |
| `src/engine/data.ts:468` | Customer card and ticket: name | `title: 'Captain Ahmad'` | KEEP |  | Owner-approved name (DEC-065). |
| `src/engine/data.ts:468` | Customer card and pop-up: quirk (Captain Ahmad) | `Buying mangoes for the whole crew.` | KEEP | **Keep as is** (recommended) · A: cut · B: `His ferry leaves at noon.` | Already plain and specific. |
| `src/engine/data.ts:469` | Customer card and ticket: name | `title: 'Lola Lens'` | KEEP |  | Owner-approved name (DEC-065). |
| `src/engine/data.ts:469` | Customer card and pop-up: quirk (Lola Lens) | `Photographs every mango before she buys it.` | REWRITE | A: cut · **B:** `Takes the wedding photos in town.` (recommended) | "Every mango" formula; same joke as Anna the Artist. |
| `src/engine/data.ts:470` | Customer card and ticket: name | `title: 'Grandpa Tan'` | KEEP |  | Owner-approved name (DEC-065). |
| `src/engine/data.ts:470` | Customer card and pop-up: quirk (Grandpa Tan) | `Remembers when apples cost ten cents.` | KEEP | **Keep as is** (recommended) · A: cut | Plain, specific, and the owner-approved sample in the creative bible. |
| `src/engine/data.ts:471` | Customer card and ticket: name | `title: 'Miss Cha-Cha'` | KEEP |  | Owner-approved name (DEC-065). |
| `src/engine/data.ts:471` | Customer card and pop-up: quirk (Miss Cha-Cha) | `Cha-chas all the way down the street.` | REWRITE | A: cut · **B:** `Teaches dance class on Tuesdays.` (recommended) | Repeats her name as the joke. |
| `src/engine/data.ts:472` | Customer card and ticket: name | `title: 'Sleepy Zul'` | KEEP |  | Owner-approved name (DEC-065). |
| `src/engine/data.ts:472` | Customer card and pop-up: quirk (Sleepy Zul) | `Wants fresh fruit. Has not had his coffee.` | REWRITE | A: cut · **B:** `Works the night shift.` (recommended) | MISLEADS ON TYPE: "Wants fresh fruit" reads as Fresh only, but he is an Everyday customer (Fresh or Okay). |
| `src/engine/data.ts:473` | Customer card and ticket: name | `title: 'Anna the Artist'` | KEEP |  | Owner-approved name (DEC-065). |
| `src/engine/data.ts:473` | Customer card and pop-up: quirk (Anna the Artist) | `Paints every mango before she eats it.` | REWRITE | A: cut · **B:** `Paints the stalls on market mornings.` (recommended) | "Every mango" formula; same joke as Lola Lens. |
| `src/engine/data.ts:474` | Customer card and ticket: name | `title: 'Otto Oddjob'` | KEEP |  | Owner-approved name (DEC-065). |
| `src/engine/data.ts:474` | Customer card and pop-up: quirk (Otto Oddjob) | `Calculates the best fruit salad.` | REWRITE | A: cut · **B:** `Does odd jobs around the market.` (recommended) | Says nothing about what he does; "best" is a praise word. |
| `src/engine/data.ts:475` | Customer card and ticket: name | `title: 'Mina Moss'` | KEEP |  | Owner-approved name (DEC-065). |
| `src/engine/data.ts:475` | Customer card and pop-up: quirk (Mina Moss) | `Rangers are wild about watermelon.` | REWRITE | A: cut · **B:** `Park ranger. Buys for the whole camp.` (recommended) | Pun ("wild about"). |
| `src/engine/data.ts:476` | Customer card and ticket: name | `title: 'Firefighter Osman'` | KEEP |  | Owner-approved name (DEC-065). |
| `src/engine/data.ts:476` | Customer card and pop-up: quirk (Firefighter Osman) | `Cools down after every call with watermelon.` | REWRITE | A: cut · **B:** `Buys watermelon for the fire station.` (recommended) | "Every call" formula. Close to the current meaning. |
| `src/engine/data.ts:477` | Customer card and ticket: name | `title: 'Marina Wen'` | KEEP |  | Owner-approved name (DEC-065). |
| `src/engine/data.ts:477` | Customer card and pop-up: quirk (Marina Wen) | `Pays in coins from far ports. Reads the mango map twice.` | REWRITE | A: cut · **B:** `In port for one day.` (recommended) | Two jokes in one line; second longest quirk. |
| `src/engine/data.ts:478` | Customer card and ticket: name | `title: 'DJ Rizal'` | KEEP |  | Owner-approved name (DEC-065). |
| `src/engine/data.ts:478` | Customer card and pop-up: quirk (DJ Rizal) | `Drops the beat, then drops by for blueberries.` | REWRITE | A: cut · **B:** `Plays at weddings on weekends.` (recommended) | Pun ("drops the beat, then drops by"). |
| `src/engine/data.ts:479` | Customer card and ticket: name | `title: 'Devi Bloom'` | KEEP |  | Owner-approved name (DEC-065). |
| `src/engine/data.ts:479` | Customer card and pop-up: quirk (Devi Bloom) | `Grows everything except mangoes. Buys them all.` | REWRITE | A: cut · **B:** `Grows vegetables. Buys her mangoes here.` (recommended) | Same idea, without the "everything... all" exaggeration. |
| `src/engine/data.ts:480` | Customer card and ticket: name | `title: 'Marcus Hook'` | KEEP |  | Owner-approved name (DEC-065). |
| `src/engine/data.ts:480` | Customer card and pop-up: quirk (Marcus Hook) | `Sells fish at dawn, buys apples by noon.` | KEEP | **Keep as is** (recommended) · A: cut | Plain and specific. |
| `src/engine/data.ts:481` | Customer card and ticket: name | `title: 'Professor Fatimah'` | KEEP |  | Owner-approved name (DEC-065). |
| `src/engine/data.ts:481` | Customer card and pop-up: quirk (Professor Fatimah) | `Lectures on the science of the perfect watermelon.` | REWRITE | A: cut · **B:** `Marks exam papers at the kopitiam.` (recommended) | Praise word ("perfect"). Local detail: kopitiam. |
| `src/engine/data.ts:482` | Customer card and ticket: name | `title: 'Benny Bell'` | KEEP |  | Owner-approved name (DEC-065). |
| `src/engine/data.ts:482` | Customer card and pop-up: quirk (Benny Bell) | `Rings a little bell for every watermelon he carries.` | REWRITE | A: cut · **B:** `Bellboy at the hotel up the road.` (recommended) | "Every watermelon" formula; longest quirk in the deck. |
| `src/engine/data.ts:483` | Customer card and ticket: name | `title: 'Akira Swift'` | KEEP |  | Owner-approved name (DEC-065). |
| `src/engine/data.ts:483` | Customer card and pop-up: quirk (Akira Swift) | `Slices a mango in one clean stroke.` | REWRITE | A: cut · **B:** `Trains with the fencing club.` (recommended) | The picture is a fencer; nothing wrong with the line, but it is a flourish. |
| `src/engine/data.ts:484` | Customer card and ticket: name | `title: 'Hadi Hammer'` | KEEP |  | Owner-approved name (DEC-065). |
| `src/engine/data.ts:484` | Customer card and pop-up: quirk (Hadi Hammer) | `Builds towers of blueberries on his lunch break.` | REWRITE | A: cut · **B:** `On lunch break from the building site.` (recommended) | Whimsy; the second half already says the plain thing. |
| `src/engine/data.ts:485` | Customer card and ticket: name | `title: 'Baker Lakshmi'` | KEEP |  | Owner-approved name (DEC-065). |
| `src/engine/data.ts:485` | Customer card and pop-up: quirk (Baker Lakshmi) | `Her famous apple tart starts at your stall.` | REWRITE | A: cut · **B:** `Bakes apple tarts before sunrise.` (recommended) | Advertising voice ("famous", "starts at your stall"). |
| `src/engine/data.ts:486` | Customer card and ticket: name | `title: 'Kenji Kaze'` | KEEP |  | Owner-approved name (DEC-065). |
| `src/engine/data.ts:486` | Customer card and pop-up: quirk (Kenji Kaze) | `Flips a mango, catches it, pays for it.` | REWRITE | A: cut · **B:** `Teaches karate after school.` (recommended) | Three-part rhythm. |
| `src/engine/data.ts:487` | Customer card and ticket: name | `title: 'Herbalist Mira'` | KEEP |  | Owner-approved name (DEC-065). |
| `src/engine/data.ts:487` | Customer card and pop-up: quirk (Herbalist Mira) | `Brews a mango tonic. Do not ask what is in it.` | REWRITE | A: cut · **B:** `Sells jamu and herbal tea.` (recommended) | Winking aside ("Do not ask"). Local detail: jamu. |
| `src/engine/data.ts:488` | Customer card and ticket: name | `title: 'Uncle Hock Seng'` | KEEP |  | Owner-approved name (DEC-065). |
| `src/engine/data.ts:488` | Customer card and pop-up: quirk (Uncle Hock Seng) | `Has strong opinions about the price of apples.` | KEEP | **Keep as is** (recommended) · A: cut | Plain and human. |

## Cards · guests (5)

Guests come with an event. Their card uses the same layout as a customer card; the flag on it reads "Special guest".

| File:line | Where shown | Current text | Verdict | Proposed | Reason |
|---|---|---|---|---|---|
| `src/engine/data.ts:489` | Guest card and ticket: name | `title: 'The Influencer'` | KEEP |  | Owner-approved name (DEC-064). |
| `src/engine/data.ts:489` | Guest card and pop-up: quirk (The Influencer) | `Will post your stall if the mangoes are perfect.` | REWRITE | A: cut · **B:** `Filming a mango video today.` (recommended) | Praise word ("perfect"); promises a reward that does not exist in the rules. |
| `src/engine/data.ts:490` | Guest card and ticket: name | `title: 'The Gym Club'` | KEEP |  | Owner-approved name (DEC-064). |
| `src/engine/data.ts:490` | Guest card and pop-up: quirk (The Gym Club) | `Need. More. Antioxidants.` | REWRITE | A: cut · **B:** `Blueberries after training.` (recommended) | Staccato slogan. |
| `src/engine/data.ts:491` | Guest card and ticket: name | `title: 'The Hotel Chef'` | KEEP |  | Owner-approved name (DEC-064). |
| `src/engine/data.ts:491` | Guest card and pop-up: quirk (The Hotel Chef) | `Running a five-star breakfast buffet.` | REWRITE | A: cut · **B:** `Buying for the hotel breakfast.` (recommended) | "Five-star" is praise. |
| `src/engine/data.ts:492` | Guest card and ticket: name | `title: 'The Wedding Caterer'` | KEEP |  | Owner-approved name (DEC-064). |
| `src/engine/data.ts:492` | Guest card and pop-up: quirk (The Wedding Caterer) | `Feeding five hundred guests by sundown.` | REWRITE | A: cut · **B:** `Cooking for a kenduri tonight.` (recommended) | Exaggeration ("five hundred guests") for an order of 3 watermelons. |
| `src/engine/data.ts:493` | Guest card and ticket: name | `title: 'The Bakery'` | KEEP |  | Owner-approved name (DEC-064). |
| `src/engine/data.ts:493` | Guest card and pop-up: quirk (The Bakery) | `Needs apples for the prize-winning pie.` | REWRITE | A: cut · **B:** `Needs apples for the pies.` (recommended) | "Prize-winning" is praise. |
| `src/engine/data.ts:499` | Quirk for a customer the game does not know (never seen in normal play) | `Just here for fruit.` | KEEP |  | Fallback only. |
| `src/ui/cards.tsx:72` | Printed guest card: flag on the picture | `'Special guest'` | REWRITE | `'Guest'` | One word for one thing: RULES.md and the guidebook call these guests. |
| `src/ui/cards.tsx:72` | Printed customer card: flag on the picture ("Premium shopper") | `` `${PREF_INFO[pref].title} shopper` `` | REWRITE | `` `${PREF_INFO[pref].title} customer` `` | "Shopper" is used nowhere else; the word is customer. |
| `src/ui/cards.tsx:85` | Printed customer card: bottom line ("Buys: Fresh or Okay") | `` `Buys: ${PREF_INFO[pref].short}` `` | KEEP |  |  |
| `src/ui/cards.tsx:101` | Printed customer card back: game name | `<b class="x-tb-brand">Fruit Market</b>` | KEEP |  |  |
| `src/ui/cards.tsx:102` | Printed customer card back: card type | `<span class="x-tb-kind">Customer</span>` | KEEP |  |  |
| `src/ui/ticket.tsx:62` | Ticket in the customer row: label where a customer shows a number | `'Guest'` | KEEP |  |  |
| `src/ui/ticket.tsx:76` | Customer pop-up: foot of the large ticket ("Everyday · buys fresh or okay") | `{PREF_INFO[prefOf(who)].title} · buys {PREF_INFO[prefOf(who)].short.toLowerCase()}` | REWRITE | `{PREF_INFO[prefOf(who)].title} · buys {PREF_INFO[prefOf(who)].short}` | Lower-casing turns "Fresh or Okay" into "fresh or okay"; the freshness states are capitalised everywhere else on this ticket (F, O, S lamps). |
| `src/ui/game/panels/Popovers.tsx:69` | Customer pop-up: badge on a guest | `Special order` | CORRECTNESS | `Guest` | A guest is not an order. "Special order" sits one word away from "standing order", which is a different card with different rules. |
| `src/ui/game/panels/Popovers.tsx:72` | Customer pop-up: price key, Fresh | `<Lamp stage="fresh" /> Full price` | REWRITE | `<Lamp stage="fresh" /> Top price` | "Top price" is the term used on the rush pop-up and in the rules. |
| `src/ui/game/panels/Popovers.tsx:73` | Customer pop-up: price key, Okay ("\$1 less") | `<Lamp stage="okay" /> ${FRUIT.apple.drop[1]} less` | KEEP |  |  |
| `src/ui/game/panels/Popovers.tsx:74` | Customer pop-up: price key, Soft ("\$2 less") | `<Lamp stage="notso" /> ${FRUIT.apple.drop[0]} less` | KEEP |  |  |
| `src/ui/table.tsx:373` | Face-down ticket: heading | `label={later ? 'Tomorrow' : 'Walk-in'}` | KEEP |  |  |

## Cards · events (20)

In the app an event shows its title, the flavour headline (italic), up to three big-figure chips, and the rule text. The printed event card (newspaper front page) adds a red subhead, a caption under the picture and a box of effect bullets. That is up to seven pieces of text for one event, and four of them (flavour, subhead, caption, bullets) repeat the title or the rule. Recommendation: cut all 20 flavour headlines and all 20 captions; keep one plain subhead on the printed card; keep the rule text as the single source of what the card does.

| File:line | Where shown | Current text | Verdict | Proposed | Reason |
|---|---|---|---|---|---|
| `src/engine/data.ts:277` | Event card, morning news and top bar: title | `title: 'Festival'` | KEEP |  |  |
| `src/engine/data.ts:277` | Morning news and printed event card: flavour headline (festival) | `Big crowds, bigger spending!` | CUT | **A: cut** (recommended) · B: `The town fair is on.` | Paired slogan ("big... bigger"). |
| `src/engine/data.ts:277` | Morning news, event pop-up, printed event card, guidebook: rule (festival) | `Customers pay $1 more per fruit. Add 1 walk-in (2 at 4–6 stalls), up to a row of five.` | REWRITE | `Every customer pays $1 more for each piece. Add 1 walk-in (2 at 4 to 6 stalls). The row still holds 5 customers at most.` | One fact per sentence; "piece" not "fruit"; "up to a row of five" spelled out. |
| `src/engine/data.ts:278` | Event card, morning news and top bar: title | `title: 'Superfood Trend'` | KEEP |  |  |
| `src/engine/data.ts:280` | Morning news and printed event card: flavour headline (superfood) | `Blueberries are the new superfood!` | CUT | **A: cut** (recommended) · B: `The gym says blueberries are good for you.` | Tabloid "!" headline that repeats the title. |
| `src/engine/data.ts:280` | Morning news, event pop-up, printed event card, guidebook: rule (superfood) | `Blueberry customers pay $1 more each. Gym Club wants 2 Fresh/Okay blueberries at $8 each.` | REWRITE | `Customers pay $1 more for each blueberry. Guest: the Gym Club wants 2 blueberries, Fresh or Okay, top price $8.` | "Fresh/Okay" written out; "top price" is what \$8 is (Okay sells for \$1 less, as for anyone). |
| `src/engine/data.ts:281` | Event card, morning news and top bar: title | `title: 'Mango Craze'` | KEEP |  |  |
| `src/engine/data.ts:283` | Morning news and printed event card: flavour headline (mangoCraze) | `Mangoes go viral!` | CUT | **A: cut** (recommended) · B: `A mango video is going round.` | Tabloid "!" headline that repeats the title. |
| `src/engine/data.ts:283` | Morning news, event pop-up, printed event card, guidebook: rule (mangoCraze) | `Mango customers pay $2 more each. An influencer wants 1 Fresh mango at $15.` | REWRITE | `Customers pay $2 more for each mango. Guest: the Influencer wants 1 Fresh mango, top price $15.` | Uses the guest's card name ("the Influencer", not "an influencer"). |
| `src/engine/data.ts:284` | Event card, morning news and top bar: title | `title: 'Hotel Order'` | KEEP |  |  |
| `src/engine/data.ts:286` | Morning news and printed event card: flavour headline (hotel) | `Room service is calling!` | CUT | **A: cut** (recommended) · B: `The hotel kitchen needs fruit.` | Tabloid "!" headline that repeats the title. |
| `src/engine/data.ts:286` | Morning news, event pop-up, printed event card, guidebook: rule (hotel) | `Hotel Chef wants 1 apple ($8), 1 watermelon ($8) and 1 blueberry ($7). Fresh/Okay only.` | REWRITE | `Guest: the Hotel Chef wants 1 apple ($8), 1 watermelon ($8) and 1 blueberry ($7), Fresh or Okay.` | Same pattern as the other guest cards. |
| `src/engine/data.ts:287` | Event card, morning news and top bar: title | `title: 'Heatwave'` | KEEP |  |  |
| `src/engine/data.ts:287` | Morning news and printed event card: flavour headline (heatwave) | `Melting weather, sizzling sales!` | CUT | **A: cut** (recommended) · B: `A very hot day.` | Rhyming pair ("melting... sizzling"). |
| `src/engine/data.ts:287` | Morning news, event pop-up, printed event card, guidebook: rule (heatwave) | `Watermelon customers pay $2 more each. All fruit ages an extra step tonight.` | REWRITE | `Customers pay $2 more for each watermelon. Tonight all fruit ages 2 steps.` | "An extra step" said as the number that results. The evening warning already says "ages twice". |
| `src/engine/data.ts:288` | Event card, morning news and top bar: title | `title: 'Apple Blight'` | KEEP |  |  |
| `src/engine/data.ts:288` | Morning news and printed event card: flavour headline (blight) | `Bad news from the orchard!` | CUT | **A: cut** (recommended) · B: `The apple trees are sick.` | Tabloid "!" headline that repeats the title. |
| `src/engine/data.ts:288` | Morning news, event pop-up, printed event card, guidebook: rule (blight) | `No apples arrive. Apple customers pay $2 more each.` | REWRITE | `The lorry brings no apples. Customers pay $2 more for each apple.` | Says who brings no apples. |
| `src/engine/data.ts:289` | Event card, morning news and top bar: title | `title: 'Blueberry Glut'` | KEEP |  |  |
| `src/engine/data.ts:289` | Morning news and printed event card: flavour headline (glut) | `Blueberries everywhere!` | CUT | **A: cut** (recommended) · B: `Too many blueberries this week.` | Tabloid "!" headline that repeats the title. |
| `src/engine/data.ts:289` | Morning news, event pop-up, printed event card, guidebook: rule (glut) | `Deliver 1 extra per 2 stalls, rounded up. Blueberry customers pay $1 less each.` | REWRITE | `The lorry brings 1 extra blueberry for every 2 stalls (round up). Customers pay $1 less for each blueberry.` | AMBIGUOUS AS WRITTEN: "Deliver 1 extra" does not say 1 extra of what. Only the title tells you it is blueberries. |
| `src/engine/data.ts:290` | Event card, morning news and top bar: title | `title: 'Good Harvest'` | KEEP |  |  |
| `src/engine/data.ts:290` | Morning news and printed event card: flavour headline (goodHarvest) | `A bumper crop rolls in!` | CUT | **A: cut** (recommended) · B: `The farms had a good week.` | Tabloid "!" headline that repeats the title. |
| `src/engine/data.ts:290` | Morning news, event pop-up, printed event card, guidebook: rule (goodHarvest) | `Deliver 1 extra of each fruit per 4 stalls, rounded up. Customers pay $1 less per fruit.` | REWRITE | `The lorry brings 1 extra of each fruit for every 4 stalls (round up). Every customer pays $1 less for each piece.` | Same pattern as Blueberry Glut. |
| `src/engine/data.ts:291` | Event card, morning news and top bar: title | `title: 'Bad Harvest'` | KEEP |  |  |
| `src/engine/data.ts:291` | Morning news and printed event card: flavour headline (badHarvest) | `Slim pickings on the farm!` | CUT | **A: cut** (recommended) · B: `The farms had a bad week.` | Tabloid "!" headline that repeats the title. |
| `src/engine/data.ts:291` | Morning news, event pop-up, printed event card, guidebook: rule (badHarvest) | `Halve today’s delivery, rounded up. Customers pay $1 more per fruit.` | REWRITE | `The lorry brings half of each fruit (round up). Every customer pays $1 more for each piece.` | "Halve today's delivery": the engine halves each fruit separately and rounds each up. |
| `src/engine/data.ts:292` | Event card, morning news and top bar: title | `title: 'Price Hike'` | KEEP |  |  |
| `src/engine/data.ts:292` | Morning news and printed event card: flavour headline (priceHike) | `Same fruit, bigger bill!` | CUT | **A: cut** (recommended) · B: `The wholesalers put their prices up.` | Tabloid "!" headline that repeats the title. |
| `src/engine/data.ts:292` | Morning news, event pop-up, printed event card, guidebook: rule (priceHike) | `All Wholesale Market fruit costs $1 more today.` | REWRITE | `Every piece at the Wholesale Market costs $1 more today.` | Minor: "piece". |
| `src/engine/data.ts:293` | Event card, morning news and top bar: title | `title: 'Price Controls'` | KEEP |  |  |
| `src/engine/data.ts:293` | Morning news and printed event card: flavour headline (priceControls) | `Keep those prices in check!` | CUT | **A: cut** (recommended) · B: `The market committee sets top prices today.` | Tabloid "!" headline that repeats the title. |
| `src/engine/data.ts:293` | Morning news, event pop-up, printed event card, guidebook: rule (priceControls) | `Stall prices cannot exceed the limits shown today.` | REWRITE | `Today no stall may set a price above the limit shown for each fruit.` | Plain verb; says the limit is per fruit. |
| `src/engine/data.ts:295` | Event card, morning news and top bar: title | `title: 'Health Inspector'` | KEEP |  |  |
| `src/engine/data.ts:295` | Morning news and printed event card: flavour headline (inspector) | `Surprise inspection!` | CUT | **A: cut** (recommended) · B: `The inspector checks every shelf.` | Tabloid "!" headline that repeats the title. |
| `src/engine/data.ts:295` | Morning news, event pop-up, printed event card, guidebook: rule (inspector) | `Before buying, pay $2 per Soft fruit on your shelf, up to your cash. Never the final day.` | REWRITE | `Before buying, pay $2 for each Soft piece on your shelf (never more than your cash). Never on the last day.` | "Per Soft fruit" becomes "for each Soft piece"; "last day" is the term, not "final day". |
| `src/engine/data.ts:296` | Event card, morning news and top bar: title | `title: 'Lorry Breakdown'` | KEEP |  |  |
| `src/engine/data.ts:296` | Morning news and printed event card: flavour headline (strike) | `The fruit is stuck in traffic!` | CUT | **A: cut** (recommended) · B: `The lorry broke down on the highway.` | Tabloid "!" headline, and it says "stuck in traffic" on a card called Lorry Breakdown. |
| `src/engine/data.ts:296` | Morning news, event pop-up, printed event card, guidebook: rule (strike) | `No delivery today. Existing market stock stays.` | REWRITE | `No lorry today. Fruit already at the Wholesale Market stays.` | "Delivery" and "market stock" are second words for lorry and Wholesale Market fruit. |
| `src/engine/data.ts:297` | Event card, morning news and top bar: title | `title: 'Tourist Bus'` | KEEP |  |  |
| `src/engine/data.ts:297` | Morning news and printed event card: flavour headline (touristBus) | `Here come the hungry tourists!` | CUT | **A: cut** (recommended) · B: `A tour bus stops at the market.` | Tabloid "!" headline that repeats the title. |
| `src/engine/data.ts:297` | Morning news, event pop-up, printed event card, guidebook: rule (touristBus) | `Add 2 walk-ins at 2–3 stalls, 3 at 4 stalls, or 4 at 5–6 stalls, up to a row of five. Prices unchanged.` | REWRITE | `Add 2 walk-ins (3 at 4 stalls, 4 at 5 or 6 stalls). The row still holds 5 customers at most.` | "Prices unchanged" cut: a card does not need to list what it does not do. |
| `src/engine/data.ts:298` | Event card, morning news and top bar: title | `title: 'Monsoon Downpour'` | KEEP |  |  |
| `src/engine/data.ts:298` | Morning news and printed event card: flavour headline (monsoon) | `Rain checks for everyone!` | CUT | **A: cut** (recommended) · B: `Heavy rain all day.` | Pun ("rain checks"). |
| `src/engine/data.ts:298` | Morning news, event pop-up, printed event card, guidebook: rule (monsoon) | `Remove 1 walk-in (2 at 4–6 stalls). No fruit ages tonight, including market stock.` | REWRITE | `Remove 1 walk-in (2 at 4 to 6 stalls). No fruit ages tonight, at the stalls or at the Wholesale Market.` | "Market stock" named properly. |
| `src/engine/data.ts:299` | Event card, morning news and top bar: title | `title: 'Durian Season'` | KEEP |  |  |
| `src/engine/data.ts:299` | Morning news and printed event card: flavour headline (durian) | `Durian steals the spotlight!` | CUT | **A: cut** (recommended) · B: `Everyone is buying durian instead.` | Tabloid "!" headline that repeats the title. |
| `src/engine/data.ts:299` | Morning news, event pop-up, printed event card, guidebook: rule (durian) | `Wholesale fruit costs $1 less, minimum $1. Customers pay $1 less per fruit.` | REWRITE | `Every piece at the Wholesale Market costs $1 less (never below $1). Every customer pays $1 less for each piece.` | "Wholesale fruit" is a third name for the Wholesale Market. |
| `src/engine/data.ts:300` | Event card, morning news and top bar: title | `title: 'Kenduri'` | KEEP |  |  |
| `src/engine/data.ts:302` | Morning news and printed event card: flavour headline (kenduri) | `There’s a wedding to feed!` | CUT | **A: cut** (recommended) · B: `A wedding feast in the kampung.` | Tabloid "!" headline that repeats the title. |
| `src/engine/data.ts:302` | Morning news, event pop-up, printed event card, guidebook: rule (kenduri) | `After walk-ins, a caterer wants 3 Fresh/Okay watermelons at $8 each.` | REWRITE | `Guest: the Wedding Caterer wants 3 watermelons, Fresh or Okay, top price $8.` | Uses the guest's card name. "After walk-ins" cut: every guest stands at the end of the row (RULES.md, Guest cards), so it is not special to this card. |
| `src/engine/data.ts:303` | Event card, morning news and top bar: title | `title: 'Mango Windfall'` | KEEP |  |  |
| `src/engine/data.ts:303` | Morning news and printed event card: flavour headline (mangoWindfall) | `It’s raining mangoes!` | CUT | **A: cut** (recommended) · B: `The mango trees dropped early.` | Tabloid "!" headline that repeats the title. |
| `src/engine/data.ts:303` | Morning news, event pop-up, printed event card, guidebook: rule (mangoWindfall) | `Deliver 1 extra ripe mango per 2 stalls, rounded up. Mango customers pay $2 less each.` | CORRECTNESS | Needs a decision. Possible wording: `The lorry brings 1 extra mango for every 2 stalls (round up). Customers pay $2 less for each mango.` | THE CARD AND THE GAME DISAGREE. The card (and RULES.md, and the printed effect bullet) say the extra mangoes are ripe. In the app they arrive Green with the rest of the lorry's mangoes (checked by running the engine: seed 2, day 4, 4 stalls: 3 mangoes, all in the Green box). The proposed text drops "ripe" so the card is true today; if the owner wants ripe mangoes, that is an engine fix, not a text fix. |
| `src/engine/data.ts:304` | Event card, morning news and top bar: title | `title: 'Pasar Malam'` | KEEP |  |  |
| `src/engine/data.ts:304` | Morning news and printed event card: flavour headline (pasarMalam) | `One last sale before closing!` | CUT | **A: cut** (recommended) · B: `The night market opens after the rush.` | Tabloid "!" headline that repeats the title. |
| `src/engine/data.ts:304` | Morning news, event pop-up, printed event card, guidebook: rule (pasarMalam) | `After the rush, a hawker buys 1 of each fruit left in every stall’s crate at $3 each. Any freshness!` | REWRITE | `After the rush, the night hawker buys 1 of each fruit left in every stall’s crate for $3 each, any freshness.` | "Night hawker" is what the sales summary and the guidebook call him. No "!". |
| `src/engine/data.ts:305` | Event card, morning news and top bar: title | `title: 'Bake-Off'` | KEEP |  |  |
| `src/engine/data.ts:307` | Morning news and printed event card: flavour headline (bakeOff) | `Ready, set, bake!` | CUT | **A: cut** (recommended) · B: `The town baking contest is today.` | Tabloid "!" headline that repeats the title. |
| `src/engine/data.ts:307` | Morning news, event pop-up, printed event card, guidebook: rule (bakeOff) | `Apple customers pay $1 more each. The bakery wants 2 Fresh/Okay apples at $7 each.` | REWRITE | `Customers pay $1 more for each apple. Guest: the Bakery wants 2 apples, Fresh or Okay, top price $7.` | Same pattern as the other guest cards. |
| `src/ui/game/panels/MorningCard.tsx:64` | Morning news on a day with no event: title | `title: 'Calm Day'` | KEEP |  |  |
| `src/ui/game/panels/MorningCard.tsx:64` | Morning news on a day with no event: flavour headline | `flavour: 'Clear skies, business as usual!'` | CUT | **cut** | Filler headline with "!" on a card that exists to say nothing happens. |
| `src/ui/game/panels/MorningCard.tsx:65` | Morning news when events are switched off | `'Events are off in this game.'` | KEEP |  |  |
| `src/ui/game/panels/MorningCard.tsx:65` | Morning news on Day 1 | `'Day 1! Let’s make some money!'` | REWRITE | `'No event on Day 1.'` | Two "!" and a pep line. The rule is that Day 1 has no event. |
| `src/ui/game/panels/MorningCard.tsx:65` | Morning news on a later day with no event | `'No event today.'` | KEEP |  |  |
| `src/ui/gazette.ts:16` | Printed event card only: red subhead (festival) | `Whole town turns out for the fair` | KEEP |  | Reads like a real headline; the one flavour line worth keeping per event. |
| `src/ui/gazette.ts:16` | Printed event card only: caption under the picture (festival) | `Lanterns, bunting and fireworks over a fruit stall.` | CUT | **cut** | Describes the picture printed directly above it. |
| `src/ui/gazette.ts:16` | Printed event card only: effect bullet (festival) | `'+$1 every fruit'` | REWRITE | `'+$1 every piece'` | "Piece" is one unit; "fruit" is the kind. |
| `src/ui/gazette.ts:16` | Printed event card only: effect bullet (festival) | `'+1 walk-in (+2 at 4-6)'` | KEEP |  |  |
| `src/ui/gazette.ts:17` | Printed event card only: red subhead (glut) | `Berry growers flood the market` | KEEP |  | Reads like a real headline; the one flavour line worth keeping per event. |
| `src/ui/gazette.ts:17` | Printed event card only: caption under the picture (glut) | `A handcart heaped with blueberries rolling across the cobbles.` | CUT | **cut** | Describes the picture printed directly above it. |
| `src/ui/gazette.ts:17` | Printed event card only: effect bullet (glut) | `'+1 blueberry per 2 stalls'` | KEEP |  |  |
| `src/ui/gazette.ts:17` | Printed event card only: effect bullet (glut) | `'Blueberry −$1'` | KEEP |  |  |
| `src/ui/gazette.ts:18` | Printed event card only: red subhead (heatwave) | `Record heat bakes the stalls` | KEEP |  | Reads like a real headline; the one flavour line worth keeping per event. |
| `src/ui/gazette.ts:18` | Printed event card only: caption under the picture (heatwave) | `A blazing sun, a thermometer and a cut watermelon.` | CUT | **cut** | Describes the picture printed directly above it. |
| `src/ui/gazette.ts:18` | Printed event card only: effect bullet (heatwave) | `'Watermelon +$2'` | KEEP |  |  |
| `src/ui/gazette.ts:18` | Printed event card only: effect bullet (heatwave) | `'Ages +1 step tonight'` | REWRITE | `'Fruit ages 2 steps tonight'` | Says what ages, and the number that results. |
| `src/ui/gazette.ts:19` | Printed event card only: red subhead (blight) | `Orchards hit, no apples today` | KEEP |  | Reads like a real headline; the one flavour line worth keeping per event. |
| `src/ui/gazette.ts:19` | Printed event card only: caption under the picture (blight) | `A bare apple tree with spotted apples and a crow.` | CUT | **cut** | Describes the picture printed directly above it. |
| `src/ui/gazette.ts:19` | Printed event card only: effect bullet (blight) | `'No new apples'` | KEEP |  |  |
| `src/ui/gazette.ts:19` | Printed event card only: effect bullet (blight) | `'Apple +$2'` | KEEP |  |  |
| `src/ui/gazette.ts:20` | Printed event card only: red subhead (mangoCraze) | `One video, and mangoes sell out` | REWRITE | `A mango video is going round` | "Sell out" is not what the card does (it adds \$2 and a guest). |
| `src/ui/gazette.ts:20` | Printed event card only: caption under the picture (mangoCraze) | `An influencer filming a glowing mango on a pedestal.` | CUT | **cut** | Describes the picture printed directly above it. |
| `src/ui/gazette.ts:20` | Printed event card only: effect bullet (mangoCraze) | `'Mango +$2'` | KEEP |  |  |
| `src/ui/gazette.ts:20` | Printed event card only: effect bullet (mangoCraze) | `'Influencer: 1 fresh at $15'` | REWRITE | `'Influencer: 1 Fresh at $15'` | Capital F for the state. |
| `src/ui/gazette.ts:21` | Printed event card only: red subhead (superfood) | `Health craze sweeps the gyms` | REWRITE | `Gyms tell members to eat blueberries` | "Sweeps" is headline filler. |
| `src/ui/gazette.ts:21` | Printed event card only: caption under the picture (superfood) | `A cheerful blueberry lifting a dumbbell, with a smoothie.` | CUT | **cut** | Describes the picture printed directly above it. |
| `src/ui/gazette.ts:21` | Printed event card only: effect bullet (superfood) | `'Blueberry +$1'` | KEEP |  |  |
| `src/ui/gazette.ts:21` | Printed event card only: effect bullet (superfood) | `'Gym Club: 2 at $8'` | KEEP |  |  |
| `src/ui/gazette.ts:22` | Printed event card only: red subhead (goodHarvest) | `Bumper crop fills every cart` | KEEP |  | Reads like a real headline; the one flavour line worth keeping per event. |
| `src/ui/gazette.ts:22` | Printed event card only: caption under the picture (goodHarvest) | `A rising sun over golden fields and an overflowing crate.` | CUT | **cut** | Describes the picture printed directly above it. |
| `src/ui/gazette.ts:22` | Printed event card only: effect bullet (goodHarvest) | `'+1 fruit per 4 stalls'` | CORRECTNESS | `'+1 of each fruit per 4 stalls'` | Reads as one extra piece in total. The card adds 1 of each of the four fruits for every 4 stalls. |
| `src/ui/gazette.ts:22` | Printed event card only: effect bullet (goodHarvest) | `'Customers −$1'` | KEEP |  |  |
| `src/ui/gazette.ts:23` | Printed event card only: red subhead (badHarvest) | `Storms ruin half the crop` | KEEP |  | Reads like a real headline; the one flavour line worth keeping per event. |
| `src/ui/gazette.ts:23` | Printed event card only: caption under the picture (badHarvest) | `Storm clouds, rain, flattened wheat and a half-empty crate.` | CUT | **cut** | Describes the picture printed directly above it. |
| `src/ui/gazette.ts:23` | Printed event card only: effect bullet (badHarvest) | `'Half delivery'` | REWRITE | `'Half a lorry'` | "Delivery" is a second word for the lorry. |
| `src/ui/gazette.ts:23` | Printed event card only: effect bullet (badHarvest) | `'Customers +$1'` | KEEP |  |  |
| `src/ui/gazette.ts:24` | Printed event card only: red subhead (priceHike) | `Wholesalers raise every price` | KEEP |  | Reads like a real headline; the one flavour line worth keeping per event. |
| `src/ui/gazette.ts:24` | Printed event card only: caption under the picture (priceHike) | `A chalkboard with a rising line, an arrow and piles of coins.` | CUT | **cut** | Describes the picture printed directly above it. |
| `src/ui/gazette.ts:24` | Printed event card only: effect bullet (priceHike) | `'Market costs +$1'` | REWRITE | `'Wholesale Market +$1'` | "Market" alone means five different things in this game. |
| `src/ui/gazette.ts:25` | Printed event card only: red subhead (priceControls) | `Committee puts a ceiling on prices` | REWRITE | `Committee sets a top price for each fruit` | "Puts a ceiling on" said plainly. |
| `src/ui/gazette.ts:25` | Printed event card only: caption under the picture (priceControls) | `A striped barrier with price tags hanging over each fruit.` | CUT | **cut** | Describes the picture printed directly above it. |
| `src/ui/gazette.ts:25` | Printed event card only: effect bullet (priceControls) | `'Blueberry $5'` | KEEP |  |  |
| `src/ui/gazette.ts:25` | Printed event card only: effect bullet (priceControls) | `'Watermelon $7'` | KEEP |  |  |
| `src/ui/gazette.ts:25` | Printed event card only: effect bullet (priceControls) | `'Apple $6'` | KEEP |  |  |
| `src/ui/gazette.ts:25` | Printed event card only: effect bullet (priceControls) | `'Mango $10'` | KEEP |  |  |
| `src/ui/gazette.ts:26` | Printed event card only: red subhead (inspector) | `Inspector checks every shelf` | KEEP |  | Reads like a real headline; the one flavour line worth keeping per event. |
| `src/ui/gazette.ts:26` | Printed event card only: caption under the picture (inspector) | `An inspector with a cap and moustache examining soft apples through a magnifier.` | CUT | **cut** | Describes the picture printed directly above it. |
| `src/ui/gazette.ts:26` | Printed event card only: effect bullet (inspector) | `'$2 per soft fruit'` | REWRITE | `'$2 per Soft piece'` | Capital S for the state; "piece". |
| `src/ui/gazette.ts:26` | Printed event card only: effect bullet (inspector) | `'Start of day'` | KEEP |  |  |
| `src/ui/gazette.ts:27` | Printed event card only: red subhead (strike) | `Supply lorry breaks down` | KEEP |  | Reads like a real headline; the one flavour line worth keeping per event. |
| `src/ui/gazette.ts:27` | Printed event card only: caption under the picture (strike) | `A lorry with a flat wheel and steaming engine, fruit spilled on the road.` | CUT | **cut** | Describes the picture printed directly above it. |
| `src/ui/gazette.ts:27` | Printed event card only: effect bullet (strike) | `'No delivery'` | REWRITE | `'No lorry'` | As above. The app chip already says "No lorry today". |
| `src/ui/gazette.ts:28` | Printed event card only: red subhead (hotel) | `Hotel kitchen places a big order` | KEEP |  | Reads like a real headline; the one flavour line worth keeping per event. |
| `src/ui/gazette.ts:28` | Printed event card only: caption under the picture (hotel) | `A hotel chef at the counter with a service bell, a silver cloche and an order slip.` | CUT | **cut** | Describes the picture printed directly above it. |
| `src/ui/gazette.ts:28` | Printed event card only: effect bullet (hotel) | `'Apple $8'` | KEEP |  |  |
| `src/ui/gazette.ts:28` | Printed event card only: effect bullet (hotel) | `'Watermelon $8'` | KEEP |  |  |
| `src/ui/gazette.ts:28` | Printed event card only: effect bullet (hotel) | `'Blueberry $7'` | KEEP |  |  |
| `src/ui/gazette.ts:29` | Printed event card only: red subhead (touristBus) | `Coach pulls up full of hungry visitors` | REWRITE | `Tour bus stops at the market` | "Hungry visitors" is the flavour line again. |
| `src/ui/gazette.ts:29` | Printed event card only: caption under the picture (touristBus) | `A painted tour bus unloading cameras and sun hats.` | CUT | **cut** | Describes the picture printed directly above it. |
| `src/ui/gazette.ts:29` | Printed event card only: effect bullet (touristBus) | `'+2 walk-ins (+3 at 4, +4 at 5-6)'` | KEEP |  |  |
| `src/ui/gazette.ts:30` | Printed event card only: red subhead (monsoon) | `Downpour keeps shoppers at home` | KEEP |  | Reads like a real headline; the one flavour line worth keeping per event. |
| `src/ui/gazette.ts:30` | Printed event card only: caption under the picture (monsoon) | `Rain sheeting off the awnings, puddles round the crates.` | CUT | **cut** | Describes the picture printed directly above it. |
| `src/ui/gazette.ts:30` | Printed event card only: effect bullet (monsoon) | `'−1 walk-in (−2 at 4-6)'` | KEEP |  |  |
| `src/ui/gazette.ts:30` | Printed event card only: effect bullet (monsoon) | `'Nothing ages tonight'` | KEEP |  |  |
| `src/ui/gazette.ts:31` | Printed event card only: red subhead (durian) | `The king of fruits steals the show` | REWRITE | `Durian season: customers buy durian first` | "Steals the show" is the flavour line again. |
| `src/ui/gazette.ts:31` | Printed event card only: caption under the picture (durian) | `A spiky durian crowned on its throne, its smell drifting out.` | CUT | **cut** | Describes the picture printed directly above it. |
| `src/ui/gazette.ts:31` | Printed event card only: effect bullet (durian) | `'Market costs −$1'` | REWRITE | `'Wholesale Market −$1'` | As above. |
| `src/ui/gazette.ts:31` | Printed event card only: effect bullet (durian) | `'Customers −$1'` | KEEP |  |  |
| `src/ui/gazette.ts:32` | Printed event card only: red subhead (kenduri) | `Wedding feast needs watermelon` | KEEP |  | Reads like a real headline; the one flavour line worth keeping per event. |
| `src/ui/gazette.ts:32` | Printed event card only: caption under the picture (kenduri) | `A caterer with a long table, garlands and a wedding cake.` | CUT | **cut** | Describes the picture printed directly above it. |
| `src/ui/gazette.ts:32` | Printed event card only: effect bullet (kenduri) | `'Caterer: 3 watermelons at $8'` | KEEP |  |  |
| `src/ui/gazette.ts:33` | Printed event card only: red subhead (mangoWindfall) | `Storm shakes the mango trees` | KEEP |  | Reads like a real headline; the one flavour line worth keeping per event. |
| `src/ui/gazette.ts:33` | Printed event card only: caption under the picture (mangoWindfall) | `Ripe mangoes tumbling from a tree into a waiting basket.` | CUT | **cut** | Describes the picture printed directly above it. |
| `src/ui/gazette.ts:33` | Printed event card only: effect bullet (mangoWindfall) | `'+1 ripe mango per 2 stalls'` | CORRECTNESS | `'+1 mango per 2 stalls'` | See Mango Windfall above: in the app the extra mangoes arrive Green, not ripe. |
| `src/ui/gazette.ts:33` | Printed event card only: effect bullet (mangoWindfall) | `'Mango −$2'` | KEEP |  |  |
| `src/ui/gazette.ts:34` | Printed event card only: red subhead (pasarMalam) | `Night market lights up the square` | KEEP |  | Reads like a real headline; the one flavour line worth keeping per event. |
| `src/ui/gazette.ts:34` | Printed event card only: caption under the picture (pasarMalam) | `Lanterns, food carts and a hawker counting coins.` | CUT | **cut** | Describes the picture printed directly above it. |
| `src/ui/gazette.ts:34` | Printed event card only: effect bullet (pasarMalam) | `'Hawker buys 1 of each crate fruit'` | REWRITE | `'Hawker buys 1 of each fruit in your crate'` | "Crate fruit" is shorthand nobody says. |
| `src/ui/gazette.ts:34` | Printed event card only: effect bullet (pasarMalam) | `'$3 each, any freshness'` | KEEP |  |  |
| `src/ui/gazette.ts:35` | Printed event card only: red subhead (bakeOff) | `Town bake-off wants the best apples` | REWRITE | `Town baking contest needs apples` | "The best apples" is praise; the Bakery takes Okay apples too. |
| `src/ui/gazette.ts:35` | Printed event card only: caption under the picture (bakeOff) | `A baker with a prize ribbon and a steaming apple pie.` | CUT | **cut** | Describes the picture printed directly above it. |
| `src/ui/gazette.ts:35` | Printed event card only: effect bullet (bakeOff) | `'Apple +$1'` | KEEP |  |  |
| `src/ui/gazette.ts:35` | Printed event card only: effect bullet (bakeOff) | `'Bakery: 2 apples at $7'` | KEEP |  |  |
| `src/ui/cards.tsx:149` | Printed event card: masthead (front and back) | `<header class="x-gz-mast">Fruit Market</header>` | KEEP |  |  |
| `src/ui/cards.tsx:150` | Printed event card back: strip under the masthead | `<span>Morning edition · One cent</span><span>Event card</span>` | REWRITE | `<span>Event card</span>` | "Morning edition · One cent" is newspaper dressing; nothing in the game costs one cent. |
| `src/ui/cards.tsx:151` | Printed event card back: heading | `<strong class="x-gz-head">Today’s news</strong>` | KEEP |  |  |
| `src/ui/cards.tsx:152` | Printed event card back: seal | `<b class="x-gz-seal">Extra!</b></div>` | CUT | **cut** | Newspaper shout; decoration only. |
| `src/ui/cards.tsx:153` | Printed event card back: foot | `Event · one each morning from Day 2` | KEEP |  |  |
| `src/ui/cards.tsx:167` | Printed event card front: strip under the masthead | `` <span>Morning edition · One cent</span><span>{`No. ${two(num)}`}</span> `` | REWRITE | `` <span>Event card</span><span>{`No. ${two(num)}`}</span> `` | As on the back. |
| `src/ui/cards.tsx:169` | Printed event card front: seal beside the title | `<b class="x-gz-seal" aria-hidden="true">Extra!</b>` | CUT | **cut** | As on the back. |
| `src/ui/cards.tsx:37` | Any card whose picture is missing (none today) | `Art coming</div>` | KEEP |  |  |
| `src/ui/game/panels/MorningCard.tsx:39` | Morning news chip under "+\$1" or "−\$1" | `small: 'Every customer pays'` | KEEP |  |  |
| `src/ui/game/panels/MorningCard.tsx:40` | Morning news chip under "+\$2" | `` small: `Per ${FRUIT[f].name}` `` | REWRITE | `` small: `Per ${FRUIT[f].name.toLowerCase()}` `` | Sentence case: "Per mango", not "Per Mango". |
| `src/ui/game/panels/MorningCard.tsx:41` | Morning news chip under "+\$1" or "−\$1" (Price Hike, Durian Season) | `small: 'Market prices'` | REWRITE | `small: 'Wholesale Market'` | This is the buying cost, not what customers pay. "Market prices" could be read either way. |
| `src/ui/game/panels/MorningCard.tsx:42` | Morning news chip (Price Controls) | `{ big: 'Max', small: 'Prices are capped' }` | REWRITE | `{ big: 'Limit', small: 'On every price' }` | "Capped" is jargon; the card calls them limits. |
| `src/ui/game/panels/MorningCard.tsx:43` | Morning news chip under "−\$2" (Health Inspector) | `small: 'Per soft piece'` | REWRITE | `small: 'Per Soft piece'` | Capital S for the state. |
| `src/ui/game/panels/MorningCard.tsx:44` | Morning news chip (Festival, Tourist Bus, Monsoon Downpour) | `big: e.walkIns > 0 ? 'More' : 'Fewer', small: 'Walk-ins today'` | KEEP |  |  |
| `src/ui/game/panels/MorningCard.tsx:45` | Morning news chip (guest events) | `{ big: 'Guest', small: 'A special customer' }` | REWRITE | `{ big: 'Guest', small: 'Joins the row' }` | "Special customer" is a fourth name for a guest. Say what happens. |
| `src/ui/game/panels/MorningCard.tsx:46` | Morning news chip (Lorry Breakdown) | `{ big: 'No', small: 'Lorry today' }` | KEEP |  |  |
| `src/ui/game/panels/MorningCard.tsx:47` | Morning news chip (Apple Blight) | `` big: 'No', small: `${FRUIT[e.noFruit].plural} today` `` | REWRITE | `` big: 'No', small: `${FRUIT[e.noFruit].plural.toLowerCase()} today` `` | Sentence case: "No apples today". |
| `src/ui/game/panels/MorningCard.tsx:48` | Morning news chip (Bad Harvest) | `{ big: 'Half', small: 'The delivery' }` | REWRITE | `{ big: 'Half', small: 'A lorry today' }` | "Delivery" is a second word for the lorry. |
| `src/ui/game/panels/MorningCard.tsx:49` | Morning news chip (Good Harvest) | `{ big: 'Extra', small: 'Of every fruit' }` | KEEP |  |  |
| `src/ui/game/panels/MorningCard.tsx:50` | Morning news chip (Blueberry Glut, Mango Windfall) | `` big: 'Extra', small: `${FRUIT[f].plural} today` `` | REWRITE | `` big: 'Extra', small: `${FRUIT[f].plural.toLowerCase()} today` `` | Sentence case. |
| `src/ui/game/panels/MorningCard.tsx:51` | Morning news chip under "\$3" (Pasar Malam) | `small: 'Night hawker pays'` | KEEP |  |  |
| `src/ui/game/panels/MorningCard.tsx:52` | Morning news chip (Heatwave "+1", Monsoon Downpour "None") | `small: e.ageExtra > 0 ? 'Age step tonight' : 'Ageing tonight'` | REWRITE | `small: e.ageExtra > 0 ? 'Extra ageing tonight' : 'Ageing tonight'` | "+1 Age step tonight" is not a sentence; "+1 Extra ageing tonight" is. |
| `src/ui/cards.tsx:166` | Printed event card front: masthead | `<header class="x-gz-mast">Fruit Market</header>` | KEEP |  |  |

## Cards · lorries (20)

A lorry's name is shown in the app in "Tomorrow's lorry: NAME" (morning card and under the Wholesale Market) and is the title of the printed lorry card. Only one name carries a rule (Seconds Lorry). Three names are a second word for lorry (Wagon, Cart, Truck), three end in "Run", and two clash with game terms (Mango Rush with the rush; Premium Picks with Premium customers). Option A is to drop the name from the app strip (the fruit icons and numbers already say what is coming) and keep it on printed cards only. Option B is the plain name shown, which says what is on the lorry. Limit: the printed title box was checked up to 22 characters.

| File:line | Where shown | Current text | Verdict | Proposed | Reason |
|---|---|---|---|---|---|
| `src/engine/data.ts:120` | Lorry card title; "Tomorrow's lorry" strip in the app | `Blueberry Bonanza` | REWRITE | A: cut · **B:** `Blueberry Lorry` (recommended) | Alliteration. |
| `src/engine/data.ts:121` | Lorry card title; "Tomorrow's lorry" strip in the app | `Watermelon Wagon` | REWRITE | A: cut · **B:** `Watermelon Lorry` (recommended) | Alliteration; a wagon is not a lorry. |
| `src/engine/data.ts:122` | Lorry card title; "Tomorrow's lorry" strip in the app | `Orchard Run` | REWRITE | A: cut · **B:** `Apple Lorry` (recommended) | One of three "Run" names; say the fruit. |
| `src/engine/data.ts:123` | Lorry card title; "Tomorrow's lorry" strip in the app | `Highland Apples` | KEEP | **Keep as is** (recommended) · A: cut | Plain and specific. |
| `src/engine/data.ts:124` | Lorry card title; "Tomorrow's lorry" strip in the app | `Mango Rush` | REWRITE | A: cut · **B:** `Mango Lorry` (recommended) | "Rush" is a game term (step 5 of the day). |
| `src/engine/data.ts:125` | Lorry card title; "Tomorrow's lorry" strip in the app | `Mango Growers` | KEEP | **Keep as is** (recommended) · A: cut | Plain. |
| `src/engine/data.ts:126` | Lorry card title; "Tomorrow's lorry" strip in the app | `Mango Season` | KEEP | **Keep as is** (recommended) · A: cut | Plain. |
| `src/engine/data.ts:127` | Lorry card title; "Tomorrow's lorry" strip in the app | `Summer Run` | REWRITE | A: cut · **B:** `Berries and Melons` (recommended) | Names the two fruits it carries (blueberry and watermelon). |
| `src/engine/data.ts:128` | Lorry card title; "Tomorrow's lorry" strip in the app | `Tropical Pair` | REWRITE | A: cut · **B:** `Melons and Mangoes` (recommended) | Names the two fruits it carries (watermelon and mango). |
| `src/engine/data.ts:129` | Lorry card title; "Tomorrow's lorry" strip in the app | `Breakfast Run` | REWRITE | A: cut · **B:** `Berries and Apples` (recommended) | Names the two fruits it carries (blueberry and apple). |
| `src/engine/data.ts:130` | Lorry card title; "Tomorrow's lorry" strip in the app | `Premium Picks` | REWRITE | A: cut · **B:** `Apples and Mangoes` (recommended) | Alliteration, and "Premium" is a customer type. |
| `src/engine/data.ts:131` | Lorry card title; "Tomorrow's lorry" strip in the app | `Mixed Basket` | KEEP | **Keep as is** (recommended) · A: cut | Plain. |
| `src/engine/data.ts:132` | Lorry card title; "Tomorrow's lorry" strip in the app | `Balanced Cart` | REWRITE | A: cut · **B:** `Even Load` (recommended) | A cart is not a lorry. |
| `src/engine/data.ts:133` | Lorry card title; "Tomorrow's lorry" strip in the app | `Farmer\'s Choice` | KEEP | **Keep as is** (recommended) · A: cut | Plain. |
| `src/engine/data.ts:134` | Lorry card title; "Tomorrow's lorry" strip in the app | `Kampung Truck` | REWRITE | A: cut · **B:** `Kampung Lorry` (recommended) | A truck is a lorry everywhere else in the game. RULES.md names this card. |
| `src/engine/data.ts:135` | Lorry card title; "Tomorrow's lorry" strip in the app | `Quiet Delivery` | REWRITE | A: cut · **B:** `Small Load` (recommended) | Says what it is: the lightest lorry. |
| `src/engine/data.ts:136` | Lorry card title; "Tomorrow's lorry" strip in the app | `Short Load` | KEEP | **Keep as is** (recommended) · A: cut | Plain. |
| `src/engine/data.ts:137` | Lorry card title; "Tomorrow's lorry" strip in the app | `Convoy` | KEEP | **Keep as is** (recommended) · A: cut | One plain word for the heaviest load. |
| `src/engine/data.ts:138` | Lorry card title; "Tomorrow's lorry" strip in the app | `Wholesaler\'s Overstock` | REWRITE | A: cut · **B:** `Overstock` (recommended) | Shorter; 22 characters is the longest title on any card. |
| `src/engine/data.ts:139` | Lorry card title; "Tomorrow's lorry" strip in the app | `Seconds Lorry` | KEEP | **Keep as is** (recommended) · A: cut | Carries a rule (its fruit arrives Okay). RULES.md and the guidebook name it. |

## Cards · favour cards (6)

Shown in the pop-up when a favour card is tapped, as a tooltip on the card, on the printed favour card and in the guidebook table. Three of the six start with "Play in the evening:" or similar. The printed card already prints "Play in the / Evening" in its own box, and the guidebook has a "When" column, so the timing is said twice. Note for whoever applies this: scripts/print-update.ts line 268 strips those prefixes with a pattern; once the prefixes are gone from the data the pattern can go too.

| File:line | Where shown | Current text | Verdict | Proposed | Reason |
|---|---|---|---|---|---|
| `src/engine/data.ts:315` | Favour card: title | `title: 'Gossip'` | KEEP |  |  |
| `src/engine/data.ts:316` | Favour card: title | `title: 'Free Fruit'` | KEEP |  |  |
| `src/engine/data.ts:317` | Favour card: title | `title: 'Priority'` | KEEP |  |  |
| `src/engine/data.ts:318` | Favour card: title | `title: 'Scout'` | KEEP |  |  |
| `src/engine/data.ts:319` | Favour card: title | `title: 'Favoured Trade'` | KEEP |  |  |
| `src/engine/data.ts:320` | Favour card: title | `title: 'Fridge'` | KEEP |  |  |
| `src/engine/data.ts:315` | Favour card text: Gossip | `Play in the evening: secretly see tomorrow\'s walk-ins: who they are, what they want, how many and their top price.` | REWRITE | `Play in the evening: look at all of tomorrow\'s walk-ins. Only you see them.` | Two colons in one sentence, and a four-part list of what is printed on a card. "Look at" matches Scout. |
| `src/engine/data.ts:316` | Favour card text: Free Fruit | `Take one fruit of your choice from the Wholesale Market for free.` | REWRITE | `Play on your buying turn: take 1 piece from the Wholesale Market for free.` | One of two buying-turn cards that did not say when to play them. "Of your choice" is implied; "piece". |
| `src/engine/data.ts:317` | Favour card text: Priority | `Play in the evening: you buy first tomorrow.` | KEEP |  |  |
| `src/engine/data.ts:318` | Favour card text: Scout | `Play on your buying turn: look at the front of one walk-in who arrives today. Everyone sees you played it, but not what you saw.` | REWRITE | `Play on your buying turn: look at one of today\'s walk-ins. Everyone sees that you played it, not what you saw.` | Shorter; same rule. |
| `src/engine/data.ts:319` | Favour card text: Favoured Trade | `Play while pricing: you win every tied price today.` | REWRITE | `Play at the bell: you win every tied price today.` | "Pricing" is not one of the named steps of the day; the step is the bell (RULES.md and the guidebook both say "At the bell"). If applied, scripts/print-update.ts:268 and scripts/print-deck.ts:312 match the old words and need the same change. |
| `src/engine/data.ts:320` | Favour card text: Fridge | `All your ripe fruit becomes one step fresher.` | REWRITE | `Play on your buying turn: every ripe piece on your shelf becomes one step fresher.` | The other buying-turn card that did not say when to play it. "Ripe" is kept on purpose: it means Fresh, Okay and Soft, and Green fruit is not helped. |

## Cards · upgrades (5)

Shown on the evening after a Market Day, on the printed upgrade card and in the guidebook table.

| File:line | Where shown | Current text | Verdict | Proposed | Reason |
|---|---|---|---|---|---|
| `src/engine/data.ts:361` | Upgrade card: title | `title: 'Juice Bar'` | KEEP |  |  |
| `src/engine/data.ts:366` | Upgrade card: title | `title: 'Handcart'` | KEEP |  |  |
| `src/engine/data.ts:367` | Upgrade card: title | `title: 'Premium Display'` | KEEP |  |  |
| `src/engine/data.ts:368` | Upgrade card: title | `title: 'Ripening Room'` | KEEP |  |  |
| `src/engine/data.ts:369` | Upgrade card: title | `title: 'Order Book'` | KEEP |  |  |
| `src/engine/data.ts:364` | Upgrade card text: Juice Bar | `` `+$${JUICE_TIP} for each okay or soft fruit you sell. Each night up to ${JUICE_CAP} pieces that would spoil become juice: $${JUICE_VALUE} each. Tip: before the last day, $${TIRED_COST} soft fruit makes $${JUICE_VALUE} of juice.` `` | REWRITE | `` `+$${JUICE_TIP} for each Okay or Soft piece you sell. Each night up to ${JUICE_CAP} of your pieces that would spoil become juice: $${JUICE_VALUE} each.` `` | The "Tip:" sentence is strategy advice on a rules card, and this is the longest card text in the game (the printed box holds four lines at most). The tip was added on purpose (REP-089 option C), so cutting it is the owner's call. Capitals for the states; "piece". |
| `src/engine/data.ts:366` | Upgrade card text: Handcart | `` `Buy up to ${BARROW_BUY} pieces of fruit a day and hold ${BARROW_SHELF}.` `` | REWRITE | `` `Buy up to ${BARROW_BUY} pieces a day. Your shelf holds ${BARROW_SHELF}.` `` | One fact per sentence; "hold" becomes "your shelf holds". |
| `src/engine/data.ts:367` | Upgrade card text: Premium Display | `Your fresh fruit may be priced $1 above what customers normally pay.` | REWRITE | `You may price a Fresh piece $1 above a customer\'s top price.` | "What customers normally pay" is the top price; use the term. |
| `src/engine/data.ts:368` | Upgrade card text: Ripening Room | `Your green mangoes ripen in one night instead of two.` | REWRITE | `Your Green mangoes ripen in 1 night instead of 2.` | Digits; capital G. |
| `src/engine/data.ts:369` | Upgrade card text: Order Book | `You win tied bids for standing orders, and your standing-order fines are halved.` | REWRITE | `You win tied bids for standing orders. Your standing-order fines are halved.` | One fact per sentence. |

## Cards · shopkeepers (8): names, perks, quips and what they say in the rush

A shopkeeper has a name (owner-approved, DEC-064: unchanged), one perk (title and rule), a "quip" (shown in quotes under the picker and on the printed stall sign), and 10 lines it can say as a small speech tag over its stall in the rush when a computer plays it: 80 lines in all. The rush pop-up already shows a result line, a detail line, a tag on every stall and the customer's reaction, so the rival's speech is a fifth text for one sale. Several lines are written for animals ("Squawk!", "You beat the old tortoise", "Little bird told me"); the shopkeepers have been people since DEC-040. Many others say "you", although since PLAN-068 the same line is shown to everyone and fires when any stall won. Recommendation: cut the 8 quips; keep one line per shopkeeper per situation (32 lines) and cut the other 48. The line to keep is marked B.

| File:line | Where shown | Current text | Verdict | Proposed | Reason |
|---|---|---|---|---|---|
| `src/engine/data.ts:435` | Perk title (stall sign, picker, rival pop-up, guidebook) | `title: 'Haggler'` | KEEP |  |  |
| `src/engine/data.ts:436` | Perk title (stall sign, picker, rival pop-up, guidebook) | `title: 'Big Basket'` | KEEP |  |  |
| `src/engine/data.ts:437` | Perk title (stall sign, picker, rival pop-up, guidebook) | `title: 'Bargain Hunter'` | KEEP |  |  |
| `src/engine/data.ts:438` | Perk title (stall sign, picker, rival pop-up, guidebook) | `title: 'Charmer'` | KEEP |  |  |
| `src/engine/data.ts:439` | Perk title (stall sign, picker, rival pop-up, guidebook) | `title: 'Tip Jar'` | KEEP |  |  |
| `src/engine/data.ts:440` | Perk title (stall sign, picker, rival pop-up, guidebook) | `title: 'Nest Egg'` | KEEP |  |  |
| `src/engine/data.ts:441` | Perk title (stall sign, picker, rival pop-up, guidebook) | `title: 'Shade Cloth'` | KEEP |  |  |
| `src/engine/data.ts:442` | Perk title (stall sign, picker, rival pop-up, guidebook) | `title: 'Sharp Ears'` | KEEP |  |  |
| `src/engine/data.ts:435` | Perk text: Haggler (Rosa) | `You win tied prices against equally fresh fruit.` | REWRITE | `You win a tied price when your piece is as fresh as the rival\'s.` | Says who the tie is with. Same rule: fresher fruit still wins first. |
| `src/engine/data.ts:436` | Perk text: Big Basket (Uncle Benny) | `Buy 1 extra fruit every day, at the normal price.` | REWRITE | `Buy 1 extra piece each day.` | "At the normal price" answers a question from an older rule (the extra piece used to cost more); nothing on the card suggests a different price now. "Piece". |
| `src/engine/data.ts:437` | Perk text: Bargain Hunter (Raj) | `Your first fruit each day costs $1 less (never below $1).` | REWRITE | `Your first piece each day costs $1 less (never below $1).` | "Piece". |
| `src/engine/data.ts:438` | Perk text: Charmer (Ah Chen) | `Start with 4 favour cards, hold up to 4, and earn up to 2 favour cards a day.` | REWRITE | `Start with 4 favour cards. Hold up to 4. Earn up to 2 a day.` | One fact per sentence. |
| `src/engine/data.ts:439` | Perk text: Tip Jar (Kiki) | `` `Customers you serve completely by yourself tip you $${LOCAL_FAVOURITE_TIP}.` `` | KEEP |  | Already one plain sentence, and "completely by yourself" is the exact rule. |
| `src/engine/data.ts:440` | Perk text: Nest Egg (Saleh) | `` `Start with $${START_CASH + NEST_EGG_BONUS} instead of $${START_CASH}, and buy first on day 3.` `` | REWRITE | `` `Start with $${START_CASH + NEST_EGG_BONUS} instead of $${START_CASH}. Buy first on Day 3.` `` | One fact per sentence; "Day 3" capitalised as on the top bar. |
| `src/engine/data.ts:441` | Perk text: Shade Cloth (Pak Din) | `Each night, name one fruit: none of your pieces of that fruit age tonight.` | REWRITE | `Each night, name 1 fruit. Your pieces of that fruit do not age tonight.` | One fact per sentence. |
| `src/engine/data.ts:442` | Perk text: Sharp Ears (Farah) | `Each evening, peek at one of tomorrow\'s walk-ins. A walk-in you have seen tips $1 if you sell to them ($2 at 4 to 6 stalls).` | CORRECTNESS | Needs a decision. Possible wording: `When buying ends, look at one of tomorrow\'s walk-ins. A walk-in you have seen tips you $1 when you sell to them ($2 at 4 to 6 stalls).` | TIMING IS WRONG AGAINST THE APP: the card says "each evening" but the app shows Farah the walk-in when buying ends, before stocking (engine: customersArrive). RULES.md says "evening" in the perk table and "when buying ends" in the table-play section. This is the parked "Sharp Ears timing" item in STATE.md; the proposed text follows the app. |
| `src/ui/cards.tsx:136` | Stall sign (picker and printed card): chalkboard heading | `` `Today’s special: ${trait.title}` `` | REWRITE | `` `Perk: ${trait.title}` `` | A perk lasts the whole game, not today. "Special" is a third word for perk. |
| `src/ui/cards.tsx:133` | Stall sign in the picker: stamp on a shopkeeper another stall has | `` `Taken by ${takenBy}` `` | KEEP |  |  |
| `src/ui/cards.tsx:120` | Stall sign: name when the shopkeeper is unknown (never seen in normal play) | `'Shopkeeper'` | KEEP |  |  |
| `src/engine/data.ts:524` | Shopkeeper name (stall sign, table, results) | `name: 'Rosa'` | KEEP |  | Owner-approved name (DEC-064). |
| `src/engine/data.ts:524` | Picker (under the sign, in quotes) and printed stall sign: quip (Rosa) | `quip: 'Too easy!'` | CUT | **A: cut** (recommended) · B: `Ask around. Mine is always a little cheaper.` | Brag with "!". The sign already shows the name, the picture and the perk. |
| `src/engine/data.ts:525` | Rush: speech tag over Rosa's stall (won by pricing \$1 or \$2 lower) | `'Too easy!'` | CUT | **A: cut** (recommended) · B: none offered | Brag with "!". |
| `src/engine/data.ts:525` | Rush: speech tag over Rosa's stall (won by pricing \$1 or \$2 lower) | `'A dollar cheaper. Sorry, not sorry!'` | REWRITE | A: cut · **B:** `'Mine was cheaper.'` (recommended) | The one line kept for this situation, without the shout. |
| `src/engine/data.ts:525` | Rush: speech tag over Rosa's stall (won by pricing \$1 or \$2 lower) | `'Sharper than you again!'` | CUT | **A: cut** (recommended) · B: none offered | Brag at the player. |
| `src/engine/data.ts:526` | Rush: speech tag over Rosa's stall (sold at the top price) | `'Full price? Lovely.'` | CUT | **A: cut** (recommended) · B: none offered | One line per situation is enough. |
| `src/engine/data.ts:526` | Rush: speech tag over Rosa's stall (sold at the top price) | `'They didn\'t even haggle!'` | REWRITE | A: cut · **B:** `'They didn\'t even haggle.'` (recommended) | The one line kept for this situation, without the shout. |
| `src/engine/data.ts:527` | Rush: speech tag over Rosa's stall (lost by \$1 or on a tie) | `'Hmph. Lucky.'` | CUT | **A: cut** (recommended) · B: none offered | Fine, but one line is enough. |
| `src/engine/data.ts:527` | Rush: speech tag over Rosa's stall (lost by \$1 or on a tie) | `'That one was mine!'` | REWRITE | A: cut · **B:** `'That one was mine.'` (recommended) | The one line kept for this situation, without the shout. |
| `src/engine/data.ts:527` | Rush: speech tag over Rosa's stall (lost by \$1 or on a tie) | `'Next time, darling.'` | CUT | **A: cut** (recommended) · B: none offered | Talks down to the player. |
| `src/engine/data.ts:528` | Rush: speech tag over Rosa's stall (lost by \$2 or more) | `'Fine, keep your customer.'` | REWRITE | A: cut · **B:** `'Fine. I priced too high.'` (recommended) | The one line kept for this situation, without the shout. |
| `src/engine/data.ts:528` | Rush: speech tag over Rosa's stall (lost by \$2 or more) | `'I meant to do that.'` | CUT | **A: cut** (recommended) · B: none offered | Stock joke. |
| `src/engine/data.ts:529` | Shopkeeper name (stall sign, table, results) | `name: 'Uncle Benny'` | KEEP |  | Owner-approved name (DEC-064). |
| `src/engine/data.ts:529` | Picker (under the sign, in quotes) and printed stall sign: quip (Uncle Benny) | `quip: 'Big baskets, big deals!'` | CUT | **A: cut** (recommended) · B: `Thirty years at this stall.` | Paired slogan ("big... big"). The sign already shows the name, the picture and the perk. |
| `src/engine/data.ts:530` | Rush: speech tag over Uncle Benny's stall (won by pricing \$1 or \$2 lower) | `'Big baskets, big deals!'` | CUT | **A: cut** (recommended) · B: none offered | Catchphrase. |
| `src/engine/data.ts:530` | Rush: speech tag over Uncle Benny's stall (won by pricing \$1 or \$2 lower) | `'Cheaper AND bigger.'` | REWRITE | A: cut · **B:** `'Cheaper at my stall.'` (recommended) | The one line kept for this situation, without the shout. |
| `src/engine/data.ts:530` | Rush: speech tag over Uncle Benny's stall (won by pricing \$1 or \$2 lower) | `'Fill the basket, friend!'` | CUT | **A: cut** (recommended) · B: none offered | Catchphrase. |
| `src/engine/data.ts:531` | Rush: speech tag over Uncle Benny's stall (sold at the top price) | `'Top dollar! Ka-ching!'` | CUT | **A: cut** (recommended) · B: none offered | Sound effect. |
| `src/engine/data.ts:531` | Rush: speech tag over Uncle Benny's stall (sold at the top price) | `'Full price, full basket!'` | REWRITE | A: cut · **B:** `'Full price. No bargaining.'` (recommended) | The one line kept for this situation, without the shout. |
| `src/engine/data.ts:532` | Rush: speech tag over Uncle Benny's stall (lost by \$1 or on a tie) | `'Aiyo, my customer!'` | REWRITE | A: cut · **B:** `'Aiyo, my customer.'` (recommended) | The one line kept for this situation, without the shout. |
| `src/engine/data.ts:532` | Rush: speech tag over Uncle Benny's stall (lost by \$1 or on a tie) | `'I want a recount.'` | CUT | **A: cut** (recommended) · B: none offered | Joke that needs a referee; there is none. |
| `src/engine/data.ts:532` | Rush: speech tag over Uncle Benny's stall (lost by \$1 or on a tie) | `'You were quicker. Hmph.'` | CUT | **A: cut** (recommended) · B: none offered | Wrong reason: the stall lost on price (\$1 dearer), not on speed. Also says "you" when any stall may have won. |
| `src/engine/data.ts:533` | Rush: speech tag over Uncle Benny's stall (lost by \$2 or more) | `'Plenty more fruit where that came from.'` | CUT | **A: cut** (recommended) · B: none offered | Stock phrase. |
| `src/engine/data.ts:533` | Rush: speech tag over Uncle Benny's stall (lost by \$2 or more) | `'Oof. Too pricey.'` | REWRITE | A: cut · **B:** `'Too pricey.'` (recommended) | The one line kept for this situation, without the shout. |
| `src/engine/data.ts:534` | Shopkeeper name (stall sign, table, results) | `name: 'Ah Chen'` | KEEP |  | Owner-approved name (DEC-064). |
| `src/engine/data.ts:534` | Picker (under the sign, in quotes) and printed stall sign: quip (Ah Chen) | `quip: 'Smile and sell!'` | CUT | **A: cut** (recommended) · B: `My regulars know where to find me.` | Slogan. The sign already shows the name, the picture and the perk. |
| `src/engine/data.ts:535` | Rush: speech tag over Ah Chen's stall (won by pricing \$1 or \$2 lower) | `'Smile and sell!'` | CUT | **A: cut** (recommended) · B: none offered | Catchphrase. |
| `src/engine/data.ts:535` | Rush: speech tag over Ah Chen's stall (won by pricing \$1 or \$2 lower) | `'Charm AND a cheaper price.'` | REWRITE | A: cut · **B:** `'Cheaper today.'` (recommended) | The one line kept for this situation, without the shout. |
| `src/engine/data.ts:535` | Rush: speech tag over Ah Chen's stall (won by pricing \$1 or \$2 lower) | `'Sorry, sweetheart!'` | CUT | **A: cut** (recommended) · B: none offered | Talks down to the player. |
| `src/engine/data.ts:536` | Rush: speech tag over Ah Chen's stall (sold at the top price) | `'Full price, with a smile.'` | CUT | **A: cut** (recommended) · B: none offered | One line per situation is enough. |
| `src/engine/data.ts:536` | Rush: speech tag over Ah Chen's stall (sold at the top price) | `'A fair price, gladly paid.'` | REWRITE | A: cut · **B:** `'A fair price.'` (recommended) | The one line kept for this situation, without the shout. |
| `src/engine/data.ts:537` | Rush: speech tag over Ah Chen's stall (lost by \$1 or on a tie) | `'You charmed them first. Cheeky!'` | CUT | **A: cut** (recommended) · B: none offered | Says "you", but the line is the same for everyone at the table and fires when any stall won the sale, not only yours (PLAN-068). |
| `src/engine/data.ts:537` | Rush: speech tag over Ah Chen's stall (lost by \$1 or on a tie) | `'So close... breathe.'` | REWRITE | A: cut · **B:** `'So close.'` (recommended) | The one line kept for this situation, without the shout. |
| `src/engine/data.ts:537` | Rush: speech tag over Ah Chen's stall (lost by \$1 or on a tie) | `'Well played, friend.'` | CUT | **A: cut** (recommended) · B: none offered | Says "you", but the line is the same for everyone at the table and fires when any stall won the sale, not only yours (PLAN-068). |
| `src/engine/data.ts:538` | Rush: speech tag over Ah Chen's stall (lost by \$2 or more) | `'Charm is a long game.'` | CUT | **A: cut** (recommended) · B: none offered | Proverb. |
| `src/engine/data.ts:538` | Rush: speech tag over Ah Chen's stall (lost by \$2 or more) | `'I will win them tomorrow.'` | REWRITE | A: cut · **B:** `'Tomorrow, then.'` (recommended) | The one line kept for this situation, without the shout. |
| `src/engine/data.ts:539` | Shopkeeper name (stall sign, table, results) | `name: 'Saleh'` | KEEP |  | Owner-approved name (DEC-064). |
| `src/engine/data.ts:539` | Picker (under the sign, in quotes) and printed stall sign: quip (Saleh) | `quip: 'Every sen counts!'` | CUT | **A: cut** (recommended) · B: `Every sen counts.` | The plainest of the eight (B keeps it, without "!"). The sign already shows the name, the picture and the perk. |
| `src/engine/data.ts:540` | Rush: speech tag over Saleh's stall (won by pricing \$1 or \$2 lower) | `'Every sen counts!'` | CUT | **A: cut** (recommended) · B: none offered | Catchphrase; also his quip. |
| `src/engine/data.ts:540` | Rush: speech tag over Saleh's stall (won by pricing \$1 or \$2 lower) | `'Jimat, jimat! Mine is cheaper.'` | REWRITE | A: cut · **B:** `'Jimat. Mine is cheaper.'` (recommended) | The one line kept for this situation, without the shout. |
| `src/engine/data.ts:540` | Rush: speech tag over Saleh's stall (won by pricing \$1 or \$2 lower) | `'Sorry, my price wins.'` | CUT | **A: cut** (recommended) · B: none offered | Fine, but one line is enough. |
| `src/engine/data.ts:541` | Rush: speech tag over Saleh's stall (sold at the top price) | `'Full price? Terima kasih!'` | CUT | **A: cut** (recommended) · B: none offered | One line per situation is enough. |
| `src/engine/data.ts:541` | Rush: speech tag over Saleh's stall (sold at the top price) | `'Rezeki! Full price today.'` | REWRITE | A: cut · **B:** `'Rezeki. Full price today.'` (recommended) | The one line kept for this situation, without the shout. |
| `src/engine/data.ts:542` | Rush: speech tag over Saleh's stall (lost by \$1 or on a tie) | `'Aiyo, that one was mine!'` | REWRITE | A: cut · **B:** `'One dollar too dear.'` (recommended) | The one line kept for this situation, without the shout. |
| `src/engine/data.ts:542` | Rush: speech tag over Saleh's stall (lost by \$1 or on a tie) | `'Next time, my friend.'` | CUT | **A: cut** (recommended) · B: none offered | Says "you", but the line is the same for everyone at the table and fires when any stall won the sale, not only yours (PLAN-068). |
| `src/engine/data.ts:542` | Rush: speech tag over Saleh's stall (lost by \$1 or on a tie) | `'You were quick, I will say that.'` | CUT | **A: cut** (recommended) · B: none offered | Wrong reason: the stall lost on price (\$1 dearer), not on speed. Also says "you" when any stall may have won. |
| `src/engine/data.ts:543` | Rush: speech tag over Saleh's stall (lost by \$2 or more) | `'Never mind, I saved for this.'` | REWRITE | A: cut · **B:** `'Never mind. I saved for this.'` (recommended) | The one line kept for this situation, without the shout. |
| `src/engine/data.ts:543` | Rush: speech tag over Saleh's stall (lost by \$2 or more) | `'Tomorrow is another day.'` | CUT | **A: cut** (recommended) · B: none offered | Proverb. |
| `src/engine/data.ts:544` | Shopkeeper name (stall sign, table, results) | `name: 'Raj'` | KEEP |  | Owner-approved name (DEC-064). |
| `src/engine/data.ts:544` | Picker (under the sign, in quotes) and printed stall sign: quip (Raj) | `quip: 'Found a bargain!'` | CUT | **A: cut** (recommended) · B: `First to the lorry every morning.` | Slogan. The sign already shows the name, the picture and the perk. |
| `src/engine/data.ts:545` | Rush: speech tag over Raj's stall (won by pricing \$1 or \$2 lower) | `'Found a bargain, sold a bargain!'` | REWRITE | A: cut · **B:** `'Bought cheap, sold cheap.'` (recommended) | The one line kept for this situation, without the shout. |
| `src/engine/data.ts:545` | Rush: speech tag over Raj's stall (won by pricing \$1 or \$2 lower) | `'Cheap and cheerful!'` | CUT | **A: cut** (recommended) · B: none offered | One line per situation is enough. |
| `src/engine/data.ts:545` | Rush: speech tag over Raj's stall (won by pricing \$1 or \$2 lower) | `'Lucky me!'` | CUT | **A: cut** (recommended) · B: none offered | Catchphrase. |
| `src/engine/data.ts:546` | Rush: speech tag over Raj's stall (sold at the top price) | `'Full price. Lucky day!'` | REWRITE | A: cut · **B:** `'Full price. Lucky day.'` (recommended) | The one line kept for this situation, without the shout. |
| `src/engine/data.ts:546` | Rush: speech tag over Raj's stall (sold at the top price) | `'Ka-ching, lucky Raj!'` | CUT | **A: cut** (recommended) · B: none offered | Sound effect; talks about himself by name. |
| `src/engine/data.ts:547` | Rush: speech tag over Raj's stall (lost by \$1 or on a tie) | `'Unlucky! That was mine.'` | REWRITE | A: cut · **B:** `'Unlucky. That was mine.'` (recommended) | The one line kept for this situation, without the shout. |
| `src/engine/data.ts:547` | Rush: speech tag over Raj's stall (lost by \$1 or on a tie) | `'You got lucky there.'` | CUT | **A: cut** (recommended) · B: none offered | Says "you", but the line is the same for everyone at the table and fires when any stall won the sale, not only yours (PLAN-068). |
| `src/engine/data.ts:547` | Rush: speech tag over Raj's stall (lost by \$1 or on a tie) | `'Next time, friend!'` | CUT | **A: cut** (recommended) · B: none offered | Says "you", but the line is the same for everyone at the table and fires when any stall won the sale, not only yours (PLAN-068). |
| `src/engine/data.ts:548` | Rush: speech tag over Raj's stall (lost by \$2 or more) | `'Luck will turn.'` | CUT | **A: cut** (recommended) · B: none offered | Proverb. |
| `src/engine/data.ts:548` | Rush: speech tag over Raj's stall (lost by \$2 or more) | `'Not my day. Tomorrow!'` | REWRITE | A: cut · **B:** `'Not my day.'` (recommended) | The one line kept for this situation, without the shout. |
| `src/engine/data.ts:549` | Shopkeeper name (stall sign, table, results) | `name: 'Kiki'` | KEEP |  | Owner-approved name (DEC-064). |
| `src/engine/data.ts:549` | Picker (under the sign, in quotes) and printed stall sign: quip (Kiki) | `quip: 'Thank you, thank you!'` | CUT | **A: cut** (recommended) · B: `Thank you, come again.` | Repetition for effect. The sign already shows the name, the picture and the perk. |
| `src/engine/data.ts:550` | Rush: speech tag over Kiki's stall (won by pricing \$1 or \$2 lower) | `'A kinder price for everyone!'` | CUT | **A: cut** (recommended) · B: none offered | Slogan. |
| `src/engine/data.ts:550` | Rush: speech tag over Kiki's stall (won by pricing \$1 or \$2 lower) | `'Cheaper, with a smile.'` | REWRITE | A: cut · **B:** `'A little cheaper.'` (recommended) | The one line kept for this situation, without the shout. |
| `src/engine/data.ts:550` | Rush: speech tag over Kiki's stall (won by pricing \$1 or \$2 lower) | `'Thank you, thank you!'` | CUT | **A: cut** (recommended) · B: none offered | Catchphrase. |
| `src/engine/data.ts:551` | Rush: speech tag over Kiki's stall (sold at the top price) | `'Thank you, full price!'` | REWRITE | A: cut · **B:** `'Full price. Thank you.'` (recommended) | The one line kept for this situation, without the shout. |
| `src/engine/data.ts:551` | Rush: speech tag over Kiki's stall (sold at the top price) | `'So kind of them. Full price!'` | CUT | **A: cut** (recommended) · B: none offered | One line per situation is enough. |
| `src/engine/data.ts:552` | Rush: speech tag over Kiki's stall (lost by \$1 or on a tie) | `'Oh! You were faster.'` | CUT | **A: cut** (recommended) · B: none offered | Wrong reason: the stall lost on price (\$1 dearer), not on speed. Also says "you" when any stall may have won. |
| `src/engine/data.ts:552` | Rush: speech tag over Kiki's stall (lost by \$1 or on a tie) | `'I wanted to serve them!'` | REWRITE | A: cut · **B:** `'I wanted to serve them.'` (recommended) | The one line kept for this situation, without the shout. |
| `src/engine/data.ts:552` | Rush: speech tag over Kiki's stall (lost by \$1 or on a tie) | `'Next time, dear.'` | CUT | **A: cut** (recommended) · B: none offered | Says "you", but the line is the same for everyone at the table and fires when any stall won the sale, not only yours (PLAN-068). |
| `src/engine/data.ts:553` | Rush: speech tag over Kiki's stall (lost by \$2 or more) | `'Kindness comes back around.'` | CUT | **A: cut** (recommended) · B: none offered | Proverb. |
| `src/engine/data.ts:553` | Rush: speech tag over Kiki's stall (lost by \$2 or more) | `'No worries. Another day.'` | REWRITE | A: cut · **B:** `'Another day.'` (recommended) | The one line kept for this situation, without the shout. |
| `src/engine/data.ts:554` | Shopkeeper name (stall sign, table, results) | `name: 'Pak Din'` | KEEP |  | Owner-approved name (DEC-064). |
| `src/engine/data.ts:554` | Picker (under the sign, in quotes) and printed stall sign: quip (Pak Din) | `quip: 'Slow and steady!'` | CUT | **A: cut** (recommended) · B: `Shade keeps it fresh.` | Proverb, and a tortoise line. The sign already shows the name, the picture and the perk. |
| `src/engine/data.ts:555` | Rush: speech tag over Pak Din's stall (won by pricing \$1 or \$2 lower) | `'Slow and steady wins!'` | CUT | **A: cut** (recommended) · B: none offered | Tortoise line. |
| `src/engine/data.ts:555` | Rush: speech tag over Pak Din's stall (won by pricing \$1 or \$2 lower) | `'A little cheaper, a lot fresher.'` | CUT | **A: cut** (recommended) · B: none offered | One line per situation is enough. |
| `src/engine/data.ts:555` | Rush: speech tag over Pak Din's stall (won by pricing \$1 or \$2 lower) | `'Patience pays, friend.'` | REWRITE | A: cut · **B:** `'Patience pays.'` (recommended) | The one line kept for this situation, without the shout. |
| `src/engine/data.ts:556` | Rush: speech tag over Pak Din's stall (sold at the top price) | `'Full price. Worth the wait!'` | CUT | **A: cut** (recommended) · B: none offered | One line per situation is enough. |
| `src/engine/data.ts:556` | Rush: speech tag over Pak Din's stall (sold at the top price) | `'Kept it fresh, sold it full.'` | REWRITE | A: cut · **B:** `'Kept it fresh. Full price.'` (recommended) | The one line kept for this situation, without the shout. |
| `src/engine/data.ts:557` | Rush: speech tag over Pak Din's stall (lost by \$1 or on a tie) | `'Hmm. Too slow today.'` | REWRITE | A: cut · **B:** `'Hmm. A dollar too high.'` (recommended) | The one line kept for this situation, without the shout. |
| `src/engine/data.ts:557` | Rush: speech tag over Pak Din's stall (lost by \$1 or on a tie) | `'You beat the old tortoise.'` | CUT | **A: cut** (recommended) · B: none offered | Tortoise line, and it says "you" when any stall may have won. |
| `src/engine/data.ts:557` | Rush: speech tag over Pak Din's stall (lost by \$1 or on a tie) | `'Next time, young one.'` | CUT | **A: cut** (recommended) · B: none offered | Says "you", but the line is the same for everyone at the table and fires when any stall won the sale, not only yours (PLAN-068). |
| `src/engine/data.ts:558` | Rush: speech tag over Pak Din's stall (lost by \$2 or more) | `'My fruit will keep.'` | KEEP | **Keep as is** (recommended) · A: cut | Plain; the one line kept for this situation. |
| `src/engine/data.ts:558` | Rush: speech tag over Pak Din's stall (lost by \$2 or more) | `'There is always tomorrow.'` | CUT | **A: cut** (recommended) · B: none offered | Proverb. |
| `src/engine/data.ts:559` | Shopkeeper name (stall sign, table, results) | `name: 'Farah'` | KEEP |  | Owner-approved name (DEC-064). |
| `src/engine/data.ts:559` | Picker (under the sign, in quotes) and printed stall sign: quip (Farah) | `quip: 'I heard that!'` | CUT | **A: cut** (recommended) · B: `I hear what people want.` | Catchphrase. The sign already shows the name, the picture and the perk. |
| `src/engine/data.ts:560` | Rush: speech tag over Farah's stall (won by pricing \$1 or \$2 lower) | `'I heard what they wanted!'` | REWRITE | A: cut · **B:** `'I heard what they wanted.'` (recommended) | The one line kept for this situation, without the shout. |
| `src/engine/data.ts:560` | Rush: speech tag over Farah's stall (won by pricing \$1 or \$2 lower) | `'Little bird told me. Cheaper!'` | CUT | **A: cut** (recommended) · B: none offered | Parrot line. |
| `src/engine/data.ts:560` | Rush: speech tag over Farah's stall (won by pricing \$1 or \$2 lower) | `'Squawk! Mine!'` | CUT | **A: cut** (recommended) · B: none offered | Parrot line. Shopkeepers are people (DEC-040). |
| `src/engine/data.ts:561` | Rush: speech tag over Farah's stall (sold at the top price) | `'Full price! I knew it.'` | REWRITE | A: cut · **B:** `'Full price. I knew it.'` (recommended) | The one line kept for this situation, without the shout. |
| `src/engine/data.ts:561` | Rush: speech tag over Farah's stall (sold at the top price) | `'Heard it first, sold it first.'` | CUT | **A: cut** (recommended) · B: none offered | One line per situation is enough. |
| `src/engine/data.ts:562` | Rush: speech tag over Farah's stall (lost by \$1 or on a tie) | `'I should have listened closer.'` | KEEP | **Keep as is** (recommended) · A: cut | Plain; the one line kept for this situation. |
| `src/engine/data.ts:562` | Rush: speech tag over Farah's stall (lost by \$1 or on a tie) | `'Squawk! That was mine!'` | CUT | **A: cut** (recommended) · B: none offered | Parrot line. |
| `src/engine/data.ts:562` | Rush: speech tag over Farah's stall (lost by \$1 or on a tie) | `'You heard it too?'` | CUT | **A: cut** (recommended) · B: none offered | Says "you", but the line is the same for everyone at the table and fires when any stall won the sale, not only yours (PLAN-068). |
| `src/engine/data.ts:563` | Rush: speech tag over Farah's stall (lost by \$2 or more) | `'I will hear the next one.'` | KEEP | **Keep as is** (recommended) · A: cut | Plain; the one line kept for this situation. |
| `src/engine/data.ts:563` | Rush: speech tag over Farah's stall (lost by \$2 or more) | `'Fine, fine. Tomorrow!'` | CUT | **A: cut** (recommended) · B: none offered | One line per situation is enough. |

## Cards · standing orders (8)

The title and the quirk are shown on the bidding panel in the app and on the printed standing-order card. Four of the eight quirks use a big number for an order of 3 to 5 pieces ("Four hundred lunchboxes", "A thousand pies").

| File:line | Where shown | Current text | Verdict | Proposed | Reason |
|---|---|---|---|---|---|
| `src/engine/data.ts:383` | Standing-order card and bidding panel: title | `title: 'The School Canteen'` | KEEP |  | Named in the RULES.md and guidebook tables. |
| `src/engine/data.ts:383` | Standing-order card and bidding panel: quirk (The School Canteen) | `Four hundred lunchboxes, each with blueberries.` | REWRITE | A: cut · **B:** `Fruit cups for Friday recess.` (recommended) | Big number for an order of 3 to 5 blueberries. |
| `src/engine/data.ts:384` | Standing-order card and bidding panel: title | `title: 'The Smoothie Stand'` | KEEP |  | Named in the RULES.md and guidebook tables. |
| `src/engine/data.ts:384` | Standing-order card and bidding panel: quirk (The Smoothie Stand) | `The blender never stops.` | REWRITE | A: cut · **B:** `Sells blueberry smoothies at the pasar malam.` (recommended) | Slogan. Local detail: pasar malam. |
| `src/engine/data.ts:385` | Standing-order card and bidding panel: title | `title: 'The Beach Resort'` | KEEP |  | Named in the RULES.md and guidebook tables. |
| `src/engine/data.ts:385` | Standing-order card and bidding panel: quirk (The Beach Resort) | `Watermelon by the pool, every afternoon.` | REWRITE | A: cut · **B:** `Cut watermelon for the guests by the pool.` (recommended) | Near the current line, without the rhythm break. |
| `src/engine/data.ts:386` | Standing-order card and bidding panel: title | `title: 'The Company Picnic'` | KEEP |  | Named in the RULES.md and guidebook tables. |
| `src/engine/data.ts:386` | Standing-order card and bidding panel: quirk (The Company Picnic) | `The boss promised watermelon.` | REWRITE | A: cut · **B:** `For the company family day.` (recommended) | Local detail: family day. The current line is fine too. |
| `src/engine/data.ts:387` | Standing-order card and bidding panel: title | `title: 'The Pie Factory'` | KEEP |  | Named in the RULES.md and guidebook tables. |
| `src/engine/data.ts:387` | Standing-order card and bidding panel: quirk (The Pie Factory) | `A thousand pies by Friday.` | REWRITE | A: cut · **B:** `Apple pies for the shops in town.` (recommended) | Big number for an order of 3 to 5 apples. |
| `src/engine/data.ts:388` | Standing-order card and bidding panel: title | `title: 'The Cider Press'` | KEEP |  | Named in the RULES.md and guidebook tables. |
| `src/engine/data.ts:388` | Standing-order card and bidding panel: quirk (The Cider Press) | `Pressing day waits for no one.` | REWRITE | A: cut · **B:** `Pressing apples this week.` (recommended) | Proverb pattern ("waits for no one"). |
| `src/engine/data.ts:389` | Standing-order card and bidding panel: title | `title: 'The Airline Caterer'` | KEEP |  | Named in the RULES.md and guidebook tables. |
| `src/engine/data.ts:389` | Standing-order card and bidding panel: quirk (The Airline Caterer) | `First class wants ripe mango.` | REWRITE | A: cut · **B:** `Mango for the in-flight meals.` (recommended) | "First class wants ripe mango": the order takes Fresh or Okay like any standing order, so "ripe" adds nothing and "first class" is dressing. |
| `src/engine/data.ts:390` | Standing-order card and bidding panel: title | `title: 'The Royal Banquet'` | KEEP |  | Named in the RULES.md and guidebook tables. |
| `src/engine/data.ts:390` | Standing-order card and bidding panel: quirk (The Royal Banquet) | `Only the ripest mango for the palace.` | REWRITE | A: cut · **B:** `Mango for the palace dinner.` (recommended) | MISLEADS ON FRESHNESS: "Only the ripest" reads as Fresh only, but a standing order takes Fresh or Okay. |

## Screen · home

The first screen: the bar, the title, your stall, the play buttons, the Daily market and Market League tickets, and three links.

| File:line | Where shown | Current text | Verdict | Proposed | Reason |
|---|---|---|---|---|---|
| `src/ui/Home.tsx:56` | Home bar: account button when signed in | `` `Hi, ${me}` `` | KEEP |  |  |
| `src/ui/Home.tsx:56` | Home bar: account button when signed out | `'Create account'` | KEEP |  |  |
| `src/ui/Home.tsx:57` | Home bar: button that opens the Wardrobe | `<span>Dress up</span>` | REWRITE | `<span>Wardrobe</span>` | The screen it opens is called Wardrobe, and so is every other link to it. |
| `src/ui/Home.tsx:61` | Home: title | `<h1 class="hm-name">Fruit<br />Market</h1>` | KEEP |  |  |
| `src/ui/Home.tsx:62` | Home: line under the title | `Where the whole world shops <span>…and every price is a secret</span>` | REWRITE | A: cut · **B:** `Run a fruit stall. <span>Every price is a secret.</span>` (recommended) | Advertising tagline with a trailing "…and". Note: "where the whole world shops" is the approved identity line (DEC-017), so this is the owner's call. Option A: cut the line; the title stands alone. |
| `src/ui/Home.tsx:67` | Home: heading over your shopkeeper's picture | `` Your stall{keeper ? ` · ${keeper.name}` : ''} `` | KEEP |  |  |
| `src/ui/App.tsx:173` | Home: Continue button and stall heading ("Day 4/10", shown as "Day 4 of 10") | `` `Day ${game!.day}/${game!.config.days}` `` | KEEP |  |  |
| `src/ui/Home.tsx:76` | Home: main button when a game is waiting | `<PlayIcon />Continue<span class="hm-vh"> · </span>` | KEEP |  |  |
| `src/ui/Home.tsx:78` | Home: button | `>New game</button>` | KEEP |  |  |
| `src/ui/Home.tsx:84` | Home: button | `>New game</button>` | KEEP |  |  |
| `src/ui/Home.tsx:79` | Home: button | `>Play a friend</button>` | KEEP |  |  |
| `src/ui/Home.tsx:85` | Home: button | `>Play a friend</button>` | KEEP |  |  |
| `src/ui/Home.tsx:92` | Home: Daily market ticket, heading | `<small class="red">Daily market</small>` | KEEP |  |  |
| `src/ui/App.tsx:175` | Home: Daily market ticket, after you have played today | `` `Today's best: $${daily[today]}` `` | KEEP |  |  |
| `src/ui/App.tsx:175` | Home: Daily market ticket, before you have played today | `` `Same market for everyone · ${dailyTwist(today).title}` `` | REWRITE | `` `Same cards for everyone · ${dailyTwist(today).title}` `` | "Market" already names the game, the mode, the Wholesale Market and Market Day. What is the same for everyone is the shuffle. |
| `src/ui/App.tsx:175` | Home: Daily market ticket, streak | `` ` · ${streak}-day streak` `` | KEEP |  |  |
| `src/ui/Home.tsx:93` | Home: Daily market ticket, button | `<span class="hm-tk-go">Play</span>` | KEEP |  |  |
| `src/ui/Home.tsx:97` | Home: Market League ticket, heading | `<small>Market League</small>` | KEEP |  |  |
| `src/ui/App.tsx:176` | Home: Market League ticket, after the last stage | `'Champion! Replay the Royal Market'` | REWRITE | `'All stages won · replay Royal Market'` | No "!"; says what happened. |
| `src/ui/App.tsx:176` | Home: Market League ticket | `` `Stage ${league + 1} of ${LEAGUE.length} · ${LEAGUE[league].title}` `` | KEEP |  |  |
| `src/ui/Home.tsx:168` | Home: today's Daily market leaders | `` Today's top stalls{res.players ? ` · ${res.players} played` : ''} `` | KEEP |  |  |
| `src/ui/Home.tsx:102` | Home: foot links | `>Trophies</button>` | KEEP |  |  |
| `src/ui/Home.tsx:103` | Home: foot links | `>How to play</button>` | KEEP |  |  |
| `src/ui/Home.tsx:104` | Home: foot links | `>Settings</button>` | KEEP |  |  |
| `src/ui/store.ts:76` | Home: notice after an update | `'Your unfinished game was from an older version of the rules, so it couldn\'t be resumed.'` | REWRITE | `'Your unfinished game used older rules and could not be continued.'` | Shorter; "continued" matches the Continue button. |
| `src/ui/store.ts:78` | Home: notice after an update | `'Your unfinished daily challenge was from an older version of the game, so it couldn\'t be resumed.'` | REWRITE | `'Your unfinished Daily market game was from an older version and could not be continued.'` | The mode is called Daily market on every screen; "daily challenge" appears only in two messages. |
| `src/ui/store.ts:79` | Home: notice when a saved game is damaged | `'Your unfinished game couldn\'t be read, so it was cleared.'` | KEEP |  |  |
| `src/ui/store.ts:85` | Home: notice when a saved game is damaged | `'Your unfinished game couldn\'t be read, so it was cleared.'` | KEEP |  |  |
| `src/ui/App.tsx:190` | Home: pop-up title | `title="New game"` | KEEP |  |  |
| `src/ui/App.tsx:192` | Home: pop-up title | `title="Continue"` | KEEP |  |  |
| `src/ui/App.tsx:199` | Home: pop-up title | `title="Play a friend"` | KEEP |  |  |
| `src/ui/App.tsx:203` | Home: pop-up title | `title="Account"` | KEEP |  |  |
| `src/ui/Home.tsx:133` | Continue pop-up | `<b>Day {day} of {days}</b>` | KEEP |  |  |
| `src/ui/Home.tsx:133` | Continue pop-up | `` {stalls} stalls{cash !== null ? ` · you have $${cash}` : ''} `` | KEEP |  |  |
| `src/ui/Home.tsx:135` | Continue pop-up: button | `>Resume</button>` | KEEP |  |  |
| `src/ui/Home.tsx:136` | Continue pop-up: button | `>Start over</button>` | KEEP |  |  |
| `src/ui/Home.tsx:137` | Continue pop-up: warning | `Starting over ends this game.` | KEEP |  |  |
| `src/ui/Home.tsx:148` | Play a friend pop-up | `<b>Create a room</b>` | KEEP |  |  |
| `src/ui/Home.tsx:148` | Play a friend pop-up | `<small>Share a link with 1 to 3 friends</small>` | CORRECTNESS | `<small>Share a link with 1 to 5 friends</small>` | A room holds 6 (protocol.ts MAX_SEATS), and the online screen itself says "up to 5 friends". |
| `src/ui/Home.tsx:150` | Play a friend pop-up | `>Join with a code</label>` | KEEP |  |  |
| `src/ui/Home.tsx:154` | Play a friend pop-up: button | `>Join</button>` | KEEP |  |  |
| `src/ui/Home.tsx:157` | Play a friend pop-up | `<b>Quick match</b>` | KEEP |  |  |
| `src/ui/Home.tsx:157` | Play a friend pop-up | `<small>Meet a stranger, 2 players</small>` | REWRITE | `<small>Play a stranger, 2 players</small>` | You play them; you do not meet them. |
| `src/ui/Opening.tsx:102` | Opening animation | `Tap to skip` | KEEP |  |  |
| `src/ui/FullScreenButton.tsx:69` | Full-screen question after the opening | `<h3>Play full screen?</h3>` | KEEP |  |  |
| `src/ui/FullScreenButton.tsx:73` | Full-screen question after the opening | `>Full screen</button>}` | KEEP |  |  |
| `src/ui/FullScreenButton.tsx:74` | Full-screen question after the opening | `>Not now</button>` | KEEP |  |  |
| `src/ui/FullScreenButton.tsx:75` | Full-screen question after the opening | `>Don’t ask again</button>` | KEEP |  |  |
| `src/ui/FullScreenButton.tsx:72` | Full-screen question after the opening | `>Got it</button>` | KEEP |  |  |
| `src/ui/FullScreenButton.tsx:23` | Full screen on iPhone: steps | `Tap <b>Share</b> <ShareGlyph /> in Safari’s toolbar.` | KEEP |  |  |
| `src/ui/FullScreenButton.tsx:24` | Full screen on iPhone: steps | `Choose <b>Add to Home Screen</b>, then <b>Add</b>.` | KEEP |  |  |
| `src/ui/FullScreenButton.tsx:25` | Full screen on iPhone: steps | `Open <b>Fruit Market</b> from your Home Screen.` | KEEP |  |  |
| `src/ui/FullScreenButton.tsx:34` | Full screen on iPhone: steps | `<h3>Full screen on iPhone</h3>` | KEEP |  |  |
| `src/ui/FullScreenButton.tsx:36` | Full screen on iPhone: steps | `>Got it</button>` | KEEP |  |  |
| `src/ui/FullScreenButton.tsx:50` | Settings and pause menu: full-screen button | `{full ? 'Exit full screen' : 'Full screen'}` | KEEP |  |  |

## Screen · new game (and passing the phone)

The New game pop-up: your name, your shopkeeper, the rival stalls and the game length.

| File:line | Where shown | Current text | Verdict | Proposed | Reason |
|---|---|---|---|---|---|
| `src/ui/App.tsx:274` | New game: heading | `<h3 class="tight">Your name</h3>` | KEEP |  |  |
| `src/ui/App.tsx:275` | New game: grey text inside the name box | `placeholder="Your name"` | CUT | **cut** | Said twice: the heading directly above the box already says "Your name". |
| `src/ui/App.tsx:276` | New game: heading | `<h3 class="tight next">Your shopkeeper</h3>` | KEEP |  |  |
| `src/ui/CharacterPick.tsx:70` | New game and online: shopkeeper's quip under the picker | `` {`“${me.quip}”`} `` | CUT | **cut** | Goes with the eight quips (see Cards · shopkeepers). The sign above it already shows the perk. |
| `src/ui/CharacterPick.tsx:74` | New game: hint under the picker until you first swipe | `‹ Swipe to choose ›` | KEEP |  |  |
| `src/ui/App.tsx:280` | New game: heading | `<h3>Rival stalls</h3>` | KEEP |  |  |
| `src/ui/App.tsx:285` | New game: rival tile | `<span class="st-n">Stall {i + 2}</span>` | KEEP |  |  |
| `src/ui/App.tsx:287` | New game: rival tile | `{st.kind === 'human' ? 'Friend' : 'Computer'}` | KEEP |  |  |
| `src/ui/App.tsx:290` | New game: rival tile | `<b class="st-k">+ Add</b>` | KEEP |  |  |
| `src/ui/App.tsx:48` | New game: computer level (tile and buttons) | `{ easy: 'Easy', normal: 'Normal', hard: 'Hard' }` | KEEP |  |  |
| `src/ui/App.tsx:297` | New game: rival editor | `<b>Stall {i + 2}</b>` | KEEP |  |  |
| `src/ui/App.tsx:297` | New game: rival editor | `>Done</button>` | KEEP |  |  |
| `src/ui/App.tsx:300` | New game: rival editor | `>Friend</button>` | KEEP |  |  |
| `src/ui/App.tsx:308` | New game: rival editor | `Remove stall {i + 2}` | KEEP |  |  |
| `src/ui/App.tsx:341` | New game: line under the rivals ("4 stalls: you, 1 friend, 2 computers") | `` `${rivals.length + 1} stalls: you${part(friends, 'friend')}${part(computers, 'computer')}` `` | KEEP |  |  |
| `src/ui/App.tsx:313` | New game: note when a friend is added | `Friends share this phone and take turns. Secret prices are hidden between turns.` | KEEP |  |  |
| `src/ui/App.tsx:316` | New game: heading | `<h3>Game length</h3>` | KEEP |  |  |
| `src/ui/App.tsx:318` | New game: length buttons ("Quick · 8 days") | `[[8, 'Quick'], [10, 'Standard'], [14, 'Long']].map(([d, l])` | KEEP |  |  |
| `src/ui/App.tsx:318` | New game: length buttons | `{l}<small>{d} days</small>` | KEEP |  |  |
| `src/ui/App.tsx:321` | New game: button | `>Start game</button>` | KEEP |  |  |
| `src/ui/App.tsx:215` | New game: default name for a friend | `name: 'Player 2'` | KEEP |  |  |
| `src/ui/App.tsx:216` | New game: default name for a friend | `name: 'Player 3'` | KEEP |  |  |
| `src/ui/App.tsx:217` | New game: default name for a friend | `name: 'Player 4'` | KEEP |  |  |
| `src/ui/App.tsx:218` | New game: default name for a friend | `name: 'Player 5'` | KEEP |  |  |
| `src/ui/App.tsx:219` | New game: default name for a friend | `name: 'Player 6'` | KEEP |  |  |
| `src/ui/App.tsx:235` | New game: default name for a friend | `` `Player ${k + 2}` `` | KEEP |  |  |
| `src/ui/App.tsx:249` | New game: default name for a friend | `` `Player ${i + 2}` `` | KEEP |  |  |
| `src/ui/App.tsx:252` | Default name when you type none | `name.trim() \|\| 'You'` | KEEP |  |  |
| `src/ui/App.tsx:261` | Default name when you type none | `name.trim() \|\| 'You'` | KEEP |  |  |
| `src/ui/Game.tsx:54` | Pass-the-phone screen (friends on one phone) | `<h2>Pass the phone to {pl.name}</h2>` | KEEP |  |  |
| `src/ui/Game.tsx:55` | Pass-the-phone screen: before a bid | `'A secret bid for the standing order. No peeking!'` | REWRITE | `'A secret bid for the standing order. Everyone else look away.'` | "No peeking!" is a wink with "!". Say who should do what. |
| `src/ui/Game.tsx:55` | Pass-the-phone screen: before prices | `'Secret prices. No peeking!'` | REWRITE | `'Secret prices. Everyone else look away.'` | As above. |
| `src/ui/Game.tsx:55` | Pass-the-phone screen: before stocking | `'Fill your for-sale crate. No peeking!'` | REWRITE | `'Fill your crate. Everyone else look away.'` | As above; "for-sale crate" is the crate. |
| `src/ui/Game.tsx:55` | Pass-the-phone screen: before buying | `'Your turn to buy fruit.'` | KEEP |  |  |
| `src/ui/Game.tsx:55` | Pass-the-phone screen: before the evening | `'Your evening.'` | KEEP |  |  |
| `src/ui/Game.tsx:56` | Pass-the-phone screen: button | `>Tap to start</button>` | KEEP |  |  |
| `src/ui/store.ts:105` | Default name in the Daily market and the Market League when you have typed none | `fallback = 'You'` | KEEP |  |  |

## Screen · shown all through a day (top bar, rivals, Wholesale Market, your shelf, pause menu)

These stay on screen in every step of the day.

| File:line | Where shown | Current text | Verdict | Proposed | Reason |
|---|---|---|---|---|---|
| `src/ui/game/panels/TopBar.tsx:32` | Top bar: day | `Day {s.day}<small> / {s.config.days}</small>` | KEEP |  |  |
| `src/ui/game/panels/TopBar.tsx:33` | Top bar: countdown in the last 3 days | `` {rem === 1 ? 'Final day' : `${rem} days left`} `` | REWRITE | `` {rem === 1 ? 'Last day' : `${rem} days left`} `` | The rules and the stocking note say "last day"; "final day" is a second word for it. |
| `src/ui/game/panels/TopBar.tsx:39` | Top bar: today's event button | `{s.event ? s.event.title : 'Calm Day'}` | KEEP |  |  |
| `src/ui/game/panels/TopBar.tsx:13` | Top bar: your rank | `['1ST', '2ND', '3RD', '4TH', '5TH', '6TH']` | KEEP |  |  |
| `src/ui/game/panels/TopBar.tsx:11` | Top bar: the five steps of the day ("1 Morning 2 Buying 3 Stocking 4 Bell 5 Rush") | `['Morning', 'Buying', 'Stocking', 'Bell', 'Rush']` | KEEP |  |  |
| `src/ui/game/useGameController.ts:248` | Stamp across the table on the morning of the last day and of the third-last day | `(rem === 1 ? 'FINAL DAY!' : rem === 3 ? 'FINAL 3 DAYS' : '')` | CUT | **cut** · if kept: `(rem === 1 ? 'LAST DAY' : rem === 3 ? 'LAST 3 DAYS' : '')` | A stamp that flashes for one second over the table. The top bar shows "Last day" or "3 days left" all day. If kept: "LAST DAY" and "LAST 3 DAYS". |
| `src/ui/table.tsx:65` | Wholesale Market: heading | `<b class="tk-label" data-a="truck">Wholesale market</b>` | REWRITE | `<b class="tk-label" data-a="truck">Wholesale Market</b>` | Capital M, as in every sentence that names it. |
| `src/ui/table.tsx:67` | Wholesale Market: chip on a Price Hike or Durian Season day | `{s.event.cost > 0 ? '+' : '−'}${Math.abs(s.event.cost)} each today` | KEEP |  |  |
| `src/ui/table.tsx:61` | Wholesale Market: line beside the heading on your buying turn | `` `Your turn · ${me.boughtToday} of ${buyLimit(me)} bought` `` | KEEP |  |  |
| `src/ui/table.tsx:61` | Wholesale Market: line beside the heading on a rival's buying turn | `` `${buyer.name} is buying` `` | CUT | **cut** | Said twice: the bar at the bottom shows the same thing at the same time ("Rosa is shopping…"). |
| `src/ui/table.tsx:77` | Wholesale Market: number at the top of each lane | `<span>{wantText(pz[i])} want</span>` | REWRITE | `<span>{wantText(pz[i])} wanted</span>` | The stocking and price rows say "3 wanted"; so does this button's spoken label. |
| `src/ui/ticket.tsx:12` | Wholesale Market: key under the lanes ("G green · F fresh · O okay · S soft") | `{ unripe: 'green', fresh: 'fresh', okay: 'okay', notso: 'soft' }` | REWRITE | `{ unripe: 'Green', fresh: 'Fresh', okay: 'Okay', notso: 'Soft' }` | The four states are names: capital letter, as on the cards and in the freshness types. This word list also feeds spoken labels. |
| `src/ui/table.tsx:110` | Under the Wholesale Market and on the morning card | `Tomorrow's lorry{nextLorryName(s) ? ':' : ''}` | KEEP |  |  |
| `src/ui/table.tsx:449` | Tomorrow strip under today's customers | `<span class="tm-k">Tomorrow</span>` | KEEP |  |  |
| `src/ui/game/panels/OrderPanel.tsx:89` | Standing-order strip under the customers (from the bid until it is collected) | `<span class="os-k">Order</span>` | REWRITE | `<span class="os-k">Standing order</span>` | "Order" alone is what one customer wants. This strip is the standing order. |
| `src/ui/game/panels/OrderPanel.tsx:83` | Standing-order strip: when it is due | `` o.due === s.day ? 'today' : o.due === s.day + 1 ? 'tomorrow' : `day ${o.due}` `` | REWRITE | `` o.due === s.day ? 'today' : o.due === s.day + 1 ? 'tomorrow' : `Day ${o.due}` `` | "Day 6" with a capital, as on the top bar. |
| `src/ui/game/panels/OrderPanel.tsx:92` | Standing-order strip: who won it and the winning bid | `{o.holder === viewer ? 'You' : holder.name} at ${o.price}` | KEEP |  |  |
| `src/ui/game/panels/OrderPanel.tsx:93` | Standing-order strip: while bidding | `<span class="os-who">up to ${o.ceiling} each</span>` | REWRITE | `<span class="os-who">bids up to ${o.ceiling}</span>` | Says what the number is: the highest bid. |
| `src/ui/game/panels/OrderPanel.tsx:94` | Standing-order strip: fine | `<span class="os-fine">fine ${o.fine} a piece</span>` | CORRECTNESS | Needs a decision or a code fix (no wording change fixes it) | WRONG FOR AN ORDER BOOK: the strip shows the fine printed on the card. A stall with an Order Book pays half (the bidding panel shows the halved figure). No wording fix: the number shown needs the same halving. |
| `src/ui/table.tsx:146` | Rival box in the evening | `return active ? 'building…' : 'plotting…'` | REWRITE | `return active ? 'deciding…' : 'waiting'` | "Building" is only sometimes true (a rival may play a favour card or do nothing); "plotting" is a joke. |
| `src/ui/table.tsx:147` | Rival box while prices are set | `` return n ? `${n} out` : 'none out'; } `` | REWRITE | `` return n ? `${n} in crate` : 'empty crate'; } `` | One word for the thing: crate. "Out" is used for it on five screens. |
| `src/ui/table.tsx:151` | Rival box in the rush | `` return out ? `${out} out` : 'none out'; `` | REWRITE | `` return out ? `${out} in crate` : 'empty crate'; `` | As above. |
| `src/ui/table.tsx:170` | Rival box while it buys | `(active && s.phase === 'buy' ? 'buying' : base)` | KEEP |  |  |
| `src/ui/table.tsx:171` | Rival box while stocking | `(board.state === 'thinking' ? 'choosing' : 'ready')` | KEEP |  |  |
| `src/ui/table.tsx:174` | Rival box in the rush | `` board.res === 'won' ? `sold at $${board.price}` : board.res === 'lost' ? 'no sale' : `asks $${board.price}` `` | KEEP |  |  |
| `src/ui/table.tsx:203` | Rival pop-up: heading | `<b>{pl.name}{pl.name.endsWith('s') ? "'" : "'s"} stall</b>` | KEEP |  |  |
| `src/ui/table.tsx:209` | Rival pop-up after the bell | `<span class="tk-label">Today's crate</span>` | KEEP |  |  |
| `src/ui/table.tsx:214` | Rival pop-up before the bell | `` `${out ? `${out} ${out === 1 ? 'piece' : 'pieces'}` : 'Nothing'} in the crate today. Which fruit shows at the bell. ` `` | KEEP |  |  |
| `src/ui/table.tsx:214` | Rival pop-up after the bell, empty crate | `'Nothing in the crate today. '` | KEEP |  |  |
| `src/ui/table.tsx:215` | Rival pop-up | `The shelf stays behind the shutter.` | REWRITE | `The shelf is always secret.` | The shutter is a piece of the tabletop game; the app has none. |
| `src/ui/table.tsx:222` | Rival pop-up: chip | `{pl.favours.length} favour card{pl.favours.length > 1 ? 's' : ''}` | KEEP |  |  |
| `src/ui/table.tsx:297` | Your shelf: tag beside your name | `<span class="you-tag">YOU</span>` | KEEP |  |  |
| `src/ui/table.tsx:298` | Your shelf: space used | `Shelf {used} / {cap}` | KEEP |  |  |
| `src/ui/table.tsx:314` | Your shelf in the rush: your price and result | `${board.price}{board.res === 'won' ? ' sold' : board.res === 'lost' ? ' no sale' : ''}` | KEEP |  |  |
| `src/engine/story.ts:748` | Your shelf on Closing Day: chip | `` `${all > ripe ? 'Ripe leftovers' : 'Leftovers'} = $${JAM_PRICE} each` `` | KEEP |  |  |
| `src/engine/story.ts:754` | Your shelf on the last day: chip | `chip: 'Unsold = $0'` | KEEP |  |  |
| `src/engine/story.ts:761` | Your shelf on the last day: chip | `'Unsold = $0'` | KEEP |  |  |
| `src/ui/game/panels/Popovers.tsx:85` | Pause menu | `<h2>Paused</h2>` | KEEP |  |  |
| `src/ui/game/panels/Popovers.tsx:86` | Pause menu | `Your game is saved automatically.` | KEEP |  |  |
| `src/ui/game/panels/Popovers.tsx:87` | Pause menu | `>Resume</button>` | KEEP |  |  |
| `src/ui/game/panels/Popovers.tsx:89` | Pause menu | `>Wardrobe</button>` | KEEP |  |  |
| `src/ui/game/panels/Popovers.tsx:90` | Pause menu: button | `>Quit to menu</button>` | REWRITE | `>Home</button>` | Three buttons go to the same place under three names: "Quit to menu", "Main menu", "Back to menu". |
| `src/ui/Game.tsx:149` | Online: strip under the top bar | `Reconnecting to the room…` | KEEP |  |  |
| `src/ui/Game.tsx:152` | Online: strip under the top bar | `` `A computer is playing for ${x.name} until they come back.` `` | KEEP |  |  |
| `src/ui/Game.tsx:153` | Online: strip under the top bar | `` `${x.name} disconnected. A computer takes over in ${Math.max(0, Math.ceil((x.takeoverAt - c.nowTick) / 1000))}s.` `` | KEEP |  |  |
| `src/ui/Game.tsx:154` | Online: strip under the top bar | `` `${x.name} is offline.` `` | KEEP |  |  |
| `src/ui/game/useGameController.ts:181` | Online: toast | `` `${v.seats[v.undone.seat]?.name ?? 'A player'} took back their purchases` `` | KEEP |  |  |
| `src/ui/game/useGameController.ts:211` | Online: toast when the connection drops | `say('Reconnecting…')` | KEEP |  |  |
| `src/ui/game/useGameController.ts:312` | Online: toast when the connection drops | `say('Reconnecting…')` | KEEP |  |  |
| `src/ui/game/useGameController.ts:277` | Toast after playing Free Fruit | `'Tap a fruit at the market to take it free'` | REWRITE | `'Tap a piece at the Wholesale Market to take it for free'` | "Piece", and the market by its name. |
| `src/ui/game/useGameController.ts:283` | Toast after playing Scout | `'Tap a walk-in to look at them'` | REWRITE | `'Tap a walk-in to look at it'` | A face-down card is "it". |
| `src/ui/game/panels/Popovers.tsx:20` | Today's news pop-up (from the top bar): button | `>Back to the market</button>` | REWRITE | `>Back</button>` | "The market" here means the game table, a fifth meaning for the word. |
| `src/ui/game/panels/Popovers.tsx:59` | Pop-up from the number on a lane | `<b>What customers want</b>` | KEEP |  |  |
| `src/ui/game/panels/Popovers.tsx:60` | Pop-up from the number on a lane | `The number on each lane is the pieces today's customers still want{s.phase === 'buy' \|\| s.phase === 'morning' ? ' (+ means walk-ins who are not here yet may want more)' : ''}.` | KEEP |  |  |
| `src/ui/game/panels/Popovers.tsx:61` | Pop-up from the number on a lane: second paragraph | `Stalls are secret: you cannot see what a rival holds, only how many pieces it puts out for sale.` | CUT | **cut** | Answers a question the player did not ask here (they tapped a demand number). The same rule is stated on the stocking, pricing and How to play screens. |
| `src/ui/game/panels/Popovers.tsx:62` | Pop-up from the number on a lane | `<small>Tap to close.</small>` | KEEP |  |  |
| `src/ui/game/panels/Popovers.tsx:50` | Favour card pop-up: button | `>Play</button>` | KEEP |  |  |
| `src/ui/panel.tsx:31` | Favour card on the evening panel (shows the card title) | `class="fv-name">{d.title}</span>` | KEEP |  |  |

## Screen · morning

The morning card: what spoiled overnight, today's news (the event), what the lorry unloaded, and tomorrow's lorry. Event titles, flavour headlines, rule text and chips are in Cards · events.

| File:line | Where shown | Current text | Verdict | Proposed | Reason |
|---|---|---|---|---|---|
| `src/engine/story.ts:644` | Morning card: first line | `` `${lost} of your fruit spoiled overnight.` `` | REWRITE | `` `${lost} of your pieces spoiled overnight.` `` | "Piece" is one unit. |
| `src/engine/story.ts:645` | Morning card: Juice Bar line | `` `Your Juice Bar made $${juice.dollars} from ${juice.pieces} fruit overnight.` `` | REWRITE | `` `Your Juice Bar made $${juice.dollars} overnight.` `` | The piece count is the dollars divided by 2; one number is enough. |
| `src/engine/story.ts:747` | Morning card on Closing Day, with ripe fruit on your shelf | `` `Ripe fruit left tonight goes to the jam maker for $${JAM_PRICE} each. Sell what you can!` `` | REWRITE | `` `Closing Day: the jam maker pays $${JAM_PRICE} for each ripe piece you have left tonight.` `` | Drops the pep line. Starts with the day's name, like the stocking note. |
| `src/engine/story.ts:753` | Morning card on Closing Day, with only Green fruit on your shelf | `morning: 'Green fruit left tonight is worth $0: the jam maker buys ripe fruit only.'` | KEEP |  |  |
| `src/engine/story.ts:760` | Morning card on the last day when Closing Day is off | `'Anything unsold tonight is worth $0. Sell it all!'` | REWRITE | `'Last day: anything unsold tonight is worth $0.'` | Drops the pep line; same words as the stocking note for the same fact. |
| `src/ui/game/panels/MorningCard.tsx:76` | Morning card: back of the news, before it turns over | `<b>Today’s news</b><span>Turned over each morning</span>` | REWRITE | `<b>Today’s news</b>` | The back shows for a moment before the card turns; "Turned over each morning" describes the animation. |
| `src/ui/game/panels/MorningCard.tsx:82` | Morning card: label over the event title | `<span class="tk-label red">Today’s news</span>` | KEEP |  |  |
| `src/ui/game/panels/MorningCard.tsx:107` | Morning card on a Health Inspector day | `` `${i === viewer ? 'You were' : `${pl.name} was`} fined $${s.dayFines![i]}` `` | KEEP |  |  |
| `src/ui/game/panels/MorningCard.tsx:110` | Morning card: heading over the delivery | `{s.event?.noDelivery ? 'No lorry today' : 'The lorry unloads'}` | KEEP |  |  |
| `src/ui/game/panels/TraitPick.tsx:12` | First morning in the Daily market and the Market League: heading | `Choose your trait` | REWRITE | `Choose your perk` | The game calls it a perk everywhere else, including the next line of this same card. |
| `src/ui/game/panels/TraitPick.tsx:13` | First morning in the Daily market and the Market League | `one perk for the whole game. Rivals can see it.` | KEEP |  |  |
| `src/ui/game/panels/ActionBar.tsx:14` | Bottom bar while the lorry animation plays | `'The cart rolls in…'` | REWRITE | `'The lorry arrives…'` | It is a lorry on every other screen and card. |
| `src/ui/game/panels/ActionBar.tsx:17` | Bottom bar on the first morning | `Pick a perk to start buying` | KEEP |  |  |
| `src/ui/game/panels/ActionBar.tsx:18` | Bottom bar: morning button | `>Start buying</button>` | KEEP |  |  |
| `src/ui/game/panels/ActionBar.tsx:16` | Bottom bar (online): waiting for others to continue | `Waiting for {waitingFor(humansNotVoted)}` | KEEP |  |  |
| `src/ui/game/panels/ActionBar.tsx:33` | Bottom bar (online): waiting for others to continue | `Waiting for {waitingFor(humansNotVoted)}` | KEEP |  |  |

## Screen · bidding for a standing order (Market Day morning)

The bidding panel. The card title and quirk are in Cards · standing orders.

| File:line | Where shown | Current text | Verdict | Proposed | Reason |
|---|---|---|---|---|---|
| `src/ui/game/panels/OrderPanel.tsx:43` | Bidding panel: label over the title | `Standing order · due day {o.due}` | REWRITE | `Standing order · due Day {o.due}` | "Day 6" with a capital, as on the top bar. |
| `src/ui/game/panels/OrderPanel.tsx:48` | Bidding panel: what the order wants | `wants <b>{pieces(o.qty, o.fruit)}</b>, Fresh or Okay, on day {o.due}` | REWRITE | `wants <b>{pieces(o.qty, o.fruit)}</b>, Fresh or Okay` | The due day is said twice on the same card (the label three lines up). |
| `src/ui/game/panels/OrderPanel.tsx:51` | Bidding panel: the three rules | `Lowest bid wins the order and is paid that price for each piece.` | KEEP |  |  |
| `src/ui/game/panels/OrderPanel.tsx:52` | Bidding panel: the three rules | `Your pieces are taken first. Anything missing is bought from rivals at $1 under your bid: <b>${orderRivalPay(v)}</b> each.` | KEEP |  |  |
| `src/ui/game/panels/OrderPanel.tsx:53` | Bidding panel: the three rules | `You are fined <b>${fine}</b> for every piece you do not supply{book ? ' (halved by your Order Book)' : ''}.` | KEEP |  |  |
| `src/ui/game/panels/OrderPanel.tsx:22` | Bidding panel: what each rival is doing | `{st === 'wait' ? 'deciding…' : st === 'pass' ? 'passed' : 'bidding'}` | KEEP |  |  |
| `src/ui/game/panels/OrderPanel.tsx:57` | Bidding panel after you decide | `` {mine === 'pass' ? 'You passed' : typeof mine === 'number' ? `Your bid: $${mine}` : 'Bid in'}. {canChange ? 'You can change it until the last stall decides' : 'Waiting for the other stalls'} `` | KEEP |  |  |
| `src/ui/game/panels/OrderPanel.tsx:62` | Bidding panel: beside the bid number | `<small>a piece</small>` | KEEP |  |  |
| `src/ui/game/panels/OrderPanel.tsx:65` | Bidding panel: pass button | `{waiting ? 'Pass instead' : "Pass: I don't want this order"}` | REWRITE | `{waiting ? 'Pass instead' : 'Pass'}` | The button does not need to explain itself. |
| `src/ui/game/panels/OrderPanel.tsx:71` | Bidding panel: main button | `` {waiting ? `Change bid to $${v}` : `Bid $${v} a piece`} `` | KEEP |  |  |
| `src/ui/game/panels/ActionBar.tsx:27` | Bottom bar (online) after your bid | `` `Bid in. Waiting for ${waitingFor(humansMissingBids) \|\| 'the market'}` `` | REWRITE | `` `Bid in. Waiting for ${waitingFor(humansMissingBids) \|\| 'the others'}` `` | "The market" here means the other stalls. |
| `src/ui/game/panels/ActionBar.tsx:27` | Bottom bar while computer stalls bid | `'Rivals are bidding for the order…'` | REWRITE | `'Rivals are bidding for the standing order…'` | "The order" alone is what a customer wants. |

## Screen · buying

The Wholesale Market is tapped to buy; the bar at the bottom shows whose turn it is.

| File:line | Where shown | Current text | Verdict | Proposed | Reason |
|---|---|---|---|---|---|
| `src/ui/game/panels/ActionBar.tsx:14` | Bottom bar for a moment after each piece you buy | `'Bought!'` | CUT | **cut** | Shown while the piece is flying to your shelf: the animation says it. |
| `src/ui/game/panels/ActionBar.tsx:14` | Bottom bar while a rival's purchase animates | `` `${pl?.name ?? ''} is shopping…` `` | REWRITE | `` `${pl?.name ?? ''} is buying…` `` | The step is called Buying; "shopping" is a second word for it. |
| `src/ui/game/panels/ActionBar.tsx:26` | Bottom bar on a rival's buying turn | `{pl?.name} is shopping…</div>` | REWRITE | `{pl?.name} is buying…</div>` | As above. |
| `src/ui/game/panels/ActionBar.tsx:22` | Bottom bar after playing Free Fruit | `<b class="move">Pick a free fruit</b>` | REWRITE | `<b class="move">Pick a free piece</b>` | "Piece". |
| `src/ui/game/panels/ActionBar.tsx:23` | Bottom bar: button on your buying turn | `{pl.boughtToday ? 'Done buying' : 'Skip buying'}` | KEEP |  |  |
| `src/ui/game/panels/ActionBar.tsx:23` | Bottom bar: small text in the buying button | `<small class="btn-sub">{Math.max(0, limit - pl.boughtToday)} more allowed</small>` | CUT | **cut** | Said twice: the Wholesale Market heading shows "Your turn · 2 of 4 bought" at the same time. |

## Screen · stocking

You choose the pieces that go in your crate. This one step has three names on screen: "Stocking" (top bar), "Fill your crate" (heading) and "Open my stall" (button, waiting text, tutorial tip).

| File:line | Where shown | Current text | Verdict | Proposed | Reason |
|---|---|---|---|---|---|
| `src/ui/panel.tsx:103` | Stocking panel: heading | `<b class="tk-label">Fill your crate</b>` | KEEP |  |  |
| `src/ui/panel.tsx:103` | Stocking panel: count beside the heading | `{total} {total === 1 ? 'piece' : 'pieces'} out` | REWRITE | `{total} {total === 1 ? 'piece' : 'pieces'} in crate` | Crate, not "out". |
| `src/ui/panel.tsx:105` | Stocking panel: your crate | `<span>Your crate</span>` | KEEP |  |  |
| `src/ui/panel.tsx:107` | Stocking panel: your crate with nothing in it | `<span class="tk-crate-none">empty</span>` | KEEP |  |  |
| `src/engine/story.ts:743` | Stocking panel on Closing Day | `` `Closing Day: ripe fruit left tonight goes to the jam maker at $${JAM_PRICE} each.` `` | KEEP |  |  |
| `src/engine/story.ts:754` | Stocking panel on Closing Day with only Green fruit | `stocking: 'Closing Day: green fruit left tonight is worth $0. The jam maker buys ripe fruit only.'` | REWRITE | `stocking: 'Closing Day: Green fruit left tonight is worth $0. The jam maker buys ripe fruit only.'` | Capital G for the state. |
| `src/engine/story.ts:762` | Stocking panel on the last day when Closing Day is off | `stocking: 'Last day: anything unsold tonight is worth $0.'` | KEEP |  |  |
| `src/ui/panel.tsx:112` | Stocking panel with nothing ripe | `You have no ripe fruit to sell today.` | KEEP |  |  |
| `src/ui/panel.tsx:124` | Stocking panel: each row | `<b>{n} on shelf</b>` | KEEP |  |  |
| `src/ui/panel.tsx:124` | Stocking panel: small text on each row | `` `${wanted} wanted${drop ? ` · sells $${drop} less` : ''}` : 'still green' `` | REWRITE | `` `${wanted} wanted${drop ? ` · sells $${drop} less` : ''}` : 'Green: cannot sell yet' `` | Says the rule, with the state capitalised. |
| `src/ui/panel.tsx:129` | Stocking panel: count between − and + | `<small>in crate</small>` | KEEP |  |  |
| `src/ui/panel.tsx:137` | Stocking panel: note under the rows (only when there are 3 rows or fewer) | `Only the crate can sell today. Rivals will see how many pieces you put out, not which fruit, and never your price.` | CUT | **cut** · if kept: `Only pieces in your crate can sell today. Rivals see how many, not which fruit.` | Said twice: in a first game the tutorial tip on this screen says the same two things, and How to play says them again. After a first game the player knows. If kept: "Only pieces in your crate can sell today. Rivals see how many, not which fruit." |
| `src/ui/panel.tsx:140` | Stocking panel: main button | `<>Open my stall <small class="btn-sub">{total} out</small></>` | REWRITE | `<>Crate ready <small class="btn-sub">{total} in crate</small></>` | Names the thing you just did. "Open my stall" is a third name for this step. |
| `src/ui/panel.tsx:140` | Stocking panel: main button with an empty crate | `'Keep everything back'` | REWRITE | `'Sell nothing today'` | Says what will happen. |
| `src/ui/panel.tsx:197` | Price panel while rivals are still stocking | `Rivals are opening their stalls…` | REWRITE | `Rivals are filling their crates…` | Same step, same words. |
| `src/ui/game/panels/PricingTable.tsx:33` | Rival crate while it is still stocking | `{opening ? 'opening…' : 'ready'}` | REWRITE | `{opening ? 'filling…' : 'ready'}` | As above. |
| `src/ui/panel.tsx:236` | Price panel: greyed button while rivals are still stocking | `>Waiting for rivals…</button>` | KEEP |  |  |
| `src/ui/game/panels/ActionBar.tsx:28` | Bottom bar (online) after you stock | `` `Stall open. Waiting for ${waitingFor(humansMissingBids) \|\| 'the market'}` `` | REWRITE | `` `Crate ready. Waiting for ${waitingFor(humansMissingBids) \|\| 'the others'}` `` | Same step, same words; "the market" here means the other stalls. |
| `src/ui/game/panels/ActionBar.tsx:28` | Bottom bar while computer stalls stock | `'Rivals are opening their stalls…'` | REWRITE | `'Rivals are filling their crates…'` | Same step, same words. |

## Screen · the bell (setting secret prices)

Rival crates (shut), your price for each fruit, and the "i" notice that explains the bell. The same two facts (crates are shut; you see only a count) are stated in the heading, in the note under the prices, in the "i" notice and in the tutorial tip.

| File:line | Where shown | Current text | Verdict | Proposed | Reason |
|---|---|---|---|---|---|
| `src/ui/panel.tsx:195` | Price panel: heading | `Rival crates · shut until the bell` | KEEP |  |  |
| `src/ui/game/panels/PricingTable.tsx:34` | Rival crate: under the number | `{n === 1 ? 'piece out' : 'pieces out'}` | REWRITE | `{n === 1 ? 'piece' : 'pieces'}` | It is a picture of a crate; "out" adds nothing. |
| `src/ui/game/panels/PricingTable.tsx:34` | Rival crate with nothing in it | `<small>nothing out</small>` | REWRITE | `<small>empty</small>` | Your own crate says "empty" for the same thing. |
| `src/ui/game/panels/PricingTable.tsx:31` | Rival crate once its prices are set | `<i class="tk-sealed" aria-hidden="true">sealed</i>` | KEEP |  |  |
| `src/ui/panel.tsx:199` | Price panel: heading over your prices | `<b class="tk-label">Your secret prices</b><span class="tk-side">One price per fruit</span>` | KEEP |  |  |
| `src/ui/panel.tsx:200` | Price panel with an empty crate | `You put nothing out today.` | REWRITE | `Your crate is empty today.` | Crate, not "out". |
| `src/ui/panel.tsx:213` | Price panel: each fruit row | `<b>{forSale(s, p, f)} out · {wanted} wanted</b>` | REWRITE | `<b>{forSale(s, p, f)} in crate · {wanted} wanted</b>` | Crate, not "out". |
| `src/ui/panel.tsx:213` | Price panel: small text on each fruit row | `` `${buy} buy at $${price} · top $${top}` : 'Nobody wants yours' `` | KEEP |  |  |
| `src/ui/panel.tsx:226` | Price panel: Favoured Trade button | `{favoured ? 'Favoured Trade on: you win ties today' : 'Play Favoured Trade?'}` | KEEP |  |  |
| `src/ui/panel.tsx:229` | Price panel: note under the prices | `You see how many pieces each rival put out, not which fruit: that shows at the bell. Cheapest stall sells first; okay fruit pays $1 less.` | REWRITE | `The cheapest stall sells first. Okay sells for $1 less, Soft for $2 less.` | The first sentence repeats the heading at the top of this panel. The second left out Soft. |
| `src/ui/panel.tsx:237` | Price panel: main button | `Ring the bell <small class="btn-sub">seal {posts.length} {posts.length === 1 ? 'price' : 'prices'}</small>` | REWRITE | `Seal prices <small class="btn-sub">{posts.length} {posts.length === 1 ? 'price' : 'prices'}</small>` | The button seals your prices. The bell rings only when every stall has done the same, so with friends or online this button does not ring it. Option: keep "Ring the bell" if the owner likes the moment more than the accuracy. |
| `src/ui/panel.tsx:258` | The Bell notice (from the "i" button): banner | `<span class="bn-ban">THE BELL</span>` | KEEP |  |  |
| `src/ui/panel.tsx:247` | The Bell notice: line 1 | `'Price every fruit you put out!'` | REWRITE | `'Set one price for each fruit in your crate.'` | No "!"; crate. |
| `src/ui/panel.tsx:248` | The Bell notice: line 2 | `'Prices stay secret until the bell.'` | KEEP |  |  |
| `src/ui/panel.tsx:249` | The Bell notice: line 3 | `'Crates stay shut until the bell: you only see how many pieces.'` | KEEP |  |  |
| `src/ui/panel.tsx:250` | The Bell notice: line 4 | `'Lowest price sells first!'` | REWRITE | `'The lowest price sells first.'` | No "!". |
| `src/ui/panel.tsx:251` | The Bell notice: line 5 | `'A tie? Favoured Trade, then freshest fruit, then the Haggler, then the early bird.'` | REWRITE | `'Ties: Favoured Trade, then fresher fruit, then the Haggler, then whoever bought earlier today.'` | Rhetorical question; "the early bird" is a joke name for the buying order. Same wording as How to play. |
| `src/ui/panel.tsx:252` | The Bell notice: line 6 | `'Fulfil all of a customer’s orders to earn a favour card.'` | CORRECTNESS | `'Serve a customer’s whole order by yourself to earn a favour card.'` | LEAVES OUT "BY YOURSELF". Two stalls that fill an order between them earn nothing (RULES.md: "serve a customer's entire remaining order by yourself"). A customer also has one order, not "orders". |
| `src/ui/panel.tsx:262` | The Bell notice: button | `>Ring the bell!</button>` | REWRITE | `>Got it</button>` | This button only closes the notice. The real button underneath has the same words. |
| `src/ui/game/panels/PricingTable.tsx:49` | The bell: banner as every crate opens (the one real shout) | `<b>The bell!</b><span>Every crate is open</span>` | KEEP |  |  |
| `src/ui/game/panels/PricingTable.tsx:57` | The bell: name on each open crate | `{x.me ? 'You' : pl.name}` | KEEP |  |  |
| `src/ui/game/panels/PricingTable.tsx:66` | The bell: an open crate with nothing in it | `<span class="tk-crate-none">nothing out</span>` | REWRITE | `<span class="tk-crate-none">empty</span>` | Same word as on your own crate. |
| `src/ui/game/panels/ActionBar.tsx:29` | Bottom bar (online) after you set prices | `` `Prices locked. Waiting for ${waitingFor(humansMissingBids) \|\| 'the market'}` `` | REWRITE | `` `Prices sealed. Waiting for ${waitingFor(humansMissingBids) \|\| 'the others'}` `` | "Sealed" is the word on the crates and the button; "locked" is a second word for it. |
| `src/ui/game/panels/ActionBar.tsx:29` | Bottom bar while computer stalls set prices | `'Rivals are setting secret prices…'` | KEEP |  |  |

## Screen · the rush

One customer at a time: their card, each stall's price, a tag on each stall, a result line, sometimes a detail line, the customer's reaction in quotes, and sometimes a rival's speech tag. That is up to five kinds of text for one sale. Recommendation: cut the customer reactions (and most rival lines, see Cards · shopkeepers).

| File:line | Where shown | Current text | Verdict | Proposed | Reason |
|---|---|---|---|---|---|
| `src/ui/game/panels/Showdown.tsx:77` | Rush pop-up: heading | `<b class="tk-label">Customer {a.n} of {a.of}</b>` | KEEP |  |  |
| `src/ui/game/panels/Showdown.tsx:84` | Rush pop-up: what the customer wants | `{l.want} {want.fruit} · up to ${l.max}</span>` | REWRITE | `{l.want} {want.fruit.toLowerCase()} · up to ${l.max}</span>` | Sentence case: "3 blueberries", not "3 Blueberries". |
| `src/ui/game/panels/Showdown.tsx:85` | Rush pop-up: freshness type | `<small>Buys {PREF_INFO[prefOf(l.name)].short.toLowerCase()}</small>` | REWRITE | `<small>Buys {PREF_INFO[prefOf(l.name)].short}</small>` | Keeps the capitals on Fresh, Okay, Soft. |
| `src/ui/game/panels/Showdown.tsx:97` | Rush pop-up: name on each stall's box | `{seat.me ? 'You' : pl.name}` | KEEP |  |  |
| `src/ui/game/rush.ts:47` | Rush pop-up: under a price whose fruit this customer will not take | `text: 'none qualify'` | REWRITE | `text: 'cannot sell'` | "Qualify" is rulebook language; the tag below gives the reason. |
| `src/ui/game/rush.ts:48` | Rush pop-up: under each price | `` text: `${o.qty} offered` `` | KEEP |  |  |
| `src/ui/game/panels/Showdown.tsx:119` | Rush pop-up: hint | `Tap to move on` | KEEP |  |  |
| `src/engine/story.ts:434` | Rush result line: a standing order filled | `` `${who} delivered all ${ord.qty} at $${ord.price}!` `` | REWRITE | `` `${who} delivered all ${ord.qty} at $${ord.price}.` `` | No "!". |
| `src/engine/story.ts:435` | Rush result line: a standing order part filled | `` `${who} delivered ${mine} of ${ord.qty}.${gap}` `` | KEEP |  |  |
| `src/engine/story.ts:432` | Rush result line: rivals supply the rest of a standing order | `` ` ${rivals.map((x) => s.players[x.player].name).join(' and ')} filled the gap at $${rivals[0].price}.` `` | KEEP |  |  |
| `src/engine/story.ts:435` | Rush detail line: standing-order fine | `` `${who} is fined $${ord.fine}.` `` | KEEP |  |  |
| `src/engine/story.ts:444` | Rush result line: no stall had the fruit | `` `No ${plural} for ${cust}!` `` | REWRITE | `` `Nobody had ${plural} for ${cust}.` `` | No "!"; says why. |
| `src/engine/story.ts:448` | Rush result line: stalls offered, nobody sold | `` allPrice ? `Too pricey for ${cust}!` : `Nothing good enough for ${cust}.`, detail: allPrice ? why[0].detail : undefined `` | REWRITE | `` allPrice ? `Every price was too high for ${cust}.` : `Nothing ${cust} would buy.`, detail: allPrice ? why[0].detail : undefined `` | No "!". "Good enough" hides whether the problem was price or freshness; the tags say which. |
| `src/engine/story.ts:451` | Rush result line: two or more stalls sold | `` `${winners.map(name).join(' and ')} split the order: ${sold} sold.` `` | KEEP |  |  |
| `src/engine/story.ts:456` | Rush result line: a tie | `` `Tie at $${w.price}. ${name(w)} wins: ${tieShort(s, w, tie)}!` `` | REWRITE | `` `Tie at $${w.price}. ${name(w)} wins: ${tieShort(s, w, tie)}.` `` | No "!". |
| `src/engine/story.ts:459` | Rush result line: one stall undercut another | `` `${name(w)} beat ${name(next)} by $${next.price - w.price}! ${w.sold} sold.` `` | REWRITE | `` `${name(w)} beat ${name(next)} by $${next.price - w.price}. ${w.sold} sold.` `` | No "!". |
| `src/engine/story.ts:462` | Rush result line: sold at the customer's top price | `` `${name(w)} sold ${w.sold} at full price!` `` | REWRITE | `` `${name(w)} sold ${w.sold} at top price.` `` | No "!"; "top price" is the term on this pop-up ("up to \$5"). |
| `src/engine/story.ts:462` | Rush result line: one stall sold | `` `${name(w)} sold ${w.sold} at $${w.price}.` `` | KEEP |  |  |
| `src/engine/story.ts:443` | Rush detail line: order not filled | `` `${left} more wanted.` `` | KEEP |  |  |
| `src/engine/story.ts:69` | Rush detail line: freshness words ("pays up to \$5 for fresh, \$4 for okay") | `{ fresh: 'fresh', okay: 'okay', notso: 'soft' }` | REWRITE | `{ fresh: 'Fresh', okay: 'Okay', notso: 'Soft' }` | Capitals for the states. |
| `src/engine/story.ts:102` | Rush detail line: every price too high for a Premium customer | `` `${cust} buys fresh fruit only, up to $${top}${withDisplay}.` `` | REWRITE | `` `${cust} buys Fresh only, up to $${top}${withDisplay}.` `` | Capital F; matches the type's short form "Fresh only". |
| `src/engine/story.ts:103` | Rush detail line: every price too high | `` `${cust} pays up to ${items.length > 1 ? `${items.slice(0, -1).join(', ')} and ${items[items.length - 1]}` : items[0]}${pref === 'everyday' ? '; never soft' : ''}.` `` | REWRITE | `` `${cust} pays up to ${items.length > 1 ? `${items.slice(0, -1).join(', ')} and ${items[items.length - 1]}` : items[0]}${pref === 'everyday' ? '; never Soft' : ''}.` `` | Capital S. |
| `src/engine/story.ts:99` | Rush detail line: added when the stall has a Premium Display | `` ` with ${mine ? 'your' : 'a'} Premium Display` `` | KEEP |  |  |
| `src/engine/story.ts:49` | Rush result line: reason a tie was won | `return 'Favoured Trade';` | KEEP |  |  |
| `src/engine/story.ts:50` | Rush result line: reason a tie was won | `return 'fresher fruit';` | KEEP |  |  |
| `src/engine/story.ts:51` | Rush result line: reason a tie was won | `return 'Haggler';` | KEEP |  |  |
| `src/engine/story.ts:52` | Rush result line: reason a tie was won | `return 'bought first';` | REWRITE | `return 'bought earlier today';` | The rule's own words; "first" is not always true (earlier than the other stall, not first of all). |
| `src/engine/story.ts:125` | Rush tag on a stall that sold everything it offered | `` o.qty > 1 ? `SOLD ×${o.sold}` : 'SOLD' `` | KEEP |  |  |
| `src/engine/story.ts:126` | Rush tag: sold part of what it offered | `` `sold ${o.sold} of ${o.qty}` `` | KEEP |  |  |
| `src/engine/story.ts:128` | Rush tag: undercut | `` `$${o.price - Math.max(...cheaper.map((w) => w.price))} too high` `` | KEEP |  |  |
| `src/engine/story.ts:131` | Rush tag: lost a tie | `'lost tie: Favoured Trade'` | KEEP |  |  |
| `src/engine/story.ts:132` | Rush tag: lost a tie | `'lost tie: fresher won'` | KEEP |  |  |
| `src/engine/story.ts:132` | Rush tag: lost a tie | `'lost tie: Haggler'` | KEEP |  |  |
| `src/engine/story.ts:132` | Rush tag: lost a tie on the buying order | `? 'lost tie: Haggler' : 'lost tie';` | REWRITE | `? 'lost tie: Haggler' : 'lost tie: bought later';` | The other three tie tags give the reason; this one did not. |
| `src/engine/story.ts:134` | Rush tag: the order was filled before this stall's turn | `return 'sold out first';` | REWRITE | `return 'order filled first';` | AMBIGUOUS: reads as "this stall sold out". It means the customer's order was filled by other stalls before this one's turn. |
| `src/engine/story.ts:106` | Rush tag: priced above the customer's top price | `` tag: `over $${top} top` `` | REWRITE | `` tag: `over top price $${top}` `` | Word order. |
| `src/engine/story.ts:109` | Rush tag: a Premium customer, fruit not Fresh | `tag: 'fresh only'` | REWRITE | `tag: 'Fresh only'` | Capital F. |
| `src/engine/story.ts:112` | Rush tag: an Everyday customer, fruit Soft | `tag: "won't take soft"` | REWRITE | `tag: "won't take Soft"` | Capital S. |
| `src/engine/story.ts:118` | Rush tag: fruit too old for the price asked | `` tag: `too old for $${o.price}` `` | KEEP |  |  |
| `src/engine/story.ts:495` | Rush pop-up: customer's words, in quotes, order filled | `'Perfect, thanks!'` | CUT | **A: cut** (recommended) · B: `'Thanks.'` | Praise word. |
| `src/engine/story.ts:495` | Rush pop-up: customer's words, in quotes, order filled | `'Yum!'` | CUT | **A: cut** (recommended) · B: none offered | A fifth text on a pop-up that already says who sold what. |
| `src/engine/story.ts:495` | Rush pop-up: customer's words, in quotes, order filled | `'Just what I needed!'` | CUT | **A: cut** (recommended) · B: none offered | A fifth text on a pop-up that already says who sold what. |
| `src/engine/story.ts:495` | Rush pop-up: customer's words, in quotes, order filled | `'Lovely!'` | CUT | **A: cut** (recommended) · B: none offered | A fifth text on a pop-up that already says who sold what. |
| `src/engine/story.ts:495` | Rush pop-up: customer's words, in quotes, order filled | `'A bargain!'` | CUT | **A: cut** (recommended) · B: none offered | WRONG SOMETIMES: shown at random for any happy customer, including one who paid top price. |
| `src/engine/story.ts:496` | Rush pop-up: customer's words, order part filled | `'Hmph, not enough.'` | CUT | **A: cut** (recommended) · B: `'I wanted more.'` | As above; the detail line already says "2 more wanted". |
| `src/engine/story.ts:496` | Rush pop-up: customer's words, order part filled | `'I wanted more…'` | CUT | **A: cut** (recommended) · B: none offered | As above; the detail line already says "2 more wanted". |
| `src/engine/story.ts:496` | Rush pop-up: customer's words, order part filled | `'Is that all?'` | CUT | **A: cut** (recommended) · B: none offered | As above; the detail line already says "2 more wanted". |
| `src/engine/story.ts:497` | Rush pop-up: customer's words, nothing bought | `"I'm off. Never again!"` | CUT | **A: cut** (recommended) · B: `"Nothing for me today."` | UNTRUE: the same customer can come back when the deck is reshuffled. Also a fifth text on the pop-up. Option B: "Nothing for me today." |
| `src/engine/story.ts:497` | Rush pop-up: customer's words, nothing bought | `'Waste of a trip!'` | CUT | **A: cut** (recommended) · B: none offered | As above. |
| `src/engine/story.ts:497` | Rush pop-up: customer's words, nothing bought | `'Goodbye, then!'` | CUT | **A: cut** (recommended) · B: none offered | As above. |
| `src/ui/game/animator.tsx:117` | Tag over the customers when nobody offered anything | `'No sales today'` | KEEP |  |  |
| `src/ui/game/animator.tsx:179` | Tag over a stall that earns a favour card | `'Favour card!'` | REWRITE | `'+1 favour card'` | No "!"; reads like the "+\$5" tags beside it. |
| `src/ui/game/animator.tsx:58` | Tag over a stall that plays a favour card | `` `${FAVOURS[played].title}!` `` | REWRITE | `` `${FAVOURS[played].title}` `` | No "!". |
| `src/ui/game/animator.tsx:64` | Tag over a stall that builds an upgrade | `` `Built: ${UPGRADES[u].title}` `` | KEEP |  |  |
| `src/ui/game/animator.tsx:190` | Tag on a stall's cash after the rush (tips and the night hawker) | `` `+$${tip} bonus` `` | KEEP |  |  |
| `src/ui/game/animator.tsx:228` | Tag on a stall's cash at night | `` `+$${n * JUICE_VALUE} juice` `` | KEEP |  |  |
| `src/ui/game/panels/ActionBar.tsx:13` | Bottom bar during the rush: button | `>Skip ⏩</button>` | REWRITE | `>Skip</button>` | The only emoji left on a button (PLAN-027 removed emoji from the interface). |
| `src/ui/game/panels/ActionBar.tsx:14` | Bottom bar during the rush | `'Selling… tap to speed up'` | KEEP |  |  |

## Screen · sales summary (end of the rush)

The day's money, tonight's warning, up to two "highlights", each stall's takings and your standing. The highlights are the only place in the game that still shows emoji.

| File:line | Where shown | Current text | Verdict | Proposed | Reason |
|---|---|---|---|---|---|
| `src/ui/game/panels/SalesSummary.tsx:31` | Sales summary: title | `` {rem === 0 ? 'MARKET CLOSED' : `END OF DAY ${s.day}`} `` | KEEP |  |  |
| `src/ui/game/panels/SalesSummary.tsx:33` | Sales summary: money line | `<span>Sales <b` | KEEP |  |  |
| `src/ui/game/panels/SalesSummary.tsx:34` | Sales summary: money line | `<span>Bought <b` | KEEP |  |  |
| `src/ui/game/panels/SalesSummary.tsx:35` | Sales summary: money line | `{jamTonight ? 'Jam maker tonight' : 'Jam maker'}` | KEEP |  |  |
| `src/ui/game/panels/SalesSummary.tsx:36` | Sales summary: money line | `<span>Other <b` | KEEP |  |  |
| `src/ui/game/panels/SalesSummary.tsx:37` | Sales summary: money line | `<span class="net">Net <b` | KEEP |  |  |
| `src/engine/story.ts:616` | Sales summary and evening: tonight's warning ("2 spoil tonight, 1 becomes juice (+\$2)") | `` `${o.spoil} ${spoils} tonight, ${becomeJuice(o.juice)} ${cash}` `` | KEEP |  |  |
| `src/engine/story.ts:617` | Sales summary and evening: tonight's warning | `` `${o.juice} fruit ${o.juice === 1 ? 'becomes' : 'become'} juice tonight ${cash}` `` | KEEP |  |  |
| `src/engine/story.ts:618` | Sales summary and evening: tonight's warning ("3 fruit spoil tonight") | `` `${o.spoil} fruit ${spoils} tonight` `` | KEEP |  |  |
| `src/ui/game/panels/SalesSummary.tsx:11` | Sales summary on a Pasar Malam day | `` `The night hawker bought ${hawk.length} of your leftover fruit (+$${hawk.reduce((a, x) => a + x.price, 0)}).` `` | KEEP |  |  |
| `src/ui/game/panels/SalesSummary.tsx:13` | Sales summary for Farah | `` `Sharp Ears: ${tips.length} walk-in${tips.length === 1 ? '' : 's'} you heard about tipped you $${tips.reduce((a, x) => a + x.tip, 0)}.` `` | REWRITE | `` `Sharp Ears: ${tips.length} walk-in${tips.length === 1 ? '' : 's'} you had seen tipped you $${tips.reduce((a, x) => a + x.tip, 0)}.` `` | The perk says "a walk-in you have seen". |
| `src/engine/story.ts:559` | Sales summary: highlight | `` n === 1 ? `You beat ${s.players[p].name} to a customer!` : `You beat ${s.players[p].name} ${n} times today!` `` | REWRITE | `` n === 1 ? `You beat ${s.players[p].name} to a customer.` : `You beat ${s.players[p].name} ${n} times today.` `` | No "!". |
| `src/engine/story.ts:562` | Sales summary: highlight | `` e.close === 1 ? `${s.players[p].name} edged you out by $1 or less.` : `${s.players[p].name} edged you out ${e.close} times by $1 or less.` `` | REWRITE | `` e.close === 1 ? `${s.players[p].name} beat you by $1 or on a tie.` : `${s.players[p].name} beat you ${e.close} times by $1 or on a tie.` `` | "Edged you out" is sports writing; "\$1 or less" means \$1 or a tie. |
| `src/engine/story.ts:563` | Sales summary: highlight | `` `${s.players[p].name} undercut you ${e.n === 1 ? 'once' : `${e.n} times`}.` `` | KEEP |  |  |
| `src/engine/story.ts:566` | Sales summary: highlight | `` `${lookOf(bestLine.l.name).title} saved your day with $${bestLine.rev}.` `` | REWRITE | `` `Your biggest sale: $${bestLine.rev} from ${lookOf(bestLine.l.name).title}.` `` | "Saved your day" is a flourish. |
| `src/engine/story.ts:570` | Sales summary: highlight | `` `Your mangoes sold at a premium ($${Math.max(...mango.map((o) => o.price))} each).` `` | REWRITE | `` `Your mangoes sold for $${Math.max(...mango.map((o) => o.price))} each.` `` | "At a premium" is vague, and Premium is a customer type. |
| `src/engine/story.ts:577` | Sales summary: highlight | `` `${p === viewer ? 'You' : s.players[p].name} dominated the ${FRUIT[f].name.toLowerCase()} market (${n} sold).` `` | REWRITE | `` `${p === viewer ? 'You' : s.players[p].name} sold the most ${FRUIT[f].plural.toLowerCase()} today (${n}).` `` | "Dominated the market" is a flourish, and it is one more meaning for "market". Note: the fruit word changes from name to plural. |
| `src/engine/story.ts:584` | Sales summary: highlight | `` `${night.spoil} of your fruit will spoil tonight${juice}.` `` | CUT | **cut** | Said twice on the same card: the line above the highlights already reads "3 fruit spoil tonight". |
| `src/engine/story.ts:587` | Sales summary: highlight | `'A quiet day: you made no offers.'` | REWRITE | `'You had nothing customers wanted today.'` | "Made no offers" is engine language. |
| `src/engine/story.ts:559` | Sales summary: picture in front of each highlight | `icon: '⚔️'` | CUT | **cut** | Emoji in front of a highlight. The interface has no other emoji (PLAN-027); the text carries the meaning. |
| `src/engine/story.ts:562` | Sales summary: picture in front of each highlight | `icon: '😤'` | CUT | **cut** | Emoji in front of a highlight. The interface has no other emoji (PLAN-027); the text carries the meaning. |
| `src/engine/story.ts:563` | Sales summary: picture in front of each highlight | `icon: '📉'` | CUT | **cut** | Emoji in front of a highlight. The interface has no other emoji (PLAN-027); the text carries the meaning. |
| `src/engine/story.ts:566` | Sales summary: picture in front of each highlight | `icon: '⭐'` | CUT | **cut** | Emoji in front of a highlight. The interface has no other emoji (PLAN-027); the text carries the meaning. |
| `src/engine/story.ts:570` | Sales summary: picture in front of each highlight | `icon: '🥭'` | CUT | **cut** | Emoji in front of a highlight. The interface has no other emoji (PLAN-027); the text carries the meaning. |
| `src/engine/story.ts:577` | Sales summary: picture in front of each highlight | `icon: '👑'` | CUT | **cut** | Emoji in front of a highlight. The interface has no other emoji (PLAN-027); the text carries the meaning. |
| `src/engine/story.ts:584` | Sales summary: picture in front of each highlight | `icon: '🗑️'` | CUT | **cut** | Emoji in front of a highlight. The interface has no other emoji (PLAN-027); the text carries the meaning. |
| `src/engine/story.ts:587` | Sales summary: picture in front of each highlight | `icon: '😶'` | CUT | **cut** | Emoji in front of a highlight. The interface has no other emoji (PLAN-027); the text carries the meaning. |
| `src/engine/story.ts:520` | Sales summary: your standing when you lead | `` second === undefined ? 'Leading' : gap === 0 ? `Tied with ${s.players[second].name}` : `1st · $${gap} ahead of ${s.players[second].name}` `` | KEEP |  |  |
| `src/engine/story.ts:524` | Sales summary: your standing when you trail | `const ord = ['1st', '2nd', '3rd', '4th'][rank - 1];` | CORRECTNESS | `const ord = ['1st', '2nd', '3rd', '4th', '5th', '6th'][rank - 1];` | SHOWS "undefined" WITH 5 OR 6 STALLS: a stall in 5th or 6th place reads "undefined · \$7 behind Saleh" (checked by running the engine with 6 stalls). |
| `src/engine/story.ts:525` | Sales summary: your standing when you trail | `` `${ord} · $${gap} behind ${s.players[ahead].name}` `` | KEEP |  |  |
| `src/ui/game/panels/SalesSummary.tsx:53` | Sales summary: after your standing | `` ` · ${rem} day${rem > 1 ? 's' : ''} to go` `` | KEEP |  |  |
| `src/ui/game/panels/ActionBar.tsx:35` | Bottom bar: button after the sales summary | `{s.day >= s.config.days ? 'See final results' : 'Close for the day'}` | REWRITE | `{s.day >= s.config.days ? 'See results' : 'Close for the day'}` | "Final" adds nothing: there is only one set of results. |

## Screen · evening

Tonight's warning, upgrades after a Market Day, Shade Cloth, and favour cards you can play.

| File:line | Where shown | Current text | Verdict | Proposed | Reason |
|---|---|---|---|---|---|
| `src/engine/story.ts:635` | Evening: Heatwave warning | `` `Heatwave: everything ages ${extra === 1 ? 'twice' : `${1 + extra} times`} tonight.` `` | REWRITE | `` `Heatwave: all fruit ages ${extra === 1 ? '2 steps' : `${1 + extra} steps`} tonight.` `` | Same words as the Heatwave card. |
| `src/ui/panel.tsx:296` | Evening after a Market Day: heading and note | `<b>Stall upgrades</b><span>After each Market Day you may build one upgrade. Your stall has room for two. Cash spent is cash you can't win with: {left} day{left === 1 ? '' : 's'} left to earn it back.</span>` | REWRITE | `<b>Upgrades</b><span>You may build 1 upgrade tonight. Your stall has room for 2. {left} day{left === 1 ? '' : 's'} left to earn the cost back.</span>` | "Cash spent is cash you can't win with" is a saying. Digits. |
| `src/ui/panel.tsx:307` | Evening: an upgrade you already have | `<span class="up-owned">Built</span>` | KEEP |  |  |
| `src/ui/panel.tsx:308` | Evening: button on each upgrade | `>Build ${d.cost}</button>` | KEEP |  |  |
| `src/ui/panel.tsx:314` | Evening: list of what you have built | `<div class="owned-row">Built: ` | KEEP |  |  |
| `src/ui/panel.tsx:331` | Evening for Pak Din | `` <b>Shade Cloth</b><span>Name one fruit: none of your pieces of it age tonight.{pl.shade === undefined && chosen ? ` Suggested: ${FRUIT[chosen].plural.toLowerCase()}.` : ''}</span> `` | REWRITE | `` <b>Shade Cloth</b><span>Name 1 fruit. Your pieces of it do not age tonight.{pl.shade === undefined && chosen ? ` Suggested: ${FRUIT[chosen].plural.toLowerCase()}.` : ''}</span> `` | Same words as the perk card. |
| `src/ui/panel.tsx:336` | Evening for Pak Din: last choice | `>None</button>` | KEEP |  |  |
| `src/ui/panel.tsx:318` | Evening: heading over your favour cards | `<b>Up your sleeve</b><span>Favour cards you can play.</span>` | REWRITE | `<b>Favour cards</b><span>Tap one to play it.</span>` | "Up your sleeve" is an idiom for a heading; name the thing. |
| `src/ui/panel.tsx:320` | Evening: last line of the panel | `<b class="psst">Psst…</b> the rivals are plotting tonight too.` | CUT | **cut** | Filler aside. It tells the player nothing they can act on. |
| `src/ui/game/panels/ActionBar.tsx:30` | Bottom bar: evening button | `Lights out <small class="btn-sub">next day</small>` | KEEP |  |  |
| `src/ui/game/panels/ActionBar.tsx:31` | Bottom bar on a rival's evening turn | `{pl?.name} is closing up…</div>` | KEEP |  |  |

## Screen · night

Every piece slides one box older; what spoiled; the day's money.

| File:line | Where shown | Current text | Verdict | Proposed | Reason |
|---|---|---|---|---|---|
| `src/ui/game/panels/NightShift.tsx:49` | Night panel: heading | `<b>Night falls</b>` | KEEP |  |  |
| `src/ui/game/panels/NightShift.tsx:42` | Night panel: under the heading on a Monsoon Downpour night | `` `No fruit ages tonight${s.event ? ` (${s.event.title})` : ''}.` `` | KEEP |  |  |
| `src/ui/game/panels/NightShift.tsx:43` | Night panel: under the heading | `'Every piece slides down one box.'` | KEEP |  |  |
| `src/ui/game/panels/NightShift.tsx:43` | Night panel: under the heading on a Heatwave night | `` `Every piece slides down. ${s.event?.title ?? 'Tonight'}: ${steps} boxes tonight.` `` | REWRITE | `` `${s.event?.title ?? 'Tonight'}: every piece slides down ${steps} boxes.` `` | One sentence; "tonight" was said twice. |
| `src/ui/game/panels/NightShift.tsx:52` | Night panel: label | `<span class="tk-label">Wholesale market</span>` | REWRITE | `<span class="tk-label">Wholesale Market</span>` | Capital M. |
| `src/ui/game/panels/NightShift.tsx:56` | Night panel: label | `Your shelf{shade ? ' · Shade Cloth' : ''}` | KEEP |  |  |
| `src/ui/game/panels/NightShift.tsx:61` | Night panel: label | `<span>Spoiled tonight</span>` | KEEP |  |  |
| `src/ui/game/panels/NightShift.tsx:65` | Night panel: label | `End of day {s.day}` | KEEP |  |  |
| `src/ui/game/panels/NightShift.tsx:66` | Night panel: the day's money | `<span>Sales <b>+${sales}</b></span><span>Bought <b>−${bought}</b></span>` | KEEP |  |  |
| `src/ui/game/panels/ActionBar.tsx:14` | Bottom bar during the night | `night ? 'Night falls…'` | CUT | **cut** | Said twice: the night panel's own heading reads "Night falls". |

## Screen · results (end of the game)

The winner, the podium, a cash chart, your best and worst moments, League progress, achievements and looks unlocked, and up to five buttons.

| File:line | Where shown | Current text | Verdict | Proposed | Reason |
|---|---|---|---|---|---|
| `src/ui/game/panels/Results.tsx:57` | Results: headline | `` {win ? 'YOU WIN!' : `${champ.name.toUpperCase()} WINS!`} `` | KEEP |  | A real shout, like the bell. With the changes below these are the only two "!" left on a game screen. |
| `src/ui/game/panels/Results.tsx:58` | Results: line under the headline | `` margin === 0 ? 'A dead heat, decided on fruit sold!' : margin <= 5 ? `By just $${margin}. What a finish!` : `By $${margin}.` `` | REWRITE | `` margin === 0 ? 'Tied on cash. Decided by fruit sold.' : `By $${margin}.` `` | "Dead heat" and "What a finish!" are commentary. The number is the news. |
| `src/ui/game/panels/Results.tsx:42` | Results: medal on each row of the podium | `const ranks = ['1ST', '2ND', '3RD', '4TH'];` | CORRECTNESS | `const ranks = ['1ST', '2ND', '3RD', '4TH', '5TH', '6TH'];` | BLANK WITH 5 OR 6 STALLS: the 5th and 6th medals are empty, and Share result does nothing for a player who finished 5th or 6th (the code reads a rank that is not in the list). |
| `src/ui/game/panels/Results.tsx:70` | Results: small line under each stall | `` Sold {pl.stats.sold} · spoiled {pl.stats.spoiled} · best sale ${pl.stats.bestSale}{pl.stats.juiced ? ` · juice +$${pl.stats.juiced * JUICE_VALUE}` : ''}{s.jam?.[i] ? ` · jam maker +$${s.jam[i]}` : ''} `` | KEEP |  |  |
| `src/ui/game/panels/Results.tsx:25` | Results: chart heading | `<div class="rc-h">Cash, day by day</div>` | KEEP |  |  |
| `src/ui/game/panels/Results.tsx:29` | Results: chart key | `{i === viewer ? 'You' : pl.name}</span>)}</div>` | KEEP |  |  |
| `src/ui/game/panels/Results.tsx:67` | Results: name on the podium | `<b>{i === viewer ? 'You' : pl.name}</b>` | KEEP |  |  |
| `src/ui/game/panels/Results.tsx:78` | Results: heading | `<div class="rc-h good">Your best moments</div>` | KEEP |  |  |
| `src/ui/game/panels/Results.tsx:79` | Results: heading | `<div class="rc-h bad">Next time, watch out for</div>` | REWRITE | `<div class="rc-h bad">What cost you</div>` | Filler opener ("Next time,"). |
| `src/engine/story.ts:686` | Results: a best moment | `` `Best day: Day ${bestDay.day}, +$${bestDay.v}.` `` | KEEP |  |  |
| `src/engine/story.ts:687` | Results: a best moment | `` `Biggest sale: ${biggest.n} ${fruitWord(biggest.fruit, biggest.n)} to ${lookOf(biggest.name).title} for $${biggest.rev} (Day ${biggest.day}).` `` | KEEP |  |  |
| `src/engine/story.ts:689` | Results: a best moment | `` `You beat ${s.players[rivalry[0]].name} to ${rivalry[1].won} customer${rivalry[1].won > 1 ? 's' : ''}.` `` | KEEP |  |  |
| `src/engine/story.ts:690` | Results: a worst moment | `` `Day ${miss.day}: lost a $${miss.lost} sale to ${miss.who} on a tie.` `` | KEEP |  |  |
| `src/engine/story.ts:690` | Results: a worst moment | `` `Day ${miss.day}: ${miss.who} undercut you by $${miss.gap} on a $${miss.lost} sale.` `` | KEEP |  |  |
| `src/engine/story.ts:692` | Results: a worst moment | `` `${s.players[nemesis[0]].name} took ${nemesis[1].lost} customers from you.` `` | KEEP |  |  |
| `src/engine/story.ts:694` | Results: a worst moment | `` `${spoiled} fruit spoiled on your shelf.` `` | KEEP |  |  |
| `src/engine/story.ts:711` | Results: a worst moment | `` `${ripe} ripe fruit left at closing: the jam maker paid $${jam}.` `` | KEEP |  |  |
| `src/engine/story.ts:713` | Results: a worst moment | `` `${unpaid} green fruit left at closing (worth $0).` `` | KEEP |  |  |
| `src/engine/story.ts:713` | Results: a worst moment | `` `${unpaid} fruit left unsold at closing (worth $0).` `` | KEEP |  |  |
| `src/ui/game/panels/Results.tsx:84` | Results: after winning the last League stage | `'You are the Market League champion!'` | REWRITE | `'You won the Market League.'` | No "!". |
| `src/ui/game/panels/Results.tsx:84` | Results: after winning a League stage | `` `${LEAGUE[s.config.league].title} cleared! Next: ${LEAGUE[s.config.league + 1].title}` `` | REWRITE | `` `${LEAGUE[s.config.league].title} cleared. Next: ${LEAGUE[s.config.league + 1].title}` `` | No "!". |
| `src/ui/game/panels/Results.tsx:84` | Results: after losing a League stage | `` `Market League: win to clear ${LEAGUE[s.config.league].title}.` `` | KEEP |  |  |
| `src/ui/game/panels/Results.tsx:89` | Results: heading over new achievements | `<small>Achievement{earned.length > 1 ? 's' : ''} unlocked</small>` | KEEP |  |  |
| `src/ui/game/panels/Results.tsx:93` | Results: new looks | `New look{newLooks.length > 1 ? 's' : ''} unlocked: {newLooks.map((l) => l.title).join(', ')}. Find {newLooks.length > 1 ? 'them' : 'it'} in the Wardrobe (Trophies).` | KEEP |  |  |
| `src/ui/Game.tsx:67` | Results (online): after you ask to play again | `` `Waiting for ${waitingFor(humans.filter((i) => !meta.rematch.includes(i)))} to accept…` `` | KEEP |  |  |
| `src/ui/Game.tsx:67` | Results (online): when another player asks | `` `${waitingFor(meta.rematch)} wants a rematch!` `` | REWRITE | `` `${waitingFor(meta.rematch)} wants to play again.` `` | No "!"; same words as the button. |
| `src/ui/game/panels/Results.tsx:96` | Results: main button in the Market League | `(s.config.league + 1 >= LEAGUE.length ? 'See your trophies' : 'Next stage') : 'Try again')` | KEEP |  |  |
| `src/ui/game/panels/Results.tsx:96` | Results: main button | `s.config.daily ? 'Back to menu' : win ? 'Defend your title' : 'Rematch!'` | REWRITE | `s.config.daily ? 'Home' : 'Play again'` | One plain label for one action. "Defend your title" and "Rematch!" start the same new game. After a Daily market game this button and "Main menu" below it do the same thing: one of the two can go. |
| `src/ui/game/panels/Results.tsx:98` | Results: button | `>Share result</button>` | KEEP |  |  |
| `src/ui/game/panels/Results.tsx:99` | Results: button | `>Main menu</button>` | REWRITE | `>Home</button>` | See the pause menu: one name for going home. |
| `src/ui/game/panels/Results.tsx:47` | Results: text sent by Share result | `` const place = win ? 'I won' : `I came ${ranks[order.indexOf(viewer)].toLowerCase()}`; `` | KEEP |  |  |
| `src/ui/game/panels/Results.tsx:48` | Results: text sent by Share result | `` `Fruit Market: ${place} with $${s.players[viewer].cash} after ${s.config.days} days.` `` | KEEP |  |  |
| `src/ui/game/panels/DailyResult.tsx:29` | Results after a Daily market game | `<p class="chip">Daily market {s.config.daily}</p>` | KEEP |  |  |
| `src/ui/game/panels/DailyResult.tsx:30` | Results after a Daily market game | `Checking the leaderboard…` | KEEP |  |  |
| `src/ui/game/panels/DailyResult.tsx:34` | Results after a Daily market game: your place | `You're <b>#{res.rank}</b> today` | KEEP |  |  |
| `src/ui/game/panels/DailyResult.tsx:40` | Results after a Daily market game: share button | `{copied ? 'Copied! Paste it in a chat' : 'Share your result'}` | REWRITE | `{copied ? 'Copied. Paste it in a chat.' : 'Share your result'}` | No "!". Note: this screen then has two share buttons ("Share your result" here and "Share result" below); one can go. |
| `src/net/daily.ts:55` | Text sent by Share your result (the squares are part of the format) | `` `🍎 Fruit Market daily ${g.config.daily}\n$${g.players[me].cash}${place}\n${squares}` `` | KEEP |  |  |
| `src/net/daily.ts:23` | Results after a Daily market game, offline | `'Leaderboard needs an internet connection'` | KEEP |  |  |
| `src/net/daily.ts:32` | Results after a Daily market game: server refused | `'Could not submit'` | REWRITE | `'Your score could not be sent.'` | Says what could not be sent. |
| `src/net/daily.ts:34` | Results after a Daily market game: no connection | `'Offline: score not submitted'` | REWRITE | `'Offline. Your score was not sent.'` | Plain sentence. |
| `src/net/daily.ts:39` | Results after a Daily market game: leaderboard cannot be fetched | `error: 'offline'` | REWRITE | `error: 'Leaderboard needs an internet connection'` | The bare word "offline" is shown on the results screen when the leaderboard cannot be fetched. |
| `src/net/daily.ts:44` | Results after a Daily market game: leaderboard cannot be fetched | `error: 'offline'` | REWRITE | `error: 'Leaderboard needs an internet connection'` | The bare word "offline" is shown on the results screen when the leaderboard cannot be fetched. |

## How to play (7 slides)

Opened from the home screen. "Most cash wins" is said three times (slide 1 list, slide 1 paragraph, slide 6). The day is "seven phases" here, "five beats" on the top bar and in RULES.md. Slide 4 still says an unserved customer comes back the next day, which rules version 14 removed; slide 7 says the opposite.

| File:line | Where shown | Current text | Verdict | Proposed | Reason |
|---|---|---|---|---|---|
| `src/ui/HowTo.tsx:151` | How to play: top bar | `<b>How to play</b>` | KEEP |  |  |
| `src/ui/HowTo.tsx:44` | How to play: small label over slide 1 | `part: 'Overview'` | KEEP |  |  |
| `src/ui/HowTo.tsx:61` | How to play: small label over slides 2 to 5 | `part: 'The day'` | KEEP |  |  |
| `src/ui/HowTo.tsx:76` | How to play: small label over slides 2 to 5 | `part: 'The day'` | KEEP |  |  |
| `src/ui/HowTo.tsx:92` | How to play: small label over slides 2 to 5 | `part: 'The day'` | KEEP |  |  |
| `src/ui/HowTo.tsx:108` | How to play: small label over slides 2 to 5 | `part: 'The day'` | KEEP |  |  |
| `src/ui/HowTo.tsx:120` | How to play: small label over slides 6 and 7 | `part: 'The finish'` | KEEP |  |  |
| `src/ui/HowTo.tsx:133` | How to play: small label over slides 6 and 7 | `part: 'The finish'` | KEEP |  |  |
| `src/ui/HowTo.tsx:45` | How to play, slide 1: title | `title: 'Welcome to Fruit Market'` | REWRITE | `title: 'The game'` | A welcome line; the slide is the overview. |
| `src/ui/HowTo.tsx:48` | How to play, slide 1: first paragraph | `You run a fruit stall in a busy market. Every day you <b>buy</b> fruit from the farmers and <b>sell</b> it to the town's customers, against 1 to 5 rival stalls. There is about one customer a day for every stall. Fruit gets older every night, so you are always racing the clock.` | REWRITE | `You run a fruit stall. Each day you <b>buy</b> fruit at the Wholesale Market and <b>sell</b> it to customers, against 1 to 5 rival stalls. There is about 1 customer a day for each stall. Fruit ages every night.` | "From the farmers" is a third name for the Wholesale Market. "Always racing the clock" is a flourish. |
| `src/ui/HowTo.tsx:49` | How to play, slide 1: beside the big \$10 | `<span class="muted">each stall starts with</span>` | KEEP |  |  |
| `src/ui/HowTo.tsx:50` | How to play, slide 1 | `A game lasts 8, 10 or 14 days and goes like this:` | KEEP |  |  |
| `src/ui/HowTo.tsx:11` | How to play, slide 1: list, step 1 | `` ['Set-up', `Pick a shopkeeper with one perk. Each stall starts with $${START_CASH}.`] `` | REWRITE | `['Set-up', 'Pick a shopkeeper with one perk.']` | Said twice: the big "\$10 · each stall starts with" is directly above this list. |
| `src/ui/HowTo.tsx:12` | How to play, slide 1: list, step 2 | `['Ordinary days', 'Seven phases a day, from morning to night.']` | REWRITE | `['Ordinary days', 'Five steps, then evening and night.']` | The top bar and the rules count five steps. One count everywhere. |
| `src/ui/HowTo.tsx:13` | How to play, slide 1: list, step 3 | `` ['Market Days', `Days ${MARKET_DAY_LIST}: a standing order to bid for, and a stall upgrade that evening.`] `` | KEEP |  |  |
| `src/ui/HowTo.tsx:14` | How to play, slide 1: list, step 4 | `` ['Closing Day', `The last day. Customers pay $${LAST_CALL_BONUS} more, then the jam maker buys your ripe leftovers for $${JAM_PRICE} each.`] `` | KEEP |  |  |
| `src/ui/HowTo.tsx:15` | How to play, slide 1: list, step 5 | `['Final count', 'Most cash wins.']` | REWRITE | `['The end', 'Most cash wins.']` | Plain name for the step. |
| `src/ui/HowTo.tsx:56` | How to play, slide 1: last paragraph | `<b>Most cash after the last day wins.</b> Upgrades are worth nothing at the end. Leftover ripe fruit earns only ${JAM_PRICE} each from the jam maker, when Closing Day is on (the default).` | REWRITE | `Upgrades are worth nothing at the end. Leftover ripe fruit earns only ${JAM_PRICE} each from the jam maker.` | The first sentence repeats the last list item two lines up. "When Closing Day is on (the default)": the app has no switch for it any more. |
| `src/ui/HowTo.tsx:62` | How to play, slide 2: title | `title: 'The seven phases of a day'` | REWRITE | `title: 'A day, step by step'` | See the count above. |
| `src/ui/HowTo.tsx:65` | How to play, slide 2: first line | `Every day runs through the same seven phases, in this order:` | REWRITE | `Every day has the same five steps, then evening and night:` | As above. |
| `src/ui/HowTo.tsx:19` | How to play, slide 2: step 1 | `['Morning', 'The lorry unloads fruit at the Wholesale Market. An event card changes the day.']` | REWRITE | `['Morning', 'An event card is turned over. The lorry unloads at the Wholesale Market.']` | In the order it happens (RULES.md: event, then lorry). |
| `src/ui/HowTo.tsx:20` | How to play, slide 2: step 2 | `` ['Buying', `Each stall buys up to ${BASE_BUY} pieces. The poorest stall goes first, then the others clockwise.`] `` | KEEP |  |  |
| `src/ui/HowTo.tsx:21` | How to play, slide 2: step 3 | `['Stocking', 'Pick the exact fruit for your for-sale crate. Only crate fruit sells. Rivals learn how many pieces you put out, not which fruit.']` | REWRITE | `['Stocking', 'Put the pieces you want to sell in your crate. Only those can sell today. Rivals see how many, not which fruit.']` | "For-sale crate", "crate fruit" and "put out" are three ways of saying crate. |
| `src/ui/HowTo.tsx:22` | How to play, slide 2: step 4 | `['The bell', 'Set one secret price per fruit. Prices and crates open together.']` | KEEP |  |  |
| `src/ui/HowTo.tsx:23` | How to play, slide 2: step 5 | `['The rush', 'Customers buy from the cheapest stall first. You get paid on the spot.']` | KEEP |  |  |
| `src/ui/HowTo.tsx:24` | How to play, slide 2: evening | `['Evening', 'Play favour cards. After a Market Day, build one upgrade.']` | KEEP |  |  |
| `src/ui/HowTo.tsx:25` | How to play, slide 2: night | `['Night', 'All fruit ages one step. Spoiled fruit is thrown away.']` | KEEP |  |  |
| `src/ui/HowTo.tsx:71` | How to play, slide 2: grey paragraph | `Secrets are the heart of the game. Stalls are hidden: before the bell you only know how many pieces each rival put out, not which fruit, and never their prices. Buying is done in the open, so watch what they take.` | REWRITE | `Stalls are secret. Before the bell you know only how many pieces each rival has in its crate: not which fruit, and not the price. Buying is done in the open, so you can watch what rivals take.` | "Secrets are the heart of the game" is a slogan; the next sentence says it. |
| `src/ui/HowTo.tsx:77` | How to play, slide 3: title | `title: 'Four fruits, four personalities'` | REWRITE | `title: 'The four fruits'` | Paired slogan. |
| `src/ui/HowTo.tsx:80` | How to play, slide 3: first paragraph | `Every night all fruit moves one step older, from <b>fresh</b> to <b>okay</b> to <b>soft</b>, and then it spoils. Customers pay full price for fresh fruit, <b>$1 less</b> for okay and <b>$2 less</b> for soft. Some customers are fussier: <b>Premium</b> customers only buy fresh fruit, <b>Everyday</b> customers buy fresh or okay, and <b>Bargain</b> customers buy anything. The oldest step is on the left.` | REWRITE | `Every night all fruit ages one step: <b>Fresh</b>, then <b>Okay</b>, then <b>Soft</b>, then it spoils. Customers pay their top price for Fresh, <b>$1 less</b> for Okay and <b>$2 less</b> for Soft. <b>Premium</b> customers buy Fresh only. <b>Everyday</b> customers buy Fresh or Okay. <b>Bargain</b> customers buy Fresh, Okay or Soft. The oldest step is on the left.` | One fact per sentence; capitals for the states; "buy anything" could be read to include Green. |
| `src/ui/HowTo.tsx:87` | How to play, slide 3: grey line | `Fresh fruit costs more to buy, but customers pay more for it.` | KEEP |  |  |
| `src/ui/HowTo.tsx:93` | How to play, slide 4: title | `title: 'The rush: who gets the sale?'` | REWRITE | `title: 'The rush: who sells'` | Rhetorical question. |
| `src/ui/HowTo.tsx:96` | How to play, slide 4: example | `Bobby Books wants <b>3 blueberries</b> and pays up to <b>$5</b> for a fresh one ($4 okay; he won't take soft fruit).` | REWRITE | `Bobby Books wants <b>3 blueberries</b> and pays up to <b>$5</b> for a Fresh one ($4 for Okay; he will not take Soft).` | Capitals for the states. |
| `src/ui/HowTo.tsx:98` | How to play, slide 4: example | `<b>Stall A</b> 2 fresh <Fruit id="blueberry" size={18} /> asks <b>$4</b>` | REWRITE | `<b>Stall A</b> 2 Fresh <Fruit id="blueberry" size={18} /> asks <b>$4</b>` | Capital F. |
| `src/ui/HowTo.tsx:99` | How to play, slide 4: example | `<b>Stall B</b> 1 okay <Fruit id="blueberry" size={18} /> asks <b>$3</b>` | REWRITE | `<b>Stall B</b> 1 Okay <Fruit id="blueberry" size={18} /> asks <b>$3</b>` | Capital O. |
| `src/ui/HowTo.tsx:100` | How to play, slide 4: example | `<b>Stall C</b> 2 fresh <Fruit id="blueberry" size={18} /> asks <b>$5</b>` | REWRITE | `<b>Stall C</b> 2 Fresh <Fruit id="blueberry" size={18} /> asks <b>$5</b>` | Capital F. |
| `src/ui/HowTo.tsx:102` | How to play, slide 4: example | `Bobby Books buys from the <b>cheapest stall</b> first. B sells 1 at $3. A sells the other 2 at $4. His order is full, so C sells nothing, even though its fruit was fresh.` | REWRITE | `Bobby Books buys from the <b>cheapest stall</b> first. B sells 1 at $3. A sells the other 2 at $4. His order is full, so C sells nothing, even though its fruit was Fresh.` | Capital F. |
| `src/ui/HowTo.tsx:103` | How to play, slide 4: last sentence | `A customer who isn't fully served comes back once more the next day, then leaves.` | CORRECTNESS | `A customer who does not get everything leaves at the end of the day.` | WRONG SINCE RULES VERSION 14: nobody waits overnight (RULES.md, "The queue"). Slide 7 of this same guide says the opposite. |
| `src/ui/HowTo.tsx:103` | How to play, slide 4: ties | `If two stalls ask the same price, the tie goes to Favoured Trade, then fresher fruit, then the Haggler, then whoever bought earlier today.` | KEEP |  |  |
| `src/ui/HowTo.tsx:109` | How to play, slide 5: title | `title: 'Evening and night'` | KEEP |  |  |
| `src/ui/HowTo.tsx:112` | How to play, slide 5: favour cards | `Serve a customer's <b>whole order by yourself</b> and you draw a secret favour card (one a day; two for the Charmer). Play it when its card says: in your buying turn, at the bell, or in the evening.` | KEEP |  |  |
| `src/ui/HowTo.tsx:114` | How to play, slide 5 | `<b>Gossip</b> lets you secretly see tomorrow's walk-ins and <b>Scout</b> lets you peek at one of today's. Cash is your score, so spend it only where it pays you back.` | REWRITE | `<b>Gossip</b> shows you tomorrow's walk-ins. <b>Scout</b> shows you one of today's.` | The second sentence is advice about spending, in a paragraph about cards that cost nothing. |
| `src/ui/HowTo.tsx:115` | How to play, slide 5: night | `Then night falls: <b>all fruit ages one step</b>, and anything past soft spoils and is thrown away.` | REWRITE | `At night <b>all fruit ages one step</b>. A Soft piece that ages spoils and is thrown away.` | "Anything past soft" said exactly. |
| `src/ui/HowTo.tsx:121` | How to play, slide 6: title | `title: 'Market Days and Closing Day'` | KEEP |  |  |
| `src/ui/HowTo.tsx:124` | How to play, slide 6: standing orders | `Days {MARKET_DAY_LIST} are <b>Market Days</b>. In the morning a <b>standing order</b> turns up: one big order, collected two days later. Every stall names the price per piece it would do it for, or passes: you see who is bidding, never their price, and you can change your mind until the last stall decides. The <b>lowest bid wins</b>. On the due day the order takes the winner's pieces first and buys anything missing from rivals at $1 under the winning bid. The winner is <b>fined</b> for every piece it did not supply.` | REWRITE | `Days {MARKET_DAY_LIST} are <b>Market Days</b>. In the morning a <b>standing order</b> is turned over: one big order, collected 2 days later. Each stall bids a price per piece, or passes. You see who is bidding, not the price. You may change your bid until the last stall decides. The <b>lowest bid wins</b>. On the due day the order takes the winner's pieces first, then buys what is missing from rivals at $1 under the winning bid. The winner is <b>fined</b> for every piece it did not supply.` | One 40-word sentence with two colons split into four. |
| `src/ui/HowTo.tsx:125` | How to play, slide 6: upgrades | `That evening you may build <b>one stall upgrade</b> (your stall has room for two), which costs cash and changes how you play:` | REWRITE | `That evening you may build <b>1 upgrade</b>. Your stall has room for 2.` | "Costs cash and changes how you play" is true of every upgrade and says nothing; the costs are on the chips below. |
| `src/ui/HowTo.tsx:127` | How to play, slide 6: Closing Day | `On the <b>final day</b> (Closing Day, on by default), customers pay ${LAST_CALL_BONUS} more. Afterwards the <b>jam maker</b> buys every stall's leftover ripe fruit for ${JAM_PRICE} each (green fruit gets nothing). That's the last chance to turn fruit into cash.` | REWRITE | `The last day is <b>Closing Day</b>. Customers pay ${LAST_CALL_BONUS} more. After the rush the <b>jam maker</b> buys every stall's leftover ripe fruit for ${JAM_PRICE} each. Green fruit earns nothing.` | "On by default": the app has no switch. The last sentence is a flourish. |
| `src/ui/HowTo.tsx:128` | How to play, slide 6: last paragraph | `<b>Most cash wins.</b> Upgrades count for nothing, and leftover fruit only for what the jam maker pays. If you tie, the stall that sold more fruit wins.` | REWRITE | `<b>Most cash wins.</b> Upgrades count for nothing. If stalls tie, the one that sold more fruit wins.` | The jam maker was the sentence before. |
| `src/ui/HowTo.tsx:134` | How to play, slide 7: title | `title: 'Tips from the market'` | REWRITE | `title: 'Tips'` | Dressing. |
| `src/ui/HowTo.tsx:137` | How to play, slide 7: tip 1 | `Blueberries are cheap but spoil in 3 days. Sell them quickly!` | REWRITE | `Blueberries are cheap but last only 3 days. Sell them first.` | No "!". |
| `src/ui/HowTo.tsx:138` | How to play, slide 7: tip 2 | `If no rival is selling a fruit, charge the most customers will pay for it.` | KEEP |  |  |
| `src/ui/HowTo.tsx:139` | How to play, slide 7: tip 3 | `Fruit that spoils tonight is worth $0 tomorrow, so any sale beats none. With a Juice Bar, up to {JUICE_CAP} of them become juice instead: ${JUICE_VALUE} each.` | KEEP |  |  |
| `src/ui/HowTo.tsx:140` | How to play, slide 7: tip 4 | `Watch what rivals buy. At the bell you only know how many pieces they put out: remember what they hold and you can guess which fruit.` | REWRITE | `Watch what rivals buy. Before the bell you see only how many pieces are in each crate. If you remember what they hold, you can guess which fruit.` | "At the bell" is wrong by a moment: at the bell the crates open. Crate, not "put out". |
| `src/ui/HowTo.tsx:141` | How to play, slide 7: tip 5 | `Nobody waits overnight: a customer who does not get everything today is gone tomorrow.` | KEEP |  |  |
| `src/ui/HowTo.tsx:160` | How to play: button | `>← Back</button>` | KEEP |  |  |
| `src/ui/HowTo.tsx:161` | How to play: button | `>Next →</button>` | KEEP |  |  |
| `src/ui/HowTo.tsx:161` | How to play: button on the last slide | `>Let's play!</button>` | REWRITE | `>Done</button>` | The button goes back to the home screen; it does not start a game. |

## Tutorial tips (first game)

Nine small cards, one per new situation, shown once. Three repeat a line that is already on the screen under them.

| File:line | Where shown | Current text | Verdict | Proposed | Reason |
|---|---|---|---|---|---|
| `src/ui/tutorial.ts:9` | Tutorial tip "trait": title | `title: 'Pick a perk'` | KEEP |  |  |
| `src/ui/tutorial.ts:9` | Tutorial tip "trait": text | `text: 'Each stall keeps one perk for the whole game. Rivals can see yours.'` | CUT | **cut** | Said twice: the card under this tip already reads "one perk for the whole game. Rivals can see it." |
| `src/ui/tutorial.ts:10` | Tutorial tip "morning": title | `title: 'A new day'` | REWRITE | `title: 'Morning'` | Plain name of the step. |
| `src/ui/tutorial.ts:10` | Tutorial tip "morning": text | `text: 'Each morning starts with today’s news. Customers wait at the top. Tap Start buying to go to the Wholesale Market, where the farmer has just delivered fruit.'` | REWRITE | `text: 'Each morning starts with today’s news and the lorry. Today’s customers are at the top. Tap Start buying.'` | "Where the farmer has just delivered fruit": the lorry, said the long way. |
| `src/ui/tutorial.ts:11` | Tutorial tip "buy": title | `title: 'Your turn to buy'` | KEEP |  |  |
| `src/ui/tutorial.ts:11` | Tutorial tip "buy": text | `text: 'Tap a box with a black border to buy one piece. Each lane is one fruit, freshest at the top (G green, F fresh, O okay, S soft); fresh fruit costs more but customers pay more for it. Check the customer tickets: buy what people want.'` | REWRITE | `text: 'Tap a box with a black border to buy 1 piece. Each lane is one fruit, freshest at the top: G Green, F Fresh, O Okay, S Soft. Fresher costs more, and customers pay more for it. Buy what the customer tickets ask for.'` | One fact per sentence; capitals for the states. |
| `src/ui/tutorial.ts:12` | Tutorial tip "bought": title | `title: 'Nice!'` | REWRITE | `title: 'On your shelf'` | "Nice!" is praise with "!". |
| `src/ui/tutorial.ts:12` | Tutorial tip "bought": text | `text: 'It\'s on your shelf now, at the bottom. The letters under each fruit count your pieces: F fresh, O okay, S soft, G green. Tap Done buying when you\'re finished.'` | REWRITE | `text: 'The piece is on your shelf, at the bottom of the screen. The letters under each fruit count your pieces. Tap Done buying when you have finished.'` | The letters were explained in the tip before this one. |
| `src/ui/tutorial.ts:13` | Tutorial tip "stall": title | `title: 'Open your stall'` | REWRITE | `title: 'Fill your crate'` | Same words as the heading of the panel it points at. |
| `src/ui/tutorial.ts:13` | Tutorial tip "stall": text | `text: 'Tap + beside a row to put that fruit in your crate. Only fruit in your crate can sell today. Rivals will only see how many pieces you put out.'` | REWRITE | `text: 'Tap + beside a row to put that piece in your crate. Only pieces in your crate can sell today. Rivals see how many, not which fruit.'` | Crate, not "put out"; "piece". |
| `src/ui/tutorial.ts:14` | Tutorial tip "bid": title | `title: 'Secret prices'` | KEEP |  |  |
| `src/ui/tutorial.ts:14` | Tutorial tip "bid": text | `text: 'Set a price for each fruit with − and +. You see how many pieces each rival put out, not which fruit. Prices and crates open at the bell; the cheapest stall sells first.'` | REWRITE | `text: 'Set a price for each fruit with − and +. You see how many pieces each rival has in its crate, not which fruit. Prices and crates open at the bell. The cheapest stall sells first.'` | Crate, not "put out"; one fact per sentence. |
| `src/ui/tutorial.ts:15` | Tutorial tip "reveal": title | `title: 'How the rush went'` | REWRITE | `title: 'The rush'` | Plain name of the step. |
| `src/ui/tutorial.ts:15` | Tutorial tip "reveal": text | `text: 'Each customer bought from the cheapest stall with fruit fresh enough for their price. Ties go to Favoured Trade, then fresher fruit, then the Haggler, then whoever bought earlier.'` | KEEP |  |  |
| `src/ui/tutorial.ts:16` | Tutorial tip "evening": title | `title: 'Evening'` | KEEP |  |  |
| `src/ui/tutorial.ts:16` | Tutorial tip "evening": text | `text: 'Tonight all fruit ages one step. Play a favour card if you have one, or keep your cash: cash is your score. After each Market Day you can also build a stall upgrade.'` | CORRECTNESS | `text: 'Tonight all fruit ages one step. You may play an evening favour card. After a Market Day you may also build 1 upgrade. An upgrade costs cash, and cash is your score.'` | MISLEADING: "Play a favour card if you have one, or keep your cash" reads as if playing a favour card costs cash. It does not; only upgrades do. |
| `src/ui/tutorial.ts:17` | Tutorial tip "day2": title | `title: 'You\'re ready'` | REWRITE | `title: 'From Day 2'` | "You're ready" is a pat on the back. |
| `src/ui/tutorial.ts:17` | Tutorial tip "day2": text | `text: 'From now on the poorest stall buys first, then the others go clockwise. Most cash after the last day wins. Good luck!'` | REWRITE | `text: 'From now on the poorest stall buys first, then the others clockwise. Most cash after the last day wins.'` | Drops "Good luck!". |
| `src/ui/game/panels/Popovers.tsx:36` | Tutorial tip: buttons | `>Skip tutorial</button>` | KEEP |  |  |
| `src/ui/game/panels/Popovers.tsx:37` | Tutorial tip: buttons | `>Got it</button>` | KEEP |  |  |

## Settings and account

The Settings screen (switches, your stats, About) and the Account pop-up.

| File:line | Where shown | Current text | Verdict | Proposed | Reason |
|---|---|---|---|---|---|
| `src/ui/App.tsx:410` | Settings: top bar | `<b>Settings</b>` | KEEP |  |  |
| `src/ui/App.tsx:413` | Settings: switch | `title="Sound" text="Coins, cards and cheers."` | REWRITE | `title="Sound" text="Sound effects."` | Three-part list for rhythm. |
| `src/ui/App.tsx:414` | Settings: switch | `title="Vibration" text="A small buzz when you buy."` | KEEP |  |  |
| `src/ui/App.tsx:415` | Settings: switch | `title="Fast rivals" text="Computer players move quicker."` | REWRITE | `title="Fast computers" text="Computer stalls take their turns faster."` | A rival is any other stall, friend or computer; this switch is about computers. |
| `src/ui/App.tsx:416` | Settings: switch | `title="Music" text="A gentle market tune."` | REWRITE | `title="Music" text="Background music."` | Adjective for its own sake. |
| `src/ui/App.tsx:417` | Settings: switch | `title="Freshness patterns" text="Stripes and dots as well as colours, for colour-blind players."` | KEEP |  |  |
| `src/ui/App.tsx:418` | Settings: switch | `title="Share anonymous stats" text="Helps fix crashes and balance the game. No names or IDs are sent."` | KEEP |  |  |
| `src/ui/App.tsx:420` | Settings: button | `>Replay the tutorial next game</button>` | KEEP |  |  |
| `src/ui/App.tsx:423` | Settings: heading | `<h3>Your stats</h3>` | KEEP |  |  |
| `src/ui/App.tsx:425` | Settings: stat label | `<small>Games</small>` | KEEP |  |  |
| `src/ui/App.tsx:426` | Settings: stat label | `<small>Wins</small>` | KEEP |  |  |
| `src/ui/App.tsx:428` | Settings: stat label | `<small>Fruit sold</small>` | KEEP |  |  |
| `src/ui/App.tsx:427` | Settings: stat label | `<small>Best</small>` | REWRITE | `<small>Most cash</small>` | "Best" what? It is your highest final cash. |
| `src/ui/App.tsx:432` | Settings: heading | `<h3>About</h3>` | KEEP |  |  |
| `src/ui/App.tsx:433` | Settings: About | `Fruit Market: a game designed by Murshidi bin Md Hashim.` | KEEP |  |  |
| `src/ui/App.tsx:434` | Settings: About | `No ads. An account is optional and only keeps your trophies, looks and records. Your games stay on your phone. If you allow it, anonymous counts (like "a game was finished") are sent to help improve the game.` | KEEP |  |  |
| `src/ui/App.tsx:435` | Settings: About | `>Privacy policy</a>` | KEEP |  |  |
| `src/ui/App.tsx:436` | Settings: About | `Version {__APP_VERSION__}` | KEEP |  |  |
| `src/ui/AccountPanel.tsx:41` | Account pop-up: heading inside the panel (signed in) | `<h3>Account</h3>` | CUT | **cut** | Said twice: the pop-up is already titled "Account". |
| `src/ui/AccountPanel.tsx:73` | Account pop-up: heading inside the panel (signed out) | `<h3>Account</h3>` | CUT | **cut** | As above. |
| `src/ui/AccountPanel.tsx:42` | Account pop-up, signed in | `Signed in as <b>{me}</b>. Your trophies, looks and records follow you to any phone you sign in on.` | KEEP |  |  |
| `src/ui/AccountPanel.tsx:43` | Account pop-up, signed in | `>Save to my account now</button>` | KEEP |  |  |
| `src/ui/AccountPanel.tsx:43` | Account pop-up, signed in | `'Saved to your account.'` | KEEP |  |  |
| `src/ui/AccountPanel.tsx:44` | Account pop-up, signed in | `>Sign out</button>` | KEEP |  |  |
| `src/ui/AccountPanel.tsx:44` | Account pop-up, signed in | `'Signed out. This phone is ready for a new player.'` | KEEP |  |  |
| `src/ui/AccountPanel.tsx:45` | Account pop-up, signed in | `Signing out saves everything to your account and then clears it from this phone. Sign in again to bring it back.` | KEEP |  |  |
| `src/ui/AccountPanel.tsx:47` | Account pop-up, signed in | `>Change my password…</button>` | KEEP |  |  |
| `src/ui/AccountPanel.tsx:50` | Account pop-up, signed in | `'Current password'` | KEEP |  |  |
| `src/ui/AccountPanel.tsx:51` | Account pop-up, signed in | `'New password (8 or more characters)'` | KEEP |  |  |
| `src/ui/AccountPanel.tsx:52` | Account pop-up, signed in | `'Password changed. Other phones will ask you to sign in again.'` | KEEP |  |  |
| `src/ui/AccountPanel.tsx:52` | Account pop-up, signed in | `>Save new password</button>` | KEEP |  |  |
| `src/ui/AccountPanel.tsx:53` | Account pop-up, signed in | `>Cancel</button>` | KEEP |  |  |
| `src/ui/AccountPanel.tsx:57` | Account pop-up, signed in | `>Delete my account…</button>` | KEEP |  |  |
| `src/ui/AccountPanel.tsx:60` | Account pop-up, signed in | `This deletes your account from the server for good. What is on this phone stays. Enter your password to confirm.` | KEEP |  |  |
| `src/ui/AccountPanel.tsx:61` | Account pop-up, signed in | `'Password', 'password', 'current-password'` | KEEP |  |  |
| `src/ui/AccountPanel.tsx:62` | Account pop-up, signed in | `'Your account was deleted.'` | KEEP |  |  |
| `src/ui/AccountPanel.tsx:62` | Account pop-up, signed in | `>Delete for good</button>` | KEEP |  |  |
| `src/ui/AccountPanel.tsx:63` | Account pop-up, signed in | `>Keep my account</button>` | KEEP |  |  |
| `src/ui/AccountPanel.tsx:74` | Account pop-up, signed out | `Optional. An ID and a password keep your trophies, looks and records safe and let you use them on another phone. There is no email, so <b>there is no way to reset a forgotten password</b>. Don't use a password you use anywhere else.` | KEEP |  |  |
| `src/ui/AccountPanel.tsx:75` | Account pop-up, signed out | `'ID (letters, numbers, underscores)'` | KEEP |  |  |
| `src/ui/AccountPanel.tsx:76` | Account pop-up, signed out | `'Password (8 or more characters)'` | KEEP |  |  |
| `src/ui/AccountPanel.tsx:78` | Account pop-up, signed out | `'Account created. Your trophies are saved to it.'` | KEEP |  |  |
| `src/ui/AccountPanel.tsx:78` | Account pop-up, signed out | `>Create account</button>` | KEEP |  |  |
| `src/ui/AccountPanel.tsx:79` | Account pop-up, signed out | `'Signed in.'` | KEEP |  |  |
| `src/ui/AccountPanel.tsx:79` | Account pop-up, signed out | `>Sign in</button>` | KEEP |  |  |
| `src/ui/account.ts:14` | Account pop-up: message | `'Could not reach the server. Check your connection and try again.'` | KEEP |  |  |
| `src/ui/account.ts:72` | Account pop-up: message | `'Something went wrong. Try again.'` | KEEP |  |  |
| `src/ui/account.ts:112` | Account pop-up: message | `` `Your trophies could not be saved to your account yet, so you are still signed in. ${err}` `` | KEEP |  |  |
| `src/ui/account.ts:122` | Account pop-up: message | `'You are not signed in.'` | KEEP |  |  |
| `src/ui/account.ts:129` | Account pop-up: message | `'You are not signed in.'` | KEEP |  |  |
| `server/accounts.ts:39` | Account pop-up: message from the server | `'Enter an ID.'` | KEEP |  |  |
| `server/accounts.ts:41` | Account pop-up: message from the server | `` `An ID has ${ID_MIN} to ${ID_MAX} characters.` `` | KEEP |  |  |
| `server/accounts.ts:42` | Account pop-up: message from the server | `'An ID can use letters, numbers and underscores only.'` | KEEP |  |  |
| `server/accounts.ts:43` | Account pop-up: message from the server | `'That ID is not allowed. Try another.'` | KEEP |  |  |
| `server/accounts.ts:48` | Account pop-up: message from the server | `'Enter a password.'` | KEEP |  |  |
| `server/accounts.ts:49` | Account pop-up: message from the server | `` `A password needs at least ${PASSWORD_MIN} characters.` `` | KEEP |  |  |
| `server/accounts.ts:50` | Account pop-up: message from the server | `` `A password can have at most ${PASSWORD_MAX} characters.` `` | KEEP |  |  |
| `server/accounts.ts:76` | Account pop-up: message from the server | `'Wrong ID or password.'` | KEEP |  |  |
| `server/accounts.ts:81` | Account pop-up: message from the server | `` `Too many wrong tries. Wait ${mins} minute${mins > 1 ? 's' : ''} and try again.` `` | KEEP |  |  |
| `server/accounts.ts:119` | Account pop-up: message from the server | `'That ID is taken. Try another.'` | KEEP |  |  |
| `server/accounts.ts:144` | Account pop-up: message from the server | `'Please sign in again.'` | KEEP |  |  |
| `server/accounts.ts:173` | Account pop-up: message from the server | `'Unknown request.'` | KEEP |  |  |
| `server/worker.ts:111` | Account pop-up: message from the server | `(idProblem(id) ?? 'Enter an ID.') : 'Wrong ID or password.'` | KEEP |  |  |
| `server/worker.ts:38` | Account pop-up: message from the server | `'Too many requests. Wait a minute and try again.'` | KEEP |  |  |

## Trophies: achievements (44)

Each achievement has a name and a task. The names are flavour: option A is to drop the name and show only the task; option B is the plain name shown. Recommendation: keep the plain ones, and change the ones that are puns, that reuse a game term for something else ("Market Day", "Regular"), or that do not say what they are for. Three achievements cannot be earned under the current rules, and three more describe themselves wrongly: see the CORRECTNESS rows.

| File:line | Where shown | Current text | Verdict | Proposed | Reason |
|---|---|---|---|---|---|
| `src/ui/App.tsx:351` | Trophies: top bar | `<b>Trophies</b>` | KEEP |  |  |
| `src/ui/App.tsx:353` | Trophies: button | `Wardrobe: {loadLooks().length}/{LOOKS.length} looks` | KEEP |  |  |
| `src/ui/App.tsx:361` | Trophies: heading | `<h3>Achievements <span` | KEEP |  |  |
| `src/ui/achievements.ts:10` | Trophies: group heading | `title: 'The game'` | KEEP |  |  |
| `src/ui/achievements.ts:11` | Trophies: group heading | `title: 'Timing and freshness'` | KEEP |  |  |
| `src/ui/achievements.ts:12` | Trophies: group heading | `title: 'Nerve'` | KEEP |  |  |
| `src/ui/achievements.ts:13` | Trophies: group heading | `title: 'Reading the crates'` | KEEP |  |  |
| `src/ui/achievements.ts:14` | Trophies: group heading | `title: 'The town'` | KEEP |  |  |
| `src/ui/achievements.ts:15` | Trophies: group heading | `title: 'Your stall'` | KEEP |  |  |
| `src/ui/achievements.ts:16` | Trophies: group heading | `title: 'Shopkeepers and rivals'` | KEEP |  |  |
| `src/ui/achievements.ts:17` | Trophies: group heading | `title: 'Events and favours'` | KEEP |  |  |
| `src/ui/achievements.ts:18` | Trophies: group heading | `title: 'The journey'` | KEEP |  |  |
| `src/ui/achievements.ts:19` | Trophies: group heading | `title: 'Milestones'` | KEEP |  |  |
| `src/ui/achievements.ts:38` | Trophies: achievement name (first_win) | `title: 'Open for Business'` | KEEP | **Keep as is** (recommended) · A: cut · B: `title: 'First win'` | Plain enough. |
| `src/ui/achievements.ts:38` | Trophies: achievement task (first_win) | `text: 'Win a game.'` | KEEP |  |  |
| `src/ui/achievements.ts:39` | Trophies: achievement name (first_sale) | `title: 'First Sale'` | KEEP | **Keep as is** (recommended) · A: cut | Plain enough. |
| `src/ui/achievements.ts:39` | Trophies: achievement task (first_sale) | `text: 'Sell a piece of fruit.'` | KEEP |  |  |
| `src/ui/achievements.ts:40` | Trophies: achievement name (explorer) | `title: 'Market Explorer'` | REWRITE | A: cut · **B:** `title: 'Every mode'` (recommended) | Does not say what it is for. |
| `src/ui/achievements.ts:40` | Trophies: achievement task (explorer) | `text: 'Finish a game in each mode: New game, Daily, League and online.'` | REWRITE | `text: 'Finish a game in each mode: New game, Daily market, Market League and online.'` | The modes by their names. |
| `src/ui/achievements.ts:42` | Trophies: achievement name (no_waste) | `title: 'Nothing Wasted'` | KEEP | **Keep as is** (recommended) · A: cut | Plain enough. |
| `src/ui/achievements.ts:42` | Trophies: achievement task (no_waste) | `text: 'Win without a single fruit spoiling.'` | KEEP |  |  |
| `src/ui/achievements.ts:43` | Trophies: achievement name (jam_session) | `title: 'Jam Session'` | REWRITE | A: cut · **B:** `title: 'Jam money'` (recommended) | Pun. |
| `src/ui/achievements.ts:43` | Trophies: achievement task (jam_session) | `text: 'Earn $10 or more from the jam maker on the last day.'` | KEEP |  |  |
| `src/ui/achievements.ts:44` | Trophies: achievement name (juice_regular) | `title: 'Juice Bar Regular'` | REWRITE | A: cut · **B:** `title: 'Juice money'` (recommended) | "Regular" is a game term (the face-up customer). |
| `src/ui/achievements.ts:44` | Trophies: achievement task (juice_regular) | `text: 'Earn $20 from your Juice Bar in one game.'` | KEEP |  |  |
| `src/ui/achievements.ts:46` | Trophies: achievement name (full_price) | `title: 'Name Your Price'` | REWRITE | A: cut · **B:** `title: 'Top price'` (recommended) | Does not say what it is for. |
| `src/ui/achievements.ts:46` | Trophies: achievement task (full_price) | `text: 'Sell 5 pieces of fruit at a customer\'s top price in one game.'` | KEEP |  |  |
| `src/ui/achievements.ts:47` | Trophies: achievement name (penny_under) | `title: 'Penny Under'` | REWRITE | A: cut · **B:** `title: 'One dollar under'` (recommended) | The game has dollars, not pennies. |
| `src/ui/achievements.ts:47` | Trophies: achievement task (penny_under) | `text: 'Win a sale by pricing exactly $1 below the next stall.'` | KEEP |  |  |
| `src/ui/achievements.ts:48` | Trophies: achievement name (sky_high) | `title: 'Sky High'` | REWRITE | A: cut · **B:** `title: 'A $12 sale'` (recommended) | Does not say what it is for. |
| `src/ui/achievements.ts:48` | Trophies: achievement task (sky_high) | `text: 'Sell a piece of fruit for $12 or more.'` | KEEP |  |  |
| `src/ui/achievements.ts:49` | Trophies: achievement name (tie_breaker) | `title: 'Tie Breaker'` | KEEP | **Keep as is** (recommended) · A: cut | Plain enough. |
| `src/ui/achievements.ts:49` | Trophies: achievement task (tie_breaker) | `text: 'Win a sale when another stall posted the same price.'` | REWRITE | `text: 'Win a sale when another stall set the same price.'` | "Posted" is a second word for "set". |
| `src/ui/achievements.ts:51` | Trophies: achievement name (sole_five) | `title: 'Sole Supplier'` | KEEP | **Keep as is** (recommended) · A: cut | Plain enough. |
| `src/ui/achievements.ts:51` | Trophies: achievement task (sole_five) | `text: 'Serve 5 whole orders on your own in one game.'` | REWRITE | `text: 'Serve 5 customers alone in one game.'` | "Whole orders on your own" is "serve alone". |
| `src/ui/achievements.ts:53` | Trophies: achievement name (red_carpet) | `title: 'Red Carpet'` | REWRITE | A: cut · **B:** `title: 'Three guests'` (recommended) | Does not say what it is for. |
| `src/ui/achievements.ts:53` | Trophies: achievement task (red_carpet) | `text: 'Sell to all three special guests: the Influencer, the Gym Club and the Hotel Chef.'` | CORRECTNESS | `text: 'Sell to these three guests: the Influencer, the Gym Club and the Hotel Chef.'` | NOT "ALL": there are five guests. The Wedding Caterer and the Bakery do not count for this, and are counted as ordinary customers instead. |
| `src/ui/achievements.ts:54` | Trophies: achievement name (town_12) | `title: 'Familiar Faces'` | KEEP | **Keep as is** (recommended) · A: cut | Plain enough. |
| `src/ui/achievements.ts:54` | Trophies: achievement task (town_12) | `text: 'Serve 12 different customers.'` | KEEP |  |  |
| `src/ui/achievements.ts:55` | Trophies: achievement name (town_36) | `title: 'The Whole Town'` | KEEP | **Keep as is** (recommended) · A: cut | Plain enough. |
| `src/ui/achievements.ts:55` | Trophies: achievement task (town_36) | `text: 'Serve all 36 customers.'` | CORRECTNESS | Needs a decision or a code fix (no wording change fixes it) | CAN BE EARNED EARLY: the counter also counts the Wedding Caterer, the Bakery and the eight standing orders, so it can reach 36 before every customer has been served. No wording fix; the count needs fixing. |
| `src/ui/achievements.ts:56` | Trophies: achievement name (worth_wait) | `title: 'Worth the Wait'` | KEEP | **Keep as is** (recommended) · A: cut | Plain enough. |
| `src/ui/achievements.ts:56` | Trophies: achievement task (worth_wait) | `text: 'Serve a customer who came back the next day.'` | CORRECTNESS | Needs a decision or a code fix (no wording change fixes it) | CANNOT BE EARNED: since rules version 14 nobody waits overnight, so no customer comes back. The look it unlocks (Paper Lanterns) cannot be earned either. Retire it or give it a new task. |
| `src/ui/achievements.ts:57` | Trophies: achievement name (full_house) | `title: 'Full House'` | KEEP | **Keep as is** (recommended) · A: cut | Plain enough. |
| `src/ui/achievements.ts:57` | Trophies: achievement task (full_house) | `text: 'Sell to 6 different customers in one day.'` | CORRECTNESS | Needs a decision or a code fix (no wording change fixes it) | CANNOT BE EARNED: the row never holds more than 5 customers (rules version 14). The look it unlocks (Brass Hand Bell) cannot be earned either. Suggested task: "Sell to 5 different customers in one day." |
| `src/ui/achievements.ts:59` | Trophies: achievement name (bare_stall) | `title: 'Bare Stall'` | KEEP | **Keep as is** (recommended) · A: cut | Plain enough. |
| `src/ui/achievements.ts:59` | Trophies: achievement task (bare_stall) | `text: 'Win without building any upgrades.'` | KEEP |  |  |
| `src/ui/achievements.ts:60` | Trophies: achievement name (fully_fitted) | `title: 'Fully Fitted'` | KEEP | **Keep as is** (recommended) · A: cut | Plain enough. |
| `src/ui/achievements.ts:60` | Trophies: achievement task (fully_fitted) | `text: 'Build all three upgrades in one game.'` | CORRECTNESS | Needs a decision or a code fix (no wording change fixes it) | CANNOT BE EARNED: there are five upgrades and a stall has room for 2; the check asks for 3. The look it unlocks (Trader's Waistcoat) cannot be earned either. Suggested task: "Build 2 upgrades in one game." |
| `src/ui/achievements.ts:61` | Trophies: achievement name (mango_mogul) | `title: 'Mango Mogul'` | REWRITE | A: cut · **B:** `title: 'Ten mangoes'` (recommended) | Alliteration. |
| `src/ui/achievements.ts:61` | Trophies: achievement task (mango_mogul) | `text: 'Sell 10 mangoes in one game.'` | KEEP |  |  |
| `src/ui/achievements.ts:63` | Trophies: achievement name (beat_hard) | `title: 'Giant Slayer'` | REWRITE | A: cut · **B:** `title: 'Hard win'` (recommended) | Flourish. |
| `src/ui/achievements.ts:63` | Trophies: achievement task (beat_hard) | `text: 'Win against a Hard rival.'` | REWRITE | `text: 'Win against a Hard computer.'` | A Hard rival is a computer; say so. |
| `src/ui/achievements.ts:64` | Trophies: achievement name (hard_sweep) | `title: 'Hard Sweep'` | KEEP | **Keep as is** (recommended) · A: cut | Plain enough. |
| `src/ui/achievements.ts:64` | Trophies: achievement task (hard_sweep) | `text: 'Win a 4-player game against three Hard rivals.'` | REWRITE | `text: 'Win a 4-stall game against 3 Hard computers.'` | Stalls and computers, as on the New game screen. |
| `src/ui/achievements.ts:65` | Trophies: achievement name (shop_3) | `title: 'Quick Change'` | REWRITE | A: cut · **B:** `title: 'Three shopkeepers'` (recommended) | Does not say what it is for. |
| `src/ui/achievements.ts:65` | Trophies: achievement task (shop_3) | `text: 'Win with 3 different shopkeepers.'` | KEEP |  |  |
| `src/ui/achievements.ts:66` | Trophies: achievement name (shop_6) | `title: 'Shopkeeper Master'` | REWRITE | A: cut · **B:** `title: 'Six shopkeepers'` (recommended) | There are eight shopkeepers, so six is not mastery. |
| `src/ui/achievements.ts:66` | Trophies: achievement task (shop_6) | `text: 'Win with all 6 shopkeepers.'` | CORRECTNESS | `text: 'Win with 6 different shopkeepers.'` | NOT "ALL": there are 8 shopkeepers. Any 6 earn it. |
| `src/ui/achievements.ts:67` | Trophies: achievement name (rivals_all) | `title: 'Rival Roll Call'` | REWRITE | A: cut · **B:** `title: 'The first six'` (recommended) | Alliteration. |
| `src/ui/achievements.ts:67` | Trophies: achievement task (rivals_all) | `text: 'Beat each of the 6 named rivals: Rosa, Uncle Benny, Ah Chen, Saleh, Raj and Kiki.'` | REWRITE | `text: 'Win a game against each of these six: Rosa, Uncle Benny, Ah Chen, Saleh, Raj and Kiki.'` | "The 6 named rivals": all eight have names. |
| `src/ui/achievements.ts:69` | Trophies: achievement name (big_day) | `title: 'Market Day'` | REWRITE | A: cut · **B:** `title: 'A $40 day'` (recommended) | CLASH: "Market Day" is a game term (days 3, 6, 9 and 12) and this achievement has nothing to do with it. |
| `src/ui/achievements.ts:69` | Trophies: achievement task (big_day) | `text: 'Earn $40 or more in one day.'` | KEEP |  |  |
| `src/ui/achievements.ts:70` | Trophies: achievement name (festival_rush) | `title: 'Festival Rush'` | KEEP | **Keep as is** (recommended) · A: cut | Plain enough. |
| `src/ui/achievements.ts:70` | Trophies: achievement task (festival_rush) | `text: 'Earn $40 or more on a Festival day.'` | KEEP |  |  |
| `src/ui/achievements.ts:71` | Trophies: achievement name (event_all) | `title: 'Event Collector'` | KEEP | **Keep as is** (recommended) · A: cut | Plain enough. |
| `src/ui/achievements.ts:71` | Trophies: achievement task (event_all) | `text: 'See all 13 event cards.'` | CORRECTNESS | `text: 'See all 20 event cards.'` | WRONG NUMBER: there are 20 event cards and the check needs all 20, but the text says 13 and the progress counter stops at "13 / 13" while the achievement stays locked. The goal number on the same line needs the same change (target: 13). |
| `src/ui/achievements.ts:72` | Trophies: achievement name (card_sharp) | `title: 'Card Sharp'` | REWRITE | A: cut · **B:** `title: 'All six favours'` (recommended) | Idiom (a card sharp is a cheat). |
| `src/ui/achievements.ts:72` | Trophies: achievement task (card_sharp) | `text: 'Play all 6 favour cards.'` | KEEP |  |  |
| `src/ui/achievements.ts:73` | Trophies: achievement name (comeback) | `title: 'Comeback Kid'` | KEEP | **Keep as is** (recommended) · A: cut | Plain enough. |
| `src/ui/achievements.ts:73` | Trophies: achievement task (comeback) | `text: 'Win after being last on day 5.'` | REWRITE | `text: 'Win after being last on Day 5.'` | Capital D. |
| `src/ui/achievements.ts:75` | Trophies: achievement name (streak3) | `title: 'Regular'` | REWRITE | A: cut · **B:** `title: '3 days running'` (recommended) | CLASH: "Regular" is a game term (the face-up customer). |
| `src/ui/achievements.ts:75` | Trophies: achievement task (streak3) | `text: 'Play the daily market 3 days in a row.'` | REWRITE | `text: 'Play the Daily market 3 days in a row.'` | Mode name. |
| `src/ui/achievements.ts:76` | Trophies: achievement name (streak7) | `title: 'Week Runner'` | REWRITE | A: cut · **B:** `title: '7 days running'` (recommended) | Does not say what it is for. |
| `src/ui/achievements.ts:76` | Trophies: achievement task (streak7) | `text: 'Play the daily market 7 days in a row.'` | REWRITE | `text: 'Play the Daily market 7 days in a row.'` | Mode name. |
| `src/ui/achievements.ts:77` | Trophies: achievement name (streak30) | `title: 'Month of Markets'` | REWRITE | A: cut · **B:** `title: '30 days running'` (recommended) | Alliteration. |
| `src/ui/achievements.ts:77` | Trophies: achievement task (streak30) | `text: 'Play the daily market 30 days in a row.'` | REWRITE | `text: 'Play the Daily market 30 days in a row.'` | Mode name. |
| `src/ui/achievements.ts:78` | Trophies: achievement name (daily_top10) | `title: 'Top Ten'` | KEEP | **Keep as is** (recommended) · A: cut | Plain enough. |
| `src/ui/achievements.ts:78` | Trophies: achievement task (daily_top10) | `text: 'Finish in the top 10 of a daily leaderboard.'` | REWRITE | `text: 'Finish in the top 10 of a Daily market leaderboard.'` | Mode name. |
| `src/ui/achievements.ts:79` | Trophies: achievement name (online_win) | `title: 'Town Favourite'` | REWRITE | A: cut · **B:** `title: 'Online win'` (recommended) | Nothing in the name says "online"; "Favourite" also sits close to favour card. |
| `src/ui/achievements.ts:79` | Trophies: achievement task (online_win) | `text: 'Win an online match.'` | REWRITE | `text: 'Win an online game.'` | Game, not match. |
| `src/ui/achievements.ts:80` | Trophies: achievement name (online_10) | `title: 'Pen Pal'` | REWRITE | A: cut · **B:** `title: '10 online games'` (recommended) | Nothing in the name says "online". |
| `src/ui/achievements.ts:80` | Trophies: achievement task (online_10) | `text: 'Finish 10 online matches.'` | REWRITE | `text: 'Finish 10 online games.'` | Game, not match. |
| `src/ui/achievements.ts:81` | Trophies: achievement name (league) | `title: 'League Champion'` | KEEP | **Keep as is** (recommended) · A: cut | Plain enough. |
| `src/ui/achievements.ts:81` | Trophies: achievement task (league) | `text: 'Win every stage of the Market League.'` | KEEP |  |  |
| `src/ui/achievements.ts:83` | Trophies: achievement name (rich) | `title: 'Fruit Tycoon'` | KEEP | **Keep as is** (recommended) · A: cut | Plain enough. |
| `src/ui/achievements.ts:83` | Trophies: achievement task (rich) | `text: 'Finish a game with $200 or more.'` | KEEP |  |  |
| `src/ui/achievements.ts:84` | Trophies: achievement name (sold_100) | `title: 'Stall Starter'` | KEEP | **Keep as is** (recommended) · A: cut | Plain enough. |
| `src/ui/achievements.ts:84` | Trophies: achievement task (sold_100) | `text: 'Sell 100 pieces of fruit in total.'` | KEEP |  |  |
| `src/ui/achievements.ts:85` | Trophies: achievement name (sold_500) | `title: 'Market Regular'` | REWRITE | A: cut · **B:** `title: '500 sold'` (recommended) | CLASH: "Regular" again. |
| `src/ui/achievements.ts:85` | Trophies: achievement task (sold_500) | `text: 'Sell 500 pieces of fruit in total.'` | KEEP |  |  |
| `src/ui/achievements.ts:86` | Trophies: achievement name (sold_2000) | `title: 'Fruit Baron'` | KEEP | **Keep as is** (recommended) · A: cut | Plain enough. |
| `src/ui/achievements.ts:86` | Trophies: achievement task (sold_2000) | `text: 'Sell 2,000 pieces of fruit in total.'` | KEEP |  |  |
| `src/ui/achievements.ts:87` | Trophies: achievement name (played_10) | `title: 'Getting Started'` | KEEP | **Keep as is** (recommended) · A: cut | Plain enough. |
| `src/ui/achievements.ts:87` | Trophies: achievement task (played_10) | `text: 'Finish 10 games.'` | KEEP |  |  |
| `src/ui/achievements.ts:88` | Trophies: achievement name (played_50) | `title: 'Seasoned'` | KEEP | **Keep as is** (recommended) · A: cut | Plain enough. |
| `src/ui/achievements.ts:88` | Trophies: achievement task (played_50) | `text: 'Finish 50 games.'` | KEEP |  |  |
| `src/ui/achievements.ts:89` | Trophies: achievement name (played_200) | `title: 'Veteran'` | KEEP | **Keep as is** (recommended) · A: cut | Plain enough. |
| `src/ui/achievements.ts:89` | Trophies: achievement task (played_200) | `text: 'Finish 200 games.'` | KEEP |  |  |
| `src/ui/achievements.ts:71` | Trophies: progress counter under Event Collector | `goal: { set: 'events', target: 13 }` | CORRECTNESS | `goal: { set: 'events', target: 20 }` | See Event Collector: the counter shown is "x / 13" but 20 are needed. |
| `src/ui/App.tsx:380` | Trophies: heading | `<h3>Stall colour</h3>` | KEEP |  |  |
| `src/ui/App.tsx:381` | Trophies: stall colour | `Pick any colour. Your awning uses it in every game.` | KEEP |  |  |
| `src/ui/progress.ts:92` | Trophies: stall colour name | `name: 'Terracotta'` | KEEP |  |  |
| `src/ui/progress.ts:93` | Trophies: stall colour name | `name: 'Harbour'` | REWRITE | `name: 'Teal'` | A mood word for a colour; the plain colour name is clearer under a small swatch. |
| `src/ui/progress.ts:94` | Trophies: stall colour name | `name: 'Olive'` | KEEP |  |  |
| `src/ui/progress.ts:95` | Trophies: stall colour name | `name: 'Saffron'` | KEEP |  |  |
| `src/ui/progress.ts:96` | Trophies: stall colour name | `name: 'Fig'` | REWRITE | `name: 'Plum'` | A mood word for a colour; the plain colour name is clearer under a small swatch. |
| `src/ui/progress.ts:97` | Trophies: stall colour name | `name: 'Midnight'` | REWRITE | `name: 'Navy'` | A mood word for a colour; the plain colour name is clearer under a small swatch. |
| `src/ui/progress.ts:98` | Trophies: stall colour name | `name: 'Rose'` | KEEP |  |  |
| `src/ui/progress.ts:99` | Trophies: stall colour name | `name: 'Royal'` | REWRITE | `name: 'Purple'` | A mood word for a colour; the plain colour name is clearer under a small swatch. |

## Daily market

The Daily market has a twist that changes each day of the week. Only the twist's title is ever shown (on the home ticket); its one-line explanation is in the code but no screen shows it, so a player who sees "Fixed prices" or "Basic game" is never told what that means.

| File:line | Where shown | Current text | Verdict | Proposed | Reason |
|---|---|---|---|---|---|
| `src/engine/daily.ts:12` | Home: Daily market ticket, today's twist | `title: 'The usual'` | KEEP |  |  |
| `src/engine/daily.ts:12` | Daily twist: explanation (no screen shows it) | `text: 'The standard 10-day market.'` | UNUSED | (none) | Not shown anywhere. |
| `src/engine/daily.ts:13` | Home: Daily market ticket, today's twist | `title: 'Quick day'` | REWRITE | `title: 'Quick game'` | It is a shorter game (8 days), not a shorter day. "Quick" is the New game word for 8 days. |
| `src/engine/daily.ts:13` | Daily twist: explanation (no screen shows it) | `text: 'Only 8 days.'` | UNUSED | (none) | Not shown anywhere. |
| `src/engine/daily.ts:14` | Home: Daily market ticket, today's twist | `title: 'No upgrades'` | KEEP |  |  |
| `src/engine/daily.ts:14` | Daily twist: explanation (no screen shows it) | `text: 'No stall upgrades today.'` | UNUSED | (none) | Not shown anywhere. |
| `src/engine/daily.ts:15` | Home: Daily market ticket, today's twist | `title: 'Fixed prices'` | KEEP |  |  |
| `src/engine/daily.ts:15` | Daily twist: explanation (no screen shows it) | `text: 'Every customer pays the same street price.'` | UNUSED | (none) | Not shown anywhere. If it is ever shown: "the same street price" is not quite right, because three generous customers pay \$2 more (RULES.md, Fixed prices). |
| `src/engine/daily.ts:16` | Home: Daily market ticket, today's twist | `title: 'Calm market'` | REWRITE | `title: 'No events'` | Says what it is; "Calm Day" already means a day with no event. |
| `src/engine/daily.ts:16` | Daily twist: explanation (no screen shows it) | `text: 'No event cards today.'` | UNUSED | (none) | Not shown anywhere. |
| `src/engine/daily.ts:17` | Home: Daily market ticket, today's twist | `title: 'Long haul'` | REWRITE | `title: 'Long game'` | "Long" is the New game word for 14 days. |
| `src/engine/daily.ts:17` | Daily twist: explanation (no screen shows it) | `text: '14 days.'` | UNUSED | (none) | Not shown anywhere. |
| `src/engine/daily.ts:18` | Home: Daily market ticket, today's twist | `title: 'Basic game'` | KEEP |  |  |
| `src/engine/daily.ts:18` | Daily twist: explanation (no screen shows it) | `text: 'No perks, favour cards or upgrades.'` | UNUSED | (none) | Not shown anywhere. |
| `server/meta.ts:43` | Results after a Daily market game: name already on the board | `'Someone else already uses that name on today\'s board. Change your name in Settings and try again.'` | CORRECTNESS | Needs a decision. Possible wording: `'Someone else already uses that name on today\'s board. Change your name in New game and play again tomorrow.'` | POINTS TO A PLACE THAT DOES NOT EXIST: Settings has no name box (the name is typed in New game or on the online screen). "Try again" is also not possible: the finished game is sent with the name it was played under. The proposed wording is a stopgap; the real fix is a way to rename and resend. |
| `server/meta.ts:82` | Results after a Daily market game: sent too late | `'That daily challenge is closed'` | REWRITE | `'That day of the Daily market is closed.'` | The mode is called Daily market. |
| `server/meta.ts:81` | Results after a Daily market game: message when the game cannot be checked (not seen in normal play) | `'Bad date'` | KEEP |  |  |
| `server/meta.ts:83` | Results after a Daily market game: message when the game cannot be checked (not seen in normal play) | `'Bad moves'` | KEEP |  |  |
| `server/meta.ts:99` | Results after a Daily market game: message when the game cannot be checked (not seen in normal play) | `'The moves end before the game does'` | KEEP |  |  |
| `server/meta.ts:103` | Results after a Daily market game: message when the game cannot be checked (not seen in normal play) | `'The game did not finish'` | KEEP |  |  |
| `server/meta.ts:84` | Daily market leaderboard: name used when yours is blank or not allowed | `` `Shopkeeper ${owner.slice(0, 4)}` `` | KEEP |  |  |
| `server/worker.ts:286` | Results after a Daily market game: server error | `'Could not check that game'` | KEEP |  |  |

## Market League

Six stages. The stage names are flavour: option A is "Stage 1" to "Stage 6" with no name; option B is shown. Recommendation: keep them; they are plain place names.

| File:line | Where shown | Current text | Verdict | Proposed | Reason |
|---|---|---|---|---|---|
| `src/ui/progress.ts:56` | Home ticket, Trophies list and results: League stage name | `title: 'Village Square'` | KEEP | **Keep as is** (recommended) · A: cut · B: `title: 'Kampung Square'` | Plain place name. |
| `src/ui/progress.ts:57` | Home ticket, Trophies list and results: League stage name | `title: 'Harbour Steps'` | KEEP | **Keep as is** (recommended) · A: cut · B: `title: 'Jetty Steps'` | Plain place name. |
| `src/ui/progress.ts:58` | Home ticket, Trophies list and results: League stage name | `title: 'Old Town'` | KEEP | **Keep as is** (recommended) · A: cut | Plain place name. |
| `src/ui/progress.ts:59` | Home ticket, Trophies list and results: League stage name | `title: 'Spice Lane'` | KEEP | **Keep as is** (recommended) · A: cut | Plain place name. |
| `src/ui/progress.ts:60` | Home ticket, Trophies list and results: League stage name | `title: 'Grand Bazaar'` | KEEP | **Keep as is** (recommended) · A: cut · B: `title: 'Pasar Besar'` | Plain place name. |
| `src/ui/progress.ts:61` | Home ticket, Trophies list and results: League stage name | `title: 'Royal Market'` | KEEP | **Keep as is** (recommended) · A: cut | Plain place name. |
| `src/ui/App.tsx:355` | Trophies: heading | `<h3>Market League <span` | KEEP |  |  |
| `src/ui/App.tsx:357` | Trophies: League list | `<span>{i + 1}. {st.title}</span>` | KEEP |  |  |
| `src/ui/App.tsx:357` | Trophies: League list, small line | `{st.rivals.length} rival{st.rivals.length > 1 ? 's' : ''} · {st.rivals.map((r) => r.level).join(', ')}` | REWRITE | `{st.rivals.length} rival{st.rivals.length > 1 ? 's' : ''} · {st.rivals.map((r) => LEVEL_WORD[r.level]).join(', ')}` | Shows the internal words "easy, normal, hard" in lower case; New game shows Easy, Normal, Hard. |

## Wardrobe

Looks for your shopkeeper and stall. The look names describe drawn objects; they are kept. Note: about a third follow an older "Fruit Exchange" theme (Trader's, Ticker-Tape, Exchange Medal, Chairman's), which is a theme question for the art, not a wording one.

| File:line | Where shown | Current text | Verdict | Proposed | Reason |
|---|---|---|---|---|---|
| `src/ui/Wardrobe.tsx:43` | Wardrobe: top bar | `<b>Wardrobe</b>` | KEEP |  |  |
| `src/ui/Wardrobe.tsx:53` | Wardrobe: under your picture | `This is how you look at the market. Earn achievements to unlock more.` | KEEP |  |  |
| `src/ui/Wardrobe.tsx:54` | Wardrobe: looks just unlocked | `<b>New:</b>` | KEEP |  |  |
| `src/net/looks.ts:11` | Wardrobe: group heading | `title: 'Hat'` | KEEP |  |  |
| `src/net/looks.ts:12` | Wardrobe: group heading | `title: 'Face'` | KEEP |  |  |
| `src/net/looks.ts:13` | Wardrobe: group heading | `title: 'Neck and chest'` | KEEP |  |  |
| `src/net/looks.ts:14` | Wardrobe: group heading | `title: 'Badge'` | KEEP |  |  |
| `src/net/looks.ts:15` | Wardrobe: group heading | `title: 'In hand'` | KEEP |  |  |
| `src/net/looks.ts:16` | Wardrobe: group heading | `title: 'Roof'` | KEEP |  |  |
| `src/net/looks.ts:17` | Wardrobe: group heading | `title: 'Trim'` | KEEP |  |  |
| `src/net/looks.ts:18` | Wardrobe: group heading | `title: 'On the counter'` | KEEP |  |  |
| `src/ui/Wardrobe.tsx:60` | Wardrobe: after each group heading | `{slot.kind === 'wear' ? 'worn by your shopkeeper' : 'on your stall'}` | KEEP |  |  |
| `src/ui/Wardrobe.tsx:27` | Wardrobe: under a look you own | `(on ? 'Wearing' : 'Tap to use')` | REWRITE | `(on ? 'In use' : 'Tap to use')` | A roof or a plant pot is not worn. |
| `src/ui/Wardrobe.tsx:27` | Wardrobe: under a locked look | `` `Earn: ${ach?.title ?? ''}` `` | KEEP |  |  |
| `src/net/looks.ts:23` | Wardrobe: look name | `title: 'Trader\'s Bowler'` | KEEP |  |  |
| `src/net/looks.ts:24` | Wardrobe: look name | `title: 'Porter\'s Cap'` | KEEP |  |  |
| `src/net/looks.ts:25` | Wardrobe: look name | `title: 'Gazette Paper Hat'` | KEEP |  |  |
| `src/net/looks.ts:26` | Wardrobe: look name | `title: 'Brass Laurel'` | KEEP |  |  |
| `src/net/looks.ts:27` | Wardrobe: look name | `title: 'Chairman\'s Top Hat'` | KEEP |  |  |
| `src/net/looks.ts:28` | Wardrobe: look name | `title: 'Brass Loupe'` | KEEP |  |  |
| `src/net/looks.ts:29` | Wardrobe: look name | `title: 'Banknote Bow Tie'` | KEEP |  |  |
| `src/net/looks.ts:30` | Wardrobe: look name | `title: 'Ticker-Tape Scarf'` | KEEP |  |  |
| `src/net/looks.ts:31` | Wardrobe: look name | `title: 'Trader\'s Waistcoat'` | KEEP |  |  |
| `src/net/looks.ts:32` | Wardrobe: look name | `title: 'Certificate Sash'` | KEEP |  |  |
| `src/net/looks.ts:33` | Wardrobe: look name | `title: 'Exchange Medal'` | KEEP |  |  |
| `src/net/looks.ts:35` | Wardrobe: look name | `title: 'Trader\'s Visor'` | KEEP |  |  |
| `src/net/looks.ts:36` | Wardrobe: look name | `title: 'Pencil and Order Slip'` | KEEP |  |  |
| `src/net/looks.ts:37` | Wardrobe: look name | `title: 'Ticker-Tape Garland'` | KEEP |  |  |
| `src/net/looks.ts:38` | Wardrobe: look name | `title: 'Pocket Watch'` | KEEP |  |  |
| `src/net/looks.ts:39` | Wardrobe: look name | `title: 'Member\'s Badge'` | KEEP |  |  |
| `src/net/looks.ts:40` | Wardrobe: look name | `title: 'Brass Hand Bell'` | KEEP |  |  |
| `src/net/looks.ts:42` | Wardrobe: look name | `title: 'Striped Roof'` | KEEP |  |  |
| `src/net/looks.ts:43` | Wardrobe: look name | `title: 'Scalloped Roof'` | KEEP |  |  |
| `src/net/looks.ts:44` | Wardrobe: look name | `title: 'Checked Roof'` | KEEP |  |  |
| `src/net/looks.ts:45` | Wardrobe: look name | `title: 'Starry Roof'` | KEEP |  |  |
| `src/net/looks.ts:46` | Wardrobe: look name | `title: 'Fruit-Print Roof'` | KEEP |  |  |
| `src/net/looks.ts:47` | Wardrobe: look name | `title: 'Bunting'` | KEEP |  |  |
| `src/net/looks.ts:48` | Wardrobe: look name | `title: 'Paper Lanterns'` | KEEP |  |  |
| `src/net/looks.ts:49` | Wardrobe: look name | `title: 'Tassels'` | KEEP |  |  |
| `src/net/looks.ts:50` | Wardrobe: look name | `title: 'Chalk Board'` | KEEP |  |  |
| `src/net/looks.ts:51` | Wardrobe: look name | `title: 'Brass Scales'` | KEEP |  |  |
| `src/net/looks.ts:52` | Wardrobe: look name | `title: 'Plant Pot'` | KEEP |  |  |
| `src/net/looks.ts:53` | Wardrobe: look name | `title: 'Crate Stack'` | KEEP |  |  |
| `src/net/looks.ts:54` | Wardrobe: look name | `title: 'Stall Cat'` | KEEP |  |  |
| `src/net/looks.ts:55` | Wardrobe: look name | `title: 'Golden Apple'` | KEEP |  |  |

## Online (play a friend, quick match)

The home pop-up "Play a friend" offers Create a room, Join with a code and Quick match. Choosing Create a room then opens a screen that offers the same three again, and the room is only made after a second tap on "Create room". The online screens say "match", "opponent" and "AI" where the rest of the game says game, rival or stranger, and computer.

| File:line | Where shown | Current text | Verdict | Proposed | Reason |
|---|---|---|---|---|---|
| `src/ui/Online.tsx:106` | Online screen: top bar | `title="Online"` | KEEP |  |  |
| `src/ui/Online.tsx:112` | Online screen: top bar | `title="Online"` | KEEP |  |  |
| `src/ui/Online.tsx:121` | Online screen: top bar | `title="Online multiplayer"` | REWRITE | `title="Play a friend"` | Same name as the home button that opens it. |
| `src/ui/Online.tsx:107` | Online screen: when a room cannot be entered | `<h3>Couldn't join</h3>` | KEEP |  |  |
| `src/ui/Online.tsx:108` | Online screen: button | `>Back</button>` | KEEP |  |  |
| `src/ui/Online.tsx:112` | Online screen: while connecting | `Connecting to room {client.code}` | KEEP |  |  |
| `src/ui/Online.tsx:122` | Online screen: when there is no server | `Online play needs the web version or a configured server. See ONLINE.md.` | REWRITE | `Online play is not available in this copy of the game.` | A note for developers, shown to players. |
| `src/ui/Online.tsx:124` | Online screen: heading over the name box | `<h3>You</h3>` | REWRITE | `<h3>Your name</h3>` | Same heading as New game. |
| `src/ui/Online.tsx:126` | Online screen: heading | `<h3>Your shopkeeper</h3>` | KEEP |  |  |
| `src/ui/Online.tsx:127` | Online screen: under the heading | `One perk for the whole game. If someone in the room already has your shopkeeper, you will get a free one and can change it in the lobby.` | KEEP |  |  |
| `src/ui/Online.tsx:132` | Online screen: opened from an invite link | `<h3>Invited to room {initialCode}</h3>` | KEEP |  |  |
| `src/ui/Online.tsx:133` | Online screen: opened from an invite link | `>Join the game</button>` | KEEP |  |  |
| `src/ui/Online.tsx:138` | Online screen: heading | `<h3>Quick match</h3>` | KEEP |  |  |
| `src/ui/Online.tsx:139` | Online screen: Quick match | `Play a stranger who's looking for a game right now. Always 2 players; for 3 or 4, start a private game below.` | CORRECTNESS | `Play a stranger who is looking for a game now. Always 2 players. For 3 to 6, start a private game below.` | OUT OF DATE: private rooms hold 2 to 6 players (the next panel on this screen says so). |
| `src/ui/Online.tsx:140` | Online screen: Quick match button | `{busy ? 'Looking…' : 'Find an opponent'}` | REWRITE | `{busy ? 'Looking…' : 'Find a game'}` | "Opponent" is used nowhere else; the other stall is a rival or, here, a stranger. |
| `src/ui/Online.tsx:143` | Online screen: heading | `<h3>Start a private game</h3>` | KEEP |  |  |
| `src/ui/Online.tsx:144` | Online screen: private game | `You'll get a link to send to up to 5 friends, anywhere. 2 to 6 players.` | REWRITE | `You get a link to send to up to 5 friends. 2 to 6 players.` | "Anywhere" is filler. |
| `src/ui/Online.tsx:145` | Online screen: private game button | `{busy ? 'Creating…' : 'Create room'}` | REWRITE | `{busy ? 'Creating…' : 'Create a room'}` | The home pop-up calls the same button "Create a room". |
| `src/ui/Online.tsx:148` | Online screen: heading | `<h3>Join with a code</h3>` | KEEP |  |  |
| `src/ui/Online.tsx:150` | Online screen: grey text in the code box | `placeholder="ABC123"` | KEEP |  |  |
| `src/ui/Online.tsx:151` | Online screen: button | `>Join</button>` | KEEP |  |  |
| `src/ui/Online.tsx:194` | Quick match waiting screen: top bar | `title="Quick match"` | KEEP |  |  |
| `src/ui/Online.tsx:196` | Quick match waiting screen | `<h3>Looking for an opponent</h3>` | REWRITE | `<h3>Looking for a player</h3>` | See "Find a game". |
| `src/ui/Online.tsx:197` | Quick match waiting screen | `Waiting for someone to join` | KEEP |  |  |
| `src/ui/Online.tsx:198` | Quick match waiting screen | `The match starts as soon as another player taps Find an opponent. Tap ← to stop looking.` | REWRITE | `The game starts when another player taps Find a game. Tap ← to stop looking.` | Game, not match; the button's new name. |
| `src/ui/Online.tsx:207` | Lobby: top bar | `` title={`Room ${v.code}`} `` | KEEP |  |  |
| `src/ui/Online.tsx:208` | Lobby: strip when the connection drops | `Reconnecting…</div>` | KEEP |  |  |
| `src/ui/Online.tsx:210` | Lobby: heading | `` {friendsAllowed === 1 ? 'Invite a friend' : `Invite friends (up to ${friendsAllowed})`} `` | KEEP |  |  |
| `src/ui/Online.tsx:214` | Lobby: button | `{copied ? 'Copied!' : 'Copy link'}` | REWRITE | `{copied ? 'Copied' : 'Copy link'}` | No "!". |
| `src/ui/Online.tsx:215` | Lobby: button | `>Share</button>` | KEEP |  |  |
| `src/ui/Online.tsx:189` | Lobby: message sent by Share (the player's own invitation to a friend) | `` `Join my Fruit Market game! Room ${v.code}` `` | KEEP |  |  |
| `src/ui/Online.tsx:220` | Lobby: heading | `Players {v.seats.length + v.config.ai} of {MAX_SEATS}` | KEEP |  |  |
| `src/ui/Online.tsx:37` | Lobby: your row | `{name} (you)` | KEEP |  |  |
| `src/ui/Online.tsx:37` | Lobby: tag on the host | `<small class="host-tag">HOST</small>` | KEEP |  |  |
| `src/ui/Online.tsx:227` | Lobby: tag on the host | `<small class="host-tag">HOST</small>` | KEEP |  |  |
| `src/ui/Online.tsx:38` | Lobby: your row | `>Rename</button>` | KEEP |  |  |
| `src/ui/Online.tsx:229` | Lobby: each player | `{x.ready ? 'READY' : 'not ready'}` | KEEP |  |  |
| `src/ui/Online.tsx:233` | Lobby: a computer seat | `Computer rival {i + 1}` | REWRITE | `Computer {i + 1}` | Shorter; the settings below count "computers". |
| `src/ui/Online.tsx:233` | Lobby: a computer seat | `<span class="ready-tag yes">READY</span></div>)}` | KEEP |  |  |
| `src/ui/Online.tsx:234` | Lobby: an empty seat | `Open seat · send the link` | KEEP |  |  |
| `src/ui/Online.tsx:236` | Lobby: when every seat is taken | `Room full · start when everyone is ready` | KEEP |  |  |
| `src/ui/Online.tsx:240` | Lobby: heading | `<h3>Your shopkeeper</h3>` | KEEP |  |  |
| `src/ui/Online.tsx:241` | Lobby: under the heading | `Pick one that is free. Each shopkeeper has one perk for the whole game.` | KEEP |  |  |
| `src/ui/Online.tsx:250` | Lobby: heading | `<h3>Your look</h3>` | REWRITE | `<h3>Wardrobe</h3>` | One name for the screen the button opens. |
| `src/ui/Online.tsx:251` | Lobby: under the heading | `The hats, roofs and props you have earned. Everyone in the room sees what you pick.` | KEEP |  |  |
| `src/ui/Online.tsx:252` | Lobby: button | `>Open the wardrobe</button>` | REWRITE | `>Open the Wardrobe</button>` | Capital W, as a screen name. |
| `src/ui/Online.tsx:256` | Lobby: heading | `<h3>Match settings {!host && <span class="muted small">(host decides)</span>}</h3>` | REWRITE | `<h3>Game settings {!host && <span class="muted small">(host decides)</span>}</h3>` | Game, not match. |
| `src/ui/Online.tsx:264` | Lobby: computer stalls buttons | `` {n === 0 ? 'No AI' : `+${n} AI`} `` | REWRITE | `` {n === 0 ? 'No computers' : `+${n} computer${n === 1 ? '' : 's'}`} `` | The game says "computer" everywhere else. Five buttons share one row on a phone: check the width. |
| `src/ui/Online.tsx:269` | Lobby: button | `{me?.ready ? "I'm not ready" : "I'm ready"}` | KEEP |  |  |
| `src/ui/Online.tsx:272` | Lobby: host's button | `{allReady ? 'Start the match' : v.seats.length < 2 ? 'Waiting for a player…' : 'Waiting for everyone to be ready…'}` | REWRITE | `{allReady ? 'Start the game' : v.seats.length < 2 ? 'Waiting for a player…' : 'Waiting for everyone to be ready…'}` | Game, not match. |
| `src/ui/Online.tsx:275` | Lobby: for players who are not the host | `The host starts the match when everyone is ready.` | REWRITE | `The host starts the game when everyone is ready.` | Game, not match. |
| `src/ui/Online.tsx:74` | Online: your name when you type none | `name.trim() \|\| 'Player'` | KEEP |  |  |
| `src/net/client.ts:26` | Online screen: error | `'Could not create a room. Check your connection and try again.'` | KEEP |  |  |
| `src/net/client.ts:28` | Online screen: error | `'Could not create a room.'` | KEEP |  |  |
| `src/net/client.ts:36` | Online screen: error | `'Could not find a match. Try again.'` | REWRITE | `'Could not find a game. Try again.'` | Game, not match. |
| `src/net/protocol.ts:18` | Online: when your copy of the game is older than the room's | `'A new version of Fruit Market is out. Update the app (or refresh the page) to play online.'` | KEEP |  |  |
| `server/room.ts:243` | Online: message when you cannot enter a room | `'This game has already started.'` | KEEP |  |  |
| `server/room.ts:244` | Online: message when you cannot enter a room | `'This room is full.'` | KEEP |  |  |
| `server/room.ts:257` | Online: message when you cannot enter a room | `'Opened on another tab or device.'` | KEEP |  |  |
| `server/worker.ts:216` | Online: message when you cannot enter a room | `'This room has expired.'` | KEEP |  |  |
| `server/room.ts:250` | Online: name used when yours is blank or not allowed | `` `Player ${d.seats.length + 1}` `` | KEEP |  |  |
| `server/room.ts:290` | Lobby: message | `'Pick one of the eight shopkeepers'` | KEEP |  |  |
| `server/room.ts:291` | Lobby: message | `'That shopkeeper is taken'` | KEEP |  |  |
| `server/room.ts:304` | Lobby: message | `'You can change your name in the lobby only'` | KEEP |  |  |
| `server/room.ts:315` | Lobby: message | `'Only the host can change settings'` | KEEP |  |  |
| `server/room.ts:338` | Lobby: message | `'Only the host can start'` | KEEP |  |  |
| `server/room.ts:339` | Lobby: message | `'Waiting for another player to join'` | KEEP |  |  |
| `server/room.ts:340` | Lobby: message | `'Everyone must be ready'` | KEEP |  |  |
| `server/worker.ts:79` | Online screen: error from the server | `'Could not create a room, try again'` | KEEP |  |  |
| `server/worker.ts:325` | Online screen: error from the server | `'Could not find a match, try again'` | REWRITE | `'Could not find a game, try again'` | Game, not match. |
| `src/ui/Online.tsx:125` | Online screen: grey text inside the name box | `placeholder="Your name"` | CUT | **cut** | Said twice once the heading above reads "Your name". |
| `src/ui/Online.tsx:258` | Lobby: game length buttons | `[[8, 'Quick'], [10, 'Standard'], [14, 'Long']] as const` | KEEP |  |  |
| `src/ui/Online.tsx:259` | Lobby: game length buttons | `{l}<small>{d} days</small>` | KEEP |  |  |
| `server/room.ts:342` | Lobby: message when the host starts while someone is offline | `'A player is disconnected'` | KEEP |  |  |

## Errors and refusals during a game

Short messages shown as a toast, or in red under a button, when a move is not allowed. Most are plain. Three use the code's word "trait" or "phase".

| File:line | Where shown | Current text | Verdict | Proposed | Reason |
|---|---|---|---|---|---|
| `src/engine/game.ts:487` | Refusal: starting a game with the wrong number of stalls (not reachable from the screens) | `` `A game needs ${MIN_STALLS} to ${MAX_STALLS} stalls` `` | KEEP |  |  |
| `src/engine/game.ts:557` | Refusal: picking a perk late | `'Perks are picked on the first morning'` | KEEP |  |  |
| `src/engine/game.ts:558` | Refusal: picking a second perk | `'You already have a trait'` | REWRITE | `'You already have a perk'` | Perk, not trait. |
| `src/engine/game.ts:559` | Refusal: picking a perk you were not offered | `'That trait is not on offer'` | REWRITE | `'That perk is not on offer'` | Perk, not trait. |
| `src/engine/game.ts:683` | Refusal: standing-order bid | `'No standing order to bid for'` | KEEP |  |  |
| `src/engine/game.ts:685` | Refusal: standing-order bid | `'Bidding is closed'` | KEEP |  |  |
| `src/engine/game.ts:687` | Refusal: standing-order bid | `'Bids start at $1'` | KEEP |  |  |
| `src/engine/game.ts:688` | Refusal: bid above the limit | `` `The most this order pays is $${o.ceiling} a piece` `` | REWRITE | `` `The highest bid for this order is $${o.ceiling} a piece` `` | It is a limit on the bid; what the order pays is the winning bid. |
| `src/engine/game.ts:735` | Refusal: acting in the wrong step | `` `Not the ${phase} phase` `` | REWRITE | `` `Not now` `` | Would show the code's names ("Not the buy phase"). Rarely seen. |
| `src/engine/game.ts:736` | Refusal: not your turn | `'Not your turn'` | KEEP |  |  |
| `src/engine/game.ts:741` | Refusal: not your turn | `'Not your turn'` | KEEP |  |  |
| `src/engine/game.ts:821` | Refusal: not your turn | `'Not your turn'` | KEEP |  |  |
| `src/engine/game.ts:1307` | Refusal: not your turn | `'Not your turn'` | KEEP |  |  |
| `src/engine/game.ts:1337` | Refusal: not your turn | `'Not your turn'` | KEEP |  |  |
| `src/engine/game.ts:742` | Refusal: buying | `'None left'` | KEEP |  |  |
| `src/engine/game.ts:743` | Refusal: buying | `` `You can buy ${buyLimit(pl)} pieces of fruit a day` `` | KEEP |  |  |
| `src/engine/game.ts:744` | Refusal: buying | `'Your shelf is full'` | KEEP |  |  |
| `src/engine/game.ts:745` | Refusal: buying | `'Not enough cash'` | KEEP |  |  |
| `src/engine/game.ts:819` | Refusal: favour card (not seen in normal play) | `'No such card'` | KEEP |  |  |
| `src/engine/game.ts:822` | Favour card pop-up: why it cannot be played now | `` `Play this during the ${def.when === 'bid' ? 'pricing' : def.when} phase` `` | REWRITE | `` `Play this ${def.when === 'bid' ? 'at the bell' : def.when === 'buy' ? 'on your buying turn' : 'in the evening'}` `` | SHOWS CODE WORDS: reads "Play this during the buy phase". Proposed wording matches the cards. |
| `src/engine/game.ts:823` | Favour card pop-up: Priority on the last day | `'There is no tomorrow'` | REWRITE | `'This is the last day'` | Dramatic for a refusal; say the fact. |
| `src/engine/game.ts:824` | Favour card pop-up: a second Favoured Trade | `'Already active'` | REWRITE | `'Already played today'` | Says what happened. |
| `src/engine/game.ts:825` | Favour card pop-up: Gossip with nothing to see | `'No walk-ins to hear about'` | REWRITE | `'No walk-ins left to look at'` | Gossip "looks at" cards, like Scout. |
| `src/engine/game.ts:826` | Favour card pop-up: Scout with nothing to see | `'No walk-ins to look at'` | KEEP |  |  |
| `src/engine/game.ts:843` | Refusal: Free Fruit with nothing picked | `'Pick a fruit at the market'` | REWRITE | `'Pick a piece at the Wholesale Market'` | Piece; the market by its name. |
| `src/engine/game.ts:844` | Refusal: Free Fruit with a full shelf | `'Your shelf is full'` | KEEP |  |  |
| `src/engine/game.ts:855` | Refusal: Scout with nothing picked | `'Pick a walk-in to look at'` | KEEP |  |  |
| `src/engine/game.ts:885` | Refusal: a crate or price the screens cannot produce (not seen in normal play) | `'Unknown fruit'` | KEEP |  |  |
| `src/engine/game.ts:886` | Refusal: a crate or price the screens cannot produce (not seen in normal play) | `'Whole numbers only'` | KEEP |  |  |
| `src/engine/game.ts:916` | Refusal: a crate or price the screens cannot produce (not seen in normal play) | `'Unknown fruit'` | KEEP |  |  |
| `src/engine/game.ts:917` | Refusal: a crate or price the screens cannot produce (not seen in normal play) | `'Bad crate'` | KEEP |  |  |
| `src/engine/game.ts:920` | Refusal: a crate or price the screens cannot produce (not seen in normal play) | `'Whole numbers only'` | KEEP |  |  |
| `src/engine/game.ts:1045` | Refusal: a crate or price the screens cannot produce (not seen in normal play) | `'Unknown fruit'` | KEEP |  |  |
| `src/engine/game.ts:1046` | Refusal: a crate or price the screens cannot produce (not seen in normal play) | `'One price per fruit'` | KEEP |  |  |
| `src/engine/game.ts:1049` | Refusal: a crate or price the screens cannot produce (not seen in normal play) | `'Whole numbers only'` | KEEP |  |  |
| `src/engine/game.ts:1338` | Refusal: a crate or price the screens cannot produce (not seen in normal play) | `'Unknown fruit'` | KEEP |  |  |
| `src/engine/game.ts:1260` | Refusal: a crate or price the screens cannot produce (not seen in normal play) | `'Nothing to reveal'` | KEEP |  |  |
| `src/engine/game.ts:655` | Refusal: a crate or price the screens cannot produce (not seen in normal play) | `'Not morning'` | KEEP |  |  |
| `src/engine/game.ts:887` | Refusal: stocking | `` `You only have ${count(pl.stock, f, true)} ripe ${FRUIT[f].plural.toLowerCase()}` `` | KEEP |  |  |
| `src/engine/game.ts:921` | Refusal: stocking | `` `You don't have that many ${FRUIT[f].plural.toLowerCase()} there` `` | KEEP |  |  |
| `src/engine/game.ts:922` | Refusal: stocking | `'Green fruit can\'t be sold yet'` | KEEP |  |  |
| `src/engine/game.ts:1048` | Refusal: a price for a fruit you are not selling | `` `You have no ${FRUIT[b.fruit].plural.toLowerCase()} out for sale` `` | REWRITE | `` `You have no ${FRUIT[b.fruit].plural.toLowerCase()} in your crate` `` | Crate, not "out for sale". |
| `src/engine/game.ts:1050` | Red text under the price button | `'Prices start at $1'` | KEEP |  |  |
| `src/engine/game.ts:1051` | Red text under the price button | `` `Price Controls: the most you can charge for ${FRUIT[b.fruit].plural.toLowerCase()} today is $${maxPrice(s, b.fruit)}` `` | KEEP |  |  |
| `src/engine/game.ts:1053` | Red text under the price button | `` `Set a price for your ${FRUIT[f].plural.toLowerCase()}` `` | KEEP |  |  |
| `src/engine/game.ts:1306` | Upgrade button: why it is greyed (tooltip) | `'Upgrades are off'` | KEEP |  |  |
| `src/engine/game.ts:1308` | Upgrade button: why it is greyed (tooltip) | `'Upgrades are offered after Market Days'` | KEEP |  |  |
| `src/engine/game.ts:1309` | Upgrade button: why it is greyed (tooltip) | `'Already built'` | KEEP |  |  |
| `src/engine/game.ts:1310` | Upgrade button: why it is greyed (tooltip) | `` `Your stall has room for ${MAX_UPGRADES} upgrades` `` | KEEP |  |  |
| `src/engine/game.ts:1311` | Upgrade button: why it is greyed (tooltip) | `'Not on offer tonight'` | KEEP |  |  |
| `src/engine/game.ts:1312` | Upgrade button: why it is greyed (tooltip) | `'Not enough cash'` | KEEP |  |  |
| `src/engine/game.ts:1336` | Refusal: Shade Cloth (not seen in normal play) | `'Only the Shade Cloth can do that'` | KEEP |  |  |
| `server/room.ts:405` | Online refusal: crate sent at the wrong time | `'Stalls are not being set out now'` | REWRITE | `'It is not the stocking step.'` | "Set out" is one more word for stocking. |
| `server/room.ts:406` | Online refusal: crate sent twice | `'Your crate is already set out'` | REWRITE | `'Your crate is already set.'` | As above. |
| `server/room.ts:428` | Online refusal: bid sent at the wrong time | `'No standing order is being bid for now'` | REWRITE | `'There is no standing order to bid for now.'` | Plain word order. |
| `server/room.ts:438` | Online refusal: prices sent at the wrong time | `'Prices are not being set now'` | KEEP |  |  |
| `server/room.ts:439` | Online refusal: prices sent twice | `'Your prices are already locked in'` | REWRITE | `'Your prices are already sealed.'` | Sealed, not locked. |
| `server/room.ts:449` | Online refusal | `'The game moved on. Try again.'` | KEEP |  |  |
| `server/room.ts:473` | Online refusal | `'The game moved on. Try again.'` | KEEP |  |  |
| `server/room.ts:450` | Online refusal | `'Play this with your prices'` | KEEP |  |  |
| `server/room.ts:474` | Online refusal | `'You can take back purchases during your own buying turn only'` | KEEP |  |  |
| `server/room.ts:476` | Online refusal | `'Nothing to take back'` | KEEP |  |  |
| `server/room.ts:478` | Online refusal | `'Nothing to take back'` | KEEP |  |  |
| `server/room.ts:396` | Online refusal | `'No game in progress'` | KEEP |  |  |
| `server/room.ts:470` | Online refusal | `'No game in progress'` | KEEP |  |  |
| `server/room.ts:142` | Online refusal for a broken message (not seen in normal play) | `'Message too large'` | KEEP |  |  |
| `server/room.ts:147` | Online refusal for a broken message (not seen in normal play) | `'Bad message'` | KEEP |  |  |
| `server/room.ts:149` | Online refusal for a broken message (not seen in normal play) | `'Bad message'` | KEEP |  |  |
| `server/room.ts:153` | Online refusal for a broken message (not seen in normal play) | `'Say hello first'` | KEEP |  |  |
| `server/room.ts:397` | Online refusal for a broken message (not seen in normal play) | `'Bad action'` | KEEP |  |  |
| `server/room.ts:401` | Online refusal for a broken message (not seen in normal play) | `'Bad action'` | KEEP |  |  |
| `server/room.ts:471` | Online refusal for a broken message (not seen in normal play) | `'Bad action'` | KEEP |  |  |
| `server/room.ts:402` | Online refusal for a broken message (not seen in normal play) | `'Use continue'` | KEEP |  |  |
| `server/room.ts:407` | Online refusal for a broken message (not seen in normal play) | `'Bad crate'` | KEEP |  |  |
| `server/room.ts:413` | Online refusal for a broken message (not seen in normal play) | `'Bad crate'` | KEEP |  |  |
| `server/room.ts:416` | Online refusal for a broken message (not seen in normal play) | `'Bad crate'` | KEEP |  |  |
| `server/room.ts:440` | Online refusal for a broken message (not seen in normal play) | `'Bad prices'` | KEEP |  |  |
| `server/worker.ts:65` | Online refusal for a broken message (not seen in normal play) | `'Too large'` | KEEP |  |  |
| `server/worker.ts:66` | Online refusal for a broken message (not seen in normal play) | `'Bad JSON'` | KEEP |  |  |

## Web page and install name

What a browser tab, a search result, a shared link and the phone's home screen show.

| File:line | Where shown | Current text | Verdict | Proposed | Reason |
|---|---|---|---|---|---|
| `index.html:12` | Browser tab title | `<title>Fruit Market</title>` | KEEP |  |  |
| `index.html:11` | Name under the icon on an iPhone home screen | `name="apple-mobile-web-app-title" content="Fruit Market"` | KEEP |  |  |
| `index.html:13` | Description shown by search engines | `Fruit Market: buy fresh fruit, set secret prices and sell fast before it spoils. A pixel-art market game for 1 to 4 players.` | CORRECTNESS | `Fruit Market: buy fruit, set secret prices and sell before it spoils. A market game for 1 to 6 players.` | TWO THINGS OUT OF DATE: the game has 2 to 6 stalls (1 to 6 people), not "1 to 4 players", and the art has not been pixel art since the Market Ticket look (1.17.0). |
| `index.html:22` | Title on a shared link | `property="og:title" content="Fruit Market"` | KEEP |  |  |
| `index.html:23` | Description on a shared link | `Buy fresh fruit, set secret prices and sell fast before it spoils. Play free in your browser.` | KEEP |  |  |
| `public/manifest.webmanifest:2` | Installed app name | `"name": "Fruit Market"` | KEEP |  |  |
| `public/manifest.webmanifest:3` | Installed app short name | `"short_name": "Fruit Market"` | KEEP |  |  |
| `public/manifest.webmanifest:4` | Installed app description | `"description": "Buy fresh fruit, set secret prices and sell fast before it spoils."` | KEEP |  |  |

## Print only · stall sheet and counter (update pack)

From scripts/print-update.ts. Small labels on these sheets are printed in capitals by the style, so their letter case in the code does not show.

| File:line | Where shown | Current text | Verdict | Proposed | Reason |
|---|---|---|---|---|---|
| `scripts/print-update.ts:81` | Stall sheet | `<b class="disp">Stall</b>` | KEEP |  |  |
| `scripts/print-update.ts:68` | Stall sheet | `days${GREEN[f] ? ' · arrives green' : ''}` | KEEP |  |  |
| `scripts/print-update.ts:27` | Stall sheet | `{ unripe: 'Green', fresh: 'Fresh', okay: 'Okay', notso: 'Soft' }` | KEEP |  |  |
| `scripts/print-update.ts:73` | Stall sheet | `<span class="lab">Not ripe:<br>cannot sell</span>` | KEEP |  |  |
| `scripts/print-update.ts:73` | Stall sheet | `<span class="lab">Crate</span>` | KEEP |  |  |
| `scripts/print-update.ts:74` | Stall sheet | `<span class="lab">Shelf</span>` | KEEP |  |  |
| `scripts/print-update.ts:77` | Stall sheet | `<span class="lab">Price tag</span><small>Behind the shutter until the bell</small>` | KEEP |  |  |
| `scripts/print-update.ts:82` | Stall sheet | `<b>Top row = your crate:</b> on sale today, secret until the bell. <b>Bottom row = your shelf:</b> kept back. 8 pieces in all (10 with a Handcart).` | KEEP |  |  |
| `scripts/print-update.ts:85` | Stall sheet | `<b class="lab">What it sells for</b>` | KEEP |  |  |
| `scripts/print-update.ts:86` | Stall sheet | `Fresh: the customer's price</span>` | KEEP |  |  |
| `scripts/print-update.ts:86` | Stall sheet | `Okay: $1 less</span>` | KEEP |  |  |
| `scripts/print-update.ts:86` | Stall sheet | `Soft: $2 less</span>` | KEEP |  |  |
| `scripts/print-update.ts:86` | Stall sheet | `Green: cannot be sold</span>` | KEEP |  |  |
| `scripts/print-update.ts:88` | Stall sheet | `<b class="lab">Your cash is not here.</b> Cash is public: the cash track is on your counter, in front of the shutter.` | KEEP |  |  |
| `scripts/print-update.ts:89` | Stall sheet | `Fruit Market · update pack · rules version ${RULES_VERSION} · stall sheet ${i + 1} of 6 · ${pat} · print at 100% (actual size) on A4` | KEEP |  |  |
| `scripts/print-update.ts:103` | Counter | `<b class="disp">Counter</b>` | KEEP |  |  |
| `scripts/print-update.ts:103` | Counter | `${pat} · in front of your shutter` | KEEP |  |  |
| `scripts/print-update.ts:106` | Counter | `<b>Empty until the bell.</b> Then your crate comes out here, for everyone to see. Before the bell, say only how many pieces are in your crate.` | KEEP |  |  |
| `scripts/print-update.ts:100` | Counter | `<span class="lab">Price tag</span><small>Face up at the bell</small>` | KEEP |  |  |
| `scripts/print-update.ts:108` | Counter | `<b>At the bell:</b> flip your price tags onto their fruit here, then bring your crate pieces out, each into the box with the same letter and place. <b>After the rush:</b> unsold pieces go back behind the shutter; wipe your tags.` | KEEP |  |  |
| `scripts/print-update.ts:111` | Counter | `<b class="disp">Cash</b><span class="lab">Public</span>` | KEEP |  |  |
| `scripts/print-update.ts:112` | Counter | `<span class="lab">Tens marker</span>` | KEEP |  |  |
| `scripts/print-update.ts:114` | Counter | `<span class="lab">+ Ones marker</span>` | KEEP |  |  |
| `scripts/print-update.ts:193` | Counter | `Fruit Market · update pack · rules version ${RULES_VERSION} · counter ${k + 1} of 6 · ${pat} · cut along the dashed line · print at 100% (actual size) on A4 landscape` | KEEP |  |  |
| `scripts/print-update.ts:116` | Counter: note under the cash track | `Yellow = where you start: $10. Past $199? Take a +$200 chip. Everyone may read your cash at any time: move your own markers while the table watches.` | REWRITE | `Yellow = where you start: $10. Past $199, take a +$200 chip. Everyone may read your cash at any time. Move your own markers while the table watches.` | Rhetorical question; one fact per sentence. |

## Print only · change sheet (update pack)

The first page of the update pack: what is in it and what changed.

| File:line | Where shown | Current text | Verdict | Proposed | Reason |
|---|---|---|---|---|---|
| `scripts/print-update.ts:163` | Change sheet | `Print and play · update pack · rules version ${RULES_VERSION}</span>` | KEEP |  |  |
| `scripts/print-update.ts:164` | Change sheet | `<h1 class="disp">Fruit Market<br>what changed</h1>` | KEEP |  |  |
| `scripts/print-update.ts:165` | Change sheet | `This pack updates the rules 15 printing to rules version ${RULES_VERSION}, the rules the app plays by. Print single-sided at 100% (actual size) on A4 card. Keep your board, shutters, fruit pieces, price tags, markers and all other cards.` | KEEP |  |  |
| `scripts/print-update.ts:166` | Change sheet | `<h2 class="disp">In this pack</h2>` | KEEP |  |  |
| `scripts/print-update.ts:168` | Change sheet | `<li><b>Six stall sheets</b> (pages 2 to 7). They replace the old ones. The cash track is gone from them.</li>` | KEEP |  |  |
| `scripts/print-update.ts:169` | Change sheet | `<li><b>Six counters</b> (pages 8 to 13, one to a page, landscape; cut along the dashed line). They replace the old ones. Each now carries that stall's <b>cash track</b>, so cash sits in front of the shutter where everyone can read it.</li>` | KEEP |  |  |
| `scripts/print-update.ts:170` | Change sheet | `<li><b>Eight standing-order cards</b> (the cards file, double-sided). They replace the old eight.</li>` | KEEP |  |  |
| `scripts/print-update.ts:171` | Change sheet | `<li><b>The rules guidebook</b>, whole, at rules version ${RULES_VERSION}.</li>` | KEEP |  |  |
| `scripts/print-update.ts:173` | Change sheet | `<h2 class="disp">The rule changes</h2>` | KEEP |  |  |
| `scripts/print-update.ts:175` | Change sheet | `<li><b>Tomorrow's customers come out in the morning.</b> When you turn over tomorrow's lorry, also deal tomorrow's row below today's: one regular face up and the walk-ins face down. Everyone buys knowing both days. (Before: tomorrow's row was dealt at Stocking.)</li>` | KEEP |  |  |
| `scripts/print-update.ts:176` | Change sheet | `<li><b>Standing orders are bid for in the open.</b> To bid, write your price on a tag and lay it face down in front of your shutter. To pass, say "pass". Everyone can see who is bidding and who has passed, never the price. You may change your tag, take it back or put one down for as long as any stall is still deciding. When the last stall decides, flip all tags: the lowest bid wins.</li>` | KEEP |  |  |
| `scripts/print-update.ts:177` | Change sheet | `<li><b>Rivals fill the gap for $1 less.</b> On the due day, if the winner is short, the order buys rivals' freshest Fresh or Okay pieces and pays them <b>$1 under the winning bid</b> (never under $1), not the price on the card.</li>` | KEEP |  |  |
| `scripts/print-update.ts:178` | Change sheet | `<li><b>Cash is public and lives on the counter.</b> Keep your Tens and Ones markers on your counter's cash track.</li>` | KEEP |  |  |
| `scripts/print-update.ts:179` | Change sheet | `<li><b>No order that cannot be collected.</b> Do not turn over a standing order if its due day would be after the last day (in a Standard game, none on day 9).</li>` | KEEP |  |  |
| `scripts/print-update.ts:181` | Change sheet | `<p>Upgrades are unchanged on the table: all five piles are on offer after each Market Day (the app now offers all five too).</p>` | KEEP |  |  |
| `scripts/print-update.ts:182` | Change sheet | `<h2 class="disp">Notes for your board and shutters</h2>` | KEEP |  |  |
| `scripts/print-update.ts:183` | Change sheet | `<p>The board and shutters still read as before. Cut these out and lay or tape them over the old words if you like:</p>` | KEEP |  |  |
| `scripts/print-update.ts:184` | Change sheet | `<b class="disp">1 Morning</b>Today's event (from Day 2). Unload the lorry. Turn over tomorrow's lorry and deal tomorrow's customers. Market Day: bid for the standing order.` | KEEP |  |  |
| `scripts/print-update.ts:185` | Change sheet | `<b class="disp">3 Stocking</b>Turn today's walk-ins face up. Behind your shutter, move the pieces you will sell into your crate. Say how many, not which fruit.` | KEEP |  |  |
| `scripts/print-update.ts:186` | Change sheet | `<b class="disp">Standing order</b>Bid in the open: a tag face down, or "pass". Change your mind until the last stall decides. Rivals who fill a gap are paid $1 under the winning bid.` | KEEP |  |  |
| `scripts/print-update.ts:187` | Change sheet | `Fruit Market · update pack · rules version ${RULES_VERSION} · start here · print at 100% (actual size) on A4` | KEEP |  |  |

## Print only · standing-order card (update pack)

The fixed words on each of the eight cards. The title and quirk are in Cards · standing orders.

| File:line | Where shown | Current text | Verdict | Proposed | Reason |
|---|---|---|---|---|---|
| `scripts/print-update.ts:222` | Standing-order card | `<span class="lab">Standing order</span><span class="lab">Due in 2 days</span>` | KEEP |  |  |
| `scripts/print-update.ts:225` | Standing-order card | `<span class="lab">Highest bid<br>allowed</span>` | KEEP |  |  |
| `scripts/print-update.ts:226` | Standing-order card | `Wants 3 at 2–3 stalls · 4 at 4 · 5 at 5–6` | KEEP |  |  |
| `scripts/print-update.ts:227` | Standing-order card | `<p>Bid a price per piece, or pass. Who bids is public; prices are secret. Change your mind until the last stall decides. <b>The lowest bid wins</b> and is paid that price for each piece.</p>` | KEEP |  |  |
| `scripts/print-update.ts:228` | Standing-order card | `<p>On the due day it takes the winner's Fresh or Okay pieces first, then rivals' pieces at <b>$1 under the winning bid</b>.</p>` | KEEP |  |  |
| `scripts/print-update.ts:229` | Standing-order card | `Fine: $${o.fine} a piece the winner misses` | KEEP |  |  |
| `scripts/print-update.ts:230` | Standing-order card | `No favour card · no tips` | KEEP |  |  |
| `scripts/print-update.ts:233` | Standing-order card | `Fruit Market · update pack · rules version ${RULES_VERSION} · standing-order cards · ${side} · print at 100% (actual size) on A4` | KEEP |  |  |
| `scripts/print-update.ts:235` | Standing-order card | `foot('front')` | KEEP |  |  |
| `scripts/print-update.ts:236` | Standing-order card | `foot('back (flip on the long edge)')` | KEEP |  |  |
| `scripts/print-update.ts:232` | Standing-order card: back | `<span class="disp">Order</span><span class="lab">Fruit Market</span>` | REWRITE | `<span class="disp">Standing order</span><span class="lab">Fruit Market</span>` | "Order" alone is what a customer wants. Check it fits the card back. |

## Print only · rules guidebook (update pack)

One row for each line of the guidebook. Card names, perk texts, event texts, favour texts and upgrade texts are pulled from the game data, so the changes proposed under Cards flow into the guidebook tables. Almost all of this text is already plain; it reads like a rulebook. Seven rows change.

| File:line | Where shown | Current text | Verdict | Proposed | Reason |
|---|---|---|---|---|---|
| `scripts/print-update.ts:275` | Guidebook: cover | `<span class="lab">Rules guidebook · 2 to 6 stalls · 45 to 90 minutes</span>` | CORRECTNESS | Needs a decision. Possible wording: `<span class="lab">Rules guidebook · 2 to 6 stalls</span>` | NO EVIDENCE FOR THE PLAYING TIME: nothing in the repo records a timed tabletop game (GAME-BRIEF.md lists match length as a hypothesis, "not measured with real players"). Keep it only if the owner has timed it. |
| `scripts/print-update.ts:277` | Guidebook: cover | `<h1>Fruit<br>Market</h1>` | KEEP |  |  |
| `scripts/print-update.ts:278` | Guidebook: cover | `<p class="q">How much can you charge before your rival, or the rot, gets you?</p>` | REWRITE | `<p class="q">Set your price in secret. Sell before the fruit spoils.</p>` | Rhetorical question on the cover. Option A: cut the line; the title and the fruit band carry the cover. This is the game's oldest line (RULES.md opens with it), so it is the owner's call. |
| `scripts/print-update.ts:279` | Guidebook: cover | `<span class="lab">Game design by Murshidi bin Md Hashim · tabletop rules, rules version ${RULES_VERSION}</span>` | KEEP |  |  |
| `scripts/print-update.ts:282` | Guidebook: The big idea | `<h2>The big idea</h2>` | KEEP |  |  |
| `scripts/print-update.ts:283` | Guidebook: The big idea | `<p>Each player runs a small fruit stall. You buy fruit from the Wholesale Market in the morning and sell it to the town's customers the same day. Fruit gets older every night, so whatever you buy, you are racing to sell it. The stall with the most cash at the end of the last day wins.</p>` | REWRITE | `<p>Each player runs a small fruit stall. Each morning you buy fruit at the Wholesale Market. Each day you sell it to customers. Fruit ages every night, sells for less as it ages, and is then thrown away. The stall with the most cash at the end of the last day wins.</p>` | "The same day" is not a rule (fruit can be kept); "you are racing to sell it" is a flourish. |
| `scripts/print-update.ts:284` | Guidebook: The big idea | `<p>Three things pull against you every day:</p>` | KEEP |  |  |
| `scripts/print-update.ts:286` | Guidebook: The big idea | `<li><b>The clock.</b> Every night all fruit gets one step older. Older fruit sells for less, and then it is thrown away.</li>` | KEEP |  |  |
| `scripts/print-update.ts:287` | Guidebook: The big idea | `<li><b>The secret price.</b> You never see a rival's prices until the bell. Price too high and the customer walks past you. Price too low and you give money away.</li>` | KEEP |  |  |
| `scripts/print-update.ts:288` | Guidebook: The big idea | `<li><b>The shut crate.</b> Stalls are secret. Before prices are set you learn only how many pieces each rival put out, not which fruit.</li>` | KEEP |  |  |
| `scripts/print-update.ts:291` | Guidebook: The big idea | `<h3>What is new in rules version ${RULES_VERSION}</h3>` | KEEP |  |  |
| `scripts/print-update.ts:292` | Guidebook: The big idea | `<p><b>Tomorrow's customers in the morning.</b> Tomorrow's row is dealt each morning, with tomorrow's lorry, so everyone buys knowing today's crowd and tomorrow's.</p>` | KEEP |  |  |
| `scripts/print-update.ts:293` | Guidebook: The big idea | `<p><b>Standing orders in the open.</b> Everyone sees who is bidding and who has passed, never the price, and you may change your mind until the last stall decides. A rival who fills a gap is paid $1 under the winning bid.</p>` | KEEP |  |  |
| `scripts/print-update.ts:294` | Guidebook: The big idea | `<p><b>Cash is public and sits on your counter</b>, in front of the shutter. The stall sheet no longer has a cash track.</p>` | KEEP |  |  |
| `scripts/print-update.ts:297` | Guidebook: What is in the box | `<h2>What is in the box</h2>` | KEEP |  |  |
| `scripts/print-update.ts:298` | Guidebook: What is in the box | `<p>1 Wholesale Market board (three panels) · 6 stall sheets, 6 shutters and 6 counters (each counter carries a cash track) · 200 fruit pieces, 50 of each fruit · 24 price tags, four per stall · 12 cash markers, two per stall · 36 served-alone chips, six per stall · 36 customer cards and 5 guest cards · 20 event cards and 20 lorry cards · 18 favour cards · 30 upgrade cards, six of each · 8 standing-order cards · 8 shopkeeper cards · day marker, first-player token, Shade Cloth marker, six +$200 chips. You also need a dry-wipe pen or pencil for each stall.</p>` | KEEP |  |  |
| `scripts/print-update.ts:300` | Guidebook: The fruit | `<h2>The fruit</h2>` | KEEP |  |  |
| `scripts/print-update.ts:301` | Guidebook: The fruit | `<p>Every fruit follows the same rule. A <b>Fresh</b> piece sells at the customer's full price. An <b>Okay</b> piece sells for $1 less. A <b>Soft</b> piece sells for $2 less. <b>Green</b> fruit cannot be sold until it ripens. A fruit's last two days are Okay, then Soft; every day before that is Fresh. Mangoes always arrive Green and spend two nights ripening first.</p>` | KEEP |  |  |
| `scripts/print-update.ts:302` | Guidebook: The fruit | `<p>Each lane on the board, and on your stall sheet, is that fruit's life from right (newest) to left (oldest). Every night, every piece slides one box to the left. A piece that slides out of its Soft box is thrown away.</p>` | KEEP |  |  |
| `scripts/print-update.ts:303` | Guidebook: The fruit | `<table class="lanes"><tr><th>Fruit</th><th>Lasts</th><th>Its boxes, oldest on the left, with the cost to buy from each</th></tr>${laneRows}</table>` | KEEP |  |  |
| `scripts/print-update.ts:304` | Guidebook: The fruit | `<p class="tiny">S = Soft, O = Okay, F = Fresh, G = Green. Every mango arrives green; no other fruit does.</p>` | KEEP |  |  |
| `scripts/print-update.ts:306` | Guidebook: Customers | `<h2>Customers</h2>` | KEEP |  |  |
| `scripts/print-update.ts:307` | Guidebook: Customers | `<p>A customer card shows one or two fruits. For each one it shows how many they want (the circles) and the most they pay for a Fresh piece (the price tag). They pay $1 less for Okay and $2 less for Soft. The black band is the customer's freshness type: <b>Premium</b> buys Fresh fruit only; <b>Everyday</b> buys Fresh or Okay; <b>Bargain</b> buys Fresh, Okay or Soft.</p>` | KEEP |  |  |
| `scripts/print-update.ts:308` | Guidebook: Customers | `<p>The back of the card shows only which fruits they want. A face-down customer keeps their amounts, prices and type secret.</p>` | KEEP |  |  |
| `scripts/print-update.ts:309` | Guidebook: Customers | `<p>Each day brings one <b>regular</b> (drawn face up, a day ahead) and some <b>walk-ins</b> (drawn face down, a day ahead). The crowd is one customer per stall, and never more than five: the regular plus one walk-in for every stall after the first, up to four. With 6 stalls every customer wants one more of the first fruit on their card. Nobody waits overnight: a customer who does not get everything leaves.</p>` | KEEP |  |  |
| `scripts/print-update.ts:311` | Guidebook: Set-up | `<h2>Set-up</h2>` | KEEP |  |  |
| `scripts/print-update.ts:313` | Guidebook: Set-up | `<li><b>The board.</b> Open it in the middle of the table. Shuffle the 20 event cards and the 20 lorry cards and put each deck face down on its space. Put the day marker on 1. Agree the length: Quick is 8 days, Standard is 10, Long is 14.</li>` | KEEP |  |  |
| `scripts/print-update.ts:314` | Guidebook: Set-up | `<li><b>The supply.</b> Put all the fruit pieces in a pile within reach. The market starts empty.</li>` | KEEP |  |  |
| `scripts/print-update.ts:315` | Guidebook: Set-up | `<li><b>Each stall</b> takes a stall sheet, the shutter, the counter, cash markers and chips in the same pattern, four price tags and a pen. Stand the shutter in front of your sheet and lay the counter in front of the shutter: the shutter stays up all game. On your counter's cash track, put your Tens marker on 10 and your Ones marker on 0: you start with $10.</li>` | KEEP |  |  |
| `scripts/print-update.ts:316` | Guidebook: Set-up | `<li><b>First player.</b> Give the first-player token to a stall at random.</li>` | KEEP |  |  |
| `scripts/print-update.ts:317` | Guidebook: Set-up | `<li><b>Shopkeepers.</b> Lay the eight shopkeeper cards face up. Starting with the player to the left of the token, each stall picks one. It gives you one perk for the whole game. Saleh moves his cash to $18. Ah Chen draws four favour cards once the deck is ready.</li>` | KEEP |  |  |
| `scripts/print-update.ts:318` | Guidebook: Set-up | `<li><b>Favours and upgrades.</b> With 2 to 4 stalls, use two of each favour card (12 cards). With 5 or 6 stalls use all 18. Shuffle them face down beside the board. Lay the upgrade cards face up in five piles. Shuffle the eight standing-order cards face down beside them.</li>` | KEEP |  |  |
| `scripts/print-update.ts:319` | Guidebook: Set-up | `<li><b>Customers.</b> Shuffle the 36 customer cards. Keep the five guest cards to one side. Deal today's crowd in a row on the table: one regular face up, then one walk-in face down for every stall after the first, up to four.</li>` | KEEP |  |  |
| `scripts/print-update.ts:322` | Guidebook: Money: the cash track | `<h2>Money: the cash track</h2>` | KEEP |  |  |
| `scripts/print-update.ts:323` | Guidebook: Money: the cash track | `<p>Your cash is your Tens marker plus your Ones marker, on the cash track on your <b>counter</b>, in front of your shutter. With Tens on 10 and Ones on 4 you have $14. When you are paid or you pay, move the Ones marker, and carry to the Tens marker when you pass 9 or go below 0. If you pass $199, take a +$200 chip and start the Tens again from 0.</p>` | KEEP |  |  |
| `scripts/print-update.ts:324` | Guidebook: Money: the cash track | `<p><b>Cash is public.</b> Everyone can read everyone's cash at any time. Nobody hands money to anybody: each stall moves its own markers while the table watches.</p>` | KEEP |  |  |
| `scripts/print-update.ts:326` | Guidebook: A day in five beats | `<h2>A day in five beats</h2>` | REWRITE | `<h2>A day in five steps</h2>` | "Beats" is a writer's word. The app's top bar shows them as five numbered steps. If the printed board says "beats", keep it. |
| `scripts/print-update.ts:327` | Guidebook: A day in five beats | `<div class="beat"><b>1</b><div><h3>Morning</h3>` | KEEP |  |  |
| `scripts/print-update.ts:329` | Guidebook: A day in five beats | `<li><b>Event.</b> From Day 2 onward, turn over the top event card onto "Today's event" and do what it says. Nobody knows an event before its own morning. There is no event on Day 1. If the event adds walk-ins, deal them face down at the end of today's row. If it removes walk-ins, the last ones in today's row go back under the customer deck. If it brings a guest, add that guest card to the end of the row.</li>` | KEEP |  |  |
| `scripts/print-update.ts:330` | Guidebook: A day in five beats | `<li><b>The lorry.</b> The card on "Tomorrow's lorry" is now today's lorry (on Day 1, turn over the top card of the deck). Find the row for your number of stalls and take that many pieces of each fruit from the supply. Put them in that fruit's box marked "The lorry unloads here". Mangoes always arrive green and go in the far green box. The Seconds Lorry unloads its other fruit into each fruit's freshest Okay box.</li>` | KEEP |  |  |
| `scripts/print-update.ts:331` | Guidebook: A day in five beats | `<li><b>Tomorrow.</b> Discard today's lorry card and turn the next one face up onto "Tomorrow's lorry". Then deal <b>tomorrow's row</b> below today's: one regular face up and the walk-ins face down (use the "Daily" number on the board). Tomorrow's own event may change that row tomorrow morning. Deal nothing for the day after the last day.</li>` | KEEP |  |  |
| `scripts/print-update.ts:332` | Guidebook: A day in five beats | `<li><b>Market Day?</b> Turn over a standing order and bid for it now, before anyone buys (see Standing orders).</li>` | REWRITE | `<li><b>On a Market Day.</b> Turn over a standing order and bid for it now, before anyone buys (see Standing orders).</li>` | Question used as a label. |
| `scripts/print-update.ts:334` | Guidebook: A day in five beats | `<div class="beat"><b>2</b><div><h3>Buying</h3>` | KEEP |  |  |
| `scripts/print-update.ts:335` | Guidebook: A day in five beats | `<p>The poorest stall buys first, then the others follow clockwise from it. If stalls tie for poorest, the first of them clockwise from the first-player token goes first. On Day 1, start at the token. This is today's buying order; the evening and the last tie-break use it too.</p>` | KEEP |  |  |
| `scripts/print-update.ts:336` | Guidebook: A day in five beats | `<p>On your turn, buy up to 4 pieces. For each one, take a piece from any market box, pay the cost printed on that box, and put the piece on your shelf row, in the box with the same position in that fruit's lane (same letter, same distance from the Soft end). Your sheet holds 8 pieces in all. You may play Free Fruit, Scout or Fridge on your turn. Buying is done in the open, so you may remember what a rival took.</p></div></div>` | KEEP |  |  |
| `scripts/print-update.ts:337` | Guidebook: A day in five beats | `<div class="beat"><b>3</b><div><h3>Stocking</h3>` | KEEP |  |  |
| `scripts/print-update.ts:339` | Guidebook: A day in five beats | `<li><b>The crowd arrives.</b> Turn today's walk-ins face up. The row is always in this order, left to right: a standing order collected today, the regular, the walk-ins in the order they were drawn, then a guest. The row never holds more than five cards: a guest, or a standing order, takes the place of the last walk-in.</li>` | KEEP |  |  |
| `scripts/print-update.ts:340` | Guidebook: A day in five beats | `<li><b>Fill your crate.</b> Behind your shutter, slide each piece you want to sell today straight up, from the shelf row into the crate box above it. Any freshness may go in; green fruit may not. Pieces left on the shelf cannot be sold today, and they still get older tonight.</li>` | KEEP |  |  |
| `scripts/print-update.ts:341` | Guidebook: A day in five beats | `<li><b>Say how many.</b> When everyone is ready, each stall says how many pieces are in its crate, and nothing else. Which fruit, and how fresh, stays secret until the bell.</li>` | KEEP |  |  |
| `scripts/print-update.ts:343` | Guidebook: A day in five beats | `<p>You may not ask what is behind a shutter, and nobody has to tell you.</p></div></div>` | KEEP |  |  |
| `scripts/print-update.ts:344` | Guidebook: A day in five beats | `<div class="beat"><b>4</b><div><h3>The bell</h3>` | KEEP |  |  |
| `scripts/print-update.ts:345` | Guidebook: A day in five beats | `<p>Write one price on the tag of each fruit you have in your crate, and lay the tag face down. One price covers every piece of that fruit. There is no lowest price. When everyone is ready, flip all tags together and lay each one on its fruit on your counter. Then every crate comes out: move your crate pieces from behind the shutter onto your counter, each into the box with the same letter and place. Your shelf stays behind the shutter. Play Favoured Trade now if you want it.</p>` | KEEP |  |  |
| `scripts/print-update.ts:346` | Guidebook: A day in five beats | `<p>Your price decides which of your pieces can sell to a customer. Take the customer's top price for today (the price on the card, plus or minus any event, plus $1 on the last day): priced <b>at the top price</b>, only a Fresh piece sells; <b>$1 under</b>, a Fresh or Okay piece sells; <b>$2 under, or less</b>, any piece sells; <b>over the top price</b>, nothing sells to that customer. The customer must also accept the freshness: a Premium customer never takes Okay or Soft fruit, however cheap.</p></div></div>` | KEEP |  |  |
| `scripts/print-update.ts:347` | Guidebook: A day in five beats | `<div class="beat"><b>5</b><div><h3>The rush</h3>` | KEEP |  |  |
| `scripts/print-update.ts:348` | Guidebook: A day in five beats | `<p>Serve the customers one at a time, left to right. The stall that bought last this morning is the crier: they read each customer aloud. For each fruit on the card:</p>` | KEEP |  |  |
| `scripts/print-update.ts:350` | Guidebook: A day in five beats | `<li>The customer buys from the cheapest stall that has a piece they will take at that price.</li>` | KEEP |  |  |
| `scripts/print-update.ts:351` | Guidebook: A day in five beats | `<li>That stall hands over the oldest piece on its counter that is fresh enough for its price, puts it on one of the card's circles, and adds its own posted price to its cash track.</li>` | KEEP |  |  |
| `scripts/print-update.ts:352` | Guidebook: A day in five beats | `<li>If the customer still wants more, they carry on with the same stall, and then spill to the next cheapest stall, until the circles are full or nobody else can sell.</li>` | KEEP |  |  |
| `scripts/print-update.ts:354` | Guidebook: A day in five beats | `<p><b>Tied prices</b> are broken in this order: a stall that played Favoured Trade; then the stall whose piece is younger; then Rosa the Haggler; then whoever bought earlier this morning.</p>` | KEEP |  |  |
| `scripts/print-update.ts:355` | Guidebook: A day in five beats | `<p><b>Serving alone.</b> The first stall to sell to a customer puts one of its chips on the card. If a second stall sells to the same customer, the chip comes off. When the whole order is filled and a chip is still there, that stall served the customer alone: it draws a favour card (one a day at most, and never past a hand of three).</p>` | KEEP |  |  |
| `scripts/print-update.ts:356` | Guidebook: A day in five beats | `<p><b>After the last customer.</b> Every customer leaves, served or not. Put any unsold counter pieces back behind the shutter, each in the same box of the shelf row, and wipe your tags.</p></div></div>` | KEEP |  |  |
| `scripts/print-update.ts:358` | Guidebook: A day in five beats | `<h3>Evening and night</h3>` | KEEP |  |  |
| `scripts/print-update.ts:359` | Guidebook: A day in five beats | `<p><b>Evening.</b> In buying order, each stall may play evening favours (Priority, Gossip). On the evening after a Market Day (days 3, 6, 9 and 12) each stall may also build <b>one upgrade</b> from the five piles: pay its cost and take the card. A stall has room for ${MAX_UPGRADES}. Pak Din lays the Shade Cloth marker on one fruit lane of his sheet. Farah peeks at one of tomorrow's walk-ins.</p>` | CORRECTNESS | Needs a decision or a code fix (no wording change fixes it) | TIMING DISAGREES WITH THE APP AND WITH RULES.md: here Farah peeks in the evening; RULES.md (Playing on a table, Sharp Ears) and the app have her look when buying ends. Parked item "Sharp Ears timing". No change proposed until the owner decides. |
| `scripts/print-update.ts:360` | Guidebook: A day in five beats | `<p><b>Night.</b> On the board, and behind every shutter, every piece slides one box to the left. Pieces that slide out of a Soft box go back to the supply. Tomorrow's row moves up to become today's. Then pass the first-player token one seat clockwise and move the day marker on.</p>` | KEEP |  |  |
| `scripts/print-update.ts:362` | Guidebook: Market Days, Closing Day and the end | `<h2>Market Days, Closing Day and the end</h2>` | KEEP |  |  |
| `scripts/print-update.ts:363` | Guidebook: Market Days, Closing Day and the end | `<p><b>Market Days</b> are days 3, 6, 9 and 12, but never the last day. They bring a standing order in the morning and an upgrade that evening. The lorry still comes. <b>Closing Day</b> is the last day. Every customer pays $1 more. After the rush, the jam maker buys every ripe piece left on every stall for $1 each. Green fruit is worth nothing. <b>The winner</b> is the stall with the most cash. Upgrades are worth nothing. If stalls tie, the one that sold more fruit wins.</p>` | KEEP |  |  |
| `scripts/print-update.ts:365` | Guidebook: Standing orders | `<h2>Standing orders</h2>` | KEEP |  |  |
| `scripts/print-update.ts:366` | Guidebook: Standing orders | `<p>A standing order is one big public order. It is turned over on a Market Day morning and collected two days later. It wants one fruit, Fresh or Okay: 3 pieces at 2 or 3 stalls, 4 at 4 stalls, 5 at 5 or 6. Do not turn one over if its due day would be after the last day.</p>` | KEEP |  |  |
| `scripts/print-update.ts:368` | Guidebook: Standing orders | `<li><b>Bid, in the open.</b> Before anyone buys, each stall decides. To bid, write on a price tag the price per piece you would fill the order for (from $1 up to the price on the card) and lay it face down in front of your shutter. To pass, say "pass". Everyone can see who is bidding and who has passed; nobody sees a price. <b>You may change your mind</b> (swap your tag, take it back, or put one down after passing) for as long as any stall is still deciding. When the last stall decides, flip all tags together. The lowest bid wins. A tie goes to a stall with an Order Book, then to the stall that buys earlier today. The winner puts one of its chips on the card. If everyone passes, discard the card.</li>` | KEEP |  |  |
| `scripts/print-update.ts:369` | Guidebook: Standing orders | `<li><b>Get ready.</b> The winner has three buying turns (today, tomorrow and the due day) to have the pieces on its shelf.</li>` | KEEP |  |  |
| `scripts/print-update.ts:370` | Guidebook: Standing orders | `<li><b>Collect.</b> On the due day the card stands at the front of the row and is served first, from the crates. It takes the winner's Fresh or Okay pieces first, freshest first, and pays the winner its bid for each. If it still wants more, it buys the freshest pieces rivals have put out, and pays them <b>$1 less than the winning bid</b> (never less than $1).</li>` | KEEP |  |  |
| `scripts/print-update.ts:371` | Guidebook: Standing orders | `<li><b>Fine.</b> The winner pays the card's fine for every piece it did not supply itself, never more than its cash. An Order Book halves the fine.</li>` | KEEP |  |  |
| `scripts/print-update.ts:373` | Guidebook: Standing orders | `<table><tr><th>Orders</th><th>Fruit</th><th>Highest bid allowed</th><th>Fine a piece</th></tr>${orderRows}</table>` | KEEP |  |  |
| `scripts/print-update.ts:374` | Guidebook: Standing orders | `<p>A standing order draws no favour card and pays no tips, and no event or Closing Day changes what it pays. It is not used in the Basic game.</p>` | KEEP |  |  |
| `scripts/print-update.ts:376` | Guidebook: Guests | `<h2>Guests</h2>` | KEEP |  |  |
| `scripts/print-update.ts:377` | Guidebook: Guests | `<p>Five events bring a guest card. The guest joins the end of today's row and is served like any other customer. A guest's price is fixed: the event's own price change is not added to it. Only Closing Day adds its $1.</p>` | KEEP |  |  |
| `scripts/print-update.ts:378` | Guidebook: Guests | `<table><tr><th>Guest</th><th>Event</th><th>Wants</th></tr>${guests}</table>` | KEEP |  |  |
| `scripts/print-update.ts:380` | Guidebook: How many walk-ins | `<h2>How many walk-ins</h2>` | KEEP |  |  |
| `scripts/print-update.ts:381` | Guidebook: How many walk-ins | `<table><tr><th>Stalls</th><th>Regular + walk-ins</th><th>Festival</th><th>Tourist Bus</th><th>Monsoon Downpour</th></tr>` | KEEP |  |  |
| `scripts/print-update.ts:383` | Guidebook: How many walk-ins | `<tr><td>4</td><td>1 + 3</td><td>+1 (row full)</td><td>+1 (row full)</td><td>−2</td></tr><tr><td>5</td><td>1 + 4</td><td>row full</td><td>row full</td><td>−2</td></tr>` | KEEP |  |  |
| `scripts/print-update.ts:384` | Guidebook: How many walk-ins | `<tr><td>6</td><td>1 + 4, each wanting 1 more</td><td>row full</td><td>row full</td><td>−2</td></tr></table>` | KEEP |  |  |
| `scripts/print-update.ts:385` | Guidebook: How many walk-ins | `<p class="tiny">Never more than four walk-ins, and never fewer than none. An event changes today's row only, on its own morning.</p>` | KEEP |  |  |
| `scripts/print-update.ts:387` | Guidebook: Event cards | `<h2>Event cards (${EVENT_CARDS.length})</h2>` | KEEP |  |  |
| `scripts/print-update.ts:388` | Guidebook: Event cards | `<table><tr><th>Event</th><th>What it does today</th></tr>${evRows}</table>` | KEEP |  |  |
| `scripts/print-update.ts:389` | Guidebook: Event cards | `<p class="tiny">"Customers pay $1 more" raises every customer's top price. A Heatwave night slides every piece two boxes. After a Monsoon Downpour nothing slides at all. The Health Inspector charges for the Soft pieces on your sheet before anyone buys: count them yourself, behind your shutter, and pay.</p>` | KEEP |  |  |
| `scripts/print-update.ts:391` | Guidebook: Favour cards | `<h2>Favour cards</h2>` | KEEP |  |  |
| `scripts/print-update.ts:392` | Guidebook: Favour cards | `<p>You earn a favour by serving a customer's whole remaining order by yourself. Keep favours face down in front of you, so everyone can count them. Hold up to 3. A played card goes to a discard pile; shuffle the pile into a new deck when the deck runs out.</p>` | KEEP |  |  |
| `scripts/print-update.ts:393` | Guidebook: Favour cards | `<table><tr><th>Favour</th><th>When</th><th>Effect</th></tr>${favRows}</table>` | KEEP |  |  |
| `scripts/print-update.ts:395` | Guidebook: Stall upgrades | `<h2>Stall upgrades</h2>` | KEEP |  |  |
| `scripts/print-update.ts:396` | Guidebook: Stall upgrades | `<p>All five are on offer on the evening after each Market Day. Build one that evening at most. You can build each upgrade once, and a stall has room for ${MAX_UPGRADES}.</p>` | KEEP |  |  |
| `scripts/print-update.ts:397` | Guidebook: Stall upgrades | `<table><tr><th>Upgrade</th><th>Cost</th><th>Effect</th></tr>${upRows}</table>` | KEEP |  |  |
| `scripts/print-update.ts:399` | Guidebook: Shopkeepers | `<h2>Shopkeepers</h2>` | KEEP |  |  |
| `scripts/print-update.ts:400` | Guidebook: Shopkeepers | `<p>No two stalls can be the same shopkeeper. Everyone can see your perk.</p>` | KEEP |  |  |
| `scripts/print-update.ts:401` | Guidebook: Shopkeepers | `<table><tr><th>Shopkeeper</th><th>Perk</th><th>Effect</th></tr>${shopRows}</table>` | KEEP |  |  |
| `scripts/print-update.ts:403` | Guidebook: Small print | `<h2>Small print</h2>` | KEEP |  |  |
| `scripts/print-update.ts:404` | Guidebook: Small print | `<h3>When a deck runs out</h3>` | KEEP |  |  |
| `scripts/print-update.ts:405` | Guidebook: Small print | `<p><b>Customers.</b> Shuffle every customer card that is not on the table into a new deck. <b>Favours.</b> Shuffle the discard pile into a new deck; cards in hands stay there. <b>Events and lorries.</b> Shuffle all 20 again. <b>Fruit pieces.</b> If a pile ever runs out, use any stand-in.</p>` | KEEP |  |  |
| `scripts/print-update.ts:406` | Guidebook: Small print | `<h3>Reminders people ask about</h3>` | KEEP |  |  |
| `scripts/print-update.ts:408` | Guidebook: Small print | `<li>The lorry comes every day, Market Days included, unless an event says otherwise.</li>` | KEEP |  |  |
| `scripts/print-update.ts:409` | Guidebook: Small print | `<li>Only pieces in your crate can sell. Fruit on your shelf is safe from customers, but not from the night.</li>` | REWRITE | `<li>Only pieces in your crate can sell. Pieces on your shelf do not sell, and they still age tonight.</li>` | Flourish. |
| `scripts/print-update.ts:410` | Guidebook: Small print | `<li>You are paid your own posted price, not the customer's top price.</li>` | KEEP |  |  |
| `scripts/print-update.ts:411` | Guidebook: Small print | `<li>You always hand over your oldest piece that is fresh enough for your price. You do not choose.</li>` | KEEP |  |  |
| `scripts/print-update.ts:412` | Guidebook: Small print | `<li>A standing order takes rivals' crate pieces whether they like it or not, at $1 under the winning bid.</li>` | KEEP |  |  |
| `scripts/print-update.ts:413` | Guidebook: Small print | `<li>Pasar Malam: after the last customer, the night hawker buys 1 of each fruit still in each stall's crate for $3, oldest piece first, any freshness.</li>` | KEEP |  |  |
| `scripts/print-update.ts:414` | Guidebook: Small print | `<li>The Health Inspector never comes on the last day. If that card is drawn then, draw another.</li>` | KEEP |  |  |
| `scripts/print-update.ts:415` | Guidebook: Small print | `<li>Scout: turn one face-down walk-in up for yourself only, look, and turn it back. Say aloud that you played it.</li>` | KEEP |  |  |
| `scripts/print-update.ts:417` | Guidebook: Small print | `<h3>Other ways to play</h3>` | KEEP |  |  |
| `scripts/print-update.ts:418` | Guidebook: Small print | `<table><tr><th>Option</th><th>What changes</th></tr>` | KEEP |  |  |
| `scripts/print-update.ts:419` | Guidebook: Small print | `<tr><td><b>Basic game</b></td><td>No shopkeepers, favours, upgrades or standing orders: just buying, stocking and the bell. Good for a first game.</td></tr>` | KEEP |  |  |
| `scripts/print-update.ts:420` | Guidebook: Small print | `<tr><td><b>Fixed prices (beginner)</b></td><td>Ignore the prices on the cards. Every customer pays the same top price for a Fresh piece: blueberry $5, watermelon $7, apple $6, mango $11. Generous customers pay $2 more: numbers 6, 19 and 27.</td></tr>` | KEEP |  |  |
| `scripts/print-update.ts:421` | Guidebook: Small print | `<tr><td><b>No Market Days, or no Closing Day</b></td><td>Either can be switched off before you start.</td></tr></table>` | KEEP |  |  |
| `scripts/print-update.ts:422` | Guidebook: Small print | `<p class="oneline"><b>The day on one line.</b> Morning: event, lorry, tomorrow's lorry and tomorrow's customers, standing-order bids on a Market Day · Buying: poorest first, up to 4 · Stocking: fill the crate behind the shutter, say how many · The bell: one tag per fruit, flip together, crates out onto the counters · The rush: cheapest stall first, oldest fresh-enough piece, served-alone chips · Evening: favours, upgrades · Night: everything slides one box left.</p>` | KEEP |  |  |
| `scripts/print-update.ts:423` | Guidebook: Small print | `<p class="tiny">These tabletop rules are rules version ${RULES_VERSION}, the same rules the Fruit Market app plays by. The table pieces (the three-panel board, the crate row above the shelf, the cash track on the counter, the shutter and price tags) are how those rules are run by hand.</p>` | KEEP |  |  |
| `scripts/print-update.ts:265` | Guidebook: words added by the generator | `` ` Blueberry ${money(e.maxPrice.blueberry)}, watermelon ${money(e.maxPrice.watermelon)}, apple ${money(e.maxPrice.apple)}, mango ${money(e.maxPrice.mango)}.` `` | KEEP |  |  |
| `scripts/print-update.ts:266` | Guidebook: words added by the generator | `<b>The ${esc(e.extra!.name)}</b>` | KEEP |  |  |
| `scripts/print-update.ts:267` | Guidebook: words added by the generator | `{ evening: 'Evening', buy: 'Your buying turn', bid: 'At the bell' }` | KEEP |  |  |
| `scripts/print-update.ts:449` | Guidebook: words added by the generator | `FRUIT MARKET · RULES GUIDEBOOK · RULES VERSION ${RULES_VERSION} · ` | KEEP |  |  |
| `scripts/print-update.ts:273` | Name of the PDF as a viewer shows it | `<title>Fruit Market rules guidebook</title>` | KEEP |  |  |
| `scripts/print-update.ts:194` | Name of the PDF as a viewer shows it | `<title>Fruit Market update pack: boards</title>` | KEEP |  |  |
| `scripts/print-update.ts:234` | Name of the PDF as a viewer shows it | `<title>Fruit Market update pack: standing-order cards</title>` | KEEP |  |  |

## Print only · card faces and player aid in the older print kit (scripts/print-deck.ts)

This script prints the customer, guest, shopkeeper, event, favour, lorry and upgrade cards from the game data, plus fixed labels. STATE.md records it as still at rules version 13. It stamps today's rules version on its pages while its player aid still describes waiting customers, shown crates and extra walk-ins on Market Days, all removed since. Lower priority unless this kit is reprinted.

| File:line | Where shown | Current text | Verdict | Proposed | Reason |
|---|---|---|---|---|---|
| `scripts/print-deck.ts:292` | Guest card back | `backShell('pk-back-guest', 'Special guest', 'Comes with<br>its event')` | REWRITE | `backShell('pk-back-guest', 'Guest', 'Comes with<br>its event')` | Guest, as in the rules. |
| `scripts/print-deck.ts:298` | Shopkeeper card back: line under the game name | `<small class="x-ss-tag">Fresh fruit · Fair prices</small>` | CUT | **cut** | Shop-sign slogan (three words starting with F). Says nothing about the game. |
| `scripts/print-deck.ts:299` | Shopkeeper card back | `<small>The</small><b>Shopkeeper</b>` | KEEP |  |  |
| `scripts/print-deck.ts:300` | Shopkeeper card back | `<b>Pick one</b><p>No two stalls can be the same shopkeeper.</p>` | KEEP |  |  |
| `scripts/print-deck.ts:310` | Favour card front: when to play it | `evening: { small: 'Play in the', big: 'Evening' }` | KEEP |  |  |
| `scripts/print-deck.ts:311` | Favour card front: when to play it | `buy: { small: 'Play on your', big: 'Buying<br>turn' }` | KEEP |  |  |
| `scripts/print-deck.ts:312` | Favour card front: when to play it (Favoured Trade) | `bid: { small: 'Play while', big: 'Pricing' }` | REWRITE | `bid: { small: 'Play at', big: 'The bell' }` | "Pricing" is not a named step; the guidebook says "At the bell". |
| `scripts/print-deck.ts:322` | Favour card front: top strip | `<span class="pk-kick">Favour</span><em>A secret reward</em>` | KEEP |  |  |
| `scripts/print-deck.ts:324` | Favour card front: foot | `Hold up to ${FAVOUR_HAND_LIMIT} · then discard` | CORRECTNESS | `Hold up to ${FAVOUR_HAND_LIMIT} · discard when played` | AMBIGUOUS: reads as "discard down to 3". The rule is that a full hand draws nothing, and a played card goes to the discard pile. |
| `scripts/print-deck.ts:328` | Favour card back | `backShell('pk-back-favour', 'Favour', 'A secret<br>reward')` | KEEP |  |  |
| `scripts/print-deck.ts:344` | Lorry card front: small heading | `<small>Delivery · The farmer’s lorry</small>` | REWRITE | `<small>Lorry</small>` | Three names for one card in one line. |
| `scripts/print-deck.ts:335` | Lorry card front: row label | `${n} stalls</div>` | KEEP |  |  |
| `scripts/print-deck.ts:340` | Lorry card front: note | `` `<b>${FRUIT[c.unripe].plural} arrive green:</b> they ripen on the shelf in ${FRUIT[c.unripe].unripeSlots} nights.` `` | KEEP |  |  |
| `scripts/print-deck.ts:341` | Lorry card front: note meant for the Seconds Lorry | `'Everything arrives <b>Okay</b>: into each fruit’s freshest Okay space, at Okay prices.'` | CORRECTNESS | Needs a decision or a code fix (no wording change fixes it) | NEVER PRINTED: since every lorry brings Green mangoes, the line above always wins, so the printed Seconds Lorry card does not state its own rule. Needs a code change (print both notes on that card). |
| `scripts/print-deck.ts:342` | Lorry card front: note for a lorry with no Green fruit (no such lorry since rules version 14) | `'Everything on this lorry arrives <b>ripe and fresh</b>.'` | UNUSED | (none) | Cannot be printed any more. |
| `scripts/print-deck.ts:345` | Lorry card front: foot | `<p class="pk-foot">Use the row for your number of stalls</p>` | KEEP |  |  |
| `scripts/print-deck.ts:349` | Lorry card back | `backShell('pk-back-lorry', 'Delivery',` | REWRITE | `backShell('pk-back-lorry', 'Lorry',` | Lorry, as on the front and in the rules. |
| `scripts/print-deck.ts:352` | Upgrade card | `<span class="pk-kick">Stall upgrade</span>` | KEEP |  |  |
| `scripts/print-deck.ts:353` | Upgrade card | `<small>to build</small>` | KEEP |  |  |
| `scripts/print-deck.ts:354` | Upgrade card | `<i>Build one, the evening after a Market Day</i>` | KEEP |  |  |
| `scripts/print-deck.ts:357` | Upgrade card | `` backShell('pk-back-upgrade', 'Stall upgrade', `Days ${list(MARKET_DAYS)}`) `` | KEEP |  |  |
| `scripts/print-deck.ts:420` | Character reference page: legend | `<b>${PREF_INFO[p].title} shopper:</b>` | REWRITE | `<b>${PREF_INFO[p].title} customer:</b>` | Customer, not shopper. |
| `scripts/print-deck.ts:465` | Player aid: strip under the title | `<span>Player aid · Morning edition</span>` | REWRITE | `<span>Player aid</span>` | Newspaper dressing. |
| `scripts/print-deck.ts:466` | Player aid: heading | `<strong>A day in five beats</strong><em>Buy it, show it, price it, sell it, before it spoils.</em>` | CORRECTNESS | `<strong>A day in five steps</strong>` | OUT OF DATE AND A SLOGAN: "show it" described open crates, which rules version 15 made secret. |
| `scripts/print-deck.ts:450` | Player aid: step 1, Morning | `'Turn over today’s <b>event</b> and apply it (walk-in events add or remove walk-ins now). The lorry unloads today’s card at the freshest spot (green fruit at the unripe spot, the Seconds Lorry at Okay). Draw tomorrow’s card.'` | CORRECTNESS | `'Turn over today’s <b>event</b> and apply it (walk-in events add or remove walk-ins now). The lorry unloads today’s card at the freshest spot (Green fruit at the Green spot, the Seconds Lorry at Okay). Draw tomorrow’s lorry, tomorrow’s regular (face up) and tomorrow’s walk-ins (face down). On a Market Day, bid for the standing order.'` | OUT OF DATE: tomorrow's customers are drawn in the morning (rules version 16) and standing orders are bid for on Market Day mornings (rules version 14). |
| `scripts/print-deck.ts:452` | Player aid: step 3, Stocking | `'Customers arrive: waiting, the regular, then the walk-ins (face up now). Secretly move the fruit you will sell into your <b>crate</b>; then show all crates. Only crate fruit sells.'` | CORRECTNESS | `'Today’s walk-ins turn face up. Secretly move the pieces you will sell into your <b>crate</b>. Then say how many pieces are in it, not which fruit. Only pieces in your crate can sell.'` | OUT OF DATE: nobody waits overnight (rules version 14), and crates are not shown before the bell, only counted (rules version 15). |
| `scripts/print-deck.ts:453` | Player aid: step 4, The bell | `'Secretly set <b>one price per fruit</b> you put out, then everyone reveals together. No lower limit.'` | CORRECTNESS | `'Secretly set <b>one price per fruit</b> in your crate. Then everyone shows prices and crates together. No lower limit.'` | OUT OF DATE: crates open at the bell too (rules version 15). |
| `scripts/print-deck.ts:454` | Player aid: step 5, The rush | `'Waiting customers first, then new ones. Each fruit goes to the <b>cheapest stall</b> with fruit fresh enough for its price; leftover demand spills to the next stall. Serve a customer’s whole remaining order by yourself and <b>draw a favour card</b> (one a day at most).'` | CORRECTNESS | `'A standing order collected today goes first, then the row left to right. Each fruit goes to the <b>cheapest stall</b> with fruit fresh enough for its price; what is still wanted goes to the next stall. Serve a customer’s whole remaining order by yourself and <b>draw a favour card</b> (one a day at most).'` | OUT OF DATE: there are no waiting customers (rules version 14). |
| `scripts/print-deck.ts:461` | Player aid: price ladder | `<b>Any fruit</b> (fresh, okay or tired)` | CORRECTNESS | `<b>Any fruit</b> (Fresh, Okay or Soft)` | OLD WORD: "tired" became Soft in rules version 14. |
| `scripts/print-deck.ts:475` | Player aid: Market rhythm box | `1 more walk-in per 3 stalls.` | CORRECTNESS | `a standing order in the morning and an upgrade that evening.` | OUT OF DATE: a Market Day no longer adds walk-ins (rules version 14). |
| `scripts/print-deck.ts:468` | Player aid | `<b>The crier’s price rule</b><span>Read each customer line aloud</span>` | KEEP |  |  |
| `scripts/print-deck.ts:473` | Player aid | `<h4>Freshness types</h4>` | KEEP |  |  |
| `scripts/print-deck.ts:474` | Player aid | `<h4>Ties at the bell</h4><p>Favoured Trade, then fresher fruit (the younger handed-over piece), then the Haggler, then whoever bought earlier today.</p>` | KEEP |  |  |
| `scripts/print-deck.ts:476` | Player aid | `<p class="pk-small">Full rules: RULES.md. Every number on this page comes from the game data.</p>` | KEEP |  |  |
| `scripts/print-deck.ts:376` | Print kit: sheet margins and cover | `Print at 100% (actual size) on A4 card · double-sided, flip on the long edge` | KEEP |  |  |
| `scripts/print-deck.ts:377` | Print kit: sheet margins and cover | `Fruit Market · rules ${RULES_VERSION} · 63 × 88 mm` | KEEP |  |  |
| `scripts/print-deck.ts:392` | Print kit: sheet margins and cover | `'Cut on the dashed lines. The backs are on the next page.'` | KEEP |  |  |
| `scripts/print-deck.ts:393` | Print kit: sheet margins and cover | `'Backs, mirrored left to right to line up with the fronts on the page before.'` | KEEP |  |  |
| `scripts/print-deck.ts:516` | Print kit: sheet margins and cover | `<h1>Fruit Market<br>Print Kit</h1>` | KEEP |  |  |

## Lower priority · spoken labels (aria-label) and tooltips (title)

Read aloud by a screen reader, or shown when a mouse hovers. A phone player who can see the screen never meets them. They were read for wrong facts and for the same word choices as the visible text; rows are KEEP unless they use a word the glossary retires. Found automatically, so the "current" column is the whole attribute.

| File:line | Where shown | Current text | Verdict | Proposed | Reason |
|---|---|---|---|---|---|
| `src/ui/App.tsx:275` | Spoken label (App.tsx) | `aria-label="Your name"` | KEEP |  |  |
| `src/ui/App.tsx:284` | Spoken label (App.tsx) | `` aria-label={`Stall ${i + 2}: ${st.kind === 'human' ? `friend, ${seatName(i)}` : `computer, ${LEVEL_WORD[st.level]}`}. Change`} `` | KEEP |  |  |
| `src/ui/App.tsx:304` | Spoken label (App.tsx) | `` aria-label={`Name for stall ${i + 2}`} `` | KEEP |  |  |
| `src/ui/CharacterPick.tsx:51` | Spoken label (CharacterPick.tsx) | `aria-label="Choose your shopkeeper"` | KEEP |  |  |
| `src/ui/CharacterPick.tsx:72` | Spoken label (CharacterPick.tsx) | `aria-label="Previous shopkeeper"` | KEEP |  |  |
| `src/ui/CharacterPick.tsx:76` | Spoken label (CharacterPick.tsx) | `aria-label="Next shopkeeper"` | KEEP |  |  |
| `src/ui/FullScreenButton.tsx:33` | Spoken label (FullScreenButton.tsx) | `aria-label="Full screen on iPhone"` | KEEP |  |  |
| `src/ui/FullScreenButton.tsx:68` | Spoken label (FullScreenButton.tsx) | `aria-label="Play full screen?"` | KEEP |  |  |
| `src/ui/Game.tsx:167` | Spoken label (Game.tsx) | `aria-label="Your rivals"` | KEEP |  |  |
| `src/ui/Home.tsx:121` | Spoken label (Home.tsx) | `aria-label={title}` | KEEP |  |  |
| `src/ui/Home.tsx:122` | Spoken label (Home.tsx) | `aria-label="Close"` | KEEP |  |  |
| `src/ui/Home.tsx:167` | Spoken label (Home.tsx) | `aria-label="Today's leaderboard"` | KEEP |  |  |
| `src/ui/HowTo.tsx:37` | Spoken label (HowTo.tsx) | `aria-label="green"` | KEEP |  |  |
| `src/ui/HowTo.tsx:151` | Spoken label (HowTo.tsx) | `aria-label="Close"` | KEEP |  |  |
| `src/ui/Online.tsx:44` | Spoken label (Online.tsx) | `aria-label="Your name"` | KEEP |  |  |
| `src/ui/Online.tsx:164` | Spoken label (Online.tsx) | `aria-label="Back"` | KEEP |  |  |
| `src/ui/Online.tsx:211` | Spoken label (Online.tsx) | `aria-label="Room code"` | KEEP |  |  |
| `src/ui/Online.tsx:228` | Tooltip (Online.tsx) | `title={x.connected ? 'Online' : 'Offline'}` | KEEP |  |  |
| `src/ui/Wardrobe.tsx:24` | Tooltip (Wardrobe.tsx) | `` title={owned ? look.title : `Locked. ${ach?.title}: ${ach?.text}`} `` | KEEP |  |  |
| `src/ui/Wardrobe.tsx:43` | Spoken label (Wardrobe.tsx) | `aria-label="Back"` | KEEP |  |  |
| `src/ui/cards.tsx:37` | Spoken label (cards.tsx) | `` aria-label={alt ? `${alt}: art coming` : 'Art coming'} `` | KEEP |  |  |
| `src/ui/cards.tsx:99` | Spoken label (cards.tsx) | `` aria-label={`A customer, face down${fruits.length ? `. Wants ${wanted}` : ''}`} `` | KEEP |  |  |
| `src/ui/cards.tsx:148` | Spoken label (cards.tsx) | `aria-label="Event card back"` | KEEP |  |  |
| `src/ui/fruitIcons.tsx:121` | Spoken label (fruitIcons.tsx) | `aria-label={label \|\| undefined}` | KEEP |  |  |
| `src/ui/game/panels/ActionBar.tsx:21` | Spoken label (ActionBar.tsx) | `aria-label="Undo purchases"` | KEEP |  |  |
| `src/ui/game/panels/MorningCard.tsx:99` | Spoken label (MorningCard.tsx) | `` aria-label={`Most a stall may charge today: ${LANES.map((f) => `${FRUIT[f].plural} $${s.event!.maxPrice![f]}`).join(', ')}`} `` | KEEP |  |  |
| `src/ui/game/panels/MorningCard.tsx:112` | Spoken label (MorningCard.tsx) | `` aria-label={`Today's delivery: ${unloaded.map((x) => `${x.n} ${FRUIT[x.f].plural.toLowerCase()}${x.green ? ' (green)' : ''}`).join(', ')}`} `` | KEEP |  |  |
| `src/ui/game/panels/NightShift.tsx:15` | Spoken label (NightShift.tsx) | `` aria-label={`${label} ${FRUIT[f].plural.toLowerCase()}: ${track.map((n, pos) => (n ? `${n} ${STAGE_WORD[stageAt(f, pos)]}` : '')).filter(Boolean).join(', ') \|\| 'none'}`} `` | KEEP |  |  |
| `src/ui/game/panels/NightShift.tsx:60` | Spoken label (NightShift.tsx) | `` aria-label={`Spoiled on your shelf tonight: ${spoiled.map((x) => `${x.n} ${FRUIT[x.f].plural.toLowerCase()}`).join(', ')}`} `` | KEEP |  |  |
| `src/ui/game/panels/OrderPanel.tsx:17` | Spoken label (OrderPanel.tsx) | `aria-label="Who is bidding"` | KEEP |  |  |
| `src/ui/game/panels/OrderPanel.tsx:60` | Spoken label (OrderPanel.tsx) | `aria-label="Your secret bid per piece"` | KEEP |  |  |
| `src/ui/game/panels/OrderPanel.tsx:61` | Spoken label (OrderPanel.tsx) | `aria-label="Bid $1 less"` | KEEP |  |  |
| `src/ui/game/panels/OrderPanel.tsx:63` | Spoken label (OrderPanel.tsx) | `aria-label="Bid $1 more"` | KEEP |  |  |
| `src/ui/game/panels/OrderPanel.tsx:87` | Tooltip (OrderPanel.tsx) | `title={bids}` | KEEP |  |  |
| `src/ui/game/panels/OrderPanel.tsx:88` | Spoken label (OrderPanel.tsx) | `` aria-label={`Standing order: ${card.title} wants ${pieces(o.qty, o.fruit)} ${due}. ${holder ? `${o.holder === viewer ? 'You deliver' : `${holder.name} delivers`} at $${o.price} a piece.` : `Bids up to $${o.ceiling} a piece.`}`} `` | KEEP |  |  |
| `src/ui/game/panels/Popovers.tsx:18` | Spoken label (Popovers.tsx) | `aria-label="Today and tomorrow"` | KEEP |  |  |
| `src/ui/game/panels/Popovers.tsx:66` | Spoken label (Popovers.tsx) | `aria-label={lookOf(tip.name).title}` | KEEP |  |  |
| `src/ui/game/panels/Popovers.tsx:71` | Spoken label (Popovers.tsx) | `aria-label="Price by freshness"` | KEEP |  |  |
| `src/ui/game/panels/PricingTable.tsx:22` | Spoken label (PricingTable.tsx) | `aria-label="Every rival's crate, shut until the bell: only how many pieces each put out"` | REWRITE | `aria-label="Every rival's crate, shut until the bell: only how many pieces are in each"` | Crate, not "put out". |
| `src/ui/game/panels/PricingTable.tsx:30` | Spoken label (PricingTable.tsx) | `aria-label={label}` | KEEP |  |  |
| `src/ui/game/panels/PricingTable.tsx:48` | Spoken label (PricingTable.tsx) | `aria-label="The bell: every crate is open"` | KEEP |  |  |
| `src/ui/game/panels/PricingTable.tsx:56` | Spoken label (PricingTable.tsx) | `` aria-label={`${x.me ? 'Your crate' : pl.name}: ${fruits.length ? fruits.map((f) => `${forSale(s, x.player, f)} ${FRUIT[f].plural.toLowerCase()} at $${s.bids[x.player]?.find((b) => b.fruit === f)?.price ?? '?'}`).join(', ') : 'nothing out'}`} `` | KEEP |  |  |
| `src/ui/game/panels/Results.tsx:26` | Spoken label (Results.tsx) | `aria-label="Each stall's cash at the end of each day"` | KEEP |  |  |
| `src/ui/game/panels/SalesSummary.tsx:32` | Spoken label (SalesSummary.tsx) | `aria-label="Day ledger"` | KEEP |  |  |
| `src/ui/game/panels/Showdown.tsx:84` | Spoken label (Showdown.tsx) | `aria-label={want.label}` | KEEP |  |  |
| `src/ui/game/panels/Showdown.tsx:96` | Spoken label (Showdown.tsx) | `` aria-label={open ? undefined : `${seat.me ? 'Your' : `${pl.name}'s`} price, sealed`} `` | KEEP |  |  |
| `src/ui/game/panels/TopBar.tsx:28` | Spoken label (TopBar.tsx) | `aria-label="Menu"` | KEEP |  |  |
| `src/ui/game/panels/TopBar.tsx:37` | Spoken label (TopBar.tsx) | `` aria-label={`Today: ${s.event ? s.event.title : 'a calm day'}. Tap for today's news and tomorrow's`} `` | KEEP |  |  |
| `src/ui/game/panels/TopBar.tsx:43` | Tooltip (TopBar.tsx) | `title={st.text}` | KEEP |  |  |
| `src/ui/game/panels/TopBar.tsx:43` | Spoken label (TopBar.tsx) | `` aria-label={`Rank ${st.rank} of ${st.of}. ${st.text}`} `` | KEEP |  |  |
| `src/ui/game/panels/TopBar.tsx:44` | Spoken label (TopBar.tsx) | `` aria-label={`Cash $${cash}`} `` | KEEP |  |  |
| `src/ui/game/panels/TopBar.tsx:48` | Spoken label (TopBar.tsx) | `` aria-label={`Today's beats. Now: ${PHASE[s.phase]}`} `` | REWRITE | `` aria-label={`Today's steps. Now: ${PHASE[s.phase]}`} `` | Steps, not beats. |
| `src/ui/panel.tsx:104` | Spoken label (panel.tsx) | `` aria-label={`Your crate: ${total} out`} `` | REWRITE | `` aria-label={`Your crate: ${total} in it`} `` | Crate, not "out". |
| `src/ui/panel.tsx:121` | Spoken label (panel.tsx) | `` aria-label={`${FRUIT[f].name}, ${word}: ${n} on your shelf${sell ? `, ${k} in your crate` : ''}`} `` | KEEP |  |  |
| `src/ui/panel.tsx:128` | Spoken label (panel.tsx) | `` aria-label={`One less ${word} ${FRUIT[f].name.toLowerCase()}`} `` | KEEP |  |  |
| `src/ui/panel.tsx:130` | Spoken label (panel.tsx) | `` aria-label={`One more ${word} ${FRUIT[f].name.toLowerCase()}`} `` | KEEP |  |  |
| `src/ui/panel.tsx:195` | Spoken label (panel.tsx) | `aria-label="How the bell works"` | KEEP |  |  |
| `src/ui/panel.tsx:210` | Spoken label (panel.tsx) | `` aria-label={`Price for your ${FRUIT[f].plural.toLowerCase()}`} `` | KEEP |  |  |
| `src/ui/panel.tsx:216` | Spoken label (panel.tsx) | `` aria-label={`Lower the price of ${FRUIT[f].plural}`} `` | KEEP |  |  |
| `src/ui/panel.tsx:218` | Spoken label (panel.tsx) | `` aria-label={`Raise the price of ${FRUIT[f].plural}`} `` | KEEP |  |  |
| `src/ui/panel.tsx:255` | Spoken label (panel.tsx) | `aria-label="The Bell"` | KEEP |  |  |
| `src/ui/panel.tsx:332` | Spoken label (panel.tsx) | `aria-label="Fruit to keep from ageing tonight"` | KEEP |  |  |
| `src/ui/panel.tsx:334` | Spoken label (panel.tsx) | `aria-label={FRUIT[f].plural}` | KEEP |  |  |
| `src/ui/table.tsx:75` | Spoken label (table.tsx) | `` aria-label={`${FRUIT[f].plural}: ${wantText(pz[i])} wanted today`} `` | KEEP |  |  |
| `src/ui/table.tsx:84` | Spoken label (table.tsx) | `` aria-label={`${FRUIT[f].name}, ${STAGE_WORD[stage]}, $${buyCost(s, p, f, pos)}, ${n} left`} `` | KEEP |  |  |
| `src/ui/table.tsx:94` | Spoken label (table.tsx) | `aria-label="The letters on the boxes: G is green and not ripe yet, F is fresh, O is okay, S is soft"` | KEEP |  |  |
| `src/ui/table.tsx:108` | Spoken label (table.tsx) | `` aria-label={`Tomorrow's lorry: ${lines.map((l) => `${l.n} ${FRUIT[l.f].plural}${l.green ? ' (green)' : ''}`).join(', ')}`} `` | KEEP |  |  |
| `src/ui/table.tsx:130` | Spoken label (table.tsx) | `aria-label="Prices next, after you"` | KEEP |  |  |
| `src/ui/table.tsx:131` | Spoken label (table.tsx) | `aria-label="Still deciding prices"` | KEEP |  |  |
| `src/ui/table.tsx:135` | Spoken label (table.tsx) | `aria-label="Sealed price"` | KEEP |  |  |
| `src/ui/table.tsx:179` | Spoken label (table.tsx) | `` aria-label={`${pl.name}'s stall: $${cash}${base ? `, ${base}` : ''}${said}. Tap for more`} `` | KEEP |  |  |
| `src/ui/table.tsx:200` | Spoken label (table.tsx) | `` aria-label={`${pl.name}: stall`} `` | KEEP |  |  |
| `src/ui/table.tsx:205` | Spoken label (table.tsx) | `aria-label="Close"` | KEEP |  |  |
| `src/ui/table.tsx:208` | Spoken label (table.tsx) | `` aria-label={`Today's crate: ${crate.map((f) => `${forSale(s, p, f)} ${FRUIT[f].plural.toLowerCase()}`).join(', ')}`} `` | KEEP |  |  |
| `src/ui/table.tsx:220` | Tooltip (table.tsx) | `title={TRAITS[pl.trait].text}` | KEEP |  |  |
| `src/ui/table.tsx:239` | Tooltip (table.tsx) | `` title={`${FRUIT[f].name}: ${stage === 'notso' ? 'soft' : stage}${FRUIT[f].drop[pos] ? `, customers pay $${FRUIT[f].drop[pos]} less` : ''}`} `` | KEEP |  |  |
| `src/ui/table.tsx:280` | Spoken label (table.tsx) | `aria-label="Your shelf"` | KEEP |  |  |
| `src/ui/table.tsx:287` | Tooltip (table.tsx) | `title={FAVOURS[id].text}` | KEEP |  |  |
| `src/ui/table.tsx:287` | Spoken label (table.tsx) | `` aria-label={`Favour card: ${FAVOURS[id].title}`} `` | KEEP |  |  |
| `src/ui/table.tsx:298` | Tooltip (table.tsx) | `title="Shelf space"` | KEEP |  |  |
| `src/ui/table.tsx:298` | Spoken label (table.tsx) | `` aria-label={`Shelf space: ${used} of ${cap} used`} `` | KEEP |  |  |
| `src/ui/table.tsx:301` | Tooltip (table.tsx) | `` title={`${TRAITS[pl.trait].title}: ${TRAITS[pl.trait].text}`} `` | KEEP |  |  |
| `src/ui/table.tsx:302` | Tooltip (table.tsx) | `title={UPGRADES[u].title}` | KEEP |  |  |
| `src/ui/table.tsx:309` | Spoken label (table.tsx) | `` aria-label={`${FRUIT[f].plural}: ${n ? stages.map((x) => `${x.n} ${STAGE_WORD[x.stage]}`).join(', ') : 'none'}`} `` | KEEP |  |  |
| `src/ui/table.tsx:371` | Spoken label (table.tsx) | `` aria-label={backs.length ? `Walk-in, wants ${backs.map((f) => FRUIT[f].plural).join(' and ')}` : 'Walk-in'} `` | KEEP |  |  |
| `src/ui/table.tsx:389` | Tooltip (table.tsx) | `` title={`${c.pref ? `${PREF_INFO[c.pref].title}: ${PREF_INFO[c.pref].text}\n` : ''}${c.wants.map((w, i) => `${FRUIT[w.fruit].name}: ${w.qty <= 0 ? 'done' : `wants ${w.qty}, pays up to $${lines[i].max} each when fresh`}`).join('\n')}`} `` | KEEP |  |  |
| `src/ui/table.tsx:394` | Tooltip (table.tsx) | `title="Special guest"` | REWRITE | `title="Guest"` | Guest, as in the rules. |
| `src/ui/table.tsx:395` | Tooltip (table.tsx) | `title={SEEN_WALK_IN}` | KEEP |  |  |
| `src/ui/table.tsx:398` | Spoken label (table.tsx) | `aria-label="Served"` | KEEP |  |  |
| `src/ui/table.tsx:420` | Spoken label (table.tsx) | `aria-label="Today's customers"` | KEEP |  |  |
| `src/ui/table.tsx:442` | Spoken label (table.tsx) | `` aria-label={`Tomorrow: ${lookOf(c.name).title}, wants ${c.wants.map((w) => `${w.qty} ${FRUIT[w.fruit].plural}`).join(' and ')}`} `` | KEEP |  |  |
| `src/ui/table.tsx:448` | Spoken label (table.tsx) | `aria-label="Tomorrow's customers"` | KEEP |  |  |
| `src/ui/table.tsx:455` | Spoken label (table.tsx) | `` aria-label={`Tomorrow: a walk-in, face down${fruits.length ? `, wants ${fruits.map((f) => FRUIT[f].plural).join(' and ')}` : ''}`} `` | KEEP |  |  |
| `src/ui/ticket.tsx:36` | Spoken label (ticket.tsx) | `` aria-label={`${PREF_INFO[pref].title}: ${PREF_INFO[pref].text}`} `` | KEEP |  |  |
| `src/ui/ticket.tsx:70` | Spoken label (ticket.tsx) | `` aria-label={`${x.qty} ${x.qty === 1 ? FRUIT[x.fruit].name : FRUIT[x.fruit].plural}`} `` | KEEP |  |  |
| `src/ui/ticket.tsx:87` | Spoken label (ticket.tsx) | `` aria-label={`A customer, face down${fruits.length ? `. Wants ${fruits.map((f) => FRUIT[f].name.toLowerCase()).join(', ')}` : ''}`} `` | KEEP |  |  |
| `src/ui/game/panels/TopBar.tsx:9` | Spoken label: name of the current step | `{ morning: 'Morning', order: 'The order', buy: 'Buying', stall: 'Stocking', bid: 'The bell', reveal: 'The rush', evening: 'Evening', over: 'Closed' }` | REWRITE | `{ morning: 'Morning', order: 'Bidding', buy: 'Buying', stall: 'Stocking', bid: 'The bell', reveal: 'The rush', evening: 'Evening', over: 'Closed' }` | "The order" alone is what a customer wants. |
| `scripts/print-deck.ts:319` | Printed favour card (Fridge): picture description | `'Tired apple')}<span>›</span>` | REWRITE | `'Soft apple')}<span>›</span>` | "Tired" became Soft in rules version 14. |
| `scripts/print-deck.ts:448` | Printed player aid: picture description | `s === 'notso' ? 'Tired'` | REWRITE | `s === 'notso' ? 'Soft'` | As above. |
| `src/ui/game/panels/PricingTable.tsx:27` | Spoken label: a rival crate while stocking | `` `${pl.name} ${opening ? 'is still opening' : 'has opened'}` `` | REWRITE | `` `${pl.name} ${opening ? 'is still filling its crate' : 'is ready'}` `` | Same step, same words as the visible text. |
| `src/ui/game/panels/PricingTable.tsx:28` | Spoken label: a rival crate while prices are set | `` `${pl.name}: ${n ? `${pieces(n)} out, which fruit is secret until the bell` : 'nothing out'}${x.sealed ? ', prices sealed' : ', not sealed yet'}` `` | REWRITE | `` `${pl.name}: ${n ? `${pieces(n)} in the crate, which fruit is secret until the bell` : 'empty crate'}${x.sealed ? ', prices sealed' : ', not sealed yet'}` `` | Crate, not "out". |
| `src/ui/game/panels/OrderPanel.tsx:85` | Tooltip on the standing-order strip: every bid, once the bids are shown | `` `${i === viewer ? 'You' : s.players[i].name} ${b === 'pass' \|\| b === null ? 'passed' : `$${b}`}` `` | KEEP |  |  |
| `src/ui/boardModel.ts:113` | Tooltip on the ear mark of a walk-in you have looked at | `"You've seen this walk-in's card"` | KEEP |  |  |
| `src/ui/art.tsx:94` | Wordmark (the game name as a logo) | `<b class="x-title">Fruit Market</b>` | KEEP |  |  |

## Text in the code that no screen shows

Found while tracing where each string appears. Nothing here reaches a player today, so no change is proposed; they are listed so nobody edits them by mistake, and because some would be wrong if they were ever switched back on. Not counted in the totals. Delete with the code if wanted.

| File:line | Where shown | Current text | Verdict | Proposed | Reason |
|---|---|---|---|---|---|
| `src/engine/story.ts:40` | Haggler hint for the price panel (the hint is no longer drawn) | `"you're the Haggler, who wins equally fresh ties"` | UNUSED | (none) | Not shown anywhere. |
| `src/engine/story.ts:41` | Haggler hint for the price panel (the hint is no longer drawn) | `` `${names[0]} is the Haggler, who wins equally fresh ties` `` | UNUSED | (none) | Not shown anywhere. |
| `src/engine/story.ts:41` | Haggler hint for the price panel (the hint is no longer drawn) | `` `${names.join(' and ')} are Hagglers, who win equally fresh ties` `` | UNUSED | (none) | Not shown anywhere. |
| `src/engine/story.ts:106` | Personal "why you did not sell" lines (the rush now shows one shared line for everyone, PLAN-068) | `` headline: `Too pricey! $${top} is ${cust}'s top${display ? `, ${even}` : ''}.` `` | UNUSED | (none) | Not shown anywhere. They also use "buyer" for customer. |
| `src/engine/story.ts:109` | Personal "why you did not sell" lines (the rush now shows one shared line for everyone, PLAN-068) | `` headline: `Fresh only! ${theirs[0].toUpperCase()}${theirs.slice(1)} weren't fresh.`, detail: `${cust} is a Premium buyer.` `` | UNUSED | (none) | Not shown anywhere. They also use "buyer" for customer. |
| `src/engine/story.ts:112` | Personal "why you did not sell" lines (the rush now shows one shared line for everyone, PLAN-068) | `` headline: `No soft ${plural} for ${cust}!`, detail: 'Everyday buyers take fresh or okay only.' `` | UNUSED | (none) | Not shown anywhere. They also use "buyer" for customer. |
| `src/engine/story.ts:119` | Personal "why you did not sell" lines (the rush now shows one shared line for everyone, PLAN-068) | `` headline: `Too old for $${o.price}! ${mine ? 'Your' : `${s.players[o.player].name}'s`} ${plural} didn't qualify.` `` | UNUSED | (none) | Not shown anywhere. They also use "buyer" for customer. |
| `src/engine/story.ts:116` | Personal "why you did not sell" lines (the rush now shows one shared line for everyone, PLAN-068) | `` `At $${o.price} ${sells.length === 1 ? `only ${sells[0]} sells` : `${sells.join(' or ')} sells`}${rest.length ? `; ${rest.join(', ')}` : ''}.` `` | UNUSED | (none) | Not shown anywhere. They also use "buyer" for customer. |
| `src/engine/story.ts:208` | Personal "what if you had priced lower" advice (no longer shown in the rush) | `favouredTrade: 'Favoured Trade', haggler: 'Haggler', fresher: 'fresher fruit', order: 'you bought first',` | UNUSED | (none) | Not shown anywhere. |
| `src/engine/story.ts:212` | Personal "what if you had priced lower" advice (no longer shown in the rush) | `` `${who} has Favoured Trade` `` | UNUSED | (none) | Not shown anywhere. |
| `src/engine/story.ts:213` | Personal "what if you had priced lower" advice (no longer shown in the rush) | `` `${who} is the Haggler` `` | UNUSED | (none) | Not shown anywhere. |
| `src/engine/story.ts:214` | Personal "what if you had priced lower" advice (no longer shown in the rush) | `` `${who}'s fruit was fresher` : `${who} bought first` `` | UNUSED | (none) | Not shown anywhere. |
| `src/engine/story.ts:259` | Personal "what if you had priced lower" advice (no longer shown in the rush) | `` `Your only ${fruitWord(f, 1)} sold anyway.` : `All ${crate} sold anyway.` `` | UNUSED | (none) | Not shown anywhere. |
| `src/engine/story.ts:263` | Personal "what if you had priced lower" advice (no longer shown in the rush) | `` ` Only ${unsold} went unsold anyway.` `` | UNUSED | (none) | Not shown anywhere. |
| `src/engine/story.ts:289` | Personal "what if you had priced lower" advice (no longer shown in the rush) | `` `Match $${lowest} and you win${why}: ${atTie.n} sold.${unsoldNote(unsold, atTie.n)}` `` | UNUSED | (none) | Not shown anywhere. |
| `src/engine/story.ts:292` | Personal "what if you had priced lower" advice (no longer shown in the rush) | `` `$${under.price} would've sold ${under.n}.` : lowest - 1 < floor ? `$${floor} is the floor.` : '' `` | UNUSED | (none) | Not shown anywhere. |
| `src/engine/story.ts:300` | Personal "what if you had priced lower" advice (no longer shown in the rush) | `` `A $${lowest} tie loses too: ${why}.` `` | UNUSED | (none) | Not shown anywhere. |
| `src/engine/story.ts:301` | Personal "what if you had priced lower" advice (no longer shown in the rush) | `` `A $${lowest} tie sells just ${j}: ${why}.` `` | UNUSED | (none) | Not shown anywhere. |
| `src/engine/story.ts:303` | Personal "what if you had priced lower" advice (no longer shown in the rush) | `` `Match $${lowest}: ${j} sold${under && j === under.n ? ' too' : ''}, after ${lose.map((x) => s.players[x.o.player].name).join(' and ')}.` `` | UNUSED | (none) | Not shown anywhere. |
| `src/engine/story.ts:308` | Personal "what if you had priced lower" advice (no longer shown in the rush) | `` `Ties go to fresher fruit, then ${hag ? 'the Haggler, then ' : ''}who bought first.` `` | UNUSED | (none) | Not shown anywhere. |
| `src/engine/story.ts:325` | Personal rush result lines written from "your" point of view (replaced by the shared line; still computed, never drawn) | `` `No ${FRUIT[l.fruit].plural.toLowerCase()} for ${cust}!` `` | UNUSED | (none) | Not shown anywhere. |
| `src/engine/story.ts:332` | Personal rush result lines written from "your" point of view (replaced by the shared line; still computed, never drawn) | `` allPrice ? `Too pricey for ${cust}!` : `Nothing good enough for ${cust}.`, tags `` | UNUSED | (none) | Not shown anywhere. |
| `src/engine/story.ts:336` | Personal rush result lines written from "your" point of view (replaced by the shared line; still computed, never drawn) | `` `${s.players[top.player].name} beat ${losers.map((o) => s.players[o.player].name).join(' and ')} at $${top.price}.` `` | UNUSED | (none) | Not shown anywhere. |
| `src/engine/story.ts:337` | Personal rush result lines written from "your" point of view (replaced by the shared line; still computed, never drawn) | `` `${s.players[top.player].name} sold ${top.sold} at $${top.price}.` `` | UNUSED | (none) | Not shown anywhere. |
| `src/engine/story.ts:351` | Personal rush result lines written from "your" point of view (replaced by the shared line; still computed, never drawn) | `` `${s.players[cheaper[0].player].name} went cheaper. You sold ${n} of ${mine.qty}.` `` | UNUSED | (none) | Not shown anywhere. |
| `src/engine/story.ts:352` | Personal rush result lines written from "your" point of view (replaced by the shared line; still computed, never drawn) | `` `Sold ${n} of ${mine.qty}: ${cust} wanted ${l.want}.` `` | UNUSED | (none) | Not shown anywhere. |
| `src/engine/story.ts:354` | Personal rush result lines written from "your" point of view (replaced by the shared line; still computed, never drawn) | `` `No rivals! ${n} sold at full price.` : `No rivals! ${n} sold at $${mine.price}.` `` | UNUSED | (none) | Not shown anywhere. |
| `src/engine/story.ts:355` | Personal rush result lines written from "your" point of view (replaced by the shared line; still computed, never drawn) | `` `${cust} would've paid $${l.max}.` `` | UNUSED | (none) | Not shown anywhere. |
| `src/engine/story.ts:361` | Personal rush result lines written from "your" point of view (replaced by the shared line; still computed, never drawn) | `` `Beat ${s.players[loserAtLow.player].name} by $${gap}. ${n === 1 ? 'Sold!' : `All ${n} sold!`}` `` | UNUSED | (none) | Not shown anywhere. |
| `src/engine/story.ts:363` | Personal rush result lines written from "your" point of view (replaced by the shared line; still computed, never drawn) | `` `Tie at $${mine.price}. You win: ${tieShort(s, mine, loserAtLow)}!` `` | UNUSED | (none) | Not shown anywhere. |
| `src/engine/story.ts:365` | Personal rush result lines written from "your" point of view (replaced by the shared line; still computed, never drawn) | `` `Sold ${n} at $${mine.price}!` `` | UNUSED | (none) | Not shown anywhere. |
| `src/engine/story.ts:369` | Personal rush result lines written from "your" point of view (replaced by the shared line; still computed, never drawn) | `` `${l.want - sold} more wanted: you had none left at that price.` `` | UNUSED | (none) | Not shown anywhere. |
| `src/engine/story.ts:372` | Personal rush result lines written from "your" point of view (replaced by the shared line; still computed, never drawn) | `` `Right price, not enough stock: ${rest.map((o) => s.players[o.player].name).join(' and ')} sold ${l.want - mine.qty} more.` `` | UNUSED | (none) | Not shown anywhere. |
| `src/engine/story.ts:387` | Personal rush result lines written from "your" point of view (replaced by the shared line; still computed, never drawn) | `` gap === 1 ? `${who} undercut you by $1!` : `${who} undercut you by $${gap}.` `` | UNUSED | (none) | Not shown anywhere. |
| `src/engine/story.ts:394` | Personal rush result lines written from "your" point of view (replaced by the shared line; still computed, never drawn) | `` `You $${mine.price}, ${who} $${best.price}${low}.${whatIf ? ` ${whatIf}` : ''}` `` | UNUSED | (none) | Not shown anywhere. |
| `src/engine/story.ts:407` | Personal rush result lines written from "your" point of view (replaced by the shared line; still computed, never drawn) | `` `$${lower} would've won it.${unsoldNote(unsold, n)}` `` | UNUSED | (none) | Not shown anywhere. |
| `src/engine/story.ts:409` | Personal rush result lines written from "your" point of view (replaced by the shared line; still computed, never drawn) | `` `Tie at $${mine.price}. ${s.players[tie.player].name} wins: ${tieShort(s, tie, mine)}.` `` | UNUSED | (none) | Not shown anywhere. |
| `src/engine/story.ts:411` | Personal rush result lines written from "your" point of view (replaced by the shared line; still computed, never drawn) | `` `Sold out before your turn.` `` | UNUSED | (none) | Not shown anywhere. |
| `src/ui/boardModel.ts:73` | Demand hints for the price panel (the "Psst…" price read, the demand legend and the buyer chips are no longer drawn) | `good: 'enough orders: prices stay high', war: 'more fruit than orders: price war', open: 'nobody has any yet',` | UNUSED | (none) | Not shown anywhere. |
| `src/ui/boardModel.ts:141` | Demand hints for the price panel (the "Psst…" price read, the demand legend and the buyer chips are no longer drawn) | `` `${n} wanted`; `` | UNUSED | (none) | Not shown anywhere. |
| `src/ui/boardModel.ts:142` | Demand hints for the price panel (the "Psst…" price read, the demand legend and the buyer chips are no longer drawn) | `'Nobody takes yours' : 'Nobody wants these'` | UNUSED | (none) | Not shown anywhere. |
| `src/ui/boardModel.ts:161` | Demand hints for the price panel (the "Psst…" price read, the demand legend and the buyer chips are no longer drawn) | `` title: `${who} wants ${x.w.qty} but ${type.text.toLowerCase()}` `` | UNUSED | (none) | Not shown anywhere. |
| `src/ui/boardModel.ts:163` | Demand hints for the price panel (the "Psst…" price read, the demand legend and the buyer chips are no longer drawn) | `` title: `${who} wants ${x.w.qty}, pays up to $${cap} for your freshest` `` | UNUSED | (none) | Not shown anywhere. |
| `src/ui/boardModel.ts:271` | Demand hints for the price panel (the "Psst…" price read, the demand legend and the buyer chips are no longer drawn) | `'Nobody here wants these today', 'Nobody wants these today'` | UNUSED | (none) | Not shown anywhere. |
| `src/ui/boardModel.ts:272` | Demand hints for the price panel (the "Psst…" price read, the demand legend and the buyer chips are no longer drawn) | `` `Nobody takes yours at $${price}` `` | UNUSED | (none) | Not shown anywhere. |
| `src/ui/boardModel.ts:274` | Demand hints for the price panel (the "Psst…" price read, the demand legend and the buyer chips are no longer drawn) | `` `Only ${canSell} of your ${out} would sell at $${price} (freshness or price)` `` | UNUSED | (none) | Not shown anywhere. |
| `src/ui/boardModel.ts:279` | Demand hints for the price panel (the "Psst…" price read, the demand legend and the buyer chips are no longer drawn) | `` `No rival has any out: only ${wanted} wanted`, `No rivals out: only ${wanted} wanted` `` | UNUSED | (none) | Not shown anywhere. |
| `src/ui/boardModel.ts:280` | Demand hints for the price panel (the "Psst…" price read, the demand legend and the buyer chips are no longer drawn) | `` `Only ${wanted} wanted for your ${out} and ${pieces(rivals)}`, `Only ${wanted} wanted for ${out + rivals} out` `` | UNUSED | (none) | Not shown anywhere. |
| `src/ui/boardModel.ts:282` | Demand hints for the price panel (the "Psst…" price read, the demand legend and the buyer chips are no longer drawn) | `` `No rival has any out: ${servable} would take yours`, `No rivals out: ${servable} would take yours` `` | UNUSED | (none) | Not shown anywhere. |
| `src/ui/boardModel.ts:283` | Demand hints for the price panel (the "Psst…" price read, the demand legend and the buyer chips are no longer drawn) | `` `Enough buyers for everyone (${rivals + out} out for ${firm})`, `Enough buyers: ${rivals + out} out for ${firm}` `` | UNUSED | (none) | Not shown anywhere. |
| `src/ui/boardModel.ts:284` | Demand hints for the price panel (the "Psst…" price read, the demand legend and the buyer chips are no longer drawn) | `` `${pieces(rivals)} out, ${servable} would take yours` `` | UNUSED | (none) | Not shown anywhere. |
| `src/ui/rulesText.ts:19` | Text for two set-up switches that were removed from New game (PLAN-063); a test still reads them | `` `Every lorry brings ${parts.join('; ')}.` : 'No lorry brings green fruit at the moment.' `` | UNUSED | (none) | Not shown anywhere. |
| `src/ui/rulesText.ts:24` | Text for two set-up switches that were removed from New game (PLAN-063); a test still reads them | `` `Days ${MARKET_DAY_LIST}: a standing order to bid for, and an upgrade that evening. Closing Day on the final day: +$${LAST_CALL_BONUS}, then the jam maker buys ripe leftovers at $${JAM_PRICE} each.` `` | UNUSED | (none) | Not shown anywhere. |
| `src/ui/table.tsx:130` | Price board on a rival seat (replaced by the rival box) | `next in line</span>` | UNUSED | (none) | Not shown anywhere. |
| `src/ui/table.tsx:131` | Price board on a rival seat (replaced by the rival box) | `deciding<span class="waiting-dots" /></span>` | UNUSED | (none) | Not shown anywhere. |
| `src/ui/table.tsx:136` | Price board on a rival seat (replaced by the rival box) | `b.state === 'sealed' && <small>sealed</small>` | UNUSED | (none) | Not shown anywhere. |
| `src/ui/table.tsx:239` | Freshness chips for a shelf (replaced by the shelf dock) | `` `, customers pay $${FRUIT[f].drop[pos]} less` `` | UNUSED | (none) | Not shown anywhere. |
| `src/engine/data.ts:69` | Words for how long a piece has left (drawn only by the unused freshness chips) | `` `ripens in ${pos - ripe + 1}` `` | UNUSED | (none) | Not shown anywhere. |
| `src/engine/data.ts:70` | Words for how long a piece has left (drawn only by the unused freshness chips) | `return 'last day';` | UNUSED | (none) | Not shown anywhere. |
| `src/engine/data.ts:71` | Words for how long a piece has left (drawn only by the unused freshness chips) | `` `${pos} night${pos === 1 ? '' : 's'}` `` | UNUSED | (none) | Not shown anywhere. |
| `src/ui/achievements.ts:10` | One-line blurb for each achievement group (the Trophies screen shows only the group title) | `blurb: 'First steps at the market.'` | UNUSED | (none) | Not shown anywhere. |
| `src/ui/achievements.ts:11` | One-line blurb for each achievement group (the Trophies screen shows only the group title) | `blurb: 'Fruit does not wait.'` | UNUSED | (none) | Not shown anywhere. |
| `src/ui/achievements.ts:12` | One-line blurb for each achievement group (the Trophies screen shows only the group title) | `blurb: 'The secret price.'` | UNUSED | (none) | Not shown anywhere. |
| `src/ui/achievements.ts:13` | One-line blurb for each achievement group (the Trophies screen shows only the group title) | `blurb: 'Know what your rivals are holding.'` | UNUSED | (none) | Not shown anywhere. |
| `src/ui/achievements.ts:14` | One-line blurb for each achievement group (the Trophies screen shows only the group title) | `blurb: 'Customers and special guests.'` | UNUSED | (none) | Not shown anywhere. |
| `src/ui/achievements.ts:15` | One-line blurb for each achievement group (the Trophies screen shows only the group title) | `blurb: 'Build it your way.'` | UNUSED | (none) | Not shown anywhere. |
| `src/ui/achievements.ts:16` | One-line blurb for each achievement group (the Trophies screen shows only the group title) | `blurb: 'Know the cast.'` | UNUSED | (none) | Not shown anywhere. |
| `src/ui/achievements.ts:17` | One-line blurb for each achievement group (the Trophies screen shows only the group title) | `blurb: 'Whatever the day brings.'` | UNUSED | (none) | Not shown anywhere. |
| `src/ui/achievements.ts:18` | One-line blurb for each achievement group (the Trophies screen shows only the group title) | `blurb: 'Daily, League and online.'` | UNUSED | (none) | Not shown anywhere. |
| `src/ui/achievements.ts:19` | One-line blurb for each achievement group (the Trophies screen shows only the group title) | `blurb: 'The long haul.'` | UNUSED | (none) | Not shown anywhere. |
| `src/ui/game/rush.ts:38` | Parts of the line under the customer in the rush (only the fruit word and the spoken label are used) | `` qty: `wants ${l.want} ×` `` | UNUSED | (none) | Not shown anywhere. |
| `src/ui/game/rush.ts:40` | Parts of the line under the customer in the rush (only the fruit word and the spoken label are used) | `` cap: `up to $${l.max} fresh` `` | UNUSED | (none) | Not shown anywhere. |
| `src/engine/game.ts:591` | Game log (kept in the saved game; no screen shows it) | `` `${pl.name} was fined $${paid}` `` | UNUSED | (none) | Not shown anywhere. |
| `src/engine/game.ts:1182` | Game log (kept in the saved game; no screen shows it) | `` `${hp.name} was fined $${fine} for the standing order` `` | UNUSED | (none) | Not shown anywhere. |
| `src/engine/game.ts:875` | Game log (kept in the saved game; no screen shows it) | `` `${pl.name} played ${FAVOURS[id].title}` `` | UNUSED | (none) | Not shown anywhere. |

