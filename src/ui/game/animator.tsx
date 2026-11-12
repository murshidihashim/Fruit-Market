// Table animations: the morning delivery, buying, selling and nightfall.
// Each one returns when its animation has finished. They only draw; they never change the game.
// Every length is named in ../motion.ts (BEAT); pauses to read use A.hold, which reduced motion keeps.
import { FAVOURS, FRUIT, FRUITS, JUICE_VALUE, type FruitId } from '../../engine/data';
import { leavingTonight, nightOutlook, type GameState, type LineResult } from '../../engine/game';
import { customerReaction, explainLine, rivalReaction, rushLine } from '../../engine/story';
import { Coin, Fruit } from '../art';
import * as A from '../anim';
import { holdCash, payCash, shownCash } from '../cashShown';
import { releaseStock, sellStock } from '../stockShown';
import { fx } from '../fx';
import type { ShowState } from './panels/Showdown';
import { built, firstInLine } from './dayBeats';
import { rushPace, rushSeats } from './rush';

/** The lorry unloads today's delivery into the market: played as buying starts, after the morning's event card (PLAN-065). */
export async function delivery(g: GameState) {
  if (g.phase !== 'morning' && g.phase !== 'buy') return;
  const jobs: Promise<void>[] = [];
  // No lorry is drawn today, so nothing waits for one to pull up (PLAN-081): the fruit leaves for the lanes at once.
  let d = 0;
  for (const f of FRUITS) {
    const n = Math.min(g.delivery[f] ?? 0, 4);
    const unripe = g.deliveryUnripe === f;
    const pos = unripe ? g.market[f].length - 1 : FRUIT[f].ripe.length - 1;
    for (let i = 0; i < n; i++) {
      jobs.push(A.fly(['lorry', 'sky'], [`m-${f}-${pos}`, `mk-${f}`, 'truck'], <Fruit id={f} size={26} stage={unripe ? 'unripe' : 'fresh'} />, { delay: d, duration: A.BEAT.lorry.fly }));
      d += A.BEAT.lorry.gap;
    }
  }
  if (jobs.length) fx.card();
  await Promise.all(jobs);
}

export async function moves(prev: GameState, next: GameState) {
  const jobs: Promise<void>[] = [];
  let d = 0;
  for (const f of FRUITS) {
    for (let pos = 0; pos < next.market[f].length; pos++) {
      const diff = prev.market[f][pos] - next.market[f][pos];
      if (!diff) continue;
      // Whose shelf changed. A rival's shelf is secret (rules 15: online it is not even sent), but buying is done in the
      // open, so the piece still flies to the stall whose turn it was.
      let p = next.players.findIndex((pl, i) => pl.stock[f][pos] !== prev.players[i].stock[f][pos]);
      if (p < 0 && prev.phase === 'buy') p = prev.order[prev.turn] ?? -1;
      if (p < 0) continue;
      for (let k = 0; k < Math.min(Math.abs(diff), 5); k++) {
        const node = <Fruit id={f} size={30} stage={pos >= FRUIT[f].ripe.length ? 'unripe' : undefined} />;
        if (diff > 0) jobs.push(A.fly([`m-${f}-${pos}`, `mk-${f}`, `cart-${f}`], [`p${p}-${f}`, `p${p}`], node, { delay: d }));
        else jobs.push(A.fly([`p${p}-${f}`, `p${p}`], [`m-${f}-${pos}`, `mk-${f}`, `cart-${f}`], node, { delay: d }));
        d += A.BEAT.piece.gap;
      }
    }
  }
  next.players.forEach((pl, i) => {
    const before = prev.players[i];
    if (pl.favours.length < before.favours.length) {
      const played = before.favours.find((id, k) => pl.favours[k] !== id) ?? before.favours[before.favours.length - 1];
      const t = A.tag(`p${i}`, `${FAVOURS[played].title}!`, 'favour');
      fx.card();
      jobs.push(A.hold(A.BEAT.label.read).then(() => t.remove()));
    }
    // An upgrade built (PLAN-084): its price travels to the market as coins and, for your own, the card travels from
    // its offer to your stall, where its mark lands on the shelf dock (dayBeats.tsx).
    if (pl.upgrades.length > before.upgrades.length) jobs.push(built(i, pl.upgrades[pl.upgrades.length - 1]));
    const gained = pl.cash - before.cash;
    if (gained > 0 && pl.favours.length < before.favours.length) A.floatText(`p${i}-cash`, `+$${gained}`);
  });
  // Priority played (PLAN-084): that stall's mark goes to the front of tomorrow's line.
  if (next.priorityNext !== null && prev.priorityNext === null) jobs.push(firstInLine(next, next.priorityNext));
  if (jobs.length && d > 0) fx.buy();
  await Promise.all(jobs);
}

/**
 * One customer's sale: fruit flies from each stall that sold to the customer, coins fly back to the stall's cash.
 * In the rush pop-up (`pop`) the fruit leaves the stall's card around the customer and lands on the customer's card.
 */
