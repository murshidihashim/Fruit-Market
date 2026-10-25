// The visual table: farmers market in the centre, a stall for each player around it,
// customers queueing at the top. data-a attributes are animation anchors (see anim.ts).
import { FAVOURS, FRUIT, FRUITS, UPGRADES, stageAt, type FruitId } from '../engine/data';
import {
  buyLimit, count, effectiveMax, marketCost, shelfSize, walkInsToday,
  type Customer, type GameState,
} from '../engine/game';
import { Coin, Fruit } from './art';

export function Pile({ f, n, pos, size = 20 }: { f: FruitId; n: number; pos: number; size?: number }) {
  if (n <= 0) return null;
  const stage = stageAt(f, pos);
  const shown = Math.min(n, 3);
  return (
    <span class={`pile p${shown}`}>
      {Array.from({ length: shown }, (_, i) => (
        <span class="pi" style={{ '--i': i } as any}><Fruit id={f} size={size} stage={stage} /></span>
      ))}
      {n > 1 && <b class="pn">{n}</b>}
    </span>
  );
}

// ---------- market ----------

export function Market({ s, onPick, canPick, morning }: {
  s: GameState; onPick?: (f: FruitId, pos: number) => void; canPick?: (f: FruitId, pos: number) => boolean; morning?: boolean;
}) {
  return (
    <div class="market-stall">
      <div class="mk-roof" />
      <div class="mk-head">
        <span class={`truck ${morning ? 'drive' : ''}`} data-a="truck">🚚</span>
        <b>Farmers Market</b>
        {!!s.event?.cost && <span class={`chip ${s.event.cost > 0 ? 'warn' : 'good'}`}>{s.event.cost > 0 ? '+' : '−'}${Math.abs(s.event.cost)} each today</span>}
      </div>
      <div class="mk-rows">
        {FRUITS.map((f) => (
          <div class="mk-row">
            <span class="mk-crate"><Fruit id={f} size={22} /></span>
            <div class="mk-cells" style={{ gridTemplateColumns: `repeat(${s.market[f].length}, 1fr)` }}>
              {s.market[f].map((n, pos) => {
                const ok = !!onPick && n > 0 && (!canPick || canPick(f, pos));
                return (
                  <button type="button" class={`mk-cell st-${stageAt(f, pos)} ${ok ? 'pick' : ''} ${n ? 'has' : ''}`}
                    data-a={`m-${f}-${pos}`} disabled={!ok} onClick={() => ok && onPick!(f, pos)}
                    aria-label={`${FRUIT[f].name}, $${marketCost(s, f, pos)}, ${n} left`}>
                    <Pile f={f} n={n} pos={pos} size={18} />
                    <span class="price">${marketCost(s, f, pos)}</span>
                  </button>
                );
              })}
            </div>
          </div>
        ))}
      </div>
      <div class="mk-age"><span>spoils</span><i /><span>fresh</span></div>
    </div>
  );
}

// ---------- rivals ----------

export function RivalStall({ s, p, side, onOpen }: { s: GameState; p: number; side: 'top' | 'left' | 'right'; onOpen: () => void }) {
  const pl = s.players[p];
  const active = (s.phase === 'buy' || s.phase === 'evening') && s.order[s.turn] === p;
  const thinking = s.phase === 'bid' && s.bids[p] === null;
  return (
    <button type="button" class={`rival-stall ${side} ${active ? 'active' : ''}`} data-a={`p${p}`} onClick={onOpen}>
      <div class="rs-awning" />
      <div class="rs-who">
        <span class="rs-face">{pl.avatar}{active && <i class="busy">{s.phase === 'buy' ? '🛒' : '🔨'}</i>}{thinking && <i class="busy">💭</i>}</span>
        <span class="rs-name">{pl.name}</span>
        <span class="chip cash" data-a={`p${p}-cash`}><Coin size={12} />{pl.cash}</span>
      </div>
      <div class="rs-stock">
        {FRUITS.map((f) => {
          const n = count(pl.stock, f);
          return (
            <span class={`rs-f ${n ? '' : 'zero'}`} data-a={`p${p}-${f}`}>
              <Fruit id={f} size={side === 'top' ? 18 : 17} />{n}
            </span>
          );
        })}
      </div>
      {(pl.upgrades.length > 0 || pl.favours.length > 0) && (
        <div class="rs-extra">
          {pl.upgrades.map((u) => <span title={UPGRADES[u].title}>{UPGRADES[u].icon}</span>)}
          {pl.favours.length > 0 && <span class="cards">🃏{pl.favours.length}</span>}
        </div>
      )}
    </button>
  );
}

// ---------- your stall ----------

