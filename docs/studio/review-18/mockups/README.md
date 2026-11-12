# Mock-ups the owner approved (rules version 18)

These are the sources of the boards on the design page, kept here so the build follows the exact designs that were chosen. Only chosen boards are kept; options that were not chosen stay on the design page.

| Board | What it shows | Decision |
|---|---|---|
| `Design-A` | Card fronts in design A (Ticket): event, lorry, shopkeeper, favour, upgrade, standing order | DEC-095 |
| `Main` | The customer front and back, which keep this earlier design (black heading; back with four fixed fruit squares). The other cards on this board are superseded by `Design-A` | DEC-095 |
| `Backs-Ticket` | Card backs. Row 3, the pattern, is chosen for now | DEC-096 |
| `Pictures`, `Customers`, `Events`, `Shopkeepers`, `Order-Clients` | Every card picture. The files are in `docs/studio/art-drafts/cards-18/` | DEC-094 |
| `Morning`, `Buying`, `Pricing`, `Rush`, `Favoured-Trade`, `Standing-Order`, `Evening` | A day on the phone, 390 by 844. The wholesale market is lanes of 3, 4, 5 and 6 boxes | DEC-090 to DEC-094 |
| `Home-A`, `Home-B`, `Home-Waiting` | The home screen: today's market first, your next goals a swipe away, your table first when a game is waiting | DEC-097 |
| `Stocking`, `Takings` | Two more screens of the day: filling your crate, and the day's takings | DEC-103 |
| `Results`, `Stamp-Book`, `Trophy-Cards`, `Wardrobe` | The stamp book screens: the stamps a game earned, the ladder of six ranks, trophies as cards with tiers, and the looks with where they show in a game (an awning strip over your shelf and on your box as a rival sees it) | DEC-099, DEC-103 |

The look: ink `#1f272a`, paper `#fffcf5`, kraft `#ddd4c6`, pale `#efe9df`, stone `#bdb4a6`, slate `#5a6266`, mustard `#fec400`, red `#e73c35`, dark red `#b62528`, green `#0e9a58`, blue `#3558a2`. Archivo and Archivo Black. Square corners. Lanes in the order blueberry, watermelon, mango, apple.

Numbers, names and wording inside the mock-ups are examples. The game's data and the text rewrite (DEC-087) decide the real ones.

## Looking at a board

From the repo root:

```
python3 docs/studio/review-18/mockups/render.py Design-A Rush
```

writes `png/Design-A.png` and `png/Rush.png`. The `png` folder already holds the chosen card and screen boards at their real size. `blobs.json` maps each picture id used on the design page to its file in this repo.
