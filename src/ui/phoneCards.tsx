// The cards at the sizes the phone shows them (PLAN-083), drawn to the approved phone screens
// (docs/studio/review-18/mockups: Morning, Rush, Standing-Order, Evening). The full cards are in cards.tsx; the small
// customer tickets of the row are in ticket.tsx. Each has a black strip that says what it is, the picture cropped
// round its focus point, and the same numbers, names and text as the full card. Drawing only. Styles: cards.css.
import type { ComponentChildren } from 'preact';
import {
  FAVOURS, FRUIT, PREF_INFO, UPGRADES, lookOf, prefOf,
  type FarmerCard, type FavourId, type FruitId, type OrderCard as OrderDef, type UpgradeId,
} from '../engine/data';
import { Coin } from './art';
import { LANES } from './boardModel';
import { ART_SIZE, CardArt, FAVOUR_WHEN, OKAY_LESS, SOFT_LESS, byLane, customerNumber, laneClass, lorryNotes, lorryRow, type CardLine } from './cards';
import {
  GUEST_EVENT, customerArt, customerFocus, favourArt, favourFocus, guestArt, guestFocus, upgradeArt, upgradeFocus, type Focus,
} from './deckArt';
import type { NewsChip } from './eventChips';
import { FruitSvg } from './fruitIcons';

const two = (n: number) => String(n).padStart(2, '0');
const cx = (...parts: (string | false | undefined)[]) => parts.filter(Boolean).join(' ');
const piecesOf = (n: number, f: FruitId) => `${n} ${n === 1 ? FRUIT[f].name : FRUIT[f].plural}`;

/** `got`: how many of the pieces have been handed over (the rush: a dot is filled as its piece lands). */
function Dots({ n, label, got = 0 }: { n: number; label: string; got?: number }) {
  return <span class="wc-dots" role="img" aria-label={label}>{Array.from({ length: n }, (_, i) => <i class={i < got ? 'got' : undefined} />)}</span>;
}

// ---------- the morning: today's event ----------

/** What the morning's news prints: an event card, or the "Calm Day" of a day without one. */
export interface NewsCard { id: string; title: string; text: string; flavour?: string }

/**
 * Today's event as the morning shows it: the picture beside the title, what it changes on mustard chips, then the
 * card's own words. `n`: the card's number in the event deck (a Calm Day is not a card, so it has none). `children`:
 * anything more the morning adds under the text (the price limits of Price Controls).
 */
export function EventTicket({ card, n, art, focus, chips, children }: {
  card: NewsCard; n?: number; art: string | null; focus: Focus; chips: NewsChip[]; children?: ComponentChildren;
}) {
  return (
    <article class="wc wc-event">
      <header class="wc-kind"><span>Event</span>{n !== undefined && n > 0 && <span><b>{`No ${two(n)}`}</b></span>}</header>
      <div class="wc-body">
        <CardArt class="wc-evpic" src={art} alt="" w={ART_SIZE.event[0]} h={ART_SIZE.event[1]} eager focus={focus} />
        <div class="wc-main">
          <b class="wc-ttl">{card.title}</b>
          {chips.map((c) => <span class="wc-chip"><b>{c.big}</b>{c.small}</span>)}
          {card.flavour && <span class="wc-flavour">{card.flavour}</span>}
          <p class="wc-txt">{card.text}</p>
          {children}
        </div>
      </div>
      {n !== undefined && n > 0 && <footer class="wc-foot">Stays in force until night</footer>}
    </article>
  );
}

// ---------- the morning: today's lorry ----------

const SIZES = [2, 3, 4, 5, 6] as const;

/**
 * Today's lorry as the morning shows it: its lanes carry the pieces for every table size, with this table's row boxed.
 * `card`: today's lorry card, when it is known (boardModel.todaysLorry). `today`: what was really unloaded, given when
 * an event changed the load or the card is not known; it is then the boxed row, labelled "Today", above the card's rows.
 */
