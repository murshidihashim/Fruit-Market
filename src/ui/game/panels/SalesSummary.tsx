// The day's takings (PLAN-085; the approved board: docs/studio/review-18/mockups, Takings): the sheet laid on the
// table after the rush, from the customer band down to your shelf, with the main button under it (ActionBar.tsx).
// On it, top to bottom: "The rush is over" with today's customers as small portraits; the ledger (what you sold and
// bought and every other line the game works out, then "Up today"); every stall's day and cash in order, your row
// marked; a favour card won today; what tonight does to the fruit left on your shelf.
// Everything shown is public once the rush is over (the day's results and every stall's cash) or this stall's own:
// nothing is read from a rival's shelf. Styles: takings.css.
import type { Ref } from 'preact';
import { useRef } from 'preact/hooks';
import { FAVOURS, FRUIT, ORDER_LEAD, TRAITS, lookOf, stageAt, type FruitId, type Stage } from '../../../engine/data';
import { count, places, ranking, servingCustomers, shelfSize, type GameState } from '../../../engine/game';
import { dayLedger, standing, tonightLine, withJamPaid } from '../../../engine/story';
import { Face, Fruit } from '../../art';
import { LANES, spoilsTonight } from '../../boardModel';
import { ART_SIZE, CardArt } from '../../cards';
import { GUEST_EVENT, customerArt, customerFocus, favourArt, favourFocus, guestArt, guestFocus } from '../../deckArt';
import { Lamp, STAGE_WORD } from '../../ticket';
import { useReach } from '../reach';
import { nightSteps, tonightWord } from '../tonight';

/** Money outside the customer lines: the Pasar Malam hawker, Sharp Ears and Tip Jar tips (in the sales total), and
 *  (rules 18) what became of a standing order's stake (outside the sales total, under "Other"). */
export function extras(r: NonNullable<GameState['results']>, viewer: number): string[] {
  const out: string[] = [];
  const hawk = (r.hawker ?? []).filter((x) => x.player === viewer);
  if (hawk.length) out.push(`The night hawker bought ${hawk.length} of your leftover fruit (+$${hawk.reduce((a, x) => a + x.price, 0)}).`);
  const tips = (r.earful ?? []).filter((x) => x.player === viewer);
  if (tips.length) out.push(`Sharp Ears: ${tips.length} walk-in${tips.length === 1 ? '' : 's'} you had seen tipped you $${tips.reduce((a, x) => a + x.tip, 0)}.`);
  const jar = (r.tipJar ?? []).filter((x) => x.player === viewer);
  if (jar.length) out.push(`Tip Jar: ${jar.length} customer${jar.length === 1 ? '' : 's'} left with their whole order and tipped you $${jar.reduce((a, x) => a + x.tip, 0)}.`);
  if (r.order && r.order.holder === viewer) {
    const o = r.order;
    out.push(o.short === 0
      ? `Standing order: you delivered all ${o.qty}${o.stake ? ` and got your $${o.stake} stake back` : ''}.`
      : `Standing order: you delivered ${o.qty - o.short} of ${o.qty}${o.stake ? ` and lost your $${o.stake} stake` : ''}.`);
  }
  return out;
}

const sum = (xs: number[]) => xs.reduce((a, b) => a + b, 0);
const pieces = (n: number) => `${n} piece${n === 1 ? '' : 's'}`;

/** One line of the day's ledger. */
export interface TakingsRow {
  key: 'sold' | 'order' | 'stake' | 'ears' | 'jar' | 'hawker' | 'jam' | 'bought' | 'staked' | 'other';
  label: string;
  /** Dollars in (above 0) or out (below 0). Null: a line with no money in it today (a stake that did not come back). */
  amount: number | null;
  /** The "sold" line: the pieces sold in the rush, a fruit for each, in the board's lane order. */
  fruits?: FruitId[];
}

/**
 * The viewer's day, a line for each kind of money the game worked out. The game keeps one sales total (story.ts
 * dayLedger), which holds the rush, a standing order's pay, tips and the night hawker; here each has its own line,
 * and "sold" is what is left of the total, so the lines always add up to the day's change in cash ("Up today").
 * Money in first, then money out. A day's change that no line explains stays under "Other", as before.
 */
