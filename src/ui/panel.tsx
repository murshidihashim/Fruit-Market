// Decision panels: price cards for setting secret prices and upgrade cards for the evening.
// (A rival's stall opens below their seat; see RivalDrop in table.tsx.)
import { useState } from 'preact/hooks';
import { planPrices, planStall } from '../engine/ai';
import { FAVOURS, FRUIT, FRUITS, UPGRADES, stageAt, type FavourId, type FruitId, type TraitId, type UpgradeId } from '../engine/data';
import {
  canPlayFavour, canUpgrade, count, forSale, isDraftNight, isMarketDay, maxPrice, minPrice, nightOutlook,
  validatePrices, type GameState, type Post, type Stall,
} from '../engine/game';
import { closingNote, heatwaveLine, tonightText } from '../engine/story';
import { Coin, Face, FavourIcon, Fruit } from './art';
import { buyerCap, buyersFor, priceRead, stallWantText, tieHint } from './boardModel';
import { Icon, type IconName } from './icons';

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
 * Step 1 of selling: how many of each fruit to put out today. Everyone sees the numbers once all stalls open.
 * On the game screen the rows sit in the middle of the table (one compact row per fruit) and the button
 * (.pp-lock) takes the action bar's place, so your shelf and today's customers stay in view.
 */
export function StallPanel({ s, p, onSubmit }: { s: GameState; p: number; onSubmit: (stall: Stall) => void }) {
  const pl = s.players[p];
  const fruits = FRUITS.filter((f) => count(pl.stock, f, true) > 0);
  const [vals, setVals] = useState<Stall>(() => planStall(s, p));
  const set = (f: FruitId, n: number) => setVals((v) => ({ ...v, [f]: Math.max(0, Math.min(count(pl.stock, f, true), n)) }));
  const total = fruits.reduce((a, f) => a + (vals[f] ?? 0), 0);
  // The final day: what leftovers are worth tonight (the jam maker, or $0 when Closing Day is off); else Market Day news.
  const note = s.day >= s.config.days ? closingNote(s, p)?.stocking ?? null : isMarketDay(s, s.day + 1) ? 'Tomorrow is a Market Day: one more walk-in. The lorry still comes.' : null;
  return (
    <>
      <div class="price-panel stall-panel mid-panel">
        <div class="pp-intro"><b>Open your stall</b><span>Put out the fruit you will sell today. Everyone sees how many each stall puts out, then you all set secret prices.</span></div>
        {note && <div class="info-card warn small">{note}</div>}
        {fruits.length === 0 && <div class="info-card dim">You have no ripe fruit to sell today.</div>}
        {fruits.map((f) => {
          const have = count(pl.stock, f, true);
          const n = vals[f] ?? 0;
          const rivals = s.players.reduce((a, o, i) => (i === p ? a : a + count(o.stock, f, true)), 0);
          return (
            <div class={`price-card ${n ? 'on' : ''}`}>
              <div class="pc-top">
                <Fruit id={f} size={32} />
                <div class="pc-who">
                  <b>{FRUIT[f].plural}</b>
                  <span class="pc-sub">{stallWantText(s, p, f)} · rivals hold {rivals}</span>
                  <StockLine stock={pl.stock} f={f} />
                </div>
                <div class="pc-price">
                  <button type="button" aria-label={`Put out one less ${FRUIT[f].name}`} disabled={n <= 0} onClick={() => set(f, n - 1)}>−</button>
                  <span class="pc-num">{n}<small> of {have}</small></span>
                  <button type="button" aria-label={`Put out one more ${FRUIT[f].name}`} disabled={n >= have} onClick={() => set(f, n + 1)}>+</button>
                </div>
              </div>
            </div>
          );
        })}
      </div>
      <div class="pp-lock">
        <button class="btn primary big wide" onClick={() => onSubmit(vals)}>{total ? <>Open my stall <small class="btn-sub">{total} out</small></> : 'Keep everything back'}</button>
      </div>
    </>
  );
}

