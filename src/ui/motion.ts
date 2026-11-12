// The beat clock (flow study, review-18, D1 and D2): every length the game table uses, named in one place, and the
// one speed that scripts and stylesheets both read. Nothing here draws; anim.ts moves the pieces and sheet.ts the
// middle panel. Lengths are in ms at normal speed.
//
// One speed: `speed()` is 1 at the normal pace and lower when quicker ("Fast rivals", a tap's hurry, a tap on a rush
// card). Scripts multiply their lengths by it; stylesheets read the same number as --mk (see motion.css).
// One rule for reduced motion: nothing travels and the state is shown at once (`wait`, `moveMs` and --mk are 0), and
// every reading pause is kept (`hold`, `held`).

/** The feel for new blocks (flow study D1): what a move of each kind should take. */
export const FEEL = {
  /** A piece crossing the table. */
  travel: 320,
  /** A coin to or from a stall's cash. */
  coin: 360,
  /** A card turning over. */
  turn: 280,
  /** A sheet sliding onto the table, and off it. */
  sheetIn: 180,
  sheetOut: 120,
  /** A number counting up or down: one step, and the most a whole count may take. */
  countStep: 40,
  countMax: 400,
  /** A pause to read something (1.0 to 1.2 s). */
  read: 1100,
} as const;

/** The curves: a move starts gently and lands softly; a sheet arrives quickly and settles; a thing that leaves speeds up. */
export const EASE = {
  travel: 'cubic-bezier(.3, 0, .2, 1)',
  sheet: 'cubic-bezier(.2, .8, .2, 1)',
  leave: 'cubic-bezier(.4, 0, 1, 1)',
} as const;

/** How much quicker than normal: the "Fast rivals" setting, a tap on the table, a tap on a rush card. */
export const SPEED = { fast: 0.55, hurry: 0.15, step: 0.15 } as const;

