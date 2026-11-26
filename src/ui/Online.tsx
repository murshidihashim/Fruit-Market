// Online multiplayer screens: create or join a room, the lobby, choosing shopkeepers (PLAN-102), then the shared
// match. A quick match picks its shopkeeper before searching and starts as soon as its table is full. PLAN-112: a room
// can be public, and the Public rooms page lists the public rooms still waiting for players; after a wait the host may
// start with computers; everyone in a room can send preset reactions (Reactions.tsx).
// PLAN-125 (DEC-133), design B: every page here is drawn as the set-up is (Setup.tsx): Quick Match's set-up (the deck,
// the "?" seats, the table size) and its wait, the Private Room page (open a room, join with a code), the room (its code,
// the seats as small cards, the length) and the pick screen (the deck; the seats' status as small cards).
// REP-140 A-02: the room is OnlineRoom.tsx, the wait OnlineWait.tsx, the pick screen OnlinePick.tsx, the words
// onlineWords.ts; this file holds the pages before a room is open and the way into the room. REP-140 A-08: these screens
// are loaded on demand (lazyScreens.ts, which also holds their styles, journey-online.css).
import { useEffect, useState } from 'preact/hooks';
import { createRoom, forgetMatch, hasSeat, OnlineClient, onlineAvailable, publicRooms, quickMatch, rememberMatch } from '../net/client';
import { track } from '../net/telemetry';
import { CODE_LENGTH, MAX_SEATS, NAME_MAX, normaliseCode, type PublicRoom } from '../net/protocol';
import { fx } from './fx';
import { Game } from './Game';
import { fitName, loadName, saveName } from './store';
import { DEFAULT_LENGTH_NOTE, QUICK_NOTE, QUICK_SIZES, QUICK_STALLS, isQuickStalls, wayLine, wayName, type QuickStalls } from './playMenu';
import { Deck, OpenCard, SbGo, SbLabel, SbPage, SeatCard, Seg, TableRow } from './Setup';
import { myAvatar, saveAvatar, syncLooks, worn } from './looks';
import { syncTiers } from './progress';
import { Lobby } from './OnlineRoom';
import { QuickWait } from './OnlineWait';
import { Picking } from './OnlinePick';
import { PICK_LATER, PUBLIC_WORDS, waitedWords } from './onlineWords';
import { useClient } from './onlineHooks';

/** PLAN-125: the Quick Match table size chosen last on this phone. */
const QUICK_KEY = 'fm.quick.stalls';
/** How often the Public rooms list is read while it is on screen. */
const LIST_EVERY_MS = 5000;

interface OnlineProps {
  initialCode?: string; typed?: boolean; quick?: boolean; mode?: 'room' | 'public'; onExit: () => void; onComputer?: (avatar: string, stalls: QuickStalls) => void;
}

/**
 * The online screen's state before and after a room is open: your name and shopkeeper, the page shown, Quick Match's
 * table size, the code typed, the room this screen was opened for, and the room's client once one is joined.
 */
