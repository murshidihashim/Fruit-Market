import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { h } from 'preact';
import { FRUITS, RIVALS, lookOf } from '../src/engine/data';
import { newGame, type GameState } from '../src/engine/game';
import { redact } from '../server/room';
import { toStaticHtml } from '../src/ui/cards';
import { customerArt } from '../src/ui/deckArt';
import { MyStall, Street, Tomorrow, nameSize, shelfGroups } from '../src/ui/table';
import { TIPS } from '../src/ui/tutorial';

// The game screen layout the owner approved ("Phone A"): today's customers in one row, a slim Tomorrow strip,
// the rivals strip, the market in the middle and your shelf docked above the action bar.
const game = (): GameState => newGame({
  players: RIVALS.slice(0, 4).map((r, i) => ({ name: i ? r.name : 'Me', kind: i ? 'ai' as const : 'human' as const, avatar: r.avatar })),
  days: 8, unripe: true, upgrades: true, events: true, seed: 11,
});
/** The table once buying is over: today's crowd has arrived, and the forecast and walk-ins are tomorrow's. */
const afterBuying = (): GameState => {
  const s = game();
  return { ...s, phase: 'stall', firstMarket: [s.queue[0]] };
};

describe('your shelf dock (table.tsx MyStall)', () => {
  it('counts the pieces of every fruit by freshness and keeps all four fruits as places fruit can fly to', () => {
    const stock = Object.fromEntries(FRUITS.map((f) => [f, [0, 0, 0, 0, 0, 0, 0, 0, 0]])) as GameState['players'][number]['stock'];
    stock.blueberry[2] = 2; // fresh
    stock.blueberry[1] = 1; // okay
    stock.blueberry[0] = 3; // tired
    stock.apple[1] = 3; // okay
    const g = shelfGroups(stock);
    // Drawn in the table board's lane order (shortest life first), with all four fruits always present.
    expect(g.map((x) => x.f)).toEqual(['blueberry', 'watermelon', 'mango', 'apple']);
    expect([...g.map((x) => x.f)].sort()).toEqual([...FRUITS].sort());
    expect(g.find((x) => x.f === 'blueberry')!.stages).toEqual([{ stage: 'fresh', n: 2 }, { stage: 'okay', n: 1 }, { stage: 'notso', n: 3 }]);
    expect(g.find((x) => x.f === 'apple')!.stages).toEqual([{ stage: 'okay', n: 3 }]);
    expect(g.find((x) => x.f === 'mango')).toMatchObject({ n: 0, stages: [] });
  });

  it('shows your name, shelf space and an anchor for every fruit, even an empty one', () => {
    const s = game();
    const html = toStaticHtml(h(MyStall, { s, p: 0 }));
    expect(html).toContain('class="my-stall dock');
    expect(html).toContain('>Me<');
    expect(html).toMatch(/Shelf space: 0 of \d+ used/);
    for (const f of FRUITS) expect(html).toContain(`data-a="p0-${f}"`);
  });

  it('does not repeat "YOU" next to a player called You', () => {
    const s = game();
    const you = { ...s, players: s.players.map((pl, i) => (i ? pl : { ...pl, name: 'You' })) };
    expect(toStaticHtml(h(MyStall, { s: you, p: 0 }))).not.toContain('you-tag');
    expect(toStaticHtml(h(MyStall, { s, p: 0 }))).toContain('you-tag');
  });

  it('the first-game tip after a purchase describes the shelf chips as they are now (counts by freshness)', () => {
    const tip = TIPS.find((t) => t.id === 'bought')!.text;
    expect(tip).not.toContain('nights it has left');
    expect(tip).toContain('fresh');
  });
});

describe('small customer cards (table.tsx nameSize)', () => {
  it('longer names get a smaller banner step so they stay on the card', () => {
    expect(nameSize('Zara Zapp')).toBeUndefined();
    expect(nameSize('Rockstar Grace')).toBe('nm-m');
    expect(nameSize('Professor Pebble')).toBeUndefined(); // the card's own x-long step
    expect(nameSize('Firefighter Osman')).toBe('nm-xl');
  });
});

describe('today and tomorrow (table.tsx Street, Tomorrow)', () => {
  it('after buying, the row holds only today\'s customers; tomorrow\'s are in the Tomorrow strip', () => {
    const s = afterBuying();
    const row = toStaticHtml(h(Street, { s, viewer: 0 }));
    expect(row.match(/class="cust /g) ?? []).toHaveLength(1);
    expect(row).not.toContain(customerArt(s.forecast!.name)!);
    const strip = toStaticHtml(h(Tomorrow, { s, viewer: 0 }));
    expect(strip).toContain(customerArt(s.forecast!.name)!);
    expect(strip.match(/tm-chip tm-back/g) ?? []).toHaveLength(s.queue.length);
  });

  it('a face-down walk-in in the Tomorrow strip shows only the fruit it wants, also online', () => {
    const s = afterBuying();
    for (const view of [s, redact(s, 0)]) {
      const strip = toStaticHtml(h(Tomorrow, { s: view, viewer: 0 }));
      for (const c of s.queue) {
        expect(strip).not.toContain(customerArt(c.name)!);
        expect(strip).not.toContain(`>${lookOf(c.name).title}<`);
      }
      const backs = strip.split('tm-chip tm-back').slice(1).map((x) => x.split('</span>')[0]);
      for (const b of backs) expect(b).not.toContain('$');
    }
  });

  it('there is no Tomorrow strip before buying ends (tomorrow\'s customers are not drawn yet)', () => {
    expect(toStaticHtml(h(Tomorrow, { s: game(), viewer: 0 }))).toBe('');
  });
});

describe('the game screen grid (styles.css)', () => {
  const css = readFileSync('src/ui/styles.css', 'utf8');
  it('phones stack top bar, customers, rivals, market, shelf and action bar, with only the market flexible', () => {
    expect(css).toContain('grid-template-areas: "top" "net" "street" "rivals" "mid" "dock" "act";');
    expect(css).toContain('grid-template-rows: auto auto auto auto minmax(0, 1fr) auto auto;');
  });
  it('desktop has three columns: customers | market | rivals, shelf and the main button', () => {
    expect(css).toContain('grid-template-areas: "top top top" "net net net" "street mid rivals" "street mid dock" "street mid act";');
  });
  it('the stocking and pricing buttons take the action bar\'s place', () => {
    expect(css).toMatch(/\.gx > \.actionbar, \.gx > \.centre > \.pp-lock \{ grid-area: act; \}/);
  });
});
