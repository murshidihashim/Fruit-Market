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

    expect(await acct.signOut()).toBeNull();
    expect(acct.signedInAs()).toBeNull();
    expect(progress.unlocked()).toEqual([]);
    expect(progress.leagueStage()).toBe(0);

    expect(await acct.signIn('MIA_77', 'correct horse')).toBeNull();
    expect(progress.unlocked()).toEqual(['first_win', 'rich']);
    expect(progress.loadLooks()).toEqual(['hat_straw']);
    expect(progress.loadWorn()).toEqual({ hat: 'hat_straw' });
    expect(progress.leagueStage()).toBe(2);
    expect(st.loadStats().totalSold).toBe(55);
    expect(st.loadName()).toBe('Mia');
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
