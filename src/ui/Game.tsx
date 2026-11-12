// The game table: lays out the street, the stalls and the market, and the panels for each phase.
// State and turn logic live in game/useGameController; animations in game/animator.
import { useLayoutEffect, useMemo, useRef } from 'preact/hooks';
import { buyLimit, canBuy, eveningChoice, nightOutlook, publicView, type GameState } from '../engine/game';
import { heatwaveLine, tonightText } from '../engine/story';
import type { OnlineClient } from '../net/client';
import { Face } from './art';
import * as A from './anim';
import { BEAT } from './motion';
import { EveningSheet } from './panel';
import { Market, MyStall, Stalls, Street, Tomorrow, seats, type Board } from './table';
import { fx } from './fx';
import { tipFor } from './tutorial';
import { loadSettings } from './store';
import { useGameController } from './game/useGameController';
import { useStockShown } from './stockShown';
import { useRushShown } from './rushShown';
import { useTableShown } from './tableShown';
import { useSheet } from './sheet';
import { TopBar } from './game/panels/TopBar';
import { MorningCard } from './game/panels/MorningCard';
import { TraitPick } from './game/panels/TraitPick';
import { Showdown } from './game/panels/Showdown';
import { DaySheet, daySheetOn } from './game/panels/DaySheet';
import { Results } from './game/panels/Results';
import { ActionBar } from './game/panels/ActionBar';
import { OrderPanel, OrderStrip } from './game/panels/OrderPanel';
import { NightShift } from './game/panels/NightShift';
import { EventPop, Popovers } from './game/panels/Popovers';

interface Props {
  initial: GameState;
  onExit: () => void;
  onChange: (s: GameState) => void;
  onRematch: () => void;
  /** Online play: the server owns the game; this screen sends actions and animates the states it receives. */
  online?: OnlineClient;
  /** The results' second button: the same table again with the person as this shopkeeper (PLAN-086). */
  onPlayAs?: (avatar: string) => void;
}

