import { describe, expect, it } from 'vitest';
import { planBids } from '../src/engine/ai';
import { FRUITS } from '../src/engine/data';
import { activePlayer, canBuy } from '../src/engine/game';
import type { ClientMsg, RoomView, ServerMsg } from '../src/net/protocol';
import { freshRoom, Room, ROOM_TTL_MS, type Conn, type RoomIO } from '../server/room';

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
  await a.say({ t: 'hello', name: 'Murshidi', avatar: '🧑‍🍳' });
  await b.say({ t: 'hello', name: 'Friend', avatar: '👩‍🍳' });
  return { a, b };
}

async function start(h: Harness, a: Client, b: Client, days: 8 | 10 | 14 = 8, ai = 0) {
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
  if (g.phase === 'bid' && !v.submitted[me]) {
    const { bids } = planBids(g, me);
    await c.say({ t: 'act', id: nid(), v: v.version, action: { kind: 'bids', bids, favoured: false } });
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
    for (let i = 0; i < 200 && h.room.d.game!.phase !== 'bid'; i++) (await botStep(a)) || (await botStep(b));
    expect(h.room.d.game!.phase).toBe('bid');
    const g = a.view!.game!;
    const { bids } = planBids(g, 0);
    const marked = bids.length ? bids : [];
    const before = b.inbox.length;
    await a.say({ t: 'act', id: nid(), v: a.view!.version, action: { kind: 'bids', bids: marked, favoured: false } });
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
    await a.say({ t: 'act', id: nid(), v: a.view!.version, action: { kind: 'bids', bids: [], favoured: false } });
    expect(a.errors.slice(-1)[0]).toContain('already locked');
  });

  it('applies a repeated action id only once and rejects stale versions', async () => {
    const h = new Harness();
    const { a, b } = await lobbyOf2(h);
    await start(h, a, b, 8);
    for (let i = 0; i < 50 && h.room.d.game!.phase === 'morning'; i++) (await botStep(a)) || (await botStep(b));
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

  it('lets a player reconnect with their token but not with the room code alone', async () => {
    const h = new Harness();
    const { a, b } = await lobbyOf2(h);
    await start(h, a, b, 8);
    const token = a.token;
    a.close();
    expect(b.view!.seats[0].connected).toBe(false);
    const stranger = h.connect('X');
    await stranger.say({ t: 'hello', name: 'Sneaky', avatar: '🦸' });
    expect(stranger.errors.slice(-1)[0]).toContain('already started');
    expect(stranger.seat).toBeNull();
    const a2 = h.connect('A2');
    await a2.say({ t: 'hello', token, name: 'Murshidi', avatar: '🧑‍🍳' });
    expect(a2.seat).toBe(0);
    expect(a2.view!.game!.day).toBe(1);
    expect(b.view!.seats[0].connected).toBe(true);
  });

  it('rejects players when the room is full and handles leaving the lobby', async () => {
    const h = new Harness();
    const { a, b } = await lobbyOf2(h);
    await a.say({ t: 'config', config: { days: 8, ai: 2, unripe: true, upgrades: true, events: true } });
    const c = h.connect('C');
    await c.say({ t: 'hello', name: 'Third', avatar: '🦸' });
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
