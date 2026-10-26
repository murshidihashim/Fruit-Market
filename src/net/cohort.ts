// Retention without identities: the device remembers its own install date and reports only
// "this device is active N days after installing" buckets. Pure helpers, unit-tested.

/** Local calendar date as YYYY-MM-DD. */
export function dayKey(d = new Date()): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

/** Whole days from date key `a` to date key `b`. */
export function daysBetween(a: string, b: string): number {
  return Math.round((Date.parse(`${b}T00:00:00Z`) - Date.parse(`${a}T00:00:00Z`)) / 86_400_000);
}

/** Retention bucket: d0..d7 each day, then d14, d30 and d30plus. */
export function activeBucket(days: number): string {
  if (days <= 7) return `d${Math.max(0, days)}`;
  if (days <= 14) return 'd14';
  if (days <= 30) return 'd30';
  return 'd30plus';
}

/** ISO week of a date key, e.g. "2026-w44" (weeks start on Monday). */
export function isoWeek(key: string): string {
  const d = new Date(`${key}T00:00:00Z`);
  d.setUTCDate(d.getUTCDate() - ((d.getUTCDay() + 6) % 7) + 3); // the Thursday of this week decides the year
  const jan1 = Date.UTC(d.getUTCFullYear(), 0, 1);
  const week = 1 + Math.floor((d.getTime() - jan1) / 86_400_000 / 7);
  return `${d.getUTCFullYear()}-w${String(week).padStart(2, '0')}`;
}
