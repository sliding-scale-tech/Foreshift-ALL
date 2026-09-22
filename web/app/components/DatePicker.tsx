"use client";

import { useEffect, useRef, useState } from "react";
import { shortDate } from "@/app/lib/week";
import styles from "./DatePicker.module.css";

const DOW = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];

// "YYYY-MM-DD" helpers, all at UTC noon so DST/timezones can't shift a day.
const iso = (d: Date) => d.toISOString().slice(0, 10);
const at = (s: string) => new Date(`${s}T12:00:00Z`);

// Calendar-popup date field, styled after the Bubble one: Monday-first month
// grid, today marked with a corner triangle, and Today / Clear / Close below.
// `value` is "" when nothing is picked; `today` also supplies the placeholder.
export function DatePicker({
  value,
  today: todayProp,
  onChange,
}: {
  value: string;
  today: string;
  onChange: (value: string) => void;
}) {
  // The page's `today` (Detroit) is empty until its data loads; fall back to
  // the browser's date meanwhile so the calendar never gets an invalid month.
  const today = todayProp || iso(new Date());
  const [open, setOpen] = useState(false);
  const [view, setView] = useState(() => (value || today).slice(0, 7)); // "YYYY-MM"
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const onDown = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && setOpen(false);
    document.addEventListener("mousedown", onDown);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onDown);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  const first = at(`${view}-01`);
  const monthName = new Intl.DateTimeFormat("en-US", { month: "long", timeZone: "UTC" }).format(first);
  // Monday-first: Sunday (0) becomes 6.
  const lead = (first.getUTCDay() + 6) % 7;
  const cells = Array.from({ length: 42 }, (_, i) => {
    const d = new Date(first);
    d.setUTCDate(1 - lead + i);
    return iso(d);
  });

  const shiftMonth = (n: number) => {
    const d = new Date(first);
    d.setUTCMonth(d.getUTCMonth() + n);
    setView(iso(d).slice(0, 7));
  };
  const pick = (d: string) => {
    onChange(d);
    setOpen(false);
  };

  return (
    <div className={styles.wrap} ref={ref}>
      <button
        type="button"
        className={`${styles.trigger} ${open ? styles.open : ""}`}
        aria-haspopup="dialog"
        aria-expanded={open}
        onClick={() => {
          if (!open) setView((value || today).slice(0, 7));
          setOpen(!open);
        }}
      >
        {value ? shortDate(value) : <span className={styles.placeholder}>{shortDate(today)}</span>}
      </button>

      {open && (
        <div className={styles.popover} role="dialog" aria-label="Choose a date">
          <div className={styles.head}>
            <button type="button" className={styles.nav} aria-label="Previous month" onClick={() => shiftMonth(-1)}>
              <svg viewBox="0 0 16 16" fill="currentColor"><path d="M12 2 4 8l8 6Z" /></svg>
            </button>
            <div>
              <span className={styles.month}>{monthName}</span>
              <span className={styles.year}>{first.getUTCFullYear()}</span>
            </div>
            <button type="button" className={styles.nav} aria-label="Next month" onClick={() => shiftMonth(1)}>
              <svg viewBox="0 0 16 16" fill="currentColor"><path d="m4 2 8 6-8 6Z" /></svg>
            </button>
          </div>

          <div className={styles.grid}>
            {DOW.map((d) => (
              <div key={d} className={styles.dow}>
                {d}
              </div>
            ))}
            {cells.map((d) => (
              <button
                key={d}
                type="button"
                className={[
                  styles.day,
                  d.slice(0, 7) !== view ? styles.outside : "",
                  d === value ? styles.selected : "",
                  d === today ? styles.today : "",
                ].join(" ")}
                onClick={() => pick(d)}
              >
                {Number(d.slice(8))}
              </button>
            ))}
          </div>

          <div className={styles.foot}>
            <button type="button" className={styles.action} onClick={() => pick(today)}>
              <span className={`${styles.mark} ${styles.markToday}`} />
              Today
            </button>
            <button type="button" className={styles.action} onClick={() => pick("")}>
              <span className={`${styles.mark} ${styles.markClear}`} />
              Clear
            </button>
            <button type="button" className={styles.action} onClick={() => setOpen(false)}>
              <span className={`${styles.mark} ${styles.markClose}`}>×</span>
              Close
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
