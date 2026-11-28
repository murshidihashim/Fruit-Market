import { cleanRecord, type MatchRecord } from '../src/net/matchRecord';
import { describe, expect, it } from 'vitest';
import { planPrices, planStall } from '../src/engine/ai';
import { FRUITS, type FavourId } from '../src/engine/data';
import { activePlayer, canBuy, emptyStock, eveningOpen, newGame, type GameState } from '../src/engine/game';
import { CHARACTER_AVATARS, PROTOCOL_VERSION, QUICK_FILL_MS, REACT_GAP_MS, REACTIONS, RULES_VERSION, UPDATE_MSG, type ClientMsg, type RoomView, type ServerMsg } from '../src/net/protocol';
import type { Listing } from '../server/lobby';
import { CLAIM_BEFORE_FILL_MS, CLAIM_MS, freshRoom, GRACE_MS, redact, Room, roomGoneMsg, ROOM_TTL_MS, type Conn, type RoomIO } from '../server/room';

class Client implements Conn {
  seat: number | null = null;
  inbox: string[] = [];
  closed = false;
  token = '';
  constructor(public id: string, private h: Harness) {}
  send(msg: ServerMsg) {
    const raw = JSON.stringify(msg);
    this.inbox.push(raw);
    if (msg.t === 'welcome') this.token = msg.token;
  }
  close() { this.closed = true; this.h.drop(this); }
  get view(): RoomView | null {
    for (let i = this.inbox.length - 1; i >= 0; i--) { const m = JSON.parse(this.inbox[i]); if (m.t === 'room') return m; }
    return null;
  }
  get errors(): string[] { return this.inbox.map((r) => JSON.parse(r)).filter((m) => m.t === 'error').map((m) => m.msg); }
  async say(msg: ClientMsg) { await this.h.room.message(this, JSON.stringify(msg)); }
}

class Harness implements RoomIO {
  list: Client[] = [];
  t = 1_000_000;
  alarmAt = 0;
  destroyed = false;
  n = 0;
  room = new Room(freshRoom('TESTAB', this.t), this);
  conns() { return this.list; }
  setSeat(c: Conn, seat: number | null) { c.seat = seat; }
  persist() {}
  now() { return this.t; }
  randomHex(b: number) { return Array.from({ length: b }, () => Math.floor(Math.random() * 256).toString(16).padStart(2, '0')).join(''); }
  randomInt(n: number) { return (this.n++ * 7919) % n; }
  setAlarm(at: number) { this.alarmAt = at; }
  destroy() { this.destroyed = true; }
  /** PLAN-132: the match records the room handed to the store. */
  records: MatchRecord[] = [];
  record(r: MatchRecord) { this.records.push(r); }
  connect(id: string) { const c = new Client(id, this); this.list.push(c); return c; }
  drop(c: Client) { this.list = this.list.filter((x) => x !== c); this.room.closed(c); }
}

let ids = 0;
const nid = () => `a${ids++}`;

async function lobbyOf2(h: Harness) {
  const a = h.connect('A');
  const b = h.connect('B');
  await a.say({ t: 'hello', rv: RULES_VERSION, pv: PROTOCOL_VERSION, name: 'Murshidi', avatar: '🧑‍🍳' });
  await b.say({ t: 'hello', rv: RULES_VERSION, pv: PROTOCOL_VERSION, name: 'Friend', avatar: '👩‍🍳' });
  return { a, b };
}

async function start(_h: Harness, a: Client, b: Client, days: 8 | 10 | 14 = 8, ai = 0) {
  await a.say({ t: 'config', config: { days, ai, unripe: true, upgrades: true, events: true } });
  await a.say({ t: 'ready', ready: true });
  await b.say({ t: 'ready', ready: true });
  await a.say({ t: 'start' });
  await pickAll(a, b);
}

/** PLAN-102: in the choosing step each person takes the first shopkeeper nobody has, in turn, and confirms. */
async function pickAll(...cs: Client[]) {
  for (const c of cs) {
    await c.say({ t: 'character', avatar: firstFree(c) });
    await c.say({ t: 'confirm' });
  }
}
const firstFree = (c: Client) => { const used = new Set(c.view!.seats.map((x) => x.avatar)); return CHARACTER_AVATARS.find((x) => !used.has(x))!; };

/** One sensible move for a client, decided only from its own filtered view. */
async function botStep(c: Client): Promise<boolean> {
  const v = c.view!;
  const g = v.game;
  if (!g || v.status !== 'playing') return false;
  const me = v.you;
  if ((g.phase === 'morning' || g.phase === 'reveal') && !v.votes.includes(me)) { await c.say({ t: 'continue', v: v.version }); return true; }
  if (g.phase === 'buy' && activePlayer(g) === me) {
    if (g.players[me].boughtToday < 2) {
      for (const f of FRUITS) for (let pos = 0; pos < g.market[f].length; pos++) {
        if (!canBuy(g, me, f, pos)) { await c.say({ t: 'act', id: nid(), v: v.version, action: { kind: 'buy', fruit: f, pos } }); return true; }
      }
    }
    await c.say({ t: 'act', id: nid(), v: v.version, action: { kind: 'endBuy' } });
    return true;
  }
  if (g.phase === 'stall' && !v.submitted[me]) {
    await c.say({ t: 'act', id: nid(), v: v.version, action: { kind: 'stall', stall: planStall(g, me) } });
    return true;
  }
  if (g.phase === 'bid' && !v.submitted[me]) {
    const { posts } = planPrices(g, me);
    await c.say({ t: 'act', id: nid(), v: v.version, action: { kind: 'prices', posts } });
    return true;
  }
  if (g.phase === 'order' && !v.submitted[me]) { await c.say({ t: 'act', id: nid(), v: v.version, action: { kind: 'order', price: null } }); return true; }
  // Rules 19: in the evening every person decides at the same time, until they say Lights out.
  if (g.phase === 'evening' && eveningOpen(g, me)) { await c.say({ t: 'act', id: nid(), v: v.version, action: { kind: 'endEvening' } }); return true; }
  // Rules 18: after the flip a stall holding Favoured Trade with a tied price is asked whether to play it.
  if (g.phase === 'tie' && activePlayer(g) === me) { await c.say({ t: 'act', id: nid(), v: v.version, action: { kind: 'tie', play: false } }); return true; }
  return false;
}

async function playOut(h: Harness, a: Client, b: Client) {
  for (let i = 0; i < 4000 && h.room.d.status === 'playing'; i++) {
    const moved = (await botStep(a)) || (await botStep(b));
    if (!moved) throw new Error(`stuck in ${h.room.d.game?.phase}`);
  }
}

