// The final results (PLAN-086, board "Results"): who won and by how much, each stall with its awning colour, the
// stamps this game earned landing on your card, the next reward, two "close" lines, and the buttons. Further down:
// the Daily market board, the cash day by day and your best moments.
import { useEffect, useRef, useState } from 'preact/hooks';
import { CUSTOMER_CARDS, JUICE_VALUE, lookOf } from '../../../engine/data';
import { places, ranking, winners, type GameState } from '../../../engine/game';
import { gameRecap } from '../../../engine/story';
import { titleOf, type LookSet } from '../../../net/looks';
import { customersServed } from '../../achievements';
import * as A from '../../anim';
import { syncLooks, worn } from '../../looks';
import { finishGame, LEAGUE, snapshot, type GameSummary } from '../../progress';
import { FramedFace, Pip, StallPic, StampGrid, awningColour, shownAvatar } from '../../stampCard';
import { cardSize, closeLines, nextReward, placeAt, rankOf, rewardAt, rewardBuilt, stampsToReach, MAX_LEVEL, type CloseLine } from '../../stamps';
import { SEAT_COLOURS } from '../../table';
import { DailyResult } from './DailyResult';

/** Every stall's cash at the end of each day, so you can see where the game was won. */
function CashChart({ s, viewer }: { s: GameState; viewer: number }) {
  const h = s.history ?? [];
  if (h.length < 2) return null;
  const W = 300, H = 110, P = 8;
  const max = Math.max(1, ...h.flatMap((d) => d.cash));
  const x = (i: number) => P + ((W - 2 * P) * i) / (h.length - 1);
  const y = (v: number) => H - P - ((H - 2 * P) * v) / max;
  return (
    <div class="sbk-box cash-chart">
      <span class="sbk-lab">Cash, day by day</span>
      <svg viewBox={`0 0 ${W} ${H}`} role="img" aria-label="Each stall's cash at the end of each day">
        {s.players.map((_, i) => <polyline fill="none" stroke-linejoin="round" stroke={SEAT_COLOURS[i % SEAT_COLOURS.length]} stroke-width={i === viewer ? 4 : 2.5} points={h.map((d, k) => `${x(k)},${y(d.cash[i])}`).join(' ')} />)}
      </svg>
      <div class="sbk-key">{s.players.map((pl, i) => <span><i aria-hidden="true" style={{ background: SEAT_COLOURS[i % SEAT_COLOURS.length] }} />{i === viewer ? 'You' : pl.name}</span>)}</div>
    </div>
  );
}

const RANKS = ['1ST', '2ND', '3RD', '4TH', '5TH', '6TH'];
const LEVEL_WORD = { easy: 'Easy', normal: 'Normal', hard: 'Hard' } as const;

/**
 * The words of the final count for one viewer. Rules 18: most cash wins, then most fruit sold; stalls still level
 * share the win and the place (there is no seat-number tie-break), so 1ST can be printed on more than one stall.
 */
export function finishWords(s: GameState, viewer: number): { win: boolean; shared: boolean; headline: string; margin: string; medals: string[]; mine: string } {
  const order = ranking(s);
  const first = winners(s);
  const place = places(s);
  const win = first.includes(viewer);
  const shared = first.length > 1;
  const champ = s.players[win ? viewer : order[0]];
  const gap = order.length > 1 ? champ.cash - s.players[order[1]].cash : 0;
  const others = first.filter((i) => i !== viewer).map((i) => s.players[i].name);
  const sharers = first.map((i) => s.players[i].name);
  return {
    win, shared,
    headline: shared ? (win ? `YOU SHARE THE WIN WITH ${others.join(' AND ').toUpperCase()}` : `${sharers.join(' AND ').toUpperCase()} SHARE THE WIN`) : win ? 'YOU WIN!' : `${champ.name.toUpperCase()} WINS!`,
    margin: shared ? 'Level on cash and on fruit sold.' : gap === 0 ? 'Tied on cash. Decided by fruit sold.' : `By $${gap}.`,
    medals: place.map((k) => RANKS[k - 1]),
    mine: win ? (shared ? 'I shared the win' : 'I won') : `I came ${RANKS[place[viewer] - 1].toLowerCase()}`,
  };
}

