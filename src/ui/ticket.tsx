// Market Ticket pieces shared by the game screen (PLAN-072): the freshness letters, the stall patterns and the
// customer ticket. They are the printed game's own marks (the board's F, O, S, G boxes, the six stall-sheet patterns,
// the customer card's rows), so the phone and the table read the same way. Drawing only: nothing here changes a rule.
import { FRUIT, PREF_INFO, lookOf, prefOf, type FruitId, type Stage } from '../engine/data';
import { partsOf, type LookSet } from '../net/looks';
import { Face, Fruit } from './art';
import { LANES } from './boardModel';
import { OKAY_LESS, SOFT_LESS, byLane, customerNumber, laneClass } from './cards';
import { GUEST_EVENT, customerArt, customerFocus, focusCss, guestArt, guestFocus } from './deckArt';

/** The letters printed on the board's boxes. */
export const STAGE_LETTER: Record<Stage, string> = { unripe: 'G', fresh: 'F', okay: 'O', notso: 'S' };
export const STAGE_WORD: Record<Stage, string> = { unripe: 'green', fresh: 'fresh', okay: 'okay', notso: 'soft' };

/** A freshness letter in a round lamp: filled when it applies, hollow when it does not. */
export function Lamp({ stage, on = true, size = 16 }: { stage: Stage; on?: boolean; size?: number }) {
  return <i class={`tk-lamp ${on ? 'on' : ''}`} style={`--s:${size}px`} aria-hidden="true">{STAGE_LETTER[stage]}</i>;
}

/** The six stall-sheet patterns of the printed game, one per seat. */
export const PATTERNS = ['stripes', 'dots', 'checks', 'zigzag', 'bars', 'diamonds'] as const;
export const seatPattern = (p: number) => PATTERNS[((p % PATTERNS.length) + PATTERNS.length) % PATTERNS.length];

/** A stall's mark: its sheet pattern with the shopkeeper's face on it. */
export function Swatch({ p, who, look, size = 30 }: { p: number; who?: string; look?: LookSet; size?: number }) {
  return (
    <span class={`tk-swatch pat-${seatPattern(p)}`} style={`--s:${size}px`} aria-hidden="true">
      {who && <Face who={who} size={Math.round(size * 0.74)} worn={look ? partsOf(look) : undefined} />}
    </span>
  );
}

export interface TicketLine { fruit: FruitId; qty: number; max: number; done?: boolean; move?: 'up' | 'down' }

const two = (n: number) => String(n).padStart(2, '0');
const cx = (...parts: (string | false | undefined)[]) => parts.filter(Boolean).join(' ');

/**
 * A ticket shows a dot for each piece when its rows have room for them, and a number ("×3") when they do not: a row
 * of five tickets on a phone is too narrow for three dots and a price. These are the narrowest tickets, measured inside
 * the border in px, whose rows hold the dots: `roomy` with the spacing of the approved ticket, `tight` with the closer
 * spacing of a narrow one. The stylesheet compares them with the ticket's real width (cards.css, --nr and --nt).
 */
export function dotsNeed(lines: { qty: number; max: number; done?: boolean }[]): { roomy: number; tight: number } {
  // A price is a dollar sign and its figures, each two thirds of an em wide; a bought row ends with a tick.
  const chars = (x: { max: number }) => String(x.max).length + 1;
  const tick = (x: { done?: boolean }) => (x.done ? 11 : 0);
  const roomy = Math.max(0, ...lines.map((x) => 4 + 14 + 3 + x.qty * 9 + (x.qty - 1) * 3 + 3 + chars(x) * 8 + tick(x) + 4));
  const tight = Math.max(0, ...lines.map((x) => 3 + 13 + 2 + x.qty * 8 + (x.qty - 1) * 2 + 2 + chars(x) * 7.34 + tick(x) + 3));
  return { roomy: Math.ceil(roomy), tight: Math.ceil(tight) };
}

/**
 * A customer as a ticket in the row (the approved phone screens): the number and name on a black heading, the picture,
 * one row per fruit in the board's lane order (a dot for each piece, and the most they pay for a fresh piece today),
 * and the legend: which freshness they buy. `order`: a standing order collected today, which stands in the row like a
 * customer; it takes Fresh or Okay pieces at its own price, so its legend is not a price key.
 */
export function Ticket({ who, lines, class: cls, order }: { who: string; lines: TicketLine[]; class?: string; order?: boolean }) {
  const look = lookOf(who);
  const guest = !!GUEST_EVENT[who];
  const num = guest ? undefined : customerNumber(who);
  const src = guest ? guestArt(who) : customerArt(who);
  const pref = prefOf(who);
  const rows = byLane(lines);
  const need = dotsNeed(rows);
  return (
    <article class={cx('tkc', 'tk-cust', guest && 'guest', cls)} style={{ '--nr': need.roomy, '--nt': need.tight }}>
      <header class="tkc-hd">{num !== undefined && <b>{`${two(num)} `}</b>}{look.title}</header>
      <div class="tkc-pc">
        {src && <img src={src} alt="" decoding="async" draggable={false} style={{ objectPosition: focusCss(guest ? guestFocus(who) : customerFocus(who)) }} />}
      </div>
      {rows.map((x) => (
        <div class={cx('tkc-rw', laneClass(x.fruit), x.done && 'done', x.move)}>
          <Fruit id={x.fruit} size={14} />
          <span class="tkc-q" role="img" aria-label={`${x.qty} ${x.qty === 1 ? FRUIT[x.fruit].name : FRUIT[x.fruit].plural}`}>
            <span class="tkc-dots">{Array.from({ length: x.qty }, () => <i />)}</span>
            <em class="tkc-n">×{x.qty}</em>
          </span>
          <b>${x.max}</b>
        </div>
      ))}
      <footer class="tkc-bd" role="img" aria-label={order ? 'Takes Fresh or Okay fruit at its price' : `${PREF_INFO[pref].title}: ${PREF_INFO[pref].text} Okay fruit pays $${OKAY_LESS} less, soft fruit $${SOFT_LESS} less.`}>
        <i class="tkc-lamp">F</i>
        <i class={cx('tkc-lamp', pref === 'premium' && 'off')}>O</i>
        <i class={cx('tkc-lamp', pref !== 'bargain' && 'off')}>S</i>
      </footer>
    </article>
  );
}

/**
 * A face-down walk-in: four fixed squares, one per fruit in the board's lane order, filled for each fruit the card
 * wants. It takes no name on purpose, so it cannot show a name, type, number, amount, price or picture.
 */
export function TicketBack({ fruits, label }: { fruits: FruitId[]; label: string }) {
  const wanted = LANES.filter((f) => fruits.includes(f));
  return (
    <article class="tkc tk-cust back" role="img" aria-label={`A customer, face down${wanted.length ? `. Wants ${wanted.map((f) => FRUIT[f].name.toLowerCase()).join(', ')}` : ''}`}>
      <header class="tkc-hd">{label}<br />wants</header>
      <div class="tkc-dn">{LANES.map((f) => <span class={wanted.includes(f) ? 'on' : ''}>{wanted.includes(f) && <Fruit id={f} size={17} />}</span>)}</div>
    </article>
  );
}
