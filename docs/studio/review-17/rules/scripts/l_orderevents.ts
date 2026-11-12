// D4: events around a standing order's due day, through a real night and a real morning.
import { FARMER_CARDS, type EventId } from '/home/user/Fruit-Market/src/engine/data';
import { beginBuying, type GameState } from '/home/user/Fruit-Market/src/engine/game';
import { H, bell, cust, ev, evIdx, give, lorryIdx, mk, sales, say, shelf, standing, toNextMorning } from './lib';

function dueMorning(order: string, dueEvent: EventId | null, eveEvent: EventId | null, set: (s: GameState) => void): GameState {
  const s = mk({ n: 3, day: 4, cash: [30, 10, 10], events: true });
  s.standing = standing(s, order, 0, 6, 5);
  if (eveEvent) s.event = ev(eveEvent);
  s.eventDeck = [evIdx(dueEvent ?? 'priceHike')];
  s.nextFarmer = structuredClone(FARMER_CARDS[lorryIdx('Orchard Run')]);
  s.phase = 'evening'; s.turn = 0;
  set(s);
  return beginBuying(toNextMorning(s));
}
H('Apple Blight on the due day of an apple order (bid 6). Holder kept 3 Fresh apples; regular wants 1 apple at 6');
{
  const m = dueMorning('Pie Factory', 'blight', null, (s) => { give(s, 0, 'apple', { 5: 3 }); give(s, 1, 'apple', { 5: 1 }); });
  say(`  day ${m.day} ${m.event?.id}; delivery ${JSON.stringify(m.delivery)}; holder shelf ${shelf(m, 0)}`);
  const g = structuredClone(m); g.forecast = cust('Marcus', [['apple', 1, 6]]); g.queue = [];
  sales(bell(g, [{ apple: 8 }, { apple: 8 }, {}])).forEach((l) => say(l));
}
H('Lorry Breakdown on the due day: the holder planned to buy today and has nothing');
{
  const m = dueMorning('Pie Factory', 'strike', null, () => {});
  say(`  day ${m.day} ${m.event?.id}; delivery ${JSON.stringify(m.delivery)}; apples at the market ${m.market.apple.join(',')}`);
  const g = structuredClone(m); g.forecast = null; g.queue = [];
  sales(bell(g, [{}, {}, {}])).forEach((l) => say(l));
}
H('Heatwave on the day before the due day: the holder holds 3 Fresh blueberries for a blueberry order (bid 6); then the same with a Monsoon');
for (const e of ['heatwave', 'monsoon'] as const) {
  const m = dueMorning('School Canteen', null, e, (s) => { give(s, 0, 'blueberry', { 2: 3 }); });
  say(`  ${e} night -> day ${m.day}: holder shelf ${shelf(m, 0)}`);
  const g = structuredClone(m); g.forecast = null; g.queue = []; g.event = null;
  sales(bell(g, [{ blueberry: 1 }, {}, {}])).forEach((l) => say(l));
}