export function LorryTicket({ card, stalls, today, green, ripeIn }: {
  card: FarmerCard | null; stalls: number; today?: Record<FruitId, number>;
  /** The fruit that arrives green today (null: none), and how many nights it takes to ripen. */
  green: FruitId | null; ripeIn: number;
}) {
  const on = lorryRow(stalls);
  const said = LANES.map((f) => piecesOf(today ? today[f] : card ? card.table[on][f] : 0, f).toLowerCase()).join(', ');
  // What arrives green and when it ripens, then the Seconds Lorry's word on the rest.
  const [first, ...rest] = card ? lorryNotes(card) : green ? [`${FRUIT[green].plural} arrive green`] : [];
  const notes = [first, green ? `Ripe in ${ripeIn} nights` : '', ...rest].filter(Boolean);
  return (
    <article class="wc wc-lorry">
      <header class="wc-kind"><span>Lorry</span><span><b>Today</b>{card ? ` · ${card.name}` : ''}</span></header>
      <div class="wc-lt" role="img" aria-label={`Today's delivery${card ? ` (${card.name})` : ''}: ${said}`}>
        <span />
        {LANES.map((f) => <span class={`wc-lt-h ${laneClass(f)}`}><FruitSvg id={f} size={14} alt="" /></span>)}
        {/* What really came goes first, so it is in view before the card's printed rows. */}
        {today && [
          <span class="wc-lt-l on">Today</span>,
          ...LANES.map((f) => <span class={cx('wc-lt-n', laneClass(f), 'on', !today[f] && 'nil')}>{today[f]}</span>),
        ]}
        {card && SIZES.map((n) => [
          <span class={cx('wc-lt-l', n === on && (today ? 'mark' : 'on'))}>{`${n} stalls`}</span>,
          ...LANES.map((f) => <span class={cx('wc-lt-n', laneClass(f), n === on && !today && 'on', !card.table[n][f] && 'nil')}>{card.table[n][f]}</span>),
        ])}
      </div>
      {notes.length > 0 && <footer class="wc-foot">{notes.join(' · ')}</footer>}
    </article>
  );
}

// ---------- a standing order, at the bid ----------

/** A standing order as the bid shows it: the client's picture, what it wants, the highest bid allowed and the stake.
 *  `held`: the winner's stake has been put down, so its coins lie on the card (PLAN-084). */
export function OrderTicket({ card, qty, due, day, ceiling, stake, held }: {
  card: OrderDef; qty: number; due: number; day: number; ceiling: number; stake: number; held?: boolean;
}) {
  const left = due - day;
  return (
    <article class="wc wc-order">
      <header class="wc-kind"><span>Standing order</span><span><b>{left <= 0 ? 'Due today' : left === 1 ? 'Due tomorrow' : `Due in ${left} days`}</b>{` · day ${due}`}</span></header>
      <div class="wc-body">
        <CardArt class="wc-sqpic" src={customerArt(card.name)} alt="" w={ART_SIZE.customer[0]} h={ART_SIZE.customer[1]} eager focus={customerFocus(card.name)} />
        <div class="wc-main">
          <b class="wc-ttl wc-ttl-o">{card.title}</b>
          <span class={`wc-rw ${laneClass(card.fruit)}`}><FruitSvg id={card.fruit} size={22} alt="" /><Dots n={qty} label={piecesOf(qty, card.fruit)} /></span>
          <span class="wc-lab">{`${piecesOf(qty, card.fruit)} · fresh or okay`}</span>
        </div>
      </div>
      <div class="wc-stats">
        <div class="wc-stat"><b>{`$${ceiling}`}</b><span>Highest bid, each</span></div>
        <div class={cx('wc-stat', 'y', held && 'held')} data-a="order-stake"><b>{`$${stake}`}</b><span>{held ? 'Stake held' : 'Stake'}</span>{held && <i class="wc-coins" aria-hidden="true"><Coin size={16} /><Coin size={16} /><Coin size={16} /></i>}</div>
      </div>
      <footer class="wc-foot">Lowest bid wins · No favour card · No tips</footer>
    </article>
  );
}

// ---------- a customer, in the rush ----------

/**
 * A customer as the rush shows them: the heading, the picture, each fruit they came for today with its price tag, and
 * the legend. `now`: the fruit being served; the other rows are greyed. `order`: a standing order collected today
 * (it takes Fresh or Okay pieces at its bid, so its legend has no price steps). A line's `got`: the pieces handed
 * over so far; its `done`: the fruit has been bought (the row is ticked).
 */
