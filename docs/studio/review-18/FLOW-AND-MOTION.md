# Fruit Market · flow and motion study (rules version 18)

Study date 2026-11-12 02:46 (Asia/Kuala_Lumpur). Read-only: no code, rule, test or record was changed. This file is the only thing added.

| | |
|---|---|
| Owner's request | "run through with me your desired workflow for this game from start until finish, anything to be improved, work on getting a smooth animation while keeping the boardgame element in tact" |
| What was read | Branch `ccr-d8bcd65d-gblqqb`. The game code as last changed by commit `aa5f087` (rules version 18): `src/ui`, `src/ui/game`, `src/engine/game.ts`, the stylesheets, `scripts/`, `tests/` |
| How | By reading the code. Nothing was played in a browser and no test was run (by instruction). Every length below is worked out from the code's own numbers; none was measured on a phone |
| Not repeated | The screen audit (`docs/studio/review-17/screens/UX-FINDINGS.md`; "UX 11" below means its finding 11) and the agreed mock-ups (`docs/workflow/reports/REP-104.md`) |
| Status | A study and a proposal. Nothing here is approved or built |

## In short

- **The day.** A day has at most 13 steps. You decide something in at most 6 of them (bid, buy, stock, price, Favoured Trade, evening); the other 7 you read or watch (morning, lorry, customers arrive, bell, rush, takings, night). Rules 18 already drops Stocking, Pricing, the tie step and the evening when you have nothing to decide.
- **The watching.** If you never tap, a typical day at 4 stalls holds about 39 seconds of motion and pauses: about 17 in the rush, 10 while rivals buy, 4 at night, 3 at the bell, 2 for the lorry. This agrees with the 41 to 61 seconds a day measured in the audit.
- **Three biggest flow problems.** (1) The rush gives its result away before it plays: at the bell the customer tickets are already ticked and a won favour card is already on your shelf. (2) The rivals' buying turn is 9 to 12 seconds of one piece at a time, and a tap only speeds up the one piece in the air. (3) The price flip, the biggest moment of the day, has no beat of its own: after "Ring the bell" the market flashes back for about a second, and on a Favoured Trade day the open crates are shown twice and the card itself is never seen being played.
- **Why it feels cut.** When the Market Ticket look was added, its stylesheet reset the older rules (`all: unset`), which also switched off the older fades, drops and walk-ins. Today almost every panel in the middle of the table is swapped in one frame. What still moves is mostly "a copy of the fruit flies in an arc", with a jerky landing left over from the pixel look.
- **The plan.** Seven small shared building blocks, most of them already in the code in a first form; ten beats that each move a real thing from where it was to where it is now; a target of about 21 seconds a day untapped and about 5 when tapping through.
- **Main risk.** The browser tests and online play both depend on every beat ending by itself. A beat that waits for a tap would hang the test scripts and hold up a whole online room.

---

## A. Flow map: a solo game from opening the app to "what next"

One row per step, in order. "Auto" means it moves on by itself.

