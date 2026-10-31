// Optional accounts: an ID and a password, nothing else. No email, so there is no password reset.
// An account only keeps the player's profile (src/net/profile.ts) so it can follow them to another phone.
// Pure logic, so it runs in tests without Cloudflare; the Durable Object in worker.ts stores the record.
import { cleanProfile, emptyProfile, mergeProfiles, type Profile } from '../src/net/profile';
import { nameProblem } from './names';

export const ID_MIN = 3;
export const ID_MAX = 20;
export const PASSWORD_MIN = 8;
export const PASSWORD_MAX = 72;
/** Cloudflare Workers allow at most 100,000 PBKDF2 rounds. */
export const HASH_ROUNDS = 100_000;
export const MAX_SESSIONS = 8;
export const SESSION_DAYS = 180;
export const FREE_TRIES = 5;

export interface AccountRec {
  /** The ID as typed at sign-up. Accounts are found by the lower-case version. */
  id: string;
  salt: string;
  hash: string;
  rounds: number;
  created: number;
  profile: Profile;
  /** SHA-256 of each signed-in device's secret token, never the token itself. */
  sessions: { h: string; at: number }[];
  fails: number;
  lockUntil: number;
}

export type AccountAction = 'signup' | 'login' | 'sync' | 'logout' | 'delete';
/** `rec` is the record to store: undefined leaves it as it was, null deletes the account. */
export interface AccountResult { status: number; body: Record<string, unknown>; rec?: AccountRec | null }

export const accountKey = (id: string): string => id.trim().toLowerCase();

/** Why an ID isn't allowed, or null if it's fine. */
export function idProblem(raw: unknown): string | null {
  if (typeof raw !== 'string') return 'Enter an ID.';
  const id = raw.trim();
  if (id.length < ID_MIN || id.length > ID_MAX) return `An ID has ${ID_MIN} to ${ID_MAX} characters.`;
  if (!/^[A-Za-z0-9_]+$/.test(id)) return 'An ID can use letters, numbers and underscores only.';
  if (nameProblem(id)) return 'That ID is not allowed. Try another.';
  return null;
}

export function passwordProblem(raw: unknown): string | null {
  if (typeof raw !== 'string') return 'Enter a password.';
  if (raw.length < PASSWORD_MIN) return `A password needs at least ${PASSWORD_MIN} characters.`;
  if (raw.length > PASSWORD_MAX) return `A password can have at most ${PASSWORD_MAX} characters.`;
  return null;
}

const hex = (b: ArrayBuffer | Uint8Array): string => Array.from(new Uint8Array(b instanceof Uint8Array ? b : b), (x) => x.toString(16).padStart(2, '0')).join('');
const randomHex = (n: number): string => hex(crypto.getRandomValues(new Uint8Array(n)));

export async function sha256(s: string): Promise<string> {
  return hex(await crypto.subtle.digest('SHA-256', new TextEncoder().encode(s)));
}

export async function hashPassword(password: string, salt: string, rounds = HASH_ROUNDS): Promise<string> {
  const key = await crypto.subtle.importKey('raw', new TextEncoder().encode(password), 'PBKDF2', false, ['deriveBits']);
  const bits = await crypto.subtle.deriveBits({ name: 'PBKDF2', hash: 'SHA-256', salt: new TextEncoder().encode(salt), iterations: rounds }, key, 256);
  return hex(bits);
}

/** Compares without stopping at the first difference. */
export function sameText(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i++) diff |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return diff === 0;
}

const fail = (status: number, error: string): AccountResult => ({ status, body: { error } });
const BAD_LOGIN = 'Wrong ID or password.';

function lockMessage(rec: AccountRec, now: number): string | null {
  if (rec.lockUntil <= now) return null;
  const mins = Math.max(1, Math.ceil((rec.lockUntil - now) / 60_000));
  return `Too many wrong tries. Wait ${mins} minute${mins > 1 ? 's' : ''} and try again.`;
}

