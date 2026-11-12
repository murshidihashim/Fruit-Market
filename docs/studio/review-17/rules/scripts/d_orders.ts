// Part 2 D: standing orders (contracts). Every scenario runs through the real engine.
import { autoplay } from '/home/user/Fruit-Market/src/engine/ai';
import { applyAction, beginBuying, bidOrder, buy, canBidOrder, endBuyTurn, newGame, rowStock, servingCustomers, type GameConfig, type GameState } from '/home/user/Fruit-Market/src/engine/game';
import { H, arrive, attempt, bell, cust, ev, evIdx, give, mk, sales, say, shelf, standing, toNextMorning, track } from './lib';

// ---------- D1: shortage and rival allocation ----------
H('D1a holder supplies 1 of 3; rival P1 has Fresh(new)+Okay, rival P2 has 2 Fresh(older). Bid 8 (watermelon, fine 8)');
{
  const s = mk({ n: 3, day: 5 });
  s.standing = standing(s, 'Beach Resort', 0, 8, 5);
  give(s, 0, 'watermelon', { 3: 1 });
  give(s, 1, 'watermelon', { 3: 1, 1: 1 });
  give(s, 2, 'watermelon', { 2: 2 });
  s.forecast = cust('Aisyah'); // 3 watermelon @7, Everyday
  const r = bell(s, [{ watermelon: 7 }, { watermelon: 30 }, { watermelon: 7 }]);
  sales(r).forEach((l) => say(l));
  say('  shelves after:', [0, 1, 2].map((p) => `P${p} ${shelf(r, p)}`).join(' ; '));
}
H('D1b two rivals tie on their freshest piece (both hold a new Fresh): buying order 0,1,2 then 0,2,1. Holder supplies none. Bid 8');
for (const order of [[0, 1, 2], [0, 2, 1]]) {
  const s = mk({ n: 3, day: 5 });
  s.order = order;
  s.standing = standing(s, 'Beach Resort', 0, 8, 5);
  give(s, 1, 'watermelon', { 3: 1, 2: 1 });
  give(s, 2, 'watermelon', { 3: 2 });
  const r = bell(s, [{}, { watermelon: 7 }, { watermelon: 7 }]);
  say(` buying order ${order.join(',')}:`);
  sales(r).forEach((l) => say(l));
}
H('D1c the only rival pieces are Soft; D1d nobody has any. Holder cash 30, bid 8, fine 8 x 3');
{
  const s = mk({ n: 3, day: 5, cash: [30, 10, 10] });
  s.standing = standing(s, 'Beach Resort', 0, 8, 5);
  give(s, 1, 'watermelon', { 0: 3 });
  const r = bell(s, [{}, { watermelon: 3 }, {}]);
  sales(r).forEach((l) => say(l));
  const s2 = mk({ n: 3, day: 5, cash: [30, 10, 10] });
  s2.standing = standing(s2, 'Beach Resort', 0, 8, 5);
  const r2 = bell(s2, [{}, {}, {}]);
  sales(r2).forEach((l) => say(l));
}
H('D1e holder has 5 pieces out (2 new Fresh, 1 older Fresh, 1 Okay, 1 Soft): which 3 does the order take, and what is left for the row?');
{
  const s = mk({ n: 3, day: 5 });
  s.standing = standing(s, 'Beach Resort', 0, 8, 5);
  give(s, 0, 'watermelon', { 3: 2, 2: 1, 1: 1, 0: 1 });
  s.forecast = cust('Kumar', [['watermelon', 2, 5]]); // Bargain, takes Soft at 3
  const a = arrive(s);
  const r = bell(a, [{ watermelon: 3 }, {}, {}]);
  say('  rowStock(holder) before the bell (what the row will find):', JSON.stringify(rowStock(bell0(a), 0).watermelon));
  sales(r).forEach((l) => say(l));
  say('  holder shelf after:', shelf(r, 0));
}
function bell0(a: GameState): GameState { // every stall opened with its whole ripe shelf, no prices yet
  let s = a;
  for (let p = 0; p < s.players.length; p++) {
    const crate: Record<string, number[]> = {};
    for (const f of ['blueberry', 'watermelon', 'apple', 'mango'] as const) { const t = s.players[p].stock[f].map((c, i) => (i < (f === 'mango' ? 3 : s.players[p].stock[f].length) ? c : 0)); if (t.some((c) => c > 0)) crate[f] = t; }
    s = applyAction(s, p, { kind: 'stall', stall: {}, crate });
  }
  return s;
}
H('D1f holder has 3 on the shelf but puts only 1 in the crate: is the shelf counted?');
{
  const s = mk({ n: 3, day: 5, cash: [30, 10, 10] });
  s.standing = standing(s, 'Beach Resort', 0, 8, 5);
  give(s, 0, 'watermelon', { 3: 3 });
  const r = bell(s, [{ watermelon: 7 }, {}, {}], { crates: [{ watermelon: track('watermelon', { 3: 1 }) }, 'none', 'none'] });
  sales(r).forEach((l) => say(l));
}
H('D1g rival pay at low bids: bid 2 -> rival paid 1; bid 1 -> rival paid 1 (same as the holder)');
for (const bid of [2, 1]) {
  const s = mk({ n: 3, day: 5, cash: [0, 10, 10] });
  s.standing = standing(s, 'School Canteen', 0, bid, 5);
  give(s, 1, 'blueberry', { 2: 3 });
  const r = bell(s, [{}, { blueberry: 5 }, {}]);
  say(` bid ${bid}:`); sales(r).forEach((l) => say(l));
}

