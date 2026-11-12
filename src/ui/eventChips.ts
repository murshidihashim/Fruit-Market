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
  if (e.priceAll) out.push({ big: signed(e.priceAll, true), small: 'Every customer pays' });
  for (const f of LANES) if (e.price?.[f]) out.push({ fruit: f, big: signed(e.price[f]!, true), small: `Per ${FRUIT[f].name}` });
  if (e.cost) out.push({ big: signed(e.cost, true), small: 'Market prices' });
  if (e.maxPrice) out.push({ big: 'Max', small: 'Prices are capped' });
  if (e.inspector) out.push({ big: `−$${e.inspector}`, small: 'Per soft piece' });
  if (e.walkIns) out.push({ big: e.walkIns > 0 ? 'More' : 'Fewer', small: 'Walk-ins today' });
  if (e.extra) out.push({ big: 'Guest', small: 'A special customer' });
  if (e.noDelivery) out.push({ big: 'No', small: 'Lorry today' });
  if (e.noFruit) out.push({ fruit: e.noFruit, big: 'No', small: `${FRUIT[e.noFruit].plural} today` });
  if (e.supplyMult && e.supplyMult < 1) out.push({ big: 'Half', small: 'The delivery' });
  if (e.supplyAll) out.push({ big: 'Extra', small: 'Of every fruit' });
  for (const f of LANES) if (e.supplyEach?.[f]) out.push({ fruit: f, big: 'Extra', small: `${FRUIT[f].plural} today` });
  if (e.hawker) out.push({ big: `$${e.hawker}`, small: 'Night hawker pays' });
  if (e.ageExtra) out.push({ big: e.ageExtra > 0 ? `+${e.ageExtra}` : 'None', small: e.ageExtra > 0 ? 'Age step tonight' : 'Ageing tonight' });
  return out.slice(0, 3);
}

/**
 * The number blocks on an event's printed card. The same figures as the morning's chips, except Price Controls: its
 * card prints the limit for each fruit (the morning shows them in a row under the text).
 */
export function cardChips(e: EventCard): NewsChip[] {
  if (e.maxPrice) return LANES.map((f) => ({ fruit: f, big: `$${e.maxPrice![f]}`, small: 'Max' }));
  return newsChips(e);
}
