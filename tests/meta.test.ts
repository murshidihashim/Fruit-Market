// Server features outside rooms: telemetry cleaning, the replay-checked daily leaderboard, quick match.
import { describe, expect, it } from 'vitest';
import { aiStep, planBids } from '../src/engine/ai';
import { FRUITS } from '../src/engine/data';
import { dailyConfig } from '../src/engine/daily';
import { applyAction, beginBuying, canBuy, finishReveal, newGame, type Action, type GameState } from '../src/engine/game';
import { addEntry, cleanIngest, quickMatch, QUICK_WAIT_MS, utcDay, verifyDaily } from '../server/meta';

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

describe('daily leaderboard', () => {
  it('replays a submitted game and gets the same score', () => {
    const { s, moves } = playDaily();
    expect(s.phase).toBe('over');
    const { entry } = verifyDaily({ date: DATE, name: 'Tester', actions: moves }, NOW);
    expect(entry.cash).toBe(s.players[0].cash);
    expect(entry.sold).toBe(s.players[0].stats.sold);
  });

  it('rejects games that don\'t finish, illegal moves and closed dates', () => {
    const { moves } = playDaily();
    expect(() => verifyDaily({ date: DATE, name: 'X', actions: moves.slice(0, 10) }, NOW)).toThrow();
    const bad = [...moves];
    const i = bad.findIndex((a) => a.kind === 'buy');
    bad.splice(i, 0, { kind: 'upgrade', upgrade: 'cart' });
    expect(() => verifyDaily({ date: DATE, name: 'X', actions: bad }, NOW)).toThrow();
    expect(() => verifyDaily({ date: '2020-01-01', name: 'X', actions: moves }, NOW)).toThrow();
  });

  it('keeps each name\'s best score, sorted', () => {
    let b = addEntry([], { name: 'A', cash: 50, sold: 10, at: 1 });
    b = addEntry(b, { name: 'B', cash: 80, sold: 9, at: 2 });
    b = addEntry(b, { name: 'A', cash: 40, sold: 12, at: 3 });
    expect(b.map((e) => [e.name, e.cash])).toEqual([['B', 80], ['A', 50]]);
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
  it('pairs the second player with the first one\'s room, and expires stale waits', async () => {
    let n = 0;
    const create = async () => `ROOM${++n}`;
    const a = await quickMatch({ code: null, since: 0 }, 1000, create);
    expect(a).toMatchObject({ code: 'ROOM1', host: true });
    const b = await quickMatch(a.q, 2000, create);
    expect(b).toMatchObject({ code: 'ROOM1', host: false });
    const c = await quickMatch(b.q, 3000, create);
    expect(c.code).toBe('ROOM2');
    const d = await quickMatch(c.q, 3000 + QUICK_WAIT_MS + 1, create);
    expect(d).toMatchObject({ code: 'ROOM3', host: true });
  });
});