// ---------- D2: reserved pieces and the row; can a rival protect its fruit? ----------
H('D2a rival P1 keeps its watermelons on the shelf (not in the crate): the order cannot take them; P2 is taken instead');
{
  const s = mk({ n: 3, day: 5, cash: [30, 10, 10] });
  s.standing = standing(s, 'Beach Resort', 0, 8, 5);
  give(s, 1, 'watermelon', { 3: 3 });
  give(s, 2, 'watermelon', { 2: 2 });
  s.forecast = cust('Aisyah');
  const r = bell(s, [{}, {}, { watermelon: 7 }], { crates: ['none', 'none', 'all'] });
  sales(r).forEach((l) => say(l));
}
H('D2b rival puts out 5 watermelons (3 new Fresh, 2 Okay); the order needs 3: it takes the 3 freshest and leaves the Okay ones for the row');
{
  const s = mk({ n: 3, day: 5, cash: [30, 10, 10] });
  s.standing = standing(s, 'Beach Resort', 0, 8, 5);
  give(s, 1, 'watermelon', { 3: 3, 1: 2 });
  s.forecast = cust('Aisyah');
  const r = bell(s, [{}, { watermelon: 7 }, {}]);
  sales(r).forEach((l) => say(l));
  say('  note: P1 posted 7 hoping to sell Fresh to Zara Zapp (top 7); its Fresh went to the order at 7 = bid-1, the Okay pieces do not qualify at 7');
}

