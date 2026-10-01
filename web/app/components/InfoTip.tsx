"use client";

import { useId, useState, type ReactNode } from "react";
import styles from "./InfoTip.module.css";

// Small "i" button with a short explanation. Opens on mouse hover, on keyboard
// focus and on tap (tap again, Escape, or moving focus away closes it).
// Keep the text short — longer explanations belong in "How this forecast works".
export function InfoTip({
  label,
  children,
  align = "center",
  tone = "light",
}: {
  /** What it explains — read out as "About {label}". */
  label: string;
  children: ReactNode;
  /** Which edge of the tip lines up with the icon (use start/end near screen edges). */
  align?: "center" | "start" | "end";
  /** "dark" when the icon sits on the navy banner. */
  tone?: "light" | "dark";
}) {
  const id = useId();
  const [open, setOpen] = useState(false);
  const [dismissed, setDismissed] = useState(false);

  return (
    <span
      className={`${styles.wrap} ${open ? styles.open : ""} ${dismissed ? styles.dismissed : ""}`}
      onMouseLeave={() => setDismissed(false)}
    >
      <button
        type="button"
        className={`${styles.btn} ${tone === "dark" ? styles.onDark : ""}`}
        aria-label={`About ${label}`}
        aria-describedby={id}
        aria-expanded={open}
        onClick={() => {
          setDismissed(false);
          setOpen((o) => !o);
        }}
        onBlur={() => setOpen(false)}
        onKeyDown={(e) => {
          if (e.key === "Escape") {
            setOpen(false);
            setDismissed(true);
          }
        }}
        onFocus={() => setDismissed(false)}
      >
        <svg viewBox="0 0 16 16" aria-hidden="true">
          <circle cx="8" cy="8" r="7" fill="none" stroke="currentColor" strokeWidth="1.4" />
          <circle cx="8" cy="4.9" r="0.95" fill="currentColor" />
          <path d="M8 7.2v4.6" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
        </svg>
      </button>
      <span role="tooltip" id={id} className={`${styles.tip} ${styles[align]}`}>
        {children}
      </span>
    </span>
  );
}
