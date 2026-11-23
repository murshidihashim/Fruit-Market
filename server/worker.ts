// Cloudflare Worker: serves the web build and hosts the online services.
//   POST /api/rooms        -> { code }        creates a private room (?public=1: a public one, PLAN-112)
//   POST /api/quick        -> { code, host }  quick match: join a stranger's room or wait in a new one. PLAN-125: the
//                             body { stalls: 2 | 4 | 6 } picks the table size (missing or unknown: 2)
//   GET  /api/public       -> { rooms }       the public rooms still waiting for players (PLAN-112)
//   GET  /ws/:code         -> WebSocket       joins a room
//   POST /api/t            -> 204             anonymous usage counters and error lines
//   GET  /api/stats        -> report          (needs the STATS_KEY secret in an x-stats-key header)
//   GET  /api/daily?date=  -> top scores      POST /api/daily -> verified submission
//   GET  /api/sprint?date=&me= -> the day's Market Sprint board and the week's ranking (PLAN-114; `me`: the device's
//                                 owner hash, for its own place)        POST /api/sprint -> verified Sprint submission
//   POST /api/account/{signup,login,sync,logout,password,delete} -> optional ID-and-password accounts (server/accounts.ts)
//   GET  /api/version      -> { rules }
//   anything else          -> the static game (dist/)
// Write endpoints are rate-limited per IP (server/limits.ts); over the limit they answer 429.
import { DurableObject } from 'cloudflare:workers';
import { CODE_ALPHABET, CODE_LENGTH, QUICK_FILL_MS, quickStalls, RULES_VERSION, normaliseCode, type QuickStalls } from '../src/net/protocol';
import {
  addEntry, addSprintEntry, addWeekScore, boardView, cleanIngest, dailyBoardKey, KEEP_DAYS, OWNER_RE, ownerOf, placeOf, publicBoard,
  loadQueues, quickMatch, quickSize, sprintBoardKey, sprintWeekKey, utcDay, verifyDaily, weekView, type BoardView, type DailyEntry, type WeekEntry,
} from './meta';
import { isoWeek } from '../src/engine/daily';
import { allowed, ROUTE_LIMITER, type LimitedRoute, type Limiter } from './limits';
import { UPDATE_MSG } from '../src/net/protocol';
import { RuleError } from '../src/engine/game';
import { accountKey, handleAccount, idProblem, type AccountAction, type AccountRec } from './accounts';
import { freshRoom, Room, roomGoneMsg, ROOM_TTL_MS, type Conn, type RoomData, type RoomIO } from './room';
import { cleanListing, listDrop, listPut, listShow, type ListEntry } from './lobby';

interface Env {
  ROOMS: DurableObjectNamespace<RoomDO>;
  STATS: DurableObjectNamespace<StatsDO>;
  BOARD: DurableObjectNamespace<BoardDO>;
  MATCH: DurableObjectNamespace<MatchDO>;
  ACCOUNT: DurableObjectNamespace<AccountDO>;
  LOBBY: DurableObjectNamespace<LobbyDO>;
  ASSETS: Fetcher;
  STATS_KEY?: string;
  RL_ROOMS?: Limiter;
  RL_DAILY?: Limiter;
  RL_EVENTS?: Limiter;
  RL_ACCOUNT?: Limiter;
  /** PLAN-125: a shorter quick-match fill time in ms, for the browser tests only. Set on the `wrangler dev` command line
   *  by scripts/e2e.mjs, never in wrangler.jsonc, so the live game and the preview always wait QUICK_FILL_MS. */
  QUICK_FILL_MS?: string;
}

/** The quick-match fill time: QUICK_FILL_MS, or a shorter test value (it can never be made longer). */
function quickFillMs(env: Env): number {
  const n = Math.floor(Number(env.QUICK_FILL_MS));
  return Number.isFinite(n) && n >= 1000 && n < QUICK_FILL_MS ? n : QUICK_FILL_MS;
}

/** null when the request may go ahead, or a 429 response. */
async function limited(req: Request, env: Env, route: LimitedRoute): Promise<Response | null> {
  const ok = await allowed(env[ROUTE_LIMITER[route]], route, req.headers.get('CF-Connecting-IP'));
  return ok ? null : json({ error: 'Too many requests. Wait a minute and try again.' }, 429);
}

const CORS = { 'Access-Control-Allow-Origin': '*', 'Access-Control-Allow-Methods': 'GET, POST, OPTIONS', 'Access-Control-Allow-Headers': 'content-type' };
const MAX_BODY = 32_000;

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), { status, headers: { 'content-type': 'application/json', ...CORS } });
}

