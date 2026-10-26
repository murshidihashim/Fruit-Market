// Board pieces: fruit tracks, the farmers market, shops, customers.
import { FAVOURS, FRUIT, FRUITS, UPGRADES, stageAt, type FruitId, type Stage } from '../engine/data';
import {
  buyLimit, count, effectiveMax, marketCost, shelfSize,
  type Customer, type GameState, type Player, type Stock,
} from '../engine/game';
import { Coin, Face, FavourIcon, Fruit } from './art';

export const STAGE_LABEL: Record<Stage, string> = { fresh: 'Fresh', okay: 'Okay', notso: 'Not so', unripe: 'Unripe' };

interface TrackProps {
  f: FruitId;
  stock: Stock;
  costs?: (pos: number) => number;
  onPick?: (pos: number) => void;
  canPick?: (pos: number) => boolean;
  compact?: boolean;
  flash?: string;
}

export function Track({ f, stock, costs, onPick, canPick, compact, flash }: TrackProps) {
  const cells = stock[f];
  return (
    <div class={`track ${compact ? 'compact' : ''}`}>
      <div class="track-label">
        <Fruit id={f} size={compact ? 20 : 26} />
        {!compact && <span>{FRUIT[f].name}</span>}
      </div>
      <div class="cells" style={{ gridTemplateColumns: `repeat(${cells.length}, 1fr)` }}>
        {cells.map((n, pos) => {
          const stage = stageAt(f, pos);
          const pickable = !!onPick && n > 0 && (!canPick || canPick(pos));
          return (
            <button
              type="button"
              class={`cell st-${stage} ${n ? 'has' : ''} ${pickable ? 'pick' : ''} ${flash === `${f}:${pos}` ? 'flash' : ''} ${pos === 0 && n ? 'rotting' : ''}`}
              disabled={!pickable}
              onClick={() => pickable && onPick!(pos)}
              aria-label={`${STAGE_LABEL[stage]} ${FRUIT[f].name}: ${n}`}
            >
              {n > 0 && (
                <span class="n">
                  {!compact && <Fruit id={f} size={16} stage={stage} />}
                  {n}
                </span>
              )}
              {costs && !compact && <span class="cost">${costs(pos)}</span>}
            </button>
          );
        })}
      </div>
    </div>
  );
}

export function TrackLegend() {
  return (
    <div class="legend">
      <span><i class="st-notso" />Not so</span>
      <span><i class="st-okay" />Okay</span>
      <span><i class="st-fresh" />Fresh</span>
      <span><i class="st-unripe" />Unripe</span>
      <span class="legend-arrow">← ages each night</span>
    </div>
  );
}

export function MarketBoard({ s, onPick, canPick, flash }: { s: GameState; onPick?: (f: FruitId, pos: number) => void; canPick?: (f: FruitId, pos: number) => boolean; flash?: string }) {
  return (
    <section class="panel market">
      <h3>🧺 Farmers Market {s.event?.id === 'priceHike' && <span class="chip warn">+$1 today</span>}</h3>
      {FRUITS.map((f) => (
        <Track key={f} f={f} stock={s.market} costs={(pos) => marketCost(s, f, pos)}
          onPick={onPick && ((pos) => onPick(f, pos))} canPick={canPick && ((pos) => canPick(f, pos))} flash={flash} />
      ))}
      <TrackLegend />
    </section>
  );
}

export function ShopPanel({ s, p, title, children, flash }: { s: GameState; p: number; title?: string; children?: any; flash?: string }) {
  const pl = s.players[p];
  return (
    <section class="panel shop">
      <h3>
        <span class="avatar sm"><Face who={pl.avatar} size={26} /></span> {title ?? `${pl.name}'s Shop`}
        <span class="spacer" />
        <span class="chip">🗃 {count(pl.stock)}/{shelfSize(pl)}</span>
        {s.phase === 'buy' && <span class="chip">🛍 {pl.boughtToday}/{buyLimit(pl)}</span>}
        <span class="chip cash"><Coin />{pl.cash}</span>
      </h3>
      {FRUITS.map((f) => <Track key={f} f={f} stock={pl.stock} flash={flash} />)}
      {(pl.upgrades.length > 0) && (
        <div class="upgrades-row">{pl.upgrades.map((u) => <span class="chip" title={UPGRADES[u].text}>{UPGRADES[u].icon} {UPGRADES[u].title}</span>)}</div>
      )}
      {children}
    </section>
  );
}

