// The game table: lays out the street, the stalls and the market, and the panels for each phase.
// State and turn logic live in game/useGameController; what is laid out when in game/tableLayout; its parts with a
// job of their own in game/tableParts; animations in game/animator.
import { useMemo, useRef } from 'preact/hooks';
import { canBuy, publicView, type GameState } from '../engine/game';
import type { OnlineClient } from '../net/client';
import * as A from './anim';
import { BEAT } from './motion';
import { EveningSheet } from './panel';
import { Market, MyStall, Stalls } from './table';
import { fx } from './fx';
import { useGameController, type GameController } from './game/useGameController';
import { useStockShown } from './stockShown';
import { useRushShown } from './rushShown';
import { useTableShown } from './tableShown';
import { useTokenShown } from './firstShown';
import { useSheet } from './sheet';
import { TopBar } from './game/panels/TopBar';
import { MorningCard } from './game/panels/MorningCard';
import { TraitPick } from './game/panels/TraitPick';
import { RushTable } from './game/panels/RushTable';
import { DaySheet } from './game/panels/DaySheet';
import { ActionBar } from './game/panels/ActionBar';
import { HandOver } from './game/panels/HandOver';
import { OrderPanel } from './game/panels/OrderPanel';
import { NightShift } from './game/panels/NightShift';
import { EventPop, Popovers } from './game/panels/Popovers';
import { layoutOf, type Layout } from './game/tableLayout';
import { GameOver, NetStrips, StreetRows, eveningNote, useFirstTime, useReactions, useUnderSheet } from './game/tableParts';
import { ReactButton, reactionsOn } from './Reactions';

interface Props {
  initial: GameState;
  onExit: () => void;
  onChange: (s: GameState) => void;
  onRematch: () => void;
  /** PLAN-118: plays the same Market League stage again. */
  onRetry?: () => void;
  /** Online play: the server owns the game; this screen sends actions and animates the states it receives. */
  online?: OnlineClient;
  /** The results' second button: the same table again with the person as this shopkeeper (PLAN-086). */
  onPlayAs?: (avatar: string) => void;
  /** PLAN-119: starts today's Sprint from a cleared Market League stage's results. */
  onSprint?: () => void;
}

