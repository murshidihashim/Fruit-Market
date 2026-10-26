// Anonymous retention buckets and the install/active bookkeeping behind them.
import { beforeEach, describe, expect, it } from 'vitest';
import { activeBucket, daysBetween, isoWeek } from '../src/net/cohort';
import { trackCohort } from '../src/net/telemetry';

const mem = new Map<string, string>();
beforeEach(() => {
  mem.clear();
  (globalThis as { localStorage?: unknown }).localStorage = {
    getItem: (k: string) => mem.get(k) ?? null, setItem: (k: string, v: string) => mem.set(k, v), removeItem: (k: string) => mem.delete(k),
  };
});

describe('cohort helpers', () => {
  it('buckets days since install', () => {
    expect([0, 1, 7, 8, 14, 15, 30, 31, 400].map(activeBucket)).toEqual(['d0', 'd1', 'd7', 'd14', 'd14', 'd30', 'd30', 'd30plus', 'd30plus']);
    expect(daysBetween('2026-10-26', '2026-11-02')).toBe(7);
    expect(daysBetween('2026-03-28', '2026-03-30')).toBe(2); // across a clock change
  });

  it('computes ISO weeks', () => {
    expect(isoWeek('2026-10-26')).toBe('2026-w44');
    expect(isoWeek('2026-01-01')).toBe('2026-w01');
    expect(isoWeek('2027-01-01')).toBe('2026-w53');
    expect(isoWeek('2024-12-30')).toBe('2025-w01');
  });

  it('records the install date once and marks each active day once', () => {
    trackCohort('2026-10-26');
    expect(mem.get('fm.install')).toBe('2026-10-26');
    expect(mem.get('fm.lastActive')).toBe('2026-10-26');
    trackCohort('2026-10-27');
    expect(mem.get('fm.install')).toBe('2026-10-26');
    expect(mem.get('fm.lastActive')).toBe('2026-10-27');
  });

  it('players from before this version count as legacy, not as new installs', () => {
    mem.set('fm.stats', '{"played":3}');
    trackCohort('2026-10-26');
    expect(mem.get('fm.install')).toBe('legacy');
  });
});