// ---------- D3: fines ----------
H('D3a THE BROKE HOLDER: holder bid 1, has cash 12 at dawn, spends all 12 on 4 Fresh watermelons, delivers nothing to a blueberry order; rival P1 has 3 Fresh blueberries out');
{
  const s = mk({ n: 3, day: 5, cash: [12, 10, 10] });
  s.standing = standing(s, 'School Canteen', 0, 1, 5);
  s.market.watermelon = track('watermelon', { 3: 6 });
  give(s, 1, 'blueberry', { 2: 3 });
  s.forecast = cust('Aisyah'); // 3 watermelon @7
  s.queue = [cust('Hadi', null, { walkIn: true })]; // 3 blueberry @5
  let g: GameState = s;
  for (let k = 0; k < 4; k++) g = buy(g, 0, 'watermelon', 3);
  say('  holder cash after buying:', g.players[0].cash);
  const r = bell(g, [{ watermelon: 7 }, { blueberry: 5 }, {}]);
  sales(r).forEach((l) => say(l));
  say('  => holder paid no fine (cash was 0 when the order was collected), then earned from the row; P1 was paid 1 a piece for 3 Fresh blueberries (cost 2 each) and lost the customer who would pay 5');
}
H('D3b same, but an honest comparison: holder keeps 12 cash (buys nothing) and misses all 3: fine min(cash, 18)');
{
  const s = mk({ n: 3, day: 5, cash: [12, 10, 10] });
  s.standing = standing(s, 'School Canteen', 0, 1, 5);
  give(s, 1, 'blueberry', { 2: 3 });
  const r = bell(s, [{}, { blueberry: 5 }, {}]);
  sales(r).forEach((l) => say(l));
}
H('D3c holder at 0 cash supplies 2 of 3 at bid 9 (blueberry, fine 6): is the fine taken out of the order income?');
{
  const s = mk({ n: 3, day: 5, cash: [0, 10, 10] });
  s.standing = standing(s, 'School Canteen', 0, 9, 5);
  give(s, 0, 'blueberry', { 2: 2 });
  const r = bell(s, [{ blueberry: 5 }, {}, {}]);
  sales(r).forEach((l) => say(l));
}
H('D3d Order Book halving and rounding. Apple order fine 7: short 1, 2, 3 (cash 50); mango fine 12; blueberry 6');
for (const [name, fruit] of [['Pie Factory', 'apple'], ['School Canteen', 'blueberry']] as const) for (const have of [2, 1, 0]) {
  const s = mk({ n: 3, day: 5, cash: [50, 10, 10], upgrades: [['orderbook'], [], []] });
  s.standing = standing(s, name, 0, 5, 5);
  if (have) give(s, 0, fruit, { 2: have });
  const r = bell(s, [have ? { [fruit]: 5 } : {}, {}, {}]);
  const o = r.results!.order!;
  say(`  ${name} fine ${fruit === 'apple' ? 7 : 6}/piece, short ${o.short}: fine paid ${o.fine} (unhalved ${o.short * (fruit === 'apple' ? 7 : 6)})`);
}
H('D3e fine capped by cash: 5 stalls, mango order (5 pieces, fine 12 each = 60), holder cash 23 supplies none; then with Order Book');
for (const book of [false, true]) {
  const s = mk({ n: 5, day: 5, cash: [23, 10, 10, 10, 10], upgrades: [book ? ['orderbook'] : [], [], [], [], []] });
  s.standing = standing(s, 'Royal Banquet', 0, 18, 5);
  const r = bell(s, [{}, {}, {}, {}, {}]);
  const o = r.results!.order!;
  say(`  order book ${book}: short ${o.short}, fine paid ${o.fine}, holder cash after ${r.players[0].cash}`);
}
H('D3f is an unpaid fine carried to the next day? Holder at 0 cash misses 3 (owed 18), then next morning');
{
  const s = mk({ n: 3, day: 5, cash: [0, 10, 10] });
  s.standing = standing(s, 'School Canteen', 0, 3, 5);
  const r = bell(s, [{}, {}, {}]);
  const m = toNextMorning(r);
  say(`  fine paid ${r.results!.order!.fine}; next day ${m.day} holder cash ${m.players[0].cash}; standing ${JSON.stringify(m.standing)}`);
}

