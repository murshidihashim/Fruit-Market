// The game screen's state and turn logic. Every state change goes through the turn driver (turnDriver.ts), which has
// the matching beat played (beatPlayer.ts: delivery, buying, selling, night) before handing control back. Offline,
// actions run through the engine; online, they go to the room server and the states it sends back are queued and
// played one at a time. This hook puts the parts together for the screen (useTableState.ts) and works out who is who
// at each drawing (seats.ts).
import { useEffect, useMemo, useRef, useState } from 'preact/hooks';
import { canPlayFavour, type Action, type Crate, type GameState } from '../../engine/game';
import type { FruitId } from '../../engine/data';
import type { OnlineClient } from '../../net/client';
import * as A from '../anim';
import { noteSeen, beforeBuying, tokenHeld } from '../firstShown';
import { fx } from '../fx';
import { loadUndo, saveUndo } from '../store';
import { playBeat } from './beatPlayer';
import { drawnFor, handOverOf, humansOf, namesOf, turnOf, waitsOf } from './seats';
import { bellDay } from './stepKind';
import { waitsForPerson } from './turn';
import { TurnDriver } from './turnDriver';
import { useComputers, useGameMoments, usePopups, useRoom, useTableShow, useTakeoverClock } from './useTableState';

export function useGameController(initial: GameState, onChange: (s: GameState) => void, online?: OnlineClient) {
  const [s, setS] = useState(initial);
  const [busy, setBusy] = useState(false);
  const [tick, setTick] = useState(0);
  const [handedTo, setHandedTo] = useState<number | null>(null);
  /** PLAN-123 (finding 1): the stall whose purchases the beat now playing shows (null: none). The market says whose
   *  turn it is from this while the pieces travel, not from the game, which has already moved on to the next stall. */
  const [mover, setMover] = useState<number | null>(null);
  /** The beat now playing is this phone's own purchase or Undo, so a tap on the market is kept for when it ends. */
  const [ownBeat, setOwnBeat] = useState(false);
  // S18 (PLAN-110): offline, a turn left mid-way (Home, or a reload) keeps its Undo point (store.ts).
  const [driver] = useState(() => new TurnDriver(initial, online, { version: online?.view?.version ?? 0, point: online ? null : loadUndo(initial) }));
  driver.handed = handedTo;
  const table = useTableShow(initial, driver);
  const pop = usePopups();
  // eslint-disable-next-line react-hooks/exhaustive-deps -- who is a person never changes in a game; the list keeps its identity
  const humans = useMemo(() => humansOf(s.players), [s.players.length]);
  const multi = humans.length > 1;
  const seat = online?.seat ?? null;
  const turn = turnOf(s, seat, !!online);
  const lastViewer = useRef(seat ?? humans[0]);
  lastViewer.current = drawnFor(lastViewer.current, turn, multi, handedTo, !!online);
  const viewer = seat ?? lastViewer.current;
  // Worked out as the screen is drawn (it changes only with the turn, or as a favour card is played), so the Undo button
  // is right on the very draw that shows the card played.
  const point = driver.pointFor(s, turn.activeHuman);
  useEffect(() => { if (!online) saveUndo(point); }, [point, online]);
  // PLAN-104: once the day's line-up is on show at rest (buying has begun, and no beat holds the First token), this
  // phone remembers it: the beat is not played again, and tomorrow's token slides from here.
  // eslint-disable-next-line react-hooks/exhaustive-deps -- noted as the day or its step changes, from the state then
  useEffect(() => { if (!beforeBuying(s) && s.order.length && !tokenHeld()) noteSeen(s); }, [s.day, s.phase]);
  driver.hooks = {
    play: (prev, next, kind, commit) => playBeat(prev, next, kind, { ...table, viewer, shared: !online && multi }, commit),
    settle: table.settle,
    show: (next) => { setS(next); onChange(next); },
    setBusy,
    setMover: (p, own) => { setMover(p); setOwnBeat(own); },
    redraw: () => setTick((t) => t + 1),
    say: pop.say,
    dropPick: (scout) => { pop.setFreeFruit(null); if (scout) pop.setScout(null); },
    humans,
    active: turn.active,
    later: (fn) => { window.setTimeout(fn, 0); },
  };
  const room = useRoom(online, driver, tick);
  const waits = waitsOf(s, room.meta, humans, viewer, turn, !!online);
  const nowTick = useTakeoverClock(waits.offline);
  useComputers(driver, s, turn.active, tick);
  const banner = useGameMoments(s, viewer, !!online);
  const hands = handsOf(driver, s, turn.actor, online, pop);
  // The bell has rung on this table today (the Favoured Trade question follows it).
  table.ringer.rangOn = bellDay(table.ringer.rangOn, s);
  return {
    s, busy, toast: pop.toast, rival: pop.rival, setRival: pop.setRival, menu: pop.menu, setMenu: pop.setMenu, eventInfo: pop.eventInfo,
    setEventInfo: pop.setEventInfo, pulseInfo: pop.pulseInfo, setPulseInfo: pop.setPulseInfo, freeFruit: pop.freeFruit, setFreeFruit: pop.setFreeFruit,
    scout: s.phase === 'buy' ? pop.scout : null, handedTo, setHandedTo, night: table.night, nightSlide: table.nightSlide, bell: table.bell,
    orderShow: table.orderShow, banner, revealDone: table.revealDone, cardInfo: pop.cardInfo, setCardInfo: pop.setCardInfo, tip: pop.tip,
    setTip: pop.setTip, setTipTick: pop.setTipTick, show: table.show, lastNight: table.lastNight, lastJuice: table.lastJuice, point,
    meta: room.meta, conn: room.conn, layerRef: table.layerRef, humans, active: turn.active, actor: turn.actor, activeHuman: turn.activeHuman,
    viewer, ...handOverOf(s, turn, multi, handedTo, busy, !!online), ...waits, waitingFor: (idxs: number[]) => namesOf(s, idxs), nowTick,
    say: pop.say, ...hands,
    /** S8: the person's own day not yet shown to them (null when there is none). */
    ownDay: (p: number) => driver.ownDay(p),
    /** The phone has been passed to `p`: their own day has been seen. */
    handTo: (p: number) => { driver.handTo(p); setHandedTo(p); },
    /** A tap on the table (not on a button): hurry what is playing, and the rivals' turns, until this player decides again. */
    hurry: () => { if (driver.busy || !waitsForPerson(driver.s, driver.seat)) A.hurryUp(); },
    /** PLAN-123: the stall whose purchases are being shown, and whether the beat is this phone's own purchase. */
    mover, ownBeat,
    /** The bell has rung on this table today (the Favoured Trade question follows it). */
    rung: table.ringer.rangOn === s.day,
  };
}

