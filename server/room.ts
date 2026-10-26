// One online room: lobby, an authoritative game, secret price collection, reconnects, rematch.
// Pure logic with no Cloudflare APIs, so it can be unit-tested; worker.ts wires it to a Durable Object.
//
// Rules:
// - The server owns the only real GameState. Clients send intentions; the shared rules engine applies them.
// - Secret prices are held in `pending` (never sent to anyone) until every human has submitted.
// - Each browser receives its own filtered view: no pending prices, no hidden favour cards,
//   no deck order and no random seed (which would reveal future customers and events).
// - Every action carries an id (duplicates are ignored) and the state version it was made on
//   (stale actions are rejected), so double taps and replays can't apply twice.

import { aiStep } from '../src/engine/ai';
import { FAVOURS, RIVALS, type FavourId } from '../src/engine/data';
import {
  activePlayer, applyAction, newGame, RuleError, submitBids, validateBids,
  type Action, type Bid, type GameState, type PlayerConfig,
} from '../src/engine/game';
import {
  DEFAULT_CONFIG, HUMAN_AVATARS, MAX_SEATS, NAME_MAX, RULES_VERSION, UPDATE_MSG,
  type ClientMsg, type PublicSeat, type RoomConfig, type RoomStatus, type RoomView, type ServerMsg,
} from '../src/net/protocol';

export const ROOM_TTL_MS = 24 * 60 * 60 * 1000;
const MAX_MSG = 16_000;

export interface SeatData { name: string; avatar: string; token: string; ready: boolean; host: boolean }

export interface RoomData {
  code: string;
  createdAt: number;
  lastActive: number;
  status: RoomStatus;
  seats: SeatData[];
  config: RoomConfig;
  game: GameState | null;
  version: number;
  pending: ({ bids: Bid[]; favoured: boolean } | null)[];
  votes: number[];
  rematch: number[];
  seen: string[][];
  aiNames: { name: string; avatar: string; quip: string }[];
  /** A quick-match room: strangers are seated ready and the match starts as soon as two are in. */
  quick?: boolean;
}

export interface Conn {
  id: string;
  seat: number | null;
  send(msg: ServerMsg): void;
  close(code: number, reason: string): void;
}

export interface RoomIO {
  conns(): Conn[];
  setSeat(conn: Conn, seat: number | null): void;
  persist(d: RoomData): void | Promise<void>;
  now(): number;
  randomHex(bytes: number): string;
  randomInt(n: number): number;
  setAlarm(at: number): void;
  destroy(): void | Promise<void>;
}

export function freshRoom(code: string, now: number, quick = false): RoomData {
  return {
    code, createdAt: now, lastActive: now, status: 'lobby', seats: [], config: { ...DEFAULT_CONFIG },
    game: null, version: 0, pending: [], votes: [], rematch: [], seen: [], aiNames: [], quick,
  };
}

/** The game as one player is allowed to see it. */
export function redact(g: GameState, seat: number): GameState {
  const v: GameState = JSON.parse(JSON.stringify(g));
  v.rng = 0;
  v.farmerDeck = [];
  v.customerDeck = [];
  v.eventDeck = [];
  v.favourDeck = [];
  v.players.forEach((pl, i) => {
    if (i !== seat) pl.favours = pl.favours.map(() => 'freeCash' as FavourId);
  });
  if (v.results) v.results.favours = v.results.favours.map((f) => (f.player === seat ? f : { ...f, favour: 'freeCash' as FavourId }));
  if (v.phase === 'bid') v.bids = v.bids.map(() => null);
  return v;
}

function clean(name: unknown, fallback: string): string {
  const s = typeof name === 'string' ? name.replace(/[\u0000-\u001f<>]/g, '').trim().slice(0, NAME_MAX) : '';
  return s || fallback;
}

export class Room {
  constructor(public d: RoomData, private io: RoomIO) {}

  // ---------- connection events ----------

