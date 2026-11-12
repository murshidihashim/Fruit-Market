// D2/D4: which buying day gives a piece the order will take on the due day (order dealt day 3, due day 5)?
// A piece is bought from the lorry's entry box on day 3, 4 or 5 and aged through the real nights.
import { FRUIT, FRUITS, ORDER_CARDS, type FruitId } from '/home/user/Fruit-Market/src/engine/data';
import { buy, type GameState } from '/home/user/Fruit-Market/src/engine/game';
import { H, bell, mk, say, stageName, standing, toNextMorning, track } from './lib';

H('Order dealt on day 3, collected on day 5. One piece bought from the lorry on day 3, 4 or 5: its state on day 5 and whether the order takes it');
for (const room of [false, true]) for (const f of FRUITS) {
  const card = ORDER_CARDS.find((c) => c.fruit === f)!.name;
  const cells: string[] = [];
  for (const buyDay of [3, 4, 5]) {
    let s: GameState = mk({ n: 3, day: buyDay, cash: [50, 10, 10], upgrades: [room ? ['ripening'] : [], [], []] });
    s.config.marketDays = false; s.config.upgrades = false;
    const entry = f === 'mango' ? 4 : FRUIT[f].ripe.length - 1;
    s.market[f] = track(f, { [entry]: 1 });
    s = buy(s, 0, f as FruitId, entry);
    while (s.day < 5) { s = toNextMorning(bell(s, [{}, {}, {}], { crates: ['none', 'none', 'none'] })); s = structuredClone(s); s.phase = 'buy'; s.turn = 0; s.order = [0, 1, 2]; s.forecast = null; s.queue = []; }
    const pos = s.players[0].stock[f].findIndex((c) => c > 0);
    s.standing = standing(s, card, 0, 5, 5);
    const ripe = pos < FRUIT[f].ripe.length;
    const r = bell(s, [ripe ? { [f]: 5 } : {}, {}, {}]);
    cells.push(`bought day ${buyDay}: ${stageName(f, pos)} -> ${r.results!.order!.sales.length ? 'taken' : 'NOT taken'}`);
  }
  say(`  ${f}${room ? ' (Ripening Room)' : ''}: ${cells.join(' | ')}`);
}
