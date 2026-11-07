// DEC-064 / DEC-065: the approved display names for all 45 characters ("The Great Fruit Exchange" deck).
// Only display text changed: every hidden key, freshness type, want and price stays as it was.
import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { autoplay } from '../src/engine/ai';
import { dailyConfig } from '../src/engine/daily';
import {
  CHARACTER_TRAIT, CUSTOMER_CARDS, EVENT_CARDS, FRUIT, GENEROUS_BONUS, LEGACY_RIVAL_NAMES, PREF_INFO, RIVALS, STREET_PRICE, TRAITS, lookOf, prefOf,
  type TraitId,
} from '../src/engine/data';
import { newGame, ranking } from '../src/engine/game';
import { ACHIEVEMENTS, evaluate, progressOf, type Context } from '../src/ui/achievements';

/** Shopkeepers in table order: display name, hidden avatar key, perk. */
const SHOPKEEPERS: [string, string, TraitId][] = [
  ['Rosa', '🦊', 'haggler'], ['Uncle Benny', '🐻', 'basket'], ['Ah Chen', '🐼', 'charmer'],
  ['Saleh', '🐸', 'nestegg'], ['Raj', '🦝', 'bargain'], ['Kiki', '🐷', 'favourite'],
];

/** Customers in card order 1-36: hidden key, display title, freshness type, wants (rules 9 prices). */
const CUSTOMERS: [string, string, string, string][] = [
  ['John', 'Cowboy Jack', 'everyday', '3 apple $7, 2 watermelon $6'],
  ['Robert', 'Bobby Books', 'everyday', '4 blueberry $6, 1 mango $8'],
  ['Daniel', 'Dr Bubbles', 'everyday', '1 mango $11, 3 apple $6, 2 blueberry $5'],
  ['Rara Jenab', 'Rara Jenab', 'premium', '3 mango $10, 2 blueberry $6'],
  ['Aisyah', 'Zara Zapp', 'everyday', '3 watermelon $8'],
  ['Ravi', 'Ravi Rocket', 'premium', '2 mango $12, 2 apple $5'],
  ['Mei Ling', 'Coral Mei', 'bargain', '4 blueberry $5, 1 watermelon $7'],
  ['Farid', 'Postman Pip', 'bargain', '4 apple $5'],
  ['Siti', 'Madam Siti', 'everyday', '1 mango $11, 3 watermelon $7'],
  ['Kumar', 'Magic Kumar', 'bargain', '2 watermelon $9, 2 blueberry $4'],
  ['Grace', 'Rockstar Grace', 'bargain', '2 apple $7, 2 mango $9'],
  ['Hafiz', 'Professor Pebble', 'bargain', '5 blueberry $5'],
  ['Wei Jie', 'Inspector Wei', 'bargain', '2 mango $10, 2 apple $4, 1 watermelon $8'],
  ['Nurul', 'Miss Marigold', 'everyday', '4 watermelon $7'],
  ['Priya', 'Dr Priya', 'everyday', '3 apple $6, 1 blueberry $7'],
  ['Ahmad', 'Captain Ahmad', 'premium', '5 mango $9'],
  ['Sarah', 'Lola Lens', 'everyday', '2 blueberry $7, 2 mango $10'],
  ['Tan', 'Grandpa Tan', 'everyday', '2 watermelon $8, 2 apple $6'],
  ['Lina', 'Miss Cha-Cha', 'premium', '1 apple $8, 3 mango $10'],
  ['Zul', 'Sleepy Zul', 'everyday', '3 blueberry $6, 2 watermelon $6'],
  ['Anna', 'Anna the Artist', 'premium', '3 mango $11'],
  ['Vijay', 'Otto Oddjob', 'everyday', '2 apple $5, 2 blueberry $6, 1 mango $12'],
  ['Hui Min', 'Mina Moss', 'everyday', '4 watermelon $7'],
  ['Osman', 'Firefighter Osman', 'everyday', '3 apple $5, 1 watermelon $9'],
  ['Jia Wen', 'Marina Wen', 'everyday', '2 apple $6, 2 mango $10'],
  ['Rizal', 'DJ Rizal', 'everyday', '3 blueberry $5, 2 watermelon $7'],
  ['Devi', 'Devi Bloom', 'premium', '4 mango $10'],
  ['Marcus', 'Marcus Hook', 'everyday', '3 apple $5, 1 mango $11, 1 blueberry $6'],
  ['Fatimah', 'Professor Fatimah', 'everyday', '2 watermelon $8, 2 blueberry $5'],
  ['Ben', 'Benny Bell', 'everyday', '3 watermelon $7'],
  ['Yuki', 'Akira Swift', 'everyday', '2 mango $9, 2 apple $6, 1 watermelon $7'],
  ['Hadi', 'Hadi Hammer', 'everyday', '4 blueberry $6'],
  ['Lakshmi', 'Baker Lakshmi', 'everyday', '2 apple $7, 2 watermelon $8'],
  ['Kenji', 'Kenji Kaze', 'everyday', '1 mango $11, 2 blueberry $5, 2 watermelon $9'],
  ['Mira', 'Herbalist Mira', 'everyday', '3 mango $10, 1 apple $5'],
  ['Hock Seng', 'Uncle Hock Seng', 'everyday', '3 apple $5, 2 watermelon $9'],
];

