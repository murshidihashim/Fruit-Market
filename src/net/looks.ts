// The one list of looks (PLAN-086): pieces for your stall (colour, roof, trim, a prop on the counter), things your
// shopkeeper wears (hat, face, neck, badge, in hand), your signboard (frame, title), your price tag, your results
// stamp, and the sounds your own phone makes. Shared by the app and the room server, so the server can check what a
// player says they have on. Looks are only for show: nothing here changes a rule, a price or what anyone can see.
//
// Every item says its kind, where it shows and where it comes from: a trophy tier, a stall level, free, or (later) a
// pack. Adding an item is one new line. A pack item is never shown to a room unless the server holds a grant for it
// (cleanLook), and no phone can write a grant for itself.

export type LookKind = 'wear' | 'stall' | 'sign' | 'sound';
export type Slot = 'hat' | 'face' | 'neck' | 'badge' | 'hand' | 'roof' | 'trim' | 'prop' | 'colour' | 'frame' | 'title' | 'tag' | 'stamp' | 'bell' | 'coin';

/** Where a look is drawn. 'phone' means only on the player's own phone: it is never sent to a room. */
export type Place = 'table' | 'home' | 'lobby' | 'results' | 'wardrobe' | 'phone';

/** Where a look comes from. `fair` (a trophy's title that rivals read as skill): the tier must have been earned
 *  against Normal or harder computers, in a Daily market or at a table of people. */
export type Source =
  | { kind: 'trophy'; id: string; fair?: boolean }
  | { kind: 'level'; level: number }
  | { kind: 'free' }
  | { kind: 'pack'; id: string };

export interface Look { id: string; title: string; kind: LookKind; slot: Slot; from: Source; shows: Place[] }

const PUBLIC: Place[] = ['table', 'home', 'lobby', 'results', 'wardrobe'];
const SIGN: Place[] = ['home', 'lobby', 'results', 'wardrobe'];
const OWN: Place[] = ['phone', 'wardrobe'];

/** `shows`: where every look in the slot is drawn. A slot that shows on 'phone' only never leaves the phone. */
export const SLOTS: { id: Slot; title: string; kind: LookKind; shows: Place[] }[] = [
  { id: 'hat', title: 'Hat', kind: 'wear', shows: PUBLIC },
  { id: 'face', title: 'Face', kind: 'wear', shows: PUBLIC },
  { id: 'neck', title: 'Neck', kind: 'wear', shows: PUBLIC },
  { id: 'badge', title: 'Badge', kind: 'wear', shows: PUBLIC },
  { id: 'hand', title: 'In hand', kind: 'wear', shows: PUBLIC },
  { id: 'colour', title: 'Colour', kind: 'stall', shows: PUBLIC },
  { id: 'roof', title: 'Roof', kind: 'stall', shows: PUBLIC },
  { id: 'trim', title: 'Trim', kind: 'stall', shows: PUBLIC },
  { id: 'prop', title: 'Counter', kind: 'stall', shows: SIGN },
  { id: 'frame', title: 'Frame', kind: 'sign', shows: SIGN },
  { id: 'title', title: 'Title', kind: 'sign', shows: SIGN },
  { id: 'tag', title: 'Price tag', kind: 'sign', shows: ['table', 'wardrobe'] },
  { id: 'stamp', title: 'Results stamp', kind: 'sign', shows: ['results', 'wardrobe'] },
  { id: 'bell', title: 'Bell', kind: 'sound', shows: OWN },
  { id: 'coin', title: 'Coins', kind: 'sound', shows: OWN },
];
const slotOf = (id: Slot) => SLOTS.find((s) => s.id === id)!;
/** True when a slot's looks are sent to a room (everything except the sounds). */
export const slotIsPublic = (id: string): boolean => !!SLOTS.find((s) => s.id === id && !s.shows.includes('phone'));

const item = (id: string, title: string, slot: Slot, from: Source): Look => ({ id, title, kind: slotOf(slot).kind, slot, from, shows: slotOf(slot).shows });
const by = (id: string, fair?: boolean): Source => (fair ? { kind: 'trophy', id, fair } : { kind: 'trophy', id });
const at = (level: number): Source => ({ kind: 'level', level });
const FREE: Source = { kind: 'free' };

