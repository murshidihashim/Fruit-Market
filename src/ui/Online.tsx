// Online multiplayer screens: create or join a room, the lobby, choosing shopkeepers (PLAN-102), then the shared
// match. A quick match picks its shopkeeper before searching and starts as soon as its table is full. PLAN-112: a room
// can be public, and the Public rooms page lists the public rooms still waiting for players; after a wait the host may
// start with computers; everyone in a room can send preset reactions (Reactions.tsx).
// PLAN-125 (DEC-133), design B: every page here is drawn as the set-up is (Setup.tsx): Quick Match's set-up (the deck,
// the "?" seats, the table size) and its wait, the Private Room page (open a room, join with a code), the room (its code,
// the seats as small cards, the length) and the pick screen (the deck; the seats' status as small cards).
import { useEffect, useRef, useState } from 'preact/hooks';
import { createRoom, forgetMatch, inviteLink, OnlineClient, onlineAvailable, publicRooms, quickMatch, rememberMatch } from '../net/client';
import { track } from '../net/telemetry';
import { CUSTOMER_CARDS, lookOf } from '../engine/data';
import {
  CHARACTER_AVATARS, CODE_LENGTH, COMPUTERS_AFTER_MS, MAX_SEATS, NAME_MAX, normaliseCode, type PublicRoom, type PublicSeat, type RoomConfig,
  type RoomView,
} from '../net/protocol';
import { fx } from './fx';
import { NOT_COPIED, copyText } from './share';
import { Game } from './Game';
import { fitName, loadName, saveName } from './store';
import { StallSign, TradingCard } from './cards';
import { CardZoom } from './cardZoom';
import {
  DEFAULT_LENGTH_NOTE, QUICK_NOTE, QUICK_SIZES, QUICK_STALLS, clock, foundLine, isQuickStalls, lengthWord, quickOf, waitLine, wayLine, wayName,
  type QuickStalls,
} from './playMenu';
import { practiceQuestion, practiceRound, practiceVerdict } from './practice';
import { Deck, LengthSeg, OpenCard, SbGo, SbLabel, SbPage, SeatCard, Seg, TableRow, keeperName } from './Setup';
import './journey-online.css';
import { syncLooks, worn } from './looks';
import { syncTiers } from './progress';
import { Wardrobe } from './Wardrobe';
import { ReactButton, ReactionBubbles, ReactPicker, reactionsOn, useMutes } from './Reactions';

function useClient(client: OnlineClient | null) {
  const [, force] = useState(0);
  useEffect(() => {
    if (!client) return;
    const off = client.subscribe(() => force((n) => n + 1));
    // The client starts connecting before this effect runs (later still in a background tab), so the
    // room may already have answered: redraw once now, or the screen stays on "Connecting…".
    force((n) => n + 1);
    return off;
  }, [client]);
}

/** The time now, ticking once a second while `on` (a countdown is on screen). */
function useNow(on: boolean): number {
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    if (!on) return;
    setNow(Date.now());
    const t = window.setInterval(() => setNow(Date.now()), 1000);
    return () => window.clearInterval(t);
  }, [on]);
  return now;
}

/** Your own name in the lobby: shown as text; tap Rename to change it. The new name is sent when you finish typing. */
function MyName({ name, onRename }: { name: string; onRename: (n: string) => void }) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(name);
  const box = useRef<HTMLInputElement>(null);
  useEffect(() => { if (editing) box.current?.focus(); }, [editing]);
  const done = () => { const n = draft.trim(); setEditing(false); if (n && n !== name) onRename(n); else setDraft(name); };
  if (!editing) {
    return (
      <span class="seat-name">
        {name} (you)
        <button type="button" class="seat-rename" onClick={() => { setDraft(name); setEditing(true); }}>Rename</button>
      </span>
    );
  }
  return (
    <span class="seat-name">
      <input ref={box} class="seat-edit" aria-label="Your name" value={draft} maxLength={NAME_MAX}
        onInput={(e) => setDraft(fitName((e.target as HTMLInputElement).value))} onBlur={done}
        onKeyDown={(e) => { if (e.key === 'Enter') (e.target as HTMLInputElement).blur(); }} />
    </span>
  );
}

/** PLAN-125: the Quick Match table size chosen last on this phone. */
const QUICK_KEY = 'fm.quick.stalls';

/** `typed`: the code was typed (ON-15: "Room X", not an invitation). PLAN-113: `mode` is the way this screen was
 *  opened for (a private room, or the public rooms); `quick` is Quick Match, whose wait offers `onComputer`: a game
 *  against the computer now, at the table size the wait was for. PLAN-125 (DEC-133): Quick Match opens on its set-up
 *  page (your shopkeeper, the table size, Find a match), which links to the Public rooms; the Private Room page opens a
 *  room or joins one by its code. */
