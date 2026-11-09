// The card system (DEC-066): one set of cards for the app and the print kit.
//   TradingCard      a customer (Art 3 "At work"), or a special guest
//   TradingCardBack  a face-down customer: only the fruit it wants, nothing else
//   StallSign        a shopkeeper (Art 2 "Over the counter")
//   Gazette          an event (Art 1 "The scene")
// Every size is in em: set --card-w on the card or a parent and the whole card scales (63 x 88 proportions).
// Every card of a kind has the same fixed zones (picture, name banner, text boxes), whatever its text: cards.css.
// Names come from the game data (lookOf, RIVALS), never from the art. Styles: cards.css.
import type { ComponentChildren, FunctionComponent } from 'preact';
import { isValidElement } from 'preact';
import {
  CHARACTER_TRAIT, CUSTOMER_CARDS, EVENT_CARDS, FRUIT, PREF_INFO, RIVALS, TRAITS, lookOf, prefOf,
  type EventCard, type FruitId, type Want,
} from '../engine/data';
import { customerArt, eventArt, guestArt, shopBadge, shopScene } from './deckArt';
import { FruitSvg } from './fruitIcons';
import { GAZETTE } from './gazette';

/** Pixel sizes of the art files in public/art (for width and height, so nothing jumps while loading). */
export const ART_SIZE = {
  customer: [400, 383],
  event: [520, 391],
  scene: [600, 450],
  badge: [181, 181],
} as const;

const two = (n: number) => String(n).padStart(2, '0');
const cx = (...parts: (string | false | undefined)[]) => parts.filter(Boolean).join(' ');

/** A card picture. Missing art shows a plain "Art coming" panel, never another character's picture. */
export function CardArt({ src, alt, w, h, class: cls, eager }: {
  src: string | null; alt: string; w: number; h: number; class?: string;
  /** Load straight away (for a card that is on screen from the start). Default: lazy. */
  eager?: boolean;
}) {
  if (!src) {
    return <div class={cx('x-art', 'x-art-missing', cls)} role="img" aria-label={alt ? `${alt}: art coming` : 'Art coming'}>Art coming</div>;
  }
  return <img class={cx('x-art', cls)} src={src} width={w} height={h} alt={alt} decoding="async" loading={eager ? 'eager' : 'lazy'} draggable={false} />;
}

/** A customer's number in the deck (1 to 36), or undefined for guests and anyone else. */
export function customerNumber(key: string): number | undefined {
  const i = CUSTOMER_CARDS.findIndex((c) => c.name === key);
  return i >= 0 ? i + 1 : undefined;
}

const fruitWord = (w: Want) => (w.qty === 1 ? FRUIT[w.fruit].name : FRUIT[w.fruit].plural);

/** A quirk longer than this is set a little smaller, so every quirk fits the same two-line box. */
export const QUIRK_LONG = 46;
/** The longest quirk the two-line box was checked for (at the smaller size). */
export const QUIRK_MAX = 60;

/**
 * A customer's Trading Card. `who` is the hidden code key; the name shown is lookOf(who).title.
 * `wants` are the prices to print (pass the day's prices if the screen shows those).
 * `compact` (the table): picture, name banner and order only. `guest`: a special guest (event customer).
 */
export function TradingCard({ who, wants, n, compact, guest, eager, class: cls }: {
  who: string; wants: Want[]; n?: number; compact?: boolean; guest?: boolean; eager?: boolean; class?: string;
}) {
  const look = lookOf(who);
  const pref = prefOf(who);
  const num = guest ? undefined : n ?? customerNumber(who);
  const [w, h] = ART_SIZE[guest ? 'event' : 'customer'];
  return (
    <article class={cx('x-card', 'x-tc', compact && 'x-compact', guest && 'x-tc--guest', cls)}>
      <div class="x-tc-pic">
        <CardArt src={guest ? guestArt(who) : customerArt(who)} alt={look.title} w={w} h={h} eager={eager} />
        {!compact && num !== undefined && <b class="x-tc-num">{two(num)}</b>}
        {!compact && <span class={`x-tc-flag x-flag-${guest ? 'guest' : pref}`}>{guest ? 'Special guest' : `${PREF_INFO[pref].title} shopper`}</span>}
        <strong class={cx('x-tc-name', look.title.length > 14 && 'x-long')}>{look.title}</strong>
      </div>
      {!compact && <p class={cx('x-tc-quirk', look.quirk.length > QUIRK_LONG && 'x-long')}>{look.quirk}</p>}
      <ul class={`x-tc-order x-n${wants.length}`}>
        {wants.map((x, i) => (
          <li key={`${x.fruit}${i}`}>
            <FruitSvg id={x.fruit} size={24} alt={compact ? FRUIT[x.fruit].name : ''} />
            <span>{compact ? `${x.qty} ×` : `${x.qty} × ${fruitWord(x)}`}</span>
            <b>{`$${x.max}`}</b>
          </li>
        ))}
      </ul>
      {!compact && <p class="x-tc-buys">{`Buys: ${PREF_INFO[pref].short}`}</p>}
    </article>
  );
}

/**
 * The back of a customer card, for a face-down walk-in. One design for every customer: it shows only the fruit
 * passed in (in the card's own order). It takes no name on purpose, so it cannot show a name, type, number,
 * price or picture, and no portrait is loaded until the card is turned face up.
 */
