import { IconSparkle, IconCalendarCheck } from "@/app/components/dashboard-icons";
import { BandPill } from "@/app/components/BandPill";
import { DaypartIcon } from "@/app/components/DaypartIcon";
import { DemandAreaChart } from "@/app/components/DemandAreaChart";
import { DriversCard } from "@/app/components/DriversCard";
import { WeatherIcon } from "@/app/components/WeatherIcon";
import shared from "@/app/(app)/shared.module.css";
import {
  MAX_SCORE,
  type DailyOutlook as DailyOutlookData,
  type DaypartOutlook,
} from "@/app/(app)/(intelligence)/dashboard/outlook-data";
import styles from "@/app/(app)/(intelligence)/dashboard/dashboard.module.css";

function formatPct(n: number): string {
  return `${n >= 0 ? "+" : ""}${Math.round(n)}%`;
}

// The Daily Outlook body (brief, daypart cards, chart, drivers) — shared by the
// signed-in Daily Outlook page and the public sample outlook.
export function OutlookBody({ data }: { data: DailyOutlookData }) {
  return (
    <>
      <section className={styles.brief}>
        <div>
          <div className={shared.bannerTitle}>
            <IconSparkle />
            Today&apos;s demand brief
          </div>
          <p className={shared.bannerText}>{data.brief}</p>
        </div>
        <div>
          <div className={styles.scoreLabel}>Demand score</div>
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

      <h2 className={shared.sectionTitle}>Demand throughout the day</h2>
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
        {dp.band ? <BandPill band={dp.band} /> : <span className={styles.unavailable}>No forecast</span>}
        {dp.liftPct === null ? (
          <span className={styles.unavailable}>Comparison not available</span>
        ) : (
          <span className={styles.lift}>{formatPct(dp.liftPct)} vs. normal</span>
        )}
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
        What&apos;s driving demand
      </div>
      <p className={styles.eventNote}>{dp.eventNote}</p>
    </div>
  );
}
