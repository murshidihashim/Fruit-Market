import { describe, expect, it } from 'vitest';
import { CHARACTER_AVATARS, CHARACTER_TRAIT, TRAITS, START_CASH, NEST_EGG_BONUS } from '../src/engine/data';
import { newGame, type GameConfig } from '../src/engine/game';

const cfg = (players: GameConfig['players'], extra: Partial<GameConfig> = {}): GameConfig =>
  ({ players, days: 8, unripe: true, upgrades: true, events: true, seed: 3, ...extra });
const humans = (avatars: string[]) => avatars.map((avatar, i) => ({ name: `P${i}`, kind: 'human' as const, avatar }));

describe('character cards (rules 5)', () => {
  it('has six characters with six different perks, one for every trait', () => {
    expect(CHARACTER_AVATARS).toHaveLength(6);
    expect(new Set(CHARACTER_AVATARS.map((a) => CHARACTER_TRAIT[a])).size).toBe(6);
    expect(Object.keys(TRAITS).sort()).toEqual([...new Set(Object.values(CHARACTER_TRAIT))].sort());
  });

  it('a character fixes its perk at the start and nobody is offered a choice', () => {
    const s = newGame(cfg(humans(CHARACTER_AVATARS.slice(0, 4))));
    s.players.forEach((p, i) => {
      expect(p.trait).toBe(CHARACTER_TRAIT[CHARACTER_AVATARS[i]]);
      expect(p.traitOffer).toEqual([]);
    });
  });

  it('the Nest Egg character starts richer and the Charmer starts with three favour cards', () => {
    const saver = CHARACTER_AVATARS.find((a) => CHARACTER_TRAIT[a] === 'nestegg')!;
    const panda = CHARACTER_AVATARS.find((a) => CHARACTER_TRAIT[a] === 'charmer')!;
    const s = newGame(cfg(humans([saver, panda])));
    expect(s.players[0].cash).toBe(START_CASH + NEST_EGG_BONUS);
    expect(s.players[1].favours).toHaveLength(3);
  });

  it('other avatars still draw three traits to choose from', () => {
    const s = newGame(cfg(humans(['x', 'y'])));
    expect(s.players[0].trait).toBeNull();
    expect(s.players[0].traitOffer).toHaveLength(3);
  });

  it('the core market has no perks, even for a character', () => {
    const s = newGame(cfg(humans(CHARACTER_AVATARS.slice(0, 2)), { core: true }));
    expect(s.players[0].trait).toBeNull();
    expect(s.players[0].traitOffer).toEqual([]);
  });
});
