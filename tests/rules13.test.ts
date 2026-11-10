// Rules 13 (PLAN-061): events are never forecast, and the Cold Room upgrade is gone.
import { describe, expect, it } from 'vitest';
import { aiStep } from '../src/engine/ai';
import { EVENT_CARDS, UPGRADES } from '../src/engine/data';
import { applyAction, beginBuying, finishReveal, newGame, walkInsOn, type GameState } from '../src/engine/game';
import { RULES_VERSION } from '../src/net/protocol';

const cfg = (n: number, seed: number) => ({
  players: Array.from({ length: n }, (_, i) => ({ name: `C${i}`, kind: 'ai' as const, level: 'normal' as const, avatar: '' })),
  days: 10, unripe: true, upgrades: true, events: true, seed,
});

/** Runs the evening and night of day `s.day`, with the event deck set so `next` is tomorrow's event. */
function nightInto(s: GameState, next: string): GameState {
  let g = structuredClone(s);
  g.eventDeck = [EVENT_CARDS.findIndex((e) => e.id === next)];
  g.phase = 'evening'; g.turn = 0; g.order = g.players.map((_, i) => i);
  for (let p = 0; p < g.players.length; p++) g = applyAction(g, p, { kind: 'endEvening' });
  return g;
}

describe('rules 13', () => {
  it('is rules version 13 or later', () => expect(RULES_VERSION).toBeGreaterThanOrEqual(13));

  it('tomorrow\'s event is never known: nextEvent stays empty all game', () => {
    for (const seed of [1, 2, 3]) {
      let s = newGame(cfg(4, seed));
      for (let i = 0; i < 4000 && s.phase !== 'over'; i++) {
        expect(s.nextEvent).toBeNull();
        s = s.phase === 'morning' ? beginBuying(s) : s.phase === 'reveal' ? finishReveal(s) : aiStep(s)!;
      }
      expect(s.phase).toBe('over');
    }
  });

  it('tomorrow\'s walk-ins are dealt without the event; a walk-in event changes them on its own morning', () => {
    const s = newGame(cfg(4, 7));
    s.day = 4; s.event = null;
    const before = walkInsOn(s, 5, null);
    s.queue = s.queue.slice(0, 0);
    // Deal tomorrow's row the way the game does (no event), then the morning's event adjusts it.
    const base = structuredClone(s);
    for (let i = 0; i < before; i++) base.queue.push({ id: 900 + i, name: ['John', 'Robert', 'Daniel', 'Aisyah'][i], wants: [], original: [], walkIn: true, seenBy: [] });
    const bus = nightInto(base, 'touristBus');
    expect(bus.event?.id).toBe('touristBus');
    expect(bus.queue.length).toBe(4); // +3 at 4 stalls, but rules 14 keeps the row at five: never more than 4 walk-ins
    const rain = nightInto(base, 'monsoon');
    expect(rain.event?.id).toBe('monsoon');
    expect(rain.queue.length).toBe(before - 2); // −2 at 4 stalls
    expect(rain.customerDeck.slice(-2).length).toBe(2); // the two sent back go under the deck
  });

  it('the Health Inspector is never the last day\'s event', () => {
    const s = newGame(cfg(2, 3));
    s.day = 9;
    const g = nightInto(s, 'inspector');
    expect(g.day).toBe(10);
    expect(g.event?.inspector).toBeUndefined();
  });

  it('no Cold Room (rules 14 has five upgrades: see rules14.test.ts)', () => {
    expect(Object.keys(UPGRADES)).not.toContain('coldroom');
    expect(EVENT_CARDS.some((e) => /Cold Room/.test(e.text))).toBe(false);
  });
});