  async message(conn: Conn, raw: string): Promise<void> {
    if (raw.length > MAX_MSG) return conn.send({ t: 'error', msg: 'Message too large' });
    let m: ClientMsg;
    try {
      m = JSON.parse(raw);
    } catch {
      return conn.send({ t: 'error', msg: 'Bad message' });
    }
    if (!m || typeof m !== 'object' || typeof (m as { t?: unknown }).t !== 'string') return conn.send({ t: 'error', msg: 'Bad message' });
    if (m.t === 'ping') return conn.send({ t: 'pong' });
    this.d.lastActive = this.io.now();
    this.io.setAlarm(this.d.lastActive + ROOM_TTL_MS);
    if (m.t === 'hello') this.hello(conn, m);
    else if (conn.seat === null) return conn.send({ t: 'error', msg: 'Say hello first' });
    else {
      try {
        this.dispatch(conn, conn.seat, m);
      } catch (e) {
        if (e instanceof RuleError) conn.send({ t: 'error', msg: e.message, id: (m as { id?: string }).id });
        else throw e;
      }
    }
    await this.io.persist(this.d);
  }

  closed(_conn: Conn): void {
    this.broadcast();
  }

  async alarm(): Promise<void> {
    if (this.io.now() - this.d.lastActive >= ROOM_TTL_MS) {
      for (const c of this.io.conns()) c.close(4000, 'Room expired');
      await this.io.destroy();
    } else this.io.setAlarm(this.d.lastActive + ROOM_TTL_MS);
  }

  // ---------- lobby ----------

  private hello(conn: Conn, m: Extract<ClientMsg, { t: 'hello' }>) {
    const d = this.d;
    if (m.rv !== RULES_VERSION) return conn.send({ t: 'error', msg: UPDATE_MSG, fatal: true, update: true });
    let seat = typeof m.token === 'string' ? d.seats.findIndex((s) => s.token === m.token) : -1;
    if (seat < 0) {
      if (d.status !== 'lobby') return conn.send({ t: 'error', msg: 'This game has already started.', fatal: true });
      if (d.seats.length >= MAX_SEATS - d.config.ai) return conn.send({ t: 'error', msg: 'This room is full.', fatal: true });
      const avatar = HUMAN_AVATARS.includes(m.avatar) ? m.avatar : HUMAN_AVATARS[d.seats.length % HUMAN_AVATARS.length];
      d.seats.push({ name: clean(m.name, `Player ${d.seats.length + 1}`), avatar, token: this.io.randomHex(24), ready: false, host: d.seats.length === 0 });
      d.seen.push([]);
      seat = d.seats.length - 1;
    }
    // One live connection per seat: a newer tab replaces the older one.
    for (const c of this.io.conns()) {
      if (c !== conn && c.seat === seat) {
        c.send({ t: 'error', msg: 'Opened on another tab or device.', fatal: true });
        this.io.setSeat(c, null);
        c.close(4001, 'Replaced');
      }
    }
    this.io.setSeat(conn, seat);
    conn.send({ t: 'welcome', seat, token: d.seats[seat].token, code: d.code });
    if (d.quick && d.status === 'lobby') {
      d.seats.forEach((x) => { x.ready = true; });
      if (d.seats.length >= 2) {
        d.config = { ...DEFAULT_CONFIG };
        d.aiNames = [];
        this.newMatch();
        return;
      }
    }
    this.broadcast();
  }

