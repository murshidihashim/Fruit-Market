// The phone's side of optional accounts (an ID and a password, no email). An account only carries the
// player's profile (src/net/profile.ts) to other phones; playing as a guest still works exactly as before.
import { CHARACTER_AVATARS } from '../engine/data';
import { serverBase } from '../net/client';
import { cleanProfile, emptyProfile, type Profile } from '../net/profile';
import { onProfileChange } from './changed';
import { clearProgress, colourId, leagueStage, loadLooks, loadSets, loadWorn, saveLeagueStage, saveLooks, saveSets, saveUnlocked, saveWorn, unlocked } from './progress';
import { loadDaily, loadName, loadStats, saveDaily, saveName, saveStats } from './store';

const SESSION_KEY = 'fm.acct';
const AT_KEY = 'fm.profile.at';
const AVATAR_KEY = 'fm.avatar';
const COLOUR_KEY = 'fm.colour';
const NET_ERROR = 'Could not reach the server. Check your connection and try again.';

interface Session { id: string; token: string }

function readSession(): Session | null {
  try {
    const s = JSON.parse(localStorage.getItem(SESSION_KEY) ?? 'null') as Partial<Session> | null;
    return s && typeof s.id === 'string' && typeof s.token === 'string' ? { id: s.id, token: s.token } : null;
  } catch { return null; }
}
function writeSession(s: Session | null) {
  try { if (s) localStorage.setItem(SESSION_KEY, JSON.stringify(s)); else localStorage.removeItem(SESSION_KEY); } catch { /* ignore */ }
}
const readAt = (): number => { try { return Number(localStorage.getItem(AT_KEY)) || 0; } catch { return 0; } };
const writeAt = (n: number) => { try { localStorage.setItem(AT_KEY, String(n)); } catch { /* ignore */ } };

/** Accounts need a game server to talk to. */
export const accountsAvailable = (): boolean => serverBase() !== '';
/** The signed-in ID, or null when playing as a guest. */
export const signedInAs = (): string | null => readSession()?.id ?? null;

/** Everything this phone holds that an account keeps. */
export function localProfile(): Profile {
  let avatar = '';
  try { avatar = localStorage.getItem(AVATAR_KEY) ?? ''; } catch { /* ignore */ }
  return cleanProfile({
    ...emptyProfile(), at: readAt(), name: loadName(), avatar, colour: colourId(), achievements: unlocked(), looks: loadLooks(), worn: loadWorn(),
    league: leagueStage(), daily: loadDaily(), stats: loadStats(), progress: loadSets(),
  });
}

let applying = false;

/** Writes a profile (from the server) onto this phone. */
export function applyProfile(p: Profile): void {
  applying = true;
  try {
    if (p.name) saveName(p.name);
    if (p.avatar && CHARACTER_AVATARS.includes(p.avatar)) { try { localStorage.setItem(AVATAR_KEY, p.avatar); } catch { /* ignore */ } }
    if (p.colour) { try { localStorage.setItem(COLOUR_KEY, JSON.stringify(p.colour)); } catch { /* ignore */ } }
    saveUnlocked(p.achievements);
    saveLooks(p.looks);
    saveWorn(p.worn);
    saveLeagueStage(p.league);
    saveDaily(p.daily);
    saveStats(p.stats);
    saveSets(p.progress);
    writeAt(p.at);
  } finally { applying = false; }
}

type Reply = { ok: true; data: Record<string, unknown> } | { ok: false; error: string; status: number };

async function call(action: string, body: Record<string, unknown>): Promise<Reply> {
  try {
    const res = await fetch(`${serverBase()}/api/account/${action}`, { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify(body) });
    const data = (await res.json().catch(() => ({}))) as Record<string, unknown>;
    if (res.ok) return { ok: true, data };
    return { ok: false, status: res.status, error: typeof data.error === 'string' ? data.error : 'Something went wrong. Try again.' };
  } catch {
    return { ok: false, status: 0, error: NET_ERROR };
  }
}

/** Saves the session and joins the account's profile with what this phone holds. Returns an error message, or null. */
async function enter(reply: Reply): Promise<string | null> {
  if (!reply.ok) return reply.error;
  writeSession({ id: String(reply.data.id), token: String(reply.data.token) });
  applyProfile(cleanProfile(reply.data.profile));
  return null;
}

export async function signUp(id: string, password: string): Promise<string | null> {
  return enter(await call('signup', { id, password, profile: localProfile() }));
}

export async function signIn(id: string, password: string): Promise<string | null> {
  return enter(await call('login', { id, password, profile: localProfile() }));
}

/** Sends this phone's profile and takes back the joined one. Returns an error message, or null. */
export async function syncNow(): Promise<string | null> {
  const s = readSession();
  if (!s) return null;
  const r = await call('sync', { id: s.id, token: s.token, profile: localProfile() });
  if (!r.ok) {
    if (r.status === 401) writeSession(null); // the sign-in expired; the phone keeps its own copy
    return r.error;
  }
  applyProfile(cleanProfile(r.data.profile));
  return null;
}

/** Saves to the account, signs out, and clears the account's things from this phone so the next player starts fresh. */
export async function signOut(): Promise<string | null> {
  const s = readSession();
  if (!s) return null;
  const err = await syncNow();
  if (err && readSession()) return `Your trophies could not be saved to your account yet, so you are still signed in. ${err}`;
  await call('logout', { id: s.id, token: s.token });
  writeSession(null);
  clearProgress();
  writeAt(0);
  return null;
}

export async function deleteAccount(password: string): Promise<string | null> {
  const s = readSession();
  if (!s) return 'You are not signed in.';
  const r = await call('delete', { id: s.id, token: s.token, password });
  if (!r.ok) return r.error;
  writeSession(null); // the things stay on this phone, as they would for a guest
  return null;
}

// ---------- keeping the account up to date ----------

let timer: ReturnType<typeof setTimeout> | undefined;

/** Called whenever something the account keeps changes. Marks the change time and, if signed in, syncs soon. */
export function noteChange(): void {
  if (applying) return;
  writeAt(Date.now());
  if (!readSession() || !accountsAvailable()) return;
  clearTimeout(timer);
  timer = setTimeout(() => { void syncNow(); }, 4000);
}

/** Starts listening for changes and brings the account up to date once. Call it when the app opens. */
export function startAccountSync(): void {
  onProfileChange(noteChange);
  if (readSession() && accountsAvailable()) void syncNow();
}