export function Online({ initialCode, typed, quick, mode = 'room', onExit, onComputer }: {
  initialCode?: string; typed?: boolean; quick?: boolean; mode?: 'room' | 'public'; onExit: () => void; onComputer?: (avatar: string, stalls: QuickStalls) => void;
}) {
  const [client, setClient] = useState<OnlineClient | null>(null);
  // REP-140 B-17: the name box holds the name as the room will keep it (store.ts fitName), so nothing is cut unseen
  const [name, setName] = useState(() => fitName(loadName()));
  // Quick Match: the character you ask for when you enter; if another player already has it, you get a free one.
  // A private room chooses shopkeepers after everyone has joined (PLAN-102).
  const [avatar, setAvatar] = useState(() => {
    try { const a = localStorage.getItem('fm.avatar'); return a && CHARACTER_AVATARS.includes(a) ? a : CHARACTER_AVATARS[0]; } catch { return CHARACTER_AVATARS[0]; }
  });
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

  // Refreshing or reopening the link with a seat token on this device goes straight back in.
  useEffect(() => {
    if (!initialCode) return;
    try { if (localStorage.getItem(`fm.room.${initialCode}`)) begin(initialCode); } catch { /* ignore */ }
  }, []);

  const begin = (c: string) => {
    forgetMatch();
    const nm = name.trim() || 'Player';
    saveName(name.trim());
    try { localStorage.setItem('fm.avatar', avatar); } catch { /* ignore */ }
    setErr(null);
    // A player who opens an invitation never passes Home: what they have earned (and the first rank's title and frame,
    // which are everyone's) is brought up to date here, before the room is told what they have on.
    syncTiers();
    syncLooks();
    setClient(new OnlineClient(c, nm, avatar, worn()));
    try { history.replaceState(null, '', `?room=${c}`); } catch { /* ignore */ }
  };

  // PLAN-112: a room is private unless it is opened from the Public rooms page.
  const create = async (asPublic: boolean) => {
    fx.tap();
    setBusy(true);
    track('online', asPublic ? 'public' : 'create');
    try { begin(await createRoom(asPublic)); } catch (e) { setErr((e as Error).message); } finally { setBusy(false); }
  };
  const joinListed = (c: string) => {
    fx.tap();
    track('online', 'list_join');
    begin(c);
  };
  const clean = normaliseCode(code);
  const joinTyped = () => {
    if (clean.length !== CODE_LENGTH) return;
    fx.tap();
    begin(clean);
  };

  const findMatch = async () => {
    fx.tap();
    setBusy(true);
    track('online', 'quick');
    try { localStorage.setItem(QUICK_KEY, String(stalls)); } catch { /* no storage: 2 stalls next time */ }
    // PLAN-125: the table size goes with the request (client.ts quickMatch(stalls)). It is called through a type that
    // takes the size either way, so this screen also works with a client that does not take one yet (2 stalls then).
    const ask: (n?: QuickStalls) => Promise<string> = quickMatch;
    try { begin(await ask(stalls)); } catch (e) { setErr((e as Error).message); } finally { setBusy(false); }
  };

  const exit = () => {
    // ON-08: said before Home is drawn, so its "Back to room" ticket is there at once.
    if (client?.view?.status === 'playing' && !client.view.seats[client.view.you]?.left) rememberMatch(client.code);
    client?.stop();
    try { history.replaceState(null, '', location.pathname); } catch { /* ignore */ }
    onExit();
  };

  if (client) {
    const v = client.view;
    const title = quick ? wayName('quick') : v?.public ? 'Public room' : wayName('room');
    if (client.conn === 'failed') {
      const back = () => {
        fx.tap();
        setClient(null);
        setInvited(undefined);
        try { history.replaceState(null, '', location.pathname); } catch { /* ignore */ }
      };
      return (
        <SbPage title={title} sub="Couldn't join" onBack={exit} class="jo" foot={<SbGo onClick={back}>Back</SbGo>}>
          <section class="sb-sec"><h3 class="sb-h3">Couldn't join</h3><p class="sb-warn" role="alert">{client.error}</p></section>
        </SbPage>
      );
    }
    if (!v) {
      return (
        <SbPage title={title} sub={quick ? 'Finding strangers' : `Room ${client.code}`} onBack={exit} class="jo">
          <div class="waiting-dots big-wait">{quick ? 'Looking for a stall' : `Connecting to room ${client.code}`}</div>
        </SbPage>
      );
    }
    if (v.status === 'picking') return <Picking client={client} v={v} onExit={() => { client.leave(); exit(); }} />;
    if (v.game && v.status !== 'lobby') {
      return <Game key={v.game.config.seed} initial={v.game} online={client} onExit={exit} onChange={() => {}} onRematch={() => client.rematch()} />;
    }
    if (v.quick) {
      // PLAN-113: the wait. Cancel stops looking and comes back to the set-up; the computer game leaves the queue first.
      const stop = () => { client.leave(); client.stop(); setClient(null); try { history.replaceState(null, '', location.pathname); } catch { /* ignore */ } };
      return (
        <QuickWait v={v} stalls={stalls} onExit={() => { client.leave(); exit(); }}
          onCancel={() => { fx.tap(); stop(); }}
          onComputer={onComputer && ((a, n) => { fx.tap(); client.leave(); exit(); onComputer(a, n); })} />
      );
    }
    return <Lobby client={client} v={v} onExit={() => { client.leave(); exit(); }} />;
  }

  const available = onlineAvailable();
  const offline = !available && <p class="sb-warn">Online play isn't available in this version.</p>;
  const nameBox = (
    <section class="sb-sec">
      <SbLabel>Your name</SbLabel>
      <input id="online-name" class="sb-input" aria-label="Your name" value={name} maxLength={NAME_MAX} placeholder="Your name" autocomplete="off" spellcheck={false}
        onInput={(e) => setName(fitName((e.target as HTMLInputElement).value))} />
    </section>
  );
  const error = err && <p class="sb-warn" role="alert">{err}</p>;

  if (page === 'quick' && !invited) {
    // PLAN-125: Quick Match's one-page set-up. A quick match starts as soon as its table is full, so its shopkeeper is
    // chosen before looking (PLAN-102).
    return (
      <SbPage title={wayName('quick')} sub={wayLine('quick')} onBack={exit} class="jo sb-quick"
        foot={<SbGo a="find" disabled={busy || !available} onClick={findMatch}>{busy ? 'Looking…' : 'Find a match'}</SbGo>}>
        {offline}
        <Deck value={avatar} onPick={setAvatar} name={name} onName={setName} />
        <section class="sb-sec">
          <SbLabel right={<button type="button" class="sb-link" data-a="public" onClick={() => { fx.tap(); setErr(null); setPage('public'); }}>Public rooms</button>}>The table</SbLabel>
          <TableRow count={stalls - 1}>
            {/* REP-140 B-12: any stall still empty when the wait ends gets a computer, so every one says so */}
            {Array.from({ length: stalls - 1 }, (_, i) => <OpenCard top={`Stall ${i + 2}`} big="?" small="Stranger or computer" />)}
          </TableRow>
        </section>
        <section class="sb-sec">
          <SbLabel>{`Table size · ${DEFAULT_LENGTH_NOTE}`}</SbLabel>
          <Seg label="Table size" items={QUICK_SIZES.map((q) => ({ v: q.stalls, word: q.word, small: q.small }))} value={stalls} onPick={setStalls} />
          <p class="sb-note">{QUICK_NOTE}</p>
        </section>
        {error}
      </SbPage>
    );
  }
  if (page === 'public' && !invited) {
    // PLAN-112: the public rooms still waiting for players, and a public room of your own. PLAN-125: reached from the
    // Quick Match page, and its back arrow returns there.
    return (
      <SbPage title="Public rooms" sub="Rooms waiting for players" onBack={quick ? () => { fx.tap(); setErr(null); setPage('quick'); } : exit} class="jo sb-public"
        foot={<SbGo a="open-public" disabled={busy || !available} onClick={() => create(true)}>{busy ? 'Opening…' : 'Open a public room'}</SbGo>}>
        {offline}
        {nameBox}
        <PublicRooms disabled={busy || !available} onJoin={joinListed} />
        <p class="sb-note">{PUBLIC_WORDS} 2 to {MAX_SEATS} players. {PICK_LATER}</p>
        {error}
      </SbPage>
    );
  }
  if (invited) {
    return (
      <SbPage title={wayName('room')} sub={typed ? `Room ${invited}` : `Invited to room ${invited}`} onBack={exit} class="jo sb-room"
        foot={<SbGo a="join-room" disabled={!available} onClick={() => begin(invited)}>Join the game</SbGo>}>
        {offline}
        {nameBox}
        <p class="sb-note">{PICK_LATER}</p>
        {error}
      </SbPage>
    );
  }
  // PLAN-125: the Private Room page: join a room with its code, or open one for friends. The table is drawn as the room
  // will be (you, then open seats); nobody chooses a shopkeeper until everyone has joined.
  return (
    <SbPage title={wayName('room')} sub={wayLine('room')} onBack={exit} class="jo sb-room"
      foot={(
        <>
          <p class="sb-note">You get a link and a code to send to up to {MAX_SEATS - 1} friends, anywhere. {PICK_LATER}</p>
          <SbGo a="open-room" disabled={busy || !available} onClick={() => create(false)}>{busy ? 'Opening…' : 'Open a room'}</SbGo>
        </>
      )}>
      {offline}
      {nameBox}
      <section class="sb-sec">
        <SbLabel>{`The table · 2 to ${MAX_SEATS} stalls`}</SbLabel>
        <TableRow count={4}>
          <SeatCard top="Host" title={name.trim() || 'You'} face="" look={worn()} band="y" small="You" big="Host" selected />
          {[2, 3, 4].map((n) => <OpenCard top={`Stall ${n}`} big="Open" small="Waiting for a friend" />)}
        </TableRow>
      </section>
      <section class="sb-sec">
        <SbLabel>Join with a code</SbLabel>
        <div class="sb-join">
          <input id="join-code" class="sb-input" aria-label="Room code" value={code} maxLength={CODE_LENGTH} autocapitalize="characters" autocomplete="off" spellcheck={false}
            placeholder="ABC123" onInput={(e) => setCode((e.target as HTMLInputElement).value.toUpperCase())}
            onKeyDown={(e) => { if (e.key === 'Enter') joinTyped(); }} />
          <button type="button" class="sb-btn" data-a="join" disabled={clean.length !== CODE_LENGTH || !available} onClick={joinTyped}>Join</button>
        </div>
        <p class="sb-note">{CODE_LENGTH} letters from a friend.</p>
      </section>
      {error}
    </SbPage>
  );
}

