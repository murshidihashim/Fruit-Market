// The game table. Every state change goes through apply(), which plays the matching
// animation (delivery, buying, selling, night) before handing control back.
import { useEffect, useMemo, useRef, useState } from 'preact/hooks';
import { aiStep } from '../engine/ai';
import { FAVOURS, FRUIT, FRUITS, UPGRADES, freshPos, lookOf, type FruitId, type UpgradeId } from '../engine/data';
import {
  activePlayer, beginBuying, buy, buyUpgrade, canBuy, canPlayFavour, canUpgrade, endBuyTurn, endEvening,
  effectiveMax, finishReveal, notSoCount, playFavour, ranking, submitBids, RuleError,
  type Customer, type GameState, type LineResult,
} from '../engine/game';
import { Coin, Fruit } from './art';
import * as A from './anim';
import { BidSheet } from './BidSheet';
import { ShopPanel } from './board';
import { fx } from './fx';
import { loadSettings } from './store';
import { Market, MyStall, PulseBar, RivalStall, Street, face, seats } from './table';

interface Props { initial: GameState; onExit: () => void; onChange: (s: GameState) => void; onRematch: () => void }

const PHASE = { morning: '☀️ Morning', buy: '🛒 Buying', bid: '🤫 Pricing', reveal: '💰 Sales', evening: '🌙 Evening', over: '🏁 Closed' } as const;

