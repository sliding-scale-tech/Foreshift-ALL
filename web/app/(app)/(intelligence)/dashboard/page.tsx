"use client";

import { Suspense } from "react";
import { useSearchParams } from "next/navigation";
import { useMyOperator } from "@/app/hooks/useMyOperator";
import { operatorLabel } from "@/app/lib/displayName";
import { PageLoading } from "@/app/components/PageLoading";
import { useDailyOutlook } from "@/app/hooks/useDailyOutlook";
import shared from "../../shared.module.css";
import { OutlookBody } from "@/app/components/DailyOutlookBody";

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
  const name = operatorLabel(operator);

  // Nothing renders until the whole outlook is ready — no placeholders.
  if (outlook.status === "loading") return <PageLoading label="Preparing today's forecast…" />;
  if (outlook.status === "error") {
    return (
      <p className={`${shared.status} ${shared.statusError}`} role="alert">
        {outlook.message}
      </p>
    );
  }

  return (
    <>
      <h1 className={shared.title}>Daily outlook</h1>
      <p className={shared.subtitle}>
        {name} · {operator?.conceptType} · {operator?.zone} · {formatDate(outlook.date)}
      </p>
      <OutlookBody data={outlook.data} />
    </>
  );
}