/** The beats the game plays today, at their present lengths. A later package that rebuilds a beat changes it here. */
export const BEAT = {
  /** A piece of fruit or a coin flying between two spots, the swell where it lands, and the gap between two pieces. */
  piece: { fly: 520, land: 300, gap: 90 },
  /** The lorry (PLAN-085): it drives in beside the market's label, one crate of each fruit slides to that fruit's
   *  entry box (`gap` apart), and it drives off after the last stall has bought. About 1.2 s for four crates. */
  lorry: { drive: 300, crate: 360, gap: 120, off: 300 },
  /** The pause before each rival action (shorter on the fast setting). A rival's whole buying turn is one beat
   *  (PLAN-085): its pieces leave `gap` apart, each taking FEEL.travel, about a second with the pause. */
  rival: { pause: 380, pauseFast: 150, gap: 100 },
  /** Customers arrive (PLAN-085): the walk-ins turn face up one after another, `gap` apart, each in FEEL.turn. */
  arrive: { gap: 100 },
  /** Passing a shared phone: taps are ignored for `guard` after the hand-over screen appears, so the second tap of
   *  a double tap on Done cannot start the next person's turn while the first still holds the phone. */
  handoff: { guard: 500 },
  /** Labels over a stall: the pop as one appears; how long a played favour or a built upgrade stays up; a favour card
   *  won in the rush; a bonus tip; a "+$7" floating up; a message at the bottom of the screen. */
  label: { pop: 280, read: 1100, favourWon: 800, bonus: 500, float: 1300, toast: 2000 },
  /** Filling your crate: a piece from the shelf row to the crate, and back (flow study D3: 260 ms a piece). */
  stock: { fly: 260 },
  /** Pricing: your price tags turn face down as you ring the bell (flow study D3: seal 200 ms). */
  price: { seal: 200 },
  /** The bell: every crate open on the table (a base and a little more for each stall), "No sales today", a crate turning over. */
  bell: { read: 1500, readPerStall: 350, noSales: 1100, crateTurn: 400 },
  /** One customer in the rush (rush.ts rushPace; flow study D3): the customer's card slides in from the row, the
   *  stalls' offers turn up under it, and for each fruit wanted the pieces go to the card (`pieceGap` apart, FEEL.travel
   *  each) and the coins come back (`coinGap` apart, FEEL.coin each). A further fruit starts `fruit` after the one
   *  before. The result is then held to be read and the card slides back. A favour card won slides to its stall
   *  while the result is read. About 2.4 s for one fruit and 0.5 s more for each further fruit. */
  rush: { cardIn: 250, rows: 300, pieceGap: 80, coinGap: 60, fruit: 500, read: 1000, cardOut: 200, favour: 340 },
  /** The night (PLAN-085, about 2.5 s): dusk falls over the table, every piece slides one box along its lane, a beat
   *  to settle, a moment to read (a Juice Bar's coins travel then, `gap` apart), the last beat before dawn; a piece
   *  leaving the last box tips off over `spoil`; in the stylesheet, the sky darkening and the dusk over the market
   *  (`rise` and `riseAfter` are the older panel's, kept for its stylesheet). */
  night: { dusk: 400, slide: 900, settle: 80, read: 920, spoil: 300, gap: 80, juiceCoin: 360, end: 200, sky: 400, duskFade: 400, rise: 450, riseAfter: 550 },
  /** The morning: the news card turning over, and the "FINAL DAY!" stamp. */
  morning: { newsTurn: 550, stamp: 1100 },
  /** Coins that carry a payment between a stall's cash and the table (the dawn's top-up and fine, a standing order's
   *  stake, an upgrade's price): the gap between two coins. Each coin takes FEEL.coin. */
  coins: { gap: 60 },
  /** Dawn: a breath after the news has turned over, before the coins. */
  dawn: { after: 250 },
  /** The standing order's bids: face down for a breath, turned over together (FEEL.turn), a moment to read them and
   *  who won, then the stake put on the card and a moment to see it there. */
  order: { down: 250, read: 600, after: 500 },
  /** The evening: a moment to see a built upgrade on the stall, after its card (FEEL.travel) and the coins have
   *  landed; and how long the label of a favour played in the evening stays up (a beat of under a second). */
  evening: { seen: 300, label: 800 },
} as const;

/** The lengths the stylesheets use, by the name they read them under: `var(--t-<name>)`, a time in ms. */
export const CSS_MS: Record<string, number> = {
  travel: FEEL.travel, coin: FEEL.coin, turn: FEEL.turn, 'sheet-in': FEEL.sheetIn, 'sheet-out': FEEL.sheetOut, count: FEEL.countStep,
  land: BEAT.piece.land, 'news-turn': BEAT.morning.newsTurn, stamp: BEAT.morning.stamp, 'crate-turn': BEAT.bell.crateTurn,
  'rush-rows': BEAT.rush.rows,
  sky: BEAT.night.sky, dusk: BEAT.night.duskFade, rise: BEAT.night.rise, 'rise-after': BEAT.night.riseAfter,
  lorry: BEAT.lorry.drive, 'lorry-off': BEAT.lorry.off,
};

// ---------- the one speed ----------

let base = 1;
let hurry = 1;
/** The rush pop-up's own speed-up: a tap makes the rest of the current customer quick (reset for the next one). */
let step = 1;
/** Waits still running, so a tap or Skip can end them at once. */
const waiting = new Set<() => void>();
const endWaits = () => { for (const done of [...waiting]) done(); };

const REDUCE = '(prefers-reduced-motion: reduce)';
/** The player asked for less motion: nothing travels, the state is shown at once, and reading pauses are kept. */
export const isReduced = () => typeof matchMedia !== 'undefined' && matchMedia(REDUCE).matches;

