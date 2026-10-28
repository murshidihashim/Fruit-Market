// Regression tests for the Windows path bug in scripts/records.mjs (PLAN-037).
import { describe, expect, it } from 'vitest';
import { execFileSync } from 'node:child_process';
import { cpSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, resolve, sep } from 'node:path';
import { pathToFileURL } from 'node:url';
import { isMain, lf, repoRoot } from '../scripts/paths.mjs';

const WIN_URL = 'file:///C:/Users/Mur%20shidi/Fruit%20Market/scripts/records.mjs';

describe('script paths on any platform (PLAN-037)', () => {
  it('the old URL pathname was not a usable Windows path (the bug)', () => {
    expect(new URL('..', WIN_URL).pathname).toBe('/C:/Users/Mur%20shidi/Fruit%20Market/');
  });

  it('repoRoot gives a native Windows path with the drive letter and spaces', () => {
    expect(repoRoot(WIN_URL, { windows: true })).toBe('C:\\Users\\Mur shidi\\Fruit Market\\');
  });

  it('repoRoot gives a POSIX path on Linux and macOS', () => {
    expect(repoRoot('file:///home/me/Fruit%20Market/scripts/records.mjs', { windows: false })).toBe('/home/me/Fruit Market/');
  });

  it('isMain matches the started script, relative or absolute', () => {
    const file = resolve('scripts/records.mjs');
    const url = pathToFileURL(file).href;
    expect(isMain(url, file)).toBe(true);
    expect(isMain(url, 'scripts/records.mjs')).toBe(true);
    expect(isMain(url, resolve('scripts/palette.mjs'))).toBe(false);
    expect(isMain(url, undefined)).toBe(false);
  });

  it('lf turns CRLF checkouts into LF text', () => {
    expect(lf('a\r\nb\r\n')).toBe('a\nb\n');
  });

  it('records runs from a folder with spaces and accepts a CRLF checkout', () => {
    // A copy of the records in a temporary folder whose name has a space, like "C:\\Users\\Mur shidi\\...".
    const dir = mkdtempSync(join(tmpdir(), 'fm records '));
    try {
      for (const f of ['scripts/records.mjs', 'scripts/paths.mjs', 'docs/workflow/records', 'docs/workflow/reports', 'docs/workflow/STATE.md']) {
        cpSync(resolve(f), join(dir, f), { recursive: true, filter: (src) => !src.includes(`${sep}img`) });
      }
      const run = (...args: string[]) => execFileSync(process.execPath, [join(dir, 'scripts/records.mjs'), ...args], { cwd: tmpdir(), encoding: 'utf8', env: { ...process.env, RECORDS_BASE: 'no-such-commit' } });
      run('--no-pdf');
      // What Git for Windows does with core.autocrlf=true: every generated view gets CRLF line endings.
      for (const f of ['docs/workflow/DECISIONS.md', 'CHANGELOG.md', 'docs/workflow/STATE.md']) {
        const p = join(dir, f);
        writeFileSync(p, readFileSync(p, 'utf8').replace(/\n/g, '\r\n'));
      }
      expect(run('--check')).toMatch(/^RECORDS OK/);
    } finally {
      rmSync(dir, { recursive: true, force: true });
    }
  });
});
