// The Wardrobe (PLAN-086, board "Wardrobe"; PLAN-113, the redesigned market style): your stall as rivals see it at
// the table, with what is on; then one page per slot, every look in it drawn as it shows, the one on marked, and how
// to earn the ones still locked. It is the fourth page of Trophies; `Wardrobe` opens Trophies on it (from Home, the
// online lobby and the pause menu). Worn looks are drawn on the portrait as Great Fruit Exchange regalia (DEC-069).
import { useState } from 'preact/hooks';
import { RIVALS } from '../engine/data';
import { LOOKS, SLOTS, lookById, tagOf, titleOf, type Look, type LookKind, type LookSet, type Slot } from '../net/looks';
import { TIER_NAME, tierById, type Snapshot } from './achievements';
import { fx, playSound } from './fx';
import { achievementFor, myAvatar, ownsLook, toggleLook, wornIn, wornSounds } from './looks';
import { loadGranted, loadLooks } from './progress';
import { LookSwatch, StallPreview, onWord } from './stampCard';
import { loadName } from './store';
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
    // PLAN-118: a look a League mastery trophy also hands over says both ways.
    const also = (l.also ?? []).map(tierById).find((x) => !!x);
    return `${TIER_NAME[t.step.tier]}: ${t.step.text}${also ? ` Or ${TIER_NAME[also.step.tier]} ${also.card.title}: ${also.step.text.charAt(0).toLowerCase()}${also.step.text.slice(1)}` : ''}`;
  }
  return '';
}

/** The Wardrobe's pages, one per slot, in the order a player meets them: the stall, then the shopkeeper, then the
 *  signboard, then the sounds. */
const SLOT_ORDER: Slot[] = ['roof', 'trim', 'colour', 'prop', 'hat', 'face', 'neck', 'badge', 'hand', 'frame', 'title', 'tag', 'stamp', 'bell', 'coin'];
/** Where the looks of a slot show, in a few words. */
const WHERE: Record<LookKind, string> = {
  stall: 'Shows on your stall at the table, on Home, in the online lobby and on the results.',
  wear: 'Your shopkeeper wears it at the table, on Home, in the online lobby and on the results.',
  sign: 'Shows on your signboard: on Home, in the online lobby and on the results.',
  sound: 'Only you hear it.',
};
/** Slots that can be left empty (their first tile takes off what is on). The rest always have one on. */
const CAN_BE_EMPTY = new Set<Slot>(['colour', 'roof', 'trim', 'prop', 'hat', 'face', 'neck', 'badge', 'hand', 'stamp']);
const EMPTY_WORD: Partial<Record<Slot, string>> = { colour: 'Stall colour', roof: 'Plain', trim: 'None', prop: 'None', stamp: 'None' };

/** The Wardrobe page. `onChange` hears what is on show to others after every change. */
export function WardrobeTab({ look, fresh, snap, onChange }: { look: LookSet; fresh: Look[]; snap: Snapshot; onChange: (look: LookSet) => void }) {
  const [slot, setSlot] = useState<Slot>('roof');
  const own = new Set([...loadLooks(), ...loadGranted()]);
  const avatar = myAvatar();
  const keeper = RIVALS.find((r) => r.avatar === avatar);
  const sounds = wornSounds();
  const pick = (id: string) => { fx.tap(); const next = toggleLook(id); if (lookById(id)?.kind === 'sound') playSound(id); onChange(next); };
  const name = loadName().trim() || 'You';
  const info = SLOTS.find((x) => x.id === slot)!;
  const list = LOOKS.filter((l) => l.slot === slot);
  const mine = list.filter((l) => own.has(l.id));
  const on = slot === 'bell' ? sounds.bell : slot === 'coin' ? sounds.coin : slot === 'tag' ? `tag_${tagOf(look)}` : look[slot] ?? wornIn(slot);
  const tile = (id: string | undefined, title: string, state: 'on' | 'own' | 'locked', note: string) => (
    <button type="button" class={`jp-wd-it ${state}`} disabled={state === 'locked'} aria-pressed={state === 'locked' ? undefined : state === 'on'}
      aria-label={`${title}. ${note}`} onClick={() => (id ? pick(id) : on && pick(on))}>
      <span class="jp-wd-sw" aria-hidden="true"><LookSwatch slot={slot} id={id} look={look} avatar={avatar} /></span>
      {slot !== 'title' && <b aria-hidden="true">{title}</b>}
      <small aria-hidden="true">{note}</small>
    </button>
  );
  return (
    <>
      <div class="jp-wd-prev">
        <span class="sbk-lab">Your stall, as rivals see it</span>
        <StallPreview look={look} avatar={avatar} name={`${keeper ? `${keeper.name} · ` : ''}${name}`} />
        {titleOf(look) && <span class="jp-wd-title">{titleOf(look)}</span>}
      </div>
      {fresh.length > 0 && <p class="sbk-note" role="status">New: {fresh.slice(0, 4).map((l) => l.title).join(', ')}{fresh.length > 4 ? ` and ${fresh.length - 4} more` : ''}.</p>}

      <nav class="jp-wd-tabs" aria-label="Wardrobe slots">
        {SLOT_ORDER.map((id) => {
          const s = SLOTS.find((x) => x.id === id)!;
          return <button type="button" class={slot === id ? 'on' : ''} aria-current={slot === id ? 'page' : undefined} onClick={() => { fx.tap(); setSlot(id); }}>{s.title}</button>;
        })}
      </nav>
      <div class="sbk-sec">
        <div class="sbk-row"><span class="sbk-lab">{info.title}</span><span class="sbk-sub">{mine.length} of {list.length} earned</span></div>
        <span class="sbk-sub">{WHERE[info.kind]}</span>
      </div>
      <div class="jp-wd-grid">
        {CAN_BE_EMPTY.has(slot) && tile(undefined, EMPTY_WORD[slot] ?? 'Nothing', on ? 'own' : 'on', on ? 'Tap to take off' : 'On now')}
        {list.map((l) => {
          const has = own.has(l.id) && ownsLook(l.id);
          const state = on === l.id ? 'on' : has ? 'own' : 'locked';
          const note = state === 'on' ? onWord(l) : has ? 'Owned' : howEarned(l, snap);
          return tile(l.id, l.title, state, note);
        })}
      </div>
      <p class="sbk-sub jp-wd-foot">Looks never change a rule, a price or what anyone can see.</p>
    </>
  );
}

/** Opens Trophies on the Wardrobe. `onChange` hears every change (online, it tells the room what you have on). */
export function Wardrobe({ onBack, onChange }: { onBack: () => void; onChange?: (look: Record<string, string>) => void }) {
  return <TrophyScreen tab="wardrobe" onBack={onBack} onLook={onChange} />;
}
