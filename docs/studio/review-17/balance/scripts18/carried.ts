// What an average stall carries into a day: ripe pieces of each fruit on its shelf at the start of buying (day 2 on),
// and green mangoes one night from ripe. The Normal computer uses these averages for the rivals' older stock, which
// it does not recall (rules 18; src/engine/ai.ts UNSEEN_RIPE and UNSEEN_GREEN).
// npx vite-node docs/studio/review-17/balance/scripts18/carried.ts -- --n 3 --games 300 [--level normal]
import { aiStep } from '../../../../../src/engine/ai';
import { FRUIT, FRUITS, type FruitId } from '../../../../../src/engine/data';
import { beginBuying, finishReveal, newGame, type Level } from '../../../../../src/engine/game';
import { arg, r2 } from './harness';

const n = Number(arg('n', '3')), G = Number(arg('games', '300'));
const level = (arg('level', 'normal') ?? 'normal') as Level;
const ripe = Object.fromEntries(FRUITS.map((f) => [f, 0])) as Record<FruitId, number>;
let green1 = 0, stallDays = 0;
for (let seed = 1; seed <= G; seed++) {
  let s = newGame({ players: Array.from({ length: n }, (_, i) => ({ name: `P${i}`, kind: 'ai' as const, level, avatar: '' })), days: 10, unripe: true, upgrades: true, events: true, seed });
  while (s.phase !== 'over') {
    if (s.phase === 'morning') {
      if (s.day > 1) for (const pl of s.players) {
        stallDays++;
        for (const f of FRUITS) ripe[f] += pl.stock[f].slice(0, FRUIT[f].ripe.length).reduce((a, b) => a + b, 0);
        green1 += pl.stock.mango[FRUIT.mango.ripe.length] ?? 0;
      }
      s = beginBuying(s);
    } else if (s.phase === 'reveal') s = finishReveal(s);
    else s = aiStep(s)!;
  }
}
console.log(`${n} stalls, ${level}, ${G} games: ripe pieces per stall at dawn: ${FRUITS.map((f) => `${f} ${r2(ripe[f] / stallDays)}`).join(', ')}; green mangoes one night from ripe: ${r2(green1 / stallDays)}`);
