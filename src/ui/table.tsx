// The visual table: farmers market in the centre, a stall for each player around it,
// customers queueing at the top. data-a attributes are animation anchors (see anim.ts).
import { useEffect, useRef, useState } from 'preact/hooks';
import { FAVOURS, FRUIT, FRUITS, TRAITS, UPGRADES, lookOf, stageAt, type FruitId } from '../engine/data';
import {
  buyCost, buyLimit, count, effectiveMax, shelfSize,
  type Customer, type GameState,
} from '../engine/game';
import { Coin, Face, FavourIcon, Fruit } from './art';
import { Icon } from './pixel';
import { TRAIT_ICON, UP_ICON } from './panel';
import { loadColour } from './progress';
import { lifeLabel, marketColumn, marketDayTomorrow, mood, nextLorry, pulse, stockChips, wantText } from './boardModel';
import lorryUrl from './img/lorry.png';
import { C } from './palette';

/** Each player's awning colour. */
export const SEAT_COLOURS = [C.terracotta, C.teal, C.c_7d8c3a, C.c_3d4f86];
const seat = (p: number) => ({ '--awn': SEAT_COLOURS[p % SEAT_COLOURS.length] } as any);

export function Pile({ f, n, pos, size = 20 }: { f: FruitId; n: number; pos: number; size?: number }) {
  if (n <= 0) return null;
  const stage = stageAt(f, pos);
  const shown = Math.min(n, 3);
  return (
    <span class={`pile p${shown}`}>
      {Array.from({ length: shown }, (_, i) => (
        <span class="pi" style={{ '--i': i } as any}><Fruit id={f} size={size} stage={stage} /></span>
      ))}
      {n > 1 && <b class="pn">{n}</b>}
    </span>
  );
}

// ---------- market ----------

/** The farmers market: one column per fruit, newest slot at the top, freshness by colour. */
export function Market({ s, p, onPick, canPick, onPulse }: {
  s: GameState; p: number; onPick?: (f: FruitId, pos: number) => void; canPick?: (f: FruitId, pos: number) => boolean;
  onPulse?: () => void;
}) {
  const pz = pulse(s);
  return (
    <div class="market-stall">
      <div class="mk-roof" />
      <div class="mk-head">
        <span class="truck" data-a="truck"><Icon name="cart" size={28} /></span>
        <b>Wholesale Market</b>
        {!!s.event?.cost && <span class={`chip ${s.event.cost > 0 ? 'warn' : 'good'}`}>{s.event.cost > 0 ? '+' : '−'}${Math.abs(s.event.cost)} each today</span>}
      </div>
      <div class="mk-cols">
        {s.phase === 'evening' && (
          <div class="mk-cover" aria-label="The market is closed for the night"><Icon name="moon" size={32} /><b>Crates covered</b><small>All fruit ages one night</small></div>
        )}
        {FRUITS.map((f, i) => (
          <div class="mk-col">
            <button type="button" class={`pz ${mood(pz[i])}`} data-a={`mk-${f}`} onClick={(e) => { e.stopPropagation(); onPulse?.(); }}
              aria-label={`${FRUIT[f].plural}: ${wantText(pz[i])} wanted, ${pz[i].supply} in stalls`}>
              <Fruit id={f} size={18} />
              <span class="pz-n"><span><b>{wantText(pz[i])}</b> want</span><span><b>{pz[i].supply}</b> in stalls</span></span>
            </button>
            {marketColumn(s, f).map(({ pos, stage, n }) => {
              const ok = !!onPick && n > 0 && (!canPick || canPick(f, pos));
              return (
                <button type="button" class={`mk-cell st-${stage} ${ok ? 'pick' : ''} ${n ? 'has' : ''}`}
                  data-a={`m-${f}-${pos}`} disabled={!ok} onClick={() => ok && onPick!(f, pos)}
                  aria-label={`${FRUIT[f].name}, ${stage === 'notso' ? 'tired' : stage}, $${buyCost(s, p, f, pos)}, ${n} left`}>
                  <Pile f={f} n={n} pos={pos} size={18} />
                  <span class="price">${buyCost(s, p, f, pos)}</span>
                </button>
              );
            })}
          </div>
        ))}
      </div>
      <div class="mk-key" aria-hidden="true">
        <span><i class="st-unripe" />green</span><span><i class="st-fresh" />fresh</span><span><i class="st-okay" />okay</span><span><i class="st-notso" />tired</span>
      </div>
      <NextLorry s={s} />
    </div>
  );
}

