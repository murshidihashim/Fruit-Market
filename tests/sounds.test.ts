import { readFileSync } from 'node:fs';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { autoplay } from '../src/engine/ai';
import { RIVALS } from '../src/engine/data';
import { newGame, type GameState } from '../src/engine/game';
import { OnlineClient } from '../src/net/client';
import { cleanLook } from '../src/net/looks';
import * as A from '../src/ui/anim';
import { holdCash } from '../src/ui/cashShown';
import { fx } from '../src/ui/fx';
import { reveal, type BellShow } from '../src/ui/game/animator';
import { rushCards } from '../src/ui/game/rush';
import { syncLooks, toggleLook, worn, wornSounds } from '../src/ui/looks';
import { saveLooks } from '../src/ui/progress';
import { holdRush, releaseRush } from '../src/ui/rushShown';
import { holdStock, releaseStock } from '../src/ui/stockShown';
import { saveSettings, loadSettings } from '../src/ui/store';

// The bell and coin sounds a player earns (PLAN-086; PLAN-091, item 4). The browser tests run silent, so this proves
// with the game's own code that the sound a player chose is the one made when the bell rings and when coins land, and
// that a sound never leaves the phone in the look message.

/** Every tone made, by its pitch: a pretend AudioContext in place of the speaker. */
const heard: number[] = [];
class Speaker {
  currentTime = 0;
  destination = {};
  createOscillator() {
    return { type: 'sine', frequency: { setValueAtTime: (f: number) => { heard.push(f); } }, connect: <T>(g: T) => g, start() {}, stop() {} };
  }
  createGain() {
    return { gain: { setValueAtTime() {}, exponentialRampToValueAtTime() {} }, connect: <T>(d: T) => d };
  }
  resume() { return Promise.resolve(); }
}
// A pitch that only one sound makes (fx.ts): each bell and coin sound can be told apart by it.
const MARK = { bell_brass: 880, bell_bicycle: 2349, bell_counter: 3520, coin_till: 988, coin_jar: 1568, coin_abacus: 420 } as const;
const times = (sound: keyof typeof MARK) => heard.filter((f) => f === MARK[sound]).length;

const store = new Map<string, string>();
beforeEach(() => {
  store.clear();
  heard.length = 0;
  vi.stubGlobal('localStorage', {
    getItem: (k: string) => store.get(k) ?? null,
    setItem: (k: string, v: string) => void store.set(k, v),
    removeItem: (k: string) => void store.delete(k),
  });
  vi.stubGlobal('AudioContext', Speaker);
});
afterEach(() => { holdCash(null); releaseStock(); releaseRush(); A.setBaseSpeed(false); A.resetHurry(); vi.useRealTimers(); vi.unstubAllGlobals(); });

/** The player has earned the Counter bell and the Coin jar (levels 7 and 4), and what everyone has, and put both on. */
function chooseSounds(more: string[] = []) {
  saveLooks(['bell_counter', 'coin_jar', ...more]);
  syncLooks();
  toggleLook('bell_counter');
  toggleLook('coin_jar');
  expect(wornSounds()).toEqual({ bell: 'bell_counter', coin: 'coin_jar' });
}

