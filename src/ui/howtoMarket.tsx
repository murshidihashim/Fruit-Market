// How to play (HowTo.tsx), pages 3 to 6: lorry and event, customer, favour and Market Day. Moved out of HowTo.tsx
// unchanged (REP-140 A-02, A-08).
import type { ComponentChildren } from 'preact';
import { useEffect, useLayoutEffect, useRef, useState } from 'preact/hooks';
import { CHARMER_DAILY_FAVOURS, EVENT_CARDS, FARMER_CARDS, FAVOUR_HAND_LIMIT, FAVOURS, MAX_UPGRADES, ORDER_CARDS, ORDER_LEAD, UPGRADES, lookOf, orderQty, type FavourId, type FruitId, type UpgradeId } from '../engine/data';
import { Face, Fruit } from './art';
import { ART_SIZE, CardArt, DeckBack, FavourCard, Gazette, LorryCard, OrderCard, TradingCard, TradingCardBack, UpgradeCard } from './cards';
import { CardZoom } from './cardZoom';
import { upgradeArt, upgradeFocus } from './deckArt';
import { moveMs } from './motion';
import { MARKET_DAY_LIST } from './rulesText';
import { Ticket, TicketBack } from './ticket';
import { Piece, Tile } from './howtoParts';

// ---------- 4 customer ----------

/** The example table: three stalls, so a regular and two walk-ins today and tomorrow (RULES.md, The queue). */
const TODAY_REG = { who: 'Aisyah', wants: [{ fruit: 'watermelon' as FruitId, qty: 3, max: 7 }] };
const TODAY_WALK: { who: string; wants: { fruit: FruitId; qty: number; max: number }[] }[] = [
  { who: 'Farid', wants: [{ fruit: 'apple', qty: 3, max: 5 }] },
  { who: 'Mei Ling', wants: [{ fruit: 'blueberry', qty: 2, max: 4 }, { fruit: 'watermelon', qty: 2, max: 5 }] },
];
const TOMORROW_REG = { who: 'John', wants: [{ fruit: 'apple' as FruitId, qty: 2, max: 5 }, { fruit: 'watermelon' as FruitId, qty: 2, max: 6 }] };
const TOMORROW_WALK: FruitId[][] = [['blueberry'], ['apple', 'watermelon']];
const fruitsOf = (c: { wants: { fruit: FruitId }[] }) => [...new Set(c.wants.map((w) => w.fruit))];

/** The four things a customer card tells you, and where each is on the card face up and face down. */
type Point = 'fruit' | 'qty' | 'price' | 'fresh';
const POINTS: { id: Point; up: string; down: string | null }[] = [
  { id: 'fruit', up: '.cd-rows li .x-fruit', down: '.cd-sqs' },
  { id: 'qty', up: '.cd-dots', down: null },
  { id: 'price', up: '.cd-tag', down: null },
  { id: 'fresh', up: '.cd-leg', down: null },
];

/** A card with a ring that glides to the part being pointed at (`sel`), dimming the rest; null: the whole card, with
 *  "Hidden until Stocking" over it. */
function PointCard({ sel, children }: { sel: string | null | undefined; children: ComponentChildren }) {
  const box = useRef<HTMLDivElement>(null);
  const [at, setAt] = useState<{ x: number; y: number; w: number; h: number } | null>(null);
  useLayoutEffect(() => {
    const el = box.current;
    if (!el || sel === undefined) { setAt(null); return; }
    const t = sel ? el.querySelector(sel) : el.firstElementChild;
    if (!t) { setAt(null); return; }
    const a = el.getBoundingClientRect(), b = t.getBoundingClientRect();
    // 4 px round the part, kept inside the card so the ring is never cut off at its edge
    const x = Math.max(0, b.left - a.left - 4), y = Math.max(0, b.top - a.top - 4);
    setAt({ x, y, w: Math.min(a.width - x, b.right - a.left + 4 - x), h: Math.min(a.height - y, b.bottom - a.top + 4 - y) });
  }, [sel]);
  return (
    <div class={`ht-pt ${at ? 'on' : ''}`} ref={box}>
      {children}
      <span class="ht-ring" aria-hidden="true" style={at ? { transform: `translate(${at.x}px, ${at.y}px)`, width: `${at.w}px`, height: `${at.h}px` } : undefined} />
      {at && sel === null && <span class="ht-pt-note" aria-hidden="true">Hidden until Stocking</span>}
    </div>
  );
}

/** A phrase that points at a part of the cards: underlined in mustard, filled when it is the one shown. A span, not a
 *  button, so the phrase stays part of the sentence and its highlight wraps with the words. */
