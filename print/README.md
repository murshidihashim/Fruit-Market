# Fruit Market print kit

The tabletop game at rules version 20, in the approved card design (DEC-090 to DEC-096) and the new table set
(PLAN-111). Every card is drawn by the app's own card components (`src/ui/cards.tsx`) and every board, sheet and
token from the game data (`src/engine/data.ts`), so the table and the app show the same names, numbers and pictures.

| Folder | What it is | Built by |
|---|---|---|
| `print/kit` | Every card with its back, the player aid, the character reference | `npx vite-node scripts/print-deck.ts` |
| `print/table` | The board (2 × A3), stall sheets, counters, shutters, bid cards and tokens, and the rules guidebook | `npx vite-node scripts/print-table.ts` and `npx vite-node scripts/print-update.ts` |
| `print/fruit-3d` | 3D-printable fruit pieces in three styles (STL) with a picture of each | `python3 -I scripts/fruit-3d.py print/fruit-3d` |
| `print/art` | The earlier illustrations at print resolution. Not used since rules 18 (the cards use `public/art-ticket`) | kept by hand |

Each command needs Playwright's Chromium (the 3D one needs Python with numpy and Pillow). Rebuild after any change to
names, prices, card text, card design or pictures, and commit the files.

**The board, shutters and pieces are in the table set** (PLAN-111). The earlier printing's board, shutters and pieces
are no longer used. The update pack for it (`print/update-20`) and the two freshness tracker tests (`print/tracker-test`)
are retired; `scripts/print-trackers.ts` stays for reference.

## The cards (`print/kit`)

139 cards in 8 decks, 63 × 88 mm (poker size). Each customer card marks the fruit it wants one more of at 6 stalls
("+1 at 6 stalls").

| Deck | Cards | Sheets | Back |
|---|---|---|---|
| Customers | 36 | 4 | Its own: the fruit that customer wants, in four fixed squares |
| Guests | 5 | 1 | The customer back's design, naming the event the guest comes with |
| Events | 20 | 3 | Pattern, red |
| Lorries | 20 | 3 | Pattern, green |
| Shopkeepers | 8 | 1 | Pattern, kraft |
| Favours | 12 (2 of each) | 2 | Pattern, blue |
| Upgrades | 30 (5 kinds, 6 of each) | 4 | Pattern, slate |
| Standing orders | 8 | 1 | Pattern, black and yellow |

| File | What it is |
|---|---|
| `Cards_<Deck>_A4.pdf` (8 files) | A deck on A4: each page of fronts is followed by its backs. Double-sided, flip on the long edge |
| `Factory_<Deck>_bleed.pdf` (8 files) | One card to a page with 3 mm bleed, for a card printer |
| `Player_Aid.pdf` | A day in five steps and the crier's price rule (one per player) |
| `Character_Reference.pdf` | The shopkeepers, guests and customers as whole cards at a smaller size |
| `Fruit_Market_Print_Kit.pdf` | Everything above in one file, with a contents page |

## The table set (`print/table`)

| File | Pages | What it is | How to print |
|---|---|---|---|
| `Fruit-Market-Board-2xA3.pdf` | 2 | Left: the Wholesale Market (four fruit lanes, today's event and tomorrow's lorry beside their decks, the day track). Right: the customers (today's and tomorrow's rows, the customer deck, the set-up guide) | A3 card, laminated; lay side by side |
| `Fruit-Market-Stall-Sheets-6xA4.pdf` | 6 | One per stall: crate band in front of the shelf band, two shutter lines, a price box on each crate lane, the Fruit sold row | A4 card, gloss laminated (dry-wipe) |
| `Fruit-Market-Counters-2xA4.pdf` | 2 | Four to a sheet: the crate count above the cash track | A4 card, laminated; cut on the dashed lines |
| `Fruit-Market-Shutters-6xA3.pdf` | 6 | One per stall, printed on one side; fold in half along its length (printed side out), then fold the two ends back so it stands | A3 card, one side |
| `Fruit-Market-Bid-Cards-and-Tokens-A4.pdf` | 1 | Six bid cards (63 × 88 mm) and the tokens: cash markers, crate-count markers, served-alone chips, day marker, first-player token, Shade Cloth marker, +$200 chips | A4 card, laminated; cut on the lines |
| `Fruit-Market-Rules-Guidebook-v20.pdf` | 12 | The whole rules guidebook for this table set | Paper, double-sided |

Also needed: 200 fruit pieces (50 of each fruit: 10 mm wooden cubes in blue, green, yellow and red, or 3D printed from
`print/fruit-3d`) and a dry-wipe pen for each stall.

## How the scripts keep the kit right

- `scripts/print-cards.ts` builds every card from the data; `tests/print-kit.test.ts` (part of `npm run verify`) fails
  when the kit and the data disagree. `tests/print-table.test.ts` checks the table set the same way.
- `scripts/print-render.ts` refuses to write a PDF with a picture that did not load, a font that fell back, a page whose
  contents do not fit, or a wrong number of pages.
