// Builds the itch.io HTML5 upload (PLAN-037): release/itch/fruit-market-web.zip with index.html at the zip root,
// plus release/itch/version.txt for `butler push --userversion-file`. See docs/ITCH.md.
//   npm run build:itch
// The itch copy is offline only: solo, pass-and-play, Market League and the daily market without its
// leaderboard. It never talks to a server, so it sends no anonymous counters either. VITE_SERVER_URL is
// cleared on purpose: online rooms from an itch.io page would need invite links, CORS and a privacy check
// first (a separate plan).
// No new dependency: the zip is written with Node's own zlib (deflate) and a small CRC-32.
import { execSync } from 'node:child_process';
import { existsSync, mkdirSync, readdirSync, readFileSync, statSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { deflateRawSync } from 'node:zlib';
import { isMain, repoRoot } from './paths.mjs';

const ROOT = repoRoot(import.meta.url);
const SRC = join(ROOT, 'dist-single');
const OUT = join(ROOT, 'release', 'itch');

const CRC_TABLE = Array.from({ length: 256 }, (_, n) => {
  let c = n;
  for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
  return c >>> 0;
});
export function crc32(buf) {
  let c = 0xffffffff;
  for (const b of buf) c = CRC_TABLE[(c ^ b) & 0xff] ^ (c >>> 8);
  return (c ^ 0xffffffff) >>> 0;
}

/** A plain zip (deflate) of [name, bytes] pairs. Fixed timestamps, so the same files give the same zip. */
export function zip(files) {
  const local = [];
  const central = [];
  let offset = 0;
  const DOS_TIME = 0;
  const DOS_DATE = (1 << 5) | 1; // 1980-01-01
  for (const [name, data] of files) {
    const nameBuf = Buffer.from(name, 'utf8');
    const packed = deflateRawSync(data, { level: 9 });
    const crc = crc32(data);
    const head = Buffer.alloc(30);
    head.writeUInt32LE(0x04034b50, 0); head.writeUInt16LE(20, 4); head.writeUInt16LE(0x0800, 6); head.writeUInt16LE(8, 8);
    head.writeUInt16LE(DOS_TIME, 10); head.writeUInt16LE(DOS_DATE, 12); head.writeUInt32LE(crc, 14);
    head.writeUInt32LE(packed.length, 18); head.writeUInt32LE(data.length, 22); head.writeUInt16LE(nameBuf.length, 26); head.writeUInt16LE(0, 28);
    local.push(head, nameBuf, packed);
    const dir = Buffer.alloc(46);
    dir.writeUInt32LE(0x02014b50, 0); dir.writeUInt16LE(20, 4); dir.writeUInt16LE(20, 6); dir.writeUInt16LE(0x0800, 8); dir.writeUInt16LE(8, 10);
    dir.writeUInt16LE(DOS_TIME, 12); dir.writeUInt16LE(DOS_DATE, 14); dir.writeUInt32LE(crc, 16);
    dir.writeUInt32LE(packed.length, 20); dir.writeUInt32LE(data.length, 24); dir.writeUInt16LE(nameBuf.length, 28);
    dir.writeUInt32LE(offset, 42);
    central.push(dir, nameBuf);
    offset += head.length + nameBuf.length + packed.length;
  }
  const dirSize = central.reduce((a, b) => a + b.length, 0);
  const end = Buffer.alloc(22);
  end.writeUInt32LE(0x06054b50, 0); end.writeUInt16LE(files.length, 8); end.writeUInt16LE(files.length, 10);
  end.writeUInt32LE(dirSize, 12); end.writeUInt32LE(offset, 16);
  return Buffer.concat([...local, ...central, end]);
}

if (isMain(import.meta.url)) {
  const env = { ...process.env, VITE_SERVER_URL: '' };
  execSync('npx vite build --mode single', { cwd: ROOT, stdio: 'inherit', env });
  const html = readFileSync(join(SRC, 'index.html'), 'utf8');
  // Everything the page needs is inside index.html (scripts, styles and fonts are inlined).
  const external = [...html.matchAll(/<(?:script|link)[^>]+(?:src|href)="(?!data:|https?:|#)([^"]+)"/g)].map((m) => m[1]).filter((f) => !existsSync(join(SRC, f)));
  if (external.length) { console.error(`ITCH BUILD FAILED: index.html refers to missing files: ${external.join(', ')}`); process.exit(1); }
  const files = readdirSync(SRC).filter((f) => statSync(join(SRC, f)).isFile()).sort().map((f) => [f, readFileSync(join(SRC, f))]);
  mkdirSync(OUT, { recursive: true });
  const pkg = JSON.parse(readFileSync(join(ROOT, 'package.json'), 'utf8'));
  let commit = 'unknown';
  try { commit = execSync('git rev-parse --short HEAD', { cwd: ROOT, encoding: 'utf8' }).trim(); } catch { /* not a git checkout */ }
  const version = `${pkg.version}+${commit}`;
  writeFileSync(join(OUT, 'fruit-market-web.zip'), zip(files));
  writeFileSync(join(OUT, 'version.txt'), `${version}\n`);
  const size = statSync(join(OUT, 'fruit-market-web.zip')).size;
  console.log(`ITCH BUILD OK: release/itch/fruit-market-web.zip (${(size / 1024).toFixed(0)} KB; ${files.map(([f]) => f).join(', ')}), version ${version}, offline only`);
}
