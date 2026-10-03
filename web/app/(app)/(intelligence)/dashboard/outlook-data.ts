// Shape of everything the Daily Outlook screen renders, plus the mapper that
// turns Convex's outlook result (api.outlookApp.getMine → the same JSON Bubble's
// /demand/outlook returned) into it. The presentational components only ever
// see `DailyOutlook`.

import type { TodayOutlookResult } from "my-app/convex/lib/outlook";
import { toDrivers, type Driver } from "@/app/lib/drivers";
import type { DaypartWeather } from "@/app/hooks/useOutlook";
import { DAYPARTS, type DaypartKey } from "@/app/lib/dayparts";
import type { Band } from "@/app/lib/bands";

export type { Band, DaypartKey };
export { MAX_SCORE } from "@/app/lib/bands";

export type DaypartOutlook = {
  key: DaypartKey;
  label: string;
  window: string; // e.g. "7:00 AM – 10:00 AM"
  start: number; // window in minutes since midnight
  end: number;
  score: number | null; // null = no forecast for this daypart
  band: Band | null;
  liftPct: number | null; // vs. normal; null = not available (never shown as 0%)
  weather: { condition: string; tempF: number } | null;
  eventNote: string;
};

export type DailyOutlook = {
  brief: string;
  briefIsFactual: boolean; // true = Gemini was unavailable; the brief is written from the numbers
  band: Band;
  score: number; // 0–150: the busiest daypart's score
  peakLabel: string; // that daypart, e.g. "Dinner"
  dayparts: DaypartOutlook[];
  drivers: Driver[];
};

export function toDailyOutlook(
  result: TodayOutlookResult,
  weather: DaypartWeather | null,
): DailyOutlook {
  const byKey = new Map(result.dayparts.map((d) => [d.daypart, d]));

  const dayparts: DaypartOutlook[] = DAYPARTS.map((meta) => {
    const dp = byKey.get(meta.key);
    const w = weather?.[meta.key];
    const pct = dp ? parseFloat(dp.combined_percent) : NaN;
    return {
      key: meta.key,
      label: meta.label,
      window: meta.window,
      start: meta.start,
      end: meta.end,
      score: dp ? dp.score : null,
      band: dp ? (dp.band as Band) : null,
      liftPct: Number.isFinite(pct) ? pct : null,
      weather: w ? { condition: w.condition, tempF: w.tempF } : null,
      eventNote: dp?.event_note ?? "",
    };
  });

  return {
    brief: result.narration,
    briefIsFactual: (result as { narration_source?: string }).narration_source === "facts",
    band: result.peak.band as Band,
    score: result.peak.score,
    peakLabel: DAYPARTS.find((m) => m.key === result.peak.daypart)?.label ?? result.peak.daypart,
    dayparts,
    drivers: toDrivers(result.drivers),
  };
}
