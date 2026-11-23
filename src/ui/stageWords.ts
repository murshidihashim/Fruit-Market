// PLAN-123: the one set of freshness words, wherever a piece's freshness is named (the lanes, the shelf, the crate,
// the customer cards and the rush): Green, Fresh, Okay, Soft. A file of its own so the fruit pictures, the tickets and
// the panels can all read it without importing each other.
import type { Stage } from '../engine/data';

export const STAGE_WORD: Record<Stage, string> = { unripe: 'Green', fresh: 'Fresh', okay: 'Okay', notso: 'Soft' };
