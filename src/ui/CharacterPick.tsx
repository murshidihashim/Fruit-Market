// Pick one of the six characters. Each has one fixed perk for the whole game, and a character can be taken by one shop only.
// Each choice is the character's Stall Sign (DEC-066); the perk of the one you picked is spelled out below the signs.
import { CHARACTER_TRAIT, RIVALS, TRAITS } from '../engine/data';
import { StallSign } from './cards';

/** `taken` maps a character's avatar to the name of the shop that already has it. */
export function CharacterPick({ value, taken = {}, onPick }: { value: string; taken?: Record<string, string>; onPick: (avatar: string) => void }) {
  const mine = RIVALS.find((r) => r.avatar === value);
  const myPerk = mine ? TRAITS[CHARACTER_TRAIT[mine.avatar]] : undefined;
  return (
    <div class="char-pick" role="group" aria-label="Choose your shopkeeper">
      <div class="char-grid">
        {RIVALS.map((r) => {
          const perk = TRAITS[CHARACTER_TRAIT[r.avatar]];
          const by = taken[r.avatar];
          const on = r.avatar === value;
          return (
            <button type="button" class={`char-card ${on ? 'on' : ''}`} disabled={!!by} onClick={() => onPick(r.avatar)} aria-pressed={on}
              aria-label={`${r.name}. ${perk.title}: ${perk.text}${by ? ` Taken by ${by}.` : ''}`}>
              <StallSign avatar={r.avatar} compact selected={on} takenBy={by} />
            </button>
          );
        })}
      </div>
      {mine && myPerk && <p class="char-perk"><b>{mine.name} · {myPerk.title}</b><span>{myPerk.text}</span></p>}
    </div>
  );
}
