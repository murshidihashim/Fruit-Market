// The wardrobe: see your shopkeeper and stall, and put on the looks you have earned.
import { useState } from 'preact/hooks';
import { CHARACTER_AVATARS } from '../engine/data';
import { Face } from './art';
import { achievementFor, LOOKS, SLOTS, syncLooks, toggleLook, worn, wornParts, wornStall, type Look } from './looks';
import { PropSprite, RoofBand } from './propsArt';
import { loadColour, loadLooks } from './progress';
import { C } from './palette';
import { fx } from './fx';

const myAvatar = (): string => {
  try { const a = localStorage.getItem('fm.avatar'); return a && CHARACTER_AVATARS.includes(a) ? a : CHARACTER_AVATARS[0]; } catch { return CHARACTER_AVATARS[0]; }
};

function Tile({ look, on, owned, avatar, colour, onPick }: { look: Look; on: boolean; owned: boolean; avatar: string; colour: string; onPick: () => void }) {
  const ach = achievementFor(look);
  const art = look.kind === 'wear' ? <Face who={avatar} size={44} worn={[look.id]} />
    : look.slot === 'prop' ? <PropSprite id={look.id} size={44} cls="wd-prop" />
      : <RoofBand cls="wd-band" colour={colour} roof={look.slot === 'roof' ? look.id : undefined} trim={look.slot === 'trim' ? look.id : undefined} />;
  return (
    <button type="button" class={`wd-tile ${on ? 'on' : ''} ${owned ? '' : 'locked'}`} disabled={!owned} aria-pressed={owned ? on : undefined} onClick={onPick}
      title={owned ? look.title : `Locked. ${ach?.title}: ${ach?.text}`}>
      <span class={`wd-art ${owned ? '' : 'dim'}`}>{art}</span>
      <b>{look.title}</b>
      <small>{owned ? (on ? 'Wearing' : 'Tap to use') : `Earn: ${ach?.title ?? ''}`}</small>
    </button>
  );
}

export function Wardrobe({ onBack }: { onBack: () => void }) {
  const [fresh] = useState(() => syncLooks());
  const [w, setW] = useState(worn());
  const owned = new Set(loadLooks());
  const avatar = myAvatar();
  const colour = loadColour() ?? C.terracotta;
  const stall = wornStall(w);
  const total = LOOKS.length;
  return (
    <div class="page">
      <header class="topbar"><button class="icon-btn" onClick={onBack} aria-label="Back">←</button><div class="day"><b>Wardrobe</b></div><span class="muted">{owned.size}/{total}</span></header>
      <main class="scroll pad">
        <section class="panel wd-stage">
          <div class="wd-stall">
            <RoofBand cls="wd-roof" colour={colour} roof={stall.roof} trim={stall.trim} scale={3} />
            <div class="wd-counter">
              <Face who={avatar} size={96} worn={wornParts(w)} />
              {stall.prop && <PropSprite id={stall.prop} size={64} cls="wd-stage-prop" />}
            </div>
          </div>
          <p class="small muted">This is how you look at the market. Earn achievements to unlock more.</p>
          {fresh.length > 0 && <p class="small" role="status"><b>New:</b> {fresh.map((l) => l.title).join(', ')}</p>}
        </section>
        {SLOTS.map((slot) => {
          const list = LOOKS.filter((l) => l.slot === slot.id);
          return (
            <section class="panel">
              <h3>{slot.title} <span class="muted small">{list.filter((l) => owned.has(l.id)).length}/{list.length} · {slot.kind === 'wear' ? 'worn by your shopkeeper' : 'on your stall'}</span></h3>
              <div class="wd-grid">
                {list.map((l) => <Tile look={l} on={w[l.slot] === l.id} owned={owned.has(l.id)} avatar={avatar} colour={colour} onPick={() => { fx.tap(); setW(toggleLook(l.id)); }} />)}
              </div>
            </section>
          );
        })}
      </main>
    </div>
  );
}
