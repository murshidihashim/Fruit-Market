// What an event changes, as big figures (PLAN-072): the coloured number blocks on an event card and the chips on the
// morning's news. Worked out from the event's own data (data.ts), so a figure can never disagree with the rule.
import { FRUIT, type EventCard, type FruitId } from '../engine/data';
import { LANES } from './boardModel';

export interface NewsChip { fruit?: FruitId; big: string; small: string }
const signed = (n: number, money = false) => `${n > 0 ? '+' : '−'}${money ? '$' : ''}${Math.abs(n)}`;

/** What today's event changes, as big figures (at most three): prices first, then the crowd, the lorry and the night. */
export function newsChips(e: EventCard | null | undefined): NewsChip[] {
  if (!e) return [];
  const out: NewsChip[] = [];
  if (e.priceAll) out.push({ big: signed(e.priceAll, true), small: 'From every customer' });
  for (const f of LANES) if (e.price?.[f]) out.push({ fruit: f, big: signed(e.price[f]!, true), small: `a ${FRUIT[f].name.toLowerCase()}` });
  if (e.cost) out.push({ big: signed(e.cost, true), small: 'At the Wholesale Market' });
  if (e.maxPrice) out.push({ big: 'Limit', small: 'On every price' });
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

/**
 * The number blocks on an event's printed card. The same figures as the morning's chips, except Price Controls: its
 * card prints the limit for each fruit (the morning shows them in a row under the text).
 */
export function cardChips(e: EventCard): NewsChip[] {
  if (e.maxPrice) return LANES.map((f) => ({ fruit: f, big: `$${e.maxPrice![f]}`, small: 'Limit' }));
  return newsChips(e);
}
