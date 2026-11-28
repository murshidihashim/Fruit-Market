import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { aiStep, planPrices, planStall } from '../src/engine/ai';
import { FRUITS } from '../src/engine/data';
import { activePlayer, beginBuying, canBuy, finishReveal, newGame, type Action, type GameState } from '../src/engine/game';
import { cleanRecord, cleanSession, daySheet, endOf, newRecord, RECORD_WORDS, type MatchRecord } from '../src/net/matchRecord';
import { answerLink, forgetMe, linkAnswer, linked, playerTag } from '../src/net/player';
import { noteLeft, noteOpen, noteShown, noteUndo } from '../src/net/recorder';
import { playLocal } from '../src/ui/game/turn';

// PLAN-132 and PLAN-133: match records. A record is a game's set-up, a sheet for each day and how it ended, with no
// name or ID in it; the phone keeps one beside each local game and sends it only while "Share game data" is on; a
// player number exists only after a yes.

const cfg = (seed: number, name = 'Zorblax Qwerty') => ({
  players: [{ name, kind: 'human' as const, avatar: '🦊' }, { name: 'Rosa', kind: 'ai' as const, level: 'normal' as const, avatar: '🐻' }, { name: 'Benny', kind: 'ai' as const, level: 'hard' as const, avatar: '🦝' }],
  days: 8, unripe: true, upgrades: true, events: true, seed,
});

/** The person's next move, played plainly: the first perk, one piece a day, the computer's own crate and prices. */
function myMove(s: GameState, me: number): Action {
  if (s.phase === 'order') return { kind: 'order', price: null };
  if (s.phase === 'buy') {
    if (s.players[me].boughtToday === 0) {
      for (const f of FRUITS) for (let pos = s.market[f].length - 1; pos >= 0; pos--) if (canBuy(s, me, f, pos) === null) return { kind: 'buy', fruit: f, pos };
    }
    return { kind: 'endBuy' };
  }
  if (s.phase === 'stall') return { kind: 'stall', stall: planStall(s, me) };
  if (s.phase === 'bid') return { kind: 'prices', posts: planPrices(s, me).posts };
  if (s.phase === 'tie') return { kind: 'tie', play: false };
  return { kind: 'endEvening' };
}

/** Plays a game on "this phone" through playLocal, as the game screen does. `until`: stop when this day is reached. */
function playOnPhone(seed: number, until = 99): GameState {
  let s = newGame(cfg(seed));
  const me = 0;
  for (let i = 0; i < 6000 && s.phase !== 'over' && s.day < until; i++) {
    if (s.phase === 'morning') {
      const offer = s.players[me].traitOffer;
      s = offer?.length && !s.players[me].trait ? playLocal(s, me, { kind: 'trait', trait: offer[0] }) : playLocal(s, me, { kind: 'begin' });
      continue;
    }
    if (s.phase === 'reveal') { s = playLocal(s, me, { kind: 'finish' }); continue; }
    const ai = aiStep(s);
    if (ai) { s = ai; continue; }
    s = playLocal(s, activePlayer(s) >= 0 && s.phase !== 'stall' && s.phase !== 'bid' && s.phase !== 'order' && s.phase !== 'evening' ? activePlayer(s) : me, myMove(s, me));
  }
  return s;
}

