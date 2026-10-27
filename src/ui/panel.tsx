// Decision panels: price cards for setting secret prices and upgrade cards for the evening.
// (A rival's stall opens below their seat; see RivalDrop in table.tsx.)
import { useState } from 'preact/hooks';
import { planPrices, planStall } from '../engine/ai';
import { FAVOURS, FRUIT, FRUITS, UPGRADES, stageAt, type FavourId, type FruitId, type TraitId, type UpgradeId } from '../engine/data';
import {
  bestCap, canPlayFavour, canUpgrade, count, effectiveMax, forSale, isDraftNight, isMarketDay, minPrice, notSoCount,
  servingCustomers, validatePrices, type GameState, type Post, type Stall,
} from '../engine/game';
import { Coin, Face, FavourIcon, Fruit } from './art';
import { Icon } from './pixel';

// ---------- favour cards ----------

export function FavourRow({ s, p, phase, onCard }: { s: GameState; p: number; phase: string; onCard: (i: number) => void }) {
  const pl = s.players[p];
  if (!pl.favours.length) return null;
  return (
    <div class="favour-row">
      {pl.favours.map((id: FavourId, i) => {
        const d = FAVOURS[id];
        const ok = d.when === phase && !canPlayFavour(s, p, i);
        return (
          <button type="button" class={`favour-card ${ok ? 'ready' : ''}`} onClick={() => onCard(i)}>
            <span class="fv-icon"><FavourIcon id={d.id} size={22} /></span>
            <span class="fv-name">{d.title}</span>
          </button>
        );
      })}
    </div>
  );
}

// ---------- open stalls ----------

/** Customers in the market who want this fruit, in serving order, with the most they'd pay for it. */
function wantsFor(s: GameState, f: FruitId) {
  return servingCustomers(s).flatMap((c) => c.wants.filter((w) => w.fruit === f && w.qty > 0).map((w) => ({ c, w, max: effectiveMax(s, w, c.generous) })));
}

/** Step 1 of selling: how many of each fruit to put out today. Everyone sees the numbers once all stalls open. */
export function StallPanel({ s, p, onSubmit }: { s: GameState; p: number; onSubmit: (stall: Stall) => void }) {
  const pl = s.players[p];
  const fruits = FRUITS.filter((f) => count(pl.stock, f, true) > 0);
  const [vals, setVals] = useState<Stall>(() => planStall(s, p));
  const set = (f: FruitId, n: number) => setVals((v) => ({ ...v, [f]: Math.max(0, Math.min(count(pl.stock, f, true), n)) }));
  const total = fruits.reduce((a, f) => a + (vals[f] ?? 0), 0);
  const tomorrow = s.day >= s.config.days ? 'Last Call: anything left goes to the jam maker at $1.' : isMarketDay(s, s.day + 1) ? 'Tomorrow is a Market Day: one more walk-in. The lorry still comes.' : null;
  return (
    <div class="price-panel stall-panel">
      <div class="pp-intro"><b>Open your stall</b><span>Put out the fruit you will sell today. Everyone sees how many each stall puts out, then you all set secret prices.</span></div>
      <RivalWatch s={s} p={p} wanted={fruits} step="stall" />
      {tomorrow && <div class="info-card warn small">{tomorrow}</div>}
      {fruits.length === 0 && <div class="info-card dim">You have no ripe fruit to sell today.</div>}
      {fruits.map((f) => {
        const have = count(pl.stock, f, true);
        const n = vals[f] ?? 0;
        const want = wantsFor(s, f).reduce((a, x) => a + x.w.qty, 0);
        const rivals = s.players.reduce((a, o, i) => (i === p ? a : a + count(o.stock, f, true)), 0);
        return (
          <div class={`price-card ${n ? 'on' : ''}`}>
            <div class="pc-top">
              <Fruit id={f} size={40} />
              <div class="pc-who"><b>{FRUIT[f].plural}</b><span>{want ? `${want} wanted today` : 'Nobody wants these today'} · rivals hold {rivals}</span></div>
            </div>
            <div class="pc-row">
              <div class="pc-qty"><span class="pc-lbl">Your stock</span><StockLine stock={pl.stock} f={f} /></div>
              <div class="pc-price">
                <button type="button" aria-label={`Put out one less ${FRUIT[f].name}`} disabled={n <= 0} onClick={() => set(f, n - 1)}>−</button>
                <span class="pc-num">{n}<small> of {have}</small></span>
                <button type="button" aria-label={`Put out one more ${FRUIT[f].name}`} disabled={n >= have} onClick={() => set(f, n + 1)}>+</button>
              </div>
            </div>
          </div>
        );
      })}
      <div class="pp-lock">
        <button class="btn primary big wide" onClick={() => onSubmit(vals)}>{total ? <>Open my stall <small class="btn-sub">{total} out</small></> : 'Keep everything back'}</button>
      </div>
    </div>
  );
}

