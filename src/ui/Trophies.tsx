// Trophies (PLAN-086; boards "Stamp-Book", "Trophy-Cards" and "Wardrobe"): four pages under one black bar.
// The stamp book: your stall's sign, the card being filled, what earns stamps, and the whole ladder with nothing
// hidden. The cards: every trophy with its tiers and a progress line. The collection: the customers, guests and
// events you have met (a page is a shadow until then; a page that has been met opens its whole card). The Wardrobe is
// the fourth page (Wardrobe.tsx).
import type { VNode } from 'preact';
import { useEffect, useRef, useState } from 'preact/hooks';
import { CUSTOMER_CARDS, EVENT_CARDS, lookOf } from '../engine/data';
import { frameOf, titleOf, type LookSet } from '../net/looks';
import { ALL_GUESTS, CARDS, GROUPS, TIER_COUNT, TIER_NAME, customersServed, eventsSeen, guestsServed, nextStep, stepMet, stepValue, type Card, type Snapshot } from './achievements';
import { Gazette, TradingCard } from './cards';
import { customerArt, eventArt, eventFocus, focusCss, guestArt, guestFocus } from './deckArt';
import { fx } from './fx';
import { myAvatar, syncLooks, worn } from './looks';
import { snapshot, syncTiers } from './progress';
import { BackArrow, Pip, StallPic, StampGrid, TrophyPic, stallName } from './stampCard';
import { MAX_LEVEL, RANKS, REWARDS, TIER_STAMPS, nextReward, placeOf, progressWords, rewardBuilt, type Place } from './stamps';
import { WardrobeTab } from './Wardrobe';

export type TrophyTab = 'book' | 'cards' | 'collection' | 'wardrobe';
const TABS: { id: TrophyTab; title: string }[] = [
  { id: 'book', title: 'Stamp book' }, { id: 'cards', title: 'Cards' }, { id: 'collection', title: 'Collection' }, { id: 'wardrobe', title: 'Wardrobe' },
];

/** The stall's sign: its name, the title on show and the level, in the frame on show. */
export function Sign({ look, level }: { look: LookSet; level: number }) {
  return (
    <div class={`sbk-sign fr-${frameOf(look)}`}>
      <span class="sbk-pic"><StallPic avatar={myAvatar()} size={52} /></span>
      <div class="sbk-sign-tx"><h2>{stallName()}</h2><span class="sbk-lab">{titleOf(look) ?? ''}</span></div>
      <span class="sbk-lvl"><span class="sbk-lab">Level</span><b>{level}</b></span>
    </div>
  );
}

/** What each rank hands over, in a few words (the full list opens under the rank). */
const RANK_GIVES = ['Price tags, a bell, a coin sound', 'Painted-board frame, "Sold out" stamp', 'Lantern-string frame, card backs', 'Brass-plate frame, Monsoon table',
  'Carved-wood frame, Festival table', 'Gold-leaf frame, Gold-thread awning'];

function BookTab({ place, look }: { place: Place; look: LookSet }) {
  const [open, setOpen] = useState(place.rankNo - 1);
  const next = nextReward(place);
  return (
    <>
      <Sign look={look} level={place.level} />
      <div class="sbk-sec">
        <div class="sbk-card">
          <div class="sbk-ch"><span>Card {place.level} of {MAX_LEVEL} · {place.rank.name}</span><b>{place.filled} of {place.size}</b></div>
          <div style="padding: 9px"><StampGrid size={place.size} filled={place.filled} /></div>
          <div class="sbk-perf" />
          <div class="sbk-row" style="padding: 7px 9px">
            {next
              ? <><b>{next.stamps} {next.stamps === 1 ? 'stamp' : 'stamps'} {next.level > MAX_LEVEL ? 'to fill the book' : `to level ${next.level}`}</b><span>{next.reward ? `Next: ${next.reward.text}${rewardBuilt(next.reward) ? '' : ' · coming'}` : ''}</span></>
              : <b>The book is full</b>}
          </div>
        </div>
      </div>

      <div class="sbk-sec">
        <div class="sbk-row"><span class="sbk-lab">What earns stamps</span><span class="sbk-sub">Never spent, lost or sold</span></div>
        <div class="sbk-how">
          <span>Finish a game</span><b>1 for every 3 days</b>
          <span>Win it (a shared win counts)</span><b>+1</b>
          <span>Finish the Daily market, once a day</span><b>+2</b>
          <span>A trophy tier: Bronze · Silver · Gold</span><b>{TIER_STAMPS.bronze} · {TIER_STAMPS.silver} · {TIER_STAMPS.gold}</b>
        </div>
      </div>

      <div class="sbk-sec" style="padding-bottom: 14px">
        <span class="sbk-lab">The ladder · six ranks, thirty cards</span>
        {RANKS.map((r, i) => {
          const state = place.level > r.to ? 'done' : place.level >= r.from ? 'now' : 'later';
          const rewards = REWARDS.filter((x) => x.level >= r.from && x.level <= r.to);
          const coming = rewards.some((x) => !rewardBuilt(x));
          return (
            <>
              <button type="button" class={`sbk-rk ${state}`} aria-expanded={open === i} onClick={() => { fx.tap(); setOpen(open === i ? -1 : i); }}>
                <span class="sbk-n">{i + 1}</span>
                <span class="sbk-t"><b>{r.name}</b><span>Levels {r.from} to {r.to}{state === 'now' ? ' · you are here' : ''}</span></span>
                <span class="sbk-r">{state === 'done' ? <>{rewards.length} rewards<br />all yours</> : state === 'now' ? <>{r.card} stamps<br />a card</> : <>{RANK_GIVES[i]}{coming ? ' · coming' : ''}</>}</span>
              </button>
              {open === i && (
                <div class="sbk-rew">
                  {rewards.map((x) => <span class={x.level <= place.level ? 'got' : x.level === place.level + 1 ? 'nx' : rewardBuilt(x) ? '' : 'soon'}>{x.level} {x.text}{rewardBuilt(x) || x.level <= place.level ? '' : ' · coming'}</span>)}
                </div>
              )}
            </>
          );
        })}
      </div>
    </>
  );
}

