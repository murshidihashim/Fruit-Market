// First-morning choice of a merchant trait.
import { TRAITS, type TraitId } from '../../../engine/data';
import type { GameState } from '../../../engine/game';
import { Icon } from '../../pixel';
import { TRAIT_ICON } from '../../panel';

export function TraitPick({ s, p, onPick }: { s: GameState; p: number; onPick: (t: TraitId) => void }) {
  const pl = s.players[p];
  const humans = s.players.filter((x) => x.kind === 'human').length;
  return (
    <div class="morning-card trait-pick">
      <div class="mc-day">Choose your trait</div>
      <small class="muted-ink">{humans > 1 ? `${pl.name}: ` : ''}one perk for the whole game. Rivals can see it.</small>
      <div class="trait-list">
        {(pl.traitOffer ?? []).map((t) => (
          <button type="button" class="trait-card" onClick={() => onPick(t)}>
            <Icon name={TRAIT_ICON[t]} size={30} />
            <span><b>{TRAITS[t].title}</b><small>{TRAITS[t].text}</small></span>
          </button>
        ))}
      </div>
    </div>
  );
}
