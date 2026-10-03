"use client";

import type { TodayOutlookResult } from "my-app/convex/lib/outlook";
import { toDailyOutlook, type DailyOutlook } from "@/app/(app)/(intelligence)/dashboard/outlook-data";
import { useOutlook } from "./useOutlook";

type State =
  | { status: "loading" }
  | { status: "error"; message: string; retry: () => void }
  | { status: "ready"; data: DailyOutlook; date: string; generatedAt: number | null; stale: boolean; retry: () => void; refresh: () => void; refreshing: boolean; refreshError: string | null };

// The signed-in operator's Daily Outlook for `date` (default: today), mapped
// to the shape the page renders.
export function useDailyOutlook(date?: string): State {
  const o = useOutlook<TodayOutlookResult>("today", date, { allowStale: true });
  if (o.status !== "ready") return o;
  return {
    status: "ready",
    date: o.date,
    generatedAt: o.generatedAt,
    stale: o.stale,
    retry: o.retry,
    refresh: o.refresh,
    refreshing: o.refreshing,
    refreshError: o.refreshError,
    data: toDailyOutlook(o.result, o.weather),
  };
}
