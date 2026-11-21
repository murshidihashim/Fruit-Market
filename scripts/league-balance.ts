// Market League campaign check (PLAN-115): can each stage be cleared by a sensible player, and is it not trivial?
// The person's seat is played by the computer at each level (a stand-in for a player who plays that well). Each stage
// is played on its own fixed seed, and on many other seeds to see how much the result rests on that one market.
// Run: npx vite-node scripts/league-balance.ts [seeds]
import { autoplay } from '../src/engine/ai';
import { newGame, winners, type GameState, type Level } from '../src/engine/game';
import { LEAGUE, starsEarned } from '../src/ui/campaign';
import { leagueConfig } from '../src/ui/progress';

const N = Number(process.argv[2] ?? 500);
const LEVELS: Level[] = ['easy', 'normal', 'hard'];

function play(stage: number, level: Level, seed?: number): GameState {
  const s = newGame(leagueConfig(stage, 'You', '', seed));
  s.players[0] = { ...s.players[0], kind: 'ai', level };
  return autoplay(s);
}

const pct = (a: number, b: number) => `${Math.round((100 * a) / Math.max(1, b))}%`;
for (let i = 0; i < LEAGUE.length; i++) {
  const st = LEAGUE[i];
  const out: string[] = [`Stage ${i + 1} ${st.title} (seed ${st.seed})`];
  for (const lv of LEVELS) {
    const fixed = play(i, lv);
    const won = winners(fixed).includes(0);
    const cash = fixed.players.map((p) => p.cash).join('/');
    let wins = 0;
    const stars: Record<string, number> = {};
    for (let k = 1; k <= N; k++) {
      const g = play(i, lv, 1000 + k * 7919);
      if (winners(g).includes(0)) wins++;
      for (const id of starsEarned(g, 0)) stars[id] = (stars[id] ?? 0) + 1;
    }
    const starLine = st.mastery.map((m) => `${m.id} ${pct(stars[m.id] ?? 0, N)}`).join(', ');
    out.push(`  ${lv.padEnd(6)} fixed seed: ${won ? 'cleared' : 'not cleared'} (cash ${cash}; stars ${starsEarned(fixed, 0).join(' ') || 'none'}) · ${N} seeds: clear ${pct(wins, N)} · stars ${starLine}`);
  }
  console.log(out.join('\n'));
}