function useOnline({ initialCode, quick, mode = 'room', onExit }: OnlineProps) {
  const [client, setClient] = useState<OnlineClient | null>(null);
  // REP-140 B-17: the name box holds the name as the room will keep it (store.ts fitName), so nothing is cut unseen
  const [name, setName] = useState(() => fitName(loadName()));
  // Quick Match: the character you ask for when you enter; if another player already has it, you get a free one.
  // A private room chooses shopkeepers after everyone has joined (PLAN-102).
  const [avatar, setAvatar] = useState(myAvatar);
  // PLAN-125: the page shown before a room is open: Quick Match's set-up, the Private Room, or the Public rooms.
  const [page, setPage] = useState<'quick' | 'room' | 'public'>(quick ? 'quick' : mode);
  // PLAN-125: Quick Match's table size, as chosen last on this phone.
  const [stalls, setStalls] = useState<QuickStalls>(() => {
    try { const n = Number(localStorage.getItem(QUICK_KEY)); return isQuickStalls(n) ? n : QUICK_STALLS; } catch { return QUICK_STALLS; }
  });
  const [code, setCode] = useState('');
  // The room this screen was opened for (an invite link, or a room to go back to). PLAN-107 (ON-03): once joining it
  // has failed, Back forgets it and shows the online page.
  const [invited, setInvited] = useState(initialCode);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  useClient(client);

  // ON-08 (PLAN-110): a match left mid-way (Home, Android's back button) can be gone back to from Home; a match that has
  // finished, or a room that could not be joined, is forgotten.
  useEffect(() => () => {
    if (client?.view?.status === 'playing' && client.conn !== 'failed' && !client.view.seats[client.view.you]?.left) rememberMatch(client.code);
    client?.stop();
  }, [client]);
  const status = client?.view?.status;
  useEffect(() => { if (status === 'finished' || client?.conn === 'failed') forgetMatch(); }, [status, client?.conn]);

  const begin = (c: string) => {
    forgetMatch();
    const nm = name.trim() || 'Player';
    saveName(name.trim());
    saveAvatar(avatar);
    setErr(null);
    // A player who opens an invitation never passes Home: what they have earned (and the first rank's title and frame,
    // which are everyone's) is brought up to date here, before the room is told what they have on.
    syncTiers();
    syncLooks();
    setClient(new OnlineClient(c, nm, avatar, worn()));
    try { history.replaceState(null, '', `?room=${c}`); } catch { /* the address cannot be changed here (a sandboxed frame): the room works without it */ }
  };

  // Refreshing or reopening the link with a seat token on this device goes straight back in.
  // eslint-disable-next-line react-hooks/exhaustive-deps -- on purpose once, as the screen opens, for the link it was opened with
  useEffect(() => { if (initialCode && hasSeat(initialCode)) begin(initialCode); }, []);

  /** PLAN-112: a room is private unless it is opened from the Public rooms page. */
  const create = async (asPublic: boolean) => {
    fx.tap();
    setBusy(true);
    track('online', asPublic ? 'public' : 'create');
    try { begin(await createRoom(asPublic)); } catch (e) { setErr((e as Error).message); } finally { setBusy(false); }
  };
  const joinListed = (c: string) => { fx.tap(); track('online', 'list_join'); begin(c); };
  const joinTyped = () => {
    const clean = normaliseCode(code);
    if (clean.length !== CODE_LENGTH) return;
    fx.tap();
    begin(clean);
  };
  const findMatch = async () => {
    fx.tap();
    setBusy(true);
    track('online', 'quick');
    try { localStorage.setItem(QUICK_KEY, String(stalls)); } catch { /* no storage: 2 stalls next time */ }
    // PLAN-125: the table size goes with the request (client.ts quickMatch(stalls)).
    try { begin(await quickMatch(stalls)); } catch (e) { setErr((e as Error).message); } finally { setBusy(false); }
  };
  const exit = () => {
    // ON-08: said before Home is drawn, so its "Back to room" ticket is there at once.
    if (client?.view?.status === 'playing' && !client.view.seats[client.view.you]?.left) rememberMatch(client.code);
    client?.stop();
    try { history.replaceState(null, '', location.pathname); } catch { /* the address cannot be changed here: Home works without it */ }
    onExit();
  };
  /** Back to the page this screen opened on, with no room: the address forgets the room too. */
  const leaveRoom = () => {
    setClient(null);
    try { history.replaceState(null, '', location.pathname); } catch { /* the address cannot be changed here: the set-up works without it */ }
  };
  return {
    client, name, setName, avatar, setAvatar, page, setPage, stalls, setStalls, code, setCode, invited, setInvited, busy, err, setErr,
    create, joinListed, joinTyped, findMatch, exit, leaveRoom, begin,
  };
}
type OnlineState = ReturnType<typeof useOnline>;

/** `typed`: the code was typed (ON-15: "Room X", not an invitation). PLAN-113: `mode` is the way this screen was
 *  opened for (a private room, or the public rooms); `quick` is Quick Match, whose wait offers `onComputer`: a game
 *  against the computer now, at the table size the wait was for. PLAN-125 (DEC-133): Quick Match opens on its set-up
 *  page (your shopkeeper, the table size, Find a match), which links to the Public rooms; the Private Room page opens a
 *  room or joins one by its code. */
export function Online(p: OnlineProps) {
  const o = useOnline(p);
  if (o.client) return <InRoom o={o} client={o.client} quick={!!p.quick} onComputer={p.onComputer} />;
  if (o.page === 'quick' && !o.invited) return <QuickSetup o={o} />;
  if (o.page === 'public' && !o.invited) return <PublicPage o={o} quick={!!p.quick} />;
  if (o.invited) {
    return (
      <SbPage title={wayName('room')} sub={p.typed ? `Room ${o.invited}` : `Invited to room ${o.invited}`} onBack={o.exit} class="jo sb-room"
        foot={<SbGo a="join-room" disabled={!onlineAvailable()} onClick={() => o.begin(o.invited!)}>Join the game</SbGo>}>
        <Offline />
        <NameBox o={o} />
        <p class="sb-note">{PICK_LATER}</p>
        <ErrorLine err={o.err} />
      </SbPage>
    );
  }
  return <RoomPage o={o} />;
}

