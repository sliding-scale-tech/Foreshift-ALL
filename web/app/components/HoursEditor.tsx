"use client";

import { useId, useState } from "react";
import { TimeField } from "@/app/components/TimeField";
import {
  FULL_DAY_NAME,
  closesNextDay,
  dayErrors,
  listDays,
  unsetDays,
  type Day,
  type DayHours,
} from "@/app/lib/hours";
import styles from "./HoursEditor.module.css";

const SHORTCUTS: { label: string; days: Day[] }[] = [
  { label: "Every day", days: ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"] },
  { label: "Mon–Fri", days: ["Mon", "Tue", "Wed", "Thu", "Fri"] },
  { label: "Sat–Sun", days: ["Sat", "Sun"] },
];

// Operating hours editor (onboarding + Settings): set one pair of times for
// several days at once, then review and adjust single days in the weekly list
// below. A day is "Not set" until it gets times or is marked Closed — blank is
// never silently saved as closed.
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
  const [editing, setEditing] = useState<Day[]>([]);
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

  function applyToSelected(patch: Partial<DayHours>, message: string) {
    onChange(value.map((d) => (selected.includes(d.day) ? { ...d, ...patch } : d)));
    setEditing((e) => e.filter((d) => !selected.includes(d)));
    setNotice(message);
    setSelected([]);
  }

  return (
    <div className={styles.editor}>
      <section className={styles.shared} aria-labelledby={`${id}-shared`}>
        <h2 id={`${id}-shared`} className={styles.sharedTitle}>
          Set hours for several days
        </h2>

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

        <div className={styles.chips} role="group" aria-label="Days to set">
          {value.map((d) => (
            <button
              key={d.day}
              type="button"
              className={`${styles.chip} ${selected.includes(d.day) ? styles.chipOn : ""}`}
              aria-pressed={selected.includes(d.day)}
              aria-label={FULL_DAY_NAME[d.day]}
              onClick={() => toggleDay(d.day)}
            >
              {d.day}
            </button>
          ))}
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
        </div>
        {sharedOpen && sharedClose && sharedOpen === sharedClose && (
          <p className={styles.error}>Opening and closing times can&apos;t be the same.</p>
        )}

        <div className={styles.sharedActions}>
          <button
            type="button"
            className={styles.applyBtn}
            disabled={selected.length === 0 || !sharedValid}
            onClick={() =>
              applyToSelected(
                { state: "open", open: sharedOpen, close: sharedClose },
                `Set ${sharedOpen} – ${sharedClose} for ${listDays(selectedInOrder)}.`,
              )
            }
          >
            Apply to selected days
          </button>
          <button
            type="button"
            className={styles.secondaryBtn}
            disabled={selected.length === 0}
            onClick={() => applyToSelected({ state: "closed" }, `Marked ${listDays(selectedInOrder)} as closed.`)}
          >
            Mark selected as closed
          </button>
        </div>
        <p className={styles.notice} role="status">
          {notice || (selected.length === 0 ? "Select one or more days above." : "")}
        </p>
      </section>

      <h2 className={styles.weekTitle}>Your week</h2>
      <ul className={styles.week}>
        {value.map((d) => {
          const name = FULL_DAY_NAME[d.day];
          const error = errors[d.day];
          // A day just opened for editing isn't wrong yet — only flag missing
          // times once something was typed or the user tried to continue.
          const shownError = error && (showMissing || d.open || d.close) ? error : null;
          const missing = d.state === "unset" && showMissing;
          const errorId = `${id}-${d.day}-error`;
          const isEditing = d.state === "open" && (editing.includes(d.day) || error !== null);

          return (
            <li key={d.day} className={styles.row}>
              <span className={styles.dayName}>{name}</span>

              <div className={styles.rowMain}>
                {d.state === "closed" && <span className={styles.closedText}>Closed</span>}

                {d.state === "unset" && (
                  <>
                    <span className={missing ? styles.notSetMissing : styles.notSet}>Not set</span>
                    <button
                      type="button"
                      className={styles.linkBtn}
                      onClick={() => {
                        patchDay(d.day, { state: "open" });
                        setEditing((e) => [...e, d.day]);
                      }}
                    >
                      Add hours
                    </button>
                  </>
                )}

                {d.state === "open" && !isEditing && (
                  <>
                    <span className={styles.summary}>
                      {d.open} – {d.close}
                      {closesNextDay(d) && <span className={styles.nextDay}> (next day)</span>}
                    </span>
                    <button
                      type="button"
                      className={styles.linkBtn}
                      aria-label={`Edit ${name} hours`}
                      onClick={() => setEditing((e) => [...e, d.day])}
                    >
                      Edit
                    </button>
                  </>
                )}

                {isEditing && (
                  <div className={styles.editRow}>
                    <TimeField
                      className={styles.time}
                      wrapClassName={styles.rowTime}
                      value={d.open}
                      onChange={(v) => patchDay(d.day, { open: v })}
                      label={`${name} opens at`}
                      invalid={shownError !== null}
                      describedBy={shownError ? errorId : undefined}
                    />
                    <span className={styles.dash} aria-hidden="true">
                      –
                    </span>
                    <TimeField
                      className={styles.time}
                      wrapClassName={styles.rowTime}
                      value={d.close}
                      onChange={(v) => patchDay(d.day, { close: v })}
                      label={`${name} closes at`}
                      invalid={shownError !== null}
                      describedBy={shownError ? errorId : undefined}
                    />
                    {error === null && (
                      <button
                        type="button"
                        className={styles.linkBtn}
                        onClick={() => setEditing((e) => e.filter((x) => x !== d.day))}
                      >
                        Done
                      </button>
                    )}
                  </div>
                )}

                {shownError && (
                  <p id={errorId} className={styles.rowError}>
                    {shownError}
                  </p>
                )}
                {missing && <p className={styles.rowError}>Add hours or mark this day as closed.</p>}
              </div>

              <label className={styles.closedToggle}>
                <input
                  type="checkbox"
                  checked={d.state === "closed"}
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
            </li>
          );
        })}
      </ul>

      {unset.length > 0 && (
        <p className={showMissing ? styles.pendingMissing : styles.pending}>
          {unset.length === 1 ? "1 day still needs hours" : `${unset.length} days still need hours`}:{" "}
          {listDays(unset)}.
        </p>
      )}
    </div>
  );
}
