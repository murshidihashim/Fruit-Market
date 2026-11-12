// The visual table (PLAN-085, drawn to the approved Buying screen): today's customers at the top, the stalls in
// buying order, the Wholesale Market as the board's lanes of 3, 4, 5 and 6 boxes in the middle, your shelf under it.
// data-a attributes are animation anchors (see anim.ts). What is drawn of a piece on its way is held back until it
// lifts off or lands (tableShown.ts). Styles: table.css (loaded here, so after the older table styles).
import { useEffect, useRef, useState } from 'preact/hooks';
import { FAVOURS, FRUIT, FRUITS, PREF_INFO, TRAITS, UPGRADES, lookOf, prefOf, stageAt, trackSlots, type FruitId, type Stage } from '../engine/data';
import {
  buyCost, buyLimit, count, effectiveMax, forSale, outCount, shelfSize,
  type Customer, type GameState, type Stock,
} from '../engine/game';
import { partsOf, stallOf, type LookSet } from '../net/looks';
import { chosenColour, shownAvatar } from './looks';
import { Face, Fruit } from './art';
import { FavourChip } from './phoneCards';
import { Lamp, STAGE_LETTER, STAGE_WORD, Swatch, Ticket, TicketBack, type TicketLine } from './ticket';
import { shownCash, useCashShown } from './cashShown';
import { shownSold, shownStock, useStockShown } from './stockShown';
import { shownFavours, shownWants } from './rushShown';
import { cardShown, shownBought, shownBoughtCount, shownMarket } from './tableShown';
import { TRAIT_ICON, UP_ICON } from './panel';
import { SEEN_WALK_IN, lifeLabel, marketDayTomorrow, nextLorry, nextLorryName, pulse, shownColumn, stockChips, wantText, LANES } from './boardModel';
import { buyState, marketBefore, shelfChips, ticketLines, tonightHead } from './tableModel';
import { closingNote } from '../engine/story';
import { C } from './palette';
import { Icon, LorrySprite, RoofBand } from './icons';
import { BEAT, FRAME, moveMs } from './motion';
import './table.css';

/** Each player's awning colour (deck-art red, green, mustard and blue, DEC-066). */
export const SEAT_COLOURS = [C.xRed, C.xGreen, C.xMustardDark, C.xSkyDark];
export const seatColour = (p: number) => SEAT_COLOURS[p % SEAT_COLOURS.length];

/**
 * A stall's awning as a strip (DEC-103): over your own shelf, and thin on a stall's box as its rivals see it. It is
 * drawn from the look the player already has: the stall's colour and the roof they wear. Only for show.
 */
export function Awning({ p, look, thin }: { p: number; look?: LookSet; thin?: boolean }) {
  return <RoofBand cls={`tb-awn ${thin ? 'thin' : ''}`} colour={chosenColour(look) ?? seatColour(p)} roof={stallOf(look).roof} scale={thin ? 1 : 2} />;
}

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

/** The night on the lanes: how many boxes every piece slides, whether the slide has started, and whether it is over. */
export interface NightLanes { steps: number; go: boolean; rest: boolean }

/**
 * The board's lanes (DEC-094): one lane for each fruit in the board's order (blueberry 3 boxes, watermelon 4, mango 5,
 * apple 6), one box for each day of a fruit's life, the freshest at the top. On top of a lane: how many pieces are
 * wanted today. In a box: its letter (G, F, O, S), the piece with how many there are, and what one costs. An empty box
 * is drawn as an empty box. `market`: the pieces to draw (held back while a piece is on its way). `night`: every piece
 * slides along its lane and a piece leaving the last box tips off (the night's own script says when).
 */
