// Favour cards are kept face down (RULES.md, "Favour cards"): everyone can count a stall's cards but not see which
// they are, and a card played is seen by everyone. Online a rival's cards reach this phone as stand-ins (the room's
// redact); offline the game's own view (publicView) still holds them. Neither may be read for a rival's card on screen
// (PLAN-091, item 10).
import { describe, expect, it, vi } from 'vitest';
import { h } from 'preact';
import { readFileSync } from 'node:fs';
import { autoplay } from '../src/engine/ai';
import { FAVOURS, RIVALS, type FavourId } from '../src/engine/data';
import { newGame, publicView, type GameState } from '../src/engine/game';
import { redact } from '../server/room';
import { toStaticHtml } from '../src/ui/cards';
import { favourArt } from '../src/ui/deckArt';
import { playedFavour } from '../src/ui/game/dayBeats';
import { rushCards } from '../src/ui/game/rush';
import { RushView } from '../src/ui/game/panels/RushTable';
import { TakingsView } from '../src/ui/game/panels/SalesSummary';
import { RivalDrop, Stalls } from '../src/ui/table';

// The stalls' boxes redraw themselves when a held-back total changes (hooks); a still picture needs none of that.
vi.mock('../src/ui/cashShown', async (original) => ({ ...(await original<typeof import('../src/ui/cashShown')>()), useCashShown: () => undefined }));
vi.mock('../src/ui/stockShown', async (original) => ({ ...(await original<typeof import('../src/ui/stockShown')>()), useStockShown: () => undefined }));

const IDS = Object.keys(FAVOURS) as FavourId[];
/** Every way a page could name a favour card: its title, or its picture. */
const named = (html: string, id: FavourId) => html.includes(FAVOURS[id].title) || html.includes(favourArt(id));

/** Every step of some games of computer stalls, with the step before it. */
const steps: [GameState, GameState][] = [];
for (const seed of [1, 2, 3, 4, 5, 6, 7, 8]) {
  let s = newGame({
    players: RIVALS.slice(0, 4).map((r) => ({ name: r.name, kind: 'ai' as const, level: 'normal' as const, avatar: r.avatar })),
    days: 10, unripe: true, upgrades: true, events: true, marketDays: true, seed,
  });
  for (let i = 0; i < 6000 && s.phase !== 'over'; i++) {
    const n = autoplay(s, 1);
    steps.push([s, n]);
    s = n;
  }
}
/** The views of one state that a phone is given: online (the room's), offline (the game's own). */
const views = (s: GameState, seat: number): [string, GameState][] => [['online', redact(s, seat)], ['offline', publicView(s, seat)]];

describe('a favour card played is named as the game says it aloud, not from the hand that held it', () => {
  // A card left a stall's hand: which one, from the whole game.
  const plays = steps.flatMap(([a, b]) => b.day !== a.day ? [] : a.players.flatMap((pl, p) => {
    const left = [...pl.favours];
    for (const id of b.players[p].favours) left.splice(left.indexOf(id), 1);
    return left.length === 1 ? [{ a, b, p, id: left[0] }] : [];
  }));

  it('whole games play favour cards, and not only Priority', () => {
    expect(plays.length).toBeGreaterThan(10);
    expect(plays.some((x) => x.id !== 'priority')).toBe(true);
  });

  it('online and offline, a rival\'s card is named by its log line; online its hand holds only stand-ins', () => {
    for (const { a, b, p, id } of plays) {
      const viewer = (p + 1) % a.players.length;
      for (const [where, [va, vb]] of [['online', [redact(a, viewer), redact(b, viewer)]], ['offline', [publicView(a, viewer), publicView(b, viewer)]]] as const) {
        expect(playedFavour(va, vb, p), `${where}: ${a.players[p].name} played ${id}`).toBe(id);
      }
      // the stall's own view names it too
      expect(playedFavour(redact(a, p), redact(b, p), p)).toBe(id);
      // online the rival's hand says nothing about which card it was
      expect(new Set(redact(a, viewer).players[p].favours)).toEqual(new Set(['priority']));
    }
  });

  it('when no new log line names a card, nothing is named', () => {
    const { a, b, p } = plays[0];
    expect(playedFavour(a, { ...b, log: a.log }, p)).toBeNull();
    // another stall's line does not count for this one
    const other = (p + 1) % a.players.length;
    expect(playedFavour(a, b, other)).toBeNull();
  });

  it('the label over the stall reads the log (animator.tsx), never the hand', () => {
    const src = readFileSync('src/ui/game/animator.tsx', 'utf8');
    expect(src).toContain('const played = playedFavour(prev, next, i);');
    expect(src).toContain("const t = A.tag(`p${i}`, played ? FAVOURS[played].title : 'A favour card', 'favour');");
    expect(src).not.toContain('before.favours.find(');
  });
});

describe('a favour card won by a rival in the rush is shown face down, online and offline', () => {
  // Days at the bell on which some stall won a card, with a stall that did not win it.
  const won = steps.filter(([, b]) => b.phase === 'reveal' && b.results && b.results.favours.length > 0).map(([, b]) => b);

  it('whole games have such days', () => {
    expect(won.length).toBeGreaterThan(5);
  });

  it('the rush card, the takings, the stalls row and a rival\'s details name only the viewer\'s own card', () => {
    let rivalCards = 0;
    for (const g of won) for (let viewer = 0; viewer < g.players.length; viewer++) {
      const mine = new Set(g.results!.favours.filter((f) => f.player === viewer).map((f) => f.favour));
      for (const [where, s] of views(g, viewer)) {
        const cards = rushCards(s, viewer);
        for (const c of cards.filter((x) => x.favour)) {
          const theirs = c.favour!.player !== viewer;
          if (theirs) rivalCards++;
          expect(c.favour!.id, where).toBe(theirs ? null : g.results!.favours.find((f) => f.customer === c.name)!.favour);
          const html = toStaticHtml(h(RushView, { s, a: { card: c, n: 1, of: cards.length, stage: 'result', at: 0, served: [] }, viewer }));
          if (theirs) {
            expect(html, where).toContain('aria-label="Favour card, face down"');
            for (const id of IDS) if (!mine.has(id)) expect(html.includes(`Favour card: ${FAVOURS[id].title}`) || html.includes(favourArt(id)), `${where} rush card names ${id}`).toBe(false);
          }
        }
        // the takings name the viewer's own card only
        const takings = toStaticHtml(h(TakingsView, { s, viewer }));
        for (const id of IDS) if (!mine.has(id)) expect(takings.includes(favourArt(id)), `${where} takings`).toBe(false);
        // the stalls row and each rival's details count the cards and name none
        const row = toStaticHtml(h(Stalls, { s, viewer, boards: {}, open: null, onOpen: () => undefined, onClose: () => undefined, off: [] }));
        for (const id of IDS) expect(named(row, id), `${where} stalls row`).toBe(false);
        for (let p = 0; p < s.players.length; p++) {
          if (p === viewer) continue;
          const drop = toStaticHtml(h(RivalDrop, { s, p, onClose: () => undefined }));
          for (const id of IDS) expect(named(drop, id), `${where} details of stall ${p}`).toBe(false);
        }
      }
    }
    expect(rivalCards).toBeGreaterThan(5);
  });
});