  private dispatch(conn: Conn, seat: number, m: ClientMsg) {
    const d = this.d;
    const me = d.seats[seat];
    switch (m.t) {
      case 'ready':
        if (d.status !== 'lobby') return;
        me.ready = !!m.ready;
        return this.broadcast();
      case 'config': {
        if (d.status !== 'lobby' || !me.host) throw new RuleError('Only the host can change settings');
        const c = m.config ?? ({} as RoomConfig);
        const days = ([8, 10, 14] as const).includes(c.days) ? c.days : d.config.days;
        const ai = Math.max(0, Math.min(MAX_SEATS - d.seats.length, Math.floor(Number(c.ai) || 0)));
        d.config = { days, ai, unripe: !!c.unripe, upgrades: !!c.upgrades, events: !!c.events };
        return this.broadcast();
      }
      case 'leave': {
        if (d.status !== 'lobby') return; // during a match a seat waits for its player
        d.seats.splice(seat, 1);
        d.seen.splice(seat, 1);
        if (d.seats.length && !d.seats.some((s) => s.host)) d.seats[0].host = true;
        for (const c of this.io.conns()) {
          if (c.seat === seat) { this.io.setSeat(c, null); c.close(4002, 'Left'); }
          else if (c.seat !== null && c.seat > seat) this.io.setSeat(c, c.seat - 1);
        }
        return this.broadcast();
      }
      case 'start': {
        if (d.status !== 'lobby' || !me.host) throw new RuleError('Only the host can start');
        if (d.seats.length < 2) throw new RuleError('Waiting for another player to join');
        if (d.seats.some((s) => !s.ready)) throw new RuleError('Everyone must be ready');
        const online = new Set(this.io.conns().map((c) => c.seat));
        if (d.seats.some((_, i) => !online.has(i))) throw new RuleError('A player is disconnected');
        const pool = [...RIVALS];
        d.aiNames = Array.from({ length: d.config.ai }, () => pool.splice(this.io.randomInt(pool.length), 1)[0]);
        this.newMatch();
        return;
      }
      case 'rematch': {
        if (d.status !== 'finished') return;
        if (!d.rematch.includes(seat)) d.rematch.push(seat);
        if (d.rematch.length >= d.seats.length) this.newMatch();
        else this.broadcast();
        return;
      }
      case 'continue': {
        const g = d.game;
        if (d.status !== 'playing' || !g || (g.phase !== 'morning' && g.phase !== 'reveal')) return;
        if (m.v !== d.version) return; // already moved on
        if (!d.votes.includes(seat)) d.votes.push(seat);
        if (d.votes.length >= d.seats.length) {
          d.votes = [];
          this.commit(applyAction(g, seat, { kind: g.phase === 'morning' ? 'begin' : 'finish' }));
        } else this.broadcast();
        return;
      }
      case 'act':
        return this.act(conn, seat, m);
      default:
        return;
    }
  }

  // ---------- the match ----------

  private newMatch() {
    const d = this.d;
    const players: PlayerConfig[] = [
      ...d.seats.map((s) => ({ name: s.name, kind: 'human' as const, avatar: s.avatar })),
      ...d.aiNames.map((r) => ({ name: r.name, avatar: r.avatar, quip: r.quip, kind: 'ai' as const, level: 'normal' as const })),
    ];
    const seed = (this.io.randomInt(2 ** 31 - 1) + 1) >>> 0;
    d.game = newGame({ players, days: d.config.days, unripe: d.config.unripe, upgrades: d.config.upgrades, events: d.config.events, seed });
    d.status = 'playing';
    d.pending = players.map(() => null);
    d.votes = [];
    d.rematch = [];
    d.version++;
    this.broadcast();
    this.advance();
  }

