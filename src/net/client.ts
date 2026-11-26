// Browser side of online play: one WebSocket to the room, automatic reconnects,
// and a per-room seat token kept on this device so a refresh returns you to your seat.
import type { Action } from '../engine/game';
import { PROTOCOL_VERSION, REACT_GAP_MS, RULES_VERSION, type ClientMsg, type PublicRoom, type ReactionId, type RoomConfig, type RoomView, type ServerMsg } from './protocol';

export type ConnState = 'connecting' | 'open' | 'reconnecting' | 'failed';

/** Where the room server lives: the page's own origin, or VITE_SERVER_URL (needed in the Android app). */
export function serverBase(): string {
  const meta = (import.meta as { env?: Record<string, string | undefined> }).env;
  const env = meta?.VITE_SERVER_URL;
  if (env) return env.replace(/\/$/, '');
  // The single-file preview build can be opened anywhere, so it never talks to a server.
  if (meta?.MODE === 'single') return '';
  if (typeof location !== 'undefined' && /^https?:$/.test(location.protocol) && location.hostname !== 'localhost') return location.origin;
  if (typeof location !== 'undefined' && location.port && location.port !== '80') return location.origin;
  return '';
}

export function onlineAvailable(): boolean {
  return serverBase() !== '';
}

/** `pub` (PLAN-112): a public room, listed for people looking for a game while it waits for players. */
export async function createRoom(pub = false): Promise<string> {
  const res = await fetch(`${serverBase()}/api/rooms${pub ? '?public=1' : ''}`, { method: 'POST' });
  if (!res.ok) throw new Error('Could not create a room. Check your connection and try again.');
  const body = (await res.json()) as { code?: string };
  if (!body.code) throw new Error('Could not create a room.');
  return body.code;
}

/** Joins strangers who are waiting at a table of `stalls` (PLAN-125: 2, 4 or 6), or opens a room to wait in. The room
 *  starts when it is full, or after QUICK_FILL_MS with Normal computers in the empty seats. Returns the room code. */
export async function quickMatch(stalls: 2 | 4 | 6 = 2): Promise<string> {
  const res = await fetch(`${serverBase()}/api/quick`, { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ stalls }) });
  const body = (await res.json().catch(() => ({}))) as { code?: string; error?: string };
  if (!res.ok || !body.code) throw new Error(body.error ?? 'Could not find a game. Try again.');
  return body.code;
}

/** PLAN-112: the public rooms still waiting for players. Throws when the list cannot be read (offline, too many asks). */
export async function publicRooms(): Promise<PublicRoom[]> {
  const res = await fetch(`${serverBase()}/api/public`);
  if (!res.ok) throw new Error('Could not load the public rooms.');
  const body = (await res.json()) as { rooms?: unknown };
  return Array.isArray(body.rooms) ? (body.rooms as PublicRoom[]) : [];
}

/**
 * The link a friend opens to join. From the game's own web page it is that page. PLAN-107 (ON-06): the Android app's
 * page is served from the app itself (Capacitor's https://localhost), which opens nothing on a friend's phone, so
 * whenever the room server (VITE_SERVER_URL) is somewhere other than the page, the link is built from the server: the
 * Worker that hosts the rooms also serves the web game.
 */
export function inviteLink(code: string): string {
  return inviteLinkFrom(code, typeof location !== 'undefined' ? location : null, serverBase());
}

/** inviteLink for a page at `page` (null: none) talking to the room server at `server` ('' when there is none). */
export function inviteLinkFrom(code: string, page: Pick<Location, 'protocol' | 'origin' | 'pathname'> | null, server: string): string {
  const web = page && /^https?:$/.test(page.protocol) ? page.origin : '';
  const elsewhere = !!server && originOf(server) !== web;
  const base = page && web && !elsewhere ? `${web}${page.pathname}` : `${server}/`;
  return `${base}?room=${code}`;
}

const originOf = (url: string): string => {
  try { return new URL(url).origin; } catch { return url; }
};

const tokenKey = (code: string) => `fm.room.${code}`;
const MATCH_KEY = 'fm.match';

