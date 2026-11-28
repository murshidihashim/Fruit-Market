// REP-140 A-11 (PLAN-130): `npm run records:check` warns, without failing, when a release is still "candidate" but
// its tag v<version> already exists here; with no tags (CI's shallow checkout) it says nothing.
import { describe, expect, it } from 'vitest';
import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { candidateTagWarnings, localTagExists } from '../scripts/records-tags.mjs';

const releases = [
  { version: '1.0.0', status: 'published' },
  { version: '1.1.0', status: 'candidate' },
  { version: '1.2.0', status: 'candidate' },
];

describe('records check: a candidate release whose tag exists', () => {
  it('is named, with what to do, only when its tag exists; a published release is never named', () => {
    const tags = new Set(['v1.0.0', 'v1.1.0']);
    const w = candidateTagWarnings(releases, (t) => tags.has(t));
    expect(w).toEqual(['Release 1.1.0 is still "candidate", but tag v1.1.0 exists. If it was published, mark it published (date, commit, tagged) in a new commit.']);
  });

  it('says nothing where there are no tags (a shallow checkout)', () => {
    expect(candidateTagWarnings(releases, () => false)).toEqual([]);
  });

  it('looks tags up quietly: no tag, or no git checkout at all, is simply "no"', () => {
    expect(localTagExists(process.cwd(), 'v0.0.0-no-such-tag')).toBe(false);
    const dir = mkdtempSync(join(tmpdir(), 'fm-no-git-'));
    try {
      expect(localTagExists(dir, 'v1.0.0')).toBe(false);
    } finally {
      rmSync(dir, { recursive: true, force: true });
    }
  });
});
