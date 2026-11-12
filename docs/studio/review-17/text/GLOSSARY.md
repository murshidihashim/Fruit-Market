# Fruit Market · glossary

One word for one thing. The first table is the set of words chosen; the lists after it are every audited string that uses a different word for the same thing, with what the audit does about it. "Kept as is" means the string was left alone for another reason (for example a card name the rules tables use) and the other word is still in it.
305 uses of a second word were found in the audited text.


## The words chosen

| Word | Meaning and how to use it |
|---|---|
| **stall** | One player's business. Never "shop". (No screen says shop today; the code and its comments do.) |
| **shopkeeper · perk** | The character you play, and the one ability it has for the whole game. Never "trait", "special", "character". |
| **rival · computer** | A rival is any other stall. A computer is a stall the game plays. Never "AI", "opponent", "bot". "Stranger" is fine for a quick match. People are "players". |
| **Wholesale Market** | Where stalls buy fruit. Capital W and M. Never "the market" alone, "wholesale", "the farmers". |
| **lorry** | Brings fruit to the Wholesale Market each morning; also the name of its card. Never "cart", "truck", "wagon", "delivery". |
| **piece · fruit** | A piece is one unit you buy or sell. Fruit is the kind (blueberry, watermelon, mango, apple) or the stuff in general ("all fruit ages"). So: "buy 1 extra piece", "\$2 for each Soft piece", "1 of each fruit". |
| **Fresh · Okay · Soft · Green · ripe** | The four states, always with a capital, as on the board's F, O, S, G boxes. "Ripe" means Fresh, Okay or Soft. Never "unripe", "not ripe", "tired", "soggy". |
| **ages · spoils** | Fruit ages one step each night. A Soft piece that ages spoils and is thrown away. On the table, a piece "slides one box". Never "gets older", "goes bad", "rots". |
| **shelf** | The pieces a stall holds (8; 10 with a Handcart). Always secret. |
| **crate** | The pieces a stall puts on sale today. "In your crate", "3 in crate", "empty". Never "for-sale crate", "out", "put out", "set out", "open your stall". |
| **Stocking (step 3)** | The step where you fill your crate. One name on every screen. |
| **set a price · seal · sealed** | You set one price per fruit, then seal your prices. A rival that has done so is "sealed". Never "locked", "posted", "asks". |
| **the bell** | The moment every stall's prices and crate are shown. Step 4 of the day. |
| **steps of the day** | Morning, Buying, Stocking, The bell, The rush: five steps. Then Evening and Night. Never "beats", "phases". |
| **customer · regular · walk-in · guest** | Customer is anyone who buys. The regular is drawn face up a day ahead. A walk-in is face down until buying ends. A guest comes with an event. Never "shopper", "buyer", "special guest", "special customer". |
| **top price** | The most a customer pays for a Fresh piece today. Okay sells for \$1 less, Soft for \$2 less. Never "full price", "what customers normally pay". |
| **order · standing order** | An order is what one customer wants. A standing order is the Market Day card that stalls bid for. Always "standing order" in full. Its limit is the "highest bid". The stall that wins it is "the winner". |
| **Market Day · Closing Day · last day** | Market Days are days 3, 6, 9 and 12. Closing Day is the name of the last day. In a sentence say "the last day". Never "final day". Write "Day 3" with a capital. |
| **favour card** | Always two words. You "play" it. Never "favour" alone or "card" alone when a favour card is meant. |
| **upgrade** | You "build" one. "Stall upgrade" only as a card type heading. |
| **cash** | What you have and what wins. "\$" with digits. Never "money", "coins", "dollars". |
| **serve a customer alone** | Filling a customer's whole remaining order by yourself. Earns a favour card. |
| **look at (a walk-in)** | What Gossip, Scout and Sharp Ears do. Never "peek", "hear about", "secretly see". |
| **buy** | What a stall does at the Wholesale Market. Never "shop", "shopping". |
| **Daily market** | The once-a-day mode. Capital D, small m. Never "daily challenge", "the daily". |
| **Market League** | The ladder of six stages. Never "League" alone on first mention. |
| **Wardrobe** | The screen where looks are put on. One name for every link to it. |
| **Home** | The first screen. Never "menu", "main menu". |
| **game** | One play from Day 1 to the results. Never "match", except in the mode name "Quick match". |

## Words kept on purpose

- **Lights out** (evening button), **Close for the day**, **jam maker**, **night hawker**, **the crier**: flavour words that name one thing each and are used consistently.
- **Shutter, counter, price tag, cash track, chip, marker**: tabletop pieces. They belong in the printed pack and should not appear in the app (one does: "The shelf stays behind the shutter").
- **Kenduri, Pasar Malam, kampung, sen, aiyo, jimat, rezeki, terima kasih**: already in the game. The proposals add open house, kopitiam, jamu and family day, and reuse pasar malam (twice) and kenduri, in seven flavour lines and nowhere else.
- **Stranger** for the other player in a quick match.

## Same word, two meanings

| Where | Clash |
|---|---|
| "Market Day" (achievement name) · `src/ui/achievements.ts:69` | A Market Day is days 3, 6, 9 and 12. The achievement is for earning 40 dollars in a day. |
| "Regular", "Market Regular", "Juice Bar Regular" (achievement names) · `src/ui/achievements.ts:44`, `src/ui/achievements.ts:75`, `src/ui/achievements.ts:85` | The regular is the face-up customer. |
| "Mango Rush" (lorry) · `src/engine/data.ts:124` | The rush is step 5 of the day. |
| "Premium Picks" (lorry) · `src/engine/data.ts:130` | Premium is a customer type; "at a premium" is also used twice for mango prices. |
| "Hotel Order" (event) · `src/engine/data.ts:284` | Not a standing order, and not a customer's order: it brings a guest. Kept, because the rules tables use the name; noted here so nobody adds a second. |
| "Calm market" (daily twist) beside "Calm Day" (a day with no event) · `src/engine/daily.ts:16` | Two "calm" things that mean nearly, not exactly, the same. |
| "Quick day" (daily twist) beside "Quick" (8-day game) · `src/engine/daily.ts:13` | It is a quick game, not a quick day. |
| "Town Favourite" (achievement) beside "favour card" · `src/ui/achievements.ts:79` | Nothing to do with favour cards; it is for an online win. |
| "Benny Bell" (customer) beside "Uncle Benny" (shopkeeper) and "the bell" · `src/engine/data.ts:482` | Flagged to the owner on 2026-11-07; his answer was "keep it". Unchanged. |
| "Ring the bell" on two buttons · `src/ui/panel.tsx:237`, `src/ui/panel.tsx:262` | One seals your prices; the other only closes a help notice. |
| "served-alone chip" (guidebook) and "sole-supplier cube" (RULES.md) · `scripts/print-update.ts:298`, `scripts/print-update.ts:422` | One table piece, two names in two documents. |
| "winner" (guidebook, app) and "holder" (RULES.md) for the stall with the standing order · `RULES.md` | RULES.md is not in this audit; noted so the two can be brought together. |

## Every place a second word is used

### shopkeeper · perk

**Instead of shopkeeper · perk: trait** (3)

| File:line | Where shown | Text | In the audit |
|---|---|---|---|
| `src/ui/game/panels/TraitPick.tsx:12` | First morning in the Daily market and the Market League: heading | `Choose your trait` | changed |
| `src/engine/game.ts:558` | Refusal: picking a second perk | `'You already have a trait'` | changed |
| `src/engine/game.ts:559` | Refusal: picking a perk you were not offered | `'That trait is not on offer'` | changed |

**Instead of shopkeeper · perk: special** (1)

| File:line | Where shown | Text | In the audit |
|---|---|---|---|
| `src/ui/cards.tsx:136` | Stall sign (picker and printed card): chalkboard heading | `` `Today’s special: ${trait.title}` `` | changed |