describe('online room', () => {
  it('plays a full two-player match with one authoritative result', async () => {
    const h = new Harness();
    const { a, b } = await lobbyOf2(h);
    await start(h, a, b, 8);
    expect(h.room.d.status).toBe('playing');
    await playOut(h, a, b);
    expect(h.room.d.status).toBe('finished');
    const va = a.view!, vb = b.view!;
    expect(va.version).toBe(vb.version);
    expect(va.game!.players.map((p) => p.cash)).toEqual(vb.game!.players.map((p) => p.cash));
    expect(va.game!.players.map((p) => p.cash)).toEqual(h.room.d.game!.players.map((p) => p.cash));
  });

  it('also plays with computer rivals', async () => {
    const h = new Harness();
    const { a, b } = await lobbyOf2(h);
    await start(h, a, b, 8, 2);
    expect(h.room.d.game!.players.length).toBe(4);
    await playOut(h, a, b);
    expect(h.room.d.status).toBe('finished');
  });

  it('ON-15 (PLAN-110): a newcomer to a finished room is told it has finished', async () => {
    const h = new Harness();
    const { a, b } = await lobbyOf2(h);
    await start(h, a, b, 8, 2);
    await playOut(h, a, b);
    const late = h.connect('L');
    await late.say({ t: 'hello', rv: RULES_VERSION, pv: PROTOCOL_VERSION, name: 'Late', avatar: '🦸' });
    expect(late.errors.slice(-1)[0]).toBe('This game has finished.');
    expect(late.seat).toBeNull();
  });

  it('never reveals secret prices, hidden cards, decks or the seed', async () => {
    const h = new Harness();
    const { a, b } = await lobbyOf2(h);
    await start(h, a, b, 8);
    // Play until prices are being set, then have A lock in first.
    for (let i = 0; i < 200 && h.room.d.game!.phase !== 'bid'; i++) if (!(await botStep(a))) await botStep(b);
    expect(h.room.d.game!.phase).toBe('bid');
    const g = a.view!.game!;
    const { posts } = planPrices(g, 0);
    const before = b.inbox.length;
    await a.say({ t: 'act', id: nid(), v: a.view!.version, action: { kind: 'prices', posts } });
    const after = b.inbox.slice(before).map((r) => JSON.parse(r)).filter((m) => m.t === 'room') as RoomView[];
    expect(after.length).toBeGreaterThan(0);
    for (const v of after) {
      expect(v.game!.phase).toBe('bid');
      expect(v.game!.bids.every((x) => x === null)).toBe(true);
      expect(v.submitted[0]).toBe(true);
      expect(JSON.stringify(v)).not.toContain('pending');
    }
    for (const raw of [...a.inbox, ...b.inbox]) {
      const m = JSON.parse(raw);
      if (m.t !== 'room' || !m.game) continue;
      expect(m.game.rng).toBe(0);
      expect(m.game.customerDeck).toEqual([]);
      expect(m.game.eventDeck).toEqual([]);
    }
    // A cannot change their mind or submit twice.
    await a.say({ t: 'act', id: nid(), v: a.view!.version, action: { kind: 'prices', posts: [] } });
    expect(a.errors.slice(-1)[0]).toContain('already sealed');
  });

  it('keeps a for-sale crate hidden until every shop has opened', async () => {
    const h = new Harness();
    const { a, b } = await lobbyOf2(h);
    await start(h, a, b, 8);
    for (let i = 0; i < 200 && h.room.d.game!.phase !== 'stall'; i++) if (!(await botStep(a))) await botStep(b);
    expect(h.room.d.game!.phase).toBe('stall');
    const before = b.inbox.length;
    await a.say({ t: 'act', id: nid(), v: a.view!.version, action: { kind: 'stall', stall: planStall(a.view!.game!, 0) } });
    const after = b.inbox.slice(before).map((r) => JSON.parse(r)).filter((m) => m.t === 'room') as RoomView[];
    expect(after.length).toBeGreaterThan(0);
    for (const v of after) {
      expect(v.game!.phase).toBe('stall');
      expect(v.game!.stalls.every((x) => x === null)).toBe(true);
      expect(v.submitted[0]).toBe(true);
    }
    await a.say({ t: 'act', id: nid(), v: a.view!.version, action: { kind: 'stall', stall: {} } });
    expect(a.errors.slice(-1)[0]).toContain('already set.');
  });

  it('shows face-down walk-ins only to the player who heard the gossip', () => {
    // Four shops: two walk-ins wait face down in the first queue.
    const g = newGame({ players: ['A', 'B', 'C', 'D'].map((name) => ({ name, kind: 'human' as const, avatar: 'fox' })), days: 8, seed: 7, unripe: true, upgrades: true, events: true });
    expect(g.queue.length).toBeGreaterThan(0);
    g.queue.forEach((c) => { c.seenBy = [0]; });
    const mine = redact(g, 0), theirs = redact(g, 1);
    expect(mine.queue).toEqual(g.queue);
    for (const [i, c] of theirs.queue.entries()) {
      expect(c.walkIn).toBe(true);
      expect(c.name).not.toBe(g.queue[i].name);
      expect(c.wants.map((w) => w.fruit)).toEqual(g.queue[i].wants.map((w) => w.fruit));
      expect(c.wants.every((w) => w.qty === 0 && w.max === 0)).toBe(true);
    }
    const leaked = JSON.stringify(theirs.queue);
    for (const c of g.queue) expect(leaked).not.toContain(`"${c.name}"`);
  });

  it('applies a repeated action id only once and rejects stale versions', async () => {
    const h = new Harness();
    const { a, b } = await lobbyOf2(h);
    await start(h, a, b, 8);
    for (let i = 0; i < 50 && h.room.d.game!.phase === 'morning'; i++) if (!(await botStep(a))) await botStep(b);
    const g = h.room.d.game!;
    const p = activePlayer(g);
    const c = p === 0 ? a : b;
    let target: { fruit: (typeof FRUITS)[number]; pos: number } | null = null;
    for (const f of FRUITS) for (let pos = 0; pos < g.market[f].length && !target; pos++) if (!canBuy(g, p, f, pos)) target = { fruit: f, pos };
    expect(target).not.toBeNull();
    const cash = g.players[p].cash;
    const v = c.view!.version;
    const msg: ClientMsg = { t: 'act', id: 'dup-1', v, action: { kind: 'buy', ...target! } };
    await c.say(msg);
    await c.say(msg);
    expect(h.room.d.game!.players[p].boughtToday).toBe(1);
    expect(h.room.d.game!.players[p].cash).toBeLessThan(cash);
    await c.say({ t: 'act', id: 'stale-1', v, action: { kind: 'buy', ...target! } });
    expect(c.errors.slice(-1)[0]).toContain('moved on');
    expect(h.room.d.game!.players[p].boughtToday).toBe(1);
  });

  it('never starts a quick match with a player who already left', async () => {
    const h = new Harness();
    h.room = new Room(freshRoom('QUICK2', h.t, true), h);
    const a = h.connect('A');
    await a.say({ t: 'hello', rv: RULES_VERSION, pv: PROTOCOL_VERSION, name: 'Gone', avatar: '🦸' });
    a.close(); // gave up waiting
    const b = h.connect('B');
    await b.say({ t: 'hello', rv: RULES_VERSION, pv: PROTOCOL_VERSION, name: 'Here', avatar: '🐵' });
    expect(b.view!.status).toBe('lobby');
    expect(b.view!.seats.map((x) => x.name)).toEqual(['Here']);
    expect(b.view!.seats[0].host).toBe(true);
    expect(h.room.waitingForMore()).toBe(true);
    const c = h.connect('C');
    await c.say({ t: 'hello', rv: RULES_VERSION, pv: PROTOCOL_VERSION, name: 'New', avatar: '🦸' });
    expect(c.view!.status).toBe('playing');
  });

  it('hands a dropped player\'s seat to a computer after the grace period, and the match finishes', async () => {
    const h = new Harness();
    const { a, b } = await lobbyOf2(h);
    await start(h, a, b, 8);
    b.close();
    expect(a.view!.seats[1].connected).toBe(false);
    expect(a.view!.seats[1].takeoverAt).toBe(h.t + GRACE_MS);
    expect(h.alarmAt).toBeLessThanOrEqual(h.t + GRACE_MS);
    // Before the grace period ends, the match still waits for B.
    h.t += GRACE_MS - 1000;
    await h.room.alarm();
    expect(a.view!.seats[1].bot).toBeUndefined();
    h.t += 2000;
    await h.room.alarm();
    expect(a.view!.seats[1].bot).toBe(true);
    // A alone can now play the whole game to the end.
    for (let i = 0; i < 3000 && a.view!.status !== 'finished'; i++) if (!(await botStep(a))) break;
    expect(a.view!.status).toBe('finished');
    expect(a.view!.game!.phase).toBe('over');
  });

  it('gives the seat back when the player reconnects', async () => {
    const h = new Harness();
    const { a, b } = await lobbyOf2(h);
    await start(h, a, b, 8);
    const token = b.token;
    b.close();
    h.t += GRACE_MS + 1;
    await h.room.alarm();
    expect(a.view!.seats[1].bot).toBe(true);
    const b2 = h.connect('B2');
    await b2.say({ t: 'hello', rv: RULES_VERSION, pv: PROTOCOL_VERSION, token, name: 'Friend', avatar: '👩‍🍳' });
    expect(b2.seat).toBe(1);
    expect(a.view!.seats[1].bot).toBeUndefined();
    expect(a.view!.seats[1].connected).toBe(true);
  });

  it('moves on without votes from seats a computer is playing', async () => {
    const h = new Harness();
    const { a, b } = await lobbyOf2(h);
    await start(h, a, b, 8);
    expect(a.view!.game!.phase).toBe('morning');
    await a.say({ t: 'continue', v: a.view!.version });
    expect(a.view!.game!.phase).toBe('morning'); // still waiting for B, who is here
    b.close();
    h.t += GRACE_MS + 1;
    await h.room.alarm();
    expect(a.view!.game!.phase).not.toBe('morning');
  });

  it('a player who leaves a match on purpose is replaced at once', async () => {
    const h = new Harness();
    const { a, b } = await lobbyOf2(h);
    await start(h, a, b, 8);
    await b.say({ t: 'leave' });
    expect(a.view!.seats[1].bot).toBe(true);
  });

  it('starts a quick-match room as soon as two strangers are in', async () => {
    const h = new Harness();
    h.room = new Room(freshRoom('QUICK1', h.t, true), h);
    const a = h.connect('A');
    await a.say({ t: 'hello', rv: RULES_VERSION, pv: PROTOCOL_VERSION, name: 'One', avatar: '🦸' });
    expect(a.view!.status).toBe('lobby');
    const b = h.connect('B');
    await b.say({ t: 'hello', rv: RULES_VERSION, pv: PROTOCOL_VERSION, name: 'Two', avatar: '🐵' });
    expect(b.view!.status).toBe('playing');
    expect(b.view!.game!.players.length).toBe(2);
  });

  it('turns away an app built for older rules', async () => {
    const h = new Harness();
    const old = h.connect('O');
    await old.say({ t: 'hello', name: 'Old app', avatar: '🦸' } as ClientMsg);
    expect(old.errors.slice(-1)[0]).toContain('new version');
    expect(old.seat).toBeNull();
  });

  it('lets a player reconnect with their token but not with the room code alone', async () => {
    const h = new Harness();
    const { a, b } = await lobbyOf2(h);
    await start(h, a, b, 8);
    const token = a.token;
    a.close();
    expect(b.view!.seats[0].connected).toBe(false);
    const stranger = h.connect('X');
    await stranger.say({ t: 'hello', rv: RULES_VERSION, pv: PROTOCOL_VERSION, name: 'Sneaky', avatar: '🦸' });
    expect(stranger.errors.slice(-1)[0]).toContain('already started');
    expect(stranger.seat).toBeNull();
    const a2 = h.connect('A2');
    await a2.say({ t: 'hello', rv: RULES_VERSION, pv: PROTOCOL_VERSION, token, name: 'Murshidi', avatar: '🧑‍🍳' });
    expect(a2.seat).toBe(0);
    expect(a2.view!.game!.day).toBe(1);
    expect(b.view!.seats[0].connected).toBe(true);
  });

  it('rejects players when the room is full and handles leaving the lobby', async () => {
    const h = new Harness();
    const { a, b } = await lobbyOf2(h);
    await a.say({ t: 'config', config: { days: 8, ai: 4, unripe: true, upgrades: true, events: true } }); // 2 people + 4 = 6 seats
    const c = h.connect('C');
    await c.say({ t: 'hello', rv: RULES_VERSION, pv: PROTOCOL_VERSION, name: 'Third', avatar: '🦸' });
    expect(c.errors.slice(-1)[0]).toContain('full');
    await a.say({ t: 'leave' });
    expect(h.room.d.seats.length).toBe(1);
    expect(h.room.d.seats[0].host).toBe(true);
    expect(b.seat).toBe(0);
  });

  it('expires after a day of inactivity', async () => {
    const h = new Harness();
    const { a } = await lobbyOf2(h);
    h.t += ROOM_TTL_MS + 1;
    await h.room.alarm();
    expect(h.destroyed).toBe(true);
    expect(a.closed).toBe(true);
  });

  it('starts a rematch with the same players when both agree', async () => {
    const h = new Harness();
    const { a, b } = await lobbyOf2(h);
    await start(h, a, b, 8);
    await playOut(h, a, b);
    await a.say({ t: 'rematch' });
    expect(h.room.d.status).toBe('finished');
    await b.say({ t: 'rematch' });
    expect(h.room.d.status).toBe('playing');
    expect(h.room.d.game!.day).toBe(1);
    expect(a.view!.seats.map((s) => s.name)).toEqual(['Murshidi', 'Friend']);
    // PLAN-102: a rematch keeps the shopkeepers already chosen; there is no second choosing step.
    expect(h.room.d.game!.players.map((p) => p.avatar)).toEqual(['🦊', '🐻']);
  });

  it('only the host can start, and only when everyone is ready', async () => {
    const h = new Harness();
    const { a, b } = await lobbyOf2(h);
    await b.say({ t: 'start' });
    expect(b.errors.slice(-1)[0]).toContain('host');
    await a.say({ t: 'ready', ready: true });
    await a.say({ t: 'start' });
    expect(a.errors.slice(-1)[0]).toContain('ready');
    expect(h.room.d.status).toBe('lobby');
  });
});

describe('characters in a room', () => {
  it('gives every seat of a quick match its own character, even when two players ask for the same one', async () => {
    const h = new Harness();
    h.room = new Room(freshRoom('QUICK3', h.t, true), h);
    const a = h.connect('A');
    const b = h.connect('B');
    await a.say({ t: 'hello', rv: RULES_VERSION, pv: PROTOCOL_VERSION, name: 'A', avatar: '🦊' });
    await b.say({ t: 'hello', rv: RULES_VERSION, pv: PROTOCOL_VERSION, name: 'B', avatar: '🦊' });
    const seats = b.view!.seats;
    expect(seats[0].avatar).toBe('🦊');
    expect(new Set(seats.map((x) => x.avatar)).size).toBe(2);
    expect(b.view!.status).toBe('playing');
  });

  it('lets a player switch to a free character while choosing and refuses a taken one', async () => {
    const h = new Harness();
    const { a, b } = await lobbyOf2(h);
    await a.say({ t: 'ready', ready: true });
    await b.say({ t: 'ready', ready: true });
    await a.say({ t: 'start' });
    await a.say({ t: 'character', avatar: '🦊' });
    await b.say({ t: 'character', avatar: '🦊' });
    expect(b.errors.slice(-1)[0]).toContain('taken');
    await b.say({ t: 'character', avatar: '🐷' });
    await b.say({ t: 'character', avatar: '🐸' });
    expect(a.view!.seats[1].avatar).toBe('🐸');
    await b.say({ t: 'character', avatar: 'not a character' });
    expect(b.errors.slice(-1)[0]).toContain('eight shopkeepers');
  });

  it('gives the computer shops the characters the people did not pick', async () => {
    const h = new Harness();
    const { a, b } = await lobbyOf2(h);
    await start(h, a, b, 8, 2);
    const avatars = h.room.d.game!.players.map((p) => p.avatar);
    expect(new Set(avatars).size).toBe(4);
    expect(h.room.d.game!.players.every((p) => p.trait)).toBe(true);
  });
});

