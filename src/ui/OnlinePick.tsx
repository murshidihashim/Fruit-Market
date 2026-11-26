// Choosing shopkeepers in a private room (PLAN-102; PLAN-125, design B), moved out of Online.tsx and split into its
// parts (REP-140 A-02).
import { useEffect, useState } from 'preact/hooks';
import { CHARACTER_AVATARS } from '../engine/data';
import type { OnlineClient } from '../net/client';
import type { RoomView } from '../net/protocol';
import { fx } from './fx';
import { saveAvatar, storedAvatar } from './looks';
import { wayName } from './playMenu';
import { Deck, SbGo, SbLabel, SbPage, SeatCard, TableRow, keeperName } from './Setup';
import { ReactButton, ReactionBubbles, ReactPicker } from './Reactions';
import { pickAwayLine, pickState } from './onlineWords';
import { seatRow, useNow } from './onlineHooks';

/** PLAN-102: after the host starts a private room, everyone chooses a shopkeeper at the same time. Looking at a card
 *  does not take it; "Choose" asks the room for it (first come), and it can be changed until "Confirm". The match
 *  begins when every person has confirmed; the computers then take shopkeepers from those left. PLAN-125 (design B):
 *  the deck, your card in the middle and the cards others took marked "Taken by …"; every seat's state as a small card. */
export function Picking({ client, v, onExit }: { client: OnlineClient; v: RoomView; onExit: () => void }) {
  const me = v.seats[v.you];
  const mine = me?.avatar ?? '';
  const taken: Record<string, string> = Object.fromEntries(v.seats.filter((x) => x.seat !== v.you && x.avatar).map((x) => [x.avatar, x.name]));
  // Browsing starts at your own pick, or the shopkeeper you used last, or the first one free.
  const [look, setLook] = useState(() => {
    const last = storedAvatar();
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
  if (leaving) return <LeaveAsk title={title} code={v.code} onStay={() => setLeaving(false)} onLeave={onExit} />;

  const choose = () => {
    fx.tap();
    setErr(null);
    saveAvatar(look);
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
        <PickTable v={v} />
      </section>
      {away.map((x) => <p class="sb-warn center-text pick-away">{pickAwayLine(x, now)}</p>)}
      {err && <p class="sb-warn center-text" role="alert">{err}</p>}
      <ReactionBubbles client={client} name={(seat) => v.seats[seat]?.name ?? ''} anchor={seatRow} onRow />
      {reacting && <ReactPicker client={client} onClose={() => setReacting(false)} />}
    </SbPage>
  );
}

/** ON-09: leaving while shopkeepers are chosen is for good, so it is asked first. */
function LeaveAsk({ title, code, onStay, onLeave }: { title: string; code: string; onStay: () => void; onLeave: () => void }) {
  return (
    <SbPage title={title} sub={`Room ${code}`} onBack={onStay} class="jo"
      foot={<><SbGo onClick={() => { fx.tap(); onStay(); }}>Stay</SbGo><button type="button" class="sb-btn" onClick={onLeave}>Leave</button></>}>
      <section class="sb-sec">
        <h3 class="sb-h3">Leave the game?</h3>
        <p class="sb-note">A computer will play for you, and you cannot come back to this game.</p>
      </section>
    </SbPage>
  );
}

/** Every seat's state on the pick screen: the people (confirmed in yellow) and the computers. */
function PickTable({ v }: { v: RoomView }) {
  return (
    <>
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
    </>
  );
}
