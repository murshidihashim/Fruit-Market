// Part 2 G: tie resolution with several effects at once.
import { applyAction, beginBuying, bidOrder, playFavour, ranking, type GameState } from '/home/user/Fruit-Market/src/engine/game';
import type { TraitId } from '/home/user/Fruit-Market/src/engine/data';
import { H, bell, cust, give, mk, sales, say, toNextMorning } from './lib';

// Watermelon positions: 0 Soft, 1 Okay, 2 Fresh (older), 3 Fresh (new).
const row = (s: GameState, qty = 1, top = 7) => { s.forecast = cust('Zul', [['watermelon', qty, top]]); };
const line = (r: GameState) => r.results!.lines[0].offers.map((o) => `P${o.player} sold ${o.sold}`).join(', ');

H('G1 both stalls play Favoured Trade, same price, same freshness: buying order decides (run with order 0,1 and 1,0)');
for (const order of [[0, 1, 2], [1, 0, 2]]) {
  const s = mk({ n: 3 }); s.order = order; row(s);
  give(s, 0, 'watermelon', { 3: 1 }); give(s, 1, 'watermelon', { 3: 1 });
  const r = bell(s, [{ watermelon: 7 }, { watermelon: 7 }, {}], { favoured: [true, true, false] });
  say(`  buying order ${order.join(',')}: ${line(r)}; Favoured Trade cards left in hands: ${JSON.stringify(r.players.map((p) => p.favours.length))}`);
}
H('G2 pairings. Buying order is always P2, P1, P0 (P0 buys last), all post 7 for a customer who wants 1 watermelon at 7');
{
  const run = (label: string, traits: (TraitId | null)[], pos: number[], fav: boolean[]) => {
    const s = mk({ n: 3, traits }); s.order = [2, 1, 0]; row(s);
    pos.forEach((q, p) => { if (q >= 0) give(s, p, 'watermelon', { [q]: 1 }); });
    const prices = pos.map((q) => (q >= 0 ? { watermelon: 7 } : {}));
    const r = bell(s, prices, { favoured: fav });
    say(`  ${label}: ${line(r)}`);
  };
  run('Favoured Trade (P0, older Fresh) vs fresher fruit (P1, new Fresh)', [null, null, null], [2, 3, -1], [true, false, false]);
  run('Favoured Trade (P0) vs Haggler (P1), equal freshness', [null, 'haggler', null], [3, 3, -1], [true, false, false]);
  run('Fresher fruit (P0, new Fresh) vs Haggler (P1, older Fresh)', [null, 'haggler', null], [3, 2, -1], [false, false, false]);
  run('Haggler (P0) vs earlier buyer (P1), equal freshness', ['haggler', null, null], [3, 3, -1], [false, false, false]);
  run('Haggler (P0, new Fresh) vs earlier buyer (P1, older Fresh)', ['haggler', null, null], [3, 2, -1], [false, false, false]);
  run('All three: Favoured Trade (P0, older Fresh), fresher (P1, new Fresh), Haggler (P2, older Fresh, buys first)', [null, null, 'haggler'], [2, 3, 2], [true, false, false]);
  run('No Favoured Trade: fresher (P1) vs Haggler (P2, buys first) vs P0', [null, null, 'haggler'], [2, 3, 2], [false, false, false]);
  run('Haggler (P0, buys last) vs two equally fresh rivals', ['haggler', null, null], [3, 3, 3], [false, false, false]);
  run('Haggler plays no part against FRESHER fruit even with Favoured Trade absent: Haggler P0 older, P1 & P2 new', ['haggler', null, null], [2, 3, 3], [false, false, false]);
}
H('G3 three-way tie at 7, customer wants 3; the tie winner has only 1 piece. Buying order 2,1,0. P0 new Fresh x1 (Favoured Trade), P1 new Fresh x1, P2 older Fresh x3 (Haggler)');
{
  const s = mk({ n: 3, traits: [null, null, 'haggler'] }); s.order = [2, 1, 0]; row(s, 3);
  give(s, 0, 'watermelon', { 3: 1 }); give(s, 1, 'watermelon', { 3: 1 }); give(s, 2, 'watermelon', { 2: 3 });
  const r = bell(s, [{ watermelon: 7 }, { watermelon: 7 }, { watermelon: 7 }], { favoured: [true, false, false] });
  sales(r).forEach((l) => say(l));
}
H('G4 what "fresher" compares when a stall hands over several pieces. Both post 6 (top 7, so Okay qualifies). P0: 1 Okay + 1 new Fresh. P1: 2 older Fresh. Buying order P1 first.');
for (const qty of [1, 2]) {
  const s = mk({ n: 3 }); s.order = [1, 0, 2]; row(s, qty);
  give(s, 0, 'watermelon', { 1: 1, 3: 1 }); give(s, 1, 'watermelon', { 2: 2 });
  const r = bell(s, [{ watermelon: 6 }, { watermelon: 6 }, {}]);
  say(` customer wants ${qty}:`); sales(r).forEach((l) => say(l));
  say(`  P0 shelf after: w[${r.players[0].stock.watermelon.join(',')}]  P1: w[${r.players[1].stock.watermelon.join(',')}]`);
}
H('G4b same, P0 has 1 Okay + 1 older Fresh + 1 new Fresh, customer wants 2 (P0 would hand over Okay + older Fresh; its new Fresh stays): tie on freshness -> buying order');
for (const order of [[1, 0, 2], [0, 1, 2]]) {
  const s = mk({ n: 3 }); s.order = order; row(s, 2);
  give(s, 0, 'watermelon', { 1: 1, 2: 1, 3: 1 }); give(s, 1, 'watermelon', { 2: 2 });
  const r = bell(s, [{ watermelon: 6 }, { watermelon: 6 }, {}]);
  say(`  buying order ${order.join(',')}: ${line(r)}; offers freshness ${r.results!.lines[0].offers.map((o) => `P${o.player}:${o.freshness}`).join(' ')}`);
}
H('G4c "fresher" between two Fresh apples of different ages (ages 0 and 3: both Fresh)');
{
  const s = mk({ n: 3 }); s.order = [0, 1, 2]; s.forecast = cust('Marcus', [['apple', 1, 6]]);
  give(s, 0, 'apple', { 2: 1 }); give(s, 1, 'apple', { 5: 1 });
  const r = bell(s, [{ apple: 6 }, { apple: 6 }, {}]);
  say(`  P0 (buys first) has a 4-day-old Fresh apple, P1 a new one, both post 6: ${line(r)}`);
}
H('G5 a tie that only exists because of Premium Display: Premium customer (Fresh only) top 7; P0 (display) posts 8 with Fresh, P1 (no display) posts 8 with Fresh; then both have displays');
{
  const s = mk({ n: 3, upgrades: [['premium'], [], []] }); s.order = [1, 0, 2]; row(s, 1);
  give(s, 0, 'watermelon', { 3: 1 }); give(s, 1, 'watermelon', { 3: 1 });
  say(`  display vs none at 8: ${line(bell(s, [{ watermelon: 8 }, { watermelon: 8 }, {}]))}`);
  const t = mk({ n: 3, upgrades: [['premium'], ['premium'], []] }); t.order = [1, 0, 2]; row(t, 1);
  give(t, 0, 'watermelon', { 2: 1 }); give(t, 1, 'watermelon', { 3: 1 });
  say(`  both displays at 8, P0 older Fresh, P1 new Fresh: ${line(bell(t, [{ watermelon: 8 }, { watermelon: 8 }, {}]))}`);
}

