// How to play (HowTo.tsx), pages 1 and 2: how to play, and fruit and freshness. Moved out of HowTo.tsx unchanged
// (REP-140 A-02, A-08).
import type { ComponentChildren } from 'preact';
import { useState } from 'preact/hooks';
import { BASE_BUY, FARMER_CARDS, FRUIT, PREF_INFO, RIVALS, START_CASH, acceptsStage, deliveredGreen, stageAt, type FruitId, type Pref, type Stage } from '../engine/data';
import { Coin, Fruit } from './art';
import { LANES } from './boardModel';
import { ART_SIZE, CardArt } from './cards';
import { CardPop } from './cardZoom';
import { customerArt, customerFocus, shopFocus, shopScene } from './deckArt';
import { fx } from './fx';
import { StallPreview } from './stampCard';
import { STAGE_WORD, stageLess, type Ripe } from './stageWords';
import { Lamp, Hidden } from './howtoParts';

// ---------- 1 how to play ----------

function KeeperPic({ avatar }: { avatar: string }) {
  return <CardArt src={shopScene(avatar)} alt="" w={ART_SIZE.scene[0]} h={ART_SIZE.scene[1]} focus={shopFocus(avatar)} />;
}

/** The four things every stall does each day, each drawn with a shopkeeper or customer from the cards. Buying goes in
 *  turns (poorest stall first, then clockwise); stocking and pricing are done by every stall at once, in secret. */
const DAY_TURNS: { verb: string; line: string; pic: () => ComponentChildren; badge: () => ComponentChildren }[] = [
  {
    verb: 'Buy', line: `In turn, poorest stall first: up to ${BASE_BUY} pieces from the Wholesale Market.`,
    pic: () => <KeeperPic avatar={RIVALS[1].avatar} />,
    badge: () => <span class="ht-turn-b"><Fruit id="apple" size={16} /><Fruit id="watermelon" size={16} /><Fruit id="blueberry" size={16} /></span>,
  },
  {
    verb: 'Stock', line: 'Everyone at once, in secret: put the pieces you want to sell in your crate.',
    pic: () => <KeeperPic avatar={RIVALS[2].avatar} />,
    badge: () => <span class="ht-turn-b"><Hidden /><Hidden /><Hidden /></span>,
  },
  {
    verb: 'Price', line: 'Everyone at once, in secret: one price for each fruit in your crate. Then the bell rings.',
    pic: () => <KeeperPic avatar={RIVALS[0].avatar} />,
    badge: () => <span class="ht-turn-b ht-turn-tag">$ ?</span>,
  },
  {
    verb: 'Rush', line: 'Crates and prices open. Customers buy from the cheapest stall first, and you are paid at once.',
    pic: () => <CardArt src={customerArt('Robert')} alt="" w={ART_SIZE.customer[0]} h={ART_SIZE.customer[1]} focus={customerFocus('Robert')} />,
    badge: () => <span class="ht-turn-b"><Coin size={16} /><b>+$8</b></span>,
  },
];

/** The day's four turns as picture tiles; a tap picks one and says what happens. */
function DayTurns() {
  const [on, setOn] = useState(0);
  const t = DAY_TURNS[on];
  return (
    <section class="ht-turns" aria-label="A day at the stall">
      <div class="ht-turn-grid">
        {DAY_TURNS.map((x, i) => (
          <button type="button" class={`ht-turn ${i === on ? 'on' : ''}`} aria-pressed={i === on} onClick={() => setOn(i)}>
            <span class="ht-turn-pic" aria-hidden="true">{x.pic()}</span>
            <span class="ht-turn-n" aria-hidden="true">{i + 1}</span>
            {x.badge()}
            <b>{x.verb}</b>
          </button>
        ))}
      </div>
      <p class="ht-turn-say" role="status"><b>{`${t.verb}. `}</b>{t.line}</p>
    </section>
  );
}