/** What tomorrow's lorry brings (public: everyone sees the same). */
export function NextLorry({ s, cls = '' }: { s: GameState; cls?: string }) {
  const lines = nextLorry(s);
  if (s.phase === 'over') return null;
  if (!lines) return null;
  return (
    <div class={`next-lorry ${marketDayTomorrow(s) ? 'market-day ' : ''}${cls}`} aria-label={`Tomorrow's lorry: ${lines.map((l) => `${l.n} ${FRUIT[l.f].plural}${l.green ? ' (green)' : ''}`).join(', ')}`}>
      <span class="nl-title">Tomorrow's lorry</span>
      {lines.map((l) => (
        <span class={`nl-f ${l.plenty ? 'plenty' : 'few'}`}><Fruit id={l.f} size={16} stage={l.green ? 'unripe' : 'fresh'} />×{l.n}</span>
      ))}
      {marketDayTomorrow(s) && <span class="nl-note">Market Day: one more walk-in</span>}
    </div>
  );
}

// ---------- price boards ----------

/** A shop's price board for the current showdown: sealed while pricing, flipped open at the reveal. */
export interface Board { state: 'thinking' | 'sealed' | 'open'; price?: number; res?: 'won' | 'lost'; tag?: string; /** A computer prices after the people at the table. */ ai?: boolean }

export function SeatBoard({ b }: { b: Board }) {
  if (b.state === 'thinking') {
    return b.ai
      ? <span class="sb thinking" aria-label="Prices next, after you"><i class="sb-hourglass" aria-hidden="true" />next in line</span>
      : <span class="sb thinking" aria-label="Still deciding prices"><i class="sb-hourglass" aria-hidden="true" />deciding<span class="waiting-dots" /></span>;
  }
  return (
    <span class={`sb ${b.state} ${b.res ?? ''}`}>
      <span class="sb-face">{b.state === 'open' ? `$${b.price}` : <i class="seal" aria-label="Sealed price" />}</span>
      {b.tag ? <small>{b.tag}</small> : b.state === 'sealed' && <small>sealed</small>}
    </span>
  );
}

// ---------- rivals ----------

/** A rival's seat across the table. Tap it to open their stall below the seats. */
export function RivalStall({ s, p, open, onOpen, board }: { s: GameState; p: number; open?: boolean; onOpen: () => void; board?: Board }) {
  const pl = s.players[p];
  const active = (s.phase === 'buy' || s.phase === 'evening') && s.order[s.turn] === p;
  const night = s.phase === 'evening';
  return (
    <button type="button" class={`rival-stall ${active ? 'active' : ''} ${open ? 'open' : ''} ${board?.res === 'won' ? 'won' : ''}`} style={seat(p)} data-a={`p${p}`}
      onClick={(e) => { e.stopPropagation(); onOpen(); }} aria-expanded={!!open} aria-label={`${pl.name}'s stall: $${pl.cash}. Tap to see their fruit`}>
      <div class="rs-awning" />
      <div class="rs-who">
        <span class="rs-face"><Face who={pl.avatar} size={26} />{active && s.phase === 'buy' && <i class="busy"><Icon name="cart" size={14} /></i>}</span>
        <span class="rs-name">{pl.name} <span class="rs-arrow">{open ? '▴' : '▾'}</span></span>
        {night && <span class="rs-lamp" title="Plotting by lantern light"><Icon name="lantern" size={16} /></span>}
      </div>
      <div class="rs-stock">
        <span class="chip cash" data-a={`p${p}-cash`}><Coin size={12} />{pl.cash}</span>
        {FRUITS.map((f) => {
          const n = count(pl.stock, f);
          // Empty fruits shrink to nothing but stay in place as animation anchors.
          return <span class={`rs-f ${n ? '' : 'zero'}`} data-a={`p${p}-${f}`} aria-hidden={!n}><Fruit id={f} size={14} />{n}</span>;
        })}
        {board && <SeatBoard b={board} />}
        {night ? <span class="rs-empty">{active ? 'building…' : 'plotting…'}</span> : count(pl.stock) === 0 && <span class="rs-empty">empty</span>}
      </div>
    </button>
  );
}

