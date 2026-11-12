# Fruit Market · text audit · samples

Twenty before and after pairs that show the change of voice. Filled-in values (names, numbers) are shown as they would appear in play. Full list: `TEXT-AUDIT.md`.

## The voice in one paragraph

Short, plain and concrete, like a person at a stall or a clear rulebook. One fact per sentence. Digits with $. One word for one thing (see `GLOSSARY.md`). No exclamation marks except the bell and the win. No puns, no slogans, no winks at the player, nothing said twice on one screen. A flavour line, where one is kept, says what a person does, and seven of them borrow a local detail (open house, kopitiam, jamu, family day, pasar malam, kenduri).

## Counts

| | Strings | Kept | Cut | Rewritten | Correctness | Words before | Words after |
|---|---|---|---|---|---|---|---|
| Cards and app screens | 1317 | 776 | 133 | 385 | 23 | 7465 | 6628 |
| Everything audited (adds the print-only sheets, the guidebook, and spoken labels) | 1636 | 1061 | 134 | 407 | 34 | 12372 | 11549 |

Also found: 83 strings that are in the code but that no screen shows (listed, not counted). Word counts are approximate. "Correctness" rows are text that is wrong or unclear against the rules or the game; some need a decision, not a rewrite.

## The pairs

### 1. Customer card: Coral Mei, quirk

`src/engine/data.ts:459`

- **Before:** Splashes anyone selling soggy fruit.
- **After:** Dives for a living. Not fussy about fruit.
- The old line also contradicted her card: she is a Bargain customer and buys Soft fruit.

### 2. Customer card: DJ Rizal, quirk

`src/engine/data.ts:478`

- **Before:** Drops the beat, then drops by for blueberries.
- **After:** Plays at weddings on weekends.
- A pun replaced by what he does.

### 3. Customer card: Magic Kumar, quirk

`src/engine/data.ts:462`

- **Before:** Pulls three wishes out of a hat. All of them are fruit.
- **After:** Does magic shows at the pasar malam.
- One of seven lines that use a local detail.

### 4. Event card: Heatwave, whole card

`src/engine/data.ts:287`

- **Before:** **Heatwave** · *Melting weather, sizzling sales!* · Watermelon customers pay \$2 more each. All fruit ages an extra step tonight.
- **After:** **Heatwave** · Customers pay \$2 more for each watermelon. Tonight all fruit ages 2 steps.
- Headline cut; the rule says the number that results.

### 5. Event card: Blueberry Glut, rule

`src/engine/data.ts:289`

- **Before:** Deliver 1 extra per 2 stalls, rounded up. Blueberry customers pay \$1 less each.
- **After:** The lorry brings 1 extra blueberry for every 2 stalls (round up). Customers pay \$1 less for each blueberry.
- The old text never said 1 extra of what.

### 6. Favour card: Gossip

`src/engine/data.ts:315`

- **Before:** Play in the evening: secretly see tomorrow's walk-ins: who they are, what they want, how many and their top price.
- **After:** Play in the evening: look at all of tomorrow's walk-ins. Only you see them.
- Two colons and a four-part list down to two short sentences.

### 7. Upgrade card: Juice Bar

`src/engine/data.ts:364`

- **Before:** +\$1 for each okay or soft fruit you sell. Each night up to 2 pieces that would spoil become juice: \$2 each. Tip: before the last day, \$1 soft fruit makes \$2 of juice.
- **After:** +\$1 for each Okay or Soft piece you sell. Each night up to 2 of your pieces that would spoil become juice: \$2 each.
- The tip is advice, not a rule. It was added on purpose, so this one is the owner's call.

### 8. Shopkeeper card: Uncle Benny, perk (Big Basket)

`src/engine/data.ts:436`

- **Before:** Buy 1 extra fruit every day, at the normal price.
- **After:** Buy 1 extra piece each day.
- "At the normal price" answered a question from an older rule.

### 9. Shopkeeper, in the rush: Rosa, after undercutting

