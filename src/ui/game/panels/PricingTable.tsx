// "Round the market table" (DEC-070): every stall round a table while you set your prices, each with its awning,
// badge and name, and its for-sale crate per fruit (pieces out, and the freshness of that fruit on its shelf).
// The middle shows the pieces on sale against today's orders. Prices stay sealed until the bell.
import type { GameState } from '../../../engine/game';
import { FRUIT } from '../../../engine/data';
import { stallOf, partsOf } from '../../../net/looks';
import { Face, Fruit } from '../../art';
import { RoofBand } from '../../icons';
import { loadColour } from '../../progress';
import { seatColour } from '../../table';
import { pricingTable, type TableSeat } from '../pricingTable';

const STAGE_WORD = { fresh: 'fresh', okay: 'okay', notso: 'tired', unripe: 'green' } as const;

function Seat({ s, seat }: { s: GameState; seat: TableSeat }) {
  const pl = s.players[seat.player];
  const colour = (seat.me && loadColour()) || seatColour(seat.player);
  const name = seat.me ? 'You' : pl.name;
  const label = `${name}: ${seat.fruits.length ? seat.fruits.map((x) => `${x.out} ${(x.out === 1 ? FRUIT[x.f].name : FRUIT[x.f].plural).toLowerCase()} out`).join(', ') : 'nothing out'}${seat.me ? '' : seat.sealed ? ', prices sealed' : ', not sealed yet'}`;
  return (
    <div class={`pt-seat ${seat.me ? 'me' : ''}`} style={{ '--seat': colour }} aria-label={label} role="group">
      <RoofBand cls="pt-awn" colour={colour} roof={stallOf(pl.look).roof} scale={1.4} />
      <div class="pt-head">
        <Face who={pl.avatar} size={22} worn={partsOf(pl.look)} />
        <b class="pt-name">{name}</b>
        {/* Whether a rival has sealed shows on its pill's price board above; here only a lock when it has. */}
        {!seat.me && seat.sealed && <i class="seal pt-seal" aria-hidden="true" />}
      </div>
      <div class="pt-fruits" aria-hidden="true">
        {seat.fruits.length ? seat.fruits.map((x) => (
          <span class="pt-f" title={`${x.out} out · on the shelf: ${x.dots.map((d) => STAGE_WORD[d]).join(', ')}`}>
            <Fruit id={x.f} size={14} /><b>{x.out}</b>
            <span class="pt-dots">{x.dots.map((d) => <i class={`pt-dot st-${d}`} />)}</span>
          </span>
        )) : <span class="pt-none">nothing out</span>}
      </div>
    </div>
  );
}

export function PricingTableView({ s, viewer }: { s: GameState; viewer: number }) {
  const t = pricingTable(s, viewer);
  const half = Math.ceil(t.seats.length / 2);
  const top = t.seats.slice(0, half), bottom = t.seats.slice(half);
  return (
    <section class="pt-table" aria-label="Every stall's crate. Prices stay sealed until the bell">
      <div class="pt-row">{top.map((x) => <Seat s={s} seat={x} />)}</div>
      <div class="pt-mid" aria-label={`${t.onSale} pieces on sale, ${t.orders} orders today`}>
        <small>On sale</small><b>{t.onSale}</b><small>pieces · {t.orders} order{t.orders === 1 ? '' : 's'}</small>
      </div>
      <div class="pt-row end">{bottom.map((x) => <Seat s={s} seat={x} />)}</div>
    </section>
  );
}
