// The decision area: one dark panel whose cards change with the phase.
// Buying → fruit cards. Pricing → price cards. Evening → upgrade cards. Inventory opens on tap.
import { useMemo, useState } from 'preact/hooks';
import { planBids } from '../engine/ai';
import { FAVOURS, FRUIT, FRUITS, UPGRADES, stageAt, type FavourId, type FruitId, type Stage, type UpgradeId } from '../engine/data';
import {
  allocate, bestCap, canBuy, canPlayFavour, canUpgrade, count, effectiveMax, marketCost, minPrice, notSoCount,
  servingCustomers, shelfSize, validateBids, walkInsToday, type Bid, type GameState,
} from '../engine/game';
import { Coin, Face, Fruit } from './art';
import { Track, TrackLegend } from './board';
import { Icon } from './pixel';

const STAGE_NAME: Record<Stage, string> = { fresh: 'Fresh', okay: 'Okay', notso: 'Old', unripe: 'Unripe' };

// ---------- demand per fruit ----------

export function demandFor(s: GameState, f: FruitId) {
  const before = s.phase === 'morning' || s.phase === 'buy';
  const custs = [...servingCustomers(s), ...(before && s.forecast ? [s.forecast] : [])];
  let qty = 0;
  let top = 0;
  for (const c of custs) for (const w of c.wants) if (w.fruit === f && w.qty > 0) { qty += w.qty; top = Math.max(top, effectiveMax(s, w)); }
  if (before) for (const w of s.event?.extra?.wants ?? []) if (w.fruit === f) { qty += w.qty; top = Math.max(top, effectiveMax(s, w)); }
  const shops = s.players.reduce((a, p) => a + count(p.stock, f, true), 0);
  return { qty, top, more: before && walkInsToday(s) > 0, shops };
}

// ---------- buying ----------

interface Tier { stage: Stage; pos: number; n: number; cost: number }

function tiers(s: GameState, f: FruitId): Tier[] {
  const by = new Map<Stage, Tier>();
  s.market[f].forEach((n, pos) => {
    if (!n) return;
    const stage = stageAt(f, pos);
    const t = by.get(stage);
    // Ripe fruit: offer the freshest spot of that stage. Unripe: the one that ripens soonest.
    if (!t) by.set(stage, { stage, pos, n, cost: marketCost(s, f, pos) });
    else {
      t.n += n;
      if (stage === 'unripe' ? pos < t.pos : pos > t.pos) { t.pos = pos; t.cost = marketCost(s, f, pos); }
    }
  });
  const order: Stage[] = ['fresh', 'okay', 'notso', 'unripe'];
  return order.map((st) => by.get(st)).filter(Boolean) as Tier[];
}

export function BuyCards({ s, p, myTurn, free = false, onBuy }: { s: GameState; p: number; myTurn: boolean; free?: boolean; onBuy: (f: FruitId, pos: number) => void }) {
  return (
    <div class="fruit-grid">
      {FRUITS.map((f) => {
        const d = demandFor(s, f);
        const ts = tiers(s, f);
        const mine = count(s.players[p].stock, f);
        return (
          <div class={`fcard-big ${ts.length ? '' : 'empty'}`} data-a={`mk-${f}`}>
            <div class="fc-head">
              <Fruit id={f} size={44} />
              <div class="fc-title">
                <b>{FRUIT[f].name}</b>
                <span class="fc-life">{FRUIT[f].ripe.length}-day life</span>
              </div>
              {mine > 0 && <span class="fc-mine" title="In your stall">{mine}</span>}
            </div>
            <div class="fc-demand">
              {d.qty > 0 ? <><b>{d.qty}{d.more ? '+' : ''}</b> wanted · up to <b>${d.top}</b></> : <span class="dim">No orders yet{d.more ? ' (walk-ins coming)' : ''}</span>}
            </div>
            <div class="fc-tiers">
              {ts.length === 0 && <span class="dim">Sold out</span>}
              {ts.map((t) => {
                const why = canBuy(s, p, f, t.pos);
                return (
                  <button type="button" class={`tier st-${t.stage}`} data-a={`m-${f}-${t.pos}`} disabled={!myTurn || (!free && !!why)}
                    title={why ?? `Buy one ${STAGE_NAME[t.stage].toLowerCase()} ${FRUIT[f].name.toLowerCase()}`} onClick={() => onBuy(f, t.pos)}>
                    <span class="t-stage">{STAGE_NAME[t.stage]}</span>
                    <span class="t-cost">${t.cost}</span>
                    <span class="t-n">×{t.n}</span>
                  </button>
                );
              })}
            </div>
          </div>
        );
      })}
    </div>
  );
}

// ---------- inventory ----------

