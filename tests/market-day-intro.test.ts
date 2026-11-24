// PLAN-128: the first Market Day evening on a phone opens with a pop-up that says what is different on a Market Day,
// which cards there are and what can be built tonight. It shows once (a mark kept with the tips), never with the tips
// off, and only on the evening of a Market Day (the evening upgrades are offered).
import { beforeEach, describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { h } from 'preact';
import { autoplay } from '../src/engine/ai';
import { FAVOURS, MARKET_DAY_EVERY, MAX_UPGRADES, RIVALS, UPGRADES } from '../src/engine/data';
import { isDraftNight, newGame, type GameState } from '../src/engine/game';
import { toStaticHtml } from '../src/ui/cards';
import { MarketDayView, marketDayWords } from '../src/ui/FirstTime';
import { offersTonight } from '../src/ui/panel';
import { MARKET_DAY_SEEN, marketDayIntro, marketDayRead, markSeen, resetTutorial, skipTutorial, tipFor } from '../src/ui/tutorial';

const mem = new Map<string, string>();
beforeEach(() => {
  mem.clear();
  (globalThis as { localStorage?: unknown }).localStorage = {
    getItem: (k: string) => mem.get(k) ?? null, setItem: (k: string, v: string) => mem.set(k, v), removeItem: (k: string) => mem.delete(k),
  };
});

/** The evenings of a computer game, as the evening sheet sees them. */
function evenings(seed: number, marketDays = true): GameState[] {
  let s = newGame({
    players: RIVALS.slice(0, 4).map((r) => ({ name: r.name, kind: 'ai' as const, level: 'normal' as const, avatar: r.avatar })),
    days: 10, unripe: true, upgrades: true, events: true, marketDays, seed,
  });
  const out: GameState[] = [];
  for (let i = 0; i < 6000 && s.phase !== 'over'; i++) {
    if (s.phase === 'evening' && out[out.length - 1]?.day !== s.day) out.push(s);
    s = autoplay(s, 1);
  }
  return out;
}
const all = [1, 2, 3].flatMap((seed) => evenings(seed));
const draft = all.filter((s) => isDraftNight(s));
const plain = all.filter((s) => !isDraftNight(s));

describe('the Market Day pop-up', () => {
  it('shows on the first Market Day evening only, once on a phone', () => {
    expect(draft.length).toBeGreaterThan(3);
    expect(plain.length).toBeGreaterThan(3);
    for (const s of plain) expect(marketDayIntro(s, 0)).toBe(false);
    const first = draft[0];
    expect(first.day).toBe(MARKET_DAY_EVERY);
    expect(marketDayIntro(first, 0)).toBe(true);
    // the first-game tips seen before it do not hide it
    markSeen('evening');
    markSeen('day2');
    expect(marketDayIntro(first, 0)).toBe(true);
    marketDayRead();
    expect(JSON.parse(mem.get('fm.tutorial')!)).toContain(MARKET_DAY_SEEN);
    for (const s of draft) for (const p of [0, 1, 2, 3]) expect(marketDayIntro(s, p)).toBe(false);
    // Replay the tutorial (Settings) brings it back for the next game
    resetTutorial();
    expect(marketDayIntro(draft[1], 2)).toBe(true);
  });

  it('comes before the evening tip, which follows once it is read', () => {
    const s = draft[0];
    const ctx = { myBuyTurn: false, boughtToday: 0, pricing: false, picker: false, evening: true };
    expect(tipFor(s, ctx)).toBeNull();
    marketDayRead();
    expect(tipFor(s, ctx)?.id).toBe('evening');
  });

  it('never shows with the tips off, nor outside the evening', () => {
    skipTutorial();
    for (const s of draft) expect(marketDayIntro(s, 0)).toBe(false);
    resetTutorial();
    expect(marketDayIntro({ ...draft[0], phase: 'buy' }, 0)).toBe(false);
  });

  it('is asked for by the evening sheet only, for the stall whose evening it is', () => {
    const panel = readFileSync('src/ui/panel.tsx', 'utf8');
    const sheet = panel.slice(panel.indexOf('export function EveningSheet'));
    expect(sheet).toContain('useState(() => marketDayIntro(s, p))');
    expect(sheet).toContain('<MarketDayPopup s={s} p={p} offers={isDraftNight(s) ? offersTonight(s, p) : []} onDone={() => { marketDayRead(); setIntro(false); }} />');
    expect(panel.match(/marketDayIntro\(/g)?.length).toBe(1);
  });

  it('says what can be built tonight in the game\'s own numbers', () => {
    for (const s of draft) for (const p of [0, 1]) {
      const offers = offersTonight(s, p);
      const html = toStaticHtml(h(MarketDayView, { s, p, offers, onDone: () => {} }));
      const w = marketDayWords(s, p, offers);
      expect(w.different).toContain('Every third day, except the last, is a Market Day.');
      expect(w.different).toContain('standing order');
      for (const u of offers) {
        expect(html).toContain(UPGRADES[u].title);
        expect(html).toContain(`$${UPGRADES[u].cost}</b>`);
      }
      if (offers.length) {
        expect(w.build).toContain(`You have $${s.players[p].cash}.`);
        expect(w.build).toContain(`room for ${['no', 'one', 'two', 'three'][MAX_UPGRADES]} upgrades`);
      }
      const held = s.players[p].favours;
      if (held.length) for (const f of held) expect(w.favours).toContain(FAVOURS[f].title);
      else expect(w.favours).toBeNull();
      expect(html).not.toContain('!');
    }
  });

  it('leaves the standing order out when Market Days are off', () => {
    const off = evenings(4, false).find((s) => isDraftNight(s))!;
    expect(marketDayWords(off, 0, offersTonight(off, 0)).different).not.toContain('standing order');
  });
});
