// Secret offers for every customer line. Pre-filled with a suggestion the player can change.
import { useMemo, useState } from 'preact/hooks';
import { FRUIT, stageAt, type FruitId } from '../engine/data';
import { planBids } from '../engine/ai';
import {
  bestCap, capFor, count, effectiveMax, minPrice, servingCustomers, validateBids,
  type Bid, type GameState,
} from '../engine/game';
import { Fruit } from './art';
import { FavourChip } from './board';

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
  const offered: Partial<Record<FruitId, number>> = {};
  for (const b of bids) offered[b.fruit] = (offered[b.fruit] ?? 0) + b.qty;

  const set = (k: string, patch: Partial<{ qty: number; price: number }>) => setVals((v) => ({ ...v, [k]: { ...v[k], ...patch } }));

  if (lines.length === 0) {
    return (
      <div class="bid-sheet">
        <p class="empty">No customers today.</p>
        <button class="btn primary big" onClick={() => onSubmit([], false)}>Continue</button>
      </div>
    );
  }

  return (
    <div class="bid-sheet">
      <p class="hint">Set a secret price for each customer. <b>Cheapest wins</b>. On a tie, the fresher fruit wins. You can't charge more than the customer will pay for your fruit's freshness.</p>
      {lines.map(({ c, w, max }) => {
        const k = key(c.id, w.fruit);
        const v = vals[k];
        const f = w.fruit;
        const have = count(pl.stock, f, true);
        const cap = bestCap(pl.stock, f, max);
        const stages = FRUIT[f].ripe.map((_, i) => i).filter((i) => pl.stock[f][i] > 0);
        const rivals = s.players.filter((_, i) => i !== p).map((o) => count(o.stock, f, true)).filter((n) => n > 0);
        const floor = minPrice(s, f);
        return (
          <div class={`bid-line ${v.qty > 0 ? 'on' : ''}`}>
            <div class="bid-head">
              <Fruit id={f} size={30} />
              <div>
                <b>{c.name}</b> wants <b>{w.qty}</b> {w.qty === 1 ? FRUIT[f].name.toLowerCase() : FRUIT[f].plural.toLowerCase()}
                <div class="sub">Pays up to ${max} fresh{FRUIT[f].penalty.okay ? ` · $${max - FRUIT[f].penalty.okay} okay · $${max - FRUIT[f].penalty.notso} not so` : ''}</div>
              </div>
            </div>
            <div class="bid-info">
              <span>You have: {have ? stages.map((i) => <span class={`pill st-${stageAt(f, i)}`}>{pl.stock[f][i]} ≤${capFor(f, stageAt(f, i), max)}</span>) : <i>none</i>}</span>
              <span class={rivals.length ? 'warn-text' : 'ok-text'}>{rivals.length ? `⚔️ ${rivals.length} rival${rivals.length > 1 ? 's' : ''} hold ${rivals.reduce((a, b) => a + b, 0)}` : '✨ No rival has any'}</span>
            </div>
            {have > 0 && cap >= floor ? (
              <div class="bid-controls">
                <Stepper label="Sell" value={v.qty} min={0} max={Math.min(w.qty, have)} onChange={(q) => set(k, { qty: q })} />
                <Stepper label="Price $" value={v.price} min={floor} max={Math.max(floor, cap)} onChange={(pr) => set(k, { price: pr })} disabled={v.qty === 0} />
              </div>
            ) : (
              <div class="bid-none">{have ? `Your ${FRUIT[f].plural.toLowerCase()} are too old for the minimum price.` : `You have no ripe ${FRUIT[f].plural.toLowerCase()}.`}</div>
            )}
          </div>
        );
      })}
      {pl.favours.includes('favouredTrade') && !pl.favouredTrade && (
        <label class={`toggle-favour ${favoured ? 'on' : ''}`}>
          <input type="checkbox" checked={favoured} onChange={(e) => setFavoured((e.target as HTMLInputElement).checked)} />
          <FavourChip id="favouredTrade" /> <span>Play it now</span>
        </label>
      )}
      <div class="bid-footer">
        {error ? <div class="error">⚠️ {error}</div> : <div class="ok-text">Offering {Object.entries(offered).filter(([, n]) => n).map(([f, n]) => `${n} ${FRUIT[f as FruitId].name.toLowerCase()}`).join(', ') || 'nothing'}</div>}
        <button class="btn primary big" disabled={!!error} onClick={() => onSubmit(bids.filter((b) => b.qty > 0), favoured)}>🔒 Lock in offers</button>
      </div>
    </div>
  );
}

function Stepper({ label, value, min, max, onChange, disabled }: { label: string; value: number; min: number; max: number; onChange: (v: number) => void; disabled?: boolean }) {
  const clamp = (x: number) => Math.max(min, Math.min(max, x));
  return (
    <div class={`stepper ${disabled ? 'disabled' : ''}`}>
      <span class="st-label">{label}</span>
      <button type="button" disabled={disabled || value <= min} onClick={() => onChange(clamp(value - 1))}>−</button>
      <span class="st-val">{value}</span>
      <button type="button" disabled={disabled || value >= max} onClick={() => onChange(clamp(value + 1))}>+</button>
    </div>
  );
}