`src/engine/data.ts:525`

- **Before:** "A dollar cheaper. Sorry, not sorry!"
- **After:** "Mine was cheaper."
- The line also fires when the gap was \$2. Farah's "Squawk! Mine!" in the same slot is cut: she is not a parrot any more.

### 10. Lorry card: Name

`src/engine/data.ts:120`

- **Before:** Blueberry Bonanza · Watermelon Wagon · Premium Picks
- **After:** Blueberry Lorry · Watermelon Lorry · Apples and Mangoes
- The name now says what is on the lorry. "Premium" is a customer type.

### 11. Standing-order card: The Pie Factory, quirk

`src/engine/data.ts:387`

- **Before:** A thousand pies by Friday.
- **After:** Apple pies for the shops in town.
- The order is for 3 to 5 apples.

### 12. Tutorial tip: After your first purchase

`src/ui/tutorial.ts:12`

- **Before:** **Nice!** It's on your shelf now, at the bottom. The letters under each fruit count your pieces: F fresh, O okay, S soft, G green. Tap Done buying when you're finished.
- **After:** **On your shelf** The piece is on your shelf, at the bottom of the screen. The letters under each fruit count your pieces. Tap Done buying when you have finished.
- Praise swapped for a title that says where to look. The letters were explained one tip earlier.

### 13. How to play: Slide 2, grey paragraph

`src/ui/HowTo.tsx:71`

- **Before:** Secrets are the heart of the game. Stalls are hidden: before the bell you only know how many pieces each rival put out, not which fruit, and never their prices. Buying is done in the open, so watch what they take.
- **After:** Stalls are secret. Before the bell you know only how many pieces each rival has in its crate: not which fruit, and not the price. Buying is done in the open, so you can watch what rivals take.
- Slogan cut; "put out" becomes "in its crate".

### 14. The Bell notice: Line 5

`src/ui/panel.tsx:251`

- **Before:** A tie? Favoured Trade, then freshest fruit, then the Haggler, then the early bird.
- **After:** Ties: Favoured Trade, then fresher fruit, then the Haggler, then whoever bought earlier today.
- No question, no nickname for a rule.

### 15. Morning: Day 1, no event

`src/ui/game/panels/MorningCard.tsx:65`

- **Before:** **Calm Day** · *Clear skies, business as usual!* · Day 1! Let’s make some money!
- **After:** **Calm Day** · No event on Day 1.
- Three exclamation marks to say nothing happens.

### 16. The rush: Result line

`src/engine/story.ts:462`

- **Before:** Rosa sold 2 at full price! · Too pricey for Grandpa Tan!
- **After:** Rosa sold 2 at top price. · Every price was too high for Grandpa Tan.
- Same facts, spoken not shouted; "top price" is the word on the same pop-up.

### 17. Sales summary: Highlight

`src/engine/story.ts:566`

- **Before:** ⭐ Grandpa Tan saved your day with \$12.
- **After:** Your biggest sale: \$12 from Grandpa Tan.
- The emoji goes too: no other screen has one.

### 18. Evening: Upgrade note

`src/ui/panel.tsx:296`

- **Before:** **Stall upgrades** After each Market Day you may build one upgrade. Your stall has room for two. Cash spent is cash you can't win with: 4 days left to earn it back.
- **After:** **Upgrades** You may build 1 upgrade tonight. Your stall has room for 2. 4 days left to earn the cost back.
- The saying is cut. On the same panel, "Psst… the rivals are plotting tonight too." is cut whole.

### 19. Button: Stocking

`src/ui/panel.tsx:140`

- **Before:** Open my stall · 3 out
- **After:** Crate ready · 3 in crate
- The step had three names (Stocking, Fill your crate, Open my stall). One thing, one word: crate.

### 20. Button: Results

`src/ui/game/panels/Results.tsx:96`

- **Before:** Defend your title · Rematch! · Back to menu · Main menu
- **After:** Play again · Play again · Home · Home
- Four labels for two actions.

