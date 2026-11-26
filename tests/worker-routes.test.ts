// REP-140 A-10 (PLAN-130): the Worker's web addresses (server/worker.ts). Every Durable Object, the rate limiters and
// the static files are fakes that record what they were asked, so these tests check the routing itself: which
// address goes where, the status codes, the version answer, and the answers that refuse bad input. What each object
// then does is tested on its own (room.test.ts, meta.test.ts, accounts.test.ts, lobby.test.ts).
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { CODE_ALPHABET, CODE_LENGTH, RULES_VERSION } from '../src/net/protocol';
import { dailyBoardKey, sprintBoardKey, sprintWeekKey } from '../server/meta';

// The Workers runtime's module, which only exists on Cloudflare: the Durable Object classes extend this.
vi.mock('cloudflare:workers', () => ({ DurableObject: class {} }));

type Fetch = (req: Request, env: object) => Promise<Response>;
const isWorker = (m: unknown): m is { default: { fetch: Fetch } } =>
  typeof (m as { default?: { fetch?: unknown } } | null)?.default?.fetch === 'function';
// worker.ts is type-checked with the Workers types (server/tsconfig.json), so it is loaded by path here: the app's
// tsconfig, which checks the tests, has no Workers types.
const WORKER = '../server/worker';
async function worker(): Promise<Fetch> {
  const m: unknown = await import(/* @vite-ignore */ WORKER);
  if (!isWorker(m)) throw new Error('server/worker.ts has no default fetch');
  return m.default.fetch;
}

/** One request a fake object or the static files were asked. */
interface Call { to: string; name: string; path: string; search: string; method: string; body: string }
let calls: Call[] = [];
/** What a fake object answers (by object, then path); otherwise a new room is made (201), and the rest is 200 `{}`. */
let answer: (to: string, path: string, body: string) => Response | null = () => null;
const made = (to: string, path: string) => (to === 'ROOMS' && path === '/init' ? new Response('Created', { status: 201 }) : null);

function fakeNamespace(to: string) {
  return {
    idFromName: (name: string) => name,
    get: (name: string) => ({
      fetch: async (input: string | Request, init?: RequestInit) => {
        const req = typeof input === 'string' ? new Request(input, init) : input;
        const body = req.method === 'GET' ? '' : await req.clone().text();
        const url = new URL(req.url);
        calls.push({ to, name, path: url.pathname, search: url.search, method: req.method, body });
        return answer(to, url.pathname, body) ?? made(to, url.pathname) ?? new Response('{}', { status: 200, headers: { 'content-type': 'application/json' } });
      },
    }),
  };
}

let limit = true;
const limiter = { limit: async () => ({ success: limit }) };
const env = () => ({
  ROOMS: fakeNamespace('ROOMS'), STATS: fakeNamespace('STATS'), BOARD: fakeNamespace('BOARD'), MATCH: fakeNamespace('MATCH'),
  ACCOUNT: fakeNamespace('ACCOUNT'), LOBBY: fakeNamespace('LOBBY'),
  ASSETS: { fetch: async (req: Request) => { calls.push({ to: 'ASSETS', name: '', path: new URL(req.url).pathname, search: '', method: req.method, body: '' }); return new Response('the game', { status: 200 }); } },
  STATS_KEY: 'secret-key', RL_ROOMS: limiter, RL_DAILY: limiter, RL_EVENTS: limiter, RL_ACCOUNT: limiter,
});

const BASE = 'https://fruit-market.example.workers.dev';
async function call(path: string, init: RequestInit = {}): Promise<Response> {
  return (await worker())(new Request(BASE + path, init), env());
}
const post = (path: string, body?: unknown, raw?: string) => call(path, { method: 'POST', body: raw ?? (body === undefined ? undefined : JSON.stringify(body)) });
const to = (name: string) => calls.filter((c) => c.to === name);

beforeEach(() => {
  calls = [];
  answer = () => null;
  limit = true;
});

