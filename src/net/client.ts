// Browser side of online play: one WebSocket to the room, automatic reconnects,
// and a per-room seat token kept on this device so a refresh returns you to your seat.
import type { Action } from '../engine/game';
import type { ClientMsg, RoomConfig, RoomView, ServerMsg } from './protocol';

export type ConnState = 'connecting' | 'open' | 'reconnecting' | 'failed';

/** Where the room server lives: the page's own origin, or VITE_SERVER_URL (needed in the Android app). */
export function serverBase(): string {
  const env = (import.meta as { env?: Record<string, string | undefined> }).env?.VITE_SERVER_URL;
  if (env) return env.replace(/\/$/, '');
  if (typeof location !== 'undefined' && /^https?:$/.test(location.protocol) && location.hostname !== 'localhost') return location.origin;
  if (typeof location !== 'undefined' && location.port && location.port !== '80') return location.origin;
  return '';
}

export function onlineAvailable(): boolean {
  return serverBase() !== '';
}

export async function createRoom(): Promise<string> {
  const res = await fetch(`${serverBase()}/api/rooms`, { method: 'POST' });
  if (!res.ok) throw new Error('Could not create a room. Check your connection and try again.');
  const body = (await res.json()) as { code?: string };
  if (!body.code) throw new Error('Could not create a room.');
  return body.code;
}

export function inviteLink(code: string): string {
  const base = typeof location !== 'undefined' && /^https?:$/.test(location.protocol) ? `${location.origin}${location.pathname}` : `${serverBase()}/`;
  return `${base}?room=${code}`;
}

const tokenKey = (code: string) => `fm.room.${code}`;

function loadToken(code: string): string | undefined {
  try { return localStorage.getItem(tokenKey(code)) ?? undefined; } catch { return undefined; }
}
function saveToken(code: string, token: string) {
  try { localStorage.setItem(tokenKey(code), token); } catch { /* private mode: reconnect works until reload */ }
}

let uid = 0;
const actionId = () => `${Date.now().toString(36)}-${(uid++).toString(36)}-${Math.random().toString(36).slice(2, 8)}`;

export class OnlineClient {
  view: RoomView | null = null;
  conn: ConnState = 'connecting';
  error: string | null = null;
  seat: number | null = null;
  private ws: WebSocket | null = null;
  private retry = 0;
  private timer: ReturnType<typeof setTimeout> | null = null;
  private ping: ReturnType<typeof setInterval> | null = null;
  private stopped = false;
  private listeners = new Set<() => void>();
  private viewListeners = new Set<(v: RoomView) => void>();
  private errorListeners = new Set<(msg: string) => void>();
  private onVisible = () => { if (document.visibilityState === 'visible' && this.conn !== 'open' && !this.stopped) this.open(); };

  constructor(public code: string, private name: string, private avatar: string) {
    if (typeof document !== 'undefined') document.addEventListener('visibilitychange', this.onVisible);
    this.open();
  }

  subscribe(fn: () => void) { this.listeners.add(fn); return () => this.listeners.delete(fn); }
  onView(fn: (v: RoomView) => void) { this.viewListeners.add(fn); return () => this.viewListeners.delete(fn); }
  onError(fn: (msg: string) => void) { this.errorListeners.add(fn); return () => this.errorListeners.delete(fn); }
  private emit() { this.listeners.forEach((f) => f()); }

  private open() {
    if (this.timer) { clearTimeout(this.timer); this.timer = null; }
    try { this.ws?.close(); } catch { /* ignore */ }
    const url = `${serverBase().replace(/^http/, 'ws')}/ws/${this.code}`;
    const ws = new WebSocket(url);
    this.ws = ws;
    this.conn = this.view ? 'reconnecting' : 'connecting';
    this.emit();
    ws.onopen = () => {
      this.retry = 0;
      this.send({ t: 'hello', token: loadToken(this.code), name: this.name, avatar: this.avatar });
      if (this.ping) clearInterval(this.ping);
      this.ping = setInterval(() => this.send({ t: 'ping' }), 25_000);
    };
    ws.onmessage = (e) => {
      let m: ServerMsg;
      try { m = JSON.parse(String(e.data)); } catch { return; }
      if (m.t === 'welcome') {
        saveToken(this.code, m.token);
        this.seat = m.seat;
        this.conn = 'open';
        this.error = null;
      } else if (m.t === 'room') {
        if (this.view && m.version < this.view.version) return;
        this.view = m;
        this.seat = m.you;
        this.conn = 'open';
        this.viewListeners.forEach((f) => f(m));
      } else if (m.t === 'error') {
        if (m.fatal) { this.error = m.msg; this.stop(); this.conn = 'failed'; }
        this.errorListeners.forEach((f) => f(m.msg));
      }
      this.emit();
    };
    ws.onclose = () => {
      if (this.ws !== ws) return;
      if (this.ping) { clearInterval(this.ping); this.ping = null; }
      if (this.stopped) return;
      this.conn = 'reconnecting';
      this.emit();
      const delay = Math.min(8000, 500 * 2 ** this.retry++);
      this.timer = setTimeout(() => this.open(), delay);
    };
  }

  send(msg: ClientMsg): boolean {
    if (this.ws && this.ws.readyState === WebSocket.OPEN) { this.ws.send(JSON.stringify(msg)); return true; }
    return false;
  }

  act(action: Action): boolean {
    if (!this.view) return false;
    return this.send({ t: 'act', id: actionId(), v: this.view.version, action });
  }
  continue() { if (this.view) this.send({ t: 'continue', v: this.view.version }); }
  ready(ready: boolean) { this.send({ t: 'ready', ready }); }
  config(config: RoomConfig) { this.send({ t: 'config', config }); }
  start() { this.send({ t: 'start' }); }
  rematch() { this.send({ t: 'rematch' }); }

  leave() {
    this.send({ t: 'leave' });
    try { localStorage.removeItem(tokenKey(this.code)); } catch { /* ignore */ }
    this.stop();
  }

  stop() {
    this.stopped = true;
    if (this.timer) clearTimeout(this.timer);
    if (this.ping) clearInterval(this.ping);
    if (typeof document !== 'undefined') document.removeEventListener('visibilitychange', this.onVisible);
    try { this.ws?.close(); } catch { /* ignore */ }
  }
}
