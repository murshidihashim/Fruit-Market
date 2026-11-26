// PLAN-120: the Play page without the League and the Daily, and the Daily intro's words from the day's own set-up.
// PLAN-124 (this file's Home tests were rewritten for it): Home as "Shopfront and Board": the Market tab (a profile chip,
// one hero card for the chosen mode, the mode tabs and one Play button), the Stall tab, the Rules tab and the bottom bar.
// The PLAN-120/121/123 Home (the stall and goals row, the swiping mode cards, their dots and chips, the level box, the
// How to play / Settings strip) is gone, so its tests went with it.
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { h } from 'preact';
import { SPRINT_DAYS, SPRINT_WEEK_DAYS, dailyConfig, dailyTwist, sprintConfig } from '../src/engine/daily';
import { newGame, type GameState } from '../src/engine/game';
import { toStaticHtml } from '../src/ui/cards';
import { introWords } from '../src/ui/DailyIntro';
import { shortDate } from '../src/ui/dailyCard';
import { PlayMenu, Shopfront, type ShopProps } from '../src/ui/Home';
import { MODES, resetModeVisit, saveMode, savedMode, startMode, waitWords } from '../src/ui/HomeCards';
import { waitingGame } from '../src/ui/paused';
import { leagueConfig } from '../src/ui/progress';
import type { SaveSlot } from '../src/ui/store';

// The screens drawn once, as a string: each hook gives its first value (as in shelf-tonight.test.ts); nothing is fetched.
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
const at = (g: GameState, day: number, cash: number): GameState => ({ ...g, day, players: g.players.map((p, i) => ({ ...p, cash: cash - i })) });
const base = (games: Partial<Record<SaveSlot, GameState>>): ShopProps => ({
  games, today: DATE, notice: null, tab: 'market', onTab: noop, onContinue: noop, onNewGame: noop, onPlay: noop, onDaily: noop, onSprint: noop, onLeague: noop,
  onQuick: noop, onPrivate: noop, onComputer: noop, onOnePhone: noop, onWardrobe: noop, onAccount: noop, onTrophies: noop, onSettings: noop,
});
const home = (games: Partial<Record<SaveSlot, GameState>>, extra: Partial<ShopProps> = {}) => toStaticHtml(h(Shopfront, { ...base(games), ...extra }));
type Props = Record<string, unknown> & { onClick: () => void };
/** The first element in a drawn tree whose props match (function components are called, as the screen would). */
const find = (n: unknown, ok: (p: Record<string, unknown>) => boolean): Props | null => {
  if (!n || typeof n !== 'object') return null;
  const v = n as { type?: unknown; props?: Record<string, unknown> & { children?: unknown } };
  if (v.props && ok(v.props)) return v.props as Props;
  if (typeof v.type === 'function') return find((v.type as (p: unknown) => unknown)(v.props), ok);
  const kids = v.props?.children;
  for (const k of Array.isArray(kids) ? kids.flat(Infinity) : [kids]) { const f = find(k, ok); if (f) return f; }
  return null;
};

describe('the Daily intro says what the mode is, from the configs', () => {
  it('the Daily market: same market, its length and stalls, the rivals at Normal, today\'s twist, the ranking and retries', () => {
    const cfg = dailyConfig(DATE, 'You');
    const w = introWords('daily', DATE);
    expect(w.title).toBe('Daily market');
    expect(w.length).toBe(`${cfg.days} days · ${cfg.players.length} stalls`);
    expect(w.goal).toBe(`The same market for everyone today: the same customers, lorry and events. End ${cfg.days} days with the most cash.`);
    expect(w.how).toEqual([
      `${cfg.days} days, 4 stalls. Against Rosa, Uncle Benny and Ah Chen, all Normal.`,
      `Today's twist: ${dailyTwist(DATE).title}. ${dailyTwist(DATE).text}`,
    ]);
    expect(w.score).toEqual(['Ranked by final cash, then by fruit sold.', 'Your best today counts on today\'s board.']);
    expect(w.retry).toBe('Play it again today if you like. Only your best counts.');
    // a twist that changes the length changes the words
    const long = Array.from({ length: 7 }, (_, k) => `2026-11-${String(16 + k).padStart(2, '0')}`).find((d) => dailyTwist(d).title === 'Long game')!;
    expect(introWords('daily', long).length).toBe('14 days · 4 stalls');
  });

  it('the Sprint: 3 days, retry as often as you like, your best counts, the week counts your best 5 days', () => {
    const cfg = sprintConfig(DATE, 'You');
    const w = introWords('sprint', DATE);
    expect(cfg.days).toBe(SPRINT_DAYS);
    expect(w.title).toBe('Sprint');
    expect(w.length).toBe(`${SPRINT_DAYS} days · 4 stalls`);
    expect(w.how[0]).toBe(`${SPRINT_DAYS} days, 4 stalls. Against Rosa, Uncle Benny and Ah Chen, all Normal.`);
    expect(w.score).toContain(`The week counts your best ${SPRINT_WEEK_DAYS} days.`);
    expect(w.score).toContain('Your best today counts on today\'s board.');
    expect(w.retry).toBe('Retry as often as you like.');
  });

  it('is plain: no exclamation marks', () => {
    for (const k of ['daily', 'sprint'] as const) {
      const w = introWords(k, DATE);
      for (const t of [w.title, w.length, w.goal, ...w.how, ...w.score, w.retry]) expect(t).not.toContain('!');
    }
  });
});

