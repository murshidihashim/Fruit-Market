// PLAN-103: "First time? How to play", in the owner's own words, as one pop-up over the game. The first-game tips are
// off in online games, so when an online game starts (a private room or a quick match), a player who has never
// finished a game reads this on Day 1, before the morning's news is turned over. It only holds up this player's own
// morning card: the morning already waits for each person's Start buying. "Got it" hides it for good on this device;
// "All the rules" opens the full How to play and comes back here. Every number comes from the game data, so the words
// cannot drift from the rules. REP-122 C-02 (PLAN-109) added one condition to the owner's Market Days words: a standing
// order comes only if it can be delivered by the last day (none on Day 9 of a 10-day game).
import type { Ref } from 'preact';
import { useLayoutEffect, useRef } from 'preact/hooks';
import { BASE_BUY, FAVOURS, FAVOUR_HAND_LIMIT, MARKET_DAY_EVERY, MAX_UPGRADES, UPGRADES, type Stage, type UpgradeId } from '../engine/data';
import { canUpgrade, marketDaysOn, type GameState } from '../engine/game';
import { ART_SIZE, CardArt, DeckBack, FAVOUR_WHEN } from './cards';
import { upgradeArt, upgradeFocus } from './deckArt';
import { FruitSvg } from './fruitIcons';
import { BEATS } from './game/panels/TopBar';
import { loadStats } from './store';
import { STAGE_LETTER } from './ticket';
import { OKAY_LESS, SOFT_LESS } from './stageWords';
import { useFocusTrap } from './focusTrap';
import { EASE, FEEL, FRAME, isReduced, moveMs, ms, timer } from './motion';
import { SHEET_IN, SHEET_OUT } from './sheet';
import './firstTime.css';

/** Set once the player taps "Got it": the pop-up does not come back on this device. */
export const FIRST_TIME_KEY = 'fm.firstTimeDone';

/**
 * Has this phone's owner ever finished a game? The games-played count (store.ts `Stats.played`) goes up once for
 * every finished game, solo, pass-and-play or online, when its results first show (progress.ts finishGame). It is
 * kept whether or not anonymous counting is on (the `first_game_complete` counter is not: it is skipped when counting
 * is off), and an account brings it back on sign-in.
 */
export const hasFinishedGame = () => loadStats().played > 0;

const dismissed = () => { try { return localStorage.getItem(FIRST_TIME_KEY) === '1'; } catch { return false; } };

/** For a player who has never finished a game and has not tapped "Got it". */
export const showFirstTime = () => !hasFinishedGame() && !dismissed();

export function dismissFirstTime() {
  try { localStorage.setItem(FIRST_TIME_KEY, '1'); } catch { /* storage unavailable: hidden for the rest of this game only */ }
}

/**
 * The moment for the pop-up: an online game on the morning of Day 1, before this player has tapped Start buying.
 * Solo and pass-and-play games have the first-game tips (tutorial.ts) instead.
 */
export const firstTimeMoment = (s: GameState, online: boolean, voted: boolean) => online && s.day === 1 && s.phase === 'morning' && !voted;

const NTH: Record<number, string> = { 2: 'second', 3: 'third', 4: 'fourth', 5: 'fifth', 6: 'sixth' };
/** "third" for a Market Day every 3 days. */
export const nthWord = (n: number) => NTH[n] ?? `${n}th`;

/** The owner's six steps. `beat`: the name of that step on the table board and in the rules (BEATS). */
const STEPS: { lead: string; text?: string; beat?: string }[] = [
  { lead: '1. Check the market.', text: "Read today's news and see who's shopping.", beat: BEATS[0] },
  { lead: '2. Buy fruit.', text: `From Day 2 the poorest stall buys first, then the others clockwise. Buy up to ${BASE_BUY} pieces.`, beat: BEATS[1] },
  { lead: '3. Stock your stall.', text: 'Choose what to sell. Rivals see how many pieces, but not which fruit.', beat: BEATS[2] },
  { lead: '4. Set secret prices.', text: 'Set one price per fruit. Reveal fruit and prices together at the bell.', beat: BEATS[3] },
  { lead: '5. The Rush.', text: 'Customers buy from the cheapest qualifying stall, then the next cheapest until their order is filled or no suitable fruit remains.', beat: BEATS[4] },
  { lead: '6. Repeat.' },
];

function Lamp({ stage }: { stage: Stage }) {
  return <i class={`ft-lamp ft-lamp-${stage}`} aria-hidden="true">{STAGE_LETTER[stage]}</i>;
}

