// How to play (PLAN-129): seven pages, one screen each, built round the game's own pictures (the shopkeeper and
// customer cards, the Wholesale Market board, fruit pieces, freshness letters, the lorry, event, favour, standing
// order and upgrade cards), so players recognise them at the table. The pages (PAGES, at the end): how to play, fruit
// and freshness, lorry and event, customer, favour, Market Day, try a sale. The wording follows RULES.md (rules 20)
// and the glossary (DEC-087): plain, one fact to a sentence. The numbers come from the game data (the freshness price
// rule through stageWords.ts), so the page cannot drift from the rules.
import type { ComponentChildren } from 'preact';
import { useEffect, useLayoutEffect, useRef, useState } from 'preact/hooks';
import {
  BASE_BUY, CHARMER_DAILY_FAVOURS, EVENT_CARDS, FARMER_CARDS, FAVOUR_HAND_LIMIT, FAVOURS, FRUIT,
  MAX_UPGRADES, ORDER_CARDS, ORDER_LEAD, PREF_INFO, RIVALS, START_CASH, UPGRADES,
  acceptsStage, deliveredGreen, lookOf, orderQty, stageAt,
  type FavourId, type FruitId, type Pref, type Stage, type UpgradeId,
} from '../engine/data';
import { Coin, Face, Fruit } from './art';
import { LANES } from './boardModel';
import {
  ART_SIZE, CardArt, DeckBack, FavourCard, Gazette, LorryCard, OrderCard, TradingCard, TradingCardBack, UpgradeCard,
} from './cards';
import { CardPop, CardZoom } from './cardZoom';
import { customerArt, customerFocus, shopFocus, shopScene, upgradeArt, upgradeFocus } from './deckArt';
import { fx } from './fx';
import { held, moveMs } from './motion';
import { MARKET_DAY_LIST, TIE_ORDER } from './rulesText';
import { PriceTag, StallPreview } from './stampCard';
import { seatColour } from './table';
import { STAGE_LETTER, Ticket, TicketBack } from './ticket';
import { STAGE_WORD, stageLess } from './stageWords';
import './howto.css';

// ---------- small pieces drawn as the table draws them ----------

/** A freshness letter in its disc, as on the market boxes and your shelf (G, F, O, S). */
function Lamp({ stage }: { stage: Stage }) {
  return <span class="ht-lamp" aria-hidden="true">{STAGE_LETTER[stage]}</span>;
}

/** One piece of fruit with its freshness letter, as a market box or a shelf chip shows it. */
function Piece({ f, stage, size = 22, cls = '' }: { f: FruitId; stage: Stage; size?: number; cls?: string }) {
  return <span class={`ht-pc ${cls}`}><Fruit id={f} size={size} stage={stage} /><Lamp stage={stage} /></span>;
}

/** A small "?" piece: a crate before the bell shows how many pieces, never which fruit. */
function Hidden() {
  return <span class="ht-pc ht-hid" aria-hidden="true">?</span>;
}

/** A plain "more" row that opens in place (the price ties). */
function More({ title, children }: { title: string; children: ComponentChildren }) {
  return (
    <details class="ht-more">
      <summary>{title}</summary>
      <div>{children}</div>
    </details>
  );
}

/** A card's picture, name and words, readable at phone size; a tap opens the whole card (cardZoom.tsx). */
function Tile({ pic, title, text, card, cls = '' }: { pic: ComponentChildren; title: string; text: string; card: ComponentChildren; cls?: string }) {
  const [open, setOpen] = useState(false);
  return (
    <>
      <button type="button" class={`ht-tile ${cls}`} aria-haspopup="dialog" aria-label={`${title}: ${text} See the whole card`} onClick={() => { fx.tap(); setOpen(true); }}>
        <span class="ht-tile-pic" aria-hidden="true">{pic}</span>
        <b aria-hidden="true">{title}</b>
        <small aria-hidden="true">{text}</small>
      </button>
      {open && <CardPop title={title} onClose={() => setOpen(false)}>{card}</CardPop>}
    </>
  );
}

// ---------- 1 how to play ----------