export function takingsRows(s: GameState, viewer: number): TakingsRow[] {
  const r = s.results;
  if (!r) return [];
  const l = dayLedger(s, viewer);
  const mine = <T extends { player: number }>(xs: T[] | undefined) => (xs ?? []).filter((x) => x.player === viewer);
  // A standing order collected from this stall today: its pay is in the sales total, its stake is not.
  const o = r.order && r.order.holder === viewer ? r.order : null;
  const orderPay = o ? sum(mine(o.sales).map((x) => x.n * x.price)) : 0;
  const ears = mine(r.earful), jar = mine(r.tipJar), hawk = mine(r.hawker);
  const earTips = sum(ears.map((x) => x.tip)), jarTips = sum(jar.map((x) => x.tip)), hawkPay = sum(hawk.map((x) => x.price));
  // The pieces sold to customers and guests in the rush (the order's pieces are on its own line).
  const fruits = LANES.flatMap((f) => {
    const n = sum(r.lines.filter((x) => x.fruit === f && !(o && x.name === o.name)).map((x) => x.offers.find((y) => y.player === viewer)?.sold ?? 0));
    return Array.from({ length: n }, () => f);
  });
  // A stake this stall put down this morning for an order it won (held on the card until the order's day).
  const st = s.standing;
  const put = st && st.holder === viewer && st.due === s.day + ORDER_LEAD ? st.staked ?? 0 : 0;
  // What is left of "Other" once the stake that came back and the stake put down have their own lines.
  const rest = l.net === null ? 0 : l.other - (o?.back ?? 0) + put;
  const bought = s.players[viewer].boughtToday;

  const rows: TakingsRow[] = [{ key: 'sold', label: fruits.length ? `Sold ${pieces(fruits.length)}` : 'Nothing sold', amount: l.sales - orderPay - earTips - jarTips - hawkPay, fruits }];
  if (o) rows.push({ key: 'order', label: `Standing order · ${o.qty - o.short} of ${o.qty} delivered`, amount: orderPay });
  if (o && o.stake > 0) rows.push(o.back > 0 ? { key: 'stake', label: 'Stake back', amount: o.back } : { key: 'stake', label: `Stake of $${o.stake} lost`, amount: null });
  if (ears.length) rows.push({ key: 'ears', label: `${TRAITS.earful.title} tip`, amount: earTips });
  if (jar.length) rows.push({ key: 'jar', label: `${TRAITS.favourite.title} tip${jar.length === 1 ? '' : 's'}`, amount: jarTips });
  if (hawk.length) rows.push({ key: 'hawker', label: `Night hawker · ${pieces(hawk.length)}`, amount: hawkPay });
  if (l.jam > 0) rows.push({ key: 'jam', label: l.jamTonight ? 'Jam maker tonight' : 'Jam maker', amount: l.jam });
  if (l.bought > 0) rows.push({ key: 'bought', label: bought > 0 ? `Bought ${pieces(bought)} this morning` : 'Bought fruit this morning', amount: -l.bought });
  if (put > 0) rows.push({ key: 'staked', label: 'Stake on a standing order', amount: -put });
  if (rest !== 0) rows.push({ key: 'other', label: 'Other', amount: rest });
  return rows;
}

/** One stall on the list: its place, what the day changed and its cash. */
export interface StallRow { p: number; place: number; name: string; avatar: string; today: number | null; cash: number; me: boolean }

/**
 * Every stall after today, first to last (stalls level on cash and fruit sold share a place). `today` is the day's
 * change in cash, and the cash is as it will stand once the jam maker has paid on the final day, so the list agrees
 * with the line under it (story.ts standing) and with "Up today". An older save without the day's starting cash
 * shows the day's sales instead.
 */
export function stallRows(s: GameState, viewer: number): StallRow[] {
  const after = withJamPaid(s);
  const place = places(after);
  return ranking(after).map((p) => {
    const pl = after.players[p];
    return { p, place: place[p], name: pl.name, avatar: pl.avatar, today: dayLedger(s, p).net ?? s.results?.income[p] ?? null, cash: pl.cash, me: p === viewer };
  });
}

/** Today's customers in the order they were served, and whether each bought anything (the portraits on the strip). */
export function rushOver(s: GameState): { id: number; name: string; guest: boolean; served: boolean }[] {
  const r = s.results;
  if (!r) return [];
  return servingCustomers(s).flatMap((c) => {
    const lines = r.lines.filter((l) => l.customerId === c.id);
    if (!lines.length) return [];
    return [{ id: c.id, name: c.name, guest: !c.order && !!GUEST_EVENT[c.name], served: lines.some((l) => l.offers.some((o) => o.sold > 0)) }];
  });
}

/** The pieces of one fruit and one freshness on a shelf, and what tonight does to them. */
export interface ShelfChip {
  fruit: FruitId; stage: Stage; n: number;
  /** Their freshness tomorrow. Null: they leave the shelf tonight (spoiled, or juiced by a Juice Bar). */
  next: Stage | null;
  /** What tonight does to them, in the words the stocking rows use (tonight.ts): "ripe tomorrow", "spoils tonight". */
  text: string;
  /** They are lost tonight. */
  bad: boolean;
}

