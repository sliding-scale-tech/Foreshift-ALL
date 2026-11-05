import Link from "next/link";
import { BandPill } from "@/app/components/BandPill";
import { BandTip } from "@/app/components/BandTip";
import { DaypartIcon } from "@/app/components/DaypartIcon";
import { WeatherIcon } from "@/app/components/WeatherIcon";
import { IconCalendarCheck } from "@/app/components/dashboard-icons";
import { IconClose } from "@/app/components/icons";
import type { DaypartOutlook } from "@/app/(app)/(intelligence)/dashboard/outlook-data";
import styles from "./PeriodDetail.module.css";

// The selected period's details on the Daily Outlook, full width under
// "Demand throughout the day": its level, weather and what's driving demand.
export function PeriodDetail({
  dp,
  closed,
  busiest,
  canEditHours,
  onClose,
}: {
  dp: DaypartOutlook;
  closed: boolean;
  busiest: boolean;
  /** Signed-in only: the public sample has no hours to edit. */
  canEditHours: boolean;
  onClose: () => void;
}) {
  return (
    <section className={`${styles.panel} ${busiest ? styles.busiest : ""}`} aria-labelledby="period-detail-title">
      <header className={styles.head}>
        <DaypartIcon daypart={dp.key} />
        <div className={styles.headText}>
          <h2 id="period-detail-title" className={styles.title}>
            {dp.label}
            {busiest && <span className={styles.busiestTag}>Busiest period</span>}
            {closed && <span className={styles.closedTag}>Closed</span>}
          </h2>
          <p className={styles.window}>{dp.window}</p>
        </div>
        <button type="button" className={styles.close} onClick={onClose} aria-label={`Close ${dp.label} details`}>
          <IconClose />
        </button>
      </header>

      <div className={styles.cols}>
        <div className={styles.col}>
          <h3 className={styles.colTitle}>Demand level</h3>
          {dp.band ? (
            <span className={styles.level}>
              <BandPill band={dp.band} />
              <BandTip band={dp.band} align="start" />
            </span>
          ) : (
            <p className={styles.muted}>No forecast</p>
          )}
        </div>

        <div className={styles.col}>
          <h3 className={styles.colTitle}>Weather</h3>
          {dp.weather ? (
            <div className={styles.weather}>
              <span className={styles.wxIcon}>
                <WeatherIcon condition={dp.weather.condition} />
              </span>
              <span>
                <span className={styles.wxName}>{dp.weather.condition}</span>
                <span className={styles.wxTemp}>{Math.round(dp.weather.tempF)}°F</span>
              </span>
            </div>
          ) : (
            <p className={styles.muted}>No forecast</p>
          )}
        </div>

        <div className={`${styles.col} ${styles.colWide}`}>
          <h3 className={styles.colTitle}>
            <IconCalendarCheck />
            What&apos;s driving demand
          </h3>
          <p className={styles.note}>{dp.eventNote || "No major events or weather effects expected."}</p>
          {closed && (
            <p className={styles.closedNote}>
              Your restaurant is closed during this period.
              {canEditHours && (
                <>
                  {" "}
                  <Link href="/settings#operating-hours">Edit hours</Link>
                </>
              )}
            </p>
          )}
        </div>
      </div>
    </section>
  );
}
