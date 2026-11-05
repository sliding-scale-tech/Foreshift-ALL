import { impactWord, type Driver } from "@/app/lib/drivers";
import { EventIcon } from "./EventIcon";
import { InfoTip } from "./InfoTip";
import { WeatherIcon } from "./WeatherIcon";
import styles from "./DriversCard.module.css";
import { SHOW_NUMBERS } from "@/app/lib/display";

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
        <InfoTip label="demand drivers" align="end">
          How much each event or weather condition may add to demand, compared with normal: high, moderate or
          low impact. Each event is counted in the period named under it (&ldquo;All day&rdquo; = no start time
          listed). &ldquo;No effect&rdquo; means no material change.
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
            {/* With numbers: "+46%" in its own column, as before. Without: a small tag under the name. */}
            {SHOW_NUMBERS &&
              (d.liftUnknown ? (
                <span className={styles.pctNeutral} title="No baseline to compare with">
                  &mdash;
                </span>
              ) : d.liftPct > 0 ? (
                <span className={styles.pct}>+{d.liftPct}%</span>
              ) : (
                <span className={styles.pctNeutral}>No effect</span>
              ))}
            <div className={styles.text}>
              <div className={styles.name}>{d.title}</div>
              {d.subtitle && <div className={styles.detail}>{d.subtitle}</div>}
              {!SHOW_NUMBERS && !d.liftUnknown && (
                <span className={`${styles.tag} ${d.liftPct > 0 ? styles.tagUp : ""}`}>{impactWord(d.liftPct)}</span>
              )}
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}
