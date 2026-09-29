"use client";

import { useEffect, useRef, useState } from "react";
import { useAction, useQuery } from "convex/react";
import { api } from "my-app/convex/_generated/api";
import type { TodayOutlookResult } from "my-app/convex/lib/outlook";
import { toDailyOutlook, type DailyOutlook } from "@/app/(app)/(intelligence)/dashboard/outlook-data";
import type { DaypartWeather } from "./useOutlook";

type State =
  | { status: "loading" }
  | { status: "error"; message: string }
  | { status: "ready"; data: DailyOutlook; date: string };

// Today's outlook for one zone × concept, no sign-in needed — the public twin
// of useDailyOutlook. Reads the cached result from Convex; if it's missing or
// stale it asks Convex to generate it once and the reactive query delivers it.
export function useSampleOutlook(zone: string, concept: string): State {
  const row = useQuery(api.outlookApp.getSample, { zone, concept });
  const ensure = useAction(api.outlookApp.ensureSample);
  const inflight = useRef(false);
  const [error, setError] = useState<{ key: string; message: string } | null>(null);

  const key = `${zone}|${concept}`;
  const needsGeneration = row !== undefined && !row.fresh;
  useEffect(() => {
    if (!needsGeneration || inflight.current) return;
    inflight.current = true;
    ensure({ zone, concept })
      .catch((e: unknown) =>
        setError({ key, message: e instanceof Error ? e.message : "Couldn't load the sample." }),
      )
      .finally(() => {
        inflight.current = false;
      });
  }, [needsGeneration, zone, concept, key, ensure, row?.date]);

  if (error && error.key === key && (row?.result == null || !row?.fresh)) {
    return { status: "error", message: error.message };
  }
  if (row === undefined || row.result == null || !row.fresh) return { status: "loading" };

  return {
    status: "ready",
    date: row.date,
    data: toDailyOutlook(row.result as TodayOutlookResult, row.weather as DaypartWeather | null),
  };
}
