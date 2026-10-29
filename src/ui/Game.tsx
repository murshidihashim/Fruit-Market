// The game table: lays out the street, the stalls and the market, and the panels for each phase.
// State and turn logic live in game/useGameController; animations in game/animator.
import { buyLimit, canBuy, type GameState } from '../engine/game';
import type { OnlineClient } from '../net/client';
import { Face } from './art';
import * as A from './anim';
import { EveningPanel, PricePanel, StallPanel } from './panel';
import { Lorry, Market, MyStall, RivalDrop, RivalStall, Street, seats, type Board } from './table';
import { fx } from './fx';
import { tipFor } from './tutorial';
import { loadSettings } from './store';
import { useGameController } from './game/useGameController';
import { TopBar } from './game/panels/TopBar';
import { MorningCard } from './game/panels/MorningCard';
import { TraitPick } from './game/panels/TraitPick';
import { Showdown } from './game/panels/Showdown';
import { SalesSummary } from './game/panels/SalesSummary';
import { Results } from './game/panels/Results';
import { ActionBar } from './game/panels/ActionBar';
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
  const { s, busy, busyRef, active, activeHuman, viewer, meta, humans, waitingFor, offline, freeFruit, show, act } = c;

  if (c.needHandoff) {
    const pl = s.players[active];
    return (
      <div class="handoff" onClick={() => { fx.tap(); c.setHandedTo(active); }}>
        <div class="avatar xl"><Face who={pl.avatar} size={96} /></div>
        <h2>Pass the phone to {pl.name}</h2>
        <p>{s.phase === 'bid' ? 'Secret prices. No peeking!' : s.phase === 'stall' ? 'Fill your for-sale crate. No peeking!' : s.phase === 'buy' ? 'Your turn to buy fruit.' : 'Your evening.'}</p>
        <button class="btn primary big">Tap to start</button>
      </div>
    );
  }

  if (s.phase === 'over') {
    return (
      <div class="game">
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
  const lorryHere = (s.phase === 'morning' || s.phase === 'buy') && !s.event?.noDelivery;
  // Price boards on the seats: sealed while pricing (only whether a shop has finished is public),
  // then flipped open one by one, highest price first, as each showdown is revealed.
  const boards: Record<number, Board> = {};
  if (s.phase === 'bid') rivals.forEach((p) => { boards[p] = { state: s.bids[p] === null ? 'thinking' : 'sealed', ai: s.players[p].kind === 'ai' }; });
  if (s.phase === 'stall') rivals.forEach((p) => { boards[p] = { state: s.stalls[p] === null ? 'thinking' : 'sealed', ai: s.players[p].kind === 'ai' }; });
  if (show) {
    const order = show.line.offers.map((o, i) => ({ o, i })).sort((x, y) => y.o.price - x.o.price || y.i - x.i);
    order.forEach(({ o, i }, k) => {
      const done = show.stage === 'result';
      boards[o.player] = k < show.shown
        ? { state: 'open', price: o.price, res: done ? (o.sold ? 'won' : 'lost') : undefined, tag: done ? show.story.tags[i] : undefined }
        : { state: 'sealed' };
    });
  }
  const limit = pl ? buyLimit(pl) : 4;
  const pricing = s.phase === 'bid' && c.myBidTurn && !busy;
  const stalling = s.phase === 'stall' && c.myBidTurn && !busy;

  // Cards that sit on top of the market in the middle of the table.
  const overlay = (() => {
    if (s.phase === 'morning' && !busy && picker >= 0) return <TraitPick s={s} p={picker} onPick={(t) => { fx.card(); act({ kind: 'trait', trait: t }, picker); }} />;
    if (s.phase === 'reveal') return show ? <Showdown s={s} a={show} viewer={viewer} /> : c.revealDone ? <SalesSummary s={s} viewer={viewer} /> : null;
    return null;
  })();

  // The morning event card fills the screen above the action bar (PLAN-013).
  const sheet = s.phase === 'morning' && !busy && picker < 0
    ? <div class="full-sheet morning-sheet"><MorningCard s={s} viewer={viewer} lost={c.lastNight} /></div>
    : null;

  // Decisions that need more room: pricing fills the screen on phones (side panel on desktop).
  const tray = (() => {
    if (stalling) return <StallPanel key={`st-${s.day}-${bidder}`} s={s} p={bidder} onSubmit={(stall) => { fx.card(); act({ kind: 'stall', stall }); }} />;
    if (pricing) return <PricePanel key={`${s.day}-${bidder}`} s={s} p={bidder} onSubmit={(posts, fav) => { fx.card(); act({ kind: 'prices', posts, favoured: fav }); }} />;
    if (s.phase === 'evening' && activeHuman && !busy) return <EveningPanel s={s} p={active} onUpgrade={(u) => act({ kind: 'upgrade', upgrade: u })} onCard={c.playCard} />;
    return null;
  })();

  return (
    <div class={`game ${c.night ? 'is-night' : ''} ${s.config.days - s.day < 3 ? 'finale' : ''} ${s.day === s.config.days ? 'final-day' : ''} ${loadSettings().patterns ? 'patterns' : ''}`} onClick={() => busyRef.current && A.hurryUp()}>
      <TopBar s={s} viewer={viewer} onMenu={() => c.setMenu(true)} onEvent={() => c.setEventInfo(!c.eventInfo)} onRival={c.setRival} offline={offline.map((x) => x.seat)} />
      {c.eventInfo && <EventPop c={c} viewer={viewer} />}
      {online && c.conn !== 'open' && <div class="net-strip bad">Reconnecting to the room…</div>}
      {online && c.conn === 'open' && offline.map((x) => (
        <div class="net-strip">
          {x.bot ? `A computer is playing for ${x.name} until they come back.`
            : x.takeoverAt ? `${x.name} disconnected. A computer takes over in ${Math.max(0, Math.ceil((x.takeoverAt - c.nowTick) / 1000))}s.`
            : `${x.name} is offline.`}
        </div>
      ))}

      <div class={`play ${tray ? 'has-tray' : ''} ${pricing || stalling ? 'tray-full' : ''}`}>
        <div class="table">
          {/* The farmer's lorry parks in the street from the morning delivery until buying ends; customers step aside. */}
          <div class={`street-wrap ${lorryHere ? 'lorry-here' : ''}`} data-a="street"><Street s={s} viewer={viewer} onTip={(t) => c.setTip(t)} onScout={c.scout !== null && activeHuman ? c.pickWalkIn : undefined} /><Lorry here={lorryHere} /></div>
          {rivals.length > 0 && (
            <div class="seats">
              {rivals.map((p) => <RivalStall s={s} p={p} board={boards[p]} open={openRival === p} onOpen={() => c.setRival(openRival === p ? null : p)} />)}
              {openRival !== null && <RivalDrop s={s} p={openRival} onClose={() => c.setRival(null)} />}
            </div>
          )}
          <div class="centre">
            <Market s={s} p={viewer}
              onPick={myBuyTurn ? c.pickMarket : undefined}
              canPick={(f, pos) => freeFruit !== null || !canBuy(s, active, f, pos)}
              onPulse={() => c.setPulseInfo(!c.pulseInfo)} />
            {overlay}
          </div>
          <MyStall s={s} p={viewer} board={boards[viewer]} onCard={activeHuman ? c.playCard : undefined} flashCards={freeFruit !== null} />
        </div>
        {tray && <div class="tray-wrap">{tray}</div>}
        {sheet}
      </div>

      {!pricing && <ActionBar c={c} pl={pl} limit={limit} picker={picker} online={!!online} />}

      <div class="fx-layer" ref={c.layerRef} />
      {c.banner && <div class="phase-banner" key={c.banner} aria-hidden="true"><span>{c.banner}</span></div>}
      {c.toast && <div class="toast">{c.toast}</div>}
      <Popovers c={c} coach={coach} onExit={onExit} />
    </div>
  );
}
