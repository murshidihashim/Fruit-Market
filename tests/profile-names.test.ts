import { describe, expect, it } from 'vitest';
import { autoplay } from '../src/engine/ai';
import { CUSTOMER_CARDS, EVENT_CARDS, FAVOURS, LEGACY_RIVAL_NAMES, ORDER_CARDS, RIVALS, TRAITS, UPGRADES } from '../src/engine/data';
import { newGame } from '../src/engine/game';
import { cleanProfile, emptyProfile, mergeProfiles, type Profile } from '../src/net/profile';
import { ACHIEVEMENTS, GUESTS, evaluate, progressOf, type Sets } from '../src/ui/achievements';

// PLAN-081: the trophy sets store display names such as "Uncle Benny" and "Hock Seng". The account clean-up used to
// allow no spaces, so those entries were dropped at every sync and some achievements could never complete for a
// signed-in player. Every name the game can put into a set must survive a clean-up and a merge.

/** Everything `evaluate` (src/ui/achievements.ts) can add to each set, built from the game's own lists. */
const everything = (): Sets => ({
  modes: ['online', 'daily', 'league', 'new'],
  // Special guests (a set of their own), and everyone else who can stand in the customer row: the 36 customers, the
  // other event guests and the standing orders' clients.
  guests: [...GUESTS],
  customers: [
    ...CUSTOMER_CARDS.map((c) => c.name),
    ...EVENT_CARDS.flatMap((e) => (e.extra && !GUESTS.includes(e.extra.name) ? [e.extra.name] : [])),
    ...ORDER_CARDS.map((c) => c.name),
  ],
  events: EVENT_CARDS.map((e) => e.id),
  favours: Object.keys(FAVOURS),
  // One entry for each online match: the match's seed, a whole number of up to 32 bits.
  online: ['0', '7', String(2 ** 31 - 1), String(2 ** 32 - 1)],
  wonWith: Object.keys(TRAITS),
  // Beaten shopkeepers are stored under today's names; progress saved before the renaming holds the former ones.
  beaten: [...RIVALS.map((r) => r.name), ...LEGACY_RIVAL_NAMES],
  // PLAN-086, the sets the tiers read: shopkeepers beaten as Hard computers, upgrades built and won with, standing-order
  // clients delivered in full, and the skill tiers earned in a fair game (code names).
  beatenHard: RIVALS.map((r) => r.name),
  built: Object.keys(UPGRADES),
  wonBuilt: Object.keys(UPGRADES),
  clients: ORDER_CARDS.map((c) => c.name),
  fair: ['rich', 'sole_five', 'full_price_15', 'day_70'],
});

const withSets = (progress: Sets, at = 100): Profile => ({ ...emptyProfile(), at, progress });
const sorted = (sets: Sets) => Object.fromEntries(Object.entries(sets).map(([k, v]) => [k, [...new Set(v)].sort()]));

/** One account sync as the app and the server do it: the phone cleans what it sends, the server cleans it again and
 *  joins it with its own copy, and the phone cleans the reply before saving it (src/ui/account.ts, server/accounts.ts). */
function sync(phone: Profile, server: Profile): Profile {
  return cleanProfile(mergeProfiles(server, cleanProfile(JSON.parse(JSON.stringify(cleanProfile(phone))))));
}