/**
 * What tonight does to each piece on shop `p`'s shelf, by the night's own steps (tonight.ts nightSteps, which the
 * stocking rows read too): every piece moves one box older, two in a Heatwave, none in a Monsoon, and none for the
 * fruit under a Shade Cloth. One chip for each fruit, freshness and outcome, in the board's lane order, the freshest
 * first. Nothing on the final day, which no night follows. tests/takings.test.ts holds this against leavingTonight,
 * the engine's own count, and against the next morning's shelf.
 */
export function shelfTonight(s: GameState, p: number): ShelfChip[] {
  const pl = s.players[p];
  if (!pl || s.phase === 'over' || s.day >= s.config.days) return [];
  const out: ShelfChip[] = [];
  for (const f of LANES) {
    const by = nightSteps(s, p, f);
    for (let pos = pl.stock[f].length - 1; pos >= 0; pos--) {
      const n = pl.stock[f][pos];
      if (n <= 0) continue;
      const chip: ShelfChip = { fruit: f, stage: stageAt(f, pos), n, next: pos - by < 0 ? null : stageAt(f, pos - by), ...tonightWord(s, p, f, pos) };
      const same = out.find((c) => c.fruit === f && c.stage === chip.stage && c.next === chip.next);
      if (same) same.n += n;
      else out.push(chip);
    }
  }
  return out;
}

const money = (n: number) => `${n > 0 ? '+' : n < 0 ? '−' : ''}$${Math.abs(n)}`;

/** How many steps closer the takings may be drawn when they would otherwise need a scroll (takings.css, data-tight). */
export const TIGHTEST = 4;
/** What the steps need of the sheet (a page element; a stand-in in tests). */
export interface Fitting { dataset: DOMStringMap; readonly scrollHeight: number; readonly clientHeight: number }
/**
 * When the takings are taller than their sheet (a short phone, six stalls, a day with many lines) they are drawn
 * closer, a step at a time, before anything scrolls: the spacing, then smaller rows, then without the customers'
 * strip, then the stalls as plain lines. The step is written on the sheet itself; the card is not drawn again for it.
 */
export function closer(el: Fitting): void {
  let step = Number(el.dataset.tight ?? 0);
  while (step < TIGHTEST && el.scrollHeight > el.clientHeight + 1) {
    step += 1;
    el.dataset.tight = String(step);
  }
}
/** A sheet that slides onto the table is clear as glass on its first frame (sheet.ts), so the steps are taken before
 *  the next one is drawn: two short pauses in place of one long one (as the morning's sheet, MorningCard.tsx). */
function closerOnceSeen(el: HTMLElement): void {
  if (getComputedStyle(el).opacity !== '0') { closer(el); return; }
  requestAnimationFrame(() => { if (el.isConnected) closer(el); });
}

/**
 * The takings on the table. The day's sheet (DaySheet.tsx) mounts them over itself once the last customer's card has
 * gone, and takes them away on "Close for the day"; the sheet under them is the panel that slides (sheet.ts). The
 * takings reach from the top of the customer band down over your shelf, measured from the rows themselves (reach.ts).
 */
export function SalesSummary({ s, viewer }: { s: GameState; viewer: number }) {
  const root = useRef<HTMLDivElement>(null);
  useReach(root, 'street', true, true, closerOnceSeen);
  return <TakingsView s={s} viewer={viewer} root={root} />;
}

