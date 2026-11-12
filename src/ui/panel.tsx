// Decision panels: price cards for setting secret prices and upgrade cards for the evening.
// (A rival's stall opens below their seat; see RivalDrop in table.tsx.)
import { useLayoutEffect, useRef, useState } from 'preact/hooks';
import { boxOf } from './anim';
import { believe, planPrices } from '../engine/ai';
import { FAVOURS, FRUIT, FRUITS, MAX_UPGRADES, UPGRADES, lookOf, stageAt, type FavourId, type FruitId, type TraitId, type UpgradeId } from '../engine/data';
import {
  canPlayFavour, canUpgrade, count, crateCounts, forSale, handLimit, isDraftNight, maxPrice, minPrice, nightOutlook, shadePick,
  validatePrices, type Crate, type Customer, type GameState, type Post,
} from '../engine/game';
import { closingNote, dayLedger, heatwaveLine, tonightText } from '../engine/story';
import { tagOf } from '../net/looks';
import { Coin, Face, Fruit } from './art';
import { SEEN_WALK_IN, buyerCap, buyersFor, nextLorryName, stallWantText, stallWanted, LANES } from './boardModel';
import { ART_SIZE, CardArt, UpgradeCard } from './cards';
import { upgradeArt, upgradeFocus } from './deckArt';
import { STAGE_LETTER, STAGE_WORD } from './ticket';
import { Icon, type IconName } from './icons';
import { FavourMini } from './phoneCards';
import { nth, pricingTable } from './game/pricingTable';
import { nightSteps, tonightWord } from './game/tonight';
import { noteOffer } from './game/dayBeats';
import { drawCloser, useReach, type Holding } from './game/reach';

// ---------- favour cards ----------

export function FavourRow({ s, p, phase, onCard }: { s: GameState; p: number; phase: string; onCard: (i: number) => void }) {
  const pl = s.players[p];
  if (!pl.favours.length) return null;
  return (
    <div class="fav-row">
      {pl.favours.map((id: FavourId, i) => <FavourMini id={id} ready={FAVOURS[id].when === phase && !canPlayFavour(s, p, i)} onOpen={() => onCard(i)} />)}
    </div>
  );
}

// ---------- stocking: fill your crate (PLAN-085, the approved Stocking screen) ----------
// Stocking and pricing are two steps of the one sheet that stays on the table from stocking to the day's takings
// (game/panels/DaySheet.tsx holds the sheet and its state). The views here are drawn from their state alone (no
// hooks, so tests can draw them); each has its own main button, which takes the action bar's place.

/** Where filling your stall starts: nothing out (owner's choice, PLAN-061); you add each piece yourself. */
export function startingCrate(s: GameState, p: number): Crate {
  const pl = s.players[p];
  return Object.fromEntries(FRUITS.map((f) => [f, new Array<number>(pl.stock[f].length).fill(0)])) as Crate;
}

/** The name of a box of the shelf: its fruit and its place ("apple-2"). A piece in the crate carries it, so it knows
 *  which row it came from. */
export const boxKey = (f: FruitId, pos: number) => `${f}-${pos}`;

/** What a row of the shelf says under "2 on shelf": who wants it, what an older piece loses, what tonight does to it. */
export function shelfRowText(s: GameState, p: number, f: FruitId, pos: number): string {
  const stage = stageAt(f, pos);
  const night = tonightWord(s, p, f, pos);
  if (stage === 'unripe') {
    const nights = pos - FRUIT[f].ripe.length + 1;
    return night.text === 'ripe tomorrow' ? 'Still Green · ripe tomorrow' : nightSteps(s, p, f) === 1 ? `Still Green · ripe in ${nights} nights` : 'Still Green';
  }
  const drop = FRUIT[f].drop[pos] ?? 0;
  const best = Math.max(0, ...buyersFor(s, f).map((x) => x.max));
  return [
    stallWantText(s, p, f),
    drop ? `${STAGE_WORD[stage]} sells $${drop} less` : stallWanted(s, p, f) > 0 ? `best price $${best}` : '',
    night.text === 'spoils tonight' || night.text === 'juice tonight' ? night.text : '',
  ].filter(Boolean).join(' · ');
}

