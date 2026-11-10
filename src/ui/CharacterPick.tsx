// Pick one of the eight shopkeepers (design A, PLAN-063): their Stall Signs in a carousel. Swipe left for the next,
// right for the previous (or use the arrows); the sign in the middle is the one picked, and their tagline shows below.
// Each has one fixed perk for the whole game, and a shopkeeper can be taken by one stall only: a taken sign shows who
// has it and is passed over.
import { useRef, useState } from 'preact/hooks';
import { RIVALS } from '../engine/data';
import { StallSign } from './cards';
import { fx } from './fx';

const N = RIVALS.length;
const SWIPED = 'fm.swiped';
/** Until a player first swipes (or taps an arrow), the dots read "Swipe to choose" (PLAN-064). */
const hasSwiped = () => { try { return localStorage.getItem(SWIPED) === '1'; } catch { return true; } };
/** How far a swipe must travel to move to the next sign, in px. */
const SWIPE = 40;

/** `taken` maps a character's avatar to the name of the shop that already has it. */
export function CharacterPick({ value, taken = {}, onPick }: { value: string; taken?: Record<string, string>; onPick: (avatar: string) => void }) {
  const at = Math.max(0, RIVALS.findIndex((r) => r.avatar === value));
  const [dx, setDx] = useState(0);
  const [drag, setDrag] = useState(false);
  const x0 = useRef(0);
  const [hint, setHint] = useState(() => !hasSwiped());
  const go = (d: number) => {
    if (hint) { setHint(false); try { localStorage.setItem(SWIPED, '1'); } catch { /* storage blocked: the hint just shows again next time */ } }
    let k = at;
    for (let n = 0; n < N; n++) { k = (k + d + N) % N; if (!taken[RIVALS[k].avatar]) break; }
    if (k !== at) { fx.tap(); onPick(RIVALS[k].avatar); }
  };
  const end = () => {
    if (!drag) return;
    setDrag(false); setDx(0);
    if (dx < -SWIPE) go(1); else if (dx > SWIPE) go(-1);
  };
  return (
    <CharacterPickView value={value} taken={taken} dx={dx} drag={drag} hint={hint} onStep={go}
      onDown={(e) => { x0.current = e.clientX; setDrag(true); setDx(0); (e.currentTarget as HTMLElement).setPointerCapture?.(e.pointerId); }}
      onMove={(e) => { if (drag) setDx(e.clientX - x0.current); }} onEnd={end} />
  );
}

/** The picker drawn from its state (no hooks, so tests can draw it). `dx`: how far the finger has dragged the signs. */
export function CharacterPickView({ value, taken = {}, dx = 0, drag = false, hint = false, onStep, onDown, onMove, onEnd }: {
  value: string; taken?: Record<string, string>; dx?: number; drag?: boolean; hint?: boolean; onStep?: (d: number) => void;
  onDown?: (e: PointerEvent) => void; onMove?: (e: PointerEvent) => void; onEnd?: () => void;
}) {
  const at = Math.max(0, RIVALS.findIndex((r) => r.avatar === value));
  const go = (d: number) => onStep?.(d);
  const me = RIVALS[at];
  return (
    <div class="char-pick" role="group" aria-label="Choose your shopkeeper">
      <div class="cp-stage" aria-live="polite" onPointerDown={onDown} onPointerMove={onMove} onPointerUp={onEnd} onPointerCancel={onEnd}>
        {RIVALS.map((r, k) => {
          let o = k - at;
          if (o > N / 2) o -= N;
          if (o < -N / 2) o += N;
          const style = {
            transform: `translateX(calc(${o * 87}% + ${dx}px)) scale(${o === 0 ? 1 : 0.82})`,
            opacity: Math.abs(o) > 1 ? 0 : o === 0 ? 1 : 0.55,
            zIndex: 10 - Math.abs(o),
            transition: drag ? 'none' : undefined,
          };
          return (
            <div class={`cp-card ${o === 0 ? 'on' : ''}`} style={style} aria-hidden={o !== 0}>
              <StallSign avatar={r.avatar} selected={o === 0} takenBy={taken[r.avatar]} noQuip eager={Math.abs(o) <= 1} />
            </div>
          );
        })}
      </div>
      <p class="cp-quip" key={me.avatar}>{`“${me.quip}”`}</p>
      <div class="cp-nav">
        <button type="button" class="cp-arrow" aria-label="Previous shopkeeper" onClick={() => go(-1)}>‹</button>
        {hint
          ? <span class="cp-hint">‹ Swipe to choose ›</span>
          : <span class="cp-dots" aria-hidden="true">{RIVALS.map((r, k) => <i class={`${k === at ? 'on' : ''} ${taken[r.avatar] ? 'taken' : ''}`} />)}</span>}
        <button type="button" class="cp-arrow" aria-label="Next shopkeeper" onClick={() => go(1)}>›</button>
      </div>
    </div>
  );
}
