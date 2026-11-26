// The final results (PLAN-086, board "Results"; PLAN-113, the redesigned market style): who won, every stall as a
// tile with its awning, portrait and cash in finishing order; your best sale on the customer's own card; the stamps
// this game earned landing on your card; then a reward earned this game on your stall with "Wear it" (or the next
// reward, drawn as it will look); the "close" lines, and a large Rematch. Further down: the Daily market board, the
// cash day by day and your best moments.
import type { ComponentChildren } from 'preact';
import { useEffect, useRef, useState } from 'preact/hooks';
import { CUSTOMER_CARDS, JUICE_VALUE, lookOf } from '../../../engine/data';
import { places, ranking, winners, type GameState } from '../../../engine/game';
import { gameRecap } from '../../../engine/story';
import { lookById, partsOf, tagOf, titleOf, type Look, type LookSet } from '../../../net/looks';
import { TIER_NAME, customersServed } from '../../achievements';
import * as A from '../../anim';
import { Face } from '../../art';
import { fx, playSound } from '../../fx';
import { PropSprite, RoofBand } from '../../icons';
import { achievementFor, syncLooks, toggleLook, worn, wornIn, wornSounds } from '../../looks';
import { finishGame, LEAGUE, snapshot, type GameSummary } from '../../progress';
import { stageByNo, stageLabel } from '../../campaign';
import { bestSale, bestSaleDay, bestSaleWords, shownLook } from '../../progressView';
import { FramedFace, LookSwatch, Pip, PriceTag, StampGrid, myColour, onWord, shownAvatar } from '../../stampCard';
import { cardSize, closeLines, nextReward, rankOf, rewardAt, rewardBuilt, stampsToReach, MAX_LEVEL, type CloseLine } from '../../stamps';
import { Awning, SEAT_COLOURS } from '../../table';
import { Ticket } from '../../ticket';
import { StageEnd } from '../../StageMoment';
import { DailyResult } from './DailyResult';
import { SprintResult } from '../../Sprint';
import { LEAGUE_TO_SPRINT } from '../../playMenu';
import { decisiveMoment, noSalesLine } from '../resultsWords';
import { LINK_COPIED, NOT_COPIED, copyText } from '../../share';

/** Every stall's cash at the end of each day, so you can see where the game was won. */
function CashChart({ s, viewer, named }: { s: GameState; viewer: number; named?: boolean }) {
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
      <div class="sbk-key">{s.players.map((pl, i) => <span><i aria-hidden="true" style={{ background: SEAT_COLOURS[i % SEAT_COLOURS.length] }} />{i === viewer && !named ? 'You' : pl.name}</span>)}</div>
    </div>
  );
}

const RANKS = ['1ST', '2ND', '3RD', '4TH', '5TH', '6TH'];
const LEVEL_WORD = { easy: 'Easy', normal: 'Normal', hard: 'Hard' } as const;

/**
 * REP-140 B-14: a Pass & Play game, several people at one phone (offline, two or more people at the table). Its results
 * name every player in the count and never say "you"; every other mode speaks to the person (or this phone's owner).
 */
export const namedResults = (s: GameState, online?: boolean): boolean => !online && s.players.filter((p) => p.kind === 'human').length > 1;

/**
 * The words of the final count for one viewer. Rules 18: most cash wins, then most fruit sold; stalls still level
 * share the win and the place (there is no seat-number tie-break), so 1ST can be printed on more than one stall.
 * `named` (Pass & Play, REP-140 B-14): the words name the players, with no "you" or "I".
 */