export function TradingCardBack({ fruits, compact, class: cls }: { fruits: FruitId[]; compact?: boolean; class?: string }) {
  const wanted = fruits.map((f) => FRUIT[f].name.toLowerCase()).join(', ');
  return (
    <article class={cx('x-card', 'x-tb', compact && 'x-compact', cls)} role="img"
      aria-label={`A customer, face down${fruits.length ? `. Wants ${wanted}` : ''}`}>
      <div class="x-tb-label">
        <b class="x-tb-brand">Fruit Market</b>
        <span class="x-tb-kind">Customer</span>
        <div class="x-tb-fruit">{fruits.map((f, i) => <FruitSvg key={`${f}${i}`} id={f} size={24} alt="" />)}</div>
      </div>
    </article>
  );
}

const possessive = (name: string) => (name.endsWith('s') ? `${name}’` : `${name}’s`);

/**
 * A shopkeeper's Stall Sign, by avatar key. `selected`: picked by this player. `takenBy`: the name of the shop
 * that already took this character (shown as a stamp). `compact`: header, scene and the perk's title only.
 */
export function StallSign({ avatar, compact, selected, takenBy, eager, class: cls }: {
  avatar: string; compact?: boolean; selected?: boolean; takenBy?: string; eager?: boolean; class?: string;
}) {
  const r = RIVALS.find((x) => x.avatar === avatar);
  const name = r?.name ?? 'Shopkeeper';
  const traitId = CHARACTER_TRAIT[avatar];
  const trait = traitId ? TRAITS[traitId] : undefined;
  const sign = possessive(name);
  const [sw, sh] = ART_SIZE.scene;
  const [bw, bh] = ART_SIZE.badge;
  return (
    <article class={cx('x-card', 'x-ss', compact && 'x-compact', selected && 'is-selected', takenBy && 'is-taken', cls)}>
      <header class="x-ss-head">
        <CardArt class="x-ss-badge" src={shopBadge(avatar)} alt="" w={bw} h={bh} eager={eager} />
        <strong class={cx('x-ss-name', sign.length > 8 && 'x-long')}>{sign}</strong>
        {!compact && <small class="x-ss-tag">Fresh fruit · Fair prices</small>}
      </header>
      <div class="x-ss-scene"><CardArt src={shopScene(avatar)} alt={name} w={sw} h={sh} eager={eager} /></div>
      {takenBy && <span class="x-ss-taken">{`Taken by ${takenBy}`}</span>}
      {trait && (
        <div class="x-ss-chalk">
          <b>{`Today’s special: ${trait.title}`}</b>
          {!compact && <p>{trait.text}</p>}
          {!compact && r && <i>{r.quip}</i>}
        </div>
      )}
    </article>
  );
}

/** The one shared back of every event card (print kit and the morning flip in the game). */
export function EventBack({ class: cls }: { class?: string }) {
  return (
    <article class={cx('x-card', 'x-gz', 'x-gzb', cls)} role="img" aria-label="Event card back">
      <header class="x-gz-mast">Fruit Market</header>
      <div class="x-gz-ed"><span>Morning edition · One cent</span><span>Event card</span></div>
      <strong class="x-gz-head">Today’s news</strong>
      <p class="x-gz-sub">Turned over each morning, never before</p>
      <div class="x-gzb-mid"><b class="x-gz-seal">Extra!</b></div>
      <p class="x-gzb-foot">Event · one each morning from Day 2</p>
    </article>
  );
}

/** An event's front page, in the Fruit Market newspaper. `n` is the edition number (default: its place in the event deck, 1 to 13).
 *  The story is the event text from data.ts; `compact`: masthead, headline, picture and the effects box only. */
export function Gazette({ event, n, compact, eager, class: cls }: { event: EventCard; n?: number; compact?: boolean; eager?: boolean; class?: string }) {
  const g = GAZETTE[event.id];
  const num = n ?? EVENT_CARDS.findIndex((e) => e.id === event.id) + 1;
  const [w, h] = ART_SIZE.event;
  return (
    <article class={cx('x-card', 'x-gz', `x-ev-${event.id}`, compact && 'x-compact', cls)}>
      <header class="x-gz-mast">Fruit Market</header>
      {!compact && <div class="x-gz-ed"><span>Morning edition · One cent</span><span>{`No. ${two(num)}`}</span></div>}
      <div class="x-gz-top">
        <b class="x-gz-seal" aria-hidden="true">Extra!</b>
        <strong class="x-gz-head">{event.title}</strong>
        {!compact && <p class="x-gz-sub">{g.subhead}</p>}
      </div>
      <figure class="x-gz-pic">
        <CardArt src={eventArt(event.id)} alt={event.title} w={w} h={h} eager={eager} />
        {!compact && <figcaption>{g.caption}</figcaption>}
      </figure>
      <div class="x-gz-body">
        <ul class={`x-gz-fx x-n${g.effects.length}`}>{g.effects.map((e) => <li key={e}>{e}</li>)}</ul>
        {!compact && <p class="x-gz-text">{event.flavour && <b class="x-gz-flavour">{`${event.flavour} `}</b>}{event.text}</p>}
      </div>
    </article>
  );
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
