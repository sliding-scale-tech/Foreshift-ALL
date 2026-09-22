import type { Driver } from "@/app/lib/drivers";
import { trimNumber } from "@/app/lib/week";
import { EventIcon } from "./EventIcon";
import styles from "./DriversCard.module.css";

// "Top Demand Drivers" — shared by the Daily and Weekly Outlook.
export function DriversCard({ drivers, subtitle }: { drivers: Driver[]; subtitle: string }) {
  return (
    <section className={styles.card}>
      <h2 className={styles.title}>Top Demand Drivers</h2>
      <p className={styles.sub}>{subtitle}</p>
      <div className={styles.list}>
        {drivers.map((d, i) => (
          <div key={i} className={styles.row}>
            <div className={styles.icon}>
              {d.kind === "event" ? (
                <EventIcon eventClass={d.eventClass ?? ""} size={24} />
              ) : (
                <span role="img" aria-label="Weather" style={{ fontSize: 24, lineHeight: 1 }}>
                  🌦️
                </span>
              )}
            </div>
            <span className={styles.pct}>+{trimNumber(d.liftPct, 1)}%</span>
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
