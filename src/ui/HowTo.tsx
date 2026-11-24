// How to play (PLAN-127): six pages in the order a game unfolds, each built round the game's own pictures (the
// shopkeeper and customer cards, fruit pieces, freshness letters, crates, the lorry, price tags, favour and upgrade
// cards), so players recognise them at the table. The tips stand where the decision happens, not on a page of their
// own. The wording follows RULES.md (rules 20) and the glossary (DEC-087): plain, one fact to a sentence. The numbers
// come from the game data, so the page cannot drift from the rules.
import type { ComponentChildren } from 'preact';
import { useEffect, useRef, useState } from 'preact/hooks';
import {
  BASE_BUY, CHARMER_DAILY_FAVOURS, FAVOUR_HAND_LIMIT, FRUIT, FRUITS, FAVOURS, START_CASH, JUICE_CAP, JUICE_VALUE,
  MARKET_DAY_EVERY, MAX_UPGRADES, NO_MANGO_DAYS, ORDER_CARDS, ORDER_LEAD, PREF_INFO, RIVALS, CHARACTER_TRAIT, TOP_UP,
  TRAITS, UPGRADES, acceptsStage, deliveredGreen, orderQty, stageAt,
  type FavourDef, type FavourId, type FruitId, type Pref, type Stage, type UpgradeId,
} from '../engine/data';
import { Coin, Fruit } from './art';
import { ART_SIZE, CardArt, DeckBack, FavourCard, StallSign, TradingCard, UpgradeCard, FAVOUR_WHEN, OrderCard } from './cards';
import { CardPop, CardZoom } from './cardZoom';
import { fx } from './fx';
import { favourArt, favourFocus, upgradeArt, upgradeFocus } from './deckArt';
import { LorrySprite } from './icons';
import { crateUrl } from './marketArt';
import { held, moveMs } from './motion';
import { MARKET_DAY_LIST, NO_ORDER_DAYS, TIE_ORDER } from './rulesText';
import { PriceTag, StallPreview } from './stampCard';
import { seatColour } from './table';
import { STAGE_LETTER } from './ticket';
import { STAGE_WORD } from './stageWords';
import './howto.css';

const GAME_PHASES = [
  ['Set-up', 'Pick a shopkeeper with one perk.'],
  ['Ordinary days', 'Five steps, then evening and night.'],
  ['Market Days', `Days ${MARKET_DAY_LIST}: a standing order to bid for (if it can be collected by the last day), and an upgrade to build that evening.`],
  ['The end', 'Most cash wins.'],
];

/** The page the freshness example is on (the evening's "Lights out" links to it). */
const FRESHNESS_PAGE = 2;

// ---------- small pieces drawn as the table draws them ----------

/** A freshness letter in its disc, as on the market boxes and your shelf (G, F, O, S). */
function Lamp({ stage, off }: { stage: Stage; off?: boolean }) {
  return <span class={`ht-lamp ${off ? 'off' : ''}`} aria-hidden="true">{STAGE_LETTER[stage]}</span>;
}

/** One piece of fruit with its freshness letter, as a market box or a shelf chip shows it. */
function Piece({ f, stage, size = 22, cls = '' }: { f: FruitId; stage: Stage; size?: number; cls?: string }) {
  return <span class={`ht-pc ${cls}`}><Fruit id={f} size={size} stage={stage} /><Lamp stage={stage} /></span>;
}

/** A small "?" piece: a rival's crate before the bell shows how many pieces, never which fruit. */
function Hidden() {
  return <span class="ht-pc ht-hid" aria-hidden="true">?</span>;
}

/** The crate the table draws under a stall's pieces. */
function Crate({ w = 116, children }: { w?: number; children?: ComponentChildren }) {
  const bh = Math.round(w * 0.36);
  const c = crateUrl('berry', w, bh);
  const scale = w / c.vw;
  return (
    <span class="ht-crate" style={{ width: `${w}px` }}>
      <span class="ht-crate-fruit">{children}</span>
      <span class="ht-crate-box" style={{ height: `${Math.round((bh + 2) * scale)}px` }}>
        <img src={c.url} width={w} alt="" draggable={false} style={{ marginTop: `${-Math.round(c.top * scale)}px` }} />
      </span>
    </span>
  );
}