| # | Step | Where in the code | What the player decides | How they leave it | Can rules 18 skip it? |
|---|---|---|---|---|---|
| 1 | App opens: the "Lane Drop" opening on the home screen | `src/ui/App.tsx:52-62`, `src/ui/Opening.tsx:12-16,46-105` | Nothing | Auto after 2.45 s, or a tap anywhere | Not a rules matter. Not played from an invite link or in the automated tests |
| 2 | "Play full screen?" | `src/ui/FullScreenButton.tsx:57-79`, `src/ui/fullscreen.ts:67-71` | Full screen, Not now, or Don't ask again | Tap | Only asked when full screen is possible, not already on, and not refused before |
| 3 | Home (Ticket Booth) | `src/ui/Home.tsx:47-110`, `src/ui/App.tsx:170-204` | Continue, New game, Play a friend, Daily market, Market League, or a side screen | Tap. Daily and League start at once and replace a saved game (UX 2) | No |
| 4 | Continue pop-up (only with a saved game) | `src/ui/Home.tsx:129-140`, `src/ui/App.tsx:191-197` | Resume or Start over | Tap | No |
| 5 | New game pop-up | `src/ui/App.tsx:208-324`, `src/ui/CharacterPick.tsx:18-40` | Name, shopkeeper (which fixes the perk), number and level of rival stalls, 8, 10 or 14 days | Tap "Start game" | No |
| 6 | Perk pick | `src/ui/game/panels/TraitPick.tsx:7-24`, `src/ui/Game.tsx:77-79,130` | One of three perks | Tap a card | Only in the Daily market and the Market League. A New game has no such step: the shopkeeper carries the perk (`src/engine/game.ts:578-582`) |
| 7 | Morning: today's news, the lorry's load, tomorrow's lorry | `src/ui/game/panels/MorningCard.tsx:68-142`, `src/ui/Game.tsx:129-131`, `src/ui/game/panels/ActionBar.tsx:17-20` | Nothing. The game has already turned the event, taken any inspector's fine, given the $5 top-up, put the lorry's fruit in the market, drawn tomorrow's crowd and set the buying order (`src/engine/game.ts:614-720`) | Tap "Start buying" | No. The top-up line shows only on a day a stall was topped up |
| 8 | Standing-order bid | `src/ui/game/panels/OrderPanel.tsx:50-100`, `src/ui/Game.tsx:105-108,132-133` | A price for each piece, or pass | Rivals decide first (auto), then tap "Bid $N a piece" or "Pass" | Only on a Market Day with a new order: days 3 and 6 of an 8 or 10 day game; 3, 6, 9 and 12 of a 14 day game (`src/engine/game.ts:737-744`). A stall without the stake can only pass, but must still tap |
| 9 | The lorry unloads | `src/ui/game/animator.tsx:15-32`, `src/ui/game/useGameController.ts:130-132` | Nothing | Auto, about 2 s; a tap hurries it | Skipped on a day with no delivery |
| 10 | Buying, poorest stall first | `src/ui/table.tsx:46-100`, `src/ui/game/panels/ActionBar.tsx:21-28`, rivals `src/ui/game/useGameController.ts:227-238` | Which pieces (4 a day; more with Big Basket or a Handcart), Undo, a buying favour card (Free Fruit, Scout, Fridge) | Tap "Done buying" or "Skip buying". Rivals: auto | No. A turn is taken even with no cash or an empty market. The owner kept the closing tap (DEC-086) |
| 11 | Customers arrive: walk-ins turn face up, the standing order joins | `src/engine/game.ts:864-899`, `src/ui/table.tsx:437-461` | Nothing | Auto, in one frame | No |
| 12 | Stocking: fill your crate | `src/ui/panel.tsx:46-144`, `src/ui/Game.tsx:103,134` | Which pieces go out for sale | Tap "Open my stall" or "Keep everything back"; then wait for rivals to open (auto, about 1.2 s; `src/ui/Game.tsx:112-113,135`) | Yes: skipped for a stall with no ripe fruit. If no stall has any, Pricing goes too and the rush follows buying (`src/engine/game.ts:892-898`) |
| 13 | Pricing: one secret price for each fruit you put out | `src/ui/panel.tsx:163-238`, `src/ui/Game.tsx:102,136` | The prices (a suggestion is filled in) | Tap "Ring the bell"; then rivals price (auto, about 1.2 s) | Yes: skipped for a stall that put nothing out (`src/engine/game.ts:1130-1135`) |
| 14 | Favoured Trade, the "tie" step | `src/ui/game/panels/PricingTable.tsx:93-113`, `src/ui/Game.tsx:107,137` | Play it or Keep it | Tap. When a rival is asked: auto | Yes: it exists only when a stall holding the card has a tied price (`src/engine/game.ts:1191-1217`) |
| 15 | The bell: every crate open with its prices | `src/ui/game/panels/PricingTable.tsx:46-78`, `src/ui/game/animator.tsx:122-126` | Nothing | Auto, 2.9 s at 4 stalls | Replaced by "No sales today" (1.1 s) when nothing was offered to anyone |
| 16 | The rush | `src/ui/game/panels/Showdown.tsx:49-123`, `src/ui/game/animator.tsx:113-195` | Nothing | Auto, about 3.3 s for each fruit a customer wants; a tap moves on; "Skip" | No |
| 17 | The day's takings | `src/ui/game/panels/SalesSummary.tsx:26-65`, `src/ui/game/panels/ActionBar.tsx:35-39` | Nothing | Tap "Close for the day" | No |
| 18 | Evening | `src/ui/panel.tsx:269-319`, `src/ui/Game.tsx:121-123,139` | Build one upgrade (after days 3, 6, 9, 12), name the Shade Cloth fruit, play Priority or Gossip | Tap "Lights out". Rivals with a choice act by themselves | Yes: only a stall with a choice takes an evening turn (`src/engine/game.ts:1470-1482`). With none, "Close for the day" leads straight to the night |
| 19 | Night: every piece one box older | `src/ui/game/panels/NightShift.tsx:34-70`, `src/ui/game/animator.tsx:197-231` | Nothing | Auto, 3.7 to 4.9 s; a tap hurries it | Not after the last day |
| 20 | The final day | `src/engine/game.ts:1439-1451`, `src/ui/game/useGameController.ts:245-254` | As any day, without evening or night | "See final results" in place of "Close for the day". The jam maker then buys leftover ripe fruit at $1 a piece | Not a skip: the day simply ends after the takings |
| 21 | Results | `src/ui/game/panels/Results.tsx:59-126`, `src/ui/Game.tsx:61-71` | Rematch (or "Defend your title", "Next stage", "Try again"), Share result, Main menu | Tap | No |
| 22 | What next | `src/ui/App.tsx:141-151` | (follows from the button) | Rematch starts Day 1 of a new game at once; Main menu goes to Home; the opening does not play again | No |

Who goes first inside a step (solo): in the bid, the computers decide before you (`src/engine/game.ts:372-378`); in Stocking and Pricing you go first and the computers follow (`src/engine/game.ts:369-370`); in buying and the evening it is the day's line-up, poorest first.

### What stays on the table in each step

| Step | Market lanes | Your shelf (dock) | Crate | Customer row | Rival row |
|---|---|---|---|---|---|
| Morning | Covered by the morning card, although the fruit is already in them | Shown | none yet | Shown | Shown |
| Bid | Covered | Shown | none yet | **Empty.** Today's crowd is shown as chips under the label "Tomorrow" (`src/ui/table.tsx:443,469-471`; partly UX 11) | Shown |
| Buying | Shown | Shown | none yet | Shown | Shown |
| Stocking | Covered | Shown | Yours, in the panel | Shown | Shown |
| Pricing | Covered | Shown | Rivals' as counts; yours is not drawn (UX 13) | Shown | Shown |
| Rivals pricing | **Shown again for about 1.2 s** | Shown | Not drawn | Shown | Shown |
| Tie, bell | Covered | Shown | All open | Shown | Shown |
| Rush | Covered by the card | Shown | Not drawn | Shown, less the customer being served | Shown |
| Takings | Covered | Shown | Not drawn | Shown | Shown |
| Evening | Shown, unless you have a choice | Shown | none | Empty | Shown |
| Night | Redrawn inside the night panel | Shown | none | **Removed** | **Removed** (`src/ui/ticket.css:28`) |
| Results | The whole table is replaced | | | | |

---

## B. Animation inventory

### B1. How speed, skipping, reduced motion and the tests work

