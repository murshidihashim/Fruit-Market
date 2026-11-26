// How to play (PLAN-129): seven pages, one screen each, built round the game's own pictures (the shopkeeper and
// customer cards, the Wholesale Market board, fruit pieces, freshness letters, the lorry, event, favour, standing
// order and upgrade cards), so players recognise them at the table. The pages (PAGES, at the end): how to play, fruit
// and freshness, lorry and event, customer, favour, Market Day, try a sale. The wording follows RULES.md (rules 20)
// and the glossary (DEC-087): plain, one fact to a sentence. The numbers come from the game data (the freshness price
// rule through stageWords.ts), so the page cannot drift from the rules.
// REP-140 A-08: this is the page itself, loaded on demand by HowTo.tsx; pages 1 to 6 are howtoRules.tsx and
// howtoMarket.tsx, their small pieces howtoParts.tsx; page 7 (Try a sale) is here.
import type { ComponentChildren } from 'preact';
import { useEffect, useRef, useState } from 'preact/hooks';
import { acceptsStage, lookOf, type FruitId, type Pref, type Stage } from '../engine/data';
import { TradingCard } from './cards';
import { CardPop, CardZoom } from './cardZoom';
import { fx } from './fx';
import { held, moveMs } from './motion';
import { TIE_ORDER } from './rulesText';
import { PriceTag } from './stampCard';
import { seatColour } from './table';
import { stageLess } from './stageWords';
import { Piece, More } from './howtoParts';
import { Freshness, HowToPlay, WhoBuys } from './howtoRules';
import { Customers, Favours, LorryEvent, MarketDay } from './howtoMarket';

// ---------- 7 try a sale ----------

interface SaleStall { id: string; stages: Stage[]; price: number }
/**
 * The example from the rules: Hadi Hammer wants 3 blueberries and pays up to $5 for a Fresh one. REP-140 C-06: his own
 * card wants exactly that (the example used to be Bobby Books, whose card also wants a mango).
 */
export const SALE_BUYER = { who: 'Hadi', name: lookOf('Hadi').title, fruit: 'blueberry' as FruitId, qty: 3, max: 5 };
const SALE: SaleStall[] = [
  { id: 'A', stages: ['fresh', 'fresh'], price: 4 },
  { id: 'B', stages: ['okay'], price: 3 },
  { id: 'C', stages: ['fresh', 'fresh'], price: 5 },
];
const FRESHER: Stage[] = ['fresh', 'okay', 'notso', 'unripe'];
const STALL_COLOURS = [3, 1, 5];

/** The pieces this customer takes, in order: cheapest first, then fresher; only freshness they buy, at a price they pay. */
export function saleOrder(pref: Pref, stalls = SALE): { stall: string; k: number; price: number; stage: Stage }[] {
  return stalls
    .flatMap((st) => st.stages.map((stage, k) => ({ stall: st.id, k, price: st.price, stage })))
    .filter((p) => p.stage !== 'unripe' && acceptsStage(pref, p.stage) && p.price <= SALE_BUYER.max - stageLess(p.stage, SALE_BUYER.fruit))
    .sort((a, b) => a.price - b.price || FRESHER.indexOf(a.stage) - FRESHER.indexOf(b.stage))
    .slice(0, SALE_BUYER.qty);
}

/** What the reveal says, for Fresh or Okay (Everyday) and Fresh only (Premium). The words are the page's own; tests
 *  (tests/stage-words.test.ts) check every stall, number and "not taken" in them against saleOrder, so a rule change
 *  cannot leave them behind. */
export const SALE_SAYS: Record<'everyday' | 'premium', string> = {
  premium: 'B\'s Okay blueberry is not taken. A sells 2 at $4, then C sells 1 at $5.',
  everyday: 'B is cheapest: it sells 1 at $3, then A sells 2 at $4. The order is full, so C sells nothing.',
};

