// The morning (PLAN-072; the cards redrawn in PLAN-083; laid out as the approved Morning screen in PLAN-084): the
// market's top-up and the inspector's fine as a line each, the night's spoilage and juice, the final day's word on
// leftovers, today's event card (its picture, its name, what it changes on mustard chips, then the rule), today's
// lorry card (the pieces it brings for every table size, this table's row boxed) and tomorrow's lorry in one line.
// The event is turned over each morning: it shows the event deck's back until the picture is ready (PLAN-061).
// On the table the sheet lies over the rivals and the lanes, from under the customers' tickets down to your shelf
// (reach.ts), so nothing needs a scroll on a phone 844 px tall; on a shorter phone it scrolls inside itself.
import { useEffect, useLayoutEffect, useMemo, useRef, useState } from 'preact/hooks';
import { EVENT_CARDS, FRUIT, TOP_UP } from '../../../engine/data';
import type { GameState } from '../../../engine/game';
import { closingNote, overnightLines, type NightJuice } from '../../../engine/story';
import { hurryUp, resetHurry } from '../../anim';
import { Fruit } from '../../art';
import { LANES, lorryLoad, nextLorry, nextLorryName, todaysLoad, todaysLorry } from '../../boardModel';
import { EventBack } from '../../cards';
import { holdCash } from '../../cashShown';
import { CALM_ART, eventArt, eventFocus } from '../../deckArt';
import { newsChips } from '../../eventChips';
import { EventTicket, LorryTicket, type NewsCard } from '../../phoneCards';
import { dawnCoins, takeDawn } from '../dayBeats';
import { useReach } from '../reach';

/** True once the picture is downloaded and decoded (or after a short wait, so a slow picture never holds up the game).
 *  The news stays face down until then, so the picture and the words turn over together. */
function useArtReady(src: string | null): boolean {
  const [ready, setReady] = useState(!src);
  useEffect(() => {
    if (!src) { setReady(true); return; }
    setReady(false);
    let live = true;
    const done = () => { if (live) setReady(true); };
    const img = new Image();
    img.src = src;
    img.decode().then(done, done); // a failed load still turns the news over (the picture just shows as missing)
    const t = setTimeout(done, 1200);
    return () => { live = false; clearTimeout(t); };
  }, [src]);
  return ready;
}

/** Rules 18, out of cash: who the market topped up at dawn, in words (null when nobody was). */
export function topUpLine(s: GameState, viewer: number): string | null {
  if (!s.dayTopUps || !s.dayTopUps.some((x) => x > 0)) return null;
  return s.players.map((pl, i) => (s.dayTopUps![i] ? `${i === viewer ? 'Your shelf was empty, so you were topped up' : `${pl.name} had an empty shelf and was topped up`} to $${TOP_UP} (+$${s.dayTopUps![i]})` : '')).filter(Boolean).join(' · ');
}

/** Health Inspector: who was fined at the start of today, in words (null when nobody was). */
export function fineLine(s: GameState, viewer: number): string | null {
  if (!s.event?.inspector || !s.dayFines || !s.dayFines.some((x) => x > 0)) return null;
  return s.players.map((pl, i) => (s.dayFines![i] ? `${i === viewer ? 'You were' : `${pl.name} was`} fined $${s.dayFines![i]}` : '')).filter(Boolean).join(' · ');
}

/** Rules 18: a Mango Windfall's extra mangoes arrive ripe; the rest of the lorry's mangoes are green as always. */
export function ripeLine(s: GameState): string | null {
  const parts = LANES.filter((f) => s.deliveryUnripe === f && (s.deliveryRipe?.[f] ?? 0) > 0).map((f) => `${s.deliveryRipe![f]} of the ${FRUIT[f].plural.toLowerCase()} arrived ripe`);
  return parts.length ? `${parts.join('. ')}.` : null;
}

/** One line of dawn's money: a stall the inspector fined or the market topped up, the sum, and the words. */
export interface DawnLine { p: number; kind: 'fine' | 'up'; amount: number; text: string }

/**
 * Dawn's money, a line for each stall it touched: the inspector's fines first (as in the rules), then the market's
 * top-ups, and within each this stall's own line first.
 */
