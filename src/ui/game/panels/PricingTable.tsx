// Every crate is open (PLAN-059, drawn as boxes in PLAN-072): each rival's for-sale crate, with the stall's pattern
// and name, what it put out and the freshest piece of each fruit. Prices stay sealed until the bell: a rival's crate
// shows only whether it has sealed. Your own crate is not repeated here; its fruit is on the price rows below.
import type { GameState } from '../../../engine/game';
import { FRUIT } from '../../../engine/data';
import { Fruit } from '../../art';
import { STAGE_WORD, Swatch } from '../../ticket';
import { pricingTable } from '../pricingTable';

/** The rivals' crates in turn order after you.
 *  `waiting`: you have opened your stall and the rivals are still opening theirs (flow A, PLAN-065). A rival's crate
 *  then shows nothing but whether that rival has opened (public; its contents are not, until every stall is open). */
export function PricingTableView({ s, viewer, waiting }: { s: GameState; viewer: number; waiting?: boolean }) {
  const rivals = pricingTable(s, viewer).seats.filter((x) => !x.me);
  if (!rivals.length) return null;
  return (
    <section class={`crates tk-crates n${rivals.length} ${waiting ? 'waiting' : ''}`} aria-label="Every rival's crate. Prices stay sealed until the bell">
      {rivals.map((x) => {
        const pl = s.players[x.player];
        const opening = waiting && s.stalls[x.player] === null;
        const label = waiting ? `${pl.name} ${opening ? 'is still opening' : 'has opened'}`
          : `${pl.name}: ${x.fruits.length ? x.fruits.map((y) => `${y.out} ${(y.out === 1 ? FRUIT[y.f].name : FRUIT[y.f].plural).toLowerCase()} out`).join(', ') : 'nothing out'}${x.sealed ? ', prices sealed' : ', not sealed yet'}`;
        return (
          <div key={`c${x.player}`} class={`crate tk-crate ${x.sealed ? 'sealed' : ''} ${opening ? 'opening' : ''}`} role="group" aria-label={label}>
            <span class="tk-crate-name"><Swatch p={x.player} size={18} /><span>{pl.name}</span>{x.sealed && <i class="tk-sealed" aria-hidden="true">sealed</i>}</span>
            <span class="tk-crate-items">
              {waiting ? <span class="tk-crate-none">{opening ? 'opening…' : 'ready'}</span>
                : x.fruits.length ? x.fruits.map((y) => (
                  <span class="crate-slot" title={`${y.out} out · ${y.dots.map((d) => STAGE_WORD[d]).join(', ')}`}>
                    <Fruit id={y.f} size={20} stage={y.dots[0]} /><b>{y.out}</b>
                  </span>
                )) : <span class="tk-crate-none">nothing out</span>}
            </span>
          </div>
        );
      })}
    </section>
  );
}
