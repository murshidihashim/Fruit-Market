// The parts the stamp book screens share (PLAN-086): the stamp card, the tier pips, the awning strip, a portrait in
// its signboard frame and a trophy card's picture. PLAN-113 adds the pieces the progress screens draw a look with: a
// price tag, one look on its own, and your stall as a rival sees it. The styles are in stampbook.css and
// progress.css, loaded here so every screen that draws one of these has them.
import type { ComponentChildren, Ref } from 'preact';
import './stampbook.css';
import './progress.css';
import type { FruitId } from '../engine/data';
import { frameOf, lookById, partsOf, stallOf, tagOf, type Look, type LookSet, type Slot } from '../net/looks';
import { TIER_NAME, type Pic, type Tier } from './achievements';
import { Coin, Face } from './art';
import { customerArt, customerFocus, eventArt, eventFocus, favourArt, favourFocus, focusCss, shopScene, upgradeArt, upgradeFocus } from './deckArt';
import { FruitSvg } from './fruitIcons';
import { PropSprite, RoofBand } from './icons';
import { chosenColour } from './looks';
import { crateUrl } from './marketArt';
import { colourHex } from './progress';
import { loadName } from './store';
import { SEAT_COLOURS } from './table';

/** "Mia's stall", or "Your stall" before a name is chosen. */
export const stallName = (): string => { const n = loadName().trim(); return n ? `${n}'s stall` : 'Your stall'; };

/** One stamp card: `size` cells (rows of eight on the first rank's card of 15, of ten on the bigger ones), `filled`
 *  of them stamped, the last `fresh` of those marked new. */
export function StampGrid({ size, filled, fresh = 0, gridRef }: { size: number; filled: number; fresh?: number; gridRef?: Ref<HTMLDivElement> }) {
  return (
    <div class={`sbk-grid ${size <= 16 ? 'c8' : ''}`} ref={gridRef} role="img" aria-label={`${filled} of ${size} stamps`}>
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

/** A small portrait in its player's signboard frame, wearing what they have on. `portrait`: the face at any size (Face). */
export function FramedFace({ who, size, look, portrait }: { who: string; size: number; look?: LookSet; portrait?: boolean }) {
  return <span class={`sbk-face fr-${frameOf(look)}`}><Face who={who} size={size} worn={partsOf(look)} portrait={portrait} /></span>;
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

// ---------- PLAN-113: a look, drawn ----------

/** The awning colour of your own stall: the one you chose, else your seat's (the first seat's red). */
export const myColour = (look: LookSet | undefined): string => awningColour(look, 0);

/**
 * A price tag cut like the printed game's tag, in a price-tag style from the Wardrobe (`tag`: "ticket", "chalk",
 * "star", "hand"; only the edge changes, as on the table). `tone`: your own tag (yellow) or a tag that sold (green).
 */
export function PriceTag({ fruit, price, tag = 'ticket', tone, big }: { fruit?: FruitId; price: number; tag?: string; tone?: 'mine' | 'sold'; big?: boolean }) {
  return (
    <span class={`jp-tag tg-${tag} ${tone ?? ''} ${big ? 'big' : ''}`} aria-hidden="true">
      <span class="jp-tgf">{fruit && <FruitSvg id={fruit} size={big ? 18 : 14} alt="" />}<b>${price}</b></span>
    </span>
  );
}

/** A bell or coins, for a sound look (sounds are heard, so the picture only says which kind it is). */
function SoundMark({ slot }: { slot: Slot }) {
  return slot === 'bell'
    ? <svg class="jp-snd" width="30" height="30" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linejoin="round" aria-hidden="true"><path d="M6 16V11a6 6 0 0 1 12 0v5l2 2H4z" /><path d="M10 21h4" /><path d="M12 3v2" /></svg>
    : <Coin size={28} />;
}

/**
 * One look on its own, as it shows: a roof or a trim on your awning, a prop, a piece your shopkeeper wears, a frame
 * round your portrait, a title, a price tag, the results stamp, a colour, or the mark of a sound. `id` undefined draws
 * the slot with nothing in it (the plain awning, the bare portrait). `look`: what you have on now, for the rest of it.
 */
export function LookSwatch({ slot, id, look, avatar }: { slot: Slot; id?: string; look: LookSet; avatar: string }) {
  const colour = myColour(look);
  switch (slot) {
    case 'colour': return <i class="jp-col" style={{ background: (id ? colourHex(id.slice(4)) : null) ?? SEAT_COLOURS[0] }} />;
    case 'roof': return <RoofBand cls="jp-band" colour={colour} roof={id} />;
    case 'trim': return <RoofBand cls="jp-band" colour={colour} roof={stallOf(look).roof} trim={id} />;
    case 'prop': return id ? <PropSprite id={id} size={36} cls="jp-prop" /> : <i class="jp-none" />;
    case 'frame': return <FramedFace who={avatar} size={34} look={id ? { frame: id } : undefined} />;
    case 'title': return <span class="jp-sign">{(id && lookById(id)?.title) || 'No title'}</span>;
    case 'tag': return <PriceTag price={7} tag={id ? id.slice(4) : 'ticket'} />;
    case 'stamp': return id ? <span class="sbk-stamp">Sold out</span> : <i class="jp-none" />;
    case 'bell': case 'coin': return <SoundMark slot={slot} />;
    default: return <Face who={avatar} size={44} worn={id ? [id] : []} />;
  }
}

/**
 * Your stall as a rival sees it at the table: the awning in your colour with your roof and trim, your shopkeeper in
 * what they wear, your name, your crate with a few pieces on it and the prop on its counter, and your price tag.
 * The pieces and the price are only a sample: `$7`, the price the Wardrobe has always shown.
 */
export function StallPreview({ look, avatar, name, sample = true, children }: { look: LookSet; avatar: string; name: string; sample?: boolean; children?: ComponentChildren }) {
  const stall = stallOf(look);
  const w = 132, bh = Math.round(w * 0.36);
  const crate = crateUrl('melon', w, bh);
  const scale = w / crate.vw;
  return (
    <div class="jp-stall">
      <RoofBand cls="jp-awn" colour={myColour(look)} roof={stall.roof} trim={stall.trim} />
      <div class="jp-who"><FramedFace who={avatar} size={40} look={look} /><b>{name}</b></div>
      {sample && (
        <div class="jp-crate" style={{ width: `${w}px` }}>
          <div class="jp-crate-fruit">{(['blueberry', 'blueberry', 'watermelon', 'watermelon'] as FruitId[]).map((f) => <FruitSvg id={f} size={22} alt="" />)}</div>
          <span class="jp-crate-box" style={{ height: `${Math.round((bh + 2) * scale)}px` }}>
            <img src={crate.url} width={w} alt="" draggable={false} style={{ marginTop: `${-Math.round(crate.top * scale)}px` }} />
          </span>
          {stall.prop && <PropSprite id={stall.prop} size={30} cls="jp-crate-prop" />}
        </div>
      )}
      {sample && <PriceTag fruit="watermelon" price={7} tag={tagOf(look)} tone="mine" big />}
      {look.stamp && <span class="sbk-stamp jp-stall-stamp">Sold out</span>}
      {children}
    </div>
  );
}

/** Where a look shows, for the line under it: "On your stall", "Wearing", "In use". */
export const onWord = (l: Pick<Look, 'kind'>): string => (l.kind === 'wear' ? 'Wearing' : l.kind === 'sound' ? 'In use' : 'On your stall');
