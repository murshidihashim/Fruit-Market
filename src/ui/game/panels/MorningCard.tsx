// The morning (PLAN-072; the cards redrawn in PLAN-083): the night's spoilage and juice, the final day's word on
// leftovers, today's event card (its picture, its name, what it changes on mustard chips, then the rule) and today's
// lorry card (the pieces it brings for every table size, this table's row boxed). The event is turned over each
// morning: it shows the event deck's back until the picture is ready (PLAN-061).
import { useEffect, useState } from 'preact/hooks';
import { EVENT_CARDS, FRUIT, TOP_UP } from '../../../engine/data';
import type { GameState } from '../../../engine/game';
import { closingNote, overnightLines, type NightJuice } from '../../../engine/story';
import { Fruit } from '../../art';
import { LANES, lorryLoad, todaysLoad, todaysLorry } from '../../boardModel';
import { EventBack } from '../../cards';
import { CALM_ART, eventArt, eventFocus } from '../../deckArt';
import { newsChips } from '../../eventChips';
import { EventTicket, LorryTicket, type NewsCard } from '../../phoneCards';
import { NextLorry } from '../../table';

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
  return s.players.map((pl, i) => (s.dayTopUps![i] ? `${i === viewer ? 'Your shelf was empty, so the market topped you up' : `${pl.name} had an empty shelf and was topped up`} to $${TOP_UP} (+$${s.dayTopUps![i]})` : '')).filter(Boolean).join(' · ');
}

/** Rules 18: a Mango Windfall's extra mangoes arrive ripe; the rest of the lorry's mangoes are green as always. */
export function ripeLine(s: GameState): string | null {
  const parts = LANES.filter((f) => s.deliveryUnripe === f && (s.deliveryRipe?.[f] ?? 0) > 0).map((f) => `${s.deliveryRipe![f]} of the ${FRUIT[f].plural.toLowerCase()} arrived ripe`);
  return parts.length ? `${parts.join('. ')}.` : null;
}

export function MorningCard({ s, viewer, lost, juice, table: _table }: { s: GameState; viewer: number; lost: number; juice?: NightJuice; table?: boolean }) {
  const rem = s.config.days - s.day + 1;
  // Overnight: fruit lost, then what the Juice Bar made; on the final day, what leftovers are worth.
  const night = overnightLines(lost, juice).map((l) => <div class={`mc-loss tk-info ${l.tone === 'good' ? 'good' : 'warn'}`}>{l.text}</div>);
  const closing = closingNote(s, viewer)?.morning;
  // A day with no event (Day 1, or every day when events are off) gets a "Calm Day" in the same layout, so every
  // morning looks alike (PLAN-062). It is not a card in the deck: nothing is drawn for it in the rules.
  const card: NewsCard = s.event ?? {
    id: 'calm', title: 'Calm Day', flavour: 'Clear skies, business as usual!',
    text: !s.config.events ? 'Events are off in this game.' : s.day === 1 ? 'Day 1! Let’s make some money!' : 'No event today.',
  };
  const art = s.event ? eventArt(s.event.id) : CALM_ART;
  const ready = useArtReady(art);
  const ripeNote = ripeLine(s);
  const topUp = topUpLine(s, viewer);
  // Today's lorry card. An event may change what it unloads (a Good Harvest, an Apple Blight): the card then keeps
  // its printed rows and a "Today" row shows what really came.
  const lorry = todaysLorry(s);
  const load = todaysLoad(s);
  const printed = lorry ? lorryLoad(lorry, null, s.players.length) : null;
  const asPrinted = !!printed && LANES.every((f) => printed[f] === load[f]);
  return (
    <div class={`morning-card tk-morning ${rem <= 3 ? 'finale' : ''}`}>
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
      {s.event?.inspector && s.dayFines && s.dayFines.some((x) => x > 0) && (
        <p class="mc-fine tk-info warn">{s.players.map((pl, i) => (s.dayFines![i] ? `${i === viewer ? 'You were' : `${pl.name} was`} fined $${s.dayFines![i]}` : '')).filter(Boolean).join(' · ')}</p>
      )}
      {/* Rules 18, out of cash: a stall with an empty shelf and less than $5 at dawn is topped up to $5 by the market. */}
      {topUp && <p class="mc-topup tk-info good">{topUp}</p>}
      <div class="tk-unload">
        {s.event?.noDelivery
          ? <b class="tk-label">No lorry today</b>
          : <LorryTicket card={lorry} stalls={s.players.length} today={asPrinted ? undefined : load} green={s.deliveryUnripe} ripeIn={s.deliveryUnripe ? FRUIT[s.deliveryUnripe].unripeSlots : 0} />}
        {ripeNote && <p class="tk-note">{ripeNote}</p>}
        <NextLorry s={s} cls="mc-lorry" />
      </div>
    </div>
  );
}