describe('the Play page keeps the Normal game group only', () => {
  // PLAN-125 (DEC-133): the four ways, in order; joining with a code is on the Private Room page, the Public rooms on
  // the Quick Match page, and the game length on each way's own page.
  it('has Quick Match, Private Room, Computer and Pass & Play, and no League, Daily or Sprint', () => {
    const html = toStaticHtml(h(PlayMenu, { onBack: noop, onQuick: noop, onRoom: noop, onComputer: noop, onOnePhone: noop }));
    expect([...html.matchAll(/data-a="(quick|room|computer|phone|join|public)"/g)].map((m) => m[1])).toEqual(['quick', 'room', 'computer', 'phone']);
    expect(html).toContain('data-a="normal-game"');
    for (const t of ['Quick Match', 'Private Room', 'Computer', 'Pass &amp; Play']) expect(html).toContain(`<b>${t}</b>`);
    for (const a of ['league', 'daily', 'sprint']) expect(html).not.toContain(`data-a="${a}"`);
    expect(html).not.toContain('jp-mode');
    expect(html).not.toContain('jp-len');
    expect(html).not.toMatch(/One phone/i);
  });
});

describe('PLAN-124 Home, the Market tab: the profile chip, one hero card, the mode tabs and one Play button', () => {
  it('draws the title, the chip with your name, level and rank, the Custom match card, four tabs and Play', () => {
    mem.set('fm.name', 'Mblabla');
    const html = home({});
    expect(html).toContain('class="jh-shell jh-on-market"');
    // the profile chip: the face, "NAME · Lvl N", the rank, the gear named Settings, the rest opening the Stall tab
    expect(html).toMatch(/data-a="profile" aria-label="Mblabla, level 1, Roadside Table\. Open your stall"/);
    expect(html).toContain('<span class="jh-pnm">Mblabla</span>');
    expect(html).toContain('· Lvl 1</span>');
    expect(html).toMatch(/<button class="jh-gear" data-a="settings" aria-label="Settings">/);
    // one hero card: Custom match, its four ways (each a button), you against three rivals, the Next line
    expect([...html.matchAll(/data-card="(\w+)"/g)].map((m) => m[1])).toEqual(['custom']);
    expect(html).toContain('<h2>Custom match</h2><small>your market, your way</small>');
    for (const w of ['quick', 'room', 'computer', 'phone']) expect(html).toContain(`data-a="way-${w}"`);
    // PLAN-125: the four ways' names and lines from the approved mockup B; "Pass & Play" replaces "One phone"
    for (const t of ['Quick Match', 'Strangers online', 'Private Room', 'Friends by link or code', 'Computer', 'On this phone', 'Pass &amp; Play', 'Take turns on this phone']) expect(html).toContain(t);
    expect(html).not.toMatch(/One phone/i);
    expect(html).toContain('<i>vs</i>');
    expect(html).toMatch(/<span class="jh-next3"><b>Next:<\/b> .+<\/span>/);
    // the mode tabs: a tablist, Custom chosen, the card is its panel
    expect(html).toContain('role="tablist" aria-label="Game modes"');
    expect([...html.matchAll(/role="tab" id="jh-tab-(\w+)"/g)].map((m) => m[1])).toEqual(['custom', 'league', 'daily', 'sprint']);
    expect(html).toMatch(/id="jh-tab-custom" class="jh-tab on [^"]*" data-tab="custom" aria-selected="true" aria-controls="jh-hero" tabIndex="0"/);
    expect(html).toMatch(/id="jh-tab-league" class="jh-tab {2}[^"]*" data-tab="league" aria-selected="false" aria-controls="jh-hero" tabIndex="-1"/);
    expect(html).toContain('id="jh-hero" class="jh-panel" role="tabpanel" aria-labelledby="jh-tab-custom"');
    // one Play button, keeping Home's "play" hook (it opens the Play page); no Continue
    expect(html).toMatch(/<button class="jh-go jh-play" data-a="play" aria-label="Play, Custom match">Play<\/button>/);
    expect(html).not.toContain('data-a="continue-');
    // the order on screen: chip, card, tabs, Play, then the bottom bar
    const order = ['jh-prof', 'id="jh-hero"', 'role="tablist"', 'jh-go-row', 'jh-nav3'].map((k) => html.indexOf(k));
    expect(order).toEqual([...order].sort((a, b) => a - b));
    expect(order.every((i) => i > 0)).toBe(true);
  });

  it('what went away: the swiping rows, their dots and arrows, the chips, the level box and the How to play / Settings strip', () => {
    const html = home({});
    for (const gone of ['jh-row', 'jh-srow', 'jh-dot', 'jh-chip', 'jh-arr', 'jh-lvl', 'jh-foot', 'hm-foot', 'aria-roledescription="carousel"', '>How to play</button>']) {
      expect(html).not.toContain(gone);
    }
  });

  it('each tab draws its own card and its own Play: the League screen, the Daily intro, the Sprint intro', () => {
    for (const [mode, hook, name] of [['league', 'league', 'Market League'], ['daily', 'daily', 'Daily market'], ['sprint', 'sprint', 'Sprint']] as const) {
      resetModeVisit();
      mem.set('fm.homeMode', mode);
      const html = home({});
      expect([...html.matchAll(/data-card="(\w+)"/g)].map((m) => m[1])).toEqual([mode]);
      expect(html).toContain(`<h2>${name}</h2>`);
      expect(html).toContain(`aria-labelledby="jh-tab-${mode}"`);
      expect(html).toMatch(new RegExp(`data-a="${hook}" aria-label="Play, ${name}">Play</button>`));
    }
  });

  it('the League card: the stage picture with its rivals, the title, the goal, the stars and the next trophy', () => {
    mem.set('fm.homeMode', 'league');
    const html = home({});
    expect(html).toContain('Stage 1 of');
    for (const c of ['jh-lgart', 'jh-lgvs', 'jh-lgt', 'jh-lgg', 'jh-lgs', 'stars in all', 'Next trophy']) expect(html).toContain(c);
  });

  it('the Daily card: the first customer, the lorry, the twist, your best or "Not played today", you against its rivals', () => {
    mem.set('fm.homeMode', 'daily');
    const html = home({});
    expect(html).toContain(`<small>${shortDate(DATE)}</small>`);
    expect(html).toContain('jh-dcard');
    expect(html).toContain('Today\'s lorry brings');
    expect(html).toContain(`<b>${dailyTwist(DATE).title}</b>`);
    expect(html).toContain('Not played today');
    expect(html).toContain('jh-dvs');
  });

  it('the Sprint card: 3 days, its first customer and lorry, your best today, the week line and its reason', () => {
    mem.set('fm.homeMode', 'sprint');
    const html = home({});
    expect(html).toContain(`<small>${SPRINT_DAYS} days · ${shortDate(DATE)}</small>`);
    expect(html).toContain('A few minutes. Beat your best.');
    expect(html).toContain('jh-dcard');
    expect(html).toContain('Not played today');
    expect(html).toContain(`Your best ${SPRINT_WEEK_DAYS} days count.`);
  });

  it('a mode with a game waiting: its tab says the day, and Play becomes Continue (mode, day, cash) beside New game', () => {
    const play = at(newGame({ players: [{ name: 'A', kind: 'human', avatar: '🐸' }, { name: 'Rosa', kind: 'ai', level: 'easy', avatar: '🦊' }], days: 10, unripe: true, upgrades: true, events: true, seed: 3 }), 4, 23);
    const daily = at(newGame(dailyConfig(DATE, 'A')), 6, 31);
    expect(waitWords(waitingGame(play)!)).toBe('Day 4 of 10 · $23');
    mem.set('fm.homeMode', 'custom');
    const html = home({ play, daily });
    expect(html).toMatch(/data-tab="custom" aria-selected="true"[^>]*aria-label="Custom, Computer game waiting on day 4"/);
    expect(html).toMatch(/data-tab="daily" aria-selected="false"[^>]*aria-label="Daily, Daily market waiting on day 6"/);
    expect(html).toContain('<b>Custom</b><small>Day 4</small>');
    expect(html).toContain('<b>Daily</b><small>Day 6</small>');
    expect(html).toContain('<b>League</b></button>');
    // Continue for the chosen mode, and New game (REP-140 B-20: it asks first, then goes where Play would; the same "play" hook)
    expect(html).toContain('data-a="continue-play"');
    expect(html).toContain('<b>Continue</b><small>Computer game · Day 4 of 10 · $23</small>');
    expect(html).toMatch(/<button class="jh-new" data-a="play" aria-label="New game, Custom match">New game<\/button>/);
    // the Custom card shows the waiting game's table
    expect(html).toContain('aria-label="The table"');
    // every mode waiting: each tab with its Continue
    const all = { play, daily, league: at(newGame(leagueConfig(2, 'A', '')), 2, 14), sprint: at(newGame(sprintConfig(DATE, 'A')), 2, 12) };
    for (const [mode, slot] of [['league', 'league'], ['daily', 'daily'], ['sprint', 'sprint']] as const) {
      resetModeVisit();
      mem.set('fm.homeMode', mode);
      const h2 = home(all);
      expect(h2).toContain(`data-a="continue-${slot}"`);
      expect(h2).toMatch(new RegExp(`<button class="jh-new" data-a="${slot}"`));
    }
    resetModeVisit();
    mem.set('fm.homeMode', 'league');
    expect(home(all)).toContain('League stage 3 · Day 2 of');
  });

  it('remembers the chosen tab in a small key; on the first view a waiting game\'s tab opens unless the remembered one waits', () => {
    const daily = at(newGame(dailyConfig(DATE, 'A')), 6, 31);
    const sprint = at(newGame(sprintConfig(DATE, 'A')), 2, 12);
    expect(savedMode()).toBeNull();
    expect(startMode({})).toBe('custom');
    resetModeVisit();
    // nothing remembered: the first mode with a game waiting
    expect(startMode({ daily, sprint })).toBe('daily');
    // later in the same visit, the tab shown stays (coming back from the League screen, say)
    expect(startMode({})).toBe('daily');
    resetModeVisit();
    // remembered and waiting: the remembered one
    saveMode('sprint');
    resetModeVisit();
    expect(startMode({ daily, sprint })).toBe('sprint');
    // remembered but not waiting, another waiting: the waiting one
    saveMode('league');
    resetModeVisit();
    expect(startMode({ daily })).toBe('daily');
    // remembered, nothing waiting: the remembered one (kept across a reload in fm.homeMode, never in a save)
    resetModeVisit();
    expect(startMode({})).toBe('league');
    expect(mem.get('fm.homeMode')).toBe('league');
    expect(MODES.map((m) => [m.id, m.slot])).toEqual([['custom', 'play'], ['league', 'league'], ['daily', 'daily'], ['sprint', 'sprint']]);
  });

  it('"Back to room" for an open online match and an old-save notice stay above the hero card', () => {
    const html = home({}, { room: 'ABC123', onRoom: noop, notice: 'Your unfinished game couldn\'t be read, so it was cleared.' });
    expect(html).toContain('Back to room ABC123');
    expect(html.indexOf('save-notice')).toBeLessThan(html.indexOf('id="jh-hero"'));
    expect(html.indexOf('Back to room')).toBeLessThan(html.indexOf('id="jh-hero"'));
  });

  it('the bottom bar: Stall, Market and Rules, the tab shown marked as the current page', () => {
    const html = home({});
    expect(html).toContain('<nav class="jh-nav3" aria-label="Home">');
    expect([...html.matchAll(/data-nav="(\w+)"/g)].map((m) => m[1])).toEqual(['stall', 'market', 'rules']);
    expect(html).toMatch(/<button class="on" data-nav="market" aria-current="page">/);
    for (const l of ['Stall', 'Market', 'Rules']) expect(html).toContain(`<span>${l}</span>`);
  });

  it('the buttons call what they say: the four ways, Play, Continue, the chip, the gear and the bar', () => {
    const called: string[] = [];
    const log = (k: string) => () => { called.push(k); };
    const play = at(newGame({ players: [{ name: 'A', kind: 'human', avatar: '🐸' }, { name: 'Rosa', kind: 'ai', level: 'easy', avatar: '🦊' }], days: 10, unripe: true, upgrades: true, events: true, seed: 3 }), 4, 23);
    const props = (games: Partial<Record<SaveSlot, GameState>>): ShopProps => ({
      ...base(games), onPlay: log('play-page'), onQuick: log('quick'), onPrivate: log('room'), onComputer: log('computer'), onOnePhone: log('phone'),
      onSettings: log('settings'), onTab: (t) => { called.push(`tab:${t}`); }, onContinue: (s) => { called.push(`continue:${s}`); },
      onNewGame: (s) => { called.push(`new:${s}`); },
    });
    const tree = h(Shopfront, props({}));
    for (const a of ['way-quick', 'way-room', 'way-computer', 'way-phone', 'play', 'profile', 'settings']) find(tree, (pp) => pp['data-a'] === a)!.onClick();
    find(tree, (pp) => pp['data-nav'] === 'rules')!.onClick();
    expect(called).toEqual(['quick', 'room', 'computer', 'phone', 'play-page', 'tab:stall', 'settings', 'tab:rules']);
    called.length = 0;
    const waiting = h(Shopfront, props({ play }));
    find(waiting, (pp) => pp['data-a'] === 'continue-play')!.onClick();
    find(waiting, (pp) => pp['data-a'] === 'play')!.onClick();
    // REP-140 B-20: Continue goes into the game; New game asks first (App.tsx: StartOverBody), not straight to the Play page
    expect(called).toEqual(['continue:play', 'new:play']);
  });
});