function PointLink({ id, on, set, children }: { id: Point; on: Point | null; set: (p: Point | null) => void; children: ComponentChildren }) {
  const go = () => set(on === id ? null : id);
  return (
    <span class={`ht-link ${on === id ? 'on' : ''}`} role="button" tabIndex={0} aria-pressed={on === id} onClick={go}
      onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); go(); } }}>{children}</span>
  );
}

const BOARD_STEPS = ['Buying', 'Stocking', 'Next morning'];

/** Today's row and the Tomorrow strip through a day. Every ticket has the same size at every step. Going from Stocking
 *  to Next morning plays the move: today's customers leave, and tomorrow's rise from the strip into the row. */
function Board() {
  const [k, setK] = useState(0);
  const [moving, setMoving] = useState(false);
  const timer = useRef<number | undefined>(undefined);
  useEffect(() => () => window.clearTimeout(timer.current), []);
  const pick = (i: number) => {
    window.clearTimeout(timer.current);
    if (i === 2 && k !== 2) {
      setMoving(true);
      timer.current = window.setTimeout(() => { setMoving(false); setK(2); }, Math.max(1, moveMs(650)));
    } else { setMoving(false); setK(i); }
  };
  const next = k === 2;
  return (
    <>
      <div class="ht-seg ht-steps" role="group" aria-label="Moment of the day">
        {BOARD_STEPS.map((t, i) => <button type="button" class={i === (moving ? 2 : k) ? 'on' : ''} aria-pressed={i === k} onClick={() => pick(i)}>{t}</button>)}
      </div>
      <div class={`ht-board ${moving ? 'moving' : ''}`}>
        <span class="ht-zone">{next ? 'Today (was tomorrow)' : 'Today'}</span>
        <div class={`ht-row ${next ? 'ht-arrive' : ''}`} key={next ? 'b' : 'a'} aria-label={next ? 'Today\'s customers: yesterday\'s Tomorrow strip' : k === 1 ? 'Today\'s customers, all face up' : 'Today\'s customers: the regular face up, two walk-ins face down'}>
          {next
            ? [<Ticket who={TOMORROW_REG.who} lines={TOMORROW_REG.wants} />, ...TOMORROW_WALK.map((fs) => <TicketBack fruits={fs} label="Walk-in" />)]
            : [<Ticket who={TODAY_REG.who} lines={TODAY_REG.wants} />, ...TODAY_WALK.map((c) => (k === 1
              ? <Ticket who={c.who} lines={c.wants} class="ht-flip" />
              : <TicketBack fruits={fruitsOf(c)} label="Walk-in" />))]}
        </div>
        <div class="ht-tmr" key={next ? 'n' : 't'} aria-label={next ? 'Tomorrow: a new crowd is drawn' : `Tomorrow: ${lookOf(TOMORROW_REG.who).title} and two walk-ins face down`}>
          <span class="ht-tmr-k">Tomorrow</span>
          {next
            ? <span class="ht-tmr-new">A new crowd is drawn</span>
            : [<span class="ht-tmr-chip"><Face who={TOMORROW_REG.who} size={22} />{TOMORROW_REG.wants.map((w) => <span class="ht-tmr-w"><Fruit id={w.fruit} size={14} />{w.qty}</span>)}</span>,
              ...TOMORROW_WALK.map((fs) => <span class="ht-tmr-chip back">{fs.map((f) => <Fruit id={f} size={14} />)}</span>)]}
        </div>
      </div>
    </>
  );
}

export function Customers() {
  const [pt, setPt] = useState<Point | null>(null);
  const p = POINTS.find((x) => x.id === pt);
  return (
    <>
      <div class="ht-fb">
        <figure>
          <PointCard sel={p ? p.up : undefined}><CardZoom class="ht-fb-card" title={lookOf(TODAY_REG.who).title}><TradingCard who={TODAY_REG.who} wants={TODAY_REG.wants} eager /></CardZoom></PointCard>
          <figcaption><b>Regular</b> Face up</figcaption>
        </figure>
        <figure>
          <PointCard sel={p ? p.down : undefined}><span class="ht-fb-card"><TradingCardBack fruits={fruitsOf(TODAY_REG)} /></span></PointCard>
          <figcaption><b>Walk-in</b> Face down; turns face up at Stocking</figcaption>
        </figure>
      </div>
      <p class="ht-desc">
        Customers arrive every morning. Each one wants certain <PointLink id="fruit" on={pt} set={setPt}>fruit</PointLink>: <PointLink id="qty" on={pt} set={setPt}>how many</PointLink>,
        {' '}<PointLink id="price" on={pt} set={setPt}>the most it pays for each piece</PointLink>, and <PointLink id="fresh" on={pt} set={setPt}>the freshness it will take</PointLink>.
        {' '}Serve a customer's whole order by yourself to gain a Favour card.
      </p>
      <h3 class="ht-h3">On the board</h3>
      <Board />
    </>
  );
}