export function Game({ initial, onExit, onChange, onRematch }: Props) {
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
  const [revealDone, setRevealDone] = useState(initial.phase === 'reveal');
  const [cardInfo, setCardInfo] = useState<number | null>(null);
  const [tip, setTip] = useState<Customer | null>(null);
  const [eventInfo, setEventInfo] = useState(false);
  const [pulseInfo, setPulseInfo] = useState(false);
  const [auction, setAuction] = useState<{ line: LineResult; stage: 'sealed' | 'open' | 'done'; n: number; of: number } | null>(null);
  const turnStart = useRef<GameState | null>(null);
  const layerRef = useRef<HTMLDivElement>(null);

  const humans = useMemo(() => s.players.map((p, i) => (p.kind === 'human' ? i : -1)).filter((i) => i >= 0), [s.players.length]);
  const multi = humans.length > 1;
  const active = activePlayer(s);
  const activeHuman = active >= 0 && s.players[active].kind === 'human';
  const lastViewer = useRef(humans[0]);
  if (activeHuman) lastViewer.current = active;
  const viewer = lastViewer.current;
  const needHandoff = multi && activeHuman && handedTo !== active && !busy;

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
      if (next.day !== prev.day) await nightfall(prev);
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
      const pos = g.deliveryUnripe === f ? g.market[f].length - 1 : freshPos(f);
      for (let i = 0; i < n; i++) {
        jobs.push(A.fly('truck', `m-${f}-${pos}`, <Fruit id={f} size={26} stage={g.deliveryUnripe === f ? 'unripe' : 'fresh'} />, { delay: d, duration: 600 }));
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
          if (diff > 0) jobs.push(A.fly(`m-${f}-${pos}`, [`p${p}-${f}-${pos}`, `p${p}-${f}`, `p${p}`], node, { delay: d }));
          else jobs.push(A.fly([`p${p}-${f}-${pos}`, `p${p}-${f}`, `p${p}`], `m-${f}-${pos}`, node, { delay: d }));
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

  async function reveal(g: GameState) {
    const r = g.results!;
    const lines = r.lines.filter((l) => l.offers.length > 0);
    if (!lines.length) {
      const t = A.tag('street', 'No sales today 😶', 'big');
      await A.wait(1200);
      t.remove();
      return;
    }
    for (let li = 0; li < lines.length; li++) {
      const l = lines[li];
      setAuction({ line: l, stage: 'sealed', n: li + 1, of: lines.length });
      A.pulse(`c${l.customerId}`);
      fx.card();
      await A.wait(700);
      setAuction({ line: l, stage: 'open', n: li + 1, of: lines.length });
      fx.tap();
      await A.wait(900);
      setAuction({ line: l, stage: 'done', n: li + 1, of: lines.length });
      const jobs: Promise<void>[] = [];
      for (const o of l.offers) {
        if (!o.sold) continue;
        for (let k = 0; k < Math.min(o.sold, 4); k++) {
          jobs.push(A.fly([`p${o.player}-${l.fruit}`, `p${o.player}`], [`c${l.customerId}-${l.fruit}`, `c${l.customerId}`], <Fruit id={l.fruit} size={28} />, { delay: k * 90 }));
        }
        jobs.push(A.fly([`c${l.customerId}`], `p${o.player}-cash`, <Coin size={26} />, { delay: 380, duration: 480 }).then(() => {
          fx.coin();
          const tip = g.players[o.player].upgrades.includes('signboard') ? o.sold : 0;
          A.floatText(`p${o.player}-cash`, `+$${o.sold * o.price + tip}`);
        }));
        const q = g.players[o.player].quip;
        if (q && li % 2 === 0) {
          const t = A.tag(`p${o.player}`, q, 'quip');
          jobs.push(A.wait(1300).then(() => t.remove()));
        }
      }
      await Promise.all(jobs);
      await A.wait(700);
    }
    setAuction(null);
    for (const f of r.favours) {
      const t = A.tag(`p${f.player}`, '🃏 Favour card!', 'favour');
      fx.card();
      await A.wait(900);
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
      spoil([`m-${f}-0`], f, g.market[f][0] + (heat ? g.market[f][1] : 0));
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

  // Computer players act one step at a time, after any animation finishes.
  useEffect(() => {
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
  }, [s.phase]);

  const pickMarket = (f: FruitId, pos: number) => {
    if (freeFruit !== null) {
      attempt(() => playFavour(s, active, freeFruit, { fruit: f, pos }));
      setFreeFruit(null);
      return;
    }
    attempt(() => buy(s, active, f, pos));
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
    attempt(() => playFavour(s, active, idx));
  };

  if (needHandoff) {
    const pl = s.players[active];
    return (
      <div class="handoff" onClick={() => { fx.tap(); setHandedTo(active); }}>
        <div class="avatar xl">{pl.avatar}</div>
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
        <main class="scroll"><Results s={s} viewer={viewer} onExit={onExit} onRematch={onRematch} /></main>
      </div>
    );
  }

  const me = viewer;
  const around = seats(s.players.length, me);
  const top = around.find((x) => x.side === 'top');
  const left = around.find((x) => x.side === 'left');
  const right = around.find((x) => x.side === 'right');
  const myBuyTurn = s.phase === 'buy' && activeHuman && !busy;
  const pl = s.players[active];
  const showTray = !busy && activeHuman && s.phase === 'bid';

  return (
    <div class={`game ${night ? 'is-night' : ''}`} onClick={() => busyRef.current && A.hurryUp()}>
      <TopBar s={s} viewer={viewer} onMenu={() => setMenu(true)} />
      {(s.event || s.nextEvent) && (
        <div class="event-strip" onClick={(e) => { e.stopPropagation(); setEventInfo(!eventInfo); }}>
          {s.event ? <><span>{s.event.icon}</span><b>{s.event.title}</b></> : <small>Calm day</small>}
          {s.nextEvent && <span class="next">Tomorrow: {s.nextEvent.icon} {s.nextEvent.title}</span>}
          <span class="info">ⓘ</span>
        </div>
      )}
      {eventInfo && (
        <div class="event-pop" onClick={() => setEventInfo(false)}>
          {s.event && <p><b>{s.event.icon} Today: {s.event.title}.</b> {s.event.text}</p>}
          {s.nextEvent && <p><b>{s.nextEvent.icon} Tomorrow: {s.nextEvent.title}.</b> {s.nextEvent.text}</p>}
        </div>
      )}

      <div class="table">
        {top && <div class="seat-top"><RivalStall s={s} p={top.p} side="top" onOpen={() => setRival(top.p)} /></div>}
        <div class="street-wrap" data-a="street"><Street s={s} onTip={(c) => setTip(c)} /></div>
        <PulseBar s={s} onTap={() => setPulseInfo(!pulseInfo)} />
        <div class="mid">
          {left ? <RivalStall s={s} p={left.p} side="left" onOpen={() => setRival(left.p)} /> : <span />}
          <div class="centre">
            <Market s={s} morning={s.phase === 'morning'}
              onPick={myBuyTurn ? pickMarket : undefined}
              canPick={(f, pos) => freeFruit !== null || !canBuy(s, active, f, pos)} />
            {s.phase === 'morning' && !busy && <MorningCard s={s} />}
            {s.phase === 'reveal' && revealDone && <SalesSummary s={s} viewer={viewer} />}
            {auction && <AuctionCard s={s} a={auction} viewer={viewer} />}
          </div>
          {right ? <RivalStall s={s} p={right.p} side="right" onOpen={() => setRival(right.p)} /> : <span />}
        </div>
        <MyStall s={s} p={me} onCard={activeHuman ? playCard : undefined} flashCards={freeFruit !== null} />
      </div>

      {showTray && s.phase === 'bid' && (
        <div class="tray-wrap"><BidSheet key={`${s.day}-${active}`} s={s} p={active} onSubmit={(bids, fav) => { fx.card(); attempt(() => submitBids(s, active, bids, fav)); }} /></div>
      )}

      <footer class="actionbar">
        {busy && <div class="hint-bar">{night ? '🌙 Night falls…' : s.phase === 'morning' ? '🚚 The farmer is unloading…' : s.phase === 'reveal' ? '💰 Selling… tap to speed up' : `${pl?.avatar ?? ''} ${pl?.kind === 'human' ? 'Bought!' : `${pl?.name ?? ''} is shopping…`}`}</div>}
        {!busy && s.phase === 'morning' && <button class="btn primary wide big" onClick={() => { fx.tap(); attempt(() => beginBuying(s)); }}>Open the market 🧺</button>}
        {!busy && s.phase === 'buy' && activeHuman && (
          <>
            <button class="btn ghost" disabled={!turnStart.current || turnStart.current === s} onClick={() => { if (turnStart.current) { const t = turnStart.current; sRef.current = t; setS(t); onChange(t); } setFreeFruit(null); }}>↶</button>
            <div class="buy-hint"><b>Your turn</b><small>tap fruit to buy · {pl.boughtToday}/{pl.upgrades.includes('cart') ? 5 : 3}</small></div>
            <button class="btn primary" onClick={() => { fx.tap(); setFreeFruit(null); attempt(() => endBuyTurn(s, active)); }}>Done ➜</button>
          </>
        )}
        {!busy && s.phase === 'buy' && !activeHuman && <div class="hint-bar">{pl?.avatar} {pl?.name} is shopping…</div>}
        {!busy && s.phase === 'bid' && !activeHuman && <div class="hint-bar">💭 Rivals are pricing…</div>}
        {!busy && s.phase === 'evening' && activeHuman && (
          <EveningDock s={s} p={active} onUpgrade={(u) => attempt(() => buyUpgrade(s, active, u))} onPriority={reallyPlay} onDone={() => attempt(() => endEvening(s, active))} />
        )}
        {!busy && s.phase === 'evening' && !activeHuman && <div class="hint-bar">🔨 {pl?.name} is closing up…</div>}
        {!busy && s.phase === 'reveal' && (
          <button class="btn primary wide big" onClick={() => { fx.tap(); setHandedTo(null); attempt(() => finishReveal(s)); }}>
            {s.day >= s.config.days ? 'Final results 🏆' : 'Close for the day 🌙'}
          </button>
        )}
      </footer>

      <div class="fx-layer" ref={layerRef} />
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
          <b>{face(tip.name)} {lookOf(tip.name).title}{tip.name === s.event?.extra?.name ? ' ⭐ special order' : ''}</b>
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

      {rival !== null && (
        <div class="modal-bg" onClick={() => setRival(null)}>
          <div class="modal" onClick={(e) => e.stopPropagation()}>
            <ShopPanel s={s} p={rival} />
            <p class="small muted">{s.players[rival].favours.length} secret favour card(s).</p>
            <button class="btn wide" onClick={() => setRival(null)}>Close</button>
          </div>
        </div>
      )}

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

function TopBar({ s, viewer, onMenu }: { s: GameState; viewer: number; onMenu: () => void }) {
  return (
    <header class="topbar">
      <button class="icon-btn" onClick={(e) => { e.stopPropagation(); onMenu(); }} aria-label="Menu">☰</button>
      <div class="day">
        <div class="days">{Array.from({ length: s.config.days }, (_, i) => <i class={i + 1 < s.day ? 'past' : i + 1 === s.day ? 'now' : ''} />)}</div>
        <span class="phase">Day {s.day} · {PHASE[s.phase]}</span>
      </div>
      <div class="chip cash big"><Coin size={18} />{s.players[viewer].cash}</div>
    </header>
  );
}

function MorningCard({ s }: { s: GameState }) {
  return (
    <div class="morning-card">
      <div class="mc-day">Day {s.day}{s.day === s.config.days && <b> · last day!</b>}</div>
      {s.event ? (
        <div class="event-card flip">
          <div class="ei">{s.event.icon}</div>
          <b>{s.event.title}</b>
          <p>{s.event.text}</p>
          {s.event.minPrice && <div class="minprices">{FRUITS.map((f) => <span><Fruit id={f} size={18} />${s.event!.minPrice![f]}</span>)}</div>}
        </div>
      ) : (
        <div class="sunny">☀️ A calm day at the market</div>
      )}
      {s.nextEvent && <div class="mc-next">Tomorrow: <b>{s.nextEvent.icon} {s.nextEvent.title}</b><small>{s.nextEvent.text}</small></div>}
    </div>
  );
}

function AuctionCard({ s, a, viewer }: { s: GameState; a: { line: LineResult; stage: 'sealed' | 'open' | 'done'; n: number; of: number }; viewer: number }) {
  const l = a.line;
  const sold = l.offers.reduce((x, o) => x + o.sold, 0);
  const winners = l.offers.filter((o) => o.sold > 0);
  return (
    <div class="auction">
      <div class="au-top"><small>Sale {a.n} of {a.of}</small><small>cheapest sells first</small></div>
      <div class="au-cust">
        <span class="au-face">{lookOf(l.name).icon}</span>
        <div><b>{lookOf(l.name).title}</b><span class="au-want">wants <Fruit id={l.fruit} size={18} /> ×{l.want} · pays up to ${l.max} each</span></div>
      </div>
      <div class="au-offers">
        {l.offers.map((o, i) => {
          const pl = s.players[o.player];
          const open = a.stage !== 'sealed';
          return (
            <div class={`au-offer ${open ? 'open' : ''} ${a.stage === 'done' ? (o.sold ? 'won' : 'lost') : ''} ${o.player === viewer ? 'me' : ''}`} style={{ transitionDelay: `${i * 0.12}s` }}>
              <span class="au-who">{pl.avatar}</span>
              <span class="au-price">{open ? `$${o.price}` : '🔒'}</span>
              <span class="au-qty">×{o.qty}</span>
              {a.stage === 'done' && <span class="au-res">{o.sold ? `SOLD ${o.sold}` : 'too pricey'}</span>}
            </div>
          );
        })}
      </div>
      {a.stage === 'done' && (
        <div class="au-why">
          {winners.length ? <>✅ {winners.map((o) => `${s.players[o.player].name} sold ${o.sold} at $${o.price}`).join(', ')}.</> : 'Nobody sold.'}
          {sold < l.want && ` ${l.want - sold} still wanted.`}
          {l.offers.some((o) => !o.sold) && sold >= l.want && ' Higher prices missed out.'}
        </div>
      )}
    </div>
  );
}

function SalesSummary({ s, viewer }: { s: GameState; viewer: number }) {
  const r = s.results!;
  return (
    <div class="sales-card">
      <b>Today's takings</b>
      <div class="takings">
        {s.players.map((pl, i) => (
          <span class={`tk ${i === viewer ? 'me' : ''} ${r.income[i] ? '' : 'zero'}`}>{pl.avatar}<b>+${r.income[i]}</b></span>
        ))}
      </div>
      {r.leftAngry.length > 0 && <small>😠 {r.leftAngry.join(', ')} left unhappy</small>}
      {r.movedToWaiting.length > 0 && s.day < s.config.days && <small>⏳ {r.movedToWaiting.join(', ')} will wait until tomorrow</small>}
    </div>
  );
}

function EveningDock({ s, p, onUpgrade, onPriority, onDone }: { s: GameState; p: number; onUpgrade: (u: UpgradeId) => void; onPriority: (i: number) => void; onDone: () => void }) {
  const pl = s.players[p];
  const [pick, setPick] = useState<UpgradeId | null>(null);
  const rotting = FRUITS.filter((f) => pl.stock[f][0] > 0);
  const fine = (s.event?.inspector ?? 0) * notSoCount(pl.stock);
  const pri = pl.favours.indexOf('priority');
  return (
    <div class="dock">
      <div class="dock-row">
        {rotting.length > 0 && <span class="dock-warn">⚠️ spoils tonight {rotting.map((f) => <span><Fruit id={f} size={14} stage="notso" />{pl.stock[f][0]}</span>)}</span>}
        {fine > 0 && <span class="dock-warn">🕵️ fine ${fine}</span>}
        {!!s.event?.ageExtra && <span class="dock-warn">🔥 ages twice</span>}
        {pri >= 0 && !canPlayFavour(s, p, pri) && <button class="fcard usable" onClick={() => onPriority(pri)}><span>⏩</span><small>Priority</small></button>}
      </div>
      {s.config.upgrades && (
        <div class="dock-ups">
          {(Object.keys(UPGRADES) as UpgradeId[]).map((u) => {
            const d = UPGRADES[u];
            const owned = pl.upgrades.includes(u);
            return (
              <button class={`dup ${owned ? 'owned' : ''} ${pick === u ? 'sel' : ''}`} onClick={() => setPick(pick === u ? null : u)}>
                <span>{d.icon}</span><small>{owned ? '✓' : `$${d.cost}`}</small>
              </button>
            );
          })}
        </div>
      )}
      {pick && (
        <div class="dock-info">
          <span><b>{UPGRADES[pick].title}:</b> {UPGRADES[pick].text}</span>
          {!pl.upgrades.includes(pick) && (
            <button class="btn primary" disabled={!!canUpgrade(s, p, pick)} onClick={() => { onUpgrade(pick); setPick(null); }}>Build ${UPGRADES[pick].cost}</button>
          )}
        </div>
      )}
      <button class="btn primary wide" onClick={() => { fx.tap(); onDone(); }}>Lights out 🌙</button>
    </div>
  );
}

function Results({ s, viewer, onExit, onRematch }: { s: GameState; viewer: number; onExit: () => void; onRematch: () => void }) {
  const order = ranking(s);
  const win = order[0] === viewer;
  const medals = ['🥇', '🥈', '🥉', '4️⃣'];
  return (
    <section class="results">
      <div class="trophy">{win ? '🏆' : '😅'}</div>
      <h2>{win ? 'Top shop in town!' : `${s.players[order[0]].name} wins`}</h2>
      {s.config.daily && <p class="chip">📅 Daily challenge {s.config.daily}</p>}
      <div class="podium">
        {order.map((i, k) => {
          const pl = s.players[i];
          return (
            <div class={`pod ${i === viewer ? 'me' : ''}`}>
              <span class="medal">{medals[k]}</span>
              <span class="avatar sm">{pl.avatar}</span>
              <b>{pl.name}</b>
              <span class="spacer" />
              <span class="chip cash"><Coin />{pl.cash}</span>
              <div class="pod-stats">🍎 sold {pl.stats.sold} · 🗑 spoiled {pl.stats.spoiled} · best ${pl.stats.bestSale} · {pl.upgrades.map((u) => UPGRADES[u].icon).join('')}</div>
            </div>
          );
        })}
      </div>
      <button class="btn primary big wide" onClick={onRematch}>Play again</button>
      <button class="btn wide" onClick={onExit}>Main menu</button>
    </section>
  );
}

