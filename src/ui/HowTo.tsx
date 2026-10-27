// Illustrated rules, one swipe-able card per idea.
import { useState } from 'preact/hooks';
import { FRUIT, FRUITS, FAVOURS, UPGRADES, stageAt } from '../engine/data';
import { Coin, FavourIcon, Fruit } from './art';
import { Icon } from './pixel';
import { UP_ICON } from './panel';

const SLIDES = [
  {
    title: 'Run the best fruit stall',
    body: (
      <>
        <p>You and your rivals buy fruit from the farmers and sell it to customers.</p>
        <p><b>The richest shop after the last day wins.</b> Fruit left on your shelf at the end is worth nothing.</p>
        <div class="demo-row"><Coin size={34} /><span class="big-num">$10</span><span class="muted">to start</span></div>
      </>
    ),
  },
  {
    title: 'Every fruit ages differently',
    body: (
      <>
        <p>Every night all fruit gets one step older. Every fruit follows one rule: full price when <b>fresh</b>, <b>$1 less</b> when okay, <b>$2 less</b> when not so. Fruits differ in how long they last. Oldest is on the left; past the last step, it spoils.</p>
        {FRUITS.map((f) => (
          <div class="demo-fruit">
            <div class="demo-track">
              <Fruit id={f} size={22} />
              {FRUIT[f].ripe.map((_, i) => <i class={`st-${stageAt(f, i)}`}>{FRUIT[f].drop[i] ? `−${FRUIT[f].drop[i]}` : ''}</i>)}
              {Array.from({ length: FRUIT[f].unripeSlots }, () => <i class="st-unripe">🌱</i>)}
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
        <p>The lorry unloads, and an <b>event card</b> changes the day. The <b>Tomorrow strip</b> shows tomorrow's lorry, event, one expected customer, and the walk-ins face down (you see only the fruit they want).</p>
        <p>Taking turns, each shop buys <b>up to 4 fruits</b>. <b>The poorest shop buys first.</b></p>
      </>
    ),
  },
  {
    title: 'Open stalls, then the bell',
    body: (
      <>
        <p>Customers arrive. Each shop secretly fills its <b>for-sale crate</b>; then everyone sees how many each stall put out.</p>
        <p>Then each shop sets <b>one secret price per fruit</b>. At the bell, all prices show together.</p>
        <p>In the <b>rush</b>, customers buy from the <b>cheapest stall</b> first; leftover demand spills to the next. Ties: Favoured Trade, then the Haggler, then fresher fruit, then whoever bought earlier today (the poorest shop buys first).</p>
        <p>A customer who doesn't get everything comes back once more the next day, then leaves.</p>
      </>
    ),
  },
  {
    title: 'Market Days and Last Call',
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
        <p><b>Market Gossip</b> lets you secretly see tomorrow's walk-ins. After each Market Day, build one stall speciality:</p>
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
        <li>On the first morning, pick a merchant trait. Rivals can see yours.</li>
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
