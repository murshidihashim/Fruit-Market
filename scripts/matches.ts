// Reads the match records (PLAN-133, PLAN-134) and prints what real games looked like.
//   npm run matches -- <file.ndjson>                         records saved earlier, one per line
//   STATS_KEY=... npm run matches -- https://<worker> [YYYY-MM]   download a month from the server (default: this month)
//   add --save <file> to keep what was downloaded
// It only reads. Every figure is counted from the records; nothing here is replayed or guessed.
import { readFileSync, writeFileSync } from 'node:fs';
import { cleanRecord, type MatchRecord } from '../src/net/matchRecord';

type Stored = MatchRecord & { at?: number };
interface Session { pid: string; sid: string; inst: string; at?: number }

async function download(base: string, month: string, what: 'rec' | 'ses'): Promise<unknown[]> {
  const key = process.env.STATS_KEY;
  if (!key) throw new Error('Set STATS_KEY to download from the server.');
  const out: unknown[] = [];
  for (let after = 0, guard = 0; guard < 5000; guard++) {
    const r = await fetch(`${base.replace(/\/$/, '')}/api/matches?month=${month}&what=${what}&after=${after}`, { headers: { 'x-stats-key': key } });
    if (!r.ok) throw new Error(`The server answered ${r.status} for ${what}.`);
    const page = (await r.json()) as { rows: unknown[]; next: number | null };
    out.push(...page.rows);
    if (page.next === null) break;
    after = page.next;
  }
  return out;
}

const pct = (a: number, b: number) => (b ? `${Math.round((1000 * a) / b) / 10}%` : 'n/a');
const avg = (xs: number[]) => (xs.length ? Math.round((10 * xs.reduce((a, b) => a + b, 0)) / xs.length) / 10 : 0);
const median = (xs: number[]) => { if (!xs.length) return 0; const s = [...xs].sort((a, b) => a - b); return s[Math.floor(s.length / 2)]; };
const tally = <T,>(xs: T[], key: (x: T) => string): [string, number][] => { const m = new Map<string, number>(); for (const x of xs) m.set(key(x), (m.get(key(x)) ?? 0) + 1); return [...m].sort((a, b) => b[1] - a[1]); };
const show = (title: string, rows: [string, string | number][]) => { console.log(`\n${title}`); for (const [k, v] of rows) console.log(`  ${k.padEnd(34)} ${v}`); };
const day = (t?: number) => (t ? new Date(t).toISOString().slice(0, 10) : '');

