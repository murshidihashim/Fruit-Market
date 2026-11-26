// PLAN-112: preset reactions in an online room (the lobby, choosing shopkeepers, and the game). A button by your own
// seat opens the twelve choices; a choice sends only its id (src/net/client.ts react). Every phone in the room draws a
// reaction as a bubble over the seat that sent it, for BEAT.reaction.up; a seat's new bubble replaces its last.
// A player's reactions can be muted on this phone, for this room only (from their seat: their row in the lobby, or
// their stall's card in the game); Settings > Show reactions hides them all. Solo and pass-and-play have none.
import { useEffect, useRef, useState } from 'preact/hooks';
import type { OnlineClient } from '../net/client';
import { REACT_GAP_MS, REACTIONS, type ReactionId } from '../net/protocol';
import { track } from '../net/telemetry';
import { fx } from './fx';
import { Popup } from './Home';
import { BEAT } from './motion';
import { loadSettings } from './store';

export const reactionOf = (id: ReactionId) => REACTIONS.find((r) => r.id === id)!;
/** An emoji, as opposed to a short line (drawn larger, in a round bubble). */
export const isEmoji = (id: ReactionId) => !/^[A-Za-z]/.test(reactionOf(id).show);

// ---------- muting, on this phone, for one room ----------

/** A muted player: their seat and their name then (a seat can pass to someone else when a lobby seat is freed). */
export interface Muted { seat: number; name: string }

const muteKey = (code: string) => `fm.mute.${code}`;
export function isMuted(list: readonly Muted[], seat: number, name: string): boolean {
  return list.some((m) => m.seat === seat && m.name === name);
}
export function toggleMuted(list: readonly Muted[], seat: number, name: string): Muted[] {
  return isMuted(list, seat, name) ? list.filter((m) => !(m.seat === seat && m.name === name)) : [...list, { seat, name }];
}
function loadMuted(code: string): Muted[] {
  try {
    const raw = JSON.parse(localStorage.getItem(muteKey(code)) ?? '[]') as unknown;
    return Array.isArray(raw) ? raw.filter((m): m is Muted => !!m && typeof m.seat === 'number' && typeof m.name === 'string') : [];
  } catch { return []; }
}

const muteListeners = new Set<() => void>();

/** Who is muted in this room, and a way to mute or unmute a player. Every screen of the room sees a change at once. */
export function useMutes(code: string | undefined) {
  const [, force] = useState(0);
  useEffect(() => {
    const f = () => force((n) => n + 1);
    muteListeners.add(f);
    return () => { muteListeners.delete(f); };
  }, []);
  const list = code ? loadMuted(code) : [];
  return {
    muted: (seat: number, name: string) => isMuted(list, seat, name),
    toggle: (seat: number, name: string) => {
      if (!code) return;
      try { localStorage.setItem(muteKey(code), JSON.stringify(toggleMuted(loadMuted(code), seat, name))); } catch { /* storage unavailable: nothing to keep */ }
      muteListeners.forEach((f) => f());
    },
  };
}

/** The Show reactions setting (on unless switched off). */
export const reactionsOn = () => loadSettings().reactions !== false;

// ---------- the bubbles ----------

interface Bubble { seat: number; r: ReactionId; key: number }
/** Where a bubble stands when its seat is not to be seen: near the top of the screen, on the game's top bar's foot and
 *  tomorrow's strip under it (PLAN-127; the strip of the day's steps used to lie there), clear of a sheet's own heading
 *  and figures below it. */
const TOP_Y = 56;
let bubbleKey = 0;

/**
 * The bubbles over the seats. `anchor` finds the element of a seat on this screen (its stall, its row), `name` its
 * player's name now. Over a stall a bubble stands above it with its tail pointing down at it (under it, at the top of
 * the screen); on a row of a list (`onRow`) it sits on the row's right-hand side, so it cannot be read as the next
 * row's. A bubble that has no seat on screen to sit over stands at the top of the screen. Your own shelf in the game
 * (section.my-stall) takes the bubble inside it, in its middle: above it, the bubble covered the figures of the sheet
 * over the shelf (the standing order's, PLAN-116, REP-133 B-10). While a sheet lies over a seat (the standing order's
 * sheet covers the stalls on a small phone), or the seat is scrolled out of sight, its bubble stands at the top.
 */
