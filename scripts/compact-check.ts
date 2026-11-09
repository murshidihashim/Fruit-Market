// Compact rules acceptance check (PLAN-057): the spec's simulated figures and targets, measured on the built game.
// Hard computer in every seat, 10 days, all options on. Run: npx vite-node scripts/compact-check.ts [games]
import { autoplay } from '../src/engine/ai';
import { CHARACTER_TRAIT, FRUITS, RIVALS, TRAITS, type FruitId } from '../src/engine/data';
import { newGame, ranking, type GameState } from '../src/engine/game';

const G = Number(process.argv[2] ?? 400);
const SIZES = (process.argv[3] ?? '2,3,4,5,6').split(',').map(Number);

function game(n: number, seed: number, rot: number): GameState {
  // Rotate which shopkeepers sit at the table, and where, so every perk plays every seat.
  const chars = Array.from({ length: n }, (_, i) => RIVALS[(rot + i) % RIVALS.length]);
  return autoplay(newGame({
    players: chars.map((r) => ({ name: r.name, kind: 'ai' as const, level: 'hard' as const, avatar: r.avatar })),
    days: 10, unripe: true, upgrades: true, events: true, seed,
  }));
}

const pct = (x: number) => `${(100 * x).toFixed(1)}%`;
console.log(`Compact rules check: ${G} games per table size, Hard computer in every seat, 10 days.\n`);
console.log('Stalls | Final cash per stall | Pieces sold per stall | Spoiled per stall | Close finishes (<= $3)');
const wins: Record<number, Record<string, [number, number]>> = {};
const fruitProfit: Record<FruitId, number> = { blueberry: 0, watermelon: 0, apple: 0, mango: 0 };
for (const n of SIZES) {
  let cash = 0, sold = 0, spoiled = 0, close = 0;
  wins[n] = {};
  for (let g = 0; g < G; g++) {
    const s = game(n, 1000 * n + g, g);
    cash += s.players.reduce((a, p) => a + p.cash, 0) / n;
    sold += s.players.reduce((a, p) => a + p.stats.sold, 0) / n;
    spoiled += s.players.reduce((a, p) => a + p.stats.spoiled, 0) / n;
    const r = ranking(s);
    if (s.players[r[0]].cash - s.players[r[1]].cash <= 3) close++;
    s.players.forEach((p, i) => {
      const t = TRAITS[CHARACTER_TRAIT[p.avatar]].title;
      const w = (wins[n][t] ??= [0, 0]);
      w[1]++;
      if (r[0] === i) w[0]++;
    });
    if (n === 4) for (const d of s.history ?? []) for (const l of d.lines) for (const o of l.offers) fruitProfit[l.fruit] += o.sold * o.price;
  }
  console.log(`${n} | $${(cash / G).toFixed(0)} | ${(sold / G).toFixed(1)} | ${(spoiled / G).toFixed(2)} | ${pct(close / G)}`);
}
for (const n of [3, 4].filter((x) => SIZES.includes(x))) {
  console.log(`\nShopkeeper win rates at ${n} stalls (fair ${pct(1 / n)}):`);
  for (const [t, [w, p]] of Object.entries(wins[n]).sort()) console.log(`  ${t}: ${pct(w / p)} of ${p} (${((100 * w) / p - 100 / n).toFixed(1)} points)`);
}
if (!SIZES.includes(4)) process.exit(0);
const fp = FRUITS.map((f) => fruitProfit[f] / G / 4);
console.log(`\nSales revenue per stall by fruit at 4 stalls: ${FRUITS.map((f, i) => `${f} $${fp[i].toFixed(1)}`).join(', ')}; best to worst ${pct(Math.max(...fp) / Math.min(...fp) - 1)}`);
