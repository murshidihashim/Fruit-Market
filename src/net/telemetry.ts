// Anonymous usage counters and crash lines, sent to our own server in small batches.
// No IDs, names or device details: only event names like "game_end:win" and short error messages.
// Players can switch it off in Settings ("Share anonymous stats").
import { loadSettings } from '../ui/store';
import { serverBase } from './client';
import { activeBucket, dayKey, daysBetween, isoWeek } from './cohort';

const queue: string[] = [];
const errors: string[] = [];
const seenErrors = new Set<string>();
let timer: ReturnType<typeof setTimeout> | null = null;

const enabled = () => loadSettings().analytics !== false && serverBase() !== '';
const clean = (s: string) => s.toLowerCase().replace(/[^a-z0-9_.-]/g, '_').slice(0, 24);

/** Counts one event. `detail` is a short bucket such as a day number or a mode. */
export function track(name: string, detail?: string | number) {
  if (!enabled()) return;
  queue.push(detail === undefined ? clean(name) : `${clean(name)}:${clean(String(detail))}`);
  if (queue.length >= 40) flush();
  else timer ??= setTimeout(flush, 20_000);
}

/** Counts an event only once per device for `key` (e.g. one "day 3 reached" per game, even after a resume). */
export function trackOnce(key: string, name: string, detail?: string | number) {
  if (!enabled()) return;
  let sent: string[] = [];
  try { sent = JSON.parse(localStorage.getItem('fm.sent') ?? '[]') as string[]; } catch { /* start fresh */ }
  if (sent.includes(key)) return;
  sent.push(key);
  try { localStorage.setItem('fm.sent', JSON.stringify(sent.slice(-200))); } catch { /* ignore */ }
  track(name, detail);
}

/**
 * Install week once, then one "active" bucket per calendar day (d0 = install day).
 * Players from before this version have no install date, so they report as "legacy".
 */
export function trackCohort(today = dayKey()) {
  try {
    let install = localStorage.getItem('fm.install');
    if (!install) {
      const veteran = localStorage.getItem('fm.stats') !== null || localStorage.getItem('fm.save') !== null;
      install = veteran ? 'legacy' : today;
      localStorage.setItem('fm.install', install);
      if (!veteran) track('install_week', isoWeek(today));
    }
    if (localStorage.getItem('fm.lastActive') === today) return;
    localStorage.setItem('fm.lastActive', today);
    track('active', install === 'legacy' ? 'legacy' : activeBucket(daysBetween(install, today)));
  } catch { /* storage unavailable */ }
}

export function reportError(err: unknown) {
  if (!enabled()) return;
  const e = err as { message?: string; stack?: string };
  const where = (e?.stack ?? '').split('\n').find((l) => /\.(js|ts|tsx)/.test(l))?.trim() ?? '';
  const line = `${e?.message ?? String(err)} ${where}`.slice(0, 200);
  if (seenErrors.has(line) || seenErrors.size > 20) return;
  seenErrors.add(line);
  errors.push(line);
  timer ??= setTimeout(flush, 2_000);
}

export function flush() {
  if (timer) { clearTimeout(timer); timer = null; }
  if (!queue.length && !errors.length) return;
  const body = JSON.stringify({ events: queue.splice(0, 60), errors: errors.splice(0, 5) });
  if (!enabled()) return;
  const url = `${serverBase()}/api/t`;
  // text/plain keeps this a "simple" request, so no CORS preflight is needed from the Android app.
  const blob = new Blob([body], { type: 'text/plain' });
  try {
    if (typeof navigator !== 'undefined' && navigator.sendBeacon?.(url, blob)) return;
    void fetch(url, { method: 'POST', body: blob, keepalive: true }).catch(() => {});
  } catch { /* offline: drop it */ }
}

export function installTelemetry() {
  if (typeof window === 'undefined') return;
  window.addEventListener('error', (e) => reportError(e.error ?? e.message));
  window.addEventListener('unhandledrejection', (e) => reportError(e.reason));
  document.addEventListener('visibilitychange', () => { if (document.visibilityState === 'hidden') flush(); });
  window.addEventListener('pagehide', () => flush()); // closing or reloading the page
  const native = (window as { Capacitor?: { isNativePlatform?: () => boolean } }).Capacitor?.isNativePlatform?.();
  track('app_open', native ? 'android' : 'web');
  trackCohort();
}
