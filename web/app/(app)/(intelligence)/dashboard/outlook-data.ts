// Shape of everything the Daily Outlook screen renders, plus the mapper that
// turns Convex's outlook result (api.outlookApp.getMine → the same JSON Bubble's
// /demand/outlook returned) into it. The presentational components only ever
// see `DailyOutlook`.

import type { TodayOutlookResult } from "my-app/convex/lib/outlook";
import { toDrivers, type Driver } from "@/app/lib/drivers";
import type { DaypartWeather } from "@/app/hooks/useOutlook";
import { DAYPARTS, type DaypartKey } from "@/app/lib/dayparts";

export type Band = "Minimal" | "Light" | "Moderate" | "High" | "Peak" | "Exceptional";

export type { DaypartKey };

export type DaypartOutlook = {
  key: DaypartKey;
  label: string;
  window: string; // e.g. "7:00 AM – 10:00 AM"
  band: Band;
  liftPct: number; // vs. normal
  weather: { condition: string; tempF: number } | null;
  eventNote: string;
};

export type DailyOutlook = {
  brief: string;
  band: Band;
  score: number; // 0–150
  dayparts: DaypartOutlook[];
  chart: { categories: string[]; values: number[] };
  drivers: Driver[];
};

export const MAX_SCORE = 150;

export function toDailyOutlook(
  result: TodayOutlookResult,
  weather: DaypartWeather | null,
): DailyOutlook {
  const byKey = new Map(result.dayparts.map((d) => [d.daypart, d]));

  const dayparts: DaypartOutlook[] = DAYPARTS.map((meta) => {
    const dp = byKey.get(meta.key);
    const w = weather?.[meta.key];
    return {
      key: meta.key,
      label: meta.label,
      window: meta.window,
      band: (dp?.band ?? "Minimal") as Band,
      liftPct: dp ? parseFloat(dp.combined_percent) || 0 : 0,
      weather: w ? { condition: w.condition, tempF: w.tempF } : null,
      eventNote: dp?.event_note ?? "",
    };
  });

  const drivers = toDrivers(result.drivers);

  return {
    brief: result.narration,
    band: result.peak.band as Band,
    score: result.peak.score,
    dayparts,
    chart: {
      categories: DAYPARTS.map((m) => m.chartLabel),
      values: DAYPARTS.map((m) => byKey.get(m.key)?.score ?? 0),
    },
    drivers,
  };
}
