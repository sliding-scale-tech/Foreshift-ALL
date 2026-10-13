"use client";

import { useEffect, useRef, useState } from "react";
import { CONCEPTS, ZONES } from "my-app/convex/lib/vocab";
import { Select } from "@/app/components/Select";
import { shortDate } from "./ReplyCardView";
import styles from "./aiPass.module.css";

export type Scope = { zone: string; concept: string; date: string };

type WeekDay = { day: string; date: string };

// "Add context": pins which zone, restaurant type and day the next answers are
// about. Shown as chips above the input; the + button opens the pickers. For a
// new chat the choice is held locally until the first question creates the chat.
export function ScopeControls({
  scope,
  home,
  today,
  week,
  onChange,
  onReset,
  disabled,
}: {
  scope: Scope;
  /** The operator's own zone and restaurant type. */
  home: { zone: string; concept: string };
  today: string;
  week: WeekDay[];
  onChange: (patch: Partial<{ zone: string; concept: string; date: string | null }>) => void;
  onReset: () => void;
  disabled?: boolean;
}) {
  const [open, setOpen] = useState(false);
  const wrapRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const away = (e: MouseEvent) => {
      if (!wrapRef.current?.contains(e.target as Node)) setOpen(false);
    };
    const esc = (e: KeyboardEvent) => e.key === "Escape" && setOpen(false);
    document.addEventListener("mousedown", away);
    document.addEventListener("keydown", esc);
    return () => {
      document.removeEventListener("mousedown", away);
      document.removeEventListener("keydown", esc);
    };
  }, [open]);

  const dayOptions = week.map((d) => ({
    value: d.date,
    label: `${d.day}, ${shortDate(d.date).split(", ")[1]}${d.date === today ? " (today)" : ""}`,
  }));
  const atHome = scope.zone === home.zone && scope.concept === home.concept && scope.date === today;

  return (
    <div className={styles.scopeWrap} ref={wrapRef}>
      <button
        type="button"
        className={styles.addContext}
        aria-label="Add context: choose zone, restaurant type and day"
        aria-haspopup="dialog"
        aria-expanded={open}
        disabled={disabled}
        onClick={() => setOpen((o) => !o)}
      >
        <svg viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" aria-hidden="true">
          <path d="M10 4v12M4 10h12" />
        </svg>
      </button>

      {open && (
        <div className={styles.popover} role="dialog" aria-label="Add context">
          <div className={styles.popTitle}>Ask about</div>
          <label className={styles.popLabel}>
            Zone
            <Select
              variant="filled"
              ariaLabel="Zone"
              value={scope.zone}
              options={ZONES}
              onChange={(zone) => onChange({ zone })}
            />
          </label>
          <label className={styles.popLabel}>
            Restaurant type
            <Select
              variant="filled"
              ariaLabel="Restaurant type"
              value={scope.concept}
              options={CONCEPTS}
              onChange={(concept) => onChange({ concept })}
            />
          </label>
          <label className={styles.popLabel}>
            Day
            <Select
              variant="filled"
              ariaLabel="Day"
              value={scope.date}
              options={dayOptions}
              onChange={(date) => onChange({ date: date === today ? null : date })}
            />
          </label>
          <button type="button" className={styles.popReset} disabled={atHome} onClick={onReset}>
            Back to my zone and type
          </button>
        </div>
      )}
    </div>
  );
}

/** The current scope as small chips above the input. */
export function ScopeChips({ scope, today }: { scope: Scope; today: string }) {
  return (
    <div className={styles.chipsRow} aria-label="Answers are about">
      <span className={styles.scopeChip}>{scope.zone}</span>
      <span className={styles.scopeChip}>{scope.concept}</span>
      <span className={styles.scopeChip}>{scope.date === today ? "Today" : shortDate(scope.date)}</span>
    </div>
  );
}
