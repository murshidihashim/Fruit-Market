// Part 2 H: the rest. Event x upgrade x perk x favour pairings that can meet.
import { FARMER_CARDS, FRUIT, FRUITS, type EventId, type FruitId } from '/home/user/Fruit-Market/src/engine/data';
import {
  applyAction, beginBuying, buy, buyCost, buyLimit, buyUpgrade, canBuy, canPlayFavour, canUpgrade, count, handLimit, newGame, playFavour, servingCustomers, shelfSize,
  type GameState,
} from '/home/user/Fruit-Market/src/engine/game';
import { H, arrive, attempt, bell, cust, custIdx, ev, evIdx, give, lorryIdx, mk, sales, say, shelf, standing, toNextMorning, track } from './lib';

const mkt = (s: GameState) => FRUITS.map((f) => `${f[0]}[${s.market[f].join(',')}]`).join(' ');

/** The morning of the next day with a chosen event and lorry (real night and real startDay). */
function morning(n: number, event: EventId | null, lorry: string, set: (s: GameState) => void = () => {}, day = 4): GameState {
  const s = mk({ n, day: day - 1, events: !!event });
  if (event) s.eventDeck = [evIdx(event), evIdx('festival')];
  s.nextFarmer = structuredClone(FARMER_CARDS[lorryIdx(lorry)]);
  s.phase = 'evening'; s.turn = 0;
  set(s);
  return toNextMorning(s);
}

