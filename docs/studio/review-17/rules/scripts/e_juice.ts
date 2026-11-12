// Part 2 E: Juice Bar. Card: "+$1 for each okay or soft fruit you sell. Each night up to 2 pieces that would spoil become juice: $2 each."
import { applyAction, buyUpgrade, canUpgrade, nightOutlook, shadePick, setShade, type GameState } from '/home/user/Fruit-Market/src/engine/game';
import { H, bell, cust, ev, give, mk, sales, say, shelf, standing, toNextMorning, track } from './lib';

const JB = [['juicebar' as const], [], []];

H('E1 baseline: Juice Bar stall sells 1 Fresh, 1 Okay, 1 Soft blueberry to a Bargain customer (Professor Pebble: 3 blueberry, top 3) at price 1');
{
  const s = mk({ n: 3, cash: [0, 0, 0], upgrades: JB });
  give(s, 0, 'blueberry', { 0: 1, 1: 1, 2: 1 });
  s.forecast = cust('Hafiz');
  sales(bell(s, [{ blueberry: 1 }, {}, {}])).forEach((l) => say(l));
}
H('E2 guest: 2 Okay blueberries to the Gym Club (fixed 8, so Okay at 7)');
{
  const s = mk({ n: 3, cash: [0, 0, 0], upgrades: JB });
  s.event = ev('superfood');
  give(s, 0, 'blueberry', { 1: 2 });
  sales(bell(s, [{ blueberry: 7 }, {}, {}])).forEach((l) => say(l));
}
H('E3 with Premium Display too: 1 Fresh + 1 Okay watermelon, customer top 7 wants 2. Posted 8, then 6');
for (const price of [8, 6]) {
  const s = mk({ n: 3, cash: [0, 0, 0], upgrades: [['juicebar', 'premium'], [], []] });
  give(s, 0, 'watermelon', { 3: 1, 1: 1 });
  s.forecast = cust('Zul', [['watermelon', 2, 7]]);
  say(` posted ${price}:`); sales(bell(s, [{ watermelon: price }, {}, {}])).forEach((l) => say(l));
}
H('E4 Pasar Malam hawker: Juice Bar stall leaves 1 Soft blueberry and 1 Okay apple in its crate, priced out of reach (30)');
{
  const s = mk({ n: 3, cash: [0, 0, 0], upgrades: JB });
  s.event = ev('pasarMalam');
  give(s, 0, 'blueberry', { 0: 1 });
  give(s, 0, 'apple', { 1: 1 });
  const r = bell(s, [{ blueberry: 30, apple: 30 }, {}, {}]);
  sales(r).forEach((l) => say(l));
  say('  stats.sold', r.players[0].stats.sold);
}
H('E5 jam maker on Closing Day: Juice Bar stall ends with 2 Soft blueberries, 1 Okay apple, 1 Fresh watermelon, 1 green mango, nothing sold');
{
  const s = mk({ n: 3, days: 10, day: 10, cash: [0, 0, 0], upgrades: JB });
  give(s, 0, 'blueberry', { 0: 2 });
  give(s, 0, 'apple', { 1: 1 });
  give(s, 0, 'watermelon', { 3: 1 });
  give(s, 0, 'mango', { 4: 1 });
  const r = bell(s, [{}, {}, {}], { crates: ['none', 'none', 'none'] });
  say('  night outlook on the last day:', JSON.stringify(nightOutlook(r, 0)));
  const end = applyAction(r, 0, { kind: 'finish' });
  say(`  phase ${end.phase}; jam ${JSON.stringify(end.jam)}; cash ${end.players[0].cash}; juiced ${end.players[0].stats.juiced ?? 0}; shelf ${shelf(end, 0)}`);
}
H('E6 final day that is also Pasar Malam, Juice Bar stall: crate holds 1 Okay watermelon (sold to the row at top+1-1), 1 Soft blueberry and 1 Soft apple (unsold); shelf keeps 1 Soft blueberry');
{
  const s = mk({ n: 3, days: 10, day: 10, cash: [0, 0, 0], upgrades: JB });
  s.event = ev('pasarMalam');
  give(s, 0, 'blueberry', { 0: 2 });
  give(s, 0, 'apple', { 0: 1 });
  give(s, 0, 'watermelon', { 1: 1 });
  s.forecast = cust('Aisyah', [['watermelon', 1, 7]]);
  const r = bell(s, [{ blueberry: 30, apple: 30, watermelon: 7 }, {}, {}], { crates: [{ blueberry: track('blueberry', { 0: 1 }), apple: track('apple', { 0: 1 }), watermelon: track('watermelon', { 1: 1 }) }, 'none', 'none'] });
  sales(r).forEach((l) => say(l));
  const end = applyAction(r, 0, { kind: 'finish' });
  say(`  after the jam maker: cash ${end.players[0].cash}; jam ${JSON.stringify(end.jam)}; shelf ${shelf(end, 0)}`);
  say('  arithmetic: row 7 (Okay at top 7+1-1) +1 juice = 8; hawker 3 + 3 = 6 (no juice tip, no Closing Day +1); jam 1 x 1 = 1; total 15');
}
H('E7 nights. Shelf: 3 Soft blueberries, 2 Okay blueberries, 1 Soft apple. (a) ordinary night (b) Heatwave (c) Monsoon');
for (const e of [null, 'heatwave', 'monsoon'] as const) {
  const s = mk({ n: 3, cash: [0, 0, 0], upgrades: JB });
  if (e) s.event = ev(e);
  give(s, 0, 'blueberry', { 0: 3, 1: 2 });
  give(s, 0, 'apple', { 0: 1 });
  const r = bell(s, [{}, {}, {}], { crates: ['none', 'none', 'none'] });
  const out = nightOutlook(r, 0);
  const m = toNextMorning(r);
  say(`  ${e ?? 'ordinary'}: forecast ${JSON.stringify(out)}; next morning cash ${m.players[0].cash}; juiced ${m.players[0].stats.juiced ?? 0}; spoiled ${m.players[0].stats.spoiled}; shelf ${shelf(m, 0)}`);
}
H('E8 Shade Cloth (Pak Din) with a Juice Bar: 2 Soft blueberries. Shade blueberry, shade nothing, and what a computer Pak Din picks');
for (const shade of ['blueberry', null] as const) {
  const s = mk({ n: 3, cash: [0, 0, 0], upgrades: JB, traits: ['keeper', null, null] });
  give(s, 0, 'blueberry', { 0: 2 });
  let r: GameState = bell(s, [{}, {}, {}], { crates: ['none', 'none', 'none'] });
  r = applyAction(r, 0, { kind: 'finish' });
  say(`  phase ${r.phase}; shadePick (computer choice) = ${shadePick(r, 0)}`);
  r = setShade(r, 0, shade);
  const m = toNextMorning(r);
  say(`  shade ${shade}: next morning cash ${m.players[0].cash}; shelf ${shelf(m, 0)}`);
}
H('E9 Heatwave + Shade Cloth + Juice Bar: 2 Soft + 2 Okay blueberries, 2 Okay apples; shade blueberry');
{
  const s = mk({ n: 3, cash: [0, 0, 0], upgrades: JB, traits: ['keeper', null, null] });
  s.event = ev('heatwave');
  give(s, 0, 'blueberry', { 0: 2, 1: 2 });
  give(s, 0, 'apple', { 1: 2, 2: 1 });
  let r: GameState = bell(s, [{}, {}, {}], { crates: ['none', 'none', 'none'] });
  r = applyAction(r, 0, { kind: 'finish' });
  r = setShade(r, 0, 'blueberry');
  const m = toNextMorning(r);
  say(`  next morning cash ${m.players[0].cash}; shelf ${shelf(m, 0)}; juiced ${m.players[0].stats.juiced ?? 0}; spoiled ${m.players[0].stats.spoiled}`);
}
H('E10 Juice Bar built on the last draft evening (day 9 of 10) with 2 Soft pieces on the shelf and exactly 4 cash');
{
  const s = mk({ n: 3, days: 10, day: 9, cash: [4, 0, 0] });
  give(s, 0, 'blueberry', { 0: 2 });
  let r: GameState = bell(s, [{}, {}, {}], { crates: ['none', 'none', 'none'] });
  r = applyAction(r, 0, { kind: 'finish' });
  say(`  phase ${r.phase}; offer ${JSON.stringify(r.players[0].upgradeOffer)}; can build Juice Bar: ${canUpgrade(r, 0, 'juicebar') ?? 'yes'}; Handcart (6): ${canUpgrade(r, 0, 'barrow')}`);
  r = buyUpgrade(r, 0, 'juicebar');
  say(`  cash after building ${r.players[0].cash}; second upgrade same evening: ${canUpgrade(r, 0, 'orderbook')}`);
  const m = toNextMorning(r);
  say(`  day ${m.day} morning cash ${m.players[0].cash} (2 pieces juiced the same night: the Juice Bar paid for itself)`);
}
H('E11 Juice Bar + standing order (holder and rival): see D5a / D5b. Juice Bar + Health Inspector: Soft piece fined 2 at dawn, juiced for 2 at night');
{
  const s = mk({ n: 3, day: 4, cash: [5, 0, 0], upgrades: JB, events: true });
  give(s, 0, 'blueberry', { 1: 1 });
  s.eventDeck = [10 /* placeholder replaced below */];
  const { evIdx } = await import('./lib');
  s.eventDeck = [evIdx('inspector')];
  s.phase = 'evening'; s.turn = 0;
  const m = toNextMorning(s);
  say(`  day ${m.day} event ${m.event?.id}: fines ${JSON.stringify(m.dayFines)}, cash ${m.players[0].cash}, shelf ${shelf(m, 0)}`);
}
void standing;
