// PLAN-116, part A: the fixes from the review of 1.27.0 (REP-133) for the game, the Market League, the results and
// the Daily market, and PLAN-117 (the Daily's rivals all at Normal) as the Daily card says it.
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { aiStep, autoplay } from '../src/engine/ai';
import { dailyConfig, dailyTwist, sprintConfig } from '../src/engine/daily';
import { RIVALS } from '../src/engine/data';
import {
  activePlayer, applyAction, beginBuying, dayNet, effectiveMax, finishReveal, newGame, type GameConfig, type GameState, type Level,
} from '../src/engine/game';
import { dayLedger, gameRecap } from '../src/engine/story';
import { LEAGUE, afterLine, starsEarned } from '../src/ui/campaign';
import { boardName, firstCustomer, rivalsLine, shortDate } from '../src/ui/dailyCard';
import { awaitsHandOver } from '../src/ui/game/turn';
import { orderLine } from '../src/ui/game/panels/SalesSummary';
import { modeOf, waitingGame } from '../src/ui/paused';
import { leagueConfig } from '../src/ui/progress';

const store = new Map<string, string>();
beforeEach(() => {
  store.clear();
  vi.stubGlobal('localStorage', {
    getItem: (k: string) => store.get(k) ?? null,
    setItem: (k: string, v: string) => void store.set(k, v),
    removeItem: (k: string) => void store.delete(k),
    clear: () => store.clear(),
  });
});

/** One step with every seat played by the computer (people's seats too, at Normal). */
function step(s: GameState): GameState {
  if (s.phase === 'morning') return beginBuying(s);
  if (s.phase === 'reveal') return finishReveal(s);
  const asAi = { ...s, players: s.players.map((p) => ({ ...p, kind: 'ai' as const, level: p.level ?? ('normal' as Level) })) };
  const next = aiStep(asAi)!;
  return { ...next, players: next.players.map((p, i) => ({ ...p, kind: s.players[i].kind })) };
}

// ---------------------------------------------------------------------------------------------------------------------

describe('A-01: one phone, no tap acts across a hand-over', () => {
  const cfg: GameConfig = {
    players: [{ name: 'Ana', kind: 'human', avatar: '🦊' }, { name: 'Ben', kind: 'human', avatar: '🐻' }, { name: 'Cat', kind: 'ai', level: 'normal', avatar: '🐼' }],
    days: 8, unripe: true, upgrades: true, events: true, seed: 11,
  };
  /** The first buying turn of a person whose next buyer is the other person. */
  function handOverTurn(): GameState {
    let s = newGame(cfg);
    for (let i = 0; i < 4000; i++) {
      if (s.phase === 'buy') {
        const p = activePlayer(s);
        const q = s.order[s.turn + 1];
        if (s.players[p].kind === 'human' && q !== undefined && s.players[q].kind === 'human') return s;
      }
      s = step(s);
    }
    throw new Error('no hand-over between the two people');
  }

  it('from the moment a buying turn passes to the other person until they are handed the phone', () => {
    const s = handOverTurn();
    const a = activePlayer(s);
    // Ana holds the phone on her own turn: her taps act.
    expect(awaitsHandOver(s, a)).toBe(false);
    // Her Done passes the turn to Ben: before his hand-over is tapped, nothing acts (a second tap on Done, or a piece).
    const next = applyAction(s, a, { kind: 'endBuy' });
    const b = activePlayer(next);
    expect(next.players[b].kind).toBe('human');
    expect(b).not.toBe(a);
    expect(awaitsHandOver(next, a)).toBe(true);
    expect(awaitsHandOver(next, null)).toBe(true);
    // Once Ben taps the hand-over, his taps act.
    expect(awaitsHandOver(next, b)).toBe(false);
  });

  it('never holds up one person alone, or a computer\'s turn', () => {
    const solo = newGame({ ...cfg, players: cfg.players.map((p, i) => (i === 1 ? { ...p, kind: 'ai' as const, level: 'normal' as const } : p)) });
    let s = solo;
    for (let i = 0; i < 400 && s.phase !== 'over'; i++) { expect(awaitsHandOver(s, null)).toBe(false); s = step(s); }
    let t = newGame(cfg);
    for (let i = 0; i < 400 && t.phase !== 'over'; i++) {
      const p = activePlayer(t);
      if (p >= 0 && t.players[p].kind === 'ai') expect(awaitsHandOver(t, null)).toBe(false);
      if (t.phase === 'morning' || t.phase === 'reveal') expect(awaitsHandOver(t, null)).toBe(false);
      t = step(t);
    }
  });
});