describe('the version and the static game', () => {
  it('GET /api/version answers the rules version, as JSON anyone may read', async () => {
    const res = await call('/api/version');
    expect(res.status).toBe(200);
    expect(res.headers.get('content-type')).toBe('application/json');
    expect(res.headers.get('Access-Control-Allow-Origin')).toBe('*');
    expect(await res.json()).toEqual({ rules: RULES_VERSION });
  });

  it('an API preflight (OPTIONS) is answered with the CORS headers and nothing else', async () => {
    const res = await call('/api/rooms', { method: 'OPTIONS' });
    expect(res.status).toBe(200);
    expect(res.headers.get('Access-Control-Allow-Methods')).toBe('GET, POST, OPTIONS');
    expect(await res.text()).toBe('');
    expect(calls).toEqual([]);
  });

  it('any other address is the static game, an unknown /api/ address included', async () => {
    for (const path of ['/', '/index.html', '/assets/x.js', '/api/nothing-here', '/api/account/steal']) {
      calls = [];
      const res = await call(path);
      expect(await res.text(), path).toBe('the game');
      expect(to('ASSETS').map((c) => c.path), path).toEqual([path]);
    }
  });
});

describe('rooms', () => {
  it('POST /api/rooms makes a room with a fresh code; the code is the one the room was made with', async () => {
    const res = await post('/api/rooms');
    expect(res.status).toBe(200);
    const { code } = await res.json() as { code: string };
    expect(code).toHaveLength(CODE_LENGTH);
    for (const ch of code) expect(CODE_ALPHABET).toContain(ch);
    const init = to('ROOMS');
    expect(init).toHaveLength(1);
    expect(init[0]).toMatchObject({ name: code, path: '/init', method: 'POST', search: `?code=${code}` });
  });

  it('?public=1 makes a public room; a taken code is tried again, and five taken codes answer 503', async () => {
    await post('/api/rooms?public=1');
    expect(to('ROOMS')[0].search).toMatch(/&public=1$/);
    calls = [];
    answer = (o, path) => (o === 'ROOMS' && path === '/init' ? new Response('Exists', { status: 409 }) : null);
    const res = await post('/api/rooms');
    expect(res.status).toBe(503);
    expect(await res.json()).toEqual({ error: 'Could not create a room, try again' });
    expect(to('ROOMS')).toHaveLength(5);
  });

  it('a room is only made by POST', async () => {
    const res = await call('/api/rooms');
    expect(res.status).toBe(405);
    expect(await res.json()).toEqual({ error: 'POST only' });
    expect(to('ROOMS')).toEqual([]);
  });

  it('GET /api/public is the public lobby\'s list; POST is refused', async () => {
    expect((await call('/api/public')).status).toBe(200);
    expect(to('LOBBY')).toEqual([expect.objectContaining({ name: 'global', path: '/list', method: 'GET' })]);
    expect((await post('/api/public')).status).toBe(405);
  });

  it('POST /api/quick asks the one match-maker for the table size sent, and 2 stalls when none or a wrong one is sent', async () => {
    await post('/api/quick', { stalls: 4 });
    await post('/api/quick', { stalls: 6 });
    await post('/api/quick');
    await post('/api/quick', undefined, 'not json');
    await post('/api/quick', { stalls: 5 });
    expect(to('MATCH').map((c) => [c.name, c.path, c.search])).toEqual([
      ['global', '/quick', '?stalls=4'], ['global', '/quick', '?stalls=6'], ['global', '/quick', '?stalls=2'],
      ['global', '/quick', '?stalls=2'], ['global', '/quick', '?stalls=2'],
    ]);
    expect((await call('/api/quick')).status).toBe(405);
  });

  it('GET /ws/<code> goes to that room as a WebSocket; no upgrade is 426, a code of the wrong length is 404', async () => {
    const plain = await call('/ws/ABC234');
    expect(plain.status).toBe(426);
    const ws = { headers: { Upgrade: 'websocket' } };
    const short = await call('/ws/ABC', ws);
    expect(short.status).toBe(404);
    expect(await short.text()).toBe('Unknown room');
    expect(to('ROOMS')).toEqual([]);
    await call('/ws/abc-234', ws);
    expect(to('ROOMS')).toEqual([expect.objectContaining({ name: 'ABC234', path: '/ws/abc-234' })]);
  });
});

