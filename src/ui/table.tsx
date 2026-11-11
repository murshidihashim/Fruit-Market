// The visual table: farmers market in the centre, a stall for each player around it,
// customers queueing at the top. data-a attributes are animation anchors (see anim.ts).
import { useEffect, useRef, useState } from 'preact/hooks';
import { FAVOURS, FRUIT, FRUITS, PREF_INFO, TRAITS, UPGRADES, lookOf, prefOf, stageAt, trackSlots, type FruitId, type Stage } from '../engine/data';
import {
  buyCost, buyLimit, count, effectiveMax, forSale, outCount, shelfSize,
  type Customer, type GameState,
} from '../engine/game';
import { Face, FavourIcon, Fruit } from './art';
import { Lamp, STAGE_LETTER, STAGE_WORD, Swatch, Ticket, TicketBack, type TicketLine } from './ticket';
import { shownCash, useCashShown } from './cashShown';
import { shownSold, shownStock, useStockShown } from './stockShown';
import { TRAIT_ICON, UP_ICON } from './panel';
import { SEEN_WALK_IN, lifeLabel, marketDayTomorrow, nextLorry, nextLorryName, pulse, shownColumn, stockChips, wantText, LANES } from './boardModel';
import { closingNote } from '../engine/story';
import { C } from './palette';
import { Icon, LorrySprite } from './icons';

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

export { LANES, STAGE_LETTER };

/**
 * The Wholesale Market as on the printed board (PLAN-072): one lane per fruit in the board's order (blueberry,
 * watermelon, mango, apple), the freshest box at the top, each box with its letter (G, F, O, S), the pieces in it and
 * what one costs. Tap a box to buy one piece.
 */
