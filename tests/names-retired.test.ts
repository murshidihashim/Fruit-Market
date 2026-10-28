import { describe, expect, it } from 'vitest';
import { readdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { CUSTOMER_LOOKS, EVENT_CARDS, CUSTOMER_CARDS } from '../src/engine/data';

const walk = (d: string): string[] => readdirSync(d, { withFileTypes: true }).flatMap((e) => (e.isDirectory() ? walk(join(d, e.name)) : [join(d, e.name)]));
const lines = (f: string) => readFileSync(f, 'utf8').split(/\r?\n/).map((l, i) => ({ f, i: i + 1, l })).filter((x) => !/^\s*(\/\/|\*|\/\*)/.test(x.l));

// PLAN-031 / DEC-035: the names players read. Retired words must not come back.
const RETIRED: RegExp[] = [
  /Farmers[’']? [Mm]arket/, /farmers market/, /Market Gossip/, /Local Favourite/, /\bBarrow\b/, /[Ss]pecialit(y|ies)/, /Last Call/,
  /Core market/, /Market pulse/, /Street prices?/, /Open stalls/, /\b[Nn]ot[- ]so\b/, /Daily challenge/, /Farmer cards?/, /Open the (market|shops)/,
];
const SHOP = /\bshops?\b/;
const SHOP_OK = /world shops|shop-total|shopTotal/;

describe('the names (PLAN-031)', () => {
  const files = [
    'RULES.md', 'src/engine/data.ts', 'src/engine/story.ts', 'server/room.ts',
    ...walk('src/ui').filter((f) => /\.(ts|tsx)$/.test(f) && !/palette\.ts$/.test(f)),
  ];
  const all = files.flatMap(lines);

  it('no retired name appears in the rules or in text the game shows', () => {
    const bad = all.filter((x) => RETIRED.some((r) => r.test(x.l))).map((x) => `${x.f}:${x.i}: ${x.l.trim().slice(0, 90)}`);
    expect(bad).toEqual([]);
  });

  it('a player\'s place is a stall, not a shop', () => {
    const bad = all.filter((x) => SHOP.test(x.l) && !SHOP_OK.test(x.l)).map((x) => `${x.f}:${x.i}: ${x.l.trim().slice(0, 90)}`);
    expect(bad).toEqual([]);
  });
});

// PLAN-036 T5: a quirk says what someone does, never who they are.
describe('customer quirks (PLAN-036)', () => {
  const names = [...CUSTOMER_CARDS.map((c) => c.name), ...EVENT_CARDS.filter((e) => e.extra).map((e) => e.extra!.name)];
  it('none defines a person by what they are, and each says something they do', () => {
    const identity = /\b(is|are|was|were) (a|an|the|very|so)\b|\b(old|young|elderly|fat|thin|poor|rich|malay|chinese|indian|muslim|christian|hindu|buddhist|foreign|local)\b/i;
    const action = /\b([A-Za-z]+(s|ed|ing)|will|need|needs|want|wants|pay|pays|pull|pulls|say|says)\b/;
    for (const n of names) {
      const q = CUSTOMER_LOOKS[n].quirk;
      expect(q, `${n}: "${q}"`).not.toMatch(identity);
      expect(q, `${n}: "${q}"`).toMatch(action);
    }
  });
});