| Mechanism | Where | What it does |
|---|---|---|
| Speed factor | `src/ui/anim.ts:5-33` | Every scripted length is multiplied by: the setting (1, or 0.55 with "Fast rivals"), the hurry (1, or 0.15 after a tap), and the rush step (1, or 0.15 after a tap on a rush card) |
| "Fast rivals" setting | `src/ui/App.tsx:415`, `src/ui/game/useGameController.ts:90,236` | Speeds up every table animation, not only the rivals; cuts the pause before each rival action from 380 to 150 ms; turns off the shelf being held back in the rush (`:122`) |
| Tap to hurry | `src/ui/Game.tsx:147`, `src/ui/anim.ts:17` | A tap on the table while an animation plays ends every pause and makes new moves 0.15 as long. Pieces already in the air finish at their old speed. **It is reset at each new game step** (`useGameController.ts:107`), and each rival purchase is its own step. Taps on a button, a market box, a face-up customer ticket or a rival's box do not count (`src/ui/table.tsx:74,83,200,421`), which leaves the gaps, the labels, face-down cards and the shelf dock |
| Rush: tap and Skip | `src/ui/game/panels/Showdown.tsx:52,71`, `src/ui/game/panels/ActionBar.tsx:15` | A tap on the card or the table finishes this customer quickly and the next plays at normal pace. "Skip" is meant to hurry the whole rush and show the final shelves (but see C, row 3) |
| Reading pauses | `src/ui/anim.ts:42-44` | `wait` shrinks to 5% with reduced motion; `hold` does not, so words stay long enough to read |
| Reduced motion, scripts | `src/ui/anim.ts:26-29`, `src/ui/game/animator.tsx:102-111,148-149,168` | Factor 0.05. In the rush nothing flies: the card's steps are left out, the result is held, each stall is simply paid. Elsewhere sprites still cross the table in a few hundredths of a second |
| Reduced motion, stylesheets | `src/ui/styles.css:736-738` and per-part rules | Every CSS animation and transition is switched off |
| Reduced motion, opening | `src/ui/Opening.tsx:13,70,94`, `src/ui/booth.css:118-121` | The finished home is shown still for 0.8 s |
| Automated tests | `src/ui/App.tsx:53`, `src/ui/fullscreen.ts:68` | A test browser (`navigator.webdriver`) skips the opening and the full-screen question. Nothing in the game itself is switched off: the scripts set "Fast rivals" (for example `scripts/smoke.cjs:19`, `scripts/perf-budget.cjs:27`) and retry clicks that miss during an animation (`scripts/smoke.cjs:70-73`). No script asks for reduced motion |

### B2. What moves today

Lengths are at normal speed.

