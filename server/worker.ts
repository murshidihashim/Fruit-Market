// Cloudflare Worker: serves the web build and hosts one Durable Object per online room.
//   POST /api/rooms   -> { code }   creates a private room
//   GET  /ws/:code    -> WebSocket  joins it
//   anything else     -> the static game (dist/)
import { DurableObject } from 'cloudflare:workers';
import { CODE_ALPHABET, CODE_LENGTH, normaliseCode } from '../src/net/protocol';
import { freshRoom, Room, ROOM_TTL_MS, type Conn, type RoomData, type RoomIO } from './room';

interface Env {
  ROOMS: DurableObjectNamespace<RoomDO>;
  ASSETS: Fetcher;
}

const CORS = { 'Access-Control-Allow-Origin': '*', 'Access-Control-Allow-Methods': 'POST, OPTIONS', 'Access-Control-Allow-Headers': 'content-type' };

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), { status, headers: { 'content-type': 'application/json', ...CORS } });
}

function randomCode(): string {
  const bytes = crypto.getRandomValues(new Uint8Array(CODE_LENGTH));
  return Array.from(bytes, (b) => CODE_ALPHABET[b % CODE_ALPHABET.length]).join('');
}

export default {
  async fetch(req: Request, env: Env): Promise<Response> {
    const url = new URL(req.url);
    if (url.pathname === '/api/rooms') {
      if (req.method === 'OPTIONS') return new Response(null, { headers: CORS });
      if (req.method !== 'POST') return json({ error: 'POST only' }, 405);
      for (let i = 0; i < 5; i++) {
        const code = randomCode();
        const stub = env.ROOMS.get(env.ROOMS.idFromName(code));
        const res = await stub.fetch(`https://room/init?code=${code}`, { method: 'POST' });
        if (res.status === 201) return json({ code });
      }
      return json({ error: 'Could not create a room, try again' }, 503);
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
      this.data = freshRoom(url.searchParams.get('code') ?? '', Date.now());
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
