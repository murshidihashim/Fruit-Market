// PLAN-114: the Market Sprint's one concrete reason on the results, taken from the game's own record (the day history:
// every customer line with each stall's offer). Only what the whole table saw at the reveal is used: prices flip for
// everyone, so a rival's price in the history is public by then. PLAN-119: it names the decisive moment of the Rush,
// the one customer line that moved (or would have moved) your cash the most.
import { FRUIT, lookOf, type FruitId } from './data';
import { count, winners, type GameState } from './game';
import { inContest } from './story';

const fruitWord = (f: FruitId, n: number) => (n === 1 ? FRUIT[f].name.toLowerCase() : FRUIT[f].plural.toLowerCase());

/** One reason, with what kind it is (for tests and the screen's tone) and the dollars it moved (`cash`: a sale's takings,
 *  or what a sale lost to a lower price would have paid you; 0 for fruit left at the end). */
export interface SprintReason { kind: 'undercut' | 'top' | 'sale' | 'left'; text: string; good: boolean; cash: number }

interface Sale { rev: number; day: number; who: string; fruit: FruitId; n: number; price: number; max: number }
interface Lost { lost: number; day: number; rival: number; who: string; theirs: number; mine: number }

/**
 * The decisive moment of the viewer's Sprint (PLAN-119), from the Rush lines in the game's history:
 * - a sale: what it paid you ("Day 3: you sold 2 watermelons to Sleepy Zul at $7, the top price. That sale brought in
 *   $14.");
 * - a sale lost to a lower price: what it would have paid you at your price ("Day 2: Uncle Benny's $4 sold first to
 *   Zara Zapp; yours was $6. That cost you $12.").
 * The moment that moved the most dollars is named. A win always names its biggest sale (the money that won it); when
 * a lost sale and a sale are the same size, the lost sale is named, as the one to learn from. Without either, the
 * fruit left on the shelf at the end. Null when there is nothing to say (no day was played).
 */
export function sprintReason(s: GameState, viewer: number): SprintReason | null {
  const hist = s.history ?? [];
  if (!hist.length || !s.players[viewer]) return null;
  let sale: Sale | null = null;
  let under: Lost | null = null;
  for (const d of hist) {
    for (const l of d.lines) {
      const mine = l.offers.find((o) => o.player === viewer);
      if (!mine) continue;
      if (mine.sold > 0) {
        const rev = mine.sold * mine.price;
        const top = mine.price >= l.max;
        // The biggest sale; between two of the same size, the one at the top price, then the earlier.
        if (!sale || rev > sale.rev || (rev === sale.rev && top && sale.price < sale.max)) {
          sale = { rev, day: d.day, who: lookOf(l.name).title, fruit: l.fruit, n: mine.sold, price: mine.price, max: l.max };
        }
        continue;
      }
      if (!inContest(mine)) continue;
      // Every lower price that sold to this customer while your crate sold nothing: the pieces you could have sold.
      const cheaper = l.offers.filter((o) => o.player !== viewer && o.sold > 0 && o.price < mine.price);
      if (!cheaper.length) continue;
      const lost = Math.min(mine.qty, cheaper.reduce((a, o) => a + o.sold, 0)) * mine.price;
      const lead = cheaper.reduce((a, o) => (o.sold > a.sold || (o.sold === a.sold && o.price < a.price) ? o : a));
      if (!under || lost > under.lost) under = { lost, day: d.day, rival: lead.player, who: lookOf(l.name).title, theirs: lead.price, mine: mine.price };
    }
  }
  const saleText = (x: Sale): SprintReason => ({
    kind: x.price >= x.max ? 'top' : 'sale', good: true, cash: x.rev,
    text: x.price >= x.max
      ? `Day ${x.day}: you sold ${x.n} ${fruitWord(x.fruit, x.n)} to ${x.who} at $${x.price}, the top price. That sale brought in $${x.rev}.`
      : `Day ${x.day}: you sold ${x.n} ${fruitWord(x.fruit, x.n)} to ${x.who} at $${x.price}; the top price was $${x.max}. That sale brought in $${x.rev}.`,
  });
  const lostText = (x: Lost): SprintReason => ({
    kind: 'undercut', good: false, cash: x.lost,
    text: `Day ${x.day}: ${s.players[x.rival].name}'s $${x.theirs} sold first to ${x.who}; yours was $${x.mine}. That cost you $${x.lost}.`,
  });
  if (winners(s).includes(viewer)) return sale ? saleText(sale) : null;
  if (under && (!sale || under.lost >= sale.rev)) return lostText(under);
  if (sale) return saleText(sale);
  const left = s.phase === 'over' ? count(s.players[viewer].stock) : 0;
  if (left > 0) return { kind: 'left', good: false, cash: 0, text: `${left} fruit ${left === 1 ? 'was' : 'were'} left on your shelf at the end, worth $0.` };
  return null;
}
