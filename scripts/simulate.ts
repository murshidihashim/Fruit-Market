// Balance check: npx vite-node scripts/simulate.ts
import { autoplay } from '../src/engine/ai';
import { newGame, ranking, type Level } from '../src/engine/game';

const G = 600;
function run(n: number, lv: Level[], label: string) {
  const wins = new Array(n).fill(0);
  let cash = 0, sold = 0, spoiled = 0, upgrades = 0, favours = 0, earned = 0;
  for (let seed = 1; seed <= G; seed++) {
    const s = autoplay(newGame({ players: lv.map((l, i) => ({ name: `P${i}`, kind: 'ai' as const, level: l, avatar: '' })), days: 10, unripe: true, upgrades: true, events: true, seed }));
    wins[ranking(s)[0]]++;
    for (const p of s.players) { cash += p.cash; sold += p.stats.sold; spoiled += p.stats.spoiled; upgrades += p.upgrades.length; favours += p.stats.favours; earned += p.stats.earned; }
  }
  const per = G * n;
  console.log(`${label.padEnd(26)} cash ${(cash / per).toFixed(0)} sold ${(sold / per).toFixed(1)} avg$ ${(earned / Math.max(1, sold)).toFixed(2)} spoil ${(spoiled / per).toFixed(1)} upg ${(upgrades / per).toFixed(1)} fav ${(favours / per).toFixed(1)} | win% ${wins.map((w) => Math.round((100 * w) / G)).join('/')}`);
}
for (const n of [2, 3, 4]) {
  run(n, ['hard', ...Array(n - 1).fill('normal')], `${n}p hard vs normal`);


}