export function MyStall({ s, p, onCard, flashCards }: { s: GameState; p: number; onCard?: (i: number) => void; flashCards?: boolean }) {
  const pl = s.players[p];
  const active = (s.phase === 'buy' || s.phase === 'evening') && s.order[s.turn] === p;
  return (
    <div class={`my-stall ${active ? 'active' : ''}`} data-a={`p${p}`}>
      <div class="ms-awning" />
      <div class="ms-head">
        <span class="ms-face">{pl.avatar}</span>
        <b class="ms-name">{pl.name}</b>
        <span class="chip" title="Shelf space">🗃 {count(pl.stock)}/{shelfSize(pl)}</span>
        {s.phase === 'buy' && active && <span class="chip buys" title="Fruit bought today">🛒 {pl.boughtToday}/{buyLimit(pl)}</span>}
        <span class="spacer" />
        {pl.upgrades.map((u) => <span class="ms-up" title={UPGRADES[u].title}>{UPGRADES[u].icon}</span>)}
        <span class="chip cash big" data-a={`p${p}-cash`}><Coin size={16} />{pl.cash}</span>
      </div>
      <div class="ms-rows">
        {FRUITS.map((f) => (
          <div class="ms-row" data-a={`p${p}-${f}`}>
            <span class="ms-label"><Fruit id={f} size={18} /></span>
            <div class="ms-cells" style={{ gridTemplateColumns: `repeat(${pl.stock[f].length}, 1fr)` }}>
              {pl.stock[f].map((n, pos) => (
                <span class={`ms-cell st-${stageAt(f, pos)} ${n ? 'has' : ''} ${pos === 0 && n ? 'rotting' : ''}`} data-a={`p${p}-${f}-${pos}`}>
                  <span class="drop">{pos >= FRUIT[f].drop.length ? '🌱' : FRUIT[f].drop[pos] ? `−$${FRUIT[f].drop[pos]}` : ''}</span>
                  <Pile f={f} n={n} pos={pos} size={16} />
                </span>
              ))}
            </div>
          </div>
        ))}
      </div>
      {pl.favours.length > 0 && (
        <div class={`ms-cards ${flashCards ? 'glow' : ''}`}>
          {pl.favours.map((id, i) => {
            const usable = !!onCard && active && FAVOURS[id].when === s.phase;
            return (
              <button type="button" class={`fcard ${usable ? 'usable' : ''}`} onClick={() => onCard?.(i)} title={FAVOURS[id].text}>
                <span>{FAVOURS[id].icon}</span><small>{FAVOURS[id].title}</small>
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}

// ---------- customers ----------

const FACES = ['👩', '👨', '👵', '👴', '🧑', '👩‍🦱', '👨‍🦱', '🧔', '👱‍♀️', '👨‍🦳', '🧕', '👩‍🦰', '🧑‍🦲', '👱'];
export function face(name: string) {
  let h = 0;
  for (const ch of name) h = (h * 31 + ch.charCodeAt(0)) >>> 0;
  return FACES[h % FACES.length];
}

type Kind = 'waiting' | 'new' | 'today' | 'tomorrow' | 'mystery';

export function CustomerChar({ s, c, kind, onTip }: { s: GameState; c?: Customer | null; kind: Kind; onTip?: (c: Customer) => void }) {
  if (kind === 'mystery' || !c) {
    return (
      <div class="cust mystery">
        <div class="bubble"><span class="q">?</span></div>
        <div class="cface">👤</div>
        <small>walk-in</small>
      </div>
    );
  }
  const done = c.wants.every((w) => w.qty <= 0);
  const special = c.name === s.event?.extra?.name;
  return (
    <div class={`cust ${kind} ${done ? 'happy' : ''} ${special ? 'special' : ''}`} data-a={c.id > 0 ? `c${c.id}` : undefined}
      onClick={(e) => { e.stopPropagation(); onTip?.(c); }}
      title={c.wants.map((w) => `${FRUIT[w.fruit].name}: wants ${w.qty}, pays up to $${effectiveMax(s, w)} each when fresh`).join('\n')}>
      <div class="bubble">
        {c.wants.map((w) => (
          <span class={`bw ${w.qty <= 0 ? 'done' : ''}`} data-a={`c${c.id}-${w.fruit}`}>
            <Fruit id={w.fruit} size={18} />
            <b>{w.qty <= 0 ? '✓' : `×${w.qty}`}</b>
            <span class={`bp ${effectiveMax(s, w) > w.max ? 'up' : effectiveMax(s, w) < w.max ? 'down' : ''}`}>${effectiveMax(s, w)}<small>/ea</small></span>
          </span>
        ))}
      </div>
      <div class="cface">{done ? '😊' : special ? s.event!.icon : face(c.name)}{kind === 'waiting' && <i class="clock">⏳</i>}{special && <i class="star">⭐</i>}</div>
      <small>{kind === 'tomorrow' ? 'tomorrow' : c.name}</small>
    </div>
  );
}

export function Street({ s, onTip }: { s: GameState; onTip?: (c: Customer) => void }) {
  const before = s.phase === 'morning' || s.phase === 'buy';
  const extra = s.event?.extra;
  return (
    <div class="street">
      {s.secondMarket.map((c) => <CustomerChar key={c.id} s={s} c={c} kind="waiting" onTip={onTip} />)}
      {s.firstMarket.map((c) => <CustomerChar key={c.id} s={s} c={c} kind="new" onTip={onTip} />)}
      {before && <CustomerChar key={s.forecast?.id} s={s} c={s.forecast} kind="today" onTip={onTip} />}
      {before && extra && <CustomerChar key="extra" s={s} c={{ id: -1, name: extra.name, wants: extra.wants, original: extra.wants }} kind="today" onTip={onTip} />}
      {before && Array.from({ length: walkInsToday(s) }, (_, i) => <CustomerChar key={`m${i}`} s={s} kind="mystery" />)}
      {!before && s.forecast && s.phase !== 'over' && <CustomerChar key={s.forecast.id} s={s} c={s.forecast} kind="tomorrow" onTip={onTip} />}
    </div>
  );
}

/** Where each rival sits around the market, from the viewer's point of view. */
export function seats(n: number, viewer: number): { p: number; side: 'top' | 'left' | 'right' }[] {
  const others = Array.from({ length: n - 1 }, (_, i) => (viewer + 1 + i) % n);
  const sides: ('top' | 'left' | 'right')[] = others.length === 1 ? ['top'] : others.length === 2 ? ['left', 'right'] : ['left', 'top', 'right'];
  return others.map((p, i) => ({ p, side: sides[i] }));
}
