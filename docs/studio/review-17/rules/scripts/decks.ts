// Part 1: the decks, exactly. Read-only analysis of CUSTOMER_CARDS and FARMER_CARDS.
import {
  BIG_TABLE, CUSTOMER_CARDS, EVENT_CARDS, FARMER_CARDS, FRUIT, FRUITS, GENEROUS_BONUS, ROW_CAP, STREET_PRICE, lookOf, orderQty, prefOf,
  type FruitId, type Stalls,
} from '/home/user/Fruit-Market/src/engine/data';

const F: FruitId[] = ['blueberry', 'watermelon', 'apple', 'mango'];
const S: Stalls[] = [2, 3, 4, 5, 6];
const out: string[] = [];
const p = (s = '') => out.push(s);
const r2 = (x: number) => (Math.round(x * 100) / 100).toFixed(2);
const sum = (a: number[]) => a.reduce((x, y) => x + y, 0);

// ---------- A. customers ----------
p('## A. The 36 customer cards');
p('');
p('| # | Card (code name) | Type | Want 1 | Want 2 | Pieces | vs usual |');
p('|---|---|---|---|---|---|---|');
CUSTOMER_CARDS.forEach((c, i) => {
  const w = c.wants.map((x) => `${x.qty} ${x.fruit} @ ${x.max}`);
  const d = c.wants.map((x) => { const k = x.max - STREET_PRICE[x.fruit]; return `${x.fruit[0]}${k >= 0 ? '+' : ''}${k}`; }).join(' ');
  p(`| ${i + 1} | ${lookOf(c.name).title} (${c.name}) | ${prefOf(c.name)} | ${w[0]} | ${w[1] ?? ''} | ${sum(c.wants.map((x) => x.qty))} | ${d} |`);
});
p('');
const pieces = sum(CUSTOMER_CARDS.map((c) => sum(c.wants.map((w) => w.qty))));
p(`Total pieces: ${pieces}; per card ${r2(pieces / 36)}. One-fruit cards: ${CUSTOMER_CARDS.filter((c) => c.wants.length === 1).length}; two-fruit cards: ${CUSTOMER_CARDS.filter((c) => c.wants.length === 2).length}.`);
p('');
p('### Per fruit');
p('| Fruit | Cards wanting it | Pieces | Share of pieces | As first fruit (cards) | As second fruit (cards) | Mean top price | Min | Max | Usual |');
p('|---|---|---|---|---|---|---|---|---|---|');
for (const f of F) {
  const ws = CUSTOMER_CARDS.flatMap((c) => c.wants.filter((w) => w.fruit === f));
  const first = CUSTOMER_CARDS.filter((c) => c.wants[0].fruit === f).length;
  const second = CUSTOMER_CARDS.filter((c) => c.wants[1]?.fruit === f).length;
  const pc = sum(ws.map((w) => w.qty));
  const wmean = sum(ws.map((w) => w.qty * w.max)) / pc;
  p(`| ${f} | ${ws.length} | ${pc} | ${r2((100 * pc) / pieces)}% | ${first} | ${second} | ${r2(wmean)} (per piece) | ${Math.min(...ws.map((w) => w.max))} | ${Math.max(...ws.map((w) => w.max))} | ${STREET_PRICE[f]} |`);
}
p('');
p('### Price histogram per fruit (pieces at each top price; cards in brackets)');
for (const f of F) {
  const ws = CUSTOMER_CARDS.flatMap((c, i) => c.wants.filter((w) => w.fruit === f).map((w) => ({ ...w, i: i + 1, pref: prefOf(c.name) })));
  const prices = [...new Set(ws.map((w) => w.max))].sort((a, b) => a - b);
  p(`- **${f}** (usual ${STREET_PRICE[f]}): ` + prices.map((pr) => {
    const g = ws.filter((w) => w.max === pr);
    return `$${pr}: ${sum(g.map((w) => w.qty))} pcs [${g.map((w) => `#${w.i}${w.pref[0].toUpperCase()}`).join(' ')}]`;
  }).join('; '));
}
p('');
p('### Per type');
p('| Type | Cards | Pieces | blueberry pcs | watermelon pcs | apple pcs | mango pcs | Offsets from usual (count of wants) |');
p('|---|---|---|---|---|---|---|---|');
for (const t of ['premium', 'everyday', 'bargain'] as const) {
  const cs = CUSTOMER_CARDS.filter((c) => prefOf(c.name) === t);
  const offs: Record<string, number> = {};
  cs.forEach((c) => c.wants.forEach((w) => { const k = w.max - STREET_PRICE[w.fruit]; offs[k] = (offs[k] ?? 0) + 1; }));
  p(`| ${t} | ${cs.length} | ${sum(cs.map((c) => sum(c.wants.map((w) => w.qty))))} | ${F.map((f) => sum(cs.flatMap((c) => c.wants.filter((w) => w.fruit === f).map((w) => w.qty)))).join(' | ')} | ${Object.keys(offs).map(Number).sort((a, b) => a - b).map((k) => `${k >= 0 ? '+' : ''}${k}: ${offs[k]}`).join(', ')} |`);
}
p('');
p('### Cards that break the printed price pattern');
p('Claim (RULES.md, Cards): Bargain pays $1 or $2 under the usual price, Premium $1 or $2 over, Everyday within $1.');
CUSTOMER_CARDS.forEach((c, i) => {
  const t = prefOf(c.name);
  c.wants.forEach((w) => {
    const k = w.max - STREET_PRICE[w.fruit];
    const ok = t === 'bargain' ? k === -1 || k === -2 : t === 'premium' ? k === 1 || k === 2 : Math.abs(k) <= 1;
    if (!ok) p(`- #${i + 1} ${lookOf(c.name).title} (${t}): ${w.qty} ${w.fruit} @ ${w.max} is ${k >= 0 ? '+' : ''}${k} from usual ${STREET_PRICE[w.fruit]}`);
  });
});
p('');
p('### Generous customers (Fixed prices option): any want at least usual + 2');
CUSTOMER_CARDS.forEach((c, i) => { if (c.wants.some((w) => w.max >= STREET_PRICE[w.fruit] + GENEROUS_BONUS)) p(`- #${i + 1} ${lookOf(c.name).title} (${prefOf(c.name)}): ${c.wants.map((w) => `${w.qty} ${w.fruit} @ ${w.max}`).join(', ')}`); });
p('');
p('### Duplicates and dominated cards');
const key = (c: typeof CUSTOMER_CARDS[number]) => [...c.wants].sort((a, b) => a.fruit.localeCompare(b.fruit)).map((w) => `${w.qty}${w.fruit}@${w.max}`).join('+');
const groups: Record<string, number[]> = {};
CUSTOMER_CARDS.forEach((c, i) => { (groups[key(c)] ??= []).push(i + 1); });
for (const [k, v] of Object.entries(groups)) if (v.length > 1) p(`- Same wants (ignoring order): ${k}: ${v.map((i) => `#${i} ${lookOf(CUSTOMER_CARDS[i - 1].name).title} (${prefOf(CUSTOMER_CARDS[i - 1].name)})`).join(', ')}`);
// same fruit set and quantities, prices all >= : dominance
const shape = (c: typeof CUSTOMER_CARDS[number]) => [...c.wants].sort((a, b) => a.fruit.localeCompare(b.fruit)).map((w) => `${w.qty}${w.fruit}`).join('+');
const rank = { premium: 0, everyday: 1, bargain: 2 } as const; // bargain accepts most
CUSTOMER_CARDS.forEach((a, i) => CUSTOMER_CARDS.forEach((b, j) => {
  if (i === j || shape(a) !== shape(b) || key(a) === key(b)) return;
  const sa = [...a.wants].sort((x, y) => x.fruit.localeCompare(y.fruit)), sb = [...b.wants].sort((x, y) => x.fruit.localeCompare(y.fruit));
  if (sa.every((w, k) => w.max >= sb[k].max) && rank[prefOf(a.name)] >= rank[prefOf(b.name)]) p(`- #${i + 1} ${lookOf(a.name).title} (${prefOf(a.name)}) is strictly better for sellers than #${j + 1} ${lookOf(b.name).title} (${prefOf(b.name)}): same pieces, every price >=, accepts at least the same freshness`);
}));
p('');
p('### Margin per piece against wholesale cost');
p('Sale price = top price for Fresh, top-1 Okay, top-2 Soft (only if the type accepts it). Cost columns: bought Fresh (mango: green $3), bought Okay at the market, bought Soft at the market.');
p('| # | Card | Type | Fruit | Top | Fresh sale - fresh cost | Okay sale - fresh cost / - okay cost | Soft sale - fresh cost / - soft cost |');
p('|---|---|---|---|---|---|---|---|');
CUSTOMER_CARDS.forEach((c, i) => c.wants.forEach((w) => {
  const t = prefOf(c.name);
  const cost = FRUIT[w.fruit].cost;
  const freshCost = w.fruit === 'mango' ? cost.unripe : cost.fresh;
  const okay = t === 'premium' ? 'n/a' : `${w.max - 1 - freshCost} / ${w.max - 1 - cost.okay}`;
  const soft = t !== 'bargain' ? 'n/a' : `${w.max - 2 - freshCost} / ${w.max - 2 - cost.notso}`;
  p(`| ${i + 1} | ${lookOf(c.name).title} | ${t} | ${w.fruit} x${w.qty} | ${w.max} | ${w.max - freshCost}${w.fruit === 'mango' ? ` (ripe-bought: ${w.max - cost.fresh})` : ''} | ${okay} | ${soft} |`);
}));
p('');
p('Lowest-margin wants (Fresh sale at top price minus fresh cost <= 2):');
CUSTOMER_CARDS.forEach((c, i) => c.wants.forEach((w) => { const fc = w.fruit === 'mango' ? 3 : FRUIT[w.fruit].cost.fresh; if (w.max - fc <= 2) p(`- #${i + 1} ${lookOf(c.name).title} (${prefOf(c.name)}): ${w.qty} ${w.fruit} @ ${w.max}: fresh margin ${w.max - fc}`); }));
p('');

// 6-stall +1
p('### The 6-stall "+1 of the first fruit" rule');
p('| Fruit | Deck pieces (2-5 stalls) | Extra pieces across the deck at 6 stalls (= cards with it first) | Deck pieces at 6 | Growth |');
p('|---|---|---|---|---|');
for (const f of F) {
  const base = sum(CUSTOMER_CARDS.flatMap((c) => c.wants.filter((w) => w.fruit === f).map((w) => w.qty)));
  const first = CUSTOMER_CARDS.filter((c) => c.wants[0].fruit === f).length;
  p(`| ${f} | ${base} | ${first} | ${base + first} | +${r2((100 * first) / base)}% |`);
}
p(`| all | ${pieces} | 36 | ${pieces + 36} | +${r2((100 * 36) / pieces)}% |`);
p('');

// expected demand per day
const perCard = (f: FruitId, six: boolean) => sum(CUSTOMER_CARDS.map((c) => sum(c.wants.map((w, i) => (w.fruit === f ? w.qty + (six && i === 0 ? 1 : 0) : 0))))) / 36;
const rowCards = (n: number) => Math.min(n, ROW_CAP);
p('### Expected pieces wanted per day (regular + walk-ins, no event, no guest, no standing order)');
p('| Stalls | Cards in row | blueberry | watermelon | apple | mango | Total | Per stall |');
p('|---|---|---|---|---|---|---|---|');
const demand: Record<number, Record<FruitId, number>> = {};
for (const n of S) {
  const d = Object.fromEntries(F.map((f) => [f, rowCards(n) * perCard(f, n >= BIG_TABLE)])) as Record<FruitId, number>;
  demand[n] = d;
  const tot = sum(F.map((f) => d[f]));
  p(`| ${n} | ${rowCards(n)} | ${F.map((f) => r2(d[f])).join(' | ')} | ${r2(tot)} | ${r2(tot / n)} |`);
}
p('');
// freshness-restricted demand: share of pieces by type per fruit
p('### Who will take what: pieces per fruit by freshness type');
p('| Fruit | Premium (Fresh only) | Everyday (Fresh/Okay) | Bargain (any) | Share Fresh-only |');
p('|---|---|---|---|---|');
for (const f of F) {
  const by = (t: string) => sum(CUSTOMER_CARDS.filter((c) => prefOf(c.name) === t).flatMap((c) => c.wants.filter((w) => w.fruit === f).map((w) => w.qty)));
  const tot = by('premium') + by('everyday') + by('bargain');
  p(`| ${f} | ${by('premium')} | ${by('everyday')} | ${by('bargain')} | ${r2((100 * by('premium')) / tot)}% |`);
}
p('');

// ---------- B. lorries ----------
p('## B. The 20 lorry cards (blueberry / watermelon / apple / mango)');
p('');
p('| # | Lorry | 2 stalls | 3 stalls | 4 stalls | 5 stalls | 6 stalls | Totals 2/3/4/5/6 |');
p('|---|---|---|---|---|---|---|---|');
FARMER_CARDS.forEach((c, i) => {
  p(`| ${i + 1} | ${c.name}${c.okay ? ' (Okay)' : ''} | ${S.map((n) => F.map((f) => c.table[n][f]).join('/')).join(' | ')} | ${S.map((n) => sum(F.map((f) => c.table[n][f]))).join('/')} |`);
});
p('');
p('### Per fruit and row: mean / min / max / standard deviation, and mean per stall');
p('| Stalls | Fruit | Mean | Min | Max | SD | Mean per stall | Cards with 0 | Cards with 1 |');
p('|---|---|---|---|---|---|---|---|---|');
const supply: Record<number, Record<FruitId, number>> = {};
for (const n of S) {
  supply[n] = {} as Record<FruitId, number>;
  for (const f of F) {
    const v = FARMER_CARDS.map((c) => c.table[n][f]);
    const m = sum(v) / 20;
    supply[n][f] = m;
    const sd = Math.sqrt(sum(v.map((x) => (x - m) ** 2)) / 20);
    p(`| ${n} | ${f} | ${r2(m)} | ${Math.min(...v)} | ${Math.max(...v)} | ${r2(sd)} | ${r2(m / n)} | ${v.filter((x) => x === 0).length} | ${v.filter((x) => x === 1).length} |`);
  }
  const tv = FARMER_CARDS.map((c) => sum(F.map((f) => c.table[n][f])));
  const tm = sum(tv) / 20;
  p(`| ${n} | **all** | ${r2(tm)} | ${Math.min(...tv)} | ${Math.max(...tv)} | ${r2(Math.sqrt(sum(tv.map((x) => (x - tm) ** 2)) / 20))} | ${r2(tm / n)} | | |`);
}
p('');
p('### Rows that do not grow, or jump, from one table size to the next');
FARMER_CARDS.forEach((c, i) => {
  for (const f of F) {
    const v = S.map((n) => c.table[n][f]);
    const notes: string[] = [];
    for (let k = 1; k < v.length; k++) {
      if (v[k] < v[k - 1]) notes.push(`falls ${v[k - 1]}->${v[k]} at ${S[k]} stalls`);
    }
    const flats = v.map((x, k) => (k > 0 && x === v[k - 1] ? S[k] : 0)).filter(Boolean);
    const jumps = v.map((x, k) => (k > 0 ? x - v[k - 1] : 0));
    const maxJump = Math.max(...jumps);
    if (notes.length) p(`- #${i + 1} ${c.name} ${f}: ${v.join('/')}: ${notes.join(', ')}`);
    // flag: flat twice in a row, or a jump of >= 3 next to a flat, or per-stall falling a lot
    if (flats.length >= 2 && v[4] > 0) p(`- #${i + 1} ${c.name} ${f}: ${v.join('/')}: flat at ${flats.join(' and ')} stalls`);
    if (maxJump >= 3 && jumps.some((j, k) => k > 0 && j === 0)) p(`- #${i + 1} ${c.name} ${f}: ${v.join('/')}: flat step and a jump of ${maxJump}`);
  }
  const tv = S.map((n) => sum(F.map((f) => c.table[n][f])));
  const per = tv.map((t, k) => t / S[k]);
  if (Math.max(...per) - Math.min(...per) > 1.0) p(`- #${i + 1} ${c.name} total ${tv.join('/')}: per stall ${per.map(r2).join('/')} (swing > 1.0 per stall)`);
});
p('');
p('### Card totals per row against the stated averages (8 / 11 / 15 / 19 / 24) and buying capacity (4 per stall)');
p('| Stalls | Mean total | Stated | Buy capacity 4n | Capacity with all Handcarts 5n | Days the lorry alone exceeds 4n (cards of 20) | Days the lorry is under 3n (cards) |');
p('|---|---|---|---|---|---|---|');
for (const n of S) {
  const tv = FARMER_CARDS.map((c) => sum(F.map((f) => c.table[n][f])));
  p(`| ${n} | ${r2(sum(tv) / 20)} | ${[8, 11, 15, 19, 24][n - 2]} | ${4 * n} | ${5 * n} | ${tv.filter((t) => t > 4 * n).length} | ${tv.filter((t) => t < 3 * n).length} |`);
}
p('');

// event-adjusted supply (events from day 2; each event equally likely on an event day)
const evSupply = (n: number, f: FruitId, days: number) => {
  // average over the 20 events of expected delivery of f on an event day
  const cards = FARMER_CARDS.map((c) => c.table[n as Stalls][f]);
  let tot = 0;
  for (const e of EVENT_CARDS) {
    let m = 0;
    for (const base of cards) {
      let k = base + (e.supplyAll ? e.supplyAll * Math.ceil(n / 4) : 0) + (e.supplyEach?.[f] ? Math.ceil((e.supplyEach[f]! * n) / 2) : 0);
      if (e.noFruit === f) k = 0;
      if (e.supplyMult) k = Math.ceil(k * e.supplyMult);
      if (e.noDelivery) k = 0;
      m += k;
    }
    tot += m / 20;
  }
  const evDay = tot / 20;
  return (supply[n][f] + (days - 1) * evDay) / days;
};
p('### Supply against demand (pieces per day)');
p('Supply = mean lorry row. "With events" averages the 20 events over days 2..10 of a 10-day game (Lorry Breakdown, Bad Harvest, Apple Blight, Blueberry Glut, Good Harvest, Mango Windfall). Demand = expected row demand from A (no guests, no standing orders).');
p('| Stalls | Fruit | Supply | Supply with events | Demand | Supply/Demand | With events |');
p('|---|---|---|---|---|---|---|');
for (const n of S) {
  let ts = 0, te = 0, td = 0;
  for (const f of F) {
    const e = evSupply(n, f, 10);
    ts += supply[n][f]; te += e; td += demand[n][f];
    p(`| ${n} | ${f} | ${r2(supply[n][f])} | ${r2(e)} | ${r2(demand[n][f])} | ${r2(supply[n][f] / demand[n][f])} | ${r2(e / demand[n][f])} |`);
  }
  p(`| ${n} | **all** | ${r2(ts)} | ${r2(te)} | ${r2(td)} | ${r2(ts / td)} | ${r2(te / td)} |`);
}
p('');
// guests / standing orders extra demand per game
p('### Extra demand outside the row deck');
p(`- Guests (5 of 20 events): Gym Club 2 blueberry, Influencer 1 mango, Hotel Chef 1 apple + 1 watermelon + 1 blueberry, Wedding Caterer 3 watermelon, Bakery 2 apples. Per event day: blueberry ${r2(3 / 20)}, watermelon ${r2(4 / 20)}, apple ${r2(3 / 20)}, mango ${r2(1 / 20)} pieces. At 5-6 stalls (and 4 stalls with Festival/Tourist Bus) a guest replaces the last walk-in, so net demand is about unchanged or lower.`);
p(`- Standing orders: ${S.map((n) => `${n} stalls: ${orderQty(n)}`).join(', ')} pieces of one fruit, on days 5 and 8 (10-day game), replacing the last walk-in at 5-6 stalls.`);
p(`- Walk-in events at each size (cards added): Festival ${S.map((n) => Math.min(4, Math.min(n, 5) - 1 + Math.ceil(n / 3)) - (Math.min(n, 5) - 1)).join('/')}, Tourist Bus ${S.map((n) => Math.min(4, Math.min(n, 5) - 1 + Math.ceil((2 * n) / 3)) - (Math.min(n, 5) - 1)).join('/')}, Monsoon ${S.map((n) => Math.max(0, Math.min(n, 5) - 1 - Math.ceil(n / 3)) - (Math.min(n, 5) - 1)).join('/')} (2/3/4/5/6 stalls).`);
console.log(out.join('\n'));
