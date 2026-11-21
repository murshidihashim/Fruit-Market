// PLAN-114: the Market Sprint's one concrete reason on the results, taken from the game's own record (the day history:
// every customer line with each stall's offer). Only what the whole table saw at the reveal is used: prices flip for
// everyone, so a rival's price in the history is public by then.
import { FRUIT, lookOf, type FruitId } from './data';
import { count, winners, type GameState } from './game';
import { inContest } from './story';

const fruitWord = (f: FruitId, n: number) => (n === 1 ? FRUIT[f].name.toLowerCase() : FRUIT[f].plural.toLowerCase());

/** One reason, with what kind it is (for tests and the screen's tone). */
export interface SprintReason { kind: 'undercut' | 'top' | 'sale' | 'left'; text: string; good: boolean }

/**
 * The single reason that best explains how the viewer's Sprint went:
 * - a win: the biggest sale made at the customer's top price ("Day 3: you sold 2 watermelons to Sleepy Zul at $7, the
 *   top price."), else the biggest sale;
 * - otherwise: the biggest sale a rival took by pricing under the viewer ("Day 2: Uncle Benny's $4 sold first to Zara
 *   Zapp; yours was $6."), else the fruit left at the end, else the biggest sale.
 * Null when there is nothing to say (no day was played).
 */
export function sprintReason(s: GameState, viewer: number): SprintReason | null {
  const hist = s.history ?? [];
  if (!hist.length || !s.players[viewer]) return null;
  let top: { rev: number; day: number; who: string; fruit: FruitId; n: number; price: number } | null = null;
  let sale: { rev: number; day: number; who: string; fruit: FruitId; n: number; price: number; max: number } | null = null;
  let under: { lost: number; day: number; rival: number; who: string; theirs: number; mine: number } | null = null;
  for (const d of hist) {
    for (const l of d.lines) {
      const mine = l.offers.find((o) => o.player === viewer);
      if (!mine) continue;
      if (mine.sold > 0) {
        const rev = mine.sold * mine.price;
        const who = lookOf(l.name).title;
        if (mine.price >= l.max && (!top || rev > top.rev)) top = { rev, day: d.day, who, fruit: l.fruit, n: mine.sold, price: mine.price };
        if (!sale || rev > sale.rev) sale = { rev, day: d.day, who, fruit: l.fruit, n: mine.sold, price: mine.price, max: l.max };
        continue;
      }
      if (!inContest(mine)) continue;
      for (const o of l.offers) {
        if (o.player === viewer || o.sold === 0 || o.price >= mine.price) continue;
        const lost = Math.min(mine.qty, o.sold) * o.price;
        if (!under || lost > under.lost) under = { lost, day: d.day, rival: o.player, who: lookOf(l.name).title, theirs: o.price, mine: mine.price };
      }
    }
  }
  const topText = top && { kind: 'top' as const, good: true, text: `Day ${top.day}: you sold ${top.n} ${fruitWord(top.fruit, top.n)} to ${top.who} at $${top.price}, the top price.` };
  const saleText = sale && { kind: 'sale' as const, good: true, text: sale.price >= sale.max
    ? `Day ${sale.day}: you sold ${sale.n} ${fruitWord(sale.fruit, sale.n)} to ${sale.who} at $${sale.price}, the top price.`
    : `Day ${sale.day}: you sold ${sale.n} ${fruitWord(sale.fruit, sale.n)} to ${sale.who} at $${sale.price}; the top price was $${sale.max}.` };
  if (winners(s).includes(viewer)) return topText ?? saleText ?? null;
  if (under) return { kind: 'undercut', good: false, text: `Day ${under.day}: ${s.players[under.rival].name}'s $${under.theirs} sold first to ${under.who}; yours was $${under.mine}.` };
  const left = s.phase === 'over' ? count(s.players[viewer].stock) : 0;
  if (left > 0) return { kind: 'left', good: false, text: `${left} fruit ${left === 1 ? 'was' : 'were'} left on your shelf at the end, worth $0.` };
  return saleText ?? null;
}
