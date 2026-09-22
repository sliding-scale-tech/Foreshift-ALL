"use client";

import type { TodayOutlookResult } from "my-app/convex/lib/outlook";
import { toDailyOutlook, type DailyOutlook } from "@/app/(app)/(intelligence)/dashboard/outlook-data";
import { useOutlook } from "./useOutlook";

type State =
  | { status: "loading" }
  | { status: "error"; message: string }
  | { status: "ready"; data: DailyOutlook; date: string };

// The signed-in operator's Daily Outlook for `date` (default: today), mapped
// to the shape the page renders.
export function useDailyOutlook(date?: string): State {
  const o = useOutlook<TodayOutlookResult>("today", date);
  if (o.status !== "ready") return o;
  return { status: "ready", date: o.date, data: toDailyOutlook(o.result, o.weather) };
}
