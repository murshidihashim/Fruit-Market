// The game screen: runs the computer players, shows each phase, handles pass-and-play hand-offs.
import { useEffect, useMemo, useRef, useState } from 'preact/hooks';
import { aiStep } from '../engine/ai';
import { FAVOURS, FRUITS, UPGRADES, type FruitId, type UpgradeId } from '../engine/data';
import {
  activePlayer, beginBuying, buy, buyUpgrade, canBuy, canPlayFavour, canUpgrade, endBuyTurn, endEvening,
  finishReveal, playFavour, ranking, submitBids, RuleError,
  type GameState,
} from '../engine/game';
import { Coin, Fruit } from './art';
import { BidSheet } from './BidSheet';
import { CustomerRow, MarketBoard, PlayerHand, RivalStrip, ShopPanel } from './board';
import { fx } from './fx';
import { loadSettings } from './store';

interface Props { initial: GameState; onExit: () => void; onChange: (s: GameState) => void; onRematch: () => void }

const PHASE_NAME = { morning: 'Morning', buy: 'Buying', bid: 'Selling', reveal: 'Sales', evening: 'Evening', over: 'Closed' } as const;

export function Game({ initial, onExit, onChange, onRematch }: Props) {
  const [s, setS] = useState(initial);
  const [toast, setToast] = useState<string | null>(null);
  const [flash, setFlash] = useState<string | undefined>();
  const [rival, setRival] = useState<number | null>(null);
  const [freeFruit, setFreeFruit] = useState<number | null>(null);
  const [handedTo, setHandedTo] = useState<number | null>(null);
  const [menu, setMenu] = useState(false);
  const turnStart = useRef<GameState | null>(null);

  const humans = useMemo(() => s.players.map((p, i) => (p.kind === 'human' ? i : -1)).filter((i) => i >= 0), [s.players.length]);
  const multi = humans.length > 1;
  const active = activePlayer(s);
  const activeHuman = active >= 0 && s.players[active].kind === 'human';
  const lastViewer = useRef(humans[0]);
  if (activeHuman) lastViewer.current = active;
  const viewer = lastViewer.current;
  const needHandoff = multi && activeHuman && handedTo !== active;

  const update = (next: GameState) => {
    setS(next);
    onChange(next);
  };

  const say = (msg: string) => {
    setToast(msg);
    window.setTimeout(() => setToast((t) => (t === msg ? null : t)), 2200);
  };

  const attempt = (fn: () => GameState) => {
    try {
      update(fn());
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

  // Computer players act one step at a time.
  useEffect(() => {
    if (s.phase === 'morning' || s.phase === 'reveal' || s.phase === 'over') return;
    if (active < 0 || s.players[active].kind !== 'ai') return;
    const fast = loadSettings().fast;
    const t = window.setTimeout(() => {
      const before = s;
      const next = aiStep(s);
      if (!next) return;
      if (before.phase === 'buy' && next.phase === 'buy' && next.players[active].boughtToday > before.players[active].boughtToday) fx.tap();
      update(next);
    }, s.phase === 'buy' ? (fast ? 140 : 420) : fast ? 120 : 300);
    return () => window.clearTimeout(t);
  }, [s]);

  // Remember the state at the start of a human's buying turn so purchases can be undone.
  useEffect(() => {
    if (s.phase === 'buy' && activeHuman) {
      if (!turnStart.current || activePlayer(turnStart.current) !== active || turnStart.current.phase !== 'buy' || turnStart.current.day !== s.day) turnStart.current = s;
    } else turnStart.current = null;
  }, [s.phase, active, s.day]);

  useEffect(() => {
    if (s.phase === 'reveal') {
      const mine = s.results?.income[viewer] ?? 0;
      if (mine > 0) fx.coin();
    }
    if (s.phase === 'over') (ranking(s)[0] === viewer ? fx.win : fx.lose)();
    if (s.phase === 'morning' && s.event) fx.card();
  }, [s.phase]);

  const pickMarket = (f: FruitId, pos: number) => {
    if (freeFruit !== null) {
      if (attempt(() => playFavour(s, active, freeFruit, { fruit: f, pos }))) {
        fx.buy();
        setFlash(`${f}:${pos}`);
      }
      setFreeFruit(null);
      return;
    }
    if (attempt(() => buy(s, active, f, pos))) {
      fx.buy();
      setFlash(`${f}:${pos}`);
      window.setTimeout(() => setFlash(undefined), 500);
    }
  };

  const playCard = (idx: number) => {
    const id = s.players[active].favours[idx];
    const why = canPlayFavour(s, active, idx);
    if (why) return say(why);
    if (id === 'freeFruit') {
      setFreeFruit(idx);
      return say('Tap any fruit at the market to take it free');
    }
    fx.card();
    attempt(() => playFavour(s, active, idx));
    say(`${FAVOURS[id].title} played!`);
  };

  if (needHandoff) {
    const pl = s.players[active];
    return (
      <div class="handoff" onClick={() => { fx.tap(); setHandedTo(active); }}>
        <div class="avatar xl">{pl.avatar}</div>
        <h2>Pass the phone to {pl.name}</h2>
        <p>{s.phase === 'bid' ? 'Time to set secret prices. No peeking!' : s.phase === 'buy' ? 'Your turn to buy fruit.' : 'Your shop, your evening.'}</p>
        <button class="btn primary big">I'm {pl.name}, tap to start</button>
      </div>
    );
  }

  const me = s.players[viewer];
  const daysLeft = s.config.days - s.day;

  return (
    <div class="game">
      <header class="topbar">
        <button class="icon-btn" onClick={() => setMenu(true)} aria-label="Menu">☰</button>
        <div class="day">
          <span><b>Day {s.day}</b> / {s.config.days}</span>
          <span class={`phase ph-${s.phase}`}>{PHASE_NAME[s.phase]}</span>
        </div>
        <div class="chip cash big"><Coin size={18} />{me.cash}</div>
      </header>

      {s.event && s.phase !== 'over' && (
        <div class="event-banner"><span class="ei">{s.event.icon}</span><div><b>{s.event.title}</b><small>{s.event.text}</small></div></div>
      )}

      <main class="scroll">
        {s.phase !== 'over' && <CustomerRow s={s} />}
        {s.phase !== 'over' && <RivalStrip s={s} viewer={viewer} onOpen={setRival} />}

        {s.phase === 'buy' && (
          <>
            <TurnBanner s={s} p={active} viewer={viewer} />
            <MarketBoard s={s} flash={flash}
              onPick={activeHuman ? pickMarket : undefined}
              canPick={(f, pos) => freeFruit !== null || !canBuy(s, active, f, pos)} />
            <ShopPanel s={s} p={viewer} title="Your Shop" flash={flash}>
              {activeHuman && <PlayerHand pl={s.players[active]} phase="buy" onPlay={playCard} />}
            </ShopPanel>
          </>
        )}

        {s.phase === 'bid' && activeHuman && <BidSheet key={`${s.day}-${active}`} s={s} p={active} onSubmit={(bids, fav) => { fx.card(); attempt(() => submitBids(s, active, bids, fav)); }} />}
        {s.phase === 'bid' && !activeHuman && <div class="waiting">🤔 Rivals are choosing prices…</div>}
        {s.phase === 'bid' && activeHuman && <ShopPanel s={s} p={active} title="Your Shop" />}

        {s.phase === 'reveal' && <Reveal s={s} viewer={viewer} />}

        {s.phase === 'evening' && (
          activeHuman ? <Evening s={s} p={active} attempt={attempt} playCard={playCard} /> : <div class="waiting">🌙 Rivals are closing up…</div>
        )}

        {s.phase === 'morning' && <MarketBoard s={s} />}
        {s.phase === 'morning' && <ShopPanel s={s} p={viewer} title="Your Shop" />}

        {s.phase === 'over' && <Results s={s} viewer={viewer} onExit={onExit} onRematch={onRematch} />}
      </main>

      {s.phase === 'morning' && <Morning s={s} onGo={() => { fx.tap(); update(beginBuying(s)); }} />}

      {s.phase !== 'over' && (
        <footer class="actionbar">
          {s.phase === 'buy' && activeHuman && (
            <>
              <button class="btn ghost" disabled={!turnStart.current || turnStart.current === s} onClick={() => { if (turnStart.current) update(turnStart.current); setFreeFruit(null); }}>↶ Undo</button>
              <button class="btn primary" onClick={() => { fx.tap(); setFreeFruit(null); attempt(() => endBuyTurn(s, active)); }}>Done buying ➜</button>
            </>
          )}
          {s.phase === 'buy' && !activeHuman && <div class="hint-bar">{s.players[active]?.name} is shopping…</div>}
          {s.phase === 'reveal' && (
            <button class="btn primary wide" onClick={() => { fx.tap(); setHandedTo(null); update(finishReveal(s)); }}>
              {s.day >= s.config.days ? 'See final results 🏆' : 'Close shop for the day 🌙'}
            </button>
          )}
          {s.phase === 'evening' && activeHuman && (
            <button class="btn primary wide" onClick={() => { fx.night(); attempt(() => endEvening(s, active)); }}>Lights out 🌙{daysLeft > 0 ? ' Next day' : ''}</button>
          )}
          {(s.phase === 'bid' || s.phase === 'evening') && !activeHuman && <div class="hint-bar">Waiting for rivals…</div>}
        </footer>
      )}

      {toast && <div class="toast">{toast}</div>}

      {rival !== null && (
        <div class="modal-bg" onClick={() => setRival(null)}>
          <div class="modal" onClick={(e) => e.stopPropagation()}>
            <ShopPanel s={s} p={rival} />
            <p class="small muted">{s.players[rival].favours.length} favour card(s) held secretly.</p>
            <button class="btn wide" onClick={() => setRival(null)}>Close</button>
          </div>
        </div>
      )}

      {menu && (
        <div class="modal-bg" onClick={() => setMenu(false)}>
          <div class="modal" onClick={(e) => e.stopPropagation()}>
            <h2>Paused</h2>
            <p class="muted">Your game is saved automatically.</p>
            <button class="btn primary wide" onClick={() => setMenu(false)}>Resume</button>
            <button class="btn wide" onClick={onExit}>Save &amp; quit to menu</button>
          </div>
        </div>
      )}
    </div>
  );
}

function TurnBanner({ s, p, viewer }: { s: GameState; p: number; viewer: number }) {
  const pl = s.players[p];
  const mine = p === viewer && pl.kind === 'human';
  return (
    <div class={`turn-banner ${mine ? 'mine' : ''}`}>
      <span class="avatar sm">{pl.avatar}</span>
      {mine ? <span><b>Your turn.</b> Tap fruit at the market to buy (up to {pl.upgrades.includes('cart') ? 5 : 3}). Fresher costs more but sells for more.</span> : <span><b>{pl.name}</b> is buying…</span>}
      <span class="order">{s.order.map((i, k) => <span class={`dot ${k < s.turn ? 'done' : k === s.turn ? 'now' : ''}`}>{s.players[i].avatar}</span>)}</span>
    </div>
  );
}

function Morning({ s, onGo }: { s: GameState; onGo: () => void }) {
  return (
    <div class="modal-bg">
      <div class="modal morning">
        <div class="sun">☀️</div>
        <h2>Day {s.day} of {s.config.days}</h2>
        {s.day === s.config.days && <p class="warn-text"><b>Last day!</b> Fruit left over at closing is worth nothing.</p>}
        {s.event && (
          <div class="event-card flip">
            <div class="ei">{s.event.icon}</div>
            <b>{s.event.title}</b>
            <p>{s.event.text}</p>
            {s.event.minPrice && (
              <div class="minprices">{FRUITS.map((f) => <span><Fruit id={f} size={20} />${s.event!.minPrice![f]}</span>)}</div>
            )}
          </div>
        )}
        <div class="delivery">
          <div class="muted small">{s.event?.id === 'strike' ? 'No delivery today' : 'The farmer delivered'}</div>
          <div class="del-row">
            {FRUITS.filter((f) => s.delivery[f]).map((f) => (
              <span class="del"><Fruit id={f} size={30} stage={s.deliveryUnripe === f ? 'unripe' : 'fresh'} />×{s.delivery[f]}{s.deliveryUnripe === f && <small>unripe</small>}</span>
            ))}
          </div>
        </div>
        <button class="btn primary big wide" onClick={onGo}>Open the market 🧺</button>
      </div>
    </div>
  );
}

function Reveal({ s, viewer }: { s: GameState; viewer: number }) {
  const r = s.results!;
  const byCustomer = new Map<number, typeof r.lines>();
  for (const l of r.lines) byCustomer.set(l.customerId, [...(byCustomer.get(l.customerId) ?? []), l]);
  let delay = 0;
  return (
    <section class="reveal">
      <div class="income-row">
        {s.players.map((pl, i) => (
          <div class={`income ${i === viewer ? 'me' : ''}`}><span class="avatar sm">{pl.avatar}</span><b>+${r.income[i]}</b></div>
        ))}
      </div>
      {[...byCustomer.entries()].map(([, lines]) => (
        <div class="reveal-cust">
          <div class="rc-name">{lines[0].name}</div>
          {lines.map((l) => {
            delay += 0.25;
            const sold = l.offers.reduce((a, o) => a + o.sold, 0);
            return (
              <div class="rc-line" style={{ animationDelay: `${delay}s` }}>
                <div class="rc-want"><Fruit id={l.fruit} size={24} />×{l.want} <small>≤${l.max}</small></div>
                <div class="rc-offers">
                  {l.offers.length === 0 && <span class="muted small">No offers</span>}
                  {l.offers.map((o) => (
                    <span class={`offer ${o.sold ? 'won' : 'lost'} ${o.player === viewer ? 'me' : ''}`}>
                      {s.players[o.player].avatar} ${o.price}
                      {o.sold > 0 && <b> ×{o.sold}</b>}
                    </span>
                  ))}
                </div>
                {sold < l.want && <span class="unfilled">{l.want - sold} unsold</span>}
              </div>
            );
          })}
        </div>
      ))}
      <div class="reveal-notes">
        {r.favours.map((f) => (
          <p>🃏 <b>{s.players[f.player].name}</b> served all of {f.customer}'s order alone and drew a favour card{f.player === viewer ? `: ${FAVOURS[f.favour].icon} ${FAVOURS[f.favour].title}` : ''}.</p>
        ))}
        {r.happy.length > 0 && <p>😊 Happy customers: {r.happy.join(', ')}</p>}
        {r.movedToWaiting.length > 0 && s.day < s.config.days && <p>⏳ Coming back tomorrow: {r.movedToWaiting.join(', ')}</p>}
        {r.leftAngry.length > 0 && <p>😠 Left without everything they wanted: {r.leftAngry.join(', ')}</p>}
      </div>
    </section>
  );
}

function Evening({ s, p, attempt, playCard }: { s: GameState; p: number; attempt: (fn: () => GameState) => boolean; playCard: (i: number) => void }) {
  const pl = s.players[p];
  const rotting = FRUITS.filter((f) => pl.stock[f][0] > 0);
  const heat = s.event?.id === 'heatwave';
  return (
    <section class="evening">
      <div class="panel">
        <h3>🌙 Tonight</h3>
        <p>All fruit ages one step{heat ? ' (two steps: heatwave!)' : ''}{pl.upgrades.includes('coolroom') && s.day % 2 === 1 ? '. Your Cool Room keeps yours fresh tonight' : ''}.</p>
        {rotting.length > 0 ? (
          <p class="warn-text">Spoiling tonight: {rotting.map((f) => <span class="pill st-notso"><Fruit id={f} size={14} stage="notso" />×{pl.stock[f][0]}</span>)}</p>
        ) : <p class="ok-text">Nothing of yours spoils tonight.</p>}
      </div>
      {s.config.upgrades && (
        <div class="panel">
          <h3>🔨 Upgrade your shop <span class="spacer" /><span class="chip cash"><Coin />{pl.cash}</span></h3>
          <p class="small muted">Upgrades cost cash now (and cash is your score) but pay off over the days left: {s.config.days - s.day}.</p>
          <div class="upgrade-grid">
            {(Object.keys(UPGRADES) as UpgradeId[]).map((u) => {
              const d = UPGRADES[u];
              const owned = pl.upgrades.includes(u);
              const why = canUpgrade(s, p, u);
              return (
                <button class={`upgrade ${owned ? 'owned' : ''}`} disabled={!!why} onClick={() => { fx.coin(); attempt(() => buyUpgrade(s, p, u)); }}>
                  <span class="ui">{d.icon}</span>
                  <b>{d.title}</b>
                  <small>{d.text}</small>
                  <span class="price">{owned ? '✓ Built' : `$${d.cost}`}</span>
                </button>
              );
            })}
          </div>
        </div>
      )}
      <ShopPanel s={s} p={p} title="Your Shop">
        <PlayerHand pl={pl} phase="evening" onPlay={playCard} />
      </ShopPanel>
    </section>
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
              <div class="pod-stats">Sold {pl.stats.sold} · Spoiled {pl.stats.spoiled} · Best sale ${pl.stats.bestSale} · {pl.upgrades.length} upgrades</div>
            </div>
          );
        })}
      </div>
      <button class="btn primary big wide" onClick={onRematch}>Play again</button>
      <button class="btn wide" onClick={onExit}>Main menu</button>
    </section>
  );
}

