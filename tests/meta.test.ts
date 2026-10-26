// Server features outside rooms: telemetry cleaning, the replay-checked daily leaderboard, quick match.
import { describe, expect, it } from 'vitest';
import { aiStep, planBids } from '../src/engine/ai';
import { FRUITS } from '../src/engine/data';
import { dailyConfig } from '../src/engine/daily';
import { applyAction, beginBuying, canBuy, finishReveal, newGame, type Action, type GameState } from '../src/engine/game';
import { addEntry, cleanIngest, NAME_TAKEN, ownerOf, publicBoard, quickMatch, QUICK_WAIT_MS, utcDay, verifyDaily } from '../server/meta';
import { RULES_VERSION, UPDATE_MSG } from '../src/net/protocol';

const NOW = Date.UTC(2026, 9, 25, 12);
const DATE = utcDay(NOW);

/** Plays today's daily as a simple human (buys what it can, prices like the computer) and records the moves. */
function playDaily(name = 'Tester'): { s: GameState; moves: Action[] } {
  let s = newGame(dailyConfig(DATE, name));
  const me = 0;
  const moves: Action[] = [];
  const act = (a: Action) => { s = applyAction(s, me, a); moves.push(a); };
  for (let i = 0; i < 5000 && s.phase !== 'over'; i++) {
    if (s.phase === 'morning') {
      if (s.day === 1 && !s.players[me].trait) { act({ kind: 'trait', trait: s.players[me].traitOffer![1] }); continue; }
      s = beginBuying(s); continue;
    }
    if (s.phase === 'reveal') { s = finishReveal(s); continue; }
    const ai = aiStep(s);
    if (ai) { s = ai; continue; }
    if (s.phase === 'buy') {
      const pick = FRUITS.flatMap((f) => s.market[f].map((_, pos) => ({ f, pos }))).find(({ f, pos }) => !canBuy(s, me, f, pos));
      if (pick && s.players[me].boughtToday < 2) act({ kind: 'buy', fruit: pick.f, pos: pick.pos });
      else act({ kind: 'endBuy' });
    } else if (s.phase === 'bid') {
      const { bids } = planBids(s, me);
      act({ kind: 'bids', bids, favoured: false });
    } else if (s.phase === 'evening') act({ kind: 'endEvening' });
  }
  return { s, moves };
}

const OWNER = 'a'.repeat(64);
const sub = (actions: Action[], extra: Partial<{ date: string; name: string; rv: number }> = {}) =>
  ({ date: DATE, name: 'Tester', actions, rv: RULES_VERSION, ...extra });