### rival · computer

**Instead of rival · computer: AI** (1)

| File:line | Where shown | Text | In the audit |
|---|---|---|---|
| `src/ui/Online.tsx:264` | Lobby: computer stalls buttons | `` {n === 0 ? 'No AI' : `+${n} AI`} `` | changed |

**Instead of rival · computer: opponent** (3)

| File:line | Where shown | Text | In the audit |
|---|---|---|---|
| `src/ui/Online.tsx:140` | Online screen: Quick match button | `{busy ? 'Looking…' : 'Find an opponent'}` | changed |
| `src/ui/Online.tsx:196` | Quick match waiting screen | `<h3>Looking for an opponent</h3>` | changed |
| `src/ui/Online.tsx:198` | Quick match waiting screen | `…on as another player taps Find an opponent. Tap ← to stop looking.` | changed |

**Instead of rival · computer: computer players / computer rival** (4)

| File:line | Where shown | Text | In the audit |
|---|---|---|---|
| `src/ui/App.tsx:415` | Settings: switch | `title="Fast rivals" text="Computer players move quicker."` | changed |
| `src/ui/achievements.ts:63` | Trophies: achievement task (beat_hard) | `text: 'Win against a Hard rival.'` | changed |
| `src/ui/achievements.ts:64` | Trophies: achievement task (hard_sweep) | `…Win a 4-player game against three Hard rivals.'` | changed |
| `src/ui/Online.tsx:233` | Lobby: a computer seat | `Computer rival {i + 1}` | changed |

### Wholesale Market

**Instead of Wholesale Market: lower-case m** (2)

| File:line | Where shown | Text | In the audit |
|---|---|---|---|
| `src/ui/table.tsx:65` | Wholesale Market: heading | `…b class="tk-label" data-a="truck">Wholesale market</b>` | changed |
| `src/ui/game/panels/NightShift.tsx:52` | Night panel: label | `<span class="tk-label">Wholesale market</span>` | changed |

**Instead of Wholesale Market: wholesale alone** (1)

| File:line | Where shown | Text | In the audit |
|---|---|---|---|
| `src/engine/data.ts:299` | Morning news, event pop-up, printed event card, guidebook: rule (durian) | `Wholesale fruit costs $1 less, minimum $1. Custom…` | changed |

**Instead of Wholesale Market: the market / market alone** (12)

| File:line | Where shown | Text | In the audit |
|---|---|---|---|
| `src/engine/data.ts:296` | Morning news, event pop-up, printed event card, guidebook: rule (strike) | `No delivery today. Existing market stock stays.` | changed |
| `src/engine/data.ts:298` | Morning news, event pop-up, printed event card, guidebook: rule (monsoon) | `… No fruit ages tonight, including market stock.` | changed |
| `src/ui/gazette.ts:24` | Printed event card only: effect bullet (priceHike) | `'Market costs +$1'` | changed |
| `src/ui/gazette.ts:31` | Printed event card only: effect bullet (durian) | `'Market costs −$1'` | changed |
| `src/ui/game/panels/MorningCard.tsx:41` | Morning news chip under "+\$1" or "−\$1" (Price Hike, Durian Season) | `small: 'Market prices'` | changed |
| `src/ui/App.tsx:175` | Home: Daily market ticket, before you have played today | `` `Same market for everyone · ${dailyTwist(today… `` | changed |
| `src/ui/game/useGameController.ts:277` | Toast after playing Free Fruit | `'Tap a fruit at the market to take it free'` | changed |
| `src/ui/game/panels/Popovers.tsx:20` | Today's news pop-up (from the top bar): button | `>Back to the market</button>` | changed |
| `src/engine/story.ts:577` | Sales summary: highlight | `` …u' : s.players[p].name} dominated the ${FRUIT[f].name.toLowerCase()} market (${n} sold).` `` | changed |
| `src/ui/HowTo.tsx:48` | How to play, slide 1: first paragraph | `You run a fruit stall in a busy market. Every day you <b>buy</b> fruit f…` | changed |
| `src/ui/Wardrobe.tsx:53` | Wardrobe: under your picture | `This is how you look at the market. Earn achievements to unlock more…` | kept as is |
| `src/engine/game.ts:843` | Refusal: Free Fruit with nothing picked | `'Pick a fruit at the market'` | changed |

**Instead of Wholesale Market: the farmer(s)** (3)

| File:line | Where shown | Text | In the audit |
|---|---|---|---|
| `src/ui/HowTo.tsx:48` | How to play, slide 1: first paragraph | `…ery day you <b>buy</b> fruit from the farmers and <b>sell</b> it to the town's …` | changed |
| `src/ui/tutorial.ts:10` | Tutorial tip "morning": text | `…go to the Wholesale Market, where the farmer has just delivered fruit.'` | changed |
| `scripts/print-deck.ts:344` | Lorry card front: small heading | `<small>Delivery · The farmer’s lorry</small>` | changed |

### lorry

**Instead of lorry: cart / truck / wagon** (4)

| File:line | Where shown | Text | In the audit |
|---|---|---|---|
| `src/engine/data.ts:121` | Lorry card title; "Tomorrow's lorry" strip in the app | `Watermelon Wagon` | changed |
| `src/engine/data.ts:132` | Lorry card title; "Tomorrow's lorry" strip in the app | `Balanced Cart` | changed |
| `src/engine/data.ts:134` | Lorry card title; "Tomorrow's lorry" strip in the app | `Kampung Truck` | changed |
| `src/ui/game/panels/ActionBar.tsx:14` | Bottom bar while the lorry animation plays | `'The cart rolls in…'` | changed |

**Instead of lorry: delivery / deliver** (13)