/**
 * Stocking, drawn from its state: your crate with the pieces in it, then one row for every box of your shelf that
 * holds fruit, with − and + on the ripe ones; green fruit is shown but is not for sale. `landed`: the pieces drawn in
 * the crate (a piece on its way there is drawn when it lands; without it, every piece of `crate`). `waiting`: your
 * stall is open and the rivals are still opening theirs, so nothing can be changed.
 */
export function StallPanelView({ s, p, crate, landed, waiting, onStep }: {
  s: GameState; p: number; crate: Crate; landed?: Crate; waiting?: boolean;
  onStep: (f: FruitId, pos: number, d: number, row?: Element | null) => void;
}) {
  const pl = s.players[p];
  const counts = crateCounts(crate);
  const total = FRUITS.reduce((a, f) => a + (counts[f] ?? 0), 0);
  const ripe = count(pl.stock, undefined, true);
  // The final day: what leftovers are worth tonight (the jam maker, or $0 when Closing Day is off).
  const note = s.day >= s.config.days ? closingNote(s, p)?.stocking ?? null : null;
  // One row for every box of your shelf that holds fruit: the board's lane order, the freshest box first.
  const rows = LANES.flatMap((f) => pl.stock[f].map((n, pos) => ({ f, pos, n, stage: stageAt(f, pos) })).filter((x) => x.n > 0).reverse());
  const drawn = landed ?? crate;
  const pieces = LANES.flatMap((f) => (drawn[f] ?? []).flatMap((n, pos) => Array.from({ length: n }, () => ({ f, pos, stage: stageAt(f, pos) }))).reverse());
  return (
    <div class={`ds-stock stall-panel ${waiting ? 'waiting' : ''}`}>
      {/* The heading and your crate stay in view while a long shelf scrolls under them. */}
      <div class="ds-stick">
        <div class="ds-lab-row"><b class="ds-lab">Fill your crate</b><span>{total} {total === 1 ? 'piece' : 'pieces'} in crate</span></div>
        <div class="ds-crate" id="my-crate" aria-label={`Your crate: ${total} in it`}>
          <i class="ds-sw" aria-hidden="true" /><span class="ds-lab">Your crate</span>
          <span class="ds-pcs">
            {pieces.length ? pieces.map((x) => <span class={`crate-piece ds-pcx st-${x.stage}`} data-box={boxKey(x.f, x.pos)}><Fruit id={x.f} size={18} stage={x.stage} /><i class={`ds-lamp st-${x.stage}`}>{STAGE_LETTER[x.stage]}</i></span>)
              : total === 0 && <span class="ds-none">empty</span>}
          </span>
        </div>
      </div>
      {note && <div class="ds-info warn">{note}</div>}
      {ripe === 0 && <div class="ds-info">You have no ripe fruit to sell today.</div>}
      <div class={`ds-rows ${rows.length > 4 ? 'many' : ''}`}>
        {rows.map(({ f, pos, n, stage }) => {
          const k = crate[f]?.[pos] ?? 0;
          const sell = stage !== 'unripe';
          const word = STAGE_WORD[stage];
          return (
            <div class={`ds-srow ${f} ${sell ? '' : 'off'} ${k ? 'in' : ''}`} data-box={boxKey(f, pos)} aria-label={`${FRUIT[f].name}, ${word}: ${n} on your shelf${sell ? `, ${k} in your crate` : ''}`}>
              <div class="ds-info-cell">
                <i class={`ds-lamp lg st-${stage}`} aria-hidden="true">{STAGE_LETTER[stage]}</i><Fruit id={f} size={26} stage={stage} />
                <span class="ds-txt"><b>{n} on shelf</b><span>{shelfRowText(s, p, f, pos)}</span></span>
              </div>
              {sell && !waiting && (
                <span class="mini-step">
                  <button type="button" class="ds-st" aria-label={`One less ${word} ${FRUIT[f].name.toLowerCase()}`} disabled={k <= 0} onClick={(e) => onStep(f, pos, -1, e.currentTarget.closest('.ds-srow'))}>−</button>
                  <b class="ds-amt"><span>{k}</span><small>in crate</small></b>
                  <button type="button" class="ds-st" aria-label={`One more ${word} ${FRUIT[f].name.toLowerCase()}`} disabled={k >= n} onClick={(e) => onStep(f, pos, 1, e.currentTarget.closest('.ds-srow'))}>+</button>
                </span>
              )}
              {sell && waiting && <b class="ds-amt still"><span>{k}</span><small>in crate</small></b>}
            </div>
          );
        })}
      </div>
      <div class="ds-note">
        <b class="ds-lab">Only the crate sells today</b>
        <span>Rivals see how many pieces are in your crate, not which fruit, and never your price. What stays on your shelf ages tonight.</span>
      </div>
    </div>
  );
}