  private act(conn: Conn, seat: number, m: Extract<ClientMsg, { t: 'act' }>) {
    const d = this.d;
    const g = d.game;
    if (d.status !== 'playing' || !g) throw new RuleError('No game in progress');
    if (typeof m.id !== 'string' || m.id.length > 64) throw new RuleError('Bad action');
    const seen = d.seen[seat];
    if (seen.includes(m.id)) return conn.send({ t: 'ack', id: m.id }); // replay: already handled
    const a = m.action as Action;
    if (!a || typeof a !== 'object') throw new RuleError('Bad action');
    if (a.kind === 'begin' || a.kind === 'finish') throw new RuleError('Use continue');

    if (a.kind === 'bids') {
      if (g.phase !== 'bid') throw new RuleError('Prices are not being set now');
      if (d.pending[seat]) throw new RuleError('Your prices are already locked in');
      if (!Array.isArray(a.bids) || a.bids.length > 32) throw new RuleError('Bad prices');
      const bids: Bid[] = a.bids.map((b) => ({ customerId: Number(b.customerId), fruit: b.fruit, qty: Number(b.qty), price: Number(b.price) }));
      const favoured = !!a.favoured && g.players[seat].favours.includes('favouredTrade') && !g.players[seat].favouredTrade;
      const err = validateBids(g, seat, bids);
      if (err) throw new RuleError(err);
      d.pending[seat] = { bids: bids.filter((b) => b.qty > 0), favoured };
      this.remember(seat, m.id);
      conn.send({ t: 'ack', id: m.id });
      this.advance();
      this.broadcast();
      return;
    }

    if (m.v !== d.version) throw new RuleError('The game moved on. Try again.');
    if (a.kind === 'favour' && a.idx >= 0 && FAVOURS[g.players[seat].favours[a.idx]]?.when === 'bid') throw new RuleError('Play this with your prices');
    const next = applyAction(g, seat, a); // throws RuleError if illegal (wrong turn, no cash, etc.)
    this.remember(seat, m.id);
    conn.send({ t: 'ack', id: m.id });
    this.commit(next);
  }

  private remember(seat: number, id: string) {
    const seen = this.d.seen[seat];
    seen.push(id);
    if (seen.length > 100) seen.shift();
  }

  private commit(next: GameState) {
    this.d.game = next;
    this.d.version++;
    this.broadcast();
    this.advance();
  }

  /** Runs computer turns and resolves prices once every human has locked theirs in. */
  private advance() {
    const d = this.d;
    for (let guard = 0; guard < 500; guard++) {
      const g = d.game;
      if (!g) return;
      if (g.phase === 'over') {
        if (d.status !== 'finished') { d.status = 'finished'; d.rematch = []; this.broadcast(); }
        return;
      }
      if (g.phase === 'buy' || g.phase === 'evening') {
        const p = activePlayer(g);
        if (p < 0 || g.players[p].kind !== 'ai') return;
        const n = aiStep(g);
        if (!n) return;
        d.game = n;
        d.version++;
        this.broadcast();
        continue;
      }
      if (g.phase === 'bid') {
        const humans = g.players.map((pl, i) => (pl.kind === 'human' ? i : -1)).filter((i) => i >= 0);
        if (humans.some((i) => !d.pending[i])) return;
        let s = g;
        for (let k = 0; k < 20 && s.phase === 'bid'; k++) {
          const p = activePlayer(s);
          if (s.players[p].kind === 'human') {
            const pb = d.pending[p]!;
            s = submitBids(s, p, pb.bids, pb.favoured);
          } else s = aiStep(s)!;
        }
        d.game = s;
        d.pending = s.players.map(() => null);
        d.votes = [];
        d.version++;
        this.broadcast();
        continue;
      }
      return; // morning / reveal wait for everyone to continue
    }
  }

  // ---------- views ----------

  view(seat: number): RoomView {
    const d = this.d;
    const online = new Set(this.io.conns().map((c) => c.seat));
    const seats: PublicSeat[] = d.seats.map((s, i) => ({ seat: i, name: s.name, avatar: s.avatar, ready: s.ready, connected: online.has(i), host: s.host }));
    const g = d.game;
    const submitted = g
      ? g.players.map((pl, i) => (g.phase === 'bid' ? (pl.kind === 'human' ? !!d.pending[i] : false) : g.bids[i] !== null))
      : [];
    return {
      t: 'room', code: d.code, status: d.status, you: seat, seats, config: d.config, version: d.version,
      game: g ? redact(g, seat) : null, submitted, votes: [...d.votes], rematch: [...d.rematch], quick: !!d.quick,
    };
  }

  broadcast() {
    for (const c of this.io.conns()) if (c.seat !== null) c.send(this.view(c.seat));
  }
}
