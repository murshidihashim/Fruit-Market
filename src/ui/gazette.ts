// The event front pages (DEC-066, masthead "Fruit Market"): the words printed around each event's picture, transcribed from the owner's
// deck art (Art 1 "The scene"). The headline is the event title and the story is the event text, both from
// data.ts, which stays the authority on what an event does. `effects` is the short boxed summary.
import type { EventId } from '../engine/data';

export interface GazetteCopy {
  /** Red italic line under the headline. */
  subhead: string;
  /** Italic line under the picture: what the scene shows. */
  caption: string;
  /** The boxed bullets: the event's effects in a few words. */
  effects: string[];
}

export const GAZETTE: Record<EventId, GazetteCopy> = {
  festival: { subhead: 'Whole town turns out for the fair', caption: 'Lanterns, bunting and fireworks over a fruit stall.', effects: ['+$1 every fruit', '+1 walk-in (+2 at 4-6)'] },
  glut: { subhead: 'Berry growers flood the market', caption: 'A handcart heaped with blueberries rolling across the cobbles.', effects: ['+1 blueberry per 2 stalls', 'Blueberry −$1'] },
  heatwave: { subhead: 'Record heat bakes the stalls', caption: 'A blazing sun, a thermometer and a cut watermelon.', effects: ['Watermelon +$2', 'Ages +1 step tonight'] },
  blight: { subhead: 'Orchards hit, no apples today', caption: 'A bare apple tree with spotted apples and a crow.', effects: ['No new apples', 'Apple +$2'] },
  mangoCraze: { subhead: 'One video, and mangoes sell out', caption: 'An influencer filming a glowing mango on a pedestal.', effects: ['Mango +$2', 'Influencer: 1 fresh at $15'] },
  superfood: { subhead: 'Health craze sweeps the gyms', caption: 'A cheerful blueberry lifting a dumbbell, with a smoothie.', effects: ['Blueberry +$1', 'Gym Club: 2 at $8'] },
  goodHarvest: { subhead: 'Bumper crop fills every cart', caption: 'A rising sun over golden fields and an overflowing crate.', effects: ['+1 fruit per 4 stalls', 'Customers −$1'] },
  badHarvest: { subhead: 'Storms ruin half the crop', caption: 'Storm clouds, rain, flattened wheat and a half-empty crate.', effects: ['Half delivery', 'Customers +$1'] },
  priceHike: { subhead: 'Wholesalers raise every price', caption: 'A chalkboard with a rising line, an arrow and piles of coins.', effects: ['Market costs +$1'] },
  priceControls: { subhead: 'Committee puts a ceiling on prices', caption: 'A striped barrier with price tags hanging over each fruit.', effects: ['Blueberry $5', 'Watermelon $7', 'Apple $6', 'Mango $10'] },
  inspector: { subhead: 'Inspector checks every shelf', caption: 'An inspector with a cap and moustache examining soft apples through a magnifier.', effects: ['$2 per soft fruit', 'Start of day'] },
  strike: { subhead: 'Supply lorry breaks down', caption: 'A lorry with a flat wheel and steaming engine, fruit spilled on the road.', effects: ['No delivery'] },
  hotel: { subhead: 'Hotel kitchen places a big order', caption: 'A hotel chef at the counter with a service bell, a silver cloche and an order slip.', effects: ['Apple $8', 'Watermelon $8', 'Blueberry $7'] },
  touristBus: { subhead: 'Coach pulls up full of hungry visitors', caption: 'A painted tour bus unloading cameras and sun hats.', effects: ['+2 walk-ins (+3 at 4, +4 at 5-6)'] },
  monsoon: { subhead: 'Downpour keeps shoppers at home', caption: 'Rain sheeting off the awnings, puddles round the crates.', effects: ['−1 walk-in (−2 at 4-6)', 'Nothing ages tonight'] },
  durian: { subhead: 'The king of fruits steals the show', caption: 'A spiky durian crowned on its throne, its smell drifting out.', effects: ['Market costs −$1', 'Customers −$1'] },
  kenduri: { subhead: 'Wedding feast needs watermelon', caption: 'A caterer with a long table, garlands and a wedding cake.', effects: ['Caterer: 3 watermelons at $8'] },
  mangoWindfall: { subhead: 'Storm shakes the mango trees', caption: 'Ripe mangoes tumbling from a tree into a waiting basket.', effects: ['+1 ripe mango per 2 stalls', 'Mango −$2'] },
  pasarMalam: { subhead: 'Night market lights up the square', caption: 'Lanterns, food carts and a hawker counting coins.', effects: ['Hawker buys 1 of each crate fruit', '$3 each, any freshness'] },
  bakeOff: { subhead: 'Town bake-off wants the best apples', caption: 'A baker with a prize ribbon and a steaming apple pie.', effects: ['Apple +$1', 'Bakery: 2 apples at $7'] },
};