function randomCode(): string {
  const bytes = crypto.getRandomValues(new Uint8Array(CODE_LENGTH));
  return Array.from(bytes, (b) => CODE_ALPHABET[b % CODE_ALPHABET.length]).join('');
}

async function newRoom(env: Env, quick = false, pub = false, stalls: QuickStalls = 2): Promise<string | null> {
  for (let i = 0; i < 5; i++) {
    const code = randomCode();
    const stub = env.ROOMS.get(env.ROOMS.idFromName(code));
    const res = await stub.fetch(`https://room/init?code=${code}${quick ? `&quick=1&stalls=${stalls}` : ''}${pub ? '&public=1' : ''}`, { method: 'POST' });
    if (res.status === 201) return code;
  }
  return null;
}

async function readBody(req: Request): Promise<unknown> {
  const text = await req.text();
  if (text.length > MAX_BODY) throw new RuleError('Something went wrong. Try again.');
  try { return JSON.parse(text); } catch { throw new RuleError('Something went wrong. Try again.'); }
}

export default {
  async fetch(req: Request, env: Env): Promise<Response> {
    const url = new URL(req.url);
    if (url.pathname.startsWith('/api/') && req.method === 'OPTIONS') return new Response(null, { headers: CORS });
    if (url.pathname === '/api/version') return json({ rules: RULES_VERSION });
    if (url.pathname === '/api/rooms') {
      if (req.method !== 'POST') return json({ error: 'POST only' }, 405);
      const stop = await limited(req, env, 'rooms');
      if (stop) return stop;
      const code = await newRoom(env, false, url.searchParams.get('public') === '1');
      return code ? json({ code }) : json({ error: 'Could not create a room, try again' }, 503);
    }
    if (url.pathname === '/api/public') {
      if (req.method !== 'GET') return json({ error: 'GET only' }, 405);
      const stop = await limited(req, env, 'public');
      if (stop) return stop;
      return env.LOBBY.get(env.LOBBY.idFromName('global')).fetch('https://lobby/list');
    }
    if (url.pathname === '/api/quick') {
      if (req.method !== 'POST') return json({ error: 'POST only' }, 405);
      const stop = await limited(req, env, 'quick');
      if (stop) return stop;
      // PLAN-125: apps before 1.31 send no body, so they keep finding two-stall games.
      let body: unknown = null;
      try { body = await readBody(req); } catch { /* no body or not JSON: the default size */ }
      return env.MATCH.get(env.MATCH.idFromName('global')).fetch(`https://match/quick?stalls=${quickSize(body)}`, { method: 'POST' });
    }
    if (url.pathname === '/api/t') {
      if (req.method !== 'POST') return json({ error: 'POST only' }, 405);
      if (await limited(req, env, 't')) return new Response(null, { status: 204, headers: CORS }); // drop quietly
      try {
        const body = cleanIngest(await readBody(req));
        if (body.events.length || body.errors.length) {
          await env.STATS.get(env.STATS.idFromName('global')).fetch('https://stats/ingest', { method: 'POST', body: JSON.stringify(body) });
        }
      } catch { /* telemetry never fails loudly */ }
      return new Response(null, { status: 204, headers: CORS });
    }
    if (url.pathname === '/api/stats') {
      if (!env.STATS_KEY || req.headers.get('x-stats-key') !== env.STATS_KEY) return json({ error: 'Forbidden' }, 403);
      return env.STATS.get(env.STATS.idFromName('global')).fetch(`https://stats/report?days=${url.searchParams.get('days') ?? '14'}`);
    }
    const acct = url.pathname.match(/^\/api\/account\/(signup|login|sync|logout|password|delete)$/);
    if (acct) {
      if (req.method !== 'POST') return json({ error: 'POST only' }, 405);
      const stop = await limited(req, env, 'account');
      if (stop) return stop;
      let body: unknown;
      try { body = await readBody(req); } catch (e) { return json({ error: (e as Error).message }, 400); }
      const id = (body as { id?: unknown }).id;
      // An ID that could never exist gets the same answer as a wrong password, without waking an object.
      if (typeof id !== 'string' || (acct[1] !== 'signup' && idProblem(id))) return json({ error: acct[1] === 'signup' ? (idProblem(id) ?? 'Enter an ID.') : 'Wrong ID or password.' }, acct[1] === 'signup' ? 400 : 401);
      return env.ACCOUNT.get(env.ACCOUNT.idFromName(`acct:${accountKey(id)}`)).fetch(`https://account/${acct[1]}`, { method: 'POST', body: JSON.stringify(body) });
    }
    if (url.pathname === '/api/daily') {
      const date = req.method === 'POST' ? null : url.searchParams.get('date') ?? utcDay(Date.now());
      if (req.method === 'POST') {
        const stop = await limited(req, env, 'daily');
        if (stop) return stop;
        let body: unknown;
        try { body = await readBody(req); } catch (e) { return json({ error: (e as Error).message }, 400); }
        const d = (body as { date?: unknown }).date;
        if (typeof d !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(d)) return json({ error: 'Bad date' }, 400);
        return env.BOARD.get(env.BOARD.idFromName(dailyBoardKey(d))).fetch('https://board/submit', { method: 'POST', body: JSON.stringify(body) });
      }
      if (!/^\d{4}-\d{2}-\d{2}$/.test(date!)) return json({ error: 'Bad date' }, 400);
      return env.BOARD.get(env.BOARD.idFromName(dailyBoardKey(date!))).fetch(`https://board/top${meParam(url)}`);
    }
    if (url.pathname === '/api/sprint') return sprintRoute(req, env, url);
    const m = url.pathname.match(/^\/ws\/([A-Za-z0-9-]+)$/);
    if (m) {
      if (req.headers.get('Upgrade') !== 'websocket') return new Response('Expected a WebSocket', { status: 426 });
      const code = normaliseCode(m[1]);
      if (code.length !== CODE_LENGTH) return new Response('Unknown room', { status: 404 });
      return env.ROOMS.get(env.ROOMS.idFromName(code)).fetch(req);
    }
    return env.ASSETS.fetch(req);
  },
};

