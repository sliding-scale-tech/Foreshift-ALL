"use client";

import { useId, useState } from "react";
import { TimeField } from "@/app/components/TimeField";
import { FULL_DAY_NAME, dayErrors, listDays, unsetDays, type Day, type DayHours } from "@/app/lib/hours";
import styles from "./HoursEditor.module.css";

const SHORTCUTS: { label: string; days: Day[] }[] = [
  { label: "Every day", days: ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"] },
  { label: "Mon–Fri", days: ["Mon", "Tue", "Wed", "Thu", "Fri"] },
  { label: "Sat–Sun", days: ["Sat", "Sun"] },
];

// Every screen in the app, and the forecast behind it, runs on Detroit time.
const TIME_ZONE = "America/Detroit";

// Operating hours editor (onboarding + Settings): pick days and apply one pair
// of times to them, then review the week one row per day and adjust any single
// day in place. A day is "Not set" until it gets times or is marked Closed —
// blank is never silently saved as closed.
export function HoursEditor({
  value,
  onChange,
  showMissing,
}: {
  value: DayHours[];
  onChange: (days: DayHours[]) => void;
  /** The user tried to continue — flag every day that still has no hours. */
  showMissing: boolean;
}) {
  const id = useId();
  const [selected, setSelected] = useState<Day[]>([]);
  const [sharedOpen, setSharedOpen] = useState("");
  const [sharedClose, setSharedClose] = useState("");
  const [notice, setNotice] = useState("");

  const errors = dayErrors(value);
  const unset = unsetDays(value);
  const sharedValid = Boolean(sharedOpen && sharedClose && sharedOpen !== sharedClose);
  // Keep Mon..Sun order whatever order the chips were clicked in.
  const selectedInOrder = value.map((d) => d.day).filter((d) => selected.includes(d));

  function patchDay(day: Day, patch: Partial<DayHours>) {
    onChange(value.map((d) => (d.day === day ? { ...d, ...patch } : d)));
  }

  function toggleDay(day: Day) {
    setNotice("");
    setSelected((s) => (s.includes(day) ? s.filter((d) => d !== day) : [...s, day]));
  }

  function applyShared() {
    onChange(value.map((d) => (selected.includes(d.day) ? { ...d, state: "open", open: sharedOpen, close: sharedClose } : d)));
    setNotice(`Set ${sharedOpen} – ${sharedClose} for ${listDays(selectedInOrder)}.`);
    setSelected([]);
  }

  return (
    <div className={styles.editor}>
      <section className={styles.shared} aria-labelledby={`${id}-shared`}>
        <h2 id={`${id}-shared`} className={styles.sharedTitle}>
          Apply shared hours
        </h2>

        <div className={styles.chipRow}>
          <div className={styles.chips} role="group" aria-label="Days to set">
            {value.map((d) => (
              <button
                key={d.day}
                type="button"
                data-chip
                className={`${styles.chip} ${selected.includes(d.day) ? styles.chipOn : ""}`}
                aria-pressed={selected.includes(d.day)}
                aria-label={FULL_DAY_NAME[d.day]}
                onClick={() => toggleDay(d.day)}
              >
                {d.day}
              </button>
            ))}
          </div>

          <div className={styles.shortcuts}>
            {SHORTCUTS.map((s) => (
              <button
                key={s.label}
                type="button"
                className={styles.shortcut}
                onClick={() => {
                  setNotice("");
                  setSelected(s.days);
                }}
              >
                {s.label}
              </button>
            ))}
          </div>
        </div>

        <div className={styles.sharedTimes}>
          <div className={styles.timeField}>
            <label className={styles.timeLabel} htmlFor={`${id}-opens`}>
              Opens at
            </label>
            <TimeField id={`${id}-opens`} className={styles.time} value={sharedOpen} onChange={setSharedOpen} />
          </div>
          <div className={styles.timeField}>
            <label className={styles.timeLabel} htmlFor={`${id}-closes`}>
              Closes at
            </label>
            <TimeField id={`${id}-closes`} className={styles.time} value={sharedClose} onChange={setSharedClose} />
          </div>
          <button type="button" className={styles.applyBtn} disabled={selected.length === 0 || !sharedValid} onClick={applyShared}>
            Apply to selected days
          </button>
        </div>
        {sharedOpen && sharedClose && sharedOpen === sharedClose && (
          <p className={styles.error}>Opening and closing times can&apos;t be the same.</p>
        )}
        <p className={styles.notice} role="status">
          {notice || (selected.length === 0 ? "Select one or more days above." : "")}
        </p>
      </section>

      <h2 className={styles.weekTitle}>Your weekly schedule</h2>
      <ul className={styles.week}>
        {value.map((d) => {
          const name = FULL_DAY_NAME[d.day];
          const error = errors[d.day];
          // A day just given one time isn't wrong yet — only flag the missing
          // one once something was typed or the user tried to continue.
          const shownError = error && (showMissing || d.open || d.close) ? error : null;
          const missing = d.state === "unset" && showMissing;
          const errorId = `${id}-${d.day}-error`;
          const closed = d.state === "closed";

          return (
            <li key={d.day} className={styles.row}>
              <span className={styles.dayName}>
                {name}
                {d.state === "unset" && <span className={missing ? styles.notSetMissing : styles.notSet}>Not set</span>}
              </span>

              {closed ? (
                <span className={styles.closedText}>Closed</span>
              ) : (
                <div className={styles.times}>
                  <TimeField
                    className={styles.rowInput}
                    wrapClassName={styles.rowTime}
                    chevron
                    value={d.open}
                    onChange={(v) => patchDay(d.day, { state: "open", open: v })}
                    label={`${name} opens at`}
                    invalid={shownError !== null}
                    describedBy={shownError ? errorId : undefined}
                  />
                  <span className={styles.to} aria-hidden="true">
                    to
                  </span>
                  <TimeField
                    className={styles.rowInput}
                    wrapClassName={styles.rowTime}
                    chevron
                    value={d.close}
                    onChange={(v) => patchDay(d.day, { state: "open", close: v })}
                    label={`${name} closes at`}
                    invalid={shownError !== null}
                    describedBy={shownError ? errorId : undefined}
                  />
                </div>
              )}

              <label className={styles.closedToggle}>
                <input
                  type="checkbox"
                  checked={closed}
                  onChange={(e) => {
                    if (e.target.checked) {
                      patchDay(d.day, { state: "closed" });
                    } else {
                      // Back to the times it had before it was closed, if any.
                      const hadTimes = Boolean(d.open || d.close);
                      patchDay(d.day, { state: hadTimes ? "open" : "unset" });
                    }
                  }}
                />
                Closed
              </label>

              {shownError && (
                <p id={errorId} className={styles.rowError}>
                  {shownError}
                </p>
              )}
              {missing && !shownError && <p className={styles.rowError}>Add hours or mark this day as closed.</p>}
            </li>
          );
        })}
      </ul>

      <p className={styles.zone}>Time zone: {TIME_ZONE}</p>

      {unset.length > 0 && showMissing && (
        <p className={styles.pendingMissing}>
          {unset.length === 1 ? "1 day still needs hours" : `${unset.length} days still need hours`}:{" "}
          {listDays(unset)}.
        </p>
      )}
    </div>
  );
}