export function finishWords(s: GameState, viewer: number, named = false): { win: boolean; shared: boolean; headline: string; margin: string; medals: string[]; mine: string } {
  const order = ranking(s);
  const first = winners(s);
  const place = places(s);
  const win = !named && first.includes(viewer);
  const shared = first.length > 1;
  const champ = s.players[win ? viewer : order[0]];
  const gap = order.length > 1 ? champ.cash - s.players[order[1]].cash : 0;
  const others = first.filter((i) => i !== viewer).map((i) => s.players[i].name);
  const sharers = first.map((i) => s.players[i].name);
  const both = sharers.join(' and ');
  return {
    win, shared,
    // The plain form, no exclamation mark (PLAN-090): the page's own style sets the headline in capitals.
    headline: shared ? (win ? `You share the win with ${others.join(' and ')}` : `${both} share the win`) : win ? 'You win' : `${champ.name} wins`,
    margin: shared ? 'Level on cash and on fruit sold.' : gap === 0 ? 'Tied on cash, so fruit sold decided it.' : `By $${gap}.`,
    medals: place.map((k) => RANKS[k - 1]),
    mine: named ? (shared ? `${both} shared the win` : `${champ.name} won`)
      : win ? (shared ? 'I shared the win' : 'I won') : `I came ${RANKS[place[viewer] - 1].toLowerCase()}`,
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
 * PLAN-123: the line over a League stage's main button: what it starts and what that stage asks of you ("Next stage:
 * Pasar Malam. Sell 6 ..."), or, when the stage was not cleared, the goal that clears it.
 */
export function leagueNext(league: number, cleared: boolean): string {
  const next = cleared ? LEAGUE[league + 1] : stageByNo(league);
  if (cleared && !next) return 'Chapter 1 is cleared. Your stamp book has the rewards.';
  if (!next) return '';
  return cleared ? `Next stage: ${next.title}. To clear it: ${next.clear.text.replace(/\.$/, '')}.` : `To clear this stage: ${next.clear.text.replace(/\.$/, '')}.`;
}

/** PLAN-123: what the stamps header says while the stamps are still landing. */
export const STAMPS_PENDING = 'Adding up…';

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
  // PLAN-123 (preview finding 6): the total is said once every stamp has landed; until then the header says the stamps
  // are being added up, so it never reads "+0" and then changes.
  const [settled, setSettled] = useState(still);
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
      setSettled(true);
      A.resetHurry();
      onDone();
    })();
    return () => { alive = false; A.resetHurry(); };
  }, []);

  const base = stampsToReach(level);
  const size = cardSize(level);
  const filled = Math.max(0, Math.min(size, shown - base));
  const fresh = Math.max(0, Math.min(filled, shown - Math.max(start, base)));
  return (
    <div class="sbk-card" data-a="stamps">
      <div class="sbk-ch"><span>Stamps earned</span><b aria-live="polite" data-a="stamps-total">{settled ? `+${end - start}` : STAMPS_PENDING}</b></div>
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
    </div>
  );
}


/** "1st", "2nd": a place in words, for the headline. */
const placeWord = (k: number) => RANKS[k - 1].toLowerCase();

/** The price-tag style a stall has on (the Wardrobe's), for the tag on the best sale. */
const tagOfLook = (look: LookSet | undefined): string => tagOf(look);

/** Your best sale: the customer's own card that day, the day, a sentence and your tag as it sold. */
function BestSaleBox({ s, owner, tag }: { s: GameState; owner: number; tag: string }) {
  const b = bestSale(s, owner);
  if (!b) return null;
  return (
    <div class="jp-box jp-best">
      <span class="sbk-lab">Your best sale</span>
      <div class="jp-best-in">
        <Ticket who={b.who} lines={b.wants} order={b.kind === 'order'} class="jp-ticket" />
        <div class="jp-best-tx">
          <b>{bestSaleDay(b)}</b>
          <span>{bestSaleWords(b)}</span>
          <span class="jp-best-tag"><PriceTag fruit={b.fruit} price={b.price} tag={tag} tone="sold" big /></span>
        </div>
      </div>
    </div>
  );
}

/**
 * PLAN-123: the game in one moment, from the sales the game kept: the day the winner took the lead for good and the sale
 * that day; and, for a person who sold nothing all game, that plainly ("You ended with your starting cash and made no
 * sales."), where the best sale would otherwise be.
 */