/** Stocking's main button, in the action bar's place. */
export function StallBar({ total, onSubmit }: { total: number; onSubmit: () => void }) {
  return (
    <div class="pp-lock">
      <button type="button" class="btn primary big wide tk-go" onClick={onSubmit}>{total ? <>Crate ready <small class="btn-sub">{total} in crate</small></> : 'Sell nothing today'}</button>
    </div>
  );
}

// ---------- pricing (PLAN-085, the approved Pricing screen) ----------

/** "The Bell" notice never opens by itself (owner, PLAN-064; it opened on Day 1 before): only from the i button. */
export const bellOpensOnStart = (_s: GameState): boolean => false;

/** Prices pre-filled from the planner for every fruit you put out. */
export function startingPrices(s: GameState, p: number): Record<string, number> {
  const plan = planPrices(s, p).posts;
  return Object.fromEntries(FRUITS.filter((f) => forSale(s, p, f) > 0).map((f) => [f, plan.find((b) => b.fruit === f)?.price ?? minPrice(s, f)]));
}

/** The prices as they would be sealed now: one for each fruit put out, never over today's limit. */
export function postsOf(s: GameState, p: number, vals: Record<string, number>): Post[] {
  return FRUITS.filter((f) => forSale(s, p, f) > 0).map((f) => ({ fruit: f, price: Math.min(vals[f] ?? minPrice(s, f), maxPrice(s, f)) }));
}

/** How the game breaks a tie, and where this stall stands in today's line-up (the last of the tie-breaks). */
export function tieOrderText(s: GameState, p: number): string {
  const at = s.order.indexOf(p);
  return `The fresher piece sells first, then the Haggler, then whoever bought earlier.${at >= 0 ? ` You bought ${nth(at + 1)} today.` : ''}`;
}

/**
 * Pricing, drawn from its state (no hooks, so tests can draw it): one row for each fruit in your crate with the
 * freshness of its pieces, what is wanted, the best price, and its own − and +; then how a tie falls, and a reminder
 * when you hold Favoured Trade. Rules 15: the rivals' crates are shut, so "wanted" and "best price" are worked out on
 * the same guess the suggested prices use (engine/ai believe: only how many pieces each rival put out), never on a
 * rival's real crate or price. `sealed`: you have rung the bell; your price tags lie face down and nothing can be changed.
 */
