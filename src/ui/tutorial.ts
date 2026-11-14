// The first-game coach: one short tip per new situation, shown once, never blocking the board.
import type { GameState } from '../engine/game';

const KEY = 'fm.tutorial';

export interface Tip { id: string; title: string; text: string }

// The wording follows the glossary (DEC-087) and rules 18. There is no tip for picking a perk: the picker's own card
// says the same sentence (ids already kept on a phone, 'trait' among them, are harmless).
export const TIPS: Tip[] = [
  { id: 'morning', title: 'Morning', text: 'Each morning starts with today’s news and the lorry. Today’s customers are at the top. Tap Start buying.' },
  { id: 'buy', title: 'Your turn to buy', text: 'Tap a fruit to buy, freshest at the top. Buy what the customers want. Fresher costs more, but customers pay more for it.' },
  { id: 'bought', title: 'On your shelf', text: 'It\'s on your shelf. Tap Done buying when you\'re finished.' },
  { id: 'stall', title: 'Fill your crate', text: 'Tap + beside a row to put that piece in your crate. Only pieces in your crate can sell today. Rivals see how many, not which fruit.' },
  { id: 'bid', title: 'Secret prices', text: 'Set a price for each fruit with − and +. You see how many pieces each rival has in their crate, not which fruit. Prices and crates open at the bell. The cheapest stall sells first.' },
  { id: 'reveal', title: 'The rush', text: 'Each customer bought from the cheapest stall with fruit fresh enough for their price. Ties go to Favoured Trade, then fresher fruit, then the Haggler, then whoever bought earlier today.' },
  { id: 'evening', title: 'Evening', text: 'Play favour card now. After a Market Day you can also build 1 upgrade. Tonight all fruit ages one step.' },
  { id: 'day2', title: 'From Day 2', text: 'From now on the poorest stall buys first, then the others clockwise. Most cash after the last day wins.' },
];

function load(): string[] {
  try { return JSON.parse(localStorage.getItem(KEY) ?? '[]') as string[]; } catch { return []; }
}

export function markSeen(id: string) {
  try { localStorage.setItem(KEY, JSON.stringify([...new Set([...load(), id])])); } catch { /* ignore */ }
}

/** Turn the coach off for good: every later tip stays hidden until the tutorial is replayed from Settings. */
export function skipTutorial() {
  markSeen('day2');
}

export function resetTutorial() {
  try { localStorage.removeItem(KEY); } catch { /* ignore */ }
}

/** The tip for this moment, if the player hasn't seen it yet. */
export function tipFor(s: GameState, ctx: { myBuyTurn: boolean; boughtToday: number; pricing: boolean; picker: boolean; evening: boolean }): Tip | null {
  const seen = load();
  if (seen.includes('day2')) return null;
  const pick = (id: string) => (seen.includes(id) ? null : TIPS.find((t) => t.id === id)!);
  if (ctx.picker) return null;
  if (s.phase === 'morning' && s.day === 1) return pick('morning');
  if (s.phase === 'buy' && ctx.myBuyTurn) return ctx.boughtToday > 0 ? pick('bought') : pick('buy');
  if (ctx.pricing) return s.phase === 'stall' ? pick('stall') : pick('bid');
  if (s.phase === 'reveal' && s.day === 1) return pick('reveal');
  if (ctx.evening) return pick('evening');
  if (s.day >= 2 && s.phase === 'morning') return pick('day2');
  return null;
}
