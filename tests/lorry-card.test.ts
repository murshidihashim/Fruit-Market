import { describe, expect, it } from 'vitest';
import { aiActFor } from '../src/engine/ai';
import { EVENT_CARDS, FARMER_CARDS, FRUITS, type FarmerCard } from '../src/engine/data';
import { activePlayer, applyAction, newGame, type GameConfig, type GameState } from '../src/engine/game';
import { redact } from '../server/room';
import { lorryLoad, todaysLoad, todaysLorry } from '../src/ui/boardModel';

// The morning's lorry card (PLAN-083). The game keeps what today's lorry unloaded, not which card it was, so the
// screen works the card out from the load. It must never name the wrong lorry: when it cannot tell, it says nothing.
function cfg(n: number, seed: number): GameConfig {
  return {
    players: Array.from({ length: n }, (_, i) => ({ name: `P${i}`, kind: 'ai' as const, level: 'normal' as const, avatar: 'x' })),
    days: 10, unripe: true, upgrades: true, events: true, seed,
  };
}

/** Every morning of a game, with the lorry card the engine really used that day. */
function mornings(n: number, seed: number): { s: GameState; card: FarmerCard }[] {
  const out: { s: GameState; card: FarmerCard }[] = [];
  let s = newGame(cfg(n, seed));
  // Day 1's card is the one card missing from the deck that is not tomorrow's.
  const first = FARMER_CARDS.find((c, i) => !s.farmerDeck.includes(i) && c.name !== s.nextFarmer?.name)!;
  let announced: FarmerCard = first;
  for (let i = 0; i < 20000 && s.phase !== 'over'; i++) {
    if (s.phase === 'morning') {
      const pick = s.players.findIndex((p) => p.traitOffer && !p.trait);
      if (pick >= 0) { s = applyAction(s, pick, { kind: 'trait', trait: s.players[pick].traitOffer![0] }); continue; }
      out.push({ s, card: announced });
      if (s.nextFarmer) announced = s.nextFarmer;
      s = applyAction(s, 0, { kind: 'begin' });
      continue;
    }
    if (s.phase === 'reveal') { s = applyAction(s, 0, { kind: 'finish' }); continue; }
    const next = aiActFor(s, activePlayer(s));
    if (!next) throw new Error(`no move in ${s.phase}`);
    s = next;
  }
  return out;
}

describe('the morning\'s lorry card (boardModel.todaysLorry)', () => {
  it('names today\'s lorry only when it is certain, at every table size, with events, and never names the wrong one', () => {
    let seen = 0;
    let told = 0;
    for (const n of [2, 3, 4, 5, 6]) {
      for (let seed = 1; seed <= 12; seed++) {
        for (const { s, card } of mornings(n, seed)) {
          seen++;
          // The screen's sums for a card's load are the engine's own.
          if (!s.event?.noDelivery) expect(lorryLoad(card, s.event, n), `${n} stalls, seed ${seed}, day ${s.day}`).toEqual(todaysLoad(s));
          const found = todaysLorry(s);
          if (s.event?.noDelivery) expect(found).toBeNull();
          if (found) { told++; expect(found.name, `${n} stalls, seed ${seed}, day ${s.day}`).toBe(card.name); }
          // Online the decks are not sent: the card is still never wrong, only told less often.
          const online = todaysLorry(redact(s, 0));
          if (online) expect(online.name, `online, ${n} stalls, seed ${seed}, day ${s.day}`).toBe(card.name);
        }
      }
    }
    expect(seen).toBe(5 * 12 * 10);
    // Nearly every morning has a card that can be told (a Lorry Breakdown has none).
    expect(told / seen).toBeGreaterThan(0.9);
  });

  it('two cards that print the same row are told apart by the deck, or not named at all', () => {
    // At 3 stalls Even Load and Farmer's Choice both bring 3 of everything.
    const a = FARMER_CARDS.findIndex((c) => c.name === 'Even Load');
    const b = FARMER_CARDS.findIndex((c) => c.name === 'Farmer\'s Choice');
    expect(lorryLoad(FARMER_CARDS[a], null, 3)).toEqual(lorryLoad(FARMER_CARDS[b], null, 3));
    const base = newGame(cfg(3, 5));
    const s: GameState = { ...base, event: null, delivery: lorryLoad(FARMER_CARDS[a], null, 3), deliveryUnripe: 'mango' };
    const others = FARMER_CARDS.map((_, i) => i).filter((i) => i !== a && i !== b);
    // Day 1, tomorrow's card drawn: 18 cards left. Even Load is not in the deck, Farmer's Choice still is.
    const next = FARMER_CARDS[others[0]];
    expect(todaysLorry({ ...s, day: 1, nextFarmer: next, farmerDeck: [b, ...others.slice(1)] })?.name).toBe('Even Load');
    // Both are out of the deck (one was an earlier day's lorry): it cannot be told, so no name.
    expect(todaysLorry({ ...s, day: 2, nextFarmer: next, farmerDeck: others.slice(1) })).toBeNull();
    // Online (no deck) and after a reshuffle (the deck's size no longer tells what was drawn): no name.
    expect(todaysLorry({ ...s, day: 1, nextFarmer: next, farmerDeck: [] })).toBeNull();
    expect(todaysLorry({ ...s, day: 1, nextFarmer: next, farmerDeck: [b] })).toBeNull();
  });

  it('an event\'s change to the load is part of the sum', () => {
    const blight = EVENT_CARDS.find((e) => e.id === 'blight')!;
    const half = EVENT_CARDS.find((e) => e.id === 'badHarvest')!;
    const card = FARMER_CARDS[2];
    expect(lorryLoad(card, blight, 4).apple).toBe(0);
    for (const f of FRUITS) expect(lorryLoad(card, half, 4)[f]).toBe(Math.ceil(card.table[4][f] / 2));
  });
});
