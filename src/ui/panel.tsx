// Decision panels: price cards for setting secret prices and upgrade cards for the evening.
// (A rival's stall opens below their seat; see RivalDrop in table.tsx.)
import { useEffect, useState } from 'preact/hooks';
import { believe, planPrices } from '../engine/ai';
import { FAVOURS, FRUIT, FRUITS, UPGRADES, stageAt, type FavourId, type FruitId, type Stage, type TraitId, type UpgradeId } from '../engine/data';
import {
  canPlayFavour, canUpgrade, count, crateCounts, forSale, isDraftNight, maxPrice, minPrice, nightOutlook, shadePick,
  validatePrices, type Crate, type GameState, type Post, type Stall,
} from '../engine/game';
import { closingNote, heatwaveLine, tonightText } from '../engine/story';
import { Coin, FavourIcon, Fruit } from './art';
import { buyerCap, buyersAt, buyersFor, demandBoard, stallWanted, LANES } from './boardModel';
import { fruitSvgUrl } from './fruitIcons';
import { Lamp, STAGE_WORD, Swatch } from './ticket';
import { Icon, type IconName } from './icons';
import { PricingTableView } from './game/panels/PricingTable';

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

/**
 * Step 1 of selling (rules 12, PLAN-060; drawn as rows in PLAN-072): fill your crate with the exact pieces you will
 * sell today. One row for every box of your shelf that holds fruit, with − and + beside it; each + sends that piece
 * flying into your crate. Everyone sees every crate once all stalls open.
 */
export function StallPanel({ s, p, onSubmit }: { s: GameState; p: number; onSubmit: (stall: Stall, crate: Crate) => void }) {
  const pl = s.players[p];
  const [crate, setCrate] = useState<Crate>(() => startingCrate(s, p));
  const step = (f: FruitId, pos: number, d: number, from?: Element | null) => {
    const have = pl.stock[f][pos] ?? 0;
    setCrate((c) => {
      const t = [...(c[f] ?? new Array(pl.stock[f].length).fill(0))];
      t[pos] = Math.max(0, Math.min(have, t[pos] + d));
      return { ...c, [f]: t };
    });
    if (d > 0 && from) flyToCrate(from, f, stageAt(f, pos));
  };
  return <StallPanelView s={s} p={p} crate={crate} onStep={step} onSubmit={() => onSubmit(crateCounts(crate), crate)} />;
}

/** Where filling your stall starts: nothing out (owner's choice, PLAN-061); you add each piece yourself. */
export function startingCrate(s: GameState, p: number): Crate {
  const pl = s.players[p];
  return Object.fromEntries(FRUITS.map((f) => [f, new Array<number>(pl.stock[f].length).fill(0)])) as Crate;
}

/** A piece of fruit flies from the shelf space into your crate (skipped when motion is reduced). */
function flyToCrate(from: Element, f: FruitId, stage: Stage) {
  const to = document.getElementById('my-crate');
  if (!to || typeof matchMedia === 'undefined' || matchMedia('(prefers-reduced-motion: reduce)').matches) return;
  const a = from.getBoundingClientRect(), b = to.getBoundingClientRect();
  const img = document.createElement('img');
  img.src = fruitSvgUrl(f, stage); img.alt = ''; img.className = 'fly-fruit';
  img.style.left = `${a.left + a.width / 2 - 12}px`; img.style.top = `${a.top + a.height / 2 - 12}px`;
  document.body.appendChild(img);
  const dx = b.left + b.width / 2 - (a.left + a.width / 2), dy = b.top + b.height / 2 - (a.top + a.height / 2);
  const anim = img.animate([
    { transform: 'translate(0, 0) scale(1)' },
    { transform: `translate(${dx / 2}px, ${dy / 2 - 70}px) scale(1.5)`, offset: 0.5 },
    { transform: `translate(${dx}px, ${dy}px) scale(0.8)` },
  ], { duration: 480, easing: 'cubic-bezier(.4,0,.3,1)' });
  anim.onfinish = () => img.remove();
}