describe('the record format', () => {
  /** A whole computer game as a record, built as the room builds it. */
  function recordOf(seed: number): { rec: MatchRecord; end: GameState } {
    let s = newGame({ ...cfg(seed), players: cfg(seed).players.map((p) => ({ ...p, kind: 'ai' as const, level: 'normal' as const })) });
    const rec = newRecord('0123456789abcdef', 'solo', s);
    for (let i = 0; i < 6000 && s.phase !== 'over'; i++) {
      if (s.phase === 'morning') s = beginBuying(s);
      else if (s.phase === 'reveal') { rec.days.push(daySheet(s)!); s = finishReveal(s); } else s = aiStep(s)!;
    }
    rec.end = endOf(s);
    return { rec, end: s };
  }

  it('holds every day: purchases, crates, prices, each sale and the cash, and ends on the final cash', () => {
    const { rec, end } = recordOf(11);
    expect(rec.days.map((d) => d.d)).toEqual([1, 2, 3, 4, 5, 6, 7, 8]);
    expect(rec.end).toEqual({ over: true, day: 8, phase: 'over', cash: end.players.map((p) => p.cash), sold: end.players.map((p) => p.stats.sold) });
    expect(rec.days[7].cash).toEqual(end.players.map((p) => p.cash));
    for (const d of rec.days) {
      // what each stall took in is what its sale lines add up to, at least (tips and orders come on top)
      const fromLines = [0, 0, 0];
      for (const l of d.sales) for (const [p, , price, sold] of l.o) fromLines[p] += price * sold;
      d.income.forEach((x, p) => expect(x).toBeGreaterThanOrEqual(fromLines[p]));
      expect(d.buys.length).toBe(3);
      expect(d.prices.length).toBe(3);
    }
    expect(rec.days.some((d) => d.sales.some((l) => l.o.some((o) => o[3] > 0)))).toBe(true);
    expect(rec.days.flatMap((d) => d.buys.flat()).length).toBeGreaterThan(20);
  });

  it('passes the cleaner unchanged, over many games', () => {
    for (let seed = 1; seed <= 25; seed++) {
      const { rec } = recordOf(seed);
      const sent = JSON.parse(JSON.stringify(rec)) as MatchRecord;
      expect(cleanRecord(sent)).toEqual(sent);
    }
  });

  it('never holds a stall\'s name, and the set-up keeps a shopkeeper only as its perk', () => {
    const { rec } = recordOf(3);
    const text = JSON.stringify(rec);
    for (const name of ['Zorblax', 'Qwerty', 'Rosa', 'Benny', '🦊', '🐻']) expect(text).not.toContain(name);
    expect(rec.cfg.seats.every((x) => Object.keys(x).every((k) => ['k', 'lv', 'perk'].includes(k)))).toBe(true);
  });

  it('the cleaner drops what it does not know and refuses a string that is not one of the game\'s own words', () => {
    const { rec } = recordOf(5);
    const sent = JSON.parse(JSON.stringify(rec)) as MatchRecord & Record<string, unknown>;
    // extra fields anywhere are simply not copied
    const extra = { ...sent, name: 'Aisha', token: 'abc', cfg: { ...sent.cfg, host: 'Aisha', seats: sent.cfg.seats.map((x) => ({ ...x, name: 'Aisha' })) }, end: { ...sent.end, note: 'Aisha' } };
    expect(JSON.stringify(cleanRecord(extra))).not.toContain('Aisha');
    expect(cleanRecord(extra)).toEqual(sent);
    // a name put where a word belongs is refused outright
    const line = sent.days.findIndex((d) => d.sales.length > 0);
    const tries: ((r: MatchRecord) => void)[] = [
      (r) => { r.days[line].sales[0].c = 'Aisha'; },
      (r) => { r.days[0].ev = 'Aisha binti Ali'; },
      (r) => { r.cfg.seats[0].perk = 'Aisha'; },
      (r) => { r.cfg.opts = ['Aisha']; },
      (r) => { r.id = 'Aisha'; },
      (r) => { r.opens = [[1, 'Aisha Ali']]; },
      (r) => { r.end.phase = 'Aisha'; },
      (r) => { (r as unknown as { mode: string }).mode = 'Aisha'; },
      (r) => { r.who = { pid: 'aisha@example.com', sid: '0123456789abcdef', depth: 0, inst: '2026-11-01', ab: 'a' }; },
      (r) => { r.trail = [[0, { kind: 'buy', fruit: 'Aisha' as never, pos: 0 }, 5, 0]]; },
    ];
    for (const change of tries) {
      const bad = JSON.parse(JSON.stringify(sent)) as MatchRecord;
      change(bad);
      expect(() => cleanRecord(bad)).toThrow();
    }
    // every word list is the game's own: none holds a shopkeeper's or a person's name
    expect([...RECORD_WORDS.CUSTOMERS].length).toBeGreaterThan(40);
    expect(RECORD_WORDS.PERKS.has('haggler')).toBe(true);
  });

  it('a session line keeps a player number only as random hex, and the device only coarsely', () => {
    const ok = { pid: '0123456789abcdef', sid: 'fedcba9876543210', inst: '2026-11-20', ab: 'b', dev: { form: 'phone', os: 'android', scr: '400x840', app: '1.33.0', model: 'Pixel 9', ua: 'Mozilla' }, lvl: 3, email: 'a@b.c' };
    expect(cleanSession(ok)).toEqual({ pid: ok.pid, sid: ok.sid, inst: ok.inst, ab: 'b', dev: { form: 'phone', os: 'android', scr: '400x840', app: '1.33.0' }, lvl: 3 });
    expect(() => cleanSession({ ...ok, pid: 'murshidi' })).toThrow();
    expect(cleanSession({ ...ok, dev: { form: 'watch', os: 'Pixel 9', scr: 'big', app: 'beta' } }).dev).toEqual({ form: 'phone', os: 'other', scr: '0x0', app: '0.0.0' });
  });
});

