// Anonymous usage counters and crash lines, sent to our own server in small batches.
// No IDs, names or device details: only event names like "game_end:win" and short error messages.
// Players can switch it off in Settings ("Share anonymous stats").
import { loadSettings } from '../ui/store';
import { serverBase } from './client';

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
  const native = (window as { Capacitor?: { isNativePlatform?: () => boolean } }).Capacitor?.isNativePlatform?.();
  track('app_open', native ? 'android' : 'web');
}