/** Every stall at a glance: your stock and your rivals', fruit by fruit, with freshness. Tap a row for the full shelf. */
export function StallsBoard({ s, viewer, active, onOpen }: { s: GameState; viewer: number; active: number; onOpen: (p: number) => void }) {
  const order = [viewer, ...s.players.map((_, i) => i).filter((i) => i !== viewer)];
  return (
    <div class="stalls" role="table" aria-label="Every stall's stock">
      <div class="st-head" role="row">
        <span class="st-who st-title">Stalls</span>
        {FRUITS.map((f) => {
          const d = demandFor(s, f);
          return (
            <span class="st-col" title={`${FRUIT[f].name}: ${d.qty} wanted, ${d.shops} in shops`}>
              <Fruit id={f} size={16} />
              <small><b class={d.qty > d.shops ? 'short' : ''}>{d.qty ? `${d.qty}${d.more ? '+' : ''}` : d.more ? '?' : '0'}</b> want · {d.shops} in</small>
            </span>
          );
        })}
      </div>
      {order.map((p) => {
        const pl = s.players[p];
        const me = p === viewer;
        return (
          <button type="button" role="row" class={`st-row ${me ? 'me' : ''} ${p === active ? 'turn' : ''}`} onClick={() => onOpen(p)}
            aria-label={`${me ? 'Your' : `${pl.name}'s`} stall`}>
            <span class="st-who">
              <Face who={pl.avatar} size={24} />
              <span class="st-name"><b>{me ? 'You' : pl.name}</b><small><Icon name="crate" size={10} /> {count(pl.stock)}/{shelfSize(pl)}</small></span>
            </span>
            {FRUITS.map((f) => {
              const units: Stage[] = [];
              pl.stock[f].forEach((n, pos) => { for (let i = 0; i < n; i++) units.push(stageAt(f, pos)); });
              units.reverse();
              const rotting = pl.stock[f][0] > 0;
              return (
                <span class={`st-cell ${units.length ? '' : 'none'} ${rotting ? 'rot' : ''}`} data-a={`p${p}-${f}`}>
                  <b>{units.length}</b>
                  <span class="st-pips">{units.slice(0, 5).map((st) => <i class={`st-${st}`} />)}{units.length > 5 && <em>+</em>}</span>
                </span>
              );
            })}
          </button>
        );
      })}
    </div>
  );
}

export function InventorySheet({ s, p, onClose }: { s: GameState; p: number; onClose: () => void }) {
  const pl = s.players[p];
  return (
    <div class="modal-bg" onClick={onClose}>
      <div class="modal sheet" onClick={(e) => e.stopPropagation()}>
        <h2>{p === 0 || pl.kind === 'human' ? 'Stall' : `${pl.name}'s stall`}: {pl.name}</h2>
        <p class="small">Fruit moves one space left each night and spoils off the end. The −$ shows how much less a customer pays at that age.</p>
        {FRUITS.map((f) => <Track f={f} stock={pl.stock} />)}
        <TrackLegend />
        <div class="sheet-row">
          <span class="chip"><Icon name="crate" size={14} /> {count(pl.stock)} on shelf</span>
          <span class="chip cash"><Coin /> {pl.cash}</span>
          {pl.upgrades.map((u) => <span class="chip">{UPGRADES[u].title}</span>)}
        </div>
        <button class="btn wide" onClick={onClose}>Close</button>
      </div>
    </div>
  );
}

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
            <span class="fv-icon">{d.icon}</span>
            <span class="fv-name">{d.title}</span>
          </button>
        );
      })}
    </div>
  );
}

// ---------- pricing ----------

const key = (cid: number, f: FruitId) => `${cid}:${f}`;

