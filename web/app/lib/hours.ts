// Operating hours: time parsing/formatting and schedule validation, shared by
// onboarding and Settings. Pure (type-only imports) so it can be tested with
// plain `node`.

export type Day = (typeof import("my-app/convex/lib/vocab").DAYS)[number];

/** Saved shape (operators.operatingHours in Convex). One period per day. */
export type SavedHours = { day: string; isClosed: boolean; openTime?: string; closeTime?: string };

/** Editing shape. "unset" is only ever an in-progress state — a schedule is
 * not saved until every day is either open (with both times) or closed. */
export type DayHours = {
  day: Day;
  state: "unset" | "closed" | "open";
  open: string; // canonical "9:15 AM", or "" when missing/invalid
  close: string;
};

export const FULL_DAY_NAME: Record<Day, string> = {
  Mon: "Monday",
  Tue: "Tuesday",
  Wed: "Wednesday",
  Thu: "Thursday",
  Fri: "Friday",
  Sat: "Saturday",
  Sun: "Sunday",
};

/** Minutes since midnight -> "9:15 AM". */
export function formatTime(minutes: number): string {
  const h = Math.floor(minutes / 60) % 24;
  const m = minutes % 60;
  const hour12 = h % 12 === 0 ? 12 : h % 12;
  return `${hour12}:${String(m).padStart(2, "0")} ${h < 12 ? "AM" : "PM"}`;
}

/** Every 15 minutes, "12:00 AM" … "11:45 PM" — the suggestions under each time field. */
export const TIME_OPTIONS: string[] = Array.from({ length: 96 }, (_, i) => formatTime(i * 15));

/** What an operator might type -> minutes since midnight, or null if it isn't
 * a time. Accepts "9:15 AM", "9:15am", "9am", "9 pm", "21:30", "0930", "9". A
 * bare number with no AM/PM is read as 24-hour time. */
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

/** Normalize typed text to the canonical label, or "" if it isn't a time. */
export function normalizeTime(input: string): string {
  const t = parseTime(input);
  return t === null ? "" : formatTime(t);
}

/** True when closing time is on the next calendar day (e.g. 6 PM – 2 AM). A
 * midnight close ("12:00 AM") is not counted — nothing spills into tomorrow. */
export function closesNextDay(d: DayHours): boolean {
  const o = parseTime(d.open);
  const c = parseTime(d.close);
  return o !== null && c !== null && c !== 0 && c < o;
}

/** Per-day problem with an open day's times, or null. Days are in Mon..Sun
 * order; the week wraps (Sunday night can run into Monday morning). */
export function dayErrors(days: DayHours[]): Record<Day, string | null> {
  const out = {} as Record<Day, string | null>;
  days.forEach((d, i) => {
    out[d.day] = null;
    if (d.state !== "open") return;
    const o = parseTime(d.open);
    const c = parseTime(d.close);
    if (o === null && c === null) out[d.day] = "Add opening and closing times.";
    else if (o === null) out[d.day] = "Add an opening time, e.g. 9:30 AM.";
    else if (c === null) out[d.day] = "Add a closing time, e.g. 10:00 PM.";
    else if (o === c) out[d.day] = "Opening and closing times can't be the same.";
    else {
      // The previous day's after-midnight hours must end before this day opens.
      const prev = days[(i + days.length - 1) % days.length];
      if (prev.state === "open" && closesNextDay(prev)) {
        const prevClose = parseTime(prev.close)!;
        if (prevClose > o) {
          out[d.day] = `Overlaps with ${FULL_DAY_NAME[prev.day]}'s hours, which run until ${prev.close}.`;
        }
      }
    }
  });
  return out;
}

export function unsetDays(days: DayHours[]): Day[] {
  return days.filter((d) => d.state === "unset").map((d) => d.day);
}

/** Ready to save: every day decided and no open day has a problem. */
export function isScheduleComplete(days: DayHours[]): boolean {
  const errors = dayErrors(days);
  return unsetDays(days).length === 0 && days.every((d) => errors[d.day] === null);
}

export function emptySchedule(days: readonly Day[]): DayHours[] {
  return days.map((day) => ({ day, state: "unset", open: "", close: "" }));
}

/** Saved rows -> editing rows. A day missing from the saved list is "unset". */
export function fromSavedHours(saved: SavedHours[], days: readonly Day[]): DayHours[] {
  return days.map((day) => {
    const h = saved.find((x) => x.day === day);
    if (!h) return { day, state: "unset", open: "", close: "" };
    if (h.isClosed) return { day, state: "closed", open: "", close: "" };
    return { day, state: "open", open: normalizeTime(h.openTime ?? ""), close: normalizeTime(h.closeTime ?? "") };
  });
}

/** Editing rows -> saved rows. Only call on a complete schedule. */
export function toSavedHours(days: DayHours[]): SavedHours[] {
  return days.map((d) =>
    d.state === "open"
      ? { day: d.day, isClosed: false, openTime: d.open, closeTime: d.close }
      : { day: d.day, isClosed: true },
  );
}

const WEEK: Day[] = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];

/** "2026-10-01" -> "Thu" (calendar date, read at noon UTC so it can't shift). */
export function dayOfDate(date: string): Day {
  return WEEK[(new Date(`${date}T12:00:00Z`).getUTCDay() + 6) % 7];
}

/**
 * Is the restaurant open at any point in [start, end) (minutes since midnight)
 * on `date`? Counts the previous night's after-midnight hours too (Fri 6 PM –
 * 2 AM covers early Saturday). null = unknown: that day has no saved hours.
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
  const prevDay = WEEK[(WEEK.indexOf(day) + 6) % 7];
  const p = times(saved.find((h) => h.day === prevDay));
  if (p && p.c < p.o && p.c > 0) intervals.push([0, p.c]);

  return intervals.some(([a, b]) => a < end && b > start);
}

/** "Mon, Tue and Wed" */
export function listDays(days: Day[]): string {
  if (days.length <= 1) return days.join("");
  return `${days.slice(0, -1).join(", ")} and ${days[days.length - 1]}`;
}
