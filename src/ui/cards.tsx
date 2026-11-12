// The card system (PLAN-083, the rules 18 card set): one set of cards for the app and the print kit, drawn to the
// designs the owner approved (docs/studio/review-18/mockups).
//   TradingCard       a customer or a special guest: black heading, picture, fruit rows with a price tag, one legend row
//   TradingCardBack   a face-down customer: four fixed fruit squares, filled for the fruit wanted, nothing else
//   Gazette           an event            \
//   LorryCard         a lorry              |  design A, "Ticket": a small spaced label and number, a thick rule, a big
//   StallSign         a shopkeeper         |  title, a full-width picture with a perforated edge, coloured number
//   FavourCard        a favour card        |  blocks, the card's text and a dashed red footer
//   UpgradeCard       a stall upgrade      |
//   OrderCard         a standing order    /
//   DeckBack          the pattern back of the six decks above (EventBack is the event deck's)
// A card is 252 units wide and 352 tall (63 x 88 mm). Set --card-w on the card or a parent and the whole card scales;
// every length in cards.css is a number of those units. Names, numbers and text come from the game data (data.ts),
// never from the art. The smaller versions the phone shows are in phoneCards.tsx and ticket.tsx. Styles: cards.css.
import type { ComponentChildren, FunctionComponent } from 'preact';
import { isValidElement } from 'preact';
import {
  BARROW_BUY, CHARACTER_TRAIT, CUSTOMER_CARDS, EVENT_CARDS, FARMER_CARDS, FAVOUR_DECK, FAVOUR_HAND_LIMIT, FAVOURS, FRUIT, JUICE_TIP,
  MAX_STALLS, MAX_UPGRADES, MIN_STALLS, ORDER_BOOK_BONUS, ORDER_CARDS, ORDER_LEAD, PREF_INFO, RIVALS, TRAITS, UPGRADES, lookOf, orderQty,
  prefOf,
  type EventCard, type FarmerCard, type FavourDef, type FavourId, type FruitId, type OrderCard as OrderDef, type Pref, type Stalls,
  type UpgradeId,
} from '../engine/data';
import { LANES } from './boardModel';
import { fitTitle } from './cardType';
import {
  customerArt, customerFocus, eventArt, eventFocus, favourArt, favourFocus, focusCss, guestArt, guestFocus, shopFocus, shopScene, tileArt,
  upgradeArt, upgradeFocus, type DeckId, type Focus,
} from './deckArt';
import { cardChips, type NewsChip } from './eventChips';
import { FruitSvg } from './fruitIcons';

/** Pixel sizes of the picture files in public/art-ticket (for width and height, so nothing jumps while loading). */
export const ART_SIZE = {
  customer: [600, 400],
  event: [600, 384],
  scene: [600, 400],
  badge: [181, 181],
  small: [300, 150],
} as const;

const two = (n: number) => String(n).padStart(2, '0');
const cx = (...parts: (string | false | undefined)[]) => parts.filter(Boolean).join(' ');
/** A fruit's lane class: it sets the lane's colour and the colour of ink that reads on it (cards.css). */
export const laneClass = (f: FruitId) => `ln-${f}`;
/** Things with a fruit, in the order of the board's lanes: blueberry, watermelon, mango, apple. */
export const byLane = <T extends { fruit: FruitId }>(xs: T[]): T[] => [...xs].sort((a, b) => LANES.indexOf(a.fruit) - LANES.indexOf(b.fruit));

/** A card picture, cropped round its focus point. Missing art shows a plain "Art coming" panel, never another character's picture. */
export function CardArt({ src, alt, w, h, class: cls, eager, focus }: {
  src: string | null; alt: string; w: number; h: number; class?: string;
  /** Load straight away (for a card that is on screen from the start). Default: lazy. */
  eager?: boolean;
  /** Where the subject is (deckArt.ts): a frame narrower or flatter than the picture keeps this point in view. */
  focus?: Focus;
}) {
  if (!src) {
    return <div class={cx('x-art', 'x-art-missing', cls)} role="img" aria-label={alt ? `${alt}: art coming` : 'Art coming'}>Art coming</div>;
  }
  return (
    <img class={cx('x-art', cls)} src={src} width={w} height={h} alt={alt} decoding="async" loading={eager ? 'eager' : 'lazy'} draggable={false}
      style={focus ? { objectPosition: focusCss(focus) } : undefined} />
  );
}