export function Game({ initial, onExit, onChange, onRematch, onRetry, online, onPlayAs, onSprint }: Props) {
  const c = useGameController(initial, onChange, online);
  // Your shelf dock drops as each customer is served in the rush (stockShown.ts), so the table redraws then. A
  // customer's ticket is ticked, and a favour card won appears on your shelf, as that customer is served (rushShown.ts).
  // A box's number, your shelf and a stall's purchases change as a piece lifts off or lands, and a walk-in's face shows
  // as its card is turned (tableShown.ts). The First token goes round the seats or slides to today's first buyer, and
  // the reason shows as it lands (firstShown.ts, PLAN-104).
  useStockShown();
  useRushShown();
  useTableShown();
  useTokenShown();
  // The middle panel slides onto the table and off again (sheet.ts); the table underneath stays where it is. What a
  // sheet lies over is put out of reach (useUnderSheet).
  const sheet = useSheet();
  const covered = useUnderSheet(sheet.centre);
  const { viewer, show } = c;
  // Rules 15, secret stalls: the screen is drawn from what this stall may see. A rival's shelf is blank, and its crate
  // is only a number of pieces until the bell (online the server has already sent it that way).
  const s = useMemo(() => publicView(c.s, viewer), [c.s, viewer]);
  // The day on which a customer's card was last up in the rush: until then the bell is what is on the table.
  const rushDay = useRef(-1);
  if (show) rushDay.current = s.day;
  // When the hand-over screen came up (0: it is not up). A tap sooner than BEAT.handoff.guard after that is the tail of
  // the last person's own tapping (a double tap on Done), so it must not open the next person's stall.
  const handoffAt = useRef(0);
  if (!c.needHandoff) handoffAt.current = 0;
  else if (!handoffAt.current) handoffAt.current = performance.now();
  // Whether the round table was up at the last drawing, and where your crate lay on the stocking sheet as it came up.
  const tableWas = useRef(false);
  const crateFrom = useRef<A.Box | null>(null);
  const first = useFirstTime(s, !!online, c.votedMe);
  const rx = useReactions(online, s, viewer);

  if (c.needHandoff) {
    // The hand-over screen hides the whole table: the last person's crate and price tags go with it (PLAN-099).
    tableWas.current = false;
    // S8 (PLAN-110): the takings on a shared phone are everybody's, so each person's own day waits for them here.
    return <HandOver s={s} p={c.active} mine={c.ownDay(c.active)} onTap={() => { if (performance.now() - handoffAt.current < BEAT.handoff.guard) return; fx.tap(); c.handTo(c.active); }} />;
  }

  if (s.phase === 'over') {
    return <GameOver s={s} c={c} online={online} reactions={rx.reactions} onReact={() => rx.setReacting(true)} onExit={onExit} onRematch={onRematch}
      onRetry={onRetry} onPlayAs={onPlayAs} onSprint={onSprint} />;
  }

  const t = layoutOf(s, c, !!online, first.up, rushDay.current);
  // Your crate travels from the stocking sheet to its seat as the round table forms: where it lay is measured now,
  // before the sheet leaves the page.
  if (t.tableOn && !tableWas.current) crateFrom.current = A.boxOf(typeof document === 'undefined' ? null : document.getElementById('my-crate'));
  tableWas.current = t.tableOn;
  const mid = middle(t, s, c, !!online);
  covered.current = t.covered;
  // A tap on the table hurries what is playing until your next decision (PLAN-081), the rivals' turns included. Not a
  // tap on a button (PLAN-076: Lights out used to skip the whole night when you were the last stall to close). A market
  // box that cannot be bought from lets the tap through (ticket.css), so the lanes count as the table. While a
  // customer's card is up in the rush, a tap that reaches here (the top bar) moves on to the next customer, like a tap
  // on the card itself; only Skip hurries the whole rush.
  const tapTable = (e: MouseEvent) => {
    if ((e.target as Element).closest?.('button')) return;
    if (show) A.speedStep();
    else c.hurry();
  };
  return (
    <div class={tableClass(s, t, c.night)} onClick={tapTable}>
      <TopBar s={s} viewer={viewer} night={c.night} on={t.onTable} onMenu={() => c.setMenu(true)} onEvent={() => c.setEventInfo(!c.eventInfo)} />
      {c.eventInfo && <EventPop c={c} viewer={viewer} shared={t.together} />}
      {online && <NetStrips c={c} />}
      <StreetRows s={s} c={c} />
      <div class={`centre ${mid ? 'covered' : ''}`} ref={sheet.centre}>
        {market(s, c, t)}
        {/* where the picture of a panel that has just left slides off (sheet.ts) */}
        <div class="tk-sheet" ref={sheet.host} aria-hidden="true" />
        {mid}
      </div>
      {/* The stalls: in buying order while they buy (you among them), your rivals the rest of the day (PLAN-085). PLAN-128
          (the owner): under the Wholesale Market, above your shelf, in the page's order as on the screen. */}
      {t.rivals.length > 0 && <Stalls s={s} viewer={viewer} boards={t.boards} open={t.openRival} off={c.offline.map((x) => x.seat)}
        onOpen={(p) => c.setRival(t.openRival === p ? null : p)} onClose={() => c.setRival(null)}
        mute={online ? (p) => (s.players[p]?.kind === 'human' && reactionsOn() ? { on: rx.mutes.muted(p, s.players[p].name), toggle: () => rx.mutes.toggle(p, s.players[p].name) } : null) : undefined} />}
      <MyStall s={s} p={viewer} night={c.night ? c.nightSlide : undefined} onCard={c.activeHuman ? c.playCard : undefined} flashCards={c.freeFruit !== null} hidden={t.together} />
      {/* PLAN-112: the reaction button sits on your shelf's top corner. Not while stocking and pricing (phase 'stall'),
          where it stood over the last row's + button (PLAN-113), and not while a sheet with its own buttons lies over
          the shelf (the standing order's bid, a tie, the evening's choices; PLAN-116, REP-133 B-02). */}
      {online && s.phase !== 'stall' && !t.orderUp && !t.tying && !t.evSheet && <ReactButton class="rx-game" onOpen={() => rx.setReacting(true)} />}
      {/* While stocking, bidding for a standing order or deciding the evening, the panel's own buttons (.pp-lock) take
          the action bar's place; while the round table is up, its own foot does. */}
      {t.bar && <ActionBar c={c} pl={s.players[c.active]} limit={t.limit} picker={t.picker} online={!!online} />}
      {/* The round table, from the moment this stall opens to the end of the rush: a stage over the table from under the
          customer row down, under the flying fruit. It stays a moment after it is done, to slide off, so it is drawn
          here all the time and decides for itself. */}
      <RushTable s={s} a={show} viewer={viewer} shared={!online && c.humans.length > 1} c={c} online={!!online} from={crateFrom.current} />
      <div class="fx-layer" ref={c.layerRef} />
      {c.banner && <div class="phase-banner" key={c.banner} aria-hidden="true"><span>{c.banner}</span></div>}
      {c.toast && <div class="toast">{c.toast}</div>}
      <Popovers c={c} coach={t.coach} onExit={onExit} onWear={online ? (l) => online.wear(l) : undefined} room={online?.code} />
      {rx.reactions}
      {first.popup}
    </div>
  );
}