/** The Try a sale page (exported so tests can draw it). */
export function TrySale() {
  const [freshOnly, setFreshOnly] = useState(false);
  const [guess, setGuess] = useState<string | null>(null);
  const [shown, setShown] = useState(-1); // -1: not revealed; n: pieces moved so far
  const timer = useRef<number | undefined>(undefined);
  const pref: Pref = freshOnly ? 'premium' : 'everyday';
  const steps = saleOrder(pref);
  const done = shown >= steps.length;
  useEffect(() => () => window.clearTimeout(timer.current), []);
  useEffect(() => {
    if (shown < 0 || done) return undefined;
    timer.current = window.setTimeout(() => setShown(shown + 1), shown === 0 ? held(500) : Math.max(held(900), moveMs(900)));
    return () => window.clearTimeout(timer.current);
  }, [shown, done]);
  const reset = (fo = freshOnly) => { window.clearTimeout(timer.current); setFreshOnly(fo); setGuess(null); setShown(-1); };
  const moved = steps.slice(0, Math.max(0, shown));
  const first = steps[0]?.stall;
  const note = (st: SaleStall): string => {
    if (shown < 0) return '';
    const sold = moved.filter((m) => m.stall === st.id).length;
    if (sold) return `Sold ${sold} · $${sold * st.price}`;
    if (!done) return '';
    return st.stages.some((s) => acceptsStage(pref, s)) ? 'Order full' : 'Fresh only: not taken';
  };
  const ask = shown < 0 ? (guess ? 'Now reveal the sale.' : 'Who sells first? Tap a stall.') : !done ? 'Selling…'
    : `${guess ? (guess === first ? 'Right. ' : 'Not quite. ') : ''}${SALE_SAYS[freshOnly ? 'premium' : 'everyday']} Two stalls served him, so nobody draws a favour card.`;
  return (
    <>
      <div class="ht-sale-top">
        <CardZoom class="ht-cust" title={SALE_BUYER.name}><TradingCard who={SALE_BUYER.who} wants={[{ fruit: SALE_BUYER.fruit, qty: SALE_BUYER.qty, max: SALE_BUYER.max }]} eager /></CardZoom>
        <div class="ht-sale-want">
          <b>{SALE_BUYER.name} wants {SALE_BUYER.qty} blueberries</b>
          <small>{freshOnly ? `Today: Fresh only, up to $${SALE_BUYER.max} each.` : `Up to $${SALE_BUYER.max} for a Fresh one, $${SALE_BUYER.max - stageLess('okay', SALE_BUYER.fruit)} for Okay. He won't take Soft.`}</small>
          <div class="ht-seg" role="group" aria-label={`What ${SALE_BUYER.name} takes`}>
            <button type="button" class={freshOnly ? '' : 'on'} aria-pressed={!freshOnly} onClick={() => reset(false)}>Fresh or Okay</button>
            <button type="button" class={freshOnly ? 'on' : ''} aria-pressed={freshOnly} onClick={() => reset(true)}>Fresh only</button>
          </div>
          <span class="ht-got" role="status">{`Bought: ${moved.length} of ${SALE_BUYER.qty}`}</span>
          <span class="ht-basket" aria-hidden="true">{moved.map((m) => <Piece f={SALE_BUYER.fruit} stage={m.stage} size={18} cls="ht-in" />)}</span>
        </div>
      </div>
      <p class={`ht-ask ${done ? 'done' : ''}`} role="status">{ask}</p>
      <div class="ht-stalls">
        {SALE.map((st, si) => {
          const taken = moved.filter((m) => m.stall === st.id).map((m) => m.k);
          const n = note(st);
          return (
            <button type="button" class={`ht-stall ${guess === st.id ? 'picked' : ''} ${n === 'Order full' || n.startsWith('Fresh only') ? 'out' : ''}`} disabled={shown >= 0}
              aria-pressed={guess === st.id} aria-label={`Stall ${st.id}: ${st.stages.length} ${st.stages[0] === 'okay' ? 'Okay' : 'Fresh'} at $${st.price}${n ? `. ${n}` : ''}`}
              onClick={() => setGuess(st.id)}>
              <span class="ht-awn" style={{ background: seatColour(STALL_COLOURS[si]) }} />
              <b>Stall {st.id}</b>
              <span class="ht-st-pcs">{st.stages.map((s, k) => <Piece f={SALE_BUYER.fruit} stage={s} size={18} cls={taken.includes(k) ? 'gone' : ''} />)}</span>
              <PriceTag fruit={SALE_BUYER.fruit} price={st.price} tone={taken.length ? 'sold' : undefined} />
              <small class="ht-st-note">{n || (guess === st.id ? 'Your pick' : ' ')}</small>
            </button>
          );
        })}
      </div>
      {shown < 0
        ? <button type="button" class="btn primary ht-btn ht-go" disabled={!guess} onClick={() => setShown(0)}>Reveal sale</button>
        : <button type="button" class="btn ht-btn ht-go" onClick={() => reset()}>Try again</button>}
      <More title="Price ties">
        <p>If two stalls set the same price, a stall holding Favoured Trade can play it after the prices flip to win the tie. Otherwise ties go: {TIE_ORDER} in today's buying.</p>
      </More>
    </>
  );
}

