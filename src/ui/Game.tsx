// The game table. Every state change goes through apply(), which plays the matching
// animation (delivery, buying, selling, night) before handing control back.
import { useEffect, useMemo, useRef, useState } from 'preact/hooks';
import { aiStep } from '../engine/ai';
import { FAVOURS, FRUIT, FRUITS, UPGRADES, lookOf, type FruitId } from '../engine/data';
import {
  activePlayer, applyAction, canPlayFavour,
  effectiveMax, notSoCount, ranking, RuleError,
  type Action, type Customer, type GameState, type LineResult,
} from '../engine/game';
import type { OnlineClient } from '../net/client';
import type { RoomView } from '../net/protocol';
import { Coin, Face, Fruit } from './art';
import { Icon } from './pixel';
import { customerReaction, dayHighlights, explainLine, gameRecap, overnightLoss, rivalReaction, standing, type LineStory, type Reaction } from '../engine/story';
import * as A from './anim';
import { BuyCards, EveningPanel, FavourRow, InventorySheet, InventoryStrip, PricePanel } from './panel';
import { MarketScene } from './scene';
import { fx } from './fx';
import { loadSettings } from './store';

interface Props {
  initial: GameState;
  onExit: () => void;
  onChange: (s: GameState) => void;
  onRematch: () => void;
  /** Online play: the server owns the game; this screen sends actions and animates the states it receives. */
  online?: OnlineClient;
}

const PHASE = { morning: 'Morning', buy: 'Buying', bid: 'Pricing', reveal: 'Sales', evening: 'Evening', over: 'Closed' } as const;
const BANNER = { morning: 'MORNING', buy: 'BUY FRUIT', bid: 'SET PRICES', reveal: 'SALES!', evening: 'EVENING', over: '' } as const;