/** A shop's ripe fruit of one kind, oldest first, coloured by freshness. */
function StockLine({ stock, f }: { stock: Record<FruitId, number[]>; f: FruitId }) {
  const chips: { pos: number; n: number }[] = [];
  for (let i = 0; i < FRUIT[f].ripe.length; i++) if (stock[f][i]) chips.push({ pos: i, n: stock[f][i] });
  return <span class="stock-line">{chips.map((c) => <span class={`sl st-${stageAt(f, c.pos)}`}><Fruit id={f} size={18} stage={stageAt(f, c.pos)} />×{c.n}</span>)}</span>;
}

// ---------- pricing ----------

/** Step 2: one secret price per fruit you put out. The bell reveals every stall's prices at once. */
export function PricePanel({ s, p, onSubmit }: { s: GameState; p: number; onSubmit: (posts: Post[], favoured: boolean) => void }) {
  const pl = s.players[p];
  const fruits = FRUITS.filter((f) => forSale(s, p, f) > 0);
  const [vals, setVals] = useState<Record<string, number>>(() => {
    const plan = planPrices(s, p).posts;
    return Object.fromEntries(fruits.map((f) => [f, plan.find((b) => b.fruit === f)?.price ?? minPrice(s, f)]));
  });
  const [favoured, setFavoured] = useState(false);
  const posts: Post[] = fruits.map((f) => ({ fruit: f, price: vals[f] }));
  const error = validatePrices(s, p, posts);
  return (
    <div class="price-panel">
      <div class="pp-intro"><b>Set your prices</b><span>One secret price per fruit. At the bell all prices show at once; customers buy from the cheapest stall first, and leftover demand moves to the next.</span></div>
      <RivalWatch s={s} p={p} wanted={FRUITS.filter((f) => wantsFor(s, f).length > 0)} step="bid" />
      {fruits.map((f) => {
        const price = vals[f];
        const out = forSale(s, p, f);
        const lines = wantsFor(s, f);
        const want = lines.reduce((a, x) => a + x.w.qty, 0);
        const rivalOut = s.players.map((o, i) => ({ o, i, n: i === p ? 0 : forSale(s, i, f) })).filter((r) => r.n > 0);
        const rivals = rivalOut.reduce((a, r) => a + r.n, 0);
        const read = !want ? { cls: 'war', t: 'Nobody here wants these today' }
          : rivals === 0 ? { cls: 'safe', t: `No rival has any out: ${want} wanted` }
            : rivals + out <= want ? { cls: 'ok', t: `Enough buyers for everyone (${rivals + out} out for ${want})` }
              : { cls: 'war', t: `${rivals} rival ${rivals === 1 ? 'fruit' : 'fruits'} out, ${want} wanted` };
        const top = Math.max(1, ...lines.map((x) => bestCap(pl.stock, f, x.max, pl)));
        return (
          <div class="price-card on">
            <div class="pc-top">
              <Fruit id={f} size={40} />
              <div class="pc-who"><b>{FRUIT[f].plural}: {out} out</b><span>{lines.length ? lines.map((x) => `${x.c.name} ${x.w.qty}×`).join(', ') : 'no customers want these'}</span></div>
            </div>
            <div class="pc-row">
              <div class="pc-qty">
                <span class="pc-lbl">They pay for yours</span>
                <span class="buyer-caps">{lines.map((x) => {
                  const cap = bestCap(pl.stock, f, x.max, pl);
                  return <span class={`bc ${price <= cap ? 'yes' : 'no'}`} title={`${x.c.name} pays up to $${cap} for your freshest`}><Face who={x.c.name} size={18} />≤${cap}</span>;
                })}</span>
              </div>
              <div class="pc-price">
                <button type="button" aria-label="Lower price" disabled={price <= minPrice(s, f)} onClick={() => setVals((v) => ({ ...v, [f]: price - 1 }))}>−</button>
                <span class="pc-num">${price}</span>
                <button type="button" aria-label="Raise price" disabled={price >= Math.min(30, top + 2)} onClick={() => setVals((v) => ({ ...v, [f]: price + 1 }))}>+</button>
              </div>
            </div>
            <div class="pc-foot">
              <span class={`read ${read.cls}`}><b class="psst">Psst…</b> {read.t}</span>
              {rivalOut.length > 0 && (
                <span class="rival-caps">{rivalOut.map((r) => <span title={`${r.o.name} put out ${r.n}`}><Face who={r.o.avatar} size={18} />{r.n} out</span>)}</span>
              )}
            </div>
          </div>
        );
      })}
      {pl.favours.includes('favouredTrade') && !pl.favouredTrade && fruits.length > 0 && (
        <button type="button" class={`favour-card wide ${favoured ? 'on' : 'ready'}`} onClick={() => setFavoured(!favoured)}>
          <span class="fv-icon">🤝</span><span class="fv-name">{favoured ? 'Favoured Trade on: you win ties today' : 'Play Favoured Trade?'}</span>
        </button>
      )}
      <div class="pp-lock">
        {error && <div class="error">{error}</div>}
        <button class="btn primary big wide" disabled={!!error} onClick={() => onSubmit(posts, favoured)}>Seal my prices <small class="btn-sub">ring the bell</small></button>
      </div>
    </div>
  );
}