export function PricePanelView({ s, p, vals, notice, sealed, onPrice, onNotice }: {
  s: GameState; p: number; vals: Record<string, number>; notice: boolean; sealed?: boolean;
  onPrice: (f: FruitId, price: number) => void; onNotice: (open: boolean) => void;
}) {
  const pl = s.players[p];
  const seats = pricingTable(s, p).seats;
  const mine = seats.find((x) => x.me);
  const rivals = seats.filter((x) => !x.me);
  const fruits = LANES.filter((f) => forSale(s, p, f) > 0);
  const b = believe(s, p, false);
  return (
    <div class={`ds-price ${sealed ? 'sealed' : ''}`}>
      <div class="ds-lab-row">
        <b class="ds-lab">Your secret prices</b>
        <button type="button" class="pp-info" aria-label="How the bell works" onClick={() => onNotice(true)}>i</button>
        <span>{sealed ? 'Sealed until the bell' : 'One price for each fruit'}</span>
      </div>
      {fruits.length === 0 && <div class="ds-info">Your crate is empty today.</div>}
      {/* Only drawn where the sheet lies over the rivals' boxes (a short phone): how many pieces each put out. */}
      {rivals.length > 0 && <div class="ds-rivals"><b class="ds-lab">Rival crates</b><span>{rivals.map((x) => `${s.players[x.player].name} ${x.out ?? 0}`).join(' · ')}</span></div>}
      <div class={`ds-rows prices n${fruits.length}`}>
        {fruits.map((f) => {
          const price = Math.min(vals[f] ?? minPrice(s, f), maxPrice(s, f));
          const lo = minPrice(s, f);
          const lines = buyersFor(b, f);
          const top = Math.max(0, ...lines.map((x) => buyerCap(b, p, f, x).cap));
          const best = Math.max(0, ...lines.map((x) => x.max));
          const hi = Math.min(maxPrice(s, f), Math.max(1, top) + 2);
          const wanted = lines.reduce((a, x) => a + x.w.qty, 0);
          const dots = mine?.fruits.find((x) => x.f === f)?.dots ?? [];
          const out = forSale(s, p, f);
          const word = dots[0] && dots[0] !== 'fresh' ? STAGE_WORD[dots[0]] : '';
          const said = !lines.length ? 'Nobody wants these today'
            : top <= 0 ? `${wanted} wanted · nobody takes yours`
            : `${wanted} wanted · best price $${best}${top !== best && word ? `, so $${top} for ${word.charAt(0).toUpperCase()}${word.slice(1)}` : top !== best ? `, $${top} for yours` : ''}`;
          return (
            <div class={`ds-prow ${f}`} role="group" aria-label={`Price for your ${FRUIT[f].plural.toLowerCase()}`}>
              <div class="ds-info-cell">
                <div class="ds-out">
                  <Fruit id={f} size={22} /><b>{out} in crate</b>
                  {dots.map((st) => <i class={`ds-lamp lg st-${st}`} aria-hidden="true">{STAGE_LETTER[st]}</i>)}
                  {out > dots.length && <em>+{out - dots.length}</em>}
                </div>
                <span>{said}</span>
              </div>
              <span class="ds-dial">
                <button type="button" class="ds-st" aria-label={`Lower the price of ${FRUIT[f].plural}`} disabled={sealed || price <= lo} onClick={() => onPrice(f, price - 1)}>−</button>
                <span class={`ds-tag tg-${tagOf(pl.look)}`} role="img" aria-label={sealed ? 'Your price, sealed' : `$${price}`}>
                  {/* A sealed tag shows its back only: the price is not drawn under it. */}
                  {!sealed && <span class="ds-tag-face pc-num">${price}</span>}
                  {sealed && <span class="ds-tag-back" aria-hidden="true">Sealed</span>}
                </span>
                <button type="button" class="ds-st" aria-label={`Raise the price of ${FRUIT[f].plural}`} disabled={sealed || price >= hi} onClick={() => onPrice(f, price + 1)}>+</button>
              </span>
            </div>
          );
        })}
      </div>
      {fruits.length > 0 && (
        <div class="ds-note">
          <b class="ds-lab">If your price ties with a rival's</b>
          <span>{tieOrderText(s, p)}</span>
        </div>
      )}
      {/* Rules 18: Favoured Trade is not played with the prices. A holder with a tied price is asked after the flip. */}
      {pl.favours.includes('favouredTrade') && fruits.length > 0 && (
        <div class="ds-fav"><b class="ds-kind">Favour</b><span>You hold Favoured Trade. If you tie, you are asked after the prices flip.</span></div>
      )}
      {notice && <BellNotice onClose={() => onNotice(false)} />}
    </div>
  );
}

/** Pricing's main button, in the action bar's place: it seals the prices and rings the bell. */
export function PriceBar({ s, p, vals, onSubmit }: { s: GameState; p: number; vals: Record<string, number>; onSubmit: (posts: Post[]) => void }) {
  const posts = postsOf(s, p, vals);
  const error = validatePrices(s, p, posts);
  return (
    <div class="pp-lock">
      {error && <div class="error">{error}</div>}
      <button type="button" class="btn primary big wide tk-go" disabled={!!error} onClick={() => onSubmit(posts)}>Seal prices <small class="btn-sub">{posts.length} {posts.length === 1 ? 'price' : 'prices'}</small></button>
    </div>
  );
}

/** "The Bell" (PLAN-059): the market's notice of how the bell works, in the crier's words. */
export function BellNotice({ onClose }: { onClose: () => void }) {
  const lines: [IconName, string][] = [
    ['tag', 'Set one price for each fruit in your crate.'],
    ['hourglass', 'Prices stay secret until the bell.'],
    ['crate', 'Crates stay shut until the bell: you only see how many pieces.'],
    ['coin', 'The lowest price sells first.'],
    ['scales', 'Ties: Favoured Trade, then fresher fruit, then the Haggler, then whoever bought earlier today.'],
    ['heart', 'Serve a customer’s whole order by yourself to earn a favour card.'],
  ];
  return (
    <div class="bell-notice" role="dialog" aria-modal="true" aria-label="The Bell" onClick={onClose}>
      <div class="bn-card" onClick={(e) => e.stopPropagation()}>
        <i class="bn-pin l" /><i class="bn-pin r" />
        <span class="bn-ban">THE BELL</span>
        <ul class="bn-rules">
          {lines.map(([icon, text]) => <li><span class="bn-badge"><Icon name={icon} size={18} /></span>{text}</li>)}
        </ul>
        <button type="button" class="btn primary wide" onClick={onClose}>Got it</button>
      </div>
    </div>
  );
}

