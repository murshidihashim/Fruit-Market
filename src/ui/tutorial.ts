// The first-game coach: one short tip per new situation, shown once, never blocking the board.
import type { GameState } from '../engine/game';

const KEY = 'fm.tutorial';

export interface Tip { id: string; title: string; text: string }

export const TIPS: Tip[] = [
  { id: 'trait', title: 'Pick a perk', text: 'Each shop keeps one trait for the whole game. Rivals can see yours.' },
  { id: 'morning', title: 'A new day', text: 'The farmer has delivered fruit to the market in the middle. Customers wait at the top. Tap Open the market.' },
  { id: 'buy', title: 'Your turn to buy', text: 'Tap a glowing fruit in the market. Each column is one fruit, newest at the top; fresh fruit costs more but customers pay more for it. Check the bubbles: buy what people want.' },
  { id: 'bought', title: 'Nice!', text: 'It\'s on your stall now, at the bottom. Each chip shows how many nights it has left. Tap Done buying when you\'re finished.' },
  { id: 'stall', title: 'Open your stall', text: 'Choose how many of each fruit to put out today. Everyone sees how many each stall puts out before anyone sets a price.' },
  { id: 'bid', title: 'Secret prices', text: 'One price per fruit. At the bell all prices show together; customers queue at the cheapest stall first, and leftover demand goes to the next.' },
  { id: 'reveal', title: 'The rush', text: 'Each customer buys from the cheapest stall that has fruit fresh enough for the price. Ties go to Favoured Trade, then the Haggler, then fresher fruit.' },
  { id: 'evening', title: 'Evening', text: 'Play a favour card or build a speciality, or keep your cash: cash is your score. Tonight all fruit ages one step.' },
  { id: 'day2', title: 'You\'re ready', text: 'From now on the poorest shop buys first. Most cash after the last day wins. Good luck!' },
];

function load(): string[] {
  try { return JSON.parse(localStorage.getItem(KEY) ?? '[]') as string[]; } catch { return []; }
}

export function markSeen(id: string) {
  try { localStorage.setItem(KEY, JSON.stringify([...new Set([...load(), id])])); } catch { /* ignore */ }
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
