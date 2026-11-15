// iOS Safari keeps the drawn picture of an element painted through a CSS filter and did not repaint a crate's price tag
// when only its price changed (the owner's report, 2026-11-15). Each tag is keyed by what it shows, so a new price gives
// a new element, which Safari always draws.
import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';

const src = readFileSync('src/ui/game/panels/RushTable.tsx', 'utf8');
const css = readFileSync('src/ui/rushTable.css', 'utf8');

describe('a crate\'s price tag shows its new price on iOS', () => {
  it('every list of tags keys each tag by its price, face and marks', () => {
    const uses = src.match(/<Tag [^>]*\/>/g) ?? [];
    expect(uses.length).toBeGreaterThan(0);
    for (const u of uses) expect(u).toContain('key={tagKey(t)}');
    const key = src.match(/const tagKey = \(t: SeatTag\) => `([^`]*)`/);
    expect(key?.[1]).toContain('t.price');
    expect(key?.[1]).toContain('t.up');
    expect(key?.[1]).toContain('t.f');
  });
  it('the tag is still drawn through a filter (the reason for the key)', () => {
    expect(css).toMatch(/\.rt-tg \{[^}]*filter: drop-shadow/);
  });
});
