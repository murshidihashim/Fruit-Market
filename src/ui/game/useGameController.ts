// The game screen's state and turn logic. Every state change goes through apply(), which plays
// the matching animation (delivery, buying, selling, night) before handing control back.
// Offline, actions run through the engine here; online, they go to the room server and the
// states it sends back are queued and animated one at a time.
import { useEffect, useMemo, useRef, useState } from 'preact/hooks';
import { aiStep } from '../../engine/ai';
import type { FruitId } from '../../engine/data';
import { activePlayer, canPlayFavour, winners, RuleError, type Action, type Customer, type GameState, publicView } from '../../engine/game';
import { overnightJuice, overnightLoss, type NightJuice } from '../../engine/story';
import type { OnlineClient } from '../../net/client';
import type { RoomView } from '../../net/protocol';
import { trackOnce } from '../../net/telemetry';
import * as A from '../anim';
import { holdCash } from '../cashShown';
import { holdStock, releaseStock } from '../stockShown';
import { fx } from '../fx';
import { loadSettings } from '../store';
import { delivery, moves, nightfall, reveal, type NightSlide } from './animator';
import { bidsTurned, holdBack, type OrderShow } from './dayBeats';
import { playLocal, undoPoint, waitsForPerson } from './turn';
import type { ShowState } from './panels/Showdown';


