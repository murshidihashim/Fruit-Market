// One online room: lobby, an authoritative game, secret price collection, reconnects, rematch.
// Pure logic with no Cloudflare APIs, so it can be unit-tested; worker.ts wires it to a Durable Object.
//
// Rules:
// - The server owns the only real GameState. Clients send intentions; the shared rules engine applies them.
// - For-sale crates and secret prices are held in `pending` (never sent to anyone) until every human has submitted.
//   Rules 18: a stall with no ripe fruit takes no stocking or pricing turn, so nobody waits for it. After the flip,
//   stalls holding Favoured Trade with a tied price are asked in turn, in the open (the 'tie' step); a seat that is
//   away is played by the computer, which keeps the card.
// - Rules 19: the evening is one shared step, in the open. The computers decide as it opens (a seat taken over by the
//   computer at once, whenever that happens), and every person decides at the same time; night falls when every stall
//   has said Lights out. An evening action made on an earlier state of the same evening still stands.
// - Each browser receives its own filtered view: no pending prices, no hidden favour cards,
//   no deck order and no random seed (which would reveal future customers and events), and since rules 15
//   no rival shelf and no rival crate before the bell (only how many pieces it holds).
// - Every action carries an id (duplicates are ignored) and the state version it was made on
//   (stale actions are rejected), so double taps and replays can't apply twice.
// - Nobody waits forever: a player who drops out of a match gets GRACE_MS to come back, then a
//   computer plays their seat (they can reconnect and take it back at any time).
// - PLAN-102, private rooms: people join without a shopkeeper. When the host starts, the room moves to 'picking':
//   everyone chooses at the same time (first to ask gets one), then confirms; once every person has confirmed, the
//   computers take shopkeepers from those left and the match begins. A seat that is away past the grace period, or
//   leaves, is given a free shopkeeper and counts as confirmed. Quick matches skip this step.
// - PLAN-107: a private lobby frees a seat whose person has been away for the grace period (a quick lobby frees it at
//   once). After a match, a rematch waits only for the people still connected; a seat whose person has gone is played
//   by the computer in the rematch, and its person can take it back with their seat token as in any match. On a
//   buying turn, Undo takes back purchases only: a favour card once played stays played (DEC-120).
// - PLAN-112: a public room is listed (server/lobby.ts) while it waits in the lobby with someone in it and a seat free;
//   it is taken off when it starts, fills or closes. Once a room has waited COMPUTERS_AFTER_MS, its host may start with
//   computers in the empty seats, even alone. Anyone in a room may send a preset reaction: only its id is checked and
//   passed on to everyone, as {seat, id}, at most one every REACT_GAP_MS per seat (sooner ones are dropped quietly).
// - PLAN-125: a quick room has 2, 4 or 6 stalls. People are seated with the shopkeeper they chose (or a free one) and
//   the match starts as soon as every stall has a person, or once the room has been open QUICK_FILL_MS with someone
//   still in it: Normal computers then take the empty seats and free shopkeepers. The quick-match queue asks the room
//   for a seat first (claimSeat), so it never sends more people than there are seats. There is never a host lobby.

import { daySheet, endOf, newRecord, type DaySheet, type MatchRecord } from '../src/net/matchRecord';
import { aiActFor, aiStep, computersEvening, planOrderBid } from '../src/engine/ai';
import { safeName } from './names';
import { cleanLook } from '../src/net/looks';
import { RIVALS, type FavourId } from '../src/engine/data';
import { bidOrder, canBidOrder, eveningOpen,
  activePlayer, applyAction, newGame, openStall, RuleError, submitPrices, validateCrate, validatePrices, validateStall,
  publicView, type Action, type Crate, type Customer, type GameState, type PlayerConfig, type Post, type Stall,
} from '../src/engine/game';
import { LIST_REFRESH_MS, type Listing } from './lobby';
import {
  CHARACTER_AVATARS, COMPUTERS_AFTER_MS, DEFAULT_CONFIG, isReaction, MAX_SEATS, PROTOCOL_VERSION, QUICK_FILL_MS, REACT_GAP_MS, RULES_VERSION,
  UPDATE_MSG, type ClientMsg, type PublicSeat, type QuickStalls, type RoomConfig, type RoomStatus, type RoomView, type ServerMsg,
} from '../src/net/protocol';

export const ROOM_TTL_MS = 24 * 60 * 60 * 1000;
/** How long a dropped player has to reconnect before a computer takes over their seat. */
export const GRACE_MS = 75_000;
const MAX_MSG = 16_000;
/** PLAN-125: how long a seat the quick-match queue promised stays kept for a person who is still connecting. */
export const CLAIM_MS = 10_000;
/** PLAN-125: the queue sends nobody to a quick room this close to its fill time, so they arrive before it starts. */
export const CLAIM_BEFORE_FILL_MS = 3_000;

export interface SeatData {
  name: string; avatar: string; token: string; ready: boolean; host: boolean;
  /** What this player's shopkeeper and stall wear (only known look ids, see src/net/looks.ts). */
  look?: Record<string, string>;
  /** When this player's connection dropped during a match (cleared when they come back). */
  offlineSince?: number;
  /** A computer is playing this seat because its player left. */
  bot?: boolean;
  /** PLAN-102: this person has confirmed their shopkeeper in the choosing step. */
  confirmed?: boolean;
  /** ON-09 (PLAN-110): this person left on purpose (their phone forgot the seat), so a computer plays it for good. */
  left?: boolean;
  /** PLAN-132: "Share game data" is on for this person (their hello said so; an older app says nothing: not shared). */
  share?: boolean;
}

