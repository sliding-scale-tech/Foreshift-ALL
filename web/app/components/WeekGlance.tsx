import { InfoTip } from "@/app/components/InfoTip";
import { IconSparkle } from "@/app/components/dashboard-icons";
import { impactWord, type Driver } from "@/app/lib/drivers";
import { bandLabel } from "@/app/lib/bands";
import { FULL_DAY, trimNumber, type DayKey } from "@/app/lib/week";
import type { GlancePoint } from "@/app/lib/weekPlan";
import styles from "./WeekGlance.module.css";
import { SHOW_NUMBERS } from "@/app/lib/display";

// One glance tile: "Friday dinner" and, underneath, its level ("Very busy").
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
            {bandLabel(point.cell.band)}
            {SHOW_NUMBERS && ` · ${trimNumber(point.cell.score ?? 0, 1)}`}
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
  summary,
  summaryIsFactual = false,
  busiest,
  quietest,
  drivers,
}: {
  /** The AI's one- or two-line week summary (plain words, no numbers). */
  summary?: string;
  /** Gemini was unavailable, so the summary was written straight from the forecast. */
  summaryIsFactual?: boolean;
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
      {summary && <p className={styles.summary}>{summary}</p>}
      {summary && summaryIsFactual && (
        <p className={styles.factualNote}>
          The AI summary is unavailable right now, so this summary is written straight from the forecast.
        </p>
      )}
      <div className={styles.tiles}>
        <PointTile
          label="Busiest period"
          tip="The busiest open period from today to the end of the week."
          point={busiest}
        />
        <PointTile
          label="Quietest upcoming period"
          tip="The quietest open period from today to the end of the week."
          point={quietest}
        />
        <div className={styles.tile}>
          <div className={styles.tileLabel}>
            Main demand drivers
            <InfoTip label="main demand drivers" tone="dark" align="end">
              The events and weather expected to move demand the most this week, and how much they may add
              (high, moderate or low impact).
            </InfoTip>
          </div>
          {drivers.length > 0 ? (
            <ul className={styles.tileList}>
              {drivers.map((d, i) => (
                <li key={i}>
                  <span className={styles.tileItem}>{d.title}</span>
                  <span className={styles.tilePct}>{SHOW_NUMBERS ? `+${d.liftPct}%` : impactWord(d.liftPct)}</span>
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
