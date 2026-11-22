// PLAN-114: the Market Sprint on screen. Home's Daily card draws its row (PLAN-120: HomeCards.tsx); on the results,
// the Sprint's box: your best today and place, one concrete reason from the game's record, the day's top ten, the players around you and this week's ranking. PLAN-119: the box
// also shows this run's cash beside your best, the reason is the Rush's decisive moment, and the weekly ranking says
// that your best 5 days count. Try again is the
// results' main button (Results.tsx), which starts the same Sprint at once (App.tsx).
import { useEffect, useState } from 'preact/hooks';
import type { ComponentChildren } from 'preact';
import { SPRINT_DAYS, SPRINT_WEEK_DAYS } from '../engine/daily';
import type { GameState } from '../engine/game';
import { TRAITS } from '../engine/data';
import { places } from '../engine/game';
import { sprintReason } from '../engine/sprint';
import { fetchSprint, ordinal, placeWords, submitSprint, type BoardView, type PlacedEntry, type SprintBoards } from '../net/sprint';
import { worn } from './looks';
import { FramedFace, shownAvatar } from './stampCard';
import { loadSprintBest } from './sprintStore';
import { shortDate } from './dailyCard';
import './sprint.css';

/** "Sprint · 3 days": the format's name with its length, as on the Daily card and the Play menu. */
export const SPRINT_TITLE = `Sprint · ${SPRINT_DAYS} days`;
/** PLAN-119: the weekly ranking's rule in words (server/meta.ts weekTotals counts the same days). */
export const WEEK_NOTE = `Your best ${SPRINT_WEEK_DAYS} days count.`;
/** PLAN-119: the label over the Rush's decisive moment on the results. */
export const MOMENT_LABEL = 'Decisive moment';

/** Today's Sprint boards (null while they load). */
export function useSprintBoards(today: string): SprintBoards | null {
  const [res, setRes] = useState<SprintBoards | null>(null);
  useEffect(() => { let alive = true; void fetchSprint(today).then((r) => { if (alive) setRes(r); }); return () => { alive = false; }; }, [today]);
  return res;
}

/** Your best today and your place in words: "Best today $34 · 12th of 48", or null before your first Sprint today. */
export function bestLine(cash: number | undefined, place: string | null): string | null {
  if (cash === undefined) return null;
  return place ? `Best today $${cash} · ${place}` : `Best today $${cash}`;
}

function Line({ e, mine }: { e: PlacedEntry; mine: ComponentChildren }) {
  return (
    <li class={e.me ? 'me' : ''}>
      <b>{e.place}.</b>{e.me && mine}<span>{e.me ? 'You' : e.name}</span>
      {e.days !== undefined && <small>{e.days} {e.days === 1 ? 'day' : 'days'}</small>}
      <b>${e.cash}</b>
    </li>
  );
}

/** A board: the top ten, then (when you are further down) a gap and the players just above and below you. */
function Board({ v, mine }: { v: BoardView; mine: ComponentChildren }) {
  const shown = new Set(v.top.map((e) => e.place));
  const rest = v.around.filter((e) => !shown.has(e.place));
  return (
    <ol class="sbk-board sp-board">
      {v.top.map((e) => <Line e={e} mine={mine} />)}
      {rest.length > 0 && <li class="sp-gap" aria-hidden="true">…</li>}
      {rest.map((e) => <Line e={e} mine={mine} />)}
    </ol>
  );
}

/**
 * PLAN-123 (preview finding 6): the day's board as the results show it, in each of its states: still checking, your
 * place, on the board with no place for you, nobody on it yet, or why it could not be reached (with a way to try again).
 */
export function boardWords(res: SprintBoards | null): { text: string; place: string | null; retry: boolean; busy: boolean } {
  if (!res) return { text: 'Checking the board…', place: null, retry: false, busy: true };
  if (res.error) return { text: res.error, place: null, retry: true, busy: false };
  const place = placeWords(res.day);
  if (place) return { text: `Today's board: ${place}`, place, retry: false, busy: false };
  if (!res.day || res.day.players === 0) return { text: 'Nobody is on today\'s board yet.', place: null, retry: true, busy: false };
  return { text: 'Not on today\'s board yet.', place: null, retry: true, busy: false };
}

