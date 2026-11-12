// Illustrated rules, one swipe-able card per idea, in the order a game unfolds: what to expect, how a
// day runs, what you sell, how customers choose, what you can do after the rush, and how it ends.
import { useState } from 'preact/hooks';
import { BASE_BUY, FRUIT, FRUITS, FAVOURS, JAM_PRICE, START_CASH, JUICE_CAP, JUICE_VALUE, LAST_CALL_BONUS, UPGRADES, deliveredGreen, stageAt, type FruitId } from '../engine/data';
import { Coin, FavourIcon, Fruit } from './art';
import { Icon } from './icons';
import { UP_ICON } from './panel';
import { MARKET_DAY_LIST } from './rulesText';

const GAME_PHASES = [
  ['Set-up', `Pick a shopkeeper with one perk. Each stall starts with $${START_CASH}.`],
  ['Ordinary days', 'Seven phases a day, from morning to night.'],
  ['Market Days', `Days ${MARKET_DAY_LIST}: a standing order to bid for, and a stall upgrade that evening.`],
  ['Closing Day', `The last day. Customers pay $${LAST_CALL_BONUS} more, then the jam maker buys your ripe leftovers for $${JAM_PRICE} each.`],
  ['Final count', 'Most cash wins.'],
];

const DAY_BEATS = [
  ['Morning', 'The lorry unloads fruit at the Wholesale Market. An event card changes the day.'],
  ['Buying', `Each stall buys up to ${BASE_BUY} pieces. The poorest stall goes first, then the others clockwise.`],
  ['Stocking', 'Pick the exact fruit for your for-sale crate. Only crate fruit sells. Rivals learn how many pieces you put out, not which fruit.'],
  ['The bell', 'Set one secret price per fruit. Prices and crates open together.'],
  ['The rush', 'Customers buy from the cheapest stall first. You get paid on the spot.'],
  ['Evening', 'Play favour cards. After a Market Day, build one upgrade.'],
  ['Night', 'All fruit ages one step. Spoiled fruit is thrown away.'],
];

/**
 * One fruit's track, oldest step on the left, with what customers take off for okay and soft fruit, then its green
 * steps for a fruit some lorry delivers green (the watermelon keeps a green slot in the engine, but no lorry fills it).
 */
export function FruitTrack({ f }: { f: FruitId }) {
  return (
    <div class="demo-track">
      <Fruit id={f} size={22} />
      {FRUIT[f].ripe.map((_, i) => <i class={`st-${stageAt(f, i)}`}>{FRUIT[f].drop[i] ? `−${FRUIT[f].drop[i]}` : ''}</i>)}
      {deliveredGreen(f) && Array.from({ length: FRUIT[f].unripeSlots }, () => <i class="st-unripe" aria-label="green" />)}
    </div>
  );
}