function MomentBox({ s, owner, named }: { s: GameState; owner: number; named?: boolean }) {
  const m = decisiveMoment(s, named ? -1 : owner);
  const none = noSalesLine(s, owner);
  if (!m && !none) return null;
  return (
    <div class="jp-box jp-moment" data-a="moment">
      {m && <><span class="sbk-lab">The deciding moment</span><span class="jp-moment-tx">{m.text}</span></>}
      {none && <><span class="sbk-lab">Your sales</span><span class="jp-moment-tx" data-a="no-sales">{none}</span></>}
    </div>
  );
}

/** How a look was earned, in a few words: "Bronze · First Sale: Sell a piece of fruit." or "Stall level 3". */
function earnedBy(l: Look): string {
  if (l.from.kind === 'level') return `Stall level ${l.from.level}`;
  const t = achievementFor(l);
  return t ? `${TIER_NAME[t.step.tier]} · ${t.card.title}: ${t.step.text}` : '';
}

/** A look on your stall as it will show: the awning, your shopkeeper and the counter for the stall and what is worn;
 *  the look on its own for the signboard and the sounds. */
function RewardPic({ l, look, avatar }: { l: Look; look: LookSet; avatar: string }) {
  if (l.kind !== 'stall' && l.kind !== 'wear') return <span class="jp-rw-sw"><LookSwatch slot={l.slot} id={l.id} look={look} avatar={avatar} /></span>;
  const on = { ...look, [l.slot]: l.id };
  return (
    <span class="jp-rw-stall">
      <RoofBand cls="jp-awn" colour={myColour(on)} roof={on.roof} trim={on.trim} />
      <span class="jp-rw-face"><Face who={avatar} size={48} worn={partsOf(on)} /></span>
      {on.prop && <PropSprite id={on.prop} size={26} cls="jp-rw-prop" />}
    </span>
  );
}

/**
 * Under the stamps: a look this game earned, drawn on your stall, with "Wear it"; else the level this game reached;
 * else the next reward and how many stamps it is away. Shown once the stamps have landed (`show`), never before.
 */
function RewardBox({ fresh, sum, avatar, show }: { fresh: Look[]; sum: GameSummary | null; avatar: string; show: boolean }) {
  const box = useRef<HTMLDivElement>(null);
  const [look, setLook] = useState<LookSet>(() => worn());
  const [sounds, setSounds] = useState(() => wornSounds());
  useEffect(() => {
    if (show && !A.isReduced()) box.current?.animate([{ opacity: 0 }, { opacity: 1 }], { duration: A.ms(A.FEEL.sheetIn), easing: A.EASE.sheet });
  }, [show]);
  const l = shownLook(fresh);
  const level = sum?.after.level ?? 1;
  const up = sum && sum.after.level > sum.before.level ? rewardAt(sum.after.level) : undefined;
  const next = sum ? nextReward(sum.after) : null;
  const cls = `jp-box jp-reward ${show ? '' : 'sbk-wait'}`;
  if (l) {
    const on = l.kind === 'sound' ? (l.slot === 'bell' ? sounds.bell : sounds.coin) === l.id : look[l.slot] === l.id || wornIn(l.slot) === l.id;
    const wear = () => {
      fx.tap();
      setLook(toggleLook(l.id));
      setSounds(wornSounds());
      if (l.kind === 'sound') playSound(l.id);
    };
    const more = fresh.length - 1;
    return (
      <div class={cls} ref={box} role="status">
        <RewardPic l={l} look={look} avatar={avatar} />
        <div class="jp-rw-tx">
          <span class="sbk-lab jp-good">{l.kind === 'sound' ? 'Earned · only you hear it' : l.kind === 'wear' ? 'Earned · for your shopkeeper' : 'Earned · on your stall'}</span>
          <b class="jp-rw-name">{l.title}</b>
          <span class="sbk-sub">{earnedBy(l)}</span>
          {on ? <span class="jp-rw-on">{onWord(l)}</span> : <button type="button" class="jp-wear" onClick={wear}>{l.kind === 'sound' ? 'Use it' : 'Wear it'}</button>}
          {up && <span class="sbk-sub">Stall level {level}: {up.text}{rewardBuilt(up) ? '' : ', coming in a later update'}.</span>}
          {more > 0 && <span class="sbk-sub">And {more} more in the Wardrobe.</span>}
        </div>
      </div>
    );
  }
  if (up) {
    const first = up.looks.map(lookById).find((x): x is Look => !!x);
    return (
      <div class={cls} ref={box} role="status">
        {first && <RewardPic l={first} look={look} avatar={avatar} />}
        <div class="jp-rw-tx">
          <span class="sbk-lab jp-good">Stall level {level}</span>
          <b class="jp-rw-name">{up.text}</b>
          {!rewardBuilt(up) && <span class="sbk-sub">Coming in a later update.</span>}
        </div>
      </div>
    );
  }
  if (!next) return <div class={cls} ref={box}><div class="jp-rw-tx"><b class="jp-rw-name">The book is full</b></div></div>;
  const first = next.reward?.looks.map(lookById).find((x): x is Look => !!x);
  return (
    <div class={cls} ref={box}>
      {first && <RewardPic l={first} look={look} avatar={avatar} />}
      <div class="jp-rw-tx">
        <span class="sbk-lab">Next reward · {next.stamps} {next.stamps === 1 ? 'stamp' : 'stamps'} {next.level > MAX_LEVEL ? 'to fill the book' : `to level ${next.level}`}</span>
        {next.reward && <b class="jp-rw-name">{next.reward.text}</b>}
        {next.reward && !rewardBuilt(next.reward) && <span class="sbk-sub">Coming in a later update.</span>}
      </div>
    </div>
  );
}

