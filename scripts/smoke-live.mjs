// After a deploy: checks the game page and the room server answer, and that the server runs the
// rules version this build expects. Retries for up to a minute while the deploy spreads.
// Usage: node scripts/smoke-live.mjs <url>
import { readFileSync } from 'node:fs';

const url = (process.argv[2] ?? '').replace(/\/$/, '');
if (!url) { console.error('usage: node scripts/smoke-live.mjs <url>'); process.exit(2); }
const want = Number(/RULES_VERSION\s*=\s*(\d+)/.exec(readFileSync('src/net/protocol.ts', 'utf8'))?.[1]);

let last = '';
for (let i = 0; i < 12; i++) {
  try {
    const page = await fetch(url);
    const html = await page.text();
    const api = await fetch(`${url}/api/version`);
    const v = api.ok ? await api.json() : null;
    if (page.ok && html.includes('<div id="app"') && v?.rules === want) {
      console.log(`SMOKE OK ${url}: page loads, server on rules version ${v.rules}`);
      process.exit(0);
    }
    last = `page ${page.status}, api ${api.status}, rules ${v?.rules} (want ${want})`;
  } catch (e) { last = e.message; }
  await new Promise((r) => setTimeout(r, 5000));
}
console.error(`SMOKE FAILED ${url}: ${last}`);
process.exit(1);