/** Joined (or joining) a room: connecting, could not join, choosing shopkeepers, the match, the quick wait or the lobby. */
function InRoom({ o, client, quick, onComputer }: { o: OnlineState; client: OnlineClient; quick: boolean; onComputer?: OnlineProps['onComputer'] }) {
  const v = client.view;
  const title = quick ? wayName('quick') : v?.public ? 'Public room' : wayName('room');
  if (client.conn === 'failed') {
    const back = () => { fx.tap(); o.leaveRoom(); o.setInvited(undefined); };
    return (
      <SbPage title={title} sub="Couldn't join" onBack={o.exit} class="jo" foot={<SbGo onClick={back}>Back</SbGo>}>
        <section class="sb-sec"><h3 class="sb-h3">Couldn't join</h3><p class="sb-warn" role="alert">{client.error}</p></section>
      </SbPage>
    );
  }
  if (!v) {
    return (
      <SbPage title={title} sub={quick ? 'Finding strangers' : `Room ${client.code}`} onBack={o.exit} class="jo">
        <div class="waiting-dots big-wait">{quick ? 'Looking for a stall' : `Connecting to room ${client.code}`}</div>
      </SbPage>
    );
  }
  const leave = () => { client.leave(); o.exit(); };
  if (v.status === 'picking') return <Picking client={client} v={v} onExit={leave} />;
  if (v.game && v.status !== 'lobby') {
    return <Game key={v.game.config.seed} initial={v.game} online={client} onExit={o.exit} onChange={() => {}} onRematch={() => client.rematch()} />;
  }
  if (v.quick) {
    // PLAN-113: the wait. Cancel stops looking and comes back to the set-up; the computer game leaves the queue first.
    const stop = () => { client.leave(); client.stop(); o.leaveRoom(); };
    return (
      <QuickWait v={v} stalls={o.stalls} onExit={leave}
        onCancel={() => { fx.tap(); stop(); }}
        onComputer={onComputer && ((a, n) => { fx.tap(); client.leave(); o.exit(); onComputer(a, n); })} />
    );
  }
  return <Lobby client={client} v={v} onExit={leave} />;
}

