// Extra checks: a computer taking over the holder's seat, rowStock against the real rush, Bad Harvest by table size,
// the first days without ripe mangoes, and a few small ones.
import { CUSTOMER_CARDS, EVENT_CARDS, FARMER_CARDS, FRUIT, FRUITS, prefOf, type FruitId, type Stalls } from '/home/user/Fruit-Market/src/engine/data';
import { aiActFor, autoplay } from '/home/user/Fruit-Market/src/engine/ai';
import { activePlayer, applyAction, canPlayFavour, newGame, playFavour, rowStock, type GameConfig, type GameState } from '/home/user/Fruit-Market/src/engine/game';
import { Rng } from '/home/user/Fruit-Market/src/engine/rng';
import { H, arrive, bell, cust, ev, evIdx, give, mk, sales, say, standing, toNextMorning, track } from './lib';

H('I1 the holder leaves and a computer plays the seat (the server calls aiActFor for that seat; the order stays with the seat)');
{
  let s: GameState = mk({ n: 3, day: 5, cash: [20, 10, 10] });
  s.standing = standing(s, 'Beach Resort', 0, 8, 5);
  give(s, 0, 'watermelon', { 3: 2, 1: 1 });
  s.market.watermelon = track('watermelon', { 3: 4 });
  s.forecast = cust('Aisyah');
  let guard = 0;
  while (s.phase !== 'reveal' && guard++ < 200) {
    const p = activePlayer(s);
    if (p === 0) { const n = aiActFor(s, 0); if (!n) break; s = n; continue; }
    if (s.phase === 'buy') s = applyAction(s, p, { kind: 'endBuy' });
    else if (s.phase === 'stall') s = applyAction(s, p, { kind: 'stall', stall: {} });
    else break;
  }
  say(`  phase ${s.phase}; seat 0 crate ${JSON.stringify(s.crates?.[0])}`);
  sales(s).forEach((l) => say(l));
}

H('I2 rowStock (the forecast the screens and computer stalls use) against what the rush really leaves: 2,000 random crates');
{
  const r = new Rng(12345);
  let bad = 0, n = 0;
  for (let t = 0; t < 2000; t++) {
    const stalls = 2 + r.int(5);
    const s = mk({ n: stalls, day: 5 });
    const order = r.shuffle(s.players.map((_, i) => i));
    s.order = order;
    s.standing = standing(s, 'Beach Resort', r.int(stalls), 5, 5);
    for (let p = 0; p < stalls; p++) give(s, p, 'watermelon', { 0: r.int(2), 1: r.int(3), 2: r.int(3), 3: r.int(3) });
    let a = arrive(s);
    for (let p = 0; p < stalls; p++) a = applyAction(a, p, { kind: 'stall', stall: {}, crate: s.players[p].stock.watermelon.some((c) => c > 0) ? { watermelon: [...s.players[p].stock.watermelon] } : {} });
    const forecast = s.players.map((_, p) => rowStock(a, p).watermelon.join(','));
    const res = bell(s, s.players.map((pl) => (pl.stock.watermelon.some((c) => c > 0) ? { watermelon: 30 } : {})));
    const real = res.players.map((pl) => pl.stock.watermelon.join(','));
    n++;
    if (forecast.join('|') !== real.join('|')) { bad++; if (bad <= 3) say('  MISMATCH', forecast.join('|'), 'vs', real.join('|')); }
  }
  say(`  ${n} cases, ${bad} mismatches`);
}

H('I3 Bad Harvest ("halve, rounded up", per fruit): what share of the load really arrives, by table size');
for (const n of [2, 3, 4, 5, 6] as Stalls[]) {
  let full = 0, half = 0;
  for (const c of FARMER_CARDS) for (const f of FRUITS) { full += c.table[n][f]; half += Math.ceil(c.table[n][f] * 0.5); }
  say(`  ${n} stalls: mean load ${(full / 20).toFixed(2)} -> ${(half / 20).toFixed(2)} pieces (${Math.round((100 * half) / full)}% arrives)`);
}
H('I3b Good Harvest (+1 of each per 4 stalls) and Blueberry Glut / Mango Windfall (+1 per 2 stalls): extra pieces by table size');
for (const n of [2, 3, 4, 5, 6]) say(`  ${n} stalls: Good Harvest +${Math.ceil(n / 4)} of each fruit (+${4 * Math.ceil(n / 4)} pieces); Glut / Windfall +${Math.ceil(n / 2)}`);