export function MarketLanes({ s, p, market, onPick, canPick, onPulse, night }: {
  s: GameState; p: number; market: Stock; onPick?: (f: FruitId, pos: number) => void; canPick?: (f: FruitId, pos: number) => boolean;
  onPulse?: () => void; night?: NightLanes;
}) {
  const pz = pulse(s);
  const view = market === s.market ? s : { ...s, market };
  return (
    <div class="tk-lanes tb-lanes">
      {LANES.map((f) => {
        const want = wantText(pz[FRUITS.indexOf(f)]);
        return (
          <div class={`tk-lane tb-lane ${f}`}>
            <button type="button" class="pz tk-lane-head tb-lh" data-a={`mk-${f}`} disabled={!onPulse} onClick={(e) => { e.stopPropagation(); onPulse?.(); }}
              aria-label={`${FRUIT[f].plural}: ${want} wanted today`}>
              <i class="tb-lh-ico"><Fruit id={f} size={14} /></i>
              <span>{want} wanted</span>
            </button>
            {shownColumn(view, f).map(({ pos, stage, n }) => {
              const ok = !night && !!onPick && n > 0 && (!canPick || canPick(f, pos));
              const cost = buyCost(s, p, f, pos);
              const slide = !!night && night.go && night.steps > 0;
              return (
                <button type="button" class={`mk-cell tk-box tb-box st-${stage} ${ok ? 'pick' : ''} ${n ? 'has' : ''} ${trackSlots(f).find((t) => t.pos === pos)?.entry ? 'entry' : ''}`}
                  data-a={`m-${f}-${pos}`} disabled={!ok} onClick={() => ok && onPick!(f, pos)}
                  aria-label={`${FRUIT[f].name}, ${STAGE_WORD[stage]}, $${cost}, ${n} left`}>
                  <Lamp stage={stage} on={n > 0} size={14} />
                  {n > 0 && (
                    <span class={`tb-pc ${night ? `ns-piece ${slide ? 'moved' : ''} ${slide && pos - night.steps < 0 ? 'gone' : ''} ${night.rest ? 'rest' : ''}` : ''}`}
                      style={night ? `--steps:${Math.min(night.steps, pos + 1)}` : undefined}>
                      <i class="tb-tkn"><Fruit id={f} size={17} stage={stage} /></i>{n > 1 && <b class="tb-n">×{n}</b>}
                    </span>
                  )}
                  <span class="price">${cost}</span>
                </button>
              );
            })}
          </div>
        );
      })}
    </div>
  );
}

/** How many boxes the longest lane has (the apple's six), for the height of a box. */
export const laneRows = (s: GameState): number => Math.max(...FRUITS.map((f) => shownColumn(s, f).length));

/**
 * The Wholesale Market in the middle of the table. Tap a box to buy one piece. Until today's crates have landed the
 * lanes show the market as it stood before the lorry (tableModel.marketBefore), and a box's number drops as a piece
 * lifts out of it (tableShown.ts).
 */