/** PLAN-102: in a private room, shopkeepers are chosen once everyone is in. */
const PICK_LATER = 'Everyone chooses a shopkeeper when the host starts.';
/** PLAN-112: what making a public room means, said before it is made. */
const PUBLIC_WORDS = 'Your room and your name show in Public rooms until the game starts. Anyone can join.';
/** How often the Public rooms list is read while it is on screen. */
const LIST_EVERY_MS = 5000;

/** PLAN-112: "Waiting 3 min" for a public room in the list. */
export function waitedWords(ms: number): string {
  const min = Math.floor(ms / 60_000);
  return min < 1 ? 'Just opened' : `Waiting ${min} min`;
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

/** The host's start button in a private lobby. PLAN-107 (ON-05): never "everyone to be ready" while a seat is
 *  disconnected: it names who the room is waiting for. */
export function startLabel(v: RoomView): string {
  const away = v.seats.filter((x) => !x.connected);
  if (v.seats.length >= 2 && !away.length && v.seats.every((x) => x.ready)) return 'Start the game';
  if (v.seats.length < 2) return 'Waiting for a player…';
  return away.length ? `Waiting for ${away.map((x) => x.name).join(' and ')} to come back` : 'Waiting for everyone to be ready…';
}

/** PLAN-116 (REP-133 B-05): the invite box's line counts the stalls still free (people and computers both take one). */
export function inviteLine(free: number): string {
  if (free <= 0) return 'All stalls taken';
  return free === 1 ? 'Invite 1 more friend' : `Invite up to ${free} friends`;
}

/** PLAN-113: a seat's state in the private lobby (the words a screen reader hears for its card). */
export function seatChip(x: PublicSeat): string {
  if (x.left) return 'Left';
  if (!x.connected) return 'Away';
  const r = x.ready ? 'Ready' : 'Not ready';
  return x.host ? `Host · ${r}` : r;
}

/** PLAN-125: the big word on a person's card in the room ("Friend · Joined", "You · Ready"). */
export function seatBand(x: PublicSeat): string {
  if (x.left) return 'Left';
  if (!x.connected) return 'Away';
  return x.ready ? 'Ready' : 'Joined';
}

/**
 * The private room (PLAN-113; PLAN-125 in design B): the room code with Share link; your name; the table, each seat as
 * a small card (you, the friends with a blue band, the computers with their level, the open seats dashed, where the
 * host can seat a computer); then the game length, your look, Ready and the host's Start. No shopkeepers yet: they are
 * chosen once everyone has joined (PLAN-102), so each person's card shows their frame and looks round a plain face.
 */
function Lobby({ client, v, onExit }: { client: OnlineClient; v: RoomView; onExit: () => void }) {
  const me = v.seats[v.you];
  const [wardrobe, setWardrobe] = useState(false);
  const host = !!me?.host;
  const link = inviteLink(v.code);
  // REP-140 B-18: the copy button says when the link was copied, and when it could not be.
  const [copied, setCopied] = useState<boolean | null>(null);
  const allReady = v.seats.length >= 2 && v.seats.every((x) => x.ready && x.connected);
  // PLAN-107 (ON-05): a seat whose person closed the tab is freed after the grace period (the room sends when); until
  // then a line counts down to it, and the start button names who the room is waiting for.
  const away = v.seats.filter((x) => !x.connected);
  const now = useNow(away.some((x) => x.takeoverAt !== undefined));
  // Computer shops take seats too, so they count toward the six.
  const openSeats = Math.max(0, MAX_SEATS - v.seats.length - v.config.ai);
  const set = (patch: Partial<RoomConfig>) => client.config({ ...v.config, ...patch });
  // PLAN-112: once the room has waited a minute with seats free, the host may start with computers in them.
  const computers = computersOffer(v, client.openedAt, useNow(host && openSeats > 0 && !v.quick));
  const [reacting, setReacting] = useState(false);
  const [muteOpen, setMuteOpen] = useState<number | null>(null);
  const mutes = useMutes(v.code);
  const showReactions = reactionsOn();
  const canShare = typeof navigator !== 'undefined' && 'share' in navigator;

  const copy = async () => {
    const ok = await copyText(link);
    setCopied(ok);
    if (ok) setTimeout(() => setCopied(null), 1800);
    else (document.getElementById('invite-link') as HTMLInputElement | null)?.select();
  };
  const share = async () => {
    try { await navigator.share({ title: 'Fruit Market', text: `Join my Fruit Market game. Room ${v.code}`, url: link }); } catch { void copy(); }
  };

  if (wardrobe) return <Wardrobe onBack={() => setWardrobe(false)} onChange={(l) => client.wear(l)} />;

  const taken = v.seats.length + v.config.ai;
  const muting = muteOpen !== null ? v.seats.find((x) => x.seat === muteOpen) : undefined;
  return (
    <SbPage title={v.public ? 'Public room' : wayName('room')} sub={v.public ? 'Anyone can join' : wayLine('room')} onBack={onExit} class="jo sb-lobby"
      foot={(
        <>
          {/* Ready first; the host's Start beside it (it names who the room is waiting for) */}
          <div class={`sb-go-row ${host ? 'two' : ''}`}>
            <button type="button" class={`${me?.ready ? 'sb-btn' : 'sb-go sb-go-s'} jl-ready`} onClick={() => { fx.tap(); client.ready(!me?.ready); }}>{me?.ready ? "I'm not ready" : "I'm ready"}</button>
            {host && <SbGo class="jl-start" disabled={!allReady} onClick={() => { fx.card(); client.start(); }}>{startLabel(v)}</SbGo>}
          </div>
          {computers && (computers.ready
            ? <button type="button" class="sb-btn start-computers" disabled={!computers.othersReady} onClick={() => { fx.card(); track('online', 'computers'); client.startWithComputers(); }}>{computers.label}</button>
            : <p class="sb-note center-text start-computers-wait">{computers.label}</p>)}
          {away.map((x) => (x.takeoverAt === undefined ? null
            : <p class="sb-warn center-text">{x.name} disconnected. Their stall is freed in {Math.max(0, Math.ceil((x.takeoverAt - now) / 1000))}s.</p>))}
          {!host && <p class="sb-note center-text">The host starts the game when everyone is ready.</p>}
        </>
      )}>
      {client.conn !== 'open' && <div class="net-strip bad">Reconnecting…</div>}
      <section class="sb-code invite">
        <div>
          <SbLabel>Room code</SbLabel>
          <div class="room-code" aria-label={`Room code ${v.code}`}>{v.code.split('').map((c) => <span>{c}</span>)}</div>
          <small class="sb-osm sb-inv">{inviteLine(openSeats)}</small>
        </div>
        <div class="sb-share">
          {canShare && <button type="button" class="go" onClick={share}>Share link</button>}
          <button type="button" class={canShare ? '' : 'go'} onClick={copy}>{copied ? 'Copied' : copied === false ? NOT_COPIED : 'Copy link'}</button>
        </div>
        <input id="invite-link" class="sb-sr" readOnly tabIndex={-1} value={link} aria-label="Invite link" onFocus={(e) => (e.target as HTMLInputElement).select()} />
      </section>
      {v.public && <p class="sb-note public-note">Public room. People looking for a game can see it and join.</p>}
      {me && (
        <div class="sb-me">
          <MyName name={me.name} onRename={(n) => client.rename(n)} />
          <button type="button" class="sb-btn jl-look" aria-label="Your look: colour, roof, frame and title. Everyone here sees it." onClick={() => { fx.tap(); setWardrobe(true); }}>Your look</button>
        </div>
      )}

      <section class="sb-sec">
        <SbLabel right={<ReactButton onOpen={() => setReacting(true)} />}><span class="jl-stalls">{`The table · ${taken} of ${MAX_SEATS}`}</span></SbLabel>
        <TableRow count={MAX_SEATS} wrap>
          {v.seats.map((x) => {
            const mine = x.seat === v.you;
            const tap = showReactions && !mine;
            const muted = showReactions && !mine && mutes.muted(x.seat, x.name);
            // PLAN-112: a tap on another person's card offers to mute their reactions on this phone.
            return (
              <SeatCard seat={x.seat} class={`seat-row ${mine ? 'me' : ''} ${!x.connected || x.left ? 'off' : ''}`} selected={mine}
                top={x.host ? 'Host' : `Stall ${x.seat + 1}`} title={x.name} face={x.avatar} look={x.look}
                band={mine ? 'y' : 'b'} small={mine ? 'You' : muted ? 'Friend · Muted' : 'Friend'} big={seatBand(x)}
                label={`${x.name}${mine ? ' (you)' : ''}: ${seatChip(x)}${tap ? '. Mute or unmute their reactions' : ''}`}
                onClick={tap ? () => setMuteOpen(muteOpen === x.seat ? null : x.seat) : undefined} pressed={tap ? muteOpen === x.seat : undefined} />
            );
          })}
          {Array.from({ length: v.config.ai }, (_, i) => (
            <SeatCard class="ai-seat" top={`Stall ${v.seats.length + i + 1}`} title={`Computer ${i + 1}`} face="computer" band="y" small="Computer" big="Normal"
              label={`Computer ${i + 1}, Normal`} onRemove={host ? () => set({ ai: v.config.ai - 1 }) : undefined} removeLabel={`Remove computer ${i + 1}`} />
          ))}
          {Array.from({ length: openSeats }, (_, i) => (
            <OpenCard class={`open-seat ${host ? 'host' : ''}`} top={`Stall ${taken + i + 1}`} big="Open" small="Waiting for a friend">
              {host && <span class="sb-two"><button type="button" class="sb-add" aria-label="Put a computer at this stall" onClick={() => { fx.tap(); set({ ai: v.config.ai + 1 }); }}>+ Computer</button></span>}
            </OpenCard>
          ))}
        </TableRow>
        {muting && showReactions && (
          <div class="seat-mute"><MuteButton on={mutes.muted(muting.seat, muting.name)} name={muting.name} toggle={() => { mutes.toggle(muting.seat, muting.name); setMuteOpen(null); }} /></div>
        )}
        {openSeats === 0 && <p class="sb-note room-full">Room full · start when everyone is ready</p>}
        <p class="sb-note jl-say">{PICK_LATER}{openSeats > 0 && !host ? ' The host can put a computer at an open stall.' : ''}</p>
      </section>

      {host
        ? <LengthSeg days={v.config.days} onDays={(d) => set({ days: d })} />
        : <section class="sb-sec"><SbLabel>Game length</SbLabel><p class="sb-note sb-first">{lengthWord(v.config.days)} · {v.config.days} days</p></section>}
      <ReactionBubbles client={client} name={(seat) => v.seats[seat]?.name ?? ''} anchor={seatRow} onRow />
      {reacting && <ReactPicker client={client} onClose={() => setReacting(false)} />}
    </SbPage>
  );
}

/**
 * PLAN-113: the Quick Match wait. PLAN-125 (design B): your shopkeeper's card; how many are found and, when the room
 * says, when computers fill the empty seats; the table, the strangers found as cards and the seats still looked for;
 * then two ways out (a game against the computer now, or Cancel back to the set-up) and a price practice while you
 * wait. The game starts as soon as the table is full (the room sends it; this screen then gives way).
 */
export function QuickWait({ v, stalls: chosen, onExit, onCancel, onComputer }: {
  v: RoomView; stalls: QuickStalls; onExit: () => void; onCancel: () => void; onComputer?: (avatar: string, stalls: QuickStalls) => void;
}) {
  const avatar = v.seats[v.you]?.avatar ?? '';
  const q = quickOf(v.quick);
  // A room that does not say its size is a 2-stall quick match (a server without table sizes).
  const stalls = q?.stalls ?? chosen;
  const [since] = useState(() => Date.now());
  const now = useNow(true);
  const others = v.seats.filter((x) => x.seat !== v.you);
  const left = q?.fillAt !== undefined ? Math.max(0, q.fillAt - now) : undefined;
  return (
    <SbPage title={wayName('quick')} sub="Finding strangers" onBack={onExit} class="jo sb-wait" after={<PricePractice mine={avatar} />}
      foot={(
        <>
          {onComputer && avatar && <SbGo a="computer-now" class="sb-go-s" onClick={() => onComputer(avatar, stalls)}>Play the computer now</SbGo>}
          <button type="button" class="sb-btn" data-a="cancel" onClick={onCancel}>Cancel</button>
        </>
      )}>
      <div class="sb-me-card">
        {/* PLAN-116 (REP-133 B-08): the card opens whole on a tap */}
        {avatar && <CardZoom class="jw-card" wide title={keeperName(avatar)}><StallSign avatar={avatar} selected eager /></CardZoom>}
      </div>
      <p class="sb-found" role="status"><b>{foundLine(v.seats.length, stalls, left)}</b></p>
      <section class="sb-sec">
        {/* REP-140 B-12: one clock. The found line counts down to the computers when the room says when; only a room that
            does not say shows how long you have waited. */}
        <SbLabel right={left === undefined ? <span class="sb-clock" aria-label={`Waited ${clock(now - since)}`}>{clock(now - since)}</span> : undefined}>The table</SbLabel>
        <TableRow count={stalls - 1}>
          {others.slice(0, stalls - 1).map((x, k) => (
            <SeatCard top={`Stall ${k + 2}`} title={keeperName(x.avatar)} avatar={x.avatar || undefined} face={x.avatar} look={x.look} band="b" small="Found" big={x.name}
              label={`Stall ${k + 2}: ${x.name}, ${keeperName(x.avatar)}`} />
          ))}
          {Array.from({ length: Math.max(0, stalls - 1 - others.length) }, (_, i) => (
            <OpenCard top={`Stall ${others.length + i + 2}`} big="?" small="Looking for a stall" />
          ))}
        </TableRow>
        <p class="sb-note">{waitLine(v.config.days, avatar, stalls)}</p>
      </section>
    </SbPage>
  );
}

/** PLAN-113: the practice price while waiting (practice.ts): a real customer card, a rival's price and three prices to
 *  try, with the reason after each try. On this phone only. */
function PricePractice({ mine }: { mine: string }) {
  const [n, setN] = useState(() => Math.floor(Math.random() * 60));
  const [tried, setTried] = useState<number | null>(null);
  const r = practiceRound(n, mine);
  const card = CUSTOMER_CARDS.find((c) => c.name === r.who);
  const said = tried === null ? null : practiceVerdict(r, tried);
  return (
    <section class="jw-pp" aria-label="Price practice">
      <span class="jl-lb">While you wait · price practice</span>
      <div class="jw-pp-in">
        {card && <CardZoom class="jw-pp-card" title={lookOf(card.name).title}><TradingCard who={card.name} wants={card.wants} eager /></CardZoom>}
        <div class="jw-pp-r">
          <p class="jw-q">{practiceQuestion(r)}</p>
          <div class="jw-opts" role="group" aria-label="Your price">
            {r.options.map((p) => (
              <button class={`${tried === p ? 'on' : ''} ${tried !== null && p === r.answer ? 'best' : ''}`} aria-pressed={tried === p}
                onClick={() => { fx.tap(); setTried(p); }}>${p}</button>
            ))}
          </div>
          <p class={`jw-said ${said?.right ? 'yes' : ''}`} role="status">{said?.text ?? 'The customer buys from the cheapest offer that is fresh enough.'}</p>
          {said && <button class="btn jw-next" onClick={() => { fx.tap(); setTried(null); setN(n + 1); }}>Another customer</button>}
        </div>
      </div>
    </section>
  );
}

/** PLAN-112: where a seat's card is on the room or pick screen, for its reaction's bubble. */
const seatRow = (seat: number) => (typeof document === 'undefined' ? null : document.querySelector(`.seat-row[data-seat="${seat}"]`));

/** PLAN-112: mute or unmute a person's reactions, on this phone, for this room. */
function MuteButton({ on, name, toggle }: { on: boolean; name: string; toggle: () => void }) {
  return (
    <button type="button" class={`rx-mute ${on ? 'on' : ''}`} aria-pressed={on}
      onClick={(e) => { e.stopPropagation(); fx.tap(); toggle(); }}>{on ? `Unmute ${name}'s reactions` : `Mute ${name}'s reactions`}</button>
  );
}

/**
 * PLAN-112: the host's offer to start with computers in the empty seats, once the room has waited COMPUTERS_AFTER_MS
 * since it opened (`openedAt`, on this phone's clock). Null when there is no offer to make: not the host, a quick
 * match, or no seat free. Before the wait is over, the words say how long is left.
 */
export function computersOffer(v: RoomView, openedAt: number, now: number): { ready: boolean; othersReady: boolean; label: string } | null {
  const me = v.seats[v.you];
  const free = MAX_SEATS - v.seats.length - v.config.ai;
  if (!me?.host || v.quick || v.status !== 'lobby' || free <= 0) return null;
  const left = Math.ceil((openedAt + COMPUTERS_AFTER_MS - now) / 1000);
  const n = MAX_SEATS - v.seats.length;
  const othersReady = v.seats.every((x) => x.seat === v.you || (x.ready && x.connected));
  // REP-140 B-13: "+ Computer" puts a computer at an empty stall at any time; the wait is only for starting at once with
  // a computer at every empty stall (the room server's rule, even for a host alone).
  if (left > 0) return { ready: false, othersReady, label: `Add computers now with + Computer, or in ${left}s start with a computer at every empty stall.` };
  return { ready: true, othersReady, label: `Start with ${n} computer${n === 1 ? '' : 's'}` };
}

/** ON-07 (PLAN-110): the choosing step's line for a person who dropped out before confirming. */
export function pickAwayLine(x: PublicSeat, now: number): string {
  if (x.left) return `${x.name} left. A computer chooses for them.`;
  if (x.bot || x.takeoverAt === undefined) return `${x.name} disconnected. A computer chooses for them.`;
  return `${x.name} disconnected. A computer chooses for them in ${Math.max(0, Math.ceil((x.takeoverAt - now) / 1000))}s.`;
}

/** PLAN-125: a seat's state on the pick screen. */
export function pickState(x: PublicSeat): string {
  return x.left ? 'Left' : x.confirmed ? 'Confirmed' : x.connected ? 'Choosing' : 'Away';
}

/** PLAN-102: after the host starts a private room, everyone chooses a shopkeeper at the same time. Looking at a card
 *  does not take it; "Choose" asks the room for it (first come), and it can be changed until "Confirm". The match
 *  begins when every person has confirmed; the computers then take shopkeepers from those left. PLAN-125 (design B):
 *  the deck, your card in the middle and the cards others took marked "Taken by …"; every seat's state as a small card. */
function Picking({ client, v, onExit }: { client: OnlineClient; v: RoomView; onExit: () => void }) {
  const me = v.seats[v.you];
  const mine = me?.avatar ?? '';
  const taken: Record<string, string> = Object.fromEntries(v.seats.filter((x) => x.seat !== v.you && x.avatar).map((x) => [x.avatar, x.name]));
  // Browsing starts at your own pick, or the shopkeeper you used last, or the first one free.
  const [look, setLook] = useState(() => {
    let last = '';
    try { last = localStorage.getItem('fm.avatar') ?? ''; } catch { /* ignore */ }
    return mine || (CHARACTER_AVATARS.includes(last) && !taken[last] ? last : CHARACTER_AVATARS.find((a) => !taken[a]) ?? CHARACTER_AVATARS[0]);
  });
  const [err, setErr] = useState<string | null>(null);
  useEffect(() => client.onError((m) => setErr(m)), [client]);
  const done = !!me?.confirmed;
  const shown = done ? mine : look;
  const takenBy = taken[shown];
  const left = v.seats.filter((x) => !x.confirmed).length;
  // ON-07 (PLAN-110): a person who dropped out while choosing: the room hands their seat to a computer after the grace
  // period, and says when; the screen counts down to it instead of waiting in silence.
  const away = v.seats.filter((x) => x.seat !== v.you && !x.connected && !x.confirmed);
  const now = useNow(away.some((x) => x.takeoverAt !== undefined && !x.bot));
  // ON-09: the back arrow here leaves the game for good, so it asks first.
  const [leaving, setLeaving] = useState(false);
  const [reacting, setReacting] = useState(false);
  const title = v.public ? 'Public room' : wayName('room');
  if (leaving) {
    return (
      <SbPage title={title} sub={`Room ${v.code}`} onBack={() => setLeaving(false)} class="jo"
        foot={<><SbGo onClick={() => { fx.tap(); setLeaving(false); }}>Stay</SbGo><button type="button" class="sb-btn" onClick={onExit}>Leave</button></>}>
        <section class="sb-sec">
          <h3 class="sb-h3">Leave the game?</h3>
          <p class="sb-note">A computer will play for you, and you cannot come back to this game.</p>
        </section>
      </SbPage>
    );
  }

  const choose = () => {
    fx.tap();
    setErr(null);
    try { localStorage.setItem('fm.avatar', look); } catch { /* ignore */ }
    client.character(look);
  };
  const confirm = () => { fx.card(); setErr(null); client.confirm(); };

  return (
    <SbPage title={title} sub="Choose your shopkeeper" onBack={() => { fx.tap(); setLeaving(true); }} class="jo sb-pick"
      foot={done
        ? <p class="sb-found pick-wait">{left ? (away.length ? 'Confirmed.' : 'Confirmed. Waiting for the others.') : 'Confirmed. The game is starting.'}</p>
        : shown === mine
          ? <SbGo class="pick-confirm" onClick={confirm}>{`Confirm ${keeperName(mine)}`}</SbGo>
          : <SbGo class="pick-choose" disabled={!!takenBy} onClick={choose}>{takenBy ? `Taken by ${takenBy}` : `Choose ${keeperName(shown)}`}</SbGo>}>
      {client.conn !== 'open' && <div class="net-strip bad">Reconnecting…</div>}
      <Deck value={shown} taken={taken} chosen={mine} fixed={done} onPick={(a) => { setErr(null); setLook(a); }} name={me?.name ?? ''} />
      {!done && mine && shown !== mine && <p class="sb-note center-text">You have {keeperName(mine)}. You can change until you confirm.</p>}
      <section class="sb-sec">
        <SbLabel right={<ReactButton onOpen={() => setReacting(true)} />}>The table</SbLabel>
        <TableRow count={v.seats.length + v.config.ai} min={3} wrapOver={4}>
          {v.seats.map((x) => (
            <SeatCard seat={x.seat} class={`seat-row ${x.seat === v.you ? 'me' : ''} ${!x.connected || x.left ? 'off' : ''}`} selected={x.seat === v.you}
              top={x.seat === v.you ? 'You' : `Stall ${x.seat + 1}`} title={x.avatar ? keeperName(x.avatar) : x.name} avatar={x.avatar || undefined} face={x.avatar} look={x.look}
              band={x.confirmed ? 'y' : 'b'} small={x.name} big={pickState(x)} label={`${x.name}${x.seat === v.you ? ' (you)' : ''}: ${x.avatar ? keeperName(x.avatar) : 'no shopkeeper yet'}, ${pickState(x)}`} />
          ))}
          {Array.from({ length: v.config.ai }, (_, i) => (
            <SeatCard top={`Stall ${v.seats.length + i + 1}`} title={`Computer ${i + 1}`} face="computer" band="k" small="Computer" big="Normal" label={`Computer ${i + 1}`} />
          ))}
        </TableRow>
        {v.config.ai > 0 && <p class="sb-note">The computers take shopkeepers from those left.</p>}
      </section>
      {away.map((x) => <p class="sb-warn center-text pick-away">{pickAwayLine(x, now)}</p>)}
      {err && <p class="sb-warn center-text" role="alert">{err}</p>}
      <ReactionBubbles client={client} name={(seat) => v.seats[seat]?.name ?? ''} anchor={seatRow} onRow />
      {reacting && <ReactPicker client={client} onClose={() => setReacting(false)} />}
    </SbPage>
  );
}
