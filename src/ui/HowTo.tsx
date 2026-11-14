// Illustrated rules, one swipe-able card per idea, in the order a game unfolds: what to expect, how a
// day runs, what you sell, how customers choose, what you can do after the rush, and how it ends.
// The wording follows RULES.md (rules 18) and the glossary (DEC-087): plain, one fact to a sentence.
import { useState } from 'preact/hooks';
import {
  BASE_BUY, CHARMER_DAILY_FAVOURS, FAVOUR_HAND_LIMIT, FRUIT, FRUITS, FAVOURS, JAM_PRICE, START_CASH, JUICE_CAP, JUICE_VALUE, LAST_CALL_BONUS,
  MAX_UPGRADES, NO_MANGO_DAYS, ORDER_LEAD, TOP_UP, UPGRADES, deliveredGreen, stageAt, type FruitId,
} from '../engine/data';
import { Coin, FavourIcon, Fruit } from './art';
import { Icon } from './icons';
import { UP_ICON } from './panel';
import { MARKET_DAY_LIST } from './rulesText';

const GAME_PHASES = [
  ['Set-up', 'Pick a shopkeeper with one perk.'],
  ['Ordinary days', 'Five steps, then evening and night.'],
  ['Market Days', `Days ${MARKET_DAY_LIST}: a standing order to bid for, and an upgrade to build that evening.`],
  ['Closing Day', `The last day. Customers pay $${LAST_CALL_BONUS} more, then the jam maker buys your ripe leftovers for $${JAM_PRICE} each.`],
  ['The end', 'Most cash wins.'],
];

