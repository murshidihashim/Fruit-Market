// The Daily market streak, with one forgiven miss (PLAN-086; progression study, section E). Worked out from the dates
// already stored (the best cash for each Daily market date), so there is nothing new to save.
//
// The streak counts days with a Daily market finished. A streak holds one pass: a single missed day is forgiven, and
// the pass comes back after five more played days. Two missed days in a row always end the streak. A forgiven day
// adds nothing to the count. Nothing here ever says a streak is about to be lost.

/** A date key (YYYY-MM-DD) as a whole number of days, so two dates can be compared. NaN for anything else. */
export function dayNumber(key: string): number {
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(key);
  return m ? Math.round(Date.UTC(Number(m[1]), Number(m[2]) - 1, Number(m[3])) / 86_400_000) : NaN;
}

/** Played days needed after a forgiven miss before the next miss is forgiven. */
export const PASS_AFTER = 5;

interface Run { len: number; last: number; pass: boolean; since: number }

/** Every run of played days, oldest first. */
function runs(dates: Iterable<string>): Run[] {
  const days = [...new Set([...dates].map(dayNumber).filter((d) => !Number.isNaN(d)))].sort((a, b) => a - b);
  const out: Run[] = [];
  let run: Run | null = null;
  for (const d of days) {
    const gap: number = run ? d - run.last : 0;
    if (run && gap === 1) {
      run.len++;
      run.last = d;
      if (!run.pass && ++run.since >= PASS_AFTER) run.pass = true;
    } else if (run && gap === 2 && run.pass) {
      // one missed day, forgiven: the pass is used and must be earned again
      run.pass = false;
      run.since = 1;
      run.len++;
      run.last = d;
    } else {
      run = { len: 1, last: d, pass: true, since: 0 };
      out.push(run);
    }
  }
  return out;
}

/** The longest streak ever reached. */
export function bestStreak(dates: Iterable<string>): number {
  return runs(dates).reduce((best, r) => Math.max(best, r.len), 0);
}

/**
 * The streak that is alive on `today` (a date key): the last run, if its last played day is today or yesterday, or
 * the day before yesterday with the pass still in hand (playing today would then carry it on). Otherwise 0.
 */
export function currentStreak(dates: Iterable<string>, today: string): number {
  const all = runs(dates);
  const last = all[all.length - 1];
  const now = dayNumber(today);
  if (!last || Number.isNaN(now)) return 0;
  const gap = now - last.last;
  return gap <= 1 || (gap === 2 && last.pass) ? last.len : 0;
}
