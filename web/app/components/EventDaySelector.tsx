"use client";

import { FULL_DAY, monthDay, type DayKey } from "@/app/lib/week";
import styles from "./EventDaySelector.module.css";

export type SelectorDay = {
  date: string;
  day: string; // "Thu"
  count: number;
  isToday: boolean;
  isPast: boolean;
};

/** The value for "everything from today to the end of the week". */
export const REST_OF_WEEK = "rest";

const plural = (n: number) => (n === 1 ? "1 event" : `${n} events`);

// Compact date selector: seven same-size day buttons (weekday, date, event
// count) plus two shortcuts. Choosing a day or a shortcut updates the summary
// and the list together — the page holds the one selected value.
export function EventDaySelector({
  days,
  value,
  onChange,
}: {
  days: SelectorDay[];
  value: string;
  onChange: (value: string) => void;
}) {
  const today = days.find((d) => d.isToday);
  return (
    <div className={styles.wrap}>
      <div className={styles.quick} role="group" aria-label="Quick ranges">
        <button
          type="button"
          className={`${styles.chip} ${today && value === today.date ? styles.chipOn : ""}`}
          aria-pressed={Boolean(today && value === today.date)}
          disabled={!today}
          onClick={() => today && onChange(today.date)}
        >
          Today
        </button>
        <button
          type="button"
          className={`${styles.chip} ${value === REST_OF_WEEK ? styles.chipOn : ""}`}
          aria-pressed={value === REST_OF_WEEK}
          onClick={() => onChange(REST_OF_WEEK)}
        >
          Rest of this week
        </button>
      </div>

      <div className={styles.days} role="group" aria-label="Choose a day">
        {days.map((d) => (
          <button
            key={d.date}
            type="button"
            className={`${styles.day} ${d.date === value ? styles.dayOn : ""} ${d.isPast ? styles.past : ""}`}
            aria-pressed={d.date === value}
            aria-label={`${FULL_DAY[d.day as DayKey]}, ${monthDay(d.date)}${d.isToday ? ", today" : ""}. ${
              d.isPast ? "No event data for earlier days" : plural(d.count)
            }`}
            onClick={() => onChange(d.date)}
          >
            <span className={styles.dow}>{d.day}</span>
            <span className={styles.date}>{monthDay(d.date)}</span>
            <span className={styles.count}>{d.isPast ? "Earlier" : plural(d.count)}</span>
            {d.isToday && <span className={styles.today}>Today</span>}
          </button>
        ))}
      </div>
    </div>
  );
}
