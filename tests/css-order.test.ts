import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';

// A CSS @import must come before every other rule, or the production build drops it. Dropping the palette import
// leaves every colour variable undefined and the whole game black (found on the staging site in 1.6.0).
describe('styles.css', () => {
  it('imports the palette before any other rule', () => {
    const css = readFileSync('src/ui/styles.css', 'utf8').replace(/\/\*[\s\S]*?\*\//g, '');
    const first = css.trim().split(/;|\{/)[0].trim();
    expect(first).toBe("@import './palette.css'");
    expect(css.indexOf('@import')).toBeLessThan(css.indexOf('@font-face'));
  });
});
