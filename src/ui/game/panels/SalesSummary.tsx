// The day's takings (PLAN-085; the approved board: docs/studio/review-18/mockups, Takings): the sheet laid on the
// table after the rush, from the customer band down to your shelf, with the main button under it (ActionBar.tsx).
// On it, top to bottom: "The rush is over" with today's customers as small portraits; the ledger (what you sold and
// bought and every other line the game works out, then "Up today"); every stall's day and cash in order, your row
// marked; a favour card won today; what tonight does to the fruit left on your shelf.
// Everything shown is public once the rush is over (the day's results and every stall's cash) or this stall's own:
// nothing is read from a rival's shelf. Styles: takings.css.
// PLAN-128: a tap on any stall's row (yours or a rival's) opens that stall's sales for the day (StallRecap): which
// fruit, to which customer, at what price. The sales are public once the rush is over, like the list itself.
import type { Ref } from 'preact';
import { useRef, useState } from 'preact/hooks';
import { FAVOURS, FRUIT, TRAITS, lookOf, stageAt, type FruitId, type Stage } from '../../../engine/data';
import { count, places, ranking, servingCustomers, shelfSize, type GameState } from '../../../engine/game';
import { useFocusTrap } from '../../focusTrap';
import { usePopFrom } from '../popMotion';
import { offeredPieces } from '../rush';
import { dayLedger, standing, tonightLine } from '../../../engine/story';
import { Face, Fruit } from '../../art';
import { LANES, spoilsTonight } from '../../boardModel';
import { ART_SIZE, CardArt } from '../../cards';
import { GUEST_EVENT, customerArt, customerFocus, favourArt, favourFocus, guestArt, guestFocus } from '../../deckArt';
import { Lamp, STAGE_WORD } from '../../ticket';
import { useReach } from '../reach';
import { nightSteps, tonightWord } from '../tonight';
import { orderLine, takingsRows } from '../dayWords';

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
  const order = orderLine(r, viewer);
  if (order) out.push(order);
  return out;
}

const sum = (xs: number[]) => xs.reduce((a, b) => a + b, 0);

/** One stall on the list: its place, what the day changed and its cash. */
export interface StallRow { p: number; place: number; name: string; avatar: string; today: number | null; cash: number; me: boolean }

/**
 * Every stall after today, first to last (stalls level on cash and fruit sold share a place). `today` is the day's
 * change in cash. Rules 20: nothing is paid after the last rush (no jam maker), so on the last day the list is the
 * final result, and it agrees with the line under it (story.ts standing), with "Up today" and with the results
 * (REP-122 S1). An older save without the day's starting cash shows the day's sales instead.
 */
export function stallRows(s: GameState, viewer: number): StallRow[] {
  const place = places(s);
  return ranking(s).map((p) => {
    const pl = s.players[p];
    return { p, place: place[p], name: pl.name, avatar: pl.avatar, today: dayLedger(s, p).net ?? s.results?.income[p] ?? null, cash: pl.cash, me: p === viewer };
  });
}

/** Today's customers in the order they were served, whether each bought anything (the portraits on the strip), and
 *  whether they got all they came for (`full`). The strip counts them as "4 of 5 customers bought something" and the
 *  whole orders apart, "1 full order" (PLAN-123: "2 of 2 bought" read as two orders filled when neither was; REP-133
 *  A-11 before it: "served"). */
export function rushOver(s: GameState): { id: number; name: string; guest: boolean; served: boolean; full: boolean }[] {
  const r = s.results;
  if (!r) return [];
  return servingCustomers(s).flatMap((c) => {
    const lines = r.lines.filter((l) => l.customerId === c.id);
    if (!lines.length) return [];
    const got = (l: (typeof lines)[number]) => l.offers.reduce((a, o) => a + o.sold, 0);
    return [{ id: c.id, name: c.name, guest: !c.order && !!GUEST_EVENT[c.name], served: lines.some((l) => got(l) > 0), full: lines.every((l) => got(l) >= l.want) }];
  });
}

/** The strip's count: "2 of 2 customers bought something", and the whole orders apart ("1 full order", "no full
 *  orders"). */
export function rushCount(crowd: { served: boolean; full: boolean }[]): [string, string] {
  const n = crowd.filter((x) => x.served).length;
  const full = crowd.filter((x) => x.full).length;
  return [`${n} of ${crowd.length} customer${crowd.length === 1 ? '' : 's'} bought something`, full ? `${full} full order${full === 1 ? '' : 's'}` : 'no full orders'];
}

/** Freshness from the freshest down, the order a sale's pieces are listed in. */
const FRESHEST: Stage[] = ['fresh', 'okay', 'notso', 'unripe'];

