# Fruit Market print kit

The tabletop game's cards and paper pieces, at rules version 18, in the approved card design (DEC-090 to DEC-096).
Every card is drawn by the app's own card components (`src/ui/cards.tsx`) from the game data
(`src/engine/data.ts`), so the table and the app show the same names, numbers and pictures. Nothing is typed twice.

| Folder | What it is | Built by |
|---|---|---|
| `print/kit` | Every card with its back, the player aid, the character reference | `npx vite-node scripts/print-deck.ts` |
| `print/update-18` | For someone who holds the earlier printing: guidebook, stall sheets, counters, the cards that changed | `npx vite-node scripts/print-update.ts` |
| `print/tracker-test` | The two freshness trackers, as test packs (DEC-089) | `npx vite-node scripts/print-trackers.ts` |
| `print/art` | The earlier illustrations at print resolution. Not used since rules 18 (the cards use `public/art-ticket`) | kept by hand |

Each command takes about 20 seconds or less and needs Playwright's Chromium (`npx playwright install chromium`).
Rebuild all three after any change to names, prices, card text, card design or pictures, and commit the PDFs.
`node scripts/print-backs.cjs <folder>` (used by the QA sweep) builds the kit into a folder of your choice.

## The cards (`print/kit`)

139 cards in 8 decks, 63 × 88 mm (poker size).

| Deck | Cards | Sheets | Back |
|---|---|---|---|
| Customers | 36 | 4 | Its own: the fruit that customer wants, in four fixed squares |
| Guests | 5 | 1 | The customer back's design, naming the event the guest comes with |
| Events | 20 | 3 | Pattern, red |
| Lorries | 20 | 3 | Pattern, green |
| Shopkeepers | 8 | 1 | Pattern, kraft |
| Favours | 12 (2 of each) | 2 | Pattern, blue |
| Upgrades | 30 (5 kinds, 6 of each: one for every stall) | 4 | Pattern, slate |
| Standing orders | 8 | 1 | Pattern, black and yellow |

| File | Pages | What it is |
|---|---|---|
| `Fruit_Market_Print_Kit.pdf` | 200 | Everything below in one file, with a contents page (about 11 MB) |
| `Player_Aid.pdf` | 1 | A day in five steps and the crier's price rule (one per player) |
| `Character_Reference.pdf` | 5 | The shopkeepers, guests and customers as whole cards at a smaller size |
| `Cards_<Deck>_A4.pdf` (8 files) | 38 in all | A deck on A4: each page of fronts is followed by its backs |
| `Factory_<Deck>_bleed.pdf` (8 files) | 155 in all | A deck for a card printer: one card to a page |

All 19 files together are about 21 MB.

### Printing at home

1. A4 card, 250 to 300 gsm. Print at **100% / actual size** with **background graphics on**.
2. Print **double-sided, flipping on the long edge**. Each page of fronts is followed by its page of backs, mirrored
   left to right, so each back lands behind its own front. The whole set is **19 sheets**.
3. Cut on the dashed lines. Cards sit edge to edge, so one cut serves two cards.
4. Print one sheet first and hold it to the light: if the backs are off, check the printer is not set to "fit to page".

The player aid is one single-sided A4 page for each player.

### Printing at a card factory

The `Factory_*` files have one 63 × 88 mm card to a page with **3 mm bleed** on every side (69 × 94 mm) and crop marks
outside that; each page names its card in the margin, and how many to print when a card has copies. Customers and
guests go front, back, front, back (their backs differ). The other decks have their fronts first and their one shared
back last. The files are RGB; ask the printer to convert to CMYK and send a proof first.

## The update pack (`print/update-18`)

For someone who holds the earlier printing (the rules 15 printing, with or without its rules 17 update pack). It is
not needed with a fresh print of `print/kit`, except for the guidebook, the stall sheets and the counters, which are
only here.

| File | Pages | What it is | How to print |
|---|---|---|---|
| `Fruit-Market-Update-18-1-Stall-Sheets-and-Counters.pdf` | 14 | A change sheet (2 pages: start here), six stall sheets, six counters with the cash track | Single-sided; the counters are landscape, cut on the dashed line |
| `Fruit-Market-Update-18-2-Replacement-Cards.pdf` | 16 | The four decks that changed throughout, whole: 8 standing orders, 30 upgrades, 8 shopkeepers, 12 favours | Double-sided, flip on the long edge: 8 sheets |
| `Fruit-Market-Rules-Guidebook-v18.pdf` | 10 | The whole rules guidebook at rules version 18 | Either way |

The change sheet also lists six cards to correct by hand (three customers, two lorries, one event) and has patches to
lay over the board's words and its green mango price. New cards have a new design and a new back, so a deck is
replaced whole: never mix new cards into an old deck. What changed since the earlier printing is written once, in
`scripts/print-cards.ts` (`replacedDecks`, `handFixes`).

## The tracker test packs (`print/tracker-test`)

Two ways to track freshness on the table, to try before one is chosen for the kit (DEC-089). Neither changes a rule.

| File | Pages | What it is |
|---|---|---|
| `Fruit-Market-Tracker-Test-1-Ruler.pdf` | 4 | Fruit stays in its column and a ruler slides one column a night: how-to, stall sheet, market board, eight rulers to cut out |
| `Fruit-Market-Tracker-Test-2-Tray.pdf` | 3 | Fruit slides one box a night and the crate is a loose tray: how-to, stall sheet, two trays to a page |

Single-sided. For six stalls print the stall sheet six times, and the tray page three times.

## How the scripts keep the kit right

- `scripts/print-cards.ts` builds every card, sheet and factory page from the data. `tests/print-kit.test.ts` (part
  of `npm run verify`) fails when the kit and the data disagree: a deck of the wrong size, a card printed too often or
  not at all, a card without its picture or its back, a back that would not land behind its own front.
- `scripts/print-render.ts` refuses to write a PDF with a picture that did not load, a font that fell back, a card or
  page whose contents do not fit, or a wrong number of pages.
- A card whose words need more room than the app's card allows lets its picture give way a little further, in print
  only, and the script names it when it runs. Today that is one card: Blueberry Glut (its picture is 2 mm shorter).
- On screen a pattern back repeats its tile as a background. In print the same tile is laid as a grid of pictures:
  the same pattern, in a file less than half the size.

## Not in the repository

The market board, the shutters, the fruit pieces, the price tags and the markers were made outside the repository
with the earlier printing and are not rebuilt here.