// ---------- D4: events, Closing Day, game lengths ----------
H('D4a Price Controls on the due day: watermelon limit 7, bid 12. What does the order pay, and what may the holder post for the row?');
{
  const s = mk({ n: 3, day: 5, cash: [10, 10, 10] });
  s.event = ev('priceControls');
  s.standing = standing(s, 'Beach Resort', 0, 12, 5);
  give(s, 0, 'watermelon', { 3: 4 });
  give(s, 1, 'watermelon', { 3: 1 });
  s.forecast = cust('Rizal', [['watermelon', 1, 8]]);
  attempt('holder posts 8 for watermelon', () => bell(s, [{ watermelon: 8 }, { watermelon: 7 }, {}]));
  const r = bell(s, [{ watermelon: 7 }, { watermelon: 7 }, {}]);
  sales(r).forEach((l) => say(l));
}
H('D4b Closing Day as the due day (8-day game, order dealt day 6, due day 8). Bid 8; regular wants watermelon @7 (+1 on Closing Day)');
{
  const s = mk({ n: 3, days: 8, day: 8, cash: [10, 10, 10] });
  s.standing = standing(s, 'Beach Resort', 0, 8, 8);
  give(s, 0, 'watermelon', { 3: 2 });
  give(s, 1, 'watermelon', { 3: 3 });
  s.forecast = cust('Aisyah');
  const r = bell(s, [{ watermelon: 8 }, { watermelon: 8 }, {}]);
  sales(r).forEach((l) => say(l));
  const end = applyAction(r, 0, { kind: 'finish' });
  say('  after jam maker:', JSON.stringify(end.players.map((p) => p.cash)), 'jam', JSON.stringify(end.jam), 'phase', end.phase);
}
H('D4c which Market Days deal a standing order, for each game length (whole computer games, 4 stalls)');
for (const days of [8, 10, 14]) {
  const cfg: GameConfig = { players: Array.from({ length: 4 }, (_, i) => ({ name: `P${i}`, kind: 'ai' as const, level: 'normal' as const, avatar: '' })), days, unripe: true, upgrades: true, events: true, seed: 11 };
  let s = newGame(cfg);
  const dealt: string[] = [];
  let lastDay = 0;
  for (let i = 0; i < 20000 && s.phase !== 'over'; i++) {
    if (s.day !== lastDay) { lastDay = s.day; if (s.standing && s.standing.holder === null && s.standing.bids.every((b) => b === null)) dealt.push(`day ${s.day} (due day ${s.standing.due}${s.standing.due === days ? ' = Closing Day' : ''})`); }
    s = autoplay(s, 1);
  }
  say(`  ${days}-day game: orders dealt on ${dealt.join(', ')}; Market Days are ${[3, 6, 9, 12].filter((d) => d < days).join(', ')}`);
}
H('D4d Health Inspector on the due day morning eats the cash that would pay the fine (real night + morning). Holder cash 6 with 3 Soft apples on the shelf, apple order bid 5');
{
  const s = mk({ n: 3, day: 4, cash: [6, 10, 10], events: true });
  s.standing = standing(s, 'Pie Factory', 0, 5, 5);
  give(s, 0, 'apple', { 1: 3 }); // Okay tonight -> Soft tomorrow
  s.eventDeck = [evIdx('inspector')];
  s.phase = 'evening'; s.turn = 0;
  const m = toNextMorning(s);
  say(`  day ${m.day} event ${m.event?.id}; inspector fines ${JSON.stringify(m.dayFines)}; holder cash ${m.players[0].cash}; shelf ${shelf(m, 0)}`);
  const r = bell(beginBuying(m), [{ apple: 3 }, {}, {}]);
  sales(r).forEach((l) => say(l));
}
H('D4e nobody bids; and bidding rules: bid 0, bid above the ceiling, change of mind, last stall closes the bidding');
{
  const s0 = mk({ n: 3, day: 2 });
  s0.phase = 'evening'; s0.turn = 0;
  let g = toNextMorning(s0);
  g = beginBuying(g);
  say(`  day ${g.day} phase ${g.phase} order ${JSON.stringify({ fruit: g.standing?.fruit, qty: g.standing?.qty, ceiling: g.standing?.ceiling, fine: g.standing?.fine, due: g.standing?.due })}`);
  say('  bid 0:', canBidOrder(g, 0, 0), '| bid ceiling+1:', canBidOrder(g, 0, g.standing!.ceiling + 1), '| bid 1:', canBidOrder(g, 0, 1));
  let a = bidOrder(g, 0, 5);
  a = bidOrder(a, 0, 3); say('  P0 changed 5 -> 3 while others undecided: bids', JSON.stringify(a.standing!.bids));
  a = bidOrder(a, 1, null);
  a = bidOrder(a, 0, null); say('  P0 passed after all: bids', JSON.stringify(a.standing!.bids));
  a = bidOrder(a, 2, null);
  say('  all passed: standing', JSON.stringify(a.standing), 'phase', a.phase, 'log:', a.log[a.log.length - 1]);
  let b = bidOrder(bidOrder(g, 0, 5), 1, 4);
  say('  P0 changes after P1 bid, P2 still deciding:', canBidOrder(b, 0, 2));
  b = bidOrder(b, 2, 9);
  say('  after the last stall decided, P0 tries to change:', canBidOrder(b, 0, 2), '| holder', b.standing!.holder, 'price', b.standing!.price);
}
H('D4f the order card when the row is full: 5 stalls, order due and a guest (Hotel Chef). Who is in the row?');
{
  const s = mk({ n: 5, day: 5 });
  s.event = ev('hotel');
  s.standing = standing(s, 'Beach Resort', 0, 8, 5);
  s.forecast = cust('Aisyah');
  s.queue = ['Hadi', 'Nurul', 'Ben', 'Farid'].map((n) => cust(n, null, { walkIn: true }));
  const deckBefore = s.customerDeck.length;
  const a = arrive(s);
  say('  row:', servingCustomers(a).map((c) => c.name + (c.walkIn ? '(walk-in)' : '')).join(', '), '| customer deck grew by', a.customerDeck.length - deckBefore);
}

