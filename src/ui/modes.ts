// REP-140 A-06: one place for the game's modes. Which mode a game is, read from its set-up, and what each mode is
// called: as a name ("Computer game", "Market League") and inside a sentence ("your unfinished computer game"). Home's
// four tabs, the four ways to start a Custom match, the save slots, the waiting game's label, the results line, the
// telemetry counter and the trophy set all take their mode from here. Pure, so it can be unit tested.
import type { GameConfig } from '../engine/game';
import { stageLabel } from './campaign';
import type { SaveSlot } from './store';

/** PLAN-125 (DEC-133): the four ways to play a Custom match, in this order everywhere (Home's card, the Play page),
 *  with the names the owner chose and the short line under each (from the approved mockup B). */
export type PlayWay = 'quick' | 'room' | 'computer' | 'phone';
export const WAYS: { id: PlayWay; name: string; line: string }[] = [
  { id: 'quick', name: 'Quick Match', line: 'Strangers online' },
  { id: 'room', name: 'Private Room', line: 'Friends by link or code' },
  { id: 'computer', name: 'Computer', line: 'On this phone' },
  { id: 'phone', name: 'Pass & Play', line: 'Take turns on this phone' },
];
const way = (id: PlayWay) => WAYS.find((w) => w.id === id) ?? WAYS[0];
export const wayName = (id: PlayWay): string => way(id).name;
export const wayLine = (id: PlayWay): string => way(id).line;

/** The kind of a game on this phone, from its set-up. A Sprint is always a Daily-style game too (daily.ts
 *  sprintConfig gives it both). An online match is one of these too; whether it is online is not in its set-up. */
export type GameKind = 'computer' | 'passPlay' | 'league' | 'daily' | 'sprint';

/** What a game's kind is read from: the set-up's Daily, Sprint and League marks, and its people (optional). */
export type KindConfig = Pick<GameConfig, 'daily' | 'sprint' | 'league'> & { players?: readonly { kind: string }[] };

export function kindOf(cfg: KindConfig): GameKind {
  if (cfg.daily) return cfg.sprint ? 'sprint' : 'daily';
  if (cfg.league !== undefined) return 'league';
  return (cfg.players ?? []).filter((p) => p.kind === 'human').length > 1 ? 'passPlay' : 'computer';
}

/** PLAN-124: Home's four modes (its tabs). Custom match covers the four ways; each mode keeps one saved game. */
export type HomeMode = 'custom' | 'league' | 'daily' | 'sprint';

/**
 * Each kind: its name, its words inside a sentence, its save slot (PLAN-120), the value the `game_start` counter sends
 * (telemetry; never changed, so the counts stay comparable) and its member of the trophies' "modes" set
 * (achievements.ts; stored on phones and accounts, so never changed either).
 */
interface Kind { name: string; sentence: string; slot: SaveSlot; counter: string; trophy: string }
const KINDS: Record<GameKind, Kind> = {
  computer: { name: `${wayName('computer')} game`, sentence: `${wayName('computer').toLowerCase()} game`, slot: 'play', counter: 'solo', trophy: 'new' },
  passPlay: { name: `${wayName('phone')} game`, sentence: `${wayName('phone')} game`, slot: 'play', counter: 'pass_and_play', trophy: 'new' },
  league: { name: 'Market League', sentence: 'League game', slot: 'league', counter: 'solo', trophy: 'league' },
  daily: { name: 'Daily market', sentence: 'Daily market game', slot: 'daily', counter: 'daily', trophy: 'daily' },
  sprint: { name: 'Sprint', sentence: 'Sprint game', slot: 'sprint', counter: 'sprint', trophy: 'daily' },
};

/** A kind's name ("Computer game", "Market League", "Daily market"). */
export const kindName = (k: GameKind): string => KINDS[k].name;
/** A kind inside a sentence: "Your unfinished computer game …", "… Pass & Play game …". */
export const kindSentence = (k: GameKind): string => KINDS[k].sentence;

/** Home's tabs: the mode, its save slot, the tab's word and the mode's name. */
export const CUSTOM_MATCH = 'Custom match';
export const HOME_MODES: { id: HomeMode; slot: SaveSlot; tab: string; name: string }[] = [
  { id: 'custom', slot: 'play', tab: 'Custom', name: CUSTOM_MATCH },
  { id: 'league', slot: 'league', tab: 'League', name: kindName('league') },
  { id: 'daily', slot: 'daily', tab: 'Daily', name: kindName('daily') },
  { id: 'sprint', slot: 'sprint', tab: 'Sprint', name: kindName('sprint') },
];
const homeMode = (id: HomeMode) => HOME_MODES.find((m) => m.id === id) ?? HOME_MODES[0];

/** The save slot a game belongs to (PLAN-120): a Sprint, a Daily market, a League stage, otherwise a Play game. */
export const slotOfKind = (k: GameKind): SaveSlot => KINDS[k].slot;

/** How a saved game is named in a notice when only its slot is known: a Play game whose people cannot be read is
 *  "game". */
export const slotSentence = (slot: SaveSlot): string => (slot === 'play' ? 'game' : kindSentence(slot));

/** The waiting game's label on Home and in its pop-ups: "Computer game", "Daily market", "League stage 3". */
export function gameLabel(cfg: KindConfig): string {
  const k = kindOf(cfg);
  return k === 'league' ? `${homeMode('league').tab} ${stageLabel(cfg.league ?? 0)}` : kindName(k);
}

/** What the results name the game by, after its length ("Sprint", "Market League, stage 3", "Online"), or null for a
 *  game on this phone with no mode of its own. */
export function resultsLabel(cfg: KindConfig, online: boolean): string | null {
  const k = kindOf(cfg);
  if (k === 'league') return `${kindName(k)}, ${stageLabel(cfg.league ?? 0)}`;
  if (k === 'sprint' || k === 'daily') return kindName(k);
  return online ? 'Online' : null;
}

/** The mode the `game_start` counter sends: sprint, daily, pass_and_play or solo (a League stage is solo). */
export const counterMode = (cfg: KindConfig): string => KINDS[kindOf(cfg)].counter;

/** The member of the trophies' "modes" set a finished game adds: online, daily (the Sprint too), league or new. */
export const trophyMode = (cfg: KindConfig, online: boolean): string => (online ? 'online' : KINDS[kindOf(cfg)].trophy);