/** A plain "more" row that opens in place (the price ties, running out of cash). */
function More({ title, children }: { title: string; children: ComponentChildren }) {
  return (
    <details class="ht-more">
      <summary>{title}</summary>
      <div>{children}</div>
    </details>
  );
}

/** A tip, standing beside the rule it is about. */
function Tip({ children }: { children: ComponentChildren }) {
  return <p class="ht-tip"><b>Tip</b>{children}</p>;
}

/**
 * One fruit's track as the market draws it, oldest step on the left and Fresh on the right, with what customers take
 * off for Okay and Soft. A fruit some lorry delivers green has its green steps after Fresh (the watermelon keeps a
 * green slot in the engine, but no lorry fills it). `at`: the box a piece stands in (-1: it spoiled).
 */
export function FruitTrack({ f, at }: { f: FruitId; at?: number }) {
  const slots = FRUIT[f].ripe.length + (deliveredGreen(f) ? FRUIT[f].unripeSlots : 0);
  return (
    <div class="demo-track ht-track" role="img" aria-label={`${FRUIT[f].name}: ${Array.from({ length: slots }, (_, i) => STAGE_WORD[stageAt(f, i)]).join(', ')}, oldest first`}>
      <Fruit id={f} size={22} />
      {Array.from({ length: slots }, (_, i) => {
        const st = stageAt(f, i);
        const drop = st === 'unripe' ? 0 : FRUIT[f].drop[i];
        return (
          <i class={`st-${st} ${at === i ? 'here' : ''}`} aria-label={st === 'unripe' ? 'green' : undefined}>
            <Lamp stage={st} />
            {at === i ? <span class="ht-tkn"><Fruit id={f} size={22} stage={st} /></span> : drop ? <small>{`−$${drop}`}</small> : null}
          </i>
        );
      })}
    </div>
  );
}

/** A track with "Advance one night": the piece moves one box left each night; after Soft it spoils. */
function NightTrack({ f, label }: { f: FruitId; label: string }) {
  const start = FRUIT[f].ripe.length - 1 + (deliveredGreen(f) ? FRUIT[f].unripeSlots : 0);
  const [at, setAt] = useState(start);
  const [night, setNight] = useState(0);
  const st = at >= 0 ? stageAt(f, at) : null;
  const say = st === null ? 'Spoiled. It is thrown away.'
    : st === 'unripe' ? 'Green. It cannot be sold yet.'
      : st === 'fresh' ? 'Fresh. Sells at the top price.'
        : st === 'okay' ? `Okay. Customers pay $${FRUIT[f].drop[at]} less.`
          : `Soft. Customers pay $${FRUIT[f].drop[at]} less. It spoils tonight.`;
  return (
    <div class="ht-night">
      <div class="ht-night-h"><b>{label}</b><span>{night === 0 ? 'Today' : `After ${night} night${night === 1 ? '' : 's'}`}</span></div>
      <FruitTrack f={f} at={at} />
      <p class="ht-night-say" role="status">{say}</p>
      {at >= 0
        ? <button type="button" class="btn ht-btn" onClick={() => { setAt(at - 1); setNight(night + 1); }}>Advance one night</button>
        : <button type="button" class="btn ht-btn" onClick={() => { setAt(start); setNight(0); }}>Start again</button>}
    </div>
  );
}

// ---------- page 1: quick start ----------

function QuickStart() {
  const [k, setK] = useState(0);
  const r = RIVALS[k];
  const trait = TRAITS[CHARACTER_TRAIT[r.avatar]];
  const step = (d: number) => setK((k + d + RIVALS.length) % RIVALS.length);
  return (
    <>
      <p>You run a fruit stall. Each day you <b>buy</b> fruit at the Wholesale Market and <b>sell</b> it to customers, against 1 to 5 rival stalls.</p>
      <div class="ht-hero">
        <StallPreview look={{}} avatar={r.avatar} name="Your stall" />
        <div class="ht-hero-cash">
          <span class="ht-cash"><Coin size={30} /><b>${START_CASH}</b></span>
          <small>each stall starts with</small>
          <span class="ht-win">Most cash wins.</span>
        </div>
      </div>
      <h3 class="ht-h3">Pick a shopkeeper</h3>
      <div class="ht-keeper">
        <CardZoom class="ht-keeper-card" title={r.name} wide><StallSign avatar={r.avatar} eager /></CardZoom>
        <div class="ht-keeper-t">
          <b>{r.name}</b>
          <span class="ht-perk">Perk: {trait.title}</span>
          <small>{trait.text}</small>
          <div class="ht-keeper-nav">
            <button type="button" class="btn ht-btn" onClick={() => step(-1)} aria-label="Previous shopkeeper">‹</button>
            <span>{k + 1} of {RIVALS.length}</span>
            <button type="button" class="btn ht-btn" onClick={() => step(1)} aria-label="Next shopkeeper">›</button>
          </div>
        </div>
      </div>
      <p>A game lasts 8, 10 or 14 days. There is about 1 customer a day for each stall. Fruit ages every night.</p>
      <ol class="day-strip">
        {GAME_PHASES.map(([name, text], i) => (
          <li><span class="beat-n">{i + 1}</span><div><b>{name}</b><small>{text}</small></div></li>
        ))}
      </ol>
      <p class="muted">Upgrades are worth nothing at the end, and so is fruit left on your shelf.</p>
    </>
  );
}

