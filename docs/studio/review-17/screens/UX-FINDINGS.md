# Fruit Market · UI/UX audit findings

Audit date 2026-11-11. Read-only: nothing in the repository was changed.
Builds: local build of branch `ccr-d8bcd65d-gblqqb` (rules 17) served privately on port 4190, and the LIVE game 1.19.1 (rules 16).
Screenshots are in `ux/shots/` (1,131 files); contact sheets are `ux/sheet-*.png`; raw play logs are `ux/logs/*.log`.

## How this was played (so the evidence can be weighed)

| Run | Where | Set-up | Shots prefix | How |
|---|---|---|---|---|
| LIVE solo | live 1.19.1 | 390x844, Rosa, 3 Normal, 10 days, tutorial on, name "Tester" | `live-`, `live-b-` | Day 1 by hand (reading each screen, choosing); days 2 to 10 by a scripted player that buys what today's and tomorrow's tickets ask for, stocks what is wanted, takes the suggested prices, bids, builds. Finished: 3rd with $68. "Share anonymous stats" was switched off first so the test did not add to the owner's counters. |
| L4 | local | 390x844, Rosa, 3 Normal, 10 days, tutorial tips left on | `L4-` | scripted player, every decision screen logged as text and photographed. Finished: 3rd with $70. |
| Z (zero cash) | local | 390x844, Kiki, 3 Normal, 10 days | `Z-` | buy the dearest fruit, never stock, bid $1 for every standing order. At $0 from Day 3 to the end. |
| L6 | local | 390x844, Pak Din, 6 stalls, Quick 8 days | `L6-` | scripted player, full game. |
| S360 | local | 360x640, Farah, 3 Normal, days 1 to 4 | `S360-`, `m-360-` | scripted player. |
| D1280 | local | 1280x800, Ah Chen, 3 Normal, days 1 to 4 | `D1280-` | scripted player (plays every favour card once). |
| Side screens | local | 390x844 at 2x | `side-`, `00-` to `03-` | opening, home, pop-ups, How to play, Settings, Trophies, Wardrobe, all eight shopkeeper cards. |

Measurements (text size, tap size, overflow) were read from the page itself (`ux/logs/measure-*.json`). Portrait crops were reproduced from the CSS on every source picture (`sheet-portraits-*.png`) and checked against real screenshots.

Results use PASS / FAIL / NOT RUN where a check is named.

---

## Findings, most important first

### Blockers

**1. First game: the tutorial tip collapses the Stocking and Pricing screens** · blocker · Stocking, Pricing (Day 1, tutorial on, which is the default for a new player) · `live-16-d1-stock-with-tip-BROKEN-again.png`, `L4-018-tip-open-your-stall.png`, `L4-022-tip-secret-prices.png`, `sheet-tutorial-tips.png`
What is wrong: while the "Open your stall" and "Secret prices" tips are showing, the whole table is squeezed into a strip about 24 px wide at the left edge. The customers, rivals, crate rows and price dials cannot be read; the main button shows only "...RYTHING BACK" / "THE BELL". It happens on the live game and on the local build, every time. The screen returns to normal only after "Got it". A new player meets the two most important screens of the game in this state.
Cause (for the developer): `.game.gx.coach-row` in `src/ui/styles.css` line 2077 sets a grid with old area names that the Market Ticket layout no longer has.
Fix: drop the `coach-row` grid and show the tip as an overlay (as the other tips do) placed over the market, never over the rows being explained. Add a screenshot check with tips on.

**2. "Daily market" and "Market League" on the home screen replace the game in progress with no question** · blocker · Home · `side-home-with-continue.png`, `side-league-after-tap.png`, `side-home-after-league-tap.png`, `side-daily-after-tap.png`
What is wrong: with "Continue · Day 1/10" on the home screen, one tap on the Market League ticket started a League game at once; after "Quit to menu" the home screen read "Continue · Day 1/8". The 10-day game was gone. The Daily ticket does the same. Verified on the local build; not tried on live (instructions), but the code is unchanged since 1.18.0 (`App.tsx` `start()` saves over the old game).
Fix: when a game is waiting, ask first ("You have a game on Day 4. Start the Daily market and end it?"), or open a small ticket like the Continue pop-up with a Start button.