/** The Wholesale Market. The farmer's lorry parks at the market's sign from the morning delivery until buying ends. */
function market(s: GameState, c: GameController, t: Layout) {
  const { busy, viewer } = c;
  return (
    <Market s={s} p={viewer} lorry={t.lorryHere} mover={busy ? c.mover : null}
      note={s.phase === 'evening' && c.activeHuman && !t.eveningChoices ? eveningNote(s, t.evP) : undefined}
      onPick={s.phase === 'buy' && c.activeHuman && !c.handoffDue && (!busy || c.ownBeat) ? c.pickMarket : undefined}
      canPick={(f, pos) => c.freeFruit !== null || !canBuy(s, c.active, f, pos)}
      why={s.phase === 'buy' && !c.handoffDue && s.players[viewer]?.kind === 'human' ? (f, pos) => canBuy(s, viewer, f, pos) : undefined}
      onPulse={() => c.setPulseInfo(!c.pulseInfo)} />
  );
}

/** The table's classes: the phase, the first-game tip's room, the round table, the night, the last days. */
function tableClass(s: GameState, t: Layout, night: boolean): string {
  return `game gx tkt ph-${s.phase} ${t.coach && (s.phase === 'stall' || s.phase === 'bid') ? 'coach-row' : ''} ${t.tableOn ? 'table-up' : ''}${night ? 'is-night' : ''} ${s.config.days - s.day < 3 ? 'finale' : ''} ${s.day === s.config.days ? 'final-day' : ''}`;
}

/** The middle of the table: the Wholesale Market, with the card or decision of the moment on top of it (the morning
 *  brief, stocking, the takings, the standing order's bid, the evening; layoutOf decides which). Today's customers
 *  above it and your shelf below it stay in view on a phone (the owner-approved "Phone A" layout). */
function middle(t: Layout, s: GameState, c: GameController, online: boolean) {
  const { viewer, act } = c;
  switch (t.middle) {
    // The night, shown: every piece slides one box older (PLAN-071).
    case 'night': return <NightShift key={`ns-${s.day}`} s={s} viewer={viewer} slide={c.nightSlide} />;
    case 'trait': return <TraitPick s={s} p={t.picker} onPick={(x) => { fx.card(); act({ kind: 'trait', trait: x }, t.picker); }} />;
    case 'morning': return <MorningCard s={s} viewer={viewer} lost={c.lastNight} juice={c.lastJuice} table shared={!online && c.humans.length > 1} />;
    // Offline the computer stalls decide first, so the sheet is up before the person's own turn: it must not say
    // "Bid in" then (PLAN-081). Online a waiting stall has always sent its choice (the room holds it until everyone has).
    case 'order': return <OrderPanel key={`or-${s.day}-${t.orderSeat}`} s={s} p={t.orderSeat} waiting={!t.ordering} canChange={online} shown={c.orderShow}
      decided={online || (s.standing?.bids[viewer] ?? null) !== null} onBid={(price) => { if (t.ordering || online) { fx.card(); act({ kind: 'order', price }); } }} />;
    // Stocking and the takings: one element, kept while its contents change, so the lanes never show between them
    // (sheet.ts slides a panel only when it is replaced).
    case 'day': return <DaySheet key={`day-${s.day}-${viewer}`} s={s} viewer={viewer} c={c} online={online} tip={!!t.coach} />;
    case 'evening': return <EveningSheet key={`ev-${s.day}-${t.evP}`} s={s} p={t.evP} onUpgrade={(u) => act({ kind: 'upgrade', upgrade: u })} onCard={c.playCard} onShade={(f) => act({ kind: 'shade', fruit: f })}
      onDone={() => { fx.tap(); act({ kind: 'endEvening' }); }} />;
    default: return null;
  }
}