function KeeperPic({ avatar }: { avatar: string }) {
  return <CardArt src={shopScene(avatar)} alt="" w={ART_SIZE.scene[0]} h={ART_SIZE.scene[1]} focus={shopFocus(avatar)} />;
}

/** The four things every stall does each day, each drawn with a shopkeeper or customer from the cards. Buying goes in
 *  turns (poorest stall first, then clockwise); stocking and pricing are done by every stall at once, in secret. */
const DAY_TURNS: { verb: string; line: string; pic: () => ComponentChildren; badge: () => ComponentChildren }[] = [
  {
    verb: 'Buy', line: `In turn, poorest stall first: up to ${BASE_BUY} pieces from the Wholesale Market.`,
    pic: () => <KeeperPic avatar={RIVALS[1].avatar} />,
    badge: () => <span class="ht-turn-b"><Fruit id="apple" size={16} /><Fruit id="watermelon" size={16} /><Fruit id="blueberry" size={16} /></span>,
  },
  {
    verb: 'Stock', line: 'Everyone at once, in secret: put the pieces you want to sell in your crate.',
    pic: () => <KeeperPic avatar={RIVALS[2].avatar} />,
    badge: () => <span class="ht-turn-b"><Hidden /><Hidden /><Hidden /></span>,
  },
  {
    verb: 'Price', line: 'Everyone at once, in secret: one price for each fruit in your crate. Then the bell rings.',
    pic: () => <KeeperPic avatar={RIVALS[0].avatar} />,
    badge: () => <span class="ht-turn-b ht-turn-tag">$ ?</span>,
  },
  {
    verb: 'Rush', line: 'Crates and prices open. Customers buy from the cheapest stall first, and you are paid at once.',
    pic: () => <CardArt src={customerArt('Robert')} alt="" w={ART_SIZE.customer[0]} h={ART_SIZE.customer[1]} focus={customerFocus('Robert')} />,
    badge: () => <span class="ht-turn-b"><Coin size={16} /><b>+$8</b></span>,
  },
];

/** The day's four turns as picture tiles; a tap picks one and says what happens. */
function DayTurns() {
  const [on, setOn] = useState(0);
  const t = DAY_TURNS[on];
  return (
    <section class="ht-turns" aria-label="A day at the stall">
      <div class="ht-turn-grid">
        {DAY_TURNS.map((x, i) => (
          <button type="button" class={`ht-turn ${i === on ? 'on' : ''}`} aria-pressed={i === on} onClick={() => setOn(i)}>
            <span class="ht-turn-pic" aria-hidden="true">{x.pic()}</span>
            <span class="ht-turn-n" aria-hidden="true">{i + 1}</span>
            {x.badge()}
            <b>{x.verb}</b>
          </button>
        ))}
      </div>
      <p class="ht-turn-say" role="status"><b>{`${t.verb}. `}</b>{t.line}</p>
    </section>
  );
}

function HowToPlay() {
  return (
    <>
      <p>You run a fruit stall. Each day you <b>buy</b> fruit at the Wholesale Market and <b>sell</b> it to customers, against rival stalls.</p>
      <div class="ht-hero">
        <span class="ht-hero-stall"><StallPreview look={{}} avatar={RIVALS[0].avatar} name="Your stall" /></span>
        <div class="ht-hero-cash">
          <small>Each stall starts with</small>
          <span class="ht-cash"><Coin size={26} /><b>${START_CASH}</b></span>
          <span class="ht-win">Most cash wins.</span>
        </div>
      </div>
      <h3 class="ht-h3">Every day, every stall</h3>
      <DayTurns />
      <p class="ht-length">A game lasts 8, 10 or 14 days.</p>
    </>
  );
}

// ---------- 2 fruit and freshness ----------

/** What each fruit is like, for its pop-up (data.ts's notes on the fruit), and what customers usually pay for a Fresh
 *  one (the customer cards are spread round these prices: data.ts, the 36 customers). */
const FRUIT_NOTE: Record<FruitId, string> = {
  blueberry: 'Cheap to buy, but it goes off fast: sell it quickly.',
  watermelon: 'The steady middle, with a spare Fresh day.',
  apple: 'The keeper: four Fresh days. Rarely the best price, rarely a loss.',
  mango: 'Arrives Green and ripens on your shelf, then sells at a premium for one Fresh day.',
};
const USUAL_PRICE: Record<FruitId, number> = { blueberry: 5, watermelon: 7, apple: 6, mango: 11 };

