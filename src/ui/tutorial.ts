// The first-game coach: one short tip per new situation, shown once, never blocking the board.
import type { GameState } from '../engine/game';

const KEY = 'fm.tutorial';

export interface Tip { id: string; title: string; text: string }

export const TIPS: Tip[] = [
  { id: 'trait', title: 'Pick a perk', text: 'Each stall keeps one perk for the whole game. Rivals can see yours.' },
  { id: 'morning', title: 'A new day', text: 'Each morning starts with today’s news. Customers wait at the top. Tap Start buying to go to the Wholesale Market, where the farmer has just delivered fruit.' },
  { id: 'buy', title: 'Your turn to buy', text: 'Tap a box with a black border to buy one piece. Each lane is one fruit, freshest at the top (G green, F fresh, O okay, S soft); fresh fruit costs more but customers pay more for it. Check the customer tickets: buy what people want.' },
  { id: 'bought', title: 'Nice!', text: 'It\'s on your shelf now, at the bottom. The letters under each fruit count your pieces: F fresh, O okay, S soft, G green. Tap Done buying when you\'re finished.' },
  { id: 'stall', title: 'Open your stall', text: 'Tap + beside a row to put that fruit in your crate. Only fruit in your crate can sell today. Rivals will only see how many pieces you put out.' },
  { id: 'bid', title: 'Secret prices', text: 'Set a price for each fruit with − and +. You see how many pieces each rival put out, not which fruit. Prices and crates open at the bell; the cheapest stall sells first.' },
  { id: 'reveal', title: 'How the rush went', text: 'Each customer bought from the cheapest stall with fruit fresh enough for their price. Ties go to Favoured Trade, then fresher fruit, then the Haggler, then whoever bought earlier.' },
  { id: 'evening', title: 'Evening', text: 'Tonight all fruit ages one step. Play a favour card if you have one, or keep your cash: cash is your score. After each Market Day you can also build a stall upgrade.' },
  { id: 'day2', title: 'You\'re ready', text: 'From now on the poorest stall buys first, then the others go clockwise. Most cash after the last day wins. Good luck!' },
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
  if (ctx.picker) return pick('trait');
  if (s.phase === 'morning' && s.day === 1) return pick('morning');
  if (s.phase === 'buy' && ctx.myBuyTurn) return ctx.boughtToday > 0 ? pick('bought') : pick('buy');
  if (ctx.pricing) return s.phase === 'stall' ? pick('stall') : pick('bid');
  if (s.phase === 'reveal' && s.day === 1) return pick('reveal');
  if (ctx.evening) return pick('evening');
  if (s.day >= 2 && s.phase === 'morning') return pick('day2');
  return null;
}