// ---------- evening ----------

export const UP_ICON: Record<UpgradeId, IconName> = { barrow: 'handcart', premium: 'signboard', juicebar: 'juicer', ripening: 'sun', orderbook: 'fv_favouredTrade' };
export const TRAIT_ICON: Record<TraitId, IconName> = { haggler: 'scales', basket: 'crate', bargain: 'tag', charmer: 'heart', favourite: 'star', nestegg: 'egg', keeper: 'moon', earful: 'ear' };

/** A small number in words, as the evening says it ("room for two"). */
const WORDS = ['none', 'one', 'two', 'three', 'four', 'five'];
const inWords = (n: number) => WORDS[n] ?? String(n);

/** The evening's heading: the day's money in one line ("Sold $15 · bought $8 · up $7 today"), from the day's ledger. */
export function daySoldLine(s: GameState, p: number): string {
  const { sales, bought, net } = dayLedger(s, p);
  return [`Sold $${sales}`, `bought $${bought}`, ...(net === null ? [] : [`${net < 0 ? 'down' : 'up'} $${Math.abs(net)} today`])].join(' · ');
}

/** The offers tonight, in the order they are laid out, the cheapest first: every upgrade the stall has not built
 *  (none when it is full). */
export function offersTonight(s: GameState, p: number): UpgradeId[] {
  const pl = s.players[p];
  const offers = pl.upgradeOffer ?? (Object.keys(UPGRADES) as UpgradeId[]).filter((u) => !pl.upgrades.includes(u));
  return [...offers].sort((a, b) => UPGRADES[a].cost - UPGRADES[b].cost);
}

/** Under the row of offers: which ones lie past the first two, to the right ("Swipe for Premium Display $5 and Handcart $6"). */
export function swipeHint(offers: UpgradeId[]): string {
  const more = offers.slice(2).map((u) => `${UPGRADES[u].title} $${UPGRADES[u].cost}`);
  const list = more.length > 1 ? `${more.slice(0, -1).join(', ')} and ${more[more.length - 1]}` : more[0];
  return `${list ? `Swipe for ${list}. ` : ''}A stall has room for ${inWords(MAX_UPGRADES)}.`;
}

/**
 * An upgrade on offer, as a card you choose: label, picture, name, cost and the card's text. Tap it to choose it;
 * the evening's main button then builds it. `why`: the reason it cannot be built now (it is then greyed and says so).
 */
function UpgradePick({ id, chosen, why, onPick, onOpen }: { id: UpgradeId; chosen: boolean; why: string | null; onPick?: () => void;
  /** Opens the whole card. An offer that cannot be built is never chosen, but a tap still opens it to be read (PLAN-090). */
  onOpen?: () => void }) {
  const d = UPGRADES[id];
  return (
    <button type="button" class={`uo uo-pick ${chosen ? 'sel' : ''}`} data-up={id} aria-pressed={chosen} disabled={why ? !onOpen : !onPick}
      aria-disabled={why ? 'true' : undefined} onClick={why ? onOpen : onPick}
      aria-label={`Upgrade: ${d.title}, $${d.cost}. ${d.text}${why ? ` ${why}.` : ''}`}>
      <span class="uo-kind">Upgrade</span>
      <CardArt class="uo-pic" src={upgradeArt(id)} alt="" w={ART_SIZE.small[0]} h={ART_SIZE.small[1]} focus={upgradeFocus(id)} />
      <b class="uo-nm">{d.title}</b>
      <span class="uo-cost">{`$${d.cost}`}</span>
      <span class="uo-tx">{d.text}</span>
      <span class="uo-ft">{why ?? 'Build once'}</span>
    </button>
  );
}

/**
 * Tomorrow in one line: the expected customer and what they want at their printed price, any walk-in whose front
 * this stall has seen (Gossip, Sharp Ears: for this stall only), how many walk-ins are still face down, and the lorry.
 */