interface Attachment { id: string; seat: number | null; closed?: boolean }

export class RoomDO extends DurableObject<Env> {
  private data: RoomData | null = null;
  private wrappers = new WeakMap<WebSocket, Conn>();

  constructor(ctx: DurableObjectState, env: Env) {
    super(ctx, env);
    ctx.blockConcurrencyWhile(async () => {
      this.data = (await ctx.storage.get<RoomData>('room')) ?? null;
    });
    // Keep-alive pings are answered without waking the room.
    ctx.setWebSocketAutoResponse(new WebSocketRequestResponsePair('{"t":"ping"}', '{"t":"pong"}'));
  }

  private conn(ws: WebSocket): Conn {
    let c = this.wrappers.get(ws);
    if (c) return c;
    const att = (ws.deserializeAttachment() as Attachment | null) ?? { id: crypto.randomUUID(), seat: null };
    c = {
      id: att.id,
      seat: att.seat,
      send: (msg) => { try { ws.send(JSON.stringify(msg)); } catch { /* socket already gone */ } },
      close: (code, reason) => { try { ws.close(code, reason); } catch { /* already closed */ } },
    };
    this.wrappers.set(ws, c);
    return c;
  }

  private io(): RoomIO {
    return {
      conns: () => this.ctx.getWebSockets()
        .filter((ws) => ws.readyState === WebSocket.OPEN && !(ws.deserializeAttachment() as Attachment | null)?.closed)
        .map((ws) => this.conn(ws)),
      setSeat: (c, seat) => {
        c.seat = seat;
        const ws = this.ctx.getWebSockets().find((w) => this.wrappers.get(w) === c);
        if (ws) ws.serializeAttachment({ ...(ws.deserializeAttachment() as Attachment), seat });
      },
      persist: (d) => this.ctx.storage.put('room', d),
      now: () => Date.now(),
      randomHex: (n) => Array.from(crypto.getRandomValues(new Uint8Array(n)), (b) => b.toString(16).padStart(2, '0')).join(''),
      randomInt: (n) => crypto.getRandomValues(new Uint32Array(1))[0] % n,
      setAlarm: (at) => { void this.ctx.storage.setAlarm(at); },
      destroy: async () => { this.data = null; await this.ctx.storage.deleteAll(); },
      listRoom: async (code, entry) => {
        await this.env.LOBBY.get(this.env.LOBBY.idFromName('global'))
          .fetch('https://lobby/put', { method: 'POST', body: JSON.stringify(entry ? { entry } : { code }) });
      },
    };
  }

  private room(): Room | null {
    return this.data ? new Room(this.data, this.io()) : null;
  }