/** ON-08 (PLAN-110): this phone left an online match it can go back to (Home, or the app closed): its room code. */
export function rememberMatch(code: string) {
  try { localStorage.setItem(MATCH_KEY, code); } catch { /* private mode: Home cannot offer the way back */ }
}
/** The match this phone can go back to: only while its seat is still on the phone. */
export function openMatch(): string | null {
  try {
    const code = localStorage.getItem(MATCH_KEY);
    return code && localStorage.getItem(tokenKey(code)) ? code : null;
  } catch { return null; }
}
export function forgetMatch() {
  try { localStorage.removeItem(MATCH_KEY); } catch { /* nothing kept */ }
}

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
  /** PLAN-112: when the room opened, on this phone's clock (from the room's `waited`, so a wrong phone clock is fine). */
  openedAt = 0;
  /** PLAN-112: when this phone last sent a reaction (the room passes on one every REACT_GAP_MS per seat). */
  reactedAt = 0;
  private ws: WebSocket | null = null;
  private retry = 0;
  private timer: ReturnType<typeof setTimeout> | null = null;
  private ping: ReturnType<typeof setInterval> | null = null;
  private stopped = false;
  private listeners = new Set<() => void>();
  private viewListeners = new Set<(v: RoomView) => void>();
  private errorListeners = new Set<(msg: string) => void>();
  private reactListeners = new Set<(seat: number, r: ReactionId) => void>();
  private onVisible = () => { if (document.visibilityState === 'visible' && this.conn !== 'open' && !this.stopped) this.open(); };

  constructor(public code: string, private name: string, private avatar: string, private look: Record<string, string> = {}) {
    if (typeof document !== 'undefined') document.addEventListener('visibilitychange', this.onVisible);
    this.open();
  }

  subscribe(fn: () => void) { this.listeners.add(fn); return () => this.listeners.delete(fn); }
  onView(fn: (v: RoomView) => void) { this.viewListeners.add(fn); return () => this.viewListeners.delete(fn); }
  onError(fn: (msg: string) => void) { this.errorListeners.add(fn); return () => this.errorListeners.delete(fn); }
  /** PLAN-112: a reaction from a seat in the room (this phone's own included). */
  onReact(fn: (seat: number, r: ReactionId) => void) { this.reactListeners.add(fn); return () => this.reactListeners.delete(fn); }
  private emit() { this.listeners.forEach((f) => f()); }

  private open() {
    if (this.timer) { clearTimeout(this.timer); this.timer = null; }
    try { this.ws?.close(); } catch { /* the old socket may already be closed or broken; a new one opens next */ }
    const url = `${serverBase().replace(/^http/, 'ws')}/ws/${this.code}`;
    const ws = new WebSocket(url);
    this.ws = ws;
    this.conn = this.view ? 'reconnecting' : 'connecting';
    this.emit();
    ws.onopen = () => {
      this.retry = 0;
      this.send({ t: 'hello', token: loadToken(this.code), name: this.name, avatar: this.avatar, look: this.look, rv: RULES_VERSION, pv: PROTOCOL_VERSION });
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
        if (typeof m.waited === 'number') this.openedAt = Date.now() - m.waited;
        this.view = m;
        this.seat = m.you;
        this.conn = 'open';
        this.viewListeners.forEach((f) => f(m));
      } else if (m.t === 'react') {
        if (typeof m.seat === 'number') this.reactListeners.forEach((f) => f(m.seat, m.r));
        return;
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
  undo(): boolean {
    if (!this.view) return false;
    return this.send({ t: 'undo', id: actionId(), v: this.view.version });
  }
  rename(name: string) { this.send({ t: 'rename', name }); }
  continue() { if (this.view) this.send({ t: 'continue', v: this.view.version }); }
  ready(ready: boolean) { this.send({ t: 'ready', ready }); }
  /** In the choosing step (PLAN-102): ask for a shopkeeper, then confirm it. */
  character(avatar: string) { this.send({ t: 'character', avatar }); }
  confirm() { this.send({ t: 'confirm' }); }
  /** Tell the room what you are wearing; it is also remembered for a reconnect. */
  wear(look: Record<string, string>) { this.look = look; this.send({ t: 'look', look }); }
  config(config: RoomConfig) { this.send({ t: 'config', config }); }
  start() { this.send({ t: 'start' }); }
  /** PLAN-112: start with computers in every empty seat (the room allows it once it has waited a minute). */
  startWithComputers() { this.send({ t: 'start', computers: true }); }
  /** PLAN-112: can a reaction be sent now? (The room drops one sent sooner than REACT_GAP_MS after the last.) */
  canReact(now = Date.now()) { return now - this.reactedAt >= REACT_GAP_MS; }
  /** PLAN-112: sends a preset reaction: only its id. False when it is too soon after the last one, or offline. */
  react(r: ReactionId): boolean {
    if (!this.canReact()) return false;
    if (!this.send({ t: 'react', r })) return false;
    this.reactedAt = Date.now();
    return true;
  }
  rematch() { this.send({ t: 'rematch' }); }

  leave() {
    this.send({ t: 'leave' });
    try { localStorage.removeItem(tokenKey(this.code)); } catch { /* storage blocked: no seat token was kept to forget */ }
    this.stop();
  }

  stop() {
    this.stopped = true;
    if (this.timer) clearTimeout(this.timer);
    if (this.ping) clearInterval(this.ping);
    if (typeof document !== 'undefined') document.removeEventListener('visibilitychange', this.onVisible);
    try { this.ws?.close(); } catch { /* the socket may already be closed or broken; stopping is all that is wanted */ }
  }
}
