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
  | { status: "error"; message: string; retry: () => void }
  | {
      status: "ready";
      date: string;
      result: T;
      weather: DaypartWeather | null;
      generatedAt: number | null;
      /** The numbers changed and refreshing failed: this is the last result we had. */
      stale: boolean;
      retry: () => void;
      /** Rebuild the forecast now (the server ignores it if it was just built). */
      refresh: () => void;
      refreshing: boolean;
      refreshError: string | null;
    };

// The signed-in operator's outlook of `type` (optionally for one `date` this
// week). Reads the cached result from Convex; if it's missing or stale (a cron
// run changed the numbers) it asks Convex to regenerate it once, and the
// reactive query then delivers the fresh result.
//
// `allowStale`: when a refresh fails, keep showing the last result (marked
// `stale`) instead of an error page, so the screen can say it may be out of date.
export function useOutlook<T>(
  type: OutlookType,
  date?: string,
  options?: { allowStale?: boolean },
): OutlookState<T> {
  const liveRow = useQuery(api.outlookApp.getMine, { type, date });
  const row = useStickyValue(`outlook:${type}:${date ?? ""}`, liveRow);
  const ensure = useAction(api.outlookApp.ensure);
  const inflight = useRef(false);
  const [error, setError] = useState<{ key: string; message: string } | null>(null);
  // Bumped by retry() to run generation again after a failure.
  const [attempt, setAttempt] = useState(0);
  const [refreshing, setRefreshing] = useState(false);
  const [refreshError, setRefreshError] = useState<string | null>(null);

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
  }, [needsGeneration, type, date, key, ensure, row?.date, attempt]);

  const retry = () => {
    setError(null);
    setAttempt((a) => a + 1);
  };
  const refresh = () => {
    if (refreshing) return;
    setRefreshing(true);
    setRefreshError(null);
    ensure({ type, date, force: true })
      .catch((e: unknown) => setRefreshError(e instanceof Error ? e.message : "Couldn't refresh the forecast."))
      .finally(() => setRefreshing(false));
  };
  if (error && error.key === key && (row?.result == null || !row?.fresh)) {
    if (options?.allowStale && row?.result != null) {
      return {
        status: "ready",
        date: row.date,
        result: row.result as T,
        weather: row.weather as DaypartWeather | null,
        generatedAt: row.generatedAt,
        stale: true,
        retry,
        refresh,
        refreshing,
        refreshError,
      };
    }
    return { status: "error", message: error.message, retry };
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
    generatedAt: row.generatedAt,
    stale: false,
    retry,
    refresh,
    refreshing,
    refreshError,
  };
}
