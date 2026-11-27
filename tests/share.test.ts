// REP-140 B-18: with no share sheet the link or result is copied, and the screen says so, or says it could not copy.
import { afterEach, describe, expect, it, vi } from 'vitest';
import { LINK_COPIED, NOT_COPIED, copyText } from '../src/ui/share';

afterEach(() => vi.unstubAllGlobals());

describe('copying when there is no share sheet', () => {
  it('copies and says "Link copied"; says "Could not copy" when the clipboard refuses or is missing', async () => {
    const got: string[] = [];
    vi.stubGlobal('navigator', { clipboard: { writeText: async (t: string) => { got.push(t); } } });
    expect(await copyText('https://example.test/r/ABC')).toBe(true);
    expect(got).toEqual(['https://example.test/r/ABC']);
    vi.stubGlobal('navigator', { clipboard: { writeText: async () => { throw new Error('not allowed'); } } });
    expect(await copyText('x')).toBe(false);
    vi.stubGlobal('navigator', {});
    expect(await copyText('x')).toBe(false);
    expect([LINK_COPIED, NOT_COPIED]).toEqual(['Link copied', 'Could not copy']);
    for (const w of [LINK_COPIED, NOT_COPIED]) expect(w).not.toContain('!');
  });
});
