"use client";

import { useQuery } from "convex/react";
import { useStickyValue } from "./useStickyValue";
import { api } from "my-app/convex/_generated/api";
import type { FunctionReturnType } from "convex/server";

export type WeekData = FunctionReturnType<typeof api.outlookApp.getWeek>;
export type WeekDay = WeekData["days"][number];
export type WeekEvent = WeekData["events"][number];

// The operator's current Mon..Sun week: per-day peak demand + weather, and
// every nearby event. `undefined` while loading. Reactive.
export function useWeek(): WeekData | undefined {
  const live = useQuery(api.outlookApp.getWeek);
  return useStickyValue("week", live);
}