describe('daily leaderboard', () => {
  it('replays a submitted game and gets the same score', () => {
    const { s, moves } = playDaily();
    expect(s.phase).toBe('over');
    const { entry } = verifyDaily(sub(moves), NOW, OWNER);
    expect(entry.cash).toBe(s.players[0].cash);
    expect(entry.sold).toBe(s.players[0].stats.sold);
    expect(entry.owner).toBe(OWNER);
  });

  it('rejects games that don\'t finish, illegal moves and closed dates', () => {
    const { moves } = playDaily();
    expect(() => verifyDaily(sub(moves.slice(0, 10)), NOW, OWNER)).toThrow();
    const bad = [...moves];
    const i = bad.findIndex((a) => a.kind === 'buy');
    bad.splice(i, 0, { kind: 'upgrade', upgrade: 'cart' });
    expect(() => verifyDaily(sub(bad), NOW, OWNER)).toThrow();
    expect(() => verifyDaily(sub(moves, { date: '2020-01-01' }), NOW, OWNER)).toThrow();
  });

  it('rejects games played under different rules', () => {
    const { moves } = playDaily();
    expect(() => verifyDaily(sub(moves, { rv: RULES_VERSION - 1 }), NOW, OWNER)).toThrow(UPDATE_MSG);
    expect(() => verifyDaily({ date: DATE, name: 'Old app', actions: moves } as never, NOW, OWNER)).toThrow(UPDATE_MSG);
  });

  it('replaces a blocked or reserved name with a neutral one', () => {
    const { moves } = playDaily();
    expect(verifyDaily(sub(moves, { name: 'Sh1tHead' }), NOW, OWNER).entry.name).toBe('Shopkeeper aaaa');
    expect(verifyDaily(sub(moves, { name: 'Foxy Rosa' }), NOW, OWNER).entry.name).toBe('Shopkeeper aaaa');
  });

  it('a name belongs to the first device that used it today', () => {
    let b = addEntry([], { name: 'Mira', cash: 50, sold: 10, at: 1, owner: 'dev1' });
    expect(() => addEntry(b, { name: 'Mira', cash: 90, sold: 10, at: 2, owner: 'dev2' })).toThrow(NAME_TAKEN);
    expect(() => addEntry(b, { name: 'm1ra', cash: 90, sold: 10, at: 2, owner: 'dev2' })).toThrow(NAME_TAKEN); // look-alike
    b = addEntry(b, { name: 'Mira', cash: 70, sold: 10, at: 3, owner: 'dev1' });
    expect(b).toHaveLength(1);
    expect(b[0].cash).toBe(70);
  });

  it('keeps one entry per device (best score, latest name), sorted', () => {
    let b = addEntry([], { name: 'A', cash: 50, sold: 10, at: 1, owner: 'x' });
    b = addEntry(b, { name: 'B', cash: 80, sold: 9, at: 2, owner: 'y' });
    b = addEntry(b, { name: 'A2', cash: 40, sold: 12, at: 3, owner: 'x' });
    expect(b.map((e) => [e.name, e.cash])).toEqual([['B', 80], ['A2', 50]]);
  });

  it('never shows owner hashes publicly, and hashes the device key', async () => {
    const b = addEntry([], { name: 'A', cash: 50, sold: 10, at: 1, owner: 'secret' });
    expect(JSON.stringify(publicBoard(b))).not.toContain('secret');
    const h = await ownerOf('0123456789abcdef0123456789abcdef');
    expect(h).toMatch(/^[0-9a-f]{64}$/);
    expect(h).not.toContain('0123456789abcdef');
    await expect(ownerOf('nope')).rejects.toThrow(UPDATE_MSG);
  });
});

describe('telemetry', () => {
  it('keeps only well-formed events and trims errors', () => {
    const r = cleanIngest({ events: ['game_end:win', 'BAD NAME', 'day_reached:5', 42, 'x'.repeat(80)], errors: ['boom\nat x.js:1', 7] });
    expect(r.events).toEqual(['game_end:win', 'day_reached:5']);
    expect(r.errors).toEqual(['boom at x.js:1']);
    expect(cleanIngest(null)).toEqual({ events: [], errors: [] });
  });
});

describe('quick match', () => {
  it('pairs the next searcher with a player who is still waiting', async () => {
    let n = 0;
    const create = async () => `ROOM${++n}`;
    const alive = new Set<string>();
    const waiting = async (c: string) => alive.has(c);
    const a = await quickMatch({ code: null, since: 0 }, 1000, create, waiting);
    expect(a).toMatchObject({ code: 'ROOM1', host: true });
    alive.add('ROOM1');
    const b = await quickMatch(a.q, 2000, create, waiting);
    expect(b).toMatchObject({ code: 'ROOM1', host: false });
    alive.delete('ROOM1'); // the match started
    const c = await quickMatch(b.q, 3000, create, waiting);
    expect(c).toMatchObject({ code: 'ROOM2', host: true });
  });

  it('never matches a player who gave up, or a stale room', async () => {
    let n = 0;
    const create = async () => `ROOM${++n}`;
    const first = await quickMatch({ code: null, since: 0 }, 0, create, async () => true);
    // The waiting player closed the app: the room reports nobody waiting.
    const next = await quickMatch(first.q, 1000, create, async () => false);
    expect(next).toMatchObject({ code: 'ROOM2', host: true });
    const stale = await quickMatch(next.q, 1000 + QUICK_WAIT_MS + 1, create, async () => true);
    expect(stale.code).toBe('ROOM3');
  });
});