H('G6 buying order. Real nights. 4 stalls, first-player token and cash as stated');
{
  const night = (label: string, set: (s: GameState) => void) => {
    const s = mk({ n: 4, day: 2, cash: [20, 10, 10, 30] });
    s.firstPlayer = 3; // the night moves the token to seat 0
    s.phase = 'evening'; s.turn = 0; s.order = [0, 1, 2, 3];
    set(s);
    let g: GameState = s;
    // every stall with a Priority card plays it on its evening turn
    let guard = 0;
    while (g.phase === 'evening' && guard++ < 10) {
      const p = g.order[g.turn];
      const k = g.players[p].favours.indexOf('priority');
      if (k >= 0) g = playFavour(g, p, k);
      g = applyAction(g, p, { kind: 'endEvening' });
    }
    say(`  ${label}: day ${g.day}, token at seat ${g.firstPlayer}, cash ${JSON.stringify(g.players.map((p) => p.cash))} -> buying order ${g.order.join(',')}`);
  };
  night('poorest tie between seats 1 and 2, token moves to seat 0', () => {});
  night('same, token moves to seat 2', (s) => { s.firstPlayer = 1; });
  night('seat 3 (richest) played Priority', (s) => { s.players[3].favours = ['priority']; });
  night('seats 0 and 3 both played Priority the same evening (0 plays first)', (s) => { s.players[0].favours = ['priority']; s.players[3].favours = ['priority']; });
  night('seat 3 is Nest Egg (day 3 is next), seat 0 played Priority', (s) => { s.players[3].trait = 'nestegg'; s.players[0].favours = ['priority']; });
  night('seat 3 is Nest Egg, nobody plays Priority', (s) => { s.players[3].trait = 'nestegg'; });
  night('Nest Egg on the night before day 4 (no effect expected)', (s) => { s.players[3].trait = 'nestegg'; s.day = 3; s.config.marketDays = false; s.config.upgrades = false; });
}
H('G7 standing-order bid ties (day 3 morning, 4 stalls). Buying order after the night is shown');
{
  const morning = (label: string, set: (s: GameState) => void, bids: (number | null)[]) => {
    const s = mk({ n: 4, day: 2, cash: [20, 10, 10, 30] });
    s.firstPlayer = 3; s.phase = 'evening'; s.turn = 0;
    set(s);
    let g = beginBuying(toNextMorning(s));
    bids.forEach((b, p) => { g = bidOrder(g, p, b); });
    say(`  ${label}: buying order ${g.order.join(',')}; bids ${JSON.stringify(bids)} -> holder P${g.standing?.holder} at ${g.standing?.price}`);
  };
  morning('all bid 5, no Order Book', () => {}, [5, 5, 5, 5]);
  morning('all bid 5, seat 3 has an Order Book', (s) => { s.players[3].upgrades = ['orderbook']; }, [5, 5, 5, 5]);
  morning('all bid 5, seats 0 and 3 have Order Books', (s) => { s.players[3].upgrades = ['orderbook']; s.players[0].upgrades = ['orderbook']; }, [5, 5, 5, 5]);
  morning('Order Book bids 6, others 5 (a book does not beat a lower bid)', (s) => { s.players[3].upgrades = ['orderbook']; }, [5, 5, 5, 6]);
  morning('all bid 5, seat 3 is Nest Egg (buys first on day 3)', (s) => { s.players[3].trait = 'nestegg'; }, [5, 5, 5, 5]);
  morning('only seat 2 bids', () => {}, [null, null, 9, null]);
}
H('G8 the end of the game: equal cash, then pieces sold, then?');
{
  const s = mk({ n: 4, days: 10, day: 10, cash: [50, 50, 50, 40] });
  s.players[0].stats.sold = 20; s.players[1].stats.sold = 22; s.players[2].stats.sold = 22;
  say('  cash 50/50/50/40, sold 20/22/22/0 -> ranking()', ranking(s).join(','), '(seats; first is the winner)');
  const t = mk({ n: 4, days: 10, day: 10, cash: [50, 50, 50, 40] });
  t.players[2].stats.sold = 22; t.players[1].stats.sold = 22; t.players[0].stats.sold = 22;
  say('  all three on 50 cash and 22 sold -> ranking()', ranking(t).join(','));
}