/** A customer's number in the deck (1 to 36), or undefined for guests and anyone else. */
export function customerNumber(key: string): number | undefined {
  const i = CUSTOMER_CARDS.findIndex((c) => c.name === key);
  return i >= 0 ? i + 1 : undefined;
}

/** The width of a card's title line, in card units: design A has 13 units of padding, the customer card 9. */
const TITLE_BOX = 252 - 6 - 26;
const NAME_BOX = 252 - 6 - 18;
/** A title's size as a style (cards.css reads --ts). */
const titleSize = (text: string, box: number, big: number, small: number) => ({ '--ts': fitTitle(text, box, big, small).size });

/** Freshness a customer buys, as the three lamps of the legend: which are lit. */
const BUYS: Record<Pref, { okay: boolean; soft: boolean }> = {
  premium: { okay: false, soft: false }, everyday: { okay: true, soft: false }, bargain: { okay: true, soft: true },
};
/** What Okay and Soft fruit pay less than Fresh (the same for every fruit: data.ts FRUIT.drop). */
export const OKAY_LESS = FRUIT.apple.drop[1];
export const SOFT_LESS = FRUIT.apple.drop[0];

/** The pieces a card asks for, one dot each. */
function Dots({ n, label }: { n: number; label: string }) {
  return <span class="cd-dots" role="img" aria-label={label}>{Array.from({ length: n }, () => <i />)}</span>;
}
const piecesOf = (n: number, f: FruitId) => `${n} ${n === 1 ? FRUIT[f].name : FRUIT[f].plural}`;

/** One fruit a card asks for. `done`: already bought (a customer in the row whose order for it is filled). */
export interface CardLine { fruit: FruitId; qty: number; max: number; done?: boolean }

/** The one legend row of a customer card: Fresh, Okay at $1 less, Soft at $2 less; a freshness this customer will not
 *  buy is greyed out. */
export function PrefLegend({ pref, class: cls }: { pref: Pref; class?: string }) {
  const b = BUYS[pref];
  return (
    <div class={cx('cd-leg', cls)} role="img" aria-label={`${PREF_INFO[pref].title}: ${PREF_INFO[pref].text} Okay fruit pays $${OKAY_LESS} less, soft fruit $${SOFT_LESS} less.`}>
      <span><i class="cd-lamp">F</i></span>
      <span class={b.okay ? '' : 'no'}><i class={cx('cd-lamp', !b.okay && 'off')}>O</i>{`−$${OKAY_LESS}`}</span>
      <span class={b.soft ? '' : 'no'}><i class={cx('cd-lamp', !b.soft && 'off')}>S</i>{`−$${SOFT_LESS}`}</span>
    </div>
  );
}

/**
 * A customer's card. `who` is the hidden code key; the name shown is lookOf(who).title. `wants` are the rows to print,
 * with the prices to show (pass the day's prices if the screen shows those); they are drawn in the board's lane order.
 * `guest`: a special guest (an event's customer), who has no number and borrows its event's picture.
 */