export interface RoomData {
  code: string;
  createdAt: number;
  lastActive: number;
  status: RoomStatus;
  seats: SeatData[];
  config: RoomConfig;
  game: GameState | null;
  version: number;
  /** Hidden submissions for the current simultaneous step: a for-sale crate, or secret prices. */
  pending: ({ stall: Stall; crate?: Crate } | { posts: Post[] } | { bid: number | null } | null)[];
  votes: number[];
  rematch: number[];
  seen: string[][];
  aiNames: { name: string; avatar: string; quip: string }[];
  /** A quick-match room: strangers are seated ready and the match starts as soon as its stalls are full. */
  quick?: boolean;
  /** PLAN-125: a quick room's number of stalls (unset in a room from before: 2). */
  stalls?: QuickStalls;
  /** PLAN-125: when a waiting quick room starts with computers in the empty seats (unset in a room from before: it
   *  waits for a second person, as it always did). */
  fillAt?: number;
  /** PLAN-125: seats the quick-match queue promised to people still connecting, as the time each promise runs out. */
  claims?: number[];
  /** The state a person's buying turn began in, or just after the last favour card they played on it (DEC-120), so
   *  they can take their purchases back (never sent to anyone). */
  undo?: { seat: number; day: number; game: GameState };
  /** The latest take-back, shown to everyone as a message. */
  lastUndo?: { seat: number; n: number };
  /** Rules 19: the version the current evening opened at. An evening action made on that state or a later one still
   *  stands, since every stall decides at the same time (unset: only the latest state is accepted). */
  eveningFrom?: number;
  /** ON-13 (PLAN-110): the version at which the game last changed. A version bump that leaves the game as it was (a
   *  change of look, someone coming back, a seat handed to the computer) does not make an action stale: an action made
   *  on this version or a later one still stands (unset, in a room from before: only the latest version is accepted). */
  gameFrom?: number;
  /** PLAN-112: a public room, listed while it waits for players. */
  public?: boolean;
  /** PLAN-112: what the list was last told about this room (its listing as JSON; '' or unset: not listed). */
  listed?: string;
  /** PLAN-112: when each seat last sent a reaction that was passed on. */
  reactAt?: number[];
  /** PLAN-132: the match record being kept for the game in play (never sent to anyone in the room): its random
   *  number, the game's seed, a sheet for each day played, and whether it has gone to the store. */
  rec?: { id: string; seed: number; days: DaySheet[]; sent?: boolean };
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
  /** PLAN-132: hands a finished match's record to the store (absent in tests that do not look at records). */
  record?(rec: MatchRecord): void;
  randomInt(n: number): number;
  setAlarm(at: number): void;
  destroy(): void | Promise<void>;
  /** PLAN-112: tells the public list about this room (null: take it off). Optional: rooms in tests may have no list. */
  listRoom?(code: string, entry: Listing | null): Promise<void>;
}

/** `stalls` and `fillMs` (PLAN-125) are used by a quick room only. */
export function freshRoom(code: string, now: number, quick = false, pub = false, stalls: QuickStalls = 2, fillMs = QUICK_FILL_MS): RoomData {
  return {
    // Every room starts with the default settings. A quick match keeps upgrades (DEC-120, 2026-11-16, the owner's
    // choice): it always played with them, as its settings are the defaults when the match starts (see hello).
    code, createdAt: now, lastActive: now, status: 'lobby', seats: [], config: { ...DEFAULT_CONFIG },
    game: null, version: 0, pending: [], votes: [], rematch: [], seen: [], aiNames: [], quick,
    // A quick match is never listed: it already finds a stranger on its own.
    ...(pub && !quick ? { public: true } : {}),
    // The person the queue made this room for is still connecting: their seat is kept like any other promise, so a
    // second person looking at the same moment is sent here too.
    ...(quick ? { stalls, fillAt: now + fillMs, claims: [now + CLAIM_MS] } : {}),
  };
}

/**
 * PLAN-107 (ON-03): what a phone is told when its room code leads to no room. A phone that brings a seat token for
 * this code was in the room, which has since closed (rooms close after a day with nobody in them); any other was given
 * a wrong or old code. Sent as a fatal error, which every app since the first online version shows and stops on.
 */
export function roomGoneMsg(hello: string): string {
  let token: unknown;
  try { token = (JSON.parse(hello) as { token?: unknown }).token; } catch { /* not a hello: the plain message */ }
  return typeof token === 'string' && token ? 'That room has closed.' : 'That room doesn\'t exist or has closed. Check the code.';
}

/** Stands in for a rival's favour card: only the number of cards is public. */
const HIDDEN_FAVOUR: FavourId = 'priority';

/** The game as one player is allowed to see it. */
export function redact(g: GameState, seat: number, pending?: readonly unknown[]): GameState {
  // Rules 15, secret stalls: a rival's shelf is never sent, and its crate only as a count of pieces until the bell.
  // Rules 18: what each stall bought today stays in the view (it is public until the bell), and in the tie step only
  // the stall being asked is named.
  const v: GameState = publicView(g, seat);
  v.rng = 0;
  v.farmerDeck = [];
  v.customerDeck = [];
  v.eventDeck = [];
  v.favourDeck = [];
  v.players.forEach((pl, i) => {
    if (i !== seat) pl.favours = pl.favours.map(() => HIDDEN_FAVOUR);
  });
  if (v.results) v.results.favours = v.results.favours.map((f) => (f.player === seat ? f : { ...f, favour: HIDDEN_FAVOUR }));
  // Simultaneous steps: nobody's crate or prices show until every shop has committed.
  if (v.phase === 'stall') { v.stalls = v.stalls.map(() => null); if (v.crates) v.crates = v.crates.map(() => null); }
  if (v.phase === 'bid') v.bids = v.bids.map(() => null);
  // Rules 17: while a standing order is bid for, everyone sees who is bidding, who passed and who is still deciding;
  // the prices stay secret until every stall has decided. A person's choice is held in `pending` until then; a
  // computer stall's choice is what it will bid (planOrderBid does not depend on the other bids).
  if (v.phase === 'order' && v.standing) {
    v.standing.bids = g.players.map((pl, i) => {
      const pb = pending?.[i] as { bid?: number | null } | null | undefined;
      if (pb && 'bid' in pb) return pb.bid === null || pb.bid === undefined ? 'pass' : i === seat ? pb.bid : 'in';
      if (pl.kind === 'ai') return planOrderBid(g, i) === null ? 'pass' : 'in';
      return null;
    });
  }
  // Face-down walk-ins: only the fruit on the back, unless this player has seen the card (Gossip or Scout).
  // Rules 16: tomorrow's walk-ins (drawn in the morning) are face down the same way.
  const back = (c: Customer): Customer => (!c.walkIn || c.seenBy?.includes(seat) ? c : {
    id: c.id, name: 'Walk-in', walkIn: true,
    wants: c.wants.map((w) => ({ fruit: w.fruit, qty: 0, max: 0 })),
    original: c.original.map((w) => ({ fruit: w.fruit, qty: 0, max: 0 })),
    ...(c.seenBy ? { seenBy: c.seenBy } : {}),
  });
  v.queue = v.queue.map(back);
  v.nextQueue = (v.nextQueue ?? []).map(back);
  return v;
}