export function Results({ s, viewer, onExit, onRematch, onRetry, rematchNote, rematchSent, online, onPlayAs, react, onSprint }: {
  s: GameState; viewer: number; onExit: () => void; onRematch: () => void; rematchNote?: string; rematchSent?: boolean; online?: boolean;
  /** PLAN-118: a Market League stage again, the same stage (offered beside Next stage when the stage was cleared). */
  onRetry?: () => void;
  /** PLAN-116 (REP-133 B-11): online, the reaction button, in the row of buttons at the foot (over the header it hid words). */
  react?: ComponentChildren;
  /** Starts the same table again with the person as another shopkeeper (offered beside the "close" line about them). */
  onPlayAs?: (avatar: string) => void;
  /** PLAN-119: today's Sprint, offered under a cleared Market League stage (the League's link to the Sprint). */
  onSprint?: () => void;
}) {
  // Counted once when the results first show (progress.ts finishGame). On a shared phone only the phone's owner counts:
  // the first person at the table, whoever played last. The whole page then speaks to the owner (PLAN-091): "You",
  // the headline, the best sale, the bold line of the chart and "Your best moments" are theirs, as are the stamps,
  // the reward and the card, so nothing of the other person's game is shown as theirs.
  const owner = online ? viewer : Math.max(0, s.players.findIndex((p) => p.kind === 'human'));
  const [sum] = useState(() => finishGame(s, owner, !!online));
  // New looks are handed out after the game is counted, so a level reached or a tier earned counts too.
  const [newLooks] = useState(() => syncLooks());
  const [close] = useState<CloseLine[]>(() => {
    const snap = snapshot();
    const met = new Set(customersServed(snap));
    return closeLines(snap, (k) => lookOf(k).title, CUSTOMER_CARDS.map((c) => c.name).filter((k) => !met.has(k)), s.players[owner]?.avatar);
  });
  const [landed, setLanded] = useState(!sum);
  const cleared = sum?.cleared ?? false;
  const order = ranking(s);
  const place = places(s);
  // REP-140 B-14: Pass & Play names the players in the count (headline, margin, places, the deciding moment, share).
  const named = namedResults(s, online);
  const words = finishWords(s, owner, named);
  const win = words.win;
  const champSeat = win ? owner : order[0];
  const recap = gameRecap(s, owner);
  const league = s.config.league;
  // Offline, the person's stall shows what they have on now; online every stall shows what the room was told.
  const lookOfSeat = (i: number): LookSet | undefined => (!online && i === owner ? worn() : s.players[i].look);
  const second = order.length > 1 && !words.shared ? order[1] : -1;
  const gap = second >= 0 ? s.players[champSeat].cash - s.players[second].cash : 0;
  const margin = gap > 0 ? `By $${gap} over ${second === owner && !named ? 'you' : s.players[second].name}.` : words.margin;
  const nudge = !online && !s.config.daily && league === undefined && onPlayAs ? close.find((c) => c.avatar && c.name) : undefined;
  // PLAN-113: the headline says where you finished when you did not win ("Kiki wins · You are 3rd").
  const headline = win || named || order.length < 2 ? words.headline : `${words.headline}\u00a0· You are ${placeWord(place[owner])}`;
  const sprint = !!s.config.sprint;
  const mode = sprint ? ' · Sprint' : s.config.daily ? ' · Daily market' : league !== undefined ? ` · Market League, ${stageLabel(league)}` : online ? ' · Online' : '';
  // REP-140 B-18: with no share sheet (a computer), the link is copied and the page says so, or says it could not be.
  const [shareSaid, setShareSaid] = useState<string | null>(null);
  const share = async () => {
    const text = `Fruit Market: ${words.mine} with $${s.players[named ? champSeat : owner].cash} after ${s.config.days} days.`;
    if (navigator.share) {
      try { await navigator.share({ text, url: location.origin }); } catch { /* the share sheet was closed: nothing to say */ }
      return;
    }
    setShareSaid(await copyText(`${text} ${location.origin}`) ? LINK_COPIED : NOT_COPIED);
  };
  // A tap on the page (not on a button) hurries the stamps.
  const hurry = (e: MouseEvent) => { if (!landed && !(e.target as Element).closest?.('button')) A.hurryUp(); };
  // The board's words (PLAN-091): "Rematch"; and "Home" (the owner, 2026-11-13; the board said "Main menu"). The Daily market is played once a day, so its main button
  // goes back to the main menu.
  // PLAN-118: a League stage's results offer Retry for the same stage; Next stage comes first when it was cleared.
  const retry = league !== undefined && league < LEAGUE.length ? `Retry stage ${league + 1}` : 'Retry';
  const main = league !== undefined ? (cleared ? (league + 1 >= LEAGUE.length ? 'Open your stamp book' : 'Next stage') : retry) : sprint ? 'Try again' : s.config.daily ? 'Home' : 'Rematch';
  // PLAN-113: one line over the big button says what it starts (online, the room's own line about who is waiting).
  // PLAN-114: the Sprint's Try again plays the same Sprint from the start; the best score of the day counts.
  const what = online ? 'Rematch: the same room, a new market' : sprint ? 'Try again: the same Sprint from the start. Your best today counts.' : s.config.daily ? 'A new Daily market opens tomorrow' : league !== undefined ? leagueNext(league, cleared) : 'Rematch: same stalls, same length, a new market';
  const myLook = lookOfSeat(owner);
  const cols = order.length <= 4 ? order.length : 3;
  return (
    <section class="sbk sbk-res results jp-res" onClick={hurry}>
      <div class="sbk-in" style="flex: 1 0 auto">
        <div class={`sbk-win jp-head ${headline.length > 22 ? 'long' : ''}`}>
          <small>Market closed · Day {s.config.days} of {s.config.days}{mode}</small>
          <h2>{headline}</h2>
          {order.length > 1 && <span>{margin}</span>}
        </div>

        {/* PLAN-123: the Sprint's box (this run, your best, the board and Try again) comes first, under the headline. */}
        {sprint && <SprintResult s={s} />}

        {/* PLAN-123: the places at this table, apart from any board's (the Daily market and the Sprint have their own) */}
        {order.length > 1 && <span class="sbk-lab jp-pods-lab">Places at this table</span>}
        <ol class="jp-pods podium" style={{ '--n': cols }} aria-label="Places at this table">
          {order.map((i) => {
            const pl = s.players[i];
            const look = lookOfSeat(i);
            const sub = titleOf(look) ?? (pl.kind === 'ai' ? `${LEVEL_WORD[pl.level ?? 'normal']} computer` : '');
            const you = i === owner && !named;
            const name = you ? 'You' : pl.name;
            return (
              <li class={`jp-pod ${you ? 'me' : ''} ${place[i] === 1 ? 'first' : ''}`}
                title={`Sold ${pl.stats.sold} · spoiled ${pl.stats.spoiled} · best sale $${pl.stats.bestSale}${pl.stats.juiced ? ` · juice +$${pl.stats.juiced * JUICE_VALUE}` : ''}`}>
                <span class="jp-sr">{`${words.medals[i]}: ${name}${sub ? `, ${sub}` : ''}, $${pl.cash}`}</span>
                <i class="jp-pl" aria-hidden="true">{place[i]}</i>
                <Awning p={i} look={look} thin />
                <span class="jp-pod-face" aria-hidden="true"><FramedFace who={shownAvatar(s.players, i)} size={place[i] === 1 ? 46 : 38} look={look} /></span>
                <b class="jp-pod-nm" aria-hidden="true">{name}</b>
                {look?.stamp && <span class="sbk-stamp" aria-hidden="true">Sold out</span>}
                <strong class="jp-pod-cs" aria-hidden="true">${pl.cash}</strong>
              </li>
            );
          })}
        </ol>

        {league !== undefined && <StageEnd s={s} owner={owner} cleared={cleared} fresh={sum?.stars ?? []} />}
        {league !== undefined && cleared && onSprint && <button type="button" class="jp-sec jp-to-sprint" data-a="league-sprint" onClick={onSprint}>{LEAGUE_TO_SPRINT}</button>}

        {/* The Sprint's box has its own deciding moment. */}
        {!sprint && <MomentBox s={s} owner={owner} named={named} />}
        <BestSaleBox s={s} owner={owner} tag={tagOfLook(myLook)} />

        {sum && <div class="sbk-sec"><StampsEarned sum={sum} onDone={() => setLanded(true)} /></div>}

        <RewardBox fresh={newLooks} sum={sum} avatar={shownAvatar(s.players, owner)} show={landed} />

        {close.length > 0 && (
          <div class={`sbk-sec ${landed ? '' : 'sbk-wait'}`}>
            <span class="sbk-lab">Nearly there</span>
            <div class="sbk-close">{close.map((c) => (
              <span><b>{c.title}</b><span class="sbk-sub">{c.sub}</span>
                {nudge === c && <button type="button" class="jp-playas" onClick={() => onPlayAs?.(c.avatar!)}>Play as {c.name}</button>}
              </span>
            ))}</div>
          </div>
        )}

        <div class="sbk-more">
          {s.config.daily && !sprint && <DailyResult s={s} />}
          <CashChart s={s} viewer={owner} named={named} />
          {(recap.best.length > 0 || recap.worst.length > 0) && (
            <div class="sbk-box recap">
              {recap.best.length > 0 && <><span class="sbk-lab">Your best moments</span>{recap.best.map((t) => <div class="sbk-rc">{t}</div>)}</>}
              {recap.worst.length > 0 && <><span class="sbk-lab">Where you lost out</span>{recap.worst.map((t) => <div class="sbk-rc">{t}</div>)}</>}
            </div>
          )}
        </div>

        <div class="sbk-acts jp-acts">
          {rematchNote ? <p class="rematch-note"><b>{rematchNote}</b></p> : what && <p class="jp-what">{what}</p>}
          <button class="sbk-btn jp-main" disabled={rematchSent} onClick={onRematch}>{main}</button>
          <div class="jp-two">
            <button class="jp-sec" data-a="share" onClick={share}>Share</button>
            {league !== undefined && cleared && onRetry && <button class="jp-sec" data-a="stage-retry" onClick={onRetry} aria-label={retry}>Retry</button>}
            {(!s.config.daily || sprint) && <button class="jp-sec" onClick={onExit}>Home</button>}
            {react}
          </div>
          {shareSaid && <p class="jp-said" role="status" data-a="share-said">{shareSaid}</p>}
        </div>
      </div>
    </section>
  );
}
