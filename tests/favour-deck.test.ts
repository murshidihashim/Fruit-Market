import { describe, expect, it } from 'vitest';
import { aiStep } from '../src/engine/ai';
import { beginBuying, finishReveal, newGame, type GameConfig } from '../src/engine/game';
import { FAVOUR_DECK } from '../src/engine/data';

// On a table the favour deck is 12 real cards: when it runs out only the played cards are shuffled back,
// so no favour can ever be held (or in the deck) more often than it is printed.
describe('favour deck', () => {
  it('never holds more copies of a favour than the deck has, even after it runs out', () => {
    for (let seed = 1; seed <= 6; seed++) {
      const cfg: GameConfig = {
        players: ['a', 'b', 'c', 'd'].map((name) => ({ name, kind: 'ai' as const, level: 'normal' as const, avatar: '' })),
        days: 14, unripe: true, upgrades: true, events: true, seed: 700 + seed,
      };
      let s = newGame(cfg);
      for (let step = 0; step < 6000 && s.phase !== 'over'; step++) {
        if (s.phase === 'morning') s = beginBuying(s);
        else if (s.phase === 'reveal') s = finishReveal(s);
        else { const n = aiStep(s); if (!n) break; s = n; }
        const seen = [...s.favourDeck, ...s.players.flatMap((p) => p.favours)];
        for (const id of new Set(seen)) {
          expect(seen.filter((x) => x === id).length).toBeLessThanOrEqual(FAVOUR_DECK.filter((x) => x === id).length);
        }
      }
    }
  });
});
