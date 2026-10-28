// Starts the local room server (wrangler dev), runs one command against it, then stops the server.
// The server's output is kept in <out>/server.log as evidence when something fails.
// Usage: node scripts/with-server.mjs <command…>   (env: E2E_OUT, default e2e-output; PORT, default 8787)
// In the command, @BASE_URL@ and @E2E_OUT@ are replaced by the server address and output folder, so the
// same npm script works in cmd.exe and PowerShell as well as sh (PLAN-037). BASE_URL is also set in the env.
import { spawn, execSync } from 'node:child_process';
import { mkdirSync, openSync } from 'node:fs';
import { isMain } from './paths.mjs';

const WIN = process.platform === 'win32';

/** Stops the server and everything it started (wrangler runs workerd as a child process). */
function killTree(pid) {
  try {
    if (WIN) execSync(`taskkill /pid ${pid} /T /F`, { stdio: 'ignore' });
    else process.kill(-pid, 'SIGKILL');
  } catch { /* already gone */ }
}

export async function startServer(out = process.env.E2E_OUT ?? 'e2e-output', port = process.env.PORT ?? '8787') {
  mkdirSync(out, { recursive: true });
  const log = openSync(`${out}/server.log`, 'a');
  // On Windows npx is a .cmd file, which needs a shell; a process group (detached) is how POSIX kills the tree.
  const server = spawn('npx', ['wrangler', 'dev', '--port', port, '--ip', '127.0.0.1'], { stdio: ['ignore', log, log], detached: !WIN, shell: WIN });
  const base = `http://127.0.0.1:${port}`;
  for (let i = 0; i < 60; i++) {
    try { if ((await fetch(base)).ok) return { base, stop: () => killTree(server.pid) }; } catch { /* not yet */ }
    await new Promise((r) => setTimeout(r, 1000));
  }
  killTree(server.pid);
  throw new Error(`local server did not start (see ${out}/server.log)`);
}

if (isMain(import.meta.url)) {
  const out = process.env.E2E_OUT ?? 'e2e-output';
  const { base, stop } = await startServer(out);
  const cmd = process.argv.slice(2).join(' ').replaceAll('@BASE_URL@', base).replaceAll('@E2E_OUT@', out);
  let code = 0;
  try { execSync(cmd, { stdio: 'inherit', env: { ...process.env, BASE_URL: base } }); } catch (e) { code = e.status ?? 1; }
  stop();
  process.exit(code);
}