// ---------- page 2: one market day ----------

/** A rival's crate at Stocking (only the count) and after the bell (fruit and prices). */
function CrateReveal() {
  const [open, setOpen] = useState(false);
  const pieces: { f: FruitId; stage: Stage }[] = [{ f: 'apple', stage: 'fresh' }, { f: 'apple', stage: 'fresh' }, { f: 'blueberry', stage: 'okay' }];
  return (
    <div class="ht-reveal">
      <div class="ht-reveal-row">
        <span class="ht-awn" style={{ background: seatColour(0) }} />
        <b>{RIVALS[0].name}'s crate</b>
        <span class="ht-count">{open ? 'Open' : `${pieces.length} pieces`}</span>
      </div>
      <Crate>{pieces.map((p) => (open ? <Piece f={p.f} stage={p.stage} size={20} /> : <Hidden />))}</Crate>
      {open && <div class="ht-tags"><PriceTag fruit="apple" price={5} /><PriceTag fruit="blueberry" price={3} /></div>}
      <button type="button" class="btn ht-btn" aria-pressed={open} onClick={() => setOpen(!open)}>{open ? 'Back to Stocking' : 'Ring the bell'}</button>
    </div>
  );
}

function MarketDay() {
  return (
    <>
      <p>Every day has the same five steps, then evening and night.</p>
      <ol class="ht-day">
        <li>
          <span class="beat-n">1</span>
          <div><b>Morning</b><small>From Day 2 an event card is turned over. The lorry unloads at the Wholesale Market.</small></div>
          <span class="ht-vis ht-lorry" aria-hidden="true"><LorrySprite /></span>
        </li>
        <li>
          <span class="beat-n">2</span>
          <div>
            <b>Buying</b><small>{`Each stall buys up to ${BASE_BUY} pieces. The poorest stall goes first, then the others clockwise.`}</small>
            <More title="Running out of cash">
              <p>{`From Day 2, a stall with an empty shelf and less than $${TOP_UP} at dawn is topped up to $${TOP_UP}. Nobody is out of the game.`}</p>
            </More>
          </div>
          <span class="ht-vis ht-box" aria-hidden="true"><Piece f="blueberry" stage="fresh" size={18} /><b>${FRUIT.blueberry.cost.fresh}</b></span>
        </li>
        <li>
          <span class="beat-n">3</span>
          <div>
            <b>Stocking</b><small>Put the pieces you want to sell in your crate. Only those can sell today. Rivals see how many, not which fruit.</small>
            <Tip>Watch what rivals take while they buy. It is not shown again after buying. If you remember what they hold, you can guess which fruit is in their crate.</Tip>
          </div>
        </li>
        <li>
          <span class="beat-n">4</span>
          <div><b>The bell</b><small>Set one secret price for each fruit in your crate. Prices and crates open together.</small></div>
        </li>
        <li class="ht-wide"><CrateReveal /></li>
        <li>
          <span class="beat-n">5</span>
          <div><b>The rush</b><small>Customers buy from the cheapest stall first. You are paid at once.</small></div>
          <span class="ht-vis" aria-hidden="true"><PriceTag fruit="blueberry" price={3} tone="sold" /></span>
        </li>
        <li>
          <span class="beat-n" />
          <div><b>Evening</b><small>Play an evening favour card. After a Market Day, build 1 upgrade.</small></div>
          <span class="ht-vis ht-mini" aria-hidden="true"><DeckBack deck="favour" /></span>
        </li>
        <li>
          <span class="beat-n" />
          <div><b>Night</b><small>All fruit ages one step. A Soft piece that ages spoils and is thrown away.</small></div>
          <span class="ht-vis ht-age" aria-hidden="true"><Piece f="apple" stage="fresh" size={16} />›<Piece f="apple" stage="okay" size={16} /></span>
        </li>
      </ol>
      <p class="muted">What a stall holds is secret. Before the bell you only know how many pieces each rival has in their crate, not which fruit or the price.</p>
    </>
  );
}

