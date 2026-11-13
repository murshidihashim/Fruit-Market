// Rules version 19, the evening for everyone at once (the owner: "each player access and build the upgrade together
// rather than waiting player by player"). Every stall with something to decide decides at the same time and says
// Lights out; night falls when every stall is done. Priority, the one rule where order mattered: any number of stalls
// may play it, the one earliest in today's line-up goes first tomorrow and the others' cards go back to their hands.
import { describe, expect, it } from 'vitest';
import { aiActFor, aiStep, autoplay, computersEvening } from '../src/engine/ai';
import { FAVOURS, FRUIT, UPGRADES } from '../src/engine/data';
import {
  activePlayer, applyAction, beginBuying, buyUpgrade, canPlayFavour, canShade, canUpgrade, emptyStock, endEvening, eveningChoice, eveningOpen,
  finishReveal, isDraftNight, newGame, playFavour, publicView, setShade,
  type GameConfig, type GameState, type PlayerConfig,
} from '../src/engine/game';
import { redact } from '../server/room';
import { passEvening } from './stall-step';

const person = (i: number): PlayerConfig => ({ name: `P${i}`, kind: 'human', avatar: '' });
const computer = (i: number): PlayerConfig => ({ name: `C${i}`, kind: 'ai', level: 'normal', avatar: '' });
const config = (players: PlayerConfig[], extra: Partial<GameConfig> = {}): GameConfig => ({ players, days: 10, unripe: true, upgrades: true, events: false, seed: 5, ...extra });

/**
 * The evening of `day` as it opens (the game's own finishReveal), with today's line-up `order`. Every stall starts with
 * no perk, no card, an empty shelf and `cash`; `set` gives each stall what the test needs before the evening opens.
 */
function opening(players: PlayerConfig[], day: number, order: number[], set: (s: GameState) => void = () => {}, cash = 30): GameState {
  const s = structuredClone(newGame(config(players)));
  s.players.forEach((pl) => { pl.stock = emptyStock(true); pl.trait = null; pl.traitOffer = []; pl.favours = []; pl.upgrades = []; pl.cash = cash; });
  s.day = day; s.phase = 'reveal'; s.results = null; s.event = null; s.nextEvent = null; s.standing = null;
  s.order = order; s.turn = 0; s.firstMarket = []; s.secondMarket = []; s.queue = []; s.priorityNext = null;
  set(s);
  return finishReveal(s);
}

describe('rules 19: the evening is one shared step', () => {
  it('every stall with something to decide can act at once, in any order; nobody waits for a turn', () => {
    const g = opening([person(0), person(1), person(2)], 3, [0, 1, 2]);
    expect(isDraftNight(g)).toBe(true);
    expect(g.phase).toBe('evening');
    expect(g.eveningDone).toEqual([false, false, false]);
    // The last stall in the line-up builds first, then the first, then the middle one: each is allowed at once.
    for (const p of [2, 0, 1]) expect(canUpgrade(g, p, 'premium')).toBeNull();
    let s = buyUpgrade(g, 2, 'juicebar');
    s = buyUpgrade(s, 0, 'premium');
    s = buyUpgrade(s, 1, 'barrow');
    expect(s.players.map((pl) => pl.upgrades)).toEqual([['premium'], ['barrow'], ['juicebar']]);
    // Saying Lights out in any order: the line-up's last stall first.
    s = endEvening(s, 2);
    s = endEvening(s, 0);
    expect(s.phase).toBe('evening');
    s = endEvening(s, 1);
    expect(s.day).toBe(4);
    expect(s.phase).toBe('morning');
  });

  it('night falls only when every stall is done; a stall that is done can do nothing more tonight', () => {
    const g = opening([person(0), person(1)], 3, [1, 0]);
    let s = endEvening(g, 0);
    expect(s.phase).toBe('evening');
    expect(eveningOpen(s, 0)).toBe(false);
    expect(eveningOpen(s, 1)).toBe(true);
    expect(canUpgrade(s, 0, 'premium')).toBe('Your lights are already out');
    expect(() => endEvening(s, 0)).toThrow(/Your lights are already out/);
    expect(() => buyUpgrade(s, 0, 'premium')).toThrow(/Your lights are already out/);
    // Building is not saying Lights out: stall 1 is still deciding after it has built.
    s = buyUpgrade(s, 1, 'premium');
    expect(eveningChoice(s, 1)).toBe(false);
    expect(eveningOpen(s, 1)).toBe(true);
    expect(s.phase).toBe('evening');
    s = endEvening(s, 1);
    expect(s.day).toBe(4);
    // Outside the evening nothing of it can be done.
    expect(canUpgrade(s, 1, 'juicebar')).toBe('Not your turn');
  });

  it('a stall with nothing to decide is done as the evening opens; with none to decide, night falls at once', () => {
    const g = opening([person(0), person(1), person(2)], 3, [0, 1, 2], (s) => { s.players[1].cash = 2; s.players[2].upgrades = ['barrow', 'premium']; });
    expect(g.eveningDone).toEqual([false, true, true]);
    expect(activePlayer(g)).toBe(0);
    expect(endEvening(g, 0).day).toBe(4);
    // An ordinary evening with no cards and no Shade Cloth: straight to the next morning.
    expect(opening([person(0), person(1)], 4, [0, 1]).day).toBe(5);
  });

  it('Gossip and the Shade Cloth are not affected by order: each stall decides its own, at the same time', () => {
    const g = opening([person(0), person(1), person(2)], 4, [2, 1, 0], (s) => {
      s.players[0].favours = ['gossip'];
      s.players[1].trait = 'keeper';
      s.players[1].stock.apple[FRUIT.apple.ripe.length - 1] = 2;
      s.queue = [{ id: 90, name: 'Walk-in A', walkIn: true, wants: [{ fruit: 'apple', qty: 1, max: 6 }], original: [{ fruit: 'apple', qty: 1, max: 6 }] }];
    });
    expect(g.eveningDone).toEqual([false, false, true]);
    expect(canShade(g, 1, 'apple')).toBeNull();
    expect(canPlayFavour(g, 0, 0)).toBeNull();
    // Stall 0 is last in the line-up and plays first; stall 1 names its fruit after.
    let s = playFavour(g, 0, 0);
    s = setShade(s, 1, 'apple');
    expect(s.queue[0].seenBy).toEqual([0]);
    expect(s.players[1].shade).toBe('apple');
    s = endEvening(endEvening(s, 1), 0);
    expect(s.day).toBe(5);
  });
});