| File:line | Where shown | Text | In the audit |
|---|---|---|---|
| `src/engine/data.ts:289` | Morning news, event pop-up, printed event card, guidebook: rule (glut) | `Deliver 1 extra per 2 stalls, rounded up. B…` | changed |
| `src/engine/data.ts:290` | Morning news, event pop-up, printed event card, guidebook: rule (goodHarvest) | `Deliver 1 extra of each fruit per 4 stalls,…` | changed |
| `src/engine/data.ts:291` | Morning news, event pop-up, printed event card, guidebook: rule (badHarvest) | `Halve today’s delivery, rounded up. Customers pay $1 mor…` | changed |
| `src/engine/data.ts:296` | Morning news, event pop-up, printed event card, guidebook: rule (strike) | `No delivery today. Existing market stock stay…` | changed |
| `src/engine/data.ts:303` | Morning news, event pop-up, printed event card, guidebook: rule (mangoWindfall) | `Deliver 1 extra ripe mango per 2 stalls, ro…` | changed (correctness) |
| `src/ui/gazette.ts:23` | Printed event card only: effect bullet (badHarvest) | `'Half delivery'` | changed |
| `src/ui/gazette.ts:27` | Printed event card only: effect bullet (strike) | `'No delivery'` | changed |
| `src/ui/game/panels/MorningCard.tsx:48` | Morning news chip (Bad Harvest) | `{ big: 'Half', small: 'The delivery' }` | changed |
| `src/engine/data.ts:135` | Lorry card title; "Tomorrow's lorry" strip in the app | `Quiet Delivery` | changed |
| `src/ui/tutorial.ts:10` | Tutorial tip "morning": text | `…holesale Market, where the farmer has just delivered fruit.'` | changed |
| `scripts/print-deck.ts:344` | Lorry card front: small heading | `<small>Delivery · The farmer’s lorry</small>` | changed |
| `scripts/print-deck.ts:349` | Lorry card back | `backShell('pk-back-lorry', 'Delivery',` | changed |
| `src/ui/game/panels/MorningCard.tsx:112` | Spoken label (MorningCard.tsx) | `` aria-label={`Today's delivery: ${unloaded.map((x) => `${x.n} ${… `` | kept as is |

### piece · fruit

**Instead of piece · fruit: fruit used for one unit** (33)

| File:line | Where shown | Text | In the audit |
|---|---|---|---|
| `src/engine/data.ts:277` | Morning news, event pop-up, printed event card, guidebook: rule (festival) | `Customers pay $1 more per fruit. Add 1 walk-in (2 at 4–6 stalls),…` | changed |
| `src/engine/data.ts:290` | Morning news, event pop-up, printed event card, guidebook: rule (goodHarvest) | `…lls, rounded up. Customers pay $1 less per fruit.` | changed |
| `src/engine/data.ts:291` | Morning news, event pop-up, printed event card, guidebook: rule (badHarvest) | `…ery, rounded up. Customers pay $1 more per fruit.` | changed |
| `src/engine/data.ts:295` | Morning news, event pop-up, printed event card, guidebook: rule (inspector) | `Before buying, pay $2 per Soft fruit on your shelf, up to your cash. N…` | changed |
| `src/engine/data.ts:299` | Morning news, event pop-up, printed event card, guidebook: rule (durian) | `…ess, minimum $1. Customers pay $1 less per fruit.` | changed |
| `src/ui/gazette.ts:16` | Printed event card only: effect bullet (festival) | `'+$1 every fruit'` | changed |
| `src/ui/gazette.ts:22` | Printed event card only: effect bullet (goodHarvest) | `'+1 fruit per 4 stalls'` | changed (correctness) |
| `src/ui/gazette.ts:26` | Printed event card only: effect bullet (inspector) | `'$2 per soft fruit'` | changed |
| `src/ui/game/panels/MorningCard.tsx:49` | Morning news chip (Good Harvest) | `{ big: 'Extra', small: 'Of every fruit' }` | kept as is |
| `src/engine/data.ts:316` | Favour card text: Free Fruit | `Take one fruit of your choice from the Wholesale Market for fre…` | changed |
| `src/engine/data.ts:364` | Upgrade card text: Juice Bar | `` `+$${JUICE_TIP} for each okay or soft fruit you sell. Each night up to ${JUICE_CAP} pi… `` | changed |
| `src/engine/data.ts:366` | Upgrade card text: Handcart | `` `Buy up to ${BARROW_BUY} pieces of fruit a day and hold ${BARROW_SHELF}.` `` | changed |
| `src/engine/data.ts:436` | Perk text: Big Basket (Uncle Benny) | `Buy 1 extra fruit every day, at the normal price.` | changed |
| `src/engine/data.ts:437` | Perk text: Bargain Hunter (Raj) | `Your first fruit each day costs $1 less (never below $1).` | changed |
| `src/ui/game/useGameController.ts:277` | Toast after playing Free Fruit | `'Tap a fruit at the market to take it free'` | changed |
| `src/engine/story.ts:644` | Morning card: first line | `` `${lost} of your fruit spoiled overnight.` `` | changed |
| `src/engine/story.ts:645` | Morning card: Juice Bar line | `` …juice.dollars} from ${juice.pieces} fruit overnight.` `` | changed |
| `src/ui/game/panels/ActionBar.tsx:22` | Bottom bar after playing Free Fruit | `<b class="move">Pick a free fruit</b>` | changed |
| `src/ui/panel.tsx:247` | The Bell notice: line 1 | `'Price every fruit you put out!'` | changed |
| `src/engine/story.ts:617` | Sales summary and evening: tonight's warning | `` `${o.juice} fruit ${o.juice === 1 ? 'becomes' : 'be… `` | kept as is |
| `src/engine/story.ts:618` | Sales summary and evening: tonight's warning ("3 fruit spoil tonight") | `` `${o.spoil} fruit ${spoils} tonight` `` | kept as is |
| `src/ui/game/panels/SalesSummary.tsx:11` | Sales summary on a Pasar Malam day | `…ight hawker bought ${hawk.length} of your leftover fruit (+$${hawk.reduce((a, x) => a + x.…` | kept as is |
| `src/engine/story.ts:584` | Sales summary: highlight | `` `${night.spoil} of your fruit will spoil tonight${juice}.` `` | cut |
| `src/engine/story.ts:694` | Results: a worst moment | `` `${spoiled} fruit spoiled on your shelf.` `` | kept as is |
| `src/engine/story.ts:713` | Results: a worst moment | `` `${unpaid} fruit left unsold at closing (worth $0)… `` | kept as is |
| `src/ui/achievements.ts:39` | Trophies: achievement task (first_sale) | `text: 'Sell a piece of fruit.'` | kept as is |
| `src/ui/achievements.ts:46` | Trophies: achievement task (full_price) | `text: 'Sell 5 pieces of fruit at a customer\'s top price in one…` | kept as is |
| `src/ui/achievements.ts:48` | Trophies: achievement task (sky_high) | `text: 'Sell a piece of fruit for $12 or more.'` | kept as is |
| `src/ui/achievements.ts:84` | Trophies: achievement task (sold_100) | `text: 'Sell 100 pieces of fruit in total.'` | kept as is |
| `src/ui/achievements.ts:85` | Trophies: achievement task (sold_500) | `text: 'Sell 500 pieces of fruit in total.'` | kept as is |
| `src/ui/achievements.ts:86` | Trophies: achievement task (sold_2000) | `text: 'Sell 2,000 pieces of fruit in total.'` | kept as is |
| `src/engine/game.ts:743` | Refusal: buying | `` `You can buy ${buyLimit(pl)} pieces of fruit a day` `` | kept as is |
| `src/engine/game.ts:843` | Refusal: Free Fruit with nothing picked | `'Pick a fruit at the market'` | changed |

### Fresh · Okay · Soft · Green · ripe

**Instead of Fresh · Okay · Soft · Green · ripe: lower-case state word in a sentence** (34)

| File:line | Where shown | Text | In the audit |
|---|---|---|---|
| `src/engine/data.ts:33` | How to play, slide 3: line under the blueberry track | `Cheap and popular, but soft in 3 days. Sell fast!` | changed |
| `src/engine/data.ts:51` | How to play, slide 3: line under the mango track | `Always arrives green for $3. Ripens in 2 nights, then …` | changed |
| `src/engine/data.ts:472` | Customer card and pop-up: quirk (Sleepy Zul) | `Wants fresh fruit. Has not had his coffee.` | changed |
| `src/ui/gazette.ts:20` | Printed event card only: effect bullet (mangoCraze) | `'Influencer: 1 fresh at $15'` | changed |
| `src/ui/gazette.ts:26` | Printed event card only: caption under the picture (inspector) | `…ith a cap and moustache examining soft apples through a magnifier.` | cut |
| `src/ui/gazette.ts:26` | Printed event card only: effect bullet (inspector) | `'$2 per soft fruit'` | changed |
| `src/ui/game/panels/MorningCard.tsx:43` | Morning news chip under "−\$2" (Health Inspector) | `small: 'Per soft piece'` | changed |
| `src/engine/data.ts:364` | Upgrade card text: Juice Bar | `` `+$${JUICE_TIP} for each okay or soft fruit you sell. Each nigh… `` | changed |
| `src/engine/data.ts:367` | Upgrade card text: Premium Display | `Your fresh fruit may be priced $1 above what…` | changed |
| `src/engine/data.ts:368` | Upgrade card text: Ripening Room | `Your green mangoes ripen in one night instea…` | changed |
| `src/engine/data.ts:435` | Perk text: Haggler (Rosa) | `…u win tied prices against equally fresh fruit.` | changed |
| `src/engine/data.ts:556` | Rush: speech tag over Pak Din's stall (sold at the top price) | `'Kept it fresh, sold it full.'` | changed |
| `src/engine/story.ts:754` | Stocking panel on Closing Day with only Green fruit | `stocking: 'Closing Day: green fruit left tonight is worth $0. T…` | changed |
| `src/ui/panel.tsx:229` | Price panel: note under the prices | `…bell. Cheapest stall sells first; okay fruit pays $1 less.` | changed |
| `src/engine/story.ts:102` | Rush detail line: every price too high for a Premium customer | `` `${cust} buys fresh fruit only, up to $${top}${withDi… `` | changed |
| `src/engine/story.ts:713` | Results: a worst moment | `` `${unpaid} green fruit left at closing (worth $0).… `` | kept as is |
| `src/ui/HowTo.tsx:80` | How to play, slide 3: first paragraph | `…uit moves one step older, from <b>fresh</b> to <b>okay</b> to <b>soft</b>…` | changed |
| `src/ui/HowTo.tsx:96` | How to play, slide 4: example | `…b> and pays up to <b>$5</b> for a fresh one ($4 okay; he won't take soft …` | changed |
| `src/ui/HowTo.tsx:98` | How to play, slide 4: example | `<b>Stall A</b> 2 fresh <Fruit id="blueberry" size={18} /…` | changed |
| `src/ui/HowTo.tsx:99` | How to play, slide 4: example | `<b>Stall B</b> 1 okay <Fruit id="blueberry" size={18} /…` | changed |
| `src/ui/HowTo.tsx:100` | How to play, slide 4: example | `<b>Stall C</b> 2 fresh <Fruit id="blueberry" size={18} /…` | changed |
| `src/ui/HowTo.tsx:102` | How to play, slide 4: example | `…othing, even though its fruit was fresh.` | changed |
| `src/ui/HowTo.tsx:115` | How to play, slide 5: night | `…s one step</b>, and anything past soft spoils and is thrown away.` | changed |
| `src/ui/HowTo.tsx:127` | How to play, slide 6: Closing Day | `…ripe fruit for ${JAM_PRICE} each (green fruit gets nothing). That's the l…` | changed |
| `src/ui/tutorial.ts:11` | Tutorial tip "buy": text | `…one fruit, freshest at the top (G green, F fresh, O okay, S soft); fresh …` | changed |
| `src/ui/tutorial.ts:12` | Tutorial tip "bought": text | `…r each fruit count your pieces: F fresh, O okay, S soft, G green. Tap Don…` | changed |
| `scripts/print-update.ts:304` | Guidebook: The fruit | `…h, G = Green. Every mango arrives green; no other fruit does.</p>` | kept as is |
| `scripts/print-update.ts:330` | Guidebook: A day in five beats | `…oads here". Mangoes always arrive green and go in the far green box. The …` | kept as is |
| `scripts/print-update.ts:340` | Guidebook: A day in five beats | `…bove it. Any freshness may go in; green fruit may not. Pieces left on the…` | kept as is |
| `scripts/print-update.ts:422` | Guidebook: Small print | `…ush: cheapest stall first, oldest fresh-enough piece, served-alone chips …` | kept as is |
| `scripts/print-deck.ts:450` | Player aid: step 1, Morning | `…oday’s card at the freshest spot (green fruit at the unripe spot, the Sec…` | changed (correctness) |
| `scripts/print-deck.ts:461` | Player aid: price ladder | `<b>Any fruit</b> (fresh, okay or tired)` | changed (correctness) |
| `src/ui/table.tsx:94` | Spoken label (table.tsx) | `…l="The letters on the boxes: G is green and not ripe yet, F is fresh, O i…` | kept as is |
| `src/ui/table.tsx:389` | Tooltip (table.tsx) | `` … up to $${lines[i].max} each when fresh`}`).join('\n')}`} `` | kept as is |

**Instead of Fresh · Okay · Soft · Green · ripe: unripe / not ripe / tired / soggy** (4)

| File:line | Where shown | Text | In the audit |
|---|---|---|---|
| `src/engine/data.ts:459` | Customer card and pop-up: quirk (Coral Mei) | `Splashes anyone selling soggy fruit.` | changed |
| `scripts/print-deck.ts:450` | Player aid: step 1, Morning | `…freshest spot (green fruit at the unripe spot, the Seconds Lorry at Okay).…` | changed (correctness) |
| `scripts/print-deck.ts:461` | Player aid: price ladder | `<b>Any fruit</b> (fresh, okay or tired)` | changed (correctness) |
| `src/ui/table.tsx:94` | Spoken label (table.tsx) | `…ters on the boxes: G is green and not ripe yet, F is fresh, O is okay, S is …` | kept as is |

### ages · spoils

**Instead of ages · spoils: gets older / moves older** (5)

| File:line | Where shown | Text | In the audit |
|---|---|---|---|
| `src/ui/HowTo.tsx:48` | How to play, slide 1: first paragraph | `…omer a day for every stall. Fruit gets older every night, so you are always ra…` | changed |
| `src/ui/HowTo.tsx:80` | How to play, slide 3: first paragraph | `Every night all fruit moves one step older, from <b>fresh</b> to <b>okay</b>…` | changed |
| `scripts/print-update.ts:283` | Guidebook: The big idea | `…n's customers the same day. Fruit gets older every night, so whatever you buy,…` | changed |
| `scripts/print-update.ts:286` | Guidebook: The big idea | `… clock.</b> Every night all fruit gets one step older. Older fruit sells for less, and …` | kept as is |
| `scripts/print-update.ts:340` | Guidebook: A day in five beats | `…not be sold today, and they still get older tonight.</li>` | kept as is |

