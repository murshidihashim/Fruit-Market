// Named rule variants for the A/B tests. Each one changes numbers in the data tables or flips LAB switches.
// Used as:  --patch name1,name2   and/or   --lab '{"float":3}'
import { EVENT_CARDS, FRUIT, LAB, ORDER_CARDS, UPGRADES } from '../../src/engine/data';
import { arg } from './harness';

const ev = (id: string) => EVENT_CARDS.find((e) => e.id === id)!;

export const PATCHES: Record<string, () => void> = {
  // ----- shopkeepers -----
  hagglerFirst1: () => { LAB.hagglerFirst = 1; },
  aiPlainHaggler: () => { LAB.aiPlainHaggler = true; },
  tipShared2: () => { LAB.tipShared = 2; },
  hagglerFirst2: () => { LAB.hagglerFirst = 2; },
  tip3: () => { LAB.tipJar = 3; },
  tip4: () => { LAB.tipJar = 4; },
  tip5: () => { LAB.tipJar = 5; },
  tipShared1: () => { LAB.tipShared = 1; },
  tip3shared1: () => { LAB.tipJar = 3; LAB.tipShared = 1; },
  tip4shared1: () => { LAB.tipJar = 4; LAB.tipShared = 1; },
  tip4shared2: () => { LAB.tipJar = 4; LAB.tipShared = 2; },
  nest16: () => { LAB.nestEgg = 6; },
  nest15: () => { LAB.nestEgg = 5; },
  ear2: () => { LAB.earTip = [2, 2]; },
  ear23: () => { LAB.earTip = [2, 3]; },
  charmer3: () => { LAB.charmerStart = 3; },
  // ----- upgrades -----
  premium4: () => { UPGRADES.premium.cost = 4; },
  premium5: () => { UPGRADES.premium.cost = 5; },
  premiumUp2: () => { LAB.premiumUp = 2; },
  book3: () => { UPGRADES.orderbook.cost = 3; },
  book4: () => { UPGRADES.orderbook.cost = 4; },
  bookNoFine: () => { LAB.bookDiv = 0; },
  bookBonus1: () => { LAB.bookBonus = 1; },
  bookBonus2: () => { LAB.bookBonus = 2; },
  juice3: () => { UPGRADES.juicebar.cost = 3; },
  juiceTip2: () => { LAB.juiceTip = 2; },
  ripening5: () => { UPGRADES.ripening.cost = 5; },
  ripening4: () => { UPGRADES.ripening.cost = 4; },
  ripening3: () => { UPGRADES.ripening.cost = 3; },
  ripeningOff1: () => { LAB.ripeningOff = 1; },
  juice5: () => { UPGRADES.juicebar.cost = 5; },
  juice6: () => { UPGRADES.juicebar.cost = 6; },
  barrow5: () => { UPGRADES.barrow.cost = 5; },
  book2: () => { UPGRADES.orderbook.cost = 2; },
  ripening8: () => { UPGRADES.ripening.cost = 8; },
  barrow8: () => { UPGRADES.barrow.cost = 8; },
  barrow7: () => { UPGRADES.barrow.cost = 7; },
  // ----- standing orders -----
  rivalCeiling: () => { LAB.rivalPay = 'ceiling'; },
  rivalBid: () => { LAB.rivalPay = 'bid'; },
  fineLow: () => { for (const c of ORDER_CARDS) c.fine = { blueberry: 4, watermelon: 6, apple: 5, mango: 9 }[c.fruit]; },
  mangoOrder: () => { for (const c of ORDER_CARDS) if (c.fruit === 'mango') { c.fine = 9; } },
  // ----- events -----
  inspector1: () => { ev('inspector').inspector = 1; },
  guestOverCap: () => { LAB.guestOverCap = true; },
  inspectorCap4: () => { LAB.inspectorCap = 4; },
  blight3: () => { ev('blight').price = { apple: 3 }; },
  glutFlat: () => { ev('glut').price = {}; },
  glutCheap: () => { ev('glut').costFruit = { blueberry: -1 }; },
  windfallRipe: () => { LAB.eventExtraRipe = true; },
  windfallRipe1: () => { LAB.eventExtraRipe = true; ev('mangoWindfall').price = { mango: -1 }; },
  goodHarvestCheap: () => { ev('goodHarvest').cost = -1; },
  glut2: () => { ev('glut').supplyEach = { blueberry: 2 }; },
  monsoonKeep: () => { ev('monsoon').walkIns = 0; },
  heat3: () => { ev('heatwave').price = { watermelon: 3 }; },
  strikeHalf: () => { const e = ev('strike'); e.noDelivery = false; e.supplyMult = 0.5; },
  // ----- fruit -----
  blueberry1: () => { FRUIT.blueberry.cost.fresh = 1; },
  appleCost2: () => { FRUIT.apple.cost.fresh = 2; FRUIT.apple.cost.okay = 1; },
  mangoCost4: () => { FRUIT.mango.cost.unripe = 4; },
  softEveryday: () => { LAB.softEveryday = true; },
  // ----- favours -----
  deckNoScout: () => { LAB.favourDeck = { scout: 0, gossip: 3, freeFruit: 3 }; },
  // ----- safety nets -----
  float3: () => { LAB.float = 3; },
  float5: () => { LAB.float = 5; LAB.netBelow = 5; },
  float3empty: () => { LAB.float = 3; LAB.floatEmptyOnly = true; },
  float5empty: () => { LAB.float = 5; LAB.netBelow = 5; LAB.floatEmptyOnly = true; },
  float3loan: () => { LAB.float = 3; LAB.floatLoanFee = 1; },
  float4: () => { LAB.float = 4; LAB.netBelow = 4; },
  credit2: () => { LAB.credit = 2; },
  secondsMarket: () => { LAB.seconds = 'market'; },
  secondsSupply: () => { LAB.seconds = 'supply'; },
  oddJobs3: () => { LAB.oddJobs = 3; },
  fineFloor3: () => { LAB.fineFloor = 3; },
};

/** Applies --lab JSON and --patch names from the command line; returns a label. */
export function applyVariant(names = arg('patch'), lab = arg('lab')): string {
  if (lab) Object.assign(LAB, JSON.parse(lab));
  for (const k of (names ?? '').split(',').filter(Boolean)) {
    if (!PATCHES[k]) throw new Error(`unknown patch ${k}`);
    PATCHES[k]();
  }
  return [names, lab].filter(Boolean).join(' ') || 'current rules';
}
