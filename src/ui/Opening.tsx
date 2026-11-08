// The market opening (PLAN-029, DEC-047): a short scene played when the game is opened, drawn with the deck-art
// pieces (DEC-066): the Exchange Gazette masthead drops in, three Stall Signs go up, fruit lands on the counter
// and the bell rings. Decoration only: tap anywhere to skip, and it ends on its own after about 2.5 seconds.
import { useEffect, useState } from 'preact/hooks';
import { FRUITS, RIVALS } from '../engine/data';
import { Fruit } from './art';
import { StallSign } from './cards';
import { C } from './palette';

const LENGTH_MS = 2600;
const SIGNS = RIVALS.slice(0, 3).map((r) => r.avatar);

export function Opening({ onDone }: { onDone: () => void }) {
  const [scale, setScale] = useState(1);
  useEffect(() => {
    const fit = () => setScale(Math.min(window.innerWidth / 390, window.innerHeight / 560));
    fit();
    window.addEventListener('resize', fit);
    const reduced = typeof matchMedia !== 'undefined' && matchMedia('(prefers-reduced-motion: reduce)').matches;
    const t = setTimeout(onDone, reduced ? 800 : LENGTH_MS);
    return () => { window.removeEventListener('resize', fit); clearTimeout(t); };
  }, []);
  return (
    <div class="op opx" onClick={onDone} role="presentation">
      <div class="op-stage" style={{ transform: `scale(${scale})` }} aria-hidden="true">
        <div class="opx-sky" />
        <div class="opx-counter" />
        <div class="opx-mast">
          <b>Fruit Market</b>
          <span>Extra! · The market opens today</span>
        </div>
        {SIGNS.map((a, i) => <div class={`opx-sign opx-s${i}`}><StallSign avatar={a} compact eager /></div>)}
        {FRUITS.map((f, i) => <div class={`op-fl op-f${i}`}><Fruit id={f} size={30} /></div>)}
        <svg class="op-bell" viewBox="0 0 24 24" width="34" height="34">
          <path d="M12 3c-3.5 0-6 2.6-6 6v5l-2 3h16l-2-3V9c0-3.4-2.5-6-6-6Z" fill={C.xMustard} stroke={C.xInk} stroke-width="1.6" />
          <circle cx="12" cy="20" r="2" fill={C.xInk} />
        </svg>
        <div class="op-pill">The market is open!</div>
      </div>
      <span class="op-skip">Tap to skip</span>
    </div>
  );
}