**Instead of ages · spoils: rot** (1)

| File:line | Where shown | Text | In the audit |
|---|---|---|---|
| `scripts/print-update.ts:278` | Guidebook: cover | `… charge before your rival, or the rot, gets you?</p>` | changed |

### shelf

**Instead of shelf: stock** (2)

| File:line | Where shown | Text | In the audit |
|---|---|---|---|
| `src/engine/data.ts:296` | Morning news, event pop-up, printed event card, guidebook: rule (strike) | `No delivery today. Existing market stock stays.` | changed |
| `src/engine/data.ts:298` | Morning news, event pop-up, printed event card, guidebook: rule (monsoon) | `… No fruit ages tonight, including market stock.` | changed |

**Instead of shelf: keep back** (1)

| File:line | Where shown | Text | In the audit |
|---|---|---|---|
| `scripts/print-update.ts:82` | Stall sheet | `…. <b>Bottom row = your shelf:</b> kept back. 8 pieces in all (10 with a Handc…` | kept as is |

### crate

**Instead of crate: for-sale crate** (2)

| File:line | Where shown | Text | In the audit |
|---|---|---|---|
| `src/ui/Game.tsx:55` | Pass-the-phone screen: before stocking | `'Fill your for-sale crate. No peeking!'` | changed |
| `src/ui/HowTo.tsx:21` | How to play, slide 2: step 3 | `…', 'Pick the exact fruit for your for-sale crate. Only crate fruit sells. Rivals l…` | changed |

**Instead of crate: out / put out / out for sale** (29)