export type GameController = ReturnType<typeof useGameController>;

/** The player's decisions at the table: market taps, favour cards, the main button, Undo and Done. */
function handsOf(driver: TurnDriver, s: GameState, actor: number, online: OnlineClient | undefined, pop: ReturnType<typeof usePopups>) {
  const { freeFruit, setFreeFruit, scout, setScout, setCardInfo, say } = pop;
  /** Every player decision goes through here: applied locally, or sent to the room server. */
  const act = (a: Action, seat?: number) => driver.act(a, seat);
  return {
    act,
    proceed: () => {
      if (driver.busy) return;
      fx.tap();
      if (online) { online.continue(); return; }
      act({ kind: s.phase === 'morning' ? 'begin' : 'finish' });
    },
    pickMarket: (f: FruitId, pos: number) => {
      if (driver.handOverPending()) return;
      if (freeFruit !== null) {
        act({ kind: 'favour', idx: freeFruit, args: { fruit: f, pos } });
        setFreeFruit(null);
        return;
      }
      driver.pick(f, pos);
    },
    playCard: (idx: number) => {
      if (driver.handOverPending()) return;
      if (!s.players[actor]?.favours[idx]) return;
      setCardInfo(idx);
    },
    reallyPlay: (idx: number) => {
      const id = s.players[actor]?.favours[idx];
      setCardInfo(null);
      if (!id || canPlayFavour(s, actor, idx)) return;
      if (id === 'freeFruit') {
        setFreeFruit(idx);
        return say('Tap a piece at the Wholesale Market to take it for free');
      }
      if (id === 'scout') {
        const unseen = s.queue.filter((q) => !q.seenBy?.includes(actor));
        if (unseen.length === 1) return act({ kind: 'favour', idx, args: { customer: unseen[0].id } });
        setScout(idx);
        return say('Tap a walk-in to look at it');
      }
      act({ kind: 'favour', idx });
    },
    pickWalkIn: (customer: number) => {
      if (scout === null) return;
      act({ kind: 'favour', idx: scout, args: { customer } });
      setScout(null);
    },
    /** Offline buying: put back everything bought this turn. */
    undo: () => driver.undo(),
    /** Done buying: at once, or as soon as the piece on its way has landed. */
    endBuy: () => driver.endBuy(),
    /** This stall's crate as it opened it today: the game's, or online the one this screen sent while the room keeps
     *  crates back (null when neither is known). */
    ownCrate: (st: GameState, p: number): Crate | null => {
      const sent = driver.sentCrate;
      return st.crates?.[p] ?? (sent && sent.day === st.day && sent.seat === p ? sent.crate : null);
    },
  };
}
