import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

describe('privacy policy page', () => {
  it('is served by the game and matches the copy in docs', () => {
    const served = readFileSync('public/privacy.html', 'utf8');
    expect(served).toBe(readFileSync('docs/privacy.html', 'utf8'));
    expect(served).toContain('Accounts (optional)');
  });
});
