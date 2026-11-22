// The game screen's state and turn logic. Every state change goes through apply(), which plays
// the matching animation (delivery, buying, selling, night) before handing control back.
// Offline, actions run through the engine here; online, they go to the room server and the
// states it sends back are queued and animated one at a time.
import { useEffect, useMemo, useRef, useState } from 'preact/hooks';
import { aiStep, computersEvening } from '../../engine/ai';
import type { FavourId, FruitId } from '../../engine/data';
import { activePlayer, canPlayFavour, count, eveningOpen, winners, RuleError, type Action, type Crate, type Customer, type GameState, publicView } from '../../engine/game';
import { overnightJuice, overnightLines, overnightLoss, tonightLine, type NightJuice } from '../../engine/story';
import { daySoldLine } from '../panel';
import { orderLine } from './panels/SalesSummary';
import type { OnlineClient } from '../../net/client';
import type { RoomView } from '../../net/protocol';
import { trackOnce } from '../../net/telemetry';
import * as A from '../anim';
import { holdCash } from '../cashShown';
import { holdStock, releaseStock } from '../stockShown';
import { holdRush, releaseRush } from '../rushShown';
import { releaseTable } from '../tableShown';
import { fx } from '../fx';
import { loadSettings, loadUndo, saveUndo } from '../store';
import { arrive, arriving, bellRings, delivery, holdArrival, holdDeals, holdDelivery, moves, nightfall, reveal, tieAnswer, tieFrom, tiePlayed, type BellShow, type NightSlide } from './animator';
import { bidsTurned, firstToken, holdBack, holdFirstToken, rowAppears, type OrderShow } from './dayBeats';
import { beforeBuying, noteSeen, releaseToken, tokenHeld } from '../firstShown';
import { awaitsHandOver, keepTap, playLocal, undoPoint, waitsForPerson, type KeptTap, type UndoPoint } from './turn';
import type { ShowState } from './rush';
import { endFirstSale, firstSaleGame, firstSaleSeen, guideSetsUp, guidedStep, soloSeat, spotlight } from '../tutorial';
import { hasFinishedGame } from '../FirstTime';


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
  /** handedTo as of the latest hand-over, for taps handled between drawings (REP-133 A-01). */
  const handedRef = useRef<number | null>(null);
  handedRef.current = handedTo;
  const [menu, setMenu] = useState(false);
  const [night, setNight] = useState(false);
  // The night panel's slide, set by the night's own script so both run on one clock (PLAN-081).
  const [nightSlide, setNightSlide] = useState<NightSlide>(null);
  // The bell is ringing (rules 15; PLAN-085): how many rows have turned face up so far; null when it is not ringing.
  const [bell, showBell] = useState<BellShow>(null);
  // The bell has its own sound (PLAN-086): the one this player has on, heard on this phone only. It sounds once, as
  // the bell starts to ring (the first time the bell shows anything), and is ready again once the bell is put away.
  const bellUp = useRef(false);
  /** The day on which the bell last rang on this table: from then until the takings the crates stay open. */
  const rangOn = useRef(0);
  const setBell = (open: BellShow) => {
    if (open !== null && !bellUp.current) fx.bell();
    if (open !== null) rangOn.current = sRef.current.day;
    bellUp.current = open !== null;
    showBell(open);
  };
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
  /** S8 (PLAN-110), a shared phone: each person's own takings, kept from the rush until the phone is next passed to them. */
  const ownDays = useRef<Record<number, OwnDay>>({});
  /** Where Undo goes back to (turn.ts): the turn's start, or just after the last favour card played on it (DEC-120). */
  // S18 (PLAN-110): offline, a turn left mid-way (Home, or a reload) keeps its Undo point (store.ts).
  const turnStart = useRef<UndoPoint | null>(online ? null : loadUndo(initial));
  const [meta, setMeta] = useState<RoomView | null>(online?.view ?? null);
  const [conn, setConn] = useState(online?.conn ?? 'open');
  const queue = useRef<GameState[]>([]);
  const lastVersion = useRef(online?.view?.version ?? 0);
  const undoSeen = useRef<number | null>(null);
  const sending = useRef(false);
  const layerRef = useRef<HTMLDivElement>(null);
  /** Fruit tapped while the last purchase was still animating (offline); bought in order as soon as the table is free. */
  const buyQueue = useRef<KeptTap[]>([]);
  /** Done was tapped while a piece was still on its way: buying ends as soon as the table is free (PLAN-085). */
  const endQueued = useRef(false);
  /** PLAN-123: Undo was tapped while a piece was still on its way: it is done as soon as the table is free. */
  const undoQueued = useRef(false);
  /** PLAN-123 (finding 1): the stall whose purchases the beat now playing shows (null: none). The market says whose
   *  turn it is from this while the pieces travel, not from the game, which has already moved on to the next stall. */
  const [mover, setMover] = useState<number | null>(null);
  /** The beat now playing is this phone's own purchase or Undo, so a tap on the market is kept for when it ends. */
  const [ownBeat, setOwnBeat] = useState(false);
  /** Online: the crate this screen sent as its stall opened (the room sends it back only once every stall is open). */
  const sentCrate = useRef<{ day: number; seat: number; crate: Crate } | null>(null);
  /** This stall's crate as it opened it today: the game's, or online the one this screen sent while the room keeps
   *  crates back (null when neither is known). */
  const ownCrate = (st: GameState, p: number): Crate | null =>
    st.crates?.[p] ?? (sentCrate.current && sentCrate.current.day === st.day && sentCrate.current.seat === p ? sentCrate.current.crate : null);
  // PLAN-113: the guided first sale (tutorial.ts decides, FirstTime.tsx draws it). Asked once, as the game opens: a
  // first-time player's solo game on Day 1. While it sets up the person's stall (`guiding`), its moves are played here.
  const [guided, setGuided] = useState(() => firstSaleGame(initial, !!online, !hasFinishedGame() && !firstSaleSeen()));
  const guideRef = useRef(guided);
  guideRef.current = guided;
  const guideDrives = (st: GameState) => guideRef.current && guideSetsUp(st, soloSeat(st));
  const guiding = guided && guideSetsUp(s, soloSeat(s));
  /** The guided first sale is over: played to the bell, or skipped (the table is the person's from here). */
  const endGuide = (skipped: boolean) => { endFirstSale(skipped); guideRef.current = false; setGuided(false); };

  const humans = useMemo(() => s.players.map((p, i) => (p.kind === 'human' ? i : -1)).filter((i) => i >= 0), [s.players.length]);
  const multi = humans.length > 1;
  const active = activePlayer(s);
  const seat = online?.seat ?? null;
  const secret = s.phase === 'stall' || s.phase === 'bid' || s.phase === 'order';
  // Rules 19: online, every person decides in the evening at the same time, until they say Lights out. (Offline the
  // phone is handed person by person: the evening's `active` is the next person still deciding.)
  const activeHuman = online
    ? (s.phase === 'evening' ? seat !== null && eveningOpen(s, seat) : active === seat && !secret)
    : active >= 0 && s.players[active].kind === 'human';
  /** The stall this phone acts for now: its own seat online, the stall whose turn it is offline. */
  const actor = online ? seat ?? -1 : active;
  const lastViewer = useRef(seat ?? humans[0]);
  // On a shared phone the table is drawn for the person who holds it: the next person's shelf is not drawn until the
  // phone has been handed to them (PLAN-085: a beat may now play between one person's last tap and the hand-over).
  if (!online && activeHuman && (!multi || handedTo === active)) lastViewer.current = active;
  const viewer = seat ?? lastViewer.current;
  // Worked out as the screen is drawn (it changes only with the turn, or as a favour card is played), so the Undo button
  // is right on the very draw that shows the card played.
  turnStart.current = undoPoint(turnStart.current, s, activeHuman);
  const point = turnStart.current;
  useEffect(() => { if (!online) saveUndo(point); }, [point]);
  const needHandoff = !online && multi && activeHuman && handedTo !== active && !busy;
  // REP-133 A-01: on a shared phone, from the moment the turn passes to someone not yet handed the phone (while the last
  // beat still plays, before the hand-over screen comes up) until they tap it, no tap on the table acts. A tap kept back
  // while a piece was landing (buyQueue, endQueued) is dropped too: it was the last person's.
  const handoffDue = !online && awaitsHandOver(s, handedTo);
  const handOverPending = () => !online && awaitsHandOver(sRef.current, handedRef.current);
  // Online: whose secret prices are still missing, and who still has to press continue.
  const myBidTurn = online ? secret && !!meta && !meta.submitted[viewer] : secret && activeHuman;
  const waitingFor = (idxs: number[]) => idxs.map((i) => s.players[i]?.name).filter(Boolean).join(' and ');
  // People the match is waiting on (a seat a computer is playing never holds things up).
  const live = online && meta ? humans.filter((i) => !meta.seats[i]?.bot) : humans;
  const humansMissingBids = online && meta ? live.filter((i) => !meta.submitted[i]) : [];
  // Rules 19: the people the evening is still waiting for (a computer has always decided).
  const eveningWaits = s.phase === 'evening' ? live.filter((i) => eveningOpen(s, i)) : [];
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
  useEffect(() => { A.resetHurry(); return () => { holdCash(null); releaseToken(); releaseStock(); releaseRush(); releaseTable(); }; }, []);
  // PLAN-104: once the day's line-up is on show at rest (buying has begun, and no beat holds the First token), this
  // phone remembers it: the beat is not played again, and tomorrow's token slides from here.
  useEffect(() => { if (!beforeBuying(s) && s.order.length && !tokenHeld()) noteSeen(s); }, [s.day, s.phase]);

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
    // The flip before a Favoured Trade question (rules 18; PLAN-085): the bell rings here, at its own pace, and not
    // again before the rush.
    const flip = next.day === prev.day && prev.phase === 'bid' && next.phase === 'tie';
    if (rush || flip) A.resetHurry();
    // Whose purchases this beat shows, and whether they are this phone's own (PLAN-123).
    const buyer = prev.phase === 'buy' && next.day === prev.day ? prev.order[prev.turn] ?? -1 : -1;
    const own = buyer >= 0 && next.phase === 'buy' && next.order[next.turn] === buyer && prev.players[buyer]?.kind === 'human'
      && (!online || buyer === seat);
    setMover(buyer >= 0 ? buyer : null);
    setOwnBeat(own);
    try {
      if (next.day !== prev.day) {
        // The night is drawn from this stall's own view: what spoils behind a rival's shutter is not shown (rules 15).
        await nightfall(publicView(prev, viewer), setNight, setNightSlide);
        // The new day's pieces are already in their new boxes: the panel shows them at rest for its last moment.
        setNightSlide(null);
        setLastNight(overnightLoss(prev, next, viewer));
        setLastJuice(overnightJuice(prev, next, viewer));
        // S8: a person who has not yet seen their own day hears what the night did to their shelf with it.
        for (const p of humans) {
          const d = ownDays.current[p];
          if (d && d.day === prev.day) d.night = overnightLines(overnightLoss(prev, next, p), overnightJuice(prev, next, p)).map((l) => l.text);
        }
      }
      // The game has already paid every sale. Show each total as it was before the rush; the sales add up as the coins land.
      // A standing order's stake has come back too (rules 18): it shows only once the rush is over.
      if (rush && next.results) holdCash(next.players.map((pl, i) => pl.cash - next.results!.income[i] - (next.results!.order?.holder === i ? next.results!.order.back : 0)));
      // The shelves likewise: each customer's pieces leave the shelf as they are served, at every speed and with
      // reduced motion too (PLAN-084: the final shelves used to show at the bell then). So do the customers' tickets
      // and a favour card won in the rush (rushShown.ts): a ticket is ticked and the card appears with its customer.
      if (rush && next.results) holdStock(prev.players.map((pl) => pl.stock), next.players.map((pl) => pl.stock));
      if (rush && next.results) holdRush(next.results, next.players.length);
      // The day's takings must not show before the rush has played: the card of an earlier day would otherwise be drawn
      // for a moment with today's results on it, ahead of the bell.
      if (rush) setRevealDone(false);
      // What the coming beat will show is held back at what it was (PLAN-084): every total before dawn's fine and
      // top-up, the winner's cash before a standing order's stake, an upgrade's price and its mark. When the bids for
      // a standing order are in, they stay on the table to be turned over (the sheet is drawn with the new state).
      const turned = holdBack(prev, next);
      if (turned) setOrderShow(turned);
      // A Favoured Trade answer (PLAN-085): where the card lies is noted before the question leaves the table.
      const tied = tieAnswer(prev, next);
      const cardFrom = tied ? tieFrom(tied, viewer) : null;
      // The flip before a Favoured Trade question: the bell is set ringing together with the new state, so the rows
      // are drawn shut from their first frame (they used to show open for a frame or two before the bell's script
      // shut them and turned them over). With reduced motion they are open at once, as the bell's script shows them.
      if (flip) setBell(A.isReduced() ? next.players.length : 0);
      // The table likewise (PLAN-085, tableShown.ts): the lanes before today's crates land, a box's number until its
      // piece lifts off, the shelf, the "bought today" marks and the cash until it lands, and the walk-ins face down
      // until their cards are turned.
      const toBuy = next.day === prev.day && (prev.phase === 'morning' || prev.phase === 'order') && next.phase === 'buy';
      if (toBuy) holdDelivery(next);
      // PLAN-104: as buying starts and the stalls' row is seen for the day, the First token waits where it lay until
      // its beat (rowAppears is a case of toBuy).
      holdFirstToken(prev, next);
      holdDeals(prev, next, viewer);
      const walkIns = arriving(prev, next, viewer);
      holdArrival(walkIns);
      // S8: the takings on a shared phone show nobody's own day; each person's is kept for their next hand-over.
      if (rush && next.results && !online && multi) {
        for (const p of humans) {
          const night = tonightLine(next, p);
          // REP-133 A-07: a standing order this person missed today, and the stake it cost them, is said here too.
          const order = orderLine(next.results, p);
          ownDays.current[p] = { day: next.day, line: daySoldLine(next, p, false), won: next.results.favours.filter((x) => x.player === p).map((x) => x.favour), order: next.results.order?.short ? order : null, night: night ? [night] : [] };
        }
      }
      sRef.current = next;
      setS(next);
      onChange(next);
      await A.frame();
      if (next.day !== prev.day) {
        // The new day opens on the morning's event card; the lorry unloads only when buying starts (PLAN-065).
        setNight(false);
      } else if (toBuy) {
        // The bids turned over together, the winner shown and its stake put on the order's card (PLAN-084).
        if (turned) await bidsTurned(turned, viewer, setOrderShow);
        // PLAN-123 (finding 1): the lorry unloads at once, while the First token goes round the seats (who buys first,
        // and why: on Day 1 it is drawn at random, PLAN-104), so the lanes are full before anyone can buy and are never
        // drawn empty while the token decides.
        await Promise.all([delivery(next), rowAppears(prev, next) ? firstToken(next) : null]);
        await moves(prev, next, viewer);
      } else if (flip) {
        await bellRings(next, setBell);
        setBell(null);
      } else if (rush) {
        setRevealDone(false);
        // Nobody stocks or prices today: the walk-ins still turn face up before the bell.
        await arrive(walkIns);
        // A card just played slides to its price tag and stamps it; the bell is not shown a second time.
        if (tied?.played) await tiePlayed(tied.p, cardFrom);
        await reveal(next, viewer, setShow, setBell, prev.phase === 'tie');
        setBell(null);
        setRevealDone(true);
      } else if (tied) {
        if (tied.played) await tiePlayed(tied.p, cardFrom);
      } else {
        await moves(prev, next, viewer);
        // The last stall has bought: the walk-ins turn face up one after another (PLAN-085).
        await arrive(walkIns);
      }
    } finally {
      holdCash(null);
      releaseToken();
      releaseStock();
      releaseRush();
      releaseTable();
      setOrderShow(null);
      setMover(null);
      setOwnBeat(false);
      busyRef.current = false;
      setBusy(false);
      // The hurry ends where the player decides something again. Online it also lasts through the states still waiting
      // to be shown. It only ever changes how fast this screen draws: never the game, and nothing is sent.
      if (!queue.current.length && waitsForPerson(sRef.current, online ? seat : null) && !guideDrives(sRef.current)) A.resetHurry();
      setTick((t) => t + 1);
      // Taps made while the piece was on its way: the next piece to buy, then Done (PLAN-085).
      const cur = sRef.current;
      const me = activePlayer(cur);
      const mine = cur.phase === 'buy' && me >= 0 && cur.players[me].kind === 'human' && (!online || me === seat) && !handOverPending();
      const q = mine ? buyQueue.current.shift() : undefined;
      if (!mine) { buyQueue.current = []; endQueued.current = false; undoQueued.current = false; }
      else if (undoQueued.current) { undoQueued.current = false; buyQueue.current = []; endQueued.current = false; window.setTimeout(undo, 0); }
      else if (q) window.setTimeout(() => attempt(() => playLocal(sRef.current, activePlayer(sRef.current), { kind: 'buy', fruit: q.f, pos: q.pos })), 0);
      else if (endQueued.current) { endQueued.current = false; window.setTimeout(sendEndBuy, 0); }
    }
  }

  // ---------- turn handling ----------

  /** Ends this person's buying turn (the table must be free). */
  const sendEndBuy = () => {
    if (busyRef.current || handOverPending()) return;
    if (online) { if (!sending.current && online.act({ kind: 'endBuy' })) sending.current = true; return; }
    const cur = sRef.current;
    const me = activePlayer(cur);
    if (cur.phase === 'buy' && me >= 0 && cur.players[me].kind === 'human') attempt(() => playLocal(sRef.current, me, { kind: 'endBuy' }));
  };

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
    let next = queue.current.shift()!;
    // A stall's buying turn is one beat where it can be (PLAN-085, DEC-098): the steps of that turn that are already
    // waiting here are shown together. Only what has arrived is gathered, so nothing waits for a step still to come.
    const cur = sRef.current;
    while (cur.phase === 'buy' && next.phase === 'buy' && next.day === cur.day && next.turn === cur.turn && queue.current.length
      && queue.current[0].phase === 'buy' && queue.current[0].day === cur.day) next = queue.current.shift()!;
    if (JSON.stringify(next) === JSON.stringify(sRef.current)) { setTick((t) => t + 1); return; }
    // Rules 19: while this person is still deciding in the evening, another stall's choice is not played as a beat: the
    // evening sheet lies over the table, and taking it away for a rival's label would lose the person's place. Its box
    // and its cash simply change; the person sees the rest of the evening once they say Lights out.
    if (eveningAside(cur, next, online.seat)) {
      sRef.current = next;
      setS(next);
      onChange(next);
      setTick((t) => t + 1);
      return;
    }
    void apply(next);
  }, [tick, online]);

  /** Every player decision goes through here: applied locally, or sent to the room server. */
  const act = (a: Action, seat?: number) => {
    if (busyRef.current) return;
    if (online) {
      if (sending.current) return;
      if (!online.act(a)) return say('Reconnecting…');
      sending.current = true;
      // The room keeps every crate back until every stall has opened (rules 15), this one's too: the round table
      // draws this stall's crate from what it sent (PLAN-099).
      if (a.kind === 'stall' && a.crate && online.seat !== null) sentCrate.current = { day: sRef.current.day, seat: online.seat, crate: a.crate };
      return;
    }
    if (handOverPending()) return;
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
    // Rules 19: the computers decide as the evening opens, all at once and without a pause: their builds and favour
    // cards are one beat, each label on its own stall. When a computer is the last stall to close, its Lights out (the
    // night) follows as a step of its own.
    if (s.phase === 'evening') {
      const cur = sRef.current;
      const next = computersEvening(cur, (p) => cur.players[p].kind === 'ai') ?? aiStep(cur);
      if (next) void apply(next);
      return;
    }
    // The pause before each rival action. A tap on the table ends it at once and keeps the next ones short (PLAN-081).
    let live = true;
    // A rival asked about Favoured Trade answers a moment later, so its question can be read (PLAN-085).
    void A.pause((A.isFast() ? A.BEAT.rival.pauseFast : A.BEAT.rival.pause) + (s.phase === 'tie' ? A.BEAT.tie.ask : 0)).then(() => {
      if (!live || busyRef.current) return;
      const cur = sRef.current;
      let next = aiStep(cur);
      // A rival's whole buying turn is one beat (PLAN-085, DEC-098): its steps are taken together, up to and with the
      // one that ends its turn, as long as the table stays in buying (the step that brings the customers is its own).
      while (next && cur.phase === 'buy' && next.phase === 'buy' && next.day === cur.day && next.turn === cur.turn) {
        const more = aiStep(next);
        if (!more || more.phase !== 'buy' || more.day !== cur.day) break;
        next = more;
      }
      if (next) void apply(next);
    });
    return () => { live = false; };
  }, [s, tick]);

  /** A tap on the table (not on a button): hurry what is playing, and the rivals' turns, until this player decides again. */
  const hurry = () => {
    if (busyRef.current || !waitsForPerson(sRef.current, online ? seat : null) || guideDrives(sRef.current)) A.hurryUp();
  };

  // PLAN-113: the guided first sale's moves for the person's stall, after any animation, each after a pause (a tap ends
  // it): a longer one on the morning card, to read it, and a rival's pause before each buying and stocking turn.
  useEffect(() => {
    if (!guided || online || busyRef.current) return;
    const cur = sRef.current;
    const me = soloSeat(cur);
    // Over without its question: the game is past it (the person's crate is empty, or a game reopened later), or no
    // customer in the row would pay for what is in the person's crate (they price it on the table as always).
    const mine = cur.phase === 'bid' && activePlayer(cur) === me;
    if (!firstSaleGame(cur, false, true) || (cur.phase === 'bid' && cur.bids[me] !== null) || (mine && !spotlight(publicView(cur, me), me))) {
      endGuide(false);
      return;
    }
    if (!guideSetsUp(cur, me)) return;
    let live = true;
    const wait = cur.phase === 'morning' ? A.hold(A.FEEL.read * 2) : A.pause(A.isFast() ? A.BEAT.rival.pauseFast : A.BEAT.rival.pause);
    void wait.then(() => {
      if (!live || busyRef.current || !guideRef.current) return;
      const next = guidedStep(sRef.current, me);
      if (next) void apply(next);
    });
    return () => { live = false; };
  }, [s, tick, guided]);


  useEffect(() => {
    if (s.phase === 'over') (winners(s).includes(viewer) ? fx.win : fx.lose)();
    const rem = s.config.days - s.day + 1;
    // The beat strip under the top bar says where the day is (PLAN-072); the stamp is kept for the countdown alone.
    // PLAN-114: not on the first morning of a three-day game (the Market Sprint): all three days are left, not the last.
    const text = s.phase === 'morning' ? (rem === 1 ? 'LAST DAY' : rem === 3 && s.day > 1 ? 'LAST 3 DAYS' : '') : '';
    if (!text) return;
    setBanner(text);
    const t = window.setTimeout(() => setBanner(null), A.BEAT.morning.stamp);
    return () => window.clearTimeout(t);
  }, [s.phase, s.day]);

  const pickMarket = (f: FruitId, pos: number) => {
    if (handOverPending()) return;
    if (freeFruit !== null) {
      act({ kind: 'favour', idx: freeFruit, args: { fruit: f, pos } });
      setFreeFruit(null);
      return;
    }
    // PLAN-123: a tap while this phone's own piece is on its way is kept for when it lands, if it will still be a
    // purchase the rules allow then (turn.ts keepTap); any other tap while a beat plays is not taken.
    if (busyRef.current) {
      const cur = sRef.current;
      const me = activePlayer(cur);
      if (!online && cur.phase === 'buy' && !undoQueued.current && buyQueue.current.length < 3 && keepTap(cur, me, buyQueue.current, { f, pos })) buyQueue.current.push({ f, pos });
      return;
    }
    act({ kind: 'buy', fruit: f, pos });
  };

  const playCard = (idx: number) => {
    if (handOverPending()) return;
    const id = s.players[actor]?.favours[idx];
    if (!id) return;
    setCardInfo(idx);
  };

  const reallyPlay = (idx: number) => {
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
    trackOnce(`${gameKey}:unsold`, 'fruit_unsold', Math.min(12, count(s.players[viewer].stock, undefined, true)));
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
    // The pieces travel back to their boxes (PLAN-085): the turn's first state (or the one just after the last favour
    // card played, which stays played) is shown like any other step.
    const t = turnStart.current?.at;
    if (handOverPending()) return;
    buyQueue.current = [];
    endQueued.current = false;
    // PLAN-123: Undo while a piece is on its way drops the taps kept back and is done as soon as the piece has landed.
    if (busyRef.current) { undoQueued.current = true; return; }
    if (t && t !== sRef.current) void apply(t);
    setFreeFruit(null);
    setScout(null);
  };

  /** S8: the person's own day not yet shown to them (null when there is none). */
  const ownDay = (p: number): OwnDay | null => ownDays.current[p] ?? null;
  /** The phone has been passed to `p`: their own day has been seen. */
  const handTo = (p: number) => {
    delete ownDays.current[p];
    handedRef.current = p;
    setHandedTo(p);
  };

  /** Done buying: at once, or as soon as the piece on its way has landed. */
  const endBuy = () => {
    if (handOverPending()) return;
    setFreeFruit(null);
    if (busyRef.current) { endQueued.current = true; return; }
    sendEndBuy();
  };

  return {
    s, busy, busyRef, toast, rival, setRival, menu, setMenu, eventInfo, setEventInfo, pulseInfo, setPulseInfo, freeFruit, setFreeFruit, scout: s.phase === 'buy' ? scout : null, pickWalkIn, handedTo, setHandedTo, night, nightSlide, hurry, bell, orderShow, banner, revealDone,
    cardInfo, setCardInfo, tip, setTip, setTipTick, show, lastNight, lastJuice, turnStart, meta, conn, layerRef,
    humans, active, actor, activeHuman, viewer, needHandoff, handoffDue, myBidTurn, waitingFor, humansMissingBids, eveningWaits, votedMe,
    humansNotVoted, offline, nowTick, say, act, proceed, undo, endBuy, pickMarket, playCard, reallyPlay, ownCrate, ownDay, handTo,
    /** PLAN-113: the guided first sale is on in this game, and is setting up the person's stall now. */
    guided, guiding, endGuide,
    /** PLAN-123: the stall whose purchases are being shown, and whether the beat is this phone's own purchase. */
    mover, ownBeat,
    /** The bell has rung on this table today (the Favoured Trade question follows it). */
    rung: (s.phase === 'tie' ? (rangOn.current = s.day) : rangOn.current) === s.day,
  };
}

export type GameController = ReturnType<typeof useGameController>;

/** S8 (PLAN-110): one person's own day on a shared phone, shown at their next hand-over. */
export interface OwnDay {
  day: number;
  /** The day's money ("Sold $12 · bought $9 · up $3"). */
  line: string;
  /** Favour cards won in the rush. */
  won: FavourId[];
  /** A standing order they held today and did not deliver in full: how many and the stake lost (null: none). */
  order: string | null;
  /** What the night does, or did, to their shelf. */
  night: string[];
}

/**
 * Rules 19, online: a state that only changes other stalls while this person is still deciding in the evening (the
 * same evening, and their own stall as it was). It is drawn at once, not played as a beat.
 */
export function eveningAside(prev: GameState, next: GameState, seat: number | null): boolean {
  if (seat === null || prev.phase !== 'evening' || next.phase !== 'evening' || prev.day !== next.day) return false;
  if (!eveningOpen(prev, seat) || !eveningOpen(next, seat)) return false;
  return JSON.stringify(prev.players[seat]) === JSON.stringify(next.players[seat]);
}
