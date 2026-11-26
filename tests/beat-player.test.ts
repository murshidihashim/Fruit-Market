// The beat each new state plays on the table (game/beatPlayer.ts), in order, with the animations themselves stubbed
// (animator.tsx has its own tests): what is held back before the new state is drawn, the bell at the flip and before
// the rush, and the bell's one sound (REP-140 A-01: these were checked by reading the controller's source).
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { aiActFor } from '../src/engine/ai';
import { RIVALS } from '../src/engine/data';
import { activePlayer, applyAction, decideTie, newGame, type GameState } from '../src/engine/game';
import { holdCash, shownCash } from '../src/ui/cashShown';
import { Bell, playBeat, type BeatScreen } from '../src/ui/game/beatPlayer';
import { cashBeforeRush, stepKind } from '../src/ui/game/stepKind';

const calls: string[] = [];
vi.mock('../src/ui/game/animator', async (load) => {
  const real = await load<typeof import('../src/ui/game/animator')>();
  const note = (name: string) => async (...args: unknown[]) => {
    calls.push(name === 'reveal' ? `reveal rung=${String(args[4])} shared=${String(args[5])}` : name);
    // the bell's script shows the bell through the setter it is given: shut, then every row open
    if (name === 'bellRings') { const set = args[1] as (n: number | null) => void; set(0); set(3); }
    return name === 'reveal' ? [] : undefined;
  };
  return { ...real, nightfall: note('nightfall'), delivery: note('delivery'), moves: note('moves'), arrive: note('arrive'), bellRings: note('bellRings'), reveal: note('reveal'), tiePlayed: note('tiePlayed') };
});

beforeEach(() => {
  calls.length = 0;
  vi.stubGlobal('requestAnimationFrame', (cb: () => void) => setTimeout(cb, 0));
  vi.stubGlobal('matchMedia', () => ({ matches: false }));
});
afterEach(() => { holdCash(null); vi.unstubAllGlobals(); });

/** A screen that notes what the beat does to it, in order. */
function screen(viewer = 0, shared = false): BeatScreen {
  const set = (name: string) => (v: unknown) => { calls.push(`${name}(${JSON.stringify(v)})`); };
  return {
    viewer, shared, setNight: set('night'), setNightSlide: set('slide'), setLastNight: set('lastNight'), setLastJuice: set('lastJuice'),
    setRevealDone: set('revealDone'), setOrderShow: set('orderShow'), setBell: set('bell'), setShow: set('show'),
  };
}
const play = (prev: GameState, next: GameState, ui = screen()) => playBeat(prev, next, stepKind(prev, next, null), ui, () => { calls.push('commit'); });

/** A real game played by the computer until a stall is asked about Favoured Trade (the step before it is the flip). */
function toTie(): { bid: GameState; tie: GameState } {
  for (let seed = 1; seed < 80; seed++) {
    let s = newGame({ players: [0, 1, 2, 3].map((i) => ({ name: RIVALS[i].name, kind: i === 0 ? 'human' as const : 'ai' as const, level: 'normal' as const, avatar: RIVALS[i].avatar })), days: 8, unripe: true, upgrades: true, events: true, seed });
    for (let i = 0; i < 6000 && s.phase !== 'over'; i++) {
      const next: GameState = s.phase === 'morning' ? applyAction(s, 0, { kind: 'begin' }) : s.phase === 'reveal' ? applyAction(s, 0, { kind: 'finish' }) : aiActFor(s, activePlayer(s))!;
      if (next.phase === 'tie' && s.phase === 'bid') return { bid: s, tie: next };
      s = next;
    }
  }
  throw new Error('no game reached the Favoured Trade step');
}