// ---------- page 3: fruit and freshness ----------

const PREFS: Pref[] = ['premium', 'everyday', 'bargain'];
const SOLD_STAGES: Stage[] = ['fresh', 'okay', 'notso'];

function Freshness() {
  return (
    <>
      <p>Every night all fruit ages one step: <b>Fresh</b>, then <b>Okay</b>, then <b>Soft</b>, then it spoils. On the track the oldest step is on the left and Fresh on the right, so a piece moves one box left each night.</p>
      <NightTrack f="blueberry" label="A blueberry" />
      <Tip>Blueberries are cheap but last only 3 days. Sell them first.</Tip>
      <h3 class="ht-h3">Who buys what</h3>
      <table class="ht-accept">
        <thead><tr><th scope="col">Customer</th>{SOLD_STAGES.map((s) => <th scope="col"><Lamp stage={s} /> {STAGE_WORD[s]}</th>)}</tr></thead>
        <tbody>
          {PREFS.map((p) => (
            <tr class={`pref-${p}`}>
              <th scope="row"><b>{PREF_INFO[p].title}</b></th>
              {SOLD_STAGES.map((s, i) => (acceptsStage(p, s)
                ? <td class="yes">{i === 0 ? 'Top price' : `$${i} less`}</td>
                : <td class="no">Won't buy</td>))}
            </tr>
          ))}
        </tbody>
      </table>
      <h3 class="ht-h3">The four fruits</h3>
      {FRUITS.map((f) => (
        <div class="demo-fruit">
          <FruitTrack f={f} />
          <small>{FRUIT[f].theme}</small>
        </div>
      ))}
      <NightTrack f="mango" label="A mango: Green to Fresh" />
      <Tip>{`No customer wants a mango in the first ${NO_MANGO_DAYS} days. Every mango arrives Green and needs ${FRUIT.mango.unripeSlots} nights to ripen.`}</Tip>
      <Tip>{`Fruit that spoils tonight is worth $0 tomorrow, so any sale beats none. With a Juice Bar, up to ${JUICE_CAP} of them become juice instead: $${JUICE_VALUE} each.`}</Tip>
      <p class="muted">Fresh fruit costs more to buy, but customers pay more for it.</p>
    </>
  );
}

// ---------- page 4: try a sale ----------

interface SaleStall { id: string; seat: number; stages: Stage[]; price: number }
/** The example from the old rules page: Bobby Books wants 3 blueberries and pays up to $5 for a Fresh one. */
const BOBBY = { who: 'Robert', name: 'Bobby Books', fruit: 'blueberry' as FruitId, qty: 3, max: 5 };
const SALE: SaleStall[] = [
  { id: 'A', seat: 0, stages: ['fresh', 'fresh'], price: 4 },
  { id: 'B', seat: 1, stages: ['okay'], price: 3 },
  { id: 'C', seat: 2, stages: ['fresh', 'fresh'], price: 5 },
];
const FRESHER: Stage[] = ['fresh', 'okay', 'notso', 'unripe'];
const STALL_COLOURS = [3, 1, 5];

/** The pieces this customer takes, in order: cheapest first, then fresher; only freshness they buy, at a price they pay. */
export function saleOrder(pref: Pref, stalls = SALE): { stall: string; k: number; price: number; stage: Stage }[] {
  const lessFor = (s: Stage) => (s === 'okay' ? 1 : s === 'notso' ? 2 : 0);
  return stalls
    .flatMap((st) => st.stages.map((stage, k) => ({ stall: st.id, k, price: st.price, stage })))
    .filter((p) => acceptsStage(pref, p.stage) && p.price <= BOBBY.max - lessFor(p.stage))
    .sort((a, b) => a.price - b.price || FRESHER.indexOf(a.stage) - FRESHER.indexOf(b.stage))
    .slice(0, BOBBY.qty);
}

function TrySale() {
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
  return (
    <>
      <div class="ht-sale-top">
        <CardZoom class="ht-cust" title={BOBBY.name}><TradingCard who={BOBBY.who} wants={[{ fruit: BOBBY.fruit, qty: BOBBY.qty, max: BOBBY.max }]} eager /></CardZoom>
        <div class="ht-sale-want">
          <b>{BOBBY.name} wants 3 blueberries</b>
          <small>{freshOnly ? 'Today: Fresh only, up to $5 each.' : 'Up to $5 for a Fresh one, $4 for Okay. He won\'t take Soft.'}</small>
          <div class="ht-seg" role="group" aria-label="What Bobby takes">
            <button type="button" class={freshOnly ? '' : 'on'} aria-pressed={!freshOnly} onClick={() => reset(false)}>Fresh or Okay</button>
            <button type="button" class={freshOnly ? 'on' : ''} aria-pressed={freshOnly} onClick={() => reset(true)}>Fresh only</button>
          </div>
          <span class="ht-got" role="status">{shown < 0 ? 'Bought: 0 of 3' : `Bought: ${moved.length} of ${BOBBY.qty}`}</span>
          <span class="ht-basket" aria-hidden="true">{moved.map((m) => <Piece f={BOBBY.fruit} stage={m.stage} size={18} cls="ht-in" />)}</span>
        </div>
      </div>
      <p class="ht-ask">{shown < 0 ? (guess ? 'Now reveal the sale.' : 'Who sells first? Tap a stall.') : done ? 'Order full: 3 of 3 bought.' : 'Selling…'}</p>
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
              <span class="ht-st-pcs">{st.stages.map((s, k) => <Piece f={BOBBY.fruit} stage={s} size={18} cls={taken.includes(k) ? 'gone' : ''} />)}</span>
              <PriceTag fruit={BOBBY.fruit} price={st.price} tone={taken.length ? 'sold' : undefined} />
              <small class="ht-st-note">{n || (guess === st.id ? 'Your pick' : ' ')}</small>
            </button>
          );
        })}
      </div>
      {shown < 0
        ? <button type="button" class="btn primary ht-btn ht-go" disabled={!guess} onClick={() => setShown(0)}>Reveal sale</button>
        : <button type="button" class="btn ht-btn ht-go" onClick={() => reset()}>Try again</button>}
      {done && (
        <div class="ht-verdict" role="status">
          {guess && <p><b>{guess === first ? 'Right!' : 'Not quite.'}</b>{` Stall ${first} sold first: it was the cheapest stall ${BOBBY.name} would buy from.`}</p>}
          <p>{freshOnly
            ? 'Fresh only: B\'s Okay blueberry is not taken, even at $3. A sells 2 at $4, then C sells 1 at $5.'
            : 'B sells 1 at $3. A sells the other 2 at $4. His order is full, so C sells nothing, even though its fruit was Fresh.'}</p>
          {!freshOnly && <button type="button" class="btn ht-btn" onClick={() => reset(true)}>Now try Fresh only</button>}
        </div>
      )}
      <More title="Price ties">
        <p>If two stalls set the same price, a stall holding Favoured Trade can play it after the prices flip to win the tie. Otherwise ties go: {TIE_ORDER} in today's buying.</p>
      </More>
      <Tip>If no rival is selling a fruit, charge the most customers will pay for it.</Tip>
      <p class="muted">Nobody waits overnight: a customer who doesn't get everything leaves at the end of the day.</p>
    </>
  );
}

