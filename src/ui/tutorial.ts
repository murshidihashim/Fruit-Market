// The first-game coach: one short tip per new situation, shown once, never blocking the board, and the first Market
// Day evening's pop-up (when it shows is decided here; FirstTime.tsx draws it).
import { FAVOURS } from '../engine/data';
import { activePlayer, canPlayFavour, canUpgrade, isDraftNight, type GameState } from '../engine/game';
import { TIE_ORDER_CARD } from './rulesText';

const KEY = 'fm.tutorial';

export interface Tip { id: string; title: string; text: string }

// The wording follows the glossary (DEC-087) and rules 20. There is no tip for picking a perk: the picker's own card
// says the same sentence (ids already kept on a phone, 'trait' among them, are harmless).
export const TIPS: Tip[] = [
  { id: 'morning', title: 'Morning', text: 'Each morning starts with today’s news and the lorry. Today’s customers are at the top, under tomorrow’s. Tap Start buying.' },
  { id: 'buy', title: 'Your turn to buy', text: 'Tap a fruit to buy, freshest at the top. Buy what the customers want. Fresher costs more, but customers pay more for it.' },
  { id: 'bought', title: 'On your shelf', text: 'It\'s on your shelf. Tap Done buying when you\'re finished.' },
  { id: 'stall', title: 'Fill your crate', text: 'Tap + beside a row to put that piece in your crate. Only pieces in your crate can sell today. Rivals see how many, not which fruit.' },
  { id: 'bid', title: 'Secret prices', text: 'Set a price for each fruit with − and +. You see how many pieces each rival has in their crate, not which fruit. Prices and crates open at the bell. The cheapest stall sells first.' },
  { id: 'reveal', title: 'The rush', text: `Each customer bought from the cheapest stall with fruit fresh enough for their price. Ties: ${TIE_ORDER_CARD} in today's buying.` },
  // The words for a stall that is not known; tipFor says what this evening offers the stall deciding (eveningTip).
  { id: 'evening', title: 'Evening', text: 'If you can, play a favour card or build an upgrade. Then tap Lights out, and night falls.' },
  { id: 'day2', title: 'From Day 2', text: 'From now on the poorest stall buys first, then the others clockwise. Most cash after the last day wins.' },
];

function load(): string[] {
  try { return JSON.parse(localStorage.getItem(KEY) ?? '[]') as string[]; } catch { return []; }
}

export function markSeen(id: string) {
  try { localStorage.setItem(KEY, JSON.stringify([...new Set([...load(), id])])); } catch { /* storage blocked: the tip may show again next game */ }
}

/** Turn the coach off for good: every later tip stays hidden until the tutorial is replayed from Settings. */
export function skipTutorial() {
  // ('day2' is what a phone from before PLAN-113 keeps for this; 'off' also ends the tips on a phone that had the guided
  // first sale, FIRST_SALE_DONE.)
  markSeen('day2');
  markSeen('off');
}

export function resetTutorial() {
  try { localStorage.removeItem(KEY); } catch { /* storage blocked: no tip was kept as seen, so every tip shows anyway */ }
}

/**
 * The evening tip for stall `p` (REP-122 C-14, S16): only what this evening really offers it, and what tonight does to
 * fruit. Since rules 19 a stall gets an evening only when it has something to decide, so the first one may be for an
 * upgrade alone, or a favour card alone; a Heatwave night ages fruit 2 steps and a Monsoon Downpour night not at all
 * (game.ts shelfSteps).
 */
export function eveningTip(s: GameState, p: number): string {
  const pl = s.players[p];
  if (!pl) return TIPS.find((t) => t.id === 'evening')!.text;
  const favour = pl.favours.some((id, i) => FAVOURS[id].when === 'evening' && canPlayFavour(s, p, i) === null);
  const upgrade = (pl.upgradeOffer ?? []).some((u) => canUpgrade(s, p, u) === null);
  const what = favour && upgrade ? 'Play a favour card or build an upgrade now, or both.'
    : favour ? 'You can play a favour card now, or keep it.'
    : upgrade ? 'After a Market Day you can build 1 upgrade now.'
    : pl.trait === 'keeper' ? 'Name the fruit your Shade Cloth keeps from ageing tonight.'
    : 'Make your choices for tonight.';
  const steps = Math.max(0, 1 + (s.event?.ageExtra ?? 0));
  const night = steps === 0 ? 'No fruit ages tonight.' : steps === 1 ? 'Tonight all fruit ages one step.' : `Tonight all fruit ages ${steps} steps.`;
  return `${what} Then tap Lights out. ${night}`;
}

/** The mark a phone kept once it had played the guided first sale to the bell (PLAN-113; the owner removed the guided
 *  sale in 1.31.2). A phone that has it still gets the tips for buying, the shelf, the crate and prices from Day 2 on
 *  (tipFor), as the guided sale had done those steps for it on Day 1. Its other mark, 'firstsale-skip', changes nothing. */
export const FIRST_SALE_DONE = 'firstsale';

/** The tip for this moment, if the player hasn't seen it yet. */
export function tipFor(s: GameState, ctx: { myBuyTurn: boolean; boughtToday: number; pricing: boolean; picker: boolean; evening: boolean }): Tip | null {
  const seen = load();
  if (seen.includes('off')) return null;
  // On a phone that had a guided first sale (FIRST_SALE_DONE) the tips for the steps it did on Day 1 (buying, the
  // shelf, the crate, prices) are still to come, each at its moment from Day 2 on; otherwise the Day 2 tip is the last.
  if (seen.includes('day2') && !seen.includes(FIRST_SALE_DONE)) return null;
  const pick = (id: string) => (seen.includes(id) ? null : TIPS.find((t) => t.id === id)!);
  if (ctx.picker) return null;
  if (s.phase === 'morning' && s.day === 1) return pick('morning');
  if (s.phase === 'buy' && ctx.myBuyTurn) return ctx.boughtToday > 0 ? pick('bought') : pick('buy');
  if (ctx.pricing) return s.phase === 'stall' ? pick('stall') : pick('bid');
  if (s.phase === 'reveal' && s.day === 1) return pick('reveal');
  if (ctx.evening) {
    // The coach is offline only, where the evening's active stall is the person deciding now (Game.tsx).
    // PLAN-128: on the first Market Day evening the Market Day pop-up comes first; this tip follows once it is read.
    if (marketDayIntro(s, activePlayer(s))) return null;
    const tip = pick('evening');
    return tip && { ...tip, text: eveningTip(s, activePlayer(s)) };
  }
  if (s.day >= 2 && s.phase === 'morning') return pick('day2');
  return null;
}

// ---------- PLAN-128: the first Market Day evening ----------

/** The mark kept with the tips once the Market Day pop-up has been read: it does not show again on this phone. */
export const MARKET_DAY_SEEN = 'marketday';

/**
 * Is this the moment for the Market Day pop-up (FirstTime.tsx MarketDayPopup)? Stall `p`'s own evening after a Market
 * Day (the evening upgrades are offered: isDraftNight), the first on this phone, with the tips on (Skip tutorial turns
 * them off: the 'off' mark). The caller asks only while `p`'s evening sheet is up, so online it never holds up anyone
 * else: every stall decides its evening at the same time.
 */
export function marketDayIntro(s: GameState, p: number): boolean {
  if (s.phase !== 'evening' || !s.players[p] || !isDraftNight(s)) return false;
  const seen = load();
  return !seen.includes('off') && !seen.includes(MARKET_DAY_SEEN);
}

/** The Market Day pop-up has been read. */
export const marketDayRead = () => markSeen(MARKET_DAY_SEEN);
