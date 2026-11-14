import { afterEach, describe, expect, it, vi } from 'vitest';
import { readFileSync } from 'node:fs';
import { h } from 'preact';
import { aiActFor } from '../src/engine/ai';
import { EVENT_CARDS, MAX_UPGRADES, ORDER_CARDS, RIVALS, TOP_UP, UPGRADES, type UpgradeId } from '../src/engine/data';
import { activePlayer, applyAction, beginBuying, bidOrder, buyUpgrade, emptyStock, finishReveal, newGame, publicView, type GameState } from '../src/engine/game';
import * as A from '../src/ui/anim';
import { toStaticHtml } from '../src/ui/cards';
import { holdCash, payCash, shownCash, takeCash } from '../src/ui/cashShown';
import { COINS, beforeDawn, bidsIn, bidsTurned, built, coinShares, dawnCoins, holdBack, noteOffer, takeDawn, type OrderShow } from '../src/ui/game/dayBeats';
import { TIGHTEST, closer, dawnLines, fineLine, topUpLine, type Fitting } from '../src/ui/game/panels/MorningCard';
import { BID_STEPS, BidStatus, canGetLine } from '../src/ui/game/panels/OrderPanel';
import { drawCloser, reachFrom, type Holding, type ReachBoxes, type Stepped } from '../src/ui/game/reach';
import { BEAT, FEEL } from '../src/ui/motion';
import { EVENING_STEPS, EveningPanel, EveningTomorrow, daySoldLine, eveningKept, offersTonight, swipeHint } from '../src/ui/panel';

// PLAN-084 (package 3, part 1): the morning, the standing-order bid and the evening as sheets laid on the table, and
// their beats: coins at dawn, the bids turned over with the stake put on the card, a built upgrade and its price.

const read = (f: string) => readFileSync(f, 'utf8');

/** A four-stall game with a person in seat 0 (three computer stalls). */
const game = (seed: number): GameState => newGame({
  players: [{ name: 'Mia', kind: 'human', avatar: RIVALS[0].avatar }, ...RIVALS.slice(1, 4).map((r) => ({ name: r.name, kind: 'ai' as const, level: 'normal' as const, avatar: r.avatar }))],
  days: 10, unripe: true, upgrades: true, events: true, marketDays: true, seed,
});
/** One step, with the computer playing every seat (the person's too). */
function step(s: GameState): GameState {
  if (s.phase === 'morning') return beginBuying(s);
  if (s.phase === 'reveal') return finishReveal(s);
  const n = aiActFor(s, activePlayer(s));
  if (!n) throw new Error(`stuck in ${s.phase}`);
  return n;
}
/** Plays on until `stop` says so. */
function playTo(stop: (s: GameState) => boolean, seed = 1): GameState {
  let s = game(seed);
  for (let i = 0; i < 6000 && s.phase !== 'over'; i++) {
    if (stop(s)) return s;
    s = step(s);
  }
  throw new Error('never reached');
}

/** Timers and the frame clock are faked; there is no page, so nothing is found to fly from or to (the beats then only
 *  wait and make their calls, which is what these tests time). */
function fakeClock(reducedMotion: boolean) {
  vi.useFakeTimers();
  vi.stubGlobal('matchMedia', () => ({ matches: reducedMotion }));
  vi.stubGlobal('requestAnimationFrame', (cb: () => void) => setTimeout(cb, 0));
  A.setBaseSpeed(false);
  A.resetHurry();
}
afterEach(() => { holdCash(null); A.setBaseSpeed(false); A.resetHurry(); vi.useRealTimers(); vi.unstubAllGlobals(); });

/** The evening before a dawn with a fine and a top-up: seat 0 (an empty shelf and $2) is topped up, seat 1 is fined
 *  by the Health Inspector. Seat 0 is the last stall to tap "Lights out". */
function beforeAFineAndATopUp(): { prev: GameState; next: GameState } {
  const s = structuredClone(game(5));
  s.players.forEach((p) => { p.stock = emptyStock(true); p.favours = []; p.upgrades = []; });
  s.players[0].cash = 2;
  s.players[1].cash = 9; s.players[1].stock.apple[1] = 2; // two Okay apples, Soft at dawn
  s.players[2].stock.apple[2] = 1;
  s.players[3].stock.apple[2] = 1;
  s.day = 4; s.phase = 'evening'; s.event = null; s.results = null;
  s.order = [1, 2, 3, 0]; s.turn = 3;
  s.eventDeck = [EVENT_CARDS.findIndex((x) => x.id === 'inspector'), ...s.eventDeck];
  const next = applyAction(s, 0, { kind: 'endEvening' });
  return { prev: s, next };
}