// ---------- 5 favour ----------

const FAVOUR_IDS = Object.keys(FAVOURS) as FavourId[];

export function Favours() {
  return (
    <>
      <p>Serve a customer's <b>whole order by yourself</b> and you draw a secret favour card (1 a day; {CHARMER_DAILY_FAVOURS} for the Charmer). You hold up to {FAVOUR_HAND_LIMIT} ({FAVOUR_HAND_LIMIT + 1} for the Charmer).</p>
      <div class="ht-earn" aria-label="A whole order served by you alone earns a face-down favour card">
        <span class="ht-earn-ord"><Piece f="watermelon" stage="fresh" size={16} /><Piece f="watermelon" stage="fresh" size={16} /><Piece f="watermelon" stage="fresh" size={16} /><small>3 of 3, all from you</small></span>
        <span class="ht-arrow" aria-hidden="true">→</span>
        <span class="ht-mini" aria-hidden="true"><DeckBack deck="favour" /></span>
      </div>
      <p class="ht-swipe-h">Each card says when to play it. Swipe to see all {FAVOUR_IDS.length}.</p>
      <div class="ht-swipe" role="list" aria-label="The favour cards">
        {FAVOUR_IDS.map((id) => <div class="ht-swipe-c" role="listitem"><FavourCard id={id} /></div>)}
      </div>
      <p class="ht-small">In the evening, everyone plays their evening cards at the same time, then taps Lights out.</p>
    </>
  );
}

// ---------- 3 lorry and event ----------

/** All the cards of a deck in a row to swipe; a tap opens one whole. */
function CardSwipe({ label, children }: { label: string; children: ComponentChildren[] }) {
  return <div class="ht-swipe ht-swipe-s" role="list" aria-label={label}>{children.map((c) => <div class="ht-swipe-c" role="listitem">{c}</div>)}</div>;
}

export function LorryEvent() {
  return (
    <>
      <h3 class="ht-h3">Lorry</h3>
      <p class="ht-small">The lorry unloads fruit at the Wholesale Market every morning. Each lorry card shows what it brings for 2 to 6 stalls. Tomorrow's lorry is also turned face up for players to plan ahead.</p>
      <CardSwipe label={`The ${FARMER_CARDS.length} lorry cards`}>
        {FARMER_CARDS.map((c) => <CardZoom title={c.name}><LorryCard card={c} /></CardZoom>)}
      </CardSwipe>
      <h3 class="ht-h3">Event</h3>
      <p class="ht-small">From Day 2, an event card is turned over every morning. It changes that day: what customers pay, what the lorry brings, or who comes to the market.</p>
      <CardSwipe label={`The ${EVENT_CARDS.length} event cards`}>
        {EVENT_CARDS.map((e) => <CardZoom title={e.title}><Gazette event={e} /></CardZoom>)}
      </CardSwipe>
    </>
  );
}

// ---------- 6 Market Day ----------

const ORDER = ORDER_CARDS[0];
const ORDER_N = orderQty(3);
const BID = 7;
const UPGRADE_IDS = Object.keys(UPGRADES) as UpgradeId[];

function UpgradeTile({ id }: { id: UpgradeId }) {
  const d = UPGRADES[id];
  const [w, h] = ART_SIZE.small;
  return <Tile cls="ht-up" pic={<CardArt src={upgradeArt(id)} alt="" w={w} h={h} focus={upgradeFocus(id)} />} title={`${d.title} · $${d.cost}`} text={d.text} card={<UpgradeCard id={id} />} />;
}

export function MarketDay() {
  return (
    <>
      <p>Days {MARKET_DAY_LIST} are Market Days. Two extra things happen.</p>
      <h3 class="ht-h3">1. A standing order</h3>
      <div class="ht-order">
        <CardZoom class="ht-order-c" title={ORDER.title}><OrderCard card={ORDER} qty={ORDER_N} bid={BID} stake={ORDER.stake} /></CardZoom>
        <ol class="ht-order-steps">
          <li><b>Bid.</b> Every stall bids a price per piece, or passes. The lowest bid wins.</li>
          <li><b>Stake.</b> The winner puts down a stake, ${ORDER.stake} here.</li>
          <li><b>Deliver.</b> {ORDER_LEAD} days later, hand over all {ORDER_N} Fresh or Okay pieces: you are paid your bid for each, and you get the stake back. Short, and the stake is lost.</li>
        </ol>
      </div>
      <h3 class="ht-h3">2. Build an upgrade</h3>
      <p class="ht-small">That evening you may build 1 upgrade. Your stall has room for {MAX_UPGRADES}. Swipe to see all {UPGRADE_IDS.length}.</p>
      <div class="ht-ups">{UPGRADE_IDS.map((id) => <UpgradeTile id={id} />)}</div>
    </>
  );
}
