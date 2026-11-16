// Online multiplayer screens: create or join a private room, the lobby, choosing shopkeepers (PLAN-102), then the
// shared match. A quick match picks its shopkeeper before searching and starts at once.
import { useEffect, useRef, useState } from 'preact/hooks';
import { createRoom, inviteLink, OnlineClient, onlineAvailable, quickMatch } from '../net/client';
import { track } from '../net/telemetry';
import { RIVALS } from '../engine/data';
import { CHARACTER_AVATARS, CODE_LENGTH, MAX_SEATS, NAME_MAX, normaliseCode, type RoomConfig, type RoomView } from '../net/protocol';
import { Face } from './art';
import { CharacterPick } from './CharacterPick';
import { fx } from './fx';
import { Game } from './Game';
import { loadName, saveName } from './store';
import { titleOf } from '../net/looks';
import { FramedFace, awningColour } from './stampCard';
import { syncLooks, worn } from './looks';
import { syncTiers } from './progress';
import { Wardrobe } from './Wardrobe';

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

export function Online({ initialCode, quick, onExit }: { initialCode?: string; quick?: boolean; onExit: () => void }) {
  const [client, setClient] = useState<OnlineClient | null>(null);
  const [name, setName] = useState(loadName());
  const nameRef = useRef<HTMLInputElement>(null);
  useEffect(() => { if (!name) nameRef.current?.focus(); }, []);
  // Quick match: the character you ask for when you enter; if the other player already has it, you get a free one.
  // A private room chooses shopkeepers after the host starts (PLAN-102); this is then only where the browsing starts.
  const [avatar, setAvatar] = useState(() => {
    try { const a = localStorage.getItem('fm.avatar'); return a && CHARACTER_AVATARS.includes(a) ? a : CHARACTER_AVATARS[0]; } catch { return CHARACTER_AVATARS[0]; }
  });
  const [code, setCode] = useState(initialCode ?? '');
  // The room this screen was opened for (an invite link, or a code typed into the friend menu). PLAN-107 (ON-03): once
  // joining it has failed, Back forgets it and shows the online menu.
  const [invited, setInvited] = useState(initialCode);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  useClient(client);

  useEffect(() => () => client?.stop(), [client]);

  // Refreshing or reopening the link with a seat token on this device goes straight back in.
  useEffect(() => {
    if (!initialCode) return;
    try { if (localStorage.getItem(`fm.room.${initialCode}`)) begin(initialCode); } catch { /* ignore */ }
  }, []);

  const begin = (c: string) => {
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

  const create = async () => {
    fx.tap();
    setBusy(true);
    track('online', 'create');
    try { begin(await createRoom()); } catch (e) { setErr((e as Error).message); } finally { setBusy(false); }
  };

  const findMatch = async () => {
    fx.tap();
    setBusy(true);
    track('online', 'quick');
    try { begin(await quickMatch()); } catch (e) { setErr((e as Error).message); } finally { setBusy(false); }
  };

  const exit = () => {
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
        setCode('');
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
    if (!v) return <Shell title="Online" onBack={exit}><div class="waiting-dots big-wait">Connecting to room {client.code}</div></Shell>;
    if (v.status === 'picking') return <Picking client={client} v={v} onExit={() => { client.leave(); exit(); }} />;
    if (v.game && v.status !== 'lobby') {
      return <Game key={v.game.config.seed} initial={v.game} online={client} onExit={exit} onChange={() => {}} onRematch={() => client.rematch()} />;
    }
    return <Lobby client={client} v={v} onExit={() => { client.leave(); exit(); }} />;
  }

  const available = onlineAvailable();
  const quickPanel = (
    <section class="panel">
      <h3>Quick match</h3>
      <p class="small muted">Play a stranger who's looking for a game right now. Always 2 players. For more, start a private game.</p>
      <h3>Your shopkeeper</h3>
      <p class="small muted">For quick match. One perk for the whole game. If the other player has yours, you get another one.</p>
      <CharacterPick value={avatar} onPick={setAvatar} />
      <button class={`btn ${quick ? 'primary' : ''} big wide`} disabled={busy || !available} onClick={findMatch}>{busy ? 'Looking…' : 'Find a player'}</button>
    </section>
  );
  const privatePanels = (
    <>
      <section class="panel">
        <h3>Start a private game</h3>
        <p class="small muted">You'll get a link to send to up to 5 friends, anywhere. 2 to 6 players. {PICK_LATER}</p>
        <button class="btn primary big wide" disabled={busy || !available} onClick={create}>{busy ? 'Creating…' : 'Create room'}</button>
      </section>
      <section class="panel">
        <h3>Join with a code</h3>
        <div class="join-row">
          <input id="online-code" class="input code-input" value={code} placeholder="ABC123" maxLength={CODE_LENGTH} autocapitalize="characters" onInput={(e) => setCode(normaliseCode((e.target as HTMLInputElement).value))} />
          <button class="btn" disabled={code.length !== CODE_LENGTH || !available} onClick={() => { fx.tap(); begin(code); }}>Join</button>
        </div>
      </section>
    </>
  );
  return (
    <Shell title="Play online" onBack={exit}>
      {!available && <section class="panel"><p class="warn-text">Online play isn't available in this version.</p></section>}
      <section class="panel">
        <h3>You</h3>
        <input ref={nameRef} id="online-name" class="input" value={name} maxLength={14} placeholder="Your name" onInput={(e) => setName((e.target as HTMLInputElement).value)} />
      </section>
      {invited ? (
        <section class="panel">
          <h3>Invited to room {invited}</h3>
          <p class="small muted">{PICK_LATER}</p>
          <button class="btn primary big wide" onClick={() => begin(invited)}>Join the game</button>
        </section>
      ) : (
        // A quick match starts the moment a stranger is found, so its shopkeeper is chosen here (PLAN-102). Coming from
        // Create a room, the private game comes first and the quick match (with its picker) after it.
        quick ? <>{quickPanel}{privatePanels}</> : <>{privatePanels}{quickPanel}</>
      )}
      {err && <p class="error center-text">{err}</p>}
    </Shell>
  );
}

/** PLAN-102: in a private room, shopkeepers are chosen once everyone is in. */
const PICK_LATER = 'Everyone chooses a shopkeeper when the host starts.';

function Shell({ title, onBack, children }: { title: string; onBack: () => void; children: any }) {
  return (
    <div class="page">
      <header class="topbar"><button class="icon-btn" onClick={onBack} aria-label="Back">←</button><div class="day"><b class="day-label">{title}</b></div></header>
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
  // Computer shops take seats too, so they count toward the 4.
  const openSeats = Math.max(0, MAX_SEATS - v.seats.length - v.config.ai);
  const friendsAllowed = Math.max(1, MAX_SEATS - v.config.ai - 1);
  const set = (patch: Partial<RoomConfig>) => client.config({ ...v.config, ...patch });

  const copy = async () => {
    try { await navigator.clipboard.writeText(link); setCopied(true); setTimeout(() => setCopied(false), 1800); } catch {
      const el = document.getElementById('invite-link') as HTMLInputElement | null;
      el?.select();
    }
  };
  const share = async () => {
    try { await navigator.share({ title: 'Fruit Market', text: `Join my Fruit Market game. Room ${v.code}`, url: link }); } catch { void copy(); }
  };

  if (v.quick) {
    return (
      <Shell title="Quick match" onBack={onExit}>
        <section class="panel center-text">
          <h3>Looking for a player</h3>
          <div class="waiting-dots big-wait">Waiting for someone to join</div>
          <p class="small muted">The game starts as soon as another player taps Find a player. Tap ← to stop looking.</p>
        </section>
      </Shell>
    );
  }

  if (wardrobe) return <Wardrobe onBack={() => setWardrobe(false)} onChange={(l) => client.wear(l)} />;

  return (
    <Shell title={`Room ${v.code}`} onBack={onExit}>
      {client.conn !== 'open' && <div class="net-strip bad">Reconnecting…</div>}
      <section class="panel invite">
        <h3>{friendsAllowed === 1 ? 'Invite a friend' : `Invite friends (up to ${friendsAllowed})`}</h3>
        <div class="room-code" aria-label="Room code">{v.code.split('').map((c) => <span>{c}</span>)}</div>
        <input id="invite-link" class="input" readOnly value={link} onFocus={(e) => (e.target as HTMLInputElement).select()} />
        <div class="row2">
          <button class="btn" onClick={copy}>{copied ? 'Copied' : 'Copy link'}</button>
          {typeof navigator !== 'undefined' && 'share' in navigator ? <button class="btn" onClick={share}>Share</button> : <span />}
        </div>
      </section>

      <section class="panel">
        <h3>Players {v.seats.length + v.config.ai} of {MAX_SEATS}</h3>
        <div class="seat-list">
          {v.seats.map((x) => (
            <div class={`seat-row ${x.seat === v.you ? 'me' : ''}`}>
              {/* What each player has on (PLAN-086): the awning colour, the signboard frame, the looks and the title. */}
              <i class="sbk-seat-awn" style={{ background: awningColour(x.look, x.seat) }} aria-hidden="true" />
              <FramedFace who={x.avatar} size={32} look={x.look} />
              {x.seat === v.you
                ? <MyName name={x.name} host={x.host} onRename={(n) => client.rename(n)} />
                : <span class="seat-name">{x.name}{x.host && <small class="host-tag">HOST</small>}</span>}
              {titleOf(x.look) && <small class="sbk-seat-title">{titleOf(x.look)}</small>}
              <span class={`dot ${x.connected ? 'on' : 'off'}`} title={x.connected ? 'Online' : 'Offline'} />
              <span class={`ready-tag ${x.ready ? 'yes' : ''}`}>{x.ready ? 'READY' : 'not ready'}</span>
            </div>
          ))}
          {/* Shopkeepers are chosen after the host starts (PLAN-102): until then each seat shows its frame and looks round
              a plain face, and computer stalls a plain badge. */}
          {Array.from({ length: v.config.ai }, (_, i) => <div class="seat-row ai"><Face who="computer" size={34} /><span class="seat-name">Computer {i + 1}</span><span class="ready-tag yes">READY</span></div>)}
          {Array.from({ length: openSeats }, () => <div class="seat-row ghost open-seat">Open seat · send the link</div>)}
        </div>
        {openSeats === 0 && <p class="small room-full">Room full · start when everyone is ready</p>}
      </section>

      <section class="panel">
        <h3>Your look</h3>
        <p class="small muted">Your colour, looks, frame and title. Everyone in the room sees what you pick.</p>
        <button class="btn wide" onClick={() => { fx.tap(); setWardrobe(true); }}>Open the Wardrobe</button>
      </section>

      <section class="panel">
        <h3>Game settings {!host && <span class="muted small">(host decides)</span>}</h3>
        <div class="seg">
          {([[8, 'Quick'], [10, 'Standard'], [14, 'Long']] as const).map(([d, l]) => (
            <button class={v.config.days === d ? 'on' : ''} disabled={!host} onClick={() => set({ days: d })}>{l}<small>{d} days</small></button>
          ))}
        </div>
        <div class="seg small">
          {[0, 1, 2, 3, 4].map((n) => (
            <button class={v.config.ai === n ? 'on' : ''} disabled={!host || v.seats.length + n > MAX_SEATS} onClick={() => set({ ai: n })}>{n === 0 ? 'None' : `+${n} computer`}</button>
          ))}
        </div>
      </section>

      <button class={`btn big wide ${me?.ready ? '' : 'primary'}`} onClick={() => { fx.tap(); client.ready(!me?.ready); }}>{me?.ready ? "I'm not ready" : "I'm ready"}</button>
      {host && (
        <button class="btn primary big wide" disabled={!allReady} onClick={() => { fx.card(); client.start(); }}>
          {startLabel(v)}
        </button>
      )}
      {away.map((x) => (x.takeoverAt === undefined ? null
        : <p class="center-text small warn-text">{x.name} disconnected. Their seat is freed in {Math.max(0, Math.ceil((x.takeoverAt - now) / 1000))}s.</p>))}
      {!host && <p class="center-text muted small">The host starts the game when everyone is ready.</p>}
      <p class="center-text muted small">{PICK_LATER}</p>
    </Shell>
  );
}

const keeperName = (avatar: string) => RIVALS.find((r) => r.avatar === avatar)?.name ?? 'Shopkeeper';

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

  const choose = () => {
    fx.tap();
    setErr(null);
    try { localStorage.setItem('fm.avatar', look); } catch { /* ignore */ }
    client.character(look);
  };
  const confirm = () => { fx.card(); setErr(null); client.confirm(); };

  return (
    <Shell title={`Room ${v.code}`} onBack={onExit}>
      {client.conn !== 'open' && <div class="net-strip bad">Reconnecting…</div>}
      <section class="panel">
        <h3>Choose your shopkeeper</h3>
        <p class="small muted">Pick one nobody has taken. Each shopkeeper has one perk for the whole game.</p>
        <CharacterPick value={shown} taken={taken} chosen={mine} fixed={done} onPick={(a) => { setErr(null); setLook(a); }} />
        {done
          ? <p class="center-text small pick-wait">{left ? 'Confirmed. Waiting for the others.' : 'Confirmed. The game is starting.'}</p>
          : shown === mine
            ? <button class="btn primary big wide pick-confirm" onClick={confirm}>Confirm {keeperName(mine)}</button>
            : <button class="btn primary big wide pick-choose" disabled={!!takenBy} onClick={choose}>{takenBy ? `Taken by ${takenBy}` : `Choose ${keeperName(shown)}`}</button>}
        {!done && mine && shown !== mine && <p class="center-text muted small">You have {keeperName(mine)}. You can change until you confirm.</p>}
        {err && <p class="error center-text">{err}</p>}
      </section>

      <section class="panel">
        <h3>Players</h3>
        <div class="seat-list">
          {v.seats.map((x) => (
            <div class={`seat-row ${x.seat === v.you ? 'me' : ''}`}>
              <i class="sbk-seat-awn" style={{ background: awningColour(x.look, x.seat) }} aria-hidden="true" />
              <FramedFace who={x.avatar} size={32} look={x.look} />
              <span class="seat-name">{x.name}{x.seat === v.you && ' (you)'}</span>
              {x.avatar && <small class="sbk-seat-title">{keeperName(x.avatar)}</small>}
              <span class={`dot ${x.connected ? 'on' : 'off'}`} title={x.connected ? 'Online' : 'Offline'} />
              <span class={`ready-tag ${x.confirmed ? 'yes' : ''}`}>{x.confirmed ? 'CONFIRMED' : 'choosing'}</span>
            </div>
          ))}
          {Array.from({ length: v.config.ai }, (_, i) => <div class="seat-row ai"><Face who="computer" size={34} /><span class="seat-name">Computer {i + 1}</span></div>)}
        </div>
        {v.config.ai > 0 && <p class="small muted">The computers take shopkeepers from those left.</p>}
      </section>
    </Shell>
  );
}