/** A card's progress line: what the next tier asks, or how far along it is. */
function cardLine(card: Card, s: Snapshot): { text: string; share: number } {
  const st = nextStep(card, s);
  if (!st) return { text: card.steps.length > 1 ? 'Every tier earned' : 'Earned', share: 1 };
  const value = Math.min(stepValue(card, st, s), st.goal);
  if (st.goal <= 1 || value <= 0) return { text: st.text, share: 0 };
  return { text: `${progressWords({ card, value, goal: st.goal })} for ${TIER_NAME[st.tier]}`, share: value / st.goal };
}

function CardsTab({ snap }: { snap: Snapshot }) {
  const held = CARDS.reduce((a, c) => a + c.steps.filter((st) => stepMet(c, st, snap)).length, 0);
  return (
    <>
      <div class="sbk-strip">
        <span class="sbk-lab">{CARDS.length} cards · {held} of {TIER_COUNT} tiers</span>
        <span><Pip tier="bronze" on />{TIER_STAMPS.bronze} <Pip tier="silver" on />{TIER_STAMPS.silver} <Pip tier="gold" on />{TIER_STAMPS.gold} stamps</span>
      </div>
      {GROUPS.map((g) => {
        const cards = CARDS.filter((c) => c.group === g.id);
        return (
          <div class="sbk-sec">
            <div class="sbk-row"><span class="sbk-lab">{g.title}</span><span class="sbk-sub">{cards.length} {cards.length === 1 ? 'card' : 'cards'}</span></div>
            {cards.map((c) => {
              const line = cardLine(c, snap);
              return (
                <div class="sbk-tc">
                  <span class="sbk-pic"><TrophyPic pic={c.pic} /></span>
                  <span class="sbk-tx"><b>{c.title}</b><span>{line.text}</span><span class="sbk-pg"><i style={{ width: `${Math.round(line.share * 100)}%` }} /></span></span>
                  <span class="sbk-pips">{c.steps.map((st) => <Pip tier={st.tier} on={stepMet(c, st, snap)} />)}</span>
                </div>
              );
            })}
          </div>
        );
      })}
      <p class="sbk-sub" style="padding: 12px">Everything you had before the update is kept. Old trophies count as tiers and pay their stamps.</p>
    </>
  );
}

/** A page of the collection that has been opened: a customer, a guest or an event. */
export type CollectionPage = { kind: 'customer' | 'guest'; who: string } | { kind: 'event'; id: string };

/**
 * The whole card of a page that has been met, over the screen: the same card the game opens from a customer's ticket
 * (TradingCard; a guest is drawn as a guest) and the event deck's card (Gazette), with the card's own numbers, names
 * and text from the game data. A tap anywhere, or Escape, closes it and puts the focus back on the page.
 */
export function FullCard({ page, onClose }: { page: CollectionPage; onClose: () => void }) {
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const back = document.activeElement instanceof HTMLElement ? document.activeElement : null;
    ref.current?.focus();
    const key = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    window.addEventListener('keydown', key);
    return () => { window.removeEventListener('keydown', key); back?.focus(); };
  }, []);
  const card = cardOf(page);
  if (!card) return null;
  return (
    <div class="cd-pop sbk-pop" role="dialog" aria-modal="true" aria-label={card.title} tabIndex={-1} ref={ref} onClick={(e) => { e.stopPropagation(); onClose(); }}>
      <div class="cd-pop-in">
        {card.card}
        <small class="cd-pop-hint">Tap to close</small>
      </div>
    </div>
  );
}