  async fetch(req: Request): Promise<Response> {
    const url = new URL(req.url);
    if (url.pathname === '/init' && req.method === 'POST') {
      if (this.data) return new Response('Exists', { status: 409 });
      this.data = freshRoom(url.searchParams.get('code') ?? '', Date.now(), url.searchParams.get('quick') === '1', url.searchParams.get('public') === '1',
        quickStalls(Number(url.searchParams.get('stalls'))), quickFillMs(this.env));
      await this.ctx.storage.put('room', this.data);
      await this.ctx.storage.setAlarm(Date.now() + ROOM_TTL_MS);
      return new Response('Created', { status: 201 });
    }
    // PLAN-107 (ON-03): a code that leads to no room (never made, or expired) still gets a connection, so the phone can
    // be told so: its hello is answered with a message that stops it (webSocketMessage). A refused connection (404)
    // looked like a network fault, and every app retried it for ever. Nothing is stored for such a code.
    if (!this.data && !url.pathname.startsWith('/ws/')) return new Response('Unknown room', { status: 404 });
    if (url.pathname === '/claim' && req.method === 'POST') {
      // Used by quick match (PLAN-125): may one more person be sent here? If so, the room keeps them a seat.
      return json({ ok: await this.room()!.claimSeat() });
    }
    const pair = new WebSocketPair();
    const [client, server] = Object.values(pair);
    this.ctx.acceptWebSocket(server);
    server.serializeAttachment({ id: crypto.randomUUID(), seat: null } satisfies Attachment);
    return new Response(null, { status: 101, webSocket: client });
  }

  async webSocketMessage(ws: WebSocket, message: string | ArrayBuffer): Promise<void> {
    const room = this.room();
    const c = this.conn(ws);
    const raw = typeof message === 'string' ? message : new TextDecoder().decode(message);
    if (!room) { c.send({ t: 'error', msg: roomGoneMsg(raw), fatal: true }); c.close(4004, 'Unknown room'); return; }
    await room.message(c, raw);
  }

  async webSocketClose(ws: WebSocket): Promise<void> {
    const att = ws.deserializeAttachment() as Attachment | null;
    if (att) ws.serializeAttachment({ ...att, closed: true });
    await this.room()?.closed(this.conn(ws));
  }

  async webSocketError(ws: WebSocket): Promise<void> {
    await this.webSocketClose(ws);
  }

  async alarm(): Promise<void> {
    await this.room()?.alarm();
  }
}

// ---------- usage counters ----------

/** One object for the whole game: per-day event counts and error lines in SQLite. No identities are stored. */
export class StatsDO extends DurableObject<Env> {
  constructor(ctx: DurableObjectState, env: Env) {
    super(ctx, env);
    ctx.storage.sql.exec('CREATE TABLE IF NOT EXISTS counts (day TEXT, name TEXT, n INTEGER, PRIMARY KEY (day, name))');
    ctx.storage.sql.exec('CREATE TABLE IF NOT EXISTS errors (day TEXT, msg TEXT, n INTEGER, PRIMARY KEY (day, msg))');
  }

  async fetch(req: Request): Promise<Response> {
    const url = new URL(req.url);
    const sql = this.ctx.storage.sql;
    const today = utcDay(Date.now());
    if (url.pathname === '/ingest') {
      const { events, errors } = (await req.json()) as { events: string[]; errors: string[] };
      for (const e of events) sql.exec('INSERT INTO counts VALUES (?, ?, 1) ON CONFLICT (day, name) DO UPDATE SET n = n + 1', today, e);
      for (const e of errors) sql.exec('INSERT INTO errors VALUES (?, ?, 1) ON CONFLICT (day, msg) DO UPDATE SET n = n + 1', today, e);
      const cutoff = utcDay(Date.now() - KEEP_DAYS * 86_400_000);
      sql.exec('DELETE FROM counts WHERE day < ?', cutoff);
      sql.exec('DELETE FROM errors WHERE day < ?', cutoff);
      return new Response(null, { status: 204 });
    }
    const days = Math.max(1, Math.min(KEEP_DAYS, Number(url.searchParams.get('days')) || 14));
    const since = utcDay(Date.now() - (days - 1) * 86_400_000);
    const counts: Record<string, Record<string, number>> = {};
    for (const r of sql.exec<{ day: string; name: string; n: number }>('SELECT day, name, n FROM counts WHERE day >= ? ORDER BY day', since)) {
      (counts[r.day] ??= {})[r.name] = r.n;
    }
    const errors = [...sql.exec<{ day: string; msg: string; n: number }>('SELECT day, msg, n FROM errors WHERE day >= ? ORDER BY n DESC LIMIT 50', since)];
    return json({ since, counts, errors });
  }
}

