# Fruit Market · Art direction for the Kickstarter edition (Look E)

| | |
|---|---|
| Version | 0.2 draft, 2026-11-07 (Asia/Kuala_Lumpur). v0.2 corrects v0.1 after an internal review, before you saw it. |
| Status | **Approved for design only** (DEC-063, 2026-11-07), with the owner's decisions below. Nothing here changes the game, the app or the print kit. |
| Evidence | REP-087 (audit of the repo, the Drive print kit, the decision history and outside research) |
| Applies to | Printed cards, box, rulebook, Kickstarter page and store art first; the phone game later, in a separate plan |
| Does not change | Rules, balance, prices, card text, saves, online play. The app's pixel people stay as they are until a later app plan, which may redraw them to match the new portraits. Each redraw would be shown to you beside today's version first. |

## 0. Owner's decisions (2026-11-07), which override the sections below where they differ

1. **Phone game:** illustrated characters will eventually replace the pixel characters **throughout** the app, not only in card views. Principle 4, section 3 and section 8 ("Phone") are rewritten in the mobile adaptation specification (PLAN-048).
2. **Finishing:** AI concepts are finished by the owner, without commissioning an illustrator. Section 3's box-art row and section 10 are read that way. The Kickstarter "Use of AI" disclosure still applies.
3. **Pilots:** Benny (broad, bearded, prominent Big Basket) and Sailor Jia Wen (navy clothing, sailor's cap, rolled mango map).
4. **Cards:** physical cards must prioritise gameplay readability.
5. **Names first:** the owner is reworking character names and the naming style before the design package starts.

## 1. The direction in one line

**Crate-label world, townsfolk characters.** The world, frames and graphics borrow the look of old fruit-crate
labels and market posters ("The Great Fruit Exchange"). The people borrow the warmth and personality of
"Orchard & Oddballs", but stay ordinary townsfolk of the harbour market (DEC-039). Everything is drawn in one flat,
screen-print style, in the existing palette plus a few additions that need your approval (section 4).

Both direction names are **internal style labels only**. The product stays *Fruit Market*. "Fruit Exchange"
echoes an old US citrus brand name, and "Orchard" is already the name of a well-known children's game.

### Why a hybrid, not one of the two

Three review passes scored each option on nine criteria, out of 45 in total. Each pass was written from one viewpoint:
a tabletop publisher, an art-production lead and the game's identity. **They were AI reviewers run in this
session, not outside experts**, so treat the scores as a structured opinion. The scores per criterion are in REP-087, appendix A.

| Option | Publisher view | Production view | Identity view | Main weakness |
|---|---|---|---|---|
| The Great Fruit Exchange alone | 23 | 25 | 22 | Vintage ads drew people as stereotypes; detailed litho art blurs on a phone |
| Orchard & Oddballs alone | 27 | 25 | 27 | "Quirky imperfection" drifts from image to image with AI and slides toward caricature |
| **Controlled hybrid (Look E)** | **36** | **36** | **35** | Two renderings of each person (pixel token, card portrait) must stay in step |

The crate-label language fits this game unusually well: the ten named lorries (Blueberry Bonanza, Orchard Run,
Watermelon Wagon…) read as crate brands, events read as market posters, and the palette (terracotta,
gold, teal, cream, ink) is already a mid-century print palette.

## 2. Art principles

1. **Play information comes first.** On every card, the wants, prices and freshness type are read before the picture.
2. **One person, one idea.** Each character is an ordinary person with a job or hobby, one prop and one pose.
   The joke is what they *do*, never who they *are* (DEC-018, DEC-041).
3. **Flat and printable.** Flat colour, one clean ink line, one shadow tone. It prints sharply, shrinks well and can be checked by a script.
4. **The board shows tokens; cards show portraits.** Pixel people stay on the app's board, queue, home screen and
   wardrobe. Illustrated portraits appear on printed cards, the box, the store and a few card views in the app.
   **Trade-off:** the phone shares the identity (colours, frames, names, store art) and the same people, but
   during play it shows them as pixel tokens, not as the new pictures. Choosing "replace everywhere" instead is REP-087 question 2.
5. **Art never tells a secret.** Nothing in a picture, a back or an edge may hint at hidden information (section 9).
6. **Graphics are built; people are drawn.** Frames, backs, logo and type are templates written as code (no image
   generator), and you approve each design. The code is written with an AI coding assistant, so the Kickstarter
   "Use of AI" section mentions this too. Character pictures start as AI drafts, and every shipped picture is finished by a person.
7. **Nothing is borrowed.** No real labels, brands, living artists or real people as references.

## 3. What comes from where

| Element | Source | How it is made |
|---|---|---|
| Card frames, deck backs, banners, ribbons, sunbursts, "port" stamps, logo lock-up, banknotes | Crate-label world | Code templates (SVG or HTML), filled from `src/engine/data.ts` by script. No image generator. Designs shown to you first. |
| Box lid, box sides, rulebook headers, Kickstarter banners | Crate-label world | Same templates |
| Box and key-art scene | Both | Recommended: a named, credited human artist with no AI drafts, because a cover is where backers react most. Without budget: a type-and-frame box with no scene, rather than an AI picture. |
| Shopkeepers (6), customers (36), guests (3), people on event cards, the walk-in figure | Townsfolk characters | AI drafts from the approved references, finished by a person, logged in the manifest |
| Fruit, ripeness, icons, tokens, stall props | Current pixel art (DEC-033) | Unchanged. Prints as sharp vector squares. |
| People on the app board and wearable looks | Current pixel art | Unchanged now. A later app plan may redraw each token to match its portrait. |

## 4. Colour

- **Palette:** the roles in `docs/ART-STYLE.md` §2 and `src/ui/palette.ts`. Ink `#2b2438`, mat `#fbf3e1`,
  paper `#fffdf7`, terracotta `#c8553d`, gold `#f2c14e`, teal `#3e8f8c`, the four fruit-lane tints, and the
  existing sprite colours. **Addition for approval:** a short list of character accent colours, added to the same file.
- **Skin:** the five human tones in use (pale, a, b, c, d). **Addition for approval:** up to three more (a deeper brown, an olive and a
  warm mid tone) so the "whole world" cast is fairly shown. Green, blue and grey "skins" are creature leftovers and are banned.
- **Per character:** at most six flat fills plus the ink line: skin, hair, shirt, one accent, one prop colour and one shadow tone.
- **No** gradients, glows, photo shading or per-card background tints.
- **Print:** files from the repo's print script (Playwright, a browser) come out in RGB. Converting them to CMYK
  with the printer's colour profile is one extra step at hand-off: either the factory does it (ask in the quote), or one
  conversion tool is added after a dependency decision. Template text under about 8 pt and template lines under about
  0.5 mm print as pure black (K100). Character line art keeps the ink colour. If a proof shows it blurring, the
  line is kept as a separate layer printed in K100. Teal and gold can dull in CMYK, so a printed proof is required before any order.

## 5. Typography

- **Numbers and prices:** Fredoka (your choice for telling 5, 2, 3 and 8 apart, DEC-061).
- **Sentences and rules:** Fredoka. **App labels:** Pixelify Sans (unchanged).
- **Display, for approval (logo, box, printed card titles):** at most one added bold, crate-label style face under the SIL
  Open Font Licence. Candidates to test: Alfa Slab One, Bowlby One, Lilita One (licence checked when chosen). It needs
  its own approval, and a font credit file before Kickstarter.
- **No text inside any illustration.** Every word on a card comes from the template and the game data.

## 6. Characters: proportion and silhouette

- **Card portrait:** head and shoulders plus one prop held at chest height. Same camera for everyone: a slight
  three-quarter turn, head about 45% of the frame height, eyes about 40% from the top, shoulders cut at the same line.
- **Full figure** (box, Kickstarter, turnarounds): about 3½ heads tall, compact and sturdy, rounded hands, simple feet.
- **Faces:** one face construction for everyone (simple eyes with one highlight, small nose, clear mouth), so
  expressions read at small sizes. Natural asymmetry is welcome. Exaggerated features are not.
- **Build types:** slim, average, broad and elderly. Every build appears across all three freshness types.
- **Silhouette language:** each person has one dominant shape from hair or hat plus prop, for example
  broad and round (Benny), tall and narrow, square and steady, or angular and quick. **Test:** filled solid black at 44 px
  (the size of the character pick), every head must still be told apart.
- **Told apart by:** hair or hat outline, one prop, build, skin tone and shirt colour, as the pixel cast already is.
- **Expressions:** your brief asks for six per character (neutral, delighted, sly, stung, surprised, thinking).
  DEC-042 said "no happy or sad portrait frames for now", in the context of the app. Assumption: expression
  sheets are made as drawing references and for print or marketing. Cards show the resting face, and the app shows no
  expression frames. Any app use is a separate decision (section 9, rule 8).

## 7. Line, shading, texture and background

- **Line:** one ink colour and one even weight with rounded ends. Print: about 1% of the master's width, never under
  0.5 pt (0.18 mm). Phone: images are exported with the line at least 1.5 px at the size shown, checked at 44 and 72 px.
  No sketchy, hatched or doubled lines. Charm comes from pose and prop, not line noise.
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
is tested with the densest card (three order lines) before any portrait is final.

### Other cards
- **Shopkeeper:** the hero card. Large portrait (about 40 to 45 mm tall), name, perk name and perk text.
  The perk is public, so a perk prop (Benny's big basket) is welcome.
- **Guest:** a customer layout with a "Guest" band.
- **Backs:** one master file per deck (section 9). Today's approved backs (DEC-060) stay until a new back design is shown and approved.

### Phone (later app plan)
- **Illustrated portrait:** the character pick (44 px, no worn looks shown there), a face-up customer or guest card
  opened full size, store and splash art.
- **Pixel token:** the board, queue, chips, the bell and sales, the home shopkeeper, wardrobe, lobby seats and results,
  meaning everywhere a worn look shows (DEC-057).
- **Graphics:** Look E frames and store, splash and launcher art, replacing today's off-palette launcher art.

### Print sizes
- Card file 69 × 94 mm (with bleed): 815 × 1110 px at 300 ppi. Character masters at least 2048 px so they can also be printed larger.
- Box lid (300 mm square, if chosen): about 3,600 px at 300 ppi. Lid wrap: about 5,700 px. The box art is drawn at that
  size. It is never an enlarged card portrait.
- Upscaling cannot recover detail. Pixel art is only ever scaled by whole numbers or exported as vectors.
- All print figures come from search summaries and are confirmed against the chosen factory's own guide (REP-087 §12).

## 9. Hidden-information rules (hard rules)

A customer's freshness type, amounts and prices are tied to their name (`src/engine/data.ts`), so **a customer's
identity is secret while the card is face down.** Favour cards in hand and the next event and lorry cards are secret too.

1. **Backs:** one master back per deck. A customer back shows only one icon per fruit wanted, **always in one fixed
   order** (blueberry, watermelon, apple, mango) in fixed positions, with no amounts. No portrait, silhouette, name,
   number or type colour on any back. All backs of a deck are printed from one file, in one run. *Today's backs (printed
   kit, app and online server) list fruits in each card's own order, which makes 9 of 36 customers unique from the back,
   including Premium Rara Jenab. Changing the order for print needs your approval. Matching the app and server is a small separate plan.*
2. **Edges and finishes:** on every deck whose fronts are hidden (customers, favours, events, lorries), every card's
   front frame, edge and bleed are one shared colour. Per-card colour (crate brands, event posters, favour types) stays
   inside the safe area, at least 3 mm from the cut. Same stock and finish on every card in a deck: no foil, spot
   varnish or special stock on some cards only.
3. **No type code in the art:** no visual cue may track Premium, Everyday, Bargain or the "generous" customers.
   Gold, jewellery, smart clothes, patches, coin purses and price tags are either banned or spread evenly across all
   three types. A cue-balance table is checked before each batch is approved.
4. **No literal misleading quirks:** quirks that point the wrong way (Bargain Wei Jie's magnifying glass, Bargain
   Mei Ling's soggy-fruit splash, Everyday Zul's "wants fresh fruit", thrift lines for Tan and Hock Seng) are not drawn
   literally until you decide on their text.
5. **The walk-in figure:** one generic figure for every face-down card, which must not look like any cast member
   (today's "shopper" has Benny's short hair and brown shirt). In the app, a portrait loads only once the card is face
   up for that player, never in advance by name.
6. **Glimpses:** a larger, more recognisable portrait is easier to spot across a table. When Scout or Gossip is played,
   the card is tilted toward its owner. The print test checks that a portrait cannot be recognised from the next seat
   during a normal peek. In the app, a private Scout or Gossip view and any full-card view close before the pass-and-play hand-over screen.
7. **Show-through:** customer cards are printed on opaque card (black-core card for the factory edition). The home-print
   guide says to use card, not paper, or sleeves with solid backs. The print test holds a card up to a phone torch.
8. **Expressions** (if ever used in the app) may only react to public results after the bell, never to crates, prices
   or stall state, so pass-and-play and online games show nothing early.
9. **Shopkeeper perks are public**, so perk props are fine. Shopkeeper saver or bargain props (coins, ledgers) never appear on customers.

## 10. Rules that keep AI-assisted art consistent

- **AI's job:** ideas, poses and drafts. Every **shipped** picture is checked, corrected and finished by a person.
  Turnarounds and expression sheets used only as drawing references are checked but not repainted unless they will be printed.
- **Disclosure:** a full Kickstarter "Use of AI" section (tools, which parts, what a person did, and what each tool
  maker says about permission for its training images), plus a short line in the rulebook.
- **One character at a time,** never the whole roster in one go. Pilots first.
- **Reference stack for every image:** the approved style-lock sheet plus that character's own sheet. Never another character's sheet.
- **Fixed prompt skeleton:** a style block (copied word for word), then a character block (from the Character
  Bible), a view or pose block, an output block and an exclusions block. No artist, studio, brand or real person names, ever.
- **One tool and one model version per batch,** recorded. Private generation only, so unreleased art never appears
  in a public gallery. The tool is chosen at stage 3 after a dated check of its terms.
- **Archive the accepted file itself as the master.** Seeds do not reliably recreate an image.
- **Script checks after each image:** colours snapped to the palette, line weight measured, transparent edges
  checked. A person then compares the image with the style lock side by side.
- **Reject and redraw if:** the face shape, hair, clothing, prop or colours change between views; hands or anatomy
  are wrong; there is any text or symbol; it relies on details too small to read at 44 px or 25 mm; it shows any type cue.
- **Stop a batch** if more than one accepted image in three needs more than mechanical fixes.
- **Manifest:** the full row per accepted image (asset ID using the existing character key, never renamed; use; tool;
  model version; date; terms page and date checked; references; prompt; human changes; reviewer; approval) is kept
  with the masters on Drive. The repo keeps a short index (asset ID, version, use, status, approval), because the
  project rule keeps model names out of the repo.

## 11. Banned

Animals, creatures, robots, fruit-people, or costumes beyond what a job needs (DEC-039). Headdresses, "native",
"island" or "grower maiden" figures, fruit hats and accent jokes. (The existing pixel "Fruit Basket Hat" look from DEC-057
stays in the app, but it is not drawn in illustrated art or used in print or Kickstarter images unless you decide
otherwise.) Real crate labels, brand marks or trade dress as references. Living-artist names in prompts. Text
inside images. Partial foil on any deck. AI upscaling of pixel art or text. Any undisclosed AI anywhere in the campaign, placeholders included.

## 12. Relationship to approved decisions

If you approve DEC-063:
- **DEC-033 and `ART-STYLE.md`:** the pixel rules stay for the app. §1 and §4 gain a second rendering of people for cards
  and print; §2 gains the accent colours and up to three skin tones; §5 gains one display face (after its own approval).
- **DEC-041:** the cast rules stay. Its portrait rule ("one source of portraits for the screen and the printed cards")
  becomes "one character spec, two renderings": a 16 × 16 pixel token and an illustrated card portrait, made from the same description and kept in step.
- **DEC-042:** designs are shown before anything is built. Its "no happy or sad portrait frames for now" stays for the app (section 6).
- **DEC-057:** wearable looks stay on the pixel tokens wherever a look shows. Illustrated wearables are deferred.
- **DEC-060:** today's approved card backs stay until a Look E back design is shown and approved.
- **DEC-021:** its paid-illustrator option comes back. Any spending still needs a quote and its own approval.
- **DEC-027 and `GAME-BRIEF.md`:** both editions keep identical rules. The order of work becomes Kickstarter tabletop
  first, then the phone game. The game brief would gain the tabletop audience.

## 13. Art decision log

| ID | Date | Decision | Status |
|---|---|---|---|
| DEC-017 | 2026-10-26 | Harbour market where the whole world shops | Approved |
| DEC-021 | 2026-10-26 | Toy-box tabletop look; a paid illustrator stays a later, priced option | Approved; look later replaced |
| DEC-022, DEC-023 | 2026-10-27 | Cunning edition, then the cosy pixel edition of the toy-box look | Approved |
| DEC-033 | 2026-10-28 | Look C: flat scenery, pixel things (16 × 16 portraits) | Approved |
| DEC-034 | 2026-10-28 | Board look D, the soft tabletop mat | Approved |
| DEC-038 | 2026-10-28 | Rara Jenab the Cheerleader | Approved |
| DEC-039 to DEC-041 | 2026-10-28 | Townsfolk theme, human shopkeepers, cast and portrait rules | Approved |
| DEC-042 | 2026-10-29 | Designs shown before building; no expression frames for now | Approved |
| DEC-043, DEC-045 | 2026-10-29 | Table screen, other screens and printed mat in look D | Approved |
| DEC-047 | 2026-10-29 | Opening animation: market morning | Approved |
| DEC-052 | 2026-10-29 | Pixel lorry and stalls | Approved |
| DEC-057 | 2026-10-31 | Collectible looks worn by shopkeepers | Approved |
| DEC-060 | 2026-11-05 | Printed card backs | Approved |
| DEC-061 | 2026-11-05 | Shopfront home screen; Fredoka for numbers | Approved |
| **DEC-063** | 2026-11-07 | **Look E: crate-label world, townsfolk characters, for the Kickstarter edition** | **Approved for design only** |

New art decisions are added to `docs/workflow/records/decisions.json` first. This table is then updated.
