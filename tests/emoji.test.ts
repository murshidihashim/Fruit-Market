import { describe, expect, it } from 'vitest';
import { readdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';

const walk = (d: string): string[] => readdirSync(d, { withFileTypes: true }).flatMap((e) => (e.isDirectory() ? walk(join(d, e.name)) : [join(d, e.name)]));

// Emoji and pictograph ranges. A few plain glyphs are allowed until PLAN-033 replaces them with pixel icons.
const GLYPHS_OK = /[✕✓➜☰▴▾−]/gu;
const EMOJI = /[\u{1F000}-\u{1FAFF}\u{2B50}\u{23F3}\u{2665}\u{2600}-\u{27BF}]/u;
const VARIATION_SELECTOR = String.fromCharCode(0xfe0f);

describe('no emoji in the interface (PLAN-027)', () => {
  it('src/ui has no emoji outside lines marked emoji-ok (avatar keys)', () => {
    const bad: string[] = [];
    for (const f of walk('src/ui').filter((x) => /\.(ts|tsx)$/.test(x))) {
      readFileSync(f, 'utf8').split(/\r?\n/).forEach((l, i) => {
        if (l.includes('emoji-ok')) return;
        if (EMOJI.test(l.replace(GLYPHS_OK, '')) || l.includes(VARIATION_SELECTOR)) bad.push(`${f}:${i + 1}`);
      });
    }
    expect(bad).toEqual([]);
  });
});
