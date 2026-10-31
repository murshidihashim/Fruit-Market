import { describe, expect, it } from 'vitest';
import { cleanProfile, emptyProfile, isBlank, mergeProfiles } from '../src/net/profile';

const base = () => ({
  ...emptyProfile(), at: 100, name: 'Mia', colour: 'teal', achievements: ['first_win'], looks: ['hat_straw'], worn: { hat: 'hat_straw' }, league: 2,
  daily: { '2026-10-30': 80 }, stats: { played: 5, wins: 2, bestCash: 90, totalSold: 40 }, progress: { beaten: ['Rosa'] },
});

describe('profile', () => {
  it('joins collected things and keeps the higher records', () => {
    const a = base();
    const b = {
      ...emptyProfile(), at: 200, name: 'Mia B', achievements: ['rich'], looks: ['apron_red'], league: 1,
      daily: { '2026-10-30': 95, '2026-10-31': 60 }, stats: { played: 9, wins: 1, bestCash: 70, totalSold: 100 }, progress: { beaten: ['Benny'] },
    };
    const m = mergeProfiles(a, b);
    expect(m.achievements.sort()).toEqual(['first_win', 'rich']);
    expect(m.looks.sort()).toEqual(['apron_red', 'hat_straw']);
    expect(m.league).toBe(2);
    expect(m.daily).toEqual({ '2026-10-30': 95, '2026-10-31': 60 });
    expect(m.stats).toEqual({ played: 9, wins: 2, bestCash: 90, totalSold: 100 });
    expect(m.progress.beaten.sort()).toEqual(['Benny', 'Rosa']);
    expect(m.name).toBe('Mia B');
    expect(m.at).toBe(200);
  });

  it('is the same whichever copy comes first', () => {
    const a = base();
    const b = { ...base(), at: 300, name: 'Zed', looks: ['hat_straw', 'scarf'], worn: { hat: 'hat_straw', neck: 'scarf' } };
    const x = mergeProfiles(a, b);
    const y = mergeProfiles(b, a);
    expect({ ...x, looks: [...x.looks].sort() }).toEqual({ ...y, looks: [...y.looks].sort() });
  });

  it('lets taking something off stick, and never wears what is not owned', () => {
    const a = base();
    const b = { ...base(), at: 500, worn: {} };
    expect(mergeProfiles(a, b).worn).toEqual({});
    const c = { ...base(), at: 600, worn: { hat: 'not_owned' } };
    expect(mergeProfiles(a, c).worn).toEqual({});
  });

  it('cleans anything it is given', () => {
    const p = cleanProfile({
      name: '  <b>Mia</b>\u0000 and a much too long name  ', achievements: ['ok', 5, 'bad id!', 'ok'], league: -3,
      daily: { '2026-10-30': 12.7, x: 5 }, stats: { played: 'many', wins: 3 }, junk: 1, worn: { hat: 'h', 'bad slot': 'x' },
    });
    expect(p.name.length).toBeLessThanOrEqual(14);
    expect(p.name).not.toMatch(/[<>]/);
    expect(p.name.includes('\u0000')).toBe(false);
    expect(p.achievements).toEqual(['ok']);
    expect(p.league).toBe(0);
    expect(p.daily).toEqual({ '2026-10-30': 12 });
    expect(p.stats).toEqual({ played: 0, wins: 3, bestCash: 0, totalSold: 0 });
    expect(p.worn).toEqual({ hat: 'h' });
    expect(cleanProfile(null)).toEqual(emptyProfile());
    expect(cleanProfile('x')).toEqual(emptyProfile());
  });

  it('knows when there is nothing worth uploading', () => {
    expect(isBlank(emptyProfile())).toBe(true);
    expect(isBlank(base())).toBe(false);
  });
});
