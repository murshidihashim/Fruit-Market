// What an event changes, as big figures (PLAN-072): the coloured number blocks on an event card and the chips on the
// morning's news. Worked out from the event's own data (data.ts), so a figure can never disagree with the rule.
import { FRUIT, type EventCard, type FruitId } from '../engine/data';
import { LANES } from './boardModel';

/** Whose money a figure is (PLAN-106): what stalls pay when they buy at the Wholesale Market, or what customers pay. */
export type Pay = 'market' | 'customer';
/** `pay`: set on a figure about a price, from the field the event changes: `cost` and `costFruit` are the Wholesale Market's; `priceAll`, `price` and `maxPrice` are customers'. The other figures (the inspector's fine, the night
 *  hawker, the crowd, the lorry, the night) have none. */
export interface NewsChip { fruit?: FruitId; big: string; small: string; pay?: Pay }
const signed = (n: number, money = false) => `${n > 0 ? '+' : '−'}${money ? '$' : ''}${Math.abs(n)}`;
/** One piece of a fruit, in words: "a blueberry", "an apple" (C-05). */
const onePiece = (f: FruitId) => {
  const word = FRUIT[f].name.toLowerCase();
  return `${/^[aeiou]/.test(word) ? 'an' : 'a'} ${word}`;
};

/** What today's event changes, as big figures (at most three): prices first, then the crowd, the lorry and the night. */
export function newsChips(e: EventCard | null | undefined): NewsChip[] {
  if (!e) return [];
  const out: NewsChip[] = [];
  if (e.priceAll) out.push({ big: signed(e.priceAll, true), small: 'From every customer', pay: 'customer' });
  for (const f of LANES) if (e.price?.[f]) out.push({ fruit: f, big: signed(e.price[f]!, true), small: onePiece(f), pay: 'customer' });
  if (e.cost) out.push({ big: signed(e.cost, true), small: 'At the Wholesale Market', pay: 'market' });
  // One fruit's price at the Wholesale Market (Blueberry Glut since rules 18; REP-122 C-06).
  for (const f of LANES) if (e.costFruit?.[f]) out.push({ fruit: f, big: signed(e.costFruit[f]!, true), small: `To buy ${onePiece(f)}`, pay: 'market' });
  if (e.maxPrice) out.push({ big: 'Limit', small: 'On every price', pay: 'customer' });
  if (e.inspector) out.push({ big: `−$${e.inspector}`, small: 'Per Soft piece' });
  if (e.walkIns) out.push({ big: e.walkIns > 0 ? 'More' : 'Fewer', small: 'Walk-ins today' });
  if (e.extra) out.push({ big: 'Guest', small: 'Joins the row' });
  if (e.noDelivery) out.push({ big: 'No', small: 'Lorry today' });
  if (e.noFruit) out.push({ fruit: e.noFruit, big: 'No', small: `${FRUIT[e.noFruit].plural.toLowerCase()} today` });
  if (e.supplyMult && e.supplyMult < 1) out.push({ big: 'Half', small: 'A lorry today' });
  if (e.supplyAll) out.push({ big: 'Extra', small: 'Of every fruit' });
  for (const f of LANES) if (e.supplyEach?.[f]) out.push({ fruit: f, big: 'Extra', small: `${FRUIT[f].plural.toLowerCase()} today` });
  if (e.hawker) out.push({ big: `$${e.hawker}`, small: 'From the night hawker' });
  if (e.ageExtra) out.push({ big: e.ageExtra > 0 ? `+${e.ageExtra}` : 'No', small: e.ageExtra > 0 ? 'Extra ageing tonight' : 'Ageing tonight' });
  return out.slice(0, 3);
}

/** An event card has room for one row of two boxes (PLAN-106). */
export const CARD_BOXES = 2;

/**
 * The number blocks on an event's printed card. The same figures as the morning's chips, except Price Controls: its
 * card prints the limit for each fruit (the morning shows them in a row under the text). The figures come prices
 * first, so an event with three of them (Blueberry Glut: what customers pay, what a blueberry costs to buy, then the
 * extra blueberries) prints its two prices; its text says the rest.
 */
export function cardChips(e: EventCard): NewsChip[] {
  if (e.maxPrice) return LANES.map((f) => ({ fruit: f, big: `$${e.maxPrice![f]}`, small: 'Limit', pay: 'customer' }));
  return newsChips(e).slice(0, CARD_BOXES);
}

/** A price change at the Wholesale Market as the chip beside its name says it: "+$1 each today", "−$1 blueberries
 *  today". `up`: dearer (shown as a warning) or cheaper. */
export interface MarketChip { text: string; up: boolean }

/** What today's event does to prices at the Wholesale Market (S20): every fruit (`cost`), then one fruit (`costFruit`). */
export function marketChips(e: EventCard | null | undefined): MarketChip[] {
  if (!e) return [];
  const out: MarketChip[] = [];
  if (e.cost) out.push({ text: `${signed(e.cost, true)} each today`, up: e.cost > 0 });
  for (const f of LANES) {
    const n = e.costFruit?.[f];
    if (n) out.push({ text: `${signed(n, true)} ${FRUIT[f].plural.toLowerCase()} today`, up: n > 0 });
  }
  return out;
}
