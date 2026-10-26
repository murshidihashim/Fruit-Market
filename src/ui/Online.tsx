// Online multiplayer screens: create or join a private room, the lobby, then the shared match.
import { useEffect, useState } from 'preact/hooks';
import { createRoom, inviteLink, OnlineClient, onlineAvailable, quickMatch } from '../net/client';
import { track } from '../net/telemetry';
import { CODE_LENGTH, HUMAN_AVATARS, MAX_SEATS, normaliseCode, type RoomConfig, type RoomView } from '../net/protocol';
import { Face } from './art';
import { fx } from './fx';
import { Game } from './Game';
import { loadName, saveName } from './store';

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

export function Online({ initialCode, quick, onExit }: { initialCode?: string; quick?: boolean; onExit: () => void }) {
  const [client, setClient] = useState<OnlineClient | null>(null);
  const [name, setName] = useState(loadName());
  const [avatar, setAvatar] = useState(() => {
    try { return localStorage.getItem('fm.avatar') || HUMAN_AVATARS[0]; } catch { return HUMAN_AVATARS[0]; }
  });
  const [code, setCode] = useState(initialCode ?? '');
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
    saveName(nm);
    try { localStorage.setItem('fm.avatar', avatar); } catch { /* ignore */ }
    setErr(null);
    setClient(new OnlineClient(c, nm, avatar));
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
      return (
        <Shell title="Online" onBack={exit}>
          <section class="panel center-text"><h3>Couldn't join</h3><p>{client.error}</p></section>
          <button class="btn primary wide" onClick={() => { setClient(null); setCode(''); }}>Back</button>
        </Shell>
      );
    }
    if (!v) return <Shell title="Online" onBack={exit}><div class="waiting-dots big-wait">Connecting to room {client.code}</div></Shell>;
    if (v.game && v.status !== 'lobby') {
      return <Game key={v.game.config.seed} initial={v.game} online={client} onExit={exit} onChange={() => {}} onRematch={() => client.rematch()} />;
    }
    return <Lobby client={client} v={v} onExit={() => { client.leave(); exit(); }} />;
  }

  const available = onlineAvailable();
  return (
    <Shell title="Online multiplayer" onBack={exit}>
      {!available && <section class="panel"><p class="warn-text">Online play needs the web version or a configured server. See ONLINE.md.</p></section>}
      <section class="panel">
        <h3>You</h3>
        <input id="online-name" class="input" value={name} maxLength={14} placeholder="Your name" onInput={(e) => setName((e.target as HTMLInputElement).value)} />
        <div class="avatar-pick">
          {HUMAN_AVATARS.map((a) => (
            <button type="button" class={a === avatar ? 'on' : ''} onClick={() => setAvatar(a)} aria-label="Choose shopkeeper"><Face who={a} size={40} /></button>
          ))}
        </div>
      </section>
      {initialCode ? (
        <section class="panel">
          <h3>Invited to room {initialCode}</h3>
          <button class="btn primary big wide" onClick={() => begin(initialCode)}>Join the game</button>
        </section>
      ) : (
        <>
          <section class="panel">
            <h3>Quick match</h3>
            <p class="small muted">Play a stranger who's looking for a game right now. Always 2 players; for 3 or 4, start a private game below.</p>
            <button class={`btn ${quick ? 'primary' : ''} big wide`} disabled={busy || !available} onClick={findMatch}>{busy ? 'Looking…' : 'Find an opponent'}</button>
          </section>
          <section class="panel">
            <h3>Start a private game</h3>
            <p class="small muted">You'll get a link to send to up to 3 friends, anywhere. 2 to 4 players.</p>
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
      )}
      {err && <p class="error center-text">{err}</p>}
    </Shell>
  );
}

function Shell({ title, onBack, children }: { title: string; onBack: () => void; children: any }) {
  return (
    <div class="page">
      <header class="topbar"><button class="icon-btn" onClick={onBack} aria-label="Back">←</button><div class="day"><b class="day-label">{title}</b></div></header>
      <main class="scroll pad">{children}</main>
    </div>
  );
}