**3. No cash and no fruit: the player is out of the game, and the game says nothing** · blocker (design) · Buying, Evening, Summary · `Z-109-d4-buy-cash-0.png`, `Z-097-evening-upgrades.png`, `Z-162-d5-sales-summary.png`, `Z-248-results-top.png`, `sheet-zero-cash.png`
What is wrong: see "The $0 walkthrough" below. In short: at $0 every market box is simply not tappable and the button still reads "Skip buying · 4 more allowed"; nothing says "you cannot afford anything". With an empty shelf there is no way to earn a dollar again, so days 5 to 10 were four empty taps a day (Skip buying, Keep everything back, Close for the day, Lights out) for about 40 seconds each. Upgrade buttons are grey with the reason only in a hover tooltip a phone never shows.
Fix (needs the owner's rule decision): either a floor (for example the market lets a stall with under $2 take one soft or okay piece on credit, repaid from the first sale), or say plainly "You are out of cash. Sell what is on your shelf to buy again", and when shelf and cash are both empty offer "Watch the rest" (auto-play to the results) or "End game".

**4. Small phone (360x640): prices, the bid and the rush result are cut off** · blocker on small phones · Pricing, Standing order, Rush, Morning, Buying · `S360-019-d1-price.png`, `m-360-price.png`, `S360-068-d3-order-deciding.png`, `S360-030-d1-rush-06-result-MARCUS-HOOK-1--CUSTOMER1.png`, `S360-011-d1-buy-my-turn.png`, `sheet-small-phone-360x640.png`
What is wrong: (a) Pricing shows one price row; the second and third are below the shelf dock, yet the button reads "Ring the bell · seal 2 prices", so a price can be sealed unseen. (b) Headings are clipped at both edges ("IVAL CRATES", "OUR SECRET PRICES", "One price per frui", "OMORROW") and "2 OUT · 1 WANTED" runs under the minus button. (c) On the standing-order screen the − 10 + stepper and the Pass button are below the fold; only "Bid $10 a piece" shows. (d) In the rush the line that says who sold and why is hidden behind the dock. (e) While buying, the lower boxes of each lane, the letter key and "Tomorrow's lorry" are off screen.
Fix: on short screens shrink the customer row to tickets without portraits (or one line each) during Stocking, Pricing, Order and Rush; keep the main panel's decision controls above the fold; give `.mid-panel` its side padding back at 360 px.

### Major

**5. Big customer ticket: every face is cut off below the eyes** · major · Customer pop-up (tap a ticket) · `L4-006-pop-big-ticket.png`, `live-b-008-pop-big-ticket.png`, `S360-006-pop-big-ticket.png`, `sheet-portraits-big-ticket.png`
What is wrong: the big ticket uses the small ticket's crop (`left −17%, top −7%, width 126%`) in a wider, shorter window (5:3). Only the top 53% of each picture shows: about 40% empty background, then hair and eyes; nose, mouth and chin are cut for all 36 customers and the 8 standing-order pictures.
Fix: the big ticket should show the whole picture (as the rush card does), centred, or use a per-size crop.

**6. Small customer tickets: chin cut, and the F O S lamps sit on the picture** · major · Customer row (all phases) · `sheet-portraits-small-ticket-4stalls.png`, `sheet-portraits-small-ticket-5cards.png`, `live-13-d1-buy-my-turn-no-tip.png`
What is wrong: the window shows rows 4% to 67% of the picture, so there is 25 to 30% of empty background above the head and the chin is cut on almost every face (mouth on or under the edge for about ten, for example `tan`, `sarah`, `mira`, `rara-jenab`, `devi`, `hui-min`, `mei-ling`, `priya`, `siti`, `fatimah`). The lamp column covers the right 18 px: 21% of the picture with four tickets, 26% with five. Faces are centred on the whole window, so they sit about 10% right of the middle of what is left, and anything on the right is hidden (Grace's and Daniel's hair, John's and Wei-Jie's hat brims, Devi's flower, Jia-Wen's earring, Mira's leaf, the flowers of Lina, Mei-Ling and Nurul).
Fix: move the lamps off the picture into the black type band the printed card has; crop lower (top about −24%) so the face is in the middle top to bottom.

**7. What the rivals bought is never on screen again** · major (needs the owner's rule decision) · Buying, Stocking, Pricing · `L4-017-d1-buy-rival-turn.png`, `L4-025-pop-rival-pricing.png`, `L4-023-d1-price.png`
What is wrong: the one deduction that makes pricing interesting ("Benny put 2 pieces out: which fruit?") rests on remembering what each rival took from the market, today and on earlier days. Buying is public, but it is a 3-second animation that plays while the player may be reading tickets (on live Day 1 the three rivals had bought before I had finished reading the news). A rival's pop-up says only "The shelf stays behind the shutter" and the perk's name. RULES.md says "remember it if they can", so this is a rule choice; on a phone it is a memory test more than a bluff.
Fix: keep each rival's purchases of today on their box until the bell (small fruit pips, public information), and list today's buys in the rival pop-up. Shelves stay secret.

**8. The buying order is not shown** · major · Morning, Buying · `L4-004-d1-morning.png`, `live-13-d1-buy-my-turn.png`
What is wrong: who buys first decides who gets a short lorry. On live Day 1 I bought last and found the apple and all three watermelons gone; in a local start I bought last and the market was empty (`logs/trial.log`, "cells pickable 0 cash $10"). Nothing on the morning or buying screen says the order; only "X is buying" for the stall of the moment.
Fix: number the rival boxes and the shelf dock 1 to 4 for the day, from the morning on.

**9. The market boxes, the main thing tapped while buying, are 28 px tall** · major · Buying · measured 79x28 (`logs/measure-390.json`), `L4-012-d1-buy-my-turn.png`
What is wrong: boxes are stacked with thin gaps, so a miss buys the wrong freshness (Undo exists). Each lane also draws every empty box with a price ("$1", "$1" under an empty blueberry lane), which is why the rows are so thin.
Fix: boxes at least 44 px tall; draw empty boxes as slim, unpriced slots.

**10. Ages are hidden on your own shelf** · major · Shelf dock, Stocking · `live-14-d1-bought-2-green-mango.png`, `L4-019-d1-stock-start.png`
What is wrong: the dock merges pieces by letter ("G2", "F4"). It cannot tell you whether a green mango ripens tomorrow or the day after, or whether an apple has one fresh day left or four. In Stocking, two rows of the same fruit with the same letter read the same ("F · 2 on shelf", "F · 1 on shelf"). I had to remember the day I bought each piece.
Fix: draw the shelf as the printed stall sheet does (one box per day of life), or add the missing words: "ripe in 1 night", "okay tomorrow", "spoils tonight".

**11. Bidding for a standing order: the facts needed are covered up** · major · Standing order (Market Days) · `L4-090-d3-order-deciding.png`, `L4-092-d3-order-after-bid.png`, `live-b-043-d3-order-deciding.png`
What is wrong: the bid panel covers the market and tomorrow's lorry, and today's customers are not drawn at all during this step, so the supply and demand for the fruit cannot be seen while choosing a price. The highest bid allowed is only in the thin strip above ("up to $11 each"), which repeats the card below it. After bidding, only the winner and price appear ("Farah at $7"): the other bids are in a hover tooltip, so there is no reveal of all bids. The fine line never says the fine is capped by your cash.
Fix: show the card as a sheet that leaves the market lanes and tomorrow's lorry in view (or shows that fruit's lane in the card: "9 in the market, 4 on tomorrow's lorry, costs $3"); print "Highest bid $11" on the card; after the last bid show all bids for two seconds.

**12. The day a standing order is due is confusing for everyone who does not hold it** · major · Stocking, Pricing, Rush, Summary · `L4-135-d5-price-order-due.png`, `L4-143-d5-rush-06-result-THE-PIE-FACTOR-CUSTOMER1.png`, `Z-154-d5-rush-06-result-THE-SMOOTHIE-S-CUSTOMER1.png`, `Z-162-d5-sales-summary.png`
What is wrong: the order stands in the row as a customer ticket tagged "GUEST" with the holder's price ("x4 $7"), but a rival is paid $1 less and the holder's pieces go first whatever anyone's price is. My apple at $6 against Farah's $7 was marked "SOLD OUT FIRST", which reads as if I sold. The pricing row says "3 buy at $4 · top $7". The holder's summary does not mention the order at all: with 0 of 4 delivered and a $0 fine it read "A quiet day: you made no offers." (This overlaps the parked pricing-screen item in STATE.md.)
Fix: give the order its own card shape in the row ("ORDER · Farah fills first at $7 · others $6"), take it out of the "wanted" and "buy at" counts or label it, replace "SOLD OUT FIRST" with "Farah filled it", and add a summary line ("Standing order: delivered 0 of 4 · fine $0").

**13. Pricing: said twice, and three facts missing** · major · Pricing · `L4-023-d1-price.png`, `L4-036-d1-rush-08-result-FIREFIGHTER-OS-CUSTOMER1.png`
What is wrong: each rival's piece count appears twice (on the rival box, "$1 · 2 out", and in the crate panel, "2 PIECES OUT"). The price rows do not show how fresh the pieces in my crate are, though the most a customer pays depends on it; nor what I paid. "4 buy at $3 · top $5" is hard to read (4 what?). The price is already filled in by the game's own planner and is not labelled as a suggestion; on Day 1 it suggested $7 for a watermelon that the first customer capped at $6 ("OVER $6 TOP"). Accepting it every day worked, which makes the bell a rubber stamp. The note under the rows repeats the heading and the tutorial every day.
Fix: one place for rival counts; row text "2 fresh out · cost $2 each · Osman pays up to $6, Hock Seng $7"; label the start price "suggested" or start at the customer's top price; remove the daily note.

**14. Stocking: the big black button means "sell nothing" until a piece is added** · major · Stocking · `L4-019-d1-stock-start.png`, `L4-020-d1-stock-filled.png`
What is wrong: every other screen's black button is the way forward. Here its first state is "Keep everything back"; one habitual tap ends the day's selling with no question. Each piece needs its own + tap (4 pieces, 4 taps).
Fix: while the crate is empty make the button the plain outline style and ask once ("Sell nothing today?"), or start with what is wanted in the crate; add "Put out all wanted".

**15. Steps with nothing to decide** · major (flow) · Buying, Stocking, Evening · `L4-016-d1-buy-nothing-affordable.png`, `live-17-d1-stock-nothing-ripe.png`, `L4-047-d1-evening.png`, `Z-144-d5-stock-start.png`
What is wrong: "Done buying · 0 more allowed" must still be tapped. With no ripe fruit the Stocking screen still appears ("You have no ripe fruit to sell today" · "Keep everything back"). After "Close for the day" there is sometimes a second screen with only "Lights out · next day" and sometimes not: the engine holds an evening whenever any stall, a rival included, holds a favour card (`game.ts` line 1284), so from the player's seat it is random. In the L4 game 7 of the 9 evenings had nothing to choose; on live, with no card-holding rival, most days went straight to the night.
Fix: end buying automatically at the limit (keep Undo for two seconds); skip Stocking when nothing can be sold; when you have no evening choice go from "Close for the day" straight to the night.

**16. Your perk, your upgrades and the rivals' perks cannot be read during play** · major · Shelf dock, Rival pop-up, Pause menu · `L4-009-pop-rival-morning.png`, `L4-010-pop-pause-menu.png`, `L4-118-d3-evening-after-build.png`
What is wrong: my perk and upgrades are 13 px icons on the dock whose text is a hover tooltip. A rival's pop-up gives the perk's name only ("BIG BASKET"). The pause menu has Resume, Full screen and Quit: no rules. Tapping a face-down walk-in or the shelf does nothing.
Fix: tap the dock for a "My stall" sheet (perk in words, upgrades in words, favour cards, standing order); perk text in the rival pop-up; "How to play" in the pause menu.

**17. The rush: slow to watch, and its counter is wrong** · major · Rush · `L4-030-d1-rush-02-deal-FIREFIGHTER-OS-CUSTOMER1.png`, `L4-036-d1-rush-08-result-FIREFIGHTER-OS-CUSTOMER1.png`, `L4-143-d5-rush-06-result-THE-PIE-FACTOR-CUSTOMER1.png`
What is wrong: "CUSTOMER 1 OF 5" counts fruit lines, not customers (4 customers on the street, 5 to 7 "customers" in the counter). The rush took 9 to 29 seconds (about 20 on most days) of a 41 to 61 second day with nothing to do but tap to hurry. Speech toasts ("Top dollar! Ka-ching!", "Heard it first, sold it first.") land on the rival boxes and the order strip. "None qualify", "over $6 top" and "too old for $1" are three wordings for "not sold".
Fix: count customers; one card per customer with all its lines; one wording ("Too dear", "Too old", "Sold out"); put the speech line inside the result box.

**18. Old-style screens remain** · major (look) · Results, Settings, Trophies, Wardrobe, How to play, perk pick, Evening · `L4-200-results-top.png`, `L4-202-results-scroll2.png`, `side-settings-1.png`, `side-trophies-1.png`, `side-wardrobe-1.png`, `side-howto-1.png`, `side-league-after-tap.png`, `L4-116-evening-upgrades.png`, `L6-040-evening-shade.png`, `L4-170-evening-favours.png`
What is wrong against the Market Ticket look: red rounded "REMATCH!" and "Next →" pills; dark rounded pills (Share result, Main menu, Back, Full screen, Replay the tutorial); green rounded switches; round back and close buttons; rounded achievement tiles; a red rounded "WARDROBE: 0/31 LOOKS" pill; mixed-case rounded headings ("Stall upgrades", "Shade Cloth", "Up your sleeve", "Choose your trait", "The Pie Factory"); rounded pills for the Shade Cloth choice and the evening favour chips; the dashed red "Psst…" box; the round "i" (22x22) on the pricing screen. Five black "BUILD" buttons on one screen break the one-black-button rule.
Fix: restyle these seven places with the ticket parts already used in the game table.

**19. How to play is partly wrong and leaves out the cards** · major · How to play · `side-howto-4.png`, `side-howto-5.png`, `side-howto-6.png`, `sheet-howto.png`
What is wrong: slide 4 ends "A customer who isn't fully served comes back once more the next day, then leaves"; slide 7 says "Nobody waits overnight" (the current rule). Slides 1 and 2 speak of "seven phases"; the game's bar shows five. Favour cards and upgrades are listed as names (and prices) with no effects, except Gossip and Scout; events are not listed anywhere in the app. Slide 6 is about 190 words in three blocks. Back and Next change height from slide to slide (and are below the fold on slides 1, 2 and 6).
Fix: correct slide 4; add three card slides (favours, upgrades, events) built from the same data the game uses; pin Back and Next to the bottom.

**20. Day 1 can hand a player nothing to do, and mango tickets on days 1 and 2 cannot be served** · major (gameplay) · Day 1 · `live-13-d1-buy-my-turn-no-tip.png`, `live-17-d1-stock-nothing-ripe.png`, `live-19-d1-price-nothing.png`
What is wrong: on live Day 1 the lorry brought 3 blueberries, 3 watermelons, 9 green mangoes and 1 apple; the four customers wanted 8 apples, 2 watermelons and 3 mangoes. Buying last, I could take only blueberries nobody asked for or green mangoes. Result: "A quiet day: you made no offers." In a local start the market was empty when my turn came. Every mango arrives green and ripens in two nights, so no one can serve a mango ticket on Day 1 or 2, and tomorrow's ticket on Day 1 (Devi Bloom, 3 mangoes) was a ticket nobody could ever fill.
Fix (owner's rule decision): a fixed first lorry with at least 3 ripe pieces a stall, matched to the first crowd; no mango wants before Day 3.

### Minor

**21. Text under 11 px** · minor · game table · `logs/measure-390.json`
Freshness letters on tickets 8.4 px; "YOU" tag 8 px; ticket number 9 px; shelf counts ("F2") 9 px; "in crate" 9 px; letters on market boxes 9.6 px; customer names 10 px; "TOMORROW", "ORDER", "pieces out", favour-card names and "bidding" 10 px; the five-beat bar 10.6 px. Fix: nothing under 11 px; the lamps and shelf counts matter most.

**22. Tap targets under 44 px** · minor · game table · `logs/measure-390.json`
Today's news button 120x36; lane head ("3+ want") 79x28; Tomorrow's regular 91x26; favour card on the dock 135x28; "Play Favoured Trade?" 366x40; the "i" for the bell 22x22; How to play dots. (Market boxes are finding 9.)

**23. Clipped and broken text** · minor · tickets, top bar, rival boxes · `L4-135-d5-price-order-due.png`, `L6-017-d1-stock-filled.png`, `m-390-stock.png`
With five tickets names break mid-word ("HERBALIS / T MIRA", "FIREFIGH / TER…") or lose a line ("THE AIRLINE CATERER", "UNCLE HOCK SENG" need three lines, two show). Two-word news names overflow the top-bar button ("HEALTH INSPECTOR" 80 px in 77). Rival lines end in "…" ("$52 · plottin…", "$0 · sold at…").
Fix: break at spaces only and allow a smaller size step; shorten the rival words ("plotting…" can go, see 27).

**24. Six stalls** · minor · `L6-185-results-top.png`, `L6-038-d1-sales-summary.png`, `L6-019-d1-price.png`, `sheet-six-stalls.png`
Results give 5th and 6th place an empty pill (the list of ranks stops at "4TH"); the cash chart reuses two of its four colours. Rival boxes show cash and name only, so "ready" and "2 out" are lost. Day takings are six faces with no names.

**25. Desktop (1280x800)** · minor · `sheet-desktop-1280x800.png`, `D1280-120-evening-upgrades.png`
The game is a 507 px phone column between two grey gutters. The evening upgrades become a row of four tall narrow cards with the fifth (Order Book) on a second row, cut off by the dock.

**26. Home picture and shopkeeper cards** · minor · Home, New game · `side-home-with-continue.png`, `sheet-portraits-home-stall.png`, `sheet-cards-shopkeepers.png`, `03-newgame-top.png`
Home: the top 24% of the shopkeeper's scene is cropped (hairline and Rosa's flower cut), face about 3% left of centre. New-game cards: in all eight the shopkeeper stands left of centre because the fruit crate is drawn on the right (face centre at about 40 to 45% of the card's width; Farah about 28%); the face appears twice (round badge and scene); an empty black band sits between picture and text; "UNCLE BENNY" is squeezed. The sticky "Start game" bar covers the rival-stall tiles.

**27. Words that confuse or fill space** · minor · several
- "TODAY'S SPECIAL: HAGGLER" for a perk that lasts the whole game (`03-newgame-top.png`). "Trait" in League and Daily ("Choose your trait"), "perk" in the tip on the same screen (`side-league-after-tap.png`).
- "? WANT" on a lane while a face-down ticket above shows that fruit; "2+ WANT" (`L4-012-d1-buy-my-turn.png`). Say "at least 2" or show nothing.
- The bell's help card closes with a button "RING THE BELL!" that does not ring the bell (`L4-024-pop-bell-notice.png`).
- Said every day: "Only the crate can sell today. Rivals will see how many pieces…", "You see how many pieces each rival put out…", "Psst… the rivals are plotting tonight too.", "Rivals are opening their stalls…" (twice on one screen, `L4-021-d1-stock-waiting-rivals.png`).
- Rival notes "plotting…", "building…", "next in line"; action bar "The cart rolls in…", "Bought!".
- Evening "Up your sleeve · Favour cards you can play" lists cards that cannot be played in the evening (Free Fruit, `L4-170-evening-favours.png`).
- The evening shows the market with "0 WANT" on every lane (`L4-047-d1-evening.png`).
- Rank in the top bar jumps while stalls buy (1ST to 4TH and back on Day 1) because cash drops as fruit is bought.

**28. Morning** · minor · `L4-056-news-apple-blight.png`, `L4-163-news-festival.png`, `L4-005-pop-news-sheet.png`, `L4-004-d1-morning.png`
Each event's effect is given twice (black chips, then the sentence). Guest events say only "GUEST · a special customer" in the chip. With a favour row on the dock and an overnight note, "Tomorrow's lorry" is cut off at the bottom of the card. The news sheet from the top bar is the same card again with a different button. A Calm Day is a full card that says nothing. Today's lorry has no name; only tomorrow's does.

**29. Tutorial tips** · minor · `L4-011-tip-your-turn-to-buy.png`, `10-d1-morning-first-view.png`
The buying tip covers the lower half of the lanes it tells you to tap, the letter key and tomorrow's lorry; the morning tip covers tomorrow's lorry. Nine tips; the tie-break tip on the summary is rules text, not help.

**30. Summary** · minor · `L4-043-d1-sales-summary.png`, `live-19-d1-price-nothing.png`
Day takings are four faces and numbers with no names. Rival prices are gone once the rush ends (only "Ah Chen edged you out 2 times"). A faint "+$4 bonus" stays over the rival boxes.

### Polish

**31.** Guest tickets (Gym Club, Bakery) borrow the event scene; at ticket size it is an unreadable blob (`L4-135-d5-price-order-due.png`).
**32.** New game: Stall 2 is Easy and the others Normal by default, unexplained; the blank name field takes focus and opens the keyboard over the shopkeeper cards.
**33.** League and Daily show a blank white face on the dock until a perk is picked (`side-daily-after-tap.png`).
**34.** Farah's Sharp Ears peek happens with no screen or line: a walk-in simply appears face up with a small ear.
**35.** "FINAL 3 DAYS" banner sits across the customer tickets while the morning card is read (`L4-167-news-kenduri.png`).

---

## Cards: the app against the printed cards

| Card | Where the app shows it | What differs from the printed layout | What one shared design needs |
|---|---|---|---|
| Customer | Row ticket (`.tk-cust`), big ticket (tap), rush card, Tomorrow chip, face-down back. Three different layouts. | No "CUSTOMER" label. The number is a yellow tag on the picture, not top-left before the name. Quirk line only on the big ticket, and under the fruit rows instead of above. Rows read "icon x2 $6": no circle per piece, no price-tag shape. Type: three small lamps on the picture (row ticket) or lamps plus "Everyday · buys fresh or okay" at the foot (big ticket); no black band, no "FRESH OR OKAY" in capitals. The footer "FRESH PAYS FULL · OKAY −$1 · SOFT −$2" is outside the card, as "Full price · $1 less · $2 less". Back says "WALK-IN" or "TOMORROW", not "CUSTOMER WANTS". Rush card: picture left, "2 WATERMELONS · UP TO $6", "Buys fresh or okay". | One card component at three sizes with the printed order: number + "CUSTOMER", name (two lines), picture (with a focus point per picture), quirk, rows with circles and a price tag, black type band with lamps, footer. The row ticket may drop the quirk and footer; nothing else changes place. |
| Event | Morning card, news sheet, name in the top bar. | "TODAY'S NEWS" instead of "MARKET NOTICE No 05"; no number. The headline is small italics, not shouted. Up to three effect chips ("+$2 PER APPLE", "NO APPLES TODAY") instead of one big line. No footer ("LASTS FOR TODAY ONLY" / "KEEP THIS CARD OUT UNTIL NIGHT" / "ADD THE GUEST CARD…"). Red frame. | Notice number, title, headline, one big effect line, rule text, footer; the footer wording matters most (it tells you a Heatwave or Monsoon still acts tonight). |
| Favour | A 28 px chip on the dock; a bar with icon, title, text, Play and ✕; a rounded pill in the evening. | Not card-shaped. No "FAVOUR · KEEP SECRET". When to play is inside the text for some (Scout) and missing for others (Free Fruit, Fridge). No "DISCARD AFTER USE · HOLD UP TO 3"; the hand limit is not shown. | Card with kind label, title, a "PLAY ON YOUR BUYING TURN / IN THE EVENING / AT THE BELL" band, text, footer; hand count "2 of 3" on the dock. |
| Upgrade | Evening list row: icon, title, small italic text, black "BUILD $4". After building: a 13 px icon on the dock. | No "STALL UPGRADE" label, no "COSTS $6 · BUILD ONCE", no footer "AFTER A MARKET DAY · A STALL HAS ROOM FOR TWO" (the sentence that says so shows on desktop, not on the phone shots). Five black buttons. | Card with label, title, cost, text, footer; one "Build" action after a card is chosen; "Built 1 of 2" on the panel. |
| Shopkeeper | New-game carousel card; in play a face on the stall pattern and a 13 px perk icon. | No "SHOPKEEPER" label. "TODAY'S SPECIAL: HAGGLER" instead of the perk title. The quip is outside the card. Round badge repeats the face. | Label, name, picture, perk title, perk text, quip in quotes; the same card opens from the dock and from a rival's box. |
| Lorry | No card: four coloured tiles with counts ("The lorry unloads") and one line "Tomorrow's lorry: Mango Season x4 x3 x8 x2". | No "LORRY" card or name for today's load; the rows per number of stalls are not needed in the app. Green mangoes are shown by a green icon only. | A small lorry card (label, name, four counts, "mangoes arrive green") used for today and tomorrow. |
| Standing order | Bid panel card; one-line strip under the customers; on the due day a customer ticket tagged "GUEST"; rush card. | "DUE DAY 5" instead of "DUE IN 2 DAYS". "$11 HIGHEST BID ALLOWED" is missing from the card (it is in the strip as "up to $11 each"). No "WANTS 3 AT 2-3 STALLS…" (not needed). The fine is a sentence in a list, not "FINE: $7 A PIECE THE WINNER MISSES". No "NO FAVOUR CARD · NO TIPS". On the due day it looks like an ordinary customer. | The printed card as the bid card and as the due-day card in the row, with a holder line ("Farah fills first at $7 · others $6"). |

The printed wording is not in `src/` or `scripts/` as shared text (no match for "FRESH PAYS FULL", "KEEP SECRET", "MARKET NOTICE"), so app and print are written twice. A single table of card texts used by both would keep them the same.

---

## What I had to remember or go and find

1. What each rival bought today and on earlier days (never shown again; needed at the bell).
2. The buying order for today (not shown).
3. When my green mangoes ripen, and which fresh pieces turn okay tonight (dock shows "G2", "F4").
4. What I paid for the fruit I am pricing.
5. How fresh the pieces in my crate are while pricing (the row says "2 out").
6. What my perk does, what my upgrades do, what each rival's perk does (names or icons only).
7. What a favour card does (one tap on the chip: fine) and when it can be played (not always stated).
8. The standing order's highest bid, the fruit's supply and tomorrow's lorry while bidding (covered); whether rivals are paid less on the due day (not stated); how many pieces I have set aside for it.
9. Tomorrow's lorry while stocking, pricing and bidding (covered by the panel; off screen at 360x640 even while buying).
10. Today's event after the morning (one tap on the top bar: fine), and whether it still acts tonight (Heatwave, Monsoon: a note appears in the evening).
11. The tie-break order (behind the "i").
12. What rivals charged yesterday (gone after the rush).
13. That a face-down ticket's amounts are unknown ("? want", "2+ want").
On screen without effort (good): today's and tomorrow's tickets with prices, rivals' cash, pieces put out, the order's due day and fine, shelf space, walk-ins I have seen (ear mark).

---

## The $0 walkthrough (local build, `Z-` shots, `logs/BROKE.log`)

1. Day 1: bought 3 fresh watermelons ($9), $1 left. Box prices of $2 and $3 were simply not tappable; button "Done buying · 1 more allowed" (`Z-007-d1-buy-nothing-affordable.png`).
2. Days 1 and 2: stocked nothing. Summary: "A quiet day: you made no offers."
3. Day 3, standing order (4 blueberries, due Day 5): with $1 I could bid any price; I bid $1 and won ("You deliver at $1 a piece") (`Z-071-d3-order-bid-set.png`, `Z-072-d3-order-after-bid.png`). Bought one okay blueberry: $0.
4. Day 3 evening: five upgrades, all "BUILD" buttons grey, no reason shown (`Z-097-evening-upgrades.png`).
5. Day 4 at $0: "Your turn · 0 of 4 bought", every box untappable, "Skip buying · 4 more allowed" (`Z-109-d4-buy-cash-0.png`). The evening warned "4 fruit spoil tonight" (`Z-131-d4-evening.png`). All four spoiled.
6. Day 5, order due, shelf empty: the rivals all brought blueberries at $1. Rush: "TESTER DELIVERED 0 OF 4. AH CHEN FILLED THE GAP AT $1. Tester is fined $0." (`Z-154-…`). The fine is $6 a piece but never more than your cash, so at $0 it is nothing. The summary did not mention it (`Z-162-d5-sales-summary.png`).
7. Day 6: bid $1 again, won again, failed again on Day 8, fined $0 again. A stall with no cash can take every standing order away from the others at no cost.
8. Days 5 to 10: $0 and an empty shelf. Each day: Skip buying, Keep everything back, watch the rush, Close for the day, Lights out. No message, no way to earn, no way to end early except Quit.
9. Results: "4TH You $0 · Sold 0 · spoiled 4"; "Next time, watch out for: 4 fruit spoiled on your shelf." (`Z-248-results-top.png`, `Z-249-results-scroll1.png`).

---

## Gameplay notes for the designer

- **Bluff or read a rival:** the piece counts before the bell (put out one piece of a fruit they do not expect); who is bidding, passed or deciding on a Market Day (rules 17, clear and quick); a rival going to $0 while buying; the Tomorrow strip against tomorrow's lorry.
- **Pure memory:** what rivals bought; how old my own pieces are; yesterday's prices; what perks and upgrades do.
- **Nothing to decide:** buying last from an empty or useless market; Stocking with no ripe fruit; "Done buying" at the limit; evenings with only "Lights out"; pricing when the suggested price is taken; every day once at $0.
- **Felt unfair or pointless:** Day 1 as last buyer (two of the eight games I started); mango tickets on days 1 and 2; a $1 bid that wins an order the bidder cannot fill and pays no fine; a rival's cheaper piece marked "sold out first" on an order day.
- **Length of a day** (scripted player, so no reading time; `logs/L4.log`): 41 to 61 seconds and 6 to 14 taps. Day 2 of the local game, 49 s: 13 s buying (about 10 s of it watching three rivals), 5 s stocking and pricing, 22 s bell and rush, 7 s evening and night. Roughly two thirds of a day is watching. Taps for a full day: Start buying 1, buys 4, Done 1, crate 3 to 4, Open my stall 1, Ring the bell 1, Close for the day 1, Lights out 0 or 1. A 10-day game took 7 to 8.5 minutes at that speed; a person reading will take perhaps twice that.

---

## Live site (1.19.1, rules 16)

- **Loading:** first byte 0.6 s, first paint 1.5 s, load 2.4 s; 20 requests; no failed requests, no script errors in the whole game (`live-00-first-paint.png`, `live-00-opening.png`, `live-02-home.png`).
- **Played:** one solo 10-day game against Uncle Benny, Farah and Saleh (Normal) as "Tester". Finished 3rd with $68 (Farah $106). 7 min 8 s of scripted play after a hand-played Day 1. No Quick match, no Daily market, no account, no room created.
- **Same as the local build:** finding 1 (tutorial tip collapses Stocking and Pricing: `live-16-d1-stock-with-tip-BROKEN-again.png`), finding 5 (big ticket crop: `live-b-008-pop-big-ticket.png`), and every layout finding above; speed of a day is the same.
- **Different from the local rules-17 build, as expected:** bidding does not show who is bidding ("Bid in. Waiting for the other stalls", `live-b-045-d3-order-after-bid.png`); three upgrades are offered, not five (`live-b-071-evening-upgrades.png`).
- **Not tested on live:** finding 2 (Daily and League replacing a saved game), by instruction; the code is the same.
- Day 1 on live is the source of finding 20.

---

## Checks

| Check | Result |
|---|---|
| Local 10-day game, 3 Normal, 390x844, played to results | PASS (`L4-200-results-top.png`) |
| Live 10-day game, 3 Normal, played to results | PASS (`live-b-168-results-top.png`) |
| Quick game at 6 stalls, played to results | PASS (`L6-185-results-top.png`) |
| Part game at 360x640 | PASS (4 days) |
| Part game at 1280x800 | PASS (4 days) |
| Tutorial tips left on and judged | PASS (finding 1, 29) |
| Drive to $0 | PASS (walkthrough above) |
| Every portrait checked | PASS for customer tickets (44 pictures, by reproducing the crop), big ticket, home picture, eight shopkeeper cards; rival boxes, Tomorrow chips and event pictures looked centred in screenshots and were not measured |
| Play a friend rooms (online play) | NOT RUN (pop-up photographed only) |
| Daily market on live, account creation, Quick match | NOT RUN (by instruction) |
| Comparison with the printed PDF itself | NOT RUN (PDF not available; compared with the text layout supplied) |
| Real phone (touch, notch, sound, vibration) | NOT RUN (desktop Chromium at phone sizes) |
| Pass-and-play hand-over screen | NOT RUN |