/** A stamp on its way from its line to its place on the card. Position and size only; it ends by itself. */
async function flyStamp(from: Element, to: Element): Promise<void> {
  const a = from.getBoundingClientRect(), b = to.getBoundingClientRect();
  if (!b.width || !a.width) return;
  const el = document.createElement('i');
  el.className = 'sbk-fly';
  el.style.width = `${b.width}px`;
  el.style.height = `${b.height}px`;
  document.body.appendChild(el);
  const at = (r: DOMRect, s: number) => `translate(${(r.left + r.width / 2 - b.width / 2).toFixed(1)}px, ${(r.top + r.height / 2 - b.height / 2).toFixed(1)}px) rotate(-12deg) scale(${s})`;
  const length = A.ms(A.FEEL.travel);
  try {
    el.animate([{ transform: at(a, 0.5) }, { transform: at(b, 1.25), offset: 0.7 }, { transform: at(b, 1) }], { duration: length, easing: A.EASE.travel, fill: 'forwards' });
    await A.timer(length + A.FRAME);
  } finally { el.remove(); }
}

/**
 * "Stamps earned": each line appears in its turn and its stamps travel to the card one after another; a full card
 * turns over to the next. Nothing is shown before its moment, a tap hurries it, and with reduced motion the end is
 * shown at once. `onDone` is called when everything has landed.
 */
function StampsEarned({ sum, onDone }: { sum: GameSummary; onDone: () => void }) {
  const start = stampsToReach(sum.before.level) + sum.before.filled;
  const end = Math.max(start, stampsToReach(sum.after.level) + sum.after.filled);
  const still = A.isReduced() || end === start;
  const [shown, setShown] = useState(still ? end : start);
  const [line, setLine] = useState(still ? sum.lines.length : -1);
  const [level, setLevel] = useState(still ? sum.after.level : sum.before.level);
  const [done, setDone] = useState(still);
  const grid = useRef<HTMLDivElement>(null);
  const rows = useRef<(HTMLElement | null)[]>([]);

  useEffect(() => {
    if (still) { onDone(); return; }
    let alive = true;
    let cur = start;
    let lv = sum.before.level;
    const turn = async () => {
      // the full card is read for a moment, then the next card takes its place
      await A.hold(350);
      if (!alive) return;
      lv++;
      setLevel(lv);
      await A.frame();
      grid.current?.animate([{ opacity: 0, transform: 'scale(1, 0.4)' }, { opacity: 1, transform: 'none' }], { duration: A.ms(A.FEEL.turn), easing: A.EASE.sheet });
      await A.wait(A.FEEL.turn);
    };
    void (async () => {
      await A.wait(A.FEEL.sheetIn + 220);
      for (let i = 0; i < sum.lines.length && alive; i++) {
        setLine(i);
        await A.frame();
        const row = rows.current[i];
        row?.animate([{ opacity: 0 }, { opacity: 1 }], { duration: A.ms(A.FEEL.sheetIn), easing: A.EASE.sheet });
        let left = Math.min(sum.lines[i].stamps, end - cur);
        while (left > 0 && alive) {
          const base = stampsToReach(lv);
          const room = cardSize(lv) - (cur - base);
          if (room <= 0) { if (lv >= MAX_LEVEL) break; await turn(); continue; }
          const n = Math.min(left, room);
          const gap = Math.min(70, 560 / n);
          const cells = grid.current?.children;
          const flights: Promise<void>[] = [];
          for (let k = 0; k < n && alive; k++) {
            const cell = cells?.[cur - base + k];
            flights.push((row && cell ? flyStamp(row.firstElementChild ?? row, cell) : Promise.resolve()).then(() => { if (alive) setShown((v) => Math.min(end, v + 1)); }));
            if (k < n - 1) await A.wait(gap);
          }
          await Promise.all(flights);
          cur += n;
          left -= n;
        }
        await A.wait(160);
      }
      // the last stamp filled a card: the next one is laid out
      if (alive && lv < sum.after.level) await turn();
      if (!alive) return;
      setLine(sum.lines.length);
      setShown(end);
      setLevel(sum.after.level);
      setDone(true);
      A.resetHurry();
      onDone();
    })();
    return () => { alive = false; A.resetHurry(); };
  }, []);

  const base = stampsToReach(level);
  const size = cardSize(level);
  const filled = Math.max(0, Math.min(size, shown - base));
  const fresh = Math.max(0, Math.min(filled, shown - Math.max(start, base)));
  const next = nextReward(placeAt(end));
  const up = sum.after.level > sum.before.level ? rewardAt(sum.after.level) : undefined;
  return (
    <div class="sbk-card" data-a="stamps">
      <div class="sbk-ch"><span>Stamps earned</span><b aria-live="polite">+{shown - start}</b></div>
      <div style="padding: 4px 0">
        {sum.lines.map((l, i) => (
          <div class={`sbk-earn ${i > line ? 'wait' : ''}`} ref={(el) => { rows.current[i] = el; }}>
            <b>+{l.stamps}</b><span>{l.text}</span>{l.tier && <Pip tier={l.tier} on fresh />}
          </div>
        ))}
        {sum.lines.length === 0 && <div class="sbk-earn"><span class="sbk-sub">This game was already counted.</span></div>}
      </div>
      <div class="sbk-perf" />
      <div style="padding: 8px 9px; display: flex; flex-direction: column; gap: 6px">
        <div class="sbk-row"><span class="sbk-lab">Card {level} · {rankOf(level).name}</span><span>{filled} of {size}</span></div>
        <StampGrid size={size} filled={filled} fresh={fresh} gridRef={grid} />
      </div>
      <div class={`sbk-next ${done ? '' : 'sbk-wait'}`}>
        {up
          ? <><b>Stall level {sum.after.level}</b><span>{rewardBuilt(up) ? `New: ${up.text}` : `${up.text} · coming`}</span></>
          : next
            ? <><b>{next.stamps} {next.stamps === 1 ? 'stamp' : 'stamps'} {next.level > MAX_LEVEL ? 'to fill the book' : `to level ${next.level}`}</b><span>{next.reward ? (rewardBuilt(next.reward) ? next.reward.text : `${next.reward.text} · coming`) : ''}</span></>
            : <b>The book is full</b>}
      </div>
    </div>
  );
}

