# 04 · UX, Art and Audio

Departments: **UI/UX Designer**, **Art Director** and **Audio Designer**.

---

## UI/UX Designer: onboarding, hierarchy, touch targets, accessibility

### 1. Current implementation and evidence
- **Layout** (`src/ui/Game.tsx`, `src/ui/table.tsx`), from top to bottom:
  - top bar: day, phase, rank, cash, event chip, rival chips
  - customers with per-fruit price bubbles
  - demand/supply row
  - the market in the middle, with rival stalls on its sides
  - your stall at the bottom
- Pricing and upgrades open in a bottom tray. Showdowns and summaries sit on top of the market.
- **Onboarding:** first-game coach tips (`src/ui/tutorial.ts`): trait → morning → buy → bought → price → reveal → evening → day 2. They can be replayed from Settings.
- **[Measured] Tap-target audit** (Playwright, 360×740, controls under 40 px):

  | Control | Size |
  |---|---|
  | Market cells for watermelon and apple (7 slots per row) | 28–38 px wide |
  | Top-bar event and rival chips | 32 px tall |
  | Demand/supply row | 38 px tall |
  | Setup checkboxes (inside larger labels) | 13 px, acceptable |

  Home, results and trophies have no small targets. No unlabelled controls were found, and no horizontal overflow.
- **Accessibility:**
  - `prefers-reduced-motion`
  - colour-blind freshness patterns (Settings)
  - `aria-label` on market cells and stalls
  - The market grid and showdown are visual-first; there has been no screen-reader pass.

### 2. Strengths to preserve
- A clear spatial model (the tabletop).
- A single primary action in the action bar.
- Tips that don't block play, and a skippable showdown.
- Colour-blind patterns.

### 3. Weaknesses and risks
- **[Measured]** The small tap targets listed above. Market cells are the most-tapped control in the game.
- **[Hypothesis] Information density at 360 px:** the customer row, demand row, three stalls and the market compete for space. Your own stall is often pushed below the fold when the tray is open.
- **[Hypothesis] Tips teach controls, not strategy.** Players may not learn why they lost a sale until the showdown explanation.
- **[Defect, minor] The coach bubble can cover the pricing tray's upper controls** (fixed position at `bottom: 86px`, `src/ui/styles.css` `.coach`).
- **[Hypothesis] The event chip text is truncated** (`max-width: 52%`).

### 4. Root causes
The layout was restored to the classic tabletop with the full stall grid kept, and a 7-slot freshness track doesn't fit at 360 px.

### 5. Proposed improvements
| ID | Change | Files | Priority |
|---|---|---|---|
| UX1 | **Market cells at least 40 px:**<br>• merge identical-price adjacent slots visually, or<br>• show only the slots that have stock, plus a "+n older" chip, or<br>• allow horizontal scroll per row<br>Pick by prototype. | `src/ui/table.tsx` (`Market`), `styles.css` (`.mk-cell`) | P1 |
| UX2 | Top-bar chips and the demand row at least 40 px | `styles.css:127` | P1 |
| UX3 | The coach bubble positions itself away from the open tray (anchor to the top when a tray is open) | `src/ui/Game.tsx` (coach), `styles.css` `.coach` | P1 |
| UX4 | Strategy tips, triggered by situations (e.g. "you priced above a rival and lost: the cheapest sells first") | `src/ui/tutorial.ts`, `src/engine/story.ts` | P2 |
| UX5 | Screen-reader pass: live region for showdown results, labels on stall rows ("Pinky: 2 apples, 1 mango") | `src/ui/table.tsx`, `src/ui/Game.tsx` | P2 |
| UX6 | Collapsible rival stalls (a summary row) when the tray is open | `src/ui/table.tsx` | P2 |

### 6. Priority, effort, dependencies
- UX1: effort M; prototype 2 options and test in playtest round 1.
- UX2, UX3: effort S.
- UX4–UX6: effort M, after the M2 split.

### 7. Acceptance criteria
- The Playwright tap-target audit (part of the B-13 performance and UX script) reports zero enabled controls under 40 px on buy, price and evening screens at 360 px.
- The coach never overlaps an enabled button (bounding-box check).
- VoiceOver/TalkBack smoke test: a player can hear the day result.

---

## Art Director: consistency, character identity, animation, environment

