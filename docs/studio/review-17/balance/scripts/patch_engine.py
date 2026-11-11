#!/usr/bin/env python3
"""Adds the LAB switches to the engine (all off by default: behaviour is unchanged). Run from the repo root."""
import re, sys
from pathlib import Path

def sub(text, old, new, count=1, path=''):
    if old not in text:
        sys.exit(f'patch failed in {path}: {old[:70]!r} not found')
    return text.replace(old, new, count)

# ---------------- data.ts ----------------
p = Path('src/engine/data.ts')
t = p.read_text()
if 'export const LAB' in t:
    sys.exit('already patched')
t = sub(t, "export const NEST_EGG_BONUS = 8;", """/**
 * Lab switches for balance experiments (scripts/lab). Everything is off / null here, which is the published game.
 * Nothing in the app sets them.
 */
export const LAB: {
  /** Market float: at dawn (from day 2, after any inspection) a stall with less than this is topped up to it. */
  float: number;
  /** Float only for a stall with no fruit at all on its shelf. */
  floatEmptyOnly: boolean;
  /** On credit: a stall that starts the day with less than `netBelow` may take this many pieces on credit ... */
  credit: number;
  /** ... and owes their cost plus this fee each, paid from its cash after the rush (carried over until paid). */
  creditFee: number;
  /** Seconds box: a stall with less than `netBelow` at dawn takes 1 Soft piece free: 'market' (if one is there) or 'supply' (always). */
  seconds: 'off' | 'market' | 'supply';
  /** Odd jobs: a stall that ends its buying turn having bought nothing takes this many dollars (only if it began the day under `netBelow`). */
  oddJobs: number;
  netBelow: number;
  tipJar: number | null; nestEgg: number | null; earTip: [number, number] | null; bargainOff: number | null; charmerStart: number | null;
  /** Tip Jar also pays this for a customer served completely but not alone. */
  tipShared: number;
  /** Haggler: extra dollars on the first sale of each day. */
  hagglerFirst: number;
  juiceTip: number | null; juiceCap: number | null; juiceValue: number | null;
  /** Premium Display: dollars above the customer's limit for fresh fruit. */
  premiumUp: number | null;
  /** Order Book: fines divided by this (2 in the rules). 0: no fine at all. */
  bookDiv: number | null;
  /** Order Book also adds this to every piece its holder is paid for on a standing order. */
  bookBonus: number;
  barrowBuy: number | null; barrowShelf: number | null;
  /** What a rival is paid by a standing order: 'minus1' (rules 17), 'ceiling' (rules 14 to 16) or 'bid'. */
  rivalPay: 'minus1' | 'ceiling' | 'bid';
  /** Copies of each favour card at 2 to 4 stalls (5 and 6 stalls: half as many again, rounded up). */
  favourDeck: Partial<Record<FavourId, number>> | null;
  /** A standing-order fine never takes a stall below this much cash. */
  fineFloor: number;
  /** Soft fruit is accepted by Everyday customers too. */
  softEveryday: boolean;
  /** Health Inspector fine is capped at this much per stall (0: no cap). */
  inspectorCap: number;
} = {
  float: 0, floatEmptyOnly: false, credit: 0, creditFee: 1, seconds: 'off', oddJobs: 0, netBelow: 3,
  tipJar: null, nestEgg: null, earTip: null, bargainOff: null, charmerStart: null, tipShared: 0, hagglerFirst: 0,
  juiceTip: null, juiceCap: null, juiceValue: null, premiumUp: null, bookDiv: null, bookBonus: 0, barrowBuy: null, barrowShelf: null,
  rivalPay: 'minus1', favourDeck: null, fineFloor: 0, softEveryday: false, inspectorCap: 0,
};

export const NEST_EGG_BONUS = 8;""", path=str(p))
t = sub(t, "  return stalls >= 4 ? 2 : 1;\n}", "  if (LAB.earTip) return stalls >= 4 ? LAB.earTip[1] : LAB.earTip[0];\n  return stalls >= 4 ? 2 : 1;\n}", path=str(p))
t = sub(t, """  const kinds = [...new Set(FAVOUR_DECK)];
  const copies = stalls >= 5 ? 3 : 2;
  return kinds.flatMap((k) => Array.from({ length: copies }, () => k));""", """  const kinds = [...new Set(FAVOUR_DECK)];
  const copies = stalls >= 5 ? 3 : 2;
  if (LAB.favourDeck) return kinds.flatMap((k) => Array.from({ length: Math.ceil(((LAB.favourDeck![k] ?? 2) * copies) / 2) }, () => k));
  return kinds.flatMap((k) => Array.from({ length: copies }, () => k));""", path=str(p))