describe('rules 19: Priority played by several stalls', () => {
  /** Three people, every one holding a Priority card, on an ordinary evening; today's line-up is 2, 0, 1. */
  const three = () => opening([person(0), person(1), person(2)], 4, [2, 0, 1], (s) => { s.players.forEach((pl) => { pl.favours = ['priority']; }); });

  it('the card says so', () => {
    expect(FAVOURS.priority.text).toBe('You buy first tomorrow. If several are played, the stall earliest in today\'s line-up goes first; the others go back.');
  });

  it('any number may play it: the stall earliest in today\'s line-up goes first, the others\' cards go back unused', () => {
    let s = three();
    s = playFavour(s, 0, 0);
    expect(s.priorityNext).toBe(0); // the only one so far
    s = playFavour(s, 1, 0);
    expect(s.priorityNext).toBe(0); // 0 is earlier in the line-up than 1
    s = playFavour(s, 2, 0);
    expect(s.priorityNext).toBe(2); // 2 is first in today's line-up
    expect(s.priorityPlayed).toEqual([0, 1, 2]);
    s = passEvening(s);
    expect(s.day).toBe(5);
    expect(s.order[0]).toBe(2);
    expect(s.players.map((pl) => pl.favours)).toEqual([['priority'], ['priority'], []]);
    expect(s.priorityBack).toEqual([0, 1]);
    // Only the card that was used counts as played.
    expect(s.players.map((pl) => (pl.stats.played ?? []).includes('priority'))).toEqual([false, false, true]);
    // The game says so in plain words.
    expect(s.log).toContain('P0\'s Priority card goes back to the hand: P2 is earlier in today\'s line-up and buys first tomorrow');
    expect(s.log).toContain('P1\'s Priority card goes back to the hand: P2 is earlier in today\'s line-up and buys first tomorrow');
  });

  it('the order the cards are played in does not matter', () => {
    const orders = [[0, 1, 2], [2, 1, 0], [1, 2, 0]];
    const ends = orders.map((o) => {
      let s = three();
      for (const p of o) s = playFavour(s, p, 0);
      s = passEvening(s);
      return { first: s.order[0], hands: s.players.map((pl) => pl.favours), back: [...(s.priorityBack ?? [])].sort() };
    });
    for (const e of ends) expect(e).toEqual({ first: 2, hands: [['priority'], ['priority'], []], back: [0, 1] });
  });

  it('one Priority card each: a stall cannot play a second one of its own the same evening', () => {
    let s = opening([person(0), person(1)], 4, [0, 1], (g) => { g.players[0].favours = ['priority', 'priority']; });
    s = playFavour(s, 0, 0);
    expect(canPlayFavour(s, 0, 0)).toBe('You have already played Priority tonight');
    expect(eveningChoice(s, 0)).toBe(false);
    s = passEvening(s);
    expect(s.order[0]).toBe(0);
    expect(s.players[0].favours).toEqual(['priority']);
    expect(s.priorityBack).toBeUndefined();
  });

  it('a lone Priority card works as before, and on Day 3 it still goes ahead of Nest Egg', () => {
    let s = opening([person(0), person(1), person(2)], 2, [0, 1, 2], (g) => { g.players[1].favours = ['priority']; g.players[2].trait = 'nestegg'; });
    s = playFavour(s, 1, 0);
    s = passEvening(s);
    expect(s.day).toBe(3);
    expect(s.order.slice(0, 2)).toEqual([1, 2]);
    expect(s.priorityNext).toBeNull();
    expect(s.priorityBack).toBeUndefined();
  });

  it('who played Priority is public: every seat sees the same, online and offline', () => {
    let s = three();
    s = playFavour(playFavour(s, 0, 0), 2, 0);
    for (const seat of [0, 1, 2]) {
      for (const v of [publicView(s, seat), redact(s, seat)]) {
        expect(v.priorityPlayed).toEqual([0, 2]);
        expect(v.priorityNext).toBe(2);
        expect(v.eveningDone).toEqual(s.eveningDone);
      }
    }
  });
});

