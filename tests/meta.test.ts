// Server features outside rooms: telemetry cleaning, the replay-checked daily leaderboard, quick match.
import { describe, expect, it } from 'vitest';
import { aiStep, planPrices, planStall } from '../src/engine/ai';
import { FRUITS } from '../src/engine/data';
import { dailyConfig, sprintConfig } from '../src/engine/daily';
import { applyAction, beginBuying, canBuy, finishReveal, newGame, type Action, type GameState } from '../src/engine/game';
import { QUICK_FILL_MS } from '../src/net/protocol';
import { addEntry, cleanIngest, dailyBoardKey, NAME_TAKEN, ownerOf, publicBoard, loadQueues, quickMatch, quickSize, sprintBoardKey, sprintWeekKey, utcDay, verifyDaily } from '../server/meta';
import { AI_VERSION, RULES_VERSION, UPDATE_MSG } from '../src/net/protocol';

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
    } else if (s.phase === 'stall') {
      act({ kind: 'stall', stall: planStall(s, me) });
    } else if (s.phase === 'bid') {
      const { posts } = planPrices(s, me);
      act({ kind: 'prices', posts });
    } else if (s.phase === 'order') act({ kind: 'order', price: null });
    else if (s.phase === 'evening') act({ kind: 'endEvening' });
    else if (s.phase === 'tie') act({ kind: 'tie', play: true }); // rules 18: asked after the flip; the answer is a move like any other
  }
  return { s, moves };
}