/** The eight stall colours, free for everyone. The id after "col_" is the colour's id in progress.ts (COLOURS). */
export const COLOUR_IDS = ['terra', 'teal', 'olive', 'gold', 'plum', 'night', 'rose', 'royal'] as const;
const COLOUR_NAMES: Record<(typeof COLOUR_IDS)[number], string> = {
  terra: 'Terracotta', teal: 'Teal', olive: 'Olive', gold: 'Saffron', plum: 'Plum', night: 'Navy', rose: 'Rose', royal: 'Purple',
};

/** The six ranks' titles (levels 1, 6, 11, 16, 21 and 26) and the signboard frames that come with them. */
export const RANK_LEVELS = [1, 6, 11, 16, 21, 26] as const;
const RANK_NAMES = ['Roadside Table', 'Five-Foot Way', 'Covered Stall', 'Corner Lot', 'Shophouse', 'Towkay'];
const FRAME_NAMES = ['Plain', 'Painted board', 'Lantern string', 'Brass plate', 'Carved wood', 'Gold leaf'];
const FRAME_IDS = ['frame_plain', 'frame_painted', 'frame_lantern', 'frame_brass', 'frame_carved', 'frame_gold'];

export const LOOKS: Look[] = [
  item('straw_boater', 'Trader\'s Bowler', 'hat', by('first_win')),
  item('fruit_basket_hat', 'Porter\'s Cap', 'hat', by('mango_mogul')),
  item('party_hat', 'Gazette Paper Hat', 'hat', by('festival_rush')),
  item('laurel', 'Brass Laurel', 'hat', by('streak7')),
  item('gold_crown', 'Chairman\'s Top Hat', 'hat', by('league')),
  item('monocle', 'Brass Loupe', 'face', by('sky_high')),
  item('bow_tie', 'Banknote Bow Tie', 'neck', by('red_carpet')),
  item('scarf', 'Ticker-Tape Scarf', 'neck', by('no_waste')),
  item('apron', 'Trader\'s Waistcoat', 'neck', by('fully_fitted')),
  item('sash', 'Certificate Sash', 'neck', by('rivals_all')),
  item('medal', 'Exchange Medal', 'badge', by('played_200')),
  // The Great Fruit Exchange unlockables (PLAN-053).
  item('trader_visor', 'Trader\'s Visor', 'hat', by('full_price')),
  item('pencil_slip', 'Pencil and Order Slip', 'face', by('sole_five')),
  item('ticker_garland', 'Ticker-Tape Garland', 'neck', by('tie_breaker')),
  item('pocket_watch', 'Pocket Watch', 'badge', by('comeback')),
  item('member_badge', 'Member\'s Badge', 'badge', by('beat_hard')),
  item('hand_bell', 'Brass Hand Bell', 'hand', by('full_house')),

  ...COLOUR_IDS.map((c) => item(`col_${c}`, COLOUR_NAMES[c], 'colour', FREE)),
  item('roof_stripes', 'Striped Roof', 'roof', by('first_sale')),
  item('roof_scallops', 'Scalloped Roof', 'roof', by('town_12')),
  item('roof_checks', 'Checked Roof', 'roof', by('played_10')),
  item('roof_stars', 'Starry Roof', 'roof', by('big_day')),
  item('roof_fruit', 'Fruit-Print Roof', 'roof', by('sold_500')),
  item('trim_bunting', 'Bunting', 'trim', by('streak3')),
  item('trim_lanterns', 'Paper Lanterns', 'trim', by('worth_wait')),
  item('trim_tassels', 'Tassels', 'trim', by('town_36')),
  item('prop_blackboard', 'Chalk Board', 'prop', by('jam_session')),
  item('prop_scale', 'Brass Scales', 'prop', by('penny_under')),
  item('prop_plant', 'Plant Pot', 'prop', by('bare_stall')),
  item('prop_crates', 'Crate Stack', 'prop', by('sold_100')),
  item('prop_cat', 'Stall Cat', 'prop', by('played_50')),
  item('prop_golden_apple', 'Golden Apple', 'prop', by('rich')),

  // The stamp book's rewards (PLAN-086): signboard frames and rank titles with each rank; price tags, sounds and the
  // results stamp with levels 2 to 10. None needs a picture.
  ...FRAME_IDS.map((id, i) => item(id, FRAME_NAMES[i], 'frame', at(RANK_LEVELS[i]))),
  ...RANK_NAMES.map((n, i) => item(`title_rank${i + 1}`, `${n} trader`, 'title', at(RANK_LEVELS[i]))),
  // Titles for feats. The ones rivals read as skill are `fair` (see Source).
  item('title_league', 'League Champion', 'title', by('league')),
  item('title_rich', 'Fruit Tycoon', 'title', by('rich', true)),
  item('title_hard_sweep', 'Hard Sweep', 'title', by('hard_sweep')),
  item('title_sole', 'Sole Supplier', 'title', by('sole_five', true)),
  item('title_top_price', 'Top Price', 'title', by('full_price_15', true)),
  item('title_best_day', 'Best Day', 'title', by('day_70', true)),
  item('title_roll_call', 'Roll Call', 'title', by('rivals_hard')),
  item('title_all_eight', 'All Eight', 'title', by('shop_8')),
  item('title_orders', 'By Appointment', 'title', by('orders_8')),
  item('title_online', 'Town Favourite', 'title', by('online_wins_25')),
  item('title_veteran', 'Veteran', 'title', by('played_200')),
  item('title_baron', 'Fruit Baron', 'title', by('sold_2000')),
  item('title_daily', 'Thirty Markets', 'title', by('daily_30')),
  item('title_streak', 'Month of Markets', 'title', by('streak30')),

  item('tag_ticket', 'Ticket', 'tag', FREE),
  item('tag_chalk', 'Chalk slate', 'tag', at(2)),
  item('tag_star', 'Star card', 'tag', at(5)),
  item('tag_hand', 'Hand-written card', 'tag', at(8)),
  item('stamp_soldout', '"Sold out" stamp', 'stamp', at(10)),
  item('bell_brass', 'Brass hand bell', 'bell', FREE),
  item('bell_bicycle', 'Bicycle bell', 'bell', at(3)),
  item('bell_counter', 'Counter bell', 'bell', at(7)),
  item('coin_till', 'Till', 'coin', FREE),
  item('coin_jar', 'Coin jar', 'coin', at(4)),
  item('coin_abacus', 'Abacus', 'coin', at(9)),
];