H('H1 deliveries: rounding and what arrives where (market tracks are oldest -> newest; mango: Soft, Okay, Fresh, green, green)');
{
  const show = (label: string, s: GameState) => say(`  ${label}: delivery ${JSON.stringify(s.delivery)}; market ${mkt(s)}`);
  show('3 stalls, Orchard Run (2/2/5/1), no event', morning(3, null, 'Orchard Run'));
  show('3 stalls, Orchard Run, Bad Harvest (halve, rounded up, per fruit)', morning(3, 'badHarvest', 'Orchard Run'));
  show('3 stalls, Orchard Run, Apple Blight', morning(3, 'blight', 'Orchard Run'));
  show('3 stalls, Orchard Run, Lorry Breakdown; 2 Fresh blueberries were left at the market yesterday', morning(3, 'strike', 'Orchard Run', (s) => { s.market.blueberry = track('blueberry', { 2: 2 }); }));
  show('3 stalls, Highland Apples (1/1/6/0), Good Harvest (+1 of each per 4 stalls)', morning(3, 'goodHarvest', 'Highland Apples'));
  show('5 stalls, Kampung Truck (6/6/0/6), Good Harvest', morning(5, 'goodHarvest', 'Kampung Truck'));
  show('3 stalls, Mixed Basket (3/3/2/2), Blueberry Glut (+1 per 2 stalls)', morning(3, 'glut', 'Mixed Basket'));
  show('3 stalls, Mixed Basket (3/3/2/2), MANGO WINDFALL ("1 extra RIPE mango per 2 stalls")', morning(3, 'mangoWindfall', 'Mixed Basket'));
  show('3 stalls, Seconds Lorry (3/3/3/2), no event', morning(3, null, 'Seconds Lorry'));
  show('3 stalls, Seconds Lorry, Blueberry Glut (are the extra blueberries Fresh or Okay?)', morning(3, 'glut', 'Seconds Lorry'));
  show('3 stalls, Seconds Lorry, Bad Harvest', morning(3, 'badHarvest', 'Seconds Lorry'));
  show('2 stalls, Quiet Delivery (1/1/1/1), Bad Harvest', morning(2, 'badHarvest', 'Quiet Delivery'));
}
H('H2 Health Inspector: cash 0, cash below the fine; green and Okay pieces; Juice Bar');
for (const cash of [0, 3, 20]) {
  const m = morning(3, 'inspector', 'Quiet Delivery', (s) => { s.players[0].cash = cash; give(s, 0, 'blueberry', { 1: 3, 2: 1 }); give(s, 0, 'mango', { 4: 2 }); });
  say(`  cash ${cash}, shelf at dawn ${shelf(m, 0)} (3 Soft, 1 Okay blueberry, 2 green mango): fine paid ${m.dayFines![0]}, cash ${m.players[0].cash}`);
}
{
  const s = mk({ n: 3, days: 10, day: 9, events: true });
  s.eventDeck = [evIdx('inspector'), evIdx('festival'), evIdx('heatwave')];
  s.phase = 'evening'; s.turn = 0;
  const m = toNextMorning(s);
  say(`  Inspector drawn for the final day (day ${m.day}): event used instead = ${m.event?.id}`);
}
H('H3 Fridge: 1 Soft + 1 Okay blueberry, 1 Okay + 1 Fresh mango + 1 green mango (one night from ripe), 1 older Fresh + 1 newest Fresh apple, then a Monsoon night');
{
  const s = mk({ n: 3 });
  s.event = ev('monsoon');
  s.players[0].favours = ['fridge'];
  give(s, 0, 'blueberry', { 0: 1, 1: 1 });
  give(s, 0, 'mango', { 1: 1, 2: 1, 3: 1 });
  give(s, 0, 'apple', { 2: 1, 5: 1 });
  say('  before:', shelf(s, 0));
  const g = playFavour(s, 0, 0);
  say('  after Fridge:', shelf(g, 0));
  const m = toNextMorning(bell(g, [{}, {}, {}], { crates: ['none', 'none', 'none'] }));
  say('  after the Monsoon night:', shelf(m, 0));
}
H('H4 green mangoes and the night: ordinary, Heatwave, Monsoon; with and without a Ripening Room. Each stall holds 1 mango bought green today and 1 bought green yesterday');
for (const e of [null, 'heatwave', 'monsoon'] as const) for (const room of [false, true]) {
  const s = mk({ n: 3, upgrades: [room ? ['ripening'] : [], [], []] });
  if (e) s.event = ev(e);
  s.market.mango = track('mango', { 4: 1 });
  s.players[0].cash = 10;
  let g = buy(s, 0, 'mango', 4); // today's green mango (Ripening Room puts it one night from ripe)
  g = structuredClone(g);
  g.players[0].stock.mango[3] += room ? 0 : 1; // yesterday's green mango, now one night from ripe
  if (room) g.players[0].stock.mango[2] += 1; // with a Ripening Room yesterday's mango is already Fresh today
  const before = `m[${g.players[0].stock.mango.join(',')}]`;
  const m = toNextMorning(bell(g, [{}, {}, {}], { crates: ['none', 'none', 'none'] }));
  say(`  ${e ?? 'ordinary'}${room ? ' + Ripening Room' : ''}: ${before} -> next morning m[${m.players[0].stock.mango.join(',')}] (Soft,Okay,Fresh,green,green)`);
}
H('H5 Ripening Room built with green mangoes already on the shelf; Free Fruit of a green mango; a mango that ripened at the market');
{
  const s = mk({ n: 3, day: 3, cash: [20, 10, 10] });
  give(s, 0, 'mango', { 4: 2, 3: 1 });
  let r: GameState = applyAction(bell(s, [{}, {}, {}], { crates: ['none', 'none', 'none'] }), 0, { kind: 'finish' });
  r = buyUpgrade(r, 0, 'ripening');
  say('  shelf after building (was m[0,0,0,1,2]):', shelf(r, 0));
  const t = mk({ n: 3, upgrades: [['ripening'], [], []] });
  t.players[0].favours = ['freeFruit'];
  t.market.mango = track('mango', { 4: 1, 3: 1, 2: 1 });
  let g = playFavour(t, 0, 0, { fruit: 'mango', pos: 4 });
  say(`  Free Fruit green mango with Ripening Room: m[${g.players[0].stock.mango.join(',')}], bought today ${g.players[0].boughtToday}, cash ${g.players[0].cash}`);
  g = buy(g, 0, 'mango', 2);
  say(`  then a ripe Fresh mango from the market costs ${10 - g.players[0].cash}: m[${g.players[0].stock.mango.join(',')}]`);
}
H('H6 Bargain Hunter (first fruit 1 less, never under 1) on a plain day, Price Hike and Durian Season: cost of 1st / 2nd piece');
for (const e of [null, 'priceHike', 'durian'] as const) {
  const s = mk({ n: 3, traits: ['bargain', null, null] });
  if (e) s.event = ev(e);
  const rows: string[] = [];
  for (const [f, pos, label] of [['blueberry', 0, 'Soft blueberry'], ['blueberry', 1, 'Okay blueberry'], ['blueberry', 2, 'Fresh blueberry'], ['apple', 5, 'Fresh apple'], ['mango', 4, 'green mango'], ['mango', 2, 'Fresh mango'], ['mango', 0, 'Soft mango']] as [FruitId, number, string][]) {
    const a = structuredClone(s); a.market[f][pos] = 2;
    const first = buyCost(a, 0, f, pos);
    a.players[0].boughtToday = 1;
    rows.push(`${label} ${first}/${buyCost(a, 0, f, pos)}`);
  }
  say(`  ${e ?? 'plain'}: ${rows.join('; ')}`);
}
{
  const s = mk({ n: 3, traits: ['bargain', null, null] });
  s.players[0].favours = ['freeFruit'];
  s.market.apple = track('apple', { 5: 3 });
  let g = playFavour(s, 0, 0, { fruit: 'apple', pos: 5 });
  say(`  Free Fruit first, then buy: bought-today counter ${g.players[0].boughtToday}; next apple costs ${buyCost(g, 0, 'apple', 5)} (the discount is still there)`);
  g = buy(g, 0, 'apple', 5);
  say(`  after one paid apple: next costs ${buyCost(g, 0, 'apple', 5)}`);
}
H('H7 buying limits and shelf: Big Basket, Handcart, both; Free Fruit on top; green fruit counts toward the shelf');
for (const [label, trait, ups] of [['plain', null, []], ['Big Basket', 'basket', []], ['Handcart', null, ['barrow']], ['Big Basket + Handcart', 'basket', ['barrow']]] as const) {
  const s = mk({ n: 3, traits: [trait, null, null], upgrades: [[...ups], [], []], cash: [100, 10, 10] });
  s.market.apple = track('apple', { 5: 20 });
  s.players[0].favours = ['freeFruit'];
  let g: GameState = s, n = 0;
  while (!canBuy(g, 0, 'apple', 5)) { g = buy(g, 0, 'apple', 5); n++; }
  const why = canBuy(g, 0, 'apple', 5);
  const free = attempt('free fruit', () => playFavour(g, 0, 0, { fruit: 'apple', pos: 5 }));
  say(`  ${label}: buy limit ${buyLimit(s.players[0])}, shelf ${shelfSize(s.players[0])}; bought ${n} then "${why}"; Free Fruit after the limit: ${free ? `taken (shelf now ${count(free.players[0].stock)})` : 'refused'}`);
}
{
  const s = mk({ n: 3, cash: [100, 10, 10] });
  give(s, 0, 'mango', { 4: 4, 3: 4 }); // 8 green mangoes
  s.market.apple = track('apple', { 5: 3 });
  s.players[0].favours = ['freeFruit'];
  say(`  shelf of 8 green mangoes: buy -> "${canBuy(s, 0, 'apple', 5)}"`);
  attempt('Free Fruit with a full shelf', () => playFavour(s, 0, 0, { fruit: 'apple', pos: 5 }));
  say(`  (card still in hand: ${JSON.stringify(s.players[0].favours)}; canPlayFavour said: ${canPlayFavour(s, 0, 0) ?? 'playable'})`);
  const e = mk({ n: 3 }); e.players[0].favours = ['freeFruit'];
  attempt('Free Fruit with an empty market', () => playFavour(e, 0, 0, { fruit: 'apple', pos: 5 }));
  say(`  (canPlayFavour said: ${canPlayFavour(e, 0, 0) ?? 'playable'})`);
}
H('H8 Charmer: starting hand, hand limit, two favours a day, and an empty favour deck');
{
  const g = newGame({ players: [{ name: 'Chen', kind: 'human', avatar: '🐼' }, { name: 'B', kind: 'human', avatar: '🦊' }, { name: 'C', kind: 'human', avatar: '🐷' }, { name: 'D', kind: 'human', avatar: '🐸' }], days: 10, unripe: true, upgrades: true, events: false, seed: 5 });
  say(`  new 4-stall game: Charmer hand ${JSON.stringify(g.players[0].favours)} (limit ${handLimit(g.players[0])}); deck left ${g.favourDeck.length} of 12; others' cash ${JSON.stringify(g.players.map((p) => p.cash))}`);
  // three customers served alone by the Charmer in one day, hand has room
  const s = mk({ n: 4, traits: ['charmer', null, null, null] });
  s.players[0].favours = ['gossip'];
  give(s, 0, 'watermelon', { 3: 3 });
  s.forecast = cust('Zul', [['watermelon', 1, 7]]);
  s.queue = [cust('Aisyah', [['watermelon', 1, 7]], { walkIn: true }), cust('Nurul', [['watermelon', 1, 7]], { walkIn: true })];
  const r = bell(s, [{ watermelon: 7 }, {}, {}, {}]);
  say(`  Charmer serves 3 customers alone, hand was 1: drew ${r.results!.favours.length} (${r.results!.favours.map((f) => f.favour).join(', ')}); hand now ${r.players[0].favours.length}`);
  // hand full
  const f = mk({ n: 4, traits: ['charmer', null, null, null] });
  f.players[0].favours = ['gossip', 'gossip', 'scout', 'scout'];
  give(f, 0, 'watermelon', { 3: 1 }); f.forecast = cust('Zul', [['watermelon', 1, 7]]);
  say(`  hand already 4: drew ${bell(f, [{ watermelon: 7 }, {}, {}, {}]).results!.favours.length}`);
  // deck empty and every card in a hand: 12 cards = 4 + 3 + 3 + 2
  const d = mk({ n: 4, traits: ['charmer', null, null, null] });
  d.players[0].favours = ['gossip', 'gossip', 'scout'];
  d.players[1].favours = ['scout', 'freeFruit', 'freeFruit'];
  d.players[2].favours = ['priority', 'priority', 'fridge'];
  d.players[3].favours = ['fridge', 'favouredTrade', 'favouredTrade'];
  d.favourDeck = [];
  give(d, 0, 'watermelon', { 3: 1 }); d.forecast = cust('Zul', [['watermelon', 1, 7]]);
  const dr = bell(d, [{ watermelon: 7 }, {}, {}, {}]);
  say(`  deck empty and all 12 cards in hands: drew ${dr.results!.favours.length}; hand ${dr.players[0].favours.length}`);
  // deck empty, one card was played earlier (not in any hand): it comes back
  const d2 = structuredClone(d); d2.players[3].favours = ['fridge', 'favouredTrade'];
  const dr2 = bell(d2, [{ watermelon: 7 }, {}, {}, {}]);
  say(`  deck empty, one Favoured Trade in the discard: drew ${dr2.results!.favours.map((x) => x.favour).join(',')}`);
}
H('H9 Tip Jar (Kiki): guests, two customers in a day, a customer partly served by a rival, a customer left short');
{
  const s = mk({ n: 3, traits: ['favourite', null, null], cash: [0, 0, 0] });
  s.event = ev('superfood');
  give(s, 0, 'blueberry', { 2: 6 });
  give(s, 1, 'blueberry', { 2: 1 });
  s.forecast = cust('Hadi'); // 3 blueberry @5 (+1 Superfood)
  s.queue = [cust('Sarah', [['blueberry', 1, 5], ['mango', 2, 11]], { walkIn: true })]; // mango cannot be served
  const r = bell(s, [{ blueberry: 6 }, { blueberry: 5 }, {}]);
  sales(r).forEach((l) => say(l));
  say('  => Hadi was served by P1 (1) and Kiki (2): no tip. Sarah got her blueberry from Kiki alone but no mango: no tip. Gym Club served by Kiki alone: tip 2 + favour.');
  const t = mk({ n: 3, traits: ['favourite', null, null], cash: [0, 0, 0] });
  give(t, 0, 'blueberry', { 2: 6 });
  t.forecast = cust('Hadi'); t.queue = [cust('Hafiz', null, { walkIn: true })];
  const r2 = bell(t, [{ blueberry: 3 }, {}, {}]);
  say(`  two customers served alone on one day: income ${r2.results!.income[0]} = 6 x 3 + 2 tips of 2; favours drawn ${r2.results!.favours.length}`);
}
H('H10 Sharp Ears (Farah): what she peeks at and when; tips per day; partly served; guests and the regular; 6 stalls');
{
  // real flow: day 1 of a new 3-stall game
  let g = newGame({ players: [{ name: 'Farah', kind: 'human', avatar: '🦜' }, { name: 'B', kind: 'human', avatar: '🦊' }, { name: 'C', kind: 'human', avatar: '🐷' }], days: 10, unripe: true, upgrades: true, events: false, seed: 5 });
  g = beginBuying(g);
  say(`  day 1 while buying: today's walk-ins seen by Farah: ${JSON.stringify(g.queue.map((c) => c.seenBy))}; tomorrow's (nextQueue): ${JSON.stringify(g.nextQueue.map((c) => c.seenBy))}`);
  g = arrive(g);
  say(`  after buying ends (crowd arrives): today's row seen ${JSON.stringify(servingCustomers(g).map((c) => (c.walkIn ? c.seenBy : 'regular')))}; tomorrow's walk-ins seen ${JSON.stringify(g.queue.map((c) => c.seenBy))}`);
  // two peeked walk-ins in one day (one by Sharp Ears, one by Gossip/Scout)
  const s = mk({ n: 3, traits: ['earful', null, null], cash: [0, 0, 0] });
  give(s, 0, 'watermelon', { 3: 4 }); give(s, 1, 'watermelon', { 3: 2 });
  s.forecast = cust('Zul', [['watermelon', 1, 7]]);
  s.queue = [cust('Aisyah', [['watermelon', 3, 7]], { walkIn: true, seenBy: [0] }), cust('Nurul', [['watermelon', 1, 7]], { walkIn: true, seenBy: [0] }), cust('Ben', [['watermelon', 1, 7]], { walkIn: true, seenBy: [] })];
  const r = bell(s, [{ watermelon: 7 }, { watermelon: 6 }, {}]);
  sales(r).forEach((l) => say(l));
  const six = mk({ n: 6, traits: ['earful', null, null, null, null, null], cash: [0, 0, 0, 0, 0, 0] });
  give(six, 0, 'watermelon', { 3: 1 });
  six.queue = [cust('Nurul', [['watermelon', 1, 7]], { walkIn: true, seenBy: [0] })];
  say(`  6 stalls: tip ${bell(six, [{ watermelon: 7 }, {}, {}, {}, {}, {}]).results!.earful?.[0].tip}`);
}
H('H11 walk-in events against cards already peeked (rules 16). 3 stalls; Farah (seat 0) has peeked the first of tomorrow\'s walk-ins, seat 1 played Gossip on both');
for (const e of ['monsoon', 'touristBus', 'hotel'] as const) {
  const s = mk({ n: 3, day: 3, traits: ['earful', null, null], events: true });
  s.config.marketDays = false;
  s.eventDeck = [evIdx(e)];
  s.forecast = cust('Zul');
  s.queue = [cust('Aisyah', null, { walkIn: true, seenBy: [0, 1] }), cust('Nurul', null, { walkIn: true, seenBy: [1] })];
  s.phase = 'evening'; s.turn = 0;
  const m = toNextMorning(s);
  const a = arrive(beginBuying(m));
  say(`  ${e}: morning walk-ins ${m.queue.map((c) => `${c.name}${JSON.stringify(c.seenBy)}`).join(', ')}; row at the bell: ${servingCustomers(a).map((c) => c.name).join(', ')}`);
}
{
  const s = mk({ n: 2, day: 3, traits: ['earful', null], events: true });
  s.config.marketDays = false;
  s.eventDeck = [evIdx('monsoon')];
  s.forecast = cust('Zul');
  s.queue = [cust('Aisyah', null, { walkIn: true, seenBy: [0] })];
  s.phase = 'evening'; s.turn = 0;
  const m = toNextMorning(s);
  say(`  2 stalls, Monsoon: Farah's only peeked walk-in: morning walk-ins [${m.queue.map((c) => c.name).join(', ')}] (her peek is gone; she does not peek again until buying ends)`);
}
H('H12 Scout on the walk-in a guest will push out. 5 stalls, Hotel Order: 4 walk-ins while buying; seat 0 scouts the last one');
{
  const s = mk({ n: 5 });
  s.event = ev('hotel');
  s.forecast = cust('Zul');
  s.queue = ['Aisyah', 'Nurul', 'Ben', 'Hadi'].map((n) => cust(n, null, { walkIn: true }));
  s.players[0].favours = ['scout'];
  const g = playFavour(s, 0, 0, { customer: s.queue[3].id });
  say(`  scouted ${g.queue[3].name}, seenBy ${JSON.stringify(g.queue[3].seenBy)}; hand ${JSON.stringify(g.players[0].favours)}`);
  const a = arrive(g);
  say(`  row at the bell: ${servingCustomers(a).map((c) => c.name).join(', ')} (the scouted walk-in left; the card is spent)`);
  const t = mk({ n: 5 }); t.players[0].favours = ['scout']; t.nextQueue = [cust('Ben', null, { walkIn: true })];
  say(`  Scout with no walk-in today but tomorrow's strip dealt: ${canPlayFavour(t, 0, 0) ?? 'playable'}; play -> `, (() => { try { playFavour(t, 0, 0, { customer: t.nextQueue[0].id }); return 'ok'; } catch (e) { return (e as Error).message; } })());
}
H('H13 the 6-stall "+1": a real 6-stall game, day 1 row and a guest');
{
  let g = newGame({ players: Array.from({ length: 6 }, (_, i) => ({ name: `P${i}`, kind: 'human' as const, avatar: '' })), days: 10, unripe: true, upgrades: true, events: false, seed: 9 });
  g = structuredClone(beginBuying(g));
  g.event = ev('hotel');
  g.standing = standing(g, 'Beach Resort', 0, 8, 1);
  const a = arrive(g);
  for (const c of servingCustomers(a)) say(`  ${c.name}${c.walkIn ? ' (walk-in)' : ''}${c.order ? ' (standing order)' : ''}: ${c.wants.map((w) => `${w.qty} ${w.fruit} @${w.max}`).join(', ')}`);
}
H('H14 Pasar Malam: empty crate; fruit kept on the shelf; Closing Day; two pieces of one fruit; a green mango');
{
  const s = mk({ n: 3, days: 10, day: 10, cash: [0, 0, 0] });
  s.event = ev('pasarMalam');
  give(s, 0, 'blueberry', { 0: 2 }); give(s, 0, 'apple', { 5: 1, 0: 1 }); give(s, 0, 'mango', { 4: 1 });
  give(s, 1, 'blueberry', { 0: 2 });
  const r = bell(s, [{ blueberry: 30, apple: 30 }, {}, {}], { crates: ['all', 'none', 'none'] });
  sales(r).forEach((l) => say(l));
  say(`  P0 shelf after ${shelf(r, 0)}; P1 (kept everything on the shelf) ${shelf(r, 1)}`);
}
H('H15 Closing Day +1 with a guest (Gym Club fixed 8) and Okay fruit; Bakery on a Bake-Off (apple +1 does not apply to the guest)');
{
  const s = mk({ n: 3, days: 10, day: 10, cash: [0, 0, 0] });
  s.event = ev('superfood');
  give(s, 0, 'blueberry', { 2: 1, 1: 1 });
  attempt('post 10', () => sales(bell(s, [{ blueberry: 10 }, {}, {}])).forEach((l) => say(l)));
  sales(bell(s, [{ blueberry: 8 }, {}, {}])).forEach((l) => say(l));
  const b = mk({ n: 3, cash: [0, 0, 0] });
  b.event = ev('bakeOff');
  give(b, 0, 'apple', { 5: 3 });
  b.forecast = cust('Marcus', [['apple', 1, 6]]);
  sales(bell(b, [{ apple: 7 }, {}, {}])).forEach((l) => say(l));
}
H('H16 a stall with 0 cash and no fruit; and exactly 1 cash');
{
  const s = mk({ n: 3, cash: [0, 10, 10] });
  s.market.blueberry = track('blueberry', { 0: 2, 2: 2 });
  say(`  0 cash: buy Soft blueberry (1): "${canBuy(s, 0, 'blueberry', 0)}"`);
  const d = structuredClone(s); d.event = ev('durian');
  say(`  0 cash on a Durian Season day (costs 1 less, minimum 1): "${canBuy(d, 0, 'blueberry', 0)}"`);
  const one = structuredClone(s); one.players[0].cash = 1;
  say(`  1 cash: buy Soft blueberry: ${canBuy(one, 0, 'blueberry', 0) ?? 'allowed'}`);
  const ev3 = mk({ n: 3, day: 3, cash: [0, 10, 10] });
  const r = applyAction(bell(ev3, [{}, {}, {}], { crates: ['none', 'none', 'none'] }), 0, { kind: 'finish' });
  say(`  draft evening at 0 cash: Juice Bar "${canUpgrade(r, 0, 'juicebar')}"`);
}
H('H17 Favoured Trade: must it be declared before prices are seen? (engine: it is part of submitting prices)');
{
  const s = mk({ n: 3 });
  give(s, 0, 'watermelon', { 3: 1 }); give(s, 1, 'watermelon', { 3: 1 });
  s.forecast = cust('Zul', [['watermelon', 1, 7]]);
  s.players[0].favours = ['favouredTrade'];
  const r = bell(s, [{ watermelon: 7 }, { watermelon: 6 }, {}], { favoured: [true, false, false] });
  say(`  P0 played it and there was no tie (P1 was cheaper): card spent, hand ${JSON.stringify(r.players[0].favours)}; ${r.results!.lines[0].offers.map((o) => `P${o.player} sold ${o.sold}`).join(', ')}`);
  say(`  at the reveal, can P1 still play one? ${(() => { const t = structuredClone(r); t.players[1].favours = ['favouredTrade']; return canPlayFavour(t, 1, 0); })()}`);
}
H('H18 customer deck: where does a pushed-out walk-in go, and can the same customer come twice in a row?');
{
  const s = mk({ n: 5 });
  s.event = ev('hotel');
  s.forecast = cust('Zul');
  s.queue = ['Aisyah', 'Nurul', 'Ben', 'Hadi'].map((n) => cust(n, null, { walkIn: true }));
  s.customerDeck = [custIdx('John')];
  const a = arrive(s);
  say(`  deck after the crowd arrives: [${a.customerDeck.map((i) => i + 1).join(', ')}] (card numbers; ${custIdx('Hadi') + 1} is Hadi Hammer, back at the bottom)`);
}
void FRUIT;
