import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { handleAccount, accountKey, type AccountAction, type AccountRec } from '../server/accounts';

// The phone's account code talks to a pretend server that runs the real account logic in-process.
const store = new Map<string, string>();
const accounts = new Map<string, AccountRec>();

beforeEach(() => {
  store.clear();
  accounts.clear();
  vi.stubGlobal('localStorage', {
    getItem: (k: string) => store.get(k) ?? null,
    setItem: (k: string, v: string) => void store.set(k, v),
    removeItem: (k: string) => void store.delete(k),
  });
  vi.stubGlobal('fetch', async (url: string, init: { body: string }) => {
    const action = url.split('/').pop() as AccountAction;
    const body = JSON.parse(init.body) as { id: string };
    const key = accountKey(body.id);
    const out = await handleAccount(action, body, accounts.get(key) ?? null, Date.now());
    if (out.rec === null) accounts.delete(key);
    else if (out.rec) accounts.set(key, out.rec);
    return { ok: out.status < 400, status: out.status, json: async () => out.body };
  });
});
afterEach(() => vi.unstubAllGlobals());

describe('account on the phone', () => {
  it('uploads what the phone holds, clears it on sign-out and brings it back on another phone', async () => {
    const acct = await import('../src/ui/account');
    const progress = await import('../src/ui/progress');
    const st = await import('../src/ui/store');
    acct.startAccountSync();

    progress.saveUnlocked(['first_win', 'rich']);
    progress.saveLooks(['hat_straw']);
    progress.saveWorn({ hat: 'hat_straw' });
    progress.saveLeagueStage(2);
    st.saveStats({ played: 4, wins: 3, bestCash: 120, totalSold: 55 });
    st.saveName('Mia');

    expect(await acct.signUp('mia_77', 'correct horse')).toBeNull();
    expect(acct.signedInAs()).toBe('mia_77');
    expect(accounts.get('mia_77')!.profile.achievements).toEqual(['first_win', 'rich']);

    st.saveDaily({ '2026-11-10': 61, '2026-11-11': 48 });
    expect(await acct.signOut()).toBeNull();
    expect(acct.signedInAs()).toBeNull();
    expect(progress.unlocked()).toEqual([]);
    expect(progress.leagueStage()).toBe(0);
    // PLAN-090: the games played and the Daily dates go too (the stamps are worked out from them), so the next
    // person on this phone starts with none of them
    expect(st.loadStats()).toEqual({ played: 0, wins: 0, bestCash: 0, totalSold: 0 });
    expect(st.loadDaily()).toEqual({});
    expect(store.has('fm.stats')).toBe(false);
    expect(store.has('fm.daily')).toBe(false);

    expect(await acct.signIn('MIA_77', 'correct horse')).toBeNull();
    expect(progress.unlocked()).toEqual(['first_win', 'rich']);
    expect(progress.loadLooks()).toEqual(['hat_straw']);
    expect(progress.loadWorn()).toEqual({ hat: 'hat_straw' });
    expect(progress.leagueStage()).toBe(2);
    expect(st.loadStats().totalSold).toBe(55);
    // ... and the account brings them back on sign-in
    expect(st.loadStats().played).toBe(4);
    expect(Object.keys(st.loadDaily()).sort()).toEqual(['2026-11-10', '2026-11-11']);
    expect(st.loadName()).toBe('Mia');
  });

  it('carries the stamp book counts to another phone, and stores what the server granted (PLAN-086)', async () => {
    const acct = await import('../src/ui/account');
    const progress = await import('../src/ui/progress');
    const looks = await import('../src/ui/looks');
    progress.saveCounts({ g10: 7, win_haggler: 3, bestDay: 58 });
    expect(await acct.signUp('mia_78', 'correct horse')).toBeNull();
    expect(accounts.get('mia_78')!.profile.counts).toEqual({ g10: 7, win_haggler: 3, bestDay: 58 });
    expect(progress.loadGranted()).toEqual([]);
    expect(await acct.signOut()).toBeNull();
    expect(progress.loadCounts()).toEqual({});
    // the server grants a look (no phone can): the next sign-in brings it, and it can be put on
    accounts.set('mia_78', { ...accounts.get('mia_78')!, grants: ['roof_stars'] });
    expect(await acct.signIn('mia_78', 'correct horse')).toBeNull();
    expect(progress.loadCounts()).toEqual({ g10: 7, win_haggler: 3, bestDay: 58 });
    expect(progress.loadGranted()).toEqual(['roof_stars']);
    expect(progress.loadLooks()).not.toContain('roof_stars');
    expect(looks.ownsLook('roof_stars')).toBe(true);
    expect(looks.toggleLook('roof_stars')).toEqual({ roof: 'roof_stars' });
    // signing out forgets the grant on this phone
    expect(await acct.signOut()).toBeNull();
    expect(progress.loadGranted()).toEqual([]);
  });

  it('keeps a granted look that is worn through every sync, and on another phone, while the grant lasts (PLAN-091)', async () => {
    const acct = await import('../src/ui/account');
    const progress = await import('../src/ui/progress');
    const looks = await import('../src/ui/looks');
    progress.saveLooks(['straw_boater']);
    expect(await acct.signUp('mia_79', 'correct horse')).toBeNull();
    accounts.set('mia_79', { ...accounts.get('mia_79')!, grants: ['roof_stars'] });
    expect(await acct.syncNow()).toBeNull();
    expect(looks.toggleLook('straw_boater')).toEqual({ hat: 'straw_boater' });
    expect(looks.toggleLook('roof_stars')).toEqual({ hat: 'straw_boater', roof: 'roof_stars' });
    // the sync used to drop it: the account's merge kept only looks the profile owns, and a grant is not one of them
    expect(await acct.syncNow()).toBeNull();
    expect(progress.loadWorn()).toEqual({ hat: 'straw_boater', roof: 'roof_stars' });
    expect(looks.worn()).toEqual({ hat: 'straw_boater', roof: 'roof_stars' });
    expect(accounts.get('mia_79')!.profile.worn).toEqual({ hat: 'straw_boater', roof: 'roof_stars' });
    // the grant is still never written into the looks the profile owns
    expect(accounts.get('mia_79')!.profile.looks).not.toContain('roof_stars');
    expect(progress.loadLooks()).not.toContain('roof_stars');
    // another phone (this one, signed out and in again) is dressed the same
    expect(await acct.signOut()).toBeNull();
    expect(progress.loadWorn()).toEqual({});
    expect(await acct.signIn('mia_79', 'correct horse')).toBeNull();
    expect(looks.worn()).toEqual({ hat: 'straw_boater', roof: 'roof_stars' });
    // a look this phone claims but the account was never granted is still dropped
    progress.saveWorn({ hat: 'straw_boater', roof: 'roof_stars', neck: 'bow_tie' });
    expect(await acct.syncNow()).toBeNull();
    expect(accounts.get('mia_79')!.profile.worn).toEqual({ hat: 'straw_boater', roof: 'roof_stars' });
    // once the grant is withdrawn, the next sync takes it off
    accounts.set('mia_79', { ...accounts.get('mia_79')!, grants: [] });
    expect(await acct.syncNow()).toBeNull();
    expect(accounts.get('mia_79')!.profile.worn).toEqual({ hat: 'straw_boater' });
    expect(looks.worn()).toEqual({ hat: 'straw_boater' });
  });

  it('joins a guest phone into the account when signing in, without losing either side', async () => {
    const acct = await import('../src/ui/account');
    const progress = await import('../src/ui/progress');
    progress.saveUnlocked(['first_win']);
    expect(await acct.signUp('lee_01', 'a long password')).toBeNull();
    expect(await acct.signOut()).toBeNull();

    progress.saveUnlocked(['no_waste']); // a different guest game on this phone
    expect(await acct.signIn('lee_01', 'a long password')).toBeNull();
    expect([...progress.unlocked()].sort()).toEqual(['first_win', 'no_waste']);
  });

  it('keeps trophy names that contain a space through sign-up, every sync and another phone (PLAN-081)', async () => {
    const acct = await import('../src/ui/account');
    const progress = await import('../src/ui/progress');
    const sets = { beaten: ['Rosa', 'Uncle Benny', 'Ah Chen'], customers: ['John', 'Rara Jenab', 'Hock Seng'], guests: ['Influencer', 'Gym Club', 'Hotel Chef'] };
    progress.saveSets(sets);
    expect(await acct.signUp('ben_08', 'a long password')).toBeNull();
    // Signing up writes the server's copy back to the phone: nothing may be missing from it.
    expect(progress.loadSets()).toEqual(sets);
    expect(accounts.get('ben_08')!.profile.progress).toEqual(sets);
    expect(await acct.syncNow()).toBeNull();
    expect(await acct.syncNow()).toBeNull();
    expect(progress.loadSets()).toEqual(sets);

    // Another phone: signed out (which clears the phone), a guest game there, then signed in again.
    expect(await acct.signOut()).toBeNull();
    expect(progress.loadSets()).toEqual({});
    progress.saveSets({ beaten: ['Pak Din'], customers: ['Mei Ling'] });
    expect(await acct.signIn('ben_08', 'a long password')).toBeNull();
    const joined = progress.loadSets();
    expect([...joined.beaten].sort()).toEqual(['Ah Chen', 'Pak Din', 'Rosa', 'Uncle Benny']);
    expect([...joined.customers].sort()).toEqual(['Hock Seng', 'John', 'Mei Ling', 'Rara Jenab']);
    expect([...joined.guests].sort()).toEqual(['Gym Club', 'Hotel Chef', 'Influencer']);
  });

  it('shows the server message for a wrong password and keeps the phone as it was', async () => {
    const acct = await import('../src/ui/account');
    const progress = await import('../src/ui/progress');
    expect(await acct.signUp('kai_99', 'a long password')).toBeNull();
    await acct.signOut();
    progress.saveUnlocked(['rich']);
    expect(await acct.signIn('kai_99', 'wrong password')).toBe('Wrong ID or password.');
    expect(acct.signedInAs()).toBeNull();
    expect(progress.unlocked()).toEqual(['rich']);
  });

  it('deletes the account but keeps what is on the phone', async () => {
    const acct = await import('../src/ui/account');
    const progress = await import('../src/ui/progress');
    progress.saveUnlocked(['rich']);
    await acct.signUp('zed_42', 'a long password');
    expect(await acct.deleteAccount('not it at all')).toBe('Wrong ID or password.');
    expect(await acct.deleteAccount('a long password')).toBeNull();
    expect(accounts.has('zed_42')).toBe(false);
    expect(acct.signedInAs()).toBeNull();
    expect(progress.unlocked()).toEqual(['rich']);
  });
});
