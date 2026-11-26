// PLAN-120: the screen before a Daily market or a Sprint starts. It says what the mode is and what it asks of you
// before any game begins: the goal, how it works (the days, the stalls and rivals at their level, today's twist), how
// you are scored and ranked, and retries; with today's first customer card, the rivals' faces, and your best and place
// when you have them. Start (or Continue, when a game of that mode is waiting) and Back. Every number comes from the
// configs (engine/daily.ts): dailyConfig, sprintConfig, dailyTwist, SPRINT_WEEK_DAYS. Nothing here is animated.
import { useMemo } from 'preact/hooks';
import { SPRINT_WEEK_DAYS, dailyConfig, dailyTwist, sprintConfig } from '../engine/daily';
import { lookOf } from '../engine/data';
import { newGame, type GameState } from '../engine/game';
import { placeWords } from '../net/sprint';
import { Face } from './art';
import { Gazette, TradingCard } from './cards';
import { CardZoom } from './cardZoom';
import { firstCustomer, rivalsLine, shortDate } from './dailyCard';
import { PlayIcon, useDailyBoard, waitWords } from './HomeCards';
import { setupAvatar, worn } from './looks';
import { MODE_REASON, leagueEcho } from './playMenu';
import { leagueStage } from './progress';
import { waitingGame } from './paused';
import { BackArrow, FramedFace } from './stampCard';
import { bestLine, useSprintBoards } from './Sprint';
import { loadSprintBest } from './sprintStore';
import { loadDaily } from './store';
import './home-cards.css';
import { kindName } from './modes';

export type DailyKind = 'daily' | 'sprint';

/** PLAN-123: the Sprint's perk choice in words (the same offer for everyone; the one you pick changes your start). */
export const SPRINT_PERK_LINE = 'You pick one perk from the same offer as everyone. Some change your start, such as more cash.';
/** PLAN-123: "no twist" is the Daily's weekly twist; the regular event cards still come up in the Sprint. */
export const SPRINT_EVENTS_LINE = 'No upgrades and no daily twist. The regular event cards still come up.';

export interface DailyIntroProps {
  kind: DailyKind;
  today: string;
  /** The waiting game of this mode (its slot), or null. */
  waiting: GameState | null;
  onBack: () => void;
  onStart: () => void;
  onContinue: () => void;
  /** Shows the other format's intro (the Daily market's or the Sprint's). */
  onSwitch: (kind: DailyKind) => void;
}

/** The intro's words, from the day's own set-up. Kept apart from the screen so they can be unit tested. */
export function introWords(kind: DailyKind, today: string): { title: string; length: string; goal: string; how: string[]; score: string[]; retry: string } {
  const cfg = kind === 'sprint' ? sprintConfig(today, 'You') : dailyConfig(today, 'You');
  const stalls = cfg.players.length;
  const twist = dailyTwist(today);
  if (kind === 'sprint') {
    return {
      title: kindName('sprint'), length: `${cfg.days} days · ${stalls} stalls`,
      // PLAN-123 (preview finding 7): the perk you pick changes your start (Nest Egg is $5 more), so the words say what is
      // the same for everyone: the market and the perks on offer; and that "no twist" still has the regular event cards.
      goal: `A short market: end ${cfg.days} days with the most cash. Everyone gets the same market today and the same perks to pick from.`,
      how: [`${cfg.days} days, ${stalls} stalls. ${rivalsLine(cfg)}`, SPRINT_PERK_LINE, SPRINT_EVENTS_LINE],
      score: ['Ranked by final cash, then by fruit sold.', 'Your best today counts on today\'s board.', `The week counts your best ${SPRINT_WEEK_DAYS} days.`],
      retry: 'Retry as often as you like.',
    };
  }
  return {
    title: kindName('daily'), length: `${cfg.days} days · ${stalls} stalls`,
    goal: `The same market for everyone today: the same customers, lorry and events. End ${cfg.days} days with the most cash.`,
    how: [`${cfg.days} days, ${stalls} stalls. ${rivalsLine(cfg)}`, `Today's twist: ${twist.title}. ${twist.text}`],
    score: ['Ranked by final cash, then by fruit sold.', 'Your best today counts on today\'s board.'],
    retry: 'Play it again today if you like. Only your best counts.',
  };
}

