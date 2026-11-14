// The Wardrobe (PLAN-086, board "Wardrobe"): your stall and shopkeeper as rivals see them, where the looks show in a
// game, and every slot with what is on, how many are earned and how the next is earned. It is the fourth page of
// Trophies; `Wardrobe` opens Trophies on it (from Home, the online lobby and the pause menu).
// Worn looks are drawn on the portrait as Great Fruit Exchange regalia (DEC-069).
import { useState } from 'preact/hooks';
import { CHARACTER_TRAIT, RIVALS, TRAITS } from '../engine/data';
import { LOOKS, SLOTS, colourOf, lookById, partsOf, stallOf, tagOf, titleOf, type Look, type LookSet, type Slot } from '../net/looks';
import { TIER_NAME, type Snapshot } from './achievements';
import { Face } from './art';
import { fx, playSound } from './fx';
import { PropSprite, RoofBand } from './icons';
import { achievementFor, earned, myAvatar, ownsLook, toggleLook, wornIn, wornSounds } from './looks';
import { COLOURS, colourHex, loadGranted, loadLooks } from './progress';
import { C } from './palette';
import { Awning, FramedFace, stallName } from './stampCard';
import type { Place } from './stamps';
import { TrophyScreen } from './Trophies';

export { myAvatar } from './looks';

/** How a look that is not owned yet is earned, in a few words. */
function howEarned(l: Look, s: Snapshot): string {
  if (l.from.kind === 'level') return `Stall level ${l.from.level}`;
  if (l.from.kind === 'trophy') {
    const t = achievementFor(l);
    if (!t) return '';
    // the tier is held, but its title needs a game against Normal or harder computers, a Daily market or people
    if (l.from.fair && s.have.has(l.from.id)) return 'Earn it again against Normal or Hard computers, in the Daily market, or with friends.';
    return `${TIER_NAME[t.step.tier]}: ${t.step.text}`;
  }
  return '';
}

const SLOT_ORDER: { head: string; slots: Slot[] }[] = [
  { head: 'Your stall', slots: ['colour', 'roof', 'trim', 'prop', 'frame', 'title', 'tag', 'stamp'] },
  { head: 'Your shopkeeper', slots: ['hat', 'face', 'neck', 'badge', 'hand'] },
  { head: 'Sounds · only you hear these', slots: ['bell', 'coin'] },
];