// PLAN-102: in a private room, shopkeepers are chosen after the host starts, by everyone at once.
describe('choosing shopkeepers after everyone has joined', () => {
  async function toPicking(h: Harness, ai = 0) {
    const { a, b } = await lobbyOf2(h);
    await a.say({ t: 'config', config: { days: 8, ai, unripe: true, upgrades: true, events: true } });
    await a.say({ t: 'ready', ready: true });
    await b.say({ t: 'ready', ready: true });
    await a.say({ t: 'start' });
    return { a, b };
  }

  it('people join a private room without a shopkeeper, and cannot pick one in the lobby', async () => {
    const h = new Harness();
    const { a, b } = await lobbyOf2(h);
    expect(a.view!.seats.map((x) => x.avatar)).toEqual(['', '']);
    await b.say({ t: 'character', avatar: '🐸' });
    expect(a.view!.seats[1].avatar).toBe('');
  });

  it('Start the game moves the room to the choosing step, with the same checks as before', async () => {
    const h = new Harness();
    const { a, b } = await lobbyOf2(h);
    await a.say({ t: 'ready', ready: true });
    await a.say({ t: 'start' });
    expect(a.errors.slice(-1)[0]).toContain('ready');
    await b.say({ t: 'ready', ready: true });
    await b.say({ t: 'start' });
    expect(b.errors.slice(-1)[0]).toContain('host');
    await a.say({ t: 'start' });
    expect(a.view!.status).toBe('picking');
    expect(b.view!.status).toBe('picking');
    expect(b.view!.game).toBeNull();
    expect(b.view!.seats.every((x) => x.avatar === '' && !x.confirmed)).toBe(true);
    // The lobby's settings and names are closed now.
    await a.say({ t: 'config', config: { days: 14, ai: 2, unripe: true, upgrades: true, events: true } });
    expect(a.errors.slice(-1)[0]).toContain('host');
    expect(h.room.d.config.days).toBe(10);
    await b.say({ t: 'rename', name: 'Later' });
    expect(b.errors.slice(-1)[0]).toContain('lobby only');
  });

  it('first to ask gets a shopkeeper; changing frees the old one; everyone sees it at once', async () => {
    const h = new Harness();
    const { a, b } = await toPicking(h);
    await b.say({ t: 'character', avatar: '🐷' });
    expect(a.view!.seats[1].avatar).toBe('🐷');
    await a.say({ t: 'character', avatar: '🐷' });
    expect(a.errors.slice(-1)[0]).toContain('taken');
    expect(a.view!.seats[0].avatar).toBe('');
    await b.say({ t: 'character', avatar: '🐸' });
    await a.say({ t: 'character', avatar: '🐷' });
    expect(b.view!.seats.map((x) => x.avatar)).toEqual(['🐷', '🐸']);
  });

  it('confirming needs a shopkeeper, fixes it, and the match waits for every person', async () => {
    const h = new Harness();
    const { a, b } = await toPicking(h);
    await a.say({ t: 'confirm' });
    expect(a.errors.slice(-1)[0]).toContain('Choose a shopkeeper first');
    await a.say({ t: 'character', avatar: '🦜' });
    await a.say({ t: 'confirm' });
    expect(b.view!.seats[0].confirmed).toBe(true);
    expect(b.view!.seats[1].confirmed).toBeUndefined();
    expect(h.room.d.status).toBe('picking');
    await a.say({ t: 'character', avatar: '🐢' }); // confirmed: no more changes
    expect(b.view!.seats[0].avatar).toBe('🦜');
    await b.say({ t: 'character', avatar: '🐢' });
    await b.say({ t: 'confirm' });
    expect(h.room.d.status).toBe('playing');
    expect(a.view!.game!.players.map((p) => p.avatar)).toEqual(['🦜', '🐢']);
    expect(a.view!.game!.players.every((p) => p.trait)).toBe(true);
  });

  it('when everyone has confirmed, the computers take shopkeepers from those left', async () => {
    const h = new Harness();
    const { a, b } = await toPicking(h, 3);
    await pickAll(a, b);
    const avatars = h.room.d.game!.players.map((p) => p.avatar);
    expect(avatars.length).toBe(5);
    expect(new Set(avatars).size).toBe(5);
    expect(avatars.slice(0, 2)).toEqual(['🦊', '🐻']);
    expect(h.room.d.game!.players.slice(2).every((p) => p.kind === 'ai' && CHARACTER_AVATARS.includes(p.avatar))).toBe(true);
  });

  it('nobody can join while shopkeepers are chosen, but a player with their token comes back to their seat', async () => {
    const h = new Harness();
    const { a, b } = await toPicking(h);
    await a.say({ t: 'character', avatar: '🐼' });
    const stranger = h.connect('X');
    await stranger.say({ t: 'hello', rv: RULES_VERSION, pv: PROTOCOL_VERSION, name: 'Late', avatar: '🦸' });
    expect(stranger.errors.slice(-1)[0]).toContain('already started');
    expect(stranger.seat).toBeNull();
    const token = a.token;
    a.close();
    const a2 = h.connect('A2');
    await a2.say({ t: 'hello', rv: RULES_VERSION, pv: PROTOCOL_VERSION, token, name: 'Murshidi', avatar: '🦸' });
    expect(a2.seat).toBe(0);
    expect(a2.view!.status).toBe('picking');
    expect(a2.view!.seats[0].avatar).toBe('🐼');
    expect(b.view!.seats[0].connected).toBe(true);
  });

  it('a player away past the grace period is given a free shopkeeper, and the match begins', async () => {
    const h = new Harness();
    const { a, b } = await toPicking(h, 1);
    await a.say({ t: 'character', avatar: '🦊' });
    await a.say({ t: 'confirm' });
    b.close();
    expect(a.view!.seats[1].takeoverAt).toBe(h.t + GRACE_MS);
    expect(h.alarmAt).toBeLessThanOrEqual(h.t + GRACE_MS);
    h.t += GRACE_MS - 1000;
    await h.room.alarm();
    expect(h.room.d.status).toBe('picking');
    h.t += 2000;
    await h.room.alarm();
    expect(h.room.d.status).toBe('playing');
    const players = h.room.d.game!.players;
    expect(players.length).toBe(3);
    expect(new Set(players.map((p) => p.avatar)).size).toBe(3);
    expect(CHARACTER_AVATARS.includes(players[1].avatar)).toBe(true);
    expect(a.view!.seats[1].bot).toBe(true);
    // A alone can play the whole game to the end.
    for (let i = 0; i < 3000 && a.view!.status !== 'finished'; i++) if (!(await botStep(a))) break;
    expect(a.view!.status).toBe('finished');
  });

  it('a seat taken over keeps the shopkeeper it chose; if its player is back before the start, they may change it', async () => {
    const h = new Harness();
    const c = h.connect('C');
    const { a, b } = await lobbyOf2(h);
    await c.say({ t: 'hello', rv: RULES_VERSION, pv: PROTOCOL_VERSION, name: 'Third', avatar: '🦸' });
    for (const x of [a, b, c]) await x.say({ t: 'ready', ready: true });
    await a.say({ t: 'start' });
    await b.say({ t: 'character', avatar: '🐢' });
    const token = b.token;
    b.close();
    h.t += GRACE_MS + 1;
    await h.room.alarm();
    expect(a.view!.seats[1]).toMatchObject({ avatar: '🐢', confirmed: true, bot: true });
    expect(h.room.d.status).toBe('picking'); // A and C are still choosing
    const b2 = h.connect('B2');
    await b2.say({ t: 'hello', rv: RULES_VERSION, pv: PROTOCOL_VERSION, token, name: 'Friend', avatar: '🦸' });
    expect(a.view!.seats[1].bot).toBeUndefined();
    expect(a.view!.seats[1].confirmed).toBeUndefined();
    await b2.say({ t: 'character', avatar: '🐼' });
    await pickAll(a, c);
    expect(h.room.d.status).toBe('picking');
    await b2.say({ t: 'confirm' });
    expect(h.room.d.status).toBe('playing');
    expect(h.room.d.game!.players[1].avatar).toBe('🐼');
  });

  it('a player who leaves while choosing is given a shopkeeper at once and a computer plays the seat', async () => {
    const h = new Harness();
    const { a, b } = await toPicking(h);
    await a.say({ t: 'character', avatar: '🦊' });
    await a.say({ t: 'confirm' });
    await b.say({ t: 'leave' });
    expect(h.room.d.status).toBe('playing');
    expect(a.view!.seats[1].bot).toBe(true);
    expect(a.view!.game!.players[1].avatar).not.toBe('🦊');
    expect(CHARACTER_AVATARS.includes(a.view!.game!.players[1].avatar)).toBe(true);
  });

  it('ON-09 (PLAN-110): a seat whose person left on purpose says so; one that dropped out does not', async () => {
    const h = new Harness();
    const { a, b } = await toPicking(h);
    await a.say({ t: 'character', avatar: '🦊' });
    await a.say({ t: 'confirm' });
    await b.say({ t: 'leave' });
    expect(a.view!.seats[1].left).toBe(true);
    // A drops out and comes back with the seat token: never "left".
    const token = a.token;
    a.close();
    const a2 = h.connect('A2');
    await a2.say({ t: 'hello', rv: RULES_VERSION, pv: PROTOCOL_VERSION, token, name: 'Murshidi', avatar: '🧑‍🍳' });
    expect(a2.view!.seats[0].left).toBeUndefined();
    expect(a2.view!.seats[1].left).toBe(true);
  });

  it('ON-07 (PLAN-110): a person who drops out while choosing is shown with the time a computer takes over', async () => {
    const h = new Harness();
    const { a, b } = await toPicking(h);
    await a.say({ t: 'character', avatar: '🦊' });
    await a.say({ t: 'confirm' });
    b.close();
    const seat = a.view!.seats[1];
    expect(seat.connected).toBe(false);
    expect(seat.takeoverAt).toBe(h.t + GRACE_MS);
    expect(seat.left).toBeUndefined();
  });

  it('waits instead of starting when every person has left', async () => {
    const h = new Harness();
    const { a, b } = await toPicking(h);
    await a.say({ t: 'leave' });
    await b.say({ t: 'leave' });
    expect(h.room.d.status).toBe('picking');
    expect(h.room.d.game).toBeNull();
  });

  it('the choosing step survives a restart of the room', async () => {
    const h = new Harness();
    const { a } = await toPicking(h);
    await a.say({ t: 'character', avatar: '🐷' });
    const h2 = new Harness();
    h2.room = new Room(JSON.parse(JSON.stringify(h.room.d)), h2);
    const a2 = h2.connect('A2');
    await a2.say({ t: 'hello', rv: RULES_VERSION, pv: PROTOCOL_VERSION, token: a.token, name: 'Murshidi', avatar: '🦸' });
    expect(a2.view!.status).toBe('picking');
    expect(a2.view!.seats[0].avatar).toBe('🐷');
  });
});