/**
 * Who you're up against while pricing: each rival's status and the wanted fruit they hold.
 * Public facts only: whether a shop has sealed its prices, and its stock (never a price).
 */
export function RivalWatch({ s, p, wanted, step }: { s: GameState; p: number; wanted: FruitId[]; step: 'stall' | 'bid' }) {
  const rivals = s.players.map((o, i) => ({ o, i })).filter(({ i }) => i !== p);
  if (!rivals.length) return null;
  const isDone = (i: number) => (step === 'stall' ? s.stalls[i] !== null : s.bids[i] !== null);
  const sealed = rivals.filter(({ i }) => isDone(i)).length;
  const verb = step === 'stall' ? 'open' : 'sealed';
  return (
    <section class="rival-watch" aria-label="Your rivals">
      <div class="rw-head">
        <b>Your rivals</b>
        <span>{sealed === rivals.length ? `All ${verb}: waiting for you` : `${sealed} of ${rivals.length} ${verb} · ${step === 'stall' ? 'stalls show together' : 'nobody sees a price until the bell'}`}</span>
      </div>
      <div class="rw-list">
        {rivals.map(({ o, i }) => {
          const done = isDone(i);
          // Before stalls open: what they hold. While pricing: what they put out (public).
          const holds = wanted.map((f) => ({ f, n: step === 'stall' ? count(o.stock, f, true) : forSale(s, i, f) })).filter((x) => x.n > 0);
          const status = done ? (step === 'stall' ? 'stall open' : 'sealed') : o.kind === 'ai' ? 'next in line' : 'deciding';
          return (
            <div class={`rw-card ${done ? 'done' : 'busy'} ${holds.length ? '' : 'out'}`}
              aria-label={`${o.name}: ${status}; ${holds.length ? holds.map((x) => `${x.n} ${FRUIT[x.f].plural}${step === 'bid' ? ' out' : ''}`).join(', ') : 'nothing to sell'}`}>
              <Face who={o.avatar} size={32} />
              <b class="rw-name">{o.name}</b>
              <span class={`rw-status ${done ? 'sealed' : 'deciding'}`}>
                {done ? <><i class="seal" aria-hidden="true" />{status}</> : <><i class="sb-hourglass" aria-hidden="true" />{status}</>}
              </span>
              <span class="rw-holds">
                {holds.length ? holds.map((x) => <span class="rw-f"><Fruit id={x.f} size={16} />{x.n}{step === 'bid' ? ' out' : ''}</span>) : <span class="rw-none">{step === 'bid' ? 'nothing out' : 'sits out'}</span>}
              </span>
            </div>
          );
        })}
      </div>
    </section>
  );
}