describe('rules 19: computers and people', () => {
  it('computers decide first (activePlayer names a computer still deciding, then a person), each in today\'s line-up', () => {
    const g = opening([person(0), computer(1), computer(2), person(3)], 3, [3, 2, 0, 1], (s) => { s.players[1].level = 'hard'; s.players[2].level = 'hard'; });
    expect(g.eveningDone).toEqual([false, false, false, false]);
    expect(activePlayer(g)).toBe(2); // the first computer in the line-up
    const s = computersEvening(g, (p) => g.players[p].kind === 'ai')!;
    expect(s.phase).toBe('evening');
    expect(s.eveningDone).toEqual([false, true, true, false]);
    expect(activePlayer(s)).toBe(3); // then the first person in the line-up
    expect(aiStep(s)).toBeNull();
    expect(endEvening(s, 0).phase).toBe('evening'); // person 0 may close before person 3
  });

  it('the computers\' evening is the same whether taken step by step (aiStep) or all at once', () => {
    let compared = 0;
    for (const seed of [1, 2, 3, 4, 5, 6]) {
      let s = newGame(config([computer(0), computer(1), computer(2), person(3)], { seed, events: true }));
      for (let i = 0; i < 3000 && !(s.phase === 'evening' && s.day >= 3); i++) {
        if (s.phase === 'morning') s = beginBuying(s);
        else if (s.phase === 'reveal') s = finishReveal(s);
        else s = aiStep(s) ?? applyAction(s, 3, s.phase === 'buy' ? { kind: 'endBuy' } : s.phase === 'stall' ? { kind: 'stall', stall: {} } : s.phase === 'bid' ? { kind: 'prices', posts: [] } : s.phase === 'order' ? { kind: 'order', price: null } : s.phase === 'tie' ? { kind: 'tie', play: false } : { kind: 'endEvening' });
      }
      if (s.phase !== 'evening') continue;
      let step = s;
      while (step.phase === 'evening' && activePlayer(step) >= 0 && step.players[activePlayer(step)].kind === 'ai') step = aiStep(step)!;
      const all = computersEvening(s, (p) => s.players[p].kind === 'ai') ?? s;
      expect(JSON.stringify(all), `seed ${seed}`).toBe(JSON.stringify(step));
      if (all !== s) compared++;
    }
    expect(compared).toBeGreaterThan(0);
  });

  it('a computer-only evening ends at once: the computers decide as it opens and the last Lights out brings the night', () => {
    const g = opening([computer(0), computer(1), computer(2)], 3, [0, 1, 2], (s) => s.players.forEach((pl) => { pl.level = 'hard'; }));
    expect(g.phase).toBe('evening');
    const shown = computersEvening(g, () => true)!;
    expect(shown.phase).toBe('evening');
    expect(shown.eveningDone!.filter((d) => !d)).toHaveLength(1); // the last computer's Lights out is the night
    expect(computersEvening(shown, () => true)).toBeNull();
    const last = activePlayer(shown);
    const night = aiActFor(shown, last)!;
    expect(night.day).toBe(4);
    // A whole game of computers plays every evening this way.
    expect(autoplay(newGame(config([computer(0), computer(1), computer(2)], { events: true }))).phase).toBe('over');
  });

  it('a person with nothing to decide is never asked: the computers\' evening is followed by the night', () => {
    const g = opening([person(0), computer(1)], 3, [0, 1], (s) => { s.players[0].cash = 1; s.players[1].level = 'hard'; });
    expect(g.eveningDone).toEqual([true, false]);
    const shown = computersEvening(g, (p) => g.players[p].kind === 'ai') ?? g;
    const night = aiStep(shown)!;
    expect(night.day).toBe(4);
  });

  it('a computer keeps its Priority card when a stall earlier in the line-up has played one, and plays it otherwise', () => {
    const g = opening([computer(0), computer(1), person(2)], 4, [0, 1, 2], (s) => { s.players.forEach((pl) => { pl.favours = ['priority']; }); });
    const s = computersEvening(g, (p) => g.players[p].kind === 'ai') ?? g;
    expect(s.priorityPlayed).toEqual([0]);
    expect(s.players[1].favours).toEqual(['priority']);
    // A person later in the line-up may still play theirs; it goes back at nightfall.
    const n = passEvening(playFavour(s, 2, 0));
    expect(n.order[0]).toBe(0);
    expect(n.players[2].favours).toEqual(['priority']);
    // A person earlier in the line-up than the computer that played goes first, and the computer's card goes back.
    const h = opening([computer(0), person(1)], 4, [1, 0], (x) => { x.players.forEach((pl) => { pl.favours = ['priority']; }); });
    const hc = computersEvening(h, (p) => h.players[p].kind === 'ai') ?? h;
    expect(hc.priorityPlayed).toEqual([0]);
    const hn = passEvening(playFavour(hc, 1, 0));
    expect(hn.order[0]).toBe(1);
    expect(hn.players[0].favours).toEqual(['priority']);
    expect(hn.priorityBack).toEqual([0]);
  });

  it('pass-and-play hands the phone person by person: activePlayer names each person still deciding in turn', () => {
    const g = opening([person(0), person(1), person(2)], 3, [1, 2, 0]);
    const seen: number[] = [];
    let s = g;
    while (s.phase === 'evening') {
      const p = activePlayer(s);
      seen.push(p);
      s = endEvening(s, p);
    }
    expect(seen).toEqual([1, 2, 0]);
  });
});