// ---------- page 5: favours and closing ----------

const WHEN_ORDER: FavourDef['when'][] = ['buy', 'tie', 'evening'];

/** A card's picture, name and words, readable at phone size; a tap opens the whole card (cardZoom.tsx). */
function Tile({ pic, title, text, card, cls = '' }: { pic: ComponentChildren; title: string; text: string; card: ComponentChildren; cls?: string }) {
  const [open, setOpen] = useState(false);
  return (
    <>
      <button type="button" class={`ht-fav ${cls}`} aria-haspopup="dialog" aria-label={`${title}: ${text} See the whole card`} onClick={() => { fx.tap(); setOpen(true); }}>
        <span class="ht-fav-pic" aria-hidden="true">{pic}</span>
        <b aria-hidden="true">{title}</b>
        <small aria-hidden="true">{text}</small>
      </button>
      {open && <CardPop title={title} onClose={() => setOpen(false)}>{card}</CardPop>}
    </>
  );
}

function FavourTile({ id }: { id: FavourId }) {
  const d = FAVOURS[id];
  const [w, h] = ART_SIZE.small;
  return <Tile pic={<CardArt src={favourArt(id)} alt="" w={w} h={h} focus={favourFocus(id)} />} title={d.title} text={d.text} card={<FavourCard id={id} />} />;
}

