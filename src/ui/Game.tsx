// The game table. Every state change goes through apply(), which plays the matching
// animation (delivery, buying, selling, night) before handing control back.
import { useEffect, useMemo, useRef, useState } from 'preact/hooks';
import { aiStep } from '../engine/ai';
import { FAVOURS, FRUIT, FRUITS, UPGRADES, freshPos, type FruitId, type UpgradeId } from '../engine/data';
import {
  activePlayer, beginBuying, buy, buyUpgrade, canBuy, canPlayFavour, canUpgrade, endBuyTurn, endEvening,
  finishReveal, playFavour, ranking, submitBids, RuleError,
  type GameState,
} from '../engine/game';
import { Coin, Fruit } from './art';
import * as A from './anim';
import { BidSheet } from './BidSheet';
import { ShopPanel } from './board';
import { fx } from './fx';
import { loadSettings } from './store';
import { Market, MyStall, RivalStall, Street, seats } from './table';

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
    for (const l of lines) {
      const tags = l.offers.map((o) => ({ o, t: A.tag(`p${o.player}`, `$${o.price}`, o.player === viewer ? 'mine' : '') }));
      A.pulse(`c${l.customerId}`);
      fx.tap();
      await A.wait(650);
      const jobs: Promise<void>[] = [];
      for (const { o, t } of tags) {
        if (!o.sold) {
          t.set('lost');
          continue;
        }
        t.set('won');
        for (let k = 0; k < Math.min(o.sold, 4); k++) {
          jobs.push(A.fly([`p${o.player}-${l.fruit}`, `p${o.player}`], [`c${l.customerId}-${l.fruit}`, `c${l.customerId}`], <Fruit id={l.fruit} size={28} />, { delay: k * 90 }));
        }
        jobs.push(A.fly([`c${l.customerId}`], `p${o.player}-cash`, <Coin size={26} />, { delay: 380, duration: 480 }).then(() => {
          fx.coin();
          const tip = g.players[o.player].upgrades.includes('signboard') ? o.sold : 0;
          A.floatText(`p${o.player}-cash`, `+$${o.sold * o.price + tip}`);
        }));
      }
      await Promise.all(jobs);
      await A.wait(450);
      tags.forEach(({ t }) => t.remove());
    }
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
    const heat = g.event?.id === 'heatwave' ? 1 : 0;
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
    const why = canPlayFavour(s, active, idx);
    if (why) { setCardInfo(idx); return; }
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
  const showTray = !busy && activeHuman && (s.phase === 'bid' || s.phase === 'evening');

  return (
    <div class={`game ${night ? 'is-night' : ''}`} onClick={() => busyRef.current && A.hurryUp()}>
      <TopBar s={s} viewer={viewer} onMenu={() => setMenu(true)} />
      {s.event && <div class="event-strip" title={s.event.text}><span>{s.event.icon}</span><b>{s.event.title}</b><small>{s.event.text}</small></div>}

      <div class="table">
        {top && <div class="seat-top"><RivalStall s={s} p={top.p} side="top" onOpen={() => setRival(top.p)} /></div>}
        <div class="street-wrap" data-a="street"><Street s={s} /></div>
        <div class="mid">
          {left ? <RivalStall s={s} p={left.p} side="left" onOpen={() => setRival(left.p)} /> : <span />}
          <div class="centre">
            <Market s={s} morning={s.phase === 'morning'}
              onPick={myBuyTurn ? pickMarket : undefined}
              canPick={(f, pos) => freeFruit !== null || !canBuy(s, active, f, pos)} />
            {s.phase === 'morning' && !busy && <MorningCard s={s} />}
            {s.phase === 'reveal' && revealDone && <SalesSummary s={s} viewer={viewer} />}
          </div>
          {right ? <RivalStall s={s} p={right.p} side="right" onOpen={() => setRival(right.p)} /> : <span />}
        </div>
        <MyStall s={s} p={me} onCard={activeHuman ? playCard : undefined} flashCards={freeFruit !== null} />
      </div>

      {showTray && s.phase === 'bid' && (
        <div class="tray-wrap"><BidSheet key={`${s.day}-${active}`} s={s} p={active} onSubmit={(bids, fav) => { fx.card(); attempt(() => submitBids(s, active, bids, fav)); }} /></div>
      )}
      {showTray && s.phase === 'evening' && (
        <div class="tray-wrap"><EveningTray s={s} p={active} onUpgrade={(u) => attempt(() => buyUpgrade(s, active, u))} onCard={playCard} onDone={() => attempt(() => endEvening(s, active))} /></div>
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
        {!busy && s.phase === 'evening' && !activeHuman && <div class="hint-bar">🔨 {pl?.name} is closing up…</div>}
        {!busy && s.phase === 'reveal' && (
          <button class="btn primary wide big" onClick={() => { fx.tap(); setHandedTo(null); attempt(() => finishReveal(s)); }}>
            {s.day >= s.config.days ? 'Final results 🏆' : 'Close for the day 🌙'}
          </button>
        )}
      </footer>

      <div class="fx-layer" ref={layerRef} />
      {toast && <div class="toast">{toast}</div>}

      {cardInfo !== null && s.players[active]?.favours[cardInfo] && (
        <div class="modal-bg" onClick={() => setCardInfo(null)}>
          <div class="modal center">
            {(() => { const d = FAVOURS[s.players[active].favours[cardInfo]]; return (<><div class="big-icon">{d.icon}</div><h2>{d.title}</h2><p>{d.text}</p><p class="muted small">{canPlayFavour(s, active, cardInfo)}</p></>); })()}
            <button class="btn wide" onClick={() => setCardInfo(null)}>OK</button>
          </div>
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

function EveningTray({ s, p, onUpgrade, onCard, onDone }: { s: GameState; p: number; onUpgrade: (u: UpgradeId) => void; onCard: (i: number) => void; onDone: () => void }) {
  const pl = s.players[p];
  const rotting = FRUITS.filter((f) => pl.stock[f][0] > 0);
  const pri = pl.favours.indexOf('priority');
  return (
    <div class="tray">
      <div class="tray-head"><b>🌙 Evening</b><span class="muted small">{s.config.days - s.day} days left</span></div>
      <div class="tray-body">
        {rotting.length > 0 && (
          <div class="spoil-warn">⚠️ Spoils tonight: {rotting.map((f) => <span><Fruit id={f} size={18} stage="notso" />×{pl.stock[f][0]}</span>)}</div>
        )}
        {s.config.upgrades && (
          <div class="up-grid">
            {(Object.keys(UPGRADES) as UpgradeId[]).map((u) => {
              const d = UPGRADES[u];
              const owned = pl.upgrades.includes(u);
              const why = canUpgrade(s, p, u);
              return (
                <button class={`up ${owned ? 'owned' : ''}`} disabled={!!why} onClick={() => onUpgrade(u)}>
                  <span class="ui">{d.icon}</span>
                  <b>{d.title}</b>
                  <small>{d.text}</small>
                  <span class="price">{owned ? '✓' : `$${d.cost}`}</span>
                </button>
              );
            })}
          </div>
        )}
        {pri >= 0 && !canPlayFavour(s, p, pri) && (
          <button class="fcard wide usable" onClick={() => onCard(pri)}><span>⏩</span><small>Play Priority: buy first tomorrow</small></button>
        )}
      </div>
      <div class="tray-foot">
        <button class="btn primary big wide" onClick={() => { fx.tap(); onDone(); }}>Lights out 🌙</button>
      </div>
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