/** PLAN-123 (preview finding 7): the perk this run was played with, in words ("Your perk: Nest Egg. Start with $15 instead of $10. …"). */
export function perkWords(s: GameState, me: number): string | null {
  const t = s.players[me]?.trait;
  return t ? `Your perk: ${TRAITS[t].title}. ${TRAITS[t].text}` : null;
}

/** PLAN-123: the one line from this run's record: its decisive moment, or, with no sale at all, what that left. */
export function runLine(s: GameState, me: number): { text: string; good: boolean } | null {
  const p = s.players[me];
  if (!p) return null;
  const reason = sprintReason(s, me);
  if (p.stats.sold === 0) return { text: `You made no sales and ended with $${p.cash}.${reason && !reason.good ? ` ${reason.text}` : ''}`, good: false };
  return reason ? { text: reason.text, good: reason.good } : null;
}

/**
 * The Sprint on the results: sends the finished game to be checked (or, opened again, reads the boards), then shows
 * this run (its cash and your place at this table), your best today, your place on today's board (PLAN-123: the table
 * and the board are told apart), Try again near the top, the perk you played with, one moment from this game, and the
 * boards. Checking again never counts the run's stamps a second time: they are counted once, by the results
 * (progress.ts finishGame), and the board keeps one line per phone.
 */
export function SprintResult({ s, onRetry }: { s: GameState; onRetry?: () => void }) {
  const date = s.config.daily ?? '';
  const [res, setRes] = useState<SprintBoards | null>(null);
  const [tries, setTries] = useState(0);
  useEffect(() => {
    let alive = true;
    setRes(null);
    void (s.moves ? submitSprint(s) : fetchSprint(date)).then((r) => { if (alive) setRes(r); });
    return () => { alive = false; };
  }, [tries]);
  const me = s.players.findIndex((p) => p.kind === 'human');
  const line = me >= 0 ? runLine(s, me) : null;
  const best = loadSprintBest()[date]?.cash ?? (me >= 0 ? s.players[me].cash : undefined);
  const run = me >= 0 ? s.players[me].cash : undefined;
  const table = me >= 0 ? places(s)[me] : 0;
  const board = boardWords(res);
  const perk = me >= 0 ? perkWords(s, me) : null;
  const mine = <FramedFace who={shownAvatar(s.players, me)} size={20} look={worn()} />;
  return (
    <div class="sbk-sec sp-res" data-a="sprint-result">
      <div class="sbk-row"><span class="sbk-lab">{SPRINT_TITLE} · {shortDate(date)}</span></div>
      <div class="sp-best">
        {run !== undefined && <span class="sp-run" data-a="sprint-run">This run <b>${run}</b><small>{ordinal(table)} at this table</small></span>}
        <span class="sp-top" data-a="sprint-best">Best today <b>${best}</b>{run === best && <small>This run</small>}</span>
      </div>
      <div class={`sp-place ${board.busy ? 'busy' : ''}`} data-a="sprint-board-state" aria-live="polite">
        <span>{board.place ? <>Today's board <b>{board.place}</b></> : board.text}</span>
        {board.retry && <button type="button" class="sp-again" data-a="sprint-board-retry" onClick={() => setTries((n) => n + 1)}>Check again</button>}
      </div>
      {onRetry && <button type="button" class="sbk-btn sp-try" data-a="sprint-try-top" onClick={onRetry}>Try again</button>}
      {perk && <span class="sbk-sub sp-perk" data-a="sprint-perk">{perk}</span>}
      {line && (
        <div class="sp-moment" data-a="sprint-moment">
          <span class="sbk-lab">{MOMENT_LABEL}</span>
          <p class={`sp-why ${line.good ? 'good' : ''}`}>{line.text}</p>
        </div>
      )}
      {res?.day && res.day.top.length > 0 && (
        <div class="sp-sec">
          <div class="sbk-row"><span class="sbk-lab">Today's top 10</span><span class="sp-wk">{res.day.players} played</span></div>
          <Board v={res.day} mine={mine} />
        </div>
      )}
      {res?.week && res.week.top.length > 0 && (
        <div class="sp-sec">
          <div class="sbk-row"><span class="sbk-lab">This week</span>{placeWords(res.week) && <span class="sp-wk">{placeWords(res.week)}</span>}</div>
          <span class="sbk-sub sp-note" data-a="sprint-week-note">{WEEK_NOTE}</span>
          <Board v={res.week} mine={mine} />
        </div>
      )}
    </div>
  );
}