export function Game({ initial, onExit, onChange, onRematch, online }: Props) {
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
  const [show, setShow] = useState<ShowState | null>(null);
  const [lastNight, setLastNight] = useState(0);
  const turnStart = useRef<GameState | null>(null);
  const [meta, setMeta] = useState<RoomView | null>(online?.view ?? null);
  const [conn, setConn] = useState(online?.conn ?? 'open');
  const queue = useRef<GameState[]>([]);
  const lastVersion = useRef(online?.view?.version ?? 0);
  const sending = useRef(false);
  const layerRef = useRef<HTMLDivElement>(null);

  const humans = useMemo(() => s.players.map((p, i) => (p.kind === 'human' ? i : -1)).filter((i) => i >= 0), [s.players.length]);
  const multi = humans.length > 1;
  const active = activePlayer(s);
  const seat = online?.seat ?? null;
  const activeHuman = online ? active === seat && s.phase !== 'bid' : active >= 0 && s.players[active].kind === 'human';
  const lastViewer = useRef(seat ?? humans[0]);
  if (!online && activeHuman) lastViewer.current = active;
  const viewer = seat ?? lastViewer.current;
  const needHandoff = !online && multi && activeHuman && handedTo !== active && !busy;
  // Online: whose secret prices are still missing, and who still has to press continue.
  const myBidTurn = online ? s.phase === 'bid' && !!meta && !meta.submitted[viewer] : s.phase === 'bid' && activeHuman;
  const waitingFor = (idxs: number[]) => idxs.map((i) => s.players[i]?.name).filter(Boolean).join(' and ');
  const humansMissingBids = online && meta ? humans.filter((i) => !meta.submitted[i]) : [];
  const votedMe = !!online && !!meta && meta.votes.includes(viewer);
  const humansNotVoted = online && meta ? humans.filter((i) => !meta.votes.includes(i)) : [];
  const offline = online && meta ? meta.seats.filter((x) => !x.connected) : [];

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
        await nightfall(prev);
        setLastNight(overnightLoss(prev, next, viewer));
      }
      sRef.current = next;
      setS(next);
      onChange(next);
      await A.frame();
      if (next.day !== prev.day) {
        setNight(false);
        await delivery(next);
      } else if (prev.phase === 'bid' && next.phase === 'reveal') {
        setRevealDone(false);
        await reveal(next);
        setRevealDone(true);
      } else await moves(prev, next);
    } finally {
      busyRef.current = false;
      setBusy(false);
      setTick((t) => t + 1);
    }
  }

  async function delivery(g: GameState) {
    if (g.phase !== 'morning') return;
    const jobs: Promise<void>[] = [];
    let d = 0;
    for (const f of FRUITS) {
      const n = Math.min(g.delivery[f] ?? 0, 4);
      for (let i = 0; i < n; i++) {
        jobs.push(A.fly('sky', [`cart-${f}`, 'truck'], <Fruit id={f} size={26} stage={g.deliveryUnripe === f ? 'unripe' : 'fresh'} />, { delay: d, duration: 600 }));
        d += 70;
      }
    }
    if (jobs.length) fx.card();
    await Promise.all(jobs);
  }

  async function moves(prev: GameState, next: GameState) {
    const jobs: Promise<void>[] = [];
    let d = 0;
    for (const f of FRUITS) {
      for (let pos = 0; pos < next.market[f].length; pos++) {
        const diff = prev.market[f][pos] - next.market[f][pos];
        if (!diff) continue;
        const p = next.players.findIndex((pl, i) => pl.stock[f][pos] !== prev.players[i].stock[f][pos]);
        if (p < 0) continue;
        for (let k = 0; k < Math.min(Math.abs(diff), 5); k++) {
          const node = <Fruit id={f} size={30} stage={pos >= FRUIT[f].ripe.length ? 'unripe' : undefined} />;
          if (diff > 0) jobs.push(A.fly([`m-${f}-${pos}`, `mk-${f}`, `cart-${f}`], [`p${p}-${f}`, `p${p}`], node, { delay: d }));
          else jobs.push(A.fly([`p${p}-${f}`, `p${p}`], [`m-${f}-${pos}`, `mk-${f}`, `cart-${f}`], node, { delay: d }));
          d += 90;
        }
      }
    }
    next.players.forEach((pl, i) => {
      const before = prev.players[i];
      if (pl.favours.length < before.favours.length) {
        const played = before.favours.find((id, k) => pl.favours[k] !== id) ?? before.favours[before.favours.length - 1];
        const t = A.tag(`p${i}`, `${FAVOURS[played].icon} ${FAVOURS[played].title}!`, 'favour');
        fx.card();
        jobs.push(A.wait(1100).then(() => t.remove()));
      }
      if (pl.upgrades.length > before.upgrades.length) {
        const u = pl.upgrades[pl.upgrades.length - 1];
        const t = A.tag(`p${i}`, `${UPGRADES[u].icon} ${UPGRADES[u].title}`, 'upgrade');
        A.floatText(`p${i}-cash`, `−$${UPGRADES[u].cost}`, 'minus');
        fx.coin();
        jobs.push(A.wait(1100).then(() => t.remove()));
      }
      const gained = pl.cash - before.cash;
      if (gained > 0 && pl.favours.length < before.favours.length) A.floatText(`p${i}-cash`, `+$${gained}`);
    });
    if (jobs.length && d > 0) fx.buy();
    await Promise.all(jobs);
  }

  async function flights(g: GameState, l: LineResult) {
    const jobs: Promise<void>[] = [];
    for (const o of l.offers) {
      if (!o.sold) continue;
      for (let k = 0; k < Math.min(o.sold, 4); k++) {
        jobs.push(A.fly([`p${o.player}-${l.fruit}`, `p${o.player}`], [`c${l.customerId}-${l.fruit}`, `c${l.customerId}`], <Fruit id={l.fruit} size={28} />, { delay: k * 90 }));
      }
      for (let k = 1; k < Math.min(3, o.sold + 1); k++) jobs.push(A.fly([`c${l.customerId}`], `p${o.player}-cash`, <Coin size={22} />, { delay: 380 + k * 110, duration: 480 }));
      jobs.push(A.fly([`c${l.customerId}`], `p${o.player}-cash`, <Coin size={26} />, { delay: 380, duration: 480 }).then(() => {
        fx.coin();
        const tip = g.players[o.player].upgrades.includes('signboard') ? o.sold : 0;
        A.floatText(`p${o.player}-cash`, `+$${o.sold * o.price + tip}`);
      }));
    }
    await Promise.all(jobs);
  }

  async function reveal(g: GameState) {
    const r = g.results!;
    const lines = r.lines.filter((l) => l.offers.length > 0);
    if (!lines.length) {
      const t = A.tag('street', 'No sales today', 'big');
      await A.wait(1100);
      t.remove();
      return;
    }
    // Routine sales (one rival, no contest, not you) settle together; showdowns get the stage.
    const shows = lines.filter((l) => explainLine(g, l, viewer).showdown);
    const routine = lines.filter((l) => !shows.includes(l));
    if (routine.length) await Promise.all(routine.map((l, i) => A.wait(i * 120).then(() => flights(g, l))));
    const used = new Set<string>();
    for (let i = 0; i < shows.length; i++) {
      const l = shows[i];
      const story = explainLine(g, l, viewer);
      const react = rivalReaction(g, l, viewer, used);
      const base = { line: l, n: i + 1, of: shows.length, story, react, cust: customerReaction(g, l.customerId, l.name) };
      setShow({ ...base, stage: 'intro', shown: 0 });
      A.pulse(`c${l.customerId}`);
      fx.card();
      await A.wait(380);
      for (let k = 1; k <= l.offers.length; k++) {
        setShow({ ...base, stage: 'reveal', shown: k });
        fx.tap();
        await A.wait(240);
      }
      setShow({ ...base, stage: 'result', shown: l.offers.length });
      if (story.tone === 'good') fx.coin();
      const tags: { remove(): void }[] = [];
      if (react) tags.push(A.tag(`p${react.player}`, react.text, 'quip'));
      await flights(g, l);
      await A.wait(story.detail ? 1100 : 800);
      tags.forEach((t) => t.remove());
    }
    setShow(null);
    for (const f of r.favours) {
      const t = A.tag(`p${f.player}`, 'Favour card!', 'favour');
      fx.card();
      await A.wait(800);
      t.remove();
    }
  }

  async function nightfall(g: GameState) {
    setNight(true);
    fx.night();
    await A.wait(500);
    const heat = g.event?.ageExtra ?? 0;
    const fines: { t: { remove(): void } }[] = [];
    if (g.event?.inspector) {
      g.players.forEach((pl, p) => {
        const paid = Math.min(pl.cash, notSoCount(pl.stock) * g.event!.inspector!);
        if (paid) { fines.push({ t: A.tag(`p${p}`, `🕵️ fined $${paid}`, 'lost-fine') }); A.floatText(`p${p}-cash`, `−$${paid}`, 'minus'); }
      });
    }
    const jobs: Promise<void>[] = [];
    let d = 0;
    const spoil = (anchor: string[], f: FruitId, n: number) => {
      for (let k = 0; k < Math.min(n, 3); k++) { jobs.push(A.drop(anchor, <Fruit id={f} size={26} stage="notso" />, d)); d += 80; }
    };
    for (const f of FRUITS) {
      spoil([`cart-${f}`], f, g.market[f][0] + (heat ? g.market[f][1] : 0));
      g.players.forEach((pl, p) => {
        const cool = pl.upgrades.includes('coolroom') && g.day % 2 === 1;
        const steps = (cool ? 0 : 1) + heat;
        const n = steps === 0 ? 0 : pl.stock[f][0] + (steps > 1 ? pl.stock[f][1] : 0);
        spoil([`p${p}-${f}-0`, `p${p}-${f}`], f, n);
      });
    }
    await Promise.all(jobs);
    await A.wait(400);
    fines.forEach((f) => f.t.remove());
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
    const offView = online.onView((v) => {
      setMeta(v);
      sending.current = false;
      if (v.game && v.version > lastVersion.current && v.game.config.seed === sRef.current.config.seed) {
        lastVersion.current = v.version;
        queue.current.push(v.game);
        setTick((t) => t + 1);
      }
    });
    const offErr = online.onError((msg) => { sending.current = false; fx.error(); say(msg); });
    const offConn = online.subscribe(() => setConn(online.conn));
    return () => { offView(); offErr(); offConn(); };
  }, [online]);

  useEffect(() => {
    if (!online || busyRef.current || !queue.current.length) return;
    const next = queue.current.shift()!;
    if (JSON.stringify(next) === JSON.stringify(sRef.current)) { setTick((t) => t + 1); return; }
    void apply(next);
  }, [tick, online]);

  /** Every player decision goes through here: applied locally, or sent to the room server. */
  const act = (a: Action) => {
    if (busyRef.current) return;
    if (online) {
      if (sending.current) return;
      if (!online.act(a)) return say('Reconnecting…');
      sending.current = true;
      return;
    }
    const who = a.kind === 'bids' ? activePlayer(sRef.current) : active;
    attempt(() => applyAction(sRef.current, who, a));
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
    if (s.phase === 'buy' && activeHuman) {
      if (!turnStart.current || activePlayer(turnStart.current) !== active || turnStart.current.phase !== 'buy' || turnStart.current.day !== s.day) turnStart.current = s;
    } else turnStart.current = null;
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

  if (needHandoff) {
    const pl = s.players[active];
    return (
      <div class="handoff" onClick={() => { fx.tap(); setHandedTo(active); }}>
        <div class="avatar xl"><Face who={pl.avatar} size={96} /></div>
        <h2>Pass the phone to {pl.name}</h2>
        <p>{s.phase === 'bid' ? 'Secret prices. No peeking!' : s.phase === 'buy' ? 'Your turn to buy fruit.' : 'Your evening.'}</p>
        <button class="btn primary big">Tap to start</button>
      </div>
    );
  }

  if (s.phase === 'over') {
    return (
      <div class="game">
        <TopBar s={s} viewer={viewer} onMenu={() => setMenu(true)} />
        <main class="scroll"><Results s={s} viewer={viewer} onExit={onExit}
          onRematch={online ? () => { fx.tap(); online.rematch(); } : onRematch}
          rematchNote={online && meta && meta.rematch.length ? (meta.rematch.includes(viewer) ? `Waiting for ${waitingFor(humans.filter((i) => !meta.rematch.includes(i)))} to accept…` : `${waitingFor(meta.rematch)} wants a rematch!`) : undefined}
          rematchSent={!!online && !!meta && meta.rematch.includes(viewer)} /></main>
      </div>
    );
  }

  const pl = s.players[active];
  const myBuyTurn = s.phase === 'buy' && activeHuman && !busy;
  const bidder = online ? viewer : active;
  const others = s.players.map((_, i) => i).filter((i) => i !== viewer);
  const order = [...others.slice(0, Math.ceil(others.length / 2)), viewer, ...others.slice(Math.ceil(others.length / 2))];
  const limit = pl ? (pl.upgrades.includes('cart') ? 5 : 3) : 3;
  const pricing = s.phase === 'bid' && myBidTurn && !busy;

  const panel = (() => {
    if (s.phase === 'morning') return busy ? <div class="info-card dim center-text">The farmer is unloading the cart…</div> : <MorningCard s={s} viewer={viewer} lost={lastNight} />;
    if (s.phase === 'buy') {
      return (
        <>
          <div class={`turn-card ${myBuyTurn ? 'mine' : ''}`}>
            {activeHuman
              ? <><b>{freeFruit !== null ? 'Pick your free fruit' : 'Your turn to buy'}</b><span>{pl.boughtToday} of {limit} bought · tap a price to buy one</span></>
              : <><Face who={pl.avatar} size={28} /><b>{pl.name}</b><span>is buying…</span></>}
          </div>
          <BuyCards s={s} p={viewer} myTurn={myBuyTurn} free={freeFruit !== null} onBuy={pickMarket} />
          <FavourRow s={s} p={viewer} phase="buy" onCard={playCard} />
        </>
      );
    }
    if (s.phase === 'bid') {
      if (pricing) return <PricePanel key={`${s.day}-${bidder}`} s={s} p={bidder} onSubmit={(bids, fav) => { fx.card(); act({ kind: 'bids', bids, favoured: fav }); }} />;
      return (
        <div class="locked-card">
          <div class="lk-cards">{[0, 1, 2].map((i) => <span class="lk" style={{ transform: `rotate(${(i - 1) * 6}deg)` }}>🔒</span>)}</div>
          <b>{online ? 'Your prices are locked in' : 'Rivals are choosing prices'}</b>
          <span class={online ? 'waiting-dots' : ''}>{online ? `Waiting for ${waitingFor(humansMissingBids) || 'the market'}` : 'Secret until the reveal'}</span>
        </div>
      );
    }
    if (s.phase === 'reveal') return show ? <Showdown s={s} a={show} viewer={viewer} /> : revealDone ? <SalesSummary s={s} viewer={viewer} /> : null;
    if (s.phase === 'evening') {
      return activeHuman && !busy
        ? <EveningPanel s={s} p={active} onUpgrade={(u) => act({ kind: 'upgrade', upgrade: u })} onCard={playCard} />
        : <div class="turn-card">{pl && <Face who={pl.avatar} size={28} />}<b>{pl?.name}</b><span>is closing up for the night…</span></div>;
    }
    return null;
  })();

  return (
    <div class={`game ${night ? 'is-night' : ''} ${s.config.days - s.day < 3 ? 'finale' : ''} ${s.day === s.config.days ? 'final-day' : ''}`} onClick={() => busyRef.current && A.hurryUp()}>
      <TopBar s={s} viewer={viewer} onMenu={() => setMenu(true)} onEvent={() => setEventInfo(!eventInfo)} onRival={setRival} offline={offline.map((x) => x.seat)} />
      {eventInfo && (
        <div class="event-pop" onClick={() => setEventInfo(false)}>
          {s.event ? <p><b>{s.event.icon} Today: {s.event.title}.</b> {s.event.text}</p> : <p><b>Today:</b> a calm day.</p>}
          {s.nextEvent && <p><b>{s.nextEvent.icon} Tomorrow: {s.nextEvent.title}.</b> {s.nextEvent.text}</p>}
        </div>
      )}
      {online && conn !== 'open' && <div class="net-strip bad">Reconnecting to the room…</div>}
      {online && conn === 'open' && offline.length > 0 && <div class="net-strip">{offline.map((x) => x.name).join(' and ')} {offline.length > 1 ? 'are' : 'is'} offline. The game will wait.</div>}

      <div class="play">
        <div class="stage">
          <MarketScene s={s} viewer={viewer} order={order} activeP={(s.phase === 'buy' || s.phase === 'evening') ? active : -1}
            onStall={(p) => setRival(p)} onCustomer={(c) => setTip(c)} rolling={s.phase === 'morning' && busy} />
          <InventoryStrip s={s} p={viewer} onOpen={() => setRival(viewer)} />
        </div>
        <div class="panel-area">{panel}</div>
      </div>

      {!pricing && (
        <footer class="actionbar">
          {busy && s.phase === 'reveal' && <button class="btn skip" onClick={(e) => { e.stopPropagation(); A.hurryUp(); }}>Skip ⏩</button>}
          {busy && <div class="hint-bar">{night ? 'Night falls…' : s.phase === 'morning' ? 'The cart rolls in…' : s.phase === 'reveal' ? 'Selling… tap to speed up' : pl?.kind === 'human' ? 'Bought!' : `${pl?.name ?? ''} is shopping…`}</div>}
          {!busy && s.phase === 'morning' && (votedMe
            ? <div class="hint-bar waiting-dots">Waiting for {waitingFor(humansNotVoted)}</div>
            : <button class="btn primary wide big" onClick={proceed}>Open the market</button>)}
          {!busy && s.phase === 'buy' && activeHuman && (
            <>
              {!online && <button class="btn ghost" aria-label="Undo purchases" disabled={!turnStart.current || turnStart.current === s} onClick={() => { if (turnStart.current) { const t = turnStart.current; sRef.current = t; setS(t); onChange(t); } setFreeFruit(null); }}>↶</button>}
              <button class="btn primary wide big" onClick={() => { fx.tap(); setFreeFruit(null); act({ kind: 'endBuy' }); }}>{pl.boughtToday ? 'Done buying ➜' : 'Skip buying ➜'}</button>
            </>
          )}
          {!busy && s.phase === 'buy' && !activeHuman && <div class="hint-bar">{pl && <Face who={pl.avatar} size={22} />} {pl?.name} is shopping…</div>}
          {!busy && s.phase === 'bid' && <div class={`hint-bar ${online ? 'waiting-dots' : ''}`}>{online ? 'Waiting for prices' : 'Prices are being set…'}</div>}
          {!busy && s.phase === 'evening' && activeHuman && <button class="btn primary wide big" onClick={() => { fx.tap(); act({ kind: 'endEvening' }); }}>Lights out · next day</button>}
          {!busy && s.phase === 'evening' && !activeHuman && <div class="hint-bar">{pl && <Face who={pl.avatar} size={22} />} {pl?.name} is closing up…</div>}
          {!busy && s.phase === 'reveal' && (votedMe
            ? <div class="hint-bar waiting-dots">Waiting for {waitingFor(humansNotVoted)}</div>
            : <button class="btn primary wide big" onClick={() => { setHandedTo(null); proceed(); }}>
                {s.day >= s.config.days ? 'See final results' : 'Close for the day'}
              </button>)}
        </footer>
      )}

      <div class="fx-layer" ref={layerRef} />
      {banner && <div class="phase-banner" key={banner} aria-hidden="true"><span>{banner}</span></div>}
      {toast && <div class="toast">{toast}</div>}

      {cardInfo !== null && s.players[active]?.favours[cardInfo] && (() => {
        const d = FAVOURS[s.players[active].favours[cardInfo]];
        const why = canPlayFavour(s, active, cardInfo);
        return (
          <div class="card-pop" onClick={(e) => e.stopPropagation()}>
            <span class="cp-icon">{d.icon}</span>
            <div class="cp-text"><b>{d.title}</b><small>{d.text}</small>{why && <small class="warn-text">{why}</small>}</div>
            <div class="cp-btns">
              {!why && <button class="btn primary" onClick={() => reallyPlay(cardInfo)}>Play</button>}
              <button class="btn ghost" onClick={() => setCardInfo(null)}>✕</button>
            </div>
          </div>
        );
      })()}

      {pulseInfo && (
        <div class="tip-pop" onClick={() => setPulseInfo(false)}>
          <b>📊 Demand vs supply</b>
          <span><b>want</b> = fruit today's customers still want{s.phase === 'buy' || s.phase === 'morning' ? ' (+ = walk-ins not here yet)' : ''}.</span>
          <span><b>in shops</b> = ripe fruit all shops (you included) could sell.</span>
          <span class="pz-legend"><i class="good" /> enough buyers: prices stay high · <i class="war" /> more fruit than buyers: price war · <i class="open" /> nobody has any yet</span>
          <small>Tap to close.</small>
        </div>
      )}
      {tip && (
        <div class="tip-pop" onClick={() => setTip(null)}>
          <b class="tip-head"><Face who={tip.name} size={32} /> {lookOf(tip.name).title}{tip.name === s.event?.extra?.name ? ' ⭐ special order' : ''}</b>
          <i class="quirk">“{lookOf(tip.name).quirk}”</i>
          {tip.wants.map((w) => (
            <div class="tip-line">
              <Fruit id={w.fruit} size={18} />
              <span>wants <b>{w.qty}</b> · pays up to <b>${effectiveMax(s, w)} for each</b> fresh one</span>
            </div>
          ))}
          <small>Older fruit sells for less: the −$ on your stall shows how much less. Tap to close.</small>
        </div>
      )}

      {rival !== null && <InventorySheet s={s} p={rival} onClose={() => setRival(null)} />}

      {menu && (
        <div class="modal-bg" onClick={() => setMenu(false)}>
          <div class="modal center" onClick={(e) => e.stopPropagation()}>
            <h2>Paused</h2>
            <p class="muted">Your game is saved automatically.</p>
            <button class="btn primary wide" onClick={() => setMenu(false)}>Resume</button>
            <button class="btn wide" onClick={onExit}>Quit to menu</button>
          </div>
        </div>
      )}
    </div>
  );
}

