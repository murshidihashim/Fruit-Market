// The rivals' crates while prices are set, and every crate once the bell rings (rules 15, secret stalls).
// Before the bell a rival's crate is shut: the box shows the stall's pattern and name, how many pieces it put out, and
// whether it has sealed its prices. Which fruit, and how fresh, is not known to anyone else until the bell. Then every
// crate opens with its prices (CratesOpen), and the rush starts.
import type { ComponentChildren } from 'preact';
import type { GameState } from '../../../engine/game';
import { forSale, tiedPrices } from '../../../engine/game';
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
export function CratesOpen({ s, viewer, head, label, children }: { s: GameState; viewer: number;
  /** The two parts of the heading (the tie step, rules 18, uses its own). */
  head?: [string, string]; label?: string; children?: ComponentChildren }) {
  const seats = pricingTable(s, viewer).seats;
  const [big, small] = head ?? ['The bell!', 'Every crate is open'];
  return (
    <div class="mid-panel tk-bell" role="status" aria-label={label ?? 'The bell: every crate is open'}>
      <div class="tk-bell-head"><b>{big}</b><span>{small}</span></div>
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
      {children}
    </div>
  );
}

/** "Rosa", "Rosa and Raj", "Rosa, Raj and Kiki". */
const names = (xs: string[]) => (xs.length <= 1 ? xs.join('') : `${xs.slice(0, -1).join(', ')} and ${xs[xs.length - 1]}`);

/** The tied prices of the stall being asked, in words: "apples at $6 with Rosa". */
export function tieWords(s: GameState, asked: number): string {
  return tiedPrices(s, asked).map((t) => `${FRUIT[t.fruit].plural.toLowerCase()} at $${t.price} with ${names(t.rivals.map((i) => s.players[i].name))}`).join('; ');
}

/**
 * Rules 18, the tie step: prices and crates have flipped, and a stall that holds Favoured Trade and has a tied price
 * decides, in the open, whether to play it. The stall being asked gets the two buttons; everyone else sees who is
 * deciding.
 */
export function TiePanel({ s, viewer, asked, onDecide }: { s: GameState; viewer: number; asked: number; onDecide?: (play: boolean) => void }) {
  const pl = s.players[asked];
  const mine = !!onDecide;
  const ties = tieWords(s, asked);
  return (
    <>
      <CratesOpen s={s} viewer={viewer} head={['A tied price', mine ? 'Play Favoured Trade?' : `${pl.name} is deciding`]}
        label={mine ? `A tied price: ${ties}. Play Favoured Trade or keep it` : `${pl.name} has a tied price and is deciding whether to play Favoured Trade`}>
        <p class="tk-note" data-a="tie-note">{mine
          ? `Your prices are tied: ${ties}. Play Favoured Trade to win every tied price today, or keep the card for another day.`
          : `${pl.name} has a tied price (${ties}) and may play Favoured Trade to win it.`}</p>
      </CratesOpen>
      {mine && (
        <div class="pp-lock">
          <button type="button" class="btn primary wide big" onClick={() => onDecide(true)}>Play it</button>
          <button type="button" class="btn ghost wide big" onClick={() => onDecide(false)}>Keep it</button>
        </div>
      )}
    </>
  );
}