export function EveningTomorrow({ s, p }: { s: GameState; p: number }) {
  const seen = s.queue.filter((c) => c.seenBy?.includes(p));
  const hidden = s.queue.length - seen.length;
  const lorry = nextLorryName(s);
  if (!s.forecast && !s.queue.length && !lorry) return null;
  const who = (c: Customer, heard: boolean) => (
    <span class={`ev-who ${heard ? 'heard' : ''}`} title={heard ? SEEN_WALK_IN : undefined}
      aria-label={`${lookOf(c.name).title} wants ${c.wants.map((w) => `${w.qty} ${FRUIT[w.fruit].plural} at $${w.max}`).join(' and ')}`}>
      <Face who={c.name} size={22} />
      {c.wants.map((w) => <span aria-hidden="true"><Fruit id={w.fruit} size={14} />{w.qty} at ${w.max}</span>)}
    </span>
  );
  const rest = [hidden > 0 ? `+ ${hidden} walk-in${hidden === 1 ? '' : 's'}` : '', lorry ?? ''].filter(Boolean).join(' · ');
  return (
    <div class="ev-tomorrow" aria-label="Tomorrow">
      <b class="tk-label">Tomorrow</b>
      {s.forecast && who(s.forecast, false)}
      {seen.map((c) => who(c, true))}
      {rest && <span class="ev-rest">{rest}</span>}
    </div>
  );
}

/**
 * The evening, as the approved Evening screen (PLAN-084): the day's money in the heading, tonight's warning, the
 * upgrade offers as cards in a row (after a Market Day), Shade Cloth's fruit, the favour cards you hold, and tomorrow
 * in one line. Drawn from its state alone (no hooks, so tests can draw it). `pick`: the offer chosen to build; the
 * button that builds it is the evening's main button (EveningSheet), not a button on every card.
 */
export function EveningPanel({ s, p, onCard, onShade, pick = null, onPick, onOpen }: {
  s: GameState; p: number; onUpgrade?: (u: UpgradeId) => void; onCard: (i: number) => void;
  /** Opens an offer's whole card (one that cannot be built now). */
  onOpen?: (u: UpgradeId) => void;
  /** Shade Cloth (rules 11): name the fruit that does not age tonight (null: none). */
  onShade?: (f: FruitId | null) => void;
  pick?: UpgradeId | null; onPick?: (u: UpgradeId | null) => void;
}) {
  const pl = s.players[p];
  // Tonight follows the night's own rules (a Heatwave, a Monsoon, the Juice Bar): "3 spoil tonight, 2 become juice (+$4)".
  const night = nightOutlook(s, p);
  const tonight = tonightText(night);
  const heat = heatwaveLine(s, p);
  // Only juice money tonight is good news: the card turns green; anything spoiling or a Heatwave keeps it a warning.
  const good = night.spoil === 0 && !heat;
  const offers = isDraftNight(s) ? offersTonight(s, p) : [];
  return (
    <div class="evening-panel">
      <header class="ev-head"><b>Evening</b><span>{daySoldLine(s, p)}</span></header>
      {(tonight || heat) && (
        <div class={`info-card ${good ? 'good' : 'warn'}`}>
          {tonight && <div>{tonight}</div>}
          {heat && <div>{heat}</div>}
        </div>
      )}
      {isDraftNight(s) && (
        <section class="ev-sec">
          <div class="ev-lab"><b class="tk-label">{offers.length ? 'Build one upgrade tonight' : 'Your upgrades'}</b><span>Built {pl.upgrades.length} of {MAX_UPGRADES}</span></div>
          {/* The offers as cards in a row that swipes sideways: tap one to choose it, then build it with the main button. */}
          {offers.length > 0 && (
            <div class="uo-row" role="group" aria-label="Upgrades on offer">
              {offers.map((u) => <UpgradePick id={u} chosen={pick === u} why={canUpgrade(s, p, u)} onPick={onPick ? () => onPick(pick === u ? null : u) : undefined} onOpen={onOpen ? () => onOpen(u) : undefined} />)}
            </div>
          )}
          {offers.length > 0 && <p class="ev-hint">{swipeHint(offers)}</p>}
          {pl.upgrades.length > 0 && <div class="owned-row">Built: {pl.upgrades.map((u) => <span class="chip"><Icon name={UP_ICON[u]} size={16} /> {UPGRADES[u].title}</span>)}</div>}
        </section>
      )}
      {pl.trait === 'keeper' && onShade && <ShadePick s={s} p={p} onShade={onShade} />}
      {pl.favours.length > 0 && (
        <section class="ev-sec">
          <div class="ev-lab"><b class="tk-label">Your favours</b><span>{pl.favours.length} of {handLimit(pl)} held</span></div>
          <FavourRow s={s} p={p} phase="evening" onCard={onCard} />
        </section>
      )}
      <EveningTomorrow s={s} p={p} />
    </div>
  );
}

