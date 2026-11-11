// Last small checks.
import { applyAction, type GameState } from '/home/user/Fruit-Market/src/engine/game';
import { H, bell, cust, ev, give, mk, sales, say, shelf, standing } from './lib';

H('K1 Sharp Ears: Farah sells to the regular, to a guest, and two different fruits to one peeked walk-in (3 stalls)');
{
  const s = mk({ n: 3, traits: ['earful', null, null], cash: [0, 0, 0] });
  s.event = ev('bakeOff');
  give(s, 0, 'apple', { 5: 6 }); give(s, 0, 'blueberry', { 2: 2 });
  s.forecast = cust('Marcus', [['apple', 1, 6]]);
  s.queue = [cust('Priya', [['apple', 2, 7], ['blueberry', 2, 6]], { walkIn: true, seenBy: [0] })];
  sales(bell(s, [{ apple: 6, blueberry: 5 }, {}, {}])).forEach((l) => say(l));
}
H('K2 an order due on a Pasar Malam day; the holder also has Soft pieces of the order fruit in its crate (bid 8, watermelon)');
{
  const s = mk({ n: 3, day: 5, cash: [0, 0, 0] });
  s.event = ev('pasarMalam');
  s.standing = standing(s, 'Beach Resort', 0, 8, 5);
  give(s, 0, 'watermelon', { 0: 2, 3: 2 });
  give(s, 1, 'watermelon', { 0: 1, 3: 2 });
  const r = bell(s, [{ watermelon: 30 }, { watermelon: 30 }, {}]);
  sales(r).forEach((l) => say(l));
  say(`  shelves after: P0 ${shelf(r, 0)}; P1 ${shelf(r, 1)}`);
}
H('K3 Tip Jar: the Hotel Chef (three fruits) served by Kiki alone; and with one fruit from a rival');
for (const rival of [false, true]) {
  const s = mk({ n: 3, traits: ['favourite', null, null], cash: [0, 0, 0] });
  s.event = ev('hotel');
  give(s, 0, 'apple', { 5: 1 }); give(s, 0, 'watermelon', { 3: 1 });
  give(s, rival ? 1 : 0, 'blueberry', { 2: 1 });
  const r = bell(s, [{ apple: 8, watermelon: 8, ...(rival ? {} : { blueberry: 7 }) }, rival ? { blueberry: 7 } : {}, {}]);
  say(`  rival supplies the blueberry: ${rival}; income ${JSON.stringify(r.results!.income)}; favours ${r.results!.favours.map((f) => `P${f.player}`).join(',') || 'none'}`);
}
H('K4 end of game: does the Pasar Malam hawker or the jam maker count toward "fruit sold" (the tie-break)?');
{
  const s = mk({ n: 3, days: 10, day: 10, cash: [0, 0, 0] });
  s.event = ev('pasarMalam');
  give(s, 0, 'blueberry', { 0: 3 });
  let r: GameState = bell(s, [{ blueberry: 30 }, {}, {}]);
  r = applyAction(r, 0, { kind: 'finish' });
  say(`  3 Soft blueberries in the crate: hawker bought 1, jam maker 2; cash ${r.players[0].cash}; stats.sold ${r.players[0].stats.sold}`);
}
