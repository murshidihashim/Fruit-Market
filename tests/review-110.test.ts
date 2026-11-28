import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { h } from 'preact';
import { autoplay } from '../src/engine/ai';
import { FARMER_CARDS, RIVALS, type FruitId } from '../src/engine/data';
import { canPlayFavour, emptyStock, newGame, shelfSize, type GameState, type Standing } from '../src/engine/game';
import { dayLedger } from '../src/engine/story';
import { pulse, wantText } from '../src/ui/boardModel';
import { toStaticHtml } from '../src/ui/cards';
import { canGetLine, orderResultText } from '../src/ui/game/panels/OrderPanel';
import { unsentChoice } from '../src/ui/game/panels/Popovers';
import { pickAwayLine } from '../src/ui/onlineWords';
import { loadSettings, loadUndo, saveSettings, saveUndo } from '../src/ui/store';
import type { PublicSeat } from '../src/net/protocol';
import { rushOver } from '../src/ui/game/panels/SalesSummary';
import { daySoldLine, takingsRows } from '../src/ui/game/dayWords';
import { CustomerChar, boughtAny } from '../src/ui/table';

// PLAN-110 (REP-122, the smaller bugs and polish): the numbers the screens show.

const players = (stalls: number) => [
  { name: 'Mia', kind: 'ai' as const, level: 'normal' as const, avatar: RIVALS[0].avatar },
  ...RIVALS.slice(1, stalls).map((r) => ({ name: r.name, kind: 'ai' as const, level: 'normal' as const, avatar: r.avatar })),
];
const game = (seed: number, stalls = 4): GameState => newGame({ players: players(stalls), days: 10, unripe: true, upgrades: true, events: true, marketDays: true, seed });

/** Every state of some computer-played games, in order. */
function states(seeds: number[], stalls = 4): GameState[] {
  const out: GameState[] = [];
  for (const seed of seeds) {
    let s = game(seed, stalls);
    for (let i = 0; i < 6000 && s.phase !== 'over'; i++) { out.push(s); s = autoplay(s, 1); }
  }
  return out;
}
const all = states([1, 2, 3, 4, 5, 6]);

