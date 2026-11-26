// The private room's lobby (PLAN-113; PLAN-125 in design B), moved out of Online.tsx and split into its parts
// (REP-140 A-02): the invite box, your name and look, the table of seats, the game length and the foot with Ready and
// the host's Start. No shopkeepers yet: they are chosen once everyone has joined (PLAN-102), so each person's card shows
// their frame and looks round a plain face.
import { useEffect, useRef, useState } from 'preact/hooks';
import { inviteLink, type OnlineClient } from '../net/client';
import { track } from '../net/telemetry';
import { MAX_SEATS, NAME_MAX, type PublicSeat, type RoomConfig, type RoomView } from '../net/protocol';
import { fx } from './fx';
import { NOT_COPIED, copyText } from './share';
import { fitName } from './store';
import { lengthWord, wayLine, wayName } from './playMenu';
import { LengthSeg, OpenCard, SbGo, SbLabel, SbPage, SeatCard, TableRow } from './Setup';
import { Wardrobe } from './Wardrobe';
import { ReactButton, ReactionBubbles, ReactPicker, reactionsOn, useMutes } from './Reactions';
import { PICK_LATER, computersOffer, inviteLine, seatBand, seatChip, startLabel } from './onlineWords';
import { seatRow, useNow } from './onlineHooks';

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

/** PLAN-112: mute or unmute a person's reactions, on this phone, for this room. */
function MuteButton({ on, name, toggle }: { on: boolean; name: string; toggle: () => void }) {
  return (
    <button type="button" class={`rx-mute ${on ? 'on' : ''}`} aria-pressed={on}
      onClick={(e) => { e.stopPropagation(); fx.tap(); toggle(); }}>{on ? `Unmute ${name}'s reactions` : `Mute ${name}'s reactions`}</button>
  );
}

/** Computer shops take seats too, so they count toward the six. */
const openSeatsOf = (v: RoomView) => Math.max(0, MAX_SEATS - v.seats.length - v.config.ai);

export function Lobby({ client, v, onExit }: { client: OnlineClient; v: RoomView; onExit: () => void }) {
  const me = v.seats[v.you];
  const [wardrobe, setWardrobe] = useState(false);
  const host = !!me?.host;
  // REP-140 B-18: the copy button says when the link was copied, and when it could not be.
  const [copied, setCopied] = useState<boolean | null>(null);
  const [reacting, setReacting] = useState(false);
  const [muteOpen, setMuteOpen] = useState<number | null>(null);
  const mutes = useMutes(v.code);
  const set = (patch: Partial<RoomConfig>) => client.config({ ...v.config, ...patch });

  if (wardrobe) return <Wardrobe onBack={() => setWardrobe(false)} onChange={(l) => client.wear(l)} />;

  return (
    <SbPage title={v.public ? 'Public room' : wayName('room')} sub={v.public ? 'Anyone can join' : wayLine('room')} onBack={onExit} class="jo sb-lobby"
      foot={<LobbyFoot client={client} v={v} />}>
      {client.conn !== 'open' && <div class="net-strip bad">Reconnecting…</div>}
      <InviteBox v={v} copied={copied} setCopied={setCopied} />
      {v.public && <p class="sb-note public-note">Public room. People looking for a game can see it and join.</p>}
      {me && (
        <div class="sb-me">
          <MyName name={me.name} onRename={(n) => client.rename(n)} />
          <button type="button" class="sb-btn jl-look" aria-label="Your look: colour, roof, frame and title. Everyone here sees it." onClick={() => { fx.tap(); setWardrobe(true); }}>Your look</button>
        </div>
      )}
      <section class="sb-sec">
        <SbLabel right={<ReactButton onOpen={() => setReacting(true)} />}><span class="jl-stalls">{`The table · ${v.seats.length + v.config.ai} of ${MAX_SEATS}`}</span></SbLabel>
        <LobbyTable v={v} host={host} set={set} muteOpen={muteOpen} setMuteOpen={setMuteOpen} mutes={mutes} />
      </section>
      <RoomLength days={v.config.days} host={host} onDays={(d) => set({ days: d })} />
      <ReactionBubbles client={client} name={(seat) => v.seats[seat]?.name ?? ''} anchor={seatRow} onRow />
      {reacting && <ReactPicker client={client} onClose={() => setReacting(false)} />}
    </SbPage>
  );
}