/** The Wardrobe page. `onChange` hears what is on show to others after every change. */
export function WardrobeTab({ look, fresh, place, snap, onChange }: { look: LookSet; fresh: Look[]; place: Place; snap: Snapshot; onChange: (look: LookSet) => void }) {
  const [open, setOpen] = useState<Slot | null>(null);
  const own = new Set([...loadLooks(), ...loadGranted()]);
  const avatar = myAvatar();
  const keeper = RIVALS.find((r) => r.avatar === avatar);
  const perk = TRAITS[CHARACTER_TRAIT[avatar]];
  const colour = colourHex(colourOf(look)) ?? C.terracotta;
  const stall = stallOf(look);
  const sounds = wornSounds();
  const pick = (id: string) => { fx.tap(); const next = toggleLook(id); if (lookById(id)?.kind === 'sound') playSound(id); onChange(next); };
  // what is on, in words: "teal, striped roof, bunting, brass scales"
  const dressed = [colourOf(look) && COLOURS.find((c) => c.id === colourOf(look))?.name, stall.roof && lookById(stall.roof)?.title, stall.trim && lookById(stall.trim)?.title, stall.prop && lookById(stall.prop)?.title]
    .filter((x): x is string => !!x).map((x) => x.toLowerCase()).join(', ');
  const me = <FramedFace who={avatar} size={26} look={look} />;
  return (
    <>
      <div class="sbk-stage">
        {stall.roof || stall.trim ? <RoofBand cls="sbk-roof" colour={colour} roof={stall.roof} trim={stall.trim} scale={2} /> : <Awning colour={colour} />}
        <div class="sbk-srow">
          <div class="sbk-sc"><Face who={avatar} size={76} worn={partsOf(look)} />{stall.prop && <PropSprite id={stall.prop} size={30} cls="sbk-prop" />}</div>
          <div class="sbk-snm">
            <b>{stallName()}</b>
            <span class="sbk-lab">{titleOf(look) ?? ''}</span>
            <span class="sbk-sub">{keeper ? `${keeper.name} · ${perk?.title ?? ''}` : ''}{dressed ? ` · ${dressed}` : ''}</span>
          </div>
        </div>
      </div>
      {fresh.length > 0 && <p class="sbk-note" role="status">New: {fresh.slice(0, 4).map((l) => l.title).join(', ')}{fresh.length > 4 ? ` and ${fresh.length - 4} more` : ''}.</p>}

      <div class="sbk-sec">
        <span class="sbk-lab">Where it shows in a game</span>
        <div class="sbk-where">
          <div><span class="sbk-cap">Your shelf</span><Awning colour={colour} /><div class="sbk-wi">{me}<span><b>You</b> · your shelf</span></div></div>
          <div><span class="sbk-cap">How a rival sees you</span><Awning colour={colour} thin /><div class="sbk-wi">{me}<span><b>{stallName().replace(/'s stall$/, '').replace(/^Your stall$/, 'You')}</b> · your box</span></div></div>
        </div>
        <span class="sbk-sub">Also on Home, in the online lobby and on the results. Looks never change a rule, a price or what anyone can see.</span>
      </div>

      {SLOT_ORDER.map((group, gi) => (
        <div class="sbk-sec" style={gi === SLOT_ORDER.length - 1 ? 'padding-bottom: 14px' : undefined}>
          <span class="sbk-lab">{group.head}</span>
          {group.slots.map((id) => {
            const slot = SLOTS.find((x) => x.id === id)!;
            const list = LOOKS.filter((l) => l.slot === id);
            const mine = list.filter((l) => own.has(l.id));
            const on = id === 'bell' ? sounds.bell : id === 'coin' ? sounds.coin : id === 'tag' ? `tag_${tagOf(look)}` : look[id] ?? wornIn(id);
            const onLook = on ? lookById(on) : undefined;
            const next = list.find((l) => !own.has(l.id));
            const note = mine.length === 0 && next ? howEarned(next, snap) : `${mine.length} of ${list.length} earned`;
            if (id === 'colour') {
              return (
                <div class="sbk-slot">
                  <span class="sbk-k">{slot.title}</span><span class="sbk-v">{onLook?.title ?? 'Not chosen'}</span>
                  <span class="sbk-sws">{COLOURS.map((c) => <button type="button" class={on === `col_${c.id}` ? 'on' : ''} style={{ background: c.hex }} title={c.name} aria-label={c.name} aria-pressed={on === `col_${c.id}`} onClick={() => pick(`col_${c.id}`)} />)}</span>
                </div>
              );
            }
            return (
              <>
                <button type="button" class={`sbk-slot ${mine.length === 0 ? 'lock' : ''} ${open === id ? 'open' : ''}`} aria-expanded={open === id} onClick={() => { fx.tap(); setOpen(open === id ? null : id); }}>
                  <span class="sbk-k">{slot.title}</span>
                  <span class="sbk-v">{onLook?.title ?? (mine.length ? 'None' : 'Nothing yet')}</span>
                  {id === 'tag' && <span class={`sbk-tag tg-${tagOf(look)}`} aria-hidden="true">$7</span>}
                  <span class="sbk-nn">{note}</span>
                </button>
                {open === id && (
                  <div class="sbk-picks">
                    {list.map((l) => {
                      const has = own.has(l.id) && ownsLook(l.id);
                      return (
                        <button type="button" class={`sbk-pick ${on === l.id ? 'on' : ''} ${has ? '' : 'locked'}`} disabled={!has} aria-pressed={has ? on === l.id : undefined} onClick={() => pick(l.id)}>
                          <b>{l.title}</b>
                          <small>{has ? (on === l.id ? 'In use' : 'Tap to use') : earned(l, snap, place.level) ? 'Tap to use' : howEarned(l, snap)}</small>
                        </button>
                      );
                    })}
                  </div>
                )}
              </>
            );
          })}
        </div>
      ))}
    </>
  );
}

/** Opens Trophies on the Wardrobe. `onChange` hears every change (online, it tells the room what you have on). */
export function Wardrobe({ onBack, onChange }: { onBack: () => void; onChange?: (look: Record<string, string>) => void }) {
  return <TrophyScreen tab="wardrobe" onBack={onBack} onLook={onChange} />;
}