describe('trophy names and the account clean-up (PLAN-081)', () => {
  it('the list covers names with a space: guests, customers, rivals and order clients', () => {
    const all = everything();
    for (const n of ['Uncle Benny', 'Ah Chen', 'Pak Din']) expect(all.beaten).toContain(n);
    for (const n of ['Rara Jenab', 'Hock Seng', 'Mei Ling', 'Wei Jie', 'Hui Min', 'Jia Wen', 'Wedding Caterer', 'School Canteen']) expect(all.customers).toContain(n);
    for (const n of ['Gym Club', 'Hotel Chef']) expect(all.guests).toContain(n);
    expect(all.customers.length).toBe(36 + 2 + ORDER_CARDS.length);
  });

  it('every name the game can store survives a clean-up', () => {
    const all = everything();
    expect(sorted(cleanProfile(withSets(all)).progress)).toEqual(sorted(all));
  });

  it('every name survives a merge and a whole account sync, from either side', () => {
    const all = everything();
    const half = (odd: boolean): Sets => Object.fromEntries(Object.entries(all).map(([k, v]) => [k, v.filter((_, i) => (i % 2 === 1) === odd)]));
    const a = withSets(half(false), 100);
    const b = withSets(half(true), 200);
    expect(sorted(mergeProfiles(cleanProfile(a), cleanProfile(b)).progress)).toEqual(sorted(all));
    expect(sorted(sync(a, b).progress)).toEqual(sorted(all));
    expect(sorted(sync(b, a).progress)).toEqual(sorted(all));
    // A second sync changes nothing more.
    const once = sync(a, b);
    expect(sorted(sync(once, once).progress)).toEqual(sorted(all));
  });

  it('achievements that count names can complete after a sync', () => {
    const synced = sync(withSets(everything()), emptyProfile()).progress;
    const stats = { played: 0, totalSold: 0 };
    for (const id of ['rivals_all', 'red_carpet', 'town_36', 'event_all', 'card_sharp', 'shop_6', 'explorer']) {
      const a = ACHIEVEMENTS.find((x) => x.id === id)!;
      expect(progressOf(a, synced, stats), id).toBe(a.goal!.target);
    }
  });

  it('whatever real games put into the sets survives too', () => {
    // Whole games with the computer in every seat, counted for seat 0 as the app does after each game.
    let sets: Sets = {};
    for (let seed = 1; seed <= 16; seed++) {
      const g = autoplay(newGame({
        players: RIVALS.slice(0, 2 + (seed % 3)).map((r) => ({ name: r.name, kind: 'ai' as const, level: 'normal' as const, avatar: r.avatar })),
        days: seed % 2 ? 10 : 14, unripe: true, upgrades: true, events: true, marketDays: true, seed,
      }));
      sets = evaluate(g, 0, { online: seed % 4 === 0, have: new Set(), sets, stats: { played: seed, totalSold: 0 }, streak: 0 }).sets;
    }
    // The games really did store names with a space, and nothing outside the list above.
    const all = everything();
    expect(Object.values(sets).flat().some((n) => n.includes(' '))).toBe(true);
    for (const [k, v] of Object.entries(sets)) for (const n of v) if (k !== 'online') expect(all[k], `${k}: ${n}`).toContain(n);
    expect(sorted(cleanProfile(withSets(sets)).progress)).toEqual(sorted(sets));
    expect(sorted(sync(withSets(sets), emptyProfile()).progress)).toEqual(sorted(sets));
  });

  it('is no looser than needed: set names stay strict, and so do ids', () => {
    const p = cleanProfile({
      achievements: ['first_win', 'two words'], looks: ['hat_straw', 'bad look'], colour: 'not a colour', worn: { hat: 'bad look', 'bad slot': 'hat_straw' },
      progress: {
        'bad key': ['Rosa'],
        beaten: ['Uncle Benny', ' Rosa', 'Rosa ', 'Ah  Chen', 'Ah\tChen', 'Ah\nChen', '', ' ', '<b>Rosa</b>', 'Rosa!', 'x'.repeat(41), `${'x'.repeat(20)} ${'y'.repeat(20)}`, `${'x'.repeat(19)} ${'y'.repeat(20)}`, 7, null],
      },
    });
    expect(p.achievements).toEqual(['first_win']);
    expect(p.looks).toEqual(['hat_straw']);
    expect(p.colour).toBe('');
    expect(p.worn).toEqual({});
    expect(Object.keys(p.progress)).toEqual(['beaten']);
    // Single spaces between words only; the 40-character limit counts the spaces.
    expect(p.progress.beaten).toEqual(['Uncle Benny', `${'x'.repeat(19)} ${'y'.repeat(20)}`]);
  });

  it('keeps the list limits: 300 entries a set, 24 sets', () => {
    const many = Array.from({ length: 400 }, (_, i) => `Customer ${i}`);
    const p = cleanProfile({ progress: Object.fromEntries(Array.from({ length: 30 }, (_, i) => [`set${i}`, many])) });
    expect(Object.keys(p.progress).length).toBe(24);
    expect(p.progress.set0.length).toBe(300);
    expect(mergeProfiles(cleanProfile({ progress: { a: many.slice(0, 250) } }), cleanProfile({ progress: { a: many.slice(150) } })).progress.a.length).toBe(300);
  });
});