// ---------- D5: tips, perks, Juice Bar with an order ----------
H('D5a holder is Kiki (Tip Jar) with a Juice Bar and fills the whole order alone with 3 Okay blueberries, bid 9');
{
  const s = mk({ n: 3, day: 5, cash: [0, 10, 10], traits: ['favourite', null, null], upgrades: [['juicebar'], [], []] });
  s.standing = standing(s, 'School Canteen', 0, 9, 5);
  give(s, 0, 'blueberry', { 1: 3 });
  const r = bell(s, [{ blueberry: 4 }, {}, {}]);
  sales(r).forEach((l) => say(l));
  say('  favours in hand:', JSON.stringify(r.players[0].favours), '| stats.sold', r.players[0].stats.sold);
}
H('D5b rival with a Juice Bar has its Okay blueberries taken (bid 4 -> rival pay 3)');
{
  const s = mk({ n: 3, day: 5, cash: [50, 10, 10], upgrades: [[], ['juicebar'], []] });
  s.standing = standing(s, 'School Canteen', 0, 4, 5);
  give(s, 1, 'blueberry', { 1: 3 });
  const r = bell(s, [{}, { blueberry: 4 }, {}]);
  sales(r).forEach((l) => say(l));
}
H('D5c the order line on Closing Day: what "top price" does the result line carry? (bid 8)');
{
  const s = mk({ n: 3, days: 8, day: 8 });
  s.standing = standing(s, 'Beach Resort', 0, 8, 8);
  give(s, 0, 'watermelon', { 3: 3 });
  const r = bell(s, [{ watermelon: 8 }, {}, {}]);
  say('  result line max:', r.results!.lines[0].max, '| paid per piece:', r.results!.order!.sales[0].price);
}
H('D5d holder with Premium Display and Favoured Trade: any effect on the order?');
{
  const s = mk({ n: 3, day: 5, cash: [0, 10, 10], upgrades: [['premium'], [], []] });
  s.standing = standing(s, 'Beach Resort', 0, 8, 5);
  give(s, 0, 'watermelon', { 3: 3 });
  const r = bell(s, [{ watermelon: 8 }, {}, {}], { favoured: [true, false, false] });
  sales(r).forEach((l) => say(l));
}
