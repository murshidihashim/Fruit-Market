// The morning (PLAN-072): the night's spoilage and juice, the final day's word on leftovers, today's news in a red
// frame (the event's picture, its name, what it changes in big figures, then the rule), and what the lorry unloaded
// into each lane. The news is turned over each morning: it shows its back until the picture is ready (PLAN-061).
import { useEffect, useState } from 'preact/hooks';
import { FRUIT, TOP_UP, type EventCard, type FruitId } from '../../../engine/data';
import type { GameState } from '../../../engine/game';
import { closingNote, overnightLines, type NightJuice } from '../../../engine/story';
import { Fruit } from '../../art';
import { LANES } from '../../boardModel';
import { ART_SIZE, CardArt } from '../../cards';
import { CALM_ART, eventArt } from '../../deckArt';
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

export interface NewsChip { fruit?: FruitId; big: string; small: string }
const signed = (n: number, money = false) => `${n > 0 ? '+' : '−'}${money ? '$' : ''}${Math.abs(n)}`;

/** What today's event changes, as big figures (at most three): prices first, then the crowd, the lorry and the night. */
export function newsChips(e: EventCard | null | undefined): NewsChip[] {
  if (!e) return [];
  const out: NewsChip[] = [];
  if (e.priceAll) out.push({ big: signed(e.priceAll, true), small: 'Every customer pays' });
  for (const f of LANES) if (e.price?.[f]) out.push({ fruit: f, big: signed(e.price[f]!, true), small: `Per ${FRUIT[f].name}` });
  if (e.cost) out.push({ big: signed(e.cost, true), small: 'Market prices' });
  if (e.maxPrice) out.push({ big: 'Max', small: 'Prices are capped' });
  if (e.inspector) out.push({ big: `−$${e.inspector}`, small: 'Per soft piece' });
  if (e.walkIns) out.push({ big: e.walkIns > 0 ? 'More' : 'Fewer', small: 'Walk-ins today' });
  if (e.extra) out.push({ big: 'Guest', small: 'A special customer' });
  if (e.noDelivery) out.push({ big: 'No', small: 'Lorry today' });
  if (e.noFruit) out.push({ fruit: e.noFruit, big: 'No', small: `${FRUIT[e.noFruit].plural} today` });
  if (e.supplyMult && e.supplyMult < 1) out.push({ big: 'Half', small: 'The delivery' });
  if (e.supplyAll) out.push({ big: 'Extra', small: 'Of every fruit' });
  for (const f of LANES) if (e.supplyEach?.[f]) out.push({ fruit: f, big: 'Extra', small: `${FRUIT[f].plural} today` });
  if (e.hawker) out.push({ big: `$${e.hawker}`, small: 'Night hawker pays' });
  if (e.ageExtra) out.push({ big: e.ageExtra > 0 ? `+${e.ageExtra}` : 'None', small: e.ageExtra > 0 ? 'Age step tonight' : 'Ageing tonight' });
  return out.slice(0, 3);
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
  const card = s.event ?? {
    id: 'calm', title: 'Calm Day', flavour: 'Clear skies, business as usual!',
    text: !s.config.events ? 'Events are off in this game.' : s.day === 1 ? 'Day 1! Let’s make some money!' : 'No event today.',
  };
  const art = s.event ? eventArt(s.event.id) : CALM_ART;
  const ready = useArtReady(art);
  const chips = newsChips(s.event);
  const unloaded = LANES.map((f) => ({ f, n: s.delivery?.[f] ?? 0, green: s.deliveryUnripe === f, ripe: s.deliveryRipe?.[f] ?? 0 }));
  const ripeNote = ripeLine(s);
  const topUp = topUpLine(s, viewer);
  return (
    <div class={`morning-card tk-morning ${rem <= 3 ? 'finale' : ''}`}>
      {night}
      {closing && <div class="mc-loss tk-info warn">{closing}</div>}
      <div class={`tk-news ${ready ? 'go' : ''}`} key={`${s.day}-${card.id}`}>
        <div class="tk-news-back" aria-hidden="true"><b>Today’s news</b><span>Turned over each morning</span></div>
        <div class={`tk-news-face x-ev-${card.id}`}>
          <div class="tk-news-in">
            <div class="tk-news-top">
              <CardArt class="tk-news-pic" src={art} alt="" w={ART_SIZE.event[0]} h={ART_SIZE.event[1]} eager />
              <div class="tk-news-head">
                <span class="tk-label red">Today’s news</span>
                <b class="tk-news-title">{card.title}</b>
                {card.flavour && <i class="tk-news-flavour">{card.flavour}</i>}
              </div>
            </div>
            {chips.length > 0 && (
              <div class="tk-fx">
                {chips.map((c) => (
                  <div class="tk-fx-chip">
                    {c.fruit && <span class="tk-fx-ico"><Fruit id={c.fruit} size={24} /></span>}
                    <span><b>{c.big}</b><small>{c.small}</small></span>
                  </div>
                ))}
              </div>
            )}
            <p class="tk-news-text">{card.text}</p>
            {s.event?.maxPrice && (
              <span class="minprices" aria-label={`Most a stall may charge today: ${LANES.map((f) => `${FRUIT[f].plural} $${s.event!.maxPrice![f]}`).join(', ')}`}>
                {LANES.map((f) => <span aria-hidden="true"><Fruit id={f} size={16} />≤${s.event!.maxPrice![f]}</span>)}
              </span>
            )}
          </div>
        </div>
      </div>
      {s.event?.inspector && s.dayFines && s.dayFines.some((x) => x > 0) && (
        <p class="mc-fine tk-info warn">{s.players.map((pl, i) => (s.dayFines![i] ? `${i === viewer ? 'You were' : `${pl.name} was`} fined $${s.dayFines![i]}` : '')).filter(Boolean).join(' · ')}</p>
      )}
      {/* Rules 18, out of cash: a stall with an empty shelf and less than $5 at dawn is topped up to $5 by the market. */}
      {topUp && <p class="mc-topup tk-info good">{topUp}</p>}
      <div class="tk-unload">
        <b class="tk-label">{s.event?.noDelivery ? 'No lorry today' : 'The lorry unloads'}</b>
        {!s.event?.noDelivery && (
          <div class="tk-unload-row" aria-label={`Today's delivery: ${unloaded.map((x) => `${x.n} ${FRUIT[x.f].plural.toLowerCase()}${x.green ? (x.ripe ? ` (${x.ripe} ripe, ${x.n - x.ripe} green)` : ' (green)') : ''}`).join(', ')}`}>
            {unloaded.map((x) => (
              <div class={`tk-load ${x.f} ${x.n ? '' : 'none'}`}>
                <span class="tk-load-ico"><Fruit id={x.f} size={24} stage={x.green ? 'unripe' : 'fresh'} /></span>
                <b>{x.n}</b>
              </div>
            ))}
          </div>
        )}
        {ripeNote && <p class="tk-note">{ripeNote}</p>}
        <NextLorry s={s} cls="mc-lorry" />
      </div>
    </div>
  );
}