// ---------------------------------------------------------------------------------------------------------------------

describe('A-02: the Daily card shows the prices the game will use', () => {
  const dates = Array.from({ length: 28 }, (_, i) => new Date(Date.UTC(2026, 10, 16) + i * 86_400_000).toISOString().slice(0, 10));
  it('on every day, the first customer\'s prices are the game\'s own (effectiveMax), on the card and in the sentence', () => {
    let fixedDays = 0;
    let differs = 0;
    for (const d of dates) {
      const first = newGame(dailyConfig(d, 'You'));
      const c = firstCustomer(first);
      if (!c) continue;
      const who = first.forecast!;
      who.wants.forEach((w, i) => {
        expect(c.wants[i].max).toBe(effectiveMax(first, w, who.generous));
        expect(c.words).toContain(`up to $${c.wants[i].max}`);
        if (c.wants[i].max !== w.max) differs++;
      });
      if (dailyTwist(d).title === 'Fixed prices') fixedDays++;
    }
    // Fixed prices days are in the four weeks, and there the price on the card is not the price paid.
    expect(fixedDays).toBe(4);
    expect(differs).toBeGreaterThan(0);
  });
});

describe('PLAN-117: the Daily card names the rivals\' level', () => {
  it('all three rivals at Normal, in the Daily market and the Sprint', () => {
    expect(rivalsLine(dailyConfig('2026-11-22', 'You'))).toBe('Against Rosa, Uncle Benny and Ah Chen, all Normal.');
    expect(rivalsLine(sprintConfig('2026-11-22', 'You'))).toBe('Against Rosa, Uncle Benny and Ah Chen, all Normal.');
  });
  it('each rival with its own level when they differ', () => {
    expect(rivalsLine(leagueConfig(2, 'You', ''))).toBe('Against Uncle Benny (Easy) and Ah Chen (Normal).');
    expect(rivalsLine(leagueConfig(0, 'You', ''))).toBe('Against Rosa, Easy.');
  });
});

// ---------------------------------------------------------------------------------------------------------------------