export function TradingCard({ who, wants, n, guest, eager, class: cls }: {
  who: string; wants: CardLine[]; n?: number; guest?: boolean; eager?: boolean; class?: string;
}) {
  const look = lookOf(who);
  const pref = prefOf(who);
  const num = guest ? undefined : n ?? customerNumber(who);
  const [w, h] = ART_SIZE[guest ? 'event' : 'customer'];
  return (
    <article class={cx('cd', 'cd-m', 'cd-cust', guest && 'cd-guest', cls)}>
      <header class="cd-kind">
        <span>{num !== undefined ? <><b>{two(num)}</b>{' · Customer'}</> : 'Special guest'}</span>
        <span>{PREF_INFO[pref].title}</span>
      </header>
      <strong class="cd-name" style={titleSize(look.title, NAME_BOX, 26, 21)}>{look.title}</strong>
      <div class="cd-mpic">
        <CardArt src={guest ? guestArt(who) : customerArt(who)} alt={look.title} w={w} h={h} eager={eager} focus={guest ? guestFocus(who) : customerFocus(who)} />
      </div>
      <p class="cd-quirk">{look.quirk}</p>
      <ul class="cd-rows">
        {byLane(wants).map((x) => (
          <li class={cx(laneClass(x.fruit), x.done && 'done')}>
            <FruitSvg id={x.fruit} size={22} alt={FRUIT[x.fruit].name} />
            <Dots n={x.qty} label={piecesOf(x.qty, x.fruit)} />
            <b class="cd-tag">{`$${x.max}`}</b>
          </li>
        ))}
      </ul>
      <PrefLegend pref={pref} />
    </article>
  );
}

/**
 * The back of a customer card, for a face-down walk-in. One design for every customer: four fixed squares, one per
 * fruit in the board's lane order, filled for each fruit the card wants. It takes no name on purpose, so it cannot
 * show a name, type, number, amount, price or picture, and no portrait is loaded until the card is turned face up.
 */
export function TradingCardBack({ fruits, class: cls }: { fruits: FruitId[]; class?: string }) {
  const wanted = LANES.filter((f) => fruits.includes(f));
  return (
    <article class={cx('cd', 'cd-m', 'cd-custback', cls)} role="img"
      aria-label={`A customer, face down${wanted.length ? `. Wants ${wanted.map((f) => FRUIT[f].name.toLowerCase()).join(', ')}` : ''}`}>
      <header class="cd-kind"><span>Customer</span><span><b>Walk-in</b></span></header>
      <div class="cd-wants">
        <span class="cd-wants-h">Wants</span>
        <div class="cd-sqs">
          {LANES.map((f) => <span class={cx('cd-sq', wanted.includes(f) && 'on')}>{wanted.includes(f) && <FruitSvg id={f} size={58} alt="" />}</span>)}
        </div>
      </div>
      <footer class="cd-foot">Turns face up at stocking</footer>
    </article>
  );
}

// ---------- design A, "Ticket" ----------

/** The coloured number blocks under a card's picture. A block about one fruit is in that fruit's lane colour. */
function Blocks({ chips }: { chips: NewsChip[] }) {
  if (!chips.length) return null;
  return (
    <div class={`cd-two cd-n${chips.length}`}>
      {chips.map((c) => (
        <div class={cx('cd-blk', c.fruit ? `cd-blk-f ${laneClass(c.fruit)}` : 'cd-blk-k')}>
          {c.fruit && <span class="cd-ic"><FruitSvg id={c.fruit} size={17} alt={FRUIT[c.fruit].name} /></span>}
          <span class="cd-blk-t"><b>{c.big}</b><small>{c.small}</small></span>
        </div>
      ))}
    </div>
  );
}

/** A design A card's label line, rule and title. `right`: the number or the short note beside the label. */
function Head({ label, right, title, big = 31, small = 25 }: { label: string; right?: ComponentChildren; title: string; big?: number; small?: number }) {
  return (
    <>
      <div class="cd-top"><span>{label}</span>{right}</div>
      <i class="cd-rule" />
      <strong class="cd-ttl" style={titleSize(title, TITLE_BOX, big, small)}>{title}</strong>
    </>
  );
}

/** A design A card's picture, edge to edge, with the perforated edge under it. */
function Pic({ src, alt, size, focus, eager, tall }: { src: string | null; alt: string; size: readonly [number, number]; focus: Focus; eager?: boolean; tall?: boolean }) {
  return (
    <div class={cx('cd-pic', tall && 'cd-pic-l')}>
      <CardArt src={src} alt={alt} w={size[0]} h={size[1]} eager={eager} focus={focus} />
      <i class="cd-perf" />
    </div>
  );
}

