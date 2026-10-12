// Server copy of the web app's operating-hours check (web/app/lib/hours.ts
// openDuring + its helpers) so AI Pass can say which dayparts the operator is
// closed for. Keep the two in step.

import { DAYS, type Day } from "./vocab";

export type SavedHours = { day: string; isClosed: boolean; openTime?: string; closeTime?: string };

/** "9:15 AM", "9pm", "21:30", "0930" -> minutes since midnight; null if not a time. */
export function parseTime(input: string): number | null {
  const s = input.trim().toLowerCase().replace(/\./g, "");
  const m = s.match(/^(\d{1,2})(?::?(\d{2}))?\s*(am|pm|a|p)?$/);
  if (!m) return null;
  let h = Number(m[1]);
  const min = m[2] === undefined ? 0 : Number(m[2]);
  const meridiem = m[3]?.[0];
  if (min > 59) return null;
  if (meridiem) {
    if (h < 1 || h > 12) return null;
    if (meridiem === "a" && h === 12) h = 0;
    if (meridiem === "p" && h !== 12) h += 12;
  } else if (h > 23) {
    return null;
  }
  return h * 60 + min;
}

/** "2026-10-01" -> "Thu" (read at noon UTC so it can't shift). */
function dayOfDate(date: string): Day {
  return DAYS[(new Date(`${date}T12:00:00Z`).getUTCDay() + 6) % 7];
}

/**
 * Is the restaurant open at any point in [start, end) (minutes since midnight)
 * on `date`? Counts the previous night's after-midnight hours too. null =
 * unknown: that day has no saved hours.
 */
export function openDuring(saved: SavedHours[], date: string, start: number, end: number): boolean | null {
  const day = dayOfDate(date);
  const today = saved.find((h) => h.day === day);
  if (!today) return null;

  const intervals: [number, number][] = [];
  const times = (h: SavedHours | undefined) => {
    if (!h || h.isClosed) return null;
    const o = parseTime(h.openTime ?? "");
    const c = parseTime(h.closeTime ?? "");
    return o === null || c === null || o === c ? null : { o, c };
  };

  const t = times(today);
  if (t) intervals.push([t.o, t.c > t.o ? t.c : 24 * 60]);
  const prevDay = DAYS[(DAYS.indexOf(day) + 6) % 7];
  const p = times(saved.find((h) => h.day === prevDay));
  if (p && p.c < p.o && p.c > 0) intervals.push([0, p.c]);

  return intervals.some(([a, b]) => a < end && b > start);
}

// Same windows as web/app/lib/dayparts.ts (minutes since midnight).
export const DAYPART_MINUTES: Record<string, [number, number]> = {
  morning: [6 * 60, 11 * 60],
  midday: [11 * 60, 16 * 60],
  dinner: [16 * 60, 21 * 60],
  late: [21 * 60, 24 * 60],
};
