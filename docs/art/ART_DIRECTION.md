# Fruit Market · Art direction for the Kickstarter edition (Look E)

| | |
|---|---|
| Version | 0.1 draft, 2026-11-07 (Asia/Kuala_Lumpur) |
| Status | **Awaiting the owner's approval** (DEC-063, PLAN-048). Nothing here changes the game or the app until approved. |
| Evidence | REP-087 (audit of the repo, the Drive print kit, the decision history and outside research; three independent reviews) |
| Applies to | Printed cards, box, rulebook, Kickstarter page and store art first; the phone game later, in a separate plan |
| Does not change | Rules, balance, prices, card text, saves, online play, the pixel board in the app |

## 1. The direction in one line

**Crate-label world, townsfolk characters.** The world, frames and graphics borrow the look of old fruit-crate
labels and market posters ("The Great Fruit Exchange"). The people borrow the warmth and personality of
"Orchard & Oddballs", but stay ordinary townsfolk of the harbour market (DEC-039). Both are drawn in one flat,
screen-print style using the colours the game already has.

Both direction names are **internal style labels only**. The product stays *Fruit Market*. "Fruit Exchange"
echoes an old US citrus brand name, and "Orchard" is already the name of a well-known children's game.

### Why a hybrid, not one of the two

Three independent reviews scored each option out of 45 (REP-087 §4):

| Option | Tabletop publisher | Production lead | Game identity | Main weakness |
|---|---|---|---|---|
| The Great Fruit Exchange alone | 23 | 25 | 22 | Vintage ads drew people as stereotypes; detailed litho art blurs on a phone |
| Orchard & Oddballs alone | 27 | 25 | 27 | "Quirky imperfection" drifts from image to image with AI and slides toward caricature |
| **Controlled hybrid (Look E)** | **36** | **36** | **35** | Two renderings of each person (pixel token, card portrait) must stay in step |

The crate-label language fits this game unusually well: the ten named lorries (Blueberry Bonanza, Orchard Run,
Watermelon Wagon…) read as crate brands, events read as market posters, and the existing palette (terracotta,
gold, teal, cream, ink) is already a mid-century print palette.

## 2. Art principles

1. **Play information comes first.** On every card, the wants, prices and freshness type are read before the picture.
2. **One person, one idea.** Each character is an ordinary person with a job or hobby, one prop and one pose.
   The joke is what they *do*, never who they *are* (DEC-018, DEC-041).
3. **Flat and printable.** Flat colour, one clean ink line, one shadow tone. It prints sharply, shrinks well and can be checked by a script.
4. **The board shows tokens; cards show portraits.** The pixel people stay on the app's board. Illustrated
   portraits appear inside card frames: printed cards, the box and full-card views.
5. **Art never tells a secret.** Nothing in a picture may hint at hidden information (section 9).
6. **Graphics are built; people are drawn.** Frames, backs, logo and type are made as templates in code (no AI).
   Only character pictures are drawn, and every final one is finished by a person.
7. **Nothing is borrowed.** No real labels, brands, living artists or real people as references.

## 3. What comes from where

| Element | Source | How it is made |
|---|---|---|
| Card frames, deck backs, banners, ribbons, sunbursts, "port" stamps, logo lock-up, banknotes | Crate-label world | Vector templates in the repo, filled from `src/engine/data.ts` by script. No AI. |
| Box lid, box sides, rulebook headers, Kickstarter banners | Crate-label world | Same templates. The box scene is one separate key illustration made last. |
| Shopkeepers (6), customers (36), guests (3), people on event cards | Townsfolk characters | AI-assisted drafts from the approved reference, finished by a person, logged in the manifest |
| Fruit, ripeness, icons, tokens, stall props | Current pixel art (DEC-033) | Unchanged. Prints as sharp vector squares. |
| People on the app board (18 to 34 px) and wearable looks | Current pixel art | Unchanged. Pixel tokens are later refreshed to match each new portrait (same hair, prop and colours). |

## 4. Colour

- **Palette:** only the roles in `docs/ART-STYLE.md` §2 and `src/ui/palette.ts`. Ink `#2b2438`, mat `#fbf3e1`,
  paper `#fffdf7`, terracotta `#c8553d`, gold `#f2c14e`, teal `#3e8f8c`, the four fruit-lane tints, and the
  existing sprite colours. A short list of approved character accent colours is added to the same file when approved.
- **Skin:** the five human tones in use (pale, a, b, c, d) plus up to three more (a deeper brown, an olive and a
  warm mid tone) so the "whole world" cast is fairly shown. Green, blue and grey "skins" are creature leftovers and are banned.
- **Per character:** at most six flat fills plus the ink line: skin, hair, shirt, one accent, one prop colour and one shadow tone.
- **No** gradients, glows, photo shading or per-card background tints.
- **Print:** colours are converted to CMYK once, at export, with the printer's profile. Small text and fine lines
  print as pure black (K100), not as the ink colour. Teal and gold can dull in CMYK, so a printed proof is required before any order.

