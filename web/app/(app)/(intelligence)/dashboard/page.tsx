"use client";

import { Suspense } from "react";
import { useSearchParams } from "next/navigation";
import { useMyOperator } from "@/app/hooks/useMyOperator";
import { IconSparkle, IconCalendarCheck } from "@/app/components/dashboard-icons";
import { BandPill } from "@/app/components/BandPill";
import { DaypartIcon } from "@/app/components/DaypartIcon";
import { DemandAreaChart } from "@/app/components/DemandAreaChart";
import { DriversCard } from "@/app/components/DriversCard";
import { PageLoading } from "@/app/components/PageLoading";
import { WeatherIcon } from "@/app/components/WeatherIcon";
import { useDailyOutlook } from "@/app/hooks/useDailyOutlook";
import shared from "../../shared.module.css";
import {
  MAX_SCORE,
  type DailyOutlook as DailyOutlookData,
  type DaypartOutlook,
} from "./outlook-data";
import styles from "./dashboard.module.css";

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

function formatPct(n: number): string {
  return `${n >= 0 ? "+" : ""}${n.toFixed(1)}%`;
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
  const name = operator?.restaurantName ?? "";

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
      <h1 className={shared.title}>Today’s Demand Forecast For {name}</h1>
      <p className={shared.subtitle}>
        {formatDate(outlook.date)} - {name} - {operator?.conceptType}
      </p>
      <OutlookBody data={outlook.data} />
    </>
  );
}

function OutlookBody({ data }: { data: DailyOutlookData }) {
  return (
    <>
      <section className={styles.brief}>
        <div>
          <div className={shared.bannerTitle}>
            <IconSparkle />
            Today&apos;s Operations Brief
          </div>
          <p className={shared.bannerText}>{data.brief}</p>
        </div>
        <div>
          <div className={styles.scoreHead}>
            <span>{data.band}</span>
            <span>{data.score.toFixed(1)}</span>
          </div>
          <div className={styles.scoreTrack}>
            <div
              className={styles.scoreFill}
              style={{ width: `${Math.min(100, (data.score / MAX_SCORE) * 100)}%` }}
            />
          </div>
          <div className={styles.scoreScale}>
            <span>0</span>
            <span>{MAX_SCORE}</span>
          </div>
        </div>
      </section>

      <h2 className={shared.sectionTitle}>Daypart</h2>
      <div className={styles.dayparts}>
        {data.dayparts.map((dp) => (
          <DaypartCard key={dp.key} dp={dp} />
        ))}
      </div>

      <div className={styles.lower}>
        <section className={`${shared.card} ${styles.chartCard}`}>
          <h2 className={`${shared.cardTitle} ${shared.chartTitle}`}>Daypart Demand Chart</h2>
          <DemandAreaChart categories={data.chart.categories} values={data.chart.values} />
        </section>

        <DriversCard
          drivers={data.drivers}
          subtitle="Factors influencing today's forecast."
        />
      </div>
    </>
  );
}

function DaypartCard({ dp }: { dp: DaypartOutlook }) {
  return (
    <div className={`${shared.card} ${styles.dpCard}`}>
      <div className={styles.dpHead}>
        <DaypartIcon daypart={dp.key} />
        <div>
          <div className={styles.dpTitle}>{dp.label}</div>
          <div className={styles.dpWindow}>{dp.window}</div>
        </div>
      </div>

      <div className={styles.dpMeta}>
        <BandPill band={dp.band} />
        <span className={styles.lift}>{formatPct(dp.liftPct)} vs. normal</span>
      </div>

      <div className={styles.weather}>
        <div className={styles.weatherIcon}>
          <WeatherIcon condition={dp.weather?.condition ?? ""} />
        </div>
        <div>
          <div className={styles.weatherName}>{dp.weather?.condition ?? "No forecast"}</div>
          {dp.weather && <div className={styles.weatherTemp}>{dp.weather.tempF}°F</div>}
        </div>
      </div>

      <div className={styles.eventHead}>
        <IconCalendarCheck />
        Event Lift
      </div>
      <p className={styles.eventNote}>{dp.eventNote}</p>
    </div>
  );
}