| File:line | Where shown | Text | In the audit |
|---|---|---|---|
| `src/ui/table.tsx:147` | Rival box while prices are set | `` return n ? `${n} out` : 'none out'; } `` | changed |
| `src/ui/table.tsx:151` | Rival box in the rush | `` return out ? `${out} out` : 'none out'; `` | changed |
| `src/ui/game/panels/Popovers.tsx:61` | Pop-up from the number on a lane: second paragraph | `…lds, only how many pieces it puts out for sale.` | cut |
| `src/ui/panel.tsx:103` | Stocking panel: count beside the heading | `… {total === 1 ? 'piece' : 'pieces'} out` | changed |
| `src/ui/panel.tsx:137` | Stocking panel: note under the rows (only when there are 3 rows or fewer) | `…vals will see how many pieces you put out, not which fruit, and never your …` | cut |
| `src/ui/panel.tsx:140` | Stocking panel: main button | `…tall <small class="btn-sub">{total} out</small></>` | changed |
| `src/ui/game/panels/PricingTable.tsx:34` | Rival crate: under the number | `{n === 1 ? 'piece out' : 'pieces out'}` | changed |
| `src/ui/game/panels/PricingTable.tsx:34` | Rival crate with nothing in it | `<small>nothing out</small>` | changed |
| `src/ui/panel.tsx:200` | Price panel with an empty crate | `You put nothing out today.` | changed |
| `src/ui/panel.tsx:213` | Price panel: each fruit row | `<b>{forSale(s, p, f)} out · {wanted} wanted</b>` | changed |
| `src/ui/panel.tsx:229` | Price panel: note under the prices | `…ou see how many pieces each rival put out, not which fruit: that shows at t…` | changed |
| `src/ui/panel.tsx:247` | The Bell notice: line 1 | `'Price every fruit you put out!'` | changed |
| `src/ui/game/panels/PricingTable.tsx:66` | The bell: an open crate with nothing in it | `<span class="tk-crate-none">nothing out</span>` | changed |
| `src/ui/HowTo.tsx:21` | How to play, slide 2: step 3 | `… Rivals learn how many pieces you put out, not which fruit.']` | changed |
| `src/ui/HowTo.tsx:71` | How to play, slide 2: grey paragraph | `…y know how many pieces each rival put out, not which fruit, and never their…` | changed |
| `src/ui/HowTo.tsx:140` | How to play, slide 7: tip 4 | `…ou only know how many pieces they put out: remember what they hold and you …` | changed |
| `src/ui/tutorial.ts:13` | Tutorial tip "stall": text | `…will only see how many pieces you put out.'` | changed |
| `src/ui/tutorial.ts:14` | Tutorial tip "bid": text | `…ou see how many pieces each rival put out, not which fruit. Prices and crat…` | changed |
| `src/engine/game.ts:1048` | Refusal: a price for a fruit you are not selling | `` …RUIT[b.fruit].plural.toLowerCase()} out for sale` `` | changed |
| `server/room.ts:405` | Online refusal: crate sent at the wrong time | `'Stalls are not being set out now'` | changed |
| `server/room.ts:406` | Online refusal: crate sent twice | `'Your crate is already set out'` | changed |
| `scripts/print-update.ts:108` | Counter | `…fruit here, then bring your crate pieces out, each into the box with the same …` | kept as is |
| `scripts/print-update.ts:288` | Guidebook: The big idea | `…n only how many pieces each rival put out, not which fruit.</li>` | kept as is |
| `scripts/print-update.ts:370` | Guidebook: Standing orders | `…s the freshest pieces rivals have put out, and pays them <b>$1 less than th…` | kept as is |
| `scripts/print-deck.ts:453` | Player aid: step 4, The bell | `…et <b>one price per fruit</b> you put out, then everyone reveals together. …` | changed (correctness) |
| `src/ui/game/panels/PricingTable.tsx:22` | Spoken label (PricingTable.tsx) | `…e bell: only how many pieces each put out"` | changed |
| `src/ui/game/panels/PricingTable.tsx:56` | Spoken label (PricingTable.tsx) | `` …f)?.price ?? '?'}`).join(', ') : 'nothing out'}`} `` | kept as is |
| `src/ui/panel.tsx:104` | Spoken label (panel.tsx) | `` aria-label={`Your crate: ${total} out`} `` | changed |
| `src/ui/game/panels/PricingTable.tsx:28` | Spoken label: a rival crate while prices are set | `` `${pl.name}: ${n ? `${pieces(n)} out, which fruit is secret until the … `` | changed |

**Instead of crate: open / opening the stall** (7)

| File:line | Where shown | Text | In the audit |
|---|---|---|---|
| `src/ui/panel.tsx:140` | Stocking panel: main button | `<>Open my stall <small class="btn-sub">{total} ou…` | changed |
| `src/ui/panel.tsx:197` | Price panel while rivals are still stocking | `Rivals are opening their stalls…` | changed |
| `src/ui/game/panels/PricingTable.tsx:33` | Rival crate while it is still stocking | `{opening ? 'opening…' : 'ready'}` | changed |
| `src/ui/game/panels/ActionBar.tsx:28` | Bottom bar (online) after you stock | `` `Stall open. Waiting for ${waitingFor(humansM… `` | changed |
| `src/ui/game/panels/ActionBar.tsx:28` | Bottom bar while computer stalls stock | `'Rivals are opening their stalls…'` | changed |
| `src/ui/tutorial.ts:13` | Tutorial tip "stall": title | `title: 'Open your stall'` | changed |
| `src/ui/game/panels/PricingTable.tsx:27` | Spoken label: a rival crate while stocking | `` `${pl.name} ${opening ? 'is still opening' : 'has opened'}` `` | changed |

**Instead of crate: crate fruit** (3)

| File:line | Where shown | Text | In the audit |
|---|---|---|---|
| `src/ui/gazette.ts:34` | Printed event card only: effect bullet (pasarMalam) | `'Hawker buys 1 of each crate fruit'` | changed |
| `src/ui/HowTo.tsx:21` | How to play, slide 2: step 3 | `…uit for your for-sale crate. Only crate fruit sells. Rivals learn how many piec…` | changed |
| `scripts/print-deck.ts:452` | Player aid: step 3, Stocking | `…e</b>; then show all crates. Only crate fruit sells.'` | changed (correctness) |

### Stocking (step 3)

**Instead of Stocking (step 3): other names for the step** (4)

| File:line | Where shown | Text | In the audit |
|---|---|---|---|
| `src/ui/Game.tsx:55` | Pass-the-phone screen: before stocking | `'Fill your for-sale crate. No peeking!'` | changed |
| `src/ui/panel.tsx:140` | Stocking panel: main button | `<>Open my stall <small class="btn-sub">{total} ou…` | changed |
| `src/ui/tutorial.ts:13` | Tutorial tip "stall": title | `title: 'Open your stall'` | changed |
| `server/room.ts:405` | Online refusal: crate sent at the wrong time | `'Stalls are not being set out now'` | changed |

### set a price · seal · sealed

**Instead of set a price · seal · sealed: locked** (3)

| File:line | Where shown | Text | In the audit |
|---|---|---|---|
| `src/ui/game/panels/ActionBar.tsx:29` | Bottom bar (online) after you set prices | `` `Prices locked. Waiting for ${waitingFor(humansM… `` | changed |
| `server/room.ts:439` | Online refusal: prices sent twice | `'Your prices are already locked in'` | changed |
| `src/ui/Wardrobe.tsx:24` | Tooltip (Wardrobe.tsx) | `` title={owned ? look.title : `Locked. ${ach?.title}: ${ach?.text}`} `` | kept as is |

**Instead of set a price · seal · sealed: posted** (3)

| File:line | Where shown | Text | In the audit |
|---|---|---|---|
| `src/ui/achievements.ts:49` | Trophies: achievement task (tie_breaker) | `…t: 'Win a sale when another stall posted the same price.'` | changed |
| `scripts/print-update.ts:351` | Guidebook: A day in five beats | `… card's circles, and adds its own posted price to its cash track.</li>` | kept as is |
| `scripts/print-update.ts:410` | Guidebook: Small print | `<li>You are paid your own posted price, not the customer's top pri…` | kept as is |

**Instead of set a price · seal · sealed: asks** (4)

