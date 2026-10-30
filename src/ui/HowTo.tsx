// Illustrated rules, one swipe-able card per idea, in the order a game unfolds: what to expect, how a
// day runs, what you sell, how customers choose, what you can do after the rush, and how it ends.
import { useState } from 'preact/hooks';
import { FRUIT, FRUITS, FAVOURS, UPGRADES, stageAt } from '../engine/data';
import { Coin, FavourIcon, Fruit } from './art';
import { Icon } from './pixel';
import { UP_ICON } from './panel';

const GAME_PHASES = [
  ['Set-up', 'Pick a shopkeeper with one perk. Each stall starts with $10.'],
  ['Ordinary days', 'Seven phases a day, from morning to night.'],
  ['Market Days', 'Days 3, 6, 9 and 12: one more customer, and a stall upgrade that evening.'],
  ['Closing Day', 'The last day. Customers pay $1 more, then the jam maker buys your leftovers.'],
  ['Final count', 'Most cash wins.'],
];

const DAY_BEATS = [
  ['Morning', 'The lorry unloads fruit at the Wholesale Market. An event card changes the day.'],
  ['Buying', 'Each stall buys up to 4 pieces. The poorest stall goes first.'],
  ['Stocking', 'Choose what to put in your for-sale crate. Everyone sees the crates.'],
  ['The bell', 'Set one secret price per fruit. All prices flip over together.'],
  ['The rush', 'Customers buy from the cheapest stall first. You get paid on the spot.'],
  ['Evening', 'Play favour cards. After a Market Day, build one upgrade.'],
  ['Night', 'All fruit ages one step. Spoiled fruit is thrown away.'],
];

const SLIDES = [
  {
    part: 'Overview',
    title: 'Welcome to Fruit Market',
    body: (
      <>
        <p>You run a fruit stall in a busy market. Every day you <b>buy</b> fruit from the farmers and <b>sell</b> it to the town's customers, against 1 to 3 rival stalls. Fruit gets older every night, so you are always racing the clock.</p>
        <div class="demo-row"><Coin size={34} /><span class="big-num">$10</span><span class="muted">each stall starts with</span></div>
        <p>A game lasts 8, 10 or 14 days and goes like this:</p>
        <ol class="day-strip">
          {GAME_PHASES.map(([name, text], k) => (
            <li><span class="beat-n">{k + 1}</span><div><b>{name}</b><small>{text}</small></div></li>
          ))}
        </ol>
        <p><b>Most cash after the last day wins.</b> Fruit on your shelf at the end is worth nothing.</p>
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
        <p class="muted">The secret price is the heart of the game: you only see your rivals' prices at the bell, but you can see their crates before you set yours.</p>
      </>
    ),
  },
  {
    part: 'The day',
    title: 'Four fruits, four personalities',
    body: (
      <>
        <p>Every night all fruit moves one step older, from <b>fresh</b> to <b>okay</b> to <b>tired</b>, and then it spoils. Customers pay full price for fresh fruit, <b>$1 less</b> for okay and <b>$2 less</b> for tired. The oldest step is on the left.</p>
        {FRUITS.map((f) => (
          <div class="demo-fruit">
            <div class="demo-track">
              <Fruit id={f} size={22} />
              {FRUIT[f].ripe.map((_, i) => <i class={`st-${stageAt(f, i)}`}>{FRUIT[f].drop[i] ? `−${FRUIT[f].drop[i]}` : ''}</i>)}
              {Array.from({ length: FRUIT[f].unripeSlots }, () => <i class="st-unripe" aria-label="green" />)}
            </div>
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
        <p>Hafiz wants <b>5 blueberries</b> and pays up to <b>$6</b> for a fresh one ($5 okay, $4 tired).</p>
        <div class="demo-ex">
          <div><b>Stall A</b> 3 fresh <Fruit id="blueberry" size={18} /> asks <b>$5</b></div>
          <div><b>Stall B</b> 2 okay <Fruit id="blueberry" size={18} /> asks <b>$4</b></div>
          <div><b>Stall C</b> 4 fresh <Fruit id="blueberry" size={18} /> asks <b>$6</b></div>
        </div>
        <p>Hafiz buys from the <b>cheapest stall</b> first. B sells 2 at $4. A sells the other 3 at $5. His order is full, so C sells nothing, even though its fruit was fresh.</p>
        <p>If two stalls ask the same price, the tie goes to Favoured Trade, then the Haggler, then fresher fruit, then whoever bought earlier today. A customer who isn't fully served comes back once more the next day, then leaves.</p>
      </>
    ),
  },
  {
    part: 'The day',
    title: 'Evening and night',
    body: (
      <>
        <p>Serve a customer's <b>whole order by yourself</b> and you draw a secret favour card (one a day). Play it when its card says: in your buying turn, at the bell, or in the evening.</p>
        <div class="demo-chips">{Object.values(FAVOURS).map((f) => <span class="chip"><FavourIcon id={f.id} size={16} /> {f.title}</span>)}</div>
        <p><b>Gossip</b> lets you secretly see tomorrow's walk-ins and <b>Scout</b> lets you peek at one of today's. Cash is your score, so spend it only where it pays you back.</p>
        <p>Then night falls: <b>all fruit ages one step</b>, and anything past tired spoils and is thrown away.</p>
      </>
    ),
  },
  {
    part: 'The finish',
    title: 'Market Days and Closing Day',
    body: (
      <>
        <p>Days 3, 6, 9 and 12 are <b>Market Days</b>: one more walk-in joins the crowd. That evening you may build <b>one stall upgrade</b>, which costs cash and changes how you play:</p>
        <div class="demo-chips">{Object.values(UPGRADES).map((u) => <span class="chip"><Icon name={UP_ICON[u.id]} size={16} /> {u.title} ${u.cost}</span>)}</div>
        <p>On the <b>final day</b>, customers pay $1 more. Afterwards the <b>jam maker</b> buys every stall's leftover ripe fruit for $1 each. That's the last chance to turn fruit into cash.</p>
        <p><b>Most cash wins.</b> Upgrades and shelf fruit count for nothing. If you tie, the stall that sold more fruit wins.</p>
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
        <li>Fruit that spoils tonight is worth $0 tomorrow, so any sale beats none.</li>
        <li>Watch the crates: if a rival only put out two apples, you can charge more and serve the rest.</li>
        <li>A customer you couldn't fully serve comes back once the next day, and is served before the new arrivals.</li>      </ul>
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
