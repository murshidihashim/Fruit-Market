// Table animations: the morning delivery, buying, selling and nightfall.
// Each one returns when its animation has finished. They only draw; they never change the game.
import { FAVOURS, FRUIT, FRUITS, JUICE_VALUE, UPGRADES, type FruitId } from '../../engine/data';
import { leavingTonight, nightOutlook, type GameState, type LineResult } from '../../engine/game';
import { customerReaction, explainLine, rivalReaction, rushLine } from '../../engine/story';
import { Coin, Fruit } from '../art';
import * as A from '../anim';
import { holdCash, payCash, shownCash } from '../cashShown';
import { releaseStock, sellStock } from '../stockShown';
import { fx } from '../fx';
import type { ShowState } from './panels/Showdown';
import { rushPace, rushSeats } from './rush';

/** The lorry unloads today's delivery into the market: played as buying starts, after the morning's event card (PLAN-065). */
export async function delivery(g: GameState) {
  if (g.phase !== 'morning' && g.phase !== 'buy') return;
  const jobs: Promise<void>[] = [];
  // Let the lorry pull up (its drive-in is CSS, about 0.9 s), then unload into each fruit's slot.
  if (A.find('lorry')) await A.wait(650);
  let d = 0;
  for (const f of FRUITS) {
    const n = Math.min(g.delivery[f] ?? 0, 4);
    const unripe = g.deliveryUnripe === f;
    const pos = unripe ? g.market[f].length - 1 : FRUIT[f].ripe.length - 1;
    for (let i = 0; i < n; i++) {
      jobs.push(A.fly(['lorry', 'sky'], [`m-${f}-${pos}`, `mk-${f}`, 'truck'], <Fruit id={f} size={26} stage={unripe ? 'unripe' : 'fresh'} />, { delay: d, duration: 600 }));
      d += 70;
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
        d += 90;
      }
    }
  }
  next.players.forEach((pl, i) => {
    const before = prev.players[i];
    if (pl.favours.length < before.favours.length) {
      const played = before.favours.find((id, k) => pl.favours[k] !== id) ?? before.favours[before.favours.length - 1];
      const t = A.tag(`p${i}`, `${FAVOURS[played].title}!`, 'favour');
      fx.card();
      jobs.push(A.wait(1100).then(() => t.remove()));
    }
    if (pl.upgrades.length > before.upgrades.length) {
      const u = pl.upgrades[pl.upgrades.length - 1];
      const t = A.tag(`p${i}`, `Built: ${UPGRADES[u].title}`, 'upgrade');
      A.floatText(`p${i}-cash`, `−$${UPGRADES[u].cost}`, 'minus');
      fx.coin();
      jobs.push(A.wait(1100).then(() => t.remove()));
    }
    const gained = pl.cash - before.cash;
    if (gained > 0 && pl.favours.length < before.favours.length) A.floatText(`p${i}-cash`, `+$${gained}`);
  });
  if (jobs.length && d > 0) fx.buy();
  await Promise.all(jobs);
}

/**
 * One customer's sale: fruit flies from each stall that sold to the customer, coins fly back to the stall's cash.
 * In the rush pop-up (`pop`) the fruit leaves the stall's card around the customer and lands on the customer's card.
 */
export async function flights(_g: GameState, l: LineResult, pop = false) {
  const jobs: Promise<void>[] = [];
  const cust = pop ? ['rs-card', `c${l.customerId}`] : [`c${l.customerId}-${l.fruit}`, `c${l.customerId}`];
  for (const o of l.offers) {
    if (!o.sold) continue;
    const from = pop ? [`rs-p${o.player}`, `p${o.player}`] : [`p${o.player}-${l.fruit}`, `p${o.player}`];
    for (let k = 0; k < Math.min(o.sold, 4); k++) {
      jobs.push(A.fly(from, cust, <Fruit id={l.fruit} size={28} />, { delay: k * 90 }));
    }
    for (let k = 1; k < Math.min(3, o.sold + 1); k++) jobs.push(A.fly(cust, `p${o.player}-cash`, <Coin size={22} />, { delay: 380 + k * 110, duration: 480 }));
    jobs.push(A.fly(cust, `p${o.player}-cash`, <Coin size={26} />, { delay: 380, duration: 480 }).then(() => {
      // This customer's payment lands now, so the stall's total climbs here and not before, and the pieces leave its shelf.
      const paid = o.sold * o.price + (o.juice ?? 0);
      fx.coin();
      A.floatText(`p${o.player}-cash`, `+$${paid}`);
      void payCash(o.player, paid);
      sellStock(o.player, l.fruit, o.sold);
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

export async function reveal(g: GameState, viewer: number, setShow: (a: ShowState | null) => void, setBell?: (on: boolean) => void) {
  const r = g.results!;
  const lines = r.lines.filter((l) => l.offers.length > 0);
  if (!lines.length) {
    const t = A.tag('street', 'No sales today', 'big');
    await A.wait(1100);
    t.remove();
    return;
  }
  // The bell (rules 15): every crate opens with its prices. They stay on the table long enough to read, then the rush starts.
  setBell?.(true);
  fx.card();
  await A.wait(1500 + 350 * g.players.length);
  setBell?.(false);
  // Routine sales (one rival, no contest, not you) settle together; showdowns get the stage.
  const shows = lines.filter((l) => explainLine(g, l, viewer).showdown);
  const routine = lines.filter((l) => !shows.includes(l));
  if (routine.length) await Promise.all(routine.map((l, i) => A.wait(i * 120).then(() => flights(g, l))));
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
    await A.wait(800);
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
  if (tipped) { fx.coin(); await A.wait(500); }
  holdCash(null);
}

export async function nightfall(g: GameState, setNight: (on: boolean) => void) {
  setNight(true);
  fx.night();
  // The night panel (NightShift) slides every piece one box older before the spoiled ones drop (PLAN-071). The slide
  // starts after 0.6 s and takes 1.5 s, slow enough to watch each piece move (PLAN-076).
  await A.wait(700);
  await A.hold(2300);
  const heat = g.event?.ageExtra ?? 0;
  const jobs: Promise<void>[] = [];
  let d = 0;
  const spoil = (anchor: string[], f: FruitId, n: number) => {
    for (let k = 0; k < Math.min(n, 3); k++) { jobs.push(A.drop(anchor, <Fruit id={f} size={26} stage="notso" />, d)); d += 80; }
  };
  // A Juice Bar's pieces fly to the cash as coins instead of rotting (one sprite each, like the drop they replace).
  const juice = (p: number, f: FruitId, n: number) => {
    for (let k = 0; k < n; k++) { jobs.push(A.fly([`p${p}-${f}`, `p${p}`], `p${p}-cash`, <Coin size={22} />, { delay: d, duration: 480 })); d += 80; }
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
  await A.wait(400);
}