const SLIDES = [
  {
    part: 'Overview',
    title: 'Welcome to Fruit Market',
    body: (
      <>
        <p>You run a fruit stall in a busy market. Every day you <b>buy</b> fruit from the farmers and <b>sell</b> it to the town's customers, against 1 to 5 rival stalls. There is about one customer a day for every stall. Fruit gets older every night, so you are always racing the clock.</p>
        <div class="demo-row"><Coin size={34} /><span class="big-num">${START_CASH}</span><span class="muted">each stall starts with</span></div>
        <p>A game lasts 8, 10 or 14 days and goes like this:</p>
        <ol class="day-strip">
          {GAME_PHASES.map(([name, text], k) => (
            <li><span class="beat-n">{k + 1}</span><div><b>{name}</b><small>{text}</small></div></li>
          ))}
        </ol>
        <p><b>Most cash after the last day wins.</b> Upgrades are worth nothing at the end. Leftover ripe fruit earns only ${JAM_PRICE} each from the jam maker, when Closing Day is on (the default).</p>
      </>
    ),
  },
  {
    part: 'The day',
    title: 'The seven phases of a day',
    body: (
      <>
        <p>Every day runs through the same seven phases, in this order:</p>
        <ol class="day-strip">
          {DAY_BEATS.map(([name, text], k) => (
            <li><span class="beat-n">{k + 1}</span><div><b>{name}</b><small>{text}</small></div></li>
          ))}
        </ol>
        <p class="muted">Secrets are the heart of the game. Stalls are hidden: before the bell you only know how many pieces each rival put out, not which fruit, and never their prices. Buying is done in the open, so watch what they take.</p>
      </>
    ),
  },
  {
    part: 'The day',
    title: 'Four fruits, four personalities',
    body: (
      <>
        <p>Every night all fruit moves one step older, from <b>fresh</b> to <b>okay</b> to <b>soft</b>, and then it spoils. Customers pay full price for fresh fruit, <b>$1 less</b> for okay and <b>$2 less</b> for soft. Some customers are fussier: <b>Premium</b> customers only buy fresh fruit, <b>Everyday</b> customers buy fresh or okay, and <b>Bargain</b> customers buy anything. The oldest step is on the left.</p>
        {FRUITS.map((f) => (
          <div class="demo-fruit">
            <FruitTrack f={f} />
            <small>{FRUIT[f].theme}</small>
          </div>
        ))}
        <p class="muted">Fresh fruit costs more to buy, but customers pay more for it.</p>
      </>
    ),
  },
  {
    part: 'The day',
    title: 'The rush: who gets the sale?',
    body: (
      <>
        <p>Bobby Books wants <b>3 blueberries</b> and pays up to <b>$5</b> for a fresh one ($4 okay; he won't take soft fruit).</p>
        <div class="demo-ex">
          <div><b>Stall A</b> 2 fresh <Fruit id="blueberry" size={18} /> asks <b>$4</b></div>
          <div><b>Stall B</b> 1 okay <Fruit id="blueberry" size={18} /> asks <b>$3</b></div>
          <div><b>Stall C</b> 2 fresh <Fruit id="blueberry" size={18} /> asks <b>$5</b></div>
        </div>
        <p>Bobby Books buys from the <b>cheapest stall</b> first. B sells 1 at $3. A sells the other 2 at $4. His order is full, so C sells nothing, even though its fruit was fresh.</p>
        <p>If two stalls ask the same price, a stall that holds Favoured Trade may play it once the prices are flipped, and it wins the tie. Otherwise the tie goes to fresher fruit, then the Haggler, then whoever bought earlier today. A customer who isn't fully served leaves at the end of the day.</p>
      </>
    ),
  },
  {
    part: 'The day',
    title: 'Evening and night',
    body: (
      <>
        <p>Serve a customer's <b>whole order by yourself</b> and you draw a secret favour card (one a day; two for the Charmer). Play it when its card says: in your buying turn, after prices flip, or in the evening.</p>
        <div class="demo-chips">{Object.values(FAVOURS).map((f) => <span class="chip"><FavourIcon id={f.id} size={16} /> {f.title}</span>)}</div>
        <p><b>Gossip</b> lets you secretly see tomorrow's walk-ins and <b>Scout</b> lets you peek at one of today's. Cash is your score, so spend it only where it pays you back.</p>
        <p>Then night falls: <b>all fruit ages one step</b>, and anything past soft spoils and is thrown away.</p>
      </>
    ),
  },
  {
    part: 'The finish',
    title: 'Market Days and Closing Day',
    body: (
      <>
        <p>Days {MARKET_DAY_LIST} are <b>Market Days</b>. In the morning a <b>standing order</b> turns up: one big order, collected two days later. Every stall names the price per piece it would do it for, or passes: you see who is bidding, never their price, and you can change your mind until the last stall decides. The <b>lowest bid wins</b> and puts down a <b>stake</b>. On the due day the order takes the winner's own Fresh or Okay pieces and pays the bid for each. Deliver them all and the stake comes back; deliver fewer and it is lost. Rivals are not involved.</p>
        <p>That evening you may build <b>one stall upgrade</b> (your stall has room for two), which costs cash and changes how you play:</p>
        <div class="demo-chips">{Object.values(UPGRADES).map((u) => <span class="chip"><Icon name={UP_ICON[u.id]} size={16} /> {u.title} ${u.cost}</span>)}</div>
        <p>On the <b>final day</b> (Closing Day, on by default), customers pay ${LAST_CALL_BONUS} more. Afterwards the <b>jam maker</b> buys every stall's leftover ripe fruit for ${JAM_PRICE} each (green fruit gets nothing). That's the last chance to turn fruit into cash.</p>
        <p><b>Most cash wins.</b> Upgrades count for nothing, and leftover fruit only for what the jam maker pays. If you tie, the stall that sold more fruit wins. If that is level too, you share the win.</p>
      </>
    ),
  },
  {
    part: 'The finish',
    title: 'Tips from the market',
    body: (
      <ul class="tips">
        <li>Blueberries are cheap but spoil in 3 days. Sell them quickly!</li>
        <li>If no rival is selling a fruit, charge the most customers will pay for it.</li>
        <li>Fruit that spoils tonight is worth $0 tomorrow, so any sale beats none. With a Juice Bar, up to {JUICE_CAP} of them become juice instead: ${JUICE_VALUE} each.</li>
        <li>Watch what rivals buy. What each stall bought today stays on show until the bell; older fruit is hidden. At the bell you only know how many pieces they put out: remember what they hold and you can guess which fruit.</li>
        <li>A stall with an empty shelf and less than $5 at dawn is topped up to $5 by the market, so nobody is out of the game.</li>
        <li>Nobody waits overnight: a customer who does not get everything today is gone tomorrow.</li>      </ul>
    ),
  },
];

export function HowTo({ onDone }: { onDone: () => void }) {
  const [i, setI] = useState(0);
  const s = SLIDES[i];
  return (
    <div class="page howto">
      <header class="topbar"><button class="icon-btn" onClick={onDone} aria-label="Close">✕</button><div class="day"><b>How to play</b></div><span class="muted">{i + 1}/{SLIDES.length}</span></header>
      <main class="scroll pad">
        <section class="panel slide" key={i}>
          <small class="slide-part">{s.part}</small>
          <h2>{s.title}</h2>
          {s.body}
        </section>
        <div class="dots">{SLIDES.map((_, k) => <span class={k === i ? 'on' : ''} onClick={() => setI(k)} />)}</div>
        <div class="row2">
          <button class="btn" disabled={i === 0} onClick={() => setI(i - 1)}>← Back</button>
          {i < SLIDES.length - 1 ? <button class="btn primary" onClick={() => setI(i + 1)}>Next →</button> : <button class="btn primary" onClick={onDone}>Let's play!</button>}
        </div>
      </main>
    </div>
  );
}