function TopBar({ s, viewer, onMenu, onEvent, onRival, offline = [] }: { s: GameState; viewer: number; onMenu: () => void; onEvent?: () => void; onRival?: (p: number) => void; offline?: number[] }) {
  const rem = s.config.days - s.day + 1;
  const st = standing(s, viewer);
  return (
    <header class="topbar">
      <div class="tb-row">
        <button class="icon-btn" onClick={(e) => { e.stopPropagation(); onMenu(); }} aria-label="Menu">☰</button>
        <div class="tb-day">
          <span class="day-label">Day {s.day}<small>/{s.config.days}</small></span>
          {s.phase !== 'over' && rem <= 3 ? <span class={`left ${rem === 1 ? 'last' : ''}`}>{rem === 1 ? 'FINAL DAY' : `${rem} DAYS LEFT`}</span> : <span class="phase">{PHASE[s.phase]}</span>}
        </div>
        {s.players.length > 1 && <span class={`rank r${st.rank}`} title={st.text}>#{st.rank}</span>}
        <div class="hud-cash" data-a={`p${viewer}-cash`} aria-label={`Cash $${s.players[viewer].cash}`}><Coin size={20} /><b>{s.players[viewer].cash}</b></div>
      </div>
      {s.phase !== 'over' && (
        <div class="tb-row sub">
          <button type="button" class="ev-chip" onClick={(e) => { e.stopPropagation(); onEvent?.(); }}>
            {s.event ? <><span>{s.event.icon}</span>{s.event.title}</> : 'Calm day'}
            {s.nextEvent && <small>· next: {s.nextEvent.icon}</small>}
          </button>
          <span class="spacer" />
          {s.players.map((pl, i) => i === viewer ? null : (
            <button type="button" class={`rv-chip ${offline.includes(i) ? 'off' : ''}`} onClick={(e) => { e.stopPropagation(); onRival?.(i); }} aria-label={`${pl.name}: $${pl.cash}`}>
              <Face who={pl.avatar} size={20} /><b data-a={`p${i}-cash`}>${pl.cash}</b>
            </button>
          ))}
        </div>
      )}
    </header>
  );
}

function MorningCard({ s, viewer, lost }: { s: GameState; viewer: number; lost: number }) {
  const rem = s.config.days - s.day + 1;
  const st = standing(s, viewer);
  const stock = FRUITS.reduce((a, f) => a + s.players[viewer].stock[f].reduce((x, y) => x + y, 0), 0);
  return (
    <div class={`morning-card ${rem <= 3 ? 'finale' : ''}`}>
      <div class="mc-day">{rem === 1 ? 'FINAL DAY' : `Day ${s.day}`}<small>{rem === 1 ? '' : ` · ${rem} days left`}</small></div>
      {s.day > 1 && <div class={`mc-standing r${st.rank}`}>{st.text}</div>}
      {lost > 0 && <div class="mc-loss">{lost} of your fruit spoiled overnight.</div>}
      {rem === 1 && stock > 0 && <div class="mc-loss">Anything unsold tonight is worth $0. Sell it all!</div>}
      {s.event ? (
        <div class="event-card flip">
          <div class="ei">{s.event.icon}</div>
          <b>{s.event.title}</b>
          <p>{s.event.text}</p>
          {s.event.minPrice && <div class="minprices">{FRUITS.map((f) => <span><Fruit id={f} size={18} />${s.event!.minPrice![f]}</span>)}</div>}
        </div>
      ) : (
        <div class="sunny"><Icon name="sun" size={22} /> A calm day at the market</div>
      )}
      {s.nextEvent && <div class="mc-next">Tomorrow: <b>{s.nextEvent.icon} {s.nextEvent.title}</b><small>{s.nextEvent.text}</small></div>}
    </div>
  );
}

interface ShowState { line: LineResult; n: number; of: number; stage: 'intro' | 'reveal' | 'result'; shown: number; story: LineStory; react: Reaction | null; cust: string }

function Showdown({ s, a, viewer }: { s: GameState; a: ShowState; viewer: number }) {
  const l = a.line;
  // Reveal from the highest price down, so the winning price lands last.
  const order = [...l.offers].map((o, i) => ({ o, i })).sort((x, y) => y.o.price - x.o.price || y.i - x.i);
  const done = a.stage === 'result';
  return (
    <div class={`auction ${done ? `tone-${a.story.tone}` : ''}`} role="status">
      <div class="au-top"><span>SHOWDOWN {a.n}/{a.of}</span><span>cheapest sells first</span></div>
      <div class="au-cust">
        <span class="au-face"><Face who={l.name} size={44} /></span>
        <div class="au-ask">
          <b>{lookOf(l.name).title}</b>
          <span class="au-want"><Fruit id={l.fruit} size={20} /><b>×{l.want}</b><span class="au-cap">pays up to <b>${l.max}</b> each</span></span>
          {done && a.cust && <span class="au-say">“{a.cust}”</span>}
        </div>
      </div>
      <div class="au-offers">
        {order.map(({ o, i }, k) => {
          const pl = s.players[o.player];
          const open = k < a.shown;
          const res = done ? (o.sold ? 'won' : 'lost') : '';
          return (
            <div class={`au-offer ${open ? 'open' : 'sealed'} ${res} ${o.player === viewer ? 'me' : ''}`}>
              <span class="au-who"><Face who={pl.avatar} size={26} /></span>
              <span class="au-name">{o.player === viewer ? 'You' : pl.name}<small>offers {o.qty}</small></span>
              <span class="au-price">{open ? `$${o.price}` : '?'}</span>
              {done && <span class="au-res">{a.story.tags[i]}</span>}
            </div>
          );
        })}
      </div>
      {done && (
        <div class={`au-why ${a.story.tone}`}>
          <b>{a.story.headline}</b>
          {a.story.detail && <small>{a.story.detail}</small>}
        </div>
      )}
    </div>
  );
}

function SalesSummary({ s, viewer }: { s: GameState; viewer: number }) {
  const r = s.results!;
  const start = s.dayStartCash?.[viewer];
  const net = start === undefined ? null : s.players[viewer].cash - start;
  const spent = net === null ? null : r.income[viewer] - net;
  const highlights = dayHighlights(s, viewer);
  const st = standing(s, viewer);
  const best = Math.max(...r.income);
  const rem = s.config.days - s.day;
  return (
    <div class="sales-card">
      <div class="sc-title">{rem === 0 ? 'MARKET CLOSED' : `END OF DAY ${s.day}`}</div>
      <div class="sc-money">
        <span>Sales <b class="good">+${r.income[viewer]}</b></span>
        {spent !== null && spent > 0 && <span>Stock <b class="bad">−${spent}</b></span>}
        {net !== null && <span>Net <b class={net >= 0 ? 'good' : 'bad'}>{net >= 0 ? '+' : '−'}${Math.abs(net)}</b></span>}
      </div>
      {highlights.length > 0 && (
        <div class="sc-high">
          {highlights.map((h) => <div class={`hl ${h.tone}`}><span>{h.icon}</span>{h.text}</div>)}
        </div>
      )}
      <div class="takings">
        {s.players.map((pl, i) => (
          <span class={`tk ${i === viewer ? 'me' : ''} ${r.income[i] ? '' : 'zero'} ${r.income[i] === best && best > 0 ? 'top' : ''}`}>
            <Face who={pl.avatar} size={24} /><b>+${r.income[i]}</b>
          </span>
        ))}
      </div>
      {s.players.length > 1 && <div class={`sc-standing r${st.rank}`}>{st.text}{rem > 0 ? ` · ${rem} day${rem > 1 ? 's' : ''} to go` : ''}</div>}
    </div>
  );
}

function Results({ s, viewer, onExit, onRematch, rematchNote, rematchSent }: { s: GameState; viewer: number; onExit: () => void; onRematch: () => void; rematchNote?: string; rematchSent?: boolean }) {
  const order = ranking(s);
  const win = order[0] === viewer;
  const ranks = ['1ST', '2ND', '3RD', '4TH'];
  const champ = s.players[order[0]];
  const margin = order.length > 1 ? champ.cash - s.players[order[1]].cash : 0;
  const recap = gameRecap(s, viewer);
  return (
    <section class="results">
      <div class="trophy"><Face who={champ.avatar} size={96} /><span class="crown"><Icon name="star" size={34} /></span></div>
      <h2>{win ? 'YOU WIN!' : `${champ.name.toUpperCase()} WINS!`}</h2>
      {order.length > 1 && <p class="margin">{margin === 0 ? 'A dead heat, decided on fruit sold!' : margin <= 5 ? `By just $${margin}. What a finish!` : `By $${margin}.`}</p>}
      {s.config.daily && <p class="chip">Daily challenge {s.config.daily}</p>}
      <div class="podium">
        {order.map((i, k) => {
          const pl = s.players[i];
          return (
            <div class={`pod ${i === viewer ? 'me' : ''}`}>
              <span class={`medal r${k + 1}`}>{ranks[k]}</span>
              <span class="avatar sm"><Face who={pl.avatar} size={26} /></span>
              <b>{i === viewer ? 'You' : pl.name}</b>
              <span class="spacer" />
              <span class="chip cash"><Coin />{pl.cash}</span>
              <div class="pod-stats">Sold {pl.stats.sold} · spoiled {pl.stats.spoiled} · best sale ${pl.stats.bestSale}{pl.upgrades.length ? ` · ${pl.upgrades.map((u) => UPGRADES[u].icon).join('')}` : ''}</div>
            </div>
          );
        })}
      </div>
      {(recap.best.length > 0 || recap.worst.length > 0) && (
        <div class="recap">
          {recap.best.length > 0 && <><div class="rc-h good">Your best moments</div>{recap.best.map((t) => <div class="rc-l">{t}</div>)}</>}
          {recap.worst.length > 0 && <><div class="rc-h bad">Next time, watch out for</div>{recap.worst.map((t) => <div class="rc-l">{t}</div>)}</>}
        </div>
      )}
      {rematchNote && <p class="rematch-note">{rematchNote}</p>}
      <button class="btn primary big wide" disabled={rematchSent} onClick={onRematch}>{win ? 'Defend your title' : 'Rematch!'}</button>
      <button class="btn wide" onClick={onExit}>Main menu</button>
    </section>
  );
}
