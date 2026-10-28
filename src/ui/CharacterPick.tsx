// Pick one of the six characters. Each has one fixed perk for the whole game, and a character can be taken by one shop only.
import { CHARACTER_TRAIT, RIVALS, TRAITS } from '../engine/data';
import { Face } from './art';

/** `taken` maps a character's avatar to the name of the shop that already has it. */
export function CharacterPick({ value, taken = {}, onPick }: { value: string; taken?: Record<string, string>; onPick: (avatar: string) => void }) {
  return (
    <div class="char-pick" role="group" aria-label="Choose your shopkeeper">
      {RIVALS.map((r) => {
        const perk = TRAITS[CHARACTER_TRAIT[r.avatar]];
        const by = taken[r.avatar];
        return (
          <button type="button" class={`char-card ${r.avatar === value ? 'on' : ''}`} disabled={!!by} onClick={() => onPick(r.avatar)} aria-pressed={r.avatar === value}>
            <Face who={r.avatar} size={44} />
            <span><b>{r.name}</b><small>{perk.title}: {perk.text}</small>{by && <small class="taken">Taken by {by}</small>}</span>
          </button>
        );
      })}
    </div>
  );
}
