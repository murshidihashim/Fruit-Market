// How often do two stalls post the same lowest price for the same customer line? (Matters for the Haggler and Favoured Trade.)
// npx vite-node scripts/lab/ties.ts -- --n 3 --games 300 [--level normal]
import { aiStep } from '../../src/engine/ai';
import { CHARACTER_TRAIT } from '../../src/engine/data';
import { beginBuying, finishReveal, newGame, type Level } from '../../src/engine/game';
import { arg, r1 } from './harness';

const n = Number(arg('n', '3')), G = Number(arg('games', '300'));
const level = (arg('level', 'normal') ?? 'normal') as Level;
const avatars = Object.keys(CHARACTER_TRAIT);
let lines = 0, contested = 0, tied = 0, sold = 0, soldAtMax = 0, soldNear = 0, undercut = 0, hagTie = 0, hagLines = 0;
for (let seed = 1; seed <= G; seed++) {
  let s = newGame({ players: Array.from({ length: n }, (_, i) => ({ name: `P${i}`, kind: 'ai' as const, level, avatar: avatars[(seed + i * 3) % avatars.length] })), days: 10, unripe: true, upgrades: true, events: true, seed });
  for (let i = 0; i < 40000 && s.phase !== 'over'; i++) {
    if (s.phase === 'morning') { s = beginBuying(s); continue; }
    if (s.phase === 'reveal') {
      for (const l of s.results!.lines) {
        const live = l.offers.filter((o) => o.qty > 0 && !o.tooOld);
        if (!live.length || s.results!.order?.name === l.name) continue;
        lines++;
        const hag = live.some((o) => s.players[o.player].trait === 'haggler');
        if (hag) hagLines++;
        if (live.length >= 2) {
          contested++;
          const min = Math.min(...live.map((o) => o.price));
          const atMin = live.filter((o) => o.price === min);
          if (atMin.length >= 2) { tied++; if (atMin.some((o) => s.players[o.player].trait === 'haggler')) hagTie++; }
          if (live.some((o) => o.price > min)) undercut++;
        }
        for (const o of live) if (o.sold) { sold += o.sold; if (o.price >= l.max) soldAtMax += o.sold; if (o.price >= l.max - 1) soldNear += o.sold; }
      }
      s = finishReveal(s); continue;
    }
    s = aiStep(s)!;
  }
}
console.log(`\n### Price ties: ${n} stalls, ${level} AI, ${G} games\n`);
console.log(`Customer lines with a seller: ${lines} (${r1(lines / G)} per game). Two or more stalls offered: ${r1((100 * contested) / lines)}%. Lowest price tied: ${r1((100 * tied) / lines)}% of all lines (${r1((100 * tied) / Math.max(1, contested))}% of contested lines), ${r1(tied / G)} per game. Ties involving the Haggler: ${r1(hagTie / G)} per game (it is at the table in ${r1((100 * n) / 8)}% of seats).`);
console.log(`Pieces sold at the customer's top price: ${r1((100 * soldAtMax) / sold)}%; within $1 of it: ${r1((100 * soldNear) / sold)}%.`);
