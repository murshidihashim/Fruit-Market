import { describe, expect, it } from 'vitest';
import { CUSTOMER_CARDS, CUSTOMER_LOOKS, EVENT_CARDS, RIVALS } from '../src/engine/data';
import { facePic } from '../src/ui/art';
import { ART_COMING, customerArt, guestArt, shopBadge } from '../src/ui/deckArt';

// PLAN-036: one human cast (DEC-039 T1, DEC-040). Since DEC-066 every portrait is the owner's deck art, which
// draws people only; the pixel portraits (and the old animal faces) are gone.
describe('the cast is all human', () => {
  const customerNames = [...CUSTOMER_CARDS.map((c) => c.name), ...EVENT_CARDS.filter((e) => e.extra).map((e) => e.extra!.name)];

  it('every shopkeeper draws their own deck-art portrait', () => {
    const drawn = RIVALS.filter((r) => !ART_COMING.has(r.avatar)); // Pak Din and Farah: no art yet (rules 11)
    for (const r of drawn) {
      expect(facePic(r.avatar, 28).src, r.name).toBe(shopBadge(r.avatar));
      expect(facePic(r.avatar, 28).kind, r.name).toBe('keeper');
    }
    for (const r of RIVALS.filter((x) => ART_COMING.has(x.avatar))) expect(facePic(r.avatar, 28).kind, r.name).toBe('none');
    expect(new Set(drawn.map((r) => shopBadge(r.avatar))).size).toBe(drawn.length);
  });

  it('every customer draws a deck-art portrait and has a title and a quirk', () => {
    for (const n of customerNames) {
      expect(facePic(n, 28).src, n).toBe(customerArt(n) ?? guestArt(n));
      if (!ART_COMING.has(n)) expect(facePic(n, 28).src, n).toBeTruthy();
      expect(CUSTOMER_LOOKS[n]?.title, n).toBeTruthy();
      expect(CUSTOMER_LOOKS[n]?.quirk, n).toBeTruthy();
    }
  });

  it('no title or quirk makes anyone a creature', () => {
    const creature = /\b(vampire|zombie|robot|mermaid|genie|fairy|elf|unicorn|dino|dinosaur|witch|wizard|ghost|monster|alien|animal)\b/i;
    for (const n of customerNames) expect(`${CUSTOMER_LOOKS[n].title} ${CUSTOMER_LOOKS[n].quirk}`, n).not.toMatch(creature);
    for (const r of RIVALS) expect(`${r.name} ${r.quip} ${Object.values(r.lines).flat().join(' ')}`, r.name).not.toMatch(creature);
  });

  it('shopkeeper names are a first name, with at most a familiar title (DEC-064: Uncle Benny, Ah Chen; rules 11: Pak Din)', () => {
    for (const r of RIVALS) expect(r.name, r.name).toMatch(/^(?:(?:Uncle|Ah|Pak) )?[A-Z][a-z]+$/);
  });
});