| File:line | Where shown | Text | In the audit |
|---|---|---|---|
| `src/ui/table.tsx:174` | Rival box in the rush | `` …ard.res === 'lost' ? 'no sale' : `asks $${board.price}` `` | kept as is |
| `src/ui/HowTo.tsx:98` | How to play, slide 4: example | `…Fruit id="blueberry" size={18} /> asks <b>$4</b>` | changed |
| `src/ui/HowTo.tsx:99` | How to play, slide 4: example | `…Fruit id="blueberry" size={18} /> asks <b>$3</b>` | changed |
| `src/ui/HowTo.tsx:100` | How to play, slide 4: example | `…Fruit id="blueberry" size={18} /> asks <b>$5</b>` | changed |

**Instead of set a price · seal · sealed: pricing as a step name** (3)

| File:line | Where shown | Text | In the audit |
|---|---|---|---|
| `src/engine/data.ts:319` | Favour card text: Favoured Trade | `Play while pricing: you win every tied price today.` | changed |
| `src/engine/game.ts:822` | Favour card pop-up: why it cannot be played now | `` …during the ${def.when === 'bid' ? 'pricing' : def.when} phase` `` | changed |
| `scripts/print-deck.ts:312` | Favour card front: when to play it (Favoured Trade) | `bid: { small: 'Play while', big: 'Pricing' }` | changed |

### the bell

**Instead of the bell: Ring the bell used for something else** (2)

| File:line | Where shown | Text | In the audit |
|---|---|---|---|
| `src/ui/panel.tsx:237` | Price panel: main button | `Ring the bell <small class="btn-sub">seal {post…` | changed |
| `src/ui/panel.tsx:262` | The Bell notice: button | `>Ring the bell!</button>` | changed |

### steps of the day

**Instead of steps of the day: beats** (3)

| File:line | Where shown | Text | In the audit |
|---|---|---|---|
| `scripts/print-update.ts:326` | Guidebook: A day in five beats | `<h2>A day in five beats</h2>` | changed |
| `scripts/print-deck.ts:466` | Player aid: heading | `<strong>A day in five beats</strong><em>Buy it, show it, pric…` | changed (correctness) |
| `src/ui/game/panels/TopBar.tsx:48` | Spoken label (TopBar.tsx) | `` aria-label={`Today's beats. Now: ${PHASE[s.phase]}`} `` | changed |

**Instead of steps of the day: phases / phase** (5)

| File:line | Where shown | Text | In the audit |
|---|---|---|---|
| `src/ui/HowTo.tsx:12` | How to play, slide 1: list, step 2 | `['Ordinary days', 'Seven phases a day, from morning to night.']` | changed |
| `src/ui/HowTo.tsx:62` | How to play, slide 2: title | `title: 'The seven phases of a day'` | changed |
| `src/ui/HowTo.tsx:65` | How to play, slide 2: first line | `…y day runs through the same seven phases, in this order:` | changed |
| `src/engine/game.ts:735` | Refusal: acting in the wrong step | `` `Not the ${phase} phase` `` | changed |
| `src/engine/game.ts:822` | Favour card pop-up: why it cannot be played now | `` …n === 'bid' ? 'pricing' : def.when} phase` `` | changed |

### customer · regular · walk-in · guest

**Instead of customer · regular · walk-in · guest: shopper** (3)

| File:line | Where shown | Text | In the audit |
|---|---|---|---|
| `src/ui/cards.tsx:72` | Printed customer card: flag on the picture ("Premium shopper") | `` `${PREF_INFO[pref].title} shopper` `` | changed |
| `src/ui/gazette.ts:30` | Printed event card only: red subhead (monsoon) | `Downpour keeps shoppers at home` | kept as is |
| `scripts/print-deck.ts:420` | Character reference page: legend | `<b>${PREF_INFO[p].title} shopper:</b>` | changed |

**Instead of customer · regular · walk-in · guest: buyer** (1)

| File:line | Where shown | Text | In the audit |
|---|---|---|---|
| `src/ui/table.tsx:61` | Wholesale Market: line beside the heading on a rival's buying turn | `` `${buyer.name} is buying` `` | cut |

**Instead of customer · regular · walk-in · guest: special guest / special customer / special order** (6)

| File:line | Where shown | Text | In the audit |
|---|---|---|---|
| `src/ui/cards.tsx:72` | Printed guest card: flag on the picture | `'Special guest'` | changed |
| `src/ui/game/panels/Popovers.tsx:69` | Customer pop-up: badge on a guest | `Special order` | changed (correctness) |
| `src/ui/game/panels/MorningCard.tsx:45` | Morning news chip (guest events) | `{ big: 'Guest', small: 'A special customer' }` | changed |
| `src/ui/achievements.ts:53` | Trophies: achievement task (red_carpet) | `text: 'Sell to all three special guests: the Influencer, the Gym Club and…` | changed (correctness) |
| `scripts/print-deck.ts:292` | Guest card back | `backShell('pk-back-guest', 'Special guest', 'Comes with<br>its event')` | changed |
| `src/ui/table.tsx:394` | Tooltip (table.tsx) | `title="Special guest"` | changed |

### top price

**Instead of top price: full price** (14)

| File:line | Where shown | Text | In the audit |
|---|---|---|---|
| `src/ui/game/panels/Popovers.tsx:72` | Customer pop-up: price key, Fresh | `<Lamp stage="fresh" /> Full price` | changed |
| `src/engine/data.ts:526` | Rush: speech tag over Rosa's stall (sold at the top price) | `'Full price? Lovely.'` | cut |
| `src/engine/data.ts:531` | Rush: speech tag over Uncle Benny's stall (sold at the top price) | `'Full price, full basket!'` | changed |
| `src/engine/data.ts:536` | Rush: speech tag over Ah Chen's stall (sold at the top price) | `'Full price, with a smile.'` | cut |
| `src/engine/data.ts:541` | Rush: speech tag over Saleh's stall (sold at the top price) | `'Full price? Terima kasih!'` | cut |
| `src/engine/data.ts:541` | Rush: speech tag over Saleh's stall (sold at the top price) | `'Rezeki! Full price today.'` | changed |
| `src/engine/data.ts:546` | Rush: speech tag over Raj's stall (sold at the top price) | `'Full price. Lucky day!'` | changed |
| `src/engine/data.ts:551` | Rush: speech tag over Kiki's stall (sold at the top price) | `'Thank you, full price!'` | changed |
| `src/engine/data.ts:551` | Rush: speech tag over Kiki's stall (sold at the top price) | `'So kind of them. Full price!'` | cut |
| `src/engine/data.ts:556` | Rush: speech tag over Pak Din's stall (sold at the top price) | `'Full price. Worth the wait!'` | cut |
| `src/engine/data.ts:561` | Rush: speech tag over Farah's stall (sold at the top price) | `'Full price! I knew it.'` | changed |
| `src/engine/story.ts:462` | Rush result line: sold at the customer's top price | `` `${name(w)} sold ${w.sold} at full price!` `` | changed |
| `src/ui/HowTo.tsx:80` | How to play, slide 3: first paragraph | `…and then it spoils. Customers pay full price for fresh fruit, <b>$1 less</b> f…` | changed |
| `scripts/print-update.ts:301` | Guidebook: The fruit | `…/b> piece sells at the customer's full price. An <b>Okay</b> piece sells for $…` | kept as is |

**Instead of top price: normally pay** (1)

| File:line | Where shown | Text | In the audit |
|---|---|---|---|
| `src/engine/data.ts:367` | Upgrade card text: Premium Display | `…be priced $1 above what customers normally pay.` | changed |

**Instead of top price: top dollar / top alone** (2)

| File:line | Where shown | Text | In the audit |
|---|---|---|---|
| `src/engine/data.ts:531` | Rush: speech tag over Uncle Benny's stall (sold at the top price) | `'Top dollar! Ka-ching!'` | cut |
| `src/engine/story.ts:106` | Rush tag: priced above the customer's top price | `` tag: `over $${top} top` `` | changed |