export function dawnLines(s: GameState, viewer: number): DawnLine[] {
  const seats = s.players.map((_, i) => i).sort((a, b) => Number(b === viewer) - Number(a === viewer));
  const out: DawnLine[] = [];
  if (s.event?.inspector) for (const p of seats) {
    const n = s.dayFines?.[p] ?? 0;
    if (n > 0) out.push({ p, kind: 'fine', amount: n, text: `${p === viewer ? 'You were' : `${s.players[p].name} was`} fined $${n}` });
  }
  for (const p of seats) {
    const n = s.dayTopUps?.[p] ?? 0;
    if (n > 0) out.push({ p, kind: 'up', amount: n, text: p === viewer
      ? `You are topped up to $${TOP_UP}. Your shelf was empty and you had less than $${TOP_UP}.`
      : `${s.players[p].name} had an empty shelf and was topped up to $${TOP_UP}` });
  }
  return out;
}

/** Tomorrow's lorry in one line: its name, then the pieces it brings to this table. */
export function TomorrowLorry({ s }: { s: GameState }) {
  const lines = s.phase === 'over' ? null : nextLorry(s);
  if (!lines) return null;
  const name = nextLorryName(s);
  return (
    <div class="mt-next" aria-label={`Tomorrow's lorry${name ? ` (${name})` : ''}: ${lines.map((l) => `${l.n} ${FRUIT[l.f].plural}${l.green ? ' (green)' : ''}`).join(', ')}`}>
      <b class="tk-label">Tomorrow</b>
      {name && <span class="mt-name">{name}</span>}
      <span class="mt-load" aria-hidden="true">
        {lines.map((l) => <span><Fruit id={l.f} size={14} stage={l.green ? 'unripe' : 'fresh'} />{l.n}</span>)}
      </span>
    </div>
  );
}

/** How many steps closer the morning sheet may be drawn when it would otherwise need a scroll (sheets.css, data-tight). */
export const TIGHTEST = 3;
/** What the steps need of a sheet (a page element; a stand-in in tests). */
export interface Fitting { dataset: DOMStringMap; readonly scrollHeight: number; readonly clientHeight: number }
/**
 * When the sheet's parts are taller than the sheet, it is drawn a little closer, a step at a time. The step is
 * written on the sheet itself (data-tight); the card is not drawn again for it. A sheet never goes back a step: a
 * morning only gains lines.
 */
export function closer(el: Fitting): void {
  let step = Number(el.dataset.tight ?? 0);
  while (step < TIGHTEST && el.scrollHeight > el.clientHeight + 1) {
    step += 1;
    el.dataset.tight = String(step);
  }
}
/**
 * Called when the sheet's reach has been measured (reach.ts). A sheet that slides onto the table is clear as glass on
 * its first frame (sheet.ts: it fades in from nothing), so that frame is left as it is and the steps are taken before
 * the next one is drawn. Nobody sees the difference, and the pause as a morning comes is two short ones in place of
 * one long one (on a slow phone the one was over the game's limit of 200 ms: scripts/perf-budget.cjs). A sheet that
 * can be seen at once (reduced motion, or back after a moment away) takes its steps there and then.
 */
function closerOnceSeen(el: HTMLElement): void {
  if (getComputedStyle(el).opacity !== '0') { closer(el); return; }
  requestAnimationFrame(() => { if (el.isConnected) closer(el); });
}

