// Table animations: the morning delivery, buying, selling and nightfall.
// Each one returns when its animation has finished. They only draw; they never change the game.
import { FAVOURS, FRUIT, FRUITS, UPGRADES, type FruitId } from '../../engine/data';
import { notSoCount, type GameState, type LineResult } from '../../engine/game';
import { customerReaction, explainLine, rivalReaction } from '../../engine/story';
import { Coin, Fruit } from '../art';
import * as A from '../anim';
import { fx } from '../fx';
import type { ShowState } from './panels/Showdown';

export async function delivery(g: GameState) {
  if (g.phase !== 'morning') return;
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
      const p = next.players.findIndex((pl, i) => pl.stock[f][pos] !== prev.players[i].stock[f][pos]);
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

export async function flights(g: GameState, l: LineResult) {
  const jobs: Promise<void>[] = [];
  for (const o of l.offers) {
    if (!o.sold) continue;
    for (let k = 0; k < Math.min(o.sold, 4); k++) {
      jobs.push(A.fly([`p${o.player}-${l.fruit}`, `p${o.player}`], [`c${l.customerId}-${l.fruit}`, `c${l.customerId}`], <Fruit id={l.fruit} size={28} />, { delay: k * 90 }));
    }
    for (let k = 1; k < Math.min(3, o.sold + 1); k++) jobs.push(A.fly([`c${l.customerId}`], `p${o.player}-cash`, <Coin size={22} />, { delay: 380 + k * 110, duration: 480 }));
    jobs.push(A.fly([`c${l.customerId}`], `p${o.player}-cash`, <Coin size={26} />, { delay: 380, duration: 480 }).then(() => {
      fx.coin();
      const tip = g.players[o.player].upgrades.includes('signboard') ? o.sold : 0;
      A.floatText(`p${o.player}-cash`, `+$${o.sold * o.price + tip + (o.juice ?? 0)}`);
    }));
  }
  await Promise.all(jobs);
}

export async function reveal(g: GameState, viewer: number, setShow: (a: ShowState | null) => void) {
  const r = g.results!;
  const lines = r.lines.filter((l) => l.offers.length > 0);
  if (!lines.length) {
    const t = A.tag('street', 'No sales today', 'big');
    await A.wait(1100);
    t.remove();
    return;
  }
  // Routine sales (one rival, no contest, not you) settle together; showdowns get the stage.
  const shows = lines.filter((l) => explainLine(g, l, viewer).showdown);
  const routine = lines.filter((l) => !shows.includes(l));
  if (routine.length) await Promise.all(routine.map((l, i) => A.wait(i * 120).then(() => flights(g, l))));
  const used = new Set<string>();
  for (let i = 0; i < shows.length; i++) {
    const l = shows[i];
    const story = explainLine(g, l, viewer);
    const react = rivalReaction(g, l, viewer, used);
    const base = { line: l, n: i + 1, of: shows.length, story, react, cust: customerReaction(g, l.customerId, l.name) };
    setShow({ ...base, stage: 'intro', shown: 0 });
    A.pulse(`c${l.customerId}`);
    fx.card();
    await A.wait(380);
    for (let k = 1; k <= l.offers.length; k++) {
      setShow({ ...base, stage: 'reveal', shown: k });
      fx.tap();
      await A.wait(240);
    }
    setShow({ ...base, stage: 'result', shown: l.offers.length });
    if (story.tone === 'good') fx.coin();
    const tags: { remove(): void }[] = [];
    if (react) tags.push(A.tag(`p${react.player}`, react.text, 'quip'));
    await flights(g, l);
    await A.wait(story.detail ? 1100 : 800);
    tags.forEach((t) => t.remove());
  }
  setShow(null);
  for (const f of r.favours) {
    const t = A.tag(`p${f.player}`, 'Favour card!', 'favour');
    fx.card();
    await A.wait(800);
    t.remove();
  }
}

export async function nightfall(g: GameState, setNight: (on: boolean) => void) {
  setNight(true);
  fx.night();
  await A.wait(500);
  const heat = g.event?.ageExtra ?? 0;
  const fines: { t: { remove(): void } }[] = [];
  if (g.event?.inspector) {
    g.players.forEach((pl, p) => {
      const paid = Math.min(pl.cash, notSoCount(pl.stock) * g.event!.inspector!);
      if (paid) { fines.push({ t: A.tag(`p${p}`, `🕵️ fined $${paid}`, 'lost-fine') }); A.floatText(`p${p}-cash`, `−$${paid}`, 'minus'); }
    });
  }
  const jobs: Promise<void>[] = [];
  let d = 0;
  const spoil = (anchor: string[], f: FruitId, n: number) => {
    for (let k = 0; k < Math.min(n, 3); k++) { jobs.push(A.drop(anchor, <Fruit id={f} size={26} stage="notso" />, d)); d += 80; }
  };
  for (const f of FRUITS) {
    spoil([`cart-${f}`], f, g.market[f][0] + (heat ? g.market[f][1] : 0));
    g.players.forEach((pl, p) => {
      const room = pl.upgrades.includes('coolroom');
      const steps = (room && g.day % 2 === 1 ? 0 : 1) + (room ? 0 : heat);
      const n = steps === 0 ? 0 : pl.stock[f][0] + (steps > 1 ? pl.stock[f][1] : 0);
      spoil([`p${p}-${f}`], f, n);
    });
  }
  await Promise.all(jobs);
  await A.wait(400);
  fines.forEach((f) => f.t.remove());
}