/** The line a version without a game server shows. */
const Offline = () => (onlineAvailable() ? null : <p class="sb-warn">Online play isn't available in this version.</p>);
const ErrorLine = ({ err }: { err: string | null }) => (err ? <p class="sb-warn" role="alert">{err}</p> : null);

function NameBox({ o }: { o: OnlineState }) {
  return (
    <section class="sb-sec">
      <SbLabel>Your name</SbLabel>
      <input id="online-name" class="sb-input" aria-label="Your name" value={o.name} maxLength={NAME_MAX} placeholder="Your name" autocomplete="off" spellcheck={false}
        onInput={(e) => o.setName(fitName((e.target as HTMLInputElement).value))} />
    </section>
  );
}

/** PLAN-125: Quick Match's one-page set-up. A quick match starts as soon as its table is full, so its shopkeeper is
 *  chosen before looking (PLAN-102). */
function QuickSetup({ o }: { o: OnlineState }) {
  return (
    <SbPage title={wayName('quick')} sub={wayLine('quick')} onBack={o.exit} class="jo sb-quick"
      foot={<SbGo a="find" disabled={o.busy || !onlineAvailable()} onClick={o.findMatch}>{o.busy ? 'Looking…' : 'Find a match'}</SbGo>}>
      <Offline />
      <Deck value={o.avatar} onPick={o.setAvatar} name={o.name} onName={o.setName} />
      <section class="sb-sec">
        <SbLabel right={<button type="button" class="sb-link" data-a="public" onClick={() => { fx.tap(); o.setErr(null); o.setPage('public'); }}>Public rooms</button>}>The table</SbLabel>
        <TableRow count={o.stalls - 1}>
          {/* REP-140 B-12: any stall still empty when the wait ends gets a computer, so every one says so */}
          {Array.from({ length: o.stalls - 1 }, (_, i) => <OpenCard top={`Stall ${i + 2}`} big="?" small="Stranger or computer" />)}
        </TableRow>
      </section>
      <section class="sb-sec">
        <SbLabel>{`Table size · ${DEFAULT_LENGTH_NOTE}`}</SbLabel>
        <Seg label="Table size" items={QUICK_SIZES.map((q) => ({ v: q.stalls, word: q.word, small: q.small }))} value={o.stalls} onPick={o.setStalls} />
        <p class="sb-note">{QUICK_NOTE}</p>
      </section>
      <ErrorLine err={o.err} />
    </SbPage>
  );
}

/** PLAN-112: the public rooms still waiting for players, and a public room of your own. PLAN-125: reached from the
 *  Quick Match page, and its back arrow returns there. */
function PublicPage({ o, quick }: { o: OnlineState; quick: boolean }) {
  const available = onlineAvailable();
  return (
    <SbPage title="Public rooms" sub="Rooms waiting for players" onBack={quick ? () => { fx.tap(); o.setErr(null); o.setPage('quick'); } : o.exit} class="jo sb-public"
      foot={<SbGo a="open-public" disabled={o.busy || !available} onClick={() => o.create(true)}>{o.busy ? 'Opening…' : 'Open a public room'}</SbGo>}>
      <Offline />
      <NameBox o={o} />
      <PublicRooms disabled={o.busy || !available} onJoin={o.joinListed} />
      <p class="sb-note">{PUBLIC_WORDS} 2 to {MAX_SEATS} players. {PICK_LATER}</p>
      <ErrorLine err={o.err} />
    </SbPage>
  );
}

/** PLAN-125: the Private Room page: join a room with its code, or open one for friends. The table is drawn as the room
 *  will be (you, then open seats); nobody chooses a shopkeeper until everyone has joined. */
function RoomPage({ o }: { o: OnlineState }) {
  const available = onlineAvailable();
  const clean = normaliseCode(o.code);
  return (
    <SbPage title={wayName('room')} sub={wayLine('room')} onBack={o.exit} class="jo sb-room"
      foot={(
        <>
          <p class="sb-note">You get a link and a code to send to up to {MAX_SEATS - 1} friends, anywhere. {PICK_LATER}</p>
          <SbGo a="open-room" disabled={o.busy || !available} onClick={() => o.create(false)}>{o.busy ? 'Opening…' : 'Open a room'}</SbGo>
        </>
      )}>
      <Offline />
      <NameBox o={o} />
      <section class="sb-sec">
        <SbLabel>{`The table · 2 to ${MAX_SEATS} stalls`}</SbLabel>
        <TableRow count={4}>
          <SeatCard top="Host" title={o.name.trim() || 'You'} face="" look={worn()} band="y" small="You" big="Host" selected />
          {[2, 3, 4].map((n) => <OpenCard top={`Stall ${n}`} big="Open" small="Waiting for a friend" />)}
        </TableRow>
      </section>
      <section class="sb-sec">
        <SbLabel>Join with a code</SbLabel>
        <div class="sb-join">
          <input id="join-code" class="sb-input" aria-label="Room code" value={o.code} maxLength={CODE_LENGTH} autocapitalize="characters" autocomplete="off" spellcheck={false}
            placeholder="ABC123" onInput={(e) => o.setCode((e.target as HTMLInputElement).value.toUpperCase())}
            onKeyDown={(e) => { if (e.key === 'Enter') o.joinTyped(); }} />
          <button type="button" class="sb-btn" data-a="join" disabled={clean.length !== CODE_LENGTH || !available} onClick={o.joinTyped}>Join</button>
        </div>
        <p class="sb-note">{CODE_LENGTH} letters from a friend.</p>
      </section>
      <ErrorLine err={o.err} />
    </SbPage>
  );
}

/** PLAN-112: the public rooms still waiting for players, read again every few seconds while this list is on screen.
 *  Join joins by code, exactly as typing the code does. */
function PublicRooms({ disabled, onJoin }: { disabled: boolean; onJoin: (code: string) => void }) {
  const [rooms, setRooms] = useState<PublicRoom[] | null>(null);
  const [failed, setFailed] = useState(false);
  useEffect(() => {
    if (!onlineAvailable()) return;
    let alive = true;
    const load = () => {
      if (typeof document !== 'undefined' && document.visibilityState === 'hidden') return;
      publicRooms().then((r) => { if (alive) { setRooms(r); setFailed(false); } }).catch(() => { if (alive) setFailed(true); });
    };
    load();
    const t = window.setInterval(load, LIST_EVERY_MS);
    return () => { alive = false; window.clearInterval(t); };
  }, []);
  return (
    <section class="sb-sec public-rooms" aria-live="polite">
      <SbLabel>Waiting for players</SbLabel>
      {rooms === null ? (
        <p class="sb-note sb-first">{failed ? 'Could not load the public rooms. Trying again.' : 'Looking for rooms…'}</p>
      ) : rooms.length === 0 ? (
        <p class="sb-note sb-first">No public rooms are waiting right now. Open one, or go back for Quick Match.</p>
      ) : (
        <div class="pr-list">
          {rooms.map((r) => (
            <div class="pr-row" data-code={r.code}>
              <span class="pr-who"><b>{r.host}</b><small>{r.days} days · {waitedWords(r.waited)}</small></span>
              <span class="pr-n">{r.taken} of {MAX_SEATS}</span>
              <button class="sb-btn pr-join" disabled={disabled} aria-label={`Join ${r.host}'s room`} onClick={() => onJoin(r.code)}>Join</button>
            </div>
          ))}
        </div>
      )}
    </section>
  );
}