// ---------- the Market Sprint (PLAN-114) ----------

/** "?me=<owner hash>" when the app asked for its own place, else nothing. */
function meParam(url: URL): string {
  const me = url.searchParams.get('me');
  return me && OWNER_RE.test(me) ? `?me=${me}` : '';
}

const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;

/**
 * The Sprint's boards: one per day (BoardDO under sprintBoardKey) and one per ISO week (BoardDO under sprintWeekKey),
 * which adds each device's best Sprint of each day. A submission is replayed and put on the day's board first; the
 * device's best of the day then goes to the week. Same rate limit as the Daily market (its own count), same name checks.
 */
async function sprintRoute(req: Request, env: Env, url: URL): Promise<Response> {
  const board = (key: string) => env.BOARD.get(env.BOARD.idFromName(key));
  if (req.method === 'POST') {
    const stop = await limited(req, env, 'sprint');
    if (stop) return stop;
    let body: unknown;
    try { body = await readBody(req); } catch (e) { return json({ error: (e as Error).message }, 400); }
    const d = (body as { date?: unknown }).date;
    if (typeof d !== 'string' || !DATE_RE.test(d)) return json({ error: 'Bad date' }, 400);
    const res = await board(sprintBoardKey(d)).fetch('https://board/sprint/submit', { method: 'POST', body: JSON.stringify(body) });
    const out = (await res.json()) as { error?: string; owner?: string; cash?: number; name?: string; best?: { name: string; cash: number; sold: number }; day?: BoardView };
    if (!res.ok || !out.owner || !out.best) return json({ error: out.error ?? 'Could not check that game' }, res.ok ? 400 : res.status);
    let week: BoardView | undefined;
    try {
      const w = await board(sprintWeekKey(d)).fetch('https://board/week/put', { method: 'POST', body: JSON.stringify({ owner: out.owner, date: d, ...out.best }) });
      if (w.ok) week = (await w.json()) as BoardView;
    } catch { /* the day's board already has the score; the week catches up on the next submission */ }
    // The owner hash stays on the server.
    return json({ ok: true, cash: out.cash, name: out.name, best: out.best, day: out.day, week, weekOf: isoWeek(d) });
  }
  const date = url.searchParams.get('date') ?? utcDay(Date.now());
  if (!DATE_RE.test(date)) return json({ error: 'Bad date' }, 400);
  const me = meParam(url);
  const [day, week] = await Promise.all([
    board(sprintBoardKey(date)).fetch(`https://board/sprint/view${me}`).then((r) => r.json()),
    board(sprintWeekKey(date)).fetch(`https://board/week/view${me}`).then((r) => r.json()),
  ]);
  return json({ day, week, weekOf: isoWeek(date) });
}

// ---------- daily leaderboard ----------

/**
 * One object per daily challenge date. Every score is checked by replaying the game. PLAN-114: the same class also
 * holds each day's Sprint board (paths under /sprint/, stored as "sprint") and each week's Sprint ranking (paths under
 * /week/, stored as "week"), each in an object of its own name.
 */
export class BoardDO extends DurableObject<Env> {
  async fetch(req: Request): Promise<Response> {
    const url = new URL(req.url);
    const me = url.searchParams.get('me') ?? undefined;
    if (url.pathname.startsWith('/sprint/')) return this.sprint(req, url, me);
    if (url.pathname.startsWith('/week/')) return this.week(req, url, me);
    const board = (await this.ctx.storage.get<DailyEntry[]>('board')) ?? [];
    if (url.pathname === '/submit') {
      try {
        const body = (await req.json()) as { claim?: unknown };
        const owner = await ownerOf(body.claim);
        const { entry } = verifyDaily(body as never, Date.now(), owner);
        const next = addEntry(board, entry);
        await this.ctx.storage.put('board', next);
        const rank = next.findIndex((x) => x.owner === owner) + 1;
        return json({ ok: true, rank, cash: entry.cash, name: entry.name, top: publicBoard(next.slice(0, 20)), players: next.length });
      } catch (e) {
        const msg = e instanceof RuleError ? e.message : 'Could not check that game';
        return json({ error: msg }, msg === UPDATE_MSG ? 409 : 400);
      }
    }
    return json({ top: publicBoard(board.slice(0, 20)), players: board.length, ...(me ? { rank: placeOf(board, me) } : {}) });
  }