H('I4 mango sales by day in whole computer games (4 stalls, Normal, 10 days, events on, 60 games): pieces wanted and sold');
{
  const want = new Array(11).fill(0), sold = new Array(11).fill(0), wantAll = new Array(11).fill(0), soldAll = new Array(11).fill(0);
  for (let seed = 1; seed <= 60; seed++) {
    const cfg: GameConfig = { players: Array.from({ length: 4 }, (_, i) => ({ name: `P${i}`, kind: 'ai' as const, level: 'normal' as const, avatar: ['🦊', '🐻', '🐷', '🐢'][i] })), days: 10, unripe: true, upgrades: true, events: true, seed };
    const s = autoplay(newGame(cfg));
    for (const d of s.history ?? []) for (const l of d.lines) {
      if (CUSTOMER_CARDS.every((c) => c.name !== l.name)) continue; // row customers only
      const k = l.offers.reduce((a, o) => a + o.sold, 0);
      wantAll[d.day] += l.want; soldAll[d.day] += k;
      if (l.fruit === 'mango') { want[d.day] += l.want; sold[d.day] += k; }
    }
  }
  for (let d = 1; d <= 10; d++) say(`  day ${d}: mango wanted ${want[d]}, sold ${sold[d]} (${want[d] ? Math.round((100 * sold[d]) / want[d]) : 0}%); all fruit wanted ${wantAll[d]}, sold ${soldAll[d]} (${Math.round((100 * soldAll[d]) / wantAll[d])}%)`);
}

H('I5 fill rate by fruit and customer type in the same kind of games, 2 to 6 stalls (Normal computers, 10 days, 40 games each)');
for (const n of [2, 3, 4, 5, 6]) {
  const want: Record<string, number> = {}, sold: Record<string, number> = {};
  for (let seed = 1; seed <= 40; seed++) {
    const av = ['🦊', '🐻', '🐷', '🐢', '🦝', '🐸'];
    const cfg: GameConfig = { players: Array.from({ length: n }, (_, i) => ({ name: `P${i}`, kind: 'ai' as const, level: 'normal' as const, avatar: av[i] })), days: 10, unripe: true, upgrades: true, events: true, seed: 100 + seed };
    const s = autoplay(newGame(cfg));
    for (const d of s.history ?? []) for (const l of d.lines) {
      if (CUSTOMER_CARDS.every((c) => c.name !== l.name)) continue;
      const k = l.offers.reduce((a, o) => a + o.sold, 0);
      for (const key of [l.fruit, `${l.fruit}:${prefOf(l.name)}`, 'all']) { want[key] = (want[key] ?? 0) + l.want; sold[key] = (sold[key] ?? 0) + k; }
    }
  }
  const pct = (k: string) => (want[k] ? `${Math.round((100 * sold[k]) / want[k])}%` : '-');
  say(`  ${n} stalls: all ${pct('all')} | ` + FRUITS.map((f) => `${f} ${pct(f)} (prem ${pct(`${f}:premium`)}, every ${pct(`${f}:everyday`)}, barg ${pct(`${f}:bargain`)})`).join(' | '));
}

H('I6 Gossip / Sharp Ears on the last day; Priority on the last evening');
{
  const s = mk({ n: 3, days: 10, day: 9, traits: ['earful', null, null] });
  s.nextForecast = cust('Zul'); s.nextQueue = [cust('Aisyah', null, { walkIn: true }), cust('Nurul', null, { walkIn: true })];
  s.players[1].favours = ['gossip', 'priority'];
  let r = applyAction(bell(s, [{}, {}, {}]), 0, { kind: 'finish' });
  say(`  day 9 evening: Farah has peeked ${JSON.stringify(r.queue.map((c) => c.seenBy))}; Gossip playable for seat 1: ${(() => { const t = structuredClone(r); t.turn = t.order.indexOf(1); return canPlayFavour(t, 1, 0) ?? 'yes'; })()}; Priority: ${(() => { const t = structuredClone(r); t.turn = t.order.indexOf(1); return canPlayFavour(t, 1, 1) ?? 'yes'; })()}`);
  r = toNextMorning(r);
  const last = arrive((await import('/home/user/Fruit-Market/src/engine/game')).beginBuying(r));
  say(`  day ${last.day} (last): after buying ends, tomorrow's strip: forecast ${last.forecast?.name ?? 'none'}, walk-ins ${last.queue.length}`);
}
H('I7 a Gossip played in the evening, then a Tourist Bus in the morning: which walk-ins has the Gossip player seen?');
{
  const s = mk({ n: 3, day: 3, events: true });
  s.config.marketDays = false; s.config.upgrades = false;
  s.eventDeck = [evIdx('touristBus')];
  s.forecast = cust('Zul');
  s.queue = [cust('Aisyah', null, { walkIn: true }), cust('Nurul', null, { walkIn: true })];
  s.players[1].favours = ['gossip'];
  s.phase = 'evening'; s.turn = 1;
  let g = playFavour(s, 1, 0);
  g = applyAction(g, 1, { kind: 'endEvening' });
  g = applyAction(g, 2, { kind: 'endEvening' });
  say(`  day ${g.day} ${g.event?.id}: walk-ins ${g.queue.map((c) => `${c.name} seen by ${JSON.stringify(c.seenBy)}`).join('; ')}`);
}
void EVENT_CARDS; void FRUIT; void ev;
