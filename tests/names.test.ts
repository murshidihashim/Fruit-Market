// Name policy and rate limiting for the public online features.
import { describe, expect, it } from 'vitest';
import { nameProblem, safeName, squash } from '../server/names';
import { allowed, type Limiter } from '../server/limits';

describe('names', () => {
  it('allows ordinary names, including ones that contain blocked words by accident', () => {
    for (const n of ['Murshidi', 'Grape Lover', 'Peacock', 'Nazir', 'Hancock', 'Dickens', 'Mango Queen', 'Siti 99']) expect(nameProblem(n)).toBeNull();
  });

  it('blocks profanity, including look-alike spellings, and reserved names', () => {
    for (const n of ['shit', 'Sh1t', 'xXfuckXx', 'F.U.C.K', 'big dick', 'B1TCH']) expect(nameProblem(n)).toBe('blocked');
    for (const n of ['Admin', 'admin!', 'Foxy Rosa', 'F0xy Rosa']) expect(nameProblem(n)).toBe('reserved');
  });

  it('cleans markup and length, and falls back when needed', () => {
    expect(safeName('  <b>Bob</b>  ', 'X')).toBe('bBob/b');
    expect(safeName('a'.repeat(40), 'X')).toHaveLength(14);
    expect(safeName('', 'Player 2')).toBe('Player 2');
    expect(safeName('shit', 'Player 2')).toBe('Player 2');
    expect(squash('Ünïcödé 3')).toBe('unicodee');
  });
});

describe('rate limits', () => {
  it('asks the limiter per route and IP, and fails open if it is missing or broken', async () => {
    const keys: string[] = [];
    const lim: Limiter = { limit: async ({ key }) => { keys.push(key); return { success: keys.length <= 2 }; } };
    expect(await allowed(lim, 'daily', '1.2.3.4')).toBe(true);
    expect(await allowed(lim, 'daily', '1.2.3.4')).toBe(true);
    expect(await allowed(lim, 'daily', '1.2.3.4')).toBe(false);
    expect(keys[0]).toBe('daily:1.2.3.4');
    expect(await allowed(undefined, 'rooms', null)).toBe(true);
    expect(await allowed({ limit: async () => { throw new Error('down'); } }, 'rooms', null)).toBe(true);
  });
});