describe('coins carry a payment (dayBeats.tsx)', () => {
  it('at most five coins travel, and their shares add up to the sum', () => {
    expect(COINS).toBe(5);
    expect(coinShares(3)).toEqual([1, 1, 1]);
    expect(coinShares(5)).toEqual([1, 1, 1, 1, 1]);
    expect(coinShares(7)).toEqual([2, 2, 1, 1, 1]);
    expect(coinShares(12)).toEqual([3, 3, 2, 2, 2]);
    expect(coinShares(0)).toEqual([]);
    for (let n = 1; n <= 40; n++) {
      const shares = coinShares(n);
      expect(shares.length).toBe(Math.min(n, 5));
      expect(shares.reduce((a, b) => a + b, 0)).toBe(n);
    }
  });

  it('money leaving a stall counts the shown total down, as money arriving counts it up', async () => {
    holdCash([10, 10]);
    await takeCash(0, 4);
    expect(shownCash(0, 99)).toBe(6);
    await payCash(1, 3);
    expect(shownCash(1, 99)).toBe(13);
    await takeCash(0, 0);
    expect(shownCash(0, 99)).toBe(6);
    holdCash(null);
    // not held: nothing to count, the real total shows
    await takeCash(0, 4);
    expect(shownCash(0, 99)).toBe(99);
  });

  it('a coin takes 360 ms and the next leaves 60 ms later: five coins are done in about 0.6 s', () => {
    expect(FEEL.coin).toBe(360);
    expect(BEAT.coins.gap).toBe(60);
    expect(FEEL.coin + (COINS - 1) * BEAT.coins.gap).toBeLessThanOrEqual(700);
  });
});

describe('coins at dawn: the top-up and the fine (PLAN-084)', () => {
  const { prev, next } = beforeAFineAndATopUp();

  it('the game has fined one stall and topped up another by the time the morning shows', () => {
    expect(next.day).toBe(prev.day + 1);
    expect(next.phase).toBe('morning');
    expect(next.event?.id).toBe('inspector');
    expect(next.dayFines).toEqual([0, 4, 0, 0]);
    expect(next.dayTopUps).toEqual([TOP_UP - 2, 0, 0, 0]);
  });

  it('every total is held at what it was before dawn until the coins travel', () => {
    expect(beforeDawn(next)).toEqual(next.players.map((pl, i) => pl.cash - (next.dayTopUps![i] ?? 0) + (next.dayFines![i] ?? 0)));
    expect(beforeDawn(next)!.slice(0, 2)).toEqual([2, 9]);
    // a morning on which dawn changed nobody's cash holds nothing back
    expect(beforeDawn(game(3))).toBeNull();
    expect(holdBack(prev, next)).toBeNull();
    expect(shownCash(0, next.players[0].cash)).toBe(2);
    expect(shownCash(1, next.players[1].cash)).toBe(9);
    // the morning sheet takes the held totals once, as it comes onto the table
    expect(takeDawn(next)).toEqual(beforeDawn(next));
    expect(takeDawn(next)).toBeNull();
  });

  it('a saved game opened on a morning plays no coins (nothing was held back for it)', () => {
    expect(takeDawn(next)).toBeNull();
    holdBack(prev, next);
    // ...and neither does another morning than the one that was held back
    expect(takeDawn({ ...next, day: next.day + 1 } as GameState)).toBeNull();
    expect(takeDawn(next)).toBeNull();
  });

  it('the fine leaves first and the top-up arrives after it, and the totals end at the real ones', async () => {
    fakeClock(false);
    holdBack(prev, next);
    holdCash(takeDawn(next));
    const seen: number[][] = [];
    const note = () => seen.push(next.players.map((pl, i) => shownCash(i, pl.cash)));
    const done = dawnCoins(next, 0, () => true);
    // nothing moves before the news has been turned over
    await vi.advanceTimersByTimeAsync(BEAT.morning.newsTurn + BEAT.dawn.after - 1);
    note();
    await vi.runAllTimersAsync();
    await done;
    note();
    expect(seen[0].slice(0, 2)).toEqual([2, 9]);
    expect(seen[1]).toEqual(next.players.map((pl) => pl.cash));
  });

  it('with reduced motion nothing travels: the numbers change at once', async () => {
    fakeClock(true);
    holdBack(prev, next);
    holdCash(takeDawn(next));
    const t0 = Date.now();
    const done = dawnCoins(next, 0, () => true);
    await vi.runAllTimersAsync();
    await done;
    expect(Date.now() - t0).toBeLessThan(50);
    expect(next.players.map((pl, i) => shownCash(i, pl.cash))).toEqual(next.players.map((pl) => pl.cash));
  });

  it('a sheet that has left starts nothing more', async () => {
    fakeClock(false);
    holdBack(prev, next);
    holdCash(takeDawn(next));
    const done = dawnCoins(next, 0, () => false);
    await vi.runAllTimersAsync();
    await done;
    expect(shownCash(0, next.players[0].cash)).toBe(2);
  });

  it('the morning says it in a line for each stall: the fines first, and this stall before the others', () => {
    const mine = dawnLines(publicView(next, 0), 0);
    expect(mine.map((d) => [d.kind, d.p, d.amount])).toEqual([['fine', 1, 4], ['up', 0, 3]]);
    expect(mine[0].text).toBe(`${next.players[1].name} was fined $4`);
    expect(mine[1].text).toBe('from the Market');
    const theirs = dawnLines(publicView(next, 1), 1);
    expect(theirs[0].text).toBe('You were fined $4');
    expect(theirs[1].text).toBe('Mia had an empty shelf and was topped up to $5');
    expect(fineLine(publicView(next, 1), 1)).toBe('You were fined $4');
    expect(topUpLine(publicView(next, 0), 0)).toBe('Your shelf was empty, so the market topped you up to $5 (+$3)');
    expect(dawnLines(game(3), 0)).toEqual([]);
  });
});