export function HowToPlay() {
  return (
    <>
      <p>You run a fruit stall. Each day you <b>buy</b> fruit at the Wholesale Market and <b>sell</b> it to customers, against rival stalls.</p>
      <div class="ht-hero">
        <span class="ht-hero-stall"><StallPreview look={{}} avatar={RIVALS[0].avatar} name="Your stall" /></span>
        <div class="ht-hero-cash">
          <small>Each stall starts with</small>
          <span class="ht-cash"><Coin size={26} /><b>${START_CASH}</b></span>
          <span class="ht-win">Most cash wins.</span>
        </div>
      </div>
      <h3 class="ht-h3">Every day, every stall</h3>
      <DayTurns />
      <p class="ht-length">A game lasts 8, 10 or 14 days.</p>
    </>
  );
}

// ---------- 2 fruit and freshness ----------

/** What each fruit is like, for its pop-up (data.ts's notes on the fruit), and what customers usually pay for a Fresh
 *  one (the customer cards are spread round these prices: data.ts, the 36 customers). */
const FRUIT_NOTE: Record<FruitId, string> = {
  blueberry: 'Cheap to buy, but it goes off fast: sell it quickly.',
  watermelon: 'The steady middle, with a spare Fresh day.',
  apple: 'The keeper: four Fresh days. Rarely the best price, rarely a loss.',
  mango: 'Arrives Green and ripens on your shelf, then sells at a premium for one Fresh day.',
};
const USUAL_PRICE: Record<FruitId, number> = { blueberry: 5, watermelon: 7, apple: 6, mango: 11 };

/** A fruit's card in a pop-up: what it is like, what it costs at the Wholesale Market at each freshness, how long it
 *  keeps, and what customers usually pay. */
export function FruitCard({ f }: { f: FruitId }) {
  const d = FRUIT[f];
  const stages: Stage[] = [...(deliveredGreen(f) ? ['unripe' as Stage] : []), 'fresh', 'okay', 'notso'];
  const fresh = d.ripe.filter((x) => x === 'fresh').length;
  return (
    <article class={`ht-fruitcard ln-${f}`}>
      <header><span>Fruit</span><b>{d.name}</b></header>
      <span class="ht-fruitcard-pic"><Fruit id={f} size={64} /></span>
      <p>{FRUIT_NOTE[f]}</p>
      <table>
        <thead><tr><th scope="col">Freshness</th><th scope="col">Costs</th><th scope="col">Customers pay</th></tr></thead>
        <tbody>
          {stages.map((st) => (
            <tr>
              <th scope="row"><Lamp stage={st} /> {STAGE_WORD[st]}</th>
              <td>${d.cost[st]}</td>
              <td>{st === 'unripe' ? "Can't sell yet" : st === 'fresh' ? `About $${USUAL_PRICE[f]}` : `$${stageLess(st, f)} less`}</td>
            </tr>
          ))}
        </tbody>
      </table>
      <footer>{deliveredGreen(f) ? `Green for ${d.unripeSlots} nights, then ` : 'Lasts '}{`${d.ripe.length} days: ${fresh === 1 ? 'Fresh' : `${fresh} Fresh`}, then Okay, then Soft.`}</footer>
    </article>
  );
}

/** A fruit's lane on the Wholesale Market board, freshest box at the top as in the game (a fruit some lorry delivers
 *  green has its green boxes above Fresh; the watermelon keeps a green slot in the engine, but no lorry fills it).
 *  Okay and Soft boxes say what customers take off. `at`: the box the delivered pieces stand in (-1: they spoiled);
 *  `n`: how many. `onOpen`: the lane's head opens the fruit's card. */