/** An event card. `n` is its number (default: its place in the event deck, 1 to 20). The text is the event text from data.ts. */
export function Gazette({ event, n, eager, class: cls }: { event: EventCard; n?: number; eager?: boolean; class?: string }) {
  const num = n ?? EVENT_CARDS.findIndex((e) => e.id === event.id) + 1;
  return (
    <article class={cx('cd', 'cd-a', 'cd-event', cls)}>
      <Head label="Event" right={num > 0 && <b>{`No ${two(num)}`}</b>} title={event.title} />
      <Pic src={eventArt(event.id)} alt={event.title} size={ART_SIZE.event} focus={eventFocus(event.id)} eager={eager} tall />
      <Blocks chips={cardChips(event)} />
      <p class="cd-txt">{event.text}</p>
      <footer class="cd-ft"><span>Keep this card out until night</span></footer>
    </article>
  );
}

/** Table sizes a lorry card prints, 2 to 6 stalls. */
const SIZES = Array.from({ length: MAX_STALLS - MIN_STALLS + 1 }, (_, i) => (MIN_STALLS + i) as Stalls);
/** The row of a lorry card a table uses: its own size, kept within the sizes the card prints. */
export const lorryRow = (stalls: number): Stalls => Math.min(MAX_STALLS, Math.max(MIN_STALLS, stalls)) as Stalls;
/** A lorry card's footer: what arrives green, and the Seconds Lorry's word on the rest. */
export function lorryNotes(card: Pick<FarmerCard, 'unripe' | 'okay'>): string[] {
  return [card.unripe ? `${FRUIT[card.unripe].plural} arrive green` : '', card.okay ? (card.unripe ? 'Other fruit arrives okay' : 'Fruit arrives okay') : ''].filter(Boolean);
}

/**
 * A lorry card: its lanes carry the pieces it brings for every table size. `stalls`: this table's size, whose row is
 * boxed (leave it out for a card that is not in a game).
 */
export function LorryCard({ card, stalls, class: cls }: { card: FarmerCard; stalls?: number; class?: string }) {
  const on = stalls === undefined ? undefined : lorryRow(stalls);
  const row = (n: Stalls) => LANES.map((f) => piecesOf(card.table[n][f], f).toLowerCase()).join(', ');
  const said = on ? `With ${on} stalls: ${row(on)}` : SIZES.map((n) => `${n} stalls: ${row(n)}`).join('. ');
  const notes = lorryNotes(card);
  return (
    <article class={cx('cd', 'cd-a', 'cd-lorry', cls)}>
      <Head label="Lorry" right={<span>Pieces by stalls</span>} title={card.name} big={21} small={21} />
      <div class="cd-ly" role="img" aria-label={`${card.name}. ${said}`}>
        <span class="cd-ly-s">Stalls</span>
        {LANES.map((f) => <span class={`cd-ly-h ${laneClass(f)}`}><b><FruitSvg id={f} size={22} alt="" /></b></span>)}
        {SIZES.map((n) => [
          <span class={cx('cd-ly-l', n === on && 'on')}>{n}</span>,
          ...LANES.map((f) => <span class={cx('cd-ly-n', laneClass(f), n === on && 'on', !card.table[n][f] && 'nil')}>{card.table[n][f]}</span>),
        ])}
        <span class="cd-ly-e" />
        {LANES.map((f) => <span class={`cd-ly-e ${laneClass(f)}`} />)}
      </div>
      {notes.length > 0 && <footer class="cd-ft">{notes.map((t) => <span>{t}</span>)}</footer>}
    </article>
  );
}

/** The six stall-sheet patterns of the printed game (the same names as ticket.tsx PATTERNS). */
export type StallPattern = 'stripes' | 'dots' | 'checks' | 'zigzag' | 'bars' | 'diamonds';