/** The one speed (1 normal, lower is quicker). It only changes how fast this screen draws: never the game. */
export const speed = () => base * hurry * step;
/** How long travel takes, as a share of its normal length: the speed, or 0 with reduced motion. Stylesheets read it as --mk. */
export const travel = () => (isReduced() ? 0 : speed());

export function setBaseSpeed(fast: boolean) { base = fast ? SPEED.fast : 1; publish(); }
/** Tap-to-skip: ends every pause and makes what plays next very quick, until resetHurry() (the game screen calls that
 *  when the table waits for the player again, so one tap carries through every rival's turn). */
export function hurryUp() { hurry = SPEED.hurry; publish(); endWaits(); }
export function resetHurry() { hurry = 1; step = 1; publish(); }
export const hurried = () => hurry < 1;
/** The fast setting is on. */
export const isFast = () => base < 1;
/** A tap on the rush pop-up: this customer finishes quickly, then the next one plays at the normal pace. */
export function speedStep() { step = SPEED.step; publish(); endWaits(); }
export function resetStep() { step = 1; publish(); }

// ---------- lengths and pauses at the current speed ----------

/** How long a move of `n` ms takes right now: shorter when the table is quick, 0 when nothing travels. */
export const moveMs = (n: number) => n * travel();
/** The same as a length for an animation call, which must not be 0. */
export const ms = (n: number) => moveMs(n) + 1;
/** How long a reading pause of `n` ms lasts right now. Kept with reduced motion: also for a move that must end
 *  together with such a pause (the night's slide). */
export const held = (n: number) => n * speed();

function sleep(t: number) {
  return new Promise<void>((r) => {
    const done = () => { clearTimeout(id); waiting.delete(done); r(); };
    const id = setTimeout(done, t);
    waiting.add(done);
  });
}
/** A pause while something moves. With reduced motion nothing moves, so there is nothing to wait for. A tap ends it. */
export const wait = (n: number) => sleep(moveMs(n));
/** A pause to read something: kept with reduced motion (nothing moves then, but the words still need time). A tap ends it. */
export const hold = (n: number) => sleep(held(n));
/** A fixed pause between two turns (the caller picks its length): short while hurried, and a tap ends it at once. */
export const pause = (n: number) => sleep(n * hurry);
/** One frame of the screen, in ms: a thing that ends on the clock is taken away a frame after its move, so the
 *  move's last frame is drawn first. */
export const FRAME = 16;
/** A plain timer, for a move that is already under way: a tap does not end it. */
export const timer = (t: number) => new Promise<void>((r) => { setTimeout(r, t); });
export const frame = () => new Promise<void>((r) => requestAnimationFrame(() => requestAnimationFrame(() => r())));

// ---------- the same speed and lengths for the stylesheets ----------

/** Where the stylesheets read the speed (--mk) and the lengths (--t-...): the page itself. */
export interface MotionRoot { style: { setProperty(name: string, value: string): void } }
let root: MotionRoot | null = null;
let written: MotionRoot | null = null;
let shown = '';

function page(): MotionRoot | null {
  const el = typeof document === 'undefined' ? undefined : (document.documentElement as HTMLElement | undefined);
  return el?.style ? el : null;
}

/** Writes the speed where the stylesheets read it, whenever it changes (and the lengths, once). */
function publish() {
  const el = root ?? page();
  if (!el) return;
  if (el !== written) {
    for (const [name, n] of Object.entries(CSS_MS)) el.style.setProperty(`--t-${name}`, `${n}ms`);
    written = el;
    shown = '';
  }
  const k = String(Math.round(travel() * 10000) / 10000);
  if (k === shown) return;
  el.style.setProperty('--mk', k);
  shown = k;
}

/** Tests: a stand-in for the page (null goes back to the page itself). */
export function setMotionRoot(el: MotionRoot | null) { root = el; written = null; publish(); }

publish();
// The player can change the reduced-motion setting while the game is open.
if (typeof matchMedia !== 'undefined') matchMedia(REDUCE).addEventListener?.('change', publish);
