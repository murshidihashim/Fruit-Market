// Online multiplayer screens: create or join a room, the lobby, choosing shopkeepers (PLAN-102), then the shared
// match. A quick match picks its shopkeeper before searching and starts at once. PLAN-112: a room can be public, and
// the online screen lists the public rooms still waiting for players; after a wait the host may start with computers;
// everyone in a room can send preset reactions (Reactions.tsx).
import { useEffect, useRef, useState } from 'preact/hooks';
import type { ComponentChildren } from 'preact';
import { createRoom, forgetMatch, inviteLink, OnlineClient, onlineAvailable, publicRooms, quickMatch, rememberMatch } from '../net/client';
import { track } from '../net/telemetry';
import { CUSTOMER_CARDS, RIVALS, lookOf } from '../engine/data';
import { CHARACTER_AVATARS, COMPUTERS_AFTER_MS, DEFAULT_CONFIG, MAX_SEATS, NAME_MAX, type PublicRoom, type PublicSeat, type RoomConfig, type RoomView } from '../net/protocol';
import { Face } from './art';
import { CharacterPick } from './CharacterPick';
import { fx } from './fx';
import { Game } from './Game';
import { loadName, saveName } from './store';
import { titleOf } from '../net/looks';
import { BackArrow, FramedFace, awningColour } from './stampCard';
import { StallSign, TradingCard } from './cards';
import { CardZoom } from './cardZoom';
import { crateUrl } from './marketArt';
import { LENGTHS, clock, lengthWord, waitLine } from './playMenu';
import { practiceQuestion, practiceRound, practiceVerdict } from './practice';
import { Awning } from './table';
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
function MyName({ name, host, onRename }: { name: string; host: boolean; onRename: (n: string) => void }) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(name);
  const box = useRef<HTMLInputElement>(null);
  useEffect(() => { if (editing) box.current?.focus(); }, [editing]);
  const done = () => { const n = draft.trim(); setEditing(false); if (n && n !== name) onRename(n); else setDraft(name); };
  if (!editing) {
    return (
      <span class="seat-name">
        {name} (you){host && <small class="host-tag">HOST</small>}
        <button type="button" class="seat-rename" onClick={() => { setDraft(name); setEditing(true); }}>Rename</button>
      </span>
    );
  }
  return (
    <span class="seat-name">
      <input ref={box} class="seat-edit" aria-label="Your name" value={draft} maxLength={NAME_MAX}
        onInput={(e) => setDraft((e.target as HTMLInputElement).value)} onBlur={done}
        onKeyDown={(e) => { if (e.key === 'Enter') (e.target as HTMLInputElement).blur(); }} />
    </span>
  );
}

/** `typed`: the code was typed in the Play menu (ON-15: "Room X", not an invitation). PLAN-113: `mode` is the Play
 *  menu's entry this screen was opened for (a private room, or the public rooms); `quick` is Quick match, which starts
 *  looking at once when a name is already saved, and whose wait offers `onComputer`: a game against the computer now. */
