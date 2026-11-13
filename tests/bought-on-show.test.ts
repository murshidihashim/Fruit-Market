import { describe, expect, it, vi } from 'vitest';
import { h } from 'preact';
import { aiActFor } from '../src/engine/ai';
import { RIVALS } from '../src/engine/data';
import { activePlayer, applyAction, newGame, publicView, type GameState } from '../src/engine/game';
import { redact } from '../server/room';
import { toStaticHtml } from '../src/ui/cards';
import { RivalDrop, Stalls, boughtToday, rivalNote } from '../src/ui/table';

// The stalls' boxes redraw themselves when a held-back total changes (hooks); a still picture needs none of that.
vi.mock('../src/ui/cashShown', async (original) => ({ ...(await original<typeof import('../src/ui/cashShown')>()), useCashShown: () => undefined }));
vi.mock('../src/ui/stockShown', async (original) => ({ ...(await original<typeof import('../src/ui/stockShown')>()), useStockShown: () => undefined }));

// The owner's ruling (it replaces "on show until the bell", DEC-086): "players can only see what others buy during
// buying phase, it is hidden afterwards". On screen only: the game and what the room sends are unchanged.

const game = (stalls: number, seed: number): GameState => newGame({
  players: RIVALS.slice(0, stalls).map((r, i) => ({ name: i ? r.name : 'Me', kind: i ? 'ai' as const : 'human' as const, avatar: r.avatar })),
  days: 8, unripe: true, upgrades: true, events: true, seed,
});
/** Plays on (computers for everyone) until the test's moment. */
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
/** Has any rival of stall 0 something among today's purchases in the game's own data? */
const rivalsBought = (s: GameState) => s.players.some((pl, i) => i > 0 && Object.values(pl.boughtFruit ?? {}).some((t) => (t ?? []).some((n) => n > 0)));
/** The same game with nobody having bought anything today, as far as the drawing can tell. */
const nobodyBought = (s: GameState): GameState => ({ ...s, players: s.players.map((pl) => { const { boughtFruit: _gone, ...rest } = pl; return rest; }) });
const row = (s: GameState, open: number | null = null) => toStaticHtml(h(Stalls, { s, viewer: 0, boards: {}, open, onOpen: () => undefined, onClose: () => undefined, off: [] }));
const popUp = (s: GameState, p: number) => toStaticHtml(h(RivalDrop, { s, p, onClose: () => undefined }));

describe('what a stall bought today is drawn only while stalls buy', () => {
  for (const stalls of [3, 6]) {
    it(`${stalls} stalls, while buying: the boxes show each stall's purchases, and so do the pop-up and the spoken label`, () => {
      const s = playTo(game(stalls, 5), (x) => x.phase === 'buy' && x.day === 2 && activePlayer(x) === 0 && rivalsBought(x));
      const view = publicView(s, 0);
      const buyer = view.players.findIndex((_, i) => i > 0 && boughtToday(view, i).length > 0);
      expect(buyer).toBeGreaterThan(0);
      expect(row(view)).toContain('>What each bought today<');
      expect(row(view)).toContain('bought today: ');
      expect(row(view)).toContain('tb-buys');
      expect(row(view)).not.toBe(row(nobodyBought(view)));
      expect(popUp(view, buyer)).toContain('tk-drop-buys');
      expect(popUp(view, buyer)).toContain('>Bought today<');
    });

    it(`${stalls} stalls, at stocking, pricing and after the bell: the row is drawn the same whatever a rival bought`, () => {
      const seen = new Set<string>();
      let s = playTo(game(stalls, 5), (x) => x.phase === 'stall' && x.day === 2);
      while (s.day === 2 && s.phase !== 'over') {
        if ((s.phase === 'stall' || s.phase === 'bid' || s.phase === 'reveal' || s.phase === 'evening') && !seen.has(s.phase)) {
          // the game still holds what each stall bought until the bell: only the drawing leaves it out
          if (s.phase === 'stall' || s.phase === 'bid') expect(rivalsBought(s), s.phase).toBe(true);
          for (const view of [publicView(s, 0), redact(s, 0)]) {
            const plain = nobodyBought(view);
            expect(row(view), s.phase).toBe(row(plain));
            for (let p = 1; p < stalls; p++) {
              expect(boughtToday(view, p), s.phase).toEqual([]);
              expect(row(view, p), s.phase).toBe(row(plain, p));
              expect(popUp(view, p), s.phase).toBe(popUp(plain, p));
            }
            expect(boughtToday(view, 0), s.phase).toEqual([]);
            const html = row(view) + Array.from({ length: stalls - 1 }, (_, i) => popUp(view, i + 1)).join('');
            expect(html, s.phase).not.toMatch(/bought today|Bought today|tb-buys|tk-drop-buys/);
          }
          seen.add(s.phase);
        }
        s = s.phase === 'reveal' ? applyAction(s, 0, { kind: 'finish' }) : aiActFor(s, activePlayer(s))!;
      }
      expect([...seen]).toEqual(expect.arrayContaining(['stall', 'bid', 'reveal']));
    });
  }

  it('while crates are shut a rival\'s box keeps its cash and its word, and the row its heading', () => {
    const s = playTo(game(4, 5), (x) => x.phase === 'bid' && x.day === 2);
    const view = publicView(s, 0);
    const html = row(view);
    expect(html).toContain('>Rival crates · shut until the bell<');
    expect(html).not.toContain('tb-side');
    for (let p = 1; p < 4; p++) {
      expect(html).toContain(`data-a="p${p}-cash">$${view.players[p].cash}<`);
      // its word: how many pieces it put out (the box's own words, whatever they are)
      expect(rivalNote(view, p, false)).not.toBe('');
      expect(html).toContain(`>${rivalNote(view, p, false)}<`);
    }
  });
});