function UpgradeTile({ id }: { id: UpgradeId }) {
  const d = UPGRADES[id];
  const [w, h] = ART_SIZE.small;
  return <Tile cls="ht-up" pic={<CardArt src={upgradeArt(id)} alt="" w={w} h={h} focus={upgradeFocus(id)} />} title={`${d.title} · $${d.cost}`} text={d.text} card={<UpgradeCard id={id} />} />;
}

function Favours({ go }: { go: (page: number) => void }) {
  return (
    <>
      <p>Serve a customer's <b>whole order by yourself</b> and you draw a secret favour card (1 a day; {CHARMER_DAILY_FAVOURS} for the Charmer). You hold up to {FAVOUR_HAND_LIMIT} ({FAVOUR_HAND_LIMIT + 1} for the Charmer).</p>
      <div class="ht-earn" aria-label="A whole order served by you alone earns a face-down favour card">
        <span class="ht-earn-ord"><Piece f="blueberry" stage="fresh" size={16} /><Piece f="blueberry" stage="fresh" size={16} /><Piece f="blueberry" stage="fresh" size={16} /><small>3 of 3, all from you</small></span>
        <span class="ht-arrow" aria-hidden="true">→</span>
        <span class="ht-mini ht-mini-l" aria-hidden="true"><DeckBack deck="favour" /></span>
      </div>
      <p>Play it when its card says. Tap a card to see it whole.</p>
      {WHEN_ORDER.map((when) => (
        <section class="ht-when">
          <h3 class="ht-h3">{FAVOUR_WHEN[when]}</h3>
          <div class="ht-favs">{(Object.keys(FAVOURS) as FavourId[]).filter((id) => FAVOURS[id].when === when).map((id) => <FavourTile id={id} />)}</div>
        </section>
      ))}
      <h3 class="ht-h3">Lights out</h3>
      <p>Everyone with something to decide in the evening does it at the same time, then taps Lights out. At night <b>all fruit ages one step</b>. A Soft piece that ages spoils and is thrown away.</p>
      <button type="button" class="btn ht-btn" onClick={() => go(FRESHNESS_PAGE)}>See the freshness example</button>
    </>
  );
}

// ---------- page 6: Market Days and the end ----------

const ORDER = ORDER_CARDS[0];
const ORDER_N = orderQty(3);
const BID = 7;