const OWNER = 'a'.repeat(64);
const sub = (actions: Action[], extra: Partial<{ date: string; name: string; rv: number; av: number }> = {}) =>
  ({ date: DATE, name: 'Tester', actions, rv: RULES_VERSION, av: AI_VERSION, ...extra });

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
    bad.splice(i, 0, { kind: 'upgrade', upgrade: 'barrow' });
    expect(() => verifyDaily(sub(bad), NOW, OWNER)).toThrow();
    expect(() => verifyDaily(sub(moves, { date: '2020-01-01' }), NOW, OWNER)).toThrow();
  });

  it('rejects games played under different rules', () => {
    const { moves } = playDaily();
    expect(() => verifyDaily(sub(moves, { rv: RULES_VERSION - 1 }), NOW, OWNER)).toThrow(UPDATE_MSG);
    expect(() => verifyDaily({ date: DATE, name: 'Old app', actions: moves } as never, NOW, OWNER)).toThrow(UPDATE_MSG);
  });

  it('rejects games played against older computer players (the replay would differ)', () => {
    // PLAN-117: version 8 is the Daily with every rival at Normal; a phone still on 7 played against Hard Uncle Benny.
    expect(AI_VERSION).toBe(8);
    const { s, moves } = playDaily();
    expect(() => verifyDaily(sub(moves, { av: 7 }), NOW, OWNER)).toThrow(UPDATE_MSG);
    expect(() => verifyDaily(sub(moves, { av: 7 }), NOW, OWNER, true)).toThrow(UPDATE_MSG);
    // An app from 1.8.0 or earlier sends no computer-player version: that is version 1.
    expect(() => verifyDaily({ date: DATE, name: 'Tester', actions: moves, rv: RULES_VERSION }, NOW, OWNER)).toThrow(UPDATE_MSG);
    expect(() => verifyDaily(sub(moves, { av: 1 }), NOW, OWNER)).toThrow(UPDATE_MSG);
    expect(() => verifyDaily(sub(moves, { av: 2 }), NOW, OWNER)).toThrow(UPDATE_MSG);
    expect(() => verifyDaily(sub(moves, { av: 3 }), NOW, OWNER)).toThrow(UPDATE_MSG);
    expect(() => verifyDaily(sub(moves, { av: 4 }), NOW, OWNER)).toThrow(UPDATE_MSG);
    expect(() => verifyDaily(sub(moves, { av: 5 }), NOW, OWNER)).toThrow(UPDATE_MSG);
    // 1.24.0 (rules 19, computer players 6, the jam value): asked to update.
    expect(() => verifyDaily(sub(moves, { av: 6 }), NOW, OWNER)).toThrow(UPDATE_MSG);
    expect(() => verifyDaily(sub(moves, { rv: 19, av: 6 }), NOW, OWNER)).toThrow(UPDATE_MSG);
    expect(verifyDaily(sub(moves, { av: 8 }), NOW, OWNER).entry.cash).toBe(s.players[0].cash);
  });

  it('keeps a daily board for each rules and computer-player version', () => {
    expect(dailyBoardKey('2026-11-01')).toBe(`daily:2026-11-01:r${RULES_VERSION}:a${AI_VERSION}`);
    // PLAN-117: the Normal-only set-up has boards of its own, apart from 1.27.0's (Uncle Benny at Hard, version 7).
    expect(dailyBoardKey('2026-11-01')).toBe('daily:2026-11-01:r20:a8');
    expect(sprintBoardKey('2026-11-01')).toBe('sprint:2026-11-01:r20:a8');
    expect(sprintWeekKey('2026-11-01')).toBe('sprintweek:2026-W44:r20:a8');
  });

  it('PLAN-117: replays the Daily and the Sprint with every rival at Normal', () => {
    for (const cfg of [dailyConfig(DATE, 'Me'), sprintConfig(DATE, 'Me')]) {
      expect(cfg.players.filter((p) => p.kind === 'ai').map((p) => [p.name, p.level])).toEqual([['Rosa', 'normal'], ['Uncle Benny', 'normal'], ['Ah Chen', 'normal']]);
    }
    const { state } = verifyDaily(sub(playDaily().moves), NOW, OWNER);
    expect(state.players.filter((p) => p.kind === 'ai').every((p) => p.level === 'normal')).toBe(true);
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
    // PLAN-125: a room past its fill time has started (or nobody was there): it is not asked.
    const stale = await quickMatch(next.q, 1000 + QUICK_FILL_MS, create, async () => true);
    expect(stale.code).toBe('ROOM3');
    const short = await quickMatch(stale.q, 1000 + QUICK_FILL_MS + 5000, create, async () => true, 4000);
    expect(short.code).toBe('ROOM4');
  });

  it('reads the table size asked for; anything else is a two-stall table (PLAN-125)', () => {
    expect([4, 6, 2].map((stalls) => quickSize({ stalls }))).toEqual([4, 6, 2]);
    for (const bad of [null, undefined, {}, { stalls: '4' }, { stalls: 3 }, { stalls: 8 }, { stalls: -4 }, { stalls: 4.5 }, [], 'stalls']) {
      expect(quickSize(bad)).toBe(2);
    }
  });

  it('keeps one queue per size, and the queue from before becomes the two-stall one (PLAN-125)', () => {
    const none = { code: null, since: 0 };
    expect(loadQueues(undefined, undefined)).toEqual({ 2: none, 4: none, 6: none });
    expect(loadQueues(undefined, { code: 'OLD234', since: 5 })).toEqual({ 2: { code: 'OLD234', since: 5 }, 4: none, 6: none });
    const saved = { 2: { code: 'TWO234', since: 1 }, 4: { code: 'FOUR23', since: 2 }, 6: { code: 7, since: 'x' } };
    expect(loadQueues(saved, { code: 'OLD234', since: 5 })).toEqual({ 2: { code: 'TWO234', since: 1 }, 4: { code: 'FOUR23', since: 2 }, 6: none });
  });

  it('each size waits on its own room (PLAN-125)', async () => {
    let n = 0;
    const create = async () => `ROOM${++n}`;
    const q = loadQueues(undefined, undefined);
    const four = await quickMatch(q[4], 0, create, async () => true);
    const two = await quickMatch(q[2], 0, create, async () => true);
    q[4] = four.q; q[2] = two.q;
    expect([four.code, two.code]).toEqual(['ROOM1', 'ROOM2']);
    expect((await quickMatch(q[4], 1000, create, async (c) => c === 'ROOM1')).code).toBe('ROOM1');
    expect(await quickMatch(q[6], 1000, create, async () => true)).toMatchObject({ code: 'ROOM3', host: true });
  });
});
