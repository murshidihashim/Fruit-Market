# Card mock-up concepts (Look E)

| | |
|---|---|
| Date | 2026-11-07, 12:09 (Asia/Kuala_Lumpur) |
| Status | **Concept mock-ups for you to look at.** Design only (DEC-063). Not print files. Nothing in the game, app, data or rules changed. |
| Cards shown | Customer 25 **Marina Wen** (code key `Jia Wen`), customer 3 **Dr Bubbles** (code key `Daniel`, the densest layout test), shopkeeper **Uncle Benny** (code name `Benny`), plus the backs |
| Portraits | Not drawn. Every portrait window holds a flat grey-beige placeholder shape. The real portrait comes from the approved reference. |

## The files

| File | What it is |
|---|---|
| `cards-overview.png` | **Start here.** One sheet for your phone (2400 px wide). Both concepts, each showing Marina front and back, Dr Bubbles front and back, Uncle Benny front and the shopkeeper back, with short labels. |
| `cards-print.pdf` | 12 pages, one card face per page. Each page shows the full card file with bleed (69 × 94 mm), crop marks on the cut lines, and a one-line caption outside the card. Page size 85 × 110 mm. |
| `cards.html` | The single source of every face. Opened in a browser it shows the overview; printed it makes the PDF pages. Fonts are built in, so it works offline. |
| `README.md` | This note. |

The `characters/` folder next to these files belongs to separate character-sketch work and is not covered by this note.

"Bleed" means 3 mm of extra picture around the card, so a slightly off cut never shows a white edge.

## The two concepts

**Concept 1 · Crate label.** Old fruit-crate label. Gold banner for the name, a round numbered seal, notched corners,
a gold and ink double border, and a soft sunburst behind the portrait. Title font: **Alfa Slab One**.
Customer cards have a terracotta frame. The shopkeeper card has a teal frame, so the two decks are easy to sort.

**Concept 2 · Market poster.** A bold colour band across the top, then a clean, quiet frame. The portrait window is plain
mat colour with no sunburst. Title font: **Lilita One**. Every card has an ink frame. The top band is teal for customers and
terracotta for shopkeepers.

Both concepts use **Fredoka** for numbers, prices and all other text (DEC-061), and only colours from the game's palette
(`src/ui/palette.ts`). Fruit are the game's own pixel sprites (`src/ui/pixel.tsx:88` and `:142`), drawn as sharp squares,
never blurred or enlarged by AI. Uncle Benny's perk uses the app's own Big Basket icon, the pixel crate
(`src/ui/panel.tsx:206`, `src/ui/pixel.tsx:214`).

## What is on each card

**Customer front, top to bottom** (art direction section 8): number and name; portrait window; quirk; order lines
(fruit, one 5 mm circle per piece, top price); freshness type as a word in a fixed band; footer with the price reminder
and the order total.

