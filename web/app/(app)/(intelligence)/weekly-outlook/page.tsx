"use client";

import type { WeeklyOutlookResult } from "my-app/convex/lib/outlook";
import { useMyOperator } from "@/app/hooks/useMyOperator";
import { operatorLabel } from "@/app/lib/displayName";
import { useOutlook } from "@/app/hooks/useOutlook";
import { useWeek, type WeekData, type WeekDay } from "@/app/hooks/useWeek";
import { BandPill } from "@/app/components/BandPill";
import { DemandAreaChart } from "@/app/components/DemandAreaChart";
import { DriversCard } from "@/app/components/DriversCard";
import { PageLoading } from "@/app/components/PageLoading";
import { IconCalendarCheck, IconSparkle } from "@/app/components/dashboard-icons";
import { WeatherIcon } from "@/app/components/WeatherIcon";
import { toDrivers } from "@/app/lib/drivers";
import { FULL_DAY, shortDate, trimNumber, weekLabel } from "@/app/lib/week";
import shared from "../../shared.module.css";
import styles from "./weekly.module.css";

// Weekly Outlook — the operator's Mon..Sun demand at a glance. The grid and
// curve come from the week's resolved demand + weather + events (live query);
// the brief and driver list come from the cached weekly outlook.
export default function WeeklyOutlookPage() {
  const { operator } = useMyOperator();
  const week = useWeek();
  const outlook = useOutlook<WeeklyOutlookResult>("weekly");

  // Nothing renders until the week AND the weekly outlook are both ready.
  if (outlook.status === "error") {
    return (
      <p className={`${shared.status} ${shared.statusError}`} role="alert">
        {outlook.message}
      </p>
    );
  }
  if (!week || outlook.status !== "ready") return <PageLoading label="Preparing this week’s forecast…" />;

  return (
    <>
      <h1 className={shared.title}>This week’s outlook</h1>
      <p className={shared.subtitle}>
        {weekLabel(week.weekStart)} - {operatorLabel(operator)} - {operator?.conceptType}
      </p>

      <section className={shared.banner}>
        <div className={shared.bannerTitle}>
          <IconSparkle />
          This Week&apos;s Operations Brief
        </div>
        <p className={shared.bannerText}>{outlook.result.narration}</p>
      </section>

      <h2 className={shared.sectionTitle}>7-day Demand Grid</h2>
      <DemandGrid week={week} />

      <div className={styles.lower}>
        <section className={`${shared.card} ${styles.chartCard}`}>
          <h2 className={`${shared.cardTitle} ${shared.chartTitle}`}>Weekly Demand Curve</h2>
          <DemandAreaChart
            categories={week.days.map((d) => FULL_DAY[d.day])}
            values={week.days.map((d) => d.demand?.peakScore ?? 0)}
            yMax={150}
            tickAmount={3}
            decimals={2}
            showLegend={false}
          />
        </section>

        <DriversCard
          drivers={toDrivers(outlook.result.drivers)}
          subtitle="Factors influencing today's forecast."
        />
      </div>
    </>
  );
}

function DemandGrid({ week }: { week: WeekData }) {
  return (
    <div className={styles.grid}>
      {week.days.map((day) => (
        <DayCard
          key={day.date}
          day={day}
          eventCount={week.events.filter((e) => e.date === day.date).length}
        />
      ))}
    </div>
  );
}

function DayCard({ day, eventCount }: { day: WeekDay; eventCount: number }) {
  return (
    <div className={`${shared.card} ${styles.day}`}>
      <div className={styles.dow}>{day.day}</div>
      <div className={styles.date}>{shortDate(day.date)}</div>

      <div className={styles.scoreRow}>
        {day.demand ? (
          <>
            <BandPill band={day.demand.peakBand} />
            <span>{trimNumber(day.demand.peakScore)}</span>
          </>
        ) : (
          <span className={styles.muted}>—</span>
        )}
      </div>

      <div className={styles.weatherRow}>
        <div className={styles.weatherIcon}>
          <WeatherIcon condition={day.weather?.condition ?? ""} />
        </div>
        <div>
          <div className={styles.strong}>{day.weather?.condition ?? "No forecast"}</div>
          {day.weather && <div className={styles.muted}>{day.weather.tempF}°F</div>}
        </div>
      </div>

      <div className={styles.eventsRow}>
        <div className={styles.eventsIcon}>
          <IconCalendarCheck />
        </div>
        <div>
          <div className={styles.strong}>Events</div>
          <div className={styles.muted}>
            {eventCount} {eventCount === 1 ? "event" : "events"}
          </div>
        </div>
      </div>
    </div>
  );
}