export function Online({ initialCode, typed, quick, mode = 'room', onExit, onComputer }: {
  initialCode?: string; typed?: boolean; quick?: boolean; mode?: 'room' | 'public'; onExit: () => void; onComputer?: (avatar: string) => void;
}) {
  const [client, setClient] = useState<OnlineClient | null>(null);
  const [name, setName] = useState(loadName());
  const nameRef = useRef<HTMLInputElement>(null);
  useEffect(() => { if (!name) nameRef.current?.focus(); }, []);
  // Quick match: the character you ask for when you enter; if the other player already has it, you get a free one.
  // A private room chooses shopkeepers after the host starts (PLAN-102); this is then only where the browsing starts.
  const [avatar, setAvatar] = useState(() => {
    try { const a = localStorage.getItem('fm.avatar'); return a && CHARACTER_AVATARS.includes(a) ? a : CHARACTER_AVATARS[0]; } catch { return CHARACTER_AVATARS[0]; }
  });
  // The room this screen was opened for (an invite link, or a code typed into the Play menu). PLAN-107 (ON-03): once
  // joining it has failed, Back forgets it and shows the online menu.
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

  // PLAN-112: a new room is private unless Public is chosen.
  const [pub, setPub] = useState(mode === 'public');
  const create = async (asPublic = pub) => {
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

  const findMatch = async () => {
    fx.tap();
    setBusy(true);
    track('online', 'quick');
    try { begin(await quickMatch()); } catch (e) { setErr((e as Error).message); } finally { setBusy(false); }
  };
  // PLAN-113: Quick match from the Play menu looks at once with your saved name and last shopkeeper. With no name yet,
  // or after "Change shopkeeper", this screen asks first.
  useEffect(() => { if (quick && !initialCode && loadName().trim() && onlineAvailable()) void findMatch(); }, []);

  const exit = () => {
    // ON-08: said before Home is drawn, so its "Back to room" ticket is there at once.
    if (client?.view?.status === 'playing' && !client.view.seats[client.view.you]?.left) rememberMatch(client.code);
    client?.stop();
    try { history.replaceState(null, '', location.pathname); } catch { /* ignore */ }
    onExit();
  };

  if (client) {
    const v = client.view;
    if (client.conn === 'failed') {
      const back = () => {
        fx.tap();
        setClient(null);
        setInvited(undefined);
        try { history.replaceState(null, '', location.pathname); } catch { /* ignore */ }
      };
      return (
        <Shell title="Online" onBack={exit}>
          <section class="panel center-text"><h3>Couldn't join</h3><p>{client.error}</p></section>
          <button class="btn primary wide" onClick={back}>Back</button>
        </Shell>
      );
    }
    if (!v) return <Shell title={quick ? 'Quick match' : 'Online'} onBack={exit}><div class="waiting-dots big-wait">{quick ? 'Looking for a stall' : `Connecting to room ${client.code}`}</div></Shell>;
    if (v.status === 'picking') return <Picking client={client} v={v} onExit={() => { client.leave(); exit(); }} />;
    if (v.game && v.status !== 'lobby') {
      return <Game key={v.game.config.seed} initial={v.game} online={client} onExit={exit} onChange={() => {}} onRematch={() => client.rematch()} />;
    }
    if (v.quick) {
      // PLAN-113: the wait. "Change shopkeeper" stops looking and comes back here to choose; the computer game leaves
      // the queue first.
      const stop = () => { client.leave(); client.stop(); setClient(null); try { history.replaceState(null, '', location.pathname); } catch { /* ignore */ } };
      return (
        <QuickWait v={v} onExit={() => { client.leave(); exit(); }}
          onChange={() => { fx.tap(); stop(); }}
          onComputer={onComputer && ((a) => { fx.tap(); client.leave(); exit(); onComputer(a); })} />
      );
    }
    return <Lobby client={client} v={v} onExit={() => { client.leave(); exit(); }} />;
  }

  const available = onlineAvailable();
  const you = (
    <section class="panel">
      <h3>Your name</h3>
      <input ref={nameRef} id="online-name" class="input" value={name} maxLength={14} placeholder="Your name" onInput={(e) => setName((e.target as HTMLInputElement).value)} />
    </section>
  );
  if (quick && !invited) {
    // A quick match starts the moment a stranger is found, so its shopkeeper is chosen before looking (PLAN-102).
    return (
      <Shell title="Quick match" onBack={exit}>
        {!available && <section class="panel"><p class="warn-text">Online play isn't available in this version.</p></section>}
        {you}
        <section class="panel">
          <h3>Your shopkeeper</h3>
          <p class="small muted">{waitLine(DEFAULT_CONFIG.days, '')} One perk for the whole game. If the other player has yours, you get another one.</p>
          <CharacterPick value={avatar} onPick={setAvatar} />
          <button class="btn primary big wide" disabled={busy || !available} onClick={findMatch}>{busy ? 'Looking…' : 'Find a player'}</button>
        </section>
        {err && <p class="error center-text">{err}</p>}
      </Shell>
    );
  }
  const listPanel = <PublicRooms disabled={busy || !available} onJoin={joinListed} onCreate={() => create(true)} />;
  const startPanel = (
    <section class="panel">
      <h3>Start a room</h3>
      <div class="seg small room-kind" role="group" aria-label="Who can join">
        <button class={pub ? '' : 'on'} aria-pressed={!pub} onClick={() => { fx.tap(); setPub(false); }}>Private<small>by link or code</small></button>
        <button class={pub ? 'on' : ''} aria-pressed={pub} onClick={() => { fx.tap(); setPub(true); }}>Public<small>anyone can join</small></button>
      </div>
      <p class="small muted">{pub ? PUBLIC_WORDS : 'You\'ll get a link to send to up to 5 friends, anywhere.'} 2 to 6 players. {PICK_LATER}</p>
      <button class="btn primary big wide" disabled={busy || !available} onClick={() => create()}>{busy ? 'Creating…' : 'Create room'}</button>
    </section>
  );
  return (
    <Shell title={invited ? 'Online' : mode === 'public' ? 'Public rooms' : 'Private room'} onBack={exit}>
      {!available && <section class="panel"><p class="warn-text">Online play isn't available in this version.</p></section>}
      {you}
      {invited ? (
        <section class="panel">
          <h3>{typed ? `Room ${invited}` : `Invited to room ${invited}`}</h3>
          <p class="small muted">{PICK_LATER}</p>
          <button class="btn primary big wide" onClick={() => begin(invited)}>Join the game</button>
        </section>
      ) : mode === 'public' ? <>{listPanel}{startPanel}</> : <>{startPanel}{listPanel}</>}
      {err && <p class="error center-text">{err}</p>}
    </Shell>
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

/** PLAN-112: the public rooms still waiting for players, read again every few seconds while this panel is on screen.
 *  Join joins by code, exactly as typing the code does. */
function PublicRooms({ disabled, onJoin, onCreate }: { disabled: boolean; onJoin: (code: string) => void; onCreate: () => void }) {
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
    <section class="panel public-rooms" aria-live="polite">
      <h3>Public rooms</h3>
      {rooms === null ? (
        <p class="small muted">{failed ? 'Could not load the public rooms. Trying again.' : 'Looking for rooms…'}</p>
      ) : rooms.length === 0 ? (
        <>
          <p class="small muted">No public rooms are waiting right now. Make one, or go back for Quick match.</p>
          <button class="btn wide" disabled={disabled} onClick={onCreate}>Create a public room</button>
        </>
      ) : (
        <div class="pr-list">
          {rooms.map((r) => (
            <div class="pr-row" data-code={r.code}>
              <span class="pr-who"><b>{r.host}</b><small>{r.days} days · {waitedWords(r.waited)}</small></span>
              <span class="pr-n">{r.taken} of {MAX_SEATS}</span>
              <button class="btn pr-join" disabled={disabled} aria-label={`Join ${r.host}'s room`} onClick={() => onJoin(r.code)}>Join</button>
            </div>
          ))}
        </div>
      )}
    </section>
  );
}

/** PLAN-113: the online screens' frame: a paper bar with a round back arrow and the title, in the Market Ticket look. */
function Shell({ title, onBack, children }: { title: string; onBack: () => void; children: ComponentChildren }) {
  return (
    <div class="page tk-page jo">
      <header class="topbar"><button class="icon-btn" onClick={onBack} aria-label="Back"><BackArrow /></button><div class="day"><b class="day-label">{title}</b></div><span /></header>
      <main class="scroll pad">{children}</main>
    </div>
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

/** PLAN-113: a seat's chip in the private lobby. */
export function seatChip(x: PublicSeat): string {
  if (x.left) return 'Left';
  if (!x.connected) return 'Away';
  const r = x.ready ? 'Ready' : 'Not ready';
  return x.host ? `Host · ${r}` : r;
}

/** An empty crate, as on the table: the stall has nothing in it yet. */
function EmptyCrate() {
  const w = 84, h = 30;
  const c = crateUrl('melon', w, h);
  const k = w / c.vw;
  return <span class="jl-crate" style={{ height: `${Math.round((h + 2) * k)}px` }} aria-hidden="true"><img src={c.url} width={w} alt="" style={{ marginTop: `${-Math.round(c.top * k)}px` }} /></span>;
}

/**
 * The private room (PLAN-113, the lobby as stalls): the code and the invite link on top; then each seat as a stall with
 * its awning (the player's colour and roof), face and name, and whether they are ready; computer stalls; and the empty
 * stalls, where the host can seat a computer. Then the game length, your look, Ready and Start.
 */
function Lobby({ client, v, onExit }: { client: OnlineClient; v: RoomView; onExit: () => void }) {
  const me = v.seats[v.you];
  const [wardrobe, setWardrobe] = useState(false);
  const host = !!me?.host;
  const link = inviteLink(v.code);
  const [copied, setCopied] = useState(false);
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
    try { await navigator.clipboard.writeText(link); setCopied(true); setTimeout(() => setCopied(false), 1800); } catch {
      const el = document.getElementById('invite-link') as HTMLInputElement | null;
      el?.select();
    }
  };
  const share = async () => {
    try { await navigator.share({ title: 'Fruit Market', text: `Join my Fruit Market game. Room ${v.code}`, url: link }); } catch { void copy(); }
  };

  if (wardrobe) return <Wardrobe onBack={() => setWardrobe(false)} onChange={(l) => client.wear(l)} />;

  const taken = v.seats.length + v.config.ai;
  return (
    <Shell title={`Room ${v.code}`} onBack={onExit}>
      {client.conn !== 'open' && <div class="net-strip bad">Reconnecting…</div>}
      <section class="jl-invite invite">
        <div class="jl-code">
          <span class="jl-lb">{inviteLine(openSeats)}</span>
          <div class="room-code" aria-label={`Room code ${v.code}`}>{v.code.split('').map((c) => <span>{c}</span>)}</div>
          <input id="invite-link" class="jl-link" readOnly value={link} aria-label="Invite link" onFocus={(e) => (e.target as HTMLInputElement).select()} />
        </div>
        <div class="jl-share">
          {canShare && <button class="jl-go" onClick={share}>Share link</button>}
          <button class={canShare ? 'jl-b' : 'jl-go'} onClick={copy}>{copied ? 'Copied' : 'Copy link'}</button>
        </div>
      </section>
      {v.public && <p class="small muted public-note">Public room. People looking for a game can see it and join.</p>}

      <div class="jl-head players-head">
        <h3>Stalls · {taken} of {MAX_SEATS}</h3>
        <span class="jl-len">{lengthWord(v.config.days)} · {v.config.days} days</span>
        <ReactButton onOpen={() => setReacting(true)} />
      </div>
      <div class="jl-seats">
        {v.seats.map((x) => {
          const mine = x.seat === v.you;
          const tap = showReactions && !mine;
          return (
            // PLAN-112: a tap on another person's stall offers to mute their reactions on this phone.
            <div class={`jl-seat seat-row ${mine ? 'me' : ''} ${tap ? 'can-mute' : ''} ${!x.connected || x.left ? 'off' : ''}`} data-seat={x.seat}
              {...(tap ? {
                role: 'button', tabIndex: 0, 'aria-expanded': muteOpen === x.seat, 'aria-label': `${x.name}: mute or unmute their reactions`,
                onClick: () => setMuteOpen(muteOpen === x.seat ? null : x.seat),
                onKeyDown: (e: KeyboardEvent) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); setMuteOpen(muteOpen === x.seat ? null : x.seat); } },
              } : {})}>
              {/* What each player has on (PLAN-086): the awning (colour and roof), the signboard frame, the looks and the title. */}
              <Awning p={x.seat} look={x.look} />
              <FramedFace who={x.avatar} size={44} look={x.look} />
              {mine ? <MyName name={x.name} host={false} onRename={(n) => client.rename(n)} /> : <span class="seat-name">{x.name}</span>}
              {titleOf(x.look) && <small class="sbk-seat-title">{titleOf(x.look)}</small>}
              <span class={`jl-chip ${x.ready && x.connected && !x.left ? 'yes' : ''} ${!x.connected || x.left ? 'away' : ''}`}>{seatChip(x)}</span>
              {showReactions && !mine && mutes.muted(x.seat, x.name) && <small class="muted-tag">Muted</small>}
              <EmptyCrate />
              {showReactions && muteOpen === x.seat && !mine && (
                <div class="seat-mute"><MuteButton on={mutes.muted(x.seat, x.name)} name={x.name} toggle={() => { mutes.toggle(x.seat, x.name); setMuteOpen(null); }} /></div>
              )}
            </div>
          );
        })}
        {/* Shopkeepers are chosen after the host starts (PLAN-102): until then each seat shows its frame and looks round
            a plain face, and computer stalls a plain badge. */}
        {Array.from({ length: v.config.ai }, (_, i) => (
          <div class="jl-seat ai-seat">
            <Awning p={v.seats.length + i} />
            <span class="jl-cface"><Face who="computer" size={40} /></span>
            <span class="seat-name">Computer {i + 1}</span>
            <span class="jl-chip yes">Ready</span>
            {host ? <button class="jl-add" onClick={() => { fx.tap(); set({ ai: v.config.ai - 1 }); }} aria-label={`Remove computer ${i + 1}`}>Remove</button> : <EmptyCrate />}
          </div>
        ))}
        {Array.from({ length: openSeats }, () => (
          <div class="jl-seat empty open-seat">
            <span class="jl-plus" aria-hidden="true">+</span>
            <b>Empty stall</b>
            <span class="jl-wait">Waiting for a friend</span>
            {host && <button class="jl-add" onClick={() => { fx.tap(); set({ ai: v.config.ai + 1 }); }}>+ Computer</button>}
          </div>
        ))}
      </div>
      {openSeats === 0 && <p class="small room-full">Room full · start when everyone is ready</p>}
      <p class="jl-say">{PICK_LATER}{openSeats > 0 ? (host ? ' An empty stall can go to a computer.' : ' The host can seat a computer in an empty stall.') : ''}</p>

      {host && (
        <section class="panel">
          <h3>Game length</h3>
          <div class="seg">
            {LENGTHS.map((l) => (
              <button class={v.config.days === l.days ? 'on' : ''} onClick={() => set({ days: l.days })}>{l.word}<small>{l.days} days</small></button>
            ))}
          </div>
        </section>
      )}
      <button class="btn wide jl-look" onClick={() => { fx.tap(); setWardrobe(true); }}>Your look<small>Colour, roof, frame and title. Everyone here sees it.</small></button>

      <button class={`btn big wide ${me?.ready ? '' : 'primary'}`} onClick={() => { fx.tap(); client.ready(!me?.ready); }}>{me?.ready ? "I'm not ready" : "I'm ready"}</button>
      {host && (
        <button class="btn primary big wide jl-start" disabled={!allReady} onClick={() => { fx.card(); client.start(); }}>
          {startLabel(v)}
        </button>
      )}
      {computers && (computers.ready
        ? <button class="btn big wide start-computers" disabled={!computers.othersReady} onClick={() => { fx.card(); track('online', 'computers'); client.startWithComputers(); }}>{computers.label}</button>
        : <p class="center-text muted small start-computers-wait">{computers.label}</p>)}
      {away.map((x) => (x.takeoverAt === undefined ? null
        : <p class="center-text small warn-text">{x.name} disconnected. Their seat is freed in {Math.max(0, Math.ceil((x.takeoverAt - now) / 1000))}s.</p>))}
      {!host && <p class="center-text muted small">The host starts the game when everyone is ready.</p>}
      <ReactionBubbles client={client} name={(seat) => v.seats[seat]?.name ?? ''} anchor={seatRow} onRow />
      {reacting && <ReactPicker client={client} onClose={() => setReacting(false)} />}
    </Shell>
  );
}

/**
 * PLAN-113: the Quick match wait. Your shopkeeper's card against an empty stall, how long you have waited, what the match
 * will be, a price practice while you wait, and three ways out: a game against the computer now, another shopkeeper,
 * or stop looking. The game starts the moment a stranger is found (the room sends it; this screen then gives way).
 */
function QuickWait({ v, onExit, onChange, onComputer }: { v: RoomView; onExit: () => void; onChange: () => void; onComputer?: (avatar: string) => void }) {
  const avatar = v.seats[v.you]?.avatar ?? '';
  const [since] = useState(() => Date.now());
  const now = useNow(true);
  return (
    <Shell title="Quick match" onBack={onExit}>
      <div class="jw-vs">
        {/* PLAN-116 (REP-133 B-08): the small cards here open whole on a tap */}
        {avatar
          ? <CardZoom class="jw-card" wide title={RIVALS.find((r) => r.avatar === avatar)?.name ?? 'Your shopkeeper'}><StallSign avatar={avatar} eager /></CardZoom>
          : <div class="jw-card"><Face who="computer" size={80} /></div>}
        <div class="jw-r"><span class="jw-vsw" aria-hidden="true">vs</span><div class="jw-empty" role="status"><span aria-hidden="true">?</span><small>Looking for a stall</small></div></div>
      </div>
      <div class="jw-t"><b aria-label={`Waited ${clock(now - since)}`}>{clock(now - since)}</b><span>{waitLine(v.config.days, avatar)}</span></div>
      <PricePractice mine={avatar} />
      <div class="jw-foot">
        {onComputer && avatar && <button class="btn primary big wide" onClick={() => onComputer(avatar)}>Play the computer now</button>}
        <button class="btn wide" onClick={onChange}>Change shopkeeper</button>
        <button class="btn wide" onClick={onExit}>Stop looking</button>
      </div>
    </Shell>
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

/** PLAN-112: where a seat's row is on the lobby or choosing screen, for its reaction's bubble. */
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
  if (left > 0) return { ready: false, othersReady, label: `In ${left}s you can start with computers in the empty seats.` };
  return { ready: true, othersReady, label: `Start with ${n} computer${n === 1 ? '' : 's'}` };
}

const keeperName = (avatar: string) => RIVALS.find((r) => r.avatar === avatar)?.name ?? 'Shopkeeper';

/** ON-07 (PLAN-110): the choosing step's line for a person who dropped out before confirming. */
export function pickAwayLine(x: PublicSeat, now: number): string {
  if (x.left) return `${x.name} left. A computer chooses for them.`;
  if (x.bot || x.takeoverAt === undefined) return `${x.name} disconnected. A computer chooses for them.`;
  return `${x.name} disconnected. A computer chooses for them in ${Math.max(0, Math.ceil((x.takeoverAt - now) / 1000))}s.`;
}

/** PLAN-102: after the host starts a private room, everyone chooses a shopkeeper at the same time. Looking at a card
 *  does not take it; "Choose" asks the room for it (first come), and it can be changed until "Confirm". The match
 *  begins when every person has confirmed; the computers then take shopkeepers from those left. */
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
  if (leaving) {
    return (
      <Shell title={`Room ${v.code}`} onBack={() => setLeaving(false)}>
        <section class="panel center-text">
          <h3>Leave the game?</h3>
          <p>A computer will play for you, and you cannot come back to this game.</p>
        </section>
        <button class="btn primary big wide" onClick={() => { fx.tap(); setLeaving(false); }}>Stay</button>
        <button class="btn big wide" onClick={onExit}>Leave</button>
      </Shell>
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
    <Shell title={`Room ${v.code}`} onBack={() => { fx.tap(); setLeaving(true); }}>
      {client.conn !== 'open' && <div class="net-strip bad">Reconnecting…</div>}
      <section class="panel">
        <h3>Choose your shopkeeper</h3>
        <p class="small muted">Pick one nobody has taken. Each shopkeeper has one perk for the whole game.</p>
        <CharacterPick value={shown} taken={taken} chosen={mine} fixed={done} onPick={(a) => { setErr(null); setLook(a); }} />
        {done
          ? <p class="center-text small pick-wait">{left ? (away.length ? 'Confirmed.' : 'Confirmed. Waiting for the others.') : 'Confirmed. The game is starting.'}</p>
          : shown === mine
            ? <button class="btn primary big wide pick-confirm" onClick={confirm}>Confirm {keeperName(mine)}</button>
            : <button class="btn primary big wide pick-choose" disabled={!!takenBy} onClick={choose}>{takenBy ? `Taken by ${takenBy}` : `Choose ${keeperName(shown)}`}</button>}
        {!done && mine && shown !== mine && <p class="center-text muted small">You have {keeperName(mine)}. You can change until you confirm.</p>}
        {away.map((x) => <p class="center-text small warn-text pick-away">{pickAwayLine(x, now)}</p>)}
        {err && <p class="error center-text">{err}</p>}
      </section>

      <section class="panel">
        <div class="players-head"><h3>Players</h3><ReactButton onOpen={() => setReacting(true)} /></div>
        <div class="seat-list">
          {v.seats.map((x) => (
            <div class={`seat-row ${x.seat === v.you ? 'me' : ''}`} data-seat={x.seat}>
              <i class="sbk-seat-awn" style={{ background: awningColour(x.look, x.seat) }} aria-hidden="true" />
              <FramedFace who={x.avatar} size={32} look={x.look} />
              <span class="seat-name">{x.name}{x.seat === v.you && ' (you)'}</span>
              {x.avatar && <small class="sbk-seat-title">{keeperName(x.avatar)}</small>}
              <span class={`dot ${x.connected ? 'on' : 'off'}`} title={x.connected ? 'Online' : 'Offline'} />
              <span class={`ready-tag ${x.confirmed ? 'yes' : ''}`}>{x.left ? 'left' : x.confirmed ? 'CONFIRMED' : x.connected ? 'choosing' : 'away'}</span>
            </div>
          ))}
          {Array.from({ length: v.config.ai }, (_, i) => <div class="seat-row ai"><Face who="computer" size={34} /><span class="seat-name">Computer {i + 1}</span></div>)}
        </div>
        {v.config.ai > 0 && <p class="small muted">The computers take shopkeepers from those left.</p>}
      </section>
      <ReactionBubbles client={client} name={(seat) => v.seats[seat]?.name ?? ''} anchor={seatRow} onRow />
      {reacting && <ReactPicker client={client} onClose={() => setReacting(false)} />}
    </Shell>
  );
}