// PLAN-023, design 1: take back your own purchases in your own buying turn, and rename in the lobby.
describe('undo and rename in a room', () => {
  /** Moves both players on until someone's buying turn, and returns who is buying and who is waiting. */
  async function toBuyTurn(h: Harness, a: Client, b: Client) {
    await start(h, a, b, 8, 0);
    for (let i = 0; i < 20; i++) {
      const g = a.view!.game!;
      if (g.phase === 'buy') { const buyer = activePlayer(g) === a.view!.you ? a : b; return { buyer, other: buyer === a ? b : a }; }
      await a.say({ t: 'continue', v: a.view!.version });
      await b.say({ t: 'continue', v: b.view!.version });
    }
    throw new Error('no buying turn');
  }
  async function buyOne(c: Client) {
    const v = c.view!; const g = v.game!; const me = v.you;
    for (const f of FRUITS) for (let pos = 0; pos < g.market[f].length; pos++) {
      if (!canBuy(g, me, f, pos)) { await c.say({ t: 'act', id: nid(), v: v.version, action: { kind: 'buy', fruit: f, pos } }); return; }
    }
    throw new Error('nothing to buy');
  }
  const mine = (c: Client) => c.view!.game!.players[c.view!.you];

  it('renames in the lobby with the usual name cleaning, and not after the game starts', async () => {
    const h = new Harness();
    const { a, b } = await lobbyOf2(h);
    await a.say({ t: 'rename', name: '  Aisyah  ' });
    expect(b.view!.seats[0].name).toBe('Aisyah');
    await a.say({ t: 'rename', name: 'shit' });
    expect(b.view!.seats[0].name).toBe('Aisyah'); // refused words keep the old name
    await a.say({ t: 'rename', name: '' });
    expect(b.view!.seats[0].name).toBe('Aisyah');
    await start(h, a, b);
    await a.say({ t: 'rename', name: 'Late' });
    expect(a.errors.slice(-1)[0]).toContain('lobby only');
    expect(b.view!.seats[0].name).toBe('Aisyah');
  });

  it('refuses a phone on the old message version with an update message', async () => {
    const h = new Harness();
    const old = h.connect('OLD');
    await old.say({ t: 'hello', rv: RULES_VERSION, name: 'Old', avatar: '🦊' });
    const msg = old.inbox.map((r) => JSON.parse(r)).find((m) => m.t === 'error');
    expect(msg.update).toBe(true);
    expect(msg.fatal).toBe(true);
    expect(h.room.d.seats.length).toBe(0);
  });

  it('takes back what you bought this turn: your cash, shelf and the market go back, and everyone is told', async () => {
    const h = new Harness();
    const { a, b } = await lobbyOf2(h);
    const { buyer, other } = await toBuyTurn(h, a, b);
    const before = JSON.stringify([mine(buyer), buyer.view!.game!.market]);
    await buyOne(buyer);
    expect(mine(buyer).boughtToday).toBe(1);
    await buyOne(buyer);
    expect(mine(buyer).boughtToday).toBe(2);
    await buyer.say({ t: 'undo', id: nid(), v: buyer.view!.version });
    expect(JSON.stringify([mine(buyer), buyer.view!.game!.market])).toBe(before);
    expect(other.view!.undone).toEqual({ seat: buyer.view!.you, n: 1 });
    expect(JSON.stringify([other.view!.game!.market])).toBe(JSON.stringify([buyer.view!.game!.market]));
    // and you can buy again and take that back too
    await buyOne(buyer);
    await buyer.say({ t: 'undo', id: nid(), v: buyer.view!.version });
    expect(mine(buyer).boughtToday).toBe(0);
    expect(other.view!.undone!.n).toBe(2);
  });

  it('refuses illegal, stale and out-of-turn undo, and ignores a repeated one', async () => {
    const h = new Harness();
    const { a, b } = await lobbyOf2(h);
    const { buyer, other } = await toBuyTurn(h, a, b);
    // nothing bought yet
    await buyer.say({ t: 'undo', id: nid(), v: buyer.view!.version });
    expect(buyer.errors.slice(-1)[0]).toContain('Nothing to take back');
    await buyOne(buyer);
    // not your turn
    await other.say({ t: 'undo', id: nid(), v: other.view!.version });
    expect(other.errors.slice(-1)[0]).toContain('own buying turn');
    expect(mine(buyer).boughtToday).toBe(1);
    // stale version
    await buyer.say({ t: 'undo', id: nid(), v: buyer.view!.version - 1 });
    expect(buyer.errors.slice(-1)[0]).toContain('moved on');
    expect(mine(buyer).boughtToday).toBe(1);
    // the same request twice undoes once
    const id = nid();
    const v1 = buyer.view!.version;
    await buyer.say({ t: 'undo', id, v: v1 });
    const v2 = buyer.view!.version;
    expect(v2).toBeGreaterThan(v1);
    await buyer.say({ t: 'undo', id, v: v1 });
    expect(buyer.view!.version).toBe(v2);
    expect(other.view!.undone!.n).toBe(1);
  });

  it('ON-13 (PLAN-110): a change of look or someone coming back does not make the buyer\'s tap stale', async () => {
    const h = new Harness();
    const { a, b } = await lobbyOf2(h);
    const { buyer, other } = await toBuyTurn(h, a, b);
    // The buyer taps while the other person changes their look: the room moves on a version, the game does not.
    const v0 = buyer.view!.version;
    await other.say({ t: 'look', look: { hat: 'party_hat' } });
    expect(buyer.view!.version).toBeGreaterThan(v0);
    expect(buyer.view!.game!.players[other.view!.you].look).toEqual({ hat: 'party_hat' });
    const g = h.room.d.game!;
    const me = buyer.view!.you;
    const f = FRUITS.find((x) => g.market[x].some((n, pos) => n > 0 && !canBuy(g, me, x, pos)))!;
    const pos = g.market[f].findIndex((n, k) => n > 0 && !canBuy(g, me, f, k));
    await buyer.say({ t: 'act', id: nid(), v: v0, action: { kind: 'buy', fruit: f, pos } });
    expect(buyer.errors).toEqual([]);
    expect(mine(buyer).boughtToday).toBe(1);
    // The other person drops out and comes back while the buyer taps Undo, then Done: neither is refused.
    const v1 = buyer.view!.version;
    const token = other.token;
    other.close();
    const back = h.connect('B2');
    await back.say({ t: 'hello', rv: RULES_VERSION, pv: PROTOCOL_VERSION, name: 'Friend', avatar: '👩‍🍳', token });
    expect(buyer.view!.version).toBeGreaterThan(v1);
    await buyer.say({ t: 'undo', id: nid(), v: v1 });
    expect(buyer.errors).toEqual([]);
    expect(mine(buyer).boughtToday).toBe(0);
    const v2 = buyer.view!.version;
    await back.say({ t: 'look', look: {} });
    await buyer.say({ t: 'act', id: nid(), v: v2, action: { kind: 'endBuy' } });
    expect(buyer.errors).toEqual([]);
    // A tap made before the game itself changed is still refused.
    await buyer.say({ t: 'act', id: nid(), v: v0, action: { kind: 'endBuy' } });
    expect(buyer.errors.slice(-1)[0]).toContain('moved on');
  });

  it('cannot take back after the turn has ended', async () => {
    const h = new Harness();
    const { a, b } = await lobbyOf2(h);
    const { buyer } = await toBuyTurn(h, a, b);
    await buyOne(buyer);
    await buyer.say({ t: 'act', id: nid(), v: buyer.view!.version, action: { kind: 'endBuy' } });
    const boughtAfter = mine(buyer).boughtToday;
    await buyer.say({ t: 'undo', id: nid(), v: buyer.view!.version });
    expect(buyer.errors.slice(-1)[0]).toMatch(/own buying turn|Nothing to take back/);
    expect(mine(buyer).boughtToday).toBe(boughtAfter);
  });

  it('keeps the take-back point across a reconnect in the middle of a turn', async () => {
    const h = new Harness();
    const { a, b } = await lobbyOf2(h);
    const { buyer } = await toBuyTurn(h, a, b);
    await buyOne(buyer);
    const token = buyer.token;
    const name = buyer.view!.seats[buyer.view!.you].name;
    buyer.close();
    const back = h.connect('BACK');
    await back.say({ t: 'hello', rv: RULES_VERSION, pv: PROTOCOL_VERSION, token, name, avatar: '🦸' });
    expect(mine(back).boughtToday).toBe(1);
    await back.say({ t: 'undo', id: nid(), v: back.view!.version });
    expect(mine(back).boughtToday).toBe(0);
  });

  it('never sends the saved turn start to anyone, and a computer playing the seat clears it', async () => {
    const h = new Harness();
    const { a, b } = await lobbyOf2(h);
    const { buyer, other } = await toBuyTurn(h, a, b);
    await buyOne(buyer);
    for (const c of [buyer, other]) {
      const keys = Object.keys(c.view!);
      expect(keys).not.toContain('undo');
      expect(JSON.stringify(c.view)).not.toContain('"farmerDeck":[1');
    }
    expect(h.room.d.undo).toBeTruthy();
    // the person leaves on purpose: a computer takes the seat and the old take-back point is gone
    await buyer.say({ t: 'leave' });
    expect(h.room.d.undo).toBeUndefined();
  });
});

// PLAN-032 (free drills, logic level): a room that is saved and brought back keeps the match going.
describe('a room restored from its saved data', () => {
  it('lets both players reconnect with their tokens and finish the match', async () => {
    const h = new Harness();
    const { a, b } = await lobbyOf2(h);
    await start(h, a, b, 8, 0);
    for (let i = 0; i < 40; i++) { if (!((await botStep(a)) || (await botStep(b)))) break; }
    expect(h.room.d.status).toBe('playing');
    const day = h.room.d.game!.day;
    // "export": the room data as stored; "restore": a new room object made from it, as after a restart
    const saved = JSON.parse(JSON.stringify(h.room.d));
    const h2 = new Harness();
    h2.room = new Room(saved, h2);
    const a2 = h2.connect('A2');
    const b2 = h2.connect('B2');
    await a2.say({ t: 'hello', rv: RULES_VERSION, pv: PROTOCOL_VERSION, token: a.token, name: 'Murshidi', avatar: '🦸' });
    await b2.say({ t: 'hello', rv: RULES_VERSION, pv: PROTOCOL_VERSION, token: b.token, name: 'Friend', avatar: '🐵' });
    expect(a2.view!.you).toBe(a.view!.you);
    expect(b2.view!.you).toBe(b.view!.you);
    expect(a2.view!.game!.day).toBe(day);
    await playOut(h2, a2, b2);
    expect(h2.room.d.status).toBe('finished');
    expect(a2.view!.game!.phase).toBe('over');
  });
});