describe('the recorder on a phone', () => {
  const mem = new Map<string, string>();
  let posts: { url: string; body: unknown }[] = [];
  beforeEach(() => {
    mem.clear();
    posts = [];
    vi.stubGlobal('localStorage', {
      getItem: (k: string) => mem.get(k) ?? null, setItem: (k: string, v: string) => { mem.set(k, v); }, removeItem: (k: string) => { mem.delete(k); },
      key: (i: number) => [...mem.keys()][i] ?? null, get length() { return mem.size; },
    });
    vi.stubGlobal('location', { protocol: 'https:', hostname: 'server.test', origin: 'https://server.test', port: '' });
    vi.stubGlobal('fetch', async (url: string, init: { body: Blob }) => { posts.push({ url, body: JSON.parse(await init.body.text()) }); return { ok: true, json: async () => ({ ok: true, deleted: 2 }) }; });
  });
  afterEach(() => { vi.unstubAllGlobals(); });
  const settle = () => new Promise((r) => setTimeout(r, 20));
  const records = () => posts.filter((p) => p.url.endsWith('/api/m')).map((p) => p.body as MatchRecord);

  it('sends the record at the end of each day and at the end, and it passes the server\'s cleaner', async () => {
    const end = playOnPhone(21);
    await settle();
    const sent = records();
    expect(end.phase).toBe('over');
    expect(sent.length).toBe(8); // days 1 to 7 as each closes, then the finished game
    expect(new Set(sent.map((r) => r.id)).size).toBe(1); // one game, one number: each copy replaces the last
    const last = sent[sent.length - 1];
    expect(last.days.map((d) => d.d)).toEqual([1, 2, 3, 4, 5, 6, 7, 8]);
    expect(last.end).toMatchObject({ over: true, cash: end.players.map((p) => p.cash), rank: expect.any(Number) });
    expect(last.mode).toBe('solo');
    expect(last.trail!.length).toBeGreaterThan(30);
    expect(last.trail!.every(([seat, a, ms]) => seat === 0 && typeof a.kind === 'string' && ms >= 0 && ms <= 600_000)).toBe(true);
    expect(last.dev).toMatchObject({ form: expect.any(String), os: expect.any(String) });
    expect(last.who).toBeUndefined(); // no player number without a yes
    expect(JSON.stringify(last)).not.toContain('Zorblax');
    for (const r of sent) expect(cleanRecord(JSON.parse(JSON.stringify(r)))).toBeTruthy();
    // the finished game's record is not kept on the phone
    expect([...mem.keys()].filter((k) => k.startsWith('fm.rec.'))).toEqual([]);
  });

  it('sends nothing, and keeps nothing, while "Share game data" is off', async () => {
    mem.set('fm.settings', JSON.stringify({ analytics: false }));
    const s = playOnPhone(22, 4);
    noteUndo(s); noteOpen('card_Bobby Books'); noteLeft(s);
    await settle();
    expect(posts).toEqual([]);
    expect([...mem.keys()].filter((k) => k.startsWith('fm.rec.'))).toEqual([]);
  });

  it('a game left part-way goes with its step and the leaver\'s rank; take-backs and cards opened are counted', async () => {
    const s = playOnPhone(23, 3);
    noteShown(s);
    noteOpen('card_Bobby Books');
    noteUndo(s);
    noteLeft(s);
    await settle();
    const left = records().pop()!;
    expect(left.end).toMatchObject({ over: false, day: 3, phase: s.phase, rank: expect.any(Number) });
    expect(left.days.map((d) => d.d)).toEqual([1, 2]);
    expect(left.opens).toEqual([[3, 'card_bobby_books']]);
    expect(cleanRecord(JSON.parse(JSON.stringify(left))).opens).toEqual([[3, 'card_bobby_books']]);
    // the take-back is counted on the next move made
    const kept = JSON.parse([...mem.entries()].find(([k]) => k.startsWith('fm.rec.'))![1]) as { undo: number };
    expect(kept.undo).toBe(1);
  });

  it('a player number exists only after a yes, rides on the record, and "Forget my data" deletes it', async () => {
    expect(linkAnswer()).toBeNull();
    expect(playerTag()).toBeNull();
    answerLink(false);
    expect(linked()).toBe(false);
    expect(mem.get('fm.pid')).toBeUndefined();
    answerLink(true);
    const tag = playerTag()!;
    expect(tag.pid).toMatch(/^[0-9a-f]{16}$/);
    expect(['a', 'b']).toContain(tag.ab);
    playOnPhone(24);
    await settle();
    const rec = records().pop()!;
    expect(rec.who).toMatchObject({ pid: tag.pid, sid: tag.sid, ab: tag.ab });
    expect(cleanRecord(JSON.parse(JSON.stringify(rec))).who!.pid).toBe(tag.pid);
    posts = [];
    expect(await forgetMe()).toBe(true);
    expect(posts).toEqual([{ url: 'https://server.test/api/forget', body: { pid: tag.pid } }]);
    expect(mem.get('fm.pid')).toBeUndefined();
    expect(linkAnswer()).toBe('no');
    expect(playerTag()).toBeNull();
  });
});
