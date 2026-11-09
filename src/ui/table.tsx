// The visual table: farmers market in the centre, a stall for each player around it,
// customers queueing at the top. data-a attributes are animation anchors (see anim.ts).
import { useEffect, useRef, useState } from 'preact/hooks';
import { FAVOURS, FRUIT, FRUITS, PREF_INFO, TRAITS, UPGRADES, lookOf, prefOf, stageAt, trackSlots, type FruitId, type Stage } from '../engine/data';
import {
  buyCost, buyLimit, count, effectiveMax, forSale, shelfSize,
  type Customer, type GameState,
} from '../engine/game';
import { Coin, Face, FavourIcon, Fruit } from './art';
import { TradingCard, TradingCardBack } from './cards';
import { GUEST_EVENT } from './deckArt';
import { shownCash, useCashShown } from './cashShown';
import { shownSold, shownStock, useStockShown } from './stockShown';
import { TRAIT_ICON, UP_ICON } from './panel';
import { loadColour } from './progress';
import { SEEN_WALK_IN, lifeLabel, marketDayTomorrow, mood, nextLorry, nextLorryName, pulse, shownColumn, stockChips, wantText } from './boardModel';
import { closingNote } from '../engine/story';
import { C } from './palette';
import { Icon, LorrySprite, PropSprite, RoofBand } from './icons';
import { partsOf, stallOf } from '../net/looks';