  private async sprint(req: Request, url: URL, me: string | undefined): Promise<Response> {
    const board = (await this.ctx.storage.get<DailyEntry[]>('sprint')) ?? [];
    if (url.pathname !== '/sprint/submit') return json(boardView(board, me));
    try {
      const body = (await req.json()) as { claim?: unknown };
      const owner = await ownerOf(body.claim);
      const { entry } = verifyDaily(body as never, Date.now(), owner, true);
      const next = addSprintEntry(board, entry);
      await this.ctx.storage.put('sprint', next);
      const best = next.find((x) => x.owner === owner);
      return json({ ok: true, owner, cash: entry.cash, name: entry.name, best: best && { name: best.name, cash: best.cash, sold: best.sold }, day: boardView(next, owner) });
    } catch (e) {
      const msg = e instanceof RuleError ? e.message : 'Could not check that game';
      return json({ error: msg }, msg === UPDATE_MSG ? 409 : 400);
    }
  }

  private async week(req: Request, url: URL, me: string | undefined): Promise<Response> {
    const week = (await this.ctx.storage.get<WeekEntry[]>('week')) ?? [];
    if (url.pathname !== '/week/put') return json(weekView(week, me));
    const b = (await req.json()) as { owner: string; name: string; date: string; cash: number; sold: number };
    const next = addWeekScore(week, b.owner, b.name, b.date, b.cash, b.sold, Date.now());
    await this.ctx.storage.put('week', next);
    return json(weekView(next, b.owner));
  }
}

// ---------- accounts ----------

/** One object per account ID. It stores the scrambled password and the player's profile. */
export class AccountDO extends DurableObject<Env> {
  async fetch(req: Request): Promise<Response> {
    const action = new URL(req.url).pathname.slice(1) as AccountAction;
    const rec = (await this.ctx.storage.get<AccountRec>('rec')) ?? null;
    const out = await handleAccount(action, await req.json(), rec, Date.now());
    if (out.rec === null) await this.ctx.storage.deleteAll();
    else if (out.rec) await this.ctx.storage.put('rec', out.rec);
    return json(out.body, out.status);
  }
}

// ---------- public rooms (PLAN-112) ----------

/** One object for the whole game: the public rooms still waiting for players (server/lobby.ts). */
export class LobbyDO extends DurableObject<Env> {
  async fetch(req: Request): Promise<Response> {
    const url = new URL(req.url);
    const now = Date.now();
    if (url.pathname === '/put' && req.method === 'POST') {
      // Read the message before the list: storage reads and writes then follow each other with nothing waiting in
      // between, so two rooms reporting at once cannot overwrite each other's news.
      let body: { entry?: unknown; code?: unknown } = {};
      try { body = (await req.json()) as typeof body; } catch { return new Response(null, { status: 400 }); }
      const list = (await this.ctx.storage.get<ListEntry[]>('list')) ?? [];
      const entry = cleanListing(body.entry);
      if (entry) await this.ctx.storage.put('list', listPut(list, entry, now));
      else if (typeof body.code === 'string') await this.ctx.storage.put('list', listDrop(list, body.code, now));
      return new Response(null, { status: 204 });
    }
    return json({ rooms: listShow((await this.ctx.storage.get<ListEntry[]>('list')) ?? [], now) });
  }
}

// ---------- quick match ----------

export class MatchDO extends DurableObject<Env> {
  async fetch(req: Request): Promise<Response> {
    const size = quickStalls(Number(new URL(req.url).searchParams.get('stalls')));
    // PLAN-125: one request at a time, so two people looking at once never both open a room of the same size.
    return this.ctx.blockConcurrencyWhile(async () => {
      // One waiting room per size; the single queue from before is the two-stall one.
      const queues = loadQueues(await this.ctx.storage.get('queues'), await this.ctx.storage.get('q'));
      try {
        const r = await quickMatch(queues[size], Date.now(), async () => {
          const code = await newRoom(this.env, true, false, size);
          if (!code) throw new Error('no room');
          return code;
        }, async (code) => {
          const res = await this.env.ROOMS.get(this.env.ROOMS.idFromName(code)).fetch('https://room/claim', { method: 'POST' });
          return res.ok && ((await res.json()) as { ok?: boolean }).ok === true;
        }, quickFillMs(this.env));
        queues[size] = r.q;
        await this.ctx.storage.put('queues', queues);
        await this.ctx.storage.delete('q');
        return json({ code: r.code, host: r.host, stalls: size });
      } catch {
        return json({ error: 'Could not find a game. Try again.' }, 503);
      }
    });
  }
}