/**
 * A shopkeeper's card, by avatar key. `selected`: picked by this player. `takenBy`: the name of the stall that already
 * took this character (shown as a stamp). `pattern`: the stall sheet this shopkeeper sits at, when that is known (the
 * card then shows it; otherwise it shows the shopkeeper's number).
 */
export function StallSign({ avatar, pattern, selected, takenBy, eager, class: cls }: {
  avatar: string; pattern?: StallPattern; selected?: boolean; takenBy?: string; eager?: boolean; class?: string;
}) {
  const i = RIVALS.findIndex((x) => x.avatar === avatar);
  const name = RIVALS[i]?.name ?? 'Shopkeeper';
  const traitId = CHARACTER_TRAIT[avatar];
  const trait = traitId ? TRAITS[traitId] : undefined;
  const right = pattern ? <span class="cd-pat">{pattern}<i class={`cd-sw pat-${pattern}`} /></span> : i >= 0 && <b>{`No ${two(i + 1)}`}</b>;
  return (
    <article class={cx('cd', 'cd-a', 'cd-keeper', selected && 'is-selected', takenBy && 'is-taken', cls)}>
      <Head label="Shopkeeper" right={right} title={name} />
      <Pic src={shopScene(avatar)} alt={name} size={ART_SIZE.scene} focus={shopFocus(avatar)} eager={eager} tall />
      {trait && <div class="cd-two"><div class="cd-blk cd-blk-y"><small>Perk</small><b>{trait.title}</b></div></div>}
      {trait && <p class="cd-txt">{trait.text}</p>}
      <footer class="cd-ft"><span>Your perk all game</span></footer>
      {takenBy && <span class="cd-taken">{`Taken by ${takenBy}`}</span>}
    </article>
  );
}

/** When a favour card is played, in the words of its blue block. */
export const FAVOUR_WHEN: Record<FavourDef['when'], string> = { evening: 'In the evening', buy: 'On your buying turn', tie: 'After the prices flip' };

/** A favour card. */
export function FavourCard({ id, eager, class: cls }: { id: FavourId; eager?: boolean; class?: string }) {
  const d = FAVOURS[id];
  return (
    <article class={cx('cd', 'cd-a', 'cd-favour', cls)}>
      <Head label="Favour" right={<span>Keep secret</span>} title={d.title} />
      <Pic src={favourArt(id)} alt="" size={ART_SIZE.small} focus={favourFocus(id)} eager={eager} />
      <div class="cd-two"><div class="cd-blk cd-blk-b"><small>When to play</small><b>{FAVOUR_WHEN[d.when]}</b></div></div>
      <p class="cd-txt">{d.text}</p>
      <footer class="cd-ft"><span>Discard after use</span><span>{`Hold up to ${FAVOUR_HAND_LIMIT}`}</span></footer>
    </article>
  );
}

/**
 * The figure in an upgrade card's black block: the one number the card is about, with a caption in the words of the
 * card's own text (data.ts UPGRADES). The numbers are the rules' own constants.
 */
export const UPGRADE_FIGURE: Record<UpgradeId, { big: string; small: string }> = {
  juicebar: { big: `+$${JUICE_TIP}`, small: 'Each okay or soft fruit a customer buys' },
  barrow: { big: `${BARROW_BUY}`, small: 'Pieces of fruit a day' },
  premium: { big: '+$1', small: 'On your fresh fruit' },
  ripening: { big: '1 night', small: 'Green mangoes ripen' },
  orderbook: { big: `+$${ORDER_BOOK_BONUS}`, small: 'Each piece you deliver' },
};
const WORDS = ['none', 'one', 'two', 'three', 'four'];

