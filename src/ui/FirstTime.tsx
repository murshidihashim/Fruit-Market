// PLAN-103: "First time? How to play" in a private room's lobby, in the owner's own words. The first-game tips are
// off in online games, so a player who was invited to a room and has never finished a game reads this while the
// room fills. It never blocks Ready or Start. "Got it" hides it for good on this device; "All the rules" opens the
// full How to play. Every number comes from the game data, so the words cannot drift from the rules.
import { BASE_BUY, FAVOUR_HAND_LIMIT, MARKET_DAY_EVERY, type Stage } from '../engine/data';
import { DeckBack, OKAY_LESS, SOFT_LESS } from './cards';
import { FruitSvg } from './fruitIcons';
import { BEATS } from './game/panels/TopBar';
import { loadStats } from './store';
import { STAGE_LETTER } from './ticket';
import './firstTime.css';

/** Set once the player taps "Got it": the panel does not come back on this device. */
export const FIRST_TIME_KEY = 'fm.firstTimeDone';

/**
 * Has this phone's owner ever finished a game? The games-played count (store.ts `Stats.played`) goes up once for
 * every finished game, solo, pass-and-play or online, when its results first show (progress.ts finishGame). It is
 * kept whether or not anonymous counting is on (the `first_game_complete` counter is not: it is skipped when counting
 * is off), and an account brings it back on sign-in.
 */
export const hasFinishedGame = () => loadStats().played > 0;

const dismissed = () => { try { return localStorage.getItem(FIRST_TIME_KEY) === '1'; } catch { return false; } };

/** The panel shows to a player who has never finished a game and has not tapped "Got it". */
export const showFirstTime = () => !hasFinishedGame() && !dismissed();

export function dismissFirstTime() {
  try { localStorage.setItem(FIRST_TIME_KEY, '1'); } catch { /* storage unavailable: hidden until the lobby is drawn again */ }
}

const NTH: Record<number, string> = { 2: 'second', 3: 'third', 4: 'fourth', 5: 'fifth', 6: 'sixth' };
/** "third" for a Market Day every 3 days. */
export const nthWord = (n: number) => NTH[n] ?? `${n}th`;

/** The owner's six steps. `beat`: the name of that step on the bar along the top of the game. */
const STEPS: { lead: string; text?: string; beat?: string }[] = [
  { lead: '1. Check the market.', text: "Read today's news and see who's shopping.", beat: BEATS[0] },
  { lead: '2. Buy fruit.', text: `Poorest stall goes first, then clockwise. Buy up to ${BASE_BUY} pieces.`, beat: BEATS[1] },
  { lead: '3. Stock your stall.', text: 'Choose what to sell. Rivals see how many pieces, but not which fruit.', beat: BEATS[2] },
  { lead: '4. Set secret prices.', text: 'Set one price per fruit. Reveal fruit and prices together at the bell!', beat: BEATS[3] },
  { lead: '5. The Rush.', text: 'Customers buy from the cheapest qualifying stall, then the next cheapest until their order is filled or no suitable fruit remains.', beat: BEATS[4] },
  { lead: '6. Repeat!' },
];

function Lamp({ stage }: { stage: Stage }) {
  return <i class={`ft-lamp ft-lamp-${stage}`} aria-hidden="true">{STAGE_LETTER[stage]}</i>;
}

/** The owner's text with the game's pictures beside it (pictures are hidden from screen readers; the words carry it). */
export function FirstTimeText() {
  return (
    <div class="ft-text">
      <h4>RUN YOUR STALL.</h4>
      <p>Buy fruit at the Wholesale Market and sell to customers. Finish with the most cash to win!</p>

      <h4>YOUR DAILY ROUTINE</h4>
      <ol class="ft-steps">
        {STEPS.map((s) => (
          <li>
            <div class="ft-step-head"><b>{s.lead}</b>{s.beat && <span class="ft-beat" aria-hidden="true">{s.beat}</span>}</div>
            {s.text && <div>{s.text}</div>}
          </li>
        ))}
      </ol>

      <h4>MARKET DAYS</h4>
      <p>{`Every ${nthWord(MARKET_DAY_EVERY)} day, except the last:`}</p>
      <p>Bid for a standing order. Lowest bid wins and pays a stake. Deliver the required fruit when due to reclaim it; fall short and lose it. Build an upgrade in the evening.</p>

      <h4>THREE THINGS TO REMEMBER</h4>
      <p><b>Watch your rivals.</b> Purchases are public as they happen, but aren't shown again. Shelves stay hidden.</p>
      <p>
        <b>Fruit ages nightly:</b>{' '}
        <span class="ft-nw"><Lamp stage="fresh" />Fresh</span> → <span class="ft-nw"><Lamp stage="okay" />Okay</span> → <span class="ft-nw"><Lamp stage="notso" />Soft</span> → gone.
        {' '}Mangoes arrive <span class="ft-nw">Green<span class="ft-fruit" aria-hidden="true"><FruitSvg id="mango" stage="unripe" size={18} alt="" /></span></span> and ripen first.
        {` Customers pay $${OKAY_LESS} less for Okay and $${SOFT_LESS} less for Soft; some refuse older fruit.`}
      </p>
      <div class="ft-favours">
        <span class="ft-card" aria-hidden="true"><DeckBack deck="favour" /></span>
        <p><b>Complete orders, earn favours.</b>{` Serve a customer's whole order alone. Draw up to 1 per day; hold up to ${FAVOUR_HAND_LIMIT}.`}</p>
      </div>
    </div>
  );
}

/** The panel in the lobby. It sits among the lobby's panels and scrolls with the page: nothing waits for it. */
export function FirstTimePanel({ onRules, onDone }: { onRules: () => void; onDone: () => void }) {
  return (
    <section class="panel ft-panel" aria-labelledby="ft-title">
      <h3 id="ft-title">First time? How to play</h3>
      <FirstTimeText />
      <div class="row2 ft-actions">
        <button type="button" class="btn" onClick={onRules}>All the rules</button>
        <button type="button" class="btn primary" onClick={onDone}>Got it</button>
      </div>
    </section>
  );
}
