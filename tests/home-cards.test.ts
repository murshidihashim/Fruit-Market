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
import { howTo } from '../src/ui/HowTo';
import { FIRST_WAY, MODES, dayStatus, resetModeVisit, saveMode, saveWay, savedMode, savedWay, startMode, waitWords } from '../src/ui/HomeCards';
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

describe('Home, the Market tab (PLAN-124, PLAN-132): the profile chip, the mode tabs, the host, one wide card and one Play button', () => {
  it('draws the title, the chip with your name, level and rank, four tabs, the host, the Match card and Play', () => {
    mem.set('fm.name', 'Mblabla');
    const html = home({});
    expect(html).toContain('class="jh-shell jh-on-market"');
    // the profile chip: the face, "NAME · Lvl N", the rank, the gear named Settings, the rest opening the Stall tab
    expect(html).toMatch(/data-a="profile" aria-label="Mblabla, level 1, Roadside Table\. Open your stall"/);
    expect(html).toContain('<span class="jh-pnm">Mblabla</span>');
    expect(html).toContain('· Lvl 1</span>');
    expect(html).toMatch(/<button class="jh-gear" data-a="settings" aria-label="Settings">/);
    // one wide card: Match, with nothing beside its name; its four ways are tiles (a radio group), Computer ticked first
    expect([...html.matchAll(/data-card="(\w+)"/g)].map((m) => m[1])).toEqual(['custom']);
    expect(html).toContain('<div class="hh-chd"><h2>Match</h2></div>');
    expect(html).toContain('role="radiogroup" aria-label="How to play"');
    expect([...html.matchAll(/role="radio" aria-checked="(true|false)" data-a="way-(\w+)"/g)].map((m) => `${m[2]}:${m[1]}`)).toEqual(['quick:false', 'room:false', 'computer:true', 'phone:false']);
    // PLAN-132: the tiles carry the name and a picture only; the lines under them, "your market, your way", the "vs"
    // row and the Next line left the card
    for (const t of ['Quick Match', 'Private Room', 'Computer', 'Pass &amp; Play']) expect(html).toContain(`<b>${t}</b>`);
    for (const gone of ['Strangers online', 'Friends by link or code', 'On this phone', 'Take turns on this phone', 'your market, your way', '<i>vs</i>', 'jh-next3', 'Custom']) expect(html).not.toContain(gone);
    expect(html).not.toMatch(/One phone/i);
    // the mode tabs: a tablist, Custom chosen, the card is its panel
    expect(html).toContain('role="tablist" aria-label="Game modes"');
    expect([...html.matchAll(/role="tab" id="jh-tab-(\w+)"/g)].map((m) => m[1])).toEqual(['custom', 'league', 'daily', 'sprint']);
    expect(html).toMatch(/id="jh-tab-custom" class="jh-tab on [^"]*" data-tab="custom" aria-selected="true" aria-controls="jh-hero" tabIndex="0"/);
    expect(html).toMatch(/id="jh-tab-league" class="jh-tab {2}[^"]*" data-tab="league" aria-selected="false" aria-controls="jh-hero" tabIndex="-1"/);
    expect(html).toContain('id="jh-hero" class="jh-panel hh-panel" role="tabpanel" aria-labelledby="jh-tab-custom"');
    // one Play button, keeping Home's "play" hook; it names the way that is ticked; no Continue
    expect(html).toMatch(/<button class="jh-go jh-play hh-long" data-a="play" aria-label="Play, Computer">Play · Computer<\/button>/);
    expect(html).not.toContain('data-a="continue-');
    // PLAN-132, the order on screen: chip, tabs, the host, the card, Play, then the bottom bar
    const order = ['jh-prof', 'role="tablist"', 'class="hh-hero"', 'id="jh-hero"', 'jh-go-row', 'jh-nav3'].map((k) => html.indexOf(k));
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
      expect(html).toContain('class="hh-hero"');
      expect(html).toContain(`aria-labelledby="jh-tab-${mode}"`);
      expect(html).toMatch(new RegExp(`data-a="${hook}" aria-label="Play, ${name}">Play</button>`));
    }
  });

  it('the League card: the stage beside its name, its picture, title, goal and stars, and the next trophy', () => {
    mem.set('fm.homeMode', 'league');
    const html = home({});
    expect(html).toMatch(/<h2>Market League<\/h2><small>Stage 1 of \d+<\/small>/);
    for (const c of ['Your rival', 'hh-art', 'hh-big', 'hh-fact', 'jp-stars', '<b>Next trophy:</b>']) expect(html).toContain(c);
  });

  it('the Daily card: the date and "Not played" beside its name, the first customer, the lorry and one line of rules', () => {
    mem.set('fm.homeMode', 'daily');
    const html = home({});
    const cfg = dailyConfig(DATE, 'You');
    // C-13 (REP-122): Home calls it the Daily market (its tab says "Daily"), never "today's market"
    expect(html).toContain(`<h2>Daily market</h2><small>${shortDate(DATE)} · Not played</small>`);
    expect(html).toContain('<b>Daily</b>');
    expect(html).not.toMatch(/today['’]s market/i);
    // the first customer is a cropped picture that opens the whole card (it keeps the old hook)
    expect(html).toMatch(/class="card-zoom hh-pic jh-dcard" role="button"/);
    expect(html).toContain('Today\'s lorry brings');
    expect((html.match(/class="f-\w+"><img class="x-fruit"/g) ?? []).length).toBe(4);
    expect(html).toContain(`<span class="hh-rules"><b>${cfg.days} days</b> · ${cfg.players.length} stalls · the same market for everyone</span>`);
    // PLAN-132: "Not played" is plain words, not a yellow box; the twist and the rivals row are on the Daily's own page
    for (const gone of ['jh-dme', 'jh-dvs', 'Not played today', dailyTwist(DATE).title]) expect(html).not.toContain(gone);
  });

  it('the Sprint card: the date and "Not played" beside its name; its days and what counts are said once', () => {
    mem.set('fm.homeMode', 'sprint');
    const html = home({});
    expect(html).toContain(`<h2>Sprint</h2><small>${shortDate(DATE)} · Not played</small>`);
    expect(html).toContain(`<span class="hh-rules"><b>${SPRINT_DAYS} days</b> · ${sprintConfig(DATE, 'You').players.length} stalls · best ${SPRINT_WEEK_DAYS} days count</span>`);
    expect((html.match(new RegExp(`${SPRINT_DAYS} days`, 'g')) ?? []).length).toBe(1);
    expect((html.match(new RegExp(`${SPRINT_WEEK_DAYS} days count`, 'gi')) ?? []).length).toBe(1);
    expect(html).toMatch(/class="card-zoom hh-pic jh-dcard"/);
    expect(html).not.toContain('A few minutes. Beat your best.');
  });

  it('the day\'s result beside a card\'s name is plain words: the date, a streak, the cash and the place', () => {
    expect(dayStatus(DATE, undefined, null)).toBe(`${shortDate(DATE)} · Not played`);
    expect(dayStatus(DATE, 45, null)).toBe(`${shortDate(DATE)} · $45`);
    expect(dayStatus(DATE, 45, '3rd of 20', 4)).toBe(`${shortDate(DATE)} · 4-day streak · $45 · 3rd of 20`);
  });

  it('the way to play a Match is remembered in a small key; Computer until one is chosen', () => {
    expect(FIRST_WAY).toBe('computer');
    expect(savedWay()).toBe('computer');
    saveWay('room');
    expect(mem.get('fm.homeWay')).toBe('room');
    expect(savedWay()).toBe('room');
    const html = home({});
    expect(html).toMatch(/aria-checked="true" data-a="way-room"/);
    expect(html).toMatch(/aria-label="Play, Private Room">Play · Private Room<\/button>/);
    mem.set('fm.homeWay', 'nonsense');
    expect(savedWay()).toBe('computer');
  });

  it('a mode with a game waiting: its tab says the day, its card the day and cash, and Play becomes Continue beside New game', () => {
    const play = at(newGame({ players: [{ name: 'A', kind: 'human', avatar: '🐸' }, { name: 'Rosa', kind: 'ai', level: 'easy', avatar: '🦊' }], days: 10, unripe: true, upgrades: true, events: true, seed: 3 }), 4, 23);
    const daily = at(newGame(dailyConfig(DATE, 'A')), 6, 31);
    expect(waitWords(waitingGame(play)!)).toBe('Day 4 of 10 · $23');
    mem.set('fm.homeMode', 'custom');
    const html = home({ play, daily });
    expect(html).toMatch(/data-tab="custom" aria-selected="true"[^>]*aria-label="Match, Computer game waiting on day 4"/);
    expect(html).toMatch(/data-tab="daily" aria-selected="false"[^>]*aria-label="Daily, Daily market waiting on day 6"/);
    expect(html).toContain('<b>Match</b><small>Day 4</small>');
    expect(html).toContain('<b>Daily</b><small>Day 6</small>');
    expect(html).toContain('<b>League</b></button>');
    // Continue for the chosen mode, and New game (REP-140 B-20: it asks first, then goes where Play would; the same "play" hook)
    expect(html).toContain('data-a="continue-play"');
    // PLAN-132: Continue is one word (its spoken name still says which game); the day and cash stand beside the card's name
    expect(html).toMatch(/data-a="continue-play" aria-label="Continue, Computer game · Day 4 of 10 · \$23"[^>]*>.*?<b>Continue<\/b><\/span><\/button>/);
    expect(html).toContain('<h2>Match</h2><small>Day 4 of 10 · $23</small>');
    expect(html).toMatch(/<button class="jh-new" data-a="play" aria-label="New game, Match">New game<\/button>/);
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
    expect(home(all)).toContain('aria-label="Continue, League stage 3 · Day 2 of');
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

  it('the buttons call what they say: the four tiles choose, Play starts the way ticked, Continue, the chip, the gear and the bar', () => {
    const called: string[] = [];
    const log = (k: string) => () => { called.push(k); };
    const play = at(newGame({ players: [{ name: 'A', kind: 'human', avatar: '🐸' }, { name: 'Rosa', kind: 'ai', level: 'easy', avatar: '🦊' }], days: 10, unripe: true, upgrades: true, events: true, seed: 3 }), 4, 23);
    const props = (games: Partial<Record<SaveSlot, GameState>>): ShopProps => ({
      ...base(games), onPlay: log('play-page'), onQuick: log('quick'), onPrivate: log('room'), onComputer: log('computer'), onOnePhone: log('phone'),
      onSettings: log('settings'), onTab: (t) => { called.push(`tab:${t}`); }, onContinue: (s) => { called.push(`continue:${s}`); },
      onNewGame: (s) => { called.push(`new:${s}`); },
    });
    const tree = h(Shopfront, props({}));
    // PLAN-132: a tile only chooses the way (nothing starts); Play starts the way that is ticked, never the Play page
    for (const a of ['way-quick', 'way-room', 'way-computer', 'way-phone']) find(tree, (pp) => pp['data-a'] === a)!.onClick();
    expect(called).toEqual([]);
    expect(mem.get('fm.homeWay')).toBe('phone');
    mem.delete('fm.homeWay');
    for (const a of ['play', 'profile', 'settings']) find(tree, (pp) => pp['data-a'] === a)!.onClick();
    find(tree, (pp) => pp['data-nav'] === 'rules')!.onClick();
    expect(called).toEqual(['computer', 'tab:stall', 'settings', 'tab:rules']);
    for (const [w, starts] of [['quick', 'quick'], ['room', 'room'], ['phone', 'phone']] as const) {
      called.length = 0;
      mem.set('fm.homeWay', w);
      find(h(Shopfront, props({})), (pp) => pp['data-a'] === 'play')!.onClick();
      expect(called).toEqual([starts]);
    }
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

  it('the Rules tab is How to play, inside the tab (no Close: the bar leaves it)', async () => {
    // REP-140 A-08: How to play is loaded on demand; App opens the tab once its code is here (onDemand.tsx)
    await howTo.load();
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
