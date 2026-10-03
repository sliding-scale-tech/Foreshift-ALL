"use client";

import { Suspense } from "react";
import { useSearchParams } from "next/navigation";
import { useMyOperator } from "@/app/hooks/useMyOperator";
import { hasRestaurant, pageSubtitle } from "@/app/lib/displayName";
import { PageLoading } from "@/app/components/PageLoading";
import { LoadError } from "@/app/components/LoadError";
import { useDailyOutlook } from "@/app/hooks/useDailyOutlook";
import shared from "../../shared.module.css";
import { OutlookBody } from "@/app/components/DailyOutlookBody";
import { LastUpdated } from "@/app/components/LastUpdated";
import { StaleNotice } from "@/app/components/StaleNotice";
import { RefreshButton } from "@/app/components/RefreshButton";

// Detroit is where every zone lives, so "today" is Detroit's date. `date`
// ("YYYY-MM-DD") is the day being viewed when it isn't today.
function formatDate(date?: string): string {
  return new Intl.DateTimeFormat("en-US", {
    weekday: "long",
    year: "numeric",
    month: "long",
    day: "numeric",
    timeZone: date ? "UTC" : "America/Detroit",
  }).format(date ? new Date(`${date}T12:00:00Z`) : new Date());
}

// Daily Outlook — the operator's forecast for one day (today unless
// `?date=YYYY-MM-DD` names another day this week). Header from the operator
// profile; everything else from the cached outlook in Convex.
export default function DailyOutlookPage() {
  return (
    <Suspense fallback={null}>
      <DailyOutlook />
    </Suspense>
  );
}

function DailyOutlook() {
  const { operator } = useMyOperator();
  const date = useSearchParams().get("date") ?? undefined;
  const outlook = useDailyOutlook(date);

  // Nothing renders until the whole outlook is ready — no placeholders.
  if (outlook.status === "loading") return <PageLoading label="Gathering demand insight…" />;
  if (outlook.status === "error") return <LoadError message={outlook.message} onRetry={outlook.retry} />;

  return (
    <>
      <div className={shared.headRow}>
        <div>
          <h1 className={shared.title}>Daily outlook</h1>
          <p className={shared.subtitle}>{pageSubtitle(operator, formatDate(outlook.date))}</p>
          <LastUpdated generatedAt={outlook.generatedAt} />
        </div>
        <RefreshButton onRefresh={outlook.refresh} refreshing={outlook.refreshing} error={outlook.refreshError} />
      </div>
      {outlook.stale && <StaleNotice onRetry={outlook.retry} />}
      <OutlookBody
        data={outlook.data}
        date={outlook.date}
        hours={hasRestaurant(operator) ? operator?.operatingHours : undefined}
      />
    </>
  );
}