describe('the sounds a player chose', () => {
  it('fx rings the chosen bell and drops the chosen coins; the first ones until another is chosen; none with sound off', () => {
    fx.bell(); fx.coin();
    expect([times('bell_brass'), times('coin_till')]).toEqual([1, 1]);
    heard.length = 0;
    chooseSounds();
    fx.bell(); fx.coin();
    expect([times('bell_counter'), times('coin_jar')]).toEqual([1, 1]);
    expect([times('bell_brass'), times('bell_bicycle'), times('coin_till'), times('coin_abacus')]).toEqual([0, 0, 0, 0]);
    heard.length = 0;
    saveSettings({ ...loadSettings(), sound: false });
    fx.bell(); fx.coin();
    expect(heard).toEqual([]);
  });

  it('when the bell rings and the coins land in the rush, they are the chosen sounds: the bell once, then a coin for each payment', async () => {
    chooseSounds();
    // a real day of four computer stalls, at the moment the bell rings, with money for several stalls
    let s: GameState = newGame({
      players: RIVALS.slice(0, 4).map((r, i) => ({ name: i ? r.name : 'Mia', kind: 'ai' as const, level: 'normal' as const, avatar: r.avatar })),
      days: 10, unripe: true, upgrades: true, events: true, seed: 3,
    });
    const ok = (x: GameState) => x.phase === 'reveal' && !!x.results && !x.results.hawker && rushCards(x, 0).filter((c) => c.blocks.some((b) => b.got > 0)).length >= 3;
    for (let i = 0; i < 6000 && !ok(s); i++) s = autoplay(s, 1);
    expect(ok(s)).toBe(true);
    const cards = rushCards(s, 0);
    // one coin sound for each stall paid for a fruit (as its first coin lands), and one for each tip or stake
    const payments = cards.reduce((n, c) => n + c.blocks.reduce((m, b) => m + b.rows.filter((r) => r.sold > 0).length, 0) + c.extras.length, 0);
    expect(payments).toBeGreaterThan(2);

    // the clock and the page, as in the rush test: nothing to draw on, so every move lands at once
    vi.useFakeTimers();
    vi.stubGlobal('matchMedia', () => ({ matches: false }));
    vi.stubGlobal('requestAnimationFrame', (cb: () => void) => setTimeout(cb, 0));
    vi.stubGlobal('document', { querySelector: () => null });
    A.setBaseSpeed(false);
    A.resetHurry();
    holdCash(s.players.map((pl, i) => pl.cash - s.results!.income[i] - (s.results!.order?.holder === i ? s.results!.order.back : 0)));
    holdStock(s.players.map((pl) => pl.stock), s.players.map((pl) => pl.stock));
    holdRush(s.results!, s.players.length);

    // The game's bell setter (useGameController.ts, checked below): it rings fx.bell the first time the bell shows
    // anything, and is ready again once the bell is put away.
    let up = false;
    const order: string[] = [];
    const setBell = (open: BellShow) => {
      if (open !== null && !up) { order.push('bell'); fx.bell(); }
      up = open !== null;
    };
    const coin = fx.coin;
    const spy = vi.spyOn(fx, 'coin').mockImplementation(() => { order.push('coin'); coin(); });
    const done = reveal(s, 0, () => {}, setBell);
    await vi.runAllTimersAsync();
    await done;
    spy.mockRestore();

    expect(order[0]).toBe('bell');
    expect(order.filter((x) => x === 'bell')).toEqual(['bell']);
    expect(order.filter((x) => x === 'coin').length).toBe(payments);
    expect(times('bell_counter')).toBe(1);
    expect(times('coin_jar')).toBe(payments);
    expect([times('bell_brass'), times('bell_bicycle'), times('coin_till'), times('coin_abacus')]).toEqual([0, 0, 0, 0]);
  });

  it('the game rings the bell through that setter, every time the bell is shown', () => {
    const src = readFileSync('src/ui/game/useGameController.ts', 'utf8');
    const setter = src.slice(src.indexOf('const setBell = (open: BellShow) => {'), src.indexOf('showBell(open);'));
    expect(setter).toContain('if (open !== null && !bellUp.current) fx.bell();');
    expect(setter).toContain('bellUp.current = open !== null;');
    // the bell is shown by the bell's script and the rush's script, both given that setter, and by the setter itself
    expect(src).toContain('await bellRings(next, setBell);');
    expect(src).toMatch(/await reveal\(next, viewer, setShow, setBell\b/);
    expect(src.match(/\bshowBell\(/g)?.length).toBe(1);
    // and the coins of the rush land with fx.coin (animator.tsx), the sound the player chose
    const anim = readFileSync('src/ui/game/animator.tsx', 'utf8');
    expect(anim).toContain("onLand: k ? undefined : () => { fx.coin(); pay(row.player, row.paid);");
  });
});

describe('the look message', () => {
  it('never carries a sound: not when joining a room, not when the Wardrobe changes, and the room drops one if sent', () => {
    chooseSounds(['bell_bicycle', 'coin_abacus']);
    toggleLook('col_teal');
    const sent: string[] = [];
    class Socket {
      static OPEN = 1;
      readyState = 1;
      onopen: (() => void) | null = null;
      onmessage: ((e: { data: string }) => void) | null = null;
      onclose: (() => void) | null = null;
      constructor(public url: string) { sockets.push(this); }
      send(m: string) { sent.push(m); }
      close() {}
    }
    const sockets: Socket[] = [];
    vi.stubGlobal('WebSocket', Socket);
    const client = new OnlineClient('ABCDE', 'Mia', RIVALS[0].avatar, worn());
    sockets[0].onopen?.();
    client.wear(toggleLook('bell_bicycle'));
    client.wear(toggleLook('coin_abacus'));
    client.stop();
    const msgs = sent.map((m) => JSON.parse(m) as { t: string; look?: Record<string, string> });
    const looks = msgs.filter((m) => m.t === 'hello' || m.t === 'look').map((m) => m.look);
    expect(looks.length).toBe(3);
    for (const look of looks) {
      expect(look).toBeDefined();
      expect(Object.keys(look!)).not.toContain('bell');
      expect(Object.keys(look!)).not.toContain('coin');
      expect(look!.colour).toBe('col_teal');
    }
    expect(sent.join('\n')).not.toMatch(/bell_|coin_/);
    // what the phone hears is the sound chosen last
    expect(wornSounds()).toEqual({ bell: 'bell_bicycle', coin: 'coin_abacus' });
    // the room keeps no sound even from a phone that sends one
    expect(cleanLook({ colour: 'col_teal', bell: 'bell_counter', coin: 'coin_jar' })).toEqual({ colour: 'col_teal' });
  });
});