t = sub(t, """  if (!pref || stage === 'fresh') return true;
  return stage === 'okay' ? pref !== 'premium' : pref === 'bargain';""", """  if (!pref || stage === 'fresh') return true;
  return stage === 'okay' ? pref !== 'premium' : pref === 'bargain' || (LAB.softEveryday && pref === 'everyday');""", path=str(p))
p.write_text(t)

# ---------------- game.ts ----------------
p = Path('src/engine/game.ts')
t = p.read_text()
t = sub(t, "  CHARACTER_TRAIT, TRAIT_OFFER, TRAITS, UPGRADES, BIG_TABLE, MAX_UPGRADES, ORDER_CARDS, ORDER_LEAD, ROW_CAP,", "  CHARACTER_TRAIT, TRAIT_OFFER, TRAITS, UPGRADES, BIG_TABLE, MAX_UPGRADES, ORDER_CARDS, ORDER_LEAD, ROW_CAP, LAB,", path=str(p))
# player fields
t = sub(t, "  /** Specialities this shop may build tonight (empty on nights without a draft). */\n  upgradeOffer?: UpgradeId[];", "  /** Specialities this shop may build tonight (empty on nights without a draft). */\n  upgradeOffer?: UpgradeId[];\n  /** Lab: owed for pieces taken on credit; pieces taken on credit today; whether credit is open today; safety-net dollars received. */\n  debt?: number; creditUsed?: number; creditOk?: boolean; netGot?: number; firstSale?: boolean;", path=str(p))
t = sub(t, "  return p.upgrades.includes('barrow') ? BARROW_SHELF : BASE_SHELF;", "  return p.upgrades.includes('barrow') ? LAB.barrowShelf ?? BARROW_SHELF : BASE_SHELF;", path=str(p))
t = sub(t, "  return (p.upgrades.includes('barrow') ? BARROW_BUY : BASE_BUY) + (p.trait === 'basket' ? 1 : 0);", "  return (p.upgrades.includes('barrow') ? LAB.barrowBuy ?? BARROW_BUY : BASE_BUY) + (p.trait === 'basket' ? 1 : 0);", path=str(p))
t = sub(t, "  return pl?.trait === 'bargain' && pl.boughtToday === 0 ? Math.max(1, c - 1) : c;", "  return pl?.trait === 'bargain' && pl.boughtToday === 0 ? Math.max(1, c - (LAB.bargainOff ?? 1)) : c;", path=str(p))
t = sub(t, "  return c > 0 && pl.upgrades.includes('premium') && stageAt(f, pos) === 'fresh' ? c + 1 : c;", "  return c > 0 && pl.upgrades.includes('premium') && stageAt(f, pos) === 'fresh' ? c + (LAB.premiumUp ?? 1) : c;", path=str(p))
t = sub(t, "  if (t === 'nestegg') pl.cash = START_CASH + NEST_EGG_BONUS;\n  if (t === 'charmer') for (let k = 0; k < 4; k++)", "  if (t === 'nestegg') pl.cash = START_CASH + (LAB.nestEgg ?? NEST_EGG_BONUS);\n  if (t === 'charmer') for (let k = 0; k < (LAB.charmerStart ?? 4); k++)", path=str(p))
# inspector cap + float + seconds, in startDay
t = sub(t, "      const paid = Math.min(pl.cash, notSoCount(pl.stock) * s.event!.inspector!);", "      const paid = Math.min(pl.cash, LAB.inspectorCap > 0 ? LAB.inspectorCap : Infinity, notSoCount(pl.stock) * s.event!.inspector!);", path=str(p))
t = sub(t, """  for (const p of s.players) {
    p.boughtToday = 0;
    p.spentToday = 0;
    p.favouredTrade = false;
    delete p.shade;
    p.upgradeOffer = [];
  }""", """  for (const p of s.players) {
    p.boughtToday = 0;
    p.spentToday = 0;
    p.favouredTrade = false;
    delete p.shade;
    p.upgradeOffer = [];
    // Lab safety nets (all off in the published rules).
    if (LAB.hagglerFirst) p.firstSale = false;
    const low = s.day > 1 && p.cash < LAB.netBelow;
    if (LAB.credit > 0) { p.creditOk = low; p.creditUsed = 0; }
    if (LAB.oddJobs > 0) p.creditOk = low;
    if (low && LAB.seconds !== 'off' && count(p.stock) < shelfSize(p)) {
      const order: FruitId[] = ['mango', 'watermelon', 'apple', 'blueberry'];
      const f = LAB.seconds === 'supply' ? (s.forecast?.pref === 'bargain' ? s.forecast.wants[0].fruit : 'watermelon') : order.find((x) => s.market[x][0] > 0);
      if (f) { if (LAB.seconds === 'market') s.market[f][0]--; p.stock[f][0]++; p.netGot = (p.netGot ?? 0) + 1; }
    }
    if (LAB.float > 0 && s.day > 1 && p.cash < LAB.float && (!LAB.floatEmptyOnly || count(p.stock) === 0)) { p.netGot = (p.netGot ?? 0) + LAB.float - p.cash; p.cash = LAB.float; }
  }""", path=str(p))
