// The Weekly Outlook's planning data, built from the live week query: for each
// day, the four service periods with their score, demand band and whether the
// restaurant is closed — plus the "at a glance" points. Pure (no React), so it
// can be tested with plain `node`.

import { DAYPARTS, type DaypartKey } from "./dayparts";
import { bandOf, type Band } from "./bands";
import { openDuring, type SavedHours } from "./hours";

export type PlanCell = {
  key: DaypartKey;
  label: string;
  window: string;
  /** null = no forecast for this period (never treated as 0). */
  score: number | null;
  band: Band | null;
  /** Outside the restaurant's hours. The area's demand is still shown. */
  closed: boolean;
  /** This period's normal (baseline) score, for "vs. normal". null = unknown. */
  base: number | null;
};

export type PlanDay = {
  day: string; // "Mon"
  date: string; // "2026-10-01"
  isToday: boolean;
  isPast: boolean;
  cells: PlanCell[];
  /** Highest period score — the day's demand score (same rule as Daily Outlook). */
  peak: PlanCell | null;
  /** Some period has no saved opening hours, so Closed can't be worked out. */
  hoursUnknown: boolean;
};

type WeekLike = {
  today: string;
  days: {
    day: string;
    date: string;
    demand: { morningScore: number; middayScore: number; dinnerScore: number; lateScore: number } | null;
    /** Optional so the page still works if the server doesn't send baselines. */
    base?: { morning: number; midday: number; dinner: number; late: number } | null;
  }[];
};

/** How far a score is above or below its normal, in percent; null when either is unknown or normal is 0. */
export function vsNormal(score: number | null, base: number | null): number | null {
  if (score === null || base === null || base <= 0) return null;
  return ((score - base) / base) * 100;
}

const SCORE_KEY = {
  morning: "morningScore",
  midday: "middayScore",
  dinner: "dinnerScore",
  late: "lateScore",
} as const;

export function buildPlan(week: WeekLike, hours?: SavedHours[]): PlanDay[] {
  return week.days.map((d) => {
    // true open, false closed, null unknown — per period.
    const open = DAYPARTS.map((dp) => (hours ? openDuring(hours, d.date, dp.start, dp.end) : true));
    const cells: PlanCell[] = DAYPARTS.map((dp, i) => {
      const score = d.demand ? d.demand[SCORE_KEY[dp.key]] : null;
      return {
        key: dp.key,
        label: dp.label,
        window: dp.window,
        score,
        band: score === null ? null : bandOf(score),
        closed: open[i] === false,
        base: d.base ? d.base[dp.key] : null,
      };
    });
    const scored = cells.filter((c) => c.score !== null);
    const peak = scored.length ? scored.reduce((a, b) => ((b.score ?? 0) > (a.score ?? 0) ? b : a)) : null;
    return {
      day: d.day,
      date: d.date,
      isToday: d.date === week.today,
      isPast: d.date < week.today,
      cells,
      peak,
      hoursUnknown: open.some((o) => o === null),
    };
  });
}

/**
 * The service period an event counts toward. Same rule as the backend
 * (`daypartFromLocalTime` in my-app/convex/lib/vocab.ts), so what we say here
 * matches how the forecast was calculated. No time = counts toward all four.
 */
export function eventPeriod(hhmm: string | null): "Morning" | "Midday" | "Dinner" | "Late night" | "All day" | null {
  if (!hhmm) return "All day";
  const hour = parseInt(hhmm.slice(0, 2), 10);
  if (Number.isNaN(hour)) return "All day";
  if (hour >= 6 && hour < 11) return "Morning";
  if (hour >= 11 && hour < 16) return "Midday";
  if (hour >= 16 && hour < 21) return "Dinner";
  if (hour >= 21 || hour < 2) return "Late night";
  return null; // 02:00-06:00: no service period
}

export type GlancePoint = { day: string; date: string; isToday: boolean; cell: PlanCell };

/** Busiest and quietest period among today and the days still to come, skipping
 * closed periods and periods with no forecast. */
export function glance(plan: PlanDay[]): { busiest: GlancePoint | null; quietest: GlancePoint | null } {
  const all: GlancePoint[] = plan
    .filter((d) => !d.isPast)
    .flatMap((d) =>
      d.cells
        .filter((c) => c.score !== null && !c.closed)
        .map((cell) => ({ day: d.day, date: d.date, isToday: d.isToday, cell })),
    );
  if (all.length === 0) return { busiest: null, quietest: null };
  let busiest = all[0];
  let quietest = all[0];
  for (const p of all) {
    if ((p.cell.score ?? 0) > (busiest.cell.score ?? 0)) busiest = p;
    if ((p.cell.score ?? 0) < (quietest.cell.score ?? 0)) quietest = p;
  }
  return { busiest, quietest };
}
