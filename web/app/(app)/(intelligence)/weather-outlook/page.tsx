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

// Weather Outlook — how the selected day's weather may affect demand. The
// day selector and the day's weather come from the live week query; the
// demand effect per period comes from the cached weather outlook for the
// selected day.
export default function WeatherOutlookPage() {
  const { operator } = useMyOperator();
  const week = useWeek();
  const [picked, setPicked] = useState<string | null>(null);

  const selected = picked ?? week?.today;
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
    />
  );
}
