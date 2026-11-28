// PLAN-131: taps on an iPhone. Safari knows only the prefixed -webkit-user-select, and no Safari runs in the tests
// (Chromium reads both spellings as one property), so this one is read from the stylesheet as it is written. What the
// browser draws (touch-action on the − and +, the buttons at rest) is checked on the page by scripts/style-checks.cjs.
import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

const css = readFileSync('src/ui/styles.css', 'utf8');
const rule = (sel: string) => css.match(new RegExp(`(?:^|\\n)${sel} \\{([^}]*)\\}`))?.[1] ?? '';

describe('taps on an iPhone (PLAN-131)', () => {
  it('nothing on the page can be selected by a double tap or a long press, in Safari\'s spelling too', () => {
    expect(rule('body')).toContain('-webkit-user-select: none');
    expect(rule('body')).toContain('user-select: none');
    expect(rule('body')).toContain('-webkit-touch-callout: none');
  });
  it('boxes you type in stay selectable', () => {
    expect(rule('input, textarea')).toContain('-webkit-user-select: text');
  });
  it('a double tap is never a zoom, anywhere on the page', () => {
    expect(rule('\\*')).toContain('touch-action: manipulation');
  });
  it('the page listens for touches, so Safari shows a button pressed', () => {
    expect(readFileSync('src/main.tsx', 'utf8')).toMatch(/addEventListener\('touchstart'/);
  });
});