/** A rival's stall, opened from their seat: the same freshness chips as your own stall. */
export function RivalDrop({ s, p, onClose }: { s: GameState; p: number; onClose: () => void }) {
  const pl = s.players[p];
  return (
    <div class="rival-drop" style={seat(p)} role="dialog" aria-label={`${pl.name}: stall`} onClick={(e) => e.stopPropagation()}>
      <div class="rs-awning" />
      <div class="rd-head">
        <Face who={pl.avatar} size={30} />
        <b>{pl.name}{pl.name.endsWith('s') ? "'" : "'s"} stall</b>
        {pl.trait && <span class="trait-badge" title={TRAITS[pl.trait].text}><Icon name={TRAIT_ICON[pl.trait]} size={11} />{TRAITS[pl.trait].title}</span>}
        <span class="chip cash"><Coin size={12} />{pl.cash}</span>
        <button type="button" class="rd-close" onClick={onClose} aria-label="Close">×</button>
      </div>
      <StockChips s={s} p={p} empty="Nothing on the shelf yet." />
      {(pl.upgrades.length > 0 || pl.favours.length > 0) && (
        <div class="rd-extra">
          {pl.upgrades.map((u) => <span class="chip"><Icon name={UP_ICON[u]} size={14} />{UPGRADES[u].title}</span>)}
          {pl.favours.length > 0 && <span class="chip">{pl.favours.length} favour card{pl.favours.length > 1 ? 's' : ''}</span>}
        </div>
      )}
    </div>
  );
}

/** Freshness chips for a shop's stock. With `anchors`, fruit can fly to and from them. */
export function StockChips({ s, p, anchors, empty }: { s: GameState; p: number; anchors?: boolean; empty: string }) {
  const groups = stockChips(s.players[p].stock);
  const any = groups.some((g) => g.chips.length > 0);
  return (
    <div class="stk">
      {groups.map(({ f, chips }) => (
        <span class="stk-f" data-a={anchors ? `p${p}-${f}` : undefined}>
          {chips.map(({ pos, stage, n }) => (
            <span class={`ms-cell has st-${stage} ${pos === 0 ? 'rotting' : ''}`} data-a={anchors ? `p${p}-${f}-${pos}` : undefined}
              title={`${FRUIT[f].name}: ${stage === 'notso' ? 'tired' : stage}${FRUIT[f].drop[pos] ? `, customers pay $${FRUIT[f].drop[pos]} less` : ''}`}>
              <Fruit id={f} size={20} stage={stage} />{n > 1 && <b>×{n}</b>}<span>{lifeLabel(f, pos)}</span>
            </span>
          ))}
        </span>
      ))}
      {!any && <span class="stk-empty">{empty}</span>}
    </div>
  );
}

// ---------- your stall ----------

