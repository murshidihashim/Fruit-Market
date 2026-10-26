// Runs every browser test against fresh builds:
//   solo playthrough and the performance budget (single-file build),
//   then the online match (with a player leaving) and quick match against a local server.
// Usage: npm run test:e2e        (set E2E_SKIP_ONLINE=1 to run only the offline part)
import { spawn, execSync } from 'node:child_process';
import { mkdirSync } from 'node:fs';

const out = process.env.E2E_OUT ?? 'e2e-output';
mkdirSync(out, { recursive: true });
const run = (cmd) => { console.log(`\n$ ${cmd}`); execSync(cmd, { stdio: 'inherit' }); };
const failures = [];
const step = (name, cmd) => { try { run(cmd); } catch { failures.push(name); } };

run('npx vite build --mode single');
step('solo playthrough', `node scripts/smoke.cjs dist-single/index.html ${out} 3`);
// Timings on a shared machine are noisy, so the budget gets one retry; a second miss fails.
step('performance budget', 'node scripts/perf-budget.cjs dist-single/index.html || node scripts/perf-budget.cjs dist-single/index.html');

if (!process.env.E2E_SKIP_ONLINE) {
  run('npx vite build');
  const server = spawn('npx', ['wrangler', 'dev', '--port', '8787', '--ip', '127.0.0.1'], { stdio: 'ignore', detached: true });
  const base = 'http://127.0.0.1:8787';
  let up = false;
  for (let i = 0; i < 60 && !up; i++) {
    try { up = (await fetch(base)).ok; } catch { await new Promise((r) => setTimeout(r, 1000)); }
  }
  if (!up) failures.push('local server did not start');
  else {
    step('online match', `node scripts/e2e-online.cjs ${base} ${out}`);
    step('quick match', `node scripts/e2e-quick.cjs ${base} ${out}`);
  }
  try { process.kill(-server.pid, 'SIGKILL'); } catch { /* already gone */ }
}

console.log(failures.length ? `\nE2E FAILED: ${failures.join(', ')}` : '\nE2E OK');
process.exit(failures.length ? 1 : 0);
