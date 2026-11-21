// PLAN-114: a balance report for the Market Sprint. Plays the Sprints of many days (each date's own seed, the real
// set-up from sprintConfig) with a computer in the person's seat, and prints how often each seat wins and the spread of
// final cash. Also times the computer-only games.
// Run: npx vite-node scripts/sprint-balance.ts [days=1000] [level of the person's seat: easy | normal | hard]
import { aiStep } from '../src/engine/ai';
import { sprintConfig } from '../src/engine/daily';
import { beginBuying, finishReveal, newGame, winners, type GameState, type Level } from '../src/engine/game';

const N = Number(process.argv[2] ?? 1000);
const LEVEL = (process.argv[3] ?? 'normal') as Level;
const start = Date.UTC(2026, 10, 23);

function play(date: string): { s: GameState; ms: number } {
  const t0 = performance.now();
  let s = newGame(sprintConfig(date, 'Person'));
  s = { ...s, players: s.players.map((p) => (p.kind === 'human' ? { ...p, kind: 'ai' as const, level: LEVEL } : p)) };
  // The person's seat picks its perk like a computer: the first of its offer.
  for (let i = 0; i < 20000 && s.phase !== 'over'; i++) {
    if (s.phase === 'morning') { s = beginBuying(s); continue; }
    if (s.phase === 'reveal') { s = finishReveal(s); continue; }
    const next = aiStep(s);
    if (!next) throw new Error(`stuck in ${s.phase} on ${date}`);
    s = next;
  }
  return { s, ms: performance.now() - t0 };
}

const q = (xs: number[], p: number) => { const a = [...xs].sort((x, y) => x - y); return a[Math.min(a.length - 1, Math.floor(p * a.length))]; };
const mean = (xs: number[]) => xs.reduce((a, b) => a + b, 0) / xs.length;

const wins = [0, 0, 0, 0];
const cash: number[][] = [[], [], [], []];
const spread: number[] = [];
const times: number[] = [];
let names: string[] = [];
for (let d = 0; d < N; d++) {
  const date = new Date(start + d * 86_400_000).toISOString().slice(0, 10);
  const { s, ms } = play(date);
  names = s.players.map((p) => `${p.name} (${p.level ?? 'normal'})`);
  const w = winners(s);
  for (const i of w) wins[i] += 1 / w.length; // a shared win is split
  s.players.forEach((p, i) => cash[i].push(p.cash));
  const all = s.players.map((p) => p.cash);
  spread.push(Math.max(...all) - Math.min(...all));
  times.push(ms);
}

console.log(`Market Sprint balance: ${N} days (${N} seeds), the person's seat played by a ${LEVEL} computer`);
console.log('seat | win share | mean cash | p10 | median | p90 | min | max');
names.forEach((n, i) => {
  const c = cash[i];
  console.log(`${i} ${n.padEnd(22)} | ${(100 * wins[i] / N).toFixed(1).padStart(5)}% | ${mean(c).toFixed(1).padStart(5)} | ${q(c, 0.1)} | ${q(c, 0.5)} | ${q(c, 0.9)} | ${Math.min(...c)} | ${Math.max(...c)}`);
});
console.log(`spread (top cash minus bottom cash in a game): mean ${mean(spread).toFixed(1)}, median ${q(spread, 0.5)}, p90 ${q(spread, 0.9)}, max ${Math.max(...spread)}`);
console.log(`computer-only run time per Sprint (engine only, no screen): mean ${mean(times).toFixed(1)} ms, p90 ${q(times, 0.9).toFixed(1)} ms`);
