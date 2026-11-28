import { describe, expect, it } from 'vitest';
import { h } from 'preact';
import { FRUIT, RIVALS, lookOf } from '../src/engine/data';
import { activePlayer, applyAction, newGame, publicView, type GameState } from '../src/engine/game';
import { aiActFor } from '../src/engine/ai';
import { toStaticHtml } from '../src/ui/cards';
import { Street, custLabel } from '../src/ui/table';

// PLAN-130 (REP-140 B-08 to B-11): the game table by keyboard and screen reader, small text and contrast.

const game = (): GameState => newGame({
  players: RIVALS.slice(0, 4).map((r, i) => ({ name: i ? r.name : 'Me', kind: i ? 'ai' as const : 'human' as const, avatar: r.avatar })),
  days: 8, unripe: true, upgrades: true, events: true, seed: 11,
});
function playTo(s: GameState, when: (s: GameState) => boolean): GameState {
  for (let i = 0; i < 20000 && !when(s); i++) {
    if (s.phase === 'morning') {
      const pick = s.players.findIndex((p) => p.traitOffer && !p.trait);
      s = pick >= 0 ? applyAction(s, pick, { kind: 'trait', trait: s.players[pick].traitOffer![0] }) : applyAction(s, 0, { kind: 'begin' });
    } else if (s.phase === 'reveal') s = applyAction(s, 0, { kind: 'finish' });
    else s = aiActFor(s, activePlayer(s))!;
  }
  if (!when(s)) throw new Error('the moment never came');
  return s;
}
const noop = () => undefined;

describe('B-09: the customer cards on the table', () => {
  const morning = playTo(game(), (s) => s.phase === 'morning' && s.day >= 2 && s.queue.length > 0 && !!s.forecast);
  const row = (s: GameState, scout = false) => toStaticHtml(h(Street, { s: publicView(s, 0), viewer: 0, onTip: noop, onScout: scout ? noop : undefined }));

  it('a card that opens the whole card is a real button with a spoken name: who, what they want, the most they pay', () => {
    const html = row(morning);
    const c = morning.forecast!;
    const button = html.match(new RegExp(`<button type="button" class="cust today[^"]*"[^>]*data-c="${c.id}"[^>]*>`))?.[0] ?? '';
    expect(button).not.toBe('');
    const label = button.match(/aria-label="([^"]*)"/)?.[1] ?? '';
    expect(label.startsWith(`${lookOf(c.name).title}, wants `)).toBe(true);
    for (const w of c.wants) expect(label).toContain(`${w.qty} ${w.qty === 1 ? FRUIT[w.fruit].name : FRUIT[w.fruit].plural} at up to $`);
    expect(label).toContain('See the whole card');
    expect(button).toContain('aria-haspopup="dialog"');
  });

  it('a face-down walk-in says only the fruit on its back, also when it can be picked (Scout) and is a button', () => {
    for (const scout of [false, true]) {
      const html = row(morning, scout);
      for (const c of morning.queue) {
        const tag = html.match(new RegExp(`<(div|button)[^>]*class="cust mystery[^"]*"[^>]*data-c="${c.id}"[^>]*>`))?.[0] ?? '';
        expect(tag.startsWith(scout ? '<button type="button"' : '<div')).toBe(true);
        expect(tag).not.toContain(c.name);
        expect(tag).not.toContain(lookOf(c.name).title);
        expect(tag).not.toContain('$');
        const card = html.split(`data-c="${c.id}"`)[1].split('class="cust ')[0];
        expect(card).not.toContain(lookOf(c.name).title);
        expect(card).not.toContain('$');
      }
    }
  });

  it('a card that opens nothing (no tip handler: the night walk, a card fading at dusk) stays a plain card', () => {
    const html = toStaticHtml(h(Street, { s: publicView(morning, 0), viewer: 0 }));
    expect(html).not.toContain('<button');
  });

  it('the label follows the card: a done fruit, a standing order\'s price, served and seen marks', () => {
    const c = morning.forecast!;
    const lines = c.wants.map((w) => ({ fruit: w.fruit, qty: w.qty, max: 6, done: false }));
    expect(custLabel(c, lines)).toMatch(/^.+, wants .+ at up to \$6 each\. .+ See the whole card$/);
    const done = custLabel(c, lines.map((l) => ({ ...l, done: true })), { left: 'served' });
    expect(done).toContain(': done');
    expect(done).toContain('Served.');
    expect(custLabel(c, lines, { left: 'none' })).toContain('Left with nothing.');
    expect(custLabel(c, lines, { heard: true })).toContain("You've seen this walk-in's card.");
    const order = custLabel({ ...c, order: { holder: 1, price: 9, stake: 5, ceiling: 10 } }, lines);
    expect(order).toContain('at $6 each');
    expect(order).toContain('Takes Fresh or Okay fruit at its price.');
  });
});
