import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { loadName, nameOrDefault, saveName } from '../src/ui/store';

describe('player name (PLAN-022)', () => {
  const data: Record<string, string> = {};
  beforeEach(() => {
    for (const k of Object.keys(data)) delete data[k];
    (globalThis as any).localStorage = { getItem: (k: string) => (k in data ? data[k] : null), setItem: (k: string, v: string) => { data[k] = v; } };
  });
  afterEach(() => { delete (globalThis as any).localStorage; });

  it('starts blank when nothing is saved', () => {
    expect(loadName()).toBe('');
  });

  it('treats the old saved fallbacks as blank', () => {
    saveName('You');
    expect(loadName()).toBe('');
    saveName('Player');
    expect(loadName()).toBe('');
  });

  it('keeps a name the player chose, and a blank stays blank', () => {
    saveName('Aisyah');
    expect(loadName()).toBe('Aisyah');
    saveName('');
    expect(loadName()).toBe('');
  });

  it('uses a fallback only when the game needs a name', () => {
    expect(nameOrDefault('')).toBe('You');
    expect(nameOrDefault('   ')).toBe('You');
    expect(nameOrDefault(' Ravi ')).toBe('Ravi');
    expect(nameOrDefault('', 'Player')).toBe('Player');
  });

  it('still works when storage is blocked', () => {
    (globalThis as any).localStorage = { getItem: () => { throw new Error('blocked'); } };
    expect(loadName()).toBe('');
  });
});
