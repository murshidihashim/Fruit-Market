import { describe, expect, it } from 'vitest';
import { planPrices, planStall } from '../src/engine/ai';
import { FRUITS } from '../src/engine/data';
import { activePlayer, canBuy, newGame } from '../src/engine/game';
import { PROTOCOL_VERSION, RULES_VERSION, type ClientMsg, type RoomView, type ServerMsg } from '../src/net/protocol';
import { freshRoom, GRACE_MS, redact, Room, ROOM_TTL_MS, type Conn, type RoomIO } from '../server/room';

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
}

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
    await c.say({ t: 'act', id: nid(), v: v.version, action: { kind: 'prices', posts, favoured: false } });
    return true;
  }
  if (g.phase === 'evening' && activePlayer(g) === me) { await c.say({ t: 'act', id: nid(), v: v.version, action: { kind: 'endEvening' } }); return true; }
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
    await a.say({ t: 'act', id: nid(), v: a.view!.version, action: { kind: 'prices', posts, favoured: false } });
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
    await a.say({ t: 'act', id: nid(), v: a.view!.version, action: { kind: 'prices', posts: [], favoured: false } });
    expect(a.errors.slice(-1)[0]).toContain('already locked');
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
    expect(a.errors.slice(-1)[0]).toContain('already set out');
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
    expect(h.room.waitingForOpponent()).toBe(true);
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
    await a.say({ t: 'config', config: { days: 8, ai: 2, unripe: true, upgrades: true, events: true } });
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
  it('gives every seat its own character, even when two players ask for the same one', async () => {
    const h = new Harness();
    const a = h.connect('A');
    const b = h.connect('B');
    await a.say({ t: 'hello', rv: RULES_VERSION, pv: PROTOCOL_VERSION, name: 'A', avatar: '🦊' });
    await b.say({ t: 'hello', rv: RULES_VERSION, pv: PROTOCOL_VERSION, name: 'B', avatar: '🦊' });
    const seats = b.view!.seats;
    expect(seats[0].avatar).toBe('🦊');
    expect(new Set(seats.map((x) => x.avatar)).size).toBe(2);
  });

  it('lets a player switch to a free character in the lobby and refuses a taken one', async () => {
    const h = new Harness();
    const { a, b } = await lobbyOf2(h);
    const mine = a.view!.seats[0].avatar;
    await b.say({ t: 'character', avatar: mine });
    expect(b.errors.slice(-1)[0]).toContain('taken');
    const free = ['🐷', '🐸'].find((x) => x !== mine && x !== a.view!.seats[1].avatar)!;
    await b.say({ t: 'character', avatar: free });
    expect(a.view!.seats[1].avatar).toBe(free);
    await b.say({ t: 'character', avatar: 'not a character' });
    expect(b.errors.slice(-1)[0]).toContain('six shopkeepers');
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
