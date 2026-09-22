"use client";

import { useState } from "react";
import { DAYS } from "my-app/convex/lib/vocab";
import { IconClose } from "./icons";
import { TIME_SLOTS } from "@/app/lib/hours";
import styles from "./Modal.module.css";

// "Same timings?" — applies one open/close time to a chosen set of days.
export function SameTimingsModal({
  onClose,
  onApply,
}: {
  onClose: () => void;
  onApply: (from: string, to: string, days: string[]) => void;
}) {
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");
  const [days, setDays] = useState<string[]>([]);

  function toggleDay(day: string) {
    setDays((ds) => (ds.includes(day) ? ds.filter((d) => d !== day) : [...ds, day]));
  }

  const valid = from && to && days.length > 0;

  return (
    <div className={styles.modalBackdrop} onClick={onClose}>
      <div className={styles.modal} onClick={(e) => e.stopPropagation()}>
        <div className={styles.modalHead}>
          <div>
            <h3>Same working hours</h3>
            <p>Automatically assign same working hours to your days</p>
          </div>
          <button type="button" className={styles.modalCloseBtn} onClick={onClose} aria-label="Close">
            <IconClose />
          </button>
        </div>

        <span className={styles.label}>Timings</span>
        <div className={styles.timingsRow} style={{ marginTop: 8 }}>
          <select className={styles.select} value={from} onChange={(e) => setFrom(e.target.value)}>
            <option value="">Choose an option...</option>
            {TIME_SLOTS.map((t) => (
              <option key={t} value={t}>
                {t}
              </option>
            ))}
          </select>
          <span className={styles.toLabel}>to</span>
          <select className={styles.select} value={to} onChange={(e) => setTo(e.target.value)}>
            <option value="">Choose an option...</option>
            {TIME_SLOTS.map((t) => (
              <option key={t} value={t}>
                {t}
              </option>
            ))}
          </select>
        </div>

        <span className={styles.label}>Days</span>
        <div className={styles.dayChips} style={{ marginTop: 8 }}>
          {DAYS.map((d) => (
            <button
              type="button"
              key={d}
              className={`${styles.dayChip} ${days.includes(d) ? styles.selected : ""}`}
              onClick={() => toggleDay(d)}
            >
              {d}
            </button>
          ))}
        </div>

        <button
          type="button"
          className={styles.modalSubmitBtn}
          disabled={!valid}
          onClick={() => onApply(from, to, days)}
        >
          Submit
        </button>
      </div>
    </div>
  );
}