/** `table`: this is the morning's sheet on the game table (the same card is also shown full screen from the top bar). */
export function MorningCard({ s, viewer, lost, juice, table }: { s: GameState; viewer: number; lost: number; juice?: NightJuice; table?: boolean }) {
  const rem = s.config.days - s.day + 1;
  // Overnight: fruit lost, then what the Juice Bar made; on the final day, what leftovers are worth.
  const night = overnightLines(lost, juice).map((l) => <div class={`mc-loss tk-info ${l.tone === 'good' ? 'good' : 'warn'}`}>{l.text}</div>);
  const closing = closingNote(s, viewer)?.morning;
  // A day with no event (Day 1, or every day when events are off) gets a "Calm Day" in the same layout, so every
  // morning looks alike (PLAN-062). It is not a card in the deck: nothing is drawn for it in the rules.
  const card: NewsCard = s.event ?? {
    id: 'calm', title: 'Calm Day',
    text: !s.config.events ? 'Events are off in this game.' : s.day === 1 ? 'No event on Day 1.' : 'No event today.',
  };
  const art = s.event ? eventArt(s.event.id) : CALM_ART;
  const ready = useArtReady(art);
  const ripeNote = ripeLine(s);
  const dawn = dawnLines(s, viewer);
  // Today's lorry card. An event may change what it unloads (a Good Harvest, an Apple Blight): the card then keeps
  // its printed rows and a "Today" row shows what really came.
  const lorry = todaysLorry(s);
  const load = todaysLoad(s);
  const printed = lorry ? lorryLoad(lorry, null, s.players.length) : null;
  const asPrinted = !!printed && LANES.every((f) => printed[f] === load[f]);

  // On the table the sheet reaches from under the customers' tickets to your shelf (the approved Morning screen).
  const root = useRef<HTMLDivElement>(null);
  useReach(root, 'row', false, !!table, closerOnceSeen);
  // Coins at dawn (PLAN-084): the totals stay as they were before the fine and the top-up until the coins travel,
  // once the news has been turned over. Only for the morning that has just broken on this table.
  const before = useMemo(() => (table ? takeDawn(s) : null), []);
  const live = useRef(true);
  useLayoutEffect(() => {
    if (!before) return;
    holdCash(before);
    return () => { live.current = false; holdCash(null); };
  }, []);
  const coins = useRef(false);
  useEffect(() => {
    if (!before || !ready) return;
    coins.current = true;
    void dawnCoins(s, viewer, () => live.current).then(() => { coins.current = false; if (live.current) holdCash(null); });
  }, [ready]);
  // A tap on the sheet while dawn's coins are on their way ends their pauses, so they leave at once. The table's pace
  // is put back straight away: this hurry is for the coins only, not for the buying that follows.
  const hurryCoins = () => { if (coins.current) { hurryUp(); resetHurry(); } };
  // Once the event's picture is in, the sheet is looked at again (the page is at rest by then, so this costs nothing).
  useEffect(() => { if (table && ready && root.current) closer(root.current); }, [ready]);

  const said = [fineLine(s, viewer), topUpLine(s, viewer)].filter(Boolean).join('. ');
  return (
    <div class={`morning-card tk-morning ${table ? 'fm-sheet sh-morning' : ''} ${rem <= 3 ? 'finale' : ''}`} ref={root} onClick={hurryCoins}>
      {/* The inspector's fine, and (rules 18, out of cash) the market's top-up of a stall with an empty shelf and less
          than $5 at dawn. */}
      {dawn.length > 0 && (
        <div class="dw" role="status" aria-label={said}>
          {dawn.map((d) => (
            <p class={`dw-row ${d.kind} ${d.p === viewer ? 'me' : ''}`} aria-hidden="true">
              <b class="dw-n" data-a={`dawn-${d.kind}-${d.p}`}>{d.kind === 'fine' ? '−' : '+'}${d.amount}</b>
              <span>{d.text}</span>
            </p>
          ))}
        </div>
      )}
      {night}
      {closing && <div class="mc-loss tk-info warn">{closing}</div>}
      <div class={`wc-flip ${ready ? 'go' : ''}`} key={`${s.day}-${card.id}`}>
        <div class="wc-flip-back" aria-hidden="true"><EventBack wide /></div>
        <div class="wc-flip-face">
          <EventTicket card={card} n={s.event ? EVENT_CARDS.findIndex((e) => e.id === s.event!.id) + 1 : undefined} art={art} focus={eventFocus(card.id)} chips={newsChips(s.event)}>
            {s.event?.maxPrice && (
              <span class="minprices" aria-label={`Most a stall may charge today: ${LANES.map((f) => `${FRUIT[f].plural} $${s.event!.maxPrice![f]}`).join(', ')}`}>
                {LANES.map((f) => <span aria-hidden="true"><Fruit id={f} size={16} />≤${s.event!.maxPrice![f]}</span>)}
              </span>
            )}
          </EventTicket>
        </div>
      </div>
      <div class="tk-unload">
        {s.event?.noDelivery
          ? <b class="tk-label">No lorry today</b>
          : <LorryTicket card={lorry} stalls={s.players.length} today={asPrinted ? undefined : load} green={s.deliveryUnripe} ripeIn={s.deliveryUnripe ? FRUIT[s.deliveryUnripe].unripeSlots : 0} />}
        {ripeNote && <p class="tk-note">{ripeNote}</p>}
      </div>
      <TomorrowLorry s={s} />
    </div>
  );
}
