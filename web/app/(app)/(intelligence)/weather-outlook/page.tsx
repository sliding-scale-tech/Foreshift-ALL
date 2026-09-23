"use client";

import { useState } from "react";
import type { WeatherOutlookResult } from "my-app/convex/lib/outlook";
import { useMyOperator } from "@/app/hooks/useMyOperator";
import { operatorLabel } from "@/app/lib/displayName";
import { useOutlook } from "@/app/hooks/useOutlook";
import { useWeek } from "@/app/hooks/useWeek";
import { BandPill } from "@/app/components/BandPill";
import { DaypartIcon } from "@/app/components/DaypartIcon";
import { DAYPARTS } from "@/app/lib/dayparts";
import { IconSparkle } from "@/app/components/dashboard-icons";
import { PageLoading } from "@/app/components/PageLoading";
import { useOnceReady } from "@/app/hooks/useOnceReady";
import { WeatherIcon } from "@/app/components/WeatherIcon";
import { FULL_DAY, longDate, shortDate, trimNumber, weekLabel } from "@/app/lib/week";
import shared from "../../shared.module.css";
import styles from "./weather.module.css";

// Weather severity (0 normal, 0.25 rain, 0.5 storm/snow, negative = ideal day).
function severityLabel(severity: number): { text: string; className: string } {
  if (severity >= 0.5) return { text: "High severity", className: styles.sevHigh };
  if (severity >= 0.25) return { text: "Moderate severity", className: styles.sevModerate };
  return { text: "Low severity", className: styles.sevLow };
}

// "+3.5%" / "0%" / "-8.8%"
function signedPct(n: number, forcePlus = false): string {
  const t = trimNumber(n, 1);
  return `${n > 0 || (forcePlus && n === 0) ? "+" : ""}${t}%`;
}

// Weather Outlook — the week's weather as a calendar; picking a day shows its
// effect on demand, daypart by daypart. Calendar + banner snapshot come from
// the live week query; the brief and the per-daypart impact come from the
// cached weather outlook for the selected day.
export default function WeatherOutlookPage() {
  const { operator } = useMyOperator();
  const week = useWeek();
  const [picked, setPicked] = useState<string | null>(null);

  const selected = picked ?? week?.today;
  const day = week?.days.find((d) => d.date === selected);
  const outlook = useOutlook<WeatherOutlookResult>("weather", selected);
  // The first load waits for everything; later day switches update in place.
  const firstLoadDone = useOnceReady(!!week && outlook.status === "ready");

  if (outlook.status === "error") {
    return (
      <p className={`${shared.status} ${shared.statusError}`} role="alert">
        {outlook.message}
      </p>
    );
  }
  if (!week || !firstLoadDone) return <PageLoading label="Preparing the weather outlook…" />;

  return (
    <>
      <h1 className={shared.title}>Weather Outlook</h1>
      <p className={shared.subtitle}>
        {weekLabel(week.weekStart)} - {operatorLabel(operator)} - {operator?.conceptType}
      </p>

      <section className={`${shared.banner} ${styles.banner}`}>
        <div>
          <div className={shared.bannerTitle}>
            <IconSparkle />
            Weather Demand Impact
          </div>
          <p className={shared.bannerText}>
            {outlook.status === "ready" ? outlook.result.narration : "Updating for this day…"}
          </p>
        </div>
        {day?.weather && day.demand && (
          <div className={styles.snapshot}>
            <div className={styles.snapshotTop}>
              <span className={styles.snapshotTemp}>{day.weather.tempF}°F</span>
              <div className={styles.snapshotIcon}>
                <WeatherIcon condition={day.weather.condition} />
              </div>
            </div>
            <div className={styles.snapshotBottom}>
              <BandPill band={day.demand.peakBand} />
              <span>{trimNumber(day.demand.peakScore)}</span>
            </div>
          </div>
        )}
      </section>

      <h2 className={shared.sectionTitle}>Weather Calendar</h2>
      <div className={styles.calendar}>
        {week.days.map((d) => (
          <button
            key={d.date}
            type="button"
            className={`${shared.card} ${styles.dayCard} ${d.date === selected ? styles.selected : ""}`}
            onClick={() => setPicked(d.date)}
          >
            <div className={styles.dayName}>{FULL_DAY[d.day]}</div>
            <div className={styles.dayDate}>{shortDate(d.date)}</div>
            <div className={styles.dayIcon}>
              <WeatherIcon condition={d.weather?.condition ?? ""} />
            </div>
            <div className={styles.dayCond}>{d.weather?.condition ?? "No forecast"}</div>
          </button>
        ))}
      </div>

      {day && outlook.status !== "ready" && <PageLoading label="Updating for this day…" />}
      {day && outlook.status === "ready" && (
        <div className={styles.detail}>
          <section className={`${shared.card} ${styles.dayPanel}`}>
            <div className={styles.dayPanelDate}>{longDate(day.date)}</div>
            <div className={styles.dayPanelIcon}>
              <WeatherIcon condition={day.weather?.condition ?? ""} />
            </div>
            {day.weather ? (
              <>
                <div className={styles.dayPanelTemp}>{day.weather.tempF}°F</div>
                <div className={styles.dayPanelCond}>{day.weather.condition}</div>
              </>
            ) : (
              <div className={styles.dayPanelCond}>No forecast for this day</div>
            )}
            {outlook.status === "ready" && (
              <PctPill value={parseFloat(outlook.result.day_summary.weather_percent) || 0} />
            )}
          </section>

          <div>
            <h2 className={styles.impactTitle}>Impact by Daypart</h2>
            <div className={styles.impactGrid}>
              {DAYPARTS.map((dp) => {
                const w = outlook.status === "ready"
                  ? outlook.result.weather.find((x) => x.daypart === dp.key)
                  : undefined;
                const sev = severityLabel(w?.severity ?? 0);
                const pct = w?.weather_impact_percent ?? 0;
                return (
                  <div key={dp.key} className={`${shared.card} ${styles.dpCard}`}>
                    <div className={styles.dpHead}>
                      <DaypartIcon daypart={dp.key} />
                      <div className={styles.dpText}>
                        <div className={styles.dpTitle}>{dp.label}</div>
                        <div className={styles.dpWindow}>{dp.window}</div>
                      </div>
                      {w && <span className={`${styles.severity} ${sev.className}`}>{sev.text}</span>}
                    </div>
                    <div className={styles.dpBottom}>
                      <span className={`${styles.dpPct} ${pct < 0 ? styles.neg : styles.pos}`}>
                        {w ? signedPct(pct) : "—"}
                      </span>
                      {w && (
                        <div className={styles.dpWeather}>
                          <div className={styles.dpWeatherIcon}>
                            <WeatherIcon condition={w.condition} />
                          </div>
                          <div>
                            <div className={styles.dpCond}>{w.condition}</div>
                            <div className={styles.dpTemp}>{w.temp_f}°F</div>
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}
    </>
  );
}

function PctPill({ value }: { value: number }) {
  return (
    <span className={`${styles.dayPanelPct} ${value < 0 ? styles.panelNeg : styles.panelPos}`}>
      {signedPct(value, true)}
    </span>
  );
}
