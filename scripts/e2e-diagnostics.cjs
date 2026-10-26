// Evidence for a failed browser test: what each player saw, their console, and the room messages
// they received (a summary of each, not the full game state). Written next to the screenshots.
const fs = require('node:fs');

/** One line per room message: type, version, status, phase and seat, enough to see what arrived when. */
function summarise(frame) {
  try {
    const m = JSON.parse(frame);
    if (m.t === 'room') return `room v${m.version} status=${m.status} you=${m.you} phase=${m.game?.phase ?? '-'} day=${m.game?.day ?? '-'} seats=${m.seats?.map((s) => `${s.connected ? 'on' : 'off'}${s.bot ? '+bot' : ''}`).join(',')}`;
    if (m.t === 'welcome') return `welcome seat=${m.seat}`;
    if (m.t === 'error') return `error${m.fatal ? ' (fatal)' : ''}: ${m.msg}`;
    return m.t;
  } catch { return '(unreadable)'; }
}

async function saveDiagnostics(players, out, label) {
  const report = [];
  for (const P of players) {
    const text = await P.page.locator('body').innerText().catch(() => '(page closed)');
    await P.page.screenshot({ path: `${out}/${label}-fail-${P.tag}.png` }).catch(() => {});
    report.push(`=== ${P.tag} sees: ${text.replace(/\s+/g, ' ').slice(0, 400)}`,
      `--- last room messages (${P.frames.length} total):`, ...P.frames.slice(-25).map(summarise),
      '--- console and page errors:', ...(P.consoleLog ?? []).slice(-30), ...(P.errors ?? []), '');
  }
  fs.writeFileSync(`${out}/${label}-fail.txt`, report.join('\n'));
  console.error(report.join('\n').slice(0, 4000));
  console.error(`Diagnostics saved: ${out}/${label}-fail.txt (+ screenshots, server.log)`);
}

module.exports = { saveDiagnostics, summarise };