/** A fruit's card in a pop-up: what it is like, what it costs at the Wholesale Market at each freshness, how long it
 *  keeps, and what customers usually pay. */
function FruitCard({ f }: { f: FruitId }) {
  const d = FRUIT[f];
  const stages: Stage[] = [...(deliveredGreen(f) ? ['unripe' as Stage] : []), 'fresh', 'okay', 'notso'];
  const fresh = d.ripe.filter((x) => x === 'fresh').length;
  return (
    <article class={`ht-fruitcard ln-${f}`}>
      <header><span>Fruit</span><b>{d.name}</b></header>
      <span class="ht-fruitcard-pic"><Fruit id={f} size={64} /></span>
      <p>{FRUIT_NOTE[f]}</p>
      <table>
        <thead><tr><th scope="col">Freshness</th><th scope="col">Costs</th><th scope="col">Customers pay</th></tr></thead>
        <tbody>
          {stages.map((st) => (
            <tr>
              <th scope="row"><Lamp stage={st} /> {STAGE_WORD[st]}</th>
              <td>${d.cost[st]}</td>
              <td>{st === 'unripe' ? "Can't sell yet" : st === 'fresh' ? `About $${USUAL_PRICE[f]}` : `$${st === 'okay' ? 1 : 2} less`}</td>
            </tr>
          ))}
        </tbody>
      </table>
      <footer>{deliveredGreen(f) ? `Green for ${d.unripeSlots} nights, then ` : 'Lasts '}{`${d.ripe.length} days: ${fresh === 1 ? 'Fresh' : `${fresh} Fresh`}, then Okay, then Soft.`}</footer>
    </article>
  );
}

/** A fruit's lane on the Wholesale Market board, freshest box at the top as in the game (a fruit some lorry delivers
 *  green has its green boxes above Fresh; the watermelon keeps a green slot in the engine, but no lorry fills it).
 *  Okay and Soft boxes say what customers take off. `at`: the box the delivered pieces stand in (-1: they spoiled);
 *  `n`: how many. `onOpen`: the lane's head opens the fruit's card. */
export function FruitLane({ f, at, n = 1, onOpen }: { f: FruitId; at?: number; n?: number; onOpen?: () => void }) {
  const slots = FRUIT[f].ripe.length + (deliveredGreen(f) ? FRUIT[f].unripeSlots : 0);
  const boxes = Array.from({ length: slots }, (_, i) => slots - 1 - i);
  return (
    <div class={`ht-lane-v ln-${f}`} role="img" aria-label={`${FRUIT[f].name}: ${boxes.map((i) => STAGE_WORD[stageAt(f, i)]).join(', ')}, freshest first`}>
      <button type="button" class="ht-lane-h" aria-label={`${FRUIT[f].name}: see its card`} onClick={onOpen}><span class="ht-lane-ico"><Fruit id={f} size={18} /></span><i aria-hidden="true">i</i></button>
      {boxes.map((i) => {
        const st = stageAt(f, i);
        const drop = st === 'unripe' ? 0 : FRUIT[f].drop[i];
        return (
          <i class={`ht-box st-${st} ${at === i && n > 0 ? 'here' : ''}`} aria-label={st === 'unripe' ? 'green' : undefined}>
            <Lamp stage={st} />
            {at === i && n > 0 ? <span class="ht-tkn"><Fruit id={f} size={18} stage={st} />{n > 1 && <b>×{n}</b>}</span> : drop ? <small>{`−$${drop}`}</small> : null}
          </i>
        );
      })}
    </div>
  );
}

const PREFS: Pref[] = ['premium', 'everyday', 'bargain'];
const SOLD_STAGES: Stage[] = ['fresh', 'okay', 'notso'];
const firstBox = (f: FruitId) => FRUIT[f].ripe.length - 1 + (deliveredGreen(f) ? FRUIT[f].unripeSlots : 0);
/** The delivery on the board: a real lorry card's row at three stalls. */
const BOARD_LORRY = FARMER_CARDS.find((c) => c.name === 'Mixed Basket') ?? FARMER_CARDS[0];
const BOARD_STALLS = 3;