export function Market({ s, p, onPick, canPick, onPulse, lorry, note }: {
  s: GameState; p: number; onPick?: (f: FruitId, pos: number) => void; canPick?: (f: FruitId, pos: number) => boolean;
  onPulse?: () => void;
  /** A line under the market's label (the evening's warning: what spoils tonight). */
  note?: { text: string; good: boolean };
  /** The lorry stands beside the market's label from the delivery until the last stall has bought. */
  lorry?: boolean;
}) {
  // The lorry's load is in the game from dawn; on the table it is unloaded as buying starts.
  const market = s.phase === 'morning' || s.phase === 'order' ? marketBefore(s) : shownMarket(s.market);
  const buyer = s.phase === 'buy' ? s.players[s.order[s.turn]] : null;
  const me = s.players[p];
  const turn = !buyer ? '' : s.order[s.turn] === p ? `Your turn · ${shownBoughtCount(p, me.boughtToday)} of ${buyLimit(me)} bought` : '';
  return (
    <div class="market-stall tk-market tb-market" style={{ '--rows': laneRows(s) }}>
      <div class="tk-label-row tb-mk-head">
        <b class="tk-label" data-a="truck">Wholesale Market</b>
        {lorry !== undefined && <Lorry here={lorry} />}
        {!!s.event?.cost && <span class={`tk-chip ${s.event.cost > 0 ? 'warn' : 'good'}`}>{s.event.cost > 0 ? '+' : '−'}${Math.abs(s.event.cost)} each today</span>}
        {/* beside the label, so the lanes keep their place: whose turn it is, or the evening's warning */}
        {turn ? <span class="tk-side">{turn}</span> : note && <span class={`tk-side ${note.good ? 'good' : 'warn'}`} role="status">{note.text}</span>}
      </div>
      <MarketLanes s={s} p={p} market={market} onPick={onPick} canPick={canPick} onPulse={onPulse} />
      {/* Shown where the lanes leave room for it (table.css): the letters, and tomorrow's lorry. */}
      <div class="tb-mk-foot">
        <div class="tk-legend" role="note" aria-label="The letters on the boxes: G is green and not ripe yet, F is fresh, O is okay, S is soft">
          {(['unripe', 'fresh', 'okay', 'notso'] as Stage[]).map((st) => <span><Lamp stage={st} size={14} />{STAGE_WORD[st]}</span>)}
        </div>
        <NextLorry s={s} />
      </div>
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

// ---------- the stalls ----------

/** What a rival's box says after their cash. Rules 15: stalls are secret, so nothing about the shelf; once every stall
 *  is open, how many pieces this one put out; in the rush, how many of them are left. Public facts only. */
export function rivalNote(s: GameState, p: number, active: boolean): string {
  if (s.phase === 'evening') return active ? 'deciding…' : 'waiting';
  if (s.phase === 'bid') { const n = outCount(s, p) ?? 0; return n ? `${n} in crate` : 'empty'; }
  if (s.phase === 'reveal') {
    // At the bell the crates are open; the pieces still out drop as each customer is served (stockShown.ts).
    const out = FRUITS.reduce((a, f) => a + Math.max(0, forSale(s, p, f) - shownSold(s.results, p, f)), 0);
    return out ? `${out} in crate` : 'empty';
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
    // As drawn: a piece counts once it has landed on the stall (PLAN-085, tableShown.ts).
    const n = shownBought(p, f, t.reduce((a, x) => a + x, 0));
    return { f, n, green: Math.min(n, t.slice(FRUIT[f].ripe.length).reduce((a, x) => a + x, 0)) };
  }).filter((x) => x.n > 0);
}
/** "1 mango (green), 2 apples": today's purchases in words, for the box's spoken label and the pop-up. */
export const boughtWords = (buys: Bought[]) => buys.map((b) => `${b.n} ${(b.n === 1 ? FRUIT[b.f].name : FRUIT[b.f].plural).toLowerCase()}${b.green ? (b.green === b.n ? ' (green)' : ` (${b.green} green)`) : ''}`).join(', ');

/** Today's purchases as drawn: a piece counts once it has landed on the stall (boughtToday reads tableShown.ts). */
const shownBuys = (s: GameState, p: number): Bought[] => boughtToday(s, p);

/**
 * A stall's purchases as marks: a picture for each piece while they fit beside the stall's cash (`room` pieces: four
 * in a row of four boxes, three when the cash has three figures, five in a wider box), and otherwise a picture for
 * each fruit with how many (a picture alone is one piece, so the marks read the same way in both forms).
 */
function BuyMarks({ buys, compact, room = 5 }: { buys: Bought[]; compact: boolean; room?: number }) {
  const total = buys.reduce((a, b) => a + b.n, 0);
  if (!total) return null;
  const each = !compact && total <= room;
  return (
    <span class={`tk-seat-buys tb-buys ${each ? 'each' : ''}`} aria-hidden="true">
      {buys.map((b) => (each
        ? Array.from({ length: b.n }, (_, i) => <Fruit id={b.f} size={14} stage={i < b.green ? 'unripe' : 'fresh'} />)
        : <span><Fruit id={b.f} size={compact ? 11 : 13} stage={b.green === b.n ? 'unripe' : 'fresh'} />{b.n > 1 && b.n}</span>))}
    </span>
  );
}
/** How many piece pictures fit beside a stall's cash: `brief` is a row of four or more boxes. */
const marksRoom = (brief: boolean | undefined, cash: number): number => (!brief ? 5 : cash >= 100 ? 3 : 4);

/** A shopkeeper's face in a square frame (the stall's mark on its box: other parts of the table look for .tk-swatch). */
function StallFace({ who, look, size }: { who: string; look?: LookSet; size: number }) {
  return <span class="tk-swatch tb-face" style={`--s:${size}px`} aria-hidden="true"><Face who={who} size={size - 3} worn={look ? partsOf(look) : undefined} /></span>;
}

/** While stalls buy (and before, in the morning and at the bid), the row holds every stall in buying order, you among them. */
const inBuyingOrder = (s: GameState): boolean => s.phase === 'morning' || s.phase === 'order' || s.phase === 'buy';

/**
 * A rival as a box in the stalls' row (the approved Buying and Pricing screens): the thin awning strip, the
 * shopkeeper's face, the name and cash, and what it bought today (rules 18: public from buying until the bell).
 * While stalls buy the box carries its place in the buying order and says "buying now" or "waiting"; once crates are
 * shut it says how many pieces it put out. Tap it to open the stall's details. `rv-chip` and `rival-stall` are the
 * names the browser tests know a rival's box by.
 */
export function RivalStall({ s, p, open, onOpen, board, off, compact, brief }: { s: GameState; p: number; open?: boolean; onOpen: () => void; board?: Board; off?: boolean; compact?: boolean;
  /** Four or more boxes in the row: "buying" for "buying now". */
  brief?: boolean }) {
  useCashShown();
  useStockShown();
  const pl = s.players[p];
  const cash = shownCash(p, pl.cash);
  const buying = inBuyingOrder(s);
  const state = buyState(s, p);
  const active = (s.phase === 'buy' || s.phase === 'evening') && s.order[s.turn] === p;
  const base = rivalNote(s, p, active);
  // Stocking: only whether a stall has opened is public. Pricing: how many pieces it put out.
  const note = s.phase === 'stall' && board ? (board.state === 'thinking' ? 'filling…' : 'ready') : base;
  const said = !board ? '' : board.state === 'thinking' ? (board.ai ? ', prices next, after you' : ', still deciding') : board.state === 'sealed' ? ', sealed' : '';
  const buys = shownBuys(s, p);
  const got = !buying ? '' : s.phase !== 'buy' || state === 'waiting' ? 'waiting' : state === 'now' ? (brief ? 'buying' : 'buying now') : buys.length ? '' : 'nothing';
  // Words and purchases do not fit one line of a box (measured at 390 and 360 wide with 3 to 6 stalls: the words
  // were cut off behind the fruit). So while crates are shut the box's word ("3 out", "ready") stands in its corner,
  // where its number stood while stalls bought; and a stall that is buying shows what it has bought so far on its
  // mustard box, with "buying now" beside it only where the box is wide enough (two stalls).
  const shut = s.phase === 'stall' || s.phase === 'bid';
  const corner = buying ? String(s.order.indexOf(p) + 1) : shut ? note : '';
  const word = buying ? (buys.length && s.players.length > 2 ? '' : got) : shut ? '' : note;
  return (
    <button type="button" class={`rival-stall rv-chip tb-stall ${compact ? 'compact' : ''} ${active ? 'active' : ''} ${open ? 'open' : ''} ${board ? `b-${board.state}` : ''} ${off ? 'off' : ''} ${buys.length ? 'has-buys' : ''} ${buying ? `buy-${state}` : ''}`} data-a={`p${p}`}
      onClick={(e) => { e.stopPropagation(); onOpen(); }} aria-expanded={!!open}
      aria-label={`${pl.name}'s stall: $${cash}${buying ? `, ${s.order.indexOf(p) + 1} in the buying order` : ''}${note ? `, ${note}` : ''}${got ? `, ${got}` : ''}${said}${buys.length ? `, bought today: ${boughtWords(buys)}` : ''}. Tap for more`}>
      <Awning p={p} look={pl.look} thin />
      <span class="tb-who">
        <StallFace who={pl.avatar} look={pl.look} size={compact ? 20 : 26} />
        {/* the name takes up to two lines, so "Uncle Benny" reads in full at four stalls */}
        <span class="tb-id"><span class="tk-seat-name">{pl.name}</span></span>
      </span>
      {/* the cash, then what the stall bought today or what it is doing, on one line across the box */}
      <span class="tb-line">
        <b class="tb-cash" data-a={`p${p}-cash`}>${cash}</b>
        <span class="tb-got"><BuyMarks buys={buys} compact={!!compact} room={marksRoom(brief, cash)} />{word && <span>{word}</span>}</span>
      </span>
      {corner && <i class={`tb-ord ${buying ? '' : 'tb-note'}`} aria-hidden="true">{corner}</i>}
    </button>
  );
}

/** Your own stall in the buying order: the same box, on mustard while you buy. It opens nothing (your shelf is below). */
function MyBox({ s, p, compact, brief }: { s: GameState; p: number; compact: boolean; brief: boolean }) {
  useCashShown();
  const pl = s.players[p];
  const state = buyState(s, p);
  const buys = shownBuys(s, p);
  const got = s.phase !== 'buy' || state === 'waiting' ? 'waiting' : state === 'now' ? (brief ? 'buying' : 'buying now') : buys.length ? '' : 'nothing';
  const cash = shownCash(p, pl.cash);
  // As a rival's box: once you have bought, the fruit stands for the word, except where the box is wide (two stalls).
  const word = buys.length && s.players.length > 2 ? '' : got;
  return (
    <div class={`tb-stall me ${compact ? 'compact' : ''} buy-${state}`} data-a="me-stall" role="img"
      aria-label={`Your stall: $${cash}, ${s.order.indexOf(p) + 1} in the buying order${got ? `, ${got}` : ''}${buys.length ? `, bought today: ${boughtWords(buys)}` : ''}`}>
      <Awning p={p} look={pl.look} thin />
      <span class="tb-who">
        <StallFace who={shownAvatar(s.players, p)} look={pl.look} size={compact ? 20 : 26} />
        <span class="tb-id"><span class="tk-seat-name">You</span></span>
      </span>
      <span class="tb-line">
        <b class="tb-cash">${cash}</b>
        <span class="tb-got"><BuyMarks buys={buys} compact={compact} room={marksRoom(brief, cash)} />{word && <span>{word}</span>}</span>
      </span>
      <i class="tb-ord" aria-hidden="true">{s.order.indexOf(p) + 1}</i>
    </div>
  );
}

/**
 * The stalls' row (the approved Buying and Pricing screens). While stalls buy: "Stalls · in buying order", every
 * stall with its place in the order, you among them, and what each bought today. While crates are shut: "Rival crates
 * · shut until the bell", your rivals with how many pieces each put out. The rest of the day: your rivals and their
 * cash. The row keeps its place and its height all day. 2 to 6 stalls: five or six stand closer, in smaller boxes.
 */
export function Stalls({ s, viewer, boards, open, onOpen, onClose, off }: {
  s: GameState; viewer: number; boards: Record<number, Board>; open: number | null; onOpen: (p: number) => void; onClose: () => void; off: number[];
}) {
  const buying = inBuyingOrder(s);
  const shut = s.phase === 'stall' || s.phase === 'bid';
  const list = buying ? s.order.filter((p) => !!s.players[p]) : seats(s.players.length, viewer).map((x) => x.p);
  const compact = list.length > 4;
  return (
    <div class={`seats tb-stalls n${list.length} ${compact ? 'compact' : ''}`} role="group" aria-label={buying ? 'The stalls, in buying order' : 'Your rivals'}>
      <div class="tb-row-head">
        <b class="tk-label">{buying ? 'Stalls · in buying order' : shut ? 'Rival crates · shut until the bell' : 'Rival stalls'}</b>
        {(buying || shut) && <span class="tb-side">{buying ? 'What each bought today' : 'Bought today'}</span>}
      </div>
      <div class="tb-stall-row">
        {list.map((p) => (p === viewer
          ? <MyBox key={p} s={s} p={p} compact={compact} brief={list.length > 3} />
          : <RivalStall key={p} s={s} p={p} board={boards[p]} open={open === p} off={off.includes(p)} compact={compact} brief={list.length > 3} onOpen={() => onOpen(p)} />))}
      </div>
      {open !== null && <RivalDrop s={s} p={open} onClose={onClose} />}
    </div>
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
  const buys = shownBuys(s, p);
  // A favour card won in the rush counts once it has reached the stall (rushShown.ts).
  const favours = shownFavours(p, pl.favours).length;
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
          {/* the shutter is a piece of the printed game: on the phone the shelf "stays secret" (the glossary's word) */}
          {buys.length > 0 ? 'Older fruit stays secret.' : 'The shelf stays secret.'}
        </span>
      )}
      {buys.length > 0 && (
        <div class="tk-drop-crate tk-drop-buys" aria-label={`Bought today: ${boughtWords(buys)}`}>
          <span class="tk-label">Bought today</span>
          {buys.map((b) => <span class="tk-dk-n"><Fruit id={b.f} size={22} stage={b.green === b.n ? 'unripe' : 'fresh'} /><b>{b.n}</b></span>)}
        </div>
      )}
      {(pl.trait || pl.upgrades.length > 0 || favours > 0) && (
        <div class="rd-extra">
          {pl.trait && <span class="tk-chip" title={TRAITS[pl.trait].text}>{TRAITS[pl.trait].title}</span>}
          {pl.upgrades.map((u) => <span class="tk-chip">{UPGRADES[u].title}</span>)}
          {favours > 0 && <span class="tk-chip">{favours} favour card{favours > 1 ? 's' : ''}</span>}
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

// ---------- your stall: the shelf ----------

/** Freshness groups in the order the shelf shows them, and the word for each. */
const SHELF_STAGES: Stage[] = ['fresh', 'okay', 'notso', 'unripe'];

/** A shelf's pieces of each fruit counted by freshness (fresh, okay, soft, green). */
export function shelfGroups(stock: Record<FruitId, number[]>): { f: FruitId; n: number; stages: { stage: Stage; n: number }[] }[] {
  return LANES.map((f) => {
    const by: Partial<Record<Stage, number>> = {};
    stock[f].forEach((n, pos) => { if (n > 0) { const st = stageAt(f, pos); by[st] = (by[st] ?? 0) + n; } });
    const stages = SHELF_STAGES.filter((st) => by[st]).map((st) => ({ stage: st, n: by[st] ?? 0 }));
    return { f, n: stages.reduce((a, x) => a + x.n, 0), stages };
  });
}

/** The night's slide, as the night's own script sets it (game/animator.tsx): null at dusk, its length in ms while
 *  every piece moves, 'done' once the pieces rest. Undefined: it is not night. */
export type ShelfNight = number | 'done' | null | undefined;

/**
 * Your shelf, under the market and always in view (the approved Buying screen): your awning as a strip, "Your shelf ·
 * 3 of 8", and a chip for each group of pieces with what tonight does to it ("okay tomorrow", "ripe tomorrow",
 * "spoils tonight"; a Heatwave, a Monsoon and your Shade Cloth are counted, tableModel.shelfChips). The favour cards
 * you hold lie beside them. Each fruit has a place here that a bought piece travels to (data-a), also when you hold
 * none of it; a piece is counted once it has landed (tableShown.ts). At night a chip that spoils tips off and the
 * others take tomorrow's letter. Your cash is in the top bar.
 */
export function MyStall({ s, p, onCard, flashCards, night }: { s: GameState; p: number; onCard?: (i: number) => void; flashCards?: boolean; night?: ShelfNight }) {
  const pl = s.players[p];
  // During the rush the shelf drops as each customer is served, and while a bought piece is on its way it is not on
  // the shelf yet (stockShown.ts); otherwise this is the real shelf.
  const shelf = shownStock(p, pl.stock);
  const active = (s.phase === 'buy' || s.phase === 'evening') && s.order[s.turn] === p;
  const used = count(shelf);
  const cap = shelfSize(pl);
  // The final day: what fruit left on the shelf tonight is worth ("Leftovers = $1 each", "Unsold = $0").
  const closing = closingNote(s, p)?.chip;
  // A favour card won in the rush lies here once it has reached the stall (rushShown.ts).
  const favours = shownFavours(p, pl.favours);
  const groups = shelfChips(s, p, shelf);
  const head = tonightHead(s, p);
  const n = groups.reduce((a, g) => a + g.chips.length, 0) + favours.length;
  const go = night !== undefined && night !== null;
  return (
    <section class={`my-stall dock tk-dock tb-dock c${Math.min(n, 8)} ${active ? 'active' : ''} ${go ? 'night' : ''} ${night === 'done' ? 'rest' : ''}`} data-a={`p${p}`} aria-label="Your shelf"
      style={typeof night === 'number' ? `--ns-ms:${Math.round(night)}ms` : undefined}>
      <Awning p={p} look={pl.look} />
      <div class="tb-dock-head">
        <b class={`tk-label tk-shelf ${used >= cap ? 'full' : ''}`} aria-label={`Shelf space: ${used} of ${cap} used`}>Your shelf<i> · </i><span>{used} of {cap}</span></b>
        {(pl.trait || pl.upgrades.length > 0) && (
          <span class="tk-dock-marks">
            {pl.trait && <span title={`${TRAITS[pl.trait].title}: ${TRAITS[pl.trait].text}`}><Icon name={TRAIT_ICON[pl.trait]} size={13} /></span>}
            {pl.upgrades.map((u) => <span title={UPGRADES[u].title}><Icon name={UP_ICON[u]} size={13} /></span>)}
          </span>
        )}
        {/* With a Shade Cloth the line has two parts ("After tonight's Heatwave · Shade Cloth on mangoes") and no room
            for both: the Shade Cloth's is shown, as nothing else on the table says which fruit it is on (the event is
            named in the top bar); the whole line is the hover text. */}
        {closing ? <span class="tk-chip warn">{closing}</span> : head && <span class="tb-side" title={head}>{head.split(' · ').pop()}</span>}
      </div>
      <div class={`stk tb-chips ${flashCards ? 'glow' : ''}`}>
        {groups.map(({ f, chips }) => (chips.length
          ? chips.map((c, i) => (
            <span class={`tb-chip ${i === 0 ? 'stk-f' : ''} ${c.tone} ${go && c.gone ? 'gone' : ''}`} data-a={i === 0 ? `p${p}-${f}` : undefined}
              role="img" aria-label={`${c.n} ${(c.n === 1 ? FRUIT[f].name : FRUIT[f].plural).toLowerCase()}, ${STAGE_WORD[c.stage]}: ${c.words}`} title={c.words}>
              <Fruit id={f} size={16} stage={c.stage} />
              <Lamp stage={go && c.next ? c.next : c.stage} size={13} />
              {c.n > 1 && <b>×{c.n}</b>}
              <span class="tb-chip-w">{c.words}</span>
              {/* a shelf with more kinds of piece than the full words have room for: the first word alone ("okay", "spoils") */}
              <span class="tb-chip-s" aria-hidden="true">{c.words.split(' ')[0]}</span>
              {/* the short form, where the words have no room: the letter the pieces carry tomorrow, or a cross */}
              {!go && (c.gone || (c.next && c.next !== c.stage)) && <span class="tb-chip-to" aria-hidden="true">➜{c.next ? <Lamp stage={c.next} size={13} /> : <i>{c.tone === 'good' ? '$' : '✕'}</i>}</span>}
            </span>
          ))
          : <i class="tb-place stk-f" data-a={`p${p}-${f}`} aria-hidden="true" />))}
        {favours.map((id, i) => <FavourChip id={id} usable={!!onCard && active && FAVOURS[id].when === s.phase} onOpen={() => onCard?.(i)} />)}
      </div>
    </section>
  );
}

// ---------- delivery lorry ----------

/**
 * The lorry beside the market's label: it drives in as buying starts, stands there while stalls buy, and drives off
 * after the last (table.css; the lengths are the clock's, motion.ts). A crate of each fruit slides from it to that
 * fruit's entry box (animator.delivery). It is taken away on the clock, a frame after it has driven off.
 */
export function Lorry({ here }: { here: boolean }) {
  const was = useRef(here);
  const [leaving, setLeaving] = useState(false);
  useEffect(() => {
    const left = was.current && !here;
    was.current = here;
    if (!left) { if (here) setLeaving(false); return undefined; }
    setLeaving(true);
    const t = window.setTimeout(() => setLeaving(false), moveMs(BEAT.lorry.off) + FRAME);
    return () => window.clearTimeout(t);
  }, [here]);
  if (!here && !leaving) return null;
  return (
    <span class={`tb-lorry ${here ? 'here' : 'leaving'}`} aria-hidden="true" data-a={here ? 'lorry' : undefined}>
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

export function CustomerChar({ s, c, kind, onTip, later, heard, onPick, rush, turn }: {
  s: GameState; c?: Customer | null; kind: Kind; onTip?: (c: Customer) => void; later?: boolean; heard?: boolean; onPick?: () => void;
  /** In the rush: 'away' while the card is up in the pop-up, 'served' once it is back with a tick. */
  rush?: 'away' | 'served';
  /** The card is being turned face up as the customers arrive: its back turns away ('out'), then its face shows
   *  ('in'); the standing order's card is dealt to the front of the row ('deal'). */
  turn?: 'out' | 'in' | 'deal';
}) {
  if (kind === 'mystery' || !c) {
    // Face down: only the card's back shows, with the fruit printed on it. No name, type, amount, price or
    // portrait, and no picture is requested until the card is face up for this player.
    const backs = c ? [...new Set(c.wants.map((w) => w.fruit))] : [];
    return (
      <div class={`cust mystery ${later ? 'tomorrow' : ''} ${onPick ? 'pickable' : ''}${turn ? ` tb-turn-${turn}` : ''}`} aria-label={backs.length ? `Walk-in, wants ${backs.map((f) => FRUIT[f].plural).join(' and ')}` : 'Walk-in'}
        role={onPick ? 'button' : undefined} onClick={onPick ? (e) => { e.stopPropagation(); onPick(); } : undefined}>
        <TicketBack fruits={backs} label={later ? 'Tomorrow' : 'Walk-in'} />
      </div>
    );
  }
  // In the rush a fruit is ticked only once that customer's sale has been shown (rushShown.ts): until then the ticket
  // reads as it did when the bell rang.
  const wants = shownWants(s.results, c);
  const done = wants.every((w) => w.qty <= 0);
  const special = c.name === s.event?.extra?.name;
  // The ticket prints today's price (events and generous customers change it). A finished row is ticked and shows
  // what was asked for; a changed price is tinted.
  const lines: TicketLine[] = wants.map((w, i) => {
    // A standing order pays its holder's bid (rules 17: a rival $1 less); no event or Closing Day changes it.
    const max = c.order ? c.order.price : effectiveMax(s, w, c.generous);
    return { fruit: w.fruit, qty: w.qty <= 0 ? c.original?.[i]?.qty ?? 0 : w.qty, max, done: w.qty <= 0, move: max > w.max ? 'up' : max < w.max ? 'down' : undefined };
  });
  return (
    <div class={`cust ${kind} ${done ? 'happy' : ''} ${special ? 'special' : ''} ${heard ? 'heard' : ''}${rush ? ` rush-${rush}` : ''}${turn ? ` tb-turn-${turn}` : ''}`} data-a={c.id > 0 ? `c${c.id}` : undefined}
      onClick={(e) => { e.stopPropagation(); onTip?.(wants === c.wants ? c : { ...c, wants }); }}
      title={`${c.pref ? `${PREF_INFO[c.pref].title}: ${PREF_INFO[c.pref].text}\n` : ''}${wants.map((w, i) => `${FRUIT[w.fruit].name}: ${w.qty <= 0 ? 'done' : `wants ${w.qty}, pays up to $${lines[i].max} each when Fresh`}`).join('\n')}`}>
      <Ticket who={c.name} lines={lines} order={!!c.order} />
      {(done || special || heard) && (
        <span class="cust-marks">
          {done && <i class="happy-mark"><Icon name="heart" size={13} /></i>}
          {special && <i class="star" title="Guest"><Icon name="star" size={13} /></i>}
          {heard && <i class="ear" title={SEEN_WALK_IN}><Icon name="ear" size={13} /></i>}
        </span>
      )}
      {rush === 'served' && <i class="rush-tick" role="img" aria-label="Served">✓</i>}
    </div>
  );
}

/**
 * Before today's walk-ins arrive: the morning, the Market Day bid for a standing order, and buying. The row then holds
 * today's regular and the walk-ins face down, and the strip holds tomorrow's crowd. PLAN-081: the bid counts too (the
 * row used to empty during it, and the strip showed today's crowd under the label "Tomorrow").
 */
export const beforeArrival = (s: GameState): boolean => s.phase === 'morning' || s.phase === 'order' || s.phase === 'buy';

/**
 * Today's customers, side by side as compact cards (tomorrow's are in the Tomorrow strip). The row keeps one height
 * all day: it is as tall as the tallest ticket of the day from the morning on (`--lines`, table.css), so it does not
 * grow when the walk-ins turn face up. Before they arrive the cards stand in the order they will arrive in. As they
 * arrive each walk-in stays face down until its card is turned (tableShown.ts; the arrival's script turns them one
 * after another), and the standing order's card is dealt to the front.
 */
export function Street({ s, viewer, onTip, onScout, away, served }: {
  s: GameState; viewer: number; onTip?: (c: Customer) => void; onScout?: (id: number) => void;
  /** The rush pop-up: the customer whose card is up in the middle, and those already served. */
  away?: number; served?: number[];
}) {
  const rush = (c: Customer) => (c.id === away ? 'away' : served?.includes(c.id) ? 'served' : undefined);
  const before = beforeArrival(s);
  const extra = s.event?.extra;
  // Walk-ins wait face down; a player who played Gossip or Scout on one sees its front.
  const walkIn = (c: Customer) => c.seenBy?.includes(viewer)
    ? <CustomerChar key={c.id} s={s} c={c} kind="today" onTip={onTip} heard />
    : <CustomerChar key={c.id} s={s} c={c} kind="mystery" onPick={onScout ? () => onScout(c.id) : undefined} />;
  // Just arrived: a walk-in whose card has not been turned yet is still drawn face down, in its place.
  const arriving = s.firstMarket.some((c) => cardShown(c.id) !== undefined);
  const arrived = (c: Customer) => {
    const st = cardShown(c.id);
    if (st === 'down' || st === 'out') return <CustomerChar key={c.id} s={s} c={c} kind="mystery" turn={st === 'out' ? 'out' : undefined} />;
    return <CustomerChar key={c.id} s={s} c={c} kind="new" onTip={onTip} rush={rush(c)} turn={st === 'up' ? 'in' : arriving && c.order ? 'deal' : undefined} />;
  };
  const guest: Customer | null = before && extra ? { id: -1, name: extra.name, wants: extra.wants, original: extra.wants, pref: prefOf(extra.name) } : null;
  const n = s.secondMarket.length + s.firstMarket.length + (before ? 1 + (extra ? 1 : 0) + s.queue.length : 0);
  const lines = ticketLines([...s.secondMarket, ...s.firstMarket, ...(before ? [s.forecast, guest, ...s.queue] : [])]);
  // Five cards fit across a phone; with more, the row scrolls sideways and the next card shows cut off at the edge
  // as a hint. On a desktop the cards stand two by two in the left column (--pairs rows), sized to fit its height.
  return (
    <div class={`street ${n > 5 ? 'many' : ''}`} style={{ '--pairs': Math.max(1, Math.ceil(n / 2)), '--lines': lines }} aria-label="Today's customers">
      {s.secondMarket.map((c) => <CustomerChar key={c.id} s={s} c={c} kind="waiting" onTip={onTip} rush={rush(c)} />)}
      {s.firstMarket.map(arrived)}
      {before && <CustomerChar key={s.forecast?.id} s={s} c={s.forecast} kind="today" onTip={onTip} />}
      {before && s.queue.map(walkIn)}
      {guest && <CustomerChar key="extra" s={s} c={guest} kind="today" onTip={onTip} />}
    </div>
  );
}

/**
 * Tomorrow's customers as a strip of mini chips: the expected customer face up (tap for their card), each walk-in as a
 * card back showing only the fruit it wants (its front if you played Gossip on it). Rules 16: tomorrow's crowd is drawn
 * in the morning, so the strip shows while stalls buy too (from nextForecast and nextQueue, then forecast and queue).
 * At its end: the name of tomorrow's lorry (the approved Buying screen).
 */
export function Tomorrow({ s, viewer, onTip }: { s: GameState; viewer: number; onTip?: (c: Customer) => void }) {
  const before = beforeArrival(s);
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
  const lorry = nextLorryName(s);
  const load = nextLorry(s);
  return (
    <div class="tomorrow" aria-label="Tomorrow's customers">
      <span class="tm-k">Tomorrow</span>
      {/* Priority played this evening (PLAN-084): that stall's mark stands at the front of tomorrow's line. */}
      {s.priorityNext !== null && s.players[s.priorityNext] && (
        <span class="tm-first" data-a="tm-first" role="img" aria-label={`${s.priorityNext === viewer ? 'You buy' : `${s.players[s.priorityNext].name} buys`} first tomorrow`}>
          <Swatch p={s.priorityNext} who={s.players[s.priorityNext].avatar} look={s.players[s.priorityNext].look} size={22} /><b>1st</b>
        </span>
      )}
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
      {lorry && load && <span class="tm-lorry" title={`Tomorrow's lorry: ${load.map((l) => `${l.n} ${FRUIT[l.f].plural.toLowerCase()}${l.green ? ' (green)' : ''}`).join(', ')}`}>{lorry}</span>}
    </div>
  );
}

/** The other players in turn order after the viewer, as they sit across the table. */
export function seats(n: number, viewer: number): { p: number }[] {
  return Array.from({ length: n - 1 }, (_, i) => ({ p: (viewer + 1 + i) % n }));
}