/** Shade Cloth: pick tonight's fruit. Until you choose, the suggested fruit (the one with most to lose) is used. */
function ShadePick({ s, p, onShade }: { s: GameState; p: number; onShade: (f: FruitId | null) => void }) {
  const pl = s.players[p];
  const chosen = pl.shade === undefined ? shadePick(s, p) : pl.shade;
  return (
    <section class="ev-sec ev-shade">
      <div class="ev-lab"><b class="tk-label">Shade Cloth</b></div>
      <p class="ev-hint">Name one fruit: none of your pieces of it age tonight.{pl.shade === undefined && chosen ? ` Suggested: ${FRUIT[chosen].plural.toLowerCase()}.` : ''}</p>
      <div class="seg small shade-pick" role="radiogroup" aria-label="Fruit to keep from ageing tonight">
        {LANES.map((f) => (
          <button type="button" role="radio" aria-checked={chosen === f} class={chosen === f ? 'on' : ''} aria-label={FRUIT[f].plural} onClick={() => onShade(f)}><Fruit id={f} size={20} /></button>
        ))}
        <button type="button" role="radio" aria-checked={chosen === null} class={chosen === null ? 'on' : ''} onClick={() => onShade(null)}>None</button>
      </div>
    </section>
  );
}

/** What the evening sheet keeps while it is away for a moment (the table is busy for a frame or two after a choice,
 *  and the sheet is drawn afresh): the offer chosen and how far the sheet was scrolled, for this stall's evening. */
export interface EveningKept { key: string; pick: UpgradeId | null; scroll: number }
let kept: EveningKept | null = null;
/**
 * The note taken at a choice or a scroll. Only the sheet on the table speaks (`el`): one that has left is scrolled
 * once more as its picture slides away (sheet.ts), and by then it has no place to tell, so the note stays as it was.
 */
export function eveningKept(was: EveningKept | null, key: string, pick: UpgradeId | null, el: { scrollTop: number } | null): EveningKept | null {
  return el ? { key, pick, scroll: el.scrollTop } : was;
}

/** How many steps closer the evening sheet may be drawn before it scrolls (sheets.css, data-tight). */
export const EVENING_STEPS = 4;
/** How much taller the bar is with two buttons in it (sheets.css, data-two): the room kept for the second one. */
const TWO_BUTTONS = 54;
/**
 * How much the evening sheet holds. Its parts are spread to fill the sheet (tomorrow's line lies at its foot), so the
 * sheet's own measure never says how much room is left over: that is taken off here, from the parts themselves.
 */
function eveningHolds(el: HTMLElement): Holding {
  return {
    clientHeight: el.clientHeight,
    get scrollHeight() {
      const panel = el.firstElementChild;
      if (!(panel instanceof HTMLElement)) return el.scrollHeight;
      const st = getComputedStyle(panel);
      let used = (parseFloat(st.paddingTop) || 0) + (parseFloat(st.paddingBottom) || 0) + (parseFloat(st.rowGap) || 0) * Math.max(0, panel.children.length - 1);
      for (const part of Array.from(panel.children)) used += part.getBoundingClientRect().height;
      return el.scrollHeight - Math.max(0, panel.clientHeight - used);
    },
  };
}

/**
 * The evening's sheet on the game table (PLAN-084): the evening laid over everything under the top bar, with its
 * buttons in the action bar's place. One main button: it builds the chosen upgrade ("Build Order Book · $3", beside
 * "Lights out without building"), or, with nothing chosen, it is "Lights out". The evening never ends by itself.
 */
