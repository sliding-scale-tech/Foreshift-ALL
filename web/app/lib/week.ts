// Date helpers shared by the week-based screens. Dates are "YYYY-MM-DD"
// strings in Detroit local time (the backend's convention); they're formatted
// in UTC at noon so the calendar day can never shift with the viewer's zone.

export const DAY_KEYS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"] as const;
export type DayKey = (typeof DAY_KEYS)[number];

export const FULL_DAY: Record<DayKey, string> = {
  Mon: "Monday",
  Tue: "Tuesday",
  Wed: "Wednesday",
  Thu: "Thursday",
  Fri: "Friday",
  Sat: "Saturday",
  Sun: "Sunday",
};

function at(iso: string): Date {
  return new Date(`${iso}T12:00:00Z`);
}

const fmt = (opts: Intl.DateTimeFormatOptions) => new Intl.DateTimeFormat("en-US", { ...opts, timeZone: "UTC" });

/** "2026-09-21" -> "Sep 21, 2026" */
export function shortDate(iso: string): string {
  return fmt({ month: "short", day: "numeric", year: "numeric" }).format(at(iso));
}

/** "2026-09-21" -> "Monday, September 21, 2026" */
export function longDate(iso: string): string {
  return fmt({ weekday: "long", month: "long", day: "numeric", year: "numeric" }).format(at(iso));
}

/** Monday "2026-09-21" -> "Week 3 of September '26". The week number is the
 * Monday's day-of-month / 7, rounded up (matches Bubble's label for Sep 21). */
export function weekLabel(weekStart: string): string {
  const d = at(weekStart);
  const month = fmt({ month: "long" }).format(d);
  const yy = String(d.getUTCFullYear()).slice(-2);
  return `Week ${Math.ceil(d.getUTCDate() / 7)} of ${month} '${yy}`;
}

/** 146.2 -> "146.2", 140 -> "140", 43.4400001 -> "43.44" */
export function trimNumber(n: number, maxDecimals = 2): string {
  return String(Number(n.toFixed(maxDecimals)));
}

/** "2026-09-21T18:40:00-04:00" -> "6:40PM" (restaurant's timezone). */
export function formatEventTime(iso: string): string {
  if (!iso) return "";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "";
  return new Intl.DateTimeFormat("en-US", {
    hour: "numeric",
    minute: "2-digit",
    timeZone: "America/Detroit",
  })
    .format(d)
    .replace(" ", "");
}