function Freshness() {
  const [night, setNight] = useState(0);
  const [open, setOpen] = useState<FruitId | null>(null);
  const longest = Math.max(...LANES.map(firstBox));
  return (
    <>
      <p>There are 4 fruits in the game: blueberry, watermelon, mango and apple.</p>
      <p>Every night all fruit ages one step: <b>Fresh</b>, then <b>Okay</b>, then <b>Soft</b>, then it spoils.</p>
      <div class="ht-mkt-v">
        <div class="ht-mkt-v-h">
          <b>{`${BOARD_LORRY.name} · ${BOARD_STALLS} stalls`}</b>
          <span>{night === 0 ? 'Just delivered' : `After ${night} night${night === 1 ? '' : 's'}`}</span>
          {night <= longest
            ? <button type="button" class="btn ht-btn ht-btn-s" onClick={() => setNight(night + 1)}>Advance 1 night</button>
            : <button type="button" class="btn ht-btn ht-btn-s" onClick={() => setNight(0)}>Start again</button>}
        </div>
        <div class="ht-lanes-v">{LANES.map((f) => <FruitLane f={f} at={firstBox(f) - night} n={BOARD_LORRY.table[BOARD_STALLS][f]} onOpen={() => { fx.tap(); setOpen(f); }} />)}</div>
      </div>
      {open && <CardPop title={FRUIT[open].name} onClose={() => setOpen(null)}><FruitCard f={open} /></CardPop>}
    </>
  );
}

