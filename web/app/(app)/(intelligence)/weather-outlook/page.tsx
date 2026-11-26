"use client";

import { useState } from "react";
import type { WeatherOutlookResult } from "my-app/convex/lib/outlook";
import { useMyOperator } from "@/app/hooks/useMyOperator";
import { useOnceReady } from "@/app/hooks/useOnceReady";
import { useOutlook } from "@/app/hooks/useOutlook";
import { useWeek } from "@/app/hooks/useWeek";
import { LoadError } from "@/app/components/LoadError";
import { PageLoading } from "@/app/components/PageLoading";
import { WeatherView } from "@/app/components/WeatherView";
import { weekSlices } from "@/app/components/WeekCarousel";

// Weather is a rolling 7 days for every account, including Power Users.
const WEATHER_DAYS = 7;

// Weather Outlook — how the selected day's weather may affect demand. The
// day selector and the day's weather come from the live week query; the
// demand effect per period comes from the cached weather outlook for the
// selected day.
export default function WeatherOutlookPage() {
  const { operator } = useMyOperator();
  const full = useWeek();
  const [picked, setPicked] = useState<string | null>(null);
  const [weekIndex, setWeekIndex] = useState(0);

  const slices = full ? weekSlices(full.days.slice(0, WEATHER_DAYS)) : [];
  const index = Math.min(weekIndex, Math.max(0, slices.length - 1));
  const days = slices[index] ?? [];
  const week = full && days.length > 0 ? { ...full, days, weekStart: days[0].date, weekEnd: days[days.length - 1].date } : undefined;
  const selected =
    picked && days.some((d) => d.date === picked) ? picked : days.find((d) => d.date === full?.today)?.date ?? days[0]?.date;

  const showWeek = (next: number) => {
    const slice = slices[next];
    setWeekIndex(next);
    if (slice && !slice.some((d) => d.date === picked)) {
      setPicked(slice.find((d) => d.date === full?.today)?.date ?? slice[0].date);
    }
  };
  const outlook = useOutlook<WeatherOutlookResult>("weather", selected);
  // The first load waits for everything; later day switches update in place.
  const firstLoadDone = useOnceReady(!!week && outlook.status === "ready");

  if (outlook.status === "error") return <LoadError message={outlook.message} onRetry={outlook.retry} />;
  if (!week || !selected || !firstLoadDone) return <PageLoading label="Gathering demand insight…" />;

  return (
    <WeatherView
      week={week}
      selected={selected}
      onSelect={setPicked}
      operator={operator}
      result={outlook.status === "ready" ? outlook.result : null}
      periodWeather={outlook.status === "ready" ? outlook.weather : null}
      weekCount={slices.length}
      weekIndex={index}
      onWeekIndex={showWeek}
    />
  );
}
