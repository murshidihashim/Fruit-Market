// Standing orders (rules 14): the bid on a Market Day morning, and the strip that keeps the order in view until it is
// collected. Rules 17: everyone sees who is bidding, who passed and who is still deciding (never a rival's price), and
// a stall may change its mind for as long as another stall is still deciding. Rules 18: the winner puts down a stake
// instead of risking a fine for each piece, only its own crate fills the order, and rivals are not involved.
// PLAN-084: laid out as the approved Standing-Order screen. One sheet stays on the table from the first stall's bid
// until the bids have been turned over: the order's card and who is bidding scroll if they must, while your bid, the
// three lines of the stake and the buttons always stay in view under them.
import { useLayoutEffect, useRef, useState } from 'preact/hooks';
import { FRUIT, ORDER_BOOK_BONUS, ORDER_CARDS, stakeFor } from '../../../engine/data';
import { count, orderStake, type GameState, type Standing } from '../../../engine/game';
import { Face, Fruit } from '../../art';
import { nextLorry } from '../../boardModel';
import { OrderTicket } from '../../phoneCards';
import type { OrderShow } from '../dayBeats';
import { drawCloser, useReach } from '../reach';

/** How many steps closer the bid sheet may be drawn before the part above your bid scrolls (sheets.css, data-tight). */
export const BID_STEPS = 3;

/** "3 mangoes", "1 apple". */
const pieces = (n: number, f: keyof typeof FRUIT) => `${n} ${(n === 1 ? FRUIT[f].name : FRUIT[f].plural).toLowerCase()}`;
const one = (f: keyof typeof FRUIT) => FRUIT[f].name.toLowerCase();

/**
 * Who is bidding (rules 17): each rival is "bidding", "passed" or "deciding…". The prices stay secret until every
 * stall has decided. `open`: the bids have been turned over, so each rival's price shows, and the winner's is marked.
 */
export function BidStatus({ s, p, order, open }: { s: GameState; p: number; order?: Standing; open?: boolean }) {
  const o = order ?? s.standing!;
  if (s.players.length < 2) return null;
  return (
    <ul class={`ob-status n${s.players.length - 1} ${open ? 'open' : ''}`} aria-label={open ? 'The bids' : 'Who is bidding'}>
      {s.players.map((pl, i) => {
        if (i === p) return null;
        const b = o.bids[i];
        const st = b === null ? 'wait' : b === 'pass' ? 'pass' : 'in';
        const won = !!open && o.holder === i;
        return (
          <li class={`st-${st} ${won ? 'won' : ''}`} data-a={`ob-p${i}`}>
            <Face who={pl.avatar} size={26} />
            <span class="ob-who"><b>{pl.name}</b>
              {open && typeof b === 'number'
                ? <span class="ob-bid-n"><b>${b}</b>{won ? ' wins' : ''}</span>
                : <span>{st === 'wait' ? 'deciding…' : st === 'pass' ? 'passed' : 'bidding'}</span>}
            </span>
          </li>
        );
      })}
    </ul>
  );
}

/**
 * Rules 18, what a bid means for this stall, in three lines: the stake it pays if it wins, what a full delivery pays,
 * and what falling short costs. `bid`: the price per piece it is about to bid. `order`: the order, when it is no
 * longer the one in play (the bids are being turned over).
 */