### order · standing order

**Instead of order · standing order: order alone, meaning the standing order** (6)

| File:line | Where shown | Text | In the audit |
|---|---|---|---|
| `src/ui/game/panels/OrderPanel.tsx:89` | Standing-order strip under the customers (from the bid until it is collected) | `<span class="os-k">Order</span>` | changed |
| `src/ui/game/panels/OrderPanel.tsx:51` | Bidding panel: the three rules | `Lowest bid wins the order and is paid that price for each p…` | kept as is |
| `src/ui/game/panels/OrderPanel.tsx:65` | Bidding panel: pass button | `…? 'Pass instead' : "Pass: I don't want this order"}` | changed |
| `src/ui/game/panels/ActionBar.tsx:27` | Bottom bar while computer stalls bid | `'Rivals are bidding for the order…'` | changed |
| `scripts/print-update.ts:232` | Standing-order card: back | `<span class="disp">Order</span><span class="lab">Fruit Mark…` | changed |
| `src/ui/game/panels/TopBar.tsx:9` | Spoken label: name of the current step | `{ morning: 'Morning', order: 'The order', buy: 'Buying', stall: 'Stocking'…` | changed |

**Instead of order · standing order: most this order pays (for the highest bid)** (1)

| File:line | Where shown | Text | In the audit |
|---|---|---|---|
| `src/engine/game.ts:688` | Refusal: bid above the limit | `` `The most this order pays is $${o.ceiling} a piece` `` | changed |

### Market Day · Closing Day · last day

**Instead of Market Day · Closing Day · last day: final** (6)

| File:line | Where shown | Text | In the audit |
|---|---|---|---|
| `src/engine/data.ts:295` | Morning news, event pop-up, printed event card, guidebook: rule (inspector) | `…shelf, up to your cash. Never the final day.` | changed |
| `src/ui/game/panels/TopBar.tsx:33` | Top bar: countdown in the last 3 days | `` {rem === 1 ? 'Final day' : `${rem} days left`} `` | changed |
| `src/ui/game/useGameController.ts:248` | Stamp across the table on the morning of the last day and of the third-last day | `(rem === 1 ? 'FINAL DAY!' : rem === 3 ? 'FINAL 3 DAYS…` | cut |
| `src/ui/game/panels/ActionBar.tsx:35` | Bottom bar: button after the sales summary | `{s.day >= s.config.days ? 'See final results' : 'Close for the day'}` | changed |
| `src/ui/HowTo.tsx:15` | How to play, slide 1: list, step 5 | `['Final count', 'Most cash wins.']` | changed |
| `src/ui/HowTo.tsx:127` | How to play, slide 6: Closing Day | `On the <b>final day</b> (Closing Day, on by default),…` | changed |

**Instead of Market Day · Closing Day · last day: day N in lower case** (6)

| File:line | Where shown | Text | In the audit |
|---|---|---|---|
| `src/engine/data.ts:440` | Perk text: Nest Egg (Saleh) | `` … of $${START_CASH}, and buy first on day 3.` `` | changed |
| `src/ui/game/panels/OrderPanel.tsx:83` | Standing-order strip: when it is due | `` …due === s.day + 1 ? 'tomorrow' : `day ${o.due}` `` | changed |
| `src/ui/game/panels/OrderPanel.tsx:43` | Bidding panel: label over the title | `Standing order · due day {o.due}` | changed |
| `src/ui/game/panels/OrderPanel.tsx:48` | Bidding panel: what the order wants | `… o.fruit)}</b>, Fresh or Okay, on day {o.due}` | changed |
| `src/ui/achievements.ts:73` | Trophies: achievement task (comeback) | `text: 'Win after being last on day 5.'` | changed |
| `scripts/print-update.ts:179` | Change sheet | `…the last day (in a Standard game, none on day 9).</li>` | kept as is |

### favour card

**Instead of favour card: favour(s) alone** (9)

| File:line | Where shown | Text | In the audit |
|---|---|---|---|
| `src/ui/achievements.ts:17` | Trophies: group heading | `title: 'Events and favours'` | kept as is |
| `scripts/print-update.ts:318` | Guidebook: Set-up | `<li><b>Favours and upgrades.</b> With 2 to 4 sta…` | kept as is |
| `scripts/print-update.ts:359` | Guidebook: A day in five beats | `…rder, each stall may play evening favours (Priority, Gossip). On the evenin…` | changed (correctness) |
| `scripts/print-update.ts:392` | Guidebook: Favour cards | `<p>You earn a favour by serving a customer's whole rem…` | kept as is |
| `scripts/print-update.ts:393` | Guidebook: Favour cards | `<table><tr><th>Favour</th><th>When</th><th>Effect</th><…` | kept as is |
| `scripts/print-update.ts:419` | Guidebook: Small print | `… game</b></td><td>No shopkeepers, favours, upgrades or standing orders: jus…` | kept as is |
| `scripts/print-update.ts:422` | Guidebook: Small print | `…ce, served-alone chips · Evening: favours, upgrades · Night: everything sli…` | kept as is |
| `scripts/print-deck.ts:322` | Favour card front: top strip | `<span class="pk-kick">Favour</span><em>A secret reward</em>` | kept as is |
| `scripts/print-deck.ts:328` | Favour card back | `backShell('pk-back-favour', 'Favour', 'A secret<br>reward')` | kept as is |

### upgrade

**Instead of upgrade: stall upgrade** (7)

| File:line | Where shown | Text | In the audit |
|---|---|---|---|
| `src/ui/panel.tsx:296` | Evening after a Market Day: heading and note | `<b>Stall upgrades</b><span>After each Market Day yo…` | changed |
| `src/ui/HowTo.tsx:13` | How to play, slide 1: list, step 3 | `` … standing order to bid for, and a stall upgrade that evening.`] `` | kept as is |
| `src/ui/HowTo.tsx:125` | How to play, slide 6: upgrades | `That evening you may build <b>one stall upgrade</b> (your stall has room for two)…` | changed |
| `src/ui/tutorial.ts:16` | Tutorial tip "evening": text | `…h Market Day you can also build a stall upgrade.'` | changed (correctness) |
| `scripts/print-update.ts:395` | Guidebook: Stall upgrades | `<h2>Stall upgrades</h2>` | kept as is |
| `scripts/print-deck.ts:352` | Upgrade card | `<span class="pk-kick">Stall upgrade</span>` | kept as is |
| `scripts/print-deck.ts:357` | Upgrade card | `` backShell('pk-back-upgrade', 'Stall upgrade', `Days ${list(MARKET_DAYS)}`) `` | kept as is |

### cash

**Instead of cash: money / coins / dollar** (9)

| File:line | Where shown | Text | In the audit |
|---|---|---|---|
| `src/engine/data.ts:453` | Customer card and pop-up: quirk (Cowboy Jack) | `Pays with coins he panned from the river.` | changed |
| `src/engine/data.ts:477` | Customer card and pop-up: quirk (Marina Wen) | `Pays in coins from far ports. Reads the mango m…` | changed |
| `src/ui/game/panels/MorningCard.tsx:65` | Morning news on Day 1 | `'Day 1! Let’s make some money!'` | changed |
| `src/ui/gazette.ts:24` | Printed event card only: caption under the picture (priceHike) | `… with a rising line, an arrow and piles of coins.` | cut |
| `src/ui/gazette.ts:34` | Printed event card only: caption under the picture (pasarMalam) | `Lanterns, food carts and a hawker counting coins.` | cut |
| `src/engine/data.ts:525` | Rush: speech tag over Rosa's stall (won by pricing \$1 or \$2 lower) | `'A dollar cheaper. Sorry, not sorry!'` | changed |
| `src/engine/data.ts:531` | Rush: speech tag over Uncle Benny's stall (sold at the top price) | `'Top dollar! Ka-ching!'` | cut |
| `scripts/print-update.ts:287` | Guidebook: The big idea | `…t you. Price too low and you give money away.</li>` | kept as is |
| `scripts/print-update.ts:324` | Guidebook: Money: the cash track | `…'s cash at any time. Nobody hands money to anybody: each stall moves its …` | kept as is |

