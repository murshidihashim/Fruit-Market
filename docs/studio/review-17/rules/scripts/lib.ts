// Scenario helpers for the edge-case audit. Everything goes through the real engine functions; states are only
// set up by hand (as the repo's own tests do) and then driven with applyAction / openStall / submitPrices.
import {
  CUSTOMER_CARDS, EVENT_CARDS, FARMER_CARDS, FRUIT, FRUITS, ORDER_CARDS, orderQty, prefOf, stageAt,
  type EventId, type FruitId, type Pref, type TraitId, type UpgradeId, type Want,
} from '/home/user/Fruit-Market/src/engine/data';
import {
  applyAction, emptyStock, endBuyTurn, newGame, openStall, submitPrices, activePlayer,
  type Crate, type Customer, type GameConfig, type GameState, type Post, type Standing,
} from '/home/user/Fruit-Market/src/engine/game';

export const ev = (id: EventId) => structuredClone(EVENT_CARDS.find((e) => e.id === id)!);
export const lorryIdx = (name: string) => FARMER_CARDS.findIndex((c) => c.name === name);
export const evIdx = (id: EventId) => EVENT_CARDS.findIndex((e) => e.id === id);
export const custIdx = (name: string) => CUSTOMER_CARDS.findIndex((c) => c.name === name);

export interface Setup { n: number; days?: number; day?: number; traits?: (TraitId | null)[]; upgrades?: UpgradeId[][]; cash?: number[]; events?: boolean; extra?: Partial<GameConfig> }

/** A fresh game with `n` people, no perks unless given, empty shelves, at the buying step of `day` with buying order 0..n-1. */
export function mk(o: Setup): GameState {
  const cfg: GameConfig = {
    players: Array.from({ length: o.n }, (_, i) => ({ name: `P${i}`, kind: 'human' as const, avatar: '' })),
    days: o.days ?? 10, unripe: true, upgrades: true, events: o.events ?? false, seed: 3, ...(o.extra ?? {}),
  };
  const s = structuredClone(newGame(cfg));
  s.players.forEach((p, i) => {
    p.stock = emptyStock(true);
    p.cash = o.cash?.[i] ?? 10;
    p.trait = o.traits?.[i] ?? null;
    p.traitOffer = [];
    p.upgrades = [...(o.upgrades?.[i] ?? [])];
    p.favours = [];
  });
  s.day = o.day ?? 2;
  s.phase = 'buy';
  s.turn = 0;
  s.order = s.players.map((_, i) => i);
  s.event = null;
  s.forecast = null;
  s.queue = [];
  s.nextForecast = null;
  s.nextQueue = [];
  s.standing = null;
  s.market = emptyStock(true);
  return s;
}

let nextId = 9000;
/** A customer card as the engine makes it. `name` should be a real card name so the type is the printed one, or give `pref`. */
export function cust(name: string, wants: [FruitId, number, number][] | null = null, opt: { walkIn?: boolean; seenBy?: number[]; pref?: Pref; fixed?: boolean } = {}): Customer {
  const card = CUSTOMER_CARDS.find((c) => c.name === name);
  const w: Want[] = wants ? wants.map(([fruit, qty, max]) => ({ fruit, qty, max, ...(opt.fixed ? { fixed: true } : {}) })) : structuredClone(card!.wants);
  const c: Customer = { id: nextId++, name, wants: w, original: structuredClone(w), pref: opt.pref ?? prefOf(name) };
  if (opt.walkIn) { c.walkIn = true; c.seenBy = opt.seenBy ?? []; }
  return c;
}

/** Track for a fruit from a map of position -> count. */
export function track(f: FruitId, at: Record<number, number>): number[] {
  const t = new Array(FRUIT[f].ripe.length + FRUIT[f].unripeSlots).fill(0);
  for (const [k, v] of Object.entries(at)) t[Number(k)] = v;
  return t;
}
export function give(s: GameState, p: number, f: FruitId, at: Record<number, number>): void {
  s.players[p].stock[f] = track(f, at);
}
export const stageName = (f: FruitId, pos: number) => ({ notso: 'Soft', okay: 'Okay', fresh: 'Fresh', unripe: 'Green' }[stageAt(f, pos)]);

/** A standing order held by `holder`, due on `due`. */
export function standing(s: GameState, cardName: string, holder: number, price: number, due: number): Standing {
  const card = ORDER_CARDS.findIndex((c) => c.name === cardName);
  const c = ORDER_CARDS[card];
  return { card, fruit: c.fruit, qty: orderQty(s.players.length), ceiling: c.ceiling, fine: c.fine, due, bids: s.players.map((_, i) => (i === holder ? price : 'pass')), holder, price };
}

