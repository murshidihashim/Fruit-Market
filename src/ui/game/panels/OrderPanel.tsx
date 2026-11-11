// Standing orders (rules 14): the bid on a Market Day morning, and the strip that keeps the order in view until it is
// collected. Rules 17: everyone sees who is bidding, who passed and who is still deciding (never a rival's price), and
// a stall may change its mind for as long as another stall is still deciding.
import { useState } from 'preact/hooks';
import { FRUIT, ORDER_CARDS } from '../../../engine/data';
import { orderRivalPay, type GameState } from '../../../engine/game';
import { Coin, Face, Fruit } from '../../art';

/** "3 mangoes", "1 apple". */
const pieces = (n: number, f: keyof typeof FRUIT) => `${n} ${(n === 1 ? FRUIT[f].name : FRUIT[f].plural).toLowerCase()}`;

/** Who is bidding (rules 17): each rival is "bidding", "passed" or "deciding…". The prices stay secret. */
export function BidStatus({ s, p }: { s: GameState; p: number }) {
  const o = s.standing!;
  if (s.players.length < 2) return null;
  return (
    <ul class="op-status" aria-label="Who is bidding">
      {s.players.map((pl, i) => {
        if (i === p) return null;
        const b = o.bids[i];
        const st = b === null ? 'wait' : b === 'pass' ? 'pass' : 'in';
        return <li class={`st-${st}`}><Face who={pl.avatar} size={20} /><b>{pl.name}</b><span>{st === 'wait' ? 'deciding…' : st === 'pass' ? 'passed' : 'bidding'}</span></li>;
      })}
    </ul>
  );
}

/** Every stall names the price per piece it would fill the order for (secret), or passes. The lowest bid wins.
 *  `waiting`: this stall has decided and others have not; with `canChange` (online) it may still change its mind. */
export function OrderPanel({ s, p, waiting, canChange, onBid }: { s: GameState; p: number; waiting?: boolean; canChange?: boolean; onBid: (price: number | null) => void }) {
  const o = s.standing!;
  const card = ORDER_CARDS[o.card];
  const mine = o.bids[p];
  const [v, setV] = useState(typeof mine === 'number' ? mine : Math.max(1, o.ceiling - 2));
  const locked = waiting && !canChange;
  const pl = s.players[p];
  const book = pl.upgrades.includes('orderbook');
  const fine = Math.floor(o.fine / (book ? 2 : 1));
  return (
    <>
    <div class="price-panel order-panel mid-panel tk-panel" data-a="order-panel">
      <div class="op-card">
        <span class="op-k">Standing order · due day {o.due}</span>
        <b class="op-title">{card.title}</b>
        <i class="op-quirk">{card.quirk}</i>
        <div class="op-want">
          <span class="op-fruit">{Array.from({ length: o.qty }, () => <Fruit id={o.fruit} size={26} />)}</span>
          <span>wants <b>{pieces(o.qty, o.fruit)}</b>, Fresh or Okay, on day {o.due}</span>
        </div>
        <ul class="op-rules">
          <li>Lowest bid wins the order and is paid that price for each piece.</li>
          <li>Your pieces are taken first. Anything missing is bought from rivals at $1 under your bid: <b>${orderRivalPay(v)}</b> each.</li>
          <li>You are fined <b>${fine}</b> for every piece you do not supply{book ? ' (halved by your Order Book)' : ''}.</li>
        </ul>
      </div>
      <BidStatus s={s} p={p} />
      {waiting && <div class="hint-bar waiting-dots">{mine === 'pass' ? 'You passed' : typeof mine === 'number' ? `Your bid: $${mine}` : 'Bid in'}. {canChange ? 'You can change it until the last stall decides' : 'Waiting for the other stalls'}</div>}
      {!locked && (
        <>
          <div class="op-bid" role="group" aria-label="Your secret bid per piece">
            <button type="button" class="btn step" aria-label="Bid $1 less" disabled={v <= 1} onClick={() => setV(v - 1)}>−</button>
            <span class="op-price"><Coin size={22} /><b>{v}</b><small>a piece</small></span>
            <button type="button" class="btn step" aria-label="Bid $1 more" disabled={v >= o.ceiling} onClick={() => setV(v + 1)}>+</button>
          </div>
          {mine !== 'pass' && <button type="button" class="btn ghost op-pass" onClick={() => onBid(null)}>{waiting ? 'Pass instead' : "Pass: I don't want this order"}</button>}
        </>
      )}
    </div>
    {!locked && (
      <div class="pp-lock">
        <button type="button" class="btn primary wide big" disabled={waiting && mine === v} onClick={() => onBid(v)}>{waiting ? `Change bid to $${v}` : `Bid $${v} a piece`}</button>
      </div>
    )}
    </>
  );
}

/** The order in play, in one line under the street: what it wants and when, then who won it and at what price. */
export function OrderStrip({ s, viewer }: { s: GameState; viewer: number }) {
  const o = s.standing;
  if (!o || s.phase === 'over') return null;
  const card = ORDER_CARDS[o.card];
  const due = o.due === s.day ? 'today' : o.due === s.day + 1 ? 'tomorrow' : `day ${o.due}`;
  const holder = o.holder === null ? null : s.players[o.holder];
  const bids = o.holder === null ? '' : o.bids.map((b, i) => `${i === viewer ? 'You' : s.players[i].name} ${b === 'pass' || b === null ? 'passed' : `$${b}`}`).join(' · ');
  return (
    <div class={`order-strip ${o.due === s.day ? 'due' : ''} ${o.holder === viewer ? 'mine' : ''}`} role="note" title={bids}
      aria-label={`Standing order: ${card.title} wants ${pieces(o.qty, o.fruit)} ${due}. ${holder ? `${o.holder === viewer ? 'You deliver' : `${holder.name} delivers`} at $${o.price} a piece.` : `Bids up to $${o.ceiling} a piece.`}`}>
      <span class="os-k">Order</span>
      <span class="os-want"><Fruit id={o.fruit} size={16} />×{o.qty} {due}</span>
      {holder
        ? <span class="os-who"><Face who={holder.avatar} size={18} /> {o.holder === viewer ? 'You' : holder.name} at ${o.price}</span>
        : <span class="os-who">up to ${o.ceiling} each</span>}
      <span class="os-fine">fine ${o.fine} a piece</span>
    </div>
  );
}