describe('PLAN-124 Home, the Stall and Rules tabs', () => {
  it('the Stall tab: your stall with the stamp book and the Wardrobe, your next goals; no mode card', () => {
    const html = home({}, { tab: 'stall' });
    expect(html).toContain('class="jh-shell jh-on-stall"');
    expect(html).toContain('jh-stall2');
    expect(html).toMatch(/<button class="jh-ib" data-a="stamp-book" aria-label="Stamp book, \d+ of \d+ stamps">[\s\S]*?<span>Stamp book<\/span><\/button>/);
    expect(html).toMatch(/<button class="jh-ib" data-a="wardrobe">[\s\S]*?<span>Wardrobe<\/span><\/button>/);
    expect(html).toContain('jh-next2');
    expect(html).toContain('Your next goals');
    expect((html.match(/class="jh-goal"/g) ?? []).length).toBe(3);
    expect(html).not.toContain('id="jh-hero"');
    expect(html).toMatch(/<button class="on" data-nav="stall" aria-current="page">/);
  });

  it('the stamp book and the Wardrobe open from the Stall tab', () => {
    const opened: string[] = [];
    const tree = h(Shopfront, { ...base({}), tab: 'stall', onWardrobe: () => opened.push('wardrobe'), onTrophies: () => opened.push('book') });
    find(tree, (pp) => pp['data-a'] === 'stamp-book')!.onClick();
    find(tree, (pp) => pp['data-a'] === 'wardrobe')!.onClick();
    expect(opened).toEqual(['book', 'wardrobe']);
  });

  it('the Rules tab is How to play, inside the tab (no Close: the bar leaves it)', () => {
    const html = home({}, { tab: 'rules' });
    expect(html).toContain('class="jh-shell jh-on-rules"');
    expect(html).toContain('class="page howto tk-page howto-tab"');
    expect(html).toContain('<b>How to play</b>');
    expect(html).not.toContain('aria-label="Close"');
    expect(html).toMatch(/<button class="on" data-nav="rules" aria-current="page">/);
  });

  it('a shared phone\'s game shows no one\'s cash on Continue', () => {
    const phone = at(newGame({ players: [{ name: 'A', kind: 'human', avatar: '🐸' }, { name: 'B', kind: 'human', avatar: '🦊' }], days: 8, unripe: true, upgrades: true, events: true, seed: 4 }), 3, 20);
    expect(waitWords(waitingGame(phone)!)).toBe('Day 3 of 8');
  });
});