/** The five steps of a day, then evening and night (the top bar and the rules count five steps). */
const DAY_STEPS = 5;
const DAY_BEATS = [
  ['Morning', 'From Day 2 an event card is turned over. The lorry unloads at the Wholesale Market.'],
  ['Buying', `Each stall buys up to ${BASE_BUY} pieces. The poorest stall goes first, then the others clockwise.`],
  ['Stocking', 'Put the pieces you want to sell in your crate. Only those can sell today. Rivals see how many, not which fruit.'],
  ['The bell', 'Set one secret price for each fruit in your crate. Prices and crates open together.'],
  ['The rush', 'Customers buy from the cheapest stall first. You are paid at once.'],
  ['Evening', 'Play an evening favour card. After a Market Day, build 1 upgrade.'],
  ['Night', 'All fruit ages one step. A Soft piece that ages spoils and is thrown away.'],
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
    title: 'The game',
    body: (
      <>
        <p>You run a fruit stall. Each day you <b>buy</b> fruit at the Wholesale Market and <b>sell</b> it to customers, against 1 to 5 rival stalls. There is about 1 customer a day for each stall. Fruit ages every night.</p>
        <div class="demo-row"><Coin size={34} /><span class="big-num">${START_CASH}</span><span class="muted">each stall starts with</span></div>
        <p>A game lasts 8, 10 or 14 days:</p>
        <ol class="day-strip">
          {GAME_PHASES.map(([name, text], k) => (
            <li><span class="beat-n">{k + 1}</span><div><b>{name}</b><small>{text}</small></div></li>
          ))}
        </ol>
        <p>Upgrades are worth nothing at the end. Leftover ripe fruit earns only ${JAM_PRICE} each from the jam maker.</p>
      </>
    ),
  },
  {
    part: 'The day',
    title: 'A day, step by step',
    body: (
      <>
        <p>Every day has the same five steps, then evening and night:</p>
        <ol class="day-strip">
          {DAY_BEATS.map(([name, text], k) => (
            <li><span class="beat-n">{k < DAY_STEPS ? k + 1 : ''}</span><div><b>{name}</b><small>{text}</small></div></li>
          ))}
        </ol>
        <p class="muted">What a stall holds is secret. Before the bell you only know how many pieces each rival has in their crate, not which fruit or the price. Buying happens in the open, so watch what rivals take: it isn't shown again afterwards.</p>
      </>
    ),
  },
  {
    part: 'The day',
    title: 'The four fruits',
    body: (
      <>
        <p>Every night all fruit ages one step: <b>Fresh</b>, then <b>Okay</b>, then <b>Soft</b>, then it spoils. Customers pay their top price for Fresh, <b>$1 less</b> for Okay and <b>$2 less</b> for Soft. <b>Premium</b> customers buy Fresh only. <b>Everyday</b> customers buy Fresh or Okay. <b>Bargain</b> customers buy Fresh, Okay or Soft. The oldest step is on the left.</p>
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
    title: 'The rush: who sells',
    body: (
      <>
        <p>Bobby Books wants <b>3 blueberries</b> and pays up to <b>$5</b> for a Fresh one ($4 for Okay; he won't take Soft).</p>
        <div class="demo-ex">
          <div><b>Stall A</b> 2 Fresh <Fruit id="blueberry" size={18} /> at <b>$4</b></div>
          <div><b>Stall B</b> 1 Okay <Fruit id="blueberry" size={18} /> at <b>$3</b></div>
          <div><b>Stall C</b> 2 Fresh <Fruit id="blueberry" size={18} /> at <b>$5</b></div>
        </div>
        <p>Bobby Books buys from the <b>cheapest stall</b> first. B sells 1 at $3. A sells the other 2 at $4. His order is full, so C sells nothing, even though its fruit was Fresh.</p>
        <p>If two stalls set the same price, a stall holding Favoured Trade can play it after the prices flip to win the tie. Otherwise the tie goes to fresher fruit, then the Haggler, then whoever bought earlier today. A customer who doesn't get everything leaves at the end of the day.</p>
      </>
    ),
  },
  {
    part: 'The day',
    title: 'Evening and night',
    body: (
      <>
        <p>Serve a customer's <b>whole order by yourself</b> and you draw a secret favour card (1 a day; {CHARMER_DAILY_FAVOURS} for the Charmer). You hold up to {FAVOUR_HAND_LIMIT} ({FAVOUR_HAND_LIMIT + 1} for the Charmer). Play it when its card says: on your buying turn, after prices flip, or in the evening.</p>
        <div class="demo-chips">{Object.values(FAVOURS).map((f) => <span class="chip"><FavourIcon id={f.id} size={16} /> {f.title}</span>)}</div>
        <p><b>Gossip</b> shows you tomorrow's walk-ins. <b>Scout</b> shows you one of today's.</p>
        <p>Everyone with something to decide in the evening does it at the same time, then taps Lights out. At night <b>all fruit ages one step</b>. A Soft piece that ages spoils and is thrown away.</p>
      </>
    ),
  },
  {
    part: 'The finish',
    title: 'Market Days and Closing Day',
    body: (
      <>
        <p>Days {MARKET_DAY_LIST} are <b>Market Days</b>. That morning a <b>standing order</b> is turned over: one big order, collected {ORDER_LEAD} days later. Each stall bids a price per piece, or passes. You see who is bidding but not their bids, and you can change yours until the last stall decides. The <b>lowest bid wins</b> and puts down a <b>stake</b>. On the due day the order takes the winner's own Fresh or Okay pieces and pays the bid for each. Deliver them all and the stake comes back; deliver fewer and it's lost. Only the winner can fill it.</p>
        <p>That evening you may build <b>1 upgrade</b>. Your stall has room for {MAX_UPGRADES}.</p>
        <div class="demo-chips">{Object.values(UPGRADES).map((u) => <span class="chip"><Icon name={UP_ICON[u.id]} size={16} /> {u.title} ${u.cost}</span>)}</div>
        <p>The last day is <b>Closing Day</b>. Customers pay ${LAST_CALL_BONUS} more. After the rush the <b>jam maker</b> buys every stall's leftover ripe fruit for ${JAM_PRICE} each. Green fruit earns nothing.</p>
        <p><b>Most cash wins.</b> Upgrades count for nothing. If stalls tie, the one that sold more fruit wins. If that is level too, they share the win.</p>
      </>
    ),
  },
  {
    part: 'The finish',
    title: 'Tips',
    body: (
      <ul class="tips">
        <li>Blueberries are cheap but last only 3 days. Sell them first.</li>
        <li>If no rival is selling a fruit, charge the most customers will pay for it.</li>
        <li>Fruit that spoils tonight is worth $0 tomorrow, so any sale beats none. With a Juice Bar, up to {JUICE_CAP} of them become juice instead: ${JUICE_VALUE} each.</li>
        <li>Watch what rivals take while they buy. It is not shown again after buying. Before the bell you see only how many pieces are in each crate. If you remember what they hold, you can guess which fruit.</li>
        <li>No customer wants a mango in the first {NO_MANGO_DAYS} days. Every mango arrives Green and needs {FRUIT.mango.unripeSlots} nights to ripen.</li>
        <li>From Day 2, a stall with an empty shelf and less than ${TOP_UP} at dawn is topped up to ${TOP_UP}. Nobody is out of the game.</li>
        <li>Nobody waits overnight: a customer who does not get everything today is gone tomorrow.</li>
      </ul>
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
          {i < SLIDES.length - 1 ? <button class="btn primary" onClick={() => setI(i + 1)}>Next →</button> : <button class="btn primary" onClick={onDone}>Done</button>}
        </div>
      </main>
    </div>
  );
}
