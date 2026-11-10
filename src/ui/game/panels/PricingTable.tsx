// The rivals' crates while prices are set, and every crate once the bell rings (rules 15, secret stalls).
// Before the bell a rival's crate is shut: the box shows the stall's pattern and name, how many pieces it put out, and
// whether it has sealed its prices. Which fruit, and how fresh, is not known to anyone else until the bell. Then every
// crate opens with its prices (CratesOpen), and the rush starts.
import type { GameState } from '../../../engine/game';
import { forSale } from '../../../engine/game';
import { FRUIT } from '../../../engine/data';
import { Fruit } from '../../art';
import { LANES } from '../../boardModel';
import { Swatch } from '../../ticket';
import { pricingTable } from '../pricingTable';

const pieces = (n: number) => `${n} ${n === 1 ? 'piece' : 'pieces'}`;

/** The rivals' crates in turn order after you, shut.
 *  `waiting`: you have opened your stall and the rivals are still opening theirs (flow A, PLAN-065): a crate then
 *  shows only whether that rival has opened. */
export function PricingTableView({ s, viewer, waiting }: { s: GameState; viewer: number; waiting?: boolean }) {
  const rivals = pricingTable(s, viewer).seats.filter((x) => !x.me);
  if (!rivals.length) return null;
  return (
    <section class={`crates tk-crates shut n${rivals.length} ${waiting ? 'waiting' : ''}`} aria-label="Every rival's crate, shut until the bell: only how many pieces each put out">
      {rivals.map((x) => {
        const pl = s.players[x.player];
        const opening = waiting && s.stalls[x.player] === null;
        const n = x.out ?? 0;
        const label = waiting ? `${pl.name} ${opening ? 'is still opening' : 'has opened'}`
          : `${pl.name}: ${n ? `${pieces(n)} out, which fruit is secret until the bell` : 'nothing out'}${x.sealed ? ', prices sealed' : ', not sealed yet'}`;
        return (
          <div key={`c${x.player}`} class={`crate tk-crate ${x.sealed ? 'sealed' : ''} ${opening ? 'opening' : ''}`} role="group" aria-label={label}>
            <span class="tk-crate-name"><Swatch p={x.player} size={18} /><span>{pl.name}</span>{x.sealed && <i class="tk-sealed" aria-hidden="true">sealed</i>}</span>
            <span class="tk-crate-count">
              {waiting ? <small>{opening ? 'opening…' : 'ready'}</small>
                : n ? <><b>{n}</b><small>{n === 1 ? 'piece out' : 'pieces out'}</small></> : <small>nothing out</small>}
            </span>
          </div>
        );
      })}
    </section>
  );
}

/** The bell: every crate open on the table with its prices, the rivals first and yours last, before the first customer
 *  is served. From here on the day's crates and prices are public. */
export function CratesOpen({ s, viewer }: { s: GameState; viewer: number }) {
  const seats = pricingTable(s, viewer).seats;
  return (
    <div class="mid-panel tk-bell" role="status" aria-label="The bell: every crate is open">
      <div class="tk-bell-head"><b>The bell!</b><span>Every crate is open</span></div>
      <section class={`tk-crates open n${seats.length}`}>
        {seats.map((x) => {
          const pl = s.players[x.player];
          const fruits = LANES.filter((f) => forSale(s, x.player, f) > 0);
          return (
            <div key={`o${x.player}`} class={`crate tk-crate ${x.me ? 'me' : ''}`} role="group"
              aria-label={`${x.me ? 'Your crate' : pl.name}: ${fruits.length ? fruits.map((f) => `${forSale(s, x.player, f)} ${FRUIT[f].plural.toLowerCase()} at $${s.bids[x.player]?.find((b) => b.fruit === f)?.price ?? '?'}`).join(', ') : 'nothing out'}`}>
              <span class="tk-crate-name"><Swatch p={x.player} who={pl.avatar} look={pl.look} size={22} /><span>{x.me ? 'You' : pl.name}</span></span>
              {fruits.length ? fruits.map((f) => {
                const price = s.bids[x.player]?.find((b) => b.fruit === f)?.price;
                return (
                  <span class={`tk-open-row ${f}`}>
                    <Fruit id={f} size={20} /><b>×{forSale(s, x.player, f)}</b>
                    {price !== undefined && <i>${price}</i>}
                  </span>
                );
              }) : <span class="tk-crate-none">nothing out</span>}
            </div>
          );
        })}
      </section>
    </div>
  );
}