/** The game length: the host chooses it with the set-up's own choice (PLAN-125: LengthSeg, the Play menu's lengths);
 *  everyone else sees what the host chose. */
export function RoomLength({ days, host, onDays }: { days: RoomConfig['days']; host: boolean; onDays: (d: RoomConfig['days']) => void }) {
  return host
    ? <LengthSeg days={days} onDays={onDays} />
    : <section class="sb-sec"><SbLabel>Game length</SbLabel><p class="sb-note sb-first">{lengthWord(days)} · {days} days</p></section>;
}

/** The room code with Share link (where the phone can share) and Copy link. */
function InviteBox({ v, copied, setCopied }: { v: RoomView; copied: boolean | null; setCopied: (c: boolean | null) => void }) {
  const link = inviteLink(v.code);
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
  return (
    <section class="sb-code invite">
      <div>
        <SbLabel>Room code</SbLabel>
        <div class="room-code" aria-label={`Room code ${v.code}`}>{v.code.split('').map((c) => <span>{c}</span>)}</div>
        <small class="sb-osm sb-inv">{inviteLine(openSeatsOf(v))}</small>
      </div>
      <div class="sb-share">
        {canShare && <button type="button" class="go" onClick={share}>Share link</button>}
        <button type="button" class={canShare ? '' : 'go'} onClick={copy}>{copied ? 'Copied' : copied === false ? NOT_COPIED : 'Copy link'}</button>
      </div>
      <input id="invite-link" class="sb-sr" readOnly tabIndex={-1} value={link} aria-label="Invite link" onFocus={(e) => (e.target as HTMLInputElement).select()} />
    </section>
  );
}

/**
 * The table: each person's card (you, the friends with a blue band; PLAN-112: a tap on another person's card offers to
 * mute their reactions on this phone), the computers with their level, and the open seats dashed, where the host can
 * seat a computer.
 */
function LobbyTable({ v, host, set, muteOpen, setMuteOpen, mutes }: {
  v: RoomView; host: boolean; set: (patch: Partial<RoomConfig>) => void; muteOpen: number | null; setMuteOpen: (seat: number | null) => void;
  mutes: ReturnType<typeof useMutes>;
}) {
  const showReactions = reactionsOn();
  const openSeats = openSeatsOf(v);
  const taken = v.seats.length + v.config.ai;
  const muting = muteOpen !== null ? v.seats.find((x) => x.seat === muteOpen) : undefined;
  const person = (x: PublicSeat) => {
    const mine = x.seat === v.you;
    const tap = showReactions && !mine;
    const muted = showReactions && !mine && mutes.muted(x.seat, x.name);
    return (
      <SeatCard seat={x.seat} class={`seat-row ${mine ? 'me' : ''} ${!x.connected || x.left ? 'off' : ''}`} selected={mine}
        top={x.host ? 'Host' : `Stall ${x.seat + 1}`} title={x.name} face={x.avatar} look={x.look}
        band={mine ? 'y' : 'b'} small={mine ? 'You' : muted ? 'Friend · Muted' : 'Friend'} big={seatBand(x)}
        label={`${x.name}${mine ? ' (you)' : ''}: ${seatChip(x)}${tap ? '. Mute or unmute their reactions' : ''}`}
        onClick={tap ? () => setMuteOpen(muteOpen === x.seat ? null : x.seat) : undefined} pressed={tap ? muteOpen === x.seat : undefined} />
    );
  };
  return (
    <>
      <TableRow count={MAX_SEATS} wrap>
        {v.seats.map(person)}
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
    </>
  );
}

/**
 * Ready first; the host's Start beside it (it names who the room is waiting for). PLAN-112: once the room has waited a
 * minute with seats free, the host may start with computers in them. PLAN-107 (ON-05): a seat whose person closed the
 * tab is freed after the grace period (the room sends when); until then a line counts down to it.
 */
function LobbyFoot({ client, v }: { client: OnlineClient; v: RoomView }) {
  const me = v.seats[v.you];
  const host = !!me?.host;
  const allReady = v.seats.length >= 2 && v.seats.every((x) => x.ready && x.connected);
  const away = v.seats.filter((x) => !x.connected);
  const now = useNow(away.some((x) => x.takeoverAt !== undefined));
  const computers = computersOffer(v, client.openedAt, useNow(host && openSeatsOf(v) > 0 && !v.quick));
  return (
    <>
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
  );
}