export function EveningSheet({ s, p, onUpgrade, onCard, onShade, onDone }: {
  s: GameState; p: number; onUpgrade: (u: UpgradeId) => void; onCard: (i: number) => void;
  onShade?: (f: FruitId | null) => void;
  /** Lights out: this stall's evening is over. */
  onDone: () => void;
}) {
  const key = `${s.config.seed}:${s.day}:${p}`;
  const [pick, setPick] = useState<UpgradeId | null>(() => (kept?.key === key ? kept.pick : null));
  const root = useRef<HTMLDivElement>(null);
  // Only an offer that can be built now stays chosen (the cash or the offers may have changed).
  const chosen = pick && isDraftNight(s) && offersTonight(s, p).includes(pick) && canUpgrade(s, p, pick) === null ? pick : null;
  // A night with more to show than the sheet holds is drawn closer, a step at a time (sheets.css, data-tight), before
  // it scrolls. While an offer can still be chosen, room is kept for the second button, so choosing one never changes
  // the step. A night that still scrolls says so at its foot (data-more) until its end is in view.
  const canBuild = isDraftNight(s) && offersTonight(s, p).some((u) => canUpgrade(s, p, u) === null);
  const more = () => { const el = root.current; if (el) el.toggleAttribute('data-more', el.scrollHeight - el.scrollTop - el.clientHeight > 4); };
  useReach(root, 'beats', true, true, (el) => { drawCloser(el, eveningHolds(el), EVENING_STEPS, canBuild && !chosen ? TWO_BUTTONS : 0); more(); });
  useLayoutEffect(more, [chosen]);
  const keep = (next: UpgradeId | null) => { kept = eveningKept(kept, key, next, root.current); };
  useLayoutEffect(() => {
    // Back after a moment away: at the place it was scrolled to.
    if (kept?.key === key && kept.scroll > 0 && root.current) root.current.scrollTop = kept.scroll;
  }, []);
  // Drawn compact (the closest step), an offer shows one line of its text: choosing it opens its whole card.
  const [open, setOpen] = useState<UpgradeId | null>(null);
  const choose = (u: UpgradeId | null) => {
    setPick(u);
    keep(u);
    if (u && root.current?.dataset.tight === String(EVENING_STEPS)) setOpen(u);
  };
  const build = () => {
    if (!chosen) return;
    // Where the card lies now: it travels from there to the stall once it is built (dayBeats.ts).
    noteOffer(p, chosen, boxOf(root.current?.querySelector(`[data-up="${chosen}"]`)));
    keep(null);
    onUpgrade(chosen);
  };
  return (
    <>
      {/* With an upgrade chosen the bar holds two buttons. It grows upward over the sheet's foot, never downward:
          the table's rows under the sheet keep their places (sheets.css, data-two). */}
      <div class="mid-panel mid-evening fm-sheet sh-evening" data-two={chosen ? '' : undefined} ref={root} onScroll={() => { keep(chosen); more(); }}>
        <EveningPanel s={s} p={p} onCard={(i) => { keep(chosen); onCard(i); }} onShade={onShade ? (f) => { keep(chosen); onShade(f); } : undefined} pick={chosen} onPick={choose} onOpen={setOpen} />
        <i class="ev-more" aria-hidden="true" />
      </div>
      {/* Only the main button is a `.btn` (the browser tests press that one). */}
      <div class="pp-lock ev-lock" data-two={chosen ? '' : undefined}>
        {chosen ? (
          <>
            <button type="button" class="btn primary wide big" onClick={build}>Build {UPGRADES[chosen].title} · ${UPGRADES[chosen].cost}</button>
            <button type="button" class="ev-out" onClick={onDone}>Lights out without building</button>
          </>
        ) : <button type="button" class="btn primary wide big" onClick={onDone}>Lights out <small class="btn-sub">next day</small></button>}
      </div>
      {/* The whole card of a compact offer, opened over the table like a favour card: a tap beside it closes it too. */}
      {open && (
        <div class="cd-pop ev-card" role="dialog" aria-label={`Upgrade: ${UPGRADES[open].title}`} onClick={() => setOpen(null)}>
          <div class="cd-pop-in" onClick={(e) => e.stopPropagation()}>
            <UpgradeCard id={open} eager />
            {/* why it cannot be built now, in the game's words (as an opened favour card says why it cannot be played) */}
            {canUpgrade(s, p, open) && <p class="cd-pop-why">{canUpgrade(s, p, open)}</p>}
            <div class="cd-pop-btns"><button type="button" class="btn ghost" onClick={() => setOpen(null)}>Close</button></div>
          </div>
        </div>
      )}
    </>
  );
}

export { Coin };
