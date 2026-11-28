// Part 2 of the match records (PLAN-133): a random player number, only for a player who said yes when asked.
// It is not a name, an account or a phone's own ID: 16 random hex digits made here, kept in this phone's storage, and
// thrown away by "Forget my data". With it the server can tell that two games were played on the same install, which
// is what return, sessions and progression need. Without a yes nothing here is ever sent.
import { leagueStage, loadLooks, myPlace } from '../ui/progress';
import { serverBase } from './client';
import type { Device, PlayerTag } from './matchRecord';

declare const __APP_VERSION__: string;

const K = { consent: 'fm.link', pid: 'fm.pid', install: 'fm.install' };
const get = (k: string): string | null => { try { return localStorage.getItem(k); } catch { return null; } };
const set = (k: string, v: string | null) => { try { if (v === null) localStorage.removeItem(k); else localStorage.setItem(k, v); } catch { /* storage unavailable: nothing is linked */ } };

/** 16 random hex digits. */
export function randomHex(bytes = 8): string {
  const b = new Uint8Array(bytes);
  if (typeof crypto !== 'undefined' && crypto.getRandomValues) crypto.getRandomValues(b);
  else for (let i = 0; i < bytes; i++) b[i] = Math.floor(Math.random() * 256);
  return Array.from(b, (x) => x.toString(16).padStart(2, '0')).join('');
}

/** 'yes' or 'no' once the player has answered; null until then (nothing is linked until a yes). */
export const linkAnswer = (): 'yes' | 'no' | null => { const v = get(K.consent); return v === 'yes' || v === 'no' ? v : null; };
export const linked = (): boolean => linkAnswer() === 'yes' && !!get(K.pid);

/** The player's answer. Yes makes a new number; No (or a later switch-off) throws the number on this phone away. */
export function answerLink(yes: boolean) {
  set(K.consent, yes ? 'yes' : 'no');
  if (yes) { if (!get(K.pid)) set(K.pid, randomHex()); } else set(K.pid, null);
}

// One session per app start: its own random number, and how many games have been started in it.
const session = { id: randomHex(), games: 0 };
export const noteGameStarted = () => { session.games++; };

/** The test bucket: fixed for a player number, so a later experiment can compare 'a' with 'b'. Today nothing differs. */
const bucket = (pid: string): string => (parseInt(pid.slice(-1), 16) % 2 ? 'b' : 'a');

/** The tag a record or a session carries for a player who said yes; null otherwise. */
export function playerTag(): PlayerTag | null {
  const pid = get(K.pid);
  if (!linked() || !pid) return null;
  let lvl: number | undefined, stage: number | undefined, looks: number | undefined;
  try { lvl = myPlace().level; stage = leagueStage(); looks = loadLooks().length; } catch { /* progress unreadable: leave it out */ }
  return { pid, sid: session.id, depth: session.games, inst: get(K.install) ?? 'legacy', ab: bucket(pid), lvl, stage, looks };
}

/** What kind of device this is, coarsely: never the model. `slow`: 0 to 3, how many long pauses the game had. */
export function deviceNote(slow?: number): Device {
  const w = typeof window === 'undefined' ? 0 : Math.min(window.innerWidth, window.innerHeight);
  const ua = typeof navigator === 'undefined' ? '' : navigator.userAgent;
  const os = /android/i.test(ua) ? 'android' : /iphone|ipad|ipod/i.test(ua) ? 'ios' : /windows/i.test(ua) ? 'windows' : /mac os/i.test(ua) ? 'mac' : /linux/i.test(ua) ? 'linux' : 'other';
  const round = (n: number) => Math.round(n / 40) * 40;
  const scr = typeof window === 'undefined' ? '0x0' : `${round(window.innerWidth)}x${round(window.innerHeight)}`;
  return { form: w < 600 ? 'phone' : w < 1000 ? 'tablet' : 'desktop', os, scr, app: typeof __APP_VERSION__ === 'string' ? __APP_VERSION__ : '0.0.0', ...(slow !== undefined ? { slow } : {}) };
}

const post = (path: string, body: unknown): void => {
  const base = serverBase();
  if (!base) return;
  try {
    // text/plain keeps this a "simple" request, so no CORS preflight is needed from the Android app.
    const blob = new Blob([JSON.stringify(body)], { type: 'text/plain' });
    if (typeof navigator !== 'undefined' && navigator.sendBeacon?.(`${base}${path}`, blob)) return;
    void fetch(`${base}${path}`, { method: 'POST', body: blob, keepalive: true }).catch(() => {});
  } catch { /* offline: it is dropped */ }
};
export const postJson = post;

/** One line per app start, for a player who said yes: the session begins. */
export function sessionHello() {
  const who = playerTag();
  if (!who) return;
  post('/api/s', { pid: who.pid, sid: who.sid, inst: who.inst, ab: who.ab, dev: deviceNote(), lvl: who.lvl, stage: who.stage, looks: who.looks });
}

/** "Forget my data": asks the server to delete every record and session of this number, then throws the number away.
 *  Resolves true when the server confirmed (the number is thrown away on this phone either way). */
export async function forgetMe(): Promise<boolean> {
  const pid = get(K.pid);
  answerLink(false);
  const base = serverBase();
  if (!pid || !base) return !pid;
  try {
    const r = await fetch(`${base}/api/forget`, { method: 'POST', body: new Blob([JSON.stringify({ pid })], { type: 'text/plain' }) });
    return r.ok;
  } catch { return false; }
}
