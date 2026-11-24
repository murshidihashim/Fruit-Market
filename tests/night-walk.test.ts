import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { h } from 'preact';
import { EVENT_CARDS, RIVALS } from '../src/engine/data';
import { activePlayer, applyAction, effectiveMax, newGame, publicView, type GameState } from '../src/engine/game';
import { aiActFor } from '../src/engine/ai';
import { toStaticHtml } from '../src/ui/cards';
import { NightShift } from '../src/ui/game/panels/NightShift';
import { Street, Tomorrow } from '../src/ui/table';
import { NIGHT_EASE, walkFrames, walkFrom, walkMs, walkTable, walkers } from '../src/ui/tableModel';

// PLAN-128 (the owner): "tomorrow customer cards should be animated to enter the today's customer slot when fruit is
// aging, time it to be in sync". At night, on the night's own slide, tomorrow's cards walk from the Tomorrow strip into
// the places the next morning gives them, face up or face down exactly as the morning shows them.

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
/** The ids of the cards in a row, in order, and whether each is face down. */
const cards = (html: string) => [...html.matchAll(/<div class="cust ([^"]*)"[^>]*data-c="(-?\d+)"/g)].map((m) => ({ id: Number(m[2]), down: /\bmystery\b/.test(m[1]) }));

describe('tomorrow walks into today at night (PLAN-128)', () => {
  const evening = playTo(game(), (s) => s.phase === 'evening' && s.day >= 2 && s.queue.length >= 2);

  it('who walks: the cards of tomorrow\'s strip, the expected customer face up, a walk-in face down unless this stall saw it', () => {
    const w = walkers(evening, 0);
    expect(w.map((x) => x.c.id)).toEqual([evening.forecast!.id, ...evening.queue.map((c) => c.id)]);
    expect(w[0].up).toBe(true);
    expect(w.slice(1).every((x) => !x.up)).toBe(true);
    // a walk-in this stall has seen (Gossip, Scout, Sharp Ears) walks face up; a rival's look does not count
    const seen: GameState = { ...evening, queue: evening.queue.map((c, i) => (i === 0 ? { ...c, seenBy: [0] } : i === 1 ? { ...c, seenBy: [2] } : c)) };
    expect(walkers(seen, 0).map((x) => x.up)).toEqual([true, true, false, ...evening.queue.slice(2).map(() => false)]);
    // before today's crowd has arrived the strip holds the day after, so nobody walks; nor once the market has closed
    for (const phase of ['morning', 'order', 'buy', 'over'] as const) expect(walkers({ ...evening, phase }, 0)).toEqual([]);
  });

  it('nothing walks at dusk; from the slide on the cards stand in today\'s row, a face-down card with no name or price', () => {
    const at = (night: number | 'done' | null | undefined) => toStaticHtml(h(Street, { s: evening, viewer: 0, night }));
    expect(at(undefined)).not.toContain('data-walk');
    expect(at(null)).not.toContain('data-walk');
    for (const night of [900, 'done'] as const) {
      const row = cards(at(night));
      expect(row.map((c) => c.id)).toEqual(walkers(evening, 0).map((w) => w.c.id));
      expect(row.map((c) => c.down)).toEqual(walkers(evening, 0).map((w) => !w.up));
    }
    // a face-down walk-in shows the fruit on its back only: not its name, nor what it pays
    const html = at(900);
    for (const c of evening.queue) {
      const card = html.split(`data-c="${c.id}"`)[1].split('<div class="cust ')[0];
      expect(card).not.toContain(c.name);
      expect(card).not.toContain('$');
    }
  });

  it('a night straight after the rush: today\'s customers fade at dusk and have left the row before tomorrow\'s walk in', () => {
    const rush = playTo(game(), (s) => s.phase === 'reveal' && s.day >= 2 && s.firstMarket.length > 0);
    const at = (night: number | 'done' | null) => toStaticHtml(h(Street, { s: rush, viewer: 0, night }));
    const dusk = cards(at(null));
    expect(dusk.map((c) => c.id)).toEqual(rush.firstMarket.map((c) => c.id));
    expect((at(null).match(/tb-gone/g) ?? []).length).toBe(rush.firstMarket.length);
    for (const night of [900, 'done'] as const) expect(cards(at(night)).map((c) => c.id)).toEqual(walkers(rush, 0).map((w) => w.c.id));
  });

  it('the cards arrive as the next morning shows them: the same order, face up or face down alike', () => {
    const night = cards(toStaticHtml(h(Street, { s: publicView(evening, 0), viewer: 0, night: 'done' })));
    const morning = playTo(evening, (s) => s.day === evening.day + 1);
    expect(morning.phase).toBe('morning');
    const next = cards(toStaticHtml(h(Street, { s: publicView(morning, 0), viewer: 0 })));
    // (the morning's event may add a walk-in or a guest at the end of the row, or send one back: those were not on
    // tomorrow's strip, and are left out here)
    const both = night.filter((c) => next.some((x) => x.id === c.id));
    expect(both.length).toBeGreaterThanOrEqual(2);
    expect(next.filter((c) => both.some((x) => x.id === c.id))).toEqual(both);
  });

  it('a walking ticket prints its price without today\'s event (it lasts until night; tomorrow\'s is not turned over yet)', () => {
    const w = evening.forecast!.wants[0];
    const calm = EVENT_CARDS.find((e) => !e.priceAll && !e.price && !e.extra)!;
    const hike: GameState = { ...evening, event: { ...calm, priceAll: 2 } };
    expect(effectiveMax(walkTable(hike), w)).toBe(effectiveMax({ ...evening, event: null }, w));
    expect(effectiveMax(walkTable(hike), w)).not.toBe(effectiveMax(hike, w));
    const row = toStaticHtml(h(Street, { s: hike, viewer: 0, night: 900 }));
    expect(row).toContain(`$${effectiveMax({ ...evening, event: null }, w)}`);
  });

  it('the chips of the strip fade as their cards set off, and only then', () => {
    const strip = (night: number | 'done' | null | undefined) => toStaticHtml(h(Tomorrow, { s: evening, viewer: 0, night }));
    expect(strip(undefined)).not.toContain('tm-gone');
    expect(strip(null)).not.toContain('tm-gone');
    expect((strip(900).match(/tm-gone/g) ?? []).length).toBe(walkers(evening, 0).length);
    for (const w of walkers(evening, 0)) expect(strip(null)).toContain(`data-tm="${w.c.id}"`);
    // the strip is given the slide's length for the fade, as the lanes and your shelf are
    expect(strip(900)).toContain('--ns-ms:900ms');
  });
});