export function ReactionBubbles({ client, anchor, name, onRow }: { client: OnlineClient; anchor: (seat: number) => Element | null; name: (seat: number) => string; onRow?: boolean }) {
  const [bubbles, setBubbles] = useState<Bubble[]>([]);
  const nameRef = useRef(name);
  nameRef.current = name;
  useEffect(() => {
    const timers = new Set<ReturnType<typeof setTimeout>>();
    const off = client.onReact((seat, r) => {
      if (!reactionsOn() || isMuted(loadMuted(client.code), seat, nameRef.current(seat))) return;
      const key = ++bubbleKey;
      setBubbles((bs) => [...bs.filter((b) => b.seat !== seat), { seat, r, key }]);
      const t = setTimeout(() => { timers.delete(t); setBubbles((bs) => bs.filter((b) => b.key !== key)); }, BEAT.reaction.up);
      timers.add(t);
    });
    return () => { off(); timers.forEach(clearTimeout); };
  }, [client]);
  if (!bubbles.length) return null;
  const w = typeof window === 'undefined' ? 390 : window.innerWidth;
  return (
    <div class="rx-layer" aria-live="polite">
      {bubbles.map((b) => {
        const el = anchor(b.seat);
        const box = el?.getBoundingClientRect();
        // A seat counts as on screen only where it can be seen: not scrolled away, nor under a sheet (PLAN-116 B-10).
        const there = !!box && box.width > 0 && !!el?.contains(document.elementFromPoint(box.left + box.width / 2, box.top + box.height / 2));
        const inside = there && !!el?.classList.contains('my-stall');
        // A bubble with no seat to be seen stands centred on TOP_Y, without its tail, as one on a row does.
        const row = !there || !!onRow || inside;
        const x = there ? Math.max(56, Math.min(w - 56, box.left + box.width * (row && !inside ? 0.7 : 0.5))) : w / 2;
        // Over the seat; under it when the seat is at the very top of the screen.
        const below = !row && box.top < 52;
        const y = !there ? TOP_Y : row ? box.top + box.height / 2 : below ? box.bottom + 4 : box.top - 4;
        const re = reactionOf(b.r);
        return (
          <button type="button" key={b.key} class={`rx-bubble ${isEmoji(b.r) ? 'emoji' : 'line'} ${below ? 'below' : ''} ${row ? 'on-row' : ''}`}
            style={`left:${Math.round(x)}px;top:${Math.round(y)}px;--rx-out:${BEAT.reaction.up - BEAT.reaction.out}ms`}
            aria-label={`${nameRef.current(b.seat)}: ${re.words}`}
            onClick={(e) => { e.stopPropagation(); setBubbles((bs) => bs.filter((x2) => x2.key !== b.key)); }}>
            <span aria-hidden="true">{re.show}</span>
          </button>
        );
      })}
    </div>
  );
}

// ---------- sending ----------

/** The button by your own seat. Hidden when Show reactions is off. */
export function ReactButton({ onOpen, class: cls = '' }: { onOpen: () => void; class?: string }) {
  if (!reactionsOn()) return null;
  return (
    <button type="button" class={`rx-btn ${cls}`} aria-label="Send a reaction" data-a="react"
      onClick={(e) => { e.stopPropagation(); fx.tap(); onOpen(); }}>
      {/* the first reaction, as the button's face (the reactions are emoji by the owner's choice, PLAN-112) */}
      <span aria-hidden="true">{reactionOf('smile').show}</span>
    </button>
  );
}

/** The twelve choices. A choice is sent and the picker closes; a second within 2 s waits until the room takes one. */
export function ReactPicker({ client, onClose }: { client: OnlineClient; onClose: () => void }) {
  const [, force] = useState(0);
  const ready = client.canReact();
  useEffect(() => {
    if (ready) return;
    const t = setTimeout(() => force((n) => n + 1), REACT_GAP_MS - (Date.now() - client.reactedAt) + 20);
    return () => clearTimeout(t);
  }, [ready]);
  const send = (id: ReactionId) => {
    if (!client.react(id)) return;
    fx.tap();
    track('reaction');
    onClose();
  };
  const emoji = REACTIONS.filter((r) => isEmoji(r.id));
  const lines = REACTIONS.filter((r) => !isEmoji(r.id));
  return (
    <div class="rx-pick" onClick={(e) => e.stopPropagation()}>
      <Popup title="React" onClose={onClose}>
        <div class="rx-grid emoji">
          {emoji.map((r) => <button type="button" class="rx-choice" disabled={!ready} aria-label={r.words} onClick={() => send(r.id)}>{r.show}</button>)}
        </div>
        <div class="rx-grid line">
          {lines.map((r) => <button type="button" class="rx-choice" disabled={!ready} onClick={() => send(r.id)}>{r.show}</button>)}
        </div>
        <p class="small muted rx-note">{ready ? 'Everyone in the room sees it over your stall.' : 'One reaction every 2 seconds.'}</p>
      </Popup>
    </div>
  );
}
