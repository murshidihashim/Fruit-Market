// The crates at the bell (PLAN-059, replacing "Round the market table", DEC-070): every stall's for-sale crate, all the
// same size, drawn as a wooden crate with a name plate. Rivals show what they put out and the freshest piece of each
// fruit; your own crate's fruits are buttons you tap to price. Prices stay sealed until the bell: only your own prices
// are shown, and a rival's crate shows only whether it has sealed.
import type { GameState } from '../../../engine/game';
import { FRUIT, type FruitId } from '../../../engine/data';
import { Fruit } from '../../art';
import { pricingTable, type TableSeat } from '../pricingTable';

const STAGE_WORD = { fresh: 'fresh', okay: 'okay', notso: 'tired', unripe: 'green' } as const;

interface MyCrate {
  /** Your price for each fruit you put out. */
  prices: Partial<Record<FruitId, number>>;
  selected: FruitId | null;
  onPick: (f: FruitId) => void;
}

function Crate({ s, seat, mine }: { s: GameState; seat: TableSeat; mine?: MyCrate }) {
  const pl = s.players[seat.player];
  const name = seat.me ? 'Your crate' : pl.name;
  const label = `${seat.me ? 'Your crate' : pl.name}: ${seat.fruits.length ? seat.fruits.map((x) => `${x.out} ${(x.out === 1 ? FRUIT[x.f].name : FRUIT[x.f].plural).toLowerCase()} out`).join(', ') : 'nothing out'}${seat.me ? '' : seat.sealed ? ', prices sealed' : ', not sealed yet'}`;
  return (
    <div class={`crate ${seat.me ? 'me' : ''} ${seat.sealed && !seat.me ? 'sealed' : ''}`} role="group" aria-label={label}>
      <span class="crate-plate">{name}{!seat.me && seat.sealed && <i class="seal crate-seal" aria-hidden="true" />}</span>
      {/* the lid lifts off a rival's crate as pricing starts: everyone sees every crate at once */}
      {!seat.me && <i class="crate-lid" aria-hidden="true" />}
      <span class="crate-fruits">
        {seat.fruits.length ? seat.fruits.map((x) => {
          const top = x.dots[0];
          if (!mine) {
            return (
              <span class="crate-slot" title={`${x.out} out · on the shelf: ${x.dots.map((d) => STAGE_WORD[d]).join(', ')}`}>
                <Fruit id={x.f} size={16} stage={top} /><b>{x.out}</b>
              </span>
            );
          }
          const price = mine.prices[x.f];
          const on = mine.selected === x.f;
          return (
            <button type="button" class={`crate-slot pick ${on ? 'sel' : ''}`} aria-pressed={on}
              aria-label={`Price your ${x.out} ${(x.out === 1 ? FRUIT[x.f].name : FRUIT[x.f].plural).toLowerCase()}: now $${price}`} onClick={() => mine.onPick(x.f)}>
              <Fruit id={x.f} size={16} stage={top} /><b>{x.out}</b><span class="crate-price">${price}</span>
            </button>
          );
        }) : <span class="crate-none">nothing out</span>}
      </span>
    </div>
  );
}

/** Every stall's crate: the rivals in turn order after you, then your own crate last (nearest the price dial). */
export function PricingTableView({ s, viewer, mine }: { s: GameState; viewer: number; mine?: MyCrate }) {
  const t = pricingTable(s, viewer);
  return (
    <section class="crates" aria-label="Every stall's crate. Prices stay sealed until the bell">
      {t.seats.map((x) => <Crate s={s} seat={x} mine={x.me ? mine : undefined} />)}
    </section>
  );
}