const BY_ID = new Map(LOOKS.map((l) => [l.id, l]));
export const lookById = (id: string): Look | undefined => BY_ID.get(id);

/** What a player has on: slot id to look id. */
export type LookSet = Record<string, string>;

/** May a room show this look for a seat whose grants are `grants`? Only a look from a pack needs a grant. */
export const lookAllowed = (look: Look, grants: readonly string[]): boolean => look.from.kind !== 'pack' || grants.includes(look.id);

/**
 * What a room may show of what a player says they have on. Keeps only looks that exist, sit in the slot they are
 * listed under and are meant to be seen by others (a sound never leaves the phone). A look from a pack is dropped
 * unless `grants` (kept by the server for that player, never taken from the phone) holds it. Nothing comes from a
 * pack today and the grants are always empty, so this only makes sure a paid look can never slip through later.
 */
export function cleanLook(raw: unknown, grants: readonly string[] = []): LookSet {
  const out: LookSet = {};
  if (raw && typeof raw === 'object') {
    for (const [slot, id] of Object.entries(raw as Record<string, unknown>)) {
      const look = typeof id === 'string' ? lookById(id) : undefined;
      if (!look || look.slot !== slot || !slotIsPublic(slot)) continue;
      if (!lookAllowed(look, grants)) continue;
      out[slot] = look.id;
    }
  }
  return out;
}

/** Shopkeeper pieces on show, as names the portrait painter knows. */
export const partsOf = (w?: LookSet): string[] => (w ? LOOKS.filter((l) => l.kind === 'wear' && w[l.slot] === l.id).map((l) => l.id) : []);
/** The stall pieces on show. */
export const stallOf = (w?: LookSet): { roof?: string; trim?: string; prop?: string } => ({ roof: w?.roof, trim: w?.trim, prop: w?.prop });
/** The stall colour's id ('terra', 'teal' ...) a player has chosen, if any. */
export const colourOf = (w?: LookSet): string | undefined => (w?.colour && lookById(w.colour)?.slot === 'colour' ? w.colour.slice(4) : undefined);
/** The words under a player's name: their title, if they show one. */
export const titleOf = (w?: LookSet): string | undefined => (w?.title ? lookById(w.title)?.title : undefined);
/** The signboard frame a player shows ('plain' when none is chosen). */
export const frameOf = (w?: LookSet): string => (w?.frame && lookById(w.frame)?.slot === 'frame' ? w.frame.slice(6) : 'plain');
/** The price-tag style a player shows ('ticket' when none is chosen). */
export const tagOf = (w?: LookSet): string => (w?.tag && lookById(w.tag)?.slot === 'tag' ? w.tag.slice(4) : 'ticket');
