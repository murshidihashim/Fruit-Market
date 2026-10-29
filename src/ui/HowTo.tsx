// Illustrated rules, one swipe-able card per idea.
import { useState } from 'preact/hooks';
import { FRUIT, FRUITS, FAVOURS, UPGRADES, stageAt } from '../engine/data';
import { Coin, FavourIcon, Fruit } from './art';
import { Icon } from './pixel';
import { UP_ICON } from './panel';

const SLIDES = [
  {
    title: 'The big idea',
    body: (
      <>
        <p>Fruit Market is a game of <b>timing and nerve</b>. Three things pull against you every day:</p>
        <ul class="tips">
          <li><b>The clock.</b> Fruit gets older every night, and old fruit sells for less, then not at all.</li>
          <li><b>The secret price.</b> You only see your rivals' prices at the bell. Too high and the customer walks past; too low and you give money away.</li>
          <li><b>The rival's crate.</b> You see what each stall puts out before prices are set. If a rival is short of apples, you can charge more.</li>
        </ul>
        <p>You don't need to win every sale. Often the winner threw away the least fruit and stayed brave when the others didn't.</p>
      </>
    ),
  },
  {
    title: 'One customer, start to finish',
    body: (
      <>
        <p>Hafiz wants <b>5 blueberries</b> and pays up to <b>$6</b> for a fresh one ($5 okay, $4 tired).</p>
        <div class="demo-ex">
          <div><b>Stall A</b> 3 fresh <Fruit id="blueberry" size={18} /> asks <b>$5</b></div>
          <div><b>Stall B</b> 2 okay <Fruit id="blueberry" size={18} /> asks <b>$4</b></div>
          <div><b>Stall C</b> 4 fresh <Fruit id="blueberry" size={18} /> asks <b>$6</b></div>
        </div>
        <p>Hafiz buys from the <b>cheapest stall</b> first. B sells 2 at $4. A sells the other 3 at $5. His order is full, so C sells nothing, even though its fruit was fresh.</p>
        <p>Two stalls served him, so nobody draws a favour card. A stall that serves a whole order <b>alone</b> does.</p>
      </>
    ),
  },
  {
    title: 'Run the best fruit stall',
    body: (
      <>
        <p>You and your rivals buy fruit from the farmers and sell it to customers.</p>
        <p><b>The richest stall after the last day wins.</b> Fruit left on your shelf at the end is worth nothing.</p>
        <div class="demo-row"><Coin size={34} /><span class="big-num">$10</span><span class="muted">to start</span></div>
      </>
    ),
  },
  {
    title: 'Every fruit ages differently',
    body: (
      <>
        <p>Every night all fruit gets one step older. Every fruit follows one rule: full price when <b>fresh</b>, <b>$1 less</b> when okay, <b>$2 less</b> when tired. Fruits differ in how long they last. Oldest is on the left; past the last step, it spoils.</p>
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
      </>
    ),
  },
  {
    title: 'Dawn and market',
    body: (
      <>
        <p>The lorry unloads, and an <b>event card</b> changes the day. The <b>Tomorrow strip</b> shows tomorrow's lorry, event, one regular, and the walk-ins face down (you see only the fruit they want).</p>
        <p>Taking turns, each stall buys <b>up to 4 pieces of fruit</b>. <b>The poorest stall buys first.</b></p>
      </>
    ),
  },
  {
    title: 'Stocking, then the bell',
    body: (
      <>
        <p>Customers arrive. Each stall secretly fills its <b>for-sale crate</b>; then everyone sees how many each stall put out.</p>
        <p>Then each stall sets <b>one secret price per fruit</b>. At the bell, all prices show together.</p>
        <p>In the <b>rush</b>, customers buy from the <b>cheapest stall</b> first; leftover demand spills to the next. Ties: Favoured Trade, then the Haggler, then fresher fruit, then whoever bought earlier today (the poorest stall buys first).</p>
        <p>A customer who doesn't get everything comes back once more the next day, then leaves.</p>
      </>
    ),
  },
  {
    title: 'Market Days and Closing Day',
    body: (
      <>
        <p>Days 3, 6, 9 and 12 are <b>Market Days</b>: one more walk-in. The lorry still comes.</p>
        <p>On the <b>final day</b>, customers pay $1 more, and then the jam maker buys leftover fruit for $1 each.</p>
      </>
    ),
  },
  {
    title: 'Favours and upgrades',
    body: (
      <>
        <p>Serve a customer's <b>whole order by yourself</b> to draw a secret favour card:</p>
        <div class="demo-chips">{Object.values(FAVOURS).map((f) => <span class="chip"><FavourIcon id={f.id} size={16} /> {f.title}</span>)}</div>
        <p><b>Gossip</b> lets you secretly see tomorrow's walk-ins, and <b>Scout</b> lets you peek at one of today's. After each Market Day, build one stall upgrade:</p>
        <div class="demo-chips">{Object.values(UPGRADES).map((u) => <span class="chip"><Icon name={UP_ICON[u.id]} size={16} /> {u.title} ${u.cost}</span>)}</div>
      </>
    ),
  },
  {
    title: 'Tips from the market',
    body: (
      <ul class="tips">
        <li>Blueberries are cheap but spoil in 3 days. Sell them quickly!</li>
        <li>If no rival has a fruit, charge the full price.</li>
        <li>Fruit that spoils tonight is worth $0 tomorrow, so any sale beats none.</li>
        <li>Green mangoes cost $3 and ripen in 2 nights. Buy them before a Mango Craze!</li>
        <li>Watch the crates: if a rival only put out two apples, you can charge more and serve the rest.</li>
        <li>Pick a shopkeeper before the game. Each shopkeeper has one perk for the whole game, and everyone can see it.</li>
        <li>Customers want more as the town grows, so later days are busier.</li>
        <li>On the last day, don't buy anything you can't sell today.</li>
      </ul>
    ),
  },
];

export function HowTo({ onDone }: { onDone: () => void }) {
  const [i, setI] = useState(0);
  const s = SLIDES[i];
  return (
    <div class="page howto">
      <header class="topbar"><button class="icon-btn" onClick={onDone}>✕</button><div class="day"><b>How to play</b></div><span class="muted">{i + 1}/{SLIDES.length}</span></header>
      <main class="scroll pad">
        <section class="panel slide" key={i}>
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