export function CustomerWide({ who, lines, now, order }: { who: string; lines: (CardLine & { got?: number })[]; now?: FruitId; order?: boolean }) {
  const look = lookOf(who);
  const guest = !!GUEST_EVENT[who];
  const num = guest || order ? undefined : customerNumber(who);
  const pref = prefOf(who);
  const [w, h] = ART_SIZE[guest ? 'event' : 'customer'];
  const okay = order || pref !== 'premium';
  const soft = !order && pref === 'bargain';
  return (
    <article class={cx('wc', 'wc-cust', guest && 'guest')}>
      <header class="wc-kind">
        <span>{num !== undefined ? <><b>{two(num)}</b>{' · Customer'}</> : order ? 'Standing order' : guest ? 'Special guest' : 'Customer'}</span>
        <span>{order ? 'Due today' : PREF_INFO[pref].title}</span>
      </header>
      <div class="wc-body">
        <CardArt class="wc-custpic" src={guest ? guestArt(who) : customerArt(who)} alt="" w={w} h={h} eager focus={guest ? guestFocus(who) : customerFocus(who)} />
        <div class="wc-main">
          <b class="wc-ttl wc-ttl-c">{look.title}</b>
          {byLane(lines).map((x) => (
            <div class={cx('wc-rw', laneClass(x.fruit), now !== undefined && x.fruit !== now && 'later', x.done && 'done')}>
              <FruitSvg id={x.fruit} size={20} alt={FRUIT[x.fruit].name} />
              <Dots n={x.qty} label={piecesOf(x.qty, x.fruit)} got={x.got} />
              <b class="wc-tag">{`$${x.max}`}</b>
            </div>
          ))}
        </div>
      </div>
      <div class="wc-leg" role="img" aria-label={order ? 'Takes Fresh or Okay fruit at its price' : `${PREF_INFO[pref].title}: ${PREF_INFO[pref].text} Okay fruit pays $${OKAY_LESS} less, soft fruit $${SOFT_LESS} less.`}>
        <i class="wc-lamp">F</i>
        <i class={cx('wc-lamp', !okay && 'off')}>O</i>{!order && <span class={okay ? '' : 'no'}>{`−$${OKAY_LESS}`}</span>}
        <i class={cx('wc-lamp', !soft && 'off')}>S</i>{!order && <span class={soft ? '' : 'no'}>{`−$${SOFT_LESS}`}</span>}
      </div>
    </article>
  );
}

// ---------- the evening: upgrade offers and the favour cards you hold ----------

/**
 * An upgrade on offer in the evening: label, picture, name, cost, the card's text, and the Build button at its foot
 * (a built upgrade says so instead). `why`: the reason it cannot be built now (null: it can).
 */
export function UpgradeOffer({ id, owned, why, onBuild }: { id: UpgradeId; owned?: boolean; why?: string | null; onBuild: () => void }) {
  const d = UPGRADES[id];
  return (
    <article class={cx('uo', owned && 'owned')}>
      <span class="uo-kind">Upgrade</span>
      <CardArt class="uo-pic" src={upgradeArt(id)} alt="" w={ART_SIZE.small[0]} h={ART_SIZE.small[1]} focus={upgradeFocus(id)} />
      <b class="uo-nm">{d.title}</b>
      <span class="uo-cost">{`$${d.cost}`}</span>
      <span class="uo-tx">{d.text}</span>
      {owned
        ? <span class="uo-ft">Built</span>
        : <button type="button" class="uo-buy" disabled={!!why} title={why ?? ''} onClick={onBuild}>{`Build $${d.cost}`}</button>}
    </article>
  );
}

/**
 * A favour card you hold, as the evening shows it. The whole card is one button: it opens the card, where it can be
 * played. `ready`: it can be played at this step, so the card says "Play" at its foot.
 */
export function FavourMini({ id, ready, onOpen }: { id: FavourId; ready?: boolean; onOpen: () => void }) {
  const d = FAVOURS[id];
  return (
    <button type="button" class={cx('fav', ready && 'ready')} onClick={onOpen} aria-label={`Favour card: ${d.title}. ${FAVOUR_WHEN[d.when]}. ${d.text}`}>
      <span class="fav-kind"><span>Favour</span><b>Secret</b></span>
      <CardArt class="fav-pic" src={favourArt(id)} alt="" w={ART_SIZE.small[0]} h={ART_SIZE.small[1]} focus={favourFocus(id)} />
      <span class="fav-nm">{d.title}</span>
      <span class="fav-when">{FAVOUR_WHEN[d.when]}</span>
      <span class="fav-tx">{d.text}</span>
      {ready && <span class="fav-play">{`Play ${d.title}`}</span>}
    </button>
  );
}

/** A favour card you hold, on the shelf dock: a slip with the card's picture and name. Tap it to open the card. */
export function FavourChip({ id, usable, onOpen }: { id: FavourId; usable?: boolean; onOpen: () => void }) {
  const d = FAVOURS[id];
  return (
    <button type="button" class={cx('favchip', usable && 'usable')} onClick={onOpen} title={d.text} aria-label={`Favour card: ${d.title}`}>
      <CardArt class="favchip-pic" src={favourArt(id)} alt="" w={ART_SIZE.small[0]} h={ART_SIZE.small[1]} eager focus={favourFocus(id)} />
      <span>{d.title}</span>
    </button>
  );
}