/** Each player's awning colour (deck-art red, green, mustard and blue, DEC-066). */
export const SEAT_COLOURS = [C.xRed, C.xGreen, C.xMustardDark, C.xSkyDark];
export const seatColour = (p: number) => SEAT_COLOURS[p % SEAT_COLOURS.length];

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
export function Market({ s, p, onPick, canPick, onPulse, lorry }: {
  s: GameState; p: number; onPick?: (f: FruitId, pos: number) => void; canPick?: (f: FruitId, pos: number) => boolean;
  onPulse?: () => void;
  /** The farmer's lorry parks at the market's sign from the morning delivery until buying ends (the game screen). */
  lorry?: boolean;
}) {
  const pz = pulse(s);
  // The columns as drawn: a green slot no lorry ever fills (the watermelon's) is left out (shownColumn); a slot with
  // fruit in it always shows. Every column's slots are the same height, sized for the longest column (screens.css
  // --rows). When the market is short of room (a small phone), the empty slots below the lowest fruit in any column
  // step aside and the rest grow (--rows-fit, .tail in styles.css): a slot with fruit in it is never hidden.
  const cols = FRUITS.map((f) => shownColumn(s, f));
  const rows = Math.max(...cols.map((c) => c.length));
  const fit = Math.max(3, ...cols.map((c) => c.reduce((a, x, i) => (x.n > 0 ? i + 1 : a), 0)));
  return (
    <div class="market-stall" style={{ '--rows': rows, '--rows-fit': Math.min(rows, fit) }}>
      <div class="mk-roof" />
      <div class="mk-head">
        <span class="truck" data-a="truck"><Icon name="cart" size={28} /></span>
        {lorry !== undefined && <Lorry here={lorry} />}
        <b>Wholesale Market</b>
        {!!s.event?.cost && <span class={`chip ${s.event.cost > 0 ? 'warn' : 'good'}`}>{s.event.cost > 0 ? '+' : '−'}${Math.abs(s.event.cost)} each today</span>}
      </div>
      <div class="mk-cols">
        {s.phase === 'evening' && (
          <div class="mk-cover" aria-label="The market is closed for the night"><Icon name="moon" size={32} /><b>Crates covered</b><small>All fruit ages one night</small></div>
        )}
        {FRUITS.map((f, i) => (
          <div class={`mk-col ${f}`}>
            <button type="button" class={`pz ${mood(pz[i])}`} data-a={`mk-${f}`} onClick={(e) => { e.stopPropagation(); onPulse?.(); }}
              aria-label={`${FRUIT[f].plural}: ${wantText(pz[i])} wanted, ${pz[i].supply} in stalls`}>
              <Fruit id={f} size={18} />
              <span class="pz-n"><span><b>{wantText(pz[i])}</b> want</span><span><b>{pz[i].supply}</b> in stalls</span></span>
            </button>
            {cols[i].map(({ pos, stage, n }, row) => {
              const ok = !!onPick && n > 0 && (!canPick || canPick(f, pos));
              return (
                <button type="button" class={`mk-cell st-${stage} ${ok ? 'pick' : ''} ${n ? 'has' : ''} ${trackSlots(f).find((t) => t.pos === pos)?.entry ? 'entry' : ''} ${row >= fit ? 'tail' : ''}`}
                  data-a={`m-${f}-${pos}`} disabled={!ok} onClick={() => ok && onPick!(f, pos)}
                  aria-label={`${FRUIT[f].name}, ${stage === 'notso' ? 'tired' : stage}, $${buyCost(s, p, f, pos)}, ${n} left`}>
                  {n > 0 ? <Pile f={f} n={n} pos={pos} size={18} /> : <span class="gh"><Fruit id={f} size={18} stage={stage} /></span>}
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
      {nextLorryName(s) && <span class="nl-name">{nextLorryName(s)}</span>}
      <span class="nl-fruits">
        {lines.map((l) => (
          <span class={`nl-f ${l.plenty ? 'plenty' : 'few'}`}><Fruit id={l.f} size={16} stage={l.green ? 'unripe' : 'fresh'} />×{l.n}</span>
        ))}
      </span>
      {marketDayTomorrow(s) && <span class="nl-note">Market Day: more walk-ins</span>}
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

/** What a rival's pill says under their name: crates before the stalls open, pieces out once they have. Public facts only. */
function rivalNote(s: GameState, p: number, active: boolean): string {
  if (s.phase === 'evening') return active ? 'building…' : 'plotting…';
  if (s.phase === 'bid' || s.phase === 'reveal') {
    // At the bell the pieces still out drop as each customer is served (stockShown.ts).
    const sold = (f: FruitId) => (s.phase === 'reveal' ? shownSold(s.results, p, f) : 0);
    const out = FRUITS.reduce((a, f) => a + Math.max(0, forSale(s, p, f) - sold(f)), 0);
    return out ? `${out} out` : 'none out';
  }
  const n = count(shownStock(p, s.players[p].stock));
  return n ? `${n} fruit` : 'empty';
}

/**
 * A rival as a pill in the rivals strip: badge, name, cash and a short note (and their price board while
 * pricing and at the bell). Tap it to open their stall below the strip. `rv-chip`: the rival cash chips that
 * used to sit in the top bar live here now.
 */
export function RivalStall({ s, p, open, onOpen, board, off }: { s: GameState; p: number; open?: boolean; onOpen: () => void; board?: Board; off?: boolean }) {
  useCashShown();
  useStockShown();
  const pl = s.players[p];
  const cash = shownCash(p, pl.cash);
  const active = (s.phase === 'buy' || s.phase === 'evening') && s.order[s.turn] === p;
  const note = rivalNote(s, p, active);
  // Spoken with the pill: the price board's state (on a phone it is only a small badge on the portrait).
  const said = !board ? '' : board.state === 'thinking' ? (board.ai ? ', prices next, after you' : ', still deciding')
    : board.state === 'sealed' ? ', sealed' : `, price $${board.price}${board.res === 'won' ? ', sold' : board.res === 'lost' ? ', no sale' : ''}`;
  return (
    <button type="button" class={`rival-stall rv-chip ${active ? 'active' : ''} ${open ? 'open' : ''} ${board?.res === 'won' ? 'won' : ''} ${off ? 'off' : ''}`} data-a={`p${p}`}
      style={{ '--seat': seatColour(p) }}
      onClick={(e) => { e.stopPropagation(); onOpen(); }} aria-expanded={!!open} aria-label={`${pl.name}'s stall: $${cash}, ${note}${said}. Tap to see their fruit`}>
      <span class="rs-face"><Face who={pl.avatar} size={30} worn={partsOf(pl.look)} />{active && s.phase === 'buy' && <i class="busy"><Icon name="cart" size={12} /></i>}</span>
      <span class="rs-body">
        <span class="rs-name">{pl.name}</span>
        <span class="rs-line"><b class="rs-cash" data-a={`p${p}-cash`}>${cash}</b><span class="rs-note">{note}</span></span>
      </span>
      {board && <SeatBoard b={board} />}
      {s.phase === 'evening' && <span class="rs-lamp" title="Plotting by lantern light"><Icon name="lantern" size={14} /></span>}
    </button>
  );
}

/** A rival's stall, opened from their seat: the same freshness chips as your own stall. */
export function RivalDrop({ s, p, onClose }: { s: GameState; p: number; onClose: () => void }) {
  useCashShown();
  useStockShown();
  const pl = s.players[p];
  return (
    <div class="rival-drop" role="dialog" aria-label={`${pl.name}: stall`} onClick={(e) => e.stopPropagation()}>
      <RoofBand cls="rs-awning" colour={seatColour(p)} roof={stallOf(pl.look).roof} trim={stallOf(pl.look).trim} />
      {stallOf(pl.look).prop && <PropSprite id={stallOf(pl.look).prop!} size={30} />}
      <div class="rd-head">
        <Face who={pl.avatar} size={30} worn={partsOf(pl.look)} />
        <b>{pl.name}{pl.name.endsWith('s') ? "'" : "'s"} stall</b>
        {pl.trait && <span class="trait-badge" title={TRAITS[pl.trait].text}><Icon name={TRAIT_ICON[pl.trait]} size={11} />{TRAITS[pl.trait].title}</span>}
        <span class="chip cash"><Coin size={12} />{shownCash(p, pl.cash)}</span>
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
  const groups = stockChips(shownStock(p, s.players[p].stock));
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

// ---------- your stall: the shelf dock ----------

/** Freshness groups in the order the shelf dock shows them, and the word for each. */
const SHELF_STAGES: Stage[] = ['fresh', 'okay', 'notso', 'unripe'];
const STAGE_WORD: Record<Stage, string> = { fresh: 'fresh', okay: 'okay', notso: 'tired', unripe: 'green' };

/** A shelf's pieces of each fruit counted by freshness (fresh, okay, tired, green), for the shelf dock. */
export function shelfGroups(stock: Record<FruitId, number[]>): { f: FruitId; n: number; stages: { stage: Stage; n: number }[] }[] {
  return FRUITS.map((f) => {
    const by: Partial<Record<Stage, number>> = {};
    stock[f].forEach((n, pos) => { if (n > 0) { const st = stageAt(f, pos); by[st] = (by[st] ?? 0) + n; } });
    const stages = SHELF_STAGES.filter((st) => by[st]).map((st) => ({ stage: st, n: by[st] ?? 0 }));
    return { f, n: stages.reduce((a, x) => a + x.n, 0), stages };
  });
}

/**
 * Your shelf, docked above the action bar so it is always in view: badge and name, the four fruits with your
 * pieces counted by freshness, shelf space, and favour cards as small buttons. Fruit flies to and from the
 * fruit groups (data-a anchors); your cash is in the top bar.
 */
export function MyStall({ s, p, onCard, flashCards, board }: { s: GameState; p: number; onCard?: (i: number) => void; flashCards?: boolean; board?: Board }) {
  const pl = s.players[p];
  // During the rush (the table redraws the dock as each customer is served: Game.tsx useStockShown) the shelf drops as each customer is served (stockShown.ts); otherwise this is the real shelf.
  const shelf = shownStock(p, pl.stock);
  const mine = loadColour();
  // Looks the player has earned (looks.ts) are part of their seat, so rivals online see them too.
  const stall = stallOf(pl.look);
  const active = (s.phase === 'buy' || s.phase === 'evening') && s.order[s.turn] === p;
  const used = count(shelf);
  const cap = shelfSize(pl);
  // The final day: what fruit left on the shelf tonight is worth ("Leftovers = $1 each", "Unsold = $0").
  const closing = closingNote(s, p)?.chip;
  return (
    <section class={`my-stall dock ${active ? 'active' : ''} ${stall.prop ? 'has-prop' : ''}`} data-a={`p${p}`} aria-label="Your shelf">
      <RoofBand cls="ms-awning" colour={mine || seatColour(p)} roof={stall.roof} trim={stall.trim} />
      <div class="ms-head">
        <span class="ms-face"><Face who={pl.avatar} size={34} worn={partsOf(pl.look)} /></span>
        <span class="dk-id"><b class="ms-name">{pl.name}</b>{pl.name.trim().toLowerCase() !== 'you' && <span class="you-tag">YOU</span>}</span>
        {pl.trait && <span class="trait-badge" title={TRAITS[pl.trait].text}><Icon name={TRAIT_ICON[pl.trait]} size={12} />{TRAITS[pl.trait].title}</span>}
        <span class={`chip dk-space ${used >= cap ? 'full' : ''}`} title="Shelf space" aria-label={`Shelf space: ${used} of ${cap} used`}><Icon name="crate" size={14} />{used}/{cap}</span>
        {s.phase === 'buy' && active && <span class="chip buys" title="Fruit bought today"><Icon name="cart" size={14} /> {pl.boughtToday}/{buyLimit(pl)}</span>}
        {closing && <span class="chip warn zero-warn">{closing}</span>}
        {board && <SeatBoard b={board} />}
        {pl.upgrades.map((u) => <span class="ms-up" title={UPGRADES[u].title}><Icon name={UP_ICON[u]} size={16} /></span>)}
        {stall.prop && <PropSprite id={stall.prop} size={26} />}
        {pl.favours.length > 0 && (
          <span class={`ms-cards ${flashCards ? 'glow' : ''}`}>
            {pl.favours.map((id, i) => {
              const usable = !!onCard && active && FAVOURS[id].when === s.phase;
              return (
                <button type="button" class={`fcard ${usable ? 'usable' : ''}`} onClick={() => onCard?.(i)} title={FAVOURS[id].text} aria-label={`Favour card: ${FAVOURS[id].title}`}>
                  <FavourIcon id={id} size={20} /><small>{FAVOURS[id].title}</small>
                </button>
              );
            })}
          </span>
        )}
      </div>
      <div class="stk dk-fruits">
        {shelfGroups(shelf).map(({ f, n, stages }) => (
          <span class={`stk-f dk-f ${n ? '' : 'none'}`} data-a={`p${p}-${f}`}
            aria-label={`${FRUIT[f].plural}: ${n ? stages.map((x) => `${x.n} ${STAGE_WORD[x.stage]}`).join(', ') : 'none'}`}>
            <Fruit id={f} size={20} />
            {n ? stages.map(({ stage, n: k }) => (
              <span class={`ms-cell has st-${stage} ${stage === 'notso' ? 'rotting' : ''}`}
                title={`${k} ${FRUIT[f].name.toLowerCase()}: ${STAGE_WORD[stage]}${stage === 'okay' ? `, customers pay $${FRUIT[f].drop[1]} less` : stage === 'notso' ? `, last day, customers pay $${FRUIT[f].drop[0]} less` : stage === 'unripe' ? ', ripens on your shelf' : ''}`}>
                <b>{k}</b><small>{STAGE_WORD[stage]}</small>
              </span>
            )) : <span class="dk-zero">0</span>}
          </span>
        ))}
      </div>
    </section>
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
    <span class={`lorry ${here ? 'here' : 'leaving'}`} aria-hidden="true" data-a="lorry"
      onAnimationEnd={(e) => { if (!here && e.target === e.currentTarget) setLeaving(false); }}>
      <LorrySprite />
    </span>
  );
}

// ---------- customers ----------

export function face(name: string) {
  return lookOf(name).icon;
}

type Kind = 'waiting' | 'new' | 'today' | 'tomorrow' | 'mystery';

/**
 * A size step for the name banner on a small card (styles.css .nm-*): the banner is one line, and at five cards
 * across a phone the longer names would run off the card's edge at the standard size.
 */
export function nameSize(name: string): string | undefined {
  const n = lookOf(name).title.length;
  return n > 16 ? 'nm-xl' : n > 11 && n <= 14 ? 'nm-m' : undefined;
}

export function CustomerChar({ s, c, kind, onTip, later, heard, onPick, rush }: {
  s: GameState; c?: Customer | null; kind: Kind; onTip?: (c: Customer) => void; later?: boolean; heard?: boolean; onPick?: () => void;
  /** In the rush: 'away' while the card is up in the pop-up, 'served' once it is back with a tick. */
  rush?: 'away' | 'served';
}) {
  if (kind === 'mystery' || !c) {
    // Face down: only the card's back shows, with the fruit printed on it. No name, type, amount, price or
    // portrait, and no picture is requested until the card is face up for this player.
    const backs = c ? [...new Set(c.wants.map((w) => w.fruit))] : [];
    return (
      <div class={`cust mystery ${later ? 'tomorrow' : ''} ${onPick ? 'pickable' : ''}`} aria-label={backs.length ? `Walk-in, wants ${backs.map((f) => FRUIT[f].plural).join(' and ')}` : 'Walk-in'}
        role={onPick ? 'button' : undefined} onClick={onPick ? (e) => { e.stopPropagation(); onPick(); } : undefined}>
        <TradingCardBack fruits={backs} compact />
        <small class="cust-tag">{later ? 'tomorrow' : 'walk-in'}</small>
      </div>
    );
  }
  const done = c.wants.every((w) => w.qty <= 0);
  const special = c.name === s.event?.extra?.name;
  // The card prints today's price (events and generous customers change it). Finished lines are ticked and
  // changed prices tinted through the lnN-* classes (screens.css).
  const shown = c.wants.map((w) => ({ ...w, max: effectiveMax(s, w, c.generous) }));
  const marks = c.wants.map((w, i) => `${w.qty <= 0 ? ` ln${i + 1}-done` : ''}${shown[i].max > w.max ? ` ln${i + 1}-up` : shown[i].max < w.max ? ` ln${i + 1}-down` : ''}`).join('');
  return (
    <div class={`cust ${kind} ${done ? 'happy' : ''} ${special ? 'special' : ''} ${heard ? 'heard' : ''}${marks}${rush ? ` rush-${rush}` : ''}`} data-a={c.id > 0 ? `c${c.id}` : undefined}
      onClick={(e) => { e.stopPropagation(); onTip?.(c); }}
      title={`${c.pref ? `${PREF_INFO[c.pref].title}: ${PREF_INFO[c.pref].text}\n` : ''}${c.wants.map((w, i) => `${FRUIT[w.fruit].name}: ${w.qty <= 0 ? 'done' : `wants ${w.qty}, pays up to $${shown[i].max} each when fresh`}`).join('\n')}`}>
      <TradingCard who={c.name} wants={shown} compact guest={!!GUEST_EVENT[c.name]} eager class={nameSize(c.name)} />
      {(done || kind === 'waiting' || special || heard) && (
        <span class="cust-marks">
          {done && <i class="happy-mark"><Icon name="heart" size={14} /></i>}
          {kind === 'waiting' && <i class="clock" title="Waiting since yesterday"><Icon name="hourglass" size={14} /></i>}
          {special && <i class="star" title="Special guest"><Icon name="star" size={14} /></i>}
          {heard && <i class="ear" title={SEEN_WALK_IN}><Icon name="ear" size={14} /></i>}
        </span>
      )}
      {kind === 'tomorrow' ? <small class="cust-tag">tomorrow</small> : c.pref && <em class={`pref pref-${c.pref}`}>{PREF_INFO[c.pref].short}</em>}
      {rush === 'served' && <i class="rush-tick" role="img" aria-label="Served">✓</i>}
    </div>
  );
}

/** Today's customers, side by side as compact cards (tomorrow's are in the Tomorrow strip). */
export function Street({ s, viewer, onTip, onScout, away, served }: {
  s: GameState; viewer: number; onTip?: (c: Customer) => void; onScout?: (id: number) => void;
  /** The rush pop-up: the customer whose card is up in the middle, and those already served. */
  away?: number; served?: number[];
}) {
  const rush = (c: Customer) => (c.id === away ? 'away' : served?.includes(c.id) ? 'served' : undefined);
  const before = s.phase === 'morning' || s.phase === 'buy';
  const extra = s.event?.extra;
  // Walk-ins wait face down; a player who played Gossip or Scout on one sees its front.
  const walkIn = (c: Customer) => c.seenBy?.includes(viewer)
    ? <CustomerChar key={c.id} s={s} c={c} kind="today" onTip={onTip} heard />
    : <CustomerChar key={c.id} s={s} c={c} kind="mystery" onPick={onScout ? () => onScout(c.id) : undefined} />;
  const n = s.secondMarket.length + s.firstMarket.length + (before ? 1 + (extra ? 1 : 0) + s.queue.length : 0);
  // Five cards fit across a phone; with more, the row scrolls sideways and the next card shows cut off at the edge
  // as a hint. On a desktop the cards stand two by two in the left column (--pairs rows), sized to fit its height.
  return (
    <div class={`street ${n > 5 ? 'many' : ''}`} style={{ '--pairs': Math.max(1, Math.ceil(n / 2)) }} aria-label="Today's customers">
      {s.secondMarket.map((c) => <CustomerChar key={c.id} s={s} c={c} kind="waiting" onTip={onTip} rush={rush(c)} />)}
      {s.firstMarket.map((c) => <CustomerChar key={c.id} s={s} c={c} kind="new" onTip={onTip} rush={rush(c)} />)}
      {before && <CustomerChar key={s.forecast?.id} s={s} c={s.forecast} kind="today" onTip={onTip} />}
      {before && extra && <CustomerChar key="extra" s={s} c={{ id: -1, name: extra.name, wants: extra.wants, original: extra.wants, pref: prefOf(extra.name) }} kind="today" onTip={onTip} />}
      {before && s.queue.map(walkIn)}
    </div>
  );
}

/**
 * Tomorrow's customers once buying is over, as a strip of mini chips: the expected customer face up (tap for
 * their card), each walk-in as a card back showing only the fruit it wants (its front if you played Gossip or Scout on it).
 */
export function Tomorrow({ s, viewer, onTip }: { s: GameState; viewer: number; onTip?: (c: Customer) => void }) {
  const before = s.phase === 'morning' || s.phase === 'buy';
  if (before || s.phase === 'over' || (!s.forecast && !s.queue.length)) return null;
  const front = (c: Customer, heard: boolean) => (
    <button type="button" key={c.id} class={`tm-chip ${heard ? 'heard' : ''}`} onClick={(e) => { e.stopPropagation(); onTip?.(c); }}
      aria-label={`Tomorrow: ${lookOf(c.name).title}, wants ${c.wants.map((w) => `${w.qty} ${FRUIT[w.fruit].plural}`).join(' and ')}`}>
      <Face who={c.name} size={24} />
      {c.wants.map((w) => <span class="tm-w"><Fruit id={w.fruit} size={16} />{w.qty}</span>)}
    </button>
  );
  return (
    <div class="tomorrow" aria-label="Tomorrow's customers">
      <span class="tm-k">Tomorrow</span>
      {s.forecast && front(s.forecast, false)}
      {s.queue.map((c) => {
        if (c.seenBy?.includes(viewer)) return front(c, true);
        const fruits = [...new Set(c.wants.map((w) => w.fruit))];
        return (
          <span key={c.id} class="tm-chip tm-back" role="img" aria-label={`Tomorrow: a walk-in, face down${fruits.length ? `, wants ${fruits.map((f) => FRUIT[f].plural).join(' and ')}` : ''}`}>
            {fruits.map((f) => <Fruit id={f} size={16} />)}
          </span>
        );
      })}
    </div>
  );
}

/** The other players in turn order after the viewer, as they sit across the table. */
export function seats(n: number, viewer: number): { p: number }[] {
  return Array.from({ length: n - 1 }, (_, i) => ({ p: (viewer + 1 + i) % n }));
}
