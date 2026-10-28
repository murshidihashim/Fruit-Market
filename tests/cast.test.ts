import { describe, expect, it } from 'vitest';
import { CUSTOMER_CARDS, CUSTOMER_LOOKS, EVENT_CARDS, RIVALS } from '../src/engine/data';
import { portraitKeys } from '../src/ui/pixel';

// PLAN-036: one human cast (DEC-039 T1, DEC-040).
describe('the cast is all human', () => {
  const { humans, animals, avatarKey } = portraitKeys();
  const customerNames = [...CUSTOMER_CARDS.map((c) => c.name), ...EVENT_CARDS.filter((e) => e.extra).map((e) => e.extra!.name)];

  it('every shopkeeper draws a human portrait', () => {
    for (const r of RIVALS) {
      const key = avatarKey[r.avatar];
      expect(humans, r.name).toContain(key);
      expect(animals, r.name).not.toContain(key);
    }
  });

  it('every customer draws a human portrait and has a title and a quirk', () => {
    for (const n of customerNames) {
      expect(humans, n).toContain(n);
      expect(CUSTOMER_LOOKS[n]?.title, n).toBeTruthy();
      expect(CUSTOMER_LOOKS[n]?.quirk, n).toBeTruthy();
    }
  });

  it('no title or quirk makes anyone a creature', () => {
    const creature = /\b(vampire|zombie|robot|mermaid|genie|fairy|elf|unicorn|dino|dinosaur|witch|wizard|ghost|monster|alien|animal)\b/i;
    for (const n of customerNames) expect(`${CUSTOMER_LOOKS[n].title} ${CUSTOMER_LOOKS[n].quirk}`, n).not.toMatch(creature);
    for (const r of RIVALS) expect(`${r.name} ${r.quip} ${Object.values(r.lines).flat().join(' ')}`, r.name).not.toMatch(creature);
  });

  it('shopkeeper names are a plain first name', () => {
    for (const r of RIVALS) expect(r.name, r.name).toMatch(/^[A-Z][a-z]+$/);
  });
});
