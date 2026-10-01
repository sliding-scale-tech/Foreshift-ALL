import { InfoTip } from "@/app/components/InfoTip";
import { IconSparkle } from "@/app/components/dashboard-icons";
import type { Driver } from "@/app/lib/drivers";
import { FULL_DAY, trimNumber, type DayKey } from "@/app/lib/week";
import type { GlancePoint } from "@/app/lib/weekPlan";
import styles from "./WeekGlance.module.css";

// One glance tile: "Friday dinner" and, underneath, "Peak · 138.6".
function PointTile({ label, tip, point }: { label: string; tip: string; point: GlancePoint | null }) {
  return (
    <div className={styles.tile}>
      <div className={styles.tileLabel}>
        {label}
        <InfoTip label={label.toLowerCase()} tone="dark" align="start">
          {tip}
        </InfoTip>
      </div>
      {point ? (
        <>
          <div className={styles.tileMain}>
            {point.isToday ? "Today" : FULL_DAY[point.day as DayKey]} {point.cell.label.toLowerCase()}
          </div>
          <div className={styles.tileSub}>
            {point.cell.band} · {trimNumber(point.cell.score ?? 0, 1)}
          </div>
        </>
      ) : (
        <div className={styles.tileSub}>No open periods with a forecast left this week.</div>
      )}
    </div>
  );
}


// Weekly Outlook banner: busiest period, quietest upcoming period, main drivers.
export function WeekGlance({
  busiest,
  quietest,
  drivers,
}: {
  busiest: GlancePoint | null;
  quietest: GlancePoint | null;
  drivers: Driver[];
}) {
  return (
    <section className={styles.glanceBanner}>
      <div className={styles.glanceTitle}>
        <IconSparkle />
        This week at a glance
      </div>
      <div className={styles.tiles}>
        <PointTile
          label="Busiest period"
          tip="The highest demand score among open periods, from today to the end of the week."
          point={busiest}
        />
        <PointTile
          label="Quietest upcoming period"
          tip="The lowest demand score among open periods, from today to the end of the week."
          point={quietest}
        />
        <div className={styles.tile}>
          <div className={styles.tileLabel}>
            Main demand drivers
            <InfoTip label="main demand drivers" tone="dark" align="end">
              The events and weather expected to move demand the most this week, with their estimated effect
              compared with normal.
            </InfoTip>
          </div>
          {drivers.length > 0 ? (
            <ul className={styles.tileList}>
              {drivers.map((d, i) => (
                <li key={i}>
                  <span className={styles.tileItem}>{d.title}</span>
                  <span className={styles.tilePct}>+{d.liftPct}%</span>
                </li>
              ))}
            </ul>
          ) : (
            <div className={styles.tileSub}>No major events or weather effects expected.</div>
          )}
        </div>
      </div>
    </section>
  );
}
