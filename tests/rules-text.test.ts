import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { h } from 'preact';
import { FARMER_CARDS, FRUIT, FRUITS, JAM_PRICE, LAST_CALL_BONUS, deliveredGreen } from '../src/engine/data';
import { beginBuying, newGame } from '../src/engine/game';
import { SEEN_WALK_IN, marketColumn, shownColumn } from '../src/ui/boardModel';
import { toStaticHtml } from '../src/ui/cards';
import { CustomerChar, Market } from '../src/ui/table';
import { FruitTrack } from '../src/ui/HowTo';
import { marketDaysSetupText, unripeSetupText } from '../src/ui/rulesText';

// Set-up text and green fruit (REP-089 3.7): since rules 9 only mangoes arrive green, at $4 ($5 on a Price Hike day).

describe('green fruit', () => {
  it('deliveredGreen follows the lorry deck: mangoes yes, watermelons no', () => {
    for (const f of FRUITS) expect(deliveredGreen(f)).toBe(FARMER_CARDS.some((c) => c.unripe === f));
    expect(deliveredGreen('mango')).toBe(true);
    expect(deliveredGreen('watermelon')).toBe(false);
    // Every fruit a lorry brings green has green slots to ripen in.
    for (const f of FRUITS.filter(deliveredGreen)) expect(FRUIT[f].unripeSlots).toBeGreaterThan(0);
  });

  it('the Unripe fruit switch quotes the real green price and ripening time', () => {
    const t = unripeSetupText();
    expect(t).toBe(`Every lorry brings mangoes green: from $${FRUIT.mango.cost.unripe}, ready to sell after ${FRUIT.mango.unripeSlots} nights.`);
    expect(t).not.toMatch(/\$1 now|watermelon/i);
    const app = readFileSync('src/ui/App.tsx', 'utf8');
    expect(app).not.toContain('$1 now'); // the New game screen has no rules switches since PLAN-063
  });

  it('the Market Days switch takes the Closing Day numbers from the game data', () => {
    expect(marketDaysSetupText()).toBe(`Days 3, 6, 9 and 12: a standing order to bid for, and an upgrade that evening. Closing Day on the final day: +$${LAST_CALL_BONUS}, then the jam maker buys ripe leftovers at $${JAM_PRICE} each.`);
  });

  it('How to play draws green steps only for fruit a lorry delivers green', () => {
    for (const f of FRUITS) {
      const html = toStaticHtml(h(FruitTrack, { f }));
      expect(html.split('st-unripe').length - 1).toBe(deliveredGreen(f) ? FRUIT[f].unripeSlots : 0);
      expect(html.split('<i ').length - 1).toBe(FRUIT[f].ripe.length + (deliveredGreen(f) ? FRUIT[f].unripeSlots : 0));
    }
  });

  it('the market can leave out the green slot no lorry fills, and keeps every other slot', () => {
    const s = beginBuying(newGame({ players: [{ name: 'A', kind: 'human', avatar: 'x' }, { name: 'B', kind: 'human', avatar: 'y' }], days: 8, unripe: true, upgrades: true, events: true, seed: 7 }));
    for (const f of FRUITS) {
      const all = marketColumn(s, f);
      const shown = shownColumn(s, f);
      expect(shown).toEqual(all.filter((c) => c.stage !== 'unripe' || deliveredGreen(f)));
    }
    expect(shownColumn(s, 'watermelon').some((c) => c.stage === 'unripe')).toBe(false);
    expect(shownColumn(s, 'mango').filter((c) => c.stage === 'unripe').length).toBe(FRUIT.mango.unripeSlots);
    // A green watermelon that is somehow there (never dealt today) still shows.
    s.market.watermelon[FRUIT.watermelon.ripe.length] = 1;
    expect(shownColumn(s, 'watermelon').some((c) => c.stage === 'unripe' && c.n === 1)).toBe(true);
  });

  it('the Wholesale Market draws no empty green watermelon cell, keeps the mango\'s green cells, and shows a filled one', () => {
    const s = beginBuying(newGame({ players: [{ name: 'A', kind: 'human', avatar: 'x' }, { name: 'B', kind: 'human', avatar: 'y' }], days: 8, unripe: true, upgrades: true, events: true, seed: 7 }));
    const green = FRUIT.watermelon.ripe.length;
    const html = toStaticHtml(h(Market, { s, p: 0 }));
    expect(html).not.toContain(`data-a="m-watermelon-${green}"`);
    for (let pos = 0; pos < green; pos++) expect(html).toContain(`data-a="m-watermelon-${pos}"`);
    for (let pos = 0; pos < s.market.mango.length; pos++) expect(html).toContain(`data-a="m-mango-${pos}"`);
    s.market.watermelon[green] = 1;
    expect(toStaticHtml(h(Market, { s, p: 0 }))).toContain(`data-a="m-watermelon-${green}"`);
  });

  it('RULES.md gives an Unripe price only for fruit a lorry delivers green, and the right one', () => {
    const rows = readFileSync('RULES.md', 'utf8').split(/\r?\n/).filter((l) => /^\| \S+ (Blueberry|Watermelon|Apple|Mango) \|/.test(l));
    expect(rows.length).toBe(FRUITS.length);
    for (const f of FRUITS) {
      const row = rows.find((l) => l.includes(` ${FRUIT[f].name} |`))!;
      const cell = row.split('|').map((x) => x.trim()).filter(Boolean).pop();
      expect(cell).toBe(deliveredGreen(f) ? `${FRUIT[f].unripeSlots} nights ($${FRUIT[f].cost.unripe})` : 'none');
    }
    expect(readFileSync('RULES.md', 'utf8')).not.toMatch(/plus 1 for watermelon/);
  });
});

describe('the seen walk-in badge', () => {
  it('fits both favours that show a walk-in\'s card', () => {
    expect(SEEN_WALK_IN).toBe("You've seen this walk-in's card");
    expect(SEEN_WALK_IN).not.toMatch(/Gossip|Scout|heard/);
  });

  it('is the badge\'s title on a walk-in card you have seen', () => {
    const s = newGame({ players: [{ name: 'A', kind: 'human', avatar: 'x' }, { name: 'B', kind: 'human', avatar: 'y' }], days: 8, unripe: true, upgrades: true, events: false, seed: 3 });
    const html = toStaticHtml(h(CustomerChar, { s, c: s.forecast, kind: 'today', heard: true }));
    expect(html).toContain(`class="ear" title="${SEEN_WALK_IN}"`);
    expect(html).not.toMatch(/Gossip\)/);
  });
});