const clean = safeName;
/** PLAN-125: a quick room has no host lobby, so nobody can change its settings or start it. */
const QUICK_STARTS = 'A quick match starts by itself.';

/** Rules 19: the actions a stall takes in the evening, at the same time as the others. */
const EVENING_ACTIONS = new Set<Action['kind']>(['upgrade', 'favour', 'shade', 'endEvening']);

export class Room {
  constructor(public d: RoomData, private io: RoomIO) {}

  // ---------- connection events ----------

  async message(conn: Conn, raw: string): Promise<void> {
    if (raw.length > MAX_MSG) return conn.send({ t: 'error', msg: 'Something went wrong. Try again.' });
    let m: ClientMsg;
    try {
      m = JSON.parse(raw);
    } catch {
      return conn.send({ t: 'error', msg: 'Something went wrong. Try again.' });
    }
    if (!m || typeof m !== 'object' || typeof (m as { t?: unknown }).t !== 'string') return conn.send({ t: 'error', msg: 'Something went wrong. Try again.' });
    if (m.t === 'ping') return conn.send({ t: 'pong' });
    this.d.lastActive = this.io.now();
    if (m.t === 'hello') this.hello(conn, m);
    else if (conn.seat === null) return conn.send({ t: 'error', msg: 'Something went wrong. Try again.' });
    else if (m.t === 'react') return this.react(conn.seat, (m as { r?: unknown }).r);
    else {
      try {
        this.dispatch(conn, conn.seat, m);
      } catch (e) {
        if (e instanceof RuleError) conn.send({ t: 'error', msg: e.message, id: (m as { id?: string }).id });
        else throw e;
      }
    }
    this.schedule();
    await this.announce();
    await this.io.persist(this.d);
  }

  /** A connection went away. In a match, while shopkeepers are chosen and (PLAN-107) in a private lobby the seat starts
   *  its grace period; in a quick lobby it's freed. After a match, the rematch may now have everyone still here. */
  async closed(conn: Conn): Promise<void> {
    const d = this.d;
    const seat = conn.seat;
    const gone = seat !== null && seat < d.seats.length && !this.online().has(seat);
    if (gone && d.status === 'lobby' && d.quick) this.removeSeat(seat);
    else if (gone && d.status !== 'finished' && d.seats[seat].offlineSince === undefined) d.seats[seat].offlineSince = this.io.now();
    if (gone && d.status === 'finished' && d.rematch.length) this.tryRematch();
    else this.broadcast();
    this.schedule();
    await this.announce();
    await this.io.persist(d);
  }

  async alarm(): Promise<void> {
    if (this.io.now() - this.d.lastActive >= ROOM_TTL_MS) {
      for (const c of this.io.conns()) c.close(4000, 'Room expired');
      if (this.d.listed) { this.d.listed = ''; await this.tellList(null); }
      await this.io.destroy();
      return;
    }
    this.takeOverDropped();
    this.freeLobbySeats();
    this.startQuick();
    this.schedule();
    // A listed room says again that it is still waiting, so the list keeps it.
    await this.announce(true);
    await this.io.persist(this.d);
  }

  // ---------- the public list (PLAN-112) ----------

  /** What the public list should show of this room, or null when it should not be listed: a public room waiting in the
   *  lobby, with someone connected and a seat free (computer seats count as taken). */
  listing(): Listing | null {
    const d = this.d;
    if (!d.public || d.quick || d.status !== 'lobby' || !d.seats.length) return null;
    const taken = d.seats.length + d.config.ai;
    if (taken >= MAX_SEATS || !this.online().size) return null;
    const host = d.seats.find((x) => x.host) ?? d.seats[0];
    return { code: d.code, host: host.name, taken, days: d.config.days, openedAt: d.createdAt };
  }

  /** Tells the list when what it shows of this room has changed (or, `again`, that a listed room is still waiting). */
  private async announce(again = false) {
    const e = this.listing();
    const key = e ? JSON.stringify(e) : '';
    if (key === (this.d.listed ?? '') && !(again && e)) return;
    this.d.listed = key;
    await this.tellList(e);
  }

  private async tellList(e: Listing | null) {
    try { await this.io.listRoom?.(this.d.code, e); } catch { /* the list drops a room it stops hearing from on its own */ }
  }

  // ---------- reactions (PLAN-112) ----------

  /** A preset reaction: only a known id is passed on, to everyone in the room, with the seat that sent it and nothing
   *  else. Anything else, or one sent within REACT_GAP_MS of the seat's last, is dropped quietly. */
  private react(seat: number, r: unknown) {
    const d = this.d;
    if (!isReaction(r) || seat >= d.seats.length) return;
    const now = this.io.now();
    const at = (d.reactAt ??= []);
    if (at[seat] !== undefined && now - at[seat] < REACT_GAP_MS) return;
    at[seat] = now;
    for (const c of this.io.conns()) if (c.seat !== null) c.send({ t: 'react', seat, r });
  }

  /** One alarm per room: the next grace deadline or the expiry, whichever comes first. */
  private schedule() {
    const d = this.d;
    let at = d.lastActive + ROOM_TTL_MS;
    if (d.status === 'playing' || d.status === 'picking' || (d.status === 'lobby' && !d.quick)) {
      for (const x of d.seats) if (x.offlineSince !== undefined && !x.bot) at = Math.min(at, x.offlineSince + GRACE_MS);
    }
    if (this.listing()) at = Math.min(at, this.io.now() + LIST_REFRESH_MS);
    // PLAN-125: a waiting quick room with someone in it wakes at its fill time, or, past it, when the last person the
    // queue promised a seat should have arrived.
    if (d.quick && d.status === 'lobby' && d.fillAt !== undefined && this.online().size) {
      const claims = this.liveClaims();
      if (this.io.now() < d.fillAt) at = Math.min(at, d.fillAt);
      else if (claims.length) at = Math.min(at, ...claims);
    }
    this.io.setAlarm(at);
  }