# rival pay
t = sub(t, "  return Math.max(1, bid - 1);\n}", "  return Math.max(1, bid - 1);\n}\n/** Lab: what a rival is paid, by the rule under test. */\nfunction rivalPayFor(o: { price: number; ceiling: number }): number {\n  return LAB.rivalPay === 'ceiling' ? o.ceiling : LAB.rivalPay === 'bid' ? o.price : orderRivalPay(o.price);\n}", path=str(p))
t = sub(t, "        const price = p === c.order!.holder ? c.order!.price : orderRivalPay(c.order!.price);", "        const price = p === c.order!.holder ? c.order!.price + (s.players[p].upgrades.includes('orderbook') ? LAB.bookBonus : 0) : rivalPayFor(c.order!);", path=str(p))
# credit in canBuy / buy
t = sub(t, "  if (pl.cash < buyCost(s, p, f, pos)) return 'Not enough cash';\n  return null;\n}", "  if (pl.cash < buyCost(s, p, f, pos) && !creditOpen(pl)) return 'Not enough cash';\n  return null;\n}\n\n/** Lab: may this stall take a piece on credit right now? */\nexport function creditOpen(pl: Player): boolean {\n  return LAB.credit > 0 && !!pl.creditOk && (pl.creditUsed ?? 0) < LAB.credit;\n}\n/** Lab: would this purchase go on credit (the stall cannot pay for it)? */\nexport function onCredit(s: GameState, p: number, f: FruitId, pos: number): boolean {\n  const pl = s.players[p];\n  return creditOpen(pl) && pl.cash < buyCost(s, p, f, pos);\n}", path=str(p))
t = sub(t, """  s.market[f][pos]--;
  pl.stock[f][shelfPos(pl, f, pos)]++;
  pl.cash -= cost;
  pl.stats.spent += cost;
  pl.spentToday += cost;
  pl.boughtToday++;
  return s;""", """  s.market[f][pos]--;
  pl.stock[f][shelfPos(pl, f, pos)]++;
  if (pl.cash < cost && creditOpen(pl)) {
    pl.debt = (pl.debt ?? 0) + cost + LAB.creditFee;
    pl.creditUsed = (pl.creditUsed ?? 0) + 1;
    pl.netGot = (pl.netGot ?? 0) + 1;
    pl.boughtToday++;
    return s;
  }
  pl.cash -= cost;
  pl.stats.spent += cost;
  pl.spentToday += cost;
  pl.boughtToday++;
  return s;""", path=str(p))
# odd jobs at the end of the buying turn
t = sub(t, """  requireActive(state, p, 'buy');
  const s = clone(state);
  s.turn++;""", """  requireActive(state, p, 'buy');
  const s = clone(state);
  if (LAB.oddJobs > 0 && s.players[p].creditOk && s.players[p].boughtToday === 0) { s.players[p].cash += LAB.oddJobs; s.players[p].netGot = (s.players[p].netGot ?? 0) + LAB.oddJobs; }
  s.turn++;""", path=str(p))