| | Marina Wen (card 25) | Dr Bubbles (card 3) |
|---|---|---|
| Order lines | apple × 2 at $6, mango × 2 at $10 | mango × 1 at $11, apple × 3 at $6, blueberry × 2 at $5 |
| Total | $32 · 4 pcs | $39 · 6 pcs |
| Type | Everyday · Fresh or Okay | Everyday · Fresh or Okay |
| Quirk | "Reads the mango map twice." (proposed; today's line also mentions coins, a money cue) | "Swears apples power his experiments." |
| Source | `src/engine/data.ts:159`, `:362` | `src/engine/data.ts:137`, `:340` |

Prices are the card prices after today's price shift (`src/engine/data.ts:175`). Types come from
`src/engine/data.ts:181-182`. The footer reminder is the price rule in `RULES.md:103`: fresh pays the full price, okay $1
less, tired $2 less. It is set on two lines ("Fresh pays full" / "Okay −$1 · Tired −$2") so the total fits beside it. The
type words match `RULES.md:104`. Nothing on the card marks the "generous" customers (Dr Bubbles is one under the
Street prices option, `src/engine/game.ts:319`).

**Shopkeeper front:** a "Shopkeeper" band, the name, a large portrait window, the perk name **Big Basket**, and the perk
text copied exactly from `RULES.md:173`: "Buy 1 extra fruit every day; the extra piece (the 7th, or the 9th with a Handcart) costs $2 more."

**Customer back (one design for the whole deck):** the deck word and title, then four fixed spots for fruit. The spots are always
blueberry, watermelon, apple, mango, left to right. Only the fruit a customer wants is shown, with no amounts. An unwanted
fruit's spot stays as a plain empty circle. No name, number, portrait or type. **This fixed order is a proposal waiting
for your approval** (art direction section 9, rule 1).

**Shopkeeper back:** one shared back for all six. Shopkeepers are picked face up, so the back hides nothing.

## Measured sizes

Measured from the rendered page by script (in millimetres on the trimmed 63 × 88 mm card).

| Item | Concept 1 | Concept 2 | Target |
|---|---|---|---|
| Customer portrait window | 55.8 × 25 mm | 55.4 × 25 mm | 24 to 28 mm tall |
| Shopkeeper portrait window | 55.8 × 43 mm | 55.4 × 43 mm | about 40 to 45 mm tall |
| Order circles | 5.0 mm across (0.5 mm ink line) | 5.0 mm | 5 mm |
| Order prices | 14 pt (cap height 3.4 mm) | 17 pt (cap height 4.1 mm) | at least 10 pt |
| Order total | 11 pt | 11 pt | at least 10 pt |
| Smallest text | 6 pt: "Order", "Top price" and the price reminder | 6 pt | at least 6 pt |
| Quirk | 7.5 pt, slanted | 7.5 pt, slanted | one line |
| Freshness type | 8.5 pt word, 8 pt rule | same | fixed inside zone |
| Customer name | 12.5 pt (shrinks to 11.25 pt for "Professor Fatimah") | 17 pt (15.5 pt for the longest) | |
| Shopkeeper name | 16.5 pt | 21 pt | |
| Perk text | 8.5 pt | 8.5 pt | |
| Type band position | x 3.6, y 71.1, 55.8 × 5.7 mm on every customer card | x 2.4, y 72.3, 58.2 × 5.8 mm | same place on every card |

About the 6 pt minimum: 6 pt means the letter box is 2.1 mm tall. The capital letters themselves are 1.46 mm tall in
Fredoka. If you meant 2.1 mm capital letters, the smallest text would need to be about 8.6 pt, and the price reminder and
column labels would no longer fit. Please say if you want that.

Text under 8 pt on a light background is pure black (it stands for K100, the single black printing ink), as art direction
section 4 asks, so it prints sharp. Larger text and lines use the ink colour.

## What was checked, and how

All checks ran on the files in this folder with a script in a headless browser (Playwright), plus `pdfinfo` and `pdffonts`.

| Check | Result |
|---|---|
| Marina and Dr Bubbles wants, prices, totals and pieces match `data.ts` after the price shift | PASS |
| Perk text is exactly `RULES.md:173` | PASS |
| Portrait windows: customers 25 mm, shopkeeper 43 mm | PASS |
| Order circles 5 mm | PASS |
| Smallest text 6 pt; prices at least 10 pt | PASS |
| Text under 8 pt on light ground is pure black | PASS |
| Every character exists in the built-in fonts (no fallback font) | PASS |
| No text box overflows; long names ("Professor Fatimah", "Firefighter Osman") shrink to fit | PASS |
| Longest type rule, "Bargain · Fresh, Okay or Tired", fits the band | PASS |
| All text, prices, icons and circles sit at least 3 mm inside the cut | PASS |
| **Hidden information:** bleed and outer 3 mm of Marina and Dr Bubbles are identical pixel for pixel (fronts and backs, both concepts) | PASS |
| **Hidden information:** making the same card Premium or Bargain changes only the type words, never the frame or colours | PASS |
| **Hidden information:** the type band is in the same place on every customer card | PASS |
| Backs: fixed fruit order and fixed spots; no name, number, price or type | PASS |
| Every colour on the cards is from `src/ui/palette.ts` (plus pure black for small text) | PASS |
| PDF: 12 pages at 85 × 110 mm, fonts embedded | PASS |
| Overview PNG about 2400 px wide (2400 px) | PASS |
| `cards.html` has no outside links (works offline) | PASS |
| Printed proof (colour, line sharpness, readability in the hand) | NOT RUN |
| Colour conversion to CMYK with the factory's profile | NOT RUN |
| Show-through test (phone torch behind the card) | NOT RUN |
| "Recognised from the next seat" test, and the 44 px silhouette test | NOT RUN (no real portraits yet) |
| Factory template check (bleed, safe area, corner radius) | NOT RUN (no factory chosen) |

The NOT RUN items need real portraits, a printer or a factory. They block any claim that these cards are ready to print.

## Things I noticed

- **The fixed back order helps, but not fully.** Today 9 of 36 customers can be told apart by their back. With the fixed
  order, 4 still can: Farid (the only apple-only card, Bargain), Siti, Priya and Kenji. Also, the 3 mango-only backs are all
  Premium (Ahmad, Anna, Devi), and Dr Bubbles' back (blueberry, apple, mango) is shared only by Everyday cards. Marina's back
  (apple, mango) is shared by 5 cards of all three types. Fixing this would mean changing what customers want, which is a
  rules change. These designs change nothing; this is only for your information.
- **Fredoka has no true italic.** The quirk uses a slanted version made by the page. It reads well. A proper italic would
  need another font, so it is not worth adding.
- **"Shopkeeper" (7 pt) is light text on a coloured band.** It is bold and reads well on screen, but a printed proof should
  confirm it.
- **Cut drift.** A framed card shows an uneven border if the cutter drifts by a millimetre. Both frames keep all play
  information well inside, and the outer band is plain colour so small drift is hard to see.
- **The "Fruit Market" title on the backs is a placeholder,** not a logo design. A logo needs its own approval.
- **The display fonts** (Alfa Slab One, Lilita One) are under the SIL Open Font Licence. The one you choose needs its own
  approval and a font credit file before Kickstarter (art direction section 5).
- **Colours are RGB** (screen colours). Teal and gold can look duller when printed. A printed proof is needed before any order.
- **Not in the repo:** the small script that built and checked these files was a one-off and is not saved here.
  `cards.html` is the editable source. Real print templates, filled from the game data by script, come later in their own plan.

## For you to decide

1. **Frame:** Concept 1 (crate label) or Concept 2 (market poster), or a mix of parts.
2. **Customer backs:** show the wanted fruit always in the order blueberry, watermelon, apple, mango, each in its own fixed
   spot? (Today each card uses its own order.)
3. **Title font:** Alfa Slab One or Lilita One.
