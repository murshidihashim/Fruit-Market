// "Play as Pak Din" on the results (PLAN-086): the same table again, with the person as another shopkeeper. Nothing
// starts by itself: this only builds the set-up the button then starts.
import { RIVALS } from '../engine/data';
import type { GameConfig } from '../engine/game';

/**
 * The same game set-up with the first person as the shopkeeper `avatar`. If a computer stall was that shopkeeper, it
 * becomes the one the person was (name, picture and line), so every stall still has its own. Friends at the table
 * keep theirs: if one of them is that shopkeeper, nothing changes. The caller picks the new seed.
 */
export function asShopkeeper(cfg: GameConfig, avatar: string): GameConfig {
  const me = cfg.players.findIndex((p) => p.kind === 'human');
  if (me < 0 || !RIVALS.some((r) => r.avatar === avatar) || cfg.players[me].avatar === avatar) return cfg;
  const was = cfg.players[me].avatar;
  const holder = cfg.players.findIndex((p, i) => i !== me && p.avatar === avatar);
  if (holder >= 0 && cfg.players[holder].kind !== 'ai') return cfg;
  const swap = RIVALS.find((r) => r.avatar === was);
  if (holder >= 0 && !swap) return cfg;
  return {
    ...cfg,
    players: cfg.players.map((p, i) => {
      if (i === me) return { ...p, avatar };
      if (i === holder) return swap ? { ...p, name: swap.name, avatar: swap.avatar, quip: swap.quip } : p;
      return p;
    }),
  };
}