/** A stall upgrade's card. The label is "Upgrade" (DEC-091). */
export function UpgradeCard({ id, eager, class: cls }: { id: UpgradeId; eager?: boolean; class?: string }) {
  const d = UPGRADES[id];
  const fig = UPGRADE_FIGURE[id];
  return (
    <article class={cx('cd', 'cd-a', 'cd-upgrade', cls)}>
      <Head label="Upgrade" right={<span>Build once</span>} title={d.title} />
      <Pic src={upgradeArt(id)} alt="" size={ART_SIZE.small} focus={upgradeFocus(id)} eager={eager} />
      <div class="cd-two">
        <div class="cd-blk cd-blk-y cd-blk-cost"><b>{`$${d.cost}`}</b><small>To build</small></div>
        <div class="cd-blk cd-blk-k"><b>{fig.big}</b><small>{fig.small}</small></div>
      </div>
      <p class="cd-txt">{d.text}</p>
      <footer class="cd-ft"><span>After a market day</span><span>{`Room for ${WORDS[MAX_UPGRADES] ?? MAX_UPGRADES}`}</span></footer>
    </article>
  );
}

/** "3 at 2–3 · 4 at 4 · 5 at 5–6": how many pieces a standing order wants at each table size (data.ts orderQty). */
function orderSizes(): string {
  const by = new Map<number, number[]>();
  for (const n of SIZES) by.set(orderQty(n), [...(by.get(orderQty(n)) ?? []), n]);
  return [...by].map(([q, ns]) => `${q} at ${ns.length > 1 ? `${ns[0]}–${ns[ns.length - 1]}` : ns[0]}`).join(' · ');
}

/**
 * A standing order's card. In a game: `qty` pieces (drawn as dots), `due` (the words beside the label), and once the
 * bids are in, `bid` (the winning price) and `stake` (what the holder put down). Without them the card is the deck's
 * own: the pieces for each table size, the highest bid allowed and the card's stake.
 */
export function OrderCard({ card, qty, due, bid, stake, class: cls }: {
  card: OrderDef; qty?: number; due?: string; bid?: number; stake?: number; class?: string;
}) {
  return (
    <article class={cx('cd', 'cd-a', 'cd-order', cls)}>
      <Head label="Standing order" right={<span>{due ?? `Due in ${ORDER_LEAD} days`}</span>} title={card.title} small={25} />
      <div class={`cd-want ${laneClass(card.fruit)}`}>
        <span class="cd-ic"><FruitSvg id={card.fruit} size={17} alt={FRUIT[card.fruit].name} /></span>
        {qty !== undefined ? <Dots n={qty} label={piecesOf(qty, card.fruit)} /> : <span class="cd-want-t">{`${orderSizes()} stalls`}</span>}
        <span class="cd-want-l" role="img" aria-label="Fresh or Okay"><i class="cd-lamp">F</i><i class="cd-lamp">O</i></span>
      </div>
      <div class="cd-two">
        <div class="cd-blk cd-blk-o"><b>{`$${bid ?? card.ceiling}`}</b><small>{bid !== undefined ? 'Winning bid, each' : 'Highest bid, each'}</small></div>
        <div class="cd-blk cd-blk-y"><b>{`$${stake ?? card.stake}`}</b><small>Stake</small></div>
      </div>
      <p class="cd-quirk">{card.quirk}</p>
      <p class="cd-txt">{`Lowest bid wins and pays the stake. Deliver ${qty !== undefined ? `all ${qty}` : 'every piece'} and the stake comes back. Fall short and it is lost.`}</p>
      <footer class="cd-ft"><span>No favour card</span><span>No tips</span></footer>
    </article>
  );
}

// ---------- pattern backs (DEC-096) ----------

/** Each deck's name on its back, the size its name is set at, and how many cards it holds. */
const DECKS: Record<DeckId, { name: string; size: number; count: string }> = {
  lorry: { name: 'Lorry', size: 34, count: `Deck of ${FARMER_CARDS.length}` },
  event: { name: 'Event', size: 34, count: `Deck of ${EVENT_CARDS.length}` },
  favour: { name: 'Favour', size: 34, count: `Deck of ${FAVOUR_DECK.length}` },
  upgrade: { name: 'Upgrade', size: 32, count: `${Object.keys(UPGRADES).length} kinds` },
  shopkeeper: { name: 'Shopkeeper', size: 25, count: `Deck of ${RIVALS.length}` },
  order: { name: 'Standing order', size: 27, count: `Deck of ${ORDER_CARDS.length}` },
};

