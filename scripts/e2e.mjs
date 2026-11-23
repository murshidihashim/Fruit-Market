// Runs every browser test against fresh builds:
//   solo playthrough, the Market League's first stage, a one-phone hand-over and the performance budget (single-file build),
//   then the online match (with a player leaving), quick match, a public room with reactions (PLAN-112), four players
//   in one room and rejoining from a background tab, then (PLAN-125) Quick Match at 4 stalls filled by computers
//   against a local server
//   (its log is kept in <out>/server.log).
// Usage: npm run test:e2e        (set E2E_SKIP_ONLINE=1 to run only the offline part)
import { execSync } from 'node:child_process';
import { startServer } from './with-server.mjs';
import { mkdirSync } from 'node:fs';

const out = process.env.E2E_OUT ?? 'e2e-output';
mkdirSync(out, { recursive: true });
const run = (cmd, env = {}) => { console.log(`\n$ ${cmd}`); execSync(cmd, { stdio: 'inherit', env: { ...process.env, ...env } }); };
const failures = [];
const step = (name, cmd, env) => { try { run(cmd, env); } catch { failures.push(name); } };

run('npx vite build --mode single');
step('solo playthrough', `node scripts/smoke.cjs dist-single/index.html ${out} 3`);
// PLAN-115: the Market League's first stage played to its goal, from the League screen to stage 2. PLAN-118: then a
// one-day stage played from the step it opens at to its result, and the League road after it.
step('league stage 1 and a short stage', `node scripts/e2e-league.cjs dist-single/index.html ${out}`);
// PLAN-116 (REP-133 A-01): one phone, two people: a double tap on Done and a tap on the market across a hand-over act
// for nobody; the next person's turn waits for their "Pass the phone".
step('one phone hand-over', `node scripts/e2e-phone.cjs dist-single/index.html ${out}`);
// Timings on a shared machine are noisy, so the budget gets one retry; a second miss fails.
step('performance budget', 'node scripts/perf-budget.cjs dist-single/index.html || node scripts/perf-budget.cjs dist-single/index.html');

if (!process.env.E2E_SKIP_ONLINE) {
  run('npx vite build');
  let server = null;
  try { server = await startServer(out); } catch (e) { failures.push(e.message); }
  if (server) {
    step('online match', `node scripts/e2e-online.cjs ${server.base} ${out}`);
    step('quick match', `node scripts/e2e-quick.cjs ${server.base} ${out}`);
    // PLAN-112: a public room found in the list and joined from there; reactions both ways, in the lobby and the game.
    step('public room and reactions', `node scripts/e2e-public.cjs ${server.base} ${out}`);
    // PLAN-114: today's Market Sprint played to its results (checked by the server's replay), then Try again.
    step('market sprint', `node scripts/e2e-sprint.cjs ${server.base} ${out}`);
    step('four players in one room', `node scripts/e2e-four.cjs ${server.base} ${out}`);
    // Regression test for PLAN-004: rejoining from a background tab used to stay on "Connecting…".
    step('rejoin from a background tab', `node scripts/e2e-reconnect.cjs ${server.base} ${out}`, { HIDDEN: '1', RELOADS: '3', DROPS: '2', QUICKS: '0', LIMIT_MS: '15000' });
    server.stop();
  }
  // PLAN-125: Quick Match at 4 stalls, two people and two computers, on a second server whose quick rooms fill after
  // 12 s instead of 30 (a test-only setting on the wrangler dev command line; the other tests keep the real wait).
  let quick = null;
  const quickPort = process.env.QUICK_PORT ?? String(+(process.env.PORT ?? 8787) + 10);
  try { quick = await startServer(out, quickPort, { QUICK_FILL_MS: '12000' }); } catch (e) { failures.push(`quick server: ${e.message}`); }
  if (quick) {
    step('quick match of 4 with computers', `node scripts/e2e-quick4.cjs ${quick.base} ${out}`, { FILL_MS: '12000' });
    quick.stop();
  }
}

console.log(failures.length ? `\nE2E FAILED: ${failures.join(', ')}` : '\nE2E OK');
process.exit(failures.length ? 1 : 0);