/** Ends every stall's buying turn (no purchases) so the crowd arrives: phase 'stall'. */
export function arrive(state: GameState): GameState {
  let s = state;
  for (const p of [...s.order]) s = endBuyTurn(s, p);
  return s;
}

/** Opens every stall with its whole shelf of ripe fruit (or the given crates), then posts prices, and returns the state at the reveal. */
export function bell(state: GameState, prices: Partial<Record<FruitId, number>>[], opt: { crates?: (Crate | 'all' | 'none')[]; favoured?: boolean[] } = {}): GameState {
  let s = state;
  if (s.phase === 'buy') s = arrive(s);
  const n = s.players.length;
  for (let p = 0; p < n; p++) {
    const want = opt.crates?.[p] ?? 'all';
    let crate: Crate = {};
    if (want === 'all') for (const f of FRUITS) { const t = s.players[p].stock[f].map((c, i) => (i < FRUIT[f].ripe.length ? c : 0)); if (t.some((c) => c > 0)) crate[f] = t; }
    else if (want !== 'none') crate = want;
    s = openStall(s, p, {}, crate);
  }
  while (s.phase === 'bid') {
    const p = activePlayer(s);
    const posts: Post[] = Object.entries(prices[p] ?? {}).map(([fruit, price]) => ({ fruit: fruit as FruitId, price: price as number }));
    if (opt.favoured?.[p]) { s = structuredClone(s); if (!s.players[p].favours.includes('favouredTrade')) s.players[p].favours.push('favouredTrade'); }
    s = submitPrices(s, p, posts, !!opt.favoured?.[p]);
  }
  return s;
}

/** One line per sale of the day, in the order served. */
export function sales(s: GameState): string[] {
  const out: string[] = [];
  for (const l of s.results!.lines) {
    const parts = l.offers.map((o) => `P${o.player} posts ${o.price}${o.tooOld ? ' (nothing eligible)' : ''}: sold ${o.sold}${o.juice ? ` (+${o.juice} juice)` : ''} [freshest pos ${o.freshness}]`);
    out.push(`  ${l.name} wants ${l.want} ${l.fruit} (top ${l.max}): ${parts.join(' | ') || 'no offers'}`);
  }
  if (s.results!.order) { const o = s.results!.order; out.push(`  ORDER ${o.name}: holder P${o.holder} bid ${o.price}; sales ${o.sales.map((x) => `P${x.player} x${x.n} @${x.price}`).join(', ') || 'none'}; short ${o.short}; fine paid ${o.fine}`); }
  if (s.results!.hawker) out.push(`  HAWKER: ${s.results!.hawker.map((h) => `P${h.player} ${h.fruit} @${h.price}`).join(', ')}`);
  if (s.results!.earful) out.push(`  SHARP EARS tips: ${s.results!.earful.map((h) => `P${h.player} from ${h.customer} +${h.tip}`).join(', ')}`);
  if (s.results!.favours.length) out.push(`  FAVOURS: ${s.results!.favours.map((h) => `P${h.player} for ${h.customer}: ${h.favour}`).join(', ')}`);
  out.push(`  income ${JSON.stringify(s.results!.income)}; cash now ${JSON.stringify(s.players.map((p) => p.cash))}; happy [${s.results!.happy.join(', ')}]; left [${s.results!.leftAngry.join(', ')}]`);
  return out;
}

/** Runs the evening (everyone passes) and the night; returns the state on the next morning (or 'over'). */
export function toNextMorning(state: GameState): GameState {
  let s = state;
  if (s.phase === 'reveal') s = applyAction(s, 0, { kind: 'finish' });
  let guard = 0;
  while (s.phase === 'evening' && guard++ < 20) s = applyAction(s, activePlayer(s), { kind: 'endEvening' });
  return s;
}

/** Runs `fn`; prints the rule error instead of throwing. */
export function attempt<T>(label: string, fn: () => T): T | null {
  try { return fn(); } catch (e) { console.log(`  ${label}: REFUSED: ${(e as Error).message}`); return null; }
}

export const shelf = (s: GameState, p: number) => FRUITS.map((f) => `${f[0]}[${s.players[p].stock[f].join(',')}]`).join(' ');
export const H = (t: string) => console.log(`\n=== ${t} ===`);
export const say = (...a: unknown[]) => console.log(...a);
