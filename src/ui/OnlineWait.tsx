// The Quick Match wait and its price practice (PLAN-113; PLAN-125, design B), moved out of Online.tsx unchanged
// (REP-140 A-02).
import { useState } from 'preact/hooks';
import { CUSTOMER_CARDS, lookOf } from '../engine/data';
import type { RoomView } from '../net/protocol';
import { fx } from './fx';
import { StallSign, TradingCard } from './cards';
import { CardZoom } from './cardZoom';
import { clock, foundLine, quickOf, waitLine, wayName, type QuickStalls } from './playMenu';
import { practiceQuestion, practiceRound, practiceVerdict } from './practice';
import { OpenCard, SbGo, SbLabel, SbPage, SeatCard, TableRow, keeperName } from './Setup';
import { useNow } from './onlineHooks';

/**
 * PLAN-113: the Quick Match wait. PLAN-125 (design B): your shopkeeper's card; how many are found and, when the room
 * says, when computers fill the empty seats; the table, the strangers found as cards and the seats still looked for;
 * then two ways out (a game against the computer now, or Cancel back to the set-up) and a price practice while you
 * wait. The game starts as soon as the table is full (the room sends it; this screen then gives way).
 */
export function QuickWait({ v, stalls: chosen, onExit, onCancel, onComputer }: {
  v: RoomView; stalls: QuickStalls; onExit: () => void; onCancel: () => void; onComputer?: (avatar: string, stalls: QuickStalls) => void;
}) {
  const avatar = v.seats[v.you]?.avatar ?? '';
  const q = quickOf(v.quick);
  // A room that does not say its size is a 2-stall quick match (a server without table sizes).
  const stalls = q?.stalls ?? chosen;
  const [since] = useState(() => Date.now());
  const now = useNow(true);
  const others = v.seats.filter((x) => x.seat !== v.you);
  const left = q?.fillAt !== undefined ? Math.max(0, q.fillAt - now) : undefined;
  return (
    <SbPage title={wayName('quick')} sub="Finding strangers" onBack={onExit} class="jo sb-wait" after={<PricePractice mine={avatar} />}
      foot={(
        <>
          {onComputer && avatar && <SbGo a="computer-now" class="sb-go-s" onClick={() => onComputer(avatar, stalls)}>Play the computer now</SbGo>}
          <button type="button" class="sb-btn" data-a="cancel" onClick={onCancel}>Cancel</button>
        </>
      )}>
      <div class="sb-me-card">
        {/* PLAN-116 (REP-133 B-08): the card opens whole on a tap */}
        {avatar && <CardZoom class="jw-card" wide title={keeperName(avatar)}><StallSign avatar={avatar} selected eager /></CardZoom>}
      </div>
      <p class="sb-found" role="status"><b>{foundLine(v.seats.length, stalls, left)}</b></p>
      <section class="sb-sec">
        {/* REP-140 B-12: one clock. The found line counts down to the computers when the room says when; only a room that
            does not say shows how long you have waited. */}
        <SbLabel right={left === undefined ? <span class="sb-clock" aria-label={`Waited ${clock(now - since)}`}>{clock(now - since)}</span> : undefined}>The table</SbLabel>
        <TableRow count={stalls - 1}>
          {others.slice(0, stalls - 1).map((x, k) => (
            <SeatCard top={`Stall ${k + 2}`} title={keeperName(x.avatar)} avatar={x.avatar || undefined} face={x.avatar} look={x.look} band="b" small="Found" big={x.name}
              label={`Stall ${k + 2}: ${x.name}, ${keeperName(x.avatar)}`} />
          ))}
          {Array.from({ length: Math.max(0, stalls - 1 - others.length) }, (_, i) => (
            <OpenCard top={`Stall ${others.length + i + 2}`} big="?" small="Looking for a stall" />
          ))}
        </TableRow>
        <p class="sb-note">{waitLine(v.config.days, avatar, stalls)}</p>
      </section>
    </SbPage>
  );
}

/** PLAN-113: the practice price while waiting (practice.ts): a real customer card, a rival's price and three prices to
 *  try, with the reason after each try. On this phone only. */
function PricePractice({ mine }: { mine: string }) {
  const [n, setN] = useState(() => Math.floor(Math.random() * 60));
  const [tried, setTried] = useState<number | null>(null);
  const r = practiceRound(n, mine);
  const card = CUSTOMER_CARDS.find((c) => c.name === r.who);
  const said = tried === null ? null : practiceVerdict(r, tried);
  return (
    <section class="jw-pp" aria-label="Price practice">
      <span class="jl-lb">While you wait · price practice</span>
      <div class="jw-pp-in">
        {card && <CardZoom class="jw-pp-card" title={lookOf(card.name).title}><TradingCard who={card.name} wants={card.wants} eager /></CardZoom>}
        <div class="jw-pp-r">
          <p class="jw-q">{practiceQuestion(r)}</p>
          <div class="jw-opts" role="group" aria-label="Your price">
            {r.options.map((p) => (
              <button class={`${tried === p ? 'on' : ''} ${tried !== null && p === r.answer ? 'best' : ''}`} aria-pressed={tried === p}
                onClick={() => { fx.tap(); setTried(p); }}>${p}</button>
            ))}
          </div>
          <p class={`jw-said ${said?.right ? 'yes' : ''}`} role="status">{said?.text ?? 'The customer buys from the cheapest offer that is fresh enough.'}</p>
          {said && <button class="btn jw-next" onClick={() => { fx.tap(); setTried(null); setN(n + 1); }}>Another customer</button>}
        </div>
      </div>
    </section>
  );
}
