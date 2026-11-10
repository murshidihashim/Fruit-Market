import { describe, expect, it } from 'vitest';
import { autoplay } from '../src/engine/ai';
import { newGame, type GameState, type LineResult } from '../src/engine/game';
import { dayHighlights, explainLine, gameRecap, rivalReaction, standing } from '../src/engine/story';

function game(): GameState {
  const s = newGame({
    players: [
      { name: 'You', kind: 'human', avatar: '🧑‍🍳' },
      { name: 'Foxy Rosa', kind: 'ai', level: 'normal', avatar: '🦊' },
      { name: 'Big Benny', kind: 'ai', level: 'normal', avatar: '🐻' },
    ],
    days: 10, unripe: true, upgrades: true, events: false, seed: 7,
  });
  return s;
}

const line = (offers: LineResult['offers'], want = 2, max = 8): LineResult => ({ customerId: 1, name: 'John', fruit: 'mango', want, max, offers });

describe('sale explanations', () => {
  it('explains a $1 undercut with a verified counterfactual', () => {
    const s = game();
    const l = line([
      { player: 1, qty: 2, price: 5, sold: 2, freshness: 3 },
      { player: 0, qty: 2, price: 6, sold: 0, freshness: 3 },
    ]);
    const st = explainLine(s, l, 0);
    expect(st.tone).toBe('bad');
    expect(st.headline).toBe('Foxy Rosa undercut you by $1!');
    expect(st.detail).toContain("$4 would've sold 2");
  });

  it('does not offer a counterfactual below $1', () => {
    const s = game();
    const l = line([
      { player: 1, qty: 2, price: 1, sold: 2, freshness: 3 },
      { player: 0, qty: 2, price: 6, sold: 0, freshness: 3 },
    ]);
    expect(explainLine(s, l, 0).detail).toContain('$1 is the floor');
  });

  it('credits fresher fruit on a tie, following the engine tie-break', () => {
    const s = game();
    const l = line([
      { player: 2, qty: 2, price: 6, sold: 2, freshness: 3 },
      { player: 0, qty: 2, price: 6, sold: 0, freshness: 2 },
    ]);
    expect(explainLine(s, l, 0).headline).toBe('Tie at $6. Big Benny wins: fresher fruit.');
  });

  it('celebrates beating a rival and names the margin', () => {
    const s = game();
    const l = line([
      { player: 0, qty: 2, price: 5, sold: 2, freshness: 3 },
      { player: 2, qty: 2, price: 7, sold: 0, freshness: 3 },
    ]);
    const st = explainLine(s, l, 0);
    expect(st.tone).toBe('good');
    expect(st.headline).toBe('Beat Big Benny by $2. All 2 sold!');
  });

  it('flags right price but not enough stock', () => {
    const s = game();
    const l = line([
      { player: 0, qty: 1, price: 5, sold: 1, freshness: 3 },
      { player: 1, qty: 2, price: 6, sold: 2, freshness: 3 },
    ], 3);
    expect(explainLine(s, l, 0).detail).toContain('Right price, not enough stock');
  });

  it('gives a smug reaction only to the rival who actually undercut', () => {
    const s = game();
    const l = line([
      { player: 1, qty: 2, price: 5, sold: 2, freshness: 3 },
      { player: 0, qty: 2, price: 6, sold: 0, freshness: 3 },
    ]);
    const r = rivalReaction(s, l, 0, new Set());
    expect(r?.player).toBe(1);
  });
});

describe('highlights and recaps', () => {
  it('are deterministic and only mention real events', () => {
    let a = game();
    let b = game();
    // Play both to the first reveal with the same moves.
    const step = (s: GameState) => {
      while (s.phase !== 'reveal') {
        s = autoplay({ ...s, players: s.players.map((p) => ({ ...p, kind: 'ai' as const })) }, 1);
      }
      return s;
    };
    a = step(a);
    b = step(b);
    expect(dayHighlights(a, 0)).toEqual(dayHighlights(b, 0));
    for (const h of dayHighlights(a, 0)) expect(h.text.length).toBeGreaterThan(5);
  });

  it('builds a game recap from the day history', () => {
    const g = game();
    const s = autoplay({ ...g, players: g.players.map((p) => ({ ...p, kind: 'ai' as const })) });
    expect(s.history?.length).toBe(10);
    const r = gameRecap(s, 0);
    expect(r.best.length + r.worst.length).toBeGreaterThan(0);
    expect(standing(s, 0).rank).toBeGreaterThan(0);
  });
});
