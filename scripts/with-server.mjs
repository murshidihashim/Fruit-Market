// Starts the local room server (wrangler dev), runs one command against it, then stops the server.
// The server's output is kept in <out>/server.log as evidence when something fails.
// Usage: node scripts/with-server.mjs <command…>   (env: E2E_OUT, default e2e-output; PORT, default 8787)
// `vars` (PLAN-125): test-only settings for the server, passed to wrangler dev as --var NAME:value.
import { spawn, execSync } from 'node:child_process';
import { mkdirSync, openSync } from 'node:fs';

export async function startServer(out = process.env.E2E_OUT ?? 'e2e-output', port = process.env.PORT ?? '8787', vars = {}) {
  mkdirSync(out, { recursive: true });
  const log = openSync(`${out}/server.log`, 'a');
  const extra = Object.entries(vars).flatMap(([k, v]) => ['--var', `${k}:${v}`]);
  const server = spawn('npx', ['wrangler', 'dev', '--port', String(port), '--ip', '127.0.0.1', ...extra], { stdio: ['ignore', log, log], detached: true });
  const base = `http://127.0.0.1:${port}`;
  for (let i = 0; i < 60; i++) {
    try { if ((await fetch(base)).ok) return { base, stop: () => { try { process.kill(-server.pid, 'SIGKILL'); } catch { /* gone */ } } }; } catch { /* not yet */ }
    await new Promise((r) => setTimeout(r, 1000));
  }
  try { process.kill(-server.pid, 'SIGKILL'); } catch { /* gone */ }
  throw new Error(`local server did not start (see ${out}/server.log)`);
}

if (import.meta.url === `file://${process.argv[1]}`) {
  const cmd = process.argv.slice(2).join(' ');
  const { base, stop } = await startServer();
  let code = 0;
  try { execSync(cmd, { stdio: 'inherit', env: { ...process.env, BASE_URL: base } }); } catch (e) { code = e.status ?? 1; }
  stop();
  process.exit(code);
}
