// Secret prices, shown as a slide-up tray: tap fruit to choose how many, nudge the price tag.
import { useMemo, useState } from 'preact/hooks';
import { stageAt, type FruitId } from '../engine/data';
import { planBids } from '../engine/ai';
import {
  allocate, bestCap, count, effectiveMax, minPrice, servingCustomers, validateBids,
  type Bid, type GameState,
} from '../engine/game';
import { Fruit } from './art';
import { face } from './table';

interface Props { s: GameState; p: number; onSubmit: (bids: Bid[], favoured: boolean) => void }

const key = (cid: number, f: FruitId) => `${cid}:${f}`;

export function BidSheet({ s, p, onSubmit }: Props) {
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

  return (
    <div class="tray">
      <div class="tray-head">
        <b>🤫 Secret prices</b>
        <span class="muted small">cheapest sells · fresher wins ties</span>
      </div>
      <div class="tray-body">
        {sellable.length === 0 && <div class="tray-empty">You have nothing these customers want today.</div>}
        {sellable.map(({ c, w, max }) => {
          const k = key(c.id, w.fruit);
          const v = vals[k];
          const f = w.fruit;
          const have = count(pl.stock, f, true);
          const cap = bestCap(pl.stock, f, max);
          const floor = minPrice(s, f);
          const top = Math.min(w.qty, have);
          const used = v.qty ? allocate(pl.stock, f, v.qty, v.price, max) : null;
          const rivals = s.players.reduce((a, o, i) => (i === p ? a : a + count(o.stock, f, true)), 0);
          return (
            <div class={`bid ${v.qty ? 'on' : ''}`}>
              <div class="bid-cust">
                <span class="bc-face">{face(c.name)}</span>
                <span class="bc-want"><Fruit id={f} size={16} />×{w.qty}</span>
                <span class="bc-max">≤${max}</span>
              </div>
              <div class="bid-fruits">
                {Array.from({ length: top }, (_, i) => {
                  const pos = used?.[i];
                  return (
                    <button type="button" class={`bf ${i < v.qty ? 'sel' : ''}`} onClick={() => set(k, { qty: i + 1 === v.qty ? i : i + 1 })}>
                      <Fruit id={f} size={26} stage={pos !== undefined ? stageAt(f, pos) : 'fresh'} />
                    </button>
                  );
                })}
                {rivals > 0 ? <span class="rivals-hint" title="Fruit rivals could sell">⚔️{rivals}</span> : <span class="rivals-hint none" title="No rival has any">✨</span>}
              </div>
              <div class={`pricetag ${v.qty ? '' : 'off'}`}>
                <button type="button" disabled={!v.qty || v.price <= floor} onClick={() => set(k, { price: v.price - 1 })}>−</button>
                <span class="pt">${v.price}</span>
                <button type="button" disabled={!v.qty || v.price >= cap} onClick={() => set(k, { price: v.price + 1 })}>+</button>
              </div>
            </div>
          );
        })}
        {others.length > 0 && (
          <div class="bid-none-row">
            {others.map(({ c, w }) => (
              <span class="nope"><span>{face(c.name)}</span><Fruit id={w.fruit} size={14} stage="notso" />×{w.qty}</span>
            ))}
            <small class="muted">you have none</small>
          </div>
        )}
        {pl.favours.includes('favouredTrade') && !pl.favouredTrade && sellable.length > 0 && (
          <button type="button" class={`fcard wide ${favoured ? 'usable on' : 'usable'}`} onClick={() => setFavoured(!favoured)}>
            <span>🤝</span><small>{favoured ? 'Favoured Trade: ON (win ties today)' : 'Play Favoured Trade?'}</small>
          </button>
        )}
      </div>
      <div class="tray-foot">
        {error && <div class="error">{error}</div>}
        <button class="btn primary big wide" disabled={!!error} onClick={() => onSubmit(bids.filter((b) => b.qty > 0), favoured)}>
          {bids.some((b) => b.qty > 0) ? '🔒 Lock in prices' : 'Sell nothing today'}
        </button>
      </div>
    </div>
  );
}