describe('looks in a room', () => {
  it('shows what each player wears to everyone, and drops anything it does not know', async () => {
    const h = new Harness();
    const a = h.connect('A');
    const b = h.connect('B');
    await a.say({ t: 'hello', rv: RULES_VERSION, pv: PROTOCOL_VERSION, name: 'Murshidi', avatar: '🧑‍🍳', look: { hat: 'gold_crown', neck: 'scarf', face: 'not_a_look', roof: 'gold_crown' } });
    await b.say({ t: 'hello', rv: RULES_VERSION, pv: PROTOCOL_VERSION, name: 'Friend', avatar: '👩‍🍳' });
    // Both phones see the same seats; the made-up look and the look in the wrong slot are gone.
    expect(b.view!.seats[0].look).toEqual({ hat: 'gold_crown', neck: 'scarf' });
    expect(a.view!.seats[1].look).toBeUndefined();
  });

  it('lets a player change their look in the lobby and during a match, and the game players follow', async () => {
    const h = new Harness();
    const { a, b } = await lobbyOf2(h);
    await b.say({ t: 'look', look: { hat: 'party_hat', prop: 'prop_cat' } });
    expect(a.view!.seats[1].look).toEqual({ hat: 'party_hat', prop: 'prop_cat' });
    await start(h, a, b, 8, 0);
    expect(a.view!.game!.players[1].look).toEqual({ hat: 'party_hat', prop: 'prop_cat' });
    const version = h.room.d.version;
    await b.say({ t: 'look', look: { roof: 'roof_stars', hat: 'definitely_fake' } });
    expect(h.room.d.version).toBeGreaterThan(version);
    expect(a.view!.game!.players[1].look).toEqual({ roof: 'roof_stars' });
    expect(a.view!.seats[1].look).toEqual({ roof: 'roof_stars' });
    await b.say({ t: 'look', look: {} });
    expect(a.view!.game!.players[1].look).toBeUndefined();
  });
});

// Rules 19: the evening for everyone at once. The computers decide as it opens; every person decides at the same time
// and the room waits only for those who have not said Lights out.
describe('the evening in a room, everyone at once (rules 19)', () => {
  /** Puts the match at the end of `day`'s rush, every stall with $30, no perks, no cards, empty shelves and today's
   *  line-up `order`; `set` changes what a test needs. Both people then press continue, as on their phones. */
  async function evening(h: Harness, a: Client, b: Client, order: number[], set: (g: GameState) => void = () => {}, day = 3) {
    const g = structuredClone(h.room.d.game!);
    g.players.forEach((pl) => { pl.cash = 30; pl.upgrades = []; pl.favours = []; pl.trait = null; pl.traitOffer = []; pl.stock = emptyStock(true); });
    g.day = day; g.phase = 'reveal'; g.results = null; g.event = null; g.nextEvent = null; g.standing = null;
    g.firstMarket = []; g.secondMarket = []; g.queue = []; g.order = order; g.turn = 0; g.priorityNext = null;
    set(g);
    h.room.d.game = g;
    h.room.d.version++;
    h.room.d.votes = [];
    h.room.broadcast();
    await a.say({ t: 'continue', v: a.view!.version });
    await b.say({ t: 'continue', v: b.view!.version });
  }

  it('two people build at the same time: a choice made on the same state as another person\'s still stands', async () => {
    const h = new Harness();
    const { a, b } = await lobbyOf2(h);
    await start(h, a, b, 8);
    await evening(h, a, b, [0, 1]);
    expect(a.view!.game!.phase).toBe('evening');
    expect(a.view!.game!.eveningDone).toEqual([false, false]);
    const v0 = a.view!.version;
    expect(b.view!.version).toBe(v0);
    // Both tap Build on the evening as it opened; B's arrives after A's has moved the room on.
    await a.say({ t: 'act', id: nid(), v: v0, action: { kind: 'upgrade', upgrade: 'juicebar' } });
    await b.say({ t: 'act', id: nid(), v: v0, action: { kind: 'upgrade', upgrade: 'premium' } });
    expect(a.errors).toEqual([]);
    expect(b.errors).toEqual([]);
    expect(h.room.d.game!.players.map((pl) => pl.upgrades)).toEqual([['juicebar'], ['premium']]);
    // B says Lights out first (B is second in the line-up): the room waits for A only.
    await b.say({ t: 'act', id: nid(), v: v0, action: { kind: 'endEvening' } });
    expect(h.room.d.game!.phase).toBe('evening');
    expect(a.view!.game!.eveningDone).toEqual([false, true]);
    // A stall that is done can do nothing more tonight, and a choice from before the evening opened is refused.
    await b.say({ t: 'act', id: nid(), v: b.view!.version, action: { kind: 'upgrade', upgrade: 'barrow' } });
    expect(b.errors).toContain('Your lights are already out');
    await a.say({ t: 'act', id: nid(), v: v0 - 1, action: { kind: 'endEvening' } });
    expect(a.errors).toContain('The game moved on. Try again.');
    expect(h.room.d.game!.phase).toBe('evening');
    await a.say({ t: 'act', id: nid(), v: a.view!.version, action: { kind: 'endEvening' } });
    expect(h.room.d.game!.day).toBe(4);
    expect(h.room.d.game!.phase).toBe('morning');
    // Outside the evening a stale version is refused as before.
    await a.say({ t: 'act', id: nid(), v: v0, action: { kind: 'endEvening' } });
    expect(a.errors.filter((e) => e === 'The game moved on. Try again.')).toHaveLength(2);
  });

  it('the computers decide as the evening opens: no phone is sent an evening with a computer still deciding', async () => {
    const h = new Harness();
    const { a, b } = await lobbyOf2(h);
    await start(h, a, b, 8, 2);
    const before = a.inbox.length;
    // Every stall holds a Priority card; today's line-up is computer 2, computer 3, A, B.
    await evening(h, a, b, [2, 3, 0, 1], (g) => { g.players.forEach((pl) => { pl.favours = ['priority']; }); }, 4);
    const evenings = a.inbox.slice(before).map((r) => JSON.parse(r)).filter((m) => m.t === 'room' && m.game?.phase === 'evening');
    expect(evenings.length).toBeGreaterThan(0);
    for (const v of evenings) expect([v.game.eveningDone[2], v.game.eveningDone[3]]).toEqual([true, true]);
    // The first computer in the line-up played its card; the second kept its own.
    expect(evenings[0].game.priorityPlayed).toEqual([2]);
    expect(evenings[0].game.eveningDone.slice(0, 2)).toEqual([false, false]);
    // A plays Priority too and says Lights out; B says Lights out without playing. A is later in the line-up than
    // computer 2, so A's card goes back to A's hand.
    const v = a.view!.version;
    await a.say({ t: 'act', id: nid(), v, action: { kind: 'favour', idx: 0 } });
    await b.say({ t: 'act', id: nid(), v, action: { kind: 'endEvening' } });
    await a.say({ t: 'act', id: nid(), v, action: { kind: 'endEvening' } });
    expect(a.errors).toEqual([]);
    expect(b.errors).toEqual([]);
    const g = h.room.d.game!;
    expect(g.day).toBe(5);
    expect(g.order[0]).toBe(2);
    expect(g.players[0].favours).toEqual(['priority']);
    expect(g.priorityBack).toEqual([0]);
    // A's hand reaches B as stand-ins only, as ever.
    expect(b.view!.game!.priorityBack).toEqual([0]);
  });

  it('a person who leaves during the evening is taken over and the computer finishes that evening at once', async () => {
    const h = new Harness();
    const { a, b } = await lobbyOf2(h);
    await start(h, a, b, 8);
    await evening(h, a, b, [1, 0]);
    expect(a.view!.game!.eveningDone).toEqual([false, false]);
    await b.say({ t: 'leave' });
    expect(h.room.d.seats[1].bot).toBe(true);
    expect(h.room.d.game!.phase).toBe('evening');
    expect(a.view!.game!.eveningDone).toEqual([false, true]);
    await a.say({ t: 'act', id: nid(), v: a.view!.version, action: { kind: 'endEvening' } });
    expect(h.room.d.game!.day).toBe(4);
  });

  it('a seat taken over after the grace period closes its evening, and the night falls when it was the last', async () => {
    const h = new Harness();
    const { a, b } = await lobbyOf2(h);
    await start(h, a, b, 8);
    await evening(h, a, b, [0, 1]);
    await a.say({ t: 'act', id: nid(), v: a.view!.version, action: { kind: 'endEvening' } });
    expect(h.room.d.game!.phase).toBe('evening'); // waiting for B
    b.close();
    h.t += GRACE_MS - 1000;
    await h.room.alarm();
    expect(h.room.d.game!.phase).toBe('evening'); // B may still come back
    h.t += 2000;
    await h.room.alarm();
    expect(h.room.d.seats[1].bot).toBe(true);
    expect(h.room.d.game!.day).toBe(4);
    expect(a.view!.game!.phase).toBe('morning');
  });

  it('a person who reconnects during the evening carries on deciding', async () => {
    const h = new Harness();
    const { a, b } = await lobbyOf2(h);
    await start(h, a, b, 8);
    await evening(h, a, b, [0, 1]);
    const token = b.token;
    b.close();
    const b2 = h.connect('B2');
    await b2.say({ t: 'hello', rv: RULES_VERSION, pv: PROTOCOL_VERSION, token, name: 'Friend', avatar: '👩‍🍳' });
    expect(b2.view!.game!.eveningDone).toEqual([false, false]);
    await b2.say({ t: 'act', id: nid(), v: b2.view!.version, action: { kind: 'upgrade', upgrade: 'premium' } });
    expect(b2.errors).toEqual([]);
    expect(h.room.d.game!.players[1].upgrades).toEqual(['premium']);
    await b2.say({ t: 'act', id: nid(), v: b2.view!.version, action: { kind: 'endEvening' } });
    await a.say({ t: 'act', id: nid(), v: a.view!.version, action: { kind: 'endEvening' } });
    expect(h.room.d.game!.day).toBe(4);
  });

  it('whole matches with computer rivals finish, every evening with the people closing in either order', async () => {
    for (const aFirst of [true, false]) {
      const h = new Harness();
      const { a, b } = await lobbyOf2(h);
      await start(h, a, b, 8, 2);
      for (let i = 0; i < 4000 && h.room.d.status === 'playing'; i++) {
        const moved = aFirst ? (await botStep(a)) || (await botStep(b)) : (await botStep(b)) || (await botStep(a));
        if (!moved) throw new Error(`stuck in ${h.room.d.game?.phase}`);
      }
      expect(h.room.d.status).toBe('finished');
      // No phone was ever sent an evening in which a computer stall had not decided.
      for (const c of [a, b]) for (const m of c.inbox.map((r) => JSON.parse(r))) {
        if (m.t === 'room' && m.game?.phase === 'evening') expect([m.game.eveningDone[2], m.game.eveningDone[3]]).toEqual([true, true]);
      }
    }
  });
});