### serve a customer alone

**Instead of serve a customer alone: other wordings** (6)

| File:line | Where shown | Text | In the audit |
|---|---|---|---|
| `src/engine/data.ts:439` | Perk text: Tip Jar (Kiki) | `` `Customers you serve completely by yourself tip you $${LOCAL_FAVOURITE_TIP}.` `` | kept as is |
| `src/ui/panel.tsx:252` | The Bell notice: line 6 | `'Fulfil all of a customer’s orders to earn a …` | changed (correctness) |
| `src/ui/achievements.ts:51` | Trophies: achievement name (sole_five) | `title: 'Sole Supplier'` | kept as is |
| `src/ui/achievements.ts:51` | Trophies: achievement task (sole_five) | `text: 'Serve 5 whole orders on your own in one game.'` | changed |
| `scripts/print-update.ts:298` | Guidebook: What is in the box | `… cash markers, two per stall · 36 served-alone chips, six per stall · 36 custome…` | kept as is |
| `scripts/print-update.ts:422` | Guidebook: Small print | `…first, oldest fresh-enough piece, served-alone chips · Evening: favours, upgrade…` | kept as is |

### look at (a walk-in)

**Instead of look at (a walk-in): peek** (3)

| File:line | Where shown | Text | In the audit |
|---|---|---|---|
| `src/engine/data.ts:442` | Perk text: Sharp Ears (Farah) | `Each evening, peek at one of tomorrow\'s walk-ins. A…` | changed (correctness) |
| `src/ui/HowTo.tsx:114` | How to play, slide 5 | `…alk-ins and <b>Scout</b> lets you peek at one of today's. Cash is your s…` | changed |
| `scripts/print-update.ts:359` | Guidebook: A day in five beats | `…ne fruit lane of his sheet. Farah peeks at one of tomorrow's walk-ins.</p…` | changed (correctness) |

**Instead of look at (a walk-in): hear / heard about** (2)

| File:line | Where shown | Text | In the audit |
|---|---|---|---|
| `src/ui/game/panels/SalesSummary.tsx:13` | Sales summary for Farah | `…tips.length === 1 ? '' : 's'} you heard about tipped you $${tips.reduce((a, x) …` | changed |
| `src/engine/game.ts:825` | Favour card pop-up: Gossip with nothing to see | `'No walk-ins to hear about'` | changed |

**Instead of look at (a walk-in): secretly see** (2)

| File:line | Where shown | Text | In the audit |
|---|---|---|---|
| `src/engine/data.ts:315` | Favour card text: Gossip | `Play in the evening: secretly see tomorrow\'s walk-ins: who they ar…` | changed |
| `src/ui/HowTo.tsx:114` | How to play, slide 5 | `<b>Gossip</b> lets you secretly see tomorrow's walk-ins and <b>Scout<…` | changed |

### buy

**Instead of buy: shopping** (2)

| File:line | Where shown | Text | In the audit |
|---|---|---|---|
| `src/ui/game/panels/ActionBar.tsx:14` | Bottom bar while a rival's purchase animates | `` `${pl?.name ?? ''} is shopping…` `` | changed |
| `src/ui/game/panels/ActionBar.tsx:26` | Bottom bar on a rival's buying turn | `{pl?.name} is shopping…</div>` | changed |

### Daily market

**Instead of Daily market: daily challenge** (2)

| File:line | Where shown | Text | In the audit |
|---|---|---|---|
| `src/ui/store.ts:78` | Home: notice after an update | `'Your unfinished daily challenge was from an older version of the …` | changed |
| `server/meta.ts:82` | Results after a Daily market game: sent too late | `'That daily challenge is closed'` | changed |

**Instead of Daily market: daily in lower case or alone** (6)

| File:line | Where shown | Text | In the audit |
|---|---|---|---|
| `src/net/daily.ts:55` | Text sent by Share your result (the squares are part of the format) | `` `🍎 Fruit Market daily ${g.config.daily}\n$${g.players[m… `` | kept as is |
| `src/ui/achievements.ts:40` | Trophies: achievement task (explorer) | `…nish a game in each mode: New game, Daily, League and online.'` | changed |
| `src/ui/achievements.ts:75` | Trophies: achievement task (streak3) | `text: 'Play the daily market 3 days in a row.'` | changed |
| `src/ui/achievements.ts:76` | Trophies: achievement task (streak7) | `text: 'Play the daily market 7 days in a row.'` | changed |
| `src/ui/achievements.ts:77` | Trophies: achievement task (streak30) | `text: 'Play the daily market 30 days in a row.'` | changed |
| `src/ui/achievements.ts:78` | Trophies: achievement task (daily_top10) | `text: 'Finish in the top 10 of a daily leaderboard.'` | changed |

### Market League

**Instead of Market League: League alone** (2)

| File:line | Where shown | Text | In the audit |
|---|---|---|---|
| `src/ui/achievements.ts:40` | Trophies: achievement task (explorer) | `…me in each mode: New game, Daily, League and online.'` | changed |
| `src/ui/achievements.ts:81` | Trophies: achievement name (league) | `title: 'League Champion'` | kept as is |

### Wardrobe

**Instead of Wardrobe: other names** (3)

| File:line | Where shown | Text | In the audit |
|---|---|---|---|
| `src/ui/Home.tsx:57` | Home bar: button that opens the Wardrobe | `<span>Dress up</span>` | changed |
| `src/ui/Online.tsx:250` | Lobby: heading | `<h3>Your look</h3>` | changed |
| `src/ui/Online.tsx:252` | Lobby: button | `>Open the wardrobe</button>` | changed |

### Home

**Instead of Home: menu** (4)

| File:line | Where shown | Text | In the audit |
|---|---|---|---|
| `src/ui/game/panels/Popovers.tsx:90` | Pause menu: button | `>Quit to menu</button>` | changed |
| `src/ui/game/panels/Results.tsx:96` | Results: main button | `s.config.daily ? 'Back to menu' : win ? 'Defend your title' : 'R…` | changed |
| `src/ui/game/panels/Results.tsx:99` | Results: button | `>Main menu</button>` | changed |
| `src/ui/game/panels/TopBar.tsx:28` | Spoken label (TopBar.tsx) | `aria-label="Menu"` | kept as is |

### game

**Instead of game: match** (7)

| File:line | Where shown | Text | In the audit |
|---|---|---|---|
| `src/ui/achievements.ts:79` | Trophies: achievement task (online_win) | `text: 'Win an online match.'` | changed |
| `src/ui/achievements.ts:80` | Trophies: achievement task (online_10) | `text: 'Finish 10 online matches.'` | changed |
| `src/ui/Online.tsx:198` | Quick match waiting screen | `The match starts as soon as another player …` | changed |
| `src/ui/Online.tsx:272` | Lobby: host's button | `{allReady ? 'Start the match' : v.seats.length < 2 ? 'Waiting …` | changed |
| `src/ui/Online.tsx:275` | Lobby: for players who are not the host | `The host starts the match when everyone is ready.` | changed |
| `src/net/client.ts:36` | Online screen: error | `'Could not find a match. Try again.'` | changed |
| `server/worker.ts:325` | Online screen: error from the server | `'Could not find a match, try again'` | changed |