## 5. Typography

- **Numbers and prices:** Fredoka (owner's choice for telling 5, 2, 3 and 8 apart, DEC-061).
- **Sentences and rules:** Fredoka. **App labels:** Pixelify Sans (unchanged).
- **Display (logo, box, card titles):** at most one added bold, crate-label style face under the SIL Open Font
  Licence. Candidates to test: Alfa Slab One, Bowlby One, Lilita One. It needs its own approval, and a font credit file before Kickstarter.
- **No text inside any illustration.** Every word on a card comes from the template and the game data.

## 6. Characters: proportion and silhouette

- **Card portrait:** head and shoulders plus one prop held at chest height. Same camera for everyone: a slight
  three-quarter turn, head about 45% of the frame height, eyes about 40% from the top, shoulders cut at the same line.
- **Full figure** (box, Kickstarter, turnarounds): about 3½ heads tall, compact and sturdy, rounded hands, simple feet.
- **Faces:** one face construction for everyone (simple eyes with one highlight, small nose, clear mouth), so
  expressions read at small sizes. Natural asymmetry is welcome. Exaggerated features are not.
- **Build types:** slim, average, broad and elderly. Every build appears across all three freshness types.
- **Silhouette language:** each person has one dominant shape from hair or hat plus prop, for example
  broad and round (Benny), tall and narrow, square and steady, or angular and quick. **Test:** filled solid black at 44 px, every head must still be told apart.
- **Told apart by:** hair or hat outline, one prop, build, skin tone and shirt colour, as the pixel cast already is.
- **Expressions:** each approved character gets a sheet of six (neutral, delighted, sly, stung, surprised,
  thinking). For shopkeepers these match their existing lines (undercut, full price, stung, lost). Cards show
  the resting face only. Using expressions in the app needs a separate decision (DEC-042 said no expression frames for now).

## 7. Line, shading, texture and background

- **Line:** one ink colour and one even weight with rounded ends, about 1% of the master's width, never thinner
  than 0.5 pt when printed. No sketchy, hatched or doubled lines. Charm comes from pose and prop, not line noise.
- **Shading:** flat fills with one hard-edged shadow tone. Light from the top left (as in the pixel art).
- **Texture:** none on people. An optional paper-grain or litho overlay is one master file, laid by script on
  frames, backs and the box only, never under text, order circles or the freshness-type band.
- **Background:** every character is delivered on a transparent background. Every customer portrait window uses the
  same flat mat colour. Scenes exist only in the box and Kickstarter key art.

## 8. Visual hierarchy

### Printed customer card (63 × 88 mm; 3 mm bleed; 3 mm safe margin)

| Zone (top to bottom) | Height, about | Content |
|---|---|---|
| Header | 9 mm | Card number, title ("Sailor Jia Wen") |
| Portrait window | 24 to 28 mm | The person, on the shared mat colour; nothing important in the outer 3 mm |
| Quirk | 6 mm | One line in italics |
| Orders | up to 27 mm | Up to three lines: fruit icon, up to five 5 mm order circles, top price |
| Freshness type | 6 mm | A word plus a short rule ("Premium · Fresh only") in a fixed inside zone, never a colour code |
| Footer | 5 mm | Freshness price reminder, order total |

Reading order: orders and prices, then freshness type, then name and portrait, then quirk. The card template
will be tested with the densest card (three order lines) before any portrait is final.

### Other cards
- **Shopkeeper:** the hero card. Large portrait (about 40 to 45 mm tall), name, perk name and perk text.
  The perk is public, so a perk prop (Benny's big basket) is welcome.
- **Guest:** a customer layout with a "Guest" band.
- **Backs:** one master file per deck (section 9).

### Phone
- **Board, queue and chips (18 to 34 px):** pixel tokens, unchanged.
- **Full-card views (72 px and up):** the illustrated portrait inside the card frame, such as the character pick
  and a customer card opened face up. This comes in a later app plan, under the performance budget.
- **Store, splash and home art:** Look E graphics, replacing today's off-palette launcher art (later plan).

### Print sizes
- Card file 69 × 94 mm (with bleed): 815 × 1110 px at 300 ppi; character masters at least 2048 px so they can also be printed larger.
- Box lid (300 mm square, if chosen): about 3,600 px at 300 ppi. Lid wrap: about 5,700 px. The box art is drawn at that size. It is never an enlarged card portrait.
- Upscaling cannot recover detail. Pixel art is only ever scaled by whole numbers or exported as vectors.
- All print figures are to be confirmed against the chosen factory's own guide (REP-087 §12).

## 9. Hidden-information rules (hard rules)

A customer's freshness type is tied to their name (`src/engine/data.ts`), so **a customer's face is secret
while the card is face down.**

1. **Backs:** one master back per deck. A customer back varies only by its fruit icons. No portrait, silhouette,
   name or type colour on any back. All backs of a deck are printed from one file, in one run.
2. **Edges and finishes:** frame, edge and bleed colours are identical on all 36 customer cards. Same card stock
   and finish on every card in a deck: no foil, spot varnish or premium stock on a few cards.
3. **No type code in the art:** no visual cue may track Premium, Everyday, Bargain or the "generous" customers.
   Gold, jewellery, smart clothes, patches, coin purses and price tags are either banned or spread evenly across all
   three types. A balance table of these cues is checked before each batch is approved.
4. **No literal misleading quirks:** quirks that point the wrong way (Bargain Wei Jie's magnifying glass, Bargain
   Mei Ling's soggy-fruit splash, Everyday Zul's "wants fresh fruit", thrift lines for Tan and Hock Seng) are not drawn literally until the owner decides on their text.
5. **The walk-in figure:** one generic figure for every face-down card, which must not look like any cast member
   (today's "shopper" has Benny's short hair and brown shirt). In the app, a portrait loads only once the card is face up for that player, never in advance by name.
6. **Expressions** may only react to public results after the bell, never to crates, prices or stall state, so
   pass-and-play and online games show nothing early.
7. **Shopkeeper perks are public**, so perk props are fine. Shopkeeper saver or bargain props (coins, ledgers) never appear on customers.

## 10. Rules that keep AI-assisted art consistent

- **AI's job:** ideas, poses and drafts only. Every final picture is checked, corrected and approved by a person, and
  disclosed on the Kickstarter page (REP-087 §9 explains why).
- **One character at a time,** never the whole roster in one go. Pilots first.
- **Reference stack for every image:** the approved style-lock sheet plus that character's own sheet. Never another character's sheet.
- **Fixed prompt skeleton:** a style block (copied word for word), then a character block (from the Character
  Bible), a view or pose block, an output block and an exclusions block. No artist, studio, brand or real person names, ever.
- **One tool and one model version per batch,** recorded. Private generation only, so unreleased art never appears in a public gallery.
- **Archive the accepted file itself as the master.** Seeds do not reliably recreate an image.
- **Script checks after each image:** colours snapped to the palette, line weight measured, transparent edges
  checked. A person then compares the image with the style lock side by side.
- **Reject and redraw if:** the face shape, hair, clothing, prop or colours change between views; hands or anatomy
  are wrong; there is any text or symbol; it relies on details too small to read at 44 px or 25 mm; it shows any type cue.
- **Stop a batch** if more than one accepted image in three needs more than mechanical fixes.
- **Manifest row per accepted image:** asset ID (existing character key, never renamed), use, tool, model version,
  date, terms page and date checked, references used, prompt, human changes, reviewer, approval.

## 11. Banned

Animals, creatures, robots, fruit-people, or costumes beyond what a job needs (DEC-039). Headdresses, "native",
"island" or "grower maiden" figures, fruit hats and accent jokes. Real crate labels, brand marks or trade dress
as references. Living-artist names in prompts. Text inside images. Partial foil on customer cards. AI upscaling
of pixel art or text. Any undisclosed AI anywhere in the campaign, placeholders included.

## 12. Relationship to approved decisions

If the owner approves DEC-063:
- **DEC-033 and `ART-STYLE.md` §4** stay for the app board. Look E adds a second rendering of people, used in card frames and print.
- **DEC-041** keeps the cast rules. Its portrait rule becomes "one character spec, two renderings":
  a 16 × 16 pixel token and an illustrated card portrait, made from the same description and kept in step.
- **DEC-042** stands: designs are shown before anything is built, and no expression frames appear in the app.
- **DEC-057** is untouched: wearable looks stay on the pixel tokens. Illustrated wearables are deferred.
- **DEC-021's** paid-illustrator option comes back. Any spending still needs a quote and its own approval.

## 13. Art decision log

| ID | Date | Decision | Status |
|---|---|---|---|
| DEC-017 | 2026-10-26 | Harbour market where the whole world shops | Approved |
| DEC-021 | 2026-10-26 | Toy-box tabletop look; a paid illustrator stays a later, priced option | Approved; look later replaced |
| DEC-033 | 2026-10-28 | Look C: flat scenery, pixel things (16 × 16 portraits) | Approved |
| DEC-039 to DEC-041 | 2026-10-28 | Townsfolk theme, human shopkeepers, cast and portrait rules | Approved |
| DEC-042 | 2026-10-29 | Designs shown before building; no expression frames for now | Approved |
| DEC-052 | 2026-10-29 | Pixel lorry and stalls | Approved |
| DEC-057 | 2026-10-31 | Collectible looks worn by shopkeepers | Approved |
| DEC-060 | 2026-11-05 | Printed card backs | Approved |
| **DEC-063** | 2026-11-07 | **Look E: crate-label world, townsfolk characters, for the Kickstarter edition** | **Awaiting approval** |

New art decisions are added to `docs/workflow/records/decisions.json` first. This table is then updated.