/** A shop's ripe fruit of one kind, oldest first, coloured by freshness. */
function StockLine({ stock, f }: { stock: Record<FruitId, number[]>; f: FruitId }) {
  const chips: { pos: number; n: number }[] = [];
  for (let i = 0; i < FRUIT[f].ripe.length; i++) if (stock[f][i]) chips.push({ pos: i, n: stock[f][i] });
  return <span class="stock-line">{chips.map((c) => <span class={`sl st-${stageAt(f, c.pos)}`}><Fruit id={f} size={18} stage={stageAt(f, c.pos)} />×{c.n}</span>)}</span>;
}

// ---------- pricing ----------

/**
 * Step 2: one secret price per fruit you put out. The bell reveals every stall's prices at once.
 * Like the stall panel: compact rows in the middle of the table, the Seal button in the action bar's place.
 */
export function PricePanel({ s, p, onSubmit }: { s: GameState; p: number; onSubmit: (posts: Post[], favoured: boolean) => void }) {
  const pl = s.players[p];
  const fruits = FRUITS.filter((f) => forSale(s, p, f) > 0);
  const [vals, setVals] = useState<Record<string, number>>(() => {
    const plan = planPrices(s, p).posts;
    return Object.fromEntries(fruits.map((f) => [f, plan.find((b) => b.fruit === f)?.price ?? minPrice(s, f)]));
  });
  const [favoured, setFavoured] = useState(false);
  const posts: Post[] = fruits.map((f) => ({ fruit: f, price: Math.min(vals[f], maxPrice(s, f)) }));
  const error = validatePrices(s, p, posts);
  return (
    <>
      <div class="price-panel mid-panel">
        <div class="pp-intro"><b>Set your prices</b><span>One secret price per fruit. At the bell all prices show at once; customers buy from the cheapest stall first, and leftover demand moves to the next.</span></div>
        {fruits.map((f) => {
          const price = Math.min(vals[f], maxPrice(s, f));
          const out = forSale(s, p, f);
          const lines = buyersFor(s, f);
          const caps = lines.map((x) => ({ x, b: buyerCap(s, p, f, x) }));
          const rivalOut = s.players.map((o, i) => ({ o, i, n: i === p ? 0 : forSale(s, i, f) })).filter((r) => r.n > 0);
          const read = priceRead(s, p, f, price);
          const tie = tieHint(s, p, f, favoured);
          const top = Math.max(1, ...caps.map(({ b }) => b.cap));
          return (
            <div class="price-card on">
              <div class="pc-top">
                <Fruit id={f} size={32} />
                <div class="pc-who">
                  <b>{FRUIT[f].plural}<span class="pc-out">: {out} out</span></b>
                  {lines.length ? (
                    <span class="buyer-caps" aria-label={`They pay for yours: ${caps.map(({ b }) => b.aria).join(', ')}`}>
                      {caps.map(({ x, b }) => <span class={`bc ${price <= b.cap ? 'yes' : 'no'}`} title={b.title}><Face who={x.c.name} size={16} />{b.label}</span>)}
                    </span>
                  ) : <span class="pc-sub">no customers want these</span>}
                </div>
                <div class="pc-price">
                  <button type="button" aria-label={`Lower the price of ${FRUIT[f].plural}`} disabled={price <= minPrice(s, f)} onClick={() => setVals((v) => ({ ...v, [f]: price - 1 }))}>−</button>
                  <span class="pc-num">${price}</span>
                  <button type="button" aria-label={`Raise the price of ${FRUIT[f].plural}`} disabled={price >= Math.min(maxPrice(s, f), top + 2)} onClick={() => setVals((v) => ({ ...v, [f]: price + 1 }))}>+</button>
                </div>
              </div>
              <div class="pc-foot">
                {/* the full read on a desktop, its short form on a phone (styles.css .rd-l / .rd-s) */}
                <span class={`read ${read.cls}`} title={read.text}><b class="psst">Psst…</b> <span class="rd-l">{read.text}</span><span class="rd-s">{read.short}</span></span>
                {rivalOut.length > 0 && (
                  <span class="rival-caps">{rivalOut.map((r) => <span title={`${r.o.name} put out ${r.n}`} aria-label={`${r.o.name} put out ${r.n}`}><Face who={r.o.avatar} size={16} />{r.n}<small class="rc-out"> out</small></span>)}</span>
                )}
              </div>
              {/* public before the bell: a rival Haggler with this fruit out wins a tie at your price */}
              {tie && <div class="pc-tie" title={tie}><Icon name="scales" size={12} />{tie}</div>}
            </div>
          );
        })}
        {pl.favours.includes('favouredTrade') && !pl.favouredTrade && fruits.length > 0 && (
          <button type="button" class={`favour-card wide ${favoured ? 'on' : 'ready'}`} onClick={() => setFavoured(!favoured)}>
            <span class="fv-icon"><FavourIcon id="favouredTrade" size={20} /></span><span class="fv-name">{favoured ? 'Favoured Trade on: you win ties today' : 'Play Favoured Trade?'}</span>
          </button>
        )}
      </div>
      <div class="pp-lock">
        {error && <div class="error">{error}</div>}
        <button class="btn primary big wide" disabled={!!error} onClick={() => onSubmit(posts, favoured)}>Seal my prices <small class="btn-sub">ring the bell</small></button>
      </div>
    </>
  );
}