describe('the Market League', () => {
  /** A stage played by the computer for the person too. */
  function played(stage: number, level: Level, seed?: number): GameState {
    const s = newGame(leagueConfig(stage, 'You', '', seed));
    s.players[0] = { ...s.players[0], kind: 'ai', level };
    const g = autoplay(s);
    return { ...g, players: g.players.map((p, i) => (i === 0 ? { ...p, kind: 'human' as const } : p)) };
  }

  it('A-03: the host\'s line after a win is chosen by the stars earned, and the last line of each stage names none', () => {
    for (const st of LEAGUE) {
      expect(st.after.length).toBeGreaterThan(0);
      expect(st.after[st.after.length - 1].stars).toBeUndefined();
      const ids = st.mastery.map((m) => m.id);
      for (const x of st.after) for (const id of x.stars ?? []) expect(ids).toContain(id);
      for (const x of st.after) expect(x.text).not.toContain('!');
    }
    expect(afterLine(LEAGUE[0], [])).toBe('You beat me this time. Well played.');
    expect(afterLine(LEAGUE[0], ['vs_under'])).toBe('A dollar under me. I should have seen that coming.');
    expect(afterLine(LEAGUE[3], ['hw_waste'])).toBe('You kept nothing to rot in the heat. Smart.');
    expect(afterLine(LEAGUE[3], ['hw_waste', 'hw_melon'])).toBe('You sold in the heat and kept nothing to rot. Smart.');
  });

  it('A-03: in won games the line said is never about a star the game did not earn', () => {
    let wins = 0;
    let neutral = 0;
    for (let st = 0; st < LEAGUE.length; st++) {
      for (const lv of ['easy', 'hard'] as Level[]) for (let k = 1; k <= 6; k++) {
        const g = played(st, lv, 9000 + k * 104729);
        if (g.players[0].cash < Math.max(...g.players.map((p) => p.cash))) continue;
        wins++;
        const earned = starsEarned(g, 0);
        const said = LEAGUE[st].after.find((x) => x.text === afterLine(LEAGUE[st], earned))!;
        for (const id of said.stars ?? []) expect(earned).toContain(id);
        if (!said.stars) neutral++;
      }
    }
    expect(wins).toBeGreaterThan(10);
    expect(neutral).toBeGreaterThan(0);
  });

  it('A-04: stage 6 names its buyers as their cards do', () => {
    expect(LEAGUE[5].before).toBe('Ravi Rocket, Miss Cha-Cha and Anna the Artist come on day 5. They buy Fresh fruit only.');
  });

  it('A-05: the stage 3 star is $8 a piece, and on the stage\'s fixed seed a bid of $8 wins it', () => {
    const star = LEAGUE[2].mastery.find((m) => m.id === 'ho_bid')!;
    expect(star.text).toBe('Win the order at $8 a piece or more');
    for (const lv of ['easy', 'normal', 'hard'] as Level[]) {
      // The person's seat is played by a computer up to the order, then bids $8; the rest is played out.
      let s = newGame(leagueConfig(2, 'You', ''));
      s.players[0] = { ...s.players[0], kind: 'ai', level: lv };
      while (s.phase !== 'order') s = s.phase === 'morning' ? beginBuying(s) : s.phase === 'reveal' ? finishReveal(s) : aiStep(s)!;
      s = applyAction({ ...s, players: s.players.map((p, i) => (i === 0 ? { ...p, kind: 'human' as const } : p)) }, 0, { kind: 'order', price: 8 });
      while (s.phase === 'order') s = aiStep(s)!;
      expect(s.standing?.holder, lv).toBe(0);
      const end = played2(s);
      expect(starsEarned(end, 0), lv).toContain('ho_bid');
    }
    function played2(s: GameState): GameState {
      const g = autoplay({ ...s, players: s.players.map((p, i) => (i === 0 ? { ...p, kind: 'ai' as const, level: 'normal' as const } : p)) });
      return { ...g, players: g.players.map((p, i) => (i === 0 ? { ...p, kind: 'human' as const } : p)) };
    }
  });

  it('A-10: the Village Square lesson stays true with Okay fruit (Rosa asks $1 under what her piece can fetch)', () => {
    expect(LEAGUE[0].lesson).not.toContain('top price');
    expect(LEAGUE[0].before).not.toContain('top price');
    expect(LEAGUE[0].lesson).toBe('Rosa always asks $1 under the most a customer will pay for her fruit. Go $1 under her and the customer comes to you.');
  });

  it('A-12: stage 3 is named after its Beach Resort order, at the same number', () => {
    expect(LEAGUE[2].title).toBe('The Resort Order');
    expect(LEAGUE[2].setup.orders).toEqual({ 3: 'Beach Resort' });
    expect(leagueConfig(2, 'You', '').league).toBe(2);
  });

  it('the stage 1 rival is Rosa, as the rules text says', () => {
    expect(RIVALS[LEAGUE[0].rivals[0].idx].name).toBe('Rosa');
  });
});

// ---------------------------------------------------------------------------------------------------------------------