/** A deck's back: its tile repeated in a darker tone of the deck's colour, with a paper band for the name, a rule and
 *  the deck's size. `wide`: the band on a card that is wider than it is tall (the morning's news, face down). */
export function DeckBack({ deck, wide, class: cls }: { deck: DeckId; wide?: boolean; class?: string }) {
  const d = DECKS[deck];
  return (
    <article class={cx('cd-bk', `cd-bk-${deck}`, wide && 'cd-bk-wide', cls)} role="img" aria-label={`${d.name} card, face down`}
      style={{ backgroundImage: `url(${tileArt(deck)})` }}>
      <div class="cd-band">
        <span class="cd-sm">Fruit Market</span>
        <i class="cd-rl" />
        <span class="cd-wd" style={{ '--ts': d.size }}>{d.name}</span>
        <span class="cd-ds">{d.count}</span>
      </div>
    </article>
  );
}

/** The one shared back of every event card (the print kit and the morning flip in the game). */
export function EventBack({ class: cls, wide }: { class?: string; wide?: boolean }) {
  return <DeckBack deck="event" wide={wide} class={cls} />;
}

// ---------- static HTML (print kit, previews, tests) ----------

const VOID = new Set(['area', 'base', 'br', 'col', 'hr', 'img', 'input', 'link', 'meta', 'source', 'wbr', 'image', 'path', 'circle', 'ellipse', 'rect', 'use']);
const ENUMERATED = new Set(['draggable', 'spellcheck', 'contenteditable']);
const SKIP = new Set(['children', 'key', 'ref', 'dangerouslySetInnerHTML']);
const esc = (s: string) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
const kebab = (k: string) => (k.startsWith('--') ? k : k.replace(/[A-Z]/g, (m) => `-${m.toLowerCase()}`));

function attr(name: string, value: unknown): string {
  if (SKIP.has(name) || /^on[A-Z]/.test(name) || value === null || value === undefined) return '';
  const n = name === 'className' ? 'class' : name;
  if (typeof value === 'boolean') return value ? ` ${n}` : ENUMERATED.has(n) ? ` ${n}="false"` : '';
  if (n === 'style' && typeof value === 'object') {
    const css = Object.entries(value as Record<string, unknown>)
      .filter(([, v]) => v !== null && v !== undefined && v !== '')
      .map(([k, v]) => `${kebab(k)}:${typeof v === 'number' && !k.startsWith('--') ? `${v}px` : String(v)}`).join(';');
    return css ? ` style="${esc(css)}"` : '';
  }
  return ` ${n}="${esc(String(value))}"`;
}

/** Render cards (or any hook-free Preact tree) to an HTML string, for the print kit and tests. */
export function toStaticHtml(node: ComponentChildren): string {
  if (node === null || node === undefined || typeof node === 'boolean') return '';
  if (typeof node === 'string' || typeof node === 'number' || typeof node === 'bigint') return esc(String(node));
  if (Array.isArray(node)) return node.map(toStaticHtml).join('');
  if (!isValidElement(node)) return '';
  const { type, props } = node;
  if (typeof type !== 'string') {
    if (typeof type.prototype?.render === 'function') throw new Error('toStaticHtml renders function components only');
    // Checked above: a component without a render method is a function component.
    return toStaticHtml((type as FunctionComponent)(props));
  }
  const p = props as Record<string, unknown>;
  const open = `<${type}${Object.entries(p).map(([k, v]) => attr(k, v)).join('')}`;
  if (VOID.has(type)) return `${open}/>`;
  const inner = p.dangerouslySetInnerHTML as { __html?: string } | undefined;
  return `${open}>${inner?.__html ?? toStaticHtml(props.children)}</${type}>`;
}
