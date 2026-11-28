// The game screen's state apart from the game itself, in parts the controller (useGameController.ts) puts together:
// what a beat shows on the table, the pop-ups and messages, the room online, the computer stalls' turns, and the
// moments the screen marks (the morning's countdown stamp, the end's sound, the anonymous counters).
import { useEffect, useRef, useState } from 'preact/hooks';
import { count, winners, type Customer, type GameState } from '../../engine/game';
import type { NightJuice } from '../../engine/story';
import type { OnlineClient } from '../../net/client';
import type { PublicSeat, RoomView } from '../../net/protocol';
import { noteShown } from '../../net/recorder';
import { trackOnce } from '../../net/telemetry';
import * as A from '../anim';
import { holdCash } from '../cashShown';
import { releaseToken } from '../firstShown';
import { fx } from '../fx';
import { releaseRush } from '../rushShown';
import { releaseStock } from '../stockShown';
import { loadSettings } from '../store';
import { releaseTable } from '../tableShown';
import { stopRush, type BellShow, type NightSlide } from './animator';
import { Bell } from './beatPlayer';
import type { OrderShow } from './dayBeats';
import type { ShowState } from './rush';
import { takeoverClock } from './seats';
import { countdownStamp } from './stepKind';
import type { TurnDriver } from './turnDriver';

/** What the beats show on the table, and the table's own life: where the flying pieces are drawn (the layer), and
 *  what is let go when the table is left. */
export function useTableShow(initial: GameState, driver: TurnDriver) {
  const [night, setNight] = useState(false);
  // The night panel's slide, set by the night's own script so both run on one clock (PLAN-081).
  const [nightSlide, setNightSlide] = useState<NightSlide>(null);
  // The bell is ringing: how many rows have turned face up so far; null when it is not ringing (beatPlayer.ts Bell).
  const [bell, showBell] = useState<BellShow>(null);
  const [ringer] = useState(() => new Bell(showBell, () => driver.s.day, () => fx.bell()));
  // The bids for a standing order are in and are being turned over on the table (PLAN-084).
  const [orderShow, setOrderShow] = useState<OrderShow | null>(null);
  const [revealDone, setRevealDone] = useState(initial.phase === 'reveal');
  const [show, setShow] = useState<ShowState | null>(null);
  const [lastNight, setLastNight] = useState(0);
  // What the viewer's Juice Bar made last night, for the morning card.
  const [lastJuice, setLastJuice] = useState<NightJuice>({ pieces: 0, dollars: 0 });
  const layerRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    A.setLayer(layerRef.current);
    A.setBaseSpeed(loadSettings().fast);
    return () => A.setLayer(null);
  });
  // Leaving the table mid-rush must not leave held-back totals behind for the next game. A hurry asked for at another
  // table (a game left while a rival was playing) does not carry over to this one either. PLAN-123: the rush still
  // playing stops where it stands (animator.tsx stopRush), and this table's last beat, which still runs to its end,
  // no longer lets go of what the next table holds back (`mounted`).
  const mounted = useRef(true);
  useEffect(() => {
    mounted.current = true;
    A.resetHurry();
    return () => { mounted.current = false; stopRush(); holdCash(null); releaseToken(); releaseStock(); releaseRush(); releaseTable(); };
  }, []);
  /** A beat has ended. A table that has been left lets go of nothing here: it did so as it was left, and what is held
   *  back now belongs to the next table (PLAN-123). */
  const settle = () => {
    if (mounted.current) {
      holdCash(null);
      releaseToken();
      releaseStock();
      releaseRush();
      releaseTable();
    }
    setOrderShow(null);
  };
  return {
    night, setNight, nightSlide, setNightSlide, bell, setBell: ringer.set, ringer, orderShow, setOrderShow, revealDone, setRevealDone, show, setShow,
    lastNight, setLastNight, lastJuice, setLastJuice, layerRef, settle,
  };
}

/** The pop-ups over the table and the message at its foot. */
export function usePopups() {
  const [toast, setToast] = useState<string | null>(null);
  /** A message at the foot of the screen for a moment; `error`: with the error sound. */
  const say = (msg: string, error = false) => {
    if (error) fx.error();
    setToast(msg);
    window.setTimeout(() => setToast((t) => (t === msg ? null : t)), A.BEAT.label.toast);
  };
  const [rival, setRival] = useState<number | null>(null);
  const [freeFruit, setFreeFruit] = useState<number | null>(null);
  /** Scout: the favour card being played while the player taps a face-down walk-in to look at. */
  const [scout, setScout] = useState<number | null>(null);
  const [menu, setMenu] = useState(false);
  const [cardInfo, setCardInfo] = useState<number | null>(null);
  const [tip, setTip] = useState<Customer | null>(null);
  const [eventInfo, setEventInfo] = useState(false);
  const [pulseInfo, setPulseInfo] = useState(false);
  const [, setTipTick] = useState(0);
  return {
    toast, say, rival, setRival, freeFruit, setFreeFruit, scout, setScout, menu, setMenu, cardInfo, setCardInfo, tip, setTip,
    eventInfo, setEventInfo, pulseInfo, setPulseInfo, setTipTick,
  };
}