/** The Stocking screen drawn from its state (no hooks, so tests can draw it). */
export function StallPanelView({ s, p, crate, onStep, onSubmit }: {
  s: GameState; p: number; crate: Crate; onStep: (f: FruitId, pos: number, d: number, from?: Element | null) => void; onSubmit: () => void;
}) {
  const pl = s.players[p];
  const counts = crateCounts(crate);
  const total = FRUITS.reduce((a, f) => a + (counts[f] ?? 0), 0);
  const ripe = count(pl.stock, undefined, true);
  // The final day: what leftovers are worth tonight (the jam maker, or $0 when Closing Day is off).
  const note = s.day >= s.config.days ? closingNote(s, p)?.stocking ?? null : null;
  // One row for every box of your shelf that holds fruit: the board's lane order, the freshest box first.
  const rows = LANES.flatMap((f) => pl.stock[f].map((n, pos) => ({ f, pos, n, stage: stageAt(f, pos) })).filter((x) => x.n > 0).reverse());
  const pieces = LANES.flatMap((f) => (crate[f] ?? []).flatMap((n, pos) => Array.from({ length: n }, () => ({ f, stage: stageAt(f, pos) }))).reverse());
  return (
    <>
      <div class="price-panel stall-panel mid-panel tk-panel">
        {/* The heading and your crate stay in view while a long shelf scrolls under them. */}
        <div class="tk-stick">
          <div class="tk-label-row"><b class="tk-label">Fill your crate</b><span class="tk-side">{total} {total === 1 ? 'piece' : 'pieces'} out</span></div>
          <div class="tk-crate mine" id="my-crate" aria-label={`Your crate: ${total} out`}>
            <span class="tk-crate-name"><Swatch p={p} size={18} /><span>Your crate</span></span>
            <span class="tk-crate-items">
              {pieces.length ? pieces.map((x) => <span class={`crate-piece st-${x.stage}`}><Fruit id={x.f} size={20} stage={x.stage} /></span>) : <span class="tk-crate-none">empty</span>}
            </span>
          </div>
        </div>
        {note && <div class="tk-info warn">{note}</div>}
        {ripe === 0 && <div class="tk-info">You have no ripe fruit to sell today.</div>}
        <div class={`tk-rows ${rows.length > 3 ? 'many' : ''}`}>
          {rows.map(({ f, pos, n, stage }) => {
            const k = crate[f]?.[pos] ?? 0;
            const sell = stage !== 'unripe';
            const word = STAGE_WORD[stage];
            const drop = FRUIT[f].drop[pos] ?? 0;
            const wanted = stallWanted(s, p, f);
            return (
              <div class={`tk-row ${f} ${sell ? '' : 'off'} ${k ? 'in' : ''}`} aria-label={`${FRUIT[f].name}, ${word}: ${n} on your shelf${sell ? `, ${k} in your crate` : ''}`}>
                <div class="tk-row-info">
                  <Lamp stage={stage} size={20} /><Fruit id={f} size={26} stage={stage} />
                  <span class="tk-row-text"><b>{n} on shelf</b><small>{sell ? `${wanted} wanted${drop ? ` · sells $${drop} less` : ''}` : 'still green'}</small></span>
                </div>
                {sell && (
                  <span class="mini-step">
                    <button type="button" aria-label={`One less ${word} ${FRUIT[f].name.toLowerCase()}`} disabled={k <= 0} onClick={() => onStep(f, pos, -1)}>−</button>
                    <b><span>{k}</span><small>in crate</small></b>
                    <button type="button" aria-label={`One more ${word} ${FRUIT[f].name.toLowerCase()}`} disabled={k >= n} onClick={(e) => onStep(f, pos, 1, e.currentTarget.closest('.tk-row'))}>+</button>
                  </span>
                )}
              </div>
            );
          })}
        </div>
        {rows.length <= 3 && <p class="tk-note">Only the crate can sell today. Rivals will see how many pieces you put out, not which fruit, and never your price.</p>}
      </div>
      <div class="pp-lock">
        <button class="btn primary big wide tk-go" onClick={onSubmit}>{total ? <>Open my stall <small class="btn-sub">{total} out</small></> : 'Keep everything back'}</button>
      </div>
    </>
  );
}

// ---------- pricing ----------

/**
 * Step 2: one secret price per fruit you put out. The bell reveals every stall's prices at once.
 * Like the stall panel: compact rows in the middle of the table, the Seal button in the action bar's place.
 */
/** "The Bell" notice never opens by itself (owner, PLAN-064; it opened on Day 1 before): only from the i button. */
export const bellOpensOnStart = (_s: GameState): boolean => false;

/** Prices pre-filled from the planner for every fruit you put out. */
export function startingPrices(s: GameState, p: number): Record<string, number> {
  const plan = planPrices(s, p).posts;
  return Object.fromEntries(FRUITS.filter((f) => forSale(s, p, f) > 0).map((f) => [f, plan.find((b) => b.fruit === f)?.price ?? minPrice(s, f)]));
}

/** `waiting`: your stall is open and the rivals are still opening theirs (PLAN-065). The same panel stays on screen
 *  into pricing; the rivals' crates show what is in them as soon as pricing starts. */
export function PricePanel({ s, p, onSubmit, waiting }: { s: GameState; p: number; onSubmit: (posts: Post[]) => void; waiting?: boolean }) {
  const [vals, setVals] = useState<Record<string, number>>(() => startingPrices(s, p));
  // Prices are suggested once every stall is open (the planner then sees every crate).
  useEffect(() => { if (s.phase === 'bid') setVals(startingPrices(s, p)); }, [s.phase]);
  const [notice, setNotice] = useState(() => bellOpensOnStart(s));
  return (
    <PricePanelView s={s} p={p} vals={vals} notice={notice} waiting={waiting}
      onPrice={(f, price) => setVals((v) => ({ ...v, [f]: price }))}
      onNotice={setNotice} onSubmit={onSubmit} />
  );
}