/** Who buys what: each customer type against each freshness (the (i) on the Customer page). */
function WhoBuys() {
  return (
    <article class="ht-infocard">
      <header><span>Customers</span><b>Who buys what</b></header>
      <table class="ht-accept">
        <thead><tr><th scope="col">Type</th>{SOLD_STAGES.map((s) => <th scope="col"><Lamp stage={s} /> {STAGE_WORD[s]}</th>)}</tr></thead>
        <tbody>
          {PREFS.map((p) => (
            <tr class={`pref-${p}`}>
              <th scope="row"><b>{PREF_INFO[p].title}</b></th>
              {SOLD_STAGES.map((s, i) => (acceptsStage(p, s)
                ? <td class="yes">{i === 0 ? 'Top price' : `$${i} less`}</td>
                : <td class="no">Won't buy</td>))}
            </tr>
          ))}
        </tbody>
      </table>
      <p>A card's colour and its F, O and S marks show the customer's type.</p>
    </article>
  );
}

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

function Customers() {
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

function Favours() {
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

function LorryEvent() {
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

function MarketDay() {
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

// ---------- 7 try a sale ----------

interface SaleStall { id: string; stages: Stage[]; price: number }
/** The example from the rules: Bobby Books wants 3 blueberries and pays up to $5 for a Fresh one. */
const BOBBY = { who: 'Robert', name: 'Bobby Books', fruit: 'blueberry' as FruitId, qty: 3, max: 5 };
const SALE: SaleStall[] = [
  { id: 'A', stages: ['fresh', 'fresh'], price: 4 },
  { id: 'B', stages: ['okay'], price: 3 },
  { id: 'C', stages: ['fresh', 'fresh'], price: 5 },
];
const FRESHER: Stage[] = ['fresh', 'okay', 'notso', 'unripe'];
const STALL_COLOURS = [3, 1, 5];

/** The pieces this customer takes, in order: cheapest first, then fresher; only freshness they buy, at a price they pay. */
export function saleOrder(pref: Pref, stalls = SALE): { stall: string; k: number; price: number; stage: Stage }[] {
  return stalls
    .flatMap((st) => st.stages.map((stage, k) => ({ stall: st.id, k, price: st.price, stage })))
    .filter((p) => p.stage !== 'unripe' && acceptsStage(pref, p.stage) && p.price <= BOBBY.max - stageLess(p.stage, BOBBY.fruit))
    .sort((a, b) => a.price - b.price || FRESHER.indexOf(a.stage) - FRESHER.indexOf(b.stage))
    .slice(0, BOBBY.qty);
}

/** What the reveal says, for Fresh or Okay (Everyday) and Fresh only (Premium). The words are the page's own; tests
 *  (tests/stage-words.test.ts) check every stall, number and "not taken" in them against saleOrder, so a rule change
 *  cannot leave them behind. */
export const SALE_SAYS: Record<'everyday' | 'premium', string> = {
  premium: 'B\'s Okay blueberry is not taken. A sells 2 at $4, then C sells 1 at $5.',
  everyday: 'B is cheapest: it sells 1 at $3, then A sells 2 at $4. The order is full, so C sells nothing.',
};

/** The Try a sale page (exported so tests can draw it). */
export function TrySale() {
  const [freshOnly, setFreshOnly] = useState(false);
  const [guess, setGuess] = useState<string | null>(null);
  const [shown, setShown] = useState(-1); // -1: not revealed; n: pieces moved so far
  const timer = useRef<number | undefined>(undefined);
  const pref: Pref = freshOnly ? 'premium' : 'everyday';
  const steps = saleOrder(pref);
  const done = shown >= steps.length;
  useEffect(() => () => window.clearTimeout(timer.current), []);
  useEffect(() => {
    if (shown < 0 || done) return undefined;
    timer.current = window.setTimeout(() => setShown(shown + 1), shown === 0 ? held(500) : Math.max(held(900), moveMs(900)));
    return () => window.clearTimeout(timer.current);
  }, [shown, done]);
  const reset = (fo = freshOnly) => { window.clearTimeout(timer.current); setFreshOnly(fo); setGuess(null); setShown(-1); };
  const moved = steps.slice(0, Math.max(0, shown));
  const first = steps[0]?.stall;
  const note = (st: SaleStall): string => {
    if (shown < 0) return '';
    const sold = moved.filter((m) => m.stall === st.id).length;
    if (sold) return `Sold ${sold} · $${sold * st.price}`;
    if (!done) return '';
    return st.stages.some((s) => acceptsStage(pref, s)) ? 'Order full' : 'Fresh only: not taken';
  };
  const ask = shown < 0 ? (guess ? 'Now reveal the sale.' : 'Who sells first? Tap a stall.') : !done ? 'Selling…'
    : `${guess ? (guess === first ? 'Right! ' : 'Not quite. ') : ''}${SALE_SAYS[freshOnly ? 'premium' : 'everyday']} Two stalls served him, so nobody draws a favour card.`;
  return (
    <>
      <div class="ht-sale-top">
        <CardZoom class="ht-cust" title={BOBBY.name}><TradingCard who={BOBBY.who} wants={[{ fruit: BOBBY.fruit, qty: BOBBY.qty, max: BOBBY.max }]} eager /></CardZoom>
        <div class="ht-sale-want">
          <b>{BOBBY.name} wants 3 blueberries</b>
          <small>{freshOnly ? `Today: Fresh only, up to $${BOBBY.max} each.` : `Up to $${BOBBY.max} for a Fresh one, $${BOBBY.max - stageLess('okay', BOBBY.fruit)} for Okay. He won't take Soft.`}</small>
          <div class="ht-seg" role="group" aria-label="What Bobby takes">
            <button type="button" class={freshOnly ? '' : 'on'} aria-pressed={!freshOnly} onClick={() => reset(false)}>Fresh or Okay</button>
            <button type="button" class={freshOnly ? 'on' : ''} aria-pressed={freshOnly} onClick={() => reset(true)}>Fresh only</button>
          </div>
          <span class="ht-got" role="status">{`Bought: ${moved.length} of ${BOBBY.qty}`}</span>
          <span class="ht-basket" aria-hidden="true">{moved.map((m) => <Piece f={BOBBY.fruit} stage={m.stage} size={18} cls="ht-in" />)}</span>
        </div>
      </div>
      <p class={`ht-ask ${done ? 'done' : ''}`} role="status">{ask}</p>
      <div class="ht-stalls">
        {SALE.map((st, si) => {
          const taken = moved.filter((m) => m.stall === st.id).map((m) => m.k);
          const n = note(st);
          return (
            <button type="button" class={`ht-stall ${guess === st.id ? 'picked' : ''} ${n === 'Order full' || n.startsWith('Fresh only') ? 'out' : ''}`} disabled={shown >= 0}
              aria-pressed={guess === st.id} aria-label={`Stall ${st.id}: ${st.stages.length} ${st.stages[0] === 'okay' ? 'Okay' : 'Fresh'} at $${st.price}${n ? `. ${n}` : ''}`}
              onClick={() => setGuess(st.id)}>
              <span class="ht-awn" style={{ background: seatColour(STALL_COLOURS[si]) }} />
              <b>Stall {st.id}</b>
              <span class="ht-st-pcs">{st.stages.map((s, k) => <Piece f={BOBBY.fruit} stage={s} size={18} cls={taken.includes(k) ? 'gone' : ''} />)}</span>
              <PriceTag fruit={BOBBY.fruit} price={st.price} tone={taken.length ? 'sold' : undefined} />
              <small class="ht-st-note">{n || (guess === st.id ? 'Your pick' : ' ')}</small>
            </button>
          );
        })}
      </div>
      {shown < 0
        ? <button type="button" class="btn primary ht-btn ht-go" disabled={!guess} onClick={() => setShown(0)}>Reveal sale</button>
        : <button type="button" class="btn ht-btn ht-go" onClick={() => reset()}>Try again</button>}
      <More title="Price ties">
        <p>If two stalls set the same price, a stall holding Favoured Trade can play it after the prices flip to win the tie. Otherwise ties go: {TIE_ORDER} in today's buying.</p>
      </More>
    </>
  );
}

/** The pages. `info`: a card behind an (i) at the page's top right. */
const PAGES: { title: string; body: () => ComponentChildren; info?: { label: string; card: () => ComponentChildren } }[] = [
  { title: 'How to play', body: () => <HowToPlay /> },
  { title: 'Fruit & freshness', body: () => <Freshness /> },
  { title: 'Lorry & event', body: () => <LorryEvent /> },
  { title: 'Customer', body: () => <Customers />, info: { label: 'Who buys what', card: () => <WhoBuys /> } },
  { title: 'Favour', body: () => <Favours /> },
  { title: 'Market Day', body: () => <MarketDay /> },
  { title: 'Try a sale', body: () => <TrySale /> },
];

/** How to play. PLAN-124: `inTab` draws it as Home's Rules tab (the bottom bar leaves it, so it has no Close). */
export function HowTo({ onDone, inTab }: { onDone: () => void; inTab?: boolean }) {
  const [i, setI] = useState(0);
  const [info, setInfo] = useState(false);
  const top = useRef<HTMLElement>(null);
  const go = (k: number) => { setI(k); setInfo(false); top.current?.scrollTo?.({ top: 0 }); };
  const s = PAGES[i];
  return (
    <div class={`page howto tk-page${inTab ? ' howto-tab' : ''}`}>
      <header class="topbar">{!inTab && <button class="icon-btn" onClick={onDone} aria-label="Close">✕</button>}<div class="day"><b>How to play</b></div><span class="muted">{i + 1}/{PAGES.length}</span></header>
      <main class="scroll pad" ref={top}>
        <nav class="ht-tabs" aria-label="Rules pages">
          {PAGES.map((p, k) => <button type="button" class={k === i ? 'on' : ''} aria-current={k === i ? 'page' : undefined} onClick={() => go(k)}>{p.title}</button>)}
        </nav>
        <section class="panel slide" key={i}>
          <h2>{s.title}</h2>
          {s.info && <button type="button" class="ht-info" aria-label={s.info.label} aria-haspopup="dialog" onClick={() => { fx.tap(); setInfo(true); }}>i</button>}
          {s.body()}
          {s.info && info && <CardPop title={s.info.label} onClose={() => setInfo(false)}>{s.info.card()}</CardPop>}
        </section>
        <div class="row2">
          <button class="btn" disabled={i === 0} onClick={() => go(i - 1)}>← Back</button>
          {i < PAGES.length - 1 ? <button class="btn primary" onClick={() => go(i + 1)}>Next →</button> : <button class="btn primary" onClick={onDone}>Done</button>}
        </div>
      </main>
    </div>
  );
}
