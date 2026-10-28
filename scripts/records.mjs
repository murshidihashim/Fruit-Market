// Workflow records: one source of truth, generated views, and checks (PLAN-002).
//   node scripts/records.mjs            rebuild DECISIONS.md, CHANGELOG.md, the STATE pending block, then PDFs
//   node scripts/records.mjs --no-pdf   the same without PDFs
//   node scripts/records.mjs --check    fail if the records are invalid, history was edited, or a view is stale
//   node scripts/records.mjs --release-check   before a live deploy: is there a release entry and a free tag?
// Sources live in docs/workflow/records/*.json; reports in docs/workflow/reports/REP-###.md.
// Output depends only on the sources (no clock), so running it twice changes nothing.
import { execFileSync } from 'node:child_process';
import { existsSync, readdirSync, readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { lf, repoRoot } from './paths.mjs';

// A native path on every platform (PLAN-037: the old URL pathname broke on Windows drive letters and spaces).
const ROOT = repoRoot(import.meta.url);
const at = (f) => join(ROOT, f);
const REC = 'docs/workflow/records';
const REP = 'docs/workflow/reports';
const OUT = { register: 'docs/workflow/DECISIONS.md', changelog: 'CHANGELOG.md', state: 'docs/workflow/STATE.md' };
const APPROVAL = ['proposed', 'awaiting approval', 'approved', 'rejected', 'superseded'];
const DELIVERY = ['not started', 'in progress', 'implemented', 'verified', 'released'];
const RESULTS = ['PASS', 'FAIL', 'NOT RUN', 'NOT APPLICABLE'];
const PENDING = ['proposed', 'awaiting approval'];

// LF everywhere, so a Windows checkout with CRLF line endings compares equal to the generated views.
const read = (f) => lf(readFileSync(at(f), 'utf8'));
const json = (f) => JSON.parse(read(f));
const git = (...a) => execFileSync('git', a, { cwd: ROOT, encoding: 'utf8', stdio: ['ignore', 'pipe', 'ignore'] }).trim();

function load(base) {
  const get = (f) => {
    if (!base) return json(f);
    try { return JSON.parse(git('show', `${base}:${f}`)); } catch { return null; }
  };
  const planFiles = base
    ? (() => { try { return git('ls-tree', '--name-only', base, `${REC}/`).split('\n').map((p) => p.split('/').pop()); } catch { return []; } })()
    : readdirSync(at(REC));
  return {
    dec: get(`${REC}/decisions.json`),
    plans: planFiles.filter((f) => /^PLAN-\d{3}\.json$/.test(f)).sort().map((f) => get(`${REC}/${f}`)).filter(Boolean),
    rel: get(`${REC}/releases.json`),
  };
}

// ---------- checks ----------

function validate({ dec, plans, rel }) {
  const errs = [];
  const reports = readdirSync(at(REP)).filter((f) => /^REP-\d{3}\.md$/.test(f)).sort().map((f) => f.slice(0, 7));
  const seq = (ids, kind) => ids.forEach((id, i) => {
    const want = `${kind}-${String(i + 1).padStart(3, '0')}`;
    if (id !== want) errs.push(`${kind} IDs must run 001, 002, … without gaps or repeats: found ${id} where ${want} was expected.`);
  });
  seq(dec.decisions.map((d) => d.id), 'DEC');
  seq(plans.map((p) => p.id), 'PLAN');
  seq(reports, 'REP');
  const known = new Set([...dec.decisions.map((d) => d.id), ...plans.map((p) => p.id), ...reports]);

  const approval = (r) => {
    const a = r.approval ?? {};
    if (!APPROVAL.includes(a.status)) errs.push(`${r.id}: approval status "${a.status}" must be one of: ${APPROVAL.join(', ')}.`);
    if (['approved', 'rejected'].includes(a.status) && !(a.evidence && /^\d{4}-\d{2}-\d{2}$/.test(a.date ?? ''))) {
      errs.push(`${r.id} is "${a.status}" but has no owner evidence (their exact words) and date.`);
    }
    if (a.status === 'superseded' && !known.has(r.supersededBy)) errs.push(`${r.id} is superseded but supersededBy "${r.supersededBy}" doesn't exist.`);
    if (!DELIVERY.includes(r.delivery)) errs.push(`${r.id}: delivery "${r.delivery}" must be one of: ${DELIVERY.join(', ')}.`);
    for (const x of [...(r.reports ?? []), ...(r.decisions ?? []), ...(r.plan ? [r.plan] : [])]) {
      if (!known.has(x)) errs.push(`${r.id} refers to ${x}, which doesn't exist.`);
    }
  };
  dec.decisions.forEach(approval);
  plans.forEach((p) => {
    approval(p);
    (p.acceptance ?? []).forEach((a) => { if (!RESULTS.includes(a.result)) errs.push(`${p.id} ${a.id}: result "${a.result}" must be ${RESULTS.join(' / ')}.`); });
  });
  for (const r of reports) {
    const md = read(`${REP}/${r}.md`);
    if (!md.startsWith(`# ${r} `)) errs.push(`${r}.md must start with "# ${r} ".`);
    for (const ref of new Set(md.match(/\b(?:DEC|PLAN|REP)-\d{3}\b/g) ?? [])) {
      if (!known.has(ref)) errs.push(`${r}.md mentions ${ref}, which doesn't exist in the records.`);
    }
  }
  dec.history.forEach((h, i) => {
    if (!/^\d{4}-\d{2}-\d{2} \d{2}:\d{2}$/.test(h.at ?? '')) errs.push(`History line ${i + 1} needs a time like "2026-10-26 13:15".`);
    if (i && h.at < dec.history[i - 1].at) errs.push(`History line ${i + 1} (${h.at}) is earlier than the line before it.`);
  });
  const versions = rel.releases.map((r) => r.version);
  if (new Set(versions).size !== versions.length) errs.push('Each release version may appear only once.');
  rel.releases.forEach((r) => { if (!['candidate', 'published'].includes(r.status)) errs.push(`Release ${r.version}: status must be candidate or published.`); });
  return errs;
}

/** History only grows, and recorded approvals never change (corrections go in as new history lines). */
function appendOnly(cur, base) {
  const errs = [];
  if (!base.dec) return errs;
  base.dec.history.forEach((h, i) => {
    const now = cur.dec.history[i];
    if (!now || now.at !== h.at || now.text !== h.text) errs.push(`History line ${i + 1} ("${h.at}") was changed or removed. Add a correction line instead.`);
  });
  const all = (s) => [...s.dec.decisions, ...s.plans];
  for (const old of all(base)) {
    const a = old.approval ?? {};
    if (!['approved', 'rejected'].includes(a.status)) continue;
    const now = all(cur).find((r) => r.id === old.id)?.approval ?? {};
    if (now.evidence !== a.evidence || now.date !== a.date) errs.push(`${old.id}: the recorded owner approval was changed. Approvals are never rewritten.`);
  }
  return errs;
}

// ---------- views ----------

const cell = (s) => String(s ?? '').replace(/\|/g, '/').replace(/\n/g, ' ');
const status = (a) => (a.status === 'approved' || a.status === 'rejected' ? `${a.status} (owner, ${a.date})` : a.status);
const cap = (s) => s.charAt(0).toUpperCase() + s.slice(1);

function register({ dec, plans }) {
  const last = dec.history[dec.history.length - 1]?.at ?? '';
  const pending = [...dec.decisions, ...plans].filter((r) => PENDING.includes(r.approval?.status));
  const L = [
    `# ${dec.game} · Decision register`, '',
    `_Generated by \`npm run records\` from \`${REC}/\`. Do not edit by hand. Last recorded change: ${last} (Asia/Kuala_Lumpur)._`, '',
    'Approval status and delivery status are separate. Only the owner\'s explicit words set "approved".', '',
    '## Pending approvals', '',
  ];
  if (!pending.length) L.push('None.', '');
  else L.push('| ID | What | Status |', '|---|---|---|', ...pending.map((r) => `| ${r.id} | ${cell(r.title)} | ${cap(r.approval.status)} |`), '');
  L.push('## Current decisions', '', '| ID | Decision | Approval | Delivery | Reports |', '|---|---|---|---|---|');
  for (const d of dec.decisions) L.push(`| ${d.id} | ${cell(d.title)} | ${cap(status(d.approval))} | ${cap(d.delivery)} | ${d.reports.join(', ')} |`);
  L.push('', '## Work packages', '', '| ID | Package | Approval | Delivery | Release |', '|---|---|---|---|---|');
  for (const p of plans) L.push(`| ${p.id} | ${cell(p.title)} | ${cap(status(p.approval))} | ${cap(p.delivery)} | ${cap(p.release)} |`);
  L.push('', '## Decision details', '');
  for (const d of dec.decisions) {
    const a = d.approval;
    L.push(`### ${d.id} · ${d.title}`, '',
      `- **Question:** ${d.question}`,
      `- **Choice:** ${d.choice}`,
      `- **Rationale:** ${d.rationale}`,
      `- **Player impact:** ${d.impact.player}`,
      `- **Technical impact:** ${d.impact.technical}`,
      `- **Data and security:** ${d.impact.data}`,
      `- **Cost:** ${d.cost}`,
      `- **Owner:** ${d.owner}`,
      `- **Approval:** ${cap(a.status)}${a.evidence ? `: “${a.evidence}” (${a.date})` : ''}`,
      `- **Delivery:** ${cap(d.delivery)}${d.plan ? ` (${d.plan})` : ''}`,
      `- **Review trigger:** ${d.reviewTrigger}`,
      ...(d.supersededBy ? [`- **Superseded by:** ${d.supersededBy}`] : []),
      ...(d.supersedes ? [`- **Supersedes:** ${d.supersedes}`] : []),
      `- **Reports:** ${d.reports.join(', ')}`, '');
  }
  L.push('## History (oldest first)', '', ...dec.history.map((h) => `- ${h.at} · ${h.text}`), '');
  return L.join('\n');
}

function changelog({ plans, rel }) {
  const L = ['# Changelog', '', '_What changed for players. Generated by `npm run records` from `docs/workflow/records/`. Do not edit by hand._', ''];
  const open = plans.filter((p) => p.release === 'unreleased' && p.delivery !== 'not started');
  const notes = open.flatMap((p) => p.playerNotes ?? []);
  const releases = [...rel.releases].reverse();
  const live = rel.releases.filter((r) => r.status === 'published').pop();
  L.push(`## Unreleased (preview only, not on the live game)`, '');
  L.push(...(notes.length ? notes.map((n) => `- ${n}`) : [`- No player-facing changes since ${live?.version ?? 'the first release'}.`]));
  if (open.length) L.push(`- Behind the scenes: ${open.map((p) => `${p.id} (${p.title.split(':')[0]})`).join('; ')}.`);
  L.push('');
  for (const r of releases) {
    L.push(r.status === 'published'
      ? `## ${r.version} · published ${r.date} (\`${r.commit}\`${r.tagged ? `, tag v${r.version}` : ''})`
      : `## ${r.version} · release candidate (not yet published)`, '');
    if (r.source) L.push(`_${r.source}_`, '');
    L.push(...r.notes.map((n) => `- ${n}`), ...(r.plans?.length ? [`- Includes: ${r.plans.join(', ')}.`] : []), '');
  }
  return L.join('\n');
}

const MARK = ['<!-- records:pending:start (generated by npm run records) -->', '<!-- records:pending:end -->'];
function stateBlock({ dec, plans }, current) {
  const pending = [...dec.decisions, ...plans].filter((r) => PENDING.includes(r.approval?.status));
  const body = ['## Pending approvals (generated)', '',
    ...(pending.length ? pending.map((r) => `- ${r.id}: ${r.title} (${r.approval.status})`) : ['- None.'])].join('\n');
  const block = `${MARK[0]}\n${body}\n${MARK[1]}`;
  const re = new RegExp(`${MARK[0].replace(/[()]/g, '\\$&')}[\\s\\S]*?${MARK[1]}`);
  return re.test(current) ? current.replace(re, block) : `${current.trimEnd()}\n\n${block}\n`;
}

function views(s) {
  return {
    [OUT.register]: register(s),
    [OUT.changelog]: changelog(s),
    [OUT.state]: stateBlock(s, existsSync(at(OUT.state)) ? read(OUT.state) : ''),
  };
}

// ---------- commands ----------

const fail = (title, errs) => { console.error(`${title}\n${errs.map((e) => `  - ${e}`).join('\n')}`); process.exit(1); };
const args = process.argv.slice(2);
const cur = load(null);
const errs = validate(cur);
if (errs.length) fail('RECORDS INVALID:', errs);

if (args.includes('--check')) {
  const base = process.env.RECORDS_BASE || 'HEAD';
  let baseOk = true;
  try { git('rev-parse', '--verify', `${base}^{commit}`); } catch { baseOk = false; }
  const problems = baseOk ? appendOnly(cur, load(base)) : [];
  for (const [file, text] of Object.entries(views(cur))) {
    if (!existsSync(at(file)) || read(file) !== text) problems.push(`${file} is out of date. Run: npm run records`);
  }
  if (problems.length) fail('RECORDS CHECK FAILED:', problems);
  console.log(`RECORDS OK: ${cur.dec.decisions.length} decisions, ${cur.plans.length} packages, ${cur.rel.releases.length} releases${baseOk ? `; history checked against ${base}` : `; history not compared (${base} unavailable)`}.`);
} else if (args.includes('--release-check')) {
  const version = JSON.parse(read('package.json')).version;
  const r = cur.rel.releases.find((x) => x.version === version);
  const problems = [];
  if (!r) problems.push(`No release entry for ${version} in ${REC}/releases.json. Ask Claude to PREPARE RELEASE first.`);
  else if (r.status !== 'candidate') problems.push(`Release ${version} is already marked published. Bump the version for a new release.`);
  let tagTaken = false;
  try { tagTaken = git('ls-remote', '--tags', 'origin', `refs/tags/v${version}`) !== ''; } catch { /* offline: checked again when tagging */ }
  if (tagTaken) problems.push(`Tag v${version} already exists. Bump the version for a new release.`);
  if (problems.length) fail('RELEASE CHECK FAILED:', problems);
  console.log(`RELEASE OK: would tag v${version} at ${git('rev-parse', '--short', 'HEAD')}.\nChangelog entry:\n${r.notes.map((n) => `  - ${n}`).join('\n')}`);
} else {
  for (const [file, text] of Object.entries(views(cur))) {
    if (!existsSync(at(file)) || read(file) !== text) { writeFileSync(at(file), text); console.log('updated', file); }
  }
  if (!args.includes('--no-pdf')) {
    try { execFileSync(process.execPath, ['docs/workflow/export-pdf.cjs'], { cwd: ROOT, stdio: 'inherit' }); } catch {
      // The views above are already written; only the PDFs are missing (they need pandoc and the Playwright browser).
      console.error('The register, changelog and STATE block were updated; only the PDFs were not. To skip PDFs: npm run records -- --no-pdf');
      process.exit(1);
    }
  }
}