/** The pricing screen drawn from its state (no hooks, so tests can draw it): every rival's crate, shut, with how many
 *  pieces it holds (rules 15), then one row per fruit you put out with its own − and + (PLAN-072). */
export function PricePanelView({ s, p, vals, notice, waiting, onPrice, onNotice, onSubmit }: {
  s: GameState; p: number; vals: Record<string, number>; notice: boolean; waiting?: boolean;
  onPrice: (f: FruitId, price: number) => void; onNotice: (open: boolean) => void;
  onSubmit: (posts: Post[]) => void;
}) {
  const pl = s.players[p];
  const fruits = LANES.filter((f) => forSale(s, p, f) > 0);
  const priceOf = (f: FruitId) => Math.min(vals[f], maxPrice(s, f));
  const posts: Post[] = FRUITS.filter((f) => fruits.includes(f)).map((f) => ({ fruit: f, price: priceOf(f) }));
  const error = validatePrices(s, p, posts);
  // Rules 15: the rivals' crates are shut, so "wanted" and "would buy" are worked out on the same guess the suggested
  // prices use (engine/ai believe: only how many pieces each rival put out), never on a rival's real crate.
  const b = believe(s, p, false);
  const board = demandBoard(b, p);
  return (
    <>
      <div class="price-panel mid-panel tk-panel">
        <div class="tk-label-row"><b class="tk-label">Rival crates · shut until the bell</b><button type="button" class="pp-info" aria-label="How the bell works" onClick={() => onNotice(true)}>i</button></div>
        <PricingTableView s={s} viewer={p} waiting={waiting} />
        {waiting ? <p class="pp-wait tk-note">Rivals are opening their stalls…</p> : (
          <>
            <div class="tk-label-row"><b class="tk-label">Your secret prices</b><span class="tk-side">One price per fruit</span></div>
            {fruits.length === 0 && <div class="tk-info">You put nothing out today.</div>}
            <div class={`tk-rows prices n${fruits.length}`}>
              {fruits.map((f) => {
                const price = priceOf(f);
                const lo = minPrice(s, f);
                const top = Math.max(0, ...buyersFor(b, f).map((x) => buyerCap(b, p, f, x).cap));
                const hi = Math.min(maxPrice(s, f), Math.max(1, top) + 2);
                const wanted = board.find((r) => r.f === f)?.wanted ?? 0;
                const buy = buyersAt(b, p, f, price);
                return (
                  <div class={`tk-row price ${f}`} role="group" aria-label={`Price for your ${FRUIT[f].plural.toLowerCase()}`}>
                    <div class="tk-row-info">
                      <Fruit id={f} size={30} />
                      <span class="tk-row-text"><b>{forSale(s, p, f)} out · {wanted} wanted</b><small>{top > 0 ? `${buy} buy at $${price} · top $${top}` : 'Nobody wants yours'}</small></span>
                    </div>
                    <span class="pbub tk-dial">
                      <button type="button" aria-label={`Lower the price of ${FRUIT[f].plural}`} disabled={price <= lo} onClick={() => onPrice(f, price - 1)}>−</button>
                      <span class="pc-num">${price}</span>
                      <button type="button" aria-label={`Raise the price of ${FRUIT[f].plural}`} disabled={price >= hi} onClick={() => onPrice(f, price + 1)}>+</button>
                    </span>
                  </div>
                );
              })}
            </div>
            {/* Rules 18: Favoured Trade is no longer played with the prices. A holder with a tied price is asked after the flip. */}
            {pl.favours.includes('favouredTrade') && fruits.length > 0 && <p class="tk-note">You hold Favoured Trade. If one of your prices ties at the bell, you will be asked whether to play it.</p>}
            {fruits.length > 0 && <p class="tk-note">You see how many pieces each rival put out, not which fruit: that shows at the bell. Cheapest stall sells first; okay fruit pays $1 less.</p>}
          </>
        )}
      </div>
      <div class="pp-lock">
        {!waiting && error && <div class="error">{error}</div>}
        {waiting
          ? <button class="btn primary big wide tk-go" disabled>Waiting for rivals…</button>
          : <button class="btn primary big wide tk-go" disabled={!!error} onClick={() => onSubmit(posts)}>Ring the bell <small class="btn-sub">seal {posts.length} {posts.length === 1 ? 'price' : 'prices'}</small></button>}
      </div>
      {notice && <BellNotice onClose={() => onNotice(false)} />}
    </>
  );
}

