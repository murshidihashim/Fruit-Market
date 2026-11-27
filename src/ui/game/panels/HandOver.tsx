// Passing a shared phone (pass-and-play): the next person's name, what their turn is, and (S8, PLAN-110) their own day
// since they last held the phone. The screen hides the whole table: the last person's crate and price tags go with it
// (PLAN-099). Nothing of anyone else's is on it.
import { FAVOURS, type FavourId } from '../../../engine/data';
import type { GameState } from '../../../engine/game';
import { Face } from '../../art';
import type { OwnDay } from '../dayWords';

/** What the next person is asked to do, by the step their turn is at (null: nothing to say). */
export function handOverAsk(s: GameState): string | null {
  return s.phase === 'buy' ? 'Your turn to buy fruit.' : s.phase === 'tie' ? 'One of your prices is tied. Play Favoured Trade, or keep it?' : null;
}

/** `p`: the person the phone goes to; `mine`: their own day not yet shown to them; `onTap`: the screen was tapped. */
export function HandOver({ s, p, mine, onTap }: { s: GameState; p: number; mine: OwnDay | null; onTap: () => void }) {
  const pl = s.players[p];
  const ask = handOverAsk(s);
  return (
    <div class="handoff" onClick={onTap}>
      <div class="ho-card">
        <div class="avatar xl"><Face who={pl.avatar} size={96} /></div>
        <span class="ho-lab">Pass the phone to</span>
        <h2>{pl.name}</h2>
        {ask ? <p>{ask}</p> : null}
        {mine && (
          <div class="ho-own" role="note">
            <b class="ho-lab">Your Day {mine.day}</b>
            <span>{mine.line}</span>
            {mine.won.map((f: FavourId) => <span>Favour won: {FAVOURS[f].title}</span>)}
            {mine.order && <span>{mine.order}</span>}
            {mine.night.map((t) => <span>{t}</span>)}
          </div>
        )}
        <button class="btn primary big">Tap to start</button>
      </div>
    </div>
  );
}
