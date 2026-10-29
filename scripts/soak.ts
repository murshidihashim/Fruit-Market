// Soak test: many computer-only games across player counts, lengths and options, looking for crashes,
// stuck turns, impossible numbers and games that do not repeat from the same seed.
// Usage: npx vite-node scripts/soak.ts [games=1500]
// It reads the rules only and never changes them.
import { autoplay } from '../src/engine/ai';
import { newGame, ranking, type GameConfig, type Level } from '../src/engine/game';
import { FRUITS } from '../src/engine/data';

const GAMES = Number(process.argv[2] ?? 1500);
const LEVELS: Level[] = ['easy', 'normal', 'hard'];
const OPTION_SETS: Partial<GameConfig>[] = [
  {},
  { marketDays: false },
  { core: true, upgrades: false },
  { street: true },
  { pulse: true },
  { unripe: false },
  { events: false },
  { upgrades: false },
  { street: true, pulse: true, marketDays: false },
];

const problems: string[] = [];
const note = (m: string) => { if (problems.length < 40) problems.push(m); };
let finished = 0, crashed = 0, stuck = 0, repeatFail = 0, negCash = 0, badStock = 0;
const wins = new Map<number, number>();
let minCash = Infinity, maxCash = -Infinity, totalDays = 0;

function config(i: number): GameConfig {
  const n = 2 + (i % 3);
  const opts = OPTION_SETS[Math.floor(i / 3) % OPTION_SETS.length];
  const days = [8, 10, 14][Math.floor(i / 27) % 3];
  return {
    players: Array.from({ length: n }, (_, k) => ({ name: `P${k}`, kind: 'ai' as const, level: LEVELS[(i + k) % 3], avatar: '' })),
    days, unripe: true, upgrades: true, events: true, seed: i + 1, ...opts,
  };
}

function check(label: string, cfg: GameConfig) {
  const s = autoplay(newGame(cfg));
  if (s.phase !== 'over') { stuck++; note(`${label}: ended in ${s.phase} on day ${s.day}`); return null; }
  finished++;
  totalDays += s.day;
  for (const [pi, p] of s.players.entries()) {
    if (!Number.isFinite(p.cash)) { badStock++; note(`${label}: player ${pi} cash is ${p.cash}`); continue; }
    if (p.cash < 0) { negCash++; note(`${label}: player ${pi} ended with $${p.cash}`); }
    minCash = Math.min(minCash, p.cash); maxCash = Math.max(maxCash, p.cash);
    for (const f of FRUITS) for (const n of p.stock[f]) if (!Number.isInteger(n) || n < 0) { badStock++; note(`${label}: player ${pi} has ${n} ${f}`); }
    const held = FRUITS.reduce((a, f) => a + p.stock[f].reduce((x, y) => x + y, 0), 0);
    if (held > 12) { badStock++; note(`${label}: player ${pi} holds ${held} pieces (limit 12)`); }
  }
  for (const f of FRUITS) for (const n of s.market[f]) if (!Number.isInteger(n) || n < 0) { badStock++; note(`${label}: market has ${n} ${f}`); }
  const w = ranking(s)[0];
  wins.set(w, (wins.get(w) ?? 0) + 1);
  return s;
}

for (let i = 0; i < GAMES; i++) {
  const cfg = config(i);
  const label = `game ${i + 1} (${cfg.players.length}p ${cfg.days}d seed ${cfg.seed} ${JSON.stringify(OPTION_SETS[Math.floor(i / 3) % OPTION_SETS.length])})`;
  try {
    const a = check(label, cfg);
    if (a && i % 10 === 0) {
      const b = autoplay(newGame(cfg));
      if (JSON.stringify(a.players.map((p) => p.cash)) !== JSON.stringify(b.players.map((p) => p.cash))) { repeatFail++; note(`${label}: same seed gave different results`); }
    }
  } catch (e) {
    crashed++;
    note(`${label}: crashed: ${String(e).split('\n')[0]}`);
  }
}

console.log(`SOAK: ${GAMES} games`);
console.log(`finished ${finished}, stuck ${stuck}, crashed ${crashed}, repeat mismatches ${repeatFail}, negative final cash ${negCash}, bad numbers ${badStock}`);
console.log(`final cash range $${minCash} to $${maxCash}, average length ${(totalDays / Math.max(1, finished)).toFixed(1)} days`);
console.log(`seat that won, counted by seat: ${[...wins.entries()].sort((a, b) => a[0] - b[0]).map(([k, v]) => `seat ${k + 1}: ${v}`).join(', ')}`);
if (problems.length) console.log('\nFirst problems:\n' + problems.map((p) => '- ' + p).join('\n'));