describe('the bell at the flip and before the rush (beatPlayer.ts)', () => {
  const { bid, tie } = toTie();

  it('at the flip the rows are shut together with the new state, so no open row is drawn before the bell; the bell rings and is put away', async () => {
    expect(stepKind(bid, tie, null).flip).toBe(true);
    await play(bid, tie);
    // (the stubbed script turns the rows through the same setter: shut, then all open)
    expect(calls).toEqual(['bell(0)', 'commit', 'bellRings', 'bell(0)', `bell(3)`, 'bell(null)']);
  });

  it('with reduced motion the rows are open at once', async () => {
    vi.stubGlobal('matchMedia', () => ({ matches: true }));
    await play(bid, tie);
    expect(calls[0]).toBe(`bell(${tie.players.length})`);
  });

  it('after a Favoured Trade answer the rush starts with the bell already rung: it is not shown a second time', async () => {
    const asked = tie.tieAsk![0];
    const rush = decideTie(tie, asked, false);
    expect(stepKind(tie, rush, null).rush).toBe(true);
    await play(tie, rush);
    expect(calls).not.toContain('bellRings');
    expect(calls).toContain('reveal rung=true shared=false');
  });

  it('the rush straight after pricing rings the bell in the rush\'s own script; a shared phone is said so', async () => {
    let s = bid;
    while (s.phase === 'bid') s = aiActFor(s, activePlayer(s)) ?? applyAction(s, activePlayer(s), { kind: 'prices', posts: [] });
    const rush = s.phase === 'tie' ? decideTie(s, s.tieAsk![0], false) : s;
    const prev = s.phase === 'tie' ? s : bid;
    await play(prev, rush, screen(0, true));
    expect(calls.some((c) => c.startsWith('reveal') && c.endsWith('shared=true'))).toBe(true);
    // the takings wait for the rush: not done as it starts, done once it has played
    expect(calls.indexOf('revealDone(false)')).toBeLessThan(calls.indexOf('commit'));
    expect(calls[calls.length - 1]).toBe('revealDone(true)');
  });

  it('every total is held at what it was before the rush until the coins land', async () => {
    const asked = tie.tieAsk![0];
    const rush = decideTie(tie, asked, false);
    let held: number[] = [];
    await playBeat(tie, rush, stepKind(tie, rush, null), screen(), () => { held = rush.players.map((pl, i) => shownCash(i, pl.cash)); });
    expect(held).toEqual(cashBeforeRush(rush));
    expect(held).not.toEqual(rush.players.map((pl) => pl.cash));
  });
});

describe('the bell\'s one sound (beatPlayer.ts Bell)', () => {
  it('rings once as the bell first shows anything, and is ready again once the bell is put away; it notes the day it rang', () => {
    const shown: (number | null)[] = [];
    const sound = vi.fn();
    let day = 3;
    const bell = new Bell((n) => shown.push(n), () => day, sound);
    for (const n of [0, 1, 2, 3]) bell.set(n);
    expect(sound).toHaveBeenCalledTimes(1);
    expect(bell.rangOn).toBe(3);
    bell.set(null);
    expect(bell.up).toBe(false);
    day = 4;
    bell.set(4);
    expect(sound).toHaveBeenCalledTimes(2);
    expect(bell.rangOn).toBe(4);
    expect(shown).toEqual([0, 1, 2, 3, null, 4]);
  });

  it('the game table hands the same setter to the bell\'s script and the rush\'s, so either way the bell sounds once', async () => {
    const { bid, tie } = toTie();
    const sound = vi.fn();
    const bell = new Bell(() => {}, () => tie.day, sound);
    await playBeat(bid, tie, stepKind(bid, tie, null), { ...screen(), setBell: bell.set }, () => {});
    // shut with the new state, then the bell's script turns every row (the stub): one sound in all
    expect(sound).toHaveBeenCalledTimes(1);
    expect(bell.up).toBe(false);
  });
});

describe('the morning after the night (beatPlayer.ts)', () => {
  it('the night plays from this stall\'s own view, then the new day is drawn and the night put away', async () => {
    let s = newGame({ players: [0, 1].map((i) => ({ name: RIVALS[i].name, kind: i === 0 ? 'human' as const : 'ai' as const, level: 'normal' as const, avatar: RIVALS[i].avatar })), days: 4, unripe: true, upgrades: true, events: true, seed: 2 });
    let prev = s;
    for (let i = 0; i < 2000 && s.day === 1; i++) {
      prev = s;
      s = s.phase === 'morning' ? applyAction(s, 0, { kind: 'begin' }) : s.phase === 'reveal' ? applyAction(s, 0, { kind: 'finish' }) : aiActFor(s, activePlayer(s)) ?? applyAction(s, activePlayer(s), { kind: 'endEvening' });
    }
    expect(stepKind(prev, s, null).newDay).toBe(true);
    await play(prev, s);
    expect(calls.slice(0, 2)).toEqual(['nightfall', 'slide(null)']);
    expect(calls.indexOf('commit')).toBeGreaterThan(calls.findIndex((c) => c.startsWith('lastJuice')));
    expect(calls[calls.length - 1]).toBe('night(false)');
  });
});