/** One line of a stall's sales for the day (PLAN-128). */
export interface StallSale {
  /** A customer or guest in the rush, the standing order, the night hawker (Pasar Malam), or a tip. */
  kind: 'sale' | 'order' | 'hawker' | 'tip';
  /** The customer's name as the game keeps it (lookOf names them), or null (the night hawker, a Sharp Ears tip). */
  who: string | null;
  /** A guest of today's event (a guest card's picture, not a customer's). */
  guest: boolean;
  /** The fruit sold (null for a tip). */
  fruit: FruitId | null;
  /** The freshness of each piece sold, freshest first; null when it cannot be worked out. */
  pieces: Stage[] | null;
  /** Pieces sold (0 for a tip). */
  n: number;
  /** The price of each piece. */
  price: number;
  /** A Juice Bar's money on older pieces sold. */
  juice: number;
  /** All the stall was paid for this line. */
  paid: number;
  /** A tip's name ("Tip Jar tip"). */
  label?: string;
}

/**
 * Stall `p`'s sales today, from the day's results (the lines the rush plays, which the day's history keeps): each sale
 * in the order the customers were served (the fruit, how fresh each piece was, the customer, the price and how many),
 * then the night hawker's pieces and any tips. `total` is the day's income for the stall (results.income), so it
 * agrees with the sales total of its takings. Sales are public once the rush is over; a Sharp Ears tip does not say
 * which walk-in the stall had seen. tests/stall-recap.test.ts holds the lines against the income.
 */
export function stallSales(s: GameState, p: number): { sales: StallSale[]; total: number } {
  const r = s.results;
  if (!r) return { sales: [], total: 0 };
  const pieces = offeredPieces(s);
  const customers = new Map(servingCustomers(s).map((c) => [c.id, c]));
  const sales: StallSale[] = [];
  for (const l of r.lines) {
    l.offers.forEach((o, i) => {
      if (o.player !== p || o.sold <= 0) return;
      const c = customers.get(l.customerId);
      const order = !!c?.order || (!!r.order && r.order.name === l.name && !c);
      const got = pieces.get(l)?.[i]?.slice(0, o.sold) ?? null;
      const juice = o.juice ?? 0;
      sales.push({
        kind: order ? 'order' : 'sale', who: l.name, guest: !order && !!GUEST_EVENT[l.name], fruit: l.fruit,
        pieces: got && [...got].sort((a, b) => FRESHEST.indexOf(a) - FRESHEST.indexOf(b)), n: o.sold, price: o.price, juice, paid: o.sold * o.price + juice,
      });
    });
  }
  for (const x of (r.hawker ?? []).filter((h) => h.player === p)) {
    const same = sales.find((y) => y.kind === 'hawker' && y.fruit === x.fruit && y.price === x.price);
    if (same) { same.n += 1; same.paid += x.price; }
    else sales.push({ kind: 'hawker', who: null, guest: false, fruit: x.fruit, pieces: null, n: 1, price: x.price, juice: 0, paid: x.price });
  }
  for (const x of (r.earful ?? []).filter((t) => t.player === p)) {
    sales.push({ kind: 'tip', who: null, guest: false, fruit: null, pieces: null, n: 0, price: 0, juice: 0, paid: x.tip, label: `${TRAITS.earful.title} tip` });
  }
  for (const x of (r.tipJar ?? []).filter((t) => t.player === p)) {
    sales.push({ kind: 'tip', who: x.customer, guest: false, fruit: null, pieces: null, n: 0, price: 0, juice: 0, paid: x.tip, label: `${TRAITS.favourite.title} tip` });
  }
  return { sales, total: r.income[p] ?? sum(sales.map((x) => x.paid)) };
}