export function report(recs: Stored[], sessions: Session[] = []) {
  console.log(`${recs.length} match records${sessions.length ? `, ${sessions.length} sessions` : ''}`);
  if (!recs.length) return;
  const done = recs.filter((r) => r.end.over);
  const left = recs.filter((r) => !r.end.over);
  show('Games by mode (finished / left)', tally(recs, (r) => r.mode).map(([m, n]) => [m, `${n}  (${recs.filter((r) => r.mode === m && r.end.over).length} / ${recs.filter((r) => r.mode === m && !r.end.over).length})`]));
  if (left.length) {
    show('Where games are left', tally(left, (r) => `day ${r.end.day}, ${r.end.phase}`).slice(0, 12));
    show('Rank when leaving', tally(left.filter((r) => r.end.rank), (r) => `place ${r.end.rank} of ${r.cfg.seats.length}`));
  }

  // every sale line of every day played
  let lines = 0, contested = 0, sold = 0, nearTop = 0, want = 0;
  for (const r of recs) for (const d of r.days) for (const l of d.sales) {
    lines++; want += l.want;
    if (l.o.filter((o) => o[1] > 0).length >= 2) contested++;
    for (const [, , price, k] of l.o) { sold += k; if (price >= l.max - 1) nearTop += k; }
  }
  show('The price contest', [
    ['Orders with two or more sellers', pct(contested, lines)],
    ['Pieces sold within $1 of the top', pct(nearTop, sold)],
    ['Share of demand served', pct(sold, want)],
    ['Pieces spoiled per stall (finished)', avg(done.flatMap((r) => r.days[r.days.length - 1]?.spoiled ?? []))],
  ]);

  // who wins: people against computers, and by perk
  const seatsOf = done.flatMap((r) => { const top = Math.max(...r.end.cash); return r.cfg.seats.map((x, p) => ({ ...x, won: r.end.cash[p] === top, n: r.cfg.seats.length })); });
  show('Wins (finished games; a shared win counts for each)', [
    ['People', `${pct(seatsOf.filter((x) => x.k === 'h' && x.won).length, seatsOf.filter((x) => x.k === 'h').length)} of ${seatsOf.filter((x) => x.k === 'h').length} seats`],
    ...(['easy', 'normal', 'hard'] as const).map((lv): [string, string] => [`Computer, ${lv}`, `${pct(seatsOf.filter((x) => x.lv === lv && x.won).length, seatsOf.filter((x) => x.lv === lv).length)} of ${seatsOf.filter((x) => x.lv === lv).length} seats`]),
    ...tally(seatsOf.filter((x) => x.perk), (x) => x.perk!).map(([perk, n]): [string, string] => [`Perk ${perk}`, `${pct(seatsOf.filter((x) => x.perk === perk && x.won).length, n)} of ${n}`]),
  ]);

  // time and friction, from the trails of games played on one phone
  const steps = recs.flatMap((r) => r.trail ?? []);
  if (steps.length) {
    show('Time per move (median seconds; people only)', tally(steps, (s) => s[1].kind).map(([k, n]) => [`${k} (${n})`, Math.round(median(steps.filter((s) => s[1].kind === k).map((s) => s[2])) / 100) / 10]));
    show('Friction', [
      ['Take-backs per game', avg(recs.filter((r) => r.trail).map((r) => r.trail!.reduce((a, s) => a + s[3], 0)))],
      ['Games with a card or rule opened', pct(recs.filter((r) => r.opens?.length).length, recs.filter((r) => r.trail).length)],
    ]);
    const opens = recs.flatMap((r) => r.opens ?? []);
    if (opens.length) show('Opened most', tally(opens, (o) => o[1]).slice(0, 10));
  }
  const devs = recs.filter((r) => r.dev).map((r) => r.dev!);
  if (devs.length) {
    show('Devices', tally(devs, (d) => `${d.form}, ${d.os}`));
    show('App versions', tally(devs, (d) => d.app).slice(0, 6));
    show('Long pauses in a game', tally(devs.filter((d) => d.slow !== undefined), (d) => ['none', '1 to 5', '6 to 20', 'over 20'][d.slow!]));
  }

  // part 2: players who said yes to a player number
  const linked = recs.filter((r) => r.who);
  if (linked.length) {
    const byPid = new Map<string, Stored[]>();
    for (const r of linked) byPid.set(r.who!.pid, [...(byPid.get(r.who!.pid) ?? []), r]);
    const players = [...byPid.values()];
    const daysOf = (rs: Stored[]) => new Set(rs.map((r) => day(r.at))).size;
    show('Players with a player number', [
      ['Players', players.length],
      ['Games per player (average)', avg(players.map((p) => p.length))],
      ['Players who played on 2 or more days', pct(players.filter((p) => daysOf(p) >= 2).length, players.length)],
      ['Games per session (average)', avg([...new Set(linked.map((r) => r.who!.sid))].map((sid) => linked.filter((r) => r.who!.sid === sid).length))],
      ['Sessions (app starts)', sessions.length || 'not downloaded'],
    ]);
    const first = players.map((p) => [...p].sort((a, b) => (a.at ?? 0) - (b.at ?? 0))[0].mode);
    show('Came back on a later day, by first mode played', tally(first, (m) => m).map(([m, n]) => [m, `${pct(players.filter((p, i) => first[i] === m && daysOf(p) >= 2).length, n)} of ${n}`]));
    show('Level reached', tally(linked.filter((r) => r.who!.lvl !== undefined), (r) => `level ${r.who!.lvl}`).slice(0, 8));
    show('Test bucket', tally(players, (p) => p[0].who!.ab));
  }
}

async function main() {
  const args = process.argv.slice(2);
  const save = args.includes('--save') ? args[args.indexOf('--save') + 1] : null;
  const src = args.find((a) => !a.startsWith('--') && a !== save);
  if (!src) { console.log('Usage: npm run matches -- <file.ndjson | https://server> [YYYY-MM] [--save file]'); return; }
  let raw: unknown[], sessions: Session[] = [];
  if (/^https?:/.test(src)) {
    const month = args.find((a) => /^\d{4}-\d{2}$/.test(a)) ?? new Date().toISOString().slice(0, 7);
    raw = await download(src, month, 'rec');
    sessions = (await download(src, month, 'ses')) as Session[];
    if (save) writeFileSync(save, raw.map((r) => JSON.stringify(r)).join('\n') + '\n');
  } else raw = readFileSync(src, 'utf8').split('\n').filter(Boolean).map((l) => JSON.parse(l) as unknown);
  // each stored record is checked again on the way in: a line that is not a record is skipped, not trusted
  const recs: Stored[] = [];
  for (const r of raw) { try { recs.push({ ...cleanRecord(r), at: (r as { at?: number }).at }); } catch { /* skipped */ } }
  if (recs.length !== raw.length) console.log(`(${raw.length - recs.length} lines were not records and were skipped)`);
  report(recs, sessions);
}

// run as a command (vite-node leaves only the arguments in argv); a test that imports `report` does not run it
if (!process.env.VITEST) void main();