/** "The Bell" (PLAN-059): the market's notice of how the bell works, in the crier's words. */
export function BellNotice({ onClose }: { onClose: () => void }) {
  const lines: [IconName, string][] = [
    ['tag', 'Price every fruit you put out!'],
    ['hourglass', 'Prices stay secret until the bell.'],
    ['crate', 'Crates stay shut until the bell: you only see how many pieces.'],
    ['coin', 'Lowest price sells first!'],
    ['scales', 'A tie? Favoured Trade, then freshest fruit, then the Haggler, then the early bird.'],
    ['heart', 'Fulfil all of a customer’s orders to earn a favour card.'],
  ];
  return (
    <div class="bell-notice" role="dialog" aria-modal="true" aria-label="The Bell" onClick={onClose}>
      <div class="bn-card" onClick={(e) => e.stopPropagation()}>
        <i class="bn-pin l" /><i class="bn-pin r" />
        <span class="bn-ban">THE BELL</span>
        <ul class="bn-rules">
          {lines.map(([icon, text]) => <li><span class="bn-badge"><Icon name={icon} size={18} /></span>{text}</li>)}
        </ul>
        <button type="button" class="btn primary wide" onClick={onClose}>Ring the bell!</button>
      </div>
    </div>
  );
}

// ---------- evening ----------

export const UP_ICON: Record<UpgradeId, IconName> = { barrow: 'handcart', premium: 'signboard', juicebar: 'juicer', ripening: 'sun', orderbook: 'fv_favouredTrade' };
export const TRAIT_ICON: Record<TraitId, IconName> = { haggler: 'scales', basket: 'crate', bargain: 'tag', charmer: 'heart', favourite: 'star', nestegg: 'egg', keeper: 'moon', earful: 'ear' };

export function EveningPanel({ s, p, onUpgrade, onCard, onShade }: {
  s: GameState; p: number; onUpgrade: (u: UpgradeId) => void; onCard: (i: number) => void;
  /** Shade Cloth (rules 11): name the fruit that does not age tonight (null: none). */
  onShade?: (f: FruitId | null) => void;
}) {
  const pl = s.players[p];
  // Tonight follows the night's own rules (a Heatwave, a Monsoon, the Juice Bar): "3 spoil tonight, 2 become juice (+$4)".
  const night = nightOutlook(s, p);
  const tonight = tonightText(night);
  const heat = heatwaveLine(s, p);
  // Only juice money tonight is good news: the card turns green; anything spoiling or a Heatwave keeps it a warning.
  const good = night.spoil === 0 && !heat;
  const left = s.config.days - s.day;
  return (
    <div class="evening-panel">
      {(tonight || heat) && (
        <div class={`info-card ${good ? 'good' : 'warn'}`}>
          {tonight && <div>{tonight}</div>}
          {heat && <div>{heat}</div>}
        </div>
      )}
      {isDraftNight(s) && (
        <>
          <div class="pp-intro"><b>Stall upgrades</b><span>After each Market Day you may build one upgrade. Your stall has room for two. Cash spent is cash you can't win with: {left} day{left === 1 ? '' : 's'} left to earn it back.</span></div>
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
      {pl.trait === 'keeper' && onShade && <ShadePick s={s} p={p} onShade={onShade} />}
      {pl.favours.length > 0 && <div class="pp-intro"><b>Up your sleeve</b><span>Favour cards you can play.</span></div>}
      <FavourRow s={s} p={p} phase="evening" onCard={onCard} />
      {s.players.length > 1 && <div class="whisper"><b class="psst">Psst…</b> the rivals are plotting tonight too.</div>}
    </div>
  );
}

/** Shade Cloth: pick tonight's fruit. Until you choose, the suggested fruit (the one with most to lose) is used. */
function ShadePick({ s, p, onShade }: { s: GameState; p: number; onShade: (f: FruitId | null) => void }) {
  const pl = s.players[p];
  const chosen = pl.shade === undefined ? shadePick(s, p) : pl.shade;
  return (
    <>
      <div class="pp-intro"><b>Shade Cloth</b><span>Name one fruit: none of your pieces of it age tonight.{pl.shade === undefined && chosen ? ` Suggested: ${FRUIT[chosen].plural.toLowerCase()}.` : ''}</span></div>
      <div class="seg small shade-pick" role="radiogroup" aria-label="Fruit to keep from ageing tonight">
        {LANES.map((f) => (
          <button type="button" role="radio" aria-checked={chosen === f} class={chosen === f ? 'on' : ''} aria-label={FRUIT[f].plural} onClick={() => onShade(f)}><Fruit id={f} size={20} /></button>
        ))}
        <button type="button" role="radio" aria-checked={chosen === null} class={chosen === null ? 'on' : ''} onClick={() => onShade(null)}>None</button>
      </div>
    </>
  );
}

export { Coin };