/** The owner's text with the game's pictures beside it (pictures are hidden from screen readers; the words carry it). */
export function FirstTimeText() {
  return (
    <div class="ft-text">
      <section class="ft-part ft-intro">
        <h4>RUN YOUR STALL.</h4>
        <p>Buy fruit at the Wholesale Market and sell to customers. Finish with the most cash to win.</p>
      </section>

      <section class="ft-part">
        <h4>YOUR DAILY ROUTINE</h4>
        <ol class="ft-steps">
          {STEPS.map((s, i) => (
            <li class={`ft-step-${i + 1}`}>
              <div class="ft-step-head"><b>{s.lead}</b>{s.beat && <span class="ft-beat" aria-hidden="true">{s.beat}</span>}</div>
              {s.text && <div>{s.text}</div>}
            </li>
          ))}
        </ol>
      </section>

      <section class="ft-part">
        <h4>MARKET DAYS</h4>
        <p class="ft-when">{`Every ${nthWord(MARKET_DAY_EVERY)} day, except the last:`}</p>
        <p>Bid for a standing order, if it can be delivered by the last day. Lowest bid wins and pays a stake. Deliver the required fruit when due to reclaim it; fall short and lose it. Build an upgrade in the evening.</p>
      </section>

      <section class="ft-part">
        <h4>THREE THINGS TO REMEMBER</h4>
        <p><b>Watch your rivals.</b> Purchases are public as they happen, but aren't shown again. Shelves stay hidden.</p>
        <p>
          <b>Fruit ages nightly:</b>{' '}
          <span class="ft-nw"><Lamp stage="fresh" />Fresh</span> → <span class="ft-nw"><Lamp stage="okay" />Okay</span> → <span class="ft-nw"><Lamp stage="notso" />Soft</span> → gone.
          {' '}Mangoes arrive <span class="ft-nw">Green<span class="ft-fruit" aria-hidden="true"><FruitSvg id="mango" stage="unripe" size={14} alt="" /></span></span> and ripen first.
          {` Customers pay $${OKAY_LESS} less for Okay and $${SOFT_LESS} less for Soft; some refuse older fruit.`}
        </p>
        <div class="ft-favours">
          <span class="ft-card" aria-hidden="true"><DeckBack deck="favour" /></span>
          <p><b>Complete orders, earn favours.</b>{` Serve a customer's whole order alone. Draw up to 1 per day; hold up to ${FAVOUR_HAND_LIMIT}.`}</p>
        </div>
      </section>
    </div>
  );
}

/** How many steps closer the pop-up may be drawn when it would otherwise need a scroll (firstTime.css, data-tight). */
export const FT_TIGHTEST = 3;

/** One pop-up over the table. A tap outside its box does nothing: it closes only with its buttons. */
export function FirstTimePopup({ onRules, onDone }: { onRules: () => void; onDone: () => void }) {
  const box = useRef<HTMLDivElement>(null);
  // Drawn a step closer while the words do not fit; past the last step the words scroll inside the box.
  useLayoutEffect(() => {
    const el = box.current;
    if (!el) return;
    let step = 0;
    el.dataset.tight = '0';
    while (step < FT_TIGHTEST && el.scrollHeight > el.clientHeight + 1) { step += 1; el.dataset.tight = String(step); }
  }, []);
  // Keyboard focus stays inside the box while it is open (PLAN-116).
  useFocusTrap(box);
  return (
    <div class="ft-pop" role="dialog" aria-modal="true" aria-labelledby="ft-title" onClick={(e) => e.stopPropagation()}>
      <div class="ft-box" ref={box} tabIndex={-1}>
        <h3 id="ft-title">First time? How to play</h3>
        <FirstTimeText />
        <div class="ft-actions">
          <button type="button" class="btn" onClick={onRules}>All the rules</button>
          <button type="button" class="btn primary" onClick={onDone}>Got it</button>
        </div>
      </div>
    </div>
  );
}

// ---------- PLAN-128: the first Market Day evening ----------
// The first time a player's evening after a Market Day comes (the evening upgrades are offered), one pop-up over the
// evening sheet says what is different on a Market Day, which cards there are (upgrades, and the favour cards the
// player holds, which the sheet shows too) and what can be built tonight: tonight's offers with their cost, the cash
// in hand and the room on a stall. Every number and name is the game's own (UPGRADES, MAX_UPGRADES, MARKET_DAY_EVERY).
// tutorial.ts decides when (marketDayIntro); "Got it" keeps it from showing again (a mark kept with the tips).

const COUNT = ['no', 'one', 'two', 'three', 'four', 'five'];
const countWord = (n: number) => COUNT[n] ?? String(n);

/** The pop-up's words, a part at a time (tests read them). `offers`: tonight's offers, in the sheet's order. */
export function marketDayWords(s: GameState, p: number, offers: UpgradeId[]): { different: string; upgrades: string; favours: string | null; build: string } {
  const pl = s.players[p];
  const orders = marketDaysOn(s);
  const built = pl.upgrades.length;
  const room = MAX_UPGRADES - built;
  return {
    different: `Every ${nthWord(MARKET_DAY_EVERY)} day, except the last, is a Market Day.${orders ? ' In the morning every stall bids in secret for a standing order, if it can be delivered by the last day.' : ''} In the evening each stall may build one upgrade. Other evenings have none.`,
    upgrades: 'Built once, an upgrade works for your stall until the end of the game. You pay its cost from your cash.',
    // The favour cards this stall holds, each with when it is played (the card's own words).
    favours: pl.favours.length > 0
      ? `Your favour cards are on the evening sheet too. Each is played when its card says: ${[...new Set(pl.favours)].map((f) => `${FAVOURS[f].title}, ${FAVOUR_WHEN[FAVOURS[f].when].toLowerCase()}`).join('; ')}.`
      : null,
    build: offers.length === 0
      ? `Your stall is full: it has room for ${countWord(MAX_UPGRADES)} upgrades.`
      : `You have $${pl.cash}. Build one tonight, or none: tap a card, then Build. A stall has room for ${countWord(MAX_UPGRADES)} upgrades${built ? `; you have ${countWord(room)} left` : ''}.`,
  };
}