/** What a line of the sales says to a screen reader: "Professor Pebble bought 2 fresh apples at $4 each: $8." */
export function saleSaid(x: StallSale): string {
  if (x.kind === 'tip') return `${x.label}${x.who ? ` from ${lookOf(x.who).title}` : ''}: $${x.paid}.`;
  const f = x.fruit!;
  const kinds = x.pieces ? [...new Set(x.pieces)].map((st) => STAGE_WORD[st]).join(' and ') : '';
  const what = `${x.n} ${kinds ? `${kinds} ` : ''}${(x.n === 1 ? FRUIT[f].name : FRUIT[f].plural).toLowerCase()}`;
  const who = x.kind === 'hawker' ? 'The night hawker' : `${lookOf(x.who!).title}${x.kind === 'order' ? ' (standing order)' : ''}`;
  return `${who} bought ${what} at $${x.price} each: $${x.paid}${x.juice ? `, with $${x.juice} juice money` : ''}.`;
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
/** `shared`: several people share this phone, so this stall's row carries its name and not "You" (as the rush card). */
export function SalesSummary({ s, viewer, shared }: { s: GameState; viewer: number; shared?: boolean }) {
  const root = useRef<HTMLDivElement>(null);
  useReach(root, 'street', true, true, closerOnceSeen);
  // PLAN-128: the stall whose sales are open (null: none).
  const [open, setOpen] = useState<number | null>(null);
  return (
    <>
      <TakingsView s={s} viewer={viewer} shared={shared} root={root} onStall={setOpen} />
      {open !== null && s.players[open] && <StallRecap key={open} s={s} p={open} viewer={viewer} shared={shared} onClose={() => setOpen(null)} />}
    </>
  );
}

/** The takings themselves, without hooks (so tests can render them to a string). */
export function TakingsView({ s, viewer, shared, root, onStall }: { s: GameState; viewer: number; shared?: boolean; root?: Ref<HTMLDivElement>;
  /** PLAN-128: a stall's row was tapped: open its sales. */
  onStall?: (p: number) => void }) {
  const r = s.results!;
  const pl = s.players[viewer];
  const rem = s.config.days - s.day;
  const rows = takingsRows(s, viewer);
  const { net } = dayLedger(s, viewer);
  const crowd = rushOver(s);
  const [bought, full] = rushCount(crowd);
  const stalls = stallRows(s, viewer);
  const st = standing(s, viewer);
  const won = r.favours.filter((x) => x.player === viewer);
  // What tonight does to the shelf: fruit that spoils, and fruit a Juice Bar turns into juice. Nothing on the final
  // day, when no night follows.
  // S8 (PLAN-110): on a phone several people share, the takings are everybody's: no one person's ledger, favour card
  // or shelf (each person sees their own when the phone is passed to them).
  const own = !shared;
  const tonight = own && s.phase === 'reveal' ? tonightLine(s, viewer) : null;
  const spoil = tonight ? spoilsTonight(s, viewer) : 0;
  const chips = own && s.phase === 'reveal' ? shelfTonight(s, viewer) : [];
  const nightEvent = s.event?.ageExtra ? s.event.title : null;
  return (
    <div class="sales-card" ref={root}>
      {crowd.length > 0 && (
        <div class="tg-strip">
          <b class="tk-label"><span>The rush is over</span> · <span>{bought}</span> · <span>{full}</span></b>
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
      {!own && <div class="tg-led tg-shared"><div class="tg-hd"><span>Day {s.day} · the takings</span><b>{rem === 0 ? 'MARKET CLOSED' : `${rem} day${rem > 1 ? 's' : ''} to go`}</b></div>
        <p class="tg-note">Each person sees their own takings when the phone is passed to them.</p></div>}
      {own && <div class="tg-led">
        <div class="tg-hd"><span>Day {s.day} · your takings</span><b>{rem === 0 ? 'MARKET CLOSED' : `${rem} day${rem > 1 ? 's' : ''} to go`}</b></div>
        <div class="tg-rows ledger" aria-label="Day ledger">
          {rows.map((x) => (
            <div class={`tg-row tg-${x.key}`}>
              {x.label} {x.fruits && x.fruits.length > 0 && <TakingsFruits fruits={x.fruits} />}
              {x.amount !== null && <b class={x.amount > 0 ? 'good' : x.amount < 0 ? 'bad' : 'flat'}>{money(x.amount)}</b>}
            </div>
          ))}
        </div>
        {net !== null && <div class="tg-net">{net > 0 ? 'Up today' : net < 0 ? 'Down today' : 'Broke even'} <b class={net > 0 ? 'good' : net < 0 ? 'bad' : 'flat'}>{money(net)}</b></div>}
      </div>}
      <div class="tg-stalls">
        <div class="tg-lab"><b class="tk-label">The stalls after Day {s.day}</b><span>Tap a stall for its sales · Cash</span></div>
        <ol class="tg-list">
          {/* PLAN-128: each row is a button that opens the stall's sales (StallRecap). */}
          {stalls.map((x) => (
            <li class="tg-li">
              <button type="button" class={`tg-stall ${x.me ? 'me' : ''}`} data-stall={x.p} aria-haspopup="dialog"
                aria-label={`${x.me && !shared ? 'You' : x.name}, place ${x.place}${x.today !== null ? `, ${x.today < 0 ? 'down' : 'up'} $${Math.abs(x.today)} today` : ''}, cash $${x.cash}. See the sales`}
                onClick={(e) => { e.stopPropagation(); onStall?.(x.p); }}>
                <i class="tg-pl">{x.place}</i>
                <Face who={x.avatar} size={26} />
                <span class="tg-name">{x.me && !shared ? 'You' : x.name}</span>
                {x.today !== null && <span class="tg-td">{x.today < 0 ? '−' : '+'}${Math.abs(x.today)} today</span>}
                <b class="tg-cash">${x.cash}</b>
                <i class="tg-more" aria-hidden="true" />
              </button>
            </li>
          ))}
        </ol>
        {own && s.players.length > 1 && <div class={`tg-rank r${st.rank}`}>{st.text}</div>}
      </div>
      {own && won.map((x) => (
        <div class="tg-won">
          <b class="tg-tag">Favour won</b>
          <CardArt src={favourArt(x.favour)} alt="" w={ART_SIZE.small[0]} h={ART_SIZE.small[1]} eager focus={favourFocus(x.favour)} />
          <span>{FAVOURS[x.favour].title}. You served {lookOf(x.customer).title}'s whole order alone.</span>
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

/** Under the ticket, Close rises into place once the ticket has come (the ticket itself comes whole). */
const UNDER_RECAP = ':scope .cd-pop-btns';

/**
 * PLAN-128: one stall's sales for the day, opened from its row on the takings: a ticket with the stall's name and
 * the day, a line for each sale (the customer's portrait and name, as on their card; the fruit with a freshness letter
 * for each piece; how many at what price; what it paid) and the total. "Sold nothing today" when it sold nothing. It
 * opens from the row and goes back to it (popMotion.ts). Close, a tap beside the ticket or Escape closes it.
 */
export function StallRecap({ s, p, viewer, shared, onClose }: { s: GameState; p: number; viewer: number; shared?: boolean; onClose: () => void }) {
  const root = useRef<HTMLDivElement>(null);
  const pop = usePopFrom(root, '.sr-card', UNDER_RECAP, () => document.querySelector(`.tg-stall[data-stall="${p}"]`), onClose);
  useFocusTrap(root, pop.close);
  return (
    <div ref={root} tabIndex={-1} class="cd-pop sr-pop" role="dialog" aria-modal="true" aria-labelledby="sr-title"
      onClick={(e) => { e.stopPropagation(); if (pop.step === 'draw') pop.hurry(); else if (!(e.target as Element).closest?.('.sr-card')) pop.close(); }}>
      <div class="cd-pop-in sr-in">
        <RecapView s={s} p={p} viewer={viewer} shared={shared} />
        <div class="cd-pop-btns"><button type="button" class="btn ghost" onClick={(e) => { e.stopPropagation(); pop.close(); }}>Close</button></div>
      </div>
    </div>
  );
}

/** A stall's sales drawn as a ticket (without hooks, so tests can render them to a string). */
export function RecapView({ s, p, viewer, shared }: { s: GameState; p: number; viewer: number; shared?: boolean }) {
  const pl = s.players[p];
  const me = p === viewer && !shared;
  const { sales, total } = stallSales(s, p);
  const pieces = sum(sales.map((x) => x.n));
  return (
    <article class={`sr-card ${p === viewer ? 'me' : ''}`}>
      <header class="sr-hd">
        <Face who={pl.avatar} size={30} />
        <div class="sr-who">
          <h3 id="sr-title">{me ? 'Your sales' : `${pl.name}'s sales`}</h3>
          <span>{`Day ${s.day}${pieces ? ` · ${pieces} piece${pieces === 1 ? '' : 's'}` : ''}`}</span>
        </div>
      </header>
      {sales.length === 0
        ? <p class="sr-none">Sold nothing today</p>
        : (
          <ul class="sr-rows">
            {sales.map((x) => (
              <li class={`sr-row sr-${x.kind}`} aria-label={saleSaid(x)}>
                <span class="sr-face" aria-hidden="true">
                  {x.who
                    ? <CardArt src={x.guest ? guestArt(x.who) : customerArt(x.who)} alt="" w={ART_SIZE.customer[0]} h={ART_SIZE.customer[1]} eager
                        focus={x.guest ? guestFocus(x.who) : customerFocus(x.who)} />
                    : x.fruit ? <Fruit id={x.fruit} size={22} /> : <i class="sr-coin">$</i>}
                </span>
                <span class="sr-what" aria-hidden="true">
                  <b class="sr-name">{x.kind === 'tip' ? x.label : x.kind === 'hawker' ? 'Night hawker' : lookOf(x.who!).title}</b>
                  <span class="sr-line">
                    {x.kind === 'order' && <i class="sr-tag">Standing order</i>}
                    {x.kind === 'tip' && x.who && <span>{`from ${lookOf(x.who).title}`}</span>}
                    {x.fruit && (
                      <span class="sr-fruit">
                        <Fruit id={x.fruit} size={16} />
                        {x.pieces ? x.pieces.map((st) => <Lamp stage={st} on={false} size={13} />) : null}
                        <span>{`×${x.n} at $${x.price}`}</span>
                      </span>
                    )}
                    {x.juice > 0 && <span class="sr-juice">{`+$${x.juice} juice`}</span>}
                  </span>
                </span>
                <b class="sr-paid" aria-hidden="true">{`$${x.paid}`}</b>
              </li>
            ))}
          </ul>
        )}
      <div class="sr-total"><span>{me ? 'Your total' : 'Total'}</span><b>{`$${total}`}</b></div>
    </article>
  );
}
