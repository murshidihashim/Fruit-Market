# Fruit Market: art style guide (draft for the owner's approval)

Decided by the owner: **Look C** (DEC-033), with the **soft tabletop mat** as the board look (**D**, DEC-034). The board is the proof of concept: everything else is derived from it. Sources: `Art_Style_Audit`, `Look_Comparison.html`, `Board_Look_Options.html` (Guides_v2).

## 1. The one rule

**Flat and smooth for places; pixel for things.**
- *Places and structure* (home scene, sky, ground, mats, panels, signs, awnings, the lorry, frames) are flat, smooth, softly rounded and calm.
- *Things you count, tap, collect or print as tokens* (fruit, people, icons, coins) are pixel art with a 1 px ink outline.

## 2. Colour

One palette, named by role. Nothing outside it (a check will fail on a stray colour).

| Role | Value | Used for |
|---|---|---|
| Ink | `#2b2438` | Every outline, text on light, the pixel outline |
| Mat | `#fbf3e1` | Play surfaces and cards (the board mat) |
| Paper | `#fffdf7` | Slots, inner cards, input fields |
| Lane: blueberry | `#dfe3fa` | Blueberry track and token tile |
| Lane: watermelon | `#fbdcdd` | Watermelon track and token tile |
| Lane: apple | `#f9e0d6` | Apple track and token tile |
| Lane: mango | `#fbecc4` | Mango track and token tile |
| Terracotta | `#c8553d` | Main action, awnings, price tags |
| Gold | `#f2c14e` | Cash, coins, primary highlight |
| Teal | `#3e8f8c` | Online and information, the harbour water |
| Fresh | `#9cca86` | Freshness band: fresh |
| Okay | `#e6c86f` | Freshness band: okay |
| Tired | `#db8a6c` | Freshness band: tired |
| Green | `#b8cf9a` (hatched) | Freshness band: green (unripe) |
| Night | `#141a31`, `#1b2240`, `#252e50` | The evening phase and full-screen overlays only |

Warm light for play, night blue for the evening. The dark information layer of today's screens becomes the *evening* mode, not the everyday one.

## 3. Shape and line

- **Radius:** mats and big cards 16 px; lanes and panels 12 px; slots and small cards 9 px; buttons and chips are pills (999 px).
- **Line:** controls and slots have a 2 px ink outline (1.5 px for slots inside a lane). Pixel sprites keep their own 1 art-pixel outline.
- **Depth:** one hard 3 px ink "pressed" shadow on primary buttons; nothing else casts a shadow. No gradients on objects.
- **The slot** is the basic unit: a paper rounded rectangle, a freshness corner flag, a coin-shaped price at its corner, a faint fruit when empty.

## 4. Pixel art

- **Grids:** fruit 12 wide (up to 12 high), portraits 16×16, icons 12×12 (current icons in other sizes are redrawn to 12×12 when touched), large props (lorry, awning) in multiples of 8.
- **Scaling:** whole multiples only. Allowed on-screen widths: fruit 14 / 28 / 42 / 56 px; portraits 18 / 36 / 54 / 72 px; icons 12 / 24 / 36 px. Never 1.3× or 1.5×.
- **Outline:** always 1 art pixel in Ink. Light from the top left; one highlight, one shadow side.
- **Freshness:** shown by the sprite itself (bright, dulled, spotted, green), and by the slot's flag, never by colouring the object's background.
- **No emoji** anywhere in the interface; pixel icons only.

## 5. Type

- **Pixelify Sans:** titles, buttons, numbers, prices, names of people and cards.
- **Fredoka:** sentences and help text.
- **Sizes:** 12, 14, 16, 20, 28, 40 px. No other sizes.

## 6. Motion

- **Objects** (pop-ins, flights, flips, bobs) move in steps, three to six frames, like the sprites.
- **Scenery** (clouds, water, the market street loop) moves slowly and smoothly.
- Nothing moves faster than 0.25 s except flights; reduced motion shows stills.

## 7. Naming

Words follow `Naming_Audit` (DEC-035): Wholesale Market, stall, shopkeeper, Tired, slot, track, pile, piece, Delivery card.

## 8. What this guide does not change

Rules, balance, layout or any screen. Restyling the existing screens to this guide is a separate plan (PLAN-033).