### 1. Current implementation and evidence
- **Palette:** terracotta, harbour teal, olive, saffron, cream, midnight surfaces. Fonts: Pixelify Sans and Fredoka (`src/ui/styles.css`).
- **All art is hand-authored pixel grids** in `src/ui/pixel.tsx`:
  - fruits × 4 freshness stages
  - procedural human portraits plus hand-drawn animal rivals
  - icons for upgrades (6), traits (6), events (13) and favours (6)
  - coin, crate, cart, star, moon, sun, heart, lantern
- Stalls have per-seat striped awnings; awning colours are unlockable (`src/ui/progress.ts`, `COLOURS`).
- **Store assets:** 512 icon, feature graphic and 7 screenshots (`store/`).
- **Remaining emoji:**
  - story highlight icons (`src/engine/story.ts`, 9 `icon:` entries)
  - 💭 thinking marker and 🃏 card count (`src/ui/table.tsx`)
  - 🔒 on the locked-prices bar

### 2. Strengths to preserve
- A cohesive palette.
- Readable fruit at 16–24 px.
- Distinctive rival animals.
- A recognisable striped-awning motif.

### 3. Weaknesses and risks
- **[Measured]** Mixed emoji and pixel art in a few places (listed above).
- **[Hypothesis] Characters are static:** no idle bob or reaction poses beyond CSS bounces. The emotional beats (undercut, sold out) rely on text.
- **[Hypothesis] The environment is a dark tiled surface.** The Mediterranean market fantasy shows only in colours and awnings; the earlier street scene was removed.
- **[Measured] The rendering approach (one rect per pixel run) limits** how much art can be on screen (see 03, F1).

### 4. Root causes
Art was authored in code for speed. The layout reverted to the tabletop, which removed the environment.

### 5. Proposed improvements
| ID | Change | Files | Priority |
|---|---|---|---|
| A1 | Replace the remaining emoji with pixel icons (thinking, cards, lock, highlight icons) | `src/ui/pixel.tsx`, `table.tsx`, `story.ts` consumers | P1 |
| A2 | 2-frame portrait variants (idle, happy, sad) for rivals, used in reactions | `src/ui/pixel.tsx` (`Portrait`), `Game.tsx` | P2 |
| A3 | A thin environmental backdrop behind the customer row (buildings and bunting strip, as a cached image after F1) | `src/ui/table.tsx`, `pixel.tsx` | P2 |
| A4 | An art style guide (palette tokens, outline rule, grid sizes) | `docs/ART-STYLE.md` | P2 |

### 6. Priority, effort, dependencies
- A1: effort S.
- A2, A3: effort M; both need F1 first.
- A4: effort S.

### 7. Acceptance criteria
- `grep` finds no emoji in rendered UI components, apart from user-typed text.
- After A3, the game screen's DOM count stays within budget (F4).

---

## Audio Designer: music, feedback, controls

### 1. Current implementation and evidence
- `src/ui/fx.ts`: synthesised Web Audio tones for tap, buy, coin, card, error, win, lose and night, plus haptics.
- An optional procedural pentatonic music loop: off by default, starts after a user gesture, stops when the app is hidden.
- Settings has Sound, Vibration and Music toggles. There is no volume control.

### 2. Strengths
- Zero audio assets: tiny bundle, no licensing questions.
- Respects settings.
- Pauses in the background.

### 3. Weaknesses and risks
- **[Hypothesis] Thin sound identity.** Square and triangle blips read as prototype-quality.
- **[Measured] No volume sliders or separate music and SFX levels.**
- **[Hypothesis] No audio cue distinguishes** "you won the sale" from "a rival won". The showdown's emotional peak is under-scored.

### 4. Root causes
A no-asset approach chosen for speed.

### 5. Proposed improvements
| ID | Change | Files | Priority |
|---|---|---|---|
| AU1 | Distinct showdown cues (sold / outbid / sold out) and a rising tick during the reveal | `src/ui/fx.ts`, `Game.tsx` (showdown) | P1 |
| AU2 | Volume sliders for music and SFX | `src/ui/store.ts`, `App.tsx` settings, `fx.ts` | P2 |
| AU3 | Optionally commission or licence about 10 short SFX and one loop (OGG, under 150 KB total), only if playtests rate the audio poorly | `public/audio/`, `fx.ts` | P3 |

### 6. Priority, effort, dependencies
- AU1: effort S.
- AU2: effort S.
- AU3: effort M plus cost.

### 7. Acceptance criteria
- Playtest: at least 70% of players can tell, by sound alone, whether they won a sale.
- The settings persist and apply live.