export function Market({ s, p, onPick, canPick, onPulse, lorry, note }: {
  s: GameState; p: number; onPick?: (f: FruitId, pos: number) => void; canPick?: (f: FruitId, pos: number) => boolean;
  onPulse?: () => void;
  /** A line under the market's label (the evening's warning: what spoils tonight). */
  note?: { text: string; good: boolean };
  /** The lorry is at the market from the morning delivery until buying ends: fruit flies in from its place. */
  lorry?: boolean;
}) {
  const pz = pulse(s);
  // A green box no lorry ever fills (the watermelon's) is left out (shownColumn); a box with fruit in it always shows.
  const cols = FRUITS.map((f) => shownColumn(s, f));
  const lanes = LANES.map((f) => [f, FRUITS.indexOf(f)] as const);
  const rows = Math.max(...cols.map((c) => c.length));
  const buyer = s.phase === 'buy' ? s.players[s.order[s.turn]] : null;
  const me = s.players[p];
  const turn = !buyer ? '' : s.order[s.turn] === p ? `Your turn · ${me.boughtToday} of ${buyLimit(me)} bought` : `${buyer.name} is buying`;
  return (
    <div class="market-stall tk-market" style={{ '--rows': rows }}>
      <div class="tk-label-row">
        <b class="tk-label" data-a="truck">Wholesale market</b>
        {lorry && <i class="tk-anchor" data-a="lorry" aria-hidden="true" />}
        {!!s.event?.cost && <span class={`tk-chip ${s.event.cost > 0 ? 'warn' : 'good'}`}>{s.event.cost > 0 ? '+' : '−'}${Math.abs(s.event.cost)} each today</span>}
        {turn && <span class="tk-side">{turn}</span>}
      </div>
      {note && <p class={`tk-info ${note.good ? 'good' : 'warn'}`} role="status">{note.text}</p>}
      <div class="tk-lanes">
        {lanes.map(([f, i]) => (
          <div class={`tk-lane ${f}`}>
            <button type="button" class="pz tk-lane-head" data-a={`mk-${f}`} onClick={(e) => { e.stopPropagation(); onPulse?.(); }}
              aria-label={`${FRUIT[f].plural}: ${wantText(pz[i])} wanted today`}>
              <Fruit id={f} size={20} />
              <span>{wantText(pz[i])} want</span>
            </button>
            {cols[i].map(({ pos, stage, n }) => {
              const ok = !!onPick && n > 0 && (!canPick || canPick(f, pos));
              return (
                <button type="button" class={`mk-cell tk-box st-${stage} ${ok ? 'pick' : ''} ${n ? 'has' : ''} ${trackSlots(f).find((t) => t.pos === pos)?.entry ? 'entry' : ''}`}
                  data-a={`m-${f}-${pos}`} disabled={!ok} onClick={() => ok && onPick!(f, pos)}
                  aria-label={`${FRUIT[f].name}, ${STAGE_WORD[stage]}, $${buyCost(s, p, f, pos)}, ${n} left`}>
                  <Lamp stage={stage} />
                  {n > 0 && <span class="tk-box-n"><Fruit id={f} size={20} stage={stage} /><b>{n}</b></span>}
                  <span class="price">${buyCost(s, p, f, pos)}</span>
                </button>
              );
            })}
          </div>
        ))}
      </div>
      <div class="tk-legend" role="note" aria-label="The letters on the boxes: G is green and not ripe yet, F is fresh, O is okay, S is soft">
        {(['unripe', 'fresh', 'okay', 'notso'] as Stage[]).map((st) => <span><Lamp stage={st} size={16} />{STAGE_WORD[st]}</span>)}
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
      <span class="nl-head">
        <span class="nl-title">Tomorrow's lorry{nextLorryName(s) ? ':' : ''}</span>
        {nextLorryName(s) && <span class="nl-name">{nextLorryName(s)}</span>}
      </span>
      <span class="nl-fruits">
        {lines.map((l) => (
          <span class={`nl-f ${l.plenty ? 'plenty' : 'few'}`}><Fruit id={l.f} size={16} stage={l.green ? 'unripe' : 'fresh'} />×{l.n}</span>
        ))}
      </span>
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

/** What a rival's box says after their cash. Rules 15: stalls are secret, so nothing about the shelf; once every stall
 *  is open, how many pieces this one put out; in the rush, how many of them are left. Public facts only. */
export function rivalNote(s: GameState, p: number, active: boolean): string {
  if (s.phase === 'evening') return active ? 'building…' : 'plotting…';
  if (s.phase === 'bid') { const n = outCount(s, p) ?? 0; return n ? `${n} out` : 'none out'; }
  if (s.phase === 'reveal') {
    // At the bell the crates are open; the pieces still out drop as each customer is served (stockShown.ts).
    const out = FRUITS.reduce((a, f) => a + Math.max(0, forSale(s, p, f) - shownSold(s.results, p, f)), 0);
    return out ? `${out} out` : 'none out';
  }
  return '';
}

/** One fruit a stall bought today: how many pieces, and how many of them are still green. */
export interface Bought { f: FruitId; n: number; green: number }

/**
 * Rules 18: what a stall took from the market today, by fruit. It is public from the moment of purchase until the
 * bell, so it is shown only while buying, stocking and pricing; older stock stays secret.
 */
export function boughtToday(s: GameState, p: number): Bought[] {
  if (s.phase !== 'buy' && s.phase !== 'stall' && s.phase !== 'bid') return [];
  const b = s.players[p].boughtFruit;
  if (!b) return [];
  return LANES.map((f) => {
    const t = b[f] ?? [];
    return { f, n: t.reduce((a, x) => a + x, 0), green: t.slice(FRUIT[f].ripe.length).reduce((a, x) => a + x, 0) };
  }).filter((x) => x.n > 0);
}
/** "1 mango (green), 2 apples": today's purchases in words, for the box's spoken label and the pop-up. */
export const boughtWords = (buys: Bought[]) => buys.map((b) => `${b.n} ${(b.n === 1 ? FRUIT[b.f].name : FRUIT[b.f].plural).toLowerCase()}${b.green ? (b.green === b.n ? ' (green)' : ` (${b.green} green)`) : ''}`).join(', ');

/**
 * A rival as a box in the rivals strip (PLAN-072): the stall's pattern with the shopkeeper's face, the name, cash and
 * a short note (what they are doing, then their price and result as each customer is served). Tap it to open their
 * stall below the strip. `rv-chip`: the rival cash chips that used to sit in the top bar live here now. Rules 18:
 * small fruit marks with counts show what the stall bought today, from buying until the bell.
 */
export function RivalStall({ s, p, open, onOpen, board, off }: { s: GameState; p: number; open?: boolean; onOpen: () => void; board?: Board; off?: boolean }) {
  useCashShown();
  useStockShown();
  const pl = s.players[p];
  const cash = shownCash(p, pl.cash);
  const active = (s.phase === 'buy' || s.phase === 'evening') && s.order[s.turn] === p;
  const compact = s.players.length > 4;
  const base = rivalNote(s, p, active);
  // The price board's state, in a word: it is sealed until the cards around the customer turn over.
  const note = !board ? (active && s.phase === 'buy' ? 'buying' : base)
    : s.phase === 'stall' ? (board.state === 'thinking' ? 'choosing' : 'ready')
    : s.phase === 'bid' ? base // how many pieces it put out; a sealed stall's box turns grey
    : board.state !== 'open' ? base
    : board.res === 'won' ? `sold at $${board.price}` : board.res === 'lost' ? 'no sale' : `asks $${board.price}`;
  const said = !board ? '' : board.state === 'thinking' ? (board.ai ? ', prices next, after you' : ', still deciding')
    : board.state === 'sealed' ? ', sealed' : `, price $${board.price}${board.res === 'won' ? ', sold' : board.res === 'lost' ? ', no sale' : ''}`;
  const buys = boughtToday(s, p);
  return (
    <button type="button" class={`rival-stall rv-chip tk-seat ${compact ? 'compact' : ''} ${active ? 'active' : ''} ${open ? 'open' : ''} ${board ? `b-${board.state}` : ''} ${board?.res ?? ''} ${off ? 'off' : ''} ${buys.length ? 'has-buys' : ''}`} data-a={`p${p}`}
      onClick={(e) => { e.stopPropagation(); onOpen(); }} aria-expanded={!!open} aria-label={`${pl.name}'s stall: $${cash}${base ? `, ${base}` : ''}${said}${buys.length ? `, bought today: ${boughtWords(buys)}` : ''}. Tap for more`}>
      {/* Five or six stalls: the box is narrow, so the name gets its own line and the note is left to the box's shade
          (grey once a stall is ready or sealed) and to its spoken label. */}
      <Swatch p={p} who={pl.avatar} look={pl.look} size={compact ? 20 : 30} />
      <span class="tk-seat-body">
        <span class="tk-seat-name">{pl.name}</span>
        <span class="tk-seat-line"><b data-a={`p${p}-cash`}>${cash}</b>{!compact && note && <> · {note}</>}</span>
        {buys.length > 0 && (
          <span class="tk-seat-buys" aria-hidden="true">
            {buys.map((b) => <span><Fruit id={b.f} size={compact ? 10 : 12} stage={b.green === b.n ? 'unripe' : 'fresh'} />{b.n}</span>)}
          </span>
        )}
      </span>
    </button>
  );
}

/** A rival's stall, opened from their seat. Rules 15: the shelf stays behind the shutter, so this shows cash, the perk,
 *  what is built, and today's crate: how many pieces before the bell, which fruit once it has rung. */
export function RivalDrop({ s, p, onClose }: { s: GameState; p: number; onClose: () => void }) {
  useCashShown();
  const pl = s.players[p];
  const out = outCount(s, p);
  const open = s.phase === 'reveal';
  const crate = open ? LANES.filter((f) => forSale(s, p, f) > 0) : [];
  const buys = boughtToday(s, p);
  return (
    <div class="rival-drop tk-drop" role="dialog" aria-label={`${pl.name}: stall`} onClick={(e) => e.stopPropagation()}>
      <div class="rd-head">
        <Swatch p={p} who={pl.avatar} look={pl.look} size={34} />
        <b>{pl.name}{pl.name.endsWith('s') ? "'" : "'s"} stall</b>
        <span class="tk-cash">${shownCash(p, pl.cash)}</span>
        <button type="button" class="rd-close" onClick={onClose} aria-label="Close">×</button>
      </div>
      {open && crate.length > 0 ? (
        <div class="tk-drop-crate" aria-label={`Today's crate: ${crate.map((f) => `${forSale(s, p, f)} ${FRUIT[f].plural.toLowerCase()}`).join(', ')}`}>
          <span class="tk-label">Today's crate</span>
          {crate.map((f) => <span class="tk-dk-n"><Fruit id={f} size={22} /><b>{forSale(s, p, f)}</b></span>)}
        </div>
      ) : (
        <span class="tk-note">
          {s.phase === 'bid' && out !== null ? `${out ? `${out} ${out === 1 ? 'piece' : 'pieces'}` : 'Nothing'} in the crate today. Which fruit shows at the bell. ` : open ? 'Nothing in the crate today. ' : ''}
          {buys.length > 0 ? 'Older fruit stays behind the shutter.' : 'The shelf stays behind the shutter.'}
        </span>
      )}
      {buys.length > 0 && (
        <div class="tk-drop-crate tk-drop-buys" aria-label={`Bought today: ${boughtWords(buys)}`}>
          <span class="tk-label">Bought today</span>
          {buys.map((b) => <span class="tk-dk-n"><Fruit id={b.f} size={22} stage={b.green === b.n ? 'unripe' : 'fresh'} /><b>{b.n}</b></span>)}
        </div>
      )}
      {(pl.trait || pl.upgrades.length > 0 || pl.favours.length > 0) && (
        <div class="rd-extra">
          {pl.trait && <span class="tk-chip" title={TRAITS[pl.trait].text}>{TRAITS[pl.trait].title}</span>}
          {pl.upgrades.map((u) => <span class="tk-chip">{UPGRADES[u].title}</span>)}
          {pl.favours.length > 0 && <span class="tk-chip">{pl.favours.length} favour card{pl.favours.length > 1 ? 's' : ''}</span>}
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
              title={`${FRUIT[f].name}: ${stage === 'notso' ? 'soft' : stage}${FRUIT[f].drop[pos] ? `, customers pay $${FRUIT[f].drop[pos]} less` : ''}`}>
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

/** A shelf's pieces of each fruit counted by freshness (fresh, okay, soft, green), for the shelf dock. */
export function shelfGroups(stock: Record<FruitId, number[]>): { f: FruitId; n: number; stages: { stage: Stage; n: number }[] }[] {
  return LANES.map((f) => {
    const by: Partial<Record<Stage, number>> = {};
    stock[f].forEach((n, pos) => { if (n > 0) { const st = stageAt(f, pos); by[st] = (by[st] ?? 0) + n; } });
    const stages = SHELF_STAGES.filter((st) => by[st]).map((st) => ({ stage: st, n: by[st] ?? 0 }));
    return { f, n: stages.reduce((a, x) => a + x.n, 0), stages };
  });
}

/**
 * Your shelf, docked above the action bar so it is always in view (PLAN-072): your stall's pattern and face, the
 * shelf space, and the four fruits in the board's order with your pieces counted by freshness. Favour cards sit on a
 * slim row above. Fruit flies to and from the fruit groups (data-a anchors); your cash is in the top bar.
 */
export function MyStall({ s, p, onCard, flashCards, board }: { s: GameState; p: number; onCard?: (i: number) => void; flashCards?: boolean; board?: Board }) {
  const pl = s.players[p];
  // During the rush the shelf drops as each customer is served (stockShown.ts); otherwise this is the real shelf.
  const shelf = shownStock(p, pl.stock);
  const active = (s.phase === 'buy' || s.phase === 'evening') && s.order[s.turn] === p;
  const used = count(shelf);
  const cap = shelfSize(pl);
  // The final day: what fruit left on the shelf tonight is worth ("Leftovers = $1 each", "Unsold = $0").
  const closing = closingNote(s, p)?.chip;
  return (
    <section class={`my-stall dock tk-dock ${active ? 'active' : ''}`} data-a={`p${p}`} aria-label="Your shelf">
      {(pl.favours.length > 0 || closing) && (
        <div class={`tk-dock-cards ${flashCards ? 'glow' : ''}`}>
          {closing && <span class="tk-chip warn">{closing}</span>}
          {pl.favours.map((id, i) => {
            const usable = !!onCard && active && FAVOURS[id].when === s.phase;
            return (
              <button type="button" class={`fcard tk-fav ${usable ? 'usable' : ''}`} onClick={() => onCard?.(i)} title={FAVOURS[id].text} aria-label={`Favour card: ${FAVOURS[id].title}`}>
                <FavourIcon id={id} size={18} /><small>{FAVOURS[id].title}</small>
              </button>
            );
          })}
        </div>
      )}
      <div class="tk-dock-row">
        <Swatch p={p} who={pl.avatar} look={pl.look} size={50} />
        <div class="tk-dock-id">
          <span class="tk-dock-name"><b class="ms-name">{pl.name}</b>{pl.name.trim().toLowerCase() !== 'you' && <span class="you-tag">YOU</span>}</span>
          <span class={`tk-shelf ${used >= cap ? 'full' : ''}`} title="Shelf space" aria-label={`Shelf space: ${used} of ${cap} used`}>Shelf {used} / {cap}</span>
          {(pl.trait || pl.upgrades.length > 0) && (
            <span class="tk-dock-marks">
              {pl.trait && <span title={`${TRAITS[pl.trait].title}: ${TRAITS[pl.trait].text}`}><Icon name={TRAIT_ICON[pl.trait]} size={13} /></span>}
              {pl.upgrades.map((u) => <span title={UPGRADES[u].title}><Icon name={UP_ICON[u]} size={13} /></span>)}
            </span>
          )}
        </div>
        <div class="stk tk-dock-fruits">
          {shelfGroups(shelf).map(({ f, n, stages }) => (
            <span class={`stk-f tk-dk-f ${n ? '' : 'none'}`} data-a={`p${p}-${f}`}
              aria-label={`${FRUIT[f].plural}: ${n ? stages.map((x) => `${x.n} ${STAGE_WORD[x.stage]}`).join(', ') : 'none'}`}>
              <span class="tk-dk-n"><Fruit id={f} size={22} /><b>{n}</b></span>
              <span class="tk-dk-st">{stages.map(({ stage, n: k }) => <i class={`st-${stage}`}>{STAGE_LETTER[stage]}{k}</i>)}</span>
            </span>
          ))}
          {board?.state === 'open' && <span class={`tk-gain ${board.res ?? ''}`}>${board.price}{board.res === 'won' ? ' sold' : board.res === 'lost' ? ' no sale' : ''}</span>}
        </div>
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
        <TicketBack fruits={backs} label={later ? 'Tomorrow' : 'Walk-in'} />
      </div>
    );
  }
  const done = c.wants.every((w) => w.qty <= 0);
  const special = c.name === s.event?.extra?.name;
  // The ticket prints today's price (events and generous customers change it). A finished row is ticked and shows
  // what was asked for; a changed price is tinted.
  const lines: TicketLine[] = c.wants.map((w, i) => {
    // A standing order pays its holder's bid (rules 17: a rival $1 less); no event or Closing Day changes it.
    const max = c.order ? c.order.price : effectiveMax(s, w, c.generous);
    return { fruit: w.fruit, qty: w.qty <= 0 ? c.original?.[i]?.qty ?? 0 : w.qty, max, done: w.qty <= 0, move: max > w.max ? 'up' : max < w.max ? 'down' : undefined };
  });
  return (
    <div class={`cust ${kind} ${done ? 'happy' : ''} ${special ? 'special' : ''} ${heard ? 'heard' : ''}${rush ? ` rush-${rush}` : ''}`} data-a={c.id > 0 ? `c${c.id}` : undefined}
      onClick={(e) => { e.stopPropagation(); onTip?.(c); }}
      title={`${c.pref ? `${PREF_INFO[c.pref].title}: ${PREF_INFO[c.pref].text}\n` : ''}${c.wants.map((w, i) => `${FRUIT[w.fruit].name}: ${w.qty <= 0 ? 'done' : `wants ${w.qty}, pays up to $${lines[i].max} each when fresh`}`).join('\n')}`}>
      <Ticket who={c.name} lines={lines} />
      {(done || special || heard) && (
        <span class="cust-marks">
          {done && <i class="happy-mark"><Icon name="heart" size={13} /></i>}
          {special && <i class="star" title="Special guest"><Icon name="star" size={13} /></i>}
          {heard && <i class="ear" title={SEEN_WALK_IN}><Icon name="ear" size={13} /></i>}
        </span>
      )}
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
 * Tomorrow's customers as a strip of mini chips: the expected customer face up (tap for their card), each walk-in as a
 * card back showing only the fruit it wants (its front if you played Gossip on it). Rules 16: tomorrow's crowd is drawn
 * in the morning, so the strip shows while stalls buy too (from nextForecast and nextQueue, then forecast and queue).
 */
export function Tomorrow({ s, viewer, onTip }: { s: GameState; viewer: number; onTip?: (c: Customer) => void }) {
  const before = s.phase === 'morning' || s.phase === 'buy';
  const forecast = before ? s.nextForecast : s.forecast;
  const queue = before ? s.nextQueue ?? [] : s.queue;
  if (s.phase === 'over' || (!forecast && !queue.length)) return null;
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
      {forecast && front(forecast, false)}
      {queue.map((c) => {
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
