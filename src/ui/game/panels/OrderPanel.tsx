// Standing orders (rules 14): the bid on a Market Day morning, and the strip that keeps the order in view until it is
// collected. Rules 17: everyone sees who is bidding, who passed and who is still deciding (never a rival's price), and
// a stall may change its mind for as long as another stall is still deciding. Rules 18: the winner puts down a stake
// instead of risking a fine for each piece, only its own crate fills the order, and rivals are not involved.
import { useState } from 'preact/hooks';
import { FRUIT, ORDER_BOOK_BONUS, ORDER_CARDS } from '../../../engine/data';
import { orderStake, type GameState, type Standing } from '../../../engine/game';
import { Coin, Face, Fruit } from '../../art';
import { OrderTicket } from '../../phoneCards';

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

/** Rules 18: what a stall must know before it bids, in three lines: the pay, the stake, and how the stake comes back. */
export function OrderRules({ s, p }: { s: GameState; p: number }) {
  const o = s.standing!;
  const book = s.players[p].upgrades.includes('orderbook');
  return (
    <ul class="op-rules">
      <li>Lowest bid wins the order and is paid that price for each piece{book ? ` (plus $${ORDER_BOOK_BONUS} a piece with your Order Book)` : ''}.</li>
      <li>The winner puts down a stake of <b>${orderStake(s, p)}</b> now{book ? ' (halved by your Order Book)' : ''}.</li>
      <li>Deliver all {o.qty} from your own crate on day {o.due} and the stake comes back. Deliver fewer and it is lost. Rivals are not involved.</li>
    </ul>
  );
}

/** Rules 18: a stall may only bid with the stake in cash. The words shown when it cannot (null when it can). */
export function stakeHint(s: GameState, p: number): string | null {
  const stake = orderStake(s, p);
  return s.players[p].cash < stake ? `You need $${stake} in cash for the stake, so you can only pass.` : null;
}

/**
 * The line a waiting stall reads under the bidders. `decided`: it has bid or passed. Before that the line must not say
 * "Bid in" (PLAN-081): offline the computer stalls decide first, so the panel is on screen before the person's own turn.
 */
export function bidWaitText(mine: Standing['bids'][number], decided: boolean, canChange: boolean): string {
  if (!decided) return 'The other stalls bid first. Your turn is next';
  const own = mine === 'pass' ? 'You passed' : typeof mine === 'number' ? `Your bid: $${mine}` : 'Bid in';
  return `${own}. ${canChange ? 'You can change it until the last stall decides' : 'Waiting for the other stalls'}`;
}

/** Every stall names the price per piece it would fill the order for (secret), or passes. The lowest bid wins.
 *  `waiting`: this stall is not being asked now, because it has decided and others have not (`decided`; with
 *  `canChange`, online, it may still change its mind) or because the computer stalls decide before it. */
export function OrderPanel({ s, p, waiting, canChange, decided = true, onBid }: { s: GameState; p: number; waiting?: boolean; canChange?: boolean; decided?: boolean; onBid: (price: number | null) => void }) {
  const o = s.standing!;
  const card = ORDER_CARDS[o.card];
  const mine = o.bids[p];
  const [v, setV] = useState(typeof mine === 'number' ? mine : Math.max(1, o.ceiling - 2));
  const locked = waiting && !canChange;
  // Rules 18: a stall may only bid with the stake in cash. It can always pass.
  const hint = stakeHint(s, p);
  const short = hint !== null;
  return (
    <>
    <div class="price-panel order-panel mid-panel tk-panel" data-a="order-panel">
      {/* The order's card (PLAN-083), then the three lines a stall must know before it bids. */}
      <OrderTicket card={card} qty={o.qty} due={o.due} day={s.day} ceiling={o.ceiling} stake={orderStake(s, p)} />
      <OrderRules s={s} p={p} />
      {/* Everything under the order's card (who is bidding, the line of advice, the price and Pass) stays in view at
          the foot of the panel while the card scrolls behind it. PLAN-081: the customer row now stays on the table
          during the bid, so on a phone the whole panel no longer always fits. The order of the parts is unchanged. */}
      <div class="op-foot">
        <BidStatus s={s} p={p} />
        {waiting && <div class="hint-bar waiting-dots">{bidWaitText(mine, decided, !!canChange)}</div>}
        {!locked && short && <div class="hint-bar">{hint}</div>}
        {!locked && !short && (
          <div class="op-bid" role="group" aria-label="Your secret bid per piece">
            <button type="button" class="btn step" aria-label="Bid $1 less" disabled={v <= 1} onClick={() => setV(v - 1)}>−</button>
            <span class="op-price"><Coin size={22} /><b>{v}</b><small>a piece</small></span>
            <button type="button" class="btn step" aria-label="Bid $1 more" disabled={v >= o.ceiling} onClick={() => setV(v + 1)}>+</button>
          </div>
        )}
        {!locked && !short && mine !== 'pass' && <button type="button" class="btn ghost op-pass" onClick={() => onBid(null)}>{waiting ? 'Pass instead' : "Pass: I don't want this order"}</button>}
      </div>
    </div>
    {!locked && !short && (
      <div class="pp-lock">
        <button type="button" class="btn primary wide big" disabled={waiting && mine === v} onClick={() => onBid(v)}>{waiting ? `Change bid to $${v}` : `Bid $${v} a piece`}</button>
      </div>
    )}
    {!locked && short && mine !== 'pass' && (
      <div class="pp-lock">
        <button type="button" class="btn primary wide big" onClick={() => onBid(null)}>Pass</button>
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
      aria-label={`Standing order: ${card.title} wants ${pieces(o.qty, o.fruit)} ${due}. ${holder ? `${o.holder === viewer ? 'You deliver' : `${holder.name} delivers`} at $${o.price} a piece. A stake of $${o.staked ?? 0} is held until then.` : `Bids up to $${o.ceiling} a piece. The stake is $${o.stake}.`}`}>
      <span class="os-k">Order</span>
      <span class="os-want"><Fruit id={o.fruit} size={16} />×{o.qty} {due}</span>
      {holder
        ? <span class="os-who"><Face who={holder.avatar} size={18} /> {o.holder === viewer ? 'You' : holder.name} at ${o.price}</span>
        : <span class="os-who">up to ${o.ceiling} each</span>}
      <span class="os-fine">{holder ? `stake $${o.staked ?? 0} held` : `stake $${o.stake}`}</span>
    </div>
  );
}