// ---------- evening ----------

export const UP_ICON: Record<UpgradeId, 'handcart' | 'coolroom' | 'signboard' | 'juicer'> = { barrow: 'handcart', coldroom: 'coolroom', premium: 'signboard', juicebar: 'juicer' };
export const TRAIT_ICON: Record<TraitId, 'scales' | 'crate' | 'tag' | 'heart' | 'star' | 'egg'> = { haggler: 'scales', basket: 'crate', bargain: 'tag', charmer: 'heart', favourite: 'star', nestegg: 'egg' };

export function EveningPanel({ s, p, onUpgrade, onCard }: { s: GameState; p: number; onUpgrade: (u: UpgradeId) => void; onCard: (i: number) => void }) {
  const pl = s.players[p];
  const rotting = FRUITS.filter((f) => pl.stock[f][0] > 0);
  const fine = (s.event?.inspector ?? 0) * notSoCount(pl.stock);
  const left = s.config.days - s.day;
  return (
    <div class="evening-panel">
      {(rotting.length > 0 || fine > 0 || s.event?.ageExtra) && (
        <div class="info-card warn">
          {rotting.length > 0 && <div>Spoils tonight: {rotting.map((f) => <span class="inline-f"><Fruit id={f} size={16} stage="notso" />×{pl.stock[f][0]}</span>)}</div>}
          {fine > 0 && <div>The inspector will fine you ${fine} tonight.</div>}
          {!!s.event?.ageExtra && <div>Heatwave: everything ages twice tonight.</div>}
        </div>
      )}
      {isDraftNight(s) && (
        <>
          <div class="pp-intro"><b>Stall specialities</b><span>After each Market Day you may build specialities: each one changes how your stall works. Cash spent is cash you can't win with: {left} day{left === 1 ? '' : 's'} left to earn it back.</span></div>
          <div class="upgrade-grid">
            {(pl.upgradeOffer ?? (Object.keys(UPGRADES) as UpgradeId[]).filter((u) => !pl.upgrades.includes(u))).map((u) => {
              const d = UPGRADES[u];
              const owned = pl.upgrades.includes(u);
              const why = canUpgrade(s, p, u);
              return (
                <div class={`up-card ${owned ? 'owned' : ''}`}>
                  <Icon name={UP_ICON[u]} size={40} />
                  <b>{d.title}</b>
                  <span class="up-text">{d.text}</span>
                  {owned ? <span class="up-owned">Built</span> : (
                    <button type="button" class="btn up-buy" disabled={!!why} title={why ?? ''} onClick={() => onUpgrade(u)}>Build ${d.cost}</button>
                  )}
                </div>
              );
            })}
          </div>
          {pl.upgrades.length > 0 && <div class="owned-row">Built: {pl.upgrades.map((u) => <span class="chip"><Icon name={UP_ICON[u]} size={16} /> {UPGRADES[u].title}</span>)}</div>}
        </>
      )}
      {pl.favours.length > 0 && <div class="pp-intro"><b>Up your sleeve</b><span>Favour cards you can play.</span></div>}
      <FavourRow s={s} p={p} phase="evening" onCard={onCard} />
      {s.players.length > 1 && <div class="whisper"><b class="psst">Psst…</b> the rivals are plotting tonight too.</div>}
    </div>
  );
}

export { Coin };