export function FruitLane({ f, at, n = 1, onOpen }: { f: FruitId; at?: number; n?: number; onOpen?: () => void }) {
  const slots = FRUIT[f].ripe.length + (deliveredGreen(f) ? FRUIT[f].unripeSlots : 0);
  const boxes = Array.from({ length: slots }, (_, i) => slots - 1 - i);
  return (
    <div class={`ht-lane-v ln-${f}`} role="img" aria-label={`${FRUIT[f].name}: ${boxes.map((i) => STAGE_WORD[stageAt(f, i)]).join(', ')}, freshest first`}>
      <button type="button" class="ht-lane-h" aria-label={`${FRUIT[f].name}: see its card`} onClick={onOpen}><span class="ht-lane-ico"><Fruit id={f} size={18} /></span><i aria-hidden="true">i</i></button>
      {boxes.map((i) => {
        const st = stageAt(f, i);
        const drop = st === 'unripe' ? 0 : FRUIT[f].drop[i];
        return (
          <i class={`ht-box st-${st} ${at === i && n > 0 ? 'here' : ''}`} aria-label={st === 'unripe' ? 'green' : undefined}>
            <Lamp stage={st} />
            {at === i && n > 0 ? <span class="ht-tkn"><Fruit id={f} size={18} stage={st} />{n > 1 && <b>×{n}</b>}</span> : drop ? <small>{`−$${drop}`}</small> : null}
          </i>
        );
      })}
    </div>
  );
}

const PREFS: Pref[] = ['premium', 'everyday', 'bargain'];
const SOLD_STAGES: Ripe[] = ['fresh', 'okay', 'notso'];
const firstBox = (f: FruitId) => FRUIT[f].ripe.length - 1 + (deliveredGreen(f) ? FRUIT[f].unripeSlots : 0);
/** The delivery on the board: a real lorry card's row at three stalls. */
const BOARD_LORRY = FARMER_CARDS.find((c) => c.name === 'Mixed Basket') ?? FARMER_CARDS[0];
const BOARD_STALLS = 3;

export function Freshness() {
  const [night, setNight] = useState(0);
  const [open, setOpen] = useState<FruitId | null>(null);
  const longest = Math.max(...LANES.map(firstBox));
  return (
    <>
      <p>There are 4 fruits in the game: blueberry, watermelon, mango and apple.</p>
      <p>Every night all fruit ages one step: <b>Fresh</b>, then <b>Okay</b>, then <b>Soft</b>, then it spoils.</p>
      <div class="ht-mkt-v">
        <div class="ht-mkt-v-h">
          <b>{`${BOARD_LORRY.name} · ${BOARD_STALLS} stalls`}</b>
          <span>{night === 0 ? 'Just delivered' : `After ${night} night${night === 1 ? '' : 's'}`}</span>
          {night <= longest
            ? <button type="button" class="btn ht-btn ht-btn-s" onClick={() => setNight(night + 1)}>Advance 1 night</button>
            : <button type="button" class="btn ht-btn ht-btn-s" onClick={() => setNight(0)}>Start again</button>}
        </div>
        <div class="ht-lanes-v">{LANES.map((f) => <FruitLane f={f} at={firstBox(f) - night} n={BOARD_LORRY.table[BOARD_STALLS][f]} onOpen={() => { fx.tap(); setOpen(f); }} />)}</div>
      </div>
      {open && <CardPop title={FRUIT[open].name} onClose={() => setOpen(null)}><FruitCard f={open} /></CardPop>}
    </>
  );
}

/** Who buys what: each customer type against each freshness (the (i) on the Customer page). What Okay and Soft pay
 *  less is the same for every fruit, so it is read from one (stageWords.ts). */
export function WhoBuys() {
  return (
    <article class="ht-infocard">
      <header><span>Customers</span><b>Who buys what</b></header>
      <table class="ht-accept">
        <thead><tr><th scope="col">Type</th>{SOLD_STAGES.map((s) => <th scope="col"><Lamp stage={s} /> {STAGE_WORD[s]}</th>)}</tr></thead>
        <tbody>
          {PREFS.map((p) => (
            <tr class={`pref-${p}`}>
              <th scope="row"><b>{PREF_INFO[p].title}</b></th>
              {SOLD_STAGES.map((s) => (acceptsStage(p, s)
                ? <td class="yes">{s === 'fresh' ? 'Top price' : `$${stageLess(s, 'apple')} less`}</td>
                : <td class="no">Won't buy</td>))}
            </tr>
          ))}
        </tbody>
      </table>
      <p>A card's colour and its F, O and S marks show the customer's type.</p>
    </article>
  );
}
