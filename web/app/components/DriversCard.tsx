import type { Driver } from "@/app/lib/drivers";
import { EventIcon } from "./EventIcon";
import { InfoTip } from "./InfoTip";
import { WeatherIcon } from "./WeatherIcon";
import styles from "./DriversCard.module.css";

// "Top Demand Drivers" — shared by the Daily and Weekly Outlook.
export function DriversCard({
  drivers,
  subtitle,
  empty = "No major drivers expected.",
}: {
  drivers: Driver[];
  subtitle: string;
  /** Shown when the list is empty. */
  empty?: string;
}) {
  return (
    <section className={styles.card}>
      <h2 className={styles.title}>
        Top Demand Drivers
        <InfoTip label="driver percentages" align="end">
          Estimated change in demand caused by each event or weather condition, compared with normal. Each
          event is counted in the period named under it (&ldquo;All day&rdquo; = no start time listed).
          &ldquo;No effect&rdquo; means no material change.
        </InfoTip>
      </h2>
      <p className={styles.sub}>{subtitle}</p>
      <div className={styles.list}>
        {drivers.length === 0 && <p className={styles.detail}>{empty}</p>}
        {drivers.map((d, i) => (
          <div key={i} className={styles.row}>
            <div className={styles.icon}>
              {d.kind === "event" ? (
                <EventIcon eventClass={d.eventClass ?? ""} size={24} />
              ) : (
                <span className={styles.weatherIcon} role="img" aria-label={d.condition}>
                  <WeatherIcon condition={d.condition ?? ""} />
                </span>
              )}
            </div>
            {d.liftUnknown ? (
              <span className={styles.pctNeutral} title="No baseline to compare with">
                &mdash;
              </span>
            ) : d.liftPct > 0 ? (
              <span className={styles.pct}>+{d.liftPct}%</span>
            ) : (
              <span className={styles.pctNeutral}>No effect</span>
            )}
            <div>
              <div className={styles.name}>{d.title}</div>
              {d.subtitle && <div className={styles.detail}>{d.subtitle}</div>}
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}
