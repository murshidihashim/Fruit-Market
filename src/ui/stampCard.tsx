// The parts the stamp book screens share (PLAN-086): the stamp card, the tier pips, the awning strip, a portrait in
// its signboard frame and a trophy card's picture. The styles are in stampbook.css, loaded here so every screen that
// draws one of these has them.
import type { Ref } from 'preact';
import './stampbook.css';
import { frameOf, partsOf, type LookSet } from '../net/looks';
import { TIER_NAME, type Pic, type Tier } from './achievements';
import { Coin, Face } from './art';
import { customerArt, customerFocus, eventArt, eventFocus, favourArt, favourFocus, focusCss, shopScene, upgradeArt, upgradeFocus } from './deckArt';
import { FruitSvg } from './fruitIcons';
import { chosenColour } from './looks';
import { loadName } from './store';
import { SEAT_COLOURS } from './table';

/** "Mia's stall", or "Your stall" before a name is chosen. */
export const stallName = (): string => { const n = loadName().trim(); return n ? `${n}'s stall` : 'Your stall'; };

/** One stamp card: `size` cells in rows of ten, `filled` of them stamped, the last `fresh` of those in red (new). */
export function StampGrid({ size, filled, fresh = 0, gridRef }: { size: number; filled: number; fresh?: number; gridRef?: Ref<HTMLDivElement> }) {
  return (
    <div class="sbk-grid" ref={gridRef} role="img" aria-label={`${filled} of ${size} stamps`}>
      {Array.from({ length: size }, (_, i) => <i class={`sbk-cell ${i < filled ? (i >= filled - fresh ? 'n' : 's') : ''}`} />)}
    </div>
  );
}

/** A tier's mark: B, S or G. Dashed until it is earned; ringed in red when it was earned just now. */
export function Pip({ tier, on, fresh }: { tier: Tier; on: boolean; fresh?: boolean }) {
  return <i class={`sbk-pip ${tier} ${on ? 'on' : ''} ${fresh ? 'new' : ''}`} role="img" aria-label={`${TIER_NAME[tier]}${on ? ', earned' : ''}`}>{TIER_NAME[tier][0]}</i>;
}

/** The awning strip in a stall's colour: over your shelf, and thin on your box as a rival sees it. */
export function Awning({ colour, thin }: { colour: string; thin?: boolean }) {
  return <div class={`sbk-awn ${thin ? 'thin' : ''}`} style={{ '--a': colour }} aria-hidden="true" />;
}

/** A stall's awning colour: the one its player chose, else the colour of its seat at the table. */
export function awningColour(look: LookSet | undefined, seat: number): string {
  return chosenColour(look) ?? SEAT_COLOURS[((seat % SEAT_COLOURS.length) + SEAT_COLOURS.length) % SEAT_COLOURS.length];
}

export { shownAvatar } from './looks';

/** A small portrait in its player's signboard frame, wearing what they have on. */
export function FramedFace({ who, size, look }: { who: string; size: number; look?: LookSet }) {
  return <span class={`sbk-face fr-${frameOf(look)}`}><Face who={who} size={size} worn={partsOf(look)} /></span>;
}

/** A shopkeeper at their stall, cropped to the awning and the face (the picture on the signboard and the winner's block). */
export function StallPic({ avatar, size }: { avatar: string; size: number }) {
  const scene = shopScene(avatar);
  return scene ? <img class="sbk-scene" src={scene} alt="" decoding="async" draggable={false} /> : <Face who={avatar} size={size} />;
}

/** A trophy card's picture. */
export function TrophyPic({ pic }: { pic: Pic }) {
  const art = (src: string | null, pos: string) => (src ? <img class="sbk-art" src={src} alt="" decoding="async" loading="lazy" draggable={false} style={{ objectPosition: pos }} /> : null);
  if (pic.kind === 'fruit') return <FruitSvg id={pic.id} size={30} alt="" />;
  if (pic.kind === 'coin') return <Coin size={28} />;
  if (pic.kind === 'keeper') return art(shopScene(pic.avatar), '50% 12%');
  if (pic.kind === 'event') return art(eventArt(pic.id), focusCss(eventFocus(pic.id)));
  if (pic.kind === 'customer') return art(customerArt(pic.key), focusCss(customerFocus(pic.key)));
  if (pic.kind === 'upgrade') return art(upgradeArt(pic.id), focusCss(upgradeFocus(pic.id)));
  return art(favourArt(pic.id), focusCss(favourFocus(pic.id)));
}

/** The back arrow of the black bar. */
export function BackArrow() {
  return <svg width="18" height="16" viewBox="0 0 18 16" aria-hidden="true"><path d="M8 1 1 8l7 7M1 8h17" stroke="currentColor" stroke-width="2.5" fill="none" /></svg>;
}