// PLAN-107: the Major fixes from the 1.24.0 review (REP-122): quick matches keep upgrades (ON-01), an unknown room
// says so (ON-03), a rematch goes ahead without someone who left (ON-04), a closed tab no longer blocks a private lobby
// (ON-05), and Undo never takes back a favour card (S3, DEC-120).
describe('PLAN-107: dead ends in a room', () => {
  const hello = (name: string, token?: string): ClientMsg => ({ t: 'hello', rv: RULES_VERSION, pv: PROTOCOL_VERSION, name, avatar: '🦸', ...(token ? { token } : {}) });

  /** Three people in a private room, through the choosing step into a match. */
  async function threeIn(h: Harness) {
    const a = h.connect('A'); const b = h.connect('B'); const c = h.connect('C');
    await a.say(hello('Aisyah')); await b.say(hello('Benny')); await c.say(hello('Chandra'));
    await a.say({ t: 'config', config: { days: 8, ai: 0, unripe: true, upgrades: true, events: true } });
    for (const x of [a, b, c]) await x.say({ t: 'ready', ready: true });
    await a.say({ t: 'start' });
    await pickAll(a, b, c);
    expect(h.room.d.status).toBe('playing');
    return { a, b, c };
  }

  it('ON-01: a quick match is made and played with upgrades, the settings every room starts with', async () => {
    expect(freshRoom('QUICK3', 0, true).config.upgrades).toBe(true);
    const h = new Harness();
    h.room = new Room(freshRoom('QUICK3', h.t, true), h);
    const a = h.connect('A'); const b = h.connect('B');
    await a.say(hello('One'));
    expect(a.view!.config.upgrades).toBe(true);
    await b.say(hello('Two'));
    expect(b.view!.status).toBe('playing');
    expect(b.view!.game!.config.upgrades).toBe(true);
  });

  it('ON-03: a code with no room behind it is told so, in words that depend on whether the phone was in it', () => {
    expect(roomGoneMsg(JSON.stringify(hello('New')))).toBe('That room doesn\'t exist or has closed. Check the code.');
    expect(roomGoneMsg(JSON.stringify(hello('Back', 'a1b2c3')))).toBe('That room has closed.');
    expect(roomGoneMsg('not json')).toBe('That room doesn\'t exist or has closed. Check the code.');
  });

  it('ON-04: three finish, one goes Home, the other two ask for a rematch and it starts with a computer in the empty seat', async () => {
    const h = new Harness();
    const { a, b, c } = await threeIn(h);
    for (let i = 0; i < 6000 && h.room.d.status === 'playing'; i++) {
      if (!((await botStep(a)) || (await botStep(b)) || (await botStep(c)))) throw new Error(`stuck in ${h.room.d.game?.phase}`);
    }
    expect(h.room.d.status).toBe('finished');
    const token = b.token;
    b.close(); // Home from the results
    expect(a.view!.seats[1].connected).toBe(false);
    await a.say({ t: 'rematch' });
    expect(h.room.d.status).toBe('finished'); // still waiting for Chandra, who is here
    await c.say({ t: 'rematch' });
    expect(h.room.d.status).toBe('playing');
    expect(a.view!.game!.day).toBe(1);
    expect(a.view!.seats[1].bot).toBe(true);
    // The match does not wait for the empty seat: both people can play it on.
    for (let i = 0; i < 400 && a.view!.game!.day < 3; i++) if (!((await botStep(a)) || (await botStep(c)))) break;
    expect(a.view!.game!.day).toBeGreaterThan(1);
    // Benny comes back with his seat token and plays his own seat again.
    const b2 = h.connect('B2');
    await b2.say(hello('Benny', token));
    expect(b2.seat).toBe(1);
    expect(a.view!.seats[1].bot).toBeUndefined();
    expect(a.view!.seats[1].connected).toBe(true);
  });

  it('ON-04: when the last person still waited for leaves, the rematch the others asked for starts', async () => {
    const h = new Harness();
    const { a, b, c } = await threeIn(h);
    h.room.d.game!.phase = 'over';
    h.room.d.status = 'finished';
    h.room.d.rematch = [];
    await a.say({ t: 'rematch' });
    await c.say({ t: 'rematch' });
    expect(h.room.d.status).toBe('finished');
    b.close();
    expect(h.room.d.status).toBe('playing');
    expect(c.view!.seats[1].bot).toBe(true);
    // Nobody left to ask: a room where every person has gone does not start on its own.
    const h2 = new Harness();
    const all = await threeIn(h2);
    h2.room.d.game!.phase = 'over';
    h2.room.d.status = 'finished';
    all.a.close(); all.b.close(); all.c.close();
    expect(h2.room.d.status).toBe('finished');
  });

  it('ON-05: a lobby seat whose tab was closed is freed after the grace period; back in time, it is kept', async () => {
    const h = new Harness();
    const a = h.connect('A'); const b = h.connect('B'); const c = h.connect('C');
    await a.say(hello('Aisyah')); await b.say(hello('Gus')); await c.say(hello('Chandra'));
    for (const x of [a, b, c]) await x.say({ t: 'ready', ready: true });
    const token = b.token;
    b.close();
    // Until the grace period ends the seat stays, shown as away with the moment it is freed, and the host cannot start.
    expect(a.view!.seats.map((x) => x.name)).toEqual(['Aisyah', 'Gus', 'Chandra']);
    expect(a.view!.seats[1].connected).toBe(false);
    expect(a.view!.seats[1].takeoverAt).toBe(h.t + GRACE_MS);
    expect(h.alarmAt).toBe(h.t + GRACE_MS);
    await a.say({ t: 'start' });
    expect(a.errors.slice(-1)[0]).toBe('A player is disconnected');
    // Back within the grace period: the same seat, still ready.
    h.t += GRACE_MS - 1000;
    await h.room.alarm();
    const b2 = h.connect('B2');
    await b2.say(hello('Gus', token));
    expect(b2.seat).toBe(1);
    expect(a.view!.seats[1]).toMatchObject({ name: 'Gus', connected: true, ready: true });
    expect(a.view!.seats[1].takeoverAt).toBeUndefined();
    // Gone for good: the seat is freed and the room can start without him.
    b2.close();
    h.t += GRACE_MS;
    await h.room.alarm();
    expect(a.view!.seats.map((x) => x.name)).toEqual(['Aisyah', 'Chandra']);
    expect(c.view!.you).toBe(1);
    await a.say({ t: 'start' });
    expect(h.room.d.status).toBe('picking');
  });

  it('ON-05: a host who closed the tab is freed after the grace period too, and the host tag passes on', async () => {
    const h = new Harness();
    const { a, b } = await lobbyOf2(h);
    a.close();
    h.t += GRACE_MS + 1;
    await h.room.alarm();
    expect(b.view!.seats.map((x) => x.name)).toEqual(['Friend']);
    expect(b.view!.seats[0].host).toBe(true);
    expect(b.view!.you).toBe(0);
  });
});

describe('PLAN-107 (S3, DEC-120): Undo takes back purchases only; a favour card once played stays played', () => {
  async function toBuyTurn(h: Harness, a: Client, b: Client) {
    await start(h, a, b, 8, 0);
    for (let i = 0; i < 20; i++) {
      const g = a.view!.game!;
      if (g.phase === 'buy') { const buyer = activePlayer(g) === a.view!.you ? a : b; return { buyer, other: buyer === a ? b : a }; }
      await a.say({ t: 'continue', v: a.view!.version });
      await b.say({ t: 'continue', v: b.view!.version });
    }
    throw new Error('no buying turn');
  }
  async function buyOne(c: Client) {
    const v = c.view!; const g = v.game!; const me = v.you;
    for (const f of FRUITS) for (let pos = 0; pos < g.market[f].length; pos++) {
      if (!canBuy(g, me, f, pos)) { await c.say({ t: 'act', id: nid(), v: v.version, action: { kind: 'buy', fruit: f, pos } }); return; }
    }
    throw new Error('nothing to buy');
  }
  /** Deals the buyer these favour cards and one face-down walk-in to look at (in the room's own game, sent out again). */
  function deal(h: Harness, seat: number, favours: FavourId[]) {
    const g = h.room.d.game!;
    g.players[seat].favours = favours;
    if (!g.queue.some((q) => q.walkIn && !q.seenBy?.includes(seat))) {
      g.queue.push({ id: 900, name: 'Walk-in', walkIn: true, pref: 'everyday', wants: [{ fruit: 'apple', qty: 2, max: 7 }], original: [{ fruit: 'apple', qty: 2, max: 7 }] });
    }
    h.room.d.version++;
    h.room.broadcast();
  }
  const mine = (c: Client) => c.view!.game!.players[c.view!.you];

  it('after Scout, Undo takes back only what was bought after it: the card and the walk-in it showed stay', async () => {
    const h = new Harness();
    const { a, b } = await lobbyOf2(h);
    const { buyer, other } = await toBuyTurn(h, a, b);
    const me = buyer.view!.you;
    deal(h, me, ['scout']);
    await buyOne(buyer);
    const walkIn = buyer.view!.game!.queue.find((q) => q.walkIn && !q.seenBy?.includes(me))!;
    await buyer.say({ t: 'act', id: nid(), v: buyer.view!.version, action: { kind: 'favour', idx: 0, args: { customer: walkIn.id } } });
    expect(mine(buyer).favours).toEqual([]);
    const seen = () => buyer.view!.game!.queue.find((q) => q.id === walkIn.id)!;
    expect(seen().seenBy).toContain(me);
    expect(seen().wants[0].qty).toBeGreaterThan(0);
    // Nothing bought since the card: nothing to take back, and the piece bought before it stays.
    await buyer.say({ t: 'undo', id: nid(), v: buyer.view!.version });
    expect(buyer.errors.slice(-1)[0]).toBe('Nothing to take back');
    expect(mine(buyer).boughtToday).toBe(1);
    await buyOne(buyer);
    expect(mine(buyer).boughtToday).toBe(2);
    await buyer.say({ t: 'undo', id: nid(), v: buyer.view!.version });
    expect(mine(buyer).boughtToday).toBe(1);
    expect(mine(buyer).favours).toEqual([]);
    expect(seen().seenBy).toContain(me);
    expect(seen().wants[0].qty).toBeGreaterThan(0);
    expect(other.view!.game!.log.slice(-1)[0]).toMatch(/played Scout$/);
    // The other stall still sees the walk-in face down.
    expect(other.view!.game!.queue.find((q) => q.id === walkIn.id)!.wants[0].qty).toBe(0);
  });

  it('Fridge and Free Fruit stay played as well', async () => {
    const h = new Harness();
    const { a, b } = await lobbyOf2(h);
    const { buyer } = await toBuyTurn(h, a, b);
    const me = buyer.view!.you;
    h.room.d.game!.players[me].stock.apple[0] += 1; // an old piece the Fridge makes one step fresher
    deal(h, me, ['freeFruit', 'fridge']);
    const g = buyer.view!.game!;
    const f = FRUITS.find((x) => g.market[x].some((n) => n > 0))!;
    const pos = g.market[f].findIndex((n) => n > 0);
    await buyer.say({ t: 'act', id: nid(), v: buyer.view!.version, action: { kind: 'favour', idx: 0, args: { fruit: f, pos } } });
    expect(mine(buyer).favours).toEqual(['fridge']);
    const free = JSON.stringify(mine(buyer).stock);
    await buyer.say({ t: 'act', id: nid(), v: buyer.view!.version, action: { kind: 'favour', idx: 0 } });
    expect(mine(buyer).favours).toEqual([]);
    const cooled = JSON.stringify(mine(buyer).stock);
    expect(cooled).not.toBe(free);
    await buyer.say({ t: 'undo', id: nid(), v: buyer.view!.version });
    expect(buyer.errors.slice(-1)[0]).toBe('Nothing to take back');
    await buyOne(buyer);
    await buyer.say({ t: 'undo', id: nid(), v: buyer.view!.version });
    expect(mine(buyer).favours).toEqual([]);
    expect(JSON.stringify(mine(buyer).stock)).toBe(cooled);
  });
});

