// PLAN-114: the Market Sprint on screen. On Home's Daily card a row of its own beside the Daily market ("Sprint · 3
// days", your best today and your place); on the results, the Sprint's box: your best today and place, one concrete
// reason from the game's record, the day's top ten, the players around you and this week's ranking. Try again is the
// results' main button (Results.tsx), which starts the same Sprint at once (App.tsx).
import { useEffect, useState } from 'preact/hooks';
import type { ComponentChildren } from 'preact';
import { SPRINT_DAYS, sprintConfig } from '../engine/daily';
import type { GameState } from '../engine/game';
import { sprintReason } from '../engine/sprint';
import { fetchSprint, placeWords, submitSprint, type BoardView, type PlacedEntry, type SprintBoards } from '../net/sprint';
import { Face } from './art';
import { worn } from './looks';
import { FramedFace, shownAvatar } from './stampCard';
import { loadSprintBest } from './sprintStore';
import { shortDate } from './dailyCard';
import './sprint.css';

/** "Sprint · 3 days": the format's name with its length, as on the Daily card and the Play menu. */
export const SPRINT_TITLE = `Sprint · ${SPRINT_DAYS} days`;

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

/** The Sprint's row on Home's Daily card: its name and length, the stalls, your best and place, and its own button. */
export function SprintRow({ today, onSprint }: { today: string; onSprint: () => void }) {
  const res = useSprintBoards(today);
  const best = loadSprintBest()[today]?.cash;
  const place = placeWords(res?.day);
  const cfg = sprintConfig(today, 'You');
  const line = bestLine(best, place)
    ?? (res?.day?.players ? `${res.day.players} played today · best so far $${res.day.top[0]?.cash ?? 0}` : `${cfg.players.length} stalls · the same start for everyone`);
  return (
    <div class="jh-sp" data-a="sprint-row">
      <div class="jh-sp-tx">
        <b>{SPRINT_TITLE}</b>
        <span class="jh-sp-ln">{line}</span>
        <span class="jh-sp-vs" aria-hidden="true">{cfg.players.slice(1).map((p) => <Face who={p.avatar ?? ''} size={22} />)}</span>
      </div>
      <button class="jh-dgo jh-sp-go" data-a="sprint" onClick={onSprint}><PlayIcon />Play the Sprint</button>
    </div>
  );
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
 * The Sprint on the results: sends the finished game to be checked (or, opened again, reads the boards), then shows
 * your best today and its place, one reason from this game, and the boards.
 */
export function SprintResult({ s }: { s: GameState }) {
  const date = s.config.daily ?? '';
  const [res, setRes] = useState<SprintBoards | null>(null);
  useEffect(() => {
    let alive = true;
    void (s.moves ? submitSprint(s) : fetchSprint(date)).then((r) => { if (alive) setRes(r); });
    return () => { alive = false; };
  }, []);
  const me = s.players.findIndex((p) => p.kind === 'human');
  const reason = me >= 0 ? sprintReason(s, me) : null;
  const best = loadSprintBest()[date]?.cash ?? (me >= 0 ? s.players[me].cash : undefined);
  const place = placeWords(res?.day);
  const mine = <FramedFace who={shownAvatar(s.players, me)} size={20} look={worn()} />;
  return (
    <div class="sbk-sec sp-res" data-a="sprint-result">
      <div class="sbk-row"><span class="sbk-lab">{SPRINT_TITLE} · {shortDate(date)}</span></div>
      <div class="sp-best">
        <span>Best today <b>${best}</b></span>
        <span class="sp-place">{place ? <>Place <b>{place}</b></> : res && !res.error ? 'Not on the board yet' : res ? '' : 'Checking the board…'}</span>
      </div>
      {reason && <p class={`sp-why ${reason.good ? 'good' : ''}`}>{reason.text}</p>}
      {res?.error && <span class="sbk-sub">{res.error}</span>}
      {res?.day && res.day.top.length > 0 && (
        <div class="sp-sec">
          <div class="sbk-row"><span class="sbk-lab">Today's top 10</span><span class="sp-wk">{res.day.players} played</span></div>
          <Board v={res.day} mine={mine} />
        </div>
      )}
      {res?.week && res.week.top.length > 0 && (
        <div class="sp-sec">
          <div class="sbk-row"><span class="sbk-lab">This week</span>{placeWords(res.week) && <span class="sp-wk">{placeWords(res.week)}</span>}</div>
          <span class="sbk-sub sp-note">Your best Sprint of each day, added up.</span>
          <Board v={res.week} mine={mine} />
        </div>
      )}
    </div>
  );
}

function PlayIcon() {
  return <svg viewBox="0 0 24 24" width="20" height="20" aria-hidden="true"><path d="M7 4v16l13-8z" fill="currentColor" /></svg>;
}
