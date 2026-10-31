import { describe, expect, it } from 'vitest';
import { FREE_TRIES, handleAccount, idProblem, passwordProblem, sameText, type AccountRec } from '../server/accounts';
import { emptyProfile } from '../src/net/profile';

const NOW = 1_800_000_000_000;
const profile = { ...emptyProfile(), at: 5, achievements: ['first_win'], league: 3 };

async function signUp(id = 'mia_77', password = 'correct horse'): Promise<{ rec: AccountRec; token: string }> {
  const r = await handleAccount('signup', { id, password, profile }, null, NOW);
  expect(r.status).toBe(200);
  return { rec: r.rec as AccountRec, token: r.body.token as string };
}

describe('account rules', () => {
  it('checks IDs and passwords', () => {
    expect(idProblem('mia_77')).toBeNull();
    expect(idProblem('ab')).toMatch(/3 to 20/);
    expect(idProblem('has space')).toMatch(/letters/);
    expect(idProblem('admin')).toMatch(/not allowed/);
    expect(idProblem(5)).toBeTruthy();
    expect(passwordProblem('short')).toMatch(/at least 8/);
    expect(passwordProblem('x'.repeat(73))).toMatch(/at most 72/);
    expect(passwordProblem('long enough')).toBeNull();
  });

  it('compares text without caring where it differs', () => {
    expect(sameText('abc', 'abc')).toBe(true);
    expect(sameText('abc', 'abd')).toBe(false);
    expect(sameText('abc', 'abcd')).toBe(false);
  });
});

describe('accounts', () => {
  it('signs up, keeps the password scrambled and returns the uploaded profile', async () => {
    const { rec, token } = await signUp();
    expect(JSON.stringify(rec)).not.toContain('correct horse');
    expect(rec.hash).toMatch(/^[0-9a-f]{64}$/);
    expect(rec.sessions[0].h).not.toBe(token);
    expect(rec.profile.achievements).toEqual(['first_win']);
  });

  it('refuses a taken ID and a weak password', async () => {
    const { rec } = await signUp();
    expect((await handleAccount('signup', { id: 'MIA_77', password: 'another long one' }, rec, NOW)).status).toBe(409);
    expect((await handleAccount('signup', { id: 'new_id', password: 'short' }, null, NOW)).status).toBe(400);
  });

  it('signs in with the right password and joins what the phone already holds', async () => {
    const { rec } = await signUp();
    const phone = { ...emptyProfile(), at: 9, achievements: ['rich'], league: 1 };
    const r = await handleAccount('login', { id: 'mia_77', password: 'correct horse', profile: phone }, rec, NOW + 1000);
    expect(r.status).toBe(200);
    const p = r.body.profile as typeof profile;
    expect([...p.achievements].sort()).toEqual(['first_win', 'rich']);
    expect(p.league).toBe(3);
  });

  it('answers a wrong password and an unknown ID the same way', async () => {
    const { rec } = await signUp();
    const wrong = await handleAccount('login', { password: 'not the password' }, rec, NOW);
    const unknown = await handleAccount('login', { password: 'whatever it is' }, null, NOW);
    expect(wrong.status).toBe(401);
    expect(unknown.status).toBe(401);
    expect(wrong.body).toEqual(unknown.body);
  });

  it('locks the account for a while after too many wrong tries', async () => {
    let { rec } = await signUp();
    for (let i = 0; i < FREE_TRIES; i++) {
      const r = await handleAccount('login', { password: 'nope nope nope' }, rec, NOW);
      expect(r.status).toBe(401);
      rec = r.rec as AccountRec;
    }
    const locked = await handleAccount('login', { password: 'correct horse' }, rec, NOW + 1000);
    expect(locked.status).toBe(429);
    const later = await handleAccount('login', { password: 'correct horse' }, rec, NOW + 5 * 60_000);
    expect(later.status).toBe(200);
  });

  it('syncs only with a valid token, and joins profiles', async () => {
    const { rec, token } = await signUp();
    const mine = { ...emptyProfile(), at: 50, looks: ['hat_straw'], league: 1 };
    expect((await handleAccount('sync', { token: 'f'.repeat(64), profile: mine }, rec, NOW)).status).toBe(401);
    const r = await handleAccount('sync', { token, profile: mine }, rec, NOW + 1000);
    expect(r.status).toBe(200);
    const p = (r.body as { profile: { looks: string[]; achievements: string[] } }).profile;
    expect(p.looks).toEqual(['hat_straw']);
    expect(p.achievements).toEqual(['first_win']);
  });

  it('signs out one device and deletes an account only with the password', async () => {
    const { rec, token } = await signUp();
    const out = await handleAccount('logout', { token }, rec, NOW);
    expect(out.status).toBe(200);
    expect((await handleAccount('sync', { token, profile }, out.rec as AccountRec, NOW)).status).toBe(401);

    const again = await handleAccount('login', { password: 'correct horse' }, rec, NOW);
    const t2 = again.body.token as string;
    expect((await handleAccount('delete', { token: t2, password: 'wrong password' }, again.rec as AccountRec, NOW)).status).toBe(401);
    const gone = await handleAccount('delete', { token: t2, password: 'correct horse' }, again.rec as AccountRec, NOW);
    expect(gone.status).toBe(200);
    expect(gone.rec).toBeNull();
  });
});
