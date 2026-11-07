// The Exchange Gazette (DEC-066): the words printed around each event's front page, transcribed from the owner's
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
  festival: { subhead: 'Whole town turns out for the fair', caption: 'Lanterns, bunting and fireworks over a fruit stall.', effects: ['+$1 every fruit', '+1 walk-in'] },
  glut: { subhead: 'Berry growers flood the market', caption: 'A handcart heaped with blueberries rolling across the cobbles.', effects: ['+1 blueberry per stall', 'Blueberry −$1'] },
  heatwave: { subhead: 'Record heat bakes the stalls', caption: 'A blazing sun, a thermometer and a cut watermelon.', effects: ['Watermelon +$2', 'Ages +1 step tonight'] },
  blight: { subhead: 'Orchards hit, no apples today', caption: 'A bare apple tree with spotted apples and a crow.', effects: ['No new apples', 'Apple +$2'] },
  mangoCraze: { subhead: 'One video, and mangoes sell out', caption: 'An influencer filming a glowing mango on a pedestal.', effects: ['Mango +$2', 'Influencer: 2 fresh at $12'] },
  superfood: { subhead: 'Health craze sweeps the gyms', caption: 'A cheerful blueberry lifting a dumbbell, with a smoothie.', effects: ['Blueberry +$1', 'Gym Club: 3 at $8'] },
  goodHarvest: { subhead: 'Bumper crop fills every cart', caption: 'A rising sun over golden fields and an overflowing crate.', effects: ['+1 fruit per 2 stalls', 'Customers −$1'] },
  badHarvest: { subhead: 'Storms ruin half the crop', caption: 'Storm clouds, rain, flattened wheat and a half-empty crate.', effects: ['Half delivery', 'Customers +$1'] },
  priceHike: { subhead: 'Wholesalers raise every price', caption: 'A chalkboard with a rising line, an arrow and piles of coins.', effects: ['Market costs +$1'] },
  priceControls: { subhead: 'Committee puts a ceiling on prices', caption: 'A striped barrier with price tags hanging over each fruit.', effects: ['Blueberry $5', 'Watermelon $7', 'Apple $6', 'Mango $8'] },
  inspector: { subhead: 'Inspector checks every shelf', caption: 'An inspector with a cap and moustache examining tired apples through a magnifier.', effects: ['$2 per tired fruit', 'Start of day'] },
  strike: { subhead: 'Supply lorry breaks down', caption: 'A lorry with a flat wheel and steaming engine, fruit spilled on the road.', effects: ['No delivery'] },
  hotel: { subhead: 'Hotel kitchen places a big order', caption: 'A hotel chef at the counter with a service bell, a silver cloche and an order slip.', effects: ['Apples $8', 'Watermelon $8', 'Blueberry $7'] },
};