export async function flights(_g: GameState, l: LineResult, pop = false) {
  const jobs: Promise<void>[] = [];
  const sale = A.BEAT.sale;
  const cust = pop ? ['rs-card', `c${l.customerId}`] : [`c${l.customerId}-${l.fruit}`, `c${l.customerId}`];
  for (const o of l.offers) {
    if (!o.sold) continue;
    const from = pop ? [`rs-p${o.player}`, `p${o.player}`] : [`p${o.player}-${l.fruit}`, `p${o.player}`];
    for (let k = 0; k < Math.min(o.sold, 4); k++) {
      jobs.push(A.fly(from, cust, <Fruit id={l.fruit} size={28} />, { delay: k * sale.pieceGap }));
    }
    for (let k = 1; k < Math.min(3, o.sold + 1); k++) jobs.push(A.fly(cust, `p${o.player}-cash`, <Coin size={22} />, { delay: sale.coinAfter + k * sale.coinGap, duration: sale.coin }));
    jobs.push(A.fly(cust, `p${o.player}-cash`, <Coin size={26} />, {
      delay: sale.coinAfter, duration: sale.coin,
      // This customer's payment lands now, so the stall's total climbs here and not before, and the pieces leave its shelf.
      onLand: () => {
        const paid = o.sold * o.price + (o.juice ?? 0);
        fx.coin();
        A.floatText(`p${o.player}-cash`, `+$${paid}`);
        void payCash(o.player, paid);
        sellStock(o.player, l.fruit, o.sold);
      },
    }));
  }
  await Promise.all(jobs);
}

/** With reduced motion nothing flies: each stall that sold is simply paid. */
function payNow(l: LineResult) {
  for (const o of l.offers) {
    if (!o.sold) continue;
    const paid = o.sold * o.price + (o.juice ?? 0);
    A.floatText(`p${o.player}-cash`, `+$${paid}`);
    void payCash(o.player, paid);
    sellStock(o.player, l.fruit, o.sold);
  }
}

/** How long "No sales today" stays up, and how long every open crate stays on the table at the bell, in ms at normal speed. */
export const NO_SALES_READ = A.BEAT.bell.noSales;
export const bellRead = (stalls: number) => A.BEAT.bell.read + A.BEAT.bell.readPerStall * stalls;

export async function reveal(g: GameState, viewer: number, setShow: (a: ShowState | null) => void, setBell?: (on: boolean) => void) {
  const r = g.results!;
  const lines = r.lines.filter((l) => l.offers.length > 0);
  if (!lines.length) {
    const t = A.tag('street', 'No sales today', 'big');
    // A pause to read, so it is kept with reduced motion (PLAN-081: it used to shrink to a twentieth of a second).
    await A.hold(NO_SALES_READ);
    t.remove();
    return;
  }
  // The bell (rules 15): every crate opens with its prices. They stay on the table long enough to read, then the rush
  // starts. A reading pause too: with reduced motion the open crates stay just as long (a tap or Skip still ends it).
  setBell?.(true);
  fx.card();
  await A.hold(bellRead(g.players.length));
  setBell?.(false);
  // Routine sales (one rival, no contest, not you) settle together; showdowns get the stage.
  const shows = lines.filter((l) => explainLine(g, l, viewer).showdown);
  const routine = lines.filter((l) => !shows.includes(l));
  if (routine.length) await Promise.all(routine.map((l, i) => A.wait(i * A.BEAT.sale.routineGap).then(() => flights(g, l))));
  // Skip shows the final shelves at once (the cash still climbs as the remaining coins land).
  if (A.hurried()) releaseStock();
  const used = new Set<string>();
  const served: number[] = [];
  // The rush pop-up, "Round the table" (DEC-068): one customer at a time in the middle, each stall's card dealt face
  // down around them, all flipped together, then the result. About 2 s to read it; a tap on the pop-up moves on,
  // Skip (or a tap anywhere else) hurries the whole rush, and then the rest settle without the pop-up.
  for (let i = 0; i < shows.length; i++) {
    const l = shows[i];
    if (A.hurried()) { releaseStock(); await flights(g, l); continue; }
    A.resetStep();
    // The same result line for everyone at the table (PLAN-068).
    const story = rushLine(g, l);
    const react = rivalReaction(g, l, viewer, used);
    const base = { line: l, n: i + 1, of: shows.length, story, react, cust: customerReaction(g, l.customerId, l.name), served: [...served] };
    const seats = rushSeats(l, viewer, g.players.length).length;
    const pace = rushPace(seats);
    const still = A.isReduced();
    if (!still) {
      setShow({ ...base, stage: 'in', dealt: 0 });
      fx.card();
      await A.wait(pace.in);
      for (let k = 1; k <= seats; k++) {
        setShow({ ...base, stage: 'deal', dealt: k });
        fx.tap();
        await A.wait(pace.deal);
      }
      await A.wait(pace.down);
      setShow({ ...base, stage: 'flip', dealt: seats });
      fx.card();
      await A.wait(pace.flip);
    }
    setShow({ ...base, stage: 'result', dealt: seats });
    if (story.tone === 'good') fx.coin();
    const quips: { remove(): void }[] = [];
    if (react) quips.push(A.tag(`p${react.player}`, react.text, 'quip'));
    await A.frame();
    if (still) payNow(l);
    await Promise.all([still ? Promise.resolve() : flights(g, l, true), A.hold(pace.hold)]);
    for (const q of quips) q.remove();
    served.push(l.customerId);
    setShow({ ...base, stage: 'out', dealt: seats, served: [...served] });
    await A.wait(pace.out);
    A.pulse(`c${l.customerId}`);
  }
  setShow(null);
  releaseStock();
  for (const f of r.favours) {
    const t = A.tag(`p${f.player}`, 'Favour card!', 'favour');
    fx.card();
    await A.hold(A.BEAT.label.favourWon);
    t.remove();
  }
  // Money that was not paid line by line (a Tip Jar's tip, a Haggler's bonus) lands last, then the real totals show again.
  let tipped = false;
  g.players.forEach((pl, p) => {
    const tip = pl.cash - shownCash(p, pl.cash);
    if (tip <= 0) return;
    tipped = true;
    A.floatText(`p${p}-cash`, `+$${tip} bonus`);
    void payCash(p, tip);
  });
  if (tipped) { fx.coin(); await A.hold(A.BEAT.label.bonus); }
  holdCash(null);
}

