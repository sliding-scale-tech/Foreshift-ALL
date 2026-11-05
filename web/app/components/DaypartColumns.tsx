"use client";

import { WeatherIcon } from "@/app/components/WeatherIcon";
import { BANDS, MAX_SCORE, bandColor, bandLabel } from "@/app/lib/bands";
import type { DaypartOutlook } from "@/app/(app)/(intelligence)/dashboard/outlook-data";
import styles from "./DaypartColumns.module.css";

// "Demand throughout the day" on the Daily Outlook: one column per period with
// its level above the bar, and its name, hours and weather underneath. The
// busiest period is highlighted. No scores: bar heights use the fixed 0–150
// scale so days stay comparable, but only the level is written.
export function DaypartColumns({
  dayparts,
  closed,
  busiestKey,
  selected,
  onSelect,
}: {
  dayparts: DaypartOutlook[];
  /** Per daypart, true = outside the restaurant's hours. */
  closed: boolean[];
  busiestKey?: string;
  selected: string | null;
  onSelect: (key: string | null) => void;
}) {
  return (
    <section className={styles.card} aria-labelledby="day-columns-title">
      <div className={styles.head}>
        <div>
          <h2 id="day-columns-title" className={styles.title}>
            Demand throughout the day
          </h2>
          <p className={styles.sub}>Area outlook for restaurants like yours</p>
        </div>
        <ul className={styles.legend} aria-label="Demand levels">
          {BANDS.map((b) => (
            <li key={b.name}>
              <span className={styles.dot} style={{ background: b.color }} aria-hidden="true" />
              {b.label}
            </li>
          ))}
        </ul>
      </div>

      <div className={styles.columns}>
        {dayparts.map((dp, i) => {
          const busiest = dp.key === busiestKey;
          const isSelected = dp.key === selected;
          const height = dp.score === null ? 0 : Math.max(6, Math.min(1, dp.score / MAX_SCORE) * 100);
          return (
            <button
              key={dp.key}
              type="button"
              className={`${styles.col} ${busiest ? styles.busiest : ""} ${isSelected ? styles.selected : ""}`}
              aria-pressed={isSelected}
              aria-label={`${dp.label}, ${dp.window}: ${dp.band ? bandLabel(dp.band) : "no forecast"}${
                busiest ? ", busiest period" : ""
              }${closed[i] ? ", your restaurant is closed" : ""}`}
              onClick={() => onSelect(isSelected ? null : dp.key)}
            >
              <span className={styles.plot}>
                {busiest && <span className={styles.busiestTag}>Busiest period</span>}
                <span className={styles.level}>{dp.band ? bandLabel(dp.band) : "No forecast"}</span>
                <span
                  className={styles.bar}
                  style={{ height: `${height}%`, background: dp.band ? bandColor(dp.band) : "transparent" }}
                />
              </span>
              <span className={styles.name}>{dp.label}</span>
              <span className={styles.window}>{dp.window}</span>
              {closed[i] && <span className={styles.closed}>Closed</span>}
              {dp.weather && (
                <span className={styles.weather}>
                  <span className={styles.wxIcon}>
                    <WeatherIcon condition={dp.weather.condition} />
                  </span>
                  {Math.round(dp.weather.tempF)}°F
                </span>
              )}
            </button>
          );
        })}
      </div>
      <p className={styles.hint}>Select a period to explore its outlook</p>
    </section>
  );
}
