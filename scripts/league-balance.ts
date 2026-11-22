// Market League campaign check (PLAN-115; PLAN-118, the pilot's twelve stages and two expert stages): can each stage
// be cleared by a sensible player, and is it not trivial?
// 1. The person's seat is played by the computer at each level (a stand-in for a player who plays that well), on the
//    stage's own fixed seed and on many other seeds, to see how much the result rests on that one market. A stage that
//    opens part-way is first brought to its opening by real game actions (ai.ts openStage), as in the app.
// 2. On the fixed seed, two scripted players: a naive one (what a player who ignores the lesson does) and one who
//    plays the lesson. The second must clear the stage and the first should not: that is the stage's best play.
// Run: npx vite-node scripts/league-balance.ts [seeds] [stage numbers, e.g. 7,8]
import type { GameState, Level } from '../src/engine/game';
import { ALL_STAGES, starGoals, starsEarned, stageCleared } from '../src/ui/campaign';
import { SCRIPTS, run, start } from './league-scripts';

const N = Number(process.argv[2] ?? 500);
const ONLY = (process.argv[3] ?? '').split(',').filter(Boolean).map(Number);
const LEVELS: Level[] = ['easy', 'normal', 'hard'];

function play(stage: number, level: Level, seed?: number): GameState {
  const s = start(stage, seed);
  s.players[0] = { ...s.players[0], kind: 'ai', level };
  return run(s, {});
}

const pct = (a: number, b: number) => `${Math.round((100 * a) / Math.max(1, b))}%`;
for (let i = 0; i < ALL_STAGES.length; i++) {
  if (ONLY.length && !ONLY.includes(i + 1)) continue;
  const st = ALL_STAGES[i];
  const out: string[] = [`Stage ${i + 1} ${st.title} (seed ${st.seed})`];
  for (const lv of LEVELS) {
    const fixed = play(i, lv);
    const cash = fixed.players.map((p) => p.cash).join('/');
    let clears = 0;
    const stars: Record<string, number> = {};
    for (let k = 1; k <= N; k++) {
      const g = play(i, lv, 1000 + k * 7919);
      if (stageCleared(g, 0)) clears++;
      for (const id of starsEarned(g, 0)) stars[id] = (stars[id] ?? 0) + 1;
    }
    const starLine = starGoals(st).slice(1).map((m) => `${m.id} ${pct(stars[m.id] ?? 0, N)}`).join(', ');
    out.push(`  ${lv.padEnd(6)} fixed seed: ${stageCleared(fixed, 0) ? 'cleared' : 'not cleared'} (cash ${cash}; stars ${starsEarned(fixed, 0).join(' ') || 'none'}) · ${N} seeds: clear ${pct(clears, N)} · ${starLine}`);
  }
  const sc = SCRIPTS[i];
  if (sc) {
    for (const [what, [words, script]] of [['naive', sc.naive], ['lesson', sc.lesson]] as const) {
      const g = run(start(i), script);
      if (process.env.TRACE) for (const d of g.history ?? []) for (const l of d.lines) out.push(`      day ${d.day} ${l.name} ${l.fruit} want ${l.want} max ${l.max}: ${l.offers.map((o) => `${o.player}:${o.qty} at ${o.price} sold ${o.sold}${o.tooOld ? ' too old' : ''}`).join(', ')}`);
      out.push(`  ${what.padEnd(6)} (${words}): ${stageCleared(g, 0) ? 'cleared' : 'not cleared'} · cash ${g.players.map((p) => p.cash).join('/')} · stars ${starsEarned(g, 0).join(' ') || 'none'}`);
    }
  }
  console.log(out.join('\n'));
}