| # | Animation | Where | What starts it | Length | Skip or hurry |
|---|---|---|---|---|---|
| 1 | Opening "Lane Drop": four lanes drop, a fruit pops in each, the lanes fold into the band, the title stamps in, the rest rises | `src/ui/Opening.tsx:12-16`, `src/ui/booth.css:86-116` | The app opening on the home screen | 2.45 s, plus up to 1.2 s waiting for pictures, plus a 0.28 s fade | Tap anywhere |
| 2 | Pop-ups on the home screen and in the game (New game, Continue, Paused, full screen) | `src/ui/styles.css:341-342` | Opening one | 0.15 s fade, 0.2 s pop in 3 steps | No need |
| 3 | Shopkeeper carousel: cards slide, the quip pops, "Swipe to choose" nudges | `src/ui/screens.css:125,137,157` | A swipe or an arrow | 0.35 s; 0.25 s; 1.6 s loop | No need |
| 4 | News card turns over | `src/ui/game/panels/MorningCard.tsx:16-30,89`, `src/ui/ticket.css:251-259` | Each morning, once the picture is ready (waits up to 1.2 s) | 0.55 s | Not blocking |
| 5 | "FINAL 3 DAYS" and "FINAL DAY!" stamp | `src/ui/game/useGameController.ts:245-254`, `src/ui/styles.css:318-320` | The morning of those days | 1.1 s, in 10 steps | Not blocking |
| 6 | Lorry delivery: up to 4 fruit of each kind fly from a point beside the market's label to the lanes | `src/ui/game/animator.tsx:15-32` | "Start buying" (after the bid on a Market Day) | 0.65 s pause, then 0.6 s each, 70 ms apart: 1.3 to 2.3 s | Tap the table |
| 7 | A purchase: a fruit flies in an arc from its box to the buyer (your shelf dock, or a rival's box) | `src/ui/game/animator.tsx:34-53`, `src/ui/anim.ts:81-104` | Each piece bought, yours or a rival's | 0.52 s | Tap the table (that piece only) |
| 8 | Landing squash on the target | `src/ui/anim.ts:72-76` | The end of every flight | 0.3 s, in 4 steps | - |
| 9 | Pause before each rival action | `src/ui/game/useGameController.ts:227-238` | Any rival's turn: buying, bidding, opening, pricing, the evening | 0.38 s each (0.15 s on Fast) | No |
| 10 | Favour played, upgrade built: a label over the stall, "−$N" from its cash | `src/ui/game/animator.tsx:56-71`, `src/ui/anim.ts:128-164` | A card leaving a hand; an upgrade bought | 1.1 s label; 1.3 s number | Tap the table |
| 11 | Stocking: a fruit flies from its shelf row into your crate | `src/ui/panel.tsx:68-83` | Each "+" | 0.48 s, fixed (no speed setting applies) | Not blocking; not drawn with reduced motion |
| 12 | The bell: crates turn over, then stand open | `src/ui/game/animator.tsx:122-126`, `src/ui/ticket.css:340,388` | Every price is in | 0.4 s turn; held 1.5 s plus 0.35 s a stall (2.9 s at 4, 3.6 s at 6) | Tap the table, or Skip |
| 13 | "No sales today" | `src/ui/game/animator.tsx:116-121` | A rush with no offers | 1.1 s | Tap |
| 14 | Routine sales (one stall, not you): fruit to the customer, coins back | `src/ui/game/animator.tsx:80-100,128-130` | After the bell | About 1 s, all at once, 120 ms apart | Tap, or Skip |
| 15 | Rush card: the customer's card moves from the row to the middle; a box for each stall is dealt, the prices turn over together, fruit and coins fly, the result is held, the card goes back | `src/ui/game/animator.tsx:138-175`, `src/ui/game/rush.ts:56-64`, `src/ui/game/panels/Showdown.tsx:25-45`, `src/ui/ticket.css:361-369` | Each fruit a customer wants that two stalls offered or that involves you | In 0.28, deal 0.09 to 0.135 a stall, pause 0.3, turn 0.38, hold 1.8, out 0.26: 3.2 to 3.6 s | Tap: this card. Skip: the rest |
| 16 | Cash counts up as coins land; shelves drop as customers are served | `src/ui/cashShown.ts:21-34`, `src/ui/stockShown.ts` | Each sale in the rush | Up to 10 steps, 40 ms apart | With the rush |
| 17 | "Favour card!" label; bonus tips | `src/ui/game/animator.tsx:178-193` | After the last card | 0.8 s each; 0.5 s | Tap, or Skip |
| 18 | Night: dusk, the panel rises, every piece slides one box, spoiled pieces wobble and drop from your shelf, juice coins fly | `src/ui/game/animator.tsx:197-231`, `src/ui/game/panels/NightShift.tsx:36`, `src/ui/ticket.css:401-406`, `src/ui/ticket-ui.css:120-126` | The day changing | Script: 0.8 + 2.5 s, drops 0.9 s, then 0.4 s. Panel: slide starts at 0.95 s and takes 1.5 s | Tap the table. The slide keeps its own clock |
| 19 | Results: the places slide in; a win or lose jingle | `src/ui/styles.css:363-364`, `src/ui/game/useGameController.ts:246` | The game ending | 0.3 s each in 3 steps, 0.1 s apart | No need |
| 20 | Small loops: waiting dots, toast | `src/ui/styles.css:349,353`, `src/ui/game/useGameController.ts:96-99` | Waiting; a message | 1.2 s loop; 2 s | - |

### B3. Written but not reachable today

Read from the code; these have no matching element in the current screens.

| What | Where | Why it never plays |
|---|---|---|
| The lorry driving in and out | `src/ui/table.tsx:360-375`, `src/ui/styles.css:772-778` | The `Lorry` part is not placed on any screen. Its anchor is a dot one pixel wide (`src/ui/table.tsx:66`, `src/ui/ticket.css:51`) |
| Market fruit spoiling at night | `src/ui/game/animator.tsx:218` | It looks for an anchor named `cart-<fruit>`, which no screen has |
| Customers walking in, panels fading in, crates dropping, lids lifting, price boards flipping, pickable boxes glowing, the shelf sheet rising | `src/ui/styles.css:597,651,745,1874-1878,2381-2428` | The Market Ticket stylesheet resets those elements with `all: unset` (`src/ui/ticket.css:105,200-203,221,317,322`), or the elements are no longer drawn |
| The first opening (sun, stalls, lorry, bell) | `src/ui/styles.css:1045-1064` | Replaced by Lane Drop |

---

## C. The twelve worst cuts and stalls, ranked

| # | What the player sees | Where and why |
|---|---|---|
| 1 | **The rush gives its result away before it plays.** The moment the bell rings, the customer tickets in the row already show the end of the day: filled rows are ticked and greyed, part-filled rows show the number left, satisfied customers are dimmed. A favour card you are about to win is already on your shelf dock. Then the cards are dealt as if nothing were known | The game works out every sale at the bell and writes the results into the customers (`src/engine/game.ts:1330`) and the hands (`:1376-1387`). The screen holds back cash and shelves until the coins land (`src/ui/game/useGameController.ts:119-122`) but not the tickets (`src/ui/table.tsx:410-418`, `src/ui/ticket.css:107,132-133`) or the favour cards (`src/ui/table.tsx:317-324`) |
| 2 | **Rivals buy for 9 to 12 seconds and you cannot hurry them.** One fruit hops to a rival's box, a pause, the next. A tap speeds up only the hop in the air, and tapping the lanes, a ticket or a rival does nothing | Each purchase is its own step: a 0.38 s pause (`src/ui/game/useGameController.ts:236`) and a 0.52 s flight (`src/ui/game/animator.tsx:48`); the hurry is reset at every step (`useGameController.ts:107`); the pause cannot be shortened; taps on buttons and tickets are left out (`src/ui/Game.tsx:147`) |
| 3 | **The rush is long, and "Skip" may be out of reach.** One card for every fruit a customer wants, about 3.3 s each, 13 to 20 s on most days; the counter says "Customer 1 of 5" for four customers (UX 17). While a card is up, a tap on "Skip" appears to act as "next customer" only | Pace: `src/ui/game/rush.ts:56-58`, loop `src/ui/game/animator.tsx:138-175`. "One card per customer" is decided (DEC-086) and drawn (REP-104) but not built. Skip: an unseen tap layer covers the whole screen at the same layer height as the bottom bar and comes later in the page (`src/ui/ticket.css:206,447`; `src/ui/Game.tsx:187,190`). The older stylesheet lifted the bar above that layer (`src/ui/styles.css:2221`); the Market Ticket rule for the bar outranks it. **Read from the stylesheet, not checked on a phone.** The "Tap to move on" hint is hidden (`src/ui/ticket.css:387`) |
| 4 | **The price flip has no beat on a Favoured Trade day, and the card is never seen.** Pricing is replaced in one frame by open crates and a question. After "Play it" the card simply leaves the dock, and "The bell! Every crate is open" then shows the same crates again for 2.9 s | Pricing to tie plays nothing (`src/ui/game/useGameController.ts:116,138`; `src/ui/Game.tsx:137`). Tie to rush goes straight to the bell (`useGameController.ts:133-135`; `src/ui/game/animator.tsx:123-126`), so the "Favoured Trade!" label (`animator.tsx:56-61`) is passed over unless a second stall is still to be asked |
| 5 | **After "Ring the bell" the table blinks four times.** The pricing panel vanishes, the wholesale market shows for about 1.2 s while the rivals price, the bell panel cuts in, the market shows again while any routine sales fly, then the first card | No panel is drawn while a rival prices (`src/ui/Game.tsx:113,135-140` return nothing); each rival takes 0.38 s. No panel has an entry or exit move (`src/ui/ticket.css:200-204`) |
| 6 | **The lorry never arrives.** The fruit is in the lanes from dawn, behind the morning card. After "Start buying" there is a 0.65 s wait for a lorry that is not drawn, then fruit flies from a dot beside the label onto boxes whose numbers do not change. Okay fruit from the Seconds Lorry and ripe windfall mangoes fly to the wrong box | Delivery is added at dawn (`src/engine/game.ts:669-691`); the wait and the flights are `src/ui/game/animator.tsx:19-28`; the target box is always Fresh or Green (`:24`); the lorry itself is not on screen (B3) |
| 7 | **Customers do not arrive: they are swapped.** When the last stall has bought, the face-down walk-ins become face-up tickets in one frame, the Tomorrow strip changes, and the market is replaced by the Stocking panel, all at once | `src/engine/game.ts:864-899`; `src/ui/table.tsx:446-459`; nothing plays for this change (`src/ui/game/useGameController.ts:138`); the walk-in move is unset (`src/ui/ticket.css:105`) |
| 8 | **Night: two rows vanish, and the slide runs on its own clock.** At dusk the customer row and the rival row are removed, so the table jumps; the night panel is cut to the morning card. With "Fast rivals" on and nothing of yours spoiling, the panel closes at about 2.0 s, before the slide ends at 2.45 s; a tap closes it mid-slide. The market's spoiled fruit is never shown dropping | Rows: `src/ui/ticket.css:28`. Clock: script `src/ui/game/animator.tsx:202-203`, panel `src/ui/game/panels/NightShift.tsx:36` and `src/ui/ticket.css:403`. Market drop: B3 |
| 9 | **The Market Day bid is muddled and its result is silent.** The customer row empties and today's crowd appears as chips labelled "Tomorrow". While the computers bid, the panel says "Bid in. Waiting for the other stalls" before you have bid. When bidding ends nobody is shown winning: a thin strip changes while the lorry animation plays, and the winner's stake leaves its cash with no coin | `src/ui/table.tsx:443,469-471`; `src/ui/game/panels/OrderPanel.tsx:73`; `src/ui/Game.tsx:133`; award `src/engine/game.ts:781-801`; no case for it in `src/ui/game/animator.tsx:54-71` |
| 10 | **Your own purchase lands before it arrives.** The box's number drops and the shelf's rises at the tap; the fruit follows half a second later. For that half second "Done buying" and Undo are replaced by the word "Bought!". Undo snaps everything back with no motion | State first, flight after (`src/ui/game/useGameController.ts:123-138`); bar `src/ui/game/panels/ActionBar.tsx:16,21-27`; undo `useGameController.ts:310-321` |
| 11 | **Money appears and disappears without coins, and the game ends on a cut.** The $5 top-up and the inspector's fine are a line of text; the standing order's stake is silent; on the last day the jam maker's money is never shown; the table is replaced by the results in one frame, with the places sliding in for 0.3 s | `src/engine/game.ts:633-653,793-797,1439-1451`; `src/ui/game/panels/MorningCard.tsx:120-124`; the game ending has no case in `src/ui/game/useGameController.ts:127-138`; `src/ui/Game.tsx:61-71`; `src/ui/styles.css:363-364` |
| 12 | **With reduced motion the bell cannot be read.** The open crates, the one view of every stall's prices together, show for about 0.15 s; "No sales today" for 0.06 s | The bell uses the pause that shrinks (`src/ui/game/animator.tsx:125,118`; `src/ui/anim.ts:27,42`) and not the reading pause (`src/ui/anim.ts:44`) |

### Smaller points found while reading

| Point | Where |
|---|---|
| About 7 seconds of every day is the fixed 0.38 s pause before each rival action (18 to 21 actions a day) | `src/ui/game/useGameController.ts:236` |
| Landings and pops move in 3 or 4 jerks (a hold-over from the pixel look) | `src/ui/anim.ts:75`, `src/ui/styles.css:249,318,363` |
| "Fast rivals" says "Computer players move quicker" but speeds up every animation | `src/ui/App.tsx:415`, `src/ui/anim.ts:15` |
| After you build an upgrade the evening does not end itself: one more tap on "Lights out" with nothing left to decide | `src/engine/game.ts:1507-1523` |
| Stocking: the piece is in the crate before the flying fruit lands; the flight ignores Fast and the hurry | `src/ui/panel.tsx:49-57,68-83` |
| Sharp Ears' evening peek has no moment of its own (UX 34) | `src/engine/game.ts:1454-1460` |
| The first-game tip still squeezes Stocking and Pricing (UX 1): the rule is still in the stylesheet | `src/ui/styles.css:2077`, `src/ui/Game.tsx:147` |

### Taps that carry no decision

"Skip buying" with no cash or an empty market, and "Done buying" at the limit (UX 15; the owner kept this tap, DEC-086). "Pass" when you lack the stake (`src/ui/game/panels/OrderPanel.tsx:93-97`). "Ring the bell" on the suggested prices (UX 13). "Lights out" after your only choice is made. "Play full screen?" at every opening until "Don't ask again". "Start buying" and "Close for the day" are fair: they say "I have read this".

---

## D. Motion plan that keeps the board-game feel

### D1. Five rules

1. **Things travel; they do not appear.** Every change on the table is shown as a piece, a card, a price tag or a coin going from where it was to where it is now. Numbers change when the thing lifts off or lands, not before.
2. **The table stays put.** The customer row, the rival row, the lanes and your shelf keep their places all day. What is decided in the middle comes in as a sheet laid on the table, and one sheet carries pricing, the bell, the rush and the takings, so the lanes never flash between them.
3. **Nothing is shown before its beat.** Tickets, favour cards, cash and shelves all wait for the customer who causes the change.
4. **Every beat ends by itself and can be hurried.** One tap anywhere on the table hurries what is playing, and the hurry lasts until your next decision. Reading pauses end on a tap.
5. **Smooth and cheap.** Only position, size and fade are animated; soft starts and landings, no stepped moves, no bounce; at most about 12 moving things at once. No new library: the browser's own animation calls, already used in `src/ui/anim.ts`, are enough.

Suggested feel: travel across the table 320 ms, starting gently and landing softly (`cubic-bezier(.3, 0, .2, 1)`); a coin 360 ms; a card turn 280 ms; a sheet in 180 ms (`cubic-bezier(.2, .8, .2, 1)`), out 120 ms; a count 40 ms a step and never over 400 ms; a reading pause 1.0 to 1.2 s.

### D2. Shared building blocks

| Block | What it does | In the code today | To add |
|---|---|---|---|
| Move a piece or coin | A copy of the piece travels between two named spots | `fly` (`src/ui/anim.ts:81-104`), the spots are `data-a` marks (`src/ui/table.tsx`) | A flat or low path as well as the arc; a call on lift-off and on landing so numbers change then; a soft landing; a cap on how many move at once |
| Move one whole thing (FLIP) | A card, a crate or a sheet that exists before and after is measured in both places and slid between them | Written once, for the rush card (`src/ui/game/panels/Showdown.tsx:25-45`) | Make it shared. The old place must be measured before the state changes (`src/ui/game/useGameController.ts:103-126`) |
| Turn a card | Back to face in two halves | Three separate versions: news (`src/ui/ticket.css:251-259`), crate (`:340`), rush price (`:369`) | One version for news, walk-ins, price tags, favour cards |
| Count a number | A number climbs or falls in small steps | Cash only (`src/ui/cashShown.ts:21-34`) | Box counts, the top-up, the results |
| Hold back until shown | The screen keeps the old value until the beat that changes it | Cash (`src/ui/cashShown.ts`) and shelves (`src/ui/stockShown.ts`) | The lorry's load, customer tickets, favour cards |
| Sheet in and out | A panel slides onto the table and off again | None in the Market Ticket look | One rule for the middle panel (`src/ui/Game.tsx:124-141`, `src/ui/ticket.css:200-204`) |
| Beat clock | Pauses, reading pauses, hurry, one speed for scripts and stylesheets | `wait`, `hold`, `hurryUp`, `speedStep` (`src/ui/anim.ts:17-45`); the speed reaches the stylesheet only in the rush (`Showdown.tsx:74`) | A hurry that lasts until the next decision; the speed on the whole table; the lengths named in one place |

### D3. Beat by beat

| Beat | What moves, from where to where | Length and feel | Hurried or skipped by | With reduced motion | Hooks into |
|---|---|---|---|---|---|
| Lorry unloads | The morning card lifts off the lanes. The lorry slides in beside the market's label. One crate of each fruit slides from the lorry to that fruit's entry box (the Green box for green fruit, the Okay box for the Seconds Lorry, the Fresh box for ripe windfall pieces). The box's number counts up as the crate lands. The lorry stays while stalls buy and drives off after the last | Lorry 300 ms; four crates 360 ms each, 120 ms apart; about 1.2 s | A tap: the numbers jump to full | No travel; the numbers fade in (150 ms) | `src/ui/game/animator.tsx:15-32`; a held-back market count; `delivery`, `deliveryUnripe`, `deliveryRipe`; the unused `Lorry` (`src/ui/table.tsx:360-375`); spots `lorry`, `m-<fruit>-<box>` |
| Buying: lane to shelf | The tapped piece lifts out of its box and slides in a low arc to that fruit's place on your shelf dock. The box's number drops as it lifts; the shelf's rises as it lands; "−$3" leaves your cash. A rival's pieces go to its box and its "bought today" marks count up. A rival's whole turn is one beat, its pieces leaving 100 ms apart | 320 ms a piece. A rival's turn about 1.1 s; three rivals about 3.3 s (9.6 s today) | A tap anywhere, lanes included when it is not your turn, hurries all rivals until your next decision. Your own taps can still be queued three ahead, as now | The numbers change; the buying stall's box is outlined for 300 ms | `src/ui/game/animator.tsx:34-53`; rival pacing `src/ui/game/useGameController.ts:227-238`; hurry `:107`; the bottom bar keeps Undo and Done in place (`src/ui/game/panels/ActionBar.tsx:16,21-27`); Undo slides pieces back (`useGameController.ts:310-321`) |
| Customers arrive | The walk-in cards turn face up one after another; the standing order's card is dealt to the front; the Tomorrow strip slides the next crowd in. Then the Stocking sheet comes onto the table | 280 ms a card, 100 ms apart; about 0.6 s | A tap | Cards shown face up at once | `src/ui/table.tsx:437-495`; `src/ui/ticket.css:105`; old places measured in `useGameController.ts:103-126` |
| Stocking: shelf to crate | On "+" the piece slides from its shelf row into your crate and is drawn there when it lands; on "−" it slides back. On "Open my stall" the crate shuts and slides to its place beside the rivals' crates, which drop in as each rival opens | 260 ms a piece; crate 300 ms | Never blocks: each "+" can be tapped at once | The piece is drawn in the crate at once | `src/ui/panel.tsx:49-57,68-83,104`; `src/ui/game/panels/PricingTable.tsx:19-42` |
| The bell | On "Ring the bell" your price tags turn face down. The sheet stays; each rival's crate gets its "sealed" tag as it comes in. The bell swings and sounds. Then stall by stall, in today's line-up, the lid lifts and the price tags turn face up. A pause to read | Seal 200 ms; bell 300 ms; each crate 220 ms lid and 280 ms tags, 180 ms apart (about 1.0 s at 4 stalls); read 1.2 s; about 2.6 s (2.9 s today, for a still picture) | A tap ends the pause | Crates shown open at once; the reading pause is kept | `src/ui/game/animator.tsx:122-126`; `src/ui/game/panels/PricingTable.tsx:46-78`; `src/ui/Game.tsx:113,128,135-138`; `src/ui/ticket.css:340,388` |
| Favoured Trade played | The question comes in as a strip under the open crates, not as a new panel. On "Play it" the card leaves your dock (or the rival's box), slides to the tied price tag, turns face up and stamps it. The rush then starts; the bell is not shown a second time | Slide 320 ms, turn 280 ms, stamp 180 ms, pause 600 ms; about 1.4 s | A tap ends the pause | The card's name is shown on the stall for 1 s | `src/ui/game/panels/PricingTable.tsx:93-113`; `src/ui/game/useGameController.ts:116,133-138`; `src/ui/game/animator.tsx:56-61`; the favour chips need a spot (`src/ui/table.tsx:317-324`) |
| A sale in the rush | The customer's card slides from the row to the middle (built today). The stalls' offers lie under it in price order and turn over together. For each fruit wanted: the pieces slide from the selling stall's box to the customer's card, coins slide back from the card to that stall's cash, the cash counts up as they land, and that row of the ticket is ticked then. The card slides back to its place. Sales to one rival alone stay on the board, as now | Card 250 ms; turn 300 ms; pieces 300 ms each, 80 ms apart, 4 at most; coins 360 ms; read 1.0 s; back 200 ms. About 2.4 s for one fruit, 0.5 s more for each further fruit; about 10 s for four customers (17 s today) | A tap: next customer. "Skip to the end" always in reach | No travel; the result is held 1 s; each stall is paid (as today) | `src/ui/game/animator.tsx:80-100,113-195`; `src/ui/game/rush.ts:56-64` and its test `tests/rush.test.ts:74-82`; `src/ui/game/panels/Showdown.tsx`; `src/ui/table.tsx:410-418`; tickets held back |
| Favour card drawn | In the rules a favour card is drawn in the rush, when one stall alone fills a customer's whole order (`src/engine/game.ts:1376-1387`), so it belongs to that customer's card and not to the evening: a card slides from the customer to the stall, face down to a rival's box, turned face up on your dock | 340 ms and a 280 ms turn | With the rush | The card is drawn on the dock when the customer's card closes | `src/ui/game/animator.tsx:178-183`; `src/ui/table.tsx:314-325`; favour cards held back |
| Evening: card played, upgrade built | Upgrade: the chosen card slides from the offer to your stall and its mark lands on the dock; coins slide from your cash to the market. Priority: your stall's mark slides to the front of tomorrow's line. Gossip and Sharp Ears: tomorrow's walk-in chip turns face up, for you only | Moves 320 ms, turns 280 ms; under 1 s each | A tap | The label is held 1 s | `src/ui/game/animator.tsx:56-71`; `src/ui/panel.tsx:269-319`; `src/ui/table.tsx:468-495` |
| Night | Dusk falls and the rows stay, dimmed. Every piece slides down one box in its lane (two in a Heatwave, none in a Monsoon, none for the Shade Cloth fruit). A piece leaving the Soft box tips off the lane and fades. Juice Bar pieces become coins that slide to your cash. The panel lifts and the morning card is dealt | Dusk 400 ms; slide 900 ms a box; spoil 300 ms; dawn 200 ms; about 2.5 s (3.7 to 4.9 s today) | A tap, and the slide ends with it | Before and after cross-fade; held 1.5 s | `src/ui/game/animator.tsx:197-231`; `src/ui/game/panels/NightShift.tsx:36`; `src/ui/ticket.css:28,401-406`; `src/ui/ticket-ui.css:120-126` |
| The $5 top-up and other coins at dawn | Coins slide from the market to the topped-up stall's cash, which counts up to $5 as they land. The same block serves the inspector's fine (coins leave) and the standing order's stake: the coins slide onto the order's card and stay there until the due day, then slide back or are swept off | 360 ms a coin, 5 at most, 60 ms apart; about 0.7 s | A tap | The number changes; the line of text is held | `src/ui/game/panels/MorningCard.tsx:57-60,120-124`; `src/ui/cashShown.ts`; `dayTopUps`, `dayFines`; `src/ui/game/panels/OrderPanel.tsx:103-121` |
| Results | On the last day the jam maker's coins arrive for the leftover fruit. "Market closed". The stalls line up and each total counts up, last place first; the winner's card rises and is stamped; then the buttons | Jam 0.8 s; count 0.5 s a stall; stamp 300 ms; about 3 s | A tap shows the final picture | The final picture at once | No case today in `src/ui/game/useGameController.ts:127-138`; `src/engine/game.ts:1439-1451`; `src/ui/game/panels/Results.tsx:84-98` |

### D4. Time budget for one day

A typical day at 4 stalls: three rivals buying three pieces each, four customers wanting five fruit between them, one routine sale, one favour card, nothing of yours spoiling, never tapping. Worked out from the code, not measured.

| Beat | Today, normal | Today, "Fast rivals" on | Target, normal |
|---|---|---|---|
| Lorry | 2.1 s | 1.2 s | 1.2 s |
| Rivals buying | 9.6 s | 4.8 s | 3.3 s |
| Customers arrive | 0 (a cut) | 0 | 0.6 s |
| Rivals open and price | 2.4 s | 1.1 s | 0.8 s |
| The bell | 2.9 s | 1.6 s | 2.6 s |
| The rush | 17.5 s | 9.6 s | 10.4 s |
| Favour and tip labels | 0.8 s | 0.4 s | inside the cards |
| Night | 3.7 s | 2.0 s | 2.5 s |
| **A day** | **about 39 s** | **about 21 s** | **about 21 s** |
| A 10-day game | about 6.5 min | about 3.5 min | about 3.5 min |

Target when tapping through: about 5 seconds a day, because every beat ends on a tap and the hurry lasts until the next decision. A Market Day adds about 1.5 s (the bids turned over, the stake put down). Suggested ceiling for any day at 4 stalls: 25 s.

### D5. Three choices for the owner

1. **The time target.** About 21 seconds of motion a day if you never tap, about half of today's. Right, or should it be shorter?
2. **The rush.** After each customer, should the game move on by itself after about a second (recommended: nobody is held up online, and a tap still moves on sooner), or wait for "Next customer" every time?
3. **Rivals buying.** May a rival's whole turn be shown as one beat, its pieces leaving together (recommended), or must each piece be seen one at a time?

---

## E. Risks

| Area | Risk | How to contain it |
|---|---|---|
| Unit tests | The rush's pace is pinned: the turn and the hold together must be 2.0 to 2.5 s and a card at most 3.5 s (`tests/rush.test.ts:74-82`). The tap behaviour is pinned (`:84-98`), and so are the rush card's class names and the words "Customer 1 of 3" (`:118-135`), the shelf's fruit spots (`tests/game-layout.test.ts:40`) and the phone grid (`:105-117`) | Change those tests in the same step as the rush, as a stated change, not as a side effect |
| Browser tests | The scripts find their way by button words and class names (`scripts/smoke.cjs:22-67`, `scripts/perf-budget.cjs:48-69`) and wait fixed times for their screenshots (2.9 s after the bell, 0.7 s after Lights out: `scripts/smoke.cjs:58,64`). A beat that waits for a tap would stop them | Every beat ends by itself; keep the button words; let the screenshot scripts ask for reduced motion |
| Browser tests (found while reading; not run) | The tie step shows two buttons where the solo script expects one (`scripts/smoke.cjs:54-57` against `src/ui/game/panels/PricingTable.tsx:105-110`). On a game where the player is asked, the script would loop to its limit, and it reports by a printed line only (`:77`), so the run would not fail | Teach the script the tie step and make it fail when the results are not reached, before any motion work |
| Performance budget | The budget counts page elements on the game screen (800 at most), any single piece of work over 200 ms (250 in CI) with the processor slowed four times, and the time to open the game screen (350 ms; 600 in CI), at 360 by 740 with "Fast rivals" on (`scripts/perf-budget.cjs:12-15,20,27-33,89-95`; `.github/workflows/ci.yml:30-31`; one retry, `scripts/e2e.mjs:21`). **It does not measure smoothness**, so a jerky animation passes. The last element count on file is 596, from before the Market Ticket look (`docs/studio/09-PRIORITISED-ROADMAP.md:60`); today's count was not measured | Add a count of slow frames during the rush and the night to the budget. Moving copies add two elements each and only while they move |
| Slow phones | Measuring places and moving things in the same moment forces the phone to lay the page out again and again. Each moving copy carries a drawn shadow (`src/ui/styles.css:451`). Each sale redraws the whole table (`src/ui/Game.tsx:42`) | Measure everything first, then move; animate only position, size and fade; at most 12 copies; drop the shadow when many move; hold back with small stores that redraw only what changed |
| Online play | Every state from the server is queued and animated in turn (`src/ui/game/useGameController.ts:172-205`), and the server sends each computer purchase as its own state (`server/room.ts:539-548`). Longer beats put a slow watcher behind the room; the "continue" votes after the morning and the takings then make everyone wait for that player (`server/room.ts:500-510`). A friend's purchases arrive as they tap, so they cannot be gathered into one beat. After a reconnect the screen jumps from an old state to the newest and could play the wrong beat. The leak check reads what the server sends (`scripts/e2e-online.cjs:98-110`), not what the page draws | Hurrying is local. Gather only states already waiting in the queue. After a reconnect, show the new state without a beat. Never draw a face or a price under a card back before its turn (the rule the rush card follows today, `src/ui/game/panels/Showdown.tsx:98-105`) |
| Pass and play | The hand-over screen replaces the whole table (`src/ui/Game.tsx:49-58`) and waits for animations to end (`useGameController.ts:70`), so longer beats delay it. Shelf-to-crate and buying moves show one player's secret shelf. The night shows only the last player's shelf (`useGameController.ts:111`) | No move may run across a hand-over; held-back views are kept per viewer and let go when the table closes (as today, `useGameController.ts:94`) |
| Reduced motion | It is treated today as "very fast" by the scripts and "off" by the stylesheets, which is how the bell became unreadable | One rule: no travel, state shown at once, every reading pause kept |
| Scope | Motion does not change a rule. "Put out all wanted", ending buying by itself, or waiting for a tap in the rush are flow choices and need the owner's word; the owner has already kept the closing tap on buying (DEC-086) | Each step below is its own small work package for approval |
| Double work | Steps 2 to 8 touch the screens that the REP-104 rebuild will redraw | Do each beat together with its screen |

---

## F. Suggested order of work

Each step can be shipped alone and leaves the game complete. None changes a rule or needs a new library.

| Step | What ships | Why here |
|---|---|---|
| 0. Repairs | The bell and "No sales today" readable with reduced motion. "Skip" reachable during the rush (after a one-minute check on a phone). A tap hurries until your next decision, and the lanes count as the table. The bid step keeps the customer row and labels the strip correctly; "Bid in" only after you bid. The night slide follows the script's clock. The 0.65 s wait for the undrawn lorry goes. The solo test learns the tie step and fails when it does not finish | Small, safe, and each one removes a stall today |
| 1. Building blocks | The lengths named in one place and one speed for scripts and stylesheets. The shared move with lift-off and landing calls and a soft landing. The sheet in and out for the middle panel. A slow-frame count in the performance budget | Nothing is redrawn, yet panels stop blinking and pieces stop jerking. Every later step uses these |
| 2. The rush | Tickets and favour cards held back until their customer. One card for each customer (DEC-086, REP-104). Pieces to the customer, coins to the cash, the favour card to the stall. The pace test changed with it | The longest beat and the worst spoiler |
| 3. The bell and Favoured Trade | The sheet stays while rivals price. Tags seal, the bell rings, crates open in turn. The tie question under the open crates; the card seen being played; no second bell | The moment the whole day builds to |
| 4. Buying | A rival's turn as one beat. Numbers change on lift-off and landing. The bottom bar holds still. Undo slides back | The second-longest wait |
| 5. Lorry and arrivals | The lorry drives in, unloads into held-back lanes, drives off. Walk-ins turn face up | The start of the day reads like setting up a table |
| 6. Stocking | Shelf to crate; the crate carried to the pricing table | Joins Stocking to the bell |
| 7. Night and dawn | The rows stay; one clock; the dawn deal. Coins for the top-up and the fine. On Market Days the bids turned over and the stake put on the card | Closes the loop of the day |
| 8. The end | The jam maker, the final count, the results | Once a game; last |

---

## Checks

| Check | Result |
|---|---|
| Code read for the flow, the animations and the constraints (files named above) | PASS |
| Game played in a browser | NOT RUN (by instruction) |
| Lengths measured on a phone | NOT RUN. All lengths are worked out from the code, at 60 frames a second and with no slow-down |
| "Skip" out of reach during a rush card (C, row 3) | NOT RUN. Read from the stylesheet; needs a look on a phone |
| Solo test script and the tie step (E) | NOT RUN. Read from the script |
| Page element count against the 800 limit | NOT RUN |
| `npm run verify` | NOT RUN. No code was changed |