describe('rate limits', () => {
  it('a write over its limit answers 429 and reaches no object', async () => {
    limit = false;
    for (const [path, body] of [['/api/rooms', undefined], ['/api/quick', { stalls: 2 }], ['/api/daily', { date: '2026-11-26' }], ['/api/account/login', { id: 'grocer' }]] as const) {
      const res = await post(path, body);
      expect(res.status, path).toBe(429);
      expect(await res.json(), path).toEqual({ error: 'Too many requests. Wait a minute and try again.' });
    }
    expect(calls).toEqual([]);
  });

  it('usage counters over their limit are dropped quietly: 204, nothing stored', async () => {
    limit = false;
    expect((await post('/api/t', { events: ['game_start'] })).status).toBe(204);
    expect(to('STATS')).toEqual([]);
  });
});

describe('usage counters and the stats report', () => {
  it('POST /api/t stores only well-formed counters and lines, and always answers 204', async () => {
    const res = await post('/api/t', { events: ['game_start', 'NOT OK', 7], errors: ['boom'] });
    expect(res.status).toBe(204);
    expect(to('STATS')).toHaveLength(1);
    expect(JSON.parse(to('STATS')[0].body)).toEqual({ events: ['game_start'], errors: ['boom'] });
    calls = [];
    for (const raw of ['not json', JSON.stringify({ events: ['BAD EVENT'] }), 'x'.repeat(40_000)]) expect((await post('/api/t', undefined, raw)).status).toBe(204);
    expect(to('STATS')).toEqual([]);
    expect((await call('/api/t')).status).toBe(405);
  });

  it('GET /api/stats needs the key: none or a wrong one is 403; the right one reads the report (14 days unless asked)', async () => {
    expect((await call('/api/stats')).status).toBe(403);
    expect((await call('/api/stats', { headers: { 'x-stats-key': 'wrong' } })).status).toBe(403);
    expect(to('STATS')).toEqual([]);
    await call('/api/stats', { headers: { 'x-stats-key': 'secret-key' } });
    await call('/api/stats?days=3', { headers: { 'x-stats-key': 'secret-key' } });
    expect(to('STATS').map((c) => [c.path, c.search])).toEqual([['/report', '?days=14'], ['/report', '?days=3']]);
  });
});

describe('accounts', () => {
  it('each action goes to the account\'s own object, by its ID in lower case', async () => {
    for (const action of ['signup', 'login', 'sync', 'logout', 'password', 'delete']) {
      calls = [];
      await post(`/api/account/${action}`, { id: 'Grocer_1', password: 'pw' });
      expect(to('ACCOUNT'), action).toEqual([expect.objectContaining({ name: 'acct:grocer_1', path: `/${action}`, method: 'POST' })]);
      expect(JSON.parse(to('ACCOUNT')[0].body), action).toEqual({ id: 'Grocer_1', password: 'pw' });
    }
  });

  it('refuses bad input without waking an object: GET, a body that is not JSON or too long, an ID that could never exist', async () => {
    expect((await call('/api/account/login')).status).toBe(405);
    const notJson = await post('/api/account/login', undefined, '{oops');
    expect(notJson.status).toBe(400);
    expect(await notJson.json()).toEqual({ error: 'Something went wrong. Try again.' });
    expect((await post('/api/account/login', undefined, JSON.stringify({ id: 'x'.repeat(40_000) }))).status).toBe(400);
    // a wrong-looking ID gets the same answer as a wrong password
    for (const id of [undefined, 7, 'ab', 'no spaces', 'x'.repeat(30)]) {
      const res = await post('/api/account/login', { id, password: 'pw' });
      expect(res.status, String(id)).toBe(401);
      expect(await res.json(), String(id)).toEqual({ error: 'Wrong ID or password.' });
    }
    // signing up says what is wrong with the ID
    const noId = await post('/api/account/signup', { password: 'pw' });
    expect(noId.status).toBe(400);
    expect(await noId.json()).toEqual({ error: 'Enter an ID.' });
    expect((await post('/api/account/signup', { id: 'ab', password: 'pw' })).status).toBe(200); // the account object judges it
    expect(to('ACCOUNT')).toHaveLength(1);
  });
});