  /** PLAN-107 (ON-05): a private lobby seat whose person has been away for the grace period is freed, as a quick lobby
   *  frees one at once, so a closed tab never holds the room up. The host's tag passes on if it was theirs. */
  private freeLobbySeats() {
    const d = this.d;
    if (d.status !== 'lobby' || d.quick) return;
    const now = this.io.now();
    const online = this.online();
    let freed = false;
    for (let i = d.seats.length - 1; i >= 0; i--) {
      const x = d.seats[i];
      if (x.offlineSince !== undefined && !online.has(i) && now - x.offlineSince >= GRACE_MS) { this.removeSeat(i); freed = true; }
    }
    if (freed) this.broadcast();
  }

  private online(): Set<number> {
    return new Set(this.io.conns().map((c) => c.seat).filter((x): x is number => x !== null));
  }

  /** Seats whose grace period has run out are handed to the computer, and the match moves on. */
  private takeOverDropped() {
    const d = this.d;
    if (d.status !== 'playing' && d.status !== 'picking') return;
    const now = this.io.now();
    let changed = false;
    d.seats.forEach((x) => {
      if (!x.bot && x.offlineSince !== undefined && now - x.offlineSince >= GRACE_MS) { x.bot = true; changed = true; }
    });
    if (!changed) return;
    if (d.status === 'picking') return this.pickedFor();
    d.undo = undefined;
    d.version++;
    this.broadcast();
    this.advance();
  }

  /** People whose vote or prices the match waits for: every seat a computer isn't playing. */
  private needed(): number[] {
    return this.d.seats.map((x, i) => (x.bot ? -1 : i)).filter((i) => i >= 0);
  }

  private removeSeat(seat: number) {
    const d = this.d;
    d.seats.splice(seat, 1);
    d.seen.splice(seat, 1);
    if (d.seats.length && !d.seats.some((x) => x.host)) d.seats[0].host = true;
    for (const c of this.io.conns()) {
      if (c.seat === seat) { this.io.setSeat(c, null); c.close(4002, 'Left'); }
      else if (c.seat !== null && c.seat > seat) this.io.setSeat(c, c.seat - 1);
    }
  }

  // ---------- lobby ----------