export function Game({ initial, onExit, onChange, onRematch, online, onPlayAs }: Props) {
  const c = useGameController(initial, onChange, online);
  // Your shelf dock drops as each customer is served in the rush (stockShown.ts), so the table redraws then.
  useStockShown();
  // A customer's ticket is ticked, and a favour card won appears on your shelf, as that customer is served (rushShown.ts).
  useRushShown();
  // A box's number, your shelf and a stall's purchases change as a piece lifts off or lands, and a walk-in's face shows
  // as its card is turned (tableShown.ts).
  useTableShown();
  // The middle panel slides onto the table and off again (sheet.ts); the table underneath stays where it is.
  const sheet = useSheet();
  // The Wholesale Market under a sheet cannot be seen, so it is put out of reach of the keyboard and of screen readers
  // too for as long as a sheet lies over it (PLAN-090). The rows a sheet covers only on some phones are left as they are.
  const covered = useRef(false);
  useLayoutEffect(() => {
    sheet.centre.current?.querySelector(':scope > .market-stall')?.toggleAttribute('inert', covered.current);
  });
  const { busy, active, activeHuman, viewer, meta, humans, waitingFor, offline, freeFruit, show, act } = c;
  // Rules 15, secret stalls: the screen is drawn from what this stall may see. A rival's shelf is blank, and its crate
  // is only a number of pieces until the bell (online the server has already sent it that way).
  const s = useMemo(() => publicView(c.s, viewer), [c.s, viewer]);
  // The day on which a customer's card was last up in the rush: until then the bell is what is on the table.
  const rushDay = useRef(-1);
  if (show) rushDay.current = s.day;
  // The customers, the rivals and your shelf keep their places all day; only the middle changes (PLAN-072).

  // When the hand-over screen came up (0: it is not up). A tap sooner than BEAT.handoff.guard after that is the tail of
  // the last person's own tapping (a double tap on Done), so it must not open the next person's stall.
  const handoffAt = useRef(0);
  if (!c.needHandoff) handoffAt.current = 0;
  else if (!handoffAt.current) handoffAt.current = performance.now();

  if (c.needHandoff) {
    const pl = s.players[active];
    return (
      <div class="handoff" onClick={() => { if (performance.now() - handoffAt.current < BEAT.handoff.guard) return; fx.tap(); c.setHandedTo(active); }}>
        <div class="avatar xl"><Face who={pl.avatar} size={96} /></div>
        <h2>Pass the phone to {pl.name}</h2>
        <p>{s.phase === 'order' ? 'A secret bid for the standing order. Everyone else look away.' : s.phase === 'bid' ? 'Secret prices. Everyone else look away.' : s.phase === 'stall' ? 'Fill your crate. Everyone else look away.' : s.phase === 'buy' ? 'Your turn to buy fruit.' : s.phase === 'tie' ? 'One of your prices is tied. Play Favoured Trade, or keep it?' : 'Your evening.'}</p>
        <button class="btn primary big">Tap to start</button>
      </div>
    );
  }

  if (s.phase === 'over') {
    return (
      <div class="game tkt sbk-over">
        <main class="scroll"><Results s={s} viewer={viewer} onExit={onExit} onPlayAs={onPlayAs}
          onRematch={online ? () => { fx.tap(); online.rematch(); } : onRematch}
          rematchNote={online && meta && meta.rematch.length ? (meta.rematch.includes(viewer) ? `Waiting for ${waitingFor(humans.filter((i) => !meta.rematch.includes(i)))} to accept…` : `${waitingFor(meta.rematch)} wants to play again.`) : undefined}
          rematchSent={!!online && !!meta && meta.rematch.includes(viewer)} online={!!online} /></main>
      </div>
    );
  }

  const pl = s.players[active];
  const myBuyTurn = s.phase === 'buy' && activeHuman && !busy;
  const bidder = online ? viewer : active;
  // On the first morning each person picks a merchant trait (online: only your own seat).
  const picker = s.phase !== 'morning' || s.day !== 1 ? -1
    : online ? (s.players[viewer]?.traitOffer && !s.players[viewer].trait ? viewer : -1)
    : s.players.findIndex((x) => x.kind === 'human' && x.traitOffer && !x.trait);
  const coach = online || busy ? null : tipFor(s, {
    // (not at the standing-order bid: the "Secret prices" tip is about pricing fruit, and lay over the bid's stepper)
    myBuyTurn, boughtToday: pl?.boughtToday ?? 0, pricing: c.myBidTurn && s.phase !== 'order',
    picker: picker >= 0, evening: s.phase === 'evening' && activeHuman,
  });
  // Rivals sit across the table in one row, in turn order after you.
  const rivals = seats(s.players.length, viewer).map((x) => x.p);
  const openRival = c.rival !== null && c.rival !== viewer ? c.rival : null;
  // The lorry drives in once the morning's news has been read (Start buying), then unloads (PLAN-065).
  const lorryHere = s.phase === 'buy' && !s.event?.noDelivery;
  // Price boards on the seats: sealed while pricing (only whether a shop has finished is public). In the rush every
  // stall's price is on the customer's card (panels/Showdown.tsx), which lies over the seats.
  const boards: Record<number, Board> = {};
  if (s.phase === 'bid') rivals.forEach((p) => { boards[p] = { state: s.bids[p] === null ? 'thinking' : 'sealed', ai: s.players[p].kind === 'ai' }; });
  if (s.phase === 'stall') rivals.forEach((p) => { boards[p] = { state: s.stalls[p] === null ? 'thinking' : 'sealed', ai: s.players[p].kind === 'ai' }; });
  const limit = pl ? buyLimit(pl) : 4;
  const pricing = s.phase === 'bid' && c.myBidTurn && !busy;
  const stalling = s.phase === 'stall' && c.myBidTurn && !busy;
  // Rules 14: on a Market Day morning every stall bids in secret for the standing order. One sheet stays on the table
  // from the first stall's bid until the bids have been turned over (PLAN-084): while the computer stalls decide first,
  // while this stall bids, while it waits for the others (online it may still change its mind), and while the winner is
  // shown and its stake is put on the order's card (c.orderShow; the game has moved on to buying by then).
  const ordering = s.phase === 'order' && c.myBidTurn;
  const orderSeat = c.myBidTurn ? bidder : viewer;
  const orderUp = !!c.orderShow || (s.phase === 'order' && !!s.standing && s.players[viewer]?.kind === 'human');
  // Rules 18: after the flip a stall holding Favoured Trade with a tied price decides, in the open, whether to play it.
  const tying = s.phase === 'tie' && activeHuman && !busy;
  // One sheet stays on the table from stocking to the day's takings (PLAN-085): while this stall fills its crate, while
  // the rivals open and price, at the bell, for the Favoured Trade question and for the takings. On a shared phone it
  // is drawn only for the person the phone was handed to (game/daySheet.ts).
  const dayOn = daySheetOn(s, viewer, c, !!online);
  // The strip of the day's steps follows what is on the table (PLAN-090): the standing order while its bids are turned
  // over (the game is at buying by then), and the bell until the first customer's card is up (the game is at the rush).
  const onTable = c.orderShow ? 'order' as const : s.phase === 'reveal' && !c.revealDone && rushDay.current !== s.day ? 'bell' as const : undefined;

  // The middle of the table: the Wholesale Market, with the card or decision of the moment on top of it
  // (the morning brief, stocking, pricing, the showdowns, the day's takings, the evening). Today's customers
  // above it and your shelf below it stay in view on a phone (the owner-approved "Phone A" layout).
  // The evening (PLAN-076): the Wholesale Market stays in view until you tap Lights out. The evening sheet covers it
  // only when there is something to decide (an upgrade you can build after a Market Day, Shade Cloth's fruit, an
  // evening favour you can play: the game's own rule, PLAN-084); tonight's warning sits on the market instead. The
  // night plays once every stall has tapped Lights out.
  const eveningChoices = s.phase === 'evening' && active >= 0 && eveningChoice(s, active);
  const evSheet = s.phase === 'evening' && activeHuman && !busy && eveningChoices;
  const mid = (() => {
    // The night, shown: every piece slides one box older (PLAN-071).
    if (c.night) return <NightShift key={`ns-${s.day}`} s={s} viewer={viewer} slide={c.nightSlide} />;
    if (s.phase === 'morning' && !busy) return picker >= 0
      ? <TraitPick s={s} p={picker} onPick={(t) => { fx.card(); act({ kind: 'trait', trait: t }, picker); }} />
      : <MorningCard s={s} viewer={viewer} lost={c.lastNight} juice={c.lastJuice} table />;
    // Offline the computer stalls decide first, so the sheet is up before the person's own turn: it must not say
    // "Bid in" then (PLAN-081). Online a waiting stall has always sent its choice (the room holds it until everyone has).
    if (orderUp) return <OrderPanel key={`or-${s.day}-${orderSeat}`} s={s} p={orderSeat} waiting={!ordering} canChange={!!online} shown={c.orderShow}
      decided={!!online || (s.standing?.bids[viewer] ?? null) !== null} onBid={(price) => { if (ordering || online) { fx.card(); act({ kind: 'order', price }); } }} />;
    // Stocking, pricing, the bell, the Favoured Trade question and the takings: one element, kept while its contents
    // change, so the lanes never show between them (sheet.ts slides a panel only when it is replaced).
    if (dayOn) return <DaySheet key={`day-${s.day}-${viewer}`} s={s} viewer={viewer} c={c} online={!!online} tip={!!coach} />;
    if (evSheet) return <EveningSheet key={`ev-${s.day}-${active}`} s={s} p={active} onUpgrade={(u) => act({ kind: 'upgrade', upgrade: u })} onCard={c.playCard} onShade={(f) => act({ kind: 'shade', fruit: f })}
      onDone={() => { fx.tap(); act({ kind: 'endEvening' }); }} />;
    return null;
  })();
  covered.current = !!mid;
  const offSeats = offline.map((x) => x.seat);

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
    <div class={`game gx tkt ph-${s.phase} ${coach && (s.phase === 'stall' || s.phase === 'bid') ? 'coach-row' : ''} ${c.night ? 'is-night' : ''} ${s.config.days - s.day < 3 ? 'finale' : ''} ${s.day === s.config.days ? 'final-day' : ''} ${loadSettings().patterns ? 'patterns' : ''}`} onClick={tapTable}>
      <TopBar s={s} viewer={viewer} night={c.night} on={onTable} onMenu={() => c.setMenu(true)} onEvent={() => c.setEventInfo(!c.eventInfo)} />
      {c.eventInfo && <EventPop c={c} viewer={viewer} />}
      {online && (c.conn !== 'open' || offline.length > 0) && (
        <div class="net">
          {c.conn !== 'open' && <div class="net-strip bad">Reconnecting to the room…</div>}
          {c.conn === 'open' && offline.map((x) => (
            <div class="net-strip">
              {x.bot ? `A computer is playing for ${x.name} until they come back.`
                : x.takeoverAt ? `${x.name} disconnected. A computer takes over in ${Math.max(0, Math.ceil((x.takeoverAt - c.nowTick) / 1000))}s.`
                : `${x.name} is offline.`}
            </div>
          ))}
        </div>
      )}

      <section class="street-wrap" data-a="street">
        <Street s={s} viewer={viewer} onTip={(t) => c.setTip(t)} onScout={c.scout !== null && activeHuman ? c.pickWalkIn : undefined} />
        <Tomorrow s={s} viewer={viewer} onTip={(t) => c.setTip(t)} />
        <OrderStrip s={s} viewer={viewer} />
      </section>
      {/* The stalls: in buying order while they buy (you among them), your rivals the rest of the day (PLAN-085). */}
      {rivals.length > 0 && <Stalls s={s} viewer={viewer} boards={boards} open={openRival} off={offSeats}
        onOpen={(p) => c.setRival(openRival === p ? null : p)} onClose={() => c.setRival(null)} />}
      <div class={`centre ${mid ? 'covered' : ''}`} ref={sheet.centre}>
        {/* The farmer's lorry parks at the market's sign from the morning delivery until buying ends. */}
        <Market s={s} p={viewer} lorry={lorryHere}
          note={s.phase === 'evening' && activeHuman && !eveningChoices ? eveningNote(s, active) : undefined}
          onPick={s.phase === 'buy' && activeHuman ? c.pickMarket : undefined}
          canPick={(f, pos) => freeFruit !== null || !canBuy(s, active, f, pos)}
          onPulse={() => c.setPulseInfo(!c.pulseInfo)} />
        {/* where the picture of a panel that has just left slides off (sheet.ts) */}
        <div class="tk-sheet" ref={sheet.host} aria-hidden="true" />
        {mid}
      </div>
      <MyStall s={s} p={viewer} night={c.night ? c.nightSlide : undefined} onCard={activeHuman ? c.playCard : undefined} flashCards={freeFruit !== null} />

      {/* While stocking or pricing, bidding for a standing order or deciding the evening, the panel's own buttons
          (.pp-lock) take the action bar's place. */}
      {!pricing && !stalling && !orderUp && !tying && !evSheet && <ActionBar c={c} pl={pl} limit={limit} picker={picker} online={!!online} />}

      {/* The rush: a sheet over the table from the customer row down, under the flying fruit. It stays a moment after
          the last customer, to slide off, so it is drawn here all the time and decides for itself. */}
      <Showdown s={s} a={show} shared={!online && humans.length > 1} />
      <div class="fx-layer" ref={c.layerRef} />
      {c.banner && <div class="phase-banner" key={c.banner} aria-hidden="true"><span>{c.banner}</span></div>}
      {c.toast && <div class="toast">{c.toast}</div>}
      <Popovers c={c} coach={coach} onExit={onExit} onWear={online ? (l) => online.wear(l) : undefined} />
    </div>
  );
}

/** The evening's warning on the market (PLAN-076), as the evening panel words it: what spoils or turns to juice tonight. */
function eveningNote(s: GameState, p: number): { text: string; good: boolean } | undefined {
  const night = nightOutlook(s, p);
  const text = [tonightText(night), heatwaveLine(s, p)].filter(Boolean).join(' ');
  return text ? { text, good: night.spoil === 0 && !heatwaveLine(s, p) } : undefined;
}
