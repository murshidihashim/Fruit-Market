import { describe, expect, it } from 'vitest';
import { handleAccount, type AccountRec } from '../server/accounts';
import { emptyProfile } from '../src/net/profile';

const NOW = 1_800_000_000_000;
const profile = { ...emptyProfile(), at: 5 };

describe('changing a password', () => {
  it('needs the current password, takes a new one, and signs the other phones out', async () => {
    const made = await handleAccount('signup', { id: 'mia_77', password: 'correct horse', profile }, null, NOW);
    const phone1 = made.body.token as string;
    const second = await handleAccount('login', { password: 'correct horse' }, made.rec as AccountRec, NOW);
    const phone2 = second.body.token as string;
    const rec = second.rec as AccountRec;

    expect((await handleAccount('password', { token: phone1, password: 'wrong guess', newPassword: 'another horse' }, rec, NOW)).status).toBe(401);
    expect((await handleAccount('password', { token: phone1, password: 'correct horse', newPassword: 'short' }, rec, NOW)).status).toBe(400);

    const changed = await handleAccount('password', { token: phone1, password: 'correct horse', newPassword: 'another horse' }, rec, NOW);
    expect(changed.status).toBe(200);
    const next = changed.rec as AccountRec;
    expect((await handleAccount('sync', { token: phone1, profile }, next, NOW)).status).toBe(200);
    expect((await handleAccount('sync', { token: phone2, profile }, next, NOW)).status).toBe(401);
    expect((await handleAccount('login', { password: 'correct horse' }, next, NOW)).status).toBe(401);
    expect((await handleAccount('login', { password: 'another horse' }, next, NOW)).status).toBe(200);
  });
});
