// Prints a fingerprint of N all-computer games (final cash by seat), to check that two copies of the engine play
// the same games. Used to check recommended.diff (applied to a clean copy) against the lab switches.
// npx vite-node scripts/lab/fingerprint.ts -- --n 3 --games 60 [--patch a,b]   (in the lab worktree)
// In a clean copy (no LAB object) run it without --patch.
import { autoplay } from '../../src/engine/ai';
import { CHARACTER_TRAIT } from '../../src/engine/data';
import { newGame } from '../../src/engine/game';

const arg = (k: string, d: string) => { const i = process.argv.indexOf(`--${k}`); return i >= 0 ? process.argv[i + 1] : d; };
const n = Number(arg('n', '3')), G = Number(arg('games', '40'));
if (process.argv.includes('--patch')) { const m = await import('./patches'); m.applyVariant(); }
const avatars = Object.keys(CHARACTER_TRAIT);
let sum = 0;
for (let seed = 1; seed <= G; seed++) {
  const s = autoplay(newGame({
    players: Array.from({ length: n }, (_, i) => ({ name: `P${i}`, kind: 'ai' as const, level: 'normal' as const, avatar: avatars[(seed + i * 3) % avatars.length] })),
    days: 10, unripe: true, upgrades: true, events: true, seed,
  }), 40000);
  const cash = s.players.map((p) => p.cash);
  sum += cash.reduce((a, b) => a + b, 0);
  console.log(seed, cash.join(' '), s.players.map((p) => p.upgrades.join('+') || '-').join(' '));
}
console.log('total', sum);
