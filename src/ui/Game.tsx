// The game table: lays out the street, the stalls and the market, and the panels for each phase.
// State and turn logic live in game/useGameController; animations in game/animator.
import { useMemo } from 'preact/hooks';
import { buyLimit, canBuy, eveningChoice, nightOutlook, publicView, type GameState } from '../engine/game';
import { heatwaveLine, tonightText } from '../engine/story';
import type { OnlineClient } from '../net/client';
import { Face } from './art';
import * as A from './anim';
import { EveningSheet, PricePanel, StallPanel } from './panel';
import { Market, MyStall, RivalDrop, RivalStall, Street, Tomorrow, seats, type Board } from './table';
import { fx } from './fx';
import { tipFor } from './tutorial';
import { loadSettings } from './store';
import { useGameController } from './game/useGameController';
import { useStockShown } from './stockShown';
import { useSheet } from './sheet';
import { TopBar } from './game/panels/TopBar';
import { MorningCard } from './game/panels/MorningCard';
import { TraitPick } from './game/panels/TraitPick';
import { Showdown } from './game/panels/Showdown';
import { rushBoard } from './game/rush';
import { SalesSummary } from './game/panels/SalesSummary';
import { Results } from './game/panels/Results';
import { ActionBar } from './game/panels/ActionBar';
import { OrderPanel, OrderStrip } from './game/panels/OrderPanel';
import { NightShift } from './game/panels/NightShift';
import { CratesOpen, TiePanel } from './game/panels/PricingTable';
import { EventPop, Popovers } from './game/panels/Popovers';

interface Props {
  initial: GameState;
  onExit: () => void;
  onChange: (s: GameState) => void;
  onRematch: () => void;
  /** Online play: the server owns the game; this screen sends actions and animates the states it receives. */
  online?: OnlineClient;
}