function Lobby({ client, v, onExit }: { client: OnlineClient; v: RoomView; onExit: () => void }) {
  const me = v.seats[v.you];
  const host = !!me?.host;
  const link = inviteLink(v.code);
  const [copied, setCopied] = useState(false);
  const allReady = v.seats.length >= 2 && v.seats.every((x) => x.ready && x.connected);
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
    try { await navigator.share({ title: 'Fruit Market', text: `Join my Fruit Market game! Room ${v.code}`, url: link }); } catch { void copy(); }
  };

  if (v.quick) {
    return (
      <Shell title="Quick match" onBack={onExit}>
        <section class="panel center-text">
          <h3>Looking for an opponent</h3>
          <div class="waiting-dots big-wait">Waiting for someone to join</div>
          <p class="small muted">The match starts as soon as another player taps Find an opponent. Tap ← to stop looking.</p>
        </section>
      </Shell>
    );
  }

  return (
    <Shell title={`Room ${v.code}`} onBack={onExit}>
      {client.conn !== 'open' && <div class="net-strip bad">Reconnecting…</div>}
      <section class="panel invite">
        <h3>{friendsAllowed === 1 ? 'Invite a friend' : `Invite friends (up to ${friendsAllowed})`}</h3>
        <div class="room-code" aria-label="Room code">{v.code.split('').map((c) => <span>{c}</span>)}</div>
        <input id="invite-link" class="input" readOnly value={link} onFocus={(e) => (e.target as HTMLInputElement).select()} />
        <div class="row2">
          <button class="btn" onClick={copy}>{copied ? 'Copied!' : 'Copy link'}</button>
          {typeof navigator !== 'undefined' && 'share' in navigator ? <button class="btn" onClick={share}>Share</button> : <span />}
        </div>
      </section>

      <section class="panel">
        <h3>Players {v.seats.length + v.config.ai} of {MAX_SEATS}</h3>
        <div class="seat-list">
          {v.seats.map((x) => (
            <div class={`seat-row ${x.seat === v.you ? 'me' : ''}`}>
              <Face who={x.avatar} size={34} />
              <span class="seat-name">{x.name}{x.seat === v.you ? ' (you)' : ''}{x.host && <small class="host-tag">HOST</small>}</span>
              <span class={`dot ${x.connected ? 'on' : 'off'}`} title={x.connected ? 'Online' : 'Offline'} />
              <span class={`ready-tag ${x.ready ? 'yes' : ''}`}>{x.ready ? 'READY' : 'not ready'}</span>
            </div>
          ))}
          {Array.from({ length: v.config.ai }, (_, i) => <div class="seat-row ai"><span class="seat-name">Computer rival {i + 1}</span><span class="ready-tag yes">READY</span></div>)}
          {Array.from({ length: openSeats }, () => <div class="seat-row ghost open-seat">Open seat · send the link</div>)}
        </div>
        {openSeats === 0 && <p class="small room-full">Room full · start when everyone is ready</p>}
      </section>

      <section class="panel">
        <h3>Match settings {!host && <span class="muted small">(host decides)</span>}</h3>
        <div class="seg">
          {([[8, 'Quick'], [10, 'Standard'], [14, 'Long']] as const).map(([d, l]) => (
            <button class={v.config.days === d ? 'on' : ''} disabled={!host} onClick={() => set({ days: d })}>{l}<small>{d} days</small></button>
          ))}
        </div>
        <div class="seg small">
          {[0, 1, 2].map((n) => (
            <button class={v.config.ai === n ? 'on' : ''} disabled={!host || v.seats.length + n > MAX_SEATS} onClick={() => set({ ai: n })}>{n === 0 ? 'No AI' : `+${n} AI`}</button>
          ))}
        </div>
      </section>

      <button class={`btn big wide ${me?.ready ? '' : 'primary'}`} onClick={() => { fx.tap(); client.ready(!me?.ready); }}>{me?.ready ? "I'm not ready" : "I'm ready"}</button>
      {host && (
        <button class="btn primary big wide" disabled={!allReady} onClick={() => { fx.card(); client.start(); }}>
          {allReady ? 'Start the match' : v.seats.length < 2 ? 'Waiting for a player…' : 'Waiting for everyone to be ready…'}
        </button>
      )}
      {!host && <p class="center-text muted small">The host starts the match when everyone is ready.</p>}
    </Shell>
  );
}