/**
 * The night panel's slide, set from here so the panel and its slide run on one clock (PLAN-081): null while dusk falls,
 * then the slide's length in ms while every piece moves one box older, then 'done' once the pieces rest in their new boxes.
 */
export type NightSlide = number | 'done' | null;
/** The night's steps in ms at normal speed: dusk falls and the panel rises, every piece slides (slow enough to watch,
 *  PLAN-076), a beat for the last piece to settle, then a moment to read the panel. 3.3 s in all before any spoiled
 *  piece drops, as before. Named in motion.ts with the other lengths. */
export const NIGHT = A.BEAT.night;

export async function nightfall(g: GameState, setNight: (on: boolean) => void, setSlide: (s: NightSlide) => void = () => {}) {
  setSlide(null);
  setNight(true);
  fx.night();
  // The night panel (NightShift) slides every piece one box older before the spoiled ones drop (PLAN-071). The slide
  // is given its length from here and this script waits that long (and a beat more), whatever the speed, so the slide
  // always ends before the panel goes. A tap ends the pause, and the pieces are then shown in their new boxes at once.
  // With reduced motion nothing slides (the stylesheet turns the move off) and the pause is kept, to read the panel.
  await A.wait(NIGHT.dusk);
  setSlide(A.held(NIGHT.slide));
  await A.hold(NIGHT.slide + NIGHT.settle);
  setSlide('done');
  await A.hold(NIGHT.read);
  const heat = g.event?.ageExtra ?? 0;
  const jobs: Promise<void>[] = [];
  let d = 0;
  const spoil = (anchor: string[], f: FruitId, n: number) => {
    for (let k = 0; k < Math.min(n, 3); k++) { jobs.push(A.drop(anchor, <Fruit id={f} size={26} stage="notso" />, d)); d += NIGHT.gap; }
  };
  // A Juice Bar's pieces fly to the cash as coins instead of rotting (one sprite each, like the drop they replace).
  const juice = (p: number, f: FruitId, n: number) => {
    for (let k = 0; k < n; k++) { jobs.push(A.fly([`p${p}-${f}`, `p${p}`], `p${p}-cash`, <Coin size={22} />, { delay: d, duration: NIGHT.juiceCoin })); d += NIGHT.gap; }
  };
  // The engine's own forecast for each shelf, so the picture matches the night (Cold Room, Heatwave, Juice Bar).
  const juiced = g.players.map((_, p) => nightOutlook(g, p).juice);
  const shelves = g.players.map((_, p) => ({ leaving: leavingTonight(g, p), juice: juiced[p] }));
  for (const f of FRUITS) {
    spoil([`cart-${f}`], f, g.market[f][0] + (heat ? g.market[f][1] : 0));
    shelves.forEach((sh, p) => {
      // The juice comes from the first pieces leaving, fruit by fruit (the rules only count how many).
      const j = Math.min(sh.juice, sh.leaving[f]);
      sh.juice -= j;
      juice(p, f, j);
      spoil([`p${p}-${f}`], f, sh.leaving[f] - j);
    });
  }
  await Promise.all(jobs);
  juiced.forEach((n, p) => { if (n) A.floatText(`p${p}-cash`, `+$${n * JUICE_VALUE} juice`); });
  if (juiced.some((n) => n > 0)) fx.coin();
  await A.wait(NIGHT.end);
}
