import { describe, expect, it } from 'vitest';
import { existsSync } from 'node:fs';
import {
  BARROW_SHELF, BIG_TABLE, CUSTOMER_CARDS, FRUIT, MARKET_DAY_EVERY, ROW_CAP, START_CASH, stageAt, trackSlots, type FruitId,
} from '../src/engine/data';
import { SHARED_TOKENS, STALLS, STALL_TOKENS, boardHtml, counterHtml, shutterHtml, stallHtml, tokensHtml } from '../scripts/print-table';

// The table set (PLAN-111) is drawn from the game data. These tests fail when the printed board, sheets or tokens and the
// data disagree, or when a part goes missing.

const FRUITS: FruitId[] = ['blueberry', 'watermelon', 'mango', 'apple'];
const pages = (html: string) => html.split('<section class="page">').length - 1;
const count = (html: string, s: string) => html.split(s).length - 1;

describe('print table: the board', () => {
  const html = boardHtml();
  it('has two A3 panels', () => {
    expect(html).toContain('size: A3 landscape');
    expect(pages(html)).toBe(2);
  });
  it('draws every market box from the data, with its cost', () => {
    const boxes = FRUITS.reduce((n, f) => n + trackSlots(f).length, 0);
    expect(count(html, '<div class="mb ')).toBe(boxes);
    for (const f of FRUITS) for (const s of trackSlots(f)) expect(html).toContain(`<span class="cost">$${s.cost}</span>`);
  });
  it('has the event and lorry decks beside their cards, and a day track to 14 with the Market Days', () => {
    for (const s of ["Today's event", 'Event deck', "Tomorrow's lorry", 'Lorry deck', 'Customer deck', 'Guest']) expect(html).toContain(`<b>${s}</b>`);
    expect(count(html, '<i>Market Day</i>')).toBe([1, 2, 3, 4].filter((k) => k * MARKET_DAY_EVERY < 14).length);
    expect(html).toContain('<b>14</b><i>Long ends</i>');
  });
  it('has today\'s row (the cap and a guest) and the customer guide from the data', () => {
    expect(html).toContain(`Shuffle the ${CUSTOMER_CARDS.length} customer cards`);
    expect(html).toContain(`up to ${ROW_CAP - 1}.`);
    expect(html).toContain(`fruit marked "+1 at ${BIG_TABLE} stalls"`);
    expect(count(html, '<li>')).toBe(10);
  });
});

describe('print table: stall sheets, counters, shutters, tokens', () => {
  it('six stall sheets with a crate box in front of every shelf box, a price box per crate lane and the Fruit sold row', () => {
    const html = stallHtml();
    expect(pages(html)).toBe(STALLS.length);
    const perSheet = FRUITS.reduce((n, f) => n + FRUIT[f].ripe.length + FRUIT[f].unripeSlots, 0);
    // every lane is drawn twice (crate and shelf); a crate's green boxes are marked "not in a crate"
    expect(count(html, '<span class="cell ')).toBe(STALLS.length * 2 * 4 * Math.max(...FRUITS.map((f) => FRUIT[f].ripe.length + FRUIT[f].unripeSlots)));
    expect(count(html, '<span class="cell none">')).toBe(STALLS.length * 2 * (4 * 6 - perSheet));
    expect(count(html, '<b>PRICE $</b>')).toBe(STALLS.length * 4);
    expect(count(html, 'Fruit sold · cross off one')).toBe(STALLS.length);
    expect(stageAt('mango', FRUIT.mango.ripe.length)).toBe('unripe');
  });
  it('six counters, crate count (0 to a Handcart shelf) above the cash track, starting cash marked', () => {
    const html = counterHtml();
    expect(count(html, '<div class="ctr">')).toBe(STALLS.length);
    const ctr = html.split('<div class="ctr">')[1];
    expect(ctr.indexOf('Crate count')).toBeLessThan(ctr.indexOf('Cash ·'));
    expect(ctr).toContain(`<span>${BARROW_SHELF}</span>`);
    expect(ctr).toContain(`Yellow = where you start: $${START_CASH}.`);
  });
  it('six shutters, one A3 sheet each', () => {
    const html = shutterHtml();
    expect(pages(html)).toBe(STALLS.length);
    for (const s of STALLS) expect(html).toContain(`>${s.toUpperCase()}<`);
  });
  it('six bid cards and every token', () => {
    const html = tokensHtml();
    expect(count(html, '<div class="bid">')).toBe(STALLS.length);
    const perStall = STALL_TOKENS.reduce((n, [, k]) => n + k, 0);
    const shared = SHARED_TOKENS.reduce((n, [, k]) => n + k, 0);
    expect(count(html, '<span class="tk ')).toBe(STALLS.length * perStall + shared);
  });
});

describe('print table: the files', () => {
  it('are in the repository, with the guidebook', () => {
    for (const f of ['Board-2xA3', 'Stall-Sheets-6xA4', 'Counters-2xA4', 'Shutters-6xA3', 'Bid-Cards-and-Tokens-A4', 'Rules-Guidebook-v20']) {
      expect(existsSync(`print/table/Fruit-Market-${f}.pdf`), f).toBe(true);
    }
  });
});
