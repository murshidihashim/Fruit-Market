// PLAN-109 (REP-122, the 1.24.0 review): the words around the rules say what the game does. Text, print and comments
// only: no rule, number or card value changed. Each block names the review row it covers.
import { beforeEach, describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { h } from 'preact';
import { EVENT_CARDS, FAVOURS, FRUIT, GENEROUS_BONUS, ORDER_LEAD, STREET_PRICE, stageAt, type EventCard, type FruitId } from '../src/engine/data';
import { dailyConfig, dailyTwist } from '../src/engine/daily';
import {
  activePlayer, beginBuying, buyLimit, count, effectiveMax, emptyStock, endBuyTurn, marketCost, newGame, openStall, playFavour, submitPrices,
  type GameConfig, type GameState,
} from '../src/engine/game';
import { PayBadge, toStaticHtml } from '../src/ui/cards';
import { cardChips, marketChipFruit, marketChips, newsChips } from '../src/ui/eventChips';
import { LENGTHS } from '../src/ui/playMenu';
import { GAME_LENGTHS, NO_ORDER_DAYS, marketDaysWithoutOrder } from '../src/ui/rulesText';
import { Market } from '../src/ui/table';
import { TIPS, eveningTip, marketDayRead, tipFor } from '../src/ui/tutorial';
import { endBuying, passEvening } from './stall-step';

const read = (f: string) => readFileSync(f, 'utf8');
const ev = (id: string): EventCard => EVENT_CARDS.find((e) => e.id === id)!;
const humans = (n: number, extra: Partial<GameConfig> = {}): GameConfig => ({
  players: Array.from({ length: n }, (_, i) => ({ name: `P${i}`, kind: 'human' as const, avatar: '' })),
  days: 10, unripe: true, upgrades: true, events: false, seed: 3, ...extra,
});
/** The morning of `day`, from the evening before, in a game of `days` days (as rules14.test.ts reaches a Market Day). */
function morningOf(day: number, extra: Partial<GameConfig> = {}): GameState {
  const s = structuredClone(newGame(humans(2, extra)));
  s.day = day - 1; s.phase = 'evening'; s.turn = 0; s.order = s.players.map((_, i) => i);
  s.players.forEach((p) => { p.stock = emptyStock(true); p.cash = 30; p.trait = null; p.traitOffer = []; });
  const g = passEvening(s);
  expect(g.day).toBe(day);
  return beginBuying(g);
}

describe('C-02: a standing order only when it can be collected', () => {
  it('the Market Days without one are worked out as the engine draws them, at every game length', () => {
    expect(GAME_LENGTHS).toEqual([8, 10, 14]);
    // The set-up page's lengths and the online room's: since PLAN-116 (REP-133 B-14) both draw the Play menu's list
    // (playMenu.ts LENGTHS), which holds the same three lengths; PLAN-125: through one segment (Setup.tsx LengthSeg).
    expect(read('src/ui/Setup.tsx')).toContain('LENGTHS.map((l) =>');
    expect(read('src/ui/Online.tsx')).toContain('<LengthSeg ');
    expect(LENGTHS.map((l) => l.days)).toEqual([...GAME_LENGTHS]);
    expect(GAME_LENGTHS.map(marketDaysWithoutOrder)).toEqual([[], [9], []]);
    expect(NO_ORDER_DAYS).toBe('Day 9 of a 10-day game');
    for (const days of GAME_LENGTHS) {
      for (let d = 3; d < days; d += 3) {
        const s = morningOf(d, { days });
        const drawn = !!s.standing && s.standing.due === d + ORDER_LEAD;
        expect(drawn, `day ${d} of ${days}`).toBe(!marketDaysWithoutOrder(days).includes(d));
      }
    }
  });

});

describe('C-05, C-06, S20: event figures', () => {
  it('one piece is "an apple", never "a apple"', () => {
    const smalls = EVENT_CARDS.flatMap((e) => newsChips(e).map((c) => c.small));
    expect(smalls.filter((t) => /\ba [aeiou]/i.test(t))).toEqual([]);
    expect(newsChips(ev('blight')).find((c) => c.pay === 'customer')?.small).toBe('an apple');
    expect(newsChips(ev('bakeOff')).find((c) => c.pay === 'customer')?.small).toBe('an apple');
    expect(newsChips(ev('heatwave'))[0].small).toBe('a watermelon');
  });

  it('Blueberry Glut shows its price at the Wholesale Market on the card and the morning chips', () => {
    const glut = ev('glut');
    expect(newsChips(glut)).toEqual([
      { fruit: 'blueberry', big: '−$1', small: 'a blueberry', pay: 'customer' },
      { fruit: 'blueberry', big: '−$1', small: 'To buy a blueberry', pay: 'market' },
      { fruit: 'blueberry', big: 'Extra', small: 'blueberries today' },
    ]);
    // The card has room for one row of two boxes: its two prices (its text says the rest).
    expect(cardChips(glut)).toEqual(newsChips(glut).slice(0, 2));
    // Every other event's card keeps every figure the morning shows (no event has more than two).
    for (const e of EVENT_CARDS) if (!e.maxPrice && e.id !== 'glut') expect(cardChips(e), e.id).toEqual(newsChips(e));
  });

  it('the Wholesale Market\'s own chip names every price change there, with the card\'s badge, and agrees with the box prices', () => {
    const chips = Object.fromEntries(EVENT_CARDS.map((e) => [e.id, marketChips(e)]).filter(([, c]) => c.length));
    expect(chips).toEqual({
      glut: [{ text: '−$1', up: false, fruit: 'blueberry' }],
      priceHike: [{ text: '+$1 each today', up: true }],
      durian: [{ text: '−$1 each today', up: false }],
    });
    expect(marketChipFruit('blueberry')).toBe('blueberries today');
    const s = structuredClone(beginBuying(newGame(humans(2))));
    const plain = (f: FruitId, pos: number) => Math.max(1, FRUIT[f].cost[stageAt(f, pos)]);
    s.event = ev('glut');
    expect(marketCost(s, 'blueberry', 2)).toBe(plain('blueberry', 2) - 1);
    expect(marketCost(s, 'apple', 5)).toBe(plain('apple', 5));
    const html = toStaticHtml(h(Market, { s, p: 0 }));
    // A figure for one fruit carries that fruit's picture, whose words finish the sentence: "−$1 blueberries today".
    expect(html).toContain(`<span class="tk-chip good">${toStaticHtml(h(PayBadge, { pay: 'market' }))}−$1<img class="x-fruit tk-chip-f"`);
    expect(html).toContain('alt="blueberries today"');
    s.event = ev('heatwave');
    expect(toStaticHtml(h(Market, { s, p: 0 }))).not.toContain('tk-chip');
  });
});

describe('C-08: the price badges', () => {
  it('neither badge wears a customer type\'s colour, and the market\'s is not the lorry', () => {
    const css = read('src/ui/cards.css');
    expect(css).toContain('.cd-pb-customer { --pay: var(--x-ink); }');
    expect(css).not.toMatch(/\.cd-pb[^{]*\{[^}]*--x-(everyday|premium|bargain)/);
    const market = toStaticHtml(h(PayBadge, { pay: 'market' }));
    expect(market).toContain('viewBox="0 0 16 16"');
    expect(market).not.toContain('M15 4h4.5'); // the lorry's cab
    expect(read('scripts/print-update.ts')).toContain('a crate of fruit for a price at the Wholesale Market');
  });
});

describe('C-09: fruit sold, the tie-break', () => {
  it('the night hawker\'s pieces count as fruit sold in the app', () => {
    let s = beginBuying(newGame(humans(2, { seed: 5 })));
    s = structuredClone(endBuying(s));
    s.event = ev('pasarMalam');
    s.firstMarket = []; s.secondMarket = [];
    s.players.forEach((p) => { p.stock = emptyStock(true); p.trait = null; });
    s.players[0].stock.apple = [1, 2, 0, 0, 0, 1];
    const before = s.players[0].stats.sold;
    s = openStall(s, 0, { apple: 4 });
    s = openStall(s, 1, {});
    s = submitPrices(s, 0, [{ fruit: 'apple', price: 20 }]); // no customer pays $20: only the hawker buys
    expect(s.results!.hawker).toEqual([{ player: 0, fruit: 'apple', price: 3 }]);
    expect(s.players[0].stats.sold - before).toBe(1);
  });

  it('RULES.md, How to play, the guidebook and the counter say what counts', () => {
    const counts = 'a customer, a guest, a standing order or the night hawker';
    expect(read('RULES.md')).toContain(`Ties go to whoever sold more fruit: every piece a stall sold to ${counts} counts`);
    const update = read('scripts/print-update.ts');
    expect(update).toContain(`every piece sold to ${counts} counts`);
    // PLAN-111: the Fruit sold row moved from the counter to the stall sheet (scripts/print-table.ts)
    const table = read('scripts/print-table.ts');
    expect(table).toContain('Fruit sold · cross off one for each piece you sell');
    expect(table).toContain('Array.from({ length: 80 }');
  });
});

describe('C-10: Free Fruit is not one of the day\'s pieces', () => {
  it('the card says so, and the engine takes the piece after the day\'s last purchase', () => {
    expect(FAVOURS.freeFruit.text).toBe('Take 1 piece from the Wholesale Market for free. It does not count toward the pieces you may buy today.');
    expect(read('RULES.md')).toContain('| 🎁 Free Fruit | Your buying turn | Take 1 piece from the Wholesale Market for free. It does not count toward the pieces you may buy today. |');
    const s = structuredClone(beginBuying(newGame(humans(2))));
    const p = activePlayer(s);
    const pl = s.players[p];
    pl.stock = emptyStock(true);
    pl.favours = ['freeFruit'];
    pl.boughtToday = buyLimit(pl);
    const f = (['blueberry', 'watermelon', 'apple', 'mango'] as FruitId[]).find((x) => s.market[x].some((n, i) => n > 0 && stageAt(x, i) !== 'unripe'))!;
    const pos = s.market[f].findIndex((n, i) => n > 0 && stageAt(f, i) !== 'unripe');
    const after = playFavour(s, p, 0, { fruit: f, pos });
    expect(count(after.players[p].stock)).toBe(1);
    expect(after.players[p].boughtToday).toBe(buyLimit(pl));
    expect(() => endBuyTurn(after, p)).not.toThrow();
  });
});

const mem = new Map<string, string>();
beforeEach(() => {
  mem.clear();
  (globalThis as { localStorage?: unknown }).localStorage = {
    getItem: (k: string) => mem.get(k) ?? null, setItem: (k: string, v: string) => mem.set(k, v), removeItem: (k: string) => mem.delete(k),
  };
});

describe('C-14, S16: the evening tip', () => {
  /** An evening on `day`, with the first stall (a person) still deciding. */
  function evening(day: number, edit: (s: GameState) => void): GameState {
    const s = structuredClone(newGame({ ...humans(2), players: [{ name: 'You', kind: 'human', avatar: '' }, { name: 'B', kind: 'ai', level: 'normal', avatar: '' }] }));
    s.day = day; s.phase = 'evening'; s.order = [0, 1]; s.eveningDone = [false, true]; s.priorityPlayed = [];
    s.players.forEach((p) => { p.favours = []; p.upgradeOffer = []; p.cash = 30; p.trait = null; });
    edit(s);
    return s;
  }
  const NIGHT = 'Tonight all fruit ages one step.';

  it('says only what this evening offers the stall', () => {
    expect(eveningTip(evening(2, (s) => { s.players[0].favours = ['priority']; }), 0)).toBe(`You can play a favour card now, or keep it. Then tap Lights out. ${NIGHT}`);
    expect(eveningTip(evening(3, (s) => { s.players[0].upgradeOffer = ['ripening']; }), 0)).toBe(`After a Market Day you can build 1 upgrade now. Then tap Lights out. ${NIGHT}`);
    expect(eveningTip(evening(3, (s) => { s.players[0].favours = ['priority']; s.players[0].upgradeOffer = ['ripening']; }), 0))
      .toBe(`Play a favour card or build an upgrade now, or both. Then tap Lights out. ${NIGHT}`);
    // A card that cannot be played now (Scout is for buying) and an upgrade it cannot afford are not offered.
    expect(eveningTip(evening(3, (s) => { s.players[0].favours = ['scout', 'priority']; s.players[0].upgradeOffer = ['ripening']; s.players[0].cash = 1; }), 0))
      .toBe(`You can play a favour card now, or keep it. Then tap Lights out. ${NIGHT}`);
    expect(eveningTip(evening(2, (s) => { s.players[0].trait = 'keeper'; }), 0)).toBe(`Name the fruit your Shade Cloth keeps from ageing tonight. Then tap Lights out. ${NIGHT}`);
  });

  it('never promises one step before a Heatwave or Monsoon night', () => {
    const tip = (id: string) => eveningTip(evening(2, (s) => { s.players[0].favours = ['priority']; s.event = ev(id); }), 0);
    expect(tip('heatwave')).toMatch(/Tonight all fruit ages 2 steps\.$/);
    expect(tip('monsoon')).toMatch(/No fruit ages tonight\.$/);
    expect(TIPS.find((t) => t.id === 'evening')!.text).not.toMatch(/step|Play favour card/);
  });

  it('is the coach\'s evening tip for the person deciding', () => {
    const s = evening(3, (g) => { g.players[0].upgradeOffer = ['ripening']; });
    expect(activePlayer(s)).toBe(0);
    const ctx = { myBuyTurn: false, boughtToday: 0, pricing: false, picker: false, evening: true };
    // PLAN-128: on the first Market Day evening the Market Day pop-up comes first, and the tip once it has been read
    expect(tipFor(s, ctx)).toBeNull();
    marketDayRead();
    const tip = tipFor(s, ctx);
    expect(tip?.id).toBe('evening');
    expect(tip?.text).toBe(eveningTip(s, 0));
  });
});

describe('C-13, C-16: the Daily market', () => {
  it('Home calls it the Daily market', () => {
    // PLAN-120: the Daily market has its own card on Home (HomeCards.tsx). PLAN-124: its card and its Play are named
    // from the mode list ("Daily market"; the tab says "Daily").
    const home = read('src/ui/HomeCards.tsx').split(/\r?\n/).filter((l) => !/^\s*(\/\/|\*|\/\*)/.test(l)).join('\n');
    expect(home).toContain("{ id: 'daily', slot: 'daily', tab: 'Daily', name: 'Daily market' }");
    expect(home).toContain('<Frame mode="daily" sub={`${shortDate(p.today)}');
    expect(home).not.toMatch(/today['’]s market/i);
  });

  it('the twists say the whole change: generous customers under fixed prices, no standing orders in the Basic game', () => {
    const dates = Array.from({ length: 7 }, (_, k) => `2026-11-${String(k + 1).padStart(2, '0')}`);
    const twist = (title: string) => dailyTwist(dates.find((d) => dailyTwist(d).title === title)!);
    expect(twist('Fixed prices').text).toBe(`Every customer pays one fixed price for each fruit. Generous customers pay $${GENEROUS_BONUS} more.`);
    expect(effectiveMax({ ...newGame(humans(2)), config: { ...humans(2), street: true } } as GameState, { fruit: 'apple', qty: 1, max: 9 }, true))
      .toBe(STREET_PRICE.apple + GENEROUS_BONUS);
    expect(twist('Basic game').text).toBe('No perks, favour cards, upgrades or standing orders.');
    const basic = dates.find((d) => dailyTwist(d).title === 'Basic game')!;
    expect(dailyConfig(basic, 'You').core).toBe(true);
    expect(morningOf(3, { core: true }).standing ?? null).toBeNull();
    expect(morningOf(3).standing?.due).toBe(3 + ORDER_LEAD);
    expect(read('RULES.md')).toContain('over 10 days (8 days on a quick game day, 14 on a long game day)');
  });
});

describe('C-03, C-04, C-11, C-18, C-19, ON-11, S15: print and RULES.md words', () => {
  it('one money rule at the table: the crier pays nobody (DEC-108)', () => {
    expect(read('scripts/print-deck.ts')).not.toMatch(/pays the stalls from the bank|posted price|evening favours/);
    expect(read('scripts/print-deck.ts')).toContain('reads each customer aloud and pays nobody: each stall adds its own price to its own cash track');
    const rules = read('RULES.md');
    expect(rules).not.toMatch(/The crier is the bank|the crier pays her tip/);
    expect(rules).toContain('Farah adds her tip to her cash track');
  });

  it('the guidebook and change sheet slips are gone', () => {
    const update = read('scripts/print-update.ts');
    expect(update).not.toMatch(/black band|Farah peeks|get older|Not ripe|the table under "Market Days"|than the rules 18 cards|evening favours\b|favours, upgrades/);
    expect(update).toContain('purple <b>Premium</b>');
    // PLAN-111: the board and shutters are printed again, in the table set; the guidebook and kit cover say where each part comes from
    expect(update).toContain('the board, stall sheets, counters, shutters, bid cards, tokens and this guidebook in the table set (print/table)');
    expect(update).not.toMatch(/price tags?, four per stall|three panels|earlier printing/);
    expect(read('scripts/print-deck.ts')).toContain('The board, stall sheets, counters, shutters, bid cards, tokens and the rules guidebook: the table set (print/table)');
    expect(read('print/README.md')).toContain('**The board, shutters and pieces are in the table set**');
  });

  it('RULES.md: online choosing, and day chips for a mango from the near Green box or with a Ripening Room', () => {
    const rules = read('RULES.md');
    expect(rules).not.toContain('you can change yours in the lobby');
    expect(rules).toContain('In a private online room nobody picks in the lobby: once the host starts the game, everyone chooses at the same time');
    expect(rules).toContain('the clock number now plus 2 from the far Green box (where the lorry unloads), plus 1 from the near one. With a Ripening Room every Green mango gets plus 1');
    expect(FRUIT.mango.unripeSlots).toBe(2); // the far and the near Green box
  });
});
