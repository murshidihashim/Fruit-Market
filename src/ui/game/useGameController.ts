// The game screen's state and turn logic. Every state change goes through apply(), which plays
// the matching animation (delivery, buying, selling, night) before handing control back.
// Offline, actions run through the engine here; online, they go to the room server and the
// states it sends back are queued and animated one at a time.
import { useEffect, useMemo, useRef, useState } from 'preact/hooks';
import { aiStep } from '../../engine/ai';
import type { FruitId } from '../../engine/data';
import { activePlayer, canPlayFavour, ranking, RuleError, type Action, type Customer, type GameState } from '../../engine/game';
import { overnightLoss } from '../../engine/story';
import type { OnlineClient } from '../../net/client';
import type { RoomView } from '../../net/protocol';
import { trackOnce } from '../../net/telemetry';
import * as A from '../anim';
import { fx } from '../fx';
import { loadSettings } from '../store';
import { delivery, moves, nightfall, reveal } from './animator';
import { playLocal, undoPoint } from './turn';
import type { ShowState } from './panels/Showdown';

const BANNER = { morning: 'MORNING', buy: 'BUY FRUIT', stall: 'STOCKING', bid: 'THE BELL',  reveal: 'THE RUSH', evening: 'EVENING', over: '' } as const;

export function useGameController(initial: GameState, onChange: (s: GameState) => void, online?: OnlineClient) {
  const [s, setS] = useState(initial);
  const sRef = useRef(initial);
  const [busy, setBusy] = useState(false);
  const busyRef = useRef(false);
  const [tick, setTick] = useState(0);
  const [toast, setToast] = useState<string | null>(null);
  const [rival, setRival] = useState<number | null>(null);
  const [freeFruit, setFreeFruit] = useState<number | null>(null);
  const [handedTo, setHandedTo] = useState<number | null>(null);
  const [menu, setMenu] = useState(false);
  const [night, setNight] = useState(false);
  const [banner, setBanner] = useState<string | null>(null);
  const [revealDone, setRevealDone] = useState(initial.phase === 'reveal');
  const [cardInfo, setCardInfo] = useState<number | null>(null);
  const [tip, setTip] = useState<Customer | null>(null);
  const [eventInfo, setEventInfo] = useState(false);
  const [pulseInfo, setPulseInfo] = useState(false);
  const [, setTipTick] = useState(0);
  const [show, setShow] = useState<ShowState | null>(null);
  const [lastNight, setLastNight] = useState(0);
  const turnStart = useRef<GameState | null>(null);
  const [meta, setMeta] = useState<RoomView | null>(online?.view ?? null);
  const [conn, setConn] = useState(online?.conn ?? 'open');
  const queue = useRef<GameState[]>([]);
  const lastVersion = useRef(online?.view?.version ?? 0);
  const undoSeen = useRef<number | null>(null);
  const sending = useRef(false);
  const layerRef = useRef<HTMLDivElement>(null);

  const humans = useMemo(() => s.players.map((p, i) => (p.kind === 'human' ? i : -1)).filter((i) => i >= 0), [s.players.length]);
  const multi = humans.length > 1;
  const active = activePlayer(s);
  const seat = online?.seat ?? null;
  const secret = s.phase === 'stall' || s.phase === 'bid';
  const activeHuman = online ? active === seat && !secret : active >= 0 && s.players[active].kind === 'human';
  const lastViewer = useRef(seat ?? humans[0]);
  if (!online && activeHuman) lastViewer.current = active;
  const viewer = seat ?? lastViewer.current;
  const needHandoff = !online && multi && activeHuman && handedTo !== active && !busy;
  // Online: whose secret prices are still missing, and who still has to press continue.
  const myBidTurn = online ? secret && !!meta && !meta.submitted[viewer] : secret && activeHuman;
  const waitingFor = (idxs: number[]) => idxs.map((i) => s.players[i]?.name).filter(Boolean).join(' and ');
  // People the match is waiting on (a seat a computer is playing never holds things up).
  const live = online && meta ? humans.filter((i) => !meta.seats[i]?.bot) : humans;
  const humansMissingBids = online && meta ? live.filter((i) => !meta.submitted[i]) : [];
  const votedMe = !!online && !!meta && meta.votes.includes(viewer);
  const humansNotVoted = online && meta ? live.filter((i) => !meta.votes.includes(i)) : [];
  const offline = online && meta ? meta.seats.filter((x) => !x.connected || x.bot) : [];
  // Ticks once a second while someone is disconnected, for the takeover countdown.
  const [nowTick, setNowTick] = useState(() => Date.now());
  useEffect(() => {
    if (!offline.some((x) => x.takeoverAt && !x.bot)) return;
    const t = window.setInterval(() => setNowTick(Date.now()), 1000);
    return () => window.clearInterval(t);
  }, [offline.map((x) => `${x.seat}:${x.takeoverAt}:${x.bot}`).join()]);

  useEffect(() => {
    A.setLayer(layerRef.current);
    A.setBaseSpeed(loadSettings().fast);
    return () => A.setLayer(null);
  });

  const say = (msg: string) => {
    setToast(msg);
    window.setTimeout(() => setToast((t) => (t === msg ? null : t)), 2000);
  };

  // ---------- animation sequencing ----------

  async function apply(next: GameState) {
    const prev = sRef.current;
    busyRef.current = true;
    setBusy(true);
    A.resetHurry();
    try {
      if (next.day !== prev.day) {
        await nightfall(prev, setNight);
        setLastNight(overnightLoss(prev, next, viewer));
      }
      sRef.current = next;
      setS(next);
      onChange(next);
      await A.frame();
      if (next.day !== prev.day) {
        setNight(false);
        await delivery(next);
      } else if ((prev.phase === 'bid' || prev.phase === 'stall') && next.phase === 'reveal') {
        setRevealDone(false);
        await reveal(next, viewer, setShow);
        setRevealDone(true);
      } else await moves(prev, next);
    } finally {
      busyRef.current = false;
      setBusy(false);
      setTick((t) => t + 1);
    }
  }

  // ---------- turn handling ----------

  const attempt = (fn: () => GameState) => {
    if (busyRef.current) return false;
    try {
      void apply(fn());
      return true;
    } catch (e) {
      if (e instanceof RuleError) {
        fx.error();
        say(e.message);
        return false;
      }
      throw e;
    }
  };

  // Online: queue every server state and animate them one at a time.
  useEffect(() => {
    if (!online) return;
    const take = (v: RoomView) => {
      setMeta(v);
      sending.current = false;
      // Tell the table when someone takes their purchases back (not on the first view, so a reconnect stays quiet).
      if (undoSeen.current === null) undoSeen.current = v.undone?.n ?? 0;
      else if (v.undone && v.undone.n > undoSeen.current) {
        undoSeen.current = v.undone.n;
        if (v.undone.seat !== online.seat) say(`${v.seats[v.undone.seat]?.name ?? 'A player'} took back their purchases`);
      }
      if (v.game && v.version > lastVersion.current && v.game.config.seed === sRef.current.config.seed) {
        lastVersion.current = v.version;
        queue.current.push(v.game);
        setTick((t) => t + 1);
      }
    };
    const offView = online.onView(take);
    const offErr = online.onError((msg) => { sending.current = false; fx.error(); say(msg); });
    const offConn = online.subscribe(() => setConn(online.conn));
    // Anything that arrived between the first render and this effect would otherwise be missed
    // until the next message, which may never come if the room is waiting on this player.
    if (online.view) take(online.view);
    setConn(online.conn);
    return () => { offView(); offErr(); offConn(); };
  }, [online]);

  useEffect(() => {
    if (!online || busyRef.current || !queue.current.length) return;
    const next = queue.current.shift()!;
    if (JSON.stringify(next) === JSON.stringify(sRef.current)) { setTick((t) => t + 1); return; }
    void apply(next);
  }, [tick, online]);

  /** Every player decision goes through here: applied locally, or sent to the room server. */
  const act = (a: Action, seat?: number) => {
    if (busyRef.current) return;
    if (online) {
      if (sending.current) return;
      if (!online.act(a)) return say('Reconnecting…');
      sending.current = true;
      return;
    }
    const who = seat ?? (a.kind === 'stall' || a.kind === 'prices' ? activePlayer(sRef.current) : active);
    attempt(() => playLocal(sRef.current, who, a));
  };
  const proceed = () => {
    if (busyRef.current) return;
    fx.tap();
    if (online) { online.continue(); return; }
    act({ kind: s.phase === 'morning' ? 'begin' : 'finish' });
  };

  // Computer players act one step at a time, after any animation finishes.
  useEffect(() => {
    if (online) return;
    if (busyRef.current) return;
    if (s.phase === 'morning' || s.phase === 'reveal' || s.phase === 'over') return;
    if (active < 0 || s.players[active].kind !== 'ai') return;
    const t = window.setTimeout(() => {
      if (busyRef.current) return;
      const next = aiStep(sRef.current);
      if (next) void apply(next);
    }, loadSettings().fast ? 150 : 380);
    return () => window.clearTimeout(t);
  }, [s, tick]);

  // First day: the lorry delivers when the table appears.
  useEffect(() => {
    if (s.phase === 'morning' && s.day === 1) {
      busyRef.current = true;
      setBusy(true);
      A.frame().then(() => delivery(s)).finally(() => { busyRef.current = false; setBusy(false); setTick((t) => t + 1); });
    }
  }, []);

  useEffect(() => {
    turnStart.current = undoPoint(turnStart.current, s, activeHuman);
  }, [s.phase, active, s.day]);

  useEffect(() => {
    if (s.phase === 'over') (ranking(s)[0] === viewer ? fx.win : fx.lose)();
    const rem = s.config.days - s.day + 1;
    const text = s.phase === 'morning' ? (rem === 1 ? 'FINAL DAY!' : rem === 3 ? 'FINAL 3 DAYS' : `DAY ${s.day}`) : BANNER[s.phase];
    if (!text) return;
    setBanner(text);
    const t = window.setTimeout(() => setBanner(null), 1100);
    return () => window.clearTimeout(t);
  }, [s.phase, s.day]);

  const pickMarket = (f: FruitId, pos: number) => {
    if (freeFruit !== null) {
      act({ kind: 'favour', idx: freeFruit, args: { fruit: f, pos } });
      setFreeFruit(null);
      return;
    }
    act({ kind: 'buy', fruit: f, pos });
  };

  const playCard = (idx: number) => {
    const id = s.players[active]?.favours[idx];
    if (!id) return;
    setCardInfo(idx);
  };

  const reallyPlay = (idx: number) => {
    const id = s.players[active]?.favours[idx];
    setCardInfo(null);
    if (!id || canPlayFavour(s, active, idx)) return;
    if (id === 'freeFruit') {
      setFreeFruit(idx);
      return say('Tap a fruit at the market to take it free');
    }
    act({ kind: 'favour', idx });
  };

  // Anonymous funnel counters: how far games get, and how they end.
  // Counted once per game even if the game is resumed or the online view reconnects.
  const gameKey = `${s.config.seed}-${s.config.daily ?? ''}`;
  useEffect(() => { if (s.phase !== 'over') trackOnce(`${gameKey}:day:${s.day}`, 'day_reached', s.day); }, [s.day]);
  useEffect(() => { if (online) trackOnce(`${gameKey}:start`, 'game_start', 'online'); }, []);
  useEffect(() => {
    if (s.phase !== 'over') return;
    trackOnce(`${gameKey}:end`, 'game_end', ranking(s)[0] === viewer ? 'win' : 'lose');
    trackOnce(`${gameKey}:cash`, 'final_cash', Math.min(300, Math.floor(s.players[viewer].cash / 25) * 25));
    trackOnce('first_game_complete', 'first_game_complete');
  }, [s.phase]);

  /** Offline buying: put back everything bought this turn. */
  const undo = () => {
    if (online) {
      if (busyRef.current || sending.current) return;
      if (!online.undo()) return say('Reconnecting…');
      sending.current = true;
      setFreeFruit(null);
      return;
    }
    if (turnStart.current) { const t = turnStart.current; sRef.current = t; setS(t); onChange(t); }
    setFreeFruit(null);
  };

  return {
    s, busy, busyRef, toast, rival, setRival, menu, setMenu, eventInfo, setEventInfo, pulseInfo, setPulseInfo, freeFruit, setFreeFruit, handedTo, setHandedTo, night, banner, revealDone,
    cardInfo, setCardInfo, tip, setTip, setTipTick, show, lastNight, turnStart, meta, conn, layerRef,
    humans, active, activeHuman, viewer, needHandoff, myBidTurn, waitingFor, humansMissingBids, votedMe,
    humansNotVoted, offline, nowTick, say, act, proceed, undo, pickMarket, playCard, reallyPlay,
  };
}

export type GameController = ReturnType<typeof useGameController>;