export function PricePanel({ s, p, onSubmit }: { s: GameState; p: number; onSubmit: (bids: Bid[], favoured: boolean) => void }) {
  const pl = s.players[p];
  const lines = useMemo(() => servingCustomers(s).flatMap((c) => c.wants.filter((w) => w.qty > 0).map((w) => ({ c, w, max: effectiveMax(s, w) }))), [s]);
  const [vals, setVals] = useState<Record<string, { qty: number; price: number }>>(() => {
    const plan = planBids(s, p).bids;
    const out: Record<string, { qty: number; price: number }> = {};
    for (const { c, w, max } of lines) {
      const b = plan.find((x) => x.customerId === c.id && x.fruit === w.fruit);
      const cap = bestCap(pl.stock, w.fruit, max);
      out[key(c.id, w.fruit)] = b ? { qty: b.qty, price: b.price } : { qty: 0, price: Math.max(minPrice(s, w.fruit), cap || max) };
    }
    return out;
  });
  const [favoured, setFavoured] = useState(false);
  const bids: Bid[] = lines.map(({ c, w }) => ({ customerId: c.id, fruit: w.fruit, ...vals[key(c.id, w.fruit)] }));
  const error = validateBids(s, p, bids);
  const set = (k: string, patch: Partial<{ qty: number; price: number }>) => setVals((v) => ({ ...v, [k]: { ...v[k], ...patch } }));
  const sellable = lines.filter(({ w }) => count(pl.stock, w.fruit, true) > 0);
  const others = lines.filter(({ w }) => count(pl.stock, w.fruit, true) === 0);
  const total = bids.reduce((a, b) => a + b.qty * b.price, 0);

  return (
    <div class="price-panel">
      <div class="pp-intro"><b>Set secret prices</b><span>Per fruit. Cheapest sells first; fresher fruit wins ties.</span></div>
      {sellable.length === 0 && <div class="info-card dim">You have nothing today's customers want.</div>}
      {sellable.map(({ c, w, max }) => {
        const k = key(c.id, w.fruit);
        const v = vals[k];
        const f = w.fruit;
        const have = count(pl.stock, f, true);
        const cap = bestCap(pl.stock, f, max);
        const floor = minPrice(s, f);
        const top = Math.min(w.qty, have);
        const used = v.qty ? allocate(pl.stock, f, v.qty, v.price, max) : null;
        const rivalCaps = s.players.map((o, i) => ({ o, cap: i === p ? 0 : bestCap(o.stock, f, max), n: i === p ? 0 : count(o.stock, f, true) })).filter((r) => r.n > 0 && r.cap > 0);
        const rivals = rivalCaps.reduce((a, r) => a + r.n, 0);
        const demand = lines.filter((l) => l.w.fruit === f).reduce((a, l) => a + l.w.qty, 0);
        const read = rivals === 0 ? { cls: 'safe', t: 'No rival has any' }
          : rivals + have <= demand ? { cls: 'ok', t: `Enough buyers for everyone (${rivals + have} for ${demand})` }
            : { cls: 'war', t: `${rivals} rival ${rivals === 1 ? 'fruit' : 'fruits'} chasing ${demand}` };
        return (
          <div class={`price-card ${v.qty ? 'on' : ''}`}>
            <div class="pc-top">
              <Face who={c.name} size={36} />
              <div class="pc-who"><b>{c.name}</b><span>wants {w.qty} · pays up to <b>${max}</b></span></div>
              <Fruit id={f} size={40} />
            </div>
            <div class="pc-row">
              <div class="pc-qty">
                <span class="pc-lbl">Sell</span>
                <div class="qty-tokens">
                  {Array.from({ length: top }, (_, i) => {
                    const pos = used?.[i];
                    return (
                      <button type="button" class={`qt ${i < v.qty ? 'sel' : ''}`} aria-label={`Sell ${i + 1}`} onClick={() => set(k, { qty: i + 1 === v.qty ? i : i + 1 })}>
                        <Fruit id={f} size={26} stage={pos !== undefined ? stageAt(f, pos) : 'fresh'} />
                      </button>
                    );
                  })}
                </div>
              </div>
              <div class={`pc-price ${v.qty ? '' : 'off'}`}>
                <button type="button" aria-label="Lower price" disabled={!v.qty || v.price <= floor} onClick={() => set(k, { price: v.price - 1 })}>−</button>
                <span class="pc-num">${v.price}</span>
                <button type="button" aria-label="Raise price" disabled={!v.qty || v.price >= cap} onClick={() => set(k, { price: v.price + 1 })}>+</button>
              </div>
            </div>
            <div class="pc-foot">
              <span class={`read ${read.cls}`}>{read.t}</span>
              {rivalCaps.length > 0 && (
                <span class="rival-caps">{rivalCaps.map((r) => <span title={`${r.o.name} can ask up to $${r.cap}`}><Face who={r.o.avatar} size={18} />≤${r.cap}</span>)}</span>
              )}
            </div>
          </div>
        );
      })}
      {others.length > 0 && (
        <div class="info-card dim small">
          Also wanted, but you have none: {others.map(({ c, w }) => `${w.qty} ${FRUIT[w.fruit].name.toLowerCase()} for ${c.name}`).join(', ')}.
        </div>
      )}
      {pl.favours.includes('favouredTrade') && !pl.favouredTrade && sellable.length > 0 && (
        <button type="button" class={`favour-card wide ${favoured ? 'on' : 'ready'}`} onClick={() => setFavoured(!favoured)}>
          <span class="fv-icon">🤝</span><span class="fv-name">{favoured ? 'Favoured Trade on: you win ties today' : 'Play Favoured Trade?'}</span>
        </button>
      )}
      <div class="pp-lock">
        {error && <div class="error">{error}</div>}
        <button class="btn primary big wide" disabled={!!error} onClick={() => onSubmit(bids.filter((b) => b.qty > 0), favoured)}>
          {bids.some((b) => b.qty > 0) ? <>Lock in prices <small class="btn-sub">up to ${total}</small></> : 'Sell nothing today'}
        </button>
      </div>
    </div>
  );
}

// ---------- evening ----------

const UP_ICON: Record<UpgradeId, 'shelf' | 'handcart' | 'coolroom' | 'signboard'> = { shelf: 'shelf', cart: 'handcart', coolroom: 'coolroom', signboard: 'signboard' };

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
      {s.config.upgrades && (
        <>
          <div class="pp-intro"><b>Upgrade your stall</b><span>Cash spent is cash you can't win with. {left} day{left === 1 ? '' : 's'} left to earn it back.</span></div>
          <div class="upgrade-grid">
            {(Object.keys(UPGRADES) as UpgradeId[]).map((u) => {
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
        </>
      )}
      <FavourRow s={s} p={p} phase="evening" onCard={onCard} />
    </div>
  );
}

export { Coin };