export function MyStall({ s, p, onCard, flashCards, board }: { s: GameState; p: number; onCard?: (i: number) => void; flashCards?: boolean; board?: Board }) {
  const pl = s.players[p];
  const mine = loadColour();
  const active = (s.phase === 'buy' || s.phase === 'evening') && s.order[s.turn] === p;
  return (
    <div class={`my-stall ${active ? 'active' : ''}`} style={mine ? ({ '--awn': mine } as any) : seat(p)} data-a={`p${p}`}>
      <div class="ms-awning" />
      <div class="ms-head">
        <span class="ms-face"><Face who={pl.avatar} size={30} /></span>
        <b class="ms-name">{pl.name}</b><span class="you-tag">YOU</span>
        {pl.trait && <span class="trait-badge" title={TRAITS[pl.trait].text}><Icon name={TRAIT_ICON[pl.trait]} size={12} />{TRAITS[pl.trait].title}</span>}
        <span class="chip" title="Shelf space"><Icon name="crate" size={16} /> {count(pl.stock)}/{shelfSize(pl)}</span>
        {s.phase === 'buy' && active && <span class="chip buys" title="Fruit bought today"><Icon name="cart" size={16} /> {pl.boughtToday}/{buyLimit(pl)}</span>}
        {s.day === s.config.days && s.phase !== 'over' && count(pl.stock) > 0 && <span class="chip warn zero-warn">Unsold = $0</span>}
        <span class="spacer" />
        {board && <SeatBoard b={board} />}
        {pl.upgrades.map((u) => <span class="ms-up" title={UPGRADES[u].title}><Icon name={UP_ICON[u]} size={20} /></span>)}
        <span class="chip cash big" data-a={`p${p}-cash`}><Coin size={16} />{pl.cash}</span>
      </div>
      <StockChips s={s} p={p} anchors empty="Empty shelf. Tap fruit in the market to buy." />
      {pl.favours.length > 0 && (
        <div class={`ms-cards ${flashCards ? 'glow' : ''}`}>
          {pl.favours.map((id, i) => {
            const usable = !!onCard && active && FAVOURS[id].when === s.phase;
            return (
              <button type="button" class={`fcard ${usable ? 'usable' : ''}`} onClick={() => onCard?.(i)} title={FAVOURS[id].text}>
                <FavourIcon id={id} size={20} /><small>{FAVOURS[id].title}</small>
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}

// ---------- delivery lorry ----------

/**
 * The farmer's lorry: drives into the street with the morning delivery, stays while shops buy,
 * and drives off when buying ends. Decoration only; fruit flies from it in animator.delivery().
 */
export function Lorry({ here }: { here: boolean }) {
  const was = useRef(here);
  const [leaving, setLeaving] = useState(false);
  useEffect(() => {
    if (was.current && !here) setLeaving(true);
    if (here) setLeaving(false);
    was.current = here;
  }, [here]);
  if (!here && !leaving) return null;
  return (
    <img class={`lorry ${here ? 'here' : 'leaving'}`} src={lorryUrl} alt="" aria-hidden="true" data-a="lorry"
      width={150} height={58} onAnimationEnd={() => { if (!here) setLeaving(false); }} />
  );
}

// ---------- customers ----------

export function face(name: string) {
  return lookOf(name).icon;
}

type Kind = 'waiting' | 'new' | 'today' | 'tomorrow' | 'mystery';

export function CustomerChar({ s, c, kind, onTip, later, heard }: { s: GameState; c?: Customer | null; kind: Kind; onTip?: (c: Customer) => void; later?: boolean; heard?: boolean }) {
  if (kind === 'mystery' || !c) {
    // Face down: only the fruits printed on the card's back show.
    const backs = c ? [...new Set(c.wants.map((w) => w.fruit))] : [];
    return (
      <div class={`cust mystery ${later ? 'tomorrow' : ''}`} aria-label={backs.length ? `Walk-in, wants ${backs.map((f) => FRUIT[f].plural).join(' and ')}` : 'Walk-in'}>
        <div class="bubble">{backs.length ? backs.map((f) => <Fruit id={f} size={16} />) : <span class="q">?</span>}</div>
        <div class="cface"><Face who="shopper" size={34} /></div>
        <small>{later ? 'tomorrow' : 'walk-in'}</small>
      </div>
    );
  }
  const done = c.wants.every((w) => w.qty <= 0);
  const special = c.name === s.event?.extra?.name;
  return (
    <div class={`cust ${kind} ${done ? 'happy' : ''} ${special ? 'special' : ''} ${heard ? 'heard' : ''}`} data-a={c.id > 0 ? `c${c.id}` : undefined}
      onClick={(e) => { e.stopPropagation(); onTip?.(c); }}
      title={c.wants.map((w) => `${FRUIT[w.fruit].name}: wants ${w.qty}, pays up to $${effectiveMax(s, w, c.generous)} each when fresh`).join('\n')}>
      <div class="bubble">
        {c.wants.map((w) => (
          <span class={`bw ${w.qty <= 0 ? 'done' : ''}`} data-a={`c${c.id}-${w.fruit}`}>
            <Fruit id={w.fruit} size={18} />
            <b>{w.qty <= 0 ? '✓' : `×${w.qty}`}</b>
            <span class={`bp ${effectiveMax(s, w, c.generous) > w.max ? 'up' : effectiveMax(s, w, c.generous) < w.max ? 'down' : ''}`}>${effectiveMax(s, w, c.generous)}<small>/ea</small></span>
          </span>
        ))}
      </div>
      <div class="cface"><Face who={c.name} size={34} />{done && <i class="happy-mark"><Icon name="heart" size={14} /></i>}{kind === 'waiting' && <i class="clock"><Icon name="hourglass" size={14} /></i>}{special && <i class="star"><Icon name="star" size={14} /></i>}{heard && <i class="ear" title="You heard about this walk-in (Gossip)"><Icon name="ear" size={14} /></i>}</div>
      <small>{kind === 'tomorrow' ? 'tomorrow' : lookOf(c.name).title}</small>
    </div>
  );
}

export function Street({ s, viewer, onTip }: { s: GameState; viewer: number; onTip?: (c: Customer) => void }) {
  const before = s.phase === 'morning' || s.phase === 'buy';
  const extra = s.event?.extra;
  // Walk-ins wait face down; a player who heard the gossip sees their fronts.
  const walkIn = (c: Customer, later: boolean) => c.seenBy?.includes(viewer)
    ? <CustomerChar key={c.id} s={s} c={c} kind={later ? 'tomorrow' : 'today'} onTip={onTip} heard />
    : <CustomerChar key={c.id} s={s} c={c} kind="mystery" later={later} />;
  return (
    <div class="street">
      {s.secondMarket.map((c) => <CustomerChar key={c.id} s={s} c={c} kind="waiting" onTip={onTip} />)}
      {s.firstMarket.map((c) => <CustomerChar key={c.id} s={s} c={c} kind="new" onTip={onTip} />)}
      {before && <CustomerChar key={s.forecast?.id} s={s} c={s.forecast} kind="today" onTip={onTip} />}
      {before && extra && <CustomerChar key="extra" s={s} c={{ id: -1, name: extra.name, wants: extra.wants, original: extra.wants }} kind="today" onTip={onTip} />}
      {before && s.queue.map((c) => walkIn(c, false))}
      {!before && s.forecast && s.phase !== 'over' && <CustomerChar key={s.forecast.id} s={s} c={s.forecast} kind="tomorrow" onTip={onTip} />}
      {!before && s.phase !== 'over' && s.queue.map((c) => walkIn(c, true))}
    </div>
  );
}

/** The other players in turn order after the viewer, as they sit across the table. */
export function seats(n: number, viewer: number): { p: number }[] {
  return Array.from({ length: n - 1 }, (_, i) => ({ p: (viewer + 1 + i) % n }));
}