/** Guests: hidden key, display title, freshness type. */
const GUESTS: [string, string, string][] = [
  ['Influencer', 'The Influencer', 'premium'], ['Gym Club', 'The Gym Club', 'everyday'], ['Hotel Chef', 'The Hotel Chef', 'everyday'],
];

const guestCards = EVENT_CARDS.filter((e) => e.extra);
const rules = readFileSync('RULES.md', 'utf8');

describe('approved display names (DEC-064, DEC-065)', () => {
  it('the six shopkeepers have the approved names, in order, with unchanged avatar keys and perks', () => {
    expect(RIVALS.map((r) => [r.name, r.avatar, CHARACTER_TRAIT[r.avatar]])).toEqual(SHOPKEEPERS);
  });

  it('the 36 customers keep their keys, card order, freshness type and wants, and show the approved title', () => {
    const now = CUSTOMER_CARDS.map((c) => [c.name, lookOf(c.name).title, prefOf(c.name), c.wants.map((w) => `${w.qty} ${w.fruit} $${w.max}`).join(', ')]);
    expect(now).toEqual(CUSTOMERS);
  });

  it('the three guests keep their keys and titles', () => {
    expect(guestCards.map((e) => [e.extra!.name, lookOf(e.extra!.name).title, prefOf(e.extra!.name)])).toEqual(GUESTS);
  });

  it('all 45 display names are different', () => {
    const all = [...RIVALS.map((r) => r.name), ...CUSTOMERS.map((c) => c[1]), ...GUESTS.map((g) => g[1])];
    expect(all).toHaveLength(45);
    expect(new Set(all).size).toBe(45);
  });

  it('new games and the daily market use the approved shopkeeper names', () => {
    expect(dailyConfig('2026-11-07', 'Me').players.slice(1).map((p) => p.name)).toEqual(['Rosa', 'Uncle Benny', 'Ah Chen']);
  });
});

