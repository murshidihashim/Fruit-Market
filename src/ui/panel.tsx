// Decision panels: price cards for setting secret prices and upgrade cards for the evening.
// (A rival's stall opens below their seat; see RivalDrop in table.tsx.)
import { useState } from 'preact/hooks';
import { planPrices } from '../engine/ai';
import { FAVOURS, FRUIT, FRUITS, UPGRADES, deliveredGreen, stageAt, trackSlots, type FavourId, type FruitId, type Stage, type TraitId, type UpgradeId } from '../engine/data';
import {
  canPlayFavour, canUpgrade, count, crateCounts, forSale, isDraftNight, maxPrice, minPrice, nightOutlook, shadePick,
  validatePrices, type Crate, type GameState, type Post, type Stall,
} from '../engine/game';
import { closingNote, heatwaveLine, tonightText } from '../engine/story';
import { Coin, FavourIcon, Fruit } from './art';
import { buyerCap, buyersAt, buyersFor, demandBoard, stallWantText, stallWanted, type DemandRow } from './boardModel';
import { fruitSvgUrl } from './fruitIcons';
import { Pile } from './table';
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
 * Step 1 of selling (rules 12, PLAN-060): fill your crate with the exact pieces you will sell today. Your shelf is drawn
 * like the Wholesale Market (one column per fruit, newest at the top, tinted by freshness) with − and + on every space
 * you hold; each + sends that piece flying into your crate. Everyone sees every crate once all stalls open.
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
  // The whole shelf, drawn full scale like the Wholesale Market: every ripe space (and green ones you hold), all rows.
  const shown = (x: FruitId) => trackSlots(x).filter((t) => t.stage !== 'unripe' || deliveredGreen(x) || pl.stock[x][t.pos] > 0);
  const rows = Math.max(...FRUITS.map((x) => shown(x).length));
  const pieces = FRUITS.flatMap((f) => (crate[f] ?? []).flatMap((n, pos) => Array.from({ length: n }, () => ({ f, stage: stageAt(f, pos) }))));
  return (
    <>
      <div class="price-panel stall-panel mid-panel">
        <div class="pp-head"><b>Fill your stall</b></div>
        {note && <div class="info-card warn small">{note}</div>}
        <div class="crate me fill-crate" id="my-crate" aria-label={`Your stall: ${total} out`}>
          <span class="crate-plate">Your stall · {total} out</span>
          <span class="crate-fruits">
            {pieces.length ? pieces.map((x) => <span class={`crate-piece st-${x.stage}`}><Fruit id={x.f} size={18} stage={x.stage} /></span>) : <span class="crate-none">empty</span>}
          </span>
        </div>
        {ripe === 0 ? <div class="info-card dim">You have no ripe fruit to sell today.</div> : (
          <div class="shelf-sheet">
            <div class="mk-cols shelf-cols" style={{ '--rows': rows }} aria-label="Your shelf: − and + on every space you hold">
              {FRUITS.map((f) => {
                const held = count(pl.stock, f, true);
                const out = counts[f] ?? 0;
                const slots = shown(f);
                return (
                  <div class={`mk-col ${f}`}>
                    <span class="pz shelf-pz" aria-label={`${FRUIT[f].plural}: ${stallWantText(s, p, f)}, ${out} of ${held} out`}>
                      <Fruit id={f} size={18} />
                      <span class="pz-n"><span><b>{stallWanted(s, p, f)}</b> want</span><span><b>{out}</b> of {held} out</span></span>
                    </span>
                    {slots.map(({ pos, stage }) => {
                      const n = pl.stock[f][pos] ?? 0;
                      const k = crate[f]?.[pos] ?? 0;
                      const sell = n > 0 && stage !== 'unripe';
                      const word = stage === 'notso' ? 'tired' : stage === 'unripe' ? 'green' : stage;
                      return (
                        <div class={`mk-cell st-${stage} ${n ? 'has' : ''} ${k ? 'in' : ''}`} aria-label={`${FRUIT[f].name}, ${word}: ${n} on your shelf${sell ? `, ${k} in your stall` : ''}`}>
                          {/* A space you can sell from shows its − and + with "in your stall / on your shelf"; others show the pile or a ghost. */}
                          {sell ? null : n > 0 ? <Pile f={f} n={n} pos={pos} size={18} /> : <span class="gh"><Fruit id={f} size={18} stage={stage} /></span>}
                          {stage !== 'fresh' && !sell && <span class="shelf-drop">{stage === 'okay' ? '−$1' : stage === 'notso' ? '−$2' : 'green'}</span>}
                          {sell && (
                            <span class="mini-step">
                              <button type="button" aria-label={`One less ${word} ${FRUIT[f].name.toLowerCase()}`} disabled={k <= 0} onClick={() => onStep(f, pos, -1)}>−</button>
                              <b>{k}<small>/{n}</small></b>
                              <button type="button" aria-label={`One more ${word} ${FRUIT[f].name.toLowerCase()}`} disabled={k >= n} onClick={(e) => onStep(f, pos, 1, e.currentTarget.closest('.mk-cell'))}>+</button>
                            </span>
                          )}
                        </div>
                      );
                    })}
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </div>
      <div class="pp-lock">
        <button class="btn primary big wide" onClick={onSubmit}>{total ? <>Open my stall <small class="btn-sub">{total} out</small></> : 'Keep everything back'}</button>
      </div>
    </>
  );
}

// ---------- pricing ----------

/**
 * Step 2: one secret price per fruit you put out. The bell reveals every stall's prices at once.
 * Like the stall panel: compact rows in the middle of the table, the Seal button in the action bar's place.
 */
/** "The Bell" notice opens by itself on Day 1 only; from Day 2 it opens from the i button (PLAN-059). */
export const bellOpensOnStart = (s: GameState): boolean => s.day === 1;

/** Prices pre-filled from the planner for every fruit you put out. */
export function startingPrices(s: GameState, p: number): Record<string, number> {
  const plan = planPrices(s, p).posts;
  return Object.fromEntries(FRUITS.filter((f) => forSale(s, p, f) > 0).map((f) => [f, plan.find((b) => b.fruit === f)?.price ?? minPrice(s, f)]));
}

export function PricePanel({ s, p, onSubmit }: { s: GameState; p: number; onSubmit: (posts: Post[], favoured: boolean) => void }) {
  const [vals, setVals] = useState<Record<string, number>>(() => startingPrices(s, p));
  const [favoured, setFavoured] = useState(false);
  const [sel, setSel] = useState<FruitId | null>(() => FRUITS.find((f) => forSale(s, p, f) > 0) ?? null);
  const [notice, setNotice] = useState(() => bellOpensOnStart(s));
  return (
    <PricePanelView s={s} p={p} vals={vals} sel={sel} favoured={favoured} notice={notice}
      onPrice={(f, price) => setVals((v) => ({ ...v, [f]: price }))} onPick={setSel} onFavoured={() => setFavoured(!favoured)}
      onNotice={setNotice} onSubmit={onSubmit} />
  );
}

/** The pricing screen drawn from its state (no hooks, so tests can draw it). */
export function PricePanelView({ s, p, vals, sel, favoured, notice, onPrice, onPick, onFavoured, onNotice, onSubmit }: {
  s: GameState; p: number; vals: Record<string, number>; sel: FruitId | null; favoured: boolean; notice: boolean;
  onPrice: (f: FruitId, price: number) => void; onPick: (f: FruitId) => void; onFavoured: () => void; onNotice: (open: boolean) => void;
  onSubmit: (posts: Post[], favoured: boolean) => void;
}) {
  const pl = s.players[p];
  const fruits = FRUITS.filter((f) => forSale(s, p, f) > 0);
  const priceOf = (f: FruitId) => Math.min(vals[f], maxPrice(s, f));
  const posts: Post[] = fruits.map((f) => ({ fruit: f, price: priceOf(f) }));
  const error = validatePrices(s, p, posts);
  return (
    <>
      <div class="price-panel mid-panel">
        <div class="pp-head"><b>Set your prices</b><button type="button" class="pp-info" aria-label="How the bell works" onClick={() => onNotice(true)}>i</button></div>
        <DemandBoard rows={demandBoard(s, p)} prices={posts} />
        <PricingTableView s={s} viewer={p} mine={{ prices: Object.fromEntries(posts.map((x) => [x.fruit, x.price])), selected: sel, onPick }} />
        {sel && fruits.includes(sel) && <PriceBubble s={s} p={p} f={sel} price={priceOf(sel)} onPrice={(v) => onPrice(sel, v)} />}
        {pl.favours.includes('favouredTrade') && !pl.favouredTrade && fruits.length > 0 && (
          <button type="button" class={`favour-card wide ${favoured ? 'on' : 'ready'}`} onClick={onFavoured}>
            <span class="fv-icon"><FavourIcon id="favouredTrade" size={20} /></span><span class="fv-name">{favoured ? 'Favoured Trade on: you win ties today' : 'Play Favoured Trade?'}</span>
          </button>
        )}
      </div>
      <div class="pp-lock">
        {error && <div class="error">{error}</div>}
        <button class="btn primary big wide" disabled={!!error} onClick={() => onSubmit(posts, favoured)}>Seal my prices <small class="btn-sub">ring the bell</small></button>
      </div>
      {notice && <BellNotice onClose={() => onNotice(false)} />}
    </>
  );
}

/** The demand board: for each fruit, pieces wanted, pieces out at every stall, and buyers at the prices where that count changes. */
function DemandBoard({ rows, prices }: { rows: DemandRow[]; prices: Post[] }) {
  if (!rows.length) return null;
  return (
    <div class="demand" role="table" aria-label="Demand today: pieces wanted and buyers at each price">
      {rows.map((r) => {
        const mine = prices.find((x) => x.fruit === r.f)?.price;
        return (
          <div class={`dm-row ${r.wanted ? '' : 'off'}`} role="row">
            <Fruit id={r.f} size={20} />
            <span class="dm-q" role="cell"><b>{r.wanted} wanted</b><small> · {r.out} out</small></span>
            {r.steps.length ? (
              <span class="dm-steps" role="cell">
                {r.steps.map((x) => (
                  <span class={`dm-s ${mine === x.price ? 'mine' : ''}`} aria-label={`${x.buyers} would pay $${x.price}`}>${x.price}<b>{x.buyers}</b></span>
                ))}
              </span>
            ) : <span class="dm-none" role="cell">no buyers</span>}
          </div>
        );
      })}
    </div>
  );
}

/** The price bubble under your crate for the fruit you tapped: the dial, and four quick prices with their buyers. */
function PriceBubble({ s, p, f, price, onPrice }: { s: GameState; p: number; f: FruitId; price: number; onPrice: (v: number) => void }) {
  const lo = minPrice(s, f);
  const top = Math.max(1, ...buyersFor(s, f).map((x) => buyerCap(s, p, f, x).cap));
  const hi = Math.min(maxPrice(s, f), top + 2);
  const quick = [price + 2, price + 1, price, price - 1].filter((v) => v >= lo && v <= hi);
  return (
    <div class="pbub" role="group" aria-label={`Price for your ${FRUIT[f].plural.toLowerCase()}`}>
      <div class="pbub-dial">
        <button type="button" aria-label={`Lower the price of ${FRUIT[f].plural}`} disabled={price <= lo} onClick={() => onPrice(price - 1)}>−</button>
        <span class="pc-num"><Fruit id={f} size={22} />${price}</span>
        <button type="button" aria-label={`Raise the price of ${FRUIT[f].plural}`} disabled={price >= hi} onClick={() => onPrice(price + 1)}>+</button>
      </div>
      <div class="pbub-quick">
        {quick.map((v) => {
          const n = buyersAt(s, p, f, v);
          return <button type="button" class={v === price ? 'on' : ''} aria-label={`$${v}: ${n} would buy`} onClick={() => onPrice(v)}>${v}<small>{n}</small></button>;
        })}
      </div>
    </div>
  );
}

/** "The Bell" (PLAN-059): the market's notice of how the bell works, in the crier's words. */
export function BellNotice({ onClose }: { onClose: () => void }) {
  const lines: [IconName, string][] = [
    ['tag', 'Price every fruit you put out!'],
    ['hourglass', 'Prices stay secret until the bell.'],
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

export const UP_ICON: Record<UpgradeId, IconName> = { barrow: 'handcart', premium: 'signboard', juicebar: 'juicer' };
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
          <div class="pp-intro"><b>Stall upgrades</b><span>After each Market Day you may build one upgrade: it changes how your stall works. Cash spent is cash you can't win with: {left} day{left === 1 ? '' : 's'} left to earn it back.</span></div>
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
        {FRUITS.map((f) => (
          <button type="button" role="radio" aria-checked={chosen === f} class={chosen === f ? 'on' : ''} aria-label={FRUIT[f].plural} onClick={() => onShade(f)}><Fruit id={f} size={20} /></button>
        ))}
        <button type="button" role="radio" aria-checked={chosen === null} class={chosen === null ? 'on' : ''} onClick={() => onShade(null)}>None</button>
      </div>
    </>
  );
}

export { Coin };