/**
 * The Market Day pop-up over the evening sheet. It slides up as the game's sheets do (popMotion's lengths, on the one
 * clock); with reduced motion it is simply there. A tap outside its box does nothing: it closes with "Got it" (or
 * Escape), and slides away.
 */
export function MarketDayPopup({ s, p, offers, onDone }: { s: GameState; p: number; offers: UpgradeId[]; onDone: () => void }) {
  const box = useRef<HTMLDivElement>(null);
  const pop = useRef<HTMLDivElement>(null);
  const going = useRef(false);
  useLayoutEffect(() => {
    const el = box.current;
    if (!el) return;
    let step = 0;
    el.dataset.tight = '0';
    while (step < FT_TIGHTEST && el.scrollHeight > el.clientHeight + 1) { step += 1; el.dataset.tight = String(step); }
    if (isReduced()) return;
    pop.current?.animate([{ opacity: 0 }, { opacity: 1 }], { duration: ms(FEEL.sheetIn), easing: EASE.sheet });
    el.animate(SHEET_IN, { duration: ms(FEEL.sheetIn), easing: EASE.sheet });
  }, []);
  const done = () => {
    if (going.current) return;
    going.current = true;
    if (isReduced() || !box.current || !pop.current) { onDone(); return; }
    box.current.animate(SHEET_OUT, { duration: ms(FEEL.sheetOut), easing: EASE.leave, fill: 'forwards' });
    pop.current.animate([{ opacity: 1 }, { opacity: 0 }], { duration: ms(FEEL.sheetOut), easing: EASE.leave, fill: 'forwards' });
    void timer(moveMs(FEEL.sheetOut) + FRAME).then(onDone);
  };
  useFocusTrap(box, done);
  return <MarketDayView s={s} p={p} offers={offers} box={box} pop={pop} onDone={done} />;
}

/** The Market Day pop-up drawn (without hooks, so tests can render it to a string). */
export function MarketDayView({ s, p, offers, box, pop, onDone }: { s: GameState; p: number; offers: UpgradeId[]; box?: Ref<HTMLDivElement>; pop?: Ref<HTMLDivElement>; onDone: () => void }) {
  const w = marketDayWords(s, p, offers);
  return (
    <div class="ft-pop md-pop" ref={pop} role="dialog" aria-modal="true" aria-labelledby="md-title" onClick={(e) => e.stopPropagation()}>
      <div class="ft-box md-box" ref={box} tabIndex={-1}>
        <h3 id="md-title">Market Day evening</h3>
        <div class="ft-text">
          <section class="ft-part">
            <h4>WHAT IS DIFFERENT</h4>
            <p>{w.different}</p>
          </section>
          <section class="ft-part">
            <h4>THE CARDS</h4>
            <div class="ft-favours">
              <span class="ft-card" aria-hidden="true"><DeckBack deck="upgrade" /></span>
              <p><b>Upgrades.</b> {w.upgrades}</p>
            </div>
            {w.favours && (
              <div class="ft-favours">
                <span class="ft-card" aria-hidden="true"><DeckBack deck="favour" /></span>
                <p><b>Favours.</b> {w.favours}</p>
              </div>
            )}
          </section>
          <section class="ft-part">
            <h4>WHAT YOU CAN BUILD TONIGHT</h4>
            {offers.length > 0 && (
              <ul class="md-offers">
                {offers.map((u) => {
                  const why = canUpgrade(s, p, u);
                  return (
                    <li class={`md-offer ${why ? 'no' : ''}`} aria-label={`${UPGRADES[u].title}, $${UPGRADES[u].cost}. ${UPGRADES[u].text}${why ? ` ${why}.` : ''}`}>
                      <CardArt class="md-pic" src={upgradeArt(u)} alt="" w={ART_SIZE.small[0]} h={ART_SIZE.small[1]} focus={upgradeFocus(u)} />
                      <span class="md-nm" aria-hidden="true"><b>{UPGRADES[u].title}</b>{why && <small>{why}</small>}</span>
                      <b class="md-cost" aria-hidden="true">{`$${UPGRADES[u].cost}`}</b>
                    </li>
                  );
                })}
              </ul>
            )}
            <p>{w.build}</p>
          </section>
        </div>
        <div class="ft-actions md-actions">
          <button type="button" class="btn primary" onClick={onDone}>Got it</button>
        </div>
      </div>
    </div>
  );
}