describe('S4: the bid counts only fruit that can still be delivered on the due day', () => {
  const bidding = structuredClone(all.find((s) => s.phase === 'order' && !!s.standing && s.standing.holder === null)!);
  bidding.event = null;
  bidding.players[0].trait = 'haggler';
  bidding.players[0].upgrades = [];
  const at = (f: FruitId, market: number[], shelf: number[], ripening = false) => {
    const s = structuredClone(bidding);
    s.standing!.fruit = f;
    s.market[f] = market;
    s.players[0].stock = { ...emptyStock(true), [f]: shelf };
    if (ripening) s.players[0].upgrades = ['ripening'];
    // tomorrow's lorry: an ordinary one (not the Seconds Lorry)
    s.nextFarmer = FARMER_CARDS.find((c) => !c.okay && c.table[4][f] > 0)!;
    return canGetLine(s, 0, s.standing!);
  };

  it('a blueberry on the shelf or bought today is Soft by the due day; one from tomorrow\'s lorry is Okay', () => {
    const lorry = FARMER_CARDS.find((c) => !c.okay && c.table[4].blueberry > 0)!.table[4].blueberry;
    expect(at('blueberry', [0, 0, 3], [0, 0, 2])).toBe(`Your shelf 0 · Wholesale Market 0 · tomorrow's lorry ${lorry}`);
  });

  it('an apple stays Fresh for days: only its Okay and Soft pieces and the last Fresh one are too old', () => {
    expect(at('apple', [1, 1, 2, 2, 0, 3], [0, 0, 0, 1, 0, 2])).toMatch(/^Your shelf 3 · Wholesale Market 5 /);
  });

  it('a green mango from tomorrow\'s lorry is not ripe by the due day, unless the stall has a Ripening Room', () => {
    // two green mangoes at the market today ripen in time (Fresh on the due day); one Fresh today is Soft by then
    expect(at('mango', [0, 0, 1, 0, 2], [0, 0, 0, 0, 0])).toBe('Your shelf 0 · Wholesale Market 2 · tomorrow\'s lorry 0');
    expect(at('mango', [0, 0, 1, 0, 2], [0, 0, 0, 0, 0], true)).toMatch(/· tomorrow's lorry [1-9]\d*$/);
  });

  it('a Heatwave tonight ages the pieces one step more', () => {
    const s = structuredClone(bidding);
    s.event = { id: 'heatwave', title: 'Heatwave', icon: '', text: '', ageExtra: 1 };
    s.standing!.fruit = 'watermelon';
    s.market.watermelon = [0, 0, 0, 2];
    s.players[0].stock = emptyStock(true);
    // Fresh (3) -> 1 after the Heatwave night -> 0 (Soft) on the due day
    expect(canGetLine(s, 0, s.standing!)).toMatch(/Wholesale Market 0/);
    s.event = null;
    expect(canGetLine(s, 0, s.standing!)).toMatch(/Wholesale Market 2/);
  });
});

/** The money words of the evening line, signed: the sum of the parts before the total, and the total. */
function lineSum(line: string): { parts: number; total: number } {
  const sign: Record<string, number> = { Sold: 1, bought: -1, stake: -1, 'stake back': 1, 'top-up': 1, fine: -1, upgrade: -1 };
  let parts = 0, total = 0;
  for (const bit of line.split(' · ')) {
    const m = /^(.*?) ([+−]?)\$(\d+)( today)?$/.exec(bit);
    if (!m) throw new Error(`unread: ${bit}`);
    const [, word, sg, n, today] = m;
    if (today) total = (word === 'down' ? -1 : 1) * Number(n);
    else if (word === 'other') parts += (sg === '−' ? -1 : 1) * Number(n);
    else parts += sign[word] * Number(n);
  }
  return { parts, total };
}

describe('S5 and S6: the evening line and the takings add up, a stake, a fine and a top-up included', () => {
  const evenings = all.filter((s) => (s.phase === 'evening' || s.phase === 'reveal') && !!s.results);

  it('the evening line\'s parts add up to its total, which is the day\'s change in cash', () => {
    let staked = 0;
    for (const s of evenings) for (const p of [0, 1, 2, 3]) {
      const line = daySoldLine(s, p);
      const { parts, total } = lineSum(line);
      expect(parts).toBe(total);
      expect(total).toBe(dayLedger(s, p).net);
      if (/ · stake \$/.test(line)) staked++;
    }
    expect(staked).toBeGreaterThan(0);
  });

  it('a Health Inspector\'s fine and a top-up have their own lines, and "Down today" matches the morning', () => {
    const fined = evenings.filter((s) => s.phase === 'reveal' && (s.dayFines ?? []).some((x) => x > 0));
    expect(fined.length).toBeGreaterThan(0);
    for (const s of fined) s.players.forEach((_, p) => {
      const fine = s.dayFines![p];
      const rows = takingsRows(s, p);
      if (fine > 0) {
        expect(rows.find((x) => x.key === 'fine')).toEqual({ key: 'fine', label: 'Health Inspector fine', amount: -fine });
        expect(daySoldLine(s, p)).toContain(` · fine $${fine}`);
      } else expect(rows.find((x) => x.key === 'fine')).toBeUndefined();
      // the day's change counts from before dawn: the start of the day's cash plus the fine
      expect(dayLedger(s, p).net).toBe(s.players[p].cash - (s.dayStartCash![p] + fine - (s.dayTopUps?.[p] ?? 0)));
    });
    const topped = structuredClone(fined[0]);
    topped.dayTopUps = topped.players.map((_, i) => (i === 0 ? 3 : 0));
    topped.dayStartCash![0] += 3;
    expect(takingsRows(topped, 0).find((x) => x.key === 'topup')).toEqual({ key: 'topup', label: 'Top-up from the Market', amount: 3 });
    expect(daySoldLine(topped, 0)).toContain(' · top-up $3');
  });
});

describe('S7: the lane heads read the walk-ins\' card backs', () => {
  const buying = all.filter((s) => s.phase === 'buy' && s.queue.length > 0);

  it('a fruit on no walk-in\'s back gets no "+" or "?"; one on a back does', () => {
    expect(buying.length).toBeGreaterThan(10);
    let without = 0;
    for (const s of buying) for (const z of pulse(s)) {
      const onBack = s.queue.some((c) => c.wants.some((w) => w.fruit === z.f));
      expect(z.more).toBe(onBack);
      if (!onBack) { without++; expect(wantText(z)).toBe(String(z.demand)); }
    }
    expect(without).toBeGreaterThan(0);
  });

  it('nobody wants mangoes on Days 1 and 2', () => {
    for (const s of buying.filter((x) => x.day <= 2)) expect(wantText(pulse(s).find((z) => z.f === 'mango')!)).toBe('0');
  });
});

describe('S9: a full shelf', () => {
  const s = structuredClone(all.find((x) => x.phase === 'buy')!);
  const p = s.order[s.turn];
  const pl = s.players[p];
  pl.favours = ['freeFruit'];
  pl.stock = emptyStock(true);
  pl.stock.apple[5] = shelfSize(pl);

  it('Free Fruit is not offered when its piece could not land', () => {
    expect(canPlayFavour(s, p, 0)).toBe('Your shelf is full');
    const room = structuredClone(s);
    room.players[p].stock.apple[5] -= 1;
    expect(canPlayFavour(room, p, 0)).toBeNull();
  });
});

describe('S10: only a customer who bought something is ticked', () => {
  const reveals = all.filter((s) => s.phase === 'reveal' && !!s.results);

  it('one who left with nothing is greyed, with no tick, and the takings count agrees', () => {
    let none = 0, served = 0;
    for (const s of reveals) for (const x of rushOver(s)) {
      const c = [...s.firstMarket, ...s.secondMarket].find((k) => k.id === x.id);
      if (!c) continue;
      const html = toStaticHtml(h(CustomerChar, { s, c, kind: 'new', rush: 'served' }));
      expect(boughtAny(s.results, x.id)).toBe(x.served);
      if (x.served) { served++; expect(html).toContain('rush-served'); expect(html).toContain('aria-label="Served"'); }
      else { none++; expect(html).toContain('rush-none'); expect(html).not.toContain('✓'); expect(html).toContain('Left with nothing'); }
    }
    expect(none).toBeGreaterThan(0);
    expect(served).toBeGreaterThan(0);
  });
});

// ---------- the screens ----------

const mem = new Map<string, string>();
const stubStorage = () => {
  mem.clear();
  (globalThis as { localStorage?: unknown }).localStorage = {
    getItem: (k: string) => mem.get(k) ?? null, setItem: (k: string, v: string) => mem.set(k, v), removeItem: (k: string) => mem.delete(k),
  };
};

describe('S11: the Freshness patterns switch is gone', () => {
  it('settings saved while it was there still load, without it', () => {
    stubStorage();
    mem.set('fm.settings', JSON.stringify({ sound: false, haptics: true, fast: true, tips: true, music: false, analytics: false, patterns: true }));
    const st = loadSettings();
    // PLAN-112: "Show reactions" came later; settings saved before it load with it on.
    // PLAN-123: the Reduced motion switch came later; settings saved before it load with it off.
    // REP-140 B-15: the unused `tips` field is dropped as it loads, like `patterns`
    expect(st).toEqual({ sound: false, haptics: true, fast: true, music: false, analytics: false, reactions: true, still: false });
    expect('patterns' in st).toBe(false);
    saveSettings({ ...st, sound: true });
    expect(JSON.parse(mem.get('fm.settings')!)).not.toHaveProperty('patterns');
  });

  it('no screen or style reads it any more', () => {
    for (const f of ['src/ui/App.tsx', 'src/ui/Game.tsx']) expect(readFileSync(f, 'utf8')).not.toMatch(/patterns/i);
    // (no style rule reads it: from the page's own rules, scripts/style-checks.cjs, PLAN-130)
  });
});

describe('S18: Undo is kept when a buying turn is left and resumed', () => {
  const buy = all.find((s) => s.phase === 'buy' && s.players[s.order[s.turn]].kind === 'ai' && autoplay(s, 1).phase === 'buy' && autoplay(s, 1).turn === s.turn)!;
  const start = structuredClone(buy);
  const after = autoplay(start, 1);

  it('the point is read back for the same game, day, turn and stall only', () => {
    stubStorage();
    saveUndo({ at: start });
    expect(loadUndo(after)?.at).toEqual(start);
    // nothing bought since: the point is the game itself, so Undo has nothing to take back
    expect(loadUndo(start)?.at).toBe(start);
    const other = structuredClone(after);
    other.config.seed += 1;
    expect(loadUndo(other)).toBeNull();
    const later = structuredClone(after);
    later.turn += 1;
    expect(loadUndo(later)).toBeNull();
    expect(loadUndo({ ...after, phase: 'stall' })).toBeNull();
    // a point after a favour card keeps its card (DEC-120: Undo goes back to just after it)
    saveUndo({ at: start, after: 'scout' });
    expect(loadUndo(after)?.after).toBe('scout');
    saveUndo(null);
    expect(loadUndo(after)).toBeNull();
  });

  it('a crate, prices or a bid not yet sent are named in the menu before leaving', () => {
    expect(unsentChoice({ ...start, phase: 'stall' }, true)).toBe('Your crate is kept only once you open your stall.');
    expect(unsentChoice({ ...start, phase: 'bid' }, true)).toBe('Your prices are kept only once you ring the bell.');
    expect(unsentChoice({ ...start, phase: 'order' }, true)).toBe('Your bid is kept only once you bid or pass.');
    expect(unsentChoice({ ...start, phase: 'stall' }, false)).toBeNull();
    expect(unsentChoice(start, true)).toBeNull();
  });
});

// ---------- online ----------

describe('ON-07: the choosing step says when a computer takes over a seat', () => {
  const seat = (x: Partial<PublicSeat>): PublicSeat => ({ seat: 2, name: 'Chandra', avatar: '', ready: true, connected: false, host: false, ...x });
  it('counts down, then says the computer chooses; one who left is named as gone', () => {
    expect(pickAwayLine(seat({ offlineSince: 0, takeoverAt: 45_000 }), 0)).toBe('Chandra disconnected. A computer chooses for them in 45s.');
    expect(pickAwayLine(seat({ offlineSince: 0, takeoverAt: 45_000 }), 44_100)).toBe('Chandra disconnected. A computer chooses for them in 1s.');
    expect(pickAwayLine(seat({ bot: true }), 0)).toBe('Chandra disconnected. A computer chooses for them.');
    expect(pickAwayLine(seat({ bot: true, left: true }), 0)).toBe('Chandra left. A computer chooses for them.');
  });
});

describe('ON-12: a tied standing order gives its reason, and "You" on the winner\'s phone', () => {
  const s = structuredClone(all.find((x) => x.players.length === 4)!);
  s.players.forEach((pl) => { pl.upgrades = []; });
  const o: Standing = { card: 2, fruit: 'watermelon', qty: 4, ceiling: 14, stake: 6, due: 5, bids: [11, 11, 'pass', 12], holder: 1, price: 11, staked: 6 };
  const title = 'The Beach Resort';

  it('names the winner, then the tie-break, and never a place in the buying order', () => {
    expect(orderResultText(s, 0, o, '')).toBe(`${s.players[1].name} won the standing order for ${title} at $11 a piece and put down a $6 stake. Tied at $11: a tie goes to the stall earlier in today's buying order.`);
    expect(orderResultText(s, 1, o, '')).toMatch(/^You won the standing order /);
    expect(orderResultText(s, 0, o, '')).not.toMatch(/first|buys/);
    s.players[1].upgrades = ['orderbook'];
    expect(orderResultText(s, 0, o, '')).toMatch(/Tied at \$11: an Order Book wins a tie\.$/);
    expect(orderResultText(s, 0, { ...o, bids: [10, 11, 'pass', 12] }, '')).not.toContain('Tied');
    expect(orderResultText(s, 0, { ...o, holder: null, price: null }, 'Nobody bid for it.')).toBe('Nobody bid for it.');
  });
});