// ---------- evening ----------

export const UP_ICON: Record<UpgradeId, IconName> = { barrow: 'handcart', coldroom: 'coolroom', premium: 'signboard', juicebar: 'juicer' };
export const TRAIT_ICON: Record<TraitId, IconName> = { haggler: 'scales', basket: 'crate', bargain: 'tag', charmer: 'heart', favourite: 'star', nestegg: 'egg' };

/** Pieces on this shelf that will be tired at the start of tomorrow. */
function tiredTomorrow(s: GameState, pl: GameState['players'][number]): number {
  const room = pl.upgrades.includes('coldroom');
  const steps = (room && s.day % 2 === 1 ? 0 : 1) + (room ? 0 : s.event?.ageExtra ?? 0);
  return FRUITS.reduce((a, f) => a + (pl.stock[f][steps] ?? 0) * (steps < FRUIT[f].ripe.length ? 1 : 0), 0);
}

export function EveningPanel({ s, p, onUpgrade, onCard }: { s: GameState; p: number; onUpgrade: (u: UpgradeId) => void; onCard: (i: number) => void }) {
  const pl = s.players[p];
  // Tonight follows the night's own rules (a Cold Room, a Heatwave, the Juice Bar): "2 spoil tonight, 3 become juice (+$6)".
  const night = nightOutlook(s, p);
  const tonight = tonightText(night);
  const heat = heatwaveLine(s, p);
  // Tomorrow's Health Inspector fines the fruit that will be tired when the day starts (a Cold Room does not help).
  const fine = tiredTomorrow(s, pl) * (s.nextEvent?.inspector ?? 0);
  // Only juice money tonight is good news: the card turns green; anything spoiling, a fine or a Heatwave keeps it a warning.
  const good = night.spoil === 0 && fine === 0 && !heat;
  const left = s.config.days - s.day;
  return (
    <div class="evening-panel">
      {(tonight || fine > 0 || heat) && (
        <div class={`info-card ${good ? 'good' : 'warn'}`}>
          {tonight && <div>{tonight}</div>}
          {fine > 0 && <div>The inspector fines you ${fine} tomorrow morning, before you can sell or discard.</div>}
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
      {pl.favours.length > 0 && <div class="pp-intro"><b>Up your sleeve</b><span>Favour cards you can play.</span></div>}
      <FavourRow s={s} p={p} phase="evening" onCard={onCard} />
      {s.players.length > 1 && <div class="whisper"><b class="psst">Psst…</b> the rivals are plotting tonight too.</div>}
    </div>
  );
}

export { Coin };