describe('A-06: "Best day" is the day\'s net change, as that day\'s takings showed it', () => {
  it('each day\'s record keeps the takings\' net, and the best moment uses it', () => {
    let s = newGame({ ...dailyConfig('2026-11-20', 'You'), daily: undefined });
    let checked = 0;
    let differs = 0;
    while (s.phase !== 'over') {
      if (s.phase === 'reveal') {
        const nets = s.players.map((_, p) => dayLedger(s, p).net);
        expect(nets).toEqual(s.players.map((_, p) => dayNet(s, p)));
        const next = finishReveal(s);
        expect(next.history![next.history!.length - 1].net).toEqual(nets);
        checked++;
        if (nets[0] !== s.results!.income[0]) differs++;
        s = next;
        continue;
      }
      s = step(s);
    }
    expect(checked).toBe(s.config.days);
    expect(differs).toBeGreaterThan(0);
    const best = s.history!.reduce((a, d) => (d.net![0] > a.net![0] ? d : a));
    const line = gameRecap(s, 0).best.find((x) => x.startsWith('Best day'));
    if (best.net![0] > 0) expect(line).toBe(`Best day: Day ${best.day}, +$${best.net![0]}.`);
  });

  it('a game saved before the record kept the net still reads (its sales, as before)', () => {
    let s = autoplay(newGame({ ...dailyConfig('2026-11-20', 'You'), daily: undefined, players: dailyConfig('2026-11-20', 'You').players.map((p) => ({ ...p, kind: 'ai' as const, level: 'normal' as const })) }));
    s = { ...s, history: s.history!.map(({ net: _net, ...d }) => d) };
    const best = s.history!.reduce((a, d) => (d.income[0] > a.income[0] ? d : a));
    expect(gameRecap(s, 0).best).toContain(`Best day: Day ${best.day}, +$${best.income[0]}.`);
  });
});

describe('A-07: a missed standing order is said in the one-phone "Your day" note', () => {
  it('says how many were delivered and the stake lost', () => {
    const r = { order: { holder: 1, qty: 3, short: 2, stake: 6, back: 0 } } as unknown as NonNullable<GameState['results']>;
    expect(orderLine(r, 1)).toBe('Standing order: you delivered 1 of 3 and lost your $6 stake.');
    expect(orderLine(r, 0)).toBeNull();
    const full = { order: { holder: 1, qty: 3, short: 0, stake: 6, back: 6 } } as unknown as NonNullable<GameState['results']>;
    expect(orderLine(full, 1)).toBe('Standing order: you delivered all 3 and got your $6 stake back.');
  });
});

describe('A-13: Continue names the mode that is waiting', () => {
  const base = newGame(dailyConfig('2026-11-22', 'You'));
  it('Daily market, Sprint, League stage N, a game against the computer, a game on one phone', () => {
    expect(modeOf(base)).toBe('Daily market');
    expect(modeOf(newGame(sprintConfig('2026-11-22', 'You')))).toBe('Sprint');
    expect(modeOf(newGame(leagueConfig(2, 'You', '')))).toBe('League stage 3');
    expect(modeOf(newGame({ ...dailyConfig('2026-11-22', 'You'), daily: undefined }))).toBe('Computer game');
    const two = newGame({ ...dailyConfig('2026-11-22', 'You'), daily: undefined, players: dailyConfig('2026-11-22', 'You').players.map((p, i) => (i === 1 ? { ...p, kind: 'human' as const } : p)) });
    expect(modeOf(two)).toBe('One phone game');
    expect(waitingGame(base)?.mode).toBe('Daily market');
  });
});

describe('B-12 and B-13: the Daily and Sprint results', () => {
  it('show dates as Home does', () => {
    expect(shortDate('2026-11-22')).toBe('22 Nov');
    expect(shortDate('2027-01-05')).toBe('5 Jan');
    expect(shortDate('')).toBe('');
  });
  it('your own line on the Daily board reads "You"', () => {
    expect(boardName('Shopkeeper c0c7', 1, 1)).toBe('You');
    expect(boardName('Mia', 2, 1)).toBe('Mia');
    expect(boardName('Mia', 1, undefined)).toBe('Mia');
  });
});