export function DailyIntro(p: DailyIntroProps) {
  const cfg = useMemo(() => (p.kind === 'sprint' ? sprintConfig(p.today, 'You') : dailyConfig(p.today, 'You')), [p.kind, p.today]);
  const first = useMemo(() => newGame(cfg), [cfg]);
  const who = firstCustomer(first);
  const e = first.event;
  const words = introWords(p.kind, p.today);
  const daily = useDailyBoard(p.today);
  const sprint = useSprintBoards(p.today);
  const mine = p.kind === 'sprint'
    ? bestLine(loadSprintBest()[p.today]?.cash, placeWords(sprint?.day))
    : bestLine(loadDaily()[p.today], daily?.error ? null : placeWords(daily ? { rank: daily.rank, players: daily.players ?? daily.top.length } : undefined));
  const w = waitingGame(p.waiting);
  const rivals = cfg.players.filter((pl) => pl.kind === 'ai');
  // PLAN-119: what today's Daily uses that you met in the Market League (the Sprint has no twist and no standing orders).
  const echo = p.kind === 'daily' ? leagueEcho(first.config, who?.name ?? null, leagueStage()) : null;
  return (
    <div class="sbk jp-page jh-intro" data-a={`intro-${p.kind}`}>
      <header class="jp-bar">
        <button class="jp-back" onClick={p.onBack} aria-label="Back"><BackArrow /></button>
        <h1>{words.title}</h1>
        <span class="jp-bar-end" />
      </header>
      <main class="sbk-scroll">
        <div class="sbk-in jh-in">
          <div class="jh-kinds" role="group" aria-label="Daily formats">
            <button class={p.kind === 'daily' ? 'on' : ''} aria-pressed={p.kind === 'daily'} onClick={() => p.onSwitch('daily')}>Daily market</button>
            <button class={p.kind === 'sprint' ? 'on' : ''} aria-pressed={p.kind === 'sprint'} onClick={() => p.onSwitch('sprint')}>Sprint</button>
          </div>
          <section class="jh-ihero" aria-labelledby="jh-ititle">
            <span class="sbk-lab jp-yel">{shortDate(p.today)} · {words.length}</span>
            <h2 id="jh-ititle">{MODE_REASON[p.kind]}</h2>
            <p class="jh-igoal">{words.goal}</p>
            <div class="jh-ivs">
              <CardZoom class="jh-icard" title={who ? lookOf(who.name).title : e ? e.title : 'First customer'}>{who ? <TradingCard who={who.name} wants={who.wants} eager /> : e ? <Gazette event={e} eager /> : null}</CardZoom>
              <div class="jh-iside">
                <span class="jh-lb">First customer</span>
                <span class="jh-iwho">{who ? lookOf(who.name).title : e ? e.title : ''}</span>
                <span class="jh-lb">Your rivals</span>
                <span class="jh-ifaces">
                  <FramedFace who={setupAvatar(cfg)} size={34} look={worn()} /><i aria-hidden="true">vs</i>
                  {rivals.map((r) => <span class="jh-round" title={r.name}><Face who={r.avatar ?? ''} size={34} /></span>)}
                </span>
                {mine && <span class="jh-imine">{mine}</span>}
              </div>
            </div>
          </section>
          <section class="jh-irules" aria-label="How it works">
            <div><span class="jh-lb">How it works</span>{words.how.map((t) => <p>{t}</p>)}{echo && <p class="jh-iecho" data-a="intro-echo">{echo}</p>}</div>
            <div><span class="jh-lb">How you are ranked</span>{words.score.map((t) => <p>{t}</p>)}</div>
            <div><span class="jh-lb">Retries</span><p>{words.retry}</p></div>
          </section>
          <div class="jh-igo">
            {w && <button class="jh-go2 jh-c2" data-a="intro-start" onClick={p.onStart}>Start again</button>}
            <button class="jh-go2 jh-c2" onClick={p.onBack}>Back</button>
          </div>
        </div>
      </main>
      {/* REP-140 B-01: the main action stays at the foot of the screen, in view without scrolling */}
      <footer class="jp-foot">
        {w
          ? <button class="jp-go" data-a="intro-continue" onClick={p.onContinue}><PlayIcon /><span class="ji-cont">Continue<small>{waitWords(w)}</small></span></button>
          : <button class="jp-go" data-a="intro-start" onClick={p.onStart}><PlayIcon />Start</button>}
      </footer>
    </div>
  );
}