async function startSession(rec: AccountRec, now: number): Promise<string> {
  const token = randomHex(32);
  const live = rec.sessions.filter((s) => now - s.at < SESSION_DAYS * 86_400_000);
  rec.sessions = [...live, { h: await sha256(token), at: now }].slice(-MAX_SESSIONS);
  return token;
}

async function hasSession(rec: AccountRec, token: unknown, now: number): Promise<boolean> {
  if (typeof token !== 'string' || !/^[0-9a-f]{64}$/.test(token)) return false;
  const h = await sha256(token);
  return rec.sessions.some((s) => sameText(s.h, h) && now - s.at < SESSION_DAYS * 86_400_000);
}

/** A password check that counts wrong tries and locks the account for a while after too many. */
async function checkPassword(rec: AccountRec, password: unknown, now: number): Promise<AccountResult | null> {
  const locked = lockMessage(rec, now);
  if (locked) return { status: 429, body: { error: locked } };
  const ok = typeof password === 'string' && password.length <= PASSWORD_MAX && sameText(await hashPassword(password, rec.salt, rec.rounds), rec.hash);
  if (ok) {
    rec.fails = 0;
    return null;
  }
  rec.fails++;
  // After FREE_TRIES wrong tries the wait doubles each time: 1 minute, 2, 4 ... up to an hour.
  if (rec.fails >= FREE_TRIES) rec.lockUntil = now + Math.min(60, 2 ** (rec.fails - FREE_TRIES)) * 60_000;
  return { status: 401, body: { error: BAD_LOGIN }, rec };
}

/** Handles one request for one account. `rec` is what is stored now (null if the ID is free). */
export async function handleAccount(action: AccountAction, input: unknown, rec: AccountRec | null, now: number): Promise<AccountResult> {
  const b = (input && typeof input === 'object' ? input : {}) as Record<string, unknown>;

  if (action === 'signup') {
    const bad = idProblem(b.id) ?? passwordProblem(b.password);
    if (bad) return fail(400, bad);
    if (rec) return fail(409, 'That ID is taken. Try another.');
    const salt = randomHex(16);
    const profile = cleanProfile(b.profile);
    const next: AccountRec = {
      id: (b.id as string).trim(), salt, rounds: HASH_ROUNDS, hash: await hashPassword(b.password as string, salt), created: now,
      profile, sessions: [], fails: 0, lockUntil: 0,
    };
    const token = await startSession(next, now);
    return { status: 200, body: { id: next.id, token, profile }, rec: next };
  }

  // Every other action needs an account. An unknown ID gets the same answer as a wrong password.
  if (!rec) return fail(401, BAD_LOGIN);
  const acct: AccountRec = JSON.parse(JSON.stringify(rec));

  if (action === 'login') {
    const wrong = await checkPassword(acct, b.password, now);
    if (wrong) return wrong;
    const token = await startSession(acct, now);
    // Whatever this phone already holds is joined in, so signing in never loses progress.
    const profile = b.profile === undefined ? acct.profile : mergeProfiles(acct.profile, cleanProfile(b.profile));
    acct.profile = profile;
    return { status: 200, body: { id: acct.id, token, profile }, rec: acct };
  }

  if (!(await hasSession(acct, b.token, now))) return fail(401, 'Please sign in again.');

  if (action === 'sync') {
    acct.profile = mergeProfiles(acct.profile, cleanProfile(b.profile));
    return { status: 200, body: { profile: acct.profile }, rec: acct };
  }
  if (action === 'logout') {
    const h = await sha256(b.token as string);
    acct.sessions = acct.sessions.filter((s) => s.h !== h);
    return { status: 200, body: { ok: true }, rec: acct };
  }
  if (action === 'delete') {
    const wrong = await checkPassword(acct, b.password, now);
    if (wrong) return wrong;
    return { status: 200, body: { ok: true }, rec: null };
  }
  return fail(404, 'Unknown request.');
}

export { emptyProfile };