export function StakeLines({ s, p, bid, order }: { s: GameState; p: number; bid: number; order?: Standing }) {
  const o = order ?? s.standing!;
  const book = s.players[p].upgrades.includes('orderbook');
  const stake = stakeFor(o.stake, book);
  const each = bid + (book ? ORDER_BOOK_BONUS : 0);
  return (
    <dl class="ob-lines">
      <div><dt>If you win</dt><dd>You pay the ${stake} stake now{book ? ' (halved by your Order Book)' : ''}. You have ${s.players[p].cash}.</dd></div>
      <div><dt>Deliver all {o.qty}</dt><dd>${bid * o.qty}{book ? `, plus $${ORDER_BOOK_BONUS} a piece with your Order Book,` : ','} and the ${stake} stake comes back.</dd></div>
      <div><dt>Fall short</dt><dd>${each} for each {one(o.fruit)} you deliver. The stake is lost.</dd></div>
    </dl>
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

/** What a stall can get of the order's fruit by the due day, from what is in view: its shelf, the market, tomorrow's lorry. */
export function canGetLine(s: GameState, p: number, o: Standing): string {
  const lorry = nextLorry(s)?.find((l) => l.f === o.fruit);
  return [
    `On your shelf: ${count(s.players[p].stock, o.fruit)}`,
    `at the Wholesale Market today: ${s.market[o.fruit].reduce((a, n) => a + n, 0)}`,
    ...(lorry ? [`on tomorrow's lorry: ${lorry.n}`] : []),
  ].join(' · ');
}

/**
 * Every stall names the price per piece it would fill the order for (secret), or passes. The lowest bid wins.
 * `waiting`: this stall is not being asked now, because it has decided and others have not (`decided`; with
 * `canChange`, online, it may still change its mind) or because the computer stalls decide before it.
 * `shown`: the bids are in and are being turned over (dayBeats.ts); nothing can be pressed then.
 */
export function OrderPanel({ s, p, waiting, canChange, decided = true, shown, onBid }: {
  s: GameState; p: number; waiting?: boolean; canChange?: boolean; decided?: boolean; shown?: OrderShow | null; onBid: (price: number | null) => void;
}) {
  // While the bids are turned over the game has moved on, so the order is the one being shown.
  const o = shown?.order ?? s.standing!;
  const card = ORDER_CARDS[o.card];
  const mine = o.bids[p];
  const [v, setV] = useState(typeof mine === 'number' ? mine : Math.max(1, o.ceiling - 2));
  const root = useRef<HTMLDivElement>(null);
  // On a short phone, or with many stalls, the card, the bidders and the note hold more than the sheet shows: the
  // sheet is then drawn closer, a step at a time (sheets.css, data-tight), before anything scrolls. Only once the
  // sheet's reach has been measured, and again when the bids are turned over (the part above your bid changes).
  const top = useRef<HTMLDivElement>(null);
  const reached = useRef(false);
  const closer = () => { if (root.current && top.current) drawCloser(root.current, top.current, BID_STEPS); };
  useReach(root, 'street', true, true, () => { reached.current = true; closer(); });
  const stake = shown ? o.staked ?? o.stake : orderStake(s, p);
  // Rules 18: a stall may only bid with the stake in cash. It can always pass.
  const hint = shown ? null : stakeHint(s, p);
  const short = hint !== null;
  // Not this stall's turn and nothing to change: the computer stalls decide first, or its own choice is final.
  const locked = !!shown || (!!waiting && !canChange);
  const price = shown ? (typeof mine === 'number' ? mine : null) : v;
  const iWon = !!shown && shown.stage !== 'in' && o.holder === p;
  // While the bids are turned over the sheet keeps the shape it had: one button for a stall that could only pass.
  const lone = useRef(short);
  if (!shown) lone.current = short;
  // Online a stall that has decided may still change its mind: its buttons then say so.
  const again = !!waiting && !!canChange && !shown;
  // On a short phone the card and the bidders scroll above your bid. As the bids are turned over the bidders are
  // brought into view, so the winner never lies under the foot of the sheet.
  const turning = !!shown;
  useLayoutEffect(() => {
    if (reached.current) closer();
    if (turning && top.current) top.current.scrollTop = top.current.scrollHeight;
  }, [turning, shown?.stage]);
  return (
    <>
    <div class="price-panel order-panel mid-panel tk-panel fm-sheet sh-order" data-a="order-panel" data-stage={shown ? shown.stage : 'bid'} ref={root}>
      <div class="ob-top" ref={top}>
        {/* The order's card (PLAN-083), who is bidding, and what there is to deliver it with. */}
        <OrderTicket card={card} qty={o.qty} due={o.due} day={s.day} ceiling={o.ceiling} stake={stake} held={shown?.stage === 'paid'} />
        <div class="ob-sec">
          <b class="tk-label">{shown && shown.stage !== 'in' ? 'The bids' : 'Who is bidding · prices stay secret'}</b>
          <BidStatus s={s} p={p} order={o} open={!!shown && shown.stage !== 'in'} />
        </div>
        {!shown && (
          <div class="ob-get">
            <b class="tk-label">{FRUIT[o.fruit].plural} you can get by day {o.due}</b>
            <span>{canGetLine(s, p, o)}</span>
          </div>
        )}
      </div>
      {/* Your bid and what it means stay in view at the foot of the sheet while the card above scrolls on a short phone. */}
      <div class="ob-foot">
        {short ? <div class="hint-bar ob-hint">{hint}</div> : (
          <>
            <b class="tk-label">Your bid, for each {one(o.fruit)}</b>
            <div class={`ob-bid ${iWon ? 'won' : ''}`} role="group" aria-label="Your secret bid per piece">
              {!shown && <button type="button" class="ob-step" aria-label="Bid $1 less" disabled={v <= 1} onClick={() => setV(v - 1)}>−</button>}
              <span class="ob-price">
                {price === null ? <b class="ob-none">You passed</b> : <><b>${price}</b><small>a piece · ${price * o.qty} for all {o.qty}</small></>}
              </span>
              {!shown && <button type="button" class="ob-step" aria-label="Bid $1 more" disabled={v >= o.ceiling} onClick={() => setV(v + 1)}>+</button>}
            </div>
            {/* Once the bids are turned over, who won takes the three lines' place in a box of the same size. */}
            {shown
              ? <div class="ob-after"><StakeLines s={s} p={p} bid={price ?? v} order={o} /><p class={`ob-result ${shown.stage === 'in' ? 'hid' : ''}`} role="status">{shown.text}</p></div>
              : <StakeLines s={s} p={p} bid={v} />}
          </>
        )}
        {/* One line under them, always there so nothing above it moves: who the table waits for, or (online) that a
            bid can still be changed. */}
        <div class={`ob-note ${waiting && !shown ? 'waiting-dots' : ''}`}>
          {shown ? '' : waiting ? bidWaitText(mine, decided, !!canChange) : !short && canChange ? 'You can change your bid or pass until the last stall decides.' : ''}
        </div>
      </div>
    </div>
    {/* The buttons take the action bar's place. Only the main button is a `.btn` (the browser tests press that one). */}
    <div class="pp-lock ob-lock">
      {lone.current ? (
        <button type="button" class="btn primary wide big" disabled={locked || mine === 'pass'} onClick={() => onBid(null)}>Pass</button>
      ) : (
        <>
          <button type="button" class="ob-pass" disabled={locked || mine === 'pass'} onClick={() => onBid(null)}>{again ? 'Pass instead' : 'Pass'}</button>
          <button type="button" class="btn primary wide big" disabled={locked || (!!waiting && mine === v)} onClick={() => onBid(v)}>{again ? `Change bid to $${v}` : `Bid $${price ?? v} a piece`}</button>
        </>
      )}
    </div>
    </>
  );
}

/** The order in play, in one line under the street: what it wants and when, then who won it and at what price. */
export function OrderStrip({ s, viewer }: { s: GameState; viewer: number }) {
  const o = s.standing;
  if (!o || s.phase === 'over') return null;
  const card = ORDER_CARDS[o.card];
  const due = o.due === s.day ? 'today' : o.due === s.day + 1 ? 'tomorrow' : `Day ${o.due}`;
  const holder = o.holder === null ? null : s.players[o.holder];
  const bids = o.holder === null ? '' : o.bids.map((b, i) => `${i === viewer ? 'You' : s.players[i].name} ${b === 'pass' || b === null ? 'passed' : `$${b}`}`).join(' · ');
  return (
    <div class={`order-strip ${o.due === s.day ? 'due' : ''} ${o.holder === viewer ? 'mine' : ''}`} role="note" title={bids}
      aria-label={`Standing order: ${card.title} wants ${pieces(o.qty, o.fruit)} ${due}. ${holder ? `${o.holder === viewer ? 'You deliver' : `${holder.name} delivers`} at $${o.price} a piece. A stake of $${o.staked ?? 0} is held until then.` : `Bids up to $${o.ceiling} a piece. The stake is $${o.stake}.`}`}>
      <span class="os-k">Order</span>
      <span class="os-want"><Fruit id={o.fruit} size={16} />×{o.qty} {due}</span>
      {holder
        ? <span class="os-who"><Face who={holder.avatar} size={18} /> {o.holder === viewer ? 'You' : holder.name} at ${o.price}</span>
        : <span class="os-who">bids up to ${o.ceiling}</span>}
      <span class="os-fine">{holder ? `stake $${o.staked ?? 0} held` : `stake $${o.stake}`}</span>
    </div>
  );
}