/** A collection page's whole card and its title, or null for a page that is not in the game's decks. */
export function cardOf(page: CollectionPage): { title: string; card: VNode } | null {
  if (page.kind === 'event') {
    const event = EVENT_CARDS.find((e) => e.id === page.id);
    return event ? { title: event.title, card: <Gazette event={event} eager /> } : null;
  }
  const person = page.kind === 'customer' ? CUSTOMER_CARDS.find((c) => c.name === page.who) : EVENT_CARDS.find((e) => e.extra?.name === page.who)?.extra;
  return person ? { title: lookOf(person.name).title, card: <TradingCard who={person.name} wants={person.wants} guest={page.kind === 'guest'} eager /> } : null;
}

/** One page of the collection: the picture once met, which opens the whole card; a shadow until then. */
function Page({ met, src, pos, name, onOpen }: { met: boolean; src: string | null; pos?: string; name: string; onOpen: () => void }) {
  if (!met || !src) return <span class="sbk-th no" role="img" aria-label="Not met yet">?</span>;
  return (
    <button type="button" class="sbk-th" aria-label={name} aria-haspopup="dialog" onClick={() => { fx.tap(); onOpen(); }}>
      <img src={src} alt="" loading="lazy" decoding="async" draggable={false} style={pos ? { objectPosition: pos } : undefined} /><small>{name}</small>
    </button>
  );
}

export function CollectionTab({ snap, setOpen }: { snap: Snapshot; setOpen: (page: CollectionPage) => void }) {
  const customers = new Set(customersServed(snap));
  const guests = new Set(guestsServed(snap));
  const events = new Set(eventsSeen(snap));
  return (
    <>
      <div class="sbk-sec">
        <div class="sbk-row"><span class="sbk-lab">Customers</span><span>{customers.size} of {CUSTOMER_CARDS.length} served</span></div>
        <div class="sbk-thumbs">{CUSTOMER_CARDS.map((c) => <Page met={customers.has(c.name)} src={customerArt(c.name)} name={lookOf(c.name).title} onOpen={() => setOpen({ kind: 'customer', who: c.name })} />)}</div>
      </div>
      <div class="sbk-sec">
        <div class="sbk-row"><span class="sbk-lab">Guests</span><span>{guests.size} of {ALL_GUESTS.length} served</span></div>
        <div class="sbk-thumbs">{ALL_GUESTS.map((n) => <Page met={guests.has(n)} src={guestArt(n)} pos={focusCss(guestFocus(n))} name={lookOf(n).title} onOpen={() => setOpen({ kind: 'guest', who: n })} />)}</div>
      </div>
      <div class="sbk-sec">
        <div class="sbk-row"><span class="sbk-lab">Events</span><span>{events.size} of {EVENT_CARDS.length} seen</span></div>
        <div class="sbk-thumbs">{EVENT_CARDS.map((e) => <Page met={events.has(e.id)} src={eventArt(e.id)} pos={focusCss(eventFocus(e.id))} name={e.title} onOpen={() => setOpen({ kind: 'event', id: e.id })} />)}</div>
      </div>
      <p class="sbk-sub" style="padding: 12px">A page is a shadow until you serve that customer or see that event.</p>
    </>
  );
}

/**
 * The Trophies screen. `tab` is the page it opens on. `onLook` hears every change in the Wardrobe (online, it tells
 * the room what you have on).
 */
export function TrophyScreen({ tab: first = 'book', onBack, onLook }: { tab?: TrophyTab; onBack: () => void; onLook?: (look: LookSet) => void }) {
  const [tab, setTab] = useState<TrophyTab>(first);
  // What is stored is brought up to date once: tiers already reached, and the looks they and the level give.
  const [fresh] = useState(() => { syncTiers(); return syncLooks(); });
  const [look, setLook] = useState<LookSet>(() => worn());
  // A collection page's whole card, when one is open. It is drawn beside the screen, not in it, so the stamp book's
  // own text rules never reach into the card.
  const [card, setCard] = useState<CollectionPage | null>(null);
  const snap = snapshot();
  const place = placeOf(snap);
  return (
    <>
    <div class="sbk">
      <header class="sbk-bar">
        <button class="sbk-back" onClick={onBack} aria-label="Back"><BackArrow /></button>
        <h1>Trophies</h1>
        <span class="sbk-lv">Level {place.level}</span>
      </header>
      <nav class="sbk-tabs" aria-label="Trophies pages">
        {TABS.map((t) => <button type="button" class={tab === t.id ? 'on' : ''} aria-current={tab === t.id ? 'page' : undefined} onClick={() => { fx.tap(); setTab(t.id); }}>{t.title}</button>)}
      </nav>
      <main class="sbk-scroll">
        <div class="sbk-in">
          {tab === 'book' && <BookTab place={place} look={look} />}
          {tab === 'cards' && <CardsTab snap={snap} />}
          {tab === 'collection' && <CollectionTab snap={snap} setOpen={setCard} />}
          {tab === 'wardrobe' && <WardrobeTab look={look} fresh={fresh} place={place} snap={snap} onChange={(l) => { setLook(l); onLook?.(l); }} />}
        </div>
      </main>
    </div>
    {card && <FullCard page={card} onClose={() => setCard(null)} />}
    </>
  );
}
