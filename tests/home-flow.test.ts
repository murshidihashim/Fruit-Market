// REP-140 (PLAN-130) Home and the screens around it:
// B-01: the main action of the Daily and Sprint intros and the League stays at the foot of the screen, outside the part
//       that scrolls; How to play keeps its chapter tabs (B-16) and Back / Next outside it too.
// B-04: Home's League, Daily and Sprint cards and the intros show you as the game will seat you (never a rival's face).
// B-20: Continue goes straight into the game; New game asks first, as starting over ends the waiting game.
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { h } from 'preact';
import { dailyConfig, sprintConfig } from '../src/engine/daily';
import { RIVALS } from '../src/engine/data';
import { newGame } from '../src/engine/game';
import { toStaticHtml } from '../src/ui/cards';
import { ALL_STAGES } from '../src/ui/campaign';
import { DailyIntro } from '../src/ui/DailyIntro';
import { StartOverBody } from '../src/ui/Home';
import { HeroCard, resetModeVisit } from '../src/ui/HomeCards';
import { HowTo } from '../src/ui/HowTo';
import { LeagueView } from '../src/ui/League';
import { setupAvatar, shownAvatar, worn } from '../src/ui/looks';
import { FramedFace } from '../src/ui/stampCard';
import { leagueConfig } from '../src/ui/progress';

vi.mock('preact/hooks', () => ({
  useState: (v: unknown) => [typeof v === 'function' ? (v as () => unknown)() : v, () => undefined],
  useEffect: () => undefined, useLayoutEffect: () => undefined,
  useRef: (v: unknown) => ({ current: v }), useMemo: (f: () => unknown) => f(), useCallback: (f: unknown) => f,
}));

const mem = new Map<string, string>();
beforeEach(() => {
  mem.clear();
  resetModeVisit();
  (globalThis as { localStorage?: unknown }).localStorage = {
    getItem: (k: string) => mem.get(k) ?? null, setItem: (k: string, v: string) => mem.set(k, v), removeItem: (k: string) => mem.delete(k),
  };
});
const DATE = '2026-11-22';
const noop = () => undefined;
const ROSA = RIVALS[0].avatar;

describe('B-04: the face on a card is the face you get at the table', () => {
  it('setupAvatar is the table\'s shownAvatar for the same set-up, and never a rival\'s shopkeeper', () => {
    mem.set('fm.avatar', ROSA);
    for (const cfg of [leagueConfig(0, 'You', '🧑‍🍳'), dailyConfig(DATE, 'You'), sprintConfig(DATE, 'You')]) {
      const g = newGame(cfg);
      const me = setupAvatar(cfg);
      expect(me).toBe(shownAvatar(g.players, 0));
      expect(g.players.slice(1).map((p) => p.avatar)).not.toContain(me);
    }
    // Stage 1's rival is Rosa: a player who chose Rosa is shown as the first free shopkeeper, as at the table
    expect(ALL_STAGES[0].rivals.map((r) => RIVALS[r.idx].avatar)).toContain(ROSA);
    expect(setupAvatar(leagueConfig(0, 'You', ''))).not.toBe(ROSA);
    // with no rival as that shopkeeper, your own choice shows
    mem.set('fm.avatar', RIVALS[7].avatar);
    expect(setupAvatar(leagueConfig(0, 'You', ''))).toBe(RIVALS[7].avatar);
  });
  it('Home\'s League card and the Daily and Sprint intros draw that face, not your chosen one facing itself', () => {
    mem.set('fm.avatar', ROSA);
    const face = (who: string, size: number) => toStaticHtml(h(FramedFace, { who, size, look: worn() }));
    const props = { today: DATE, games: {}, next: null, onQuick: noop, onRoom: noop, onComputer: noop, onOnePhone: noop };
    const league = toStaticHtml(h(HeroCard, { ...props, mode: 'league' }));
    const me = setupAvatar(leagueConfig(0, '', ''));
    expect(face(me, 28)).not.toBe(face(ROSA, 28));
    expect(league).toContain(face(me, 28));
    expect(league).not.toContain(face(ROSA, 28));
    for (const kind of ['daily', 'sprint'] as const) {
      const cfg = kind === 'daily' ? dailyConfig(DATE, 'You') : sprintConfig(DATE, 'You');
      const html = toStaticHtml(h(DailyIntro, { kind, today: DATE, waiting: null, onBack: noop, onStart: noop, onContinue: noop, onSwitch: noop }));
      expect(html, kind).toContain(face(setupAvatar(cfg), 34));
      // the day's rivals include Rosa, so the chosen Rosa is not drawn facing her
      expect(cfg.players.slice(1).map((p) => p.avatar), kind).toContain(ROSA);
      expect(html, kind).not.toContain(face(ROSA, 34));
      const card = toStaticHtml(h(HeroCard, { ...props, mode: kind }));
      expect(card, kind).toContain(face(setupAvatar(cfg), 44));
      expect(card, kind).not.toContain(face(ROSA, 44));
    }
  });
});

describe('B-01 and B-16: the main action and the chapter tabs stay in view', () => {
  it('the Daily and Sprint intros put Start (or Continue) in a foot outside the scrolling part', () => {
    for (const kind of ['daily', 'sprint'] as const) {
      const html = toStaticHtml(h(DailyIntro, { kind, today: DATE, waiting: null, onBack: noop, onStart: noop, onContinue: noop, onSwitch: noop }));
      const main = html.slice(html.indexOf('<main class="sbk-scroll">'), html.indexOf('</main>'));
      const foot = html.slice(html.indexOf('<footer class="jp-foot">'));
      expect(main, kind).not.toContain('data-a="intro-start"');
      expect(foot, kind).toContain('data-a="intro-start"');
    }
  });
  it('the League puts its Play button in a foot outside the scrolling part', () => {
    const html = toStaticHtml(h(LeagueView, { onBack: noop, onPlay: noop, sel: 0, onPick: noop }));
    const main = html.slice(html.indexOf('<main class="sbk-scroll">'), html.indexOf('</main>'));
    expect(main).not.toContain('Play stage 1');
    expect(html.slice(html.indexOf('</main>'))).toMatch(/<footer class="jp-foot"><button type="button" class="jp-go">Play stage 1<\/button><\/footer>/);
  });
  it('How to play keeps its chapter tabs above the scrolling page and Back / Next below it', () => {
    const html = toStaticHtml(h(HowTo, { onDone: noop, inTab: true }));
    const tabs = html.indexOf('class="ht-tabs"'), main = html.indexOf('<main'), end = html.indexOf('</main>'), foot = html.indexOf('class="ht-foot"');
    expect(tabs).toBeGreaterThan(0);
    expect(tabs).toBeLessThan(main);
    expect(foot).toBeGreaterThan(end);
    expect(html.slice(foot)).toContain('Next →');
  });
});

describe('B-20: Continue and New game', () => {
  it('New game asks first: the waiting game, that starting over ends it, Keep my game as the main button', () => {
    const picked: string[] = [];
    const tree = h(StartOverBody, { mode: 'Computer game', day: 4, days: 10, stalls: 4, cash: 23, onKeep: () => picked.push('keep'), onStartOver: () => picked.push('over') });
    const html = toStaticHtml(tree);
    expect(html).toContain('<b>Computer game</b><small>Day 4 of 10 · 4 stalls · you have $23</small>');
    expect(html).toContain('Starting over ends this game.');
    expect(html.indexOf('Keep my game')).toBeLessThan(html.indexOf('Start over<'));
    expect(html).toMatch(/<button class="btn primary big wide">Keep my game<\/button>/);
    expect(html).not.toContain('Resume');
  });
});