/** The pages. `info`: a card behind an (i) at the page's top right. */
export const PAGES: { title: string; body: () => ComponentChildren; info?: { label: string; card: () => ComponentChildren } }[] = [
  { title: 'How to play', body: () => <HowToPlay /> },
  { title: 'Fruit & freshness', body: () => <Freshness /> },
  { title: 'Lorry & event', body: () => <LorryEvent /> },
  { title: 'Customer', body: () => <Customers />, info: { label: 'Who buys what', card: () => <WhoBuys /> } },
  { title: 'Favour', body: () => <Favours /> },
  { title: 'Market Day', body: () => <MarketDay /> },
  { title: 'Try a sale', body: () => <TrySale /> },
];

/**
 * How to play. PLAN-124: `inTab` draws it as Home's Rules tab (the bottom bar leaves it, so it has no Close).
 * REP-140 B-01 and B-16: the chapter tabs and Back / Next stay in view on every page and screen size; only the page
 * between them scrolls. The chapter shown is scrolled into view in the tab row.
 */
export function HowTo({ onDone, inTab }: { onDone: () => void; inTab?: boolean }) {
  const [i, setI] = useState(0);
  const [info, setInfo] = useState(false);
  const top = useRef<HTMLElement>(null);
  const tabs = useRef<HTMLElement>(null);
  const go = (k: number) => { setI(k); setInfo(false); top.current?.scrollTo?.({ top: 0 }); };
  useEffect(() => {
    const row = tabs.current;
    const on = row?.querySelector<HTMLElement>('button.on');
    if (row && on && row.scrollTo) row.scrollTo({ left: Math.max(0, on.offsetLeft - (row.clientWidth - on.offsetWidth) / 2) });
  }, [i]);
  const s = PAGES[i];
  return (
    <div class={`page howto tk-page${inTab ? ' howto-tab' : ''}`}>
      <header class="topbar">{!inTab && <button class="icon-btn" onClick={onDone} aria-label="Close">✕</button>}<div class="day"><b>How to play</b></div><span class="muted">{i + 1}/{PAGES.length}</span></header>
      <nav class="ht-tabs" aria-label="Rules pages" ref={tabs}>
        {PAGES.map((p, k) => <button type="button" class={k === i ? 'on' : ''} aria-current={k === i ? 'page' : undefined} onClick={() => go(k)}>{p.title}</button>)}
      </nav>
      <main class="scroll pad" ref={top}>
        <section class="panel slide" key={i}>
          <h2>{s.title}</h2>
          {s.info && <button type="button" class="ht-info" aria-label={s.info.label} aria-haspopup="dialog" onClick={() => { fx.tap(); setInfo(true); }}>i</button>}
          {s.body()}
          {s.info && info && <CardPop title={s.info.label} onClose={() => setInfo(false)}>{s.info.card()}</CardPop>}
        </section>
      </main>
      <footer class="ht-foot">
        <div class="row2">
          <button class="btn" disabled={i === 0} onClick={() => go(i - 1)}>← Back</button>
          {i < PAGES.length - 1 ? <button class="btn primary" onClick={() => go(i + 1)}>Next →</button> : <button class="btn primary" onClick={onDone}>Done</button>}
        </div>
      </footer>
    </div>
  );
}
