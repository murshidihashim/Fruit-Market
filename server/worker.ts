// Cloudflare Worker: serves the web build and hosts the online services.
//   POST /api/rooms        -> { code }        creates a private room
//   POST /api/quick        -> { code, host }  quick match: join a stranger's room or wait in a new one
//   GET  /ws/:code         -> WebSocket       joins a room
//   POST /api/t            -> 204             anonymous usage counters and error lines
//   GET  /api/stats        -> report          (needs the STATS_KEY secret in an x-stats-key header)
//   GET  /api/daily?date=  -> top scores      POST /api/daily -> verified submission
//   GET  /api/version      -> { rules }
//   anything else          -> the static game (dist/)
import { DurableObject } from 'cloudflare:workers';
import { CODE_ALPHABET, CODE_LENGTH, RULES_VERSION, normaliseCode } from '../src/net/protocol';
import { addEntry, cleanIngest, KEEP_DAYS, quickMatch, utcDay, verifyDaily, type DailyEntry, type QuickState } from './meta';
import { RuleError } from '../src/engine/game';
import { freshRoom, Room, ROOM_TTL_MS, type Conn, type RoomData, type RoomIO } from './room';

interface Env {
  ROOMS: DurableObjectNamespace<RoomDO>;
  STATS: DurableObjectNamespace<StatsDO>;
  BOARD: DurableObjectNamespace<BoardDO>;
  MATCH: DurableObjectNamespace<MatchDO>;
  ASSETS: Fetcher;
  STATS_KEY?: string;
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

async function newRoom(env: Env, quick = false): Promise<string | null> {
  for (let i = 0; i < 5; i++) {
    const code = randomCode();
    const stub = env.ROOMS.get(env.ROOMS.idFromName(code));
    const res = await stub.fetch(`https://room/init?code=${code}${quick ? '&quick=1' : ''}`, { method: 'POST' });
    if (res.status === 201) return code;
  }
  return null;
}

async function readBody(req: Request): Promise<unknown> {
  const text = await req.text();
  if (text.length > MAX_BODY) throw new RuleError('Too large');
  try { return JSON.parse(text); } catch { throw new RuleError('Bad JSON'); }
}

export default {
  async fetch(req: Request, env: Env): Promise<Response> {
    const url = new URL(req.url);
    if (url.pathname.startsWith('/api/') && req.method === 'OPTIONS') return new Response(null, { headers: CORS });
    if (url.pathname === '/api/version') return json({ rules: RULES_VERSION });
    if (url.pathname === '/api/rooms') {
      if (req.method !== 'POST') return json({ error: 'POST only' }, 405);
      const code = await newRoom(env);
      return code ? json({ code }) : json({ error: 'Could not create a room, try again' }, 503);
    }
    if (url.pathname === '/api/quick') {
      if (req.method !== 'POST') return json({ error: 'POST only' }, 405);
      return env.MATCH.get(env.MATCH.idFromName('global')).fetch('https://match/quick', { method: 'POST' });
    }
    if (url.pathname === '/api/t') {
      if (req.method !== 'POST') return json({ error: 'POST only' }, 405);
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
    if (url.pathname === '/api/daily') {
      const date = req.method === 'POST' ? null : url.searchParams.get('date') ?? utcDay(Date.now());
      if (req.method === 'POST') {
        let body: unknown;
        try { body = await readBody(req); } catch (e) { return json({ error: (e as Error).message }, 400); }
        const d = (body as { date?: unknown }).date;
        if (typeof d !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(d)) return json({ error: 'Bad date' }, 400);
        return env.BOARD.get(env.BOARD.idFromName(`daily:${d}`)).fetch('https://board/submit', { method: 'POST', body: JSON.stringify(body) });
      }
      if (!/^\d{4}-\d{2}-\d{2}$/.test(date!)) return json({ error: 'Bad date' }, 400);
      return env.BOARD.get(env.BOARD.idFromName(`daily:${date}`)).fetch('https://board/top');
    }
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
    };
  }

  private room(): Room | null {
    return this.data ? new Room(this.data, this.io()) : null;
  }

  async fetch(req: Request): Promise<Response> {
    const url = new URL(req.url);
    if (url.pathname === '/init' && req.method === 'POST') {
      if (this.data) return new Response('Exists', { status: 409 });
      this.data = freshRoom(url.searchParams.get('code') ?? '', Date.now(), url.searchParams.get('quick') === '1');
      await this.ctx.storage.put('room', this.data);
      await this.ctx.storage.setAlarm(Date.now() + ROOM_TTL_MS);
      return new Response('Created', { status: 201 });
    }
    if (!this.data) return new Response('Unknown room', { status: 404 });
    const pair = new WebSocketPair();
    const [client, server] = Object.values(pair);
    this.ctx.acceptWebSocket(server);
    server.serializeAttachment({ id: crypto.randomUUID(), seat: null } satisfies Attachment);
    return new Response(null, { status: 101, webSocket: client });
  }

  async webSocketMessage(ws: WebSocket, message: string | ArrayBuffer): Promise<void> {
    const room = this.room();
    const c = this.conn(ws);
    if (!room) { c.send({ t: 'error', msg: 'This room has expired.', fatal: true }); c.close(4000, 'Expired'); return; }
    await room.message(c, typeof message === 'string' ? message : new TextDecoder().decode(message));
  }

  async webSocketClose(ws: WebSocket): Promise<void> {
    const att = ws.deserializeAttachment() as Attachment | null;
    if (att) ws.serializeAttachment({ ...att, closed: true });
    this.room()?.closed(this.conn(ws));
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

// ---------- daily leaderboard ----------

/** One object per daily challenge date. Every score is checked by replaying the game. */
export class BoardDO extends DurableObject<Env> {
  async fetch(req: Request): Promise<Response> {
    const url = new URL(req.url);
    const board = (await this.ctx.storage.get<DailyEntry[]>('board')) ?? [];
    if (url.pathname === '/submit') {
      try {
        const { entry } = verifyDaily((await req.json()) as never, Date.now());
        const next = addEntry(board, entry);
        await this.ctx.storage.put('board', next);
        const rank = next.findIndex((x) => x.name === entry.name) + 1;
        return json({ ok: true, rank, cash: entry.cash, top: next.slice(0, 20) });
      } catch (e) {
        return json({ error: e instanceof RuleError ? e.message : 'Could not check that game' }, 400);
      }
    }
    return json({ top: board.slice(0, 20), players: board.length });
  }
}

// ---------- quick match ----------

export class MatchDO extends DurableObject<Env> {
  async fetch(): Promise<Response> {
    const q = (await this.ctx.storage.get<QuickState>('q')) ?? { code: null, since: 0 };
    try {
      const r = await quickMatch(q, Date.now(), async () => {
        const code = await newRoom(this.env, true);
        if (!code) throw new Error('no room');
        return code;
      });
      await this.ctx.storage.put('q', r.q);
      return json({ code: r.code, host: r.host });
    } catch {
      return json({ error: 'Could not find a match, try again' }, 503);
    }
  }
}
