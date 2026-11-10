// Market Ticket pieces shared by the game screen (PLAN-072): the freshness letters, the stall patterns and the
// customer ticket. They are the printed game's own marks (the board's F, O, S, G boxes, the six stall-sheet patterns,
// the customer card's rows), so the phone and the table read the same way. Drawing only: nothing here changes a rule.
import { FRUIT, PREF_INFO, lookOf, prefOf, type FruitId, type Pref, type Stage } from '../engine/data';
import { partsOf, type LookSet } from '../net/looks';
import { Face, Fruit } from './art';
import { customerNumber } from './cards';
import { GUEST_EVENT, customerArt, guestArt } from './deckArt';

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

/** Which freshness a customer type buys, as the three lamps on a customer card. */
const BUYS: Record<Pref, Stage[]> = { premium: ['fresh'], everyday: ['fresh', 'okay'], bargain: ['fresh', 'okay', 'notso'] };
export function PrefLamps({ pref, size = 15 }: { pref: Pref; size?: number }) {
  return (
    <span class="tk-lamps" role="img" aria-label={`${PREF_INFO[pref].title}: ${PREF_INFO[pref].text}`}>
      {(['fresh', 'okay', 'notso'] as Stage[]).map((st) => <Lamp stage={st} on={BUYS[pref].includes(st)} size={size} />)}
    </span>
  );
}

export interface TicketLine { fruit: FruitId; qty: number; max: number; done?: boolean; move?: 'up' | 'down' }

const two = (n: number) => String(n).padStart(2, '0');

/**
 * A customer as a ticket: number and name on a black band, the character's portrait, one row per fruit (how many,
 * and the most they pay for a fresh piece today), and the freshness they buy.
 */
export function Ticket({ who, lines, class: cls, quirk }: { who: string; lines: TicketLine[]; class?: string;
  /** The large ticket (a customer's own pop-up) also prints the character's line. */
  quirk?: boolean }) {
  const look = lookOf(who);
  const guest = !!GUEST_EVENT[who];
  const num = guest ? undefined : customerNumber(who);
  const src = guest ? guestArt(who) : customerArt(who);
  return (
    <article class={`tk-cust ${guest ? 'guest' : ''} ${cls ?? ''}`}>
      <header class="tk-cust-head"><span>{look.title}</span></header>
      <div class="tk-cust-pic">{src && <img src={src} alt="" decoding="async" draggable={false} />}<b class="tk-cust-no">{num !== undefined ? two(num) : 'Guest'}</b></div>
      <ul class="tk-cust-rows">
        {lines.map((x) => (
          <li class={`f-${x.fruit} ${x.done ? 'done' : ''} ${x.move ?? ''}`}>
            <Fruit id={x.fruit} size={16} />
            <span class="q" aria-label={`${x.qty} ${x.qty === 1 ? FRUIT[x.fruit].name : FRUIT[x.fruit].plural}`}>×{x.qty}</span>
            <b>${x.max}</b>
          </li>
        ))}
      </ul>
      {quirk && <p class="tk-cust-quirk">{look.quirk}</p>}
      <footer class="tk-cust-foot"><PrefLamps pref={prefOf(who)} size={quirk ? 20 : 15} />{quirk && <span>{PREF_INFO[prefOf(who)].title} · buys {PREF_INFO[prefOf(who)].short.toLowerCase()}</span>}</footer>
    </article>
  );
}

/**
 * A face-down walk-in: only the fruit printed on the card's back. It takes no name on purpose, so it cannot show a
 * name, type, number, price or picture.
 */
export function TicketBack({ fruits, label }: { fruits: FruitId[]; label: string }) {
  return (
    <article class="tk-cust back" role="img" aria-label={`A customer, face down${fruits.length ? `. Wants ${fruits.map((f) => FRUIT[f].name.toLowerCase()).join(', ')}` : ''}`}>
      <header class="tk-cust-head"><span>{label}</span></header>
      <div class="tk-cust-back">{fruits.map((f) => <span><Fruit id={f} size={22} /></span>)}</div>
    </article>
  );
}