describe('PLAN-112: public rooms, starting with computers, and reactions', () => {
  const hello = (name: string, token?: string, pv: number = PROTOCOL_VERSION): ClientMsg => ({ t: 'hello', rv: RULES_VERSION, pv, name, avatar: '🦸', ...(token ? { token } : {}) });

  /** A room that tells a stand-in list what it shows, as the Durable Object tells the real one. */
  class ListHarness extends Harness {
    told: { code: string; entry: Listing | null }[] = [];
    async listRoom(code: string, entry: Listing | null) { this.told.push({ code, entry }); }
    get last() { return this.told[this.told.length - 1]; }
  }
  const publicRoom = () => {
    const h = new ListHarness();
    h.room = new Room(freshRoom('PUBLIC', h.t, false, true), h);
    return h;
  };

  it('a new room is private unless asked, and a quick match is never public', () => {
    expect(freshRoom('ROOMAA', 0).public).toBeUndefined();
    expect(freshRoom('ROOMAA', 0, false, true).public).toBe(true);
    expect(freshRoom('ROOMAA', 0, true, true).public).toBeUndefined();
  });

  it('a public room is listed once its host is in, follows its seats and settings, and goes when it starts', async () => {
    const h = publicRoom();
    expect(h.told).toEqual([]);
    const a = h.connect('A');
    await a.say(hello('Aisyah'));
    expect(h.last).toEqual({ code: 'PUBLIC', entry: { code: 'PUBLIC', host: 'Aisyah', taken: 1, days: 10, openedAt: h.t } });
    expect(a.view!.public).toBe(true);
    const b = h.connect('B');
    await b.say(hello('Benny'));
    expect(h.last.entry?.taken).toBe(2);
    // A computer seat counts as taken; the game length follows the settings.
    await a.say({ t: 'config', config: { days: 14, ai: 1, unripe: true, upgrades: true, events: true } });
    expect(h.last.entry).toMatchObject({ taken: 3, days: 14 });
    const n = h.told.length;
    await a.say({ t: 'ready', ready: true }); // nothing the list shows changed: it is not told again
    expect(h.told.length).toBe(n);
    await b.say({ t: 'ready', ready: true });
    await a.say({ t: 'start' });
    expect(h.room.d.status).toBe('picking');
    expect(h.last).toEqual({ code: 'PUBLIC', entry: null });
    expect(h.room.listing()).toBeNull();
  });

  it('a full room is taken off the list, and listed again when a seat frees up', async () => {
    const h = publicRoom();
    const cs: Client[] = [];
    for (let i = 0; i < 6; i++) { const c = h.connect(`P${i}`); await c.say(hello(`P${i}`)); cs.push(c); }
    expect(h.room.d.seats.length).toBe(6);
    expect(h.last.entry).toBeNull();
    await cs[5].say({ t: 'leave' });
    expect(h.last.entry?.taken).toBe(5);
    // Computers filling the last seats fill the room too.
    await cs[0].say({ t: 'config', config: { days: 10, ai: 1, unripe: true, upgrades: true, events: true } });
    expect(h.last.entry).toBeNull();
  });

  it('a room with nobody connected is taken off; a closed room is taken off; a listed room says it is still there', async () => {
    const h = publicRoom();
    const a = h.connect('A');
    await a.say(hello('Aisyah'));
    // While listed, the room wakes within a minute to tell the list it is still waiting.
    expect(h.alarmAt).toBeLessThanOrEqual(h.t + 60_000);
    const n = h.told.length;
    h.t += 60_000;
    await h.room.alarm();
    expect(h.told.length).toBe(n + 1);
    expect(h.last.entry?.host).toBe('Aisyah');
    a.close();
    await Promise.resolve();
    expect(h.last.entry).toBeNull();
    // Back in time: listed again. Then the room expires: taken off before it goes.
    const a2 = h.connect('A2');
    await a2.say(hello('Aisyah', a.token));
    expect(h.last.entry?.host).toBe('Aisyah');
    h.t += ROOM_TTL_MS + 1;
    await h.room.alarm();
    expect(h.destroyed).toBe(true);
    expect(h.last.entry).toBeNull();
  });

  it('a private room and a quick match never tell the list anything', async () => {
    const h = new ListHarness();
    const { a, b } = await lobbyOf2(h);
    await a.say({ t: 'ready', ready: true });
    await b.say({ t: 'ready', ready: true });
    await a.say({ t: 'start' });
    expect(h.told).toEqual([]);
    const q = new ListHarness();
    q.room = new Room(freshRoom('QUICKQ', q.t, true, true), q);
    await q.connect('A').say(hello('One'));
    expect(q.told).toEqual([]);
  });

  it('nobody can join a public room that has started, from the list or with the code', async () => {
    const h = publicRoom();
    const a = h.connect('A');
    const b = h.connect('B');
    await a.say(hello('Aisyah')); await b.say(hello('Benny'));
    await a.say({ t: 'ready', ready: true }); await b.say({ t: 'ready', ready: true });
    await a.say({ t: 'start' });
    const late = h.connect('L');
    await late.say(hello('Late'));
    expect(late.errors).toEqual(['This game has already started.']);
    expect(h.room.d.seats.length).toBe(2);
  });

  it('after a minute the host may start with computers in the empty seats, even alone', async () => {
    const h = publicRoom();
    const a = h.connect('A');
    await a.say(hello('Aisyah'));
    expect(a.view!.waited).toBe(0);
    await a.say({ t: 'start', computers: true });
    expect(a.errors.slice(-1)[0]).toBe('Wait a minute for players to join first.');
    expect(h.room.d.config.ai).toBe(0);
    await a.say({ t: 'start' });
    expect(a.errors.slice(-1)[0]).toContain('another player');
    h.t += 60_000;
    await a.say({ t: 'start', computers: true });
    expect(h.room.d.status).toBe('picking');
    expect(h.room.d.config.ai).toBe(5);
    expect(h.last.entry).toBeNull();
    await pickAll(a);
    expect(h.room.d.status).toBe('playing');
    expect(h.room.d.game!.players.length).toBe(6);
    expect(h.room.d.game!.players.filter((p) => p.kind === 'ai').length).toBe(5);
  });

  it('starting with computers still waits for everyone else to be ready and here', async () => {
    const h = new Harness();
    const { a, b } = await lobbyOf2(h);
    h.t += 60_000;
    await a.say({ t: 'start', computers: true });
    expect(a.errors.slice(-1)[0]).toContain('ready');
    expect(h.room.d.config.ai).toBe(0); // nothing changed by a start that was refused
    await b.say({ t: 'ready', ready: true });
    await b.say({ t: 'start', computers: true });
    expect(b.errors.slice(-1)[0]).toContain('host');
    await a.say({ t: 'start', computers: true }); // the host's own tap counts as ready
    expect(h.room.d.status).toBe('picking');
    expect(h.room.d.config.ai).toBe(4);
  });

  it('a reaction with a known id is passed to everyone as {seat, id} and nothing else', async () => {
    const h = new Harness();
    const { a, b } = await lobbyOf2(h);
    const before = [a.inbox.length, b.inbox.length];
    await b.say({ t: 'react', r: 'clap' });
    for (const got of [a.inbox.slice(before[0]), b.inbox.slice(before[1])]) expect(got).toEqual([JSON.stringify({ t: 'react', seat: 1, r: 'clap' })]);
    // Extra fields in the message are never passed on.
    h.t += 5000;
    const n = a.inbox.length;
    await a.say({ t: 'react', r: 'luck', text: 'my crate has 3 mangoes', price: 9 } as unknown as ClientMsg);
    expect(a.inbox.slice(n)).toEqual([JSON.stringify({ t: 'react', seat: 0, r: 'luck' })]);
    // Every id in the shared list is accepted; none shows a number or an exclamation mark.
    for (const r of REACTIONS) {
      h.t += REACT_GAP_MS;
      await a.say({ t: 'react', r: r.id });
      expect(JSON.parse(a.inbox[a.inbox.length - 1])).toEqual({ t: 'react', seat: 0, r: r.id });
      expect(r.show).not.toMatch(/[0-9!]/);
    }
    expect(REACTIONS.length).toBe(12);
  });

  it('an unknown or malformed reaction, one from a phone with no seat, and one sent too soon are dropped quietly', async () => {
    const h = new Harness();
    const { a, b } = await lobbyOf2(h);
    const n = [a.inbox.length, b.inbox.length];
    for (const r of ['hello', '', 7, null, { id: 'smile' }, ['smile'], 'SMILE', undefined]) await a.say({ t: 'react', r } as unknown as ClientMsg);
    await a.say({ t: 'react' } as unknown as ClientMsg);
    expect([a.inbox.length, b.inbox.length]).toEqual(n);
    const stranger = h.connect('S');
    await stranger.say({ t: 'react', r: 'smile' });
    expect(b.inbox.length).toBe(n[1]);
    // One every 2 s per seat: a second one sooner is dropped, the other seat is not held up.
    await a.say({ t: 'react', r: 'smile' });
    h.t += REACT_GAP_MS - 1;
    await a.say({ t: 'react', r: 'fire' });
    await b.say({ t: 'react', r: 'wow' });
    h.t += 1;
    await a.say({ t: 'react', r: 'thanks' });
    const reacts = b.inbox.slice(n[1]).map((r) => JSON.parse(r)).filter((m) => m.t === 'react');
    expect(reacts).toEqual([{ t: 'react', seat: 0, r: 'smile' }, { t: 'react', seat: 1, r: 'wow' }, { t: 'react', seat: 0, r: 'thanks' }]);
    expect(a.errors).toEqual([]);
  });

  it('reactions work during the match too, and never change the game', async () => {
    const h = new Harness();
    const { a, b } = await lobbyOf2(h);
    await start(h, a, b);
    const v = h.room.d.version;
    const game = JSON.stringify(h.room.d.game);
    await a.say({ t: 'react', r: 'played' });
    expect(JSON.parse(b.inbox[b.inbox.length - 1])).toEqual({ t: 'react', seat: 0, r: 'played' });
    expect(h.room.d.version).toBe(v);
    expect(JSON.stringify(h.room.d.game)).toBe(game);
  });

  it('a phone on protocol 4 (1.25.0) is asked to update and takes no seat', async () => {
    const h = publicRoom();
    const old = h.connect('OLD');
    await old.say(hello('Old', undefined, 4));
    const msg = old.inbox.map((r) => JSON.parse(r)).find((m) => m.t === 'error');
    expect(msg).toEqual({ t: 'error', msg: UPDATE_MSG, fatal: true, update: true });
    expect(h.room.d.seats.length).toBe(0);
    expect(h.told).toEqual([]);
    // Its later messages, a reaction among them, are refused without being passed on.
    await old.say({ t: 'react', r: 'smile' });
    expect(old.inbox.map((r) => JSON.parse(r).t)).toEqual(['error', 'error']);
  });
});