describe('the walk keeps time with the ageing (PLAN-128: one clock)', () => {
  const evening = playTo(game(), (s) => s.phase === 'evening' && s.day >= 2);

  it('the walk lasts exactly as long as the night\'s slide that ages the fruit, at every speed', () => {
    for (const slide of [900, 495, 135]) {
      expect(walkMs(slide)).toBe(slide);
      const row = toStaticHtml(h(Street, { s: evening, viewer: 0, night: slide }));
      // every walking card carries the slide's length, the same number the lanes slide over (--ns-ms)
      const lengths = [...row.matchAll(/data-walk-ms="(\d+(?:\.\d+)?)"/g)].map((m) => Number(m[1]));
      expect(lengths.length).toBe(walkers(evening, 0).length);
      expect(new Set(lengths)).toEqual(new Set([slide]));
      expect(toStaticHtml(h(NightShift, { s: evening, viewer: 0, slide }))).toContain(`--ns-ms:${slide}ms`);
    }
    // at dusk and once the pieces rest nothing moves
    expect(walkMs(null)).toBeNull();
    expect(walkMs('done')).toBeNull();
    expect(walkMs(undefined)).toBeNull();
  });

  it('on the same curve as the pieces sliding down the lanes and your shelf\'s chips', () => {
    const css = readFileSync('src/ui/table.css', 'utf8');
    expect(css).toContain(`.tb-pc.ns-piece { transition: transform var(--ns-ms, 0ms) ${NIGHT_EASE}`);
    expect(css).toContain(`.tb-dock.night .tb-chip { transition: transform var(--ns-ms, 0ms) ${NIGHT_EASE}`);
  });

  it('a card sets off over its chip, as small as the chip and unstretched, and ends in its place: position, size and fade only', () => {
    const chip = { left: 100, top: 60, width: 40, height: 26 };
    const card = { left: 20, top: 100, width: 80, height: 200 };
    expect(walkFrom(chip, card)).toBe('translate(60.0px, -127.0px) scale(0.1300)');
    const frames = walkFrames(chip, card);
    expect(frames[0]).toMatchObject({ opacity: 0 });
    expect(frames[frames.length - 1]).toEqual({ transform: 'none', opacity: 1 });
    for (const f of frames) expect(Object.keys(f).every((k) => ['transform', 'opacity', 'offset'].includes(k))).toBe(true);
  });

  it('the night\'s script ends the walk with the slide, so a tap puts the cards in their places at once', () => {
    const src = readFileSync('src/ui/game/animator.tsx', 'utf8');
    expect(src).toMatch(/await A\.hold\(NIGHT\.slide \+ NIGHT\.settle\);\s*endWalk\(\);\s*setSlide\('done'\);/);
  });
});
