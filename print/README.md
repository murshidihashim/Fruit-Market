# Fruit Market print kit

The tabletop game's cards, rulebook pictures and player aid, in the Great Fruit Exchange deck art (DEC-066, PLAN-049).
Customers are Trading Cards (Art 3 "At work"), shopkeepers are Stall Signs (Art 2 "Over the counter") and events are
Gazette front pages (Art 1 "The scene"). Every name, number and price comes from the game data (`src/engine/data.ts`,
rules version 9), drawn with the same card designs as the app (`src/ui/cards.tsx`), so the table and the app match.

## What is in `print/kit`

| File | Pages | Size | What it is |
|---|---|---|---|
| `Fruit_Market_Print_Kit.pdf` | 127 | 8.7 MB | Everything below in one file, with a contents page |
| `Player_Aid.pdf` | 1 | 0.1 MB | A day in five beats and the crier's price rule (one per player) |
| `Character_Reference.pdf` | 4 | 4.1 MB | Rulebook pictures: 6 shopkeepers, 3 special guests, 36 customers with number, name, type and picture |
| `Cards_Customers_A4.pdf` | 8 | 3.5 MB | 36 customer cards; each back shows that customer's fruit, in the card's own order |
| `Cards_Guests_A4.pdf` | 2 | 0.4 MB | 3 special guests (The Influencer, The Gym Club, The Hotel Chef) and their backs |
| `Cards_Shopkeepers_A4.pdf` | 2 | 1.2 MB | 6 shopkeeper cards and their backs |
| `Cards_Events_A4.pdf` | 4 | 1.6 MB | 13 event cards and their backs |
| `Cards_Favours_A4.pdf` | 4 | 0.3 MB | 12 favour cards (2 of each) and their backs |
| `Cards_Deliveries_A4.pdf` | 6 | 0.8 MB | 20 lorry cards (10 lorries, 2 of each) with the 2, 3 and 4 stall rows, and their backs |
| `Cards_Upgrades_A4.pdf` | 2 | 0.2 MB | 4 stall upgrades with their cost, and their backs |
| `Factory_Customers_bleed.pdf` | 72 | 3.5 MB | For a card printer: one card per page, front then back |
| `Factory_Shopkeepers_bleed.pdf` | 7 | 1.2 MB | For a card printer: 6 fronts, then the one shared back |
| `Factory_Events_bleed.pdf` | 14 | 1.6 MB | For a card printer: 13 fronts, then the one shared back |

All 13 files together are about 26 MB.

## Printing at home

1. Use A4 card (250 to 300 gsm). Print at **100% / actual size** with **background graphics on**.
2. Print **double-sided, flipping on the long edge**. Each page of fronts is followed by its page of backs, mirrored
   left to right, so each back lands behind its own front.
3. Cut on the dashed lines. Cards are 63 × 88 mm (poker size) and sit edge to edge, so one cut serves two cards.
4. The circles on a customer card hold the fruit pieces sold to that customer (RULES.md, "Order circles").

Print a test page first: if the backs are a little off, check that the printer is not set to "fit to page".

## Printing at a card factory

The `Factory_*` files have one 63 × 88 mm card per page with **3 mm bleed** on every side (69 × 94 mm) and crop marks
outside that; each page names its card in the margin. Customer backs differ (each shows that customer's fruit), so the
customer file goes front, back, front, back. Shopkeepers and events share one back each, at the end of their file.
The files are RGB; ask the printer to convert to CMYK and send a proof first (colours shift a little in print).
Guests, favours, deliveries and upgrades have no factory file yet; they can be added the same way when needed.

## Rebuilding the kit

From the repository root:

```
npx vite-node scripts/print-deck.ts print/kit
```

It takes about 20 seconds and needs Playwright's Chromium (`npx playwright install chromium`). The script stops with
an error if a card count is wrong, a picture file is missing, a picture fails to load, or anything spills off a card
or a page. Rebuild after any change to names, prices, card text or art. (`node scripts/print-backs.cjs <folder>`,
used by the QA sweep, now builds this same kit.)

Pictures come from `print/art` (the owner's art at print resolution, about 240 to 300 ppi at card size). They are
stored in the PDFs as high-quality JPEG to keep the files small.

## What is missing or still to decide

- **Guest portraits.** The three guests have no picture of their own. Each borrows its event's scene for now
  (The Influencer: Mango Craze, The Gym Club: Superfood Trend, The Hotel Chef: Hotel Order). The guest sheet and the
  reference page say so.
- **Customer card back.** The owner's PDFs have no card backs. The customer back (navy sunburst, red ribbon, the
  wanted fruit on a cream plate) and the other backs are new designs in the deck-art style; the owner has not yet
  approved them.
- **Favour, delivery and upgrade cards** have no illustrations by design: they use the deck-art lettering, banners,
  colours and fruit icons only.
- **Not restyled yet:** the play mat, stall sheet and screen, tokens, price cards and paper money from the earlier kit.
- **Stall-sign hooks.** The hanging strings and bar above each stall sign in the PDF sit outside the card and are
  left out.
- **Picture crop.** The PDF cards are taller than poker cards, so pictures are cropped to fit 63 × 88 mm (most on
  events with a two-line headline).
- The Gazette effect bullets (▸) are not in the deck fonts, so the printer's fallback font draws them.