describe('the standing-order bid: the bids turned over (PLAN-084)', () => {
  const bidding = playTo((s) => s.phase === 'order' && activePlayer(s) === 0 && s.players[0].cash >= s.standing!.stake);
  const o = bidding.standing!;
  const title = ORDER_CARDS[o.card].title;

  it('while stalls bid, a rival\'s price is never drawn: only bidding, passed or deciding', () => {
    expect(o.bids.some((b) => typeof b === 'number')).toBe(true);
    const html = toStaticHtml(h(BidStatus, { s: publicView(bidding, 0), p: 0 }));
    expect(html).not.toContain('$');
    expect(html).toMatch(/bidding|passed/);
    expect(JSON.stringify(publicView(bidding, 0).standing!.bids)).not.toMatch(/\d/);
  });

  it('when the bids are in they are shown turned over, with the game\'s own sentence for who won', () => {
    const won = bidOrder(bidding, 0, 1); // the lowest bid there is
    expect(won.phase).toBe('buy');
    const show = bidsIn(bidding, won)!;
    expect(show.stage).toBe('in');
    expect(show.order.holder).toBe(0);
    expect(show.text).toBe(won.log[won.log.length - 1]);
    expect(show.text).toBe(`Mia won the standing order for ${title} at $1 a piece and put down a $${o.stake} stake.`);
    // every rival's bid is in the order that is shown (the bids are public once every stall has decided)
    const open = toStaticHtml(h(BidStatus, { s: publicView(won, 0), p: 0, order: show.order, open: true }));
    for (const [i, b] of show.order.bids.entries()) if (i !== 0 && typeof b === 'number') expect(open).toContain(`<b>$${b}</b>`);
    expect(open).not.toContain('wins');
    // nobody wanted it: the order has left the game, so it is shown as it was, with every stall passed
    let none = bidding;
    const all = structuredClone(bidding);
    all.standing!.bids = all.standing!.bids.map(() => null);
    none = all;
    for (const p of [1, 2, 3, 0]) none = bidOrder(none, p, null);
    expect(none.standing).toBeNull();
    const gone = bidsIn(all, none)!;
    expect(gone.text).toBe(none.log[none.log.length - 1]);
    expect(gone.text).toBe(`Nobody bid for ${title}'s standing order.`);
    expect(gone.order.bids).toEqual(['pass', 'pass', 'pass', 'pass']);
    // any other step of the game shows nothing
    expect(bidsIn(bidding, bidding)).toBeNull();
    expect(bidsIn(won, step(won))).toBeNull();
  });

  it('a rival who wins is shown winning, with its price', () => {
    const lost = bidOrder(bidding, 0, null);
    const show = bidsIn(bidding, lost)!;
    expect(show.order.holder).not.toBe(0);
    const open = toStaticHtml(h(BidStatus, { s: publicView(lost, 0), p: 0, order: show.order, open: true }));
    expect(open).toContain(`<span class="ob-bid-n"><b>$${show.order.price}</b> wins</span>`);
    expect(open.match(/ wins</g)).toHaveLength(1);
    expect(open).toContain('class="st-in won"');
  });

  it('the winner\'s cash is held at what it was until its stake leaves as coins, then the stake lies on the card', async () => {
    fakeClock(false);
    const won = bidOrder(bidding, 0, 1);
    const show = holdBack(bidding, won)!;
    expect(shownCash(0, won.players[0].cash)).toBe(bidding.players[0].cash);
    const stages: (OrderShow['stage'] | null)[] = [];
    const done = bidsTurned(show, 0, (s) => stages.push(s ? s.stage : null));
    await vi.runAllTimersAsync();
    await done;
    expect(stages).toEqual(['up', 'paid', null]);
    expect(shownCash(0, won.players[0].cash)).toBe(bidding.players[0].cash - show.order.staked!);
    expect(bidding.players[0].cash - show.order.staked!).toBe(won.players[0].cash);
  });

  it('the beat lasts about a second and a half, and with reduced motion every pause to read is kept', async () => {
    const won = bidOrder(bidding, 0, 1);
    const length = async (reduced: boolean) => {
      fakeClock(reduced);
      const show = holdBack(bidding, won)!;
      const t0 = Date.now();
      let up = -1, off = -1;
      const done = bidsTurned(show, 0, (s) => { if (s?.stage === 'up') up = Date.now() - t0; if (!s) off = Date.now() - t0; });
      await vi.runAllTimersAsync();
      await done;
      return { up, shown: off - up };
    };
    const full = await length(false);
    expect(full.up).toBe(BEAT.order.down);
    // no page here, so the coins do not travel: on a phone they add up to 0.6 s
    expect(full.shown).toBe(FEEL.turn + BEAT.order.read + BEAT.order.after);
    expect(full.up + full.shown + FEEL.coin + (COINS - 1) * BEAT.coins.gap).toBeLessThanOrEqual(2300);
    const still = await length(true);
    expect(still.up).toBe(0);
    expect(still.shown).toBe(BEAT.order.read + BEAT.order.after);
    expect(still.shown).toBeGreaterThanOrEqual(1000);
  });

  it('a tap ends the pauses', async () => {
    fakeClock(false);
    const won = bidOrder(bidding, 0, 1);
    const show = holdBack(bidding, won)!;
    const t0 = Date.now();
    const done = bidsTurned(show, 0, () => undefined);
    await vi.advanceTimersByTimeAsync(BEAT.order.down + 10);
    A.hurryUp();
    await vi.runAllTimersAsync();
    await done;
    // the pause that was running ends at once, and what follows is very quick (a tap's hurry)
    expect(Date.now() - t0).toBeLessThan(BEAT.order.down + 10 + (FEEL.turn + BEAT.order.read + BEAT.order.after) * 0.2);
  });

  it('online, who is bidding and who has passed is shown while the room still holds the choices (the game\'s version does not move)', () => {
    // The room sends a new view when a person bids or passes, with the same version: the screen takes it during the bid.
    const src = read('src/ui/game/useGameController.ts');
    expect(src).toContain("} else if (v.game && v.version === lastVersion.current && v.game.phase === 'order' && v.game.config.seed === sRef.current.config.seed) {");
    // ...and the sheet stays up, with its own buttons in the action bar's place, from the first bid to the last
    const game = read('src/ui/Game.tsx');
    expect(game).toContain("const orderUp = !!c.orderShow || (s.phase === 'order' && !!s.standing && s.players[viewer]?.kind === 'human');");
    // (PLAN-099: while the round table is up, its own foot takes the bar's place too)
    expect(game).toContain('{!pricing && !stalling && !orderUp && !tying && !evSheet && !tableOn && <ActionBar');
  });

  it('says what there is to deliver the order with: the shelf, the market, tomorrow\'s lorry', () => {
    const v = publicView(bidding, 0);
    const line = canGetLine(v, 0, v.standing!);
    expect(line).toMatch(/^Your shelf \d+ · Wholesale Market \d+( · tomorrow's lorry \d+)?$/);
    expect(line).toContain(`Wholesale Market ${bidding.market[o.fruit].reduce((a, n) => a + n, 0)}`);
  });
});

describe('the evening: one main button, and what is built travels (PLAN-084)', () => {
  const draft = playTo((s) => s.phase === 'evening' && activePlayer(s) === 0 && (s.players[0].upgradeOffer?.length ?? 0) > 0 && s.players[0].cash >= 6);
  const view = (s: GameState, more: object = {}) => toStaticHtml(h(EveningPanel, { s: publicView(s, 0), p: 0, onCard: () => undefined, ...more }));

  it('the offers are cards to choose, the cheapest first, with no Build button on any of them', () => {
    const offers = offersTonight(draft, 0);
    expect(offers.length).toBeGreaterThanOrEqual(4);
    expect(offers.map((u) => UPGRADES[u].cost)).toEqual([...offers.map((u) => UPGRADES[u].cost)].sort((a, b) => a - b));
    const html = view(draft, { onPick: () => undefined });
    expect(html).not.toContain('uo-buy');
    expect(html).not.toMatch(/>Build \$\d+</);
    for (const u of offers) expect(html).toContain(`data-up="${u}"`);
    expect(html).toContain(`Built ${draft.players[0].upgrades.length} of ${MAX_UPGRADES}`);
    expect(html).toContain('Build one upgrade tonight');
    // the chosen one is marked; none is chosen until the player taps one
    expect(html).not.toContain('uo-pick sel');
    const chosen = view(draft, { pick: offers[0], onPick: () => undefined });
    expect(chosen).toContain(`class="uo uo-pick sel" data-up="${offers[0]}"`);
    expect(chosen.match(/uo-pick sel/g)).toHaveLength(1);
  });

  it('the main button is the sheet\'s: "Build <name> · $<cost>" beside "Lights out without building", or "Lights out"', () => {
    const src = read('src/ui/panel.tsx');
    expect(src).toContain('>Build {UPGRADES[chosen].title} · ${UPGRADES[chosen].cost}</button>');
    expect(src).toContain('>Lights out without building</button>');
    expect(src).toContain('>Lights out <small class="btn-sub">next day</small></button>');
    // Lights out is always a tap: the evening never ends by itself
    expect(src).not.toMatch(/endEvening/);
    expect(read('src/ui/Game.tsx')).toContain("onDone={() => { fx.tap(); act({ kind: 'endEvening' }); }}");
  });

  it('an offer the stall cannot pay for is greyed and says why', () => {
    const poor = structuredClone(draft);
    poor.players[0].cash = 0;
    const html = view(poor, { onPick: () => undefined });
    expect(html).toContain('<span class="uo-ft">Not enough cash</span>');
    expect(html).toContain('disabled');
  });

  it('the heading is the day\'s money, and the hint names the offers further along the row', () => {
    expect(daySoldLine(draft, 0)).toMatch(/^Sold \$\d+ · bought \$\d+ · (up|down) \$\d+ today$/);
    expect(view(draft)).toContain(`<header class="ev-head"><b>Evening</b><span>${daySoldLine(draft, 0)}</span></header>`);
    const all = Object.keys(UPGRADES) as UpgradeId[];
    expect(swipeHint(all)).toBe(`Swipe for ${UPGRADES[all[2]].title} $${UPGRADES[all[2]].cost}, ${UPGRADES[all[3]].title} $${UPGRADES[all[3]].cost} and ${UPGRADES[all[4]].title} $${UPGRADES[all[4]].cost}. A stall has room for two.`);
    expect(swipeHint(all.slice(0, 2))).toBe('A stall has room for two.');
  });

  it('the favour cards you hold show with how many you may hold; Shade Cloth\'s fruit can still be named', () => {
    const s = structuredClone(draft);
    s.players[0].favours = ['gossip', 'favouredTrade'];
    s.players[0].trait = 'keeper';
    const html = view(s, { onShade: () => undefined });
    expect(html).toContain('Your favours');
    expect(html).toContain('2 of 3 held');
    expect(html).toContain('Play Gossip');
    expect(html).toContain('role="radiogroup" aria-label="Fruit to keep from ageing tonight"');
  });

  it('tomorrow\'s walk-ins that one stall has seen are drawn for that stall only', () => {
    const s = structuredClone(draft);
    expect(s.queue.length).toBeGreaterThan(0);
    s.queue[0].seenBy = [0];
    const mine = toStaticHtml(h(EveningTomorrow, { s: publicView(s, 0), p: 0 }));
    const theirs = toStaticHtml(h(EveningTomorrow, { s: publicView(s, 1), p: 1 }));
    expect(mine).toContain('class="ev-who heard"');
    expect(theirs).not.toContain('heard');
    expect(mine).toContain(`+ ${s.queue.length - 1} walk-in`);
    expect(theirs).toContain(`+ ${s.queue.length} walk-in`);
  });

  it('the sheet comes back where it was: a sheet that has left cannot overwrite the place or the choice it kept', () => {
    const live = eveningKept(null, 'g:3:0', 'orderbook', { scrollTop: 198 });
    expect(live).toEqual({ key: 'g:3:0', pick: 'orderbook', scroll: 198 });
    // its picture is scrolled once more as it slides away: by then the sheet is no longer on the table
    expect(eveningKept(live, 'g:3:0', null, null)).toBe(live);
    expect(eveningKept(live, 'g:3:0', 'orderbook', { scrollTop: 40 })).toEqual({ key: 'g:3:0', pick: 'orderbook', scroll: 40 });
    const src = read('src/ui/panel.tsx');
    expect(src).toContain('kept = eveningKept(kept, key, next, root.current);');
    expect(src).toContain('if (kept?.key === key && kept.scroll > 0 && root.current) root.current.scrollTop = kept.scroll;');
  });

  it('an upgrade\'s price is held back until its coins leave, for the person and for a rival', async () => {
    fakeClock(false);
    const u = offersTonight(draft, 0).find((x) => UPGRADES[x].cost <= draft.players[0].cash)!;
    const after = buyUpgrade(draft, 0, u);
    noteOffer(0, u, { left: 20, top: 200, width: 150, height: 250 });
    expect(holdBack(draft, after)).toBeNull();
    expect(shownCash(0, after.players[0].cash)).toBe(draft.players[0].cash);
    const done = built(0, u);
    await vi.runAllTimersAsync();
    await done;
    expect(shownCash(0, after.players[0].cash)).toBe(after.players[0].cash);
    expect(draft.players[0].cash - after.players[0].cash).toBe(UPGRADES[u].cost);
  });

  it('with reduced motion the label over the stall is held for a pause to read; otherwise the beat is under a second', async () => {
    const u = offersTonight(draft, 0).find((x) => UPGRADES[x].cost <= draft.players[0].cash)!;
    const after = buyUpgrade(draft, 0, u);
    const length = async (reduced: boolean) => {
      fakeClock(reduced);
      holdBack(draft, after);
      const t0 = Date.now();
      const done = built(0, u);
      await vi.runAllTimersAsync();
      await done;
      return Date.now() - t0;
    };
    expect(await length(true)).toBe(BEAT.label.read);
    // no page here, so nothing travels: on a phone the card (320 ms) and up to five coins (0.6 s) come first
    expect(await length(false)).toBe(BEAT.evening.seen);
    expect(Math.max(FEEL.travel, FEEL.coin + (COINS - 1) * BEAT.coins.gap) + BEAT.evening.seen).toBeLessThan(1000);
    expect(BEAT.evening.label).toBeLessThan(1000);
  });
});

describe('a sheet reaches over the rows of the table without moving them (reach.ts, sheets.css)', () => {
  // A phone 390 by 844: the top bar and beats to 82, the customer band to 300 (tickets to 230), the rivals to 356,
  // the lanes to 713, your shelf to 772.
  const boxes: ReachBoxes = { mid: { top: 356, bottom: 713 }, row: { bottom: 230 }, street: { top: 82 }, beats: { top: 52 }, dock: { bottom: 772 }, notice: false };

  it('the morning starts under the customers\' tickets, the bid at the customer band, the evening over the beats', () => {
    expect(reachFrom(boxes, 'row', false)).toEqual({ rise: 356 - 236, drop: 0 });
    expect(reachFrom(boxes, 'street', true)).toEqual({ rise: 356 - 82, drop: 772 - 713 });
    expect(reachFrom(boxes, 'beats', true)).toEqual({ rise: 356 - 52, drop: 59 });
  });

  it('a notice between the top bar and the customers (someone is reconnecting) stays in view', () => {
    expect(reachFrom({ ...boxes, notice: true, street: { top: 112 } }, 'beats', true).rise).toBe(356 - 112);
  });

  it('a row that is not on the screen is simply not reached over, and the reach is never negative', () => {
    expect(reachFrom({ ...boxes, row: null }, 'row', false)).toEqual({ rise: 0, drop: 0 });
    expect(reachFrom({ ...boxes, dock: null }, 'street', true).drop).toBe(0);
    expect(reachFrom({ ...boxes, street: { top: 400 } }, 'street', false).rise).toBe(0);
  });

  it('the sheet stays in the middle cell and is drawn larger by a margin: no row of the table is given a size here', () => {
    const css = read('src/ui/sheets.css').replace(/\/\*[\s\S]*?\*\//g, '');
    expect(css).toContain('#app .tkt > .centre > .fm-sheet { z-index: 6; margin-top: calc(0px - var(--rise, 0px)); margin-bottom: calc(0px - var(--drop, 0px)); }');
    // the rows themselves (the customer band, the rivals, the lanes, your shelf, the action bar) are not laid out here
    expect(css).not.toMatch(/#app \.tkt > \.(street-wrap|seats|my-stall|actionbar|tk-top)\b/);
    expect(css).not.toMatch(/\.market-stall|grid-template-rows|grid-area|grid-row/);
    // the three sheets carry the class, on the element sheet.ts slides
    expect(read('src/ui/game/panels/MorningCard.tsx')).toMatch(/class=\{`morning-card tk-morning \$\{table \? 'fm-sheet sh-morning'/);
    expect(read('src/ui/game/panels/OrderPanel.tsx')).toContain('class="price-panel order-panel mid-panel tk-panel fm-sheet sh-order"');
    expect(read('src/ui/panel.tsx')).toContain('class="mid-panel mid-evening fm-sheet sh-evening"');
    // sheets.css is loaded after the table's stylesheets and before the motion rules
    const main = read('src/main.tsx');
    expect(main.indexOf("'./ui/sheets.css'")).toBeGreaterThan(main.indexOf("'./ui/ticket-ui.css'"));
    expect(main.indexOf("'./ui/motion.css'")).toBeGreaterThan(main.indexOf("'./ui/sheets.css'"));
  });

  it('a morning with more to say than its sheet holds is drawn closer, a step at a time, and no closer than it needs', () => {
    /** A stand-in for the sheet: how tall its parts are at each step, and the room it has. */
    const sheet = (parts: number[], room: number): Fitting => {
      const dataset: DOMStringMap = {};
      return { dataset, clientHeight: room, get scrollHeight() { return Math.max(room, parts[Number(dataset.tight ?? 0)]); } };
    };
    const stepOf = (parts: number[], room: number) => { const el = sheet(parts, room); closer(el); return el.dataset.tight; };
    expect(stepOf([470, 430, 400, 385, 340, 330], 475)).toBeUndefined(); // it fits as the approved screen draws it
    expect(stepOf([508, 446, 409, 389, 340, 330], 450)).toBe('1');
    expect(stepOf([508, 446, 409, 389, 340, 330], 410)).toBe('2');
    expect(stepOf([508, 446, 409, 389, 340, 330], 381)).toBe('4');
    expect(stepOf([508, 446, 409, 389, 340, 330], 320)).toBe(String(TIGHTEST)); // closest, and then the sheet scrolls
    // asked again (a row changed its size), a sheet never goes back a step
    const el = sheet([508, 446, 409, 389, 340, 330], 410);
    closer(el);
    closer(el);
    expect(el.dataset.tight).toBe('2');
    // the step is written on the sheet as the page is laid out: the card is not drawn again for it, the rows are never
    // measured in the middle of a draw, and the steps wait for the frame after the one on which the sheet is still clear
    const card = read('src/ui/game/panels/MorningCard.tsx');
    expect(card).not.toMatch(/setTight|tight-\$\{/);
    expect(card).toContain("if (getComputedStyle(el).opacity !== '0') { closer(el); return; }");
    expect(card).toContain('requestAnimationFrame(() => { if (el.isConnected) closer(el); });');
    const reach = read('src/ui/game/reach.ts');
    expect(reach).not.toMatch(/useLayoutEffect\(fit\)|innerWidth|innerHeight/);
    expect(reach).toContain('new ResizeObserver(fit)');
    const css = read('src/ui/sheets.css');
    expect(css).toContain("#app .tkt .sh-morning:is([data-tight='3'], [data-tight='4'], [data-tight='5']) .wc-evpic");
    expect(css).not.toMatch(/\.tight-\d/);
  });

  it('the bid and the evening are drawn closer, a step at a time, before anything scrolls', () => {
    /** Stand-ins: a sheet, and a part of it that holds so many px at each step where `room` px show. */
    const sheet = (): Stepped => ({ dataset: {} });
    const part = (holds: number[], room: number, on: Stepped): Holding => ({ clientHeight: room, get scrollHeight() { return Math.max(room, holds[Number(on.dataset.tight ?? 0)]); } });
    // the bid on a small phone with six stalls: the card, the bidders and the note hold 367 px where 293 show
    const bid = sheet();
    expect(drawCloser(bid, part([367, 331, 297, 250], 293, bid), BID_STEPS)).toBe(3);
    expect(bid.dataset.tight).toBe('3');
    const roomy = sheet();
    expect(drawCloser(roomy, part([326, 300, 280, 240], 330, roomy), BID_STEPS)).toBe(0);
    expect(roomy.dataset.tight).toBeUndefined();
    // the evening keeps room for the second button while an offer can still be chosen, so choosing one changes nothing
    const night = (on: Stepped): Holding => ({ clientHeight: 720, get scrollHeight() { return [767, 700, 660, 500, 400][Number(on.dataset.tight ?? 0)]; } });
    const open = sheet();
    expect(drawCloser(open, night(open), EVENING_STEPS, 54)).toBe(2);
    const plain = sheet();
    expect(drawCloser(plain, night(plain), EVENING_STEPS)).toBe(1);
    // never more steps than there are, and asked again a sheet never goes back
    const full = sheet();
    expect(drawCloser(full, { clientHeight: 100, scrollHeight: 900 }, EVENING_STEPS)).toBe(EVENING_STEPS);
    expect(drawCloser(open, part([767, 700, 660, 500, 400], 900, open), EVENING_STEPS)).toBe(2);
    // where it is used, and what each step draws
    expect(read('src/ui/game/panels/OrderPanel.tsx')).toContain('drawCloser(root.current, top.current, BID_STEPS)');
    expect(read('src/ui/panel.tsx')).toContain('drawCloser(el, eveningHolds(el), EVENING_STEPS, canBuild && !chosen ? TWO_BUTTONS : 0)');
    const css = read('src/ui/sheets.css');
    expect(css).toContain("#app .tkt .sh-order[data-tight]:not([data-tight='1']) .wc-sqpic { width: 48px; height: 48px; }");
    expect(css).toContain("#app .tkt .sh-order[data-tight='3'] .ob-get { display: none; }");
    expect(css).toContain("#app .tkt .sh-evening:is([data-tight='3'], [data-tight='4']):not([data-tight='1']) :is(.fav-kind, .fav-pic, .fav-tx) { display: none; }");
    expect(css).toContain("#app .tkt .sh-evening[data-tight='4']:not([data-tight='1']) .uo-tx { margin: 0 0 0 -56px; padding: 4px 6px; border-top: 2px solid var(--x-ink); white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }");
    expect(css).toContain('#app .tkt > .centre > .ev-card { position: fixed; inset: 0; z-index: 30; margin: 0; }');
    // an offer drawn compact shows one line of its text: choosing it opens its whole card, with Close
    expect(read('src/ui/panel.tsx')).toContain('if (u && root.current?.dataset.tight === String(EVENING_STEPS)) setOpen(u);');
    expect(read('src/ui/panel.tsx')).toContain('<UpgradeCard id={open} eager />');
    // a night that still scrolls says so at its foot
    expect(css).toContain('#app .tkt .sh-evening[data-more] .ev-more::before');
    expect(read('src/ui/panel.tsx')).toContain('<i class="ev-more" aria-hidden="true" />');
  });

  it('the bottom bar keeps its height when it holds two buttons, so your shelf under the sheet does not move', () => {
    const css = read('src/ui/sheets.css');
    expect(css).toContain('#app .tkt > .centre > .ev-lock[data-two] { z-index: 6; margin-top: -54px; }');
    expect(css).toContain('#app .tkt > .centre > .sh-evening[data-two] { margin-bottom: calc(54px - var(--drop, 0px)); }');
    // only the main button of each bar is a `.btn`: the browser tests press `.pp-lock .btn`
    for (const f of ['src/ui/game/panels/OrderPanel.tsx', 'src/ui/panel.tsx']) {
      const src = read(f);
      const bar = src.slice(src.lastIndexOf('<div class="pp-lock'));
      expect(bar.slice(0, bar.indexOf('</div>')).match(/class="btn /g)!.length).toBeLessThanOrEqual(2);
    }
    expect(read('src/ui/game/panels/OrderPanel.tsx')).toContain('<button type="button" class="ob-pass"');
    expect(read('src/ui/panel.tsx')).toContain('<button type="button" class="ev-out"');
  });
});

describe('the new beats hold no lengths of their own (motion.ts names them)', () => {
  it('the morning, the bid, the evening and their beats', () => {
    const files = ['src/ui/game/dayBeats.tsx', 'src/ui/game/reach.ts', 'src/ui/game/panels/MorningCard.tsx', 'src/ui/game/panels/OrderPanel.tsx', 'src/ui/panel.tsx'];
    const bare = [/\b(?:wait|hold|held|pause|ms|moveMs|timer)\(\s*\d{2,}/, /\bduration:\s*\d{2,}/, /\bdelay:\s*\d{2,}/];
    const found = files.flatMap((f) => read(f).split('\n').map((l, i) => ({ at: `${f}:${i + 1}`, l })).filter((x) => !/^\s*(\/\/|\*|\/\*)/.test(x.l) && bare.some((re) => re.test(x.l))).map((x) => `${x.at}: ${x.l.trim()}`));
    expect(found).toEqual([]);
    expect(BEAT.order).toEqual({ down: 250, read: 600, after: 500 });
    expect(BEAT.dawn).toEqual({ after: 250 });
    expect(BEAT.evening).toEqual({ seen: 300, label: 800 });
  });
});