  private hello(conn: Conn, m: Extract<ClientMsg, { t: 'hello' }>) {
    const d = this.d;
    if (m.rv !== RULES_VERSION || m.pv !== PROTOCOL_VERSION) return conn.send({ t: 'error', msg: UPDATE_MSG, fatal: true, update: true });
    let seat = typeof m.token === 'string' ? d.seats.findIndex((s) => s.token === m.token) : -1;
    if (seat < 0) {
      // ON-15 (PLAN-110): a newcomer to a finished room is told so, not that it has started.
      if (d.status !== 'lobby') return conn.send({ t: 'error', msg: d.status === 'finished' ? 'This game has finished.' : 'This game has already started.', fatal: true });
      if (d.seats.length >= (d.quick ? this.stalls() : MAX_SEATS - d.config.ai)) return conn.send({ t: 'error', msg: 'This room is full.', fatal: true });
      // Quick match: each seat gets its own character, the one asked for if it is free, otherwise the first free one.
      // A private room (PLAN-102): nobody has a shopkeeper until the choosing step after the host starts.
      const taken = new Set(d.seats.map((x) => x.avatar));
      const free = CHARACTER_AVATARS.filter((a) => !taken.has(a));
      const avatar = !d.quick ? '' : CHARACTER_AVATARS.includes(m.avatar) && !taken.has(m.avatar) ? m.avatar : (free[0] ?? CHARACTER_AVATARS[0]);
      const look = cleanLook(m.look);
      d.seats.push({ name: clean(m.name, `Player ${d.seats.length + 1}`), avatar, token: this.io.randomHex(24), ready: false, host: d.seats.length === 0, ...(Object.keys(look).length ? { look } : {}) });
      d.seen.push([]);
      seat = d.seats.length - 1;
      // PLAN-125: the seat the queue kept for this person is now taken.
      if (d.quick) { this.liveClaims(); d.claims?.shift(); }
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
    // PLAN-132: the person's own "Share game data" switch, as their app says it now.
    d.seats[seat].share = m.share === true;
    // Back in time (or later): the seat is theirs again. Back while shopkeepers are still being chosen after the
    // computer chose for them: they may change it and confirm again.
    if (d.seats[seat].offlineSince !== undefined || d.seats[seat].bot) {
      if (d.status === 'picking' && d.seats[seat].bot) delete d.seats[seat].confirmed;
      delete d.seats[seat].offlineSince;
      delete d.seats[seat].bot;
      delete d.seats[seat].left;
      d.version++;
    }
    conn.send({ t: 'welcome', seat, token: d.seats[seat].token, code: d.code });
    if (d.quick && d.status === 'lobby') {
      d.seats.forEach((x) => { x.ready = true; });
      if (this.startQuick()) return;
    }
    this.broadcast();
  }

  /** One message from a seated person: each kind goes to its own step below. */
  private dispatch(conn: Conn, seat: number, m: ClientMsg) {
    switch (m.t) {
      case 'character': return this.character(seat, m.avatar);
      case 'confirm': return this.confirmPick(seat);
      case 'look': return this.wear(seat, m.look);
      case 'rename': return this.rename(seat, m.name);
      case 'undo': return this.undo(conn, seat, m);
      case 'ready': return this.setReady(seat, m.ready);
      case 'config': return this.setConfig(seat, m.config);
      case 'leave': return this.leave(seat);
      case 'start': return this.start(seat, m.computers);
      case 'rematch': return this.rematch(seat);
      case 'continue': return this.continueVote(seat, m.v);
      case 'act': return this.act(conn, seat, m);
      default: return;
    }
  }

  /** PLAN-102: shopkeepers are chosen after the host starts, first come, and can be changed until confirmed. */
  private character(seat: number, avatar: string) {
    const d = this.d;
    const me = d.seats[seat];
    if (d.status !== 'picking' || me.confirmed) return;
    if (!CHARACTER_AVATARS.includes(avatar)) throw new RuleError('Pick one of the eight shopkeepers');
    if (d.seats.some((x, i) => i !== seat && x.avatar === avatar)) throw new RuleError('That shopkeeper is taken');
    me.avatar = avatar;
    d.version++;
    return this.broadcast();
  }

  private confirmPick(seat: number) {
    const d = this.d;
    const me = d.seats[seat];
    if (d.status !== 'picking' || me.confirmed) return;
    if (!me.avatar) throw new RuleError('Choose a shopkeeper first');
    me.confirmed = true;
    d.version++;
    return this.pickedFor();
  }

  /** Looks are only for show, so they may change at any time, even mid-match. */
  private wear(seat: number, raw: unknown) {
    const d = this.d;
    const me = d.seats[seat];
    const look = cleanLook(raw);
    if (Object.keys(look).length) me.look = look; else delete me.look;
    const pl = d.game?.players[seat];
    if (pl) { if (me.look) pl.look = { ...me.look }; else delete pl.look; d.version++; }
    return this.broadcast();
  }

  private rename(seat: number, name: unknown) {
    const d = this.d;
    const me = d.seats[seat];
    if (d.status !== 'lobby') throw new RuleError('You can change your name in the lobby only');
    me.name = clean(typeof name === 'string' ? name : '', me.name);
    return this.broadcast();
  }

  private setReady(seat: number, ready: unknown) {
    const d = this.d;
    if (d.status !== 'lobby') return;
    d.seats[seat].ready = !!ready;
    return this.broadcast();
  }

  private setConfig(seat: number, config: RoomConfig | undefined) {
    const d = this.d;
    if (d.quick) throw new RuleError(QUICK_STARTS);
    if (d.status !== 'lobby' || !d.seats[seat].host) throw new RuleError('Only the host can change settings');
    const c = config ?? ({} as RoomConfig);
    const days = ([8, 10, 14] as const).includes(c.days) ? c.days : d.config.days;
    const ai = Math.max(0, Math.min(MAX_SEATS - d.seats.length, Math.floor(Number(c.ai) || 0)));
    d.config = { days, ai, unripe: !!c.unripe, upgrades: !!c.upgrades, events: !!c.events };
    return this.broadcast();
  }

  private leave(seat: number) {
    const d = this.d;
    const me = d.seats[seat];
    if (d.status === 'picking') {
      // Leaving while shopkeepers are chosen: the seat is given one and a computer will play it.
      me.bot = true;
      me.left = true;
      me.offlineSince ??= this.io.now();
      return this.pickedFor();
    }
    if (d.status === 'playing') {
      // Leaving a match on purpose: a computer takes the seat straight away.
      me.bot = true;
      me.left = true;
      me.offlineSince ??= this.io.now();
      d.undo = undefined;
      d.version++;
      this.broadcast();
      this.advance();
      return;
    }
    if (d.status !== 'lobby') return;
    this.removeSeat(seat);
    return this.broadcast();
  }

  private start(seat: number, withComputers: unknown) {
    const d = this.d;
    const me = d.seats[seat];
    if (d.quick) throw new RuleError(QUICK_STARTS);
    if (d.status !== 'lobby' || !me.host) throw new RuleError('Only the host can start');
    // PLAN-112: after the wait, the host may fill every empty seat with a computer and start, even alone. Their own
    // tap counts as ready; everyone else in the room must still be ready and here.
    const computers = withComputers === true;
    if (computers && this.io.now() - d.createdAt < COMPUTERS_AFTER_MS) throw new RuleError('Wait a minute for players to join first.');
    if (d.seats.length < 2 && !computers) throw new RuleError('Waiting for another player to join');
    if (d.seats.some((s, i) => !s.ready && !(computers && i === seat))) throw new RuleError('Everyone needs to be ready first.');
    const online = new Set(this.io.conns().map((c) => c.seat));
    if (d.seats.some((_, i) => !online.has(i))) throw new RuleError('A player is disconnected');
    if (computers) {
      me.ready = true;
      d.config = { ...d.config, ai: MAX_SEATS - d.seats.length };
    }
    // PLAN-102: everyone now chooses a shopkeeper; the match begins when every person has confirmed.
    d.seats.forEach((x) => { x.avatar = ''; delete x.confirmed; });
    d.status = 'picking';
    d.version++;
    return this.broadcast();
  }

  private rematch(seat: number) {
    const d = this.d;
    if (d.status !== 'finished') return;
    if (!d.rematch.includes(seat)) d.rematch.push(seat);
    return this.tryRematch();
  }

  private continueVote(seat: number, v: unknown) {
    const d = this.d;
    const g = d.game;
    if (d.status !== 'playing' || !g || (g.phase !== 'morning' && g.phase !== 'reveal')) return;
    if (!this.current(v)) return; // already moved on
    if (!d.votes.includes(seat)) d.votes.push(seat);
    if (!this.tryContinue()) this.broadcast();
  }

  // ---------- choosing shopkeepers (PLAN-102) ----------

  /** A seat nobody is choosing for (its person left, or is away past the grace period) gets a free shopkeeper and
   *  counts as confirmed; once every seat has confirmed, the computers take shopkeepers from those left and the
   *  match begins. Otherwise everyone is shown who has confirmed. */
  private pickedFor() {
    const d = this.d;
    if (d.status !== 'picking') return;
    const free = () => CHARACTER_AVATARS.filter((a) => !d.seats.some((x) => x.avatar === a));
    for (const x of d.seats) {
      if (!x.bot || x.confirmed) continue;
      if (!x.avatar) { const f = free(); x.avatar = f[this.io.randomInt(f.length)]; }
      x.confirmed = true;
    }
    d.version++;
    // If every person has left, wait: nobody is there to play, and the room will expire.
    if (!this.needed().length || !d.seats.every((x) => x.confirmed)) return this.broadcast();
    const usedByPeople = new Set(d.seats.map((x) => x.avatar));
    const pool = RIVALS.filter((r) => !usedByPeople.has(r.avatar));
    d.aiNames = Array.from({ length: d.config.ai }, () => pool.splice(this.io.randomInt(pool.length), 1)[0]);
    this.newMatch();
  }

  // ---------- the match ----------

  /** PLAN-107 (ON-04, the backlog's B-01 item 3): the rematch starts once every person still connected has asked for
   *  it. A seat whose person has gone (Home, or the app closed) is played by the computer from the start, and its person
   *  can take it back with their seat token. Nobody here: nothing starts. */
  private tryRematch() {
    const d = this.d;
    const online = this.online();
    const here = this.needed().filter((i) => online.has(i));
    if (!here.length || !here.every((i) => d.rematch.includes(i))) return this.broadcast();
    const now = this.io.now();
    d.seats.forEach((x, i) => {
      if (online.has(i) || x.bot) return;
      x.bot = true;
      x.offlineSince ??= now;
    });
    this.newMatch();
  }

  private newMatch() {
    const d = this.d;
    const players: PlayerConfig[] = [
      ...d.seats.map((s) => ({ name: s.name, kind: 'human' as const, avatar: s.avatar, ...(s.look ? { look: { ...s.look } } : {}) })),
      ...d.aiNames.map((r) => ({ name: r.name, avatar: r.avatar, quip: r.quip, kind: 'ai' as const, level: 'normal' as const })),
    ];
    const seed = (this.io.randomInt(2 ** 31 - 1) + 1) >>> 0;
    d.game = newGame({ players, days: d.config.days, unripe: d.config.unripe, upgrades: d.config.upgrades, events: d.config.events, seed });
    d.status = 'playing';
    d.pending = players.map(() => null);
    d.votes = [];
    d.rematch = [];
    d.undo = undefined;
    d.lastUndo = undefined;
    this.moved();
    this.broadcast();
    this.advance();
  }

  private act(conn: Conn, seat: number, m: Extract<ClientMsg, { t: 'act' }>) {
    const d = this.d;
    const g = d.game;
    if (d.status !== 'playing' || !g) throw new RuleError('No game in progress');
    if (typeof m.id !== 'string' || m.id.length > 64) throw new RuleError('Something went wrong. Try again.');
    const seen = d.seen[seat];
    if (seen.includes(m.id)) return conn.send({ t: 'ack', id: m.id }); // replay: already handled
    const a = m.action as Action;
    if (!a || typeof a !== 'object') throw new RuleError('Something went wrong. Try again.');
    if (a.kind === 'begin' || a.kind === 'finish') throw new RuleError('Something went wrong. Try again.');

    if (a.kind === 'stall') {
      if (g.phase !== 'stall') throw new RuleError('It\'s not time to fill crates.');
      if (g.stalls[seat] !== null) throw new RuleError('You have no ripe fruit to sell today');
      if (d.pending[seat]) throw new RuleError('Your crate is already set.');
      if (!a.stall || typeof a.stall !== 'object' || Array.isArray(a.stall)) throw new RuleError('Something went wrong. Try again.');
      const stall: Stall = {};
      for (const [f, n] of Object.entries(a.stall).slice(0, 8)) stall[f as keyof Stall] = Number(n);
      // Rules 12: the exact pieces, one count per shelf space for each fruit (optional; without it the oldest go out).
      let crate: Crate | undefined;
      if (a.crate !== undefined) {
        if (!a.crate || typeof a.crate !== 'object' || Array.isArray(a.crate)) throw new RuleError('Something went wrong. Try again.');
        crate = {};
        for (const [f, t] of Object.entries(a.crate).slice(0, 8)) {
          if (!Array.isArray(t) || t.length > 12) throw new RuleError('Something went wrong. Try again.');
          crate[f as keyof Crate] = t.map(Number);
        }
        const bad = validateCrate(g, seat, crate);
        if (bad) throw new RuleError(bad);
      }
      const err = crate ? null : validateStall(g, seat, stall);
      if (err) throw new RuleError(err);
      d.pending[seat] = crate ? { stall, crate } : { stall };
      return this.accepted(conn, seat, m.id);
    }
    if (a.kind === 'order') {
      if (g.phase !== 'order') throw new RuleError('There is no standing order to bid for now.');
      // Rules 17: a bid may be changed for as long as another stall is still deciding (the step resolves the moment
      // the last person decides, so a bid that reaches here is still open).
      const bid = a.price === null ? null : Number(a.price);
      const err = canBidOrder(g, seat, bid);
      if (err) throw new RuleError(err);
      d.pending[seat] = { bid };
      return this.accepted(conn, seat, m.id);
    }
    if (a.kind === 'prices') {
      if (g.phase !== 'bid') throw new RuleError('Prices are not being set now');
      if (d.pending[seat]) throw new RuleError('Your prices are already sealed.');
      if (!Array.isArray(a.posts) || a.posts.length > 8) throw new RuleError('Something went wrong. Try again.');
      const posts: Post[] = a.posts.map((b) => ({ fruit: b.fruit, price: Number(b.price) }));
      const err = validatePrices(g, seat, posts);
      if (err) throw new RuleError(err);
      d.pending[seat] = { posts };
      return this.accepted(conn, seat, m.id);
    }

    // Rules 19: in the evening each stall's choices touch only its own stall (Priority is settled by the line-up at
    // nightfall), so another person's choice made meanwhile does not make this one stale. The engine checks that this
    // stall has not said Lights out.
    const sameEvening = g.phase === 'evening' && EVENING_ACTIONS.has(a.kind) && typeof m.v === 'number'
      && d.eveningFrom !== undefined && m.v >= d.eveningFrom && m.v <= d.version;
    if (!this.current(m.v) && !sameEvening) throw new RuleError('The game moved on. Try again.');
    this.markTurnStart(g, seat);
    const next = applyAction(g, seat, a); // throws RuleError if illegal (wrong turn, no cash, etc.)
    // S3 (DEC-120): a favour card played on a buying turn stays played. Undo now goes back to just after it, so the
    // card, and what it showed (Scout), can never be taken back; purchases made before it stay too.
    if (a.kind === 'favour' && g.phase === 'buy' && next.phase === 'buy' && activePlayer(next) === seat) {
      this.d.undo = { seat, day: g.day, game: JSON.parse(JSON.stringify(next)) };
    }
    this.remember(seat, m.id);
    conn.send({ t: 'ack', id: m.id });
    this.commit(next);
  }

  /** ON-13 (PLAN-110): was a message made on the game as it is now? Its version is the latest, or one from after the
   *  game last changed (the versions since only changed a look, or who is connected). */
  private current(v: unknown): boolean {
    const d = this.d;
    return typeof v === 'number' && v <= d.version && v >= (d.gameFrom ?? d.version);
  }

  /** The game has changed: a new version, and actions made on an older one are stale. */
  private moved() {
    this.d.version++;
    this.d.gameFrom = this.d.version;
    this.noteRecord();
  }

  /**
   * PLAN-132: the match record. A sheet is added for each day as its rush is worked out, and when the game is over the
   * record goes to the store, but only if every person in the match shares game data. It holds no name, look, token or
   * room code (matchRecord.ts), and nothing of it is ever sent to a player.
   */
  private noteRecord() {
    const d = this.d;
    const g = d.game;
    if (!g) return;
    if (!d.rec || d.rec.seed !== g.config.seed) d.rec = { id: this.io.randomHex(8), seed: g.config.seed, days: [] };
    const rec = d.rec;
    if (g.phase === 'reveal' && !rec.days.some((x) => x.d === g.day)) {
      const sheet = daySheet(g);
      if (sheet) rec.days.push(sheet);
    }
    if (g.phase !== 'over' || rec.sent) return;
    rec.sent = true;
    const people = d.seats.filter((_, p) => g.players[p]?.kind === 'human');
    if (!people.length || !people.every((x) => x.share === true)) return;
    this.io.record?.({ ...newRecord(rec.id, 'online', g), days: rec.days, end: endOf(g) });
  }

  /** Remembers the state a person's buying turn began in (the first action of the turn), so they can take purchases back. */
  private markTurnStart(g: GameState, seat: number) {
    if (g.phase !== 'buy' || activePlayer(g) !== seat) return;
    const u = this.d.undo;
    if (u && u.seat === seat && u.day === g.day) return;
    this.d.undo = { seat, day: g.day, game: JSON.parse(JSON.stringify(g)) };
  }

  /** Design 1 (PLAN-023): the server puts the active player back to where their own buying turn began, or (DEC-120) to
   *  just after the last favour card they played on it. */
  private undo(conn: Conn, seat: number, m: Extract<ClientMsg, { t: 'undo' }>) {
    const d = this.d;
    const g = d.game;
    if (d.status !== 'playing' || !g) throw new RuleError('No game in progress');
    if (typeof m.id !== 'string' || m.id.length > 64) throw new RuleError('Something went wrong. Try again.');
    if (d.seen[seat].includes(m.id)) return conn.send({ t: 'ack', id: m.id }); // replay: already handled
    if (!this.current(m.v)) throw new RuleError('The game moved on. Try again.');
    if (g.phase !== 'buy' || activePlayer(g) !== seat || d.seats[seat].bot) throw new RuleError('You can take back purchases during your own buying turn only');
    const u = d.undo;
    if (!u || u.seat !== seat || u.day !== g.day || u.game.phase !== 'buy' || activePlayer(u.game) !== seat) throw new RuleError('Nothing to take back');
    const mine = (x: GameState) => JSON.stringify([x.players[seat], x.market]);
    if (mine(u.game) === mine(g)) throw new RuleError('Nothing to take back');
    d.game = JSON.parse(JSON.stringify(u.game));
    this.remember(seat, m.id);
    conn.send({ t: 'ack', id: m.id });
    d.lastUndo = { seat, n: (d.lastUndo?.n ?? 0) + 1 };
    this.moved();
    this.broadcast();
    this.advance();
  }

  /** A hidden submission was stored: acknowledge it and resolve the step if everyone is in. */
  private accepted(conn: Conn, seat: number, id: string) {
    this.remember(seat, id);
    conn.send({ t: 'ack', id });
    this.advance();
    this.broadcast();
  }

  /** Morning and after-sales screens move on once everyone still playing has pressed continue. */
  private tryContinue(): boolean {
    const d = this.d;
    const g = d.game;
    if (!g || (g.phase !== 'morning' && g.phase !== 'reveal')) return false;
    const need = this.needed();
    if (!need.length || !need.every((i) => d.votes.includes(i))) return false;
    d.votes = [];
    this.commit(applyAction(g, need[0], { kind: g.phase === 'morning' ? 'begin' : 'finish' }));
    return true;
  }

  private remember(seat: number, id: string) {
    const seen = this.d.seen[seat];
    seen.push(id);
    if (seen.length > 100) seen.shift();
  }

  private commit(next: GameState) {
    const d = this.d;
    const was = d.game;
    // Rules 19: the computers' evening choices are made as the evening opens and arrive with it, so every phone shows
    // them together (and nobody's evening sheet is drawn before them).
    d.game = (next.phase === 'evening' && computersEvening(next, (p) => this.computer(next, p))) || next;
    this.moved();
    if (d.game.phase === 'evening' && !(was?.phase === 'evening' && was.day === d.game.day)) d.eveningFrom = d.version;
    this.broadcast();
    this.advance();
  }

  /** A stall the computer decides for: a computer stall, or a seat it is minding for a person who left. */
  private computer(g: GameState, p: number): boolean {
    return g.players[p]?.kind === 'ai' || (p < this.d.seats.length && !!this.d.seats[p].bot);
  }

  /** Runs computer turns and resolves prices once every human has locked theirs in. */
  private advance() {
    const d = this.d;
    // If every person has left, freeze: nobody is watching and the room will expire.
    if (!this.needed().length) return;
    const isBot = (p: number) => p < d.seats.length && !!d.seats[p].bot;
    for (let guard = 0; guard < 500; guard++) {
      const g = d.game;
      if (!g) return;
      if (g.phase === 'over') {
        if (d.status !== 'finished') { d.status = 'finished'; d.rematch = []; this.broadcast(); }
        return;
      }
      // Rules 19: the evening, everyone at once. Any computer still deciding (a seat just taken over) decides now, and
      // the room then waits only for the people who have not said Lights out. When the last stall to close is a
      // computer, its Lights out brings the night as a step of its own, after its choices have been shown.
      if (g.phase === 'evening') {
        const shown = computersEvening(g, (p) => this.computer(g, p));
        const last = shown ? null : g.order.find((p) => eveningOpen(g, p) && this.computer(g, p));
        const n = shown ?? (last === undefined || last === null ? null : aiActFor(g, last));
        if (!n) return;
        d.undo = undefined;
        d.game = n;
        this.moved();
        this.broadcast();
        continue;
      }
      // Turns taken in the open, one stall at a time: buying and (rules 18) the tie step.
      if (g.phase === 'buy' || g.phase === 'tie') {
        const p = activePlayer(g);
        if (p < 0 || (g.players[p].kind !== 'ai' && !isBot(p))) return;
        const n = isBot(p) ? aiActFor(g, p) : aiStep(g);
        if (!n) return;
        d.undo = undefined;
        d.game = n;
        this.moved();
        this.broadcast();
        continue;
      }
      if (g.phase === 'stall' || g.phase === 'bid' || g.phase === 'order') {
        const step = g.phase;
        const humans = g.players.map((pl, i) => (pl.kind === 'human' && !isBot(i) ? i : -1)).filter((i) => i >= 0);
        if (humans.some((i) => this.owes(g, i) && !d.pending[i])) return;
        let s = g;
        for (let k = 0; k < 20 && s.phase === step; k++) {
          const p = activePlayer(s);
          const pb = d.pending[p];
          if (s.players[p].kind === 'human' && pb && 'stall' in pb) s = openStall(s, p, pb.stall, pb.crate);
          else if (s.players[p].kind === 'human' && pb && 'posts' in pb) s = submitPrices(s, p, pb.posts);
          else if (s.players[p].kind === 'human' && pb && 'bid' in pb) s = bidOrder(s, p, pb.bid);
          else s = (s.players[p].kind === 'ai' ? aiStep(s) : aiActFor(s, p))!;
        }
        d.game = s;
        d.pending = s.players.map(() => null);
        d.votes = [];
        this.moved();
        this.broadcast();
        continue;
      }
      // Morning / after sales: wait for everyone still playing to continue.
      if (!this.tryContinue()) return;
    }
  }

  /** Does the game still need this seat's hidden choice in the current simultaneous step? Rules 18: a stall with no
   *  ripe fruit is already open with nothing out, and a stall with nothing out has no prices to set. */
  private owes(g: GameState, i: number): boolean {
    if (g.phase === 'stall') return g.stalls[i] === null;
    if (g.phase === 'bid') return g.bids[i] === null;
    return g.phase === 'order';
  }

  // ---------- quick match (PLAN-125) ----------

  private stalls(): QuickStalls {
    return this.d.stalls ?? 2;
  }

  /** The queue's promises that have not run out (the ones that have are dropped). */
  private liveClaims(): number[] {
    const d = this.d;
    if (!d.claims) return [];
    const now = this.io.now();
    d.claims = d.claims.filter((t) => t > now);
    if (!d.claims.length) delete d.claims;
    return d.claims ?? [];
  }

  /** A waiting quick room with someone in it or on the way, a seat nobody has or was promised, and time left to arrive
   *  before it fills. */
  waitingForMore(): boolean {
    const d = this.d;
    if (!d.quick || d.status !== 'lobby') return false;
    const claims = this.liveClaims().length;
    if (!this.online().size && !claims) return false;
    if (d.fillAt !== undefined && this.io.now() >= d.fillAt - CLAIM_BEFORE_FILL_MS) return false;
    return d.seats.length + claims < this.stalls();
  }

  /** The queue asks for a seat for the next person: kept for CLAIM_MS. False when this room should not get them. */
  async claimSeat(): Promise<boolean> {
    if (!this.waitingForMore()) return false;
    (this.d.claims ??= []).push(this.io.now() + CLAIM_MS);
    this.schedule();
    await this.io.persist(this.d);
    return true;
  }

  /** A waiting quick room starts when every stall has a person here, or at its fill time with someone here and nobody
   *  the queue sent still on the way: Normal computers take the empty seats, with shopkeepers nobody has. */
  private startQuick(): boolean {
    const d = this.d;
    if (!d.quick || d.status !== 'lobby' || !d.seats.length) return false;
    const online = this.online();
    if (!d.seats.every((_, i) => online.has(i))) return false;
    const full = d.seats.length >= this.stalls();
    const due = d.fillAt !== undefined && this.io.now() >= d.fillAt && !this.liveClaims().length;
    if (!full && !due) return false;
    const ai = Math.max(0, this.stalls() - d.seats.length);
    const used = new Set(d.seats.map((x) => x.avatar));
    const pool = RIVALS.filter((r) => !used.has(r.avatar));
    d.config = { ...DEFAULT_CONFIG, ai };
    d.aiNames = Array.from({ length: ai }, () => pool.splice(this.io.randomInt(pool.length), 1)[0]);
    delete d.claims;
    this.newMatch();
    return true;
  }

  // ---------- views ----------

  view(seat: number): RoomView {
    const d = this.d;
    const online = new Set(this.io.conns().map((c) => c.seat));
    const seats: PublicSeat[] = d.seats.map((s, i) => ({
      seat: i, name: s.name, avatar: s.avatar, ready: s.ready, connected: online.has(i), host: s.host,
      ...(s.look ? { look: s.look } : {}),
      ...(s.confirmed ? { confirmed: true } : {}),
      ...(s.offlineSince !== undefined && !online.has(i) ? { offlineSince: s.offlineSince, takeoverAt: s.offlineSince + GRACE_MS } : {}),
      ...(s.bot ? { bot: true } : {}),
      ...(s.left ? { left: true } : {}),
    }));
    const g = d.game;
    const submitted = g
      ? g.players.map((pl, i) => (g.phase === 'stall' || g.phase === 'bid' || g.phase === 'order' ? (pl.kind === 'human' ? !!d.pending[i] || !this.owes(g, i) : false) : g.bids[i] !== null))
      : [];
    return {
      t: 'room', code: d.code, status: d.status, you: seat, seats, config: d.config, version: d.version,
      game: g ? redact(g, seat, d.pending) : null, submitted, votes: [...d.votes], rematch: [...d.rematch],
      ...(d.quick ? { quick: { stalls: this.stalls(), ...(d.status === 'lobby' && d.fillAt !== undefined ? { fillAt: d.fillAt } : {}) } } : {}),
      ...(d.lastUndo ? { undone: d.lastUndo } : {}),
      ...(d.public ? { public: true } : {}),
      ...(d.status === 'lobby' ? { waited: Math.max(0, this.io.now() - d.createdAt) } : {}),
    };
  }

  broadcast() {
    for (const c of this.io.conns()) if (c.seat !== null) c.send(this.view(c.seat));
  }
}
