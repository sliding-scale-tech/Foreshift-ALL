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

/** Monday "2026-09-21" -> "September 21–27, 2026" (or "September 28 – October 4,
 * 2026" / "December 28, 2026 – January 3, 2027" when the week crosses a month
 * or year). */
export function weekLabel(weekStart: string): string {
  const start = at(weekStart);
  const end = new Date(start.getTime() + 6 * 24 * 60 * 60 * 1000);
  const month = (d: Date) => fmt({ month: "long" }).format(d);
  const year = start.getUTCFullYear();
  if (year !== end.getUTCFullYear()) {
    return `${month(start)} ${start.getUTCDate()}, ${year} – ${month(end)} ${end.getUTCDate()}, ${end.getUTCFullYear()}`;
  }
  if (start.getUTCMonth() !== end.getUTCMonth()) {
    return `${month(start)} ${start.getUTCDate()} – ${month(end)} ${end.getUTCDate()}, ${year}`;
  }
  return `${month(start)} ${start.getUTCDate()}–${end.getUTCDate()}, ${year}`;
}

/** 146.2 -> "146.2", 140 -> "140", 43.4400001 -> "43.44" */
export function trimNumber(n: number, maxDecimals = 2): string {
  return String(Number(n.toFixed(maxDecimals)));
}

/** "18:40" -> "6:40 PM" (the backend's HH:MM event times are Detroit local). */
export function formatClock(hhmm: string | null): string {
  if (!hhmm) return "";
  const [h, m] = hhmm.split(":").map(Number);
  if (Number.isNaN(h) || Number.isNaN(m)) return "";
  return `${h % 12 === 0 ? 12 : h % 12}:${String(m).padStart(2, "0")} ${h < 12 ? "AM" : "PM"}`;
}

/** "2026-10-01" -> "Oct 1" */
export function monthDay(iso: string): string {
  return fmt({ month: "short", day: "numeric" }).format(at(iso));
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