describe('rules 19: a state saved before the change', () => {
  it('an evening without the list of who is done is read the old way and carries on', () => {
    // Rules 18 kept the evening as turns: stall order[turn] was deciding, earlier stalls had closed, and a later stall
    // took a turn only if it had something to decide.
    const g = opening([person(0), person(1), person(2)], 3, [0, 1, 2]);
    const old = structuredClone(g);
    delete old.eveningDone;
    delete old.priorityPlayed;
    old.turn = 1;
    old.players[2].cash = 1; // nothing to decide
    expect([0, 1, 2].map((p) => eveningOpen(old, p))).toEqual([false, true, false]);
    expect(activePlayer(old)).toBe(1);
    // Stall 1 builds (and has nothing more to decide), but is done only when it says Lights out.
    let s = buyUpgrade(old, 1, 'premium');
    expect(s.eveningDone).toEqual([true, false, true]);
    expect(s.phase).toBe('evening');
    s = endEvening(s, 1);
    expect(s.day).toBe(4);
  });

  it('a Priority card played under the old rule still counts, and a second one is now allowed', () => {
    const g = opening([person(0), person(1)], 4, [0, 1], (s) => { s.players[1].favours = ['priority']; });
    const old = structuredClone(g);
    delete old.eveningDone;
    delete old.priorityPlayed;
    old.priorityNext = 0; // stall 0 played Priority under rules 18
    old.turn = 1;
    expect(canPlayFavour(old, 1, 0)).toBeNull();
    const s = passEvening(playFavour(old, 1, 0));
    expect(s.order[0]).toBe(0);
    expect(s.players[1].favours).toEqual(['priority']);
  });

  it('every upgrade can still be built by a stall that has cash and room', () => {
    for (const u of Object.keys(UPGRADES) as (keyof typeof UPGRADES)[]) {
      const g = opening([person(0), person(1)], 6, [1, 0]);
      expect(canUpgrade(g, 0, u)).toBeNull();
    }
  });
});
