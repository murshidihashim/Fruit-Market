// The small gaps on the phone (PLAN-096): the morning fits a 360x640 phone with six stalls, the event chip shows its
// whole name, the places to tap are 40 px, and the faint labels are dark enough to read.
// PLAN-130 (A-05): what the stylesheets draw is read in the browser, on the built page, instead of in the sheets as
// text (scripts/style-checks.cjs, run by the solo playthrough in npm run verify:full), so a rule can move to its part's
// own sheet or lose its "#app" while these still hold. What is left here is the sheet's own steps.
import { describe, expect, it } from 'vitest';
import { TIGHTEST, closer, type Fitting } from '../src/ui/game/panels/MorningCard';

describe('the morning on a small phone with six stalls (MorningCard.tsx)', () => {
  /** A stand-in for the sheet: how tall its parts are at each step, and the room it has. */
  const sheet = (parts: number[], room: number): Fitting => {
    const dataset: DOMStringMap = {};
    return { dataset, clientHeight: room, get scrollHeight() { return Math.max(room, parts[Number(dataset.tight ?? 0)]); } };
  };
  /** Steps taken, and what is left to scroll after them. */
  const fit = (parts: number[], room: number) => { const el = sheet(parts, room); closer(el); return { step: Number(el.dataset.tight ?? 0), scroll: el.scrollHeight - el.clientHeight }; };

  it('has five steps; at the closest the busiest mornings of computer games at six stalls fit a 360x640 phone with no scroll', () => {
    expect(TIGHTEST).toBe(5);
    // The sheet's height at each step (0 to 5) and its room, measured in the browser at 360x640 with six stalls
    // (Chromium, the game's own fonts) on mornings from computer games, and on one made by hand. Before PLAN-096 the
    // sheet stopped at step 3 and scrolled by the difference.
    const measured: [string, number[], number, number][] = [
      // what it is, the heights at steps 0 to 5, the room, the step it needs
      ['Monsoon Downpour (two lines of title, two chips), a rival topped up, a Market Day', [463, 418, 406, 386, 337, 326], 326, 5],
      ['the last day: its leftovers note (measured with the rules 19 jam maker\'s note, which was longer), Mango Windfall and its ripe line', [449, 414, 402, 380, 326, 326], 326, 4],
      ['Price Controls (the event with a row of limits)', [439, 404, 392, 356, 326, 326], 326, 4],
      ['Health Inspector on a Market Day with a standing order, two stalls fined', [452, 411, 399, 381, 360, 360], 360, 4],
      ['by hand: Price Controls on a Market Day, you and a rival topped up', [503, 461, 449, 414, 362, 360], 360, 5],
    ];
    for (const [what, parts, room, step] of measured) {
      expect(parts[3] - room, what).toBeGreaterThan(0); // it scrolled at the old closest step
      expect(fit(parts, room), what).toEqual({ step, scroll: 0 });
    }
  });

  it('every step keeps the steps before it, and the event picture only shrinks: nothing is hidden past step 2', () => {
    // scripts/style-checks.cjs: "the morning drawn closer" (the tagline put away, the delivery row and the title
    // smaller from step 2 on, the event's picture 104 by 76 at step 3 and 80 by 58 after, the words flowing round it at
    // step 5), and from the page's own rules: only the tagline is ever put away.
  });
});

// The event chip in the top bar shows its whole name (the picture gives way first, out of sight below; the name never
// narrower than its longest word), and its yellow stays 36 px tall in a place to tap of 40: scripts/style-checks.cjs,
// "the event chip in the top bar".

// Places to tap of at least 40 px, at every step, without moving a row: the pricing sheet's − and + (40, 36 and 34 px
// tall, their unseen area reaching over the row's edge and half the gap between two rows; 38 px across on a narrow
// phone, 2 px more on the outer side) and its "i", and the stocking sheet's (44, 38, 36 and 34 px tall; 40 px across on
// a narrow phone): scripts/style-checks.cjs, "the pricing sheet's − and +" and "the stocking sheet's − and +". The
// controls of a played game are also measured by the area a tap reaches: scripts/perf-budget.cjs.

// Faint labels are dark enough to read, 4.5 to 1 against what they lie on (the empty market box, the rush's
// freshness, tags and pay, the lane headings, tomorrow's lorry, the empty crate, the rest of tomorrow, a − or + that
// cannot be pressed, the chips, the last day's pill, a standing order due today, a raised price, the takings' money,
// the money that floats up, the night's grey for an empty box, the stamp book's later ranks): scripts/style-checks.cjs,
// its READABLE list, from the colours the browser draws. (Home's dots are no longer drawn: PLAN-130 took their styles
// out with the other classes the code never writes.)