export function FavourChip({ id, onClick, disabled }: { id: keyof typeof FAVOURS; onClick?: () => void; disabled?: boolean }) {
  const d = FAVOURS[id];
  return (
    <button type="button" class="favour" onClick={onClick} disabled={disabled || !onClick}>
      <span class="fi"><FavourIcon id={d.id} size={28} /></span>
      <span class="ft"><b>{d.title}</b><small>{d.text}</small></span>
    </button>
  );
}

export function RivalStrip({ s, viewer, onOpen }: { s: GameState; viewer: number; onOpen: (p: number) => void }) {
  return (
    <div class="rivals">
      {s.players.map((pl, i) => i === viewer ? null : (
        <button type="button" class={`rival ${s.order[s.turn] === i && (s.phase === 'buy' || s.phase === 'evening') ? 'active' : ''}`} onClick={() => onOpen(i)}>
          <div class="rival-top">
            <span class="avatar sm"><Face who={pl.avatar} size={26} /></span>
            <b>{pl.name}</b>
            <span class="chip cash"><Coin size={13} />{pl.cash}</span>
          </div>
          <div class="rival-stock">
            {FRUITS.map((f) => {
              const n = count(pl.stock, f);
              return <span class={n ? '' : 'zero'}><Fruit id={f} size={14} />{n}</span>;
            })}
            {pl.favours.length > 0 && <span title="Favour cards">🃏{pl.favours.length}</span>}
            {pl.upgrades.map((u) => <span title={UPGRADES[u].title}>{UPGRADES[u].icon}</span>)}
          </div>
        </button>
      ))}
    </div>
  );
}

export function initials(name: string) {
  return name.split(' ').map((w) => w[0]).join('').slice(0, 2).toUpperCase();
}

const HUES = [12, 200, 140, 280, 35, 330, 170, 60];
function hue(name: string) {
  let h = 0;
  for (const ch of name) h = (h * 31 + ch.charCodeAt(0)) >>> 0;
  return HUES[h % HUES.length];
}

export function CustomerCard({ s, c, tag, tagClass, mystery }: { s: GameState; c?: Customer | null; tag: string; tagClass?: string; mystery?: boolean }) {
  if (mystery || !c) {
    return (
      <div class="customer mystery">
        <span class={`tag ${tagClass ?? ''}`}>{tag}</span>
        <div class="cust-face q">?</div>
        <div class="cust-name">Walk-in</div>
        <div class="cust-note">Revealed after buying</div>
      </div>
    );
  }
  return (
    <div class="customer">
      <span class={`tag ${tagClass ?? ''}`}>{tag}</span>
      <div class="cust-face" style={{ background: `hsl(${hue(c.name)} 70% 85%)`, color: `hsl(${hue(c.name)} 60% 30%)` }}>{initials(c.name)}</div>
      <div class="cust-name">{c.name}</div>
      <div class="wants">
        {c.wants.map((w, i) => {
          const orig = c.original[i];
          const max = effectiveMax(s, w);
          return (
            <div class={`want ${w.qty <= 0 ? 'done' : ''}`}>
              <Fruit id={w.fruit} size={20} />
              <span class="q">{w.qty <= 0 ? '✓' : `×${w.qty}`}{orig && orig.qty !== w.qty && <s>{orig.qty}</s>}</span>
              <span class={`max ${max !== w.max ? (max > w.max ? 'up' : 'down') : ''}`}>≤${max}</span>
            </div>
          );
        })}
      </div>
    </div>
  );
}

export function CustomerRow({ s }: { s: GameState }) {
  const buying = s.phase === 'buy' || s.phase === 'morning';
  return (
    <section class="customers">
      {s.secondMarket.map((c) => <CustomerCard s={s} c={c} tag="Waiting · last day" tagClass="hot" />)}
      {s.firstMarket.map((c) => <CustomerCard s={s} c={c} tag="New today" tagClass="new" />)}
      {buying && <CustomerCard s={s} c={s.forecast} tag="Arriving today" tagClass="new" />}
      {buying && s.event?.id !== 'rainy' && <CustomerCard s={s} tag="Arriving today" tagClass="new" mystery />}
      {!buying && s.forecast && <CustomerCard s={s} c={s.forecast} tag="Tomorrow" tagClass="soon" />}
    </section>
  );
}

export function PlayerHand({ pl, phase, onPlay }: { pl: Player; phase: string; onPlay?: (idx: number) => void }) {
  if (!pl.favours.length) return null;
  return (
    <div class="hand">
      <div class="hand-title">Your favour cards</div>
      {pl.favours.map((id, i) => (
        <FavourChip id={id} onClick={onPlay && FAVOURS[id].when === phase ? () => onPlay(i) : undefined} />
      ))}
    </div>
  );
}
