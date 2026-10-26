// Runs every browser test against fresh builds:
//   solo playthrough and the performance budget (single-file build),
//   then the online match (with a player leaving), quick match and rejoining from a background tab
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
// Timings on a shared machine are noisy, so the budget gets one retry; a second miss fails.
step('performance budget', 'node scripts/perf-budget.cjs dist-single/index.html || node scripts/perf-budget.cjs dist-single/index.html');

if (!process.env.E2E_SKIP_ONLINE) {
  run('npx vite build');
  let server = null;
  try { server = await startServer(out); } catch (e) { failures.push(e.message); }
  if (server) {
    step('online match', `node scripts/e2e-online.cjs ${server.base} ${out}`);
    step('quick match', `node scripts/e2e-quick.cjs ${server.base} ${out}`);
    // Regression test for PLAN-004: rejoining from a background tab used to stay on "Connecting…".
    step('rejoin from a background tab', `node scripts/e2e-reconnect.cjs ${server.base} ${out}`, { HIDDEN: '1', RELOADS: '3', DROPS: '2', QUICKS: '0', LIMIT_MS: '15000' });
    server.stop();
  }
}

console.log(failures.length ? `\nE2E FAILED: ${failures.join(', ')}` : '\nE2E OK');
process.exit(failures.length ? 1 : 0);
