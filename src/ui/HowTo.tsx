// Illustrated rules, one swipe-able card per idea.
import { useState } from 'preact/hooks';
import { FRUIT, FRUITS, FAVOURS, UPGRADES, stageAt } from '../engine/data';
import { Coin, Fruit } from './art';

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
        <p>Every night all fruit moves one step left. The number shows how much less a customer pays at that age. Off the end, it spoils.</p>
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
    title: 'Morning: buy fruit',
    body: (
      <>
        <p>The farmer delivers, and an <b>event card</b> changes the day. You can see tomorrow's event a day early, so plan ahead!</p>
        <p>Taking turns, each shop buys <b>up to 4 fruits</b>. <b>The poorest shop buys first.</b> Fresh fruit costs more but customers pay more for it.</p>
        <p>You can see one customer who is coming today. A second <b>walk-in</b> is a surprise.</p>
      </>
    ),
  },
  {
    title: 'Afternoon: secret prices',
    body: (
      <>
        <p>Every shop secretly picks a price for each customer. Then all prices are shown at once.</p>
        <p><b>Cheapest price sells first.</b> On a tie, the fresher fruit wins.</p>
        <p>A customer's price is <b>per fruit</b>, for a fresh one. Older fruit sells for less: the −$ on each space of your stall shows how much.</p>
        <p>A customer who doesn't get everything comes back once more the next day, then leaves.</p>
      </>
    ),
  },
  {
    title: 'Favours and upgrades',
    body: (
      <>
        <p>Serve a customer's <b>whole order by yourself</b> to draw a secret favour card:</p>
        <div class="demo-chips">{Object.values(FAVOURS).map((f) => <span class="chip">{f.icon} {f.title}</span>)}</div>
        <p>Each evening, 3 of these upgrades are offered to you:</p>
        <div class="demo-chips">{Object.values(UPGRADES).map((u) => <span class="chip">{u.icon} {u.title} ${u.cost}</span>)}</div>
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
        <li>Green mangoes cost $2 and ripen in 2 nights. Buy them before a Mango Craze!</li>
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