function Finish() {
  const bidDay = MARKET_DAY_EVERY, dueDay = MARKET_DAY_EVERY + ORDER_LEAD;
  const up = Object.keys(UPGRADES) as UpgradeId[];
  return (
    <>
      <section class="ht-ref">
        <h3 class="ht-h3">Market Days</h3>
        <p>Days {MARKET_DAY_LIST} are <b>Market Days</b>. That morning a <b>standing order</b> is turned over: one big order, collected {ORDER_LEAD} days later. It comes only if it can be collected by the last day, so there is none on {NO_ORDER_DAYS}. Each stall bids a price per piece, or passes. You see who is bidding but not their bids, and you can change yours until the last stall decides. The <b>lowest bid wins</b> and puts down a <b>stake</b>. On the due day the order takes the winner's own Fresh or Okay pieces and pays the bid for each. Deliver them all and the stake comes back; deliver fewer and it's lost. Only the winner can fill it.</p>
        <div class="ht-strip">
          <div class="ht-strip-d">
            <span class="ht-dlab">Day {bidDay}</span>
            <CardZoom class="ht-mini ht-mini-o" title={ORDER.title}><OrderCard card={ORDER} qty={ORDER_N} bid={BID} stake={ORDER.stake} /></CardZoom>
            <b class="ht-ord-t">{ORDER.title}</b>
            <small>{`Wants ${ORDER_N} ${FRUIT[ORDER.fruit].plural.toLowerCase()}. You bid $${BID} a piece and win. Put down the $${ORDER.stake} stake.`}</small>
          </div>
          <span class="ht-arrow" aria-hidden="true">→</span>
          <div class="ht-strip-d">
            <span class="ht-dlab">Day {dueDay}</span>
            <span class="ht-strip-pcs">{Array.from({ length: ORDER_N }, () => <Piece f={ORDER.fruit} stage="fresh" size={16} />)}</span>
            <small>{`Deliver all ${ORDER_N}: paid ${ORDER_N} × $${BID} = $${ORDER_N * BID}, and the $${ORDER.stake} stake comes back.`}</small>
            <small class="ht-lose">{`Deliver ${ORDER_N - 1}: paid $${(ORDER_N - 1) * BID}, and the stake is lost.`}</small>
          </div>
        </div>
        <p>That evening you may build <b>1 upgrade</b>. Your stall has room for {MAX_UPGRADES}. Swipe through all {up.length}; tap one to see the whole card.</p>
        <div class="ht-ups">{up.map((id) => <UpgradeTile id={id} />)}</div>
      </section>
      <section class="ht-ref">
        <h3 class="ht-h3">The end</h3>
        <p>The last day is an ordinary day. After its rush the market closes. Fruit left on your shelf is worth nothing.</p>
        <div class="ht-receipt" role="img" aria-label="Final count example: You and Rosa both have $41; you sold 24 pieces and Rosa 21, so you win.">
          <div class="ht-rc-h"><span>Final count</span><span>Cash</span><span>Fruit sold</span></div>
          <div class="win"><span>You</span><b>$41</b><span>24</span></div>
          <div><span>{RIVALS[0].name}</span><b>$41</b><span>21</span></div>
          <div><span>{RIVALS[1].name}</span><b>$33</b><span>19</span></div>
          <div class="ht-rc-f">Cash first. Level on cash: more fruit sold wins.</div>
        </div>
        <p><b>Most cash wins.</b> Upgrades count for nothing. If stalls tie, the one that sold more fruit wins: every piece sold to a customer, a guest, a standing order or the night hawker counts. If that is level too, they share the win.</p>
      </section>
    </>
  );
}

const PAGES: { part: string; title: string; body: (go: (page: number) => void) => ComponentChildren }[] = [
  { part: 'Start', title: 'Quick start', body: () => <QuickStart /> },
  { part: 'The day', title: 'One market day', body: () => <MarketDay /> },
  { part: 'The day', title: 'Fruit & freshness', body: () => <Freshness /> },
  { part: 'The day', title: 'Try a sale', body: () => <TrySale /> },
  { part: 'Evening', title: 'Favours & closing', body: (go) => <Favours go={go} /> },
  { part: 'The finish', title: 'Market Days & the end', body: () => <Finish /> },
];

/** How to play. PLAN-124: `inTab` draws it as Home's Rules tab (the bottom bar leaves it, so it has no Close). */
export function HowTo({ onDone, inTab }: { onDone: () => void; inTab?: boolean }) {
  const [i, setI] = useState(0);
  const top = useRef<HTMLElement>(null);
  const go = (k: number) => { setI(k); top.current?.scrollTo?.({ top: 0 }); };
  const s = PAGES[i];
  return (
    <div class={`page howto tk-page${inTab ? ' howto-tab' : ''}`}>
      <header class="topbar">{!inTab && <button class="icon-btn" onClick={onDone} aria-label="Close">✕</button>}<div class="day"><b>How to play</b></div><span class="muted">{i + 1}/{PAGES.length}</span></header>
      <main class="scroll pad" ref={top}>
        <nav class="ht-tabs" aria-label="Rules pages">
          {PAGES.map((p, k) => <button type="button" class={k === i ? 'on' : ''} aria-current={k === i ? 'page' : undefined} onClick={() => go(k)}>{p.title}</button>)}
        </nav>
        <section class="panel slide" key={i}>
          <small class="slide-part">{s.part}</small>
          <h2>{s.title}</h2>
          {s.body(go)}
        </section>
        <div class="dots">{PAGES.map((_, k) => <span class={k === i ? 'on' : ''} onClick={() => go(k)} />)}</div>
        <div class="row2">
          <button class="btn" disabled={i === 0} onClick={() => go(i - 1)}>← Back</button>
          {i < PAGES.length - 1 ? <button class="btn primary" onClick={() => go(i + 1)}>Next →</button> : <button class="btn primary" onClick={onDone}>Done</button>}
        </div>
      </main>
    </div>
  );
}