describe('the rules book uses the approved names', () => {
  it('the shopkeeper table names every shopkeeper with its perk', () => {
    for (const [name, , trait] of SHOPKEEPERS) expect(rules, name).toContain(`| ${name} | ${TRAITS[trait].title} |`);
  });

  it('the guest table matches the event cards exactly', () => {
    const wants = (e: (typeof guestCards)[number]) => e.extra!.wants
      .map((w) => `${w.qty} ${(w.qty === 1 ? FRUIT[w.fruit].name : FRUIT[w.fruit].plural).toLowerCase()} at $${w.max}`).join(', ');
    for (const e of guestCards) {
      const p = PREF_INFO[prefOf(e.extra!.name)];
      expect(e.extra!.wants.every((w) => w.fixed), e.id).toBe(true);
      expect(rules, e.id).toContain(`| ${lookOf(e.extra!.name).title} | ${e.title} | ${wants(e)} | ${p.title} (${p.short}) |`);
    }
  });

  it('the generous-customer list follows the engine rule', () => {
    const gen = CUSTOMER_CARDS.map((c, i) => ({ n: i + 1, t: lookOf(c.name).title, g: c.wants.some((w) => w.max >= STREET_PRICE[w.fruit] + GENEROUS_BONUS) })).filter((x) => x.g);
    const list = (xs: string[]) => `${xs.slice(0, -1).join(', ')} and ${xs[xs.length - 1]}`;
    expect(rules).toContain(`The ${gen.length} generous customers are numbers ${list(gen.map((x) => String(x.n)))} in the customer card list (${list(gen.map((x) => x.t))}).`);
  });

  it('no former shopkeeper or customer title is left', () => {
    const former = /\b(Kiran|Rancher John|Paleontologist|Delivery Rider|Photographer Sarah|Dancing Lina|Engineer Vijay|Judoka|Magician)\b|\| (Benny|Chen) \||\bHafiz\b/;
    expect(rules).not.toMatch(former);
  });
});

describe('progress saved under former shopkeeper names still counts', () => {
  const ctx = (sets: Record<string, string[]>): Context => ({ online: false, have: new Set(), sets, stats: { played: 1, totalSold: 1 }, streak: 0 });
  const rollCall = ACHIEVEMENTS.find((a) => a.id === 'rivals_all')!;

  it('the roll call names the six shopkeepers by their approved names', () => {
    for (const r of RIVALS) expect(rollCall.text).toContain(r.name);
    expect(rollCall.text).not.toMatch(/\bKiran\b|, Benny,|, Chen,/);
  });

  it('counts each shopkeeper once, whichever name was saved', () => {
    expect(progressOf(rollCall, { beaten: [...LEGACY_RIVAL_NAMES] }, { played: 0, totalSold: 0 })).toBe(6);
    expect(progressOf(rollCall, { beaten: ['Benny', 'Uncle Benny', 'Chen', 'Ah Chen'] }, { played: 0, totalSold: 0 })).toBe(2);
    expect(progressOf(rollCall, { beaten: ['Rosa', 'Uncle Benny', 'Chen', 'Saleh', 'Raj'] }, { played: 0, totalSold: 0 })).toBe(5);
  });

  it('earns Rival Roll Call from a mix of former and current names', () => {
    const g = autoplay(newGame({ players: [{ name: 'Me', kind: 'ai', level: 'hard', avatar: '' }, { name: 'X', kind: 'ai', level: 'easy', avatar: '' }], days: 8, unripe: true, upgrades: true, events: true, seed: 2 }));
    expect(evaluate(g, 0, ctx({ beaten: ['Rosa', 'Benny', 'Ah Chen', 'Saleh', 'Raj', 'Kiran'] })).got).toContain('rivals_all');
    expect(evaluate(g, 0, ctx({ beaten: ['Rosa', 'Benny', 'Uncle Benny', 'Saleh', 'Raj', 'Kiran'] })).got).not.toContain('rivals_all');
  });

  it('a game saved with a former name records the rival under its current name', () => {
    const won = Array.from({ length: 40 }, (_, i) => autoplay(newGame({
      players: [{ name: 'Me', kind: 'ai', level: 'hard', avatar: '' }, { name: 'Benny', kind: 'ai', level: 'easy', avatar: '🐻' }],
      days: 8, unripe: true, upgrades: true, events: true, seed: i + 1,
    }))).find((g) => ranking(g)[0] === 0);
    expect(won).toBeDefined();
    expect(evaluate(won!, 0, ctx({})).sets.beaten).toEqual(['Uncle Benny']);
  });
});