# juice tip, haggler first sale
t = sub(t, "        const juice = pl.upgrades.includes('juicebar') ? JUICE_TIP * sold.filter((i) => stageAt(w.fruit, i) !== 'fresh').length : 0;\n        if (juice) o.juice = juice;\n        const gain = n * o.price + juice;", "        const juice = pl.upgrades.includes('juicebar') ? (LAB.juiceTip ?? JUICE_TIP) * sold.filter((i) => stageAt(w.fruit, i) !== 'fresh').length : 0;\n        if (juice) o.juice = juice;\n        let gain = n * o.price + juice;\n        if (LAB.hagglerFirst && pl.trait === 'haggler' && !pl.firstSale && !c.order) { pl.firstSale = true; gain += LAB.hagglerFirst; }", path=str(p))
# order fine: book divisor and fine floor
t = sub(t, "      const fine = Math.min(hp.cash, Math.floor((short * o.fine) / (hp.upgrades.includes('orderbook') ? 2 : 1)));", "      const div = hp.upgrades.includes('orderbook') ? LAB.bookDiv ?? 2 : 1;\n      const fine = Math.min(Math.max(0, hp.cash - LAB.fineFloor), div === 0 ? 0 : Math.floor((short * o.fine) / div));", path=str(p))
# tip jar
t = sub(t, """        if (pl.trait === 'favourite') {
          pl.cash += LOCAL_FAVOURITE_TIP;
          pl.stats.earned += LOCAL_FAVOURITE_TIP;
          res.income[p] += LOCAL_FAVOURITE_TIP;
        }""", """        if (pl.trait === 'favourite') {
          const tip = LAB.tipJar ?? LOCAL_FAVOURITE_TIP;
          pl.cash += tip;
          pl.stats.earned += tip;
          res.income[p] += tip;
        }""", path=str(p))
t = sub(t, "    const done = c.wants.every((w) => w.qty <= 0);\n    if (done) {\n      res.happy.push(c.name);", "    const done = c.wants.every((w) => w.qty <= 0);\n    if (done) {\n      res.happy.push(c.name);\n      if (LAB.tipShared && suppliers.size > 1) for (const q of suppliers) if (s.players[q].trait === 'favourite') { s.players[q].cash += LAB.tipShared; s.players[q].stats.earned += LAB.tipShared; res.income[q] += LAB.tipShared; }", path=str(p))
# pay credit after the rush
t = sub(t, "  if (s.config.pulse) updatePulse(s);\n  // Rules 14: nobody waits overnight.", "  if (LAB.credit > 0) for (const pl of s.players) if (pl.debt) { const pay = Math.min(pl.cash, pl.debt); pl.cash -= pay; pl.stats.spent += pay; pl.debt -= pay; }\n  if (s.config.pulse) updatePulse(s);\n  // Rules 14: nobody waits overnight.", path=str(p))
# juice at night
t = sub(t, "  const juice = pl.upgrades.includes('juicebar') ? Math.min(JUICE_CAP, leaving) : 0;", "  const juice = pl.upgrades.includes('juicebar') ? Math.min(LAB.juiceCap ?? JUICE_CAP, leaving) : 0;", path=str(p))
t = sub(t, "    pl.cash += JUICE_VALUE * juice;\n    pl.stats.earned += JUICE_VALUE * juice;", "    pl.cash += (LAB.juiceValue ?? JUICE_VALUE) * juice;\n    pl.stats.earned += (LAB.juiceValue ?? JUICE_VALUE) * juice;", path=str(p))
p.write_text(t)

# ---------------- ai.ts ----------------
p = Path('src/engine/ai.ts')
t = p.read_text()
t = sub(t, "  type Crate, type Customer, type GameState, type Level, type Post, type Stall, type Standing, type Stock, orderRivalPay,\n} from './game';", "  type Crate, type Customer, type GameState, type Level, type Post, type Stall, type Standing, type Stock, orderRivalPay, onCredit,\n} from './game';", path=str(p))
t = sub(t, "import { CUSTOMER_CARDS, FARMER_CARDS, FAVOURS, FRUIT, FRUITS, JAM_PRICE,", "import { LAB, CUSTOMER_CARDS, FARMER_CARDS, FAVOURS, FRUIT, FRUITS, JAM_PRICE,", path=str(p))
t = sub(t, "      const cost = buyCost(s, p, f, pos);\n      let score = fruitValue(s, p, f, shelfPos(s.players[p], f, pos), 0, cost) - cost;", "      const cost = buyCost(s, p, f, pos) + (onCredit(s, p, f, pos) ? LAB.creditFee : 0);\n      let score = fruitValue(s, p, f, shelfPos(s.players[p], f, pos), 0, cost) - cost;", path=str(p))
p.write_text(t)
print('patched')