/** Online: the room's view, the connection, and the room's states played one at a time (turnDriver.ts). */
export function useRoom(online: OnlineClient | undefined, driver: TurnDriver, tick: number) {
  const [meta, setMeta] = useState<RoomView | null>(online?.view ?? null);
  const [conn, setConn] = useState(online?.conn ?? 'open');
  useEffect(() => {
    if (!online) return;
    const take = (v: RoomView) => { setMeta(v); driver.take(v); };
    const offView = online.onView(take);
    const offErr = online.onError((msg) => { driver.sending = false; driver.hooks.say(msg, true); });
    const offConn = online.subscribe(() => setConn(online.conn));
    // Anything that arrived between the first render and this effect would otherwise be missed
    // until the next message, which may never come if the room is waiting on this player.
    if (online.view) take(online.view);
    setConn(online.conn);
    return () => { offView(); offErr(); offConn(); };
  }, [online, driver]);
  // Each drawing, the next state the room has sent is played once the table is free.
  useEffect(() => { driver.drain(); }, [tick, online, driver]);
  return { meta, conn };
}

/** Ticks once a second while someone is disconnected, for the takeover countdown. */
export function useTakeoverClock(offline: PublicSeat[]): number {
  const [nowTick, setNowTick] = useState(() => Date.now());
  const { counting, key } = takeoverClock(offline);
  useEffect(() => {
    if (!counting) return;
    const t = window.setInterval(() => setNowTick(Date.now()), 1000);
    return () => window.clearInterval(t);
  }, [counting, key]);
  return nowTick;
}

/** Offline, the computer stalls act one step at a time, after any animation finishes (turnDriver.ts computers). */
export function useComputers(driver: TurnDriver, s: GameState, active: number, tick: number) {
  useEffect(() => driver.computers(s, active), [s, tick, active, driver]);
}

/** The morning's countdown stamp ("LAST DAY") and the end's sound; and the anonymous funnel counters: how far games
 *  get, and how they end, counted once per game even if the game is resumed or the online view reconnects. */
export function useGameMoments(s: GameState, viewer: number, online: boolean): string | null {
  const [banner, setBanner] = useState<string | null>(null);
  const over = s.phase === 'over';
  const won = over && winners(s).includes(viewer);
  const stamp = countdownStamp(s);
  useEffect(() => {
    if (over) (won ? fx.win : fx.lose)();
    if (!stamp) return;
    setBanner(stamp);
    const t = window.setTimeout(() => setBanner(null), A.BEAT.morning.stamp);
    return () => window.clearTimeout(t);
  }, [s.phase, s.day, over, won, stamp]);
  const gameKey = `${s.config.seed}-${s.config.daily ?? ''}`;
  // eslint-disable-next-line react-hooks/exhaustive-deps -- counted as each new day is reached, not again as the day's steps change
  useEffect(() => { if (s.phase !== 'over') trackOnce(`${gameKey}:day:${s.day}`, 'day_reached', s.day); }, [s.day]);
  // eslint-disable-next-line react-hooks/exhaustive-deps -- counted once, as the game opens
  useEffect(() => { if (online) trackOnce(`${gameKey}:start`, 'game_start', 'online'); }, []);
  // PLAN-132: the game on screen, for its match record (an online match is recorded by the room, not here)
  // eslint-disable-next-line react-hooks/exhaustive-deps -- noted as the game opens and as each day begins
  useEffect(() => { noteShown(online ? null : s); }, [s.day, online]);
  // PLAN-132: the first-game steps, each counted once per phone
  const me = s.players[viewer];
  const bought = (me?.boughtToday ?? 0) > 0;
  const sale = (s.results?.income[viewer] ?? 0) > 0;
  useEffect(() => { if (bought) trackOnce('ftue:buy', 'first_buy'); }, [bought]);
  useEffect(() => { if (sale) trackOnce('ftue:sale', 'first_sale'); }, [sale]);
  useEffect(() => { if (s.day >= 2) trackOnce('ftue:day1', 'day1_done'); }, [s.day]);
  useEffect(() => {
    if (s.phase !== 'over') return;
    trackOnce(`${gameKey}:end`, 'game_end', winners(s).includes(viewer) ? 'win' : 'lose');
    trackOnce(`${gameKey}:cash`, 'final_cash', Math.min(300, Math.floor(s.players[viewer].cash / 25) * 25));
    trackOnce(`${gameKey}:spoiled`, 'fruit_spoiled', Math.min(10, s.players[viewer].stats.spoiled));
    trackOnce(`${gameKey}:unsold`, 'fruit_unsold', Math.min(12, count(s.players[viewer].stock, undefined, true)));
    trackOnce('first_game_complete', 'first_game_complete');
  // eslint-disable-next-line react-hooks/exhaustive-deps -- counted once, as the phase changes to over, from the state the game ended in
  }, [s.phase]);
  return banner;
}
