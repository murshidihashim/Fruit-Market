// Part 2 F: Premium Display against Price Controls and other price limits.
import { bestCap, capFor, effectiveMax, maxPrice, validatePrices, type GameState } from '/home/user/Fruit-Market/src/engine/game';
import { H, arrive, attempt, bell, cust, ev, give, mk, sales, say, track } from './lib';

const PD = [['premium' as const], [], []];

H('F1 Price Controls (blueberry 5, watermelon 7, apple 6, mango 10). P0 has Premium Display, P1 has not. Apple customers with top 5 (below), 6 (at), 8 (above the limit)');
{
  const base = () => {
    const s = mk({ n: 3, cash: [0, 0, 0], upgrades: PD });
    s.event = ev('priceControls');
    give(s, 0, 'apple', { 5: 3 });
    give(s, 1, 'apple', { 5: 3 });
    s.forecast = cust('Farid', [['apple', 1, 5]], { pref: 'everyday' });
    s.queue = [cust('Marcus', [['apple', 1, 6]], { walkIn: true }), cust('Ravi', [['apple', 1, 8]], { walkIn: true })];
    return s;
  };
  say('  limit for apple today:', maxPrice(base(), 'apple'));
  attempt('P0 (Premium Display) posts apple 7', () => bell(base(), [{ apple: 7 }, { apple: 6 }, {}]));
  say(' both post 6 (the limit):');
  sales(bell(base(), [{ apple: 6 }, { apple: 6 }, {}])).forEach((l) => say(l));
  say(' P0 posts 6, P1 posts 5:');
  sales(bell(base(), [{ apple: 6 }, { apple: 5 }, {}])).forEach((l) => say(l));
}
H('F1b same day, mango (limit 10; every mango card pays 10 to 13): does Premium Display do anything?');
{
  const s = mk({ n: 3, cash: [0, 0, 0], upgrades: PD });
  s.event = ev('priceControls');
  give(s, 0, 'mango', { 2: 2 });
  s.forecast = cust('Siti', [['mango', 1, 10]]);
  s.queue = [cust('Devi', [['mango', 1, 13]], { walkIn: true })];
  attempt('P0 posts mango 11', () => bell(s, [{ mango: 11 }, {}, {}]));
  sales(bell(s, [{ mango: 10 }, {}, {}])).forEach((l) => say(l));
}
H('F1c same day, blueberry (limit 5): customers at 3 (Bargain) and 4; Premium Display stall posts 4 and 5');
for (const price of [4, 5]) {
  const s = mk({ n: 3, cash: [0, 0, 0], upgrades: PD });
  s.event = ev('priceControls');
  give(s, 0, 'blueberry', { 2: 4 });
  s.forecast = cust('Hafiz', [['blueberry', 1, 3]]);
  s.queue = [cust('Fatimah', [['blueberry', 1, 4]], { walkIn: true }), cust('Hadi', [['blueberry', 1, 5]], { walkIn: true })];
  say(` posts ${price}:`); sales(bell(s, [{ blueberry: price }, {}, {}])).forEach((l) => say(l));
}
H('F2 Premium Display, no event: 1 Fresh + 1 Okay watermelon, Everyday customer top 7 wants 2. Prices 8, 7, 6');
for (const price of [8, 7, 6]) {
  const s = mk({ n: 3, cash: [0, 0, 0], upgrades: PD });
  give(s, 0, 'watermelon', { 3: 1, 1: 1 });
  s.forecast = cust('Zul', [['watermelon', 2, 7]]);
  say(` posts ${price}:`); sales(bell(s, [{ watermelon: price }, {}, {}])).forEach((l) => say(l));
}
H('F3 a guest with a fixed price: Gym Club pays 8. Premium Display stall posts 9 for Fresh blueberries; and the Influencer (15) at 16');
{
  const s = mk({ n: 3, cash: [0, 0, 0], upgrades: PD });
  s.event = ev('superfood');
  give(s, 0, 'blueberry', { 2: 2 });
  sales(bell(s, [{ blueberry: 9 }, {}, {}])).forEach((l) => say(l));
  const m = mk({ n: 3, cash: [0, 0, 0], upgrades: PD });
  m.event = ev('mangoCraze');
  give(m, 0, 'mango', { 2: 1 });
  sales(bell(m, [{ mango: 16 }, {}, {}])).forEach((l) => say(l));
}
H('F4 stacking: watermelon card top 7 with Premium Display on Closing Day; Festival; Heatwave; Good Harvest; Closing Day + Festival; mango 13 on a Mango Craze');
{
  const cases: [string, (s: GameState) => void, 'watermelon' | 'mango', number][] = [
    ['plain day', () => {}, 'watermelon', 7],
    ['Closing Day', (s) => { s.day = s.config.days; }, 'watermelon', 7],
    ['Festival', (s) => { s.event = ev('festival'); }, 'watermelon', 7],
    ['Heatwave', (s) => { s.event = ev('heatwave'); }, 'watermelon', 7],
    ['Good Harvest', (s) => { s.event = ev('goodHarvest'); }, 'watermelon', 7],
    ['Durian Season', (s) => { s.event = ev('durian'); }, 'watermelon', 7],
    ['Closing Day + Festival', (s) => { s.day = s.config.days; s.event = ev('festival'); }, 'watermelon', 7],
    ['Mango Craze, mango card 13', (s) => { s.event = ev('mangoCraze'); }, 'mango', 13],
    ['Mango Windfall, mango card 10', (s) => { s.event = ev('mangoWindfall'); }, 'mango', 10],
  ];
  for (const [label, set, f, top] of cases) {
    const s = mk({ n: 3, cash: [0, 0, 0], upgrades: PD });
    set(s);
    const pos = f === 'watermelon' ? 3 : 2;
    give(s, 0, f, { [pos]: 1 });
    const c = cust('Zul', [[f, 1, top]]);
    s.forecast = c;
    const max = effectiveMax(s, c.wants[0]);
    const cap = capFor(s.players[0], f, pos, max);
    const over = attempt(`${label}: post ${cap + 1}`, () => bell(s, [{ [f]: cap + 1 }, {}, {}]));
    const r = bell(s, [{ [f]: cap }, {}, {}]);
    say(`  ${label}: customer top today ${max}; Premium Display Fresh cap ${cap}; sold at ${cap}: ${r.results!.lines[0].offers[0]?.sold}; at ${cap + 1}: ${over ? over.results!.lines[0].offers[0]?.sold : 'refused'}`);
  }
}
H('F5 Fixed prices option (street): everyday customer and a generous one (Ravi Rocket), apple. Premium Display');
{
  const s = mk({ n: 3, cash: [0, 0, 0], upgrades: PD, extra: { street: true } });
  give(s, 0, 'apple', { 5: 2 });
  s.forecast = cust('Farid', [['apple', 1, 5]]);
  const g = cust('Ravi', [['apple', 1, 8]], { walkIn: true }); g.generous = true;
  s.queue = [g];
  for (const price of [7, 9]) { say(` posts ${price}:`); sales(bell(s, [{ apple: price }, {}, {}])).forEach((l) => say(l)); }
}
H('F6 Bargain customer (Postman Pip: apple top 5): Premium Display stall with 1 Fresh + 1 Soft apple, posts 6, then 3');
for (const price of [6, 3]) {
  const s = mk({ n: 3, cash: [0, 0, 0], upgrades: PD });
  give(s, 0, 'apple', { 5: 1, 0: 1 });
  s.forecast = cust('Farid', [['apple', 2, 5]]);
  say(` posts ${price}:`); sales(bell(s, [{ apple: price }, {}, {}])).forEach((l) => say(l));
}
H('F7 Premium Display stall at top+1 against a rival at top, and both at top (plain tie). Watermelon top 7, wants 2, each stall has 2 Fresh');
for (const prices of [[8, 7], [7, 7], [8, 8]]) {
  const s = mk({ n: 3, cash: [0, 0, 0], upgrades: PD });
  s.order = [1, 0, 2];
  give(s, 0, 'watermelon', { 3: 2 });
  give(s, 1, 'watermelon', { 3: 2 });
  s.forecast = cust('Zul', [['watermelon', 2, 7]]);
  say(` P0 (display) ${prices[0]}, P1 ${prices[1]}, buying order P1 first:`); sales(bell(s, [{ watermelon: prices[0] }, { watermelon: prices[1] }, {}])).forEach((l) => say(l));
}
H('F8 what the pricing validation accepts with Premium Display on an ordinary day: any price up to 30');
{
  const s = mk({ n: 3, cash: [0, 0, 0], upgrades: PD });
  give(s, 0, 'apple', { 5: 1 });
  s.forecast = cust('Farid', [['apple', 1, 5]]);
  const a = arrive(s);
  let g = a;
  for (let p = 0; p < 3; p++) g = (await import('/home/user/Fruit-Market/src/engine/game')).openStall(g, p, {}, p === 0 ? { apple: track('apple', { 5: 1 }) } : {});
  say('  validatePrices 30:', validatePrices(g, 0, [{ fruit: 'apple', price: 30 }]), '| 31:', validatePrices(g, 0, [{ fruit: 'apple', price: 31 }]), '| bestCap with display:', bestCap(g.players[0].stock, 'apple', 5, g.players[0], 'bargain'));
}