describe('the Daily market\'s board', () => {
  it('GET /api/daily reads the day\'s board (today when no date), with `me` only when it is a device hash', async () => {
    const me = 'a'.repeat(64);
    await call('/api/daily?date=2026-11-26');
    await call(`/api/daily?date=2026-11-26&me=${me}`);
    await call('/api/daily?date=2026-11-26&me=not-a-hash');
    await call('/api/daily');
    const today = new Date().toISOString().slice(0, 10);
    expect(to('BOARD').map((c) => [c.name, c.path, c.search])).toEqual([
      [dailyBoardKey('2026-11-26'), '/top', ''], [dailyBoardKey('2026-11-26'), '/top', `?me=${me}`],
      [dailyBoardKey('2026-11-26'), '/top', ''], [dailyBoardKey(today), '/top', ''],
    ]);
  });

  it('POST /api/daily sends a submission to its date\'s board; a bad date or body is 400 and reaches no board', async () => {
    const bad = await call('/api/daily?date=26-11-2026');
    expect(bad.status).toBe(400);
    expect(await bad.json()).toEqual({ error: 'Bad date' });
    for (const raw of ['{oops', JSON.stringify({ date: 'today' }), JSON.stringify({})]) expect((await post('/api/daily', undefined, raw)).status, raw).toBe(400);
    expect(to('BOARD')).toEqual([]);
    const sub = { date: '2026-11-26', name: 'Ann', actions: [] };
    await post('/api/daily', sub);
    expect(to('BOARD')).toEqual([expect.objectContaining({ name: dailyBoardKey('2026-11-26'), path: '/submit', method: 'POST' })]);
    expect(JSON.parse(to('BOARD')[0].body)).toEqual(sub);
  });
});

describe('the Market Sprint\'s boards', () => {
  it('GET /api/sprint reads the day\'s board and the week\'s ranking; a bad date is 400', async () => {
    answer = (o, path) => (o === 'BOARD' ? Response.json(path === '/sprint/view' ? { kind: 'day' } : { kind: 'week' }) : null);
    const res = await call('/api/sprint?date=2026-11-26');
    expect(await res.json()).toEqual({ day: { kind: 'day' }, week: { kind: 'week' }, weekOf: expect.any(String) });
    expect(to('BOARD').map((c) => [c.name, c.path])).toEqual([[sprintBoardKey('2026-11-26'), '/sprint/view'], [sprintWeekKey('2026-11-26'), '/week/view']]);
    expect((await call('/api/sprint?date=nope')).status).toBe(400);
  });

  it('POST /api/sprint checks the game on the day\'s board, adds the best to the week, and never sends the owner hash back', async () => {
    const best = { name: 'Ann', cash: 40, sold: 12 };
    answer = (o, path) => {
      if (o !== 'BOARD') return null;
      if (path === '/sprint/submit') return Response.json({ owner: 'f'.repeat(64), cash: 40, name: 'Ann', best, day: { rows: [] } });
      return Response.json({ rows: ['week'] });
    };
    const res = await post('/api/sprint', { date: '2026-11-26', name: 'Ann', actions: [] });
    expect(res.status).toBe(200);
    const out = await res.json() as Record<string, unknown>;
    expect(out).toMatchObject({ ok: true, cash: 40, name: 'Ann', best, day: { rows: [] }, week: { rows: ['week'] } });
    expect(JSON.stringify(out)).not.toContain('f'.repeat(64));
    const week = to('BOARD').find((c) => c.path === '/week/put')!;
    expect(week.name).toBe(sprintWeekKey('2026-11-26'));
    expect(JSON.parse(week.body)).toMatchObject({ owner: 'f'.repeat(64), date: '2026-11-26', ...best });
  });

  it('a submission the board refuses is passed on as an error, and the week is not touched', async () => {
    answer = (o, path) => (o === 'BOARD' && path === '/sprint/submit' ? Response.json({ error: 'That game does not check out' }, { status: 400 }) : null);
    const res = await post('/api/sprint', { date: '2026-11-26' });
    expect(res.status).toBe(400);
    expect(await res.json()).toEqual({ error: 'That game does not check out' });
    expect(to('BOARD').map((c) => c.path)).toEqual(['/sprint/submit']);
    expect((await post('/api/sprint', { date: 'soon' })).status).toBe(400);
  });
});