export function useGameController(initial: GameState, onChange: (s: GameState) => void, online?: OnlineClient) {
  const [s, setS] = useState(initial);
  const sRef = useRef(initial);
  const [busy, setBusy] = useState(false);
  const busyRef = useRef(false);
  const [tick, setTick] = useState(0);
  const [toast, setToast] = useState<string | null>(null);
  const [rival, setRival] = useState<number | null>(null);
  const [freeFruit, setFreeFruit] = useState<number | null>(null);
  /** Scout: the favour card being played while the player taps a face-down walk-in to look at. */
  const [scout, setScout] = useState<number | null>(null);
  const [handedTo, setHandedTo] = useState<number | null>(null);
  const [menu, setMenu] = useState(false);
  const [night, setNight] = useState(false);
  // The night panel's slide, set by the night's own script so both run on one clock (PLAN-081).
  const [nightSlide, setNightSlide] = useState<NightSlide>(null);
  // The bell has just rung: every crate is open on the table for a moment before the rush (rules 15).
  const [bell, setBell] = useState(false);
  // The bids for a standing order are in and are being turned over on the table (PLAN-084).
  const [orderShow, setOrderShow] = useState<OrderShow | null>(null);
  const [banner, setBanner] = useState<string | null>(null);
  const [revealDone, setRevealDone] = useState(initial.phase === 'reveal');
  const [cardInfo, setCardInfo] = useState<number | null>(null);
  const [tip, setTip] = useState<Customer | null>(null);
  const [eventInfo, setEventInfo] = useState(false);
  const [pulseInfo, setPulseInfo] = useState(false);
  const [, setTipTick] = useState(0);
  const [show, setShow] = useState<ShowState | null>(null);
  const [lastNight, setLastNight] = useState(0);
  // What the viewer's Juice Bar made last night, for the morning card.
  const [lastJuice, setLastJuice] = useState<NightJuice>({ pieces: 0, dollars: 0 });
  const turnStart = useRef<GameState | null>(null);
  const [meta, setMeta] = useState<RoomView | null>(online?.view ?? null);
  const [conn, setConn] = useState(online?.conn ?? 'open');
  const queue = useRef<GameState[]>([]);
  const lastVersion = useRef(online?.view?.version ?? 0);
  const undoSeen = useRef<number | null>(null);
  const sending = useRef(false);
  const layerRef = useRef<HTMLDivElement>(null);
  /** Fruit tapped while the last purchase was still animating (offline); bought in order as soon as the table is free. */
  const buyQueue = useRef<{ f: FruitId; pos: number }[]>([]);

  const humans = useMemo(() => s.players.map((p, i) => (p.kind === 'human' ? i : -1)).filter((i) => i >= 0), [s.players.length]);
  const multi = humans.length > 1;
  const active = activePlayer(s);
  const seat = online?.seat ?? null;
  const secret = s.phase === 'stall' || s.phase === 'bid' || s.phase === 'order';
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
  // Leaving the table mid-rush must not leave held-back totals behind for the next game. A hurry asked for at another
  // table (a game left while a rival was playing) does not carry over to this one either.
  useEffect(() => { A.resetHurry(); return () => { holdCash(null); releaseStock(); }; }, []);

  const say = (msg: string) => {
    setToast(msg);
    window.setTimeout(() => setToast((t) => (t === msg ? null : t)), A.BEAT.label.toast);
  };

  // ---------- animation sequencing ----------

  async function apply(next: GameState) {
    const prev = sRef.current;
    busyRef.current = true;
    setBusy(true);
    // Rules 18: when no stall has ripe fruit, nobody stocks or prices, and the rush follows buying directly.
    const rush = next.day === prev.day && (prev.phase === 'bid' || prev.phase === 'tie' || prev.phase === 'stall' || prev.phase === 'buy') && next.phase === 'reveal';
    // A tap's hurry is not reset at each step any more (PLAN-081): it lasts until the table waits for this player again
    // (see the end of this function), so one tap carries through every rival's turn. The rush is the exception: it
    // always starts at its own pace, with its own tap (next customer) and Skip.
    if (rush) A.resetHurry();
    try {
      if (next.day !== prev.day) {
        // The night is drawn from this stall's own view: what spoils behind a rival's shutter is not shown (rules 15).
        await nightfall(publicView(prev, viewer), setNight, setNightSlide);
        // The new day's pieces are already in their new boxes: the panel shows them at rest for its last moment.
        setNightSlide(null);
        setLastNight(overnightLoss(prev, next, viewer));
        setLastJuice(overnightJuice(prev, next, viewer));
      }
      // The game has already paid every sale. Show each total as it was before the rush; the sales add up as the coins land.
      // A standing order's stake has come back too (rules 18): it shows only once the rush is over.
      if (rush && next.results) holdCash(next.players.map((pl, i) => pl.cash - next.results!.income[i] - (next.results!.order?.holder === i ? next.results!.order.back : 0)));
      // The shelves likewise: each customer's pieces leave the shelf as they are served. The fast setting and reduced
      // motion show the final shelves at once.
      if (rush && next.results && !A.isReduced() && !A.isFast()) holdStock(prev.players.map((pl) => pl.stock), next.players.map((pl) => pl.stock));
      // The day's takings must not show before the rush has played: the card of an earlier day would otherwise be drawn
      // for a moment with today's results on it, ahead of the bell.
      if (rush) setRevealDone(false);
      // What the coming beat will show is held back at what it was (PLAN-084): every total before dawn's fine and
      // top-up, the winner's cash before a standing order's stake, an upgrade's price and its mark. When the bids for
      // a standing order are in, they stay on the table to be turned over (the sheet is drawn with the new state).
      const turned = holdBack(prev, next);
      if (turned) setOrderShow(turned);
      sRef.current = next;
      setS(next);
      onChange(next);
      await A.frame();
      if (next.day !== prev.day) {
        // The new day opens on the morning's event card; the lorry unloads only when buying starts (PLAN-065).
        setNight(false);
      } else if ((prev.phase === 'morning' || prev.phase === 'order') && next.phase === 'buy') {
        // The bids turned over together, the winner shown and its stake put on the order's card (PLAN-084).
        if (turned) await bidsTurned(turned, viewer, setOrderShow);
        await delivery(next);
        await moves(prev, next);
      } else if (rush) {
        setRevealDone(false);
        await reveal(next, viewer, setShow, setBell);
        setBell(false);
        setRevealDone(true);
      } else await moves(prev, next);
    } finally {
      holdCash(null);
      releaseStock();
      setOrderShow(null);
      busyRef.current = false;
      setBusy(false);
      // The hurry ends where the player decides something again. Online it also lasts through the states still waiting
      // to be shown. It only ever changes how fast this screen draws: never the game, and nothing is sent.
      if (!queue.current.length && waitsForPerson(sRef.current, online ? seat : null)) A.resetHurry();
      setTick((t) => t + 1);
      const q = buyQueue.current.shift();
      if (q) {
        const cur = sRef.current;
        const me = activePlayer(cur);
        if (cur.phase === 'buy' && me >= 0 && cur.players[me].kind === 'human') window.setTimeout(() => attempt(() => playLocal(sRef.current, activePlayer(sRef.current), { kind: 'buy', fruit: q.f, pos: q.pos })), 0);
        else buyQueue.current = [];
      }
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
      } else if (v.game && v.version === lastVersion.current && v.game.phase === 'order' && v.game.config.seed === sRef.current.config.seed) {
        // While a standing order is bid for, the room holds each person's choice until every stall has decided, so
        // the game has not moved on (the same version), but who is bidding and who has passed has changed, and this
        // person's own held bid is in the view (rules 17; PLAN-084: the marks used to stay on "deciding").
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
    // The pause before each rival action. A tap on the table ends it at once and keeps the next ones short (PLAN-081).
    let live = true;
    void A.pause(A.isFast() ? A.BEAT.rival.pauseFast : A.BEAT.rival.pause).then(() => {
      if (!live || busyRef.current) return;
      const next = aiStep(sRef.current);
      if (next) void apply(next);
    });
    return () => { live = false; };
  }, [s, tick]);

  /** A tap on the table (not on a button): hurry what is playing, and the rivals' turns, until this player decides again. */
  const hurry = () => {
    if (busyRef.current || !waitsForPerson(sRef.current, online ? seat : null)) A.hurryUp();
  };


  useEffect(() => {
    turnStart.current = undoPoint(turnStart.current, s, activeHuman);
  }, [s.phase, active, s.day]);

  useEffect(() => {
    if (s.phase === 'over') (winners(s).includes(viewer) ? fx.win : fx.lose)();
    const rem = s.config.days - s.day + 1;
    // The beat strip under the top bar says where the day is (PLAN-072); the stamp is kept for the countdown alone.
    const text = s.phase === 'morning' ? (rem === 1 ? 'FINAL DAY!' : rem === 3 ? 'FINAL 3 DAYS' : '') : '';
    if (!text) return;
    setBanner(text);
    const t = window.setTimeout(() => setBanner(null), A.BEAT.morning.stamp);
    return () => window.clearTimeout(t);
  }, [s.phase, s.day]);

  const pickMarket = (f: FruitId, pos: number) => {
    if (freeFruit !== null) {
      act({ kind: 'favour', idx: freeFruit, args: { fruit: f, pos } });
      setFreeFruit(null);
      return;
    }
    if (busyRef.current && !online && s.phase === 'buy' && buyQueue.current.length < 3) { buyQueue.current.push({ f, pos }); return; }
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
    if (id === 'scout') {
      const unseen = s.queue.filter((q) => !q.seenBy?.includes(active));
      if (unseen.length === 1) return act({ kind: 'favour', idx, args: { customer: unseen[0].id } });
      setScout(idx);
      return say('Tap a walk-in to look at them');
    }
    act({ kind: 'favour', idx });
  };

  const pickWalkIn = (customer: number) => {
    if (scout === null) return;
    act({ kind: 'favour', idx: scout, args: { customer } });
    setScout(null);
  };

  // Anonymous funnel counters: how far games get, and how they end.
  // Counted once per game even if the game is resumed or the online view reconnects.
  const gameKey = `${s.config.seed}-${s.config.daily ?? ''}`;
  useEffect(() => { if (s.phase !== 'over') trackOnce(`${gameKey}:day:${s.day}`, 'day_reached', s.day); }, [s.day]);
  useEffect(() => { if (online) trackOnce(`${gameKey}:start`, 'game_start', 'online'); }, []);
  useEffect(() => {
    if (s.phase !== 'over') return;
    trackOnce(`${gameKey}:end`, 'game_end', winners(s).includes(viewer) ? 'win' : 'lose');
    trackOnce(`${gameKey}:cash`, 'final_cash', Math.min(300, Math.floor(s.players[viewer].cash / 25) * 25));
    trackOnce(`${gameKey}:spoiled`, 'fruit_spoiled', Math.min(10, s.players[viewer].stats.spoiled));
    trackOnce(`${gameKey}:unsold`, 'fruit_unsold', Math.min(12, s.jam?.[viewer] ?? 0));
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
    setScout(null);
  };

  return {
    s, busy, busyRef, toast, rival, setRival, menu, setMenu, eventInfo, setEventInfo, pulseInfo, setPulseInfo, freeFruit, setFreeFruit, scout: s.phase === 'buy' ? scout : null, pickWalkIn, handedTo, setHandedTo, night, nightSlide, hurry, bell, orderShow, banner, revealDone,
    cardInfo, setCardInfo, tip, setTip, setTipTick, show, lastNight, lastJuice, turnStart, meta, conn, layerRef,
    humans, active, activeHuman, viewer, needHandoff, myBidTurn, waitingFor, humansMissingBids, votedMe,
    humansNotVoted, offline, nowTick, say, act, proceed, undo, pickMarket, playCard, reallyPlay,
  };
}

export type GameController = ReturnType<typeof useGameController>;