export function Game({ initial, onExit, onChange, onRematch, online }: Props) {
  const c = useGameController(initial, onChange, online);
  // Your shelf dock drops as each customer is served in the rush (stockShown.ts), so the table redraws then.
  useStockShown();
  // The middle panel slides onto the table and off again (sheet.ts); the table underneath stays where it is.
  const sheet = useSheet();
  const { busy, active, activeHuman, viewer, meta, humans, waitingFor, offline, freeFruit, show, act } = c;
  // Rules 15, secret stalls: the screen is drawn from what this stall may see. A rival's shelf is blank, and its crate
  // is only a number of pieces until the bell (online the server has already sent it that way).
  const s = useMemo(() => publicView(c.s, viewer), [c.s, viewer]);
  // The customers, the rivals and your shelf keep their places all day; only the middle changes (PLAN-072).

  if (c.needHandoff) {
    const pl = s.players[active];
    return (
      <div class="handoff" onClick={() => { fx.tap(); c.setHandedTo(active); }}>
        <div class="avatar xl"><Face who={pl.avatar} size={96} /></div>
        <h2>Pass the phone to {pl.name}</h2>
        <p>{s.phase === 'order' ? 'A secret bid for the standing order. No peeking!' : s.phase === 'bid' ? 'Secret prices. No peeking!' : s.phase === 'stall' ? 'Fill your for-sale crate. No peeking!' : s.phase === 'buy' ? 'Your turn to buy fruit.' : s.phase === 'tie' ? 'One of your prices is tied. Play Favoured Trade, or keep it?' : 'Your evening.'}</p>
        <button class="btn primary big">Tap to start</button>
      </div>
    );
  }

  if (s.phase === 'over') {
    return (
      <div class="game tkt">
        <TopBar s={s} viewer={viewer} onMenu={() => c.setMenu(true)} />
        <main class="scroll"><Results s={s} viewer={viewer} onExit={onExit}
          onRematch={online ? () => { fx.tap(); online.rematch(); } : onRematch}
          rematchNote={online && meta && meta.rematch.length ? (meta.rematch.includes(viewer) ? `Waiting for ${waitingFor(humans.filter((i) => !meta.rematch.includes(i)))} to accept…` : `${waitingFor(meta.rematch)} wants a rematch!`) : undefined}
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
    myBuyTurn, boughtToday: pl?.boughtToday ?? 0, pricing: c.myBidTurn,
    picker: picker >= 0, evening: s.phase === 'evening' && activeHuman,
  });
  // Rivals sit across the table in one row, in turn order after you.
  const rivals = seats(s.players.length, viewer).map((x) => x.p);
  const openRival = c.rival !== null && c.rival !== viewer ? c.rival : null;
  // The lorry drives in once the morning's news has been read (Start buying), then unloads (PLAN-065).
  const lorryHere = s.phase === 'buy' && !s.event?.noDelivery;
  // Price boards on the seats: sealed while pricing (only whether a shop has finished is public),
  // then flipped open as each customer's cards turn over in the rush pop-up.
  const boards: Record<number, Board> = {};
  if (s.phase === 'bid') rivals.forEach((p) => { boards[p] = { state: s.bids[p] === null ? 'thinking' : 'sealed', ai: s.players[p].kind === 'ai' }; });
  if (s.phase === 'stall') rivals.forEach((p) => { boards[p] = { state: s.stalls[p] === null ? 'thinking' : 'sealed', ai: s.players[p].kind === 'ai' }; });
  if (show) {
    // The rush pop-up: every stall's board stays sealed until the cards around the customer flip, all together.
    show.line.offers.forEach((o, i) => {
      const b = rushBoard(show.stage, o, show.story.tags[i]);
      boards[o.player] = b.open ? { state: 'open', price: o.price, res: b.res, tag: b.tag } : { state: 'sealed' };
    });
  }
  const limit = pl ? buyLimit(pl) : 4;
  const pricing = s.phase === 'bid' && c.myBidTurn && !busy;
  const stalling = s.phase === 'stall' && c.myBidTurn && !busy;
  // Rules 14: on a Market Day morning every stall bids in secret for the standing order. One sheet stays on the table
  // from the first stall's bid until the bids have been turned over (PLAN-084): while the computer stalls decide first,
  // while this stall bids, while it waits for the others (online it may still change its mind), and while the winner is
  // shown and its stake is put on the order's card (c.orderShow; the game has moved on to buying by then).
  const ordering = s.phase === 'order' && c.myBidTurn && !busy;
  const orderSeat = c.myBidTurn ? bidder : viewer;
  const orderUp = !!c.orderShow || (s.phase === 'order' && !!s.standing && s.players[viewer]?.kind === 'human');
  // Rules 18: after the flip a stall holding Favoured Trade with a tied price decides, in the open, whether to play it.
  const tying = s.phase === 'tie' && activeHuman && !busy;
  // Your stall is open and the rivals are still opening theirs: the pricing table waits on screen with their crates shut,
  // and stays there into pricing, so the crates drop in once and the lids lift as pricing starts (PLAN-065). Only for
  // one person at the table (online, or a single human): a shared phone hands over between people instead.
  const openedMine = online ? !c.myBidTurn : humans.length === 1 && s.stalls[viewer] !== null;
  const priceWait = (s.phase === 'stall' && !stalling && openedMine) || (s.phase === 'bid' && c.myBidTurn && busy);

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
    // The bell: every crate opens with its prices before the first customer is served (rules 15).
    if (c.bell && s.phase === 'reveal') return <CratesOpen s={s} viewer={viewer} />;
    if (s.phase === 'morning' && !busy) return picker >= 0
      ? <TraitPick s={s} p={picker} onPick={(t) => { fx.card(); act({ kind: 'trait', trait: t }, picker); }} />
      : <MorningCard s={s} viewer={viewer} lost={c.lastNight} juice={c.lastJuice} table />;
    // Offline the computer stalls decide first, so the sheet is up before the person's own turn: it must not say
    // "Bid in" then (PLAN-081). Online a waiting stall has always sent its choice (the room holds it until everyone has).
    if (orderUp) return <OrderPanel key={`or-${s.day}-${orderSeat}`} s={s} p={orderSeat} waiting={!ordering} canChange={!!online} shown={c.orderShow}
      decided={!!online || (s.standing?.bids[viewer] ?? null) !== null} onBid={(price) => { if (ordering || online) { fx.card(); act({ kind: 'order', price }); } }} />;
    if (stalling) return <StallPanel key={`st-${s.day}-${bidder}`} s={s} p={bidder} onSubmit={(stall, crate) => { fx.card(); act({ kind: 'stall', stall, crate }); }} />;
    if (priceWait) return <PricePanel key={`pr-${s.day}-${viewer}`} s={s} p={viewer} waiting onSubmit={() => undefined} />;
    if (pricing) return <PricePanel key={`pr-${s.day}-${bidder}`} s={s} p={bidder} onSubmit={(posts) => { fx.card(); act({ kind: 'prices', posts }); }} />;
    if (s.phase === 'tie' && active >= 0 && !busy) return <TiePanel key={`tie-${s.day}-${active}`} s={s} viewer={viewer} asked={active} onDecide={tying ? (play) => { fx.card(); act({ kind: 'tie', play }); } : undefined} />;
    if (s.phase === 'reveal') return !show && c.revealDone ? <SalesSummary s={s} viewer={viewer} /> : null;
    if (evSheet) return <EveningSheet key={`ev-${s.day}-${active}`} s={s} p={active} onUpgrade={(u) => act({ kind: 'upgrade', upgrade: u })} onCard={c.playCard} onShade={(f) => act({ kind: 'shade', fruit: f })}
      onDone={() => { fx.tap(); act({ kind: 'endEvening' }); }} />;
    return null;
  })();
  const offSeats = offline.map((x) => x.seat);

  // A tap on the table hurries what is playing until your next decision (PLAN-081), the rivals' turns included. Not a
  // tap on a button (PLAN-076: Lights out used to skip the whole night when you were the last stall to close). A market
  // box that cannot be bought from lets the tap through (ticket.css), so the lanes count as the table. While a
  // customer's card is up in the rush, a tap that reaches here (the bottom bar, beside Skip) moves on to the next
  // customer, like a tap anywhere else at that moment; only Skip hurries the whole rush.
  const tapTable = (e: MouseEvent) => {
    if ((e.target as Element).closest?.('button')) return;
    if (show) A.speedStep();
    else c.hurry();
  };
  return (
    <div class={`game gx tkt ph-${s.phase} ${coach && (s.phase === 'stall' || s.phase === 'bid') ? 'coach-row' : ''} ${c.night ? 'is-night' : ''} ${s.config.days - s.day < 3 ? 'finale' : ''} ${s.day === s.config.days ? 'final-day' : ''} ${loadSettings().patterns ? 'patterns' : ''}`} onClick={tapTable}>
      <TopBar s={s} viewer={viewer} night={c.night} onMenu={() => c.setMenu(true)} onEvent={() => c.setEventInfo(!c.eventInfo)} />
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
        <Street s={s} viewer={viewer} onTip={(t) => c.setTip(t)} onScout={c.scout !== null && activeHuman ? c.pickWalkIn : undefined}
          away={show?.line.customerId} served={show?.served} />
        <Tomorrow s={s} viewer={viewer} onTip={(t) => c.setTip(t)} />
        <OrderStrip s={s} viewer={viewer} />
      </section>
      {rivals.length > 0 && (
        <div class={`seats n${rivals.length}`} role="group" aria-label="Your rivals">
          {rivals.map((p) => <RivalStall s={s} p={p} board={boards[p]} open={openRival === p} off={offSeats.includes(p)} onOpen={() => c.setRival(openRival === p ? null : p)} />)}
          {openRival !== null && <RivalDrop s={s} p={openRival} onClose={() => c.setRival(null)} />}
        </div>
      )}
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
      <MyStall s={s} p={viewer} board={boards[viewer]} onCard={activeHuman ? c.playCard : undefined} flashCards={freeFruit !== null} />

      {/* While stocking or pricing, bidding for a standing order or deciding the evening, the panel's own buttons
          (.pp-lock) take the action bar's place. */}
      {!pricing && !stalling && !orderUp && !tying && !evSheet && <ActionBar c={c} pl={pl} limit={limit} picker={picker} online={!!online} />}

      {/* The rush pop-up sits over the whole table (the middle column on a desktop), under the flying fruit. */}
      {show && <Showdown s={s} a={show} viewer={viewer} />}
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
