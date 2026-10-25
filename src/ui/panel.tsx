// Decision panels: price cards for setting secret prices, upgrade cards for the evening,
// and the full stall sheet that opens when you tap a stall.
import { useMemo, useState } from 'preact/hooks';
import { planBids } from '../engine/ai';
import { FAVOURS, FRUIT, FRUITS, UPGRADES, stageAt, type FavourId, type FruitId, type TraitId, type UpgradeId } from '../engine/data';
import {
  allocate, bestCap, canPlayFavour, canUpgrade, count, effectiveMax, minPrice, notSoCount,
  servingCustomers, validateBids, type Bid, type GameState,
} from '../engine/game';
import { Coin, Face, Fruit } from './art';
import { Track, TrackLegend } from './board';
import { Icon } from './pixel';

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

export const UP_ICON: Record<UpgradeId, 'shelf' | 'handcart' | 'coolroom' | 'signboard' | 'juicer' | 'bell'> = { shelf: 'shelf', cart: 'handcart', coolroom: 'coolroom', signboard: 'signboard', juicer: 'juicer', bell: 'bell' };
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
      {s.config.upgrades && (
        <>
          <div class="pp-intro"><b>Tonight's upgrades</b><span>3 builders call by each evening. Cash spent is cash you can't win with: {left} day{left === 1 ? '' : 's'} left to earn it back.</span></div>
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
      <FavourRow s={s} p={p} phase="evening" onCard={onCard} />
    </div>
  );
}

export { Coin };
