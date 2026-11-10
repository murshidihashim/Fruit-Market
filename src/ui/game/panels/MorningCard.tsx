// The card over the market each morning: the night's spoilage and juice, the final day's word on leftovers, today's
// event as a full picture card (PLAN-061), and tomorrow's lorry.
import { useEffect, useState } from 'preact/hooks';
import { FRUIT, FRUITS } from '../../../engine/data';
import type { GameState } from '../../../engine/game';
import { closingNote, overnightLines, type NightJuice } from '../../../engine/story';
import { Fruit } from '../../art';
import { ART_SIZE, CardArt, EventBack } from '../../cards';
import { eventArt } from '../../deckArt';
import { Icon } from '../../icons';
import { NextLorry } from '../../table';

/**
 * The morning event card (PLAN-061): today's event as a full card, its picture filling the space with the title and
 * rule on a band at its foot. No day count, standing or tomorrow's news: since rules 13 events are never forecast.
 * `table`: the card sits in the middle of the game screen, between today's customers and your shelf.
 */
/** True once the picture is downloaded and decoded (or after a short wait, so a slow picture never holds up the game).
 *  The card stays face down until then, so the picture and the words turn over together. */
function useArtReady(src: string | null): boolean {
  const [ready, setReady] = useState(!src);
  useEffect(() => {
    if (!src) { setReady(true); return; }
    setReady(false);
    let live = true;
    const done = () => { if (live) setReady(true); };
    const img = new Image();
    img.src = src;
    img.decode().then(done, done); // a failed load still turns the card over (the picture just shows as missing)
    const t = setTimeout(done, 1200);
    return () => { live = false; clearTimeout(t); };
  }, [src]);
  return ready;
}

export function MorningCard({ s, viewer, lost, juice, table: _table }: { s: GameState; viewer: number; lost: number; juice?: NightJuice; table?: boolean }) {
  const rem = s.config.days - s.day + 1;
  // Overnight: fruit lost (red), then what the Juice Bar made (green); on the final day, what leftovers are worth.
  const night = overnightLines(lost, juice).map((l) => <div class={`mc-loss ${l.tone}`}>{l.text}</div>);
  const closing = closingNote(s, viewer)?.morning;
  const ready = useArtReady(s.event ? eventArt(s.event.id) : null);
  return (
    <div class={`morning-card mc-brief mc-full ${rem <= 3 ? 'finale' : ''}`}>
      {night}
      {closing && <div class="mc-loss">{closing}</div>}
      {s.event ? (
        <div class={`mc-flip ${ready ? 'go' : ''}`} key={`${s.day}-${s.event.id}`}>
        <div class="mc-face mc-back" aria-hidden="true"><EventBack /></div>
        <div class={`mc-face mc-event x-ev-${s.event.id}`}>
          <CardArt class="mc-pic" src={eventArt(s.event.id)} alt="" w={ART_SIZE.event[0]} h={ART_SIZE.event[1]} eager />
          <div class="mc-band">
            <span class="mc-next-k">Today’s news</span>
            <b>{s.event.title}</b>
            {s.event.flavour && <i class="mc-flavour">{s.event.flavour}</i>}<small>{s.event.text}</small>
            {s.event.maxPrice && (
              <span class="minprices" aria-label={`Most a stall may charge today: ${FRUITS.map((f) => `${FRUIT[f].plural} $${s.event!.maxPrice![f]}`).join(', ')}`}>
                {FRUITS.map((f) => <span aria-hidden="true"><Fruit id={f} size={16} />≤${s.event!.maxPrice![f]}</span>)}
              </span>
            )}
          </div>
        </div>
        </div>
      ) : (
        <div class="sunny"><Icon name="sun" size={22} /> A calm day at the market</div>
      )}
      {s.event?.inspector && s.dayFines && s.dayFines.some((x) => x > 0) && (
        <p class="mc-fine">{s.players.map((pl, i) => (s.dayFines![i] ? `${i === viewer ? 'You were' : `${pl.name} was`} fined $${s.dayFines![i]}` : '')).filter(Boolean).join(' · ')}</p>
      )}
      <NextLorry s={s} cls="mc-lorry" />
    </div>
  );
}