// PLAN-125: Quick Match at 2, 4 or 6 stalls. A quick room starts when it is full, or QUICK_FILL_MS after it opened with
// Normal computers in the empty seats; the queue claims a seat before it sends anyone.
describe('quick match tables of 2, 4 and 6 stalls', () => {
  const hi = (name: string, avatar: string): ClientMsg => ({ t: 'hello', rv: RULES_VERSION, pv: PROTOCOL_VERSION, name, avatar });
  const quickRoom = (h: Harness, stalls: 2 | 4 | 6) => { h.room = new Room(freshRoom('QUICKS', h.t, true, false, stalls), h); return h.t + QUICK_FILL_MS; };

  it('tells the wait screen the table size and when computers fill, and a private room nothing', async () => {
    const h = new Harness();
    const fillAt = quickRoom(h, 4);
    const a = h.connect('A');
    await a.say(hi('Ann', '🦊'));
    expect(a.view!.quick).toEqual({ stalls: 4, fillAt });
    expect(h.alarmAt).toBe(fillAt);
    const p = new Harness();
    const { a: host } = await lobbyOf2(p);
    expect(host.view!.quick).toBeUndefined();
  });

  it('starts a full table at once, with every person and no computer', async () => {
    const h = new Harness();
    quickRoom(h, 4);
    const cs = ['A', 'B', 'C', 'D'].map((x) => h.connect(x));
    for (const [i, c] of cs.entries()) {
      await c.say(hi(`P${i}`, CHARACTER_AVATARS[i]));
      expect(c.view!.status).toBe(i < 3 ? 'lobby' : 'playing');
    }
    const g = h.room.d.game!;
    expect(g.players.map((x) => x.kind)).toEqual(['human', 'human', 'human', 'human']);
    expect(cs[0].view!.quick).toEqual({ stalls: 4 }); // no fill time once it has started
    // Nobody else gets in.
    const e = h.connect('E');
    await e.say(hi('Late', '🦊'));
    expect(e.errors.slice(-1)[0]).toContain('already started');
  });

  it('fills the empty seats with Normal computers at the fill time, with shopkeepers nobody has', async () => {
    const h = new Harness();
    const fillAt = quickRoom(h, 6);
    const a = h.connect('A'), b = h.connect('B');
    await a.say(hi('Ann', '🦊'));
    await b.say(hi('Ben', '🐻'));
    h.t = fillAt - 1;
    await h.room.alarm();
    expect(a.view!.status).toBe('lobby');
    h.t = fillAt;
    await h.room.alarm();
    expect(a.view!.status).toBe('playing');
    const g = h.room.d.game!;
    expect(g.players.length).toBe(6);
    expect(g.players.slice(0, 2).map((x) => [x.name, x.kind, x.avatar])).toEqual([['Ann', 'human', '🦊'], ['Ben', 'human', '🐻']]);
    expect(g.players.slice(2).every((x) => x.kind === 'ai' && x.level === 'normal')).toBe(true);
    expect(new Set(g.players.map((x) => x.avatar)).size).toBe(6);
    expect(h.room.d.config.ai).toBe(4);
  });

  it('a two-stall room starts at once with two people, and with one computer after the wait when alone', async () => {
    const h = new Harness();
    const fillAt = quickRoom(h, 2);
    const a = h.connect('A');
    await a.say(hi('Ann', '🦊'));
    expect(a.view!.status).toBe('lobby');
    h.t = fillAt;
    await h.room.alarm();
    expect(h.room.d.game!.players.map((x) => x.kind)).toEqual(['human', 'ai']);
  });

  it('gives the later of two people who chose the same shopkeeper another free one', async () => {
    const h = new Harness();
    const fillAt = quickRoom(h, 4);
    const a = h.connect('A'), b = h.connect('B');
    await a.say(hi('Ann', '🐼'));
    await b.say(hi('Ben', '🐼'));
    expect(b.view!.seats[0].avatar).toBe('🐼');
    expect(b.view!.seats[1].avatar).not.toBe('🐼');
    expect(CHARACTER_AVATARS).toContain(b.view!.seats[1].avatar);
    h.t = fillAt;
    await h.room.alarm();
    expect(new Set(h.room.d.game!.players.map((x) => x.avatar)).size).toBe(4);
  });

  it('frees the seat of a person who leaves while waiting, and the rest still start', async () => {
    const h = new Harness();
    const fillAt = quickRoom(h, 4);
    const a = h.connect('A'), b = h.connect('B'), c = h.connect('C');
    await a.say(hi('Ann', '🦊'));
    await b.say(hi('Ben', '🐻'));
    await c.say(hi('Cat', '🐼'));
    await a.say({ t: 'leave' }); // the first one, who had the host tag
    expect(c.view!.seats.map((x) => x.name)).toEqual(['Ben', 'Cat']);
    b.close(); // closed the app
    expect(c.view!.seats.map((x) => x.name)).toEqual(['Cat']);
    expect(h.room.waitingForMore()).toBe(true);
    // A new person takes a freed seat; the room is still not full.
    const d = h.connect('D');
    await d.say(hi('Dan', '🐵'));
    expect(d.view!.status).toBe('lobby');
    h.t = fillAt;
    await h.room.alarm();
    expect(h.room.d.game!.players.map((x) => x.kind)).toEqual(['human', 'human', 'ai', 'ai']);
    expect(h.room.d.game!.players.slice(0, 2).map((x) => x.name)).toEqual(['Cat', 'Dan']);
  });

  it('starts nothing when everyone has gone, and does not keep waking', async () => {
    const h = new Harness();
    const fillAt = quickRoom(h, 4);
    const a = h.connect('A');
    await a.say(hi('Ann', '🦊'));
    a.close();
    expect(h.room.d.seats.length).toBe(0);
    expect(h.alarmAt).toBeGreaterThan(fillAt); // only the day-long expiry
    h.t = fillAt + 1;
    await h.room.alarm();
    expect(h.room.d.status).toBe('lobby');
    expect(h.alarmAt).toBeGreaterThan(h.t + 60_000);
    expect(h.room.waitingForMore()).toBe(false);
  });

  it('keeps a seat for each person the queue sends, and no more than the table has', async () => {
    const h = new Harness();
    const fillAt = quickRoom(h, 4);
    // The room's own first person is still connecting: their seat is kept, and others may be sent at the same time.
    expect([await h.room.claimSeat(), await h.room.claimSeat(), await h.room.claimSeat()]).toEqual([true, true, true]);
    expect(await h.room.claimSeat()).toBe(false); // 0 here + 4 on the way = 4
    h.t += CLAIM_MS + 1; // none of them came: nobody is waiting, so the queue opens a room of its own instead
    expect(await h.room.claimSeat()).toBe(false);
    const a = h.connect('A');
    await a.say(hi('Ann', '🦊'));
    expect([await h.room.claimSeat(), await h.room.claimSeat(), await h.room.claimSeat()]).toEqual([true, true, true]);
    expect(await h.room.claimSeat()).toBe(false); // 1 here + 3 on the way = 4
    const b = h.connect('B');
    await b.say(hi('Ben', '🐻'));
    expect(await h.room.claimSeat()).toBe(false); // Ben used one of the kept seats
    h.t += CLAIM_MS + 1; // the other two never came
    expect(await h.room.claimSeat()).toBe(true);
    // Too close to the fill time: nobody more is sent.
    h.t = Math.max(h.t, fillAt - CLAIM_BEFORE_FILL_MS);
    expect(await h.room.claimSeat()).toBe(false);
  });

  it('waits at the fill time for a person still on the way, then starts when they arrive', async () => {
    const h = new Harness();
    const fillAt = quickRoom(h, 4);
    const a = h.connect('A');
    await a.say(hi('Ann', '🦊'));
    h.t = fillAt - CLAIM_BEFORE_FILL_MS - 1;
    expect(await h.room.claimSeat()).toBe(true);
    h.t = fillAt;
    await h.room.alarm();
    expect(h.room.d.status).toBe('lobby');
    expect(h.alarmAt).toBe(fillAt - CLAIM_BEFORE_FILL_MS - 1 + CLAIM_MS);
    const b = h.connect('B');
    await b.say(hi('Ben', '🐻'));
    expect(b.view!.status).toBe('playing');
    expect(h.room.d.game!.players.map((x) => x.kind)).toEqual(['human', 'human', 'ai', 'ai']);
  });

  it('never gives a quick room a host lobby: no settings, no start', async () => {
    const h = new Harness();
    quickRoom(h, 4);
    const a = h.connect('A');
    await a.say(hi('Ann', '🦊'));
    expect(a.view!.seats[0].host).toBe(true);
    await a.say({ t: 'config', config: { days: 8, ai: 3, unripe: true, upgrades: true, events: true } });
    await a.say({ t: 'start', computers: true });
    expect(a.errors.slice(-2)).toEqual(['A quick match starts by itself.', 'A quick match starts by itself.']);
    expect(h.room.d.status).toBe('lobby');
    expect(h.room.d.config.ai).toBe(0);
  });

  it('a quick room stored before PLAN-125 is a two-stall room that waits for a second person, as it did', async () => {
    const h = new Harness();
    const d = freshRoom('OLDQK2', h.t, true);
    delete d.stalls;
    delete d.fillAt;
    h.room = new Room(d, h);
    const a = h.connect('A');
    await a.say(hi('Ann', '🦊'));
    expect(a.view!.quick).toEqual({ stalls: 2 });
    h.t += 10 * QUICK_FILL_MS;
    await h.room.alarm();
    expect(a.view!.status).toBe('lobby');
    expect(h.room.waitingForMore()).toBe(true);
    const b = h.connect('B');
    await b.say(hi('Ben', '🐻'));
    expect(b.view!.status).toBe('playing');
    expect(h.room.d.game!.players.length).toBe(2);
  });
});

// PLAN-132: a finished online match is kept as a nameless record, only when every person shares game data.
describe('match records from a room', () => {
  const hello = (name: string, share: boolean | undefined) => ({ t: 'hello' as const, rv: RULES_VERSION, pv: PROTOCOL_VERSION, name, avatar: '', ...(share === undefined ? {} : { share }) });
  async function match(shareA: boolean | undefined, shareB: boolean | undefined) {
    const h = new Harness();
    const a = h.connect('A');
    const b = h.connect('B');
    await a.say(hello('Murshidi', shareA));
    await b.say(hello('Zorblax', shareB));
    await start(h, a, b, 8, 1);
    await playOut(h, a, b);
    expect(h.room.d.status).toBe('finished');
    return { h, a, b };
  }

  it('one record when both share: every day, the final cash, and no name, token or room code', async () => {
    const { h, a } = await match(true, true);
    expect(h.records.length).toBe(1);
    const rec = h.records[0];
    const g = h.room.d.game!;
    expect(rec.mode).toBe('online');
    expect(rec.days.map((d) => d.d)).toEqual([1, 2, 3, 4, 5, 6, 7, 8]);
    expect(rec.end).toMatchObject({ over: true, cash: g.players.map((p) => p.cash) });
    expect(rec.days[7].cash).toEqual(g.players.map((p) => p.cash));
    expect(rec.cfg.seats.map((x) => x.k)).toEqual(['h', 'h', 'c']);
    // the cleaner keeps it whole: nothing in it is outside the game's own words and numbers
    expect(cleanRecord(JSON.parse(JSON.stringify(rec)))).toEqual(JSON.parse(JSON.stringify(rec)));
    const text = JSON.stringify(rec);
    for (const secret of ['Murshidi', 'Zorblax', 'TESTAB', ...h.room.d.seats.map((x) => x.token), ...g.players.map((p) => p.name)]) expect(text).not.toContain(secret);
    // and the record never travels to a player
    expect(a.inbox.some((m) => m.includes(rec.id) || m.includes('"rec"'))).toBe(false);
  });

  it('no record when one person has sharing off, or runs an older app that does not say', async () => {
    expect((await match(true, false)).h.records).toEqual([]);
    expect((await match(true, undefined)).h.records).toEqual([]);
  });
});
