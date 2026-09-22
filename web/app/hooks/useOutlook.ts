"use client";

import { useEffect, useRef, useState } from "react";
import { useAction, useQuery } from "convex/react";
import { useStickyValue } from "./useStickyValue";
import { api } from "my-app/convex/_generated/api";

export type OutlookType = "today" | "weekly" | "events" | "weather";

export type DaypartWeather = Record<
  "morning" | "midday" | "dinner" | "late",
  { condition: string; tempF: number; severity: number; precipChance: number }
>;

export type OutlookState<T> =
  | { status: "loading" }
  | { status: "error"; message: string }
  | { status: "ready"; date: string; result: T; weather: DaypartWeather | null };

// The signed-in operator's outlook of `type` (optionally for one `date` this
// week). Reads the cached result from Convex; if it's missing or stale (a cron
// run changed the numbers) it asks Convex to regenerate it once, and the
// reactive query then delivers the fresh result.
export function useOutlook<T>(type: OutlookType, date?: string): OutlookState<T> {
  const liveRow = useQuery(api.outlookApp.getMine, { type, date });
  const row = useStickyValue(`outlook:${type}:${date ?? ""}`, liveRow);
  const ensure = useAction(api.outlookApp.ensure);
  const inflight = useRef(false);
  const [error, setError] = useState<{ key: string; message: string } | null>(null);

  const key = `${type}|${date ?? ""}`;
  const needsGeneration = row !== undefined && !row.fresh;
  useEffect(() => {
    if (!needsGeneration || inflight.current) return;
    inflight.current = true;
    setError(null);
    ensure({ type, date })
      .catch((e: unknown) =>
        setError({ key, message: e instanceof Error ? e.message : "Couldn't load the outlook." }),
      )
      .finally(() => {
        inflight.current = false;
      });
    // `row?.date` re-arms this after a date change or once a stale row is refreshed.
  }, [needsGeneration, type, date, key, ensure, row?.date]);

  if (error && error.key === key && (row?.result == null || !row?.fresh)) {
    return { status: "error", message: error.message };
  }
  // Not ready until the result exists AND matches the current data: a stale
  // one (the numbers changed since it was generated) is being regenerated, and
  // showing it meanwhile would display out-of-date figures.
  if (row === undefined || row.result == null || !row.fresh) return { status: "loading" };

  return {
    status: "ready",
    date: row.date,
    result: row.result as T,
    weather: row.weather as DaypartWeather | null,
  };
}