/** The takings themselves, without hooks (so tests can render them to a string). */
export function TakingsView({ s, viewer, root }: { s: GameState; viewer: number; root?: Ref<HTMLDivElement> }) {
  const r = s.results!;
  const pl = s.players[viewer];
  const rem = s.config.days - s.day;
  const rows = takingsRows(s, viewer);
  const { net } = dayLedger(s, viewer);
  const crowd = rushOver(s);
  const stalls = stallRows(s, viewer);
  const st = standing(withJamPaid(s), viewer);
  const won = r.favours.filter((x) => x.player === viewer);
  // What tonight does to the shelf: fruit that spoils, and fruit a Juice Bar turns into juice. Nothing on the final
  // day, when no night follows.
  const tonight = s.phase === 'reveal' ? tonightLine(s, viewer) : null;
  const spoil = tonight ? spoilsTonight(s, viewer) : 0;
  const chips = s.phase === 'reveal' ? shelfTonight(s, viewer) : [];
  const nightEvent = s.event?.ageExtra ? s.event.title : null;
  return (
    <div class="sales-card" ref={root}>
      {crowd.length > 0 && (
        <div class="tg-strip">
          <b class="tk-label"><span>The rush is over</span> · <span>{crowd.filter((x) => x.served).length} of {crowd.length} served</span></b>
          <span class={`tg-queue ${crowd.length > 5 ? 'many' : ''}`} aria-hidden="true">
            {crowd.map((x) => (
              <i class={`tg-face ${x.served ? '' : 'no'}`}>
                <CardArt src={x.guest ? guestArt(x.name) : customerArt(x.name)} alt="" w={ART_SIZE.customer[0]} h={ART_SIZE.customer[1]} eager
                  focus={x.guest ? guestFocus(x.name) : customerFocus(x.name)} />
              </i>
            ))}
          </span>
        </div>
      )}
      <div class="tg-led">
        <div class="tg-hd"><span>Day {s.day} · your takings</span><b>{rem === 0 ? 'MARKET CLOSED' : `${rem} day${rem > 1 ? 's' : ''} to go`}</b></div>
        <div class="tg-rows ledger" aria-label="Day ledger">
          {rows.map((x) => (
            <div class={`tg-row tg-${x.key}`}>
              {x.label} {x.fruits && x.fruits.length > 0 && <TakingsFruits fruits={x.fruits} />}
              {x.amount !== null && <b class={x.amount > 0 ? 'good' : x.amount < 0 ? 'bad' : 'flat'}>{money(x.amount)}</b>}
            </div>
          ))}
        </div>
        {net !== null && <div class="tg-net">{net > 0 ? 'Up today' : net < 0 ? 'Down today' : 'Even today'} <b class={net > 0 ? 'good' : net < 0 ? 'bad' : 'flat'}>{money(net)}</b></div>}
      </div>
      <div class="tg-stalls">
        <div class="tg-lab"><b class="tk-label">The stalls after day {s.day}</b><span>Cash</span></div>
        <ol class="tg-list">
          {stalls.map((x) => (
            <li class={`tg-stall ${x.me ? 'me' : ''}`}>
              <i class="tg-pl">{x.place}</i>
              <Face who={x.avatar} size={26} />
              <span class="tg-name">{x.name}</span>
              {x.today !== null && <span class="tg-td">{x.today < 0 ? '−' : '+'}${Math.abs(x.today)} today</span>}
              <b class="tg-cash">${x.cash}</b>
            </li>
          ))}
        </ol>
        {s.players.length > 1 && <div class={`tg-rank r${st.rank}`}>{st.text}</div>}
      </div>
      {won.map((x) => (
        <div class="tg-won">
          <b class="tg-tag">Favour won</b>
          <CardArt src={favourArt(x.favour)} alt="" w={ART_SIZE.small[0]} h={ART_SIZE.small[1]} eager focus={favourFocus(x.favour)} />
          <span>{FAVOURS[x.favour].title}. You alone filled {lookOf(x.customer).title}'s whole order.</span>
        </div>
      ))}
      {(chips.length > 0 || tonight) && (
        <div class="tg-shelf">
          <div class="tg-lab"><b class="tk-label">Your shelf · {count(pl.stock)} of {shelfSize(pl)}</b><span>After tonight{nightEvent ? `'s ${nightEvent}` : ''}</span></div>
          <div class="tg-chips">
            {chips.map((c) => (
              <span class={`tg-chip st-${c.stage} ${c.bad ? 'bad' : ''}`} role="img"
                aria-label={`${c.n} ${STAGE_WORD[c.stage]} ${(c.n === 1 ? FRUIT[c.fruit].name : FRUIT[c.fruit].plural).toLowerCase()}: ${c.text}`}>
                <Fruit id={c.fruit} size={14} stage={c.stage} /><Lamp stage={c.stage} on={false} size={14} />{c.n > 1 && <b>×{c.n}</b>}{c.text}
              </span>
            ))}
          </div>
          {tonight && <div class={spoil > 0 ? 'sc-waste' : 'sc-juice'}>{tonight}</div>}
        </div>
      )}
    </div>
  );
}

/** At most this many pieces are drawn one by one on the "sold" line; more are drawn as a fruit and a number each. */
const MAX_ICONS = 5;

/** The pieces sold: a fruit for each, or a fruit and "×3" when there are many. */
function TakingsFruits({ fruits }: { fruits: FruitId[] }) {
  const said = LANES.filter((f) => fruits.includes(f)).map((f) => { const n = fruits.filter((x) => x === f).length; return `${n} ${(n === 1 ? FRUIT[f].name : FRUIT[f].plural).toLowerCase()}`; }).join(', ');
  return (
    <span class="tg-ic" role="img" aria-label={said}>
      {fruits.length <= MAX_ICONS
        ? fruits.map((f) => <Fruit id={f} size={16} />)
        : LANES.filter((f) => fruits.includes(f)).map((f) => <span><Fruit id={f} size={16} />×{fruits.filter((x) => x === f).length}</span>)}
    </span>
  );
}