export function Results({ s, viewer, onExit, onRematch, rematchNote, rematchSent, online, onPlayAs }: {
  s: GameState; viewer: number; onExit: () => void; onRematch: () => void; rematchNote?: string; rematchSent?: boolean; online?: boolean;
  /** Starts the same table again with the person as another shopkeeper (the second button). */
  onPlayAs?: (avatar: string) => void;
}) {
  // Counted once when the results first show (progress.ts finishGame). On a shared phone only the phone's owner counts:
  // the first person at the table, whoever played last.
  const owner = online ? viewer : Math.max(0, s.players.findIndex((p) => p.kind === 'human'));
  const [sum] = useState(() => finishGame(s, owner, !!online));
  // New looks are handed out after the game is counted, so a level reached or a tier earned counts too.
  const [newLooks] = useState(() => syncLooks());
  const [close] = useState<CloseLine[]>(() => {
    const snap = snapshot();
    const met = new Set(customersServed(snap));
    return closeLines(snap, (k) => lookOf(k).title, CUSTOMER_CARDS.map((c) => c.name).filter((k) => !met.has(k)), s.players[owner]?.avatar);
  });
  const [landed, setLanded] = useState(false);
  const cleared = sum?.cleared ?? false;
  const order = ranking(s);
  const words = finishWords(s, viewer);
  const win = words.win;
  const champSeat = win ? viewer : order[0];
  const recap = gameRecap(s, viewer);
  const league = s.config.league;
  // Offline, the person's stall shows what they have on now; online every stall shows what the room was told.
  const lookOfSeat = (i: number): LookSet | undefined => (!online && i === owner ? worn() : s.players[i].look);
  const second = order.length > 1 && !words.shared ? order[1] : -1;
  const gap = second >= 0 ? s.players[champSeat].cash - s.players[second].cash : 0;
  const margin = gap > 0 ? `By $${gap} over ${second === viewer ? 'you' : s.players[second].name}.` : words.margin;
  const nudge = !online && !s.config.daily && league === undefined && onPlayAs ? close.find((c) => c.avatar && c.name) : undefined;
  const share = async () => {
    const text = `Fruit Market: ${words.mine} with $${s.players[viewer].cash} after ${s.config.days} days.`;
    try {
      if (navigator.share) await navigator.share({ text, url: location.origin });
      else await navigator.clipboard.writeText(`${text} ${location.origin}`);
    } catch { /* cancelled or not allowed */ }
  };
  // A tap on the page (not on a button) hurries the stamps.
  const hurry = (e: MouseEvent) => { if (!landed && !(e.target as Element).closest?.('button')) A.hurryUp(); };
  const main = league !== undefined ? (cleared ? (league + 1 >= LEAGUE.length ? 'See your trophies' : 'Next stage') : 'Try again') : s.config.daily ? 'Home' : 'Play again';
  return (
    <section class="sbk sbk-res results" onClick={hurry}>
      <div class="sbk-in" style="flex: 1 0 auto">
        <div class={`sbk-win ${words.headline.length > 14 ? 'long' : ''}`}>
          <span class="sbk-pic"><StallPic avatar={shownAvatar(s.players, champSeat)} size={60} /></span>
          <div><small>Market closed · day {s.config.days}</small><h2>{words.headline}</h2>{order.length > 1 && <span>{margin}</span>}</div>
        </div>

        <div class="sbk-pods podium">
          {order.map((i) => {
            const pl = s.players[i];
            const look = lookOfSeat(i);
            const sub = titleOf(look) ?? (pl.kind === 'ai' ? `${LEVEL_WORD[pl.level ?? 'normal']} computer` : '');
            return (
              <div class={`sbk-pod ${i === viewer ? 'me' : ''}`} title={`Sold ${pl.stats.sold} · spoiled ${pl.stats.spoiled} · best sale $${pl.stats.bestSale}${pl.stats.juiced ? ` · juice +$${pl.stats.juiced * JUICE_VALUE}` : ''}${s.jam?.[i] ? ` · jam maker +$${s.jam[i]}` : ''}`}>
                <i class="sbk-sw" style={{ '--a': awningColour(look, i) }} />
                <span class="sbk-md">{words.medals[i]}</span>
                <FramedFace who={shownAvatar(s.players, i)} size={26} look={look} />
                <span class="sbk-nm"><b>{i === viewer ? 'You' : pl.name}</b>{sub && <small>{sub}</small>}</span>
                {look?.stamp && <span class="sbk-stamp">Sold out</span>}
                <span class="sbk-cs">${pl.cash}</span>
              </div>
            );
          })}
        </div>

        {league !== undefined && (
          <p class={`sbk-note ${cleared ? 'good' : ''}`}>
            {cleared ? (league + 1 >= LEAGUE.length ? 'You won the Market League.' : `${LEAGUE[league].title} cleared. Next: ${LEAGUE[league + 1].title}`) : `Market League: win to clear ${LEAGUE[league].title}.`}
          </p>
        )}

        {sum && <div class="sbk-sec"><StampsEarned sum={sum} onDone={() => setLanded(true)} /></div>}

        {close.length > 0 && (
          <div class={`sbk-sec ${landed ? '' : 'sbk-wait'}`}>
            <span class="sbk-lab">Close</span>
            <div class="sbk-close">{close.map((c) => <span><b>{c.title}</b><span class="sbk-sub">{c.sub}</span></span>)}</div>
          </div>
        )}
        {newLooks.length > 0 && landed && <p class="sbk-note" role="status">New in the Wardrobe: {newLooks.map((l) => l.title).join(', ')}.</p>}

        <div class="sbk-more">
          {s.config.daily && <DailyResult s={s} />}
          <CashChart s={s} viewer={viewer} />
          {(recap.best.length > 0 || recap.worst.length > 0) && (
            <div class="sbk-box recap">
              {recap.best.length > 0 && <><span class="sbk-lab">Your best moments</span>{recap.best.map((t) => <div class="sbk-rc">{t}</div>)}</>}
              {recap.worst.length > 0 && <><span class="sbk-lab">What cost you</span>{recap.worst.map((t) => <div class="sbk-rc">{t}</div>)}</>}
            </div>
          )}
        </div>

        <div class="sbk-acts">
          {rematchNote && <p class="rematch-note"><b>{rematchNote}</b></p>}
          <div class="sbk-btns">
            <button class="sbk-btn" disabled={rematchSent} onClick={onRematch}>{main}</button>
            {nudge && <button class="sbk-btn gh" onClick={() => onPlayAs?.(nudge.avatar!)}>Play as {nudge.name}</button>}
          </div>
          <div class="sbk-foot">
            <span>Scroll: cash day by day · your best moments</span>
            <span><button onClick={share}>Share</button>{!s.config.daily && <> · <button onClick={onExit}>Home</button></>}</span>
          </div>
        </div>
      </div>
    </section>
  );
}
